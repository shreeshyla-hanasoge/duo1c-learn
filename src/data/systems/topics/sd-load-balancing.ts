import type { Topic } from "../../types.ts";

export const sdLoadBalancing: Topic = {
  id: "sd-load-balancing",
  title: "Load balancing",
  tier: 1,
  week: 1,
  depth: "deep",
  summary:
    "Layer 4 versus 7, round robin to power of two choices, health checks, sticky sessions, draining, and why the balancer must not be a single point of failure.",
  why: "A load balancer is the first part you add when one server is not enough, and the first part people blame when something breaks. To use it well you need to know what it can see, how it picks a server, how it decides a server is dead, and how to remove a server without dropping users. The same ideas appear inside service meshes, CDNs and database proxies. Traed has no balancer today, and you should be able to say why that is correct.",
  learn: {
    intuition:
      "Think of a railway station with eight ticket counters and one queue marshal at the door. A guest arrives and the marshal points to a counter. The simplest marshal goes round the counters in turn. A better one notices that counter three has a long line and sends the guest elsewhere. A careful one also looks every few minutes to see whether each clerk is still at the desk, and stops sending guests to an empty chair. When a clerk goes for a break, the marshal sends no new guests but lets the ones already there finish. Some guests, such as a family holding one booking, must go back to the same clerk who knows their case. That is convenient but it makes the lines uneven. And if the marshal himself falls ill, the whole station stops, so a good station has two marshals and a way for them to swap.",
    mechanics: [
      {
        heading: "Layer 4 versus layer 7",
        body: "A layer 4 balancer works on TCP or UDP connections. It sees addresses and ports, passes bytes along without reading them, and is fast and protocol-agnostic, so it suits databases, TLS passthrough and WebSockets. It decides once per connection. A layer 7 balancer reads the HTTP request itself: host, path, headers and cookies. It can send `/api` to one pool and `/static` to another, end TLS, retry a failed request on a second server and add headers, at a higher CPU cost per request. Example: 1,000 requests over one reused connection all reach one server through layer 4, while layer 7 can spread those 1,000 requests across servers. nginx and HAProxy do both; AWS names them NLB and ALB.",
      },
      {
        heading: "Choosing a server: the algorithms",
        body: "Round robin goes 1, 2, 3, 1, 2, 3. Weighted round robin gives a server of weight 3 three out of every five requests when the others total 2. Both assume requests cost about the same. When a report takes 2 seconds and a ping takes 2 ms, round robin can pile slow work on one server. Least connections sends each request to the server with the fewest open ones, so it adapts. Power of two choices picks two servers at random and sends the request to the less loaded of the two. It needs no shared state, and in the balls-into-bins analysis it shrinks the worst server's excess from roughly log n over log log n to roughly log log n.",
      },
      {
        heading: "Hashing and sticky sessions",
        body: "Sometimes one client should reach the same server: it holds a local cache, an in-memory session or a WebSocket. Sticky sessions use a cookie or a hash of the client address. A plain hash computes server = hash(key) mod n, and changing n from 4 to 5 moves about 80 percent of keys, because only a key whose value is the same modulo 4 and 5 stays, which is 1 in 5. Consistent hashing places servers and keys on a ring so that adding a server moves only about 1 in 5 keys. Stickiness has costs: uneven load, and lost sessions when a server dies. Prefer stateless servers and use hashing when locality pays, for example a cache.",
      },
      {
        heading: "Health checks, draining and the balancer itself",
        body: "An active check calls a path such as `/health` every 5 seconds, marks a server down after 3 failures and up after 2 successes; the gap stops flapping. Detection of a crash then takes 10 to 15 seconds. A passive check watches real errors. A shallow check only proves the process is up, and a deep check that touches the database can take every server out at once when the database is slow. Draining stops new connections to a server being removed and lets in-flight ones finish within a limit such as 30 seconds. The balancer is itself a single point of failure, so run two with a shared address, use a managed service, or use DNS or anycast across several.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no load balancer, and needs none. nginx on the one VM acts as a reverse proxy: it hands PHP to PHP-FPM and sends `engine.traed.in` to a single uvicorn process on the same machine. There is nothing to choose between, and the live engine is a stateful single loop that a balancer could not split anyway. The engine does expose `/health`, and deploys poll it. It also showed the shallow-check lesson: a stalled engine once answered `/health` while processing no ticks. A balancer would arrive with a second stateless Laravel web host.",
      },
    ],
    complexityDerivation:
      "A balancer works because requests are independent and servers are interchangeable: any request can go to any healthy server and get the same answer. That is the invariant. Given it, the question is only how to spread load. Random assignment looks fair but is not. With n servers and n requests, the busiest server gets about log n over log log n requests, well above the average of one. Choosing the better of two random servers cuts that to about log log n, an exponential improvement, using no shared state. That matters when many balancers act at once. A global least-connections rule uses counts that are slightly old, so every balancer sees the same server as emptiest and sends it a herd. Two random choices avoid the herd because each balancer picks different pairs. The argument stops holding when servers are not interchangeable: they hold sessions or caches, one is a single-writer engine, or request costs differ by orders of magnitude. It also fails when the health check lies in either direction, or when the balancer itself runs out of capacity or is the only copy.",
    variants: [
      {
        name: "Layer 4 connection balancer",
        when: "Traffic is long-lived or non-HTTP, such as WebSockets or database protocols, and the balancer need not read the payload.",
        delta:
          "Cheap per connection and handles very high connection rates. It cannot route by path or retry a single request, and one reused connection stays on one server.",
      },
      {
        name: "Layer 7 reverse proxy",
        when: "You route by host or path, end TLS in one place, or retry failed requests on another server.",
        delta:
          "Reads every HTTP request, so it can split by path, rewrite headers and retry safely for idempotent calls. It costs more CPU per request and is a richer thing to fail.",
      },
      {
        name: "Client-side balancing",
        when: "Many internal services call one another, and a central balancer would be an extra hop and a bottleneck.",
        delta:
          "Each caller holds the list of backends and picks one, often with power of two choices. There is no middle hop, but every client needs the list and the logic, and each sees only its own view of load.",
      },
    ],
    tradeoffs: [
      {
        vs: "Least connections versus power of two choices",
        pick: "Power of two choices when many balancers or clients choose independently",
        because:
          "Counts from one balancer are accurate, but many balancers acting on stale counts herd onto one server. Two random picks avoid that and cost almost nothing.",
      },
      {
        vs: "Sticky sessions versus a shared session store",
        pick: "A shared session store",
        because:
          "Stickiness gives uneven load and loses sessions when a server dies or is drained. A shared store makes servers interchangeable, at the price of one more dependency.",
      },
      {
        vs: "Shallow versus deep health checks",
        pick: "Shallow for the balancer, deeper checks for alerts",
        because:
          "A balancer that removes every server because a shared database is slow turns a degraded service into an outage. Report dependency trouble through alerts and let the app degrade.",
      },
    ],
  },
  algorithms: [
    {
      name: "Weighted round robin",
      role: "Cycles through servers in turn, giving bigger machines a larger share, as a simple default when requests cost about the same.",
    },
    {
      name: "Least connections",
      role: "Picks the backend with the fewest open connections, which is the minimum of a changing set and is often kept in a heap.",
      dsa: "heaps",
    },
    {
      name: "Power of two random choices",
      role: "Samples two backends and sends the request to the less loaded one, giving near-even load with no shared state.",
    },
    {
      name: "Consistent hashing",
      role: "Maps a client or cache key to a backend on a ring so that adding or removing a server moves only a small share of keys.",
      dsa: "hashing",
    },
  ],
  realWorld: [
    {
      system: "Google Maglev",
      kind: "industry",
      problem:
        "A very large service needs a network load balancer that runs on ordinary servers, scales by adding machines, and keeps connections steady when backends change.",
      applied:
        "Google's published paper describes Maglev as a software layer 4 balancer that spreads traffic across its own machines and picks a backend with a consistent-hashing variant, so a connection keeps reaching the same backend as the pool changes.",
      evidence: "Eisenbud et al., Maglev: A Fast and Reliable Software Network Load Balancer (NSDI 2016)",
      impact:
        "It replaced special hardware with a fleet of commodity servers, and the balancer tier scales like any other tier.",
    },
    {
      system: "GitHub Load Balancer",
      kind: "industry",
      problem:
        "A large site needs a balancer tier that survives a failed balancer machine without breaking existing connections.",
      applied:
        "GitHub engineers described a design with a director tier that picks a proxy for each connection by hashing and a proxy tier running HAProxy. Changes to the set of proxies disturb few connections.",
      evidence: "GitHub Engineering, Introducing the GitHub Load Balancer (2016) and the open-sourced GLB Director",
      impact:
        "Balancer nodes can be added, drained and replaced during normal work, so the balancer is not a fixed single point.",
    },
    {
      system: "Envoy least-request balancing",
      kind: "industry",
      problem:
        "In a mesh of many services, each caller needs a fair way to pick a backend without a central coordinator.",
      applied:
        "Envoy documents a least-request policy that, by default, samples two random healthy hosts and picks the one with fewer active requests, which is the power of two choices idea. It also supports active and passive health checking and outlier ejection.",
      evidence: "Envoy proxy documentation: load balancing, least request, and health checking",
      impact:
        "Clients avoid stampeding the one backend that looks emptiest, and failing hosts are ejected without a central controller.",
    },
    {
      system: "Traed nginx reverse proxy and engine health route",
      kind: "yours",
      problem:
        "One VM hosts the web app and the engine, and the public needs one HTTPS entry point to both, plus a way to confirm the engine is up after a deploy.",
      applied:
        "nginx serves Laravel through PHP-FPM and forwards the engine host name to one uvicorn process on the same machine, with a separate `/health` route. The deploy script polls that route. There is a single backend, so no balancing choice exists.",
      evidence: "deployment-scripts/deploy.sh (nginx configuration for the engine host); RUNBOOK.md section on deploy checks; ARCHITECTURE.md section 2.2",
      impact:
        "A reverse proxy gives TLS and routing today, and the same proxy could become a balancer when a second web host appears.",
    },
  ],
  insights: [
    {
      t: "Layer 4 moves bytes, layer 7 reads requests",
      d: "Use layer 4 for speed and non-HTTP traffic, layer 7 when you route by path, end TLS or retry.",
    },
    {
      t: "Use load, not turns, when work varies",
      d: "Round robin is fine for equal requests. With mixed costs choose least connections or power of two choices.",
    },
    {
      t: "Health checks decide who is alive",
      d: "Use several failures before marking down and several successes before marking up. Keep the check shallow, and drain before removing.",
    },
    {
      t: "The balancer needs a spare",
      d: "One balancer in front of many servers just moves the single point of failure. Pair it, or use a managed or anycast tier.",
    },
  ],
  pitfalls: [
    "Using a deep health check that calls the database. When the database slows, every server fails the check and the balancer removes them all.",
    "Relying on sticky sessions for correctness. The first deploy or crash drops the pinned users' sessions and leaves some servers busier than others.",
    "Forgetting that a layer 4 balancer decides per connection. A few long-lived connections can load one server heavily while others idle.",
  ],
  quiz: [
    {
      q: "Which of these can a layer 7 balancer do that a layer 4 balancer cannot?",
      options: [
        "Spread TCP connections across several servers",
        "Pass database protocol traffic through unchanged",
        "Send `/api` requests to one pool and `/static` to another",
        "Mark a server down after failed checks",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Routing by URL path needs the balancer to read the HTTP request, which only layer 7 does. Layer 4 sees addresses and ports only.",
      distractors: [
        "Layer 4 does this well. It is its main job.",
        "Layer 4 is protocol-agnostic and is often used for exactly this.",
        "",
        "Both layers can run health checks, so this does not separate them.",
      ],
    },
    {
      q: "What does the power of two choices algorithm do?",
      options: [
        "Sends each request to two servers and uses whichever replies first",
        "Hashes the client address to one of exactly two servers",
        "Keeps the two least loaded servers and alternates between them",
        "Picks two servers at random and sends the request to the less loaded one",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Sampling two at random and taking the lighter keeps load close to even without a global view of all servers.",
      distractors: [
        "That is request hedging, which doubles the work. It is a different technique.",
        "Hashing gives fixed assignment and does not look at load.",
        "Tracking the two lowest needs global state, which is what this method avoids.",
        "",
      ],
    },
    {
      q: "A cache tier uses server = hash(key) mod n with 4 servers. A fifth is added. About what share of keys now map to a different server?",
      options: [
        "About 80 percent, since few keys agree modulo 4 and 5",
        "About 20 percent, because one new server takes one fifth",
        "None at all, because the hash value is unchanged",
        "About 50 percent, because half the servers are affected",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A key stays only if hash mod 4 equals hash mod 5, which holds for 4 of every 20 values, so 20 percent stay and about 80 percent move. Consistent hashing would move about 20 percent.",
      distractors: [
        "",
        "20 percent is what consistent hashing moves. Plain modulo moves most keys.",
        "The hash is unchanged but the modulus is not, so most keys map elsewhere.",
        "Half is not what the arithmetic gives, since the modulus changes for every key.",
      ],
    },
    {
      q: "Reports take 2 s and pings take 2 ms. With round robin, one server keeps falling behind. What is the better choice?",
      options: [
        "Weighted round robin with equal weights",
        "Least connections or power of two choices",
        "Sticky sessions so each user stays on one server",
        "A faster hash function on the client address",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Round robin ignores cost, so slow requests pile up by chance. Policies that look at in-flight work send new requests to servers that are less busy.",
      distractors: [
        "Equal weights are just round robin again.",
        "",
        "Stickiness fixes where a user goes, not the uneven cost, and it can make load worse.",
        "A faster hash does not change which server gets heavy requests.",
      ],
    },
    {
      q: "Checks run every 5 seconds, a server is marked down after 3 consecutive failures. About how long can a crashed server keep receiving traffic?",
      options: [
        "Not at all, since the balancer sees the crash at once",
        "About 5 seconds",
        "About 10 to 15 seconds",
        "About 30 seconds or more",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Three failed checks 5 seconds apart need 10 seconds if the crash is just before a check and about 15 if just after one. Passive error detection can shorten this.",
      distractors: [
        "An active checker only learns by probing, so there is always a delay.",
        "One failed check is not enough because the rule needs three in a row.",
        "",
        "30 seconds would need six checks. The rule here stops at three.",
      ],
    },
    {
      q: "A broker's quote gateway holds 5,000 WebSocket connections per server. You must deploy to one server. What is the best way to take it out of service?",
      options: [
        "Stop the process now and let clients reconnect on their own",
        "Restart all gateway servers at the same moment to save time",
        "Remove it from the pool and kill all its connections at once",
        "Stop sending it new connections, let clients leave or reconnect gradually, then stop it",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Draining avoids a reconnect storm. Existing connections finish or move over a window while the rest of the pool absorbs them evenly.",
      distractors: [
        "5,000 clients reconnecting together can overload the other servers and the login path.",
        "Restarting everything together removes all capacity at once.",
        "Removing the server while killing connections gives the same spike as stopping it.",
        "",
      ],
    },
    {
      q: "A health endpoint queries the database. The database slows, all six web servers fail the check, and the balancer removes them all. What is the best judgement?",
      options: [
        "Keep the check shallow and alert on database trouble separately",
        "Make the check query three tables so failures are caught earlier",
        "Add a seventh web server to share the check load",
        "Remove health checks and send traffic to every server regardless",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The deep check turned a slow dependency into a total outage. The balancer only needs to know the process can serve, while dependency health is an alerting concern.",
      distractors: [
        "",
        "A deeper check makes the same mistake easier to trigger.",
        "The servers are not overloaded by the check. They fail it because of the database.",
        "Without checks a truly dead server would receive traffic, so users would see errors.",
      ],
    },
    {
      q: "A team puts one nginx balancer in front of five app servers for high availability. What is the sound judgement?",
      options: [
        "It is now highly available, since five servers sit behind it",
        "It moved the single point of failure: add a second balancer",
        "It is fine, because nginx almost never fails in practice",
        "Replace it with DNS round robin, which has no health checks",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If the one balancer fails, all five servers become unreachable. Redundancy has to include the balancer, through a pair with a floating address, a managed service, or several balancers.",
      distractors: [
        "Capacity behind the balancer does not protect against the balancer failing.",
        "",
        "Any process or machine can fail. Assuming otherwise is the error.",
        "DNS round robin keeps sending clients to dead addresses until resolvers refresh, which is worse.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-load-balancing-second-web-host",
      scenario:
        "A two-person team runs a Laravel app on one VM at about 300 requests a minute. They want a second web server so they can deploy without downtime. Sessions already sit in Redis and uploads are in object storage. Budget is small and nobody is on call at night. How should they send traffic to the two servers?",
      options: [
        {
          label: "A hardware balancer appliance",
          appeal: "Proven, very fast, and a single box to manage.",
        },
        {
          label: "A managed or nginx layer 7 balancer with two backends, a shallow health check and draining during deploys",
          appeal: "Cheap, simple and removes a server safely for each release.",
        },
        {
          label: "DNS round robin across both server addresses",
          appeal: "No extra component to run, and it spreads traffic roughly evenly.",
        },
        {
          label: "Ask the browser code to pick a server at random",
          appeal: "No infrastructure needed and each client chooses for itself.",
        },
      ],
      best: 1,
      verdict:
        "At this size the need is zero-downtime deploys, not raw throughput. A small layer 7 balancer with a health check and draining does that for little cost. DNS round robin cannot remove a dead server, and resolvers cache answers, so deploys would still drop users. Appliances are far above the need, and client-side choice leaks internal addresses.",
      claims: [
        {
          text: "You accept one more component to run, and it becomes a single point of failure unless it is managed or paired.",
          axis: "trade",
          correct: true,
          note: "True. The balancer solves the deploy problem and creates a new part that can fail.",
        },
        {
          text: "You gain the ability to remove one server for a release while the other serves users, provided sessions are not held in server memory.",
          axis: "trade",
          correct: true,
          note: "True. Shared sessions in Redis are what make the servers interchangeable.",
        },
        {
          text: "DNS round robin would stop sending users to a server the moment it is taken down.",
          axis: "failure",
          correct: false,
          note: "False. Resolvers cache the answer for the record's lifetime, and DNS itself has no view of server health.",
        },
        {
          text: "A deep health check on the database would risk removing both servers at once if the database is slow.",
          axis: "failure",
          correct: true,
          note: "True. A shallow check avoids turning a database slowdown into a total outage.",
        },
        {
          text: "Count requests per backend, 5xx responses per backend, and the time to drain a server during a deploy.",
          axis: "measure",
          correct: true,
          note: "True. These show whether balancing is even, whether a backend is failing, and whether deploys are clean.",
        },
        {
          text: "Total traffic served per day shows whether the balancing is working.",
          axis: "measure",
          correct: false,
          note: "False. The total says nothing about how it is split or whether one server is failing.",
        },
      ],
    },
    {
      id: "sd-load-balancing-market-open-websockets",
      scenario:
        "A stock broker's app streams live quotes over WebSocket to about 2 million clients at 09:15. Each connection stays open for hours. There are 300 gateway servers that need no routing by URL, and new connections arrive at tens of thousands per second at the open, with a spike of reconnects after any network blip. Which balancing design fits?",
      options: [
        {
          label: "A single layer 7 HTTP proxy that terminates and re-reads every connection",
          appeal: "Full visibility of requests and simple routing rules.",
        },
        {
          label: "DNS round robin across the 300 gateways",
          appeal: "Spreads clients without any balancer in the path.",
        },
        {
          label: "A scaled-out layer 4 balancer tier using least connections, with draining and a cap on new connections per second per gateway",
          appeal: "Cheap per connection, balances long-lived load and softens reconnect spikes.",
        },
        {
          label: "Sticky cookie routing at layer 7 to keep each user on one gateway",
          appeal: "Keeps a user's state on one machine.",
        },
      ],
      best: 2,
      verdict:
        "Connections are long-lived, so counting open connections spreads load far better than turns, and the payload needs no inspection, so layer 4 gives the lowest cost per connection. A cap on the new-connection rate per gateway and draining protect against the reconnect spike. A single proxy would be the bottleneck and a single point of failure, DNS cannot react to load or failure quickly, and stickiness adds nothing here.",
      claims: [
        {
          text: "You give up routing by URL or header, which the gateways do not need, in return for much lower cost per connection.",
          axis: "trade",
          correct: true,
          note: "True. That is the fair price of layer 4 here.",
        },
        {
          text: "You accept that the balancer tier itself needs several nodes and a way to spread connections across them.",
          axis: "trade",
          correct: true,
          note: "True. At this scale the balancer is a scaled tier, not one box.",
        },
        {
          text: "Plain round robin would spread the load evenly, because every connection costs the same.",
          axis: "trade",
          correct: false,
          note: "False. Connections last for very different times, so turns drift out of balance.",
        },
        {
          text: "If a gateway dies, its clients reconnect together, so a per-gateway cap on new connections is needed to avoid overloading the others.",
          axis: "failure",
          correct: true,
          note: "True. A reconnect storm is the main failure to plan for with long-lived connections.",
        },
        {
          text: "DNS round robin would remove a failed gateway within a second.",
          axis: "failure",
          correct: false,
          note: "False. DNS answers are cached and carry no health check, so removal takes much longer.",
        },
        {
          text: "Watch open connections per gateway, new connections per second at 09:15, and the time clients take to reconnect after a drain.",
          axis: "measure",
          correct: true,
          note: "True. These show balance, the surge and the recovery path.",
        },
        {
          text: "Average CPU per gateway over the whole day is the best sign the design works.",
          axis: "measure",
          correct: false,
          note: "False. The problem lasts minutes at the open and a daily average hides it.",
        },
      ],
    },
    {
      id: "sd-load-balancing-internal-pricing",
      scenario:
        "Twenty instances of an order service call a pricing service with twelve instances. Request time varies from 5 ms to 800 ms. Each caller currently asks a shared balancer that applies least connections using counts refreshed once a second, and the pricing instance that looks emptiest repeatedly becomes overloaded just after each refresh. Which change fits?",
      options: [
        {
          label: "Each caller picks two random pricing instances and sends to the one with fewer of its own in-flight requests",
          appeal: "No shared state, no stale view, and it spreads load nearly evenly.",
        },
        {
          label: "Refresh the shared counts ten times a second",
          appeal: "Fresher data should fix stale choices.",
        },
        {
          label: "Switch the balancer to plain round robin",
          appeal: "Simple, with no counts to go stale.",
        },
        {
          label: "Hash each order id to a fixed pricing instance",
          appeal: "Predictable placement, and any cache is reused.",
        },
      ],
      best: 0,
      verdict:
        "The herd forms because every caller sees the same stale count and chooses the same server. Two random picks make callers choose different pairs, so no single instance attracts them all, and no shared state is needed. Faster refresh still lets bursts herd, round robin ignores the 160-fold spread in request cost, and hashing makes load as uneven as the keys.",
      claims: [
        {
          text: "You accept that each caller sees only its own in-flight counts, in return for removing the shared stale view.",
          axis: "trade",
          correct: true,
          note: "True. Local information is slightly less complete but avoids synchronised mistakes.",
        },
        {
          text: "You get the perfectly even spread that global least connections would give in theory.",
          axis: "trade",
          correct: false,
          note: "False. It is close to even, not perfect, and it is better in practice because it avoids herding.",
        },
        {
          text: "If one pricing instance hangs, callers still send it a share of requests until a health check or timeout removes it, so timeouts and ejection are still needed.",
          axis: "failure",
          correct: true,
          note: "True. The algorithm balances load, it does not detect a broken instance.",
        },
        {
          text: "Round robin would also avoid the problem, since it uses no counts.",
          axis: "failure",
          correct: false,
          note: "False. It avoids stale counts but gives slow requests no way to be steered away from a busy instance.",
        },
        {
          text: "Compare the busiest instance's in-flight requests with the average, and the 99th percentile pricing latency.",
          axis: "measure",
          correct: true,
          note: "True. The gap between the maximum and the average shows how well load is spread.",
        },
        {
          text: "The average latency across all pricing instances shows whether one is overloaded.",
          axis: "measure",
          correct: false,
          note: "False. One overloaded instance among twelve barely moves an average.",
        },
      ],
    },
  ],
};

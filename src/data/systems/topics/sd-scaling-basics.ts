import type { Topic } from "../../types.ts";

export const sdScalingBasics: Topic = {
  id: "sd-scaling-basics",
  title: "Scaling: from one server to many",
  tier: 1,
  week: 1,
  depth: "deep",
  summary:
    "Scaling up versus out, stateless servers, the usual path from one box to shards, and how to find the real bottleneck before you spend money.",
  why: "Every system that succeeds meets the same question: what do we do when one machine is not enough? Engineers who lack the vocabulary either scale too early, paying for complexity they never use, or too late, in the middle of an outage. This lesson gives you the usual journey, the idea of a stateless service, and a way to find the true bottleneck first. Traed runs on one server today, and knowing why that is acceptable, and what would end it, is part of explaining it honestly.",
  learn: {
    intuition:
      "Picture a small restaurant with one cook. When more guests arrive you have two choices. You can get a faster cook, a bigger stove and a larger kitchen. That is scaling up. Or you can open a second kitchen with a second cook and send half the orders to each. That is scaling out. The bigger kitchen is easy, because the waiters change nothing, but there is a biggest kitchen you can buy, and each step costs more than the last. The second kitchen has no such ceiling, but now orders must be shared fairly, and it only works if the recipes and the stock room are not locked inside one cook's head. So you write recipes on cards and keep stock in a shared store room, and then any cook can take any order. Last, before building anything, find out what is actually slow. If every dish waits for the same single oven, a second kitchen with its own oven helps, but a second cook sharing that one oven does not.",
    mechanics: [
      {
        heading: "Vertical versus horizontal",
        body: "Vertical scaling gives one machine more CPU, memory or disk. Horizontal scaling adds machines and shares the work. Vertical is the cheapest first move: no code change, no network between the parts, and a single modern server can offer dozens of cores and hundreds of gigabytes of memory. Its limits are a ceiling, a price that climbs faster than capacity near the top, and one machine as a single point of failure. Horizontal removes the ceiling and lets one machine die without stopping service, but you pay in coordination. Amdahl's law gives the cap: if 10 percent of a job is serial, even unlimited machines give at most a 10 times speed-up, and 8 machines give only about 4.7 times.",
      },
      {
        heading: "Stateless services: where state goes",
        body: "A stateless server keeps nothing between requests that another server could not rebuild. Whatever must last goes to a shared place: login sessions in Redis or a signed cookie, records in the database, uploaded files in object storage such as S3. Then any server can answer any request, so adding capacity means starting another copy, and a crashed copy loses nothing. State does not disappear, it moves into a few stores that are harder to scale, which is why the database is nearly always the real limit. Example: if login sessions sit in one server's memory, a second server logs users out at random, and every deploy that restarts a server logs out everyone on it.",
      },
      {
        heading: "The usual journey",
        body: "The common order of steps is: one box running app and database; then the database on its own machine, so each is sized separately; then read replicas, which help when most traffic is reads; then a cache for hot reads; then a load balancer with several stateless app servers; then a queue for slow or bursty work such as reports and emails; and last, sharding the database when writes outgrow one machine. The order rises in cost and in difficulty to undo. Each step answers one bottleneck and adds a failure mode or a consistency question. Arithmetic: one million requests a day is about 12 a second on average, perhaps 60 at peak, which one ordinary server handles.",
      },
      {
        heading: "Finding the bottleneck",
        body: "Measure before you buy. For each resource (CPU, memory, disk, network, connection pools, locks) ask three things, called the USE method: how busy is it, how much work waits for it, and how many errors does it show. The saturated resource is the bottleneck, and improving anything else changes nothing. Little's law sizes queues: requests in flight equal arrival rate times time per request. At 200 requests a second and 50 ms each, 10 are in flight; if the database pool holds 10 connections it is full, and at 100 ms per request you would need 20. Watch the 99th percentile as well as the average, and load-test with production-sized data, because many bottlenecks only appear at size.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed runs on one Oracle Cloud ARM virtual machine that hosts nginx, PHP-FPM, the Python engine, Horizon, MySQL and Redis. With one daily user that is the right size, and a load balancer would add a part that can fail and nothing to balance. The ladder is still visible: live tick fan-out already sits off the box, in serverless API Gateway and Lambda. The known bottleneck is not traffic but contention. A heavy options backtest in the same engine process once starved the live tick loop, so backtests now run in a separate worker process. The fix was isolation, not more web servers. Many users would push the database and engine first.",
      },
    ],
    complexityDerivation:
      "The journey is ordered by one argument: add capacity where utilisation is highest, using the step that adds the least coordination. A stateless tier scales almost linearly, because requests share nothing. If one server handles R requests a second, n servers handle about n times R, until a shared resource saturates. That shared part, a database, a lock or a single queue, is the serial fraction in Amdahl's law, and it caps total speed-up at one divided by that fraction. The invariant to protect is that any one server can be added or lost without changing any answer. It breaks when state hides in server memory, when work must be serial, such as orders for one instrument that must be processed in sequence, and when the database becomes the shared bottleneck. Replicas then help only reads, and sharding buys write capacity at the price of cross-shard joins and transactions. It also breaks economically. Below the capacity of one good machine, a distributed system costs more in engineering time, failure modes and money than it saves. Scale for the load you can measure plus a margin, not the load you hope for.",
    variants: [
      {
        name: "Scale up (vertical)",
        when: "The system is young, the team is small, and one bigger machine would fix the measured limit.",
        delta:
          "Same code, bigger machine. Fastest to do and easiest to reason about, but it has a ceiling and leaves a single point of failure.",
      },
      {
        name: "Scale out the stateless tier",
        when: "The app servers are the saturated resource and sessions and files already live outside them.",
        delta:
          "Run several identical copies behind a load balancer. Near-linear gain and redundancy, but the shared database now takes the combined load.",
      },
      {
        name: "Scale the data tier (replicas, then shards)",
        when: "The database is the saturated resource: reads first, then writes.",
        delta:
          "Replicas copy data for reads and add lag. Shards split data by key for write capacity and add routing, rebalancing and cross-shard queries. Use shards last.",
      },
    ],
    tradeoffs: [
      {
        vs: "Vertical versus horizontal first",
        pick: "Vertical first, until a measured limit says otherwise",
        because:
          "A bigger machine needs no new failure modes. Horizontal scaling becomes the right move when you need redundancy, or when the largest sensible machine is already the bottleneck.",
      },
      {
        vs: "Do slow work in the request versus queue it",
        pick: "Queue slow or bursty work and return quickly",
        because:
          "A 4-second report inside a web request holds a worker for 4 seconds. A queue lets a small pool of workers drain a burst at its own pace, at the price of a job state to track.",
      },
      {
        vs: "Build for scale now versus later",
        pick: "Later, with measurements and a written trigger",
        because:
          "Sharding and many services cost a lot to run and are hard to undo. Build the next step when a measured limit approaches, and keep the design stateless so that step stays cheap.",
      },
    ],
  },
  algorithms: [
    {
      name: "Amdahl's law",
      role: "Caps the speed-up from adding machines by the share of work that cannot be split, so it tells you when more servers stop helping.",
    },
    {
      name: "Little's law",
      role: "Relates requests in flight to arrival rate and time per request, so you can size connection pools and worker counts from two measurements.",
    },
    {
      name: "Hash-based shard routing",
      role: "Maps a key such as a user id to one of several database shards so the same key always lands on the same shard.",
      dsa: "hashing",
    },
  ],
  realWorld: [
    {
      system: "Stack Overflow",
      kind: "industry",
      problem:
        "A very busy Q&A site must serve a large audience without paying for a large fleet.",
      applied:
        "Its engineers have written publicly that the site ran as one main web application on a small number of well-sized servers, with caching and a few SQL Server machines, and scaled up before it scaled out.",
      evidence: "Stack Overflow engineering blog posts on the architecture of the Stack Exchange network",
      impact:
        "It shows that a monolith on strong machines can carry very large traffic, so scaling out is a decision to justify, not a default.",
    },
    {
      system: "Instagram's early growth",
      kind: "industry",
      problem:
        "A photo app grew from launch to millions of users in a short time with only a few engineers.",
      applied:
        "Public talks by its engineers describe a plain Django app on stateless servers behind load balancers, PostgreSQL as the main store, memcached and Redis for caches, and queues for background work. They partitioned the PostgreSQL data as it grew.",
      evidence: "Instagram engineering talks and posts, for example Scaling Instagram Infrastructure",
      impact:
        "The journey followed the usual shape: stateless app servers, caches and queues first, and partitioned data as it grew.",
    },
    {
      system: "Twitter's move off a single Rails application",
      kind: "industry",
      problem:
        "A fast-growing site hit repeated outages because one application and its database carried everything.",
      applied:
        "Twitter engineers have described splitting the monolith into services, moving timelines into memory caches and later rewriting hot paths on the JVM. The bottleneck moved from one part to the next as each was fixed.",
      evidence: "Twitter engineering blog and conference talks on its architecture history",
      impact:
        "It is the standard example that you meet a new bottleneck after each fix, so measurement has to continue.",
    },
    {
      system: "Traed single VM and the shared engine process",
      kind: "yours",
      problem:
        "One server runs every service. A heavy backtest in the engine process once stopped live ticks from being processed, although the process still answered health checks.",
      applied:
        "The tick fan-out is already off the VM in serverless API Gateway and Lambda. The architecture notes record the contention as the known risk and set a separate backtest worker as the target, rather than adding web servers.",
      evidence: "ARCHITECTURE.md section 2.2 (reliability caveat); docs/HLD.md section 3 (single VM)",
      impact:
        "The next step is chosen from the observed bottleneck, which is isolation and not total capacity.",
    },
  ],
  insights: [
    {
      t: "Up first, out when measured",
      d: "A bigger machine adds no failure modes. Go horizontal for redundancy or when the biggest sensible machine is already the limit.",
    },
    {
      t: "Stateless is what makes out possible",
      d: "Keep sessions, records and files in shared stores. Then any server can serve any request and a lost server loses nothing.",
    },
    {
      t: "The database is the usual limit",
      d: "State moves, it does not vanish. Replicas help reads, caches help hot reads, and shards are the last and hardest step.",
    },
    {
      t: "Measure the saturated resource",
      d: "Use utilisation, saturation and errors on each resource. Little's law sizes pools. Fixing anything that is not saturated changes nothing.",
    },
  ],
  pitfalls: [
    "Scaling the part that is not saturated. Ten more app servers do nothing when the database is at full CPU.",
    "Calling a service stateless while sessions or uploads still sit on local disk or memory, which breaks the first time a second server starts.",
    "Reading the average as the truth. A healthy average hides a slow 99th percentile and short saturation spikes, such as the first minute of a market open.",
  ],
  quiz: [
    {
      q: "What makes a server stateless in the sense that matters for scaling out?",
      options: [
        "It keeps no request data that other servers could not rebuild",
        "It never opens a connection to a database or a cache",
        "It writes no log files and keeps no files on its own disk",
        "It runs a single thread and handles one request at a time",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Statelessness means any server can answer any request because durable state lives in shared stores. That is what lets you add or remove copies freely.",
      distractors: [
        "",
        "A stateless server usually talks to a database. The state lives there, not in the server.",
        "Logs are not state in this sense. The question is whether a request depends on something only this server holds.",
        "Threads have nothing to do with it. A stateless server can be heavily multi-threaded.",
      ],
    },
    {
      q: "What does Amdahl's law tell you about adding machines?",
      options: [
        "Doubling the machines always halves the time a job takes",
        "Speed-up is capped by the part of the job that cannot be split up",
        "Latency falls with the square of the number of machines",
        "Reads and writes scale equally well when you add machines",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The serial fraction sets the cap. With 10 percent serial work the best possible speed-up is 10 times, however many machines you add.",
      distractors: [
        "Perfect halving is the ideal case. It ignores the serial part and the cost of coordination.",
        "",
        "There is no square law. Gains flatten as the serial fraction dominates.",
        "Reads often scale by copying data, but writes need agreement, which is why they scale worse.",
      ],
    },
    {
      q: "Each request holds a database connection for about 60 ms. At 400 requests a second, how many connections are busy on average, and what does a pool of 20 mean?",
      options: [
        "About 6 busy, so a pool of 20 is mostly idle",
        "About 12 busy, so a pool of 20 has a comfortable margin",
        "About 24 busy, above the pool of 20, so requests queue",
        "About 60 busy, so the pool must be at least 60",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Little's law: 400 per second times 0.06 seconds is 24 connections in use on average. A pool of 20 is saturated and requests wait, even before any spike.",
      distractors: [
        "6 would come from 100 requests a second, not 400.",
        "12 would be right at 200 requests a second. Check the rate and the hold time again.",
        "",
        "60 is the hold time in milliseconds, not the product of rate and time in seconds.",
      ],
    },
    {
      q: "A web app keeps login sessions in each server's memory. After a second server is added behind a round-robin balancer, users are logged out at random. What is the best fix?",
      options: [
        "Replace both servers with one much bigger server",
        "Change to a faster load balancing algorithm for requests",
        "Restart both servers every hour to clear stale sessions",
        "Keep sessions in a shared store such as Redis",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The sessions are state held in one server. Moving them to a shared store makes every server interchangeable, which is the point of scaling out.",
      distractors: [
        "It hides the problem and removes redundancy. It does not make the design scalable.",
        "The algorithm decides who gets a request, not whether the server knows the session.",
        "Restarts would log users out more often, not less.",
        "",
      ],
    },
    {
      q: "A page is slow. Database CPU is at 95 percent and the three app servers are at 20 percent. What is the best first move?",
      options: [
        "Find slow queries, then add an index or cache first",
        "Add three more app servers to share the page load",
        "Shard the database by user id immediately",
        "Replace the app servers with ones that have faster network cards",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The saturated resource is the database. Cheaper fixes such as an index or a cache for hot reads come before any structural change, and more app servers only add load on it.",
      distractors: [
        "",
        "App servers are mostly idle. More of them will send more queries to the database that is already full.",
        "Sharding is the hardest step to undo. It is not justified before simpler fixes are tried.",
        "The network is not the measured limit, so a faster card changes nothing.",
      ],
    },
    {
      q: "A broker app generates a 4-second contract-note PDF inside the web request for 200,000 clients after the 15:30 close. Servers time out in the first hour. What fits best?",
      options: [
        "Make every one of the web servers ten times bigger",
        "Queue PDF jobs for a small worker pool and notify when ready",
        "Raise the request timeout to 60 seconds for report pages",
        "Shard the client table by client id across hosts",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Slow, bursty work belongs on a queue. Workers drain it at a steady rate, and requests return in milliseconds with a job id to check.",
      distractors: [
        "Bigger servers still tie a worker up for 4 seconds per request. The burst remains.",
        "",
        "A longer timeout hides the failure and keeps workers busy even longer, so fewer users are served.",
        "The client table is not the stated problem. The work done inside the request is.",
      ],
    },
    {
      q: "A founder with one daily user, one VM at 15 percent CPU and no tested restore is told to add a load balancer and three app servers for reliability. What is the sound judgement?",
      options: [
        "Agree, because every production system needs a load balancer",
        "Agree, but only if the three servers sit on the same VM host",
        "Not yet: a tested restore and a measured trigger come first",
        "Not at all: a single VM can never be reliable enough for money",
      ],
      answer: 2,
      difficulty: "judge",
      why: "More app servers do not remove the shared database or the single host, and they add parts that can fail. Backup and restore address the real risk, and a written trigger tells you when to scale.",
      distractors: [
        "Not every system needs one. A balancer in front of one stateful stack buys little.",
        "Servers on the same host share its failure, so this gives capacity at best and no resilience.",
        "",
        "Overstated. Many reliable systems run on one well-run machine. The question is what the risks and triggers are.",
      ],
    },
    {
      q: "A shop's MySQL primary is at 80 percent CPU at peak and 92 percent of queries are reads. An engineer proposes sharding by customer id. What is the best judgement?",
      options: [
        "Agree, because sharding is the standard answer to high CPU",
        "Agree, but only after doubling the app servers",
        "Switch to a different database engine first",
        "Disagree: try read replicas and a cache before sharding",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Reads dominate, and replicas and caches serve reads cheaply. Sharding brings cross-shard queries and rebalancing, and it is only justified when writes outgrow one primary.",
      distractors: [
        "High CPU has several causes. With mostly reads there are far cheaper fixes.",
        "More app servers send more queries to a database already near its limit.",
        "A rewrite is the most expensive option and does not target the read-heavy load.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-scaling-basics-backtest-starves-live",
      scenario:
        "One virtual machine runs the web app, the Python engine, MySQL and Redis for a single user. Several times a week a heavy options backtest uses most of the engine's memory and event loop for several minutes, and during that time live ticks are not processed, although the engine still answers its health check. Average CPU on the VM is about 20 percent. The founder is choosing between a bigger VM, a second VM behind a load balancer, a separate worker for backtests, and splitting everything into microservices.",
      options: [
        {
          label: "Buy a bigger VM",
          appeal: "One click, no code change, and more memory sounds like the cure for a memory-hungry job.",
        },
        {
          label: "Add a second VM behind a load balancer",
          appeal: "Looks like redundancy and capacity in one move.",
        },
        {
          label: "Run backtests in a separate worker process with its own memory cap, leaving the live loop alone",
          appeal: "Targets the actual problem, which is two workloads fighting inside one process.",
        },
        {
          label: "Split the platform into microservices by domain",
          appeal: "Clean boundaries and independent scaling for every part.",
        },
      ],
      best: 2,
      verdict:
        "Average CPU is 20 percent, so total capacity is not the problem. Contention is: a CPU and memory heavy job shares the process and event loop of the live loop. A bigger VM leaves them in the same process, a balancer cannot split one stateful live loop, and microservices are a large rewrite for a narrow fault. Isolating the backtest is the smallest change that removes the cause.",
      claims: [
        {
          text: "You accept a new moving part, a worker plus a way to hand it jobs and read results, in return for isolating the live loop.",
          axis: "trade",
          correct: true,
          note: "True. Isolation costs a hand-off mechanism and some job state to track.",
        },
        {
          text: "The gain comes from the backtest getting more total CPU than before.",
          axis: "trade",
          correct: false,
          note: "False. The gain is isolation. Total CPU was never the limit at 20 percent average.",
        },
        {
          text: "If the worker runs out of memory, only that backtest dies and live ticks keep flowing, provided the worker's memory is capped separately.",
          axis: "failure",
          correct: true,
          note: "True. A separate process confines the failure, which was the point.",
        },
        {
          text: "A bigger VM alone removes the starvation because the process then never has to wait.",
          axis: "failure",
          correct: false,
          note: "False. CPU-heavy work in the same event loop still blocks the tick handler, whatever the memory.",
        },
        {
          text: "A load balancer in front of two copies of the live engine would split the live loop safely.",
          axis: "failure",
          correct: false,
          note: "False. The live loop owns state for each session, so two copies would double-handle it. This is not a stateless tier.",
        },
        {
          text: "Watch ticks processed per minute and event-loop lag on the live engine while a backtest runs.",
          axis: "measure",
          correct: true,
          note: "True. These show the harm directly, and a health endpoint that returns 200 does not.",
        },
        {
          text: "Average CPU on the VM shows whether the live loop is healthy.",
          axis: "measure",
          correct: false,
          note: "False. A 20 percent average coexisted with a stalled tick loop.",
        },
      ],
    },
    {
      id: "sd-scaling-basics-tatkal-surge",
      scenario:
        "A railway booking site opens Tatkal ticket sales at 10:00, and lakhs of users arrive within a minute. Train search is about 95 percent reads of schedules that rarely change. Booking writes seat inventory, and most attempts target a few hundred popular trains. The web tier is stateless, runs 40 servers and sits at 30 percent CPU. The primary database is at full CPU with long lock waits on seat rows during the first minute. Which approach fits?",
      options: [
        {
          label: "Serve search from a cache and replicas, and meter booking writes with admission control and a queue, keeping the web tier as it is",
          appeal: "Takes the read load off the primary and keeps the contended writes inside what it can finish.",
        },
        {
          label: "Add 100 more web servers",
          appeal: "The web tier is stateless, so adding servers is easy and quick.",
        },
        {
          label: "Shard the database by train number",
          appeal: "Splits data across machines, so each handles less.",
        },
        {
          label: "Buy the largest possible database machine",
          appeal: "No code change, and more CPU should shorten lock waits.",
        },
      ],
      best: 0,
      verdict:
        "The web tier is at 30 percent and the primary is the saturated shared resource. Search reads can leave it through a cache and replicas. The remaining pain is lock contention on a few hot trains, which neither more web servers nor a bigger box nor sharding by train removes, since a hot train still lands on one shard. Metering the writes keeps throughput high and orderly.",
      claims: [
        {
          text: "You accept that some users wait in a line or are asked to retry, in return for the booking database staying within its capacity.",
          axis: "trade",
          correct: true,
          note: "True. Admission control trades some waiting for a system that keeps working.",
        },
        {
          text: "Every user gets a faster booking at the peak.",
          axis: "trade",
          correct: false,
          note: "False. The goal is higher completed bookings and stability, and some users will wait longer.",
        },
        {
          text: "A cached search result may show a seat count a few seconds old, so the booking step must check inventory against the database.",
          axis: "failure",
          correct: true,
          note: "True. Reads can be stale, but the write path must decide on the authoritative count.",
        },
        {
          text: "Adding web servers relieves the lock waits because the work is spread out.",
          axis: "failure",
          correct: false,
          note: "False. The waits are on seat rows inside the database, and more servers send more concurrent requests at them.",
        },
        {
          text: "Track lock-wait time on seat rows, booking queue depth, and the 99th percentile of booking time at 10:00.",
          axis: "measure",
          correct: true,
          note: "True. These show the saturated resource and what users feel.",
        },
        {
          text: "Average web-server CPU over the day shows whether the system survived the surge.",
          axis: "measure",
          correct: false,
          note: "False. A one-minute surge and a bottleneck in another tier disappear inside that average.",
        },
      ],
    },
    {
      id: "sd-scaling-basics-premature-scale",
      scenario:
        "A two-engineer start-up has 4,000 daily users, one app server and one managed PostgreSQL database at 25 percent CPU, and a 99th percentile page time of 350 ms. An advisor says to adopt Kubernetes, microservices and a sharded database so the product is ready for 100 times the traffic. A launch campaign next month may double traffic. The team has no load test and no written plan for when to scale.",
      options: [
        {
          label: "Move to Kubernetes and microservices now",
          appeal: "Builds the platform once, before the big growth arrives.",
        },
        {
          label: "Shard the database before the launch",
          appeal: "Removes the database as a future limit.",
        },
        {
          label: "Deploy to several regions for safety",
          appeal: "Protects against a regional outage during the campaign.",
        },
        {
          label: "Stay as is, load-test at five times today's traffic, fix the costliest queries, and write down the measured triggers for adding a second app server",
          appeal: "Spends the two engineers' time on product and on facts rather than guesses.",
        },
      ],
      best: 3,
      verdict:
        "Utilisation is low and the expected growth is twofold, not a hundredfold. The cheap, reversible steps are a load test, query fixes and a written trigger. A stateless app tier can be scaled out in minutes if the test shows a limit, while the heavier options would use up the whole team's attention and add failure modes they cannot yet staff.",
      claims: [
        {
          text: "Staying simple costs little now and keeps two engineers on the product, in return for a plan to scale only when a measured trigger is reached.",
          axis: "trade",
          correct: true,
          note: "True. The cost of waiting is small because the early steps are cheap and reversible.",
        },
        {
          text: "Waiting means sharding becomes impossible later.",
          axis: "trade",
          correct: false,
          note: "False. It is harder to retrofit late, but it is possible, and most systems never need it.",
        },
        {
          text: "If the launch exceeds the load test, a stateless app tier can be scaled out quickly, while the single database would be the first part to saturate.",
          axis: "failure",
          correct: true,
          note: "True. This is why the test should find the first saturated resource.",
        },
        {
          text: "One app server is not a single point of failure because the managed database is redundant.",
          axis: "failure",
          correct: false,
          note: "False. The database redundancy does not keep the single app server alive.",
        },
        {
          text: "Run a load test at five times today's traffic and note which resource saturates first.",
          axis: "measure",
          correct: true,
          note: "True. It turns a guess into a number and shows where to spend effort.",
        },
        {
          text: "The total count of registered users is the number to scale on.",
          axis: "measure",
          correct: false,
          note: "False. Load depends on concurrent activity and work per request, not on how many people ever signed up.",
        },
      ],
    },
  ],
};

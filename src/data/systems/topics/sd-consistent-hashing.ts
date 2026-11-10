import type { Topic } from "../../types.ts";

export const sdConsistentHashing: Topic = {
  id: "sd-consistent-hashing",
  title: "Consistent hashing",
  tier: 3,
  week: 5,
  depth: "deep",
  summary:
    "Place keys on nodes so that adding or removing a node moves only a small share of them. The ring, virtual nodes, rendezvous hashing and bounded loads.",
  why: "Any system that spreads keys over a changing set of machines, such as a cache fleet, a sharded store or a load balancer that wants repeat visitors to reach the same server, hits one question: what happens to the keys when a machine joins or dies? Plain modulo arithmetic answers badly, and consistent hashing is the standard answer, behind Dynamo, Cassandra and many CDNs. It is also a favourite interview topic, because the idea is small and the details are not.",
  learn: {
    intuition:
      "Picture a round running track with a hundred marker posts, and a few water stations standing at various points on it. Every runner is assigned to the first station they meet when running clockwise from their own post. If a station closes, only its runners need a new station, and they simply continue on to the next one. If a new station opens, it takes over only the runners in the stretch just behind it. Everyone else keeps their station. Compare that with a rule such as take your number, divide by the count of stations and use the remainder. Open one more station and nearly everyone's remainder changes, so almost every runner has to move. The track makes the assignment depend on neighbours, not on the total count. That is the whole idea, and the rest is detail about keeping the stations evenly spaced.",
    mechanics: [
      {
        heading: "Why hash modulo n breaks",
        body: "The simple rule is `node = hash(key) mod n`. It is even and cheap, until n changes. Take 4 cache nodes growing to 5. A key stays only if `h mod 4` equals `h mod 5`. Over any run of 20 consecutive hash values that happens for just 4 of them, so 80 percent of keys move. For a cache this means most reads miss at once and flood the database. The best any scheme can do when going from 4 to 5 nodes is to move 1 in 5, the share the new node must own. Consistent hashing gets close to that floor.",
      },
      {
        heading: "The ring and the clockwise rule",
        body: "Hash both nodes and keys onto the same circle of values, for example 0 to 2 to the power 32 minus 1. A key belongs to the first node at or after its position, going clockwise. Take a small circle of 0 to 359 with nodes A at 40, B at 160 and C at 280. A key at 100 goes to B. A key at 300 passes 359, wraps round and lands on A. Add node D at 100 and only keys between 41 and 100 move, from B to D. Nodes keep their positions in a sorted array, and a lookup is a binary search.",
      },
      {
        heading: "Virtual nodes: fixing uneven arcs",
        body: "With one random point per node the arcs are uneven. For n nodes, the largest arc is typically about ln n times the average, so with 10 nodes one may carry 2 to 3 times its fair share. The fix is virtual nodes: each physical node is hashed to many points, say 200. Load then evens out, with a spread near 1 divided by the square root of 200, about 7 percent. A bigger machine simply gets more points. When a node dies, its many small arcs pass to many different neighbours, so no single survivor suddenly doubles its load.",
      },
      {
        heading: "Rendezvous and jump hashing",
        body: "Rendezvous hashing, also called highest random weight, needs no ring. For a key, compute `hash(key, node)` for every node and pick the node with the highest score. Remove a node and only its keys move, each to the node with the next highest score. A lookup costs one hash per node, fine for tens of nodes. Jump consistent hash, from Google, takes a key and a node count and returns a bucket in O(log n) time with no stored state, but buckets must be numbered 0 to n minus 1, so it suits storage shards that only grow at the end.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed does not use consistent hashing, because it has one Redis and one MySQL on one server, so there is no set of nodes to spread keys over. Its Redis cache holds keys such as `market_data:{symbol}:1minute`, and if that cache outgrew one machine, the first step would be to spread those symbol keys across several Redis nodes. Redis Cluster does this with 16,384 fixed hash slots rather than a ring. The DynamoDB tables behind the WebSocket bridge are partitioned by DynamoDB, which hides the placement entirely. The thing to remember is the rule: never use plain modulo over a changing node set.",
      },
    ],
    complexityDerivation:
      "Why does the ring move so few keys? A key's owner depends only on the first node clockwise from it, so a change affects keys only in the arc next to the change. If keys and node points are spread uniformly, a new node's arc has expected size one part in n plus one of the circle, so it takes about K divided by n plus one of the K keys, and gives up nothing else. That matches the lower bound, since the new node must own at least that share. Modulo has no such locality because the owner depends on the global count n. Lookup costs O(log n) by binary search over the sorted points, or O(1) with a precomputed table. The argument assumes uniform hashing and uniform key popularity. It stops holding when node points are few, which causes uneven arcs and is cured by virtual nodes, and when one key is far hotter than the rest. The ring decides placement, not demand, so a hot key still overloads its owner, and the cure for that is outside the ring: replicate or cache that key.",
    variants: [
      {
        name: "Ring with virtual nodes",
        when: "A storage or cache fleet where nodes join and leave and machines differ in size, as in Dynamo and Cassandra.",
        delta:
          "Each node holds many points, so load is even and failures spread widely. The ring must be stored and kept in agreement across clients, and replicas are the next few distinct nodes clockwise.",
      },
      {
        name: "Rendezvous (highest random weight)",
        when: "A modest number of nodes, no appetite for ring state, and a need for simple code, such as picking a backend for a tenant.",
        delta:
          "No ring and no virtual nodes. Each lookup scores every node, so cost grows with node count, and removal moves only the removed node's keys.",
      },
      {
        name: "Consistent hashing with bounded loads",
        when: "Load balancing, where a few popular keys could overload one backend while the rest stay cool.",
        delta:
          "Each node is capped at a factor such as 1.25 times the average load. A key whose owner is full moves on to the next node clockwise. With 1,000 requests over 10 nodes the cap is 125 each. Locality drops slightly, and balance is guaranteed.",
      },
    ],
    tradeoffs: [
      {
        vs: "Hash modulo n versus a consistent scheme",
        pick: "Consistent hashing whenever the node set can change",
        because:
          "Modulo is fine for a fixed number of shards that never changes. If nodes come and go, modulo moves most keys on every change, and a cache loses most of its contents.",
      },
      {
        vs: "A ring with virtual nodes versus fixed hash slots",
        pick: "Ring when nodes are many and automatic; fixed slots when you want simple, explicit rebalancing",
        because:
          "A ring spreads change smoothly but needs tuning. A fixed set of slots, like Redis Cluster's 16,384, is easy to reason about and move by hand, though the slot count is fixed up front.",
      },
      {
        vs: "Perfect locality versus balanced load",
        pick: "Balanced load, through bounded loads or replicas, when traffic is skewed",
        because:
          "Pure hashing keeps a key on one node, which is good for cache hits. If one key is very popular, that node melts, so allowing a small spill to neighbours keeps the fleet healthy.",
      },
    ],
  },
  algorithms: [
    {
      name: "Hash ring with clockwise successor",
      role: "Maps both nodes and keys to points on a circle, and gives each key to the next node clockwise, so a membership change moves only nearby keys.",
    },
    {
      name: "Binary search over sorted ring points",
      role: "Finds the first node point at or after a key's hash in logarithmic time, wrapping to the first point when the key is past the last.",
      dsa: "binary-search",
    },
    {
      name: "Hash function (uniform spreading)",
      role: "Gives nodes and keys positions that look random, which is what makes arcs and loads even on average.",
      dsa: "hashing",
    },
    {
      name: "Rendezvous (highest random weight) hashing",
      role: "Chooses the node with the largest hash of key and node together, giving the same minimal movement without a ring.",
    },
  ],
  realWorld: [
    {
      system: "Akamai and the original consistent hashing paper",
      kind: "industry",
      problem:
        "Web caches in a changing fleet needed each URL to live on a predictable cache, without a central table, even as caches were added or failed.",
      applied:
        "Karger and colleagues at MIT introduced consistent hashing in 1997 for distributed web caching. It was a founding idea of Akamai's content delivery network, where a URL maps to a cache server and a change in the fleet moves only a small share of URLs.",
      evidence: "Karger et al., Consistent Hashing and Random Trees (STOC 1997)",
      impact:
        "A cache failure costs only the failed cache's share of hits, not the whole fleet's.",
    },
    {
      system: "Amazon Dynamo",
      kind: "industry",
      problem:
        "A shopping-cart store had to keep accepting writes while servers failed and were replaced, with no central coordinator.",
      applied:
        "Dynamo places nodes and keys on a ring and replicates each key to the next several distinct nodes clockwise. The paper describes how its first scheme gave uneven load, and how virtual nodes, many tokens per machine, evened it and made recovery spread across the cluster.",
      evidence: "DeCandia et al., Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)",
      impact:
        "Machines can be added or fail with only a bounded share of data moving.",
    },
    {
      system: "Apache Cassandra token ring",
      kind: "industry",
      problem:
        "A wide-column database must spread rows over many nodes and let operators grow the cluster while it serves traffic.",
      applied:
        "Cassandra hashes each partition key to a token on a ring, and each node owns token ranges. It uses virtual nodes, and the default number of tokens per node was lowered from 256 to 16 in version 4.0 to cut the overhead of many small ranges.",
      evidence: "Apache Cassandra documentation: data distribution, vnodes and num_tokens",
      impact:
        "New nodes stream only their token ranges from neighbours while the cluster keeps serving.",
    },
    {
      system: "Vimeo and Google: bounded-load consistent hashing",
      kind: "industry",
      problem:
        "A video load balancer wanted repeat requests for the same video to reach the same server for cache hits, yet popular videos overloaded single servers.",
      applied:
        "Google researchers published consistent hashing with bounded loads, which caps each server at a multiple of the average and spills the excess to the next server. Vimeo described adding it to the HAProxy load balancer for exactly this reason.",
      evidence: "Mirrokni, Thorup and Zadimoghaddam, Consistent Hashing with Bounded Loads (2016); Vimeo Engineering blog on HAProxy",
      impact:
        "Cache locality is kept for most requests, and no server exceeds its cap.",
    },
  ],
  insights: [
    {
      t: "Modulo moves most keys",
      d: "From 4 to 5 nodes, hash mod n moves 80 percent of keys. A ring moves about 1 in 5, which is the minimum.",
    },
    {
      t: "Ownership is local",
      d: "A key belongs to the next node clockwise, so a change affects only the arc beside it, not the whole space.",
    },
    {
      t: "Virtual nodes fix balance",
      d: "One point per node gives uneven arcs. Hundreds of points per node even the load and spread a failure widely.",
    },
    {
      t: "Placement is not demand",
      d: "A ring puts keys evenly, not requests. A single hot key still overloads its node, so cap load or replicate.",
    },
  ],
  pitfalls: [
    "Using hash modulo n on a cache fleet that autoscales. Each scaling event empties most of the cache and floods the database.",
    "Giving each node a single point on the ring. Arcs come out uneven, and one node can carry two or three times its share.",
    "Assuming the ring solves hot keys. It decides where a key lives, not how many requests it receives.",
  ],
  quiz: [
    {
      q: "What does consistent hashing guarantee when one node is added to a ring of n nodes?",
      options: [
        "Every key keeps its old node, and the new node starts empty",
        "All keys are reshuffled evenly across the n plus one nodes",
        "Only about 1 in n plus 1 keys move, all of them to the new node",
        "Only keys that were stored on the busiest node will move",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The new node takes over the arc just behind its position, which on average is one share of n plus one. No key moves between the old nodes.",
      distractors: [
        "If no key moved, the new node would never be used.",
        "That describes modulo hashing, where nearly all keys move.",
        "",
        "Which node was busy plays no part. Only position on the ring does.",
      ],
    },
    {
      q: "What is a virtual node?",
      options: [
        "One of many ring points assigned to a single physical node to even out load",
        "A node that stores no data and only forwards requests to others",
        "A copy of a node running in a different data centre as a backup",
        "A node simulated in tests that is never used in production",
      ],
      answer: 0,
      difficulty: "recall",
      why: "A physical machine is hashed to many points on the ring, so its total share is the sum of many small arcs and comes out near its fair share.",
      distractors: [
        "",
        "A forwarding-only node is a router, which is a different thing.",
        "Replicas are chosen separately. A virtual node is about placement, not backup.",
        "Virtual nodes are used in production systems, including Cassandra.",
      ],
    },
    {
      q: "A cache fleet grows from 4 to 5 nodes with hash(key) mod n. Roughly what share of keys changes node?",
      options: [
        "About 20 percent, the share the new node should hold",
        "About 80 percent, since only 4 in 20 hash values keep their node",
        "About 50 percent, since half of the keys are odd",
        "None, since the hash function itself did not change",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A key stays only if h mod 4 equals h mod 5, which holds for 4 of every 20 values. So 16 of 20, or 80 percent, move.",
      distractors: [
        "That is the best possible movement and what a ring achieves, not what modulo does.",
        "",
        "Odd or even has no bearing here. The divisor changed from 4 to 5.",
        "The hash is unchanged, but the remainder depends on n, and n changed.",
      ],
    },
    {
      q: "A ring spans 0 to 359 with nodes A at 40, B at 160 and C at 280. Which node owns a key hashed to 300?",
      options: [
        "C, since it is the nearest node by distance on the circle",
        "B, since 300 lies between 160 and 280 in the list",
        "C, since it is the last node before 300 in order",
        "A, since the first node at or after 300 clockwise is A, after wrapping",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Going clockwise from 300 there is no node before 359, so the walk wraps round to 0 and reaches A at 40.",
      distractors: [
        "Nearest by distance is not the rule. The rule is the first node clockwise.",
        "300 is greater than 280, so B and C both lie behind the key, not ahead.",
        "C is behind the key. Ownership looks clockwise, not backwards.",
        "",
      ],
    },
    {
      q: "A ring of 10 nodes with one point each shows one node carrying about 2.5 times the average load. What is the standard fix?",
      options: [
        "Give each node many virtual points, say 200 each, so arcs average out",
        "Hash each key twice and store it on both resulting nodes",
        "Raise the cache size on the overloaded node to match the load",
        "Replace the hash function with a longer one, such as 512 bits",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The imbalance comes from few random arcs. With many points per node, the arcs average out, and the spread falls near 1 over the square root of the point count.",
      distractors: [
        "",
        "Double storage spreads the work a little, but it does not fix uneven arcs.",
        "That treats the symptom for one node and leaves the uneven ring in place.",
        "A longer hash is no more uniform. Uneven arcs come from the number of points.",
      ],
    },
    {
      q: "Node X, with a single ring point, dies. How does its load move compared to a ring where each node has 200 virtual points?",
      options: [
        "In both cases the load is shared equally by every survivor",
        "In both cases the next node clockwise takes the entire load",
        "With one point, one neighbour takes it all; with 200, many nodes each take a little",
        "With 200 points the load disappears, since virtual nodes keep a copy",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A single arc passes whole to one successor, which may double its load. Many scattered small arcs pass to many different successors, so each absorbs a small increase.",
      distractors: [
        "Equal sharing happens only with many points, not with one.",
        "That is true for one point only. Many points spread the arcs.",
        "",
        "Virtual nodes are placement points. They do not hold copies of data.",
      ],
    },
    {
      q: "A team puts a ring in front of 8 cache nodes. One celebrity key gets 30 percent of all traffic. Does the ring solve the overload?",
      options: [
        "Yes, because the ring spreads all traffic evenly by design",
        "Yes, if virtual nodes are added until the load evens out",
        "No, because the ring only ever works for keys of equal size",
        "No, because the key still has one owner, so replicate it or cache it locally",
      ],
      answer: 3,
      difficulty: "judge",
      why: "The ring places keys evenly, not requests. One key has one owner, however many virtual nodes exist, so the fix is replication, a local cache or a bounded-load scheme.",
      distractors: [
        "It spreads keys evenly. It cannot spread the traffic of one key.",
        "More virtual nodes balance the number of keys per node, not one key's traffic.",
        "Size is not the issue. Popularity is.",
        "",
      ],
    },
    {
      q: "A scheduler assigns 50 tenants to 6 workers that come and go. The team wants minimal movement and the least code and state. Which fits best?",
      options: [
        "Hash modulo the worker count, restarted on every change",
        "Rendezvous hashing: score each worker per tenant and pick the highest",
        "A ring with 500 virtual nodes per worker kept in a database",
        "Jump consistent hash, with workers numbered by their start time",
      ],
      answer: 1,
      difficulty: "judge",
      why: "With only 6 workers, scoring all of them per lookup is trivial. Rendezvous gives minimal movement and needs no stored ring.",
      distractors: [
        "Modulo moves most tenants on every change, which is what the team wants to avoid.",
        "",
        "A ring works, but 3,000 stored points is far more state than 6 workers need.",
        "Jump hash only supports removing the highest-numbered bucket, so workers leaving at random breaks it.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-consistent-hashing-cache-fleet",
      scenario:
        "A small shop's web app uses 3 memcached servers. The client picks a server with hash(key) mod 3. Traffic is growing and the team wants to add a fourth server before the next sale, without the database being flooded when they do. There are two engineers, the cache fronts a MySQL that handles about 300 queries per second at peak, and the app uses an off-the-shelf client library. What should they do?",
      options: [
        {
          label: "Keep modulo, add the fourth server at midnight and live with a cold cache",
          appeal:
            "No code change, and midnight is quiet.",
        },
        {
          label: "Replace the three servers with one much bigger server",
          appeal:
            "No fleet, so no remapping problem at all.",
        },
        {
          label: "Switch the client to its consistent-hashing mode (ring with virtual nodes) before adding the fourth server",
          appeal:
            "Adding a server remaps only about a quarter of keys, and mature client libraries have this built in.",
        },
        {
          label: "Copy every key to all four servers",
          appeal:
            "Whichever server is chosen, the key is there.",
        },
      ],
      best: 2,
      verdict:
        "The client library already supports a ring, so a configuration change cuts the remapping from about 75 percent to about 25 percent of keys with no new moving parts. Modulo needs a cold cache again at every change, one big server is a single point of failure and a ceiling, and full replication wastes memory and makes writes hit every server.",
      claims: [
        {
          text: "You accept that about a quarter of keys still miss once, after the fourth server is added.",
          axis: "trade",
          correct: true,
          note: "True. The new server owns about one share in four, and those keys are cold.",
        },
        {
          text: "You gain smooth growth, as each later server remaps only its own share.",
          axis: "trade",
          correct: true,
          note: "True. This is the point of the ring.",
        },
        {
          text: "You give up the ability to remove a server, since the ring only allows additions.",
          axis: "trade",
          correct: false,
          note: "A ring handles removal as well: the keys of the lost server move to its clockwise neighbours.",
        },
        {
          text: "All clients must use the same server list and the same hash settings, or two apps will look for one key in different places.",
          axis: "failure",
          correct: true,
          note: "True. Placement is computed by each client, so settings must match.",
        },
        {
          text: "If one server dies, the keys it held are lost for good, since the cache is the only copy.",
          axis: "failure",
          correct: false,
          note: "A cache is a copy. The keys are rebuilt from MySQL on the next miss.",
        },
        {
          text: "Watch the cache hit rate and MySQL queries per second for the hour after adding the server.",
          axis: "measure",
          correct: true,
          note: "True. A dip and recovery in hit rate shows the size of the remap.",
        },
        {
          text: "Watch only the memory used on the new server.",
          axis: "measure",
          correct: false,
          note: "Memory growth does not show whether the database is coping with extra misses.",
        },
      ],
    },
    {
      id: "sd-consistent-hashing-ipl-cdn",
      scenario:
        "A video streaming service delivers an IPL final to tens of millions of viewers. Each video segment is a URL, and 400 edge cache servers in one region sit behind a load balancer. If requests for a segment reach random servers, each server must fetch it from origin and the origin saturates. If a segment is always sent to one server, the server holding the segment for the live feed gets millions of requests per second. How should the balancer route?",
      options: [
        {
          label: "Consistent hashing on the segment URL, with bounded loads that spill over to the next servers when one passes about 1.25 times the average",
          appeal:
            "Most segments stay cached on one server, and a hot segment's overflow is shared with neighbours.",
        },
        {
          label: "Hash modulo the server count on the segment URL",
          appeal:
            "Each segment always goes to the same server, so the cache is used well.",
        },
        {
          label: "Round robin across all servers",
          appeal:
            "Perfectly even load with no state.",
        },
        {
          label: "Random routing, with every server caching every segment",
          appeal:
            "Any server can answer, so nothing is ever redirected.",
        },
      ],
      best: 0,
      verdict:
        "Two forces pull in opposite directions: locality, so the origin is spared, and balance, so no cache melts. Bounded-load consistent hashing keeps both and handles servers joining or failing. Plain modulo gives locality but melts the hot server and reshuffles at each change, and round robin or random routing give balance but fetch every segment to every server from origin.",
      claims: [
        {
          text: "You accept that a hot segment is held in a few servers, not one, so the origin is hit a few times per segment instead of once.",
          axis: "trade",
          correct: true,
          note: "True. Spill-over duplicates the hot object on the next servers, a small cost for balance.",
        },
        {
          text: "You give up some cache locality for the most popular segments, in return for a hard cap on any server's load.",
          axis: "trade",
          correct: true,
          note: "True. That is the trade the cap makes.",
        },
        {
          text: "You gain the same balance as round robin with no loss of cache hits.",
          axis: "trade",
          correct: false,
          note: "Hot-segment overflow causes a few extra origin fetches, so some locality is lost.",
        },
        {
          text: "If the cap is set too tight, many requests spill and the origin sees more fetches than expected.",
          axis: "failure",
          correct: true,
          note: "True. A cap near 1.0 turns most routing into spill-over.",
        },
        {
          text: "If a server fails, the entire region's cache is invalidated.",
          axis: "failure",
          correct: false,
          note: "Only the failed server's share of segments moves to its neighbours.",
        },
        {
          text: "Watch the per-server request rate against the cap, and the origin fetch rate during the match.",
          axis: "measure",
          correct: true,
          note: "True. These show balance and cache effectiveness together.",
        },
        {
          text: "Watch the average request rate across all servers.",
          axis: "measure",
          correct: false,
          note: "An average hides the one overloaded server this design exists to prevent.",
        },
      ],
    },
    {
      id: "sd-consistent-hashing-mixed-nodes",
      scenario:
        "A team runs a 12-node sharded key-value store of its own. Eight nodes have 2 TB disks and four newer nodes have 4 TB. Each node is placed on the ring at a single point. One node holds 20 percent of the data and another only 4 percent, and the team keeps adding nodes by hand-picking ring positions. They want an even fill by disk size, and automatic spreading of load when a node fails. What should they change?",
      options: [
        {
          label: "Hash modulo node count, to even out the keys",
          appeal:
            "Even spread for uniform keys, and no ring to manage.",
        },
        {
          label: "Give each node many virtual points, in proportion to its disk size, so a 4 TB node holds twice as many as a 2 TB node",
          appeal:
            "Averages out random arcs, matches fill to capacity and spreads failures across many neighbours.",
        },
        {
          label: "Keep one point per node but pick the positions more carefully by hand",
          appeal:
            "Cheap to do, and gives an even split for today's nodes.",
        },
        {
          label: "Replace all nodes with 4 TB machines before changing the scheme",
          appeal:
            "Uniform machines remove the weighting question.",
        },
      ],
      best: 1,
      verdict:
        "The skew comes from few random arcs, and the size difference needs weighting. Virtual points proportional to capacity solve both and keep failure load spread out. Modulo reshuffles data on every change, hand-picked positions need redoing at each addition and still concentrate a failure on one neighbour, and replacing machines is expensive and does not fix the underlying scheme.",
      claims: [
        {
          text: "You accept more ring state to store, and more small ranges to move or repair when a node joins.",
          axis: "trade",
          correct: true,
          note: "True. Many points means many small ranges, which is the cost of smoothness.",
        },
        {
          text: "You gain automatic weighting: adding a larger node needs only a larger point count, not a hand-planned position.",
          axis: "trade",
          correct: true,
          note: "True. Capacity maps directly to the number of points.",
        },
        {
          text: "You gain exact balance, with every node holding precisely its share of keys.",
          axis: "trade",
          correct: false,
          note: "Balance is statistical. The spread is small with many points, but it is not zero.",
        },
        {
          text: "If one node fails, its data moves to a single neighbour with one point each, which may then fill its disk.",
          axis: "failure",
          correct: true,
          note: "True, and it is what virtual nodes prevent, by sending small pieces to many neighbours.",
        },
        {
          text: "With virtual points, a failed node's data is lost, as the points were its only location.",
          axis: "failure",
          correct: false,
          note: "Points decide placement. Durability comes from replication, a separate matter.",
        },
        {
          text: "Measure each node's disk used as a fraction of its capacity, and the spread between the fullest and emptiest node.",
          axis: "measure",
          correct: true,
          note: "True. Fill relative to capacity is exactly what the weighting aims to equalise.",
        },
        {
          text: "Measure the total disk used by the cluster.",
          axis: "measure",
          correct: false,
          note: "The total can be comfortable while one node is nearly full.",
        },
      ],
    },
  ],
};

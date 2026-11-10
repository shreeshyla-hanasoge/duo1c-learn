import type { Topic } from "../../types.ts";

export const sdDesignKeyValueStore: Topic = {
  id: "sd-design-key-value-store",
  title: "Design a distributed key-value store",
  tier: 10,
  week: 19,
  depth: "deep",
  summary:
    "Build a Dynamo-style store from parts: consistent hashing, replication, quorums, vector clocks, gossip and Merkle repair, and see how they fit together.",
  why: "Most large systems keep something in a key-value store: carts, sessions, profiles, device state. Designing one forces you to combine partitioning, replication, quorums, clocks, failure detection and repair into one coherent story, so it is the best test of whether the earlier distributed-data ideas really fit. It also teaches you to ask the right question before choosing one: can this data accept a conflict, or must it never have one? Traed uses a managed store of this family but does not run one.",
  learn: {
    intuition:
      "Picture a very large paper register that no single clerk can hold. So you seat ten clerks in a circle and give each a stretch of the circle. Every entry is filed by a rule that points to one spot on the circle, and the clerk who owns that stretch keeps it. For safety, the next two clerks around the circle keep copies too, so every entry lives with three clerks. To read, you ask two of the three and take the newest. To write, you tell the three and wait for two to say yes. If a clerk is out sick, a neighbour holds their slips with a note, and hands them over when the clerk returns. Clerks chat with random colleagues all day, so everyone soon knows who is away. Now and then two clerks compare a short fingerprint of their books, and only when the fingerprints differ do they look at the pages.",
    mechanics: [
      {
        heading: "Requirements and scale, with rough numbers",
        body: "The interface is tiny: `get(key)` and `put(key, value)`, with values from a few bytes to about a megabyte. The goals are to stay writable even during failures (an 'add to cart' should not fail), answer in single-digit milliseconds at the 99th percentile, grow by adding machines, and have no single point of failure. Assume 100 TB of data, replicated three times, so 300 TB raw. At 2 TB a machine that is 150 machines. One million operations a second spread over 150 machines is about 6,700 each, well inside what a machine can do, so storage, not throughput, sets the size. The stance is availability over strict consistency: accept that two copies can briefly differ, and resolve it later.",
      },
      {
        heading: "API and data model",
        body: "A key is hashed to a position, and the value is an opaque blob the store never looks inside. There are no joins and no secondary indexes: the only question the store can answer quickly is 'what is the value at this key'. The API is `get(key)`, which returns one or more versions together with a context, and `put(key, context, value)`, which hands that context back. The context carries version information. A read can return several versions because two writers may have changed the value at the same time and the store will not guess. Returning conflicts to the caller is an honest choice: the application knows how to merge a cart, the store does not.",
      },
      {
        heading: "The high-level design: ring, replicas, gossip, repair",
        body: "Take a ring of positions 0 to 99 with nodes A at 10, B at 40, C at 70 and D at 90. A key hashing to 55 goes clockwise to C, and with N=3 copies the preference list is C, D, A. Every node can act as coordinator, so a client may ask anyone and it forwards in one hop. Each physical machine owns many small ring positions (virtual nodes), so load spreads evenly and a new machine takes a little from everyone. Adding an 11th machine to 10 moves about one eleventh of the keys, whereas hash mod n would move about ten elevenths. Membership spreads by gossip. Replicas are compared with Merkle trees, described below.",
      },
      {
        heading: "The hard part: conflicts, quorums and repair",
        body: "With N=3, set W=2 and R=2. Because 2 plus 2 is more than 3, any read set overlaps any write set in at least one node, so a read sees the latest acknowledged write. Vector clocks detect concurrency: a write at node A gives `{A:2}`; two writers then branch to `{A:2,B:1}` and `{A:2,C:1}`. Neither contains the other, so both are kept and the application merges them, for a cart by union. If a replica is down, a sloppy quorum writes to the next node on the ring with a hint, and hands it back on return. Anti-entropy compares Merkle trees: equal roots mean equal data; otherwise descend, finding a difference among a million keys in about 20 steps.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed does not need to run a key-value store. Its data fits one MySQL and one Redis, and one daily user makes about as many reads as a single machine serves in a moment. It does use the family as a customer: the WebSocket router keeps a `Connections` table keyed by `connectionId` and a `Subscriptions` table in DynamoDB, with on-demand billing and an expiry time on rows, so AWS runs the ring, replicas and repair. The first scaling step for Traed would be a bigger machine and a replica. Building or operating a Dynamo-style cluster would be justified only by data far beyond one disk, or by a need for writes to continue through a machine loss.",
      },
    ],
    complexityDerivation:
      "The design protects three invariants. Any node can find any key in one hop, because every node knows the ring. Adding or removing a machine moves only about one over the number of machines of the keys, because only the arcs next to the change are reassigned. And a read that overlaps the write set sees the latest acknowledged write, because R plus W is greater than N. The argument holds while failures are few and replicas are strict. It stops holding in four places. A sloppy quorum writes to a stand-in node, so the overlap guarantee is lost until the hint is handed back. A hot key overloads its three replicas, because hashing balances keys, not traffic. Last-write-wins, if used instead of vector clocks, silently discards one of two concurrent writes, and clock skew decides which. And if the data cannot tolerate conflicts at all, such as a balance or a seat count, leaderless writes are the wrong tool and a consensus or single-leader design is needed.",
    variants: [
      {
        name: "Leaderless with vector clocks (the Dynamo paper, Riak)",
        when: "Writes must never be refused and the application can merge conflicting versions, such as carts and preferences.",
        delta:
          "Concurrent versions are kept and returned to the caller. No write is lost, but the application must write the merge logic.",
      },
      {
        name: "Leaderless with last-write-wins (Cassandra)",
        when: "Writes are mostly independent per key and a rare lost update is acceptable, such as sensor readings or event rows.",
        delta:
          "Each write carries a timestamp and the highest wins. There is no merge code, but one of two concurrent writes disappears, and clock skew can pick the wrong one.",
      },
      {
        name: "A consensus group per partition (Spanner, etcd, TiKV)",
        when: "Reads must see the latest write and conflicts are not allowed, such as balances, inventory or configuration.",
        delta:
          "Each partition elects a leader and commits by majority. You get strong consistency, but a partition that loses its majority stops accepting writes.",
      },
    ],
    tradeoffs: [
      {
        vs: "Availability versus consistency during a network split",
        pick: "Availability for carts and sessions; consistency for money and stock",
        because:
          "A leaderless store keeps accepting writes on both sides of a split and repairs later. A consensus store refuses writes on the minority side. Pick by what a stale or conflicting answer costs.",
      },
      {
        vs: "R=1, W=3 versus R=2, W=2 versus R=3, W=1 with N=3",
        pick: "R=2, W=2 as the balanced default",
        because:
          "R=1 with W=3 makes reads fastest but a write fails when any replica is down. R=3 with W=1 makes writes fast but reads fail on one outage. 2 and 2 survive one failed replica both ways and still overlap.",
      },
      {
        vs: "Vector clocks versus last-write-wins",
        pick: "Vector clocks when losing a write is unacceptable",
        because:
          "Vector clocks keep both sides of a conflict and need merge code. Last-write-wins is simpler and cheaper but quietly drops data, and it trusts clocks that can differ by seconds.",
      },
    ],
  },
  algorithms: [
    {
      name: "Consistent hashing with virtual nodes",
      role: "Places keys on a ring so adding or removing a machine moves only a small slice of the data.",
    },
    {
      name: "Vector clocks",
      role: "Tell apart a write that follows another from two writes that happened concurrently.",
    },
    {
      name: "Merkle tree",
      role: "Lets two replicas find differing keys by comparing a few hashes before looking at any data.",
    },
    {
      name: "Gossip protocol",
      role: "Spreads membership and failure information between random pairs of nodes, with no central registry.",
    },
  ],
  realWorld: [
    {
      system: "Amazon Dynamo",
      kind: "industry",
      problem:
        "Amazon's shopping cart had to accept additions even during failures, because a refused write cost sales.",
      applied:
        "The 2007 Dynamo paper describes consistent hashing with virtual nodes, replication to N successors, tunable N, R and W, vector clocks with application merge, sloppy quorum with hinted handoff, gossip for membership and Merkle trees for repair.",
      evidence: "DeCandia et al., Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)",
      impact:
        "It showed that giving up strict consistency for always-writable data is a workable engineering choice, and it shaped a generation of databases.",
    },
    {
      system: "Apache Cassandra",
      kind: "industry",
      problem:
        "Facebook wanted a store that spread across many machines with no master and tolerated machine loss.",
      applied:
        "Cassandra partitions rows by a hash of the key around a token ring, replicates to several nodes, lets each query choose a consistency level such as one, quorum or all, and resolves conflicts by timestamp. It repairs replicas with hinted handoff, read repair and Merkle-tree comparison, and nodes find each other by gossip.",
      evidence: "Lakshman and Malik, Cassandra: A Decentralized Structured Storage System (2009); Apache Cassandra documentation",
      impact:
        "The consistency level on each query is how one cluster serves both 'fast and loose' and 'careful' reads.",
    },
    {
      system: "Redis Cluster hash slots",
      kind: "industry",
      problem:
        "A cache or store split over many Redis nodes needs a simple, movable assignment of keys to nodes.",
      applied:
        "Redis Cluster divides the key space into 16,384 hash slots by taking a CRC16 of the key modulo 16,384. Each node owns ranges of slots, and rebalancing moves whole slots. Replication is asynchronous, so an acknowledged write can be lost if a master fails before its replica copies it.",
      evidence: "Redis documentation: Redis Cluster specification",
      impact:
        "Fixed slots are a simpler cousin of consistent hashing: the map is explicit and small, and moving a slot moves a known set of keys.",
    },
    {
      system: "Traed WebSocket connection and subscription tables",
      kind: "yours",
      problem:
        "The serverless router must remember, for each open browser or engine connection, what it subscribed to, without running a database server.",
      applied:
        "Two DynamoDB tables are declared with on-demand billing and an expiry attribute. `Connections` is keyed by `connectionId`. `Subscriptions` is keyed by `connectionId` plus `subscriptionKey`, so one connection can hold many subscriptions. AWS handles partitioning, replication and repair.",
      evidence: "CMS/Serverless/real-time-trading-websocket/serverless.yml",
      impact:
        "Lookup by key is the only access pattern, which is exactly what this family of stores does well.",
    },
  ],
  insights: [
    {
      t: "Consistent hashing limits the damage of change",
      d: "Adding the 11th machine moves about one eleventh of the keys. Hash mod n would move about ten elevenths.",
    },
    {
      t: "R + W > N is overlap, not magic",
      d: "With N=3, R=2 and W=2, a read set and a write set must share a node. A sloppy quorum breaks that promise until hints are handed back.",
    },
    {
      t: "A vector clock detects concurrency",
      d: "If neither clock contains the other, the writes were concurrent. Keep both and let the application merge them.",
    },
    {
      t: "Compare hashes before data",
      d: "A Merkle tree finds one differing key among a million in about 20 steps, so repair does not copy everything.",
    },
  ],
  pitfalls: [
    "Reading 'quorum' as a guarantee under all conditions. With sloppy quorums, clock-based conflict rules or a hot key, the overlap argument no longer holds.",
    "Using last-write-wins for data where both writes matter. The loser vanishes silently, and which one loses depends on clocks.",
    "Putting balances or stock counts in a leaderless store because it scales. Those need a single order of updates, not a merge afterwards.",
  ],
  quiz: [
    {
      q: "Why does consistent hashing reduce data movement when a machine is added?",
      options: [
        "The new machine copies every key, then the old ones delete theirs",
        "Keys are re-hashed so that each machine ends up with the same count",
        "Only the keys on the ring arcs next to the new machine change owner",
        "Keys keep their positions, and the new machine only serves reads",
      ],
      answer: 2,
      difficulty: "recall",
      why: "On a ring a key belongs to the first node clockwise of its position. A new node takes over only the arc just before it, so about one over the number of nodes of the keys move.",
      distractors: [
        "Copying everything is what simple hash mod n comes close to. Consistent hashing is designed to avoid it.",
        "Re-hashing everything is the problem being avoided, since it moves most keys.",
        "",
        "A new node must take ownership of some keys to be useful, and writes go to it too.",
      ],
    },
    {
      q: "With N=3 replicas, which setting of R and W guarantees that a read overlaps the last acknowledged write?",
      options: [
        "R=1 and W=1, since each side needs only one reply",
        "R=2 and W=1, since a read asks more nodes than a write",
        "R=1 and W=2, since writes are the more important side",
        "R=2 and W=2, since 2 plus 2 is greater than 3",
      ],
      answer: 3,
      difficulty: "recall",
      why: "The sets must overlap, which holds when R plus W is greater than N. 2 plus 2 is 4, which is greater than 3, so any two read nodes include at least one that took the write.",
      distractors: [
        "1 plus 1 is 2, less than 3, so the read can hit a replica that missed the write.",
        "2 plus 1 is 3, which is not greater than 3. The sets can miss each other.",
        "1 plus 2 is 3, which is also not greater than 3. Importance of the side is not the test.",
        "",
      ],
    },
    {
      q: "Two cart versions have clocks `{A:2,B:1}` and `{A:2,C:1}`. What does the store do?",
      options: [
        "Keeps both versions as siblings and returns both to the caller",
        "Keeps the one with the larger sum of counters, since it has more history",
        "Keeps the one from the node with the alphabetically earlier name",
        "Rejects the later write and asks the client to retry",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Neither clock is at least as large as the other on every entry, so the writes were concurrent. A vector-clock store keeps both and lets the application merge them, for a cart by taking the union.",
      distractors: [
        "",
        "The sums are equal here, and counting events does not decide ordering. Entry-by-entry comparison does.",
        "Node names carry no meaning about time, so this would drop a write arbitrarily.",
        "Rejecting a concurrent write would make the store refuse writes, which Dynamo is designed not to do.",
      ],
    },
    {
      q: "Replica C of a key range is down for an hour. A store with sloppy quorum and hinted handoff receives a write. What happens?",
      options: [
        "The write is refused, because the preference list cannot all be reached",
        "It goes to the next healthy node with a hint, and is handed to C on return",
        "It is held in the client until C returns, then sent again",
        "It is written to A and B only and C is repaired on its next restart",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A sloppy quorum uses the first N healthy nodes, not strictly the preference list. The stand-in stores the value with a hint naming C and delivers it when C is back, which keeps writes available.",
      distractors: [
        "A strict quorum would behave this way when too few of the three are reachable. Dynamo is designed to stay writable.",
        "",
        "Holding writes in clients loses them if the client dies, and shifts the problem to the client.",
        "Without a stand-in storing the hint, nothing would remind the cluster to repair C promptly.",
      ],
    },
    {
      q: "A cluster has 150 nodes and needs a failed replica's data checked against a peer. Each range holds about 1 million keys. How does Merkle comparison help?",
      options: [
        "Both replicas send every key and value, and the receiver diffs them",
        "Both send a sorted list of key names and diff the lists",
        "Each sends one hash per key, and the receiver compares one million hashes",
        "They compare root hashes, and descend only into subtrees that differ",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A Merkle tree hashes leaves up to one root. Equal roots mean equal data. Otherwise the replicas descend into differing children, so about 20 levels reach a single differing key among a million.",
      distractors: [
        "Sending everything works but moves terabytes to find a few differences.",
        "Key names alone cannot reveal that a value differs, and the list is still a million entries.",
        "Hashes per key are smaller than values, but a million hashes is still far more than the 20 steps a tree needs.",
        "",
      ],
    },
    {
      q: "A shopping-cart service on a festival sale uses last-write-wins. A user adds a phone on mobile and a charger on a laptop at nearly the same time. What can happen?",
      options: [
        "Both items are kept, because the store merges carts by union",
        "One item can silently disappear, because the later timestamp wins",
        "The store refuses the second write and shows an error to the user",
        "Both items are kept, because the two writes go to different replicas",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Last-write-wins keeps one version and drops the other. The cart ends up with one item, and clock differences between the two machines can even choose the older one.",
      distractors: [
        "Merging by union is what a vector-clock store with application merge does. Last-write-wins has no merge step.",
        "",
        "Last-write-wins accepts both writes and decides later. Refusing is a different design.",
        "Different replicas do not stop a later conflict resolution from discarding one version.",
      ],
    },
    {
      q: "A team wants to store account balances in a leaderless store with R=1, W=1 for speed. What is the sound judgement?",
      options: [
        "Fine, because a short window of stale reads is normal for every database",
        "Fine, as long as vector clocks are turned on for the balance keys",
        "Wrong tool: balances need one order of updates, so use a single leader or consensus",
        "Fine, if W is raised to 3 so that every replica acknowledges each write",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Concurrent updates to a balance cannot be merged after the fact without risking double spending. The data needs a single order of changes, which a single leader or a consensus group provides.",
      distractors: [
        "Staleness is tolerable for a cart, but a stale balance allows an overdraft.",
        "Vector clocks would detect the conflict but leave the application to invent a safe merge for money.",
        "",
        "W=3 does not give a single order, and it makes writes fail when any replica is down.",
      ],
    },
    {
      q: "During a network split, a team must choose a store for a session service. Users must always be able to log in, and a brief repeat login prompt after the split is acceptable. Which fits?",
      options: [
        "A leaderless store with W=2 that keeps accepting writes on both sides and repairs later",
        "A consensus store that stops accepting writes on the side that lost its majority",
        "A single primary database in one zone, with no replicas at all",
        "A store that refuses all reads until the split heals, to avoid stale data",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Sessions can tolerate a rare duplicate or stale value and cannot tolerate being unavailable. A leaderless store stays writable on both sides of the split and reconciles afterwards.",
      distractors: [
        "",
        "That blocks logins on the minority side, which is the outcome this service most wants to avoid.",
        "A single zone is a single point of failure and gives no availability during that zone's loss.",
        "Refusing reads turns a stale-data risk, which is acceptable here, into an outage.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-key-value-store-small-platform",
      scenario:
        "A one-person trading platform keeps about 5 GB of key-value data (sessions, cached lookups, small settings) and serves a few hundred operations a second. It runs on one server with one MySQL and one Redis, and nightly backups exist. The founder wonders whether to build or adopt a Dynamo-style cluster 'to be ready'. What should happen?",
      options: [
        {
          label: "Stay on the single MySQL and Redis, add a replica and tested backups when needed, and revisit when data or load outgrows one machine",
          appeal:
            "Cheapest to run and understand, and far inside what one machine handles.",
        },
        {
          label: "Run a five-node Cassandra cluster across zones with quorum reads and writes",
          appeal:
            "No single point of failure and room to grow without redesign.",
        },
        {
          label: "Build a custom Dynamo-style store with vector clocks so the design is ready for scale",
          appeal:
            "Full control and the most flexible conflict handling.",
        },
        {
          label: "Move all data to a consensus store with five replicas",
          appeal:
            "Strong consistency for every key with automatic leader election.",
        },
      ],
      best: 0,
      verdict:
        "5 GB and a few hundred operations a second use a tiny fraction of one server, and there is one daily user. A cluster multiplies the things to run, monitor and repair for a problem that does not exist. Replicas and tested backups buy the availability that matters here at a small fraction of the effort.",
      claims: [
        {
          text: "You accept a single machine as the point of failure, and cover it with backups and a quick restore plan.",
          axis: "trade",
          correct: true,
          note: "True. For one user and 5 GB, a fast restore is a sound answer.",
        },
        {
          text: "You avoid operating gossip, repair and conflict merging, which are real ongoing work.",
          axis: "trade",
          correct: true,
          note: "True. The cost of a distributed store is largely operations, not code.",
        },
        {
          text: "You give up the ability to ever scale beyond one machine.",
          axis: "trade",
          correct: false,
          note: "Not so. A replica, a bigger machine or a managed store can be added when measurements call for it.",
        },
        {
          text: "A disk or machine loss stops the platform until restore, so restore must be tested, not assumed.",
          axis: "failure",
          correct: true,
          note: "True. An untested backup is the real single point of failure.",
        },
        {
          text: "Without a cluster, a network split can corrupt data with conflicting writes.",
          axis: "failure",
          correct: false,
          note: "One writer has no conflicting copies. Split-related conflicts come from multiple writable replicas.",
        },
        {
          text: "Watch disk use, memory use and operation latency, and decide on growth from their trend.",
          axis: "measure",
          correct: true,
          note: "True. Trends say when one machine stops being enough.",
        },
        {
          text: "The number of nodes in the cluster measures how scalable the design is.",
          axis: "measure",
          correct: false,
          note: "Node count measures cost. Scalability is shown by headroom against measured load.",
        },
      ],
    },
    {
      id: "sd-design-key-value-store-festival-carts",
      scenario:
        "An Indian e-commerce site runs a festival sale. 20 million shoppers, up to 300,000 cart operations a second at peak, and a cart must accept 'add item' even if one availability zone is cut off. Shoppers often edit the same cart from the app and a browser tab. Forty engineers run the platform. Which store design fits?",
      options: [
        {
          label: "One large primary SQL database with read replicas",
          appeal:
            "Familiar, strongly consistent, and simple to query.",
        },
        {
          label: "A consensus-replicated store that requires a majority of zones for every write",
          appeal:
            "No conflicting versions and a single order of updates.",
        },
        {
          label: "A leaderless store with N=3 across zones, W=2, R=2, sloppy quorum, and carts merged by union",
          appeal:
            "Stays writable through a zone loss, scales by adding nodes, and loses no item added from two devices.",
        },
        {
          label: "A leaderless store with R=1, W=1 and last-write-wins timestamps",
          appeal:
            "The fastest possible reads and writes with the least coordination.",
        },
      ],
      best: 2,
      verdict:
        "The deciding constraints are write availability through a zone loss, 300,000 operations a second and edits from two devices. A cart can be merged by union, so conflicts are cheap to resolve. Last-write-wins would drop an item added on one device, and a single primary or a strict majority refuses writes in the wrong place.",
      claims: [
        {
          text: "You accept that a cart can briefly show different contents on two replicas, in return for staying writable.",
          axis: "trade",
          correct: true,
          note: "True. Repair and merge fix the difference afterwards.",
        },
        {
          text: "You write merge code for carts, and must decide what happens to a removed item that reappears after a merge.",
          axis: "trade",
          correct: true,
          note: "True. Union merges are simple but can resurrect deleted items unless removals are recorded.",
        },
        {
          text: "R=1 and W=1 gives the same safety as R=2 and W=2 at lower cost.",
          axis: "trade",
          correct: false,
          note: "With 1 plus 1 not greater than 3, reads need not overlap writes, so safety is weaker.",
        },
        {
          text: "While a zone is cut off, writes still succeed on the healthy side, and hints are delivered after it returns.",
          axis: "failure",
          correct: true,
          note: "True. That is what sloppy quorum and hinted handoff are for.",
        },
        {
          text: "A single hot cart, such as one shared by a bot, is spread across all 150 nodes by hashing.",
          axis: "failure",
          correct: false,
          note: "Hashing spreads keys, not traffic. One hot key stays on its three replicas.",
        },
        {
          text: "Track the 99th percentile latency per operation, the number of sibling versions per read and the hint backlog.",
          axis: "measure",
          correct: true,
          note: "True. Siblings show conflict rate and the hint backlog shows how far repair is behind.",
        },
        {
          text: "Average read latency across the whole sale is enough to prove the design works.",
          axis: "measure",
          correct: false,
          note: "Averages hide the slowest requests, which are the ones shoppers abandon on.",
        },
      ],
    },
    {
      id: "sd-design-key-value-store-order-state",
      scenario:
        "A broker keeps the status of each order (open, partly filled, complete, rejected) in a key-value store. About 2 million orders a day arrive, mostly in the 09:15 to 15:30 window. Two services update the same order, and a stale read could cause a duplicate order or a wrong position. Wrong data costs real money, and a short pause on writes during a failover is acceptable. Which design fits?",
      options: [
        {
          label: "A leaderless store with R=1, W=1 for lowest latency",
          appeal:
            "Fastest, and it never refuses a write.",
        },
        {
          label: "A single leader with a synchronous replica, or a consensus group per partition, so updates have one order and reads see the latest write",
          appeal:
            "Concurrent updates are ordered, and a pause during failover is traded for correctness.",
        },
        {
          label: "A leaderless store with last-write-wins timestamps from each service's clock",
          appeal:
            "Simple conflict handling with no merge code.",
        },
        {
          label: "A leaderless store with vector clocks, returning siblings to the services to merge",
          appeal:
            "No update is ever lost, and conflicts are visible.",
        },
      ],
      best: 1,
      verdict:
        "The data is a state that must move in one order, and a stale read costs money. 2 million a day is under 100 writes a second on average, so a single leader or a consensus group has ample capacity. The accepted cost, a brief pause during failover, was stated as acceptable. Merging order states after the fact has no safe rule.",
      claims: [
        {
          text: "You accept a brief write pause during leader failover, in return for one order of updates.",
          axis: "trade",
          correct: true,
          note: "True, and the scenario says a short pause is acceptable.",
        },
        {
          text: "You give up always-writable behaviour on the minority side of a network split.",
          axis: "trade",
          correct: true,
          note: "True. That is the price of strong consistency.",
        },
        {
          text: "You give up the ability to handle 2 million orders a day.",
          axis: "trade",
          correct: false,
          note: "That is a modest rate. A single leader handles it comfortably.",
        },
        {
          text: "With last-write-wins, a late 'open' update with a faster clock could overwrite a 'complete' status.",
          axis: "failure",
          correct: true,
          note: "True. Clock skew can resurrect a stale state, which here could cause a duplicate order.",
        },
        {
          text: "Vector clocks would let the services merge a complete order and an open order safely.",
          axis: "failure",
          correct: false,
          note: "Vector clocks only show that a conflict exists. They give no safe rule for merging order states.",
        },
        {
          text: "Measure the failover time, the replication lag, and any read that returned a status older than a write that was acknowledged.",
          axis: "measure",
          correct: true,
          note: "True. The last one tests the guarantee directly.",
        },
        {
          text: "The count of keys per node is the best measure of correctness.",
          axis: "measure",
          correct: false,
          note: "Key balance measures load spread, not whether reads see acknowledged writes.",
        },
      ],
    },
  ],
};

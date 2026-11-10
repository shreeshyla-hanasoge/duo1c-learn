import type { Topic } from "../../types.ts";

export const sdConsensus: Topic = {
  id: "sd-consensus",
  title: "Consensus and Raft",
  tier: 4,
  week: 7,
  depth: "deep",
  summary:
    "How several machines agree on one answer even when some crash: terms, elections, majority commit, and why clusters have 3 or 5 nodes.",
  why: "Every time a system promises that two copies will never disagree about who the leader is, or what the last committed write was, consensus is underneath. etcd, ZooKeeper, Kafka's controller and most distributed databases depend on it. You need to know what it guarantees, what it costs in latency and machines, and when a simpler single primary is the better answer. Traed has no consensus group, and this lesson explains why that is a deliberate size choice.",
  algorithms: [
    {
      name: "Raft",
      role: "Elects one leader per term and replicates a log that is committed once a majority holds it.",
    },
    {
      name: "Majority quorum",
      role: "Any two majorities of the same cluster share at least one node, which is what stops two leaders both committing.",
    },
    {
      name: "Randomised election timeout",
      role: "Spreads out the moment each follower decides the leader is gone, so one candidate usually wins before another starts.",
    },
  ],
  learn: {
    intuition:
      "Five friends must agree on one restaurant by message only, and any of them may lose their phone battery at any moment. A fixed rule helps. Whoever proposes needs a yes from at least three of the five. Because any two groups of three overlap in at least one person, two different restaurants can never both collect enough yeses, since the shared friend would have had to say yes twice and she only answers once per round. If two people propose at the same time and split the votes, nobody wins that round, so everyone waits a random short time and tries again. Once three people have said yes, the choice is final, even if the proposer then vanishes, because those three will remember it. That is consensus: a group reaches one decision that survives some members failing, and it never reaches two. The price is that a decision needs a majority to be reachable at all.",
    mechanics: [
      {
        heading: "What consensus guarantees",
        body: "Consensus lets a group of machines agree on a value, or more usefully on an ordered log of values, while some of them crash. It promises agreement (no two nodes decide differently), validity (the decided value was proposed by someone) and, while a majority is alive and can talk, progress. A famous result called FLP says no algorithm can promise progress in a fully asynchronous network with even one crash, so real systems use timeouts and give up progress, never agreement, when the network misbehaves. Applying the same ordered log on every node gives a replicated state machine: identical inputs in identical order produce identical state on all copies.",
      },
      {
        heading: "Raft: leader election with terms",
        body: "Raft splits time into numbered terms. Each follower waits for a heartbeat from the leader; if none arrives within its election timeout, chosen at random between about 150 and 300 milliseconds in the Raft paper, it adds one to the term, votes for itself and asks the others for votes. A node grants one vote per term, so in a five-node cluster a candidate needs three votes. If two candidates split the votes, no one wins, the timeouts expire at different moments because they are random, and a new term begins. A node that sees a higher term always steps down to follower, which is how an old leader is demoted after a partition heals.",
      },
      {
        heading: "Log replication and commit by majority",
        body: "Clients send writes to the leader, which appends them to its log and sends them to followers with an AppendEntries message. An entry is committed once it is stored on a majority. With five nodes that is the leader plus two followers, so the leader waits for two replies, not four, and one slow node never holds up the cluster. A voter also refuses a candidate whose log is less up to date than its own. Together these rules mean any new leader already holds every committed entry, because the majority that stored it and the majority that elected the leader overlap in at least one node.",
      },
      {
        heading: "Why 3 or 5 nodes, and where it runs",
        body: "A cluster of n nodes needs floor(n/2)+1 for a majority, so it tolerates floor((n-1)/2) failures. Three nodes tolerate one, five tolerate two, seven tolerate three. Four nodes still need three for a majority, so they tolerate only one failure, the same as three, while costing an extra machine and an extra reply on every write. That is why clusters are odd. Larger is not better: every write waits for a majority round trip, so seven nodes across distant sites are slow. Raft runs in etcd, which stores Kubernetes state, in Consul, in the controller of newer Kafka versions, and per data range in CockroachDB. Paxos, the older protocol, is named here only.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no consensus group, and honestly does not need one. The live and paper engine is a single process on one server, so there is never a second candidate for leader, and its durable records sit in one MySQL. The cost is a single point of failure: if that server dies, trading stops until it is restored. Consensus would become relevant if we ran a hot standby engine that must take over automatically with exactly one winner. Even then, the sensible step is to use a managed database failover or a small etcd cluster, not to write Raft ourselves.",
      },
    ],
    complexityDerivation:
      "The central argument is about overlap. Two majorities of the same cluster must share a node. If a leader committed an entry on one majority, and a later leader was elected by another majority, the shared node holds the entry and will refuse a candidate whose log lacks it. So a committed entry cannot be lost or overwritten, and two leaders in the same term cannot both exist, since each node votes once per term. That is the invariant: at most one leader per term, and every committed entry present in every future leader's log. The cost is that every write needs a round trip to a majority, so latency is set by the slowest member of the fastest majority. The argument stops holding in several places. If more than a minority of nodes fail, the cluster halts rather than risk disagreement, so it trades availability for safety. If nodes can lie or be hacked, Raft is no longer safe and a Byzantine protocol is needed. If disks lie about having flushed data, a promised vote can be forgotten after a restart, and the guarantees break.",
    variants: [
      {
        name: "Raft",
        when: "You want a consensus protocol your team can read, implement and debug. The default in etcd, Consul and many new databases.",
        delta:
          "One strong leader, terms, randomised timeouts, and a log with a simple majority commit rule. Designed to be understood, with membership changes defined in the protocol.",
      },
      {
        name: "Paxos and Multi-Paxos",
        when: "The older family behind Google's Chubby and Spanner, and many internal systems.",
        delta:
          "Same safety idea, majority quorums, but the original description is harder to turn into a full replicated log. Practical systems add a stable leader, which makes them resemble Raft.",
      },
      {
        name: "Byzantine fault tolerance (PBFT, blockchain consensus)",
        when: "Nodes may be malicious or buggy, not just crashed, for example between competing organisations.",
        delta:
          "Needs 3f+1 nodes to tolerate f liars and several message rounds per decision. Far more expensive, so it is not used inside one company's data centre.",
      },
    ],
    tradeoffs: [
      {
        vs: "Consensus cluster versus a single primary with an asynchronous replica",
        pick: "Single primary when losing the last seconds of writes is acceptable",
        because:
          "An asynchronous replica is cheaper and faster, but a failover can lose acknowledged writes. A consensus cluster commits only what a majority holds, so failover loses nothing, at the price of an extra round trip per write and at least three machines.",
      },
      {
        vs: "Three nodes versus five nodes",
        pick: "Three unless two simultaneous failures must be survived",
        because:
          "Five tolerate two failures but add latency and cost, and a rolling upgrade on a three-node cluster leaves no spare. Pick five when losing a machine for maintenance while another fails is a real scenario.",
      },
      {
        vs: "Reading from the leader versus reading from any follower",
        pick: "The leader for reads that must see the latest write",
        because:
          "A follower can be behind or, after a partition, be talking to a leader that is already deposed. Leader reads, confirmed by a heartbeat round, are current. Follower reads are faster and spread load but may be stale.",
      },
    ],
  },
  realWorld: [
    {
      system: "etcd and Kubernetes",
      kind: "industry",
      problem:
        "A cluster manager needs one agreed record of what should be running, even when one control-plane machine dies.",
      applied:
        "Kubernetes stores all its cluster state in etcd, a key-value store that uses Raft. The documentation recommends an odd number of members, with three and five the common sizes, and says a cluster of n members tolerates the loss of a minority.",
      evidence: "etcd documentation: FAQ on cluster size and failure tolerance; Kubernetes documentation on etcd",
      impact:
        "The control plane keeps working with one of three members down, and a write is acknowledged only once a majority has it.",
    },
    {
      system: "Google Chubby and Spanner",
      kind: "industry",
      problem:
        "Google needed a lock and naming service, and a globally distributed database, whose replicas never disagree about the committed order.",
      applied:
        "Chubby replicates its small database across five replicas using Paxos. Spanner runs a Paxos group for each data split, with a leader that handles writes for that split.",
      evidence: "Burrows, The Chubby lock service for loosely-coupled distributed systems (OSDI 2006); Corbett et al., Spanner (OSDI 2012)",
      impact:
        "Consensus is applied to small, critical state, and large data is split into many independent groups rather than one huge one.",
    },
    {
      system: "Apache Kafka: ZooKeeper to KRaft",
      kind: "industry",
      problem:
        "Kafka's cluster metadata, including which broker leads each partition, was kept in a separate ZooKeeper cluster, which meant operating two systems.",
      applied:
        "Newer Kafka versions replace ZooKeeper with KRaft, where a small group of controller nodes runs a Raft-style protocol to agree on metadata. The data path for messages does not go through it.",
      evidence: "Apache Kafka KIP-500 and the KRaft documentation",
      impact:
        "One system to run instead of two, and consensus stays on the small, rarely changing metadata rather than on every message.",
    },
    {
      system: "CockroachDB range replication",
      kind: "industry",
      problem:
        "A SQL database spread over many machines must survive node loss without losing committed transactions.",
      applied:
        "CockroachDB splits data into ranges and keeps each range on three or more replicas that agree through Raft. Each range has its own leader, so writes to different ranges proceed in parallel.",
      evidence: "CockroachDB architecture documentation: replication layer",
      impact:
        "Losing one node leaves every range with a majority, so reads and writes continue; throughput scales by adding ranges, not by adding voters to one group.",
    },
  ],
  insights: [
    {
      t: "Majorities overlap",
      d: "Any two majorities share a node. That one fact is why there is never a second leader in a term and why committed entries survive elections.",
    },
    {
      t: "Odd sizes only",
      d: "Three nodes survive one failure, five survive two, four survive one. The extra even node adds cost and no safety.",
    },
    {
      t: "Safety over progress",
      d: "Without a majority the cluster stops. It will not guess, because two answers would be worse than no answer.",
    },
    {
      t: "Keep it for small, critical data",
      d: "Use consensus for leader identity, locks and configuration. Do not route high-volume data such as ticks through it.",
    },
  ],
  pitfalls: [
    "Running two nodes, or four, and expecting extra safety. Two nodes need both to agree, so losing either stops the cluster, which is worse than one node.",
    "Placing most voters in one zone or rack. If that zone fails, the surviving minority cannot elect a leader, whatever the node count.",
    "Writing your own consensus code. The protocol is short on paper, but subtle bugs around disk flushes and membership changes have broken mature implementations.",
  ],
  quiz: [
    {
      q: "In Raft, what must a candidate collect to become leader of a term?",
      options: [
        "Votes from every other node in the cluster",
        "Votes from a majority of all nodes in the cluster",
        "The vote of the node with the longest uptime",
        "A vote from whichever node led the previous term",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A majority is enough, and because any two majorities overlap and each node votes once per term, only one candidate can win a given term.",
      distractors: [
        "Requiring everyone would let one dead node block every election. A majority tolerates failures.",
        "",
        "Uptime plays no part in voting. Votes depend on the term and on how up to date the candidate's log is.",
        "The previous leader may be the very node that failed, and its single vote cannot make a majority anyway.",
      ],
    },
    {
      q: "Why do consensus clusters normally use an odd number of nodes, such as 3 or 5?",
      options: [
        "Odd numbers let the nodes split into two equal halves",
        "Odd numbers are required for the random timeouts to work",
        "Odd-sized clusters write to disk faster than even-sized ones",
        "A cluster of 4 tolerates no more failures than a cluster of 3",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A majority of 4 is 3, so a cluster of 4 survives exactly one failure, the same as a cluster of 3. The extra node costs money and latency and adds no tolerance.",
      distractors: [
        "An equal split is exactly the bad case: neither half has a majority, so the cluster stalls.",
        "Timeouts are random whatever the size. They have no link to odd or even counts.",
        "Disk speed does not depend on whether the node count is odd.",
        "",
      ],
    },
    {
      q: "A five-node etcd cluster loses its leader, and two other nodes are also down. Three nodes remain connected. What happens?",
      options: [
        "The three survivors can elect a new leader and keep serving writes",
        "The cluster halts until at least four of the five nodes are back",
        "The cluster keeps serving reads only, because writes need all five",
        "Each survivor leads on its own, and the logs are merged later",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Three out of five is a majority. One of the survivors times out, wins three votes and leads, so both reads and writes continue.",
      distractors: [
        "",
        "Four is not needed. The rule is a majority of the full size, which is three of five.",
        "Writes need a majority, not every node. The quorum of three can commit them.",
        "Letting several nodes lead independently is the split-brain that consensus exists to prevent.",
      ],
    },
    {
      q: "In a three-node cluster the leader stores an entry on itself and one follower, then crashes before telling the client it is committed. What is true of that entry?",
      options: [
        "It is lost, because the client never received a confirmation",
        "It is dropped, because only the old leader knew it was committed",
        "It is on a majority, so any new leader will hold it and it survives",
        "It stays pending until the old leader returns to confirm it",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Two of three nodes hold it, which is a majority. A candidate without it cannot win a majority, so the new leader has it and will commit it. The client may need to retry safely if it saw no reply.",
      distractors: [
        "The entry is stored even though the client was not told. The client's missing reply is a separate problem.",
        "Commitment is defined by the stored majority, not by the old leader's memory.",
        "",
        "Waiting for the old leader would stall the cluster. A new leader finishes the job.",
      ],
    },
    {
      q: "A three-node cluster in a data centre in Mumbai is split by a switch fault into two nodes on one side and one node on the other. The lone node was the leader and a client writes to it. What happens?",
      options: [
        "The write commits on the lone node and is merged afterwards",
        "The write is rejected on both sides until the switch is repaired",
        "The write commits on the lone node and is then discarded silently",
        "The write cannot commit there, and the two-node side elects a new leader",
      ],
      answer: 3,
      difficulty: "apply",
      why: "One node is not a majority, so the old leader cannot commit. The pair can reach two of three, elect a leader in a higher term and carry on. When the switch heals, the old leader sees the higher term and steps down.",
      distractors: [
        "Committing on a minority is exactly what consensus forbids, since the majority side may commit something else.",
        "The majority side keeps working, so rejection on both sides would waste available capacity.",
        "A silent discard after an acknowledged commit would be data loss. The old leader never acknowledges it.",
        "",
      ],
    },
    {
      q: "A cluster of five nodes has every election timeout fixed at exactly 200 milliseconds. After a leader crash, elections keep failing. Why, and what is the usual fix?",
      options: [
        "Followers need longer than 200 ms to count votes, so raise the timeout",
        "All followers become candidates at once and split the votes, so randomise the timeouts",
        "The fixed value makes nodes vote twice in a term, so lower it",
        "Fixed timeouts stop heartbeats from arriving, so add more nodes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "With identical timeouts every follower times out together, each votes for itself, and no one reaches a majority. Random timeouts let one candidate start first and win before the others begin.",
      distractors: [
        "Counting votes is quick. The problem is simultaneous candidacy, not counting time.",
        "",
        "A node votes once per term whatever the timeout. Lowering it would not change that.",
        "Heartbeats are sent by the leader and are unaffected. More nodes would not fix a simultaneous start.",
      ],
    },
    {
      q: "A small team runs four servers and wants a configuration store that survives one server dying. One engineer proposes writing a custom Raft implementation. What is the better judgement?",
      options: [
        "Agree, because a custom version can be tuned to the team's needs",
        "Agree, provided it is tested with a few crash scenarios",
        "Use an existing store such as etcd or Consul on three of the servers",
        "Skip consensus and keep the configuration in a single file on one",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Consensus code fails in rare interleavings that a few tests do not find. A proven store gives the same guarantee, and three of the four servers already tolerate one failure.",
      distractors: [
        "Tuning is a small gain against the risk of subtle bugs in the hardest part of the system.",
        "A few scenarios will not cover disk-flush, membership and partition combinations that broke mature code.",
        "",
        "A single file on one server does not survive that server dying, which was the requirement.",
      ],
    },
    {
      q: "An architect suggests passing every market tick through a five-node Raft group so that all consumers see ticks in one agreed order. What is the sound judgement?",
      options: [
        "Not suitable; each write waits for a majority, so keep the group for small critical state",
        "Suitable, since an agreed order for ticks is a strong correctness gain",
        "Suitable, if the group is grown to nine nodes for extra throughput",
        "Not suitable, since Raft cannot store ordered data of any kind",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Every committed write costs a majority round trip, and the leader is a single path. Tick volume is huge and one source already orders it. Use consensus for leader identity and configuration.",
      distractors: [
        "",
        "The ordering gain is small because the feed already arrives in order, and the cost is paid on every tick.",
        "More voters make each write wait on more machines and do not add throughput.",
        "Ordered logs are what Raft stores. The objection is cost, not capability.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-consensus-standby-engine",
      scenario:
        "A trading platform has one engine process on one server and one user. Minute-bar strategies trade during six hours and a quarter of an hour of market time. Positions and risk counters are saved in the database, and the engine already restarts at every deployment and rebuilds its state from that database in under a minute. The founder is considering a second standby engine on another server with automatic leader election through a three-node coordination cluster. Which approach fits?",
      options: [
        {
          label: "Keep one engine, rebuild from the database on restart, and alert when it is down",
          appeal:
            "No new moving parts. The restart path is already exercised at every deployment, so recovery is proven, not theoretical.",
        },
        {
          label: "Add a three-node etcd cluster and a standby engine with automatic election",
          appeal:
            "Failover without a human, and the right shape if downtime were unacceptable.",
        },
        {
          label: "Run two engines active at once and let the broker reject duplicates",
          appeal:
            "No election needed and failover is instant, because both are already trading.",
        },
        {
          label: "Write a small custom election using the engines' system clocks",
          appeal:
            "Cheap and no extra servers, since each engine only compares timestamps.",
        },
      ],
      best: 0,
      verdict:
        "With minute bars, one user and a proven under-a-minute restart, an outage costs minutes, not a missed millisecond edge. A coordination cluster adds three machines to maintain and creates new ways to fail, such as a partition leaving no engine in charge. Two active engines would double-place orders, and clock-based election is unsafe because clocks drift and pause.",
      claims: [
        {
          text: "You accept that if the server dies, trading is down until you restore it, in return for fewer moving parts.",
          axis: "trade",
          correct: true,
          note: "True. This is the honest price of a single process, and at this scale it is cheaper than running a cluster.",
        },
        {
          text: "A three-node cluster is cheap, so the main cost of adding it is the three small servers.",
          axis: "trade",
          correct: false,
          note: "The larger cost is operating it: upgrades, backups, monitoring and a fresh class of failures.",
        },
        {
          text: "If the single server fails during market hours, open positions are unmanaged until it is back.",
          axis: "failure",
          correct: true,
          note: "True, and it is why broker-side protective orders and a quick alert matter more than a standby.",
        },
        {
          text: "Automatic failover removes all risk of two engines placing the same order.",
          axis: "failure",
          correct: false,
          note: "A deposed leader that is paused or partitioned can wake and keep trading unless every order path checks a fencing token.",
        },
        {
          text: "Measure the time from engine failure to the first evaluated bar after restart, and the alert delay.",
          axis: "measure",
          correct: true,
          note: "True. Recovery time and detection time together are the downtime you actually accept.",
        },
        {
          text: "The number of coordination-cluster nodes online is the main health signal.",
          axis: "measure",
          correct: false,
          note: "The cluster does not exist in the chosen design. The user-visible measure is time to recover.",
        },
      ],
    },
    {
      id: "sd-consensus-payment-switch-quorum",
      scenario:
        "A UPI-style payment switch stores routing rules and shard leadership in a coordination cluster across three availability zones in the same city, with link delay of a few milliseconds. The service must keep accepting writes to this store if any two nodes are unavailable at once, for example one machine under upgrade and one failed. Writes are rare, a few per second at most. How many voting nodes should the cluster have?",
      options: [
        {
          label: "Three nodes, one per zone",
          appeal:
            "Lowest cost and latency, and one per zone survives a whole zone loss.",
        },
        {
          label: "Four nodes, two zones with two each",
          appeal:
            "More copies than three, so it feels safer against a failure.",
        },
        {
          label: "Five nodes spread over three zones as 2, 2 and 1",
          appeal:
            "Tolerates any two unavailable nodes, with a majority of three still reachable.",
        },
        {
          label: "Nine nodes spread over three zones",
          appeal:
            "Tolerates four failures, which sounds like the most resilient design.",
        },
      ],
      best: 2,
      verdict:
        "The stated requirement is that any two nodes may be down together. Three nodes tolerate one, and four also tolerate only one because its majority is three. Five tolerate two. Nine is more than the requirement needs and slows every write by waiting for five replies, while the write rate is low so the extra cost buys little.",
      claims: [
        {
          text: "You accept that each write waits for three replies out of five, so write latency is a little higher than for three nodes.",
          axis: "trade",
          correct: true,
          note: "True. A majority of five is three, and at a few milliseconds of link delay and rare writes this is a small cost.",
        },
        {
          text: "Four nodes would give you the tolerance of five at a lower price.",
          axis: "trade",
          correct: false,
          note: "A majority of four is three, so four tolerates one failure, no more than three nodes do.",
        },
        {
          text: "Writes to the store still succeed with two nodes lost, but a third failure halts them.",
          axis: "failure",
          correct: true,
          note: "True. Three of five remain, which is exactly a majority, and one more loss leaves two, which is not.",
        },
        {
          text: "If a whole two-node zone fails, writes continue, but one further node failure then halts them.",
          axis: "failure",
          correct: true,
          note: "True. Placement matters: after a two-node zone fails, the remaining three nodes are the whole majority and cannot lose another.",
        },
        {
          text: "Because the cluster is spread over zones, a network cut between zones cannot stop it.",
          axis: "failure",
          correct: false,
          note: "A cut can strand the zone that has too few nodes. If the side with a majority is unreachable by clients, the service still suffers.",
        },
        {
          text: "Track commit latency at the 99th percentile and the number of leader changes per day.",
          axis: "measure",
          correct: true,
          note: "True. Slow majority round trips and frequent elections both show up there, long before outright failure.",
        },
        {
          text: "Count how many nodes answer a ping, since a ping proves the node can commit writes.",
          axis: "measure",
          correct: false,
          note: "A node can answer a ping and still be unable to reach a majority or be behind on its log.",
        },
      ],
    },
    {
      id: "sd-consensus-tatkal-booking",
      scenario:
        "A railway booking system opens Tatkal quota at 10:00, when hundreds of thousands of users arrive in the same minute. Seat inventory lives in a primary database in one city with an asynchronous replica in another. Management says that once a seat is confirmed to a customer and money is taken, losing that booking in a failover is not acceptable, even if failover takes a minute longer. Which replication design fits?",
      options: [
        {
          label: "Keep the asynchronous replica and promote it on failure",
          appeal:
            "Fastest commits and simplest operation, and failover is quick.",
        },
        {
          label: "Replicate inventory with a consensus protocol so a booking is confirmed only once a majority holds it",
          appeal:
            "A failover can lose no confirmed booking, because the new leader must hold every committed one.",
        },
        {
          label: "Add a larger cache in front so the primary sees fewer writes",
          appeal:
            "Reduces load at 10:00 and keeps the design the same.",
        },
        {
          label: "Take a database backup every five minutes",
          appeal:
            "Cheap and simple, and a recent backup bounds how much could be lost.",
        },
      ],
      best: 1,
      verdict:
        "The stated rule is zero loss of confirmed bookings, which an asynchronous replica cannot give because the last writes may not have arrived when the primary dies. Majority commit gives that guarantee, and the stated tolerance for a slower failover is what it costs. A cache does not make writes durable, and a five-minute backup can lose five minutes of bookings.",
      claims: [
        {
          text: "You accept an extra round trip to a majority on each booking write, and a pause while a new leader is elected after a failure.",
          axis: "trade",
          correct: true,
          note: "True. That is the price of zero loss, and management has said a slower failover is acceptable.",
        },
        {
          text: "You gain the ability to survive losing the primary site's database without losing any confirmed booking.",
          axis: "trade",
          correct: true,
          note: "True, provided the majority includes nodes outside the failed site, so placement across sites matters.",
        },
        {
          text: "Consensus makes the 10:00 surge cheaper, because agreement spreads the load.",
          axis: "trade",
          correct: false,
          note: "Agreement adds work to each write. The surge must be handled by queueing and sharding the inventory.",
        },
        {
          text: "With an asynchronous replica, a customer can be told a seat is confirmed and the booking vanish after a failover.",
          axis: "failure",
          correct: true,
          note: "True. The primary acknowledged before the replica received the write, so the promoted copy never saw it.",
        },
        {
          text: "If the majority of nodes sit in the failed city, the surviving nodes can still commit new bookings.",
          axis: "failure",
          correct: false,
          note: "The survivors are a minority and must halt. Placing a majority outside any single site is part of the design.",
        },
        {
          text: "Measure the number of confirmed bookings missing after a failover drill, and commit latency during the 10:00 surge.",
          axis: "measure",
          correct: true,
          note: "True. Zero lost bookings is the requirement, and latency shows whether the cost of consensus is bearable at peak.",
        },
        {
          text: "Database CPU averaged over the whole day shows whether the design meets the rule.",
          axis: "measure",
          correct: false,
          note: "A daily average hides the surge minute and says nothing about durability.",
        },
      ],
    },
  ],
};

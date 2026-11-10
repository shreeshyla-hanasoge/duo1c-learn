import type { Topic } from "../../types.ts";

export const sdCapQuorums: Topic = {
  id: "sd-cap-quorums",
  title: "CAP, PACELC and quorums",
  tier: 3,
  week: 6,
  depth: "deep",
  summary:
    "What CAP really says, why PACELC is the fuller rule, how linearizable differs from eventual, and how R + W > N quorums let you tune consistency per operation.",
  why: "As soon as data is copied to several machines, they can disagree, and a network cut forces a choice between answering and being right. CAP, PACELC and quorums are the vocabulary for that choice, and they decide how a payment system, a seat-booking site or a shopping cart behaves when something breaks. Most people quote CAP wrongly, as pick two of three. Knowing the real statement lets you reason about databases such as Cassandra, DynamoDB, Spanner and etcd, and explain why one platform does not need any of this yet.",
  learn: {
    intuition:
      "Two bank branches, one in Mumbai and one in Chennai, each keep a copy of your balance. Normally they phone each other after every change. One day the phone line is cut. A customer walks into Mumbai and withdraws money, and another customer, using your card, walks into Chennai and asks for the balance. The Chennai clerk has two choices. She can say the balance she has, which may be out of date, or she can say come back when the line works. The first keeps the branch open and risks a wrong answer. The second is always correct but turns people away. No clever trick gives both, while the line is cut. Even when the line works, waiting for the other branch's answer before every reply costs time. Choosing how long to wait, and how many branches must agree, is the whole subject.",
    mechanics: [
      {
        heading: "What CAP actually says",
        body: "Eric Brewer stated the idea in 2000, and Gilbert and Lynch proved it in 2002. When a network partition separates replicas, a system cannot be both consistent and available. Consistent here means linearizable, defined below. Available means every request to a working node gets a real answer. Partitions are not optional in a distributed system, because networks fail, so CAP is not pick two of three. It is: during a partition, pick consistency or availability. Take replicas in Mumbai and Chennai with the link cut. A write of `x = 5` lands in Mumbai. A read in Chennai must either return the old value or wait or fail.",
      },
      {
        heading: "Linearizable versus eventual",
        body: "Linearizable means the system behaves as if there were one copy and every operation took effect at one instant between its start and its end. Once any read returns the new value, no later read may return the old one. This needs coordination on each operation, which costs latency. Eventual consistency promises only that if writes stop, all replicas converge. In between, reads may be stale or out of order. There are useful middle levels. Read-your-writes lets you see your own update, and monotonic reads never go backwards for one client. A seat count wants the first. A like counter is happy with the second.",
      },
      {
        heading: "PACELC: the trade-off when nothing is broken",
        body: "Daniel Abadi pointed out in 2012 that CAP only describes the rare partition. His rule, PACELC, reads: if there is a Partition, choose Availability or Consistency; Else, when running normally, choose Latency or Consistency. The second half matters every day. Waiting for a replica in another city before replying adds a round trip, tens of milliseconds between distant cities, to every write. Dynamo and Cassandra by default lean to availability and low latency (PA/EL). Spanner and etcd lean to consistency in both halves (PC/EC). Both are sound choices for different data.",
      },
      {
        heading: "Quorums: R + W > N",
        body: "In a quorum system a value lives on N replicas. A write waits for W of them to acknowledge, and a read asks R and takes the newest version. If R + W > N, any read set and write set share at least one replica, so a read sees the latest acknowledged write. With N = 3, W = 2 and R = 2 give 4 > 3, so reads are fresh and one node may be down. W = 1 and R = 1 give 2, so a read can miss the write and return stale data, but both are fast. A sloppy quorum lets stand-in nodes accept a write when home replicas are unreachable, and hand it back later. It keeps writes available but breaks the overlap guarantee.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no replicas of its own to disagree, so CAP does not bite inside it. One MySQL and one Redis on one server are consistent by being single copies, and they are unavailable if that box is. The nearest example is DynamoDB, which the WebSocket bridge uses. The subscribe handler reads the connection record with `GetCommand` and no `ConsistentRead` flag, so DynamoDB's default eventually consistent read applies, and a missing record makes the handler ask the client to reconnect. The knob to reach for is strongly consistent reads. Quorum and CAP questions would arrive with a replicated database.",
      },
    ],
    complexityDerivation:
      "Why must a partition force a choice? Suppose a system were consistent and available during a cut between two replicas. A write goes to one side and is acknowledged, since the system is available. A later read goes to the other side, which has not heard of it. Being available it must reply, and the only reply it can give is the old value, which breaks linearizability. Waiting for the other side would break availability. The contradiction needs no assumption beyond a partition and a read after a write. The quorum rule has a counting form: a write touches W replicas, a read touches R, and the two sets must share a member whenever R plus W exceeds N, because there are only N places to put them. The argument stops holding in three places. R plus W greater than N alone does not give linearizability if concurrent writes, clock-based conflict rules or sloppy quorums let the sets drift. CAP says nothing about latency, which is why PACELC exists. And a single node has no partition to consider.",
    variants: [
      {
        name: "Leader-based majority (CP)",
        when: "Correctness beats uptime during a split, as for locks, configuration, account balances and leader election.",
        delta:
          "A write needs a majority of replicas, so the side holding fewer than half stops serving linearizable requests. etcd and ZooKeeper work this way, and Spanner is closer to it than to the opposite.",
      },
      {
        name: "Tunable quorums (Dynamo style)",
        when: "Different operations need different guarantees on one store, such as a cart write that must always succeed and a read that should be fresh.",
        delta:
          "R and W are set per request. Cassandra offers ONE, QUORUM and ALL levels. Choosing QUORUM on both sides gives overlap, while ONE on both gives speed and possible staleness.",
      },
      {
        name: "Sloppy quorum with hinted handoff",
        when: "Writes must never be refused, even while some home replicas are down.",
        delta:
          "A stand-in node takes the write with a hint and passes it on when the owner returns. Writes stay available, but a read quorum can miss the stand-in, so staleness is possible even when R plus W exceeds N.",
      },
    ],
    tradeoffs: [
      {
        vs: "Consistency versus availability during a partition",
        pick: "Consistency for money, stock and locks; availability for carts, feeds and counters",
        because:
          "A wrong balance or a double-sold seat is expensive and hard to undo. A cart that briefly shows an old item, or a like count a second behind, is harmless and can be repaired.",
      },
      {
        vs: "Latency versus consistency in normal running",
        pick: "Pay the round trip for data that must be right; skip it for data that can wait",
        because:
          "A synchronous write to a replica in the same city costs about a millisecond or two. One across the country costs tens of milliseconds on every write, which is a heavy price for data that did not need it.",
      },
      {
        vs: "Strict quorums versus sloppy quorums",
        pick: "Strict when staleness is costly; sloppy when refusing a write is costlier",
        because:
          "A strict quorum refuses writes when too few home replicas are reachable. A sloppy one accepts them, and the system repairs the difference later, which suits carts and logs.",
      },
    ],
  },
  algorithms: [
    {
      name: "Quorum read and write (R + W > N)",
      role: "Makes every read set overlap every write set, so at least one replica in a read holds the newest acknowledged value.",
    },
    {
      name: "Version comparison on read",
      role: "A read gathers R answers and returns the one with the highest version, such as a timestamp or counter, and can repair the stale replicas it saw.",
      dsa: "sorting",
    },
    {
      name: "Majority voting (Raft style)",
      role: "In consistency-first stores, a write commits only when more than half the replicas have it, so any two majorities share a member.",
    },
    {
      name: "Hinted handoff",
      role: "A stand-in node stores a write meant for an unreachable replica and delivers it when that replica returns.",
    },
  ],
  realWorld: [
    {
      system: "Amazon Dynamo",
      kind: "industry",
      problem:
        "A shopping cart must accept additions even while servers fail or the network splits, since a refused cart is lost revenue.",
      applied:
        "Dynamo replicates each item to N nodes and lets the application set R and W. It uses sloppy quorums with hinted handoff to keep writes available, and keeps conflicting versions for the application to merge. The paper describes its goal as an always-writable store.",
      evidence: "DeCandia et al., Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)",
      impact:
        "Writes survive node and network failures, and the price is that reads may see stale or divergent versions.",
    },
    {
      system: "Google Spanner",
      kind: "industry",
      problem:
        "Google needed a globally distributed database with transactions that behave as if there were a single copy.",
      applied:
        "Spanner replicates each data range across places with a Paxos-based majority, and uses TrueTime, clocks with a bounded error, to order transactions globally. Brewer later wrote that it is technically a CP system, yet very available in practice because Google runs its own private network and operates it carefully.",
      evidence: "Corbett et al., Spanner: Google's Globally Distributed Database (OSDI 2012); Brewer, Spanner, TrueTime and the CAP Theorem (2017)",
      impact:
        "Applications get strong consistency worldwide, and the cost is commit latency that includes coordination across places.",
    },
    {
      system: "Apache Cassandra consistency levels",
      kind: "industry",
      problem:
        "One cluster serves workloads that need very different guarantees, from logging to account data.",
      applied:
        "Cassandra lets each read and write pick a consistency level such as ONE, QUORUM, ALL or a local-datacentre quorum. A replication factor of 3 with QUORUM on both reads and writes gives R + W = 4 > 3, while ONE on both is faster and may return stale data.",
      evidence: "Apache Cassandra documentation: consistency levels and tunable consistency",
      impact:
        "Teams choose per operation how many replicas must agree, trading speed against freshness without changing the database.",
    },
    {
      system: "etcd and ZooKeeper",
      kind: "industry",
      problem:
        "Clusters such as Kubernetes need a small, strictly correct store for configuration, leader election and locks.",
      applied:
        "etcd uses Raft and ZooKeeper uses its own atomic broadcast. Both commit a write only when a majority of the 3 or 5 servers have it. If a partition leaves a server with the minority, it stops serving linearizable requests, which is consistency chosen over availability.",
      evidence: "etcd documentation: Raft and consistency; ZooKeeper programmer's guide",
      impact:
        "Everything built on top can trust that there is one agreed leader and one agreed value, at the price of refusing requests on the minority side.",
    },
  ],
  insights: [
    {
      t: "CAP is a choice during a partition",
      d: "Partitions are not optional, so the real question is whether a split makes you refuse requests or give possibly stale answers.",
    },
    {
      t: "PACELC covers the other 364 days",
      d: "Even when the network is fine, strong consistency costs a round trip to other replicas. Latency is the second trade.",
    },
    {
      t: "R + W > N is an overlap rule",
      d: "Read and write sets must share a replica. N = 3 with W = 2 and R = 2 is fresh and survives one node down.",
    },
    {
      t: "Choose per data, not per system",
      d: "Balances, stock and locks need consistency. Carts, feeds and counters can be late. One platform often needs both.",
    },
  ],
  pitfalls: [
    "Reading CAP as pick any two of three. Without partitions you have no choice to make, but a distributed system cannot rule partitions out.",
    "Confusing the C in CAP with the C in ACID. CAP means linearizable single-copy behaviour, while ACID's C means a transaction keeps the data's rules.",
    "Trusting R + W > N as a full guarantee. Concurrent writes, clock-based conflict rules and sloppy quorums can still return stale or lost data.",
  ],
  quiz: [
    {
      q: "In the CAP theorem, what does the C stand for?",
      options: [
        "Correctness, meaning the database never loses a row",
        "Cost, meaning how much hardware the replicas need",
        "Consistency in the ACID sense, meaning rules like foreign keys hold",
        "Linearizability, meaning reads act as if there were one up-to-date copy",
      ],
      answer: 3,
      difficulty: "recall",
      why: "CAP's consistency is linearizability: every read sees the latest completed write, as if there were one copy. It is different from ACID's consistency.",
      distractors: [
        "Durability is a separate property, and CAP does not define correctness this way.",
        "Cost is not one of the three properties.",
        "That is ACID's meaning. CAP uses a stronger, replica-related one.",
        "",
      ],
    },
    {
      q: "What does PACELC add to CAP?",
      options: [
        "A third choice during a partition, besides consistency and availability",
        "Even with no partition, a trade-off between latency and consistency",
        "A rule that availability always beats consistency in real systems",
        "A proof that only databases with three replicas can be consistent",
      ],
      answer: 1,
      difficulty: "recall",
      why: "PACELC says: if Partitioned choose A or C; Else, in normal operation, choose Latency or Consistency. Strong consistency costs round trips even when nothing is broken.",
      distractors: [
        "CAP's two-way choice during a partition is unchanged. PACELC adds the normal-running half.",
        "",
        "PACELC states no such ranking. Systems differ, and spanner-like ones lean to consistency.",
        "The number of replicas is not part of the theorem.",
      ],
    },
    {
      q: "Which setting guarantees that a read sees the latest acknowledged write?",
      options: [
        "N = 5, W = 3, R = 3, because 6 is greater than 5",
        "N = 5, W = 2, R = 3, because 5 reaches the replica count",
        "N = 3, W = 1, R = 1, because both operations are fast",
        "N = 3, W = 2, R = 1, because writes reach a majority",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The overlap rule needs R + W strictly greater than N. Only 3 + 3 = 6 is greater than 5.",
      distractors: [
        "",
        "2 + 3 = 5, which equals N, so a read set of 3 can miss a write set of 2.",
        "1 + 1 = 2 is far below 3, so a read can miss the write completely.",
        "2 + 1 = 3 equals N, so the read replica may be the one that missed the write.",
      ],
    },
    {
      q: "A store has N = 3, W = 2, R = 1. Can a client read a stale value?",
      options: [
        "No, because the write reached a majority of the replicas",
        "No, because the read is served by the coordinating node itself",
        "Yes, the single replica read may be the one that missed it",
        "Yes, but only if two replicas are down at once",
      ],
      answer: 2,
      difficulty: "apply",
      why: "2 + 1 = 3 is not greater than 3. The write is on two replicas, but a read of one replica can land on the third, which has the old value.",
      distractors: [
        "A write majority protects reads only when the reads also overlap with it.",
        "The coordinator is just a node and may also lack the latest write.",
        "",
        "No failures are needed. Staleness can occur with all three replicas up.",
      ],
    },
    {
      q: "A balance store has 3 replicas: two in Mumbai and one in Chennai. It needs a majority for each operation. The link between the cities is cut. What happens?",
      options: [
        "Both cities carry on, and the data is repaired once the link is back",
        "Mumbai carries on with 2 of 3, and Chennai gets errors until repair",
        "Chennai carries on, because its single copy is the most recent one",
        "Both cities stop, since neither side can reach all three replicas",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Mumbai still has a majority, 2 of 3, so it can serve consistent operations. Chennai holds only one replica, cannot reach a majority, and so refuses requests. That is consistency over availability.",
      distractors: [
        "That is the availability choice, which a majority rule does not make. It would allow conflicting writes.",
        "",
        "Chennai's replica is a minority of one, and having the newest copy cannot be known without the others.",
        "A majority needs 2 of 3, not all three, so Mumbai still has it.",
      ],
    },
    {
      q: "Writes use a sloppy quorum: N = 3 home replicas A, B, C, but A and B are down, so stand-in nodes D and E take the write and satisfy W = 2. A read with R = 2 goes to A, B, C after they recover. What can the read return?",
      options: [
        "The latest write, since 2 + 2 is greater than 3, as the rule says",
        "An error, since data from a sloppy quorum cannot be read by clients",
        "The latest write, since the stand-in nodes forward it to owners at once",
        "A stale value, as the write may still sit on D and E, not on the home set",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The overlap rule assumes the write set lies inside the N home replicas. A sloppy quorum puts it elsewhere until hinted handoff delivers it, so a read of the home replicas can miss it.",
      distractors: [
        "The arithmetic assumes the sets are within the same N replicas. Stand-in nodes break that.",
        "Reads are allowed. The problem is that they may not find the write.",
        "Handoff happens later, once the owners return and are reachable, not at once.",
        "",
      ],
    },
    {
      q: "A like counter on a video app is replicated to 5 nodes in 3 cities. Which setting is the sound judgement?",
      options: [
        "Strong consistency with W = 5 and R = 1, so every count is exact at all times",
        "A majority quorum for every like, so that no like is ever shown late to anyone",
        "Eventual, with W = 1 and R = 1, since a count a second late is harmless",
        "Two-phase commit across all five nodes for each single like that arrives",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Nothing is harmed if a like count lags by a second, and the app must stay fast and available. Paying cross-city round trips on each like buys exactness nobody needs.",
      distractors: [
        "W = 5 refuses writes when any node is down and adds the slowest city's delay to every like.",
        "A majority across cities costs latency for a value that does not need it.",
        "",
        "Two-phase commit is the heaviest coordination, and it blocks if a node fails.",
      ],
    },
    {
      q: "A team says: we chose CA, because we keep the network reliable so partitions will not happen. What is the sound judgement?",
      options: [
        "Empty claim: partitions cannot be ruled out, so C or A is still chosen",
        "The claim is right, since reliable networks make the theorem irrelevant",
        "The claim is right, because CA is the only option that offers both properties",
        "The claim is wrong, because every system must always choose A over C",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Networks and machines fail in ways you cannot prevent, including slow links that look like cuts. A system spread over machines must decide what to do then, so it is CP or AP in practice.",
      distractors: [
        "",
        "Reliability reduces how often a partition happens, not whether the system must choose when one does.",
        "CA only describes a system that has no partition tolerance, which a replicated system cannot offer.",
        "Neither choice is always correct. It depends on the data.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-cap-quorums-wallet-failover",
      scenario:
        "A small Indian fintech runs a wallet on PostgreSQL, with a primary in one availability zone of Mumbai and a replica in another zone of the same city, about 2 ms away. The replica is asynchronous. In a recent failover, the last second of acknowledged top-ups was missing on the new primary. Two engineers run it. A wallet write can take 20 ms and the app handles about 200 writes per second. What should they do?",
      options: [
        {
          label: "Keep asynchronous replication and tell users that recent top-ups may take time to show",
          appeal:
            "Fastest commits and no change to the setup.",
        },
        {
          label: "Make the replica synchronous, so a commit waits until the second zone has it",
          appeal:
            "No acknowledged write can be lost in a single-zone failure, and it costs only about 2 ms per write.",
        },
        {
          label: "Move to a leaderless store with W = 1 across three cities",
          appeal:
            "Writes never block, and the cluster tolerates a whole city failing.",
        },
        {
          label: "Add a second asynchronous replica in another city",
          appeal:
            "More copies mean more safety.",
        },
      ],
      best: 1,
      verdict:
        "Money is involved, so correctness beats the last millisecond, and the replica is only 2 ms away, a small part of a 20 ms write. Synchronous replication takes the latency side of PACELC at a price the workload can afford. Asynchronous replication is what lost the writes, a W = 1 leaderless store gives up read-your-writes for money, and one more asynchronous replica still lets acknowledged writes vanish on failover.",
      claims: [
        {
          text: "You accept about 2 ms more on every write, in return for no acknowledged write being lost when one zone fails.",
          axis: "trade",
          correct: true,
          note: "True. That is the latency-for-consistency trade, at a price this workload can afford.",
        },
        {
          text: "You accept that if the replica is down or unreachable, the primary may stop acknowledging writes unless a fallback is configured.",
          axis: "trade",
          correct: true,
          note: "True. Synchronous commit ties the primary's progress to the replica.",
        },
        {
          text: "You get exactly the same write latency as before.",
          axis: "trade",
          correct: false,
          note: "Every commit now waits for the second zone, so latency rises by about the round trip.",
        },
        {
          text: "If the replica fails and the setting is strict, wallet writes stall until it returns or the setting is relaxed.",
          axis: "failure",
          correct: true,
          note: "True. This is the availability cost of choosing consistency.",
        },
        {
          text: "Synchronous replication to one replica protects against the whole city losing power.",
          axis: "failure",
          correct: false,
          note: "Both zones are in one city. A city-wide failure needs a copy elsewhere, with its own latency cost.",
        },
        {
          text: "Measure commit latency percentiles, and replica lag at the moment of any failover test.",
          axis: "measure",
          correct: true,
          note: "True. The cost shows in commit latency, and the benefit shows in lag at failover.",
        },
        {
          text: "Measure only the average CPU of the primary.",
          axis: "measure",
          correct: false,
          note: "CPU says nothing about lost writes or commit delay.",
        },
      ],
    },
    {
      id: "sd-cap-quorums-festival-inventory",
      scenario:
        "An Indian e-commerce site runs its Diwali sale on a store replicated across two regions. Product pages, reviews and the cart are read millions of times a minute. But 5,000 units of a phone are on sale, and the stock count and the payment record must never oversell or double-charge. Peak write rate on stock is a few thousand per second. A single global consistency setting is proposed. What is the best design?",
      options: [
        {
          label: "Make every read and write strongly consistent across both regions",
          appeal:
            "One simple rule, and nothing can ever be wrong.",
        },
        {
          label: "Make everything eventually consistent with W = 1 and R = 1",
          appeal:
            "Fastest and always available, and the cheapest to run.",
        },
        {
          label: "Choose per data: strong for stock decrement and payments, eventual for catalogue, reviews and cart",
          appeal:
            "Pays the coordination cost only where a wrong answer costs money.",
        },
        {
          label: "Run everything in one region, with no replication",
          appeal:
            "No cross-region choice at all.",
        },
      ],
      best: 2,
      verdict:
        "The data differs in the cost of being wrong. A few thousand stock writes per second can afford coordination, while millions of page reads cannot. Per-data choice puts the expensive guarantee only on stock and payments. Strong everywhere makes every page view pay cross-region latency, eventual everywhere risks selling the same phone twice, and a single region gives up resilience and still needs correct stock handling.",
      claims: [
        {
          text: "You accept that stock and payment operations are slower and may be refused during a region split, so the code must handle failure.",
          axis: "trade",
          correct: true,
          note: "True. Consistency over availability means errors during a partition.",
        },
        {
          text: "You accept that a shopper may see a slightly old review count or price on a product page.",
          axis: "trade",
          correct: true,
          note: "True. That staleness is cheap and bounded for catalogue data.",
        },
        {
          text: "You get the same behaviour for all data, which keeps the code simple.",
          axis: "trade",
          correct: false,
          note: "The point is different behaviour for different data, which is more code and more thought.",
        },
        {
          text: "If stock is stored with eventual consistency, two regions can each sell the last unit during a split.",
          axis: "failure",
          correct: true,
          note: "True. Each side sees stock remaining, and both accept the order.",
        },
        {
          text: "If the cart store is eventually consistent, a split loses the shoppers' carts permanently.",
          axis: "failure",
          correct: false,
          note: "Carts stay available and are merged afterwards. This is the case Dynamo was built for.",
        },
        {
          text: "Measure oversold units, which should be zero, and the 99th percentile latency of the stock decrement.",
          axis: "measure",
          correct: true,
          note: "True. One measures correctness, the other the price paid for it.",
        },
        {
          text: "Measure the page views per second of product pages.",
          axis: "measure",
          correct: false,
          note: "Page views show load. They do not show whether stock stayed correct.",
        },
      ],
    },
    {
      id: "sd-cap-quorums-profile-quorum",
      scenario:
        "A global app stores user profiles in a Dynamo-style store with 3 replicas per profile (N = 3), spread over three zones. After a user edits their profile, the next page load must show the edit. The service must keep accepting edits and reads if one replica is down. Reads are far more frequent than writes. Which read and write setting should they use?",
      options: [
        {
          label: "W = 2 and R = 2",
          appeal:
            "Read and write sets overlap since 4 is greater than 3, and one replica may be down.",
        },
        {
          label: "W = 1 and R = 1",
          appeal:
            "Fastest in both directions, and never blocks.",
        },
        {
          label: "W = 3 and R = 1",
          appeal:
            "Reads are very fast and always find the latest value.",
        },
        {
          label: "W = 1 and R = 3",
          appeal:
            "Writes are very fast, and a read checks every replica.",
        },
      ],
      best: 0,
      verdict:
        "W = 2 and R = 2 satisfies R + W > N, so edits are seen, and either operation still works with one replica down. W = 1 and R = 1 gives 2, which does not guarantee overlap. W = 3 makes every edit fail when one replica is down. W = 1 and R = 3 makes every read fail in the same situation, and reads are the common case.",
      claims: [
        {
          text: "You accept that each read and write waits for the second-fastest replica, not the fastest.",
          axis: "trade",
          correct: true,
          note: "True. A quorum of 2 means waiting for two answers.",
        },
        {
          text: "You gain freshness for an edited profile, since any 2 replicas read and any 2 replicas written must share one.",
          axis: "trade",
          correct: true,
          note: "True. 2 + 2 = 4 is greater than 3.",
        },
        {
          text: "You get lower read latency than W = 3 and R = 1 would give.",
          axis: "trade",
          correct: false,
          note: "R = 1 waits for one replica, so those reads are faster than reads with R = 2. Here read speed is traded for availability.",
        },
        {
          text: "If two of the three replicas are down, both reads and writes fail with this setting.",
          axis: "failure",
          correct: true,
          note: "True. A quorum of 2 cannot be formed from one replica.",
        },
        {
          text: "If one replica is down, edits are refused until it returns.",
          axis: "failure",
          correct: false,
          note: "The two live replicas still form a quorum of 2 for both reads and writes.",
        },
        {
          text: "Measure quorum read and write latency percentiles, and the count of requests that fail for lack of a quorum.",
          axis: "measure",
          correct: true,
          note: "True. These show the price of waiting for two replicas and the availability limit of the setting.",
        },
        {
          text: "Measure the average disk usage of each replica.",
          axis: "measure",
          correct: false,
          note: "Disk use says nothing about whether reads see the latest write.",
        },
      ],
    },
  ],
};

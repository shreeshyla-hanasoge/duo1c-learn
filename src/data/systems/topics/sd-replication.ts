import type { Topic } from "../../types.ts";

export const sdReplication: Topic = {
  id: "sd-replication",
  title: "Replication",
  tier: 3,
  week: 5,
  depth: "deep",
  summary:
    "Replication keeps copies on several machines. Learn leader-follower, multi-leader and leaderless designs, sync versus async, lag, failover and split brain.",
  why: "One copy of your data is one disk failure from gone. Replication buys durability, read capacity and a way to survive a dead machine, but every copy that is not updated instantly can show stale or even conflicting data. Engineers get hurt by exactly these details: a promoted follower missing the last writes, two leaders after a network cut, a user not seeing their own save. Knowing the three models and their failure modes is a core system-design skill, and Traed's backup design is a small version of it.",
  learn: {
    intuition:
      "Imagine a head office that keeps the master register and sends a daily copy to three branch offices. Customers can ask a branch for information, which spreads the load. If the head office burns down, a branch has the records. But the copies are always a little behind. A customer who updates their address at head office and then asks a branch may be told the old one. If head office is lost mid-day, the branches are missing the last few changes. Worse, if branches lose contact and two of them each decide 'I am now the head office', both start accepting changes, and the registers diverge. Replication is the art of choosing how fast to send copies, who may accept changes, and how to decide that the head office is really gone.",
    mechanics: [
      {
        heading: "Leader and followers: the replication log",
        body: "In leader–follower replication one node, the leader, accepts all writes and appends each change to an ordered replication log. MySQL calls it the binlog, PostgreSQL the write-ahead log (WAL). Followers read this log and apply the changes in the same order, tracking how far they have got with a position number. Suppose the leader is at position 1000 and a follower has applied 970. The follower is 30 entries behind: that gap is replication lag. Followers can serve reads, which adds read capacity, but only the leader takes writes. The log can carry the SQL statements or the changed row values; row-based logs are safer because functions like NOW() or RAND() would otherwise give different results on each node.",
      },
      {
        heading: "Synchronous, asynchronous and the lag anomalies",
        body: "With synchronous replication the leader replies 'committed' only after a follower confirms. No acknowledged write is lost if the leader dies, but each commit waits for a round trip, about a millisecond in one city and tens of milliseconds across cities, and a dead follower can block writes. Asynchronous replication replies at once and ships the log later, so it is fast but can lose the last few writes. A common middle path is one synchronous follower and the rest asynchronous. Lag causes three anomalies: not seeing your own write (read-your-writes), seeing data go backwards between two reads on different followers (monotonic reads), and seeing an answer before its question (consistent prefix).",
      },
      {
        heading: "Multi-leader and leaderless",
        body: "Multi-leader lets several nodes accept writes, usually one leader per data centre, so users write locally and leaders exchange changes. The cost is write conflicts: two leaders can change the same row at once, and you need a rule such as last-write-wins, merging, or a CRDT. Leaderless systems such as Dynamo and Cassandra send each write to N replicas and read from several. With N = 3, a write needs W = 2 acknowledgements and a read asks R = 2. Because R + W = 4 is greater than N = 3, every read set overlaps the latest write set in at least one node. Read repair and hinted handoff fix the stragglers.",
      },
      {
        heading: "Failover and split brain",
        body: "When the leader dies, a follower must be promoted. First, detect the failure, usually by missed heartbeats over a timeout. A short timeout reacts fast but promotes during a mere slow patch; a long one leaves the system down. Second, choose the follower with the highest log position, to lose the least. Third, point clients at it and demote the old leader when it returns. Risks: with asynchronous replication the unreplicated writes are lost, and they may conflict with new ones. Split brain is two nodes both believing they lead. Prevent it with a majority vote on an epoch (a term number) and fencing, so the old leader's writes are refused.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed runs one MySQL with no replica or standby, so it has no replication lag to manage and no failover to get wrong. For a single founder-user that is the honest trade: simpler, and a dead database means downtime, not wrong data. What it does have is a small version of log shipping: the backup design archives closed binlogs to S3 every 15 minutes, which is asynchronous replication to a cold copy. That bounds data loss at roughly the last unshipped log, not zero. We would add a warm follower when downtime during market hours becomes unacceptable or when other users share the platform.",
      },
    ],
    complexityDerivation:
      "Every replication scheme is a position on one line: how many copies must know about a write before you call it done. Zero extra copies is fastest and loses the write if the machine dies. All copies is safest and as slow as the slowest node, and unavailable when any node is down. A majority sits between them, and it has a useful property: any two majorities share at least one node, which is why R + W greater than N works and why a leader elected by a majority has seen every committed write. The argument holds while failures are independent and clocks and timeouts are sane. It stops holding when a network partition lets two sides each think they are the majority, which is why the majority must be counted against a fixed membership, and when you accept asynchrony and then promise zero data loss.",
    variants: [
      {
        name: "Leader–follower (single leader)",
        when: "Most applications: one source of truth for writes, many reads, a relational database.",
        delta:
          "Simple and gives a clear order of writes. Writes are limited to one machine, and failover needs care, but there are no write conflicts.",
      },
      {
        name: "Multi-leader",
        when: "Several regions each need low-latency local writes, or clients work offline and sync later, as with collaborative documents.",
        delta:
          "Writes are accepted in several places, so conflicts are certain to occur and need a resolution rule. Ordering across leaders is weaker.",
      },
      {
        name: "Leaderless with quorums",
        when: "Very high availability for key-value access, and the application can tolerate eventual consistency or tune R and W.",
        delta:
          "No failover step, since any replica can serve. Consistency depends on R + W > N, and edge cases such as sloppy quorums can still return stale data.",
      },
    ],
    tradeoffs: [
      {
        vs: "Synchronous versus asynchronous",
        pick: "One synchronous follower, the rest asynchronous, for data that must not be lost",
        because:
          "A single sync copy means an acknowledged write survives one machine loss, while the latency and availability cost stays bounded. Asynchronous only is fine when losing seconds of writes is acceptable.",
      },
      {
        vs: "Read from followers versus read from the leader",
        pick: "Followers for reports and browsing, the leader for read-your-writes",
        because:
          "Followers add capacity but lag. A user who just saved something should read from the leader, or from a follower known to have reached their write position.",
      },
      {
        vs: "Automatic versus manual failover",
        pick: "Automatic only with majority election and fencing; otherwise a human decides",
        because:
          "A wrong automatic promotion can cause split brain or lose writes silently. For a small system, a few minutes of human-led failover can be safer than a clever script.",
      },
    ],
  },
  algorithms: [
    {
      name: "Replication log shipping (binlog, WAL)",
      role: "Records every change in order so a follower can replay the same sequence, using a log position to know how far behind it is.",
    },
    {
      name: "Quorum overlap (R + W > N)",
      role: "Guarantees that a read quorum and a write quorum share at least one replica, so a read sees the latest acknowledged write.",
    },
    {
      name: "Heartbeat timeout failure detection",
      role: "Decides a leader is dead when its heartbeats stop for longer than a timeout, triggering election of a replacement.",
    },
    {
      name: "Epoch numbers and fencing",
      role: "Gives each leadership term a higher number so storage and followers can refuse writes from an old leader after a new one is elected.",
    },
  ],
  realWorld: [
    {
      system: "Amazon Dynamo and Apache Cassandra",
      kind: "industry",
      problem:
        "A shopping cart or session store must keep accepting writes even when some nodes or links fail.",
      applied:
        "Dynamo's published design is leaderless: a write goes to N replicas, R and W are tunable, and vector clocks mark concurrent versions. Hinted handoff and read repair bring stragglers up to date. Cassandra follows the same family of ideas.",
      evidence: "DeCandia et al., Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)",
      impact:
        "The store stays writable through node failures, and the cost is that clients may see stale or conflicting versions that must be reconciled.",
    },
    {
      system: "GitHub MySQL failover incident, October 2018",
      kind: "industry",
      problem:
        "A brief loss of connectivity between data centres made an automated failover tool promote databases in another region.",
      applied:
        "GitHub's public post-incident analysis describes that the promoted databases lacked some writes that the original primaries had accepted, so data on two sides diverged. Restoring a consistent state took about a day of degraded service.",
      evidence: "GitHub engineering blog: October 21 post-incident analysis (2018)",
      impact:
        "It is a widely cited example that automatic failover plus asynchronous replication can trade a short outage for a long data-reconciliation effort.",
    },
    {
      system: "PostgreSQL streaming replication and MySQL semi-synchronous replication",
      kind: "industry",
      problem:
        "Operators need to choose how much write latency to pay to avoid losing acknowledged commits.",
      applied:
        "PostgreSQL ships WAL to standbys and lets you set synchronous_commit and name synchronous standbys. MySQL's semi-synchronous plugin makes the primary wait until at least one replica has received the event before it acknowledges the commit.",
      evidence: "PostgreSQL documentation: high availability, streaming replication; MySQL reference manual: semisynchronous replication",
      impact:
        "A commit can be made safe against loss of the primary at the price of one network round trip per commit.",
    },
    {
      system: "Traed binlog archiving to S3",
      kind: "yours",
      problem:
        "A single MySQL server holds the only copy of users, strategies and orders, and a past wipe showed that copies must exist off the machine.",
      applied:
        "The backup design uploads closed binlog files to S3 every 15 minutes, in addition to periodic physical backups and hourly logical dumps of the critical tables. With a full backup plus the archived binlogs, any recent point can be restored.",
      evidence: "docs/plans/backup-restore-design.md",
      impact:
        "It is asynchronous log shipping to a cold copy: cheap, and the loss window is bounded by the shipping interval, but restoring is a manual procedure, not an automatic failover.",
    },
  ],
  insights: [
    {
      t: "Replication log is the spine",
      d: "Followers replay an ordered log and track a position. Lag is simply how far behind that position they are.",
    },
    {
      t: "Async can lose acknowledged writes",
      d: "If the leader dies before shipping, the promoted follower never saw those commits. One synchronous follower closes that gap at a latency price.",
    },
    {
      t: "R + W > N is overlap, not magic",
      d: "With N = 3, W = 2 and R = 2, any read set shares a node with the latest write set. W = 1, R = 1 gives no such promise.",
    },
    {
      t: "Failover is the dangerous moment",
      d: "Detecting death by timeout is a guess. Promote by majority with an epoch and fence the old leader, or you risk two leaders.",
    },
  ],
  pitfalls: [
    "Reading your own write from a lagging follower and calling it a bug in the app. Route read-after-write paths to the leader.",
    "Promoting a follower by hand or script without checking its log position. The one you pick may be missing minutes of writes.",
    "Counting a replica as a backup. A bad DELETE or a corrupt write is replicated within moments, so you still need point-in-time backups.",
  ],
  quiz: [
    {
      q: "In leader–follower replication, which node accepts writes?",
      options: [
        "Any follower, which forwards the change to the others",
        "Whichever node the client reaches first",
        "All nodes at once, and the first to commit wins",
        "Only the leader, and followers replay its log",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A single leader orders all writes and appends them to the replication log. Followers apply that log in order, and typically serve reads only.",
      distractors: [
        "Forwarding from followers describes a different design with more coordination. Here followers do not take writes.",
        "Accepting writes wherever a client lands is multi-leader behaviour, with conflicts to resolve.",
        "A race between all nodes is not a replication scheme. It would create conflicts.",
        "",
      ],
    },
    {
      q: "What is the main risk of asynchronous replication when the leader fails?",
      options: [
        "Recently acknowledged writes that were not yet shipped can be lost",
        "The followers will refuse to apply any further log entries",
        "Every read will return stale data from then on",
        "The leader will keep serving writes while it is down",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The leader replies before the followers have the change. If it dies in between, the promoted follower never saw those commits.",
      distractors: [
        "",
        "Followers will happily apply entries. The problem is entries they never received.",
        "Staleness exists during lag, but after promotion reads reflect the new leader's data.",
        "A failed leader serves nothing. The risk is about what its replacement is missing.",
      ],
    },
    {
      q: "A user saves a strategy and the page reloads from a follower that is 3 seconds behind, showing the old version. What is this called and what is a sound fix?",
      options: [
        "Dirty read; use serializable isolation on the follower",
        "Split brain; add a second leader to take the write",
        "Read-your-writes violation; read from the leader briefly after a write",
        "Write skew; add a unique index on the strategy name",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The write reached the leader but not yet the follower. Sending that user's reads to the leader for a short time, or to a follower that has reached their write position, restores what they expect.",
      distractors: [
        "A dirty read sees uncommitted data. This data is committed, only not yet copied.",
        "Split brain means two leaders. There is one leader here, and a second would worsen it.",
        "",
        "Write skew concerns concurrent writers and an invariant over several rows, not a lagging copy.",
      ],
    },
    {
      q: "A leaderless store has N = 5 replicas. Which choice guarantees that a read sees the latest acknowledged write?",
      options: [
        "W = 2 and R = 3, since together they equal five",
        "W = 3 and R = 3, since together they exceed five",
        "W = 1 and R = 4, since reads cover most nodes",
        "W = 5 and R = 0, since writes cover everything",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The rule is R + W greater than N. Three plus three is six, so any read set must overlap any write set in at least one node. A sum equal to N can miss.",
      distractors: [
        "Two plus three equals five, not more than five, so a read set can miss the write set entirely.",
        "",
        "One plus four equals five, which again is not greater than N, so overlap is not guaranteed.",
        "A read of zero nodes reads nothing. The write side alone is not enough.",
      ],
    },
    {
      q: "The leader dies while its asynchronous follower is 40 log entries behind. The follower is promoted. What happens to those 40 entries?",
      options: [
        "They are lost to the new leader; the old leader must reconcile if it returns",
        "They are replayed automatically from the follower's own memory buffers",
        "They are applied later, once the old leader's clock has caught up",
        "They are kept safely by the clients, which resend them on their own later",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The follower never received them. They exist only on the failed leader, so they are lost to the new leader. If the old leader returns, its extra writes conflict and are usually discarded or reviewed by hand.",
      distractors: [
        "",
        "The follower cannot replay what it never had. Its memory holds only what it received.",
        "Clocks play no part. The entries are simply absent on the new leader.",
        "Clients do not retain acknowledged writes and resend them by default.",
      ],
    },
    {
      q: "A network partition leaves the old leader alive on one side, and the other side elects a new leader. Both accept writes. What is the best protection?",
      options: [
        "Shorten the heartbeat timeout so the fault is detected sooner",
        "Let each side keep its writes and merge them by timestamp later",
        "Add one more follower to each side of the split",
        "Elect by majority with an epoch number, and fence out the old leader",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The minority side cannot win an election, and the higher epoch lets storage reject the old leader's writes. That prevents two leaders instead of detecting them late.",
      distractors: [
        "A shorter timeout makes false failovers more likely and does not stop two leaders.",
        "Merging by timestamp after the fact can silently drop valid writes. Prevention is better.",
        "More followers on each side do not decide who leads. A majority rule does.",
        "",
      ],
    },
    {
      q: "A payments team proposes synchronous replication to all five followers, in three cities, for every commit. What is the sound judgement?",
      options: [
        "Good, since it gives the strongest safety and nothing else is lost",
        "Too costly: sync to one nearby follower, async to the rest, accepting a bounded risk",
        "Good, provided the heartbeat timeout is raised for the far cities",
        "Pointless, since replication cannot protect against machine loss",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Waiting on all five means each commit is as slow as the farthest node and any single failure can block writes. One synchronous nearby copy protects against losing one machine with bounded latency.",
      distractors: [
        "Strongest safety here costs latency and availability, so something is lost.",
        "",
        "A longer timeout does not remove the per-commit wait on the farthest city.",
        "Replication does protect against machine loss. That is its main purpose.",
      ],
    },
    {
      q: "A dashboard reads balances from an asynchronous follower. Traders complain that figures sometimes lag their last trade by a few seconds. What is the right call?",
      options: [
        "Add more followers so each one has fewer queries to answer",
        "Make the followers synchronous for every table in the schema",
        "Read post-trade figures from the leader; keep followers for reports",
        "Tell traders to refresh until the figures catch up",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Lag is inherent to asynchronous copies. Data a person has just changed should come from the leader, while followers serve reports where seconds of staleness do not matter.",
      distractors: [
        "More followers add capacity, but each is still behind by the same lag.",
        "Synchronising everything slows every commit to fix a narrow set of reads.",
        "",
        "Asking users to work around lag leaves a known correctness gap in the product.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-replication-single-server-db",
      scenario:
        "A small trading platform runs one MySQL server on one VM for a single daily user. A wipe in the past showed the cost of having no copy. Downtime outside market hours is harmless, and a few minutes during market hours is tolerable. There is one engineer, and the budget is tiny. The question is what to do about durability and availability of the database.",
      options: [
        {
          label: "Off-machine backups plus archived binlogs, with regular restore drills, and no live replica",
          appeal:
            "Covers machine loss and human error cheaply, with nothing new to operate.",
        },
        {
          label: "A synchronous replica in another region, with automatic failover",
          appeal:
            "Zero lost commits and fast recovery, as large systems do.",
        },
        {
          label: "A multi-leader pair so either side can take writes",
          appeal:
            "Both machines stay writable, so there is never a single point of failure.",
        },
        {
          label: "An asynchronous read replica for the dashboards",
          appeal:
            "Offloads reads, and doubles as a copy of the data.",
        },
      ],
      best: 0,
      verdict:
        "The risks are a lost machine and a bad delete. Off-machine backups with archived binlogs address both, and replicas do not address the second, because they copy mistakes within moments. The load is one user, so read capacity is not a problem, and an automatic failover cluster adds more ways to fail than it removes. Add a warm follower when market-hours downtime becomes costly.",
      claims: [
        {
          text: "Restoring from backup is slower than failover and may lose writes since the last shipped binlog, accepted in return for simplicity.",
          axis: "trade",
          correct: true,
          note: "True. Recovery is manual and the loss window is the shipping interval.",
        },
        {
          text: "A live replica would protect against an accidental DELETE just as well as a backup.",
          axis: "trade",
          correct: false,
          note: "False. The DELETE is replicated almost at once. Only point-in-time backups can undo it.",
        },
        {
          text: "If backups silently stop, the platform still runs but has no usable copy, so the job needs an alert on missing success.",
          axis: "failure",
          correct: true,
          note: "True. An absent backup raises no error unless you build the alarm.",
        },
        {
          text: "A multi-leader pair would give automatic conflict-free writes for the orders table.",
          axis: "failure",
          correct: false,
          note: "False. Two writable nodes can accept conflicting changes to the same row and need a resolution rule.",
        },
        {
          text: "A periodic restore drill that loads the latest backup and compares row counts proves the copy is usable.",
          axis: "measure",
          correct: true,
          note: "True. A backup is only real once it has been restored.",
        },
        {
          text: "The size of the backup files shows that the backups are healthy.",
          axis: "measure",
          correct: false,
          note: "False. A file can be large and still be corrupt or have a broken chain.",
        },
      ],
    },
    {
      id: "sd-replication-payments-ledger",
      scenario:
        "A bank's payment switch handles UPI-style transfers, many thousands per second. Once a payment is acknowledged to the customer it must never be lost, even if the primary data centre burns down. Two data centres sit in the same city about 1 millisecond apart, and a disaster-recovery site is in another city around 30 milliseconds away. The end-to-end latency budget per payment is tight.",
      options: [
        {
          label: "Asynchronous replication to both other sites",
          appeal:
            "Lowest commit latency and simple operations.",
        },
        {
          label: "Synchronous replication to all three sites",
          appeal:
            "The strongest safety, with no site ever behind.",
        },
        {
          label: "Multi-leader across the two city sites with last-write-wins",
          appeal:
            "Both sites accept payments, so capacity doubles.",
        },
        {
          label: "Synchronous to the nearby second site, asynchronous to the far DR site",
          appeal:
            "Acknowledged payments survive a site loss at about 1 ms extra, while the 30 ms link stays off the critical path.",
        },
      ],
      best: 3,
      verdict:
        "Zero loss of acknowledged payments demands at least one synchronous copy off the primary site, and the nearby site gives that for about a millisecond. A 30 ms synchronous hop on every payment would eat the budget and tie availability to the far link. Pure async can lose acknowledged payments. Last-write-wins on a ledger can overwrite money movements.",
      claims: [
        {
          text: "Each commit pays about one round trip to the nearby site, in return for no acknowledged payment being lost if the primary site fails.",
          axis: "trade",
          correct: true,
          note: "True. About 1 ms is cheap protection for money.",
        },
        {
          text: "The far DR site can be a full synchronous partner without affecting payment speed.",
          axis: "trade",
          correct: false,
          note: "False. A 30 ms round trip would be added to every payment and would dominate the latency budget.",
        },
        {
          text: "If the whole city is lost, the DR site can be missing the most recent payments, so the recovery process must reconcile with the bank's records.",
          axis: "failure",
          correct: true,
          note: "True. Asynchronous copies lag, which is why reconciliation exists.",
        },
        {
          text: "If the nearby synchronous site becomes unreachable, the primary can keep acknowledging payments with no loss risk.",
          axis: "failure",
          correct: false,
          note: "False. Without the second copy, an acknowledged payment exists on one site only, so the system must pause, fail over or promote another synchronous partner.",
        },
        {
          text: "Commit latency at the 99th percentile and the replication lag to the DR site are the numbers to watch.",
          axis: "measure",
          correct: true,
          note: "True. One shows the cost of safety, the other the size of the recovery gap.",
        },
        {
          text: "Counting acknowledged payments on the primary alone shows that none can be lost.",
          axis: "measure",
          correct: false,
          note: "False. You need to compare with what the other sites hold to prove no loss.",
        },
      ],
    },
    {
      id: "sd-replication-catalogue-reads",
      scenario:
        "A shopping site's product pages are viewed 95 times for every order placed. One primary database handles all traffic and is at its limit during the evening peak. Product data changes a few times a day. Customers who place an order must see it in their order list immediately. A small team runs it, in one region.",
      options: [
        {
          label: "Buy a bigger primary machine and keep everything on it",
          appeal:
            "No consistency questions at all, one place to read and write.",
        },
        {
          label: "Add asynchronous read replicas for browsing, and send a customer's own order reads to the primary briefly after they buy",
          appeal:
            "Spreads the 95 percent of reads, and protects the few reads that must be fresh.",
        },
        {
          label: "Multi-leader across regions for local writes",
          appeal:
            "Brings writes close to users in every region.",
        },
        {
          label: "Synchronous replication to every read replica",
          appeal:
            "Every replica is always current, so no routing rules are needed.",
        },
      ],
      best: 1,
      verdict:
        "Reads dominate, product data changes rarely, and a few seconds of staleness on browsing hurts no one. Async replicas absorb the reads. The one case that needs freshness, a customer's own order, is routed to the primary. A bigger machine only delays the limit. Multi-leader solves a multi-region problem that does not exist. Synchronous replicas would slow every order commit.",
      claims: [
        {
          text: "Browsing may show a product price that is a few seconds old, accepted in return for taking most load off the primary.",
          axis: "trade",
          correct: true,
          note: "True. Price changes are rare and a short delay is tolerable.",
        },
        {
          text: "Using asynchronous replicas means orders can be accepted by any replica.",
          axis: "trade",
          correct: false,
          note: "False. Replicas serve reads only. All writes still go to the primary.",
        },
        {
          text: "A customer who orders and then reads from a lagging replica may see an empty order list.",
          axis: "failure",
          correct: true,
          note: "True. That is the read-your-writes anomaly, and routing their reads to the primary avoids it.",
        },
        {
          text: "If one replica fails, orders are lost.",
          axis: "failure",
          correct: false,
          note: "False. The primary holds the orders. A failed replica reduces read capacity only.",
        },
        {
          text: "Replication lag in seconds per replica, with an alert above a threshold, shows when browsing is going stale.",
          axis: "measure",
          correct: true,
          note: "True. Lag is the direct measure of staleness.",
        },
        {
          text: "The primary's CPU alone tells you whether replicas are up to date.",
          axis: "measure",
          correct: false,
          note: "False. CPU shows load, not how far behind each replica is.",
        },
      ],
    },
  ],
};

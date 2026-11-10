import type { Topic } from "../../types.ts";

export const sdLocksLeases: Topic = {
  id: "sd-locks-leases",
  title: "Distributed locks, leases and fencing",
  tier: 4,
  week: 8,
  depth: "deep",
  summary:
    "Why a lock with a timeout is really a lease, how a paused process breaks it, and how fencing tokens make the protected resource safe.",
  why: "Sooner or later a system needs exactly one worker to do a job: one scheduler, one leader, one writer to a file. A lock seems like the answer, until the holder freezes for a minute and a second holder takes over. Knowing how leases expire, why a timeout cannot prove the old holder has stopped, and what fencing tokens add is what separates a lock that saves effort from one that protects money. Traed uses small Redis locks on exit orders, so the limits matter to it.",
  algorithms: [
    {
      name: "Lease with time-to-live",
      role: "Grants the right to act until an expiry time, so a crashed holder cannot block everyone forever.",
    },
    {
      name: "Fencing token",
      role: "A number that grows with every grant; the protected resource rejects any request carrying a lower number than it has already seen.",
    },
    {
      name: "Compare-and-set",
      role: "Acquires with set-if-absent and releases only if the stored owner is still you, in one atomic step.",
      dsa: "concurrency",
    },
  ],
  learn: {
    intuition:
      "A guest house gives you a room key for one night. If you lose the key or fall ill, the owner cannot wait for ever, so the key stops working at noon and the room goes to the next guest. That expiry is the whole idea of a lease. Now imagine you fall asleep in the room, your key expires at noon, and a new guest is let in. You wake at one o'clock, still believing the room is yours, and start moving furniture. Nothing about your own watch or your own certainty can tell you that you have been replaced. The fix is not a better watch. The fix is a door that checks. Each guest gets a ticket number, one higher than the last, and the cleaners only take instructions from the highest number they have seen. When you wake and show ticket 33, they have already met ticket 34 and ignore you.",
    mechanics: [
      {
        heading: "Why a lock with a timeout is a lease",
        body: "A plain lock stays held until its owner releases it. If the owner crashes, the lock stays held for ever, so distributed locks carry a time-to-live. Once a lock expires by itself, it is no longer a lock; it is a lease: permission to act until a deadline, after which someone else may be given it. In Redis the usual form is `SET lock:job <owner-id> NX PX 30000`, meaning set only if absent, expiring in 30 seconds. Release must be a check-and-delete in one step, because a plain `DEL` after your lease expired would delete the lock now held by the next owner. Owners renew the lease, commonly after a third of the time has passed.",
      },
      {
        heading: "The paused-process problem",
        body: "A holder cannot know its lease still stands at the moment it acts. Suppose worker A gets a 30-second lease, checks that 5 seconds have passed, and then a long garbage-collection pause, a stalled virtual machine or a slow network freezes it for 40 seconds. The lease expires at second 30, worker B acquires it and starts writing, and at second 45 A wakes up, still sure it holds the lock, and writes too. Both writes land. No check inside A helps, because the pause can fall between the check and the write. Clock differences between machines make it worse. The failure is caused by assuming that a timeout proves the old holder has stopped.",
      },
      {
        heading: "Fencing tokens",
        body: "The remedy is to let the resource itself reject stale holders. Each time the lock service grants the lease it also returns a fencing token, a number that only goes up. Worker A is given 33. After A's lease expires, worker B is given 34 and writes with token 34. The storage remembers the highest token seen. When A wakes and writes with 33, the storage sees 33 is lower than 34 and refuses. In practice the token can be a ZooKeeper transaction id, an etcd revision, or a version column in a database row updated with `WHERE version = 33`. This only works if the protected resource takes part in the check.",
      },
      {
        heading: "Leader election, and the limits of Redis locks",
        body: "Leader election is a lock held by one node at a time, with the others watching: when the leader's lease expires or its session dies, the others race to take it. Systems that need correctness build it on a consensus-backed service such as etcd, ZooKeeper or Chubby, which supply the token. A single Redis instance is simple and fast, but its replication is asynchronous, so a failover can hand the lock to a second client while the first still holds it. The Redlock scheme asks five independent Redis instances for a majority but still depends on bounded clocks and pauses, and has no fencing token. Use such locks to save effort, not to guard correctness.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed uses locks only as guards, and says so in the code. The exit path in `broker_exit.py` takes a Redis lock with `SET NX` and a 30-second expiry, keyed by user, broker and symbol, so two Exit presses cannot send two orders at once. A 60-second cooldown key and a request id stand behind it, because a lock alone cannot prove an order has not already gone out. If the send times out, the lock is deliberately kept to expiry. One server and one Redis means no split brain, so we have no fencing token and do not need one yet.",
      },
    ],
    complexityDerivation:
      "A lease buys liveness: if the holder dies, the system recovers after at most the lease length, which is a number you can state. It pays for it with a weaker safety claim. A lock service can promise that it will not grant the lease to two clients at once, but it cannot promise that the first client has stopped acting, because the client's pause, delay or clock error is invisible to the service. So mutual exclusion over time can never be guaranteed by the lock alone. The invariant that does hold is monotonicity: tokens only rise, and the resource accepts only the highest one it has seen. Safety then lives in the resource, which always knows the truth about its own state. The argument stops holding when the resource cannot check tokens, for example an external API or a printer, and when an overlap is harmless, in which case the plain lock is enough. It also fails if the token source is not itself consistent, which is why it comes from a consensus service. A lease is the right tool when you can bound the damage of a brief overlap, or can fence it.",
    variants: [
      {
        name: "Lock for efficiency",
        when: "Two holders would only duplicate work, for example two workers building the same cache entry.",
        delta:
          "A single Redis `SET NX PX` is enough. If the lock is occasionally held twice, you waste effort but break nothing. No fencing token is needed.",
      },
      {
        name: "Lock for correctness with fencing",
        when: "Two holders would corrupt data or move money twice, for example two writers to the same ledger row.",
        delta:
          "The lock comes from a consensus service that issues rising tokens, and the resource rejects stale ones. It is slower and costs more to run, but it stays safe through pauses.",
      },
      {
        name: "Session-based locks (ZooKeeper ephemeral nodes, etcd leases)",
        when: "You want the lock tied to a live client session, with automatic release when the session ends and watchers notified.",
        delta:
          "Release happens when the heartbeat stops, not at a fixed time. The client renews through a keep-alive, and detection time depends on the session timeout, which is again a trade between fast and false alarms.",
      },
    ],
    tradeoffs: [
      {
        vs: "Short lease versus long lease",
        pick: "Short, with renewal, when fast recovery matters",
        because:
          "A 5-second lease recovers from a crash within 5 seconds but needs frequent renewals and is easily lost in a pause. A 5-minute lease is stable but leaves a crashed holder's work blocked for minutes.",
      },
      {
        vs: "A distributed lock versus making the operation idempotent",
        pick: "Idempotent operations, with a lock only to cut waste",
        because:
          "If running twice is harmless because of a unique key or request id, no lock can fail dangerously. Locks then reduce duplicates rather than prevent damage, which is a far easier promise to keep.",
      },
      {
        vs: "Redis lock versus a consensus service such as etcd or ZooKeeper",
        pick: "Redis for efficiency, a consensus service for correctness",
        because:
          "Redis is already running in many stacks and is fast. A consensus service gives the ordered tokens and the failover safety that correctness needs, at the cost of another cluster to operate.",
      },
    ],
  },
  realWorld: [
    {
      system: "Google Chubby",
      kind: "industry",
      problem:
        "Many Google services needed leader election and coarse locks, and clients can pause or lose their network at any moment.",
      applied:
        "Chubby's paper describes locks with sessions that expire if the client stops renewing, and sequencers: a lock holder may pass a sequencer, naming the lock and its generation, to a resource that can verify it. This is the fencing idea, written down in 2006.",
      evidence: "Burrows, The Chubby lock service for loosely-coupled distributed systems (OSDI 2006)",
      impact:
        "The paper itself warns that a lock alone does not protect a resource from delayed requests, and offers checked sequencers as the remedy.",
    },
    {
      system: "Redlock and the public debate about it",
      kind: "industry",
      problem:
        "Teams want a distributed lock from Redis, and a single instance can lose the lock when it fails over.",
      applied:
        "The Redis documentation describes Redlock, which acquires the lock on a majority of five independent instances. Martin Kleppmann published an analysis arguing that pauses and clock jumps can still produce two holders and that a fencing token is needed, and the Redis author replied. Both positions are widely cited.",
      evidence: "Redis documentation: distributed locks with Redis; Kleppmann, How to do distributed locking (2016)",
      impact:
        "The common conclusion is practical: Redis locks suit work that can tolerate rare overlap, and correctness-critical locks need fencing.",
    },
    {
      system: "Kubernetes leader election and node leases",
      kind: "industry",
      problem:
        "Controllers run as several replicas for availability, but only one should act at a time, and the cluster must notice when a node stops reporting.",
      applied:
        "Kubernetes controllers elect a leader by holding a Lease object in the API server, backed by etcd, and renew it regularly; if renewal stops, another replica takes over. Nodes also report health by renewing Lease objects.",
      evidence: "Kubernetes documentation: Leases and leader election",
      impact:
        "One active controller at a time, with takeover after the renewal deadline passes. The design accepts a short gap rather than risk two active leaders for long.",
    },
    {
      system: "Traed duplicate-exit guard",
      kind: "yours",
      problem:
        "Pressing Exit twice, or from two tabs, must not send two closing orders, because a second full exit would reverse the position instead of closing it.",
      applied:
        "The engine takes a Redis `SET NX` lock with a 30-second expiry per user, broker and symbol, checks a stored request id for replays, and refuses a new exit for 60 seconds after one may have gone out. The Laravel side takes its own 60-second cache lock around the same call.",
      evidence: "strategy-engine/app/services/broker_exit.py; CMS/trade-server/app/Http/Controllers/Api/LiveTradingController.php",
      impact:
        "The lock stops simultaneous sends, and the request id and cooldown cover the gap a lock cannot, namely an order that is already out.",
    },
  ],
  insights: [
    {
      t: "A lock with a timeout is a lease",
      d: "It guarantees recovery after a crash, not that the old holder has stopped. Those are different promises.",
    },
    {
      t: "A holder cannot see its own pause",
      d: "A check just before the write does not help, because the freeze can happen between the check and the write.",
    },
    {
      t: "Put the safety in the resource",
      d: "Fencing tokens go up with each grant, and the protected resource rejects any lower one. That works through pauses and clock errors.",
    },
    {
      t: "Efficiency locks versus correctness locks",
      d: "Ask what happens if two holders overlap. If the answer is only wasted work, Redis is enough. If it is lost money, you need fencing.",
    },
  ],
  pitfalls: [
    "Releasing with a plain delete. If your lease expired and another client took the lock, your delete frees theirs. Always check the owner first, atomically.",
    "Treating a lease check as a guarantee. Testing 'do I still hold it' before a write leaves a gap in which a pause can occur.",
    "Setting the lease shorter than the operation it guards. A 30-second lock around a 60-second call expires while the work is still in flight.",
  ],
  quiz: [
    {
      q: "What does a time-to-live on a distributed lock turn it into?",
      options: [
        "A semaphore, where several holders may share the right",
        "A queue, where waiting clients are served in order",
        "A lease, where the right to act ends at a deadline",
        "A transaction, which is undone if it times out",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Once the lock expires without the holder releasing it, it behaves as permission valid until a deadline. That is a lease, and it exists so a crashed holder cannot block others for ever.",
      distractors: [
        "A semaphore counts several permits. A lease still has a single holder at a time.",
        "Ordering waiters is a separate feature. A timeout does not create a queue.",
        "",
        "A timeout does not roll anything back. Work the holder already did stays done.",
      ],
    },
    {
      q: "What is a fencing token?",
      options: [
        "A number that rises with each grant, which the resource uses to reject stale holders",
        "A random string stored in the lock key to identify its owner",
        "A secret key the holder uses to encrypt requests to the resource",
        "A heartbeat message sent to the lock service to renew the lease",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The token only goes up. The resource remembers the highest one it has accepted and refuses anything lower, so a holder that was paused past its lease cannot do damage.",
      distractors: [
        "",
        "An owner id lets you release safely, but it does not order grants, so the resource cannot tell old from new.",
        "Fencing is about ordering, not secrecy. Nothing is encrypted.",
        "Renewal keeps a lease alive. It does not protect the resource from an old holder.",
      ],
    },
    {
      q: "Worker A holds a 30-second lease and freezes for 45 seconds in a garbage-collection pause. Worker B acquires the lock at second 31. Without fencing, what happens when A wakes?",
      options: [
        "A notices the lease is gone, because the library tells it at once",
        "The lock service cancels A's pending write before it reaches the resource",
        "B's write is rejected, because A acquired the lock first",
        "A writes as if it still held the lock, so both writes land",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A has no way to know time passed. It resumes at the line after its last check and writes. The lock service never sees the write, so only the resource can refuse it.",
      distractors: [
        "Nothing runs in A while it is frozen, so no library call can warn it before its next instruction.",
        "The lock service is not on the data path. It cannot intercept a write sent to the resource.",
        "B's lease is current, and the resource has no reason to prefer A's older grant without a token.",
        "",
      ],
    },
    {
      q: "A storage system has seen fencing token 34 from worker B. Worker A, paused earlier, now sends a write with token 33. What should the storage do?",
      options: [
        "Accept it, then reconcile with token 34 after the write",
        "Reject it, because 33 is lower than the highest token it has seen",
        "Accept it, because lower tokens were issued first and are older",
        "Ask the lock service whether A's lease is still valid",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A lower token means the grant is older than one already honoured, so the sender has been replaced. Rejecting it is a local comparison that needs no call to anyone.",
      distractors: [
        "Accepting then reconciling lets the stale write overwrite B's data before anyone notices.",
        "",
        "Older does not mean more entitled. Newer grants supersede older ones.",
        "Asking the lock service adds a round trip and a race. The token already carries the answer.",
      ],
    },
    {
      q: "A trading engine locks 'exit NIFTY' with a Redis key that expires after 30 seconds, and the broker call can take up to 60 seconds. What is the risk?",
      options: [
        "The lock can expire while the order is still in flight, so a second exit can start",
        "The lock will never be released, because the key has no owner stored in it",
        "Redis will refuse the call because the expiry is shorter than the operation",
        "The broker will reject the second order, so nothing needs to change",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A lease shorter than the operation it guards gives away the guarantee mid-flight. That is why such a design adds a cooldown key and a request id, and renews or extends the lock when work is long.",
      distractors: [
        "",
        "The key expires by itself after 30 seconds, so it is released, which is the problem here.",
        "Redis does not compare the expiry to the length of the caller's work.",
        "A broker may accept a second exit and reverse the position, so you cannot rely on it to refuse.",
      ],
    },
    {
      q: "Three web servers each run a nightly job at 02:00 that rebuilds a report cache. Only one should run, but an occasional double run just wastes a few minutes of CPU. What is the right level of protection?",
      options: [
        "A five-node ZooKeeper cluster with fencing tokens on every cache write",
        "A Redlock across five Redis instances to guarantee exactly one run",
        "A single Redis `SET NX PX` lock with a lease longer than the job",
        "No protection at all, because a double run cannot be prevented",
      ],
      answer: 2,
      difficulty: "apply",
      why: "An overlap here only wastes effort, so this is an efficiency lock. A single Redis lock cuts most duplicates cheaply, and the rare double run is harmless.",
      distractors: [
        "Fencing and a coordination cluster are right for correctness, but heavy for a harmless duplicate.",
        "Five Redis instances add operating cost and still cannot give an absolute guarantee.",
        "",
        "A cheap lock prevents nearly all duplicates. 'Cannot be perfect' is not 'cannot be reduced'.",
      ],
    },
    {
      q: "A fintech's settlement job pays out money and runs on 20 workers. Engineers observed pauses of up to 40 seconds in production, and the lock lease is 30 seconds. They propose a better Redis lock library. What is the sound judgement?",
      options: [
        "Adopt it, since a library that renews the lease will remove any overlap",
        "Not enough; the payout store itself must reject stale holders with a token",
        "Adopt it, provided the lease is lengthened to a full hour",
        "Not needed; pauses of 40 seconds are too rare to plan for",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A pause can swallow renewals as well, so no lock library can make overlap impossible. Money requires the resource to refuse stale writers, for example with a conditional update on a version or a token.",
      distractors: [
        "A frozen process cannot renew either. Renewal narrows the gap but never closes it.",
        "",
        "A longer lease slows recovery from a real crash and still does not stop a longer pause.",
        "The pauses were observed, so the case is real, and duplicate payouts are costly.",
      ],
    },
    {
      q: "A team wants two instances of a market-data connector for availability, but the broker allows only one live connection per user and drops the older one when a second connects. Overlap lasts seconds and only causes a reconnect. What is the sound judgement?",
      options: [
        "Build a ZooKeeper cluster, because any duplicate connection is unsafe",
        "Skip any coordination, since the broker's own limit will pick the winner",
        "Use a majority-of-five lock, because lease length cannot be tuned",
        "A Redis lease with renewal is enough, since a brief overlap is harmless",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Overlap costs a reconnect, not money. A renewing Redis lease reduces churn cheaply and nothing breaks if it is occasionally held twice. Heavy machinery would cost more than the failure it prevents.",
      distractors: [
        "A cluster is justified when overlap corrupts data. Here it only causes a reconnect.",
        "Relying on the broker produces constant dropped connections as both instances fight over the slot.",
        "Lease length can be tuned, and a majority lock would still not remove all overlap.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-locks-leases-exit-guard",
      scenario:
        "A small trading platform runs on one server with one Redis. A user can press Exit on an open options position, or open the page in two tabs. A second full exit sent within moments of the first would reverse the position instead of closing it, and a position may be worth several lakh rupees. The broker call takes a few seconds, rarely much longer. The team is two people. How should duplicate exits be prevented?",
      options: [
        {
          label: "A Redis lock per user and symbol, plus a request id for replays and a cooldown after any send",
          appeal:
            "Cheap, uses what is already running, and the extra keys cover what a lock cannot.",
        },
        {
          label: "A three-node ZooKeeper cluster with fencing tokens on the broker call",
          appeal:
            "The strongest lock, with tokens that make stale holders harmless.",
        },
        {
          label: "A browser-side check that disables the button after the first press",
          appeal:
            "Simple, and it stops the most obvious double press.",
        },
        {
          label: "No guard, because the broker will reject a second order if the position is already closed",
          appeal:
            "Less code to maintain, and the broker is the source of truth.",
        },
      ],
      best: 0,
      verdict:
        "On one server there is no split brain and no external resource that could check a token; the broker is the only resource and it cannot verify one. A lock stops simultaneous sends, and the request id and cooldown cover the timeout case where an order may be out. A cluster adds cost with nothing to fence, a disabled button does not stop a second tab, and the broker may accept a second order that reverses the position.",
      claims: [
        {
          text: "You accept that a lock alone cannot prove an order has not gone out, so extra state is needed after a timeout.",
          axis: "trade",
          correct: true,
          note: "True. The doubt after a timeout is exactly what the cooldown and stored request id are for.",
        },
        {
          text: "You gain a guard with no new infrastructure, at the cost of relying on one Redis being available.",
          axis: "trade",
          correct: true,
          note: "True. If Redis is down, the safe behaviour is to refuse the exit rather than send it unguarded.",
        },
        {
          text: "A fencing token from a coordination service would make the broker reject stale requests.",
          axis: "trade",
          correct: false,
          note: "The broker is an external API with no token check, so a token could not be enforced there.",
        },
        {
          text: "If the lease expires while the broker call is still running, a second press can slip through the lock.",
          axis: "failure",
          correct: true,
          note: "True. That is why the cooldown outlasts the lock and the lock is kept to expiry after a timeout.",
        },
        {
          text: "A lock with a 30-second expiry guarantees the first press has finished within that time.",
          axis: "failure",
          correct: false,
          note: "Expiry is a timer, not a completion signal. The call may still be running when the key disappears.",
        },
        {
          text: "Count refused duplicate exits and exits where the broker result was uncertain.",
          axis: "measure",
          correct: true,
          note: "True. Both show how often the guard fires and how often the dangerous doubt case occurs.",
        },
        {
          text: "The lock's average hold time is the main measure of whether duplicates are prevented.",
          axis: "measure",
          correct: false,
          note: "Hold time shows speed, not whether two orders were sent.",
        },
      ],
    },
    {
      id: "sd-locks-leases-settlement-job",
      scenario:
        "A payments company in Bengaluru runs a nightly settlement job on a pool of 20 workers. The job reads the day's transactions and writes one payout batch to a database table, once. A duplicate batch would pay merchants twice, crores of rupees. Workers are on virtual machines and pauses of up to 40 seconds have been seen. The lock lease is 30 seconds. The database supports conditional updates. What design protects the payout?",
      options: [
        {
          label: "A Redis lock with a longer lease and an automatic renewal thread",
          appeal:
            "Familiar, fast, and renewal sounds like it prevents expiry mid-job.",
        },
        {
          label: "A lock from a consensus service that issues a fencing token, with the batch write conditional on the token",
          appeal:
            "A paused worker's late write is refused by the database itself.",
        },
        {
          label: "Redlock across five Redis instances",
          appeal:
            "Majority acquisition survives the loss of one Redis, which a single instance cannot.",
        },
        {
          label: "Run the job on all 20 workers and keep whichever result finishes first",
          appeal:
            "No coordination at all, and one worker finishing is enough.",
        },
      ],
      best: 1,
      verdict:
        "Money is at stake and pauses longer than the lease have been observed, so the resource must refuse stale writers. A token from a consensus service plus a conditional write does that whatever the pause. A longer lease or Redlock only narrows the overlap and neither carries a token. Running the job everywhere multiplies the duplicate risk.",
      claims: [
        {
          text: "You accept a heavier dependency, a consensus cluster to run, in return for a guarantee that survives pauses.",
          axis: "trade",
          correct: true,
          note: "True. That cost is justified because a duplicate payout is far more expensive than the cluster.",
        },
        {
          text: "The conditional write puts safety in the database, which always knows the true state.",
          axis: "trade",
          correct: true,
          note: "True. The check is a local comparison that no pause can bypass.",
        },
        {
          text: "A longer lease removes the need for a token, because the job can no longer expire mid-run.",
          axis: "trade",
          correct: false,
          note: "A pause can still exceed any lease, and a long lease also slows recovery after a real crash.",
        },
        {
          text: "A worker that wakes after a 40-second pause and writes with an old token is refused, so the batch is written once.",
          axis: "failure",
          correct: true,
          note: "True. The database has seen a higher token from the current holder.",
        },
        {
          text: "If the renewal thread is running, the lease cannot lapse during a long garbage-collection pause.",
          axis: "failure",
          correct: false,
          note: "A stop-the-world pause freezes the renewal thread too, so renewal does not help.",
        },
        {
          text: "Run a fault test that pauses a holder past its lease and confirm the late write is rejected.",
          axis: "measure",
          correct: true,
          note: "True. The guarantee only counts if it has been exercised against the exact failure.",
        },
        {
          text: "Lock acquisition latency at the 99th percentile shows whether double payouts are possible.",
          axis: "measure",
          correct: false,
          note: "Acquisition speed says nothing about whether a stale holder can write.",
        },
      ],
    },
    {
      id: "sd-locks-leases-connector-leader",
      scenario:
        "A broker data platform runs three instances of a connector that holds a single WebSocket per user to a broker. Only one instance should hold each connection. If two briefly do, the broker drops the older one and the instance reconnects within seconds, with no data corruption. The platform already runs a replicated Redis and has no coordination cluster. A leader should be re-elected within about ten seconds of a crash. How should leadership per user be decided?",
      options: [
        {
          label: "A Redis lease per user with a 10-second TTL, renewed every 3 seconds",
          appeal:
            "Uses what is already deployed and recovers within the ten-second target.",
        },
        {
          label: "A new five-node etcd cluster with leases and fencing",
          appeal:
            "The most robust election available, with proper tokens.",
        },
        {
          label: "A one-hour lease so leadership never flaps",
          appeal:
            "Very few renewals and stable ownership.",
        },
        {
          label: "A fixed assignment by user id, with no failover",
          appeal:
            "No lock at all, so nothing can go wrong with locking.",
        },
      ],
      best: 0,
      verdict:
        "Overlap is cheap, so this is an efficiency lock and Redis is enough. A 10-second lease matches the recovery target, and renewing at a third of the lease tolerates a lost renewal or two. A new etcd cluster adds operating cost for a failure that does no harm, a one-hour lease would leave a dead connector unserved for up to an hour, and fixed assignment has no recovery.",
      claims: [
        {
          text: "You accept that after a failover two instances may briefly both hold a connection, at the cost of one reconnect.",
          axis: "trade",
          correct: true,
          note: "True. This overlap is harmless here, which is why a cheap lock is allowed.",
        },
        {
          text: "Renewing every 3 seconds against a 10-second lease tolerates a missed renewal without losing leadership.",
          axis: "trade",
          correct: true,
          note: "True. Renewing at about a third of the lease leaves room for two lost attempts.",
        },
        {
          text: "A longer lease gives faster recovery, since the next leader is less likely to be challenged.",
          axis: "trade",
          correct: false,
          note: "The reverse. Recovery time is bounded below by the lease length, so a longer lease is slower.",
        },
        {
          text: "If Redis fails over and loses the lock key, a second instance can take leadership while the first still holds a connection.",
          axis: "failure",
          correct: true,
          note: "True. Asynchronous replication can lose a recent write, and the cost is the brief overlap described.",
        },
        {
          text: "If the leader instance freezes for 15 seconds, no other instance can take over until it wakes.",
          axis: "failure",
          correct: false,
          note: "The lease expires after 10 seconds and another instance can take it, which is the purpose of a lease.",
        },
        {
          text: "Track leadership changes per user per hour and the time between a crash and the next connection.",
          axis: "measure",
          correct: true,
          note: "True. Many changes mean the lease is too tight; the gap is the recovery time you promised.",
        },
        {
          text: "The Redis memory used by the lock keys shows whether leadership works.",
          axis: "measure",
          correct: false,
          note: "A handful of small keys tells you nothing about who actually holds a connection.",
        },
      ],
    },
  ],
};

import type { Topic } from "../../types.ts";

export const sdTimersAndScheduling: Topic = {
  id: "sd-timers-and-scheduling",
  title: "Timers and job scheduling",
  tier: 6,
  week: 12,
  depth: "deep",
  summary:
    "Run work later, or on a schedule, and run it once. Learn the heap, the timing wheel, delayed queues, cron on many machines, and missed-run policy.",
  why: "Almost every system needs something to happen later: expire a seat hold, retry a payment, send a reminder, time out a silent connection, run a report at 06:00. Doing it badly gives jobs that run twice, never run, or all fire in the same second and flatten the database. The tools are small and old: a heap, a wheel of slots, a sorted index and a claim on a row. Traed's schedule is a short Laravel file, and it already makes several of the choices this lesson names.",
  learn: {
    intuition:
      "Think of a kitchen with many things on the go: rice in ten minutes, a cake in forty, tea in three. A sensible cook does not watch every timer. She keeps one eye on the next one to ring, and when it does she handles it and looks for the next. That is a min-heap of deadlines. A hotel front desk with thousands of wake-up calls does it differently: a board with a slot for every minute, and at each minute the clerk takes the calls from that slot and makes them. That is a timing wheel. Now suppose two clerks are on duty and both read the 07:00 slot. The guest is called twice. So the clerks need a rule that only one of them takes a given call, and a rule for what to do if the whole desk was closed at 07:00 and reopens at 07:20.",
    mechanics: [
      {
        heading: "Min-heap of deadlines",
        body: "The simplest scheduler keeps all pending timers in a binary min-heap ordered by due time. The root is always the next one to fire, so the scheduler sleeps until the root's deadline, pops it, runs it, and looks at the new root. Insert and pop cost O(log n), and peeking at the root costs O(1). Worked example: with 1,000,000 timers, log2 of that is about 20 steps per insert. That is fine for thousands of timers a second. Cancelling is awkward, because removing from the middle of a heap is expensive. Most implementations mark the timer cancelled and discard it when it reaches the root, which is called lazy deletion.",
      },
      {
        heading: "Timing wheels",
        body: "When there are millions of timers, most of them timeouts that are cancelled or reset before they fire, a heap's log n adds up. A timing wheel is an array of slots, one per tick, with a pointer that advances each tick. A timer due in d ticks goes into slot (pointer + d) mod size, in constant time. When the pointer reaches a slot, everything in it fires. With 1 second ticks and 60 slots, a timer due in 17 seconds from slot 10 is placed in slot 27. Hierarchical wheels add a minutes wheel and an hours wheel, and timers cascade down as their time nears. The Linux kernel, Kafka's delayed-operation purgatory and Netty use this idea. The cost is resolution: a timer fires on a tick boundary, not exactly on time.",
      },
      {
        heading: "Delayed queues and durable timers",
        body: "In-memory timers vanish when the process dies, so work that must survive is stored with its due time. In a database this is a table with a `run_at` column and an index on it. Workers repeatedly select rows whose due time has passed and claim them. Redis does it with a sorted set whose score is the due timestamp, and a worker reads members with score up to now, then removes them. Message brokers offer it as a delay on a message: Amazon SQS allows delays of up to 15 minutes. The pattern is the same: a sorted index of future work, plus a poller that moves due items to a normal queue.",
      },
      {
        heading: "Cron at scale: exactly one, and missed runs",
        body: "A cron expression is a rule from which the next fire time is computed. The hard part starts with two scheduler machines for safety: both see 02:00. Exactly-once execution is built from two pieces. First, a claim: insert a row keyed by job name and fire time, with a unique constraint, so only one machine wins. Second, an idempotent job, because the winner may crash halfway and the job may be retried. A leader with a lease helps, but a paused leader can still wake up and fire. Then pick a missed-run policy: skip, run once to catch up, or run every missed slot. Kubernetes CronJob names these choices through `concurrencyPolicy` and `startingDeadlineSeconds`.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed uses the Laravel scheduler, declared in one file. Entries run every minute inside an IST window such as 09:15 to 15:30, skip NSE holidays through a calendar check, and use `withoutOverlapping` so a slow run is not started again on top of itself. Some pass a short expiry, such as 10 minutes, because a killed run must not hold the lock for a default day. There is one server, so no claim row or leader is needed. A pre-open job warms market data before the session, and an EventBridge rule runs the bridge function every minute, where each run claims a lease and exits at once if a healthy holder is already streaming. Two scheduler hosts would force the claim-row design above.",
      },
    ],
    complexityDerivation:
      "A heap is a tree kept partly ordered: each parent is due no later than its children, so the earliest deadline is always at the root. Insert adds at the bottom and swaps upward, at most the height of the tree, which is log n. A wheel avoids ordering entirely. It turns time into an array index, so insert and expiry are O(1), and the price is that all timers inside one tick are treated as equal. The invariant for both is that a timer is not run before its time and is run soon after it. Cron adds a second invariant: each scheduled fire time is executed at least once, and exactly once in effect. That holds only if the claim is atomic and the job is idempotent. It breaks when clocks differ between schedulers, so a machine fires a minute early or late; when a claim holder pauses past its lease and returns; when a mass of jobs share one fire time and arrive as a single spike; and when a job takes longer than its interval, so runs pile up. Each case needs a stated policy rather than hope.",
    variants: [
      {
        name: "Min-heap in memory",
        when: "Thousands to a few hundred thousand timers in one process, where exact firing time matters and a restart may lose them.",
        delta:
          "Simple, exact and fast enough. Insert is O(log n), and cancellation needs lazy deletion. All timers die with the process.",
      },
      {
        name: "Hierarchical timing wheel",
        when: "Millions of coarse timers, many of them cancelled or reset, such as connection and request timeouts.",
        delta:
          "O(1) insert and cancel. Fires on tick boundaries, so accuracy is one tick, and memory is a fixed array of slots.",
      },
      {
        name: "Durable delayed queue (sorted index plus poller)",
        when: "Work must survive restarts and be shared by many workers, such as reminders and retries.",
        delta:
          "Survives crashes and scales out by claiming rows. Adds polling delay, a store to run, and the need for idempotent handlers.",
      },
    ],
    tradeoffs: [
      {
        vs: "Heap versus timing wheel",
        pick: "A wheel for huge numbers of cancellable timeouts; a heap otherwise",
        because:
          "A heap is exact and simple. A wheel trades a tick of accuracy for constant-time cancel and reset, which matters when nearly every timer is cancelled before it fires.",
      },
      {
        vs: "Leader election versus claiming each fire time",
        pick: "Claim each fire time with a unique key",
        because:
          "A leader can pause and wake up believing it is still in charge. A claim on a row keyed by job and fire time is checked by the store at the moment of use, so a stale scheduler loses.",
      },
      {
        vs: "Catch up on every missed run versus skip them",
        pick: "Decide per job: skip for snapshots, catch up once for reports, replay all only for ledgers",
        because:
          "A job that reads the current state gains nothing from running six times at once. A job that must cover every interval, such as a daily settlement, cannot skip.",
      },
    ],
  },
  algorithms: [
    {
      name: "Binary min-heap",
      role: "Keeps the earliest deadline at the root so a scheduler knows how long to sleep and which timer fires next.",
      dsa: "heaps",
    },
    {
      name: "Hashed hierarchical timing wheel",
      role: "Turns deadlines into array slots so inserting and cancelling millions of timeouts costs constant time.",
    },
    {
      name: "Sorted set by due time (skip list)",
      role: "Holds durable delayed work ordered by run time so a poller reads everything due up to now.",
      dsa: "skip-lists",
    },
    {
      name: "Claim by unique key (conditional write)",
      role: "Lets exactly one of several schedulers win each job and fire time, which turns at-least-once into once in effect.",
    },
  ],
  realWorld: [
    {
      system: "Apache Kafka delayed operations",
      kind: "industry",
      problem:
        "A broker holds a very large number of requests that wait for a condition, such as acknowledgements from replicas, each with a timeout. Most complete long before the timeout.",
      applied:
        "Kafka's broker uses a hierarchical timing wheel for these delayed operations, as its developers have described publicly, in place of a heap-based delay queue. A request is added to a wheel slot in constant time, and completing it early avoids the cost of removing it from a heap.",
      evidence: "Apache Kafka design notes and the Confluent engineering post on the purgatory redesign",
      impact:
        "Insert and cancel stay cheap when the number of waiting requests is very large.",
    },
    {
      system: "Kubernetes CronJob",
      kind: "industry",
      problem:
        "A cluster controller must start jobs on a schedule, but it can be restarted, the cluster can be busy, and the previous run may still be going.",
      applied:
        "The documentation exposes the policies as settings: `concurrencyPolicy` chooses Allow, Forbid or Replace for an overlapping run, and `startingDeadlineSeconds` says how late a missed run may still start. The docs also warn that a job may occasionally be created twice or not at all, so jobs should be idempotent.",
      evidence: "Kubernetes documentation, CronJob (concurrencyPolicy, startingDeadlineSeconds)",
      impact:
        "Overlap and missed-run policy are explicit choices, and at-least-once is stated honestly.",
    },
    {
      system: "Google's distributed cron",
      kind: "industry",
      problem:
        "A cron service that thousands of teams rely on must keep running through machine and datacentre failures, without starting jobs twice or dropping them.",
      applied:
        "The published paper describes a cron service whose state is replicated across machines by Paxos, with one elected leader launching jobs. After a failover, the new leader must work out whether a launch was in progress, so launches are tracked as a two-step record and jobs are encouraged to be idempotent.",
      evidence: "Reliable Cron across the Planet, ACM Queue (Google, 2015)",
      impact:
        "A scheduler becomes a small replicated state machine, which is the price of one cron for a huge organisation.",
    },
    {
      system: "Traed Laravel scheduler",
      kind: "yours",
      problem:
        "Collecting option-chain history and sending alerts should run only during market hours, skip holidays, and never stack a second copy on top of a slow one.",
      applied:
        "`routes/console.php` declares entries with `everyMinute`, a time window in Asia/Kolkata, a `when` check against the NSE trading calendar, `withoutOverlapping` and `runInBackground`. Some entries give the lock a short expiry in minutes so a killed run cannot silence the job for a day.",
      evidence: "CMS/trade-server/routes/console.php",
      impact:
        "A one-server schedule that is simple to read, with overlap and holiday rules stated beside each job.",
    },
  ],
  insights: [
    {
      t: "The next deadline is all you need",
      d: "A min-heap exposes the earliest timer at the root. Sleep until then, run it, repeat. Insert costs O(log n).",
    },
    {
      t: "A wheel trades accuracy for speed",
      d: "Slots by tick make insert and cancel O(1), which suits millions of timeouts that rarely fire. Firing is accurate to one tick.",
    },
    {
      t: "Exactly once is a claim plus idempotence",
      d: "Several schedulers may fire the same slot. A unique key on job and fire time picks one, and the job must still be safe to retry.",
    },
    {
      t: "Missed runs need a policy",
      d: "Skip, catch up once, or replay all. Choose by whether the job reads current state or must cover every interval.",
    },
  ],
  pitfalls: [
    "A lock with no sensible expiry. A killed process holds it, and the job stays silent until a long default runs out.",
    "Starting thousands of jobs at 00:00 sharp. Add jitter or spread them across shards so the database is not hit in one second.",
    "Trusting local clocks across machines. Let one store decide what time the claim is for, and keep zones explicit, such as IST for market hours.",
  ],
  quiz: [
    {
      q: "In a scheduler built on a min-heap of deadlines, which operation tells it how long to sleep?",
      options: [
        "Popping the root and then re-inserting it into the heap",
        "Reading the root's due time without removing it",
        "Scanning all timers to find the smallest deadline",
        "Sorting the whole heap by due time each time",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The root of a min-heap is the earliest deadline, so peeking at it is O(1) and gives the sleep time. Nothing else is needed.",
      distractors: [
        "Popping removes the timer before it is due, and re-inserting wastes O(log n) work.",
        "",
        "A scan costs O(n) per decision, which is the cost a heap exists to avoid.",
        "Sorting costs O(n log n) and is unnecessary, because the heap already keeps the minimum at the root.",
      ],
    },
    {
      q: "What does a timing wheel give a server that holds millions of connection timeouts?",
      options: [
        "Exact firing times to the microsecond for every timer",
        "Durable timers that survive a process restart",
        "A guarantee that each timer fires on exactly one machine",
        "Constant-time insert and cancel, with accuracy of one tick",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A wheel maps a deadline to an array slot, so insert and cancel are O(1). Timers fire when the pointer reaches the slot, so accuracy is one tick.",
      distractors: [
        "Exactness is the strength of a heap. A wheel is as coarse as its tick.",
        "A wheel is a memory structure and is lost with the process, like a heap.",
        "A wheel knows nothing about other machines. Single execution is a separate claim problem.",
        "",
      ],
    },
    {
      q: "A wheel has 60 slots, a 1 second tick, and the pointer is at slot 10. A timer is due in 17 seconds. Where does it go?",
      options: [
        "Slot 27, and it fires when the pointer arrives there",
        "Slot 17, because the slot number equals the delay",
        "Slot 7, because the wheel counts backwards in time",
        "Slot 37, because it waits an extra rotation first",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The slot is (pointer + delay) mod size, which is (10 + 17) mod 60 = 27. The pointer reaches it after 17 ticks.",
      distractors: [
        "",
        "Slot numbers are relative to the current pointer, not to the clock origin, so the delay is added to the pointer.",
        "The pointer moves forward, so the target is ahead of it.",
        "Only a delay longer than 60 ticks would need extra rotations.",
      ],
    },
    {
      q: "Two scheduler machines run for safety. Both reach 02:00 and both try to start the nightly report. Which design makes exactly one of them run it?",
      options: [
        "Give each machine a different clock offset so that their firing times are kept apart",
        "Have each machine check whether the other one is alive before it starts the job",
        "Insert a unique row for job and fire time, and run only if it wins",
        "Run the report on both machines and keep the result that finishes first",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The store decides atomically. Only one insert of (job, 02:00) can succeed, so only one machine proceeds. The job should still be idempotent in case the winner crashes and is retried.",
      distractors: [
        "Offsets make the race less likely but not impossible, and they break when clocks drift.",
        "A liveness check followed by an action is not atomic, so both can pass it at once.",
        "",
        "Running twice wastes work and may double side effects such as emails.",
      ],
    },
    {
      q: "A job refreshes a dashboard from current prices every minute. The scheduler host was down for 20 minutes. What is the best missed-run policy?",
      options: [
        "Run all 20 missed runs in order as soon as the host is back",
        "Run 20 missed runs in parallel to catch up faster",
        "Wait for tonight and run a single catch-up pass",
        "Skip the missed runs and fire on the next normal minute",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The job reads current state, so one run now gives the same result as 20. Replaying the past adds load and no value.",
      distractors: [
        "Twenty sequential runs all produce the same current-state result and delay real runs.",
        "Parallel runs add a burst of load and still produce identical output.",
        "Waiting leaves the dashboard stale for hours for no benefit.",
        "",
      ],
    },
    {
      q: "A scheduler lock on a job is created with the default 24-hour expiry. The process is killed mid-run at 10:00. What happens, and what is the fix?",
      options: [
        "The lock clears at once, so no fix is needed",
        "It stays blocked until expiry; set expiry above the longest run",
        "The job runs twice because the lock is ignored, so remove the lock",
        "The job restarts by itself, so add a second lock for safety",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A killed process cannot release its lock, so the job stays skipped until the expiry. A short expiry, a bit longer than the slowest real run, limits that silence.",
      distractors: [
        "Locks do not release themselves when a process dies, unless they have a short expiry.",
        "",
        "The lock is respected. The opposite problem, a job that never starts, is the real one.",
        "A lock does not restart anything, and a second lock makes the stuck state worse.",
      ],
    },
    {
      q: "A gateway tracks idle timeouts for 20 million connections. Each packet resets that connection's 30-second timer. Which structure fits best?",
      options: [
        "A hierarchical timing wheel with a tick of about a second",
        "A binary min-heap with eager removal and re-insertion on each reset",
        "A database table of timers scanned every second",
        "One sleeping thread for each connection",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Resets happen on every packet and a timeout rarely fires, so cheap cancel and reinsert dominate. A wheel does both in O(1), and a one second error on a 30 second timeout is harmless.",
      distractors: [
        "",
        "Every packet would cost O(log n) on a heap of 20 million timers, which adds up at network rates.",
        "Scanning 20 million rows each second is far too slow.",
        "Twenty million threads cost far more memory and scheduling than the timers themselves.",
      ],
    },
    {
      q: "An engineer says: 'We run the nightly settlement under a distributed lock, so it cannot run twice.' What is the soundest reply?",
      options: [
        "Agreed; a lock with a timeout is a complete guarantee",
        "Agreed, but only if the lock service itself runs on three replicas",
        "A paused holder can resume late; make the job idempotent and use a claim",
        "A lock is useless here, so use a longer cron interval instead of one",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A lock with an expiry is a lease. A holder that stalls past it can wake and continue while another has started. The job must be safe to repeat, and writes should be checked against a claim or token.",
      distractors: [
        "A timeout is exactly what lets a second holder in while the first is paused.",
        "Replicating the lock service protects the lock service. It does nothing about a paused client.",
        "",
        "A longer interval changes how often runs happen but does not stop two copies of one run.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-timers-and-scheduling-overrun",
      scenario:
        "A trading platform on a single server runs a market-data collector every minute from 09:15 to 15:30 IST. A broker slowdown makes some runs take 3 minutes, and the next run then starts on top and doubles the broker calls. One run was killed during a deploy and the job stayed silent for the rest of the day. The team is two people. What should the schedule do?",
      options: [
        {
          label: "Skip a run if the previous one is still going, using a lock whose expiry is a few minutes above the longest normal run",
          appeal:
            "One copy at a time, and a killed run clears itself soon after.",
        },
        {
          label: "Allow overlapping runs so no minute is missed",
          appeal:
            "Every minute gets a collection, whatever the earlier run is doing.",
        },
        {
          label: "Add a second server and elect a leader to run the job",
          appeal:
            "Removes the single point of failure for the scheduler.",
        },
        {
          label: "Take the lock with no expiry and delete it by hand if stuck",
          appeal:
            "Strictly prevents any overlap.",
        },
      ],
      best: 0,
      verdict:
        "The harm is stacked runs and a lock that outlives its owner. Skip-if-running with a short expiry fixes both, on one server, with no new machinery. Overlap amplifies the broker slowdown, a leader pair adds a coordination problem for a single-server system, and a lock with no expiry causes the silent day the team already suffered.",
      claims: [
        {
          text: "You accept that a slow minute is skipped, so there is a gap in the data for that minute.",
          axis: "trade",
          correct: true,
          note: "True. Skipping chooses one slow run over two overlapping ones, and the gap is visible.",
        },
        {
          text: "You gain protection against doubling the load on the broker during its slow periods.",
          axis: "trade",
          correct: true,
          note: "True. Overlap would multiply calls exactly when the broker is struggling.",
        },
        {
          text: "A leader election removes the need for any lock expiry.",
          axis: "trade",
          correct: false,
          note: "A leader can also die while holding the role, so its role needs a lease with an expiry too.",
        },
        {
          text: "If the expiry is shorter than a normal slow run, a second copy can start while the first is still alive.",
          axis: "failure",
          correct: true,
          note: "True. The expiry must be longer than the slowest legitimate run.",
        },
        {
          text: "A lock with no expiry is safe, because a killed process always releases it.",
          axis: "failure",
          correct: false,
          note: "A killed process releases nothing. That is the cause of the silent day.",
        },
        {
          text: "Count skipped runs per day and alert when the job has not completed for several minutes.",
          axis: "measure",
          correct: true,
          note: "True. Skips show overruns, and time since last success shows a stuck job.",
        },
        {
          text: "The best measure of health is that the scheduler process is running.",
          axis: "measure",
          correct: false,
          note: "A live scheduler with a stuck lock is running and doing nothing. Measure completed runs.",
        },
      ],
    },
    {
      id: "sd-timers-and-scheduling-autopay",
      scenario:
        "A payments app has 20 million recurring auto-pay mandates, and about 3 million fall due on the 5th of the month. Each must be attempted once in the window from 06:00 to 08:00, the bank's API allows only a few thousand calls a second, and a double debit is unacceptable. One cron script that loops over due rows has been timing out. What design fits?",
      options: [
        {
          label: "One cron job that loops over all due mandates in a single process",
          appeal:
            "The simplest code and one place to look.",
        },
        {
          label: "A timing wheel in each app server holding its share of mandates in memory",
          appeal:
            "Constant-time timers and no polling of the database.",
        },
        {
          label: "Start every mandate at exactly 06:00 so that the whole batch is done at once",
          appeal:
            "Meets the deadline in the shortest possible time.",
        },
        {
          label: "A durable due-time index split into shards; workers claim batches, spread attempts through the window, and use an idempotency key of mandate and cycle",
          appeal:
            "Scales out, stays under the bank limit, and a retry cannot debit twice.",
        },
      ],
      best: 3,
      verdict:
        "The constraints are volume, an external rate limit and no double debit. Sharded durable work lets many workers share the load at a controlled rate, and the key of mandate plus cycle makes a retry safe. A single loop already times out, in-memory wheels lose work on a restart, and a 06:00 stampede would exceed the bank limit and fail in bulk.",
      claims: [
        {
          text: "You accept a more complex system: shards, a queue or claim step, and a rate controller.",
          axis: "trade",
          correct: true,
          note: "True. Scale and safety are bought with moving parts.",
        },
        {
          text: "Spreading attempts across the window trades some lateness for staying under the bank's limit.",
          axis: "trade",
          correct: true,
          note: "True. At 3 million over two hours, the rate is about 400 a second, far below a burst at 06:00.",
        },
        {
          text: "The idempotency key removes the need to track which mandates were attempted.",
          axis: "trade",
          correct: false,
          note: "The key makes retries safe, but you still need records of attempts for support, retries and reconciliation.",
        },
        {
          text: "A worker that crashes after calling the bank and before recording the result can cause a retry of a payment that already went through.",
          axis: "failure",
          correct: true,
          note: "True. That is why the key is sent to the bank and the status is queried before retrying.",
        },
        {
          text: "A claim by one worker means a crash cannot lose its batch.",
          axis: "failure",
          correct: false,
          note: "Claims need an expiry so another worker can take the batch over. Without it, a crash strands the work.",
        },
        {
          text: "Watch attempts per second against the bank limit, the number of mandates still due as the window closes, and duplicate keys rejected.",
          axis: "measure",
          correct: true,
          note: "True. These show rate, progress against the deadline and the safety net working.",
        },
        {
          text: "Total mandates processed at the end of the day shows the system was healthy.",
          axis: "measure",
          correct: false,
          note: "A day-end total hides a window that was missed or a limit that was broken at 06:05.",
        },
      ],
    },
    {
      id: "sd-timers-and-scheduling-order-expiry",
      scenario:
        "A food-ordering service creates about 5,000 orders a second at peak. Each unpaid order must be cancelled after its own deadline: 10 minutes for card, 30 for cash on delivery. A payment can arrive any time before then and must stop the cancel. A restart must not lose pending cancels. How should the team schedule the cancels?",
      options: [
        {
          label: "Sleep in a thread for each order until its deadline",
          appeal:
            "The easiest code to write.",
        },
        {
          label: "Keep a sorted index of orders by due time in a durable store; a poller takes those due, and the cancel step re-checks the order's state",
          appeal:
            "Survives restarts, handles different delays, and a paid order is ignored at fire time.",
        },
        {
          label: "Scan the whole orders table every minute for unpaid orders past their time",
          appeal:
            "No separate structure to maintain.",
        },
        {
          label: "A single FIFO queue with one fixed delay for all orders",
          appeal:
            "A queue is a familiar and simple tool.",
        },
      ],
      best: 1,
      verdict:
        "Delays differ and work must survive restarts, so a durable index ordered by due time fits. Re-checking state at fire time handles a payment that arrives late, instead of trying to remove the timer. Threads die with the process and cost memory, a full scan grows with the table, and a single fixed delay cannot order 10 and 30 minute deadlines.",
      claims: [
        {
          text: "You accept that cancels happen up to one polling interval late.",
          axis: "trade",
          correct: true,
          note: "True. A poller finds due items at its next pass.",
        },
        {
          text: "Leaving the timer in place and checking the order at fire time is simpler than deleting it on payment.",
          axis: "trade",
          correct: true,
          note: "True. Lazy cancellation avoids a race between payment and removal.",
        },
        {
          text: "A sorted index makes every cancel exactly on time.",
          axis: "trade",
          correct: false,
          note: "Timing depends on how often the poller runs and how busy workers are.",
        },
        {
          text: "If the cancel step does not re-check the state, a paid order can be cancelled.",
          axis: "failure",
          correct: true,
          note: "True. The timer does not know about the payment, so the step must look at the current state.",
        },
        {
          text: "If two pollers take the same due order, it is cancelled twice harmlessly even without a claim.",
          axis: "failure",
          correct: false,
          note: "A double cancel may refund twice or send two messages. Claim the order and make the step idempotent.",
        },
        {
          text: "Watch the lag between due time and actual cancel time, and the count of items overdue by more than a minute.",
          axis: "measure",
          correct: true,
          note: "True. Lag is the direct measure of whether the scheduler keeps up.",
        },
        {
          text: "The count of orders created per second shows whether cancels are on time.",
          axis: "measure",
          correct: false,
          note: "That measures input load, not whether due items are being handled.",
        },
      ],
    },
  ],
};

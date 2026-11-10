import type { Topic } from "../../types.ts";

export const sdIsolationAndJobs: Topic = {
  id: "sd-isolation-and-jobs",
  title: "Workload isolation and job queues",
  tier: 7,
  week: 13,
  depth: "deep",
  summary:
    "Heavy work must not share a failure domain with live trading. Bulkheads, a bounded job queue and honest job states keep slow work from hurting fast work.",
  why: "Traed ran backtests inside the same process as the live tick loop, and a heavy options backtest starved it: the engine answered health checks while processing no ticks for many hours. Moving backtests into a separate worker process fixed that, but it also created new questions: queue order, stuck jobs, crashes, restarts and honest progress. This topic gives you the names for all of them, so you can explain why live and backtest work are separated and what the separation still does not protect.",
  learn: {
    intuition:
      "A ship is divided into watertight compartments called bulkheads. If one compartment floods, the others stay dry and the ship floats. A trading platform needs the same idea. The live tick loop is the engine room: it must keep running every second of the market day. A backtest is a heavy cargo job that can eat memory and processor time for ten minutes. If both sit in one compartment, the cargo job can flood the engine room. So you give the heavy work its own compartment, and you put a gate at the door: a queue that lets in one job at a time and lets the others wait. Then you add the paperwork a harbour needs: every job has a status, a way to be cancelled, a timeout for the day it gets stuck, and a progress board so the person waiting is not left guessing.",
    mechanics: [
      {
        heading: "Bulkheads: what is actually shared",
        body: "Isolation starts by listing what two workloads share: CPU time, memory, database connections, a lock, a process. Whatever is shared is how one can hurt the other. In Traed the heavy backtest and the live tick loop shared a process, so they shared the Python interpreter lock and one heap. The 18 to 19 June incident followed: a backtest holding the lock and growing memory left the event loop unable to read ticks, and the engine looked alive to health checks while it processed none. The bulkhead pattern, popularised by Michael Nygard's Release It!, is to give each workload its own pool of the scarce resource.",
      },
      {
        heading: "Thread versus process isolation",
        body: "A thread shares its process's memory and, in standard Python, takes turns holding the global interpreter lock, so a busy thread can starve the event loop that reads the feed. FastAPI's background tasks run sync functions in a worker thread, which is why that was not enough. A process has its own interpreter, lock and heap, and if it dies the parent survives. Traed's `backtest_dispatch.py` uses a `ProcessPoolExecutor` with `spawn`, so each child starts from a clean interpreter instead of inheriting the live heap, and `max_tasks_per_child=1`, so every job returns all its memory to the operating system when it ends.",
      },
      {
        heading: "Queue, workers and the concurrency limit",
        body: "A job queue decouples accepting work from doing it. The request returns at once with a job id, the work waits its turn, and a fixed number of workers pull jobs. The limit is the real design decision, and it follows the scarcest resource. Traed's pool has `max_workers` of 1 by default because one backtest can hold several gigabytes and the server is small. Jobs run first in, first out, and a waiting job's queue position is shown to the user. One lesson: a cancelled job keeps its worker until it reaches a checkpoint, so the position must count jobs still occupying the pool, not only rows whose status says running.",
      },
      {
        heading: "Job states, stuck jobs and progress",
        body: "A job is a state machine: pending, running, then one of completed, failed or cancelled, which are terminal. The hard cases are jobs that never reach a terminal state. If a worker is killed hard, it cannot mark itself failed, so the parent's completion callback does it. If a deploy stops the whole service, no process survives; at start-up, Traed re-submits every non-terminal run from the request stored on its row, restarting from scratch, with an attempt cap so a run that crashes the engine cannot loop. Progress writes must be cheap and survivable: Traed caps the preview size and rolls back on failure, after one oversized write froze a bar at 85.3 percent.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep heavy work out of the live process. Backtests and optimisations run in a spawned worker process, one at a time by default, with a fresh process per job so memory is returned. Job state lives in the database, so progress, cancellation and queue position work across the process boundary, and a crashed or restarted worker leaves a failed or resubmitted run instead of a frozen one. We accept that this is process isolation on one machine: the jobs still share the host, the database and Redis with live trading, and a single worker means a long queue. We would move to a separate worker host or a managed queue when several users or concurrent heavy jobs arrive.",
      },
    ],
    complexityDerivation:
      "The argument is about blast radius. If two workloads share a resource, the worse one sets the limit for both, so a spike in heavy work becomes an outage in time-critical work. A boundary shrinks the blast radius to the thing that actually failed. A process boundary is cheap and removes the shared interpreter lock and heap, but it still shares the machine, so total memory and the database remain common. A queue with a worker limit then turns an uncontrolled peak into a controlled wait: the system never runs more heavy jobs than the scarcest resource can hold. The design holds while jobs are independent, their resource needs are bounded by the limit you set, and every job can end in a terminal state. It breaks when a single job exceeds the host, which a queue cannot fix. It also breaks when work is not independent, when one user floods the queue and starves everyone else without fair scheduling, and when a job cannot be restarted from scratch cheaply. At that point you need per-job resource limits, per-user caps, checkpoints or a separate fleet. The invariant to remember: live work never waits for heavy work, and heavy work always ends somewhere visible.",
    variants: [
      {
        name: "Process pool on the same host",
        when: "One server, a small team, and heavy jobs that must not hurt live work.",
        delta:
          "Cheapest isolation: own interpreter and heap per job. The host, disk, database and Redis are still shared, and an operating-system out-of-memory kill can still hit any process.",
      },
      {
        name: "Durable queue with a worker fleet",
        when: "Many users, bursts of jobs, or jobs that need machines of their own.",
        delta:
          "A queue such as Redis, SQS or RabbitMQ holds jobs durably and workers on separate hosts pull from it. Adds retries, dead-letter queues, autoscaling, per-job limits and operational cost.",
      },
      {
        name: "Separate service per workload",
        when: "Workloads have different scaling, security or release needs.",
        delta:
          "Backtests become their own service with their own deploys and data access. The strongest isolation, with the cost of a network boundary and shared-schema questions.",
      },
    ],
    tradeoffs: [
      {
        vs: "A background thread in the live process",
        pick: "A separate spawned process",
        because:
          "A thread shares the heap and takes turns on the interpreter lock, so heavy work can starve the tick loop and its memory is never returned. A process pays start-up time and serialisation to get a hard boundary.",
      },
      {
        vs: "Running as many workers as there are CPU cores",
        pick: "A worker count set by memory, not cores",
        because:
          "A job that holds gigabytes can exhaust a small server long before the CPUs are busy. The scarcest resource sets the limit; here that was memory, so one worker by default.",
      },
      {
        vs: "Checkpointing long jobs so they resume",
        pick: "Restart from scratch, with an attempt cap",
        because:
          "Checkpoints add state, versioning and bugs. If a run is minutes long and the request is stored, restart is simpler and safe, as long as a job that kills the engine cannot loop forever.",
      },
    ],
  },
  realWorld: [
    {
      system: "Hystrix and the bulkhead pattern",
      kind: "industry",
      problem:
        "In a service that calls many dependencies, one slow dependency can use up every thread and take down calls to all the others.",
      applied:
        "Netflix's open-source Hystrix library isolated each dependency in its own thread pool with a fixed size, so a slow one could exhaust only its own pool. The pattern is the one Michael Nygard named bulkheads in Release It!",
      evidence: "Netflix Hystrix wiki: How it works, thread pool isolation; Nygard, Release It!",
      impact:
        "A failing dependency degrades its own calls instead of the whole service.",
    },
    {
      system: "Kubernetes resource limits",
      kind: "industry",
      problem:
        "Many applications share a node, and one that leaks memory could starve the rest.",
      applied:
        "Kubernetes lets each container declare a memory limit. A container that exceeds its limit is terminated by the kernel's out-of-memory handling, and the other containers on the node keep running.",
      evidence: "Kubernetes documentation: resource management for pods and containers",
      impact:
        "A runaway job kills itself, not its neighbours, which is the same blast-radius idea applied to the whole platform.",
    },
    {
      system: "Traed: the spawn process pool for backtests",
      kind: "yours",
      problem:
        "Backtests ran as a background task inside the live engine process, so a heavy run starved the tick listener and filled memory. The engine answered health checks while processing no ticks.",
      applied:
        "`backtest_dispatch.py` runs each job in a `ProcessPoolExecutor` with `spawn`, `max_workers` from `BACKTEST_MAX_WORKERS` (default 1) and `max_tasks_per_child=1`. Progress and cancellation flow through the shared database. If a worker dies hard, the parent's callback marks the row failed. The queue position counts every job still in the pool, including cancelled ones that have not yet stopped.",
      evidence: "strategy-engine/app/services/backtest_dispatch.py",
      impact:
        "Heavy runs no longer share the interpreter lock or heap with live trading, and a crashed worker produces a failed row.",
    },
    {
      system: "Traed: restart recovery and the job state machine",
      kind: "yours",
      problem:
        "A deploy stops the engine and its worker together, which left mid-run backtests stuck at running with the frontend polling for ever.",
      applied:
        "At start-up, non-terminal rows are re-submitted from the request stored on the row, as a restart from scratch. A guarded update keeps a cancel from being undone, and an attempt counter marks a run failed after `BACKTEST_RECOVERY_MAX_ATTEMPTS` (default 2) tries. The documented states are pending, running, completed, failed and cancelled.",
      evidence: "strategy-engine/app/services/backtest_recovery.py",
      impact:
        "A restart leaves resubmitted or failed runs, not frozen ones. The assumption is one engine instance owning the database.",
    },
  ],
  algorithms: [
    {
      name: "Bounded FIFO job queue",
      role: "Holds pending jobs in arrival order with a fixed capacity, so heavy work waits its turn instead of starving live trading.",
      dsa: "stacks-queues",
    },
    {
      name: "Worker pool with a concurrency limit",
      role: "Runs at most a fixed number of jobs at once, which caps memory and CPU use and protects the processes that must stay fast.",
      dsa: "concurrency",
    },
    {
      name: "Job state machine",
      role: "Moves each job through queued, running, done or failed with only legal transitions, so stuck jobs can be detected and reported honestly.",
    },
  ],
  insights: [
    {
      t: "List what is shared",
      d: "Two workloads can hurt each other only through something they share: interpreter lock, heap, connections or host. Isolation means removing or limiting each one.",
    },
    {
      t: "Set the worker limit by the scarce resource",
      d: "If a job holds gigabytes, memory sets the limit, not cores. Extra jobs wait in the queue instead of crashing the box.",
    },
    {
      t: "Every job needs a way to end",
      d: "Pending, running, then completed, failed or cancelled. Anything that can die without reaching a terminal state needs a second mechanism that closes it.",
    },
    {
      t: "A process boundary is not a host boundary",
      d: "Traed's backtests still share the machine, the database and Redis with live trading. Say that plainly when you describe the isolation.",
    },
  ],
  pitfalls: [
    "Computing queue position from the database status alone. A cancelled job can still hold the single worker, so a waiting user is told they are next while nothing can start.",
    "Writing large result blobs on every progress update. One failed oversized commit can freeze the progress bar for hours; cap the payload and roll back on failure.",
    "Assuming a health endpoint proves the engine is working. A process stuffed with a backtest can answer health checks while processing no ticks.",
  ],
  quiz: [
    {
      q: "What does a bulkhead do in system design?",
      options: [
        "It speeds up a workload by giving it many more extra threads",
        "Each workload gets its own resources, so failures stay contained",
        "It retries a failed call until the other dependency recovers",
        "It encrypts all of the traffic between two internal services",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A bulkhead partitions resources between workloads, as watertight compartments do on a ship, so that one overloaded or failing part cannot take down the rest.",
      distractors: [
        "More threads can make interference worse; a bulkhead limits, not accelerates.",
        "",
        "Retries are a different resilience tool. Used carelessly they can add load to a failing dependency.",
        "That is transport security. It does not isolate resource use.",
      ],
    },
    {
      q: "What does running a job in a separate process give you that running it in a thread does not?",
      options: [
        "A faster start, since processes are lighter than threads are",
        "Automatic retries whenever the job raises an exception",
        "Direct access to the parent's variables without copying them",
        "Its own heap and interpreter lock, so crashes and leaks stay contained",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A process has its own address space, and in CPython its own global interpreter lock. A leak or crash in the child does not corrupt or starve the parent.",
      distractors: [
        "Processes are heavier to start than threads. That cost is what you pay for the boundary.",
        "Retries come from the queue or job layer, not from process separation.",
        "Sharing memory directly is what threads do. Processes must pass data explicitly.",
        "",
      ],
    },
    {
      q: "Your pool runs one backtest at a time. User A's run is executing and A cancels it; the row flips to cancelled at once but the worker keeps going until its next checkpoint. User B submits a run. What queue position should B see?",
      options: [
        "One job ahead, because A's cancelled run still holds the worker",
        "Zero ahead, because A's row is already cancelled",
        "Unknown, so show no queue information until A stops",
        "Two ahead, since cancellation adds a clean-up job",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The worker slot is occupied until the job stops, whatever its status says. Counting from the database alone told one user they were next while nothing could start.",
      distractors: [
        "",
        "Tempting because the row says cancelled, but the slot is occupied, so the user would wait with no explanation.",
        "Hiding the position avoids a wrong number but gives the user nothing; the in-flight set can answer correctly.",
        "Cancellation does not create a second job. It is a flag the running job checks.",
      ],
    },
    {
      q: "A backtest worker is killed by the operating system for using too much memory. Its row stays at running and the browser keeps polling. Which mechanism closes the row?",
      options: [
        "The worker's own exception handler marks the row failed",
        "The frontend stops polling after thirty minutes",
        "The parent's completion callback marks the row failed with a message",
        "The next backtest to start will tidy up older rows",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A process killed by the system cannot run its own handlers. Something that survives, here the parent process holding the future, must record the failure so the row reaches a terminal state.",
      distractors: [
        "An out-of-memory kill gives no chance to run handlers, so the worker cannot report its own death.",
        "A client-side timeout hides the symptom but leaves the row non-terminal for every other reader.",
        "",
        "Cleanup that depends on a later job leaves the row stuck until then and may never happen.",
      ],
    },
    {
      q: "A deploy stops the whole engine service, taking down the process pool too. Two backtests are left at pending and running. What should start-up do?",
      options: [
        "Mark both failed so the user must submit them again",
        "Resume each from its last saved checkpoint",
        "Leave them for the user to cancel manually",
        "Re-submit both from the stored request, with a cap on attempts",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The request is stored on the row but the in-memory state is gone, so a restart from scratch is possible. An attempt cap stops a run that itself crashes the engine from looping.",
      distractors: [
        "Safe but wasteful: the user loses runs the platform could redo, especially after every deploy.",
        "There are no checkpoints. Execution state is held in memory by the worker.",
        "Leaving rows frozen is the original problem: the frontend polls for ever.",
        "",
      ],
    },
    {
      q: "Progress updates write a partial-results blob to the database every second. One write exceeds the packet limit and fails, and the bar freezes at 85 percent for over an hour. What is the right fix?",
      options: [
        "Raise the database packet limit until no write can ever fail again",
        "Cap preview size, roll back on a failed write, keep progress writes light",
        "Stop writing partial results and show only the final result at the end",
        "Restart the worker whenever progress has not changed for one minute",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A failed commit left the session unusable, so every later update failed. Capping the payload prevents the failure and a rollback recovers if one happens, so progress keeps flowing.",
      distractors: [
        "A higher limit only moves the threshold; a bigger run will still hit it.",
        "",
        "Dropping the preview removes a feature users value instead of fixing the failure path.",
        "Restarting discards work, and a slow phase can legitimately show no change for a minute.",
      ],
    },
    {
      q: "A 6 GB server with no swap runs live trading plus backtests that can each hold several gigabytes. Someone proposes four backtest workers because the machine has four cores. What do you advise?",
      options: [
        "Keep one worker and a visible queue, since memory is the binding limit",
        "Use four workers; idle cores are wasted capacity",
        "Use four workers but give each a quarter of the memory",
        "Use eight workers so the cores stay busy during database waits",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The scarcest resource sets the limit. Two multi-gigabyte jobs can exhaust the box and take live trading with them, while a queue only costs waiting time.",
      distractors: [
        "",
        "Idle CPU is cheap; an out-of-memory event on the live host is not.",
        "A job's memory need is set by its data, not by a share you assign; it will exceed a quarter and fail.",
        "More workers raise memory demand further, in the direction that caused the original outage.",
      ],
    },
    {
      q: "A reviewer says: threads are enough, processes are overkill for backtests. When is the reviewer right, and when is the claim wrong?",
      options: [
        "Right in all cases, since threads are lighter and share data easily too",
        "Wrong in all cases, since processes are always the safer choice",
        "Right for I/O-bound work; wrong for heavy compute beside a live loop",
        "Right only if the machine has more cores than there are jobs",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Threads suit work that waits on I/O. Heavy Python computation holds the interpreter lock and a growing heap, so it can starve a latency-sensitive loop in the same process.",
      distractors: [
        "Light and shareable is true, but sharing the heap and lock is exactly the failure mode here.",
        "Always safer ignores cost. For waiting-on-network tasks, threads are simpler and adequate.",
        "",
        "More cores do not remove the interpreter lock for threads in the same process or give back memory.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-isolation-and-jobs-one-box",
      scenario:
        "One 6 GB server, no swap, runs the live tick loop and the API in one engine process. A single user submits options backtests that run 10 to 20 minutes and can hold several gigabytes. Last week one run left the box starved and the live feed processed no ticks for hours. There is no budget for a second server this quarter. What do you change?",
      options: [
        {
          label: "Keep backtests as background tasks and add more RAM monitoring",
          appeal: "Smallest change, and monitoring tells you before it happens.",
        },
        {
          label: "Buy a second server for backtests now",
          appeal: "The strongest isolation available.",
        },
        {
          label: "A spawned process pool with one worker and a fresh child per job, with job state in the database",
          appeal:
            "Removes the shared interpreter lock and heap at no new infrastructure cost, and the queue limits peak memory.",
        },
        {
          label: "Run backtests in a thread pool with a lower priority",
          appeal: "Keeps everything in one process but lets the live loop win.",
        },
      ],
      best: 2,
      verdict:
        "The harm came from a shared interpreter lock and a shared heap. A spawned child removes both, a worker limit of one keeps peak memory inside the box, and a fresh child per job returns memory. Monitoring only reports the outage, a second server is outside the budget, and thread priority does not apply to the interpreter lock or the heap.",
      claims: [
        {
          text: "You accept a single worker, so a second user's run waits in a queue.",
          axis: "trade",
          correct: true,
          note: "With one small box, waiting is cheaper than concurrency that can exhaust memory.",
        },
        {
          text: "Process isolation means the backtest can no longer affect live trading in any way.",
          axis: "trade",
          correct: false,
          note: "It still shares the host, the database and Redis. A runaway job can still pressure memory or the database.",
        },
        {
          text: "If the worker is killed for memory, the parent must mark its row failed, or the UI will wait for ever.",
          axis: "failure",
          correct: true,
          note: "A killed process cannot report itself, so the survivor closes the job.",
        },
        {
          text: "A thread pool fixes the problem because the operating system schedules threads fairly.",
          axis: "failure",
          correct: false,
          note: "Threads in one process still contend for the interpreter lock and still share the heap that was exhausted.",
        },
        {
          text: "Watch live ticks processed per minute during a backtest, not only the health endpoint.",
          axis: "measure",
          correct: true,
          note: "The engine answered health checks while processing none. Work done is the signal that matters.",
        },
        {
          text: "Watch backtest wall-clock time as the main sign that isolation is working.",
          axis: "measure",
          correct: false,
          note: "Backtest speed says nothing about whether live work is still being served.",
        },
      ],
    },
    {
      id: "sd-isolation-and-jobs-many-users",
      scenario:
        "A hosted backtesting product has 2,000 users. At 6 pm, after the market closes, several hundred submit runs within ten minutes. Jobs take 1 to 30 minutes and some need up to 8 GB. Users complain that one heavy user's batch of 40 runs blocks everyone, and a few runs die silently. What do you build?",
      options: [
        {
          label: "A bigger single process pool on a larger machine",
          appeal: "Same design as the small version, just bigger.",
        },
        {
          label: "A thread pool inside the web tier",
          appeal: "Reuses the servers you already run.",
        },
        {
          label: "One dedicated virtual machine per user",
          appeal: "Perfect isolation between customers.",
        },
        {
          label: "A durable queue and an autoscaled worker fleet with per-job memory limits, per-user concurrency caps and timeouts",
          appeal:
            "Absorbs the evening burst, stops one user from monopolising, and contains each job.",
        },
      ],
      best: 3,
      verdict:
        "At this scale the problems are burst absorption, fairness and containment. A durable queue with an autoscaled fleet absorbs the peak, per-user caps give fairness, per-job limits contain a heavy run, and timeouts and states make failures visible. A bigger pool is still one failure domain and one queue, and a VM per user is wasteful when load is bursty.",
      claims: [
        {
          text: "You take on queue operations, autoscaling and tuning of limits in exchange for fairness and burst capacity.",
          axis: "trade",
          correct: true,
          note: "The operational cost is the price of serving many users without one dominating.",
        },
        {
          text: "A first-in, first-out queue is fair to users with no further rule.",
          axis: "trade",
          correct: false,
          note: "A user who submits 40 runs first holds the front of the line. Fairness needs per-user caps or round-robin.",
        },
        {
          text: "A job that exceeds its memory limit is killed alone, and its row must still reach a failed state.",
          axis: "failure",
          correct: true,
          note: "Containment is the point, and the silent-death complaint is a missing terminal state.",
        },
        {
          text: "Autoscaling removes the need for any concurrency limit.",
          axis: "failure",
          correct: false,
          note: "Scaling has a ceiling, a cost and a start-up delay, and shared databases still saturate.",
        },
        {
          text: "Track queue wait time at the 95th percentile alongside run time.",
          axis: "measure",
          correct: true,
          note: "Users feel the wait. A tail measure shows the burst and the heavy-user effect that an average hides.",
        },
        {
          text: "Track average run time only, since it reflects user experience.",
          axis: "measure",
          correct: false,
          note: "Average run time hides the time spent waiting in the queue, which is the complaint.",
        },
      ],
    },
    {
      id: "sd-isolation-and-jobs-frozen-bar",
      scenario:
        "On a one-server platform, a long backtest shows progress rising to 85 percent and then stops changing. The worker is alive and the engine log shows nothing. An hour and a half later the user is still looking at 85 percent. The cause turns out to be a failed database write of an oversized partial-results blob that left the session unusable. Which design response is best?",
      options: [
        {
          label: "Make progress writes cheap and failure-safe: cap the preview size, roll back on failure, touch only status columns, and show the age of the last update",
          appeal:
            "Removes the failure, recovers from any recurrence, and lets a viewer tell stuck from slow.",
        },
        {
          label: "Raise the database packet limit very high",
          appeal: "One setting and the write succeeds.",
        },
        {
          label: "Automatically kill any job that runs longer than 30 minutes",
          appeal: "A hard timeout guarantees nothing runs for ever.",
        },
        {
          label: "Remove the progress bar and show a spinner",
          appeal: "No bar, no frozen bar.",
        },
      ],
      best: 0,
      verdict:
        "The root cause is a write path that can poison its own session. Capping the payload prevents the failure, a rollback recovers from it, and the update age distinguishes a stuck run from a slow phase. A bigger limit only moves the threshold, a blanket 30-minute kill destroys legitimate long runs, and a spinner hides the problem instead of fixing it.",
      claims: [
        {
          text: "You trade some preview detail, because oversized snapshots are skipped, for a progress path that cannot stall the job.",
          axis: "trade",
          correct: true,
          note: "A skipped preview is a small loss compared with a frozen run.",
        },
        {
          text: "A fixed 30-minute kill is a safe timeout because no backtest should take that long.",
          axis: "trade",
          correct: false,
          note: "Valid long runs exist. A timeout must be tuned to the work, or it turns slow into failed.",
        },
        {
          text: "Without a rollback, one failed commit can make every later progress write fail too.",
          axis: "failure",
          correct: true,
          note: "The session stays in a failed state until it is rolled back, which is how the bar froze.",
        },
        {
          text: "If the worker is alive, the job must be making progress.",
          axis: "failure",
          correct: false,
          note: "A live process can be stuck on an exception path. Liveness is not progress.",
        },
        {
          text: "Alert when a running job's last update is older than a few minutes.",
          axis: "measure",
          correct: true,
          note: "Staleness of the last progress write detects a stuck job without guessing run length.",
        },
        {
          text: "Alert when a job's progress percentage is above 80.",
          axis: "measure",
          correct: false,
          note: "A high percentage describes a healthy job as readily as a stuck one.",
        },
      ],
    },
  ],
};

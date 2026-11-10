import type { Topic } from "../../types.ts";

export const sdEventLoop: Topic = {
  id: "sd-event-loop",
  title: "Event-driven design and the single writer",
  tier: 3,
  week: 5,
  depth: "deep",
  summary:
    "A trading engine waits for events instead of asking for them. One thread that owns all the state needs no locks, as long as nothing in it ever blocks.",
  why: "Your engine runs every paper and live strategy inside one Python process on one event loop. That is why two strategies cannot corrupt each other's position, and also why one slow broker call can freeze all of them. If you can explain this one design choice, you can explain most of the engine's reliability story, including why backtests were moved out into their own process.",
  learn: {
    intuition:
      "Picture a single clerk at a railway reservation counter. People join the queue, and the clerk serves one person at a time, start to finish. Two people never edit the same ticket at once, so the clerk needs no rules about who goes first inside the counter. The queue does that job. This works well while each person takes a few seconds. It fails the moment one person says, wait, let me go and fetch a document from home, and the clerk stands there doing nothing while fifty people wait. An event loop is that clerk. Events are the people in the queue: a price tick, a candle closing, a broker reply. The loop takes one, runs the code for it, and moves on. The single-writer idea is that only this clerk is ever allowed to change the shared state, such as open positions. The whole design depends on one habit: never make the clerk wait for something slow. Slow work must be handed to someone else, and the clerk collects the answer later.",
    mechanics: [
      {
        heading: "Events versus polling",
        body: "Polling means asking again and again: is there a new price yet? Event-driven means the source tells you when something happens. NSE equity trading runs from 09:15 to 15:30, which is 375 minutes. A strategy that polls a broker REST API once a second makes about 22,500 calls a day to learn what 375 candle closes could have told it. Polling also adds delay, up to one polling interval. And brokers publish request limits, so a loop of polls can get you throttled. Traed receives ticks over a WebSocket, folds them into one-minute candles, and evaluates rules when a candle finishes.",
      },
      {
        heading: "The event loop: one thread, one queue, await as the hand-off",
        body: "An asyncio event loop keeps a queue of work that is ready to run. It runs one piece until that piece reaches an `await`, which is the code saying: I am waiting for something, run someone else meanwhile. Node.js and Redis work the same way at heart. Nothing runs in parallel inside the loop, so a function between two `await` points is never interrupted. In Traed, `_handle_tick_data` is an ordinary function called for each tick. It updates the candle and then uses `asyncio.create_task` to schedule `_evaluate_on_tick`, so the tick handler returns at once and the loop can take the next tick.",
      },
      {
        heading: "The single writer, and where the races still hide",
        body: "If only one thread changes shared state, you need no locks around it. The catch is that a race can still happen at every `await`, because other tasks run there. Suppose a basket allows at most 2 open positions and two symbols both signal at the same moment. Each task checks the count (1), awaits something, then adds a position, and you end with 3. Traed handles this two ways. It keeps a per-symbol `asyncio.Lock` so one symbol's ticks are processed in order. And it counts entry reservations for slots that are promised but not yet positions, so the cap check sees the real total.",
      },
      {
        heading: "Blocking calls are the enemy",
        body: "While one task runs, no other task does. A broker call that takes 2 seconds, made directly inside a coroutine, delays every other strategy's tick by 2 seconds. Two fixes exist. For slow I/O, hand the call to a worker thread with `asyncio.to_thread` and `await` the result. For heavy computing, even a thread is not enough, because Python's global interpreter lock lets only one thread run Python code at a time. Traed bounds slow work too: an index-volume lookup on the decision path waits at most 5 seconds, so a slow database costs the rule its volume weights, never the decision its timing.",
      },
      {
        heading: "Saying it about Traed",
        body: "We run paper and live strategies in one engine process on one event loop, started as a single uvicorn worker. Each strategy has its own executor, and each executor handles its ticks on that loop, so positions have one writer and we need almost no locking. We chose this because it is simple and fast enough for minute bars. The cost is that anything slow stalls everything, so broker calls go to threads and backtests run in a separate spawned process. We also cannot add a second worker without moving that state outside the process. We would revisit when one box or one loop is no longer enough, probably by sharding strategies across processes.",
      },
    ],
    complexityDerivation:
      "The invariant is simple: at any instant, at most one piece of code is changing the engine's state. If that holds, a position can never be half-updated when another task reads it, and you can reason about the program by reading it top to bottom between two `await` points. The argument for speed is that trading rules on minute bars are cheap to evaluate, and the work is mostly waiting for the network. A single thread that never waits can serve many strategies, because the waiting is done by the operating system. LMAX showed the extreme form of this: business logic on one thread, reported at millions of orders per second. The argument stops holding in three places. First, when any handler blocks, because the whole engine then waits. Second, when the work is CPU-heavy, because one core is the ceiling. Third, when you need more than one process, because the guarantee covers only memory inside one process. A lock in a second process's memory protects nothing, so you must shard the state, or move it to a shared store with real cross-process locks.",
    variants: [
      {
        name: "Single-threaded loop that owns all state",
        when: "Moderate load, and state that is easier to keep in memory than to share.",
        delta:
          "The simplest design and the one Traed uses. One slow handler stalls everything, and the ceiling is one core.",
      },
      {
        name: "Loop plus worker threads or a worker process",
        when: "The loop is fine but some calls are slow or heavy.",
        delta:
          "The loop stays the only writer. Slow I/O goes to threads, and CPU-heavy jobs go to another process whose result comes back as an event.",
      },
      {
        name: "One single-threaded process per shard",
        when: "One core is no longer enough.",
        delta:
          "Split by symbol or by user so each process is its own single writer. Cross-shard rules, such as a total exposure cap, need an explicit coordinator.",
      },
    ],
    tradeoffs: [
      {
        vs: "Multi-threaded workers sharing state behind locks",
        pick: "A single-threaded loop for minute-bar strategies",
        because:
          "Locks add deadlocks and subtle ordering bugs, and you gain speed you cannot use at minute-bar rates. Pick threads only when measured load needs more than one core and state can be partitioned.",
      },
      {
        vs: "Several uvicorn workers behind the port",
        pick: "One worker while strategy state lives in process memory",
        because:
          "Each worker would hold its own map of running strategies, and on start each would launch every active strategy. Several workers need the state moved out first.",
      },
      {
        vs: "Polling the broker on a timer",
        pick: "Pushed ticks and candle-close events",
        because:
          "Push costs one long-lived connection and gives the lowest delay. Polling is easier to write but wastes calls and adds up to one interval of delay, plus the risk of rate limits.",
      },
    ],
  },
  realWorld: [
    {
      system: "LMAX Exchange",
      kind: "industry",
      problem:
        "A retail trading venue needed very high throughput with predictable latency, and found locks and queues between threads were the bottleneck.",
      applied:
        "LMAX runs its core business logic on a single thread, fed by a ring buffer called the Disruptor. Because one thread owns all the state, there is no locking inside the business logic. Its engineers published that this design reached millions of orders per second on one thread.",
      evidence: "LMAX architecture, described by Martin Fowler and in the LMAX Disruptor technical paper",
      impact: "Shows that one writer can be faster than many threads, if it never blocks.",
    },
    {
      system: "Redis command execution",
      kind: "industry",
      problem:
        "A shared in-memory store has to give every client a consistent view without slowing everyone with locks.",
      applied:
        "Redis executes commands one at a time on a single thread. A command such as `INCR` is therefore atomic without any locking, and a slow command, such as scanning every key, makes every other client wait. Redis documents this and warns against slow commands in production.",
      evidence: "Redis documentation: the single-threaded command model and the warning about slow commands",
      impact: "Same trade as Traed: simple atomicity, paid for by the rule that nothing may be slow.",
    },
    {
      system: "Traed live and paper engine",
      kind: "yours",
      problem:
        "Several strategies must run at once, each with its own ticks and orders, without sharing a lock-heavy design.",
      applied:
        "A process-wide `StrategyManager` holds a map of running strategies. Each has its own `UniversalStrategyExecutor`, which turns ticks into candles and schedules evaluation on the same event loop. The service starts as one uvicorn process with no worker count set, so there is exactly one loop. Slow broker and database calls use `asyncio.to_thread`.",
      evidence:
        "strategy-engine/app/services/strategy_manager.py; strategy-engine/app/services/universal_strategy_executor.py; deployment-scripts/deploy.sh (the engine service ExecStart)",
      impact:
        "Position updates have a single writer. The cost is that the loop must never be blocked for long.",
    },
    {
      system: "Traed backtest process pool",
      kind: "yours",
      problem:
        "A heavy backtest running inside the live process held the interpreter lock and the memory, and the tick listener could not run.",
      applied:
        "Heavy jobs now run in a separate process, started fresh for every job (`spawn`), with one worker by default. The module comment records the earlier production incident: a live tick feed stayed dead for about 21 hours while a large backtest used the memory. Progress and cancellation travel through the database, so they cross the process boundary.",
      evidence: "strategy-engine/app/services/backtest_dispatch.py",
      impact:
        "A crashed or memory-hungry backtest cannot starve the live loop. The price is one backtest at a time on this box.",
    },
  ],
  insights: [
    {
      t: "One writer means no locks, not no races",
      d: "Inside one function between two `await` points nothing else runs. But every `await` lets other tasks change state, so check-then-act across an `await` can still race.",
    },
    {
      t: "Blocking is the one forbidden thing",
      d: "A 2-second blocking call stalls every strategy for 2 seconds. Slow I/O goes to a thread, heavy computing goes to another process.",
    },
    {
      t: "A thread is not isolation for CPU work",
      d: "The global interpreter lock lets one thread run Python at a time. A backtest in a thread still starves the tick listener, which is why Traed uses a separate process.",
    },
    {
      t: "In-process state decides your worker count",
      d: "While strategy state lives in process memory, one worker is a requirement, not a default. To scale out, move or shard the state first.",
    },
  ],
  pitfalls: [
    "Calling a blocking function, such as a synchronous broker client, directly inside an `async` function. It looks fine in testing with one strategy and freezes everything in production.",
    "Assuming the single thread makes check-then-act safe. If an `await` sits between the check and the update, another task can run in the gap.",
    "Adding `--workers 4` to get more speed. Each worker gets its own copy of in-memory state, so strategies and positions are duplicated, not shared.",
  ],
  quiz: [
    {
      q: "In an asyncio event loop, what is the `await` keyword mainly for?",
      options: [
        "To tell the loop this task is waiting, so it may run another task meanwhile",
        "To start a new operating-system thread for the called function",
        "To make the called function run faster than it would normally",
        "To lock shared state so that no other task can read it",
      ],
      answer: 0,
      why: "`await` is a hand-off point. The current task pauses and the loop runs other ready tasks. It does not create a thread, speed anything up, or lock anything.",
      difficulty: "recall",
      distractors: [
        "",
        "Threads feel natural for concurrency, but asyncio runs on one thread; `await` only yields control.",
        "It can make a program more responsive overall, but the awaited function itself runs no faster.",
        "Locks are a separate tool. `await` does the opposite of locking, since it lets other tasks run and change state.",
      ],
    },
    {
      q: "What does the single-writer principle say?",
      options: [
        "Every strategy must keep its own private copy of the market data",
        "Only one component changes a given piece of state, so updates cannot collide",
        "Only one user may be logged in to the platform at any one time",
        "Every order must be sent to the broker by a single broker account",
      ],
      answer: 1,
      why: "Single writer is about who may change a piece of state. If one thread or process owns it, there is no concurrent update to protect against.",
      difficulty: "recall",
      distractors: [
        "Private copies avoid sharing, which sounds related, but the principle is about ownership of writes, not copying data.",
        "",
        "The word single suggests one user, but it concerns code paths that write state, not people.",
        "Order routing and accounts are a different design question. The principle is about internal state ownership.",
      ],
    },
    {
      q: "Your engine handles 6 strategies on one event loop. A new feature calls a synchronous broker margin endpoint that takes about 3 seconds, directly inside an `async` handler. What happens during those 3 seconds?",
      options: [
        "Only that strategy is delayed, because each strategy has its own task",
        "The loop switches to the other strategies automatically, so nothing is delayed",
        "Every strategy on the loop is delayed, as no other task can run until the call returns",
        "The operating system moves the call to another core, so the loop is unaffected",
      ],
      answer: 2,
      why: "A blocking call never yields to the loop. Tasks are cooperative, so the other five strategies cannot run until it returns. The fix is `asyncio.to_thread` or an async client.",
      difficulty: "apply",
      distractors: [
        "Separate tasks sound isolated, but they share one thread and only switch at an `await`.",
        "Automatic switching happens only at `await` points. A synchronous call has none.",
        "",
        "The operating system schedules threads, not tasks inside a loop. The loop's thread is simply stuck in the call.",
      ],
    },
    {
      q: "A basket strategy allows at most 2 open positions. Two symbols signal in the same second, and both tasks check the count, `await` an order step, then add a position. You end up with 3 positions. Which change fixes it most directly?",
      options: [
        "Run the whole engine in two processes so each gets fewer symbols",
        "Check the count again after the order, and undo the extra position if needed",
        "Add more threads so each symbol is handled faster than the other",
        "Reserve a slot at the moment of the check, so the next check sees it",
      ],
      answer: 3,
      why: "The race is check-then-act across an `await`. Counting a reservation immediately, with no `await` between check and increment, makes the second task see the real total. This is what Traed's entry reservations do.",
      difficulty: "apply",
      distractors: [
        "Splitting the engine across processes removes shared memory, but then the cap itself needs cross-process coordination.",
        "Checking after the fact means a real order may already have reached the broker. Prevention is better than undoing.",
        "More threads add more concurrency, which makes the race more likely, not less.",
        "",
      ],
    },
    {
      q: "Your engine is single-process and tests well. A teammate suggests raising uvicorn workers from 1 to 3 for headroom. Strategy state is held in an in-memory map in each process. What is the main risk?",
      options: [
        "Each worker would hold its own map and could start the same strategies again",
        "Python will refuse to start more than one worker for a single application",
        "The three workers will share the map, so the map must be locked often",
        "The extra workers will run slower because of the interpreter lock",
      ],
      answer: 0,
      why: "Workers are separate processes with separate memory. On start, each would find active strategies missing from its own map and launch them, so one strategy could place duplicate orders.",
      difficulty: "apply",
      distractors: [
        "",
        "Uvicorn does allow multiple workers; the problem is the state, not the tool.",
        "Processes do not share ordinary memory, so there is no shared map to lock. That is exactly the problem.",
        "The interpreter lock is per process, so separate workers are not slowed by each other's lock.",
      ],
    },
    {
      q: "On an NSE session of 375 minutes, you evaluate rules on one-minute candles for a single symbol. Which design gets fresh decisions with the least wasted work?",
      options: [
        "Poll the broker's quote endpoint every second and compare against the last value",
        "Subscribe to a tick stream, build the candle yourself, and evaluate on each close",
        "Poll the broker's historical-candle endpoint every 5 seconds all day",
        "Run a timer that wakes every minute and fetches the last candle from the database",
      ],
      answer: 1,
      why: "A pushed tick stream gives data as it happens, and the candle close is the only moment a minute-bar rule can change. That is about 375 evaluations, and no polling calls.",
      difficulty: "apply",
      distractors: [
        "One-second polling is simple, but it means about 22,500 calls to learn 375 closes, and it risks rate limits.",
        "",
        "Polling history every 5 seconds is cheaper than every second, but it still wastes calls and adds up to 5 seconds of lag.",
        "A one-minute timer drifts against the candle boundary, and the stored candle may not exist yet when it fires.",
      ],
    },
    {
      q: "A heavy backtest takes about 20 minutes of pure CPU. Where should it run so the live tick listener keeps working?",
      options: [
        "In a worker thread inside the live process, using `asyncio.to_thread`",
        "As an asyncio task in the live loop, with `await` calls sprinkled through it",
        "In a separate process that the live engine starts and then ignores",
        "In the live process, but only after the market has closed for the day",
      ],
      answer: 2,
      why: "CPU-bound Python in a thread still competes for the interpreter lock with the loop thread, and it shares the process memory. A separate process isolates both CPU and memory, as Traed's spawned pool does.",
      difficulty: "judge",
      distractors: [
        "Threads fix blocking I/O, but for CPU-bound Python the global interpreter lock keeps the loop starved.",
        "Adding `await` helps only if the code actually yields often, and the heavy parts are computation, not waiting.",
        "",
        "After-hours scheduling avoids today's tick feed but not memory growth, and backtests are often launched by users during the day.",
      ],
    },
    {
      q: "You have 3,000 symbols and one event loop at 85% CPU on one core during the opening minutes. Which next step best fits the single-writer idea?",
      options: [
        "Add worker threads that all update the same shared position dictionary",
        "Switch the whole design to polling so ticks arrive at a steadier pace",
        "Remove the per-symbol locks to save time, since the loop is single-threaded",
        "Split symbols across several single-threaded processes, each owning its own symbols",
      ],
      answer: 3,
      why: "Sharding keeps one writer per piece of state while using more cores. Threads sharing a dictionary bring back locks and races, and cross-shard limits then need an explicit coordinator.",
      difficulty: "judge",
      distractors: [
        "More threads on shared state undo the main benefit of the design and add lock contention.",
        "Polling does not reduce the work; it only changes how data arrives and adds delay.",
        "The locks protect ordering across `await` points, so removing them can bring races back and does not relieve CPU.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-event-loop-margin-call",
      scenario:
        "One server runs your engine as a single process with 6 live strategies on minute bars. You add a pre-trade check that calls the broker's margin endpoint. The client library is synchronous and the call takes between 1 and 4 seconds. Candles close every minute, and an entry should be placed within a second or two of the close. You are the only developer. How do you add the check?",
      options: [
        {
          label: "Call the synchronous client directly inside the async evaluation function",
          appeal:
            "Least code and easy to read, and it works in a quick test with one strategy.",
        },
        {
          label: "Wrap the call in `asyncio.to_thread` and await the result",
          appeal:
            "The loop keeps serving other strategies while a worker thread waits on the network.",
        },
        {
          label: "Raise uvicorn to 3 workers so a slow call blocks only one of them",
          appeal:
            "No code change in the check itself, and it looks like a quick way to add capacity.",
        },
        {
          label: "Rewrite the engine on threads with a lock around every position update",
          appeal:
            "Threads feel like the standard answer to waiting, and each strategy gets its own.",
        },
      ],
      best: 1,
      verdict:
        "The wait is pure network time, so a worker thread is enough: the loop stays free and remains the only writer of position state. Calling directly would stall all 6 strategies for up to 4 seconds right at candle close. Three workers would duplicate in-memory state. A thread rewrite adds locks and risk to fix a problem one line solves.",
      claims: [
        {
          text: "You accept a thread-pool hand-off that the code must await, in exchange for keeping the loop free.",
          axis: "trade",
          correct: true,
          note: "The cost is a small amount of plumbing, and the result arrives later as an awaited value.",
        },
        {
          text: "You give up the single-writer property by moving the call into a thread.",
          axis: "trade",
          correct: false,
          note: "The thread only waits on the network and returns a value. The loop still applies every state change, so there is still one writer.",
        },
        {
          text: "A direct synchronous call would delay every strategy on the loop, not just the one making the call.",
          axis: "failure",
          correct: true,
          note: "Tasks switch only at `await`. A blocking call holds the single thread for its whole duration.",
        },
        {
          text: "If the margin call hangs, the thread approach alone is enough and no timeout is needed.",
          axis: "failure",
          correct: false,
          note: "A hung call still holds a pool thread forever, and the decision waits. Bound the wait with a timeout and decide what happens on expiry.",
        },
        {
          text: "Log how long each margin call takes and how many pool threads are busy, so slow calls show up early.",
          axis: "measure",
          correct: true,
          note: "Latency of the call and pool use are the leading indicators. Without them you find out from a missed entry.",
        },
        {
          text: "Measure the average call time only, since averages show whether entries will be late.",
          axis: "measure",
          correct: false,
          note: "An average of 1.5 seconds can hide occasional 4-second calls that make an entry late. Look at the slowest calls, not the mean.",
        },
      ],
    },
    {
      id: "sd-event-loop-shard-symbols",
      scenario:
        "A larger firm runs a rule engine for 3,000 symbols in one single-threaded process. In the first ten minutes after the open it reaches 85% of one core, and ticks begin to queue. Risk limits are per symbol, plus one firm-wide exposure cap that must never be exceeded. The machine has 16 cores, and the team has 8 engineers. What should they do?",
      options: [
        {
          label: "Buy a faster single core and keep the single process",
          appeal:
            "No design change, and the single-writer guarantee stays intact.",
        },
        {
          label: "Use many threads in the one process, sharing one position store with locks",
          appeal:
            "Uses all 16 cores and keeps one address space, so the exposure cap is one variable.",
        },
        {
          label: "Shard symbols across single-threaded processes, with a small coordinator for the exposure cap",
          appeal:
            "Each shard stays lock-free and the cores are used. Only the cap crosses shards.",
        },
        {
          label: "Move to polling so load is spread evenly through each minute",
          appeal:
            "Smoother load looks like less peak pressure on the process.",
        },
      ],
      best: 2,
      verdict:
        "Peak load already at 85% of one core means a faster core buys little headroom. Sharding gives near-linear use of 16 cores while keeping each shard a lock-free single writer. The one cross-symbol rule, the exposure cap, is the thing that needs explicit coordination. Threads on a shared store bring back lock contention at exactly the busiest minutes.",
      claims: [
        {
          text: "Sharding moves the firm-wide exposure cap from a simple variable to a coordination problem.",
          axis: "trade",
          correct: true,
          note: "Within one process the cap is one number. Across shards it needs a coordinator, reservations or a conservative per-shard budget.",
        },
        {
          text: "Sharding gives you more cores while every shard still has a single writer.",
          axis: "trade",
          correct: true,
          note: "That is the point of the design: scale by multiplying single-writer units.",
        },
        {
          text: "Sharding removes the need for any limit on exposure, since each shard is safe by itself.",
          axis: "trade",
          correct: false,
          note: "Each shard is internally safe, but the total across shards is not checked by anyone unless you build that check.",
        },
        {
          text: "If the coordinator is slow or down, shards might take new risk without the shared cap being checked.",
          axis: "failure",
          correct: true,
          note: "Decide in advance: fail closed and stop opening new positions, or fall back to a smaller per-shard budget.",
        },
        {
          text: "With 16 loops instead of one, a blocking call is no longer a problem.",
          axis: "failure",
          correct: false,
          note: "Each shard is still a single loop. A blocking call stalls every symbol in its shard, so the rule against blocking stays.",
        },
        {
          text: "Watch each shard's tick queue depth and tick-to-decision delay, so a shard overloaded by a few busy symbols stands out.",
          axis: "measure",
          correct: true,
          note: "Opening-minute activity is uneven across symbols, so one shard can queue while others idle. Per-shard numbers show it.",
        },
        {
          text: "Watch average CPU across all 16 cores to know whether sharding worked.",
          axis: "measure",
          correct: false,
          note: "An average hides one shard at 100% while others idle. Watch per-shard queue depth and tick-to-decision delay.",
        },
      ],
    },
    {
      id: "sd-event-loop-backtest-cpu",
      scenario:
        "Your single-server platform runs live strategies on an event loop. Users can launch a backtest that is pure computation: about 15 minutes of CPU and a few gigabytes of memory for a long options history. The server has 4 cores and limited memory, no swap, and live positions are open during market hours. You need live ticks processed within a second at all times. Where should the backtest run?",
      options: [
        {
          label: "As a FastAPI background task, which runs in a worker thread of the live process",
          appeal:
            "It is built into the framework and takes a few lines of code.",
        },
        {
          label: "As a task on the live event loop, with periodic `await asyncio.sleep(0)` calls",
          appeal:
            "Cooperative yielding keeps the loop alive, and nothing else needs to be set up.",
        },
        {
          label: "On the live process, but queued to run only after 15:30",
          appeal:
            "Avoids market hours entirely and needs no new infrastructure.",
        },
        {
          label: "In a separate process started fresh for each job, with a limit of one at a time",
          appeal:
            "Isolates CPU and memory from the live process, and a crash cannot take live trading down.",
        },
      ],
      best: 3,
      verdict:
        "The job is CPU-bound and memory-heavy, and live positions are open. A thread shares the interpreter lock and the heap with the tick listener, so it can still starve it and grow its memory. A separate process, fresh per job, isolates both and frees the memory on exit. One at a time suits a small box with no swap.",
      claims: [
        {
          text: "You accept that only one backtest can run at a time, so a second user waits in a queue.",
          axis: "trade",
          correct: true,
          note: "A limit of one protects a small box from two memory-heavy jobs. The cost is waiting time for the second user.",
        },
        {
          text: "You also accept the overhead of starting a new interpreter for each job.",
          axis: "trade",
          correct: true,
          note: "Starting fresh costs seconds, which is small against a 15-minute job and buys a clean memory state every time.",
        },
        {
          text: "A background thread in the live process is safe because the job is not on the event loop.",
          axis: "failure",
          correct: false,
          note: "A CPU-bound thread holds the interpreter lock for long stretches, so the loop thread is starved anyway, and the heap is shared.",
        },
        {
          text: "If the job is killed for using too much memory, the live engine can keep running.",
          axis: "failure",
          correct: true,
          note: "This holds only with a separate process, and only if the service is set up so one killed process does not stop the whole unit.",
        },
        {
          text: "Measure the delay from tick arrival to decision in the live engine while a backtest runs.",
          axis: "measure",
          correct: true,
          note: "That is the number the isolation exists to protect. Test it with a real backtest running.",
        },
        {
          text: "Measure the backtest's finishing time only, because that is what users notice.",
          axis: "measure",
          correct: false,
          note: "Finishing time matters to users, but the design goal is to leave live decisions unaffected, which this number does not show.",
        },
      ],
    },
  ],
};

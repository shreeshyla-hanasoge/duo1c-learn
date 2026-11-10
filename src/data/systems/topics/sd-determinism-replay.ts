import type { Topic } from "../../types.ts";

export const sdDeterminismReplay: Topic = {
  id: "sd-determinism-replay",
  title: "Determinism, event sourcing and replay",
  tier: 3,
  week: 6,
  depth: "deep",
  summary:
    "If the same inputs always give the same outputs, you can replay a trading day to reproduce a bug. Hidden inputs break this; a recorded event log restores it.",
  why: "Traed once ran the same options backtest three times and got 10, then 8, then 9 trades. Nothing in the data changed, so the results could not be trusted at all. Determinism is what makes a backtest evidence and a live bug reproducible. This topic names the hidden inputs that break it, explains why serious trading systems keep an event log, and shows where Traed stands: its backtest is repeatable again, its live ticks are not yet recorded, and you have a local replay stack for testing.",
  learn: {
    intuition:
      "Think of a cricket scorer with a ball-by-ball book. Give two scorers the same book and they must reach the same total, the same strike rate, the same partnership record. That is determinism: the answer depends only on what is written in the book. Now suppose one scorer also glances at the stadium clock, or breaks ties by whichever name comes to mind first. Two honest scorers can now disagree, and nobody can say why. Those glances are hidden inputs. The ball-by-ball book is the second idea. If every ball was recorded, you can rebuild the whole match at any point, and you can replay a disputed over to see exactly what happened. A trading system works the same way. Record what came in, make the decision a pure function of it, and any day can be re-run. Without the record, a bad trade is a story you can only argue about.",
    mechanics: [
      {
        heading: "Hidden inputs: what the function secretly reads",
        body: "A function is deterministic if its output depends only on its arguments. It stops being so when it quietly reads something else: the wall clock, a random number, the order a set or dictionary is walked, a cache shared with an earlier call, the time zone of the database session, or memory addresses. Python makes this concrete: the iteration order of a set of strings changes with each process because string hashing is randomised. If two strikes are equally close to a target premium and you take whichever comes first, your pick may differ from run to run. The cure is to make every such input an explicit argument or to sort with a stated tiebreak.",
      },
      {
        heading: "A real one: the cache keyed by memory address",
        body: "Traed's options backtester kept a per-slice time-index cache keyed by `id(day_data)`. Each slice's list was thrown away after use, and CPython may reuse the address of a freed object, so a later slice could hit a stale entry built for a different timestamp. Candle time and price lookups were then wrong, and which slices were wrong depended on allocation timing. The same run produced 10, 8, then 9 trades. The fix was to reset the cache at every timestamp, and the team checked repeat runs, including with a randomised hash seed. The lesson: this bug made results wrong and unrepeatable, which is why repeatability is itself a test.",
      },
      {
        heading: "The event log as source of truth",
        body: "Event sourcing stores the sequence of inputs, not just the latest state. State is a fold over the log: start empty, apply each event in order. LMAX, a London retail trading exchange, built its trading core this way. A single thread processes journalled input events, and because the logic is deterministic, replaying the journal rebuilds the state exactly. Kafka applies the same idea as a platform: an ordered, durable log that consumers can re-read from any offset. Two things you gain: crash recovery by replay, and bug reproduction by replay. The price is storage and discipline, since every effect must come from an event.",
      },
      {
        heading: "Replaying a trading day to reproduce a bug",
        body: "Traed's local replay stack runs a real engine on your branch against a local relay, with a simulator feeding historical prices through it. The engine cannot tell replay from live, which is the point. Two details matter. The simulator replays one price per candle, taken from the close, so intra-minute tick order is not reproduced. And a time zone was a hidden input: option rows are stored as naive IST wall-clock labelled as UTC, so an IST laptop reading them shifted every row by five and a half hours, and the replay found no option data until the database session was pinned to UTC.",
      },
      {
        heading: "Saying it about Traed",
        body: "Our backtest is repeatable: given stored candles and option-chain rows, the same run gives the same trades, and we fixed the one hidden input, a cache keyed by memory address, that used to make it neither. For live and paper we do not yet record raw ticks, so we cannot replay a bad order from its exact input. Today we replay historical prices through a real engine on a local relay, which reproduces decisions at minute resolution but not tick order. A tick journal is planned. We chose not to build it first because one user and minute bars let candles answer most questions. We would build it when a bug needs tick order.",
      },
    ],
    complexityDerivation:
      "The claim is: if the function is pure and the input log is complete and ordered, then replay reproduces the output, so any state or decision can be reconstructed. The argument has two halves, and each fails in a known way. Purity fails when a hidden input slips in. Any single one is enough, because one unlogged input turns an exact rebuild into an approximation that cannot be told apart from an exact one until it matters. Completeness fails when the log leaves something out. Replaying minute candles reproduces a minute-resolution strategy, but a stop that triggered on a tick at 11:42:17 cannot be reproduced from candles, because the order of ticks inside the minute is gone. The design also stops being worth its cost when the state is small and cheap to recompute, or when no decision depends on the missing detail. Replay costs storage, retention rules and the discipline that every effect arrives as an event. It pays when bugs are rare, expensive and depend on exact order, which describes live order handling far better than it describes a daily batch report. A third limit: determinism proves repeatability, not correctness. A deterministic bug is still a bug.",
    variants: [
      {
        name: "Event sourcing with snapshots",
        when: "State is large or the log is long, and you need fast recovery.",
        delta:
          "Save periodic snapshots of state and replay only the events after the latest one. Recovery time is bounded by the snapshot interval, at the cost of snapshot storage and versioning.",
      },
      {
        name: "Input journal only (record and replay)",
        when: "The system is not event-sourced but you want to reproduce incidents.",
        delta:
          "Record raw inputs such as ticks and orders with their timestamps, and keep the normal database for state. Replay feeds the journal back through the unchanged code. Cheaper to adopt, but replay is exact only if the code is deterministic.",
      },
      {
        name: "Seeded randomness and a fake clock",
        when: "You need random or time-based behaviour in simulation, such as fill models, yet want repeatable runs.",
        delta:
          "Inject a seeded random generator and an injectable clock instead of calling the global ones. The same seed and the same clock script give the same run, and a test can change either on purpose.",
      },
    ],
    tradeoffs: [
      {
        vs: "Rebuilding state from a database snapshot only",
        pick: "An event log for the inputs that drive decisions",
        because:
          "A snapshot shows what state was, not how it arrived. For incident work you need the sequence of inputs, and a log can also regenerate the snapshot, though a snapshot cannot regenerate the log.",
      },
      {
        vs: "Logging every tick forever",
        pick: "A journal with retention and a disk guard",
        because:
          "On one server, unbounded tick storage can fill the disk, which is itself an outage. A bounded daily journal keeps the incidents you still care about replayable.",
      },
      {
        vs: "Real randomness in simulated fills",
        pick: "A seeded generator, or fixed rules",
        because:
          "Unseeded randomness makes two runs of the same day differ, so you cannot tell a code change from luck. A seeded run is varied but repeatable.",
      },
    ],
  },
  realWorld: [
    {
      system: "LMAX Disruptor and the single-threaded business processor",
      kind: "industry",
      problem:
        "A retail trading exchange needed very high throughput with the ability to recover and to reproduce any past state exactly.",
      applied:
        "Martin Fowler's published write-up of the LMAX architecture describes a business logic processor that runs on one thread, consumes a stream of input events, and journals every input before processing. Because the logic is deterministic, state can be rebuilt by replaying the journal, and production events can be replayed to reproduce a problem.",
      evidence: "Martin Fowler, 'The LMAX Architecture' (martinfowler.com)",
      impact:
        "Recovery and debugging are by replay, and the design avoids locks on the hot path by keeping the logic single-threaded.",
    },
    {
      system: "Apache Kafka's log as source of truth",
      kind: "industry",
      problem:
        "Many systems need to rebuild derived state, such as a cache or a report, without asking the original producer to send everything again.",
      applied:
        "Kafka documents a durable, ordered log per partition. Consumers track an offset and can move it back to re-read history, so a new or fixed consumer can recompute its state from the same inputs.",
      evidence: "Apache Kafka documentation: the log, consumer offsets and reprocessing",
      impact:
        "Reprocessing after a bug fix is a routine operation rather than a data-recovery project.",
    },
    {
      system: "Traed: the id()-keyed cache and the repeatable backtest",
      kind: "yours",
      problem:
        "The streaming options backtest was non-deterministic and wrong: the same run gave 10, 8 and 9 trades in one process.",
      applied:
        "The time-index cache was keyed by `id()` of a transient list, so reused addresses produced stale hits. The cache is now reset at every timestamp. Repeat runs were checked, including under randomised hash seeds, and results from before the fix were flagged as suspect.",
      evidence: "ROADMAP.md (Backtest performance + determinism) and ARCHITECTURE.md §5.1",
      impact:
        "Backtests are repeatable again, and the team knows which older results to distrust.",
    },
    {
      system: "Traed: local tick-replay stack",
      kind: "yours",
      problem:
        "A fix to engine behaviour could only be tested against the deployed engine, because the simulator and the engine shared the same relay as production.",
      applied:
        "A local relay, a simulator and a local engine run on one machine. The simulator replays historical prices, one per candle, in time order, and the engine cannot tell replay from live. An acceptance check compares entries with exits and looks for positions left open.",
      evidence: "docs/dev-tick-replay.md",
      impact:
        "Engine changes are verified end to end without touching the shared relay. The documented gap is tick order, because candles are replayed and raw ticks are not captured.",
    },
  ],
  insights: [
    {
      t: "Determinism means no hidden inputs",
      d: "Clock, randomness, set and dictionary order, shared caches, time zones and memory addresses are all inputs. Make them arguments or remove them.",
    },
    {
      t: "Repeatability is a test you can run",
      d: "Run the same job several times and compare the outputs. It caught a bug that made Traed's backtest wrong as well as unrepeatable.",
    },
    {
      t: "Log the inputs, derive the state",
      d: "An ordered event log lets you rebuild state and replay any day. A snapshot alone shows the state, not how it got there.",
    },
    {
      t: "Replay is only as good as the log",
      d: "Candles replay minute-level decisions. A stop that fired inside a minute needs the ticks, which Traed does not yet record.",
    },
  ],
  pitfalls: [
    "Believing a deterministic result is a correct one. Determinism says repeatable; the id()-keyed cache bug was wrong, and a version that was always wrong in the same way would still be deterministic.",
    "Calling replay exact when the journal is coarser than the decision. Candle replay cannot reproduce which tick hit a stop first within the minute.",
    "Letting a simulation call the global random generator or the system clock directly. Inject a seeded generator and a clock so a run can be repeated on purpose.",
  ],
  quiz: [
    {
      q: "Which of these is a hidden input that can make the same code give different outputs?",
      options: [
        "A numeric argument passed explicitly to the function",
        "The list of candles the function is given",
        "The wall-clock time read inside the function",
        "A constant defined once at the top of the file",
      ],
      answer: 2,
      difficulty: "recall",
      why: "A hidden input is anything the output depends on that is not in the arguments. The wall clock changes between calls, so the same arguments can give different results.",
      distractors: [
        "Explicit arguments are visible inputs; replaying with the same ones reproduces the result.",
        "Candles passed in are an explicit input and can be recorded and replayed.",
        "",
        "A fixed constant does not change between runs, so it does not break repeatability.",
      ],
    },
    {
      q: "In an event-sourced system, what is the source of truth?",
      options: [
        "The ordered log of events, with state derived by replaying it",
        "The most recent snapshot of state in the database",
        "The in-memory objects held by the running process",
        "The monitoring dashboard that shows current positions",
      ],
      answer: 0,
      difficulty: "recall",
      why: "State is a fold over the event log. Snapshots and in-memory objects are conveniences that can be rebuilt from it.",
      distractors: [
        "",
        "A snapshot is derived data. It shows what state was but cannot reproduce how it arrived.",
        "Process memory is lost on a crash; the log is what lets you rebuild it.",
        "A dashboard is a view of the state, not a record that can be replayed.",
      ],
    },
    {
      q: "You re-run the same stored-data backtest three times on one machine and get 10, 8 and 9 trades. The candles and option rows in the database have not changed. What is the best first suspicion?",
      options: [
        "The broker's historical data was changed between the runs by the vendor",
        "Network latency changed how quickly the slices arrived in each run",
        "The strategy's random entry timing is simply working as designed",
        "State kept between slices and keyed by something unstable, like a memory address",
      ],
      answer: 3,
      difficulty: "apply",
      why: "With fixed inputs, variation comes from a hidden input inside the code. A cache keyed by object address can be hit with stale entries once addresses are reused, depending on allocation timing.",
      distractors: [
        "The backtest reads stored rows, not live broker data, so this cannot vary between runs.",
        "A stored-data backtest has no network in the loop to speed up or slow down.",
        "A rule-based strategy on stored data has no randomness, and a design that varied would not be testable.",
        "",
      ],
    },
    {
      q: "A live stop-loss exit fired at 11:42:17 and you want to reproduce it. You only stored one-minute candles for the day. What can replay show?",
      options: [
        "Exactly the same exit, because candles contain every price",
        "The minute's decision only, since tick order inside the minute is lost",
        "Nothing, because replay needs live broker access",
        "The exit, but only if you re-fetch candles from the broker",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A candle summarises a minute as open, high, low, close. Which price hit the stop first inside the minute cannot be recovered from it, so a tick journal is needed for exact reproduction.",
      distractors: [
        "A candle hides the order of ticks inside the minute, so an intra-minute trigger is not determined by it.",
        "",
        "Replay uses recorded data and a local engine; no broker access is needed.",
        "Re-fetching gives the same candles again, so it adds no tick information.",
      ],
    },
    {
      q: "Your strike selector picks the strike closest to a target premium of 100. Two strikes are equally close, and it takes the first from a Python set of strike keys. Results change from process to process. What fixes it?",
      options: [
        "Sort the candidates and break ties by an explicit rule, e.g. lower strike",
        "Run the selector twice and keep whichever answer came first",
        "Set a larger cache so that every lookup is faster",
        "Convert the strikes to floats before putting them into the set",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Set iteration order is not defined and can change per process. A stated tiebreak turns an accident of ordering into a rule.",
      distractors: [
        "",
        "Running it twice only samples the randomness; it does not remove it.",
        "A cache changes speed, not the order candidates are visited.",
        "Another type does not define an order. The choice among equal candidates is still left to the container.",
      ],
    },
    {
      q: "You replay a month of NIFTY option data on an IST laptop and the engine finds no option rows, though the same data works on the server. Option timestamps are stored as naive IST labelled as UTC. What is the likely hidden input and the fix?",
      options: [
        "The laptop clock is wrong; synchronise it to a time server",
        "The market calendar is missing; add the holidays for the month",
        "The database session time zone shifts reads; pin the session to UTC",
        "The simulator sends ticks too fast; slow its interval down",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A TIMESTAMP column is converted using the session time zone. On an IST session, UTC-labelled values are read five and a half hours off, so lookups miss. Pinning the session to UTC restores the stored meaning.",
      distractors: [
        "A clock error of seconds would not shift every row by five and a half hours.",
        "A calendar gap would drop whole days, not shift all rows by a fixed offset.",
        "",
        "Speed changes how fast ticks arrive, not which timestamps the database lookup matches.",
      ],
    },
    {
      q: "A small team on one server wants to replay live incidents. Minute bars drive all decisions and disk is limited. Which plan is best?",
      options: [
        "Keep every tick in Redis indefinitely so nothing is ever lost",
        "Write a daily tick journal with retention and a disk-usage guard",
        "Skip recording, since candles already answer most questions",
        "Log only the final order for each trade and rebuild from that",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A bounded journal keeps the inputs for recent incidents and cannot fill the disk. It also keeps the option of exact replay open for the rare tick-order bug.",
      distractors: [
        "Unbounded in-memory storage can exhaust memory or disk and cause the outage you are trying to explain.",
        "",
        "Candles cannot reproduce tick order, which is exactly what some incidents turn on.",
        "Final orders are outputs. Without the inputs you cannot see why the decision was made.",
      ],
    },
    {
      q: "A colleague says: our backtest is fully deterministic, so we can trust its trades. Which reply is right?",
      options: [
        "Agreed; repeatable results cannot contain errors",
        "Agreed, provided the random seed is recorded with each run",
        "Disagree; only a non-deterministic backtest can contain bugs",
        "Disagree; repeatable means same answer each time, not the right answer",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Determinism is necessary for trust but not sufficient. The id()-keyed cache made results wrong and unrepeatable, but a consistent logic error would be repeatable and still wrong. Golden tests with known answers are the check for correctness.",
      distractors: [
        "A logic error repeats identically on every run, so repeatability says nothing about it.",
        "Seed tracking helps explain random variation but does nothing about a consistently wrong rule.",
        "Bugs in logic exist in deterministic code too. The claim confuses two different properties.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-determinism-replay-solo-incident",
      scenario:
        "You run one server and trade minute-bar strategies alone. Yesterday a paper exit fired at a price you cannot explain. Logs show the decision but not the ticks that led to it. Disk has about 40 GB free and ticks for one day are a few hundred megabytes. Your engine has no tick record today. How do you make the next incident reproducible?",
      options: [
        {
          label: "Stand up a Kafka cluster to hold all ticks",
          appeal: "It is the industry-standard durable log and it scales for ever.",
        },
        {
          label: "Append ticks to a compressed daily file with retention and a disk guard, and add a harness that feeds a day back into the executor with original timestamps",
          appeal:
            "It records the missing input at a size your disk can hold, and gives you a replay path using the engine you already have.",
        },
        {
          label: "Add more log lines around the decision",
          appeal: "Cheap, and it needs no new infrastructure.",
        },
        {
          label: "Re-run the backtest for the day and compare",
          appeal: "The tooling exists and costs nothing.",
        },
      ],
      best: 1,
      verdict:
        "The missing piece is the raw input. A bounded daily file fits comfortably on one disk and a harness gives exact replay. A Kafka cluster is a second system to run for one user. More log lines record outputs, not the ticks, and a backtest runs on candles, so it cannot show which tick hit the stop first.",
      claims: [
        {
          text: "You accept extra disk use and a retention rule in exchange for exact reproduction of tick-order incidents.",
          axis: "trade",
          correct: true,
          note: "The trade has both sides stated. A few hundred megabytes a day is affordable on one server if it is bounded.",
        },
        {
          text: "A tick journal replaces the need for the database.",
          axis: "trade",
          correct: false,
          note: "The journal feeds replay. Positions, orders and strategies still need the database as the record of state.",
        },
        {
          text: "If the journal write blocks the tick path, it can delay evaluation of live strategies.",
          axis: "failure",
          correct: true,
          note: "Journaling must not stall the loop that consumes ticks; use a buffered, off-path write with a kill-switch.",
        },
        {
          text: "Replay is exact as long as the executor still calls the system clock directly.",
          axis: "failure",
          correct: false,
          note: "A direct clock read is a hidden input. Replay needs the journal's original timestamps to be the clock.",
        },
        {
          text: "Track bytes written per day and the age of the last write.",
          axis: "measure",
          correct: true,
          note: "These show whether the journal is filling the disk or has silently stopped recording.",
        },
        {
          text: "Judge the journal by how many log lines the engine emits per minute.",
          axis: "measure",
          correct: false,
          note: "Log volume says nothing about whether the journal is complete or healthy.",
        },
      ],
    },
    {
      id: "sd-determinism-replay-audit-core",
      scenario:
        "A broker-dealer runs 60 strategies and an order router handling several thousand orders a minute at peak. Regulators can ask it to reconstruct any order's decision path from a given day, and incidents must be reproducible within hours. Several teams write strategy code. What architecture do you choose?",
      options: [
        {
          label: "A sequenced, durable event log of every input and decision, deterministic strategy cores, and periodic snapshots",
          appeal:
            "Any day can be rebuilt, any decision can be traced to its inputs, and recovery is bounded by the snapshot interval.",
        },
        {
          label: "Aggregated text logs from each service, searched when needed",
          appeal: "Already in place and familiar to everyone.",
        },
        {
          label: "Hourly database snapshots of positions and orders",
          appeal: "Simple, and recovery is a restore.",
        },
        {
          label: "Ask each team to document its own audit procedure",
          appeal: "Teams know their own strategies best.",
        },
      ],
      best: 0,
      verdict:
        "With an audit duty and many teams, reconstructing the path from input to decision must be a property of the system, not of each team's habits. A sequenced log with deterministic cores gives it. Text logs lose ordering across services, snapshots lose the path between them, and per-team procedures guarantee inconsistent evidence.",
      claims: [
        {
          text: "You accept the cost of storing and retaining the full input log and the engineering discipline that effects only arrive as events.",
          axis: "trade",
          correct: true,
          note: "This is the price of reconstruction. At this scale and with an audit duty it is worth paying.",
        },
        {
          text: "Deterministic cores let the firm skip storing inputs, since outputs can be recomputed.",
          axis: "trade",
          correct: false,
          note: "Recomputing needs the inputs. Determinism makes replay exact; it does not replace the log.",
        },
        {
          text: "A single non-deterministic strategy core can make replays of its decisions diverge from what happened.",
          axis: "failure",
          correct: true,
          note: "One unlogged input such as an unseeded random call breaks exact reconstruction for that component.",
        },
        {
          text: "Because the log is ordered, a replay cannot be affected by the clock.",
          axis: "failure",
          correct: false,
          note: "If code reads the system clock directly during replay, it uses a new time. The log must carry time as data.",
        },
        {
          text: "Run periodic replays of a recorded day and compare decisions with what was produced live.",
          axis: "measure",
          correct: true,
          note: "A regular replay-and-diff drill detects hidden inputs before an audit or incident does.",
        },
        {
          text: "Measure success by how many services emit structured logs.",
          axis: "measure",
          correct: false,
          note: "Structured logs help search but do not show that replay reproduces decisions.",
        },
      ],
    },
    {
      id: "sd-determinism-replay-flaky-backtest",
      scenario:
        "A solo founder's backtest of a 3-month options strategy, using data stored in the database, gives 41 trades on one run and 38 on the next, with no config change. A teammate suggests running it three times and reporting the median. Results will decide whether the strategy goes to paper trading. What do you do?",
      options: [
        {
          label: "Pin the hash seed and run single-threaded, then trust the output",
          appeal: "Cheap, and runs are then identical.",
        },
        {
          label: "Run it three times and report the median",
          appeal: "It smooths out the variation without code changes.",
        },
        {
          label: "Retry any run that looks unusual until it matches the previous one",
          appeal: "Consistency is what you want to see.",
        },
        {
          label: "Diff two runs' trade lists, find the first timestamp where they differ, trace the hidden input there, fix it, and add a repeat-run test",
          appeal:
            "It finds the actual cause, and the same test protects you from the next one.",
        },
      ],
      best: 3,
      verdict:
        "Variation on fixed stored inputs means a hidden input in the code, and variation also usually means wrong results, as Traed's own cache bug showed. Pinning or medians hide the symptom. The first differing timestamp points at the cause, and a repeat-run test keeps it from coming back.",
      claims: [
        {
          text: "You spend investigation time now to avoid deciding on numbers that may be wrong.",
          axis: "trade",
          correct: true,
          note: "A day finding the cause costs less than promoting a strategy on a result that cannot be repeated.",
        },
        {
          text: "Reporting the median of several runs is safe because noise averages out.",
          axis: "trade",
          correct: false,
          note: "If the cause is stale lookups, errors are not random noise around the right answer; the median may still be wrong.",
        },
        {
          text: "A pinned hash seed can make runs agree while a wrong cache still produces wrong trades.",
          axis: "failure",
          correct: true,
          note: "Agreement across runs shows repeatability only. The bug can remain, now repeating the same wrong answer.",
        },
        {
          text: "Because the data is stored, the variation must come from the market changing.",
          axis: "failure",
          correct: false,
          note: "Stored rows do not change between runs. The variation has to come from the code or its environment.",
        },
        {
          text: "Compare the full trade lists from two runs, not only trade counts or total P&L.",
          axis: "measure",
          correct: true,
          note: "Two different trade lists can have the same count. The first differing trade locates the cause.",
        },
        {
          text: "Compare only the final P&L of each run, since it summarises everything.",
          axis: "measure",
          correct: false,
          note: "P&L can coincide by accident and says nothing about where the runs diverged.",
        },
      ],
    },
  ],
};

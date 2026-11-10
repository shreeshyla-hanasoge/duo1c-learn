import type { Topic } from "../../types.ts";

export const sdCrashRecovery: Topic = {
  id: "sd-crash-recovery",
  title: "Crash recovery and durable state",
  tier: 7,
  week: 14,
  depth: "deep",
  summary:
    "A process can die at any second. Know which state lives in memory, a cache, a database and the broker, and rebuild the right copy on start-up.",
  why: "Traed restarts its engine on every deploy, and a crash or an out-of-memory kill does the same without warning. When that happens with a live NIFTY position open, the new process must discover it holds that position and keep managing it. Traed has had this fail twice, once through a dead guard and once through a cache eviction. This lesson gives you the model behind both, so you can explain what is stored where and why.",
  learn: {
    intuition:
      "Imagine a chef who keeps every order in their head. The kitchen is fast, until the chef faints. A better chef also pins tickets to a rail. The rail survives a faint, but it is small and a busy waiter may clear old tickets to make room. The best kitchen also writes each order in a ledger at the till, and when the new chef arrives they read the ledger, look at the rail, and then walk into the dining room and ask the tables what they actually have. That last step matters most. Your head, the rail and the ledger are all copies. The tables are the truth. Crash recovery is the discipline of knowing which copy is which, which one survives which accident, and which one you check against the real world before you act.",
    mechanics: [
      {
        heading: "Four places state can live, and what kills each",
        body: "Memory is fastest and dies with the process. Redis survives a restart but not eviction: Traed's Redis is capped and evicts the least recently used keys when full, so a 30 day time-to-live on an open-position key promises nothing once the instance is full. MySQL is durable, which means it survives restarts and evictions, but it is slower and a write can fail. The broker holds the final truth of what the account owns. Traed keeps live positions in memory, in Redis keys with a 30 day TTL, in a `live_positions` MySQL table, and re-checks them against the broker. Four copies, each answering a different accident.",
      },
      {
        heading: "Mirror what you cannot afford to lose, off the hot path",
        body: "A durable copy is only useful if writing it never hurts trading. Traed's `live_persistence.py` writes `live_orders`, `live_positions` and `live_trades` from a single background thread fed by a queue capped at 2,000. One thread keeps writes in order, so an old `SUBMITTED` can never land after `FILLED`. If MySQL is down the newest writes are dropped with a log line, because an engine that runs out of memory is worse than a gap. A position row is deleted the moment the position goes flat, so the table holds only what is open now. A separate timer rewrites open-position keys in Redis every 300 seconds, so an eviction heals within minutes instead of waiting for the next restart.",
      },
      {
        heading: "Recover in layers: durable store first, then the broker",
        body: "On a live start the engine restores orders and positions from Redis, fills any gaps from the MySQL rows, and then asks the broker what is really held. The code reads each difference differently. Cached but not at the broker: the position was closed while we were down, so it is dropped. At the broker but not cached: reported loudly and not adopted, because there is no entry price, stop or trail to manage it with. Both, but different quantities: the broker's figure wins, unless a sibling strategy shares the contract and the net cannot be split. Orders with unknown fate are asked about; ones that cannot be asked about are closed as `UNVERIFIED` with one alert.",
      },
      {
        heading: "Orphans and dead guards: how recovery itself fails",
        body: "On 16 July 2026 a short NIFTY call was opened at 14:36 and a config edit restarted the paper session at 14:55. The restore code sat behind a check for a method the cache did not have, so it was skipped. At 15:00 the exit condition fired, found no position, and did nothing. The postmortem names the lesson: recovery code must prove its guard can be true, and a silent return on a failed lookup turns a state bug into exposure. Backtests show a calmer pattern. A deploy kills the worker with its parent, so on start every unfinished row is re-submitted from scratch, at most twice, so a run that itself crashes the engine cannot loop forever.",
      },
      {
        heading: "Saying it about Traed",
        body: "Our engine restarts on every deploy, so we assume it will die at any time. Live positions live in four places: memory, Redis, a MySQL table and the broker, and on start-up we rebuild from Redis, fill gaps from MySQL, then trust the broker over both. We chose that over a full write-ahead log because there is one writer and one user, and the broker already keeps the authoritative book. The cost is that recovery is a reconciliation step with a few judgement calls, not a replay, and a position the broker holds that we have no record of is reported rather than adopted. We would move to an event log when several people's orders share the engine.",
      },
    ],
    complexityDerivation:
      "The invariant is simple: after any crash, the new process must come back owning exactly what the account owns, and must be able to exit it. Layered copies protect this. Memory gives speed. Redis gives a fast restart. MySQL protects against Redis losing data. The broker corrects all of them when they drift. The argument holds while three things are true: the broker's book is reachable and trustworthy, recovery runs before the first evaluation, and each layer fails in a different way. It breaks when two layers fail the same way, for instance if the cache and the database were restored from the same old backup. It breaks when recovery code has a guard that is never true, which is why the test must use a production-shaped cache, not a convenient fake. It breaks when state cannot be rebuilt from anywhere, such as an entry price known only to a dead process. And it becomes the wrong tool once many writers share state: then you want an ordered log that every process can replay, not a reconciliation step after the fact.",
    variants: [
      {
        name: "Cache plus durable mirror plus broker check",
        when: "One writer, one broker account, state small enough to mirror row by row. Traed's choice for live positions and orders.",
        delta: "Cheap and fast. Recovery is a judgement-heavy reconciliation, and a failed mirror write is dropped rather than retried forever.",
      },
      {
        name: "Write-ahead log with snapshots",
        when: "Many orders per second, strict ordering, or several processes that must agree. An exchange or a high-volume order management system.",
        delta: "Every event is appended before it is acted on; recovery loads a snapshot and replays the log. Gives exact state and an audit trail, at the price of a log to run, trim and test.",
      },
      {
        name: "Restart from scratch",
        when: "Work that is a pure function of its stored inputs, like a backtest whose full request is saved on its row.",
        delta: "No checkpoints to write. A crash costs the work done so far, so it needs an attempt limit to avoid crash loops.",
      },
    ],
    tradeoffs: [
      {
        vs: "Trust the cache, it is faster",
        pick: "Rebuild from the durable table and verify with the broker",
        because:
          "A cache is a convenience. Eviction removes keys by memory pressure, not age, and the first sign of a missing key is a live position with no stop. The extra read at start costs seconds.",
      },
      {
        vs: "Auto-adopt any position the broker shows",
        pick: "Report it and let the operator attach it deliberately",
        because:
          "Adopting a position with no entry context means guessing its stop and exit. A loud warning and a defined attach step cost a minute, a wrong guess costs real money.",
      },
      {
        vs: "Checkpoint long jobs so they resume",
        pick: "Re-run from the start, capped at two attempts, for backtests",
        because:
          "Worker state is entirely in memory, so a checkpoint would mean serialising it. Re-running is simple and correct, and the cap stops a run that kills the engine from looping.",
      },
    ],
  },
  realWorld: [
    {
      system: "Database write-ahead logging (InnoDB redo log, PostgreSQL WAL)",
      kind: "industry",
      problem:
        "A database must not lose a committed change if the server loses power halfway through writing it to the data files.",
      applied:
        "The change is first appended to a sequential log and flushed. Data pages are written later. After a crash the database replays the log from the last checkpoint, redoing what was committed and undoing what was not. The log is the durable truth; the data files are a faster copy of it.",
      evidence: "MySQL InnoDB redo log documentation; PostgreSQL write-ahead logging documentation (public)",
      impact: "Committed changes survive a crash, and the cost is one extra sequential write per commit.",
    },
    {
      system: "FIX session recovery with sequence numbers",
      kind: "industry",
      problem:
        "After a dropped connection between a broker and an exchange, neither side knows which messages the other received.",
      applied:
        "Every message on a FIX session carries a sequence number. On reconnect each side compares the numbers it expected and asks for any missing range to be resent. The session, not the application, finds and fills the gap.",
      evidence: "FIX Trading Community session-layer specification (public)",
      impact: "A reconnect can resume without losing or duplicating orders and fills.",
    },
    {
      system: "Traed: Redis eviction and the durable position row",
      kind: "yours",
      problem:
        "Redis on the engine host is capped and evicts keys under memory pressure. It evicted the key for an open live NIFTY put before a deploy restarted the engine.",
      applied:
        "On restart the engine found no Redis key, so reconciliation reported the broker's real position as unknown and did not adopt it. It ran without a stop until the key was rebuilt by hand from the `live_positions` row. The fix: on a live start, rebuild missing positions from that row, and rewrite open-position keys every 300 seconds. The runbook states the lesson: a TTL is not durability.",
      evidence:
        "docs/debugging-live-and-paper.md section 11; strategy-engine/app/services/order_management/order_manager.py (_rehydrate_positions_from_durable_store)",
      impact: "An evicted key no longer orphans a live position, because a second copy is read at start.",
    },
    {
      system: "Traed: restart recovery for backtests and paper positions",
      kind: "yours",
      problem:
        "A deploy stops the engine with no drain, killing the backtest worker with it and leaving rows at `running` for ever. Separately, a restart once dropped an open paper position.",
      applied:
        "At start the engine re-submits every unfinished backtest from its saved request, flipping the row back to `pending` with a guarded update so a user cancel wins, and marks it failed after two recoveries. For positions, the dead-guard bug was fixed by scanning the cache with the method it really has, with a regression suite built on a production-shaped cache.",
      evidence:
        "strategy-engine/app/services/backtest_recovery.py; docs/incidents/2026-07-16-paper-position-never-exited.md",
      impact: "Orphaned runs finish by themselves, and an open position is rehydrated after a restart.",
    },
  ],
  algorithms: [
    {
      name: "Write-ahead log with snapshots",
      role: "Records every change before applying it and checkpoints occasionally, so a restart loads the snapshot and replays only the tail.",
    },
    {
      name: "Durable mirror rebuild",
      role: "Rebuilds the fast in-memory copy from the durable table on start, treating the database as the record and the cache as a disposable view.",
    },
    {
      name: "Set difference against the broker",
      role: "Compares the rebuilt positions with the broker's list to find orphans on either side before trading resumes.",
      dsa: "hashing",
    },
  ],
  insights: [
    {
      t: "A cache is not a database",
      d: "A TTL says when a key may expire, not that it will stay. Eviction removes keys by memory pressure. State you cannot rebuild needs a durable copy.",
    },
    {
      t: "The broker is the last word",
      d: "Memory, Redis and MySQL are copies. After a restart, compare them with what the account really holds and let the broker win, with care for shared contracts.",
    },
    {
      t: "Recovery code needs its own proof",
      d: "A restore branch behind a condition that is never true looks like protection and does nothing. Test it against the production-shaped environment.",
    },
    {
      t: "Bound the restarts",
      d: "A job that crashes the process it runs in must have an attempt limit, or the restart policy will loop it for ever.",
    },
  ],
  pitfalls: [
    "Saving state to Redis only. Redis is fast and survives restarts, but eviction and flushes lose keys silently.",
    "Letting the recovery step return quietly when a lookup finds nothing. Missing state should be loud, not a no-op.",
    "Adopting whatever the broker shows without entry context. The engine then manages a position with invented stops.",
  ],
  quiz: [
    {
      q: "What is the core idea of write-ahead logging?",
      options: [
        "Record the change in a durable log first, so a crash is recovered by replay",
        "Write every change to two separate disks at the same time, so one copy always survives",
        "Keep all changes in memory and write them out only when the process exits cleanly",
        "Delete old data after each write, so that the log stays small and fast to read",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The log is written first and flushed. Other copies can be rebuilt from it. That order is what lets a crash at any point be recovered.",
      distractors: [
        "",
        "That is mirroring, which protects against disk loss, not against a crash halfway through an update.",
        "A clean-exit write loses everything on a crash, the exact case you are protecting against.",
        "Trimming is a separate housekeeping job. The idea is about the order of writing, not deleting.",
      ],
    },
    {
      q: "Why is Redis with a long TTL not a safe home for state you cannot rebuild?",
      options: [
        "Redis cannot store position data of this kind at all, only simple strings",
        "A TTL guarantees that the key is deleted sooner than the time you set",
        "Redis data is always lost on every restart, whatever the settings are",
        "A capped Redis may evict keys long before the TTL, with no signal",
      ],
      answer: 3,
      difficulty: "recall",
      why: "TTL is an upper bound on life, not a promise. With an eviction policy like allkeys-lru, memory pressure removes keys regardless of age.",
      distractors: [
        "Redis stores structured values well. The issue is durability, not format.",
        "A TTL only sets a maximum life; it does not shorten anything. Eviction is a different mechanism.",
        "Redis can persist to disk, and ordinary restarts need not lose data. Eviction is the larger risk.",
        "",
      ],
    },
    {
      q: "The engine restarts at 13:05. Redis has no key for a strategy's live NIFTY short, but a `live_positions` row for it exists. What should start-up do?",
      options: [
        "Start with no position at all and wait for a later broker sync to show it up again",
        "Place a closing order immediately, because the cache is clearly wrong about it",
        "Rebuild it from the durable row, rewrite the key, then reconcile with the broker",
        "Delete the row, because Redis is the primary store and the row is therefore stale",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The durable row is the surviving copy. Rebuild from it so stops and exits work, then let the broker check size and existence.",
      distractors: [
        "Meanwhile the position has no stop, no exit and may be re-entered. Waiting is the incident.",
        "Closing blindly sells something that may no longer exist at the broker, which can open an opposite position.",
        "",
        "Deleting the surviving copy removes the only record of a real position.",
      ],
    },
    {
      q: "After a restart the engine's cache says it holds 65 units of a contract. The broker says 130, and no other strategy on the account trades that contract. What does Traed's reconciliation do?",
      options: [
        "Keep 65 and ignore the broker, because the cache is the engine's own record",
        "Take the broker's figure of 130, as no sibling strategy explains the gap",
        "Raise an error and refuse to start the strategy until an operator looks",
        "Average the two figures, giving 97, as a compromise between both books",
      ],
      answer: 1,
      difficulty: "apply",
      why: "On a quantity mismatch without a sibling on the same contract, the broker wins. Sibling strategies change this, because the broker nets them into one figure.",
      distractors: [
        "Cache is a convenience copy. Keeping it would hide a fill that landed during the outage.",
        "",
        "Reconciliation is a safety net, not a gate. A start that fails here would leave a held position unmanaged.",
        "An average matches neither copy and is not a quantity anyone holds.",
      ],
    },
    {
      q: "A deploy kills the engine while a backtest is half done. After restart the row still says `running`. A run that itself runs out of memory could kill the engine again. Why does recovery cap the number of re-submissions?",
      options: [
        "So a backtest that crashes the engine itself cannot loop through restarts",
        "To keep the backtests table in the database from growing too large over the months",
        "Because a backtest is allowed to be run only twice in its whole lifetime",
        "To make sure that a cancel pressed by the user can always be honoured",
      ],
      answer: 0,
      difficulty: "apply",
      why: "With `Restart=always`, an out-of-memory run would crash, restart, recover, crash again. The attempt counter breaks the loop by marking it failed. The cancel guard is a separate mechanism.",
      distractors: [
        "",
        "Table size is not the concern. The concern is a crash loop.",
        "There is no such lifetime limit. The cap applies only to automatic recovery.",
        "Cancel safety comes from a guarded UPDATE on the status, not from the attempt cap.",
      ],
    },
    {
      q: "An order was sent at 12:59:58 and the engine died before the reply arrived. After restart the order row says `submitted` with no fill. What should recovery do?",
      options: [
        "Send the order again, because the first attempt probably failed to go through",
        "Mark the order cancelled locally, so that it can never fill later on",
        "Ask the broker about that order by its id or tag, and book the real outcome",
        "Ignore it and wait for the position reconcile to find any fill later on",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Resending can double the position. Marking cancelled may be false. The broker alone knows the fate, so the order is re-adopted and queried. Where it cannot be asked about, it is closed as UNVERIFIED with an alert.",
      distractors: [
        "A resend of an order that did fill doubles the exposure.",
        "Writing a status you have not verified invents a fact, and the order may still fill.",
        "",
        "That would leave the order unmanaged for longer, and a late fill would be booked with no knowledge of the order.",
      ],
    },
    {
      q: "After a restart the broker shows an open NIFTY option position that no strategy in the engine has any record of. Someone suggests the engine should adopt it automatically. What is the best judgement?",
      options: [
        "Adopt it automatically: the broker is the truth, so the engine should manage it from now on",
        "Report it loudly and let the operator attach it on purpose, as there is no entry context",
        "Close it immediately, to be safe, and report the realised result afterwards to the operator",
        "Ignore it, because it is not a position that the engine opened itself or is responsible for",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The broker is the truth for what is held, but not for why. Without entry price, stop and trail state, adopting means inventing rules for real money. A loud report plus a deliberate attach step keeps a human in the decision.",
      distractors: [
        "Truth about quantity is not the same as knowledge of strategy intent. The engine would be guessing the stop and exit.",
        "",
        "Closing without understanding it may undo a deliberate manual trade and realises a loss on a guess.",
        "A real position with no stop is unprotected risk. Ignoring it is the dangerous option.",
      ],
    },
    {
      q: "A teammate argues: Redis has persistence turned on and a 30 day TTL, so a MySQL copy of open positions is duplicate work. What is the strongest reply?",
      options: [
        "Persistence settings only work for list values and not for position hashes in Redis",
        "MySQL is simply a lot faster than Redis for the reads that start-up has to do",
        "Redis cannot be restarted at all without losing absolutely everything it holds",
        "Eviction bypasses both settings, and a second independent copy is what survived",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Persistence and TTL do not control eviction. An independent durable copy fails in a different way, which is the point of having it.",
      distractors: [
        "Persistence settings apply to all data types in Redis. This is not the issue.",
        "MySQL is not faster for this access pattern. Speed is not why the copy exists.",
        "Redis can restart with data intact when persistence is on. The risk is eviction.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-crash-recovery-position-state",
      scenario:
        "Traed runs live NIFTY option sells that can be held overnight. The engine restarts on every deploy. Redis is shared with a large option-chain cache and is capped. MySQL is on the same server, and one broker account holds everything. You are choosing where open-position state should live so that a restart always returns the engine to managing exactly what is held. Which design do you pick?",
      options: [
        {
          label: "Redis only, with a long TTL on each position key",
          appeal: "Fast, already in use, and a 30 day TTL looks like plenty.",
        },
        {
          label: "MySQL only, with every read and write going to the database",
          appeal: "One durable store and no cache to get out of sync.",
        },
        {
          label: "Memory and Redis for speed, a MySQL mirror written off the hot path, and a broker check at every live start",
          appeal: "Each copy fails differently, and the broker corrects drift.",
        },
        {
          label: "No stored state; at start, read the broker and rebuild every position from it",
          appeal: "The broker is the truth, so why keep copies at all?",
        },
      ],
      best: 2,
      verdict:
        "Redis is capped and shared with a large cache, so eviction is a real, silent failure for a TTL-only design. MySQL-only puts a database round trip on the evaluation path. Broker-only recovery loses the entry price, stop and trail state that the broker never held. The layered design keeps the fast path fast, adds an independent durable copy, and uses the broker for what only it knows: whether the position exists and how large it is.",
      claims: [
        {
          text: "You accept a slightly more complex start-up, with three copies to reconcile, in exchange for surviving an eviction or a crash.",
          axis: "trade",
          correct: true,
          note: "The extra code is the reconcile step. It is the price of independent failure modes.",
        },
        {
          text: "The broker-only design is simplest and loses nothing, since the broker knows the position.",
          axis: "trade",
          correct: false,
          note: "It loses entry context: the stop, trail and the reason for the trade. The broker holds quantity and price, not strategy intent.",
        },
        {
          text: "MySQL writes can lag or be dropped when the database is slow, so the mirror may be one step behind Redis.",
          axis: "trade",
          correct: true,
          note: "Writes go through a bounded queue and are dropped if it fills. Speed of the loop is chosen over perfect mirroring.",
        },
        {
          text: "If Redis evicts the position key and the MySQL row is missing too, the engine has no local record, and reconciliation will report the broker position as unknown.",
          axis: "failure",
          correct: true,
          note: "Two layers failing together is the case the broker check is for: it reports, loudly, instead of adopting.",
        },
        {
          text: "A 30 day TTL means the key will survive for 30 days.",
          axis: "failure",
          correct: false,
          note: "TTL is only a maximum. Under allkeys-lru, keys can be evicted at any time when memory is full.",
        },
        {
          text: "Watch Redis eviction counters and memory use against the cap, and alert when a live position has no Redis key.",
          axis: "measure",
          correct: true,
          note: "Eviction is invisible to the code that wrote the key. These two signals are the only way to see it before a restart does.",
        },
        {
          text: "Measure only how fast a restart completes.",
          axis: "measure",
          correct: false,
          note: "A fast restart that comes back with the wrong state is worse than a slower correct one. Correctness of restored state is the measure.",
        },
      ],
    },
    {
      id: "sd-crash-recovery-event-log",
      scenario:
        "A broker's order management system takes 2 million orders on a busy day, with peaks of several thousand a second at the open. Several services read and update order state, and regulators require a full audit trail. The in-memory order book on the primary node is lost when it crashes. The firm must recover within a minute without losing or duplicating any acknowledged order. Which recovery design fits?",
      options: [
        {
          label: "Take a full snapshot of the book every 15 minutes and restore the latest one",
          appeal: "Simple, and storage is cheap.",
        },
        {
          label: "Append every order event to a durable, ordered log before acting on it, take periodic snapshots, and recover by loading a snapshot and replaying the log",
          appeal: "Exact state, an audit trail as a by-product, and replay for debugging.",
        },
        {
          label: "Rely on the exchange to resend today's orders after a crash",
          appeal: "The exchange has its own record, so there is no need to keep another.",
        },
        {
          label: "Keep a second node that copies memory changes, with no log",
          appeal: "A warm standby avoids replay time.",
        },
      ],
      best: 1,
      verdict:
        "Acknowledged orders must not be lost, and a 15 minute snapshot would drop up to 15 minutes of them. The exchange knows only what reached it, not the firm's internal state, and a memory-copying standby can lose the same recent changes and has no audit trail. An ordered log written before acting makes loss impossible after acknowledgement, replay is bounded by snapshots, and regulators get their trail.",
      claims: [
        {
          text: "You accept an extra durable write on every order, adding latency to the path, in exchange for no acknowledged order being lost.",
          axis: "trade",
          correct: true,
          note: "The cost is a sequential append per event. It is usually small next to the guarantee it buys.",
        },
        {
          text: "Snapshots every 15 minutes are enough if the log is also kept.",
          axis: "trade",
          correct: false,
          note: "The reverse is true: the log is the source of truth and snapshots only shorten replay time. Without the log, snapshots alone lose recent orders.",
        },
        {
          text: "If the log is not flushed to disk before the order is acknowledged, a crash can lose an order the client believes was accepted.",
          axis: "failure",
          correct: true,
          note: "Write-ahead only holds if the flush happens before the acknowledgement. This is the usual place the guarantee breaks.",
        },
        {
          text: "Replay after a crash can re-send orders to the exchange unless the replay logic distinguishes already-sent events.",
          axis: "failure",
          correct: true,
          note: "Rebuilding state must not repeat side effects. Replayed events need idempotent handling or a sent marker.",
        },
        {
          text: "A memory-copying standby removes the need for any recovery design.",
          axis: "failure",
          correct: false,
          note: "A standby can fail with the primary on the same bug or lose the same recent writes. It shortens downtime, not the need for durable state.",
        },
        {
          text: "Track recovery time from crash to ready, and the number of events replayed.",
          axis: "measure",
          correct: true,
          note: "Together they show whether snapshots are frequent enough to keep recovery under the one minute target.",
        },
        {
          text: "The size of the log on disk is the main number to watch for recovery quality.",
          axis: "measure",
          correct: false,
          note: "Size affects cost and trimming, not whether recovery is correct or fast.",
        },
      ],
    },
    {
      id: "sd-crash-recovery-backtest-restart",
      scenario:
        "Traed's backtests run in a separate worker process inside the engine's service. A deploy stops the service with no drain, and the worker dies with it. Each backtest's full request (strategy, dates, parameters) is saved on its database row at creation. Worker state is entirely in memory. Runs can take minutes, there is one server, and the owner is the only user. What should happen to a run caught by a deploy?",
      options: [
        {
          label: "On start, re-submit unfinished runs from the beginning, with an attempt limit and a guard so a user cancel wins",
          appeal: "No new machinery: the request is already stored, and the owner never has to notice.",
        },
        {
          label: "Mark every unfinished run failed and ask the user to run it again",
          appeal: "Honest and simple, with no risk of re-running something unwanted.",
        },
        {
          label: "Checkpoint the simulation state periodically and resume from the last checkpoint",
          appeal: "Saves the work already done.",
        },
        {
          label: "Move backtests to a separate always-on service so deploys never touch them",
          appeal: "Removes the cause entirely.",
        },
      ],
      best: 0,
      verdict:
        "Minutes of lost work is cheap, and the request is already stored, so re-submitting is almost free. Checkpointing needs worker memory serialised, which is real engineering for little gain. A separate service is a bigger project than the problem at one user. Marking failed is acceptable but makes the owner repeat work the system can do. The attempt cap and cancel guard are what make automatic re-running safe.",
      claims: [
        {
          text: "You accept repeating work already done in exchange for not building checkpointing.",
          axis: "trade",
          correct: true,
          note: "The lost work is minutes of compute. Checkpoint machinery would cost more than that to build and maintain.",
        },
        {
          text: "A separate always-on service is the cheapest fix since it needs no code.",
          axis: "trade",
          correct: false,
          note: "A new service means new deployment, monitoring and failure modes. It is the most expensive of the four.",
        },
        {
          text: "A run that itself exhausts memory and kills the engine will be re-submitted again and again without a limit.",
          axis: "failure",
          correct: true,
          note: "With automatic restart and recovery, only the attempt counter stops the loop.",
        },
        {
          text: "If a user cancels between the engine reading the row and re-submitting it, an unguarded re-submit would resurrect the cancelled run.",
          axis: "failure",
          correct: true,
          note: "A conditional update on the current status makes the cancel win; the guard is part of the design, not an extra.",
        },
        {
          text: "Re-running from scratch is unsafe because backtest results could be partly written twice.",
          axis: "failure",
          correct: false,
          note: "The recovery clears the partial results and metrics when it flips the row back to pending, so the rerun starts clean.",
        },
        {
          text: "Count recovered, failed-after-limit and skipped runs at each start.",
          axis: "measure",
          correct: true,
          note: "The counters show whether recovery is routine or whether a run is repeatedly crashing the engine.",
        },
        {
          text: "The success measure is that no backtest is ever interrupted by a deploy.",
          axis: "measure",
          correct: false,
          note: "Interruption is expected. The measure is that interrupted runs finish or fail visibly, never stay at running for ever.",
        },
      ],
    },
  ],
};

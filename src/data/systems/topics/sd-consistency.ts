import type { Topic } from "../../types.ts";

export const sdConsistency: Topic = {
  id: "sd-consistency",
  title: "Consistency: what must agree, and when",
  tier: 3,
  week: 6,
  depth: "deep",
  summary:
    "Every fact needs one owner, and every copy must be rebuildable or reconciled. Pay for strong guarantees only where a wrong value costs money.",
  why: "Traed keeps its record in MySQL, a cache in Redis, tick routing state in DynamoDB and live state inside the engine's memory. The broker holds its own record of every order. When any two of these disagree, someone must know which one wins. This topic gives you the words: source of truth, dual write, outbox, eventual consistency, read-your-writes. It also lets you say which parts of a trading platform need strict agreement and which can lag by seconds.",
  learn: {
    intuition:
      "A small shop keeps a cash book on the counter. At night the owner also writes the day's total on a slip for the bank. Two records of the same money now exist. If the slip says 4,200 rupees and the cash book says 4,250, someone has to decide which one is right. In a healthy shop that question has a standing answer: the cash book is the truth, and the slip is a copy made from it. If the slip is lost, you write another from the book. Consistency in software is the same discipline. For each fact, pick the one place that owns it. Treat every other place as a copy that can be rebuilt, or checked against the owner on a schedule. Then decide how stale a copy may be, because for some facts a minute is fine and for others a second is a loss.",
    mechanics: [
      {
        heading: "Source of truth, and copies you can rebuild",
        body: "For every fact, name one owner. In Traed, MySQL is the record for strategies, backtests and trades. Redis DB 2 holds pre-warmed minute candles at keys like `market_data:{symbol}:1minute` with a 24-hour expiry, and the market-analysis page keeps short in-process caches, for example option-chain snapshots for about 20 seconds. These can be rebuilt from the broker or the database. For a live order the broker is the owner: the local `orders` row records only open and closed, while the broker's order carries the full set of states, such as partially filled and rejected. Test any copy: if it vanished, could I rebuild it? If not, it is a record, and it belongs in a durable store.",
      },
      {
        heading: "Transactions stop at the edge of one database",
        body: "A transaction makes several writes succeed or fail together, but only inside one database commit. Traed's backtest start shows where that ends. The engine inserts a `backtests` row with status pending and returns 201. Then Laravel inserts its own `backtest_jobs` row. These are two commits made by two services, so nothing makes them atomic. If Laravel failed after the engine answered, a backtest would run with no handle for the browser to poll. Traed accepts this because the Laravel row is only a polling handle, while the real results live in the engine's table. The rule: when two writes cannot be atomic, make the second one a pointer that can be recreated.",
      },
      {
        heading: "Dual writes, the outbox, and reconciling instead",
        body: "A dual write means changing a database and telling another system, such as a queue, as two separate steps. A crash between the steps leaves them disagreeing. The outbox pattern fixes it: write the change and an event row in the same transaction, and let a relay publish the event later, retrying until it succeeds. Traed does not use an outbox. A strategy's lifecycle is two flags in MySQL, `is_active` and `is_paper`. Laravel calls the engine to start or stop. The engine also runs `sync_active_strategies` when it boots, which starts any active strategy that is not running. The database holds the intent and a repair pass closes the gap, a simpler cousin of the outbox.",
      },
      {
        heading: "Eventual consistency and read-your-writes",
        body: "Eventual consistency means a copy may be behind, but it catches up if no new writes arrive. Read-your-writes means that after you write something, your next read sees it. Traed's backtest page needs the second: the engine inserts the row before it returns the job id, so the first poll cannot miss it. The worker writes progress about every 0.75 seconds and the browser polls every 4 seconds, so the bar is a few seconds stale, which is fine. Cancellation is lazy: the row flips to cancelled at once, but the worker stops only at its next checkpoint. Once a queued run waited 7 minutes behind a cancelled job that still held the single worker slot.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep one durable record in MySQL, and everything else is a copy or a derived view. Redis candles and in-process caches can be rebuilt, and the broker owns real order state. We accept eventual consistency for progress, charts and dashboards, because a few seconds of lag costs nothing. We do not accept it for open positions: the engine records them in a MySQL table, and every 15 minutes a check compares that table with the broker's own book and raises an alert on a mismatch. We have no outbox. The database holds intent, and a sync at engine start repairs differences. We would add an outbox if several services needed to hear every change, or if we had many users.",
      },
    ],
    complexityDerivation:
      "The invariant is that each fact has exactly one writer of record, and every other copy is either rebuilt from it or compared with it often enough that any difference is found before it does harm. That argument holds because disagreement is only dangerous when you cannot tell which side is right and the gap lasts longer than the damage window. It stops holding in three cases. A copy is quietly promoted to a record: if live position state lived only in a cache that can expire, losing the cache would lose the position, and nothing could be rebuilt. Two writers update the same fact, so there is no single owner to defer to. Or the repair runs less often than harm can occur. A check every 15 minutes cannot protect a stop-loss that matters within seconds. Strong guarantees cost latency and throughput, so you buy them only where a wrong value costs money.",
    variants: [
      {
        name: "Strong consistency inside one database",
        when: "Money, positions, orders and risk limits, where a wrong read can cause a wrong trade.",
        delta:
          "One transaction, one commit, readers see the latest. You pay in write latency and in a single point everyone depends on.",
      },
      {
        name: "Eventual consistency with reconciliation",
        when: "Two systems must agree over time, such as your order book against the broker's, or running strategies against the database.",
        delta:
          "Either side may be briefly behind. A loop compares both and repairs the difference. You must decide how often it runs and what it does when it finds a mismatch.",
      },
      {
        name: "Cache with a time limit",
        when: "Read-heavy data that is expensive to compute and safe to rebuild, such as candle history or option-chain snapshots.",
        delta:
          "Fast reads, bounded staleness set by the expiry. The data must always be recoverable from the source, because a cache can disappear.",
      },
    ],
    tradeoffs: [
      {
        vs: "Atomic writes across two services, using a distributed transaction",
        pick: "A pointer row in the second service that can be recreated",
        because:
          "Cross-service transactions need a coordinator and slow every call. A disposable handle gets the same safety for a browser poll at almost no cost.",
      },
      {
        vs: "An outbox with a relay and a queue",
        pick: "A sync at start-up and a periodic check against the broker",
        because:
          "With one server and one consumer, comparing stored intent with what is running is simpler to build and debug. The outbox earns its keep when many consumers must hear every change.",
      },
      {
        vs: "Making every read strictly fresh",
        pick: "Seconds of lag on progress and charts, strict reads for orders",
        because:
          "Fresh reads cost latency and load. A progress bar can be 4 seconds old, while the quantity of an open position cannot be guessed.",
      },
    ],
  },
  realWorld: [
    {
      system: "The transactional outbox pattern",
      kind: "industry",
      problem:
        "A service must update its database and also publish an event, and a crash between the two leaves them out of step.",
      applied:
        "The service writes the business row and an event row in one transaction. A separate relay reads unsent events and publishes them, retrying until acknowledged, so consumers see at-least-once delivery.",
      evidence: "microservices.io, Chris Richardson, 'Transactional outbox' pattern",
      impact:
        "Removes the window between 'saved' and 'announced'. Consumers must tolerate duplicates.",
    },
    {
      system: "Amazon Dynamo and the shopping cart",
      kind: "industry",
      problem:
        "A shopping cart must accept writes even during failures, and a refused write costs a sale.",
      applied:
        "The Dynamo paper describes a store that stays writable and lets replicas diverge briefly, then merges them. Adding an item twice is safer than losing one.",
      evidence: "Amazon, 'Dynamo: Amazon's Highly Available Key-value Store' (SOSP 2007)",
      impact:
        "Shows that availability can be chosen over instant agreement, when merging is cheap and the data is not money in flight.",
    },
    {
      system: "Traed: backtest handle versus the real record",
      kind: "yours",
      problem:
        "Starting a backtest touches two services, and no transaction can span both.",
      applied:
        "The engine inserts the pending `backtests` row, then dispatches the job and returns an id. Laravel then creates a `backtest_jobs` row as a tracking handle and syncs its status from the engine on each poll.",
      evidence: "CMS/trade-server/app/Http/Controllers/BackTester.php",
      impact:
        "Real results live in one place. The handle is cheap to recreate, so the missing atomicity does little harm.",
    },
    {
      system: "Traed: live positions checked against the broker",
      kind: "yours",
      problem:
        "The engine keeps its own record of live positions and acts on it with stops and exits. If that record drifts from what the broker really holds, the engine acts on a false picture.",
      applied:
        "A check inside the broker day sync, run every 15 minutes, compares the engine's `live_positions` and orders with the broker's book. It reports untracked, ghost, quantity and stuck-order differences, and alerts only when a mismatch survives two checks and 5 minutes. It reports and does not repair.",
      evidence: "strategy-engine/app/services/live_reconciliation.py",
      impact:
        "The broker is treated as the owner of the truth. The delay before alerting trades a little speed for far fewer false alarms right after a fill.",
    },
  ],
  algorithms: [
    {
      name: "Outbox pattern",
      role: "Writes the change and the message to publish in one database transaction, so two systems cannot disagree because a second write was lost.",
    },
    {
      name: "Set difference by hash join",
      role: "Compares two copies of the same facts by key to find what is missing or different, which is how drift gets detected and repaired.",
      dsa: "hashing",
    },
    {
      name: "Read-your-writes via version check",
      role: "Compares a version or timestamp on read, so a user who just wrote never sees an older copy from a lagging replica.",
    },
  ],
  insights: [
    {
      t: "One owner per fact",
      d: "Name the place that is right when two copies disagree. Everything else is a copy you can rebuild or a view you check against it.",
    },
    {
      t: "A cache must be rebuildable",
      d: "Traed's candle cache expires after 24 hours and is refilled by the pre-market job. If losing it would lose a fact, that fact was never a cache.",
    },
    {
      t: "Two commits are never atomic",
      d: "When a write spans two services, make the second one a pointer you can recreate, as Traed's `backtest_jobs` handle is.",
    },
    {
      t: "Match the guarantee to the cost of being wrong",
      d: "A progress bar can be 4 seconds old. An open position or an order status cannot. Pay for strong reads only where money is at stake.",
    },
  ],
  pitfalls: [
    "Writing to the database and then calling another service as two separate steps and assuming both happened. A crash between them leaves the two out of step, and nothing notices.",
    "Treating a status column as the truth about work in flight. A cancelled row can still hold the worker slot, so a queue position computed from status alone told a user 'next in line' while nothing could start.",
    "Putting state in a cache because it is fast, when losing the cache would lose the state. Anything you cannot rebuild belongs in durable storage.",
  ],
  quiz: [
    {
      q: "What does it mean to say a database row is the 'source of truth' for a fact?",
      options: [
        "It is the copy that is read most often by users",
        "It is the copy that is always the fastest to read",
        "It is the copy that wins when copies disagree",
        "It is the copy stored in the largest database",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The source of truth is the single place whose value is right when copies disagree. Other places are copies made from it or checked against it.",
      distractors: [
        "Reads are about popularity. A cache is often read most and is still only a copy.",
        "Speed is the reason copies exist. The fastest copy is usually the least authoritative one.",
        "",
        "Size has nothing to do with authority. A small table can be the owner of a fact.",
      ],
    },
    {
      q: "Which statement describes read-your-writes consistency?",
      options: [
        "All users see every update at exactly the same instant",
        "After you save something, your next read shows what you saved",
        "Reads never touch the database and use only a cache",
        "A write is kept only if the read of it succeeds twice",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Read-your-writes is a promise to one user about their own updates. It is weaker than every user seeing every update at once, but it is what makes an interface feel correct.",
      distractors: [
        "Simultaneous visibility for everyone is a stronger property, often called linearizability, and is not what this term means.",
        "",
        "It says nothing about caches. A cache that lags can break the promise.",
        "Nothing in the term describes retries or double reads of a write.",
      ],
    },
    {
      q: "A service saves an order to its database and then publishes an 'order saved' event to a queue as a separate step. The server crashes between the two steps. What is the problem, and what is the usual fix?",
      options: [
        "The queue drops all older events, so add a second queue",
        "The database rolls back the order, so just retry the save",
        "The event is published twice, so delete one of the copies",
        "The event is lost; save it in the same transaction and relay it later",
      ],
      answer: 3,
      difficulty: "apply",
      why: "This is the dual-write problem. The database commit already happened, so the event never goes out. An outbox row written in the same transaction survives the crash, and a relay publishes it afterwards.",
      distractors: [
        "Old events are not touched by the crash. A second queue has the same gap between save and publish.",
        "The save was already committed before the crash, so nothing is rolled back.",
        "The crash stops the publish step, so the event is missing, not doubled.",
        "",
      ],
    },
    {
      q: "Your cache holds the number of open lots in a live position, with a 10-minute expiry, and the position row in the database is updated only once an hour. The cache restarts at 11:00. What is wrong with this design?",
      options: [
        "Ten minutes is too short, so raise the expiry to 24 hours",
        "The cache is the only up-to-date copy, so restarting it loses the position",
        "The database is too slow, so move the position to the cache entirely",
        "Hourly writes are fine, because the cache will refill from nowhere",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The cache has quietly become the record. A cache must be rebuildable from a source, and here the source is up to an hour stale. Write the position durably on every change and check it against the broker.",
      distractors: [
        "A longer expiry only delays the loss. The cache would still hold the only fresh copy.",
        "",
        "Moving the position wholly into the cache makes it worse, since the cache can disappear.",
        "A cache refills from a source. Here the only source is an hour old, so it refills with a wrong number.",
      ],
    },
    {
      q: "A Laravel app asks a Python engine to start a backtest. The engine writes its own row and returns an id. Laravel then writes a tracking row. Laravel crashes after the engine answers. What is the least harmful way to design the tracking row?",
      options: [
        "Make it a pointer to the engine's row that can be recreated",
        "Make it the only record of the results, to avoid duplicates",
        "Make it a copy of every progress update, written twice",
        "Skip it and have the browser guess the id from the clock",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Two commits cannot be atomic. If the second row is only a pointer, losing it loses a handle, not the results. The engine's row stays the single record.",
      distractors: [
        "",
        "If the tracking row were the only record, the same crash would lose the results.",
        "Writing every update twice creates a second place to drift and does not help the crash case.",
        "Guessing ids would produce wrong or missing results. A pointer can be recreated from the engine's data.",
      ],
    },
    {
      q: "A strategy runner shows 'queued 3rd' on a backtest page. The position is computed by counting rows whose status is pending or running. A user cancels one run. Its row flips to cancelled at once, but its worker is still busy until the next checkpoint. What does the user now see?",
      options: [
        "The right position, since cancelled rows are not counted",
        "A position that is too high, since cancelled rows are counted",
        "A position that is too low, so the run looks sooner than it is",
        "An error, since the row has two states at once",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The cancelled row no longer counts, but its worker still holds the slot. The user is told they are closer to the front than they are. Traed's pool tracks in-flight jobs for this reason, not the status column.",
      distractors: [
        "The count excludes the cancelled row, but the work behind it is still running, so the answer is wrong.",
        "Cancelled rows are not counted by that query, so the number would drop, not rise.",
        "",
        "The row has one state. The problem is that the state runs ahead of the work it describes.",
      ],
    },
    {
      q: "You are choosing a consistency level for three Traed-like data items: an open position's quantity, a backtest's progress percentage, and the cached 1-minute candles. Which assignment is most sensible?",
      options: [
        "Strict for positions, lag for progress, a rebuildable cache for candles",
        "Strict for all three, since any lag is a risk to trading",
        "Eventual for position quantity, strict for progress, none for candles",
        "A few seconds of lag for all three, since that is the cheapest",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Match the guarantee to the cost of being wrong. A wrong position quantity can place a wrong order, a stale progress bar is harmless, and candles can be rebuilt from the broker.",
      distractors: [
        "",
        "Strictness everywhere costs latency and load for no benefit on progress and candles.",
        "This reverses the costs: a lagging position is dangerous, a lagging progress bar is not.",
        "Cheap for all three would let a stale position drive a real order.",
      ],
    },
    {
      q: "Two services must both learn about every change to a shared account table. The team can add an outbox, or run a loop that compares the table to each service's state every 60 seconds. Changes can matter within 5 seconds. Which is the better judgment?",
      options: [
        "A 60-second comparison, since it is simpler to build and to run",
        "Neither, since a shared table keeps the services consistent already",
        "A comparison every 60 seconds plus a second one every 59 seconds",
        "An outbox, since 60 seconds is longer than the damage window",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Reconciliation is fine only if it runs often enough that harm cannot occur between runs. When changes matter in 5 seconds, a 60-second loop leaves a gap that an outbox with a relay closes.",
      distractors: [
        "Simplicity is a real advantage, but it fails the stated constraint: harm can occur in 5 seconds.",
        "A shared table does not tell each service about a change. It only stores the data, so each service can still miss an update.",
        "Two slow loops do not make a fast one. The gap between runs is the problem.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-consistency-strategy-start",
      scenario:
        "A solo founder runs a web app and a trading engine on one server. When the user switches a strategy to 'active', the web app saves a flag in MySQL and then calls the engine to start it. Twice, the engine was restarting at that moment and the call failed, leaving the flag set and nothing running. The trading engine reads the same MySQL. How do you make the two agree?",
      options: [
        {
          label: "Add a message queue with an outbox table and a relay",
          appeal: "It is the textbook way to make a database write and a notification reliable together.",
        },
        {
          label: "Have the engine compare active flags against running strategies at start and on a timer, then start missing ones",
          appeal: "The database already holds the intent. A repair loop needs no new infrastructure.",
        },
        {
          label: "Retry the HTTP call from the web app five times in a row",
          appeal: "Quick to add, and it handles a short restart.",
        },
        {
          label: "Put the flag in Redis instead so both services read the same key",
          appeal: "It is fast and shared, and both services already connect to it.",
        },
      ],
      best: 1,
      verdict:
        "One server, one consumer and one owner. The database already stores the intent, and the engine is the only one that must act on it, so a reconcile loop closes the gap with no new parts and also recovers after any restart. An outbox would work but adds a table, a relay and a queue for a single consumer. A quick retry loop fails when the restart lasts longer than the retries. Moving the flag to Redis makes a cache the record.",
      claims: [
        {
          text: "You accept that a strategy may start up to one loop interval late.",
          axis: "trade",
          correct: true,
          note: "True. The gap between the save and the repair is as long as the timer, and you choose that interval.",
        },
        {
          text: "You get an exact guarantee that each start happens exactly once.",
          axis: "trade",
          correct: false,
          note: "A loop can only make state converge. Starting must be safe to repeat, because the loop and the direct call can both try.",
        },
        {
          text: "You avoid running new infrastructure such as a queue and a relay process.",
          axis: "trade",
          correct: true,
          note: "True. The only new code is a comparison the engine already has the data for.",
        },
        {
          text: "If the loop interval is much longer than the time that matters, a strategy can sit unstarted when it should be trading.",
          axis: "failure",
          correct: true,
          note: "The loop closes gaps only as fast as it runs. A start that must happen by 09:15 needs a check shortly before it.",
        },
        {
          text: "The flag in MySQL and the engine will never disagree once the loop exists.",
          axis: "failure",
          correct: false,
          note: "They can still differ between runs. The loop shortens the disagreement, it does not remove it.",
        },
        {
          text: "How long after saving the flag the strategy is actually running, and how often a mismatch is found.",
          axis: "measure",
          correct: true,
          note: "Together these show the real lag and whether failed calls are common enough to need a faster path.",
        },
        {
          text: "The number of lines in the sync code, since less code means a better design.",
          axis: "measure",
          correct: false,
          note: "Code size does not show whether the two sides agree. Measure the gap between intent and reality.",
        },
      ],
    },
    {
      id: "sd-consistency-position-cache",
      scenario:
        "A trading team proposes keeping each live strategy's open position only in Redis, because reads there take under a millisecond and the database takes several. In their setup Redis evicts keys when it runs out of memory, and the same Redis also holds queue jobs and candle caches. A restart or an eviction would drop the key. The broker holds the true position. What should the design be?",
      options: [
        {
          label: "Position only in Redis, with a longer expiry",
          appeal: "Fastest reads and a small change.",
        },
        {
          label: "Position stored in the engine's memory only",
          appeal: "No network at all, so the fastest of all.",
        },
        {
          label: "Position stored in the database on every change, with Redis only as a read cache and a periodic check against the broker",
          appeal: "Durable record, fast reads, and the broker as a final referee.",
        },
        {
          label: "Position stored in the browser and sent with each request",
          appeal: "It removes server storage entirely.",
        },
      ],
      best: 2,
      verdict:
        "A position is a fact with money attached and cannot be rebuilt from a cache. It needs a durable record, the broker is the final referee, and Redis can still serve fast reads as a copy. Redis-only or memory-only loses the position on eviction or restart, and the browser is not a source anyone should trust.",
      claims: [
        {
          text: "You accept a database write on every position change in exchange for a record that survives restarts.",
          axis: "trade",
          correct: true,
          note: "True. The extra write is small next to the cost of an unrecoverable position.",
        },
        {
          text: "Reads served from the Redis copy may briefly lag the database.",
          axis: "trade",
          correct: true,
          note: "True. That is why anything that decides an order should read the durable record, not the copy.",
        },
        {
          text: "Eviction cannot happen if you set a long enough expiry on the key.",
          axis: "failure",
          correct: false,
          note: "Expiry and eviction are different. A memory-pressure eviction can remove a key that has a long time left.",
        },
        {
          text: "If the database and the broker disagree about quantity, the broker's number should win and the difference should raise an alert.",
          axis: "failure",
          correct: true,
          note: "True. The broker owns the real position. A mismatch means the local record is wrong, or a trade happened outside the platform.",
        },
        {
          text: "Sub-millisecond reads prove the design is correct.",
          axis: "measure",
          correct: false,
          note: "Speed is not correctness. The right test is whether a lost cache loses any fact.",
        },
        {
          text: "How often the periodic broker check finds a mismatch, and how large each one is.",
          axis: "measure",
          correct: true,
          note: "A rising mismatch rate shows the local record is drifting, long before it causes a wrong order.",
        },
      ],
    },
    {
      id: "sd-consistency-order-events",
      scenario:
        "A broking platform with 40 engineers has an orders service and four consumers: risk, portfolio, notifications and reports. When an order is saved, an event must reach all four. Today the orders service commits to its database, then publishes to a message broker. About once a month a deploy or crash between the two steps loses an event, and a client's portfolio shows a stale position until someone notices. What do you change?",
      options: [
        {
          label: "Write an event row in the same transaction as the order, and let a relay publish it with retries",
          appeal: "The event and the order are saved together or not at all, and delivery retries until acknowledged.",
        },
        {
          label: "Publish the event first and save the order after",
          appeal: "It swaps the order of the two steps, so a crash now loses the order instead.",
        },
        {
          label: "Have each consumer compare its state to the orders table every 15 minutes",
          appeal: "No change to the orders service.",
        },
        {
          label: "Ask consumers to query the orders service before every action",
          appeal: "Always fresh, and no events to lose.",
        },
      ],
      best: 0,
      verdict:
        "Four consumers, real money and missed events that clients notice mean reliability of delivery is the requirement. An outbox removes the window between save and announce, and the relay retries until the broker accepts. Reversing the steps just moves the gap. A 15-minute comparison leaves clients stale for up to 15 minutes. Querying before every action puts every consumer's load on the orders service.",
      claims: [
        {
          text: "Consumers may now receive the same event twice, so they must handle duplicates safely.",
          axis: "trade",
          correct: true,
          note: "True. An outbox gives at-least-once delivery. A relay that crashes after sending and before marking the row will send it again.",
        },
        {
          text: "You add an outbox table and a relay process to operate and monitor.",
          axis: "trade",
          correct: true,
          note: "True. The cost is real, but with four consumers and monthly losses it is justified.",
        },
        {
          text: "The outbox makes delivery exactly-once with no work in consumers.",
          axis: "trade",
          correct: false,
          note: "Exactly-once is built from at-least-once delivery plus consumers that ignore repeats. The outbox alone does not give it.",
        },
        {
          text: "If the relay stops, events pile up unsent while orders still succeed.",
          axis: "failure",
          correct: true,
          note: "True. That is the intended trade: orders do not depend on the broker being up, but the relay needs an alert on its backlog.",
        },
        {
          text: "Publishing first and saving second removes the lost-event window.",
          axis: "failure",
          correct: false,
          note: "It reverses the failure: a crash now leaves an event for an order that was never saved, which is worse.",
        },
        {
          text: "The age of the oldest unsent outbox row.",
          axis: "measure",
          correct: true,
          note: "A growing age is the direct symptom of a stuck relay, and it reflects how stale consumers may be.",
        },
        {
          text: "The count of orders per day, which shows whether events are being lost.",
          axis: "measure",
          correct: false,
          note: "Order volume says nothing about delivery. Compare events delivered against orders saved, or watch the outbox backlog.",
        },
      ],
    },
  ],
};

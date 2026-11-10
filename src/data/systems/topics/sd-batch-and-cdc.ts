import type { Topic } from "../../types.ts";

export const sdBatchAndCdc: Topic = {
  id: "sd-batch-and-cdc",
  title: "Batch, streams and change data capture",
  tier: 5,
  week: 10,
  depth: "deep",
  summary:
    "Batch processes a finished pile of data, a stream processes events as they arrive, and change data capture turns database writes into a stream you can build on.",
  why: "Real systems keep the same facts in several places: a database, a search index, a cache, a warehouse, a report. Someone must decide how the copies are built and kept current. Batch jobs, stream processors and change data capture are the three standard answers, and each has a clear cost in delay, complexity and correctness. You need them to answer 'how does the dashboard stay in step with the database' in any design discussion. Traed is mostly batch today.",
  learn: {
    intuition:
      "A bank branch can work out the day's totals in two ways. In the first, the manager waits until closing time, collects every slip from the day, and tallies them in one sitting. The answer arrives late, but it is complete, and if a clerk made a mistake the manager simply tallies again from the same slips. In the second, a clerk updates a running total as each slip arrives. The total is always current, but a mistake in the middle quietly spoils everything after it, and fixing it needs care. A third idea is to ask the cashier to photocopy every entry made in the main ledger, and pass the copies to anyone who wants them. Everyone then builds their own summary from the same copies. That is the heart of capturing changes: use the ledger itself as the source of truth.",
    mechanics: [
      {
        heading: "Batch versus stream",
        body: "A batch job reads a bounded, finished input, such as yesterday's 10 million trades, and writes an output when it is done. It optimises for throughput and simplicity, and it can be re-run from the same input to get the same answer. A stream processor works on an unbounded flow, one event or one small window at a time, and keeps its answer current within seconds. The price is harder correctness: events arrive late and out of order, so the system tracks a watermark, a statement that 'we believe no events older than this are still to come', and decides when a window can close. Choose by how stale an answer may be.",
      },
      {
        heading: "The MapReduce idea",
        body: "Google's MapReduce showed how to run a batch job on many cheap machines. Map reads input pieces in parallel and emits key and value pairs. Shuffle sends all pairs with the same key to the same machine, usually by hash(key) mod reducers, sorting them on the way. Reduce combines the values for each key. To count trades per symbol, map emits (`NIFTY`, 1) for each trade, shuffle groups by symbol, and reduce sums. Because inputs are immutable and tasks are repeatable, a failed machine's task is simply run again elsewhere. Spark and modern warehouses keep the same shape with more speed.",
      },
      {
        heading: "Lambda and kappa architectures",
        body: "A team wants answers that are both fast and exactly right. The lambda architecture runs two paths. A batch layer recomputes the complete, accurate view every night, and a speed layer gives a rough view of today from a stream, and queries merge the two. The cost is writing and maintaining the same logic twice. The kappa architecture, proposed by Jay Kreps, uses one stream path. The raw events sit in a retained log, and when the logic changes, you start a new job that replays the log from the beginning, builds a new view beside the old one, and then switch readers over.",
      },
      {
        heading: "Change data capture and derived data",
        body: "Change data capture (CDC) reads the database's own write log, MySQL's binlog or PostgreSQL's write-ahead log, and publishes each row change as an event with the before and after values and a log position. A tool such as Debezium takes a snapshot first, then follows the log from that position, and saves its place so it can resume after a crash. Delivery is at-least-once, so consumers must tolerate repeats. This avoids dual writes, where application code updates the database and then a search index and one of them fails. Search, caches and warehouses become derived data, rebuildable by replay.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed is mostly batch, and that suits it. A cron scheduler runs option-chain collection every minute in market hours and a historical backfill and lookup-table refresh on weekday evenings. A backtest is a batch job that replays stored history through the strategy. Live tick handling is a small stream, minute by minute. Traed has no CDC, because MySQL is the only store of record, so nothing needs to be kept in step. It would reach for CDC if it added a second store, such as a search index or analytics warehouse, and wanted it fed from MySQL without dual writes.",
      },
    ],
    complexityDerivation:
      "Batch is correct by construction because its input is fixed. If the same code reads the same bytes, it produces the same output, so a bug is fixed by running again. Its cost is delay, which equals the schedule gap plus the run time. A stream cuts the delay to seconds but must reason about time: an event has an event time when it happened and a processing time when it arrived, and the two differ. A watermark trades completeness for speed, because closing a window early drops late events and closing it late adds delay. CDC rests on one invariant, that the database log is a total order of committed changes, so replaying it reproduces the table exactly. The argument holds while the log is retained from a known position and consumers are idempotent. It breaks when the log is purged before a consumer reads it, when schema changes are not handled, or when the question needs a transaction across two systems, which a copy cannot give.",
    variants: [
      {
        name: "Scheduled batch (cron, SQL, Spark)",
        when: "Results can be hours old, the input is large, and you want simple code you can re-run.",
        delta:
          "Reads a bounded input and writes a result. Easy to test and repair by re-running, with a delay equal to the schedule plus run time.",
      },
      {
        name: "Stream processing (Flink, Kafka Streams)",
        when: "The answer must be current within seconds, such as fraud flags, live counts or alerts.",
        delta:
          "Keeps state and windows over an unbounded flow. Faster answers, but you must handle late events, state recovery and restarts.",
      },
      {
        name: "Change data capture (Debezium on the binlog)",
        when: "A database is the source of truth and other systems need its changes without the app writing to each of them.",
        delta:
          "Reads committed changes from the database log into a stream. No dual writes, but you run a connector and handle schema changes, snapshots and duplicates.",
      },
    ],
    tradeoffs: [
      {
        vs: "Batch versus stream",
        pick: "Batch unless staleness is costly",
        because:
          "A nightly job is simple and re-runnable. Streaming earns its complexity only where minutes of delay lose money or trust, such as fraud checks.",
      },
      {
        vs: "Lambda (two code paths) versus kappa (replay one path)",
        pick: "Kappa when the log is retained and replay is fast enough",
        because:
          "Two copies of logic drift apart and double the bugs. A replayable log needs retention and enough capacity to reprocess history, which is the cost.",
      },
      {
        vs: "Dual writes versus change data capture",
        pick: "Change data capture",
        because:
          "With dual writes a crash between the two writes leaves them different for ever. CDC makes the database commit the single source and derives the rest from its log, at the cost of running a connector.",
      },
    ],
  },
  algorithms: [
    {
      name: "MapReduce shuffle by key hash",
      role: "Routes every pair with the same key to one reducer, so each key is aggregated in a single place.",
      dsa: "hashing",
    },
    {
      name: "External merge sort",
      role: "Sorts and merges data that is larger than memory, so a reducer can group values by key from sorted runs on disk.",
      dsa: "sorting",
    },
    {
      name: "Windowed aggregation with watermarks",
      role: "Groups events into time windows and closes each once the watermark passes, so late events are handled by a clear rule.",
      dsa: "sliding-window",
    },
    {
      name: "Log position checkpointing",
      role: "Saves the last processed binlog or log offset, so a CDC reader resumes exactly where it stopped after a crash.",
    },
  ],
  realWorld: [
    {
      system: "Google MapReduce",
      kind: "industry",
      problem:
        "Engineers needed to process terabytes of web data on thousands of unreliable machines without writing distributed code each time.",
      applied:
        "The MapReduce paper describes a map phase, a shuffle that groups by key, and a reduce phase, with the framework re-running tasks of failed machines. Inputs are immutable files, so a repeated task gives the same result.",
      evidence: "Dean and Ghemawat, MapReduce: Simplified Data Processing on Large Clusters (OSDI 2004)",
      impact:
        "A short program could run on a large cluster, and machine failures became a scheduling matter, not a correctness problem.",
    },
    {
      system: "Kafka-based kappa architecture",
      kind: "industry",
      problem:
        "Maintaining a batch pipeline and a streaming pipeline for the same logic doubled the code and produced results that disagreed.",
      applied:
        "Jay Kreps argued for one stream pipeline over a retained log. To change the logic, deploy a new version that reprocesses the log from the start into a new output, then switch readers to it.",
      evidence: "Jay Kreps, Questioning the Lambda Architecture (O'Reilly Radar, 2014)",
      impact:
        "One code base serves both live and reprocessing needs, provided the log keeps enough history.",
    },
    {
      system: "Debezium change data capture",
      kind: "industry",
      problem:
        "A search index or warehouse must follow a relational database without the application updating each one.",
      applied:
        "Debezium connectors read the MySQL binlog or the PostgreSQL write-ahead log, take an initial snapshot, then publish one event per row change to Kafka topics, recording the log position for restarts.",
      evidence: "Debezium documentation: architecture and connectors for MySQL and PostgreSQL",
      impact:
        "Downstream copies follow committed changes in order, and a failed connector resumes from its saved position.",
    },
    {
      system: "NSE end-of-day files and settlement",
      kind: "industry",
      problem:
        "Exchanges and brokers need a complete, agreed record of each day's trades for prices, margins and settlement.",
      applied:
        "NSE publishes end-of-day files such as the bhavcopy, a daily summary of traded securities, after the market closes. Clearing and settlement of equity trades run as scheduled cycles, now on a T+1 basis, not as per-trade streams.",
      evidence: "NSE India: bhavcopy reports and the T+1 settlement circulars (public)",
      impact:
        "Brokers, data vendors and investors build their records and reports from one closed-day dataset, and any mistake can be fixed by reprocessing that day.",
    },
  ],
  insights: [
    {
      t: "Batch has fixed input",
      d: "Same code over the same bytes gives the same answer, so a bug is fixed by running again. The cost is delay.",
    },
    {
      t: "Streams must reason about time",
      d: "Events have an event time and a processing time. A watermark decides when a window is closed, trading completeness for speed.",
    },
    {
      t: "CDC makes the database log the truth",
      d: "Read committed changes from the binlog, with a saved position, and derive search, cache and warehouse from it. No dual writes.",
    },
    {
      t: "Derived data is rebuildable",
      d: "If raw events or the log are retained, any derived view can be rebuilt by replay after a bug. Retention sets how far back you can fix.",
    },
  ],
  pitfalls: [
    "Dual-writing to the database and a search index in application code. A crash between the two leaves them different with no record of why.",
    "Starting CDC without planning the snapshot. Reading only the log from now misses all existing rows, and a snapshot taken at the wrong position loses or repeats changes.",
    "Choosing streaming because it sounds modern. If a result can be an hour old, a scheduled batch job is simpler to build, test and repair.",
  ],
  quiz: [
    {
      q: "In the MapReduce model, what does the shuffle step do?",
      options: [
        "Sends all pairs with the same key to the same reducer",
        "Randomly reorders records to balance the load across machines",
        "Merges every output file into one file on a single machine",
        "Copies the full input to every machine so any can answer",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Shuffle groups map output by key, normally using hash(key) mod number of reducers, so one reducer sees every value for a key and can aggregate it.",
      distractors: [
        "",
        "Shuffle is not random. It is a deterministic grouping by key, which a reducer needs to aggregate.",
        "That would funnel everything through one machine, which defeats parallel processing.",
        "Copying everywhere would waste the network. Each reducer needs only its own keys.",
      ],
    },
    {
      q: "What does change data capture read to learn about a change in a relational database?",
      options: [
        "The result of a SELECT of the whole table, run every second",
        "The application's request logs for each write operation",
        "A trigger that the application calls after each commit",
        "The database's own transaction log, such as the MySQL binlog",
      ],
      answer: 3,
      difficulty: "recall",
      why: "CDC tools follow the log the database already writes for recovery and replication, which holds every committed change in order.",
      distractors: [
        "Polling a whole table is heavy and misses changes between polls, including deletes.",
        "Request logs show attempted writes, not which ones committed or in what order.",
        "A call from the application is itself a second write that can fail independently, the dual-write problem.",
        "",
      ],
    },
    {
      q: "A bank needs a count of failed UPI payments per hour, for a dashboard that is allowed to be up to an hour old. Which approach is simplest and sound?",
      options: [
        "A stream processor with sub-second windows and exactly-once state",
        "A scheduled hourly query or batch job over the payments table",
        "A CDC pipeline into a search index, then a count over that index",
        "A custom application that updates a counter in each request",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The staleness limit is an hour, so a scheduled job over the data meets it. The stream and CDC options add moving parts the requirement does not need.",
      distractors: [
        "Sub-second freshness is not required here, so the stream machinery buys nothing.",
        "",
        "A second store plus CDC is far more to run for a number a query can produce.",
        "A counter in every request is a dual write. A crash between the payment and the counter makes them disagree.",
      ],
    },
    {
      q: "An app writes an order to MySQL and then calls the search index API to add it. One day the index call times out after the database commit. What goes wrong, and what fixes it?",
      options: [
        "Nothing, since the index will catch up on its own with no change",
        "The order is lost from the database, so use a bigger timeout",
        "The index lacks the order; use CDC from the binlog to feed the index",
        "The database rolls back, so retry the whole request from the start",
      ],
      answer: 2,
      difficulty: "apply",
      why: "This is a dual write. The database commit stands but the index missed it. With CDC, the index is fed from committed changes, so every committed order reaches it, and retries are safe if the consumer is idempotent.",
      distractors: [
        "Nothing replays the missing call, so the two stay different until someone notices.",
        "The commit already happened, so the order is in the database. A longer timeout does not fix the gap.",
        "",
        "A commit does not roll back because a later call failed. The two are separate operations.",
      ],
    },
    {
      q: "A fraud-score bug ran for 3 days. The team keeps raw payment events in a Kafka topic with 7 days of retention. What is the best way to correct the scores?",
      options: [
        "Edit the wrong rows by hand in the scores table, one client at a time",
        "Fix the code only, and accept that the old scores stay wrong for good",
        "Restart the consumer from the latest offset and skip the whole bad period",
        "Replay the retained events through the fixed code and replace the output",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Raw events are kept for 7 days, which covers the 3-day bug. Replaying them through the fixed code rebuilds correct derived data, the idea behind kappa-style reprocessing.",
      distractors: [
        "Hand edits do not scale, are hard to audit, and are easy to get wrong.",
        "Leaving wrong scores in place can mislead decisions that read them later.",
        "Starting at the latest offset skips the very events that need re-scoring.",
        "",
      ],
    },
    {
      q: "A CDC connector was down for 2 days. The MySQL server purges binlog files after 1 day. What is the problem on restart?",
      options: [
        "The connector can resume at its saved position with no gap",
        "Part of the log is gone, so a fresh snapshot is needed to rebuild",
        "MySQL automatically replays the old changes to the connector",
        "The connector rebuilds the missing changes from its own cache",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A CDC reader's saved position points into a log that has been purged. The changes in between cannot be read, so the consumer must re-snapshot the table and then follow the log again.",
      distractors: [
        "The saved position refers to a file that no longer exists, so there is a gap.",
        "",
        "MySQL does not keep a copy for a connector once the file is purged.",
        "The connector holds only a position, not the changes themselves.",
      ],
    },
    {
      q: "A team proposes a streaming cluster so that a monthly regulatory report is 'real time'. The regulator requires it once a month. What is the sound judgement?",
      options: [
        "Good idea, since real time is always better than batch",
        "Wise only if the stream uses at least three nodes",
        "Not needed; a monthly batch job meets the need with far less to run",
        "Wise because a batch job cannot be re-run if it fails",
      ],
      answer: 2,
      difficulty: "judge",
      why: "The requirement is monthly. A batch job is simple, testable and repeatable, and a stream adds cost and failure modes without any benefit to the regulator.",
      distractors: [
        "Real time costs complexity, and without a need for freshness it earns nothing.",
        "The number of nodes is not the question. The requirement does not call for streaming.",
        "",
        "Batch jobs are easy to re-run from the same input. That is one of their strengths.",
      ],
    },
    {
      q: "A team says: 'Lambda architecture is best, since we can have an accurate nightly batch and a fast stream.' What is the main weakness to raise?",
      options: [
        "The same logic must be written and kept in step in two systems",
        "Batch layers cannot recompute results from raw data at all",
        "Stream layers cannot give any answer for the current day",
        "The merged view can only be queried once each night",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Lambda's known cost is two code paths for one result, which drift apart and double the bugs. Kappa tries to avoid this with a single replayable stream.",
      distractors: [
        "",
        "Recomputing from raw data is exactly what the batch layer does well.",
        "The speed layer exists to give a quick answer for the current period.",
        "Queries merge both views and can run at any time, not only nightly.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-batch-and-cdc-nightly-pnl",
      scenario:
        "A one-server trading platform has one daily user. It stores about 2 million trade and order rows in MySQL. The founder wants a per-strategy profit and loss summary, ready each morning, and does not need anything newer than yesterday's close. The team is one person, and a cron scheduler and the MySQL database already exist. How should the summary be built?",
      options: [
        {
          label: "A Kafka and Flink pipeline fed by CDC from MySQL",
          appeal: "Always current and scales to any future size.",
        },
        {
          label: "Update running totals in the web request each time a trade closes",
          appeal: "No separate job, and numbers are always fresh.",
        },
        {
          label: "A cron-scheduled SQL job after the close that rebuilds the summary table from the trade rows",
          appeal: "Uses tools already present, easy to test, and can be re-run if wrong.",
        },
        {
          label: "A search cluster with a nightly index of trades",
          appeal: "Fast ad-hoc queries over trades.",
        },
      ],
      best: 2,
      verdict:
        "Yesterday's close is fresh enough, the data is small, and the team is one person, so a scheduled query is simplest, repeatable and cheap. A CDC and Flink pipeline is a large amount of machinery for 2 million rows. Running totals in the request are a dual write that can drift after a crash, and a search cluster adds a second store for a need a SQL query already meets.",
      claims: [
        {
          text: "You accept that the summary is up to a day old, in return for very little to build or run.",
          axis: "trade",
          correct: true,
          note: "True. The requirement allows it, and the saving in effort is large.",
        },
        {
          text: "You gain repeatability: if a trade row is corrected, re-running the job rebuilds the right summary.",
          axis: "trade",
          correct: true,
          note: "True. A batch job over fixed input can simply be run again.",
        },
        {
          text: "You get a sub-second view of profit and loss during the trading day.",
          axis: "trade",
          correct: false,
          note: "A nightly job gives a daily view only. Intraday needs a different design.",
        },
        {
          text: "If the job runs before the last trades are committed, the summary will miss them until the next run.",
          axis: "failure",
          correct: true,
          note: "True. Schedule after the close, and make the job idempotent so a re-run fixes it.",
        },
        {
          text: "A failed run leaves the old summary wrong for ever, as nothing can rebuild it.",
          axis: "failure",
          correct: false,
          note: "The source rows still exist, so the job can be re-run and the table rebuilt.",
        },
        {
          text: "Alert if the job has not finished by a set time, and compare its total with a direct sum of the trades.",
          axis: "measure",
          correct: true,
          note: "True. A missed deadline and a reconciliation figure catch both failure and wrong totals.",
        },
        {
          text: "The size of the summary table shows whether the job is correct.",
          axis: "measure",
          correct: false,
          note: "A table can be the right size and have wrong numbers.",
        },
      ],
    },
    {
      id: "sd-batch-and-cdc-order-search",
      scenario:
        "An Indian food-delivery company has a MySQL cluster as the record of orders, written by 6 different services. Support agents need a search page over orders that is correct within a few seconds. At present each service writes to the database and then calls the search index, and about once a week an order is missing from search because a call failed. 8,000 orders per minute arrive at the dinner peak. What should the team do?",
      options: [
        {
          label: "Capture changes from the MySQL binlog into a stream, and feed the search index from that stream with an idempotent consumer",
          appeal: "The database commit becomes the single source, and no service has to remember to update search.",
        },
        {
          label: "Ask all 6 services to retry the index call more times",
          appeal: "A small change in each service.",
        },
        {
          label: "Rebuild the whole search index from MySQL every night",
          appeal: "Simple batch job that fixes all gaps by the next day.",
        },
        {
          label: "Make the search page read straight from the MySQL database",
          appeal: "Removes the second store and its gaps entirely.",
        },
      ],
      best: 0,
      verdict:
        "The fault is a dual write across six services, and agents need seconds of freshness. CDC from the binlog makes the committed row the single source and feeds search for every service at once. More retries still fail when a service crashes between the two writes. A nightly rebuild leaves gaps for a day, and full-text search over the main database would load the system that takes orders.",
      claims: [
        {
          text: "You accept running a connector and a stream, and a small delay of seconds between commit and index.",
          axis: "trade",
          correct: true,
          note: "True. This is eventual consistency, usually fine for a support search page.",
        },
        {
          text: "You gain one change path for all 6 services, so a new service needs no search code.",
          axis: "trade",
          correct: true,
          note: "True. The log carries every committed change regardless of which service wrote it.",
        },
        {
          text: "You get search that always agrees exactly with the database at every instant.",
          axis: "trade",
          correct: false,
          note: "There is a lag, so a reader can briefly see an older state.",
        },
        {
          text: "If the connector is down longer than the binlog is kept, changes in the gap are lost and a fresh snapshot is needed.",
          axis: "failure",
          correct: true,
          note: "True. Binlog retention must exceed the longest expected outage.",
        },
        {
          text: "Because events are delivered exactly once, the consumer needs no protection against repeats.",
          axis: "failure",
          correct: false,
          note: "CDC delivery is normally at-least-once, so the index update must be idempotent.",
        },
        {
          text: "Measure the delay from commit to searchable, and compare order counts between database and index.",
          axis: "measure",
          correct: true,
          note: "True. Lag shows freshness and a count compare shows silent loss.",
        },
        {
          text: "The number of search queries per minute shows whether the index is complete.",
          axis: "measure",
          correct: false,
          note: "Query volume reflects usage and says nothing about missing orders.",
        },
      ],
    },
    {
      id: "sd-batch-and-cdc-replay-fix",
      scenario:
        "A broker's risk system reads a stream of order events from Kafka and computes a margin figure per client. A rounding bug in the margin code ran for 36 hours before it was found. About 2 million client-hours of margin figures are wrong. Raw events are kept for 14 days. The fix is ready. The team must correct the stored figures without taking the system down. What is the best approach?",
      options: [
        {
          label: "Patch the code and leave the old figures as they are",
          appeal: "No risk of touching data and no work to replay.",
        },
        {
          label: "Hand-edit the affected rows using a spreadsheet",
          appeal: "Targets just the wrong rows.",
        },
        {
          label: "Delete the margin table and recompute it from the live stream only",
          appeal: "Starts clean and needs no history.",
        },
        {
          label: "Run the fixed code from the first affected offset on the retained events into a new output, check it, then switch readers to it",
          appeal: "Rebuilds exact figures from the source events and leaves the live path running.",
        },
      ],
      best: 3,
      verdict:
        "Raw events are retained for 14 days, which covers the 36-hour bug, so the figures can be derived again exactly. Replaying into a new output and then switching readers keeps the live path running and allows a check first. Leaving wrong margins risks later decisions. Hand edits do not scale to 2 million figures, and a live-only rebuild has no history to recompute from.",
      claims: [
        {
          text: "You accept extra capacity to reprocess 36 hours of events beside the live load, and a short period with two outputs.",
          axis: "trade",
          correct: true,
          note: "True. Replay competes for compute, which is the price of exact repair.",
        },
        {
          text: "You gain figures that are provably derived from the source events with the corrected code.",
          axis: "trade",
          correct: true,
          note: "True. Derived data from an immutable log can be rebuilt.",
        },
        {
          text: "You give up the ability to compare old and new figures, because the old output must be deleted first.",
          axis: "trade",
          correct: false,
          note: "Writing to a new output keeps the old one for comparison until the switch.",
        },
        {
          text: "If the topic retention had been 1 day, the first 12 hours of the bug could not be replayed from the log.",
          axis: "failure",
          correct: true,
          note: "True. Retention sets the limit of what can be repaired by replay.",
        },
        {
          text: "Replaying cannot change the old output, because Kafka messages are immutable.",
          axis: "failure",
          correct: false,
          note: "The events are immutable, but the output is a new derived result written by the job.",
        },
        {
          text: "Compare totals and a sample of clients between old and new outputs, and check the replay's lag against the live offset.",
          axis: "measure",
          correct: true,
          note: "True. The compare shows the fix changed the right rows, and lag shows when the replay has caught up.",
        },
        {
          text: "CPU use during the replay shows whether the corrected figures are right.",
          axis: "measure",
          correct: false,
          note: "CPU shows effort. Correctness needs a comparison of values.",
        },
      ],
    },
  ],
};

import type { Topic } from "../../types.ts";

export const sdTimeseriesStorage: Topic = {
  id: "sd-timeseries-storage",
  title: "Time-series storage",
  tier: 2,
  week: 4,
  depth: "deep",
  summary:
    "Market history is read as a symbol plus a time range. Design the key and the indexes from those questions, and pay only for the extra shelves you use.",
  why: "Your biggest table is market history. When the backup notes measured it in September 2026, the option-chain table held 64 GB of a 72 GB database. Every backtest, chart and cached chunk is a read against it. If you can explain why its key is ordered the way it is, why it has two index orderings, and when a different kind of store would pay off, you can explain most of Traed's data cost and speed in one conversation.",
  learn: {
    intuition:
      "Picture a cupboard of diaries in an office. Each diary belongs to one instrument, and each page is one minute of trading. Most questions have the same shape: give me the NIFTY diary, pages 10 to 15. If the diaries stand side by side and the pages inside each one are in time order, that question is one reach and a short flip. Now someone asks a different question: give me page 10 of every diary. The same cupboard is slow for that, because you must open every diary and find the page. So you build a second index shelf, filed by page first and diary second. It answers the new question quickly, but it takes space, and every new page must now be written in two places. Notice what never happens: nobody goes back and edits last year's pages. New pages are only added at the end. Storing market history well is the art of choosing the filing order from the questions you will ask, and paying only for the shelves you really use.",
    mechanics: [
      {
        heading: "Start from the question, not the table",
        body: "Market data is almost always read as one instrument over a time range. A single contract trades for 375 one-minute bars in an NSE session (09:15 to 15:30), so one contract-day is 375 rows. A chain is a different shape: suppose 60 strikes, each with a call and a put, and one minute of the chain is 120 rows. Both shapes are real for an options backtest. Write the questions down first, with their sizes. The key and the indexes follow from that list, and the list also tells you which question you decided not to make fast.",
      },
      {
        heading: "Composite keys and the leftmost prefix",
        body: "A composite index sorts rows by its first column, then by the second inside each first value, and so on. It helps a query only if the query fixes the leading columns. An index on (symbol, expiry, strike, option type, time) is excellent for one contract over a range, but poor for every strike at one minute, because time is buried at the end. That second question wants the order (symbol, expiry, time, strike, option type). A unique key on the natural identity also makes re-running an ingest safe, because the second write replaces the first instead of adding a duplicate. Each extra index costs disk and slows every write.",
      },
      {
        heading: "Rows or columns",
        body: "A row store keeps all the fields of one record together. It is good when you fetch whole records, such as every field of one minute of one contract. A column store keeps one field together across many records. It is good when you scan a single field over a long range, such as the average close of 500 symbols over five years, and it compresses well because neighbouring values are similar. Kdb+ in banks, ClickHouse and Parquet files are column-oriented. The right choice depends on how many columns each query touches and how many rows it scans, not on how big the data looks.",
      },
      {
        heading: "Hot, warm and cold, and what to protect",
        body: "Recent data is read often, old data rarely. Tiering keeps the recent part on fast disk and moves the rest to cheaper storage, usually by splitting the table by time so a whole month can be moved or dropped at once. A second question is protection: some data is rebuildable from a vendor, and some is not. In Traed, the hourly logical backup deliberately leaves out the option-chain table and the processed candles, because they are bulk and reproducible. Irreplaceable tables such as users and orders are backed up. Backup cost is therefore spent where loss is permanent.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep minute-level option-chain history in one MySQL table, with one row per contract per minute and the greeks stored beside the prices. It has two composite indexes, one ordered for a single contract over time and one for a whole chain at a moment, because backtests and charts ask both questions. A unique key makes backfills safe to re-run. We chose it because we have one server and one daily user, and a single table is easy to operate. The cost is size: it dominates the disk and is left out of the hourly backup. We would revisit if one column scans over years became common.",
      },
    ],
    complexityDerivation:
      "The idea holds because of how an ordered index works. Finding the start of a range costs about log N steps, and reading the range then costs the number of rows returned. So a query whose filter matches the index order costs roughly its own result size, no matter how large the table grows. That is the invariant: cost follows the answer, not the archive. Time-series data helps in two ways. Writes arrive in time order, so new rows land at the end of the index and old pages are never rewritten. And reads are range scans, which disks serve well. The argument stops holding in four cases. A second access pattern appears and the first index cannot serve it. A query must touch one column over billions of rows, and a row store drags every other column along. The data outgrows one disk, and backups and restores become the real limit. Or history is corrected after the fact, which breaks the append-only assumption. Each case has a named remedy: another index, a column store, partitioning or sharding, and versioned rows.",
    variants: [
      {
        name: "Relational table with composite indexes",
        when: "One machine, mixed queries, a team that already runs MySQL or Postgres.",
        delta:
          "Every access pattern needs its own index ordering. Simple to operate and to join with other tables, but a wide table grows large and indexes multiply the write cost.",
      },
      {
        name: "Key-value or wide-column store (partition key plus sort key)",
        when: "Very high write rates or many tenants, where each read names one partition and a sort-key range.",
        delta:
          "Reads by partition and time range are fast and scale out. Any query that cannot name the partition key becomes a scan, so the key design must match the questions in advance.",
      },
      {
        name: "Columnar time-series store or files",
        when: "Analytics over long ranges and few columns, such as research on years of ticks.",
        delta:
          "Scans of one column are far cheaper and data compresses well. Single-row lookups and frequent small updates are weaker, and it is another system to run.",
      },
    ],
    tradeoffs: [
      {
        vs: "One index for every column versus one index per query shape",
        pick: "One index per query shape you actually run",
        because:
          "Each index must be updated on every insert and takes disk. An index nobody queries is pure cost. List the real questions, build the orderings they need, and measure before adding more.",
      },
      {
        vs: "Store derived values (greeks) versus compute them on read",
        pick: "Store them when many reads need the same numbers",
        because:
          "Computing implied volatility and greeks once at ingest saves repeating the work in every backtest. The price is a wider row and more disk, and a stored value must be recomputed if the formula changes.",
      },
      {
        vs: "Relational table versus key-value store for history",
        pick: "Relational while queries are mixed and the team is small",
        because:
          "A key-value store rewards a fixed set of questions at large scale. A single founder with changing queries gets more from flexible indexes and joins than from scale they do not need yet.",
      },
    ],
  },
  realWorld: [
    {
      system: "Kdb+ in bank tick databases",
      kind: "industry",
      problem:
        "Trading desks must store years of ticks and quotes and run fast analytics over a few columns, such as price and size, for many symbols.",
      applied:
        "Kdb+ is a column-oriented database, widely used by investment banks and exchanges for tick data. Tables are split by date, and recent data is kept in memory while older dates sit on disk.",
      evidence: "Public vendor documentation and conference talks on kdb+ tick architecture (KX Systems)",
      impact:
        "Scans of one column over long ranges stay cheap, which is the pattern a row store handles worst.",
    },
    {
      system: "Zerodha Kite historical candles API",
      kind: "industry",
      problem:
        "A broker cannot let one client request years of minute bars in a single call.",
      applied:
        "The Kite Connect historical API returns candles for one instrument token at a chosen interval, and limits how many days one request may span depending on the interval. Clients fetch long histories in chunks and store them.",
      evidence: "Zerodha Kite Connect documentation: historical candle data",
      impact:
        "Every platform that wants a long minute history has to build its own store. That is why Traed keeps its own copy.",
    },
    {
      system: "Traed option-chain history table",
      kind: "yours",
      problem:
        "Options backtests and charts need minute-level prices, volume, open interest and greeks for every strike, and they ask two different questions of the same rows.",
      applied:
        "One row per symbol, expiry, minute, strike and option type, with a unique key on that identity and more than two dozen numeric columns. Index migrations add one ordering for a single contract over time and another for a full chain snapshot at a moment.",
      evidence:
        "strategy-engine/app/models/option_chain_historical.py; CMS/trade-server/database/migrations/2025_11_22_add_missing_option_chain_indexes.php",
      impact:
        "Both access patterns read mostly their own result size, and backfills can be re-run because the unique key rejects duplicates.",
    },
    {
      system: "Traed backup tiers",
      kind: "yours",
      problem:
        "The history table dwarfs everything else, and backing it up hourly would be costly and slow.",
      applied:
        "The hourly logical backup excludes the option-chain table and the processed candles as bulk and reproducible. The backup notes measured the option-chain table at 64 GB of 72 GB of data on 20 September 2026.",
      evidence: "deployment-scripts/backup/README.md",
      impact:
        "Backup effort is aimed at tables whose loss cannot be repaired by re-fetching from a vendor.",
    },
  ],
  insights: [
    {
      t: "Questions decide the key",
      d: "List the queries and their sizes first. A key that matches the filter makes cost follow the result, not the table.",
    },
    {
      t: "Leftmost prefix rule",
      d: "A composite index helps only when the query fixes its leading columns. Time buried at the end serves a contract series, not a chain snapshot.",
    },
    {
      t: "Append-only is the gift",
      d: "Time-series rows arrive in order and are rarely edited, so indexes stay tidy and re-runnable ingests need only a unique key.",
    },
    {
      t: "Protect what cannot be rebuilt",
      d: "Reproducible bulk history can skip the hourly backup. Orders and accounts cannot be re-fetched from anyone.",
    },
  ],
  pitfalls: [
    "Adding an index for every column. Each one slows every insert and uses disk, and most will never be used.",
    "Designing the key for the first query and forgetting the second. A chain snapshot against a time-last index scans far more than it returns.",
    "Choosing a different database because the table is big. Size alone is not a reason; the shape of the queries is.",
  ],
  quiz: [
    {
      q: "What should decide the key and index order of a market-history table?",
      options: [
        "The column order in the vendor's data file",
        "Alphabetical order of the column names",
        "The queries you will run and how large each result is",
        "The order that makes inserts easiest to write",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Reads dominate, and an index helps only when it matches the filter. Start from the list of questions, then pick the ordering.",
      distractors: [
        "File order says nothing about how you will read the data later, and copying it often puts the wrong column first.",
        "Alphabetical order feels neutral, but a neutral order matches no query, so it speeds up none.",
        "",
        "Easy inserts are tempting, but writes are the cheaper side; the index must serve the reads.",
      ],
    },
    {
      q: "Why does a column store suit 'average close of 500 symbols over five years'?",
      options: [
        "It reads only the close column, and similar neighbouring values compress well",
        "It keeps every record together so one read returns all fields",
        "It forbids duplicates by design, so averages are always correct",
        "It stores data in memory only, so nothing touches the disk",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The query touches one field over a huge number of rows. A column layout reads just that field and compresses it well. A row store drags all the other columns along.",
      distractors: [
        "",
        "That describes a row store, which is better for fetching whole records, not for scanning one field.",
        "Duplicate handling is a key and constraint question, separate from layout.",
        "Column stores use disk as well; some also use memory, but that is not what makes this query cheap.",
      ],
    },
    {
      q: "An index is on (symbol, expiry, strike, option_type, time). A chart needs every strike of one expiry at 10:15 on one day. How will that query behave?",
      options: [
        "It uses the whole index and is fast, because every column is present",
        "It cannot use the index at all, because time is not the first column",
        "It is fast whenever the table is small, whatever order the index columns are in",
        "It uses only the symbol and expiry prefix, then reads the rest of those rows and filters",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Only the leading columns can narrow the search. Strike and option type are not fixed, so time cannot be used for seeking. The query reads a large block and filters. An ordering with time before strike fixes this.",
      distractors: [
        "Having every column in an index does not help unless the leading ones are fixed in order.",
        "The prefix (symbol, expiry) is still usable, so the index is not ignored; it just narrows too little.",
        "Size does not rescue a wrong ordering; the query reads far more rows than it returns at any size.",
        "",
      ],
    },
    {
      q: "A chain has 60 strikes, each with a call and a put. How many rows does one NSE session of 1-minute bars (09:15 to 15:30) add for that one expiry?",
      options: [
        "7,500",
        "45,000",
        "22,500",
        "3,750",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The session is 375 minutes. 60 strikes times 2 option types is 120 contracts. 120 times 375 is 45,000 rows for one expiry in one day.",
      distractors: [
        "That counts 20 contracts for 375 minutes, which forgets most of the strikes and sides.",
        "",
        "That counts 60 contracts, which misses that each strike has both a call and a put.",
        "That counts only 10 contracts for the session, a tenth of the right figure.",
      ],
    },
    {
      q: "A backfill of minute bars from a vendor crashes halfway and is started again from the beginning. What best stops duplicate rows?",
      options: [
        "A unique key on the natural identity, with an upsert or skip on conflict",
        "A longer cache lifetime on the rows already written",
        "A faster server, so the second run finishes before the first rows are noticed",
        "An index on the timestamp alone",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A unique key makes the second write of the same record either replace or skip the first, so re-running is safe. Traed's option-chain table has such a key on symbol, expiry, time, strike and option type.",
      distractors: [
        "",
        "Caching does not stop the database storing the same row twice.",
        "Speed does not change correctness; the duplicate is created whenever the rerun happens.",
        "A plain index helps lookups but allows duplicates. Only a uniqueness constraint prevents them.",
      ],
    },
    {
      q: "A researcher wants the daily range of one column across 8 years of ticks for 1,800 equities, a few times a week. Which setup is the best fit?",
      options: [
        "Keep a row-store table and add an index on every column",
        "Add a second MySQL server and replicate everything",
        "Cache each finished answer in memory for a full day and reuse it",
        "Store the ticks in a columnar format, partitioned by date",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The query scans one column over a vast number of rows, which is where column storage and date partitions pay off. More indexes or replicas still read whole rows.",
      distractors: [
        "Indexes help narrow rows, but this query needs all of them, and each index slows ingest.",
        "A replica gives read capacity, not a cheaper scan of one column.",
        "A cache helps repeated identical questions, but each new range is a fresh scan.",
        "",
      ],
    },
    {
      q: "A single-server platform has a 64 GB history table and one user. An engineer proposes moving it to a distributed columnar database because 'it is big'. Queries today are range reads of full rows and finish in seconds. What is the sound judgement?",
      options: [
        "Agree; a table above 50 GB always needs a distributed store",
        "Measure first; tune indexes or archive before adding a second system",
        "Agree, but only after deleting the oldest year of data first",
        "Reject any change, since MySQL can store anything you give it",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A new system adds operations work for a solo operator. Size alone does not justify it when queries finish in seconds. Revisit if scans of one column over years become the main workload.",
      distractors: [
        "There is no fixed size threshold; a 64 GB table is routine for a well-indexed relational database.",
        "",
        "Deleting history loses data you may need for backtests and does not address a problem you have not measured.",
        "Never changing is too rigid; the right answer is to change when the measured workload changes.",
      ],
    },
    {
      q: "Ingest got slower after the team added six indexes 'to be safe'. Only two query shapes are actually used. What should they do?",
      options: [
        "Add a seventh index on the column that is slowest to query",
        "Move the ingest run to the evening so nobody notices it",
        "Drop indexes no real query uses; keep one ordering per shape",
        "Keep all of them, because disk space is cheap these days",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Every index is updated on every insert and takes disk. Keep the two orderings the real queries need, and remove the rest after checking query plans.",
      distractors: [
        "More indexes increase the write cost further and move the problem rather than solve it.",
        "Shifting the time hides the symptom, but a backfill and a morning read still carry the extra cost.",
        "",
        "Disk is the smaller cost; the write slowdown and longer backups matter more.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-timeseries-storage-small-chain",
      scenario:
        "One founder runs a trading platform on a single server. The minute-level option-chain table is 64 GB. Backtests read one contract over weeks, and a chart reads a whole chain at one minute. Both finish in a few seconds. A friend suggests moving to a columnar database. The table is backfilled by a nightly job that is sometimes re-run.",
      options: [
        {
          label: "Keep the MySQL table, with one index ordering per query shape and a unique key",
          appeal:
            "Nothing new to operate, queries already work, and the unique key makes the re-run safe.",
        },
        {
          label: "Migrate everything to a columnar time-series database now",
          appeal:
            "Columnar stores compress well and are the standard answer for market history at scale.",
        },
        {
          label: "Move the history into a key-value store keyed by symbol",
          appeal:
            "Reads by symbol and time are fast, and it scales without a big server.",
        },
        {
          label: "Drop all indexes and rely on the server's memory",
          appeal:
            "No write cost from indexes, and 64 GB of data might fit a large cache.",
        },
      ],
      best: 0,
      verdict:
        "The workload is two known query shapes, full rows, one server and one user, and it already meets its latency. A relational table with an ordering per shape serves both, and the unique key handles the re-run. A second system would add operations cost with no measured problem. Revisit when one-column scans over years become common.",
      claims: [
        {
          text: "You accept a larger table and slower writes because two index orderings must be maintained.",
          axis: "trade",
          correct: true,
          note: "True. Each ordering is a second copy of the key columns, and every insert updates both.",
        },
        {
          text: "You give up cheap one-column scans over many years, which a columnar store would handle better.",
          axis: "trade",
          correct: true,
          note: "True, and it names the condition under which this choice expires.",
        },
        {
          text: "You give up correctness, because a relational index can return stale rows.",
          axis: "trade",
          correct: false,
          note: "An index returns the same rows as a scan. Staleness belongs to caches, not to indexes.",
        },
        {
          text: "If the nightly job is re-run without a unique key, duplicate rows will inflate results.",
          axis: "failure",
          correct: true,
          note: "True. Backtests would count a bar twice, which is why the key matters.",
        },
        {
          text: "A chain query against a time-last index will fail with an error.",
          axis: "failure",
          correct: false,
          note: "It will not error. It will simply read far more rows than it returns and be slow.",
        },
        {
          text: "You should track query time for both shapes and the table's growth, and revisit when either drifts.",
          axis: "measure",
          correct: true,
          note: "True. These are the signals that the design is ageing.",
        },
        {
          text: "The size of the table in gigabytes alone is enough evidence to switch stores.",
          axis: "measure",
          correct: false,
          note: "Size does not describe the queries. A 64 GB indexed table can be perfectly healthy.",
        },
      ],
    },
    {
      id: "sd-timeseries-storage-tick-archive",
      scenario:
        "A broker keeps ten years of tick data for all NSE and MCX instruments, many terabytes in total. Quant researchers scan one or two columns, such as price and size, over months of data for hundreds of symbols. The newest week is also read by live dashboards. Storage cost is rising each month.",
      options: [
        {
          label: "One large row-store table with indexes on every column",
          appeal:
            "A single system everyone already knows, and every column is searchable.",
        },
        {
          label: "A single in-memory database holding all ten years",
          appeal:
            "Reads would be extremely fast and the design is simple.",
        },
        {
          label: "A columnar store partitioned by date, with recent days on fast disk and older days on cheaper storage",
          appeal:
            "Scans of a few columns are cheap, data compresses, and old partitions can move without touching new ones.",
        },
        {
          label: "Delete everything older than a year",
          appeal:
            "Cuts cost immediately and keeps the working set small.",
        },
      ],
      best: 2,
      verdict:
        "The queries scan few columns across huge ranges, and the cost problem is old data on expensive storage. A columnar layout cuts bytes read, and date partitions allow tiering by age. A row store with many indexes inflates storage, memory for ten years is unaffordable, and deleting history destroys research value.",
      claims: [
        {
          text: "You accept a second system to operate and more complex single-row lookups in return for cheap scans.",
          axis: "trade",
          correct: true,
          note: "True. Column stores are weaker at point updates and small lookups.",
        },
        {
          text: "Date partitions let you move or drop whole months of data without rewriting recent data.",
          axis: "trade",
          correct: true,
          note: "True. This is why partitioning by time is the usual tiering unit.",
        },
        {
          text: "Moving to a column store removes the need to think about access patterns.",
          axis: "trade",
          correct: false,
          note: "It changes which patterns are cheap. Partition and sort choices still have to match the questions.",
        },
        {
          text: "A query that names no date range will scan every partition and be very slow.",
          axis: "failure",
          correct: true,
          note: "True. Partition pruning needs a filter on the partition key.",
        },
        {
          text: "Moving old partitions to cheap storage makes recent dashboard reads slower.",
          axis: "failure",
          correct: false,
          note: "Recent partitions stay on fast disk, so dashboards read the same data they did before.",
        },
        {
          text: "Compare bytes scanned and query time before and after on a real researcher query.",
          axis: "measure",
          correct: true,
          note: "True. Bytes scanned is the figure that shows the layout is paying off.",
        },
        {
          text: "The number of tables in the database is the best signal of success.",
          axis: "measure",
          correct: false,
          note: "Table count says nothing about query cost or storage spend.",
        },
      ],
    },
    {
      id: "sd-timeseries-storage-kv-keys",
      scenario:
        "A team stores 1-minute bars for 2,000 symbols in a key-value store where each item is addressed by a partition key and a sort key. The common read is one symbol over a date range. Today's bars for the most-traded index are written and read thousands of times per minute by many processes. Which key layout do they choose?",
      options: [
        {
          label: "Partition key = symbol and day, sort key = minute timestamp",
          appeal:
            "One partition holds one symbol-day of 375 or so bars, so a day is a single cheap read and load spreads across days and symbols.",
        },
        {
          label: "Partition key = symbol only, sort key = timestamp",
          appeal:
            "Simplest to explain, and a date range is one sort-key query on a single partition.",
        },
        {
          label: "Partition key = timestamp, sort key = symbol",
          appeal:
            "Writes at any one minute are spread across symbols, and a chain at one moment is easy.",
        },
      ],
      best: 0,
      verdict:
        "The usual read is one symbol over days, so symbol must be in the partition key. Adding the day bounds each partition to a few hundred bars, so a hot symbol's writes today do not share a partition with last month and no partition grows for ever. Timestamp as the partition key would put each minute's writes for every symbol on one partition, and a symbol over a range would become a scan.",
      claims: [
        {
          text: "A multi-week range for one symbol now needs several reads, one per day, instead of one.",
          axis: "trade",
          correct: true,
          note: "True. Splitting by day buys even load at the price of more requests for long ranges.",
        },
        {
          text: "You gain bounded partition size, because each symbol-day is a few hundred items.",
          axis: "trade",
          correct: true,
          note: "True. That is the reason to add the day to the key.",
        },
        {
          text: "The layout makes cross-symbol queries at one minute as cheap as single-symbol ones.",
          axis: "trade",
          correct: false,
          note: "That query now needs one read per symbol. A second table or index keyed by time would be required.",
        },
        {
          text: "With symbol alone as the partition key, one very busy symbol can become a hot partition.",
          axis: "failure",
          correct: true,
          note: "True. All its writes and reads land on one partition, which has a throughput limit.",
        },
        {
          text: "With timestamp as the partition key, each partition quietly grows without limit.",
          axis: "failure",
          correct: false,
          note: "Each minute is a small partition. The actual problem is a symbol over a range becoming a scan.",
        },
        {
          text: "Watch per-partition throttling and the number of requests per user chart load.",
          axis: "measure",
          correct: true,
          note: "True. Throttling shows hot keys, and request count shows the cost of daily splitting.",
        },
        {
          text: "Average item size is the main figure that shows the key design is sound.",
          axis: "measure",
          correct: false,
          note: "Item size is unrelated to how load spreads or how many requests a read needs.",
        },
      ],
    },
  ],
};

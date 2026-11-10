import type { Topic } from "../../types.ts";

export const sdIndexesBtreeLsm: Topic = {
  id: "sd-indexes-btree-lsm",
  title: "Indexes: B-trees and LSM trees",
  tier: 2,
  week: 3,
  depth: "deep",
  summary:
    "An index trades write work and space for fast reads. See how B-trees and LSM trees work, where read and write amplification come from, and how to order columns.",
  why: "Most 'the database is slow' problems are an index problem, and most 'the database cannot keep up with writes' problems are the other side of the same coin. An engineer who knows how a B-tree page splits and how an LSM tree compacts can predict which workload will hurt before it ships. It is also the question behind choosing between MySQL, PostgreSQL, Cassandra and RocksDB. Traed's biggest table has several composite indexes, so the cost of each is a live decision there.",
  learn: {
    intuition:
      "Think of a thick telephone directory. Without any order you would read every page to find one name. Because it is sorted, you open it near the middle, see which half your name is in, and repeat. In a few steps you are at the right page. That sorted structure is an index. Now suppose people keep moving house. In one kind of directory the printer fixes the right page every time, tearing out and reprinting it when it is full. That is quick to read but each change touches a whole page. In another kind, new entries go on a loose sheet at the front, and every so often the sheets are merged into the main book. Changes are cheap, but to look up a name you may check the loose sheet and several older volumes. The first is a B-tree and the second is an LSM tree. Neither is better everywhere. They move the cost to different places.",
    mechanics: [
      {
        heading: "What an index is, and why a B-tree is shallow",
        body: "An index is a second, sorted structure that maps a column value to the row's location, so the database can jump to rows instead of scanning the table. The B-tree, or more exactly the B+ tree, is the usual one. Data is stored in fixed-size pages, 16 KB in MySQL InnoDB and 8 KB in PostgreSQL. Each page holds hundreds of keys and pointers, so the tree is very wide and very short. Take a fan-out of 400. Two levels reach 160,000 keys, and three levels reach 64 million. So a lookup among 50 million rows reads about three pages, and the top ones are always in memory. A range query finds the first key, then walks the linked leaf pages in order.",
      },
      {
        heading: "B-tree writes: update in place, split, log first",
        body: "A B-tree changes the page where the key belongs. If the page is full, it splits into two half-full pages and adds a key to the parent, which may split too, but rarely. Changing a few bytes means rewriting a whole page, a form of write amplification. Random keys cause random disk writes. To survive a crash in the middle of a split, the database first appends a description of the change to a write-ahead log (WAL), flushes that log, and only later writes the page. After a crash it replays the log. Reads are cheap and predictable, which is why B-trees run most relational databases. Writes pay for a page rewrite plus a log record, and for every extra index on the table.",
      },
      {
        heading: "LSM trees: memtable, SSTables and compaction",
        body: "A log-structured merge tree turns random writes into sequential ones. A write goes to a WAL for safety and into the memtable, a sorted structure in memory. When the memtable reaches, say, 64 MB it is written to disk as one immutable sorted file, an SSTable. Files pile up, so a background compaction merges several sorted files into one, using a k-way merge, and drops overwritten and deleted entries. In levelled compaction each level is about ten times bigger than the one above, so a byte may be rewritten about ten times per level it moves down. That is the LSM's write amplification. A read checks the memtable, then files from newest to oldest. A Bloom filter on each file answers 'definitely not here' cheaply, so most files are skipped.",
      },
      {
        heading: "Composite and covering indexes",
        body: "A composite index sorts by several columns in order, like a directory sorted by surname, then first name. It serves a query only through its leftmost columns. An index on `(symbol, expiry, ts)` answers `symbol = 'NIFTY' AND expiry = '2026-11-26' AND ts BETWEEN a AND b` as one tight range. It cannot help a query on `expiry` alone, because the entries are not sorted by expiry on their own. The rule: equality columns first, then the range column. A covering index also contains the columns the query selects, say `(symbol, ts, close)`, so the answer comes from the index without visiting the table. That saves a page read per row. Every extra index must be updated on every insert, so each one slows writes and uses disk.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed's MySQL tables use InnoDB, so its indexes are B-trees. The big table is `option_chain_historical`, which holds one row per option per minute and has a unique key on symbol, expiry, timestamp, strike and option type. Several migrations add more composite indexes on it, including one with extra columns for backtest reads, and they begin with the same few columns. Each one adds work to every insert and disk space on a very large table, so a check of which are really used is worthwhile. Traed has no LSM store of its own. It would look at one only if tick ingestion became too write-heavy for one MySQL server.",
      },
    ],
    complexityDerivation:
      "The B-tree argument is about height. If each page holds b keys, the tree needs about log base b of n levels, and with b near 400 that is three or four even for billions of rows. So reads are almost constant, and a write touches one leaf, plus a log record. The LSM argument is about batching. Writes are appended to memory and flushed in large sorted runs, so disk sees sequential I/O, which is fast. The bill arrives later as compaction, which rewrites data several times, and as reads that must consult several files. That is the read, write and space amplification triangle: tuning one pushes cost into another. The designs fit different workloads. The B-tree wins when reads dominate, when range scans must be predictable, and when you want one clear place for each key. The LSM wins when writes are heavy and mostly appends. Both arguments weaken when the data is far larger than memory and reads are random, because then every level costs a disk read. They also weaken if compaction cannot keep up: files pile up, reads slow, and the store may throttle writes to protect itself.",
    variants: [
      {
        name: "B+ tree (InnoDB, PostgreSQL)",
        when: "Read-heavy or mixed workloads, range scans, and cases where predictable read latency matters.",
        delta:
          "One lookup path and cheap range scans. Random writes rewrite pages, and each extra index adds write cost.",
      },
      {
        name: "LSM tree (RocksDB, Cassandra, Bigtable)",
        when: "Write-heavy, append-like workloads such as logs, events and time-series ingestion.",
        delta:
          "Writes are sequential and fast. Reads may touch several files, and compaction uses background I/O and rewrites data.",
      },
      {
        name: "Hash index or in-memory structure",
        when: "Only exact-match lookups are needed, with no ordering or range queries.",
        delta:
          "Constant-time lookup, but no range scans and no ordered traversal, so it cannot answer 'between these two times'.",
      },
    ],
    tradeoffs: [
      {
        vs: "More indexes versus faster writes",
        pick: "Index the queries you run, and drop the rest",
        because:
          "Each index speeds some reads and slows every insert and update. Measure which ones the planner actually uses, and remove overlapping ones.",
      },
      {
        vs: "B-tree versus LSM for a new store",
        pick: "B-tree by default; LSM for sustained heavy writes",
        because:
          "A B-tree has simple, predictable reads. Choose an LSM store when write volume is the problem and you can accept compaction work and slightly slower reads.",
      },
      {
        vs: "Covering index versus a narrow index",
        pick: "Cover your hottest read, keep others narrow",
        because:
          "Covering skips the table visit and can make a read several times cheaper. It also makes the index bigger and costlier to maintain, so do it only for a proven hot query.",
      },
    ],
  },
  algorithms: [
    {
      name: "B+ tree search and page split",
      role: "Descends a few wide pages to find a key, and splits a full page in two to keep the tree balanced.",
      dsa: "balanced-trees",
    },
    {
      name: "K-way merge compaction",
      role: "Merges several sorted SSTables into one sorted file in a single pass, dropping overwritten and deleted entries.",
      dsa: "heaps",
    },
    {
      name: "Bloom filter per SSTable",
      role: "Lets a read skip files that definitely do not contain the key, which cuts disk reads on lookups.",
      dsa: "probabilistic",
    },
    {
      name: "Binary search inside a page",
      role: "Finds the right key among the hundreds held in one page once the page has been read.",
      dsa: "binary-search",
    },
  ],
  realWorld: [
    {
      system: "MySQL InnoDB and PostgreSQL B-trees with a WAL",
      kind: "industry",
      problem:
        "A relational database must find rows by key quickly, support range queries, and survive a crash without corrupting a half-written page.",
      applied:
        "InnoDB stores the table itself as a B+ tree on the primary key in 16 KB pages, with secondary indexes pointing back to it, and uses a redo log. PostgreSQL uses 8 KB pages with B-tree indexes and a write-ahead log.",
      evidence: "MySQL InnoDB documentation: clustered and secondary indexes; PostgreSQL documentation: B-tree indexes and WAL",
      impact:
        "Most of the world's transactional data sits behind this design. Lookups take a handful of page reads, and a crash is repaired by replaying the log.",
    },
    {
      system: "Google Bigtable and LevelDB, and RocksDB",
      kind: "industry",
      problem:
        "A store must absorb a very high write rate on ordinary disks, where random writes are slow and sequential writes are fast.",
      applied:
        "Bigtable's paper describes writes going to a commit log and an in-memory memtable, flushed to immutable sorted SSTable files that are merged by compaction. LevelDB, from Google, and RocksDB, which Facebook developed from it, are embeddable storage engines built on the same design.",
      evidence: "Google Bigtable paper (OSDI 2006); LevelDB and RocksDB project documentation",
      impact:
        "RocksDB is used as the storage layer inside many databases and systems, because the LSM design turns random writes into sequential ones.",
    },
    {
      system: "Apache Cassandra",
      kind: "industry",
      problem:
        "A distributed database must accept writes on every node at high rates, such as messages, events and sensor readings, without a read-before-write on the disk.",
      applied:
        "Cassandra appends each write to a commit log and a memtable, flushes SSTables, merges them by compaction, and uses a Bloom filter per SSTable to avoid reading files that cannot hold the key. It offers several compaction strategies.",
      evidence: "Apache Cassandra documentation: storage engine and compaction",
      impact:
        "Writes stay fast even at large scale, and the operator tunes compaction strategy to trade read speed against write cost and disk use.",
    },
    {
      system: "Traed option_chain_historical indexes",
      kind: "yours",
      problem:
        "One table holds a row per option per minute and is read by backtests in many shapes: a symbol over a time range, a whole chain at one moment, one contract's series.",
      applied:
        "The table has a unique key on symbol, expiry, timestamp, strike and option type. Migrations add composite indexes in different column orders for those read shapes, one of them including extra value columns so a read can be answered from the index.",
      evidence:
        "docs/LLD.md section 1 (option_chain_historical); CMS/trade-server/database/migrations/2025_07_19_optimize_option_chain_historical_indexes.php",
      impact:
        "Each read shape gets a tight range scan, and each index also adds cost to every insert, so the set is worth reviewing against what queries really run.",
    },
  ],
  insights: [
    {
      t: "An index is a sorted shortcut",
      d: "It buys fast reads with extra disk and extra write work. Nothing about it is free.",
    },
    {
      t: "B-trees are wide, so they are short",
      d: "With hundreds of keys per page, three levels cover tens of millions of rows. A lookup is about three page reads.",
    },
    {
      t: "LSM turns random writes into sequential ones",
      d: "Memtable, flush, compaction. You pay later in rewrites and in reads that check several files.",
    },
    {
      t: "Column order is the contract",
      d: "A composite index helps through its leftmost columns only. Equality columns first, then the range column.",
    },
  ],
  pitfalls: [
    "Adding an index for every slow query. Each one slows all inserts and updates, and overlapping ones give no extra benefit.",
    "Putting the range column before an equality column. The index then cannot narrow to one tight range, and the planner may scan far more than needed.",
    "Choosing an LSM store for read-heavy random lookups. Reads may check several files, and compaction competes with them for disk.",
  ],
  quiz: [
    {
      q: "In an LSM tree, what does the memtable do?",
      options: [
        "It stores the permanent copy of all data on disk",
        "It tracks which keys have been deleted across the cluster",
        "A sorted in-memory buffer for recent writes",
        "It rebuilds the B-tree after a crash",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Writes land in the memtable, which is sorted and in memory, and a log protects it from loss. When full, it is flushed as an immutable sorted file.",
      distractors: [
        "Permanent data lives in SSTable files on disk. The memtable is only the newest, in-memory slice.",
        "Deletes are recorded as markers in the data itself, and a memtable is local to one node.",
        "",
        "LSM trees have no B-tree to rebuild. Crash recovery replays the write-ahead log into a memtable.",
      ],
    },
    {
      q: "Why can a B-tree reach tens of millions of rows in only three or four levels?",
      options: [
        "Wide pages: hundreds of keys per page",
        "It keeps the whole tree in memory at all times",
        "It stores only every hundredth row",
        "It uses hashing to skip levels",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The height is about log base fan-out of the row count. With a fan-out of several hundred, each extra level multiplies capacity by that factor.",
      distractors: [
        "",
        "Only the upper levels are usually cached. The leaves of a large index live on disk.",
        "A B-tree indexes every row. Skipping rows would make lookups wrong.",
        "Hashing gives exact matches without order. The B-tree's shortness comes from wide pages.",
      ],
    },
    {
      q: "A table has an index on (symbol, expiry, ts). Which query can use all three columns as one tight range?",
      options: [
        "WHERE expiry = '2026-11-26' AND ts BETWEEN a AND b",
        "WHERE symbol = 'NIFTY' AND expiry = '2026-11-26' AND ts > a",
        "WHERE ts BETWEEN a AND b AND strike > 22000",
        "WHERE symbol = 'NIFTY' OR expiry = '2026-11-26'",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A composite index works from its leftmost columns. Two equalities on symbol and expiry fix a position in the sort order, and the ts range is then contiguous.",
      distractors: [
        "Without symbol, the entries are not sorted by expiry on its own, so the leading column cannot narrow the search.",
        "",
        "Entries are ordered by symbol first, so a ts range with no symbol is scattered through the whole index.",
        "An OR across two columns cannot form one contiguous range in this ordering.",
      ],
    },
    {
      q: "A B-tree page holds about 400 keys. Roughly how many page reads does one lookup need for 50 million rows?",
      options: [
        "About 50 million, one per row",
        "About 400, one per key in a page",
        "About 25, because log of 50 million is near 25",
        "About three, since 400 cubed is 64 million",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Each level multiplies reach by 400. Two levels give 160,000 and three give 64 million, which covers 50 million rows. The top pages are usually cached too.",
      distractors: [
        "That would be a full scan, which is what an index exists to avoid.",
        "Reading every key of one page happens in memory, using binary search. It is not 400 disk reads.",
        "Log base 2 is the figure for a binary tree. B-trees fan out far wider, so the height is much smaller.",
        "",
      ],
    },
    {
      q: "A backtest query selects symbol, ts and close for one symbol and a time range. Profiling shows most time is spent visiting the table row by row after the index finds the keys. What helps most?",
      options: [
        "Add a separate index on close alone",
        "Raise the page size to 64 KB or more",
        "Partition the table by month and symbol",
        "Add a covering index on (symbol, ts, close)",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A covering index holds every column the query needs, so the answer comes from the index alone and the per-row table visit disappears.",
      distractors: [
        "An index on close alone does not help find rows by symbol and time, and still needs table visits.",
        "Bigger pages change fan-out but not the extra visit to the table for each row.",
        "Partitioning can limit the data scanned, but each found row would still need a table visit.",
        "",
      ],
    },
    {
      q: "An LSM store has 12 SSTable files. Lookups for keys that do not exist are slow, because each check reads several files. What reduces this most directly?",
      options: [
        "Disable the write-ahead log",
        "A Bloom filter on each file",
        "Make the memtable smaller",
        "Sort the files by size",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A Bloom filter answers 'definitely not in this file' from a small in-memory bit array, so a lookup for a missing key usually reads no file at all.",
      distractors: [
        "The log protects against crashes. It is not part of the read path.",
        "",
        "A smaller memtable flushes more often and creates more files, which makes lookups worse.",
        "Ordering by size does not tell a read which files can be skipped.",
      ],
    },
    {
      q: "A service ingests 300,000 small events a second, almost all appends, and is read mainly by recent time range. A team uses a B-tree database and sees write stalls. Which direction is the soundest?",
      options: [
        "Evaluate an LSM-based store for the writes",
        "Add more secondary indexes so reads stay fast",
        "Move to a hash index for the timestamp column",
        "Lower the page size so each write touches less data",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Sustained, append-heavy writes are where LSM trees excel, because they buffer in memory and write sorted runs sequentially. The team accepts compaction cost in return.",
      distractors: [
        "",
        "Each extra index adds work to every write, which is the opposite of what this load needs.",
        "A hash index cannot answer a time range, and recent-range reads are the main query.",
        "Smaller pages change split frequency a little but do not remove random page rewrites.",
      ],
    },
    {
      q: "A table has 11 indexes, built over time for slow queries. Inserts have slowed noticeably. A teammate wants to add a 12th for a new report. What is the soundest next step?",
      options: [
        "Add it, since reads are always more important than writes",
        "Drop every index and rely on the primary key",
        "Prune unused indexes first, then judge the new one",
        "Move the table to an LSM store without looking at the queries",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Every index adds work to each insert. Using the planner's evidence to prune first gives back write speed and tells you whether an existing index already serves the report.",
      distractors: [
        "That ignores the cost already visible in slow inserts, and the 12th index adds to it.",
        "Removing all of them would turn the important reads into full scans.",
        "",
        "Changing engines without evidence trades one set of costs for another and may not help.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-indexes-btree-lsm-chain-scan",
      scenario:
        "A small team runs MySQL on one server. A table of 200 million option-chain rows is read by backtests in one main shape: all rows for one symbol and one expiry between two timestamps, returning strike, option type and close. Today there are separate single-column indexes on symbol, expiry and timestamp, and the query takes minutes. The table is bulk-loaded once a night and otherwise read-only.",
      options: [
        {
          label: "Add more single-column indexes on strike and option type",
          appeal:
            "More indexes give the planner more choices, and each one is simple to add.",
        },
        {
          label: "Add one composite index on (symbol, expiry, timestamp) that also carries strike, option type and close",
          appeal:
            "Equality columns first and the range last gives one tight scan, and the extra columns let the query skip the table.",
        },
        {
          label: "Move the table to an LSM store",
          appeal:
            "LSM stores handle huge data volumes and heavy ingestion.",
        },
        {
          label: "Index (timestamp, symbol, expiry) so the time range is first",
          appeal:
            "The time range is what makes the query selective, so it seems natural to lead with it.",
        },
      ],
      best: 1,
      verdict:
        "The query has two equalities and one range, so the index should lead with symbol and expiry and end with timestamp. Carrying the selected columns makes it covering. Because the table is loaded once a night and read otherwise, the extra write cost is paid once and hardly matters. Single-column indexes cannot be combined into one tight range, an LSM store is for write-heavy loads, and leading with the range column scans far more entries.",
      claims: [
        {
          text: "You accept a larger index on disk and a slower nightly load, because the index must be built and maintained on every insert.",
          axis: "trade",
          correct: true,
          note: "True. This is the price of a covering index, and a nightly bulk load absorbs it.",
        },
        {
          text: "You accept that this index helps this query shape and does little for a query on strike alone.",
          axis: "trade",
          correct: true,
          note: "True. A composite index serves its leftmost columns, so other shapes may need their own index.",
        },
        {
          text: "You gain faster inserts, because a composite index replaces three single ones.",
          axis: "trade",
          correct: false,
          note: "Adding the index adds write work. Dropping the old single-column ones would reduce it, but that is a separate step.",
        },
        {
          text: "A query that filters only on expiry will still use the new index to find its rows quickly.",
          axis: "failure",
          correct: false,
          note: "Expiry is not the leftmost column, so the entries are not ordered by it alone and the index cannot narrow the search.",
        },
        {
          text: "If someone later adds a column that the query selects but the index lacks, the query silently stops being covered and returns to visiting the table.",
          axis: "failure",
          correct: true,
          note: "True. Covering is a property of the query and index together, and it can be lost without an error.",
        },
        {
          text: "You would run EXPLAIN and check that the plan uses the new index and reports reading from the index only.",
          axis: "measure",
          correct: true,
          note: "True. The plan shows the chosen index and whether a table visit remains.",
        },
        {
          text: "You would count the number of indexes on the table, since fewer is always better regardless of the queries.",
          axis: "measure",
          correct: false,
          note: "The number alone says nothing. What matters is whether each index is used and what it costs on writes.",
        },
      ],
    },
    {
      id: "sd-indexes-btree-lsm-upi-events",
      scenario:
        "A payments platform records every transaction event, such as initiated, debited, credited and failed, for audit and support. Peak ingestion is several hundred thousand events a second, nearly all inserts, spread over many accounts. Reads are mostly 'the latest events for this account' and the occasional audit range. The current B-tree database shows write stalls at peak and its disk is busy with random writes.",
      options: [
        {
          label: "Add faster disks and more secondary indexes",
          appeal:
            "Faster disks help any database, and more indexes make support queries quicker.",
        },
        {
          label: "Use a hash index on account id",
          appeal:
            "Account lookup is by exact id, and a hash index answers that in constant time.",
        },
        {
          label: "Move the event log to an LSM-based store partitioned by account, with time as the sort key",
          appeal:
            "Writes are buffered and flushed sequentially, and the latest events for an account sit together in sorted order.",
        },
        {
          label: "Keep the B-tree and shrink the page size",
          appeal:
            "Smaller pages mean each write rewrites less data.",
        },
      ],
      best: 2,
      verdict:
        "The load is sustained, append-heavy and mostly read by recent time per account, which suits an LSM store with an account and time key. Writes become sequential flushes. More indexes make every insert costlier, a hash index cannot serve time ranges, and a smaller page does not remove random page rewrites.",
      claims: [
        {
          text: "You accept that compaction uses background disk and CPU and can cause latency spikes if it falls behind.",
          axis: "trade",
          correct: true,
          note: "True. Compaction is the deferred cost of cheap writes.",
        },
        {
          text: "You accept that point reads of old events may check several files, so tail read latency is less predictable than in a B-tree.",
          axis: "trade",
          correct: true,
          note: "True. Read amplification is the LSM trade, reduced by Bloom filters and caches but not removed.",
        },
        {
          text: "You gain the ability to update an event in place cheaply, since LSM stores overwrite records on disk.",
          axis: "trade",
          correct: false,
          note: "LSM files are immutable. An update writes a newer version, and the old one is removed later by compaction.",
        },
        {
          text: "If compaction cannot keep up with ingestion, files accumulate, reads slow down, and the store may throttle writes to protect itself.",
          axis: "failure",
          correct: true,
          note: "True. Compaction debt is the classic LSM failure mode at sustained peak.",
        },
        {
          text: "A crash loses the events held in the memtable, because it exists only in memory.",
          axis: "failure",
          correct: false,
          note: "A write-ahead log is written first, and replayed after a restart, so acknowledged writes survive.",
        },
        {
          text: "You would watch the number of pending compactions and files per level, along with p99 read and write latency at peak.",
          axis: "measure",
          correct: true,
          note: "True. Pending compaction and file counts are the early warning that the store is falling behind.",
        },
        {
          text: "You would measure B-tree page splits per second, which shows how the LSM store is doing.",
          axis: "measure",
          correct: false,
          note: "An LSM store has no page splits to count. Its equivalents are flushes and compactions.",
        },
      ],
    },
    {
      id: "sd-indexes-btree-lsm-order-lookup",
      scenario:
        "A broker's support tool shows a client's last 50 orders with id, instrument, status and price. The orders table has 80 million rows in PostgreSQL, 2 reads per second at peak, and 300 writes per second. An index on (client_id, created_at) exists. A support lead says the page takes about 400 ms because each of the 50 rows needs a trip to the table. The team is three people.",
      options: [
        {
          label: "Add an index that also includes instrument, status and price, so the page is answered from the index",
          appeal:
            "It removes the 50 table visits with a single schema change and no new technology.",
        },
        {
          label: "Move orders to a wide-column store",
          appeal:
            "It would scale to far more traffic than this table sees.",
        },
        {
          label: "Add a cache in front and cache every client's page for an hour",
          appeal:
            "Cached pages are instant and the database is spared.",
        },
        {
          label: "Drop the (client_id, created_at) index and scan the table",
          appeal:
            "Fewer indexes make writes cheaper.",
        },
      ],
      best: 0,
      verdict:
        "Traffic is tiny (2 reads and 300 writes a second), the index already finds the 50 rows, and the cost is the per-row table visit. Including the needed columns covers the query. The write overhead of a slightly wider index at 300 writes a second is negligible. A new store is needless for this load, a one-hour cache would show stale order status to support, and dropping the index would make the page far slower.",
      claims: [
        {
          text: "You accept a larger index and a little more work per insert and per status update.",
          axis: "trade",
          correct: true,
          note: "True. Included columns widen the index entries and must be kept current when the row changes.",
        },
        {
          text: "You accept that a status change now updates the index entry too, which would matter more if status changed millions of times a second.",
          axis: "trade",
          correct: true,
          note: "True. At 300 writes a second this is negligible, but the cost grows with write rate.",
        },
        {
          text: "You avoid all write overhead, because included columns are stored only in the table.",
          axis: "trade",
          correct: false,
          note: "Included columns are stored in the index, which is why the table visit can be skipped and why writes cost more.",
        },
        {
          text: "If a query later selects another column, such as fees, it falls back to visiting the table and the page slows again.",
          axis: "failure",
          correct: true,
          note: "True. Covering depends on every selected column being present in the index.",
        },
        {
          text: "Because the index is covering, a crash during a status update can leave the table and the index disagreeing for good.",
          axis: "failure",
          correct: false,
          note: "The write-ahead log covers table and index changes together, so recovery restores them to a consistent state.",
        },
        {
          text: "You would compare the query plan and its time before and after, looking for an index-only scan.",
          axis: "measure",
          correct: true,
          note: "True. An index-only plan with a lower time confirms the change did what was intended.",
        },
        {
          text: "You would measure the cache hit rate of the orders page to confirm the index works.",
          axis: "measure",
          correct: false,
          note: "There is no cache in the chosen design, and a hit rate would not test an index.",
        },
      ],
    },
  ],
};

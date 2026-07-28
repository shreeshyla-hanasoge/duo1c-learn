import type { Topic } from "../types.ts";

export const stackComplexity: Topic = {
  id: "stack-complexity",
  title: "Complexity of your actual stack",
  tier: 5,
  week: 23,
  depth: "deep",
  summary: "DynamoDB access patterns, index design, query planning.",
  why: "The database is a data structure. Most application-level performance is really an index-design question.",
  learn: {
    intuition:
      "There is a habit of treating the database as a place where data lives, and the algorithms as something you write in application code. That gets the proportions backwards. A B-tree index is a data structure, a query planner is an algorithm selector, and a DynamoDB partition key is a hash function — so almost every performance decision you make at the storage layer is a data-structures decision wearing different vocabulary. Once you see it that way, a lot of production mysteries become ordinary. A query that got slower as the table grew is a missing index, which is to say a linear scan where you assumed a logarithmic seek. Pagination that degrades on later pages is an offset walking rows it will discard. A hot partition is a hash function with a skewed distribution. None of these are database trivia; they are the same failures this curriculum has been describing all along, occurring one layer down. The practical consequence is that no amount of application code fixes a wrong access pattern. If the storage layer is doing O(n) work, wrapping it in a faster loop changes nothing — you have to change the structure, and at the storage layer that means the key or the index.",
    mechanics: [
      {
        heading: "The partition key is a hash function; the sort key is an ordered index",
        body: "In DynamoDB, the partition key decides which physical partition holds an item — that is a hash. Within a partition, items are stored ordered by sort key, which is a B-tree. So `Query` is a hash lookup followed by a range seek, and `Scan` is a full table read with filtering afterwards. Designing the key is designing the algorithm, and no amount of application code repairs a wrong one.",
      },
      {
        heading: "An index is a precomputed sort you pay for on every write",
        body: "Adding an index makes some reads logarithmic instead of linear, and makes every insert, update and delete do extra work to maintain it. An index nobody queries is pure cost — write amplification and storage with no compensating read. This is why 'add an index' is a trade rather than an improvement, and why auditing for unused indexes is worth doing periodically.",
      },
      {
        heading: "Offset pagination degrades; keyset pagination does not",
        body: "`OFFSET 10000` makes the database produce and discard ten thousand rows before returning anything, so page 500 costs five hundred times page one. A keyset cursor — `WHERE (created_at, id) > (:last_ts, :last_id) ORDER BY created_at, id LIMIT 20` — seeks directly into the index and costs the same on every page. The composite tie-break matters: ordering by a non-unique column alone can skip or repeat rows across pages.",
      },
      {
        heading: "Read the query plan — it is the profiler for your database",
        body: "`EXPLAIN ANALYZE` shows what the planner actually chose and what it actually cost, not what you hoped. A sequential scan where you expected an index seek is the single most common production performance bug, and it is usually caused by something specific: a function applied to the indexed column, a type mismatch between the parameter and the column, or statistics so stale the planner believes the table is small.",
      },
      {
        heading: "Watch for the distribution, not just the operation",
        body: "A hash-partitioned store assumes keys spread evenly, and real keys rarely do. Partitioning orders by customer when one customer is a tenth of your volume creates a hot partition that throttles while the rest of the table idles — the same failure as a hash table where every key collides. The fix is the same too: change the key so it distributes, usually by adding a suffix or choosing a different attribute.",
      },
    ],
    complexityDerivation:
      "Every bound here is one you already know, relabelled. An indexed lookup is a B-tree descent at O(log n) — but the base of that logarithm is the node fan-out, typically several hundred keys per page, so a billion-row table is about four levels deep. That is why database people count page reads rather than comparisons: four reads against a table scan's millions is the whole argument for an index, and it is a constant-factor story about page size rather than an asymptotic one. A full scan is O(n) with a very large constant, because it is disk or network rather than memory. A hash join is O(n + m) after building a hash table on the smaller side; a nested-loop join without an index is O(n · m), and that is precisely the quadratic that turns a fast development query into a production incident once both tables grow. Offset pagination is O(offset + limit) per page, so paging through the whole table is quadratic in total — the sum of 1 + 2 + 3 + … pages of discarded work — while keyset pagination is O(log n + limit) per page and linear overall. The useful reframing is that when you write `EXPLAIN` and see a nested loop over a sequential scan, you are looking at the same O(n · m) that a doubly-nested `for` loop would give you, with the difference that each operation costs a disk seek rather than a nanosecond.",
    variants: [
      {
        name: "Single-table design with composite keys",
        when: "DynamoDB and similar key-value stores.",
        delta:
          "Encode the access pattern into the sort key — `ORDER#2026-07#...` — so one Query retrieves a related set. Powerful, and it commits you to the access patterns you designed for.",
      },
      {
        name: "Covering index",
        when: "A read-heavy query touching a few columns.",
        delta:
          "Include the selected columns in the index so the query is answered from the index alone, without visiting the table. Larger index, no table lookups.",
      },
      {
        name: "Materialised view or rollup table",
        when: "An expensive aggregate read far more often than the underlying data changes.",
        delta:
          "Precompute and refresh. Trades staleness and write cost for a read that no index could make fast.",
      },
      {
        name: "Read replica or a separate analytical store",
        when: "Analytical queries competing with transactional traffic.",
        delta:
          "Different access patterns want different structures. A columnar store answers aggregates over billions of rows in a way no row-oriented index will.",
      },
    ],
    tradeoffs: [
      {
        vs: "Adding an index",
        pick: "Add it when a read is hot and the write cost is acceptable — and check for one that already covers it",
        because:
          "Every index slows every write to the table and consumes storage. The common failure is accumulating indexes nobody queries, each taxing every insert forever. Before adding, check whether an existing index's leading columns already serve the query, since a composite index on (a, b) serves queries on a alone. Before keeping, check whether anything has used it lately — most databases expose index usage statistics.",
      },
      {
        vs: "Fixing it in application code",
        pick: "Fix the access pattern; application code cannot repair a scan",
        because:
          "Caching a slow query hides it until the cache misses, and parallelising a scan multiplies the load without reducing the work. If the storage layer is doing O(n) where O(log n) was available, the only real fix is at the storage layer. The exception worth naming is when the query is genuinely rare and slow, where a cache is a legitimate and much cheaper answer than reshaping the schema.",
      },
      {
        vs: "Denormalising",
        pick: "Denormalise when the join is the bottleneck and the write path can maintain consistency",
        because:
          "Duplicating data removes joins from the read path and moves the burden to writes, which must now update several places consistently. That is exactly the trade a materialised view or a single-table design makes explicitly. It is the right call for read-dominated workloads with clear ownership of the write path, and a source of long-lived data-integrity bugs when several services write the same duplicated field.",
      },
    ],
  },
  realWorld: [
    {
      system: "learn-duo1c — the progress table's key design",
      kind: "yours",
      problem:
        "Progress is written per topic and read as a whole set for a user on every sync. If the key were designed per topic without a shared partition, reading a user's progress would need one request per topic or a scan.",
      applied:
        "Partition by user and sort by subject and topic, so one Query returns everything for a user in a single ordered read — the hash-then-range-seek pattern. The merge is monotone, so retries and concurrent writers are safe without a transaction, which is a schema-level consequence of the same decision.",
      evidence: "infra/lib/data-stack.ts",
      impact: "One request per topic, or a scan → one Query per user sync",
    },
    {
      system: "DynamoDB hot partitions",
      kind: "industry",
      problem:
        "A table partitioned by tenant where one tenant generates a large share of the traffic. That tenant's partition throttles while the rest of the table sits idle, and adding capacity does not help because the limit is per partition.",
      applied:
        "This is a hash function with a skewed key distribution — the same failure as a hash table where most keys collide. The fix is at the key: add a computed suffix to spread the hot tenant across several partitions and fan out reads across them, accepting more read requests in exchange for removing the throttle.",
      impact: "A throttled partition beside an idle table → load spread, at the cost of fan-out on read",
    },
    {
      system: "Keyset pagination in production APIs",
      kind: "industry",
      problem:
        "An API paginating with `LIMIT`/`OFFSET` gets slower on every subsequent page, and paging through a large result set becomes quadratic overall. Rows can also be skipped or repeated when the underlying data changes between pages.",
      applied:
        "Cursor-based pagination carries the last row's sort key and seeks straight into the index, costing the same on page 500 as on page 1. It also fixes the correctness problem, because the cursor is a position in a stable ordering rather than a count of rows that may have shifted. The tie-break column is essential — ordering by a non-unique timestamp alone reintroduces the skipping.",
      impact: "Page cost growing with page number → constant per page, and stable across concurrent writes",
    },
    {
      system: "The sequential scan nobody expected",
      kind: "industry",
      problem:
        "A query with a perfectly good index on the filtered column runs as a full table scan in production, while behaving correctly in development where the table is small.",
      applied:
        "Usually one of three causes, all visible in `EXPLAIN ANALYZE`: a function wrapping the indexed column so the index no longer matches, a type mismatch between the bound parameter and the column, or statistics so stale the planner still believes the table has a thousand rows. All three are invisible in the query text and obvious in the plan, which is why reading the plan is the first diagnostic step rather than the last.",
      impact: "Reframes a mysterious slowdown as a specific, diagnosable planner decision",
    },
  ],
  cases: [
    {
      id: "sk-pagination",
      scenario:
        "An endpoint returns a user's transaction history, twenty per page, ordered by creation time. It uses `LIMIT 20 OFFSET :n`. Support reports that late pages take several seconds, and occasionally a transaction appears on two consecutive pages. What do you change?",
      options: [
        {
          label: "Add an index on the created_at column",
          appeal:
            "Ordering by an indexed column avoids a sort, which is the obvious cost in the plan.",
        },
        {
          label: "Switch to keyset pagination on (created_at, id)",
          appeal:
            "The cursor seeks directly into the index, so every page costs the same — and it fixes the duplicate rows too.",
        },
        {
          label: "Cache each page after it is first requested",
          appeal:
            "Late pages are requested repeatedly by the same user, so a cache would make the second visit fast.",
        },
        {
          label: "Cap the maximum page number",
          appeal:
            "Deep pagination is rarely useful, and a limit protects the database from the worst case.",
        },
      ],
      best: 1,
      verdict:
        "Two symptoms, one cause. The slowness is `OFFSET` producing and discarding n rows before returning any; the duplicates are rows shifting position between requests because an offset counts rows rather than pointing at one. Keyset pagination fixes both: the cursor is a position in a stable ordering, so page 500 costs what page 1 does and concurrent inserts cannot shift it. An index on `created_at` is necessary and not sufficient — the offset still walks the index. The `id` tie-break matters, because `created_at` alone is not unique.",
      claims: [
        {
          text: "You are accepting that clients can no longer jump to an arbitrary page number, only forward and backward from a cursor.",
          axis: "trade",
          correct: true,
          note: "The genuine cost, and it is what makes this a design decision rather than a pure win. Most list UIs never needed random page access.",
        },
        {
          text: "You are accepting a change to the public API contract, since the cursor replaces a page number.",
          axis: "trade",
          correct: true,
          note: "Real, and it needs a migration path — usually supporting both for a period, which is a cost worth naming up front.",
        },
        {
          text: "You are accepting slightly stale results, since the cursor is captured at the first page.",
          axis: "trade",
          correct: false,
          note: "The opposite: a cursor gives a MORE consistent view than an offset, because it names a position rather than counting rows that may have moved.",
        },
        {
          text: "Ordering by a non-unique column without a tie-break lets rows be skipped or repeated at page boundaries.",
          axis: "failure",
          correct: true,
          note: "The subtle failure this design must avoid — which is exactly why the cursor is on (created_at, id) rather than created_at alone.",
        },
        {
          text: "Keyset pagination requires loading the whole result set into memory.",
          axis: "failure",
          correct: false,
          note: "It does the opposite — it seeks into the index and reads only the page. Loading everything is what you would do to paginate in application code.",
        },
        {
          text: "Latency by page depth, to confirm it is now flat rather than growing.",
          axis: "measure",
          correct: true,
          note: "Directly tests the claim. If page 500 still costs more than page 1, the index is not being used the way the design assumes.",
        },
        {
          text: "Whether the query plan shows an index scan with the cursor as a seek condition rather than a filter.",
          axis: "measure",
          correct: true,
          note: "The plan is where you confirm the seek actually happens. A cursor written as a filter rather than a range condition looks correct and scans anyway.",
        },
        {
          text: "Cache hit rate for paginated responses.",
          axis: "measure",
          correct: false,
          note: "There is no cache in the chosen design, and adding one would have hidden the problem rather than fixed it.",
        },
      ],
    },
    {
      id: "sk-hot-partition",
      scenario:
        "A multi-tenant table is partitioned by tenant ID. One tenant produces about 30% of all traffic and its partition is throttling, while overall table capacity sits well below its provisioned limit. Raising provisioned capacity has not helped. What is the fix?",
      options: [
        {
          label: "Raise the provisioned capacity further",
          appeal:
            "Throttling means insufficient capacity, and more capacity is the direct remedy.",
        },
        {
          label: "Change the key to spread the hot tenant across several partitions, and fan out reads",
          appeal:
            "The limit is per partition, so the only real fix is to stop that tenant's traffic landing on one.",
        },
        {
          label: "Move the large tenant to its own dedicated table",
          appeal:
            "Isolates the noisy neighbour completely and gives that tenant independent capacity.",
        },
        {
          label: "Add a cache in front of the table",
          appeal:
            "Absorbs read traffic before it reaches the partition, relieving the throttle.",
        },
      ],
      best: 1,
      verdict:
        "The throughput limit is per partition, so table-level capacity is irrelevant while the traffic is concentrated — this is a hash function with a skewed key distribution, and the fix is the same as for a colliding hash table: change the key. Adding a computed suffix spreads the tenant across several partitions, at the cost of fanning reads across them. A dedicated table is a legitimate alternative and is a much larger operational change; a cache helps only reads and leaves writes throttled.",
      claims: [
        {
          text: "You are accepting fan-out on read — a query for that tenant must now hit several partitions and merge results.",
          axis: "trade",
          correct: true,
          note: "The direct cost of the fix, and the reason it is not applied to every key by default.",
        },
        {
          text: "You are accepting more complex key construction that every reader and writer must implement identically.",
          axis: "trade",
          correct: true,
          note: "An ongoing correctness burden: one service computing the suffix differently writes items nobody can find.",
        },
        {
          text: "You are accepting eventual consistency for that tenant's reads.",
          axis: "trade",
          correct: false,
          note: "Spreading across partitions does not change the consistency model. Each read is as consistent as it was; there are simply more of them.",
        },
        {
          text: "If the suffix count is fixed and the tenant keeps growing, the same throttle returns on each of the new partitions.",
          axis: "failure",
          correct: true,
          note: "The fix has a ceiling tied to a constant chosen today, and nothing alerts when the tenant outgrows it.",
        },
        {
          text: "Spreading the key will cause items to be lost, since the original key no longer locates them.",
          axis: "failure",
          correct: false,
          note: "Existing items need migrating or a compatible read path, which is a real migration concern — but nothing is lost, and the read path is deterministic once the suffix rule is shared.",
        },
        {
          text: "Throttled request count per partition, not just at the table level.",
          axis: "measure",
          correct: true,
          note: "The table-level view is exactly what hid the problem. Per-partition metrics are where a hot key is visible at all.",
        },
        {
          text: "The distribution of traffic across partition keys, to catch the next hot key before it throttles.",
          axis: "measure",
          correct: true,
          note: "Turns a recurring incident into a leading indicator, and it is the metric that would have caught this one early.",
        },
        {
          text: "Total table storage size.",
          axis: "measure",
          correct: false,
          note: "Storage is unrelated to a throughput limit that is per partition. It would look entirely healthy throughout the incident.",
        },
      ],
    },
    {
      id: "sk-index-audit",
      scenario:
        "A transactional table has eleven indexes accumulated over three years. Write latency has been climbing steadily and bulk imports now take hours. Nobody remembers what several of the indexes were for. What do you do?",
      options: [
        {
          label: "Add a covering index for the slowest read so at least reads improve",
          appeal:
            "Reads are what users see, and a covering index avoids table lookups entirely.",
        },
        {
          label: "Audit index usage statistics, drop the unused ones, and check whether composite indexes already cover others",
          appeal:
            "Every index taxes every write forever, so an unused one is pure cost with no compensating benefit.",
        },
        {
          label: "Move bulk imports to a replica and promote it afterwards",
          appeal:
            "Takes the import cost off the primary entirely, without touching the schema.",
        },
        {
          label: "Increase the instance size",
          appeal:
            "More I/O throughput directly addresses the write amplification the indexes cause.",
        },
      ],
      best: 1,
      verdict:
        "The symptom is precisely what index accumulation produces: writes slow, reads fine. Databases expose index usage statistics, so 'nobody remembers' is answerable with data rather than archaeology. A composite index on (a, b) already serves queries on a alone, so some indexes are likely redundant as well as unused. Dropping is reversible and cheap to test. A twelfth index would make the stated problem worse; hardware and replica tricks pay for the waste rather than removing it.",
      claims: [
        {
          text: "You are accepting that a dropped index might be needed by a rare query, in exchange for removing a permanent tax on every write.",
          axis: "trade",
          correct: true,
          note: "The trade, and it is asymmetric in your favour: the write cost is continuous and certain, while the read risk is occasional and recoverable by recreating the index.",
        },
        {
          text: "You are accepting a window where a dropped index has to be rebuilt if the audit was wrong, which on a large table is not instant.",
          axis: "trade",
          correct: true,
          note: "Worth stating: reversible is not the same as free. Rebuilding a large index takes time and I/O, so drop in stages rather than all at once.",
        },
        {
          text: "You are accepting slower reads across the board.",
          axis: "trade",
          correct: false,
          note: "Only queries that used the dropped indexes are affected, and by definition the unused ones have no queries. Reads generally are untouched.",
        },
        {
          text: "Usage statistics only cover the period since they were last reset, so a monthly report's index can look unused.",
          axis: "failure",
          correct: true,
          note: "The genuine trap in this audit. Check the statistics-reset time and cover at least a full business cycle before trusting a zero.",
        },
        {
          text: "Dropping an index can corrupt the table's data.",
          axis: "failure",
          correct: false,
          note: "An index is derived data — dropping one affects query plans and nothing about the rows themselves.",
        },
        {
          text: "Write latency and bulk-import duration before and after, since those are the stated symptoms.",
          axis: "measure",
          correct: true,
          note: "Measures the thing that prompted the work, rather than a proxy for it.",
        },
        {
          text: "Query plans for the important read paths after each drop, to confirm none has regressed to a scan.",
          axis: "measure",
          correct: true,
          note: "The safety check that makes staged dropping safe, and it catches a mistake while it is still one index to recreate.",
        },
        {
          text: "The number of indexes remaining.",
          axis: "measure",
          correct: false,
          note: "A count is not an outcome. Eleven well-used indexes would be fine; three unused ones would not.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "DynamoDB partition + sort key IS a sorted index",
      d: "Query is a hash lookup followed by a B-tree range seek; Scan is a full table read. Designing the key is designing the algorithm, and no amount of application code fixes a wrong key.",
    },
    {
      t: "Offset pagination degrades; cursors do not",
      d: "OFFSET 10000 makes the database produce and discard 10,000 rows. A keyset cursor on the sort key seeks directly — and it also stops rows being skipped or repeated when data shifts between pages.",
    },
    {
      t: "An index is a precomputed sort you pay for on write",
      d: "Every index speeds some reads and slows every write. Unused indexes are pure cost, and a composite index on (a, b) already serves queries on a alone — so some are redundant as well.",
    },
    {
      t: "Read the query plan",
      d: "EXPLAIN is the profiler for your database. A sequential scan where you expected an index seek is the most common production performance bug, usually caused by a function on the column, a type mismatch, or stale statistics.",
    },
    {
      t: "A hot partition is a hash function with a skewed distribution",
      d: "One tenant taking a third of the traffic throttles its partition while the table idles. It is the same failure as a hash table where every key collides, and the fix is the same: change the key.",
    },
  ],
  pitfalls: [
    "Trying to fix a storage-layer scan in application code. Caching hides it until a miss and parallelising multiplies the load without reducing the work.",
    "Adding indexes without auditing them. Each one taxes every write forever, and nobody notices until bulk imports take hours.",
    "Paginating with OFFSET on anything a user can page deeply into — it is quadratic overall and it duplicates rows under concurrent writes.",
    "Trusting index usage statistics without checking when they were last reset. A quarterly report's index looks unused for eighty-nine days out of ninety.",
  ],
  quiz: [
    {
      q: "A DynamoDB Scan versus a Query is roughly analogous to:",
      options: [
        "Binary search vs linear search",
        "A full table read vs an indexed range lookup",
        "A hash lookup vs a tree lookup",
        "They are equivalent",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Query uses the partition and sort key like a hash followed by a B-tree seek. Scan reads everything and filters afterwards, paying for all of it.",
      distractors: [
        "The right idea with the terms reversed — Scan is the linear one. Getting the direction wrong here inverts the whole decision.",
        "",
        "A Query is in fact both — hash to the partition, then tree within it — so this describes the two halves of Query rather than the contrast with Scan.",
        "They differ by orders of magnitude on any table large enough to matter.",
      ],
    },
    {
      q: "Why does OFFSET-based pagination get slower on later pages?",
      options: [
        "The rows get bigger",
        "The database must produce and discard every skipped row before returning results",
        "Indexes stop working",
        "It does not — it is O(1)",
      ],
      answer: 1,
      difficulty: "recall",
      why: "OFFSET 10000 costs 10,000 rows of work to return nothing useful. A keyset cursor seeks straight to the position instead.",
      distractors: [
        "Row size is constant. What grows is how many of them are read only to be thrown away.",
        "",
        "The index is used — to walk the rows being discarded. It is working exactly as designed on a query that asks for the wrong thing.",
        "It is O(offset + limit) per page, so paging through the whole table is quadratic in total.",
      ],
    },
    {
      q: "A query with a suitable index still shows a sequential scan in EXPLAIN. Which is NOT a likely cause?",
      options: [
        "A function wrapping the indexed column",
        "A type mismatch between the parameter and the column",
        "The table has too many rows for an index to help",
        "Statistics so stale the planner thinks the table is tiny",
      ],
      answer: 2,
      difficulty: "apply",
      why: "More rows make an index more valuable, not less — that is the entire point of a logarithmic structure. The other three all cause the planner to discard or fail to match the index.",
      distractors: [
        "`WHERE lower(email) = ?` cannot use a plain index on email; it needs an expression index on `lower(email)`.",
        "Comparing a bigint column against a string parameter forces a cast that defeats the index.",
        "",
        "If the planner believes the table has a thousand rows, a scan genuinely is cheaper — so it chooses one, correctly, from wrong information.",
      ],
    },
    {
      q: "One tenant produces 30% of traffic and its DynamoDB partition throttles while the table is well under its provisioned capacity. The fix is:",
      options: [
        "Raise provisioned capacity",
        "Change the key so that tenant's traffic spreads across several partitions",
        "Add a global secondary index",
        "Enable auto-scaling",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The throughput limit is per partition, so table-level capacity is irrelevant while traffic concentrates on one. This is a hash function with a skewed distribution, and the fix is the same as for a colliding hash table: change the key.",
      distractors: [
        "The stated symptom is that the table is already under its limit — the capacity is not where the constraint is.",
        "",
        "Another index adds another access path and does not change where this tenant's items live.",
        "Auto-scaling adjusts table capacity, which is the dimension that is already not binding.",
      ],
    },
    {
      q: "Writes have slowed steadily on a table with eleven indexes. What is the first move?",
      options: [
        "Add a covering index for the slowest read",
        "Audit index usage statistics and drop the unused ones",
        "Increase the instance size",
        "Partition the table",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Every index taxes every write forever, so unused ones are pure cost. Databases expose usage statistics, which turns 'nobody remembers what this is for' into a data question. Dropping is reversible and cheap to test in stages.",
      distractors: [
        "A twelfth index would make the stated problem — slow writes — worse.",
        "",
        "Pays for the waste rather than removing it, and the cost recurs every month.",
        "A large operational change aimed at a problem that a few DROP statements may resolve.",
      ],
    },
    {
      q: "Before adding an index for a new query, what should you check?",
      options: [
        "Whether the table is large enough",
        "Whether an existing composite index's leading columns already serve it",
        "Whether the query runs often",
        "Whether the column is nullable",
      ],
      answer: 1,
      difficulty: "judge",
      why: "An index on (a, b) already serves queries filtering on a alone, so a new index on a would be redundant and would tax every write for nothing. Checking this first is what prevents the eleven-index situation.",
      distractors: [
        "Worth knowing and it does not tell you whether you already have what you need.",
        "",
        "A genuine and important consideration for whether the index earns its write cost — and it is the second question, after establishing that a new index is needed at all.",
        "Nullability affects index size and some planner choices, and it is not what decides whether to create one.",
      ],
    },
    {
      q: "A slow query is being 'fixed' by caching its results in the application. When is that the wrong call?",
      options: [
        "Always — caching is a hack",
        "When the query is frequent and the slowness comes from a missing index, since the cache only hides it until a miss",
        "When the data changes rarely",
        "When the result set is small",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If the storage layer is doing O(n) where O(log n) was available, the cache defers the cost to whichever unlucky request misses — usually under load, when several miss at once. Fix the access pattern and the cache becomes optional rather than load-bearing.",
      distractors: [
        "Caching is a legitimate answer for genuinely rare and expensive queries, where reshaping the schema is not worth it.",
        "",
        "Rarely-changing data is the case where caching works BEST, so this argues the opposite way.",
        "Result size affects memory cost and says nothing about whether the underlying query is doing avoidable work.",
      ],
    },
    {
      q: "What is the most useful reframing this topic offers?",
      options: [
        "Databases are slow, so minimise queries",
        "The database is a data structure — a partition key is a hash function, an index is a sorted structure, and a nested loop over a scan is the same O(n·m) as a nested for-loop",
        "Always denormalise",
        "ORMs cause performance problems",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It turns storage performance from database trivia into the same reasoning used everywhere else in this curriculum, and it explains why application code cannot repair a wrong access pattern — the structure is at the storage layer, so the fix must be too.",
      distractors: [
        "Databases are extremely fast when asked the right question. Minimising queries without fixing access patterns leads to fetching too much and filtering in application code.",
        "",
        "Denormalising is a specific trade for read-dominated workloads with a clear write owner, not a default.",
        "An ORM can generate poor queries and is a symptom rather than the principle. The same problems appear in hand-written SQL.",
      ],
    },
  ],
};

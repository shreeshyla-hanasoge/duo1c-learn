import type { Topic } from "../../types.ts";

export const sdPartitioning: Topic = {
  id: "sd-partitioning",
  title: "Partitioning and sharding",
  tier: 3,
  week: 5,
  depth: "deep",
  summary:
    "Split one dataset across many machines. Range versus hash, hot keys, secondary indexes across shards, rebalancing, and the cost of cross-shard queries.",
  why: "Replication copies data, but it cannot make one machine hold more or write faster. Partitioning does, and it is the step where a simple design becomes a hard one: joins, transactions and queries now cross machines. Every large system you will discuss, from UPI to an exchange feed, chose a partition key, and that choice decides which queries stay cheap and which key melts first. Traed itself runs on one MySQL, so it only touches this idea lightly, but you will need the vocabulary for any bigger design.",
  learn: {
    intuition:
      "Imagine a library whose catalogue has outgrown one building. You open four buildings and need a rule that tells every visitor which one holds a given book. Shelve by title, A to F in building one and so on, and a visitor who wants all books from G to K walks into one building. But if everyone asks for new releases, one building is swamped while the others sit empty. Shelve by a number drawn from a scrambled version of the title, and the books spread evenly, but a request for all titles from G to K now means visiting all four buildings. Either way, a book that half the city wants is still in only one building. The rule you pick, and the field it looks at, decides which questions are cheap and where the queue forms. Partitioning is the art of choosing that rule before the library is full.",
    mechanics: [
      {
        heading: "Range versus hash: the first decision",
        body: "Partitioning, also called sharding, splits rows across nodes by a partition key. In range partitioning each node owns a sorted slice of keys, say symbols A to F. Systems such as Bigtable and HBase do this, and a range scan reads one or two nodes. In hash partitioning the node comes from a hash of the key, so rows spread evenly, but neighbouring keys land on different nodes and a range scan must visit all of them. Many stores combine the two: hash the partition key to pick the node, then keep rows sorted by a second key inside it, as DynamoDB and Cassandra do.",
      },
      {
        heading: "Skew and hot keys",
        body: "Even hashing does not even out popularity. If the key is a stock symbol, NIFTY ticks can outnumber a small stock a thousand to one, and one partition takes the load. A sequential key is worse under range partitioning: with a timestamp as the key, every new write lands in the last range, so one node takes all writes while the rest idle. A common fix is key salting. Write counter key `match42` as `match42#0` to `match42#7`, chosen at random, so eight partitions share the load. The price is that a read must fetch all eight and add them up.",
      },
      {
        heading: "Secondary indexes and cross-shard queries",
        body: "The partition key makes one kind of query cheap. A query on another field has two options. A local index, also called document-partitioned, keeps each shard's index for its own rows, so writes are cheap but a read is sent to every shard and the answers are merged. This is scatter-gather, and it is as slow as the slowest shard. If each of 20 shards is slow on 1 percent of calls, then 1 minus 0.99 to the power 20, about 18 percent of queries wait for some slow shard. A global index is itself partitioned by the indexed value, so reads touch one shard, but a write updates two places.",
      },
      {
        heading: "Rebalancing without a reshuffle",
        body: "Nodes come and go, and data grows. Taking the hash modulo the node count is a trap: going from 4 to 5 nodes moves about 80 percent of all keys. The usual answer is to create many more partitions than nodes, say 1,024 over 8 nodes, 128 each. When a ninth node joins, it takes about 1,024 divided by 9, roughly 114 whole partitions from the others, and nothing else moves. Stores that split by size, like HBase, cut a range in two once it passes a limit and hand one half to a lighter node. Consistent hashing, the next lesson, is another way to the same goal.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed does not shard. One MySQL server holds every table, because one daily user and minute bars do not need more. The nearest thing is inside that server: the option-chain history migration asks MySQL to range-partition the table by month on its timestamp, so old months can be dropped as a unit. The DynamoDB connection and subscription tables are hash-partitioned by DynamoDB itself, on `connectionId`, and Traed never manages that. If users grew into thousands, the natural shard key would be the user id, since every strategy, order and candle query is already scoped to one user.",
      },
    ],
    complexityDerivation:
      "One node has a ceiling on disk, memory and writes per second. If a table needs 20,000 writes per second and a node sustains 5,000, you need at least four partitions, and the work per node falls to a quarter only if the load is even. That condition is the whole argument. A partition key is a bet that its values are spread evenly in both volume and traffic, and that the queries you care about name the key, so each touches one or a few partitions. The bet fails in three ways. A key with a few huge values, such as one dominant symbol or one giant customer, creates a hot partition that no extra node relieves. A sequential key under range partitioning sends all writes to one end. A query that does not name the key must visit every shard, and its latency becomes the tail of the slowest one, so adding shards makes such queries slower, not faster. Partitioning is therefore a trade of flexible queries for capacity. It holds while your important queries are keyed, and it stops holding when the questions change.",
    variants: [
      {
        name: "Range partitioning",
        when: "You scan by order, such as time ranges, symbol prefixes or alphabetical lists, and writes are spread over the key space.",
        delta:
          "Each node owns a sorted slice, so scans touch few nodes and splits are natural. Sequential keys and popular ranges create hot spots, so pick the leading part of the key with care.",
      },
      {
        name: "Hash partitioning",
        when: "You mostly fetch by exact key and want even load without thinking about key shape.",
        delta:
          "A hash spreads rows evenly and removes sequential hot spots. In return, range scans become scatter-gather across all partitions, unless a sort key inside the partition covers them.",
      },
      {
        name: "Directory (lookup) partitioning",
        when: "Tenants differ hugely in size, or you must move one customer to its own shard.",
        delta:
          "A small table maps each key or tenant to a shard, so you can place and move anything by hand. The directory becomes a service every request depends on, and it must be cached and kept correct.",
      },
    ],
    tradeoffs: [
      {
        vs: "Range partitioning versus hash partitioning",
        pick: "Hash for exact-key lookups, range for scans, both when you can",
        because:
          "A hashed partition key with a sorted key inside gives even load and cheap scans within one entity, such as one symbol over a time window. Pure range is only safe when writes are not sequential.",
      },
      {
        vs: "Local secondary index versus global secondary index",
        pick: "Local when writes are heavy and reads can tolerate scatter-gather; global when reads dominate",
        because:
          "A local index keeps each write on one shard but fans every query out. A global index answers from one shard but turns each write into two, often applied late, so the index can lag the data.",
      },
      {
        vs: "Shard now versus scale one node first",
        pick: "Scale up, add replicas and indexes first, and shard only when one node truly cannot cope",
        because:
          "After sharding, joins, transactions and ad hoc queries span machines, and every operation gets harder. A 200 GB database on one modern server rarely needs it.",
      },
    ],
  },
  algorithms: [
    {
      name: "Hash partitioning",
      role: "Turns a partition key into a number so rows spread evenly over partitions, and the same key always maps to the same partition.",
      dsa: "hashing",
    },
    {
      name: "Binary search over split points",
      role: "In range partitioning, a sorted list of boundary keys is searched to find which partition owns a key in logarithmic time.",
      dsa: "binary-search",
    },
    {
      name: "Scatter-gather with a k-way merge",
      role: "A query that cannot name the key goes to every shard, and the sorted partial results are merged with a heap into one ordered answer.",
      dsa: "heaps",
    },
    {
      name: "Key salting",
      role: "Adds a small random suffix to a hot key so its writes spread over several partitions, at the cost of reading them all back.",
    },
  ],
  realWorld: [
    {
      system: "Google Bigtable and Apache HBase",
      kind: "industry",
      problem:
        "A table of billions of rows must spread over many servers while still allowing fast scans of neighbouring rows.",
      applied:
        "Bigtable keeps rows sorted by row key and cuts the table into contiguous ranges called tablets, each served by one node, and splits a tablet when it grows. Its documentation warns against sequential keys such as raw timestamps, because they send all writes to one tablet.",
      evidence: "Chang et al., Bigtable: A Distributed Storage System for Structured Data (OSDI 2006); Cloud Bigtable schema design guide",
      impact:
        "Scans stay cheap, and the design advice about key shape exists because range partitioning makes hot spots easy to create.",
    },
    {
      system: "Amazon DynamoDB and Apache Cassandra",
      kind: "industry",
      problem:
        "A key-value store must absorb very large write rates and spread them automatically, while still offering ordered reads within one entity.",
      applied:
        "Both hash the partition key to choose the node, and keep items sorted by a second key within that partition. DynamoDB documentation advises high-cardinality partition keys and describes write sharding with a random suffix for hot keys.",
      evidence: "DynamoDB Developer Guide: partition key design and write sharding; Cassandra documentation: data modelling",
      impact:
        "Load spreads evenly for most key shapes, and a single dominant key is the one thing the design cannot fix without help from the schema.",
    },
    {
      system: "Vitess at YouTube",
      kind: "industry",
      problem:
        "MySQL at YouTube outgrew a single primary, and the application could not be rewritten to know about many databases.",
      applied:
        "Vitess, built at YouTube and later open sourced, sits in front of MySQL, routes each query to the right shard from a keyspace and sharding key, and handles resharding. Secondary lookups use lookup tables kept as separate, global indexes.",
      evidence: "Vitess project documentation: sharding, vindexes and resharding",
      impact:
        "Teams keep MySQL and its tooling, and the sharding logic lives in one routing layer, not in every service.",
    },
    {
      system: "Traed option-chain history table",
      kind: "yours",
      problem:
        "Option-chain history grows every trading day, backtests read it by time window, and old months are rarely touched.",
      applied:
        "The migration that creates `option_chain_history` asks MySQL to range-partition the table by month on its timestamp column, when the server supports partitioning, and logs and continues if it cannot. This is partitioning inside one server, not across machines.",
      evidence: "CMS/trade-server/database/migrations/2025_07_05_084500_create_option_chain_history_table.php",
      impact:
        "A query for a date window can skip other months, and a whole old month can be dropped as one partition, without any change to how the application reads.",
    },
  ],
  insights: [
    {
      t: "The partition key is the decision",
      d: "It decides which queries touch one shard and which touch all of them. Choose it from the queries, not the table.",
    },
    {
      t: "Hash spreads rows, not popularity",
      d: "A hot key stays on one partition however good the hash is. Salt it, split it or cache it.",
    },
    {
      t: "Many partitions, few nodes",
      d: "Create far more partitions than machines, so adding a node moves whole partitions and not most of the keys.",
    },
    {
      t: "Scatter-gather has a tail",
      d: "A query over 20 shards is as slow as the slowest of 20. Adding shards makes un-keyed queries worse.",
    },
  ],
  pitfalls: [
    "Using a timestamp or auto-increment id as the leading part of a range-partitioned key. Every new write lands on the last partition.",
    "Choosing the key from the table's shape and not from its queries, then finding that the main query must visit every shard.",
    "Sharding early. The joins, transactions and operations you lose are real costs, paid every day, for capacity you may not need for years.",
  ],
  quiz: [
    {
      q: "How does partitioning differ from replication?",
      options: [
        "Partitioning copies every row to all nodes, and replication splits rows",
        "Partitioning gives each node a part, and replication copies the same data",
        "Both split the data, but replication does it by key range",
        "Both copy the data, but partitioning does so inside one disk",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Partitioning divides the dataset, so capacity and write throughput grow. Replication copies it, so reads and availability grow. Real systems use both.",
      distractors: [
        "This swaps the two terms. Copying everywhere is replication.",
        "",
        "Replication does not split anything. Range is a way of partitioning, not of replicating.",
        "Partitioning spreads data over machines, not just within a disk.",
      ],
    },
    {
      q: "Why does a timestamp as the leading key cause trouble in range partitioning?",
      options: [
        "Timestamps cannot be hashed, so range partitions refuse to store them",
        "Range scans over timestamps are always slower than scans over text",
        "The partition count must be a power of two, which timestamps break",
        "All new writes carry the newest key, so they land on one partition, the last range",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Under range partitioning, a key that only grows sends every new row to the final range. One node takes all writes, and the others stay idle.",
      distractors: [
        "Timestamps can be stored and hashed. The problem is where they land.",
        "Scans over ordered keys are in fact the strength of range partitioning.",
        "There is no such rule. Partition counts are free to choose.",
        "",
      ],
    },
    {
      q: "Orders are hash-partitioned across 8 shards by order id. Which query is now expensive?",
      options: [
        "All orders placed by user 42 this week, since the user id is not the partition key",
        "Fetching the order with a given id, since hashing hides the key",
        "Inserting a new order, since the hash must be recomputed",
        "Deleting a single order by its id, since it may live anywhere",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Only queries that name the order id can go to one shard. A query by user must be sent to all 8 shards and merged, unless a secondary index covers it.",
      distractors: [
        "",
        "A lookup by order id hashes to exactly one shard, which is the cheap case.",
        "Computing a hash is trivial and the insert goes to one shard.",
        "A delete by id hashes to one shard like any other keyed operation.",
      ],
    },
    {
      q: "A tick store is hash-partitioned by symbol. At 09:15 NIFTY gets 40 percent of all writes and its partition saturates. What helps most?",
      options: [
        "Add more nodes, so the hash spreads symbols more finely",
        "Switch the hash function to one with better randomness",
        "Add a salt from 0 to 7 to NIFTY's key on write, and read all 8 back",
        "Convert the table to range partitioning on the symbol name",
      ],
      answer: 2,
      difficulty: "apply",
      why: "All NIFTY rows share one key, so they share one partition however many nodes exist. Salting splits that one key into eight, at the cost of an eight-way read.",
      distractors: [
        "More nodes help the other symbols but NIFTY's key still hashes to one place.",
        "A better hash spreads different keys well. It cannot split one key.",
        "",
        "Range partitioning by symbol still keeps every NIFTY row together.",
      ],
    },
    {
      q: "A query is sent to 20 shards, and each shard is slow on 1 percent of calls, independently. Roughly what fraction of queries wait for a slow shard?",
      options: [
        "About 1 percent, the same as one shard",
        "About 5 percent, since the work is shared",
        "About 10 percent, the average of the shards",
        "About 18 percent, since 1 minus 0.99 to the power 20",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The query finishes only when all 20 answer. The chance that none is slow is 0.99 to the 20th power, about 0.82, so about 18 percent of queries meet at least one slow shard.",
      distractors: [
        "That would be right for one shard. A query over 20 gives each slow call a chance to delay it.",
        "Sharing the work does not reduce the number of chances to be slow.",
        "Averaging is wrong. The query waits for the maximum, not the mean.",
        "",
      ],
    },
    {
      q: "A cluster has 1,024 fixed partitions on 8 nodes, 128 each. A ninth node joins. Roughly how many partitions move?",
      options: [
        "All 1,024, because the node count in the hash changed",
        "About 114, taken evenly from the existing nodes",
        "Exactly 128, so the new node matches the others",
        "None, the new node only takes new writes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "To balance, each of 9 nodes should hold about 1,024 / 9, roughly 114 partitions. The new node takes that many from the others, and the rest stay put.",
      distractors: [
        "That is hash modulo node count. With fixed partitions the hash does not change.",
        "",
        "128 is the old share. With 9 nodes the share falls to about 114.",
        "A node that takes no existing partitions stays empty of old data and is never balanced.",
      ],
    },
    {
      q: "A team's single PostgreSQL has 200 GB, 15 percent CPU and a 40 GB memory buffer. They propose sharding for scale. What is the sound judgement?",
      options: [
        "Not yet; add indexes and read replicas, and shard only when one node cannot cope",
        "Yes, because sharding is cheaper than scaling up in all cases",
        "Yes, because every database above 100 GB must be sharded",
        "Not yet; instead move the data to a cache so the database is smaller",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The node has plenty of headroom. Sharding would add cross-shard joins, harder transactions and more operations, for a problem the team does not have.",
      distractors: [
        "",
        "Sharding adds cost and complexity, and a bigger node is often cheaper and simpler.",
        "There is no such size rule. Plenty of single servers hold far more than 200 GB.",
        "A cache is a copy and cannot replace the record, and the database is not short of resources.",
      ],
    },
    {
      q: "Device metrics arrive at 50,000 rows per second. The main query is the last hour for one device. Which key design fits best?",
      options: [
        "Range partition on timestamp alone, so recent data is together",
        "Hash partition on a random row id, for the most even spread",
        "Hash the device id to pick the partition, and sort by time inside it",
        "A single partition per day, holding all devices for that day",
      ],
      answer: 2,
      difficulty: "judge",
      why: "The query names one device and a time window. Hashing the device spreads load, and sorting by time inside the partition makes the window a cheap contiguous read.",
      distractors: [
        "A timestamp-only range key sends all current writes to one partition.",
        "A random id spreads writes but scatters one device's rows over every partition.",
        "",
        "One partition per day concentrates a whole day of writes on one node.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-partitioning-history-table",
      scenario:
        "A small platform keeps minute-bar and option-chain history in one MySQL server, growing by about 4 GB every month, now 300 GB. Backtests read a date window for a few symbols, and months older than two years are rarely read and could be archived. One person runs the platform and the server is at 20 percent CPU. Queries are slowing because indexes no longer fit in memory. What should they do?",
      options: [
        {
          label: "Shard the tables by symbol across three MySQL servers",
          appeal:
            "Spreads data and load, and gives room for years of growth.",
        },
        {
          label: "Range-partition the big tables by month inside the same server, and archive or drop old partitions",
          appeal:
            "Date-window queries skip other months, old data leaves as one cheap operation, and the application is unchanged.",
        },
        {
          label: "Move everything to a key-value store with hash partitioning",
          appeal:
            "Unlimited scale and no partition management by hand.",
        },
        {
          label: "Keep one table and add more indexes on every column",
          appeal:
            "No structural change, and every query gets an index.",
        },
      ],
      best: 1,
      verdict:
        "The data grows by time, the queries are time windows, old data is cold, and the server has CPU to spare. Time-range partitioning inside the one server fits all four facts and costs the least to operate. Sharding by symbol adds machines and cross-shard joins for a problem of data layout, a new store means rewriting every query, and indexes on every column worsen the memory problem.",
      claims: [
        {
          text: "You accept that queries which span many months touch many partitions, in return for cheap window queries and cheap removal of old data.",
          axis: "trade",
          correct: true,
          note: "True. Partitioning favours the access pattern it was cut for.",
        },
        {
          text: "You keep joins and transactions as they are, because the data stays on one server.",
          axis: "trade",
          correct: true,
          note: "True. This is partitioning inside one server, not across machines.",
        },
        {
          text: "You gain more write capacity, since each month is written by a different machine.",
          axis: "trade",
          correct: false,
          note: "It is one machine, so write capacity is unchanged. The gain is pruning and cheap removal.",
        },
        {
          text: "A query with no date condition must scan every partition, and can be slower than before.",
          axis: "failure",
          correct: true,
          note: "True. Without a date bound the engine cannot skip any month.",
        },
        {
          text: "If the server's disk fills or fails, the partitioning protects the older months.",
          axis: "failure",
          correct: false,
          note: "All partitions sit on the same disk and server. Backups, not partitions, protect against loss.",
        },
        {
          text: "Check that date-window queries show only the needed partitions in the query plan, and watch query time on the largest tables.",
          axis: "measure",
          correct: true,
          note: "True. The query plan shows whether pruning actually happens.",
        },
        {
          text: "Average CPU across the month shows whether partitioning worked.",
          axis: "measure",
          correct: false,
          note: "CPU was low before and will stay low. The problem was index memory and scan size.",
        },
      ],
    },
    {
      id: "sd-partitioning-festival-orders",
      scenario:
        "An Indian e-commerce company runs a festival sale. Orders reach 50,000 per second at peak, and 400 million orders sit in the store. The two main queries are: show my orders, by user id, and fetch order by id, from support and delivery systems. Orders are never searched by time across all users in the hot path. One team of 30 engineers owns the store. How should orders be partitioned?",
      options: [
        {
          label: "Range partition by creation time, so recent orders are together",
          appeal:
            "Reports by date are cheap and old shards can be archived.",
        },
        {
          label: "Hash partition by order id",
          appeal:
            "Even spread, and order lookups go to exactly one shard.",
        },
        {
          label: "Hash partition by user id, with the shard number embedded in each order id",
          appeal:
            "My orders is one shard, and an order id tells any service which shard to ask without a lookup.",
        },
        {
          label: "A single big primary with many read replicas",
          appeal:
            "No partitioning logic at all, and reads scale out.",
        },
      ],
      best: 2,
      verdict:
        "Both hot queries become single-shard: the user id picks the shard, and the shard number inside the order id handles the lookup. At 50,000 writes per second one primary cannot cope, so replicas do not help. Time ranges send all writes to the newest shard, and hashing by order id turns my orders into a scatter-gather across every shard.",
      claims: [
        {
          text: "You accept that a very large customer, such as a reseller, lands on one shard and may become hot.",
          axis: "trade",
          correct: true,
          note: "True. Hashing by user spreads users, but not the volume of one user.",
        },
        {
          text: "You gain single-shard answers for both main queries, in return for expensive cross-user analytics.",
          axis: "trade",
          correct: true,
          note: "True. Analytics across all users should run on a separate copy or pipeline.",
        },
        {
          text: "You give up fast lookup by order id, because the id no longer tells a service which shard to ask.",
          axis: "trade",
          correct: false,
          note: "The shard number inside the id is exactly what makes the lookup a single-shard read.",
        },
        {
          text: "A report of all orders across all users must be run on every shard and merged, or built on a separate copy.",
          axis: "failure",
          correct: true,
          note: "True. That query does not name the partition key.",
        },
        {
          text: "If one shard is overloaded, requests for other users on other shards are slowed as well.",
          axis: "failure",
          correct: false,
          note: "Shards fail and slow independently, which is a benefit. Only users on that shard are affected.",
        },
        {
          text: "Watch per-shard write rate and storage, so skew shows up before one shard saturates.",
          axis: "measure",
          correct: true,
          note: "True. Even averages hide a hot shard, so each shard needs its own metric.",
        },
        {
          text: "The total orders per second across the cluster shows whether the partitioning is balanced.",
          axis: "measure",
          correct: false,
          note: "A healthy total can hide one overloaded shard.",
        },
      ],
    },
    {
      id: "sd-partitioning-match-counter",
      scenario:
        "During an IPL final, a live reactions feature counts taps for the one running match. About 200,000 taps arrive per second on a single key, and one storage partition can sustain roughly 2,000 writes per second. The count shown to viewers may be a second or two behind, but taps must not be lost. The store is hash-partitioned already. What is the best fix?",
      options: [
        {
          label: "Split the counter into 128 sub-counters chosen at random on each tap, and sum them on read or every second",
          appeal:
            "Spreads one hot key over many partitions, and the total is exact.",
        },
        {
          label: "Add more nodes to the cluster",
          appeal:
            "More hardware should mean more throughput.",
        },
        {
          label: "Switch the table to range partitioning",
          appeal:
            "Range partitions can be split by hand when they get hot.",
        },
        {
          label: "Tell viewers the count is approximate and drop every tenth tap",
          appeal:
            "Cuts the write rate by ten times with no schema change.",
        },
      ],
      best: 0,
      verdict:
        "The load is one key, so only splitting the key helps: 200,000 taps divided over 128 sub-counters is about 1,560 per second each, under the 2,000 limit. Adding nodes does not touch the single key, range partitioning still keeps one key together, and dropping taps contradicts the requirement that none be lost.",
      claims: [
        {
          text: "You accept that reading the total needs 128 reads or a periodic roll-up, so the shown count is slightly delayed.",
          axis: "trade",
          correct: true,
          note: "True. The requirement allows a second or two of delay.",
        },
        {
          text: "You give up exactness, because the sub-counters can only estimate the total.",
          axis: "trade",
          correct: false,
          note: "The sum of the sub-counters is exact. Only the timing of the read adds delay.",
        },
        {
          text: "You gain headroom of roughly 128 times the write rate of one partition, in theory.",
          axis: "trade",
          correct: true,
          note: "True, as long as random choice spreads the taps evenly across the sub-counters.",
        },
        {
          text: "If the random choice is poor, or 128 sub-keys hash to few partitions, the hot spot is only reduced.",
          axis: "failure",
          correct: true,
          note: "True. The sub-keys must actually land on different partitions.",
        },
        {
          text: "If the partition holding one sub-counter fails, the shown total stays exact and complete.",
          axis: "failure",
          correct: false,
          note: "Taps on that sub-counter are unavailable or lost until it recovers, so the total is short. Replication is still needed.",
        },
        {
          text: "Watch per-partition write rate during the match, and the delay between a tap and the displayed count.",
          axis: "measure",
          correct: true,
          note: "True. These show whether the hot partition is relieved and the delay stays acceptable.",
        },
        {
          text: "Cluster-wide CPU shows whether the hot key is solved.",
          axis: "measure",
          correct: false,
          note: "A cluster average can look calm while one partition is saturated.",
        },
      ],
    },
  ],
};

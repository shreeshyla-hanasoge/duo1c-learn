import type { Topic } from "../../types.ts";

export const sdDataModels: Topic = {
  id: "sd-data-models",
  title: "Choosing a data model",
  tier: 2,
  week: 3,
  depth: "deep",
  summary:
    "Relational, document, key-value, wide-column and graph stores suit different questions. Pick from your access patterns, and know what mixing stores costs.",
  why: "The data model is the decision you live with longest. Code is rewritten, but moving ten crore rows from one shape to another takes weeks and risks mistakes. Interviewers ask 'which database would you use and why', and the honest answer starts from how the data is read, not from fashion. You also need to know when one boring relational database is enough, and what you pay each time you add a second store. Traed shows that mix on a small scale: MySQL, Redis and DynamoDB each hold different things.",
  learn: {
    intuition:
      "Think of how different offices keep paper. A bank keeps a ledger with ruled columns, and every entry follows the same pattern, so you can add up any column or match two books against each other. A hospital keeps one thick folder per patient, with everything about that person inside, because nobody asks for all patients with a certain blood group. A cloakroom gives a numbered token, and you get your coat by token only. A library with a card index lists books by author, by subject and by year, in several drawers. A detective keeps a wall of photos joined by string, because the question is who knows whom. Each office chose a layout for the question it gets asked most. Change the question, and the layout becomes slow or awkward. A data model is that choice: what is stored together, what is looked up by what, and which questions are cheap.",
    mechanics: [
      {
        heading: "Relational: tables, keys and joins",
        body: "A relational database stores rows in tables and links them by keys. Normalising means each fact lives in exactly one place. A customer's address is stored once in `customers`, and each row in `orders` holds only a `customer_id`. When the address changes, one update fixes it everywhere, and no two copies can disagree. To see an order with its address the database joins the tables. A common method is the hash join: build a hash table of the smaller side, then probe it with each row of the larger side, so the work is about the sum of the two sizes, not their product. You get flexible queries, constraints and transactions. The price is that joins across very large or split data become slow and hard to distribute.",
      },
      {
        heading: "Document and key-value: store the whole thing under a key",
        body: "A key-value store answers one question fast: give me the value for this key. Redis and DynamoDB work this way. DynamoDB places an item by hashing its partition key, so a lookup goes straight to one machine. A document store such as MongoDB keeps a JSON-like document, often a whole aggregate, so an order with its line items and address is read in one fetch and written in one step. There is no join to run. Two costs follow. Copying the address into every order means a change must be applied in many places, or you accept that old orders keep the old address. And questions across documents, such as total sales per city, need either a secondary index or a separate system.",
      },
      {
        heading: "Wide-column and graph: for two extreme access patterns",
        body: "A wide-column store such as Cassandra or Bigtable is built for huge write volume with queries inside one partition. A row key chooses the machine, and clustering columns keep rows sorted inside it. Store messages with partition key `channel_id` and clustering key `time`, and the latest 50 messages of a channel are one contiguous read. You design one table per query, and cross-partition queries are discouraged. A graph database stores nodes and edges, and walks them directly. 'Friends of friends of friends' in a relational database is three self-joins, and each join multiplies the work. A graph walk, a breadth-first search, follows only the edges that exist from the starting node.",
      },
      {
        heading: "Access patterns first, and the cost of mixing stores",
        body: "Start from the list of queries, with rough rates, not from the entities. Write them down: 'show the last 20 orders for this user' at 500 per second, 'total sales per city per day' once a night. A pattern that reads by one key points to key-value or document. A pattern that joins and filters in many ways points to relational. Denormalising means keeping a deliberate copy to make a read cheap; the write that updates it is now your job. Polyglot persistence means using several stores, each for what it does best. It works, but each store adds a backup plan, monitoring, a failure mode, and a question of which copy is true when they disagree. Use a second store when a measured access pattern needs it.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed uses a relational MySQL schema as its record, shared by the Laravel app and the Python engine. Strategies, users, brokers, backtests and trades are normalised tables with foreign keys. A strategy's rules are stored in JSON columns such as `config`, which is document-style storage inside a relational table, because the rule shape changes often and is always read as a whole. Redis holds rebuildable copies, and DynamoDB tables hold WebSocket connections and subscriptions, which are looked up by key. Traed has no wide-column or graph store and does not need one. It would consider a wide-column or time-series store only when tick history outgrew one MySQL server.",
      },
    ],
    complexityDerivation:
      "The argument is about where the cost of a query moves. Normalisation removes duplicate facts, so writes are cheap and consistent, but every read that needs two facts pays for a join. Denormalisation does the opposite: it moves cost from reads to writes, because each copy must be updated. Neither is free, so the right model is the one whose cheap operation matches your frequent operation. A key-value or document store makes lookups by key cost one machine hop, which is why it scales by splitting keys across machines. A relational store keeps flexible queries because it keeps data in one place, which is why it scales mostly upwards, on a bigger machine, until replicas and partitions are added. This reasoning breaks when the read pattern is not known in advance, as in analytics or early product work. Then flexibility is worth more than speed, and a relational database is the safer default. It also breaks when volume is so large that one machine cannot hold the data, which forces you to choose a partition key and accept the queries it rules out.",
    variants: [
      {
        name: "Relational (MySQL, PostgreSQL)",
        when: "Data has clear relationships, queries vary, and correctness across several rows matters, such as money and orders.",
        delta:
          "Ad hoc queries, constraints and transactions come built in. Scaling past one machine takes replicas or partitioning work, and schema changes on large tables need care.",
      },
      {
        name: "Document or key-value (MongoDB, DynamoDB, Redis)",
        when: "Reads are by one key or one aggregate, volume is high, and the shape of the data varies.",
        delta:
          "Lookups are fast and scale by splitting keys. Cross-record queries and multi-record transactions are limited or costly, and copies must be kept in step by you.",
      },
      {
        name: "Wide-column and graph (Cassandra, Bigtable, Neo4j)",
        when: "Wide-column for enormous write rates read by partition; graph for questions about paths and connections.",
        delta:
          "Each does one pattern very well. Wide-column forces a table per query; graph stores are harder to scale across machines and are rarely the main database.",
      },
    ],
    tradeoffs: [
      {
        vs: "Normalised versus denormalised",
        pick: "Normalise first; denormalise a measured hot read",
        because:
          "A normalised model keeps one truth and answers new questions without redesign. Add a copy only when a specific read is too slow, and own the code that keeps it correct.",
      },
      {
        vs: "One database versus several stores",
        pick: "One until a measured pattern needs another",
        because:
          "Each extra store adds backups, monitoring, upgrades and a way to disagree with the others. A small team gets more from one well-understood database than from three that each fit slightly better.",
      },
      {
        vs: "Schema in the database versus schema in the code",
        pick: "Enforce a schema for core records; allow flexible JSON for variable parts",
        because:
          "Money, orders and users need constraints that the database enforces. Rule definitions that change weekly can sit in a JSON column, with the application checking their shape.",
      },
    ],
  },
  algorithms: [
    {
      name: "Hash join",
      role: "Joins two tables by building a hash table of the smaller side and probing it with the larger, so the cost is about the sum of the sizes.",
      dsa: "hashing",
    },
    {
      name: "Hash partitioning on a partition key",
      role: "Maps each key to a machine by hashing it, so a key-value or wide-column lookup touches one node.",
      dsa: "hashing",
    },
    {
      name: "Breadth-first search over edges",
      role: "Walks a graph store outward from a node level by level, touching only edges that exist.",
      dsa: "bfs",
    },
  ],
  realWorld: [
    {
      system: "Amazon Dynamo and the shopping cart",
      kind: "industry",
      problem:
        "A shopping cart must always accept an add-to-cart, even when part of the system is down, and it is only ever read and written by one key: the customer's cart.",
      applied:
        "The Dynamo paper describes a key-value store that places each key on several nodes by hashing, and uses the cart as its motivating example. DynamoDB, the managed service, descends from these ideas.",
      evidence: "Amazon Dynamo paper (SOSP 2007) and AWS DynamoDB documentation",
      impact:
        "It shows the key-value model's bargain: very high availability and simple scaling for a single-key access pattern, in return for limited queries.",
    },
    {
      system: "Discord messages on Cassandra",
      kind: "industry",
      problem:
        "A chat service stores billions of messages that are almost always read as the latest messages of one channel, in time order.",
      applied:
        "Discord's engineering posts describe storing messages in Cassandra with the channel as the partition key and time-ordered ids as the clustering key, grouped in time buckets to bound partition size. They later wrote about moving to the Cassandra-compatible ScyllaDB.",
      evidence: "Discord engineering blog: how Discord stores billions of messages",
      impact:
        "A wide-column table designed for exactly one query makes the common read a single sequential scan of one partition.",
    },
    {
      system: "Facebook TAO for the social graph",
      kind: "industry",
      problem:
        "Social features read objects and the links between them, such as friends and likes, at enormous read volume, where joins in a relational database would be too slow.",
      applied:
        "Facebook's published TAO paper describes a graph-shaped store of objects and associations, kept in a cache layer above MySQL. The model is a graph, while the storage underneath is relational.",
      evidence: "Facebook paper: TAO, Facebook's distributed data store for the social graph (USENIX ATC 2013)",
      impact:
        "It shows that a data model is a view: a graph API can sit on top of relational storage, and the model is chosen by the questions asked.",
    },
    {
      system: "Traed: relational record with JSON columns, plus Redis and DynamoDB",
      kind: "yours",
      problem:
        "One small platform has relational data (users, brokers, strategies, trades), flexible rule definitions, rebuildable cached market data, and WebSocket connections that must be found by key.",
      applied:
        "Entities live in the shared MySQL `traed` schema and strategy definitions use JSON columns. The engine cache uses Redis DB 2. The WebSocket gateway keeps connections and subscriptions in DynamoDB tables.",
      evidence: "ARCHITECTURE.md sections 3 and 4; docs/HLD.md section 7",
      impact:
        "Each store holds the data whose access pattern it fits, and only MySQL is the record, so losing Redis never loses a trade.",
    },
  ],
  insights: [
    {
      t: "Queries decide the model",
      d: "List the reads and their rates before choosing a store. The model that makes your common read cheap is the right one.",
    },
    {
      t: "Normalise for one truth",
      d: "Each fact in one place means one update and no disagreement. You pay with joins on read.",
    },
    {
      t: "Denormalising moves cost to writes",
      d: "A copy makes a read cheap and makes every update harder. Do it for a measured hot path and own the sync.",
    },
    {
      t: "Every extra store has a price",
      d: "Backup, monitoring, upgrades and a new way to be inconsistent. Add a store for a pattern you have measured.",
    },
  ],
  pitfalls: [
    "Picking a database for its name rather than its access pattern. A document store used for joins ends up doing joins in application code, slowly.",
    "Copying data into several places with no plan for updates. Within months the copies disagree and nobody knows which is right.",
    "Splitting data across stores early. Three databases for a service with one user triple the operating work and solve nothing yet.",
  ],
  quiz: [
    {
      q: "In a normalised schema, where is a customer's address stored?",
      options: [
        "Copied into every order row for faster reads",
        "Once, in a customers table that orders refer to by key",
        "In a cache, because addresses rarely change",
        "In the application code as a constant",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Normalising stores each fact once and links to it by key. A change then needs one update, and no two copies can disagree.",
      distractors: [
        "That is denormalising. It speeds one read but gives many copies to keep in step.",
        "",
        "A cache holds copies that can be lost. The record itself must live in the database.",
        "Addresses are data that varies per customer, so they cannot be constants in code.",
      ],
    },
    {
      q: "Which question is a graph database best suited to?",
      options: [
        "What was the total sales amount per month?",
        "What is the value stored under this session id?",
        "Which messages arrived in this channel in the last hour?",
        "Who are the people within three connections of this person?",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Graph stores walk edges directly, so multi-hop connection questions touch only existing links. The other questions are aggregation, key lookup and time-ordered partition reads.",
      distractors: [
        "Totals over many rows are an analytics query, suited to relational or columnar systems.",
        "A single-key lookup is the classic key-value case, and a graph adds nothing to it.",
        "That is a time-ordered read inside one partition, the wide-column pattern.",
        "",
      ],
    },
    {
      q: "A shopping cart is read and written only by customer id, at festival-sale peaks of lakhs of requests a second. Which model fits the access pattern?",
      options: [
        "Key-value, keyed by customer id",
        "A graph of customers linked to products",
        "Relational tables with a join on every page view",
        "A wide-column table partitioned by product",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Every request names one key and wants one aggregate, so a key-value store gives one hop per request and scales by splitting keys across machines.",
      distractors: [
        "",
        "The cart question is not about paths or connections, so a graph offers nothing here.",
        "A join on every page view adds cost to the hottest path, and the query never needs it.",
        "Partitioning by product spreads one customer's cart over many partitions, the opposite of the access pattern.",
      ],
    },
    {
      q: "You store orders as documents with the delivery address copied into each. A customer changes their address. What do you now need to decide?",
      options: [
        "Nothing, because documents update themselves",
        "Whether to switch the store to a graph model",
        "Whether old orders keep the old address",
        "Whether to remove the address from the documents",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A copy does not follow the original. For orders, keeping the old address is usually correct, but for a profile page it would be a bug. The decision belongs to you.",
      distractors: [
        "Documents hold copies, and nothing links them to the customer record.",
        "The model is not the problem. Any model that copies data faces the same question.",
        "",
        "Removing it would break the order's own record of where it was delivered.",
      ],
    },
    {
      q: "A chat service reads only the latest 50 messages of one channel and writes millions of messages an hour. Which design fits?",
      options: [
        "A relational table with an index on user id",
        "A key-value store with one key for the whole service",
        "A wide-column table keyed by channel, sorted by time",
        "A graph store linking messages to users",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The partition key picks the machine, and clustering by time keeps the newest rows adjacent, so the common read is one contiguous slice while writes spread across channels.",
      distractors: [
        "A user-id index does not help the channel query, and one table struggles at this write rate.",
        "One key for everything puts all load on one machine.",
        "",
        "The read has no connection structure to exploit, so the edges would add storage and no speed.",
      ],
    },
    {
      q: "A team stores strategy definitions as JSON in one column, but also needs 'all strategies owned by user 7' and 'all trades for strategy 42'. How should the model look?",
      options: [
        "Normal tables for ownership and trades; JSON for the rules",
        "All data inside the JSON, with no other tables",
        "Everything in separate tables, with the rules split into one column per rule field",
        "Move the whole thing to a key-value store",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Relationships and lookups by owner need keys and indexes, so they belong in tables. The rules change shape often and are read as a whole, so JSON suits them.",
      distractors: [
        "",
        "Finding all strategies of one user would scan every JSON blob.",
        "A column per rule field forces a migration whenever the rule format changes.",
        "A key-value store would lose the ownership and trade queries that the team needs.",
      ],
    },
    {
      q: "A startup with two engineers has one PostgreSQL database. A speaker advises adding a graph database, a search engine and a key-value store 'so each job uses the best tool'. What is the soundest response?",
      options: [
        "Agree, because specialised stores are always faster",
        "Replace PostgreSQL with the key-value store alone",
        "Add all three at once to avoid migrations later",
        "Keep PostgreSQL; add a store only for a measured need",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Each store adds backup, monitoring and a new way to disagree. With a small team and no measured bottleneck, the extra cost is certain and the gain is not.",
      distractors: [
        "Specialised stores are faster for their pattern, but only a measured need justifies the operating cost.",
        "That discards the relational queries and constraints that the product probably relies on.",
        "Adding stores in advance buys the cost now and a benefit that may never be needed.",
        "",
      ],
    },
    {
      q: "A product page is slow because it joins five tables. An engineer proposes copying the joined result into a separate table that is refreshed on every write. What is the right judgement?",
      options: [
        "Reasonable if the page is a measured hot read and the refresh is owned and tested",
        "Wrong, because denormalised copies are never acceptable",
        "Reasonable, and no further work is needed once the table exists",
        "Wrong, because a join can never be made faster",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Denormalising is a legitimate trade: a cheaper read in return for a write path that must keep the copy right. It earns its place only for a measured hot read.",
      distractors: [
        "Copies are acceptable when the read justifies them, which is why caches and read models exist.",
        "",
        "The copy needs a reliable refresh and checks. Without them it drifts from the source.",
        "Joins can be made faster with indexes and better plans, but a copy is still a valid alternative.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-data-models-strategy-config",
      scenario:
        "A two-person team runs a trading web app on one server with one MySQL database. Users, brokers and trades are relational. Each strategy has a rule definition whose shape changes every few weeks as new indicators are added. Strategies are always loaded and saved as a whole, and they must also be listed by owner. A teammate suggests moving strategies to a document database.",
      options: [
        {
          label: "Keep MySQL, with a JSON column for the rule definition beside normal columns for owner and status",
          appeal:
            "One database to run, owner lookups use an index, and the changing rule shape needs no migration.",
        },
        {
          label: "Move strategies to a separate document database",
          appeal:
            "Documents match the shape of a strategy, and the schema is fully flexible.",
        },
        {
          label: "Split every rule field into its own column and table",
          appeal:
            "Maximum structure, and every field can be queried and constrained.",
        },
        {
          label: "Store strategies as files on disk, one per strategy",
          appeal:
            "Simple, and each file is naturally one whole document.",
        },
      ],
      best: 0,
      verdict:
        "The team is small, the data already lives in MySQL, and the rules are read as a whole, so a JSON column gives document flexibility without a second store. Owner and status stay as indexed columns. A new database adds backup and consistency work between strategy and trade rows. A table per rule field turns every new indicator into a migration, and files lose queries and transactions.",
      claims: [
        {
          text: "You accept that the database does not check the inside of the JSON, so the application must validate the rule shape.",
          axis: "trade",
          correct: true,
          note: "True. Flexibility moves checking into code.",
        },
        {
          text: "You avoid operating a second database, which for two engineers is the larger saving.",
          axis: "trade",
          correct: true,
          note: "True. Backups, upgrades and monitoring stay at one store.",
        },
        {
          text: "You give up listing strategies by owner, because JSON columns cannot be indexed.",
          axis: "trade",
          correct: false,
          note: "Owner is an ordinary column with an index. Only the rule body is JSON.",
        },
        {
          text: "If an old strategy row has a rule format the code no longer understands, loading it can fail, so old shapes need a migration or a version field.",
          axis: "failure",
          correct: true,
          note: "True. Schema-flexible data still has a schema, held in the code and its history.",
        },
        {
          text: "A separate document database would remove the risk of a trade pointing at a strategy that does not exist.",
          axis: "failure",
          correct: false,
          note: "It would increase that risk, because the foreign key could no longer be enforced across two stores.",
        },
        {
          text: "You would watch how often queries need to look inside the JSON; if that grows, promote those fields to real columns.",
          axis: "measure",
          correct: true,
          note: "True. Frequent filtering on a JSON field is the signal to give it a column.",
        },
        {
          text: "You would measure document counts in the new store to decide when to scale it.",
          axis: "measure",
          correct: false,
          note: "There is no new store in the chosen design, so there is nothing to count.",
        },
      ],
    },
    {
      id: "sd-data-models-sale-cart",
      scenario:
        "An Indian e-commerce company runs a festival sale. At peak, lakhs of shoppers add and remove items every second. A cart is only ever read or written by its customer id and is useful for hours. A cart must never refuse an add, even during a partial outage, and a cart that is a few seconds stale is acceptable. Orders and payments are separate and must be exact. The current design keeps carts in the main relational database.",
      options: [
        {
          label: "Keep carts in the relational database and add a bigger machine",
          appeal:
            "No new technology, full transactions, and the team already knows it.",
        },
        {
          label: "Move carts to a key-value store keyed by customer id, and keep orders and payments in the relational database",
          appeal:
            "One-key access scales by splitting keys, stays available during partial failures, and leaves money in a transactional store.",
        },
        {
          label: "Put orders, payments and carts all in the key-value store",
          appeal:
            "One store for everything is simpler to operate, and the key-value store is the fastest.",
        },
        {
          label: "Model carts as a graph of customers and products",
          appeal:
            "The relationship between customers and products is the essence of shopping.",
        },
      ],
      best: 1,
      verdict:
        "The cart has one access pattern, by key, with loose freshness needs and a high availability need, which is exactly where key-value scales best. Orders and payments need exact multi-row guarantees and ad hoc queries, so they stay relational. A bigger machine only delays the limit, moving money into key-value loses the guarantees, and a graph adds nothing to a lookup by key.",
      claims: [
        {
          text: "You accept running two kinds of store, and the work of passing a cart into an order when the shopper pays.",
          axis: "trade",
          correct: true,
          note: "True. Polyglot persistence costs a handoff and a second operating burden.",
        },
        {
          text: "You accept that questions across carts, such as the most added item this hour, need a separate pipeline.",
          axis: "trade",
          correct: true,
          note: "True. Key-value is weak at cross-record questions and needs a stream or batch job for them.",
        },
        {
          text: "You gain exact transactions across carts and payments by using the key-value store for both.",
          axis: "trade",
          correct: false,
          note: "The opposite. Multi-record guarantees are what you give up, which is why payments stay relational.",
        },
        {
          text: "If two devices edit the same cart during an outage, the copies may differ, so you need a merge rule such as keeping the union of items.",
          axis: "failure",
          correct: true,
          note: "True. Availability-first stores can hold conflicting versions, and the application chooses how to merge them.",
        },
        {
          text: "A key-value store cannot lose data, so no backup is needed for carts.",
          axis: "failure",
          correct: false,
          note: "Replication helps against machine loss, but deletes, bugs and bad deploys still need backups.",
        },
        {
          text: "You would measure p99 latency of a cart read and write at peak, and the share of cart operations that hit a hot key.",
          axis: "measure",
          correct: true,
          note: "True. Tail latency and key skew are what limit a key-value design.",
        },
        {
          text: "You would measure join time on the cart table, since that predicts how the store scales.",
          axis: "measure",
          correct: false,
          note: "The key-value design has no joins. Lookup latency and key skew are the numbers that matter.",
        },
      ],
    },
    {
      id: "sd-data-models-tick-history",
      scenario:
        "A market-data company stores every tick for several thousand instruments. That is about 200 million rows a day, kept for years. Almost every query asks for one instrument over a time range, and the newest hour is read most often. Writes arrive continuously. One MySQL server is at its disk and write limit. Reports across all instruments are run once a night.",
      options: [
        {
          label: "A bigger MySQL server with more indexes",
          appeal:
            "Familiar tools, and the full set of ad hoc queries stays available.",
        },
        {
          label: "A document store with one document per instrument per day",
          appeal:
            "Fewer rows, and one fetch brings back a day of ticks.",
        },
        {
          label: "A wide-column or time-series store partitioned by instrument and time bucket, with nightly batch reports",
          appeal:
            "Writes spread across partitions, and the common read is a contiguous slice sorted by time.",
        },
        {
          label: "A graph database linking ticks to instruments",
          appeal:
            "Each tick relates to an instrument, and graphs model relationships.",
        },
      ],
      best: 2,
      verdict:
        "The load is a huge, continuous write stream read by one instrument over a time range, which is the wide-column and time-series pattern. Partitioning by instrument and bucket spreads writes and keeps the read contiguous. The nightly cross-instrument reports run as batch jobs. A bigger MySQL server delays the limit, a document per day must be rewritten on every tick, and a graph models relationships that this data does not have.",
      claims: [
        {
          text: "You accept that ad hoc queries across instruments become slow or must run through a separate batch or analytic path.",
          axis: "trade",
          correct: true,
          note: "True. One table per query is the price of fast partition reads.",
        },
        {
          text: "You accept choosing the partition key and bucket size up front, because changing them later means rewriting the data.",
          axis: "trade",
          correct: true,
          note: "True. The key decides both write spread and which reads are cheap.",
        },
        {
          text: "You gain the ability to join ticks with any other table in a single query.",
          axis: "trade",
          correct: false,
          note: "Wide-column stores generally do not offer joins. Combining data is done in the application or a batch job.",
        },
        {
          text: "If a single liquid instrument writes far more than others, its partition can become a hot spot, so the time bucket must be small enough to bound it.",
          axis: "failure",
          correct: true,
          note: "True. Skew on a partition key is the main failure mode of this model.",
        },
        {
          text: "Because the store is distributed, a node failure loses the ticks it held.",
          axis: "failure",
          correct: false,
          note: "These stores replicate each partition to several nodes, so one node failing does not lose data.",
        },
        {
          text: "You would measure write rate per partition and read latency for the newest-hour slice.",
          axis: "measure",
          correct: true,
          note: "True. Partition skew and the hot read path are what the design lives or dies on.",
        },
        {
          text: "You would measure the number of indexes on the table, because more indexes means faster writes.",
          axis: "measure",
          correct: false,
          note: "More indexes make writes slower, and this model relies on the key layout rather than indexes.",
        },
      ],
    },
  ],
};

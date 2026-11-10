import type { Topic } from "../../types.ts";

export const sdDistributedIds: Topic = {
  id: "sd-distributed-ids",
  title: "Unique IDs at scale",
  tier: 3,
  week: 6,
  depth: "deep",
  summary:
    "Every row, order and message needs an id that never repeats. See why counters stop working and how UUIDs, Snowflake ids and UUIDv7 trade size and order.",
  why: "An id looks like a small choice and becomes one of the hardest to change. It sits in every table, URL, log line and foreign key. Pick a counter and you may be unable to shard; pick random UUIDs and your database indexes may slow as the table grows; pick timestamps and a wrong clock can create duplicates. An engineer who knows the options can choose in minutes and explain the cost. Traed uses both a database counter and engine-made UUIDs, so it shows two of these choices side by side.",
  learn: {
    intuition:
      "Think of a railway booking counter. With one counter and one ticket book, numbering is easy: 1, 2, 3, in order. Now open 50 counters across the country. If they all share one book, everyone queues for it. If each has its own book starting at 1, tickets repeat and nobody can tell them apart. You could give each counter a different starting range, or print a long random code on every ticket so that a repeat is almost impossible. Or you could write the date and time, the counter number and a small running number on each ticket. Then every counter works alone and tickets still arrive roughly in time order. Each plan costs something: a queue, a longer ticket, or a counter number that must never be given to two counters.",
    mechanics: [
      {
        heading: "Auto-increment and ticket servers",
        body: "The simplest id is a database counter: 1, 2, 3, handed out by one writer. It is 8 bytes, strictly increasing, and kind to indexes. It breaks when you need more than one writer. Two shards each starting at 1 collide. A known workaround, described by Flickr as ticket servers, runs two MySQL servers, one giving odd numbers (1, 3, 5) and the other even (2, 4, 6), by setting the step to 2. That removes the single point of failure but loses strict order, and the ticket servers are still a network call per id. Counters also leak information: an order id of 48,211 tells a rival roughly how many orders you have taken.",
      },
      {
        heading: "UUIDs: no coordination, at a price",
        body: "A UUID is 128 bits. Version 4 fills 122 of them with random bits, so any machine can make one with no network call. By the birthday bound, a 50 percent chance of any repeat needs about 2^61 ids, roughly 2.3 quintillion. At a billion ids a day for 100 years you make about 3.7 × 10^13, far below that. The cost is not safety but storage and order. A UUID takes 16 bytes against 8, and it is random. In a B-tree index each new key lands on a random leaf page, so a table larger than memory reads and splits pages everywhere, instead of appending at the right edge.",
      },
      {
        heading: "Snowflake: time, machine, sequence",
        body: "Twitter's Snowflake packs a 64-bit id as 1 unused bit, 41 bits of milliseconds since a chosen epoch, 10 bits of machine id and 12 bits of sequence. The id is `(ms << 22) | (machine << 12) | seq`. Take 1,000,000 ms after the epoch, machine 5, sequence 3: 1,000,000 × 4,194,304 + 5 × 4,096 + 3 = 4,194,304,020,483. Forty-one bits last 2^41 ms, about 69.7 years. Twelve sequence bits allow 4,096 ids per millisecond per machine, about 4 million a second. Ids sort by time, are 8 bytes, and need no call to any server. The one coordination step is giving each machine a unique id, often from a config file or a lease in ZooKeeper or etcd.",
      },
      {
        heading: "Clock rollback, UUIDv7 and ULID",
        body: "Time-based ids trust the clock. If NTP moves a machine back 3 ms, it may re-issue timestamps it already used, so a Snowflake generator remembers the last timestamp. If now is behind it, the generator waits for a small gap or refuses a large one. If the sequence reaches 4,095 within one millisecond, it waits for the next. UUIDv7 (RFC 9562) and ULID drop the machine id: a 48-bit millisecond timestamp, then random bits (74 in UUIDv7, 80 in ULID). They sort by time, need no coordination, and collide only if two machines pick the same random bits in one millisecond. Their cost is that order across machines is only as good as the clocks, and the id shows when a row was created.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed uses two kinds. Rows made by the Laravel web app, such as strategies, have a database `id()` counter, which suits one MySQL primary and a single user. The Python engine mints its own ids for orders and signals as random UUIDs, in memory, before any database or broker call, because an order id must exist before the broker answers and is stored as the order's tag. There is no Snowflake service, and none is needed with one engine process. We would move to time-ordered ids, such as UUIDv7, when several engines or shards create rows and we want index-friendly inserts without a central counter.",
      },
    ],
    complexityDerivation:
      "Uniqueness has to come from one of three places: a single authority that never repeats (a counter), a partition of the id space so no two generators can ever overlap (machine bits, or ranges), or randomness wide enough that overlap is vanishingly unlikely (UUIDs). Each is an argument about who could produce the same id. The counter is safe because there is one writer. Snowflake is safe because the machine id is unique, time moves forward on one machine, and the sequence separates ids within one millisecond. UUIDv4 is safe because 2^61 draws are needed for even odds of a repeat. Order is a separate property, and it comes only from time or a counter. The arguments stop holding when their assumptions fail: two machines given the same machine id, a clock that moves backwards, a weak random source, or a counter restored from an old backup so that it hands out numbers already used.",
    variants: [
      {
        name: "Database counter or ticket server",
        when: "One primary database, modest write volume, and ids that should be small and in strict order.",
        delta:
          "8 bytes and perfect index locality, but one writer. Sharding needs offsets or ranges, ids reveal volume, and strict order is lost across ticket servers.",
      },
      {
        name: "Snowflake-style 64-bit id",
        when: "Many writers across machines or shards, ids that must fit a 64-bit column and sort by time.",
        delta:
          "No per-id network call and roughly time-ordered, but each machine needs a unique id, and a clock that steps back must be handled.",
      },
      {
        name: "UUIDv4, UUIDv7 or ULID",
        when: "Ids made anywhere with no setup, including on phones or in services that never talk to each other.",
        delta:
          "v4 is random and index-hostile. v7 and ULID are time-ordered and index-friendly, are 16 bytes, and reveal the creation time.",
      },
    ],
    tradeoffs: [
      {
        vs: "Small sequential ids versus coordination-free ids",
        pick: "Sequential while one writer exists, coordination-free once there are many",
        because:
          "A counter is smaller and faster to index. It stops being an option the moment two machines must create rows at the same time without asking a third.",
      },
      {
        vs: "Random UUIDv4 versus time-ordered ids as a primary key",
        pick: "Time-ordered for large tables",
        because:
          "Random keys scatter writes across the index and slow inserts once the index no longer fits in memory. Time-ordered keys append near the end, as a counter does.",
      },
      {
        vs: "Using the id as the creation time versus storing a timestamp",
        pick: "Store a real timestamp column as well",
        because:
          "An id's time can be skewed by a wrong clock, and it is only millisecond-exact. Reports and ordering of events should use a column you can fix, not a value baked into the key.",
      },
    ],
  },
  algorithms: [
    {
      name: "Snowflake bit packing",
      role: "Shifts and ORs a timestamp, a machine id and a sequence into one 64-bit integer that sorts by time.",
      dsa: "bit-manipulation",
    },
    {
      name: "Birthday bound for random ids",
      role: "Shows how many random 122-bit ids can be drawn before a repeat becomes likely, so you can size the risk.",
      dsa: "hashing",
    },
    {
      name: "B-tree insert locality",
      role: "Explains why time-ordered keys append at the right edge of an index while random keys split pages everywhere.",
      dsa: "balanced-trees",
    },
    {
      name: "Monotonic timestamp guard",
      role: "Remembers the last timestamp issued, and waits or refuses when the clock goes backwards.",
    },
  ],
  realWorld: [
    {
      system: "Twitter Snowflake",
      kind: "industry",
      problem:
        "Twitter needed ids for tweets from many machines, at high rate, roughly sortable by time, and with no central counter in the way.",
      applied:
        "Snowflake generates 64-bit ids from a millisecond timestamp, a worker id and a per-millisecond sequence. Workers are assigned distinct ids and keep the last timestamp so they can refuse to issue ids if the clock moves backwards.",
      evidence: "Twitter Engineering blog: Announcing Snowflake (2010); the open-source Snowflake repository",
      impact:
        "Ids sort by creation time, fit a 64-bit column and need no network call to create.",
    },
    {
      system: "Instagram's sharded ids",
      kind: "industry",
      problem:
        "Instagram stored photos across many PostgreSQL shards and wanted ids that sort by time without running a separate id service.",
      applied:
        "Its engineering blog describes a 64-bit id: 41 bits of milliseconds, 13 bits for the logical shard and 10 bits from a per-table sequence, generated inside PostgreSQL by a function. The shard id sits inside the id, so the id tells you where the row lives.",
      evidence: "Instagram Engineering blog: Sharding & IDs at Instagram (2012)",
      impact:
        "New ids are time-ordered and routing to a shard needs only the id.",
    },
    {
      system: "Flickr ticket servers",
      kind: "industry",
      problem:
        "A sharded MySQL setup needed globally unique numeric ids, and a single counter would be a single point of failure.",
      applied:
        "Flickr described two dedicated MySQL servers with auto-increment steps of 2, one issuing odd numbers and the other even. Applications ask one of the two for an id, and the other covers it when one is down.",
      evidence: "Flickr Engineering blog: Ticket Servers: Distributed Unique Primary Keys on the Cheap (2010)",
      impact:
        "Unique, compact ids with simple operations, at the price of a network call per id and loose ordering.",
    },
    {
      system: "MongoDB ObjectId",
      kind: "industry",
      problem:
        "Clients and many servers need to create document ids without asking the database for a number first.",
      applied:
        "An ObjectId is 12 bytes: a 4-byte timestamp in seconds, a 5-byte random value fixed per process, and a 3-byte counter that starts at a random value. Ids made by one process sort by time, and no server call is involved.",
      evidence: "MongoDB documentation: ObjectId",
      impact:
        "Drivers can create ids offline and inserts are mostly appends in the index.",
    },
  ],
  insights: [
    {
      t: "Uniqueness has three sources",
      d: "One authority (counter), disjoint partitions (machine bits) or wide randomness (UUID). Know which one your id relies on and what breaks it.",
    },
    {
      t: "Order is its own property",
      d: "Only time or a counter gives sort order. Random UUIDv4 does not, which is why it scatters writes in a B-tree index.",
    },
    {
      t: "Snowflake is 41 + 10 + 12",
      d: "Forty-one bits of milliseconds last about 70 years. Twelve sequence bits give 4,096 ids per millisecond per machine.",
    },
    {
      t: "Time-based ids trust the clock",
      d: "Remember the last timestamp. If the clock steps back, wait or refuse. Never reuse a timestamp and sequence pair.",
    },
  ],
  pitfalls: [
    "Giving two machines the same machine id after copying a config or an image. Their ids will collide with no error until a duplicate-key failure.",
    "Using a millisecond timestamp alone as an id. Two calls in the same millisecond produce the same value.",
    "Treating id order as event order across machines. Ids sort by each machine's clock, which can differ by milliseconds or more.",
  ],
  quiz: [
    {
      q: "How are the 64 bits of a Snowflake-style id arranged from the high bits to the low bits?",
      options: [
        "A random block, then a checksum, then the machine id",
        "The machine id, then a counter, then random bits",
        "The sequence, then the date, then the machine id",
        "Time, then the machine id, then a sequence",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Time sits in the high bits so ids sort by creation time. The machine id keeps generators apart, and the low-bit sequence separates ids made in the same millisecond.",
      distractors: [
        "Snowflake has no checksum and no random block. Uniqueness comes from the machine id and the sequence.",
        "Putting the machine id first would group ids by machine and lose time order.",
        "A sequence in the high bits would make ids reset in order every millisecond, so they would not sort by time.",
        "",
      ],
    },
    {
      q: "Why do random UUIDv4 primary keys slow inserts into a large B-tree index?",
      options: [
        "Each new key lands on a random page, so pages are read and split across the tree",
        "UUIDs cannot be compared, so the index needs a hash instead",
        "The database must lock the whole table to check for repeats",
        "A UUID is stored as text, so every comparison is a string search",
      ],
      answer: 0,
      difficulty: "recall",
      why: "A B-tree is ordered. Sequential keys append at the right edge, while random keys hit pages everywhere, so a large index causes many page reads and splits.",
      distractors: [
        "",
        "UUIDs compare perfectly well, as 128-bit numbers. The issue is where they land, not whether they compare.",
        "Uniqueness is enforced by the index itself, with no table lock for each insert.",
        "Databases can store a UUID in 16 bytes. Text storage is a choice, and size is a smaller problem than scatter.",
      ],
    },
    {
      q: "A Snowflake-style generator has 12 sequence bits. About how many ids can one machine make per second?",
      options: [
        "About 40 thousand a second",
        "About 4 billion a second",
        "About 4 million a second",
        "About 400 a second",
      ],
      answer: 2,
      difficulty: "apply",
      why: "12 bits give 4,096 values per millisecond. Times 1,000 milliseconds is 4,096,000, about 4 million per second per machine.",
      distractors: [
        "That forgets the factor of 1,000 milliseconds in a second.",
        "That overcounts by a factor of 1,000. The sequence resets every millisecond, not every microsecond.",
        "",
        "That treats the 4,096 as a per-second limit, but the sequence is per millisecond.",
      ],
    },
    {
      q: "A machine making Snowflake ids has its clock stepped back 3 ms after an NTP correction. Its last id used timestamp T. What should the generator do?",
      options: [
        "Carry on using the new, earlier reading of the clock",
        "Wait until the clock passes T, or refuse if the gap is large",
        "Reset the sequence to zero and keep the machine id",
        "Switch to a random machine id for the next few ids",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Reusing a timestamp with a sequence already issued can repeat an id. The generator keeps the last timestamp and waits for a small gap, or fails loudly for a large one.",
      distractors: [
        "Using the earlier time can reissue ids already handed out in those milliseconds.",
        "",
        "Resetting the sequence makes a repeat more likely, since the old values for that timestamp were used.",
        "A random machine id could collide with a real machine's id and breaks the uniqueness argument.",
      ],
    },
    {
      q: "A team creates a billion random UUIDv4 values a day. How worried should they be about a repeat?",
      options: [
        "Not at all, since about 2^61 values would be needed for even odds",
        "Very, because a billion a day will repeat within a year",
        "Certain to repeat, because UUIDs are unique only per machine",
        "Impossible to say, because random values can repeat at any time",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The birthday bound needs around 2.3 quintillion ids for even odds. A billion a day for a century is far below, so the chance is negligible compared with other failures.",
      distractors: [
        "",
        "A billion a day is large to a person, but tiny against 2^61. The odds stay negligible.",
        "Version 4 UUIDs do not depend on a machine. Their uniqueness rests on random bits.",
        "The odds can be computed with the birthday bound. Not zero, but negligibly small.",
      ],
    },
    {
      q: "A MySQL table keyed by UUIDv4 now has 300 million rows and inserts have slowed. Which change keeps UUIDs but fixes the cause?",
      options: [
        "Add more secondary indexes to speed up lookups",
        "Hash each UUID into an integer before storing it",
        "Use shorter random strings so the keys are smaller",
        "Switch new keys to UUIDv7, which are time-ordered",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The slowness comes from random keys scattering across the clustered index. UUIDv7 begins with a millisecond timestamp, so new keys append near the end.",
      distractors: [
        "More indexes mean more writes per insert, which makes inserts slower still.",
        "A hash of a random value is still random, so inserts keep landing on random pages.",
        "Shorter random keys are still random and collide sooner. Size is not the main cause.",
        "",
      ],
    },
    {
      q: "A small app has one PostgreSQL primary and about 5,000 inserts a day. Its tables need row ids. What is the sound choice?",
      options: [
        "A Snowflake service with worker ids kept in ZooKeeper",
        "The database's own bigint identity column",
        "UUIDv4 for every table, so ids are globally unique",
        "A custom 128-bit id built from three clocks",
      ],
      answer: 1,
      difficulty: "judge",
      why: "One writer and tiny volume are what a counter handles best. It is the smallest, fastest to index and needs no extra service. The other options add machinery with nothing to gain.",
      distractors: [
        "A coordination service and a generator to run, for a load a single sequence handles with ease.",
        "",
        "UUIDv4 costs index locality and double the bytes, and gives a benefit this app does not need.",
        "A home-made scheme invites bugs and brings no benefit over a standard one.",
      ],
    },
    {
      q: "An order API will have cursor pagination by creation time across 12 shards with no central service. Ids shown to clients must not reveal how many orders exist. Which id fits?",
      options: [
        "A per-shard counter with the shard number as a prefix",
        "A random UUIDv4 stored as the primary key",
        "UUIDv7 or ULID, with time plus random bits",
        "A central ticket server that hands out numbers",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Time-ordered ids sort by creation for cursor pagination, need no coordination, and carry random bits instead of a running count, so volume is not exposed.",
      distractors: [
        "Counters reveal volume, and prefixed counters from different shards do not sort by time.",
        "UUIDv4 hides volume but has no time order, so cursor pagination by id does not work.",
        "",
        "A central server is a single point of failure and a bottleneck, and the numbers still reveal volume.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-distributed-ids-engine-order-id",
      scenario:
        "A trading engine runs as one process on one server. A multi-leg options entry places four orders within the same millisecond. Each order needs an id that exists before any database or broker call, because the same id is written to the order row and sent to the broker as its tag, and the database may be briefly unavailable. Ids must stay unique across restarts. Which id fits?",
      options: [
        {
          label: "The current time in milliseconds as the id",
          appeal:
            "Short, readable, and sorts by time with no library.",
        },
        {
          label: "A random UUID made in the process's memory",
          appeal:
            "Needs no call, no state to restore, and a repeat is practically impossible.",
        },
        {
          label: "An auto-increment id from the order table, fetched before each broker call",
          appeal:
            "Small and in strict order, and the database guarantees uniqueness.",
        },
        {
          label: "A Snowflake id from a separate id service",
          appeal:
            "Time-ordered and unique across many machines.",
        },
      ],
      best: 1,
      verdict:
        "The id has to exist before any I/O and survive restarts with no stored counter. A random UUID needs neither. A millisecond timestamp gives the four legs the same id. A database counter needs the database to be up first. A separate id service adds a network dependency to a one-process system.",
      claims: [
        {
          text: "You give up time order at the id level, so sorting orders by creation should use a timestamp column.",
          axis: "trade",
          correct: true,
          note: "True. UUIDv4 is random, so id order says nothing about creation order.",
        },
        {
          text: "You need no counter state, round trip or coordination to mint an id.",
          axis: "trade",
          correct: true,
          note: "True. That is the main benefit when the id must exist before any I/O.",
        },
        {
          text: "You gain a mathematical guarantee that no two ids ever repeat.",
          axis: "trade",
          correct: false,
          note: "A repeat is possible but needs about 2^61 ids for even odds. It is negligible, not zero.",
        },
        {
          text: "A bare millisecond timestamp would give two legs placed in the same millisecond the same id.",
          axis: "failure",
          correct: true,
          note: "True. Four orders in one millisecond share one timestamp.",
        },
        {
          text: "Random ids remove the need to check the broker after a timeout.",
          axis: "failure",
          correct: false,
          note: "The id identifies the order. It does not tell you whether the broker received it.",
        },
        {
          text: "Count duplicate-key errors on the order table. Any non-zero count points to a bug.",
          axis: "measure",
          correct: true,
          note: "True. With random ids a duplicate should never occur, so one is worth a look.",
        },
        {
          text: "The number of ids created per second shows whether ids are unique.",
          axis: "measure",
          correct: false,
          note: "Rate says nothing about uniqueness. Duplicate-key errors do.",
        },
      ],
    },
    {
      id: "sd-distributed-ids-festival-order-ids",
      scenario:
        "An e-commerce site runs 40 database shards. In a festival sale it creates up to 150,000 orders a second. Ids must fit a 64-bit column, sort roughly by creation time for pagination, and be created by application servers with no call to a central service. New application servers are added and removed during the sale. Which design fits?",
      options: [
        {
          label: "A central ticket server that hands out the next number",
          appeal:
            "Strictly ordered and tiny.",
        },
        {
          label: "A random UUIDv4 for each order",
          appeal:
            "Needs no coordination at all.",
        },
        {
          label: "A Snowflake-style id with worker ids leased from a coordination service at start-up",
          appeal:
            "64-bit, time-ordered, and created locally at millions per second per worker.",
        },
        {
          label: "One auto-increment sequence per shard, with ids from different shards kept apart by a shard prefix",
          appeal:
            "Simple and uses features the databases already have.",
        },
      ],
      best: 2,
      verdict:
        "The constraints are 64 bits, rough time order, no per-id central call, and workers that come and go. Snowflake meets all four, and a lease from a coordination service handles the one hard part, unique worker ids. A central server would be called 150,000 times a second. UUIDv4 is 128 bits with no time order. Per-shard counters do not sort by time across shards.",
      claims: [
        {
          text: "You accept a start-up step that leases each worker a unique machine id, and the lease must expire safely when a worker dies.",
          axis: "trade",
          correct: true,
          note: "True. This is the one coordination cost of the design.",
        },
        {
          text: "Ids are 8 bytes and roughly time-ordered, so inserts append near the end of each shard's index.",
          axis: "trade",
          correct: true,
          note: "True. That is why this beats UUIDv4 as a primary key here.",
        },
        {
          text: "Id order equals event order exactly across all workers.",
          axis: "trade",
          correct: false,
          note: "Ordering is only as good as the workers' clocks. Ids within a few milliseconds may interleave.",
        },
        {
          text: "If a worker's clock steps back, it can repeat a timestamp and sequence, so the generator must wait or refuse.",
          axis: "failure",
          correct: true,
          note: "True. A monotonic guard on the last timestamp is part of the design.",
        },
        {
          text: "If two workers get the same machine id, the sequence bits keep their ids apart.",
          axis: "failure",
          correct: false,
          note: "Each worker counts its own sequence from zero, so the same timestamp and sequence give identical ids.",
        },
        {
          text: "Alert on any clock-rollback event and on any worker that starts with a machine id already in use.",
          axis: "measure",
          correct: true,
          note: "True. These are the two ways the uniqueness argument can fail.",
        },
        {
          text: "The average id length in bytes shows whether ids are unique.",
          axis: "measure",
          correct: false,
          note: "Snowflake ids are always 8 bytes. Length cannot reveal a clash.",
        },
      ],
    },
    {
      id: "sd-distributed-ids-offline-notes",
      scenario:
        "A mobile app lets 3 million users create trade-journal entries offline, on phones, and sync them later. Entries must get an id on the phone, without the server, and the server must accept them without id clashes. Users want entries listed newest first. Phone clocks are sometimes wrong. A small team runs the backend on one PostgreSQL database. Which id fits?",
      options: [
        {
          label: "UUIDv7: a timestamp from the phone, plus random bits",
          appeal:
            "Created offline, roughly time-ordered for lists, and needs no machine id.",
        },
        {
          label: "A server auto-increment id, requested when the phone is online",
          appeal:
            "Small and strictly ordered.",
        },
        {
          label: "The phone's clock in milliseconds as the id",
          appeal:
            "Simple, and it sorts by time.",
        },
        {
          label: "Snowflake ids with a machine id assigned to each phone",
          appeal:
            "Compact 64-bit ids and time order.",
        },
      ],
      best: 0,
      verdict:
        "Ids must be minted offline, by millions of devices, with no central assignment. UUIDv7 needs no coordination, its random bits stop two phones colliding in one millisecond, and its time prefix gives a useful sort. A server counter needs a connection. A bare timestamp can clash across phones. Snowflake's 10 machine bits cannot be assigned to millions of phones.",
      claims: [
        {
          text: "You accept 16-byte ids that reveal the creation time the phone claimed.",
          axis: "trade",
          correct: true,
          note: "True. The id embeds the phone's timestamp.",
        },
        {
          text: "Ids are created offline and can be inserted by the server as they arrive, with no round trip to ask for a number.",
          axis: "trade",
          correct: true,
          note: "True. That is the requirement this id satisfies.",
        },
        {
          text: "You gain a strict global order of creation across all phones.",
          axis: "trade",
          correct: false,
          note: "Order follows each phone's clock, so it is only approximate across devices.",
        },
        {
          text: "A phone whose clock is a year ahead creates ids that sort far in the future, so id order must not decide which entry is latest.",
          axis: "failure",
          correct: true,
          note: "True. Keep a server-side received time and use that for authority.",
        },
        {
          text: "Two phones creating entries in the same millisecond will produce the same id.",
          axis: "failure",
          correct: false,
          note: "The random bits make a clash negligible, which is why they are in the id.",
        },
        {
          text: "Compare each id's embedded time with the server's received time to spot phones with bad clocks.",
          axis: "measure",
          correct: true,
          note: "True. A large gap flags a device whose ids will sort oddly.",
        },
        {
          text: "The count of entries synced per user shows whether ids are colliding.",
          axis: "measure",
          correct: false,
          note: "Sync volume says nothing about clashes. Rejected duplicate ids do.",
        },
      ],
    },
  ],
};

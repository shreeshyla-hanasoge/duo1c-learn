import type { Topic } from "../../types.ts";

export const sdMerkleAntientropy: Topic = {
  id: "sd-merkle-antientropy",
  title: "Merkle trees and repairing replicas",
  tier: 4,
  week: 8,
  depth: "deep",
  summary:
    "Replicas drift apart. A Merkle tree finds the few differing rows by comparing hashes, so repair costs a handful of hashes instead of a full copy.",
  why: "Any system that keeps more than one copy of data will see the copies disagree, after a crash, a dropped message or a node that was down for a night. You must know how a database notices and fixes that without comparing billions of rows. The same hash-tree idea sits inside Git, Bitcoin and certificate logs, so it is one of the most reusable tricks in the field. Traed keeps one database copy today, so it is a concept to know, not a part to build yet.",
  learn: {
    intuition:
      "Two libraries each hold the same ten thousand books. After a flood in one of them, you want to know which books differ. Reading every title aloud over the phone would take days. So the librarians split each library into ten shelves and each shelf into ten racks. Each rack gets a short fingerprint made from the books on it, each shelf gets a fingerprint made from its rack fingerprints, and the library gets one fingerprint at the top. They compare the top fingerprints first. If those match, nothing is wrong and the call ends in a second. If not, they compare the ten shelf fingerprints, find the one that differs, then compare only that shelf's racks. Within a few questions they point at one rack, and only those books are checked by hand. Finding the problem costs a few fingerprints, not ten thousand titles.",
    mechanics: [
      {
        heading: "Why replicas drift: entropy",
        body: "Replication copies each write to several nodes, but copies still diverge. A node is down for a night, a network packet is lost, a disk silently corrupts a block, or a write reaches two of three nodes before a crash. Distributed databases call this drift entropy, and the process that removes it anti-entropy. Brute force does not work at scale. If a node holds 1 billion rows of 100 bytes, that is 100 GB, and comparing two replicas by shipping all of it over the network takes hours and floods the link. You need a way to say 'these two replicas agree' with a few bytes, and, when they do not, to find where.",
      },
      {
        heading: "The hash tree and how it narrows a difference",
        body: "A Merkle tree, named for Ralph Merkle, hashes data in layers. Split the key space into ranges. Each leaf holds a hash of the rows in one range. Each parent holds the hash of its two children joined together, up to a single root hash. Two replicas build trees over the same ranges and swap roots. Equal roots mean equal data, with overwhelming probability. Different roots mean you descend only into the child whose hash differs. With 8 leaves, a single bad range is found in 3 steps. With 1 million leaves it takes about 20 steps, each swapping two 32-byte hashes, so roughly 1 KB of traffic instead of 100 GB.",
      },
      {
        heading: "Three ways to repair: read repair, hints, anti-entropy",
        body: "Dynamo-style stores such as Cassandra use three layers. Read repair fixes data on the read path: the coordinator asks several replicas, sees that one returned an older version, and writes the newest value back to it. Hinted handoff covers short outages: while a replica is down, another node stores the missed writes as hints and replays them when it returns. In Cassandra hints are kept for a limited window, three hours by default. Anti-entropy repair is the safety net. A scheduled job builds Merkle trees per key range on each replica, compares them, and streams only the differing ranges. It also catches rows that nobody reads.",
      },
      {
        heading: "The same tree in Git and blockchains",
        body: "Git stores a directory as a tree object whose hash is built from its files' hashes, and a commit points to the root tree. If two commits have the same root hash, their whole snapshots are identical, so Git can skip unchanged folders without reading them. Bitcoin puts a Merkle root of all transactions in each block header, so a phone can verify that one payment is in a block with about log2(n) hashes: for 1,024 transactions, 10 hashes, not 1,024 transactions. The cost to remember is that any change near a leaf changes every hash up to the root, and building a tree means reading all the data once.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed does not need this today. It keeps one MySQL database on one server, so there is no second copy to disagree with, and its off-box copy is a Percona XtraBackup stream to S3, which is a backup rather than a live replica. The nearest thing is the habit of comparing a cheap summary before a costly full check. If Traed added a read replica, or kept a copy of its candle history on a second machine, a per-day checksum over each day's rows would be a two-level Merkle tree. Full tree repair becomes worth building only when copies are many and large.",
      },
    ],
    complexityDerivation:
      "The invariant is simple: if two nodes hold the same data they produce the same root hash, and if they differ the hashes along at least one path from the root down to a leaf differ. A good hash makes accidental equality of different data so unlikely that it is ignored. So comparing is a walk down the tree, which takes about log of the number of leaves steps for one difference, and about d times that for d differences, as each difference needs its own path. The work to find d differing ranges is therefore proportional to d, not to the data size. That is why repair is cheap when replicas are almost in sync. The argument weakens in three places. Building the tree needs one full read of the data, so it costs disk time. When the leaf ranges are coarse, a single bad row forces a whole range to be streamed. And if replicas differ everywhere, as after a long outage, the tree descends into every branch and a full copy is cheaper.",
    variants: [
      {
        name: "Read repair",
        when: "You want popular rows to heal themselves with no extra job, and reads already contact several replicas.",
        delta:
          "Fixes only the rows that are actually read, and only when the read touches a stale replica. Cold data stays wrong until something else repairs it.",
      },
      {
        name: "Hinted handoff",
        when: "A replica is down briefly, for minutes or a few hours, and the cluster should catch it up on return.",
        delta:
          "Cheap and targeted, but hints are stored for a bounded time and can be lost if the holder dies, so it does not replace anti-entropy.",
      },
      {
        name: "Scheduled Merkle anti-entropy",
        when: "Copies must converge even for data nobody reads, for example after long outages or silent corruption.",
        delta:
          "Builds hash trees per range and streams only differing ranges. Costs a full disk read per run and some CPU, so it runs on a schedule, often weekly.",
      },
    ],
    tradeoffs: [
      {
        vs: "Compare every row versus compare hash trees",
        pick: "Hash trees once data is large and mostly in sync",
        because:
          "A full compare moves 100 GB to find a few bad rows. A tree moves about a kilobyte to locate them. The price is the one-time read to build the tree.",
      },
      {
        vs: "Fine leaves versus coarse leaves",
        pick: "Fine enough that a bad leaf is a small stream",
        because:
          "More leaves mean smaller repairs but a bigger tree in memory. If one bad row sits in a leaf that covers 100,000 rows, you resend all of them.",
      },
      {
        vs: "Repair on the read path versus a scheduled repair job",
        pick: "Use both",
        because:
          "Read repair keeps hot rows fresh at almost no cost, while the scheduled job reaches cold rows. Either alone leaves a gap, and the job also bounds how long deleted data can come back.",
      },
    ],
  },
  algorithms: [
    {
      name: "Merkle tree",
      role: "Summarises a whole key range as one root hash, so two replicas can find differing ranges by walking down mismatched hashes.",
    },
    {
      name: "Cryptographic hash function",
      role: "Gives each leaf and parent a fixed-size fingerprint, so equal hashes mean equal data with overwhelming probability.",
      dsa: "hashing",
    },
    {
      name: "Last-write-wins version comparison",
      role: "Decides which replica's copy of a differing row is newer, using timestamps, so repair writes the winner to the others.",
    },
  ],
  realWorld: [
    {
      system: "Amazon Dynamo",
      kind: "industry",
      problem:
        "A highly available store accepts writes even when some replicas are down, so replicas inevitably diverge.",
      applied:
        "The Dynamo paper describes hinted handoff for short failures and Merkle trees for anti-entropy. Each node keeps a tree per key range it hosts and exchanges roots with the other replicas, so only out-of-sync ranges are transferred.",
      evidence: "DeCandia et al., Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)",
      impact:
        "Replicas converge without comparing every key, and the work is proportional to how much differs.",
    },
    {
      system: "Apache Cassandra repair",
      kind: "industry",
      problem:
        "A node that was down longer than the hint window, or rows nobody reads, can stay inconsistent for ever.",
      applied:
        "Cassandra's nodetool repair builds a Merkle tree of each token range on every replica, compares them, and streams the mismatched ranges. Operators are advised to run it regularly, within the tombstone grace period, so deleted rows do not return.",
      evidence: "Apache Cassandra documentation: repair and hints",
      impact:
        "Repair is a planned maintenance job with a known cost: a full read of the data on each run.",
    },
    {
      system: "Git object model",
      kind: "industry",
      problem:
        "A tool must tell whether two project snapshots are the same, and which files changed, without reading every file.",
      applied:
        "Every file, folder and commit is stored by the hash of its content. A folder's hash is built from its children's hashes, so an unchanged folder has an unchanged hash and Git skips it.",
      evidence: "Pro Git book, chapter on Git Internals: Git Objects",
      impact:
        "Diffs, fetches and pushes touch only the changed parts of a large repository.",
    },
    {
      system: "Certificate Transparency logs",
      kind: "industry",
      problem:
        "Browsers need proof that a certificate is in a public log, and that the log has only been appended to, without downloading the whole log.",
      applied:
        "RFC 6962 defines a Merkle tree over the log. An inclusion proof is a short list of hashes, about log2(n) of them, from the entry up to the signed root. A consistency proof shows an older root is a prefix of a newer one.",
      evidence: "RFC 6962, Certificate Transparency",
      impact:
        "A log with hundreds of millions of entries can be audited with proofs of a few dozen hashes.",
    },
  ],
  insights: [
    {
      t: "Compare summaries, not data",
      d: "A root hash says 'same' in 32 bytes. Only when it differs do you descend, and only into the branch that differs.",
    },
    {
      t: "Cost scales with the difference",
      d: "Finding one bad range among 1 million takes about 20 steps. Repair is cheap exactly when replicas are nearly in sync.",
    },
    {
      t: "Three layers, three jobs",
      d: "Read repair heals what is read, hints cover short outages, and Merkle anti-entropy reaches everything else on a schedule.",
    },
    {
      t: "The same idea is everywhere",
      d: "Git trees, Bitcoin block headers and certificate logs all use a hash of hashes so a small proof can vouch for a big set.",
    },
  ],
  pitfalls: [
    "Believing hinted handoff makes repair unnecessary. Hints expire and can be lost, so a node that was down longer than the window needs a full anti-entropy run.",
    "Making leaf ranges too coarse. One bad row then forces the whole range to be streamed, and a repair can move far more than the real difference.",
    "Skipping scheduled repair because reads look correct. Cold rows can sit wrong for months, and deleted data can reappear once tombstones are purged.",
  ],
  quiz: [
    {
      q: "In a Merkle tree, what does a parent node's hash represent?",
      options: [
        "A hash made from the hashes of its child nodes",
        "The newest timestamp found among its child nodes",
        "A copy of the larger of its two child nodes' data",
        "A count of how many rows its children contain",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Each parent hashes its children's hashes joined together, so the root summarises every leaf. Change one leaf and every hash on the path to the root changes.",
      distractors: [
        "",
        "A tree of timestamps would help choose a winner but cannot prove two ranges are identical.",
        "Parents store only a hash, never a copy of the data. Copying would defeat the saving.",
        "A count is cheap, but different data can have the same count, so it cannot prove equality.",
      ],
    },
    {
      q: "Which repair mechanism runs on a schedule and can reach rows that nobody reads?",
      options: [
        "Read repair, because it fixes stale replicas on each read",
        "Hinted handoff, because it queues writes for downed nodes",
        "Merkle-tree anti-entropy, because it compares whole key ranges",
        "Quorum writes, because they wait for several replicas",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Anti-entropy compares hash trees across replicas for every range, whether or not any client reads those rows. The other mechanisms depend on a read or a recent outage.",
      distractors: [
        "Read repair touches only rows that are read. Cold rows never get fixed that way.",
        "Hints cover short outages and expire. They do not discover old drift.",
        "",
        "Quorum writes happen at write time and do not repair divergence that appeared later.",
      ],
    },
    {
      q: "Two replicas each hold 1,048,576 key ranges as leaves of a Merkle tree, and exactly one range differs. About how many hash comparisons are needed to find it by descending from the roots?",
      options: [
        "About 1,048,576, since each leaf must be checked once",
        "About 1,024, the square root of the leaf count",
        "About 5, since a hash tree is always shallow",
        "About 20 levels, comparing two child hashes at each level",
      ],
      answer: 3,
      difficulty: "apply",
      why: "1,048,576 is 2 to the power 20, so the tree has 20 levels. At each level you compare the two children and descend into the one that differs, so the work is proportional to the depth.",
      distractors: [
        "That is what a flat comparison costs. The tree exists to avoid it.",
        "A square root appears in blocked searches, not here. Each step of a binary tree halves the range.",
        "A tree over a million leaves cannot be that shallow, as depth grows with the logarithm of the leaf count.",
        "",
      ],
    },
    {
      q: "A Cassandra node was down for 9 hours. Hints are kept for 3 hours. After it returns, what should the operator expect?",
      options: [
        "Hints cover the whole outage, so no further action is needed",
        "The node is missing writes from the last 6 hours and needs a repair run",
        "The node deletes its data and rejoins as a brand new node",
        "Read repair will fix every missed row within a few minutes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Hints are stored only within the window, so writes older than 3 hours of the outage were not saved as hints. A repair using Merkle trees finds and streams the missing ranges.",
      distractors: [
        "Hints stop being stored after the window, so they cover only the first 3 hours at best.",
        "",
        "Nothing makes a node wipe itself. It comes back with the data it had and the gap needs filling.",
        "Read repair fixes only rows that are read. Rows nobody asks for stay missing.",
      ],
    },
    {
      q: "A bank runs 3 replicas of a 4 TB ledger store. A nightly job copies the full dataset between replicas to check them, and takes 6 hours on a busy link. What is the better design?",
      options: [
        "Stop checking, because replicas almost always agree anyway",
        "Check once a year, because a full copy is too slow to run often",
        "Hash every row on arrival so no replica ever needs checking again",
        "Build hash trees per key range and stream only ranges that differ",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Replicas are nearly in sync, so exchanging tree hashes finds the few differing ranges at the cost of a read plus a small transfer. The full copy moves 4 TB to find a few bad rows.",
      distractors: [
        "Silent corruption and lost writes are real. Without checking, they are found only when a customer sees a wrong balance.",
        "Checking rarely lets drift grow, and it makes each repair larger and riskier.",
        "A hash on arrival detects corruption in flight but not a missed write or later disk damage.",
        "",
      ],
    },
    {
      q: "A team stores each day's candles for NIFTY on two machines. They compare one checksum per day, and if a day differs they re-copy that day. Which statement describes this best?",
      options: [
        "A two-level Merkle-style check: cheap summaries first, then data only where they differ",
        "Read repair, because it fixes stale copies as they are used",
        "Hinted handoff, because it holds writes for a missing machine",
        "A quorum read, because it asks two machines for the same value",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A per-day checksum is a middle layer of a hash tree, with the days as leaves. Comparing summaries first and copying only mismatched days is the Merkle idea at small scale.",
      distractors: [
        "",
        "Read repair happens during client reads. This is a scheduled comparison.",
        "Hints are stored writes for a down node. Nothing is being stored here.",
        "A quorum read compares returned values at read time and does not summarise ranges.",
      ],
    },
    {
      q: "An engineer says: 'Merkle repair is free, so we can run it every minute on all nodes.' What is the sound judgement?",
      options: [
        "Correct, as hash comparison costs almost nothing at any frequency",
        "Wrong, because building each tree needs a full read of the data",
        "Correct, because repair only transfers the changed rows",
        "Wrong, because hash trees can detect corruption but cannot fix it",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Comparing roots is cheap, but producing the hashes means reading the data. Running it every minute would keep the disks busy for no gain, so it is usually weekly or similar.",
      distractors: [
        "The compare step is cheap. The build step is where the cost sits.",
        "",
        "The transfer is small, but the read to build the trees is not, and it is paid on every run.",
        "A tree finds which ranges differ, and the system then streams the correct data to fix them.",
      ],
    },
    {
      q: "A broker's order store has 5 replicas and runs read repair on every read. The team proposes dropping scheduled repair to save disk load. What is the sound judgement?",
      options: [
        "Fine, because every row is read at least once in its life",
        "Fine, because read repair is a superset of anti-entropy",
        "Not fine, because rows that are never read stay inconsistent",
        "Not fine, because read repair cannot fix any stale replica",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Read repair heals only rows that clients read, and a closed order may never be read again. Scheduled anti-entropy covers cold rows and keeps deleted data from coming back.",
      distractors: [
        "Many rows are written once and never read, and some replicas may miss them silently.",
        "Read repair is narrower, since it depends on reads and cannot reach unread data.",
        "",
        "It can fix stale replicas on rows that are read. The gap is the rows that are not.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-merkle-antientropy-downed-node",
      scenario:
        "A payments company runs a 12-node Cassandra cluster with replication factor 3. During a data-centre maintenance, one node was down for 7 hours. Hints are kept for 3 hours by default. Writes continued at about 4,000 per second. The node is back up, and the next day is a salary-credit peak. What should the team do?",
      options: [
        {
          label: "Do nothing, since read repair will fix whatever is read",
          appeal: "No extra load before the peak, and popular rows heal on their own.",
        },
        {
          label: "Run a repair on that node's ranges, so Merkle trees find and stream the missed writes",
          appeal: "Moves only the data the node missed, and does not wait for reads to touch it.",
        },
        {
          label: "Wipe the node and re-stream all of its data from the other replicas",
          appeal: "Guarantees a clean copy and is simple to reason about.",
        },
        {
          label: "Raise the hint window to 24 hours and restart",
          appeal: "Looks like a cheap setting change that would have covered the outage.",
        },
      ],
      best: 1,
      verdict:
        "The outage was longer than the hint window, so a part of the missed writes were never hinted. A targeted repair compares trees for the node's ranges and streams only the gaps, which suits a busy cluster. Waiting for read repair leaves cold rows wrong. A full re-stream moves the whole node's data at peak. Raising the window now does nothing for writes that have already been missed.",
      claims: [
        {
          text: "You accept extra disk and network load on the repaired ranges while the trees are built and the gaps are streamed.",
          axis: "trade",
          correct: true,
          note: "True. Repair reads data to build trees, so it is scheduled outside the peak where possible.",
        },
        {
          text: "You gain a bounded transfer: only the ranges that differ are sent, not the node's full dataset.",
          axis: "trade",
          correct: true,
          note: "True. That is the saving the tree gives over a full re-stream.",
        },
        {
          text: "Repair removes the need for any replication, since the trees keep nodes identical at all times.",
          axis: "trade",
          correct: false,
          note: "Trees find and fix drift after the fact. Replication is what keeps the copies in the first place.",
        },
        {
          text: "Until repair finishes, a read served only by this node can return an older value for rows it missed.",
          axis: "failure",
          correct: true,
          note: "True. A quorum read across replicas protects most callers, but a single-replica read can be stale.",
        },
        {
          text: "The hint window is irrelevant, because hints are replayed whatever their age.",
          axis: "failure",
          correct: false,
          note: "Hints beyond the window are dropped, which is why a repair is needed here.",
        },
        {
          text: "Track repair duration, bytes streamed and whether the node's ranges now match the others.",
          axis: "measure",
          correct: true,
          note: "True. Streamed bytes show how large the gap was, and a clean follow-up compare shows convergence.",
        },
        {
          text: "The cluster's average read latency over the day shows whether the node is consistent.",
          axis: "measure",
          correct: false,
          note: "Latency says nothing about whether data matches across replicas.",
        },
      ],
    },
    {
      id: "sd-merkle-antientropy-nightly-copy",
      scenario:
        "A small team runs one trading server. It keeps 3 years of one-minute candles, about 60 GB, in MySQL, and copies them each night to a second machine for safety. The copy is checked by re-reading both sides in full, which takes 2 hours and slows the morning backfill. Only the last few days ever change. What is a sensible, proportionate fix?",
      options: [
        {
          label: "Move the candles to a Cassandra cluster with Merkle repair built in",
          appeal: "Gets production-grade anti-entropy without writing any code.",
        },
        {
          label: "Stop checking and trust the nightly copy job",
          appeal: "Saves the 2 hours and the load, and the copy job rarely fails.",
        },
        {
          label: "Store a checksum per day on each side, compare those, and re-copy only the days that differ",
          appeal: "A two-level hash tree built from tools already in use, and it targets the few days that can change.",
        },
        {
          label: "Hash the entire table as one value and compare that",
          appeal: "Simplest check, with a single number on each side.",
        },
      ],
      best: 2,
      verdict:
        "With one user and a small, mostly static dataset, a per-day checksum gives the Merkle saving at a tiny cost to build. Only changed days are recopied. A new database cluster is far more machinery than the problem needs, no checking hides silent errors, and one whole-table hash says 'different' without saying where.",
      claims: [
        {
          text: "You accept a small amount of your own code to compute and store day checksums, in return for a much cheaper check.",
          axis: "trade",
          correct: true,
          note: "True. It is a few lines of SQL or script, far less than a new datastore.",
        },
        {
          text: "You give up locating a bad row inside a day; the whole day is re-copied.",
          axis: "trade",
          correct: true,
          note: "True. Leaves are days, and a day of one-minute candles is small enough to resend.",
        },
        {
          text: "A single table-wide hash would pinpoint the bad rows, since it covers every row.",
          axis: "trade",
          correct: false,
          note: "One hash only says that something differs. Locating it needs the layers of a tree.",
        },
        {
          text: "If a late correction rewrites an old day but its checksum is not recomputed, the check will miss the difference.",
          axis: "failure",
          correct: true,
          note: "True. Stored summaries must be refreshed when the data under them changes.",
        },
        {
          text: "A matching checksum proves that both machines are safe from disk failure.",
          axis: "failure",
          correct: false,
          note: "It shows the two copies agree. If both sit on one failing disk or both are wrong, they can still match.",
        },
        {
          text: "Measure how many days mismatch each night and how long the check takes compared with the old full read.",
          axis: "measure",
          correct: true,
          note: "True. A rare mismatch with a short check shows the design is working.",
        },
        {
          text: "The size of the second machine's disk shows whether the copies match.",
          axis: "measure",
          correct: false,
          note: "Disk size is not a comparison of contents.",
        },
      ],
    },
    {
      id: "sd-merkle-antientropy-festival-store",
      scenario:
        "An Indian e-commerce company runs a Dynamo-style store for carts and inventory counters across two regions, 3 replicas per key, 20 billion keys in all. After a 40-minute network split between regions during a festival sale, replicas hold different versions of millions of keys. Customers are still shopping. The team must bring the copies back together. What is the best approach?",
      options: [
        {
          label: "Compare every key between replicas with a full scan",
          appeal: "Certain to find every difference, with no new mechanism.",
        },
        {
          label: "Rely on read repair alone and let traffic heal the data",
          appeal: "No extra job, and the busiest keys are the ones that are read most.",
        },
        {
          label: "Stop writes until the replicas are identical",
          appeal: "Removes any risk of further drift.",
        },
        {
          label: "Run scheduled Merkle anti-entropy per key range alongside read repair, throttled so it does not starve live traffic",
          appeal: "Finds differing ranges cheaply and covers keys that are not read soon.",
        },
      ],
      best: 3,
      verdict:
        "At 20 billion keys a full scan is hours of load in the middle of a sale, and stopping writes loses sales. Read repair alone leaves cold keys wrong. Merkle repair per range finds the millions of differing keys without reading the network end to end, and read repair keeps the hot keys fresh meanwhile. Throttling protects customers.",
      claims: [
        {
          text: "You accept disk and CPU cost to build trees, and you throttle repair so it runs slower in return for protecting live traffic.",
          axis: "trade",
          correct: true,
          note: "True. Repair competes with customers for the same disks.",
        },
        {
          text: "You accept that some keys stay stale for a while, because convergence is eventual, not instant.",
          axis: "trade",
          correct: true,
          note: "True. This is the price of staying available through the split.",
        },
        {
          text: "You gain strong consistency, because trees make every read return the latest write.",
          axis: "trade",
          correct: false,
          note: "Trees repair copies in the background. They do not make reads linearizable.",
        },
        {
          text: "If two regions took different writes to one key during the split, repair must still choose or merge a winner, and a timestamp rule can drop a write.",
          axis: "failure",
          correct: true,
          note: "True. Last-write-wins loses one of the concurrent updates, and a cart might need a merge instead.",
        },
        {
          text: "Merkle repair removes the conflict between writes made during the split.",
          axis: "failure",
          correct: false,
          note: "It finds which values differ. A separate rule must decide which value wins.",
        },
        {
          text: "Track the share of key ranges whose roots match across replicas, and bytes streamed per hour.",
          axis: "measure",
          correct: true,
          note: "True. Matching roots show convergence, and bytes streamed show the work that remains.",
        },
        {
          text: "Total orders per minute shows that the replicas have converged.",
          axis: "measure",
          correct: false,
          note: "Order volume reflects demand, not whether copies of the data agree.",
        },
      ],
    },
  ],
};

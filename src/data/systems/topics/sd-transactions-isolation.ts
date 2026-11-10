import type { Topic } from "../../types.ts";

export const sdTransactionsIsolation: Topic = {
  id: "sd-transactions-isolation",
  title: "Transactions and isolation levels",
  tier: 2,
  week: 4,
  depth: "deep",
  summary:
    "A transaction groups changes so they succeed together. Isolation decides what others may see: lost updates, write skew, phantoms, locks and MVCC.",
  why: "Every system that moves money, seats or orders has two requests touching the same row at the same moment. Whether you lose an update or sell a seat twice depends on one setting most engineers never look at. You need to know what each isolation level actually promises, what MVCC does, and when to take a lock instead. Traed uses a few explicit row locks for exactly this reason, and the same ideas decide how IRCTC-style booking or a UPI ledger stays correct.",
  learn: {
    intuition:
      "Picture a shared paper ledger in a shop, with two clerks and one pen each. Clerk A reads the cash balance, walks to the shelf to fetch a receipt, and writes the new total. Meanwhile clerk B read the same balance, did a sale, and wrote a different total. Whoever writes last wins, and the other sale silently vanishes. A transaction is a rule for the clerks: do all your steps as one unit, and either all of it counts or none of it does. Isolation is how much of each other's half-finished work the clerks may see. The strictest rule is one clerk at a time, which is safe and slow. Looser rules let both work at once, and then you must know which mistakes are still possible.",
    mechanics: [
      {
        heading: "ACID: four promises, one of them yours",
        body: "A transaction is a group of reads and writes that the database treats as one unit. Atomicity: all of it commits or none does, using an undo log to roll back. Durability: once commit returns, the change survives a crash, because the database wrote its write-ahead log to disk first. Isolation: concurrent transactions do not trample each other, to a degree you choose. Consistency is different: it means your rules (balance never negative, one row per order id) stay true, and the database only enforces the ones you declare as constraints. Moving ₹500 from account X to Y is two updates. Atomicity means a crash between them leaves both untouched.",
      },
      {
        heading: "The anomalies, with numbers",
        body: "Each anomaly is a way concurrency goes wrong. Dirty read: you see another transaction's uncommitted change, which then rolls back. Non-repeatable read: you read a row twice and get two values because someone committed in between. Lost update: balance is 1000, two clerks each read 1000, each subtract 100 and write 900, so one withdrawal vanishes and you should have 800. Phantom: you count rows matching a filter, someone inserts a new matching row, and your next count differs. Write skew: a limit of 10 lots, currently 8; two transactions each check 8 + 2 is fine, each insert 2, and the total is 12. They wrote different rows, so no row conflict was ever seen.",
      },
      {
        heading: "Isolation levels and MVCC",
        body: "The SQL levels are read uncommitted, read committed, repeatable read and serializable, each forbidding more anomalies. Most engines implement them with MVCC (multi-version concurrency control): a write creates a new version of the row tagged with a transaction id, and a reader sees only versions committed before its snapshot. Readers never block writers. Read committed takes a fresh snapshot per statement. Repeatable read takes one snapshot per transaction, so repeated reads agree. PostgreSQL defaults to read committed; MySQL InnoDB defaults to repeatable read. Neither stops write skew on its own. Serializable does: PostgreSQL detects dangerous read-write patterns and aborts one transaction, and InnoDB adds locks on reads.",
      },
      {
        heading: "Locks, optimistic checks and deadlocks",
        body: "Two ways to stop a lost update. Pessimistic: lock first. SELECT ... FOR UPDATE takes an exclusive row lock until commit, so the second transaction waits. This follows two-phase locking: acquire locks as you go, release all at the end. Optimistic: add a version column and write UPDATE ... SET version = 4 WHERE id = 7 AND version = 3. If zero rows change, someone got there first, so reload and retry. A deadlock is a cycle: T1 holds A and waits for B while T2 holds B and waits for A. The database finds the cycle in its wait-for graph and aborts one victim, so your code must be ready to retry. Locking rows in a fixed order prevents most cycles.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has one MySQL 8.0 and, today, one daily user, so contention is rare and we mostly rely on single statements. Two places do take row locks on purpose. Assigning a waitlist position wraps the read of the highest position and the insert of the next one in a transaction with `lockForUpdate`, so two finishers cannot get the same place. The news-event ingest locks the existing cluster row before deciding whether a story has escalated. The live engine is a single in-process writer, which avoids many races without locks. With many users we would add more explicit locking and retries.",
      },
    ],
    complexityDerivation:
      "The invariant a transaction protects is simple: the final state must equal what some one-at-a-time ordering of the transactions would have produced. That is serializability. Every weaker level gives up a slice of that guarantee to buy throughput, because waiting and aborting are the price of a strict order. Under read committed, two transactions that overlap in time can interleave freely, so lost update and write skew are possible unless you lock or use a constraint. The argument holds when conflicts are rare: optimistic checks rarely retry, snapshots rarely clash, and locks are held for microseconds. It breaks when many transactions fight over one hot row, such as the last seat on a train. Then optimistic retries pile up, and the right design shrinks the critical section to one atomic statement, or serialises access in a queue.",
    variants: [
      {
        name: "Pessimistic locking (SELECT FOR UPDATE)",
        when: "Conflicts are likely, the critical section is short, and you want writers to queue rather than fail.",
        delta:
          "Contenders wait on the lock, so there are no retries, but a slow transaction holding a lock stalls everyone behind it and deadlocks become possible.",
      },
      {
        name: "Optimistic concurrency (version column)",
        when: "Conflicts are rare, such as one person editing a saved strategy, and you do not want to hold a lock while a user thinks.",
        delta:
          "No locks are held, but a conflicting write fails and the caller must reload and retry. Under heavy contention this turns into a retry storm.",
      },
      {
        name: "Serializable (SSI or locking)",
        when: "The rule spans several rows, such as a shared exposure limit, and you cannot name a single row to lock.",
        delta:
          "The database guarantees the one-at-a-time result and aborts transactions that could break it, so every write path needs retry logic and throughput drops under contention.",
      },
    ],
    tradeoffs: [
      {
        vs: "Higher isolation versus throughput",
        pick: "The lowest level that still protects each invariant",
        because:
          "Serializable everywhere is safe but slow and abort-prone. Most reads are fine at read committed, and only the few check-then-write paths need locks or a stricter level.",
      },
      {
        vs: "Lock a row versus an atomic statement",
        pick: "An atomic conditional UPDATE when one row decides it",
        because:
          "UPDATE seats SET free = free - 1 WHERE id = 5 AND free > 0 needs no read, so there is no window between check and write, and the lock is held for the shortest possible time.",
      },
      {
        vs: "Transaction constraint versus application check",
        pick: "A database constraint such as UNIQUE, wherever one can express the rule",
        because:
          "An application check followed by an insert races under read committed and repeatable read. A unique index is enforced by the database for every writer, including scripts you forgot.",
      },
    ],
  },
  algorithms: [
    {
      name: "MVCC snapshot visibility",
      role: "Keeps several versions of a row and shows each transaction only the versions committed before its snapshot, so readers never block writers.",
    },
    {
      name: "Two-phase locking (2PL)",
      role: "Acquires locks while a transaction runs and releases them all at commit, which makes the schedule equivalent to a one-at-a-time order.",
    },
    {
      name: "Wait-for graph cycle detection",
      role: "Finds deadlocks by looking for a cycle among transactions waiting on each other, then picks a victim to abort.",
      dsa: "dfs",
    },
    {
      name: "Optimistic version check (compare-and-set)",
      role: "Detects a lost update by making the write conditional on the version that was read.",
    },
  ],
  realWorld: [
    {
      system: "PostgreSQL serializable snapshot isolation",
      kind: "industry",
      problem:
        "Snapshot isolation allows write skew, but full two-phase locking makes readers block writers and hurts throughput.",
      applied:
        "PostgreSQL's serializable level runs on MVCC snapshots and tracks read-write dependencies between transactions. When it sees a pattern that could produce a non-serial result, it aborts one transaction with a serialization failure and the application retries.",
      evidence: "Ports and Grittner, Serializable Snapshot Isolation in PostgreSQL (VLDB 2012); PostgreSQL documentation, transaction isolation",
      impact:
        "You get true serializability without locking every read, at the cost of writing retry logic.",
    },
    {
      system: "MySQL InnoDB repeatable read and gap locks",
      kind: "industry",
      problem:
        "A transaction that scans a range wants no new rows to appear in it while it works, which is the phantom problem.",
      applied:
        "InnoDB's default is repeatable read. Plain reads use a snapshot. Locking reads such as SELECT ... FOR UPDATE take next-key locks, which cover the index records and the gaps between them, so other transactions cannot insert into the scanned range.",
      evidence: "MySQL reference manual: InnoDB locking and transaction isolation levels",
      impact:
        "Range scans with locks are safe from phantoms, but the gap locks can block unrelated inserts, which is a common cause of surprise lock waits.",
    },
    {
      system: "The ANSI levels critique and snapshot isolation",
      kind: "industry",
      problem:
        "The SQL standard defined isolation levels by which anomalies they forbid, and left out lost update and write skew, so databases with the same level name behaved differently.",
      applied:
        "Berenson and colleagues showed that snapshot isolation, used by Oracle for its serializable setting and by others, avoids dirty and non-repeatable reads yet still permits write skew, so it is not serializable.",
      evidence: "Berenson et al., A Critique of ANSI SQL Isolation Levels (SIGMOD 1995)",
      impact:
        "The lesson survives today: read the engine's documentation, because the level name alone does not tell you which anomalies are possible.",
    },
    {
      system: "Traed waitlist and news-event row locks",
      kind: "yours",
      problem:
        "Two people finishing the waitlist survey together could both read the same highest position and both be given the next number.",
      applied:
        "Assigning a place runs inside a transaction that locks the waitlisted rows with `lockForUpdate` while it reads the highest position, then saves the next one. The news-event ingest locks the existing cluster row before it decides whether severity has escalated.",
      evidence:
        "CMS/trade-server/app/Http/Controllers/PotentialCustomerSurveyController.php; CMS/trade-server/app/Http/Controllers/Api/NewsEventController.php",
      impact:
        "Positions stay unique and a story alerts once on escalation, at the cost of a short wait for the second request.",
    },
  ],
  insights: [
    {
      t: "ACID's C is yours",
      d: "The database enforces only the rules you declare as constraints. Everything else is your application's job.",
    },
    {
      t: "Read-modify-write is the danger",
      d: "Read a value, compute in code, write it back: that gap is where lost updates live. Close it with an atomic UPDATE, a lock or a version check.",
    },
    {
      t: "Snapshot is not serializable",
      d: "Repeatable read and snapshot isolation stop many anomalies but allow write skew on a rule that spans rows.",
    },
    {
      t: "Plan for the retry",
      d: "Deadlocks, serialization failures and failed version checks are normal outcomes. Code that cannot retry will fail at the worst moment.",
    },
  ],
  pitfalls: [
    "Believing that a transaction alone makes a check-then-insert safe. Under read committed and repeatable read two transactions can both pass the check.",
    "Holding a lock across a slow call, such as a broker request or a user's think time. Every other writer on that row waits for it.",
    "Setting SERIALIZABLE everywhere without retry code. The first serialization failure then reaches the user as an error.",
  ],
  quiz: [
    {
      q: "Balance is 1000. Two transactions each read 1000, subtract 100, and write 900. Both commit. What is this anomaly called?",
      options: [
        "Lost update, because one withdrawal is overwritten by the other",
        "Dirty read, because one transaction saw uncommitted data",
        "Phantom read, because a new row appeared in the result",
        "Deadlock, because both transactions waited on each other",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Both transactions read the same starting value and wrote results based on it, so the second write replaced the first. The correct final balance is 800.",
      distractors: [
        "",
        "A dirty read needs a read of data that is later rolled back. Here both values were committed.",
        "A phantom concerns a changing set of rows matching a filter, not one overwritten value.",
        "A deadlock aborts a transaction. Here both committed without any waiting.",
      ],
    },
    {
      q: "What does MVCC let a database do?",
      options: [
        "Run every transaction one after another on a single thread",
        "Keep several versions of a row so readers need not block writers",
        "Replicate each committed write to a second server automatically",
        "Avoid writing a log because changes are kept only in memory",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Each write creates a new version, and a reader sees the version that was committed when its snapshot began. So reads and writes proceed without waiting on each other.",
      distractors: [
        "That describes true serial execution, which MVCC exists to avoid.",
        "",
        "Replication is a separate feature. MVCC works inside one server.",
        "MVCC still depends on a durable log. Versions are not a substitute for it.",
      ],
    },
    {
      q: "Under read committed, a report runs SELECT SUM(qty) twice in one transaction. Another transaction inserts a row and commits between the two. What does the report see?",
      options: [
        "The same total both times, since the transaction holds a snapshot",
        "An error, because the first read locked the table",
        "Two different totals, since each statement sees newly committed rows",
        "A dirty total, because the insert was not yet committed",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Read committed takes a fresh snapshot per statement, so the second query sees the committed insert. Repeatable read would have kept the first snapshot.",
      distractors: [
        "That is repeatable read behaviour. Read committed does not keep one snapshot for the transaction.",
        "A plain read takes no table lock, so nothing blocks and nothing errors.",
        "",
        "The insert had committed before the second read, so the data is committed, not dirty.",
      ],
    },
    {
      q: "Transaction 1 updates row A then row B. Transaction 2 updates row B then row A, and they deadlock a few times a day. What is the most effective fix in code?",
      options: [
        "Raise the lock wait timeout so each transaction waits longer",
        "Move to a lower isolation level so locks are released sooner",
        "Add a second database so the two updates run apart",
        "Update rows in one agreed order everywhere, and retry on abort",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A deadlock needs a cycle. If every transaction locks A before B, no cycle can form. Retry covers the cases that remain.",
      distractors: [
        "Longer waits do not break a cycle. The database already detects it and aborts a victim.",
        "Row locks for writes are held to commit at every level, so the cycle still forms.",
        "A second database does not remove the conflict if both still write the same rows.",
        "",
      ],
    },
    {
      q: "Two workers each check that total open lots across a user's strategies is under 10 (it is 8) and each add 2 lots as a new row, under repeatable read. What can happen, and what fixes it?",
      options: [
        "Both commit and the total is 12; lock a shared per-user row or use serializable",
        "One is blocked by a row lock, so the limit holds without any change",
        "Both are rejected, because repeatable read prevents write skew",
        "Both commit and the total is 10, since snapshots add the rows safely",
      ],
      answer: 0,
      difficulty: "apply",
      why: "They insert different rows, so no row conflict is detected. This is write skew. Locking one shared row that represents the limit, or serializable, forces them into an order.",
      distractors: [
        "",
        "Different new rows do not conflict, so nobody waits.",
        "Repeatable read and snapshot isolation do not prevent write skew. That needs serializable or an explicit lock.",
        "Each sees only its own snapshot, but both inserts still land, so the total is 12, not 10.",
      ],
    },
    {
      q: "Your update is UPDATE strategies SET name = ?, version = 4 WHERE id = 7 AND version = 3 and it reports 0 rows affected. What does that mean?",
      options: [
        "The strategy was deleted, so create a new one with the same id",
        "Someone else saved first, so reload the row and retry or ask the user",
        "The database ran out of locks, so retry after a short pause",
        "The update succeeded, because zero changed rows means no error",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The WHERE clause matched no row at version 3, meaning another writer already moved it to a newer version. Optimistic concurrency reports the conflict this way.",
      distractors: [
        "A delete is possible, but the common cause is a newer version, and recreating would risk overwriting changes.",
        "",
        "Lock exhaustion raises an error. A silent zero is a conditional write that did not match.",
        "Zero rows means your change was not applied. Treating it as success would lose the edit.",
      ],
    },
    {
      q: "A team sets SERIALIZABLE on every connection to be safe. At the 09:15 rush throughput falls and many requests fail with serialization errors. What is the sound judgement?",
      options: [
        "Switch back to read uncommitted, since it never aborts anything",
        "Add more application servers to spread the aborted requests",
        "Keep serializable only on the few multi-row invariants, and retry there",
        "Remove transactions altogether so nothing can conflict or abort",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Serializable is correct but costs aborts under contention. Most paths do not need it. Use it, or an explicit lock, only where a rule spans rows, and write retry logic for those paths.",
      distractors: [
        "Read uncommitted allows dirty reads and removes protection that you needed for some paths.",
        "More servers add more contenders for the same rows, which makes conflicts more frequent.",
        "",
        "Without transactions, a crash between two writes leaves half-finished state.",
      ],
    },
    {
      q: "A developer skips a UNIQUE index on client_order_id, saying 'the insert runs in a transaction, so duplicates are impossible'. What is the right response?",
      options: [
        "Agree, since a transaction serialises all the inserts on that table",
        "Agree, provided the isolation level is repeatable read or higher",
        "Disagree only if the table has more than one million rows",
        "Disagree: add the index, as the database can then enforce it for every writer",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A check-then-insert in a transaction still races at common levels, because both transactions can pass the check. A unique index makes the database reject the second insert, whatever code path wrote it.",
      distractors: [
        "A transaction groups statements. It does not stop two transactions from passing the same check.",
        "Repeatable read keeps a snapshot, which means both transactions still see no existing row.",
        "Table size does not change the race. A small table has the same window.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-transactions-isolation-waitlist",
      scenario:
        "A small team runs one MySQL server behind a Laravel app. A landing page lets people finish a survey and then joins them to a waitlist with a visible position number, 1, 2, 3 and so on. A few hundred people sign up over a launch week, sometimes two within the same second. Positions must be unique and have no gaps. The team wants the simplest change that is correct.",
      options: [
        {
          label: "Read the highest position, add one, save, with no lock",
          appeal:
            "Three lines of code and fast. At a few signups an hour it seems fine.",
        },
        {
          label: "In a transaction, lock the waitlisted rows with FOR UPDATE, read the maximum, save the next position",
          appeal:
            "Serialises exactly the one step that must be serial, with no new infrastructure.",
        },
        {
          label: "Set the whole database to SERIALIZABLE",
          appeal:
            "One setting makes every transaction safe, so nobody needs to reason about races.",
        },
        {
          label: "Keep a counter in Redis and use INCR for the position",
          appeal:
            "INCR is atomic and extremely fast, so duplicates are impossible.",
        },
      ],
      best: 1,
      verdict:
        "Volume is tiny, so a short lock costs nothing, and the data already lives in MySQL. Locking inside a transaction fixes the one race with no new component. Unlocked read-then-write can hand out one place twice. A global serializable setting changes every query to protect one. A Redis counter adds a second store that can be evicted or restarted and then disagree with MySQL on gaps.",
      claims: [
        {
          text: "The second finisher waits briefly for the first transaction to commit, in return for a guaranteed unique position.",
          axis: "trade",
          correct: true,
          note: "True. A short wait at this volume is invisible.",
        },
        {
          text: "Using a lock means the team gives up transactions in the rest of the app.",
          axis: "trade",
          correct: false,
          note: "False. The lock is taken inside one transaction and affects only these rows.",
        },
        {
          text: "Without the lock, two concurrent signups can both read the same maximum and receive the same position.",
          axis: "failure",
          correct: true,
          note: "True. Under read committed or repeatable read both snapshots show the same highest value.",
        },
        {
          text: "If the app crashes mid-transaction, the half-saved position remains and leaves a gap.",
          axis: "failure",
          correct: false,
          note: "False. The transaction rolls back, so the position is not saved and no gap appears.",
        },
        {
          text: "A test that fires two simultaneous requests and checks for duplicate positions would reveal the missing lock.",
          axis: "measure",
          correct: true,
          note: "True. A concurrency test is the direct way to see the race.",
        },
        {
          text: "Average response time over a week will show whether the race exists.",
          axis: "measure",
          correct: false,
          note: "False. A race is rare and does not change average latency, so you need a concurrent test or a duplicate check.",
        },
      ],
    },
    {
      id: "sd-transactions-isolation-tatkal-seats",
      scenario:
        "A railway booking site opens Tatkal at 10:00. For one train and class there is a single inventory row with 72 seats left, and tens of thousands of requests arrive in the first minute, all trying to take one seat. The database is a primary with replicas. Overselling is not allowed. The team must choose how to decrement safely at this contention.",
      options: [
        {
          label: "Read the row, check seats > 0, then write seats - 1 with a version check and retry on conflict",
          appeal:
            "No locks are held, and optimistic checks are the textbook answer to lost updates.",
        },
        {
          label: "Take SELECT FOR UPDATE on the row, check in code, update, commit",
          appeal:
            "Locks give a clear queue and no retries, and the logic is easy to read.",
        },
        {
          label: "One atomic statement: UPDATE inventory SET seats = seats - 1 WHERE id = ? AND seats > 0, then check rows affected",
          appeal:
            "Check and write happen together, with the lock held for the shortest possible time.",
        },
        {
          label: "SERIALIZABLE on every booking transaction",
          appeal:
            "The database guarantees no oversell without any special statement.",
        },
      ],
      best: 2,
      verdict:
        "Every request hits the same hot row, so the design must shrink the time that row is locked and avoid retries. A single conditional UPDATE does the check and the decrement in one step, and rows affected tells you whether you got a seat. Optimistic retries would make thousands fail and retry on one row. FOR UPDATE holds the lock across application code. Serializable adds aborts to an already hot row.",
      claims: [
        {
          text: "The atomic statement removes the window between checking and writing, in return for expressing the rule inside one SQL statement.",
          axis: "trade",
          correct: true,
          note: "True. The rule is simple enough to fit in a WHERE clause.",
        },
        {
          text: "Optimistic version checks stay cheap here because conflicts are rare on a hot row.",
          axis: "trade",
          correct: false,
          note: "False. On a hot row nearly every attempt conflicts, so most work is wasted retries.",
        },
        {
          text: "With seats = 0 the statement changes no row, so the request can be told the class is full without raising an error.",
          axis: "failure",
          correct: true,
          note: "True. Zero rows affected is the sold-out signal.",
        },
        {
          text: "A read replica can safely be used to check seats > 0 before the write.",
          axis: "failure",
          correct: false,
          note: "False. A replica may lag, so the check can pass on stale data. Only the primary's statement decides.",
        },
        {
          text: "The number of seats booked must never exceed 72, and a post-sale count of confirmed bookings against inventory verifies it.",
          axis: "measure",
          correct: true,
          note: "True. The invariant can be audited directly.",
        },
        {
          text: "Throughput on this one row will scale linearly if you add more application servers.",
          axis: "measure",
          correct: false,
          note: "False. All servers still serialise on the same row lock, so the row is the bottleneck.",
        },
      ],
    },
    {
      id: "sd-transactions-isolation-exposure-limit",
      scenario:
        "A multi-user platform lets each user run up to 20 strategies. A rule says the total open exposure across a user's strategies must stay under ₹10 lakh. Each strategy's worker checks the sum and then inserts its own order row. Workers for one user can fire in the same second at the open. The database is MySQL at repeatable read. A breach is expensive, but a few retries are acceptable.",
      options: [
        {
          label: "Keep repeatable read; each worker sums exposure, then inserts if under the limit",
          appeal:
            "Snapshots are consistent, and the code is the simplest.",
        },
        {
          label: "Drop to read committed so the sum sees the latest commits",
          appeal:
            "Fresher reads should catch the other worker's order.",
        },
        {
          label: "Add a version column to each order row and check it on insert",
          appeal:
            "Optimistic checks catch conflicting writers without holding locks.",
        },
        {
          label: "Per user, lock one limit row with FOR UPDATE, then sum and insert in the same transaction",
          appeal:
            "Turns a multi-row rule into one contended row, so workers for one user run in turn.",
        },
      ],
      best: 3,
      verdict:
        "This is write skew: workers read the same sum and insert different rows, so no row conflict exists. A shared per-user lock row forces workers of the same user into an order, and other users are not affected. Repeatable read and read committed both allow the breach. A version column on new rows has nothing to conflict with, since each insert is a new row.",
      claims: [
        {
          text: "Workers for the same user run one after another, in return for a short wait at the open.",
          axis: "trade",
          correct: true,
          note: "True. The wait is the price of enforcing the limit.",
        },
        {
          text: "Locking the limit row also makes workers of different users wait for each other.",
          axis: "trade",
          correct: false,
          note: "False. The lock row is per user, so only that user's workers contend.",
        },
        {
          text: "Under repeatable read, two workers can both see 8 lakh, each add 2 lakh, and the total reaches 12 lakh.",
          axis: "failure",
          correct: true,
          note: "True. Snapshots do not see each other's uncommitted inserts, and the inserted rows are different.",
        },
        {
          text: "Switching to read committed would stop the breach because each query reads fresh data.",
          axis: "failure",
          correct: false,
          note: "False. Uncommitted inserts are still invisible, so both checks can pass in the same instant.",
        },
        {
          text: "A test that launches many workers for one user at once and asserts the final sum is under the limit would expose the gap.",
          axis: "measure",
          correct: true,
          note: "True. Write skew only shows under real concurrency.",
        },
        {
          text: "Watching average query time is enough to know whether the limit can be breached.",
          axis: "measure",
          correct: false,
          note: "False. A breach is a correctness failure, not a latency one.",
        },
      ],
    },
  ],
};

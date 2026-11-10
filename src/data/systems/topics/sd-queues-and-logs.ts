import type { Topic } from "../../types.ts";

export const sdQueuesAndLogs: Topic = {
  id: "sd-queues-and-logs",
  title: "Message queues and logs",
  tier: 5,
  week: 9,
  depth: "deep",
  summary:
    "A queue hands each job to one worker and forgets it. A log keeps every event in order so many readers can replay it. Learn partitions, offsets and retries.",
  why: "Queues and logs are how services stay apart: a slow report or a failed email must not stop an order. You need to tell a task queue from an event log, know what ordering a partition really gives you, and design for duplicates and poison messages. These ideas sit under Kafka, SQS, RabbitMQ and every job runner. Traed uses a plain Redis queue for background jobs, which is the right tool at its size.",
  learn: {
    intuition:
      "A queue is a counter at a bank with a single line. Each customer is served by whichever clerk is free, and once served they leave. Nobody can ask what happened at the counter an hour ago. A log is a ledger book with numbered pages. Every event is written on the next page and never erased for a while. Each reader keeps a bookmark with the page they have reached. The accountant reads slowly, the auditor reads from page one, and a new clerk can start from the first page, all without disturbing each other. If a reader falls behind, its bookmark simply lags. If something goes wrong in the middle of the day, you can rewind a bookmark and read the same pages again. The line gives you shared work. The book gives you shared history.",
    mechanics: [
      {
        heading: "Queue versus log",
        body: "In a queue such as Amazon SQS or RabbitMQ, a producer adds a message and a consumer takes it. Once the consumer acknowledges it, the broker deletes it, so each message is processed by one worker among many competing for it. In a log such as Kafka, messages are appended to the end and stay until a retention limit, 7 days by default in Kafka. Each reader tracks its own offset, which is simply the position of the next message to read. If the log holds offsets 0 to 9,999 and a consumer sits at 9,000, its lag is 1,000. Two readers never take messages from each other.",
      },
      {
        heading: "Partitions, keys and ordering",
        body: "One log cannot grow without limit on one machine, so Kafka splits a topic into partitions, each an ordered log on its own broker. The producer picks a partition from the message key, in effect hash(key) mod number of partitions. With 6 partitions, every message keyed `NIFTY` lands in the same one, so it is read in the order written. Order is guaranteed only inside a partition, never across them. A consumer group shares the partitions among its members, one partition per consumer at a time, so 6 partitions allow at most 6 parallel consumers. Add a seventh and it sits idle.",
      },
      {
        heading: "Delivery guarantees, retries and dead letters",
        body: "A consumer processes a message and then commits its offset, or acknowledges it. If it crashes between the two, the message is delivered again, so the default is at-least-once: nothing is lost, but duplicates happen. Exactly-once is built from at-least-once plus an idempotent consumer, one that gives the same result when it sees a message twice. SQS hides a received message for a visibility timeout, 30 seconds by default, and returns it if not deleted. After a set number of failed tries, say 5, a poison message that always crashes the consumer is moved to a dead-letter queue, so it stops blocking the rest.",
      },
      {
        heading: "Backlog, retention and when a queue is wrong",
        body: "A queue turns a spike into a backlog, which is useful until it grows without end. If messages arrive at 1,000 per second and workers finish 800, the backlog grows by 200 per second, which is 720,000 an hour. Monitor lag, not only errors. Retention sets how far back a log can replay, so a bug found after two days needs at least two days kept. A queue is the wrong tool when the caller needs an answer now, such as a price quote, when volume is tiny and a database row would do, or when strict global order across all keys is needed.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed uses a queue, not a log. Laravel dispatches background jobs onto a Redis queue that Horizon workers drain, for example option-chain collection and historical backfills, and jobs that exhaust their tries land in a MySQL `failed_jobs` table, which is its dead-letter store. Once a job is done it is gone, so there is no replay. Backtests skip the queue entirely: Laravel calls the strategy engine over HTTP, which starts a process pool. Live ticks arrive over a WebSocket, not a queue. Traed would want a log only if several independent consumers needed the same event history, which one user does not.",
      },
    ],
    complexityDerivation:
      "The guarantee a queue buys is decoupling in time and in rate. The producer finishes when the broker has the message, and the consumer works at its own speed, so a spike of arrivals becomes a wait, not a failure. The cost is that completion is no longer in the producer's hands, so a message can be lost, duplicated or delayed. A log goes further: because the data stays, a new reader or a replay costs nothing to the others. Ordering has a price. A single ordered stream cannot be spread across machines, so the log is split into partitions, and order is kept only within each. This holds while the work for one key is independent of other keys. It breaks in four cases: when a global order is needed, when a hot key sends most traffic to one partition, when consumers cannot be made idempotent, and when arrival rate stays above service rate, since then no queue is big enough and only more workers or less work will help.",
    variants: [
      {
        name: "Task queue (SQS, RabbitMQ, Laravel queues)",
        when: "Each message is a job to be done once by any worker, and nobody needs to look back at history.",
        delta:
          "Broker deletes on acknowledgement, supports per-message retries and dead-letter queues, and gives little or no ordering. Easy to run, but there is no replay.",
      },
      {
        name: "Partitioned log (Kafka)",
        when: "Many services need the same stream of events, in order per key, and must be able to re-read it.",
        delta:
          "Messages are kept by time or size, readers track offsets, and order holds per partition. More to operate, and consumers must handle duplicates and rebalances.",
      },
      {
        name: "Database table as a queue",
        when: "Volume is low, you already have a database, and you want job state saved in the same transaction as the data.",
        delta:
          "A row per job with a status column, claimed with a row lock. Fewer moving parts and transactional enqueue, but polling and locking limit throughput.",
      },
    ],
    tradeoffs: [
      {
        vs: "Queue that deletes versus log that retains",
        pick: "Queue for jobs, log for events many parties read",
        because:
          "A job needs to be done once, so deleting is right. An event such as 'order placed' is wanted by billing, search and analytics, and a replay after a bug needs it kept.",
      },
      {
        vs: "More partitions versus fewer partitions",
        pick: "Enough for expected parallelism, with room to grow",
        because:
          "Partitions cap the number of parallel consumers, since 6 partitions mean at most 6 workers in a group. Too many cost memory and slow recovery, and changing the count later re-maps keys and can break per-key order.",
      },
      {
        vs: "At-least-once versus trying for exactly-once",
        pick: "At-least-once with idempotent consumers",
        because:
          "Losing a message is usually worse than seeing it twice. A dedupe key or a conditional write makes a repeat harmless, which is simpler than distributed exactly-once coordination.",
      },
    ],
  },
  algorithms: [
    {
      name: "FIFO queue",
      role: "Gives the basic first-in, first-out order that a work queue and each partition of a log rely on.",
      dsa: "stacks-queues",
    },
    {
      name: "Hash partitioning of keys",
      role: "Maps a message key to a partition with hash(key) mod partitions, so all messages for one key stay in order together.",
      dsa: "hashing",
    },
    {
      name: "Sparse offset index with binary search",
      role: "Lets a log find the file position of any offset quickly without indexing every message.",
      dsa: "binary-search",
    },
    {
      name: "Exponential backoff with jitter",
      role: "Spaces out retries of failed messages with random variation, so a recovering system is not hit by a synchronised wave.",
    },
  ],
  realWorld: [
    {
      system: "Apache Kafka at LinkedIn",
      kind: "industry",
      problem:
        "Activity events such as page views and searches had to reach many systems, in bulk, and be re-readable.",
      applied:
        "LinkedIn built Kafka as a partitioned, replicated commit log. Producers append to topic partitions, and consumer groups read at their own offsets, with data retained for a set time.",
      evidence: "Kreps, Narkhede, Rao, Kafka: a Distributed Messaging System for Log Processing (NetDB 2011)",
      impact:
        "Many consumers read the same stream independently, and a new consumer can start from the oldest retained message.",
    },
    {
      system: "Amazon SQS",
      kind: "industry",
      problem:
        "Services need a managed queue that survives worker crashes without a broker to run.",
      applied:
        "SQS delivers standard-queue messages at least once, hides a received message during a visibility timeout, and moves a message to a dead-letter queue after a configured number of receives. FIFO queues add ordering per message group.",
      evidence: "Amazon SQS Developer Guide: visibility timeout, dead-letter queues, FIFO queues",
      impact:
        "A crashed worker's message reappears for another worker, and poison messages are set aside instead of looping.",
    },
    {
      system: "RabbitMQ acknowledgements",
      kind: "industry",
      problem:
        "A broker must not lose a message if a consumer dies mid-task, and must not let one slow consumer hog the work.",
      applied:
        "RabbitMQ holds a delivered message as unacknowledged until the consumer acks it, and re-queues it if the connection drops. A prefetch limit caps how many unacknowledged messages one consumer holds. Rejected messages can be routed to a dead-letter exchange.",
      evidence: "RabbitMQ documentation: consumer acknowledgements, prefetch, dead letter exchanges",
      impact:
        "Work is shared fairly, and a failed task goes back to the queue or to a dead-letter exchange.",
    },
    {
      system: "LMAX exchange architecture",
      kind: "industry",
      problem:
        "A trading venue must process orders in one agreed sequence and rebuild its state exactly after a crash.",
      applied:
        "The published LMAX design writes every input event to a journal before processing, runs business logic on a single thread over a ring buffer, and rebuilds state by replaying the journal. The input log is the source of truth.",
      evidence: "Martin Fowler, The LMAX Architecture (martinfowler.com)",
      impact:
        "Replaying the same events gives the same state, which makes recovery and testing predictable.",
    },
  ],
  insights: [
    {
      t: "A queue shares work, a log shares history",
      d: "A queue deletes a message once one worker finishes it. A log keeps it, and each reader holds its own offset.",
    },
    {
      t: "Order lives inside a partition",
      d: "Key the messages that must stay in order. hash(key) mod partitions sends them to the same place, and 6 partitions allow at most 6 parallel consumers.",
    },
    {
      t: "Plan for duplicates",
      d: "Commit after processing gives at-least-once. Make consumers idempotent, and send poison messages to a dead-letter queue after a few tries.",
    },
    {
      t: "Watch lag, not just errors",
      d: "If arrivals exceed service rate by 200 a second, the backlog grows by 720,000 an hour with no error ever logged.",
    },
  ],
  pitfalls: [
    "Assuming a topic is globally ordered. Only a single partition keeps order, so messages with different keys can be read in any interleaving.",
    "Retrying a poison message for ever. It blocks a partition or burns workers, so cap the tries and park it in a dead-letter queue with an alert.",
    "Using a queue for a request that needs an answer now. The caller then waits on a callback or polls, adding delay and failure paths that a direct call would not have.",
  ],
  quiz: [
    {
      q: "What mainly separates a log such as Kafka from a classic work queue such as SQS?",
      options: [
        "A log keeps messages after they are read, and each reader tracks its own offset",
        "A log is always faster because it stores messages in memory only",
        "A log delivers each message exactly once and a queue cannot",
        "A log can have only one reader and a queue can have many",
      ],
      answer: 0,
      difficulty: "recall",
      why: "A log retains messages for a set time, and each consumer group keeps its own position. A work queue deletes a message once a worker acknowledges it.",
      distractors: [
        "",
        "Kafka writes to disk and relies on the operating system cache. Retention on disk is the point.",
        "Neither gives free exactly-once. Both default to at-least-once.",
        "It is the other way: many independent readers are a main reason to choose a log.",
      ],
    },
    {
      q: "A Kafka topic has 6 partitions. A consumer group has 8 consumers. How many consumers read at the same time?",
      options: [
        "8, since each consumer can share a partition",
        "6, since a partition goes to one consumer in the group",
        "4, since the group splits the partitions evenly",
        "1, since the group elects a single active reader",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Within a group each partition is assigned to one consumer at a time, so 6 partitions allow at most 6 active consumers. The other 2 stay idle until a rebalance.",
      distractors: [
        "Two consumers in one group do not share a partition. That would break the order inside it.",
        "",
        "There is no rule that halves the partitions. The limit is one consumer per partition.",
        "Groups spread partitions across members. Only one consumer reads at a time in an exclusive, single-active setup, which is not the default.",
      ],
    },
    {
      q: "Orders for each customer must be processed in the order placed, while different customers can run in parallel. Which key should the producer set?",
      options: [
        "A random value per message, to balance the load evenly",
        "The order timestamp, so the newest orders are read first",
        "The customer id, so each customer's orders share a partition",
        "The same fixed key for every order, to keep one clear order",
      ],
      answer: 2,
      difficulty: "apply",
      why: "hash(customer id) mod partitions puts all of one customer's orders in one partition, which keeps their order, and different customers spread across partitions for parallel work.",
      distractors: [
        "Random keys scatter one customer's orders across partitions, so their order is lost.",
        "Timestamps are nearly unique, so they scatter the orders and do not group them by customer.",
        "",
        "A single key sends everything to one partition and gives up all parallelism.",
      ],
    },
    {
      q: "A consumer reads a payment event, credits a wallet, and crashes before committing its offset. On restart it reads the event again. What protects the wallet?",
      options: [
        "Switching the topic to exactly-once delivery inside the broker alone",
        "A shorter retention period, so old events disappear sooner",
        "More partitions, so the restart reads a different event",
        "An idempotency key on the credit, so a repeat has no effect",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Committing after processing means a crash causes a re-delivery. An idempotent credit, keyed by the payment id, makes the second attempt harmless.",
      distractors: [
        "The broker cannot know whether your wallet was already credited. The effect must be idempotent.",
        "Retention does not control re-delivery after a crash.",
        "Partitions do not change which event the consumer resumes from. It resumes at the last committed offset.",
        "",
      ],
    },
    {
      q: "Messages arrive at 500 per second. Each of 4 workers handles 100 per second. About how many messages are waiting after 10 minutes?",
      options: [
        "None, since four workers can share the work",
        "60,000, since 100 more arrive each second than are handled",
        "120,000, since 200 more arrive each second than are handled",
        "300,000, since all 500 per second are queued",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Service capacity is 4 times 100, which is 400 per second, against 500 arriving. The backlog grows 100 per second, so after 600 seconds it is 60,000.",
      distractors: [
        "Four workers handle only 400 per second, so they fall behind a 500 per second stream.",
        "",
        "The growth is 500 minus 400, which is 100 per second, not 200. That makes 60,000 in 600 seconds.",
        "Workers do drain 400 per second, so not all arrivals pile up.",
      ],
    },
    {
      q: "A service sends an SMS one-time code when a user logs in, and the user waits on screen. Is a message queue a good fit for that exact step?",
      options: [
        "Yes, since a queue always makes every step of a flow faster",
        "Yes, because queues guarantee delivery within about a second",
        "No, since queues cannot carry text messages of this kind at all",
        "Only as a back-up: send directly, and use a queue for retries",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A user is waiting, so the first send should be direct and fast. A queue is useful behind it for retries or fallback, but it adds delay if it sits on the only path.",
      distractors: [
        "A queue adds a hop and a wait, so it can make a user-facing step slower.",
        "Queues give no latency bound. Backlog can add delay with no error.",
        "A queue can carry any payload. The issue is delay, not content.",
        "",
      ],
    },
    {
      q: "A team uses Kafka for 300 nightly report emails for one small app, and says it needs a three-broker cluster. What is the sound judgement?",
      options: [
        "Reasonable, since Kafka is the standard choice for every queue",
        "Required, because only a log can retry a failed email send",
        "Over-built; a plain job queue or table does it with far less to run",
        "Reasonable, as long as the topic has exactly one partition",
      ],
      answer: 2,
      difficulty: "judge",
      why: "300 jobs a night needs no partitioned log. A simple task queue or a table with a status column gives retries and failure records with far less to operate.",
      distractors: [
        "Being standard in big systems does not make it right at this volume.",
        "Task queues retry failed jobs too. Retries are not unique to logs.",
        "",
        "One partition does not remove the three-broker cluster to be run and watched.",
      ],
    },
    {
      q: "A topic has 3 partitions and a group of 3 consumers, each at its limit, and keys are customer ids. Traffic will double. What is the sound plan?",
      options: [
        "Add partitions and consumers together, and accept that keys re-map to new partitions",
        "Add 3 more consumers to the group and leave the partition count alone",
        "Switch to one partition so that the order is simpler to keep",
        "Raise the retention period so that the extra data is kept longer",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Parallelism is capped by partitions. To double throughput you need more partitions and more consumers, and since hash(key) mod partitions changes, per-key order across the change needs care.",
      distractors: [
        "",
        "With 3 partitions, only 3 consumers in a group can be active. The extra 3 would sit idle.",
        "One partition removes all parallelism, which is the opposite of what is needed.",
        "Retention affects how long data is kept, not how fast it is consumed.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-queues-and-logs-festival-orders",
      scenario:
        "An Indian online marketplace handles 40,000 order events per second at the peak of a festival sale. Billing, inventory, search, fraud scoring and a data warehouse all need every order event. Events for one order must be processed in order: placed, paid, shipped. A bug in fraud scoring last month meant the team wished it could re-run two days of events. What should carry the order events?",
      options: [
        {
          label: "A partitioned log keyed by order id, with one consumer group per downstream service and a retention of several days",
          appeal: "Keeps order per order id, lets each service read at its own pace, and allows replay.",
        },
        {
          label: "One work queue that every service pulls from",
          appeal: "Simple, and each message is handled once.",
        },
        {
          label: "Direct synchronous calls from the order service to each downstream service",
          appeal: "No broker to run, and the caller sees every failure at once.",
        },
        {
          label: "A database table of events that each service polls every second",
          appeal: "Uses a database the team already has, and events are saved with the order.",
        },
      ],
      best: 0,
      verdict:
        "Five consumers need the same events, per-order ordering matters, and replay is a stated need, which together describe a partitioned log. A shared work queue would give each event to only one service. Synchronous calls would let a slow warehouse stall checkout. A polled table could not sustain 40,000 events per second across five readers.",
      claims: [
        {
          text: "You accept running and sizing a broker cluster, in return for independent readers and replay.",
          axis: "trade",
          correct: true,
          note: "True. A log is heavier to operate than a simple queue, and that is its cost.",
        },
        {
          text: "Keying by order id keeps one order's events in sequence while different orders run in parallel.",
          axis: "trade",
          correct: true,
          note: "True. Order holds inside a partition, and order id spreads load across partitions.",
        },
        {
          text: "You get a single global order for all 40,000 events per second.",
          axis: "trade",
          correct: false,
          note: "Order holds only within a partition. Different orders may be read in any interleaving.",
        },
        {
          text: "If consumers commit offsets before processing and then crash, events can be lost for that service.",
          axis: "failure",
          correct: true,
          note: "True. Commit after processing for at-least-once, and make consumers idempotent.",
        },
        {
          text: "A slow warehouse consumer will slow down checkout, as all readers share one pace.",
          axis: "failure",
          correct: false,
          note: "Each group reads at its own offset. The warehouse lags alone.",
        },
        {
          text: "Alert on consumer lag per group, with time-to-drain, and watch the busiest partition's share.",
          axis: "measure",
          correct: true,
          note: "True. Lag shows who is behind, and a skewed partition reveals a hot key.",
        },
        {
          text: "Total messages stored on disk shows whether the fraud service is keeping up.",
          axis: "measure",
          correct: false,
          note: "Disk use is about retention. Keeping up is shown by consumer lag.",
        },
      ],
    },
    {
      id: "sd-queues-and-logs-small-jobs",
      scenario:
        "A two-person team runs a platform on one server with Laravel and a Redis instance already in use. About 200 background jobs a day need to run: reports, emails, a nightly data import. Jobs sometimes fail on a bad network call and should retry a few times, then be recorded for a human to look at. Nobody else needs to read these jobs. What should they use?",
      options: [
        {
          label: "A Kafka cluster with three brokers",
          appeal: "Industry standard, durable, and scales to any future volume.",
        },
        {
          label: "A hand-written loop that calls each job inline during the web request",
          appeal: "No infrastructure, and failures show up immediately.",
        },
        {
          label: "The framework's job queue on the Redis they already run, with a retry limit and a failed-jobs table",
          appeal: "Built in, near zero extra operations, and covers retry and failure records.",
        },
        {
          label: "A managed streaming service with multiple regions",
          appeal: "Removes the need to run any broker themselves.",
        },
      ],
      best: 2,
      verdict:
        "At 200 jobs a day, one reader and a team of two, the winner is the least machinery that gives retries and a failure record. The framework queue on existing Redis does that. Kafka or a multi-region stream add cost and operations with no matching need, and running jobs inline in a web request makes users wait and lose work on a timeout.",
      claims: [
        {
          text: "You accept that finished jobs are gone, so there is no replay of history.",
          axis: "trade",
          correct: true,
          note: "True. That is the right cost here, because nobody needs to re-read old jobs.",
        },
        {
          text: "You gain very little extra to operate, since the queue uses a Redis the team already runs.",
          axis: "trade",
          correct: true,
          note: "True. Operations burden is the main thing a small team must save.",
        },
        {
          text: "A queue on Redis gives the same replay and multi-reader features as Kafka.",
          axis: "trade",
          correct: false,
          note: "A work queue removes finished jobs and has one logical consumer set. A log is what retains and replays.",
        },
        {
          text: "If Redis restarts without persistence, queued jobs that had not run may be lost, so important jobs need a way to be re-created.",
          axis: "failure",
          correct: true,
          note: "True. Queue durability depends on how Redis is configured, so critical work should be re-derivable from the database.",
        },
        {
          text: "A job that retries without a limit is safe, as it eventually succeeds.",
          axis: "failure",
          correct: false,
          note: "A poison job can loop for ever. A retry cap and a failed-jobs record bound the damage.",
        },
        {
          text: "Watch the count of failed jobs and the age of the oldest waiting job.",
          axis: "measure",
          correct: true,
          note: "True. Together they show stuck work and a growing backlog.",
        },
        {
          text: "Redis memory use is the best sign the jobs are healthy.",
          axis: "measure",
          correct: false,
          note: "Memory use says little about whether jobs finish.",
        },
      ],
    },
    {
      id: "sd-queues-and-logs-poison-message",
      scenario:
        "A UPI-style wallet service consumes payment events from a partitioned topic. One malformed event makes the consumer throw an exception. The consumer retries immediately, forever, so the one partition it sits on stops moving. Payments behind it are delayed by minutes, and lag alarms are firing. The team wants to fix this without losing the bad event, which a developer wants to inspect. What is the best design change?",
      options: [
        {
          label: "Drop any event that throws an error and carry on",
          appeal: "Unblocks the partition at once.",
        },
        {
          label: "Retry a bounded number of times with backoff, then move the event to a dead-letter topic with an alert and carry on",
          appeal: "Unblocks the partition, keeps the event for inspection, and handles short outages by retrying.",
        },
        {
          label: "Increase the retry rate so the event gets through faster",
          appeal: "More attempts per second look like a quicker fix for a transient fault.",
        },
        {
          label: "Delete the topic and recreate it empty",
          appeal: "Clears the blockage for certain.",
        },
      ],
      best: 1,
      verdict:
        "A permanent error will never succeed on retry, so unbounded retries only block the partition. A bounded retry with backoff survives a short outage, and a dead-letter topic keeps the event for a developer. Dropping silently loses money events. Retrying faster does not help a permanent fault, and deleting the topic destroys every unprocessed payment.",
      claims: [
        {
          text: "You accept that the poisoned event is processed late, by a person, and that later events for the same key may be handled before it.",
          axis: "trade",
          correct: true,
          note: "True. Skipping ahead trades strict per-key order for progress, so a dependent event may need a manual fix.",
        },
        {
          text: "You gain bounded delay: other payments on the partition wait only for the retry limit, not for ever.",
          axis: "trade",
          correct: true,
          note: "True. That is the point of the cap.",
        },
        {
          text: "A dead-letter topic fixes the bug in the consumer code that rejected the event.",
          axis: "trade",
          correct: false,
          note: "It only parks the event. Someone still has to fix the code and re-drive the event.",
        },
        {
          text: "If events are dead-lettered without an alert, payments can stay unprocessed and nobody notices.",
          axis: "failure",
          correct: true,
          note: "True. A dead-letter queue nobody watches is just a slow way to lose data.",
        },
        {
          text: "Retrying without backoff is safe, as the service will just succeed sooner.",
          axis: "failure",
          correct: false,
          note: "Immediate retries can overload a struggling dependency and do nothing for a permanent error.",
        },
        {
          text: "Track the dead-letter count, its oldest event age, and partition lag before and after.",
          axis: "measure",
          correct: true,
          note: "True. Lag shows the block is gone, and the dead-letter figures show what still needs a person.",
        },
        {
          text: "The number of successful payments overall shows whether the poison event was handled.",
          axis: "measure",
          correct: false,
          note: "A large success count can hide one stuck partition or an unhandled dead-letter backlog.",
        },
      ],
    },
  ],
};

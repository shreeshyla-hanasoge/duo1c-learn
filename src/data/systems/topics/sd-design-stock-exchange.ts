import type { Topic } from "../../types.ts";

export const sdDesignStockExchange: Topic = {
  id: "sd-design-stock-exchange",
  title: "Design a stock exchange",
  tier: 10,
  week: 20,
  depth: "deep",
  summary:
    "A stock exchange is one ordered stream of events feeding a single-threaded matcher. Learn the gateway, sequencer, engine and feed, and why replay makes it safe.",
  why: "An exchange looks like the hardest system there is, yet its core is small: one agreed order of events and one thread that applies them. Understanding why shows you event sourcing, determinism, partitioning by key and the cost of locks in the one place they matter most. It is also the counterparty of every broker and algo platform, so you can reason about what your own orders meet at the other end. Traed is on the client side of this design and does not match anything itself.",
  learn: {
    intuition:
      "Imagine an auction hall with one clerk at the front. People shout their orders from all over the room, but they first pass a doorman who turns away anything silly, such as a price ten times too high. Then every accepted shout gets a numbered ticket at a single window, so there is never any argument about who was first. The clerk takes tickets in number order and does one thing at a time: match the new order against the standing ones, then call out the result. A scribe writes every ticket in a book. If the clerk faints, a second clerk reads the book from the start, in order, and ends up with exactly the same state, because the same tickets in the same order always give the same result. The design is not clever parallelism. It is one order, one worker, one book, and a record that can be replayed.",
    mechanics: [
      {
        heading: "Step 1: requirements and rough numbers",
        body: "Functional needs: accept new, cancel and replace messages; match them; report fills to the owner; publish the book and trades to everyone. The hard non-functional needs are fairness (one agreed order of arrival), determinism, low and predictable latency, and no loss of an acknowledged order. Take an illustrative target of 1 lakh messages a second, and ten times that in the first seconds after the open. Most messages are cancels and replaces, not trades. If matching one message takes 10 microseconds, one thread handles 1 lakh a second. At 1 microsecond it handles 10 lakh. The LMAX exchange has published a single business-logic thread doing about six million simple orders a second.",
      },
      {
        heading: "Step 2: messages and data model",
        body: "There is no web API here. Members send binary messages, often over FIX or an exchange's own protocol: `NewOrder(client_order_id, symbol, side, type, qty, price)`, `Cancel`, `Replace`. The engine answers with `Ack`, `Reject` and `ExecutionReport`, and the feed carries book updates and trades. Prices are integers in ticks, never floating point, so 100.05 is 10005 paise and two prices compare exactly. An order is `(order_id, symbol, side, price, qty_remaining, seq)`. The book per symbol has two sorted sets of price levels, and each level holds a first-in-first-out queue of orders. A hash map from `order_id` to the order lets a cancel find it in one step.",
      },
      {
        heading: "Step 3: the high-level design",
        body: "Four stages in a line. The gateway authenticates the member, validates the message and runs pre-trade risk checks. The sequencer stamps each accepted message with the next number, writes it to a journal and copies it to a standby. The matching engine reads the stream in number order, updates the in-memory book and emits events. The market-data publisher turns those events into a public feed with its own sequence numbers, plus a snapshot channel for latecomers. Symbols are split across several engines, each owning its own symbols. A standby engine reads the same journal and holds the same state, ready to take over.",
      },
      {
        heading: "Step 4: the hard part, one order and one thread",
        body: "Locks seem the way to use many cores: let threads match different orders at once. But then the order of two near-simultaneous orders depends on thread timing, which is neither fair nor repeatable. So the engine is a pure function: new state equals apply(old state, next event). One thread, no locks, all data in memory. Replaying the journal from the start rebuilds the book exactly, and a standby that applies the same events holds the same state. To scale, partition by symbol, since books are independent. A cancel costs one hash lookup and a list removal. Pre-trade risk sits before the sequencer: price bands, quantity caps and per-member limits, so a bad message never takes a sequence number.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed is on the other side of this design. It sends orders to a broker, who forwards them to the exchange, and it never matches anything. Its nearest echoes are small. The engine runs live and paper execution in a single process with one event loop, so its strategy state has one writer. Orders it sends obey exchange rules it does not control, such as a per-order quantity freeze on NIFTY. A one-server platform needs none of the exchange machinery, and would only think about a sequencer and journal if it built a venue, such as an internal crossing book for several users.",
      },
    ],
    complexityDerivation:
      "The invariant is that every participant sees the same history, and that the history produces one outcome. A single sequence number per message gives the history. A deterministic engine turns that history into state, so the same journal always gives the same book, which is why a standby, an audit and a bug reproduction all work by replay. Speed comes from removing waiting, not adding threads. With the book in memory and one thread, there are no locks, no disk read and no cache misses from contention, so a message costs microseconds, and cost per message times arrival rate sets the load on the thread. If that product nears one second of work per second, split symbols across engines. The argument weakens in three places. A product that spans symbols, such as a calendar spread, needs both books in one engine or a coordination step. A journal write on the critical path adds latency, so it is batched and replicated. And fairness depends on the gateway: a member with a faster network link reaches the sequencer first, which is why exchanges publish colocation rules.",
    variants: [
      {
        name: "Continuous matching, one engine per symbol group",
        when: "Equities and derivatives such as NSE cash and F&O, where orders trade the instant a match exists.",
        delta:
          "The design above. Each engine owns a group of symbols, and the sequencer numbers messages per group. Cross-symbol products need extra care.",
      },
      {
        name: "Batch auction",
        when: "Opening and closing sessions, illiquid stocks, and venues that want to remove the speed race.",
        delta:
          "Orders are collected for a window and matched at one price. Sequence matters less inside the window, so fairness is easier and a latency edge is worth little, but trading is not continuous.",
      },
      {
        name: "Active-active replicas with consensus on the order",
        when: "A venue that must survive a site loss without a pause and accepts extra milliseconds.",
        delta:
          "The sequencer is replicated with a protocol such as Raft, so a majority has each message before it is matched. The cost is the round trip to the majority on every message.",
      },
    ],
    tradeoffs: [
      {
        vs: "Many threads with locks versus one thread per partition",
        pick: "One thread per partition, split by symbol",
        because:
          "Locks add waiting and make the order of events depend on timing, which breaks replay and fairness. One thread removes both problems, and the price is that one symbol cannot use more than one core.",
      },
      {
        vs: "Risk checks inside the engine versus in the gateway",
        pick: "Stateless checks in the gateway, with credit tracking fed by fills",
        because:
          "Price bands, size caps and rate limits need no book, so a bad message is stopped before it takes a sequence number or engine time. Checks that depend on fills, such as credit used, need a feedback path and may lag by a few messages.",
      },
      {
        vs: "A database for orders versus an in-memory book with a journal",
        pick: "An in-memory book, with an append-only journal as the record",
        because:
          "A database commit per message costs milliseconds and locks rows. An append-only log written in batches is fast and is also the record to replay. Recovery takes longer, so periodic snapshots shorten the replay.",
      },
    ],
  },
  algorithms: [
    {
      name: "Sorted price levels (balanced tree or sorted map)",
      role: "Keeps bid and ask prices in order so the best price is found immediately and a new level is inserted in logarithmic time.",
      dsa: "balanced-trees",
    },
    {
      name: "FIFO queue per level with an order-id hash map",
      role: "Gives time priority inside a price, and lets a cancel locate and unlink an order in constant time.",
      dsa: "linked-lists",
    },
    {
      name: "Ring buffer between stages",
      role: "Passes events from gateway to sequencer to engine without locks or allocation, which is the heart of the LMAX Disruptor.",
      dsa: "ring-buffers",
    },
    {
      name: "Sequenced journal and replay",
      role: "Assigns one total order to all messages and rebuilds any engine, standby or test by applying the same events again.",
    },
  ],
  realWorld: [
    {
      system: "LMAX Exchange and the Disruptor",
      kind: "industry",
      problem:
        "A retail foreign-exchange venue needed very high throughput and low, steady latency, and found that locks and queues between threads were the bottleneck.",
      applied:
        "LMAX built its business logic as one thread working in memory, fed by ring buffers, with every input journalled so state can be rebuilt by replay. Martin Fowler's article on the LMAX architecture reports roughly six million orders a second on that single thread.",
      evidence: "Martin Fowler, The LMAX Architecture; LMAX Disruptor technical paper",
      impact:
        "It is the best-known public proof that one thread plus an event log beats multi-threaded locking for this workload.",
    },
    {
      system: "NSE order controls and market protections",
      kind: "industry",
      problem:
        "A mistyped or runaway order must not distort a national market or move an index.",
      applied:
        "NSE publishes controls such as price bands that stop orders far from a reference price, quantity freeze limits that reject oversized orders, and market-wide circuit breakers. Brokers add their own checks before orders reach the exchange. The exact engine internals are not public.",
      evidence: "NSE circulars and market-protection documentation: price bands, quantity freeze, circuit filters",
      impact:
        "Bad orders are stopped by simple rules at the edge, long before they could consume matching time.",
    },
    {
      system: "Nasdaq ITCH market data",
      kind: "industry",
      problem:
        "Thousands of subscribers need the same book updates in the same order, and a slow subscriber must not slow the exchange.",
      applied:
        "Nasdaq publishes the specification of ITCH, a binary feed of messages such as add order, execute and delete, each carrying a sequence number. Subscribers detect a gap from the numbers and recover from a separate retransmission or snapshot service.",
      evidence: "Nasdaq TotalView-ITCH specification",
      impact:
        "The engine never waits for subscribers. Gaps are the subscriber's problem to detect and repair.",
    },
    {
      system: "Traed live orders seen from the client side",
      kind: "yours",
      problem:
        "Traed sends orders into an exchange it does not control, which enforces its own limits and answers asynchronously.",
      applied:
        "The live-readiness register records that NSE freeze limits (about 1,800 units for NIFTY at the time) must cap the sized quantity, with the cap fixed and slicing still open. It also records a fixed defect where a mis-read success response made real placements retry into duplicate orders.",
      evidence: "docs/live-readiness.md (LR-03 and LR-09)",
      impact:
        "It shows what the exchange's gateway checks and acknowledgements look like to a client, and why a retry must be safe.",
    },
  ],
  insights: [
    {
      t: "One order of events is the design",
      d: "A sequencer gives each message a number. Everything else, matching, feeds, standby and audit, follows that order.",
    },
    {
      t: "Single thread, no locks",
      d: "The engine is apply(state, event). With the book in memory, one thread can do millions of simple messages a second and always gives the same result.",
    },
    {
      t: "Replay is recovery and testing",
      d: "A standby or a bug reproduction applies the same journal and reaches the same book. Snapshots shorten the replay.",
    },
    {
      t: "Scale by partitioning symbols",
      d: "Books are independent, so each engine owns a group of symbols. Products that span symbols are the hard exception.",
    },
  ],
  pitfalls: [
    "Putting a database commit on the path of every order. Milliseconds per message cap throughput far below what an in-memory engine reaches.",
    "Letting the matcher wait for slow market-data subscribers. Publish with sequence numbers and let them recover from a snapshot.",
    "Using floating-point prices. Rounding makes two equal prices compare unequal, and price-time priority breaks.",
  ],
  quiz: [
    {
      q: "What is the job of the sequencer in an exchange?",
      options: [
        "To match buy orders against sell orders at the best price",
        "To check that a member has enough money to place an order",
        "To give every accepted message one place in a single total order",
        "To send the final prices to the clearing house at close",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The sequencer stamps each accepted message with the next number and journals it. All later stages, matching, feeds and replay, follow that one order, so fairness is defined by it.",
      distractors: [
        "Matching is done by the engine, which reads messages in the sequencer's order.",
        "Credit and price checks belong to the gateway's pre-trade risk, before sequencing.",
        "",
        "Sending trades for clearing is a later stage that does not decide order.",
      ],
    },
    {
      q: "Why is the matching engine for a set of symbols usually a single thread?",
      options: [
        "One thread gives a single order of events, so the result is deterministic and needs no locks",
        "A single thread always runs faster than several threads on any workload",
        "Exchanges have not been able to use more than one processor core",
        "Several threads would make it impossible to store orders in memory",
      ],
      answer: 0,
      difficulty: "recall",
      why: "With many threads, the order of near-simultaneous orders would depend on timing, which is unfair and cannot be replayed. One thread per partition removes that, and avoiding locks also removes waiting.",
      distractors: [
        "",
        "It is not faster in general. It is faster for this workload because it avoids lock contention.",
        "Exchanges use many cores, by running one thread per symbol partition.",
        "Memory can be shared by threads. The reason is order and repeatability.",
      ],
    },
    {
      q: "A member's algo sends a buy of 5 lakh shares at ten times the last price. Where is it best stopped?",
      options: [
        "In the matching engine, after it has tried to match against asks",
        "By the surveillance team, in a report after the close",
        "At the market-data publisher, before the order is shown to others",
        "In the gateway, with a price-band and quantity check before sequencing",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Price bands and size caps need no book, so the gateway can reject the message before it takes a sequence number or any engine time. Later checks come after the damage may be done.",
      distractors: [
        "By then the order may already have traded against real asks.",
        "A report after the close is detection, not prevention.",
        "The publisher shows events; it does not decide whether an order is allowed.",
        "",
      ],
    },
    {
      q: "The primary engine crashed after processing message 5,000,120. The journal holds messages up to 5,000,130. The standby had applied up to 5,000,125. What does the standby do before taking over?",
      options: [
        "Start again from message 1 and ignore its own state",
        "Apply messages 5,000,126 to 5,000,130 from the journal, then take over",
        "Ask each member to resend its orders from the last five minutes",
        "Take over at once and treat messages 126 to 130 as lost",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Because the engine is deterministic, applying the remaining journal entries in order brings the standby to exactly the state the primary would have had. Members' acknowledged orders are not lost.",
      distractors: [
        "Replay from the start would work but is slow. The standby only needs the part it has not applied.",
        "",
        "Members cannot be asked to reconstruct state. The journal is the record, and resends could duplicate orders.",
        "Dropping acknowledged messages would break the promise that an acknowledged order is never lost.",
      ],
    },
    {
      q: "A book has 1 lakh resting orders across 40 price levels. A member cancels one by its order id. Which structure makes the cancel constant time?",
      options: [
        "A hash map from order id to the order in its level's linked list",
        "A scan down the sorted levels until the id is found",
        "A binary search of all orders sorted by arrival time",
        "A database query on the order table with an index on the id",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The map finds the order node in one step, and a doubly linked list lets it be unlinked without scanning. Cancels are the most common message, so this path must be cheap.",
      distractors: [
        "",
        "A scan could touch thousands of orders, and cancels are the majority of messages.",
        "Binary search on time is logarithmic, not constant, and time order is not what the id carries.",
        "A database round trip costs milliseconds, which is far too slow on the matching path.",
      ],
    },
    {
      q: "Matching one message takes 4 microseconds. Peak traffic for a group of symbols is 5 lakh messages a second. What follows?",
      options: [
        "One thread is enough, since 4 microseconds is very fast",
        "Add a lock around the book and use four threads on it",
        "Move the book to a database so that it can scale out",
        "Split the symbols across several engines, each single-threaded",
      ],
      answer: 3,
      difficulty: "apply",
      why: "5 lakh messages at 4 microseconds each is 2 seconds of work per second, which one thread cannot do. Books are independent, so partitioning symbols keeps every thread single and lock-free.",
      distractors: [
        "The arithmetic says one thread would need 200 percent of its time.",
        "Locks bring back waiting and unrepeatable ordering on one book.",
        "A database is much slower per message and does not help the order problem.",
        "",
      ],
    },
    {
      q: "A market-data subscriber is slow and its connection backs up. What should the exchange do?",
      options: [
        "Pause matching until the slow subscriber has caught up with the feed",
        "Keep publishing with sequence numbers and let the subscriber recover from a snapshot",
        "Drop the slowest subscriber's orders from the book to be fair to the others",
        "Slow the feed to the speed of the slowest subscriber so that none miss anything",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A slow consumer must never slow matching or the other subscribers. Sequence numbers let it notice a gap, and a snapshot or retransmission channel lets it recover.",
      distractors: [
        "Pausing the engine would let one subscriber harm every member.",
        "",
        "Orders and market data are separate. Removing orders for a slow reader would be unfair and wrong.",
        "That makes the whole market as slow as its worst connection.",
      ],
    },
    {
      q: "Two engineers build a paper-trading venue for 50 users on one server and propose Kafka, several matcher services and a sharded database. What is the sound judgement?",
      options: [
        "Approve it, because every exchange needs a distributed log",
        "Approve it, but replace Kafka with a single database table of orders",
        "Reject it: one process with an in-memory book and an append-only log is enough",
        "Reject it, and use one lock per order so that many threads can match at once",
      ],
      answer: 2,
      difficulty: "judge",
      why: "50 users generate a tiny message rate. One thread with an in-memory book handles it with huge headroom, and an append-only file gives replay. Distribution adds failures and no needed speed.",
      distractors: [
        "Real exchanges are single-threaded cores with journals. A distributed log is a choice for scale or for availability, not a requirement.",
        "A table with row locks adds commit latency and removes the simple single order.",
        "",
        "Per-order locks bring contention and nondeterministic ordering for no gain at this volume.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-stock-exchange-open-surge",
      scenario:
        "A national exchange runs about 2,000 symbols. In the first seconds after the open, traffic reaches 10 lakh messages a second, three quarters of them cancels and replaces. A few index-linked stocks take a large share. Members demand that an order that arrived first is always matched first, and that a failure never loses an acknowledged order. Matching one message takes about 2 microseconds. Which core design fits?",
      options: [
        {
          label: "A sequencer in front of several single-threaded in-memory engines, each owning a group of symbols, with a replicated journal and a hot standby per engine",
          appeal: "One order per partition, no locks, and a standby that replays the same journal.",
        },
        {
          label: "A multi-threaded engine with a lock on each price level so many threads can match at once",
          appeal: "It uses all cores on every symbol, including the busiest.",
        },
        {
          label: "A relational database where each order is a row and matching is a transaction",
          appeal: "Durable by default and familiar to every engineer.",
        },
        {
          label: "Stateless matcher services behind a load balancer, with the book held in Redis",
          appeal: "Scales out easily and failed services can be replaced.",
        },
      ],
      best: 0,
      verdict:
        "At 2 microseconds a message, one thread handles about 5 lakh a second, so 10 lakh needs a few engines. Partitioning by symbol gives that without locks. The sequencer and journal give arrival-order fairness and no loss of acknowledged orders. Per-level locks make ordering depend on timing, a database commit costs milliseconds, and stateless services reading a shared book bring back races on the book itself.",
      claims: [
        {
          text: "You accept that one very busy symbol is limited to one core, in return for lock-free, repeatable matching.",
          axis: "trade",
          correct: true,
          note: "True. Partitioning by symbol caps a symbol at a thread. A hot symbol is solved by a faster thread, not by sharing the book.",
        },
        {
          text: "You accept the cost of a journal write and replication for every message, in return for no lost acknowledged orders.",
          axis: "trade",
          correct: true,
          note: "True. The journal is the record, and batching keeps its cost small.",
        },
        {
          text: "You gain speed because several threads working on one book at once make each symbol faster.",
          axis: "trade",
          correct: false,
          note: "Concurrent work on one book needs locks, which add waiting and break repeatable ordering.",
        },
        {
          text: "If the primary engine dies, the standby that applied the same journal holds the same book and can take over without asking members to resend.",
          axis: "failure",
          correct: true,
          note: "True. Determinism plus a shared journal makes failover a catch-up, not a rebuild from members.",
        },
        {
          text: "A crash loses the book, because it is held only in memory.",
          axis: "failure",
          correct: false,
          note: "The book is rebuilt from the journal, and snapshots shorten the replay.",
        },
        {
          text: "Watch time from gateway to acknowledgement at the 99th and 99.9th percentile, the queue length before each engine, and the standby's lag in messages.",
          axis: "measure",
          correct: true,
          note: "True. Tail latency, backlog and standby lag show fairness, saturation and recovery readiness.",
        },
        {
          text: "The average latency over the whole trading day.",
          axis: "measure",
          correct: false,
          note: "The opening seconds are the stress. A day average hides them completely.",
        },
      ],
    },
    {
      id: "sd-design-stock-exchange-paper-venue",
      scenario:
        "A two-person team builds a simulated exchange for a learning platform: 200 symbols, about 50 users, a few hundred orders a minute, on one server. Users want fills by price-time priority, and the team wants to replay a session to debug. There is no money at stake. What should the core be?",
      options: [
        {
          label: "A relational database with an orders table and a matching transaction using row locks",
          appeal: "Durable, queryable, no custom engine to write.",
        },
        {
          label: "Kafka topics per symbol with one matcher microservice per topic",
          appeal: "Looks like what a large exchange would do.",
        },
        {
          label: "One process: an in-memory book per symbol, one thread applying events in arrival order, and an append-only log for replay",
          appeal: "Smallest possible design that is correct and replayable.",
        },
        {
          label: "A multi-threaded engine with fine-grained locks to be ready for growth",
          appeal: "Headroom for a much larger user base.",
        },
      ],
      best: 2,
      verdict:
        "A few hundred orders a minute is trivial for one thread. In-memory books with an event log give price-time priority and replay at the least cost. A database, Kafka or locks add moving parts and failure modes for a load that is thousands of times below any limit.",
      claims: [
        {
          text: "You accept that growth by orders of magnitude would need partitioning and a standby, in return for a design that is simple now.",
          axis: "trade",
          correct: true,
          note: "True. The same event-log core grows into the larger design.",
        },
        {
          text: "You gain exact repeatability, since the same log always rebuilds the same fills.",
          axis: "trade",
          correct: true,
          note: "True. This is what makes debugging a session possible.",
        },
        {
          text: "You lose price-time priority, because a single thread cannot honour arrival order.",
          axis: "trade",
          correct: false,
          note: "A single thread applies events in arrival order, which is exactly what time priority needs.",
        },
        {
          text: "If the process crashes between receiving an order and writing it to the log, that order is lost unless the log write comes first.",
          axis: "failure",
          correct: true,
          note: "True. Write to the log, then apply, so replay includes every accepted order.",
        },
        {
          text: "A bug in matching will corrupt the log, so replay cannot be used to debug it.",
          axis: "failure",
          correct: false,
          note: "The log holds inputs, not results. Replaying the inputs against fixed code reproduces the bug.",
        },
        {
          text: "Measure replay time for a full day, and compare the book rebuilt from the log with the live book at close.",
          axis: "measure",
          correct: true,
          note: "True. A mismatch means the engine is not deterministic, which is the property to protect.",
        },
        {
          text: "Count the number of services running, as a sign of the platform's maturity.",
          axis: "measure",
          correct: false,
          note: "More services mean more failure points, not more correctness.",
        },
      ],
    },
    {
      id: "sd-design-stock-exchange-runaway-algo",
      scenario:
        "On a busy day, a member firm's algo develops a bug and sends 5,000 buy orders a second at prices far above the market, in sizes that would together be worth hundreds of crores. The exchange wants such a failure stopped within a fraction of a second, without pausing other members. Human review would take minutes. Where should the defence sit?",
      options: [
        {
          label: "Trust the member's own risk system, since they know their strategy",
          appeal: "Keeps the exchange simple and puts responsibility on the member.",
        },
        {
          label: "Per-member checks in the gateway before sequencing: price bands, quantity and notional caps, a message-rate cap, and a kill switch that cancels the member's open orders",
          appeal: "Automatic, fast, and affects only the faulty member.",
        },
        {
          label: "Pause the whole market whenever any member's volume looks abnormal",
          appeal: "Stops everything, so nothing can go wrong.",
        },
        {
          label: "Surveillance staff review activity on a live dashboard and phone the member",
          appeal: "Human judgement avoids false alarms.",
        },
      ],
      best: 1,
      verdict:
        "At 5,000 orders a second the damage grows in milliseconds, so the check must be automatic and before the engine. Per-member limits and a kill switch contain one member without harming others. Trusting the member is the failure that has already happened, a market-wide pause punishes everyone, and phone calls take minutes.",
      claims: [
        {
          text: "You accept that rare legitimate bursts may be rejected, in return for stopping a runaway before it hits the book.",
          axis: "trade",
          correct: true,
          note: "True. Limits must be set with headroom, but any limit can block a real burst.",
        },
        {
          text: "Placing the checks before the sequencer means rejected orders never take a sequence number or engine time.",
          axis: "trade",
          correct: true,
          note: "True. The bad traffic never reaches the single thread.",
        },
        {
          text: "Checks in the gateway make the engine slower, because every order is validated twice.",
          axis: "trade",
          correct: false,
          note: "The gateway scales out separately. The engine only sees orders that already passed.",
        },
        {
          text: "A kill switch that only blocks new orders leaves the member's existing resting orders in the book unless it also cancels them.",
          axis: "failure",
          correct: true,
          note: "True. Stopping new input is not enough. Open orders must be cancelled as well.",
        },
        {
          text: "The runaway cannot reach the book, because the sequencer drops orders from misbehaving members.",
          axis: "failure",
          correct: false,
          note: "The sequencer numbers what it receives. Rejecting traffic is the gateway's job.",
        },
        {
          text: "Watch rejects by reason per member, message rate against the cap, and time from the first breach to the kill switch firing.",
          axis: "measure",
          correct: true,
          note: "True. They show whether the limits trigger and how fast containment is.",
        },
        {
          text: "The total number of orders the exchange matched that day shows whether containment worked.",
          axis: "measure",
          correct: false,
          note: "Total volume says nothing about whether one member's bad flow was stopped quickly.",
        },
      ],
    },
  ],
};

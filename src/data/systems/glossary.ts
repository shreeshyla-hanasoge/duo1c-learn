/**
 * Plain-English glossary for System design.
 *
 * Same rule as the other glossaries: a reader who has never seen the word
 * should understand the sentence it appeared in after reading `plain`, and no
 * definition may lean on another piece of jargon without explaining it in the
 * same breath. Separate from DSA's and Trading's on purpose — "order" here is
 * an instruction sent to a broker, not a sort order.
 */
import type { Glossary } from "../glossary.ts";

export const GLOSSARY: Glossary = {
  /* ---------------- Market data ---------------- */

  tick: {
    plain:
      "One price update from the exchange: 'NIFTY is now 24,310.50'. A busy instrument sends several ticks a second, and everything else (candles, signals, stops) is built from them.",
    also: ["ticks"],
  },
  candle: {
    plain:
      "A summary of all the ticks in one time slice: the first price (open), highest, lowest and last (close). A one-minute candle is what you see as one bar on a chart.",
    also: ["candles", "candlestick", "candlesticks"],
  },
  "minute bar": {
    plain:
      "A candle covering one minute. Most of the platform's decisions are taken when a minute bar finishes.",
    also: ["minute bars", "minute-bar", "one-minute bar", "one-minute bars"],
  },
  "order book": {
    plain:
      "The exchange's live list of everyone waiting to buy and sell an instrument, sorted by price. Buyers' offers sit on one side, sellers' on the other, and a trade happens when they meet.",
    also: ["order books"],
  },
  "market depth": {
    plain:
      "How much quantity is waiting at each price in the order book, not just the best one. Thin depth means a big order will push the price around.",
    also: ["depth of book"],
  },
  bid: {
    plain:
      "The highest price a buyer is currently willing to pay. If you want to sell right now, the bid is what you get.",
    also: ["bids", "best bid"],
  },
  "best ask": {
    plain:
      "The lowest price a seller is currently willing to accept. If you want to buy right now, this is what you pay.",
    also: ["ask price", "best offer"],
  },
  "bid-ask spread": {
    plain:
      "The gap between the best bid and the best ask. You pay roughly half of it every time you cross from one side to the other, so it is a cost of trading even before fees.",
    also: ["bid/ask spread"],
  },
  midpoint: {
    plain:
      "The price halfway between the best bid and the best ask. It is the fairest single number for 'what is it worth right now' when the two sides disagree slightly.",
    also: ["mid price"],
  },
  "last traded price": {
    plain:
      "The price of the most recent trade. It can be stale: in a quiet contract, the last trade may be minutes old while bids and asks have moved.",
    also: ["LTP"],
  },
  slippage: {
    plain:
      "The difference between the price you expected and the price you actually got. If your signal fires at 100 and you fill at 100.40, that is 0.40 of slippage.",
  },
  algo: {
    plain:
      "Short for algorithmic trading: orders placed by a program following rules, not by a person clicking a button. Indian brokers and SEBI treat these under extra rules.",
    also: ["algos", "algorithmic trading"],
  },
  "co-location": {
    plain:
      "Renting rack space inside the exchange's own data centre so your server is a few metres from its matching engine. It saves milliseconds and costs a lot of money.",
    also: ["colocation", "co-located", "colocated"],
  },
  "holiday calendar": {
    plain:
      "The list of days the exchange is closed, plus the odd special session (such as Muhurat trading). A scheduler that ignores it will happily wake up and wait for ticks that never come.",
  },
  NSE: {
    plain:
      "The National Stock Exchange of India, where NIFTY futures and options trade. It is the main venue the platform sends orders to.",
  },
  MCX: {
    plain:
      "The Multi Commodity Exchange, where crude oil, gold, silver and natural gas contracts trade, with a longer day than NSE (until late evening).",
  },
  NIFTY: {
    plain:
      "NSE's headline index, the weighted average price of 50 large Indian companies. You cannot buy the index itself, but you can trade its futures and options.",
    also: ["NIFTY 50", "BANKNIFTY"],
  },
  Kite: {
    plain:
      "Zerodha's programming interface and trading app. Kite Connect lets a program place orders and stream prices, subject to Zerodha's limits.",
    also: ["Kite Connect"],
  },
  "instrument token": {
    plain:
      "The number a broker uses internally for one tradable contract. The same name (say NIFTY 24500 CE) maps to different tokens at different brokers and changes at every expiry.",
    also: ["instrument tokens"],
  },
  "time zone": {
    plain:
      "The offset from UTC that a clock time is written in. Exchange times are in India's zone; servers and databases usually run in another.",
    also: ["time zones", "timezone", "timezones"],
  },
  IST: {
    plain:
      "Indian Standard Time, UTC plus 5:30, with no daylight saving. It is the clock the market runs on.",
    also: ["Indian Standard Time"],
  },
  UTC: {
    plain:
      "The world's reference clock, with no daylight saving. Storing times in UTC and converting to IST only for display avoids a whole family of bugs.",
    also: ["Coordinated Universal Time"],
  },
  epoch: {
    plain:
      "A timestamp written as the number of seconds since midnight UTC on 1 January 1970. It carries no time zone, which is why programs like it.",
    also: ["epochs", "Unix epoch", "Unix time"],
  },

  /* ---------------- Orders and execution ---------------- */

  "limit order": {
    plain:
      "An order that says 'buy at this price or better, never worse'. It may not fill at all if the market never reaches your price.",
    also: ["limit orders"],
  },
  "market order": {
    plain:
      "An order that says 'buy or sell now at whatever price is available'. It fills almost surely but you do not control the price.",
    also: ["market orders"],
  },
  "stop-loss": {
    plain:
      "An order that sits dormant until price reaches a level you chose, then fires to close the trade and cap the damage. The trigger starts the order; it does not guarantee the exit price.",
    also: ["stop loss", "stop-loss order", "stop-losses", "stoploss"],
  },
  "partial fill": {
    plain:
      "When only part of your order is matched. You asked for 600 and got 200 so far, and the rest is still waiting in the book.",
    also: ["partial fills", "partially filled"],
  },
  "price-time priority": {
    plain:
      "The exchange's queue rule: better prices go first, and among equal prices, whoever arrived earlier goes first. It is why being fast, or early, has value.",
    also: ["price time priority", "price-time"],
  },
  "queue position": {
    plain:
      "Where your resting order stands among others at the same price. Being 5th in line means your order fills only after the four ahead of you do.",
    also: ["queue positions"],
  },
  "matching engine": {
    plain:
      "The exchange program that pairs buy orders with sell orders and decides who trades with whom. Every trade you make passes through one.",
    also: ["matching engines"],
  },
  clearing: {
    plain:
      "The after-trade step where a central body confirms who owes what to whom, so each side only has to trust the clearing body, not the stranger across the trade.",
    also: ["clearing house"],
  },
  "clearing corporation": {
    plain:
      "The exchange's affiliate that stands in the middle of every trade, guaranteeing both sides get paid. NSE's is NSE Clearing.",
    also: ["clearing corporations", "CCP"],
  },
  settlement: {
    plain:
      "The final handover of money and securities after a trade. Index options settle in cash, so only the difference changes hands.",
  },
  margin: {
    plain:
      "The deposit a broker holds as security before letting you take a position. Sell an option and the margin can be many times the premium you collect.",
    also: ["margins"],
  },
  "freeze quantity": {
    plain:
      "The exchange's cap on how many lots one order may carry. A bigger order is rejected outright, so the platform has to slice it into several smaller ones.",
    also: ["freeze limit"],
  },
  "lot size": {
    plain:
      "The minimum bundle an exchange trades a derivative in. If NIFTY's lot is 75, you can buy 75 or 150 units but never 100.",
    also: ["lot sizes", "lots"],
  },
  "square-off": {
    plain:
      "Closing a position by doing the opposite trade: sell what you bought, buy back what you sold. Brokers also auto-square-off intraday positions near the close.",
    also: ["square off", "squared-off", "squaring off", "squares off", "square-offs"],
  },
  expiry: {
    plain:
      "The date an option or future stops trading and settles. NIFTY has weekly expiries, and the contract names and tokens change at each one.",
    also: ["expiries", "expiry day"],
  },
  "option chain": {
    plain:
      "The table of every call and put for one underlying and expiry, listed strike by strike with prices and open positions. It is the market's menu of options.",
    also: ["option-chain", "option chains", "options chain"],
  },
  hedge: {
    plain:
      "A second position that offsets the first one's risk, like buying a cheap far-away option against a sold one so the worst loss has a ceiling.",
    also: ["hedges", "hedged", "hedging"],
  },
  "paper trading": {
    plain:
      "Running a strategy against live prices with pretend money. It tests the plumbing and the rules without risking capital, but fills are only simulated.",
    also: ["paper trade", "paper trades"],
  },
  "FIX protocol": {
    plain:
      "The long-standing text format that banks, brokers and exchanges use to send orders and fills to each other over a persistent connection. Retail APIs like Kite are simpler cousins of it.",
    also: ["FIX session", "FIX order", "Financial Information eXchange"],
  },
  OMS: {
    plain:
      "The order management system: the part that accepts an order, checks it, sends it to the broker, tracks every state it passes through and records the result.",
    also: ["order management system"],
  },
  "pre-trade risk": {
    plain:
      "Checks run on an order before it leaves the building: is it too big, would it breach a loss limit, is the market closed. A failed check stops the order; it never reaches the broker.",
    also: ["pre-trade check", "pre-trade checks", "pre-trade"],
  },
  "loss limit": {
    plain:
      "A cap on how much a user or strategy may lose in a day. Once hit, new orders are refused until the next session.",
    also: ["daily loss limit", "daily loss", "loss limits"],
  },
  "kill switch": {
    plain:
      "One big off button that stops all new orders immediately, built on the assumption that someday something will go wrong faster than a person can diagnose it.",
    also: ["kill switches"],
  },
  "broker adapter": {
    plain:
      "A small piece of code that translates the platform's own order format into one broker's API, and the broker's replies back. Adding a new broker means writing one adapter, not touching the rest.",
    also: ["broker adapters", "adapter", "adapters"],
  },
  "API gateway": {
    plain:
      "A single front door that every outside request passes through, so logins, limits and logging happen in one place instead of in every service.",
    also: ["gateway", "gateways"],
  },
  backtest: {
    plain:
      "Running a strategy over past prices to see what it would have done. It is a rehearsal on history, only as honest as its assumptions about fills and costs.",
    also: ["backtests", "backtesting", "backtested"],
  },
  "fill model": {
    plain:
      "The set of assumptions a backtest or paper run uses to decide at what price, and whether, an order would have been filled.",
    also: ["fill models"],
  },
  "look-ahead": {
    plain:
      "A backtest bug where the strategy uses information that was not yet known at that moment, such as a candle's close while the candle is still forming. The results look brilliant and are fictional.",
    also: ["lookahead", "look-ahead bias"],
  },
  "point-in-time": {
    plain:
      "Data stored as it was known at that moment, not as later corrected. Without it, a backtest quietly sees the future.",
    also: ["point in time"],
  },
  "path-dependent": {
    plain:
      "Where the result depends on the order things happened in, not just the final numbers. A trade that hit its stop before its target is different from the reverse, even in the same candle.",
    also: ["path dependent"],
  },
  parity: {
    plain:
      "Two things behaving identically. Backtest-live parity means the same rule code gives the same decisions in a backtest and on live prices.",
    also: ["backtest-live parity"],
  },
  backfill: {
    plain:
      "Filling in missing history after the fact, for example re-downloading yesterday's candles for a gap when the feed dropped.",
    also: ["backfilling", "backfilled"],
  },

  /* ---------------- Reliability patterns ---------------- */

  idempotency: {
    plain:
      "The property that doing something twice has the same effect as doing it once. If a retried 'place this order' is idempotent, a network hiccup cannot buy you double the quantity.",
    also: ["idempotent", "idempotently"],
  },
  "idempotency key": {
    plain:
      "A unique label attached to a request so the receiver can recognise a repeat and return the first answer instead of doing the work again. UPI uses one for every payment attempt.",
    also: ["idempotency keys"],
  },
  dedupe: {
    plain:
      "Short for de-duplicate: spot a message you have already handled and ignore it. Needed whenever the same message can legitimately arrive twice.",
    also: ["dedupes", "deduplication", "de-duplicate", "deduplicate", "deduped"],
  },
  "at-least-once": {
    plain:
      "A delivery promise: every message arrives, but some may arrive more than once. Safe only if the receiver can cope with duplicates.",
    also: ["at least once"],
  },
  "exactly-once": {
    plain:
      "The wished-for delivery promise that every message is handled once and only once. In practice you get it by combining at-least-once delivery with a receiver that ignores repeats.",
    also: ["exactly once"],
  },
  "retry storm": {
    plain:
      "When many clients fail together and all retry at once, so the extra load keeps the struggling system down. Like everyone refreshing IRCTC at 10 am sharp.",
    also: ["retry storms"],
  },
  "exponential backoff": {
    plain:
      "Waiting longer after each failed attempt, such as 1 second, then 2, then 4, so a struggling service gets room to recover instead of being hammered.",
    also: ["backoff"],
  },
  jitter: {
    plain:
      "A bit of randomness added to wait times so that a thousand clients do not all retry at the very same instant.",
  },
  "circuit breaker": {
    plain:
      "A guard that stops calling a failing service for a while after repeated errors, then tries again carefully. Like the trip switch in your fuse box, it fails fast to protect everything else.",
    also: ["circuit breakers"],
  },
  bulkhead: {
    plain:
      "Splitting resources into separate compartments, like the watertight sections of a ship, so a flood in one (a slow broker, a heavy job) cannot sink the rest.",
    also: ["bulkheads"],
  },
  "rate limit": {
    plain:
      "A cap on how many requests may be made in a period. Brokers apply one to you, and you apply one to your own users, so nobody can flood the system.",
    also: ["rate limits", "rate limiting", "rate-limit", "rate-limited", "rate limited"],
  },
  "token bucket": {
    plain:
      "A way to enforce a rate limit: a bucket refills with tokens at a steady pace, each request spends one, and an empty bucket means wait. It allows short bursts but keeps the long-run average capped.",
    also: ["token buckets"],
  },
  backpressure: {
    plain:
      "A slow consumer telling a fast producer to ease off, or a system deciding what to drop when it cannot keep up. Without it, the queue just grows until memory runs out.",
    also: ["back-pressure", "back pressure"],
  },
  conflation: {
    plain:
      "When a consumer is behind, throwing away the in-between updates and keeping only the newest. For a price feed that is fine: you want the latest price, not the ten you missed.",
    also: ["conflate", "conflating", "conflated"],
  },
  "graceful degradation": {
    plain:
      "Losing a feature instead of the whole service when something fails: show a delayed price with a warning rather than an error page.",
    also: ["degrade gracefully", "degraded mode"],
  },
  "blast radius": {
    plain:
      "How much gets damaged when one part fails. A good design keeps it small: one user's bad strategy should not stop everybody else's.",
  },
  "fail-closed": {
    plain:
      "When a safety check cannot run, refuse the action. The risk check is down, so no order goes out. Safe, but you lose availability.",
    also: ["fail closed", "fails closed"],
  },
  "fail-open": {
    plain:
      "When a check cannot run, carry on as if it passed. Right for a nice-to-have feature, dangerous for anything protecting money.",
    also: ["fail open", "fails open"],
  },
  "single point of failure": {
    plain:
      "One component whose failure takes the whole system down. A single server, a single database, or a single person who knows the password.",
    also: ["single points of failure", "SPOF"],
  },
  failover: {
    plain:
      "Switching to a standby when the main system dies. How fast and how automatically it happens is the whole design question.",
    also: ["fail over", "fail-over"],
  },
  "hot standby": {
    plain:
      "A spare copy that is already running and in step with the main one, so taking over takes seconds. A cold standby has to be started and loaded first.",
    also: ["warm standby", "cold standby"],
  },
  heartbeat: {
    plain:
      "A small 'I am alive' message sent at regular intervals. When it stops, the other side knows something has failed.",
    also: ["heartbeats"],
  },
  lease: {
    plain:
      "Permission to hold something (a connection, a job, the lead role) for a limited time, which must be renewed. If the holder dies, the lease simply runs out and someone else may take over.",
    also: ["leases"],
  },

  /* ---------------- Concurrency and processing ---------------- */

  "event loop": {
    plain:
      "A single worker that endlessly takes the next waiting task, runs it, and takes the next. It handles thousands of connections without threads, as long as no task blocks for long.",
    also: ["event loops"],
  },
  "single writer": {
    plain:
      "Letting exactly one process or thread change a piece of data, so two writers never collide. Everything else asks the owner to make the change.",
    also: ["single-writer"],
  },
  "single-threaded": {
    plain:
      "Doing one thing at a time on one thread. Simple to reason about, since nothing else can change under you, but one slow task delays all the others.",
    also: ["single threaded"],
  },
  "state machine": {
    plain:
      "A model where something is always in exactly one named state (placed, open, filled) and only specific moves between states are allowed. It makes impossible situations, like a cancelled order filling, impossible.",
    also: ["state machines", "finite state machine"],
  },
  "event sourcing": {
    plain:
      "Storing every change as an event and rebuilding the current picture by replaying them, instead of keeping only the latest value. Your bank passbook works this way.",
  },
  "event time": {
    plain:
      "When something actually happened, as stamped by the exchange, as opposed to when your server heard about it. They can differ by a lot after a delay or a reconnect.",
    also: ["processing time"],
  },
  "tumbling window": {
    plain:
      "Cutting a stream into fixed, non-overlapping slices such as 9:15 to 9:16, then 9:16 to 9:17. A minute candle is a tumbling window over ticks.",
    also: ["tumbling windows"],
  },
  watermark: {
    plain:
      "A marker saying 'nothing older than this will arrive any more', so the system knows when a time slice can be closed without waiting forever for stragglers.",
    also: ["watermarks"],
  },
  determinism: {
    plain:
      "Getting the same output every time from the same input. It is what lets you replay yesterday's ticks and prove the system would behave identically.",
    also: ["deterministic", "non-deterministic", "nondeterministic"],
  },
  replay: {
    plain:
      "Feeding recorded inputs back through the system to reproduce what happened. It is how you debug a bad trade after the fact.",
    also: ["replays", "replayed", "replaying"],
  },
  "wall-clock": {
    plain:
      "The ordinary time on a clock on the wall, which can jump when it is corrected. Fine for labels, wrong for measuring how long something took.",
    also: ["wall clock"],
  },

  /* ---------------- Consistency and recovery ---------------- */

  reconciliation: {
    plain:
      "Comparing your own records against the broker's or exchange's and fixing any mismatch. It is how you find the order you thought was cancelled but is still live.",
    also: ["reconcile", "reconciles", "reconciled", "reconciling"],
  },
  "eventual consistency": {
    plain:
      "Different copies of the data may disagree for a moment, but they all settle to the same answer if updates stop. Fine for a dashboard, not for the balance you trade against.",
    also: ["eventually consistent"],
  },
  "source of truth": {
    plain:
      "The one place whose copy of a fact wins when copies disagree. Everything else is a cache or a view that can be rebuilt from it.",
  },
  "write-ahead log": {
    plain:
      "Writing down what you are about to do before doing it, so after a crash you can see what was half-done and finish or undo it.",
    also: ["write-ahead", "WAL"],
  },
  outbox: {
    plain:
      "A table where a message is saved in the same database transaction as the change it reports, then sent by a separate process. This way you never record a change without sending the message, or the reverse.",
    also: ["transactional outbox", "outbox pattern"],
  },
  snapshot: {
    plain:
      "A saved picture of the full state at one moment. After a crash you load the latest snapshot and replay only what came after.",
    also: ["snapshots"],
  },
  checkpoint: {
    plain:
      "A saved marker of how far processing has got, so a restart resumes from there instead of from the beginning.",
    also: ["checkpoints", "checkpointing"],
  },
  RPO: {
    plain:
      "Recovery point objective: how much recent data you can afford to lose in a disaster, measured in time. An RPO of 5 minutes means the backup may be up to 5 minutes behind.",
    also: ["recovery point objective"],
  },
  RTO: {
    plain:
      "Recovery time objective: how long you can afford to be down before service must be back. An RTO of 15 minutes means the restore has to finish within 15 minutes.",
    also: ["recovery time objective"],
  },
  replica: {
    plain:
      "A live copy of a database that follows the main one. It can serve reads and take over if the main one fails.",
    also: ["replicas", "read replica", "replication"],
  },
  sharding: {
    plain:
      "Splitting data across several databases by a key, such as user id, so no single one holds everything.",
    also: ["shard", "shards", "sharded"],
  },
  "audit trail": {
    plain:
      "A permanent record of who did what and when, kept so you can reconstruct events and answer a regulator or an angry customer.",
    also: ["audit log", "audit logs"],
  },

  /* ---------------- Caching and storage ---------------- */

  "cache-aside": {
    plain:
      "The most common caching pattern: look in the cache first; on a miss, read from the database, put the answer in the cache, and return it. The application manages the cache itself.",
    also: ["cache aside", "lazy loading"],
  },
  TTL: {
    plain:
      "Time to live: how long a cached or stored item stays valid before it is thrown away automatically. A 1-second TTL on a price means nobody sees a price older than a second.",
    also: ["time to live", "time-to-live"],
  },
  eviction: {
    plain:
      "A cache throwing items out when it runs short of memory, to make room. Anything stored only in a cache can vanish this way.",
    also: ["evict", "evicts", "evicted", "evictable"],
  },
  LRU: {
    plain:
      "Least recently used: when something must be thrown out, drop the item untouched for the longest time. Redis's allkeys-lru setting does this across all keys.",
    also: ["least recently used", "allkeys-lru"],
  },
  stampede: {
    plain:
      "When a popular cached item expires and hundreds of requests all rush to rebuild it from the database at the same moment, overwhelming it.",
    also: ["cache stampede", "stampedes"],
  },
  "time-series": {
    plain:
      "Data that is a long list of values stamped with time, like prices every second. Databases built for it are tuned for appending and reading ranges of time.",
    also: ["time series"],
  },
  cardinality: {
    plain:
      "How many distinct values something can take. A metric labelled by user id has very high cardinality, which can swamp a monitoring system.",
    also: ["high-cardinality", "high cardinality"],
  },
  Redis: {
    plain:
      "A very fast in-memory store used for caches, counters and shared state. Quick because it lives in RAM, risky because RAM is lost on restart and can be evicted under pressure.",
  },
  MySQL: {
    plain:
      "A widely used relational database: tables, rows and SQL. It writes to disk, so data survives a restart.",
  },
  "out-of-memory": {
    plain:
      "A crash when a program asks for more RAM than the machine has. The operating system then kills it, often without warning.",
    also: ["OOM", "out of memory"],
  },

  /* ---------------- Performance and capacity ---------------- */

  latency: {
    plain:
      "The delay between asking and getting an answer, usually in milliseconds. For a trade, from signal to order acknowledgement.",
  },
  throughput: {
    plain:
      "How much work gets done per unit of time, such as ticks handled per second. High throughput and low latency are different goals.",
  },
  p99: {
    plain:
      "The time within which 99 out of 100 requests finish, so the slowest 1 per cent are worse. It describes the bad days that an average hides, and the bad days are when you lose money.",
    also: ["tail latency", "percentile", "percentiles", "p95"],
  },
  "hot path": {
    plain:
      "The code that runs on every tick or order, where each microsecond counts. You keep it short and do slower work elsewhere.",
  },
  "cold start": {
    plain:
      "The extra delay the first time something runs after being idle, while it loads and warms up. Serverless functions are the usual example.",
    also: ["cold starts"],
  },
  observability: {
    plain:
      "How well you can tell what a running system is doing from the outside, using its logs, metrics and traces, without attaching a debugger.",
  },
  runbook: {
    plain:
      "A written step-by-step guide for handling a specific failure, so whoever is on call at 3 am does not have to think it through from scratch.",
    also: ["runbooks"],
  },

  /* ---------------- Architecture and design ---------------- */

  "modular monolith": {
    plain:
      "One program deployed as a unit, but with clean internal boundaries between its parts. You get simplicity of deployment now and the option to split later.",
    also: ["monolith", "monoliths"],
  },
  "C4 model": {
    plain:
      "A way of drawing software at four zoom levels: the system in its surroundings, its containers, the components inside one, and finally the code. Each diagram answers one question.",
    also: ["C4"],
  },
  ADR: {
    plain:
      "Architecture decision record: a short note saying what was decided, why, and what else was considered. Months later it answers 'why on earth did we do it this way?'.",
    also: ["architecture decision record", "architecture decision records", "ADRs"],
  },
  "post-mortem": {
    plain:
      "A written review after an incident covering what happened, why, and what changes so it does not recur. The good ones blame the process, not a person.",
    also: ["postmortem", "post-mortems", "postmortems"],
  },
  "multi-tenancy": {
    plain:
      "One running system serving many separate customers, each seeing only their own data. Cheaper than one copy per customer, but you must stop customers affecting each other.",
    also: ["multi-tenant", "multitenant", "multitenancy", "tenant", "tenants"],
  },
  "noisy neighbour": {
    plain:
      "One tenant using so much of a shared resource that others slow down. Like the flat above yours running a drill all day.",
    also: ["noisy neighbor", "noisy neighbours", "noisy neighbors"],
  },
  websocket: {
    plain:
      "A connection that stays open so the server can push data the moment it exists, instead of the client asking again and again. It is how live prices reach a browser.",
    also: ["websockets"],
  },
  "fan-out": {
    plain:
      "Sending one incoming item to many receivers: one NIFTY tick delivered to every user's screen and every strategy watching it.",
    also: ["fan out", "fanout", "fans out", "fanning out"],
  },
  "pub/sub": {
    plain:
      "Publish and subscribe: senders post to a named channel without knowing who is listening, and receivers subscribe to channels they care about. Senders and receivers stay independent.",
    also: ["pubsub", "publish/subscribe"],
  },

  /* ---------------- Security ---------------- */

  "least privilege": {
    plain:
      "Giving each person or program only the permissions its job needs and nothing more, so a stolen key or a mistake can do limited damage.",
  },
  JWT: {
    plain:
      "JSON Web Token: a signed piece of text a server hands you after login, which you show on each request to prove who you are, without it looking you up each time.",
    also: ["JSON Web Token", "JWTs"],
  },
  "access token": {
    plain:
      "A short-lived key that lets a program act on your account. Brokers issue one after you log in, and it expires, often at the end of the day.",
    also: ["access tokens"],
  },

  /* ---------------- Scaling and traffic ---------------- */

  /* ---------------- APIs and protocols ---------------- */

  /* ---------------- Data models and storage engines ---------------- */

  /* ---------------- Transactions and isolation ---------------- */

  /* ---------------- Search ---------------- */

  /* ---------------- Replication and partitioning ---------------- */

  /* ---------------- Consistency and distributed transactions ---------------- */

  /* ---------------- Clocks and consensus ---------------- */

  /* ---------------- Queues, logs and batch ---------------- */

  /* ---------------- Probabilistic structures ---------------- */

  /* ---------------- Geo, typeahead and timers ---------------- */

  /* ---------------- System design case studies ---------------- */

  /* ---------------- Scaling and traffic ---------------- */

  "load balancer": {
    plain:
      "A front door that spreads incoming requests across several identical servers, so no single one is swamped. Think of the person at a railway station who points each passenger to a different ticket counter.",
    also: ["load balancing", "load balancers"],
  },
  "round robin": {
    plain:
      "Handing out requests in turn: server A, then B, then C, then A again. It is fair when every request costs about the same, and unfair when some requests are much heavier than others.",
    also: ["round-robin"],
  },
  "least connections": {
    plain:
      "A rule where the load balancer sends the next request to whichever server currently has the fewest requests in progress, like joining the shortest queue at a toll plaza.",
    also: ["least-connections"],
  },
  "sticky sessions": {
    plain:
      "Making every request from one user land on the same server, usually because that server remembers something about them in memory. It works, but that user is stuck if the server dies.",
  },
  "health checks": {
    plain:
      "A tiny request a load balancer sends to each server every few seconds ('are you alive?'). A server that stops answering is taken out of rotation until it recovers.",
    also: ["health check"],
  },
  "reverse proxy": {
    plain:
      "A server that sits in front of your real servers, receives the customer's request, and passes it on. It can hide the real servers, add security, cache answers and spread the load.",
  },
  "scaling up": {
    plain:
      "Handling more traffic by buying a bigger machine: more CPU, more memory. It is simple, but there is a ceiling on machine size and one machine is still one point of failure.",
    also: ["vertical scaling"],
  },
  "scaling out": {
    plain:
      "Handling more traffic by adding more ordinary machines side by side, rather than one bigger one. It has no hard ceiling, but the work must be split in a way that lets the machines cooperate.",
    also: ["scale out", "horizontal scaling", "scale-out"],
  },
  stateless: {
    plain:
      "A server that keeps nothing about you between requests, so any copy of it can serve any request. That is what makes it easy to add or remove copies.",
    also: ["stateless servers"],
  },
  DNS: {
    plain:
      "The Domain Name System: the internet's phone book, which turns a name like example.com into the numeric address of a machine.",
  },
  CDN: {
    plain:
      "A content delivery network: a fleet of servers around the world that keep copies of your images, videos and pages, so a user in Chennai is served from nearby instead of from your one data centre.",
    also: ["CDNs", "content delivery network"],
  },
  "edge servers": {
    plain:
      "A CDN server physically close to the user. It answers from its stored copy when it has one and only goes back to your own servers when it does not.",
  },
  "origin server": {
    plain:
      "Your own server that holds the real, original content. A CDN fetches from it once, keeps a copy, and then serves that copy to everyone nearby.",
  },
  "hit rate": {
    plain:
      "A request answered from the stored copy without touching the slower source. The share of requests that are hits is the hit ratio, and it decides how much a cache actually helps.",
    also: ["hit ratio", "cache hit", "cache hits"],
  },

  /* ---------------- APIs and protocols ---------------- */

  REST: {
    plain:
      "A common style for web APIs: each thing (an order, a user) has its own address, and you use the standard verbs GET, POST, PUT and DELETE to read or change it.",
  },
  gRPC: {
    plain:
      "A fast way for programs to call each other over the network using compact binary messages with a fixed, agreed layout. Common between a company's own back-end services.",
  },
  "Protocol Buffers": {
    plain:
      "Google's compact binary format for messages. You declare the fields once in a schema file, and both sides use it to pack and unpack the data, which is smaller and faster than JSON text.",
  },
  GraphQL: {
    plain:
      "An API style where the caller states exactly which fields it wants in one request, so a phone screen can fetch everything it needs in a single round trip instead of calling five endpoints.",
  },
  "long polling": {
    plain:
      "A trick for getting near-instant updates over plain requests: the client asks 'anything new?', and the server holds the request open until there is something, or a timeout, then the client asks again.",
  },
  "server-sent events": {
    plain:
      "A web feature where the server keeps one connection open and pushes a stream of updates down to the browser. It only goes one way, server to client.",
  },
  pagination: {
    plain:
      "Splitting a long list into pages by saying 'give me the next 20 after this marker', instead of 'skip 4,000 rows'. It stays fast and does not repeat or skip items when new ones arrive mid-scroll.",
    also: ["cursor pagination"],
  },

  /* ---------------- Data models and storage engines ---------------- */

  "document store": {
    plain:
      "A database that keeps each record as one self-contained, flexible blob (like a JSON object) instead of rows spread over tables. Good when you usually read a whole record at once.",
    also: ["document database"],
  },
  "wide-column": {
    plain:
      "A database that groups data by a row key and lets each row have its own set of columns, built to spread huge tables over many machines. Cassandra is the best-known example.",
    also: ["wide-column store", "wide-column stores"],
  },
  denormalised: {
    plain:
      "Storing the same fact in more than one place on purpose, so a read needs one lookup instead of several joins. Reads get faster; every update now has to change all the copies.",
    also: ["denormalisation", "denormalise"],
  },
  "B-tree": {
    plain:
      "The standard sorted structure inside most databases: a shallow, wide tree of disk pages that finds any key in a handful of page reads and updates records in place.",
    also: ["B-trees", "B+ tree"],
  },
  LSM: {
    plain:
      "A storage design that never edits in place: new writes go to memory and are flushed as sorted files, which are merged in the background. Writes are very fast; reads may check several files.",
    also: ["LSM trees", "LSM tree", "LSM-tree", "log-structured merge tree"],
  },
  memtable: {
    plain:
      "The in-memory sorted buffer an LSM database writes into first. When it fills up, it is saved to disk as one sorted file.",
  },
  SSTable: {
    plain:
      "A sorted string table: an immutable file of key-value pairs sorted by key, produced when an LSM database flushes its memtable. Never edited, only replaced by merging.",
    also: ["SSTables"],
  },
  compaction: {
    plain:
      "Background housekeeping that merges several sorted files into fewer, newer ones, discarding overwritten and deleted entries. It keeps reads quick but uses disk and CPU.",
    also: ["compactions"],
  },
  "write amplification": {
    plain:
      "The extra disk writing a database does behind your back. If you save 1 MB and the engine ends up writing 10 MB over time (merging, rewriting), the amplification is 10.",
  },
  "covering index": {
    plain:
      "An index that already holds every column a query needs, so the database answers from the index alone without visiting the table. Like a phone directory that also prints the address.",
    also: ["covering indexes", "index-only scan"],
  },
  "composite index": {
    plain:
      "An index on several columns together, sorted by the first, then the second within it. It helps queries that filter on the first column (or the first few), not on the last alone.",
    also: ["composite indexes"],
  },
  "secondary indexes": {
    plain:
      "An extra index on a column other than the main key, so you can look rows up by something else, such as finding orders by phone number. Each write must update it too.",
    also: ["secondary index"],
  },
  tombstone: {
    plain:
      "A marker saying 'this key was deleted'. Files that are never edited cannot erase an entry, so a delete is stored as a marker, and the real removal happens later during merging.",
    also: ["tombstones"],
  },

  /* ---------------- Transactions and isolation ---------------- */

  ACID: {
    plain:
      "The four promises of a database transaction: all-or-nothing (atomic), obeys the rules (consistent), not disturbed by others (isolated), and survives a crash (durable).",
  },
  "isolation levels": {
    plain:
      "A setting for how much concurrent transactions are allowed to see of each other's unfinished work. Stricter levels prevent more odd results but run slower.",
    also: ["isolation level"],
  },
  MVCC: {
    plain:
      "Multi-version concurrency control: the database keeps old versions of a row, so readers see a consistent older snapshot while writers create a newer one, and neither blocks the other.",
    also: ["multi-version concurrency control"],
  },
  serializable: {
    plain:
      "The strictest isolation level: the result is as if transactions had run one at a time in some order, even though they actually overlapped.",
    also: ["serializability"],
  },
  "snapshot isolation": {
    plain:
      "Each transaction works on a frozen picture of the data as of its start. It avoids most anomalies, but not all, notably write skew.",
  },
  "lost update": {
    plain:
      "Two people read the same value, each changes it, each saves, and one save silently overwrites the other. Two clerks both read stock 10, both sell one, both write 9.",
    also: ["lost updates"],
  },
  "write skew": {
    plain:
      "Two transactions each check a rule and then change different rows, and together they break the rule. Two doctors both see 'someone else is on call' and both go off call.",
  },
  phantom: {
    plain:
      "Running the same query twice in one transaction and getting an extra row the second time, because someone inserted a matching row between the two.",
    also: ["phantoms", "phantom read"],
  },
  "optimistic concurrency": {
    plain:
      "Take no lock; read a row with its version number, and on save say 'update only if the version is still the one I read'. If someone got there first, the save fails and you retry.",
  },
  deadlock: {
    plain:
      "Two jobs each hold something the other needs and both wait forever. A holds the key to room 1 and wants room 2's; B holds room 2's and wants room 1's.",
    also: ["deadlocks"],
  },

  /* ---------------- Search ---------------- */

  "inverted index": {
    plain:
      "The index behind search: for every word, a list of the documents containing it, like the index at the back of a textbook. Finding a word's pages is then a lookup, not a scan.",
  },
  postings: {
    plain:
      "The list stored under one word in an inverted index: the ids of every document that contains it, kept sorted so two lists can be combined quickly.",
    also: ["postings lists", "postings list"],
  },
  BM25: {
    plain:
      "The standard formula search engines use to score how well a document matches a query: it rewards rare query words and repeats, and does not over-reward long documents.",
  },

  /* ---------------- Replication and partitioning ---------------- */

  "replication lag": {
    plain:
      "How far a copy of the data is behind the main one. If a copy is two seconds behind, a user who reads from it may not see what they just saved.",
  },
  "synchronous replication": {
    plain:
      "The main copy waits until the replica confirms it has the write before telling you 'saved'. Safer against loss, but slower and stuck if the replica is down.",
  },
  "asynchronous replication": {
    plain:
      "The main copy says 'saved' straight away and ships the change to replicas afterwards. Fast, but a crash can lose changes the replicas never received.",
  },
  "leader election": {
    plain:
      "How a group of machines agrees on which one is in charge, and picks a new one when it dies. It must never end with two machines both believing they lead.",
  },
  "split brain": {
    plain:
      "A failure where a cluster splits in two, and each half thinks the other is dead and carries on as the leader, so both accept conflicting writes.",
    also: ["split-brain"],
  },
  "read-your-writes": {
    plain:
      "The guarantee that after you save something, your own next read shows it, even if other users' views are still catching up.",
    also: ["read-after-write"],
  },
  "hot key": {
    plain:
      "One key that gets far more traffic than the rest, such as a celebrity's profile. Whichever machine owns it is overloaded while the others sit idle.",
    also: ["hot keys", "hot spot", "hot spots", "hot partition", "hot shard"],
  },
  rebalancing: {
    plain:
      "Moving data between machines when one is added or removed, so the load stays even. Done carelessly, it moves far more data than necessary.",
    also: ["rebalance", "rebalances"],
  },
  "partition key": {
    plain:
      "The field whose value decides which machine stores a record, such as user id. Picking it well spreads load evenly; picking it badly creates hot spots.",
    also: ["partition keys", "shard key"],
  },
  "range partitioning": {
    plain:
      "Splitting data by ranges of the key: A to F on one machine, G to M on the next. Range scans are easy, but popular ranges can overload one machine.",
    also: ["range partition", "range partitions"],
  },
  "hash partitioning": {
    plain:
      "Splitting data by a scrambled version of the key, which spreads records evenly. The price is that neighbouring keys end up on different machines, so range scans are hard.",
    also: ["hash partition"],
  },
  "scatter-gather": {
    plain:
      "Answering a query by asking every partition at once and combining their replies. Simple, but one slow partition makes the whole answer slow.",
  },
  "consistent hashing": {
    plain:
      "A way of assigning keys to machines so that adding or removing a machine moves only a small share of keys, instead of reshuffling almost everything.",
    also: ["consistent hash"],
  },
  "virtual nodes": {
    plain:
      "One physical machine placed at many points on a consistent-hashing ring, so its load is spread evenly and a failure is shared among many neighbours.",
    also: ["virtual node", "vnodes"],
  },

  /* ---------------- Consistency and distributed transactions ---------------- */

  "CAP theorem": {
    plain:
      "When the network splits, a system must choose: stay consistent (refuse some requests) or stay available (answer, possibly with stale data). It cannot have both during the split.",
  },
  PACELC: {
    plain:
      "An extension of the CAP theorem: if there is a partition, choose between availability and consistency; else, even when all is well, choose between low latency and consistency.",
  },
  linearizable: {
    plain:
      "The strongest consistency: the system behaves as if there were one copy of the data, and once a write finishes, every later read anywhere sees it.",
    also: ["linearizability"],
  },
  quorum: {
    plain:
      "The minimum number of replicas that must agree for an operation to count. With 3 replicas, requiring 2 for writes and 2 for reads guarantees every read overlaps the latest write.",
    also: ["quorums", "read quorum", "write quorum"],
  },
  "sloppy quorum": {
    plain:
      "When some of the proper replicas are unreachable, accept the write on other healthy machines temporarily so it succeeds. More available, but reads may miss it until it is handed back.",
  },
  "last-write-wins": {
    plain:
      "Settling a conflict by keeping whichever version has the latest timestamp. Simple, but it silently discards the other write and trusts clocks that may be off.",
    also: ["LWW", "last write wins"],
  },
  CRDT: {
    plain:
      "A conflict-free replicated data type: a structure (a counter, a set) designed so copies edited independently can always be merged to the same result, in any order.",
    also: ["CRDTs"],
  },
  "2PC": {
    plain:
      "How several databases commit together: first all promise they can (prepare), then the coordinator tells all to commit. If the coordinator dies in between, they can be stuck waiting.",
    also: ["two-phase commit"],
  },
  saga: {
    plain:
      "A long operation split into steps, each with its own undo step. If step 3 of a booking fails, you run the undo for steps 2 and 1 instead of holding locks across systems.",
    also: ["sagas", "saga pattern"],
  },
  "compensating action": {
    plain:
      "The undo step of a saga: not a database rollback, but a new action that cancels the earlier one, such as issuing a refund for a charge.",
    also: ["compensating actions"],
  },
  UUIDs: {
    plain:
      "A universally unique identifier: a 128-bit random-looking id that any machine can generate on its own with a negligible chance of clashing with anyone else's.",
    also: ["UUID"],
  },
  Snowflake: {
    plain:
      "An id built from a timestamp, a machine number and a counter packed into one number. Machines make unique, roughly time-ordered ids without talking to each other.",
    also: ["Snowflake ids"],
  },

  /* ---------------- Clocks and consensus ---------------- */

  "clock skew": {
    plain:
      "Two machines' clocks disagreeing by some milliseconds or more. It means 'which happened first' cannot be settled by comparing timestamps from different machines.",
  },
  Lamport: {
    plain:
      "A simple counter each machine bumps on every event and sets to the highest number it sees in a message. It gives a consistent order of events but cannot tell whether two events were concurrent.",
    also: ["Lamport timestamps", "Lamport clock", "Lamport timestamp", "Lamport clocks"],
  },
  "vector clocks": {
    plain:
      "A list of counters, one per machine, attached to each version of a value. Comparing two lists shows whether one version came after the other or whether they were edited concurrently and conflict.",
    also: ["vector clock", "version vectors"],
  },
  consensus: {
    plain:
      "Getting several machines to agree on one value, such as who the leader is, even when some crash or messages are lost. Raft and Paxos are the usual recipes.",
  },
  Raft: {
    plain:
      "A consensus algorithm designed to be understandable: one elected leader takes writes, copies them to followers, and a change counts once a majority has it.",
  },
  etcd: {
    plain:
      "A small, reliable coordination service that other systems use to elect a leader, store configuration and hold locks, built on consensus across a few machines.",
    also: ["ZooKeeper", "Chubby"],
  },
  "distributed lock": {
    plain:
      "A lock shared across many machines, so only one of them does a job at a time. It is much harder than an in-process lock because machines can pause, crash or lose contact while holding it.",
    also: ["distributed locks"],
  },
  "fencing token": {
    plain:
      "A number that grows each time a lock is granted. The protected resource rejects any request carrying an older number, so a slow, outdated lock-holder cannot do damage.",
    also: ["fencing tokens"],
  },
  gossip: {
    plain:
      "Spreading information the way rumours spread: each machine periodically tells a few random others what it knows, and soon everyone does, with no central server.",
    also: ["gossip protocol"],
  },
  "phi-accrual": {
    plain:
      "A failure detector that does not say 'dead' or 'alive' but gives a suspicion score that grows the longer a heartbeat is overdue, judged against that machine's usual timing.",
    also: ["phi-accrual failure detector"],
  },
  "Merkle tree": {
    plain:
      "A tree of fingerprints: each leaf hashes a block of data and each parent hashes its children. Two machines compare top fingerprints and, if they differ, walk down to find exactly which blocks differ.",
    also: ["Merkle trees", "hash tree"],
  },
  "read repair": {
    plain:
      "When a read asks several replicas and spots one with an older value, the system quietly writes the newest value to that stale replica as part of the read.",
  },
  "hinted handoff": {
    plain:
      "When a replica is down, another machine keeps the write with a note 'this belongs to B' and hands it over once B returns, like a neighbour holding your courier parcel.",
  },
  "anti-entropy": {
    plain:
      "A background process where replicas compare their data and copy over whatever one is missing, catching drift that reads and writes did not fix.",
  },

  /* ---------------- Queues, logs and batch ---------------- */

  "consumer group": {
    plain:
      "A set of workers that share a topic's messages between them, each message going to one worker in the group. Adding workers speeds things up; a second group gets its own full copy.",
    also: ["consumer groups"],
  },
  "dead-letter queue": {
    plain:
      "A side queue for messages that keep failing. After a few retries, the message is moved there for a human to inspect so it stops blocking the rest.",
    also: ["dead-letter queues"],
  },
  Kafka: {
    plain:
      "A widely used message system that stores messages in an append-only log split into partitions, which many consumers can read, and re-read, at their own pace.",
  },
  CDC: {
    plain:
      "Reading a database's own record of changes to learn every insert, update and delete as it happens, and passing them on to other systems such as a search index.",
    also: ["change data capture"],
  },
  MapReduce: {
    plain:
      "A way to process huge data by splitting it among many machines: each maps its piece to partial answers, then results are grouped by key and reduced into totals.",
  },

  /* ---------------- Probabilistic structures ---------------- */

  "Bloom filter": {
    plain:
      "A tiny structure that answers 'have I seen this before?' using very little memory. It may wrongly say yes (a false positive) but never wrongly says no.",
    also: ["Bloom filters"],
  },
  "false positive": {
    plain:
      "A wrong 'yes': the check says the thing is present or matches when it does not. A spam filter blocking a genuine email is one.",
    also: ["false positives"],
  },
  HyperLogLog: {
    plain:
      "A trick to estimate how many different items you have seen, millions of them, using only a few kilobytes and being right to within about a percent.",
    also: ["HLL"],
  },
  "count-min": {
    plain:
      "A small grid of counters that estimates how often each item appeared. It can overcount a little because items share counters, but never undercounts.",
    also: ["count-min sketch"],
  },
  "top-k": {
    plain:
      "The few items that account for most of the traffic, such as the ten most searched queries. Special structures find them without keeping a counter for every item.",
    also: ["heavy hitters", "top k"],
  },

  /* ---------------- Geo, typeahead and timers ---------------- */

  geohash: {
    plain:
      "A short text code for a map rectangle, made by repeatedly halving the world. Places close together share a long common prefix, so 'what is nearby' becomes a prefix lookup.",
  },
  quadtree: {
    plain:
      "A map index that splits a square into four smaller squares, and splits any crowded square again. Dense city centres get fine cells; empty countryside stays coarse.",
    also: ["quadtrees"],
  },
  trie: {
    plain:
      "A tree where each step down the tree adds one letter, so every word sharing a start shares a path. Typing a prefix takes you to one spot, from which you list the completions.",
    also: ["prefix tree"],
  },
  "timing wheel": {
    plain:
      "A circular array of time slots, like a clock face, where each timer is dropped into the slot for when it is due. A tick moves the hand and fires that slot, which scales to millions of timers cheaply.",
    also: ["timing wheels"],
  },
  "min-heap": {
    plain:
      "A structure that always lets you pull out the smallest item first, quickly. A scheduler uses it to find the timer due soonest.",
  },

  /* ---------------- System design case studies ---------------- */

  "base-62": {
    plain:
      "Writing a number using 62 symbols (0-9, a-z, A-Z) instead of ten digits. A big id becomes a short code, which is how short links get their few characters.",
    also: ["base 62"],
  },
  "fan-out on write": {
    plain:
      "When someone posts, copy it straight into every follower's feed right away. Reading the feed is then instant, but a user with millions of followers makes one post very expensive.",
    also: ["write fan-out"],
  },
  "fan-out on read": {
    plain:
      "Build a feed only when someone opens it, by fetching recent posts from everyone they follow. Posting is cheap, but opening the feed does more work.",
  },
  ledger: {
    plain:
      "Recording every money movement as two matching lines, a debit in one account and a credit in another, so the books always add up to zero. Like a kirana ledger that notes both who paid and who received.",
    also: ["double-entry", "ledgers", "double-entry ledger"],
  },
  "payment gateway": {
    plain:
      "The service that takes a customer's card, UPI or bank details for a shop and talks to the banks on the shop's behalf, so the shop never handles raw card numbers.",
  },
  UPI: {
    plain:
      "India's real-time bank-to-bank payment system, run by NPCI, which lets you pay from a phone app using an id such as name@bank.",
    also: ["NPCI"],
  },
  "seat hold": {
    plain:
      "A temporary reservation on a seat while the buyer pays, released automatically if the time runs out. Like the few minutes IRCTC keeps your berth while you complete payment.",
  },
  "waiting room": {
    plain:
      "A queue placed in front of a site during a rush, such as ticket sales, that lets people in at a controlled pace instead of crashing the booking system.",
    also: ["virtual waiting room", "waiting rooms"],
  },
};

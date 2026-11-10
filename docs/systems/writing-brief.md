# Writing brief — System design

The brief every topic in `src/data/systems/topics/` is written against. Keep it for
later topics: the same rules apply.

## The reader

One specific person: the founder who built and runs **Traed**, an algorithmic trading
platform for Indian markets (NIFTY/BANKNIFTY options on NSE, commodity futures and options
on MCX). Writes code daily in PHP, Python and JavaScript. Built the system by solving
problems as they came, and now wants the **names, the general pattern and the trade-off**
behind each thing already built — so they can talk about Traed with engineers, investors
and a possible co-founder, and hold their own in a system-design conversation.

So each topic does three jobs, in this order:

1. Teach the general concept the way a good system-design text would.
2. Show it in the wider industry (exchanges, brokers, well-known public systems).
3. Show it in Traed — what Traed does, why, what it gives up, and how to **say** that.

The site's audience rule applies: plain English for readers in India, short sentences, no
idioms that do not travel, every jargon term explained on first use. Indian examples first
(NSE, MCX, Zerodha Kite, Groww, UPI, IRCTC) alongside industry ones.

## Non-negotiable content rules

1. **Nothing invented.** No made-up statistics, latencies, company internals, quotes or
   incident details. Industry examples must be widely documented public knowledge (the LMAX
   architecture, the Knight Capital loss of 2012, FIX, Kafka's log, exchange price-time
   priority, published broker API limits). If you are not sure of a number, describe it in
   words ("a few requests per second") or leave it out. `evidence` names a public source in
   plain words — never a fabricated URL.
2. **Every Traed claim is checked against the repository.** Open the file or doc before you
   cite it. `evidence` on a `kind: "yours"` case is a real path in the Traed repo
   (`docs/HLD.md`, `strategy-engine/app/...`, `docs/incidents/...`) that you have confirmed
   exists and says what you claim. If the code and an older note disagree, the code wins.
   If you cannot confirm something, do not write it.
3. **Honest about scale.** Traed runs on one server, has one daily user (the founder), and
   trades minute bars. It is not high-frequency and not multi-region. Say what it
   deliberately does not do. A limit stated plainly is more convincing than a boast.
4. **The site is public.** No secrets, tokens, IP addresses, hostnames beyond the public
   domain, account ids, or details of any security weakness that is not fixed. Incidents are
   told at the design level: what failed, why the design allowed it, what changed.
5. **Education, not advice.** Nothing about whether a strategy makes money.
6. **`learn.complexityDerivation` is "Why this design holds"** for this subject (the UI
   heading is subject-specific; hint: "the argument, and where it stops holding"). Use it
   for the reasoning behind the pattern — the invariant it protects — and the conditions
   under which it breaks or becomes the wrong choice. 120–200 words.
7. **The last `mechanics` entry is always headed `Saying it about Traed`.** 80–130 words,
   written the way you would say it aloud to an engineer: what Traed does, the reason, the
   cost accepted, and when it would be revisited. First person plural ("we").

## Shape of a topic

Types are in `src/data/types.ts`. Shape exemplars: `src/data/trading/topics/vp-poc.ts`
(depth and tone of a `learn` block and `realWorld`) and `src/data/topics/structure-choice.ts`
(decision `cases`). Do **not** set `viz`, `lab`, `complexity` or `conceptFilm`.

```ts
import type { Topic } from "../../types.ts";

export const sdExample: Topic = {
  id: "sd-example",          // exactly the file name
  title: "…",                // as given in the topic list below
  tier: 3,                   // the module number
  week: 5,                   // as given below
  depth: "deep",
  summary: "…",              // one sentence, under 160 characters
  why: "…",                  // 60–100 words: why THIS reader needs it, tied to Traed
  learn: {
    intuition: "…",          // 120–180 words, one everyday picture, no jargon
    mechanics: [ /* exactly 5 × { heading, body } — bodies 70–120 words; 5th = Saying it about Traed */ ],
    complexityDerivation: "…",
    variants: [ /* exactly 3 × { name, when, delta } */ ],
    tradeoffs: [ /* exactly 3 × { vs, pick, because } */ ],
  },
  realWorld: [ /* exactly 4: at least 2 `industry`, at least 1 `yours` (2 if the repo supports it) */ ],
  insights: [ /* exactly 4 × { t, d } — the recap a reader would put on a flashcard */ ],
  pitfalls: [ /* exactly 3 strings */ ],
  quiz: [ /* exactly 8 */ ],
  cases: [ /* exactly 3 */ ],
};
```

**Quiz.** 8 questions: 2 `recall`, 4 `apply`, 2 `judge`. Four options each. `why` explains
the reasoning. `distractors` has four entries — `""` at the correct index, and for each wrong
option one sentence on why it is tempting and why it is wrong. **Spread the correct index**:
across the 8 questions each of 0, 1, 2, 3 is the answer exactly twice. Options are similar
in length; the right answer must not be the longest. At least 3 questions are set in an
Indian-market or Traed-like scenario. Questions test the concept, not trivia about Traed.

**Decision cases.** 3 per topic. A concrete scenario with the numbers and constraints that
decide it (team size, traffic, money at risk, market hours). 3 or 4 options, each with an
honest `appeal`; exactly one is best under the stated constraints. `verdict` says why, in
terms of those constraints. `claims`: 6 or 7, at least two on each axis (`trade`,
`failure`, `measure`), 3 or 4 `correct: true` and the rest plausible but false, every one
with a `note`. Grading is exact-set, so each claim must be clearly true or clearly false
given the scenario — no "arguably". `id` is `<topic id>-<short-slug>`. At least one case
per topic is a Traed-sized scenario (one server, small team); at least one is a larger
system, so the reader sees the answer change with scale.

**Style.** Backticks for code and identifiers (`Prose` renders them). No Markdown headings,
bullets or bold inside strings. No em-dash chains; plain sentences. British spelling to match
the rest of the site (optimise, behaviour). Rupees and Indian number grouping where money
appears.

## The topic list

`M` = module (= `tier`). Each line: file / export — title — scope — where to look in Traed.
Paths are relative to the Traed repository root.

### M1 · The market and the machine

- `sd-trade-lifecycle` / `sdTradeLifecycle` — **The life of an order** (week 1). Trader →
  platform → broker → exchange → clearing; order types (market, limit, stop-loss); order
  states (open, partially filled, complete, cancelled, rejected); acknowledgement versus
  fill; who is the source of truth at each step. Traed: `docs/LLD.md` §3 (tick-to-broker
  sequence, order fill-lifecycle state machine), `ARCHITECTURE.md` §7.
- `sd-platform-anatomy` / `sdPlatformAnatomy` — **Anatomy of a trading platform** (week 1).
  The five boxes: market data, strategy/decision, order management and risk, persistence,
  user interface/operations; the C4 way of drawing context → containers → components; how
  a hedge fund's stack and a retail algo platform differ in size, not shape. Traed:
  `ARCHITECTURE.md` §1–2, `docs/HLD.md` §1–3.
- `sd-order-book-matching` / `sdOrderBookMatching` — **Order books and matching engines**
  (week 2). Bid/ask, depth, spread; price-time priority; market versus limit against the
  book; partial fills, slippage, gaps; what a matching engine guarantees (determinism,
  fairness, sequencing); why a backtest must model fills. Traed: backtest fill modelling in
  `strategy-engine/app/services/` (options and streaming executors), `ARCHITECTURE.md` §5–6.
- `sd-latency-budgets` / `sdLatencyBudgets` — **Latency budgets** (week 2). Latency classes
  (co-located HFT in microseconds, retail algos in hundreds of milliseconds, minute-bar
  systems); budget per hop; averages versus tail (p99); when faster is worthless. Traed:
  the tick path in `docs/HLD.md` §7–8; candle-close evaluation versus tick-level exits in
  `ARCHITECTURE.md` §7–8.
- `sd-time-and-sessions` / `sdTimeAndSessions` — **Time, clocks and market sessions**
  (week 2). UTC versus IST storage; bar-open versus bar-close timestamps; exchange sessions
  (NSE 09:15–15:30, MCX evening session), holidays, expiry days; clock skew between
  machines; event time versus processing time. Traed: session and candle-timestamp handling
  in `strategy-engine/app/` (search `session`, `market_hours`, `epoch`), `docs/mcx-futures-data.md`.

### M2 · Market data pipelines

- `sd-feed-ingestion` / `sdFeedIngestion` — **Feed handlers and tick ingestion** (week 3).
  Long-lived WebSocket; binary versus JSON; normalising to an internal tick; instrument
  tokens and symbol mapping; reconnect and resubscribe; sequence numbers and gap detection
  on exchange feeds. Traed: `docs/HLD.md` §7, `docs/LLD.md` §6,
  `CMS/Serverless/real-time-trading-websocket/`, `docs/incidents/2026-11-09-ticker-alias-silent-feed.md`.
- `sd-fanout-backpressure` / `sdFanoutBackpressure` — **Fan-out, pub/sub and backpressure**
  (week 3). Topics and subscriptions; fan-out arithmetic (ticks × keys × connections);
  batching per connection; conflation; bounded queues, drop policies and the slow consumer.
  Traed: subscription tables and `PostToConnection` fan-out in the bridge
  (`docs/HLD.md` §7); look for batching/coalescing in `KiteWebSocketBridge.js`.
- `sd-candle-aggregation` / `sdCandleAggregation` — **Candle aggregation and windowing**
  (week 3). Tumbling windows; when a bar is closed; late and out-of-order ticks,
  watermarks; building higher timeframes from 1-minute bars versus from ticks; consistency
  between historical and live candles. Traed: tick → 1-minute candle → rules in
  `ARCHITECTURE.md` §8; multi-timeframe handling (`docs/engineering/multi-timeframe-indicators-plan.md`).
- `sd-timeseries-storage` / `sdTimeseriesStorage` — **Time-series storage** (week 4).
  Access pattern first (symbol + time range); primary-key and partition design; row versus
  columnar; hot/warm/cold tiers; why option-chain history is a wide, heavy dataset;
  relational versus key-value. Traed: `docs/LLD.md` §1 (option-chain history ERD),
  `ARCHITECTURE.md` §10, candle tables in the schema.
- `sd-caching` / `sdCaching` — **Caching and pre-warming** (week 4). Cache-aside, TTL,
  eviction policies; pre-warming before the open; stampede; the rule that a cache must be
  rebuildable — and what happens when state that is not rebuildable is put in one. Traed:
  `strategy-engine/app/services/pre_warm_service.py`, `app/services/caching/`,
  `docs/HLD.md` §8; Redis DB split (Horizon queues versus engine cache).
- `sd-feed-health` / `sdFeedHealth` — **Feed health and staleness detection** (week 4).
  Liveness versus health; heartbeats; "time since last tick" per instrument; market-hours
  awareness; watchdog and automatic resubscribe; alert fatigue. Traed:
  `docs/postmortems/2026-08-26-tick-feed-outage.md`,
  `docs/incidents/2026-11-09-ticker-alias-silent-feed.md`, `docs/LLD.md` §6 (reconnect and
  stale-tick watchdog), `docs/paper-trading-monitoring.md`.

### M3 · The strategy engine

- `sd-event-loop` / `sdEventLoop` — **Event-driven design and the single writer** (week 5).
  Events versus polling; the event loop; single-writer principle; why one thread can be
  both simpler and fast; blocking calls as the enemy; where one process stops scaling.
  Traed: `docs/HLD.md` §1 (live/paper singleton, single uvicorn worker),
  `strategy-engine/app/services/` strategy manager and universal executor.
- `sd-rule-engine` / `sdRuleEngine` — **Rule engines: strategies as data** (week 5).
  Rules stored as JSON; operands, operators, condition groups; parse to a tree, evaluate
  per event; one evaluator shared by every mode; versioning stored rules. Traed:
  `docs/LLD.md` §4, `strategy-engine/app/services/condition_engine/`,
  `docs/engineering/unify-condition-evaluators.md`, `docs/strategy-builder-capabilities.md`.
- `sd-state-machines` / `sdStateMachines` — **State machines for strategies and orders**
  (week 5). States, events, transitions, guards; illegal transitions as bugs caught early;
  persisting the state; a dead status column as a warning sign. Traed: `docs/LLD.md` §2
  (backtest job state machine), §3 (strategy lifecycle, order fill lifecycle), §7 (token
  lifecycle).
- `sd-backtest-live-parity` / `sdBacktestLiveParity` — **Backtest, paper and live: one code
  path** (week 6). Why two implementations drift; look-ahead bias; shared evaluation core
  with different event sources and different execution adapters; parity tests; what can
  never be identical (fills, latency). Traed: `ARCHITECTURE.md` §5 (the executors) and §6–7,
  `docs/engineering/unify-condition-evaluators.md`, `docs/debugging-live-and-paper.md`.
- `sd-determinism-replay` / `sdDeterminismReplay` — **Determinism, event sourcing and
  replay** (week 6). Same inputs → same outputs; hidden inputs (wall clock, iteration
  order, shared caches, randomness); the event log as the source of truth; replaying a
  trading day to reproduce a bug. Traed: `docs/dev-tick-replay.md`; any determinism notes in
  `docs/` (search `determinis`).
- `sd-isolation-and-jobs` / `sdIsolationAndJobs` — **Workload isolation and job queues**
  (week 6). Bulkheads; process versus thread isolation; job queue, workers, concurrency
  limit; job states, stuck jobs, timeouts; progress reporting for long jobs. Traed:
  `strategy-engine/app/services/backtest_dispatch.py` (spawn process pool),
  `docs/LLD.md` §2 and §9 (Redis + Horizon queues), `docs/HLD.md` §1.

### M4 · Orders, risk and brokers

- `sd-order-management` / `sdOrderManagement` — **Order management** (week 7). What an OMS
  owns; parent and child orders; multi-leg option orders; partial fills, average price,
  cancel/replace; exchange freeze quantities and slicing; the order record as an audit
  trail. Traed: `docs/LLD.md` §3 (order fill lifecycle), live executor order placement code,
  `docs/live-readiness.md`.
- `sd-idempotency` / `sdIdempotency` — **Idempotency and safe retries** (week 7).
  At-least-once delivery; "exactly-once" as dedupe plus idempotent effects; client order
  ids/tags; conditional writes; query-before-retry on timeout. Traed: order tagging in the
  live path; the bridge-invoke debounce (a DynamoDB conditional write) in
  `CMS/Serverless/real-time-trading-websocket/` (`subscribe.js`).
- `sd-reconciliation` / `sdReconciliation` — **Reconciliation: the broker is the truth**
  (week 7). Internal book versus broker book; reconcile on a timer and on restart; classes
  of difference (missing here, missing there, quantity mismatch); automatic repair versus
  alert-and-stop; manual trades made outside the platform. Traed: reconciliation code in
  the live executor / strategy manager (search `reconcil`), `docs/live-readiness.md`,
  `docs/incidents/2026-07-16-paper-position-never-exited.md`.
- `sd-pretrade-risk` / `sdPretradeRisk` — **Pre-trade risk and kill switches** (week 8).
  Checks outside strategy code; quantity and notional caps; capital/margin check; daily
  loss limit; duplicate-entry guard; kill switch and square-off; the Knight Capital lesson.
  Traed: `docs/LLD.md` §3 (tick processing flowchart — gates before order) and §4 (risk
  flowchart), `docs/live-readiness.md`.
- `sd-broker-adapters` / `sdBrokerAdapters` — **Broker adapters and token lifecycles**
  (week 8). Adapter / anti-corruption layer; one internal vocabulary; capability
  differences between brokers; daily access-token expiry and refresh; where credentials
  live. Traed: `docs/LLD.md` §7 (broker abstraction class diagram, token lifecycle,
  credentials flow), `ARCHITECTURE.md` §9. Keep credential storage at the design level.
- `sd-rate-limits-breakers` / `sdRateLimitsBreakers` — **Rate limits, retries and circuit
  breakers** (week 8). Token bucket; client-side limiting; exponential backoff with jitter;
  retry storms; circuit breaker states; timeouts; what is safe to retry. Traed: broker
  historical-data and order API usage in `strategy-engine/app/services/data_providers/` and
  broker clients (search `429`, `rate`, `backoff`, `retry`).

### M5 · Reliability and operations

- `sd-failure-modes` / `sdFailureModes` — **Failure modes: fail open or fail closed**
  (week 9). Enumerating dependencies; fail-open versus fail-closed per dependency; graceful
  degradation; timeouts as the first defence; single points of failure accepted knowingly.
  Traed: `docs/HLD.md` §3 (single VM), `ARCHITECTURE.md` §14 (known latent issues),
  examples of deliberate fail-open/fail-closed choices in the engine and bridge.
- `sd-crash-recovery` / `sdCrashRecovery` — **Crash recovery and durable state** (week 9).
  In-memory versus durable state; write-ahead thinking; recovery on start-up from database
  plus broker; orphaned positions; why a cache is not a database. Traed: strategy
  restoration on engine start (search `restore`, `resume`, `orphan` in
  `strategy-engine/app/services/`), `docs/incidents/2026-07-16-paper-position-never-exited.md`.
- `sd-observability` / `sdObservability` — **Observability: logs, metrics and alerts**
  (week 9). Logs versus metrics versus traces; symptom-based alerts; thresholds that can
  fire at your scale; metric cardinality and its cost; dashboards for one operator. Traed:
  `docs/paper-trading-monitoring.md`, `docs/telegram-notifications.md`,
  `docs/plans/admin-command-center.md`, `RUNBOOK.md`.
- `sd-deploy-safety` / `sdDeploySafety` — **Deploying while the market is open** (week 10).
  Atomic releases and rollback; migrations that are backward compatible; restart-free
  versus restart-required changes; deploy gates on open positions; CI branch triggers.
  Traed: `RUNBOOK.md` (deploy), `deploy.sh`, `.github/workflows/`,
  `docs/plans/` (deploy reliability, if present).
- `sd-backup-dr` / `sdBackupDr` — **Backup, restore and disaster recovery** (week 10). RPO
  and RTO; full versus incremental; off-box copies; restore drills; separating dev and
  prod data paths; the single-server trade. Traed:
  `docs/incidents/2026-07-15-prod-db-wipe.md`, `docs/plans/backup-restore-design.md`,
  `RUNBOOK.md` (backup).

### M6 · Architecture judgment

- `sd-service-boundaries` / `sdServiceBoundaries` — **Service boundaries: monolith,
  services and the shared database** (week 11). What a boundary is for (deploy, scale,
  fail, team); modular monolith; shared database as coupling; polyglot costs; sync HTTP
  between services. Traed: `ARCHITECTURE.md` §1–3 (four services, one schema, auth split),
  `docs/HLD.md` §2.
- `sd-consistency` / `sdConsistency` — **Consistency: what must agree, and when** (week 11).
  Transactions; source of truth; dual writes and the outbox idea; eventual consistency;
  read-your-writes; which trading data needs which guarantee. Traed: MySQL as the record
  with Redis and DynamoDB beside it (`ARCHITECTURE.md` §3, `docs/HLD.md` §8).
- `sd-multi-tenancy` / `sdMultiTenancy` — **Multi-tenancy: from one user to many**
  (week 11). Tenant isolation of data, credentials, connections and limits; noisy
  neighbours; per-user versus shared upstream connections; fair scheduling of heavy jobs.
  Traed: `docs/multi-user-readiness.md`, one-bridge-per-user in `docs/HLD.md` §7,
  backtest pool `max_workers`.
- `sd-cost-capacity` / `sdCostCapacity` — **Cost and capacity: doing the arithmetic**
  (week 12). Back-of-envelope estimation; the unit that multiplies; serverless
  pay-per-message versus a fixed server; free tiers; finding the first bottleneck; budget
  alarms with thresholds that can fire. Traed: `docs/HLD.md` §3 and §7 (VM plus serverless
  bridge), `docs/pricing-strategy.md` if it has cost figures; describe costs qualitatively
  unless a figure is in the repository.
- `sd-security` / `sdSecurity` — **Security: trust boundaries and secrets** (week 12).
  Authentication versus authorisation; service-to-service auth (API key, signed JWT);
  secrets management and rotation; least privilege; why broker credentials raise the
  stakes. Traed: `ARCHITECTURE.md` §3 (auth split), `docs/LLD.md` §7 (credentials flow),
  `docs/HLD.md` §7 (per-user JWT on the WebSocket). Design level only — rule 4.
- `sd-architecture-story` / `sdArchitectureStory` — **Telling the architecture story**
  (week 12). Audience first (engineer, investor, co-founder); context → containers → one
  flow → two trade-offs → limits; architecture decision records; answering "why not X?";
  stating limits before being asked. Traed: `docs/HLD.md`, `docs/LLD.md`,
  `ARCHITECTURE.md`, `docs/pitch/` (honesty-and-gaps memo). The mechanics here should build
  an actual two-minute script for Traed.


---

# Part 2 — the standard canon (added when the course was broadened)

The first 34 topics grew out of how Traed is built. The reader then asked for the course to
cover **standard system design and its algorithms** in full, with real cases, using Traed
as an analogy only where it helps. Everything above still applies, with these changes.

## What changes for every topic (old and new)

- **Concept first.** A topic teaches the general idea as any good system-design text would.
  Real, well-documented systems carry the examples (Dynamo, Cassandra, Kafka, Raft/etcd,
  Redis, PostgreSQL, Bigtable/LSM stores, Google's Chubby and Spanner, CDNs, UPI, IRCTC,
  NSE). Traed is one example among them, not the frame.
- **`algorithms`** (new field, 2–4 entries): the named algorithms and data structures the
  design leans on, each `{ name, role, dsa? }`. `role` is one sentence on the job it does
  in THIS design. `dsa` is the id of the DSA lesson that teaches it, when one exists, and
  renders as a link — set it whenever a listed lesson genuinely covers the structure. DSA
  lesson ids you may link: `hashing`, `heaps`, `tries`, `lru`, `probabilistic` (Bloom
  filters, HyperLogLog, count-min), `skip-lists`, `ring-buffers`, `spatial` (quadtrees,
  k-d trees, geohash), `time-series`, `intervals`, `sorting`, `binary-search`,
  `balanced-trees`, `bst`, `graph-representations`, `bfs`, `dfs`, `toposort`,
  `shortest-paths`, `dsu`, `mst`, `segment-tree`, `fenwick`, `sliding-window`,
  `monotonic-deque`, `prefix-sums`, `string-algos`, `concurrency`, `amortised-latency`,
  `approximation`, `structure-choice`, `stacks-queues`, `linked-lists`, `bit-manipulation`,
  `state-machine-dp`. An algorithm with no DSA lesson (Raft, consistent hashing, Merkle
  trees, token bucket) is still listed, without `dsa`.
- It is fine, and wanted, to name and explain an algorithm inside `mechanics` — how
  consistent hashing places a key, how a token bucket refills, how Raft elects a leader —
  with a small worked number.

## What is different for the 35 new topics

- **The last `mechanics` entry is headed `In Traed's terms`** (not "Saying it about
  Traed"). 70–110 words. Map the idea onto Traed honestly: where Traed already does a small
  version of it, what the nearest thing is, or — often the true answer — why a one-server
  platform does not need it yet and what would make it necessary. Check any claim about
  what Traed does against the Traed repository; "Traed does not do this" needs no evidence
  but must be true.
- **`realWorld`: exactly 4, at least 3 `industry`.** A `yours` (Traed) case is optional and
  only when the repository really shows it.
- `why` (60–100 words) is about why an engineer needs the concept, with at most one
  sentence on Traed.
- Decision cases: at least one at Indian-internet scale (UPI, IRCTC Tatkal, a festival
  sale, an exchange at the open) and at least one small-team case, so the answer changes
  with scale.
- `tier` and `week` are as listed below.

## The new topic list

### M1 · Building blocks (tier 1)

- `sd-scaling-basics` / `sdScalingBasics` — **Scaling: from one server to many** (week 1).
  Vertical versus horizontal; stateless services and where state goes; the usual journey
  (one box → separate database → replicas → cache → load balancer → queue → shards);
  bottleneck hunting; why premature scaling costs.
- `sd-load-balancing` / `sdLoadBalancing` — **Load balancing** (week 1). Layer 4 versus
  layer 7; algorithms (round robin, weighted, least connections, power of two choices,
  hashing); health checks; sticky sessions; connection draining; the balancer as a single
  point of failure.
- `sd-dns-cdn` / `sdDnsCdn` — **DNS, CDNs and the edge** (week 2). Resolution and TTLs;
  DNS-based routing and failover; CDN caching, cache keys, invalidation; origin shielding;
  static versus dynamic; object storage behind a CDN.
- `sd-api-design` / `sdApiDesign` — **API design and protocols** (week 2). REST, gRPC,
  GraphQL in brief; polling, long polling, server-sent events, WebSocket; pagination
  (offset versus cursor); versioning; idempotent methods; timeouts and error contracts.

### M2 · Storage and data modelling (tier 2)

- `sd-data-models` / `sdDataModels` — **Choosing a data model** (week 3). Relational,
  document, key-value, wide-column, graph; normalise versus denormalise; access patterns
  first; polyglot persistence and its cost.
- `sd-indexes-btree-lsm` / `sdIndexesBtreeLsm` — **Indexes: B-trees and LSM trees**
  (week 3). What an index is; B-tree pages and write-ahead log; LSM memtable, SSTables,
  compaction; read versus write amplification; composite and covering indexes.
- `sd-transactions-isolation` / `sdTransactionsIsolation` — **Transactions and isolation
  levels** (week 4). ACID; read committed, repeatable read, serializable; MVCC; lost
  update, write skew, phantom; optimistic versus pessimistic locking; deadlocks.
- `sd-search-index` / `sdSearchIndex` — **Search and the inverted index** (week 4).
  Tokenising; postings lists; ranking in brief (TF-IDF/BM25 named, not derived); near
  real-time indexing; search as a derived store; Elasticsearch/Lucene as the example.

### M3 · Distributed data (tier 3)

- `sd-replication` / `sdReplication` — **Replication** (week 5). Leader–follower,
  multi-leader, leaderless; synchronous versus asynchronous; replication lag and its
  anomalies; failover and split brain.
- `sd-partitioning` / `sdPartitioning` — **Partitioning and sharding** (week 5). Range
  versus hash partitioning; hot keys and skew; secondary indexes across shards;
  rebalancing; cross-shard queries.
- `sd-consistent-hashing` / `sdConsistentHashing` — **Consistent hashing** (week 5). The
  ring; why `hash mod n` reshuffles everything; virtual nodes; rendezvous hashing; bounded
  load; uses (caches, Dynamo, load balancers).
- `sd-cap-quorums` / `sdCapQuorums` — **CAP, PACELC and quorums** (week 6). What CAP
  actually says; PACELC; linearizability versus eventual; quorum reads and writes
  (R + W > N); sloppy quorums; tunable consistency.
- `sd-distributed-transactions` / `sdDistributedTransactions` — **Distributed
  transactions: 2PC, sagas and the outbox** (week 6). Two-phase commit and its blocking
  problem; sagas with compensation; transactional outbox; try-confirm-cancel; when to
  avoid needing one.
- `sd-distributed-ids` / `sdDistributedIds` — **Unique IDs at scale** (week 6).
  Auto-increment limits; UUID versions; Snowflake-style (time + machine + sequence);
  ULID/UUIDv7; clock rollback; why sortable ids matter to indexes.

### M4 · Coordination and time (tier 4)

- `sd-logical-clocks` / `sdLogicalClocks` — **Ordering events: logical clocks** (week 7).
  Why wall clocks fail; Lamport timestamps; vector clocks and concurrent writes;
  last-write-wins and what it loses; hybrid logical clocks; CRDTs in one paragraph.
- `sd-consensus` / `sdConsensus` — **Consensus and Raft** (week 7). What consensus
  guarantees; leader election with terms; log replication and commit by majority; why 3 or
  5 nodes; where it is used (etcd, ZooKeeper, Kafka's controller); Paxos named only.
- `sd-locks-leases` / `sdLocksLeases` — **Distributed locks, leases and fencing**
  (week 8). Why a lock with a timeout is a lease; the paused-process problem; fencing
  tokens; leader election on top of a lock service; Redis-style locks and their limits.
- `sd-gossip-failure-detection` / `sdGossipFailureDetection` — **Gossip and failure
  detection** (week 8). Heartbeats and timeouts; why "dead" is a guess; gossip
  dissemination; phi-accrual detectors; membership (SWIM); flapping.
- `sd-merkle-antientropy` / `sdMerkleAntientropy` — **Merkle trees and repairing
  replicas** (week 8). Hash trees; comparing two replicas cheaply; read repair, hinted
  handoff, anti-entropy; the same idea in Git and blockchains.

### M5 · Messaging and streams (tier 5)

- `sd-queues-and-logs` / `sdQueuesAndLogs` — **Message queues and logs** (week 9). Queue
  versus log; Kafka's partitions, offsets and consumer groups; ordering guarantees;
  dead-letter queues; retention; when a queue is the wrong tool.
- `sd-batch-and-cdc` / `sdBatchAndCdc` — **Batch, streams and change data capture**
  (week 10). Batch versus stream; the MapReduce idea; lambda versus kappa; CDC from the
  database log; derived data and reprocessing.

### M6 · Algorithms that scale (tier 6)

- `sd-bloom-filters` / `sdBloomFilters` — **Bloom filters** (week 11). Definite no,
  probable yes; bits and hash functions; false-positive rate and sizing; no deletion and
  counting variants; uses (LSM reads, caches, crawlers).
- `sd-cardinality-topk` / `sdCardinalityTopk` — **Counting at scale: HyperLogLog and
  count-min sketch** (week 11). Distinct counts in kilobytes; heavy hitters and top-K;
  error bounds in plain words; mergeability; where exact counting is still right.
- `sd-geo-indexing` / `sdGeoIndexing` — **Geospatial indexing** (week 11). Nearby search;
  geohash and its edge problem; quadtrees; Google's S2 and Uber's H3 named; moving objects.
- `sd-typeahead-tries` / `sdTypeaheadTries` — **Typeahead and tries** (week 12). Prefix
  lookup; top-k per prefix; caching per prefix; offline builds versus live updates;
  ranking freshness.
- `sd-timers-and-scheduling` / `sdTimersAndScheduling` — **Timers and job scheduling**
  (week 12). Min-heap of deadlines; timing wheels; delayed queues; cron at scale and
  exactly-one execution; missed-run policy.

### M10 · Classic designs (tier 10)

These are end-to-end design walk-throughs. Their four concept `mechanics` entries follow
the design method in order — (1) requirements and scale, with rough numbers; (2) API and
data model; (3) the high-level design; (4) the hard part, where the design is won or lost —
then (5) `In Traed's terms`. `algorithms` lists what the design uses and links back to DSA.

- `sd-design-method` / `sdDesignMethod` — **A method for any design question** (week 19).
  Requirements (functional, non-functional) → estimates → API → data model → high-level
  design → deep dives → bottlenecks and failure. Here the four entries teach the method
  itself, with a small running example.
- `sd-design-url-shortener` / `sdDesignUrlShortener` — **Design a URL shortener**
  (week 19). Id generation and base-62; read-heavy caching; redirects; custom aliases;
  expiry; analytics as a stream.
- `sd-design-key-value-store` / `sdDesignKeyValueStore` — **Design a distributed
  key-value store** (week 19). The Dynamo design: partitioning by consistent hashing,
  replication, quorums, vector clocks, gossip, Merkle repair — the module 3 and 4 ideas
  assembled.
- `sd-design-news-feed` / `sdDesignNewsFeed` — **Design a news feed** (week 19). Fan-out
  on write versus on read; the celebrity problem; ranking; feed cache.
- `sd-design-chat` / `sdDesignChat` — **Design a chat system** (week 20). Persistent
  connections; message ordering and ids; delivery receipts; presence; offline delivery;
  group fan-out.
- `sd-design-notifications` / `sdDesignNotifications` — **Design a notification system**
  (week 20). Channels (push, SMS, email); queues per channel; retries and de-duplication;
  user preferences and rate caps; provider failover.
- `sd-design-payments` / `sdDesignPayments` — **Design a payment system** (week 20).
  UPI-style flow in outline; idempotency keys; double-entry ledger; state machine for a
  payment; reconciliation with the bank; never losing or doubling money.
- `sd-design-ticket-booking` / `sdDesignTicketBooking` — **Design a ticket booking system**
  (week 20). IRCTC Tatkal as the example: inventory contention, seat holds with expiry,
  queueing the surge, fairness, payment timeout.
- `sd-design-stock-exchange` / `sdDesignStockExchange` — **Design a stock exchange**
  (week 20). Gateway → sequencer → matching engine → market-data publisher; single-threaded
  matching; order book structures; determinism and replay; pre-trade risk. Here a `yours`
  case on how a retail platform sits on the other side of this design is welcome.

/**
 * Trading system design — the third subject.
 *
 * System design taught through one domain (financial markets) and one worked
 * example the reader owns (Traed). A MODULE is a `Tier` in the shared shape,
 * so every view, gate, badge and the Arena work unchanged.
 *
 * There is nothing to animate and nothing to code here: like DSA's Tier 5,
 * every topic's Solve mode is `cases[]` — decision cases graded on the pick,
 * the trade accepted, the failure mode signed up for and what to measure.
 *
 * Every module sets `entry: true`. The order is a suggestion, not a gate:
 * the reader may need "reconciliation" for a conversation tomorrow without
 * having finished market data first.
 *
 * To add a topic: one file under `topics/`, import it here, add it to its
 * module's `topics` AND to one stage of that module's `orientation.arc`.
 * The writing brief is docs/systems/writing-brief.md.
 */
import type { Phase, Tier, Topic } from "../types.ts";

import { sdTradeLifecycle } from "./topics/sd-trade-lifecycle.ts";
import { sdPlatformAnatomy } from "./topics/sd-platform-anatomy.ts";
import { sdOrderBookMatching } from "./topics/sd-order-book-matching.ts";
import { sdLatencyBudgets } from "./topics/sd-latency-budgets.ts";
import { sdTimeAndSessions } from "./topics/sd-time-and-sessions.ts";

import { sdFeedIngestion } from "./topics/sd-feed-ingestion.ts";
import { sdFanoutBackpressure } from "./topics/sd-fanout-backpressure.ts";
import { sdCandleAggregation } from "./topics/sd-candle-aggregation.ts";
import { sdTimeseriesStorage } from "./topics/sd-timeseries-storage.ts";
import { sdCaching } from "./topics/sd-caching.ts";
import { sdFeedHealth } from "./topics/sd-feed-health.ts";

import { sdEventLoop } from "./topics/sd-event-loop.ts";
import { sdRuleEngine } from "./topics/sd-rule-engine.ts";
import { sdStateMachines } from "./topics/sd-state-machines.ts";
import { sdBacktestLiveParity } from "./topics/sd-backtest-live-parity.ts";
import { sdDeterminismReplay } from "./topics/sd-determinism-replay.ts";
import { sdIsolationAndJobs } from "./topics/sd-isolation-and-jobs.ts";

import { sdOrderManagement } from "./topics/sd-order-management.ts";
import { sdIdempotency } from "./topics/sd-idempotency.ts";
import { sdReconciliation } from "./topics/sd-reconciliation.ts";
import { sdPretradeRisk } from "./topics/sd-pretrade-risk.ts";
import { sdBrokerAdapters } from "./topics/sd-broker-adapters.ts";
import { sdRateLimitsBreakers } from "./topics/sd-rate-limits-breakers.ts";

import { sdFailureModes } from "./topics/sd-failure-modes.ts";
import { sdCrashRecovery } from "./topics/sd-crash-recovery.ts";
import { sdObservability } from "./topics/sd-observability.ts";
import { sdDeploySafety } from "./topics/sd-deploy-safety.ts";
import { sdBackupDr } from "./topics/sd-backup-dr.ts";

import { sdServiceBoundaries } from "./topics/sd-service-boundaries.ts";
import { sdConsistency } from "./topics/sd-consistency.ts";
import { sdMultiTenancy } from "./topics/sd-multi-tenancy.ts";
import { sdCostCapacity } from "./topics/sd-cost-capacity.ts";
import { sdSecurity } from "./topics/sd-security.ts";
import { sdArchitectureStory } from "./topics/sd-architecture-story.ts";

export { GLOSSARY } from "./glossary.ts";

export const MODULES: Tier[] = [
  {
    id: 1,
    name: "The market and the machine",
    tagline: "What a trading platform is for, before how it is built.",
    entry: true,
    topics: [
      sdTradeLifecycle,
      sdPlatformAnatomy,
      sdOrderBookMatching,
      sdLatencyBudgets,
      sdTimeAndSessions,
    ],
    orientation: {
      overview:
        "A trading platform is a machine bolted onto a market, and the market sets the rules. An order is a promise that travels from a trader through a broker to an exchange and comes back as a fill; prices exist only as a queue of other people's orders; the exchange opens and closes on a timetable; and everything is stamped with a time that different systems measure differently. This module draws that map first. Once you can trace one order end to end and name every box it passes through, the rest of the course is a closer look at each box.",
      stakes:
        "Without the map, every later design choice is argued in the abstract. You cannot say why a platform needs reconciliation, a risk gate or a feed watchdog until you can say what the broker and the exchange do without asking you.",
      recognise: [
        {
          signal: "Somebody asks 'what happens when I press Buy?'",
          reach: "Trace the order lifecycle: validate, route to the broker, exchange acknowledges, partial or full fill, position and ledger update.",
        },
        {
          signal: "A design conversation starts with a technology ('should we use Kafka?').",
          reach: "Step back to the anatomy: which box is this — market data, strategy, order management, risk or storage — and what does that box have to guarantee?",
        },
        {
          signal: "A backtest fills every order at the price on the chart.",
          reach: "Ask how the order book would really have filled it: queue position, spread, gaps and partial fills.",
        },
        {
          signal: "'It needs to be fast.'",
          reach: "Write a latency budget: which hop, how many milliseconds, and what the strategy loses if it is slower.",
        },
        {
          signal: "Two systems disagree about which candle a trade belongs to.",
          reach: "Check the clock and the session definition before the logic: time zone, bar-open versus bar-close stamps, exchange hours.",
        },
      ],
      arc: [
        {
          stage: "Follow one order",
          topics: ["sd-trade-lifecycle"],
          point: "Everything a platform does is in service of moving one order through its states correctly. Learn the states first.",
        },
        {
          stage: "Name the boxes",
          topics: ["sd-platform-anatomy"],
          point: "Market data in, decisions in the middle, orders out, a record of all of it. Every trading system, from a hedge fund's to Traed, is these boxes at a different size.",
        },
        {
          stage: "Respect the venue",
          topics: ["sd-order-book-matching"],
          point: "The exchange's matching rules decide what price you actually get, which is what an honest simulator has to imitate.",
        },
        {
          stage: "Budget the two scarce things",
          topics: ["sd-latency-budgets", "sd-time-and-sessions"],
          point: "Speed and time are both measured, not assumed. One is a budget you spend per hop; the other is a convention every component has to share.",
        },
      ],
      outcomes: [
        "Trace an order from click to fill and name the system that owns each state.",
        "Draw the five-box anatomy of any trading platform and place Traed's three services on it.",
        "Explain price-time priority and why a backtest fill is an estimate, not a fact.",
        "State a latency budget for a minute-bar strategy and say honestly why it is not a high-frequency one.",
        "Spot a time-zone or bar-stamp mismatch from the symptom alone.",
      ],
      inTheWild: [
        {
          system: "NSE and MCX",
          use: "Both run electronic order books matched by price, then time. Brokers such as Zerodha and Groww sit between retail platforms and the exchange and expose the order states a platform sees.",
        },
        {
          system: "Traed",
          use: "A Laravel web app, a Python strategy engine, a serverless tick relay for dashboards and shared MySQL and Redis: the same five boxes at the size one founder can run.",
        },
      ],
    },
  },
  {
    id: 2,
    name: "Market data pipelines",
    tagline: "Ticks in, candles out, and knowing when the feed has quietly died.",
    entry: true,
    topics: [
      sdFeedIngestion,
      sdFanoutBackpressure,
      sdCandleAggregation,
      sdTimeseriesStorage,
      sdCaching,
      sdFeedHealth,
    ],
    orientation: {
      overview:
        "Market data is a stream that never waits for you. A broker pushes price updates (ticks) down one long-lived connection; the platform has to take them in, share them out to every strategy and screen that asked, squeeze them into candles, keep years of them, and serve them again quickly. Each of those steps has its own classic design problem — and its own classic failure, the worst of which is silent: the stream stops and nothing errors. This module walks the pipeline in the order the data travels.",
      stakes:
        "A strategy is only as good as the prices it sees. Most real incidents in a trading platform are data incidents — a stale feed, a wrong candle, an evicted cache — not clever logic bugs.",
      recognise: [
        {
          signal: "One upstream connection, many consumers.",
          reach: "Publish/subscribe with an explicit subscription table; decide who pays when one consumer is slow.",
        },
        {
          signal: "Cost or load grows with messages, not users.",
          reach: "Count messages per tick per subscriber. Batch per connection, or merge updates over a short window (conflation).",
        },
        {
          signal: "'The 15-minute candle disagrees with the broker's chart.'",
          reach: "Check the window definition: which timestamp opens the bar, when it is declared closed, and what happens to a late tick.",
        },
        {
          signal: "Queries are always 'this symbol, this time range'.",
          reach: "Time-series storage: key by symbol and time, partition by date, keep hot data close and old data cheap.",
        },
        {
          signal: "No errors, no data.",
          reach: "A liveness check that measures the data itself: time since the last tick per instrument, during market hours only.",
        },
      ],
      arc: [
        {
          stage: "Get it in",
          topics: ["sd-feed-ingestion"],
          point: "A feed handler owns one fragile, long-lived connection and turns a broker's format into the platform's own.",
        },
        {
          stage: "Share it out",
          topics: ["sd-fanout-backpressure"],
          point: "Fan-out multiplies everything: messages, cost and the damage one slow consumer can do.",
        },
        {
          stage: "Shape it",
          topics: ["sd-candle-aggregation"],
          point: "A candle is a small streaming computation with a window, and the window's edges are where the bugs live.",
        },
        {
          stage: "Keep it and serve it",
          topics: ["sd-timeseries-storage", "sd-caching"],
          point: "Store by how it is read; cache what is expensive — and never let a cache be the only copy of something you cannot rebuild.",
        },
        {
          stage: "Know it is alive",
          topics: ["sd-feed-health"],
          point: "Silence is the failure mode. Health is measured from the data, not from the connection.",
        },
      ],
      outcomes: [
        "Design a feed handler with reconnect, resubscribe and a normalised tick format.",
        "Calculate the message count of a fan-out design and reduce it by batching or conflation.",
        "Define a candle window precisely enough that two systems agree on every bar.",
        "Choose a storage layout for tick, candle and option-chain history from the queries it must serve.",
        "Explain what may and may not live only in a cache.",
        "Design a staleness watchdog that does not page at night or on holidays.",
      ],
      inTheWild: [
        {
          system: "Exchange feeds",
          use: "Exchanges publish order-by-order feeds with sequence numbers so a receiver can detect a gap and ask for a replay. Broker retail feeds are simpler snapshots over a WebSocket.",
        },
        {
          system: "Traed's two tick paths",
          use: "The engine reads ticks from its own direct connection to the broker, because risk exits depend on them. A serverless bridge fans the same prices out to browser dashboards and stays as the engine's fallback.",
        },
      ],
    },
  },
  {
    id: 3,
    name: "The strategy engine",
    tagline: "One event at a time, the same rules in backtest and live.",
    entry: true,
    topics: [
      sdEventLoop,
      sdRuleEngine,
      sdStateMachines,
      sdBacktestLiveParity,
      sdDeterminismReplay,
      sdIsolationAndJobs,
    ],
    orientation: {
      overview:
        "The engine is the part that decides. It receives events — a tick, a closed candle, a fill — runs the user's rules against them, and emits orders. Three properties make an engine trustworthy. It handles events in one clear order, so state is never half-updated. It runs the same rule code whether the events come from history or from the live market, so a backtest means something. And heavy work, such as a two-year backtest, cannot starve or crash the loop that is watching real positions. This module is about earning those three properties.",
      stakes:
        "If backtest and live disagree, every number the platform shows is decoration. If a backtest can take down the live loop, the platform is unsafe to use during market hours.",
      recognise: [
        {
          signal: "State is touched from several threads or tasks and 'sometimes' goes wrong.",
          reach: "A single writer: one loop owns the state and everything else sends it events.",
        },
        {
          signal: "Users describe behaviour as data ('when RSI crosses 30 and price is above VWAP').",
          reach: "A rule engine: parse the rules into a tree once, evaluate the tree per event, share one evaluator everywhere.",
        },
        {
          signal: "A flag soup: `is_open`, `is_exiting`, `has_pending_order`.",
          reach: "An explicit state machine with named states and a table of legal transitions.",
        },
        {
          signal: "'It worked in the backtest.'",
          reach: "Look for the second implementation. Parity comes from one code path fed by different event sources.",
        },
        {
          signal: "The same inputs give different results on two runs.",
          reach: "Hunt the hidden input: wall-clock time, unordered iteration, a shared cache, random seeds.",
        },
        {
          signal: "A batch job and a real-time loop share a process.",
          reach: "Isolate: a separate process or queue with its own memory and a limit on how many run at once.",
        },
      ],
      arc: [
        {
          stage: "One thing at a time",
          topics: ["sd-event-loop"],
          point: "A single-threaded event loop trades raw throughput for the ability to reason about state.",
        },
        {
          stage: "Rules as data",
          topics: ["sd-rule-engine", "sd-state-machines"],
          point: "The user's strategy is a rule tree; the position's life is a state machine. Both replace scattered `if` statements with something you can draw.",
        },
        {
          stage: "Make the backtest mean something",
          topics: ["sd-backtest-live-parity", "sd-determinism-replay"],
          point: "One evaluator, fed by replayable events, giving the same answer every time. Anything less and the backtest is a different product.",
        },
        {
          stage: "Keep heavy work away from live",
          topics: ["sd-isolation-and-jobs"],
          point: "Bulkheads: the long, memory-hungry job gets its own process and queue so its failure stays its own.",
        },
      ],
      outcomes: [
        "Explain why a single-process event loop is a defensible choice and where it stops scaling.",
        "Sketch a condition tree for a real strategy and say where it is evaluated.",
        "Draw the state machine for a strategy run and for a broker order.",
        "List the ways backtest and live drift apart and the structural fix for each.",
        "Find the source of non-determinism in a replay.",
        "Design job isolation with a queue, a concurrency limit and progress reporting.",
      ],
      inTheWild: [
        {
          system: "LMAX Disruptor",
          use: "A well-known exchange design that runs all business logic on one thread and gets its speed from never sharing state between threads.",
        },
        {
          system: "Traed's engine",
          use: "A single FastAPI process runs paper and live strategies in one event loop; backtests are pushed into a separate process pool so they cannot stall it.",
        },
      ],
    },
  },
  {
    id: 4,
    name: "Orders, risk and brokers",
    tagline: "Where a bug stops being a wrong number and becomes real money.",
    entry: true,
    topics: [
      sdOrderManagement,
      sdIdempotency,
      sdReconciliation,
      sdPretradeRisk,
      sdBrokerAdapters,
      sdRateLimitsBreakers,
    ],
    orientation: {
      overview:
        "Everything before this module could be wrong and cost nothing. This is the boundary where the platform talks to a broker with a real account behind it. The design ideas here all answer one uncomfortable fact: the network between you and the broker can fail at any moment, and afterwards you do not know whether your order went through. So orders carry identities that make a retry safe, the broker's records are treated as the truth and compared with your own, every order passes a risk gate before it leaves, and each broker's oddities are kept behind one interface.",
      stakes:
        "A duplicate order, a position the platform has forgotten, or a stop that never fired are the failures that end a trading product. They are prevented by design, not by care.",
      recognise: [
        {
          signal: "A request timed out and nobody knows whether it happened.",
          reach: "An idempotency key the broker can de-duplicate on, then query before retrying.",
        },
        {
          signal: "The platform and the broker disagree on a position.",
          reach: "The broker is right. Reconcile on a schedule and on every restart; decide in advance what to do with each kind of difference.",
        },
        {
          signal: "One parent decision becomes several exchange orders.",
          reach: "An order management model with parent and child orders and explicit partial-fill handling.",
        },
        {
          signal: "'Can a bug place a hundred lots?'",
          reach: "Pre-trade checks that sit outside the strategy code: size caps, capital checks, a daily loss limit, a kill switch.",
        },
        {
          signal: "`if broker == 'kite'` appears in business logic.",
          reach: "An adapter per broker behind one interface that speaks the platform's own vocabulary.",
        },
        {
          signal: "The broker answers 429 or slows down.",
          reach: "Client-side rate limiting, retries with backoff and jitter, and a circuit breaker that stops calling for a while.",
        },
      ],
      arc: [
        {
          stage: "Model the order",
          topics: ["sd-order-management"],
          point: "An order is a small state machine the broker advances and you observe. Partial fills are the normal case, not the edge case.",
        },
        {
          stage: "Survive the unreliable network",
          topics: ["sd-idempotency", "sd-reconciliation"],
          point: "Make retries harmless, then assume you still got it wrong and compare with the broker.",
        },
        {
          stage: "Put a gate in front",
          topics: ["sd-pretrade-risk"],
          point: "Risk checks are a separate layer precisely so a strategy bug cannot talk its way past them.",
        },
        {
          stage: "Tame the broker",
          topics: ["sd-broker-adapters", "sd-rate-limits-breakers"],
          point: "Hide each broker's vocabulary, tokens and limits behind one interface, and be a polite client when it struggles.",
        },
      ],
      outcomes: [
        "Model parent and child orders with partial fills and cancellations.",
        "Design an order submission that is safe to retry.",
        "Write a reconciliation policy: what is compared, how often, and what happens on each mismatch.",
        "List the pre-trade checks a retail algo platform needs and where they must run.",
        "Define a broker interface and say what belongs behind it.",
        "Choose between retry, backoff, rate limit and circuit breaker for a given broker failure.",
      ],
      inTheWild: [
        {
          system: "Knight Capital, 2012",
          use: "A deployment error sent unintended orders for about 45 minutes and lost roughly $440 million — the standard case for pre-trade limits and kill switches that live outside the trading logic.",
        },
        {
          system: "Traed's live path",
          use: "Kite, Groww and Paytm Money sit behind a broker abstraction; live positions are reconciled against the broker's own records.",
        },
      ],
    },
  },
  {
    id: 5,
    name: "Reliability and operations",
    tagline: "It will fail during market hours. Decide now what happens next.",
    entry: true,
    topics: [
      sdFailureModes,
      sdCrashRecovery,
      sdObservability,
      sdDeploySafety,
      sdBackupDr,
    ],
    orientation: {
      overview:
        "Reliability is not the absence of failure; it is having decided beforehand what each failure does. A trading platform has an unusual shape here: it must be at its best during six and a quarter fixed hours a day, an outage while a position is open has a direct money cost, and a restart must find its way back to positions it no longer remembers. This module covers the decisions that make failure boring — which way each component fails, how state survives a crash, how you find out, how you ship a change without touching a live position, and how you get the data back.",
      stakes:
        "Features are judged on a good day; a platform is judged on its worst one. One lost position or one unrecoverable database is remembered longer than any feature.",
      recognise: [
        {
          signal: "A dependency is down and the code has to choose.",
          reach: "Decide fail-open or fail-closed per dependency: does stopping protect money, or does continuing?",
        },
        {
          signal: "'What happens if the process restarts right now?'",
          reach: "Durable state plus a recovery routine that rebuilds from the database and the broker, not from memory.",
        },
        {
          signal: "The first report of a problem comes from a user.",
          reach: "Alerts on symptoms the user feels, with thresholds that can actually fire at your scale.",
        },
        {
          signal: "A deploy is needed at 11 a.m. on a trading day.",
          reach: "Separate what can be changed live from what restarts the engine, and gate the second on open positions.",
        },
        {
          signal: "'We have backups.'",
          reach: "Ask when one was last restored. State the recovery point and recovery time you can actually meet.",
        },
      ],
      arc: [
        {
          stage: "Choose how to fail",
          topics: ["sd-failure-modes"],
          point: "Every dependency gets an answer to 'and if it is down?' — written before the outage, not during it.",
        },
        {
          stage: "Come back correctly",
          topics: ["sd-crash-recovery"],
          point: "A restart is a normal event. Anything that must survive it lives somewhere durable.",
        },
        {
          stage: "See it",
          topics: ["sd-observability"],
          point: "Logs, metrics and alerts are a product with a cost; the test is whether you learn of a failure before your user does.",
        },
        {
          stage: "Change it safely, and get it back",
          topics: ["sd-deploy-safety", "sd-backup-dr"],
          point: "Most outages are self-inflicted by a change. The rest are the day you needed the backup.",
        },
      ],
      outcomes: [
        "Classify each dependency of a trading loop as fail-open or fail-closed and defend the choice.",
        "Design restart recovery for an engine holding open positions.",
        "Choose three alerts that would have caught a real incident, with thresholds.",
        "Design a deploy pipeline that cannot interrupt a live position.",
        "State RPO and RTO for a single-server platform and what it would cost to improve them.",
      ],
      inTheWild: [
        {
          system: "Exchange-mandated disaster recovery",
          use: "Exchanges and large brokers run live drills from a second site because a recovery plan that has never been exercised is a guess.",
        },
        {
          system: "Traed's incident record",
          use: "A wiped production database, a position orphaned by a restart and a silent tick feed are each written up in the repository with the design change that followed.",
        },
      ],
    },
  },
  {
    id: 6,
    name: "Architecture judgment",
    tagline: "The trade-offs you defend out loud.",
    entry: true,
    topics: [
      sdServiceBoundaries,
      sdConsistency,
      sdMultiTenancy,
      sdCostCapacity,
      sdSecurity,
      sdArchitectureStory,
    ],
    orientation: {
      overview:
        "The earlier modules are about parts. This one is about the shape of the whole and about explaining it. Where do you cut a system into services, and what does sharing one database buy and cost? Which data must agree instantly and which may lag? What changes when the second user arrives? What does it cost per month, and what breaks first as it grows? Who is allowed to do what? None of these has a right answer — each has an answer that is right for a stated size, team and budget. The last topic turns all of it into something you can say in two minutes to an engineer, an investor or a co-founder.",
      stakes:
        "People judge a system by how its builder talks about its trade-offs. 'We chose X because Y, we give up Z, and we would revisit it when W' is the sentence this module teaches.",
      recognise: [
        {
          signal: "'Should this be a microservice?'",
          reach: "Ask what must be deployed, scaled or allowed to fail separately. If nothing, it is a module, not a service.",
        },
        {
          signal: "Two stores must both be updated.",
          reach: "Name the source of truth, write there first, and derive the other — or accept and repair a temporary mismatch.",
        },
        {
          signal: "Everything was built for one user.",
          reach: "Find every place a user's identity is implied instead of passed: caches, connections, credentials, limits.",
        },
        {
          signal: "The bill or the load suddenly jumped.",
          reach: "Find the unit that multiplies — per message, per user, per symbol — and do the arithmetic on paper.",
        },
        {
          signal: "A service trusts a request because it came from 'inside'.",
          reach: "Authenticate every hop and give each credential the least it needs.",
        },
        {
          signal: "'So how does it work?'",
          reach: "Context, boxes, one flow, the two hardest trade-offs, the known limits — in that order.",
        },
      ],
      arc: [
        {
          stage: "Cut the system",
          topics: ["sd-service-boundaries", "sd-consistency"],
          point: "Boundaries and consistency are one decision seen twice: where you cut is where data has to cross.",
        },
        {
          stage: "Grow it",
          topics: ["sd-multi-tenancy", "sd-cost-capacity"],
          point: "More users and more money. Both are arithmetic you can do before they arrive.",
        },
        {
          stage: "Guard it",
          topics: ["sd-security"],
          point: "A platform that holds broker credentials is a target well before it is large.",
        },
        {
          stage: "Say it",
          topics: ["sd-architecture-story"],
          point: "An architecture nobody can explain cannot be reviewed, funded or handed over.",
        },
      ],
      outcomes: [
        "Defend 'three services, one database' for a small team and say when you would split it.",
        "Pick a consistency approach for orders, positions, charts and reports separately.",
        "Audit a single-user design for multi-user hazards.",
        "Estimate monthly cost and the first bottleneck from a handful of measured numbers.",
        "Describe the trust boundaries of a trading platform and what crosses each.",
        "Explain Traed's architecture in two minutes, including what it deliberately does not do yet.",
      ],
      inTheWild: [
        {
          system: "Architecture decision records",
          use: "Many engineering teams keep a short dated note per major decision — context, choice, consequences — so the reasoning outlives the people.",
        },
        {
          system: "Traed's design docs",
          use: "The repository's ARCHITECTURE, HLD and LLD documents record the current design, with each diagram traceable to a file path.",
        },
      ],
    },
  },
];

/**
 * A 12-week plan: two weeks per module. Each week's deliverable is something
 * said or drawn about Traed, because the point of the course is to be able to
 * talk about it.
 */
export const PHASES: Phase[] = [
  {
    id: 1,
    name: "Draw the map",
    weeks: [1, 2],
    focus: [
      {
        week: 1,
        focus: "Order lifecycle and platform anatomy",
        deliverable: "Trace one Traed live order from the Vue button to the broker fill on a single page",
      },
      {
        week: 2,
        focus: "Order books, latency budgets, time and sessions",
        deliverable: "Write Traed's latency budget for a 1-minute strategy, hop by hop",
      },
    ],
    anchor:
      "Draw the five-box diagram of Traed from memory, then check it against docs/HLD.md and correct it.",
  },
  {
    id: 2,
    name: "Follow the data",
    weeks: [3, 4],
    focus: [
      {
        week: 3,
        focus: "Feed ingestion, fan-out and backpressure, candle aggregation",
        deliverable: "Work out messages per second through the dashboard tick relay for 50 symbols and 3 browser tabs",
      },
      {
        week: 4,
        focus: "Time-series storage, caching, feed health",
        deliverable: "Explain the silent-feed incident and the watchdog that now catches it, in 90 seconds",
      },
    ],
    anchor:
      "Follow one NIFTY tick from the broker's socket to a closed 5-minute candle in a running strategy, naming every component and every place it could be lost.",
  },
  {
    id: 3,
    name: "Open the engine",
    weeks: [5, 6],
    focus: [
      {
        week: 5,
        focus: "Event loop, rule engine, state machines",
        deliverable: "Draw the strategy-run state machine and the order state machine side by side",
      },
      {
        week: 6,
        focus: "Backtest/live parity, determinism and replay, isolation and jobs",
        deliverable: "List three ways Traed's backtest and live could drift, and the mechanism that stops each",
      },
    ],
    anchor:
      "Explain to a sceptic why a Traed backtest result should be believed, and exactly where it should not.",
  },
  {
    id: 4,
    name: "Touch real money",
    weeks: [7, 8],
    focus: [
      {
        week: 7,
        focus: "Order management, idempotency, reconciliation",
        deliverable: "Write the reconciliation policy as a table: difference found, action taken",
      },
      {
        week: 8,
        focus: "Pre-trade risk, broker adapters, rate limits and circuit breakers",
        deliverable: "List every check an order passes before it reaches the broker, in order",
      },
    ],
    anchor:
      "Answer 'what stops Traed from placing an order twice, or forgetting a position?' without notes.",
  },
  {
    id: 5,
    name: "Plan for the bad day",
    weeks: [9, 10],
    focus: [
      {
        week: 9,
        focus: "Failure modes, crash recovery, observability",
        deliverable: "For each engine dependency, write fail-open or fail-closed and one sentence why",
      },
      {
        week: 10,
        focus: "Deploy safety, backup and disaster recovery",
        deliverable: "State Traed's RPO and RTO today and the single cheapest improvement to each",
      },
    ],
    anchor:
      "Retell one real Traed incident as a blameless postmortem: timeline, cause, what changed in the design.",
  },
  {
    id: 6,
    name: "Defend the design",
    weeks: [11, 12],
    focus: [
      {
        week: 11,
        focus: "Service boundaries, consistency, multi-tenancy",
        deliverable: "Write one architecture decision record for 'three services, one MySQL schema'",
      },
      {
        week: 12,
        focus: "Cost and capacity, security, telling the architecture story",
        deliverable: "Record yourself explaining Traed in two minutes; listen for every claim you could not back up",
      },
    ],
    anchor:
      "Give the two-minute explanation, then take five hard follow-up questions and answer each with a trade-off, not a feature.",
  },
];

export const RESOURCES = [
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    note: "The standard reference for storage, streams, replication and consistency (M2, M3, M6).",
  },
  {
    title: "Trading and Exchanges",
    author: "Larry Harris",
    note: "How orders, brokers and exchanges actually work, written for non-specialists (M1, M4).",
  },
  {
    title: "The LMAX Architecture",
    author: "Martin Fowler",
    note: "A free article on a single-threaded, event-sourced exchange design (M3).",
  },
  {
    title: "Release It!",
    author: "Michael T. Nygard",
    note: "Circuit breakers, bulkheads, timeouts and the failure stories behind them (M4, M5).",
  },
  {
    title: "Site Reliability Engineering",
    author: "Betsy Beyer and colleagues at Google",
    note: "Free online. Alerting on symptoms, error budgets and blameless postmortems (M5).",
  },
];

export const TAGLINE =
  "12 weeks · 6 modules · 34 design decisions, each worked through Traed";

export const ALL_TOPICS: Topic[] = MODULES.flatMap((m) => m.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

/**
 * System design — the third subject.
 *
 * Standard system design and the algorithms it leans on, taught with real
 * cases: Dynamo, Kafka, Raft, PostgreSQL, CDNs, UPI, IRCTC, NSE. Traed (the
 * reader's own trading platform) is one recurring example among them, and M9
 * is the domain module about it. A MODULE is a `Tier` in the shared shape, so
 * every view, gate, badge and the Arena work unchanged.
 *
 * There is nothing to animate and nothing to code here: like DSA's Tier 5,
 * every lesson's Solve mode is `cases[]` — decision cases graded on the pick,
 * the trade accepted, the failure mode signed up for and what to measure.
 *
 * Every module sets `entry: true`. The order is a suggestion, not a gate:
 * the reader may need "consensus" for a conversation tomorrow without having
 * finished storage first.
 *
 * Data-flow films are attached from `./films.ts` by `withFilm`, so a lesson
 * file never sets `conceptFilm` itself.
 *
 * To add a topic: one file under `topics/`, import it here, add it to its
 * module's `topics` AND to one stage of that module's `orientation.arc`.
 * The writing brief is docs/systems/writing-brief.md.
 */
import type { Phase, Tier, Topic } from "../types.ts";
import { FILMS } from "./films.ts";

// M1 Building blocks
import { sdScalingBasics } from "./topics/sd-scaling-basics.ts";
import { sdLoadBalancing } from "./topics/sd-load-balancing.ts";
import { sdDnsCdn } from "./topics/sd-dns-cdn.ts";
import { sdApiDesign } from "./topics/sd-api-design.ts";
import { sdLatencyBudgets } from "./topics/sd-latency-budgets.ts";
import { sdCostCapacity } from "./topics/sd-cost-capacity.ts";

// M2 Storage and data modelling
import { sdDataModels } from "./topics/sd-data-models.ts";
import { sdIndexesBtreeLsm } from "./topics/sd-indexes-btree-lsm.ts";
import { sdTransactionsIsolation } from "./topics/sd-transactions-isolation.ts";
import { sdCaching } from "./topics/sd-caching.ts";
import { sdTimeseriesStorage } from "./topics/sd-timeseries-storage.ts";
import { sdSearchIndex } from "./topics/sd-search-index.ts";

// M3 Distributed data
import { sdReplication } from "./topics/sd-replication.ts";
import { sdPartitioning } from "./topics/sd-partitioning.ts";
import { sdConsistentHashing } from "./topics/sd-consistent-hashing.ts";
import { sdCapQuorums } from "./topics/sd-cap-quorums.ts";
import { sdConsistency } from "./topics/sd-consistency.ts";
import { sdDistributedTransactions } from "./topics/sd-distributed-transactions.ts";
import { sdDistributedIds } from "./topics/sd-distributed-ids.ts";

// M4 Coordination and time
import { sdTimeAndSessions } from "./topics/sd-time-and-sessions.ts";
import { sdLogicalClocks } from "./topics/sd-logical-clocks.ts";
import { sdConsensus } from "./topics/sd-consensus.ts";
import { sdLocksLeases } from "./topics/sd-locks-leases.ts";
import { sdGossipFailureDetection } from "./topics/sd-gossip-failure-detection.ts";
import { sdMerkleAntientropy } from "./topics/sd-merkle-antientropy.ts";

// M5 Messaging and streams
import { sdQueuesAndLogs } from "./topics/sd-queues-and-logs.ts";
import { sdFanoutBackpressure } from "./topics/sd-fanout-backpressure.ts";
import { sdIdempotency } from "./topics/sd-idempotency.ts";
import { sdFeedIngestion } from "./topics/sd-feed-ingestion.ts";
import { sdCandleAggregation } from "./topics/sd-candle-aggregation.ts";
import { sdBatchAndCdc } from "./topics/sd-batch-and-cdc.ts";
import { sdEventLoop } from "./topics/sd-event-loop.ts";
import { sdDeterminismReplay } from "./topics/sd-determinism-replay.ts";

// M6 Algorithms that scale
import { sdBloomFilters } from "./topics/sd-bloom-filters.ts";
import { sdCardinalityTopk } from "./topics/sd-cardinality-topk.ts";
import { sdRateLimitsBreakers } from "./topics/sd-rate-limits-breakers.ts";
import { sdGeoIndexing } from "./topics/sd-geo-indexing.ts";
import { sdTypeaheadTries } from "./topics/sd-typeahead-tries.ts";
import { sdTimersAndScheduling } from "./topics/sd-timers-and-scheduling.ts";
import { sdOrderBookMatching } from "./topics/sd-order-book-matching.ts";

// M7 Reliability and operations
import { sdFailureModes } from "./topics/sd-failure-modes.ts";
import { sdFeedHealth } from "./topics/sd-feed-health.ts";
import { sdIsolationAndJobs } from "./topics/sd-isolation-and-jobs.ts";
import { sdCrashRecovery } from "./topics/sd-crash-recovery.ts";
import { sdObservability } from "./topics/sd-observability.ts";
import { sdDeploySafety } from "./topics/sd-deploy-safety.ts";
import { sdBackupDr } from "./topics/sd-backup-dr.ts";

// M8 Architecture and security
import { sdServiceBoundaries } from "./topics/sd-service-boundaries.ts";
import { sdMultiTenancy } from "./topics/sd-multi-tenancy.ts";
import { sdSecurity } from "./topics/sd-security.ts";
import { sdStateMachines } from "./topics/sd-state-machines.ts";
import { sdRuleEngine } from "./topics/sd-rule-engine.ts";

// M9 Trading platforms end to end
import { sdTradeLifecycle } from "./topics/sd-trade-lifecycle.ts";
import { sdPlatformAnatomy } from "./topics/sd-platform-anatomy.ts";
import { sdOrderManagement } from "./topics/sd-order-management.ts";
import { sdReconciliation } from "./topics/sd-reconciliation.ts";
import { sdPretradeRisk } from "./topics/sd-pretrade-risk.ts";
import { sdBrokerAdapters } from "./topics/sd-broker-adapters.ts";
import { sdBacktestLiveParity } from "./topics/sd-backtest-live-parity.ts";

// M10 Classic designs
import { sdDesignMethod } from "./topics/sd-design-method.ts";
import { sdDesignUrlShortener } from "./topics/sd-design-url-shortener.ts";
import { sdDesignKeyValueStore } from "./topics/sd-design-key-value-store.ts";
import { sdDesignNewsFeed } from "./topics/sd-design-news-feed.ts";
import { sdDesignChat } from "./topics/sd-design-chat.ts";
import { sdDesignNotifications } from "./topics/sd-design-notifications.ts";
import { sdDesignPayments } from "./topics/sd-design-payments.ts";
import { sdDesignTicketBooking } from "./topics/sd-design-ticket-booking.ts";
import { sdDesignStockExchange } from "./topics/sd-design-stock-exchange.ts";
import { sdArchitectureStory } from "./topics/sd-architecture-story.ts";

export { GLOSSARY } from "./glossary.ts";

const withFilm = (t: Topic): Topic => (FILMS[t.id] ? { ...t, conceptFilm: FILMS[t.id] } : t);

export const MODULES: Tier[] = [
  {
    id: 1,
    name: "Building blocks",
    tagline: "The few parts every system is made from, and the arithmetic to size them.",
    entry: true,
    topics: [
      sdScalingBasics,
      sdLoadBalancing,
      sdDnsCdn,
      sdApiDesign,
      sdLatencyBudgets,
      sdCostCapacity,
    ].map(withFilm),
    orientation: {
      overview:
        "Almost every system you will meet is the same few parts in a different arrangement. Clients find a server by name. A balancer spreads their requests over many identical servers. A cache or CDN near the user answers the repeated questions. An API fixes what may be asked and how. Before you draw any of this, you need numbers: how many requests, how fast an answer must come, and what the bill will be. This module teaches the parts and the arithmetic together, because a design with no numbers is only a drawing. Later modules replace each part with a sharper one.",
      stakes:
        "Skip it and you will argue about technology before you know the load. You will also buy capacity you do not need, or find out too late that one box was always the limit.",
      recognise: [
        {
          signal: "'It is slow when many people use it.'",
          reach: "Find the bottleneck first (CPU, memory, disk, network or a database). Then scale that, not everything.",
        },
        {
          signal: "One server is a single point of failure.",
          reach: "Keep servers stateless, put a load balancer in front, and make the balancer itself redundant.",
        },
        {
          signal: "Users are far from the server, or the same content is fetched again and again.",
          reach: "Serve it from a CDN or edge cache, and plan how you will change it before the cache expires.",
        },
        {
          signal: "Two teams must talk to each other and neither wants to break the other.",
          reach: "Write the API as a contract: resource shape, paging, error codes and a version rule.",
        },
        {
          signal: "'It must be fast' or 'it must be cheap', with no number.",
          reach: "Ask for a number, split it into a budget per hop, judge it by the slowest 1 in 100, and do the capacity arithmetic.",
        },
      ],
      arc: [
        {
          stage: "Grow from one box",
          topics: ["sd-scaling-basics", "sd-load-balancing"],
          point: "Stateless servers are what make a balancer useful. Once no server holds the user's state, any server can answer, and adding one is a routine act.",
        },
        {
          stage: "Reach the user",
          topics: ["sd-dns-cdn", "sd-api-design"],
          point: "Both are about what happens before your code runs: how a name becomes an address, and what shape of request is allowed in. Mistakes here are copied to every client.",
        },
        {
          stage: "Put numbers on it",
          topics: ["sd-latency-budgets", "sd-cost-capacity"],
          point: "Speed and money are both budgets. You spend them hop by hop and unit by unit, and you stop when the next gain costs more than it returns.",
        },
      ],
      outcomes: [
        "Find the first thing that will fill up in a system and say how you would check it.",
        "Explain why stateless servers matter, and where the state goes instead.",
        "Choose a load-balancing method and say what a health check should test.",
        "Describe what a DNS lookup and a CDN cache hit actually do, and why a long TTL slows failover.",
        "Sketch an API with paging, an error format and a version rule.",
        "Do an order-of-magnitude estimate of requests, storage and cost on one page.",
      ],
      inTheWild: [
        {
          system: "IRCTC ticket booking",
          use: "A huge crowd arrives at one fixed minute for a small, fixed supply. It shows why capacity is sized for the peak and not the average, and why waiting rooms and queues exist.",
        },
        {
          system: "Content delivery networks",
          use: "CDNs keep copies of images, scripts and video in many cities, so most requests never reach the origin. Large sites rely on them for static content.",
        },
      ],
    },
  },
  {
    id: 2,
    name: "Storage and data modelling",
    tagline: "Choose the store from the questions you will ask it.",
    entry: true,
    topics: [
      sdDataModels,
      sdIndexesBtreeLsm,
      sdTransactionsIsolation,
      sdCaching,
      sdTimeseriesStorage,
      sdSearchIndex,
    ].map(withFilm),
    orientation: {
      overview:
        "Every store is built for some questions and bad at others. Start from the questions: read by key, read a range, join two things, count, search by word. Then pick a data model that answers them cheaply. An index is extra work done at write time to make a read fast, and the two classic index structures (B-trees and LSM trees) pay that cost in different places. A transaction keeps a group of changes honest when many people write at once. A cache holds a copy you can afford to lose. This module teaches how to choose, and what each choice costs.",
      stakes:
        "A wrong store is slow to fix because the data has to move. Without an understanding of indexes and isolation you get slow queries, double bookings and lost updates that only show up under load.",
      recognise: [
        {
          signal: "The same query runs on every page, over a large table.",
          reach: "Add an index shaped to the query (column order matters), and measure the extra write cost.",
        },
        {
          signal: "Two people can change the same row at once.",
          reach: "Use a transaction, and choose the isolation level by which anomaly you cannot accept: lost update, write skew or phantom.",
        },
        {
          signal: "Writes are heavy, reads are mostly by key.",
          reach: "Consider an LSM-based store; they turn random writes into sequential ones.",
        },
        {
          signal: "Users type words and expect ranked results.",
          reach: "Build an inverted index; do not scan documents with LIKE.",
        },
        {
          signal: "Data is a stream of values by time, read as 'this series, this range'.",
          reach: "Key by series and time, partition by time, and downsample old data.",
        },
        {
          signal: "A page is slow and the answer rarely changes.",
          reach: "Cache it with a TTL, but keep the source of truth elsewhere.",
        },
      ],
      arc: [
        {
          stage: "Pick the model",
          topics: ["sd-data-models"],
          point: "The choice between relational, document, key-value, wide-column and graph is a choice of which questions are cheap. Make it before you pick a product.",
        },
        {
          stage: "Make reads fast, write safely",
          topics: ["sd-indexes-btree-lsm", "sd-transactions-isolation"],
          point: "Both are bargains struck inside one database. An index buys reads with write work, and a transaction buys correctness with coordination.",
        },
        {
          stage: "Keep a copy close",
          topics: ["sd-caching"],
          point: "A cache is a second place for the same data, which creates a new question: who is right when they differ?",
        },
        {
          stage: "Specialised shapes",
          topics: ["sd-timeseries-storage", "sd-search-index"],
          point: "Two access patterns are so common that they get their own stores. Each is a general index idea pushed hard in one direction: time first, or word first.",
        },
      ],
      outcomes: [
        "Pick a data model from a list of access patterns and defend it.",
        "Explain how a B-tree and an LSM tree each handle a write, and where the cost lands.",
        "Name the anomaly that each isolation level allows.",
        "Design a cache with a TTL, an eviction rule and a rule for what may never live only there.",
        "Lay out a time-series key so a range query reads one place.",
        "Explain how an inverted index finds documents for a word without scanning.",
      ],
      inTheWild: [
        {
          system: "PostgreSQL and MySQL",
          use: "Both are relational stores with B-tree indexes and transactions. PostgreSQL uses multi-version concurrency control so readers do not block writers.",
        },
        {
          system: "Bigtable-style and LSM stores",
          use: "Google's Bigtable paper popularised the log-structured merge tree. Cassandra, HBase and RocksDB use the same idea to make heavy writing cheap.",
        },
        {
          system: "Elasticsearch and Lucene",
          use: "Search engines keep an inverted index from each word to the documents that contain it, then rank the matches.",
        },
      ],
    },
  },
  {
    id: 3,
    name: "Distributed data",
    tagline: "When one machine is not enough: copies, shards and the price of agreement.",
    entry: true,
    topics: [
      sdReplication,
      sdPartitioning,
      sdConsistentHashing,
      sdCapQuorums,
      sdConsistency,
      sdDistributedTransactions,
      sdDistributedIds,
    ].map(withFilm),
    orientation: {
      overview:
        "One machine eventually runs out of room, speed or luck. You then do two things with data. You copy it (replication), so a machine can die without losing anything and reads can spread out. And you split it (partitioning), so no machine holds everything. Both are easy to say and hard to live with, because now copies can disagree and a single action may touch several machines. This module is about that price: how far behind a copy may be, how a key finds its machine, how many machines must agree before you say yes, and what to do when one action needs two databases.",
      stakes:
        "Without it, you will expect a distributed database to behave like a single one. Then you meet stale reads, lost writes after a failover, or a hot shard that melts, and you have no vocabulary for the cause.",
      recognise: [
        {
          signal: "'We need it to survive a machine dying.'",
          reach: "Replicate. Decide leader or leaderless, synchronous or asynchronous, and what a failover does to the last few writes.",
        },
        {
          signal: "One table is too big or too busy for one machine.",
          reach: "Partition by range or hash; watch for hot keys and plan rebalancing.",
        },
        {
          signal: "Nodes join and leave, and you cannot reshuffle everything each time.",
          reach: "Consistent hashing with virtual nodes.",
        },
        {
          signal: "'Should reads see the latest write?'",
          reach: "Say which operation needs it. Tune quorums (R + W > N) or route that read to the leader.",
        },
        {
          signal: "One action must update two databases, or a database and a queue.",
          reach: "A saga, or the outbox pattern; use two-phase commit only where you accept its blocking.",
        },
        {
          signal: "Many writers need unique, roughly ordered ids.",
          reach: "Snowflake-style or time-ordered ids instead of one shared counter.",
        },
      ],
      arc: [
        {
          stage: "Copy it",
          topics: ["sd-replication"],
          point: "Replication comes first because it is the simplest way to survive failure, and it introduces lag, the root of most later trouble.",
        },
        {
          stage: "Split it",
          topics: ["sd-partitioning", "sd-consistent-hashing"],
          point: "Partitioning decides which key lives where; consistent hashing is the answer to doing that without moving everything when the cluster changes.",
        },
        {
          stage: "Decide what must agree",
          topics: ["sd-cap-quorums", "sd-consistency"],
          point: "Once data is copied and split, agreement costs latency or availability. The skill is to pay for it only on the facts where a wrong value costs real money.",
        },
        {
          stage: "Cross the boundary",
          topics: ["sd-distributed-transactions", "sd-distributed-ids"],
          point: "Two problems appear as soon as there is more than one machine: an action that spans several, and naming things without one counter to ask.",
        },
      ],
      outcomes: [
        "Compare leader-follower, multi-leader and leaderless replication on lag and failover.",
        "Choose a partition key and say what hot spot it creates.",
        "Show how consistent hashing moves only a small share of keys when a node joins.",
        "Use R, W and N to tune a read or write between fast and fresh.",
        "Say what CAP does and does not claim, and why PACELC is the fuller rule.",
        "Pick between 2PC, a saga and an outbox for a given workflow, and choose an id scheme.",
      ],
      inTheWild: [
        {
          system: "Dynamo and Cassandra",
          use: "Dynamo's paper described a key-value store with consistent hashing, tunable quorums and leaderless replication. Cassandra follows many of the same ideas.",
        },
        {
          system: "Google Spanner and similar systems",
          use: "They keep strong consistency across regions by paying in latency for agreement. This is the opposite end of the trade from Dynamo.",
        },
        {
          system: "Banking and UPI payment rails",
          use: "A payment touches several parties and cannot be a single database transaction. These systems rely on retries, unique references and reconciliation.",
        },
      ],
    },
  },
  {
    id: 4,
    name: "Coordination and time",
    tagline: "No shared clock, no shared memory: how machines still agree.",
    entry: true,
    topics: [
      sdTimeAndSessions,
      sdLogicalClocks,
      sdConsensus,
      sdLocksLeases,
      sdGossipFailureDetection,
      sdMerkleAntientropy,
    ].map(withFilm),
    orientation: {
      overview:
        "On one machine, things happen in an order and one thread can hold a lock. Across machines, neither is true. Clocks differ, messages arrive late or twice, and a machine that has gone quiet may be dead or only slow. This module collects the ideas that rebuild order and agreement from those weak parts. Start with time, which is data with a zone and an edge. Add logical clocks, which order events without trusting any wall clock. Then consensus, where a majority agrees on one answer. Then locks that expire, a way to guess who has failed, and a cheap way to find two copies that differ.",
      stakes:
        "Skip it and you will trust timestamps from two machines, use a lock that two processes hold at once, or declare a node dead on a single missed heartbeat. These bugs are rare, costly and almost impossible to reproduce.",
      recognise: [
        {
          signal: "Two events from different machines must be put in order.",
          reach: "Do not compare wall-clock times. Use logical or hybrid clocks, or send both through one ordered log.",
        },
        {
          signal: "Several machines must agree on one value, such as who is leader.",
          reach: "Consensus (Raft or Paxos), through a small cluster of 3 or 5 nodes you run or rent.",
        },
        {
          signal: "'Only one worker may do this at a time.'",
          reach: "A lease with a fencing token, checked by the resource itself.",
        },
        {
          signal: "A node is silent.",
          reach: "Treat 'dead' as a guess. Use a failure detector that outputs suspicion, and plan for a wrong guess.",
        },
        {
          signal: "Membership of a large cluster must spread without a central list.",
          reach: "Gossip.",
        },
        {
          signal: "Two replicas should hold the same data, and you need the differences.",
          reach: "Compare Merkle trees and repair only the ranges that differ.",
        },
      ],
      arc: [
        {
          stage: "Distrust the clock",
          topics: ["sd-time-and-sessions", "sd-logical-clocks"],
          point: "Wall time is a convention with a zone and a calendar, and it is not a safe order across machines. Logical clocks replace it with causality.",
        },
        {
          stage: "Agree",
          topics: ["sd-consensus", "sd-locks-leases"],
          point: "A lock is a small case of agreement. Consensus is the general tool, and a lease with a fencing token is how most systems use it safely.",
        },
        {
          stage: "Notice and repair",
          topics: ["sd-gossip-failure-detection", "sd-merkle-antientropy"],
          point: "In a large cluster, failure and drift are normal. These two lessons are the routine work of detecting a quiet node and bringing its data back into line.",
        },
      ],
      outcomes: [
        "Say why two timestamps from two machines cannot be compared, and what to use.",
        "Show a Lamport clock and a vector clock on a three-node example.",
        "Explain a Raft election and why a majority commit survives a crash.",
        "Explain how a paused process breaks a lock, and how a fencing token fixes it.",
        "Describe how heartbeats, phi-accrual and gossip turn silence into suspicion.",
        "Use a Merkle tree to find the rows two replicas disagree about.",
      ],
      inTheWild: [
        {
          system: "etcd, ZooKeeper and Consul",
          use: "Small replicated stores built on consensus (etcd uses Raft). Other systems, including Kubernetes, use them for leader election, configuration and locks.",
        },
        {
          system: "Dynamo and Cassandra",
          use: "They use gossip to spread membership, vector clocks or timestamps to order versions, and Merkle trees to repair replicas.",
        },
        {
          system: "Google Chubby",
          use: "A lock service described in a public paper. It showed that most teams are better served by a shared lock and lease service than by writing their own agreement code.",
        },
      ],
    },
  },
  {
    id: 5,
    name: "Messaging and streams",
    tagline: "Events in motion: queues, logs, retries and replay.",
    entry: true,
    topics: [
      sdQueuesAndLogs,
      sdFanoutBackpressure,
      sdIdempotency,
      sdFeedIngestion,
      sdCandleAggregation,
      sdBatchAndCdc,
      sdEventLoop,
      sdDeterminismReplay,
    ].map(withFilm),
    orientation: {
      overview:
        "Much of a modern system is not a request and a reply. It is a stream of events that must be taken in, shared with many readers, turned into something useful, and kept so it can be replayed. A queue hands each job to one worker. A log keeps every event in order so many readers can each go through it at their own pace. Because networks fail halfway, messages are delivered more than once, so every consumer must tolerate repeats. This module follows the stream from the socket that receives it to the single thread that handles it, and ends with the idea that makes bugs reproducible: record the inputs and replay them.",
      stakes:
        "Without it, you lose messages on a crash, process them twice after a retry, or let one slow consumer slow everyone. And when something goes wrong you cannot reproduce it, because the inputs were never kept.",
      recognise: [
        {
          signal: "Work should be done later, by someone else, and not lost.",
          reach: "A queue, with acknowledgements and a retry policy.",
        },
        {
          signal: "Several systems want the same events, and some may join later.",
          reach: "A partitioned log with offsets, so each reader keeps its own place.",
        },
        {
          signal: "One slow consumer.",
          reach: "Decide in advance: buffer with a bound, drop, merge updates, or push back on the producer.",
        },
        {
          signal: "A retry could do the thing twice.",
          reach: "Give each action an idempotency key, and make the receiver remember it.",
        },
        {
          signal: "A stream must be summarised by time windows.",
          reach: "Windowed aggregation, with a clear rule for when a window closes and what to do with a late event.",
        },
        {
          signal: "A bug appeared once and cannot be reproduced.",
          reach: "Record all inputs in order, make the logic deterministic, and replay.",
        },
      ],
      arc: [
        {
          stage: "Move events",
          topics: ["sd-queues-and-logs", "sd-fanout-backpressure"],
          point: "A queue and a log are the two ways to hold events in transit. Fan-out and backpressure are what you must decide as soon as there is more than one reader.",
        },
        {
          stage: "Make repeats safe",
          topics: ["sd-idempotency"],
          point: "Reliable delivery means at-least-once, and at-least-once means duplicates. Idempotency is the only honest answer, so it stands alone.",
        },
        {
          stage: "Take in and shape",
          topics: ["sd-feed-ingestion", "sd-candle-aggregation", "sd-batch-and-cdc"],
          point: "Each is a way of turning a raw flow into something usable: a socket handler, a time window, or a stream made from database changes. Batch and stream are the same job at different speeds.",
        },
        {
          stage: "Process one at a time and replay",
          topics: ["sd-event-loop", "sd-determinism-replay"],
          point: "A single writer needs no locks, and a deterministic one can be replayed from its log. Together they give you a system whose past can be re-run exactly.",
        },
      ],
      outcomes: [
        "Choose between a queue and a log, and explain partitions and offsets.",
        "Decide what a system does when a consumer falls behind.",
        "Make an operation safe to retry with an idempotency key.",
        "Define a window and a late-event rule so two systems build the same bars.",
        "Explain how change data capture turns a database into a stream.",
        "Describe how a recorded event log makes a single-threaded engine replayable.",
      ],
      inTheWild: [
        {
          system: "Apache Kafka",
          use: "A partitioned, replicated log. Producers append, consumers track their own offset, and old events stay available for replay until they expire.",
        },
        {
          system: "The LMAX architecture",
          use: "A published design of a single-threaded business logic core fed by an ordered event stream and rebuilt from its journal.",
        },
        {
          system: "Traed's tick path",
          use: "A live feed enters one handler, is shared with the engine and with dashboards, and is turned into candles. It is the same pipeline at the size one server can run.",
        },
      ],
    },
  },
  {
    id: 6,
    name: "Algorithms that scale",
    tagline: "The few clever structures that turn impossible questions into cheap ones.",
    entry: true,
    topics: [
      sdBloomFilters,
      sdCardinalityTopk,
      sdRateLimitsBreakers,
      sdGeoIndexing,
      sdTypeaheadTries,
      sdTimersAndScheduling,
      sdOrderBookMatching,
    ].map(withFilm),
    orientation: {
      overview:
        "Some questions are cheap to ask once and impossible to ask a billion times: Have we seen this item? How many different visitors came? Which shops are near me? What does this person's typing complete to? Each has a well-known answer that trades a little exactness, or a little memory, for a very large saving. A Bloom filter says 'definitely not here' in a few bits. A sketch counts in fixed space. A token bucket paces calls. A geohash or quadtree narrows a map search. A trie completes a word. A heap or a timing wheel runs things later. Each lesson names the structure, shows its error, and says when exact is better.",
      stakes:
        "Without these, you either scan everything and run out of time, or store everything and run out of memory. You also miss the safe ways to be approximately right, which are often the only ways that fit.",
      recognise: [
        {
          signal: "'Have we seen this before?' over billions of items.",
          reach: "A Bloom filter in front of the real lookup, accepting a small false-positive rate.",
        },
        {
          signal: "Count distinct users or find the most frequent items in a huge stream.",
          reach: "HyperLogLog for distinct counts, count-min sketch with a top-K list for frequency.",
        },
        {
          signal: "A partner or an upstream API limits how fast you may call.",
          reach: "A token bucket on your side, retries with jitter, and a circuit breaker when the other side is failing.",
        },
        {
          signal: "'Find things near this point.'",
          reach: "Geohash, quadtree or a cell system such as S2 or H3, and remember the cell-edge problem.",
        },
        {
          signal: "Suggestions must appear after each keystroke.",
          reach: "A trie with the top few completions stored at each prefix, plus a prefix cache.",
        },
        {
          signal: "Something must run later or every day, exactly once.",
          reach: "A delayed queue or timing wheel, with a rule for runs that were missed.",
        },
      ],
      arc: [
        {
          stage: "Approximate to save space",
          topics: ["sd-bloom-filters", "sd-cardinality-topk"],
          point: "Both give up exactness for a fixed memory size and a known error. The skill is knowing whether a wrong yes or a small miscount is safe in your case.",
        },
        {
          stage: "Control the flow of calls",
          topics: ["sd-rate-limits-breakers", "sd-timers-and-scheduling"],
          point: "A limiter decides when a call may happen, and a scheduler decides when work will happen. Both are about time, and both fail quietly when they forget a restart.",
        },
        {
          stage: "Search by position and prefix",
          topics: ["sd-geo-indexing", "sd-typeahead-tries"],
          point: "Each turns a hard search into a narrow lookup by changing what the key is: a cell for a place, a prefix for a word.",
        },
        {
          stage: "Match in order",
          topics: ["sd-order-book-matching"],
          point: "An exchange order book is the chapter's one exact structure. It shows what a data structure looks like when a rule (price, then time) is the product itself.",
        },
      ],
      outcomes: [
        "Size a Bloom filter for a target error and explain why it never gives a false no.",
        "Explain how HyperLogLog and count-min sketch stay small and what error they carry.",
        "Draw a token bucket and set its rate and burst from a published limit.",
        "Find nearby points with a geohash and fix the edge problem.",
        "Design a typeahead with top-K per prefix and a refresh plan.",
        "Describe how an order book matches by price, then arrival time.",
      ],
      inTheWild: [
        {
          system: "Bigtable, Cassandra and HBase",
          use: "They put a Bloom filter in front of each on-disk file, so most reads for missing keys never touch the disk.",
        },
        {
          system: "Redis",
          use: "A widely used store that ships HyperLogLog for distinct counts and is commonly used to build rate limiters.",
        },
        {
          system: "NSE and other exchanges",
          use: "Order books match by price first and then by the time an order arrived. Every fair market works this way.",
        },
      ],
    },
  },
  {
    id: 7,
    name: "Reliability and operations",
    tagline: "Decide in advance what happens on the bad day.",
    entry: true,
    topics: [
      sdFailureModes,
      sdFeedHealth,
      sdIsolationAndJobs,
      sdCrashRecovery,
      sdObservability,
      sdDeploySafety,
      sdBackupDr,
    ].map(withFilm),
    orientation: {
      overview:
        "Every part of a system will fail sooner or later: a disk, a network link, a dependency, a person who deploys at the wrong moment. Reliability is not the absence of failure. It is having decided, ahead of time, what each failure does. For each dependency, does the system stop or carry on? How is a silent failure noticed? Does a heavy job share fate with a critical one? What state is rebuilt after a crash? This module also covers how to see the system (logs, metrics, alerts), how to change it safely, and how to get back after a disaster using backups you have actually restored.",
      stakes:
        "Without it, the first serious failure is also the first time anyone decides what should happen. That decision is then made at night, under pressure, with data already at risk.",
      recognise: [
        {
          signal: "A dependency is slow or down.",
          reach: "Decide fail-open or fail-closed per dependency and per action, then add timeouts and a breaker.",
        },
        {
          signal: "The process is up but the work is not happening.",
          reach: "Measure the output (time since the last event), not just whether the process is alive.",
        },
        {
          signal: "A report or backtest makes the live path slow.",
          reach: "Separate their failure domains: bulkheads, a bounded job queue and their own workers.",
        },
        {
          signal: "'What if it restarts right now?'",
          reach: "List each piece of state and where it lives. Rebuild the right copy on start-up, in the right order.",
        },
        {
          signal: "You hear about the incident from a user.",
          reach: "Alert on symptoms a user would feel, with thresholds that can actually fire at your scale.",
        },
        {
          signal: "'We have backups.'",
          reach: "Ask when the last restore drill was, and state the RPO and RTO in numbers.",
        },
      ],
      arc: [
        {
          stage: "Decide how it fails",
          topics: ["sd-failure-modes", "sd-isolation-and-jobs"],
          point: "Choose the failure behaviour on purpose, then stop one failure spreading. Both are design decisions made before any incident, not repairs made after.",
        },
        {
          stage: "Notice it",
          topics: ["sd-feed-health", "sd-observability"],
          point: "The worst failures are silent. Feed health is the clearest example, and observability is the general method of measuring the thing the user cares about.",
        },
        {
          stage: "Come back",
          topics: ["sd-crash-recovery", "sd-backup-dr"],
          point: "A restart recovers from a crash, and a restore recovers from a disaster. Both depend on knowing which copy of each fact is the one to trust.",
        },
        {
          stage: "Change it safely",
          topics: ["sd-deploy-safety"],
          point: "Most outages begin with a change. Safe releases, safe migrations and a gate for risky moments belong with reliability, not with delivery.",
        },
      ],
      outcomes: [
        "Write a fail-open or fail-closed rule for each dependency, with one sentence of reason.",
        "Design a staleness check that does not page at night or on a holiday.",
        "Isolate a heavy job from a critical path with a bulkhead and a bounded queue.",
        "List what state a process holds and how each piece is rebuilt after a crash.",
        "Write an alert on a symptom, not a cause, with a threshold you can defend.",
        "State an RPO and an RTO, and plan a restore drill to prove them.",
      ],
      inTheWild: [
        {
          system: "Google's SRE practice",
          use: "Its public book popularised error budgets, symptom-based alerting and blameless postmortems, and is widely taught.",
        },
        {
          system: "Netflix and the circuit breaker idea",
          use: "Netflix publicly described circuit breakers and deliberate failure testing as ways to keep one failing dependency from taking down the service.",
        },
        {
          system: "Knight Capital, 2012",
          use: "A widely documented trading incident in which a faulty deployment led to large unintended orders in minutes. It is the standard case for deploy safety and kill switches.",
        },
      ],
    },
  },
  {
    id: 8,
    name: "Architecture and security",
    tagline: "Where to draw the lines, who may cross them, and how to model behaviour.",
    entry: true,
    topics: [
      sdServiceBoundaries,
      sdMultiTenancy,
      sdSecurity,
      sdStateMachines,
      sdRuleEngine,
    ].map(withFilm),
    orientation: {
      overview:
        "Architecture is mostly the art of drawing lines. A line between two services costs a network call, a contract and a new way to fail, so it must earn its place. A line between two users keeps one person's data, keys and load away from another's. A line between trusted and untrusted callers is where security lives. Inside a boundary, two modelling tools keep behaviour honest: a state machine lists what states a thing can be in and which moves are allowed, and a rule engine stores behaviour as data one evaluator can read. This module is about where to cut, and how to describe what happens inside.",
      stakes:
        "Without it, you split too early and pay for it in every release, or never split and cannot change anything safely. You also learn about trust boundaries from a leak instead of from a diagram.",
      recognise: [
        {
          signal: "'Should this be a separate service?'",
          reach: "Ask whether deploy, scaling, failure or ownership truly differ. If not, keep it a module.",
        },
        {
          signal: "Two services share one database schema.",
          reach: "Treat it as a hidden contract. Either own the data in one place or version the shared tables.",
        },
        {
          signal: "More than one customer uses the system.",
          reach: "Separate data, credentials, connections and limits per tenant, and share heavy work fairly.",
        },
        {
          signal: "A key, token or password exists anywhere.",
          reach: "Name who may use it, where it is stored, and what happens when it leaks. Give each caller the least power needed.",
        },
        {
          signal: "A thing has a life: created, pending, active, closed.",
          reach: "A state machine with a table of allowed moves, enforced in one place.",
        },
        {
          signal: "Users want to define behaviour without a deploy.",
          reach: "Store it as a rule tree, with one evaluator and one shared meaning for each condition.",
        },
      ],
      arc: [
        {
          stage: "Cut the system",
          topics: ["sd-service-boundaries", "sd-multi-tenancy"],
          point: "Services divide a system by function and tenants divide it by customer. Both ask the same question: what must be separate, and what does the separation cost?",
        },
        {
          stage: "Guard the lines",
          topics: ["sd-security"],
          point: "A boundary is only worth drawing if something checks who crosses it. Security is the checking, and it deserves its own lesson.",
        },
        {
          stage: "Model what happens inside",
          topics: ["sd-state-machines", "sd-rule-engine"],
          point: "Once the lines are drawn, behaviour inside them is easiest to reason about as explicit states and explicit rules. Both turn mistakes into things a program can reject.",
        },
      ],
      outcomes: [
        "Argue for or against splitting a service using deploy, scale, failure and ownership.",
        "Explain what a shared database schema costs two teams.",
        "Design per-tenant isolation for data, keys, connections and rate limits.",
        "Draw a trust-boundary diagram and mark where each secret lives.",
        "Write a state machine for an order or a job, with allowed and forbidden moves.",
        "Explain how a strategy stored as data is evaluated by one shared engine.",
      ],
      inTheWild: [
        {
          system: "Amazon's early move to services",
          use: "A widely told case of splitting a large application by team ownership and strict interfaces. It is also cited when teams regret splitting too early.",
        },
        {
          system: "Stripe and payment APIs",
          use: "They model every payment as a state machine with documented states and events. Clients depend on those states more than on the transport.",
        },
        {
          system: "Cloud identity and access systems",
          use: "AWS IAM and similar systems are a public example of least privilege: every caller gets only the actions it needs.",
        },
      ],
    },
  },
  {
    id: 9,
    name: "Trading platforms end to end",
    tagline: "The domain module: one order, five places, and the platform around it.",
    entry: true,
    topics: [
      sdTradeLifecycle,
      sdPlatformAnatomy,
      sdOrderManagement,
      sdReconciliation,
      sdPretradeRisk,
      sdBrokerAdapters,
      sdBacktestLiveParity,
    ].map(withFilm),
    orientation: {
      overview:
        "A trading platform is a machine bolted onto a market, and the market sets the rules. An order is a promise that travels from a trader through a broker to an exchange and comes back as a fill. The platform keeps its own book of positions, the broker keeps the real one, and the two must be compared. Risk checks sit between the strategy and the broker. A daily-expiring token decides whether you can even speak to the broker. And a backtest is evidence only if it runs the code that trades. This module applies the earlier ones to one domain, and it is the module about Traed itself.",
      stakes:
        "Here a design mistake is money, not slowness. A duplicated order, a forgotten position or a backtest that flatters itself can cost real rupees before anyone notices.",
      recognise: [
        {
          signal: "Somebody asks 'what happens when I press Buy?'",
          reach: "Trace the order lifecycle: validate, route, exchange acknowledges, partial or full fill, position update.",
        },
        {
          signal: "The platform and the broker show different positions.",
          reach: "Reconcile: compare, classify the gap, and let the broker's book win.",
        },
        {
          signal: "A strategy bug could size or fund its own order.",
          reach: "Put pre-trade risk checks outside strategy code, with a kill switch and a manual exit.",
        },
        {
          signal: "Several brokers, each with its own quirks and token rules.",
          reach: "An adapter per broker behind one internal vocabulary, plus a token-expiry plan.",
        },
        {
          signal: "A backtest looks better than live trading.",
          reach: "Check that both use one decision path, with only the data source and the order adapter swapped.",
        },
        {
          signal: "A design conversation opens with a technology name.",
          reach: "Step back to the anatomy: data in, decisions, orders out, a record. Which box is this?",
        },
      ],
      arc: [
        {
          stage: "Follow one order",
          topics: ["sd-trade-lifecycle", "sd-platform-anatomy"],
          point: "Learn the states an order passes through, then name the boxes that own them. Every later lesson sits inside one of those boxes.",
        },
        {
          stage: "Own the book",
          topics: ["sd-order-management", "sd-reconciliation"],
          point: "The platform remembers and the broker decides, so the platform's book is a belief to be checked. Reconciliation is how a belief becomes a fact.",
        },
        {
          stage: "Guard the money",
          topics: ["sd-pretrade-risk", "sd-broker-adapters"],
          point: "Both sit on the edge where an order leaves the platform. One decides whether it may go; the other decides how it is spoken to the broker.",
        },
        {
          stage: "Trust the evidence",
          topics: ["sd-backtest-live-parity"],
          point: "A strategy is trusted on the strength of its backtest, so the backtest must run the same code as the live path. It is the check on everything else.",
        },
      ],
      outcomes: [
        "Trace an order from click to fill and name which system owns each state.",
        "Draw the five boxes of a trading platform and place Traed's services on them.",
        "Write a reconciliation policy as a table: difference found, action taken.",
        "List every check an order passes before it reaches the broker, in order.",
        "Explain why broker differences stay inside an adapter.",
        "Say why a backtest result can be believed, and where it should not be.",
      ],
      inTheWild: [
        {
          system: "NSE and MCX with retail brokers",
          use: "Exchanges match orders electronically. Brokers such as Zerodha and Groww sit between a retail platform and the exchange, and expose the order states a platform sees.",
        },
        {
          system: "Traed",
          use: "A Laravel web app, a Python strategy engine, a serverless tick relay for dashboards, and shared MySQL and Redis: the same five boxes at the size one founder can run.",
        },
      ],
    },
  },
  {
    id: 10,
    name: "Classic designs",
    tagline: "Put it all together: a method, then the questions everyone is asked.",
    entry: true,
    topics: [
      sdDesignMethod,
      sdDesignUrlShortener,
      sdDesignKeyValueStore,
      sdDesignNewsFeed,
      sdDesignChat,
      sdDesignNotifications,
      sdDesignPayments,
      sdDesignTicketBooking,
      sdDesignStockExchange,
      sdArchitectureStory,
    ].map(withFilm),
    orientation: {
      overview:
        "A design question is an open question: build a short-link service, a chat, a payment system. There is no single right answer, but there is a right order of working. Ask what it must do and how big it is. Do rough numbers. Sketch the API and the data. Draw the boxes. Then spend most of your time on the one hard part, which differs for each system. This module teaches that order first, then applies it to nine well-known designs. Each leans on parts from the earlier modules, so this is where the course is tested. The last lesson turns any of them into a two-minute story.",
      stakes:
        "Without a method you start with technology names and wander. With one, even an unfamiliar question has a place to begin, and you can show your reasoning rather than recite an answer.",
      recognise: [
        {
          signal: "'Design X' with no more detail.",
          reach: "Clarify requirements, estimate load, then API, data, boxes and the hard part. In that order.",
        },
        {
          signal: "Reads far outnumber writes.",
          reach: "Cache and precompute: short links, news feeds.",
        },
        {
          signal: "A message must reach a person who may be offline.",
          reach: "A queue per channel, retries with de-duplication, and stored messages for later delivery.",
        },
        {
          signal: "Money or scarce stock changes hands.",
          reach: "Idempotency keys, a double-entry ledger, atomic inventory updates and holds that expire.",
        },
        {
          signal: "Fairness and order matter above all.",
          reach: "One sequenced stream into a single-threaded matcher, rebuilt by replay.",
        },
        {
          signal: "You must explain your design to someone else.",
          reach: "Audience, context, one flow, two trade-offs, and the limits stated first.",
        },
      ],
      arc: [
        {
          stage: "Learn the method",
          topics: ["sd-design-method"],
          point: "Every other lesson here is this method applied once. Learn it on a small case before you meet a large one.",
        },
        {
          stage: "Read-heavy designs",
          topics: ["sd-design-url-shortener", "sd-design-key-value-store", "sd-design-news-feed"],
          point: "The common thread is a lot of reading from a little data. The hard part moves from id generation to replication to fan-out, but the tools are caches and partitions throughout.",
        },
        {
          stage: "Delivery and messaging",
          topics: ["sd-design-chat", "sd-design-notifications"],
          point: "Both must reach a person who is not waiting. Ordering, receipts, retries and provider failure are the hard parts, and queues are the answer.",
        },
        {
          stage: "Money and scarce things",
          topics: ["sd-design-payments", "sd-design-ticket-booking", "sd-design-stock-exchange"],
          point: "A wrong answer here costs money or trust, so each design is built around correctness: one owner for each fact, a record of every change, and a way to replay it.",
        },
        {
          stage: "Tell it",
          topics: ["sd-architecture-story"],
          point: "A design that cannot be explained cannot be reviewed or funded. The story is the last step of the work, not a separate skill.",
        },
      ],
      outcomes: [
        "Run the requirements, numbers, API, data, boxes and hard-part method on a new question.",
        "Design a short-link service, with id generation, caching and click analytics.",
        "Assemble a Dynamo-style key-value store from consistent hashing, quorums and repair.",
        "Choose fan-out on write or on read for a feed, and handle the very popular account.",
        "Design a payment flow that cannot charge twice and can be reconciled with the bank.",
        "Give a two-minute architecture story, with two trade-offs and the limits.",
      ],
      inTheWild: [
        {
          system: "UPI",
          use: "India's real-time payment network is a public example of unique references, state tracking and reconciliation between banks across many hops.",
        },
        {
          system: "IRCTC and other ticketing systems",
          use: "A small stock of seats meets a very large crowd at a fixed time. Holds, queues and atomic updates are the shared answer.",
        },
        {
          system: "WhatsApp and similar chat services",
          use: "Persistent connections, per-conversation order, delivery receipts and offline storage are the standard parts of a chat design.",
        },
      ],
    },
  },
];

export const PHASES: Phase[] = [
  {
    id: 1,
    name: "Learn the parts",
    weeks: [1, 2],
    focus: [
      {
        week: 1,
        focus: "Scaling, load balancing, DNS and CDNs",
        deliverable: "Draw how a request from a phone reaches Traed's dashboard, naming each hop from DNS onwards",
      },
      {
        week: 2,
        focus: "API design, latency budgets, cost and capacity",
        deliverable: "Estimate requests per second and storage for IRCTC's morning booking rush on one page, showing every assumption",
      },
    ],
    anchor:
      "Take any app you use daily and sketch it on one page: the parts, the numbers, and the first thing that would fill up.",
  },
  {
    id: 2,
    name: "Choose the store",
    weeks: [3, 4],
    focus: [
      {
        week: 3,
        focus: "Data models, indexes, and transactions with isolation",
        deliverable: "For Traed's trades table, write the three most common queries and the index each needs",
      },
      {
        week: 4,
        focus: "Caching, time-series storage and search",
        deliverable: "Explain aloud why Traed's candle history is keyed by symbol and time, and what a cache may never hold alone",
      },
    ],
    anchor:
      "Pick the stores for a food-delivery app from its list of queries, and defend each choice and its cost in two minutes.",
  },
  {
    id: 3,
    name: "Split the data",
    weeks: [5, 6],
    focus: [
      {
        week: 5,
        focus: "Replication, partitioning and consistent hashing",
        deliverable: "Draw a hash ring with three nodes and show which keys move when a fourth joins",
      },
      {
        week: 6,
        focus: "CAP and quorums, consistency, distributed transactions and unique ids",
        deliverable: "For a UPI payment, list each fact that needs strong agreement and each that can be eventually consistent",
      },
    ],
    anchor:
      "Design the data layer of a bank-statement app that must survive a machine failure, and say what a failover costs.",
  },
  {
    id: 4,
    name: "Agree without a clock",
    weeks: [7, 8],
    focus: [
      {
        week: 7,
        focus: "Time and sessions, logical clocks, consensus",
        deliverable: "Walk a Raft leader election on a five-node cluster with one node down, step by step on paper",
      },
      {
        week: 8,
        focus: "Locks, leases and fencing, gossip, Merkle repair",
        deliverable: "Show how a paused worker breaks a lock and how a fencing token stops the damage",
      },
    ],
    anchor:
      "Explain to a friend why two machines cannot agree on the time, and what systems use instead.",
  },
  {
    id: 5,
    name: "Move the events",
    weeks: [9, 10],
    focus: [
      {
        week: 9,
        focus: "Queues and logs, fan-out and backpressure, idempotency",
        deliverable: "Work out messages per second through Traed's dashboard tick relay for 50 symbols and 3 browser tabs",
      },
      {
        week: 10,
        focus: "Feed ingestion, candle aggregation, batch and CDC, event loop, determinism and replay",
        deliverable: "Describe how Traed turns a NIFTY tick into a closed 5-minute candle, and where it could be lost",
      },
    ],
    anchor:
      "Follow one event from a socket to a stored result, naming the queue or log it sits in and how a retry is made safe.",
  },
  {
    id: 6,
    name: "Use the clever structures",
    weeks: [11, 12],
    focus: [
      {
        week: 11,
        focus: "Bloom filters, cardinality and top-K, rate limits and circuit breakers",
        deliverable: "Size a Bloom filter for 10 million items at a 1 percent error, and show the arithmetic",
      },
      {
        week: 12,
        focus: "Geo indexing, typeahead, timers and scheduling, order-book matching",
        deliverable: "Walk three orders through a NSE-style order book and say who gets filled first and why",
      },
    ],
    anchor:
      "Pick the right structure for five problems (seen before, distinct count, nearby, completion, run later) and state the error each accepts.",
  },
  {
    id: 7,
    name: "Plan for the bad day",
    weeks: [13, 14],
    focus: [
      {
        week: 13,
        focus: "Failure modes, feed health, isolation and jobs, crash recovery",
        deliverable: "For each of Traed's engine dependencies, write fail-open or fail-closed and one sentence of reason",
      },
      {
        week: 14,
        focus: "Observability, deploy safety, backup and disaster recovery",
        deliverable: "State Traed's RPO and RTO today and the single cheapest improvement to each",
      },
    ],
    anchor:
      "Retell one real incident as a blameless postmortem: timeline, cause, and what changed in the design.",
  },
  {
    id: 8,
    name: "Draw the lines",
    weeks: [15, 16],
    focus: [
      {
        week: 15,
        focus: "Service boundaries, multi-tenancy, security",
        deliverable: "Write one architecture decision record for 'three services, one MySQL schema'",
      },
      {
        week: 16,
        focus: "State machines and rule engines",
        deliverable: "Draw the order state machine and the strategy-run state machine side by side, with the forbidden moves marked",
      },
    ],
    anchor:
      "Draw Traed's trust boundaries and mark where every secret lives and who may use it.",
  },
  {
    id: 9,
    name: "Touch real money",
    weeks: [17, 18],
    focus: [
      {
        week: 17,
        focus: "Trade lifecycle, platform anatomy, order management, reconciliation",
        deliverable: "Write the reconciliation policy as a table: difference found, action taken",
      },
      {
        week: 18,
        focus: "Pre-trade risk, broker adapters, backtest and live parity",
        deliverable: "List every check an order passes before it reaches the broker, in order, then three ways backtest and live could drift",
      },
    ],
    anchor:
      "Answer 'what stops Traed from placing an order twice, or forgetting a position?' without notes.",
  },
  {
    id: 10,
    name: "Design and defend",
    weeks: [19, 20],
    focus: [
      {
        week: 19,
        focus: "The design method, short links, key-value store, news feed, chat, notifications",
        deliverable: "Run the full method on a URL shortener and talk through it aloud in ten minutes, with numbers",
      },
      {
        week: 20,
        focus: "Payments, ticket booking, stock exchange, the architecture story",
        deliverable: "Record a two-minute explanation of Traed, then list every claim you could not back up",
      },
    ],
    anchor:
      "Take a design question you have not seen, run the method on it, and answer five hard follow-up questions with a trade-off, not a feature.",
  },
];

export const RESOURCES = [
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    note: "The standard reference for storage, streams, replication and consistency (M2, M3, M4, M5).",
  },
  {
    title: "System Design Interview (volumes 1 and 2)",
    author: "Alex Xu",
    note: "Worked classic designs, step by step: short links, feeds, chat, payments and more (M10).",
  },
  {
    title: "Dynamo: Amazon's Highly Available Key-value Store",
    author: "Giuseppe DeCandia and colleagues",
    note: "The paper behind much of M3 and M4: consistent hashing, quorums, vector clocks, gossip and Merkle repair.",
  },
  {
    title: "In Search of an Understandable Consensus Algorithm",
    author: "Diego Ongaro and John Ousterhout",
    note: "The Raft paper, written to be read by students (M4).",
  },
  {
    title: "Trading and Exchanges",
    author: "Larry Harris",
    note: "How orders, brokers and exchanges actually work, written for non-specialists (M6, M9).",
  },
  {
    title: "The LMAX Architecture",
    author: "Martin Fowler",
    note: "A free article on a single-threaded, event-sourced exchange design (M5, M10).",
  },
  {
    title: "Release It!",
    author: "Michael T. Nygard",
    note: "Circuit breakers, bulkheads, timeouts and the failure stories behind them (M6, M7).",
  },
  {
    title: "Site Reliability Engineering",
    author: "Betsy Beyer and colleagues at Google",
    note: "Free online. Alerting on symptoms, error budgets and blameless postmortems (M7).",
  },
];

export const TAGLINE =
  "20 weeks · 10 modules · 69 lessons, each with a data-flow film and real design cases";

export const ALL_TOPICS: Topic[] = MODULES.flatMap((m) => m.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

import type { Topic } from "../../types.ts";

export const sdFanoutBackpressure: Topic = {
  id: "sd-fanout-backpressure",
  title: "Fan-out, pub/sub and backpressure",
  tier: 2,
  week: 3,
  depth: "deep",
  summary:
    "One tick must reach many consumers. Fan-out multiplies work, and backpressure decides what happens when a consumer cannot keep up.",
  why: "Traed turns one stream of Kite ticks into deliveries for the strategy engine and for browser dashboards. In August 2026 a dashboard tab re-subscribing a 50-symbol watchlist, plus serial sends to dead connections, starved a live strategy's stop-loss feed for over an hour. That is a fan-out and backpressure failure. You need the vocabulary to explain it, and to say why the money path now has its own route.",
  learn: {
    intuition:
      "Imagine a village announcer with a loudspeaker who reads out the vegetable prices every minute. If ten people listen, it costs him nothing extra. Now change the job: he must walk to each listener's house and tell each one in person. Ten listeners is ten walks. Add a listener who is slow, say an old man who asks him to repeat everything, and every other house waits. Add a house that has been empty for a week, and the announcer still walks there and knocks. Fan-out is the walk to every house. Backpressure is the rule for what happens when a house cannot keep up: wait for them, tell them only the latest price, or skip them. Without a rule, one slow house slows the whole village, and the farmer who needs the price now hears it an hour late.",
    mechanics: [
      {
        heading: "Topics, subscriptions and the routing table",
        body: "Publish and subscribe means producers do not know their consumers. A tick is published under a key, such as a symbol and expiry, and consumers subscribe to keys. The system needs a table from key to the set of subscribers, so a tick can find its audience. Traed's bridge stores one row per connection and key in DynamoDB, loads them into a map from key to a set of connection ids, and reloads at most every five seconds. A tick arrives by instrument token, so it makes two lookups: token to key, then key to connections. If that map is stale, ticks go to dead connections or nobody, with no error.",
      },
      {
        heading: "Fan-out arithmetic: the number that multiplies",
        body: "Work per second is ticks per second, times keys, times connections. Take 200 symbols, one tick per second each, and three connections that want all of them. That is 200 × 3 = 600 deliveries a second. In the August 2026 post-mortem, the engine normally received about 10,700 frames a minute and the bridge made about 6,600 broadcasts a minute across roughly 204 live subscriptions. On API Gateway each delivery is its own HTTPS call to `PostToConnection`, so the count is the cost. Doubling the connections doubles the calls, however small each message is. Always find which factor you control: batching cuts keys, conflation cuts ticks, fewer connections cuts the third.",
      },
      {
        heading: "Batching per connection",
        body: "Batching puts several ticks into one message. Traed's bridge receives a Kite frame holding many packets, groups the ticks by subscription key, and sends one message per key with a `ticks` array. That is one call per key per connection per frame, not one per tick. Batching trades a tiny delay and bigger messages for far fewer calls. The sending order matters as much as the batch. When the bridge posted serially, a dead connection cost the same round trip as a live one. In the post-mortem, about 50 stale rows pushed delivery for one batch past the engine's 60-second stale threshold, and the engine's correct reconnects created more dead rows.",
      },
      {
        heading: "Conflation, bounded queues and the slow consumer",
        body: "A slow consumer is one that cannot keep up. You have three honest choices. Block the producer, which slows everyone. Buffer without a limit, which turns a slow consumer into a memory problem and an ever-growing delay. Or drop, using a bounded queue or conflation, which keeps only the latest price per symbol. Conflation is safe for a price display and unsafe for a candle's high and low, which need every tick. Traed's in-process fan-out keeps handlers apart: each gets its own copy of the tick, one handler's exception cannot starve the others, and each strategy handle filters to its own symbols. There is no queue between the socket and the handlers, so a slow handler delays reading the next frame.",
      },
      {
        heading: "Saying it about Traed",
        body: "We have two delivery paths on purpose. The strategy engine reads Kite directly on one shared socket, and counted handles filter ticks per strategy. Browser dashboards still use a serverless relay that fans ticks out through API Gateway. We split them after a dashboard tab and slow sends starved a live position's feed for over an hour. The cost is two code paths and a relay we must still keep healthy. We do not conflate or bound queues today; every tick is forwarded, and the work per tick is small. We would add conflation and a bounded queue before serving many dashboards or a slower handler.",
      },
    ],
    complexityDerivation:
      "The invariant is isolation of the important consumer: a consumer that needs a tick now must never wait behind a consumer that does not. Fan-out cost grows with ticks × keys × connections, so the question is whose cost it is. If every consumer shares one delivery path, the worst consumer sets everyone's pace. Serial sends make this visible: delay for one batch is the number of connections times one round trip, and a dead connection counts as a full round trip. The argument for a bulkhead is that failure then stays on the side that caused it. Dashboards can churn, lag or drop, and nothing on the execution side moves. Where it stops holding: if all consumers need every tick and can keep up, the extra path is waste. With many tenants, separate paths per consumer become too many, and you shift to one shared tier with per-consumer limits, bounded queues and a policy for what to drop.",
    variants: [
      {
        name: "Push every event, no buffer",
        when: "Few consumers, cheap handlers, every tick matters. This is Traed's engine path.",
        delta:
          "Simplest and lowest delay. A slow consumer delays reading the next frame, and nothing protects the producer, so it works only while handlers are fast.",
      },
      {
        name: "Conflate to the latest value per key, then batch",
        when: "Display consumers such as dashboards, watchlists and price boards with thousands of viewers.",
        delta:
          "Send at most one update per key per interval, carrying the newest value. Deliveries drop sharply and a slow viewer cannot build a backlog, but intermediate prices are lost.",
      },
      {
        name: "Pull from a durable log",
        when: "Many independent consumers with different speeds, or any need to replay.",
        delta:
          "Producers append to a log and each consumer reads at its own pace, so a slow one only lags. You gain replay and measurable lag, and add a broker to run and a delay.",
      },
    ],
    tradeoffs: [
      {
        vs: "One shared delivery path for engine and dashboards",
        pick: "A separate direct path for the money consumer",
        because:
          "Dashboard subscribe churn and dead connections were enough to blind a live strategy. The price is a second path to maintain, which is smaller than the risk of a stop going unwatched.",
      },
      {
        vs: "One message per tick",
        pick: "One message per key per frame, carrying an array of ticks",
        because:
          "Calls to API Gateway are the cost, not bytes. Grouping by key sends fewer, larger messages. It adds a little delay and is not conflation: every tick still arrives.",
      },
      {
        vs: "Block everyone until the slow consumer catches up",
        pick: "Isolate or drop the slow consumer",
        because:
          "Blocking makes the slowest consumer the system's speed. A bounded queue or a dropped connection keeps the damage local. The cost is that the dropped consumer must handle a gap and resynchronise.",
      },
    ],
  },
  realWorld: [
    {
      system: "Apache Kafka consumer groups and consumer lag",
      kind: "industry",
      problem:
        "Many consumers read the same stream at different speeds, and a slow one must not stall the producer or its peers.",
      applied:
        "Producers append to a durable log. Each consumer group pulls from its own offset at its own pace, so backpressure is built in. Lag, the distance between the newest message and a group's offset, is a standard metric to alert on.",
      evidence: "Apache Kafka documentation: consumers, consumer groups and consumer lag (public)",
      impact:
        "A slow consumer shows up as growing lag, not as a delay for everyone. The price is a log to operate and extra delay.",
    },
    {
      system: "Redis pub/sub and client output buffer limits",
      kind: "industry",
      problem:
        "A subscriber that reads slowly makes the server hold an ever-growing buffer of messages for it.",
      applied:
        "Redis keeps a per-client output buffer and can be configured with a limit for pub/sub clients. When a subscriber's buffer exceeds that limit for long enough, the server disconnects it rather than letting memory grow.",
      evidence: "Redis documentation: client-output-buffer-limit and Pub/Sub (public)",
      impact:
        "A drop policy for slow consumers protects the server and the fast subscribers, and the dropped client must reconnect and catch up.",
    },
    {
      system: "Traed's serverless bridge fan-out",
      kind: "yours",
      problem:
        "Ticks from one Kite connection must reach browser tabs (and, until August 2026, the engine), tracked by connection ids that come and go.",
      applied:
        "A Bridge Lambda keeps a map from subscription key to connection ids, loaded from DynamoDB. It groups each frame's ticks by key, posts one message per key to every connection through API Gateway, and prunes connections that return 410 Gone. The August 2026 post-mortem recorded 807 posts to dead connections in one outage.",
      evidence: "docs/postmortems/2026-08-26-tick-feed-outage.md",
      impact:
        "It works well for dashboards. It showed that a shared path with serial sends and stale rows lets one noisy consumer starve a quiet, important one.",
    },
    {
      system: "Traed's shared ticker and per-handle isolation",
      kind: "yours",
      problem:
        "Several strategies read one shared socket, and one failing or slow handler must not harm the others.",
      applied:
        "The core ticker keeps a list of handlers and gives each its own copy of the tick. It catches each handler's error so the rest still run. Each strategy's handle drops any tick whose symbol it did not subscribe to, and a count per symbol decides when the wire subscription is released.",
      evidence: "strategy-engine/app/services/data_processing/direct_kite_ticker.py",
      impact:
        "Failures stay inside one strategy. It does not queue ticks, so a handler that blocks would still delay the next frame.",
    },
  ],
  insights: [
    {
      t: "Fan-out cost is a product",
      d: "Deliveries per second = ticks × keys × connections. Find which factor you can shrink: batching, conflation or fewer connections.",
    },
    {
      t: "Calls, not bytes, are the cost",
      d: "On a per-connection API like `PostToConnection`, every delivery is a request. Grouping ticks by key cuts the number of requests while every tick still arrives.",
    },
    {
      t: "A dead consumer costs as much as a live one",
      d: "Serial sends to stale connections turned a few dozen dead rows into a batch slower than a 60-second watchdog.",
    },
    {
      t: "Isolate the consumer that cannot wait",
      d: "Give the stop-loss path its own route. Conflate or drop for displays, and never let their churn share a path with execution.",
    },
  ],
  pitfalls: [
    "Conflating ticks for a consumer that builds candles or checks stops. Keeping only the latest price loses the highs and lows between updates.",
    "Letting a slow consumer buffer without a limit. It hides the problem as growing memory and delay until something far away breaks.",
    "Trusting a routing table you never check. If ticks arrive but nobody deliverable is in the table, nothing errors and the feed is silently dropped.",
  ],
  quiz: [
    {
      q: "In a publish and subscribe system, what does the routing table hold?",
      options: [
        "The history of every message published, so subscribers can replay it",
        "The list of producers allowed to publish each type of message",
        "The set of subscribers for each topic key, so a message finds its audience",
        "The acknowledgement each subscriber returned for its latest message",
      ],
      answer: 2,
      why: "Producers do not know their consumers. The routing table maps each key to its subscriber set, so publishing is a lookup followed by deliveries.",
      difficulty: "recall",
      distractors: [
        "A log does keep history, but that is storage, not routing. A table that only maps keys to subscribers does not retain messages.",
        "Permissions on producers are a separate concern. Routing decides who receives, not who may send.",
        "",
        "Acknowledgements track delivery state. They are useful, but the table that finds the audience comes first.",
      ],
    },
    {
      q: "A consumer cannot keep up with the producer. Which is a backpressure strategy?",
      options: [
        "Keep only the latest value per key until the consumer asks",
        "Send each message twice so one copy is likely to be processed",
        "Increase the producer's rate so the consumer's queue empties sooner",
        "Hide the problem by removing the delivery timeout from the sender",
      ],
      answer: 0,
      why: "Backpressure means the system's response to a consumer that falls behind: block, buffer with a limit, or drop. Conflation, keeping only the newest value, is a drop policy.",
      difficulty: "recall",
      distractors: [
        "",
        "Duplicating messages doubles the load on a consumer that is already behind, so the backlog grows faster.",
        "A faster producer widens the gap. Backpressure slows or trims the flow, never speeds it up.",
        "Removing a timeout hides the symptom and lets one stuck consumer hold up the sender indefinitely.",
      ],
    },
    {
      q: "A bridge forwards ticks for 200 symbols, one tick per second each. Three connections want all symbols, sent one message per tick. How many deliveries per second, and what cuts them most?",
      options: [
        "200 a second, cut by compressing every message to save bytes",
        "600 a second, cut by giving the Lambda more memory and CPU",
        "600 a second, cut by one message per key with a ticks array",
        "3 a second, because only three connections are open at once",
      ],
      answer: 2,
      why: "Deliveries are ticks × connections: 200 × 3 = 600. Grouping ticks into one message per frame per key cuts the number of calls, which is the real cost on a per-call API, without dropping any tick.",
      difficulty: "apply",
      distractors: [
        "It forgets that each connection needs its own copy. Compression shrinks bytes but not the number of calls.",
        "The count is right but the remedy is wrong. More memory does not reduce the number of requests.",
        "",
        "It counts only connections. Each tick must be delivered to each connection, so the number scales with ticks as well.",
      ],
    },
    {
      q: "During one outage the bridge posts serially to 50 connections, most of them 410 Gone, and each post takes about one round trip. The engine's watchdog fires at 60 seconds. What is the most direct fix?",
      options: [
        "Raise the engine's stale threshold above the time a batch takes",
        "Prune dead rows and send in parallel, so delay is one round trip",
        "Send fewer symbols per batch so that each batch is smaller",
        "Add a second bridge instance that shares the same connection list",
      ],
      answer: 1,
      why: "Serial sends make delay equal connections × round trip, and dead connections cost the same as live ones. Pruning dead rows and sending in parallel brings the delay down to about one round trip.",
      difficulty: "apply",
      distractors: [
        "It hides the symptom and blinds the engine for longer. The watchdog was correct; delivery was too slow.",
        "",
        "Smaller batches do not change how many connections must be visited serially, so the delay per batch barely moves.",
        "A second instance with the same stale list would post to the same dead connections twice.",
      ],
    },
    {
      q: "A watchlist page needs prices for 500 symbols, each ticking about once a second, delivered to 20,000 viewers. Viewers only need the newest price within one second. What design cuts deliveries most?",
      options: [
        "One message per tick to every viewer, so every price is kept",
        "Every viewer polls a REST endpoint each second for all 500 symbols",
        "Keep the stream as it is and add more servers until it keeps up",
        "Conflate to the newest price per symbol, one batch per viewer per second",
      ],
      answer: 3,
      why: "Per-tick delivery to everyone is 500 × 20,000 = 1,00,00,000 a second. Viewers only need the latest price each second, so one batched message per viewer is 20,000 a second, and a slow viewer cannot build a backlog.",
      difficulty: "apply",
      distractors: [
        "Keeps all prices, but the viewers do not need them, and the delivery count is far beyond what the page is worth.",
        "Polling removes backlog but sends 500 prices per request even when nothing changed, and 20,000 requests a second of overhead.",
        "More servers raise capacity but not efficiency, and the cost grows with the viewer count times the tick rate.",
        "",
      ],
    },
    {
      q: "The strategy handler does 400 ms of work per tick but ticks arrive several times a second on a shared socket. The strategy needs the price for a stop and builds a minute candle. What fits best?",
      options: [
        "Keep updates and stops inline, evaluate once per closed bar off the hot path",
        "Conflate ticks to the latest per second before the candle builder runs",
        "Put every tick in an unbounded queue and let the handler drain it later",
        "Block the socket reader until the handler has finished each tick",
      ],
      answer: 0,
      why: "Candle highs and lows and stop checks need every tick, so conflating loses information. Unbounded queues and blocking turn slow work into growing delay. Keep the per-tick path cheap and move heavy work to bar close.",
      difficulty: "apply",
      distractors: [
        "",
        "Conflation drops the highs and lows between updates, which corrupts the candle and can miss a stop price.",
        "A growing queue means decisions use old prices. It looks safe but the delay grows without bound.",
        "Blocking the reader delays every other symbol and strategy on the shared socket for one slow handler.",
      ],
    },
    {
      q: "A platform sends engine ticks and dashboard ticks through one relay. Dashboards are noisy but the relay seems fine most days. A reviewer asks you to justify a separate direct path for the engine. What is the strongest argument?",
      options: [
        "A direct path is always faster than a relay, whatever the load",
        "Relays cannot carry the binary frames that a broker sends out",
        "It is tidier and easier to read to have one path per consumer type",
        "Tolerance differs: a live stop cannot share fate with a display",
      ],
      answer: 3,
      why: "The reason is blast radius. A dashboard may lag or drop with no harm; a stop-loss feed may not. Isolation keeps the dashboard's failures from reaching execution, even if the relay is fine most days.",
      difficulty: "judge",
      distractors: [
        "Often true but not the reason, and it is not guaranteed. The argument should not depend on speed.",
        "Relays can carry binary. The August 2026 problem was shared fate, not data format.",
        "Tidiness is not a reason a reviewer will accept. The case rests on a specific failure that happened.",
        "",
      ],
    },
    {
      q: "A teammate says: add a bounded queue with drop-oldest to every consumer, including the one that builds candles, so nothing can ever get slow. What is the right response?",
      options: [
        "Agree, because dropping old data is always safer than adding delay",
        "Disagree: use it for displays, but for candles drop nothing or count and alert",
        "Disagree: use unbounded queues, since memory is cheap and nothing is lost",
        "Agree, provided each queue can hold at least a million entries",
      ],
      answer: 1,
      why: "Drop-oldest is a fine policy for a display, where only the latest matters. A candle builder that silently loses ticks reports wrong highs, lows and volume, so for it a drop must be impossible or at least loudly counted.",
      difficulty: "judge",
      distractors: [
        "Old data is less harmful only when the consumer needs just the newest value. A candle needs the whole sequence.",
        "",
        "Unbounded queues turn a slow consumer into growing memory and ever older decisions, which is worse for trading.",
        "A bigger queue only delays the point where data is dropped. The question is whether dropping is acceptable at all.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-fanout-backpressure-shared-path",
      scenario:
        "One server runs your engine for one user. A live strategy has an open NIFTY position with a stop. Ticks reach the engine through a serverless relay that also feeds the browser dashboard. The dashboard tab re-subscribes a 50-symbol watchlist on every network flap, and last week the engine saw nothing for over an hour. What do you change?",
      options: [
        {
          label: "Give the Lambda more memory and concurrency",
          appeal: "Cheap to try, and it may make sends faster.",
        },
        {
          label: "Limit how often the dashboard may subscribe",
          appeal: "Removes the noisiest source of churn without a new path.",
        },
        {
          label: "Give the engine its own direct feed and leave the relay for dashboards",
          appeal: "The stop no longer shares fate with any browser tab.",
        },
        {
          label: "Conflate everything on the relay to one update per second per symbol",
          appeal: "Fewer deliveries, so less load on the relay.",
        },
      ],
      best: 2,
      verdict:
        "A live position is open, so the stop needs a feed that dashboard behaviour cannot touch. More memory and a subscribe limit reduce the odds but leave the shared fate. Conflating on the relay would also coarsen the prices a stop reads. A direct feed for the engine removes the dependency entirely.",
      claims: [
        {
          text: "You accept a second tick path to maintain and a socket the engine now owns.",
          axis: "trade",
          correct: true,
          note: "True. Isolation costs extra code and operations, but it is small next to a stop being unwatched.",
        },
        {
          text: "The dashboard can now lag or flap without any effect on the stop.",
          axis: "trade",
          correct: true,
          note: "True. That is what a bulkhead is for: failure stays on the side that caused it.",
        },
        {
          text: "A subscribe rate limit alone gives the same protection, because churn is the only cause.",
          axis: "trade",
          correct: false,
          note: "False. Serial sends to dead rows and a stale registry also contributed in the post-mortem. Limiting churn leaves the shared path.",
        },
        {
          text: "If the direct feed fails, the engine is blind unless a fallback is wired in and the failure is loud.",
          axis: "failure",
          correct: true,
          note: "True. The ticker falls back to the relay with an error log, and a stale-feed watchdog reconnects. Silent fallback would hide the dependency.",
        },
        {
          text: "The relay can stay unmonitored now, since it no longer affects money.",
          axis: "failure",
          correct: false,
          note: "False. Dashboards are still used, and a relay that drops ticks quietly still misleads whoever reads them.",
        },
        {
          text: "Watch time since the last tick per symbol on the engine side, not only the relay's delivery counts.",
          axis: "measure",
          correct: true,
          note: "True. The engine's own view of silence is what protects the position, whatever the relay reports.",
        },
        {
          text: "The relay's Lambda error rate is enough to know that the engine is being fed.",
          axis: "measure",
          correct: false,
          note: "False. The relay can run without errors while posting to dead connections or holding an empty registry, as happened in the post-mortem.",
        },
      ],
    },
    {
      id: "sd-fanout-backpressure-watchlist-scale",
      scenario:
        "A broker app has 1,00,000 users online at the open. Each watches 20 symbols out of 500, and every symbol ticks about once a second. Users only need the newest price within one second. Today the gateway sends one message per tick per viewer. How do you cut the load?",
      options: [
        {
          label: "Send one message per tick to each viewer, and scale the gateway fleet",
          appeal: "Nothing to redesign, and every price is delivered.",
        },
        {
          label: "Conflate to the newest price per symbol and send one batched update per viewer each second",
          appeal: "Cuts deliveries to one per viewer per second, and a slow viewer cannot build a backlog.",
        },
        {
          label: "Let every client poll a REST endpoint each second",
          appeal: "No persistent connections and no per-connection state.",
        },
        {
          label: "Send only the symbols whose price moved by more than 1%",
          appeal: "Drops almost all traffic on quiet symbols.",
        },
      ],
      best: 1,
      verdict:
        "Per-tick delivery is 1,00,000 × 20 = 20,00,000 messages a second. One batched message per viewer per second is 1,00,000 a second, a twenty-fold cut, and the freshness need is met. Polling carries the same data with more overhead, and a 1% filter would hide small moves viewers expect to see.",
      claims: [
        {
          text: "You give up intermediate prices within each second, since viewers only see the newest.",
          axis: "trade",
          correct: true,
          note: "True. That loss is acceptable for a display and is what lets deliveries drop twenty-fold.",
        },
        {
          text: "Conflation is not suitable for a service that builds candles from the same stream.",
          axis: "trade",
          correct: true,
          note: "True. Candles need every tick for highs and lows, so such a consumer must read the unconflated stream.",
        },
        {
          text: "Batching one message per viewer per second keeps every tick, because the array contains all prices.",
          axis: "trade",
          correct: false,
          note: "False. With conflation each symbol appears once with its newest price. Batching alone, without conflation, keeps all ticks.",
        },
        {
          text: "A viewer on a bad network can no longer build an ever-growing backlog on the server.",
          axis: "failure",
          correct: true,
          note: "True. The newest-per-key buffer has a fixed size, one slot per symbol.",
        },
        {
          text: "Dead connections stop mattering because there are fewer messages.",
          axis: "failure",
          correct: false,
          note: "False. Each dead connection still costs a failed call every interval, so pruning on 410 remains necessary.",
        },
        {
          text: "Measure deliveries per second and the age of the price at delivery for a sample of viewers.",
          axis: "measure",
          correct: true,
          note: "True. The first shows the cut, the second shows the one-second freshness target is still met.",
        },
        {
          text: "The best single signal is the number of connected viewers.",
          axis: "measure",
          correct: false,
          note: "False. It says how many are connected, not whether they get timely prices.",
        },
      ],
    },
    {
      id: "sd-fanout-backpressure-slow-handler",
      scenario:
        "One engine process handles ticks from a shared Kite socket for several strategies. A strategy's tick handler updates its minute candle, checks tick-priced stops, and also runs a 400 ms indicator evaluation. Ticks arrive several times a second. The socket reader calls handlers one after another. How do you design the handler?",
      options: [
        {
          label: "Await the whole evaluation inside the handler so state is always consistent",
          appeal: "Simplest to reason about: one tick fully processed before the next.",
        },
        {
          label: "Put each tick in an unbounded queue and process it later",
          appeal: "The reader returns at once and nothing is lost.",
        },
        {
          label: "Keep only the latest price per second before the handler runs",
          appeal: "Fewer ticks means the 400 ms work fits.",
        },
        {
          label: "Do the cheap work inline, and run the evaluation once per closed bar as a separate task",
          appeal: "Stops and candles see every tick, while heavy work runs rarely.",
        },
      ],
      best: 3,
      verdict:
        "Stops and candle highs and lows need every tick, so conflation is wrong. Awaiting 400 ms per tick blocks the reader and delays every other strategy. An unbounded queue makes decisions on old prices. Keeping per-tick work cheap and evaluating once per closed bar fits the stated constraints.",
      claims: [
        {
          text: "You accept that evaluation runs as its own task, so two evaluations can overlap unless guarded.",
          axis: "trade",
          correct: true,
          note: "True. Moving work off the hot path needs a per-symbol guard or dedupe so the same bar is not evaluated twice.",
        },
        {
          text: "Rules are evaluated on closed bars, not on every tick.",
          axis: "trade",
          correct: true,
          note: "True. That is what makes it cheap enough, and it matches how candle-based rules are defined.",
        },
        {
          text: "Awaiting the work inline gives stricter correctness at no cost to other strategies.",
          axis: "trade",
          correct: false,
          note: "False. On a shared reader, one slow handler delays reading the next frame for everyone.",
        },
        {
          text: "With an unbounded queue, a stop could be checked against a price that is seconds old.",
          axis: "failure",
          correct: true,
          note: "True. The queue hides the problem as delay, and the position is managed on stale data.",
        },
        {
          text: "Dropping ticks to keep up is harmless because the latest tick contains all information.",
          axis: "failure",
          correct: false,
          note: "False. The latest price does not contain the high and low that occurred between updates, so candles and some stops would be wrong.",
        },
        {
          text: "Measure the time from tick receipt to stop check, and the age of the price used when a stop fires.",
          axis: "measure",
          correct: true,
          note: "True. These show whether the hot path is staying fast, which the average handler time can hide.",
        },
        {
          text: "Average handler time per tick is enough to show that the hot path is healthy.",
          axis: "measure",
          correct: false,
          note: "False. An average hides the occasional 400 ms evaluation that delays the next frame; the slow tail is what hurts.",
        },
      ],
    },
  ],
};

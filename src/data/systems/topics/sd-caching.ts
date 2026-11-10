import type { Topic } from "../../types.ts";

export const sdCaching: Topic = {
  id: "sd-caching",
  title: "Caching and pre-warming",
  tier: 2,
  week: 4,
  depth: "deep",
  summary:
    "A cache is a copy you can afford to lose. Learn cache-aside, TTLs, eviction, pre-warming, and why an unrebuildable record must never live only there.",
  why: "Traed leans on caches at every step: candles warmed before the open, option-chain chunks kept for backtests, and short-lived copies on the market-analysis page. One of them also taught an expensive lesson. A cache evicted the record of an open live position, and only a durable copy elsewhere saved it. You need the vocabulary to explain both the speed-ups and that incident, and to say where the line sits between a cache and a database.",
  learn: {
    intuition:
      "Think of a shop with a small shelf by the till and a big warehouse behind. Popular items sit on the shelf, so most customers are served in seconds. When an item is missing, someone walks to the warehouse, brings it, and puts a few on the shelf. The shelf is small, so something must be removed whenever it is full. Some goods go stale, so each carries a date after which it is thrown out. Before opening, a careful owner stocks the shelf with what today's customers will ask for, so the first rush does not queue at the warehouse door. Now the important rule. The shelf may be cleared at any time, by a power cut or by a tidy-up, and the shop must not lose anything. That is only true if everything on the shelf also exists in the warehouse. If the only copy of an item is on the shelf, it is not a shelf any more. It is a risk.",
    mechanics: [
      {
        heading: "Cache-aside: the application owns the lookup",
        body: "In cache-aside the code checks the cache first. On a hit it returns the value. On a miss it reads the source, stores the result in the cache, and returns it. The cache never talks to the source by itself. Traed's `CacheManager` stacks two layers this way: a small in-process memory cache (1,000 entries and a five-minute lifetime by default) in front of Redis, and a Redis hit is copied up into memory. The benefit is simple code and a cache you may delete at any time. The cost is that the first request after a miss is slow, and the cache can disagree with the source until its entry expires.",
      },
      {
        heading: "Lifetimes, keys and staleness",
        body: "Pick each lifetime (TTL, time to live) from how fast the truth changes. In Traed's option-chain service a live chunk lives for 60 seconds and an ordinary historical one for an hour. A chunk whose trading window closed more than three hours ago describes a day that never changes, so it is kept for seven days. The lag matters: caching a day that is still being written would freeze a half-empty answer. The key must also carry the data's shape. The key includes a row-schema version, so a deploy that adds a field cannot serve last week's rows in the old shape.",
      },
      {
        heading: "Eviction: the cache can lose anything",
        body: "A cache has a size limit, and when it is full an eviction policy chooses what to drop. LRU (least recently used) drops what has not been touched for longest. In Redis a memory cap with the allkeys-lru policy may remove any key, including one with a long TTL. In September 2026 this removed the Redis key holding an open live position, and after a restart the engine found nothing. The durable `live_positions` row in MySQL still held it, so the engine now rebuilds the position from that row at start and rewrites the key every five minutes. A cache must hold only what you can rebuild.",
      },
      {
        heading: "Pre-warming and the stampede",
        body: "Pre-warming fills the cache before the first customer arrives. Traed runs a job before 09:15 IST that finds symbols for active strategies, groups them by user so each user's broker limit is respected, fetches five days of one-minute candles, and stores each symbol for 24 hours. One failed symbol is logged and the job continues. A stampede is the opposite risk. When a hot key expires, many callers miss together and all hit the source. Single-flight lets the first caller compute while the others wait and then read the fresh value. The market-analysis caches use exactly that.",
      },
      {
        heading: "Saying it about Traed",
        body: "We use caches for speed and never as the record. Candles are warmed before the open from the broker, and a miss falls back to the broker. Option-chain chunks are cached, with long lifetimes only for sessions that have closed. Market-analysis caches coalesce concurrent misses so one request computes. We learned the limit the hard way: our Redis is capped and evicts any key, and it once evicted an open position. So positions and the daily loss ledger now have a MySQL row as the record, and Redis is only a copy we rewrite. We would revisit if memory pressure on Redis became routine.",
      },
    ],
    complexityDerivation:
      "The average cost of a read is hit rate times the cache time, plus miss rate times the source time. If the cache answers in a thousandth of the time the source takes, a 95 percent hit rate cuts the average to roughly a twentieth, and a 50 percent hit rate only to about a half. So a cache earns its keep only where requests repeat. The safety argument is separate. If every cached value can be recomputed from a source of truth, then losing the cache, by expiry, eviction or restart, changes only the speed. That is the invariant: a cache failure must never be a correctness failure. The argument breaks when a value has no source, as with the position that lived only in Redis. It breaks when staleness is unacceptable, as with the live price a stop-loss acts on. It also breaks when many misses arrive together, because the source then sees the full load, which is the stampede. In each case the remedy is outside the cache: a durable record, a fresh read, or request coalescing.",
    variants: [
      {
        name: "Cache-aside (lazy loading)",
        when: "Reads are repeated, the source is slow, and some staleness is fine. The default for most systems.",
        delta:
          "The application fills the cache on a miss. Simple and safe to lose, but the first read after a miss pays full cost, and a cold cache after a restart sends all traffic to the source.",
      },
      {
        name: "Pre-warming (eager loading)",
        when: "You know in advance what will be asked, such as the symbols of today's strategies before the open.",
        delta:
          "A scheduled job fills the cache ahead of demand, so the first rush is a hit. It costs source calls whether or not the data is used, and it can fail partway, so a miss path must still exist.",
      },
      {
        name: "Two levels: in-process plus shared",
        when: "Many processes want the same data, and a network hop to Redis is still too slow for the hottest entries.",
        delta:
          "A tiny local cache sits in front of the shared one. Reads are faster, but each process can hold a slightly different copy, so keep local lifetimes short.",
      },
    ],
    tradeoffs: [
      {
        vs: "Short TTL versus long TTL",
        pick: "Long only where the data can no longer change",
        because:
          "A closed session never changes, so seven days is safe. A live chain changes every minute, so 60 seconds caps how wrong it can be. One lifetime for everything is either wasteful or dangerous.",
      },
      {
        vs: "Cache as the record versus cache as a copy of a durable record",
        pick: "A copy, with the record in a database",
        because:
          "A copy can be evicted, expired or lost with no harm. A record in a cache is one memory-pressure event from disappearing. The extra write to the database is the price of that safety.",
      },
      {
        vs: "Recompute on every request versus cache and risk staleness",
        pick: "Cache read-mostly data; read fresh data for decisions that move money",
        because:
          "Candles and option-chain history are fine to cache. A price used to trigger a stop-loss is not: acting on a copy that is a minute old is a worse failure than the slower fresh read.",
      },
    ],
  },
  realWorld: [
    {
      system: "Facebook's memcache at scale",
      kind: "industry",
      problem:
        "When a very popular key is invalidated, thousands of web servers miss at once and flood the database.",
      applied:
        "Facebook's published memcache paper describes leases: the cache hands one client the right to refill a key, and the others wait briefly or take a slightly stale value. The paper also describes keeping the database as the source of truth.",
      evidence: "Nishtala et al., Scaling Memcache at Facebook (NSDI 2013)",
      impact:
        "The database sees one refill instead of thousands, and a lost cache node costs speed, not data.",
    },
    {
      system: "Redis eviction policies",
      kind: "industry",
      problem:
        "A Redis instance with a memory limit must decide what to do when it is full.",
      applied:
        "Redis documents policies such as noeviction, which refuses writes, allkeys-lru, which may remove any key, and volatile-lru, which removes only keys that carry a TTL. The chosen policy decides whether a key without a TTL, or with a long one, is safe.",
      evidence: "Redis documentation: key eviction (maxmemory-policy)",
      impact:
        "A team that uses Redis as a cache and as a store in the same instance must decide the policy knowingly, or eviction will decide for them.",
    },
    {
      system: "Traed market-data pre-warm",
      kind: "yours",
      problem:
        "At 09:15 several strategies need recent one-minute history at once, and the broker allows only a limited request rate per user.",
      applied:
        "A scheduled job before the open scans active strategies, groups symbols by user, fetches five days of one-minute candles for each, and writes them under `market_data:{symbol}:1minute` with a 24-hour lifetime. A failed symbol is logged and skipped.",
      evidence: "strategy-engine/app/services/pre_warm_service.py; ARCHITECTURE.md section 8",
      impact:
        "The first evaluation reads history from the cache instead of waiting on the broker, and a missing symbol falls back to a broker call.",
    },
    {
      system: "Traed live position record and the Redis eviction",
      kind: "yours",
      problem:
        "Redis on the engine host has a memory cap and evicts any key. A key for an open live position was evicted, and a restart then found no record of a real broker position.",
      applied:
        "Live positions are also written to a MySQL table. On start the engine reads that table back and rebuilds the Redis key, and a timer rewrites missing keys every five minutes. The daily loss ledger was moved to MySQL for the same reason.",
      evidence:
        "strategy-engine/app/services/order_management/order_manager.py; strategy-engine/app/services/live_persistence.py; strategy-engine/app/services/risk_breaker.py",
      impact:
        "An eviction is now healed within minutes, instead of being noticed at the next restart.",
    },
  ],
  insights: [
    {
      t: "A cache is a copy",
      d: "Everything in it must be recomputable from a source of truth. Then losing it costs time, never correctness.",
    },
    {
      t: "TTL follows how fast truth changes",
      d: "Sixty seconds for a live chain, a week for a closed session. Keys should also carry a data-shape version.",
    },
    {
      t: "Eviction ignores your TTL",
      d: "With allkeys-lru under memory pressure, a key with a 30-day TTL can vanish today. Never store the only copy there.",
    },
    {
      t: "Warm ahead, coalesce misses",
      d: "Pre-warming protects the first rush. Single-flight protects the source when a hot key expires.",
    },
  ],
  pitfalls: [
    "Treating a long TTL as durability. A TTL is a maximum age, not a promise that the key will stay.",
    "Caching a window that is still being written. A half-complete day, kept for a week, is worse than a slow read.",
    "Warming without a miss path. If the job fails for one symbol, the strategy must still be able to fetch it on demand.",
  ],
  quiz: [
    {
      q: "In cache-aside, what happens on a miss?",
      options: [
        "The cache fetches the value from the source on its own and returns it",
        "The application reads the source, fills the cache, and returns the value",
        "The application returns an error until a scheduled job refills the cache",
        "The application deletes the key and returns nothing to the caller",
      ],
      answer: 1,
      difficulty: "recall",
      why: "In cache-aside the application owns the lookup. The cache is a passive store that code checks first and fills after a miss.",
      distractors: [
        "That describes a read-through cache, where the cache layer itself loads the value. Cache-aside leaves it to the application.",
        "",
        "An error would turn every cold start into an outage. A miss should fall back to the source.",
        "Deleting the key removes nothing useful and returns no data to the caller.",
      ],
    },
    {
      q: "Which rule makes a cache safe to lose?",
      options: [
        "Give every key a TTL of at least one full day or longer",
        "Keep it in the same process as the application code",
        "Use the least recently used policy to choose evictions",
        "Everything in it can be rebuilt from a source of truth elsewhere",
      ],
      answer: 3,
      difficulty: "recall",
      why: "If every value can be recomputed from a durable source, losing the cache changes only the speed. Lifetimes and eviction policies do not provide that guarantee.",
      distractors: [
        "A long TTL says how long a value may live, not that it will survive. Eviction can remove it earlier.",
        "A local cache is lost on every restart, which makes the rebuild rule more important, not less.",
        "LRU chooses what to drop, but it cannot tell you whether the dropped item had another copy.",
        "",
      ],
    },
    {
      q: "Redis is capped and uses allkeys-lru. A key for an open position has a 30-day TTL and the instance fills with cached option-chain chunks. What can happen?",
      options: [
        "The position key can be evicted within hours, despite its TTL",
        "The position key survives, because a longer TTL gives it priority",
        "Redis refuses new chunk writes until space is free",
        "Redis moves the position key to disk automatically",
      ],
      answer: 0,
      difficulty: "apply",
      why: "allkeys-lru considers every key, whatever its TTL. Under memory pressure it removes the least recently used, which may be a quiet position key.",
      distractors: [
        "",
        "TTL is not a priority. Only the volatile-ttl policy looks at remaining TTL, and it still evicts under pressure.",
        "Refusing writes is the noeviction policy, not allkeys-lru.",
        "Redis keeps data in memory; it does not page individual keys to disk on its own.",
      ],
    },
    {
      q: "A hot option-chain snapshot is cached for 5 seconds. At each expiry, 400 requests arrive in the same second and all recompute it. What is the best fix?",
      options: [
        "Raise the cache size so that the key is never evicted",
        "Add more database replicas so 400 recomputes finish sooner",
        "Let the first request compute while the others wait for its result",
        "Remove the cache so that every request is treated equally",
      ],
      answer: 2,
      difficulty: "apply",
      why: "This is a stampede. Single-flight lets one caller refill the key, and the rest read the new value, so the source sees one computation instead of 400.",
      distractors: [
        "Eviction is not the cause. The key expires by TTL, however large the cache is.",
        "More replicas absorb the load but still do 400 times the work.",
        "",
        "Without the cache every request would do the full work, which is worse.",
      ],
    },
    {
      q: "The 08:55 pre-warm job gets a broker error for one of 40 symbols. The market opens in 20 minutes. What is the sound behaviour?",
      options: [
        "Abort the whole job and alert, since a partial cache is unsafe",
        "Retry the failed symbol in a tight loop until it works",
        "Cache an empty list so later reads do not touch the broker",
        "Log it, continue with the rest, and let that symbol fetch on first read",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Pre-warming is an optimisation, not a requirement. One failure should not block 39 other symbols, and the miss path still gives a correct answer.",
      distractors: [
        "A partial cache is fine because every miss falls back to the source. Aborting loses the 39 good symbols.",
        "A tight retry loop can hit the broker's rate limit and make everything slower.",
        "An empty cached list would be read as real data and would make that symbol look as though it had no history.",
        "",
      ],
    },
    {
      q: "Option-chain chunks are cached. Which lifetime fits a chunk that covers yesterday's closed session versus the current minute?",
      options: [
        "The same one-hour lifetime for both of these chunks",
        "Several days for yesterday, about a minute for the current minute",
        "A minute for yesterday, several days for the current minute",
        "Never cache either of them, always read the source",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Yesterday's data cannot change, so a long lifetime is safe and saves repeated work. The current minute keeps changing, so only a very short lifetime bounds how stale it can get.",
      distractors: [
        "One lifetime is either wasteful for the settled data or too stale for the live data.",
        "",
        "This is the wrong way round. It keeps stale live data for days and recomputes unchanging data constantly.",
        "Not caching repeats expensive work for data that is perfectly cacheable.",
      ],
    },
    {
      q: "An engineer wants to keep the day's realised loss counter only in Redis because it is fast, and restore it from nothing after a restart. What is the right call?",
      options: [
        "Keep a durable record in the database; Redis is an optional copy",
        "Allow it, because a restart is rare during market hours",
        "Allow it, but give the key a 30-day TTL for extra safety",
        "Reject Redis entirely for anything that the engine reads",
      ],
      answer: 0,
      difficulty: "judge",
      why: "A loss counter that vanishes lets a strategy that has used up its budget trade again. It has no source to rebuild from, so it needs a durable record. Redis can still hold a fast copy.",
      distractors: [
        "",
        "Restarts happen at every deploy, and eviction needs no restart, so rarity is not the right test.",
        "A TTL does not stop eviction, as the position-key incident showed.",
        "Redis is fine as a cache. The problem is making it the only record.",
      ],
    },
    {
      q: "A team caches the last traded price for 60 seconds so the stop-loss check is cheaper. What is the sound judgement?",
      options: [
        "Fine, as 60 seconds is shorter than most candle timeframes",
        "Fine, provided the cache is warmed before the open each day",
        "Not fine; a stop-loss needs a fresh read because a stale price delays exit",
        "Fine, if the TTL is raised to 10 minutes for even fewer reads",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A cache is right for read-mostly data. A stop-loss is a decision about money, and a price up to a minute old can mean a late exit. Here the freshness requirement beats the speed-up.",
      distractors: [
        "Candle length is not the test. A stop reacts to ticks and can be hit inside a minute.",
        "Warming helps the first read only and does nothing about staleness during the day.",
        "",
        "A longer TTL makes the staleness worse, not better.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-caching-position-record",
      scenario:
        "A trading engine runs on one server and restarts at every deploy. Redis on the same host has a memory cap and evicts with allkeys-lru, and cached option-chain chunks fill it each day. The engine keeps each open live position as a Redis key with a 30-day TTL. A position can be worth several lakh rupees, and an overnight position needs its stop managed after any restart. Where should the position record live?",
      options: [
        {
          label: "Redis only, with a long TTL",
          appeal:
            "Fastest reads and writes, and a 30-day TTL looks like plenty for any position.",
        },
        {
          label: "A MySQL row as the record, with Redis as a rebuildable copy that the engine rewrites regularly",
          appeal:
            "The record survives eviction and restart, and Redis still gives fast reads.",
        },
        {
          label: "In the engine's memory only",
          appeal:
            "No network hop and no eviction, so it is the quickest option.",
        },
        {
          label: "Redis with eviction disabled for the whole instance",
          appeal:
            "Removes the eviction risk without changing any code that uses Redis.",
        },
      ],
      best: 1,
      verdict:
        "The position has no other source, loses real money if forgotten, and the engine restarts at every deploy. It needs a durable record, with Redis as a copy. Redis with a long TTL is evictable, memory is lost on restart, and disabling eviction makes the cache chunks fail their writes once the instance is full.",
      claims: [
        {
          text: "You accept an extra database write on each position change, in return for a record that survives eviction and restart.",
          axis: "trade",
          correct: true,
          note: "True. The cost is small next to losing track of a live position.",
        },
        {
          text: "You accept that Redis and MySQL may briefly disagree, so start-up must reconcile them.",
          axis: "trade",
          correct: true,
          note: "True. The database row is the record, and the cache is repaired from it.",
        },
        {
          text: "You give up the speed of Redis entirely, since every read now goes to MySQL.",
          axis: "trade",
          correct: false,
          note: "Reads can still use Redis. The row is read at start and when a key is found missing.",
        },
        {
          text: "If the Redis key is evicted and no timer rewrites it, the position can go unmanaged until the next restart.",
          axis: "failure",
          correct: true,
          note: "True, and it is why a periodic re-persist exists beside the start-up rebuild.",
        },
        {
          text: "A 30-day TTL guarantees the key stays for 30 days.",
          axis: "failure",
          correct: false,
          note: "A TTL is a maximum age. Under allkeys-lru eviction can remove the key earlier.",
        },
        {
          text: "Count how many times a missing key is rebuilt from the database, and alert when it is not zero.",
          axis: "measure",
          correct: true,
          note: "True. It shows how often eviction is touching state that matters.",
        },
        {
          text: "The Redis hit rate is the main measure of whether positions are safe.",
          axis: "measure",
          correct: false,
          note: "Hit rate measures speed. Safety is measured by whether a lost key is recovered.",
        },
      ],
    },
    {
      id: "sd-caching-open-stampede",
      scenario:
        "A broker's web app shows the NIFTY option chain to 20,000 users. The snapshot is cached for 1 second. Each rebuild queries the market-data store and takes about 400 ms. At 09:15, when the snapshot expires, hundreds of requests arrive together and every one rebuilds it. The database then slows and the page times out. What should the team do?",
      options: [
        {
          label: "Cut the TTL to 200 ms",
          appeal:
            "Fresher data and the cache entry is replaced more often.",
        },
        {
          label: "Add database replicas so rebuilds run in parallel",
          appeal:
            "More capacity directly attacks the overload.",
        },
        {
          label: "Coalesce misses so one request rebuilds and the others reuse its result, optionally serving the previous snapshot meanwhile",
          appeal:
            "Turns hundreds of identical rebuilds into one, however many users arrive.",
        },
        {
          label: "Disable caching for the open",
          appeal:
            "Removes stale data at the busiest minute.",
        },
      ],
      best: 2,
      verdict:
        "The load is duplicate work: hundreds of identical rebuilds of one key. Request coalescing removes the duplicates at the source. A shorter TTL makes the herd form more often, replicas still do hundreds of rebuilds, and removing the cache sends every request to the database.",
      claims: [
        {
          text: "You accept that waiting callers get a result that is a fraction of a second old, or wait for one rebuild.",
          axis: "trade",
          correct: true,
          note: "True. Coalescing trades a tiny bit of freshness or latency for protecting the source.",
        },
        {
          text: "You gain protection that holds however many users arrive, because the rebuild count stays at one per key.",
          axis: "trade",
          correct: true,
          note: "True. That is why this beats scaling the database.",
        },
        {
          text: "Coalescing makes the data fresher than any TTL could.",
          axis: "trade",
          correct: false,
          note: "It does not change freshness. It changes how many rebuilds happen.",
        },
        {
          text: "If the single rebuild fails or hangs, every waiting caller is stuck unless there is a timeout or a stale fallback.",
          axis: "failure",
          correct: true,
          note: "True. Coalescing concentrates risk on one computation, so it needs a bounded wait.",
        },
        {
          text: "A shorter TTL removes the stampede because entries refresh sooner.",
          axis: "failure",
          correct: false,
          note: "Entries expire more often, so more herds form. Each expiry still lets all callers miss together.",
        },
        {
          text: "Watch rebuilds per key per second and the 99th percentile page time at the open.",
          axis: "measure",
          correct: true,
          note: "True. Rebuilds per key should stay near one, and tail latency shows user harm.",
        },
        {
          text: "The average page time across the whole day shows whether the open is healthy.",
          axis: "measure",
          correct: false,
          note: "A one-minute spike disappears inside a day-long average.",
        },
      ],
    },
    {
      id: "sd-caching-warm-before-open",
      scenario:
        "A small platform runs six strategies for one user. At 09:15 each needs five days of one-minute candles for about 40 symbols, and the broker allows only a few history requests per second per user. Fetching on first use would stall the first evaluations. The opening is at 09:15 and the team has a scheduler. How should they prepare the cache?",
      options: [
        {
          label: "A scheduled job before the open that groups symbols by user, fetches slowly within the limit, isolates failures, and leaves misses to fall back to the broker",
          appeal:
            "Spreads the broker calls out before the rush and tolerates one bad symbol.",
        },
        {
          label: "Do nothing; fetch lazily on first use",
          appeal:
            "Simplest code and no wasted calls for symbols that are never used.",
        },
        {
          label: "Warm all symbols every minute all day",
          appeal:
            "The cache is always fresh and never cold.",
        },
        {
          label: "Cache the candles for a week so one warm-up lasts",
          appeal:
            "One load serves many days, so there is less broker traffic.",
        },
      ],
      best: 0,
      verdict:
        "The demand is predictable and the broker limit is the bottleneck, so spending the quiet time before the open is the cheapest way to avoid the stall. Failure isolation and a miss fallback keep the job from becoming a new single point of failure. Lazy loading puts every call into the busiest minute, per-minute warming burns the rate limit, and a week-long TTL serves old history.",
      claims: [
        {
          text: "You spend broker calls on symbols that may not be used, in return for no stall at the open.",
          axis: "trade",
          correct: true,
          note: "True. Warming is an eager load and costs requests even for unused data.",
        },
        {
          text: "Grouping by user keeps each user's requests inside that user's own rate limit.",
          axis: "trade",
          correct: true,
          note: "True. The limits are per user, so work should be shaped per user.",
        },
        {
          text: "A week-long TTL is free, because history never changes.",
          axis: "trade",
          correct: false,
          note: "Recent history is rewritten as the day goes on, and the window must roll forward each morning.",
        },
        {
          text: "If the job fails for one symbol and has no miss fallback, a strategy can evaluate on missing history.",
          axis: "failure",
          correct: true,
          note: "True. The fallback fetch is what makes a failed warm-up harmless.",
        },
        {
          text: "If the warm-up job is late, the strategies cannot start at all.",
          axis: "failure",
          correct: false,
          note: "They can start. The first reads simply miss and go to the broker, more slowly.",
        },
        {
          text: "Measure the share of first reads at 09:15 that are cache hits, and the warm-up job's duration and failed symbols.",
          axis: "measure",
          correct: true,
          note: "True. These show whether the warm-up is doing its job.",
        },
        {
          text: "Total Redis memory used is the best sign that warming works.",
          axis: "measure",
          correct: false,
          note: "Memory use says what is stored, not whether the first reads were fast.",
        },
      ],
    },
  ],
};

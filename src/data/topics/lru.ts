import type { Topic } from "../types.ts";

export const lru: Topic = {
  id: "lru",
  title: "LRU / LFU cache design",
  tier: 4,
  week: 23,
  depth: "deep",
  summary:
    "Hash map + doubly-linked list, and when recency is the wrong signal.",
  why: "Every service in your stack has a cache. Which eviction policy is right is an empirical question most teams never actually ask.",
  complexity: "O(1) get & put",
  viz: ["lru"],
  learn: {
    intuition:
      "A cache that is full has to throw something away, and the whole design question is what. Least-recently-used is a bet: that what you touched most recently is what you will touch again. It is a good bet for most workloads, because real access patterns have locality — the same few keys keep coming back. Now the implementation problem. You need two things at once, and the obvious structures each give you exactly one. A hash map finds a key instantly but has no notion of which key is oldest. A list keeps things in order and lets you move an item to the front cheaply, but finding an item in it means walking it. So you use both, pointing at each other: the map holds key to *node*, and the node lives in a doubly-linked list ordered by recency. A lookup goes through the map to the node in O(1), unlinks it from wherever it is, and relinks it at the front — also O(1), because a doubly-linked node knows its own neighbours and needs no search. Eviction is the node at the back. Every operation is constant time because neither structure is ever scanned. That pairing — two structures cross-referencing each other so that each covers the other's blind spot — is a pattern worth recognising well beyond caches.",
    mechanics: [
      {
        heading: "The map stores nodes, not values",
        body: "`map.get(key)` must return something you can unlink in O(1), which means the node itself. If the map stores plain values you have the value but no idea where it sits in the recency order, and you are back to scanning the list. This is the single detail that makes the whole thing work.",
      },
      {
        heading: "Doubly linked, and with sentinel nodes",
        body: "Unlinking needs the previous node, so a singly-linked list forces a scan and the O(1) claim collapses. Use `prev` and `next`, and put permanent dummy nodes at the head and tail. Sentinels mean no operation ever has to special-case an empty list or a node at either end, and roughly half the bugs in hand-written LRU implementations live in exactly those cases.",
      },
      {
        heading: "Both get and put count as a use",
        body: "A read refreshes recency just as a write does — that is what 'recently used' means. Forgetting to refresh on `get` produces a cache that is really least-recently-*written*, which quietly evicts the hottest read-only keys. The bug does not throw; it shows up as a hit rate that is worse than it should be, which is far harder to attribute.",
      },
      {
        heading: "Writing an existing key updates and refreshes, it does not insert",
        body: "Check membership first. Overwriting without noticing the key was already present either double-counts the size, so the cache holds fewer entries than it thinks, or inserts a duplicate node and leaks the old one. Neither shows up in a small test.",
      },
      {
        heading: "The elegant JavaScript shortcut is not actually O(1) — this was measured",
        body: "`Map` preserves insertion order, so `map.delete(k); map.set(k, v)` moves a key to the most-recent end and `map.keys().next().value` looks like the least recent. It is a complete LRU in a dozen lines and it is genuinely tempting. It also degrades: V8's ordered hash table marks deleted entries with tombstones rather than compacting, so `keys().next()` has to skip over them, and a delete-heavy workload accumulates a great many. Measured on this topic's own lab — n operations against a cache of n/4 — the Map version grows 2.89×, then 3.29×, then 3.75× per doubling, while the map-plus-linked-list version stays near 2× and is about twelve times faster in absolute terms at 32,000 operations. The linked list is not interview ceremony; it is the version that holds its bound.",
      },
    ],
    complexityDerivation:
      "Every operation is O(1), and the argument is that nothing is ever searched. The map lookup is a hash, the unlink and relink touch a fixed number of pointers, and eviction reads the node before the tail sentinel. Memory is the more interesting figure: each entry costs the key, the value, two pointers and the map's own overhead, which for small values can easily be more metadata than data. That matters when sizing a cache — an in-process cache of a million short strings is not the size of a million short strings. The part worth arguing about is not the complexity at all but the hit rate, because that is what actually determines whether the cache helps. LRU's worst case is a cyclic scan slightly larger than the cache: with capacity k and a repeating loop over k+1 keys, every single access misses, because the one key you are about to need is always the one just evicted. That is not a contrived example — it is what a batch job over a table does to a shared cache. It is also why real systems rarely run textbook LRU: they add scan resistance, or an admission policy that refuses to let a one-off key evict a proven one.",
    variants: [
      {
        name: "LRU",
        when: "The default. Recency predicts reuse.",
        delta: "Map plus doubly-linked list, O(1) everywhere. Vulnerable to scans.",
      },
      {
        name: "LFU",
        when: "A stable set of keys is genuinely hot, and one-off traffic must not displace it.",
        delta:
          "Evict by access count rather than recency. Resists scans, but is slow to forget: a key that was hot last week keeps its count and holds a slot it no longer deserves, unless counts are aged.",
      },
      {
        name: "Segmented / midpoint LRU",
        when: "You want scan resistance without giving up recency.",
        delta:
          "New entries go into a small probationary segment and are only promoted to the protected segment on a second access. A scan churns through probation and never reaches the hot set. This is what InnoDB does.",
      },
      {
        name: "TinyLFU admission",
        when: "Maximum hit rate matters and you can afford a little extra machinery.",
        delta:
          "A compact approximate frequency sketch decides whether an arriving key deserves to *enter* at all, rather than deciding who leaves. Rejecting a one-off key is cheaper than evicting a good one, and this is what Caffeine and modern Go caches use.",
      },
    ],
    tradeoffs: [
      {
        vs: "LFU",
        pick: "Measure — the answer is workload-specific",
        because:
          "LRU adapts instantly to a shifting working set and collapses under scans. LFU resists scans and clings to yesterday's popular keys. Neither dominates. The useful move is to capture a real key trace for an hour and replay it against both offline, which is a few hundred lines and settles an argument that otherwise runs on intuition. Saying 'let us replay the trace' is a better answer in a design review than defending either policy.",
      },
      {
        vs: "Exact LRU versus an approximation",
        pick: "Approximate, at scale",
        because:
          "Redis samples a handful of keys and evicts the oldest among them rather than maintaining a global order, because exact LRU needs a linked list touched on every read — which means a write on every read, and under concurrency, a contended lock on the hottest path in the system. Sampling gives up a little precision to remove that contention entirely. Exactness is a property worth trading here, and knowing why is the point.",
        },
      {
        vs: "No cache at all",
        pick: "No cache until you have measured the hit rate you expect",
        because:
          "A cache adds a coherence problem, a memory cost and a whole class of stale-data bugs. At a 20% hit rate it may be making things worse once invalidation and memory pressure are counted. The question to ask first is what the access distribution looks like — if it is close to uniform over a large key space, no eviction policy will save you and the honest answer is to fix the underlying query.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — historical bar and option-chain cache",
      kind: "yours",
      problem:
        "Backtests and live evaluation repeatedly request the same instrument-and-date bars. Refetching from the broker or the database each time is slow and rate-limited, but the full history does not fit in memory.",
      applied:
        "A bounded cache keyed by instrument and window, with pre-warming for the instruments a strategy is known to need. The pre-warm step is an admission decision rather than an eviction one: it puts the keys that matter in before the workload starts, so a one-off scan cannot displace them.",
      evidence: "strategy-engine/scripts/pre_warm_market_data.py",
      impact: "Repeated fetches on a rate-limited path → bounded memory with a warm hot set",
    },
    {
      system: "Redis eviction",
      kind: "industry",
      problem:
        "Maintaining an exact global recency order requires updating a shared linked list on every read, which turns reads into writes and makes the hottest keys the most contended.",
      applied:
        "Redis's `allkeys-lru` samples a small number of keys at eviction time and discards the oldest among them, approximating LRU without any global order. Raising the sample size trades CPU for accuracy. `allkeys-lfu` adds a probabilistic counter that decays over time, which is LFU with the ageing problem addressed.",
      evidence: "Redis `maxmemory-policy`, `maxmemory-samples`",
      impact: "A contended global order → approximate eviction with no shared write path",
    },
    {
      system: "InnoDB buffer pool",
      kind: "industry",
      problem:
        "A single full-table scan reads millions of pages that will never be needed again. Under textbook LRU each one enters as most-recently-used and evicts a genuinely hot index page, so one reporting query destroys the cache for everybody.",
      applied:
        "The LRU list is split at a midpoint. New pages enter at the midpoint into the 'young' region rather than at the head, and are only promoted to the hot region if they are accessed again after a short delay. A scan touches each page once, so its pages never get promoted and drain out without disturbing the hot set.",
      impact:
        "One reporting query flushing the buffer pool → scans confined to a bounded region",
    },
    {
      system: "CPU caches and TLBs",
      kind: "industry",
      problem:
        "Choosing a victim line within a set, in a couple of nanoseconds, in hardware, with no room for pointers or a linked list.",
      applied:
        "Pseudo-LRU: a handful of bits per set forms a small tree that approximately tracks which half was used less recently. It is provably not exact LRU and the difference in hit rate is tiny, while the difference in transistor count and latency is not. The clearest illustration that the *policy* and its *implementation* are separate choices.",
      impact: "Exact ordering replaced by a few bits per set, at negligible hit-rate cost",
    },
  ],
  lab: {
    prompt:
      "Implement an LRU cache. `ops` is a list of operations: `[0, key]` is a get, which returns the stored value or −1 if absent; `[1, key, value]` is a put. Both a get and a put count as a use. When the cache is full, evict the least recently used key. Return an array with one result per get, in order. Budget: O(1) per operation — scanning to find the least recent will fail the gate.",
    fnName: "lruCache",
    signature: "lruCache(capacity: number, ops: number[][]): number[]",
    starter: `function lruCache(capacity, ops) {
// Your budget: O(1) per operation.
// You need O(1) lookup AND O(1) recency reordering. One structure
// gives you one of those; you need both pointing at each other.
// Remember: a get counts as a use, not just a put.
//
// Note: the tempting Map delete-then-set trick, with keys().next() to
// pick the victim, does NOT hold O(1) here — deleted entries leave
// tombstones the iterator must walk past. The gate will catch it.

return [];
}`,
    tests: [
      {
        // put(1,1) put(2,2) get(1)=1 put(3,3)->evicts 2 get(2)=-1
        // put(4,4)->evicts 1 get(1)=-1 get(3)=3 get(4)=4
        name: "the classic sequence",
        input: [
          2,
          [[1, 1, 1], [1, 2, 2], [0, 1], [1, 3, 3], [0, 2], [1, 4, 4], [0, 1], [0, 3], [0, 4]],
        ],
        expected: [1, -1, -1, 3, 4],
      },
      {
        // THE test for refreshing on get. get(1) makes 1 most recent, so
        // put(3,3) must evict 2, not 1. A cache that only refreshes on
        // put returns [1, -1, 2] here.
        name: "a get counts as a use",
        input: [
          2,
          [[1, 1, 1], [1, 2, 2], [0, 1], [1, 3, 3], [0, 1], [0, 2]],
        ],
        expected: [1, 1, -1],
      },
      {
        // Overwriting key 1 must refresh it, not insert a duplicate, so
        // key 2 is the one evicted.
        name: "writing an existing key refreshes it",
        input: [
          2,
          [[1, 1, 1], [1, 2, 2], [1, 1, 10], [1, 3, 3], [0, 2], [0, 1], [0, 3]],
        ],
        expected: [-1, 10, 3],
      },
      {
        name: "capacity of one",
        input: [1, [[1, 1, 1], [0, 1], [1, 2, 2], [0, 1], [0, 2]]],
        expected: [1, -1, 2],
      },
      {
        name: "miss on an empty cache",
        input: [2, [[0, 7]]],
        expected: [-1],
      },
      { name: "no operations", input: [2, []], expected: [], hidden: true },
      {
        // Overwriting the same key repeatedly must not grow the size.
        name: "repeated overwrite of one key",
        input: [1, [[1, 5, 50], [1, 5, 60], [0, 5]]],
        expected: [60],
        hidden: true,
      },
      {
        // A value of 0 is a real value and must not be confused with a
        // miss. A solution returning `found || -1` returns -1 here.
        name: "a stored value of 0 is not a miss",
        input: [2, [[1, 1, 0], [0, 1]]],
        expected: [0],
        hidden: true,
      },
    ],
    hints: [
      "You need two things at once: find a key instantly, and know which key is oldest. A hash map gives the first and a recency-ordered list gives the second — so use both, with the map storing a reference INTO the list rather than the plain value.",
      "Use a `Map` from key to NODE, plus your own doubly-linked list with dummy head and tail nodes. Because each node knows its own neighbours, unlinking it is four pointer writes and needs no search — which is the whole reason the list has to be doubly linked.",
      "Two things to be careful about. A get must refresh recency, not just a put. And a stored value of 0 is a real value — test for presence, not truthiness, or every zero looks like a miss. Be warned that the tempting `map.delete(k); map.set(k, v)` shortcut with `map.keys().next()` for eviction measures super-linear here: V8 leaves tombstones behind deleted entries and the iterator has to walk past them.",
    ],
    solution: `function lruCache(capacity, ops) {
// Map from key -> NODE (not to the value): the node is what lets us
// unlink in O(1) without searching the list.
const map = new Map();
const out = [];

// Sentinels, so no operation has to special-case an empty list or a
// node at either end. head.next is most recent, tail.prev is least.
const head = { k: null, v: null, prev: null, next: null };
const tail = { k: null, v: null, prev: head, next: null };
head.next = tail;

// Doubly linked, so a node knows both neighbours and removing it is
// four pointer writes. A singly-linked list would need a scan to find
// the predecessor, and the O(1) claim would collapse.
const unlink = (n) => { n.prev.next = n.next; n.next.prev = n.prev; };
const pushFront = (n) => {
  n.next = head.next; n.prev = head;
  head.next.prev = n; head.next = n;
};

for (const op of ops) {
  if (op[0] === 0) {
    const node = map.get(op[1]);
    // Compare against undefined, not truthiness: a stored value of 0
    // is a real value and must not read as a miss.
    if (node === undefined) { out.push(-1); continue; }
    unlink(node); pushFront(node);   // a GET counts as a use
    out.push(node.v);
  } else {
    const k = op[1];
    const v = op[2];
    const existing = map.get(k);
    if (existing !== undefined) {
      // Already present: update and refresh. NOT an insert — treating
      // it as one would over-count the size.
      existing.v = v;
      unlink(existing); pushFront(existing);
      continue;
    }
    if (map.size >= capacity) {
      const lru = tail.prev;         // least recently used
      unlink(lru);
      map.delete(lru.k);
    }
    const node = { k, v, prev: null, next: null };
    pushFront(node);
    map.set(k, node);
  }
}

return out;
}`,
    complexityGate: {
      target: "O(n)",
      // n operations against a cache holding n/4 keys, so eviction is
      // genuinely exercised rather than the cache simply never filling.
      // Keys are spread by a multiplicative hash so the access pattern is
      // neither sequential nor a tight loop — a scan-shaped pattern would
      // make every access a miss and mask a slow lookup.
      gen: "(n) => [n >> 2, Array.from({ length: n }, (_, i) => (i % 3 === 0 ? [0, (i * 2654435761) % n] : [1, (i * 2654435761) % n, i]))]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Two structures, because neither alone suffices",
      d: "The hash map gives O(1) lookup but no order. The linked list gives O(1) reordering but no lookup. Together they give both — and the map must store the NODE, not the value, or you cannot unlink in O(1).",
    },
    {
      t: "LRU is defeated by a scan",
      d: "One pass over cold data evicts the entire working set, because each cold key arrives as most-recently-used. LFU resists this; so does an admission policy like TinyLFU, and so does InnoDB's midpoint insertion.",
    },
    {
      t: "Recency vs frequency is a measurable question",
      d: "Take real keys from a real cache and replay them against both policies. Whichever has the higher hit rate wins — and the answer is workload-specific, which is why 'let us replay the trace' beats defending either one.",
    },
    {
      t: "TTL and eviction solve different problems",
      d: "TTL is about staleness; eviction is about capacity. A cache almost always needs both, and conflating them causes subtle bugs.",
    },
    {
      t: "At scale, exact LRU is the wrong goal",
      d: "Maintaining a global order means writing on every read, which contends on the hottest keys. Redis samples a few keys instead, and hardware uses a few bits per set. The policy and its implementation are separate choices.",
    },
  ],
  pitfalls: [
    "Not refreshing recency on `get`. The cache silently becomes least-recently-*written* and evicts hot read-only keys.",
    "Storing values rather than nodes in the map, which forces a list scan to unlink and quietly makes every operation O(n).",
    "Using truthiness to detect a hit. A cached 0, empty string or false then reads as a miss, which is worse than useless — it re-fetches exactly the values that were cached correctly.",
    "Inserting a key that is already present, so the size counter and the real contents drift apart.",
    "Assuming the `Map` delete-then-set shortcut is O(1) in JavaScript. V8 tombstones deleted entries instead of compacting, so the `keys().next()` used to find the victim walks past them and the whole thing measures super-linear under eviction pressure.",
  ],
  quiz: [
    {
      q: "Why does an LRU cache need both a hash map and a linked list?",
      options: [
        "For thread safety",
        "The map gives O(1) lookup; the list gives O(1) reordering and eviction. Neither provides both.",
        "To store more items",
        "For persistence",
      ],
      answer: 1,
      difficulty: "recall",
      why: "An array would make reordering O(n); a bare map has no order at all. The pairing is what makes every operation O(1).",
      distractors: [
        "Neither structure is thread-safe, and the pairing makes concurrency harder rather than easier — two structures must now stay consistent under a lock.",
        "",
        "Capacity is fixed by the policy, not by the structures. Two structures store the same number of entries as one, with more overhead per entry.",
        "Both are purely in-memory. Persistence is an orthogonal concern and neither provides it.",
      ],
    },
    {
      q: "A batch job scans millions of cold keys through a hot LRU cache. What happens?",
      options: [
        "Nothing — LRU handles it",
        "The scan evicts the entire hot working set, and the hit rate collapses",
        "The cache grows",
        "The scan is served from cache",
      ],
      answer: 1,
      difficulty: "recall",
      why: 'Classic cache pollution. Each cold key is "most recently used" on arrival and pushes out something genuinely valuable.',
      distractors: [
        "LRU is precisely the policy with no defence here — its rule guarantees the newest arrival is the last to be evicted, however worthless it is.",
        "",
        "The capacity is fixed. That is what forces the eviction in the first place.",
        "Every scanned key is cold by definition, so each one is a miss on arrival. The scan gets no benefit and destroys everyone else's.",
      ],
    },
    {
      q: "Your LRU passes every test but the hit rate in production is worse than expected. You find that `get` does not update recency. What has the cache become?",
      options: [
        "A FIFO queue",
        "Least-recently-WRITTEN, which evicts hot read-only keys",
        "An LFU cache",
        "A random-eviction cache",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Only writes move a key, so a key written once and read a million times ages exactly as if it were never touched. Read-heavy keys — usually the most valuable ones — are the first to go.",
      distractors: [
        "It resembles FIFO for keys that are never rewritten, which is the closest of the wrong answers — but a key that IS rewritten still gets refreshed, so the order is not purely arrival order.",
        "",
        "LFU counts accesses, and this counts none of the reads at all. It is the opposite of frequency-aware.",
        "Eviction is entirely deterministic here — it is just ordered by the wrong event.",
      ],
    },
    {
      q: "Why does Redis sample a handful of keys instead of maintaining an exact LRU order?",
      options: [
        "Sampling gives a better hit rate",
        "Exact LRU requires updating a shared list on every read, turning reads into writes and contending on the hottest keys",
        "Redis has no linked lists",
        "To save memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The cost of exactness is a write on the read path, which is the worst place to put one — the hottest keys become the most contended. Sampling gives up a little accuracy to remove the shared write entirely.",
      distractors: [
        "Sampling is strictly less accurate than exact LRU by construction. It is chosen despite a slightly worse hit rate, not because of a better one.",
        "",
        "Redis is built on linked lists — they back its list type. Availability was never the issue.",
        "There is a small per-key memory saving, but the decisive reason is contention on the read path, not bytes.",
      ],
    },
    {
      q: "InnoDB inserts new pages at the MIDPOINT of its LRU list rather than the head. Why?",
      options: [
        "To make insertion cheaper",
        "So a scan's pages, touched only once, drain out without ever being promoted to the hot region",
        "To keep the list balanced",
        "To support larger buffer pools",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Promotion to the hot region requires a second access after a delay. A scan touches each page exactly once, so its pages never qualify and churn through the cold half without disturbing anything valuable.",
      distractors: [
        "Insertion at the midpoint is marginally more work than at the head, not less. The cost is accepted for the scan resistance.",
        "",
        "It is a linked list, not a search tree — there is no balance property to maintain.",
        "Pool size is a configuration setting and is unaffected by where pages enter the list.",
      ],
    },
    {
      q: "TinyLFU decides ADMISSION rather than eviction. Why is that a different idea?",
      options: [
        "It is the same thing viewed from the other side",
        "Refusing to let a one-off key in is cheaper than evicting a proven one — the arriving key must earn its place rather than automatically getting one",
        "It removes the need for a cache",
        "It only works for small caches",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Under LRU an arriving key is admitted unconditionally and something valuable pays for it. Admission control inverts the default: the newcomer is compared against the victim, and loses unless it looks more valuable. That is exactly the defence a scan cannot get past.",
      distractors: [
        "They are genuinely different policies. Eviction chooses who leaves from among proven residents; admission chooses whether an unproven arrival gets in at all, and only the second one can reject a scan.",
        "",
        "It is a cache policy — it makes the cache better rather than unnecessary.",
        "The frequency sketch is compact precisely so it can scale; large caches benefit most, since they have more to lose to a scan.",
      ],
    },
    {
      q: "Access is close to uniform over a key space far larger than the cache. What is the honest recommendation?",
      options: [
        "Switch from LRU to LFU",
        "No eviction policy will help — fix the underlying query or accept the miss rate, because the hit rate is bounded by cache size over key space",
        "Increase the sample size",
        "Add a second cache layer",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Every policy exploits skew. With none, the best achievable hit rate is roughly the fraction of the key space that fits, and no ordering rule changes that. Recognising when the cache cannot help is more valuable than tuning it.",
      distractors: [
        "LFU also exploits skew — with uniform access every key has the same frequency and the policy has nothing to work with.",
        "",
        "Sampling accuracy only matters when some keys are genuinely better than others to keep. Under uniform access every choice is equivalent.",
        "A second layer multiplies the memory cost and the coherence problem while the hit-rate ceiling stays exactly where it was.",
      ],
    },
    {
      q: "A cached value of `0` keeps being re-fetched. What is the bug?",
      options: [
        "The eviction policy",
        "The lookup tests the value's truthiness instead of key presence, so 0, false and empty string all read as misses",
        "The capacity is too small",
        "The hash function collides",
      ],
      answer: 1,
      difficulty: "apply",
      why: "`if (cached)` treats every falsy stored value as absent. It is the same mistake as testing a memo table for truthiness, and it re-fetches precisely the values that were cached correctly.",
      distractors: [
        "The policy decides what leaves, not whether a present value is recognised. This value is in the cache and is being ignored.",
        "",
        "Capacity would cause genuine evictions, which would affect all values rather than only the falsy ones.",
        "A collision would return a wrong value or a miss for arbitrary keys, not consistently for the value 0.",
      ],
    },
  ],
};

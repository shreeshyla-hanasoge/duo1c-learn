import type { Topic } from "../types.ts";

export const hashing: Topic = {
  id: "hashing",
  title: "Hash maps & hash sets",
  tier: 0,
  week: 1,
  depth: "core",
  summary:
    "Collision handling, load factor, and exactly when O(1) stops being true.",
  why: "The hash map is the default answer to roughly half of all interview questions, and the source of a whole family of production surprises when the load factor or the hash quality goes wrong. Knowing when its O(1) stops being true is what separates using it from understanding it.",
  complexity: "O(1) average · O(n) worst",
  viz: ["hashing"],
  learn: {
    intuition:
      "A hash map is a trick for turning a key into an array position. You run the key through a hash function that produces a number, take that number modulo the number of slots, and store the entry there. Looking it up repeats the same calculation and goes straight to the slot — no searching. The trick has one unavoidable problem: two different keys can produce the same slot, which is called a collision. Everything interesting about hash map design is the answer to two questions: what do we do when two keys land in the same slot, and how full do we let the table get before we make it bigger?",
    mechanics: [
      {
        heading: "Hash the key to a slot",
        body: "`slot = hash(key) % capacity`. The hash function should scatter similar keys far apart — `'user1'` and `'user2'` must not land next to each other, or a whole family of real keys would cluster.",
      },
      {
        heading: "Handle the collision",
        body: "Two strategies. Chaining stores a small list in each slot and appends the new entry. Open addressing stores entries directly in the array and, when the slot is taken, probes for the next free one by a fixed rule. Chaining is simpler and tolerates a full table; open addressing is faster while sparse because everything stays in one contiguous block.",
      },
      {
        heading: "Compare keys, not hashes",
        body: "The hash gets you to the right slot. Since several keys can share a slot, the map must still compare the actual keys for equality. This is why a type used as a key must have both a hash and an equality definition, and why they must agree: equal keys must always hash the same.",
      },
      {
        heading: "Watch the load factor and grow",
        body: "Load factor is entries divided by slots. Past roughly 0.75 the chains lengthen and probing starts to wander, so lookups drift away from constant time. The map then allocates a bigger table — usually double — and rehashes every entry into it. That single operation is O(n).",
      },
      {
        heading: "Deleting is not symmetric with inserting",
        body: "With chaining, deletion just unlinks from the list. With open addressing, removing an entry would break the probe chain for anything that hashed past it, so implementations write a tombstone marker instead. Tombstones accumulate and eventually force a rebuild — which is why delete-heavy workloads suit chaining better.",
      },
    ],
    complexityDerivation:
      "Where does 'O(1) average' actually come from? Assume the hash function spreads keys uniformly and the load factor is α = n/m (entries over slots). With chaining, the expected number of entries in the slot you land on is α, so a lookup costs about 1 + α comparisons. If the implementation keeps α bounded by growing the table — say at most 0.75 — then 1 + α is bounded by a constant, and lookup is O(1) on average. Two things are worth noticing. First, this argument depends entirely on uniform spreading; a hash function that maps every key to the same slot gives chains of length n and lookups of O(n), and that is not a theoretical concern but a real attack. Second, it is an average, not an amortised bound: it is a claim about typical keys, not a guarantee across every sequence. The growth itself is amortised — n inserts trigger about log n rehashes copying 1 + 2 + 4 + … + n ≈ 2n entries in total, so insertion is amortised O(1) even though one insert in every n pauses to rehash everything.",
    variants: [
      {
        name: "Chaining",
        when: "The default. Deletes are common, or the load factor may go high.",
        delta:
          "A list per slot. Degrades gracefully — at load factor 2 it is still just chains of length 2. Java turns chains longer than 8 into red-black trees, which caps the worst case at O(log n).",
      },
      {
        name: "Open addressing",
        when: "Read-heavy, load factor kept low, and cache behaviour matters.",
        delta:
          "Everything in one array, no per-entry allocation, excellent locality. Python dicts, Go maps and Rust's HashMap all use variants. Degrades sharply past about 0.7 and needs tombstones for deletion.",
      },
      {
        name: "Hash set",
        when: "You only need membership, not an associated value.",
        delta:
          "The same structure with the value dropped. This is the fix for `list.includes(x)` inside a loop, and the highest-value single change in most slow application code.",
      },
      {
        name: "Randomised / keyed hashing (SipHash)",
        when: "Keys can come from an untrusted user.",
        delta:
          "A per-process random seed means an attacker cannot predict which keys collide. Standard since the 2011 hash-flooding attacks, and the reason Python's string hashes differ between runs.",
      },
    ],
    tradeoffs: [
      {
        vs: "A sorted array plus binary search",
        pick: "Hash map for pure lookup, sorted array for anything ordered",
        because:
          "The hash map gives O(1) versus O(log n), and for a single-key lookup that wins. But it answers only 'is this exact key present'. Range queries, next-largest, and in-order iteration all need the sorted structure, and no amount of hashing brings them back.",
      },
      {
        vs: "A balanced tree map",
        pick: "Tree map when you need ordering or a guaranteed worst case",
        because:
          "A tree gives O(log n) always, ordered iteration and range scans. A hash map gives O(1) usually and O(n) if the hash misbehaves. In a latency-critical path, a predictable log n can beat an unpredictable constant.",
      },
      {
        vs: "An array indexed by the key",
        pick: "Plain array when keys are small dense integers",
        because:
          "If keys are 0..n with few gaps, an array is faster, smaller, allocation-free and collision-free. A hash map earns its overhead only when the key space is sparse or not integers at all.",
      },
    ],
  },
  realWorld: [
    {
      system: "Redis",
      kind: "industry",
      problem:
        "Rehashing a hash table with tens of millions of keys in one go would block the single-threaded server for seconds, which is unacceptable for a store people put in front of a database.",
      applied:
        "Incremental rehashing. Redis keeps two tables during a resize and moves a few buckets per operation, so no single command pays the full O(n) cost. Reads check both tables until the migration finishes.",
      evidence: "Redis dict.c, `dictRehash`",
      impact: "One multi-second stall → amortised across millions of commands",
    },
    {
      system: "UPI / payment idempotency keys",
      kind: "industry",
      problem:
        "A network retry can deliver the same payment request twice. Without deduplication, the user is debited twice for one transaction.",
      applied:
        "Each request carries a unique idempotency key. The server keeps a hash set of keys it has already processed and returns the stored result rather than executing again. Constant-time membership is what makes this affordable on the hot path.",
      impact: "Exactly-once behaviour on an at-least-once network",
    },
    {
      system: "Hash-flooding attacks and randomised seeds",
      kind: "industry",
      problem:
        "In 2011 it was shown that PHP, Python, Ruby, Java, Node and ASP.NET all hashed form parameters with a predictable function. Sending thousands of colliding keys made every insert a linear scan, turning one small request into minutes of CPU.",
      applied:
        "Runtimes moved to randomised, keyed hash functions such as SipHash. The average-case O(1) argument assumes keys are not chosen adversarially — the fix was to make it impossible to choose them adversarially.",
      evidence: "CVE-2011-4815 and related, 28C3 'Efficient Denial of Service'",
      impact: "O(n^2) parse → O(n), and the attack becomes unconstructable",
    },
    {
      system: "traed — symbol and instrument lookup",
      kind: "yours",
      problem:
        "Resolving an instrument token from a tradingsymbol by scanning a list of instruments is O(n) per lookup, and it happens on every order placement and every tick.",
      applied:
        "Build the symbol-to-token dictionary once at startup and look up in O(1). The general shape — 'I am scanning a collection to find one item by key, repeatedly' — is the single most reliable signal that a hash map belongs here.",
      impact: "O(n) scan per lookup → O(1)",
    },
  ],
  lab: {
    prompt:
      "Return the item that appears most often in the array. If several tie, return the one whose first appearance is earliest. The natural solution that counts each item with a `filter` is correct and quadratic; the complexity gate runs on input with no early exit. Budget: O(n).",
    fnName: "mostFrequent",
    signature: "mostFrequent(items: string[]): string | null",
    starter: `function mostFrequent(items) {
  // Budget: O(n) time.
  // Careful: items.filter(...) inside a loop is a full pass per element.
  // Ties go to whichever item appeared first in the input.

  return null;
}`,
    tests: [
      {
        name: "clear winner",
        input: [["a", "b", "a", "c", "a"]],
        expected: "a",
      },
      {
        name: "tie goes to the earliest first appearance",
        input: [["b", "a", "a", "b"]],
        expected: "b",
      },
      {
        name: "all distinct — first wins",
        input: [["x", "y", "z"]],
        expected: "x",
      },
      { name: "single item", input: [["only"]], expected: "only" },
      { name: "empty array", input: [[]], expected: null },
      {
        // A plain object inherits keys such as "constructor" and
        // "toString" from Object.prototype, so `counts[item]` is not
        // undefined for these. A Map has no such problem.
        name: "keys that collide with Object.prototype",
        input: [["constructor", "toString", "constructor"]],
        expected: "constructor",
        hidden: true,
      },
      {
        name: "later item overtakes an earlier one",
        input: [["a", "b", "b", "c", "b"]],
        expected: "b",
        hidden: true,
      },
      {
        name: "empty string is a real key",
        input: [["", "", "a"]],
        expected: "",
        hidden: true,
      },
    ],
    hints: [
      "Counting is one pass with a Map: for each item, set its count to the previous count plus one.",
      "Use a `Map`, not a plain object. A plain object already has `constructor` and `toString` inherited from its prototype, so counting those keys starts from something that is not undefined.",
      "For the tie rule, walk the original array again in order and take the first item whose count equals the maximum. That gives 'earliest first appearance' without tracking positions separately.",
    ],
    solution: `function mostFrequent(items) {
  if (items.length === 0) return null;

  const count = new Map();
  for (const it of items) {
    count.set(it, (count.get(it) ?? 0) + 1);
  }

  let best = 0;
  for (const c of count.values()) {
    if (c > best) best = c;
  }

  // Walk the input, not the map: the first item reaching the max is by
  // definition the one that appeared earliest.
  for (const it of items) {
    if (count.get(it) === best) return it;
  }
  return null;
}`,
    complexityGate: {
      target: "O(n)",
      // Every item distinct, so every count is 1 and nothing can short
      // circuit. A filter-per-item solution compares every pair.
      gen: "(n) => [Array.from({ length: n }, (_, i) => 'k' + i)]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "O(1) is a claim about the load factor",
      d: "Entries divided by slots. Past roughly 0.75, chains lengthen and lookups drift toward linear. Growth is what keeps the promise, and growth means an occasional O(n) rehash.",
    },
    {
      t: "Chaining versus open addressing",
      d: "Chaining tolerates a high load factor and deletes cleanly. Open addressing is faster while sparse — better cache behaviour, no per-entry allocation — but degrades sharply when full and makes deletion awkward, since removals leave tombstones.",
    },
    {
      t: "A bad hash function is a denial-of-service vector",
      d: "If someone can force every key into one slot, every operation becomes O(n). This is why runtimes randomise their string hash seeds, and why Python's `hash('a')` differs between runs.",
    },
    {
      t: "Replace `list.includes()` inside a loop, always",
      d: "It is the most common O(n^2) in application code and the cheapest to fix. Build a Set once, then membership is O(1).",
    },
    {
      t: "Equal keys must hash equally",
      d: "If you define custom equality you must define a matching hash, or two keys that compare equal will land in different slots and the map will hold both. In Python that is `__eq__` and `__hash__`; in Java, `equals` and `hashCode`.",
    },
  ],
  pitfalls: [
    "Using a mutable object as a key and then mutating it. Its hash changes, and the entry becomes unreachable — still occupying memory, findable by nothing.",
    "Assuming iteration order is meaningful. It is an implementation detail almost everywhere; Python 3.7+ preserving insertion order is a deliberate exception, not a general rule.",
    "Using a plain JavaScript object as a counter. Keys such as `constructor` and `toString` are inherited from the prototype, so lookups return functions instead of undefined. Use `Map`.",
    "Keying on a floating-point value. `0.1 + 0.2` does not equal `0.3`, so the lookup misses even though the numbers look identical when printed.",
  ],
  quiz: [
    {
      q: "A hash map holds 800 entries across 1000 slots. What is the load factor, and what does it imply?",
      options: [
        "0.8 — comfortably fast, no action needed",
        "0.8 — at the point where most implementations grow, because chains are lengthening",
        "1.25 — the map is overloaded",
        "It cannot be determined without knowing the hash function",
      ],
      answer: 1,
      difficulty: "apply",
      why: "800/1000 = 0.8, right around the typical 0.75 growth threshold. Beyond it, average chain length rises and lookups slow measurably.",
      distractors: [
        "0.8 is the right number, but it is past the point where implementations decide to resize, not comfortably inside it.",
        "",
        "That is slots divided by entries, which is the ratio the wrong way round.",
        "The load factor is defined purely by the counts. Hash quality affects how evenly entries spread, which is a separate question.",
      ],
    },
    {
      q: "What is the worst-case time for a hash map lookup?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answer: 2,
      difficulty: "recall",
      why: "If every key collides into one slot, the lookup degenerates to scanning n entries. Some implementations soften this — Java converts long chains into red-black trees, giving O(log n) — but the plain structure is O(n).",
      distractors: [
        "That is the average case, and only while the hash spreads keys evenly and the load factor stays bounded.",
        "This is the worst case for Java's HashMap specifically, because it converts long chains to trees. It is not the general answer.",
        "",
        "Nothing here sorts. There is no path to an n log n lookup.",
      ],
    },
    {
      q: "Open addressing tends to beat chaining when:",
      options: [
        "The table is densely loaded",
        "The table is sparsely loaded and cache locality matters",
        "Deletions are frequent",
        "Keys hash poorly",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Open addressing keeps everything in one contiguous array, which gives excellent locality — but only while the table stays sparse. Dense tables make probes wander, and frequent deletes leave tombstones.",
      distractors: [
        "The opposite. As load rises, probe sequences lengthen sharply, and past about 0.8 the structure falls apart.",
        "",
        "Deletion is open addressing's weak point: you cannot simply remove an entry without breaking the probe chain, so you leave a tombstone behind.",
        "Poor hashing hurts open addressing more, because clustered keys make probe sequences collide as well as slots.",
      ],
    },
    {
      q: "You store objects in a hash map keyed by a mutable object, then modify a field used in its hash. What happens?",
      options: [
        "The map rehashes automatically",
        "The entry becomes unreachable — it is still in the map, but lookups compute a different slot",
        "It throws an exception",
        "Nothing, hashes are computed at lookup time",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The entry was placed in the slot given by its old hash. The map has no idea the object changed, so a lookup with the new hash goes to a different slot and finds nothing. The entry stays in memory, findable by nothing — a leak and a bug at once.",
      distractors: [
        "The map has no way to be notified of a change to a key it merely holds a reference to.",
        "",
        "No language throws here. It fails silently, which is why the rule is 'use immutable keys' rather than 'be careful'.",
        "The hash is computed at lookup time — that is exactly the problem. It is computed from the new field values and no longer matches where the entry was put.",
      ],
    },
    {
      q: "Your Python service parses user-supplied JSON into a dict, and CPU spikes on certain requests. Most likely cause?",
      options: [
        "JSON parsing is inherently slow",
        "Keys crafted to collide, turning dict operations into linear scans",
        "The dict is too large for memory",
        "Garbage collection",
      ],
      answer: 1,
      difficulty: "judge",
      why: "This is hash flooding. Thousands of keys chosen to land in the same slot make each insert scan the whole chain, turning an O(n) parse into O(n^2). Modern Python randomises its string hash seed per process, which is precisely the defence — verify `PYTHONHASHSEED` is not pinned.",
      distractors: [
        "Parsing is linear in the input size and would not spike on particular requests of similar size.",
        "",
        "Memory pressure causes swapping or an out-of-memory error, not a CPU spike on specific inputs.",
        "GC pauses are not correlated with particular request contents, and they would show as pauses across all requests.",
      ],
    },
    {
      q: "You need lookups by key AND the ability to ask 'what is the next key after X'. Best structure?",
      options: [
        "Hash map",
        "Balanced tree map (std::map, TreeMap, SortedDict)",
        "Hash map plus a sorted array kept in sync",
        "Array",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Hashing deliberately destroys ordering — that is what buys the O(1). A tree map keeps keys in order, giving O(log n) lookup plus successor, predecessor and range queries. Reaching for the tree is the right first move; the hybrid is what you build only when profiling shows the log n is actually a problem.",
      distractors: [
        "It answers only 'is this exact key present'. There is no way to recover ordering from a hash map without scanning everything.",
        "",
        "It works and is what you build under real pressure, but you now maintain two structures and keep them consistent. Start with the tree.",
        "An array gives you ordering but O(n) insertion, and lookup by key needs a search.",
      ],
    },
    {
      q: "Why must `hashCode` (or `__hash__`) agree with equality?",
      options: [
        "For performance",
        "Because two equal keys hashing differently would land in different slots, so the map would hold both",
        "Because the language requires it",
        "To avoid collisions",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The hash decides the slot and equality decides the match within it. If equal objects hash differently they never meet, so the map stores duplicates and lookups miss. It is a correctness requirement, not a performance one.",
      distractors: [
        "Performance is a real secondary consequence, but the primary failure is wrong answers.",
        "",
        "Most languages document the contract and none of them enforce it. Breaking it compiles cleanly and fails silently at runtime.",
        "Collisions are normal and handled. The problem here is the opposite — keys that should collide into the same slot do not.",
      ],
    },
    {
      q: "In JavaScript, you count occurrences into `const counts = {}` and one input value is `'constructor'`. What breaks?",
      options: [
        "Nothing",
        "`counts['constructor']` is inherited from Object.prototype, so `counts[x] ?? 0` starts from a function rather than 0",
        "The object throws on that key",
        "The count is off by one",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A plain object inherits `constructor`, `toString`, `valueOf` and more from its prototype, so a lookup for those keys returns something instead of undefined and the counting arithmetic produces NaN. Use `new Map()`, or `Object.create(null)`.",
      distractors: [
        "It is a real and well-known bug class — it is the reason `Map` exists and the reason `Object.create(null)` is a common idiom.",
        "",
        "No throw. It quietly returns the inherited function, which is what makes the failure hard to spot.",
        "Not off by one — the arithmetic becomes NaN, so the entry is neither counted nor obviously broken.",
      ],
    },
  ],
};

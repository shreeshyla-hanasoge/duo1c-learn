import type { Topic } from "../types.ts";

export const fenwick: Topic = {
  id: "fenwick",
  title: "Fenwick tree (BIT)",
  tier: 4,
  week: 18,
  depth: "deep",
  summary: "Prefix sums that survive updates, in O(log n).",
  why: "The structure for cumulative aggregates over changing data — a running P&L ledger, a live leaderboard, rank queries.",
  complexity: "O(log n) update & query",
  viz: ["fenwick"],
  learn: {
    intuition:
      "A prefix-sum array answers 'what is the total of the first i items' instantly, because you precomputed every running total. Its weakness is that changing one item invalidates every total after it, so an update costs a full pass. The opposite extreme — keep the raw array and add things up on demand — makes updates instant and queries slow. A Fenwick tree refuses to choose. The idea is to store partial sums over blocks whose sizes are powers of two, arranged so that any prefix is the sum of a handful of them — never more than one block per bit in the index. Position 13 is 1101 in binary, so the prefix of 13 items is one block of 8, plus one of 4, plus one of 1. That is three lookups instead of thirteen additions. And the arrangement works in reverse too: any single position belongs to only about log n blocks, so an update touches only those. Both directions are logarithmic because both are really just walking the bits of an index. The famous part is how cheap that walk is — `i & (-i)` gives you the lowest set bit, and adding or subtracting it is the entire navigation scheme. No pointers, no recursion, one array.",
    mechanics: [
      {
        heading: "One array, one-indexed, where each slot owns a power-of-two block",
        body: "`tree[i]` holds the sum of the `i & (-i)` items ending at position `i`. So `tree[8]` covers positions 1 through 8, `tree[12]` covers 9 through 12, and `tree[13]` covers only itself. Index from 1, not 0 — the entire scheme is built on bit arithmetic and `0 & (-0)` is 0, which makes position zero a loop that never terminates.",
      },
      {
        heading: "`i & (-i)` isolates the lowest set bit",
        body: "Two's complement negation flips every bit above the lowest set one, so the AND leaves exactly that bit and nothing else. For 12 (1100) it gives 4. That one expression is the whole navigation scheme, and it is worth being able to explain rather than just recite — it is a common follow-up question precisely because reciting it is so easy.",
      },
      {
        heading: "Update walks UP by adding the lowest set bit",
        body: "To add a delta at position `i`, update `tree[i]`, then move to `i + (i & -i)` and repeat until you pass the end. Each step clears the lowest set bit and carries into a higher one, so you touch at most one slot per bit — O(log n). Note that a Fenwick tree naturally supports 'add delta', not 'set to value': to set, read the current value first and add the difference.",
      },
      {
        heading: "Query walks DOWN by removing the lowest set bit",
        body: "For the prefix sum up to `i`, add `tree[i]`, then move to `i - (i & -i)` and repeat until you reach 0. Each step strips one set bit, so it runs once per 1 in the binary form of `i` — at most log n. A range sum `[l, r]` is `prefix(r) - prefix(l-1)`, exactly the same subtraction trick as a static prefix array.",
      },
      {
        heading: "Build in O(n), not O(n log n)",
        body: "The obvious build is n updates at O(log n) each. The better one: copy the values in, then for each `i` push `tree[i]` into its parent at `i + (i & -i)` in a single left-to-right pass. That is O(n), and it matters when you rebuild often — for instance when a Fenwick tree is used per shard and shards are re-partitioned.",
      },
    ],
    complexityDerivation:
      "Both operations walk the set bits of an index, and an index below n has at most log₂(n) bits, so both are O(log n) with a very small constant — the loop body is one addition and one bit operation, with no pointer chasing and no branching on tree shape. Space is exactly n+1 numbers, which is the detail that most distinguishes it in practice: a segment tree needs roughly 4n, so a Fenwick tree is a quarter of the memory and stays in cache far longer on the sizes where this matters. The reason it can be that small is that it is not really a tree at all — it is an array whose index arithmetic implies a tree, so none of the structure has to be stored. What that buys in compactness it gives up in generality: the shape only supports operations with an inverse, because range queries are computed by subtracting one prefix from another. Sums and counts qualify; minimum does not, since knowing the minimum of the first 10 and the minimum of the first 3 tells you nothing about positions 4 through 10. That single sentence is the whole Fenwick-versus-segment-tree decision, and it is worth having ready.",
    variants: [
      {
        name: "Point update, range query",
        when: "The default — running totals over changing data.",
        delta: "`add(i, delta)` and `prefix(i)`. One array, twenty lines.",
      },
      {
        name: "Range update, point query",
        when: "'Add 5 to everything between l and r', then read single positions.",
        delta:
          "Store a difference array in the Fenwick tree: `add(l, +5)` and `add(r+1, -5)`. A point read becomes a prefix sum. Same structure, inverted meaning.",
      },
      {
        name: "Range update, range query",
        when: "Both ends need to be ranges.",
        delta:
          "Two Fenwick trees and a small algebraic identity. Doable, and the point at which a segment tree with lazy propagation is usually the clearer choice.",
      },
      {
        name: "Order statistics — find the k-th element",
        when: "'Who is at rank k' on a live leaderboard.",
        delta:
          "Descend the implicit tree by powers of two, comparing against the running total. O(log n) rather than O(log² n) from binary-searching the prefix function.",
      },
    ],
    tradeoffs: [
      {
        vs: "A static prefix-sum array",
        pick: "The prefix array when the data never changes",
        because:
          "O(1) queries beat O(log n), and the code is one line. The Fenwick tree exists solely because a single update invalidates every prefix after it, turning updates into O(n). If your data is loaded once and queried forever, the simpler structure wins outright — and saying that first shows you chose rather than defaulted.",
      },
      {
        vs: "A segment tree",
        pick: "Fenwick when the operation has an inverse and you only need prefixes",
        because:
          "A quarter of the memory, a much smaller constant, no recursion, and roughly a third of the code. But range queries are computed as `prefix(r) − prefix(l−1)`, which requires subtraction to be meaningful. Range minimum has no inverse, so it cannot be expressed this way at all, and lazy range assignment cannot either. Those are the cases a segment tree exists for.",
      },
      {
        vs: "A sorted array or a balanced BST for rank queries",
        pick: "Fenwick when the value space is small or can be compressed",
        because:
          "A Fenwick tree indexed by value answers 'how many items are below x' in O(log n) with an array of size equal to the value range. When values are arbitrary — floating-point prices, 64-bit IDs — you must first map them to compact indices, which needs the full set up front and rules out a streaming setting. That coordinate-compression step is the hidden precondition, and forgetting to mention it is how this proposal falls apart in review.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — running P&L and position ledger",
      kind: "yours",
      problem:
        "Cumulative realised P&L up to any point in a session, over a ledger that keeps changing — fills arrive out of order, and corrections rewrite earlier entries. Recomputing the running total after every correction is a full pass over the day.",
      applied:
        "Keep the ledger in a Fenwick tree indexed by time bucket. A fill or a correction is one `add`, and 'P&L as of 11:15' is one prefix query. Because a correction is expressed as a delta rather than a rewrite, the structure never needs to distinguish a new fill from an amendment.",
      evidence: "strategy-engine/_perf/bench_perday.py",
      impact: "O(n) recomputation per correction → O(log n)",
    },
    {
      system: "Live leaderboards",
      kind: "industry",
      problem:
        "A fantasy-sports contest with millions of entries during an IPL match. Scores change on every ball, and every user wants their rank immediately. Sorting the whole table per update is impossible.",
      applied:
        "A Fenwick tree indexed by score bucket holds how many entries sit at each score. A user's rank is one prefix query — how many entries score above them — and a score change is two updates, one to remove from the old bucket and one to add to the new. Scores are already integers in a bounded range, so no coordinate compression is needed.",
      impact: "A full re-sort per update → two O(log n) updates and an O(log n) rank read",
    },
    {
      system: "Adaptive arithmetic coding",
      kind: "industry",
      problem:
        "A compressor that learns symbol frequencies as it reads needs the cumulative frequency below a symbol for every symbol it encodes — and the frequencies change after each one.",
      applied:
        "This is exactly point-update, prefix-query, and it is one of the oldest uses of the structure. The encoder reads a cumulative frequency in O(log n) and bumps the symbol's count in O(log n), rather than maintaining a cumulative table that a single increment would invalidate.",
      impact:
        "O(alphabet) per symbol → O(log alphabet), on the innermost loop of the codec",
    },
    {
      system: "Approximate percentiles in monitoring",
      kind: "industry",
      problem:
        "Reporting p95 and p99 latency over a rolling window, without keeping every sample. Sorting on demand is too slow and keeping all samples is too much memory.",
      applied:
        "Bucket latencies into fixed ranges and hold the counts in a Fenwick tree. A percentile is a search for the bucket where the running total crosses 95% of the count, which the order-statistics descent answers in O(log n). The bucketing is the approximation, and it is a deliberate accuracy-for-memory trade rather than an accident.",
      impact: "Bounded memory and O(log n) percentile reads, at a known bucket-width error",
    },
  ],
  lab: {
    prompt:
      "Count the INVERSIONS in an array: the number of index pairs `i < j` where `nums[i] > nums[j]`. Equal values are not an inversion. Budget: O(n log n) — the obvious double loop is correct and will fail the gate. A Fenwick tree over the values is the intended route; a merge-sort count is an equally valid O(n log n) answer.",
    fnName: "countInversions",
    signature: "countInversions(nums: number[]): number",
    starter: `function countInversions(nums) {
// Your budget: O(n log n) time.
// Walk the array and ask, for each element, how many ALREADY-SEEN
// values are strictly greater than it. A Fenwick tree over the value
// space answers that in O(log n) — but values must be mapped to
// compact 1-based indices first.

return 0;
}`,
    tests: [
      {
        // (2,1) (3,1) (8,6) (8,1) (6,1)
        name: "mixed order",
        input: [[2, 3, 8, 6, 1]],
        expected: 5,
      },
      { name: "already sorted", input: [[1, 2, 3]], expected: 0 },
      {
        // Every pair is inverted: 3 choose 2.
        name: "reversed",
        input: [[3, 2, 1]],
        expected: 3,
      },
      {
        // STRICTLY greater — equal values are not inversions. A solution
        // that uses >= counts 3 here.
        name: "duplicates are not inversions",
        input: [[1, 1, 1]],
        expected: 0,
      },
      {
        // Mixed duplicates: only (7,1) twice.
        name: "duplicates and a drop",
        input: [[7, 7, 1, 7]],
        expected: 2,
      },
      { name: "empty", input: [[]], expected: 0, hidden: true },
      { name: "single element", input: [[1]], expected: 0, hidden: true },
      {
        // 10 = 5 choose 2, the maximum for five elements.
        name: "fully reversed, five elements",
        input: [[5, 4, 3, 2, 1]],
        expected: 10,
        hidden: true,
      },
    ],
    hints: [
      "Values can be any numbers, but a Fenwick tree is indexed by position. Sort the distinct values, map each to its 1-based rank, and work with ranks from then on — this is coordinate compression, and it is the step people forget.",
      "Walk the array left to right. Before inserting element i, ask how many already-inserted values are strictly greater than it: that is `seenSoFar - prefix(rank(nums[i]))`, since `prefix` counts everything at rank ≤ this one. Then insert by adding 1 at its rank.",
      "The Fenwick tree itself is two loops. `add(i, delta)`: while `i <= n`, do `tree[i] += delta; i += i & (-i)`. `prefix(i)`: while `i > 0`, do `sum += tree[i]; i -= i & (-i)`. Index from 1 — starting at 0 makes the update loop spin forever, because `0 & (-0)` is 0.",
    ],
    solution: `function countInversions(nums) {
const n = nums.length;
if (n < 2) return 0;

// Coordinate compression: a Fenwick tree is indexed by position, so
// arbitrary values must become compact 1-based ranks first.
const sorted = [...new Set(nums)].sort((a, b) => a - b);
const rank = new Map();
for (let i = 0; i < sorted.length; i++) rank.set(sorted[i], i + 1);

const size = sorted.length;
const tree = new Int32Array(size + 1);   // 1-indexed: slot 0 is unused

// Walk UP by adding the lowest set bit.
function add(i) {
  for (; i <= size; i += i & -i) tree[i] += 1;
}
// Walk DOWN by stripping the lowest set bit.
function prefix(i) {
  let s = 0;
  for (; i > 0; i -= i & -i) s += tree[i];
  return s;
}

let inversions = 0;
for (let j = 0; j < n; j++) {
  const r = rank.get(nums[j]);
  // Already-inserted values that are STRICTLY greater than this one.
  // prefix(r) counts everything at rank <= r, so subtracting it from
  // the count so far leaves exactly the greater ones — which is what
  // keeps equal values from counting as inversions.
  inversions += j - prefix(r);
  add(r);
}

return inversions;
}`,
    complexityGate: {
      target: "O(n log n)",
      // A multiplicative-hash permutation of 0..n-1: the multiplier is odd
      // and not a multiple of 5, and every size is 2^k · 5^3, so the two
      // are coprime and the mapping is a genuine permutation.
      //
      // A permutation gives a large, well-spread inversion count. Nearly
      // sorted input would let an adaptive quadratic solution look fast.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 2654435761) % n)]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "It exists because prefix arrays cannot be updated",
      d: "A static prefix array is O(1) query but O(n) update, because changing one element invalidates every total after it. A Fenwick tree is O(log n) for both — the right trade the moment the data mutates.",
    },
    {
      t: "`i & (-i)` isolates the lowest set bit",
      d: "That single expression is the entire navigation scheme: add it to walk up on update, subtract it to walk down on query. Two's complement negation flips everything above that bit, so the AND leaves exactly it.",
    },
    {
      t: "Smaller and faster than a segment tree",
      d: "One array of n+1 numbers against roughly 4n, no recursion, tiny constants. If you only need prefix-sum-style operations, prefer it. Segment trees earn their weight when you need arbitrary range queries or lazy propagation.",
    },
    {
      t: "It needs an operation with an inverse",
      d: "Range queries are `prefix(r) − prefix(l−1)`, so subtraction must mean something. Sums and counts qualify; minimum does not, which is the whole Fenwick-versus-segment-tree decision in one sentence.",
    },
    {
      t: "Arbitrary values need coordinate compression first",
      d: "The tree is indexed by position, so prices or IDs must be mapped to compact ranks. That step needs the full value set up front, which quietly rules out a streaming setting.",
    },
  ],
  pitfalls: [
    "Indexing from 0. `0 & (-0)` is 0, so the update loop adds nothing to the index and spins forever.",
    "Trying to store a minimum. Range queries subtract two prefixes, and minimum has no inverse — the structure cannot express it however the code is arranged.",
    "Forgetting coordinate compression on arbitrary values, then allocating a tree the size of the value range.",
    "Treating `add` as `set`. A Fenwick tree accumulates deltas; to set a position you must read the old value and add the difference.",
  ],
  quiz: [
    {
      q: "A static prefix-sum array supports O(1) queries. Why use a Fenwick tree?",
      options: [
        "It uses less memory",
        "A single element update costs O(n) with a prefix array but O(log n) with a Fenwick tree",
        "It supports larger arrays",
        "It is easier to implement",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Updating a[i] invalidates every prefix after i. When updates are frequent, the prefix array is the wrong structure.",
      distractors: [
        "Both are one array of about n numbers. Memory is essentially identical, which is exactly why the update cost is the whole argument.",
        "",
        "Neither has a size limit the other lacks. Array length is not what separates them.",
        "The prefix array is one line and the Fenwick tree is twenty. Simplicity favours the prefix array, which is why it should stay the default on immutable data.",
      ],
    },
    {
      q: "What does `i & (-i)` compute?",
      options: [
        "The highest set bit",
        "The lowest set bit, isolated",
        "The number of set bits",
        "i modulo 2",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Two's complement negation flips all bits above the lowest set bit, so the AND leaves exactly that bit. It is the whole Fenwick navigation scheme.",
      distractors: [
        "The highest set bit has no single-expression identity like this one, and it is not what the traversal needs — block sizes are read from the bottom up.",
        "",
        "That is popcount, which counts bits rather than isolating one, and it returns a count rather than a power of two.",
        "`i & 1` gives parity. `i & (-i)` returns 1 only when i happens to be odd; for 12 it returns 4.",
      ],
    },
    {
      q: "Why can a Fenwick tree not answer range MINIMUM queries?",
      options: [
        "Minimum is not associative",
        "Range queries are computed as prefix(r) − prefix(l−1), and minimum has no inverse — knowing min of the first 10 and first 3 says nothing about positions 4 to 10",
        "The tree is too small",
        "It can, with a second tree",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The structure only stores prefixes, and recovering an arbitrary range from two prefixes requires subtracting one from the other. Subtraction is meaningful for sums and counts and meaningless for minima.",
      distractors: [
        "Minimum is perfectly associative — that is exactly why a segment tree handles it happily. Associativity is not the missing property; invertibility is.",
        "",
        "Size is unrelated. However large the tree, two prefix minima still cannot be combined into a range minimum.",
        "There is a variant supporting prefix minima on an append-only array, but general range minimum genuinely cannot be done. This is the case a segment tree or sparse table exists for.",
      ],
    },
    {
      q: "You index the tree from 0 and the update loop hangs. Why?",
      options: [
        "The array is too small",
        "`0 & (-0)` is 0, so `i += i & (-i)` never advances",
        "Negative indices wrap around",
        "The query loop is the problem, not the update",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The whole traversal is built on the lowest set bit being non-zero. Position 0 has no set bits, so the step size is zero and the loop makes no progress. One-indexing is not a convention here — it is a requirement.",
      distractors: [
        "Size is unrelated; the loop never reaches the end because it never moves at all.",
        "",
        "No negative index is ever produced. `-0` is 0, and the AND yields 0 rather than anything out of range.",
        "The query loop terminates fine from 0 — its condition is `i > 0`, so it exits immediately. It is the upward walk that stalls.",
      ],
    },
    {
      q: "You need rank queries over floating-point prices arriving as a live stream. What is the problem?",
      options: [
        "Fenwick trees cannot store floats",
        "Indexing by value needs coordinate compression, which requires the whole value set up front — and a stream does not have that",
        "The tree would be too slow",
        "Prices change too quickly",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The tree is indexed by position, so arbitrary values must be mapped to compact ranks first, and building that map needs every value in advance. In a streaming setting you need bucketing to a fixed grid, or an order-statistics tree instead.",
      distractors: [
        "It stores whatever you put in the slots — floats are fine as stored values. What cannot be a float is the INDEX.",
        "",
        "O(log n) per operation is fast enough for essentially any stream. The blocker is structural, not a performance one.",
        "Update rate is what the structure is good at — that is the entire reason to choose it over a static prefix array.",
      ],
    },
    {
      q: "Building a Fenwick tree from n existing values. The naive way is n updates at O(log n). What is better?",
      options: [
        "Sort the values first",
        "Copy the values in, then in one left-to-right pass push each tree[i] into its parent at i + (i & -i) — O(n)",
        "Build it recursively",
        "There is no better way",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Each slot needs to contribute to exactly one parent, and a single forward pass does that in order. O(n) rather than O(n log n), which matters when the structure is rebuilt often.",
      distractors: [
        "Sorting changes which position holds which value, and a Fenwick tree is indexed by position. It would build a tree over different data.",
        "",
        "There is no stored tree structure to recurse over — it is a flat array with implied parents. Recursion adds frames and no saving.",
        "The O(n) build is standard and is roughly four lines. Claiming no improvement exists is the answer that costs you the question.",
      ],
    },
    {
      q: "'Add 5 to every element between l and r', then read individual positions. How?",
      options: [
        "Loop from l to r calling add",
        "Store a DIFFERENCE array in the tree: add(l, +5) and add(r+1, −5), so a point read becomes a prefix sum",
        "Use a segment tree — a Fenwick tree cannot do this",
        "Rebuild the tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Inverting what the tree stores inverts which operation is cheap. With differences in the slots, a range update is two point updates and a point read is a prefix sum — the exact mirror of the usual configuration.",
      distractors: [
        "That is O(r − l) per update, which is the O(n) behaviour the structure exists to avoid.",
        "",
        "A segment tree with lazy propagation certainly handles it, but so does a Fenwick tree with two lines of change. Reaching for the heavier structure without noticing that is a real miss.",
        "Rebuilding is O(n) per update, worse than the naive loop for a narrow range.",
      ],
    },
    {
      q: "In a design review, the single sentence that decides Fenwick versus segment tree is:",
      options: [
        "Fenwick trees are faster",
        "Does the operation have an inverse, and do I only need prefixes? If yes, Fenwick; if I need range min/max or lazy range updates, segment tree",
        "Segment trees use more memory",
        "It depends on the input size",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It is a capability question before it is a performance one. Invertibility is what makes prefix subtraction valid, and that is exactly what a Fenwick tree relies on. Everything else — memory, constants, code size — follows once the capability question is settled.",
      distractors: [
        "They are, by a useful constant, and that is the tiebreaker once both structures can do the job. Leading with it skips the question of whether one of them can.",
        "",
        "True — roughly 4n against n+1 — and again a consequence rather than the deciding criterion.",
        "Both are O(log n) at every size, so size does not select between them. It might select a plain prefix array if the data turns out to be immutable.",
      ],
    },
  ],
};

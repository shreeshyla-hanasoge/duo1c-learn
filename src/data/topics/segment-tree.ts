import type { Topic } from "../types.ts";

export const segmentTree: Topic = {
  id: "segment-tree",
  title: "Segment tree",
  tier: 4,
  week: 18,
  depth: "deep",
  summary: "Arbitrary range queries, plus lazy propagation for range updates.",
  why: "The general-purpose answer when a Fenwick tree is not expressive enough — range min/max, range assignment, any associative merge.",
  complexity: "O(log n) query & update",
  learn: {
    intuition:
      "A Fenwick tree is cheap because it only ever stores prefixes, and it recovers a range by subtracting one prefix from another. That works beautifully for sums and not at all for minimums, because knowing the smallest of the first ten and the smallest of the first three tells you nothing about positions four to ten. A segment tree fixes that by storing the answer for actual ranges rather than for prefixes. Split the array in half, then split each half, all the way down to single elements — a binary tree where every node holds the answer for its own slice. Now any query range, however awkward, can be covered by a small set of these nodes: descend from the root, and whenever a node's slice lies entirely inside your range, take its stored answer and stop, and whenever it lies entirely outside, ignore it. Only nodes straddling a boundary need splitting further, and at each level there are at most two of those — one at each end of the range. That is where the logarithm comes from, and it is worth seeing that it is a different argument from the Fenwick one: this is about how many nodes a range can straddle, not about how many bits an index has.",
    mechanics: [
      {
        heading: "Every node stores the answer for its own slice",
        body: "A leaf covers one element; an internal node covers the union of its children and stores `merge(left, right)`. The merge is the only problem-specific part — `Math.min`, `+`, `Math.max`, gcd, a matrix product. The tree itself does not care what it is, which is why one implementation serves all of them.",
      },
      {
        heading: "Query: take whole nodes, split only the straddlers",
        body: "Descend from the root with three cases. If the node's range is completely outside the query, return the operation's identity — `Infinity` for min, `0` for sum. If it is completely inside, return its stored value without descending further. Otherwise recurse into both children and merge. Getting the identity element wrong is the most common bug and it produces answers that are wrong only for some ranges, which makes it painful to find.",
      },
      {
        heading: "The merge must be associative — and that is the only requirement",
        body: "The tree combines nodes in whatever grouping the recursion produces, so `(a·b)·c` must equal `a·(b·c)`. It does not need to be commutative, which matters for things like matrix products and 'leftmost match' merges where order carries meaning. It does not need an inverse either, and that freedom is precisely what a Fenwick tree lacks.",
      },
      {
        heading: "Lazy propagation defers range updates",
        body: "Adding 5 to a whole range would touch every leaf, which is O(n). Instead, when a node's slice lies entirely inside the update range, adjust that node's stored value and leave a note — 'everything below me also owes +5' — without descending. Push the note down only when a later query actually needs to look inside. Range update becomes O(log n) because it stops at the same handful of covering nodes a query would.",
      },
      {
        heading: "Push down before you read, and be careful what composes",
        body: "Any traversal entering a node with a pending note must apply it to both children first, or it reads stale values. The subtler issue is whether two pending notes can combine: two range-adds compose into one add, so a single number suffices. Range *assignment* does not compose with add in the same slot, so mixing them needs two lazy fields and a rule for which wins. That is where lazy propagation genuinely gets hard, and it is worth saying so rather than pretending it is uniformly mechanical.",
      },
    ],
    complexityDerivation:
      "A query range has two endpoints, and at each level of the tree at most two nodes straddle a boundary — one containing the left endpoint, one containing the right. Everything between them is covered by whole nodes that are taken and not descended into. The tree has log₂(n) levels, so at most about 4·log(n) nodes are visited: O(log n). Updates walk one root-to-leaf path and recompute merges on the way back up, which is the same bound. Build is O(n), because each node is computed once from its two children. Space is where the honest comparison lives: the standard flat array is sized 4n rather than 2n, and the reason is that a recursive layout leaves gaps when n is not a power of two — 4n is simply the smallest safe over-allocation, not a tight bound. So against a Fenwick tree it is four times the memory, a larger constant per operation, and roughly three times the code, in exchange for handling operations with no inverse and range updates with lazy marks. That is the trade, and it should be made deliberately: reaching for a segment tree when prefix sums would do is one of the most common over-engineering choices in this area.",
    variants: [
      {
        name: "Point update, range query",
        when: "The default. Range min/max/sum over changing data.",
        delta: "No lazy machinery at all. Roughly forty lines and hard to get wrong.",
      },
      {
        name: "Lazy propagation",
        when: "Range updates — 'add 5 to everything from l to r'.",
        delta:
          "A pending-value array plus a push-down step. Range update drops from O(n) to O(log n), and the code roughly doubles.",
      },
      {
        name: "Merge-sort tree",
        when: "'How many elements in this range are greater than x'.",
        delta:
          "Each node stores its slice sorted, so a query binary-searches each covering node. O(log² n) per query and O(n log n) memory — expensive, and sometimes the only thing that works.",
      },
      {
        name: "Iterative bottom-up",
        when: "Point updates and range queries, with no lazy needs.",
        delta:
          "A 2n array with no recursion; walk up from both leaves and merge. Noticeably faster in practice and it cannot express lazy propagation, so it is a specialisation rather than an upgrade.",
      },
    ],
    tradeoffs: [
      {
        vs: "A Fenwick tree",
        pick: "Fenwick whenever the operation has an inverse and prefixes are enough",
        because:
          "A quarter of the memory, a much smaller constant, no recursion, a third of the code. The segment tree earns its cost only when you need something Fenwick structurally cannot express: range minimum or maximum, gcd, range assignment, or any lazy range update. Ask 'does subtraction of two prefixes mean anything here' — if yes, you probably do not need this structure.",
      },
      {
        vs: "A sparse table",
        pick: "Sparse table when the data never changes",
        because:
          "For immutable range min or max, a sparse table gives O(1) queries against the segment tree's O(log n), after an O(n log n) build. That is strictly better on reads and completely useless the moment anything updates, since any change forces a full rebuild. The deciding question is not which is faster but whether there are writes at all.",
      },
      {
        vs: "Recomputing the range directly",
        pick: "The plain loop when ranges are short or queries are rare",
        because:
          "A segment tree over a thousand elements answering a hundred queries is solving a problem you do not have — the direct scan is a few microseconds and needs no code. The structure pays off when queries are frequent relative to the array size, and being able to say roughly where that crossover sits is more useful than knowing the implementation by heart.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — session high and low over arbitrary windows",
      kind: "yours",
      problem:
        "Range high and low over any window of a session, on a bar series that still receives corrections. A prefix-style structure cannot help, because maximum has no inverse, and rescanning the window per query is linear in the window.",
      applied:
        "A segment tree over the bar series with `Math.max` and `Math.min` as merges answers any window in O(log n), and a corrected bar is a single point update walking one root-to-leaf path. This is the case that forces a segment tree over the cheaper Fenwick tree, and the reason is invertibility rather than performance.",
      evidence: "strategy-engine/src/data/historical_data_service.py",
      impact: "O(window) per query and O(n) per correction → O(log n) for both",
    },
    {
      system: "Sweep-line for the area of a union of rectangles",
      kind: "industry",
      problem:
        "Computing how much area a pile of overlapping rectangles covers — the core of layout hit-testing, chip-design rule checks and map tile coverage. Adding up the areas double-counts every overlap.",
      applied:
        "Sweep a vertical line across the plane. Each rectangle adds its y-interval when the line enters it and removes it when the line leaves. A segment tree over y holds 'how much of this range is covered by at least one interval', which is a merge with no inverse and requires range updates — so it needs both the segment tree and its lazy machinery.",
      impact: "Pairwise overlap arithmetic → O(n log n) for the whole union",
    },
    {
      system: "Time-series range aggregates",
      kind: "industry",
      problem:
        "A dashboard asking for the maximum latency between two arbitrary timestamps, over a series with millions of points, while new points keep arriving.",
      applied:
        "Hierarchical range aggregates — the same idea under a different name. Each level stores min, max and sum for a block of time, so a query descends to whole blocks and only splits at the two edges of the requested window. Appending a point updates one path.",
      impact: "Full scans per dashboard refresh → logarithmic reads at any zoom level",
    },
    {
      system: "Line index in a code editor",
      kind: "industry",
      problem:
        "Mapping a character offset to a line and column, and back, in a file being actively edited. Counting newlines from the start of the file is linear on every keystroke.",
      applied:
        "A tree over chunks of text where each node stores the character count and newline count of its slice. Offset-to-line is a descent comparing running totals, and an edit updates one path. It is the same shape as a segment tree with a two-field merge, which is why ropes and segment trees look so similar.",
      impact: "Linear rescans per keystroke → O(log n), which is what keeps large files responsive",
    },
  ],
  lab: {
    prompt:
      "Build a range-minimum structure with point updates. `nums` is the starting array. `ops` is a list of operations: `[0, i, v]` sets index `i` to value `v`; `[1, l, r]` asks for the minimum over the inclusive range `[l, r]`. Return an array holding one answer per query operation, in order. Budget: O(n log n) overall — rescanning the range per query is correct and will fail the gate.",
    fnName: "rangeMin",
    signature: "rangeMin(nums: number[], ops: number[][]): number[]",
    starter: `function rangeMin(nums, ops) {
// Your budget: O((n + q) log n).
// Build a tree where every node holds the minimum of its own slice.
// A query takes whole nodes that lie inside [l, r] and only splits the
// two nodes straddling the ends.
// Note: minimum has no inverse, so prefix subtraction cannot work here.

return [];
}`,
    tests: [
      {
        name: "whole-range query",
        input: [
          [5, 2, 7, 1, 9],
          [[1, 0, 4]],
        ],
        expected: [1],
      },
      {
        // Query, then update index 3 from 1 to 10, then query again.
        name: "an update changes the answer",
        input: [
          [5, 2, 7, 1, 9],
          [
            [1, 1, 3],
            [0, 3, 10],
            [1, 1, 3],
          ],
        ],
        expected: [1, 2],
      },
      {
        name: "single-index range",
        input: [
          [5, 2, 7, 1, 9],
          [[1, 2, 2]],
        ],
        expected: [7],
      },
      {
        // Ranges that do not touch the array ends are where an off-by-one
        // in the straddle handling shows up.
        name: "interior ranges",
        input: [
          [8, 3, 6, 4, 7, 2],
          [
            [1, 1, 2],
            [1, 2, 4],
            [1, 3, 5],
          ],
        ],
        expected: [3, 4, 2],
      },
      {
        name: "update then full query",
        input: [
          [4, 4, 4],
          [
            [0, 1, 1],
            [1, 0, 2],
          ],
        ],
        expected: [1],
      },
      { name: "no operations", input: [[1, 2, 3], []], expected: [], hidden: true },
      {
        name: "single element array",
        input: [[42], [[1, 0, 0], [0, 0, 7], [1, 0, 0]]],
        expected: [42, 7],
        hidden: true,
      },
      {
        // Negative values: an identity of 0 instead of Infinity returns 0
        // here and passes every non-negative test above.
        name: "negatives",
        input: [
          [-1, -5, 3],
          [[1, 0, 2], [1, 2, 2]],
        ],
        expected: [-5, 3],
        hidden: true,
      },
    ],
    hints: [
      "Size a flat array at `4 * n` and build recursively: a node covering [lo, hi] stores `Math.min` of its two children, and a leaf stores its own element. Node `k` has children `2k + 1` and `2k + 2`.",
      "A query on [l, r] at a node covering [lo, hi] has three cases. Completely outside — return Infinity, the identity for minimum. Completely inside — return the stored value without descending. Otherwise recurse into both halves and take the smaller.",
      "Returning 0 for the outside case is the classic bug: 0 is the identity for sum, not for minimum. It looks correct on non-negative data and silently returns 0 the moment a negative value exists, or whenever a query only partly covers a node.",
    ],
    solution: `function rangeMin(nums, ops) {
const n = nums.length;
const out = [];
if (n === 0) return out;

// 4n, not 2n: a recursive layout leaves gaps when n is not a power of
// two, and 4n is the smallest safe over-allocation.
const tree = new Array(4 * n).fill(Infinity);

function build(node, lo, hi) {
  if (lo === hi) { tree[node] = nums[lo]; return; }
  const mid = (lo + hi) >> 1;
  build(2 * node + 1, lo, mid);
  build(2 * node + 2, mid + 1, hi);
  tree[node] = Math.min(tree[2 * node + 1], tree[2 * node + 2]);
}

function update(node, lo, hi, i, v) {
  if (lo === hi) { tree[node] = v; return; }
  const mid = (lo + hi) >> 1;
  if (i <= mid) update(2 * node + 1, lo, mid, i, v);
  else update(2 * node + 2, mid + 1, hi, i, v);
  tree[node] = Math.min(tree[2 * node + 1], tree[2 * node + 2]);
}

function query(node, lo, hi, l, r) {
  // Identity for MINIMUM is Infinity. Returning 0 here is the classic
  // bug — 0 is the identity for sum, and it silently wins any range
  // containing only positive numbers.
  if (r < lo || hi < l) return Infinity;
  if (l <= lo && hi <= r) return tree[node];     // whole node, stop here
  const mid = (lo + hi) >> 1;
  return Math.min(
    query(2 * node + 1, lo, mid, l, r),
    query(2 * node + 2, mid + 1, hi, l, r),
  );
}

build(0, 0, n - 1);

for (const op of ops) {
  if (op[0] === 0) update(0, 0, n - 1, op[1], op[2]);
  else out.push(query(0, 0, n - 1, op[1], op[2]));
}

return out;
}`,
    complexityGate: {
      target: "O(n log n)",
      // n values and n operations, so both the build and the query load
      // scale together. Ranges are wide and their widths vary, which is
      // what makes a per-query rescan measurably quadratic — narrow
      // ranges would let the naive scan look linear.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 2654435761) % n), Array.from({ length: n }, (_, i) => (i % 5 === 0 ? [0, i % n, (i * 7) % n] : [1, (i * 3) % (n >> 1), (n >> 1) + (i % (n >> 1))]))]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Any associative operation works",
      d: "Sum, min, max, gcd, matrix product. The tree does not care what the merge is, only that it is associative — commutativity is not required, which is what lets it hold matrix products and order-sensitive merges.",
    },
    {
      t: "Lazy propagation defers range updates",
      d: 'Mark a node "the whole subtree gets +5" and push it down only when someone looks inside. That is what makes range update O(log n) rather than O(n).',
    },
    {
      t: "Roughly 4n nodes, and a real constant factor",
      d: "Heavier than a Fenwick tree in both memory and code — 4n against n+1. Use it when you need what it offers, not by default. The 4n is safe over-allocation for non-power-of-two sizes, not a tight bound.",
    },
    {
      t: "The identity element is where the bugs live",
      d: "Infinity for min, −Infinity for max, 0 for sum, 1 for product. Returning 0 for an out-of-range min looks right on positive data and fails silently the moment a negative appears.",
    },
    {
      t: "The logarithm comes from straddling, not from bits",
      d: "At each level at most two nodes cross a query boundary — one per endpoint. Everything between them is taken whole. That is a different argument from the Fenwick tree's bit walk, and it is why this structure handles arbitrary ranges.",
    },
  ],
  pitfalls: [
    "Using 0 as the identity for a minimum or maximum query. Correct on non-negative data, silently wrong otherwise.",
    "Sizing the array at 2n. Non-power-of-two lengths overflow the layout; 4n is the standard safe size.",
    "Reading a node without pushing down its pending lazy value first, so the query sees a stale child.",
    "Reaching for a segment tree when prefix sums would do. If subtracting two prefixes is meaningful, a Fenwick tree is a quarter of the memory and a third of the code.",
  ],
  quiz: [
    {
      q: "Which does a Fenwick tree NOT support well, pushing you to a segment tree?",
      options: [
        "Prefix sums",
        "Range minimum queries",
        "Point updates",
        "Cumulative frequency counts",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Min is not invertible, so the prefix-difference trick fails. A segment tree stores per-range answers directly and handles it naturally.",
      distractors: [
        "Prefix sums are exactly what a Fenwick tree is built for — it is the reason the structure exists.",
        "",
        "Point updates are O(log n) in a Fenwick tree and are half of what it does.",
        "Cumulative frequencies are prefix sums of counts, which is the classic Fenwick application in arithmetic coding.",
      ],
    },
    {
      q: "Lazy propagation exists to make which operation efficient?",
      options: [
        "Point query",
        "Range update — mark once and push down only when needed",
        "Tree construction",
        "Point update",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Without it, adding a value across a range would touch every leaf. Lazy marks stop at the same covering nodes a query would, turning O(n) into O(log n).",
      distractors: [
        "Point queries are already O(log n) — one root-to-leaf descent, with nothing to defer.",
        "",
        "Construction is O(n) with or without lazy machinery; every node is computed once from its children.",
        "Point updates walk a single path and are already logarithmic. There is no range to mark.",
      ],
    },
    {
      q: "Your range-min query returns 0 for a range of negative numbers. What is wrong?",
      options: [
        "The build is wrong",
        "The out-of-range case returns 0 — the identity for sum — instead of Infinity, the identity for minimum",
        "The tree array is too small",
        "Recursion depth is exceeded",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A node entirely outside the query must contribute nothing, and 'nothing' for a minimum is Infinity. Returning 0 injects a value that wins against every negative number and loses to every positive one, which is exactly why it passes non-negative tests.",
      distractors: [
        "A broken build would give wrong answers on positive data too. The fact that it only fails on negatives points straight at the identity.",
        "",
        "Undersizing the array throws or gives undefined values, not a clean 0.",
        "Depth is log n — about 15 for 32,000 elements. Nowhere near a limit, and an overflow would throw rather than return.",
      ],
    },
    {
      q: "Why is the segment tree array sized 4n rather than 2n?",
      options: [
        "To store lazy values",
        "A recursive layout leaves gaps when n is not a power of two, and 4n is the smallest safe over-allocation",
        "Because every node has four children",
        "For cache alignment",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A perfect binary tree over a power-of-two n needs 2n−1 nodes, but the recursive split of an arbitrary n produces an unbalanced layout whose indices can reach beyond that. 4n is the conventional safe bound rather than a tight one.",
      distractors: [
        "Lazy values live in their own parallel array of the same size. The 4n applies with or without them.",
        "",
        "It is a binary tree — two children per node. Four is the memory factor, not the branching factor, and conflating them is the trap here.",
        "Alignment might justify rounding to a power of two, but not a factor of four, and the standard bound has nothing to do with cache lines.",
      ],
    },
    {
      q: "The merge operation must be associative. Must it also be commutative?",
      options: [
        "Yes, always",
        "No — the tree always combines left child before right, so order-sensitive merges like matrix products work fine",
        "Only with lazy propagation",
        "Only for range queries",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The recursion imposes a consistent left-to-right grouping, so the operation only needs to tolerate regrouping, not reordering. That is what allows matrix products, string concatenation and 'leftmost match' merges.",
      distractors: [
        "Requiring commutativity would rule out matrix products, which are one of the standard reasons to reach for this structure.",
        "",
        "Lazy propagation adds a requirement about whether pending updates COMPOSE, which is a separate question and a genuinely harder one. It does not introduce a commutativity requirement.",
        "Range queries are where the grouping happens, and the grouping is consistently left-to-right there too.",
      ],
    },
    {
      q: "You need range min/max over an array that is loaded once and never modified. What should you use?",
      options: [
        "A segment tree",
        "A sparse table — O(1) queries after an O(n log n) build, since there are no updates to invalidate it",
        "A Fenwick tree",
        "A sorted copy",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Immutability is the precondition a sparse table trades on. It beats the segment tree outright on reads and is useless the moment anything changes — so the deciding question is whether writes exist at all, not which is faster.",
      distractors: [
        "It works and gives O(log n) queries, which is strictly worse than O(1) here. Choosing it means not having asked whether the data changes.",
        "",
        "Minimum has no inverse, so a Fenwick tree cannot express this regardless of mutability.",
        "A sorted copy gives the global minimum and destroys positions, so it cannot answer anything about a specific range.",
      ],
    },
    {
      q: "Mixing 'add v to range' and 'assign v to range' in one lazy segment tree is hard because:",
      options: [
        "Assignment is not associative",
        "Two pending adds compose into one number, but an add and an assignment do not — you need two lazy fields and a rule for which takes precedence",
        "Assignment cannot be lazy",
        "The tree would need 8n nodes",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Lazy propagation relies on pending operations collapsing into a single stored mark. Adds compose; an assignment arriving after an add cancels it, while an add after an assignment must be folded into it. Keeping both fields with an ordering rule is the standard answer, and it is where lazy propagation stops being mechanical.",
      distractors: [
        "Assignment is associative as a merge. The difficulty is about composing pending UPDATES, which is a different question from merging stored values.",
        "",
        "Assignment lazes perfectly well on its own — it is one of the standard lazy operations. Only the combination is awkward.",
        "Node count is unaffected. What grows is the per-node lazy state, by one extra field.",
      ],
    },
    {
      q: "A thousand-element array answering a hundred range-sum queries. What do you build?",
      options: [
        "A segment tree",
        "Nothing — scan the range directly; a hundred scans of a thousand elements is microseconds and needs no code",
        "A Fenwick tree",
        "A sparse table",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A hundred thousand additions is far below the point where any structure pays for itself. Recognising that the crossover has not been reached is worth more here than knowing three implementations, and the code you do not write is the code that cannot be wrong.",
      distractors: [
        "The heaviest option for the smallest problem — 4n memory and forty lines to save microseconds.",
        "",
        "The right answer if this were large or query-heavy, and still more code than the problem justifies at this size.",
        "It would work for immutable sums but costs an O(n log n) build to save a hundred trivial scans — and sums are not idempotent, so it is not even applicable.",
      ],
    },
  ],
};

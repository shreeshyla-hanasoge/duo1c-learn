import type { Topic } from "../types.ts";

export const intervalDp: Topic = {
  id: "interval-dp",
  title: "Interval DP",
  tier: 3,
  week: 16,
  depth: "deep",
  summary: "Matrix chain multiplication, burst balloons.",
  why: "The family where you iterate by interval *length* and split at every interior point — a genuinely different iteration order worth practising.",
  complexity: "O(n³)",
  learn: {
    intuition:
      "Multiplying a chain of matrices costs different amounts depending on where you put the brackets, sometimes wildly different — a chain of four can differ by a factor of five. You are not changing the answer, only the order of work. So the question is where to put the outermost bracket, and here is the useful observation: whichever split you choose, the two sides become completely independent problems. The left side is some chain, the right side is another chain, and neither one's best bracketing depends on what the other did. That independence is what makes the whole thing tractable, and it is also what tells you the shape of the state: a contiguous range, `[i, j]`, because a bracket always encloses consecutive matrices and never a scattered set. The rest follows mechanically. Try every split point, take the best, and be careful about one thing — a range of length five needs answers for ranges of length two, three and four, so you must fill the table in order of increasing length rather than in the usual left-to-right sweep. That single change of iteration order is what makes this family feel different from every DP before it.",
    mechanics: [
      {
        heading: "The state is a contiguous range",
        body: "`dp[i][j]` is the best cost for the sub-problem covering positions `i` through `j`. Ranges, not subsets, because the operation only ever combines things that are already next to each other. If your problem lets you combine non-adjacent items, this is the wrong family and you are probably looking at bitmask DP instead.",
      },
      {
        heading: "Iterate by LENGTH, not by index",
        body: "`dp[i][j]` reads `dp[i][k]` and `dp[k+1][j]`, both strictly shorter. So the outer loop is the length — 2, 3, 4 up to n — and inside it you slide the left endpoint across. A plain `for i / for j` loop reads cells that have not been filled and produces zeros or garbage, and this is the defining bug of interval DP. If you remember one thing from this topic, remember that the outer loop is the length.",
      },
      {
        heading: "The split point is the third loop",
        body: "`dp[i][j] = min over k in [i, j) of dp[i][k] + dp[k+1][j] + combineCost(i, k, j)`. That inner loop over every interior split is where the cubic factor comes from, and it is the honest price of not knowing in advance where the bracket goes.",
      },
      {
        heading: "The combine cost must not depend on how the halves were solved",
        body: "This is the condition that makes the family work, and it is worth checking explicitly on any new problem. For matrix chain, joining the two halves costs `dims[i] * dims[k+1] * dims[j+1]` — it depends only on the *shape* at the boundary, never on which internal bracketing produced it. If the cost of combining depended on the halves' internal structure, then a half's best solution would not necessarily be part of the whole's best solution, and the state would need to carry more.",
      },
      {
        heading: "Some problems need reframing before they fit — think about what happens LAST",
        body: "Burst balloons looks like it violates the rule: burst one balloon and its neighbours become adjacent, so the two sides are not independent. The fix is to ask which balloon in the range is burst *last* rather than first. By then everything else inside the range is gone, so that balloon's neighbours are exactly the untouched ones just outside the range — and the two sides genuinely are independent. Reversing the question to restore independence is the standard move when a problem nearly fits this family but not quite.",
      },
    ],
    complexityDerivation:
      "There are about n²/2 ranges, since a range is a choice of two endpoints with `i <= j`, and each one tries up to n split points doing O(1) work, giving O(n³) time and O(n²) space. Both matter in practice, and the cubic is the one that bites: n = 100 is a million operations and instant, n = 1000 is a billion and is already a second or more, and n = 10,000 is out of reach entirely. So unlike the linear DPs, this family has a real ceiling and you should know roughly where it is before you propose it. Two escapes exist. The first is Knuth's optimisation: when the cost function satisfies the quadrangle inequality — which optimal binary search trees do — the best split point for `[i, j]` is sandwiched between the best split points for `[i, j-1]` and `[i+1, j]`, so the inner loop only scans between those two bounds. Summed across the table those ranges telescope, and the whole thing drops to O(n²). The second is the Hu–Shing algorithm, which solves matrix chain specifically in O(n log n) by exploiting its geometry, and which is almost never worth implementing but is worth knowing exists so you do not claim O(n³) is a lower bound. It is not; it is just what the general table costs.",
    variants: [
      {
        name: "Matrix chain multiplication",
        when: "Choosing where to put brackets in an associative chain.",
        delta:
          "The canonical form. `dp[i][j] = min(dp[i][k] + dp[k+1][j] + dims[i]·dims[k+1]·dims[j+1])`.",
      },
      {
        name: "Burst balloons",
        when: "Removing an element changes what its neighbours are.",
        delta:
          "Reframe to 'which one is removed last'. Then the neighbours are the untouched elements just outside the range, and the halves separate cleanly.",
      },
      {
        name: "Optimal binary search tree",
        when: "Keys have known access frequencies and you want the cheapest expected lookup.",
        delta:
          "The split point is the root. This is the case where Knuth's optimisation applies and drops the cost to O(n²) — the standard example of the quadrangle inequality paying off.",
      },
      {
        name: "Palindrome partitioning",
        when: "Cutting a string into pieces where every piece has a property.",
        delta:
          "Precompute an O(n²) 'is this range a palindrome' table by increasing length, then a 1D DP over cut positions. Two passes, and the interval table feeds the linear one.",
      },
    ],
    tradeoffs: [
      {
        vs: "Greedy — always combine the cheapest adjacent pair first",
        pick: "Interval DP",
        because:
          "Greedy is genuinely optimal for Huffman coding, which looks superficially similar, and that similarity is exactly what makes the mistake attractive. The difference is that Huffman may combine any two nodes, whereas here only adjacent ones may combine, and that constraint destroys the exchange argument greedy relies on. Cheapest-first can commit to a merge that forces two expensive ones afterwards, and no local rule sees it coming.",
      },
      {
        vs: "Knuth's optimisation",
        pick: "Knuth when the quadrangle inequality holds and n is large",
        because:
          "It turns O(n³) into O(n²) for perhaps five extra lines, and for an optimal BST over ten thousand keys that is the difference between a minute and a few milliseconds. The catch is that it is only valid when the cost function actually satisfies the inequality; applying it because it worked last time gives you a fast, plausible, wrong answer. Say which property you are relying on when you propose it.",
      },
      {
        vs: "A heuristic or a solver, once n is in the thousands",
        pick: "The heuristic, and say so explicitly",
        because:
          "A billion operations is where the exact table stops being an engineering answer. Database query planners are the honest precedent: they use this DP for small joins and switch to greedy or randomised search past roughly a dozen tables, because the plan only has to be good, not provably optimal, and the planner's own runtime is part of the query's latency budget.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — segmenting a price series into trends",
      kind: "yours",
      problem:
        "Describing a session as a handful of straight-line moves needs the breakpoints chosen, not guessed. Fixed-width windows cut through the middle of a genuine move, and a fresh fit per candidate breakpoint is exponential in the number of segments.",
      applied:
        "Segmented least squares: precompute the fitting error for every contiguous range, then choose the breakpoints that minimise total error plus a penalty per segment. The range-error table is built by increasing length in exactly the interval-DP shape, and the penalty is what stops the optimum being one segment per bar.",
      evidence: "strategy-engine/_perf/bench_globalband.py",
      impact:
        "Arbitrary fixed windows → breakpoints placed where the series actually turns",
    },
    {
      system: "Database join-order planning",
      kind: "industry",
      problem:
        "Joining five tables can be bracketed in many ways, and the difference between the best and worst order is routinely several orders of magnitude — one order builds a ten-row intermediate result, another builds ten million.",
      applied:
        "For a chain of joins the planner is choosing a parenthesisation, which is matrix chain multiplication with row-count estimates in place of matrix dimensions. IBM's System R established the approach and every mainstream planner still descends from it — including the part where it gives up: past roughly a dozen tables the DP is abandoned for greedy or randomised search.",
      impact:
        "Query plans chosen by estimated cost rather than by the order the tables were written",
    },
    {
      system: "Optimal binary search trees",
      kind: "industry",
      problem:
        "A lookup structure over keys with very uneven access frequencies. A balanced tree gives every key the same depth, which is the wrong answer when one key takes 60% of the traffic and belongs near the root.",
      applied:
        "Choose the root that minimises the expected weighted depth, recursing into the ranges on either side — the split point is the root. This is the textbook home of Knuth's optimisation, which drops the build from O(n³) to O(n²) by bounding where the best root can be.",
      impact: "Uniform depth → expected depth weighted by real access frequency",
    },
    {
      system: "Polygon triangulation in CAD and graphics",
      kind: "industry",
      problem:
        "A polygon has to be cut into triangles before it can be rendered or meshed, and different triangulations differ in total edge length or in how thin the worst triangle is. Thin slivers cause visible artefacts and numerically unstable simulations.",
      applied:
        "For a convex polygon, choosing a triangulation is choosing how to bracket the boundary vertices, which is the same table with edge length as the combine cost. The interval is a contiguous arc of the boundary, and the split point is the third vertex of the triangle containing that arc's chord.",
      impact: "Meshes chosen by a stated quality measure rather than by vertex order",
    },
  ],
  lab: {
    prompt:
      "Matrix chain multiplication. `dims` has length n+1 and describes n matrices, where matrix i has `dims[i]` rows and `dims[i+1]` columns. Multiplying a p×q by a q×r costs p·q·r scalar multiplications. Return the smallest total cost over all bracketings. Return 0 for fewer than two matrices. Budget: O(n³).",
    fnName: "matrixChain",
    signature: "matrixChain(dims: number[]): number",
    starter: `function matrixChain(dims) {
// Your budget: O(n^3) time.
// dp[i][j] = cheapest way to multiply matrices i..j inclusive.
// It reads STRICTLY SHORTER ranges — so the outer loop must be the
// chain length, not the left endpoint.

return 0;
}`,
    tests: [
      {
        // A(10x30) B(30x5) C(5x60).
        // (AB)C = 10*30*5 + 10*5*60 = 4500. A(BC) = 9000 + 18000 = 27000.
        name: "bracketing matters",
        input: [[10, 30, 5, 60]],
        expected: 4500,
      },
      {
        name: "two matrices — only one way",
        input: [[10, 20, 30]],
        expected: 6000,
      },
      {
        // The CLRS example.
        name: "six matrices",
        input: [[30, 35, 15, 5, 10, 20, 25]],
        expected: 15125,
      },
      {
        name: "four matrices",
        input: [[40, 20, 30, 10, 30]],
        expected: 26000,
      },
      {
        // One matrix: nothing to multiply.
        name: "single matrix",
        input: [[10, 20]],
        expected: 0,
      },
      { name: "empty", input: [[]], expected: 0, hidden: true },
      {
        // A(1x2) B(2x3) C(3x4). (AB)C = 6 + 12 = 18. A(BC) = 24 + 8 = 32.
        name: "small chain, left bracketing wins",
        input: [[1, 2, 3, 4]],
        expected: 18,
      },
      {
        // Square matrices: every bracketing costs the same, so a solution
        // that never actually compares split points still passes here —
        // but a solution that iterates in the WRONG ORDER reads unfilled
        // cells and returns something smaller.
        name: "all square — every bracketing is equal",
        input: [[10, 10, 10, 10]],
        expected: 2000,
        hidden: true,
      },
    ],
    hints: [
      "Build a table `dp` where `dp[i][j]` is the cheapest cost for matrices i through j. Every diagonal entry `dp[i][i]` is 0 — a single matrix needs no multiplication.",
      "The outer loop must be the chain LENGTH, from 2 up to n. Inside it, let `i` run over every valid left endpoint and set `j = i + length - 1`. This guarantees the shorter ranges the recurrence reads are already filled.",
      "For each range, try every split `k` from `i` to `j-1`: the cost is `dp[i][k] + dp[k+1][j] + dims[i] * dims[k+1] * dims[j+1]`. That last term is the cost of the final multiply, and it uses only the boundary shapes.",
    ],
    solution: `function matrixChain(dims) {
// dims has n + 1 entries for n matrices.
const n = dims.length - 1;
if (n < 2) return 0;

// dp[i][j] = cheapest cost for matrices i..j inclusive.
const dp = Array.from({ length: n }, () => new Array(n).fill(0));

// LENGTH first. dp[i][j] reads strictly shorter ranges, so every one
// of them has to be finished before this range is touched. A plain
// for-i / for-j sweep reads cells that are still zero.
for (let len = 2; len <= n; len++) {
  for (let i = 0; i + len - 1 < n; i++) {
    const j = i + len - 1;
    let best = Infinity;
    for (let k = i; k < j; k++) {
      // Cost of the two halves, plus the one multiply that joins them.
      // The join cost depends only on the boundary dimensions, never
      // on how either half was bracketed internally.
      const cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
      if (cost < best) best = cost;
    }
    dp[i][j] = best;
  }
}

return dp[0][n - 1];
}`,
    complexityGate: {
      target: "O(n^3)",
      // Dimensions cycle in 1..50 rather than climbing, so the best split
      // genuinely moves around the chain. With monotone dimensions the
      // optimum sits at one end and a solution that only tried a couple
      // of split points would measure far better than it deserves.
      gen: "(n) => [Array.from({ length: n + 1 }, (_, i) => ((i * 13) % 50) + 1)]",
      sizes: [40, 80, 160, 320],
    },
  },
  insights: [
    {
      t: "Iterate by length, not by index",
      d: "`dp[i][j]` depends on strictly shorter intervals, so the outer loop must be the length. Getting this order wrong is the defining bug of interval DP, and it fails quietly — the table fills with zeros rather than crashing.",
    },
    {
      t: "The split point is the third loop",
      d: "`dp[i][j] = best over k in (i, j) of dp[i][k] + dp[k][j] + cost`. That inner loop is where the O(n³) comes from, and it is the price of not knowing where the bracket goes.",
    },
    {
      t: "Burst balloons inverts the intuition",
      d: "Think about which balloon is burst LAST in an interval, not first. That reframing is what makes the two sides independent, because everything else inside the range is already gone.",
    },
    {
      t: "The combine cost must depend only on the boundary",
      d: "If joining two halves costs something that depends on how they were solved internally, a half's best answer is not necessarily part of the whole's best answer, and the state needs more in it. Check this before assuming the family applies.",
    },
    {
      t: "The cubic has a real ceiling — know where it is",
      d: "n = 100 is instant, n = 1000 is around a billion operations, n = 10,000 is out of reach. Unlike the linear DPs, you have to size this one before proposing it.",
    },
  ],
  pitfalls: [
    "Looping over `i` and `j` directly instead of over length. Shorter ranges have not been computed yet, so the table reads zeros and the answer comes out too small.",
    "Getting the dimension indices wrong in the combine cost. `dims[i] * dims[k+1] * dims[j+1]` is easy to write off by one, and the result is a plausible number rather than a crash.",
    "Applying Knuth's optimisation without checking the quadrangle inequality holds. It produces a fast, confident, wrong answer.",
    "Reaching for interval DP when the operation can combine non-adjacent items. A range cannot express that state, and the answer will silently be the best *contiguous* arrangement.",
  ],
  quiz: [
    {
      q: "In interval DP, the outermost loop should iterate over:",
      options: [
        "The left endpoint i",
        "The interval length",
        "The split point k",
        "The right endpoint j",
      ],
      answer: 1,
      difficulty: "recall",
      why: "dp[i][j] reads strictly shorter intervals, so all of those must be finished first. Length-first ordering guarantees it.",
      distractors: [
        "Sweeping by left endpoint reaches a long range before the shorter ranges inside it exist. The cells read are still at their initial value, so the answer comes out too small with no error raised.",
        "",
        "The split point must be the innermost loop — it is the choice being made, and it needs both halves already solved before it can be evaluated.",
        "Same failure as sweeping by left endpoint. What matters is that shorter comes before longer, and neither endpoint alone encodes that.",
      ],
    },
    {
      q: "Matrix chain multiplication with n matrices runs in:",
      options: ["O(n)", "O(n²)", "O(n³)", "O(2ⁿ)"],
      answer: 2,
      difficulty: "recall",
      why: "About n²/2 ranges, each trying up to n split points at O(1) work each.",
      distractors: [
        "Linear time would not allow even filling the table, which has a quadratic number of cells.",
        "O(n²) is the number of states. Multiplying by the O(n) split points is the step that gets missed.",
        "",
        "Exponential is the cost of enumerating every bracketing explicitly — the Catalan numbers. Avoiding that is the entire point of the table.",
      ],
    },
    {
      q: "Burst balloons: bursting a balloon makes its neighbours adjacent, so the two sides are NOT independent. What restores the family?",
      options: [
        "Sort the balloons first",
        "Ask which balloon in the range is burst LAST — by then the range's interior is gone, so its neighbours are the untouched elements just outside",
        "Use a bitmask over which balloons remain",
        "Process the balloons left to right",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Choosing the first burst leaves the two halves interacting through the gap. Choosing the last one fixes both of its neighbours to elements outside the range, which no interior decision can change — so the halves separate.",
      distractors: [
        "Sorting destroys adjacency, and adjacency is the entire structure of the problem. After sorting, 'neighbour' refers to nothing real.",
        "",
        "A bitmask would work and is fully general, but it is 2^n states where n² would do. Reaching for it here is a real failure of analysis, not just an inefficiency.",
        "Left to right is an ordering, not a reframing. The dependence between the halves is still there whichever direction you sweep.",
      ],
    },
    {
      q: "You are told to use greedy — repeatedly combine the cheapest adjacent pair. Why is that unsafe here, when it is optimal for Huffman coding?",
      options: [
        "Greedy is never optimal",
        "Huffman may combine any two nodes; here only adjacent items may combine, and that constraint breaks the exchange argument",
        "Huffman uses a heap",
        "Greedy is optimal here too",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Huffman's proof relies on being free to pick the two smallest nodes wherever they are. Adjacency-only combining means the cheapest pair right now can force two expensive merges afterwards, and no local rule sees that.",
      distractors: [
        "Greedy is optimal for plenty of problems, Huffman among them. An argument that proves too much convinces nobody.",
        "",
        "The heap is an implementation detail of finding the two smallest. What matters is that Huffman is *allowed* to reach for any two nodes.",
        "It is not, and the failure is easy to construct: a cheap adjacent merge can strand two large dimensions next to each other.",
      ],
    },
    {
      q: "`dp[i][j]` for a 5-element range comes out as 0 on a chain that clearly costs something. Most likely cause?",
      options: [
        "Integer overflow",
        "The loops iterate over i and j directly, so the shorter ranges the recurrence reads are still at their initial value of 0",
        "The base case is wrong",
        "The split loop is off by one",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Filling in the wrong order means dp[i][k] and dp[k+1][j] are read before they are written. They are still 0, so every split looks free and the minimum is a sum of zeros plus one join.",
      distractors: [
        "Overflow produces a huge or negative number, not zero. A zero where a positive cost belongs points at unwritten cells.",
        "",
        "The base case genuinely is zero — a single matrix needs no multiplication — so it is the one part that is right. The bug is that ranges longer than one are also reading zeros.",
        "An off-by-one in the split loop skips a candidate and gives a slightly-too-large answer, or reads out of bounds. It does not produce a clean zero.",
      ],
    },
    {
      q: "Knuth's optimisation drops optimal-BST construction from O(n³) to O(n²). What must you check before using it?",
      options: [
        "That the keys are sorted",
        "That the cost function satisfies the quadrangle inequality, which is what bounds the best split of [i, j] between the best splits of [i, j−1] and [i+1, j]",
        "That n is large enough to matter",
        "That the tree is balanced",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The optimisation narrows the split search using a monotonicity property of the optimal split point, and that property follows from the quadrangle inequality. Without it the bounds are not valid and the pruned search can miss the true optimum.",
      distractors: [
        "Sorted keys are a precondition of building any BST over them, and are needed with or without the optimisation. It is necessary, but it is not what makes the pruning sound.",
        "",
        "Worth considering for whether the effort pays, but it is a question about value, not correctness. Applying it when the inequality fails is wrong at any n.",
        "The whole point of an optimal BST is that it is deliberately unbalanced towards frequently accessed keys. Balance is what you are giving up.",
      ],
    },
    {
      q: "A query planner must order a join over 25 tables. What does it actually do?",
      options: [
        "Run the O(n³) interval DP — 25 is small",
        "Abandon the exact search past roughly a dozen tables and switch to greedy or randomised plan selection",
        "Enumerate all orderings",
        "Join in the order written in the query",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The planner's own runtime is part of the query's latency, so an optimal plan found too slowly is a worse outcome than a good plan found fast. Every mainstream planner has a cutoff for exactly this reason.",
      distractors: [
        "For a general join graph the search is over subsets rather than ranges, so it is 2^n rather than n³ — and even the chain case competes against the planning-time budget.",
        "",
        "The number of bracketings is a Catalan number, which for 25 is well past 10^12. This is what the DP exists to avoid.",
        "That is what happens when planning is skipped altogether, and it is precisely the several-orders-of-magnitude failure the planner exists to prevent.",
      ],
    },
    {
      q: "Somebody proposes interval DP for a problem where any two items may be merged, not just adjacent ones. Your response?",
      options: [
        "It will work, just more slowly",
        "A range cannot represent 'which items remain' when they need not be contiguous — this is subset DP, so bitmask if n is small, otherwise a heuristic",
        "Sort the items so the mergeable ones become adjacent",
        "Add a third index to the state",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The state has to describe the set of remaining items. When merges are unrestricted that set is an arbitrary subset, which two endpoints cannot encode. The honest answer names the right family and its cost, rather than trying to force the wrong one.",
      distractors: [
        "It will run and return a number — the best answer among *contiguous* merges — which is worse than failing, because nothing indicates it answered a different question.",
        "",
        "No sort makes an arbitrary subset contiguous; the set that remains changes after every merge. This works only in the special case where mergeability follows the order, which is where interval DP already applied.",
        "A third index still describes a range with a marker, not an arbitrary subset. You would need a full membership bitmask, which is the answer the correct option names.",
      ],
    },
  ],
};

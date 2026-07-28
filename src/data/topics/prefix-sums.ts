import type { Topic } from "../types.ts";

export const prefixSums: Topic = {
  id: "prefix-sums",
  title: "Prefix sums & difference arrays",
  tier: 0,
  week: 1,
  depth: "core",
  summary: "Pay O(n) once; answer every range query in O(1).",
  why: "Range aggregates show up everywhere — streaks, cumulative profit and loss, per-day totals, 'how many events between these two timestamps'. Precomputing once converts a per-query scan into a single subtraction, which is the difference between a dashboard that loads and one that times out.",
  complexity: "O(n) build · O(1) query",
  viz: ["prefix-sums"],
  learn: {
    intuition:
      "If you know the running total at every position, you can get the sum of any stretch by one subtraction. Think of a bank statement with a balance column: to know how much you spent between the 5th and the 20th, you do not add up every transaction — you subtract the balance on the 5th from the balance on the 20th. A prefix sum array is exactly that balance column, computed once in a single pass. After that, every 'sum from here to there' question costs one subtraction instead of a scan. The difference array is the same idea running backwards: instead of recording totals so you can read ranges quickly, you record changes so you can write ranges quickly.",
    mechanics: [
      {
        heading: "Build the running total with one extra slot at the front",
        body: "Define `p[0] = 0` and `p[i+1] = p[i] + a[i]`, so `p` has n+1 entries. That leading zero is not decoration — it is what makes the query formula work at the left edge without a special case.",
      },
      {
        heading: "Answer any inclusive range with one subtraction",
        body: "`sum(l..r) = p[r+1] - p[l]`. Read it as 'everything up to and including r, minus everything before l'. With `p[0] = 0` defined, `l = 0` needs no special handling.",
      },
      {
        heading: "For range updates, invert the idea",
        body: "To add v to every element from l to r, do not touch r-l+1 elements. Record `d[l] += v` and `d[r+1] -= v` in a difference array. The `+v` switches on at l and switches off just after r.",
      },
      {
        heading: "Materialise the difference array with one prefix pass",
        body: "After all updates, take the prefix sum of `d` and you have the total added at each position. Every range update cost O(1), and one O(n) pass at the end produces the final array.",
      },
      {
        heading: "Know when it stops working",
        body: "Prefix sums are static. Changing one element of `a` invalidates every prefix after it, so a single update costs O(n) to repair. If reads and writes are interleaved, you need a Fenwick tree or a segment tree instead. Recognising which of the three situations you are in is the actual skill.",
      },
    ],
    complexityDerivation:
      "Building is one pass: n additions, so O(n) time and O(n) extra space. Each query is one array read, one array read and one subtraction — three constant-time operations, so O(1) regardless of how wide the range is. That is the entire trade: you pay O(n) once so that q queries cost O(q) instead of O(q·n). It is worth it as soon as q is more than a constant. For the difference array, each update is two array writes — O(1) — and the final materialisation is one prefix pass, O(n). So u updates followed by a read cost O(u + n) instead of O(u·n) for applying each range directly. The reason both work is that addition is associative and has an inverse. The moment your aggregate lacks an inverse — maximum, for instance — subtraction cannot recover the range and you need a sparse table or a segment tree instead.",
    variants: [
      {
        name: "1-D prefix sum",
        when: "Sum over a contiguous range of an array.",
        delta: "The base case. One pass to build, one subtraction to query.",
      },
      {
        name: "2-D prefix sum (summed-area table)",
        when: "Sum over a rectangle in a grid.",
        delta:
          "Query is four lookups combined by inclusion-exclusion: bottom-right minus the two overlapping edges plus the corner added back. Used in image processing since the 1980s under the name integral image.",
      },
      {
        name: "Difference array",
        when: "Many range updates, then one read of everything.",
        delta:
          "The dual. O(1) per update, one O(n) pass at the end. If reads are interleaved with writes, this does not apply.",
      },
      {
        name: "Prefix sum plus a hash map",
        when: "Counting subarrays with a given sum, including negative values.",
        delta:
          "Store how many times each running total has been seen. If the current total minus k has been seen c times, there are c subarrays ending here with sum k. This is the technique the lab below asks for.",
      },
    ],
    tradeoffs: [
      {
        vs: "Fenwick tree (Binary Indexed Tree)",
        pick: "Prefix sums when the data never changes",
        because:
          "A Fenwick tree gives O(log n) for both update and query, which is strictly more capable. A prefix sum gives O(1) queries and no update capability at all. If the array is static, take the O(1) and the much simpler code.",
      },
      {
        vs: "Sliding window",
        pick: "Sliding window when the range only moves forward",
        because:
          "A window uses O(1) memory and works on a stream. Prefix sums need the whole array up front and O(n) memory, but can then answer arbitrary ranges in any order — which a window cannot do at all.",
      },
      {
        vs: "Recomputing the range each time",
        pick: "Prefix sums as soon as there is more than one query",
        because:
          "Recomputation is O(range) per query. The build cost is paid back on the second query in most realistic ranges, and the code is not longer. The only reason to skip it is if you truly query once.",
      },
    ],
  },
  realWorld: [
    {
      system: "Integral images in computer vision",
      kind: "industry",
      problem:
        "Face detection evaluates thousands of rectangular features per image window. Summing pixels inside each rectangle directly is proportional to its area, and there are millions of rectangles.",
      applied:
        "A 2-D prefix sum over the image lets any rectangle's total be computed with four lookups, whatever its size. This is what made the Viola-Jones detector fast enough to run on a camera in 2001.",
      evidence: "Viola & Jones, 'Rapid Object Detection', CVPR 2001",
      impact: "O(area) per rectangle → O(1)",
    },
    {
      system: "Analytics dashboards and cumulative metrics",
      kind: "industry",
      problem:
        "'Revenue between two dates', asked repeatedly with different ranges over the same historical data, becomes a table scan per query.",
      applied:
        "Materialise a running cumulative total per day. Any date range is then one subtraction. This is what a cumulative-sum window function or a rollup table gives you, and why analytics warehouses precompute them.",
      impact: "O(days in range) per query → O(1)",
    },
    {
      system: "Seat and inventory allocation over ranges",
      kind: "industry",
      problem:
        "Applying thousands of 'block seats 40 through 90 on this train' updates one seat at a time is proportional to the total range length, and most of that work is overwritten before anyone reads it.",
      applied:
        "Record `+1` at the start and `-1` just past the end in a difference array, then prefix-sum once when the final occupancy is actually needed. This is the standard shape for booking and scheduling overlap problems.",
      impact: "O(updates × range) → O(updates + n)",
    },
    {
      system: "traed — cumulative profit and loss and drawdown",
      kind: "yours",
      problem:
        "Equity curve, cumulative returns, and maximum drawdown over arbitrary date windows are all range aggregates over the same trade history, recomputed per query.",
      applied:
        "Build the cumulative series once. Any window's profit is one subtraction, and maximum drawdown becomes a single pass tracking the running maximum of the cumulative series minus the current value.",
      impact: "O(n) per window query → O(1) after one O(n) build",
    },
  ],
  lab: {
    prompt:
      "Count how many contiguous subarrays sum to exactly `k`. Values may be negative, so a sliding window will not work — the sum does not move in one direction as the window grows. The nested-loop version is correct and quadratic. Budget: O(n).",
    fnName: "countSubarraysWithSum",
    signature: "countSubarraysWithSum(nums: number[], k: number): number",
    starter: `function countSubarraysWithSum(nums, k) {
  // Budget: O(n) time.
  // Hint at the shape: if you know the running total at every position,
  // a subarray summing to k is a PAIR of running totals differing by k.

  return 0;
}`,
    tests: [
      { name: "three ones, target 2", input: [[1, 1, 1], 2], expected: 2 },
      { name: "target matches a single element too", input: [[1, 2, 3], 3], expected: 2 },
      {
        name: "negatives and a zero",
        input: [[1, -1, 0], 0],
        expected: 3,
      },
      { name: "empty array", input: [[], 0], expected: 0 },
      { name: "single element hit", input: [[3], 3], expected: 1 },
      {
        // Every one of the 6 subarrays of [0,0,0] sums to 0. A solution that
        // stops at the first match, or that forgets the empty prefix, misses
        // most of them.
        name: "all zeros, target zero",
        input: [[0, 0, 0], 0],
        expected: 6,
        hidden: true,
      },
      {
        name: "no subarray matches",
        input: [[1, 2, 3], 100],
        expected: 0,
        hidden: true,
      },
      {
        name: "overlapping matches",
        input: [[1, 2, 1, 2, 1], 3],
        expected: 4,
        hidden: true,
      },
    ],
    hints: [
      "If `running[j]` is the total of everything up to j, then the subarray from i+1 to j sums to `running[j] - running[i]`. You want that to equal k.",
      "Rearranged: `running[i] = running[j] - k`. So as you walk forward, ask how many earlier running totals equalled `running - k`, and add that count.",
      "Seed the map with `{0: 1}` before the loop. That single entry represents the empty prefix, and it is what lets a subarray starting at index 0 be counted.",
    ],
    solution: `function countSubarraysWithSum(nums, k) {
  // How many times each running total has been seen so far.
  // The seed {0: 1} stands for the empty prefix — without it,
  // subarrays that start at index 0 are never counted.
  const seen = new Map([[0, 1]]);

  let running = 0;
  let count = 0;

  for (const x of nums) {
    running += x;
    count += seen.get(running - k) ?? 0;
    seen.set(running, (seen.get(running) ?? 0) + 1);
  }

  return count;
}`,
    complexityGate: {
      target: "O(n)",
      // Alternating +1/-1 keeps every running total in {0, 1}, so the map
      // holds two keys instead of n. That matters: a map with n distinct
      // keys pays for rehashing and cache misses as it grows, which pushes
      // a genuinely linear solution up towards the rejection threshold. The
      // target is unreachable, so nothing exits early either way and a
      // quadratic solution still does its full n^2/2 work.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1)), n + 1]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "sum(l..r) = p[r+1] − p[l]",
      d: "The off-by-one disappears if you define `p[0] = 0` and let `p` have n+1 entries. Do it that way every time and the boundary bugs stop happening.",
    },
    {
      t: "Difference arrays are the mirror image",
      d: 'To apply "+v over range [l, r]" many times, record `d[l] += v` and `d[r+1] -= v`, then prefix-sum once at the end. A range update becomes O(1) instead of O(r−l).',
    },
    {
      t: "Static only — if the data changes, you need a Fenwick tree",
      d: "One update invalidates every prefix after it, costing O(n) to repair. That is precisely the gap a Fenwick tree fills, at O(log n) for both operations.",
    },
    {
      t: "Prefix sums plus a hash map count subarrays",
      d: "Two running totals differing by k identify a subarray summing to k. Counting how often each total has occurred turns an O(n^2) pair search into one pass — and unlike a sliding window, it works with negative values.",
    },
  ],
  pitfalls: [
    "Forgetting the leading zero. Without `p[0] = 0`, the range starting at index 0 needs a special case, and that special case is where the bug lives.",
    "Using a difference array when reads happen between writes. It only works if every update lands before the single materialising pass.",
    "Reaching for a sliding window on data with negative values. Growing the window no longer moves the sum in one direction, so the shrink logic has nothing to stand on.",
    "Forgetting to seed the count map with `{0: 1}`. Every subarray that starts at index 0 is then silently missed.",
  ],
  quiz: [
    {
      q: "With `p[0] = 0` and `p[i+1] = p[i] + a[i]`, the sum of `a[2..5]` inclusive is:",
      options: ["p[5] − p[2]", "p[6] − p[2]", "p[5] − p[1]", "p[6] − p[3]"],
      answer: 1,
      difficulty: "recall",
      why: "`p[i]` is the sum of the first i elements, so the inclusive range [l, r] is `p[r+1] − p[l]` = `p[6] − p[2]`.",
      distractors: [
        "This drops `a[5]`. `p[5]` covers indices 0 through 4 only.",
        "",
        "This drops `a[5]` and wrongly includes `a[1]`. Two errors in one.",
        "This wrongly excludes `a[2]`, which the inclusive range is supposed to contain.",
      ],
    },
    {
      q: "You must apply 10,000 range-increment updates, then read the array once. The best approach is:",
      options: [
        "Apply each update directly — O(total range length)",
        "A difference array: O(1) per update, one O(n) prefix pass at the end",
        "A segment tree with lazy propagation",
        "A Fenwick tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Because every read happens after every write, no dynamic structure is needed. A difference array is O(1) per update and a single linear pass to produce the result.",
      distractors: [
        "Correct but slow, and most of the work is overwritten before anyone reads it.",
        "",
        "Powerful and correct, and considerably more code than the problem needs. Lazy propagation exists for interleaved reads and writes, which is not this.",
        "Also correct and also more than is needed. A Fenwick tree buys you interleaving, which you are not using.",
      ],
    },
    {
      q: "After building a prefix sum array, you change `a[3]`. What is the cost of keeping queries correct?",
      options: [
        "O(1) — update p[3]",
        "O(log n)",
        "O(n) — every prefix from index 4 onward shifts",
        "No cost; prefix sums update themselves",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Every prefix that includes position 3 — that is, all of them from index 4 to the end — changes by the same delta. Repairing them is a linear pass, which is exactly why a Fenwick tree exists.",
      distractors: [
        "`p[3]` is the sum of everything BEFORE index 3, so it is the one entry that does not change.",
        "That is the Fenwick tree's cost. A plain prefix array has no structure to exploit.",
        "",
        "It is a plain array of numbers with no link back to the source data.",
      ],
    },
    {
      q: "Why does prefix-sum range querying work for sums but not for maximums?",
      options: [
        "Maximums are more expensive to compute",
        "Subtraction undoes addition, but there is no operation that removes an element's contribution to a maximum",
        "Maximums are not associative",
        "It does work for maximums",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The technique needs an inverse. Knowing the maximum of the first 10 and the maximum of the first 3 tells you nothing about the maximum of positions 4 to 10. Range maximum needs a sparse table or a segment tree instead.",
      distractors: [
        "A maximum is a single comparison, cheaper than an addition on most hardware. Cost is not the issue.",
        "",
        "Maximum is perfectly associative — max(max(a,b),c) equals max(a,max(b,c)). What it lacks is an inverse.",
        "It does not. Trying it produces plausible wrong answers, which is the dangerous kind.",
      ],
    },
    {
      q: "For counting subarrays with sum k, why must the map be seeded with `{0: 1}` before the loop?",
      options: [
        "To avoid a null reference",
        "It represents the empty prefix, which is what makes a subarray starting at index 0 countable",
        "To make the first iteration faster",
        "It is not necessary",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A subarray from index 0 to j has sum `running[j] - 0`. Without an entry for a running total of 0, that lookup finds nothing and every such subarray is missed. On `[3]` with k = 3 the answer would come out 0 instead of 1.",
      distractors: [
        "A missing key is handled by the `?? 0` default. The problem is a wrong count, not a crash.",
        "",
        "It has no effect on speed. It changes the answer.",
        "It is essential. This is the single most common bug in this algorithm.",
      ],
    },
    {
      q: "A 2-D prefix sum answers 'sum of this rectangle' in how many lookups?",
      options: ["1", "2", "4", "Proportional to the rectangle's area"],
      answer: 2,
      difficulty: "recall",
      why: "Take the total up to the bottom-right corner, subtract the two rectangles above and to the left, then add back the top-left corner, which was subtracted twice. Four lookups, whatever the rectangle's size.",
      distractors: [
        "One lookup gives the total from the origin, which is a rectangle anchored at the corner, not an arbitrary one.",
        "Two would let you subtract one strip, which is the 1-D case. In two dimensions you have overlap to correct for.",
        "",
        "That is the cost this structure exists to avoid, and it is what makes integral images useful in image processing.",
      ],
    },
    {
      q: "Your data has negatives and you need the longest subarray summing to exactly k. Sliding window or prefix sums?",
      options: [
        "Sliding window — it is O(1) space",
        "Prefix sums with a map of the FIRST index at which each running total appeared",
        "Sort the array first, then use two pointers",
        "Either works",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A sliding window needs the sum to move in one direction as the window grows, which negatives break. Prefix sums do not care about sign. Storing the first index each total was seen at maximises the length when the same total recurs.",
      distractors: [
        "The space advantage is real and irrelevant, because the approach gives wrong answers on this input.",
        "",
        "Sorting destroys contiguity, and 'subarray' means contiguous. This changes the problem into a different one.",
        "They give different answers here, and only one of them is right.",
      ],
    },
    {
      q: "Ten thousand queries against a static one-million-element array. Prefix sums cost O(n) to build. Worth it?",
      options: [
        "No — the build is the same cost as a single query",
        "Yes — 10,000 × O(1) plus one O(n) build, versus 10,000 × O(range)",
        "Only if the ranges are large",
        "Only if the array fits in cache",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The build is paid once. Ten thousand scans over ranges averaging even a thousand elements is ten million operations; the prefix version is one million to build plus ten thousand subtractions. The trade pays off from about the second query onward.",
      distractors: [
        "A single query is O(range), which is at most n — so the build costs about as much as one worst-case query, and then every subsequent query is free.",
        "",
        "Large ranges make it more dramatic, but even short ranges win once the query count is in the thousands.",
        "Cache affects the constant factor for both approaches equally. It does not change which one is asymptotically better.",
      ],
    },
  ],
};

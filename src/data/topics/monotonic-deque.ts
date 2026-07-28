import type { Topic } from "../types.ts";

export const monotonicDeque: Topic = {
  id: "monotonic-deque",
  title: "Monotonic deque",
  tier: 1,
  week: 6,
  depth: "core",
  summary: "Sliding-window maximum and minimum in O(n).",
  why: "This is the direct fix for repeated-scan indicator logic: swing highs, rolling extremes, window maxima. Maximum is the aggregate a sliding window cannot maintain with a single running value, and this is the structure that fills that gap.",
  complexity: "O(n)",
  viz: ["monotonic-deque"],
  learn: {
    intuition:
      "A sliding window can keep a running sum because subtraction undoes addition — when a value leaves, you take it away. Maximum has no such undo. If the departing value happened to BE the maximum, you have no idea what the new one is, and you are back to scanning the window. The monotonic deque solves this by keeping a shortlist of candidates instead of a single number. The key observation is that some elements can be thrown away permanently: if a value is both smaller than a later value AND older than it, it can never be the maximum of any window that contains the later one — the later one is bigger and will outlive it. So it is not just currently irrelevant, it is irrelevant forever. Discarding those leaves a list that is automatically in decreasing order, and its front is the answer.",
    mechanics: [
      {
        heading: "Store indices, never values",
        body: "You need to know when a candidate has fallen out of the window, and that test is about position: `front <= i - k`. With only values you cannot tell what has expired, and you would need a second structure to track it.",
      },
      {
        heading: "Before adding, remove from the BACK everything the newcomer dominates",
        body: "While the value at the back is less than or equal to the incoming value, pop it. Those elements are smaller and older, so they are permanently useless. This is what keeps the deque decreasing.",
      },
      {
        heading: "Then push the new index at the back",
        body: "It is now the smallest and newest candidate. It may become the maximum later, once everything ahead of it expires.",
      },
      {
        heading: "Remove from the FRONT anything that has left the window",
        body: "If `front <= i - k`, that index is outside the current window, so drop it. This is a completely different condition from the back-pop, and conflating the two is the usual bug.",
      },
      {
        heading: "The front is the answer, with no search",
        body: "Because the deque is decreasing and contains only in-window candidates, the value at the front index is the window maximum. Reading it is O(1). Flip the comparison to `>=` and you get the window minimum instead.",
      },
    ],
    complexityDerivation:
      "Both loops here are `while` loops inside a `for`, so the same amortised argument applies as with the monotonic stack — but it is worth stating precisely because there are two of them. Every index is pushed to the back exactly once, over the entire run. An index can be removed either from the back (dominated) or from the front (expired), and either way it is removed at most once, because once removed it never returns. So the total number of removals across the whole scan is at most n. The outer loop contributes n iterations, and the two inner loops contribute at most n executions between them in total, not per iteration. The scan is therefore O(n). Space is O(k) — the deque never holds more indices than the window can contain. Compare this to the direct approach: n windows times k elements scanned per window is O(n·k), so with n = 100,000 and k = 200 the difference is 20 million operations against 100,000.",
    variants: [
      {
        name: "Window maximum",
        when: "Rolling high, resistance level, peak load in the last k samples.",
        delta:
          "Decreasing deque: pop from the back while the back is less than or equal to the newcomer.",
      },
      {
        name: "Window minimum",
        when: "Rolling low, floor price, minimum latency in a window.",
        delta:
          "Increasing deque: pop from the back while the back is greater than or equal to the newcomer. Same code, one comparison flipped.",
      },
      {
        name: "Window over time rather than count",
        when: "'Maximum in the last 60 seconds' on an irregular stream.",
        delta:
          "The front-expiry test becomes a timestamp comparison instead of an index one. The domination logic is unchanged.",
      },
      {
        name: "Both extremes at once",
        when: "Constraint problems such as 'longest window where max − min ≤ limit'.",
        delta:
          "Two deques maintained side by side, one decreasing and one increasing. The window shrink condition reads both fronts.",
      },
    ],
    tradeoffs: [
      {
        vs: "A heap keyed by value",
        pick: "Deque — the heap cannot expire elements cheaply",
        because:
          "A heap gives you the maximum in O(1) too, but when an element leaves the window there is no way to remove it from the middle of a heap without a position map. The usual workaround is to leave stale entries and discard them when they surface, giving O(n log n) and a heap that can grow well beyond k. The deque is O(n) and never holds more than k.",
      },
      {
        vs: "Re-scanning the window each step",
        pick: "Deque as soon as k is more than a handful",
        because:
          "Re-scanning is O(n·k) and is about four lines shorter. At k = 5 the simpler code is defensible; at k = 200 it is a 200x cost multiplier on a hot path.",
      },
      {
        vs: "A sparse table or segment tree",
        pick: "Deque when the window slides forward",
        because:
          "Those structures answer arbitrary range maximum queries, which is strictly more general and costs O(n log n) to build. If the ranges only ever move forward one step at a time, the deque gives the same answers in O(n) total with much less code.",
      },
    ],
  },
  realWorld: [
    {
      system: "Monitoring and autoscaling on peak load",
      kind: "industry",
      problem:
        "'Scale up if the maximum CPU in the last 5 minutes exceeds 80%' must be evaluated continuously across thousands of series, and re-aggregating the window each tick is prohibitive.",
      applied:
        "A monotonic deque per series maintains the running maximum in O(1) amortised per sample, with memory bounded by the window length rather than the retention period.",
      impact: "O(window) per evaluation → O(1) amortised",
    },
    {
      system: "Network jitter and latency SLOs",
      kind: "industry",
      problem:
        "Tracking the worst latency observed in a rolling interval, on a high-rate packet stream where storing every sample is not an option.",
      applied:
        "The deque holds only candidates that could still become the maximum — usually a small fraction of the window — and expires by timestamp as the interval advances.",
    },
    {
      system: "Audio and signal processing (running max filters)",
      kind: "industry",
      problem:
        "Envelope followers and dynamic range compressors need the peak amplitude over a rolling window, per sample, in real time.",
      applied:
        "The van Herk / Gil-Werman running maximum, of which the monotonic deque is the streaming form, gives amortised constant work per sample so the filter cost does not grow with the window length.",
      impact: "Filter cost becomes independent of window size",
    },
    {
      system: "traed — swing highs, rolling extremes, ATR-style bands",
      kind: "yours",
      problem:
        'The "loop over candles, then loop over the surrounding window" shape in indicator code is O(n·w), and it is the single most common performance pattern in strategy engines.',
      applied:
        "A monotonic deque produces the rolling high and low in one pass. With a 200-period lookback over years of candles, this is the difference between a backtest that finishes and one that gets abandoned.",
      impact: "O(n·w) → O(n)",
    },
  ],
  lab: {
    prompt:
      "Return the maximum of every window of size `k` as the window slides from left to right. For `[1,3,-1,-3,5,3,6,7]` with k = 3 the answer is `[3,3,5,5,6,7]`. Re-scanning each window is correct and O(n·k); the gate uses a large window, so that approach is rejected. Budget: O(n).",
    fnName: "windowMax",
    signature: "windowMax(nums: number[], k: number): number[]",
    starter: `function windowMax(nums, k) {
  // Budget: O(n).
  // Keep a deque of INDICES whose values are in decreasing order.
  // Two separate rules:
  //   back  — drop indices whose value the newcomer beats (useless forever)
  //   front — drop indices that have slid out of the window

  return [];
}`,
    tests: [
      {
        name: "classic",
        input: [[1, 3, -1, -3, 5, 3, 6, 7], 3],
        expected: [3, 3, 5, 5, 6, 7],
      },
      {
        name: "window of 1 is the array itself",
        input: [[4, 2, 12], 1],
        expected: [4, 2, 12],
      },
      {
        name: "window covers everything",
        input: [[9, 1, 5], 3],
        expected: [9],
      },
      {
        name: "descending input — the maximum keeps expiring",
        input: [[5, 4, 3, 2, 1], 2],
        expected: [5, 4, 3, 2],
      },
      {
        // Equal values: popping on `<=` discards the older duplicate, which
        // is correct because the newer one survives longer and is just as big.
        name: "duplicates",
        input: [[2, 2, 2, 2], 2],
        expected: [2, 2, 2],
        hidden: true,
      },
      {
        name: "all negative",
        input: [[-3, -1, -5], 2],
        expected: [-1, -1],
        hidden: true,
      },
      {
        name: "empty array",
        input: [[], 3],
        expected: [],
        hidden: true,
      },
      {
        name: "maximum enters late and dominates",
        input: [[1, 2, 3, 4, 5], 3],
        expected: [3, 4, 5],
        hidden: true,
      },
    ],
    hints: [
      "Use an array of indices as the deque. `dq[0]` is the front; `dq[dq.length - 1]` is the back.",
      "For each index `i`: first pop from the back while `nums[dq.back] <= nums[i]`, then push `i`. Then pop from the front while `dq[0] <= i - k`.",
      "Record an answer only once the window is full — that is, once `i >= k - 1`. The answer is always `nums[dq[0]]`, with no searching.",
    ],
    solution: `function windowMax(nums, k) {
  const out = [];
  const dq = [];   // indices, values decreasing front to back

  for (let i = 0; i < nums.length; i++) {
    // Back: anything smaller AND older can never be a maximum again.
    while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
    dq.push(i);

    // Front: drop whatever has slid out of the window. Different rule.
    while (dq[0] <= i - k) dq.shift();

    // The window is only complete from index k-1 onward.
    if (i >= k - 1) out.push(nums[dq[0]]);
  }

  return out;
}`,
    complexityGate: {
      target: "O(n)",
      // A large window on purpose: the re-scan approach is O(n·k), so a
      // window of 256 makes its curve unmistakably worse than linear.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 7919) % n), 256]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Store indices, not values",
      d: "You need the index to know when an element has fallen out of the window. Storing values forces you to maintain a second structure alongside it.",
    },
    {
      t: "Smaller AND older means permanently useless",
      d: "If `a[j] <= a[i]` and `j < i`, then `a[j]` can never be the maximum of any window containing `a[i]`. Discarding it is not a heuristic — it is a proof.",
    },
    {
      t: "The front is always the answer",
      d: "Because the deque is kept decreasing and holds only in-window indices, the maximum of the current window is at `dq[0]`. No search, no comparison.",
    },
    {
      t: "Two different pop rules, do not conflate them",
      d: "Back-pops enforce the ordering. Front-pops handle window expiry. They test different things and merging them into one condition is the classic bug.",
    },
    {
      t: "This is the aggregate a plain sliding window cannot do",
      d: "Sum can be maintained with one running number because subtraction undoes addition. Maximum cannot, and this structure is exactly the fix.",
    },
  ],
  pitfalls: [
    "Storing values instead of indices, then having no way to detect expiry.",
    "Using `<` instead of `<=` on the back-pop. Equal older duplicates then linger, which is harmless for correctness but grows the deque unnecessarily.",
    "Recording an answer before the window is full. The first k−1 positions have no complete window.",
    "Using `shift()` on a JavaScript array in a hot path — it is O(n). Fine for a lab, but a real implementation uses a head index or a proper deque.",
  ],
  quiz: [
    {
      q: "Why does a monotonic deque store indices rather than values?",
      options: [
        "Indices are smaller",
        "So it can tell when an element has fallen outside the window",
        "To allow duplicates",
        "To keep it sorted",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The expiry test is `dq[0] <= i - k`, which needs positions. With only values you cannot know what has expired.",
      distractors: [
        "Both are numbers of the same size. Memory is not the reason.",
        "",
        "Duplicates are handled by the comparison rule, not by what is stored.",
        "The ordering is maintained by the back-pop rule, and it works on values whether or not you store indices.",
      ],
    },
    {
      q: "Sliding-window maximum over n = 100,000 with window k = 200. Naive versus deque:",
      options: [
        "O(n·k) = 20M versus O(n) = 100k",
        "O(n log k) versus O(n)",
        "O(n^2) versus O(n log n)",
        "Both are O(n) — the deque only saves constants",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The naive version rescans k elements per window. The deque touches each index at most twice overall — a 200x reduction in work here.",
      distractors: [
        "",
        "That is the cost of a heap-based solution with lazy deletion, not of the naive rescan.",
        "The naive version is O(n·k), and k is a parameter, not n. It is only quadratic if k grows with n.",
        "They are different complexity classes, because k appears as a factor in one and not the other.",
      ],
    },
    {
      q: "An element is popped from the BACK of the deque when:",
      options: [
        "It has left the window",
        "It is smaller than or equal to the incoming element",
        "The deque is full",
        "It is the current maximum",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Back-pops enforce the decreasing order. Front-pops handle window expiry. Two different conditions — do not conflate them.",
      distractors: [
        "That is the FRONT rule. Expiry is about position; domination is about value.",
        "",
        "The deque has no capacity limit other than the window size, and fullness is not a trigger.",
        "The current maximum sits at the front and is popped only when it expires.",
      ],
    },
    {
      q: "Why can a plain sliding window maintain a running SUM but not a running MAXIMUM?",
      options: [
        "Maximum is more expensive to compute",
        "Subtraction removes a departing element's contribution to a sum; nothing removes its contribution to a maximum",
        "Maximum is not associative",
        "It can, with the same technique",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The window technique needs the departing element's effect to be undoable. Once the maximum leaves, the previous state is gone and you would have to rescan. Keeping a shortlist of candidates is what replaces the missing inverse.",
      distractors: [
        "A maximum is a single comparison, cheaper than an addition. Cost is not the issue.",
        "",
        "Maximum is perfectly associative. What it lacks is an inverse.",
        "It cannot, with a single running value — which is precisely why the deque exists.",
      ],
    },
    {
      q: "You keep window maxima in a heap and remove expired entries lazily. What is the cost compared to a deque?",
      options: [
        "Identical",
        "O(n log n) instead of O(n), and the heap can grow far beyond k because stale entries linger",
        "The heap is faster",
        "The heap gives wrong answers",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A heap has no cheap way to remove an element from the middle, so expired entries stay until they reach the root. Each push and pop is log-cost, and memory is bounded by n rather than k. The deque discards them immediately.",
      distractors: [
        "The deque is a strictly better fit here, in both time and memory.",
        "",
        "The heap does more work per element and holds more of them.",
        "It gives correct answers if stale entries are checked when they surface. The problem is cost, not correctness.",
      ],
    },
    {
      q: "For 'longest window where max − min ≤ limit', what do you need?",
      options: [
        "One decreasing deque",
        "Two deques — one decreasing for the maximum and one increasing for the minimum",
        "A heap",
        "A prefix sum",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The shrink condition reads both extremes, so you maintain both simultaneously and compare their fronts. Each deque is updated independently by the same rules with the comparison flipped.",
      distractors: [
        "That gives the maximum only, and the condition needs both ends of the range.",
        "",
        "A heap has the same expiry problem as before, doubled.",
        "Prefix sums answer additive range questions. Maximum and minimum have no inverse, so subtraction gives nothing.",
      ],
    },
    {
      q: "Your `windowMax` returns answers for the first k−1 positions too. What did you get wrong?",
      options: [
        "The back-pop condition",
        "You recorded before the window was complete — the answer should only be pushed once `i >= k - 1`",
        "The front-pop condition",
        "The deque should hold values",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Before index k−1 there is no complete window, so there is no answer to record. The deque is already correct at those positions; the problem is that you asked it a question too early.",
      distractors: [
        "That controls the ordering and would produce wrong values, not extra ones.",
        "",
        "Front-pops handle expiry, which cannot happen before the window has even filled.",
        "Storing values would break expiry detection, which is a different bug producing different symptoms.",
      ],
    },
    {
      q: "The deque's maximum size is:",
      options: ["n", "k", "log n", "2"],
      answer: 1,
      difficulty: "apply",
      why: "It only ever contains in-window indices, and the window holds k elements. It reaches exactly k when the input is strictly decreasing, because nothing is ever dominated.",
      distractors: [
        "It can never hold indices from outside the window — the front-pop removes them each step.",
        "",
        "There is no logarithmic structure here. Nothing is being halved.",
        "A strictly decreasing input keeps every element as a live candidate, filling the deque to k.",
      ],
    },
  ],
};

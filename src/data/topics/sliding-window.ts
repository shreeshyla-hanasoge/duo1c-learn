import type { Topic } from "../types.ts";

export const slidingWindow: Topic = {
  id: "sliding-window",
  title: "Sliding window",
  tier: 0,
  week: 2,
  depth: "core",
  summary: "Fixed and variable size — the workhorse for every rolling metric.",
  why: "Every rolling average, streak counter, rate limiter and time-series aggregate in your codebases is a sliding window. Computing them by re-scanning the window each step is the most common quiet O(n·w) in production code, and it only becomes visible when the window grows.",
  complexity: "O(n)",
  viz: ["sliding-window"],
  learn: {
    intuition:
      "Imagine you want the sum of every 200 consecutive readings in a list of 100,000. The obvious approach adds up 200 numbers, moves one step right, and adds up 200 numbers again — but 199 of those are the same numbers you just added. A sliding window fixes exactly that waste. Keep a running total. When the window moves one step right, add the value that just entered and subtract the value that just left. Two operations instead of two hundred, and the answer is identical. The technique generalises to any aggregate you can update incrementally, and to windows whose size is not fixed but is defined by a condition — 'the longest stretch with no repeated character', for example, where the window grows on the right and shrinks on the left whenever the condition breaks.",
    mechanics: [
      {
        heading: "Decide what the window means",
        body: "Fixed size (the last 200 readings) or variable size (the longest stretch satisfying a rule). The two have different shapes, and choosing before you start writing saves the rewrite.",
      },
      {
        heading: "Keep an aggregate that can be updated, not recomputed",
        body: "A running sum works because addition has an inverse — you can subtract the departing element. A running maximum does not, which is why maximum over a window needs a monotonic deque instead of a single number. Ask 'can I undo the contribution of the element that leaves?' before choosing your state.",
      },
      {
        heading: "Fixed window: add the entrant, remove the leaver",
        body: "Move `hi` right, add `a[hi]`. If the window is now larger than w, remove `a[lo]` and move `lo` right. Record the answer once the window is exactly the right size. Never recompute from scratch.",
      },
      {
        heading: "Variable window: grow right, shrink left while the rule is broken",
        body: "Advance `hi` and take the new element in. Then, while the window violates the constraint, remove `a[lo]` and advance `lo`. Record the best answer after the window is legal again. The constraint lives entirely in the shrink condition — write the constraint down first and the code follows from it.",
      },
      {
        heading: "Shrink with `while`, never with `if`",
        body: "One new element can break the rule by a wide margin — adding a large number to a 'sum at most K' window may require removing several elements before the window is legal. An `if` removes exactly one and leaves the window in an invalid state, which silently produces wrong answers rather than crashing.",
      },
    ],
    complexityDerivation:
      "The variable-size version has a `while` loop inside a `for` loop, which looks like it should be quadratic. It is not, and the argument is worth being able to state out loud because interviewers ask for it directly. Look at what the inner loop actually does: it advances `lo`. `lo` starts at 0, never decreases, and can never pass `hi`, which itself stops at n. So across the entire run — not per iteration, across the whole run — the inner loop body executes at most n times in total. The outer loop is n iterations, the inner loop is n executions in total, so the whole thing is O(n) + O(n) = O(n). This is an amortised argument: any single outer iteration might do a lot of shrinking, but the total is bounded. The general principle is the useful takeaway: nesting in the source code does not imply multiplication in the cost. What matters is the total distance each pointer travels.",
    variants: [
      {
        name: "Fixed size",
        when: "Rolling sum, rolling average, a window of exactly w items.",
        delta:
          "The window size is a constant, so `lo = hi - w + 1` and there is no shrink loop at all.",
      },
      {
        name: "Variable size — longest valid",
        when: "Longest substring without repeats, longest subarray with sum at most K.",
        delta:
          "Grow on the right, shrink from the left while the window is invalid, record the best size after each shrink.",
      },
      {
        name: "Variable size — shortest valid",
        when: "Smallest subarray with sum at least K, minimum window containing all required characters.",
        delta:
          "The mirror image: shrink while the window is still valid, and record the best just before it becomes invalid.",
      },
      {
        name: "Window over time, not over count",
        when: "Rate limiting, 'events in the last 60 seconds'.",
        delta:
          "`lo` advances by timestamp rather than by index, so the window holds a varying number of items. Same shape, different eviction rule.",
      },
    ],
    tradeoffs: [
      {
        vs: "Recomputing the aggregate each step",
        pick: "Sliding window, unless w is tiny and fixed",
        because:
          "Recomputation is O(n·w) and sliding is O(n). When w is 5 the difference is a constant factor and clarity may win; when w is 200 it is a 200x difference, and when w grows with n it is the difference between linear and quadratic.",
      },
      {
        vs: "Prefix sums",
        pick: "Prefix sums when the ranges are arbitrary, sliding window when they move forward",
        because:
          "Prefix sums answer any range in O(1) after an O(n) build, which is strictly more powerful — but they need the whole array up front and O(n) extra memory. A sliding window works on a stream, with O(1) memory, as long as the range only ever moves forward.",
      },
      {
        vs: "A monotonic deque",
        pick: "Deque when the aggregate cannot be undone",
        because:
          "Sum, count and product-with-no-zeros can be updated by subtracting or dividing out the departing element. Minimum and maximum cannot — removing the current maximum leaves you with no idea what the new one is. That is precisely the gap the monotonic deque fills.",
      },
    ],
  },
  realWorld: [
    {
      system: "API rate limiting (sliding window log and counter)",
      kind: "industry",
      problem:
        "A fixed one-minute bucket lets a client send the full quota at 11:59:59 and the full quota again at 12:00:00 — twice the intended rate across a two-second span.",
      applied:
        "A sliding window keeps request timestamps and evicts those older than the window as it advances, so the count always reflects the true last 60 seconds. The sliding-window-counter variant approximates this with two buckets and a weighted blend, trading a little accuracy for constant memory.",
      impact: "Removes the 2x burst at bucket boundaries",
    },
    {
      system: "TCP congestion control",
      kind: "industry",
      problem:
        "A sender must decide how much data may be in flight without acknowledgement — too little wastes bandwidth, too much causes congestion collapse.",
      applied:
        "The congestion window is a sliding window over the byte stream. It advances as acknowledgements arrive and shrinks on loss. This is the original sliding window, and the reason the term exists.",
      evidence: "RFC 5681",
    },
    {
      system: "Monitoring and alerting (Prometheus rate, Datadog rolling)",
      kind: "industry",
      problem:
        "'Alert when the error rate over the last 5 minutes exceeds 2%' must be evaluated continuously over a stream of millions of samples.",
      applied:
        "Each evaluation slides the window forward, adding new samples and expiring old ones, rather than re-aggregating five minutes of data. This is what makes per-second evaluation across thousands of series affordable.",
      impact: "O(window) per evaluation → O(new samples)",
    },
    {
      system: "traed — rolling indicators over candles",
      kind: "yours",
      problem:
        "Rolling mean, standard deviation and ATR computed by slicing the last w candles and re-aggregating give O(n·w). Over a multi-year backtest with a 200-period lookback that is a 200x cost multiplier on every strategy evaluation.",
      applied:
        "Maintain the running sum and sum of squares — or Welford's algorithm for numerical stability — updating in O(1) per candle. The variance comes out of the same state without a second pass.",
      impact: "O(n·w) → O(n); roughly 200x fewer operations at w = 200",
    },
  ],
  lab: {
    prompt:
      "Return the length of the longest substring with no repeated characters. For example `'abcabcbb'` gives 3 (`'abc'`), and `'bbbbb'` gives 1. The nested-loop version that tries every starting position is correct and quadratic — the gate runs on a string with no repeats at all, so the window grows the whole way. Budget: O(n).",
    fnName: "longestUnique",
    signature: "longestUnique(s: string): number",
    starter: `function longestUnique(s) {
  // Budget: O(n) time.
  // Grow the window on the right; while the new character breaks the
  // "no repeats" rule, shrink from the left. Remember: while, not if.

  return 0;
}`,
    tests: [
      { name: "classic", input: ["abcabcbb"], expected: 3 },
      { name: "all identical", input: ["bbbbb"], expected: 1 },
      { name: "repeat is not adjacent", input: ["pwwkew"], expected: 3 },
      { name: "empty string", input: [""], expected: 0 },
      { name: "already all unique", input: ["abcdef"], expected: 6 },
      {
        // "tmmzuxt": the best window is "mzuxt" (5). A solution that jumps
        // `lo` straight to lastSeen + 1 without checking it is still inside
        // the window will move `lo` backwards here and return 6.
        name: "stale index outside the window must be ignored",
        input: ["tmmzuxt"],
        expected: 5,
        hidden: true,
      },
      {
        name: "single character",
        input: ["a"],
        expected: 1,
        hidden: true,
      },
      {
        name: "spaces and symbols count as characters",
        input: ["a b!a"],
        expected: 4,
        hidden: true,
      },
    ],
    hints: [
      "Keep a `Set` of the characters currently inside the window, plus two indices `lo` and `hi`.",
      "Move `hi` forward one character at a time. While the set already contains `s[hi]`, delete `s[lo]` from the set and advance `lo`. Then add `s[hi]` and record `hi - lo + 1` if it beats the best so far.",
      "If instead you keep a map of last-seen positions and jump `lo` directly, you must guard it: `lo = Math.max(lo, lastSeen + 1)`. Without the `max`, a stale position from before the window start drags `lo` backwards.",
    ],
    solution: `function longestUnique(s) {
  const inWindow = new Set();
  let lo = 0;
  let best = 0;

  for (let hi = 0; hi < s.length; hi++) {
    // while, not if: the incoming character may need several removals.
    while (inWindow.has(s[hi])) {
      inWindow.delete(s[lo]);
      lo++;
    }
    inWindow.add(s[hi]);
    best = Math.max(best, hi - lo + 1);
  }

  return best;
}`,
    complexityGate: {
      target: "O(n)",
      // Every character distinct, so the window never shrinks and the answer
      // is n. A nested-loop solution has to try every starting position.
      gen: "(n) => [Array.from({ length: n }, (_, i) => String.fromCharCode(0x100 + i)).join('')]",
      sizes: [2000, 4000, 8000, 16000],
    },
  },
  insights: [
    {
      t: "Each index enters and leaves exactly once",
      d: "That is the amortised argument that makes the whole scan O(n) even though the inner `while` looks nested. Say it out loud when you write one — interviewers ask for exactly this.",
    },
    {
      t: "Fixed window: add the entrant, remove the leaver",
      d: "Never recompute the aggregate. Rolling sum, rolling count, and rolling minimum or maximum (with a monotonic deque) all update in O(1) per step.",
    },
    {
      t: "Rolling variance needs Welford, not a re-scan",
      d: "Recomputing the standard deviation over the window each step is O(n·w). Maintaining sum and sum of squares — or Welford's method for numerical stability — is O(n) in total.",
    },
    {
      t: "Variable window: grow right, shrink left on violation",
      d: "The rule lives in the shrink condition. Write the rule down first; the code follows from it directly.",
    },
    {
      t: "Not every aggregate can slide",
      d: "The technique needs the departing element's contribution to be removable. Sum and count qualify. Maximum does not, and neither does 'number of distinct values' without a count map alongside it.",
    },
  ],
  pitfalls: [
    "Shrinking with `if` instead of `while`. One removal is often not enough to restore the rule, and the window silently becomes invalid.",
    "Forgetting that a stale index in a map may sit before the window start. Guard with `lo = max(lo, lastSeen + 1)` or the window will grow backwards.",
    "Recording the answer at the wrong moment. For 'longest valid' record after shrinking; for 'shortest valid' record before the window becomes invalid.",
    "Sliding a product through a zero. Dividing out the departing element breaks the moment a zero enters the window — keep a count of zeros separately, or use a different aggregate.",
  ],
  quiz: [
    {
      q: "A rolling standard deviation over a window of 200 bars is computed by slicing the window and calling stdev() each step, for 100k bars. What is the complexity?",
      options: [
        "O(n)",
        "O(n · w) — 20 million operations",
        "O(n log n)",
        "O(w^2)",
      ],
      answer: 1,
      difficulty: "apply",
      why: "n steps × w work per step. Maintaining a running sum and sum of squares — or Welford — makes it O(n), which is a 200x reduction here.",
      distractors: [
        "This is the target, not the cost of the code described. Re-slicing means the window work is repeated at every step.",
        "There is no sorting and no halving anywhere, so no log factor can appear.",
        "",
        "This describes the cost of one step, not of the whole scan, and even one step is O(w), not O(w^2).",
      ],
    },
    {
      q: "In a variable-size window, why must the shrink step be a `while` and not an `if`?",
      options: [
        "For readability",
        "Because restoring the rule may require removing several elements in one step",
        "Because `if` is slower",
        "It does not matter — one removal is always enough",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A single new element can break the rule by a wide margin. The loop must keep shrinking until the window is legal again, and an `if` leaves it invalid.",
      distractors: [
        "It changes the result, not the readability. This is a correctness issue.",
        "",
        "They compile to nearly the same thing. Speed is not the consideration.",
        "This is exactly the assumption that fails. Adding one large value to a 'sum at most K' window can require removing many elements.",
      ],
    },
    {
      q: "The inner while-loop of a sliding window makes the code look nested. Why is it still O(n)?",
      options: [
        "Because the window is small",
        "Because `lo` only ever moves forward, so across the whole run it advances at most n times in total",
        "Because the outer loop is O(1)",
        "It is actually O(n^2) in the worst case",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Amortisation: the inner loop's total work is bounded by the total distance `lo` travels, which is n. Nesting in the source does not imply multiplication in the cost.",
      distractors: [
        "The window size is not bounded in the variable-size case — it can be the entire array.",
        "",
        "The outer loop runs n times. It is the inner loop whose total is bounded, not the outer one.",
        "It is genuinely linear. This is the reflex answer that the amortised argument exists to correct.",
      ],
    },
    {
      q: "Which aggregate CANNOT be maintained in O(1) per step with a single running value?",
      options: [
        "Sum",
        "Count of elements",
        "Maximum",
        "Sum of squares",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Removing the departing element requires undoing its contribution. Subtraction undoes a sum; nothing undoes a maximum, because once you drop the current maximum you have no record of the second-largest. A monotonic deque solves it in amortised O(1) with extra state.",
      distractors: [
        "Subtract the departing value. Exactly invertible.",
        "Decrement. Exactly invertible.",
        "",
        "Subtract the square of the departing value. Invertible, and this is how rolling variance is maintained.",
      ],
    },
    {
      q: "You need the longest subarray whose sum is at most K, with all values positive. Sliding window works. Now some values are negative. What breaks?",
      options: [
        "Nothing — the same code works",
        "Shrinking from the left no longer reliably reduces the sum, so the window is no longer monotone",
        "The window becomes too large for memory",
        "You need to sort first",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The technique relies on 'extending right increases the sum, shrinking left decreases it'. With negative numbers, removing an element can increase the sum, so shrinking may never restore the rule. Prefix sums with a monotonic structure, or a different approach entirely, is required.",
      distractors: [
        "It compiles and runs and returns wrong answers, which is the worst combination. The monotone assumption is silently violated.",
        "",
        "Memory is unaffected. The failure is logical, not resource-related.",
        "Sorting destroys the subarray relationship — elements must stay contiguous and in order.",
      ],
    },
    {
      q: "For 'smallest subarray with sum at least K', where in the loop do you record the answer?",
      options: [
        "After growing the window on the right",
        "Inside the shrink loop, while the window is still valid, just before removing another element",
        "After the shrink loop finishes",
        "Only at the very end",
      ],
      answer: 1,
      difficulty: "judge",
      why: "For a minimisation problem you want the smallest window that still satisfies the rule, so you record while it is valid and shrink until it stops being valid. This is the mirror of 'longest valid', where you record only after the window has become legal again.",
      distractors: [
        "At that moment the window may be far larger than necessary — you have not yet shrunk it.",
        "",
        "After the shrink loop the window has just become invalid, so it no longer satisfies the sum condition.",
        "The best window may occur anywhere in the scan, and it will not still be the window at the end.",
      ],
    },
    {
      q: "A rate limiter uses fixed one-minute buckets. A client sends its full quota at 11:59:59 and again at 12:00:00. What is wrong, and what fixes it?",
      options: [
        "Nothing is wrong; both minutes were respected",
        "It permits twice the intended rate across the boundary — a sliding window that expires by timestamp fixes it",
        "The bucket size is too large",
        "The client should be blocked",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The rule is meant to be 'at most Q per any 60 seconds', and fixed buckets only enforce 'at most Q per calendar minute'. A sliding window evicts by timestamp, so the count always reflects the true last 60 seconds.",
      distractors: [
        "Each calendar minute was respected and the actual rate was still 2Q over two seconds, which is what the limit exists to prevent.",
        "",
        "Any fixed bucket size has the same boundary problem; making it smaller only shrinks the burst window without removing it.",
        "The client did nothing forbidden by the stated rule. The rule was stated wrongly.",
      ],
    },
    {
      q: "Your `longestUnique` uses a last-seen map and sets `lo = lastSeen[c] + 1` directly. On 'tmmzuxt' it returns 6 instead of 5. Why?",
      options: [
        "The map is not being cleared",
        "The stored position for 't' is from before the current window, so assigning `lo` directly moves it backwards",
        "Set lookup is too slow",
        "The string contains a repeated character",
      ],
      answer: 1,
      difficulty: "judge",
      why: "When the second 't' arrives, `lo` is already at index 2 but the last-seen position of 't' is 0, so the direct assignment sets `lo` back to 1 and the window swallows characters it had already excluded. Guard with `lo = Math.max(lo, lastSeen + 1)`.",
      distractors: [
        "Clearing the map is not required, and doing so would destroy the information the approach depends on. The fix is a bounds guard, not a reset.",
        "",
        "Speed is irrelevant here — the answer is wrong, not slow.",
        "It does, and that is the normal case this algorithm handles. The bug is in how the repeat position is used.",
      ],
    },
  ],
};

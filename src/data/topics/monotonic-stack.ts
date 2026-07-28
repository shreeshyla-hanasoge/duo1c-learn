import type { Topic } from "../types.ts";

export const monotonicStack: Topic = {
  id: "monotonic-stack",
  title: "Monotonic stack",
  tier: 1,
  week: 6,
  depth: "core",
  summary: "Next greater element, and the family of problems it collapses.",
  why: 'It converts a whole class of "look rightwards until…" problems from O(n^2) to O(n) with about six lines. Once you can recognise the shape, the notoriously hard problems — largest rectangle in a histogram, trapping rain water, stock span — all become the same routine question.',
  complexity: "O(n)",
  viz: ["monotonic-stack"],
  learn: {
    intuition:
      "Suppose for every day you want to know how many days until a warmer one. The obvious approach looks forward from each day until it finds a warmer one — quadratic. Turn the question around. Walk forward through the days once, keeping a pile of days that are still waiting for their answer. When today arrives, it answers everyone on the pile who is colder than it, because today is the first warmer day they have seen. Pop them off, record today as their answer, and then put today on the pile to wait for its own warmer day. Every day joins the pile once and leaves it once. The pile is automatically in decreasing temperature order, because any colder day still sitting under a warmer one would already have been answered — and that ordering is what gives the technique its name.",
    mechanics: [
      {
        heading: "The stack holds indices whose answer is still unknown",
        body: "Push the index, not the value, because you usually need the distance or the position, and you can always look the value up. An index sits on the stack exactly while nothing has arrived that answers its question.",
      },
      {
        heading: "Each arrival resolves everything it beats",
        body: "Before pushing the current index, pop every index on top whose value loses the comparison. Each pop is an answer found: the current index is the first element to the right that beats it. Use `while`, not `if` — one arrival can answer many pending indices at once.",
      },
      {
        heading: "Then push the current index and move on",
        body: "The current index now becomes a pending question. Because you popped everything it beats first, the stack stays ordered, and that ordering is what makes each pop valid.",
      },
      {
        heading: "The direction of the ordering encodes the question",
        body: "A decreasing stack answers 'next greater element'. An increasing stack answers 'next smaller'. Walking right to left instead of left to right answers 'previous' instead of 'next'. Four questions, one skeleton, one comparison flipped.",
      },
      {
        heading: "Whatever is left at the end has no answer",
        body: "Indices still on the stack when the scan finishes never found an element that beat them. Assign them the default — -1, or infinity, or the array length, depending on what the problem wants — rather than forgetting them.",
      },
    ],
    complexityDerivation:
      "The code has a `while` inside a `for`, so it looks quadratic, and it is not. The argument is a counting one. Every index is pushed onto the stack exactly once across the entire scan. Every pop removes an index that was previously pushed, so the total number of pops over the whole run cannot exceed the total number of pushes, which is n. The outer loop is n iterations and the inner loop bodies total at most n executions across all iterations combined — not per iteration. So the whole scan is O(n) + O(n) = O(n). Space is O(n) in the worst case, when the input is strictly decreasing and nothing is ever resolved until the end. This is the same amortised argument as the sliding window, and it is worth being able to say in one sentence: nesting in the source does not imply multiplication in the cost when the inner loop consumes a budget that the outer loop fills only once.",
    variants: [
      {
        name: "Next greater element",
        when: "'When does something bigger appear to the right?'",
        delta:
          "Decreasing stack, pop while the current value is greater. Stock span, daily temperatures.",
      },
      {
        name: "Next smaller element",
        when: "'How far can this bar extend before something shorter blocks it?'",
        delta:
          "Increasing stack, pop while the current value is smaller. This is the core of largest-rectangle-in-a-histogram.",
      },
      {
        name: "Previous greater or smaller",
        when: "You need the boundary on the left instead of the right.",
        delta:
          "Same algorithm walking right to left — or read the answer off the element that remains below on the stack at the moment of the push.",
      },
      {
        name: "Two-sided span",
        when: "Largest rectangle, trapping rain water, maximum area under constraints.",
        delta:
          "Combine previous-smaller and next-smaller for each index to get the full extent it can span. Two passes, or one pass reading both at pop time.",
      },
    ],
    tradeoffs: [
      {
        vs: "Brute force scanning right from each element",
        pick: "Monotonic stack whenever n is more than a few hundred",
        because:
          "The brute force is O(n^2) and about the same amount of code. The only argument for it is that it is easier to convince yourself it is correct — which is worth something in a one-off script and nothing in a hot path.",
      },
      {
        vs: "A segment tree for range minimum",
        pick: "Monotonic stack when you need the answer for every index",
        because:
          "A segment tree answers arbitrary range queries in O(log n) each, which is more general. If what you actually need is one answer per index in a single pass, the stack gives all n answers in O(n) total with a fraction of the code.",
      },
      {
        vs: "Sorting the elements",
        pick: "Monotonic stack, because position matters",
        because:
          "These problems ask about the nearest element in a given direction, so the original order is the whole question. Sorting destroys exactly the information being asked about.",
      },
    ],
  },
  realWorld: [
    {
      system: "Stock span and trading indicators",
      kind: "industry",
      problem:
        "'How many consecutive days has this price been at or above every prior day?' asked for every day in a long series is quadratic when computed directly.",
      applied:
        "A decreasing monotonic stack of prior days. Each new price pops every day it exceeds, and the span is the distance to whatever remains beneath. This is the textbook stock-span algorithm and it is used in real technical indicators.",
      impact: "O(n^2) → O(n)",
    },
    {
      system: "Skyline and layout engines",
      kind: "industry",
      problem:
        "Computing the visible outline of overlapping rectangles, or how far a layout box can expand before a taller neighbour blocks it.",
      applied:
        "The 'how far until something taller' question is a next-greater-element query. Layout and rendering code uses the same stack pattern to resolve extents in a single pass over the elements.",
    },
    {
      system: "Expression parsing and operator precedence",
      kind: "industry",
      problem:
        "Turning infix expressions into a tree requires deciding when a pending operator must be applied before the incoming one.",
      applied:
        "The shunting-yard algorithm keeps operators on a stack in non-increasing precedence, popping those that bind tighter when a weaker operator arrives. It is a monotonic stack where the ordering is precedence rather than value.",
      evidence: "Dijkstra, shunting-yard algorithm, 1961",
    },
    {
      system: "traed — drawdown and consecutive-run analysis",
      kind: "yours",
      problem:
        "'How long until the equity curve exceeds this peak again' and 'longest run below a prior high' are next-greater-element questions over the equity series, and are usually written as nested scans.",
      applied:
        "One monotonic-stack pass produces the recovery distance for every point at once, rather than re-scanning forward from each one.",
      impact: "O(n^2) recovery analysis → O(n)",
    },
  ],
  lab: {
    prompt:
      "For each element, return how many positions forward you must move to find a strictly greater value, or 0 if there is none. For `[73,74,75,71,69,72,76,73]` the answer is `[1,1,4,2,1,1,0,0]`. This is the 'daily temperatures' problem. The nested scan is correct and quadratic; the gate runs on a strictly decreasing array, which is the brute force's worst case. Budget: O(n).",
    fnName: "daysUntilWarmer",
    signature: "daysUntilWarmer(temps: number[]): number[]",
    starter: `function daysUntilWarmer(temps) {
  // Budget: O(n).
  // Keep a stack of INDICES still waiting for a warmer day.
  // Each arriving temperature answers everyone it beats.

  return [];
}`,
    tests: [
      {
        name: "classic",
        input: [[73, 74, 75, 71, 69, 72, 76, 73]],
        expected: [1, 1, 4, 2, 1, 1, 0, 0],
      },
      {
        name: "strictly increasing — always tomorrow",
        input: [[1, 2, 3, 4]],
        expected: [1, 1, 1, 0],
      },
      {
        name: "strictly decreasing — never",
        input: [[4, 3, 2, 1]],
        expected: [0, 0, 0, 0],
      },
      {
        // Equal values must NOT count as warmer. A `>=` comparison returns
        // [1,1,0] here and passes every other test in this list.
        name: "equal is not warmer",
        input: [[5, 5, 5]],
        expected: [0, 0, 0],
      },
      { name: "single element", input: [[7]], expected: [0] },
      { name: "empty array", input: [[]], expected: [], hidden: true },
      {
        name: "one arrival resolves several pending days",
        input: [[5, 4, 3, 9]],
        expected: [3, 2, 1, 0],
        hidden: true,
      },
      {
        name: "negative temperatures",
        input: [[-5, -10, -1]],
        expected: [2, 1, 0],
        hidden: true,
      },
    ],
    hints: [
      "Create the answer array filled with 0, so any index that never finds a warmer day is already correct and you only have to write the ones that do.",
      "Walk forward with an index `i`. While the stack is non-empty and `temps[i]` is greater than the temperature at the top index, pop it and set its answer to `i - poppedIndex`.",
      "Use `while`, not `if` — a single warm day can answer several pending colder days at once. Then push `i` and continue.",
    ],
    solution: `function daysUntilWarmer(temps) {
  const out = new Array(temps.length).fill(0);
  const pending = [];   // indices still waiting for a warmer day

  for (let i = 0; i < temps.length; i++) {
    // while, not if: today may answer several waiting days.
    // Strictly greater — an equal temperature is not warmer.
    while (pending.length && temps[i] > temps[pending[pending.length - 1]]) {
      const j = pending.pop();
      out[j] = i - j;
    }
    pending.push(i);
  }

  // Anything still pending never found a warmer day; it is already 0.
  return out;
}`,
    complexityGate: {
      target: "O(n)",
      // Strictly decreasing: nothing is ever resolved, so the stack grows to
      // n and the brute force scans the whole remaining array every time.
      gen: "(n) => [Array.from({ length: n }, (_, i) => n - i)]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "The stack holds unresolved questions",
      d: "Each index sits on the stack precisely because its answer is not yet known. Arriving elements resolve as many as they can, then join the queue of pending ones.",
    },
    {
      t: "The direction of the ordering encodes the question",
      d: "Decreasing stack gives next-greater-element. Increasing stack gives next-smaller. Same skeleton, one comparison flipped.",
    },
    {
      t: "Largest rectangle in a histogram is the same pattern",
      d: 'Once you see that "how far can this bar extend?" is a next-smaller-element query on both sides, the notorious problem becomes routine.',
    },
    {
      t: "Push indices, not values",
      d: "Almost every version of this problem wants a distance or a position. You can always read the value from the index; you cannot recover the index from the value.",
    },
  ],
  pitfalls: [
    "Using `if` instead of `while` when popping. One arrival often resolves several pending indices, and an `if` leaves the rest with wrong answers.",
    "Using `>=` where the problem says strictly greater. Equal values then resolve each other and the answers are silently wrong.",
    "Forgetting the indices left on the stack at the end. They have no answer, and the default must be set deliberately.",
    "Storing values instead of indices, then needing the distance and having no way to compute it.",
  ],
  quiz: [
    {
      q: "In a next-greater-element scan, what does the stack contain?",
      options: [
        "The greatest elements seen so far",
        "Indices whose answer is still unknown, with values in decreasing order",
        "All elements in sorted order",
        "The current window",
      ],
      answer: 1,
      difficulty: "apply",
      why: "An index stays on the stack exactly while nothing greater has appeared to its right. The values are decreasing because any smaller, older element would already have been resolved by the larger one above it.",
      distractors: [
        "It holds pending elements, and the largest of them is at the bottom, not the point of the structure.",
        "",
        "It is ordered, but it holds only the unresolved subset, not everything.",
        "There is no window here — indices leave when they are answered, not when they fall out of a range.",
      ],
    },
    {
      q: "Why is the monotonic stack scan O(n) despite the inner while-loop?",
      options: [
        "The stack is small",
        "Each index is pushed once and popped at most once across the entire run",
        "The while-loop runs at most twice",
        "It is actually O(n log n)",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Total pops are bounded by total pushes, which is n. This is amortisation, exactly as with the sliding window: nesting in the source does not imply multiplication in the cost.",
      distractors: [
        "The stack can hold all n indices — on a strictly decreasing array, nothing is ever resolved until the end.",
        "",
        "It can run n−1 times in a single iteration, when one large value arrives after a long decreasing run.",
        "There is no halving and no sorting anywhere, so no log factor can appear.",
      ],
    },
    {
      q: "You need the PREVIOUS smaller element for each index instead of the next one. What changes?",
      options: [
        "Nothing — the same code works",
        "Walk right to left, or read the answer off whatever remains on the stack at push time",
        "Sort the array first",
        "Use a queue instead",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Direction of travel selects previous versus next; the comparison selects greater versus smaller. Those two independent choices give all four variants of the same skeleton. In fact both answers are available in one pass — the element beneath the current one at push time is the previous smaller.",
      distractors: [
        "The same code gives you 'next', which is the opposite direction from what was asked.",
        "",
        "Sorting destroys position, and position is exactly what 'previous' refers to.",
        "A queue removes from the wrong end. The most recently pushed element is the nearest one, which is what you need.",
      ],
    },
    {
      q: "For 'largest rectangle in a histogram', what does the monotonic stack compute?",
      options: [
        "The tallest bar",
        "For each bar, how far it can extend left and right before a strictly shorter bar blocks it",
        "The sorted order of bar heights",
        "The total area of all bars",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A rectangle whose height is one bar extends until a shorter bar appears on either side. Previous-smaller and next-smaller give those two boundaries, so the area is height × (right − left − 1). Once you see it as a next-smaller query, the problem stops being special.",
      distractors: [
        "The tallest bar rarely gives the largest rectangle — a short bar spanning the whole width often beats it.",
        "",
        "Sorting loses adjacency, and a rectangle must span contiguous bars.",
        "That is the sum of the bars, which is a different quantity entirely.",
      ],
    },
    {
      q: "Your `daysUntilWarmer` returns `[1,1,0]` for `[5,5,5]` instead of `[0,0,0]`. What is wrong?",
      options: [
        "The stack is not being cleared",
        "You used `>=` instead of `>`, so an equal temperature counts as warmer",
        "The answer array is initialised wrongly",
        "You pushed values instead of indices",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The problem asks for a strictly warmer day. With `>=`, each equal value pops the previous one and records a distance of 1. This is the single most common bug in this family, and it usually passes every test that lacks a duplicate.",
      distractors: [
        "Leftover stack entries produce zeros, which is the correct answer here — clearing is not the issue.",
        "",
        "Initialising to 0 is right, and it is why the last element is correct.",
        "That would break the distance calculation everywhere, not only on equal values.",
      ],
    },
    {
      q: "Which problem is NOT a monotonic stack problem?",
      options: [
        "Daily temperatures",
        "Largest rectangle in a histogram",
        "Trapping rain water",
        "Finding the k-th largest element",
      ],
      answer: 3,
      difficulty: "judge",
      why: "K-th largest is about rank, not about the nearest element in a direction, so there is no pending-question structure to exploit. It is a heap or quickselect problem. The other three all ask 'how far until something bigger or smaller'.",
      distractors: [
        "The canonical example — next greater element with distances.",
        "Next smaller on both sides gives each bar's extent.",
        "Water above a position is bounded by the nearest taller bar on each side.",
        "",
      ],
    },
    {
      q: "The stack in a next-greater scan can hold all n indices. When?",
      options: [
        "When the input is random",
        "When the input is strictly decreasing, so nothing is ever resolved during the scan",
        "When the input is strictly increasing",
        "It never holds more than log n",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Each new element is smaller than everything before it, so it never pops anything and simply joins the pile. Every index is still pending at the end and every answer is the default. This is the space worst case, and the brute force's time worst case.",
      distractors: [
        "Random input resolves elements steadily, so the stack stays short on average.",
        "",
        "Strictly increasing is the best case: each arrival pops the single element below it, so the stack never exceeds one entry.",
        "There is no logarithmic bound. The stack is O(n) in the worst case.",
      ],
    },
    {
      q: "An interviewer asks why you did not use a segment tree for 'next greater element for every index'. Best answer?",
      options: [
        "Segment trees are too hard",
        "A segment tree answers arbitrary range queries in O(log n) each, which is more than the problem needs — one pass gives all n answers in O(n) total",
        "Segment trees use too much memory",
        "They give the wrong answer",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The right framing is capability versus need. The segment tree is strictly more powerful and you would be paying a log factor and considerably more code for generality you are not using. Naming what you are giving up is what makes it a decision rather than a preference.",
      distractors: [
        "Difficulty is not an engineering argument, and an interviewer will read it as avoidance.",
        "",
        "Memory is O(n) for both. That is not the distinguishing factor.",
        "A segment tree answers correctly. It is simply the wrong tool for a per-index single-pass question.",
      ],
    },
  ],
};

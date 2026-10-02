import type { Topic } from "../types.ts";

export const recursionMemo: Topic = {
  id: "recursion-memo",
  title: "Recursion → memoisation",
  tier: 1,
  week: 8,
  depth: "core",
  summary: "Recursion trees, overlapping subproblems, and the road to DP.",
  why: 'Memoisation is the bridge from "I can describe the problem recursively" to "I can solve it in polynomial time". Every dynamic programming solution starts life here, and in an interview writing the recursion first and then adding a cache is a far more reliable route to a correct answer than trying to write the table directly.',
  conceptFilm: {
    src: "/media/concept-films/recursion-nested-rooms.mp4",
    title: "The stack remembers the way home",
    watchFor:
      "Each room is one active call. The return journey passes through the rooms in reverse order—the call stack unwinding.",
  },
  complexity: "Distinct states × work per state",
  learn: {
    intuition:
      "Write the naive recursive solution for Fibonacci and draw what it actually does. `fib(5)` calls `fib(4)` and `fib(3)`. `fib(4)` calls `fib(3)` and `fib(2)`. So `fib(3)` is computed twice — and each of those recomputes `fib(2)`, and so on. The tree doubles at every level, giving exponential time, but the number of DIFFERENT questions being asked is only n. Everything else is repetition. Memoisation is nothing more than writing the answer down the first time you work it out, and looking it up thereafter. The code barely changes: check the cache at the top, store before you return. What changes is the cost, from exponential to the number of distinct questions. Once you see it this way, dynamic programming stops being a separate topic — it is this, with the answers filled in deliberately rather than on demand.",
    mechanics: [
      {
        heading: "Write the recursion first, without any cache",
        body: "Get the base cases and the recurrence right while the code is simple. A memoised version of a wrong recursion is a fast wrong answer, and much harder to debug because the cache hides the call pattern.",
      },
      {
        heading: "Identify the state — everything the answer depends on",
        body: "The state is the complete set of parameters that determine the result. If the answer depends on position, remaining budget and whether you are currently holding something, then the state is all three. Getting this list right is the entire skill.",
      },
      {
        heading: "Cache on the FULL state",
        body: "The cache key must include every part of the state. A key of just `i` when the answer also depends on `remaining` will return one sub-problem's answer for a different sub-problem — producing wrong results that look plausible, which is the worst failure mode there is.",
      },
      {
        heading: "Check on entry, store before returning",
        body: "Two lines: if the key is in the cache, return it; compute, store, return. Note that a stored value of 0, false or null is a real answer — test for presence, not for truthiness, or you will recompute those states every time.",
      },
      {
        heading: "Watch the recursion depth",
        body: "Memoisation fixes the time, not the stack. A chain of n dependent states still means n nested calls, and typical runtimes overflow somewhere around ten thousand frames. When depth is proportional to the input, convert to a bottom-up loop — which is exactly what tabulation is.",
      },
    ],
    complexityDerivation:
      "There is one formula and it covers essentially every memoised recursion: total cost equals the number of distinct states multiplied by the work done per state, not counting recursive calls. The justification is that memoisation makes each state's body execute exactly once — every later request for that state is a cache lookup — so summing the per-state work over all reachable states gives the total. For Fibonacci there are n states and each does one addition, so O(n). For a knapsack with n items and capacity W there are n×W states each doing O(1) work, so O(n·W). For a state of (index, mask) over 20 items there are n × 2^20 states, which is where the approach stops being affordable and you start looking for a smaller state. Space is the number of states you store plus the recursion depth. This formula survives the conversion to bottom-up tabulation completely unchanged, which is why counting states is the analysis worth doing first — before writing any code, it tells you whether the approach is viable at all.",
    variants: [
      {
        name: "Top-down memoisation",
        when: "The default, and the right first move in an interview.",
        delta:
          "Write the recursion, add a cache. Only computes states that are actually reachable, which can be far fewer than the full table.",
      },
      {
        name: "Bottom-up tabulation",
        when: "Depth would overflow the stack, or you want to drop the recursion overhead.",
        delta:
          "Fill a table in dependency order with loops. Same complexity, no stack risk, and it exposes the opportunity to keep only the last row or two.",
      },
      {
        name: "Decorator-based caching",
        when: "Prototyping, or a pure function with hashable arguments.",
        delta:
          "`functools.lru_cache` in Python does it in one line. Convenient and easy to misuse — it keys on the arguments, so an unhashable or mutable argument breaks it silently or holds memory forever.",
      },
      {
        name: "Memoising across calls",
        when: "The same sub-problems recur between top-level invocations.",
        delta:
          "Hoist the cache outside the function. Now correctness depends on the cached values still being valid, which turns a local optimisation into a cache-invalidation problem.",
      },
    ],
    tradeoffs: [
      {
        vs: "Bottom-up tabulation",
        pick: "Memoisation to get it right, tabulation to ship it",
        because:
          "Memoisation follows the problem's own structure, so it is easier to write correctly and it skips unreachable states. Tabulation has no stack limit, less function-call overhead, and makes space optimisation visible. Writing the memoised version first and converting is a reliable path; going straight to a table is where people get the loop order wrong.",
      },
      {
        vs: "Recomputing without a cache",
        pick: "Cache as soon as any sub-problem repeats",
        because:
          "If the recursion tree has no repeated nodes — merge sort, for example — memoisation adds memory and lookup cost for nothing. The technique pays off exactly when sub-problems overlap, so check that they do before reaching for it.",
      },
      {
        vs: "A bigger cache",
        pick: "A smaller state",
        because:
          "When the state space is too large, the fix is almost never more memory. It is noticing that part of the state does not actually affect the answer, or can be derived from the rest. Shrinking the state from (i, j, k) to (i, j) divides the work by the range of k.",
      },
    ],
  },
  realWorld: [
    {
      system: "Build systems and incremental compilers",
      kind: "industry",
      problem:
        "Rebuilding every file on every change is unusable at scale, and most files have not changed.",
      applied:
        "A build is a recursive question — 'what does this target depend on?' — with massive overlap, since many targets share dependencies. Bazel and similar tools memoise on a content hash of the inputs, so an unchanged sub-tree is a cache hit. The cache key is the full state, which here means every input that can affect the output.",
      impact: "Full rebuild → only the affected sub-graph",
    },
    {
      system: "React's useMemo and reconciliation",
      kind: "industry",
      problem:
        "Recomputing derived values and re-rendering unchanged sub-trees on every state change wastes work proportional to the size of the whole UI.",
      applied:
        "Memoise on the dependency array — the state the result depends on. The classic bug is exactly the classic memoisation bug: an incomplete dependency list is a partial cache key, and it returns a stale value that looks plausible.",
    },
    {
      system: "Query planners and CTE materialisation",
      kind: "industry",
      problem:
        "A sub-query referenced several times in one statement would otherwise be executed several times.",
      applied:
        "The planner recognises the repeated sub-plan and materialises it once. This is memoisation with the sub-plan as the cache key, and the same trade applies: materialising costs memory and only pays off when the sub-plan genuinely repeats.",
    },
    {
      system: "traed — indicator and backtest sub-results",
      kind: "yours",
      problem:
        "Several strategies over the same symbol and timeframe each recompute the same indicator series, and parameter sweeps recompute overlapping windows many times.",
      applied:
        "Cache keyed on the full state — symbol, timeframe, indicator, parameters, and the data version. Dropping the data version from the key is the mistake that produces a fast, confident, wrong backtest.",
      impact: "Repeated identical computation → one computation per distinct state",
    },
  ],
  lab: {
    prompt:
      "Count the number of distinct ORDERED ways to climb exactly `n` stairs when each move may be any of the given `steps`. For n = 4 with steps [1,2] the answer is 5. Return the count modulo 1,000,000,007, because the true numbers get astronomically large. Without memoisation this is exponential and the complexity gate will not finish — which is the point of the exercise. Budget: O(n × steps).",
    fnName: "waysToClimb",
    signature: "waysToClimb(n: number, steps: number[]): number",
    starter: `const MOD = 1000000007;

function waysToClimb(n, steps) {
  // Budget: O(n × steps.length).
  // The recursion: to reach n, you arrived from n - s for some step s.
  // Base cases: exactly 0 remaining is ONE valid way (you are done);
  // overshooting is zero ways.
  // Without a cache this recomputes the same values exponentially often.

  return 0;
}`,
    tests: [
      { name: "zero stairs — one way, do nothing", input: [0, [1, 2]], expected: 1 },
      { name: "one stair", input: [1, [1, 2]], expected: 1 },
      { name: "two stairs", input: [2, [1, 2]], expected: 2 },
      { name: "four stairs, steps 1 and 2", input: [4, [1, 2]], expected: 5 },
      { name: "four stairs, steps 1, 2 and 3", input: [4, [1, 2, 3]], expected: 7 },
      {
        name: "unreachable — odd target with only 2-steps",
        input: [3, [2]],
        expected: 0,
        hidden: true,
      },
      {
        name: "exactly reachable with one step size",
        input: [4, [2]],
        expected: 1,
        hidden: true,
      },
      {
        // Fibonacci in disguise: ways(10) with steps [1,2] is fib(11).
        name: "ten stairs",
        input: [10, [1, 2]],
        expected: 89,
        hidden: true,
      },
    ],
    hints: [
      "Write the plain recursion first: `ways(rem)` returns 1 when `rem` is 0, returns 0 when `rem` is negative, and otherwise sums `ways(rem - s)` over every step `s`.",
      "Now add the cache. A `Map` keyed by `rem` is enough here, because `rem` is the entire state — nothing else affects the answer.",
      "Check the cache with `.has()`, not by testing whether the value is truthy. A stored answer of 0 is a real answer, and `if (cache.get(rem))` would recompute those states every single time.",
    ],
    solution: `const MOD = 1000000007;

function waysToClimb(n, steps) {
  // \`rem\` is the whole state: nothing else affects the answer.
  const memo = new Map();

  function ways(rem) {
    if (rem === 0) return 1;    // arrived exactly — one complete way
    if (rem < 0) return 0;      // overshot — not a way at all
    // .has(), not truthiness: 0 is a real cached answer.
    if (memo.has(rem)) return memo.get(rem);

    let total = 0;
    for (const s of steps) {
      total = (total + ways(rem - s)) % MOD;
    }
    memo.set(rem, total);
    return total;
  }

  return ways(n);
}`,
    complexityGate: {
      target: "O(n)",
      // Deliberately capped well below the stack limit. Memoisation fixes the
      // TIME, not the depth — a chain of n dependent states is still n nested
      // calls, and runtimes overflow somewhere around ten thousand frames.
      // Beyond this size the honest answer is bottom-up tabulation.
      gen: "(n) => [n, [1, 2, 3]]",
      sizes: [400, 800, 1600, 3200],
    },
  },
  insights: [
    {
      t: "Draw the recursion tree to find the redundancy",
      d: "Naive Fibonacci recomputes `fib(3)` exponentially many times. The moment you spot a repeated node in the tree, memoisation is available.",
    },
    {
      t: "Complexity = distinct states × work per state",
      d: "This one formula gives the answer for essentially every memoised recursion, and it survives the conversion to tabulation unchanged. Count the states before you write any code — it tells you whether the approach is viable at all.",
    },
    {
      t: "Memoise on the full state, not part of it",
      d: "If the answer depends on `(i, remaining, holding)`, the key must contain all three. A partial key returns another sub-problem's answer and produces wrong results that look plausible.",
    },
    {
      t: "Memoisation fixes time, not stack depth",
      d: "A chain of n dependent states is still n nested calls. Past roughly ten thousand frames you get a stack overflow, and the fix is to convert to a bottom-up loop.",
    },
    {
      t: "Test for presence, not for truthiness",
      d: "`if (cache[key])` treats a cached 0, false, empty string or null as a miss. Those are real answers, and recomputing them silently undoes the memoisation exactly where the base cases live.",
    },
  ],
  pitfalls: [
    "Caching on a partial state. The answers are wrong rather than slow, and they look reasonable.",
    "Using truthiness to test the cache. Zero and false are valid answers, and treating them as misses reintroduces the exponential blow-up.",
    "Memoising a function that also has side effects. The second call skips the effect, so the behaviour changes depending on cache state.",
    "Using a mutable object as a cache key, or `lru_cache` on a function taking a list. Python raises; JavaScript silently keys on object identity so nothing ever hits.",
  ],
  quiz: [
    {
      q: "Naive recursive `fib(n)` is O(2^n). With memoisation it becomes:",
      options: ["O(n)", "O(n log n)", "O(n^2)", "Still O(2^n)"],
      answer: 0,
      difficulty: "recall",
      why: "There are n distinct states and each costs O(1) once its dependencies are known, so n × O(1) = O(n).",
      distractors: [
        "",
        "There is no sorting and nothing is halved, so no log factor arises.",
        "There is one state per value of n, not one per pair.",
        "The whole point is that repeated sub-problems now cost a lookup rather than a recomputation.",
      ],
    },
    {
      q: "The complexity of a memoised recursion equals:",
      options: [
        "The recursion depth",
        "Number of distinct states × work per state",
        "Branching factor raised to the depth",
        "The size of the input",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Memoisation makes each state's body run exactly once, so summing the per-state work over all reachable states gives the total. Counting states is the whole analysis.",
      distractors: [
        "Depth bounds the stack usage, not the time. A shallow recursion can still have an enormous state space.",
        "",
        "That is the cost WITHOUT memoisation — the size of the full recursion tree.",
        "Only when there happens to be one state per input element. A knapsack has n×W states for an input of size n.",
      ],
    },
    {
      q: "Your memoised solution depends on `(i, remaining)` but you cache on `i` alone. What happens?",
      options: [
        "It is slower",
        "It returns wrong answers — a cached result for one `remaining` is served for a different one",
        "It uses more memory",
        "It throws a key error",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The cache promises 'same state, same answer'. With a partial key, two genuinely different sub-problems collide and the first one's answer is returned for both. The results are plausible and wrong, which is much harder to catch than a crash.",
      distractors: [
        "It is faster, because it does less work. It is doing the wrong work.",
        "",
        "It uses less memory — fewer keys. That is exactly why the bug is tempting.",
        "The key exists and looks valid. Nothing errors.",
      ],
    },
    {
      q: "`if (memo[key]) return memo[key];` where some answers are legitimately 0. What breaks?",
      options: [
        "Nothing",
        "Zero is falsy, so those states are recomputed every time — often reintroducing the exponential cost at the base cases",
        "It throws on missing keys",
        "The cache grows without bound",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The test must be for presence — `.has()` in JavaScript, `in` in Python — not for truthiness. Zero, false, null and the empty string are all real answers that this check treats as cache misses.",
      distractors: [
        "It is correct and can be catastrophically slow, which is the hardest kind of bug to notice in review.",
        "",
        "A missing key gives `undefined`, which is falsy, so the branch simply falls through. No throw.",
        "The cache is fine. It is the reads that are broken.",
      ],
    },
    {
      q: "A memoised recursion is correct at n = 1,000 and crashes at n = 100,000 with a stack overflow. Best fix?",
      options: [
        "Increase the cache size",
        "Convert to bottom-up tabulation — fill the table with loops in dependency order",
        "Add more base cases",
        "Use a faster machine",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Memoisation fixed the time, not the depth. Tabulation computes the same values in the same order with loops instead of nested calls, so there is no stack to overflow — and it usually reveals that only the last row or two needs to be kept.",
      distractors: [
        "The cache is not the constraint. The call stack is.",
        "",
        "Base cases stop the recursion at the bottom; they do not reduce how deep it goes on the way there.",
        "Stack limits are set by the runtime, not by available RAM. A bigger machine changes nothing.",
      ],
    },
    {
      q: "When is memoisation NOT worth adding?",
      options: [
        "When the input is small",
        "When the recursion tree has no repeated sub-problems — merge sort, for example",
        "When the function is recursive",
        "When the answer is a number",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The technique pays off exactly when sub-problems overlap. Merge sort splits into disjoint halves, so no sub-problem ever recurs and a cache would add memory and lookup cost for nothing. Check for overlap before reaching for it.",
      distractors: [
        "Small inputs make it unnecessary rather than harmful, and inputs have a habit of growing.",
        "",
        "Recursion is a precondition for the technique, not a reason against it.",
        "The return type is irrelevant.",
      ],
    },
    {
      q: "Your state space is n × W × K and too large to fit in memory. What is usually the right move?",
      options: [
        "Buy more memory",
        "Look for a part of the state that does not actually affect the answer, or can be derived from the rest",
        "Use a database as the cache",
        "Reduce n",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Shrinking the state divides both the time and the memory by the range of the dimension you removed. This is the highest-leverage move in dynamic programming, and it is almost always available — a dimension that only ever takes two values, or one that is a function of the others.",
      distractors: [
        "It buys a constant factor against a multiplicative problem, and hits a wall almost immediately.",
        "",
        "A network round trip per state is far slower than recomputing it. This makes things worse.",
        "Reducing the input changes the problem rather than solving it.",
      ],
    },
    {
      q: "In an interview you are asked for an optimal solution to a counting problem. What order do you work in?",
      options: [
        "Write the DP table directly",
        "Write the brute-force recursion, confirm it is correct, add memoisation, then convert to a table if needed",
        "Guess the recurrence",
        "Look for a greedy solution first",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Each step is small and checkable, and you have a correct answer at every stage — so if time runs out you still have working code. Going straight to the table is where the loop order and the base cases get wrong, and a wrong table is much harder to debug than a wrong recursion.",
      distractors: [
        "This is where most people lose time. The table's loop order comes FROM the recursion's dependencies, so deriving it without the recursion is guesswork.",
        "",
        "Guessing produces something that passes small cases and fails on the ones you did not try.",
        "Worth a moment's thought, and greedy answers are wrong for most counting problems. Do not spend the interview proving it.",
      ],
    },
  ],
};

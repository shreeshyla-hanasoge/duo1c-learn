import type { Topic } from "../types.ts";

export const dp1d: Topic = {
  id: "dp-1d",
  title: "1D DP",
  tier: 3,
  week: 13,
  depth: "core",
  summary:
    "Climbing stairs, house robber, decode ways — and memo → tabulation.",
  why: "The smallest complete DP. Get the recurrence, base case, and iteration order right here and the harder variants are bookkeeping.",
  complexity: "O(n) time · O(1)–O(n) space",
  learn: {
    intuition:
      "Picture a row of houses along a street and you must choose which to visit, never two next to each other, to collect the most money. The brute-force question is 'which subset do I pick?', and there are 2^n subsets. The dynamic programming question is smaller and stranger: 'standing at house i, what is the best total I could possibly have collected so far?' That number does not care *how* you got there — which earlier houses you took, in what order, nothing. It is a single number per position. And it is buildable, because the best total at house i is either the best total at house i−1 (you skip i) or the best total at house i−2 plus the money in house i (you take i). Two candidates, one comparison, done. The exponential tree collapses because every branch that reaches position i with a lower total is immediately and permanently irrelevant, so you never carry it forward. That is the whole of 1D dynamic programming: find the one number per position that makes the past disposable.",
    mechanics: [
      {
        heading: "Say what dp[i] means, in one English sentence",
        body: "Not 'dp[i] is the answer' — that is not a definition. Something like: `dp[i]` is the largest amount collectable from the first `i` houses. Write this sentence down before any code. Nearly every wrong DP is a correct recurrence attached to a state that was never pinned down, and you cannot debug a recurrence when you are not sure what it is supposed to hold.",
      },
      {
        heading: "Write the recurrence as a choice, not a formula",
        body: "At position `i` you are deciding something. Enumerate the options, and for each one write the earlier state it leaves you in. House robber: take house `i` and land in `dp[i-2]`, or skip it and land in `dp[i-1]`. So `dp[i] = max(dp[i-1], dp[i-2] + money[i])`. Reading it as a choice is what tells you which earlier indices it depends on, and that is the thing you actually need next.",
      },
      {
        heading: "Pin the base cases where the recurrence would read off the end",
        body: "`dp[1]` wants `dp[-1]`, which does not exist. So `dp[0]` and `dp[1]` are set by hand, not by the recurrence. A useful habit is to shift the table by one — make `dp[0]` mean 'zero houses considered' — so that every real position uses the recurrence and there is exactly one hand-written entry. Off-by-one errors in DP nearly all live in this step.",
      },
      {
        heading: "Iterate in an order where every dependency is already filled",
        body: "`dp[i]` reads `dp[i-1]` and `dp[i-2]`, so a plain left-to-right loop works. That is the only thing 'bottom-up' means: an ordering in which nothing is read before it is written. When you cannot find such an order, that is a real signal — either the state is wrong, or the dependency graph has a cycle and dynamic programming is not the right tool.",
      },
      {
        heading: "Shrink the table to the window the recurrence actually reads",
        body: "The recurrence reads two entries back. Everything older is dead weight. Replace the array with two variables that you roll forward each step and the space drops from O(n) to O(1). Do this last, once the array version is correct — the rolling version is much harder to debug, and in an interview the array version is what you should write first and the rolling version is what you should *mention*.",
      },
    ],
    complexityDerivation:
      "The bound comes from one multiplication: number of distinct states × work done per state, not counting recursive calls. Here there are n states — one per position — and each does a fixed amount of work, one addition and one comparison, so the total is O(n). This is worth doing before writing code rather than after, because it is also the feasibility check: if you count the states and get 2^n, no amount of clever coding will save the approach and you need a smaller state. Space splits into two parts that people often conflate. The table itself is O(n), but the recurrence only ever reads two entries back, so the *live* window is O(1) and two rolling variables suffice. If you keep the top-down memoised form instead, add the recursion depth — a chain of n dependent states is n nested calls, and typical runtimes overflow somewhere around ten thousand frames, which is precisely why the bottom-up loop is not just a stylistic preference at large n.",
    variants: [
      {
        name: "Top-down memoisation",
        when: "First draft, and the right thing to say first in an interview.",
        delta:
          "Write the recursion straight from the recurrence, add a cache. Only computes states that are actually reachable, and needs no thought about ordering. Costs stack depth.",
      },
      {
        name: "Bottom-up tabulation",
        when: "The state chain is long enough to threaten the stack, or you want the constant factor.",
        delta:
          "Same recurrence, filled by a loop in dependency order. No stack risk, and it exposes the chance to drop the table.",
      },
      {
        name: "Rolling variables",
        when: "The recurrence reads a fixed, small number of entries back.",
        delta:
          "Keep only that window. O(n) space becomes O(1). The recurrence is unchanged; only where you store it moves.",
      },
      {
        name: "Reconstructing the choice, not just the value",
        when: "The caller needs *which* houses, not how much.",
        delta:
          "Keep the full table — you can no longer roll it — and walk backwards from the end, at each step asking which of the two candidates produced the stored value. O(n) space is now mandatory, which is the trade you are making for the answer being useful.",
      },
    ],
    tradeoffs: [
      {
        vs: "Greedy (always take the biggest remaining house)",
        pick: "Dynamic programming",
        because:
          "Greedy agrees with the optimum on most small examples, which is exactly what makes it dangerous — `[5, 1, 1, 5]`, `[1, 2, 3, 1]` and `[2, 7, 9, 3, 1]` all come out right. The smallest input that separates them is `[8, 9, 8]`: greedy takes the 9, which forbids both 8s, and finishes at 9, while the optimum is 8 + 8 = 16. Greedy needs a proof that a locally best choice is never regretted; no such proof exists here, and one taken house can block two better ones. Dynamic programming needs no such proof because it carries both branches until one is provably dead.",
      },
      {
        vs: "Plain recursion with no cache",
        pick: "Dynamic programming, always, when subproblems repeat",
        because:
          "Identical code, exponentially different cost. The recursion tree for house robber has two children per node and depth n, so it visits about 1.6^n nodes while only n distinct states exist. Every node beyond the first n is recomputing an answer you already had.",
      },
      {
        vs: "Keeping the whole O(n) table",
        pick: "The table, unless memory is genuinely the constraint",
        because:
          "Rolling variables save memory you usually have and cost you the ability to reconstruct the choice or to debug by printing the table. On an interview whiteboard the table is clearer; in a memory-bound loop running per market tick, the two variables win. Say which one you are choosing and why — that sentence is most of what is being assessed.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — non-overlapping entry selection in a backtest",
      kind: "yours",
      problem:
        "A strategy generates candidate entries all through the session, but a cooldown forbids opening a new position within a fixed window of the last one. Picking the highest-scoring candidates greedily can strand a cluster of three good signals because one mediocre earlier signal blocked them.",
      applied:
        "Sort candidates by time, then run the same two-branch recurrence: the best score through candidate `i` is either the best through `i-1` (skip it) or this candidate's score plus the best through the last candidate outside its cooldown window (take it). Because the cooldown boundary moves forward monotonically, that earlier index is found with a pointer that never resets rather than a search.",
      evidence: "strategy-engine/_perf/bench_perday.py",
      impact: "Exponential subset search → O(n) per session",
    },
    {
      system: "TeX line breaking (Knuth–Plass)",
      kind: "industry",
      problem:
        "Breaking a paragraph into lines one line at a time — fill the current line, move on — produces a locally reasonable and globally ugly result, with rivers of white space and a last line holding one word.",
      applied:
        "Treat every possible break point as a position on a line and let `dp[i]` be the lowest total badness for the paragraph up to word `i`. Because badness is summed over lines, the optimum for the whole paragraph is built from optima of prefixes, which is exactly the 1D shape.",
      impact:
        "Greedy per-line filling → globally optimal paragraph, and the reason TeX output still looks better than most browsers'",
    },
    {
      system: "Search query segmentation",
      kind: "industry",
      problem:
        "People type queries with the spaces missing — `bangaloretochennaitrains`, `pmkisanstatuscheck`. The engine has to recover the word boundaries before it can match anything.",
      applied:
        "`dp[i]` is true when the first `i` characters split cleanly into dictionary words. For each `i`, look back over the possible last words and check whether the remaining prefix was already reachable. Scoring by word frequency instead of a boolean turns 'is there a split' into 'what is the most likely split', with no change to the shape.",
      impact:
        "2^n candidate splittings → O(n · L) with L the longest dictionary word",
    },
    {
      system: "Kadane's algorithm in latency monitoring",
      kind: "industry",
      problem:
        "Finding the worst sustained stretch in a latency series — not the worst single spike, which is usually one unlucky garbage collection, but the contiguous window where the service was genuinely degraded.",
      applied:
        "Score each sample as its deviation from the baseline, then find the maximum-sum contiguous run. `best_ending_here[i] = max(score[i], best_ending_here[i-1] + score[i])` is a 1D DP with a two-candidate choice, exactly the house-robber shape with a different recurrence: extend the current run, or start fresh here.",
      impact: "O(n^2) over all windows → O(n) in one pass, O(1) space",
    },
  ],
  lab: {
    prompt:
      "A street has `n` houses, each holding some non-negative amount of money. You may not take from two adjacent houses. Return the largest total you can collect. Budget: O(n) time. Aim for O(1) extra space once it works — but get it correct with an array first.",
    fnName: "rob",
    signature: "rob(money: number[]): number",
    starter: `function rob(money) {
// Your budget: O(n) time.
// dp[i] = the most collectable from the first i houses.
// At house i you have two options. Write both, take the max.

return 0;
}`,
    tests: [
      {
        name: "skip the middle, take both ends",
        input: [[1, 2, 3, 1]],
        expected: 4,
      },
      {
        // 2 + 9 + 1 = 12 beats 7 + 3 = 10. A solution that only ever
        // considers alternate houses starting at 0 gets 12 here by luck.
        name: "three non-adjacent houses",
        input: [[2, 7, 9, 3, 1]],
        expected: 12,
      },
      {
        // Taking the two ENDS beats taking the two middles.
        name: "the two ends win",
        input: [[5, 1, 1, 5]],
        expected: 10,
      },
      {
        // 10 + 2 = 12, taken from indices 1 and 4. Reaching it requires
        // skipping index 2 and index 3, so a solution that only looks one
        // step back rather than two lands on 11.
        name: "a large house between small ones",
        input: [[3, 10, 3, 1, 2]],
        expected: 12,
      },
      {
        // Greedy takes 9 first, which blocks 8 and 8 — it ends with
        // 9 + 1 = 10. Optimum is 8 + 8 = 16. This is the test that
        // separates dynamic programming from "take the biggest".
        name: "greedy loses here",
        input: [[8, 9, 8]],
        expected: 16,
      },
      { name: "no houses", input: [[]], expected: 0, hidden: true },
      { name: "one house", input: [[7]], expected: 7, hidden: true },
      {
        // All zeros must return 0, not undefined. Catches a solution that
        // tests the running best with `if (x)` instead of comparing.
        name: "all zeros",
        input: [[0, 0, 0]],
        expected: 0,
        hidden: true,
      },
    ],
    hints: [
      "Define it out loud first: `dp[i]` is the most money collectable considering only the first `i` houses. Then ask what the two options are at house `i`.",
      "Take house `i`: you add `money[i]` to the best you could do up to house `i-2`, because `i-1` is now forbidden. Skip house `i`: you keep the best up to `i-1`. `dp[i] = max(dp[i-1], dp[i-2] + money[i])`.",
      "For O(1) space, notice the recurrence only ever reads two entries back. Keep `prev` (the value at `i-1`) and `prev2` (the value at `i-2`), and roll them forward each step. Update in the right order or you will use the new `prev` as if it were the old one.",
    ],
    solution: `function rob(money) {
// prev2 = best through house i-2, prev = best through house i-1.
// Both start at 0: with no houses considered, you have nothing.
let prev2 = 0;
let prev = 0;

for (let i = 0; i < money.length; i++) {
  // Take house i (add to prev2, since i-1 is forbidden), or skip it.
  const best = Math.max(prev, prev2 + money[i]);
  prev2 = prev;   // roll BEFORE overwriting prev, or prev2 gets the new value
  prev = best;
}

return prev;
}`,
    complexityGate: {
      target: "O(n)",
      // Sizes stop at 3200 deliberately. A reader's first working answer is
      // very often top-down memoised recursion, and a chain of n dependent
      // states is n nested calls — runtimes overflow near ten thousand
      // frames. Gating past that would reject a correct solution with a
      // stack overflow, which reads as a broken lab rather than a rule.
      //
      // The values cycle rather than climb: on a sorted array the answer is
      // just "every other house from the end", which a wrong solution can
      // stumble into.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 37) % 101)]",
      sizes: [400, 800, 1600, 3200],
    },
  },
  insights: [
    {
      t: "Write the recurrence in English before any code",
      d: "`dp[i] = f(dp[i−1], dp[i−2], …)`. If you cannot say in one sentence what `dp[i]` holds, the code will not rescue you — you will be debugging a formula whose meaning was never fixed.",
    },
    {
      t: "Tabulation just reverses the dependency order",
      d: "Memoised recursion computes top-down on demand. Tabulation computes bottom-up so every dependency is ready before it is read. Same recurrence, same complexity, no call stack.",
    },
    {
      t: "Most 1D DPs collapse to O(1) space",
      d: "If `dp[i]` depends only on the last two entries, keep two variables. That is the difference between an O(n) array and none at all — but do it after the array version is correct, not instead of it.",
    },
    {
      t: "Complexity is states × work per state",
      d: "n positions × O(1) work = O(n). Count the states before writing code: it is the feasibility check, and it is also the answer to 'what is the complexity?' before you have run anything.",
    },
    {
      t: "The base case is wherever the recurrence would read off the end",
      d: "`dp[1]` wants `dp[-1]`. Shifting the table so `dp[0]` means 'nothing considered yet' usually reduces the hand-written cases to one and removes an entire class of off-by-one bugs.",
    },
  ],
  pitfalls: [
    "Rolling the two variables in the wrong order, so `prev2` receives the value just computed instead of the previous one. Every test with fewer than three houses still passes.",
    "Using truthiness to guard the table — `if (dp[i])` — when 0 is a legitimate answer. All-zero input silently recomputes forever, or returns undefined.",
    "Reaching for greedy because the first two examples happen to agree with it. `[8, 9, 8]` is the smallest case that separates them.",
    "Keeping the top-down memoised form at large n. Memoisation fixes the time, not the stack depth, and the failure is a crash rather than a slow answer.",
  ],
  quiz: [
    {
      q: "House robber: `dp[i] = max(dp[i−1], dp[i−2] + nums[i])`. What space does it really need?",
      options: [
        "O(n) — you need the whole table",
        "O(1) — only the previous two values matter",
        "O(log n)",
        "O(n²)",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The recurrence reads exactly two entries back, so the live window is two values. Two rolling variables replace the whole array.",
      distractors: [
        "Only if you need to reconstruct *which* houses were chosen. For the total alone, everything older than two steps back is never read again.",
        "",
        "Nothing here halves or is searched — a logarithm has no way to appear in this recurrence.",
        "That is the size of a two-dimensional table. This DP has one index, so its table is one-dimensional at worst.",
      ],
    },
    {
      q: "Converting a memoised recursion to tabulation requires:",
      options: [
        "A different recurrence",
        "Iterating states in an order where every dependency is already computed",
        "More memory",
        "Removing the base cases",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The recurrence is unchanged. Only the evaluation order changes — from on-demand to dependency-first.",
      distractors: [
        "The recurrence is the one thing that survives the conversion untouched. If you had to change it, one of the two versions is solving a different problem.",
        "",
        "Usually the reverse: tabulation drops the call stack, and often lets you roll the table down to a couple of variables.",
        "The base cases survive too — they become the entries you fill by hand before the loop starts.",
      ],
    },
    {
      q: "You define `dp[i]` as 'the best total ending exactly at house i' instead of 'the best total considering the first i houses'. What happens?",
      options: [
        "Nothing — the two definitions are equivalent",
        "The recurrence still works but the final answer is `max(dp)`, not `dp[n−1]`",
        "The recurrence becomes impossible to write",
        "It doubles the space requirement",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Both definitions are valid states; they just answer different questions. 'Ending exactly at i' means the last house is taken, so the overall best could end anywhere and you must scan the table. Returning dp[n−1] with this definition silently forces the last house to be taken.",
      distractors: [
        "They differ precisely at the end. 'Considering the first i' is monotone and its last entry is the answer; 'ending exactly at i' is not monotone and its last entry is only the answer if the last house happens to be in the optimum.",
        "",
        "It is perfectly writable — `dp[i] = nums[i] + max(dp[0..i−2])`, which is a valid if slower recurrence. The definition is not the problem; forgetting how to read the answer out of it is.",
        "Space is unaffected. Both are one entry per position.",
      ],
    },
    {
      q: "Which input shows that 'always take the largest remaining house' is not optimal?",
      options: ["[5, 1, 1, 5]", "[8, 9, 8]", "[1, 2, 3, 1]", "[2, 7, 9, 3, 1]"],
      answer: 1,
      difficulty: "apply",
      why: "Greedy takes 9, which forbids both 8s, and finishes at 9. Dynamic programming takes 8 + 8 = 16. It is the smallest case where one locally attractive choice destroys two better ones — and the reason a rule of thumb that passes your first three examples still needs a proof.",
      distractors: [
        "Greedy takes a 5, is blocked from its neighbour, takes the other 5, and reaches 10 — which is optimal. This case does not separate them.",
        "",
        "Greedy takes the 3, which leaves only the 1 at index 0 available, reaching 4 — which is optimal. It agrees here.",
        "Greedy takes 9, then the 2 and the 1 at the untouched ends, reaching 12 — which is optimal. A longer array is not automatically a harder one for greedy.",
      ],
    },
    {
      q: "Your memoised `rob` is correct on every test but throws `Maximum call stack size exceeded` at n = 50,000. The fix is:",
      options: [
        "Add more memoisation",
        "Convert it to a bottom-up loop",
        "Increase the cache size",
        "Switch to a greedy algorithm",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Memoisation fixes the time, not the depth. A chain of n dependent states is still n nested calls, and runtimes overflow near ten thousand frames. Filling the same recurrence with a loop removes the stack entirely.",
      distractors: [
        "The cache is already doing its job — that is why it is fast enough to reach house 50,000 before dying. The crash is about frames, not repeated work.",
        "",
        "The cache holds n entries and n entries fit comfortably in memory. The limit being hit is the call stack, which is a separate and far smaller region.",
        "That trades a crash for a wrong answer, which is worse. Greedy is not optimal here at any n.",
      ],
    },
    {
      q: "The houses are arranged in a CIRCLE, so the first and last are adjacent. The cleanest fix is:",
      options: [
        "Add a check that rejects taking both ends",
        "Run the linear solver twice — once excluding the last house, once excluding the first — and take the larger",
        "Use a 2D table indexed by position and 'took the first house'",
        "Sort the houses first",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The circle adds exactly one constraint: houses 0 and n−1 cannot both be taken. Any optimum therefore omits at least one of them, so solving the two linear problems that omit each in turn covers every possibility, at twice the cost and no new code.",
      distractors: [
        "A check at the end cannot repair it. By the time you notice both ends were taken, the choices in between were made under the wrong assumption, and there is no local edit that recovers the true optimum.",
        "",
        "This works and is what many people reach for, but it doubles the state for a constraint that only touches two positions. Reducing a new problem to two calls of a solver you already trust is both less code and easier to argue is correct.",
        "Sorting destroys adjacency, which is the entire constraint. After sorting, 'not adjacent' refers to positions that no longer mean anything.",
      ],
    },
    {
      q: "You need to return WHICH houses were robbed, not just the total. What changes?",
      options: [
        "Nothing — read it off the rolling variables",
        "You must keep the full O(n) table and walk backwards from the end",
        "You need a second DP pass",
        "It becomes an O(n²) problem",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The rolling variables threw away everything needed to answer 'why'. With the full table you walk backwards asking, at each i, whether dp[i] equals dp[i−1] (skipped) or dp[i−2] + nums[i] (taken), which reconstructs the set in O(n).",
      distractors: [
        "The two variables hold values, not decisions, and the values of every position before i−2 have been overwritten. This is exactly the cost of the space optimisation, and naming it is the point of the question.",
        "",
        "One backward walk over the existing table is enough. A second forward DP would recompute what the first already stored.",
        "The backward walk is a single linear pass. Nothing here compares all pairs.",
      ],
    },
    {
      q: "In a design review, which sentence best justifies dynamic programming over recursion for this problem?",
      options: [
        "It is faster",
        "The recursion tree has about 1.6^n nodes but only n distinct states, so every node past the first n is recomputing a known answer",
        "Recursion is bad practice",
        "It uses less memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The justification has to name the redundancy and quantify it. 'States are few, calls are many' is the argument; the speed-up is its consequence, not its reason.",
      distractors: [
        "True, but it is the conclusion rather than the reason, and it invites the obvious follow-up you would then have no answer to: faster by how much, and why?",
        "",
        "Recursion is fine, and the memoised top-down version is recursion. What is bad is recursion without a cache over overlapping subproblems.",
        "It generally uses more — a cache of n entries where naive recursion holds only the current path. Memory is the cost you pay here, not the benefit.",
      ],
    },
  ],
};

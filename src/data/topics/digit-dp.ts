import type { Topic } from "../types.ts";

export const digitDp: Topic = {
  id: "digit-dp",
  title: "Digit DP",
  tier: 3,
  week: 17,
  depth: "core",
  summary: "Counting numbers in a range with a digit property.",
  why: 'Rare, but the one technique for "how many numbers below N satisfy P" that does not involve iterating to N.',
  complexity: "O(digits · states)",
  learn: {
    intuition:
      "How many numbers from 0 to a billion have digits summing to 20? Counting them one at a time is a billion steps for an answer that is only a few million. The way out is to stop thinking of a number as a value and start thinking of it as a *string of digit choices* made left to right. You are filling in eight slots, choosing 0 to 9 for each, and the only thing that stops you choosing freely is the upper bound. Here is the key observation: that bound stops mattering the moment you go below it. If the limit is 5,382,917 and your first digit is 4, then every remaining digit is completely unconstrained — you already know the whole number is smaller, no matter what follows. Only if you have matched the bound digit for digit so far does the next digit have a ceiling. So there are really just two situations to track, and 'still exactly matching the bound' is a single boolean. That boolean is called `tight`, and it is what turns a billion numbers into a few hundred states: ten digit positions, times two values of `tight`, times however many values your property needs to remember.",
    mechanics: [
      {
        heading: "Turn the bound into a digit array and choose left to right",
        body: "`5382917` becomes `[5, 3, 8, 2, 9, 1, 7]`. Now you are filling seven slots. Position 0 is the most significant, and the recursion moves rightwards. Everything about this technique follows from that reframing — the value has stopped being a number and become a sequence of decisions.",
      },
      {
        heading: "`tight` is the whole trick",
        body: "`tight` is true when every digit chosen so far exactly equals the bound's digit in that position. If it is true, the digit you may place now runs from 0 to `bound[pos]`. If it is false, it runs from 0 to 9 with no constraint. And notice the asymmetry: once you place a digit strictly less than `bound[pos]`, `tight` becomes false and stays false forever. It never comes back. That one-way collapse is why the state count is tiny.",
      },
      {
        heading: "Memoise only the states where `tight` is false",
        body: "This detail catches almost everyone. When `tight` is true, there is exactly one path that reaches that state — the prefix must literally be the bound's prefix — so caching it saves nothing and, worse, the cached value is only correct for that one bound. When `tight` is false the remaining digits are unconstrained, so the answer depends purely on the position and your property's state, and it is safe to reuse. Caching a tight state and then reusing it under a different bound is the classic silent wrongness here.",
      },
      {
        heading: "Carry only what the property needs",
        body: "The state is `(position, tight, whatever your property must remember)`. For a digit sum, that third part is the running total. For 'no two adjacent digits equal', it is the previous digit. For 'divisible by k', it is the remainder so far, which is the standard trick for divisibility because a remainder needs only k values instead of the full number. Keep this part as small as possible — it multiplies the state count directly, and it is the only part that can make the technique unaffordable.",
      },
      {
        heading: "Count in [0, N], then subtract for a range",
        body: "`count(L, R) = f(R) - f(L-1)`. Always reduce to prefix counting rather than writing a two-bounded version with both a lower and an upper `tight` flag — that doubles the state and doubles the ways to get it wrong. The one detail to be careful of is leading zeros: if your property treats `007` differently from `7`, you need a `started` flag too, and forgetting it is the second most common bug in this family.",
      },
    ],
    complexityDerivation:
      "The state is (position, tight, property state). Position runs over the number of digits, which is log₁₀(N) — about ten for a number up to a billion. `tight` has two values. The property state has whatever size your property needs: a digit sum up to 9 × 10 = 90 values, a remainder modulo k needs k values, a previous digit needs ten. Each state tries at most ten digits. So the total is O(digits × 2 × P × 10), which for a digit sum over a ten-digit bound is roughly ten times ninety times ten, or nine thousand operations. Against the ten billion you would spend counting one at a time, that is the entire point of the topic. The bound to quote is O(log N) with respect to N, and that logarithm is where the technique earns its keep — the input is the *number of digits*, not the value, so this is one of the few places in dynamic programming where a bound that looks unhelpfully small is honestly achieved. It is worth contrasting this with knapsack, which is pseudo-polynomial precisely because it is linear in a value rather than in its digit count. Digit DP is what pseudo-polynomial algorithms look like when someone has done the reframing properly.",
    variants: [
      {
        name: "Digit sum or digit count properties",
        when: "'Sums to S', 'contains exactly k sevens'.",
        delta:
          "The carried state is a running total or count. Bound it — a sum above the target can be abandoned immediately, which prunes a large part of the table.",
      },
      {
        name: "Divisibility",
        when: "'How many multiples of k in this range satisfy P'.",
        delta:
          "Carry the remainder rather than the value: `rem = (rem * 10 + digit) % k`. That is what keeps the state at k values instead of unbounded.",
      },
      {
        name: "Adjacent-digit constraints",
        when: "'No two equal digits in a row', 'digits non-decreasing'.",
        delta:
          "Carry the previous digit, so the state gains a factor of ten. Also needs a `started` flag, because leading zeros are not really digits.",
      },
      {
        name: "Two-bounded range without subtraction",
        when: "You genuinely cannot evaluate f(L−1) — for instance L is 0 and the property misbehaves.",
        delta:
          "Two flags, `tightLow` and `tightHigh`. Four times the state and considerably more care. Almost always worse than the subtraction; know it exists and prefer not to use it.",
      },
    ],
    tradeoffs: [
      {
        vs: "Just iterating from 0 to N",
        pick: "Iteration below roughly a million, digit DP above it",
        because:
          "A loop is three lines and obviously correct, and a million iterations is a few milliseconds. Digit DP is thirty lines with two subtle traps — memoising tight states, and leading zeros. The crossover is not about elegance: below a million the loop is the better engineering answer and saying so is the right call. Above about 10^9 the loop is simply not an option and the DP is the only technique that works.",
      },
      {
        vs: "A closed-form combinatorial formula",
        pick: "The formula when the property is simple enough to admit one",
        because:
          "'How many numbers below 10^k have no digit 7' is 9^k — instant, exact, no code. Digit DP is what you reach for when the property resists that: digit sums, divisibility, adjacency constraints. Trying the combinatorics first is worth two minutes, because when it works it is unbeatable, and when it fails you have understood the property better before writing the DP.",
      },
      {
        vs: "Precomputing a table of answers",
        pick: "Precomputation when the bound varies but the property does not",
        because:
          "If you will ask the same property against thousands of different bounds, the property-only part of the table — the states with `tight` false — is identical for every query and can be computed once. Each query then walks the bound's digits and reads precomputed totals, which is O(digits) per query with no recursion at all. This is exactly what a database does when it builds a histogram once and answers many range predicates against it.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — counting valid strikes across a wide range",
      kind: "yours",
      problem:
        "Working out how many strikes exist between two prices means walking the ladder, and the ladder is generated by stepping through the range. For a wide range on an index with a small step that is a lot of iteration to answer a question that is really just arithmetic on the bounds.",
      applied:
        "Counting how many values in `[low, high]` satisfy a digit or step rule is prefix counting: evaluate at `high`, evaluate at `low - 1`, subtract. Where the rule is a plain step it collapses to a division; where it involves the digits themselves — round-number strikes attracting more open interest, for instance — it is exactly this table.",
      impact: "O(range) enumeration → O(digits) per query",
    },
    {
      system: "Query planner selectivity estimation",
      kind: "industry",
      problem:
        "Before choosing a plan, the optimiser must estimate how many rows `WHERE id BETWEEN 1000000 AND 5000000` will return. Counting them means running the query, which is what it is trying to avoid.",
      applied:
        "Estimation over a numeric range is prefix counting: rows below the high bound minus rows below the low bound, read from a histogram rather than from the data. The subtraction structure is identical to digit DP's, and it is why every range estimate in every planner is built from two prefix lookups rather than one range lookup.",
      impact: "Row estimates in microseconds instead of a scan",
    },
    {
      system: "Identifier series capacity planning",
      kind: "industry",
      problem:
        "A registration authority issuing vehicle numbers or taxpayer identifiers needs to know how many valid codes remain in a series before it is exhausted, given format rules that exclude certain digit patterns.",
      applied:
        "'How many strings in this range satisfy the format' is the counting problem this technique exists for, and the answer decides when a new series must be opened. Enumerating the space is infeasible once the format is more than a few characters wide, and getting the count wrong means either a premature migration or an outage at the moment the series runs dry.",
      impact:
        "A number that can be computed on demand rather than estimated from the issuance rate",
    },
    {
      system: "Choosing shard split points",
      kind: "industry",
      problem:
        "Splitting a key range across shards evenly requires knowing how many keys fall in each candidate half, when keys are structured identifiers rather than uniformly distributed integers.",
      applied:
        "Count keys below a candidate split point, compare against half the total, and binary search the split. Each count is a prefix count over the key format — the digit-DP shape — so the whole search costs a handful of digit walks instead of a scan of the keyspace.",
      impact: "Balanced splits without reading the data being split",
    },
  ],
  lab: {
    prompt:
      "Return how many integers in the inclusive range [0, n] have digits summing to exactly `target`. Note that 0 counts, and its digit sum is 0. Budget: O(digits of n) — a loop from 0 to n is correct and will fail the gate.",
    fnName: "countDigitSum",
    signature: "countDigitSum(n: number, target: number): number",
    starter: `function countDigitSum(n, target) {
// Your budget: O(number of digits), NOT O(n).
// Turn n into an array of digits and choose them left to right.
// Track whether the prefix so far still exactly matches n — if it does
// not, every remaining digit is free.

return 0;
}`,
    tests: [
      {
        // 2, 11, 20.
        name: "small range",
        input: [20, 2],
        expected: 3,
      },
      {
        // 1, 10, 100 — the bound itself is included.
        name: "the bound itself counts",
        input: [100, 1],
        expected: 3,
      },
      {
        // Only 0 has digit sum 0. A solution that starts counting at 1
        // returns 0 here.
        name: "zero counts, and its digit sum is 0",
        input: [9, 0],
        expected: 1,
      },
      {
        // 4 and 13. Requires the tight flag: at position 0 you may pick 0
        // or 1; picking 0 frees the second digit, picking 1 caps it at 3.
        name: "tight matters",
        input: [13, 4],
        expected: 2,
      },
      {
        // Only 999 itself.
        name: "maximum possible digit sum",
        input: [999, 27],
        expected: 1,
      },
      { name: "n is zero", input: [0, 0], expected: 1, hidden: true },
      {
        // Unreachable target for a single digit.
        name: "target impossible in range",
        input: [7, 9],
        expected: 0,
        hidden: true,
      },
      {
        // Big enough that iterating is visibly the wrong idea.
        name: "six digits",
        input: [100000, 5],
        expected: 126,
        hidden: true,
      },
    ],
    hints: [
      "Convert `n` to a string of digits. You are now choosing digits left to right, and the answer is a count of complete choices whose digits sum to `target`.",
      "Carry a boolean `tight`, true while every digit chosen so far equals n's digit at that position. When `tight` is true the next digit may only go up to `digits[pos]`; when it is false it may go 0 to 9. Placing anything below `digits[pos]` turns `tight` off permanently.",
      "Memoise on `(pos, sumSoFar)` but ONLY when `tight` is false. A tight state is reached by exactly one prefix, so caching it saves nothing — and the cached value would be wrong for any other bound.",
    ],
    solution: `function countDigitSum(n, target) {
if (n < 0 || target < 0) return 0;

const digits = String(n).split('').map(Number);
const len = digits.length;

// Cache only the states where tight is false: those depend on nothing
// but (pos, sum), because every remaining digit is unconstrained.
// A tight state is reachable by exactly one prefix, so caching it
// would save nothing and would be wrong under any other bound.
const memo = new Map();

function go(pos, sum, tight) {
  if (sum > target) return 0;            // can only grow — abandon early
  if (pos === len) return sum === target ? 1 : 0;

  if (!tight) {
    const key = pos * 1000 + sum;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
  }

  // Tight means the prefix still matches n exactly, so this digit is
  // capped. Otherwise it is free.
  const cap = tight ? digits[pos] : 9;
  let total = 0;
  for (let d = 0; d <= cap; d++) {
    // Staying tight requires picking the cap digit itself.
    total += go(pos + 1, sum + d, tight && d === cap);
  }

  if (!tight) memo.set(pos * 1000 + sum, total);
  return total;
}

return go(0, 0, true);
}`,
    complexityGate: {
      target: "O(log n)",
      // The honest bound is O(digits), and digits is log10(n) — so against
      // n itself this is logarithmic. That makes the gate genuinely
      // discriminating here: the obvious wrong answer is a loop from 0 to
      // n, which measures ~2x per doubling and blows straight past the
      // 1.50x limit.
      //
      // Sizes step by 4x rather than 2x to cross more digit boundaries;
      // fitExponent is a least-squares fit over log sizes, so unequal
      // steps are fine.
      gen: "(n) => [n, 20]",
      sizes: [100000, 400000, 1600000, 6400000],
    },
  },
  insights: [
    {
      t: "The state is (position, tight, plus your property)",
      d: "`tight` records whether the prefix built so far exactly matches the bound's prefix — which is what constrains the next digit's range. Everything else in the state is whatever your property must remember.",
    },
    {
      t: "Count in [0, N], then subtract",
      d: "Range [L, R] is f(R) − f(L−1). Always reduce to prefix counting: a two-bounded version needs two tight flags, four times the state, and considerably more ways to be wrong.",
    },
    {
      t: "Never memoise a tight state",
      d: "Exactly one prefix reaches it, so the cache saves nothing — and the stored value is only valid for that one bound. Reusing it under another bound is silent, plausible wrongness.",
    },
    {
      t: "`tight` is a one-way door",
      d: "Place any digit below the bound's digit and it is false for the rest of the number, permanently. That collapse from constrained to free is the entire reason the state count is small.",
    },
    {
      t: "Leading zeros need their own flag when the property cares",
      d: "If `007` must not count as having three digits, carry a `started` boolean. Forgetting it is the second most common bug here, after memoising tight states.",
    },
  ],
  pitfalls: [
    "Memoising states where `tight` is true. The answer is cached against one bound and silently reused under another.",
    "Forgetting that 0 is in the range. A loop starting at 1 gets every digit-sum-zero question wrong by exactly one.",
    "Missing the `started` flag when the property distinguishes leading zeros from real digits.",
    "Reaching for digit DP when the bound is small. Below about a million a plain loop is shorter, obviously correct, and fast enough.",
  ],
  quiz: [
    {
      q: "The `tight` flag in digit DP records:",
      options: [
        "Whether the number is even",
        "Whether the prefix built so far exactly matches the bound, restricting the next digit",
        "The digit sum",
        "The recursion depth",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Once the prefix is strictly below the bound, all remaining digits are free — which collapses a huge number of states into one.",
      distractors: [
        "Parity would be part of the property state if the question asked about it, not part of the bound machinery.",
        "",
        "The digit sum is the carried property in one particular problem. `tight` is about the bound and is present regardless of what the property is.",
        "Recursion depth is just the position, which is tracked separately and is not a constraint on anything.",
      ],
    },
    {
      q: "Why must you NOT memoise states where `tight` is true?",
      options: [
        "It would use too much memory",
        "Exactly one prefix reaches a tight state, so the cache saves nothing and the stored value is only valid for that one bound",
        "Tight states are always zero",
        "You should memoise them — it is faster",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A tight state means the prefix literally equals the bound's prefix, so there is one way to reach it and nothing to save. Worse, the value depends on the specific bound, so reusing it for a different N gives a wrong answer that looks entirely plausible.",
      distractors: [
        "The extra entries are a handful — one per position. Memory is not the issue; correctness is.",
        "",
        "Tight states hold perfectly ordinary counts. Nothing about matching the bound makes the count zero.",
        "It is not faster, because each tight state is visited once. It is the standard way this technique produces silently wrong answers.",
      ],
    },
    {
      q: "Counting numbers in [L, R] with a property. The standard approach is:",
      options: [
        "Two tight flags, one for each bound",
        "f(R) − f(L−1), where f counts from 0",
        "Run the DP from L upward",
        "Count in [0, R] and divide",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Prefix counting plus a subtraction. The two-bounded version needs four times the state and is much easier to get wrong.",
      distractors: [
        "This works and is sometimes necessary, but it quadruples the state space and doubles the number of edge cases. It is the fallback, not the standard approach.",
        "",
        "The technique fundamentally counts from zero — 'tight' is defined against an upper bound. There is no natural way to start it partway up.",
        "Division has no meaning here. The count in [0, L−1] is not a fixed fraction of the count in [0, R].",
      ],
    },
    {
      q: "The bound is 5,382,917 and your first chosen digit is 4. What is true of the remaining six digits?",
      options: [
        "They are capped by 3, 8, 2, 9, 1, 7 respectively",
        "They are completely unconstrained — 0 to 9 each — because the number is already below the bound",
        "Only the next one is unconstrained",
        "The choice is invalid",
      ],
      answer: 1,
      difficulty: "apply",
      why: "4 < 5 in the leading position, so every completion is below 5,382,917 regardless of what follows. `tight` becomes false and never returns, which is exactly the collapse that makes the state count small.",
      distractors: [
        "Those caps apply only while still matching the bound digit for digit. Having already gone below, they constrain nothing.",
        "",
        "`tight` is a one-way door: once false it stays false for every remaining position. There is no partial re-tightening.",
        "It is perfectly valid — 4,999,999 is a real number below the bound. Digits below the cap are exactly the choices that free the rest.",
      ],
    },
    {
      q: "You need to count numbers where no two adjacent digits are equal. What does the state gain?",
      options: [
        "Nothing — tight is enough",
        "The previous digit, so the state gains a factor of ten — plus a `started` flag, since leading zeros are not real digits",
        "The count of distinct digits used",
        "A second tight flag",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The constraint compares each digit against the one before it, so the previous digit must be carried. Leading zeros then need their own flag, because 0 followed by 0 in a not-yet-started number is not two adjacent digits.",
      distractors: [
        "`tight` only handles the bound. It carries nothing about the property being counted, and this property genuinely needs history.",
        "",
        "Distinct-digit counting is a different property — it would answer 'uses at most k different digits', not 'no two in a row are equal'.",
        "A second tight flag is for two-bounded ranges. The property here has nothing to do with bounds.",
      ],
    },
    {
      q: "N is 500,000 and you need the count. Digit DP or a plain loop?",
      options: [
        "Digit DP — it is asymptotically better",
        "The loop: half a million iterations is a few milliseconds, and the DP is thirty lines with two subtle traps",
        "Digit DP, because loops do not scale",
        "Neither — precompute a table",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Asymptotics decide at scale, not at half a million. The loop is obviously correct and fast enough, and choosing it deliberately — while naming where the crossover is — is a better answer than reaching for the clever technique.",
      distractors: [
        "It is, and it does not matter here. Reciting the asymptotic without sizing the actual input is the failure mode this question is about.",
        "",
        "Loops scale fine to millions. The honest statement is that they stop scaling around 10^8 or 10^9, which is where this technique becomes the only option.",
        "Precomputation is the right answer for many queries against a fixed property, which was not stated here. For one query it is strictly more work.",
      ],
    },
    {
      q: "Which of these properties CANNOT be handled by carrying a small state?",
      options: [
        "Digit sum equals S",
        "Divisible by 7",
        "The number is prime",
        "No two adjacent digits are equal",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Primality is not determined by any bounded summary of the digits chosen so far — you cannot know whether a prefix leads to a prime without the whole number. Digit sums carry a total, divisibility carries a remainder, adjacency carries the previous digit; primality has no such compression.",
      distractors: [
        "The running total is bounded by 9 × digits, so at most a hundred or so values.",
        "Carry the remainder, updated as `(rem * 10 + d) % 7`. Seven values, which is why divisibility is a standard example here.",
        "",
        "Carry the previous digit — ten values, plus a `started` flag.",
      ],
    },
    {
      q: "You will run the same property against ten thousand different bounds. What changes?",
      options: [
        "Nothing — run the DP each time",
        "The `tight`-false part of the table is identical for every bound, so compute it once and answer each query by walking its digits in O(digits)",
        "Sort the bounds first",
        "Use a two-bounded DP",
      ],
      answer: 1,
      difficulty: "judge",
      why: "States where `tight` is false depend only on (position, property state) — the bound has already stopped mattering. Precomputing them turns each query into a digit walk with no recursion, which is exactly the histogram-then-lookup shape a database uses for range predicates.",
      distractors: [
        "Ten thousand independent runs recompute the same bound-independent table ten thousand times. That table is most of the work.",
        "",
        "Sorting would help if you were sharing work between adjacent bounds, but the shared work here is not between neighbours — it is the same table for all of them, in any order.",
        "The two-bounded variant is for a single range with both ends constrained. It does not help with many separate bounds, and costs four times the state.",
      ],
    },
  ],
};

import type { Topic } from "../types.ts";

export const twoPointers: Topic = {
  id: "two-pointers",
  title: "Two pointers",
  tier: 0,
  week: 2,
  depth: "core",
  summary: "Opposite ends, and fast/slow — turning O(n²) scans into O(n).",
  why: "Whenever a brute-force answer compares every pair, sortedness or a monotone property usually collapses it to a single linear pass.",
  complexity: "O(n)",
  viz: ["two-pointers"],
  learn: {
    intuition:
      "Brute force asks every pair 'are you the answer?' — n²/2 questions. Two pointers works because on a sorted array one comparison answers a question about a whole *group* of pairs at once. Stand at both ends. The sum you can see is simultaneously the largest sum available to the left element and the smallest available to the right one. So whichever end is 'wrong' cannot be part of any answer at all, and you delete it — not from the array, just from consideration. Each step throws away an entire row or column of the pair matrix you never have to build.",
    mechanics: [
      {
        heading: "Park a pointer at each end",
        body: "`lo = 0`, `hi = n - 1`. The window between them is the set of candidates still alive. It only ever shrinks, which is what bounds the running time.",
      },
      {
        heading: "Read the one sum that tells you the most",
        body: "`a[lo] + a[hi]`. Because the array is sorted, this is the maximum sum any pair containing `a[lo]` can reach, and the minimum any pair containing `a[hi]` can reach. One number, two facts.",
      },
      {
        heading: "Discard the end that cannot work",
        body: "Sum too small? Then `a[lo]` paired with the *biggest* thing left still falls short, so `a[lo]` is in no solution — advance `lo`. Too big? Symmetrically, `a[hi]` is in no solution — retreat `hi`. Equal? You are done.",
      },
      {
        heading: "Stop when the pointers meet",
        body: "`lo >= hi` means the candidate set is empty. Using `<=` instead of `<` would let an element pair with itself — a real bug when the target is exactly `2 * a[i]`.",
      },
    ],
    complexityDerivation:
      "Every iteration either advances `lo` or retreats `hi`, and neither ever reverses. Together they can move a combined n steps before meeting, so the loop body runs at most n times — O(n), with no amortised hand-waving needed. Space is O(1): two integers, regardless of input size. Note this is the cost *after* sorting; on unsorted input the O(n log n) sort dominates and a hash set becomes the better tool.",
    variants: [
      {
        name: "Opposite ends",
        when: "Sorted input, and you are looking for a pair meeting a target.",
        delta:
          "The canonical form. Pair sum, container-with-most-water, valid palindrome.",
      },
      {
        name: "Fast / slow (Floyd)",
        when: "Linked structures, or when you need the midpoint in one pass.",
        delta:
          "Both pointers start together; one moves twice as fast. Detects cycles in O(1) space.",
      },
      {
        name: "Same-direction (read / write)",
        when: "Removing or compacting in place.",
        delta:
          "`write` lags `read`; you copy forward only what survives. This is `remove-duplicates` and partition.",
      },
      {
        name: "Three-way partition (Dutch national flag)",
        when: "Three categories, one pass, in place.",
        delta:
          "Three pointers — `lo`, `mid`, `hi`. Powers quicksort's handling of duplicate keys.",
      },
    ],
    tradeoffs: [
      {
        vs: "Hash set (one pass, remember what you have seen)",
        pick: "Hash set when the input is unsorted and you cannot afford to sort",
        because:
          "It is O(n) time without sorting, but costs O(n) space and loses the ability to answer range-shaped questions. Two pointers is O(1) space but needs order.",
      },
      {
        vs: "Binary search per element",
        pick: "Two pointers",
        because:
          "Searching for each complement is O(n log n) total and re-derives from scratch what the previous step already told you. The pointer carries that information forward for free.",
      },
      {
        vs: "Nested loops",
        pick: "Two pointers, once the input is sorted",
        because:
          "O(n²) vs O(n). The nested version only wins when n is tiny enough that the sort dominates and clarity matters more.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — options strike selection",
      kind: "yours",
      problem:
        "Selecting a strike by delta scans the whole option chain, and every ITM/OTM lookup rebuilds a filtered list and re-sorts it.",
      applied:
        "Delta is monotonic in strike for a fixed expiry, so the ladder is effectively sorted by delta. That makes selection a two-pointer / binary-search problem over a monotone property rather than a linear scan.",
      evidence: "strategy-engine/app/services/strike_selection_service.py:250",
      impact: "O(n) scan + O(n log n) re-sort per call → O(log n) probe",
    },
    {
      system: "Quicksort (every standard library)",
      kind: "industry",
      problem:
        "Arrays with many duplicate keys drive classic two-way partitioning to O(n²).",
      applied:
        "Dutch-national-flag three-way partition splits into <, =, > in a single pass using three pointers, so equal keys are settled immediately instead of being re-partitioned.",
      impact: "Quadratic blow-up on duplicate-heavy input → linear per level",
    },
    {
      system: "HTTP range requests / merge phase of merge sort",
      kind: "industry",
      problem:
        "Combining two already-sorted streams without materialising both in memory.",
      applied:
        "One pointer per stream, always advance the one with the smaller front element. This is the same shape as opposite-ends, run in the same direction.",
      impact: "O(n + m) with O(1) extra state per stream",
    },
    {
      system: "Linked-list cycle detection",
      kind: "industry",
      problem:
        "Detecting a loop without a visited set, which would cost O(n) memory.",
      applied:
        "Floyd's fast/slow pointers. The gap closes by exactly one per step, so a meeting inside a cycle is guaranteed.",
      impact: "O(n) memory → O(1)",
    },
  ],
  lab: {
    prompt:
      "Given an array sorted ascending and a target, return the indices `[i, j]` (i < j) of the two values that sum to the target, or `null` if no such pair exists. Do not sort, and do not use a hash map — the array is already sorted, and the point is to exploit that.",
    fnName: "pairSum",
    signature:
      "pairSum(sorted: number[], target: number): [number, number] | null",
    starter: `function pairSum(sorted, target) {
// Your budget: O(n) time, O(1) space.
// Park a pointer at each end and discard the end that cannot work.

return null;
}`,
    tests: [
      {
        name: "basic pair",
        input: [[2, 7, 11, 15], 9],
        expected: [0, 1],
      },
      {
        name: "pair at the ends",
        input: [[1, 3, 4, 8], 9],
        expected: [0, 3],
      },
      { name: "no such pair", input: [[1, 2, 3], 100], expected: null },
      {
        // Target -8 has exactly ONE valid pair. Target 1 would have two
        // (-8+9 and -3+4), and a test with two right answers only
        // checks which one your loop happens to reach first.
        name: "negatives",
        input: [[-8, -3, 0, 4, 9], -8],
        expected: [0, 2],
      },
      { name: "duplicates", input: [[3, 3, 5], 6], expected: [0, 1] },
      {
        // [3,4,7] has no valid pair for 8, but 4+4 does sum to 8 — so a
        // `lo <= hi` bound returns a false positive here.
        name: "must not pair an element with itself",
        input: [[3, 4, 7], 8],
        expected: null,
        hidden: true,
      },
      {
        name: "empty array",
        input: [[], 5],
        expected: null,
        hidden: true,
      },
      {
        name: "single element",
        input: [[5], 5],
        expected: null,
        hidden: true,
      },
    ],
    hints: [
      "Start with `lo = 0` and `hi = sorted.length - 1`, and loop while `lo < hi`.",
      "Compare `sorted[lo] + sorted[hi]` against the target. If the sum is too small, the only useful move is `lo++` — think about why `hi--` would be wrong.",
      "Advancing `lo` is justified because `sorted[lo] + sorted[hi]` is the *largest* sum `sorted[lo]` can reach. If even that is short, `sorted[lo]` belongs to no pair.",
    ],
    solution: `function pairSum(sorted, target) {
let lo = 0;
let hi = sorted.length - 1;
while (lo < hi) {
  const sum = sorted[lo] + sorted[hi];
  if (sum === target) return [lo, hi];
  if (sum < target) lo++;   // a[lo] cannot reach the target with anything left
  else hi--;                // a[hi] overshoots with everything left
}
return null;
}`,
    complexityGate: {
      target: "O(n)",
      // Worst case on purpose: no pair exists, so the pointers must
      // traverse the whole array. A nested-loop solution goes quadratic
      // here even though it passes every correctness test above.
      gen: "(n) => [Array.from({ length: n }, (_, i) => i * 2), 2 * n + 1]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "The move must eliminate a whole class of candidates",
      d: "In pair-sum, advancing `lo` discards every pair involving the smallest element at once. If your pointer move only rules out one candidate, you have written a nested loop with extra steps.",
    },
    {
      t: "Sortedness is the usual precondition",
      d: 'It is what makes "too small → move left up" valid. If the input is not sorted and you cannot sort it, two pointers is probably the wrong tool.',
    },
    {
      t: "Fast/slow is the other family",
      d: "One pointer moving at twice the speed detects cycles, finds the midpoint in one pass, and removes the nth-from-end node — all in O(1) space.",
    },
  ],
  pitfalls: [
    "`lo <= hi` instead of `lo < hi` lets an element pair with itself — bites exactly when the target is `2 * a[i]`.",
    "Applying it to unsorted input. The discard rule has no justification without order.",
    "Sorting inside a loop that already runs per element, turning an O(n) idea into O(n² log n).",
  ],
  quiz: [
    {
      q: "In two-pointer pair-sum on a sorted array, the sum is too small. Why is it correct to advance the left pointer?",
      options: [
        "Because the right element is too large",
        "Because a[lo] paired with the largest remaining element is already too small, so a[lo] cannot be in any solution",
        "Because it keeps the pointers balanced",
        "Because the array is sorted ascending",
      ],
      answer: 1,
      difficulty: "apply",
      why: "a[lo] + a[hi] is the best a[lo] can ever do within the remaining range. If that is still short of the target, a[lo] is unusable and can be discarded entirely.",
      distractors: [
        "Backwards — if the sum is too small, the right element is too small, not too large. Moving hi down would make the sum smaller still.",
        "",
        "There is no balance invariant. The pointers routinely travel very unequal distances.",
        "True but not the reason. Sortedness is the precondition that makes the discard valid; it is not itself the argument for moving lo.",
      ],
    },
    {
      q: "Two pointers on an UNSORTED array to find a pair summing to a target is:",
      options: [
        "Still O(n)",
        "Correct but O(n log n) because of the sort",
        "Generally incorrect — sort first, or use a hash set instead",
        "Correct only for positive numbers",
      ],
      answer: 2,
      difficulty: "recall",
      why: 'Without order, "too small → move left" has no justification. Either sort (O(n log n)) or use a one-pass hash set (O(n) time, O(n) space).',
      distractors: [
        "The loop would still run in linear time, but it would return wrong answers — speed is irrelevant if the result is incorrect.",
        "This describes the fixed version. As written, with no sort, the algorithm is simply wrong.",
        "",
        "Sign has nothing to do with it. The discard rule depends on order, not positivity.",
      ],
    },
    {
      q: "Why is the two-pointer loop O(n) even though it has no obvious 'visit each element once' structure?",
      options: [
        "Because the array is sorted",
        "Because lo only increases and hi only decreases, so their combined movement is bounded by n",
        "Because each iteration does O(1) work",
        "It is actually O(n log n)",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The pointers never reverse. Their combined travel is at most n steps before they meet, which bounds the iteration count directly — no amortised argument needed.",
      distractors: [
        "Sortedness gives correctness, not the time bound. An incorrect algorithm on sorted data could still be O(n²).",
        "",
        "True, but O(1) work per iteration says nothing about how many iterations there are. That is the half you still have to prove.",
        "No log factor appears anywhere — nothing is being halved or sorted inside the loop.",
      ],
    },
    {
      q: "You need pairs summing to a target in a stream you cannot sort. Best tool?",
      options: [
        "Two pointers after an O(n log n) sort",
        "A hash set in one pass — O(n) time, O(n) space",
        "Nested loops",
        "Binary search for each complement",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Streaming rules out sorting. A hash set of already-seen values answers each arrival in O(1), trading O(n) memory for the ability to work without order.",
      distractors: [
        "Sorting requires materialising and reordering the whole stream, which is exactly what 'cannot sort' forbids.",
        "",
        "O(n²) and needs the full input anyway. Correct but the worst option on offer.",
        "Binary search needs sorted data — same blocker as the first option, plus a log factor.",
      ],
    },
    {
      q: "What does `lo <= hi` (instead of `lo < hi`) break in pair-sum?",
      options: [
        "Nothing — the loop just runs one extra iteration",
        "It lets an element pair with itself, returning a false positive when the target is exactly twice that element",
        "It causes an index-out-of-bounds error",
        "It makes the algorithm O(n²)",
      ],
      answer: 1,
      difficulty: "apply",
      why: "When lo === hi you are looking at a single element counted twice. On [1, 5, 9] with target 10, it would report 5 + 5 as a valid pair.",
      distractors: [
        "The extra iteration is precisely the bug — it compares an element with itself.",
        "",
        "Both indices stay in range; the failure is a wrong answer, not a crash. Silent wrongness is the worse outcome.",
        "The loop bound does not change the asymptotic cost, only the correctness.",
      ],
    },
    {
      q: "Container-with-most-water: two pointers at the ends, and the left wall is shorter. Which do you move?",
      options: [
        "The taller wall inward",
        "The shorter wall inward",
        "Whichever is further from the centre",
        "Both inward together",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Area is limited by the shorter wall and the width only shrinks. Keeping the shorter wall means every remaining pairing with it is strictly worse, so it can be discarded — the same 'this end is in no better solution' argument as pair-sum.",
      distractors: [
        "Moving the taller wall can only reduce the height cap or leave it unchanged, while also losing width — it discards possibilities that might have been better.",
        "",
        "Distance from the centre is not what limits the area. Only the shorter wall and the width are.",
        "Moving both risks stepping over the optimum, since you never evaluate the pairings you skipped.",
      ],
    },
    {
      q: "Which of these is NOT a two-pointer problem?",
      options: [
        "Remove duplicates from a sorted array in place",
        "Detect a cycle in a linked list",
        "Find the k-th largest element in an unsorted array",
        "Check whether a string is a palindrome",
      ],
      answer: 2,
      difficulty: "apply",
      why: "K-th largest has no monotone property two pointers can exploit — it is a heap or quickselect problem. The other three are read/write, fast/slow, and opposite-ends respectively.",
      distractors: [
        "This is the read/write variant — `write` lags `read` and copies forward only survivors.",
        "This is fast/slow (Floyd).",
        "",
        "This is opposite-ends: compare, step inward, stop at the middle.",
      ],
    },
    {
      q: "Your pair-sum passes every unit test but fails the O(n) complexity gate. Most likely cause?",
      options: [
        "The tests are too small",
        "You used a nested loop or an indexOf/includes call inside the loop, which is O(n) per step",
        "You forgot to sort",
        "The gate is measuring garbage collection",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A correct-but-quadratic solution is exactly what the gate exists to catch. `indexOf`, `includes`, `filter` or `slice` inside the loop each add a hidden O(n) pass, turning the whole thing into O(n²).",
      distractors: [
        "Test size affects correctness coverage, not the growth curve — the gate runs its own much larger inputs.",
        "",
        "The input arrives sorted; sorting it again would add O(n log n) but would not produce a quadratic curve.",
        "The gate takes the median of repeated runs specifically so one-sided GC spikes do not decide the verdict.",
      ],
    },
  ],
};

import type { Topic } from "../types.ts";

export const binarySearch: Topic = {
  id: "binary-search",
  title: "Binary search",
  tier: 0,
  week: 3,
  depth: "core",
  summary: "On arrays — and, far more importantly, on the answer space.",
  why: "The roadmap gives this double time for a reason. Searching a sorted array is the easy half; recognising that a feasibility question is monotone, and therefore binary-searchable, is the senior skill. 'Find the smallest capacity that still meets the deadline' looks nothing like a search problem until you see it.",
  complexity: "O(log n)",
  viz: ["binary-search", "binary-search-answer"],
  learn: {
    intuition:
      "Binary search is not really about sorted arrays. It is about any question where a single probe lets you throw away half of the remaining possibilities. A sorted array is the most familiar case: you look at the middle, and because everything to the left is smaller, one comparison eliminates half the array. But the same reasoning works whenever you have a yes/no question that flips from no to yes exactly once as some parameter increases. 'Can we ship all the packages in D days with a truck of capacity C?' is false for small C and true for large C, and it never flips back. That means the smallest workable C can be found by probing — and each probe halves the range you still have to consider, even though nothing is sorted and there is no array at all.",
    mechanics: [
      {
        heading: "Establish the range and the question",
        body: "Fix `lo` and `hi` as the smallest and largest candidates. Then state the yes/no question precisely: 'is this candidate good enough?'. Writing the question down as a function is what turns a vague search into a mechanical one.",
      },
      {
        heading: "Check the middle",
        body: "`mid = lo + (hi - lo) / 2`. Written this way rather than `(lo + hi) / 2`, it cannot overflow when both bounds are large — a bug that sat in the JDK's binary search for nine years.",
      },
      {
        heading: "Throw away the half that cannot hold the answer",
        body: "If `mid` satisfies the condition, the answer is `mid` or something smaller, so set `hi = mid` — keeping `mid` as a live candidate. If it does not, the answer must be larger, so `lo = mid + 1`. That asymmetry is the entire template: one side keeps `mid`, the other excludes it.",
      },
      {
        heading: "Stop when the range is a single value",
        body: "Loop `while (lo < hi)`. When it ends, `lo === hi` and that is your answer. Using `lo <= hi` together with `hi = mid` never shrinks the range when `lo` and `hi` are adjacent, and the loop hangs forever.",
      },
      {
        heading: "Confirm the property is really monotone",
        body: "The step people skip. If the condition can go true, then false, then true again, halving is not justified and the algorithm will confidently return a wrong answer. Say out loud why it can only flip once.",
      },
    ],
    complexityDerivation:
      "Each iteration replaces the range with one of its halves, so after k iterations the range has size at most n/2^k. The loop stops when the size reaches 1, which needs n/2^k <= 1, that is 2^k >= n, that is k >= log₂ n. So the number of probes is O(log n), and the base of the logarithm is irrelevant to the class because logs in different bases differ only by a constant factor. Note what the cost actually counts: probes, not time. If evaluating the condition costs O(n) — simulating a delivery schedule, for example — the total is O(n log n), and that is still an enormous win over trying every candidate. The practical size of log n is worth having as a reflex: a million items is 20 probes, a billion is 30. That is why binary search feels like it costs nothing.",
    variants: [
      {
        name: "Lower bound (first element >= target)",
        when: "You want an insertion point, or the first match among duplicates.",
        delta:
          "The template as written. `bisect_left` in Python, `lower_bound` in C++. This is the version worth memorising, because the others are built from it.",
      },
      {
        name: "Upper bound (first element > target)",
        when: "Counting occurrences, or finding where a run of duplicates ends.",
        delta:
          "Same shape with a strict comparison. `upper_bound - lower_bound` gives the number of copies of a value in O(log n).",
      },
      {
        name: "Binary search on the answer",
        when: "The answer is a number in a known range and 'is X good enough?' is monotone.",
        delta:
          "No array at all. Minimum capacity, minimum speed, maximum minimum-distance. The interview-favourite version, and the one that shows up in real capacity planning.",
      },
      {
        name: "Search in a rotated sorted array",
        when: "The array was sorted then rotated at an unknown point.",
        delta:
          "One half of the range is always still sorted; determine which by comparing endpoints, then decide whether the target lies inside it.",
      },
    ],
    tradeoffs: [
      {
        vs: "Linear scan",
        pick: "Linear scan for small n, or when the data is not sorted and you would only search once",
        because:
          "Binary search costs a sort — O(n log n) — if the data is not already ordered. Sorting once to search many times is an excellent trade; sorting once to search once is not. Below roughly 100 elements a linear scan often wins outright on cache behaviour.",
      },
      {
        vs: "Hash map lookup",
        pick: "Hash map for exact-key lookup, binary search for ranges and neighbours",
        because:
          "A hash map is O(1) versus O(log n), which is better for 'is this exact key present'. It cannot answer 'what is the nearest value below this one' or 'how many fall in this range' at all, because hashing throws ordering away.",
      },
      {
        vs: "Interpolation search",
        pick: "Binary search, unless the data is known to be uniformly distributed",
        because:
          "Interpolation guesses where the value should be and reaches O(log log n) on uniform data. On skewed data it degrades to O(n). Binary search's O(log n) holds for every distribution, and predictability is usually worth more than the extra log.",
      },
    ],
  },
  realWorld: [
    {
      system: "Database B-tree indexes",
      kind: "industry",
      problem:
        "Finding one row among a hundred million by scanning is impossible at query latency, and each page read from disk or SSD is thousands of times more expensive than a comparison.",
      applied:
        "A B-tree is binary search widened to match the storage block size. Each node holds hundreds of keys, so the fan-out is large and the depth is 3 or 4 even for enormous tables. Within a node, the search among keys is a binary search.",
      impact:
        "100M-row lookup in about 4 page reads instead of a full table scan",
    },
    {
      system: "Git bisect",
      kind: "industry",
      problem:
        "A bug appeared somewhere in the last 800 commits and you do not know where. Checking every commit is 800 builds.",
      applied:
        "Commits form a monotone sequence for the property 'is the bug present' — before the bad commit it is absent, after it, present. `git bisect` binary searches that property, asking you to test the middle commit each time.",
      impact: "800 builds → about 10",
    },
    {
      system: "Kubernetes and autoscaler capacity planning",
      kind: "industry",
      problem:
        "Finding the smallest number of replicas that keeps p99 latency under a target. Trying every count is slow and expensive; guessing overprovisions.",
      applied:
        "'Does N replicas keep p99 under target?' is monotone in N, so the smallest workable N is a binary search over the answer space, with a load test as the condition. The condition is expensive, which is exactly why halving matters.",
      impact: "Linear sweep of candidates → log n load tests",
    },
    {
      system: "traed — options strike selection by delta",
      kind: "yours",
      problem:
        "Selecting a strike by target delta scans the whole option chain, and each ITM/OTM lookup rebuilds a filtered list and re-sorts it.",
      applied:
        "For a fixed expiry, delta moves monotonically with strike price, so the ladder is effectively sorted by delta even though nobody sorted it. Selecting the strike nearest a target delta is therefore a binary search, not a scan.",
      evidence: "strategy-engine/app/services/strike_selection_service.py:250",
      impact: "O(n) scan + O(n log n) re-sort per call → O(log n) probes",
    },
  ],
  lab: {
    prompt:
      "Return the index of the first element that is greater than or equal to the target. If every element is smaller, return the array's length — that is the position where the target would be inserted to keep the array sorted. This is `bisect_left` / `lower_bound`. A linear scan passes every test here and then fails the O(log n) gate, which is the point.",
    fnName: "lowerBound",
    signature: "lowerBound(sorted: number[], target: number): number",
    starter: `function lowerBound(sorted, target) {
  // Budget: O(log n). A scan is O(n) and will be rejected.
  // Return the FIRST index whose value is >= target,
  // or sorted.length if there is no such index.

  return sorted.length;
}`,
    tests: [
      { name: "exact match", input: [[1, 3, 5, 7], 5], expected: 2 },
      {
        name: "target falls between elements",
        input: [[1, 3, 5, 7], 4],
        expected: 2,
      },
      { name: "smaller than everything", input: [[1, 3, 5, 7], 0], expected: 0 },
      {
        name: "larger than everything — insertion point is the end",
        input: [[1, 3, 5, 7], 8],
        expected: 4,
      },
      {
        name: "duplicates — must return the FIRST match",
        input: [[1, 2, 2, 2, 3], 2],
        expected: 1,
      },
      { name: "empty array", input: [[], 5], expected: 0, hidden: true },
      {
        name: "single element, equal",
        input: [[5], 5],
        expected: 0,
        hidden: true,
      },
      {
        name: "every element identical",
        input: [[4, 4, 4], 4],
        expected: 0,
        hidden: true,
      },
    ],
    hints: [
      "Set `lo = 0` and `hi = sorted.length` — note `length`, not `length - 1`, because 'not found' has to be representable as an answer.",
      "Loop while `lo < hi`. If `sorted[mid] < target`, the answer must be to the right, so `lo = mid + 1`. Otherwise `mid` is still a candidate, so `hi = mid`.",
      "Never write `hi = mid - 1` in this template — that discards a valid answer when `sorted[mid]` equals the target, which is exactly what breaks the duplicates test.",
    ],
    solution: `function lowerBound(sorted, target) {
  let lo = 0;
  let hi = sorted.length;        // one past the end: the "not found" answer
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);   // cannot overflow
    if (sorted[mid] < target) {
      lo = mid + 1;              // mid is too small, discard it
    } else {
      hi = mid;                  // mid still qualifies, keep it
    }
  }
  return lo;
}`,
    complexityGate: {
      target: "O(log n)",
      // Target sits past the last element, so the search always runs to full
      // depth and a linear scan always walks the whole array.
      gen: "(n) => [Array.from({ length: n }, (_, i) => i * 2), 2 * n + 1]",
      sizes: [65536, 131072, 262144, 524288],
    },
  },
  insights: [
    {
      t: "The precondition is monotonicity, not sortedness",
      d: 'Sortedness is just the most familiar monotone property. "Does capacity C finish in D days?" is monotone in C, so it is binary-searchable even though no array is sorted anywhere.',
    },
    {
      t: "Write mid as lo + (hi − lo) / 2",
      d: "It avoids integer overflow when both bounds are large. A free habit that costs nothing, and a real bug that shipped in the JDK for nine years before anyone noticed.",
    },
    {
      t: "Pick one template and stop improvising",
      d: "Most binary-search bugs are boundary bugs. Choose `while lo < hi` with `hi = mid` and `lo = mid + 1`, converging on lo — one shape handles lower bound, upper bound and answer-space search.",
    },
    {
      t: "Delta is monotone in strike price",
      d: "A concrete case worth internalising: option delta moves monotonically with the strike for a fixed expiry, so selecting by delta is a binary search, not a scan.",
    },
    {
      t: "log n is smaller than people expect",
      d: "A million is 20 probes, a billion is 30. This is why an expensive condition is fine — 30 evaluations of something slow still beats a billion evaluations of something fast.",
    },
  ],
  pitfalls: [
    "Using `while lo <= hi` together with `hi = mid`. When lo and hi are adjacent the range stops shrinking and the loop never ends.",
    "Binary searching a property that is not actually monotone. Verify it rather than assuming it — a non-monotone predicate returns a confident wrong answer.",
    "Writing `hi = mid - 1` in the lower-bound template. It discards a valid answer and breaks on duplicates, which is the case most tests forget to cover.",
    "Searching a list that is sorted by a different key than the one you are comparing on. It looks sorted, and the halving is invalid.",
  ],
  quiz: [
    {
      q: "Binary search on the answer requires that the predicate is:",
      options: [
        "Continuous",
        "Monotone — once true, true for everything beyond",
        "Computable in O(1)",
        "Defined over a sorted array",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Monotonicity is what lets one probe discard half the space. The predicate can cost O(n) to evaluate and the approach still wins comfortably.",
      distractors: [
        "Continuity is a property of functions over real numbers. The candidates here are usually integers, and there is no need for anything to vary smoothly.",
        "",
        "Cost does not matter for correctness. An expensive predicate is exactly when halving pays the most — 30 slow checks instead of a billion.",
        "That is the special case everyone learns first. Answer-space search has no array at all.",
      ],
    },
    {
      q: "Why write `mid = lo + (hi - lo) // 2` rather than `(lo + hi) // 2`?",
      options: [
        "It is faster",
        "It avoids integer overflow when lo and hi are both large",
        "It rounds differently",
        "It works with negative indices",
      ],
      answer: 1,
      difficulty: "recall",
      why: "`lo + hi` can exceed the integer range; `lo + (hi - lo)/2` cannot, because the difference is never larger than the range itself. This was a real bug in the JDK's binary search for nine years.",
      distractors: [
        "It is one extra subtraction, so marginally slower. The reason is correctness.",
        "",
        "Both round down to the same value. The rounding is identical.",
        "Array indices are not negative, and the overflow concern is at the top of the range, not the bottom.",
      ],
    },
    {
      q: "Searching for the minimum feasible capacity, `feasible(mid)` returns true. What next?",
      options: [
        "lo = mid + 1 — look for a larger one",
        "hi = mid — keep mid as a candidate and search left for something smaller",
        "hi = mid - 1 — discard mid",
        "Return mid immediately",
      ],
      answer: 1,
      difficulty: "apply",
      why: "`mid` works, but something smaller might work too. Keeping `mid` inside the range — `hi = mid`, not `mid - 1` — is what makes the loop converge on the minimum rather than merely on some feasible value.",
      distractors: [
        "This searches upward, which finds a larger feasible value. You already know large values work; the question is how small you can go.",
        "",
        "This throws away `mid`, which may be the answer. If the true minimum is exactly `mid`, you will never return it.",
        "`mid` is feasible, not minimal. Returning here gives whichever feasible value you happened to probe first.",
      ],
    },
    {
      q: "`lowerBound` on `[1, 2, 2, 2, 3]` with target 2 must return 1, but yours returns 3. What is wrong?",
      options: [
        "The array is not sorted",
        "On an equal comparison you are moving `lo` past `mid` instead of keeping `mid` as a candidate",
        "The midpoint calculation overflows",
        "You need to scan backwards after finding a match",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Lower bound means the FIRST index that qualifies. If `sorted[mid] === target` and you set `lo = mid + 1`, you have discarded a valid answer. The template only advances `lo` when the value is strictly less than the target.",
      distractors: [
        "It is sorted. Duplicates are perfectly normal in sorted data and are exactly what this template must handle.",
        "",
        "Overflow would need indices near the integer limit, and it would produce a crash or nonsense, not an answer that is merely too far right.",
        "Scanning back would give the right answer and cost O(n) when the array is all duplicates — it undoes the whole point of the search.",
      ],
    },
    {
      q: "Which of these problems is NOT solvable by binary search on the answer?",
      options: [
        "Minimum ship capacity to deliver all packages within D days",
        "Smallest divisor such that the sum of divisions stays under a threshold",
        "The most frequent element in an unsorted array",
        "Maximum minimum distance when placing k items in n positions",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Frequency has no monotone structure — knowing that some element appears at least 5 times tells you nothing that eliminates half the candidates. The other three all have a threshold that flips once and stays flipped.",
      distractors: [
        "Monotone: any capacity above a workable one is also workable, so the feasible set is an upward-closed range.",
        "A larger divisor makes every term smaller, so the sum only decreases — monotone in the divisor.",
        "",
        "Monotone: if you can guarantee a minimum spacing of d, you can also guarantee any spacing smaller than d.",
      ],
    },
    {
      q: "Your predicate is expensive: each evaluation runs an O(n) simulation. Is binary search still worth it?",
      options: [
        "No — the total becomes O(n log n), which is worse than scanning",
        "Yes — O(n log n) total, versus O(n · range) for trying every candidate",
        "Only if n is small",
        "Only if the predicate is cached",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The alternative is evaluating the predicate for every candidate in the range, which is O(n) times the size of the range. Binary search reduces the number of evaluations to log(range). Expensive predicates are the case where halving pays the most, not the least.",
      distractors: [
        "Scanning here means scanning the candidate range, not the array, and that is far more than log of it.",
        "",
        "The argument does not depend on n. It depends on the size of the candidate range, which is what gets halved.",
        "Caching helps if candidates repeat, and in a binary search they never do — each probe is a new value.",
      ],
    },
    {
      q: "An array is sorted then rotated at an unknown point, e.g. `[4,5,6,7,0,1,2]`. Can binary search still find a target in O(log n)?",
      options: [
        "No — rotation destroys the sorted property",
        "Yes — at every step at least one half is still sorted, and comparing endpoints tells you which",
        "Only if you know the rotation point",
        "Only for targets in the larger half",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Compare `sorted[lo]` with `sorted[mid]`. If the left half is in order, you can tell in O(1) whether the target lies inside it, and if not, the answer must be in the other half. Either way you still discard half the range per step.",
      distractors: [
        "It weakens the global property but not the local one, and the local one is all that halving needs.",
        "",
        "Finding the rotation point is itself a binary search, so this works — but it is an unnecessary extra pass. One search suffices.",
        "Size of the half is irrelevant. The comparison identifies which half is sorted, and the target may be in either.",
      ],
    },
    {
      q: "A colleague binary searches a list sorted by `created_at` while comparing on `price`. What happens?",
      options: [
        "It works, since both are ordered",
        "It returns confident wrong answers, because the halving assumption is false for price",
        "It throws an error",
        "It degrades to O(n)",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The list is monotone in date, not in price. Discarding half the range based on a price comparison eliminates candidates that may well contain the answer. This is the most dangerous binary-search bug because it produces plausible results rather than crashes.",
      distractors: [
        "Being ordered by one key says nothing about the other, unless the two happen to be correlated — which is not something to rely on.",
        "",
        "There is nothing to throw. Every index is in range and every comparison is valid; only the conclusion drawn from it is wrong.",
        "It stays O(log n) and simply returns the wrong element. Being fast is what stops anyone noticing.",
      ],
    },
  ],
};

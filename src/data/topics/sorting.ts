import type { Topic } from "../types.ts";

export const sorting: Topic = {
  id: "sorting",
  title: "Sorting internals",
  tier: 0,
  week: 4,
  depth: "core",
  summary:
    "Merge, quick, heap; stability; custom comparators; counting and radix.",
  why: "You will rarely write a sort. You will constantly choose one, choose a comparator, and — most importantly — decide whether the operation needs sorting at all. 'Sort a million records to look at ten' is one of the most common avoidable costs in production code.",
  complexity: "O(n log n) comparison-based",
  viz: ["merge-sort", "quick-sort"],
  learn: {
    intuition:
      "Every comparison-based sort is doing the same fundamental thing: gathering information about the order by asking 'is a before b?', until only one arrangement is still possible. There are n! possible arrangements and each yes/no question at best halves the possibilities, so you need at least log₂(n!) questions, which works out to about n log n. That is not a limitation of any particular algorithm — it is a floor that no comparison sort can go below. The algorithms differ in how efficiently they extract information and how well they use the machine. Merge sort splits and combines, and is stable and predictable. Quicksort partitions around a pivot, is faster in practice because it works in place with excellent memory behaviour, and has a bad worst case. The only way to go faster than n log n is to stop comparing — counting and radix sort use the values themselves as positions, which is possible only when the range of keys is bounded.",
    mechanics: [
      {
        heading: "Merge sort: split, sort each half, merge",
        body: "Divide until each piece has one element, then repeatedly merge two sorted runs by walking both with one pointer each and taking the smaller front element. The merge is where stability comes from: break ties toward the left run and equal elements keep their original order.",
      },
      {
        heading: "Quicksort: pick a pivot, partition, recurse",
        body: "Choose a pivot, rearrange so everything smaller sits to its left and everything larger to its right, then recurse into both sides. The pivot lands in its final position and never moves again. All the work is in the partition, and it happens in place.",
      },
      {
        heading: "The pivot choice is the whole risk",
        body: "A pivot that splits evenly gives log n levels of recursion. A pivot that always lands at one end gives n levels, each doing O(n) work — quadratic. Choosing the last element on already-sorted input does exactly that, which is why real implementations randomise, use median-of-three, or fall back to heapsort at depth.",
      },
      {
        heading: "Heapsort: build a heap, pop the maximum n times",
        body: "In place, guaranteed O(n log n), and not stable. Its poor cache behaviour — heap operations jump between distant array positions — makes it slower than quicksort in practice, so it is mostly used as a safety net rather than a first choice.",
      },
      {
        heading: "Counting and radix: skip comparison entirely",
        body: "If keys are integers in a bounded range, count how many of each value there are and lay them out directly — O(n + k) where k is the range. Radix sort applies this digit by digit, giving O(d·n) for d-digit keys. Neither breaks the n log n bound; they simply do not play that game.",
      },
    ],
    complexityDerivation:
      "The n log n lower bound comes from counting outcomes. Any comparison sort can be drawn as a decision tree: each internal node is a comparison, each branch is an outcome, and each leaf is one final arrangement. To sort correctly, every one of the n! possible arrangements needs its own leaf. A binary tree with n! leaves has height at least log₂(n!), and by Stirling's approximation log₂(n!) is about n log₂ n − 1.44n, so the height — the worst-case number of comparisons — is Ω(n log n). Merge sort achieves it: each level of the recursion does O(n) merging work and there are log n levels. Quicksort achieves it on average because a random pivot splits well most of the time, but its worst case is the sum n + (n−1) + … + 1 = O(n^2) when every partition is maximally unbalanced. Counting sort sidesteps the whole argument because it never compares two elements — it uses each key as an array index, and indexing is not a comparison, so the decision-tree model simply does not apply.",
    variants: [
      {
        name: "Merge sort",
        when: "Stability matters, or the data does not fit in memory.",
        delta:
          "Stable, guaranteed O(n log n), needs O(n) extra space. The external-sort variant is how databases sort data larger than RAM.",
      },
      {
        name: "Quicksort / introsort",
        when: "The general in-memory default.",
        delta:
          "In place, best constant factor of the comparison sorts. Introsort — used by C++ — starts as quicksort and switches to heapsort past a depth limit, so the worst case stays O(n log n).",
      },
      {
        name: "Timsort",
        when: "Real-world data, which is usually partly ordered already.",
        delta:
          "Python's and Java's default. Finds existing sorted runs and merges them, so nearly-sorted input approaches O(n). Stable.",
      },
      {
        name: "Counting / radix sort",
        when: "Keys are integers in a bounded range, or fixed-length strings.",
        delta:
          "O(n + k) or O(d·n). Beats n log n by not comparing. The catch is memory proportional to the key range, so it fails on sparse or unbounded keys.",
      },
    ],
    tradeoffs: [
      {
        vs: "Not sorting at all",
        pick: "Do not sort if you only need the top k",
        because:
          "A bounded min-heap of size k gives the top k in O(n log k) and holds only k items in memory. Quickselect gives the k-th element in O(n) on average. Sorting a million records to look at ten is the most common avoidable cost in application code.",
      },
      {
        vs: "Quicksort versus merge sort",
        pick: "Quicksort in memory, merge sort when stability or external sorting matters",
        because:
          "Quicksort is in place with better cache behaviour, so its constant factor wins. Merge sort is stable and its worst case is guaranteed, which is what you want when equal keys must keep their order or when the data is on disk.",
      },
      {
        vs: "Sorting versus a hash map",
        pick: "Hash map when you only need grouping or membership",
        because:
          "Grouping by key is O(n) with a map and O(n log n) with a sort. People sort to group out of habit. Sort only when the ORDER is part of the answer.",
      },
    ],
  },
  realWorld: [
    {
      system: "Timsort in Python and Java",
      kind: "industry",
      problem:
        "Real data is rarely random. Log files, database results and user-entered records usually contain long stretches that are already in order, and a sort that ignores this repeats work.",
      applied:
        "Timsort scans for existing ascending or descending runs, extends short ones with binary insertion sort, and merges the runs with a rule that keeps the merge tree balanced. On already-sorted input it is O(n).",
      evidence: "CPython Objects/listsort.txt",
      impact: "O(n log n) → close to O(n) on partly ordered data",
    },
    {
      system: "External merge sort in databases",
      kind: "industry",
      problem:
        "`ORDER BY` on a table larger than available memory cannot be done with any in-memory algorithm.",
      applied:
        "Sort as much as fits into a run, write each run to disk, then merge many runs at once with one buffer per run — a k-way version of the merge step. The number of merge passes is what the sort's memory budget actually controls.",
      impact: "Sorting datasets far larger than RAM in a few sequential passes",
    },
    {
      system: "Stable sorting for multi-key ordering",
      kind: "industry",
      problem:
        "A results table lets a user sort by date, then by name, expecting the previous ordering to be preserved within equal names.",
      applied:
        "Sort by the least significant key first, then by the most significant, using a stable sort. Stability is what carries the earlier ordering through. With an unstable sort this technique silently produces the wrong order.",
      impact: "Multi-key ordering without a compound comparator",
    },
    {
      system: "traed — ranking option strikes and signals",
      kind: "yours",
      problem:
        "Selecting the best few candidates from an option chain or a signal list by sorting the entire collection, when only the top handful are ever used.",
      applied:
        "A bounded heap of size k, or `heapq.nlargest`, gives the same answer in O(n log k) while touching a fraction of the memory. When the chain is already ordered by strike, the ordering can often be exploited instead of recreated.",
      impact: "O(n log n) full sort → O(n log k) for the k that matter",
    },
  ],
  lab: {
    prompt:
      "Return the distinct values sorted by how often they appear, most frequent first. Break ties by the value itself, ascending. For example `[1,1,2,2,2,3]` gives `[2,1,3]`. Counting each value with a `filter` inside a loop is correct and quadratic. Budget: O(n log n) — the sort itself is allowed, a nested scan is not.",
    fnName: "sortByFrequency",
    signature: "sortByFrequency(nums: number[]): number[]",
    starter: `function sortByFrequency(nums) {
  // Budget: O(n log n). Count in one pass, then sort the distinct values.
  // Ties: higher count first, and among equal counts, smaller value first.

  return [];
}`,
    tests: [
      {
        name: "clear frequency order",
        input: [[1, 1, 2, 2, 2, 3]],
        expected: [2, 1, 3],
      },
      {
        name: "tie broken by value ascending",
        input: [[5, 5, 4, 4]],
        expected: [4, 5],
      },
      { name: "all distinct — sorted ascending", input: [[3, 1, 2]], expected: [1, 2, 3] },
      { name: "single value repeated", input: [[5, 5, 5]], expected: [5] },
      { name: "empty array", input: [[]], expected: [] },
      {
        // Default JS sort compares as STRINGS, so [10, 9] sorts to [10, 9].
        // A comparator is required, not optional.
        name: "numeric ordering, not string ordering",
        input: [[10, 9, 10, 9, 2]],
        expected: [9, 10, 2],
        hidden: true,
      },
      {
        name: "negative values",
        input: [[-1, -1, 2]],
        expected: [-1, 2],
        hidden: true,
      },
      {
        name: "three-way tie",
        input: [[30, 20, 10]],
        expected: [10, 20, 30],
        hidden: true,
      },
    ],
    hints: [
      "One pass with a `Map` gives you value → count. That is the O(n) half.",
      "Then sort the map's keys with a comparator. Sorting the distinct values is at most O(n log n).",
      "The comparator has two levels: `countB - countA` first (descending by count), and if that is 0, `a - b` (ascending by value). Never rely on the default sort — it compares as strings, so 10 sorts before 9.",
    ],
    solution: `function sortByFrequency(nums) {
  const count = new Map();
  for (const x of nums) {
    count.set(x, (count.get(x) ?? 0) + 1);
  }

  return [...count.keys()].sort((a, b) => {
    const byCount = count.get(b) - count.get(a);   // higher count first
    return byCount !== 0 ? byCount : a - b;        // then smaller value first
  });
}`,
    complexityGate: {
      target: "O(n log n)",
      // About n/4 distinct values, so each appears roughly four times.
      // Distinct count still grows with n — which is what keeps a
      // filter-per-value counter quadratic — while the map stays small
      // enough that its own growth cost does not dominate the measurement.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 7919) % Math.max(1, Math.floor(n / 4)))]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Stability is a data property, not a performance one",
      d: 'A stable sort preserves the relative order of equal keys — which is what makes multi-pass sorting ("sort by date, then by name") work. Merge sort and Timsort are stable; quicksort and heapsort are not.',
    },
    {
      t: "Quicksort is faster in practice and worse in the tail",
      d: "In place, excellent cache behaviour, average O(n log n) — but adversarial or already-sorted input drives it to O(n^2). Real implementations randomise the pivot or use introsort, which falls back to heapsort past a depth limit.",
    },
    {
      t: "O(n log n) is a lower bound only for comparison sorts",
      d: "Counting and radix sort beat it by not comparing at all: they use the key as a position. For 32-bit integers or fixed-length strings that is a real option, at the cost of memory proportional to the key range.",
    },
    {
      t: "Ask whether you need a full sort at all",
      d: 'For "top 10 of a million", a bounded min-heap is O(n log 10) and holds ten items. Sorting everything to look at ten of them is the most common avoidable cost in application code.',
    },
    {
      t: "JavaScript's default sort compares strings",
      d: "`[10, 9].sort()` gives `[10, 9]`, because it converts to strings first. Always pass a comparator for numbers. This catches people in interviews constantly.",
    },
  ],
  pitfalls: [
    "Calling `sort()` inside a loop. Sort once outside it — this is the classic accidental O(n^2 log n).",
    "A comparator that is not a consistent ordering. If `compare(a,b)` and `compare(b,a)` can both say 'less than', optimised sort implementations can crash or corrupt the array.",
    "Sorting to group. Grouping by key is O(n) with a hash map; sorting for it adds a log factor and an ordering nobody asked for.",
    "Assuming your language's sort is stable. It is in Python and Java; it is in JavaScript only since ES2019; it is not in C++ `std::sort` — use `std::stable_sort`.",
  ],
  quiz: [
    {
      q: "You need the 10 largest of 1,000,000 records. The best approach is:",
      options: [
        "Sort descending and take 10 — O(n log n)",
        "A bounded min-heap of size 10 — O(n log 10)",
        "Ten passes finding the maximum — O(10n)",
        "Quickselect, then sort the top partition",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The heap keeps only 10 elements in memory and does log 10 work per record. Quickselect is also O(n) and competitive, but the heap streams and needs no random access to the whole set.",
      distractors: [
        "Correct and wasteful. You are paying to order 999,990 records you will never look at.",
        "",
        "O(10n) is respectable and it needs ten full passes over the data, which is worse for anything that does not fit in memory.",
        "Genuinely good — O(n) average — but it needs the entire array in memory and rearranges it. The heap works on a stream and does not.",
      ],
    },
    {
      q: "Which sort is stable?",
      options: [
        "Quicksort",
        "Heapsort",
        "Merge sort",
        "Selection sort (typical implementation)",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Merge sort preserves the order of equal elements when the merge step breaks ties toward the left run. Quicksort and heapsort both move elements across long distances and lose it.",
      distractors: [
        "Partitioning swaps elements across the array, so two equal keys can end up in either order.",
        "The heap operations move elements between distant positions with no regard for their original order.",
        "",
        "The typical implementation swaps the minimum into place, which can jump an equal element over another. Selection sort is stable only if written to shift rather than swap.",
      ],
    },
    {
      q: "Quicksort degrades to O(n^2) when:",
      options: [
        "The array is very large",
        "The pivot repeatedly splits the array very unevenly — for example already-sorted input with a last-element pivot",
        "The array contains duplicates",
        "Recursion depth exceeds log n",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Balanced partitions give log n levels. Consistently lopsided partitions give n levels, each doing O(n) work, and the total is the arithmetic series n + (n−1) + … which is quadratic.",
      distractors: [
        "Size alone changes nothing about the class. A large array with good pivots is still n log n.",
        "",
        "Duplicates hurt two-way partitioning specifically, which is why three-way (Dutch national flag) partitioning exists — but duplicates are a separate issue from pivot balance.",
        "This is the symptom, not the cause. Introsort watches exactly this and switches to heapsort when it happens.",
      ],
    },
    {
      q: "Why can counting sort be O(n + k) when the comparison lower bound is Ω(n log n)?",
      options: [
        "The bound is wrong",
        "It never compares two elements — it uses each key as an array index, so the decision-tree argument does not apply",
        "It is only faster on small inputs",
        "It uses more memory, and memory buys time",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The lower bound is proved for algorithms whose only operation is comparing two elements. Counting sort indexes an array with the key itself, which is not a comparison, so the proof says nothing about it.",
      distractors: [
        "The bound is a theorem and it is correct. What matters is exactly which algorithms it covers.",
        "",
        "It is faster on large inputs too, provided the key range k stays reasonable. Input size is not the constraint — key range is.",
        "Memory usage is a real cost of counting sort, but 'uses more memory' is not why the bound does not apply. Not comparing is.",
      ],
    },
    {
      q: "A results table must be ordered by department, and within each department by joining date. You have a stable sort. What is the simplest correct approach?",
      options: [
        "Sort by department, then by date",
        "Sort by date first, then by department",
        "Write one comparator handling both keys",
        "Sort by date and group by department afterwards",
      ],
      answer: 1,
      difficulty: "judge",
      why: "With a stable sort, sort by the least significant key first. The second sort by department keeps the date ordering intact within each department. Sorting by department first would then have its ordering destroyed by the date sort.",
      distractors: [
        "This is backwards. The second sort reorders everything by date and loses the department grouping.",
        "",
        "Also correct, and often the better production choice for clarity and speed — but the question asks for the simplest, and it is the technique that stability exists to enable.",
        "Grouping afterwards works but adds a pass and a structure. The two-sort trick needs neither.",
      ],
    },
    {
      q: "In JavaScript, `[10, 9, 100].sort()` returns:",
      options: [
        "[9, 10, 100]",
        "[10, 100, 9]",
        "[100, 10, 9]",
        "An error",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Without a comparator, `sort` converts elements to strings and compares them lexicographically. '10' < '100' < '9', so the numbers come back in an order that looks random. Always pass `(a, b) => a - b`.",
      distractors: [
        "This is what you get with a comparator, and what almost everyone expects without one.",
        "",
        "This would be descending string order, which is not the default either.",
        "It happily returns a wrong answer, which is worse than an error.",
      ],
    },
    {
      q: "You need to group a million records by user id. Your colleague sorts by user id first. What would you suggest?",
      options: [
        "Nothing — sorting is the standard approach",
        "A hash map from id to a list — O(n) instead of O(n log n), unless the output must be ordered",
        "A faster sorting algorithm",
        "Sort in parallel",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Grouping needs equality, not order. A hash map does it in one pass. Sorting to group is a habit that costs a log factor and produces an ordering nobody asked for — unless, of course, the output genuinely needs to be ordered, which is the question to ask first.",
      distractors: [
        "It is common, which is not the same as right. The log factor is being spent on an ordering the task does not require.",
        "",
        "Optimising within the wrong approach. Any comparison sort still costs n log n.",
        "Parallelism divides the constant while keeping the class. The map removes the log factor entirely on one core.",
      ],
    },
    {
      q: "Your `sortByFrequency` passes every test but fails the O(n log n) gate. Most likely cause?",
      options: [
        "The sort is too slow",
        "You counted with `nums.filter(...)` per distinct value, which is a full pass each time",
        "The comparator is wrong",
        "You used a Map instead of an object",
      ],
      answer: 1,
      difficulty: "judge",
      why: "`filter`, `indexOf` and `includes` are each O(n). Calling one per distinct value makes the counting phase O(n^2), which swamps the sort. Count once in a single pass with a Map instead.",
      distractors: [
        "The built-in sort is already an optimised n log n implementation. The counting phase is what went quadratic.",
        "",
        "A wrong comparator produces wrong answers, and correctness tests run before the gate — you would have failed those first.",
        "A Map is the recommended choice here and is not a performance problem. Both are constant-time lookups.",
      ],
    },
  ],
};

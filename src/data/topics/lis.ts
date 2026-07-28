import type { Topic } from "../types.ts";

export const lis: Topic = {
  id: "lis",
  title: "Longest increasing subsequence",
  tier: 3,
  week: 16,
  depth: "deep",
  summary: "Both the O(n²) DP and the O(n log n) patience-sorting version.",
  why: "The clearest example of binary search hiding inside a DP — and a reminder that the fast version answers a *narrower* question.",
  complexity: "O(n²) or O(n log n)",
  viz: ["lis"],
  learn: {
    intuition:
      "Deal a deck of cards face up, one at a time, into piles on a table. The rule is that a card may only go onto a pile whose top card is higher than it, and you always use the leftmost pile that will take it; if no pile will, start a new one on the right. Play the whole deck and count the piles. That count is the length of the longest increasing subsequence, and the game is called patience — which is where the algorithm gets its name. Why does it work? Every pile's top card is the smallest value you could currently have at the end of a run of that length, because you always played greedily leftmost. Those tops are therefore in increasing order across the table, which means finding the right pile is a binary search rather than a scan. And a new pile only ever opens when a card is bigger than every current top, which is exactly the moment the longest run got longer. The piles are not the answer — you cannot read the subsequence off them, because later cards overwrote earlier tops — but the *number* of piles is, and that is the distinction that trips people up.",
    mechanics: [
      {
        heading: "Start with the honest O(n²) version",
        body: "`dp[i]` is the length of the longest increasing subsequence that ends exactly at index `i`. To fill it, look back at every `j < i` with `a[j] < a[i]` and take the best, plus one. The answer is the maximum over the whole table, not `dp[n-1]`, because the best run need not end at the last element. Write this first in an interview: it is obviously correct, it takes two minutes, and it gives you something to optimise from.",
      },
      {
        heading: "The faster version keeps one number per length",
        body: "`tails[k]` is the smallest value that any increasing subsequence of length `k+1` can end with. Note what it is not: it is not the k-th element of the answer, and the `tails` array is usually not a subsequence of the input at all. It is a per-length record of the best possible ending, and its *length* is the answer.",
      },
      {
        heading: "A smaller tail is never worse — the exchange argument",
        body: "Suppose you have a length-3 run ending in 9 and you find another ending in 4. Replace it. You still have a length-3 run, so nothing is lost, and anything that could have extended the 9 can also extend the 4 while some things can extend only the 4. Strictly more becomes possible and nothing becomes impossible. That is the entire correctness proof, and it is the kind of argument worth being able to produce on demand — 'nothing lost now, strictly more available later' recurs across greedy algorithms.",
      },
      {
        heading: "The search is a lower bound, and which one decides strictness",
        body: "`tails` is always sorted, because a longer run cannot end on a smaller value than a shorter one. So finding where the new element belongs is a binary search for the first tail that is greater than or equal to it. Using the first *strictly greater* tail instead gives you the non-strictly increasing answer, where equal values may repeat. Those two are one comparison apart and the tests that distinguish them contain duplicates — which is why a solution passing `[1, 2, 3]` and failing `[7, 7, 7]` is such a common outcome.",
      },
      {
        heading: "Append or replace, and only appending grows the answer",
        body: "If the element is bigger than every tail, push it — a new pile, and the answer just got longer. Otherwise overwrite the tail the search found. The length of `tails` is the answer at every point in the scan, which incidentally means this works as an online algorithm on a stream. Reconstruction is a separate matter: record, for each element, which index it was placed at and which element preceded it, then walk those parent links back from the final placement.",
      },
    ],
    complexityDerivation:
      "The O(n²) version does O(n) work at each of n positions, and the argument is simply that the inner loop looks at every earlier index. The fast version processes each of the n elements once and does a binary search over `tails`, which never grows past n, so each step is O(log n) and the total is O(n log n). Space is O(n) for either. The step that deserves scrutiny is the claim that `tails` stays sorted, because the binary search is only valid if it does — and it holds because `tails[k]` is the minimum tail over all runs of length k+1, and any run of length k+1 contains a run of length k ending on a strictly smaller value, so `tails[k-1] < tails[k]` by construction. The invariant is maintained by the update too: replacing `tails[p]` with a value that the search placed there keeps it below `tails[p+1]` and above `tails[p-1]`. As for whether O(n log n) can be beaten — in the comparison model it cannot, because a sorted input produces an answer of n and a reversed one produces 1, so an LIS algorithm can be used to sort, and sorting is Ω(n log n). That reduction is worth knowing: it converts 'I could not find anything faster' into 'nothing faster exists', which is a much better sentence in a design review.",
    variants: [
      {
        name: "Strictly increasing",
        when: "The default reading of the problem.",
        delta:
          "Binary search for the first tail greater than or equal to the element — `bisect_left`. Duplicates cannot both appear in one run.",
      },
      {
        name: "Non-decreasing",
        when: "Equal values are allowed to repeat inside the run.",
        delta:
          "Search for the first tail strictly greater — `bisect_right`. One character of difference, and no test without duplicates will ever tell you which one you wrote.",
      },
      {
        name: "Two-dimensional (box or envelope nesting)",
        when: "Two attributes must both increase.",
        delta:
          "Sort by the first dimension, then run LIS on the second. The subtle part is ties: sort equal first-dimension items by the second *descending*, so that two items with the same width can never both be picked.",
      },
      {
        name: "Counting how many LIS there are",
        when: "You need the number of optimal answers, not one of them.",
        delta:
          "Back to the O(n²) DP with a parallel count array, or a Fenwick tree keyed by value for O(n log n). The patience version cannot count — it keeps one representative per length and discards the rest.",
      },
    ],
    tradeoffs: [
      {
        vs: "The O(n²) DP",
        pick: "The O(n²) version below a few thousand elements, or when you need more than the length",
        because:
          "It is four lines, obviously correct, and trivially extended to count solutions, to apply per-element weights, or to answer 'longest chain ending here' for every position. The patience version is faster and answers a strictly narrower question. On a 200-element list the difference is microseconds and the maintenance difference is real — write the fast one when n justifies it, and say why.",
      },
      {
        vs: "Sorting and taking the longest common subsequence with the original",
        pick: "Patience sorting",
        because:
          "LIS really is LCS between the array and its sorted copy, and that is a genuinely useful thing to notice because it explains why patience diff works. As an implementation it is terrible: LCS is O(n²) and you have just paid O(n log n) to sort as well. Recognising the equivalence is worth marks; implementing it that way is not.",
      },
      {
        vs: "A segment tree keyed by value",
        pick: "The segment tree when the transition has an extra constraint",
        because:
          "Patience sorting handles exactly one condition — the next value must be larger. The moment you also need 'and its index is within k' or 'and its weight is at most w', the neat tails array cannot express it, and you fall back to a DP where the max over a value range is answered by a segment tree in O(log n). Same total complexity, far more flexible, considerably more code.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — measuring how sustained a trend is",
      kind: "yours",
      problem:
        "The longest run of consecutively rising closes is a poor trend measure: a single down tick resets it to zero, so a session that climbed steadily with three small pullbacks scores the same as one that went nowhere.",
      applied:
        "The longest increasing *subsequence* of the session's closes tolerates pullbacks, because a subsequence may skip bars. Its length relative to the bar count is a persistence score that separates a genuine climb from noise — and unlike a run, it does not collapse on a single tick.",
      evidence: "strategy-engine/list_all_indicators.py",
      impact: "A metric that survives normal intraday noise instead of being reset by it",
    },
    {
      system: "git's patience diff",
      kind: "industry",
      problem:
        "The standard diff algorithm matches lines greedily, and on refactored code it produces alignments nobody recognises — a closing brace from one function matched to a closing brace in another, so the diff reads as though everything moved.",
      applied:
        "Take only the lines appearing exactly once in both files, which are far more likely to be genuinely the same line. Their positions in the two files form two sequences, and the longest increasing subsequence of those positions is the largest set of matches that can hold without crossing. Anchor on those, then recurse into the gaps.",
      evidence: "git diff --patience",
      impact: "Diffs that follow the code's structure rather than its punctuation",
    },
    {
      system: "Nesting boxes and containers in logistics",
      kind: "industry",
      problem:
        "Shipping empty containers or cartons costs the same as shipping full ones, so you want the longest chain of boxes that each fit inside the next.",
      applied:
        "Sort by width, then run LIS on height — a box fits if both dimensions are strictly larger. The detail that decides correctness is tie handling: boxes with equal width must be sorted by height *descending*, so two equal-width boxes can never both land in the chain. Get that backwards and the answer is confidently too large.",
      impact: "Return-leg volume reduced by nesting rather than stacking",
    },
    {
      system: "Measuring packet reordering on a network path",
      kind: "industry",
      problem:
        "Packets on a multi-path route arrive out of order. The receiver needs a number describing how badly, because reordering forces buffering and can trigger spurious retransmissions.",
      applied:
        "Take the sequence numbers in arrival order; the longest increasing subsequence is the largest set that did arrive in order. One minus its fraction of the total is a reordering metric that a single badly delayed packet cannot dominate, unlike 'count of out-of-order arrivals'.",
      impact: "A reordering measure robust to one straggler, computable online in O(n log n)",
    },
  ],
  lab: {
    prompt:
      "Return the LENGTH of the longest strictly increasing subsequence of `nums`. A subsequence keeps the original order but may skip elements — it does not have to be contiguous. Budget: O(n log n). The straightforward O(n²) DP is correct and will fail the gate.",
    fnName: "lisLength",
    signature: "lisLength(nums: number[]): number",
    starter: `function lisLength(nums) {
// Your budget: O(n log n) time.
// Keep tails[k] = the smallest value that any increasing subsequence
// of length k + 1 can end with. It stays sorted — so finding where a
// new value belongs is a binary search, not a scan.

return 0;
}`,
    tests: [
      {
        // 2, 3, 7, 101 — or 2, 3, 7, 18. Either way, length 4.
        name: "classic case",
        input: [[10, 9, 2, 5, 3, 7, 101, 18]],
        expected: 4,
      },
      {
        // 0, 1, 2, 3. A solution that only tracks contiguous runs gets 2.
        name: "not contiguous",
        input: [[0, 1, 0, 3, 2, 3]],
        expected: 4,
      },
      {
        // STRICTLY increasing, so all-equal values give 1. A solution that
        // searched for the first tail strictly greater returns 5 here, and
        // passes every test above.
        name: "all equal — strictly increasing means 1",
        input: [[7, 7, 7, 7, 7]],
        expected: 1,
      },
      { name: "already sorted", input: [[1, 2, 3, 4, 5]], expected: 5 },
      { name: "strictly decreasing", input: [[5, 4, 3, 2, 1]], expected: 1 },
      { name: "empty", input: [[]], expected: 0, hidden: true },
      {
        // 1, 4, 5, 9 or 1, 4, 5, 6 — length 4. The 2 near the end is a
        // trap for a solution that replaces the wrong tail.
        name: "replacement matters",
        input: [[3, 1, 4, 1, 5, 9, 2, 6]],
        expected: 4,
        hidden: true,
      },
      {
        name: "negatives and a duplicate",
        input: [[-5, -1, -1, 0, 3]],
        expected: 4,
        hidden: true,
      },
    ],
    hints: [
      "Keep an array `tails`. `tails[k]` holds the smallest value that any increasing subsequence of length k + 1 could end with. Its LENGTH is the answer — its contents are usually not a real subsequence.",
      "For each value, binary search `tails` for the first entry that is greater than or equal to it. If there is no such entry, the value beats every tail, so push it and the answer grows by one. Otherwise overwrite that entry.",
      "'Greater than or equal' is what makes it strictly increasing: an equal value replaces the existing tail rather than extending past it, so duplicates never both appear in one run. Searching for the first strictly greater entry gives the non-decreasing answer instead.",
    ],
    solution: `function lisLength(nums) {
// tails[k] = smallest possible tail of an increasing subsequence of
// length k + 1. Always sorted ascending, which is what lets us binary
// search it.
const tails = [];

for (const x of nums) {
  // First index whose tail is >= x. ">=" (not ">") is what makes this
  // STRICTLY increasing: an equal value replaces rather than extends.
  let lo = 0;
  let hi = tails.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tails[mid] < x) lo = mid + 1;
    else hi = mid;
  }

  if (lo === tails.length) {
    // Bigger than every tail — a new pile, and the answer grew.
    tails.push(x);
  } else {
    // A smaller tail for this length is never worse: same length now,
    // strictly easier to extend later.
    tails[lo] = x;
  }
}

return tails.length;
}`,
    complexityGate: {
      target: "O(n log n)",
      // A multiplicative-hash permutation of 0..n-1. The multiplier is odd
      // and not a multiple of 5, and every size here is 2^k · 5^3, so the
      // two are coprime and the mapping is a genuine permutation.
      //
      // A permutation matters: on sorted input every element appends and
      // the binary search always lands at the end, which is the one case
      // where even a linear scan would look fast.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 2654435761) % n)]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "`tails` is not the subsequence",
      d: "`tails[k]` is the smallest possible tail of an increasing run of length k+1. Its *length* is the answer; its contents are usually not a valid LIS, because later elements overwrote earlier tails. Reconstruction needs parent pointers.",
    },
    {
      t: "A smaller tail is never worse",
      d: "Replacing a tail keeps the length identical while making future extension easier. That exchange argument — nothing lost now, strictly more available later — is the whole correctness proof.",
    },
    {
      t: "The binary search is a lower-bound query",
      d: "Find the first tail ≥ x. Getting `bisect_left` versus `bisect_right` wrong silently switches you between strictly and non-strictly increasing, and no test without duplicates will catch it.",
    },
    {
      t: "O(n log n) is optimal in the comparison model",
      d: "A sorted input has LIS n and a reversed one has LIS 1, so an LIS routine can be used to sort. Sorting is Ω(n log n), therefore so is this — 'nothing faster exists' rather than 'I could not find anything faster'.",
    },
    {
      t: "LIS is LCS between the array and its sorted copy",
      d: "A true and useful equivalence — it is why patience diff works — and a terrible implementation strategy, since LCS is quadratic.",
    },
  ],
  pitfalls: [
    "Returning `dp[n−1]` in the O(n²) version. The longest run need not end at the last element; the answer is the maximum over the whole table.",
    "Using the wrong side of the binary search, which silently switches between strictly increasing and non-decreasing. Only inputs with duplicates expose it.",
    "Trying to read the subsequence out of `tails`. The values there were overwritten by later elements and frequently do not form a run in the original array at all.",
    "In the 2D box-nesting variant, sorting ties in the second dimension ascending. Two equal-width boxes then both enter the chain, and neither fits inside the other.",
  ],
  quiz: [
    {
      q: "In the O(n log n) LIS, what does tails[k] hold?",
      options: [
        "The k-th element of the LIS",
        "The smallest possible tail value among all increasing subsequences of length k+1",
        "The largest element seen so far",
        "The count of subsequences of length k",
      ],
      answer: 1,
      difficulty: "recall",
      why: "It is a per-length best-tail table. That is why `tails` itself is usually not a real subsequence of the input.",
      distractors: [
        "This is the assumption that leads people to print `tails` as the answer. Later elements overwrite earlier tails, so the array often is not even a subsequence of the input.",
        "",
        "The largest element seen would be a single number, and it would tell you nothing about achievable lengths.",
        "Counting is a different problem that the patience method cannot answer at all — it keeps one representative per length and discards the rest.",
      ],
    },
    {
      q: "Why is replacing an existing tail with a smaller value always safe?",
      options: [
        "It makes the array sorted",
        "The achievable length is unchanged, and a smaller tail can only be easier to extend later",
        "It reduces memory",
        "It is not always safe",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A classic exchange argument: nothing is lost now, and strictly more becomes possible later.",
      distractors: [
        "`tails` is already sorted before the replacement, and the update preserves that. Sortedness is an invariant that makes the binary search valid, not the reason the replacement is correct.",
        "",
        "The array length does not change on a replacement, so no memory is saved either way.",
        "It is always safe, and the exchange argument proves it. The instinct that it might not be usually comes from confusing `tails` with the subsequence itself.",
      ],
    },
    {
      q: "Your LIS returns 5 on `[7, 7, 7, 7, 7]` but you wanted strictly increasing. What is wrong?",
      options: [
        "The tails array is not being sorted",
        "The binary search finds the first tail strictly greater than x, when it should find the first tail greater than or equal",
        "The answer should be 5",
        "Duplicates need removing first",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Searching for strictly greater means an equal value never matches an existing tail, so it appends and grows the answer. Searching for greater-than-or-equal makes it replace instead, which is exactly what 'strictly increasing' requires.",
      distractors: [
        "`tails` sorts itself by construction — the update rule maintains the invariant. Nothing in this bug touches the ordering.",
        "",
        "Strictly increasing means each element must exceed the last, so five identical values give a longest run of 1. Answering 5 is the non-decreasing question.",
        "De-duplicating happens to fix this input and breaks others — `[1, 3, 2, 3, 4]` has a legitimate LIS of 4 that uses only one of the 3s, and removing duplicates blindly changes which one survives.",
      ],
    },
    {
      q: "Nesting boxes: sort by width, then LIS on height. How should boxes of EQUAL width be ordered?",
      options: [
        "By height ascending",
        "By height descending, so two equal-width boxes can never both be chosen",
        "It does not matter",
        "Remove all but one of them",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Nesting needs both dimensions strictly larger. Sorting equal widths by descending height means their heights form a decreasing run, and a decreasing run contributes at most one element to an increasing subsequence — which is exactly the constraint you need enforced.",
      distractors: [
        "Ascending height makes two equal-width boxes look like a valid increasing step on the height axis, so the LIS happily takes both. Neither fits inside the other, and the answer comes back confidently too large.",
        "",
        "It decides correctness. This tie-break is the entire difficulty of the 2D variant, and it is where the interview question actually lives.",
        "Two boxes of equal width but different heights are genuinely different options, and the taller one may be the right link in the chain. Discarding one throws away real answers.",
      ],
    },
    {
      q: "You need the actual subsequence, not just its length. What do you add?",
      options: [
        "Print the tails array",
        "Record, for each element, the index it was placed at and which element preceded it, then walk those parent links back from the final placement",
        "Run the algorithm backwards",
        "Sort the input and compare",
      ],
      answer: 1,
      difficulty: "apply",
      why: "At the moment an element lands at position p, the element currently at p−1 is a valid predecessor. Storing that link costs O(n) extra and turns the length into a reconstructible answer.",
      distractors: [
        "The tails array holds values overwritten by later elements. It very often is not a subsequence of the input at all, and printing it is the single most common LIS mistake.",
        "",
        "Running it backwards gives the longest decreasing subsequence of the reversed array — a different, equally length-only result.",
        "LIS does equal the LCS of the array with its sorted copy, but computing that LCS to recover the path costs O(n²) and throws away everything the fast version bought you.",
      ],
    },
    {
      q: "Someone asks whether LIS can be done faster than O(n log n). The best answer is:",
      options: [
        "Probably, with a good hash map",
        "No in the comparison model — a sorted input gives n and a reversed one gives 1, so LIS can be used to sort, and sorting is Ω(n log n)",
        "Yes, in O(n) with counting sort",
        "Nobody knows",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The reduction converts a hunch into a proof. Being able to produce it turns 'I could not find anything faster' into 'nothing faster exists', which is a completely different sentence to say in a review.",
      distractors: [
        "Hashing does not help with an order-based comparison problem — the question at each step is 'where does this value fall among the tails', which hashing cannot answer.",
        "",
        "Counting sort beats the comparison bound only for small integer keys, and that is a genuine caveat worth raising — but it is an escape from the model, not a refutation of the bound within it.",
        "It is settled within the comparison model. Saying nobody knows gives away a result you could have stated precisely.",
      ],
    },
    {
      q: "The problem changes: find the longest increasing subsequence where consecutive picks are at most k indices apart. Patience sorting stops working. Why?",
      options: [
        "The tails array is no longer sorted",
        "`tails` records only a value per length and cannot express an index constraint, so you need a DP with a range-max query — a segment tree keyed by value",
        "The complexity becomes exponential",
        "Binary search cannot handle constraints",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Patience sorting compresses everything about a length into one number, the best tail. The extra constraint asks about *where* elements sat, and that information was thrown away. The fallback is dp[i] = 1 + max over a value range within the index window, with a segment tree answering the max in O(log n).",
      distractors: [
        "The sortedness of `tails` is not what breaks — the structure simply cannot represent the new question, whether or not it stays sorted.",
        "",
        "It stays O(n log n) with the right structure. Adding a constraint narrows the search space; it does not make the problem exponential.",
        "Binary search is fine and the segment-tree solution still uses ordering. What fails is the compression to one number per length, not the search.",
      ],
    },
    {
      q: "Which sentence best explains why patience diff produces more readable diffs?",
      options: [
        "It is faster, so it can consider more options",
        "It anchors on lines that appear exactly once in both files, then takes the LIS of their positions — the largest set of matches that can hold without crossing",
        "It ignores whitespace",
        "It compares files line by line instead of character by character",
        ],
      answer: 1,
      difficulty: "judge",
      why: "Uniqueness is the filter that makes the anchors trustworthy — a line occurring once in each file is very likely the same line. LIS is then what picks the largest non-crossing set of those anchors, and recursion into the gaps handles the rest.",
      distractors: [
        "It is generally slower than the default. The readability comes from what it matches, not from how much it can afford to consider.",
        "",
        "Whitespace handling is an independent option that applies to any diff algorithm, and it is not what makes braces stop matching across functions.",
        "Every practical diff works line by line. That is what makes a closing brace a single repeated token in the first place — which is the problem patience solves rather than the solution.",
      ],
    },
  ],
};

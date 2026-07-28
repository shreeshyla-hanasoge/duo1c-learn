import type { Topic } from "../types.ts";

export const stringDp: Topic = {
  id: "string-dp",
  title: "String DP",
  tier: 3,
  week: 15,
  depth: "deep",
  summary: "LCS, edit distance, palindromic substrings.",
  why: "Edit distance is the engine inside every diff, spell-checker, and fuzzy match. Swap characters for lines and you have git diff.",
  complexity: "O(n · m)",
  viz: ["lcs", "edit-distance"],
  learn: {
    intuition:
      "You want to know how different two words are — how many single-character edits turn one into the other. The brute-force version tries every sequence of edits, which is hopeless. The trick is to stop thinking about edits and start thinking about *consumption*. Line the two words up and walk along both, and at every moment the only thing that describes where you are is how many characters of each you have used up. That is a pair of numbers, so there are only n × m possible situations no matter how many different edit sequences could have led to each one. Now look at the next character of each. If they are the same, you take them both together and pay nothing — there is never a reason to do anything else with two characters that already agree. If they differ, you have exactly three moves, and each one is a real edit with a name: drop the character from the first word (a deletion), take a character from the second word only (an insertion), or take both and count it as one substitution. Pay one, take the cheapest of the three, and move on. The whole algorithm is that paragraph, and the table is just somewhere to keep the answers so you never solve the same alignment twice.",
    mechanics: [
      {
        heading: "State: how much of each string you have consumed",
        body: "`dp[i][j]` is the edit distance between the first `i` characters of `a` and the first `j` characters of `b`. Two indices, because progress through the two strings is independent — you can be four characters into one and one character into the other. Everything else about how you got here is irrelevant, which is what makes the table small enough to build.",
      },
      {
        heading: "Characters match: take the diagonal, free",
        body: "When `a[i-1] === b[j-1]`, `dp[i][j] = dp[i-1][j-1]`. No cost, no choice. It is worth being clear that this is not merely the cheapest option — pairing two identical characters is never worse than any alternative, so there is nothing to compare and no `min` is needed on this branch.",
      },
      {
        heading: "Characters differ: one plus the best of three, and each has a name",
        body: "`dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])`. Coming from `dp[i-1][j]` used a character of `a` and none of `b` — a deletion. From `dp[i][j-1]` is an insertion. From the diagonal is a substitution. Being able to say which neighbour means which edit is what lets you produce an edit *script* later, and it is the difference between reciting the recurrence and understanding it.",
      },
      {
        heading: "Base cases: turning a string into nothing",
        body: "`dp[i][0] = i` — with the second string empty, the only option is to delete all `i` characters. `dp[0][j] = j` symmetrically. So the first row and first column count 0, 1, 2, 3 … rather than being zeros. Filling them with zeros is the classic bug, and it makes every distance too small by exactly the length of the unmatched prefix.",
      },
      {
        heading: "The table holds numbers; the path holds the answer",
        body: "The corner cell is the distance, and for most uses that number is not what you actually want — a diff tool needs to know *which* lines changed, and a spell-checker wants the correction. Walk backwards from `dp[n][m]`, at each step asking which neighbour produced this value, and you recover the edit script in O(n + m). Most people compute the number and stop. The walk-back is the half that ships.",
      },
    ],
    complexityDerivation:
      "There are n × m states and each does one comparison and a minimum over three neighbours, so time is O(n · m) and the full table is the same in space. Space alone can be cut to O(min(n, m)) by rolling one row, since a row reads only the row above and the cell to its left — but doing so discards the edit script, so it is only correct when the caller genuinely wants the number. The important question is whether the quadratic time can be beaten, and the honest answer is: not in general. There is a conditional lower bound — if edit distance could be computed in O(n^(2−ε)) for any positive ε, then the Strong Exponential Time Hypothesis would be false, which would be a much bigger result than a faster diff. So the quadratic is not a failure of imagination. What real tools exploit instead is that their inputs are not adversarial: two versions of a source file are nearly identical. Myers' diff algorithm runs in O((N + D) · D) where D is the number of edits, so for a fifty-thousand-line file with two hundred changed lines the cost is tens of millions of operations rather than 2.5 billion. That is the shape of almost every practical escape from a quadratic bound — not a better worst case, but an algorithm whose cost tracks the answer's size rather than the input's.",
    variants: [
      {
        name: "Longest common subsequence",
        when: "You want what the strings share, not what it costs to convert.",
        delta:
          "Match adds 1 to the diagonal; mismatch takes the max of the two neighbours with no cost. Same table, and `lcs + distance` relationships are why diff tools compute one and report the other.",
      },
      {
        name: "Levenshtein with weights",
        when: "Some edits are more suspicious than others.",
        delta:
          "Replace the constant 1 with per-operation costs. Keyboard-adjacency costs for typo correction, or a cheap cost for vowel changes when matching transliterated names, both live here.",
      },
      {
        name: "Damerau–Levenshtein",
        when: "Transpositions matter — 'teh' for 'the'.",
        delta:
          "One extra transition reading `dp[i-2][j-2]` when the two characters are swapped. Cheap to add and it catches a large share of real human typos, which are far more often swaps than substitutions.",
      },
      {
        name: "Myers diff",
        when: "Diffing files, where the inputs are nearly identical.",
        delta:
          "Searches by edit count rather than filling a table: O((N + D) · D). Near-linear when D is small, and no better than the table when the inputs are unrelated. This is what git actually runs.",
      },
    ],
    tradeoffs: [
      {
        vs: "Myers diff",
        pick: "Myers for files, the table for short strings",
        because:
          "Myers wins enormously when the inputs are similar and wins nothing when they are not — its cost is driven by D, the number of edits. For two versions of a source file D is tiny and the table is 2.5 billion cells, so it is not a close call. For comparing two customer names of twenty characters each, the table is four hundred cells and Myers' extra machinery is not worth writing.",
      },
      {
        vs: "Rolling one row instead of the full table",
        pick: "The full table whenever the caller wants the edits",
        because:
          "Rolling drops space from O(n · m) to O(min(n, m)), which on long inputs is the difference between working and not. It also destroys every intermediate row, and the edit script is reconstructed by walking those rows backwards. If you only need the distance — a similarity threshold, a ranking score — roll it. If you need to show a user what changed, keep it. Hirschberg's algorithm gets both at the cost of running the DP twice, which is the answer when neither compromise is acceptable.",
      },
      {
        vs: "Trigram or MinHash similarity",
        pick: "Approximate matching once you are searching a large corpus",
        because:
          "Edit distance compares two strings; it does not search. Finding near-matches for one name among ten million is ten million quadratic comparisons. The standard structure is to shortlist with something cheap and index-friendly — trigram overlap, which a database can index directly — and then run exact edit distance only on the few dozen survivors. Proposing edit distance alone for a search problem is the mistake this trade-off exists to prevent.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — reconciling instrument names across brokers",
      kind: "yours",
      problem:
        "Zerodha, Groww and Paytm each name the same instrument slightly differently — spacing, expiry formatting, abbreviations of the underlying. An exact-match join drops rows, and a dropped row in a position reconciliation looks exactly like a missing position.",
      applied:
        "Normalise what can be normalised, then rank the remaining candidates by edit distance against the canonical symbol, with a threshold below which a match is accepted and above which it is flagged for a human. Weighting is what makes it usable: a digit difference in the strike is disqualifying, while a space or a hyphen costs almost nothing.",
      evidence: "strategy-engine/src/brokers/broker_manager.py",
      impact:
        "Silent row drops on an exact join → matched instruments with an explicit review queue",
    },
    {
      system: "git diff",
      kind: "industry",
      problem:
        "Showing what changed between two versions of a file. The plain table on two fifty-thousand-line files is 2.5 billion cells, which is neither fast enough nor small enough.",
      applied:
        "Treat each line as a single symbol — so 'characters' are lines — and run Myers' algorithm, which searches by number of edits rather than filling the table. Because two commits of the same file differ in a handful of lines, D is small and the cost is close to linear.",
      evidence: "Myers, 'An O(ND) Difference Algorithm and Its Variations' (1986)",
      impact: "2.5 billion cells → tens of millions of operations on a real commit",
    },
    {
      system: "Name matching on Indian identity records",
      kind: "industry",
      problem:
        "The same person's name is spelled several ways once it has been transliterated into Roman script — Shreeshyla and Sreeshaila, Lakshmi and Laxmi, Mohammed and Muhammad. Exact matching across a voter roll, a bank KYC record and a scheme database produces false mismatches on a huge scale.",
      applied:
        "Weighted edit distance where transliteration-equivalent substitutions are cheap and structural differences are expensive, usually combined with a phonetic key so the candidate set is small before any distance is computed. The weights are the part that needs local knowledge; the algorithm underneath is this table.",
      impact:
        "Exact-match failures on legitimate records → matches with a tunable, auditable threshold",
    },
    {
      system: "Sequence alignment in bioinformatics",
      kind: "industry",
      problem:
        "Comparing two DNA or protein sequences to find where they correspond, when one may have insertions and deletions relative to the other.",
      applied:
        "Needleman–Wunsch is edit distance with a scoring matrix instead of a flat cost of 1, and it is where the algorithm originates. The refinement that matters biologically is the affine gap penalty: one long gap is far more likely than several short ones, so opening a gap costs a lot and extending it costs little — which needs three parallel tables rather than one.",
      impact:
        "The foundation of the field, and the reason edit distance is taught with a scoring matrix rather than a constant",
    },
  ],
  lab: {
    prompt:
      "Return the edit distance between two strings: the smallest number of single-character insertions, deletions or substitutions that turns `a` into `b`. Budget: O(n · m), where n and m are the two lengths.",
    fnName: "editDistance",
    signature: "editDistance(a: string, b: string): number",
    starter: `function editDistance(a, b) {
// Your budget: O(n · m) time.
// dp[i][j] = distance between the first i chars of a and first j of b.
// Matching characters are free. Otherwise it costs 1 plus the best of
// three neighbours — and the first row and column are NOT zeros.

return 0;
}`,
    tests: [
      {
        // horse → rorse → rose → ros
        name: "horse to ros",
        input: ["horse", "ros"],
        expected: 3,
      },
      {
        name: "kitten to sitting",
        input: ["kitten", "sitting"],
        expected: 3,
      },
      {
        // The base cases carry this one entirely: delete everything.
        name: "second string empty",
        input: ["abc", ""],
        expected: 3,
      },
      {
        // The other base case. A solution that fills row 0 with zeros
        // returns 0 here.
        name: "first string empty",
        input: ["", "abc"],
        expected: 3,
      },
      { name: "identical strings", input: ["same", "same"], expected: 0 },
      { name: "both empty", input: ["", ""], expected: 0, hidden: true },
      {
        name: "intention to execution",
        input: ["intention", "execution"],
        expected: 5,
        hidden: true,
      },
      {
        // Every character differs and the lengths match, so it is five
        // substitutions — no insert or delete can beat that here.
        name: "nothing in common, equal lengths",
        input: ["abcde", "vwxyz"],
        expected: 5,
        hidden: true,
      },
    ],
    hints: [
      "Set up a table with `a.length + 1` rows and `b.length + 1` columns. Row 0 and column 0 are the cases where one string is empty — and turning a string of length i into an empty one costs i deletions, so they count 0, 1, 2, 3 … not zeros.",
      "For each cell, first check whether the characters match. `a[i-1] === b[j-1]` means you take `dp[i-1][j-1]` unchanged, with no cost and no choice to make.",
      "When they differ it is `1 + min` of three: `dp[i-1][j]` (delete from a), `dp[i][j-1]` (insert from b), `dp[i-1][j-1]` (substitute). Note the indices are off by one against the strings, because row i corresponds to character i−1.",
    ],
    solution: `function editDistance(a, b) {
const n = a.length;
const m = b.length;

// One rolling row of width m + 1. prev holds row i-1, curr holds row i.
// Base case for row 0: turning an empty string into b[0..j] costs j
// insertions, so the row counts up rather than being zeros.
let prev = Array.from({ length: m + 1 }, (_, j) => j);
const curr = new Array(m + 1);

for (let i = 1; i <= n; i++) {
  // Base case for column 0: turning a[0..i] into an empty string
  // costs i deletions.
  curr[0] = i;
  for (let j = 1; j <= m; j++) {
    if (a[i - 1] === b[j - 1]) {
      // Identical characters are never worth editing — take the
      // diagonal free, no comparison needed.
      curr[j] = prev[j - 1];
    } else {
      // delete from a, insert from b, or substitute.
      const del = prev[j];
      const ins = curr[j - 1];
      const sub = prev[j - 1];
      curr[j] = 1 + Math.min(del, ins, sub);
    }
  }
  // Swap, rather than allocating a fresh row each time.
  prev = curr.slice();
}

return prev[m];
}`,
    complexityGate: {
      target: "O(n·m)",
      // Both strings scale with the parameter, so the table is n × n and
      // the honest curve is quadratic. Pinning one string's length would
      // let an extra factor of the other hide inside the inner loop.
      //
      // The two alphabets are stepped differently so matches are sparse
      // and scattered — a solution that short-circuits on long identical
      // runs would otherwise measure far better than it deserves.
      gen: "(n) => [Array.from({ length: n }, (_, i) => String.fromCharCode(97 + ((i * 7) % 26))).join(''), Array.from({ length: n }, (_, i) => String.fromCharCode(97 + ((i * 11) % 26))).join('')]",
      sizes: [200, 400, 800, 1600],
    },
  },
  insights: [
    {
      t: "Match → diagonal; mismatch → best of the neighbours",
      d: "That single sentence is both LCS and edit distance. Only the cost model differs — edit distance minimises with a cost of 1, LCS maximises with a reward of 1.",
    },
    {
      t: "The table holds lengths; the path holds the answer",
      d: "Reconstructing the actual subsequence or edit script means walking backwards from the corner. Most people compute the number and stop — the walk-back is the half that ships in a diff tool.",
    },
    {
      t: "Myers diff beats the plain table for real files",
      d: "O(n·m) is unacceptable on large files. Myers runs in O((N+D)·D) where D is the edit distance — near-linear when the files are similar, which they nearly always are.",
    },
    {
      t: "Palindromes: expand around centres, or DP by length",
      d: "Centre expansion is O(n²) time and O(1) space, and is usually the better engineering answer than the O(n²) table because it needs no allocation at all.",
    },
    {
      t: "The first row and column count up, they are not zeros",
      d: "`dp[i][0] = i`, because turning an i-character string into nothing takes i deletions. Zeroing them makes every distance too small by the length of the unmatched prefix — and small errors in a similarity score are much harder to notice than crashes.",
    },
  ],
  pitfalls: [
    "Filling the first row and column with zeros instead of 0, 1, 2, 3. Every test where one string is a prefix of the other still passes.",
    "Mixing up the string index and the table index. Row `i` is about character `i−1`, and an off-by-one here produces distances that are plausible but wrong.",
    "Rolling the row down to save space and then trying to reconstruct the edit script from it. The information was deleted along with the rows.",
    "Reaching for edit distance to search a corpus. It compares two strings and does not index; shortlist with trigrams or a phonetic key first.",
  ],
  quiz: [
    {
      q: "In edit distance, the transitions from dp[i−1][j], dp[i][j−1] and dp[i−1][j−1] correspond to:",
      options: [
        "Insert, delete, replace",
        "Delete, insert, replace",
        "Replace, insert, delete",
        "Match, insert, delete",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Coming from dp[i−1][j] consumed a character of A without one from B — a delete. From dp[i][j−1] is an insert. The diagonal is a replace, or free when the characters match.",
      distractors: [
        "The first two are the right way round only if you swap which string is which. Fixing the convention and sticking to it is what makes the edit script readable later.",
        "",
        "The diagonal is listed first here, but dp[i−1][j] is not the diagonal — it is one row up in the same column.",
        "Match is not a separate transition. It is what happens on the diagonal when the characters agree, and it costs nothing.",
      ],
    },
    {
      q: "Someone initialises the first row and column of the edit-distance table to all zeros. What breaks?",
      options: [
        "Nothing — zeros are the natural starting value",
        "Distances come out too small, because turning an i-character string into an empty one costs i deletions, not 0",
        "The table goes out of bounds",
        "Only the LCS variant breaks",
      ],
      answer: 1,
      difficulty: "apply",
      why: "dp[i][0] means 'convert the first i characters into nothing'. That is i deletions. Zeroing it tells the recurrence that any prefix can be discarded for free, so every result is short by the unmatched prefix length.",
      distractors: [
        "Zeros are natural for LCS, where an empty string shares nothing — which is exactly why the mistake is so easy to carry across from one to the other.",
        "",
        "Indices are unaffected; the table has the same shape either way. The failure is a wrong number, which is far harder to spot than a crash.",
        "It is edit distance that breaks. LCS genuinely does start from zeros, and confusing the two is the origin of the bug.",
      ],
    },
    {
      q: "For diffing two 50,000-line files, the plain O(n·m) table is 2.5 billion cells. The practical alternative is:",
      options: [
        "Hash the lines and compare",
        "Myers diff — O((N+D)·D), which is near-linear when the files are similar",
        "Sort both files first",
        "Compare only the first 1000 lines",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Myers searches by number of edits rather than filling a table. Two commits of a file differ in a handful of lines, so D is small and the cost is nowhere near n · m.",
      distractors: [
        "Hashing lines is a genuine and necessary preprocessing step — it makes each comparison O(1) instead of O(line length) — but it does not reduce the number of cells, which is what is actually unaffordable.",
        "",
        "Sorting destroys line order, and line order is the entire content of a diff.",
        "That is not an alternative algorithm, it is deciding not to answer the question.",
      ],
    },
    {
      q: "Two strings of length n share no characters at all. Roughly what does Myers cost here?",
      options: [
        "Still near-linear",
        "About the same as the full table, because D is proportional to n",
        "O(n log n)",
        "It fails to terminate",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Myers' cost is O((N+D)·D), and D is the edit distance itself. When the inputs are unrelated D grows with n, so the bound degenerates to quadratic. Its advantage comes entirely from real inputs being similar — which is a property of the data, not of the algorithm.",
      distractors: [
        "Near-linear behaviour is conditional on D being small. Stating the bound without stating what D is is the most common way this algorithm gets misquoted.",
        "",
        "No log factor appears in Myers' bound. Nothing is being sorted or halved.",
        "It terminates correctly — it just offers no saving. Being slow is a very different failure from not finishing.",
      ],
    },
    {
      q: "You need the edit SCRIPT, not just the distance, and the strings are long enough that the full table will not fit. What do you do?",
      options: [
        "Roll the row and reconstruct from it afterwards",
        "Hirschberg's algorithm — divide and conquer, running the linear-space DP twice per split to recover the path",
        "Give up and return only the distance",
        "Store the table on disk",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Hirschberg finds where the optimal path crosses the middle column using two linear-space passes, then recurses on the two halves. It gets the script in O(n · m) time and O(min(n, m)) space — roughly twice the work for a linear-space result.",
      distractors: [
        "The rolled row overwrote every intermediate row, and the script is exactly what those rows encoded. There is nothing left to reconstruct from.",
        "",
        "It is a real fallback and worth saying out loud if the script is genuinely optional, but here the requirement was stated. An algorithm exists that meets both constraints.",
        "Spilling to disk turns a memory problem into an I/O problem across billions of cells. Hirschberg removes the need entirely.",
      ],
    },
    {
      q: "Matching customer names across two databases of ten million rows each. What is wrong with 'use edit distance'?",
      options: [
        "Edit distance is inaccurate for names",
        "It compares two strings and cannot search — ten million by ten million comparisons is the actual problem",
        "It is too slow per comparison",
        "It cannot handle non-English names",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Each comparison is cheap; there are 10^14 of them. The standard shape is a cheap indexable filter first — trigram overlap or a phonetic key — with exact edit distance run only on the few dozen survivors per row.",
      distractors: [
        "Accuracy is a tuning question and weighted variants handle names well. The blocker here is the number of pairs, not the quality of any one score.",
        "",
        "A twenty-by-twenty table is four hundred cells and takes microseconds. Per-comparison cost is not remotely the issue.",
        "It handles any alphabet, and weighted variants are precisely how transliteration differences get modelled. This is a real concern about the weights, not about the algorithm's reach.",
      ],
    },
    {
      q: "Which change turns the edit-distance recurrence into longest common subsequence?",
      options: [
        "Swap min for max, drop the +1 on mismatches, and add 1 on a match",
        "Reverse both strings first",
        "Change the base cases only",
        "Use max instead of min, changing nothing else",
      ],
      answer: 0,
      difficulty: "apply",
      why: "LCS rewards agreement rather than charging for disagreement: a match is `1 + dp[i−1][j−1]`, a mismatch is the better of the two neighbours at no cost, and the base row and column are zeros because an empty string shares nothing.",
      distractors: [
        "",
        "Reversing gives the LCS of the reversed strings, which has the same length but is a different alignment. It does not change what is being computed.",
        "The base cases do change — to zeros — but the transitions must change too, or you are still counting edits.",
        "Maximising the cost of edits gives you the *worst* alignment, which is a well-defined and completely useless number.",
      ],
    },
    {
      q: "Somebody claims edit distance 'must be improvable below O(n·m) with a clever data structure'. What is the honest answer in a design review?",
      options: [
        "Agree and look for one",
        "There is a conditional lower bound: a truly sub-quadratic algorithm would refute the Strong Exponential Time Hypothesis, so effort is better spent exploiting the inputs being similar",
        "It is impossible, full stop",
        "Use a GPU instead",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The bound is conditional rather than absolute, and saying so precisely is the point: nobody has proved it impossible, but doing it would overturn a major hypothesis. That is what redirects the conversation to Myers, banded DP and bit-parallel tricks, all of which exploit properties of real inputs.",
      distractors: [
        "It is a reasonable instinct, but it is a search that decades of work has already run. Knowing the result exists is what saves the sprint.",
        "",
        "Overclaiming. No unconditional lower bound is known, and being caught overstating a complexity result costs you credibility on the parts you had right.",
        "Hardware changes the constant, not the class. A GPU on 2.5 billion cells is still 2.5 billion cells, and Myers avoids nearly all of them on the same CPU.",
      ],
    },
  ],
};

import type { Topic } from "../types.ts";

export const backtracking: Topic = {
  id: "backtracking",
  title: "Backtracking",
  tier: 1,
  week: 8,
  depth: "core",
  summary: "Permutations, combinations, subsets, N-queens, sudoku.",
  why: "The systematic way to search an exponential space without writing an exponential mess. Pruning is what separates a solver that answers in milliseconds from one that hangs, and the ability to name the pruning condition is what interviewers are actually testing.",
  complexity: "Exponential, reduced by pruning",
  learn: {
    intuition:
      "Some problems have no clever formula — you genuinely have to try possibilities. Backtracking is the disciplined way to do that. Build a solution one decision at a time. After each decision, ask whether what you have so far could still lead to a valid answer. If it cannot, stop immediately and undo the last decision rather than continuing to fill in a doomed arrangement. That early stop is the entire point: it removes not one candidate but every candidate that would have started with that prefix — an entire branch of the search tree at once. Think of solving a sudoku by hand. You do not fill the whole grid and then check it. You place a number, notice it clashes with the column, erase it, and try the next one. Backtracking is that, written down precisely.",
    mechanics: [
      {
        heading: "Choose, explore, un-choose",
        body: "The skeleton never varies. Make a decision and record it in a shared working structure; recurse to make the next decision; then remove the decision on the way back out. Undoing is what lets one mutable structure serve the whole search instead of copying the state at every node.",
      },
      {
        heading: "Define the base case as 'a complete solution'",
        body: "When every decision has been made, record a COPY of the working structure. Copying matters — pushing the working array itself stores a reference that later mutations will change, and you end up with a result list full of identical empty arrays.",
      },
      {
        heading: "Prune as early as the information allows",
        body: "Before recursing, ask whether this partial solution is already impossible. In N-queens, a queen on an attacked diagonal is doomed, and checking it before recursing removes every arrangement beginning that way. Pruning at depth 2 saves vastly more than pruning at depth 7.",
      },
      {
        heading: "Make the pruning check cheap",
        body: "A prune that costs O(n) to evaluate can cost more than the branch it saves. N-queens goes from hopeless to instant by keeping sets of attacked columns and diagonals, so the check is a constant-time lookup instead of a board scan.",
      },
      {
        heading: "Handle duplicates by sorting and skipping",
        body: "With repeated input values, sort first and then skip a value when it equals its predecessor and the predecessor was not used at this level. This produces each distinct combination once, without the memory cost of collecting everything and deduplicating afterwards.",
      },
    ],
    complexityDerivation:
      "The honest answer is that backtracking is exponential and pruning changes the constant in the exponent rather than removing it. Count the shape of the search tree: with n items and a binary include-or-exclude decision, there are 2^n leaves; for permutations there are n! of them. Multiply by the work done per node — usually O(n) if you copy a solution or scan for validity. So subsets is O(n · 2^n) and permutations O(n · n!), and those are the bounds you quote. Pruning does not change the class in the worst case, because an input can always be constructed where nothing prunes. What it changes is the actual tree explored, and in practice that difference is everything: naive N-queens for n = 8 explores about 16 million placements, while constraint-set pruning explores about 15,000. The rule to carry away is that the value of a prune is the size of the subtree it removes, which is exponential in the remaining depth — so a cheap check applied early beats a clever check applied late, every time.",
    variants: [
      {
        name: "Subsets / power set",
        when: "Every element is independently in or out.",
        delta:
          "Binary decision per element, 2^n results. Often expressible as a bitmask loop instead of recursion.",
      },
      {
        name: "Permutations",
        when: "Order matters and every element is used exactly once.",
        delta:
          "n! results. Track which elements are used with a boolean array, or swap elements into place to avoid the extra structure.",
      },
      {
        name: "Combinations with a target",
        when: "Coin combinations, subset sum, k-of-n selections.",
        delta:
          "Pass a start index so each combination is generated in one canonical order, and prune the moment the running total exceeds the target.",
      },
      {
        name: "Constraint satisfaction",
        when: "N-queens, sudoku, graph colouring, scheduling.",
        delta:
          "The pruning is the algorithm. Add constraint propagation — most-constrained-variable ordering, forward checking — and the practical limit moves by orders of magnitude.",
      },
    ],
    tradeoffs: [
      {
        vs: "Dynamic programming",
        pick: "DP when sub-problems overlap, backtracking when you need the actual arrangements",
        because:
          "DP collapses overlapping sub-problems into a table and answers 'how many' or 'what is the best' efficiently. Backtracking enumerates, and enumeration is inherently exponential because the output itself is exponential. If you only need a count or an optimum, ask whether the state can be memoised before you enumerate.",
      },
      {
        vs: "Iterative bitmask enumeration",
        pick: "Bitmask for subsets when n is at most about 20",
        because:
          "A loop from 0 to 2^n with bit tests is faster, has no recursion, and is often shorter. Backtracking wins the moment you need pruning, because a flat loop cannot skip a branch it has already committed to enumerating.",
      },
      {
        vs: "A dedicated solver (SAT, ILP, constraint programming)",
        pick: "A solver for real scheduling and assignment problems",
        because:
          "Hand-written backtracking is right for interview-scale problems and for cases with unusual structure. Production scheduling with thousands of variables belongs in a solver that already implements clause learning and propagation, which no reasonable amount of hand-written pruning will match.",
      },
    ],
  },
  realWorld: [
    {
      system: "Regular expression engines",
      kind: "industry",
      problem:
        "Matching a pattern with alternation and quantifiers requires trying possibilities — if one branch fails, the engine must return to the last decision point and try the next.",
      applied:
        "Backtracking regex engines do exactly choose-explore-un-choose over the pattern. It also explains ReDoS: with nested quantifiers the number of ways to split the input is exponential, and nothing prunes them, so a crafted string pins a CPU.",
      impact: "Flexible matching, at the cost of an exponential worst case",
    },
    {
      system: "Package dependency resolution (pip, npm, apt)",
      kind: "industry",
      problem:
        "Choosing a version for every package such that all constraints are satisfied. Choices interact, so a version picked early can be invalidated by a requirement discovered later.",
      applied:
        "Resolvers backtrack over version choices with constraint propagation, and modern ones (pip's 2020 resolver, Dart's PubGrub) add conflict-driven learning so the same dead end is not explored twice. This is a real production system whose core is this algorithm.",
      evidence: "PubGrub: 'Next-Generation Version Solving'",
    },
    {
      system: "Type inference and overload resolution",
      kind: "industry",
      problem:
        "A compiler must choose among candidate overloads or type instantiations, where a choice may only be revealed as wrong further along the expression.",
      applied:
        "The checker tentatively commits to a candidate, explores, and unwinds on failure. TypeScript's inference and Rust's trait resolution both do this, and both cap the search depth precisely because it is exponential.",
    },
    {
      system: "traed — parameter sweeps and strategy configuration search",
      kind: "yours",
      problem:
        "Searching combinations of strategy parameters where many combinations are invalid — incompatible expiries, strikes outside the chain, risk limits exceeded.",
      applied:
        "Order the parameters so the most constraining decision is made first, and reject a partial configuration as soon as a limit is breached rather than after the full combination is assembled. That reordering alone removes most of the search tree.",
      impact: "Whole invalid branches eliminated before they are enumerated",
    },
  ],
  lab: {
    prompt:
      "Return all subsets whose elements sum to `target`. The input may contain duplicates, and each element may be used at most once. Every distinct subset must appear exactly once, sorted ascending, and the outer list must be sorted too. `combinations([2,5,2,1,2], 5)` gives `[[1,2,2],[5]]`. Prune the moment the running total exceeds the target — that single check removes most of the search tree.",
    fnName: "combinations",
    signature: "combinations(nums: number[], target: number): number[][]",
    starter: `function combinations(nums, target) {
  // Sort first: it makes duplicate-skipping possible AND lets you stop
  // scanning as soon as a value overshoots the remaining target.
  // Skeleton: choose -> explore -> un-choose.
  // Push a COPY of the working array, not the array itself.

  return [];
}`,
    tests: [
      {
        name: "duplicates in the input, distinct subsets out",
        input: [[2, 5, 2, 1, 2], 5],
        expected: [[1, 2, 2], [5]],
      },
      {
        name: "classic",
        input: [[10, 1, 2, 7, 6, 1, 5], 8],
        expected: [
          [1, 1, 6],
          [1, 2, 5],
          [1, 7],
          [2, 6],
        ],
      },
      {
        name: "no subset reaches the target",
        input: [[2, 4, 6], 5],
        expected: [],
      },
      {
        // The empty subset sums to 0. Whether it counts is a real design
        // question — here it does, and the answer must be stated explicitly
        // rather than falling out of the loop by accident.
        name: "target zero is the empty subset",
        input: [[1, 2], 0],
        expected: [[]],
      },
      {
        name: "single element matches exactly",
        input: [[5], 5],
        expected: [[5]],
      },
      {
        name: "empty input",
        input: [[], 3],
        expected: [],
        hidden: true,
      },
      {
        name: "all identical values",
        input: [[2, 2, 2], 4],
        expected: [[2, 2]],
        hidden: true,
      },
      {
        name: "every element needed",
        input: [[1, 2, 3], 6],
        expected: [[1, 2, 3]],
        hidden: true,
      },
    ],
    hints: [
      "Sort `nums` first. Recurse with a start index so each subset is built in ascending order, which stops the same set appearing in several orders.",
      "At each level, loop `i` from `start`. If `nums[i]` is greater than the remaining target, `break` — because the array is sorted, everything after it also overshoots.",
      "To skip duplicates: inside the loop, `if (i > start && nums[i] === nums[i-1]) continue;`. The `i > start` part is essential — it allows the duplicate to be used at a DEEPER level, just not twice as the choice at this level.",
    ],
    solution: `function combinations(nums, target) {
  const sorted = [...nums].sort((a, b) => a - b);
  const out = [];
  const path = [];

  function explore(start, remaining) {
    if (remaining === 0) {
      out.push([...path]);   // a COPY — path keeps mutating after this
      return;
    }

    for (let i = start; i < sorted.length; i++) {
      // Sorted, so once one value overshoots, so does everything after it.
      if (sorted[i] > remaining) break;

      // Skip a repeat only when it would be the same CHOICE at this level.
      // i > start is what still allows [2,2] to be built at deeper levels.
      if (i > start && sorted[i] === sorted[i - 1]) continue;

      path.push(sorted[i]);            // choose
      explore(i + 1, remaining - sorted[i]);   // explore
      path.pop();                      // un-choose
    }
  }

  explore(0, target);
  return out;
}`,
  },
  insights: [
    {
      t: "Choose → explore → un-choose",
      d: "The shape never varies. Mutating one shared working structure and restoring it on the way out is what makes backtracking allocation-cheap.",
    },
    {
      t: "Pruning is the entire performance story",
      d: "N-queens is hopeless by brute force and instant with column and diagonal constraint sets. Ask what makes a partial solution already doomed, and check it as early as possible.",
    },
    {
      t: "Sort first to skip duplicates",
      d: "For combinations with repeats, sorting lets you skip an element when it equals its predecessor and the predecessor was not chosen at this level — the standard duplicate-suppression trick.",
    },
    {
      t: "Push a copy, not the working array",
      d: "The working array keeps changing after you store it. This produces a result list where every entry is the same array — usually empty by the time you look at it.",
    },
    {
      t: "A prune's value is exponential in the remaining depth",
      d: "Rejecting at depth 2 removes vastly more than rejecting at depth 7. Cheap and early beats clever and late, every time.",
    },
  ],
  pitfalls: [
    "Storing the working array instead of a copy. Every result ends up identical, and usually empty.",
    "Forgetting to un-choose. State leaks into sibling branches and the results are wrong in ways that look random.",
    "Writing `i > 0` instead of `i > start` in the duplicate skip. That also forbids legitimate uses of the duplicate at deeper levels, so `[2,2]` never appears.",
    "Pruning with an expensive check. If validating a partial solution costs more than exploring it, the prune is a loss.",
  ],
  quiz: [
    {
      q: "What single change most improves an N-queens backtracker?",
      options: [
        "Using iteration instead of recursion",
        "Tracking attacked columns and diagonals in sets so conflicts are rejected in O(1) instead of scanning the board",
        "Sorting the board",
        "Memoising board states",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Early, cheap pruning cuts whole subtrees. Scanning the board per placement is exactly what makes the naive version hopeless — and it makes the prune so expensive that it barely pays for itself.",
      distractors: [
        "It changes where the stack lives and does nothing about how many arrangements are explored.",
        "",
        "There is nothing to sort — the board is a fixed grid and positions are not comparable.",
        "Board states almost never repeat in N-queens, so a cache would consume memory with near-zero hit rate.",
      ],
    },
    {
      q: "The universal backtracking skeleton is:",
      options: [
        "Explore, choose, return",
        "Choose → explore → un-choose (restore state)",
        "Sort, scan, prune",
        "Memoise, recurse, tabulate",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Undoing the choice on the way out is what allows one mutable working structure to serve the whole search rather than copying state at every node.",
      distractors: [
        "You cannot explore before deciding what to explore, and nothing here restores state.",
        "",
        "Sorting and pruning are useful additions, not the skeleton itself.",
        "That is the memoisation-to-DP progression, which is a different technique for a different situation.",
      ],
    },
    {
      q: "Your subset generator returns a list where every entry is the same empty array. What went wrong?",
      options: [
        "The base case is never reached",
        "You pushed the working array itself instead of a copy, so every stored reference points at the same array that later got emptied",
        "The recursion is too deep",
        "You forgot to sort",
      ],
      answer: 1,
      difficulty: "apply",
      why: "`out.push(path)` stores a reference. The un-choose steps then pop `path` back to empty, and every stored reference shows that same empty array. `out.push([...path])` fixes it.",
      distractors: [
        "It is reached — that is why there are entries at all. They are simply all the same object.",
        "",
        "Depth would produce a stack overflow, not wrong contents.",
        "Sorting affects duplicate handling and pruning, not aliasing.",
      ],
    },
    {
      q: "In the duplicate skip `if (i > start && nums[i] === nums[i-1]) continue;`, why `i > start` rather than `i > 0`?",
      options: [
        "To avoid an index error",
        "Because a duplicate must still be usable at a DEEPER level — the skip only forbids it as a repeated choice at the SAME level",
        "For performance",
        "There is no difference",
      ],
      answer: 1,
      difficulty: "judge",
      why: "With `i > 0` you also forbid the second 2 from being chosen after the first 2 was already taken, so `[2,2]` never gets built. The condition must say 'I already tried this value in this position', which is what `i > start` expresses.",
      distractors: [
        "`i > 0` guards the `i-1` access perfectly well. The problem is what it excludes.",
        "",
        "Both are one comparison. This is a correctness distinction, not a speed one.",
        "They produce different answers on any input with repeated values.",
      ],
    },
    {
      q: "You need the COUNT of valid arrangements, not the arrangements themselves. What should you check first?",
      options: [
        "Whether the enumeration can be made faster",
        "Whether the sub-problems overlap, so a memoised state can replace enumeration entirely",
        "Whether to use iteration",
        "Whether to parallelise",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Enumeration is exponential because the output is exponential. If you only need a count, that constraint disappears — and if states repeat, dynamic programming answers it in polynomial time. That is the difference between listing every path in a grid and counting them with binomial coefficients.",
      distractors: [
        "Making an exponential enumeration faster still leaves it exponential.",
        "",
        "Iteration versus recursion is a stack question, not a complexity one.",
        "Parallelism divides an exponential by the core count, which buys you a couple of extra input elements.",
      ],
    },
    {
      q: "Why is a backtracking regular expression engine vulnerable to ReDoS?",
      options: [
        "It uses too much memory",
        "With nested quantifiers the number of ways to split the input is exponential, and nothing prunes them",
        "It compiles patterns slowly",
        "It cannot handle Unicode",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The engine tries every division of the input among the quantifiers, and a failing match forces it to try all of them. There is no way to detect a doomed prefix, so no pruning is possible — which is why RE2 and Rust's regex crate use automata instead and guarantee linear time.",
      distractors: [
        "Backtracking uses stack proportional to the pattern, which is small. The cost is time.",
        "",
        "Compilation happens once. The blow-up is per match, on attacker-controlled input.",
        "Unicode support is orthogonal to the backtracking behaviour.",
      ],
    },
    {
      q: "For subsets of n ≤ 20 elements with NO pruning needed, what is often simpler than recursion?",
      options: [
        "A queue",
        "A loop from 0 to 2^n, using each number's bits to select elements",
        "Sorting",
        "Memoisation",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Every subset corresponds to a binary number: bit i set means element i is included. It is a flat loop with no recursion and no stack. Backtracking wins the moment you need to prune, which a flat loop cannot do.",
      distractors: [
        "A queue would give breadth-first enumeration with far more memory and no benefit.",
        "",
        "Sorting helps with duplicates and pruning, neither of which this case has.",
        "Nothing repeats — every subset is generated exactly once, so there is nothing to cache.",
      ],
    },
    {
      q: "Two prunes are available: one costs O(1) and rejects 30% of branches at depth 2; the other costs O(n) and rejects 60% at depth 8. Which is worth more?",
      options: [
        "The 60% one, because it rejects more",
        "The O(1) one at depth 2, because the subtree it removes is exponentially larger and the check is free",
        "Both are equal",
        "Neither — pruning does not change the complexity class",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A branch cut at depth 2 removes everything beneath it, which is exponential in the remaining depth. At depth 8 most of the work has already been done. Combine that with the O(n) check running at every node, and the late prune can easily cost more than it saves.",
      distractors: [
        "Percentage of branches is the wrong measure. What matters is the size of the subtrees removed.",
        "",
        "They differ by orders of magnitude in practice.",
        "True in the worst case and irrelevant in practice — for N-queens it is the difference between 16 million placements and 15,000.",
      ],
    },
  ],
};

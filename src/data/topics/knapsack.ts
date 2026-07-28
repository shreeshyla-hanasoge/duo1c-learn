import type { Topic } from "../types.ts";

export const knapsack: Topic = {
  id: "knapsack",
  title: "Knapsack family",
  tier: 3,
  week: 14,
  depth: "deep",
  summary: "0/1, unbounded, subset-sum, partition.",
  why: "The shape of every constrained allocation problem: position sizing under a capital budget, cutting stock, budget planning.",
  complexity: "O(n · C)",
  viz: ["knapsack"],
  learn: {
    intuition:
      "You have a bag that holds a fixed weight and a pile of items, each with a weight and a value. Take the most valuable load that fits. The tempting move is to rank items by value per kilogram and take the best ones until the bag is full — and that is genuinely optimal if you are allowed to take *half* an item, because then the last item just gets sliced to fit. The moment items are indivisible that argument collapses: a slightly worse-per-kilogram item can be the one that fills the remaining space exactly, and the best ratio can be the thing that wastes the most room. So you cannot decide an item in isolation. What you can do is ask a question with a small answer: 'considering only the first i items, and if the bag had capacity c, what is the best value?' That is one number for each (i, c) pair, and each one is settled by a single yes or no — take item i, or leave it. The room remaining is the only thing the future needs to know about the past, which is why the table has exactly two axes and no more.",
    mechanics: [
      {
        heading:
          "State: how many items you have considered, and how much room is left",
        body: "`dp[i][c]` is the best value obtainable from the first `i` items without exceeding capacity `c`. Both indices are needed. Dropping `c` and keeping only `i` is the most common wrong start, and it fails because two different selections from the same items leave different room for whatever comes next.",
      },
      {
        heading: "Transition: one yes/no per item",
        body: "Skip item `i` and you keep `dp[i-1][c]`. Take it — legal only when `weight[i] <= c` — and you get `value[i] + dp[i-1][c - weight[i]]`, because taking it consumes exactly that much room and item `i` is now spent. `dp[i][c]` is the larger of the two. Note that the take branch reads row `i-1`, not row `i`. That is what makes this 0/1 rather than unbounded.",
      },
      {
        heading: "Base case: no items means no value, at every capacity",
        body: "Row 0 is all zeros. Write that row out explicitly rather than special-casing `i === 0` inside the loop; the whole first real row then comes from the recurrence and there is nothing left to get wrong.",
      },
      {
        heading: "Collapse to one row, and iterate capacity DOWNWARD",
        body: "Row `i` only ever reads row `i-1`, so a single array of length `C+1` suffices. But now the direction matters, and it is the single most important detail in this topic. Going upward, `dp[c - weight[i]]` has *already been updated for item i this round*, so item `i` gets taken a second time. Going downward, everything you read still holds last round's value. The loop direction is not a style choice — it is the difference between 0/1 and unbounded, and it is a favourite interview question precisely because the two versions differ by one character.",
      },
      {
        heading: "Read the rest of the family off the same table",
        body: "Unbounded knapsack is this code with the capacity loop running upward, deliberately. Subset-sum replaces value with a boolean 'is this exact total reachable'. Partition into two equal halves is subset-sum for `total / 2`, and is impossible on sight when `total` is odd. Recognising that a new problem is one of these in disguise is most of the work in an interview.",
      },
    ],
    complexityDerivation:
      "There are n × C states, one per (item, capacity) pair, and each does a comparison and an addition, so time is O(n · C) and the 2D space matches. The one-row version drops space to O(C). Now the part that matters more than the formula: this is pseudo-polynomial, not polynomial. C appears as a *value*, but the input only spends about log₂(C) bits writing it down. Doubling the number of digits in the capacity squares the table. So a capacity of ten thousand is a trivial table, and a capacity of ten billion — an ordinary rupee amount once you count in paise — is 10^10 cells and completely infeasible, even though the input grew by ten characters. That is why 0/1 knapsack is NP-hard despite the friendly-looking bound, and why the honest answer when C is large is a different technique altogether: branch and bound, an integer-programming solver, or a fully-polynomial approximation that scales the values down and accepts a stated error. Being able to say that out loud is what separates somebody who has memorised the recurrence from somebody who can be trusted to choose it.",
    variants: [
      {
        name: "0/1 knapsack",
        when: "Each item exists once. The default.",
        delta:
          "Capacity loop runs downward in the one-row form: `dp[c] = max(dp[c], value[i] + dp[c - weight[i]])`.",
      },
      {
        name: "Unbounded knapsack",
        when: "Unlimited copies of each item — coin change, cutting a rod, rate cards.",
        delta:
          "The identical line, with the capacity loop running upward so an item can feed on its own updates. One character of difference, and it is the character.",
      },
      {
        name: "Bounded knapsack (at most k copies)",
        when: "Stock limits, lot-size caps, position limits.",
        delta:
          "Naively k copies of each item, multiplying the work by k. The standard trick is binary splitting: pseudo-items of size 1, 2, 4, 8 … so any count up to k is reachable, turning a factor of k into log k.",
      },
      {
        name: "Subset-sum and partition",
        when: "You need reachability, not value — reconciliation, equal splits.",
        delta:
          "The table becomes boolean, so a bitset holds a whole row and shifts it by the item's weight in one operation. A 64× constant-factor win, which for a pseudo-polynomial algorithm is often the difference between usable and not.",
      },
    ],
    tradeoffs: [
      {
        vs: "Greedy by value density",
        pick: "Dynamic programming, whenever items are indivisible",
        because:
          "Greedy is provably optimal for the *fractional* knapsack, where the last item can be sliced to fill the bag exactly. Indivisible items remove that escape and the proof with it. On weights [3, 4, 5] with values [30, 50, 60] and capacity 8, density ranks item 1 highest; greedy takes it, then cannot fit item 2, falls back to item 0 and reaches 80. Taking items 0 and 2 fills the bag exactly for 90.",
      },
      {
        vs: "An integer-programming solver, or branch and bound",
        pick: "The solver, once C is large or there is more than one constraint",
        because:
          "The table is proportional to the capacity *value*, so it dies on large budgets, while a solver's difficulty tracks the structure of the problem instead. The DP also handles exactly one constraint; the moment you have both a capital budget and a margin limit, the table gains a dimension and multiplies out. In a design review the sentence you want is 'the DP is fine while the budget is in the thousands — past that we move to a solver, or accept an approximation with a stated bound'.",
      },
      {
        vs: "Keeping the full 2D table instead of one row",
        pick: "The 2D table when you need to know WHICH items",
        because:
          "The one-row version returns the best value and destroys the evidence. Reconstruction walks backwards from `dp[n][C]` asking at each row whether the value came from skipping or taking, and that needs every row to still exist — O(n · C) memory rather than O(C). Most production uses want the chosen set rather than the total, so this is the more common configuration despite the one-row version being the one people memorise.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — position sizing under a capital budget",
      kind: "yours",
      problem:
        "Several strategies fire signals in the same window and the account has finite deployable margin. Positions come in indivisible lot sizes, so the best expected-return-per-rupee signal is not automatically the one to fund — funding it can leave a remainder too small to open anything else.",
      applied:
        "Treat each candidate position as an item whose weight is its margin requirement and whose value is its expected return, then run 0/1 knapsack over the available margin. Lot-size indivisibility is exactly what rules out the per-trade ratio heuristic and forces the joint decision.",
      evidence: "strategy-engine/src/config/strategy_config.py",
      impact:
        "Per-signal greedy sizing → jointly optimal allocation under one budget",
    },
    {
      system: "Kubernetes scheduling and cloud bin packing",
      kind: "industry",
      problem:
        "Placing pods with CPU and memory requests onto nodes of fixed capacity. Filling greedily by request size strands fragments — a node with 30% free that nothing fits into — and stranded capacity is money.",
      applied:
        "Node fit is knapsack-shaped: indivisible items, a hard capacity, maximise what you pack. Real schedulers use scoring heuristics rather than an exact DP, because decisions must land in milliseconds and the cluster changes underneath them. The framing is still what tells you the greedy answer is an approximation, and why a rebalancer has to exist behind it.",
      impact:
        "Explains why fragmentation happens and why defragmentation is a separate job",
    },
    {
      system: "Payment reconciliation — subset-sum",
      kind: "industry",
      problem:
        "A bank settles a day's card and UPI collections as a single lump credit. Finance has to work out which individual transactions that credit represents, because fees, chargebacks and timing differences mean it is never simply 'everything from yesterday'.",
      applied:
        "'Which subset of these amounts sums to exactly this total' is subset-sum, the boolean member of the family. Holding amounts in paise keeps everything integral, which is what makes the table indexable at all — the same problem in floating-point rupees has no table.",
      impact:
        "Manual matching → an exact answer, with the honest caveat that several different subsets can sum alike",
    },
    {
      system: "Cutting stock in manufacturing",
      kind: "industry",
      problem:
        "A steel or textile mill takes orders for many short lengths and holds stock as fixed long rolls. Cutting greedily — longest order first — leaves offcuts too short to sell, and an offcut is pure loss.",
      applied:
        "Each roll is a capacity and each order length is an item, so filling one roll is unbounded knapsack, since an order length can be cut repeatedly. The full multi-roll problem is harder and is where industry moved to column generation, but the per-roll step is exactly this table.",
      impact: "Waste cut by planning the whole roll rather than one cut at a time",
    },
  ],
  lab: {
    prompt:
      "Classic 0/1 knapsack. Given `weights`, `values` (same length) and an integer `capacity`, return the greatest total value of a subset whose total weight is at most `capacity`. Each item may be taken at most ONCE. Budget: O(n · C). Ranking by value-per-weight and taking greedily is fast, passes several of the tests, and is not optimal.",
    fnName: "knapsack",
    signature:
      "knapsack(weights: number[], values: number[], capacity: number): number",
    starter: `function knapsack(weights, values, capacity) {
// Your budget: O(n · C) time.
// dp[c] = best value achievable with c capacity available.
// For each item, decide take-or-skip at every capacity.
// The direction of the capacity loop decides whether an item can be
// taken twice. Work out which direction you need.

return 0;
}`,
    tests: [
      {
        // Items 1 and 3 weigh 3 + 4 = 7 and are worth 4 + 5 = 9.
        name: "classic case",
        input: [
          [1, 3, 4, 5],
          [1, 4, 5, 7],
          7,
        ],
        expected: 9,
      },
      {
        // Density ranks item 1 first at 12.5 per unit. Greedy takes it,
        // then cannot fit item 2, falls back to item 0 and reaches 80.
        // Items 0 and 2 fill the bag exactly for 90.
        name: "value density is not optimal",
        input: [
          [3, 4, 5],
          [30, 50, 60],
          8,
        ],
        expected: 90,
      },
      {
        name: "everything fits",
        input: [
          [1, 2, 3],
          [6, 10, 12],
          6,
        ],
        expected: 28,
      },
      {
        name: "nothing fits",
        input: [[5], [10], 4],
        expected: 0,
      },
      {
        // THE test for loop direction. Capacity 5 has room for two copies
        // of the only item, but 0/1 allows one. An upward capacity loop
        // returns 6 here and passes every other test in this list.
        name: "an item may be taken only once",
        input: [[2], [3], 5],
        expected: 3,
      },
      {
        name: "zero capacity",
        input: [[1, 2], [5, 9], 0],
        expected: 0,
        hidden: true,
      },
      { name: "no items at all", input: [[], [], 10], expected: 0, hidden: true },
      {
        // Three identical items with room for two. Catches a solution that
        // de-duplicates items by weight or by value.
        name: "identical items are still separate items",
        input: [
          [3, 3, 3],
          [4, 4, 4],
          7,
        ],
        expected: 8,
        hidden: true,
      },
    ],
    hints: [
      "Use a single array `dp` of length `capacity + 1`, all zeros. `dp[c]` holds the best value reachable using the items processed so far, with `c` capacity available.",
      "For each item, and each capacity `c` at least as large as the item's weight, the choice is `dp[c]` (skip) versus `values[i] + dp[c - weights[i]]` (take). Keep the larger.",
      "Now the direction. If `c` increases, then by the time you read `dp[c - weights[i]]` you have already updated it for this same item — so the item gets taken twice. Run `c` downward, from `capacity` to `weights[i]`, and everything you read still belongs to the previous item.",
    ],
    solution: `function knapsack(weights, values, capacity) {
// One row of the table. dp[c] = best value with c capacity available,
// using only the items processed so far.
const dp = new Array(capacity + 1).fill(0);

for (let i = 0; i < weights.length; i++) {
  const w = weights[i];
  const v = values[i];
  // DOWNWARD. Upward would read dp[c - w] after it had already been
  // updated for this same item, letting item i be taken twice — which
  // is unbounded knapsack, not 0/1.
  for (let c = capacity; c >= w; c--) {
    const take = v + dp[c - w];
    if (take > dp[c]) dp[c] = take;
  }
}

return dp[capacity];
}`,
    complexityGate: {
      target: "O(n·m)",
      // Both dimensions scale together: n items and a capacity of n, so the
      // table is n × n and the honest curve is quadratic. Scaling only the
      // item count would let an extra factor of capacity hide.
      //
      // Weights cycle through 1..20 so capacity is always the binding
      // constraint. If everything fitted, a wrong solution that simply sums
      // every value would pass.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i % 20) + 1), Array.from({ length: n }, (_, i) => (i * 17) % 97), n]",
      sizes: [200, 400, 800, 1600],
    },
  },
  insights: [
    {
      t: "Greedy by value density is not optimal for 0/1",
      d: "It is optimal for the *fractional* knapsack only, where the last item can be sliced to fill the bag exactly. The moment items are indivisible that proof disappears and DP is required — which is exactly why joint position sizing needs DP rather than per-trade heuristics.",
    },
    {
      t: "0/1 iterates capacity DOWNWARD in the 1D version",
      d: "Going upward lets the same item be taken twice, because `dp[c − w]` has already been updated this round. That silently turns 0/1 into unbounded. The loop direction *is* the distinction between the two problems.",
    },
    {
      t: "Pseudo-polynomial, not polynomial",
      d: "O(n·C) is polynomial in the capacity's *value*, not in the number of digits used to write it down. Ten more characters of capacity multiply the table by 10^10, which is why the problem is NP-hard despite the friendly-looking bound.",
    },
    {
      t: "Subset-sum and partition are the same table",
      d: "Partition into equal halves is subset-sum for `total / 2`, and is impossible on sight when the total is odd. Recognising the reduction is most of the work.",
    },
    {
      t: "The one-row version cannot tell you which items",
      d: "Rolling down to a single array destroys the evidence needed to reconstruct the selection. If the caller wants the set rather than the total, keep all n rows and walk back from the corner.",
    },
  ],
  pitfalls: [
    "Running the capacity loop upward in the 1D version. Every small test still passes; the bug only surfaces when one item could usefully be taken twice.",
    "Indexing the table by a floating-point capacity — rupees rather than paise. Table indices must be integers, and rounding turns a correct recurrence into a silently wrong one.",
    "Assuming O(n·C) means fast. A budget of a few crore in paise is a table nobody can allocate, and the fix is a different algorithm rather than a tighter loop.",
    "Forgetting to check that the total is even before building a partition table at all.",
  ],
  quiz: [
    {
      q: "In the one-array 0/1 knapsack, why must the capacity loop run downward?",
      options: [
        "It is faster in that direction because of cache behaviour",
        "Going upward reads dp[c − w] after it was already updated for this same item, so the item can be taken more than once",
        "The array would go out of bounds otherwise",
        "It makes the base case unnecessary",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The one-row form overwrites the previous item's row in place. Downward means everything you read still belongs to the previous item; upward means some of it belongs to this one, which is precisely the definition of unbounded knapsack.",
      distractors: [
        "Downward traversal is if anything slightly worse for hardware prefetching. The reason is correctness, not speed.",
        "",
        "Both directions stay in range — the loop stops at the item's weight either way. The failure is a wrong answer, not a crash.",
        "The base case is the all-zero row, and it is needed regardless of direction.",
      ],
    },
    {
      q: "O(n · C) for knapsack is called pseudo-polynomial because:",
      options: [
        "It is only an approximation of the true cost",
        "C is a value in the input, not the input's size — adding digits to C multiplies the table exponentially",
        "It ignores constant factors",
        "It only holds in the average case",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Input size is measured by how many characters it takes to write the input down. Writing C takes about log₂(C) bits, so a bound linear in C is exponential in the size of the input.",
      distractors: [
        "The bound is exact, not approximate. The word describes what the bound is polynomial *in*, not how accurate it is.",
        "",
        "Every Big-O bound ignores constant factors. That is ordinary and would not earn a special name.",
        "The bound is worst case and holds for every input. Average case is a different qualifier entirely.",
      ],
    },
    {
      q: "Change one character in the 0/1 solution so the capacity loop runs upward. Which problem does it now solve?",
      options: [
        "Nothing coherent; it is just a bug",
        "Unbounded knapsack — unlimited copies of each item",
        "Fractional knapsack",
        "Subset-sum",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Reading a slot already updated for this item is exactly 'I may use this item again'. The upward version is the correct, standard implementation of unbounded knapsack — which is why the mistake is so easy to make and so hard to spot.",
      distractors: [
        "It is a bug relative to 0/1, but the resulting program correctly solves a well-known different problem. That is what makes it dangerous: the output looks entirely reasonable.",
        "",
        "Fractional knapsack allows partial items and is solved greedily by ratio in O(n log n). No loop direction produces it.",
        "Subset-sum asks whether an exact total is reachable and needs a boolean table, not a change of direction.",
      ],
    },
    {
      q: "Partition an array into two subsets with equal sums. The first thing to check is:",
      options: [
        "Whether the array is sorted",
        "Whether the total is even — if it is odd, no partition exists",
        "Whether all elements are distinct",
        "Whether the array length is even",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Two equal integer sums must add to an even total. The check is O(n) and rules the problem out before you allocate a table at all.",
      distractors: [
        "Sortedness is irrelevant — subset-sum considers every subset regardless of order, and sorting changes nothing about which totals are reachable.",
        "",
        "Duplicates are fine and common. [1, 1, 2, 2] partitions cleanly into [1, 2] and [1, 2].",
        "An odd count partitions perfectly well: [3, 1, 2] splits into [3] and [1, 2].",
      ],
    },
    {
      q: "You need to know WHICH items were selected, not just the total value. What must change?",
      options: [
        "Nothing — read them off the one-row array",
        "Keep all n rows and walk backwards from dp[n][C], asking at each row whether the value came from skipping or taking",
        "Run the DP a second time in reverse",
        "Sort the items by value first",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The one-row version overwrites its own history, so the information is gone. With the full table, dp[i][c] === dp[i−1][c] means item i was skipped; otherwise it was taken and you jump to dp[i−1][c − weight[i]]. Reconstruction is O(n) once the table exists.",
      distractors: [
        "The single array holds only final values, not the decisions that produced them, and every intermediate row has been overwritten. This is the exact cost of the space optimisation.",
        "",
        "A second pass has nothing extra to read — the same information was already destroyed. You need the rows kept, not the loop re-run.",
        "Sorting changes nothing about which subset is optimal, and only makes it harder to map the answer back to the original indices.",
      ],
    },
    {
      q: "The capacity is a budget of ₹50 lakh, tracked in paise. What is the honest recommendation?",
      options: [
        "Use the O(n · C) DP — it is polynomial",
        "The table would need 5 × 10⁹ cells, so switch to branch and bound, an ILP solver, or an approximation with a stated error bound",
        "Round the capacity to the nearest thousand rupees and use the DP",
        "Use greedy by value density instead",
      ],
      answer: 1,
      difficulty: "judge",
      why: "This is exactly where pseudo-polynomial bites. Five billion cells is not allocatable, and the right move in a design review is to name the ceiling and offer the alternatives along with what each costs you.",
      distractors: [
        "Polynomial in C, which is the trap. C here is 5 × 10⁹, so a bound being polynomial in it is no comfort whatsoever.",
        "",
        "A defensible engineering compromise, and worth raising — but it changes the answer, so it needs an error bound stated out loud rather than slipped in as a rounding detail. Offered alone it sounds like you did not notice the real problem.",
        "Fast, and not optimal. If an approximation is acceptable, say so explicitly and choose one with a proven bound rather than one that merely feels reasonable.",
      ],
    },
    {
      q: "Each item may be taken up to 10 times. The naive fix is 10 copies of every item. What is better?",
      options: [
        "Sort by weight first",
        "Binary splitting — pseudo-items of size 1, 2, 4, 8 … so any count up to 10 is reachable, turning a factor of k into log k",
        "Use unbounded knapsack and cap the answer afterwards",
        "Run 0/1 knapsack 10 times",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Powers of two compose to any count up to k, so pseudo-items of 1, 2, 4 and 3 cover 0 through 10 with four entries instead of ten. The saving grows as k does, and this is the standard answer for bounded knapsack.",
      distractors: [
        "Sorting does not reduce the number of copies, and knapsack is order-independent anyway.",
        "",
        "There is nothing to cap afterwards. The count limit governs which combinations were legal while the table was being built, and by the end that information is gone.",
        "Ten independent runs solve ten separate problems and leave you no way to combine their answers — the copies have to compete inside one table.",
      ],
    },
    {
      q: "Subset-sum over 10,000 amounts with a target in paise. Which implementation detail buys the most?",
      options: [
        "Memoising the recursion",
        "A bitset row shifted by each item's weight, so 64 capacities update per machine word",
        "Sorting the amounts descending",
        "Using floats to shrink the table",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The table is boolean, so a whole row packs into machine words and the transition becomes a shift and an OR. That is a 64× constant-factor win — and for a pseudo-polynomial algorithm sitting near the edge of feasible, the constant is often what decides it.",
      distractors: [
        "Memoisation reaches the same n × C states the table already has. It changes nothing about the state count, which is what dominates here.",
        "",
        "Order does not affect which totals are reachable. It can help a branch-and-bound search prune early, but not this table.",
        "Floats cannot index a table, and rounding money to make it fit produces answers wrong in exactly the way finance will notice.",
      ],
    },
  ],
};

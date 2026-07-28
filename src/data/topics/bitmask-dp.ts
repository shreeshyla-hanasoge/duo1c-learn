import type { Topic } from "../types.ts";

export const bitmaskDp: Topic = {
  id: "bitmask-dp",
  title: "Bitmask DP",
  tier: 3,
  week: 17,
  depth: "deep",
  summary: "TSP and assignment problems over subsets.",
  why: 'When n is small (≤ 20) and the state genuinely is "which subset have I used", an exponential DP is not a failure — it is the answer.',
  complexity: "O(2ⁿ · n)",
  viz: ["bitmask"],
  learn: {
    intuition:
      "Some problems have a state that genuinely is a set. Visiting cities: what matters is which ones you have already been to and where you are standing now — not the order you visited them in, because the route ahead does not care. That last clause is the whole idea. Two different tours that have covered the same cities and ended in the same place face an identical remaining problem, so the more expensive one can be discarded permanently. Brute force over orderings is n! because it treats every order as different. Grouping them by (set visited, current position) collapses n! down to 2^n · n, and for twenty cities that is the difference between 10^18 and about 20 million — from impossible to a fraction of a second. The bitmask is simply the cheapest way to write a set down: an integer where bit i means 'city i is in the set'. Membership becomes one AND, adding an element becomes one OR, and the set doubles as an array index. There is no cleverness in the bits themselves; the cleverness is noticing that the state was a set all along.",
    mechanics: [
      {
        heading: "The integer IS the set",
        body: "Bit `i` set means item `i` is in the set. `mask & (1 << i)` tests membership, `mask | (1 << i)` adds, and `mask` used directly as an array index gives you a table with 2^n rows. Nothing is being encoded or decoded — the set and its index are the same object, which is what makes the inner loop cheap enough for the exponential to be affordable at all.",
      },
      {
        heading: "State: the subset done, plus where you are now",
        body: "For a tour it is `dp[mask][i]` — the cheapest way to have visited exactly the cities in `mask` and be standing at city `i`. Both parts are needed. The mask alone cannot tell you what the next hop costs, and the position alone forgets what is left to do. Check this pairing on any new problem: a subset plus a small amount of 'where am I' is the signature of the family.",
      },
      {
        heading: "Fill masks in increasing numeric order",
        body: "Adding an element always increases the integer, because it turns a 0 bit into a 1. So a plain `for mask = 0 to 2^n - 1` loop visits every subset after all of its own subsets — the dependency order comes free from counting upward, exactly as row-major order came free in grid DP. This is a small, pleasing fact and it is worth stating in an interview because it shows you know why the loop is correct rather than that it happens to work.",
      },
      {
        heading: "Two identities worth memorising",
        body: "`mask & (mask - 1)` clears the lowest set bit — loop on it and you visit each set bit once, in popcount steps rather than n. `mask & (-mask)` isolates the lowest set bit as a value. A third, for enumerating every sub-mask of a mask: `for (let s = mask; s > 0; s = (s - 1) & mask)`. That last one visits each subset exactly once and, summed over all masks, costs 3^n rather than 4^n — the standard trick for set-partition problems.",
      },
      {
        heading: "Know the ceiling before you propose this",
        body: "2^20 is about a million states, which is comfortable. 2^25 is 33 million and getting heavy once you multiply by n. 2^30 is a billion and is not happening. So n ≤ 20 is the practical range, and the honest thing in a design review is to name that number out loud: this approach is exact and affordable up to about twenty items, and past that we need a heuristic. An exponential algorithm chosen deliberately with a stated bound is engineering; the same algorithm chosen by accident is an outage.",
      },
    ],
    complexityDerivation:
      "There are 2^n subsets and, for a tour, n choices of current position, giving 2^n · n states. Each state considers up to n next moves, so the total is O(2^n · n²) time and O(2^n · n) space. Compare that with brute force at O(n!) and the saving is the point of the whole topic: for n = 20, n! is about 2.4 × 10^18 while 2^n · n² is about 4 × 10^8 — nine orders of magnitude, achieved purely by noticing that the order of past visits is irrelevant. It is worth being precise about what has and has not happened here. This is still exponential; it has not become tractable in the theoretical sense, and TSP remains NP-hard. What changed is the base and the exponent's shape, and that is enough to move the practical ceiling from about twelve items to about twenty. Space is usually the binding constraint before time is, because 2^n · n table entries at eight bytes each is already 160 MB at n = 20 — which is why real implementations store the table as a flat typed array indexed by `mask * n + i` rather than as nested arrays, and why the transition-cost matrix is kept separate rather than duplicated per state.",
    variants: [
      {
        name: "Travelling salesman (Held–Karp)",
        when: "Shortest route visiting every item once.",
        delta:
          "`dp[mask][i]`, the canonical form. O(2^n · n²). Still the best known exact algorithm for general TSP, from 1962.",
      },
      {
        name: "Assignment problems",
        when: "Match n workers to n tasks, each pairing with its own cost.",
        delta:
          "`dp[mask]` alone — the popcount of the mask tells you which worker you are assigning, so the position is implicit and one dimension disappears. O(2^n · n). Note that this specific problem also has a polynomial solution, the Hungarian algorithm, so bitmask is the wrong choice unless the cost structure is non-additive.",
      },
      {
        name: "Set partitioning via sub-mask enumeration",
        when: "Split items into groups where a group's cost is not the sum of its members.",
        delta:
          "`for (s = mask; s > 0; s = (s - 1) & mask)` walks every sub-mask. Total cost 3^n rather than 4^n, which for n = 16 is 43 million instead of 4 billion.",
      },
      {
        name: "Broken profile / connected-component masks",
        when: "Tiling a grid, or DP across a narrow board.",
        delta:
          "The mask describes the boundary between the solved and unsolved regions rather than a set of items, so the exponent is the board's *width* rather than its area. A 100 × 12 board is entirely feasible; 100 × 30 is not.",
      },
    ],
    tradeoffs: [
      {
        vs: "Brute force over permutations",
        pick: "Bitmask DP, always, when the state really is a set",
        because:
          "Same answer, nine orders of magnitude apart at n = 20. The only thing brute force has going for it is that it needs no insight, and the insight here is a single sentence: two prefixes covering the same items with the same endpoint are interchangeable.",
      },
      {
        vs: "A heuristic — nearest neighbour, 2-opt, simulated annealing",
        pick: "The heuristic past about twenty items, and say so before you are asked",
        because:
          "Exactness has a price and the price is a hard wall, not a slope: at n = 25 the table stops fitting in memory and no amount of tuning helps. Real routing systems cluster stops into small groups, solve each cluster exactly with Held–Karp, and stitch the clusters with a heuristic. Naming that hybrid is a much better answer than defending either extreme.",
      },
      {
        vs: "An ILP or constraint solver",
        pick: "The solver when there are side constraints",
        because:
          "Bitmask DP handles exactly the constraints you can fit into the state, and every extra one multiplies the table. Time windows, vehicle capacities and driver-hour limits are ordinary requirements in real routing, and each would need its own dimension. Solvers take those as declarative constraints and prune, which is why industrial routing is not a Held–Karp implementation.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — building multi-leg option strategies",
      kind: "yours",
      problem:
        "A spread is a subset of candidate legs, and its margin requirement is not the sum of its legs' margins — the exchange grants offsets for hedged combinations. So a leg's contribution depends on which other legs were chosen, and no per-leg score can rank them.",
      applied:
        "With a shortlist of at most twenty candidate legs, enumerate subsets as bitmasks and evaluate each combination's joint margin and payoff. Non-additive cost is precisely what rules out knapsack here: knapsack assumes an item's weight is fixed, and margin offsets break that assumption.",
      evidence: "strategy-engine/app/services/strike_selection_service.py",
      impact:
        "Per-leg heuristics that ignore margin offsets → exact selection over a bounded shortlist",
    },
    {
      system: "Last-mile delivery batching",
      kind: "industry",
      problem:
        "A rider carries five to eight orders at once and the route between them decides whether the food is warm on arrival. The full city-wide problem is far too large to solve exactly, but a rider's own batch is tiny.",
      applied:
        "Cluster nearby orders first, then solve each cluster's route exactly with Held–Karp, because eight stops is 2^8 · 64 states and finishes in microseconds. The exponential is affordable precisely because clustering bounded n before it was reached. This split — heuristic to make groups, exact within a group — is the standard industrial shape.",
      impact: "Provably optimal routes per batch, inside a heuristic that scales to a city",
    },
    {
      system: "Join ordering over subsets in a query planner",
      kind: "industry",
      problem:
        "For a general join graph, the planner must choose not only the order but the shape of the plan tree, and the cost of joining a set of tables depends on the whole set through the estimated intermediate row count.",
      applied:
        "`dp[subset]` holds the cheapest plan producing exactly that set of tables, built by enumerating sub-masks to find the best two-way split. This is where the sub-mask enumeration's 3^n cost shows up in production code — and it is why planners cap the exact search at roughly a dozen tables.",
      impact:
        "Optimal plans for small joins, with a documented cutoff where the planner switches strategy",
    },
    {
      system: "Drill and cutting-path ordering",
      kind: "industry",
      problem:
        "A PCB drilling machine or a CNC laser spends much of its time moving between cuts rather than cutting. On a board with a few dozen holes, the travel order is most of the cycle time.",
      applied:
        "Ordering the holes is TSP with travel time as the distance. Machines group holes by tool change — you cannot swap bits for free — which naturally partitions the problem into groups small enough for an exact Held–Karp solve per tool.",
      impact: "Idle travel time cut on a path that repeats for every board in the run",
    },
  ],
  lab: {
    prompt:
      "Given an n×n matrix where `dist[i][j]` is the cost of going from city i to city j, return the cost of the cheapest tour that starts at city 0, visits every city exactly once, and returns to city 0. The matrix may be asymmetric — `dist[i][j]` need not equal `dist[j][i]`. Return 0 for zero or one city. Budget: O(2ⁿ · n²) — trying all n! orderings will time out.",
    fnName: "tspCost",
    signature: "tspCost(dist: number[][]): number",
    starter: `function tspCost(dist) {
// Your budget: O(2^n * n^2).
// dp[mask][i] = cheapest way to have visited exactly the cities in
// mask and be standing at city i. Bit i of mask means "city i visited".
// Counting mask upward already visits every subset after its subsets.

return 0;
}`,
    tests: [
      {
        // Optimal tour 0 -> 1 -> 3 -> 2 -> 0 = 10 + 25 + 30 + 15 = 80.
        // Nearest-neighbour from 0 takes 0->1 (10), 1->3 (25), 3->2 (30),
        // 2->0 (15) and also lands on 80 here — the asymmetric test below
        // is the one that separates them.
        name: "classic four cities",
        input: [
          [
            [0, 10, 15, 20],
            [10, 0, 35, 25],
            [15, 35, 0, 30],
            [20, 25, 30, 0],
          ],
        ],
        expected: 80,
      },
      {
        // dist[i][j] != dist[j][i]. Going 0->1->2->0 costs 1+1+1 = 3;
        // the reverse costs 10+10+10 = 30. A solution that symmetrises
        // the matrix, or that walks the cycle backwards, returns 30.
        name: "asymmetric costs",
        input: [
          [
            [0, 1, 10],
            [10, 0, 1],
            [1, 10, 0],
          ],
        ],
        expected: 3,
      },
      {
        name: "two cities — out and back",
        input: [
          [
            [0, 5],
            [5, 0],
          ],
        ],
        expected: 10,
      },
      {
        name: "three cities",
        input: [
          [
            [0, 1, 2],
            [1, 0, 3],
            [2, 3, 0],
          ],
        ],
        expected: 6,
      },
      {
        name: "five cities",
        input: [
          [
            [0, 3, 8, 4, 9],
            [3, 0, 6, 2, 7],
            [8, 6, 0, 5, 1],
            [4, 2, 5, 0, 6],
            [9, 7, 1, 6, 0],
          ],
        ],
        expected: 20,
      },
      { name: "single city", input: [[[0]]], expected: 0, hidden: true },
      { name: "no cities", input: [[]], expected: 0, hidden: true },
      {
        // Six cities is 32 sub-states per position — enough that a
        // solution which forgets to require all cities visited before
        // returning home will show up here.
        name: "six cities",
        input: [
          [
            [0, 4, 9, 5, 2, 7],
            [4, 0, 3, 8, 6, 1],
            [9, 3, 0, 2, 7, 5],
            [5, 8, 2, 0, 4, 6],
            [2, 6, 7, 4, 0, 3],
            [7, 1, 5, 6, 3, 0],
          ],
        ],
        expected: 16,
        hidden: true,
      },
    ],
    hints: [
      "Make a table of size 2^n by n filled with Infinity. `dp[mask][i]` means: you have visited exactly the cities whose bits are set in `mask`, and you are currently at city i. Seed it with `dp[1][0] = 0` — only city 0 visited, standing at city 0.",
      "Loop `mask` from 0 upward. Because setting a bit always makes the integer larger, every mask is reached after all of its own sub-masks — so the values you read are already final. For each `i` in the mask with a finite cost, try every `j` NOT in the mask and relax `dp[mask | (1 << j)][j]`.",
      "At the end you must still get home. The answer is the minimum over all `i` of `dp[fullMask][i] + dist[i][0]`, where `fullMask` is `(1 << n) - 1`. Forgetting that last hop is the most common bug and it makes every tour look cheaper than it is.",
    ],
    solution: `function tspCost(dist) {
const n = dist.length;
if (n <= 1) return 0;

const FULL = 1 << n;
// Flat array rather than nested: dp[mask * n + i]. At n = 20 this is
// the difference between one allocation and a million small ones.
const dp = new Float64Array(FULL * n).fill(Infinity);

// Start at city 0 with only city 0 visited.
dp[1 * n + 0] = 0;

// Counting upward visits every mask after all of its sub-masks,
// because setting a bit always increases the integer.
for (let mask = 1; mask < FULL; mask++) {
  for (let i = 0; i < n; i++) {
    if ((mask & (1 << i)) === 0) continue;      // not at a city we've visited
    const cur = dp[mask * n + i];
    if (cur === Infinity) continue;             // state unreachable
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) continue;            // already visited j
      const next = mask | (1 << j);
      const cost = cur + dist[i][j];
      if (cost < dp[next * n + j]) dp[next * n + j] = cost;
    }
  }
}

// Every city visited — now pay to get back to city 0.
const all = FULL - 1;
let best = Infinity;
for (let i = 0; i < n; i++) {
  const c = dp[all * n + i];
  if (c !== Infinity) best = Math.min(best, c + dist[i][0]);
}
return best;
}`,
    // No complexityGate on purpose. The honest budget here is O(2^n · n^2),
    // and every target in ComplexityTarget is polynomial — fitting an
    // exponential curve against log(n) produces a number no threshold can
    // interpret. The gate would either reject the correct solution or pass
    // everything, and both are worse than saying so plainly. The tests
    // carry this lab; the asymmetric and six-city cases are what catch a
    // wrong answer.
  },
  insights: [
    {
      t: "The integer IS the set",
      d: "Bit i set means item i is used. Membership, insertion and union all become single machine instructions, and the set doubles as the table index — which is what makes an exponential number of states affordable to touch at all.",
    },
    {
      t: "n ≤ 20 is the practical ceiling",
      d: "2²⁰ ≈ 1M states is fine. 2³⁰ is a billion and is not. Knowing that boundary tells you instantly whether this approach is even on the table, and it is the number to say out loud in a design review.",
    },
    {
      t: "Two identities worth memorising",
      d: "`mask & (mask − 1)` clears the lowest set bit; `mask & (−mask)` isolates it. For sub-masks, `for (s = mask; s > 0; s = (s − 1) & mask)` enumerates every one exactly once.",
    },
    {
      t: "Counting masks upward is already the right order",
      d: "Setting a bit increases the integer, so a plain ascending loop reaches every subset after all of its own subsets. The dependency order comes free, exactly as row-major order does in grid DP.",
    },
    {
      t: "The saving comes from forgetting the order, not from the bits",
      d: "n! becomes 2ⁿ·n because two routes covering the same cities and ending at the same place face an identical future. The bitmask is just the cheapest way to write the set down.",
    },
  ],
  pitfalls: [
    "Forgetting the final hop home. Every tour then looks cheaper by one edge, and the answer is wrong on every input rather than on an edge case.",
    "Using nested arrays for the table. At n = 20 that is a million small allocations; a flat typed array indexed by `mask * n + i` is the same algorithm and a different order of memory pressure.",
    "Letting `1 << n` run past 31 bits. In JavaScript the shift operators work on signed 32-bit integers, so n = 31 produces a negative mask and n = 32 wraps to 1.",
    "Reaching for bitmask DP on the plain assignment problem. It works, but the Hungarian algorithm solves that one in polynomial time — exponential is only the answer when the cost is genuinely non-additive.",
  ],
  quiz: [
    {
      q: "TSP via bitmask DP over n cities costs:",
      options: ["O(n!)", "O(2ⁿ · n²)", "O(n³)", "O(2ⁿ)"],
      answer: 1,
      difficulty: "recall",
      why: "2ⁿ subsets × n possible current cities × n transitions out of each. Vastly better than the n! of brute force, though still exponential.",
      distractors: [
        "n! is what brute force over orderings costs. Collapsing it is the entire point of the technique.",
        "",
        "Cubic would make TSP tractable, which would settle P versus NP. Any polynomial answer here should look suspicious immediately.",
        "2ⁿ counts the subsets but forgets that each subset needs a separate entry per current position, and that each entry considers every next move.",
      ],
    },
    {
      q: "`mask & (mask - 1)` does what?",
      options: [
        "Isolates the lowest set bit",
        "Clears the lowest set bit",
        "Counts the set bits",
        "Inverts the mask",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Subtracting 1 flips the lowest set bit to 0 and everything below it to 1; the AND then clears the whole tail. Applying it repeatedly enumerates the set bits in popcount steps.",
      distractors: [
        "That is `mask & (-mask)`, which the two-idioms note pairs it with. They are easy to swap and do opposite things.",
        "",
        "Counting is what you get by *looping* on this identity — the identity itself performs one step of that loop.",
        "Inverting is `~mask`, which touches every bit rather than just the lowest set one.",
      ],
    },
    {
      q: "Why does looping `mask` from 0 to 2ⁿ−1 in plain numeric order give a valid DP order?",
      options: [
        "Because the masks happen to be sorted",
        "Adding an element sets a 0 bit to 1, which always increases the integer — so every mask is reached after all of its sub-masks",
        "Because the table is filled with Infinity first",
        "It does not; you must sort masks by popcount",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The transition only ever adds elements, and adding an element strictly increases the numeric value. So ascending order is automatically a topological order over the subset lattice.",
      distractors: [
        "'Sorted' is describing the loop rather than justifying it. The reason ascending order is safe is a property of the transition, not of the counting.",
        "",
        "Infinity marks states as unreachable, which is about correctness of the values. It says nothing about whether a state is finished before it is read.",
        "Sorting by popcount also works and is what people often reach for, but it is unnecessary — ascending numeric order already respects the dependencies, and is cheaper.",
      ],
    },
    {
      q: "Your TSP returns tours that are consistently too cheap by roughly one edge. Most likely cause?",
      options: [
        "The mask is being built incorrectly",
        "You returned min over dp[fullMask][i] without adding dist[i][0] — the hop back to the start",
        "The table was not initialised to Infinity",
        "Cities are being visited twice",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The DP ends standing at some city with everything visited. A tour has to close the loop, so the answer is the minimum over i of dp[full][i] + dist[i][0]. Omitting it drops exactly one edge from every tour.",
      distractors: [
        "A broken mask usually produces answers that are wrong in scattered, inconsistent ways — some too cheap, some impossible — not a uniform shortfall of one edge.",
        "",
        "Missing Infinity initialisation makes unreachable states look free, which produces answers far too cheap rather than short by a single hop.",
        "Revisiting cities would make tours cheaper too, but the `if (mask & (1 << j)) continue` check is what prevents it, and its absence produces wildly short answers rather than a consistent one-edge gap.",
      ],
    },
    {
      q: "n = 24 cities. The state table needs 2²⁴ × 24 entries. What is the honest recommendation?",
      options: [
        "Run it — 2²⁴ is only 16 million",
        "That is 400 million entries, over 3 GB as doubles. Cluster the stops, solve each cluster exactly, and stitch with a heuristic",
        "Use recursion with memoisation so only reachable states are stored",
        "Switch to brute force since n is small",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Space binds before time in this family. The industrial answer is the hybrid: bound n by clustering so the exponential stays affordable, solve exactly inside each cluster, and accept approximation between them.",
      distractors: [
        "16 million is the subset count, and the per-position dimension multiplies it by 24. Quoting only the subset count is exactly how this decision goes wrong in a review.",
        "",
        "Memoisation helps when many states are unreachable, but in a complete graph nearly all of them are reachable. It is a real optimisation for sparse road networks and no help here.",
        "24! is around 6 × 10²³. Brute force was infeasible many cities ago.",
      ],
    },
    {
      q: "Assigning n workers to n tasks with a cost per pairing. Bitmask DP solves it in O(2ⁿ · n). What should you say in a design review?",
      options: [
        "That it is the standard solution",
        "That the Hungarian algorithm solves this exact problem in O(n³), so bitmask is only justified if the cost is non-additive",
        "That it should be O(2ⁿ · n²)",
        "That n! would be simpler",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Recognising that a problem has a polynomial algorithm is more valuable than implementing an exponential one well. Bitmask earns its place only when a group's cost is not the sum of its members — which is exactly why option-leg selection with margin offsets does need it.",
      distractors: [
        "It is a standard solution to the general subset problem, and proposing it for a problem with a known polynomial algorithm is the mistake this question is about.",
        "",
        "The complexity is right as stated — the popcount of the mask tells you which worker is being assigned, so the position dimension collapses. This is a correct detail and the wrong thing to raise.",
        "n! is worse in every respect and no simpler to write than the mask loop.",
      ],
    },
    {
      q: "Enumerating every sub-mask of every mask with `for (s = mask; s > 0; s = (s - 1) & mask)` costs:",
      options: ["O(4ⁿ)", "O(3ⁿ)", "O(2ⁿ)", "O(2ⁿ · n)"],
      answer: 1,
      difficulty: "judge",
      why: "Each element is in the sub-mask, in the mask but not the sub-mask, or in neither — three independent choices per element, so 3ⁿ pairs in total. The naive version that tests all 2ⁿ candidates against all 2ⁿ masks is 4ⁿ.",
      distractors: [
        "4ⁿ is what you pay by looping over all masks and, for each, all 2ⁿ possible sub-masks with a membership test. The identity's whole purpose is avoiding that.",
        "",
        "2ⁿ is the number of masks. Each one has its own sub-masks, so the total must be larger.",
        "This is the cost of visiting each mask and doing n work. Sub-mask enumeration visits a variable number per mask — 2^popcount — which sums to 3ⁿ, not 2ⁿ · n.",
      ],
    },
    {
      q: "A tiling problem on a 100 × 12 board. Why is a bitmask over the board's WIDTH feasible when a mask over cells is not?",
      options: [
        "Because 100 × 12 is only 1200 cells",
        "The mask describes the boundary between solved and unsolved regions, so the exponent is the width (2¹² = 4096), not the area",
        "Because tiling problems are always polynomial",
        "Because the board is rectangular",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The broken-profile technique sweeps column by column and only needs to remember the shape of the frontier. That frontier is one bit per row, so the state is 2^height × width — linear in the long dimension and exponential only in the short one.",
      distractors: [
        "1200 cells as a mask would be 2^1200 states, which is why the naive framing is hopeless. The cell count is what makes it infeasible, not what makes it work.",
        "",
        "Many tiling problems are NP-hard. This one is tractable because of its narrow dimension, which is a property of the instance rather than of tiling.",
        "Rectangularity makes the sweep tidy but is not the reason. The same technique works on ragged boards as long as the frontier stays narrow.",
      ],
    },
  ],
};

import type { Topic } from "../types.ts";

export const gridDp: Topic = {
  id: "grid-dp",
  title: "Grid DP",
  tier: 3,
  week: 15,
  depth: "core",
  summary: "Unique paths, minimum path sum, and obstacle variants.",
  why: "The gentlest 2D DP, and the mental model for every table-shaped recurrence that follows.",
  complexity: "O(rows · cols)",
  learn: {
    intuition:
      "You are at the top-left of a grid and must reach the bottom-right, moving only right or down, paying the number written in each cell you step on. Pay as little as possible. The number of routes is enormous — for a 10×10 grid it is about forty-eight thousand — but notice what a route actually amounts to by the time it arrives at some cell in the middle: a cost, and nothing else. Two routes that reach the same cell having paid the same amount are, from that cell onward, completely interchangeable. And a route that reaches a cell having paid more than another route is dead permanently, because everything ahead of it is identical for both. So you keep one number per cell: the cheapest way to arrive here. Each cell can only be entered from above or from the left, so its answer is its own cost plus the cheaper of those two. The exponential fan of routes collapses into one sweep across the grid, and the reason it collapses is that movement is one-directional — you can never come back, so a number written into a cell is final the moment it is written.",
    mechanics: [
      {
        heading: "Ask which cells can reach this one — that is the recurrence",
        body: "With right-and-down movement, cell `(i, j)` is entered only from `(i-1, j)` above or `(i, j-1)` to the left. So `dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])`. Writing the recurrence is not a creative act here; it is a direct reading of the movement rules. Change the movement rules and you have mechanically changed the recurrence.",
      },
      {
        heading: "The first row and the first column are the base cases",
        body: "The top row has nothing above it and the left column has nothing to its left, so neither can use the recurrence. Each is a running total along its own edge. Handling them with an `if` inside the main loop works but reads badly; filling them before the loop and starting at `(1, 1)` is cleaner, and is where fewer off-by-one bugs live.",
      },
      {
        heading: "Row-major order already satisfies the dependencies",
        body: "By the time you reach `(i, j)` going left to right and top to bottom, both `(i-1, j)` and `(i, j-1)` are written. No sorting, no queue, no thought required — which is exactly why grid DP is the gentlest 2D DP and worth doing before the harder ones.",
      },
      {
        heading: "One rolling row is enough",
        body: "Row `i` reads only row `i-1` and the cell just written to its own left. So a single array of length `cols` suffices: `row[j] = grid[i][j] + min(row[j], row[j-1])`, where `row[j]` still holds the value from above and `row[j-1]` already holds this row's. Space drops from O(rows · cols) to O(cols) — on a photograph-sized grid, the difference between a few kilobytes and a few hundred megabytes.",
      },
      {
        heading: "Obstacles are a base-case change, not a new algorithm",
        body: "A blocked cell is unreachable: set it to infinity when minimising, or to zero when counting paths, and the same recurrence carries that forward correctly. What does need care is the first row and column — once one cell along an edge is blocked, everything after it on that edge is unreachable too, and a loop that keeps accumulating past the block quietly builds a route through a wall.",
      },
    ],
    complexityDerivation:
      "There is one state per cell and each does one comparison and one addition, so time is O(rows · cols) — and that is optimal, because any correct algorithm must at least look at every cell, since a single unexamined cell could hold the value that changes the answer. Space is O(rows · cols) for the full table, or O(cols) rolling one row at a time. The more interesting half of the derivation is why no priority queue appears. This is a shortest-path problem, and shortest paths in general need Dijkstra's algorithm at O(E log V). Here movement is monotone — right and down only — so the dependency graph is a directed acyclic graph whose topological order is simply row-major order. When you already know a valid processing order, the queue whose entire job is to discover that order is redundant. Allow movement in all four directions and the grid gains cycles, row-major order stops being valid, and it genuinely does become Dijkstra, or plain BFS when every cell costs the same. Knowing which of those two situations you are in is the single most useful thing this topic teaches.",
    variants: [
      {
        name: "Counting paths",
        when: "'How many ways' rather than 'what is the cheapest'.",
        delta:
          "Swap `min` for `+` and seed the start at 1. Everything else is identical. Watch for overflow — path counts grow like binomial coefficients and pass 2^53 well before the grid looks large.",
      },
      {
        name: "Minimum or maximum path sum",
        when: "Each cell carries a cost or a reward.",
        delta:
          "`min` or `max` over the incoming neighbours, plus this cell's own value. The canonical form.",
      },
      {
        name: "Obstacles",
        when: "Some cells are impassable.",
        delta:
          "Blocked cells become infinity when minimising, or zero when counting. The recurrence is unchanged; the edges need care so that unreachability propagates along them.",
      },
      {
        name: "Four-directional movement",
        when: "You may also move up or left.",
        delta:
          "No longer a DP. Cycles appear, row-major order becomes invalid, and you need Dijkstra — or 0-1 BFS with a deque when costs are only 0 and 1, or plain BFS when every step costs the same.",
      },
    ],
    tradeoffs: [
      {
        vs: "Dijkstra's algorithm",
        pick: "Grid DP, whenever movement is monotone",
        because:
          "Dijkstra is strictly more general and strictly more expensive — a heap, O(E log V), and a per-cell visited check. Its entire purpose is discovering a safe processing order when you do not already have one. With right-and-down movement you do have one, for free, so the heap is pure overhead. Reach for Dijkstra the moment movement can revisit a cell, and not before.",
      },
      {
        vs: "Memoised recursion from the destination",
        pick: "The bottom-up sweep, on any real grid",
        because:
          "Both are O(rows · cols), and the recursion is arguably easier to write straight from the recurrence. But its depth is rows + cols, so a 5000 × 5000 image overflows the stack, and it cannot use a rolling row because it visits cells in an order nobody controls. The recursion is the better first draft and the worse final answer.",
      },
      {
        vs: "Keeping the full table rather than one rolling row",
        pick: "The full table when the caller wants the route",
        because:
          "The rolling row gives you the cost and forgets the path. Reconstruction walks back from the corner asking at each cell which neighbour supplied the minimum, and that needs every row still present. For seam carving you need the seam itself, not its energy, so the table is not optional there — whereas a one-off 'what would this cost' query should take the row and hand the memory back.",
      },
    ],
  },
  realWorld: [
    {
      system: "farfromwork — content-aware photo crops",
      kind: "yours",
      problem:
        "The photography pages need the same frame at several aspect ratios. A straight centre crop cuts through the subject, and scaling the whole image squashes faces and horizons.",
      applied:
        "Seam carving is grid DP. Score each pixel by how much its colour differs from its neighbours — flat sky scores low, a face scores high — then find the lowest-energy top-to-bottom seam with `dp[i][j] = energy[i][j] + min` over the three pixels above it, and delete that seam. Repeat until the width is right. Removing a low-energy seam is invisible in a way that cropping is not.",
      impact:
        "Fixed centre crop → the subject survives every aspect ratio, at O(width · height) per seam",
    },
    {
      system: "Panorama stitching",
      kind: "industry",
      problem:
        "Two overlapping photographs never agree exactly in the overlap — exposure drifts, and anything that moved between the shots appears twice. Cutting straight down the middle leaves a visible seam and sometimes half a person.",
      applied:
        "In the overlap region, build a grid whose cell cost is how much the two images disagree there, then find the minimum-cost path from top to bottom. That path is where to switch from one image to the other, and it naturally detours around anything that moved, because those are exactly the high-disagreement cells.",
      impact:
        "A visible straight seam → a cut that follows where the two images already agree",
    },
    {
      system: "Line segmentation for OCR of scanned records",
      kind: "industry",
      problem:
        "Digitising handwritten land records or old registers means splitting the page into lines first. A straight horizontal cut fails immediately: pages are scanned at a slight angle, and descenders from one line overlap the next.",
      applied:
        "Treat the page as a grid where dark pixels cost a lot and white space costs nothing, then find the cheapest left-to-right path across it. That path bends around descenders and follows the skew, which a straight line cannot. It matters especially for Devanagari and other scripts with a connecting headline, where a naive projection-profile cut lands in the wrong place.",
      impact:
        "Straight cuts that slice through glyphs → separators that follow the actual white space",
    },
    {
      system: "Warehouse routing on a rack grid",
      kind: "industry",
      problem:
        "A picker or a robot crossing a warehouse floor laid out as aisles and cross-aisles, where some aisles are blocked by a restock in progress and different routes carry different congestion costs.",
      applied:
        "When the pick list is ordered so movement is monotone — always further along the floor, never doubling back — the cheapest route is exactly this table, with blocked aisles as obstacles. Naming that assumption out loud matters, because the moment doubling back is allowed the problem becomes Dijkstra and the DP silently returns something else: the best monotone route.",
      impact: "Names precisely when the cheap sweep is valid and when it is not",
    },
  ],
  lab: {
    prompt:
      "Given a grid of non-negative numbers, return the smallest possible sum along a path from the top-left cell to the bottom-right, moving only right or down. Every cell you step on counts, including both corners. Return 0 for an empty grid. Budget: O(rows · cols).",
    fnName: "minPathSum",
    signature: "minPathSum(grid: number[][]): number",
    starter: `function minPathSum(grid) {
// Your budget: O(rows · cols) time.
// A cell can only be entered from above or from the left.
// The first row and the first column have only one way in each —
// handle them before the main loop.

return 0;
}`,
    tests: [
      {
        // 1 → 3 → 1 → 1 → 1 = 7. Down the left edge first costs 8.
        name: "classic 3x3",
        input: [
          [
            [1, 3, 1],
            [1, 5, 1],
            [4, 2, 1],
          ],
        ],
        expected: 7,
      },
      {
        // Across the top then down: 1 + 2 + 3 + 6 = 12.
        name: "wide grid",
        input: [
          [
            [1, 2, 3],
            [4, 5, 6],
          ],
        ],
        expected: 12,
      },
      {
        // A huge cell in the top-right forces the route down first. A
        // solution that always prefers "right" scores 102.
        name: "the expensive route must be avoided",
        input: [
          [
            [1, 100],
            [1, 1],
          ],
        ],
        expected: 3,
      },
      { name: "single row", input: [[[1, 2, 3]]], expected: 6 },
      { name: "single column", input: [[[1], [2], [3]]], expected: 6 },
      { name: "one cell", input: [[[5]]], expected: 5, hidden: true },
      { name: "empty grid", input: [[]], expected: 0, hidden: true },
      {
        // All zeros must return 0. Catches a solution that uses truthiness
        // to decide whether a cell has been filled yet.
        name: "all zeros",
        input: [
          [
            [0, 0],
            [0, 0],
          ],
        ],
        expected: 0,
        hidden: true,
      },
    ],
    hints: [
      "Work out what a cell's answer depends on. Moving only right or down, cell (i, j) can be entered from (i−1, j) or (i, j−1) — so its best is its own value plus the smaller of those two.",
      "The top row and the left column break that rule: each has only one way in. Fill them as running totals along their edge before the main loop starts, then loop from (1, 1).",
      "For O(cols) space, keep one array. When you reach column j, `row[j]` still holds the value from the row above and `row[j-1]` already holds this row's — which is exactly the two numbers the recurrence wants.",
    ],
    solution: `function minPathSum(grid) {
if (grid.length === 0 || grid[0].length === 0) return 0;

const rows = grid.length;
const cols = grid[0].length;

// One rolling row. row[j] = cheapest way to reach column j of whichever
// row we are currently filling.
const row = new Array(cols);

// First row: only one way in, straight across.
row[0] = grid[0][0];
for (let j = 1; j < cols; j++) row[j] = row[j - 1] + grid[0][j];

for (let i = 1; i < rows; i++) {
  // First column: only one way in, straight down.
  row[0] += grid[i][0];
  for (let j = 1; j < cols; j++) {
    // row[j] is still the cell ABOVE; row[j - 1] is already the cell LEFT.
    row[j] = grid[i][j] + Math.min(row[j], row[j - 1]);
  }
}

return row[cols - 1];
}`,
    complexityGate: {
      target: "O(n·m)",
      // Both dimensions scale with the parameter, so an n × n grid traces a
      // quadratic curve. Pinning the column count would let an extra factor
      // of width hide inside a correct-looking row loop.
      //
      // Values cycle rather than climb, so the cheapest route genuinely
      // wanders instead of hugging one edge.
      gen: "(n) => [Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i * 7 + j * 13) % 23))]",
      sizes: [200, 400, 800, 1600],
    },
  },
  insights: [
    {
      t: "Each cell depends only on the cells that can reach it",
      d: "With right/down movement, that is the cell above and the cell to the left. Iterate row-major and both are already computed — the movement rules dictate the recurrence, so you read it off rather than invent it.",
    },
    {
      t: "One row of memory is usually enough",
      d: "If `dp[i][j]` reads only row `i−1` and the current row, a single rolling array does the job. On a photograph-sized grid that is the difference between kilobytes and hundreds of megabytes.",
    },
    {
      t: "Obstacles are a base-case change, not a new algorithm",
      d: "Set blocked cells to infinity for minimisation, or to 0 paths for counting, and the same recurrence handles it. The care goes into the first row and column, where everything past a block is also unreachable.",
    },
    {
      t: "Monotone movement is what removes the priority queue",
      d: "Right-and-down movement makes the grid a DAG whose topological order is row-major. Dijkstra's heap exists to discover a safe order; when you already have one, it is pure overhead.",
    },
    {
      t: "Allowing up and left changes the problem, not just the loop",
      d: "Four-directional movement creates cycles, so no sweep order is valid and this stops being a DP. It becomes Dijkstra, or 0-1 BFS with a deque, or plain BFS on a uniform grid.",
    },
  ],
  pitfalls: [
    "Accumulating along the first row or column past a blocked cell, which quietly builds a route through a wall.",
    "Updating the rolling row in the wrong order, so `row[j−1]` is read before it has been updated for this row — or after, when you wanted the row above.",
    "Using grid DP when movement allows going back. The answer returned is the best MONOTONE route, which is a real number that is not the one that was asked for.",
    "Counting paths with plain numbers past about sixty cells. Path counts are binomial coefficients and pass 2^53 long before the grid looks big.",
  ],
  quiz: [
    {
      q: "Minimum path sum, moving only right or down. The recurrence is:",
      options: [
        "dp[i][j] = grid[i][j] + min(dp[i−1][j], dp[i][j−1])",
        "dp[i][j] = min(grid[i][j], dp[i−1][j−1])",
        "dp[i][j] = grid[i][j] + dp[i−1][j−1]",
        "dp[i][j] = min(dp[i−1][j], dp[i][j−1])",
      ],
      answer: 0,
      difficulty: "recall",
      why: "You always pay for the cell you are standing on, and you arrived from whichever of the two legal predecessors was cheaper.",
      distractors: [
        "",
        "The diagonal is not a legal move here, and comparing a single cell's value against a whole path total compares two different kinds of number.",
        "Diagonal movement again — and with no minimum taken, so no choice is ever actually made.",
        "This forgets to pay for the current cell, so it returns the cost of the path up to but excluding every step.",
      ],
    },
    {
      q: "A 2000 × 2000 grid of floats. The full table needs 32 MB. What is the standard fix?",
      options: [
        "Use 32-bit floats",
        "Keep one rolling row of length `cols`, since row i reads only row i−1 and the cell to its left",
        "Process the grid in tiles",
        "Switch to recursion so nothing is stored",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The recurrence's live window is one row plus one cell. Rolling drops memory from O(rows · cols) to O(cols) — here from 32 MB to 16 KB — with no change to the recurrence.",
      distractors: [
        "Halves it to 16 MB and may cost precision. The rolling row cuts it by a factor of two thousand, which is a different order of answer.",
        "",
        "Tiling helps cache behaviour on much larger data, but every tile boundary still has to be kept, so it does not address the memory question nearly as directly.",
        "Recursion stores the same values in the call stack plus a memo table, and at depth 4000 it overflows. It uses more memory, not less.",
      ],
    },
    {
      q: "Movement is now allowed in all four directions. What changes?",
      options: [
        "Add up and left to the min — the recurrence just gets two more terms",
        "It stops being a DP: cycles appear, so no sweep order is valid and you need Dijkstra (or BFS for uniform costs)",
        "Only the base cases change",
        "Nothing — the answer is the same",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Row-major order works only because a cell's dependencies are always already computed. With up and left allowed, dp[i][j] depends on cells that depend on it, and no order resolves that. A priority queue discovering the order as it goes is exactly what Dijkstra is.",
      distractors: [
        "This is the tempting answer, and it produces a program that runs and returns a number. But dp[i+1][j] has not been computed when you reach dp[i][j], so the extra terms read uninitialised or stale values.",
        "",
        "The base cases are the least of it. The entire justification for sweeping in row-major order has been removed.",
        "The answer genuinely changes: a route that doubles back to use a cheap corridor can beat every monotone route.",
      ],
    },
    {
      q: "Counting unique paths on an open 3 × 3 grid, with the top-left seeded at 1. dp[2][2] equals:",
      options: ["4", "6", "8", "9"],
      answer: 1,
      difficulty: "apply",
      why: "The table fills as 1,1,1 / 1,2,3 / 1,3,6. Equivalently it is C(4,2) = 6 — four moves in total, choose which two of them are 'down'.",
      distractors: [
        "This is the count for a 2 × 3 grid, or what you get by stopping the sweep one cell early.",
        "",
        "8 is 2³, which would be the count if every cell offered a free binary choice. The edges have only one way in, and that is exactly what the base cases encode.",
        "9 is 3 × 3 — the number of cells, not the number of routes.",
      ],
    },
    {
      q: "Obstacles are added, and cell (0, 2) in the top row is blocked. What must the first-row loop do?",
      options: [
        "Set (0, 2) to zero and carry on accumulating",
        "Mark (0, 2) and every cell after it in that row unreachable, because the only way along the top row passes through it",
        "Skip the cell and use the value from (0, 1)",
        "Nothing — the main loop fixes it",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The top row has exactly one way in: from the left. Once a cell in it is blocked, everything to its right is cut off along that row too. This is the most common obstacle bug and it silently produces a route through a wall.",
      distractors: [
        "Zeroing the blocked cell and continuing means (0, 3) reads a real number from (0, 2) and treats the wall as passable at no cost.",
        "",
        "Using (0, 1) for (0, 3) is precisely stepping over the wall. The blockage has to propagate, not be routed around — in the top row there is nothing to route around it with.",
        "The main loop only ever reads the first row; it never repairs it. A wrong base case stays wrong all the way to the corner.",
      ],
    },
    {
      q: "For seam carving you need the seam itself, not just its energy. What does that cost?",
      options: [
        "Nothing — read it off the rolling row",
        "The full O(rows · cols) table, so you can walk back from the best bottom cell asking which predecessor supplied the minimum",
        "A second forward pass",
        "It makes the algorithm quadratic instead of linear",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The rolling row keeps costs and discards decisions. Reconstruction is a backward walk over the retained table, costing O(rows) once the table exists — you pay in memory, not in time.",
      distractors: [
        "The rolling row holds one number per column for the current row only. Every earlier row, and every decision, has already been overwritten.",
        "",
        "A second forward pass recomputes exactly what the first one discarded. What you need is to stop discarding it.",
        "The time class is unchanged — it was already proportional to the number of cells, and the backward walk adds a single pass down the height.",
      ],
    },
    {
      q: "Somebody proposes Dijkstra for a right-and-down grid because 'it is a shortest-path problem'. Your response in a design review?",
      options: [
        "Agree — Dijkstra is the standard shortest-path algorithm",
        "Point out that monotone movement makes the grid a DAG whose topological order is row-major, so the heap only rediscovers an order we already have",
        "Argue that Dijkstra is wrong here",
        "Suggest A* instead",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Dijkstra is correct — it would return the right answer — and that is exactly what makes the argument worth having explicitly. It costs a heap and a log factor to discover a processing order that the movement rules hand you for free. Naming the DAG is the whole argument, and it also tells everyone which future change would flip the decision.",
      distractors: [
        "Correct but wasteful is a real category, and agreeing skips the discussion that matters: what property of this grid makes the cheaper option safe?",
        "",
        "It is not wrong, it is over-general. Claiming it is wrong is easy to refute, and losing that exchange loses you the actual point.",
        "A* needs an admissible heuristic and still carries a priority queue. It is a further optimisation of the tool we have just established is unnecessary.",
      ],
    },
    {
      q: "Counting paths on an open 40 × 40 grid with plain JavaScript numbers gives a wrong answer. Why?",
      options: [
        "The recurrence is wrong for large grids",
        "The count is C(78, 39), far beyond 2^53, so it silently loses precision as a double",
        "The rolling row overwrites values too early",
        "Integer division truncates",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Path counts are binomial coefficients and grow ferociously. Past 2^53 a JavaScript number cannot represent consecutive integers, so additions quietly round. The fix is BigInt, or a modulus if the problem specifies one.",
      distractors: [
        "The recurrence is size-independent. What fails is the number type it is being evaluated in, which is a different layer entirely.",
        "",
        "The rolling row's read order is exactly what the recurrence wants. The values it holds are correct right up until they exceed what a double can represent.",
        "There is no division anywhere in the counting recurrence — it is addition only.",
      ],
    },
  ],
};

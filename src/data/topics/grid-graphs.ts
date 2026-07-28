import type { Topic } from "../types.ts";

export const gridGraphs: Topic = {
  id: "grid-graphs",
  title: "Grid-as-graph",
  tier: 2,
  week: 12,
  depth: "core",
  summary: "Flood fill, islands, and shortest path with obstacles.",
  why: "The most common disguised graph. Recognising a grid as a graph with implicit edges makes a whole category of problems routine — and the 'extra state means extra dimensions' idea generalises far beyond grids, which is what makes this worth more than its surface simplicity suggests.",
  complexity: "O(rows · cols)",
  viz: ["bfs"],
  learn: {
    intuition:
      "A grid is already a graph. Each cell is a node, and its neighbours are the cells next to it — nothing has to be built, because the connections are computable from the coordinates. That single observation converts a large family of puzzle-sounding problems into standard traversals. 'Count the islands' is counting connected components. 'Fewest steps through a maze' is BFS. 'Fill this region with a colour' is flood fill, which is just DFS or BFS with a paint bucket. The one idea worth extracting is what happens when the problem adds a twist — you may break through up to k walls, or you have a key that opens certain doors. The instinct is to write special cases. The correct move is to enlarge the STATE: a node is no longer a position but a position plus whatever else distinguishes two situations. Arriving at a cell having used two of your three wall-breaks is genuinely a different situation from arriving with all three intact, and once the state says so, the ordinary traversal handles it unchanged.",
    mechanics: [
      {
        heading: "Neighbours are offsets, not stored edges",
        body: "`[[-1,0],[1,0],[0,-1],[0,1]]` for four-directional movement, plus the diagonals for eight. Loop over the offsets, add them to the current coordinates, and check bounds. There is no graph to construct, which is why these run so fast and use so little memory.",
      },
      {
        heading: "Check bounds before you read the cell",
        body: "`r >= 0 && r < rows && c >= 0 && c < cols` comes FIRST. Reading `grid[-1]` gives undefined in JavaScript and throws in Python, and in both cases the bug is easier to prevent than to diagnose.",
      },
      {
        heading: "Counting components: scan, then flood",
        body: "Walk every cell. When you meet unvisited land, increment the count and flood-fill everything reachable from it. Each cell is visited once overall, so the whole scan is linear in the number of cells despite the nested loops.",
      },
      {
        heading: "Mark visited as you enqueue, and consider marking in place",
        body: "The BFS rule applies unchanged. On a grid you can often mark by mutating the cell itself — turning land into water as you flood — which saves a whole visited array. That is a genuine trick and it destroys the input, so decide deliberately.",
      },
      {
        heading: "When the rules add state, add a dimension",
        body: "For 'at most k walls removed', the visited set is keyed on (row, col, wallsUsed) rather than (row, col). The traversal code does not change at all — only the key does. Getting this wrong produces a wrong answer, not a crash, because the search prunes states it should have explored.",
      },
    ],
    complexityDerivation:
      "For a plain traversal, every cell is enqueued at most once and each cell looks at a fixed number of neighbours — four or eight, a constant. So the cost is O(rows × cols), linear in the number of cells, and the constant is small because there is no adjacency structure to dereference. Memory is the same order for the visited array, plus the queue, whose peak size is the frontier — on a large open grid that can be a substantial fraction of all cells. The interesting case is the extra dimension. Adding a budget of k wall-breaks multiplies the state space by (k+1), so the cost becomes O(rows × cols × k). That is still linear in the size of the state space, which is the general rule: a traversal costs the number of distinct states, and enlarging the state enlarges the cost proportionally. This is why the technique stays practical for a small budget and stops being practical when the extra state is itself large — 'collect all the keys' over 10 key types means 2^10 states per cell, which is fine, while 30 key types is not.",
    variants: [
      {
        name: "Flood fill",
        when: "Paint bucket, region selection, counting an area.",
        delta:
          "DFS or BFS from one cell, spreading over matching cells. Recursion is the natural expression and overflows on a large region — use an explicit stack or a queue.",
      },
      {
        name: "Counting connected components",
        when: "Islands, clusters, distinct regions.",
        delta:
          "The outer scan plus a flood per unvisited start. The count of floods is the answer.",
      },
      {
        name: "Multi-source BFS on a grid",
        when: "Rotting oranges, distance to the nearest exit, fire spreading.",
        delta:
          "Seed every source at distance 0. The rings expand from all of them at once, which is one pass rather than one per source.",
      },
      {
        name: "State-augmented BFS",
        when: "Limited wall-breaks, keys and doors, fuel budgets.",
        delta:
          "The visited key gains a dimension. Same traversal, larger state space, cost multiplied by the size of the extra dimension.",
      },
    ],
    tradeoffs: [
      {
        vs: "Building an explicit graph",
        pick: "Implicit, always",
        because:
          "Materialising four million edges for a 1000×1000 grid costs memory and a whole construction pass to store information two additions can recover. There is no case where building it helps.",
      },
      {
        vs: "DFS versus BFS on a grid",
        pick: "BFS for distances, DFS for 'is it connected'",
        because:
          "Only BFS gives shortest paths in steps. DFS is fine for flood fill and component counting, where you only care what is reachable — but recursive DFS on a large open region will overflow the stack, and that region is exactly the case people forget to test.",
      },
      {
        vs: "Dijkstra on a grid",
        pick: "BFS unless the cells have different costs",
        because:
          "If every move costs one step, BFS is the shortest path and needs no heap. Dijkstra earns its log factor only when terrain has varying cost — and if the costs are only 0 and 1, 0-1 BFS with a deque beats both.",
      },
    ],
  },
  realWorld: [
    {
      system: "Image editing — the paint bucket tool",
      kind: "industry",
      problem:
        "Filling a contiguous region of similar colour, without spilling past the boundary, on images with millions of pixels.",
      applied:
        "Flood fill with a colour-similarity test as the 'is this cell part of the region' rule. Implementations use an explicit stack or a scanline variant precisely because recursion overflows on large regions.",
    },
    {
      system: "Game pathfinding and fog of war",
      kind: "industry",
      problem:
        "Units must route around obstacles on a tile map, and visibility must spread from each unit up to a radius.",
      applied:
        "BFS or A* over the tile grid for routing; multi-source BFS from every unit for visibility. Varying terrain cost — road versus swamp — is exactly when the problem stops being BFS and becomes Dijkstra.",
    },
    {
      system: "Epidemic and diffusion modelling",
      kind: "industry",
      problem:
        "Simulating spread across a region grid, one time step at a time, from many simultaneous starting points.",
      applied:
        "Multi-source BFS where each ring is one time step. The 'rotting oranges' interview problem is this model in miniature, and the level-by-level structure is what makes the step count meaningful.",
    },
    {
      system: "traed — heatmaps and regime grids",
      kind: "yours",
      problem:
        "Identifying contiguous regions in a two-dimensional parameter sweep — the connected areas where a strategy is profitable — rather than treating each cell independently.",
      applied:
        "Connected-component labelling over the results grid. A contiguous profitable region is far more trustworthy than an isolated winning cell, which is usually overfitting, so the component structure carries real meaning.",
    },
  ],
  lab: {
    prompt:
      "Count the islands in a grid of `1` (land) and `0` (water). Cells connect horizontally and vertically only — NOT diagonally. `[[1,1,0],[0,1,0],[0,0,1]]` has 2 islands. Do not modify the input grid. Budget: O(rows × cols).",
    fnName: "countIslands",
    signature: "countIslands(grid: number[][]): number",
    starter: `function countIslands(grid) {
  // Scan every cell. When you find unvisited land, that is a new island:
  // increment the count and flood-fill everything reachable from it.
  // Four-directional only. Check bounds BEFORE reading a cell.
  // Do not modify grid — keep your own visited structure.

  return 0;
}`,
    tests: [
      {
        name: "two islands",
        input: [
          [
            [1, 1, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
        ],
        expected: 2,
      },
      {
        name: "all water",
        input: [
          [
            [0, 0],
            [0, 0],
          ],
        ],
        expected: 0,
      },
      {
        name: "all land is one island",
        input: [
          [
            [1, 1],
            [1, 1],
          ],
        ],
        expected: 1,
      },
      {
        // Diagonal neighbours must NOT connect. An 8-directional flood
        // returns 1 here instead of 2.
        name: "diagonals do not connect",
        input: [
          [
            [1, 0],
            [0, 1],
          ],
        ],
        expected: 2,
      },
      {
        name: "empty grid",
        input: [[]],
        expected: 0,
      },
      {
        name: "single land cell",
        input: [[[1]]],
        expected: 1,
        hidden: true,
      },
      {
        // A long snake: one island, and a recursive flood fill on this
        // shape recurses as deep as the number of cells.
        name: "snake shape is one island",
        input: [
          [
            [1, 1, 1],
            [0, 0, 1],
            [1, 1, 1],
          ],
        ],
        expected: 1,
        hidden: true,
      },
      {
        name: "each row separated by water",
        input: [
          [
            [1, 1],
            [0, 0],
            [1, 1],
          ],
        ],
        expected: 2,
        hidden: true,
      },
    ],
    hints: [
      "Keep a `visited` array the same shape as the grid, so the input stays untouched. Loop over every cell with two nested loops.",
      "When you find a `1` that is not yet visited, add one to the count and start a flood fill from it — mark visited as you ENQUEUE, exactly as in BFS.",
      "Use an explicit stack or queue rather than recursion. A long snake-shaped island recurses as deep as it has cells, and on a large grid that overflows.",
    ],
    solution: `function countIslands(grid) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];   // no diagonals
  let count = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1 || visited[r][c]) continue;

      count++;
      // Explicit stack, not recursion: a snake-shaped island is as deep
      // as it has cells.
      const stack = [[r, c]];
      visited[r][c] = true;

      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr;
          const nc = cc + dc;
          // Bounds FIRST, then the cell contents.
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (grid[nr][nc] !== 1 || visited[nr][nc]) continue;
          visited[nr][nc] = true;   // mark on push, never on pop
          stack.push([nr, nc]);
        }
      }
    }
  }

  return count;
}`,
    complexityGate: {
      target: "O(n)",
      // A checkerboard: every other cell is its own island, so the outer
      // scan and the flood fill both do their maximum work and nothing
      // can exit early. n is the total number of cells.
      gen: "(n) => { const side = Math.max(2, Math.floor(Math.sqrt(n))); return [Array.from({ length: side }, (_, r) => Array.from({ length: side }, (_, c) => ((r + c) % 2 === 0 ? 1 : 0)))]; }",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "The adjacency list is implicit",
      d: "Neighbours are just the four (or eight) offsets. There is no graph to build — which is why these run so fast and use so little memory.",
    },
    {
      t: "Islands equal connected components",
      d: "Scan every cell; whenever you find unvisited land, run a flood fill and increment the count. That is the whole algorithm.",
    },
    {
      t: "Extra state means extra dimensions",
      d: '"Shortest path with up to k walls removed" is BFS over (row, col, wallsUsed). The insight is that the state is bigger than the position — and the traversal code does not change at all.',
    },
    {
      t: "Check bounds before reading the cell",
      d: "Reading `grid[-1]` gives undefined in JavaScript and throws in Python. Both are avoidable by ordering the condition correctly, and neither is fun to debug.",
    },
    {
      t: "Recursive flood fill overflows on real inputs",
      d: "A long thin region recurses as deep as it has cells. A 1000×1000 grid can hold a million-cell snake, and the stack will not survive it.",
    },
  ],
  pitfalls: [
    "Including diagonals when the problem says four-directional, or omitting them when it says eight. Read the requirement and write the offsets down.",
    "Checking the cell contents before checking the bounds. The check has to be in the other order.",
    "Recursing for the flood fill. It is the natural expression and overflows on large regions.",
    "Keying the visited set on position alone when the problem has a budget or an inventory. The search then prunes states it should have explored, and returns a wrong answer rather than crashing.",
  ],
  quiz: [
    {
      q: "Counting islands in a grid is equivalent to:",
      options: [
        "Finding the shortest path",
        "Counting connected components",
        "Topological sorting",
        "Finding a minimum spanning tree",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Each island is a maximal set of mutually reachable land cells — the definition of a connected component.",
      distractors: [
        "Distance never enters the question. You only care what is reachable, not how far.",
        "",
        "Topological order needs a directed acyclic graph; grid adjacency is undirected.",
        "A spanning tree connects everything with minimum weight, which is a different question and needs weights.",
      ],
    },
    {
      q: "Shortest path in a grid where you may remove up to k obstacles. The BFS state should be:",
      options: [
        "(row, col)",
        "(row, col, obstaclesRemoved)",
        "(row, col, distance)",
        "(row, col, parent)",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Reaching a cell having used 2 removals is genuinely different from reaching it having used 0 — the second still has options the first does not. The budget must be part of the visited key.",
      distractors: [
        "This marks a cell visited on the first arrival, which may have spent the whole budget, and then refuses a later cheaper-in-budget arrival that could have gone further.",
        "",
        "Distance is the ANSWER, not part of the state. BFS already visits in distance order.",
        "The parent is for reconstructing the path afterwards and does not distinguish two situations at the same cell.",
      ],
    },
    {
      q: "Your flood fill crashes on a 1000×1000 grid but works on the tests. Most likely cause?",
      options: [
        "The grid is too large for memory",
        "Recursive flood fill on a large connected region recurses once per cell and overflows the stack",
        "An infinite loop",
        "The visited array is wrong",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A million-cell region means a million nested calls. Test grids are small, so this never appears until the input is real. Use an explicit stack or a queue.",
      distractors: [
        "A million cells is a few megabytes — entirely reasonable.",
        "",
        "An infinite loop would hang, not crash, and correct visited-marking prevents it.",
        "A broken visited array causes an infinite loop or a wrong count, not a stack overflow.",
      ],
    },
    {
      q: "Every cell has a movement COST — road 1, swamp 5. Which algorithm?",
      options: [
        "BFS",
        "Dijkstra — BFS assumes every move costs the same",
        "DFS",
        "Flood fill",
      ],
      answer: 1,
      difficulty: "judge",
      why: "BFS's guarantee comes from every edge costing the same, so the first arrival is cheapest. With varying terrain that no longer holds and you need a priority queue. If the only costs were 0 and 1, 0-1 BFS with a deque would beat both.",
      distractors: [
        "BFS would count steps and ignore the fact that some steps cost five times as much.",
        "",
        "DFS gives no distance guarantee at all.",
        "Flood fill answers reachability, not cost.",
      ],
    },
    {
      q: "Why not build an explicit adjacency list for a 1000×1000 grid?",
      options: [
        "It would be slower to traverse",
        "It stores about four million edges that two additions can recover from the coordinates — memory and a construction pass for nothing",
        "Grids cannot be represented as graphs",
        "Adjacency lists only work for sparse graphs",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The structure is fully determined by the coordinates. Materialising it duplicates information you already have and adds an O(cells) pass before the traversal even begins.",
      distractors: [
        "Traversal speed would be similar or marginally worse from the pointer chasing — the memory and the pointless build pass are the real objection.",
        "",
        "A grid IS a graph. That is the entire framing of this topic.",
        "A grid is very sparse — four neighbours out of a million — so a list is the right shape. It is simply unnecessary here.",
      ],
    },
    {
      q: "You must collect all keys scattered on a grid before reaching the exit, with up to 6 key types. State size?",
      options: [
        "rows × cols",
        "rows × cols × 2^6 — a bitmask of which keys you hold",
        "rows × cols × 6",
        "6",
      ],
      answer: 1,
      difficulty: "judge",
      why: "What matters is the SET of keys held, and there are 2^6 = 64 possible sets. So 64 states per cell, and BFS over that space is still linear in the state count. Note how the technique fails gracefully: 30 key types would be a billion states per cell, and you would need a different approach.",
      distractors: [
        "This ignores the keys entirely, so it would revisit a cell with a worse key set and prune the better arrival.",
        "",
        "6 would be the count of keys held, and it is the identity of the keys that matters — holding the red key is not interchangeable with holding the blue one.",
        "This ignores position, which is most of the state.",
      ],
    },
    {
      q: "'Rotting oranges': every minute, rotten oranges spoil their fresh neighbours. Find the minutes until all are rotten.",
      options: [
        "DFS from each rotten orange",
        "Multi-source BFS seeded with every rotten orange — each ring is one minute",
        "Dijkstra",
        "Sort by position",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Spreading simultaneously from all sources is exactly multi-source BFS, and the level structure makes the ring number the minute count. Running a separate search per source and taking the minimum gives the same answer for far more work.",
      distractors: [
        "DFS has no notion of levels, so the minute count would be wrong.",
        "",
        "All the edges cost one minute, so a priority queue adds a log factor for nothing.",
        "Position ordering does not model spreading at all.",
      ],
    },
    {
      q: "Marking cells visited by overwriting land with water saves the visited array. When is that a bad idea?",
      options: [
        "Never — it is strictly better",
        "When the caller still needs the grid, or the function may be called again on the same data",
        "When the grid is large",
        "When using BFS",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It is a genuine memory saving and it destroys the input. Mutating an argument the caller still owns is a surprise, and a second call on the same grid then returns zero. Do it deliberately, on a copy or with the mutation documented.",
      distractors: [
        "It has a real cost — the input is gone — so 'strictly better' is not right.",
        "",
        "Size is exactly when the saving is most attractive.",
        "It works equally well with either traversal.",
      ],
    },
  ],
};

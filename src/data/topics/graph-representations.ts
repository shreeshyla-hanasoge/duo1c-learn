import type { Topic } from "../types.ts";

export const graphRepresentations: Topic = {
  id: "graph-representations",
  title: "Representations",
  tier: 2,
  week: 11,
  depth: "core",
  summary: "Adjacency list vs matrix vs edge list — and when each is right.",
  why: "Choosing wrong costs you an order of magnitude in memory or a factor of V in time, before you have written any algorithm at all. It is also the first thing an interviewer expects you to say out loud when a problem turns out to be a graph.",
  complexity: "List O(V+E) space · Matrix O(V^2)",
  learn: {
    intuition:
      "A graph is just things and connections between them — users and friendships, cities and roads, tasks and dependencies. There is no single obvious way to store that in memory, and the three common choices differ in what they make cheap. An adjacency list stores, for each node, the list of its neighbours; it uses memory proportional to the connections that actually exist. An adjacency matrix is a big grid where cell (i, j) says whether i connects to j; it uses memory for every connection that COULD exist, which is n² of them. An edge list is simply a flat list of pairs. The decision comes down to one number: how dense is the graph? Real graphs are almost always sparse — a million users with two hundred friends each has 200 million connections out of a possible trillion — so the list wins almost every time. But 'almost every time' is not always, and knowing the exception is the point.",
    mechanics: [
      {
        heading: "Adjacency list: a list of neighbours per node",
        body: "`graph[u]` gives everything reachable from u in one step. Memory is O(V + E). Finding a node's neighbours is instant, which is exactly what BFS and DFS need on every step.",
      },
      {
        heading: "Adjacency matrix: a V × V grid of yes/no",
        body: "`matrix[u][v]` answers 'is there an edge' in one array read. Memory is O(V^2) whether or not the edges exist. Listing a node's neighbours means scanning a whole row — O(V) — even if it has two.",
      },
      {
        heading: "Edge list: a flat list of (u, v, weight)",
        body: "No per-node structure at all. Useless for 'who are u's neighbours' and perfect for algorithms that process every edge in some order, which is what Kruskal and Bellman-Ford do.",
      },
      {
        heading: "Directed or undirected is a storage decision too",
        body: "An undirected edge must be recorded in both directions in an adjacency list — add u to v's list AND v to u's. Forgetting the second half is the single most common graph bug, and it produces a graph that is subtly, silently wrong rather than broken.",
      },
      {
        heading: "Weights ride along with the edge",
        body: "Store `(neighbour, weight)` pairs in the list, or put the weight in the matrix cell with a sentinel such as infinity for 'no edge'. Using 0 for 'no edge' breaks the moment a real edge has weight 0.",
      },
    ],
    complexityDerivation:
      "The choice changes the cost of every algorithm you run afterwards, so it is worth seeing exactly where. A traversal such as BFS or DFS must, at each node, look at its neighbours. With an adjacency list, the total work across the whole traversal is the sum of all the neighbour lists, which is exactly 2E for an undirected graph — so the traversal is O(V + E). With a matrix, each node requires scanning a full row of V entries whether or not they are edges, so the traversal is O(V^2) regardless of how few edges exist. For a sparse graph with E ≈ V, that is the difference between O(V) and O(V^2): for a million nodes, two million operations against a trillion. Memory follows the same split — O(V + E) against O(V^2). The matrix wins in one specific place: testing whether a particular edge exists is O(1) in the matrix and O(degree) in the list. So the rule is: if your algorithm walks neighbours, use a list; if it repeatedly asks about specific pairs and V is small, use a matrix. Floyd-Warshall is the canonical matrix algorithm precisely because it does the latter, V^3 times.",
    variants: [
      {
        name: "Adjacency list",
        when: "The default. Any sparse graph, any traversal.",
        delta:
          "O(V + E) memory. A hash map of node to neighbour array when node ids are not contiguous integers; an array of arrays when they are.",
      },
      {
        name: "Adjacency matrix",
        when: "Dense graphs, small V, or repeated 'is there an edge' queries.",
        delta:
          "O(V^2) memory and O(1) edge tests. Also lets you use matrix multiplication — the number of paths of length k is the matrix raised to the k-th power.",
      },
      {
        name: "Edge list",
        when: "Kruskal's MST, Bellman-Ford, or just reading a graph from a file.",
        delta:
          "O(E) memory and no neighbour lookup at all. Usually the input format, converted to a list before traversal.",
      },
      {
        name: "Compressed sparse row (CSR)",
        when: "Large static graphs where cache behaviour matters.",
        delta:
          "Two flat arrays: all neighbours concatenated, plus an index of where each node's run starts. Same information as an adjacency list with one contiguous block instead of a million small arrays. This is what graph databases and scientific libraries actually use.",
      },
    ],
    tradeoffs: [
      {
        vs: "List versus matrix",
        pick: "List unless E is close to V^2 or V is tiny",
        because:
          "Density decides it. A useful rule of thumb: if the average degree is below about V/10, the list wins on both memory and traversal time. Below V/100 the matrix is not merely worse, it is often physically impossible to allocate.",
      },
      {
        vs: "Building a graph structure at all",
        pick: "Sometimes the implicit graph is better",
        because:
          "For a grid, a state machine, or a word-ladder, the neighbours can be computed on demand — up, down, left, right — instead of stored. That is O(1) memory for the graph and it avoids materialising a structure you would walk once.",
      },
      {
        vs: "A graph database",
        pick: "In-memory for a single computation, a database for a queried dataset",
        because:
          "Loading a graph into memory and traversing it is far faster than any database round trip. A database earns its place when the graph outlives one process, is bigger than memory, or must be queried by many clients.",
      },
    ],
  },
  realWorld: [
    {
      system: "Social graphs at scale",
      kind: "industry",
      problem:
        "A billion users with hundreds of connections each. An adjacency matrix would need 10^18 cells for roughly 10^11 real edges — around 99.99999% of it empty.",
      applied:
        "Adjacency lists, sharded by user and stored in compressed form. Facebook's TAO and similar systems are essentially distributed adjacency lists with a cache in front, because the only affordable representation of a sparse graph is one that stores what exists.",
      impact: "10^18 cells → 10^11 entries",
    },
    {
      system: "Compilers and build dependency graphs",
      kind: "industry",
      problem:
        "Module import graphs are read from source as pairs — 'A imports B' — but every useful question about them is a traversal.",
      applied:
        "Parse into an edge list, then build an adjacency list once for the topological sort and cycle detection. Converting representation up front is normal and cheap; doing it per query is not.",
    },
    {
      system: "Road networks and route planning",
      kind: "industry",
      problem:
        "Millions of intersections, each connecting to about four others. Extremely sparse, and traversed constantly.",
      applied:
        "Compressed sparse row layout, so a node's neighbours sit contiguously in memory and the traversal streams rather than chasing pointers. Same information as an adjacency list, dramatically better cache behaviour.",
      impact: "Pointer chasing per neighbour → sequential reads",
    },
    {
      system: "traed — strategy and instrument dependency graphs",
      kind: "yours",
      problem:
        "Indicators depending on other indicators, and strategies depending on instruments, form a directed graph that must be evaluated in dependency order and checked for cycles.",
      applied:
        "The relationships are naturally recorded as pairs, and every use of them is a traversal — so build the adjacency list once at configuration load rather than scanning the pair list per evaluation.",
      impact: "O(E) scan per neighbour query → O(1)",
    },
  ],
  lab: {
    prompt:
      "Given the number of nodes `n` (ids 0 to n−1) and a list of UNDIRECTED edges `[u, v]`, return the adjacency list: an array of length n where position i holds i's neighbours sorted ascending. Duplicate edges must appear only once, and self-loops `[u, u]` should be recorded once, not twice. Budget: O(V + E log E).",
    fnName: "buildAdjacency",
    signature: "buildAdjacency(n: number, edges: number[][]): number[][]",
    starter: `function buildAdjacency(n, edges) {
  // Undirected: EVERY edge goes into BOTH lists. Forgetting the second
  // half is the most common graph bug, and it fails silently.
  // Watch out for duplicate edges and for self-loops [u, u].

  return [];
}`,
    tests: [
      {
        name: "simple triangle",
        input: [
          3,
          [
            [0, 1],
            [1, 2],
            [0, 2],
          ],
        ],
        expected: [
          [1, 2],
          [0, 2],
          [0, 1],
        ],
      },
      {
        name: "isolated node keeps an empty list",
        input: [3, [[0, 1]]],
        expected: [[1], [0], []],
      },
      {
        name: "no edges",
        input: [2, []],
        expected: [[], []],
      },
      {
        name: "neighbours must be sorted",
        input: [
          4,
          [
            [0, 3],
            [0, 1],
            [0, 2],
          ],
        ],
        expected: [[1, 2, 3], [0], [0], [0]],
      },
      {
        name: "duplicate edge appears once",
        input: [
          2,
          [
            [0, 1],
            [1, 0],
            [0, 1],
          ],
        ],
        expected: [[1], [0]],
      },
      {
        // A self-loop is one edge, so it belongs in u's list once — adding
        // it "in both directions" would record it twice.
        name: "self-loop is recorded once",
        input: [2, [[0, 0]]],
        expected: [[0], []],
        hidden: true,
      },
      {
        name: "zero nodes",
        input: [0, []],
        expected: [],
        hidden: true,
      },
      {
        name: "star graph",
        input: [
          4,
          [
            [3, 0],
            [3, 1],
            [3, 2],
          ],
        ],
        expected: [[3], [3], [3], [0, 1, 2]],
        hidden: true,
      },
    ],
    hints: [
      "Create `n` empty containers first, so isolated nodes still get an entry. `Array.from({ length: n }, () => new Set())` handles both the allocation and the deduplication.",
      "For each `[u, v]`, add `v` to u's set and `u` to v's set. Using a Set means a repeated edge costs nothing extra and no separate dedup pass is needed.",
      "A self-loop is the one case where those two additions are the same operation — a Set makes that automatic. Finally convert each set to a sorted array.",
    ],
    solution: `function buildAdjacency(n, edges) {
  // Sets, not arrays: duplicate edges collapse on their own, and a
  // self-loop's two "directions" are the same entry.
  const adj = Array.from({ length: n }, () => new Set());

  for (const [u, v] of edges) {
    adj[u].add(v);
    adj[v].add(u);   // undirected — both directions, always
  }

  return adj.map((s) => [...s].sort((a, b) => a - b));
}`,
  },
  insights: [
    {
      t: "Adjacency list is the default",
      d: "Real graphs are sparse: E is far closer to V than to V^2. The list stores what exists; the matrix stores everything that could exist.",
    },
    {
      t: "Matrix wins for dense graphs and O(1) edge tests",
      d: 'If you constantly ask "is there an edge u→v?" and V is small, the matrix is both simpler and faster. Floyd-Warshall assumes it.',
    },
    {
      t: "Edge list is for Kruskal and Bellman-Ford",
      d: "Both iterate over edges rather than neighbours, so a flat list of edges is the natural form and no conversion is needed.",
    },
    {
      t: "Undirected means both directions, every time",
      d: "Adding only `adj[u].push(v)` builds a directed graph that looks right in small tests and gives wrong answers on anything real. It is the most common graph bug there is.",
    },
    {
      t: "Sometimes the best representation is none",
      d: "For grids and state machines the neighbours are computable — up, down, left, right — so there is nothing to store. An implicit graph costs O(1) memory.",
    },
  ],
  pitfalls: [
    "Adding an undirected edge in one direction only. Half your graph quietly disappears.",
    "Using 0 as the 'no edge' marker in a weighted matrix. It breaks as soon as a real edge has weight 0 — use infinity, or a separate presence matrix.",
    "Building a V × V matrix for a sparse graph. For a million nodes that is a trillion cells, which will not allocate.",
    "Assuming node ids are contiguous integers starting at 0. Real ids are strings and UUIDs — map them to indices once, or use a hash map of lists.",
  ],
  quiz: [
    {
      q: "A social graph has 1M users averaging 200 friends. Which representation?",
      options: [
        "Adjacency matrix — O(1) edge lookup",
        "Adjacency list — the matrix would need 10^12 entries for only 2×10^8 edges",
        "Edge list",
        "It makes no difference",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The graph is extremely sparse. The matrix would be about 99.98% zeros and physically infeasible to allocate.",
      distractors: [
        "The O(1) lookup is real and costs a trillion cells to get. That is roughly a terabyte for one bit each.",
        "",
        "Fine for storage or for edge-iterating algorithms, and it cannot answer 'who are this user's friends' without a full scan.",
        "It is the difference between a few gigabytes and a terabyte, and between O(V+E) and O(V^2) traversal.",
      ],
    },
    {
      q: "Which algorithm most naturally consumes an edge list?",
      options: ["BFS", "Kruskal's MST", "Dijkstra's", "DFS"],
      answer: 1,
      difficulty: "apply",
      why: "Kruskal sorts all the edges by weight and adds them greedily. It never asks for a node's neighbours, so a per-node structure would go unused.",
      distractors: [
        "BFS asks for neighbours at every step, which an edge list cannot answer without scanning everything.",
        "",
        "Dijkstra relaxes the edges leaving the current node, so it needs neighbour lookup.",
        "DFS is neighbour-driven too, just in a different order.",
      ],
    },
    {
      q: "Running BFS on a graph stored as an adjacency matrix costs:",
      options: ["O(V + E)", "O(V^2)", "O(E log V)", "O(V)"],
      answer: 1,
      difficulty: "apply",
      why: "Each node requires scanning a full row of V entries to find its neighbours, whether or not the edges exist. V nodes times V entries is V^2, regardless of how sparse the graph is.",
      distractors: [
        "That is the adjacency list cost, where you read only the edges that exist.",
        "",
        "A log factor requires a priority queue. Plain BFS uses a queue and has none.",
        "You cannot avoid looking at the connections, and in a matrix that means every cell.",
      ],
    },
    {
      q: "You add an undirected edge with `adj[u].push(v)` only. What is the symptom?",
      options: [
        "A crash",
        "A silently directed graph — traversals reach v from u but never u from v, so components look disconnected",
        "Duplicate edges",
        "Nothing, if the graph is a tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Nothing errors. The graph is simply a different graph from the one you meant, and the wrongness shows up as components that should be connected appearing separate — which is easy to mistake for a bug in the algorithm rather than in the data.",
      distractors: [
        "Every index is valid and every operation succeeds. Silent wrongness is what makes it dangerous.",
        "",
        "The opposite — you have too few entries, not too many.",
        "It breaks on trees too. Traversal from a leaf would immediately fail to reach its parent.",
      ],
    },
    {
      q: "For a 1000 × 1000 grid where you can move to the four adjacent cells, the best representation is:",
      options: [
        "An adjacency list with a million nodes",
        "No stored graph at all — compute the four neighbours from the coordinates when needed",
        "An adjacency matrix",
        "An edge list",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The structure is implicit in the coordinates, so storing it duplicates information you already have. This saves the memory and the entire build pass, and it is why grid BFS problems never construct a graph.",
      distractors: [
        "Correct and it materialises four million edges you can derive with two additions.",
        "",
        "A million by a million matrix is 10^12 cells for a graph with 4 million edges.",
        "Same objection — storing what is already computable.",
      ],
    },
    {
      q: "When does an adjacency MATRIX genuinely beat a list?",
      options: [
        "Never",
        "When the graph is dense, V is small, or the algorithm repeatedly tests specific pairs — Floyd-Warshall being the standard case",
        "For very large graphs",
        "When the graph is a tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Floyd-Warshall asks 'is the route through k better than the direct one' V^3 times, which is exactly the O(1) pair lookup the matrix provides. Its own cost is V^3 anyway, so the V^2 memory is not the constraint.",
      distractors: [
        "Too strong. There are real cases, and knowing them is the point of the question.",
        "",
        "Backwards — large graphs are where the V^2 memory becomes impossible.",
        "A tree is maximally sparse, which is the worst possible case for a matrix.",
      ],
    },
    {
      q: "Your node ids are UUID strings, not integers. What changes?",
      options: [
        "Nothing",
        "Map each id to a contiguous index once, then use arrays — or use a hash map of lists and accept the hashing cost per lookup",
        "You cannot build a graph",
        "You must sort them",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Array indexing needs small dense integers. Assigning indices in one pass buys you array-speed adjacency for the whole traversal; a hash map of lists skips that pass and pays a hash per neighbour lookup instead. Which is better depends on how many traversals you will run.",
      distractors: [
        "`adj[someUuid]` on an array creates a string-keyed property and quietly abandons the fast path.",
        "",
        "It is routine — the mapping step is four lines.",
        "Order is irrelevant. What matters is dense integer indices.",
      ],
    },
    {
      q: "What is compressed sparse row (CSR) and why use it?",
      options: [
        "A compression algorithm for files",
        "All neighbour lists concatenated into one flat array plus an index of where each node's run begins — same information, contiguous memory, far better cache behaviour",
        "A way to store dense graphs",
        "A database format",
      ],
      answer: 1,
      difficulty: "judge",
      why: "An adjacency list of a million nodes is a million separate small arrays scattered across the heap, so every neighbour lookup risks a cache miss. CSR puts them in one block, so traversal reads sequentially. Same complexity class, dramatically better constant factor — which is why route planners and scientific graph libraries use it.",
      distractors: [
        "Unrelated to file compression, despite the name.",
        "",
        "Its whole purpose is sparse graphs. A dense graph would use a matrix.",
        "It is an in-memory layout, though graph databases do use it internally.",
      ],
    },
  ],
};

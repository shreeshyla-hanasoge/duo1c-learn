import type { Topic } from "../types.ts";

export const dsu: Topic = {
  id: "dsu",
  title: "Union-Find (DSU)",
  tier: 2,
  week: 11,
  depth: "core",
  summary: "Path compression + union by rank, at effectively constant cost.",
  why: 'Connectivity, clustering nearby values, Kruskal\'s cycle test, and "are these two things in the same group?" — all in near-constant time. It is also the structure people most often fail to recognise: a surprising number of grouping problems are union-find in disguise.',
  complexity: "O(α(n)) amortised — effectively constant",
  viz: ["dsu"],
  learn: {
    intuition:
      "Union-find answers one question — are these two things in the same group? — and supports one change: merge two groups. That sounds too limited to be useful, and it turns out to cover an enormous amount of ground. The representation is the clever part. Each item points to a parent, and following parents upward leads to a representative for the whole group. Two items are in the same group exactly when they lead to the same representative. Merging two groups is then a single pointer change: make one representative point at the other. The naive version degrades into long chains, so two refinements are added. Union by rank always hangs the shorter tree under the taller one, keeping things flat. Path compression re-points every node you walk past directly at the representative, so the next query is instant. Together they make the structure so fast that the cost per operation is, for any input that fits in the observable universe, below five steps.",
    mechanics: [
      {
        heading: "Every item points to a parent; the root represents the group",
        body: "Initially each item is its own parent, so there are n groups of one. The root is any node whose parent is itself, and its identity is arbitrary — what matters is that everyone in the group reaches the same one.",
      },
      {
        heading: "Find: follow parents to the root",
        body: "`while (parent[x] !== x) x = parent[x]`. Two items are in the same group precisely when their roots match. Comparing anything else — the parents, the values — is wrong.",
      },
      {
        heading: "Path compression: flatten as you go",
        body: "After finding the root, point every node you passed directly at it. The next query on any of them is one hop. This is why the structure gets faster the more you use it.",
      },
      {
        heading: "Union by rank or size: attach the smaller under the larger",
        body: "Without this, repeatedly merging can build a long chain. Track an approximate height (rank) or the group size, and always hang the smaller tree beneath the larger. That keeps depth logarithmic even before compression.",
      },
      {
        heading: "Merging is a single pointer write",
        body: "Find both roots. If they are the same, the items were already together — which, in Kruskal's algorithm, is exactly how you detect that an edge would close a cycle. Otherwise point one root at the other.",
      },
    ],
    complexityDerivation:
      "Each refinement alone gives O(log n) per operation. Union by rank bounds the tree depth: a tree of rank r contains at least 2^r nodes, so with n items the rank cannot exceed log₂ n, and find walks at most that far. Path compression alone gives the same O(log n) bound by a different argument. What is genuinely surprising is that using BOTH gives O(α(n)) amortised, where α is the inverse Ackermann function — and α grows so slowly that it is at most 4 for any n up to roughly 2^65536. So while the bound is not literally constant, no physically constructible input distinguishes it from constant. The practical takeaway is not the mathematics but the shape of the trade: two small refinements, each worth a log factor on its own, combine into something dramatically better than either. It is also worth knowing that the amortised bound is a claim about a SEQUENCE of operations. Any single find can still walk a long path — it is only the total across many operations that is bounded, because each long walk pays for itself by flattening what it touched.",
    variants: [
      {
        name: "Union by size",
        when: "You also want the group sizes, which is often.",
        delta:
          "Track the count instead of the rank. Same asymptotic behaviour, and 'how big is this group' becomes free — which 'largest connected component' problems need.",
      },
      {
        name: "Union-find with rollback",
        when: "You need to undo merges, for example in an offline query algorithm.",
        delta:
          "Keep a stack of the changes and skip path compression, since compression cannot be undone. Costs the log factor back but makes merges reversible.",
      },
      {
        name: "Weighted / potential union-find",
        when: "You track a relationship, not just membership — 'A is 3 units heavier than B'.",
        delta:
          "Store an offset relative to the parent and accumulate it during find. Detects contradictions in the constraints as a side effect.",
      },
      {
        name: "Union-find over a grid",
        when: "Islands, flood fill, percolation.",
        delta:
          "Map (row, col) to `row * width + col` and union adjacent cells. Often simpler than a traversal when the cells arrive incrementally rather than all at once.",
      },
    ],
    tradeoffs: [
      {
        vs: "DFS or BFS for connectivity",
        pick: "Traversal for a one-off question, union-find when edges arrive over time",
        because:
          "A single 'are these connected' query on a static graph is one O(V + E) traversal, and union-find has nothing to add. The structure earns its place when edges arrive incrementally and you must answer after each one — traversing per edge would be O(E·(V+E)).",
      },
      {
        vs: "A hash map from item to group id",
        pick: "Union-find, because merging is the expensive operation",
        because:
          "With a map from item to group, merging two groups means relabelling every member — O(size). Union-find changes one pointer. The trade is that you cannot list a group's members without a separate pass, which the map gives you directly.",
      },
      {
        vs: "Storing the graph and recomputing components",
        pick: "Union-find when you only need the grouping",
        because:
          "It uses O(n) memory, no adjacency lists, and never stores the edges at all. If you later need paths or neighbours, it cannot help — it knows that two things are connected and nothing about how.",
      },
    ],
  },
  realWorld: [
    {
      system: "Kruskal's minimum spanning tree",
      kind: "industry",
      problem:
        "Add edges cheapest-first, but skip any edge whose endpoints are already connected, or you create a cycle instead of a tree.",
      applied:
        "The cycle test is exactly 'do these two endpoints have the same root'. Union-find makes it near-constant, which is what leaves the sort as the dominant cost and gives Kruskal its O(E log E).",
      impact: "O(V) connectivity check per edge → effectively O(1)",
    },
    {
      system: "Image segmentation and connected component labelling",
      kind: "industry",
      problem:
        "Labelling connected regions in a large image in one pass, where two regions given different labels early can turn out to be joined later.",
      applied:
        "Assign provisional labels on the first pass and union them when a connection is discovered. A second pass replaces each provisional label by its root. This is the standard two-pass algorithm, and merging labels is precisely what union-find is for.",
    },
    {
      system: "Network reliability and percolation analysis",
      kind: "industry",
      problem:
        "As links are added to a network, at what point does the whole thing become connected — and which parts are still isolated?",
      applied:
        "Union each new link and watch the group count fall. The moment it reaches one, the network is fully connected. Recomputing components after every link with a traversal would be quadratic.",
      impact: "O(E · (V+E)) recomputation → O(E · α(n))",
    },
    {
      system: "traed — clustering nearby price levels",
      kind: "yours",
      problem:
        "Grouping support and resistance levels, or strikes, that lie within a tolerance of each other. Pairwise comparison of every level against every other is O(n^2).",
      applied:
        "Sort once, then union each adjacent pair that falls within the tolerance. Because sorted order means only neighbours can be close, this is O(n log n) overall and the transitive grouping — A near B, B near C — falls out automatically.",
      impact: "O(n^2) pairwise clustering → O(n log n)",
    },
  ],
  lab: {
    prompt:
      "Given `n` items and a list of `[a, b]` pairs meaning 'a and b are in the same group', return the size of the LARGEST group. Implement union-find with both path compression and union by size — the naive version passes the small tests and degrades badly on the deep chains the gate builds. Budget: O(n) for practical purposes.",
    fnName: "largestGroup",
    signature: "largestGroup(n: number, pairs: number[][]): number",
    starter: `function largestGroup(n, pairs) {
  // parent[i] starts as i (everyone alone), size[i] starts as 1.
  // find(x): walk to the root, and re-point everything you passed at it.
  // union(a, b): find both roots; if different, hang the SMALLER under
  // the larger and add the sizes.

  return 0;
}`,
    tests: [
      {
        name: "two groups, larger is 3",
        input: [
          5,
          [
            [0, 1],
            [1, 2],
            [3, 4],
          ],
        ],
        expected: 3,
      },
      {
        name: "no pairs — every item alone",
        input: [4, []],
        expected: 1,
      },
      {
        name: "everything joins one group",
        input: [
          4,
          [
            [0, 1],
            [1, 2],
            [2, 3],
          ],
        ],
        expected: 4,
      },
      {
        // Merging two items already in the same group must NOT double-count
        // the size. This is the check that catches a missing root comparison.
        name: "duplicate pair does not inflate the size",
        input: [
          3,
          [
            [0, 1],
            [0, 1],
            [1, 0],
          ],
        ],
        expected: 2,
      },
      {
        name: "self-pair changes nothing",
        input: [2, [[0, 0]]],
        expected: 1,
      },
      {
        name: "zero items",
        input: [0, []],
        expected: 0,
        hidden: true,
      },
      {
        // Two chains built separately and then joined at the ends: the
        // transitive grouping must carry all the way through.
        name: "two chains joined at the ends",
        input: [
          6,
          [
            [0, 1],
            [1, 2],
            [3, 4],
            [4, 5],
            [2, 3],
          ],
        ],
        expected: 6,
        hidden: true,
      },
      {
        name: "single item",
        input: [1, []],
        expected: 1,
        hidden: true,
      },
    ],
    hints: [
      "Start with `parent = [0,1,2,...]` and `size = [1,1,1,...]`. Each item is its own group of one.",
      "`find(x)`: walk up while `parent[x] !== x`. Then walk the path a second time re-pointing each node directly at the root — that is path compression, and it is what makes repeated queries cheap.",
      "`union(a, b)`: get both roots; if they are equal do nothing. Otherwise attach the smaller tree under the larger and add the sizes. Skipping the equal check is what makes duplicate pairs inflate the answer.",
    ],
    solution: `function largestGroup(n, pairs) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const size = new Array(n).fill(1);

  function find(x) {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    // Path compression: re-point everything on the way at the root,
    // so the next find on any of them is a single hop.
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  }

  for (const [a, b] of pairs) {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) continue;          // already together — do NOT add sizes
    // Union by size: hang the smaller tree under the larger.
    if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    size[ra] += size[rb];
  }

  let best = 0;
  for (let i = 0; i < n; i++) {
    if (find(i) === i) best = Math.max(best, size[i]);
  }
  return best;
}`,
    complexityGate: {
      target: "O(n)",
      // A long chain built end to end — the shape that makes a union-find
      // WITHOUT path compression degrade into a linked list.
      gen: "(n) => [n, Array.from({ length: n - 1 }, (_, i) => [i, i + 1])]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Both optimisations are required",
      d: "Path compression alone gives O(log n). Union by rank alone gives O(log n). Together they give inverse Ackermann — under 5 for any n that fits in the universe.",
    },
    {
      t: "It cannot un-merge",
      d: "Union-find is one-way. If edges can be removed, you need a different structure — or the standard trick of processing the timeline backwards, so deletions become insertions.",
    },
    {
      t: "The perfect fit for 1-D clustering",
      d: "Grouping nearby price levels or coordinates by pairwise comparison is O(n^2). Sort once, union adjacent items within tolerance, and it is O(n log n).",
    },
    {
      t: "Compare ROOTS, never parents",
      d: "Two items in the same group can have completely different parents. Only the root identifies the group, which is why every operation starts with a find.",
    },
    {
      t: "The amortised bound is about sequences",
      d: "A single find can still walk a long path. It pays for itself by flattening everything it touches, so the total across many operations is what stays bounded.",
    },
  ],
  pitfalls: [
    "Comparing `parent[a] === parent[b]` instead of `find(a) === find(b)`. Two members of the same group routinely have different parents.",
    "Adding the sizes without checking that the roots differ. A repeated pair then doubles a group's recorded size.",
    "Attaching arbitrarily instead of by size or rank. Repeated merges build a chain, and every find becomes O(n).",
    "Reaching for union-find when you need the path between two nodes. It knows they are connected and nothing about how.",
  ],
  quiz: [
    {
      q: "With BOTH path compression and union by rank, the amortised cost per operation is:",
      options: [
        "O(1) exactly",
        "O(α(n)) — inverse Ackermann, under 5 for any practical n",
        "O(log n)",
        "O(log* n)",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The Tarjan bound. It is not literally constant, but the difference is unobservable at any real scale.",
      distractors: [
        "Close enough to be true in practice and not the precise claim, and interviewers ask this one specifically to see whether you know the difference.",
        "",
        "That is what EITHER optimisation gives on its own. The point is that together they do far better.",
        "Iterated logarithm is the bound for some other structures and grows faster than inverse Ackermann.",
      ],
    },
    {
      q: "Which problem is DSU a poor fit for?",
      options: [
        "Detecting whether adding an edge creates a cycle",
        "Counting connected components",
        "A graph where edges are added AND removed over time",
        "Clustering values within a tolerance",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Union-find supports merging but not splitting. Deletions require either a different structure or processing the operations in reverse, which turns each deletion into an insertion.",
      distractors: [
        "This is its signature use — the cycle test inside Kruskal's algorithm.",
        "The group count starts at n and drops by one per successful merge, so it is free.",
        "",
        "Sort, then union adjacent values within tolerance. A very good fit.",
      ],
    },
    {
      q: "Your `largestGroup` reports 4 for `n = 3` with pairs `[[0,1],[0,1]]`. What is wrong?",
      options: [
        "Path compression is missing",
        "You added the sizes without first checking whether the two roots were already the same",
        "Union by size is missing",
        "The pairs are invalid",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The second identical pair finds both items already in one group. Without the `if (ra === rb) continue` guard you add the group's size to itself, and duplicate edges are entirely normal in real input.",
      distractors: [
        "Compression affects speed, never the answer.",
        "",
        "Union by size affects the tree shape, not the totals.",
        "Duplicate pairs are ordinary input that the structure is expected to handle.",
      ],
    },
    {
      q: "Why compare roots rather than parents to test whether two items are in the same group?",
      options: [
        "Parents are faster to look up",
        "Two members of one group routinely have different parents — only the root is shared by everyone in the group",
        "Parents can be null",
        "There is no difference",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The group is a tree. A node deep in one branch and a node in another branch have different parents and the same root. The root is the group's identity, which is why every operation begins with a find.",
      distractors: [
        "Both are one array read. Speed is not the issue — correctness is.",
        "",
        "In the standard implementation a root is its own parent, so nothing is ever null.",
        "They differ for any group with more than two members.",
      ],
    },
    {
      q: "Edges arrive one at a time and after each you must answer 'is the graph fully connected yet?'. Best approach?",
      options: [
        "BFS after each edge",
        "Union-find, tracking the group count — it starts at n and drops by one per successful merge",
        "Store the edges and check at the end",
        "Sort the edges",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The count is maintained for free as a side effect of merging, so each query is an integer comparison. A traversal per edge would be O(E · (V + E)).",
      distractors: [
        "Correct and O(V + E) per edge, which is exactly what the incremental structure exists to avoid.",
        "",
        "The question asks after EACH edge, so deferring to the end answers a different question.",
        "Order is irrelevant to connectivity.",
      ],
    },
    {
      q: "You need to UNDO merges. What changes?",
      options: [
        "Nothing — just reverse the operations",
        "Drop path compression and keep a stack of the changes, which costs the log factor back",
        "Use a hash map instead",
        "It is impossible",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Path compression rewrites pointers destructively and cannot be undone, so rollback support means giving it up. With union by size alone the depth stays O(log n), which is the price of reversibility.",
      distractors: [
        "There is no record of what changed, and compression has already destroyed the original structure.",
        "",
        "A map makes merging O(size), which is far worse.",
        "Rollback union-find is a standard technique, used in offline dynamic-connectivity algorithms.",
      ],
    },
    {
      q: "Clustering 100,000 price levels so that any two within 0.5 of each other end up in one group. Approach?",
      options: [
        "Compare every pair — O(n^2)",
        "Sort, then union each adjacent pair within tolerance — O(n log n), and transitivity is automatic",
        "Hash by rounded value",
        "K-means",
      ],
      answer: 1,
      difficulty: "judge",
      why: "After sorting, only neighbours can be within tolerance, so adjacent comparisons are sufficient. Union-find then chains A-B and B-C into one group without you having to notice that A and C are related.",
      distractors: [
        "10 billion comparisons for something the sorted order makes unnecessary.",
        "",
        "Rounding puts 0.49 and 0.51 in different buckets despite being 0.02 apart — the classic boundary failure.",
        "K-means needs a target cluster count and does not express a tolerance rule.",
      ],
    },
    {
      q: "Union-find without union by size, merging in a long chain. What happens?",
      options: [
        "Nothing",
        "The tree becomes a linked list, so each find walks O(n) — until path compression flattens it, which is why having at least one of the two matters",
        "It gives wrong answers",
        "It uses more memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Always attaching in one direction builds a chain. Path compression repairs it after the first deep find, so having either optimisation keeps you at O(log n) — having neither is what gives genuinely linear finds.",
      distractors: [
        "The shape degrades badly, which is exactly what the refinements exist to prevent.",
        "",
        "The answers stay correct. Only the cost changes.",
        "Memory is O(n) regardless of the tree's shape.",
      ],
    },
  ],
};

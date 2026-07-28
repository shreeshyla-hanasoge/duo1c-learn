import type { Topic } from "../types.ts";

export const mst: Topic = {
  id: "mst",
  title: "Minimum spanning tree",
  tier: 2,
  week: 12,
  depth: "core",
  summary: "Kruskal and Prim.",
  why: "Network design, clustering, and the canonical demonstration that a greedy choice can be provably optimal. Most greedy algorithms are wrong; this is the one where you can say exactly why greedy works, and that argument is what interviewers are probing.",
  complexity: "O(E log E)",
  learn: {
    intuition:
      "You have a set of locations and the cost of laying cable between various pairs. You want every location connected, for the least total cost. The answer is a spanning tree — connecting n locations needs exactly n−1 cables, because fewer leaves something isolated and more creates a redundant loop. What makes this topic special is that the obvious greedy approach is actually correct, which is unusual. Sort every possible cable by cost and lay them cheapest-first, skipping any that would connect two locations already joined. That is Kruskal's algorithm, and it provably produces the cheapest possible network. The reason it works is a property called the cut property: if you split the locations into any two groups, the cheapest cable crossing between them must be in the optimal answer — because without it, connecting the two groups would cost more. Every greedy step is an instance of that argument, which is why the greed never has to be undone.",
    mechanics: [
      {
        heading: "Kruskal: sort every edge, add cheapest-first",
        body: "Take edges in increasing weight order. Add one if its endpoints are not yet connected; skip it if they are, because it would close a cycle rather than join anything new. Stop after n−1 edges.",
      },
      {
        heading: "The cycle test is union-find",
        body: "'Are these endpoints already connected' is exactly the find-and-compare operation. That is why the two topics are always taught together, and it keeps the test at effectively constant cost so the sort remains the dominant term.",
      },
      {
        heading: "Prim: grow one tree outward from a start node",
        body: "Keep a set of nodes already in the tree. Repeatedly add the cheapest edge crossing from the tree to a node outside it. A priority queue keyed by that crossing cost makes each step efficient — it is Dijkstra's shape with the edge weight in place of the accumulated distance.",
      },
      {
        heading: "The cut property is the proof",
        body: "Split the nodes into any two groups. The cheapest edge crossing that split belongs to some minimum spanning tree. Kruskal applies it globally, Prim applies it to the split between 'in the tree' and 'not yet' — two algorithms, one theorem.",
      },
      {
        heading: "Cutting the k−1 heaviest tree edges gives k clusters",
        body: "The spanning tree connects everything by the cheapest links. Removing the most expensive of those links breaks it into the groups that were most weakly attached — which is exactly single-linkage clustering, obtained for free.",
      },
    ],
    complexityDerivation:
      "Kruskal sorts E edges, which is O(E log E), then processes each with a near-constant union-find operation, which is O(E·α(V)) and effectively O(E). So the sort dominates: O(E log E). Since E is at most V^2, log E is at most 2 log V, so this is equivalently written O(E log V) — the two forms are the same class. Prim with a binary heap pops each node once at O(log V) and pushes at most once per edge, giving O((V + E) log V). On a sparse graph where E ≈ V those are both roughly V log V and the choice hardly matters. On a dense graph where E ≈ V^2 they diverge: Kruskal becomes V^2 log V because it must sort every one of the V^2 edges, while Prim implemented with a simple array scan instead of a heap — repeatedly finding the nearest outside node in O(V) — is O(V^2) with no sort at all. That is the one place the textbook comparison has a real consequence: on a dense graph, deliberately using the WORSE data structure gives the better algorithm, because it avoids sorting edges you were going to skip anyway.",
    variants: [
      {
        name: "Kruskal",
        when: "Sparse graphs, or when the edges already arrive as a list.",
        delta:
          "Sort plus union-find. Naturally handles a disconnected graph — you get a spanning FOREST, one tree per component, with no special cases.",
      },
      {
        name: "Prim with a heap",
        when: "Sparse to moderate density, and you want to grow from a specific node.",
        delta:
          "O((V + E) log V). Needs an adjacency structure rather than an edge list, and only covers the component containing the start node.",
      },
      {
        name: "Prim with an array scan",
        when: "Dense graphs, E close to V^2.",
        delta:
          "O(V^2), and it beats every heap-based approach when the graph is dense, because it never sorts. The simpler structure is the faster one here.",
      },
      {
        name: "Borůvka",
        when: "Parallel or distributed construction.",
        delta:
          "Every component simultaneously picks its own cheapest outgoing edge, halving the component count each round. The oldest MST algorithm, from 1926, and the one that parallelises.",
      },
    ],
    tradeoffs: [
      {
        vs: "Shortest-path trees (Dijkstra)",
        pick: "They answer different questions — do not substitute one for the other",
        because:
          "An MST minimises the TOTAL edge weight of the network. A shortest-path tree minimises the distance from one source to each node. They are usually different trees, and confusing them is a common error: the cheapest network to build is generally not the fastest one to travel across.",
      },
      {
        vs: "k-means clustering",
        pick: "MST-based clustering when the shapes are irregular",
        because:
          "Cutting the heaviest MST edges gives single-linkage clustering, which finds elongated and irregular groups that k-means cannot, because k-means assumes roughly spherical clusters. The trade is that single-linkage is sensitive to a single bridging point between two groups.",
      },
      {
        vs: "Just connecting everything to a hub",
        pick: "MST when link costs differ",
        because:
          "A star topology is trivial and optimal only when every link costs the same. Once costs vary with distance or capacity, the star can be arbitrarily worse — and the MST is the provable optimum.",
      },
    ],
  },
  realWorld: [
    {
      system: "Network and utility layout",
      kind: "industry",
      problem:
        "Connect every substation, exchange or building at minimum total cable cost, where the cost of each possible link differs.",
      applied:
        "Exactly the original motivation — Borůvka devised his algorithm in 1926 for electrifying Moravia. Modern network planning adds capacity and redundancy constraints, which turn it into a harder problem, but the MST remains the baseline.",
      evidence: "Borůvka, 1926",
    },
    {
      system: "Single-linkage clustering",
      kind: "industry",
      problem:
        "Grouping points where the clusters are elongated or irregular, so distance-to-centre methods such as k-means fail.",
      applied:
        "Build the MST over the points and cut the k−1 heaviest edges. The remaining components are the clusters. This gives hierarchical structure for free — the order of the cuts is the dendrogram.",
      impact: "Clustering without assuming spherical shapes",
    },
    {
      system: "Image segmentation",
      kind: "industry",
      problem:
        "Splitting an image into regions of similar pixels, where region boundaries are irregular by nature.",
      applied:
        "Pixels are nodes and edges are weighted by colour difference. An MST-based segmentation merges regions in increasing order of difference — the Felzenszwalb-Huttenlocher algorithm is a refinement of exactly this.",
    },
    {
      system: "traed — grouping correlated instruments",
      kind: "yours",
      problem:
        "Identifying clusters of instruments that move together, for hedging and for avoiding concentrated exposure across positions that look independent and are not.",
      applied:
        "Build a graph weighted by correlation distance, take the MST, and cut the heaviest edges. Groups emerge without having to choose a cluster count in advance, and the cut order shows how strongly each group holds together.",
    },
  ],
  lab: {
    prompt:
      "Return the total weight of a minimum spanning tree over `n` nodes given a list of `[u, v, weight]` edges. If the graph is disconnected and no spanning tree exists, return −1. Use Kruskal: sort by weight and add an edge only when its endpoints are not already connected. You will need union-find for the cycle test.",
    fnName: "mstWeight",
    signature: "mstWeight(n: number, edges: number[][]): number",
    starter: `function mstWeight(n, edges) {
  // Sort edges by weight, then add each one only if its endpoints are
  // NOT already connected — otherwise it closes a cycle.
  // You need union-find (parent array + find with path compression).
  // Exactly n-1 edges make a spanning tree; fewer means disconnected.

  return -1;
}`,
    tests: [
      {
        // Cheapest links 0-1 (1) and 1-2 (2); the 0-2 edge of 3 would
        // close a cycle and is skipped.
        name: "triangle — skip the expensive edge",
        input: [
          3,
          [
            [0, 1, 1],
            [1, 2, 2],
            [0, 2, 3],
          ],
        ],
        expected: 3,
      },
      {
        name: "disconnected returns -1",
        input: [3, [[0, 1, 5]]],
        expected: -1,
      },
      {
        name: "single node needs no edges",
        input: [1, []],
        expected: 0,
      },
      {
        name: "already a tree — every edge is used",
        input: [
          3,
          [
            [0, 1, 4],
            [1, 2, 6],
          ],
        ],
        expected: 10,
      },
      {
        // Parallel edges between the same pair: only the cheaper is used.
        name: "parallel edges — cheapest wins",
        input: [
          2,
          [
            [0, 1, 9],
            [0, 1, 2],
          ],
        ],
        expected: 2,
      },
      {
        name: "no nodes",
        input: [0, []],
        expected: 0,
        hidden: true,
      },
      {
        name: "zero-weight edges are legal",
        input: [
          3,
          [
            [0, 1, 0],
            [1, 2, 0],
          ],
        ],
        expected: 0,
        hidden: true,
      },
      {
        name: "square with a diagonal",
        input: [
          4,
          [
            [0, 1, 1],
            [1, 2, 1],
            [2, 3, 1],
            [3, 0, 10],
            [0, 2, 10],
          ],
        ],
        expected: 3,
        hidden: true,
      },
    ],
    hints: [
      "Sort a COPY of the edges by weight ascending: `[...edges].sort((a, b) => a[2] - b[2])`.",
      "Maintain a union-find parent array. For each edge, find both roots; if they differ, union them, add the weight, and count the edge.",
      "A spanning tree over n nodes has exactly n−1 edges. If you finish with fewer, the graph was disconnected — return −1. Note that n = 0 and n = 1 both need 0 edges and should return 0.",
    ],
    solution: `function mstWeight(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];   // path halving keeps it flat
      x = parent[x];
    }
    return x;
  }

  // Copy before sorting — mutating the caller's array is a rude surprise.
  const sorted = [...edges].sort((a, b) => a[2] - b[2]);

  let total = 0;
  let used = 0;

  for (const [u, v, w] of sorted) {
    const ru = find(u);
    const rv = find(v);
    if (ru === rv) continue;      // already connected: this closes a cycle
    parent[ru] = rv;
    total += w;
    used++;
    if (used === n - 1) break;    // a spanning tree is complete
  }

  // n nodes need exactly n-1 edges. Fewer means the graph is disconnected.
  return used === Math.max(0, n - 1) ? total : -1;
}`,
    complexityGate: {
      target: "O(n log n)",
      // A connected chain plus shuffled extra edges, so the sort does its
      // full work and many edges are rejected by the cycle test.
      gen: "(n) => { const e = []; for (let i = 1; i < n; i++) e.push([i - 1, i, (i * 7919) % n]); for (let i = 0; i < n; i++) e.push([i % n, (i * 31 + 7) % n, ((i * 104729) % n) + n]); return [n, e]; }",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Kruskal sorts edges; Prim grows a frontier",
      d: "Kruskal is edge-centric and leans on union-find for the cycle test. Prim is node-centric and uses a priority queue — essentially Dijkstra with a different relaxation rule.",
    },
    {
      t: "Kruskal for sparse, Prim for dense",
      d: "Kruskal is O(E log E), which is excellent when E ≈ V. Prim with an array scan is O(V^2), which wins when E approaches V^2 because it never sorts.",
    },
    {
      t: "Cutting the largest MST edges gives you clustering",
      d: "Removing the k−1 heaviest edges yields k clusters — single-linkage clustering, for free, with no need to pick a cluster count in advance.",
    },
    {
      t: "The cut property is why greedy is safe here",
      d: "The cheapest edge crossing any split of the nodes belongs to some MST. Most greedy algorithms are wrong; this one has a theorem, and being able to state it is the difference between knowing and remembering.",
    },
    {
      t: "An MST is not a shortest-path tree",
      d: "One minimises total build cost, the other minimises distance from a source. They are usually different trees, and substituting one for the other is a common and quiet error.",
    },
  ],
  pitfalls: [
    "Confusing an MST with a shortest-path tree. The cheapest network to build is generally not the fastest to travel across.",
    "Forgetting the disconnection check. Without counting the edges used, a disconnected graph silently returns the weight of a spanning forest.",
    "Sorting the caller's edge array in place. `sort` mutates, and the caller rarely expects it.",
    "Using union-find without path compression or union by size on a large input. The cycle test then becomes the bottleneck instead of the sort.",
  ],
  quiz: [
    {
      q: "Kruskal uses Union-Find to:",
      options: [
        "Sort the edges",
        "Test in near-constant time whether adding an edge would create a cycle",
        "Find the minimum edge",
        "Track distances",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Both endpoints already sharing a root means the edge closes a cycle and must be skipped. That test is the whole reason union-find appears here.",
      distractors: [
        "Sorting is a separate step done first, with an ordinary comparison sort.",
        "",
        "The sorted order supplies the minimum; union-find has no notion of weight at all.",
        "It stores no distances — only which items are grouped together.",
      ],
    },
    {
      q: "For a dense graph where E ≈ V^2, the better MST algorithm is:",
      options: [
        "Kruskal — O(E log E)",
        "Prim with an array scan — O(V^2), avoiding the sort of V^2 edges",
        "Either performs identically",
        "Neither works on dense graphs",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Sorting V^2 edges costs V^2 log V. Prim's array form avoids the sort entirely and lands at V^2 — a case where deliberately using the simpler data structure gives the faster algorithm.",
      distractors: [
        "Correct and it pays a log factor to sort edges most of which it will reject.",
        "",
        "They differ by a log factor precisely when the graph is dense.",
        "Both work correctly. The question is which is faster.",
      ],
    },
    {
      q: "Why is the greedy choice in Kruskal provably safe, when greedy is usually wrong?",
      options: [
        "Because the edges are sorted",
        "The cut property: the cheapest edge crossing any split of the nodes belongs to some minimum spanning tree",
        "Because it uses union-find",
        "It is not provable — it is a heuristic",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Every step adds the cheapest edge crossing the split between one endpoint's component and everything else, so the cut property applies to each one. That is why no step ever needs undoing, which is exactly what most greedy algorithms cannot claim.",
      distractors: [
        "Sorting supplies the order; it does not explain why taking the cheapest is safe.",
        "",
        "Union-find makes the cycle test fast and says nothing about optimality.",
        "It is a theorem with a short proof, and it is the reason this problem is a standard example.",
      ],
    },
    {
      q: "Your `mstWeight` returns a positive number for a disconnected graph. What is missing?",
      options: [
        "The sort",
        "The count check — a spanning tree needs exactly n−1 edges, and fewer means the graph was disconnected",
        "Path compression",
        "The cycle test",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Without counting, Kruskal happily builds a spanning FOREST — one tree per component — and returns its total weight. That is a perfectly sensible answer to a different question, which is what makes the omission easy to miss.",
      distractors: [
        "Missing the sort would give a non-minimal weight, not a wrong connectivity verdict.",
        "",
        "Compression affects speed only.",
        "Without the cycle test you would use too many edges, not too few.",
      ],
    },
    {
      q: "You need the cheapest network connecting all offices, and separately the fastest route from head office to each branch. Same tree?",
      options: [
        "Yes",
        "No — an MST minimises total edge weight; a shortest-path tree minimises distance from one source. They are usually different",
        "Only if the graph is a tree",
        "Only for non-negative weights",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Two different objectives. An MST may route head office to a distant branch the long way round because that path uses cheaper links overall. Building one and using it for the other is a quiet and common mistake.",
      distractors: [
        "This is the confusion the question exists to expose.",
        "",
        "True in a trivial sense — a tree is its own unique spanning tree — but it does not hold generally, which is the point.",
        "Both algorithms assume non-negative weights, and that does not make the trees coincide.",
      ],
    },
    {
      q: "How do you get k clusters from an MST?",
      options: [
        "Run k-means on the tree",
        "Remove the k−1 heaviest edges — the remaining components are the clusters",
        "Take the k cheapest edges",
        "Run the MST k times",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The tree connects everything by the cheapest available links, so its most expensive links are the weakest attachments. Cutting them splits the data where it was most loosely joined — this is single-linkage clustering, and the cut order gives the hierarchy for free.",
      distractors: [
        "k-means works on coordinates and assumes roughly spherical clusters, which is the assumption MST clustering avoids.",
        "",
        "The cheapest edges are the strongest connections — removing them would split tightly bound groups.",
        "The MST is unique in weight; repeating it changes nothing.",
      ],
    },
    {
      q: "Kruskal on a disconnected graph produces:",
      options: [
        "An error",
        "A spanning forest — a minimum spanning tree per component, which is often the answer you actually wanted",
        "An incorrect result",
        "An infinite loop",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It handles disconnection with no special cases: each component gets its own minimum tree. Whether that is a feature or a bug depends on the requirement, which is exactly why the edge count check should be a deliberate decision rather than an oversight.",
      distractors: [
        "Nothing errors — every step is valid.",
        "",
        "The result is correct for the forest question. It only becomes wrong if you claimed it was a spanning tree.",
        "The loop is bounded by the edge list.",
      ],
    },
    {
      q: "Borůvka's algorithm adds the cheapest outgoing edge of EVERY component simultaneously. Why does that matter today?",
      options: [
        "It is faster on one core",
        "The rounds are independent, so it parallelises — each component picks its own edge with no coordination",
        "It uses less memory",
        "It handles negative weights",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Kruskal is inherently sequential — it processes edges in a global order. Borůvka's rounds have no such dependency, and the component count at least halves each round, so it finishes in O(log V) rounds. That is why a 1926 algorithm is the one used in distributed settings.",
      distractors: [
        "On a single core it is generally comparable or slightly slower than Kruskal.",
        "",
        "Memory use is comparable.",
        "All MST algorithms handle negative weights fine — there is no shortest-path style problem here.",
      ],
    },
  ],
};

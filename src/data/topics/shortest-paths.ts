import type { Topic } from "../types.ts";

export const shortestPaths: Topic = {
  id: "shortest-paths",
  title: "Dijkstra, Bellman-Ford, Floyd-Warshall",
  tier: 2,
  week: 12,
  depth: "core",
  summary: "Three algorithms, three different sets of assumptions.",
  why: "Picking the right one is a judgment question about the weights and the query pattern, not a memorisation question. Interviewers ask 'which would you use and why', and the answer is entirely about what the edges can look like.",
  complexity: "O((V+E) log V) · O(V·E) · O(V^3)",
  viz: ["dijkstra"],
  learn: {
    intuition:
      "All three algorithms rest on the same single operation, called relaxation: if going to v via u is cheaper than the best route to v known so far, record the better one. Everything else is a strategy for deciding the ORDER in which to try those improvements, and each strategy buys a different guarantee. Dijkstra always expands the nearest node not yet finalised, and argues that because no edge can reduce a distance, that nearest node's distance can never improve — so it can be settled forever. Bellman-Ford gives up on being clever and simply relaxes every edge, repeatedly; after V−1 rounds every shortest path is found, because no shortest path has more than V−1 edges. Floyd-Warshall asks a different question entirely — for every pair, is going through some intermediate node k better? — and loops over all k, i and j. Three orders, three sets of assumptions, three costs.",
    mechanics: [
      {
        heading: "Relaxation is the shared primitive",
        body: "`if (dist[u] + weight(u,v) < dist[v]) dist[v] = dist[u] + weight(u,v)`. Every one of these algorithms is just a schedule for applying this rule until nothing improves.",
      },
      {
        heading: "Dijkstra: always expand the nearest unfinished node",
        body: "Keep a priority queue keyed by current best distance. Pop the smallest, mark it settled, relax its outgoing edges. Settling is permanent, and that permanence is the entire source of the speed — and of the requirement that no edge be negative.",
      },
      {
        heading: "Bellman-Ford: relax every edge, V−1 times",
        body: "No ordering cleverness at all. Since a shortest path visits at most V nodes, it has at most V−1 edges, and each full round guarantees at least one more edge of every shortest path is correct. Slower, and it tolerates negative weights.",
      },
      {
        heading: "A Vth round that still improves means a negative cycle",
        body: "After V−1 rounds everything should be final. If another round still finds an improvement, some cycle has negative total weight, so you can go round it forever getting cheaper. That check is often the real reason to choose Bellman-Ford.",
      },
      {
        heading: "Floyd-Warshall: for every intermediate k, for every pair",
        body: "`dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`, with k as the OUTERMOST loop. The order matters — k outermost is what makes the intermediate set grow correctly. Five lines, O(V^3), and it answers every pair at once.",
      },
    ],
    complexityDerivation:
      "Dijkstra pops each node once, and each pop costs O(log V) from the heap. Each edge can trigger one push, so there are at most E pushes at O(log V) each. Total O((V + E) log V). Why does it need non-negative weights? Its correctness rests on a claim: when a node is popped, its recorded distance is final. That holds because every other unfinished node is at least as far away, and travelling further can only ADD cost — which is exactly what a negative edge violates. With a negative edge, a node settled early can later be reached more cheaply, and Dijkstra never revisits it. Bellman-Ford does V−1 rounds of E relaxations, so O(V·E), and needs no such assumption because it never treats anything as final. Floyd-Warshall is three nested loops over V, so O(V^3) with O(V^2) memory. That is worse than running Dijkstra from every node — O(V·(V+E) log V) — on a sparse graph, and BETTER on a dense one, since with E ≈ V^2 Dijkstra-from-every-node becomes O(V^3 log V). Density decides it, and so does code length: for a few hundred nodes, five lines that run once beats a heap implementation you have to get right.",
    variants: [
      {
        name: "BFS",
        when: "Every edge has the same weight.",
        delta:
          "O(V + E) with no heap at all. Using Dijkstra here is correct and pays a log factor for nothing.",
      },
      {
        name: "Dijkstra",
        when: "Non-negative weights, single source. The default.",
        delta:
          "O((V + E) log V). Stop early once the target is popped — often a large saving in practice, since you rarely need all the distances.",
      },
      {
        name: "Bellman-Ford",
        when: "Negative weights are possible, or you must detect negative cycles.",
        delta:
          "O(V·E). Slower, and it is the only one of the three that can tell you a negative cycle exists — which for currency arbitrage is the answer being sought.",
      },
      {
        name: "Floyd-Warshall",
        when: "All pairs, small dense graph, many repeated queries.",
        delta:
          "O(V^3) once, then O(1) per query. Five lines, handles negative edges, and detects negative cycles as a negative value on the diagonal.",
      },
    ],
    tradeoffs: [
      {
        vs: "A* search",
        pick: "A* when you have one target and a good distance estimate",
        because:
          "Dijkstra expands in every direction equally. A* adds an estimate of the remaining distance and steers towards the target, which on a road network cuts the explored area dramatically. The estimate must never overestimate, or the answer stops being optimal — with a bad heuristic it degrades to Dijkstra, which is the safe failure.",
      },
      {
        vs: "Running Dijkstra from every node",
        pick: "Floyd-Warshall for dense graphs and small V",
        because:
          "V runs of Dijkstra is O(V·(V+E) log V), which beats V^3 on sparse graphs and loses on dense ones. Below a few hundred nodes, the deciding factor is often that Floyd-Warshall is five lines and impossible to get subtly wrong.",
      },
      {
        vs: "Precomputing all distances",
        pick: "Precompute only when the graph is static and queries are frequent",
        because:
          "An O(V^2) table answers instantly and must be rebuilt whenever any edge changes. For a road network with live traffic that is the wrong shape entirely — which is why routing engines use contraction hierarchies rather than a distance table.",
      },
    ],
  },
  realWorld: [
    {
      system: "Internet routing (OSPF and RIP)",
      kind: "industry",
      problem:
        "Routers must agree on the best path to every destination, and update as links fail, without any single router knowing the whole network.",
      applied:
        "OSPF runs Dijkstra over a link-state map each router builds for itself. RIP is a distributed Bellman-Ford, where each router relaxes using its neighbours' estimates — and its notorious 'count to infinity' problem is exactly what happens when Bellman-Ford's relaxation runs without global knowledge.",
      evidence: "RFC 2328 (OSPF), RFC 2453 (RIP)",
    },
    {
      system: "Currency arbitrage detection",
      kind: "industry",
      problem:
        "Find a sequence of currency conversions that returns more than you started with — a cycle whose exchange rates multiply to more than 1.",
      applied:
        "Take the negative logarithm of each rate, which turns multiplication into addition and a profitable cycle into a NEGATIVE cycle. Bellman-Ford's negative-cycle detection then finds arbitrage directly. This is the standard textbook use, and it is used in practice.",
      impact: "A multiplicative cycle search becomes a standard graph algorithm",
    },
    {
      system: "Map routing at continental scale",
      kind: "industry",
      problem:
        "Plain Dijkstra across Europe would explore millions of nodes per query, which is far too slow for interactive routing.",
      applied:
        "A* with a geographic distance heuristic, plus heavy preprocessing — contraction hierarchies that add shortcut edges so queries skip whole regions. The underlying algorithm is still Dijkstra; the preprocessing changes what it has to explore.",
      impact: "Millions of nodes explored per query → thousands",
    },
    {
      system: "traed — multi-leg execution and cost paths",
      kind: "yours",
      problem:
        "Choosing between routes to a position — direct, or through an intermediate instrument — where each leg carries a cost in spread, fees and slippage.",
      applied:
        "Legs are weighted edges and the cheapest route is a shortest path. Because costs are non-negative, Dijkstra applies; the moment a rebate could make a leg negative, the correctness argument fails and Bellman-Ford is the honest choice.",
    },
  ],
  lab: {
    prompt:
      "Return the shortest distance from node `src` to every node, given a weighted directed graph where `adj[u]` is a list of `[v, weight]` pairs with all weights ≥ 0. Unreachable nodes get −1. Implement Dijkstra. The naive 'scan all nodes for the nearest unsettled one' version is correct and O(V^2); the gate builds a sparse graph where that is clearly worse than the heap version.",
    fnName: "dijkstra",
    signature: "dijkstra(n: number, adj: number[][][], src: number): number[]",
    starter: `function dijkstra(n, adj, src) {
  // dist starts at Infinity everywhere except src.
  // Repeatedly take the nearest UNSETTLED node, settle it, and relax
  // its outgoing edges. A settled node is final — that is the whole
  // reason this works, and the reason it needs non-negative weights.
  // Return -1 for anything still unreachable.

  return [];
}`,
    tests: [
      {
        name: "simple chain",
        input: [3, [[[1, 4]], [[2, 3]], []], 0],
        expected: [0, 4, 7],
      },
      {
        // Direct 0->2 costs 10, but 0->1->2 costs 4+3=7. The shorter
        // multi-hop route must win.
        name: "two hops beat one expensive hop",
        input: [
          3,
          [
            [
              [1, 4],
              [2, 10],
            ],
            [[2, 3]],
            [],
          ],
          0,
        ],
        expected: [0, 4, 7],
      },
      {
        name: "unreachable node is -1",
        input: [3, [[[1, 2]], [], []], 0],
        expected: [0, 2, -1],
      },
      {
        name: "source only",
        input: [1, [[]], 0],
        expected: [0],
      },
      {
        // Zero-weight edges are legal and must not be mistaken for
        // "no edge" or skipped.
        name: "zero-weight edge",
        input: [2, [[[1, 0]], []], 0],
        expected: [0, 0],
      },
      {
        name: "starting somewhere other than 0",
        input: [3, [[], [[2, 5]], []], 1],
        expected: [-1, 0, 5],
        hidden: true,
      },
      {
        name: "parallel edges — cheapest wins",
        input: [
          2,
          [
            [
              [1, 9],
              [1, 2],
            ],
            [],
          ],
          0,
        ],
        expected: [0, 2],
        hidden: true,
      },
      {
        name: "empty graph",
        input: [0, [], 0],
        expected: [],
        hidden: true,
      },
    ],
    hints: [
      "Fill `dist` with `Infinity`, set `dist[src] = 0`, and keep a `settled` boolean array. Return `-1` in place of any remaining `Infinity` at the end.",
      "Each round: find the unsettled node with the smallest distance, mark it settled, then for each `[v, w]` in its adjacency check whether `dist[u] + w` beats `dist[v]`.",
      "Stop if the nearest unsettled distance is still `Infinity` — everything left is unreachable, and continuing would relax from an infinite distance.",
    ],
    solution: `function dijkstra(n, adj, src) {
  const dist = new Array(n).fill(Infinity);
  const settled = new Array(n).fill(false);
  if (n > 0) dist[src] = 0;

  for (let iter = 0; iter < n; iter++) {
    // Nearest unsettled node. A real implementation uses a heap; the
    // scan is clearer and is what the gate is comparing against.
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!settled[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    // Everything left is unreachable — relaxing from Infinity is
    // meaningless, so stop.
    if (u === -1 || dist[u] === Infinity) break;

    settled[u] = true;   // permanent: no later path can be cheaper
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }

  return dist.map((d) => (d === Infinity ? -1 : d));
}`,
  },
  insights: [
    {
      t: "Dijkstra requires non-negative weights",
      d: 'Its correctness rests on "the closest unsettled node is final". A negative edge can retroactively improve a settled node, and the argument collapses.',
    },
    {
      t: "Bellman-Ford handles negatives and detects negative cycles",
      d: "V−1 relaxation rounds suffice; if a Vth round still improves something, a negative cycle exists. That detection is often the real reason to reach for it.",
    },
    {
      t: "Floyd-Warshall is all-pairs and remarkably simple",
      d: "Three nested loops, O(V^3), with k outermost. For V under a few hundred and many all-pairs queries it beats running Dijkstra V times — and it is five lines.",
    },
    {
      t: "On unweighted graphs, use BFS",
      d: "Dijkstra with uniform weights is BFS carrying an unnecessary heap. Recognising that is worth a factor of log V, and noticing it is what the interviewer is watching for.",
    },
    {
      t: "You can stop Dijkstra early",
      d: "Once the target is popped, its distance is final and the rest of the graph does not matter. For a single-destination query that is frequently most of the work saved.",
    },
  ],
  pitfalls: [
    "Using Dijkstra with negative weights. It returns confident wrong answers rather than failing.",
    "Writing Floyd-Warshall with k as an inner loop. The intermediate set must grow outermost, or the results are wrong.",
    "Forgetting that a settled node must never be updated again. Relaxing into a settled node hides a bug in the ordering.",
    "Treating weight 0 as 'no edge'. A zero-cost edge is legitimate — use Infinity or a separate structure for absence.",
  ],
  quiz: [
    {
      q: "A graph has some negative edge weights but no negative cycles. Which algorithm?",
      options: ["Dijkstra's", "Bellman-Ford", "BFS", "Floyd-Warshall only"],
      answer: 1,
      difficulty: "apply",
      why: "Dijkstra is incorrect with negative edges. Bellman-Ford handles them in O(V·E) and also reports negative cycles if any exist.",
      distractors: [
        "Its settling argument fails the moment an edge can reduce a distance.",
        "",
        "BFS ignores weights entirely, so it answers a different question.",
        "Floyd-Warshall does handle negative edges correctly — but it computes all pairs at O(V^3), which is more than a single-source question needs.",
      ],
    },
    {
      q: "Why does Dijkstra break on negative weights?",
      options: [
        "The priority queue cannot hold negatives",
        'A settled node could later be improved via a negative edge, violating the "closest is final" invariant',
        "Distances become negative",
        "It does not break — it is just slower",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Dijkstra never revisits a settled node. That is safe only if no path can subsequently get cheaper — which negative edges allow.",
      distractors: [
        "A heap orders any comparable values, negative ones included.",
        "",
        "Negative distances are a symptom rather than the cause, and they can be perfectly correct answers.",
        "It returns wrong answers, which is much worse than being slow.",
      ],
    },
    {
      q: "V = 200 nodes, and you need shortest paths between all pairs, queried constantly. Choose:",
      options: [
        "Dijkstra's from each node",
        "Floyd-Warshall — O(V^3) = 8M operations, done once, five lines of code",
        "Bellman-Ford from each node",
        "BFS from each node",
      ],
      answer: 1,
      difficulty: "judge",
      why: "At this size 8 million operations is trivial, and the resulting table answers every query in O(1). Simplicity is a genuine advantage here — five lines that cannot go subtly wrong beats a heap implementation you must debug.",
      distractors: [
        "Perfectly reasonable, and it is more code and more room for error at a size where the cubic algorithm finishes instantly.",
        "",
        "O(V^2·E), needlessly slower, and only worth it if there are negative weights.",
        "BFS ignores the weights, so it would answer the wrong question unless every edge cost the same.",
      ],
    },
    {
      q: "Currency arbitrage: find a cycle of conversions that multiplies to more than 1. How do you turn this into a graph problem?",
      options: [
        "Use the rates as weights and find the longest cycle",
        "Use −log(rate) as the weight; a profitable cycle becomes a NEGATIVE cycle, which Bellman-Ford detects",
        "Use 1/rate and run Dijkstra",
        "It is not a graph problem",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Logarithms turn multiplication into addition, so a product greater than 1 becomes a sum of negative logs — a negative cycle. This is the standard reduction, and it is the reason Bellman-Ford's cycle detection has a real use beyond textbooks.",
      distractors: [
        "Longest-cycle problems are NP-hard, and multiplying weights is not what shortest-path relaxation does.",
        "",
        "Dijkstra cannot detect cycles at all, and reciprocals do not make the products additive.",
        "It maps onto one very cleanly, which is what makes it a classic example.",
      ],
    },
    {
      q: "You only need the distance from A to B, not to everything. What can you do?",
      options: [
        "Nothing — Dijkstra computes all distances",
        "Stop as soon as B is popped from the queue; its distance is already final at that moment",
        "Run it backwards from B",
        "Use Bellman-Ford",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Popping means settling, and settled means final. Everything further from A than B is irrelevant to the query, and on a large graph that is usually most of it.",
      distractors: [
        "It computes them in increasing order of distance, which is exactly what lets you stop.",
        "",
        "Valid on an undirected graph and it saves nothing on its own — you would explore the same amount from the other end.",
        "Slower, and it offers nothing here since there are no negative weights in the question.",
      ],
    },
    {
      q: "A* uses a heuristic estimate of the remaining distance. What must be true of that estimate?",
      options: [
        "It must be exact",
        "It must never OVERestimate the true remaining distance, or the result stops being optimal",
        "It must be fast to compute",
        "It must be a straight-line distance",
      ],
      answer: 1,
      difficulty: "judge",
      why: "An admissible heuristic never overestimates. Overestimating can make A* settle a node too early on a route that is not actually best. Underestimating is always safe — a heuristic of zero makes A* exactly Dijkstra, which is the useful safe failure mode.",
      distractors: [
        "An exact estimate would mean you already knew the answer. The point is that a rough lower bound suffices.",
        "",
        "Practically important and not a correctness requirement.",
        "Straight-line distance is the usual choice on a map because it is admissible — but the requirement is admissibility, not that particular formula.",
      ],
    },
    {
      q: "In Floyd-Warshall, why must k be the OUTERMOST loop?",
      options: [
        "For cache efficiency",
        "Because after the k-th round `dist[i][j]` must be the best path using only nodes 0..k as intermediates — the wrong nesting breaks that meaning",
        "It does not matter",
        "To avoid overflow",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The algorithm builds up the allowed set of intermediate nodes one at a time, and the loop order is what encodes that. Moving k inside means you consult entries that have not yet accounted for the earlier intermediates, and the results are wrong.",
      distractors: [
        "Cache behaviour does differ and is not why the order is mandatory.",
        "",
        "It changes the answer. This is one of the few places where reordering nested loops is a correctness bug rather than a performance one.",
        "Overflow is a separate concern, usually handled by capping infinity.",
      ],
    },
    {
      q: "Sparse graph, 100,000 nodes, all-pairs shortest paths needed. Floyd-Warshall?",
      options: [
        "Yes — it is the all-pairs algorithm",
        "No — O(V^3) is 10^15 operations and O(V^2) memory is 10^10 entries; run Dijkstra from each source instead, or reconsider whether you truly need all pairs",
        "Yes, with optimisation",
        "Use BFS",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Floyd-Warshall's simplicity only pays at small V. At 100,000 nodes both the time and the memory are impossible. The stronger move is usually to question the requirement — genuine all-pairs demand at this scale is rare, and answering the queries you actually get is far cheaper.",
      distractors: [
        "Being the right shape of algorithm does not make it feasible at this size.",
        "",
        "No constant-factor work rescues 10^15 operations.",
        "BFS ignores weights, and running it from every node is still V traversals.",
      ],
    },
  ],
};

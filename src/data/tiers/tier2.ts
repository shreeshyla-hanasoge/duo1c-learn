import type { Tier } from "../types.ts";
import { graphRepresentations } from "../topics/graph-representations.ts";
import { bfs } from "../topics/bfs.ts";
import { dfs } from "../topics/dfs.ts";
import { toposort } from "../topics/toposort.ts";
import { dsu } from "../topics/dsu.ts";
import { shortestPaths } from "../topics/shortest-paths.ts";
import { mst } from "../topics/mst.ts";
import { bipartite } from "../topics/bipartite.ts";
import { gridGraphs } from "../topics/grid-graphs.ts";

export const tier2: Tier = {
  id: 2,
  name: "Graphs",
  tagline: "Once you see the graph, the algorithm is usually already known.",
  topics: [
    graphRepresentations,
    bfs,
    dfs,
    toposort,
    dsu,
    shortestPaths,
    mst,
    bipartite,
    gridGraphs,
  ],
  orientation: {
    overview:
      "A graph is less a data structure you build than a lens you learn to put on. The moment you notice your problem is really “things, and connections between them”, the algorithm you need is usually already known, already named and already written down. That is what this tier is: almost all of the difficulty is in seeing the graph, and once you have seen it you are choosing from a short list of well-understood options rather than inventing anything.",
    stakes:
      "An engineer who cannot see the graph will rewrite a slightly broken BFS inside a for-loop, once a year, for their whole career.",
    recognise: [
      {
        signal: "“Fewest steps”, “shortest number of hops”, and every move costs the same.",
        reach:
          "BFS. Not Dijkstra — on equal weights Dijkstra is BFS carrying a priority queue it does not need.",
      },
      {
        signal:
          "“Is there a path”, “find all the separate pieces”, “is there a cycle”.",
        reach:
          "DFS. Cheaper to write than BFS and it answers all three, because it does not care about distance.",
      },
      {
        signal: "“A has to finish before B.”",
        reach:
          "Topological sort. If it fails, your dependencies contain a cycle — and that failure is itself the answer you needed.",
      },
      {
        signal:
          "“Are these two in the same group”, asked over and over, where groups only ever merge and never split.",
        reach:
          "Union-Find. The “never split” part is what makes it almost free.",
      },
      {
        signal: "“Cheapest way to connect everything”.",
        reach:
          "Minimum spanning tree — not shortest path. “Connect all of them cheaply” and “get from here to there cheaply” sound alike and are different problems with different answers.",
      },
      {
        signal: "A maze, an image, a board, a grid of cells.",
        reach:
          "Grid-as-graph. Each cell is a node and its neighbours are the edges — there is no separate family of grid algorithms to learn.",
      },
    ],
    arc: [
      {
        stage: "How you store it decides what is cheap",
        topics: ["graph-representations"],
        point:
          "Adjacency list or adjacency matrix is the first decision and it silently sets the cost of everything after it. Worth ten minutes now to save a rewrite later.",
      },
      {
        stage: "The two walks",
        topics: ["bfs", "dfs"],
        point:
          "Every remaining algorithm in this tier is one of these two with extra bookkeeping. Learn precisely what each one visits and in what order, and most of the tier is already yours.",
      },
      {
        stage: "Ordering and grouping",
        topics: ["toposort", "dsu"],
        point:
          "DFS with a finish-order gives you dependency order. Union-Find answers connectivity without walking anything at all — the tier's one algorithm that is not a traversal.",
      },
      {
        stage: "Weights change the question",
        topics: ["shortest-paths", "mst"],
        point:
          "Once edges cost different amounts, “fewest hops” and “cheapest route” stop being the same question. This stage is where most confusion in graphs actually lives.",
      },
      {
        stage: "Properties you can test for",
        topics: ["bipartite", "grid-graphs"],
        point:
          "Some questions about a graph are answered by a single traversal that colours as it goes. And the most common graph in production has no edge list at all — it is a grid.",
      },
    ],
    outcomes: [
      "Spot the graph in a problem that never uses the word “graph”.",
      "Choose between BFS, DFS, Dijkstra and Union-Find from the problem statement alone.",
      "Say why Dijkstra is the wrong tool on an unweighted graph.",
      "Model a grid as a graph without writing any grid-specific algorithm.",
    ],
    inTheWild: [
      {
        system: "Maps and navigation",
        use: "Roads with travel times are a weighted graph; the route you get is a shortest-path query answered under a hard latency budget.",
      },
      {
        system: "Build systems and CI pipelines",
        use: "“Build A before B” is a topological sort. The error you get for a circular dependency is that sort reporting a cycle.",
      },
      {
        system: "Social and payment-fraud graphs",
        use: "“Are these two accounts connected through anyone” is connectivity — the question Union-Find answers in near-constant time as new links keep arriving.",
      },
    ],
  },
};

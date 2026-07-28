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
};

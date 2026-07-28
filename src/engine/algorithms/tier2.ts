import {
  Recorder,
  type CellState,
  type GraphEdge,
  type GraphNode,
  type Trace,
} from "../trace";

/* ========================================================================
 * Tier 2 — graphs
 * ===================================================================== */

export function bfsGrid(): Trace {
  //  . = open, # = wall, S = start, E = end
  const raw = [
    "S..#......",
    ".#.#.####.",
    ".#........",
    ".####.###.",
    "......#..E",
  ];
  const H = raw.length;
  const W = raw[0].length;
  const grid = raw.map((row) => row.split(""));
  const r = new Recorder();
  const code = [
    "q = deque([start]); dist[start] = 0",
    "while q:",
    "  cell = q.popleft()             # FIFO — this is what makes it shortest",
    "  for nb in neighbours(cell):",
    "    if open(nb) and nb not in dist:",
    "      dist[nb] = dist[cell] + 1",
    "      q.append(nb)",
  ];

  let start: [number, number] = [0, 0];
  let end: [number, number] = [0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x] === "S") start = [y, x];
      if (grid[y][x] === "E") end = [y, x];
    }
  }

  const dist = new Map<string, number>();
  const parent = new Map<string, string>();
  const key = (y: number, x: number) => `${y},${x}`;
  const queue: [number, number][] = [start];
  dist.set(key(...start), 0);

  const render = (
    note: string,
    line: number,
    cur?: [number, number],
    path?: [number, number][],
  ) => {
    const statesGrid: CellState[][] = [];
    const labels: (string | null)[][] = [];
    const pathSet = new Set((path ?? []).map(([y, x]) => key(y, x)));
    const inQueue = new Set(queue.map(([y, x]) => key(y, x)));

    for (let y = 0; y < H; y++) {
      const rowS: CellState[] = [];
      const rowL: (string | null)[] = [];
      for (let x = 0; x < W; x++) {
        const k = key(y, x);
        const ch = grid[y][x];
        if (ch === "#") {
          rowS.push("muted");
          rowL.push(null);
        } else if (pathSet.has(k)) {
          rowS.push("match");
          rowL.push(String(dist.get(k) ?? ""));
        } else if (cur && cur[0] === y && cur[1] === x) {
          rowS.push("cursor");
          rowL.push(String(dist.get(k) ?? ""));
        } else if (inQueue.has(k)) {
          rowS.push("scan");
          rowL.push(String(dist.get(k) ?? ""));
        } else if (dist.has(k)) {
          rowS.push("idle");
          rowL.push(String(dist.get(k)));
        } else {
          rowS.push("ghost");
          rowL.push(ch === "E" ? "E" : ch === "S" ? "S" : null);
        }
      }
      statesGrid.push(rowS);
      labels.push(rowL);
    }

    r.emit({
      note,
      line,
      grid: {
        cells: statesGrid,
        labels,
        caption: "numbers are distance from S",
      },
      stats: [
        { label: "frontier", value: queue.length },
        { label: "visited", value: dist.size },
      ],
    });
  };

  render(
    "BFS explores in rings of equal distance. Because the queue is FIFO, the first time we touch a cell is necessarily via a shortest path.",
    0,
    start,
  );

  const dirs: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let found = false;
  let guard = 0;

  while (queue.length && !found && guard++ < 500) {
    const cur = queue.shift() as [number, number];
    const d = dist.get(key(...cur)) as number;
    render(
      `Pop the oldest frontier cell (${cur[0]}, ${cur[1]}) at distance ${d}.`,
      2,
      cur,
    );

    for (const [dy, dx] of dirs) {
      const ny = cur[0] + dy;
      const nx = cur[1] + dx;
      if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;
      if (grid[ny][nx] === "#") continue;
      const nk = key(ny, nx);
      if (dist.has(nk)) continue;
      dist.set(nk, d + 1);
      parent.set(nk, key(...cur));
      queue.push([ny, nx]);
      if (ny === end[0] && nx === end[1]) {
        found = true;
        break;
      }
    }
    if (!found)
      render(
        `Its unvisited neighbours join the frontier at distance ${d + 1}.`,
        6,
        cur,
      );
  }

  // Reconstruct
  const path: [number, number][] = [];
  let node: string | undefined = key(...end);
  while (node) {
    const [y, x] = node.split(",").map(Number);
    path.push([y, x]);
    node = parent.get(node);
  }
  path.reverse();

  render(
    `Reached E at distance ${dist.get(key(...end))}. Walk the parent links back to recover the actual route.`,
    6,
    end,
    path,
  );
  render(
    `Shortest path is ${dist.get(key(...end))} steps. BFS gives this for free on an unweighted graph — Dijkstra would be overkill here.`,
    6,
    undefined,
    path,
  );

  return {
    title: "BFS on a grid — shortest path, unweighted",
    code,
    frames: r.done(),
    complexity: { time: "O(V + E)", space: "O(V)" },
  };
}

export function unionFind(): Trace {
  const n = 8;
  const unions: [number, number][] = [
    [0, 1],
    [2, 3],
    [1, 3],
    [4, 5],
    [6, 7],
    [5, 7],
  ];
  const r = new Recorder();
  const code = [
    "def find(x):",
    "  while parent[x] != x:",
    "    parent[x] = parent[parent[x]]   # path compression",
    "    x = parent[x]",
    "  return x",
    "",
    "def union(a, b):",
    "  ra, rb = find(a), find(b)",
    "  if rank[ra] < rank[rb]: ra, rb = rb, ra   # union by rank",
    "  parent[rb] = ra",
  ];

  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);

  const positions = Array.from({ length: n }, (_, i) => ({
    x: 0.08 + (i % 4) * 0.28,
    y: i < 4 ? 0.2 : 0.72,
  }));

  const snap = (
    note: string,
    line: number,
    active: number[] = [],
    merged: number[] = [],
  ) => {
    const nodes: GraphNode[] = Array.from({ length: n }, (_, i) => ({
      id: `u${i}`,
      label: String(i),
      x: positions[i].x,
      y: positions[i].y,
      s: (merged.includes(i)
        ? "match"
        : active.includes(i)
          ? "cursor"
          : "idle") as CellState,
      badge: parent[i] === i ? "root" : undefined,
    }));
    const edges: GraphEdge[] = [];
    for (let i = 0; i < n; i++) {
      if (parent[i] !== i)
        edges.push({ from: `u${i}`, to: `u${parent[i]}`, directed: true });
    }
    const roots = new Set(Array.from({ length: n }, (_, i) => findPure(i)));
    r.emit({
      note,
      line,
      nodes,
      edges,
      cells: parent.map((p, i) => ({
        id: `p${i}`,
        v: p,
        tag: `${i}`,
        s: (active.includes(i) ? "cursor" : "idle") as CellState,
      })),
      stats: [
        { label: "components", value: roots.size },
        { label: "amortised cost", value: "α(n) — effectively constant" },
      ],
    });
  };

  function findPure(x: number): number {
    while (parent[x] !== x) x = parent[x];
    return x;
  }

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]; // halving
      x = parent[x];
    }
    return x;
  };

  snap('Eight singleton sets. `parent[i] = i` means "i is its own root".', 0);

  for (const [a, b] of unions) {
    snap(`union(${a}, ${b}) — first find both roots.`, 6, [a, b]);
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) {
      snap(
        `${a} and ${b} are already in the same set (root ${ra}). Nothing to do — and this is exactly the cycle test Kruskal's algorithm relies on.`,
        7,
        [a, b],
      );
      continue;
    }
    let big = ra;
    let small = rb;
    if (rank[ra] < rank[rb]) {
      big = rb;
      small = ra;
    }
    parent[small] = big;
    if (rank[big] === rank[small]) rank[big]++;
    snap(
      `Roots are ${ra} and ${rb}. Attach the shallower tree under the deeper one — union by rank keeps the tree from degenerating into a chain.`,
      9,
      [a, b],
      [big, small],
    );
  }

  // Show path compression on a deep find
  const deep = 3;
  snap(`Now call find(${deep}). Notice the chain it has to walk.`, 1, [deep]);
  find(deep);
  snap(
    `Path compression re-points every node on that path straight at the root. The next find on any of them is O(1). Combined with union by rank this gives inverse-Ackermann amortised cost — under 5 for any n you will ever see.`,
    2,
    [deep],
  );

  return {
    title: "Union-Find — path compression + union by rank",
    code,
    frames: r.done(),
    complexity: { time: "O(α(n)) amortised", space: "O(n)" },
  };
}

export function topoSort(): Trace {
  const nodes = ["data", "auth", "api", "web", "jobs", "cdn"];
  const deps: [string, string][] = [
    ["data", "auth"],
    ["data", "api"],
    ["auth", "api"],
    ["api", "web"],
    ["api", "jobs"],
    ["web", "cdn"],
  ];
  const r = new Recorder();
  const code = [
    "indeg = {v: 0 for v in V}",
    "for (u, v) in E: indeg[v] += 1",
    "q = [v for v in V if indeg[v] == 0]",
    "while q:",
    "  u = q.pop()",
    "  order.append(u)",
    "  for v in adj[u]:",
    "    indeg[v] -= 1",
    "    if indeg[v] == 0: q.append(v)",
    "",
    "# if len(order) < len(V): there is a cycle",
  ];

  const pos: Record<string, { x: number; y: number }> = {
    data: { x: 0.1, y: 0.5 },
    auth: { x: 0.32, y: 0.2 },
    api: { x: 0.53, y: 0.5 },
    web: { x: 0.75, y: 0.24 },
    jobs: { x: 0.75, y: 0.78 },
    cdn: { x: 0.94, y: 0.24 },
  };

  const indeg: Record<string, number> = Object.fromEntries(
    nodes.map((v) => [v, 0]),
  );
  const adj: Record<string, string[]> = Object.fromEntries(
    nodes.map((v) => [v, [] as string[]]),
  );
  for (const [u, v] of deps) {
    indeg[v]++;
    adj[u].push(v);
  }

  const order: string[] = [];

  const snap = (
    note: string,
    line: number,
    cur?: string,
    queue: string[] = [],
  ) => {
    const done = new Set(order);
    const gnodes: GraphNode[] = nodes.map((v) => ({
      id: v,
      label: v,
      x: pos[v].x,
      y: pos[v].y,
      s: (v === cur
        ? "cursor"
        : done.has(v)
          ? "match"
          : queue.includes(v)
            ? "scan"
            : "idle") as CellState,
      badge: done.has(v) ? undefined : `in ${indeg[v]}`,
    }));
    const gedges: GraphEdge[] = deps.map(([u, v]) => ({
      from: u,
      to: v,
      directed: true,
      s: done.has(u) ? "muted" : undefined,
    }));
    r.emit({
      note,
      line,
      nodes: gnodes,
      edges: gedges,
      aux: [
        {
          title: "ready queue (in-degree 0)",
          empty: "empty",
          cells: queue.map((v) => ({ id: `q${v}`, v, s: "scan" as CellState })),
        },
        {
          title: "deploy order",
          empty: "—",
          cells: order.map((v, i) => ({
            id: `o${v}`,
            v,
            tag: `${i + 1}`,
            s: "match" as CellState,
          })),
        },
      ],
      stats: [{ label: "placed", value: `${order.length} / ${nodes.length}` }],
    });
  };

  snap(
    'A deploy dependency graph. An edge u → v means "u must ship before v". Kahn\'s algorithm repeatedly takes whatever has nothing left blocking it.',
    1,
  );

  const queue = nodes.filter((v) => indeg[v] === 0);
  snap(
    `Anything with in-degree 0 has no unmet dependency: ${queue.join(", ")}.`,
    2,
    undefined,
    queue,
  );

  while (queue.length) {
    const u = queue.shift() as string;
    order.push(u);
    snap(`Ship "${u}" — nothing is blocking it.`, 5, u, queue);

    for (const v of adj[u]) {
      indeg[v]--;
      if (indeg[v] === 0) {
        queue.push(v);
        snap(
          `"${v}" just lost its last blocker — it is now ready.`,
          8,
          u,
          queue,
        );
      } else {
        snap(`"${v}" still waits on ${indeg[v]} more.`, 7, u, queue);
      }
    }
  }

  snap(
    order.length === nodes.length
      ? `All ${nodes.length} placed, so the graph is acyclic and this order is safe. If the loop had stalled with nodes remaining, that stall IS the cycle detection.`
      : "Stalled with nodes remaining — there is a cycle.",
    10,
  );

  return {
    title: "Topological sort — Kahn's algorithm",
    code,
    frames: r.done(),
    complexity: { time: "O(V + E)", space: "O(V)" },
  };
}

export function dijkstra(): Trace {
  const V = ["A", "B", "C", "D", "E", "F"];
  const E: [string, string, number][] = [
    ["A", "B", 4],
    ["A", "C", 2],
    ["B", "C", 5],
    ["B", "D", 10],
    ["C", "E", 3],
    ["E", "D", 4],
    ["D", "F", 11],
    ["E", "F", 9],
  ];
  const r = new Recorder();
  const code = [
    "dist = {v: INF for v in V}; dist[src] = 0",
    "pq = [(0, src)]",
    "while pq:",
    "  d, u = heappop(pq)          # closest unsettled node",
    "  if d > dist[u]: continue    # stale entry",
    "  for (v, w) in adj[u]:",
    "    if d + w < dist[v]:",
    "      dist[v] = d + w         # relax",
    "      heappush(pq, (dist[v], v))",
  ];

  const pos: Record<string, { x: number; y: number }> = {
    A: { x: 0.08, y: 0.5 },
    B: { x: 0.34, y: 0.14 },
    C: { x: 0.34, y: 0.84 },
    D: { x: 0.64, y: 0.14 },
    E: { x: 0.64, y: 0.84 },
    F: { x: 0.92, y: 0.5 },
  };

  const adj: Record<string, [string, number][]> = Object.fromEntries(
    V.map((v) => [v, [] as [string, number][]]),
  );
  for (const [u, v, w] of E) {
    adj[u].push([v, w]);
    adj[v].push([u, w]);
  }

  const INF = Infinity;
  const dist: Record<string, number> = Object.fromEntries(
    V.map((v) => [v, INF]),
  );
  const settled = new Set<string>();
  const src = "A";
  dist[src] = 0;
  const pq: [number, string][] = [[0, src]];

  const snap = (
    note: string,
    line: number,
    cur?: string,
    relaxing?: [string, string],
  ) => {
    const gnodes: GraphNode[] = V.map((v) => ({
      id: v,
      label: v,
      x: pos[v].x,
      y: pos[v].y,
      s: (v === cur
        ? "cursor"
        : settled.has(v)
          ? "match"
          : dist[v] < INF
            ? "scan"
            : "idle") as CellState,
      badge: dist[v] === INF ? "∞" : String(dist[v]),
    }));
    const gedges: GraphEdge[] = E.map(([u, v, w]) => ({
      from: u,
      to: v,
      w,
      s: (relaxing &&
      ((relaxing[0] === u && relaxing[1] === v) ||
        (relaxing[0] === v && relaxing[1] === u))
        ? "cursor"
        : settled.has(u) && settled.has(v)
          ? "match"
          : undefined) as CellState | undefined,
    }));
    r.emit({
      note,
      line,
      nodes: gnodes,
      edges: gedges,
      aux: [
        {
          title: "priority queue (distance, node)",
          empty: "empty",
          cells: [...pq]
            .sort((x, y) => x[0] - y[0])
            .map(([d, v], i) => ({
              id: `pq${v}${d}`,
              v: `${v}:${d}`,
              s: (i === 0 ? "cursor" : "idle") as CellState,
            })),
        },
      ],
      stats: [{ label: "settled", value: `${settled.size} / ${V.length}` }],
    });
  };

  snap(
    `Dijkstra from ${src}. Every node starts at ∞ except the source. The invariant: once a node is popped, its distance is final.`,
    0,
  );

  let guard = 0;
  while (pq.length && guard++ < 60) {
    pq.sort((x, y) => x[0] - y[0]);
    const [d, u] = pq.shift() as [number, string];
    if (d > dist[u]) {
      snap(
        `(${u}, ${d}) is a stale entry — we already found a shorter route. Skip it.`,
        4,
        u,
      );
      continue;
    }
    settled.add(u);
    snap(
      `Pop ${u} at distance ${d}. It is the closest unsettled node, so no later path can beat it — settle it permanently.`,
      3,
      u,
    );

    for (const [v, w] of adj[u]) {
      if (settled.has(v)) continue;
      const cand = d + w;
      if (cand < dist[v]) {
        const was = dist[v] === INF ? "∞" : dist[v];
        dist[v] = cand;
        pq.push([cand, v]);
        snap(
          `Relax ${u} → ${v}: ${d} + ${w} = ${cand}, better than ${was}. Update and push.`,
          7,
          u,
          [u, v],
        );
      } else {
        snap(
          `${u} → ${v} would cost ${cand}, no better than the known ${dist[v]}. Ignore.`,
          6,
          u,
          [u, v],
        );
      }
    }
  }

  snap(
    `All settled. Distances from ${src}: ${V.map((v) => `${v}=${dist[v]}`).join(", ")}. Note this depends on non-negative weights — a negative edge breaks the "settled is final" invariant, and that is exactly when you need Bellman-Ford.`,
    8,
  );

  return {
    title: "Dijkstra — greedy shortest path on non-negative weights",
    code,
    frames: r.done(),
    complexity: { time: "O((V + E) log V)", space: "O(V)" },
  };
}

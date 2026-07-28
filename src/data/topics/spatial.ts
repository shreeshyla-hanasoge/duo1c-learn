import type { Topic } from "../types.ts";

export const spatial: Topic = {
  id: "spatial",
  title: "Spatial structures",
  tier: 4,
  week: 22,
  depth: "deep",
  summary:
    "k-d trees, quadtrees, geohashing, R-trees, Haversine + bounding boxes.",
  why: '"Find everything near me" is a scan-and-sort in most codebases. It does not have to be.',
  complexity: "O(log n) typical",
  learn: {
    intuition:
      "'Show me every restaurant within two kilometres' is, in most codebases, a loop over every restaurant computing a distance. That works until the table is large, and then it is the slowest query in the system. The fix is the same idea that makes a hash map fast, applied to two dimensions instead of one: arrange things so that most of the data can be dismissed without being examined. Chop the map into a grid of cells whose side is about your search radius. Now a point two kilometres from you must lie in your own cell or one of the eight touching it, so you look at nine cells and ignore the rest of the country. That is spatial hashing, and it is both the simplest of these structures and the one that most often turns out to be enough. The tree-shaped alternatives — quadtrees, k-d trees, R-trees — do the same thing adaptively rather than on a fixed grid, which matters when the data is clustered, because a fixed grid over India puts an enormous number of points in one Mumbai cell and none in most others. The second idea here is independent and just as valuable: never compute an expensive distance until a cheap test has already failed to rule the candidate out.",
    mechanics: [
      {
        heading: "Bounding box before trigonometry, always",
        body: "A great-circle distance involves several trigonometric calls. A bounding-box test is four comparisons. Since a point outside the box is certainly outside the circle, filter by box first and compute the real distance only for survivors. On a wide search that removes almost everything for the price of four comparisons each, and it is the cheapest optimisation in this entire topic.",
      },
      {
        heading: "Compare squared distances, and skip the square root",
        body: "`√a < √b` exactly when `a < b` for non-negative values, so comparisons and radius tests work perfectly on squared distances. Take the root only when you have to display the number. This removes a transcendental call from the innermost loop for free, and it is safe in a way most micro-optimisations are not.",
      },
      {
        heading: "Grid cells sized to the query radius",
        body: "Bucket points by `(floor(x / cell), floor(y / cell))` in a hash map. With the cell side equal to the search radius, everything within the radius lies in the 3×3 block around the query, so you examine nine buckets. Too small a cell means scanning many buckets; too large means each bucket holds too many points. The radius is the natural choice and is what makes this O(1) per query on evenly spread data.",
      },
      {
        heading: "Geohash turns proximity into a string prefix",
        body: "Interleaving the bits of latitude and longitude and encoding them base-32 gives a string where a shared prefix means spatial closeness. That is enormously convenient, because any ordinary index — a B-tree, a Redis sorted set, a DynamoDB range key — can then answer a proximity query as a prefix range scan, with no spatial index type required.",
      },
      {
        heading: "Geohash has an edge problem, and you must handle it",
        body: "Two points either side of a cell boundary can be metres apart and share no prefix at all. This happens at every cell boundary, not just at the equator and the prime meridian. The standard fix is to query the cell plus its eight neighbours, exactly as with the grid. Anyone proposing geohashing without mentioning this has not deployed it — and the failure mode is nearby results silently going missing rather than wrong results appearing.",
      },
    ],
    complexityDerivation:
      "A grid query examines nine buckets and the points inside them. If points are spread evenly, with cells the size of the search radius, each bucket holds a constant number, so a query is O(1) plus the number of results — which is optimal, since you have to touch every result. Build is O(n), one hash insertion per point. The honest caveat is that this bound depends entirely on the data being evenly spread, and real geographic data never is. Population clusters, so a uniform grid over India puts a huge share of points in a few cells around Mumbai, Delhi and Bengaluru and leaves most cells empty. In the worst case — every point in one cell — a query degenerates to exactly the full scan you were trying to avoid. That is what the tree structures fix: a quadtree subdivides a cell only when it gets crowded, and a k-d tree splits at the median so both sides hold half the points by construction, giving O(log n) descent regardless of clustering. The trade is that trees are harder to update. A k-d tree built on medians degrades as points are inserted and needs periodic rebuilding, whereas a hash grid handles inserts and deletes in O(1) forever. So the real decision is not about the query bound at all; it is about how clustered your data is and how often it moves.",
    variants: [
      {
        name: "Uniform grid / spatial hash",
        when: "Points are reasonably spread and updates are frequent.",
        delta:
          "A hash map from cell to point list. O(1) insert, delete and query, twenty lines, no rebalancing ever. Degrades badly under heavy clustering.",
      },
      {
        name: "Quadtree",
        when: "Clustered data, mostly static.",
        delta:
          "Subdivide a cell only when it exceeds a threshold, so dense regions get finer cells automatically. Adapts to clustering at the cost of tree maintenance.",
      },
      {
        name: "k-d tree",
        when: "Nearest-neighbour queries on static points, in any number of dimensions.",
        delta:
          "Split at the median on alternating axes, so the tree is balanced by construction. Excellent for k-nearest queries, and it degrades as points are inserted — plan to rebuild.",
      },
      {
        name: "R-tree",
        when: "The objects have extent — rectangles, polygons, roads — not just a position.",
        delta:
          "Groups nearby objects under overlapping bounding boxes. This is what PostGIS and most spatial databases actually use, because real map features are shapes rather than points.",
      },
    ],
    tradeoffs: [
      {
        vs: "A full scan with a distance filter",
        pick: "The scan below a few thousand points",
        because:
          "Five thousand points with a bounding-box prefilter is well under a millisecond and needs no structure, no index maintenance and no code. Spatial structures earn their place when the dataset is large, the query is frequent, or both. Adding a quadtree to a table of two hundred stores is a maintenance liability that buys nothing measurable.",
      },
      {
        vs: "PostGIS or a database spatial index",
        pick: "The database, whenever the data already lives in one",
        because:
          "A GiST index over a geography column gives you R-tree behaviour, correct spherical distance, and the ability to combine the spatial predicate with your other WHERE clauses in a single query plan. Building your own index in application memory means loading the data, keeping it in sync, and losing the ability to filter by anything else. Hand-roll when the data is transient, already in memory, or the query sits on a hot path where the round trip itself is the cost.",
      },
      {
        vs: "Geohash prefixes in an existing key-value store",
        pick: "Geohash when you cannot add a spatial index",
        because:
          "It turns proximity into string prefixes, so any B-tree or sorted set can serve it — a real advantage when adding a spatial index type is not an option. The costs are the edge problem, which forces nine lookups rather than one, and that cell sizes come in discrete precision steps rather than matching your radius. Both are manageable, and both must be said out loud when you propose it.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — clustering price levels into zones",
      kind: "yours",
      problem:
        "Support and resistance levels arrive as a long list of prices, and nearby ones represent the same zone. Comparing every level against every other to group them is quadratic, and it runs on every evaluation.",
      applied:
        "This is the one-dimensional case of the same idea: bucket levels by `floor(price / tolerance)`, so only levels in the same bucket or an adjacent one can possibly be close. That turns the pairwise comparison into a scan of neighbouring buckets — and the adjacent-bucket check is precisely the edge problem, in one dimension instead of two.",
      evidence: "strategy-engine/src/strategy/enhanced_strategy_executor.py",
      impact: "O(n²) pairwise clustering → O(n) with a bucket scan",
    },
    {
      system: "Ride-hailing driver matching",
      kind: "industry",
      problem:
        "Finding available drivers near a rider, continuously, across a city, where both drivers and requests move constantly. A scan over every driver per request does not survive peak hour.",
      applied:
        "A spatial hash — often over hierarchical cell IDs like H3 or S2 rather than a plain grid, because those handle the sphere properly and give a clean parent-child hierarchy for widening the search when a cell has no drivers. Updates dominate here, which is exactly why a hash grid beats a tree: a driver crossing into another cell is one delete and one insert.",
      impact:
        "A scan per request → a handful of cell lookups, with O(1) updates as drivers move",
    },
    {
      system: "PostGIS and GiST indexes",
      kind: "industry",
      problem:
        "Answering 'which ward does this address fall in' or 'which roads intersect this box' over map features that are polygons and lines rather than points.",
      applied:
        "An R-tree — GiST in PostgreSQL — groups features under bounding boxes, so a query descends only into boxes overlapping the search region. The two-stage pattern is built in: the index filters by bounding box, then the exact geometry predicate runs only on the survivors. That is the cheap-test-before-expensive-test rule shipped as a database feature.",
      impact:
        "Exact geometry tests confined to the few candidates a box test could not rule out",
    },
    {
      system: "Collision detection in games and simulation",
      kind: "industry",
      problem:
        "Checking which of thousands of moving objects are touching, every frame, inside a budget of a few milliseconds.",
      applied:
        "A uniform spatial hash rebuilt or updated each frame — the standard 'broad phase'. It produces candidate pairs cheaply, and the expensive exact shape test runs only on those. Objects move every frame, so cheap updates matter far more than an optimal query bound, which is why the simplest structure wins here.",
      impact: "n² pair checks per frame → candidates drawn from neighbouring cells only",
    },
  ],
  lab: {
    prompt:
      "Given `points` as `[x, y]` pairs, a list of `queries` also as `[x, y]`, and a `radius`, return for each query how many points lie within that radius — inclusive, so a point exactly at the radius counts. Budget: O(n + q) on evenly spread data. Checking every point against every query is O(n·q) and will fail the gate.",
    fnName: "countNearby",
    signature:
      "countNearby(points: number[][], queries: number[][], radius: number): number[]",
    starter: `function countNearby(points, queries, radius) {
// Your budget: O(n + q) on evenly spread points.
// Bucket the points into grid cells whose side is the radius. Then any
// point within the radius of a query must lie in the query's own cell
// or one of the eight touching it — nine cells, not the whole map.
// Compare SQUARED distances so you never need a square root.

return [];
}`,
    tests: [
      {
        // (0,0),(1,0),(0,1) are within 1.5 of the origin; only (5,5) is
        // within 1.5 of (5,5); nothing is near (100,100).
        name: "three clusters",
        input: [
          [[0, 0], [1, 0], [0, 1], [5, 5], [10, 10]],
          [[0, 0], [5, 5], [100, 100]],
          1.5,
        ],
        expected: [3, 1, 0],
      },
      {
        // (3,4) is at distance exactly 5. Inclusive, so it counts — a
        // strict `<` comparison returns 1 here instead of 2.
        name: "a point exactly on the radius counts",
        input: [[[0, 0], [3, 4]], [[0, 0]], 5],
        expected: [2],
      },
      {
        name: "duplicate points at zero radius",
        input: [[[2, 2], [2, 2], [2, 2]], [[2, 2]], 0],
        expected: [3],
      },
      {
        // Cell indices must use Math.floor, not truncation — trunc rounds
        // toward zero and merges the cells either side of each axis.
        name: "negative coordinates",
        input: [[[-3, -4], [0, 0]], [[0, 0]], 5],
        expected: [2],
      },
      {
        name: "nothing in range",
        input: [[[10, 10]], [[0, 0]], 1],
        expected: [0],
      },
      { name: "no points", input: [[], [[0, 0]], 5], expected: [0], hidden: true },
      { name: "no queries", input: [[[1, 1]], [], 5], expected: [], hidden: true },
      {
        name: "query in an empty region",
        input: [[[0, 0], [1, 1]], [[50, 50]], 2],
        expected: [0],
        hidden: true,
      },
    ],
    hints: [
      "Bucket each point by its cell: `Math.floor(x / radius)` and `Math.floor(y / radius)`, joined into a map key. Use `Math.floor`, not `| 0` or `Math.trunc` — truncation rounds toward zero and puts −0.5 and 0.5 in the same cell.",
      "For a query, compute its own cell and then look at the 3×3 block around it: `dx` and `dy` each from −1 to 1. With cells the size of the radius, nothing outside that block can possibly be within the radius.",
      "Inside those cells, test with squared distances: `(x−qx)² + (y−qy)² <= radius²`. No square root, and `<=` so a point exactly on the boundary counts. Watch out for a radius of 0 — dividing by it gives Infinity, so handle that case on its own.",
    ],
    solution: `function countNearby(points, queries, radius) {
const out = [];
if (queries.length === 0) return out;

// Radius 0 has no usable cell size (division by zero), and the answer
// is just "points at exactly this position" — handle it directly.
if (radius === 0) {
  const exact = new Map();
  for (const [x, y] of points) {
    const key = x + ',' + y;
    exact.set(key, (exact.get(key) ?? 0) + 1);
  }
  for (const [qx, qy] of queries) out.push(exact.get(qx + ',' + qy) ?? 0);
  return out;
}

// Cells the size of the radius, so anything in range lies in the 3x3
// block around the query's own cell.
const cells = new Map();
// Math.floor, NOT truncation: trunc rounds toward zero, which merges
// the cells either side of an axis and breaks negative coordinates.
const cellOf = (v) => Math.floor(v / radius);

for (const p of points) {
  const key = cellOf(p[0]) + ',' + cellOf(p[1]);
  let bucket = cells.get(key);
  if (bucket === undefined) { bucket = []; cells.set(key, bucket); }
  bucket.push(p);
}

const r2 = radius * radius;

for (const [qx, qy] of queries) {
  const cx = cellOf(qx);
  const cy = cellOf(qy);
  let count = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = cells.get((cx + dx) + ',' + (cy + dy));
      if (bucket === undefined) continue;
      for (const [px, py] of bucket) {
        const ex = px - qx;
        const ey = py - qy;
        // SQUARED distance — no square root needed to compare — and
        // <= so a point exactly on the boundary counts.
        if (ex * ex + ey * ey <= r2) count++;
      }
    }
  }
  out.push(count);
}

return out;
}`,
    complexityGate: {
      target: "O(n)",
      // Points and queries both scale with the parameter, spread over a
      // square whose area grows with n, so density per cell stays constant
      // and the grid genuinely delivers O(1) per query.
      //
      // Even spreading is the precondition the derivation names: clustered
      // points would pile into one bucket and the grid would degrade to
      // the scan it is supposed to replace.
      gen: "(n) => { const side = Math.ceil(Math.sqrt(n)) * 4; return [Array.from({ length: n }, (_, i) => [(i * 7) % side, (i * 13) % side]), Array.from({ length: n }, (_, i) => [(i * 11) % side, (i * 5) % side]), 2]; }",
      sizes: [2000, 4000, 8000, 16000],
    },
  },
  insights: [
    {
      t: "Bounding box before trigonometry — always",
      d: "A box test is four comparisons; a great-circle distance is several trigonometric calls. A point outside the box is certainly outside the circle, so filter cheaply first and compute the real distance only for survivors.",
    },
    {
      t: "Geohash turns proximity into a string prefix",
      d: "Interleaving latitude and longitude bits gives strings where a shared prefix means spatial closeness — so any ordinary B-tree or sorted set can answer proximity queries with no spatial index type at all.",
    },
    {
      t: "Geohash has an edge problem",
      d: "Two points metres apart either side of a cell boundary can share no prefix. The fix is to query the cell plus its eight neighbours, and the failure mode is silently missing nearby results rather than wrong ones.",
    },
    {
      t: "Top-K by heap, not by sorting everything",
      d: "'The five nearest' does not need a full sort. A bounded heap of size k is O(n log k) and holds only k candidates, which matters when n is the whole city.",
    },
    {
      t: "The grid's O(1) assumes even spreading, and real data clusters",
      d: "A uniform grid over India puts a huge share of points in a few metro cells. Quadtrees subdivide only where it is crowded and k-d trees split at the median — that adaptivity is what you are buying, at the cost of harder updates.",
    },
  ],
  pitfalls: [
    "Computing exact distances before any cheap filter, so the trigonometry runs on every row rather than on the few that survive a box test.",
    "Using truncation instead of `Math.floor` for cell indices, which merges the cells either side of each axis and breaks every negative coordinate.",
    "Geohashing without querying neighbouring cells, so results near a boundary silently go missing.",
    "Choosing a uniform grid for heavily clustered data, where one bucket holds most of the points and every query there degenerates to a full scan.",
  ],
  quiz: [
    {
      q: "Before computing a great-circle distance for every candidate, you should:",
      options: [
        "Sort by latitude",
        "Filter by a bounding box — four comparisons that eliminate almost everything",
        "Convert to radians once",
        "Cache the results",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A point outside the box is certainly outside the circle, so the cheap test is a safe prefilter and removes nearly all candidates before any trigonometry runs.",
      distractors: [
        "Sorting by one axis narrows a band but is O(n log n) and leaves longitude unconstrained, so it filters far less for considerably more work.",
        "",
        "A genuine micro-optimisation that reduces the constant on each distance computation — but it does not reduce how many you compute, which is the actual problem.",
        "Caching helps only for repeated identical queries, and 'near me' is different for every user.",
      ],
    },
    {
      q: "Two locations 50 metres apart can have completely different geohashes when:",
      options: [
        "They are at high latitude",
        "They fall either side of a cell boundary",
        "The precision is too high",
        "They are in different time zones",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Prefix similarity tracks cell containment, not distance. Points straddling a boundary land in different cells and can share no prefix at all — which is why proximity queries must also check the eight neighbouring cells.",
      distractors: [
        "Cell shapes do distort toward the poles, which changes their real-world size, but the sudden prefix discontinuity happens at every boundary at every latitude.",
        "",
        "Higher precision means smaller cells and therefore more boundaries, so it makes the problem more frequent — but the problem exists at every precision.",
        "Time zones are political and have no relationship to the encoding.",
      ],
    },
    {
      q: "Why compare squared distances rather than distances?",
      options: [
        "It is more accurate",
        "√a < √b exactly when a < b for non-negative values, so the square root is unnecessary for any comparison or radius test",
        "It avoids overflow",
        "Squared distance is a different metric",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Square root is monotonic on non-negative numbers, so it preserves ordering. Taking it changes nothing about which points pass a threshold and costs a transcendental call in the innermost loop.",
      distractors: [
        "Skipping the root avoids one rounding step, which is marginal — the reason is the cost, not the accuracy.",
        "",
        "Squaring makes overflow more likely, not less, since the values get larger.",
        "It is the same metric's ordering. If it ranked points differently, the substitution would not be valid at all.",
      ],
    },
    {
      q: "Your grid uses cells much smaller than the search radius. What happens?",
      options: [
        "Queries get faster",
        "A query must scan many more cells to cover the radius, so the per-query constant grows",
        "Points are placed in the wrong cells",
        "Nothing changes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The 3×3 block only covers the radius when the cell side equals it. With cells at a tenth the radius you need a 21×21 block — 441 lookups per query instead of 9, most of them empty.",
      distractors: [
        "Fewer points per cell is genuinely good, which is what makes this tempting — but it is swamped by having to visit far more cells, most containing nothing.",
        "",
        "Placement stays correct at any cell size; it is a deterministic function of the coordinates.",
        "The number of cells to examine scales with the square of the ratio, which is a very visible change.",
      ],
    },
    {
      q: "Points are heavily clustered in three cities and sparse elsewhere. A uniform grid will:",
      options: [
        "Work fine — the cells adapt",
        "Degrade toward a scan in the dense cells, because O(1) per query assumed constant points per bucket",
        "Fail to insert points",
        "Use too much memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The grid's bound rests entirely on even spreading. When one cell holds a large fraction of the data, a query landing there examines all of it — which is exactly what quadtrees and k-d trees exist to fix.",
      distractors: [
        "A uniform grid does not adapt at all — that is the defining difference between it and a quadtree.",
        "",
        "Insertion works fine; the buckets simply get long. There is no error to observe, which is what makes this a production surprise.",
        "Memory is if anything better than a tree's, since empty regions cost nothing in a hash map. The problem is query time.",
      ],
    },
    {
      q: "The data already lives in PostgreSQL. Someone proposes loading it into an in-memory k-d tree. Your response?",
      options: [
        "Agree — in-memory is always faster",
        "Ask why not a GiST index: it gives R-tree behaviour, correct spherical distance, and lets the spatial predicate combine with other WHERE clauses in one plan",
        "Suggest a quadtree instead",
        "Suggest geohashing",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A hand-rolled structure means loading the data, keeping it in sync, and applying every non-spatial filter yourself. The database index costs one line of DDL. Hand-rolling is for transient or already-in-memory data, or a hot path where the round trip is the cost.",
      distractors: [
        "Faster per query, and it ignores synchronisation, memory pressure, and that the other filters now have to be reimplemented.",
        "",
        "Swapping one hand-rolled structure for another does not address why we are building one at all.",
        "Geohashing is the answer when you CANNOT add a spatial index. Here you can.",
      ],
    },
    {
      q: "Drivers move constantly and requests arrive continuously. Which structure fits, and why?",
      options: [
        "A k-d tree, for its O(log n) queries",
        "A spatial hash — updates are O(1) and a moving driver is one delete plus one insert, whereas a median-split tree degrades as points move",
        "A sorted array by latitude",
        "An R-tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Update cost dominates when the data moves every few seconds. A k-d tree's balance comes from medians computed at build time, so streaming updates degrade it and force periodic rebuilds. A hash grid never rebalances.",
      distractors: [
        "The query bound is attractive, and the update story is what rules it out — the balance guarantee does not survive continuous movement.",
        "",
        "Maintaining sorted order under constant movement is O(n) per update, and one axis leaves the other unconstrained.",
        "R-trees are for objects with extent. Drivers are points, and R-tree updates cost more than a hash grid's.",
      ],
    },
    {
      q: "A table of 200 store locations needs a 'nearest store' feature. What do you build?",
      options: [
        "A quadtree",
        "A loop with a bounding-box prefilter — 200 rows is microseconds, and a spatial structure is maintenance for no measurable gain",
        "A geohash index",
        "A k-d tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Two hundred distance computations is far below any threshold where a structure pays for itself. Recognising that the crossover has not been reached is the judgement being tested, and every structure here carries a synchronisation burden the scan does not.",
      distractors: [
        "Tree maintenance and a rebuild path, to accelerate something already imperceptible.",
        "",
        "It adds encoding, precision selection and the neighbour-cell workaround, for a dataset that fits in a couple of cache lines.",
        "The same objection, plus a rebuild whenever a store opens or closes.",
      ],
    },
  ],
};

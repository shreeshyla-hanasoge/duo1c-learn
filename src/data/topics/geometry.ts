import type { Topic } from "../types.ts";

export const geometry: Topic = {
  id: "geometry",
  title: "Computational geometry",
  tier: 4,
  week: 22,
  depth: "deep",
  summary: "Convex hull, line intersection, point-in-polygon, polygon area.",
  why: "Layout, nesting, collision, and any question about shapes on a plane.",
  complexity: "O(n log n) hull",
  learn: {
    intuition:
      "Almost every question about shapes on a plane reduces to one primitive: given three points, does the path from the first to the second to the third turn left, turn right, or go straight? That is the cross product, and it is a single subtraction-and-multiply expression whose *sign* carries the answer. Once you have it, a surprising amount falls out. A convex hull is what you get by walking the points in sorted order and refusing to ever turn the wrong way — whenever the last three points make a right turn, the middle one is inside the hull and gets discarded. Whether two segments cross is four orientation tests. Which side of a line a point lies on is one. The area of a polygon is a sum of cross products. So the useful move in this topic is not memorising several algorithms; it is noticing that they are one primitive applied differently, and then being extremely careful about the two things that actually break real geometry code: collinear points, where the cross product is zero and you must decide what that means, and floating-point arithmetic, where it is nearly zero and you cannot tell.",
    mechanics: [
      {
        heading: "The cross product decides orientation",
        body: "For points O, A, B, the value `(A.x-O.x)*(B.y-O.y) - (A.y-O.y)*(B.x-O.x)` is positive for a counter-clockwise turn, negative for clockwise, and exactly zero when the three are collinear. Only the sign matters. Its magnitude is twice the area of the triangle, which is where the area formula comes from.",
      },
      {
        heading: "Convex hull by monotone chain",
        body: "Sort the points by x, then by y. Sweep left to right building the lower hull: push each point, and while the last three make a non-left turn, pop the middle one. Sweep back right to left for the upper hull. Drop the last point of each — it is the first point of the other — and concatenate. The sort dominates, so it is O(n log n), and the sweep itself is linear because each point is pushed once and popped at most once.",
      },
      {
        heading: "Decide explicitly what collinear means for you",
        body: "When the cross product is exactly zero, the middle point lies on a straight edge of the hull. Popping it gives the minimal hull with only corner vertices; keeping it gives every point on the boundary. Both are defensible and they produce different output, so it is a specification question rather than a bug. Using `<= 0` in the pop condition removes collinear points; `< 0` keeps them.",
      },
      {
        heading: "Shoelace gives polygon area in one pass",
        body: "Sum `x[i]*y[i+1] - x[i+1]*y[i]` around the vertices and halve the absolute value. It works for any simple polygon, convex or not, and the sign before you take the absolute value tells you the winding direction — positive for counter-clockwise. That sign is genuinely useful: it is how you detect whether a polygon was specified backwards, which matters for holes.",
      },
      {
        heading: "Floating point will hurt you, so keep integers where you can",
        body: "The cross product involves products of differences, so two nearly-collinear points give a result that is nearly zero — and whether it lands just above or just below decides which branch you take. Cancellation can make it come out with the wrong sign entirely, and then the hull is not convex and downstream code that assumed it was fails in confusing ways. Where coordinates are inherently discrete — pixels, map tiles at a fixed zoom, integer paise — keep them as integers and the orientation test becomes exact. Where they are not, use an epsilon and know it is a heuristic, not a fix.",
      },
    ],
    complexityDerivation:
      "The monotone chain hull is O(n log n), and it is worth being precise about where that comes from: the sort is O(n log n) and the two sweeps are O(n) in total. Each point is pushed onto the stack once and popped at most once, so the inner `while` loop — which looks nested and alarming — runs a bounded number of times overall. That is the same amortised argument as the monotonic stack, and recognising it is more valuable than the result. It also tells you something practical: if the points arrive already sorted, which happens when they come from a scan or a spatial index, the hull is linear. The O(n log n) is not a property of hulls, it is the cost of sorting. There is a matching lower bound — you can sort n numbers by computing the hull of the points (x, x²) on a parabola and reading the vertices off in order — so no comparison-based hull algorithm can beat O(n log n) in general. Shoelace area and point-in-polygon by ray casting are both O(n), a single pass over the vertices. The output-sensitive alternative worth knowing is Chan's algorithm at O(n log h) where h is the number of hull vertices, which matters when a million points have a hull of eight — though in practice the constant usually eats the gain.",
    variants: [
      {
        name: "Monotone chain (Andrew)",
        when: "The default convex hull.",
        delta:
          "Sort by coordinate, two linear sweeps. Simpler and more numerically robust than Graham scan, because it sorts by coordinate rather than by angle — no arctangent anywhere.",
      },
      {
        name: "Graham scan",
        when: "The classic presentation, still widely taught.",
        delta:
          "Sort by polar angle around the lowest point. Same complexity, and the angular sort is both slower and more delicate about ties and precision.",
      },
      {
        name: "Rotating calipers",
        when: "Diameter, width, or the minimum-area bounding rectangle.",
        delta:
          "Walk two or more pointers around the finished hull. O(n) after the hull, and the reason 'minimum bounding rectangle' is cheap: one side of the optimum always lies flush against a hull edge.",
      },
      {
        name: "Sweep line",
        when: "Segment intersections, rectangle unions, closest pair.",
        delta:
          "Move a line across the plane, keeping an ordered structure of what it currently crosses. O((n + k) log n) for k intersections — a different shape of algorithm, and the one that scales.",
      },
    ],
    tradeoffs: [
      {
        vs: "A geometry library — Shapely, JTS, PostGIS, Turf",
        pick: "The library, for anything shipping",
        because:
          "These libraries have absorbed decades of degenerate-case handling: self-intersecting polygons, holes, coincident vertices, robust predicates that are exact rather than approximate. Hand-rolled geometry is fine for a hull over clean data and turns into a long tail of 'why is this polygon's area negative' otherwise. Implement it yourself to understand it, and to avoid a dependency on a genuinely hot path — not because the library is slow.",
      },
      {
        vs: "Exact predicates with rational or extended arithmetic",
        pick: "Exact when correctness matters more than speed",
        because:
          "Floating-point orientation tests can return the wrong sign for nearly-collinear points, and a hull that is not actually convex breaks everything downstream. Robust predicates — Shewchuk's adaptive arithmetic is the standard — cost a little on the rare hard cases and nothing on the easy ones. If your coordinates are integers, you get exactness for free and should keep them that way as long as possible.",
      },
      {
        vs: "Bounding boxes instead of exact shapes",
        pick: "Boxes first, exact shapes only on survivors",
        because:
          "A box test is four comparisons; polygon intersection is a sweep. Nearly every practical system is two-stage: filter by bounding box, then run the exact predicate on what is left. Skipping the cheap stage means running the expensive test on pairs that could never have interacted, and it is the difference between a system that scales and one that does not.",
      },
    ],
  },
  realWorld: [
    {
      system: "yantrika — nesting parts on sheet metal",
      kind: "yours",
      problem:
        "Press-tool and sheet-metal work needs parts laid out on a stock sheet with as little waste as possible. Parts are arbitrary outlines from CAD drawings, and testing whether two arbitrary outlines overlap is expensive to do repeatedly during a search over placements.",
      applied:
        "Replace each part with its convex hull, or with the minimum-area bounding rectangle that rotating calipers gives you from the hull. Overlap tests against convex shapes are far cheaper and never report a false 'no', so the search runs over hulls and the exact outline check runs only on the placements that survive.",
      evidence: "yantrika-app/types/dxf-viewer.d.ts",
      impact:
        "Exact outline tests on every candidate placement → hull tests, with exact checks only on survivors",
    },
    {
      system: "Map rendering and simplification",
      kind: "industry",
      problem:
        "Drawing a country's boundary at low zoom, where the source polygon has hundreds of thousands of vertices and the screen has a few hundred pixels of coastline.",
      applied:
        "Douglas–Peucker simplification repeatedly keeps the vertex furthest from the current straight-line approximation, and 'distance from a line' is the cross product divided by the segment length. Convex hulls and bounding boxes then serve as the coarse test for whether a feature intersects the current tile at all.",
      impact: "Hundreds of thousands of vertices → a few hundred, chosen by measured deviation",
    },
    {
      system: "Collision detection with GJK",
      kind: "industry",
      problem:
        "Determining whether two convex shapes intersect, thousands of times per frame, in a physics engine.",
      applied:
        "The Gilbert–Johnson–Keerthi algorithm works entirely on convex shapes, which is why every physics engine decomposes concave meshes into convex pieces first. Convexity is what makes the question tractable, and that is the deeper reason convex hulls appear everywhere: not because the hull is interesting, but because convex shapes are the ones with cheap predicates.",
      impact: "Arbitrary mesh intersection → convex-piece tests with an iterative support function",
    },
    {
      system: "Point-in-polygon for geofencing",
      kind: "industry",
      problem:
        "Deciding whether a delivery address falls inside a serviceable zone, or whether a vehicle has entered a restricted area — millions of times a day against polygons drawn by hand.",
      applied:
        "Ray casting: shoot a ray from the point and count boundary crossings; odd means inside. It is O(vertices) and its whole difficulty is degenerate cases — a ray passing exactly through a vertex must be counted once, not twice or zero times. Production systems put a bounding-box test in front so the ray cast runs only for the few zones the point could plausibly be in.",
      impact:
        "Correct containment in one pass per polygon, with a box prefilter removing nearly all of them",
    },
  ],
  lab: {
    prompt:
      "Return the convex hull of a set of `[x, y]` points: the smallest convex polygon containing all of them. Output the hull vertices in counter-clockwise order starting from the lowest-then-leftmost point, with no repeated final point. EXCLUDE points that lie on a hull edge without being a corner. De-duplicate identical input points. For fewer than three distinct points, return them sorted by x then y. Budget: O(n log n).",
    fnName: "convexHull",
    signature: "convexHull(points: number[][]): number[][]",
    starter: `function convexHull(points) {
// Your budget: O(n log n) — the sort dominates; the sweeps are linear.
// Sort by x then y. Build the lower hull left-to-right, popping the
// middle point whenever the last three do not turn the right way.
// Repeat right-to-left for the upper hull, then join them.
//
// cross(O, A, B) = (A[0]-O[0])*(B[1]-O[1]) - (A[1]-O[1])*(B[0]-O[0])
// > 0 is a counter-clockwise turn, 0 means collinear.

return [];
}`,
    tests: [
      {
        // The interior point (1,1) is dropped.
        name: "square with an interior point",
        input: [[[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]],
        expected: [[0, 0], [2, 0], [2, 2], [0, 2]],
      },
      {
        name: "triangle",
        input: [[[0, 0], [4, 0], [0, 3]]],
        expected: [[0, 0], [4, 0], [0, 3]],
      },
      {
        // (2,0) sits ON the edge from (0,0) to (4,0) — it is not a corner,
        // so it must be excluded. This is the collinearity decision.
        name: "a point on an edge is not a vertex",
        input: [[[0, 0], [2, 0], [4, 0], [2, 2]]],
        expected: [[0, 0], [4, 0], [2, 2]],
      },
      {
        // Everything collinear: the hull degenerates to the two endpoints.
        name: "all points collinear",
        input: [[[0, 0], [1, 1], [2, 2], [3, 3]]],
        expected: [[0, 0], [3, 3]],
      },
      {
        // Duplicates must not produce repeated vertices or a zero-length
        // edge that breaks the orientation test.
        name: "duplicate points",
        input: [[[0, 0], [0, 0], [1, 0], [0, 1]]],
        expected: [[0, 0], [1, 0], [0, 1]],
      },
      {
        name: "two points",
        input: [[[0, 0], [1, 1]]],
        expected: [[0, 0], [1, 1]],
        hidden: true,
      },
      {
        name: "single point",
        input: [[[5, 5]]],
        expected: [[5, 5]],
        hidden: true,
      },
      { name: "empty", input: [[]], expected: [], hidden: true },
    ],
    hints: [
      "De-duplicate first (a Set of stringified pairs is fine), then sort by x and break ties by y. Duplicate points make the cross product zero for a degenerate reason and confuse the pop condition.",
      "Lower hull: walk the sorted points left to right, pushing each. While the stack has at least two points and `cross(stack[-2], stack[-1], next) <= 0`, pop. Upper hull: the same walk over the reversed order.",
      "Use `<= 0` rather than `< 0` in the pop condition — that is what discards points lying exactly on an edge. Then drop the last element of each chain before concatenating, because it is the first element of the other one.",
    ],
    solution: `function convexHull(points) {
// De-duplicate: repeated points make cross() zero for a degenerate
// reason and would otherwise appear twice in the output.
const seen = new Set();
const pts = [];
for (const p of points) {
  const key = p[0] + ',' + p[1];
  if (seen.has(key)) continue;
  seen.add(key);
  pts.push([p[0], p[1]]);
}

// Sort by x, breaking ties by y. Coordinate order, not angular order —
// which is why this is more robust than Graham scan: no arctangent.
pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
if (pts.length < 3) return pts;

// Sign is all that matters: > 0 counter-clockwise, 0 collinear.
const cross = (o, a, b) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

const lower = [];
for (const p of pts) {
  // <= 0 discards collinear points, so only true corners survive.
  // Using < 0 here would keep every point lying on an edge.
  while (lower.length >= 2 &&
         cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
    lower.pop();
  }
  lower.push(p);
}

const upper = [];
for (let i = pts.length - 1; i >= 0; i--) {
  const p = pts[i];
  while (upper.length >= 2 &&
         cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
    upper.pop();
  }
  upper.push(p);
}

// Each chain ends where the other begins, so drop both duplicates.
lower.pop();
upper.pop();
return lower.concat(upper);
}`,
    complexityGate: {
      target: "O(n log n)",
      // Points scattered over a wide square so the hull has many vertices
      // and the pop loop genuinely runs. Points on a circle would put
      // every point on the hull and never pop; points in a tight cluster
      // would pop almost everything — either extreme measures differently
      // from the general case.
      gen: "(n) => [Array.from({ length: n }, (_, i) => [(i * 2654435761) % 100000, (i * 40503 + 7) % 100000])]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "The cross product decides orientation",
      d: "`(A−O)×(B−O)` is positive for a counter-clockwise turn, negative for clockwise, zero for collinear. Only the sign matters, and its magnitude is twice the triangle's area — which is where the area formula comes from.",
    },
    {
      t: "Shoelace gives polygon area in one pass",
      d: "Sum `x[i]·y[i+1] − x[i+1]·y[i]` around the vertices and halve the absolute value. The sign before you take the absolute value tells you the winding direction, which is how you detect a polygon specified backwards.",
    },
    {
      t: "Convex hull + rotating calipers = minimum bounding rectangle",
      d: "One side of the minimum-area rectangle always lies flush against a hull edge, so walking pointers around the hull finds it in O(n) once the hull exists.",
    },
    {
      t: "Floating point will hurt you",
      d: "Nearly-collinear points give a cross product near zero, and cancellation can flip its sign — producing a 'hull' that is not convex and breaking everything downstream. Keep coordinates integral where they are naturally discrete.",
    },
    {
      t: "Collinearity is a specification question, not a bug",
      d: "`<= 0` in the pop condition excludes points lying on an edge; `< 0` keeps them. Both are correct hulls of different definitions, so decide which one the caller needs and say so.",
    },
  ],
  pitfalls: [
    "Not de-duplicating the input. Repeated points make the cross product zero for a degenerate reason and can emit the same vertex twice.",
    "Forgetting to drop the last point of each chain before concatenating, which repeats the two extreme points in the output.",
    "Using an angular sort (Graham scan) with `atan2`, which is slower and far more sensitive to precision than sorting by coordinate.",
    "Assuming the hull is convex after a floating-point build. A single wrong sign on a near-collinear triple produces a shape that fails every downstream convexity assumption.",
  ],
  quiz: [
    {
      q: "The cross product of three points tells you:",
      options: [
        "The distance between them",
        "Their orientation — positive for a counter-clockwise turn, negative for clockwise, zero for collinear",
        "Whether they form a triangle",
        "The angle at the middle point",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Only the sign matters for orientation. The magnitude happens to be twice the triangle's area, which is a useful bonus rather than the point.",
      distractors: [
        "Distance needs a square root and involves no notion of turn direction.",
        "",
        "A zero cross product does tell you they are collinear and so form no triangle — but that is one case of the answer, not the whole of it, and it discards the sign information that makes the primitive useful.",
        "Recovering the angle needs `atan2` and both the cross and dot products. The sign alone is what the algorithms consume, and it is exact where the angle is not.",
      ],
    },
    {
      q: "Monotone-chain convex hull is O(n log n). Where does the log come from?",
      options: [
        "The nested while loop inside the sweep",
        "The initial sort — the sweeps themselves are linear because each point is pushed once and popped at most once",
        "The recursion depth",
        "Binary searching for the next hull point",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The same amortised argument as a monotonic stack bounds the sweeps at O(n). So if the points arrive already sorted — from a scan or a spatial index — the hull is linear.",
      distractors: [
        "It looks like the culprit, and it is not: across the whole sweep it runs at most n times in total, because a point can only be popped after it was pushed.",
        "",
        "Monotone chain is iterative. There is no recursion.",
        "Nothing is binary searched — the sweep visits points in order and makes a local decision at each one.",
      ],
    },
    {
      q: "Your hull uses `< 0` in the pop condition instead of `<= 0`. What changes?",
      options: [
        "It breaks — the output is not a hull",
        "Points lying exactly ON a hull edge are kept as vertices rather than discarded",
        "The order reverses",
        "Duplicate points appear",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The two differ only on collinear triples, where the cross product is exactly zero. Both produce a correct convex hull — one with only corners, one with every boundary point. It is a specification choice.",
      distractors: [
        "The shape is identical either way. What changes is how many points are listed along its straight edges.",
        "",
        "Direction is set by the order of the two sweeps, not by the comparison used inside them.",
        "Duplicates come from not de-duplicating the input, which is independent of this comparison.",
      ],
    },
    {
      q: "Why is monotone chain generally preferred over Graham scan?",
      options: [
        "It is asymptotically faster",
        "It sorts by coordinate rather than by polar angle, so there is no arctangent and it is far less sensitive to precision and tie handling",
        "It handles concave polygons",
        "It uses less memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Angular sorting needs `atan2` per point, which is slow and produces near-equal values for near-collinear points — exactly where a comparison sort's decisions become unstable. Coordinate sorting compares two numbers exactly.",
      distractors: [
        "Both are O(n log n). The difference is in the constant and in robustness, not in the class.",
        "",
        "Neither produces a concave hull; the convex hull is convex by definition.",
        "Memory is essentially the same — a sorted array and a stack in both cases.",
      ],
    },
    {
      q: "Coordinates arrive as pixel positions — always whole numbers. What follows?",
      options: [
        "Nothing in particular",
        "Keep them as integers: the orientation test becomes exact, so no near-collinear triple can flip sign",
        "Convert to floats for precision",
        "Scale them up by 1000",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The cross product on integers is a product of differences of integers, which is exact within safe integer range. That removes the entire class of robustness bugs at no cost, and recognising when your data is naturally discrete is the practical version of the floating-point warning.",
      distractors: [
        "It is the single most valuable thing you can know about the input here, because it makes the primitive exact.",
        "",
        "Converting exact values to floats introduces the imprecision you were trying to avoid.",
        "Scaling integers keeps them integers, so it is harmless — but it also achieves nothing, since they were already exact.",
      ],
    },
    {
      q: "A physics engine decomposes concave meshes into convex pieces before collision testing. Why?",
      options: [
        "Convex shapes are smaller",
        "The cheap intersection algorithms — GJK and separating-axis — only work on convex shapes, and convexity is what makes the predicate tractable",
        "It reduces the vertex count",
        "Concave shapes cannot be rendered",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Convexity means any two interior points are joined by an interior segment, which is exactly the property those algorithms exploit. It is also the deeper reason convex hulls appear everywhere: not because hulls are interesting, but because convex shapes have cheap predicates.",
      distractors: [
        "Decomposition produces more pieces in total, not smaller data overall.",
        "",
        "It typically increases the total vertex count across the pieces, since shared edges get duplicated.",
        "Rendering handles concave meshes perfectly well — this is a collision-detection constraint, not a graphics one.",
      ],
    },
    {
      q: "A polygon's shoelace area comes out negative. What does that mean?",
      options: [
        "The polygon self-intersects",
        "The vertices are wound clockwise — take the absolute value for the area, and the sign itself is useful for detecting a polygon specified backwards",
        "There is a floating-point bug",
        "The polygon is concave",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The signed area is negative for clockwise winding and positive for counter-clockwise. That is information rather than an error, and it is how holes and outer boundaries are distinguished in formats that rely on winding direction.",
      distractors: [
        "Self-intersection makes the shoelace result meaningless in a different way — regions cancel — but it does not simply flip the sign.",
        "",
        "The sign is exactly what the formula is designed to produce. Treating it as a bug and silently taking the absolute value throws away the winding information.",
        "Concavity does not affect the sign. Shoelace handles any simple polygon, convex or not.",
      ],
    },
    {
      q: "You need polygon intersection in a shipping service. Hand-roll it or use a library?",
      options: [
        "Hand-roll — it is only a few dozen lines",
        "Use the library: decades of degenerate-case handling for self-intersections, holes, coincident vertices and robust predicates that hand-rolled code does not have",
        "Hand-roll, then add cases as bugs appear",
        "Use bounding boxes only",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The happy path is a few dozen lines and the long tail is not. Shapely, JTS and PostGIS encode a great deal of hard-won handling of exactly the inputs that break naive code. Implement it yourself to understand it, not to ship it.",
      distractors: [
        "True for the happy path, and the degenerate cases are where all the time goes — and they arrive as production bugs on real map data rather than as test failures.",
        "",
        "This is how you end up maintaining a geometry library badly, discovering each case from an incident rather than from a test suite.",
        "Boxes are the right PREFILTER and cannot answer the actual question — two boxes overlapping says nothing definite about the shapes inside them.",
      ],
    },
  ],
};

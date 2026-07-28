import type { Topic } from "../types.ts";

export const bfs: Topic = {
  id: "bfs",
  title: "BFS",
  tier: 2,
  week: 11,
  depth: "core",
  summary: "Shortest path on unweighted graphs, multi-source, and 0-1 BFS.",
  why: "On an unweighted graph, BFS is the shortest path — and reaching for Dijkstra there is both slower and a signal you have not seen the structure. Multi-source BFS in particular turns a whole class of 'distance to the nearest X' problems from n separate searches into one.",
  complexity: "O(V + E)",
  viz: ["bfs"],
  learn: {
    intuition:
      "BFS explores in rings. Start at a node, visit everything one step away, then everything two steps away, and so on. Because it finishes an entire ring before starting the next, the first time it reaches any node is necessarily by the shortest possible route — there is no way to arrive earlier, because everything closer has already been examined. That single property is why BFS is not merely a way to visit every node but the shortest-path algorithm for unweighted graphs. The mechanism is a queue: first in, first out. Nodes discovered earlier are processed earlier, which is exactly what keeps the rings in order. Swap the queue for a stack and you get depth-first search, which visits the same nodes and loses the guarantee completely.",
    mechanics: [
      {
        heading: "Start with the source in the queue, marked as seen",
        body: "Distance 0. The seen set is not an optimisation — without it a graph with a cycle loops forever, and a graph with many paths to the same node does exponential redundant work.",
      },
      {
        heading: "Repeatedly take from the FRONT",
        body: "First in, first out is the whole algorithm. It guarantees you process every node at distance d before any node at distance d+1, which is what makes the first arrival optimal.",
      },
      {
        heading: "Mark visited when you ENQUEUE, not when you dequeue",
        body: "This is the single most common BFS bug. If you mark on dequeue, a node with five neighbours can be pushed five times before it is ever processed. The answers stay correct and the queue grows enormously — on a dense graph this is the difference between linear and disastrous.",
      },
      {
        heading: "Track distance by layer, not by re-deriving it",
        body: "Either store `dist[neighbour] = dist[current] + 1` as you enqueue, or process the queue one whole level at a time by capturing its length before each round. Both work; the second also gives you the ring boundaries for free.",
      },
      {
        heading: "Seed several sources at once when the question allows",
        body: "'Distance to the nearest hospital' does not need one BFS per hospital. Push every hospital at distance 0 before the loop starts and run once — the rings then expand from all of them simultaneously and every cell gets its nearest.",
      },
    ],
    complexityDerivation:
      "Each node is enqueued at most once, because it is marked seen at the moment it enters the queue and is never enqueued again. So the queue handles V nodes in total, and each dequeue does constant work of its own. For each dequeued node, the algorithm looks at its neighbours — and summed over every node, that is exactly the total number of edge endpoints, which is 2E for an undirected graph and E for a directed one. Total: O(V + E). Both terms matter and neither dominates in general; a graph can have many nodes and few edges or the reverse. Space is O(V) for the seen set plus the queue, and the queue's peak size is the widest ring, which for a grid or a balanced tree is a substantial fraction of V. That last point is the practical difference from DFS: DFS holds a path, so its space is the graph's depth, while BFS holds a whole frontier. On a wide, shallow graph, DFS uses far less memory; on a deep, narrow one, BFS does.",
    variants: [
      {
        name: "Single-source BFS",
        when: "Shortest path or reachability from one starting point.",
        delta: "The base case. O(V + E), distances in one pass.",
      },
      {
        name: "Multi-source BFS",
        when: "'Nearest of any of these' — nearest exit, nearest hospital, rotting oranges.",
        delta:
          "Seed the queue with every source at distance 0. One pass instead of one pass per source, and the code is identical.",
      },
      {
        name: "0-1 BFS",
        when: "Every edge weighs exactly 0 or 1.",
        delta:
          "Use a deque: push 0-weight moves to the FRONT and 1-weight moves to the back. That keeps the queue in non-decreasing distance order without a heap, giving Dijkstra's answer at BFS cost.",
      },
      {
        name: "Bidirectional BFS",
        when: "Both ends are known and the graph branches heavily.",
        delta:
          "Search from both ends and stop when they meet. Roughly b^(d/2) + b^(d/2) instead of b^d, which for a social graph is the difference between feasible and not.",
      },
    ],
    tradeoffs: [
      {
        vs: "Dijkstra's algorithm",
        pick: "BFS whenever every edge has the same weight",
        because:
          "Dijkstra is BFS with a priority queue, and the priority queue only earns its log factor when weights differ. On an unweighted graph it computes exactly the same answer, slower, and using it there signals that you did not notice the graph was unweighted.",
      },
      {
        vs: "DFS",
        pick: "BFS for shortest paths and levels, DFS for structure",
        because:
          "Only BFS gives shortest paths on an unweighted graph. DFS is the right tool for cycle detection, topological order, connected components and anything needing the recursion's entry and exit times. They visit the same nodes and answer different questions.",
      },
      {
        vs: "A* search",
        pick: "A* when you have a good heuristic and one specific target",
        because:
          "BFS expands in all directions equally, which wastes work when you know roughly where the target is. A* steers the expansion using a distance estimate. Without an admissible heuristic it degrades to Dijkstra, so the heuristic is the whole value.",
      },
    ],
  },
  realWorld: [
    {
      system: "Social network degrees of separation",
      kind: "industry",
      problem:
        "'How are these two people connected?' over a graph where each hop multiplies the frontier by hundreds, making a one-directional search explode by the third hop.",
      applied:
        "Bidirectional BFS from both people, meeting in the middle. For an average degree of 200 and a distance of 4, one-directional touches about 1.6 billion nodes and bidirectional about 80,000.",
      impact: "b^d → 2·b^(d/2)",
    },
    {
      system: "Web crawlers",
      kind: "industry",
      problem:
        "Crawling breadth-first keeps the crawl close to the seed pages, which are usually the important ones, and avoids disappearing down a single deep site.",
      applied:
        "A frontier queue with a seen set keyed by normalised URL. The seen set is what stops the crawler revisiting pages forever, and it is exactly the BFS visited set.",
    },
    {
      system: "Kubernetes and container image layer resolution",
      kind: "industry",
      problem:
        "Resolving which layers and dependencies are reachable from a set of roots, without following the same shared dependency repeatedly.",
      applied:
        "BFS from all roots at once — a multi-source traversal — with a visited set. Seeding every root together answers 'what is reachable from anything' in one pass.",
    },
    {
      system: "traed — dependency and propagation analysis",
      kind: "yours",
      problem:
        "'Which strategies are affected if this instrument's data is late?' means finding everything reachable from a node in the dependency graph, and the shortest chain explaining why.",
      applied:
        "BFS from the affected instrument gives both the reachable set and the shortest explanation path, in one O(V + E) pass. The shortest path matters because it is the clearest explanation to show a human.",
    },
  ],
  lab: {
    prompt:
      "Given `n` nodes (ids 0 to n−1), an adjacency list, and a list of source nodes, return the distance from each node to its NEAREST source. Unreachable nodes get −1. Sources themselves are distance 0. This is multi-source BFS: seed every source before the loop rather than running one search per source. Budget: O(V + E).",
    fnName: "nearestSourceDistance",
    signature:
      "nearestSourceDistance(n: number, adj: number[][], sources: number[]): number[]",
    starter: `function nearestSourceDistance(n, adj, sources) {
  // Budget: O(V + E) — ONE traversal, not one per source.
  // Put every source in the queue at distance 0 before the loop starts.
  // Mark a node seen when you ENQUEUE it, not when you dequeue it.

  return [];
}`,
    tests: [
      {
        name: "single source on a path",
        input: [4, [[1], [0, 2], [1, 3], [2]], [0]],
        expected: [0, 1, 2, 3],
      },
      {
        // Two sources at opposite ends: node 2 is 1 from source 3, not 2
        // from source 0. Running one BFS per source and forgetting the
        // minimum gives 2 here.
        name: "two sources — nearest wins",
        input: [4, [[1], [0, 2], [1, 3], [2]], [0, 3]],
        expected: [0, 1, 1, 0],
      },
      {
        name: "unreachable node is -1",
        input: [3, [[1], [0], []], [0]],
        expected: [0, 1, -1],
      },
      {
        name: "every node is a source",
        input: [3, [[1], [0, 2], [1]], [0, 1, 2]],
        expected: [0, 0, 0],
      },
      {
        name: "no sources at all",
        input: [2, [[1], [0]], []],
        expected: [-1, -1],
      },
      {
        name: "isolated single node",
        input: [1, [[]], [0]],
        expected: [0],
        hidden: true,
      },
      {
        // A diamond: node 3 is reachable by two different 2-step routes.
        // Marking visited on DEQUEUE lets node 3 be enqueued twice.
        name: "diamond — two equal-length routes",
        input: [
          4,
          [
            [1, 2],
            [0, 3],
            [0, 3],
            [1, 2],
          ],
          [0],
        ],
        expected: [0, 1, 1, 2],
        hidden: true,
      },
      {
        name: "zero nodes",
        input: [0, [], []],
        expected: [],
        hidden: true,
      },
    ],
    hints: [
      "Start `dist` as an array of −1, which doubles as your 'not seen yet' marker — a node still holding −1 has never been enqueued.",
      "Before the loop, push every source and set its distance to 0. That single change is the whole difference between multi-source and single-source BFS.",
      "When you look at a neighbour, check `dist[neighbour] === -1`; if so, set it to `dist[current] + 1` and enqueue it. Setting the distance IS the visited mark, and doing it here rather than at dequeue is what keeps each node in the queue once.",
    ],
    solution: `function nearestSourceDistance(n, adj, sources) {
  const dist = new Array(n).fill(-1);
  const queue = [];

  // Seed EVERY source at distance 0 before the loop. The rings then
  // expand from all of them at once, so the first arrival at any node
  // is its distance to the nearest source.
  for (const s of sources) {
    if (dist[s] === -1) {
      dist[s] = 0;
      queue.push(s);
    }
  }

  // head index instead of shift(): shift() is O(n) and would make
  // this quadratic.
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of adj[u]) {
      if (dist[v] === -1) {      // setting the distance IS the visited mark
        dist[v] = dist[u] + 1;
        queue.push(v);           // marked BEFORE it is ever dequeued
      }
    }
  }

  return dist;
}`,
    complexityGate: {
      target: "O(n)",
      // A long path with sources at both ends: every node is visited and
      // the traversal cannot exit early.
      gen: "(n) => { const adj = Array.from({ length: n }, (_, i) => { const a = []; if (i > 0) a.push(i - 1); if (i < n - 1) a.push(i + 1); return a; }); return [n, adj, [0, n - 1]]; }",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "FIFO is what makes it shortest",
      d: "The queue guarantees nodes are dequeued in non-decreasing distance order, so the first time you touch a node is via a shortest path. Swap the queue for a stack and that property vanishes entirely.",
    },
    {
      t: "Mark visited on ENQUEUE, not on dequeue",
      d: "Marking at dequeue lets the same node be queued many times before it is processed, blowing up the queue on dense graphs. This is the single most common BFS bug.",
    },
    {
      t: "Multi-source BFS: seed the queue with all sources",
      d: '"Distance to the nearest hospital" over a grid is one BFS, not one per hospital. Push every source at distance 0 and run once.',
    },
    {
      t: "0-1 BFS uses a deque",
      d: "When edges weigh only 0 or 1, push 0-weight moves to the front and 1-weight moves to the back. You get Dijkstra's answer at BFS cost, with no heap.",
    },
    {
      t: "Never use shift() as a dequeue in a hot loop",
      d: "`Array.prototype.shift` is O(n) because it moves every remaining element. Keep a head index into the array, or use a real deque — otherwise your O(V+E) BFS is quietly O(V^2).",
    },
  ],
  pitfalls: [
    "Marking visited at dequeue. Correct answers, wildly inflated queue, and a quadratic blow-up on dense graphs.",
    "Using `shift()` or `pop(0)` for the queue. That single call turns a linear traversal into a quadratic one.",
    "Using BFS on a weighted graph. The first arrival is no longer the cheapest once edges have different costs — that needs Dijkstra.",
    "Forgetting that the queue's peak size is the widest ring. On a large grid that frontier can be a substantial fraction of all nodes.",
  ],
  quiz: [
    {
      q: "Why does BFS find shortest paths on an unweighted graph?",
      options: [
        "It explores every path and keeps the shortest",
        "The FIFO queue dequeues nodes in non-decreasing distance order, so the first arrival at a node is optimal",
        "It uses a priority queue",
        "It marks visited nodes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The queue processes every distance-d node before any distance-(d+1) node. That ordering is the entire proof.",
      distractors: [
        "It explores each node once, not every path — exploring every path would be exponential.",
        "",
        "That is Dijkstra. Plain BFS uses an ordinary queue, and needs nothing more when all edges cost the same.",
        "Visited marking prevents repeats and infinite loops. It says nothing about which arrival is shortest.",
      ],
    },
    {
      q: "You need the distance from every cell to the nearest of 50 exits. The best approach is:",
      options: [
        "50 separate BFS runs, taking the minimum",
        "One multi-source BFS with all 50 exits seeded at distance 0",
        "Dijkstra's from each exit",
        "Floyd-Warshall",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Seeding all the sources at once gives every cell its nearest-source distance in a single O(V+E) pass rather than 50 of them. The code is identical to single-source BFS apart from the seeding loop.",
      distractors: [
        "Correct and 50 times the work. This is the answer the multi-source trick exists to improve on.",
        "",
        "Dijkstra on an unweighted graph is BFS with an unnecessary log factor, and this runs it 50 times.",
        "All-pairs shortest paths is O(V^3) for a question that needs one traversal.",
      ],
    },
    {
      q: "When should a node be marked visited in BFS?",
      options: [
        "When it is dequeued",
        "When it is enqueued",
        "After all its neighbours are processed",
        "It does not matter",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Marking at enqueue prevents the same node being pushed by several different neighbours before it is ever processed.",
      distractors: [
        "This is the classic bug. A node with five neighbours can enter the queue five times, and on a dense graph the queue explodes.",
        "",
        "Far too late — by then every neighbour has had the chance to enqueue it again.",
        "It changes the queue size by an unbounded factor, which on a dense graph is the difference between linear and unusable.",
      ],
    },
    {
      q: "Edges weigh either 0 or 1. What is the right algorithm?",
      options: [
        "Plain BFS",
        "0-1 BFS with a deque — push 0-weight moves to the front, 1-weight to the back",
        "Dijkstra with a heap",
        "DFS",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Pushing zero-cost moves to the front keeps the deque in non-decreasing distance order without any priority queue, so you get Dijkstra's answer at BFS cost. Dijkstra is correct here too, and pays a log factor for weights that only take two values.",
      distractors: [
        "Plain BFS assumes every edge costs the same, so it would treat a free move as costing 1.",
        "",
        "Correct, and it pays O(log V) per operation to distinguish two possible weights.",
        "DFS gives no distance guarantee at all.",
      ],
    },
    {
      q: "Your BFS on a 1000×1000 grid is far slower than expected. The queue is a JavaScript array and you dequeue with `shift()`. What is wrong?",
      options: [
        "The grid is too large",
        "`shift()` is O(n) because it moves every remaining element, so the traversal is quadratic",
        "You should use recursion",
        "The visited set is too slow",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The algorithm is O(V + E) only if the dequeue is O(1). `shift()` shifts every remaining element down one position, so with a frontier of hundreds of thousands the cost per dequeue is enormous. Keep a head index into the array instead.",
      distractors: [
        "A million cells is entirely reasonable for BFS — about a million operations if the queue is right.",
        "",
        "Recursion gives depth-first order, which answers a different question, and would overflow the stack here.",
        "A boolean array or Set lookup is O(1). The dequeue is the problem.",
      ],
    },
    {
      q: "For finding a connection between two specific people in a social graph, why is bidirectional BFS so much better?",
      options: [
        "It uses less memory",
        "Searching d/2 levels from each end touches roughly 2·b^(d/2) nodes instead of b^d — for b=200 and d=4, about 80,000 instead of 1.6 billion",
        "It is easier to implement",
        "It finds a different path",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The frontier grows exponentially with depth, so halving the depth takes the square root of the work. It requires knowing both endpoints, which is exactly the case here.",
      distractors: [
        "It does use less, as a consequence of exploring far fewer nodes — but the reason is the exponent, not the memory.",
        "",
        "It is harder — two frontiers, an intersection test, and care over which side to expand next.",
        "It finds a shortest path, the same length as one-directional BFS would.",
      ],
    },
    {
      q: "BFS versus DFS on a wide, shallow graph. Which uses less memory?",
      options: [
        "BFS",
        "DFS — it holds one path, so O(depth), while BFS holds an entire frontier",
        "They are the same",
        "Depends on the edges",
      ],
      answer: 1,
      difficulty: "judge",
      why: "BFS's peak memory is the widest ring, which on a wide graph is most of the nodes. DFS's is the current path. On a deep narrow graph the comparison reverses, and DFS additionally risks a stack overflow.",
      distractors: [
        "BFS holds the frontier, which on a wide graph is the expensive thing.",
        "",
        "Both are O(V) in the worst case and differ enormously in practice depending on shape.",
        "Shape decides it, and the shape is what the question already told you.",
      ],
    },
    {
      q: "A colleague uses Dijkstra on an unweighted graph. What do you say?",
      options: [
        "Nothing — it gives the right answer",
        "It is correct but pays an unnecessary O(log V) per operation; BFS gives the same answer in O(V + E)",
        "Dijkstra is wrong here",
        "They should use DFS",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Dijkstra is BFS with a priority queue, and the priority queue only earns its keep when edge weights differ. With uniform weights the heap sorts values that are already in order. The point is not the speed so much as noticing the structure.",
      distractors: [
        "It works, and the reason to mention it is that the simpler algorithm is also the faster one.",
        "",
        "Dijkstra is perfectly correct with uniform weights — it is a special case, not a failure.",
        "DFS does not give shortest paths at all, so that would be a downgrade.",
      ],
    },
  ],
};

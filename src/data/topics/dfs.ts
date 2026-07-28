import type { Topic } from "../types.ts";

export const dfs: Topic = {
  id: "dfs",
  title: "DFS & cycle detection",
  tier: 2,
  week: 11,
  depth: "core",
  summary:
    "Connected components, and cycle detection in directed and undirected graphs.",
  why: "Cycle detection is the safety check behind dependency resolution, deadlock detection, import-loop errors, and any workflow you are about to execute. When a build tool says 'circular dependency detected', this is the algorithm that said it.",
  complexity: "O(V + E)",
  learn: {
    intuition:
      "Depth-first search follows one path as far as it goes, then backs up and tries the next branch — exactly how you would explore a maze by keeping one hand on the wall. It visits the same nodes as BFS and in a completely different order, which makes it good at different questions. BFS answers 'how far'; DFS answers 'what is the structure'. The reason DFS is the tool for cycle detection is that it always knows which nodes are on the path it is currently standing on. If it ever finds an edge pointing back to a node on that current path, it has found a loop — you can walk forward from here and end up where you already are. That distinction, between 'a node I have seen before' and 'a node I am standing on right now', is the whole of directed cycle detection, and it is the part people get wrong.",
    mechanics: [
      {
        heading: "Go deep, then back up",
        body: "Visit a node, mark it, then recurse into its first unvisited neighbour, and so on until you run out. Then return to the previous node and try its next neighbour. The recursion's own call stack is doing the bookkeeping.",
      },
      {
        heading: "For DIRECTED cycles, use three states, not a boolean",
        body: "White means unseen, grey means 'on the path I am currently exploring', black means 'fully finished'. An edge to a GREY node is a cycle. An edge to a black node is not — it is just a second route to a part of the graph you have already completed, which is perfectly legal in a dependency graph.",
      },
      {
        heading: "For UNDIRECTED cycles, skip the edge you arrived on",
        body: "Every undirected edge is stored in both directions, so from v you can always see u, the node you just came from. Without excluding it, every single edge looks like a cycle. Pass the parent down and ignore it — then any other visited neighbour is a genuine loop.",
      },
      {
        heading: "Connected components are repeated DFS runs",
        body: "Loop over all nodes; whenever you meet an unvisited one, start a fresh DFS from it and label everything it reaches. The number of times you start is the number of components.",
      },
      {
        heading: "Convert to an explicit stack when depth can be large",
        body: "Recursion depth equals the length of the longest path, so a chain of a million nodes overflows the stack. An explicit stack holding the same information cannot. In production, where graph shape comes from user data, this matters.",
      },
    ],
    complexityDerivation:
      "Each node is marked on first visit and never processed again, so the node work totals V. For each node the algorithm inspects its neighbour list, and summed over all nodes that is every edge endpoint — 2E undirected, E directed. Total O(V + E), identical to BFS, because both do the same amount of looking and differ only in the order. Space is where they part company. DFS holds the current PATH: its stack depth is the length of the longest root-to-node route, so on a wide shallow graph it uses very little and on a long chain it uses O(V) and risks a real stack overflow. BFS holds the current FRONTIER, so it is the reverse. One subtlety worth stating: the three-colour scheme costs nothing extra asymptotically — it is the same single pass, with two bits per node instead of one. It buys the ability to distinguish a back edge from a cross edge, which a boolean visited flag simply cannot express.",
    variants: [
      {
        name: "Recursive DFS",
        when: "Depth is bounded, and clarity matters.",
        delta:
          "Three lines. The call stack is the stack. Fails on long chains, which is not a rare shape.",
      },
      {
        name: "Iterative DFS with an explicit stack",
        when: "Production code, or any graph whose shape you do not control.",
        delta:
          "Cannot overflow. Slightly awkward for post-order, since you need to know whether you are descending or returning.",
      },
      {
        name: "Three-colour DFS",
        when: "Directed cycle detection, topological ordering.",
        delta:
          "Distinguishes 'on the current path' from 'already finished'. This is the difference between correctly rejecting a cycle and wrongly rejecting a diamond.",
      },
      {
        name: "Tarjan's strongly connected components",
        when: "You need the groups of nodes that can all reach each other.",
        delta:
          "One DFS pass with a low-link number per node. Finds every cycle group at once, which is what a dependency tool needs to report ALL the circular imports rather than the first.",
      },
    ],
    tradeoffs: [
      {
        vs: "BFS",
        pick: "DFS for structure, BFS for distance",
        because:
          "Only BFS gives shortest paths on an unweighted graph. Only DFS gives you the current path for free, which is what cycle detection, topological order and bridge-finding all need. They cost the same and answer different questions.",
      },
      {
        vs: "Union-Find for cycle detection",
        pick: "Union-Find for UNDIRECTED graphs built incrementally",
        because:
          "If edges arrive one at a time and you want to reject the one that closes a loop, union-find answers in near-constant time per edge without any traversal — this is exactly what Kruskal's algorithm does. Union-find cannot detect DIRECTED cycles at all, because it only models 'these are connected', not direction.",
      },
      {
        vs: "Kahn's algorithm",
        pick: "Kahn when you want the topological order and the cycle check together",
        because:
          "Kahn is iterative, so no stack risk, and the cycle detection falls out of it for free: if it stalls, whatever remains is in a cycle. DFS gives you the actual cycle path more easily, which is what you need to print a useful error message.",
      },
    ],
  },
  realWorld: [
    {
      system: "Module bundlers and import cycles",
      kind: "industry",
      problem:
        "Circular imports cause undefined values at runtime, in a way that depends on which module happens to load first — reliably confusing to debug.",
      applied:
        "Webpack, Rollup and TypeScript all run a directed DFS over the import graph with the grey/black distinction. Reporting the actual cycle path — A imports B imports C imports A — is why DFS is preferred over Kahn's here: the recursion stack IS the cycle.",
    },
    {
      system: "Database deadlock detection",
      kind: "industry",
      problem:
        "Transaction A holds a lock B wants while B holds a lock A wants. Both wait forever, and nothing times out fast enough to be acceptable.",
      applied:
        "The lock manager maintains a wait-for graph and runs cycle detection on it. A cycle means a deadlock, and the engine kills the cheapest transaction in the cycle. PostgreSQL and InnoDB both do this.",
      impact: "Indefinite hang → detected and resolved in milliseconds",
    },
    {
      system: "Terraform and infrastructure dependency graphs",
      kind: "industry",
      problem:
        "Resources depend on each other and must be created in a valid order. A cycle means no valid order exists and the plan cannot be executed at all.",
      applied:
        "The graph is validated for cycles before anything is applied. Catching it at plan time rather than half-way through creating live infrastructure is the entire point of the check.",
    },
    {
      system: "traed — strategy configuration validation",
      kind: "yours",
      problem:
        "Indicators referencing other indicators, and conditions referencing derived values, can form a loop that is not obvious from any single configuration file — and it would evaluate forever at runtime.",
      applied:
        "A three-colour DFS at configuration load, reporting the actual cycle path so the error names the specific chain rather than saying 'invalid config'. Validating at load time turns a runtime hang into a startup error.",
    },
  ],
  lab: {
    prompt:
      "Detect whether a DIRECTED graph contains a cycle. `adj[u]` lists the nodes u points to. Return `true` if any cycle exists. The trap: an edge to an already-visited node is NOT necessarily a cycle — a diamond (A→B, A→C, B→D, C→D) visits D twice and has no cycle at all. Only an edge back into the path you are currently on counts.",
    fnName: "hasCycle",
    signature: "hasCycle(n: number, adj: number[][]): boolean",
    starter: `function hasCycle(n, adj) {
  // A boolean "visited" flag is NOT enough. You need three states:
  //   0 = never seen
  //   1 = on the path I am currently exploring
  //   2 = fully finished, everything below it explored
  // An edge to a state-1 node is a cycle. An edge to a state-2 node is fine.

  return false;
}`,
    tests: [
      {
        name: "simple cycle",
        input: [3, [[1], [2], [0]]],
        expected: true,
      },
      {
        // A→B, A→C, B→D, C→D. D is reached twice and there is NO cycle.
        // A boolean visited flag reports true here.
        name: "diamond is NOT a cycle",
        input: [
          4,
          [[1, 2], [3], [3], []],
        ],
        expected: false,
      },
      {
        name: "straight line",
        input: [3, [[1], [2], []]],
        expected: false,
      },
      {
        name: "self-loop is a cycle",
        input: [1, [[0]]],
        expected: true,
      },
      {
        name: "no edges",
        input: [3, [[], [], []]],
        expected: false,
      },
      {
        // Two separate components, the cycle is in the second one — so the
        // search must be restarted from every unvisited node.
        name: "cycle in a disconnected second component",
        input: [
          5,
          [[1], [], [3], [4], [2]],
        ],
        expected: true,
        hidden: true,
      },
      {
        name: "two nodes pointing at each other",
        input: [2, [[1], [0]]],
        expected: true,
        hidden: true,
      },
      {
        name: "empty graph",
        input: [0, []],
        expected: false,
        hidden: true,
      },
    ],
    hints: [
      "Keep a `state` array of 0/1/2. Start a DFS from every node whose state is still 0 — the graph may be disconnected, and the cycle may be in a component you have not touched.",
      "On entering a node set its state to 1. After exploring all of its neighbours, set it to 2. That transition from 1 to 2 is what says 'I have left this path'.",
      "While exploring, if a neighbour's state is 1 you have found a cycle — you can reach a node you are currently standing on. If it is 2, ignore it: that part of the graph is finished and cannot lead back to you.",
    ],
    solution: `function hasCycle(n, adj) {
  // 0 = unseen, 1 = on the current path, 2 = finished
  const state = new Array(n).fill(0);

  function visit(u) {
    state[u] = 1;                    // now on the path
    for (const v of adj[u]) {
      if (state[v] === 1) return true;   // back into the current path: cycle
      if (state[v] === 0 && visit(v)) return true;
      // state[v] === 2 is deliberately ignored — finished, cannot loop back
    }
    state[u] = 2;                    // leaving the path
    return false;
  }

  // The graph may be disconnected, so try every component.
  for (let i = 0; i < n; i++) {
    if (state[i] === 0 && visit(i)) return true;
  }
  return false;
}`,
  },
  insights: [
    {
      t: "Directed cycles need three colours, not a visited flag",
      d: "White (unseen), grey (on the current path), black (finished). A cycle is an edge to a GREY node. An edge to black is just a re-visit — perfectly legal in a DAG, and a diamond is the everyday example.",
    },
    {
      t: "Undirected cycles need the parent check",
      d: "Every undirected edge looks like a back edge to its own parent. Ignore the edge you came in on, and then any other visited neighbour is a genuine cycle.",
    },
    {
      t: "Iterative DFS avoids stack overflow",
      d: "A million-node chain will overflow a recursive DFS. An explicit stack will not — and when the graph comes from user data, you do not control its shape.",
    },
    {
      t: "The recursion stack IS the cycle",
      d: "When DFS finds a grey neighbour, the nodes currently on the stack from that neighbour onward are exactly the cycle. That is why bundlers use DFS rather than Kahn's — it can print the actual import chain.",
    },
    {
      t: "Restart from every unvisited node",
      d: "One DFS only covers one component. A cycle sitting in a component you never entered is invisible, and disconnected graphs are the normal case.",
    },
  ],
  pitfalls: [
    "Using a boolean visited flag for directed cycle detection. A diamond reports a false cycle, and diamonds are everywhere in real dependency graphs.",
    "Forgetting to reset the state to 'finished' when leaving a node. Everything then looks like it is on the current path.",
    "Forgetting the parent check in an undirected graph. Every single edge reports a cycle.",
    "Only starting from node 0. Any cycle in another component goes undetected.",
  ],
  quiz: [
    {
      q: "In a DIRECTED graph, DFS finds an edge to an already-visited node. Is that a cycle?",
      options: [
        "Yes, always",
        "Only if that node is currently on the recursion stack (grey)",
        "No, never",
        "Only if the graph is connected",
      ],
      answer: 1,
      difficulty: "apply",
      why: "An edge to a finished (black) node is a cross or forward edge and is perfectly fine in a DAG. Only an edge back into the active path closes a cycle.",
      distractors: [
        "This is the boolean-visited bug. A diamond — two routes to the same node — visits it twice with no cycle anywhere.",
        "",
        "Sometimes it is exactly a cycle, which is what the grey state exists to identify.",
        "Connectivity is irrelevant. A cycle can sit inside any component.",
      ],
    },
    {
      q: "In an UNDIRECTED graph, what extra care does cycle detection need?",
      options: [
        "Three-colour marking",
        "Skip the edge back to the immediate parent, otherwise every edge looks like a cycle",
        "A priority queue",
        "Union-Find is mandatory",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Each undirected edge is stored in both directions, so the trivial u→v→u must be excluded explicitly.",
      distractors: [
        "Three colours are the DIRECTED technique. Undirected graphs have no notion of a cross edge, so a boolean plus the parent check is enough.",
        "",
        "No ordering by weight is involved anywhere in cycle detection.",
        "Union-find is an excellent alternative for undirected graphs, and DFS with the parent check works perfectly well.",
      ],
    },
    {
      q: "Graph A→B, A→C, B→D, C→D. Does it contain a cycle?",
      options: [
        "Yes — D is visited twice",
        "No — every edge points forward; D is reached by two routes but nothing leads back",
        "Only if it is undirected",
        "Cannot be determined",
      ],
      answer: 1,
      difficulty: "apply",
      why: "This is a diamond, the canonical shape that breaks boolean-visited cycle detection. Following any path forward you eventually stop at D; there is no way back to A.",
      distractors: [
        "Visiting twice is not the test. The test is whether an edge leads back into the path you are currently standing on.",
        "",
        "Treated as undirected it would contain a cycle — A-B-D-C-A. That is a genuinely different graph and a good thing to notice.",
        "It is fully determined by the edges given.",
      ],
    },
    {
      q: "Your directed cycle detector returns false for a graph you know has a cycle. What is the most likely cause?",
      options: [
        "The three-colour logic is wrong",
        "You only started the DFS from node 0, and the cycle is in a different component",
        "The graph is too large",
        "You need BFS",
      ],
      answer: 1,
      difficulty: "judge",
      why: "One DFS covers one component. Disconnected graphs are normal, so the outer loop over all nodes — starting a fresh search from each unvisited one — is not optional.",
      distractors: [
        "Possible, and it usually causes false POSITIVES (reporting cycles that do not exist) rather than false negatives.",
        "",
        "Size would cause a stack overflow, not a wrong answer.",
        "BFS can detect cycles too and is not the fix here — the issue is coverage, not traversal order.",
      ],
    },
    {
      q: "Why do bundlers use DFS rather than Kahn's algorithm to report circular imports?",
      options: [
        "DFS is faster",
        "The recursion stack at the moment of detection IS the cycle, so the error can name the exact import chain",
        "Kahn's cannot detect cycles",
        "DFS uses less memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Kahn's tells you that some set of nodes is in a cycle; DFS hands you the actual path. 'A imports B imports C imports A' is a usable error message, and 'these 40 modules are involved in a cycle' is not.",
      distractors: [
        "Both are O(V + E). Speed is not the differentiator.",
        "",
        "Kahn's detects cycles perfectly well — if it stalls, the remainder is cyclic. It just cannot easily say which cycle.",
        "DFS can use more, on a deep graph, and memory is not the reason either way.",
      ],
    },
    {
      q: "You need to reject edges that would close a loop as they arrive, in an UNDIRECTED graph. Best tool?",
      options: [
        "DFS from scratch after each edge",
        "Union-Find — near-constant time per edge, no traversal at all",
        "BFS",
        "Topological sort",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If the two endpoints are already in the same group, the new edge closes a cycle. That is one near-constant-time query per edge, and it is exactly how Kruskal's algorithm builds a spanning tree.",
      distractors: [
        "Correct and O(V + E) per edge, so O(E·(V+E)) overall — the incremental structure exists to avoid precisely this.",
        "",
        "Same objection: a full traversal per edge when a set-membership query would do.",
        "Topological sort is defined only for directed graphs.",
      ],
    },
    {
      q: "A recursive DFS crashes on a production graph but works on all test data. What differs?",
      options: [
        "The production graph has more edges",
        "It has a much longer PATH — recursion depth is the longest chain, not the node count",
        "There is a cycle",
        "The graph is disconnected",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Stack depth follows the longest path. A million nodes in a balanced shape is fine; ten thousand in a chain is not. Test data is usually small or randomly shaped, and real data frequently is not.",
      distractors: [
        "Edge count drives time, not stack depth. A dense shallow graph recurses very little.",
        "",
        "A correct detector handles cycles without recursing forever — the grey check stops it.",
        "Disconnection means more separate searches, each shallower rather than deeper.",
      ],
    },
    {
      q: "What does Tarjan's algorithm give you that plain cycle detection does not?",
      options: [
        "Faster detection",
        "Every group of mutually reachable nodes at once, so a tool can report ALL circular dependencies rather than the first one it hits",
        "Shortest paths",
        "A topological order",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Strongly connected components partition the graph into groups where everything can reach everything else. Each non-trivial group is a tangle of cycles. One DFS pass finds them all — which is what you want when reporting problems to a user who would rather not fix them one at a time.",
      distractors: [
        "Both are O(V + E). It gives more information for the same cost, not less cost.",
        "",
        "Unrelated — Tarjan's is about reachability groups, not distance.",
        "Condensing the components DOES yield a DAG you can topologically sort, which is a consequence rather than the point.",
      ],
    },
  ],
};

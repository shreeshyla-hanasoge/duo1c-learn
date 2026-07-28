import type { Topic } from "../types.ts";

export const bipartite: Topic = {
  id: "bipartite",
  title: "Bipartite check & matching",
  tier: 2,
  week: 12,
  depth: "core",
  summary: "2-colouring, and the assignment problem.",
  why: "Whenever two disjoint sets must be paired — drivers to rides, workers to shifts, students to seats — matching gives a globally optimal answer where greedy does not. The gap between 'first come, first served' and the optimum is real money in a marketplace.",
  complexity: "O(V+E) check · O(V^3) Hungarian",
  learn: {
    intuition:
      "A graph is bipartite when its nodes can be split into two groups such that every edge runs BETWEEN the groups and never inside one. That describes an enormous number of real situations: drivers and riders, students and courses, machines and jobs. Testing for it is simple — try to colour the graph with two colours so that no edge joins two nodes of the same colour. Walk the graph, colour each node the opposite of whoever you came from, and if you ever meet a neighbour already carrying the same colour as you, it is not bipartite. That failure happens exactly when there is a cycle of odd length, because alternating two colours around a loop only closes correctly if the loop has an even number of steps. The second half of the topic is what you do once you know the structure: pairing the two sides well. Here the natural greedy approach — take the best-looking pair, then the next — is genuinely not optimal, and knowing why is more valuable than knowing the algorithm that fixes it.",
    mechanics: [
      {
        heading: "Colour with BFS or DFS, alternating as you go",
        body: "Give the start node colour 0. Every neighbour gets colour 1, their neighbours get 0, and so on. Any traversal order works — this is not a shortest-path question, so BFS and DFS are equally valid.",
      },
      {
        heading: "A neighbour with YOUR colour means not bipartite",
        body: "An uncoloured neighbour gets the opposite colour and is enqueued. A neighbour already coloured the opposite is consistent — carry on. A neighbour with the same colour is a contradiction, and it means an odd cycle exists.",
      },
      {
        heading: "Restart from every uncoloured node",
        body: "A disconnected graph must be checked component by component. Each component can be coloured independently, and a graph is bipartite only if every component is.",
      },
      {
        heading: "Greedy matching leaves value on the table",
        body: "Pairing the highest-value option first can lock in a choice that blocks two better pairings. This is the crucial insight, and it is why marketplaces do batched assignment rather than instant first-come-first-served.",
      },
      {
        heading: "Augmenting paths fix greedy's mistakes",
        body: "Maximum matching works by finding a path that alternates between unmatched and matched edges, starting and ending unmatched. Flipping every edge along it increases the matching by one — which is how an earlier greedy pairing gets undone without starting over.",
      },
    ],
    complexityDerivation:
      "The bipartite check is one traversal with constant work per node and per edge, so O(V + E) — the same cost as any BFS or DFS, because that is precisely what it is, with a colour assignment attached. Why is 'no odd cycle' equivalent to 'two-colourable'? In one direction: if the graph is two-colourable, then walking any cycle alternates colours, so returning to the start requires an even number of steps. In the other: if every cycle is even, the colouring by distance-from-start parity is consistent, because any two routes to the same node must have lengths of the same parity — otherwise combining them would form an odd cycle. Matching is a different order of cost. The Hopcroft-Karp algorithm finds a maximum unweighted matching in O(E√V) by repeatedly finding sets of shortest augmenting paths. Maximum-WEIGHT matching, where each pairing has a value and you want the best total, is the assignment problem, solved by the Hungarian algorithm in O(V^3). For n = 20 that is 8,000 operations, which is nothing — so at small scale the optimal answer is essentially free, and settling for greedy is a choice rather than a necessity.",
    variants: [
      {
        name: "Two-colouring check",
        when: "Verifying the structure, or detecting an odd cycle.",
        delta:
          "One traversal, O(V + E). Also the standard way to answer 'does this conflict graph admit a two-shift schedule'.",
      },
      {
        name: "Maximum cardinality matching",
        when: "Pair as many as possible, all pairings equally good.",
        delta:
          "Hopcroft-Karp, O(E√V). Answers 'how many students can get a project they listed'.",
      },
      {
        name: "Maximum weight matching (assignment problem)",
        when: "Each pairing has a value and you want the best total.",
        delta:
          "The Hungarian algorithm, O(V^3). This is the one that beats greedy on real marketplace and scheduling data.",
      },
      {
        name: "Max-flow formulation",
        when: "One side can take several items, or there are capacities.",
        delta:
          "Add a source into one side and a sink out of the other, with capacities as edge limits. Matching becomes a flow problem, which covers most realistic scheduling constraints.",
      },
    ],
    tradeoffs: [
      {
        vs: "Greedy assignment",
        pick: "Greedy for instant response, matching for batched decisions",
        because:
          "Greedy is O(n log n), needs no global view, and can answer immediately — which matters when a rider is waiting. Matching needs everyone present at once and finds the true optimum. Real dispatch systems batch over a few seconds precisely to buy the better answer at an acceptable delay.",
      },
      {
        vs: "A general min-cost flow solver",
        pick: "Hungarian for a clean square assignment, flow for anything with capacities",
        because:
          "The Hungarian algorithm is specialised to one-to-one pairing and is simple to apply when the problem really is that shape. The moment one side can accept several items, or minimum quotas appear, flow expresses it directly and Hungarian does not.",
      },
      {
        vs: "Linear programming or a constraint solver",
        pick: "A solver once the constraints multiply",
        because:
          "Real scheduling accumulates rules — availability, skills, fairness, maximum consecutive shifts. Each one is awkward to bolt onto a matching algorithm and natural to state as a constraint. Hand-written matching is right for the clean core problem, not for the fifteenth business rule.",
      },
    ],
  },
  realWorld: [
    {
      system: "Ride-hailing dispatch (Ola, Uber)",
      kind: "industry",
      problem:
        "Assigning waiting drivers to waiting riders. Handing each request to its nearest driver as it arrives is greedy, and it strands drivers who would have been a better fit for a request arriving moments later.",
      applied:
        "Batch requests over a few seconds and solve a maximum-weight bipartite matching over the batch, weighting by pickup time and other factors. The short delay is bought deliberately, because the global optimum over a batch beats a sequence of locally optimal choices.",
      impact: "Measurably lower average pickup times than per-request greedy",
    },
    {
      system: "Medical residency matching (NRMP)",
      kind: "industry",
      problem:
        "Matching thousands of graduates to hospital places from both sides' ranked preferences, in a way neither side wants to circumvent.",
      applied:
        "The Gale-Shapley deferred-acceptance algorithm produces a stable matching — no pair would both prefer each other over their assigned partners. A different objective from maximum weight, and the same bipartite structure.",
      evidence: "Gale & Shapley, 1962; Nobel Prize in Economics, 2012",
    },
    {
      system: "Job scheduling on machines",
      kind: "industry",
      problem:
        "Jobs can only run on machines with the right capability, and each machine handles a limited number.",
      applied:
        "Capabilities give a bipartite graph; capacity limits turn it into a flow problem. Modelling it as flow rather than plain matching is what lets one machine take several jobs.",
    },
    {
      system: "traed — hedging positions against instruments",
      kind: "yours",
      problem:
        "Pairing positions with hedging instruments, where each pairing has a different effectiveness and greedy pairing by best-hedge-first can leave a later position with nothing suitable.",
      applied:
        "Score every feasible pairing, then solve the assignment problem over the batch instead of committing one at a time. The scale is small — tens of positions — so the O(n^3) optimum costs nothing.",
      impact: "Locally best pairings → globally best total hedge",
    },
  ],
  lab: {
    prompt:
      "Return `true` if the undirected graph is bipartite — that is, if its nodes can be split into two groups with every edge running between the groups. `adj[u]` lists u's neighbours. The graph may be disconnected, so every component must be checked. Budget: O(V + E).",
    fnName: "isBipartite",
    signature: "isBipartite(n: number, adj: number[][]): boolean",
    starter: `function isBipartite(n, adj) {
  // Colour each node 0 or 1, alternating as you traverse.
  // A neighbour already carrying YOUR colour means an odd cycle: not bipartite.
  // A neighbour with the opposite colour is fine — carry on.
  // The graph may be disconnected: start from every uncoloured node.

  return true;
}`,
    tests: [
      {
        name: "even cycle is bipartite",
        input: [
          4,
          [
            [1, 3],
            [0, 2],
            [1, 3],
            [0, 2],
          ],
        ],
        expected: true,
      },
      {
        // A triangle is the smallest odd cycle — the canonical failure.
        name: "triangle is not bipartite",
        input: [
          3,
          [
            [1, 2],
            [0, 2],
            [0, 1],
          ],
        ],
        expected: false,
      },
      {
        name: "no edges is trivially bipartite",
        input: [3, [[], [], []]],
        expected: true,
      },
      {
        name: "simple edge",
        input: [2, [[1], [0]]],
        expected: true,
      },
      {
        // Two components: the first is fine, the triangle in the second
        // is not. Starting only from node 0 misses it entirely.
        name: "odd cycle hiding in a second component",
        input: [
          5,
          [
            [1],
            [0],
            [3, 4],
            [2, 4],
            [2, 3],
          ],
        ],
        expected: false,
      },
      {
        name: "empty graph",
        input: [0, []],
        expected: true,
        hidden: true,
      },
      {
        name: "long even path",
        input: [
          4,
          [
            [1],
            [0, 2],
            [1, 3],
            [2],
          ],
        ],
        expected: true,
        hidden: true,
      },
      {
        name: "five-cycle is odd",
        input: [
          5,
          [
            [1, 4],
            [0, 2],
            [1, 3],
            [2, 4],
            [3, 0],
          ],
        ],
        expected: false,
        hidden: true,
      },
    ],
    hints: [
      "Keep a `colour` array filled with −1 meaning 'not yet coloured'. That doubles as your visited marker.",
      "Loop over every node; if it is still −1, start a BFS from it with colour 0. This is what covers disconnected components.",
      "For each neighbour: if uncoloured, give it the opposite colour (`1 - colour[u]`) and enqueue it. If it already carries the SAME colour as the current node, return false immediately.",
    ],
    solution: `function isBipartite(n, adj) {
  const colour = new Array(n).fill(-1);   // -1 = not yet coloured

  for (let start = 0; start < n; start++) {
    if (colour[start] !== -1) continue;   // already handled in a component

    colour[start] = 0;
    const queue = [start];

    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      for (const v of adj[u]) {
        if (colour[v] === -1) {
          colour[v] = 1 - colour[u];      // opposite side
          queue.push(v);
        } else if (colour[v] === colour[u]) {
          return false;                   // same side on both ends: odd cycle
        }
        // opposite colour: consistent, nothing to do
      }
    }
  }

  return true;
}`,
    complexityGate: {
      target: "O(n)",
      // A long even cycle: bipartite, so the check never exits early and
      // must colour every node.
      gen: "(n) => { const m = n % 2 === 0 ? n : n + 1; const adj = Array.from({ length: m }, (_, i) => [(i + 1) % m, (i - 1 + m) % m]); return [m, adj]; }",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Bipartite equals 2-colourable equals no odd cycle",
      d: "One traversal assigning alternating colours settles it. A conflict means an odd cycle exists, because alternating two colours only closes correctly around a loop of even length.",
    },
    {
      t: "Greedy assignment is not optimal",
      d: "First-come-first-served on bids or shifts leaves value on the table, because an early pairing can block two better ones. Maximum-weight bipartite matching finds the global optimum in O(V^3).",
    },
    {
      t: "Capacity constraints turn it into max-flow",
      d: "When one side can take several items, model it as a flow network with capacities. That generalisation covers most real scheduling problems, and plain matching does not.",
    },
    {
      t: "Restart from every uncoloured node",
      d: "A disconnected graph is bipartite only if every component is. Colouring from node 0 alone misses an odd cycle sitting anywhere else.",
    },
    {
      t: "Stable is not the same as optimal",
      d: "Gale-Shapley produces a matching no pair wants to defect from; Hungarian produces the highest total value. Different objectives — decide which one your problem actually wants.",
    },
  ],
  pitfalls: [
    "Only starting the colouring from node 0. Any odd cycle in another component goes undetected.",
    "Treating an already-coloured neighbour as a failure. Only the SAME colour is a contradiction; the opposite colour is exactly what you expect.",
    "Assuming greedy matching is close enough without measuring. On real marketplace data the gap is routinely large.",
    "Reaching for the Hungarian algorithm when one side has capacity for several items. That is a flow problem, and Hungarian cannot express it.",
  ],
  quiz: [
    {
      q: "A graph is bipartite if and only if:",
      options: [
        "It is a tree",
        "It contains no odd-length cycle",
        "It is connected",
        "Every node has even degree",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Alternating colours along a cycle works out only when the cycle length is even. An odd cycle forces two adjacent nodes to share a colour.",
      distractors: [
        "Every tree is bipartite, and plenty of bipartite graphs contain cycles — even ones.",
        "",
        "Connectivity is unrelated. A disconnected graph can be bipartite, and each component must be checked.",
        "That is the condition for an Eulerian circuit, which is a different property entirely.",
      ],
    },
    {
      q: "Assigning 20 providers to 20 projects to maximise total value is best solved by:",
      options: [
        "Greedy — highest-value pair first",
        "The Hungarian algorithm for maximum-weight bipartite matching",
        "Sorting by value and pairing in order",
        "A separate knapsack per provider",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Greedy can lock in an early pairing that blocks two better ones. Hungarian finds the global optimum in O(n^3), which at n = 20 is 8,000 operations — nothing.",
      distractors: [
        "The intuitive approach, and it is provably suboptimal. Taking the single best pair can cost you two good ones.",
        "",
        "The same greedy failure with extra steps.",
        "Knapsack optimises one actor's choices independently, which double-books projects.",
      ],
    },
    {
      q: "Your bipartite check returns true for a graph containing a triangle. Most likely cause?",
      options: [
        "The colouring logic is inverted",
        "You only started from node 0, and the triangle is in a different component",
        "Triangles are bipartite",
        "The graph is directed",
      ],
      answer: 1,
      difficulty: "judge",
      why: "One traversal covers one component. Any odd cycle elsewhere is never coloured and never checked, so the outer loop over all nodes is not optional.",
      distractors: [
        "Inverted colours would produce false negatives — reporting failures on valid graphs — rather than missing a real triangle.",
        "",
        "A triangle is the smallest odd cycle and the canonical non-bipartite graph.",
        "Bipartiteness is defined for undirected graphs; direction does not affect the colouring.",
      ],
    },
    {
      q: "During the colouring, you meet a neighbour that is already coloured the OPPOSITE colour. What does that mean?",
      options: [
        "Not bipartite",
        "Nothing is wrong — that is exactly the expected relationship across an edge",
        "You must recolour it",
        "There is a cycle",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Every edge is supposed to join two differently coloured nodes. Only the SAME colour is a contradiction. Treating any coloured neighbour as a failure is a common bug that rejects perfectly valid graphs.",
      distractors: [
        "This is the bug. The opposite colour is the whole point of the colouring.",
        "",
        "Recolouring would break the consistency already established elsewhere.",
        "There may well be a cycle, and an even one is entirely acceptable.",
      ],
    },
    {
      q: "Why do ride-hailing systems batch requests for a few seconds instead of dispatching instantly?",
      options: [
        "To reduce server load",
        "Because matching over a batch finds a globally better assignment than a sequence of individually greedy choices",
        "To let more drivers log in",
        "For fairness",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Assigning each request to its nearest driver as it arrives can strand a driver who was the only good option for a request arriving a moment later. A short delay is bought deliberately, because the batch optimum beats the greedy sequence.",
      distractors: [
        "Batching does reduce load slightly, and that is not why the delay is chosen.",
        "",
        "The pool barely changes in a few seconds. It is the joint optimisation that pays.",
        "A fairness effect exists, and the primary justification is the quality of the assignment.",
      ],
    },
    {
      q: "One machine can run THREE jobs, not one. Can you still use the Hungarian algorithm?",
      options: [
        "Yes, unchanged",
        "Not directly — it assumes one-to-one pairing. Model it as a flow problem with capacities, or duplicate the machine into three nodes",
        "No, the problem is unsolvable",
        "Only if all machines have capacity 3",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Hungarian solves the square, one-to-one assignment problem. Capacities need either a flow formulation, which expresses them directly, or the duplication trick, which works and scales badly when capacities are large.",
      distractors: [
        "It would assign at most one job per machine, silently under-using capacity.",
        "",
        "It is very solvable — just with a different formulation.",
        "Uniform capacity does not rescue it; the one-to-one assumption is the obstacle.",
      ],
    },
    {
      q: "Gale-Shapley produces a STABLE matching. How does that differ from a maximum-weight matching?",
      options: [
        "They are the same",
        "Stable means no pair would both rather have each other than their assigned partners; maximum weight means the highest total value. Different objectives, often different results",
        "Stable is always better",
        "Maximum weight is always stable",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Stability is about nobody wanting to defect, which matters when participants can act outside the system — which is exactly why residency matching uses it. Maximum weight optimises a total, and can produce a pairing two participants would happily circumvent.",
      distractors: [
        "They optimise genuinely different things and frequently disagree.",
        "",
        "Better depends on whether participants can defect. For a dispatch system nobody can, so total value is the right target.",
        "A maximum-weight matching can easily contain a pair who would both prefer each other.",
      ],
    },
    {
      q: "Bipartite checking uses BFS in most textbooks. Would DFS work?",
      options: [
        "No — only BFS gives correct colouring",
        "Yes — any traversal works, because colouring is about consistency across edges, not about distance",
        "Only for connected graphs",
        "Only if the graph is a tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Unlike shortest paths, nothing here depends on visiting in distance order. Every edge must join two differently coloured nodes, and any traversal that reaches every node checks every edge. Use DFS if you prefer — subject to the usual recursion-depth caution.",
      distractors: [
        "BFS is conventional and not required. This is a good test of whether you know WHY BFS is needed elsewhere.",
        "",
        "Both handle disconnection the same way, via the outer loop over all nodes.",
        "A tree is trivially bipartite, and the equivalence holds for any graph.",
      ],
    },
  ],
};

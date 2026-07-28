import type { Topic } from "../types.ts";

export const toposort: Topic = {
  id: "toposort",
  title: "Topological sort",
  tier: 2,
  week: 11,
  depth: "core",
  summary: "Kahn's algorithm and the DFS-based variant.",
  why: 'Deploy ordering, build systems, task pipelines, course prerequisites, migration ordering, spreadsheet recalculation — anything where "this must happen before that". It is also the algorithm that tells you no valid order exists, which is often the more useful answer.',
  complexity: "O(V + E)",
  viz: ["toposort"],
  learn: {
    intuition:
      "You have a list of tasks and a set of rules saying which must come before which. A topological sort produces an order that respects every rule. The insight that makes it easy is to stop thinking about the whole ordering and think about what can go FIRST: any task with no unmet prerequisites. Do it, remove it, and now some other tasks have no unmet prerequisites either. Repeat. That is Kahn's algorithm in full, and it comes with a free bonus — if you ever run out of ready tasks while tasks remain, those remaining ones must all be waiting on each other, which is a circular dependency. You get validation without a separate pass, and 'there is no valid order' is frequently the answer that actually matters.",
    mechanics: [
      {
        heading: "Count each node's unmet prerequisites",
        body: "The in-degree: how many edges point INTO this node. One pass over all the edges builds the counts. Everything with a count of zero is ready to go immediately.",
      },
      {
        heading: "Start the queue with every zero in-degree node",
        body: "All of them, not just one. There may be several independent starting points, and seeding them all is what lets the algorithm find any valid order rather than only one particular one.",
      },
      {
        heading: "Take one, output it, and decrement its dependants",
        body: "Removing a completed task means every task depending on it now has one fewer unmet prerequisite. When a count reaches exactly zero, that task becomes ready — push it. Check for exactly zero, not less than or equal, or you will push the same node several times.",
      },
      {
        heading: "A stall IS a cycle",
        body: "If the queue empties while nodes remain unplaced, every remaining node still has an unmet prerequisite. That is only possible if they depend on each other in a loop. Compare the output length against the node count — that single comparison is your cycle check.",
      },
      {
        heading: "The DFS variant is a reversed post-order",
        body: "Run DFS and push each node onto a list AFTER all of its descendants are finished, then reverse the list. It gives a valid order too, needs the three-colour scheme for cycle detection, and carries the usual recursion-depth risk.",
      },
    ],
    complexityDerivation:
      "Building the in-degree counts is one pass over the edges, O(E). Each node enters the queue at most once — it is pushed only at the exact moment its count reaches zero, and the count never rises again — so the queue handles V nodes. When a node is dequeued, the algorithm walks its outgoing edges to decrement dependants, and summed across all nodes that is every edge exactly once, so O(E) again. Total O(V + E), with O(V) space for the counts and the queue. Worth noticing: the cycle detection costs nothing at all. It is a comparison of two integers at the end, which is a rare case of a correctness check that is genuinely free — contrast that with running a separate DFS to look for cycles, which would double the work for information you already have. Also worth knowing: the ordering is generally NOT unique. Any node with in-degree zero may legitimately go next, so the number of valid orders can be enormous. If you need a reproducible one, replace the queue with a priority queue keyed on something stable, which costs a log factor.",
    variants: [
      {
        name: "Kahn's algorithm",
        when: "The default. Iterative, no stack risk, free cycle detection.",
        delta:
          "In-degree counting plus a queue. Easiest to reason about and the natural fit when you want to know whether an order exists at all.",
      },
      {
        name: "DFS post-order reversal",
        when: "You already have a DFS, or you want the cycle PATH for an error message.",
        delta:
          "Push after finishing descendants, then reverse. Recursion depth risk, and the three-colour scheme is needed to detect cycles.",
      },
      {
        name: "Lexicographically smallest order",
        when: "Deterministic output matters — reproducible builds, stable test fixtures.",
        delta:
          "Swap the queue for a min-heap. O((V + E) log V). Without it, two runs on the same input can legitimately produce different valid orders.",
      },
      {
        name: "Level-by-level (parallel schedule)",
        when: "Tasks can run concurrently and you want the fewest rounds.",
        delta:
          "Process the entire zero in-degree set as one batch. The number of batches is the longest chain, which is the theoretical minimum wall-clock time given unlimited workers.",
      },
    ],
    tradeoffs: [
      {
        vs: "DFS-based topological sort",
        pick: "Kahn for validation and scheduling, DFS for diagnostics",
        because:
          "Kahn is iterative so it cannot overflow, and it naturally yields the parallel batching. DFS gives you the actual cycle path from the recursion stack, which is what makes a good error message. Different strengths, same complexity.",
      },
      {
        vs: "Sorting by some priority field",
        pick: "Topological sort — priorities do not encode dependencies",
        because:
          "People frequently try to express 'must run after' as a numeric priority. It works until two tasks need the same number, or a new dependency is added that contradicts the assigned values. The graph states the constraint directly and can be checked.",
      },
      {
        vs: "Just trying an order and retrying on failure",
        pick: "Compute the order up front",
        because:
          "Retry loops turn a deterministic O(V + E) computation into something that can loop forever on a cyclic graph, and they perform half the work before discovering the problem. Validate first, especially when the work has side effects — a half-applied migration is much worse than a rejected plan.",
      },
    ],
  },
  realWorld: [
    {
      system: "Build systems (Make, Bazel, Gradle)",
      kind: "industry",
      problem:
        "Thousands of targets with dependencies between them, and a need to both order them correctly and run independent ones in parallel.",
      applied:
        "Topological sort of the target graph. The zero in-degree SET at each step is precisely the set of targets that can be built concurrently, so the batching version gives the parallel schedule directly. A cycle is reported as an error before any work starts.",
      impact: "Correct order plus maximum parallelism from one traversal",
    },
    {
      system: "Database migrations and schema changes",
      kind: "industry",
      problem:
        "Migrations depend on earlier ones, and applying them out of order corrupts the schema in ways that are painful to unwind.",
      applied:
        "Dependencies form a DAG which is topologically sorted before anything runs. Detecting a cycle at plan time rather than half-way through applying is the entire value — the failure is refused rather than half-executed.",
    },
    {
      system: "Spreadsheet recalculation",
      kind: "industry",
      problem:
        "A cell's formula depends on other cells. Recalculating in the wrong order shows stale values; a circular reference must be reported rather than looped over.",
      applied:
        "The dependency graph is topologically sorted and recalculated in that order. The 'circular reference' warning every spreadsheet shows is the stall condition of exactly this algorithm.",
    },
    {
      system: "traed — indicator evaluation order",
      kind: "yours",
      problem:
        "Indicators built on other indicators must be computed in dependency order per tick, and a configuration that accidentally creates a loop would otherwise hang the evaluation.",
      applied:
        "Sort the indicator graph once at configuration load, cache the order, and reuse it for every tick. Validating at load turns a runtime hang into a startup error, and the per-tick cost drops to zero because the order does not change.",
      impact: "Per-tick dependency resolution → one sort at load",
    },
  ],
  lab: {
    prompt:
      "Return a valid topological order of `n` nodes given `adj`, where `adj[u]` lists the nodes that depend on u (so u must come first). If no valid order exists — that is, the graph has a cycle — return `null`. Use Kahn's algorithm, and break ties by choosing the SMALLEST available node id so the answer is deterministic and testable.",
    fnName: "topoOrder",
    signature: "topoOrder(n: number, adj: number[][]): number[] | null",
    starter: `function topoOrder(n, adj) {
  // Kahn's: count in-degrees, start with every zero, remove and decrement.
  // Tie-break on the SMALLEST id so the result is deterministic — take
  // the minimum from the ready set each round rather than any element.
  // If you place fewer than n nodes, what remains is a cycle: return null.

  return null;
}`,
    tests: [
      {
        name: "simple chain",
        input: [3, [[1], [2], []]],
        expected: [0, 1, 2],
      },
      {
        // 0 and 1 are both ready at the start; smallest first.
        name: "tie broken by smallest id",
        input: [3, [[2], [2], []]],
        expected: [0, 1, 2],
      },
      {
        name: "cycle returns null",
        input: [3, [[1], [2], [0]]],
        expected: null,
      },
      {
        name: "no edges — all ready, ascending",
        input: [3, [[], [], []]],
        expected: [0, 1, 2],
      },
      {
        // 2 must precede 0 and 1, so it goes first despite the larger id.
        name: "dependency beats id order",
        input: [3, [[], [], [0, 1]]],
        expected: [2, 0, 1],
      },
      {
        name: "self-loop is a cycle",
        input: [1, [[0]]],
        expected: null,
        hidden: true,
      },
      {
        name: "empty graph",
        input: [0, []],
        expected: [],
        hidden: true,
      },
      {
        name: "cycle in a disconnected component",
        input: [4, [[1], [], [3], [2]]],
        expected: null,
        hidden: true,
      },
    ],
    hints: [
      "Build the in-degree array first: for every u and every v in `adj[u]`, increment `indeg[v]`. Then collect every node with in-degree 0 as the initial ready set.",
      "Each round, take the SMALLEST id from the ready set, append it to the output, and decrement the in-degree of each of its dependants. Push a dependant only when its count hits exactly 0.",
      "At the end, if the output has fewer than n entries, the rest are stuck in a cycle — return null. That length comparison is the whole cycle check.",
    ],
    solution: `function topoOrder(n, adj) {
  const indeg = new Array(n).fill(0);
  for (let u = 0; u < n; u++) {
    for (const v of adj[u]) indeg[v]++;
  }

  // Everything with nothing left to wait for.
  const ready = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);

  const out = [];
  while (ready.length > 0) {
    // Smallest id, so the answer is deterministic. A plain queue would
    // also be a valid topological order, just not a reproducible one.
    let pick = 0;
    for (let i = 1; i < ready.length; i++) {
      if (ready[i] < ready[pick]) pick = i;
    }
    const u = ready.splice(pick, 1)[0];
    out.push(u);

    for (const v of adj[u]) {
      // Exactly zero, not <= 0: otherwise a node with several
      // prerequisites gets pushed more than once.
      if (--indeg[v] === 0) ready.push(v);
    }
  }

  // Anything left never became ready, so it is waiting on a loop.
  return out.length === n ? out : null;
}`,
  },
  insights: [
    {
      t: "The stall IS the cycle detection",
      d: "If Kahn's queue empties before every node is placed, the remainder contains a cycle. You get validation for free — no separate pass, just a comparison of two integers.",
    },
    {
      t: "Kahn is iterative; DFS-based is a post-order reversal",
      d: "Kahn repeatedly removes in-degree-0 nodes. The DFS version pushes each node after its descendants finish, then reverses. Both O(V+E); Kahn is easier to reason about, cannot overflow, and parallelises naturally.",
    },
    {
      t: "The order is generally not unique",
      d: "Any node with in-degree 0 may go next. If you need determinism — reproducible builds, stable tests — break ties with a priority queue on a stable key.",
    },
    {
      t: "Longest path on a DAG is the critical path",
      d: "Process nodes in topological order and relax forward. That gives the true earliest finish time and the slack of every other task, which is what project scheduling actually needs.",
    },
    {
      t: "The zero in-degree SET is the parallel batch",
      d: "Everything ready at the same moment can run concurrently. The number of batches is the longest dependency chain, which is the best wall-clock time any scheduler could achieve.",
    },
  ],
  pitfalls: [
    "Decrementing with `if (indeg[v] <= 0)` instead of `=== 0`. A node with three prerequisites gets pushed three times.",
    "Seeding the queue with only one zero in-degree node. Independent starting points are then never explored.",
    "Forgetting the final length check. A cyclic graph silently returns a partial order that looks plausible.",
    "Confusing edge direction. `adj[u]` meaning 'u depends on these' versus 'these depend on u' inverts the entire result, and both conventions are common.",
  ],
  quiz: [
    {
      q: "Kahn's algorithm terminates with 3 of 10 nodes unplaced. This means:",
      options: [
        "The graph is disconnected",
        "Those 3 nodes are part of a cycle",
        "The algorithm has a bug",
        "The graph has multiple valid orderings",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Every remaining node still has an unmet prerequisite, which is only possible if they depend on each other in a loop. Disconnected components sort perfectly well.",
      distractors: [
        "Disconnected components each have their own zero in-degree nodes and are placed without trouble.",
        "",
        "This is the algorithm working correctly — reporting that no valid order exists.",
        "Multiple orderings are normal and do not stop the algorithm placing all the nodes.",
      ],
    },
    {
      q: "To find a project's true completion date from a milestone dependency graph:",
      options: [
        "Sum all task durations",
        "Compute the longest path through the DAG in topological order",
        "Take the maximum single task duration",
        "Run Dijkstra's",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The critical path is the longest chain of dependent work. Everything off it has slack; only its tasks move the delivery date.",
      distractors: [
        "That assumes nothing runs in parallel, which is the whole point of having a dependency graph rather than a list.",
        "",
        "One long task is only the answer if nothing must precede it.",
        "Dijkstra finds shortest paths. On a DAG you want the longest, which is a different relaxation and does not work with a greedy shortest-path algorithm on general graphs.",
      ],
    },
    {
      q: "You push a dependant whenever `--indeg[v] <= 0`. What breaks?",
      options: [
        "Nothing",
        "A node with several prerequisites is pushed once per prerequisite, so it appears in the output more than once",
        "It never terminates",
        "Cycles go undetected",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The count keeps dropping below zero, and every subsequent decrement satisfies `<= 0` again. Test for exactly zero — the moment of transition — not for a range.",
      distractors: [
        "The output length exceeds n and contains duplicates, which then also breaks the cycle check.",
        "",
        "It terminates. It just terminates with a wrong answer.",
        "The length check would actually fire, but for the wrong reason — you would report a cycle where there is none.",
      ],
    },
    {
      q: "Two runs of your build tool produce different but valid task orders. Why, and how would you fix it?",
      options: [
        "It is a bug in the sort",
        "Topological order is not unique — use a min-heap instead of a queue to get the lexicographically smallest order",
        "The dependency graph changed",
        "Add more dependencies",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Any zero in-degree node is a legal next choice, so the queue's arbitrary ordering shows through. A min-heap keyed on a stable id makes the output reproducible at the cost of a log factor — which matters for reproducible builds and stable test fixtures.",
      distractors: [
        "Both orders are correct. Non-uniqueness is a property of the problem, not a defect.",
        "",
        "Possible, and not necessary to explain it — the same graph legitimately admits many orders.",
        "Over-constraining the graph to force an order removes parallelism and encodes an accident as a rule.",
      ],
    },
    {
      q: "You want the FEWEST rounds to run all tasks with unlimited parallel workers. What do you compute?",
      options: [
        "The topological order, run one at a time",
        "The number of batches when you take the whole zero in-degree SET each round — which equals the longest dependency chain",
        "The total number of tasks",
        "The number of edges",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Everything ready at the same moment can run together. The number of rounds is the length of the longest chain, and no scheduler can beat that however many workers it has, because those tasks genuinely must happen in sequence.",
      distractors: [
        "That gives a correct order and the worst possible wall-clock time.",
        "",
        "That is the total work, not the critical path length.",
        "Edge count says nothing about depth. A star has many edges and a depth of one.",
      ],
    },
    {
      q: "Kahn's or DFS-based, when you must show the user WHICH modules form a circular import?",
      options: [
        "Kahn's — it detects the cycle",
        "DFS — when it hits a grey node the recursion stack holds the actual cycle path",
        "Either, they give the same output",
        "Neither can",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Kahn's tells you a set of nodes never became ready. DFS hands you the specific chain A→B→C→A. For an error message a human has to act on, naming the chain is the difference between useful and not.",
      distractors: [
        "It detects that one exists and does not isolate which cycle, only that the leftovers are involved in some loop.",
        "",
        "They differ precisely in the diagnostic information they leave behind.",
        "DFS does it easily, which is why bundlers use it.",
      ],
    },
    {
      q: "A colleague encodes 'must run after' as an integer priority field and sorts by it. What is the risk?",
      options: [
        "Sorting is slower",
        "Priorities cannot express the constraint — two independent tasks need the same number, and a newly added dependency can contradict values already assigned",
        "Integers overflow",
        "It uses more memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A total order is being used to encode a partial order. It works until it does not, and the failure is silent — the tasks run in an order that satisfies the numbers and violates a real dependency. The graph states the constraint directly and can be validated.",
      distractors: [
        "Sorting is a log factor slower and that is not the objection.",
        "",
        "Overflow is a distant concern next to the model being wrong.",
        "It uses less memory, which is part of why the approach is tempting.",
      ],
    },
    {
      q: "What is the cost of the cycle detection in Kahn's algorithm?",
      options: [
        "O(V + E) — a separate DFS",
        "Free — it is a comparison of the output length against the node count",
        "O(V log V)",
        "It cannot detect cycles",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The information is already there by the time the loop ends. Comparing two integers is a rare case of a correctness check that genuinely costs nothing — running a separate DFS would double the work for something you already know.",
      distractors: [
        "That is the cost of detecting cycles separately, which this algorithm makes unnecessary.",
        "",
        "No sorting or heap is involved in the plain version.",
        "It detects them reliably. That is one of its main advantages.",
      ],
    },
  ],
};

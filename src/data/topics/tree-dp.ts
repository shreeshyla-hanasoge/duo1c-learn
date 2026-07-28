import type { Topic } from "../types.ts";

export const treeDp: Topic = {
  id: "tree-dp",
  title: "DP on trees & DAGs",
  tier: 3,
  week: 17,
  depth: "deep",
  summary: "Post-order accumulation, and DAG shortest/longest path.",
  why: "Critical paths, subtree aggregates, and dependency cost roll-ups — the practical face of DP on graphs.",
  complexity: "O(V + E)",
  learn: {
    intuition:
      "Every dynamic programming problem so far needed you to find an order in which the sub-problems resolve. On a line that order was left to right; on a grid it was row by row; in interval DP you had to think about it. On a tree the order is already sitting there, drawn in the structure: a node's answer depends on its children, and children are strictly smaller sub-problems because a tree has no cycles. So the recursion *is* the iteration order — you do not choose it, you inherit it. Compute the children, combine, return. What makes tree DP feel harder than it is, is that many tree problems need two different numbers at once. Take the longest path in a tree: at each node you want to *return* to your parent the deepest single downward reach, because that is the only thing the parent can extend. But the best answer might be a path that goes down one child, through this node, and back down another child — and that path is invisible to the parent, because it cannot be extended upward at all. So you return one thing and record another. Once you have seen that pattern — return the extendable value, accumulate the complete one into a running best — a large family of tree problems stops being individually difficult.",
    mechanics: [
      {
        heading: "Post-order: children first, always",
        body: "A node's value is a function of its children's values, so every child must be finished before the parent is computed. That is the definition of post-order traversal, and in a recursive solution you get it for free by recursing before you combine. There is nothing to sort and no queue to maintain — this is the cheapest dependency order in all of dynamic programming.",
      },
      {
        heading: "Return one value, accumulate another",
        body: "Tree diameter is the model: the function *returns* the height of the subtree, because that is what a parent can build on, while separately updating a global best with `leftHeight + rightHeight`, the path that turns around at this node. Those two numbers answer different questions — 'what can you extend' and 'what is complete here' — and conflating them is the single most common tree DP bug. Ask yourself which one the parent actually needs before writing the return statement.",
      },
      {
        heading: "On an undirected tree, track where you came from",
        body: "A tree given as an edge list has no direction, so every edge appears in both nodes' adjacency lists and a naive recursion walks straight back to its parent forever. Pass the parent down and skip it — `if (v === parent) continue`. A visited set also works and is what you need on a general graph, but on a tree the parent check is one comparison and no allocation.",
      },
      {
        heading: "DAGs need a topological order, because there is no natural post-order",
        body: "A directed acyclic graph has no root and a node can have many parents, so recursion has no obvious starting point. Sort topologically first, then relax forward: process nodes in that order and, for each, push its value to its successors. Longest path — the critical path — is exactly this, and it is O(V + E) because each edge is relaxed once. On a general graph with cycles, longest path is NP-hard; acyclicity is the entire difference.",
      },
      {
        heading: "Rerooting, when every node needs the answer",
        body: "'What is the answer for the whole tree' is one post-order pass. 'What is the answer if each node in turn were the root' looks like n passes and O(n²). It is not: do one pass upward to collect each subtree's contribution, then a second pass downward carrying what the rest of the tree contributes from above. Two traversals, O(n) total. The awkward detail is that a node's downward value must exclude the child it is being sent to, which is usually handled by keeping the best two child values rather than just the best.",
      },
    ],
    complexityDerivation:
      "Each node is visited once and each edge is traversed a constant number of times — twice in an undirected tree, once in each direction — so the total is O(V + E), and for a tree with V−1 edges that is simply O(V). Per-node work is the only thing that can spoil it: combining c children costs O(c) if you take a maximum, and the sum of all children counts over the whole tree is exactly the edge count, so a per-child loop is free. Sorting each node's children, on the other hand, makes it O(V log V) at best and, on a star-shaped tree with one node holding every edge, O(V log V) concentrated in a single call — worth noticing before you reach for a sort inside a traversal. Space is where the interesting caveat lives. The table is O(V), but recursion adds the tree's height to the call stack, and height is O(log V) only for a balanced tree. A degenerate tree — a linked list, which is exactly what you get from sorted insertions or from a dependency chain — has height V, and at fifty thousand nodes a recursive traversal overflows. The fix is an explicit stack, which turns the recursion into a loop while keeping the same post-order, and it is the reason production tree walks over untrusted shapes are usually written iteratively.",
    variants: [
      {
        name: "Subtree aggregation",
        when: "Sizes, sums, counts — anything that rolls up.",
        delta:
          "One post-order pass, `value[node] = own + sum(children)`. This is `du`, and it is the simplest member of the family.",
      },
      {
        name: "Two-channel (diameter, maximum path sum)",
        when: "The best answer may turn around at a node instead of continuing upward.",
        delta:
          "Return the extendable value, accumulate the complete one into a running best. The pattern behind most 'hard' tree problems.",
      },
      {
        name: "DAG longest path / critical path",
        when: "Dependencies form a DAG, not a tree.",
        delta:
          "Topological sort, then relax forward. O(V + E), and NP-hard the moment a cycle exists.",
      },
      {
        name: "Rerooting",
        when: "Every node needs the answer as if it were the root.",
        delta:
          "Two passes instead of n: one up to gather subtree contributions, one down carrying the rest of the tree. O(n) rather than O(n²).",
      },
    ],
    tradeoffs: [
      {
        vs: "Recursion versus an explicit stack",
        pick: "The explicit stack whenever the tree's shape is not yours to control",
        because:
          "Recursion is shorter, matches the recurrence line for line, and is what you should write in an interview. It also dies at a depth of roughly ten thousand frames, and a degenerate tree has depth n — which is not an exotic case, it is what a dependency chain or a sorted insertion sequence produces. If the tree comes from user data or from a file, convert to a stack. If you control the shape and know it is balanced, do not bother.",
      },
      {
        vs: "Two BFS passes for the diameter",
        pick: "Either, and know why the BFS trick works",
        because:
          "The classic shortcut — BFS from any node to find the farthest node u, then BFS from u — gives the diameter in two linear passes and is easier to get right. But it is valid only on unweighted trees, or on trees with non-negative weights, and it fails on general graphs. The DP version handles weights, extends to 'maximum path sum' where node values may be negative, and generalises. Reach for BFS on a plain unweighted tree and the DP when anything is weighted.",
      },
      {
        vs: "Recomputing per node instead of rerooting",
        pick: "Rerooting, once n is past a few thousand",
        because:
          "Running the whole traversal from each node in turn is O(n²) and is genuinely fine at n = 500 — it is obvious, and obviously correct. Rerooting is O(n) and needs the best-two-children bookkeeping that is easy to get subtly wrong. The judgement is about n and about how much the correctness risk costs you: for a one-off analysis script, take the quadratic and the confidence.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — the indicator dependency graph",
      kind: "yours",
      problem:
        "Indicators are built from other indicators. MACD needs two exponential moving averages; Bollinger bands need a simple moving average and a standard deviation over the same window. Computing them in the wrong order recomputes shared inputs, and computing them in an arbitrary order can read a value that has not been produced yet.",
      applied:
        "The indicators form a DAG. Topologically sort it once, evaluate forward, and every input is ready when it is read. The longest chain through that DAG is the critical path — it bounds how quickly a bar can be fully processed no matter how much work is parallelised, and it is the number to look at before adding cores.",
      evidence: "strategy-engine/list_all_indicators.py",
      impact:
        "Shared sub-indicators computed once, and a stated lower bound on per-bar latency",
    },
    {
      system: "Build systems — the critical path",
      kind: "industry",
      problem:
        "A build has thousands of targets and a large machine. Adding cores stops helping at some point, and teams often discover this by buying the cores first.",
      applied:
        "Targets and their dependencies form a DAG, and the longest weighted chain is the shortest possible wall-clock build even with infinite parallelism. Computing it is one relaxation pass in topological order. It tells you whether to buy machines or to break up the one module that everything waits on.",
      impact:
        "Turns 'the build is slow' into 'these eleven targets in sequence are the floor'",
    },
    {
      system: "Disk usage (`du`) and storage quotas",
      kind: "industry",
      problem:
        "Reporting how much space each directory occupies, including everything beneath it, without walking the tree once per directory.",
      applied:
        "Pure post-order accumulation: a directory's total is its own files plus the totals of its children, and one traversal produces the answer for every directory at once. Doing it per directory instead is the O(n²) mistake that makes a quota report take hours on a large volume.",
      impact: "One pass for every directory's total, rather than one pass per directory",
    },
    {
      system: "Query plan cost estimation",
      kind: "industry",
      problem:
        "A plan is a tree of operators — scans at the leaves, joins and aggregates above — and the planner needs an estimated cost and row count for the whole thing before running any of it.",
      applied:
        "Post-order over the operator tree: each node's estimated rows and cost are functions of its children's. It is the same accumulation as `du` with a more interesting combine step, and the fact that errors multiply upward is exactly why a bad row estimate at a leaf produces a catastrophically wrong plan at the root.",
      impact:
        "One traversal costs the whole plan, and explains why leaf-level statistics matter so much",
    },
  ],
  lab: {
    prompt:
      "Given `n` nodes numbered 0..n−1 and `edges` forming a tree (undirected, connected, no cycles), return the DIAMETER — the number of edges on the longest path between any two nodes. Return 0 for a tree with fewer than two nodes. Budget: O(n). Running a search from every node is correct and quadratic, and will fail the gate.",
    fnName: "treeDiameter",
    signature: "treeDiameter(n: number, edges: number[][]): number",
    starter: `function treeDiameter(n, edges) {
// Your budget: O(n) time.
// Build an adjacency list first — edges are undirected, so each edge
// belongs to both endpoints.
// At each node you need TWO different numbers: the deepest reach you
// can hand to your parent, and the best path that turns around here.

return 0;
}`,
    tests: [
      {
        // 0-1-2-3 in a line: the whole path is the diameter.
        name: "a straight path",
        input: [4, [[0, 1], [1, 2], [2, 3]]],
        expected: 3,
      },
      {
        // Star: any leaf to any other leaf is 2 edges via the centre.
        name: "star",
        input: [4, [[0, 1], [0, 2], [0, 3]]],
        expected: 2,
      },
      {
        // 3-1-0-2. The path turns around at node 1 and again at 0.
        name: "turns around in the middle",
        input: [5, [[0, 1], [0, 2], [1, 3], [1, 4]]],
        expected: 3,
      },
      {
        // THE test. Node 0 has one child, so any path through the root is
        // at most 3 edges — but 3-2-1-4-5 is 4, turning around at node 1.
        // A solution that only measures depth from the root returns 3.
        name: "the diameter does not pass through the root",
        input: [6, [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]]],
        expected: 4,
      },
      {
        name: "balanced binary tree of 7",
        input: [7, [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]],
        expected: 4,
      },
      { name: "one edge", input: [2, [[0, 1]]], expected: 1, hidden: true },
      { name: "single node", input: [1, []], expected: 0, hidden: true },
      { name: "no nodes", input: [0, []], expected: 0, hidden: true },
    ],
    hints: [
      "Build an adjacency list: `adj[a].push(b)` and `adj[b].push(a)` for every edge. Because edges are undirected, your traversal must remember which neighbour it arrived from or it will bounce back and forth forever.",
      "Write a function that returns the HEIGHT of a subtree — the number of edges down to its deepest descendant. A leaf has height 0, and a node's height is 1 plus the largest child height.",
      "While computing a node's height, also look at its two largest child heights. Their sum plus 2 is the length of the path that goes down one child, through this node, and down the other — a path the parent can never extend. Keep the best such value in a variable outside the recursion.",
    ],
    solution: `function treeDiameter(n, edges) {
if (n < 2) return 0;

const adj = Array.from({ length: n }, () => []);
for (const [a, b] of edges) {
  adj[a].push(b);
  adj[b].push(a);   // undirected: the edge belongs to both endpoints
}

let best = 0;

// Returns the height of the subtree rooted at \`node\` (edges down to
// its deepest descendant), and separately records the longest path
// that TURNS AROUND at \`node\` — which the parent could never extend,
// so it cannot be part of the return value.
function height(node, parent) {
  let deepest = -1;      // best child height
  let second = -1;       // runner-up, for the turning path
  for (const next of adj[node]) {
    if (next === parent) continue;   // do not walk back up
    const h = height(next, node);
    if (h > deepest) {
      second = deepest;
      deepest = h;
    } else if (h > second) {
      second = h;
    }
  }
  // Path down one branch, through here, down the other. The +2 pays
  // for the two edges joining this node to its two children; a missing
  // branch is -1, which cancels its edge correctly.
  const through = deepest + second + 2;
  if (through > best) best = through;
  return deepest + 1;
}

height(0, -1);
return best;
}`,
    complexityGate: {
      target: "O(n)",
      // A complete binary tree: node i hangs off node (i-1)>>1. Height is
      // about log2(n), so a recursive submission survives at n = 32000 —
      // the depth cap that bites chain-shaped DP does not apply to a
      // deliberately balanced tree, which is why the sizes can go this high.
      //
      // Balanced also means a from-every-node search has no shortcut to
      // exploit, so the quadratic solution shows its curve clearly.
      gen: "(n) => [n, Array.from({ length: n - 1 }, (_, k) => [(k + 1 - 1) >> 1, k + 1])]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Tree DP is post-order: children first",
      d: "Every node combines already-finished child results. The recursion *is* the iteration order — you inherit it from the structure instead of having to find it, which is what makes this the cheapest dependency order in DP.",
    },
    {
      t: "Return one value, accumulate another",
      d: "Tree diameter returns height while updating a global best with the turning path. That two-channel pattern covers most tree DP problems, and conflating the two channels is the classic bug.",
    },
    {
      t: "DAG DP needs a topological order",
      d: "A DAG has no natural post-order, so sort topologically first and relax forward. Longest path — the critical path — is exactly this, and it is NP-hard the moment a cycle exists.",
    },
    {
      t: "On an undirected tree, skip the parent",
      d: "Each edge appears in both adjacency lists, so a traversal that does not remember where it came from walks straight back and never terminates. One comparison fixes it; a visited set is what you need on a general graph.",
    },
    {
      t: "Recursion depth is the tree's height, not its size",
      d: "Balanced means O(log n) frames and total safety. Degenerate — a dependency chain, a sorted insertion order — means n frames and an overflow past about ten thousand nodes. An explicit stack is the fix.",
    },
  ],
  pitfalls: [
    "Returning the turning path instead of the height. The parent then extends a path that already used two of this node's branches, which is not a path at all.",
    "Forgetting to skip the parent on an undirected tree, so the traversal bounces between two nodes until the stack runs out.",
    "Keeping only the single best child height when the answer needs the best two. Every test on a path-shaped tree still passes, because there is only ever one child.",
    "Recursing over a tree whose shape comes from outside. Depth is the height, and a chain-shaped input is both realistic and fatal.",
  ],
  quiz: [
    {
      q: "Longest path in a general graph is NP-hard, but on a DAG it is:",
      options: [
        "Still NP-hard",
        "O(V + E) — relax edges in topological order",
        "O(V³)",
        "O(V log V)",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Acyclicity gives a valid evaluation order, which is exactly what DP needs. Cycles are what make the general problem hard, because a path could otherwise loop to accumulate more length.",
      distractors: [
        "Acyclicity is precisely the property that removes the hardness. It is the same problem statement over a restricted input class, and the restriction is what does the work.",
        "",
        "Cubic suggests an all-pairs approach like Floyd–Warshall. One relaxation pass in topological order is enough here, and it is linear.",
        "No sorting or halving happens during the relaxation. The topological sort itself is linear too, not O(V log V).",
      ],
    },
    {
      q: "Tree DP naturally processes nodes in:",
      options: [
        "Pre-order",
        "Post-order — children before parents",
        "Level order",
        "Any order",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A parent's value is a function of its children's values, so the children must be finished first.",
      distractors: [
        "Pre-order visits a parent before its children, so the values it would need have not been computed yet. Pre-order is the right shape for pushing information *down*, which is the second pass of rerooting.",
        "",
        "Level order does finish all children before their parent if you run it bottom-up, but it needs a queue and an extra reversal. Post-order gets there for free from the recursion.",
        "Order is the whole constraint. Any order that reads a child before writing it produces zeros or stale values.",
      ],
    },
    {
      q: "In the diameter solution, why does the function RETURN the height rather than the best path found at that node?",
      options: [
        "Height is cheaper to compute",
        "The parent can only extend a path that goes straight down; a path turning around at this node cannot be extended upward at all",
        "The best path is not known until the end",
        "They are the same value",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Those are two different questions. The parent needs 'how far down can you reach', because that is what it can add an edge to. A path that already used two of this node's branches has both ends pointing downward and is complete where it stands.",
      distractors: [
        "They cost the same — both fall out of the same loop over the children. The distinction is about meaning, not about cost.",
        "",
        "The best path at a node IS known once its children are done. What is not yet known is the global best, which is why it lives in a variable outside the recursion.",
        "They differ whenever a node has two or more children, which is most of the interesting cases. On a path-shaped tree they happen to coincide, which is why path-shaped tests never catch this bug.",
      ],
    },
    {
      q: "Your diameter code keeps only the single largest child height. Which test fails?",
      options: [
        "A path-shaped tree",
        "Any node with two or more children, where the answer turns around at that node",
        "A single-node tree",
        "None — one height is enough",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The turning path is bestChild + secondBestChild + 2. With only one value tracked, every path is forced to continue upward, and a diameter that turns around in the middle of the tree is invisible.",
      distractors: [
        "A path has exactly one child per node, so the runner-up never exists and the bug cannot show. This is why testing only on paths gives false confidence.",
        "",
        "A single node returns 0 either way — there are no children to compare at all.",
        "One height gives you the tree's depth, which is a different number. It equals the diameter only when the deepest path starts at the root.",
      ],
    },
    {
      q: "A recursive tree traversal over 50,000 nodes throws a stack overflow, but the same code works on 50,000 nodes elsewhere. What differs?",
      options: [
        "The node count",
        "The tree's SHAPE — depth is the height, so a chain-shaped tree needs 50,000 frames while a balanced one needs about 16",
        "The recursion is not tail-recursive",
        "Memory fragmentation",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Stack depth tracks height, not size. Balanced gives log n frames; degenerate gives n. Dependency chains and sorted insertion orders both produce degenerate trees, so this is an ordinary input rather than an adversarial one.",
      distractors: [
        "The counts are stated as identical. That is what makes shape the only remaining variable.",
        "",
        "Tail-call elimination would not help — post-order does real work after the recursive call returns, so the frame genuinely cannot be discarded early. It is also not implemented in most JavaScript engines.",
        "Fragmentation affects the heap. The call stack is a separate, fixed-size region, and it is the one being exhausted.",
      ],
    },
    {
      q: "Every node needs the answer as if it were the root. The obvious approach is n traversals. What is better?",
      options: [
        "Cache the results of each traversal",
        "Rerooting — one pass up to gather subtree contributions, one pass down carrying what the rest of the tree contributes",
        "Sort the nodes by degree first",
        "Run the traversal from the centroid",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The second pass hands each child the answer for everything outside its own subtree, so no work is repeated. Two traversals, O(n) total, replacing n traversals at O(n²).",
      distractors: [
        "Each traversal is rooted differently, so almost nothing is shared between them in a form a cache can key on. The reuse has to be constructed deliberately, which is what rerooting does.",
        "",
        "Degree ordering changes nothing about how many traversals are needed. There is no ordering of n full traversals that makes them cheaper than n.",
        "The centroid is genuinely useful for divide-and-conquer on trees, but rooting at it still answers the question for one root. Every node still needs its own answer.",
      ],
    },
    {
      q: "Somebody proposes the two-BFS trick for diameter instead of the DP. When is that the wrong call?",
      options: [
        "It is always wrong",
        "When the edges are weighted, or node values may be negative — the trick relies on unweighted (or non-negative) distances and does not extend to maximum path sum",
        "When the tree is large",
        "When the tree is unbalanced",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The BFS trick is genuinely excellent on a plain unweighted tree: two linear passes, hard to get wrong, no recursion depth risk. Its proof depends on distances being non-negative and uniform, so weighted edges or the maximum-path-sum variant with negative node values both break it.",
      distractors: [
        "It is correct and often preferable on unweighted trees. Dismissing it outright would be wrong and easy to challenge.",
        "",
        "Size is where BFS is actually *better* — it is iterative, so no stack depth risk at all.",
        "Imbalance is also where BFS wins, for the same reason. The DP's recursion is the thing that suffers from a degenerate shape.",
      ],
    },
    {
      q: "A build DAG's critical path is 40 minutes and the total work is 400 core-minutes. What does that tell you?",
      options: [
        "Ten cores will finish the build in 40 minutes",
        "40 minutes is a floor no amount of parallelism can beat — so past roughly ten cores, shortening the chain matters more than adding machines",
        "The build is CPU-bound",
        "The DAG has a cycle",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The critical path is a lower bound under infinite parallelism, because those targets must run one after another. It converts 'the build is slow' into a decision: buy cores until you approach the floor, then go and break the chain.",
      distractors: [
        "Ten cores gets you close in the best case, but scheduling is never perfect and the two numbers only coincide when the work divides evenly around the chain. Stating it as a guarantee is the overclaim this metric is meant to prevent.",
        "",
        "Nothing here distinguishes CPU time from waiting on I/O or the network. The critical path is about ordering, not about what the work is doing.",
        "A cycle would mean no topological order exists and the critical path could not have been computed at all.",
      ],
    },
  ],
};

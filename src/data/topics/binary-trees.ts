import type { Topic } from "../types.ts";

export const binaryTrees: Topic = {
  id: "binary-trees",
  title: "Binary trees & traversals",
  tier: 1,
  week: 9,
  depth: "core",
  summary: "All four traversals, iteratively too; depth, diameter, LCA.",
  why: "Trees are the shape of file systems, syntax trees, org charts, category hierarchies and the DOM. The iterative traversals matter because they make the hidden call stack explicit — and because a recursive traversal over a deep tree is a production crash waiting to happen.",
  complexity: "O(n) time · O(h) space",
  viz: ["inorder-iterative"],
  learn: {
    intuition:
      "A tree is a structure where each item points to some children and nothing points back up to create a loop. A binary tree limits that to at most two children, called left and right. Almost every tree algorithm is the same three-line idea: do something with this node, then do the same thing to the left subtree, then to the right. What changes between algorithms is only WHEN you do the work relative to the two recursive calls. Do it before both and you get pre-order. Between them, in-order. After both, post-order. Those are not three algorithms to memorise but one algorithm with the work moved to three different places — and each placement suits a different job. Handle a node before its children when you are copying or serialising. Handle it after when you need results from both children, as with computing heights. Handle it between when the tree is ordered and you want the values in sorted sequence.",
    mechanics: [
      {
        heading: "The recursive shape is always the same",
        body: "`visit(node)` returns immediately if the node is null, then recurses into left and right. That null check is the base case and it handles both empty trees and missing children with one line — which is why you should never write `if (node.left !== null) visit(node.left)`.",
      },
      {
        heading: "Post-order is what tree DP is built on",
        body: "When you need an answer that depends on both subtrees — height, diameter, whether a subtree is balanced, subtree sums — you must have both children's answers before you can compute your own. That forces post-order, and it is the shape of every tree dynamic-programming problem.",
      },
      {
        heading: "Iterative traversal is an explicit stack",
        body: "Recursion IS a stack you cannot see. Writing the in-order traversal iteratively — push while walking left, pop and visit, then move right — permanently demystifies both, and it is the version that does not crash on a degenerate tree.",
      },
      {
        heading: "Level order needs a queue, not a stack",
        body: "A stack goes deep, a queue goes wide. To get one array per level, record the queue's length at the start of each round: that count is exactly the number of nodes on the current level, because nothing else has been added yet.",
      },
      {
        heading: "Return one value while accumulating another",
        body: "Diameter is the classic case. The recursion returns the height of each subtree, while separately updating a running maximum of left height plus right height. This 'return one thing, track another' shape appears constantly and is worth recognising on sight.",
      },
    ],
    complexityDerivation:
      "Time is O(n) for any of the traversals, and the argument is simple: each node is visited exactly once and does constant work of its own. It is worth noticing what would break that — an implementation that concatenates result arrays at each level (`return left.concat([node]).concat(right)`) copies the accumulated results at every node and becomes O(n^2). Push into one shared array instead. Space is the more interesting half, because it is O(h) — the height — and not O(n). At any moment the call stack holds one frame per node on the path from the root to where you currently are, which is at most the height. For a balanced tree the height is log n, so a million nodes need about 20 frames. For a degenerate tree — every node having only a right child, which is what you get from inserting sorted data into an unbalanced BST — the height is n, so a million nodes need a million frames and the program crashes. That gap between O(log n) and O(n) space, for the same code on the same number of nodes, is the entire reason balanced trees exist. Level-order traversal is different again: its queue holds an entire level, so its space is O(w) where w is the maximum width, which for a balanced tree is about n/2.",
    variants: [
      {
        name: "Pre-order (node, left, right)",
        when: "Copying a tree, serialising it, or any top-down pass.",
        delta:
          "The node is handled before its children, so information flows downwards. Pre-order plus in-order uniquely reconstructs a tree.",
      },
      {
        name: "In-order (left, node, right)",
        when: "The tree is ordered and you want the values in sorted sequence.",
        delta:
          "On a binary search tree this emits values ascending, which is also the cheapest way to check that a tree really is a valid BST.",
      },
      {
        name: "Post-order (left, right, node)",
        when: "The answer depends on both children — heights, sums, deletion.",
        delta:
          "Information flows upwards. Deleting a tree must be post-order, or you free a node while still holding pointers through it.",
      },
      {
        name: "Level order (BFS)",
        when: "Anything phrased per level: printing by depth, minimum depth, right-side view.",
        delta:
          "A queue instead of a stack. Space is the maximum width rather than the height, which for a balanced tree is worse, not better.",
      },
    ],
    tradeoffs: [
      {
        vs: "Iterative versus recursive traversal",
        pick: "Recursive for clarity, iterative when the tree may be deep or unbalanced",
        because:
          "The recursive version is three lines and obviously correct. It also crashes on a degenerate tree of a hundred thousand nodes, and user-supplied data is exactly how you get a degenerate tree. Iterative costs more code and cannot overflow.",
      },
      {
        vs: "DFS versus BFS",
        pick: "BFS for anything about distance or levels, DFS otherwise",
        because:
          "BFS visits everything at depth d before anything at depth d+1, so the first time it reaches a node is by a shortest path — which is what makes 'minimum depth' and 'shortest path in an unweighted graph' BFS problems. DFS usually uses less memory on wide trees, since the stack holds a path rather than a level.",
      },
      {
        vs: "Storing parent pointers",
        pick: "Add them when you need to walk upwards repeatedly",
        because:
          "Without parent pointers, finding the lowest common ancestor means a traversal from the root. With them, it is two walks upward. The cost is a pointer per node and the obligation to maintain it on every structural change — which is a real source of bugs.",
      },
    ],
  },
  realWorld: [
    {
      system: "Compilers and abstract syntax trees",
      kind: "industry",
      problem:
        "Source code is a nested structure, and nearly every compiler stage — type checking, constant folding, code generation — is a pass over that structure.",
      applied:
        "The AST is a tree and each stage is a traversal in the order its data flow requires. Type checking is post-order, because a node's type depends on its children's types. Scope resolution is pre-order, because a declaration must be visible before the body that uses it.",
    },
    {
      system: "The DOM and browser rendering",
      kind: "industry",
      problem:
        "Layout must compute each element's size, which depends on its children, while style inheritance flows from parents to children.",
      applied:
        "Two traversals in opposite directions. Style resolution is pre-order — the parent's computed style is needed first. Layout is post-order — a container's height depends on the heights of what it contains. Recognising which direction a problem flows is the whole design.",
    },
    {
      system: "File systems and directory sizes",
      kind: "industry",
      problem:
        "`du -sh` must report the total size of a directory, which is the sum of everything beneath it.",
      applied:
        "Post-order traversal: a directory's size cannot be known until every child has reported. Deletion is post-order for the same reason — remove the contents before the container.",
    },
    {
      system: "traed — strategy and condition trees",
      kind: "yours",
      problem:
        "Entry and exit rules composed of nested AND/OR conditions form an expression tree that must be evaluated per tick, and rendered for the user in a readable order.",
      applied:
        "Evaluation is post-order, because a compound condition needs both operand results. Display is in-order, which is what produces conventional infix reading. Same tree, two traversal orders, two different jobs.",
    },
  ],
  lab: {
    prompt:
      "Return the values level by level, top to bottom, left to right — one array per level. A node is `{ value, left, right }`, with `null` for a missing child. For a root of 3 with children 9 and 20, and 20 having children 15 and 7, the answer is `[[3],[9,20],[15,7]]`. The trick is knowing where one level ends: record the queue's length before you start each round.",
    fnName: "levelOrder",
    signature: "levelOrder(root: Node | null): number[][]",
    starter: `function levelOrder(root) {
  // Breadth-first, so a QUEUE, not a stack.
  // At the start of each round, the queue holds exactly the current
  // level — capture its length before you add any children.

  return [];
}`,
    tests: [
      {
        name: "classic",
        input: [
          {
            value: 3,
            left: { value: 9, left: null, right: null },
            right: {
              value: 20,
              left: { value: 15, left: null, right: null },
              right: { value: 7, left: null, right: null },
            },
          },
        ],
        expected: [[3], [9, 20], [15, 7]],
      },
      {
        name: "empty tree",
        input: [null],
        expected: [],
      },
      {
        name: "single node",
        input: [{ value: 1, left: null, right: null }],
        expected: [[1]],
      },
      {
        // A left-leaning chain: every level has exactly one node. A solution
        // that assumes a level has 2^d nodes falls apart here.
        name: "degenerate chain",
        input: [
          {
            value: 1,
            left: { value: 2, left: { value: 3, left: null, right: null }, right: null },
            right: null,
          },
        ],
        expected: [[1], [2], [3]],
      },
      {
        name: "missing left child, present right",
        input: [
          {
            value: 1,
            left: null,
            right: { value: 2, left: null, right: null },
          },
        ],
        expected: [[1], [2]],
      },
      {
        name: "negative and zero values",
        input: [
          {
            value: 0,
            left: { value: -1, left: null, right: null },
            right: null,
          },
        ],
        expected: [[0], [-1]],
        hidden: true,
      },
      {
        name: "unbalanced depths",
        input: [
          {
            value: 1,
            left: { value: 2, left: null, right: null },
            right: {
              value: 3,
              left: null,
              right: { value: 4, left: null, right: null },
            },
          },
        ],
        expected: [[1], [2, 3], [4]],
        hidden: true,
      },
      {
        name: "duplicate values are kept",
        input: [
          {
            value: 5,
            left: { value: 5, left: null, right: null },
            right: { value: 5, left: null, right: null },
          },
        ],
        expected: [[5], [5, 5]],
        hidden: true,
      },
    ],
    hints: [
      "Return `[]` immediately when the root is null. Otherwise start the queue holding just the root.",
      "While the queue is not empty: capture `const count = queue.length` FIRST. That is exactly the current level, because no children have been added yet in this round.",
      "Loop `count` times, taking a node from the front, collecting its value, and pushing its non-null children to the back. After the loop, push the collected values as one level.",
    ],
    solution: `function levelOrder(root) {
  if (root === null) return [];

  const out = [];
  let queue = [root];

  while (queue.length > 0) {
    const level = [];
    const next = [];

    // Everything currently in \`queue\` is exactly one level.
    for (const node of queue) {
      level.push(node.value);
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }

    out.push(level);
    queue = next;
  }

  return out;
}`,
  },
  insights: [
    {
      t: "Iterative traversal is just an explicit stack",
      d: "Recursion is a stack you cannot see. Writing the traversal iteratively once permanently demystifies both — and gives you the version that survives a degenerate tree.",
    },
    {
      t: "BFS uses a queue and gives you levels",
      d: "DFS with a stack goes deep; BFS with a queue goes wide. Level-order problems are always BFS, and the level boundary is simply the queue length at the start of each round.",
    },
    {
      t: "Space is O(h), not O(n)",
      d: "Height, not node count. A balanced tree gives O(log n); a degenerate chain gives O(n), which is how deep recursion crashes in production on user-supplied data.",
    },
    {
      t: 'Diameter is the classic "return one thing, track another"',
      d: "The recursion returns height while updating a maximum-diameter accumulator on the side. That pattern recurs constantly in tree dynamic programming.",
    },
    {
      t: "Never concatenate results at every node",
      d: "`return left.concat([v]).concat(right)` copies everything accumulated so far at each node, turning an O(n) traversal into O(n^2). Push into one shared array instead.",
    },
  ],
  pitfalls: [
    "Checking `if (node.left !== null) recurse(node.left)` instead of handling null at the top of the function. It doubles the branches and misses the empty-tree case.",
    "Recursing over a tree built from user data. Sorted input into an unbalanced tree gives a chain, and the traversal overflows the stack.",
    "Using a stack for level order. You get the right nodes in the wrong grouping, and levels cannot be recovered afterwards.",
    "Building results with `concat` or `[...acc, x]` at each node. It looks functional and is quietly quadratic.",
  ],
  quiz: [
    {
      q: "In-order traversal of a valid BST produces:",
      options: [
        "Nodes in insertion order",
        "Values in ascending sorted order",
        "Level-by-level order",
        "Leaves first",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Left subtree < node < right subtree, applied recursively, is exactly the sorted sequence. It is also the cheapest way to validate that a tree really is a BST.",
      distractors: [
        "Insertion order is not recoverable from the tree at all — the structure depends on it but does not record it.",
        "",
        "That is level order, which needs a queue.",
        "That is roughly post-order, which visits both subtrees before the node.",
      ],
    },
    {
      q: "The space complexity of a recursive tree traversal is:",
      options: ["O(1)", "O(log n) always", "O(h) where h is the height", "O(n) always"],
      answer: 2,
      difficulty: "recall",
      why: "The call stack holds one frame per level on the current path. Balanced gives O(log n); a degenerate chain gives O(n).",
      distractors: [
        "Every pending call keeps a frame, so the stack grows with depth.",
        "Only if the tree is balanced. Nothing in a plain binary tree guarantees that.",
        "",
        "Only in the degenerate case. For a balanced tree it is logarithmic, and the difference is why balanced trees exist.",
      ],
    },
    {
      q: "You need each node's subtree size. Which traversal order?",
      options: ["Pre-order", "In-order", "Post-order", "Level order"],
      answer: 2,
      difficulty: "apply",
      why: "A node's subtree size is 1 plus both children's sizes, so both children must be finished before the node can be computed. That is precisely post-order, and it is the shape of every tree DP problem.",
      distractors: [
        "Pre-order handles the node first, when neither child's answer exists yet.",
        "In-order finishes the left child before the node but not the right one.",
        "",
        "Level order processes by depth, so a node is handled before its own descendants.",
      ],
    },
    {
      q: "In level-order traversal, how do you know where one level ends?",
      options: [
        "Insert a null marker after each level",
        "Record the queue's length at the start of each round — that count is exactly the current level",
        "Track the depth of each node in a map",
        "Count nodes as powers of two",
      ],
      answer: 1,
      difficulty: "apply",
      why: "At the moment a round begins, the queue holds precisely the nodes at that depth, because no children have been added yet. Capturing the length first is the whole trick.",
      distractors: [
        "It works and is more code and more special cases. The length trick needs no sentinel values.",
        "",
        "Correct and unnecessary — the queue already knows, and a map is extra memory for information you can read for free.",
        "Only true for a perfect tree. Any missing child breaks it immediately.",
      ],
    },
    {
      q: "A recursive traversal works in tests and crashes in production with a stack overflow. Most likely cause?",
      options: [
        "The tree has too many nodes",
        "The tree is degenerate — real data arrived sorted, so it is effectively a linked list and the height equals the node count",
        "A memory leak",
        "The recursion is not tail-recursive",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Space is O(h), not O(n). A million-node balanced tree needs about 20 frames; a million-node chain needs a million. Sorted insertion into an unbalanced tree is the standard way to produce that chain, and test data is usually shuffled.",
      distractors: [
        "Node count alone is fine — a balanced tree of a billion nodes is only 30 levels deep.",
        "",
        "A leak causes an out-of-memory error, not a stack overflow. Different limits, different symptoms.",
        "True and not the cause — even a tail-recursive traversal would still need to descend, and neither Python nor JavaScript eliminates the calls anyway.",
      ],
    },
    {
      q: "`return leftResult.concat([node.value]).concat(rightResult)` for an in-order traversal. What is wrong?",
      options: [
        "Nothing — it is clean functional code",
        "Each `concat` copies everything accumulated so far, so the traversal is O(n^2) rather than O(n)",
        "It gives the wrong order",
        "It uses too much stack",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The order is correct and the cost is not. Every node builds a new array containing all results so far, so the copying totals about n^2/2 elements. Push into a single shared array and the traversal is linear again.",
      distractors: [
        "It is clean, correct in output, and quadratic. Readability and complexity are separate axes.",
        "",
        "The order is exactly right — that is what makes the bug easy to miss.",
        "Stack usage is the same O(h) as any recursive traversal. The problem is the copying.",
      ],
    },
    {
      q: "Which pair of traversals uniquely reconstructs a binary tree?",
      options: [
        "Pre-order and post-order",
        "Pre-order and in-order",
        "Any two",
        "Level order alone",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Pre-order gives the root first; in-order then shows which values fall left and right of it, and the split recurses. Pre-order with post-order is not enough — a node with only a left child and a node with only a right child produce identical sequences.",
      distractors: [
        "This fails on single-child nodes, where both orders are identical whichever side the child is on.",
        "",
        "In-order plus post-order also works, but pre-order plus post-order does not — so 'any two' is false.",
        "Level order alone loses the structure whenever children are missing.",
      ],
    },
    {
      q: "You must find the lowest common ancestor of two nodes, and you will do it thousands of times on the same tree. What changes your approach?",
      options: [
        "Nothing — traverse from the root each time",
        "Repeated queries justify preprocessing: parent pointers, depths, or a binary-lifting table for O(log n) per query",
        "Convert the tree to an array",
        "Use level order",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A single query is O(n) from the root and that is optimal for one query. Thousands of queries change the economics: one O(n log n) preprocessing pass buys O(log n) per query. Recognising when repeated queries justify preprocessing is the general skill here.",
      distractors: [
        "Fine for one query, and it wastes the fact that the tree is not changing between queries.",
        "",
        "An array layout helps for a complete tree and does nothing for the ancestor question in general.",
        "Level order visits everything at each level and does not directly answer ancestry.",
      ],
    },
  ],
};

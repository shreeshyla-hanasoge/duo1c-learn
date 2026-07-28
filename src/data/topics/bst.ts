import type { Topic } from "../types.ts";

export const bst: Topic = {
  id: "bst",
  title: "Binary search trees",
  tier: 1,
  week: 9,
  depth: "core",
  summary: "Insert, delete, search, validation, and in-order properties.",
  why: "The ordered map or sorted set in most standard libraries is a balanced BST — `std::map`, Java's `TreeMap`, Python's `sortedcontainers`. Knowing when it beats a hash map is a daily decision, and 'I need the keys in order' is the answer more often than people expect.",
  complexity: "O(log n) balanced · O(n) degenerate",
  learn: {
    intuition:
      "A binary search tree adds one rule to a binary tree: everything in a node's left subtree is smaller than the node, and everything in its right subtree is larger. That rule turns searching into the same halving you do in binary search — compare with the node, and one of the two subtrees is eliminated entirely. What you buy over a hash map is order. The tree can tell you the smallest key, the next key after some value, everything between two bounds, and it can hand back all the keys in sorted sequence, none of which hashing can do at any price. What you risk is the shape. The rule says nothing about balance, so inserting already-sorted data produces a chain where every node has only a right child — a linked list with extra pointers, where every operation is O(n). That failure is not exotic; sorted input is the normal case in real systems, which is why plain BSTs are almost never used directly.",
    mechanics: [
      {
        heading: "Search: compare and descend",
        body: "Smaller than the node means go left, larger means go right, equal means found. Each step drops a whole subtree, so the cost is the number of steps down, which is the height.",
      },
      {
        heading: "Insert: search until you fall off the end, then attach",
        body: "Follow the same path a search would take. When you reach a missing child, that is where the new key belongs — it is the only position that keeps the ordering rule true.",
      },
      {
        heading: "Delete has three cases and only the third is interesting",
        body: "A leaf is simply removed. A node with one child is replaced by that child. A node with two children cannot just be removed, so replace its value with its in-order successor — the smallest key in its right subtree — and then delete that successor, which by construction has at most one child.",
      },
      {
        heading: "Validate with an inherited range, not a local comparison",
        body: "Checking only that a node beats its immediate children is the classic wrong answer. A node deep in a left subtree must still be smaller than a distant ancestor. Pass a (min, max) range down: a node must lie inside it, and each recursive call tightens one end.",
      },
      {
        heading: "In-order traversal is the fastest correctness check",
        body: "For a valid BST, in-order emits the keys ascending. So a single traversal comparing each value to the previous one validates the whole tree in O(n) with O(h) space — often cleaner than the range version.",
      },
    ],
    complexityDerivation:
      "Every operation — search, insert, delete — walks one path from root to somewhere, doing constant work per node. So the cost is exactly the height of the tree, and the entire question is what the height is. A perfectly balanced tree with n nodes has height log₂ n, because each level holds twice as many nodes as the one above, so n nodes need about log₂ n levels. That gives O(log n): a million keys in 20 comparisons. But nothing in the BST rule enforces balance. Insert 1, 2, 3, … n in order and each new key is larger than everything present, so it goes right every time and you get a chain of height n. Every operation is then O(n) and the structure is strictly worse than an array, because it has the same cost plus a pointer per node. The gap between those two cases — log n and n, for identical code — is the entire justification for AVL and red-black trees, which do extra work on every insert to keep the height at O(log n) by construction. It is also why a plain BST is a fine thing to implement in an interview and a poor thing to ship.",
    variants: [
      {
        name: "Plain BST",
        when: "Teaching, interviews, or data known to arrive in random order.",
        delta:
          "Simple and fast to write. No balance guarantee, so any ordered input destroys it.",
      },
      {
        name: "Self-balancing (AVL, red-black)",
        when: "Production ordered maps and sets.",
        delta:
          "Rotations on insert and delete keep the height O(log n) whatever the input order. AVL stays more strictly balanced so lookups are faster; red-black rebalances less, so writes are faster.",
      },
      {
        name: "Order-statistic tree",
        when: "You need 'what is the k-th smallest' or 'what is this key's rank'.",
        delta:
          "Each node stores its subtree size, which makes rank and select O(log n). Leaderboards and percentile queries are exactly this.",
      },
      {
        name: "B-tree",
        when: "The data lives on disk or SSD.",
        delta:
          "Many keys per node so the fan-out matches the storage block size, giving a depth of 3 or 4 even for enormous tables. This is what a database index is.",
      },
    ],
    tradeoffs: [
      {
        vs: "Hash map",
        pick: "BST when you need order, hash map when you do not",
        because:
          "Hashing gives O(1) point lookup and deliberately destroys ordering. A tree gives O(log n) plus range queries, floor and ceiling, successor and predecessor, and sorted iteration. If you have ever sorted a hash map's keys after retrieving them, the tree was probably the right structure.",
      },
      {
        vs: "A sorted array",
        pick: "Sorted array when the data is static",
        because:
          "A sorted array gives the same O(log n) search with better cache behaviour, less memory and simpler code — but O(n) insertion, because everything shifts. The tree exists to make insertion cheap while keeping the order.",
      },
      {
        vs: "A skip list",
        pick: "Either — this is mostly an implementation preference",
        because:
          "A skip list reaches the same O(log n) expected bounds with probabilistic balancing instead of rotations, which makes concurrent implementations considerably easier. Redis uses skip lists for sorted sets partly for that reason.",
      },
    ],
  },
  realWorld: [
    {
      system: "Database indexes (B-trees and B+ trees)",
      kind: "industry",
      problem:
        "`WHERE created_at BETWEEN x AND y ORDER BY created_at` needs ordered access, which no hash index can provide, over data too large for memory.",
      applied:
        "A B-tree is a search tree widened so each node fills a storage page, giving a fan-out in the hundreds and a depth of 3 or 4 for a hundred million rows. Range scans walk the leaf level, which is a linked list in sorted order. This is why a hash index in Postgres cannot serve a range query.",
      impact: "Ordered access over huge data in about 4 page reads",
    },
    {
      system: "Linux kernel scheduler (CFS)",
      kind: "industry",
      problem:
        "The scheduler must repeatedly pick the runnable task with the least accumulated runtime, while tasks constantly arrive and leave.",
      applied:
        "A red-black tree keyed by virtual runtime. The leftmost node is the next task to run and is cached for O(1) access, while insertions and removals stay O(log n). A hash map could not answer 'the smallest key' at all.",
      evidence: "Linux kernel/sched/fair.c",
    },
    {
      system: "Interval and range matching in routers and firewalls",
      kind: "industry",
      problem:
        "Deciding which rule applies to an address requires finding the closest enclosing range, not an exact match.",
      applied:
        "Ordered tree structures answer 'the largest key not exceeding this one' — the floor query — in O(log n). Exact-match hashing cannot express the question.",
    },
    {
      system: "traed — order book and price-level lookup",
      kind: "yours",
      problem:
        "Price levels must be queried by nearest, iterated in order, and updated constantly as quotes arrive. A dictionary keyed by price answers exact lookups only, and re-sorting the keys per query is O(n log n).",
      applied:
        "An ordered structure keeps the levels sorted as they change, giving best-bid and best-ask in O(1) at the ends and 'nearest level to this price' in O(log n), with no re-sorting.",
      impact: "O(n log n) re-sort per query → O(log n) lookup",
    },
  ],
  lab: {
    prompt:
      "Return `true` if the tree is a valid binary search tree: every value in a node's left subtree is strictly less than the node, and every value in its right subtree is strictly greater. A node is `{ value, left, right }`. The tempting solution — checking each node only against its immediate children — passes the obvious tests and is wrong, which is exactly what the hidden tests are for.",
    fnName: "isValidBST",
    signature: "isValidBST(root: Node | null): boolean",
    starter: `function isValidBST(root) {
  // Careful: comparing a node only with its direct children is NOT enough.
  // A node deep in a left subtree must still be smaller than a
  // distant ancestor. Carry the allowed range down as you descend.

  return true;
}`,
    tests: [
      {
        name: "valid",
        input: [
          {
            value: 2,
            left: { value: 1, left: null, right: null },
            right: { value: 3, left: null, right: null },
          },
        ],
        expected: true,
      },
      {
        name: "empty tree is valid",
        input: [null],
        expected: true,
      },
      {
        name: "single node is valid",
        input: [{ value: 42, left: null, right: null }],
        expected: true,
      },
      {
        name: "obviously wrong — left child larger",
        input: [
          {
            value: 2,
            left: { value: 5, left: null, right: null },
            right: null,
          },
        ],
        expected: false,
      },
      {
        // THE case. 6 is correctly greater than its parent 3, so a
        // parent-only check is satisfied. But it sits in the LEFT subtree
        // of 5, so it must also be less than 5 — and it is not.
        name: "violates a distant ancestor, not its parent",
        input: [
          {
            value: 5,
            left: {
              value: 3,
              left: { value: 1, left: null, right: null },
              right: { value: 6, left: null, right: null },
            },
            right: { value: 7, left: null, right: null },
          },
        ],
        expected: false,
      },
      {
        // Equal values break the strict ordering. Whether duplicates are
        // allowed is a design choice; here they are not.
        name: "duplicate of the root",
        input: [
          {
            value: 2,
            left: { value: 2, left: null, right: null },
            right: null,
          },
        ],
        expected: false,
        hidden: true,
      },
      {
        name: "valid degenerate chain",
        input: [
          {
            value: 1,
            left: null,
            right: {
              value: 2,
              left: null,
              right: { value: 3, left: null, right: null },
            },
          },
        ],
        expected: true,
        hidden: true,
      },
      {
        name: "negative values are ordinary values",
        input: [
          {
            value: 0,
            left: { value: -5, left: null, right: null },
            right: { value: 5, left: null, right: null },
          },
        ],
        expected: true,
        hidden: true,
      },
    ],
    hints: [
      "Recurse with two extra arguments: the exclusive lower bound and the exclusive upper bound this node's value must sit between. Start with -Infinity and Infinity.",
      "Going left tightens the UPPER bound to the current node's value; going right tightens the LOWER bound. The other bound is inherited unchanged from above.",
      "Alternatively, do an in-order traversal and check that each value is strictly greater than the previous one. Same O(n), and for many people easier to get right.",
    ],
    solution: `function isValidBST(root) {
  // The bounds are EXCLUSIVE, which is what makes duplicates invalid.
  // Infinity works as a starting bound for any finite number.
  function check(node, low, high) {
    if (node === null) return true;
    if (node.value <= low || node.value >= high) return false;
    // Going left caps the maximum; going right raises the minimum.
    return check(node.left, low, node.value)
        && check(node.right, node.value, high);
  }

  return check(root, -Infinity, Infinity);
}`,
  },
  insights: [
    {
      t: "Validation needs a range, not a parent comparison",
      d: "Checking only that a node is greater than its left child and less than its right child is the classic wrong answer. Each node must lie within a (min, max) range inherited from all of its ancestors.",
    },
    {
      t: "Delete has three cases and the third is the interesting one",
      d: "No children: remove it. One child: splice it out. Two children: replace its value with the in-order successor, then delete that successor — which is guaranteed to have at most one child.",
    },
    {
      t: "A BST beats a hash map when you need order",
      d: 'Range queries, floor and ceiling, "next largest", ordered iteration. A hash map provides none of those at any price, because hashing destroys order by design.',
    },
    {
      t: "Unbalanced insertion order destroys it",
      d: "Inserting sorted data into a plain BST produces a linked list with extra pointers. That is precisely what AVL and red-black trees exist to prevent, and sorted input is the normal case in real systems.",
    },
    {
      t: "In-order traversal is the cheapest validity check",
      d: "A valid BST emits ascending values in order, so one traversal comparing each value to the previous one settles it in O(n) with no bounds to thread through.",
    },
  ],
  pitfalls: [
    "Validating with only parent-child comparisons. It accepts trees that violate a distant ancestor.",
    "Using `<=` or `>=` when the definition says strictly. Decide whether duplicates are allowed and enforce it consistently — the search path for a duplicate has to be deterministic too.",
    "Building a BST from sorted input. You get a chain, and every operation degrades to O(n).",
    "Assuming the in-order successor is the parent's sibling. It is the leftmost node of the right subtree, which may be several levels down.",
  ],
  quiz: [
    {
      q: "Which check correctly validates a BST?",
      options: [
        "Every node is greater than its left child and less than its right child",
        "Every node lies within a (min, max) range passed down from its ancestors",
        "The tree is balanced",
        "In-order traversal visits every node",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A node deep in a left subtree must still be less than a distant ancestor. Only the inherited-range check enforces that — the local comparison misses it entirely.",
      distractors: [
        "This is the classic wrong answer. A tree with root 5, left child 3, and 3's right child 4 passes it and is not a valid BST.",
        "",
        "Balance is about shape and is a completely separate property. A valid BST can be a chain.",
        "Every traversal visits every node in any tree, so this tests nothing.",
      ],
    },
    {
      q: "When is a balanced BST preferable to a hash map?",
      options: [
        "When lookups must be fast",
        "When you need ordered iteration, range queries, or floor and ceiling lookups",
        "When memory is tight",
        "When keys are integers",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Hash maps win on raw point lookup. Order is the thing they cannot provide at all, and no amount of tuning changes that.",
      distractors: [
        "For pure point lookup the hash map wins — O(1) versus O(log n).",
        "",
        "Memory is comparable, and a hash map's spare capacity often makes it the heavier of the two. Not the deciding factor.",
        "Both handle integer keys perfectly well. Key type is not the criterion.",
      ],
    },
    {
      q: "You insert 1, 2, 3, …, 1000 in order into a plain BST. What is the height?",
      options: ["About 10", "About 30", "1000", "It depends on the values"],
      answer: 2,
      difficulty: "apply",
      why: "Each key is larger than everything present, so it goes right every time. The result is a chain of 1000 nodes and every operation becomes O(n) — strictly worse than a plain array.",
      distractors: [
        "That is log₂(1000), the balanced height. Nothing here balances anything.",
        "Not a meaningful figure for either case.",
        "",
        "It depends on the ORDER, not on the values. The same 1000 keys shuffled would give a height of roughly 20.",
      ],
    },
    {
      q: "Deleting a node with two children: what replaces it?",
      options: [
        "Its left child",
        "Its in-order successor — the smallest value in its right subtree",
        "Its parent",
        "Nothing — mark it deleted",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The successor is the only value that keeps every ordering relationship intact: it is larger than everything in the left subtree and smaller than everything else in the right one. It also has at most one child, so removing it afterwards is the easy case. The in-order predecessor works symmetrically.",
      distractors: [
        "The left child is smaller than everything in the right subtree, so promoting it breaks the ordering immediately.",
        "",
        "The parent has its own position in the tree and moving it down would break the ordering above.",
        "Tombstoning is a real technique and it accumulates dead nodes that still cost traversal time and eventually force a rebuild.",
      ],
    },
    {
      q: "Your `isValidBST` returns true for root 5, left child 3, and 3's right child 6. What is the bug?",
      options: [
        "You compared with the wrong child",
        "You only checked parent-child pairs, so nothing enforced that 4 must also be less than its grandparent 5",
        "You forgot the null case",
        "The tree is actually valid",
      ],
      answer: 1,
      difficulty: "judge",
      why: "6 is correctly greater than its parent 3, so a parent-only check passes. But it sits in 5's left subtree, so it must also be less than 5. Only a bound inherited from ancestors catches that, which is why the range has to be threaded down the recursion.",
      distractors: [
        "The comparison direction is right — the problem is which nodes are being compared at all.",
        "",
        "The null case would cause a crash or a wrong answer on empty subtrees, not on this specific shape.",
        "It is invalid. In-order gives 1, 3, 6, 5, 7 — the 6 before the 5 is the violation, and an in-order check spots it immediately.",
      ],
    },
    {
      q: "You need the 50th percentile of a live set of scores, updated constantly. Which structure?",
      options: [
        "A hash map",
        "An order-statistic tree — a BST where each node stores its subtree size",
        "A sorted array",
        "A heap",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Subtree sizes turn 'the k-th smallest' into a descent: compare k against the left subtree's size and go one way or the other. That gives O(log n) select and rank, with O(log n) updates. This is exactly how leaderboards with rank queries are built.",
      distractors: [
        "No ordering at all, so any percentile means extracting and sorting everything.",
        "",
        "O(log n) select and O(n) insertion. Fine for static data, wrong for a live set.",
        "A heap gives you one extreme cheaply and says nothing about the middle.",
      ],
    },
    {
      q: "Why is a B-tree used for database indexes rather than a red-black tree?",
      options: [
        "B-trees are simpler",
        "Each node fills a storage page, so the fan-out is in the hundreds and the depth is 3–4 rather than 30 — and depth is disk reads",
        "B-trees are always balanced and red-black trees are not",
        "Red-black trees cannot store duplicates",
      ],
      answer: 1,
      difficulty: "judge",
      why: "On disk, the cost is the number of pages read, not the number of comparisons. A binary tree of a hundred million rows is about 27 levels — 27 page reads. A B-tree with a fan-out of 500 is 4 levels. Same asymptotic class, completely different real cost.",
      distractors: [
        "B-trees are considerably more complex to implement.",
        "",
        "Red-black trees are balanced by construction too. The difference is fan-out, not balance.",
        "Both handle duplicates with the same design choices.",
      ],
    },
    {
      q: "A colleague says 'the BST is O(log n), so this is fine'. What is the follow-up question?",
      options: [
        "How many keys are there?",
        "Is it self-balancing, and what order does the data arrive in?",
        "What language is it in?",
        "How much memory does it use?",
      ],
      answer: 1,
      difficulty: "judge",
      why: "O(log n) is a property of a BALANCED tree, and nothing in the BST rule provides balance. A plain tree fed sorted data is O(n). Those two questions distinguish a real guarantee from an assumption nobody checked.",
      distractors: [
        "Useful for sizing and irrelevant to whether the claimed bound holds.",
        "",
        "Implementation language changes the constant, not the class.",
        "A fair question and a separate one. The claim under scrutiny is about time.",
      ],
    },
  ],
};

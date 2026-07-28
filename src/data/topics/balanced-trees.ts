import type { Topic } from "../types.ts";

export const balancedTrees: Topic = {
  id: "balanced-trees",
  title: "Balanced trees (conceptual)",
  tier: 1,
  week: 9,
  depth: "core",
  summary: "AVL and red-black — understand rotations, do not memorise cases.",
  why: "You will almost certainly never implement one. You will constantly rely on one — every ordered map, every database index, the Linux scheduler — and you should know what it costs, what guarantee it actually gives you, and when it is the wrong shape entirely. This is the one Tier 1 topic where understanding beats implementing.",
  complexity: "O(log n) guaranteed",
  learn: {
    intuition:
      "A plain binary search tree has a fatal flaw: its shape depends entirely on the order the data arrived in. Sorted input gives you a chain, and every operation becomes O(n). A balanced tree fixes this by doing a little extra work on every insert and delete to keep the tree short. The mechanism is the rotation — a small, local rearrangement of two or three nodes that reduces the height on one side while leaving the left-to-right ordering of every value untouched. That last part is the whole reason rotations are safe: the tree still reads the same in order, so it is still a valid search tree, but it is now shorter. AVL trees rotate aggressively to keep the two sides within one level of each other. Red-black trees allow more slack, using node colours to enforce a weaker rule that still bounds the height. The rest is bookkeeping, and it is genuinely not worth memorising.",
    mechanics: [
      {
        heading: "A rotation re-parents locally and preserves the in-order sequence",
        body: "Take a node and its child, and make the child the parent. The subtree that used to sit between them changes parents, and that is the only value that moves sideways. Read the tree left to right before and after — the sequence is identical. Understand this one property and the case analysis stops being arbitrary rules.",
      },
      {
        heading: "Detect imbalance, then apply one or two rotations",
        body: "After an insert, walk back up updating heights. When a node's two sides differ by more than the allowed amount, rotate. If the offending subtree leans the other way, you need two rotations — an inner one to straighten it, then the outer one. That is the whole of the AVL case analysis.",
      },
      {
        heading: "Red-black uses colours as a proxy for height",
        body: "Every node is red or black, no red node has a red child, and every path from the root to a leaf passes the same number of black nodes. Those rules together force the longest path to be at most twice the shortest, which bounds the height at O(log n) without tracking heights directly.",
      },
      {
        heading: "AVL rebalances more, red-black rebalances less",
        body: "AVL keeps the tree strictly shorter, so lookups are slightly faster. Red-black tolerates more imbalance, so it does fewer rotations per write. Most standard libraries choose red-black because real workloads write often, and a rotation is not free.",
      },
      {
        heading: "B-trees are the same idea reshaped for storage",
        body: "When each node access is a page read from disk or SSD, depth is what costs you, not comparisons. So make each node hold hundreds of keys instead of one. The tree becomes three or four levels deep for a hundred million rows, and rebalancing becomes splitting and merging pages rather than rotating.",
      },
    ],
    complexityDerivation:
      "Why does bounding the imbalance bound the height at O(log n)? Ask the question backwards: what is the FEWEST nodes an AVL tree of height h can contain? Call it N(h). The root has two subtrees whose heights differ by at most one, so the sparsest possible tree of height h has one subtree of height h−1 and one of height h−2, giving N(h) = 1 + N(h−1) + N(h−2). That is the Fibonacci recurrence, so N(h) grows exponentially — roughly φ^h where φ is about 1.618. Invert it: a tree with n nodes has height at most log_φ(n), which is about 1.44 log₂ n. So even the worst legal AVL tree is only 44% taller than a perfect one, and every operation stays O(log n). For red-black trees the same style of argument gives a bound of 2 log₂(n+1), which is looser — the tree can be twice as tall as perfect — but still logarithmic. That is the trade in one line: AVL guarantees a shorter tree and pays more rotations to keep it; red-black accepts up to twice the height and pays less. Both destroy the O(n) worst case that makes a plain BST unusable on real data.",
    variants: [
      {
        name: "AVL tree",
        when: "Lookup-heavy workloads where writes are rare.",
        delta:
          "Height at most 1.44 log₂ n. Faster searches, more rotations per insert and delete.",
      },
      {
        name: "Red-black tree",
        when: "The default in standard libraries.",
        delta:
          "Height at most 2 log₂ n, at most three rotations per insert. `std::map`, Java's `TreeMap` and the Linux scheduler all use it.",
      },
      {
        name: "B-tree / B+ tree",
        when: "The data is on disk, or nodes should match a cache line or page.",
        delta:
          "Hundreds of keys per node, so depth is 3–4 rather than 30. Every relational database index is one of these.",
      },
      {
        name: "Skip list",
        when: "You want the same bounds with much simpler concurrent code.",
        delta:
          "Probabilistic balancing by coin flips instead of rotations. Expected O(log n) rather than guaranteed, and far easier to make lock-free. Redis sorted sets use one.",
      },
    ],
    tradeoffs: [
      {
        vs: "A plain BST",
        pick: "Always balanced, for anything holding real data",
        because:
          "The plain version is faster to write and degrades to O(n) on sorted input, and sorted input is the normal case — records arrive by timestamp, ids increase. You are choosing between a guarantee and a hope.",
      },
      {
        vs: "A hash map",
        pick: "Balanced tree only when you need ordering",
        because:
          "O(1) beats O(log n) for point lookup, and no tree competes on that. The tree earns its place through range queries, successor and predecessor, and sorted iteration — and through having no bad case, which matters when the keys come from users.",
      },
      {
        vs: "A skip list",
        pick: "Skip list under concurrency, tree for a hard guarantee",
        because:
          "A skip list's expected O(log n) can, with terrible luck, be worse, but it needs no rotations, which makes lock-free implementation dramatically simpler. A tree gives a worst-case guarantee and a much harder concurrency story.",
      },
    ],
  },
  realWorld: [
    {
      system: "Every relational database index",
      kind: "industry",
      problem:
        "Finding one row among hundreds of millions, and supporting range scans, over data that does not fit in memory and is constantly modified.",
      applied:
        "A B+ tree keeps all values in the leaves, linked in sorted order, with internal nodes holding only keys for navigation. A point lookup is 3–4 page reads and a range scan walks the leaf chain. Balancing happens as page splits and merges rather than rotations.",
      impact: "Ordered access at scale, with a guaranteed depth",
    },
    {
      system: "C++ std::map, Java TreeMap, .NET SortedDictionary",
      kind: "industry",
      problem:
        "Library authors must give a worst-case guarantee, because they have no idea what order a user's keys will arrive in.",
      applied:
        "Red-black trees. The choice over AVL is deliberate: fewer rotations per write suits general-purpose use, and the slightly greater height costs little on lookup.",
    },
    {
      system: "Linux completely fair scheduler",
      kind: "industry",
      problem:
        "Repeatedly select the runnable task with the least virtual runtime, while tasks join and leave thousands of times a second.",
      applied:
        "A red-black tree keyed by virtual runtime, with the leftmost node cached so 'next task' is O(1) while inserts and removals stay O(log n) regardless of the pattern of arrivals.",
      evidence: "Linux kernel/sched/fair.c",
    },
    {
      system: "Redis sorted sets",
      kind: "industry",
      problem:
        "Leaderboards need ordering, rank queries and range scans, with high write throughput.",
      applied:
        "A skip list plus a hash map — the same job as a balanced tree, with probabilistic balancing instead of rotations. The hash map gives O(1) member lookup and the skip list gives the ordering, which is the same pairing an LRU cache uses.",
    },
  ],
  insights: [
    {
      t: "A rotation is a local re-parenting that preserves in-order",
      d: "That single property is why rotations are safe. Understand it and the case analysis stops being arbitrary — every case is just 'which rotation makes this shorter without reordering anything'.",
    },
    {
      t: "AVL is more rigidly balanced; red-black rebalances less",
      d: "AVL gives faster lookups; red-black gives cheaper inserts and deletes. Most standard libraries pick red-black because mutation is common in general-purpose code.",
    },
    {
      t: "B-trees are the disk-shaped answer",
      d: "When a node fetch is a page read, you want high fan-out and shallow depth. That is why databases use B-trees rather than binary ones — same idea, reshaped for the storage cost.",
    },
    {
      t: "The guarantee is what you are buying",
      d: "A plain BST is O(log n) on random data too. You pay for balancing to remove the worst case, and the worst case — sorted input — is the common one, not the exotic one.",
    },
    {
      t: "Even the worst legal AVL tree is only 44% taller than perfect",
      d: "The sparsest AVL tree of height h follows the Fibonacci recurrence, giving a height bound of about 1.44 log₂ n. Red-black's looser rules give 2 log₂ n.",
    },
  ],
  pitfalls: [
    "Memorising the rotation cases instead of the ordering property. The cases are derivable; the property is the thing worth knowing.",
    "Assuming a language's built-in map is a tree. In Python, Java and JavaScript the default map is a hash table, with no ordering guarantee for range queries.",
    "Using a balanced tree when the data is static. A sorted array gives the same lookup cost with better cache behaviour and no per-node overhead.",
    "Believing 'balanced' means perfectly balanced. It means the height is bounded by a constant times log n, which is a much weaker and much cheaper promise.",
  ],
  quiz: [
    {
      q: "What does a tree rotation preserve?",
      options: [
        "Node colours",
        "The in-order sequence of the nodes",
        "The exact height of every subtree",
        "The root",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A rotation only re-parents locally; the left-to-right ordering is untouched, which is precisely why the search-tree property survives it.",
      distractors: [
        "Colours are frequently changed as part of rebalancing — recolouring is half of the red-black algorithm.",
        "",
        "Changing heights is the entire point. The rotation exists to make one side shorter.",
        "A rotation at the top changes which node is the root. That is normal and expected.",
      ],
    },
    {
      q: "Databases favour B-trees over binary search trees mainly because:",
      options: [
        "They are simpler",
        "High fan-out keeps the tree shallow, so a lookup costs few disk-page reads",
        "They support duplicates",
        "They are faster in memory",
      ],
      answer: 1,
      difficulty: "apply",
      why: "When each node access is a page read, minimising depth is everything. A binary tree over a billion rows is about 30 page reads; a B-tree is 3 or 4.",
      distractors: [
        "B-trees are considerably more complex — splits, merges and variable node occupancy.",
        "",
        "Both handle duplicates with the same design choices. Not a differentiator.",
        "In pure memory a binary tree is competitive. The advantage appears specifically when a node fetch is expensive.",
      ],
    },
    {
      q: "You choose a plain BST because your data 'arrives randomly'. What is the risk?",
      options: [
        "None, if it really is random",
        "'Random' is an assumption about the future — one import of sorted data turns every operation into O(n)",
        "It uses more memory",
        "It cannot store duplicates",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Balancing buys you a guarantee rather than an expectation. The failure mode is not exotic: a backfill by id, an import ordered by timestamp, or a migration replaying rows in order all produce a chain.",
      distractors: [
        "True today and not a property you control. It is exactly the kind of assumption that silently stops holding.",
        "",
        "A plain BST uses less memory — no colour bit or height field. That is the wrong axis.",
        "Both can, with the same design decisions.",
      ],
    },
    {
      q: "Why does red-black allow a height of 2 log n while AVL allows only 1.44 log n?",
      options: [
        "Red-black trees are worse",
        "Looser balance means fewer rotations per write — it is a deliberate trade of lookup speed for write speed",
        "Because of the colours",
        "It is a historical accident",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Both are O(log n); they differ in the constant and in what they pay to hold it. General-purpose libraries write often, so red-black's cheaper insert and delete usually wins overall.",
      distractors: [
        "Different, not worse. They are chosen by most standard libraries precisely because the trade suits general use.",
        "",
        "The colours are the mechanism for enforcing the looser rule, not the reason for choosing it.",
        "It is a deliberate engineering trade with a clear justification.",
      ],
    },
    {
      q: "Your dataset is loaded once and then only read. Balanced tree or sorted array?",
      options: [
        "Balanced tree — it is the general answer",
        "Sorted array — same O(log n) search, better cache behaviour, less memory, and no insertion to support",
        "Hash map",
        "Skip list",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The tree exists to make insertion cheap while preserving order. With no insertions you are paying for a capability you never use — two pointers and a colour bit per element, plus scattered memory. A sorted array does binary search over contiguous memory.",
      distractors: [
        "The general answer is not the right answer when a constraint removes the reason for it.",
        "",
        "Only if you never need ordering. Range queries and neighbours are exactly what hashing cannot do.",
        "Same objection as the tree, plus probabilistic bounds. Nothing gained on static data.",
      ],
    },
    {
      q: "Redis uses a skip list for sorted sets rather than a balanced tree. The strongest reason is:",
      options: [
        "Skip lists are faster",
        "Probabilistic balancing needs no rotations, which makes the implementation — especially anything concurrent — far simpler",
        "Skip lists use less memory",
        "Balanced trees cannot do range queries",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Both give O(log n) for the operations that matter. A rotation restructures several nodes at once, which is awkward to make safe under concurrency; a skip list only relinks forward pointers. Simplicity of implementation is a legitimate engineering reason.",
      distractors: [
        "Comparable, and skip lists are often marginally slower. Speed is not the argument.",
        "",
        "They typically use more, because of the multiple forward pointers per node.",
        "Range queries are one of their best features. This is backwards.",
      ],
    },
    {
      q: "In Python, `my_dict` preserves insertion order. Does that make it an ordered map in the tree sense?",
      options: [
        "Yes",
        "No — it remembers insertion order, which is not sorted order, and it cannot answer range or nearest-key queries",
        "Only for integer keys",
        "Only in Python 3.7+",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Two different meanings of 'ordered'. A dict replays keys in the order you added them. A tree map keeps them sorted by key, which is what makes 'all keys between x and y' and 'the next key after x' possible. Python has no built-in sorted map — `sortedcontainers` fills that gap.",
      distractors: [
        "The word is the same and the capability is completely different.",
        "",
        "Key type is irrelevant — insertion order is preserved for any key type and is still not sorted order.",
        "That is when insertion order became guaranteed, and it was never sorted order at any version.",
      ],
    },
    {
      q: "An interviewer asks you to implement a red-black tree. What is the best response?",
      options: [
        "Attempt it from memory",
        "Explain the invariants and why they bound the height, then ask whether they want the full case analysis or an AVL tree, which is shorter to write correctly",
        "Say you would use a library",
        "Implement a plain BST instead",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Almost nobody writes red-black deletion correctly from memory, and interviewers know it. Demonstrating that you understand what the invariants buy, and proposing a scope you can actually complete, is a better signal than a half-finished case analysis.",
      distractors: [
        "The delete cases are notoriously long. Running out of time mid-case shows less than a clear explanation would.",
        "",
        "True in practice and it dodges the question. Say it after showing you understand the structure, not instead.",
        "Silently solving a different, easier problem is the worst option — it looks like you missed the requirement.",
      ],
    },
  ],
};

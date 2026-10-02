/**
 * Plain-English glossary.
 *
 * The rule for this file: a reader who has never seen the word before should
 * understand the sentence it appeared in after reading `plain`. No definition
 * may lean on another piece of jargon without explaining it in the same breath.
 *
 * `also` lists the other surface forms that should link to the same entry —
 * plurals, hyphen variants, the spelled-out version of an abbreviation. The
 * matcher is case-insensitive and matches whole words only, so short entries
 * are safe; see `Prose.tsx` for how first-occurrence linking works.
 */

export interface GlossaryEntry {
  /** One or two sentences. Concrete, no formalism, no circular jargon. */
  plain: string;
  /** Alternate spellings/inflections that should link to this entry. */
  also?: string[];
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  /* ---------------- Cost and measurement ---------------- */

  "Big-O": {
    plain:
      "A way of saying how the running time grows as the input grows, ignoring constant factors. O(n) means 'double the input, roughly double the time'. O(n²) means 'double the input, four times the time'.",
    also: ["Big O", "big-oh"],
  },
  "time complexity": {
    plain:
      "How the running time grows as the input grows. Written with Big-O, like O(n) or O(n log n).",
    also: ["time complexities"],
  },
  "space complexity": {
    plain:
      "How much extra memory an algorithm needs as the input grows, not counting the input itself.",
  },
  amortised: {
    plain:
      "Spread out over many operations. A step is 'amortised O(1)' if any run of n steps costs about n in total — one individual step may be slow, but it cannot happen often.",
    also: ["amortized", "amortisation", "amortization"],
  },
  asymptotic: {
    plain:
      "About behaviour for large inputs. It deliberately ignores constants and small-input behaviour, so an 'asymptotically better' algorithm can still be slower on your actual data.",
    also: ["asymptotically", "asymptotics"],
  },
  "worst case": {
    plain:
      "The slowest the algorithm can be over every possible input of that size — including one chosen by somebody trying to break it.",
    also: ["worst-case"],
  },
  "average case": {
    plain:
      "The typical cost assuming inputs are random. Weaker than worst case, because real traffic is often not random.",
    also: ["average-case"],
  },
  invariant: {
    plain:
      "A statement that stays true at every step of a loop. Proving your invariant holds is usually the whole correctness argument.",
    also: ["invariants"],
  },
  "in place": {
    plain:
      "Rearranging the input itself using only a fixed amount of extra memory, instead of building a new copy.",
    also: ["in-place"],
  },
  "cache locality": {
    plain:
      "The CPU fetches memory in blocks, so data stored next to each other is far cheaper to read than data scattered around. An array walks fast for this reason; a linked list does not.",
    also: ["locality", "cache line", "cache lines"],
  },
  "constant factor": {
    plain:
      "The part of the cost Big-O throws away. Two O(n) loops can differ tenfold in real time because one allocates memory per element and the other does not.",
    also: ["constant factors", "constants"],
  },
  throughput: {
    plain: "How much work finishes per second, in total.",
  },
  latency: {
    plain:
      "How long one single request takes. High throughput and bad latency can happen together — a system can finish a lot of work overall while individual users still wait.",
  },
  "tail latency": {
    plain:
      "The slow end of the distribution — p99 means 'the worst 1% of requests are at least this slow'. Averages hide it, and users feel it.",
    also: ["p99", "p95", "percentile", "percentiles"],
  },

  /* ---------------- Core data structures ---------------- */

  array: {
    plain:
      "A block of values stored side by side in memory. Reading position i is instant because the address is a simple calculation; inserting in the middle is slow because everything after it must shift.",
    also: ["arrays"],
  },
  "dynamic array": {
    plain:
      "An array that grows on demand by allocating a bigger block and copying across — Python's list, Java's ArrayList, JavaScript's Array, C++'s vector.",
    also: ["dynamic arrays", "vector", "ArrayList"],
  },
  "hash map": {
    plain:
      "A lookup table that turns a key into an array position using a hash function, so finding a key takes constant time on average. Python calls it dict, Java HashMap, JavaScript Map or a plain object.",
    also: [
      "hash table",
      "hash tables",
      "hash maps",
      "hashmap",
      "dict",
      "dictionary",
    ],
  },
  "hash function": {
    plain:
      "A function that turns any key into a number. A good one scatters keys evenly, so few of them land in the same slot.",
    also: ["hashing", "hashed"],
  },
  collision: {
    plain:
      "Two different keys hashing to the same slot. Unavoidable, so every hash map has a plan for it — usually a small list per slot, or probing the next free slot.",
    also: ["collisions"],
  },
  "load factor": {
    plain:
      "Entries divided by slots in a hash map. Past roughly 0.7 collisions climb sharply, which is when the table doubles in size and rehashes everything.",
  },
  "linked list": {
    plain:
      "A chain of nodes where each node holds a value and the address of the next one. Inserting is cheap if you are already holding the node; finding anything means walking from the start.",
    also: ["linked lists"],
  },
  stack: {
    plain:
      "Last in, first out — like a pile of plates. Push on top, pop from the top. The undo history in any editor is a stack.",
    also: ["stacks", "LIFO"],
  },
  queue: {
    plain:
      "First in, first out — like a queue at a counter. Add at the back, remove from the front.",
    also: ["queues", "FIFO"],
  },
  deque: {
    plain:
      "A double-ended queue: you can add and remove at both the front and the back in constant time. Pronounced 'deck'.",
    also: ["double-ended queue"],
  },
  heap: {
    plain:
      "A tree kept in an array where every parent is smaller than its children (a min-heap). That gives you the smallest item instantly, and insert or remove in O(log n) — but it does not keep everything sorted.",
    also: ["heaps", "min-heap", "max-heap", "binary heap"],
  },
  "priority queue": {
    plain:
      "A queue where the highest-priority item leaves first rather than the oldest. Almost always implemented with a heap.",
    also: ["priority queues"],
  },
  "ring buffer": {
    plain:
      "A fixed-size array used in a circle: when you reach the end you wrap to the start and overwrite the oldest entry. Used when you only ever want the most recent N items and never want to allocate memory again.",
    also: ["ring buffers", "circular buffer", "circular buffers"],
  },

  /* ---------------- Trees ---------------- */

  node: {
    plain:
      "One item in a tree or graph, together with the links to its neighbours.",
    also: ["nodes", "vertex", "vertices"],
  },
  "binary tree": {
    plain: "A tree where each node has at most two children, left and right.",
    also: ["binary trees"],
  },
  "binary search tree": {
    plain:
      "A binary tree kept in order: everything in the left subtree is smaller than the node, everything on the right is larger. That ordering is what lets you search by halving the problem each step.",
    also: ["BST", "binary search trees"],
  },
  balanced: {
    plain:
      "A tree is balanced when no branch is dramatically deeper than another, so its height stays around log n. An unbalanced tree degenerates into a linked list and loses every speed guarantee.",
    also: ["self-balancing", "balancing", "rebalance"],
  },
  "in-order traversal": {
    plain:
      "Visiting a binary search tree left-subtree, node, right-subtree. It emits the values in sorted order, which is the quickest way to check a tree is a valid BST.",
    also: ["inorder", "in-order"],
  },
  trie: {
    plain:
      "A tree where the path from the root spells out a string, so all words with the same prefix share the same branch. This is what makes 'show me everything starting with dell' cheap.",
    also: ["tries", "prefix tree", "radix tree"],
  },
  "segment tree": {
    plain:
      "A tree where each node stores a summary (sum, minimum, maximum) of one slice of an array. It answers 'what is the total between positions 10 and 900' and handles updates, both in O(log n).",
    also: ["segment trees"],
  },
  "Fenwick tree": {
    plain:
      "A compact array that supports 'add to one position' and 'sum of everything up to position i', both in O(log n). Same job as a segment tree for sums, with less code and less memory. Also called a Binary Indexed Tree.",
    also: ["BIT", "Binary Indexed Tree", "Fenwick"],
  },

  /* ---------------- Graphs ---------------- */

  graph: {
    plain:
      "A set of nodes connected by edges. Roads between cities, followers between accounts, and imports between modules are all graphs.",
    also: ["graphs"],
  },
  edge: {
    plain:
      "A connection between two nodes, sometimes carrying a weight (a cost or distance).",
    also: ["edges"],
  },
  "directed graph": {
    plain:
      "A graph where edges point one way. 'A follows B' is directed; 'A and B are friends' is not.",
    also: ["directed", "digraph"],
  },
  "adjacency list": {
    plain:
      "Storing a graph as, for each node, the list of its neighbours. Uses memory proportional to the number of edges, which is why nearly every real graph uses it.",
    also: ["adjacency lists"],
  },
  "adjacency matrix": {
    plain:
      "Storing a graph as an n×n table where cell (i, j) says whether an edge exists. Instant edge lookups, but n² memory — only sensible for small or very dense graphs.",
    also: ["adjacency matrices"],
  },
  BFS: {
    plain:
      "Breadth-first search: explore all neighbours one step away, then two steps away, and so on, using a queue. On an unweighted graph the first time you reach a node is guaranteed to be by a shortest path.",
    also: ["breadth-first search", "breadth first search"],
  },
  DFS: {
    plain:
      "Depth-first search: follow one path as far as it goes, then back up and try the next branch. Uses a stack, or recursion, which is the same thing.",
    also: ["depth-first search", "depth first search"],
  },
  "topological sort": {
    plain:
      "Ordering the nodes of a directed graph so every arrow points forward — a valid build order when some tasks depend on others. It exists only if there are no cycles.",
    also: ["toposort", "topological order", "topological ordering"],
  },
  DAG: {
    plain:
      "Directed acyclic graph — arrows have direction and you can never loop back to where you started. Task dependencies and build graphs are DAGs; if one isn't, you have a circular dependency.",
    also: ["directed acyclic graph", "acyclic"],
  },
  cycle: {
    plain:
      "A path that returns to where it started. In a dependency graph a cycle means the work can never be ordered — something must be broken.",
    also: ["cycles", "cyclic"],
  },
  "spanning tree": {
    plain:
      "A set of edges that connects every node with no loops. The minimum spanning tree is the cheapest such set — the smallest amount of cable that still connects every building.",
    also: ["MST", "minimum spanning tree", "spanning trees"],
  },
  "union-find": {
    plain:
      "A structure that tracks which items are in the same group and merges groups fast. It answers 'are these two connected?' in effectively constant time. Also called disjoint set union.",
    also: ["DSU", "disjoint set", "disjoint set union", "union find"],
  },
  bipartite: {
    plain:
      "A graph whose nodes can be split into two groups with every edge crossing between them, never inside one. Students and courses, drivers and rides, workers and shifts.",
  },
  greedy: {
    plain:
      "Taking the best-looking option at each step and never reconsidering. Fast, and correct only when the problem has a property that guarantees local choices add up to a global optimum.",
    also: ["greedily"],
  },
  relaxation: {
    plain:
      "In shortest-path algorithms, checking whether going through a particular node gives a cheaper route than the best known so far, and if so, recording it.",
    also: ["relax", "relaxing"],
  },

  /* ---------------- Techniques ---------------- */

  "two pointers": {
    plain:
      "Walking two positions through a sequence under a rule that neither ever goes backwards, so the whole scan costs one pass instead of comparing every pair.",
    also: ["two-pointer", "two pointer", "two-pointers"],
  },
  "sliding window": {
    plain:
      "Keeping a range of the array as a 'window' and moving its two ends forward, adding what enters and subtracting what leaves — so you never recompute the whole range.",
    also: ["sliding windows"],
  },
  "prefix sum": {
    plain:
      "A precomputed running total, so the sum of any range is one subtraction: total up to the end, minus total up to just before the start.",
    also: ["prefix sums", "prefix-sum", "cumulative sum"],
  },
  "binary search": {
    plain:
      "Repeatedly halving a sorted range: check the middle, throw away the half that cannot contain the answer. Twenty steps is enough for a million items.",
  },
  monotonic: {
    plain:
      "Only ever moving one way — always increasing, or always decreasing, never both. Monotonic properties are what make binary search and two pointers valid.",
    also: ["monotonicity", "monotone"],
  },
  recursion: {
    plain:
      "A function that calls itself on a smaller version of the same problem, with a base case that stops it.",
    also: ["recursive", "recursively"],
  },
  memoisation: {
    plain:
      "Caching a function's result the first time it is computed so the same call never runs twice. It turns exponential recursion into something linear without changing the logic.",
    also: ["memoization", "memoise", "memoize", "memoized", "memoised"],
  },
  "dynamic programming": {
    plain:
      "Solving a problem by solving its smaller overlapping sub-problems once each and reusing the answers. The whole skill is finding a 'state' that captures everything you need to remember.",
    also: ["DP"],
  },
  state: {
    plain:
      "In dynamic programming, the small set of facts that fully describes a sub-problem. If two situations have the same state, they have the same answer — that is what makes reuse safe.",
  },
  "state space": {
    plain:
      "All the distinct states a dynamic programming solution can be in. Its size, times the work per state, is the running time.",
  },
  recurrence: {
    plain:
      "The one-line rule that builds a sub-problem's answer out of smaller ones — for example 'the best up to house i is the better of skipping it or taking it'. Writing it in plain words before any code is most of the work.",
    also: ["recurrences", "recurrence relation"],
  },
  "base case": {
    plain:
      "The smallest sub-problem, whose answer you write down by hand because the recurrence would otherwise read off the end of the table. Every DP and every recursion needs at least one.",
    also: ["base cases"],
  },
  tabulation: {
    plain:
      "Filling a dynamic programming table with loops, from the smallest sub-problem upward, so every value is ready before anything reads it. The same recurrence as memoised recursion, with no call stack.",
    also: ["tabulate", "tabulated", "bottom-up", "bottom up"],
  },
  "top-down": {
    plain:
      "Starting from the question you actually want answered and recursing into the sub-problems it needs, caching as you go. The opposite of filling a table bottom-up.",
    also: ["top down"],
  },
  "optimal substructure": {
    plain:
      "The property that an optimal answer to the whole problem is built out of optimal answers to its parts. Without it, reusing a sub-problem's best answer can be wrong, and dynamic programming does not apply.",
  },
  "overlapping subproblems": {
    plain:
      "The property that the same smaller question comes up many times while solving the big one. It is what makes caching pay — with no repeats, memoisation stores a lot and saves nothing.",
    also: ["overlapping sub-problems", "sub-problem", "subproblem", "sub-problems", "subproblems"],
  },
  "pseudo-polynomial": {
    plain:
      "A running time that looks polynomial but is measured against a number's VALUE rather than against how many digits it takes to write. O(n·C) for a capacity C of ten thousand is fine; the same formula with a capacity of ten billion is not, even though the input only grew by six characters.",
    also: ["pseudopolynomial", "pseudo polynomial"],
  },
  "NP-hard": {
    plain:
      "At least as difficult as a large family of problems for which nobody has ever found a fast exact method, and most people believe none exists. In practice it means: expect to choose between an exact answer on small inputs and a good-enough answer on large ones.",
    also: ["NP hard", "NP-complete", "NP complete"],
  },
  heuristic: {
    plain:
      "A rule that usually gives a good answer without any guarantee it gives the best one. Worth reaching for when the exact method is too slow — and worth saying out loud that you have, because 'good' and 'optimal' are different promises.",
    also: ["heuristics"],
  },
  "exchange argument": {
    plain:
      "A way of proving a choice is safe: show that any better answer could be rewritten to use your choice without getting worse. It is the standard proof shape behind greedy algorithms, and its absence is the standard reason greedy fails.",
  },
  subsequence: {
    plain:
      "Items taken from a sequence in their original order, but not necessarily next to each other. In 'algorithm', 'log' is a subsequence. Contrast with a subarray, which must be contiguous.",
    also: ["subsequences"],
  },
  subarray: {
    plain:
      "A contiguous stretch of a sequence — a run with nothing skipped. In [1, 2, 3, 4], [2, 3] is a subarray but [1, 3] is not.",
    also: ["subarrays", "substring", "substrings"],
  },
  "edit distance": {
    plain:
      "The smallest number of single-character insertions, deletions or substitutions that turn one string into another. It is what powers spell-checkers, fuzzy name matching and diff tools.",
    also: ["Levenshtein", "Levenshtein distance"],
  },
  "longest common subsequence": {
    plain:
      "The longest run of characters appearing in both strings in the same order, though not necessarily together. Diff tools use it to decide which lines are 'the same line' in two versions of a file.",
    also: ["LCS"],
  },
  "critical path": {
    plain:
      "The longest chain of steps that must happen one after another. It is the floor on how fast the whole job can finish no matter how many workers or machines you add, so it tells you when buying more parallelism will stop helping.",
    also: ["critical paths"],
  },
  Viterbi: {
    plain:
      "The algorithm that finds the most likely sequence of hidden states behind a series of noisy observations — which road you were actually on, given drifting GPS fixes. It is state-machine DP with probabilities in place of costs.",
    also: ["Viterbi algorithm"],
  },
  "rolling array": {
    plain:
      "Keeping only the last row or two of a dynamic programming table instead of all of it, because the recurrence never reads further back. Cuts the memory without changing the answer — and loses the ability to reconstruct which choices were made.",
    also: ["rolling variables", "rolling window"],
  },
  backtracking: {
    plain:
      "Building a solution one choice at a time and undoing the last choice when it leads nowhere. It is depth-first search over the space of possible answers.",
    also: ["backtrack"],
  },
  "divide and conquer": {
    plain:
      "Splitting a problem in half, solving each half, and combining the results. Merge sort and binary search are both this shape.",
    also: ["divide-and-conquer"],
  },
  "bit manipulation": {
    plain:
      "Working directly with the individual 1s and 0s of a number. A 64-bit integer can act as a set of 64 yes/no flags that you can union, intersect and test in one CPU instruction.",
    also: ["bitwise", "bitmask", "bitmasks", "bit mask"],
  },
  popcount: {
    plain:
      "How many bits of a number are set to 1. Most processors compute it in a single instruction, which is why treating a set as an integer makes 'how many members' free.",
    also: ["population count", "set bits"],
  },
  "stable sort": {
    plain:
      "A sort that keeps equal items in their original relative order. It is what lets you sort by city, then by name, and still have the city grouping intact.",
    also: ["stability", "stable sorting", "stable"],
  },
  quickselect: {
    plain:
      "Finding the k-th smallest item without sorting everything, by partitioning like quicksort but only recursing into the side that contains the answer. O(n) on average.",
  },

  /* ---------------- Systems vocabulary ---------------- */

  cache: {
    plain:
      "A small fast store holding results you expect to need again, so the slow original lookup is skipped. Its whole design question is what to throw out when it fills.",
    also: ["caching", "cached"],
  },
  eviction: {
    plain:
      "Deciding what to remove from a full cache. LRU evicts whatever was used longest ago.",
    also: ["evict", "evicted", "LRU"],
  },
  idempotent: {
    plain:
      "Safe to do more than once — running it twice leaves the same result as running it once. Essential when a network retry might deliver the same request twice.",
    also: ["idempotence", "idempotency"],
  },
  "Bloom filter": {
    plain:
      "A tiny structure that answers 'have I seen this before?' using far less memory than storing the items. It can say 'definitely not seen' or 'probably seen' — never a false 'not seen'.",
    also: ["Bloom filters"],
  },
  "false positive": {
    plain:
      "The system says yes when the truth is no. In a Bloom filter this is allowed and tunable; a false negative is not.",
    also: ["false positives", "false negative", "false negatives"],
  },
  "consistent hashing": {
    plain:
      "Placing servers and keys on a circle so that adding or removing one server moves only a small share of the keys, instead of shuffling everything.",
  },
  backpressure: {
    plain:
      "Telling a fast producer to slow down because the consumer cannot keep up. Without it, queues grow until memory runs out.",
  },
  "garbage collection": {
    plain:
      "The runtime automatically reclaiming memory you are no longer using. It helps enormously, and it occasionally pauses your program at an inconvenient moment.",
    also: ["GC", "garbage collector"],
  },
  "call stack": {
    plain:
      "The runtime's record of which function called which. Every recursive call adds a frame, and too many frames is a stack overflow.",
    also: ["stack frame", "stack frames", "stack overflow"],
  },
  "race condition": {
    plain:
      "A bug where the result depends on which of two concurrent operations happens to run first. It usually passes tests and fails in production.",
    also: ["race conditions"],
  },
  "lock-free": {
    plain:
      "Coordinating threads with atomic CPU instructions rather than locks, so one stalled thread cannot block the others.",
    also: ["lock free", "compare-and-swap", "CAS"],
  },
  streaming: {
    plain:
      "Processing data as it arrives, one item at a time, without ever holding all of it in memory. It rules out anything that needs to sort or re-read the input.",
    also: ["stream", "streams"],
  },
};

export type Glossary = Record<string, GlossaryEntry>;

/**
 * Surface form → canonical key. Longest forms first so that
 * "binary search tree" wins over "binary search" when both could match.
 *
 * Each subject carries its own glossary (see `subjects.ts`), because the same
 * word means different things in different subjects: DSA's "node" is a tree
 * node, and in a trading course "high-volume node" must not link to it.
 */
export function glossaryForms(g: Glossary): { form: string; key: string }[] {
  return Object.entries(g)
    .flatMap(([key, entry]) => [
      { form: key, key },
      ...(entry.also ?? []).map((form) => ({ form, key })),
    ])
    .sort((a, b) => b.form.length - a.form.length);
}

export const GLOSSARY_FORMS = glossaryForms(GLOSSARY);

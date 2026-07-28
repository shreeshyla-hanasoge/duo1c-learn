import type { Topic } from "../types.ts";

export const skipLists: Topic = {
  id: "skip-lists",
  title: "Skip lists",
  tier: 4,
  week: 18,
  depth: "deep",
  summary: "Probabilistic balancing without a single rotation.",
  why: "Order books and concurrent maps use them because the absence of rebalancing makes concurrent access far simpler.",
  complexity: "O(log n) expected",
  viz: ["skip-list"],
  learn: {
    intuition:
      "A sorted linked list is easy to reason about and hopeless to search: you walk it one node at a time. The idea behind a skip list is the same one behind an express train. Keep the ordinary list at the bottom, then build a sparser list above it containing perhaps half the nodes, and a sparser one above that, and so on. To find something, start at the top and run forward until the next node would overshoot your target, then drop down a level and continue. Each level you descend roughly halves the remaining distance, so the search is logarithmic — the same shape as a binary search tree, arrived at completely differently. The remarkable part is how a node's level is decided: by flipping a coin. When you insert, you keep flipping until you get tails, and that count is your height. There is no rebalancing, no rotation, no case analysis about which of five configurations you are in. The structure has no idea whether it is balanced and never tries to be, and the probability distribution alone keeps it within a constant factor of ideal. That absence of global restructuring is not merely a simplification — it is the property that makes concurrent access tractable, because a writer only ever touches a handful of adjacent pointers rather than rearranging a subtree.",
    mechanics: [
      {
        heading: "A tower of increasingly sparse linked lists",
        body: "Level 0 holds every element in sorted order. Each higher level holds a subset of the level below. A node that reaches level 3 appears in levels 0, 1, 2 and 3, so it can be thought of as having a tower of forward pointers, one per level it reaches.",
      },
      {
        heading: "Search: go right while you can, then drop",
        body: "Start at the highest level of the head. Advance while the next node's key is still less than your target; when it would overshoot, drop one level and repeat. At level 0 the next node is either your target or proves it absent. The path is naturally a staircase, and it visits about log n nodes.",
      },
      {
        heading: "Coin flips replace rebalancing logic",
        body: "On insert, flip a coin until it comes up tails; the number of flips is the node's height. With probability one half, half the nodes reach level 1, a quarter reach level 2, and so on — which is exactly the distribution that makes the search logarithmic. No rotations, no colour changes, no case analysis. The comparison worth internalising: a red-black tree's delete has several cases and is genuinely hard to write correctly; a skip list's delete is unlinking a node from each level it occupies.",
      },
      {
        heading: "Insert needs the update path, not just the position",
        body: "While searching for the insertion point, record for each level the last node you were at before dropping down. That array of predecessors is what you splice the new node into. Forgetting to record it and searching again per level works and turns one O(log n) descent into several.",
      },
      {
        heading: "Expected, not guaranteed — and the difference is real",
        body: "O(log n) is the expected cost. A pathological run of coin flips could make every node height 1 and turn the structure into a plain linked list. The probability is vanishingly small and, importantly, it does not depend on the input at all — an adversary who knows your keys cannot force bad behaviour, only one who can predict your random number generator. That is a genuinely different guarantee from a hash table's, where adversarial keys are a real attack, and it is worth being precise about in a design review.",
      },
    ],
    complexityDerivation:
      "With promotion probability one half, a node reaches level k with probability 2^-k, so the expected number of levels is about log₂(n) and the highest level is O(log n) with high probability. The search cost is the elegant part of the argument, and it is easiest to see backwards. Trace the search path from the end toward the start: at each node on the path you either came from the left at the same level, or dropped down from above. Coming from above happens with probability one half — it is precisely the event that the node was promoted — so the expected number of steps to climb one level is two. With O(log n) levels, the expected path length is O(log n). Memory is the other half of the picture: the expected number of pointers per node is 1 + 1/2 + 1/4 + … = 2, so a skip list holds about twice as many pointers as a plain linked list. Against a red-black tree that is comparable, though skip-list nodes are variable-sized and scattered, so a B-tree beats both badly on cache behaviour, which is why databases index with B-trees rather than either. What a skip list actually buys is not speed but simplicity of concurrent modification: an insert touches O(log n) pointers, all adjacent, with no restructuring above them — so it can be done with per-node locks or atomic compare-and-swap, which is exactly what a balanced tree's rotations make impossible.",
    variants: [
      {
        name: "Classic skip list, p = 1/2",
        when: "The default.",
        delta:
          "Expected two pointers per node, search about log₂(n). The standard starting point.",
      },
      {
        name: "p = 1/4",
        when: "Memory matters more than a slightly shorter search.",
        delta:
          "Expected 1.33 pointers per node instead of 2, with roughly twice the search steps. Redis uses this, which is a deliberate memory choice at scale.",
      },
      {
        name: "Indexable skip list",
        when: "You also need 'the k-th element' or a rank.",
        delta:
          "Store the span of each forward pointer — how many level-0 nodes it jumps. Rank queries become O(log n) by summing spans along the descent, which is how Redis sorted sets answer ZRANK.",
      },
      {
        name: "Concurrent lock-free skip list",
        when: "A shared ordered map under many threads.",
        delta:
          "Java's ConcurrentSkipListMap. Nodes are linked with atomic compare-and-swap and deletion is two-phase — mark, then unlink — so readers never see a half-removed node.",
      },
    ],
    tradeoffs: [
      {
        vs: "A balanced binary search tree",
        pick: "The skip list when concurrency or implementation simplicity dominates",
        because:
          "Both give O(log n) search, one guaranteed and one expected, with comparable memory. A red-black tree's delete has several cases and is genuinely difficult to write correctly; a skip list's is unlinking from each level. More importantly, a tree's rotations restructure a whole subtree, which is very hard to make safe for concurrent readers, whereas a skip-list insert touches a handful of adjacent pointers. Choose the tree when you need a worst-case guarantee rather than an expected one.",
      },
      {
        vs: "A B-tree",
        pick: "The B-tree whenever the data does not fit comfortably in cache, and always on disk",
        because:
          "Skip-list nodes are small, individually allocated and scattered, so every level of the descent is likely a cache miss — and on disk, a page read. A B-tree packs many keys per node, so one page read covers what a skip list would spend several on. This is why every database index is a B-tree and no database index is a skip list, and it is a constant-factor argument that completely dominates the identical asymptotics.",
      },
      {
        vs: "A sorted array with binary search and splice",
        pick: "The array up to a few thousand elements — this was measured, not assumed",
        because:
          "Inserting into a sorted array is O(n) because everything after the insertion point shifts. In theory that loses badly to O(log n). In practice the shift compiles to a single `memmove` over contiguous memory, which is one of the fastest operations a machine performs, while the skip list chases a pointer to a fresh cache line at every level. Measured on this topic's own lab workload, the sorted array grows 3.12-3.17x per doubling from n = 1000 to 8000 and the skip list grows 2.63-2.67x — the asymptotically worse structure is only marginally worse in practice, and below about n = 4000 it is genuinely faster. The skip list wins at larger n, and it wins immediately under concurrency. Below that, an O(n) algorithm with a memmove constant beats an O(log n) one with a cache-miss constant.",
      },
      {
        vs: "A hash map",
        pick: "The hash map unless you need order",
        because:
          "O(1) beats O(log n) and the constant is smaller too. The skip list earns its place only when you need something a hash cannot provide: sorted iteration, range queries, predecessor and successor lookups, or rank. If the only operations are get and put by exact key, the ordered structure is paying for a capability nobody is using.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — the option chain as an ordered ladder",
      kind: "yours",
      problem:
        "Strikes must stay in price order while quotes update continuously, and the common queries are ranges and neighbours — 'strikes within 5% of spot', 'the next strike above this one' — which a hash map cannot answer at all.",
      applied:
        "An ordered structure keyed by strike gives predecessor and successor in O(log n) and range scans by walking level 0 from the entry point. This is precisely the case where the ordered structure's extra cost buys something: the queries are range-shaped, so O(1) exact lookup would not help.",
      evidence: "strategy-engine/app/services/strike_selection_service.py",
      impact: "Re-sorting or scanning per query → O(log n) entry and a linear walk of just the range",
    },
    {
      system: "Redis sorted sets",
      kind: "industry",
      problem:
        "Leaderboards and priority queues needing insert, delete, rank lookup and range-by-score, all fast, over millions of members.",
      applied:
        "A skip list keyed by score, paired with a hash map from member to score so exact lookups stay O(1). Redis stores the span of each forward pointer, which is what makes ZRANK O(log n) instead of a walk. It also uses p = 1/4 rather than 1/2, trading a slightly longer search for a third less pointer memory — a very deliberate choice at that scale.",
      evidence: "Redis `t_zset.c`, ZSKIPLIST_P = 0.25",
      impact:
        "One structure serving rank, range and ordered iteration, with O(1) exact lookup alongside",
    },
    {
      system: "Java's ConcurrentSkipListMap",
      kind: "industry",
      problem:
        "A sorted map shared across many threads. A balanced tree's rotations restructure whole subtrees, which is extremely hard to make safe for concurrent readers without locking the tree.",
      applied:
        "A lock-free skip list where links are updated with atomic compare-and-swap. Deletion is two-phase — mark the node logically deleted, then unlink it — so a reader traversing concurrently never observes a half-removed node. This is the clearest demonstration of the structure's real advantage: not speed, but that local modification is possible at all.",
      impact: "A concurrent sorted map with no global lock and no restructuring",
    },
    {
      system: "LevelDB and RocksDB memtables",
      kind: "industry",
      problem:
        "The in-memory write buffer of a log-structured store must accept writes at high rate while staying sorted, because it is flushed to disk as a sorted file.",
      applied:
        "A skip list holds the memtable. Writes go in at O(log n) with no rebalancing, concurrent readers proceed without blocking writers, and the flush is a single ordered walk of level 0. Note the contrast within the same system: the memtable is a skip list and the on-disk index is a B-tree, because the cache and page arguments point opposite ways in memory and on disk.",
      impact:
        "High-rate sorted inserts with lock-free reads, flushed by one linear traversal",
    },
  ],
  lab: {
    prompt:
      "Build an ordered set supporting successor queries. `ops` is a list: `[0, v]` inserts `v` (duplicates are ignored), and `[1, v]` returns the smallest inserted value greater than or equal to `v`, or −1 if there is none. Return one result per query, in order. Budget: O(log n) expected per operation — build an actual skip list. This lab has no complexity gate, and the reason is worth knowing: a sorted array with `splice` is O(n) per insert and still measures almost as fast at these sizes, because the shift is a `memmove`. The gate could not tell the two apart, so the tests carry this one and the trade-off section carries the measurement.",
    fnName: "orderedSet",
    signature: "orderedSet(ops: number[][]): number[]",
    starter: `function orderedSet(ops) {
// Your budget: O(log n) expected per operation.
// A skip list: level 0 holds everything in order, and each higher
// level holds a random subset of the level below. Search by running
// forward while the next value is still too small, then dropping down.
// On insert, record the last node visited at EACH level — that array
// of predecessors is what you splice into.

return [];
}`,
    tests: [
      {
        // successor(0)=1, successor(5)=5, successor(6)=9, successor(10)=-1
        name: "successor queries",
        input: [[[0, 5], [0, 1], [0, 9], [1, 0], [1, 5], [1, 6], [1, 10]]],
        expected: [1, 5, 9, -1],
      },
      {
        // "Greater than or EQUAL" — an exact match is its own successor.
        name: "exact match is its own successor",
        input: [[[0, 3], [1, 3]]],
        expected: [3],
      },
      {
        name: "query on an empty set",
        input: [[[1, 1]]],
        expected: [-1],
      },
      {
        // Inserting the same value repeatedly must not create duplicates
        // or break the level-0 ordering.
        name: "duplicates are ignored",
        input: [[[0, 4], [0, 4], [0, 4], [1, 4], [1, 5]]],
        expected: [4, -1],
      },
      {
        // Negatives, and -1 as a sentinel is distinguishable from a real
        // value only because -5 IS present here.
        name: "negative values",
        input: [[[0, -5], [0, 0], [0, 5], [1, -10], [1, -4], [1, 1]]],
        expected: [-5, 0, 5],
      },
      { name: "no queries", input: [[[0, 1], [0, 2]]], expected: [], hidden: true },
      {
        name: "every query misses",
        input: [[[0, 1], [0, 2], [1, 3], [1, 100]]],
        expected: [-1, -1],
        hidden: true,
      },
      {
        // Inserts interleaved with queries: the answer must change as
        // smaller values arrive.
        name: "interleaved inserts and queries",
        input: [[[0, 10], [1, 5], [0, 3], [1, 5], [0, 7], [1, 5]]],
        expected: [10, 10, 7],
        hidden: true,
      },
    ],
    hints: [
      "Represent the list as a head node with an array of forward pointers, one per level. Each node holds its value and its own array of forward pointers — its height.",
      "To search for `v`, start at the top level. While `forward[level]` exists and its value is less than `v`, move there. Otherwise drop a level. At the bottom, `forward[0]` is the successor candidate.",
      "For insert, do that same descent but record the last node visited at each level in an `update` array. Then pick a random height by flipping a coin until it fails, and splice the new node in at every level up to that height using `update`.",
    ],
    solution: `function orderedSet(ops) {
const MAX_LEVEL = 16;          // enough for well past 2^16 elements
const out = [];

// Head is a sentinel whose forward pointers start the search at each
// level. A node is { value, forward: [] }.
const head = { value: -Infinity, forward: new Array(MAX_LEVEL).fill(null) };
let level = 1;                 // highest level currently in use

// Deterministic "coin flips" from a small LCG. A real skip list uses
// a real random source; a fixed sequence keeps the lab reproducible
// without changing the structure or its bounds.
let seed = 12345;
const randomHeight = () => {
  let h = 1;
  while (h < MAX_LEVEL) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    if ((seed >> 10) & 1) break;   // tails — stop growing
    h++;
  }
  return h;
};

// Shared descent: returns the last node visited at each level, which
// is both the search result (update[0].forward[0]) and exactly what
// an insert needs to splice into.
const update = new Array(MAX_LEVEL);
function descend(v) {
  let node = head;
  for (let i = level - 1; i >= 0; i--) {
    // Run forward while the next value is still too small...
    while (node.forward[i] !== null && node.forward[i].value < v) {
      node = node.forward[i];
    }
    update[i] = node;            // ...then drop down, remembering where
  }
  return node;
}

for (const op of ops) {
  if (op[0] === 1) {
    descend(op[1]);
    const next = update[0].forward[0];
    // "Greater than or equal", so an exact match is its own successor.
    out.push(next === null ? -1 : next.value);
    continue;
  }

  const v = op[1];
  descend(v);
  if (update[0].forward[0] !== null && update[0].forward[0].value === v) {
    continue;                    // already present — duplicates ignored
  }

  const h = randomHeight();
  if (h > level) {
    // New levels start from the head, which was never visited above
    // the old top level.
    for (let i = level; i < h; i++) update[i] = head;
    level = h;
  }

  const node = { value: v, forward: new Array(h).fill(null) };
  for (let i = 0; i < h; i++) {
    node.forward[i] = update[i].forward[i];
    update[i].forward[i] = node;
  }
}

return out;
}`,
    // No complexityGate, and the reason is a measured finding rather than
    // an oversight — see the "sorted array" trade-off below.
    //
    // The obvious wrong answer here is a sorted array with a binary search
    // and `splice` per insert, which is O(n) per insert. Measured across
    // n = 1000..8000 it grows 3.12-3.17x per doubling against the 3.15x
    // limit for O(n log n), while the skip list itself measures 2.63-2.67x
    // against a 2.68x headroom line. At n = 500..4000 the splice version
    // drops to 2.7x and passes comfortably. There is no size range where
    // the gate both clears the correct solution and rejects the wrong one,
    // because V8 implements splice as a memmove whose constant is so small
    // that O(n) barely reads as super-linear at any size a lab can run.
    //
    // A gate that cannot separate the two is worse than none: it would
    // reject correct submissions on an unlucky run. The tests carry this
    // lab instead.
  },
  insights: [
    {
      t: "Coin flips replace rebalancing logic",
      d: "A node's height is decided by flipping until tails, so half the nodes reach level 1, a quarter level 2, and so on. No rotations, no colour changes, no case analysis — the distribution alone keeps the search logarithmic.",
    },
    {
      t: "Expected, not guaranteed",
      d: "A pathological run of flips could degenerate to a linked list. The probability is vanishingly small and, unlike a hash table, it does not depend on the input — an adversary must predict your random source, not your keys.",
    },
    {
      t: "Concurrency-friendly",
      d: "An insert touches O(log n) adjacent pointers with no restructuring above them, so it works with per-node locks or compare-and-swap. A balanced tree's rotations rearrange whole subtrees, which is what makes them hard to share.",
    },
    {
      t: "Expected two pointers per node",
      d: "1 + 1/2 + 1/4 + … = 2, so memory is about twice a plain linked list. Redis uses p = 1/4 instead, cutting that to 1.33 pointers at the cost of a longer search — a deliberate trade at scale.",
    },
    {
      t: "A B-tree beats it whenever cache or disk is involved",
      d: "Skip-list nodes are small and scattered, so each level of the descent is likely a cache miss. B-trees pack many keys per node, which is why database indexes are B-trees despite the identical asymptotics.",
    },
    {
      t: "Below a few thousand elements, a sorted array wins",
      d: "Measured on this topic's lab: the O(n)-per-insert sorted array grows 3.12–3.17× per doubling and the skip list 2.63–2.67×. A `memmove` over contiguous memory beats a chain of cache misses, so the asymptotically worse structure is faster until n is large or the access is concurrent.",
    },
  ],
  pitfalls: [
    "Searching again for each level during insert instead of recording the update path, which turns one O(log n) descent into several.",
    "Forgetting to point the new levels at the head when a node's height exceeds the current top level, leaving the tower dangling.",
    "Quoting O(log n) as a worst-case guarantee. It is expected, and a review will ask which one you meant.",
    "Choosing a skip list for an on-disk or cache-sensitive index. The asymptotics match a B-tree and the constants do not.",
  ],
  quiz: [
    {
      q: "How does a skip list stay balanced?",
      options: [
        "Rotations, like a red-black tree",
        "It does not try to — node heights come from coin flips, and the probability distribution alone gives expected O(log n)",
        "Periodic rebuilding",
        "By counting subtree sizes",
      ],
      answer: 1,
      difficulty: "recall",
      why: "There is no balancing logic at all. Half the nodes reach level 1, a quarter level 2, and that geometric distribution is what makes the search logarithmic.",
      distractors: [
        "The complete absence of rotations is the structure's defining feature and the reason it is easy to make concurrent.",
        "",
        "Nothing is ever rebuilt. Each insert is a local splice and the structure is never inspected globally.",
        "Subtree sizes are tracked in an INDEXABLE skip list to answer rank queries — a separate feature that has nothing to do with balance.",
      ],
    },
    {
      q: "A skip list's O(log n) is:",
      options: [
        "A worst-case guarantee",
        "Expected — a pathological run of coin flips could degenerate to a linked list, though it is vanishingly unlikely",
        "An amortised bound",
        "An average over all possible inputs",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The randomness is in the structure rather than in the input, so the bound is probabilistic. The distinction matters when a worst-case guarantee is actually required.",
      distractors: [
        "A balanced tree gives a worst-case guarantee. Claiming one here is the mistake this question exists to catch.",
        "",
        "Amortised means expensive operations are rare but bounded, as with dynamic array growth. Here no bound is guaranteed at all — only made improbable.",
        "The randomness comes from the coin flips, not from the input distribution. The bound holds for any input, including adversarial ones.",
      ],
    },
    {
      q: "Why does concurrency favour a skip list over a balanced tree?",
      options: [
        "Skip lists are faster",
        "An insert touches O(log n) adjacent pointers with no restructuring above them, whereas a tree's rotations rearrange whole subtrees",
        "Skip lists are immutable",
        "Trees cannot be shared between threads",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Local modification is what makes fine-grained locking or compare-and-swap possible. A rotation changes the relationship between a node, its parent and its grandparent, which a concurrent reader can observe mid-flight.",
      distractors: [
        "Single-threaded, a good tree is usually slightly faster. The advantage is entirely about what can be modified safely in place.",
        "",
        "They are fully mutable. Immutable structures are a different approach to the same problem.",
        "Trees can be shared with a lock. The point is that they need a coarser one, which is what limits throughput.",
      ],
    },
    {
      q: "Redis uses p = 1/4 rather than 1/2 for its sorted sets. What is the trade?",
      options: [
        "Faster searches, more memory",
        "About 1.33 pointers per node instead of 2, at the cost of roughly twice as many search steps",
        "Better worst-case behaviour",
        "Simpler code",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Lower promotion probability means fewer nodes at higher levels — less pointer memory, sparser express lanes, longer searches. At Redis's scale, with millions of members in RAM, memory is worth more than a few extra pointer hops.",
      distractors: [
        "Backwards on both counts: p = 1/4 gives slower searches and less memory.",
        "",
        "The worst case is degenerate at any p. Lowering it makes degeneracy marginally more likely, not less.",
        "The code is identical apart from one constant.",
      ],
    },
    {
      q: "Your insert re-runs the search for each level instead of recording the update path. What is the cost?",
      options: [
        "It is incorrect",
        "It is still correct but does O(log n) descents instead of one, making insert O(log² n)",
        "It uses more memory",
        "It breaks the level distribution",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The predecessors at every level are all found during a single descent — that is what the update array captures. Searching again per level repeats work already done and squares the logarithm.",
      distractors: [
        "The result is a correctly formed skip list. That is what makes this an efficiency bug rather than a visible one.",
        "",
        "Recording the update path uses slightly MORE memory — an array of O(log n) references — and saves the repeated descents.",
        "Heights still come from the same coin flips; only how you locate the splice points changes.",
      ],
    },
    {
      q: "You need an on-disk ordered index. Skip list or B-tree?",
      options: [
        "Skip list — the asymptotics are the same and it is simpler",
        "B-tree: it packs many keys per node so one page read covers what a skip list would spend several descents on",
        "Skip list, because it has no rebalancing",
        "Either — they perform identically",
      ],
      answer: 1,
      difficulty: "judge",
      why: "On disk the unit of cost is the page read, not the comparison. A skip list's small scattered nodes mean a read per level; a B-tree node holds hundreds of keys, so the same descent takes a handful of reads. This is why every database index is a B-tree.",
      distractors: [
        "Identical asymptotics and a constant factor of hundreds, which is exactly the case where asymptotics mislead.",
        "",
        "A genuine advantage in memory under concurrency, and irrelevant against the page-read cost that dominates on disk.",
        "They differ by orders of magnitude here. Equal Big-O with wildly unequal constants is the whole lesson.",
      ],
    },
    {
      q: "How does Redis answer ZRANK — 'what position is this member at' — in O(log n)?",
      options: [
        "It scans level 0 counting nodes",
        "Each forward pointer stores its span, the number of level-0 nodes it jumps, and the descent sums the spans it follows",
        "It keeps a separate sorted array",
        "It uses the hash map",
      ],
      answer: 1,
      difficulty: "judge",
      why: "An indexable skip list augments every forward pointer with how far it reaches. Summing those spans along the search path gives the rank for the price of the descent you were already doing.",
      distractors: [
        "That is O(n) and is precisely what the span augmentation avoids.",
        "",
        "A sorted array would make every insert O(n) to shift elements, which defeats the structure.",
        "The hash map gives a member's score in O(1) — it has no notion of position, which is why the skip list is needed alongside it.",
      ],
    },
    {
      q: "The only operations are get and put by exact key. What should you use?",
      options: [
        "A skip list, for predictable performance",
        "A hash map — O(1) with a smaller constant, since no ordering is being used",
        "A balanced tree",
        "A sorted array",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Ordered structures cost a logarithm and extra memory to provide range queries, successor lookups, sorted iteration and rank. If none of those are used, you are paying for a capability nobody asked for.",
      distractors: [
        "O(log n) expected against O(1), plus about two pointers per node, to deliver ordering that is never queried.",
        "",
        "The same objection with a worst-case guarantee attached — still ordering nobody needs.",
        "O(n) per insert to keep an order that no operation reads.",
      ],
    },
  ],
};

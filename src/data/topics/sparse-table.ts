import type { Topic } from "../types.ts";

export const sparseTable: Topic = {
  id: "sparse-table",
  title: "Sparse table",
  tier: 4,
  week: 18,
  depth: "core",
  summary: "O(1) range min/max on immutable data.",
  why: "When the array never changes, you can beat a segment tree outright — O(1) queries after an O(n log n) build.",
  complexity: "O(n log n) build · O(1) query",
  learn: {
    intuition:
      "A segment tree answers a range query by stitching together a handful of blocks, which costs a logarithm. If you could cover the whole range with just *one* stored block you would be done instantly, but you cannot precompute a block for every possible range — there are n²/2 of them. Here is the trick that gets you to two blocks: precompute the answer only for ranges whose length is a power of two. There are just n log n of those, which is affordable. Now take any query range of length L, and let K be the largest power of two that fits inside it. One block of length K starting at the left end, and one block of length K ending at the right end, together cover the entire range — and they overlap in the middle, because 2K is at least L. Two lookups and one merge, regardless of how long the range is. The overlap is the whole idea and it is also the whole limitation: it only works when covering something twice is harmless. Minimum does not care that you counted an element twice. A sum very much does.",
    mechanics: [
      {
        heading: "Store the answer for every power-of-two length",
        body: "`table[k][i]` is the answer for the block of length `2^k` starting at index `i`. Level 0 is the array itself; each higher level is built from the one below by merging two half-length blocks: `table[k][i] = merge(table[k-1][i], table[k-1][i + 2^(k-1)])`. There are log n levels of about n entries each, which is where the O(n log n) build and memory come from.",
      },
      {
        heading: "A query is two overlapping blocks",
        body: "For range `[l, r]` of length `L = r - l + 1`, take `k = floor(log2(L))`. Then `merge(table[k][l], table[k][r - 2^k + 1])` — one block anchored at the left end, one at the right. Since `2^k > L/2`, the two together cover everything, with a deliberate overlap in the middle.",
      },
      {
        heading: "The operation must be idempotent, not merely associative",
        body: "Because the two blocks overlap, some elements are merged in twice. That is only safe when `merge(x, x) === x`. Minimum, maximum, gcd and bitwise AND or OR all satisfy this. Addition does not, so a sparse table cannot do range sums — but a plain prefix-sum array already does those in O(1), so nothing is actually lost. This is a stronger requirement than a segment tree's, and it is the first thing to check.",
      },
      {
        heading: "Precompute the logarithms",
        body: "Calling `Math.log2` per query works and is slower than the lookup it guards. Fill a small array once — `log[1] = 0`, `log[i] = log[i >> 1] + 1` — and read it. On a hot query path this is a real difference, because the whole point of the structure is that a query is a couple of memory reads.",
      },
      {
        heading: "Immutable only, and the rebuild is total",
        body: "Changing one element invalidates every block containing it, which is about log n blocks per level across every level. There is no incremental update — you rebuild. That is the price of O(1) queries, and it makes the deciding question not 'which is faster' but 'are there any writes at all'. One write per thousand queries may still favour rebuilding; one per ten does not.",
      },
    ],
    complexityDerivation:
      "The table has log₂(n) levels and each level holds fewer than n entries, each computed by one merge from the level below, so the build is O(n log n) in both time and memory. A query does one logarithm lookup, two array reads and one merge — genuinely O(1), with no dependence on the range length at all, which is the property no tree structure can offer. Compare the alternatives honestly. A segment tree builds in O(n) and queries in O(log n), so it wins on build and memory and loses on query. The crossover is straightforward arithmetic: with q queries the sparse table costs n log n + q and the segment tree costs n + q log n, so the sparse table wins once q grows past roughly n. Below that the build dominates and you have paid a log factor to save one. There is also a theoretical refinement worth knowing exists — the Fischer–Heun structure achieves O(n) build with O(1) queries by blocking the array and only building a sparse table over block minima. It is rarely worth implementing, but knowing the O(n)/O(1) combination is achievable stops you from claiming n log n is a lower bound.",
    variants: [
      {
        name: "Range minimum or maximum",
        when: "The default use, on immutable data.",
        delta: "`Math.min` or `Math.max` as the merge. Both idempotent, so overlap is free.",
      },
      {
        name: "Range gcd, AND, OR",
        when: "Other idempotent merges.",
        delta:
          "Identical structure. gcd(x, x) = x, and both bitwise operations are idempotent, so all three work unchanged.",
      },
      {
        name: "Disjoint sparse table",
        when: "You need a NON-idempotent operation — sum, product, matrix multiply — on immutable data.",
        delta:
          "Blocks are arranged so that any query is covered by exactly two DISJOINT pieces, removing the double-count. Still O(1) queries, more complex build, and it lifts the idempotence requirement entirely.",
      },
      {
        name: "Sparse table over an Euler tour, for lowest common ancestor",
        when: "Repeated LCA queries on a static tree.",
        delta:
          "Flatten the tree by a depth-first walk, and LCA becomes range minimum over depths. O(1) LCA after an O(n log n) build — the classic application.",
      },
    ],
    tradeoffs: [
      {
        vs: "A segment tree",
        pick: "Sparse table when the data is immutable and queries are frequent",
        because:
          "O(1) beats O(log n) on every query, and by a larger margin than the notation suggests, because it is two memory reads rather than a recursive descent. But any update forces a full rebuild, so a single write in the workload can flip the decision entirely. Ask about writes before you compare query costs — that is the question that decides it.",
      },
      {
        vs: "A prefix-sum array",
        pick: "The prefix array whenever the operation is a sum",
        because:
          "A sparse table cannot do sums at all — they are not idempotent — and it does not need to, because a prefix array answers range sums in O(1) with O(n) memory and a five-line build. The two structures are complements rather than competitors: prefix arrays cover the invertible operations, sparse tables cover the idempotent ones.",
      },
      {
        vs: "Scanning the range",
        pick: "Scanning until the query count justifies the build",
        because:
          "The build is n log n merges and n log n numbers of memory, which on a million-element array is twenty million entries. If the workload is a few hundred queries, the direct scan is both faster overall and free of code. Saying where the crossover lies — roughly when queries outnumber elements — is a more useful answer in a review than reciting the query complexity.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — replaying a closed session",
      kind: "yours",
      problem:
        "Backtests sweep parameters over the same historical day again and again, asking for the high and low of many different windows. The bars never change once the session has closed, but each parameter run rescans the windows it cares about.",
      applied:
        "Immutability is genuine here rather than assumed, which is exactly the precondition a sparse table needs. Build once per day of data, then every window high or low across every parameter run is two array reads. The build cost is amortised over the whole sweep instead of being paid per run.",
      evidence: "strategy-engine/_perf/profile_bt.py",
      impact: "O(window) per lookup across thousands of runs → O(1) after one build per day",
    },
    {
      system: "Lowest common ancestor on a static tree",
      kind: "industry",
      problem:
        "Answering 'what is the nearest shared ancestor of these two nodes' repeatedly — for category hierarchies, org charts, or scope resolution in a compiler. Walking up from both nodes is O(depth) per query.",
      applied:
        "Flatten the tree with a depth-first walk that records each node every time it is visited, then the LCA of two nodes is the shallowest node in the range between their occurrences. That is range minimum over depths, and a sparse table makes it O(1). This reduction is the canonical reason the structure is taught.",
      impact: "O(depth) per query → O(1), after an O(n log n) preprocessing pass",
    },
    {
      system: "Suffix array with LCP for text search",
      kind: "industry",
      problem:
        "Finding how much two suffixes of a document share as a prefix, which is the inner operation of substring search, plagiarism detection and de-duplication over a fixed corpus.",
      applied:
        "The LCP array holds the shared prefix length of adjacent suffixes, and the shared prefix of any two suffixes is the minimum of the LCP entries between them — range minimum again, on data that never changes once the corpus is indexed.",
      impact: "Character-by-character comparison → O(1) per pair on an indexed corpus",
    },
    {
      system: "Columnar file statistics and predicate pushdown",
      kind: "industry",
      problem:
        "A query scanning a large columnar file wants to skip the parts that cannot possibly match `WHERE price > 5000`. Reading everything to find out defeats the purpose.",
      applied:
        "Parquet and ORC store the minimum and maximum of each column per row group, precomputed at write time and never updated because the files are immutable. A reader compares the predicate against those and skips whole groups. It is the same bet — precompute range aggregates once because nothing will ever change them — applied at one level rather than log n.",
      impact: "Full scans → whole row groups skipped without being read",
    },
  ],
  lab: {
    prompt:
      "The array never changes. Build a structure that answers many range-minimum queries fast. `queries` is a list of `[l, r]` pairs, inclusive; return one minimum per query, in order. Budget: O(n log n) overall — rescanning each range is correct and will fail the gate.",
    fnName: "staticRangeMin",
    signature: "staticRangeMin(nums: number[], queries: number[][]): number[]",
    starter: `function staticRangeMin(nums, queries) {
// Your budget: O(n log n) to build, O(1) per query.
// Precompute the minimum of every block whose length is a power of two.
// Any range is then covered by TWO such blocks — one anchored at each
// end — which are allowed to overlap, because min(x, x) is x.

return [];
}`,
    tests: [
      {
        name: "several ranges",
        input: [
          [5, 2, 7, 1, 9],
          [
            [0, 4],
            [1, 3],
            [2, 2],
          ],
        ],
        expected: [1, 1, 7],
      },
      {
        // Length-4 range: k = 2, so the two blocks cover [1,4] exactly
        // with no overlap. Length-3 ranges are where overlap kicks in.
        name: "overlapping blocks",
        input: [
          [8, 3, 6, 4, 7, 2],
          [
            [1, 4],
            [2, 4],
            [0, 5],
          ],
        ],
        expected: [3, 4, 2],
      },
      {
        name: "single-element ranges",
        input: [
          [4, 9, 1],
          [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        ],
        expected: [4, 9, 1],
      },
      {
        // Negatives catch an identity or initialisation of 0.
        name: "negatives",
        input: [
          [-1, -5, 3, -2],
          [
            [0, 3],
            [2, 3],
            [0, 1],
          ],
        ],
        expected: [-5, -2, -5],
      },
      {
        name: "all equal",
        input: [
          [7, 7, 7],
          [[0, 2]],
        ],
        expected: [7],
      },
      { name: "no queries", input: [[1, 2, 3], []], expected: [], hidden: true },
      {
        name: "single element array",
        input: [[42], [[0, 0]]],
        expected: [42],
        hidden: true,
      },
      {
        // Length 7 is not a power of two, so k = 2 and the two length-4
        // blocks overlap across the middle. A build that assumes exact
        // tiling gets this wrong.
        name: "range length is not a power of two",
        input: [
          [9, 8, 7, 6, 5, 4, 3],
          [[0, 6]],
        ],
        expected: [3],
        hidden: true,
      },
    ],
    hints: [
      "Level 0 of the table is just `nums`. Level k holds the minimum of every block of length 2^k: `table[k][i] = Math.min(table[k-1][i], table[k-1][i + 2**(k-1)])`, for every i where the block still fits.",
      "For a query [l, r], let `len = r - l + 1` and `k = Math.floor(Math.log2(len))`. The answer is `Math.min(table[k][l], table[k][r - 2**k + 1])` — one block starting at l, one ending at r.",
      "Those two blocks overlap whenever `len` is not a power of two, and that is fine: an element counted twice does not change a minimum. Precompute the logs into an array rather than calling Math.log2 per query — the call costs more than the two lookups it guards.",
    ],
    solution: `function staticRangeMin(nums, queries) {
const n = nums.length;
const out = [];
if (n === 0) return out;

// Precomputed floor(log2(i)). Calling Math.log2 per query would cost
// more than the two table reads it guards.
const log = new Int32Array(n + 1);
for (let i = 2; i <= n; i++) log[i] = log[i >> 1] + 1;

const levels = log[n] + 1;
const table = new Array(levels);
table[0] = nums.slice();

for (let k = 1; k < levels; k++) {
  const half = 1 << (k - 1);
  const span = 1 << k;
  const row = new Array(n - span + 1);
  for (let i = 0; i + span <= n; i++) {
    row[i] = Math.min(table[k - 1][i], table[k - 1][i + half]);
  }
  table[k] = row;
}

for (const [l, r] of queries) {
  const k = log[r - l + 1];
  // Two blocks of length 2^k: one starting at l, one ending at r. They
  // OVERLAP unless the length is an exact power of two — which is
  // harmless, because min(x, x) is x. That idempotence is the whole
  // reason this structure cannot do sums.
  out.push(Math.min(table[k][l], table[k][r - (1 << k) + 1]));
}

return out;
}`,
    complexityGate: {
      target: "O(n log n)",
      // n values and n queries scale together, so the build and the query
      // load grow in step. Ranges are wide and of varying length — narrow
      // ranges would let a per-query rescan look linear and hide the
      // quadratic.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 2654435761) % n), Array.from({ length: n }, (_, i) => [(i * 3) % (n >> 1), (n >> 1) + (i % (n >> 1))])]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Requires idempotence, not just associativity",
      d: "The two covering blocks overlap, so the operation must tolerate double-counting. Min, max, gcd and bitwise AND/OR do; sum does not. This is a stronger requirement than a segment tree's, and it is the first thing to check.",
    },
    {
      t: "Immutable only",
      d: "Any update invalidates every block containing that element, at every level, so there is no incremental fix — you rebuild. That constraint is the price of O(1) queries.",
    },
    {
      t: "A query is two lookups and one merge, at any range length",
      d: "Take the largest power of two that fits, anchor one block at each end, and let them overlap. Nothing about the cost depends on how long the range is — which no tree structure can offer.",
    },
    {
      t: "Not being able to do sums costs nothing",
      d: "A prefix-sum array already answers range sums in O(1) with O(n) memory. Prefix arrays cover the invertible operations, sparse tables cover the idempotent ones; they complement rather than compete.",
    },
    {
      t: "The crossover is roughly when queries outnumber elements",
      d: "Sparse table costs n log n + q; segment tree costs n + q log n. Below about q = n you have paid a log factor on the build to save one on queries you are not making.",
    },
  ],
  pitfalls: [
    "Using it for range sums. The overlap double-counts, and the answers are wrong in a way that looks like ordinary arithmetic error.",
    "Calling `Math.log2` inside the query. It costs more than the two table reads it exists to guard.",
    "Assuming the two blocks tile the range exactly. They only do when the length is a power of two; the rest of the time they overlap, deliberately.",
    "Choosing it for data that receives even occasional writes, then discovering the update path is a full rebuild.",
  ],
  quiz: [
    {
      q: "Why does a sparse table work for range minimum but not range sum?",
      options: [
        "Sums are too large",
        "The two covering blocks overlap, so the operation must be idempotent — min is, addition is not",
        "Sums require more memory",
        "It does work for sums",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Overlapping coverage double-counts. min(x, x) = x, but x + x ≠ x.",
      distractors: [
        "Magnitude is irrelevant — the structure would fail on sums of ones just as surely as on sums of billions.",
        "",
        "Memory is identical; the same table shape holds whatever the merge produces. It is correctness that fails, not capacity.",
        "It genuinely does not, and it does not need to: a prefix-sum array answers range sums in O(1) already.",
      ],
    },
    {
      q: "A query on a range of length 100. How many table lookups does it take?",
      options: ["log2(100) ≈ 7", "2", "100", "It depends on the values"],
      answer: 1,
      difficulty: "recall",
      why: "Always exactly two: one block of length 64 starting at the left end and one ending at the right end. Their overlap covers the middle, and the count does not depend on the range length at all.",
      distractors: [
        "That is a segment tree's cost. The sparse table trades build time to remove the log from the query entirely.",
        "",
        "Scanning is what the structure exists to avoid.",
        "The cost is purely structural — it is two lookups whatever the values are.",
      ],
    },
    {
      q: "You need range minimum on an array that is updated a few times per second and queried thousands of times per second. What do you use?",
      options: [
        "A sparse table — queries dominate",
        "A segment tree, because any update forces a full O(n log n) rebuild of the sparse table",
        "A Fenwick tree",
        "A prefix-minimum array",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The presence of writes is the deciding question, not the query-to-write ratio alone. A few rebuilds per second over a large array is far more work than thousands of O(log n) queries, and the segment tree handles both operations without ever rebuilding.",
      distractors: [
        "Queries do dominate in count, which is exactly what makes this tempting — but a single rebuild costs n log n, so a handful per second can outweigh thousands of logarithmic queries.",
        "",
        "Minimum has no inverse, so a Fenwick tree cannot express range minimum however the code is arranged.",
        "A prefix-minimum array answers ranges starting at index 0 only, and it has the same rebuild problem on any update.",
      ],
    },
    {
      q: "Your sparse table gives correct answers for ranges of length 1, 2, 4 and 8 but is wrong for length 5. Most likely cause?",
      options: [
        "The log table is wrong",
        "The build is fine but the query assumes the two blocks tile exactly — length 5 needs two length-4 blocks that overlap",
        "Level 3 was never built",
        "Negative numbers",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Powers of two are exactly the lengths where a single block, or two adjacent blocks, cover the range with no overlap. Any other length needs the two blocks to overlap, so a query written as though they tile will miss elements in the middle.",
      distractors: [
        "A wrong log table would break the powers of two too, since they are the cases where floor(log2) is exact and most obviously right.",
        "",
        "Length 5 uses level 2, blocks of length 4. Level 3 is not consulted at all.",
        "Sign is irrelevant to which blocks are selected. It would break every length, not just the non-powers of two.",
      ],
    },
    {
      q: "Range minimum over 1,000,000 immutable elements, answering 200 queries. What should you build?",
      options: [
        "A sparse table",
        "Nothing — scan each range; the build is 20 million entries to save 200 scans",
        "A segment tree",
        "A disjoint sparse table",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The build is n log n ≈ 20 million merges and about the same memory. Two hundred queries cannot repay that. The crossover is roughly when queries outnumber elements, and here they are five thousand times fewer.",
      distractors: [
        "The correct structure for the wrong workload. Immutability makes it applicable; the query count makes it not worth building.",
        "",
        "An O(n) build and O(log n) queries is a much better fit than the sparse table here — but 200 scans still beat building anything at all.",
        "More build complexity for the same reason to not build it, and its extra power is for non-idempotent operations we do not need.",
      ],
    },
    {
      q: "How does a sparse table give O(1) lowest common ancestor on a static tree?",
      options: [
        "It stores every ancestor of every node",
        "A depth-first walk flattens the tree so that the LCA of two nodes is the shallowest node in the range between their occurrences — range minimum over depths",
        "It binary searches the depth array",
        "It caches previously asked pairs",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The Euler tour turns a tree question into an array question. Between two nodes' occurrences the walk must pass through their common ancestor and never go above it, so the minimum depth in that range is the LCA.",
      distractors: [
        "That would be O(n²) memory for a deep tree, and it is what the reduction avoids rather than what it does.",
        "",
        "Binary searching would reintroduce a logarithm, which is exactly what the sparse table removes.",
        "Caching helps only on repeated pairs. The reduction answers a pair never seen before in constant time.",
      ],
    },
    {
      q: "You need O(1) range SUM on immutable data. What is the answer?",
      options: [
        "A sparse table with addition",
        "A prefix-sum array — O(n) build, O(n) memory, O(1) queries, and five lines",
        "It is impossible",
        "A segment tree",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Sums are invertible, so `prefix[r+1] − prefix[l]` answers any range in constant time. The sparse table's inability to do sums costs nothing, because the simpler structure already does them better.",
      distractors: [
        "Addition is not idempotent, so the overlapping blocks double-count. The structure returns confidently wrong numbers.",
        "",
        "It is routine — the prefix-sum array is one of the first structures anyone learns for exactly this.",
        "O(log n) queries and 4n memory, to solve a problem an O(n) array answers in O(1).",
      ],
    },
    {
      q: "Someone claims O(n log n) build is a lower bound for O(1) range minimum. Is that right?",
      options: [
        "Yes, it is proven",
        "No — the Fischer–Heun structure achieves O(n) build with O(1) queries by blocking the array and building a sparse table only over block minima",
        "Yes, because you must look at every element",
        "No, but only for sums",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Blocking reduces the sparse table to n/log n block minima, whose n log n build becomes linear, and small in-block queries are answered from a precomputed lookup of the few possible shapes. It is rarely worth implementing, but knowing it exists stops you overclaiming a bound.",
      distractors: [
        "Nothing of the sort is proven — the opposite is constructed.",
        "",
        "Looking at every element is Ω(n), which is what the better structure achieves. It argues for the linear bound, not against it.",
        "Sums have their own O(n)/O(1) answer in the prefix array, and the Fischer–Heun result is about minima specifically.",
      ],
    },
  ],
};

import type { Topic } from "../types.ts";

export const heaps: Topic = {
  id: "heaps",
  title: "Heaps & priority queues",
  tier: 1,
  week: 7,
  depth: "core",
  summary: "Top-K patterns, the two-heap median, and the implicit tree.",
  why: 'Top-K is one of the highest-leverage swaps in application code — every "best N" list that currently sorts everything is a heap waiting to happen. It is also the structure underneath Dijkstra, A*, task schedulers and every timer wheel you will ever touch.',
  complexity: "O(log n) push/pop · O(1) peek · O(n) build",
  viz: ["heap"],
  learn: {
    intuition:
      "Sorting gives you complete order, and complete order is usually more than you need. If you only ever ask 'what is the smallest thing right now', you are paying for 99% of information you never read. A heap is the structure that provides exactly that one answer cheaply and nothing else. It keeps a weak promise — every parent is smaller than its children — which says nothing about how siblings compare or how the array reads left to right. That weak promise is exactly strong enough to put the minimum at the top, and weak enough to be repaired in O(log n) after a change instead of O(n log n). The whole design is a lesson worth generalising: keep the weakest invariant that still answers your question, because weaker invariants are cheaper to maintain.",
    mechanics: [
      {
        heading: "The tree is stored in a plain array with no pointers",
        body: "For the node at index i, its parent is at `(i - 1) / 2` rounded down, and its children are at `2i + 1` and `2i + 2`. There are no node objects and no allocation per element, so a heap has the memory behaviour of an array while behaving like a tree.",
      },
      {
        heading: "Push: add at the end, then sift up",
        body: "Append to the array — which keeps the tree shape correct — then repeatedly swap with the parent while it is larger. The new element travels at most the height of the tree, which is log n.",
      },
      {
        heading: "Pop: take the root, move the last element there, then sift down",
        body: "The root is the answer. Removing it leaves a hole, so move the last element into it — that keeps the shape — and push it down by repeatedly swapping with its smaller child until the promise holds again. Again at most log n steps.",
      },
      {
        heading: "For the K largest, use a MIN-heap of size K",
        body: "This is the part people get backwards. You need cheap access to the WEAKEST of the survivors so you can decide whether an arrival deserves to replace it. In a min-heap of size K, that weakest survivor sits at the root, so the comparison is O(1) and the replacement is O(log K).",
      },
      {
        heading: "Building from an existing array is O(n), not O(n log n)",
        body: "Sift down starting from the last parent and working backwards. Half the nodes are leaves and move zero levels, a quarter move at most one, and so on — the total converges to linear. Pushing n elements one at a time is O(n log n); heapifying in place is O(n).",
      },
    ],
    complexityDerivation:
      "Two derivations worth having. First, why push and pop are O(log n): a heap is a complete binary tree, meaning every level is full except possibly the last, so its height with n nodes is exactly floor(log₂ n). Sifting up or down moves an element one level per swap, so the cost is bounded by the height. Second, and more surprising, why building a heap from an unsorted array is O(n) rather than O(n log n). The naive count says n elements times log n depth. But the depth is not log n for most elements. At the bottom level there are n/2 nodes that can sift down 0 levels; at the next level n/4 nodes that can move at most 1; then n/8 that can move at most 2. The total work is the sum over levels of (n / 2^(h+1)) × h, which is n times the sum of h/2^(h+1). That inner sum converges to 1, so the total is O(n). The intuition: almost all the nodes are near the bottom, and nodes near the bottom have almost nowhere to fall.",
    variants: [
      {
        name: "Binary min-heap / max-heap",
        when: "The default priority queue.",
        delta:
          "Array-backed, O(log n) push and pop. Python's `heapq` is a min-heap only — negate the values to get a max-heap.",
      },
      {
        name: "Bounded top-K heap",
        when: "You want the best K out of a very large or streaming set.",
        delta:
          "Keep exactly K elements. Push, and if the size exceeds K, pop the root. O(n log K) time and O(K) memory, so it works on data far larger than memory.",
      },
      {
        name: "Two heaps for a running median",
        when: "You need the median of a stream that keeps growing.",
        delta:
          "A max-heap for the lower half and a min-heap for the upper half, sizes kept within one of each other. The median sits at the roots, read in O(1), with O(log n) inserts.",
      },
      {
        name: "Indexed / decrease-key heap",
        when: "Dijkstra with updates, or any priority that changes after insertion.",
        delta:
          "Keeps a map from element to its position so a priority can be lowered in O(log n). Without it, the common workaround is to push duplicates and ignore stale entries when they surface.",
      },
    ],
    tradeoffs: [
      {
        vs: "Sorting the whole collection",
        pick: "Heap whenever K is much smaller than n",
        because:
          "Sorting is O(n log n) and holds everything in memory. A bounded heap is O(n log K) and holds K items, so it works on a stream and on data larger than RAM. For the top 10 of a million, that is log 10 versus log 1,000,000 per element.",
      },
      {
        vs: "Quickselect",
        pick: "Quickselect for a one-off on an in-memory array, heap for streams",
        because:
          "Quickselect finds the K-th element in O(n) on average, beating the heap's O(n log K). But it needs the entire array in memory and rearranges it, and its worst case is O(n^2). The heap streams, never touches the input, and has no bad case.",
      },
      {
        vs: "A sorted list",
        pick: "Heap unless you need to iterate in order",
        because:
          "A sorted list gives you O(1) access to the minimum too, but O(n) insertion because everything shifts. The heap trades away 'read everything in order' — which it genuinely cannot do — for O(log n) insertion.",
      },
    ],
  },
  realWorld: [
    {
      system: "Dijkstra's algorithm and every routing engine",
      kind: "industry",
      problem:
        "Shortest-path search must repeatedly take the nearest unvisited node. Scanning all nodes each time makes the algorithm O(V^2).",
      applied:
        "A priority queue keyed by distance turns 'find the nearest' into a pop. This is what takes Dijkstra to O((V + E) log V) and makes continent-scale routing feasible.",
      impact: "O(V^2) → O((V + E) log V)",
    },
    {
      system: "Kernel and runtime timer wheels",
      kind: "industry",
      problem:
        "Thousands of pending timers, and the scheduler must repeatedly find the one that expires next without scanning them all.",
      applied:
        "A min-heap keyed by expiry time puts the next timer at the root. Node.js, the Linux kernel and most event loops use a heap or a hierarchical wheel built on the same idea.",
    },
    {
      system: "Log aggregation and k-way merge",
      kind: "industry",
      problem:
        "Merging hundreds of individually sorted log files into one ordered stream, when their total size far exceeds memory.",
      applied:
        "A heap of size k holds the current front element of each file. Pop the smallest, emit it, push the next element from the same file. Memory is O(k) regardless of total data size, which is also how external merge sort works.",
      impact: "O(total × k) scanning → O(total × log k), memory O(k)",
    },
    {
      system: "traed — best-N signal and strike ranking",
      kind: "yours",
      problem:
        "Ranking an option chain or a signal list by score and taking the top few, by sorting the whole collection each evaluation.",
      applied:
        "`heapq.nlargest(k, items, key=...)` — a bounded heap — gives the same result in O(n log k) while holding only k candidates. On a per-tick path evaluated thousands of times, the constant matters as much as the class.",
      impact: "O(n log n) per evaluation → O(n log k)",
    },
  ],
  lab: {
    prompt:
      "Return the running median: after each element arrives, the median of everything seen so far. For an even count, take the average of the two middle values. A working min-heap class is provided — use two of them. Sorting the collection after each arrival is correct and O(n^2 log n); inserting into a sorted array with `splice` is also correct and O(n^2). Both fail the gate. Budget: O(n log n) overall.",
    fnName: "runningMedian",
    signature: "runningMedian(nums: number[]): number[]",
    starter: `// A working binary heap. You do not need to modify it.
// new Heap((a, b) => a - b) is a MIN-heap; flip the comparator for a max-heap.
class Heap {
  constructor(cmp) { this.a = []; this.cmp = cmp; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(v) {
    this.a.push(v);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
    return this;
  }
  pop() {
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l;
        if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
        i = m;
      }
    }
    return top;
  }
}

function runningMedian(nums) {
  // Budget: O(n log n) overall.
  // Keep the smaller half in a MAX-heap and the larger half in a MIN-heap.
  // The two roots are the middle of the data.

  return [];
}`,
    tests: [
      { name: "ascending", input: [[1, 2, 3]], expected: [1, 1.5, 2] },
      { name: "single element", input: [[5]], expected: [5] },
      { name: "empty array", input: [[]], expected: [] },
      {
        name: "mixed order",
        input: [[2, 1, 5, 7, 2, 0, 5]],
        expected: [2, 1.5, 2, 3.5, 2, 2, 2],
      },
      { name: "all identical", input: [[1, 1, 1, 1]], expected: [1, 1, 1, 1] },
      {
        name: "negatives and an even count",
        input: [[-1, -2]],
        expected: [-1, -1.5],
        hidden: true,
      },
      {
        // Descending input pushes everything to the lower half first, so a
        // solution that never rebalances returns the wrong middle here.
        name: "descending input forces rebalancing",
        input: [[3, 2, 1]],
        expected: [3, 2.5, 2],
        hidden: true,
      },
      {
        name: "the new element may belong in the other half",
        input: [[10, 20, 5]],
        expected: [10, 15, 10],
        hidden: true,
      },
    ],
    hints: [
      "Keep two heaps: `low` is a max-heap holding the smaller half, `high` is a min-heap holding the larger half. Build the max-heap with the comparator `(a, b) => b - a`.",
      "For each arrival: push it into `low`, then move `low`'s root into `high`. That single move guarantees every value in `low` is at most every value in `high`.",
      "Then rebalance: if `high` is larger than `low`, move `high`'s root back. The median is `low`'s root when the sizes differ, and the average of both roots when they are equal.",
    ],
    solution: `class Heap {
  constructor(cmp) { this.a = []; this.cmp = cmp; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(v) {
    this.a.push(v);
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
    return this;
  }
  pop() {
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l;
        if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
        i = m;
      }
    }
    return top;
  }
}

function runningMedian(nums) {
  const low = new Heap((a, b) => b - a);   // max-heap: the smaller half
  const high = new Heap((a, b) => a - b);  // min-heap: the larger half
  const out = [];

  for (const x of nums) {
    // Push into low, then hand low's largest to high. This one move is what
    // guarantees every value in low is <= every value in high, whatever
    // order the input arrives in.
    low.push(x);
    high.push(low.pop());

    // Keep low the same size as high, or exactly one larger.
    if (high.size > low.size) low.push(high.pop());

    out.push(
      low.size > high.size ? low.peek() : (low.peek() + high.peek()) / 2,
    );
  }

  return out;
}`,
    complexityGate: {
      target: "O(n log n)",
      // A deterministic shuffle, so neither heap degenerates and the input
      // is not accidentally sorted.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 7919) % n)]",
      sizes: [2000, 4000, 8000, 16000],
    },
  },
  insights: [
    {
      t: "The tree is implicit — there are no pointers",
      d: "`parent(i) = (i−1)/2`, children at `2i+1` and `2i+2`. It is a plain array, so it has perfect cache locality and zero per-node allocation.",
    },
    {
      t: "Top-K uses a heap of the OPPOSITE polarity",
      d: "For the K largest, keep a MIN-heap of size K: the root is the weakest survivor, so you can compare and evict in O(1). Getting this backwards is the classic mistake, and it produces code that is correct but pointless.",
    },
    {
      t: "Heapify is O(n), not O(n log n)",
      d: "Building bottom-up, most nodes are near the leaves and sift down almost no distance. The series converges to linear.",
    },
    {
      t: "Two heaps give a running median",
      d: "A max-heap of the lower half, a min-heap of the upper half, kept balanced within one. The median is at the roots, read in O(1), with O(log n) inserts.",
    },
    {
      t: "Python's heapq is min-only",
      d: "For a max-heap, push `-value`, or push tuples with a negated key. Forgetting this produces a correct program that returns the smallest instead of the largest.",
    },
  ],
  pitfalls: [
    "Treating a heap as sorted. Iterating the backing array does not give sorted order — only repeated popping does.",
    "Changing the priority of an element already in the heap without re-sifting. The promise silently breaks and pops start returning the wrong element.",
    "Using a max-heap for top-K largest. You want cheap access to the weakest survivor, which is what a min-heap gives.",
    "Pushing all n elements when you only need K. That is O(n) memory for an O(K) problem, and it stops working on a stream.",
  ],
  quiz: [
    {
      q: "To track the 100 largest values in a stream, use:",
      options: [
        "A max-heap of size 100",
        "A min-heap of size 100 — the root is the smallest survivor and can be evicted in O(1)",
        "A sorted array of size 100",
        "A max-heap of all elements",
      ],
      answer: 1,
      difficulty: "apply",
      why: "You need cheap access to the WEAKEST member so you can decide whether an arrival beats it. A min-heap puts exactly that at the root.",
      distractors: [
        "A max-heap puts the largest at the root, which you already know is staying. You would have to scan all 100 to find the one to evict.",
        "",
        "It works and costs O(100) per insertion for the shift. Fine at 100, and it does not generalise.",
        "That is O(n) memory for an O(K) problem, and it does not work on a stream that exceeds memory.",
      ],
    },
    {
      q: "Building a heap from n unsorted elements by bottom-up heapify costs:",
      options: ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"],
      answer: 1,
      difficulty: "recall",
      why: "Half the nodes are leaves and sift down zero levels, a quarter sift at most one, and so on. The series sums to O(n).",
      distractors: [
        "That is the cost of pushing n elements one at a time, which is a different construction.",
        "",
        "Nothing here is quadratic — each node moves at most its own height.",
        "You have to touch every element at least once, so it cannot be sublinear.",
      ],
    },
    {
      q: "What does a binary heap guarantee about its array?",
      options: [
        "It is sorted ascending",
        "Every node is ≥ (or ≤) its children — nothing more",
        "The last element is the smallest",
        "In-order traversal yields sorted order",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The promise is strictly between parent and child. Siblings are unordered, which is exactly why a heap is much cheaper to maintain than a sorted structure.",
      distractors: [
        "A sorted array is a valid min-heap, but the reverse does not hold. `[1, 3, 2]` is a heap and is not sorted.",
        "",
        "The smallest of a max-heap is somewhere in the bottom half, not at a fixed position.",
        "That is a binary search tree. In-order traversal of a heap gives no useful order.",
      ],
    },
    {
      q: "Why does the two-heap median push the new value into `low` and then move `low`'s root into `high`?",
      options: [
        "To keep the sizes equal",
        "Because the new value may not belong in `low` at all — routing it through guarantees the two halves stay correctly separated whatever its value",
        "It is faster than comparing first",
        "To avoid duplicate values",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If you pushed straight into whichever heap 'looked right' by comparison, an ordering mistake would leave a large value stuck in the lower half. Pushing into `low` and immediately moving its maximum to `high` makes the separation automatic — the largest of the lower half always ends up on the correct side.",
      distractors: [
        "Sizes are fixed by the separate rebalancing step afterwards, not by this move.",
        "",
        "Comparing first is also fine and marginally faster. The reason for this order is correctness by construction, not speed.",
        "Duplicates are handled correctly either way and are not the concern.",
      ],
    },
    {
      q: "You need the 5 largest of 10 million records that do not fit in memory. Best approach?",
      options: [
        "Sort and take 5",
        "A bounded min-heap of size 5, streaming the records",
        "Quickselect",
        "Load into a database and use ORDER BY",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The heap holds 5 items regardless of input size and processes records one at a time, so it never needs the data in memory. Quickselect is O(n) but requires the whole array and rearranges it, which rules it out here.",
      distractors: [
        "Sorting requires materialising all 10 million, which is the thing you cannot do.",
        "",
        "Better asymptotically — O(n) average — and it needs random access to the entire array, which the constraint forbids.",
        "It would work, and it moves the problem rather than solving it. If a database is already in the path this is a legitimate answer; as an algorithm answer it dodges the question.",
      ],
    },
    {
      q: "In Dijkstra, you lower a node's distance but the old entry is still in the heap. What is the usual fix?",
      options: [
        "Rebuild the heap",
        "Push the new entry and skip stale ones when they surface, or use an indexed heap that supports decrease-key",
        "Remove the old entry by scanning the array",
        "Use a queue instead",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The lazy version — push duplicates and discard entries whose distance no longer matches the best known — is simpler and usually faster in practice, at the cost of a larger heap. An indexed heap keeps a position map and repairs in O(log n) with no duplicates.",
      distractors: [
        "Rebuilding is O(n) per update and would dominate the whole algorithm.",
        "",
        "Scanning to find the entry is O(n), which throws away the reason for using a heap.",
        "A plain queue gives no priority ordering, so the algorithm stops being Dijkstra.",
      ],
    },
    {
      q: "Your top-K code uses a max-heap and pops K times at the end. It is correct. What is the problem?",
      options: [
        "Nothing",
        "It holds all n elements — O(n) memory instead of O(K) — so it cannot work on a stream larger than memory",
        "It gives the wrong order",
        "Max-heaps are slower than min-heaps",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It is O(n log n) to build plus O(K log n) to extract, and it holds everything. The bounded min-heap is O(n log K) and holds K. The difference only shows up when n is large, which is exactly when top-K is worth doing.",
      distractors: [
        "It is correct, and correct is not the same as appropriate. This is the distinction the question is testing.",
        "",
        "The order is right — popping a max-heap gives descending order.",
        "They are identical structures with a flipped comparator. Neither is faster.",
      ],
    },
    {
      q: "A colleague iterates a heap's backing array expecting sorted order and gets nonsense. Explain in one sentence.",
      options: [
        "The heap is corrupted",
        "A heap only orders each parent against its own children; siblings and cousins are unordered, so the array is not sorted",
        "They should have used a max-heap",
        "The array must be reversed",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The heap property is local. `[1, 3, 2]` is a perfectly valid min-heap and is not sorted. Sorted order comes only from popping repeatedly, which is exactly what heapsort does.",
      distractors: [
        "It is behaving as specified. The expectation was wrong, not the structure.",
        "",
        "Polarity changes which extreme sits at the root, not whether the array is sorted.",
        "Reversing an unsorted array gives another unsorted array.",
      ],
    },
  ],
};

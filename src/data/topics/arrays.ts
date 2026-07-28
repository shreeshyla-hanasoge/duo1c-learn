import type { Topic } from "../types.ts";

export const arrays: Topic = {
  id: "arrays",
  title: "Arrays & dynamic arrays",
  tier: 0,
  week: 1,
  depth: "core",
  summary: "Growth amortisation, in-place manipulation, cache locality.",
  why: "The array is the structure everything else is measured against. Its speed comes from being one unbroken block of memory, not from its API. Almost every interview problem is really an array problem wearing a costume, and almost every hot loop in production is walking one.",
  complexity: "O(1) index · amortised O(1) push",
  learn: {
    intuition:
      "An array is one continuous block of memory holding equal-sized slots. That single fact explains everything it is good and bad at. Reading position i is instant because the machine computes one address — start + i × size — and goes straight there; it does not matter whether i is 3 or 3 million. Inserting in the middle is slow for the same reason: the slots are physically next to each other, so making room means shifting everything after it. A dynamic array — Python's list, Java's ArrayList, JavaScript's Array — adds one idea on top: when the block fills, allocate a bigger block, copy across, and carry on. The interesting question is how much bigger, and the answer is what makes appending cheap.",
    mechanics: [
      {
        heading: "Indexing is arithmetic, not searching",
        body: "`a[i]` is one multiplication and one addition. This is why an array index is O(1) while finding a value inside it is O(n) — the machine can jump to a position, but it has no idea which position holds the value you want.",
      },
      {
        heading: "Appending usually just writes into spare capacity",
        body: "A dynamic array keeps two numbers: length (how many slots are used) and capacity (how many exist). Most appends write one slot and increment length. That is a handful of instructions.",
      },
      {
        heading: "When capacity runs out, it grows by a factor",
        body: "Allocate a new block roughly 1.5x to 2x the size, copy every element across, free the old one. This one append is O(n). The key is that the next resize happens only after the array has doubled again, so resizes get exponentially rarer as the array grows.",
      },
      {
        heading: "Deleting from the middle shifts, so work from the back",
        body: "`del a[0]` moves every remaining element one slot left — O(n). If you are filtering a list, do not delete in place; write survivors forward with a read pointer and a write pointer, which is one pass and no shifting.",
      },
      {
        heading: "Walking forward is far faster than jumping around",
        body: "Memory arrives from RAM in blocks of about 64 bytes. Reading `a[0]` brings roughly the next 16 four-byte values along for free, and the hardware notices a forward pattern and fetches ahead. A structure that stores pointers to values scattered across the heap defeats both effects and pays a memory stall per element.",
      },
    ],
    complexityDerivation:
      "Why is appending amortised O(1) when one append in the sequence copies the entire array? Count the total copying across n appends with doubling. The copies happen at sizes 1, 2, 4, 8, … up to n, so the total number of elements copied is 1 + 2 + 4 + … + n. That sum is less than 2n — a geometric series whose total is bounded by twice its largest term. So n appends cost at most about 3n operations in total, which is O(n) overall, or O(1) each on average. Now do the same count for growth by a fixed 10 slots: resizes happen at 10, 20, 30, … up to n, and the total copied is 10 + 20 + … + n, an arithmetic series equal to about n^2/20. Quadratic. The factor is the whole trick, and this is also why amortised O(1) is not the same as O(1): the one append that triggers a copy of a million elements is a real pause that lands on a real user.",
    variants: [
      {
        name: "Fixed-size array",
        when: "The size is known and never changes.",
        delta:
          "No capacity, no resizing, no hidden pause. This is what you want inside a hot loop, and what a ring buffer is built from.",
      },
      {
        name: "Dynamic array (list / vector / ArrayList)",
        when: "The default. You append and you do not know the final size.",
        delta:
          "Amortised O(1) append at the cost of occasional copy pauses and up to 2x memory overhead from spare capacity.",
      },
      {
        name: "Preallocated with reserve",
        when: "You know roughly how many elements are coming.",
        delta:
          "`list = [None] * n` or `vec.reserve(n)` skips every resize. Removes the pauses and the copying — a free win whenever the count is known.",
      },
      {
        name: "Array of structs vs struct of arrays",
        when: "You process one field across many records.",
        delta:
          "Storing each field in its own array means a scan over that field touches only memory it needs. This is why columnar formats such as Parquet and Arrow exist.",
      },
    ],
    tradeoffs: [
      {
        vs: "Linked list",
        pick: "Array, unless you are splicing nodes you already hold a reference to",
        because:
          "The textbook comparison says the linked list wins at insertion, and in practice it usually loses anyway, because getting to the insertion point costs a scan and every node visit is a cache miss. The linked list wins when you already hold the node — an LRU cache moving an entry to the front, or an intrusive list inside a kernel.",
      },
      {
        vs: "Hash map",
        pick: "Array when keys are small dense integers",
        because:
          "If the keys are 0..25 for letters, or 0..364 for days, a plain array is faster, uses less memory, allocates nothing, and never has a collision. A hash map earns its cost only when the key space is genuinely open.",
      },
      {
        vs: "Deque",
        pick: "Deque when you push and pop at the front",
        because:
          "`list.pop(0)` in Python is O(n) because it shifts everything. `collections.deque` makes both ends O(1). Using a list as a queue is one of the most common quiet quadratic bugs in Python code.",
      },
    ],
  },
  realWorld: [
    {
      system: "Apache Arrow and Parquet (columnar analytics)",
      kind: "industry",
      problem:
        "Row-oriented storage forces a query that reads one column to pull every other column into memory alongside it, wasting almost all of the bandwidth it pays for.",
      applied:
        "Store each column as its own contiguous array. A scan of `price` now touches only price data, every cache line is fully used, and the regular layout lets the CPU apply one instruction to several values at once.",
      impact: "Order-of-magnitude scan speedups on wide tables",
    },
    {
      system: "Python `list.pop(0)` in queue code",
      kind: "industry",
      problem:
        "Treating a list as a queue looks correct and is quietly quadratic: every `pop(0)` shifts the remaining n-1 elements one position left.",
      applied:
        "`collections.deque` stores fixed-size blocks and keeps indices at both ends, so appending and popping at either end is O(1). The fix is a one-line import, which is why noticing it matters more than implementing it.",
      impact: "O(n^2) drain → O(n)",
    },
    {
      system: "Go slices and the append trap",
      kind: "industry",
      problem:
        "A Go slice is a view over a backing array. `append` writes into spare capacity when there is some, so two slices sharing one backing array can overwrite each other's elements.",
      applied:
        "The rule that comes out of it — copy explicitly when you need an independent slice, and use the three-index form to cap capacity — is exactly the array mental model: length and capacity are different numbers, and code that ignores the difference has a bug waiting.",
      evidence: "Go spec, 'Appending to and copying slices'",
    },
    {
      system: "traed — OHLCV candle series",
      kind: "yours",
      problem:
        "Indicator maths over a price history is a scan over one field, repeated many times per strategy evaluation. Holding candles as a list of objects means every scan chases pointers and touches five fields to read one.",
      applied:
        "Keeping each field as its own flat numeric array — the layout NumPy and pandas already use underneath — makes the scan contiguous and lets vectorised operations apply. Same complexity class, far better constant factor.",
      impact: "Cache misses per element → one fetch per 8 values",
    },
  ],
  lab: {
    prompt:
      "Given an array of numbers, return a new array where position i holds the product of every number except the one at i. You may not use division — the point is the prefix/suffix technique, and division breaks on zeros anyway. The straightforward nested loop is correct and quadratic; your budget is O(n) time.",
    fnName: "productExceptSelf",
    signature: "productExceptSelf(nums: number[]): number[]",
    starter: `function productExceptSelf(nums) {
  // Budget: O(n) time. Two passes are fine, nested loops are not.
  // No division.

  return [];
}`,
    tests: [
      {
        name: "basic",
        input: [[1, 2, 3, 4]],
        expected: [24, 12, 8, 6],
      },
      {
        name: "contains a zero",
        input: [[1, 2, 0, 4]],
        expected: [0, 0, 8, 0],
      },
      {
        name: "two zeros make everything zero",
        input: [[0, 2, 0]],
        expected: [0, 0, 0],
      },
      {
        name: "negatives",
        input: [[-1, 2, -3]],
        expected: [-6, 3, -2],
      },
      {
        name: "two elements",
        input: [[3, 7]],
        expected: [7, 3],
      },
      {
        name: "single element has no others to multiply",
        input: [[5]],
        expected: [1],
        hidden: true,
      },
      {
        name: "empty array",
        input: [[]],
        expected: [],
        hidden: true,
      },
      {
        name: "ones do not change the product",
        input: [[1, 1, 1]],
        expected: [1, 1, 1],
        hidden: true,
      },
    ],
    hints: [
      "The answer at position i is (product of everything to its left) × (product of everything to its right). Both of those can be built by scanning.",
      "First pass, left to right: fill `out[i]` with the product of everything strictly before i. Start the running product at 1.",
      "Second pass, right to left: keep a running product of everything after i, and multiply it into `out[i]` as you go. That is two passes and no division.",
    ],
    solution: `function productExceptSelf(nums) {
  const n = nums.length;
  const out = new Array(n);

  let prefix = 1;
  for (let i = 0; i < n; i++) {
    out[i] = prefix;          // everything strictly before i
    prefix *= nums[i];
  }

  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    out[i] *= suffix;         // times everything strictly after i
    suffix *= nums[i];
  }

  return out;
}`,
    complexityGate: {
      target: "O(n)",
      // Alternating 1 and -1 on purpose. Any generator whose values multiply
      // to something large overflows to Infinity within a few hundred
      // elements, and timing Infinity arithmetic measures nothing useful.
      // These keep every running product at exactly 1 or -1 while still
      // performing the same number of multiplications.
      gen: "(n) => [Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1))]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Doubling is what makes push amortised O(1)",
      d: "Growing by a constant amount instead of a constant factor makes n pushes cost O(n^2). The factor is the whole trick — copies happen exponentially less often as the array grows.",
    },
    {
      t: "Contiguity beats asymptotics at small n",
      d: 'A linear scan of an array often beats a "faster" pointer-chasing structure for thousands of elements, because every cache line fetched brings about 16 neighbours with it.',
    },
    {
      t: 'In place means O(1) extra, not "no copying"',
      d: "Two-pointer compaction, reversal and partitioning all rewrite the array without a second buffer. That is the technique worth making reflexive.",
    },
    {
      t: "Preallocate when you know the size",
      d: "`[None] * n`, `new Array(n)`, `vec.reserve(n)`. It removes every resize copy and every resize pause, and costs one line. Interviewers notice when you do it unprompted.",
    },
  ],
  pitfalls: [
    "Using a list as a queue. `pop(0)` and `shift()` are O(n) — reach for a deque.",
    "Deleting from a list while iterating over it. Indices shift underneath you and elements get skipped; build a new list, or write survivors forward with two pointers.",
    "Assuming a JavaScript array is contiguous. It is, until you create a hole (`a[1000] = 1` on a short array) and the engine switches to a dictionary representation, quietly losing the speed.",
    "Forgetting that spare capacity is real memory. A list that grew to a million and then shrank to ten usually still holds the big block.",
  ],
  quiz: [
    {
      q: "A dynamic array grows by adding a fixed 10 slots each time it fills. What is the cost of n pushes?",
      options: ["O(n)", "O(n log n)", "O(n^2)", "O(n · 10)"],
      answer: 2,
      difficulty: "apply",
      why: "It reallocates every 10 pushes and copies everything each time: 10 + 20 + 30 + … ≈ n^2/20. Only geometric growth gives amortised O(1).",
      distractors: [
        "This is what you get with doubling, where the copy sizes form a geometric series bounded by 2n. A fixed increment gives an arithmetic series instead.",
        "A log factor would need the number of resizes to shrink logarithmically. Here it grows linearly with n.",
        "",
        "The 10 is a constant, so O(n · 10) would just be O(n). The problem is not the size of each copy but how many copies happen.",
      ],
    },
    {
      q: "Why is iterating an array of structs usually faster than an array of pointers to structs?",
      options: [
        "Pointers use more memory",
        "Each cache line fetch brings neighbouring elements with it, so contiguous data avoids most memory stalls",
        "The compiler cannot optimise pointers",
        "Pointer arithmetic is slow",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Contiguity turns one memory fetch into many useful elements, and the prefetcher recognises the forward pattern. Pointer chasing defeats both and pays a cache miss per element.",
      distractors: [
        "True but minor. The extra 8 bytes per entry is not what costs you; the stall waiting for scattered memory is.",
        "",
        "Compilers optimise pointer code perfectly well. The bottleneck is memory latency, not code generation.",
        "The arithmetic itself is one instruction. It is the fetch it triggers that is slow.",
      ],
    },
    {
      q: "You must remove every element failing a predicate from a large array, in place. Best approach?",
      options: [
        "Loop backwards calling delete on each failure",
        "A read pointer and a write pointer — copy survivors forward, then truncate",
        "Build a new array with filter",
        "Sort so failures group together, then truncate",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The read/write two-pointer compaction is one pass, O(n) time, O(1) extra space, and no shifting. It is the in-place idiom worth having in your fingers.",
      distractors: [
        "Better than looping forwards, since it avoids skipping elements, but each delete still shifts the tail — O(n) per removal, so O(n^2) overall.",
        "",
        "Correct and clear, and the right default when memory is not tight. It is O(n) extra space, which is exactly what 'in place' rules out.",
        "Sorting costs O(n log n) and destroys the original order, which the question did not permit you to do.",
      ],
    },
    {
      q: "In Python, `queue = []` then `queue.pop(0)` in a loop draining n items costs:",
      options: ["O(n)", "O(n log n)", "O(n^2)", "Amortised O(1) per pop"],
      answer: 2,
      difficulty: "apply",
      why: "`pop(0)` shifts every remaining element one slot left, so it is O(n) each time and O(n^2) for the drain. `collections.deque` makes it O(1) per pop.",
      distractors: [
        "This is what you would get with a deque, where both ends are O(1).",
        "No sorting or halving is involved.",
        "",
        "Amortised O(1) applies to `pop()` from the end, not `pop(0)` from the front.",
      ],
    },
    {
      q: "You know you will insert exactly 1,000,000 elements. What do you do first?",
      options: [
        "Nothing — amortised O(1) already covers it",
        "Preallocate the capacity",
        "Use a linked list to avoid resizing",
        "Insert in sorted order",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Preallocating removes about 20 resize copies and roughly 2 million element moves, and removes the pauses those copies cause. Amortised O(1) is a claim about the total, not a reason to skip a free improvement.",
      distractors: [
        "The total is fine either way. What preallocation buys you is the removal of the individual slow appends, which are the ones that show up in p99.",
        "",
        "A linked list allocates a node per element and destroys cache locality — far worse in practice than the resizes you were avoiding.",
        "Insertion order does not affect resizing at all, and sorted insertion into an array is O(n) per insert.",
      ],
    },
    {
      q: "Which is the strongest argument for a linked list over an array?",
      options: [
        "Insertion is O(1)",
        "You already hold a reference to the node, so splicing needs no search and no shifting",
        "It uses less memory",
        "It is easier to reason about",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The O(1) insertion claim is only true once you are already at the position, and getting there is O(n). The real use case is when something else hands you the node — an LRU cache moving an entry to the front, or an intrusive list in a kernel.",
      distractors: [
        "Incomplete, and this is the trap. Finding the position is O(n), so end-to-end insertion is O(n) unless you were handed the node.",
        "",
        "It uses more — a pointer per node, plus allocator overhead per node.",
        "Subjective, and most people find arrays easier. It is certainly not a performance argument.",
      ],
    },
    {
      q: "An array-of-structs layout is changed to struct-of-arrays. Which workload benefits most?",
      options: [
        "Reading every field of one record",
        "Summing one field across every record",
        "Inserting new records",
        "Deleting records by id",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Struct-of-arrays puts each field in its own contiguous block, so a scan over one field touches only memory it needs. This is exactly why columnar formats such as Parquet and Arrow exist for analytics.",
      distractors: [
        "This gets worse — the fields of one record are now scattered across several arrays, so you pay a separate fetch for each.",
        "",
        "Insertion is roughly the same or slightly worse, since you now append to several arrays instead of one.",
        "Deletion is unaffected by the layout; you still have to find the record first.",
      ],
    },
    {
      q: "Your `productExceptSelf` passes every test but fails the O(n) gate. What did you most likely write?",
      options: [
        "You forgot to handle zeros",
        "A nested loop, or a `reduce`/`slice`/`filter` call inside the loop, each of which is a full pass",
        "You used too much memory",
        "The gate is unreliable at these input sizes",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A hidden pass inside the loop is the classic cause. `nums.slice(0, i)`, `arr.filter(...)` and `arr.reduce(...)` are all O(n), so calling one per element makes the function quadratic even though every test still passes.",
      distractors: [
        "Zeros are a correctness concern, and correctness tests run before the gate — you would have failed those instead.",
        "",
        "The gate measures time, not memory. An O(n) extra array is expected here.",
        "The gate takes the median of repeated runs at four doubling sizes specifically so noise does not decide the verdict.",
      ],
    },
  ],
};

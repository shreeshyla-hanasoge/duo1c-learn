import type { Topic } from "../types.ts";

export const bitManipulation: Topic = {
  id: "bit-manipulation",
  title: "Bit manipulation",
  tier: 4,
  week: 20,
  depth: "core",
  summary: "Masks, XOR tricks, popcount, subset enumeration.",
  why: "Compact state, allocation-free set operations, and the substrate every bitmask DP is built on.",
  complexity: "O(1) per operation",
  viz: ["bitmask"],
  learn: {
    intuition:
      "A 64-bit integer is not really a number when you are doing this — it is sixty-four yes/no answers stored side by side, and the processor can operate on all sixty-four of them in one instruction. That is the whole appeal. A set of sixty-four possible members, intersected with another such set, is one AND. Union is one OR. 'Everything not in this set' is one NOT. Each of those would be a loop over a hash set, with allocation and pointer chasing, and here it is a single cycle with no memory traffic at all. The second idea worth internalising separately is XOR, which behaves unlike the others: it is its own inverse, so applying the same value twice returns you exactly where you started. That makes XOR the operation for 'cancel out everything that appears an even number of times', and it is why a whole family of puzzles about finding the odd one out collapse into a single pass with no extra memory. Most bit tricks are one of those two ideas — a set in an integer, or something cancelling itself.",
    mechanics: [
      {
        heading: "The four operations you actually need",
        body: "Test a bit: `(x >> i) & 1`, or `x & (1 << i)` when you only care whether it is non-zero. Set: `x | (1 << i)`. Clear: `x & ~(1 << i)`. Flip: `x ^ (1 << i)`. Everything else is built from these, and being fluent with them matters more than memorising exotic identities.",
      },
      {
        heading: "XOR is its own inverse",
        body: "`x ^ x === 0` and `x ^ 0 === x`. So XOR-ing a whole array cancels every value that appears an even number of times and leaves the one that does not. It is also commutative and associative, so the order is irrelevant — which is what lets it work on a stream, and what makes it safe to combine partial results from different threads.",
      },
      {
        heading: "The two lowest-set-bit identities",
        body: "`x & (-x)` isolates the lowest set bit as a value; `x & (x - 1)` clears it. Looping on the second visits each set bit once, so a popcount runs in popcount steps rather than in sixty-four. Both come from the same fact: subtracting one flips the lowest set bit to zero and turns everything below it into ones.",
      },
      {
        heading: "Enumerate subsets, and sub-masks",
        body: "All 2^n subsets of n items: `for (let m = 0; m < (1 << n); m++)`. Every sub-mask of a particular mask: `for (let s = mask; s > 0; s = (s - 1) & mask)`, which visits each exactly once and, summed over all masks, costs 3^n rather than 4^n. That second loop is not obvious and is worth committing to memory — it is the standard tool for set-partition problems.",
      },
      {
        heading: "JavaScript's bitwise operators are 32-bit and signed",
        body: "Every bitwise operator coerces to a signed 32-bit integer, so `1 << 31` is negative and `1 << 32` is 1, not four billion. Ordinary numbers are doubles with 53 bits of integer precision, so arithmetic and bitwise operations disagree about what a large integer is. Use `>>> 0` to read a result as unsigned, and `BigInt` when you genuinely need more than 32 bits. This is a real source of silent wrongness rather than a curiosity.",
      },
    ],
    complexityDerivation:
      "Individual bit operations are O(1) — one machine instruction, no memory access beyond the register. The honest accounting is that they are O(1) *per word*, which means an operation over a set of n possible members is O(n / 64) rather than O(1), because the set needs n/64 words. That is still a constant-factor win rather than an asymptotic one, and it is a large constant: a bitset intersection processes sixty-four members per instruction where a hash-set intersection processes one per several instructions plus a cache miss. In practice that is one or two orders of magnitude, which is often the difference that matters even though the Big-O is unchanged. Where bit manipulation does change the asymptotics is by making an exponential algorithm affordable — subset enumeration is 2^n either way, but with masks each state is an array index rather than a set object, so the constant shrinks enough to move the practical ceiling from around twelve items to around twenty. Being precise about which of those two things you are claiming — a better constant, or a feasible exponential — is what separates a useful argument from bit-twiddling for its own sake.",
    variants: [
      {
        name: "Flags and permissions",
        when: "A handful of independent booleans travelling together.",
        delta:
          "One integer instead of a struct. Compact, cheap to compare, and awkward to debug — always keep named constants rather than raw numbers.",
      },
      {
        name: "Bitsets for large sets",
        when: "Membership over a large but bounded universe of integers.",
        delta:
          "n/64 words, with intersection and union at sixty-four members per instruction. The standard structure behind database bitmap indexes.",
      },
      {
        name: "XOR for cancellation",
        when: "Finding what does not pair up — a missing ID, a corrupted block, the odd one out.",
        delta:
          "O(n) time and O(1) space with no data structure at all. RAID parity is exactly this idea applied to disks.",
      },
      {
        name: "Bit-parallel algorithms",
        when: "An inner loop over a small alphabet or a short pattern.",
        delta:
          "Whole rows of a DP table packed into a word — the Myers bit-vector algorithm computes edit distance sixty-four cells at a time. Same complexity, dramatically better constant.",
      },
    ],
    tradeoffs: [
      {
        vs: "A Set or a boolean array",
        pick: "The Set unless you have measured that this is hot",
        because:
          "`Set` is readable, unbounded, works with any key type, and is fast enough almost everywhere. A bitmask is limited to a small fixed universe, needs named constants to stay legible, and in JavaScript quietly caps at 32 bits. It earns its place in an inner loop, as a DP state, or where memory is genuinely the constraint — and in a code review the burden of proof is on the bitmask.",
      },
      {
        vs: "A hash-set intersection",
        pick: "Bitsets when the universe is bounded and intersections are frequent",
        because:
          "This is what bitmap indexes in analytics databases are for: 'customers in Karnataka AND who bought in the last month' becomes an AND over two bitmaps, sixty-four rows per instruction, against a hash join that touches each row individually. The precondition is a bounded, densely numbered universe — row IDs qualify, arbitrary strings do not without a dictionary mapping first.",
      },
      {
        vs: "Clever bit tricks over clear code",
        pick: "Clear code, and comment the trick when you do use one",
        because:
          "Swapping two variables with XOR, or branchless absolute value, made sense when compilers were weaker. Today they are usually no faster and always harder to read, and some — the XOR swap — are outright wrong when both operands alias the same location. `x & (x - 1)` and `x & (-x)` are worth knowing because they appear in real structures like Fenwick trees; the rest of the folklore is mostly a liability.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — packed signal and filter flags",
      kind: "yours",
      problem:
        "Each bar carries many independent boolean conditions — trend up, volume spike, inside a session window, above a moving average. Holding them as separate fields and testing them individually means a comparison per condition per bar, across hundreds of thousands of bars per backtest.",
      applied:
        "Pack the conditions into one integer per bar, and express a strategy's entry condition as a required mask. Testing becomes `(flags & required) === required` — a single AND regardless of how many conditions the strategy names, and the same word is cheap to store alongside each bar.",
      evidence: "strategy-engine/src/config/strategy_config.py",
      impact: "One comparison per condition per bar → one AND per bar",
    },
    {
      system: "Bitmap indexes in analytics databases",
      kind: "industry",
      problem:
        "Answering 'customers in Karnataka who bought in the last month and opted into notifications' over hundreds of millions of rows, without touching each row three times.",
      applied:
        "One bitmap per attribute value, with a bit per row. The query becomes an AND of three bitmaps, processing sixty-four rows per instruction. Roaring bitmaps refine this by switching representation per block — dense blocks stay as bitmaps, sparse ones become sorted arrays — because a bitmap over a sparse attribute is mostly zeros.",
      impact: "Row-by-row filtering → 64 rows per instruction, over compressed bitmaps",
    },
    {
      system: "Unix file modes and IAM policies",
      kind: "industry",
      problem:
        "Storing and checking a set of independent permissions compactly, and comparing a request's required permissions against what a principal holds.",
      applied:
        "`chmod 755` is three octal digits, each three bits of read/write/execute. A permission check is an AND with the required mask. The design survives because the operations are exactly the set operations you want: granting is OR, revoking is AND-NOT, and checking is AND.",
      impact:
        "Permission checks as a single instruction, and the whole set stored in two bytes",
    },
    {
      system: "CIDR routing and subnet matching",
      kind: "industry",
      problem:
        "Deciding which network a packet's destination belongs to, on every packet, at line rate.",
      applied:
        "A subnet like `10.2.0.0/16` is an address plus a mask with the top sixteen bits set. Membership is `(addr & mask) === network` — one AND and one comparison. Longest-prefix matching then picks the most specific route, which is why the mask length is part of the notation rather than an afterthought.",
      impact: "Per-packet routing decisions reduced to two integer operations",
    },
  ],
  lab: {
    prompt:
      "Return the largest value of `a XOR b` over all pairs of elements in `nums`. Return 0 for fewer than two elements. All values are non-negative and fit in 32 bits. Budget: O(n) — comparing every pair is O(n²) and will fail the gate.",
    fnName: "maxXor",
    signature: "maxXor(nums: number[]): number",
    starter: `function maxXor(nums) {
// Your budget: O(n * 32), which is O(n).
// Build the answer one bit at a time, from the HIGHEST bit down.
// At each step, ask: can I achieve a 1 in this position? Keep a set of
// the prefixes seen so far and check whether any two of them differ
// here in the way you need.

return 0;
}`,
    tests: [
      {
        // 5 ^ 25 = 28.
        name: "classic case",
        input: [[3, 10, 5, 25, 2, 8]],
        expected: 28,
      },
      {
        // 2 ^ 4 = 6.
        name: "two elements",
        input: [[2, 4]],
        expected: 6,
      },
      {
        // 8 ^ 2 = 10 beats 8 ^ 10 = 2 and 10 ^ 2 = 8.
        name: "the biggest pair is not the biggest values",
        input: [[8, 10, 2]],
        expected: 10,
      },
      {
        name: "larger set",
        input: [[14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70]],
        expected: 127,
      },
      {
        // Identical values XOR to 0, so the answer is 0 — not the value.
        name: "duplicates only",
        input: [[5, 5]],
        expected: 0,
      },
      { name: "single element", input: [[0]], expected: 0, hidden: true },
      { name: "empty", input: [[]], expected: 0, hidden: true },
      {
        // 1^6, 2^5 and 3^4 all give 7.
        name: "several pairs tie",
        input: [[1, 2, 3, 4, 5, 6, 7]],
        expected: 7,
        hidden: true,
      },
    ],
    hints: [
      "Work from the highest bit down, building the answer greedily. A 1 in a high position is worth more than every lower bit combined, so if a 1 is achievable there, take it — no later choice can make up for giving it up.",
      "At bit `i`, mask every number down to its top bits (`num >> i`) and put those prefixes in a Set. You want to know whether two prefixes exist whose XOR equals your candidate answer.",
      "Use the identity `a ^ b === c` implies `a ^ c === b`. So for each prefix `p` in the set, check whether `p ^ candidate` is also in the set. If any is, the candidate is achievable — keep it and move to the next bit.",
    ],
    solution: `function maxXor(nums) {
if (nums.length < 2) return 0;

let best = 0;
const prefixes = new Set();

// Highest bit first. A 1 high up outweighs every lower bit combined,
// so a greedy choice here can never need to be undone.
for (let bit = 31; bit >= 0; bit--) {
  prefixes.clear();
  for (const n of nums) prefixes.add(n >>> bit);

  // Could we manage a 1 in this position, keeping everything already won?
  const candidate = (best << 1) | 1;

  let achievable = false;
  for (const p of prefixes) {
    // a ^ b === candidate  <=>  a ^ candidate === b.
    // So if p and (p ^ candidate) are both present, some pair achieves it.
    if (prefixes.has(p ^ candidate)) { achievable = true; break; }
  }

  best = achievable ? candidate : best << 1;
}

return best;
}`,
    complexityGate: {
      target: "O(n)",
      // Values are spread across the full 32-bit range by a multiplicative
      // hash, so the greedy genuinely has to test every bit level. Small
      // or clustered values would let the high bits resolve immediately
      // and shrink the work in a way the quadratic version also enjoys.
      gen: "(n) => [Array.from({ length: n }, (_, i) => ((i * 2654435761) % 4294967296) >>> 0)]",
      sizes: [2000, 4000, 8000, 16000],
    },
  },
  insights: [
    {
      t: "XOR is its own inverse",
      d: "`x ^ x === 0` and `x ^ 0 === x`, so XOR-ing everything cancels every value appearing an even number of times. It is also commutative and associative, which is what lets it work on a stream or across threads in any order.",
    },
    {
      t: "Enumerate all 2ⁿ subsets with one loop",
      d: "`for (let m = 0; m < (1 << n); m++)` — the integer is the subset, and counting upward already visits every subset after all of its own subsets.",
    },
    {
      t: "Iterate submasks of a mask",
      d: "`sub = (sub - 1) & mask` walks every subset of a given mask. The total across all masks is 3ⁿ, not 4ⁿ — a well-known and useful bound.",
    },
    {
      t: "JavaScript's bitwise operators are 32-bit and signed",
      d: "`1 << 31` is negative and `1 << 32` is 1. Numbers are doubles with 53 bits of integer precision, so arithmetic and bitwise operations disagree about large integers. Use `>>> 0` to read unsigned, or BigInt beyond 32 bits.",
    },
    {
      t: "The win is usually a constant factor, not a complexity class",
      d: "A bitset intersection is O(n/64) rather than O(1) — still linear, just sixty-four members per instruction. Be precise about whether you are claiming a better constant or a newly feasible exponential.",
    },
  ],
  pitfalls: [
    "Assuming JavaScript bitwise operations work past 32 bits. `1 << 32` is 1, and the failure is silent.",
    "Using `x & (1 << i)` as a boolean when `i` is 31 — the result is negative rather than positive, which trips comparisons against 1.",
    "The XOR swap trick on two references that alias the same variable, which zeroes it.",
    "Reaching for a bitmask where a `Set` would do. Unless the universe is bounded and the path is hot, it costs readability and buys nothing.",
  ],
  quiz: [
    {
      q: "Every element in an array appears twice except one. XOR-ing them all gives:",
      options: ["0", "The unique element", "The sum", "The largest element"],
      answer: 1,
      difficulty: "recall",
      why: "Pairs cancel to 0 because x ^ x = 0, and 0 ^ y = y leaves the singleton. O(n) time, O(1) space.",
      distractors: [
        "0 is what you would get if EVERY element paired up. The unpaired one is exactly what survives.",
        "",
        "XOR is sometimes called addition without carries, and that missing carry is the whole difference — it is why pairs cancel instead of doubling.",
        "XOR has no notion of ordering, so it cannot select a maximum.",
      ],
    },
    {
      q: "Bitmask DP is practical up to roughly:",
      options: ["n = 10", "n = 20 (about 1M states)", "n = 50", "n = 100"],
      answer: 1,
      difficulty: "recall",
      why: "2²⁰ ≈ 1M is comfortable. 2³⁰ is a billion states and out of reach for both time and memory.",
      distractors: [
        "2¹⁰ is only a thousand states — comfortably feasible, so this is well under the real ceiling and gives up problems you could have solved.",
        "",
        "2⁵⁰ is around 10¹⁵ states. Nothing stores that.",
        "2¹⁰⁰ exceeds the number of atoms in the observable universe.",
      ],
    },
    {
      q: "In JavaScript, what is `1 << 32`?",
      options: ["4294967296", "1", "0", "A BigInt"],
      answer: 1,
      difficulty: "apply",
      why: "Bitwise operators coerce to 32-bit integers and the shift count is taken modulo 32, so shifting by 32 is shifting by 0. It fails silently, which is what makes it dangerous.",
      distractors: [
        "That is the mathematically correct 2³², and what you would get from `2 ** 32`. The bitwise operator does not agree with the arithmetic one, which is the trap.",
        "",
        "Shifting bits off the end gives 0 for shifts of 1 to 31 applied repeatedly, but a shift count of exactly 32 wraps to 0 and returns the original value.",
        "Bitwise operators never produce BigInt from a Number; mixing the two throws instead.",
      ],
    },
    {
      q: "`x & (x - 1)` does what, and what is it good for?",
      options: [
        "Isolates the lowest set bit; used in Fenwick trees",
        "Clears the lowest set bit; looping on it counts set bits in popcount steps rather than 32",
        "Doubles x",
        "Tests whether x is odd",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Subtracting 1 flips the lowest set bit to 0 and sets everything below it, so the AND clears the whole tail. Repeatedly applying it visits exactly the set bits, which is why a sparse word counts fast.",
      distractors: [
        "Isolating is `x & (-x)`, and Fenwick trees use that one. The two are easy to swap and do opposite things.",
        "",
        "Doubling is `x << 1`. This expression can only ever remove bits.",
        "Parity is `x & 1`. This returns a whole number with one fewer set bit, not a 0 or 1.",
      ],
    },
    {
      q: "An analytics query ANDs three bitmap indexes over 200 million rows. What is the actual win over a row-by-row filter?",
      options: [
        "It changes the complexity from O(n) to O(log n)",
        "It stays O(n) but processes 64 rows per instruction with no per-row memory traffic — a large constant-factor win",
        "It avoids reading the data",
        "It parallelises across cores",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The scan is still linear in the row count. What changes is that sixty-four rows fit in one word, so the loop runs n/64 times with no pointer chasing and excellent cache behaviour. Being precise that this is a constant and not a complexity class is the point.",
      distractors: [
        "Nothing here is halving a search space. Every row still has to be considered — just very cheaply.",
        "",
        "The bitmaps ARE the data being read. They are far smaller than the rows, which helps, but they are still scanned.",
        "Bitmap operations parallelise well, but that is an independent choice and applies to row-by-row filtering too.",
      ],
    },
    {
      q: "Which of these bit tricks is worth keeping in modern code?",
      options: [
        "XOR swap of two variables",
        "`x & (x − 1)` and `x & (−x)`, because they appear in real structures like Fenwick trees",
        "Branchless absolute value via shifts",
        "Multiplying by shifting",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Those two are load-bearing in structures you will actually read and write. The rest of the folklore was aimed at compilers that no longer exist, and today mostly costs readability for no measurable gain.",
      distractors: [
        "It is no faster than a temporary variable and it is WRONG when both arguments alias the same location, which zeroes the value. A trick with a correctness failure mode is not a trick worth keeping.",
        "",
        "Every compiler generates branchless absolute value already, from the obvious code, and does it better than a hand-written version.",
        "`x * 8` and `x << 3` compile to the same instruction. Writing the shift only obscures the intent.",
      ],
    },
    {
      q: "You need set membership over arbitrary string keys in a hot loop. Bitmask or Set?",
      options: [
        "Bitmask — it is faster",
        "Set — a bitmask needs a bounded, densely numbered universe, and strings would first need a dictionary mapping that costs more than it saves",
        "Bitmask, after hashing the strings",
        "Neither — use an array",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The bitmask's precondition is a small integer universe. Mapping strings to compact indices needs the full key set in advance and a lookup per operation, which reintroduces exactly the hashing you were trying to avoid.",
      distractors: [
        "It would be, if the precondition held. Quoting the speed without checking the precondition is the mistake.",
        "",
        "Hashing to a bit position creates collisions, which turns exact membership into a Bloom filter — a legitimate structure, but it answers a weaker question and you must say so.",
        "A plain array gives O(n) membership, which is worse than both for anything but a handful of keys.",
      ],
    },
    {
      q: "Why is XOR the right operation for RAID parity?",
      options: [
        "It is the fastest operation available",
        "It is its own inverse, so the parity block reconstructs any single missing block by XOR-ing the survivors — and order does not matter",
        "It compresses the data",
        "It detects which block failed",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Parity is the XOR of all data blocks. Lose one and XOR-ing the parity with every remaining block cancels them all and leaves exactly the missing one. Commutativity and associativity mean the blocks can be combined in any order, which matters when they live on different disks.",
      distractors: [
        "Speed is a nice side effect. Addition is comparably fast and cannot reconstruct without carries and overflow handling.",
        "",
        "The parity block is the same size as a data block, so this adds storage rather than saving it.",
        "It does not — the controller learns which disk failed from the hardware. XOR recovers the contents once you already know which one is gone, and cannot identify the culprit itself.",
      ],
    },
  ],
};

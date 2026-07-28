import type { Topic } from "../types.ts";

export const probabilistic: Topic = {
  id: "probabilistic",
  title: "Probabilistic & streaming",
  tier: 4,
  week: 21,
  depth: "deep",
  summary: "Bloom filter, Count-Min sketch, HyperLogLog, reservoir sampling.",
  why: "The judgment tier in structure form: accept a bounded error and pay a fraction of the memory.",
  complexity: "Sub-linear space",
  viz: ["bloom"],
  learn: {
    intuition:
      "Every structure so far has stored enough to answer exactly. These deliberately do not. The trade is simple and, once you see it, very hard to unsee: you give up certainty in one specific direction and get an enormous amount of memory back. A Bloom filter is the clearest case. Instead of storing keys, keep a plain array of bits, and for each key set a handful of bit positions chosen by hashing it. To test membership, check those same positions. If any of them is zero, the key was definitely never inserted — because inserting it would have set that bit, and bits are never cleared. If all of them are one, the key is *probably* present, but it might just be that other keys happened to set exactly those positions between them. So the error is one-sided: no false negatives, some false positives. That asymmetry is not a defect to apologise for, it is the whole product. It is what lets a Bloom filter sit in front of an expensive lookup and eliminate most of them with certainty, falling through to the real check only when it says 'maybe'. Every structure in this family works the same way: pick the direction in which being wrong is survivable, and buy memory with it.",
    mechanics: [
      {
        heading: "Bloom filter: k bits per key, never cleared",
        body: "Insert by setting `k` bit positions derived from `k` hashes of the key. Query by testing those same positions. A single zero proves absence; all ones means 'maybe'. Because bits are only ever set, deletion is impossible — clearing a bit could break some other key that shares it. If you need deletion, a counting Bloom filter stores small counters instead of bits, at several times the memory.",
      },
      {
        heading: "Size the filter before you build it, not after",
        body: "The false-positive rate is roughly `(1 - e^(-kn/m))^k` for n items in m bits with k hashes, and the optimal k is about `(m/n)·ln2`. In practice you invert it: state the error rate you can tolerate and the number of items you expect, and those two determine m and k. About ten bits per item gives roughly 1%, and fifteen gives roughly 0.1%. A filter that was not sized for the load it received degrades to answering 'maybe' for everything, which is not an error — it is just useless.",
      },
      {
        heading: "Count-Min sketch: several rows, take the minimum",
        body: "A grid of counters with one hash per row. To record an event, increment one counter in each row. To query, read one counter per row and take the smallest. Collisions can only ever add to a counter, so every reading is an over-estimate, and the minimum across rows is the least-contaminated of them. One-sided again — it never under-counts — which is what makes it safe for 'is this above a threshold' questions and unsafe for 'is this below one'.",
      },
      {
        heading: "HyperLogLog: count distinct things by watching for rare patterns",
        body: "Hash each item and look at how many leading zeros the hash has. Seeing a hash with twenty leading zeros suggests you have seen roughly 2²⁰ distinct items, because that pattern is that rare. One such observation is far too noisy, so keep thousands of independent buckets and average them harmonically. The result estimates cardinality within a couple of percent using about 12 KB, no matter whether the true count is a thousand or a billion.",
      },
      {
        heading: "Reservoir sampling: a fair sample from a stream of unknown length",
        body: "Keep the first k items. For item number i after that, accept it with probability k/i, and if accepted, have it replace a uniformly chosen existing member. Every item ends up equally likely to be in the sample, which you can prove by induction, and it needs one pass and O(k) memory with no advance knowledge of the stream's length. This is how you sample logs at a fixed volume without knowing how much traffic the day will bring.",
      },
    ],
    complexityDerivation:
      "A Bloom filter's operations are O(k) — a fixed number of hashes and bit tests, independent of how many items are stored — and its memory is m bits chosen from the error target rather than from the data. That is the important structural point: memory is a parameter, not a consequence. An exact hash set storing a hundred million 16-byte keys needs well over 1.6 GB once you count pointers and load factor; a Bloom filter at 1% error needs about ten bits each, or 125 MB, and at 0.1% about 190 MB. The saving is more than an order of magnitude and it comes entirely from never storing the keys. HyperLogLog is more striking still, because its memory does not grow with the item count at all — the register count is fixed, so a billion distinct values cost the same 12 KB as a thousand, at about 2% relative error. Count-Min is O(rows) per operation with width × depth counters. The analysis worth carrying into a design review is not any of these formulas but the shape they share: you choose the error rate first, and the memory follows from it. That inverts the usual conversation, which starts from how much data there is and asks what it will cost.",
    variants: [
      {
        name: "Bloom filter",
        when: "Set membership where a false 'maybe' costs only a wasted lookup.",
        delta:
          "No false negatives, tunable false positives, no deletion. The gate in front of an expensive check.",
      },
      {
        name: "Counting Bloom / cuckoo filter",
        when: "You need to delete.",
        delta:
          "Counting Bloom stores small counters instead of bits, several times the memory. A cuckoo filter stores fingerprints, supports deletion, and is usually smaller than a counting Bloom at the same error rate — generally the better modern choice.",
      },
      {
        name: "Count-Min sketch",
        when: "Frequencies and heavy hitters in a stream.",
        delta:
          "Over-counts only. Excellent for finding the top few, poor for anything rare, because a rare item's count is dominated by the collisions on top of it.",
      },
      {
        name: "HyperLogLog",
        when: "Distinct counts at scale, especially when they must be merged.",
        delta:
          "Fixed ~12 KB regardless of cardinality. Crucially, two sketches merge by taking the per-register maximum — so counts from different shards or days combine exactly, which is something sampling cannot do.",
      },
    ],
    tradeoffs: [
      {
        vs: "An exact hash set",
        pick: "The exact set until memory is genuinely the constraint",
        because:
          "A set is exact, supports deletion, and needs no capacity planning or error budget. The probabilistic version buys memory with correctness, and that is only a good trade when the memory matters and the error is survivable. For a million items a set is tens of megabytes and nobody notices; for a hundred billion it is not an option at any price. Name which regime you are in before proposing the sketch.",
      },
      {
        vs: "Sampling the stream",
        pick: "Sketches when the answer must be aggregated across shards or windows",
        because:
          "A 1% sample is simple and gives unbiased estimates of totals — but it is terrible at distinct counts, because whether a rare item appears at all is a coin flip, and samples from different shards cannot be combined into a distinct count. HyperLogLog sketches merge exactly by taking the maximum per register, which is what makes 'unique users this month' computable from daily sketches. That mergeability, not the memory, is usually the deciding property.",
      },
      {
        vs: "Using a Bloom filter to answer the question directly",
        pick: "Only ever as a gate in front of an exact check",
        because:
          "A 'maybe' is not an answer. The structure earns its place when a false positive costs a wasted lookup that then resolves correctly — a disk read, a network call — and it is dangerous when a false positive is taken as truth. 'Has this user already claimed the offer' cannot be answered by a Bloom filter alone, because 1% of users are wrongly refused and there is no fallback path to correct it.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — de-duplicating replayed fills on reconnect",
      kind: "yours",
      problem:
        "A broker websocket replays recent messages after a reconnect, so the same fill can arrive twice. Acting on a duplicate books a position that does not exist. Keeping every ID seen during a session in a set grows without bound across a long-running process.",
      applied:
        "A Bloom filter over fill IDs as a first-line gate. 'Definitely not seen' is certain, so a new fill is processed immediately with no further checking, and only the rare 'maybe' pays for an exact lookup against the recent-ID set. The one-sided error is the right way round here: the expensive answer is the safe one.",
      evidence: "strategy-engine/src/brokers/broker_manager.py",
      impact: "Unbounded ID set → fixed-size filter with an exact check on the rare maybe",
    },
    {
      system: "Bloom filters in LSM-tree storage engines",
      kind: "industry",
      problem:
        "RocksDB and Cassandra store data across many immutable files on disk. A key lookup could in principle need to read every one of them, and most of those reads find nothing.",
      applied:
        "Each file carries a Bloom filter over its keys, held in memory. A lookup consults the filters first and skips every file whose filter says 'definitely not present' — which is most of them, with certainty. Only 'maybe' costs a disk read. This is the canonical use, and it works because a false positive costs one wasted read that then returns the correct answer.",
      impact: "A disk read per file per lookup → a read only where the key might actually be",
    },
    {
      system: "HyperLogLog for unique counts",
      kind: "industry",
      problem:
        "Reporting unique visitors per day, per week and per month over billions of events. Exact distinct counts need every identifier held somewhere, and the monthly figure is not the sum of the daily ones.",
      applied:
        "Keep one HyperLogLog sketch per day at about 12 KB. The monthly unique count is the merge of thirty sketches — the per-register maximum — which is exact as a merge even though each sketch is approximate. That is the property no sampling scheme provides, and it is why Redis ships this as a first-class type.",
      impact:
        "Gigabytes of identifiers per period → 12 KB per period, with correct cross-period merging",
    },
    {
      system: "Count-Min sketch for heavy hitters",
      kind: "industry",
      problem:
        "Identifying the source addresses or API keys generating the most traffic, in real time, at line rate, without a counter per distinct key.",
      applied:
        "A Count-Min sketch sized to the acceptable over-count, paired with a small heap of current leaders. Because the sketch only ever over-counts, a key whose estimate is below the threshold is definitely below it — so nothing above the threshold is ever missed. Being certain in that direction is exactly what a rate limiter or an abuse detector needs.",
      impact: "A counter per distinct key → fixed memory, with no heavy hitter ever missed",
    },
  ],
  lab: {
    prompt:
      "Implement a Bloom filter over integer keys. `m` is the number of bits, `k` the number of hash functions, `inserts` the keys to add, and `queries` the keys to test. Return one boolean per query: `true` when the key might be present, `false` when it is definitely absent. Use exactly this hash family, so results are reproducible: `h(x, i) = (((x * 2654435761) ^ (i * 40503)) >>> 0) % m` for `i` from 0 to k−1. Budget: O((inserts + queries) · k).",
    fnName: "bloom",
    signature:
      "bloom(m: number, k: number, inserts: number[], queries: number[]): boolean[]",
    starter: `function bloom(m, k, inserts, queries) {
// Your budget: O((inserts + queries) * k) — independent of how many
// keys are stored.
// Keep m bits. Inserting sets k of them; querying tests the same k.
// A single zero bit proves absence. All ones means "maybe".
// const h = (x, i) => (((x * 2654435761) ^ (i * 40503)) >>> 0) % m;

return [];
}`,
    tests: [
      {
        // The defining property: everything inserted must come back true.
        // A Bloom filter has NO false negatives, ever.
        name: "no false negatives",
        input: [64, 3, [1, 2, 3], [1, 2, 3]],
        expected: [true, true, true],
      },
      {
        // A roomy filter with few keys returns false for absent keys.
        name: "absent keys in a roomy filter",
        input: [1024, 3, [1, 2, 3], [4, 5, 6, 7, 8]],
        expected: [false, false, false, false, false],
      },
      {
        // Four bits, six keys, three hashes: every bit gets set, so
        // EVERY query answers "maybe". A saturated filter is not broken,
        // it is useless — which is what sizing exists to prevent.
        name: "a saturated filter says maybe to everything",
        input: [4, 3, [1, 2, 3, 4, 5, 6], [99, 100, 101]],
        expected: [true, true, true],
      },
      {
        name: "empty filter answers no to everything",
        input: [64, 3, [], [1, 2, 3]],
        expected: [false, false, false],
      },
      {
        // Inserting the same key repeatedly sets the same bits. Bits are
        // set, never counted, so nothing changes.
        name: "duplicate inserts are idempotent",
        input: [64, 2, [7, 7, 7], [7, 8]],
        expected: [true, false],
      },
      { name: "no queries", input: [64, 3, [1, 2], []], expected: [], hidden: true },
      {
        name: "a single hash function",
        input: [128, 1, [10, 20], [10, 20, 30, 40]],
        expected: [true, true, false, false],
        hidden: true,
      },
      {
        name: "larger mix",
        input: [512, 4, [11, 22, 33, 44, 55], [11, 22, 33, 44, 55, 66, 77, 88]],
        expected: [true, true, true, true, true, false, false, false],
        hidden: true,
      },
    ],
    hints: [
      "Allocate `m` bits — a `Uint8Array(m)` with one byte per bit is fine here and keeps the indexing simple. Every bit starts at 0.",
      "To insert `x`, set the bit at `h(x, i)` for every `i` from 0 to `k-1`. Note that you only ever SET bits, never clear them — that is exactly why a Bloom filter cannot support deletion.",
      "To query `x`, test the same `k` positions. Return `false` the moment any of them is 0, because that proves the key was never inserted. Only if all `k` are set do you return `true`, and that answer means 'maybe', not 'yes'.",
    ],
    solution: `function bloom(m, k, inserts, queries) {
// One byte per bit: simpler to index, and the lab's sizes are small.
// A real implementation would pack 8 bits per byte.
const bits = new Uint8Array(m);

// The exact hash family the prompt specifies, so results are
// reproducible. What matters is that insert and query use the SAME
// hashes — a filter whose two paths disagree gives false negatives,
// which breaks the one guarantee it makes.
const h = (x, i) => (((x * 2654435761) ^ (i * 40503)) >>> 0) % m;

for (const x of inserts) {
  // Only ever SET. Bits are never cleared, which is precisely why
  // deletion is impossible: clearing a bit could break another key
  // that happens to share it.
  for (let i = 0; i < k; i++) bits[h(x, i)] = 1;
}

const out = [];
for (const q of queries) {
  let maybe = true;
  for (let i = 0; i < k; i++) {
    // A single zero PROVES absence — inserting q would have set it.
    if (!bits[h(q, i)]) { maybe = false; break; }
  }
  out.push(maybe);
}

return out;
}`,
    complexityGate: {
      target: "O(n)",
      // The filter is sized at 16 bits per key so it stays useful rather
      // than saturating, and both the insert and query loads scale with
      // the parameter. Cost per operation is k hashes regardless of how
      // many keys are stored, so the whole thing is linear — a solution
      // that keeps a list of inserted keys and scans it would be
      // quadratic and is exactly what this catches.
      gen: "(n) => [n * 16, 4, Array.from({ length: n }, (_, i) => i * 7), Array.from({ length: n }, (_, i) => i * 5)]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Bloom: false positives possible, false negatives impossible",
      d: "Every inserted key sets all its bits, so a single zero bit proves the key was never added. That one-sided certainty is what lets it sit in front of an expensive lookup and eliminate most of them.",
    },
    {
      t: "Count-Min sketch: frequencies that can only over-count",
      d: "Collisions add, never subtract, so every estimate is an upper bound and the minimum across rows is the least contaminated. Safe for 'is this above a threshold', unsafe for 'is this below one'.",
    },
    {
      t: "HyperLogLog counts distinct items in about 12 KB",
      d: "Memory does not grow with cardinality at all — a billion distinct values cost the same as a thousand, at roughly 2% error. And two sketches merge exactly by taking the per-register maximum.",
    },
    {
      t: "Reservoir sampling: a uniform sample from an unbounded stream",
      d: "Keep the first k; accept item i with probability k/i and evict a random member. One pass, O(k) memory, no advance knowledge of the stream's length.",
    },
    {
      t: "You choose the error rate first, and the memory follows",
      d: "That inverts the usual sizing conversation. A filter sized for a million keys and given ten million is not wrong — it answers 'maybe' to everything, which is useless in a way no exception will tell you about.",
    },
  ],
  pitfalls: [
    "Treating a Bloom filter's 'maybe' as a yes. It is only ever a gate in front of an exact check, and using it alone silently mistreats a percentage of real users.",
    "Trying to delete from a Bloom filter by clearing bits. Those bits may belong to other keys, and clearing them creates false NEGATIVES — the one error the structure promises never to make.",
    "Sizing the filter for the wrong number of items, so it saturates and answers 'maybe' to everything without any error being raised.",
    "Using a Count-Min sketch to identify rare items. A rare key's estimate is dominated by the collisions piled on top of it, which is the direction the structure is guaranteed to be wrong in.",
  ],
  quiz: [
    {
      q: "A Bloom filter says an element is NOT present. This is:",
      options: [
        "Possibly wrong",
        "Definitely correct — false negatives cannot occur",
        "Correct only if no collisions happened",
        "Correct 99% of the time",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Every inserted element sets all its bits, so a zero bit proves the element was never added. That certainty is what makes it usable as a gate.",
      distractors: [
        "The uncertainty runs the other way. A 'maybe' can be wrong; a 'no' cannot.",
        "",
        "Collisions cause false POSITIVES — extra bits set by other keys. They can never unset a bit, so they cannot produce a wrong 'no'.",
        "A probability would make the structure useless as a gate, because you could no longer skip the expensive check with confidence.",
      ],
    },
    {
      q: "To count distinct visitors across billions of events in fixed memory, use:",
      options: [
        "A hash set",
        "HyperLogLog",
        "A Bloom filter",
        "A Count-Min sketch",
      ],
      answer: 1,
      difficulty: "recall",
      why: "HyperLogLog is purpose-built for cardinality: about 12 KB for billions of distinct values at roughly 2% error. A hash set would need gigabytes.",
      distractors: [
        "Exact, and it needs every identifier in memory — which is the constraint the question rules out.",
        "",
        "A Bloom filter answers membership, not 'how many distinct'. You could count insertions that returned 'no', but the false positives would bias the count downward.",
        "Count-Min estimates the frequency of a GIVEN key. It does not know how many distinct keys it has seen.",
      ],
    },
    {
      q: "A Count-Min sketch's error is:",
      options: [
        "Symmetric — can over- or under-count",
        "One-sided — it never under-counts",
        "One-sided — it never over-counts",
        "Bounded by the number of rows",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Collisions add other keys' increments into the same counter, so every reading is at least the true count. Taking the minimum across rows picks the least contaminated estimate but cannot go below the truth.",
      distractors: [
        "Nothing ever subtracts, so the error cannot go both ways.",
        "",
        "Exactly backwards, and the direction is the whole point — over-counting is what makes it safe for threshold questions.",
        "More rows reduce the expected error but do not bound it in the way this suggests; the bound is stated in terms of the width and the total count.",
      ],
    },
    {
      q: "Why can you not delete from a Bloom filter by clearing its bits?",
      options: [
        "The hashes are not reversible",
        "Those bits may also belong to other keys, so clearing them creates false NEGATIVES — the one error the structure promises never to make",
        "It would be too slow",
        "You can, if you track the insertion order",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Bits are shared. Clearing one on behalf of a deleted key can make a still-present key report absent, which destroys the only guarantee the structure offers. Counting Bloom filters and cuckoo filters exist precisely to support deletion.",
      distractors: [
        "Reversibility is not needed — you can recompute the same positions from the key. The problem is that those positions are not exclusively yours.",
        "",
        "Clearing k bits costs exactly what setting them did. Speed is not the obstacle.",
        "Insertion order does not tell you whether another key also set a given bit, which is the information you would need.",
      ],
    },
    {
      q: "Your Bloom filter was sized for one million keys and has received ten million. What happens?",
      options: [
        "It throws an error",
        "It saturates — nearly every bit is set, so almost every query answers 'maybe' and the filter stops eliminating anything",
        "It starts producing false negatives",
        "It automatically resizes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "There is no capacity check to fail. It degrades into a structure that always says 'maybe', which is not incorrect — every query then falls through to the exact check, so the system is correct and the filter is doing nothing but costing memory.",
      distractors: [
        "Nothing detects overflow. Bits are just set, and the array cannot tell you it is full of them.",
        "",
        "False negatives remain impossible regardless of load — the guarantee holds even in the useless case.",
        "It is a fixed bit array. Resizing would require rehashing keys the filter never stored.",
      ],
    },
    {
      q: "'Has this user already claimed the offer?' — answered by a Bloom filter alone. What is wrong?",
      options: [
        "It is too slow",
        "About 1% of users who never claimed will be wrongly refused, and there is no exact check behind it to correct the mistake",
        "It uses too much memory",
        "Nothing — this is the standard use",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The structure is a gate, not an oracle. It works when a 'maybe' triggers an exact lookup that resolves correctly. Used as the final answer, its false positives become real users denied something they were entitled to, silently and unreproducibly.",
      distractors: [
        "It is extremely fast — a few hash computations. Speed is what makes it tempting here.",
        "",
        "Memory is the thing it saves. That is the whole reason it was proposed.",
        "The standard use is in FRONT of an exact check. Removing the check removes the property that made it safe.",
      ],
    },
    {
      q: "Why is HyperLogLog preferred over a 1% sample for monthly unique users?",
      options: [
        "It is more accurate on totals",
        "Sketches merge exactly — the monthly count is the per-register maximum of the daily ones, whereas samples from different days cannot be combined into a distinct count",
        "It uses less CPU",
        "Samples are biased",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Mergeability is usually the deciding property rather than memory. Unique counts are not additive, so daily samples cannot be summed, and whether a rare user appears in a sample at all is a coin flip. Merging sketches gives the true monthly union.",
      distractors: [
        "For simple totals a sample is genuinely fine and unbiased. Distinct counts are the case where it falls apart.",
        "",
        "Sampling is cheaper per event. CPU is not what decides this.",
        "A uniform sample gives unbiased estimates of sums and averages. Its failure on distinct counts is about combining and about rare items, not bias in general.",
      ],
    },
    {
      q: "You need approximate membership WITH deletion. What should you propose?",
      options: [
        "A Bloom filter, clearing bits on delete",
        "A cuckoo filter — it stores fingerprints, supports deletion, and is usually smaller than a counting Bloom at the same error rate",
        "A hash set",
        "A Count-Min sketch",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Counting Bloom filters solve deletion by replacing bits with counters at several times the memory. Cuckoo filters store short fingerprints in a cuckoo hash table, delete cleanly by removing one, and are generally the better modern default.",
      distractors: [
        "This introduces false negatives, destroying the structure's only guarantee.",
        "",
        "Exact and deletable, and it stores every key — which abandons the memory saving that motivated the question.",
        "It counts frequencies rather than answering membership, and decrementing it is unsafe for the same shared-counter reason.",
      ],
    },
  ],
};

import type { Topic } from "../types.ts";

export const ringBuffers: Topic = {
  id: "ring-buffers",
  title: "Ring buffers & lock-free queues",
  tier: 4,
  week: 21,
  depth: "deep",
  summary:
    "Circular queues, and the concepts behind lock-free single-producer/single-consumer.",
  why: "The structure for bounded history under a fixed memory budget — and the entry point to concurrent data structures.",
  complexity: "O(1) all operations",
  learn: {
    intuition:
      "A queue built on a growable array has a quiet problem: removing from the front either shifts everything down, which is O(n), or leaves a growing dead region at the start that never gets reclaimed. The ring buffer's answer is to stop thinking of the array as having a beginning. Allocate a fixed block, keep two indices — where the next item goes in, and where the next one comes out — and when an index runs off the end, wrap it to zero. The occupied region is now a window that travels around the array forever, and neither index ever needs to move backwards or drag anything with it. Two consequences follow, and they are why this structure appears wherever latency matters. First, memory is allocated once and never again, so there is no reallocation pause and nothing for a garbage collector to think about — which is precisely what an audio callback or a market-data handler cannot tolerate. Second, because the producer only ever advances the write index and the consumer only ever advances the read index, with one thread on each side they never write to the same variable. That is what makes a single-producer, single-consumer ring buffer safe with no lock at all.",
    mechanics: [
      {
        heading: "Two indices, and wrap with a modulus",
        body: "`head` is where the next item is read from, `tail` where the next is written. Advance with `(i + 1) % capacity`. Everything else in this structure is a consequence of that one line, and both operations are a constant number of steps regardless of how full the buffer is.",
      },
      {
        heading: "Power-of-two capacity turns modulo into a mask",
        body: "When capacity is a power of two, `(i + 1) % capacity` becomes `(i + 1) & (capacity - 1)` — a single AND rather than a division, and division is one of the slowest integer instructions there is. Every serious implementation does this, which is why ring buffer capacities are always 1024 or 65536 and never 1000.",
      },
      {
        heading: "Full and empty look identical, so break the tie deliberately",
        body: "With `head === tail` meaning empty, a completely full buffer also has `head === tail` and the two states are indistinguishable. Two standard fixes: keep a separate `count`, which is simplest and costs one more variable that both threads would touch; or waste one slot so full means `(tail + 1) % capacity === head`, which keeps each index owned by exactly one thread and is what lock-free implementations use.",
      },
      {
        heading: "Bounded means you must choose a failure mode",
        body: "The buffer is full and a write arrives. You can overwrite the oldest entry, which is right for a history buffer or a metrics window where recent data matters most. You can reject the write and let the caller retry, which is right for a work queue where losing a job is unacceptable. Or you can block until space appears, which applies backpressure up the chain. There is no default — picking one is a design decision, and a system that has not chosen has chosen 'silently lose data under load'.",
      },
      {
        heading: "Single producer, single consumer needs no lock — and still needs memory ordering",
        body: "Each index is written by exactly one thread and only read by the other, so there is no write-write race and no lock is required. What is still required is that the consumer never sees an advanced `tail` before it can see the data that was written at that slot. Without the right memory ordering — release on the write, acquire on the read — a compiler or CPU may reorder those two stores and the consumer reads a slot that has not been filled yet. 'No lock' does not mean 'no synchronisation', and that distinction is the whole of lock-free programming.",
      },
    ],
    complexityDerivation:
      "Every operation is O(1): a bounds check, an array access, and an index increment with a wrap. No allocation, no shifting, no amortised argument needed — this is genuinely constant time rather than constant on average, which distinguishes it from a growable array where an occasional push costs O(n) to reallocate. That difference does not show up in a throughput benchmark and shows up sharply in a latency percentile, which is exactly why the structure is chosen in audio, trading and embedded systems: the p99.9 matters more than the mean, and a reallocation pause lands entirely in the tail. Space is capacity times the element size, fixed at construction. The interesting analysis is not the complexity at all but the cache behaviour. A ring buffer is contiguous memory traversed in order, so the hardware prefetcher predicts it perfectly, whereas a linked-list queue chases a pointer to a fresh cache line on every operation. In practice that gap is larger than most algorithmic improvements. The one cache-related trap is false sharing: if `head` and `tail` sit in the same 64-byte cache line, the producer's write to one invalidates the consumer's cached copy of the other on every single operation, and the two threads spend their time bouncing that line between cores. The fix is to pad them onto separate lines, and it can be worth several times the throughput.",
    variants: [
      {
        name: "Overwriting ring (history buffer)",
        when: "Recent data matters and old data is disposable — logs, metrics windows, audio scopes.",
        delta:
          "A full write advances both indices, dropping the oldest entry. Never blocks, never fails, and silently loses data by design — which is correct here and catastrophic elsewhere.",
      },
      {
        name: "Rejecting ring (bounded queue)",
        when: "Work items that must not be lost.",
        delta:
          "A full write returns failure and the caller decides — retry, shed, or apply backpressure. This is the shape behind every bounded thread-pool queue.",
      },
      {
        name: "SPSC lock-free ring",
        when: "Exactly one producer thread and one consumer thread.",
        delta:
          "No lock, using atomic indices with release/acquire ordering. The simplest genuinely useful lock-free structure, and the one worth understanding before any other.",
      },
      {
        name: "Multi-producer ring (LMAX Disruptor style)",
        when: "Several producers, very high throughput.",
        delta:
          "Producers claim slots with an atomic fetch-and-add, then publish with a per-slot sequence number so the consumer knows a slot is genuinely ready. Considerably harder, and where most hand-rolled attempts go wrong.",
      },
    ],
    tradeoffs: [
      {
        vs: "A growable array or a linked-list queue",
        pick: "The ring buffer when latency consistency matters more than flexibility",
        because:
          "A growable queue never rejects a write, which is convenient right up until memory pressure turns a slow consumer into an out-of-memory crash. The ring buffer forces you to decide what happens when it fills, which feels like a cost and is actually the feature — the bound is what stops a slow consumer taking down the process. It also allocates once, so nothing in the hot path can pause.",
      },
      {
        vs: "A lock-protected queue",
        pick: "The lock until profiling says otherwise",
        because:
          "An uncontended mutex is tens of nanoseconds and correct by construction. Lock-free code is hard to write, hard to test — races reproduce once a week, in production, at load — and easy to get subtly wrong in ways that no test suite catches. The genuine wins are the specific well-understood cases: a single producer and single consumer, or a battle-tested library. Writing your own multi-producer lock-free queue is one of the highest-risk things in this entire curriculum.",
      },
      {
        vs: "An unbounded queue with backpressure at a higher layer",
        pick: "Bound it here, where the memory actually lives",
        because:
          "Backpressure applied three layers up cannot see how full this buffer is, and by the time it reacts the memory is already committed. A bounded buffer converts an invisible memory leak into an immediate, observable signal — a rejected write or a blocked producer — at the exact point where the resource is being consumed. That signal is what makes the system diagnosable under load.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — bounded bar and tick history",
      kind: "yours",
      problem:
        "Indicators need the last N bars, and only the last N. Appending to a growing list for a full session and slicing the tail allocates continuously and leaves the garbage collector work to do on a latency-sensitive path.",
      applied:
        "A fixed-capacity overwriting ring per instrument, sized to the longest lookback any indicator needs. Memory is allocated once at startup, the oldest bar falls out automatically as new ones arrive, and there is no per-tick allocation at all. The overwrite policy is right here precisely because a bar older than the longest lookback is genuinely worthless.",
      evidence: "strategy-engine/scripts/pre_warm_market_data.py",
      impact: "Per-tick allocation and slicing → one allocation at startup, O(1) per tick",
    },
    {
      system: "Audio processing callbacks",
      kind: "industry",
      problem:
        "The audio driver calls your callback every few milliseconds and it must return before the deadline. Miss it and the user hears a click. Allocating, locking or waiting on anything inside that callback risks missing it.",
      applied:
        "An SPSC ring buffer between the audio thread and everything else. The audio thread only ever reads from one and writes to another, never allocates, and never takes a lock. This is the canonical justification for lock-free programming — not throughput, but a hard deadline that a lock's worst case cannot guarantee.",
      impact: "A hard real-time deadline met without allocation or locking on the audio path",
    },
    {
      system: "The LMAX Disruptor",
      kind: "industry",
      problem:
        "An exchange needing millions of messages per second between threads, where a conventional lock-protected queue's contention and cache-line bouncing became the bottleneck.",
      applied:
        "A pre-allocated power-of-two ring with sequence numbers, careful padding to prevent false sharing, and batched consumption. The published results made the padding point widely known: two counters sharing a cache line can cost more than the algorithm, because every write by one thread invalidates the other's copy.",
      evidence: "LMAX Disruptor technical paper (2011)",
      impact: "Contended queue → millions of messages per second, largely by respecting cache lines",
    },
    {
      system: "Kernel and network device rings",
      kind: "industry",
      problem:
        "A network card and the operating system must exchange packet buffers without a lock, and without the card ever waiting on software.",
      applied:
        "Descriptor rings in shared memory: the driver advances a producer index as it posts empty buffers, the card advances a consumer index as it fills them. It is the SPSC pattern with hardware on one side, which is also why a slow consumer shows up as a visible drop counter rather than as unbounded memory growth.",
      impact:
        "Lock-free hardware-software handoff, with overflow surfaced as a counter rather than a leak",
    },
  ],
  lab: {
    prompt:
      "Implement a fixed-capacity ring buffer that OVERWRITES the oldest entry when full — a history buffer. `ops` is a list: `[0, v]` pushes `v`, and `[1]` pops and returns the oldest value, or −1 when empty. Return an array with one result per pop, in order. Budget: O(1) per operation — a solution using `shift()` on a plain array is O(n) per pop and will fail the gate.",
    fnName: "ringBuffer",
    signature: "ringBuffer(capacity: number, ops: number[][]): number[]",
    starter: `function ringBuffer(capacity, ops) {
// Your budget: O(1) per operation.
// Allocate once. Keep a read index and a write index, and wrap each
// with % capacity. When the buffer is full, a push must drop the
// OLDEST entry — which means advancing the read index too.
// Remember that head === tail is ambiguous: it means both empty and
// full unless you track the count.

return [];
}`,
    tests: [
      {
        // Straight FIFO, then one pop too many.
        name: "first in, first out",
        input: [3, [[0, 1], [0, 2], [0, 3], [1], [1], [1], [1]]],
        expected: [1, 2, 3, -1],
      },
      {
        // Capacity 2, three pushes: the 1 is overwritten and lost.
        name: "overwriting drops the oldest",
        input: [2, [[0, 1], [0, 2], [0, 3], [1], [1], [1]]],
        expected: [2, 3, -1],
      },
      {
        // Push, pop, push past the end of the array — the indices must
        // wrap and keep working.
        name: "indices wrap around",
        input: [3, [[0, 1], [0, 2], [1], [0, 3], [0, 4], [1], [1], [1]]],
        expected: [1, 2, 3, 4],
      },
      {
        name: "pop from empty",
        input: [2, [[1]]],
        expected: [-1],
      },
      {
        // Capacity 1: every push replaces the previous value.
        name: "capacity of one",
        input: [1, [[0, 7], [0, 8], [1], [1]]],
        expected: [8, -1],
      },
      { name: "no operations", input: [3, []], expected: [], hidden: true },
      {
        // A stored 0 is a real value and must not read as empty. A
        // solution testing truthiness returns -1 here.
        name: "a stored value of 0 is not emptiness",
        input: [2, [[0, 0], [1], [1]]],
        expected: [0, -1],
        hidden: true,
      },
      {
        // Five pushes into capacity 3: only 3, 4 and 5 survive.
        name: "several overwrites",
        input: [3, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1], [1], [1], [1]]],
        expected: [3, 4, 5, -1],
        hidden: true,
      },
    ],
    hints: [
      "Allocate one array of `capacity` entries up front and never resize it. Keep `head` (where the next pop reads), `tail` (where the next push writes), and a `count` of how many entries are live.",
      "Push writes at `tail`, then advances `tail` with `(tail + 1) % capacity`. If the buffer was already full, the oldest entry has just been overwritten — so advance `head` as well, and leave `count` unchanged.",
      "Pop returns −1 when `count` is 0. Otherwise read at `head`, advance `head` the same way, and decrement `count`. Track emptiness with `count`, not by comparing values — a stored 0 is a real value.",
    ],
    solution: `function ringBuffer(capacity, ops) {
const out = [];
if (capacity <= 0) {
  for (const op of ops) if (op[0] === 1) out.push(-1);
  return out;
}

// Allocated once and never resized. That is the point of the structure:
// nothing in the hot path can allocate or pause.
const buf = new Array(capacity);
let head = 0;    // next slot to read
let tail = 0;    // next slot to write
let count = 0;   // live entries — head === tail alone is ambiguous,
                 // since it means BOTH empty and full.

for (const op of ops) {
  if (op[0] === 0) {
    buf[tail] = op[1];
    tail = (tail + 1) % capacity;
    if (count === capacity) {
      // Full: we just overwrote the oldest entry, so the read index
      // has to move with us. count stays at capacity.
      head = (head + 1) % capacity;
    } else {
      count++;
    }
  } else {
    // count, not a value test: a stored 0 is a real value.
    if (count === 0) { out.push(-1); continue; }
    out.push(buf[head]);
    head = (head + 1) % capacity;
    count--;
  }
}

return out;
}`,
    complexityGate: {
      target: "O(n)",
      // Capacity is a quarter of the operation count, so the buffer fills
      // and the overwrite path is genuinely exercised. Two pushes per pop
      // keeps it full rather than oscillating around empty.
      //
      // This is what catches the plain-array solution: Array.shift() is
      // O(n) per pop, so the whole thing goes quadratic even though every
      // correctness test passes.
      gen: "(n) => [n >> 2, Array.from({ length: n }, (_, i) => (i % 3 === 2 ? [1] : [0, i]))]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Power-of-two capacity turns modulo into a mask",
      d: "`(i + 1) & (capacity − 1)` replaces a division, which is among the slowest integer instructions. It is why real ring buffers are sized 1024 or 65536 and never 1000.",
    },
    {
      t: "SPSC needs no locks",
      d: "Each index is written by exactly one thread and only read by the other, so there is no write-write race. It is the simplest genuinely useful lock-free structure.",
    },
    {
      t: "Bounded means you must choose a failure mode",
      d: "Overwrite the oldest, reject the write, or block the producer. There is no sensible default, and a system that has not chosen has chosen 'silently lose data under load'.",
    },
    {
      t: "'No lock' does not mean 'no synchronisation'",
      d: "The consumer must not see an advanced write index before the data written at that slot. Without release/acquire ordering, the CPU or compiler may reorder the two stores and hand over a slot that was never filled.",
    },
    {
      t: "False sharing can cost more than the algorithm",
      d: "If `head` and `tail` share a 64-byte cache line, every producer write invalidates the consumer's copy and the line ping-pongs between cores. Padding them apart is sometimes worth several times the throughput.",
    },
  ],
  pitfalls: [
    "Treating `head === tail` as empty without a count or a wasted slot, so a completely full buffer reads as empty and every entry is silently dropped.",
    "Using `shift()` on a plain array to model the queue. Correct, O(n) per pop, and quadratic overall — which no correctness test will reveal.",
    "Detecting emptiness by testing the stored value rather than the count, so a legitimately stored 0 reads as empty.",
    "Writing a multi-producer lock-free ring by hand. This is where hand-rolled concurrency almost always goes wrong, and the failures reproduce weekly in production rather than in tests.",
  ],
  quiz: [
    {
      q: "Why do ring buffers almost always use a power-of-two capacity?",
      options: [
        "It aligns with page sizes",
        "`% capacity` becomes `& (capacity − 1)`, replacing a division with a single AND",
        "It makes the buffer larger",
        "Powers of two are easier to allocate",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Integer division is one of the slowest arithmetic instructions, and this appears on every single push and pop. The mask is exact and free.",
      distractors: [
        "Page alignment is a separate concern that matters for very large buffers, and it does not explain why a 1024-entry buffer is chosen over a 1000-entry one.",
        "",
        "Rounding up to a power of two does waste a little capacity — a cost accepted for the masking, not a benefit.",
        "Allocators handle any size perfectly well. The gain is in the index arithmetic, not in the allocation.",
      ],
    },
    {
      q: "A single-producer, single-consumer ring buffer needs no lock because:",
      options: [
        "Reads are always safe",
        "Each index is written by exactly one thread and only read by the other, so there is no write-write race",
        "The buffer is small",
        "The operations are atomic by default",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The producer owns `tail` and the consumer owns `head`. Nothing is written by both, so there is no contention to protect against — though memory ordering is still required.",
      distractors: [
        "Reads are safe only when nothing is concurrently writing the same location in a conflicting way. That is a consequence of the ownership split, not an independent fact.",
        "",
        "Size has no bearing on whether two threads race.",
        "Nothing is atomic by default. The indices must be atomic with the right ordering — which is exactly the distinction between 'no lock' and 'no synchronisation'.",
      ],
    },
    {
      q: "`head === tail` means the buffer is empty. What is the problem?",
      options: [
        "Nothing — that is the standard test",
        "A completely full buffer also satisfies it, so empty and full are indistinguishable",
        "It fails when the capacity is odd",
        "It only works for power-of-two capacities",
      ],
      answer: 1,
      difficulty: "apply",
      why: "After exactly `capacity` pushes, `tail` has wrapped all the way back to `head`. The standard fixes are a separate count, or wasting one slot so that full is `(tail + 1) % capacity === head`.",
      distractors: [
        "It is the standard test only when paired with one of those fixes. On its own it is ambiguous, and the failure is silent data loss.",
        "",
        "Parity of the capacity is irrelevant — the wrap-around collision happens at any size.",
        "The ambiguity is independent of capacity. Masking versus modulo changes the arithmetic, not the collision.",
      ],
    },
    {
      q: "A metrics buffer holding the last 60 seconds of samples fills up. The right policy is:",
      options: [
        "Reject new samples",
        "Overwrite the oldest — a sample older than the window is worthless by definition",
        "Block the producer",
        "Grow the buffer",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The policy has to follow the data's meaning. A 60-second window explicitly does not want anything older, so dropping the oldest loses nothing that was wanted, and it never blocks or fails.",
      distractors: [
        "Rejecting means throwing away the NEWEST sample — the one you actually want — and leaving the window stale.",
        "",
        "Blocking a metrics producer means instrumentation can stall the thing it is measuring, which is the worst possible failure for observability.",
        "Growing removes the bound, so a stuck consumer becomes an out-of-memory crash. The bound is the feature.",
      ],
    },
    {
      q: "A task queue for jobs that must not be lost fills up. The right policy is:",
      options: [
        "Overwrite the oldest",
        "Reject the write or block the producer, so the caller learns the system is saturated",
        "Grow without limit",
        "Drop every other job",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The same structure, the opposite policy, because the data means something different. Rejecting or blocking turns saturation into a signal the caller can act on — retry, shed load, or page someone — instead of silent loss.",
      distractors: [
        "Overwriting silently destroys accepted work, which is the exact failure the requirement rules out.",
        "",
        "Unbounded growth converts a slow consumer into an out-of-memory crash, with no warning until it happens.",
        "Sampling is a legitimate load-shedding strategy for telemetry and unacceptable for jobs that must not be lost.",
      ],
    },
    {
      q: "Your SPSC ring is lock-free, and the consumer occasionally reads a slot that was never written. What is missing?",
      options: [
        "A mutex",
        "Memory ordering — a release store on the index and an acquire load on the read, so the data write cannot be reordered after the index update",
        "A larger capacity",
        "A second consumer",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Without ordering constraints, the compiler or CPU may make the index update visible before the data write. The consumer then sees a slot marked ready and reads whatever was there before. 'No lock' does not mean 'no synchronisation'.",
      distractors: [
        "A mutex would fix it by providing the ordering as a side effect, and it discards the property you were building the structure for. The ordering is what you actually need.",
        "",
        "Capacity does not affect visibility. A bigger buffer makes the race rarer and no less real, which is worse.",
        "Adding a consumer introduces a genuine race on `head` that did not previously exist.",
      ],
    },
    {
      q: "The LMAX Disruptor pads its indices onto separate cache lines. Why does that matter so much?",
      options: [
        "It reduces memory usage",
        "False sharing — two counters in one 64-byte line means every producer write invalidates the consumer's cached copy, bouncing the line between cores",
        "It improves alignment for atomics",
        "It prevents integer overflow",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Cache coherence works at cache-line granularity, not per variable. Two independent counters sharing a line behave as though they were contended even though the threads never touch the same value — and the cost can exceed the algorithm's.",
      distractors: [
        "Padding deliberately uses MORE memory, spending it to buy throughput.",
        "",
        "Atomics need their natural alignment, which they already have. Padding is about keeping unrelated variables apart, not about aligning one.",
        "Overflow is handled by using wide counters and masking. It is unrelated to placement.",
      ],
    },
    {
      q: "Someone proposes a hand-written multi-producer lock-free queue. What is the responsible response?",
      options: [
        "Approve it — lock-free is faster",
        "Push back: use a proven library or a lock until profiling justifies it, because these races reproduce weekly in production rather than in tests",
        "Ask for more comments",
        "Suggest making it single-producer",
      ],
      answer: 1,
      difficulty: "judge",
      why: "An uncontended mutex costs tens of nanoseconds and is correct by construction. Multi-producer lock-free code is genuinely hard, its bugs are timing-dependent and effectively untestable, and the correct move is a proven implementation or a measurement showing the lock is actually the bottleneck.",
      distractors: [
        "Faster under contention, if it is correct — and correctness is exactly what is in doubt and cannot be established by review alone.",
        "",
        "Comments do not make a memory-ordering bug less likely, and they can make wrong reasoning look authoritative.",
        "A reasonable question to ask, and often the right redesign — but it changes the requirement rather than answering it, so it needs to be raised as a design alternative rather than as the review verdict.",
      ],
    },
  ],
};

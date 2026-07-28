import type { Topic } from "../types.ts";

export const concurrency: Topic = {
  id: "concurrency",
  title: "Concurrent access patterns",
  tier: 5,
  week: 24,
  depth: "deep",
  summary:
    "Immutability as a structure choice; contention as a design constraint.",
  why: "A structure that is optimal single-threaded can be pathological under contention.",
  learn: {
    intuition:
      "Complexity notation counts the work one thread does. It has nothing at all to say about what happens when thirty-two threads want the same structure at once, and that omission is where a great many production surprises live. Put a single lock around an O(1) hash map and every operation is still O(1) — and throughput is now capped at what one core can do, because only one thread is ever inside. Adding cores makes it worse, not better, since they queue and burn cycles waiting. So the useful mental shift is that under concurrency the scarce resource is not operations but *exclusivity*: how much of the work must happen while nobody else can proceed. That reframing suggests all three of the standard fixes at once. Shorten the exclusive section, so less of the work is serialised. Split the structure so that threads contend on different locks rather than one — sharding. Or remove exclusivity entirely by never mutating shared state, which is what immutability buys and why it keeps appearing as a performance technique rather than a purity argument.",
    mechanics: [
      {
        heading: "Contention is the hidden complexity term",
        body: "A global lock makes an O(1) operation serialise across every core, so throughput is bounded by one thread regardless of the per-operation cost. Amdahl's law puts a number on it: if 5% of the work is serialised, the maximum speed-up is 20× no matter how many cores you add. The notation does not model your lock, and the lock is frequently what decides the system's ceiling.",
      },
      {
        heading: "Shard before you optimise the lock",
        body: "Splitting a structure into N independently-locked partitions turns one contended lock into N mostly-uncontended ones, and it usually beats any amount of lock tuning. It works when the keys distribute — which is the same precondition as a hash table's, and it fails the same way, with one hot key serialising its shard while the rest idle.",
      },
      {
        heading: "Immutable structures need no locks at all",
        body: "If nothing mutates, readers can share freely with no coordination whatsoever. Writes build a new version and publish it with a single atomic store, so readers either see the old value or the new one and never a half-written state. The cost is allocation per write, which makes this an excellent trade for read-heavy workloads and a poor one for write-heavy — and persistent structures reduce that cost by sharing the unchanged parts.",
      },
      {
        heading: "False sharing is contention you did not write",
        body: "Cache coherence works on 64-byte lines, not on variables. Two counters that share a line behave as though contended even though no thread touches the same value, because each write invalidates the other core's copy and the line bounces between them. It can cost more than the algorithm, it is invisible in the source, and the fix is padding the variables apart.",
      },
      {
        heading: "'Lock-free' does not mean 'no synchronisation'",
        body: "Removing the lock does not remove the need for ordering. A consumer must not observe an advanced index before the data written at that slot, so you still need release and acquire semantics — and getting them wrong produces bugs that appear once a week in production and never in a test. Lock-free code is a specialist tool; the honest default is a lock, or a proven library, until measurement shows the lock is the bottleneck.",
      },
    ],
    complexityDerivation:
      "The bound that matters here is not per-operation but system-wide, and Amdahl's law is the right frame. If a fraction s of the work must happen serially and the rest parallelises perfectly, the speed-up on p cores is 1 / (s + (1−s)/p), which tends to 1/s as p grows. So a 5% serial section caps you at 20× however many cores you buy, and a 1% section caps you at 100×. Now notice what a global lock does to s: it makes the entire critical section serial, and if that is most of the operation then s approaches 1 and the speed-up approaches 1 — a multi-core machine performing like a single core. Sharding attacks this directly. With N shards and evenly distributed keys, the probability that two threads collide on the same shard falls roughly as 1/N, so the effective serial fraction falls with it. That analysis also shows the limit: if 30% of traffic hits one key, no number of shards helps, because that key's shard is serialised regardless — the same skew failure as a hot partition or a colliding hash table. The immutable approach removes s from the read path entirely rather than shrinking it, which is why it scales linearly with cores on read-heavy workloads. What it does not remove is allocation, and allocation has its own shared resource underneath it, so a write-heavy immutable design simply relocates the contention into the allocator and the garbage collector.",
    variants: [
      {
        name: "One global lock",
        when: "Low concurrency, or a genuinely brief critical section.",
        delta:
          "Simplest and correct by construction. Perfectly adequate until contention shows up in a profile — and the right starting point.",
      },
      {
        name: "Sharded locks",
        when: "A large structure with well-distributed keys.",
        delta:
          "N locks over N partitions. Usually a larger win than any lock optimisation, and it fails on skew exactly as a hash table does.",
      },
      {
        name: "Immutable snapshot with atomic publication",
        when: "Read-heavy state that changes occasionally.",
        delta:
          "Readers take no lock at all; a write builds a new version and swaps a pointer. Scales linearly with readers, and costs an allocation per write.",
      },
      {
        name: "Lock-free structures",
        when: "A well-understood shape — single-producer/single-consumer — or a proven library.",
        delta:
          "Atomic compare-and-swap with explicit memory ordering. The highest-risk option to write yourself, and the failures are timing-dependent and effectively untestable.",
      },
    ],
    tradeoffs: [
      {
        vs: "A lock-free structure",
        pick: "The lock until profiling proves it is the bottleneck",
        because:
          "An uncontended mutex costs tens of nanoseconds and is correct by construction. Lock-free code is hard to write, hard to review, and its bugs reproduce weekly in production and never in a test suite. The defensible cases are narrow — a single-producer/single-consumer ring, or a library that has been battle-tested — and writing your own multi-producer queue is among the riskiest things in this entire curriculum.",
      },
      {
        vs: "Sharding",
        pick: "Shard first; it usually beats optimising the lock",
        because:
          "Halving the time spent holding a lock halves contention at best. Splitting into sixteen shards cuts collision probability by roughly sixteen, for a much simpler change. The precondition is that keys distribute — and when they do not, sharding buys nothing and you are back to the hot-key problem, which needs a key change rather than more shards.",
      },
      {
        vs: "Immutability",
        pick: "Immutable for read-heavy, mutable for write-heavy",
        because:
          "Immutability removes coordination from the read path completely, which is why it scales so well when reads dominate. It costs an allocation per write, so a write-heavy workload trades lock contention for allocator and collector pressure — the same contention relocated somewhere less visible. Persistent structures with structural sharing narrow that gap without closing it.",
      },
    ],
  },
  realWorld: [
    {
      system: "learn-duo1c — monotone sync merge instead of coordination",
      kind: "yours",
      problem:
        "Progress is written from several devices and merged server-side. A last-write-wins design would need ordering or locking to decide which update prevails, and would silently lose progress when two devices sync close together.",
      applied:
        "Every field merges with an operation that is commutative and idempotent — maximum for scores, OR for boolean gates, union for sets. Because the merge does not depend on order, concurrent writers need no coordination at all and a retried request cannot double-count. The concurrency problem is removed by the choice of data type rather than solved with a lock.",
      evidence: "src/lib/sync.ts",
      impact: "Ordering and locking requirements eliminated by making the merge order-independent",
    },
    {
      system: "Java's ConcurrentHashMap",
      kind: "industry",
      problem:
        "A single synchronised map serialises every operation, so a multi-core server performs like a single-core one under load.",
      applied:
        "Locking at the bucket level rather than the map level, so threads touching different keys never interact. It is sharding applied at the finest reasonable granularity, and it degrades in exactly the predicted way when many threads hit the same key — the fix for which is a better key distribution rather than more locks.",
      impact: "Throughput bounded by one core → scaling with cores, given distributed keys",
    },
    {
      system: "The LMAX Disruptor's cache-line padding",
      kind: "industry",
      problem:
        "An exchange found that even with a lock-free ring buffer, throughput was far below expectation — the producer and consumer counters shared a cache line, so every producer write invalidated the consumer's cached copy.",
      applied:
        "Padding the counters onto separate 64-byte cache lines. No algorithmic change whatsoever, and a large throughput gain. It is the clearest demonstration that contention can exist where the source code shows none, and that the hardware's unit of sharing is the cache line rather than the variable.",
      evidence: "LMAX Disruptor technical paper (2011)",
      impact: "Contention invisible in the source removed by memory layout alone",
    },
    {
      system: "Copy-on-write configuration in servers",
      kind: "industry",
      problem:
        "Route tables, feature flags and configuration are read on essentially every request by every thread and updated rarely. Any lock on that path is taken millions of times per second for state that almost never changes.",
      applied:
        "Hold the configuration as an immutable object behind an atomic reference. Readers take a plain load; an update builds a fresh object and publishes it with one store. Nginx, Envoy and most feature-flag clients work this way, and it is why a configuration reload does not stall request handling.",
      impact: "A lock on every request → an uncontended atomic load, with the cost moved to a rare write",
    },
  ],
  cases: [
    {
      id: "co-global-lock",
      scenario:
        "A shared in-memory cache sits behind one mutex. On a 32-core machine, throughput plateaus at roughly what four cores achieved, and CPU time is dominated by lock waiting. Keys are numerous and access is reasonably spread. What is the first change?",
      options: [
        {
          label: "Shard the cache across 16 independently-locked partitions",
          appeal:
            "Threads touching different keys stop interacting, and collision probability falls roughly with the shard count.",
        },
        {
          label: "Replace the mutex with a lock-free hash map",
          appeal:
            "Removes blocking entirely, so no thread ever waits on another.",
        },
        {
          label: "Shorten the critical section by moving work outside the lock",
          appeal:
            "Less time holding the lock means less contention, with no structural change.",
        },
        {
          label: "Replace the mutex with a reader-writer lock",
          appeal:
            "Caches are read-heavy, and many readers can hold a read lock simultaneously.",
        },
      ],
      best: 0,
      verdict:
        "Keys are numerous and spread, which is exactly the precondition sharding needs, and it attacks the serial fraction directly — sixteen shards cut collision probability by roughly sixteen. Shortening the critical section is worth doing and can only halve or quarter contention at best. A reader-writer lock still writes shared state on every read to track readers, which bounces a cache line across all 32 cores and often underperforms a plain mutex at this core count. A hand-written lock-free map is the highest-risk option for a problem with a simple structural fix.",
      claims: [
        {
          text: "You are accepting that operations spanning multiple keys can no longer be atomic without taking several locks.",
          axis: "trade",
          correct: true,
          note: "The real cost of sharding, and the one that bites later: cross-shard atomicity needs ordered multi-lock acquisition, which reintroduces deadlock risk.",
        },
        {
          text: "You are accepting more memory overhead, since each shard carries its own lock and bookkeeping.",
          axis: "trade",
          correct: true,
          note: "Small but real, and it multiplies if somebody later raises the shard count without measuring.",
        },
        {
          text: "You are accepting weaker consistency for individual key operations.",
          axis: "trade",
          correct: false,
          note: "Each key still lives in exactly one shard under one lock, so single-key operations are as consistent as before. Only multi-key atomicity changes.",
        },
        {
          text: "If access turns out to be skewed toward a few hot keys, those shards serialise and the plateau returns.",
          axis: "failure",
          correct: true,
          note: "The precondition failing. Sharding inherits the hash table's weakness exactly, and more shards do not help a single hot key.",
        },
        {
          text: "Sharding will cause cache entries to be lost when the shard count changes.",
          axis: "failure",
          correct: false,
          note: "Resharding does require rehashing or a migration path, and it is a planned operation rather than a failure mode of the design.",
        },
        {
          text: "Throughput as core count rises, to confirm it now scales rather than plateauing.",
          axis: "measure",
          correct: true,
          note: "Directly tests the objective. A plateau at a higher level means the serial fraction shrank but did not disappear.",
        },
        {
          text: "Per-shard request distribution, to catch skew before it recreates the problem.",
          axis: "measure",
          correct: true,
          note: "The leading indicator for the failure mode above, and cheap to collect.",
        },
        {
          text: "Average lock hold time.",
          axis: "measure",
          correct: false,
          note: "Useful for the option you did not choose. After sharding the question is whether threads collide at all, not how long each holds a lock.",
        },
      ],
    },
    {
      id: "co-immutable-config",
      scenario:
        "A routing table is consulted on every request by all worker threads and rebuilt roughly every 30 seconds from a control plane. Under load, profiling shows meaningful time in lock acquisition on the read path. How should it be held?",
      options: [
        {
          label: "A reader-writer lock, since reads vastly outnumber writes",
          appeal:
            "Purpose-built for this ratio, and many readers can proceed together.",
        },
        {
          label: "An immutable table behind an atomic reference, replaced wholesale on rebuild",
          appeal:
            "Readers do a plain atomic load with no coordination at all, and a rebuild is one store.",
        },
        {
          label: "Shard the routing table by route prefix",
          appeal:
            "Spreads contention across several locks instead of one.",
        },
        {
          label: "Give each worker thread its own copy, refreshed on a timer",
          appeal:
            "No sharing means no synchronisation of any kind on the read path.",
        },
      ],
      best: 1,
      verdict:
        "With reads on every request and writes every 30 seconds, the goal is to remove coordination from the read path rather than make it cheaper. An immutable table behind an atomic reference achieves that completely: readers never block and never write shared state. A reader-writer lock still mutates a reader count on every read, which bounces a cache line between cores and is frequently slower than a plain mutex at high core counts. Sharding reduces contention without eliminating it. Per-thread copies also work and introduce per-thread staleness that varies between workers, which is harder to reason about than one swap everybody observes at once.",
      claims: [
        {
          text: "You are accepting a full rebuild and allocation every 30 seconds in exchange for a completely coordination-free read path.",
          axis: "trade",
          correct: true,
          note: "The trade with both sides, and it is overwhelmingly favourable at this read-to-write ratio.",
        },
        {
          text: "You are accepting that requests in flight during a swap finish against the previous table.",
          axis: "trade",
          correct: true,
          note: "Must be stated. It is fine for routing and would not be fine for something requiring a strict cutover, such as revoking access.",
        },
        {
          text: "You are accepting that readers may see a partially built table during the rebuild.",
          axis: "trade",
          correct: false,
          note: "The new table is built off to the side and published with a single atomic store, so readers see either the whole old one or the whole new one.",
        },
        {
          text: "If any code path mutates the published table in place, readers observe torn state with no error raised.",
          axis: "failure",
          correct: true,
          note: "The design's safety rests entirely on the object being treated as immutable, and most languages do not enforce that — so it needs a convention and ideally a type.",
        },
        {
          text: "The atomic reference will become a contention point since every reader touches it.",
          axis: "failure",
          correct: false,
          note: "Readers only load it. Shared reads of an unmodified line are cached on every core and cost nothing — contention needs a writer.",
        },
        {
          text: "Read-path latency and throughput as core count rises, under real concurrency.",
          axis: "measure",
          correct: true,
          note: "The objective, measured where the effect exists. A single-threaded benchmark would show almost no difference between any of these options.",
        },
        {
          text: "Allocation rate and collector pressure from the periodic rebuild.",
          axis: "measure",
          correct: true,
          note: "The cost side. At one rebuild per 30 seconds it should be negligible, and confirming that is what makes the decision defensible.",
        },
        {
          text: "Reader-lock acquisition time.",
          axis: "measure",
          correct: false,
          note: "There is no lock on the read path in the chosen design — this measures the option that was rejected.",
        },
      ],
    },
    {
      id: "co-lock-free-proposal",
      scenario:
        "An engineer proposes replacing a bounded work queue, currently a mutex-protected deque, with a hand-written multi-producer multi-consumer lock-free queue. Several producer threads and several consumer threads use it. The current queue has not appeared in any profile. What is your review position?",
      options: [
        {
          label: "Approve — lock-free scales better under contention",
          appeal:
            "Removing blocking is the standard answer for a queue shared by many threads.",
        },
        {
          label: "Decline the hand-written version: use a proven library, or keep the mutex until a profile shows it is the bottleneck",
          appeal:
            "An uncontended mutex costs tens of nanoseconds, and multi-producer lock-free bugs reproduce in production and never in tests.",
        },
        {
          label: "Approve if it comes with thorough unit tests",
          appeal:
            "Tests are how correctness is normally established, and a well-tested implementation should be trustworthy.",
        },
        {
          label: "Suggest restricting it to single-producer/single-consumer instead",
          appeal:
            "SPSC is genuinely simple to make lock-free and needs no compare-and-swap at all.",
        },
      ],
      best: 1,
      verdict:
        "There is no evidence of a problem — the queue has never appeared in a profile — so this is an optimisation without a measurement, and it trades a correct-by-construction structure for one whose failure modes are timing-dependent memory-ordering bugs. Unit tests do not establish correctness here: a memory-ordering error can pass a million runs and fail once under a different scheduler or on different hardware. Restricting to SPSC is a genuinely good instinct and changes the requirement, since the scenario states several producers and consumers.",
      claims: [
        {
          text: "You are accepting whatever contention the mutex causes, in exchange for a structure whose correctness does not depend on memory-ordering reasoning.",
          axis: "trade",
          correct: true,
          note: "The trade stated fairly, including that the mutex does have a cost. Declining is a judgement about which risk is larger, not a claim that locks are free.",
        },
        {
          text: "You are accepting that if contention does become real, this decision has to be revisited with a profile in hand.",
          axis: "trade",
          correct: true,
          note: "What keeps 'not now' from becoming 'never'. The decision is conditional on evidence that does not yet exist.",
        },
        {
          text: "You are accepting worse correctness in exchange for simplicity.",
          axis: "trade",
          correct: false,
          note: "Backwards — the mutex is the more clearly correct option. Simplicity and correctness point the same way here, which is what makes the call easy.",
        },
        {
          text: "A memory-ordering bug can pass every test and fail in production under a different scheduler or on different hardware.",
          axis: "failure",
          correct: true,
          note: "The core reason tests do not settle this, and why 'add tests' is not a sufficient mitigation for hand-written lock-free code.",
        },
        {
          text: "A lock-free queue can deadlock if a producer is descheduled while holding the queue.",
          axis: "failure",
          correct: false,
          note: "Lock-free structures cannot deadlock — nothing is held. Their failure modes are lost updates, torn reads and livelock, which is a different and subtler list.",
        },
        {
          text: "Whether the mutex actually appears in a CPU profile under production-like load.",
          axis: "measure",
          correct: true,
          note: "The evidence that is missing, and the thing that would legitimately reopen the proposal.",
        },
        {
          text: "Queue throughput and consumer latency against the current implementation, under realistic producer and consumer counts.",
          axis: "measure",
          correct: true,
          note: "Establishes whether there is a gap worth any risk at all, before deciding how to close it.",
        },
        {
          text: "The number of lines of code saved.",
          axis: "measure",
          correct: false,
          note: "The lock-free version is substantially more code, and code size is not what is being traded here.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "Contention is the hidden complexity term",
      d: "A global lock makes an O(1) operation serialise across every core. Amdahl's law puts a number on it: a 5% serial fraction caps you at 20× however many cores you buy. The notation does not model your lock.",
    },
    {
      t: "Immutable structures need no locks at all",
      d: "Readers can share freely because nothing changes underneath them. The cost is allocation on every write — an excellent trade when reads dominate, and a relocation of the contention into the allocator when writes do.",
    },
    {
      t: "Sharding beats a faster lock",
      d: "Splitting into N independently-locked partitions turns one contended lock into N uncontended ones. Usually a bigger win than any lock optimisation — and it inherits the hash table's weakness, failing the same way on a hot key.",
    },
    {
      t: "False sharing is contention you did not write",
      d: "Cache coherence works on 64-byte lines, not variables. Two counters sharing a line ping-pong between cores even though no thread touches the same value, and the fix is padding rather than code.",
    },
    {
      t: "'Lock-free' does not mean 'no synchronisation'",
      d: "You still need release and acquire ordering so a consumer cannot see an index advance before the data it points at. Getting it wrong produces bugs that appear weekly in production and never in a test.",
    },
  ],
  pitfalls: [
    "Assuming a reader-writer lock is strictly better for read-heavy access. It writes shared state on every read to track readers, and at high core counts often loses to a plain mutex.",
    "Sharding data whose access is skewed. One hot key serialises its shard however many shards there are, and the fix is a different key rather than more of them.",
    "Writing a multi-producer lock-free structure by hand. The bugs are timing-dependent, effectively untestable, and reproduce in production rather than in CI.",
    "Optimising for contention that has never appeared in a profile, trading a correct-by-construction structure for one that is merely believed correct.",
  ],
  quiz: [
    {
      q: "A hash map with a single global lock is O(1) per operation. Under 32 threads it behaves:",
      options: [
        "Still O(1) — locks do not change complexity",
        "As if serialised, because contention makes threads queue for the lock",
        "Faster, due to caching",
        "Non-deterministically",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Throughput collapses toward single-threaded regardless of the per-operation cost. Sharding or a lock-free design is the fix.",
      distractors: [
        "Per-operation complexity is genuinely unchanged, and that is exactly the trap: the notation stays O(1) while the system stops scaling.",
        "",
        "Threads contending on one lock invalidate each other's cache lines, so caching makes it worse rather than better.",
        "The ordering varies and the throughput ceiling does not — it is a predictable consequence of serialisation rather than nondeterminism.",
      ],
    },
    {
      q: "Amdahl's law says a 5% serial fraction caps speed-up at:",
      options: ["5×", "20×", "32×", "Unbounded"],
      answer: 1,
      difficulty: "recall",
      why: "Speed-up tends to 1/s as cores grow, and 1/0.05 is 20. So a 5% serial section makes the 21st core essentially free of benefit, however many you add after it.",
      distractors: [
        "5 is the percentage rather than its reciprocal — the relationship is inverse, which is what makes small serial fractions matter so much.",
        "",
        "32 is a core count, and the whole point is that the cap is independent of how many cores you add.",
        "It is bounded precisely by the serial part, which no amount of parallelism can shrink.",
      ],
    },
    {
      q: "Why can a reader-writer lock underperform a plain mutex at high core counts?",
      options: [
        "It is a more complex algorithm",
        "Acquiring a read lock writes shared state to track the reader count, so every read invalidates that cache line on every other core",
        "It blocks readers during reads",
        "It only allows one reader at a time",
      ],
      answer: 1,
      difficulty: "apply",
      why: "'Read lock' is a misleading name — taking one is a write to shared state. At 32 cores that line ping-pongs continuously, which can cost more than the exclusion the lock was bought for.",
      distractors: [
        "It is more complex, and complexity alone would not slow it down. The cost is a specific and measurable hardware effect.",
        "",
        "Readers proceed together — that is the feature. What they share is the counter, not the exclusion.",
        "Multiple readers are permitted by definition; that is the difference from a mutex.",
      ],
    },
    {
      q: "Sharding a structure across 16 locks stops helping when:",
      options: [
        "There are more than 16 threads",
        "Access is skewed, so one hot key serialises its shard regardless of the shard count",
        "The structure grows too large",
        "The shards have different sizes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Sharding inherits the hash table's precondition exactly. If 30% of traffic hits one key, that key's shard is serialised however many shards exist — and the fix is a different key, not more shards.",
      distractors: [
        "More threads than shards still spreads well when keys distribute; collisions become likelier without collapsing.",
        "",
        "Size is what sharding handles well — each shard simply holds a fraction.",
        "Uneven shard sizes are a mild imbalance. The failure is concentrated ACCESS, which is a different thing from concentrated storage.",
      ],
    },
    {
      q: "Configuration is read on every request and updated every 30 seconds. The best structure is:",
      options: [
        "A reader-writer lock",
        "An immutable object behind an atomic reference, replaced wholesale on update",
        "A concurrent hash map",
        "A thread-local copy per worker",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The goal is removing coordination from the read path, not making it cheaper. Readers do a plain atomic load and never write shared state, and the rebuild cost is irrelevant at one write per 30 seconds.",
      distractors: [
        "Still writes a reader count on every read, which is precisely the shared write the design should eliminate.",
        "",
        "Built for concurrent mutation, which is not the pattern here — it pays for per-bucket locking that a read-mostly workload never uses.",
        "It works, and gives each worker its own staleness window, which is harder to reason about than one swap everybody observes together.",
      ],
    },
    {
      q: "An engineer proposes a hand-written multi-producer lock-free queue. The current mutex version has never appeared in a profile. Your position?",
      options: [
        "Approve — lock-free scales better",
        "Decline: no measurement shows a problem, and multi-producer lock-free bugs reproduce in production rather than in tests",
        "Approve with thorough unit tests",
        "Approve if benchmarks show it is faster",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It is an optimisation without a measurement, trading a correct-by-construction structure for one whose failure modes are timing-dependent. An uncontended mutex costs tens of nanoseconds, and the burden of proof belongs on the riskier option.",
      distractors: [
        "It can, under contention that has not been demonstrated to exist here.",
        "",
        "Tests do not settle this: a memory-ordering bug can pass a million runs and fail once under a different scheduler or on different hardware.",
        "A benchmark showing it is faster still would not establish that it is correct, which is the actual risk.",
      ],
    },
    {
      q: "Two thread-local counters share a 64-byte cache line and throughput is far below expectation. What is happening?",
      options: [
        "Lock contention",
        "False sharing — each write invalidates the other core's copy of the line, even though no thread touches the same variable",
        "Cache thrashing from too much data",
        "Memory ordering violations",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Cache coherence operates on lines, not variables. Two independent counters in one line behave as though contended, and the fix is padding them apart rather than changing any logic.",
      distractors: [
        "There is no lock — that is exactly what makes this puzzling in a profile, and why it gets misdiagnosed.",
        "",
        "Two counters are 16 bytes. The problem is where they sit relative to each other, not how much data there is.",
        "Ordering affects correctness rather than throughput, and nothing here is producing wrong results.",
      ],
    },
    {
      q: "Which change removes a concurrency problem rather than managing it?",
      options: [
        "A finer-grained lock",
        "Making the merge operation commutative and idempotent, so concurrent writers need no coordination at all",
        "A larger thread pool",
        "A faster mutex implementation",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If the result does not depend on order, there is nothing to coordinate and retries cannot double-count. That is how this curriculum's own sync works — the problem is dissolved by the choice of data type rather than solved with a lock.",
      distractors: [
        "Reduces how often threads collide and keeps the need for exclusion.",
        "",
        "More threads contending on the same structure generally makes contention worse.",
        "Shaves the constant on an operation that still has to serialise.",
      ],
    },
  ],
};

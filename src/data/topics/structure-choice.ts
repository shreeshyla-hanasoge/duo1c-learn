import type { Topic } from "../types.ts";

export const structureChoice: Topic = {
  id: "structure-choice",
  title: "Choosing under real constraints",
  tier: 5,
  week: 23,
  depth: "deep",
  summary: "Memory, cache locality, GC pressure, and the constant factor.",
  why: "The asymptotically better structure is regularly the wrong choice. Knowing when is the whole tier.",
  learn: {
    intuition:
      "Big-O describes how a cost grows as the input grows without bound. Almost nothing you ship runs at an unbounded input. It runs at a particular n, on hardware with a particular cache hierarchy, in a language with a particular allocator, and those details routinely swamp the asymptotics by a factor of ten or more. The correction worth making is this: Big-O counts operations and assumes they all cost the same, and on modern hardware they emphatically do not. Reading a value already in L1 cache costs about a nanosecond; reading one from main memory costs closer to a hundred. So an O(n) scan over a contiguous array — where the prefetcher sees the pattern and has the next cache line ready before you ask for it — can comfortably beat an O(log n) descent through a tree whose nodes are scattered across the heap, because the scan does a hundred cheap operations while the descent does ten expensive ones. None of this makes the notation wrong. It makes it incomplete, and the gap is exactly where engineering judgement lives: measure at your actual n, on your actual data, before believing any of it.",
    mechanics: [
      {
        heading: "Ask what n actually is, before anything else",
        body: "Asymptotic advantages are promises about large inputs. If n is 50 and will stay 50, the difference between O(n) and O(log n) is unmeasurable, and every other consideration — allocation, memory per instance, code size, readability — dominates completely. The first question in any structure choice is what n is now and what it will be in a year, and a surprising number of arguments end right there.",
      },
      {
        heading: "Count cache lines, not operations",
        body: "A cache line is 64 bytes, about sixteen 32-bit integers. Scanning a contiguous array of 500 integers touches around 32 lines, and the prefetcher fetches them ahead of you. Walking a 500-node linked list can cost up to 500 cache misses, each worth roughly a hundred arithmetic operations. Both are O(n), and one is far slower. This is why Rust's standard library actively steers people away from `LinkedList`, and why a growable array is the default nearly everywhere.",
      },
      {
        heading: "Allocation is often the real cost",
        body: "A per-element allocation in a hot loop can dominate everything the algorithm does, and in a garbage-collected language it also creates collector work that surfaces later and somewhere else — which makes it hard to attribute. Object pooling, ring buffers and arena allocation exist for exactly this. When a profile shows time in the allocator or the collector, the fix is structural rather than algorithmic.",
      },
      {
        heading: "The same algorithm has opposite constraints in different systems",
        body: "A rolling window on a wearable is bounded by 256 KB of RAM and a battery; the same window over years of minute bars in a backtest is bounded by throughput; the same window in a trading hot path is bounded by tail latency. Same recurrence, three different correct implementations. 'What is the best structure for a sliding window' has no answer until somebody says which resource is scarce.",
      },
      {
        heading: "Write the measurement down, then decide",
        body: "The output of a structure choice should be a sentence with numbers in it: 'at n = 500 the array is 3× faster and uses a third of the memory, so we use the array and revisit if n reaches 50,000.' That sentence is reviewable, it records the condition under which the decision expires, and it is the difference between a decision and a preference. A choice defended only by 'it is O(log n)' cannot be checked by anybody.",
      },
    ],
    complexityDerivation:
      "The honest derivation here is of the correction term the notation omits. Big-O counts operations under a uniform-cost model, so real running time is better thought of as the operation count multiplied by an average cost per operation — and that second factor varies by two orders of magnitude depending on where the data is. Concretely: traversing n linked-list nodes is n operations at roughly 100 ns each if every node misses cache, so about 100n nanoseconds. An array scan of the same n is n operations at roughly 1 ns each once prefetching engages, so about n nanoseconds. The array is a hundred times faster while being asymptotically identical. Now compare against a tree: O(log n) with a cache miss per level is about 100·log₂(n) nanoseconds, which beats the array's n nanoseconds only once n exceeds roughly 100·log₂(n) — around a thousand. Below that, a linear scan of contiguous memory genuinely wins, and this is not a marginal effect: it is why standard-library sorts switch to insertion sort below a few dozen elements, and why B-trees exist at all. The number to carry away is that the crossover for pointer-chasing structures sits somewhere in the hundreds to low thousands, and that it must be measured rather than assumed, because it moves with element size, access pattern and hardware.",
    variants: [
      {
        name: "Contiguous by default",
        when: "n is small or medium and access is iteration-heavy.",
        delta:
          "Arrays and vectors. Best locality, fewest allocations, simplest memory accounting. The right first guess, and often the last one.",
      },
      {
        name: "Hybrid — small representation, promoted on growth",
        when: "Most instances are tiny and a few are large.",
        delta:
          "Redis stores small collections as a flat listpack and switches to a hash or skip list past a configured threshold. Two implementations behind one interface, chosen by measured size.",
      },
      {
        name: "Pointer-based",
        when: "n is genuinely large, or you need stable references and cheap splicing.",
        delta:
          "Trees, skip lists, linked structures. The asymptotics finally pay for the cache misses — and they need to, because each access costs about a hundred times more.",
      },
      {
        name: "Persistent / immutable",
        when: "Sharing across threads, or cheap snapshots and undo.",
        delta:
          "Structural sharing makes a 'copy' O(1) and lets readers work without a lock. The cost is allocation on every write, which is a very good trade for read-heavy and a poor one for write-heavy.",
      },
    ],
    tradeoffs: [
      {
        vs: "The asymptotically better structure",
        pick: "The simpler one until measurement says otherwise",
        because:
          "Every structure has a crossover n below which its overhead exceeds its advantage, and that crossover is routinely in the hundreds or thousands — well above where most code actually operates. The burden of proof belongs on the more complex option, and it discharges with a measurement at your real n rather than with a complexity class. This curriculum's own `skip-lists` lab is the worked example: a sorted array with `splice` measures nearly as fast as a skip list up to several thousand elements, because a `memmove` beats a chain of cache misses.",
      },
      {
        vs: "Optimising the algorithm",
        pick: "Fix allocation and layout first",
        because:
          "When a profile shows time in the allocator or the collector, no change of algorithm addresses it — you can turn an O(n log n) sort into O(n) and still be dominated by the objects it allocates. Reducing allocation, reusing buffers and improving layout often yield larger wins than an asymptotic improvement, and they are usually smaller changes. Establish which one you are looking at before choosing what to change.",
      },
      {
        vs: "One structure that handles every case",
        pick: "A hybrid, when the size distribution is bimodal",
        because:
          "If 95% of instances hold under ten items and 5% hold millions, a single structure is wrong for one group or the other. Two representations behind one interface, switched at a measured threshold, is what Redis, most string types and most standard-library maps actually do. The cost is a branch and a second implementation to test; the benefit is being right in both regimes rather than mediocre in both.",
      },
    ],
  },
  realWorld: [
    {
      system: "learn-duo1c — this curriculum's own lab audit",
      kind: "yours",
      problem:
        "Two labs in this repository were written with the asymptotically-correct implementation and measured worse than the naive one — exactly the failure this topic describes, and caught by measurement rather than by review.",
      applied:
        "The `lru` lab's elegant `Map`-based cache measured 3.58× per doubling against a 3.20× limit, because V8 tombstones deleted entries and the eviction scan walks past them; the map-plus-linked-list version measures about 2.5× and is roughly twelve times faster at 32,000 operations. The `skip-lists` lab lost its complexity gate entirely, because a sorted array with `splice` measured 3.12–3.17× against a skip list's 2.63–2.67× — too close for any threshold to separate honestly.",
      evidence: "scripts/labs.mts",
      impact:
        "Two 'obviously better' implementations replaced or reconsidered on measured evidence",
    },
    {
      system: "Redis — listpack promoted to hash or skip list",
      kind: "industry",
      problem:
        "Most Redis collections are tiny — a hash with three fields, a sorted set with a dozen members — and a full hash table plus skip list per instance costs far more in pointers and allocator overhead than the data itself.",
      applied:
        "Below a configured element count and value size, the whole collection is stored as one flat contiguous listpack and operations are a linear scan. Past the threshold it converts to the real structure. The scan is also faster at that size for the locality reason, but the memory saving across millions of small keys is the larger win.",
      evidence: "Redis `hash-max-listpack-entries`, `zset-max-listpack-entries`",
      impact:
        "Large per-key overhead on small collections → a flat scan until size justifies more",
    },
    {
      system: "Standard-library sorts falling back to insertion sort",
      kind: "industry",
      problem:
        "Quicksort and merge sort are O(n log n) and carry real per-call overhead — recursion, pivot selection, merge buffers — that dominates on small inputs.",
      applied:
        "Essentially every production sort switches to insertion sort below a few dozen elements: Java's dual-pivot quicksort at 47, TimSort's minimum run length, most C++ introsort implementations at 16. Insertion sort is O(n²) and wins there because it is branch-predictable, allocation-free and entirely in cache.",
      impact: "The quadratic algorithm chosen deliberately, at the size where it is faster",
    },
    {
      system: "Rust's standard library on LinkedList",
      kind: "industry",
      problem:
        "Linked lists are taught as the natural structure for frequent insertion, which leads people to reach for one in code where a vector would be far faster.",
      applied:
        "The standard library ships `LinkedList` and its own documentation recommends against it, saying a `Vec` or `VecDeque` is almost always faster and that a linked list is justified mainly when you need O(1) splitting and splicing or stable addresses. That is an unusually direct admission that the asymptotics mislead here, and it is worth citing when somebody proposes one.",
      impact: "A standard library actively steering users away from the textbook answer",
    },
  ],
  cases: [
    {
      id: "sc-recent-ids",
      scenario:
        "A service keeps, per user, the identifiers of the last 50 requests it has seen, so it can reject duplicate submissions. There are about 20 million active users and the whole thing lives in memory on the application servers. The check runs on every incoming request. What do you store each user's set in?",
      options: [
        {
          label: "A hash set per user",
          appeal:
            "O(1) membership, and it is the structure the problem statement most obviously describes.",
        },
        {
          label: "A plain array of 50 identifiers, scanned linearly",
          appeal:
            "At 50 elements a scan is a few cache lines, and the array is 50 slots with no per-entry overhead at all.",
        },
        {
          label: "A sorted array with binary search",
          appeal:
            "O(log n) lookup and still contiguous, so it looks like the best of both.",
        },
        {
          label: "A Bloom filter per user",
          appeal:
            "Sub-linear memory, and duplicate detection can tolerate a small error rate.",
        },
      ],
      best: 1,
      verdict:
        "n is fixed at 50 and there are 20 million instances, so per-instance overhead is multiplied 20 million times while lookup cost is not the binding constraint. A hash set carries buckets, load-factor slack and per-entry headers — commonly several times the payload — which at this multiplicity is gigabytes of pure overhead. A 50-element array is contiguous, allocation-light, and a full scan is about four cache lines. Lookup being O(n) is irrelevant when n cannot exceed 50.",
      claims: [
        {
          text: "You are accepting O(n) membership in exchange for a much smaller per-instance memory footprint.",
          axis: "trade",
          correct: true,
          note: "The trade with both sides named. n is capped at 50, so the O(n) costs almost nothing while the memory saving multiplies across 20 million users.",
        },
        {
          text: "You are accepting worse asymptotic behaviour that would matter if the per-user cap grew substantially.",
          axis: "trade",
          correct: true,
          note: "Correct, and it is the condition under which the decision expires. At a cap of 5,000 the scan would need revisiting, and that belongs written down beside the choice.",
        },
        {
          text: "You are giving up correctness, since a linear scan can miss a duplicate.",
          axis: "trade",
          correct: false,
          note: "A linear scan over 50 entries is exactly as correct as a hash lookup. Nothing here is approximate — that would be the Bloom filter option.",
        },
        {
          text: "If the per-user history cap is raised without anyone rechecking this, the scan cost grows linearly and silently.",
          axis: "failure",
          correct: true,
          note: "The realistic failure mode: a configuration change elsewhere invalidates the assumption this structure was chosen under, and nothing fails loudly.",
        },
        {
          text: "A user with an unusually high request rate will overflow the array and crash.",
          axis: "failure",
          correct: false,
          note: "The array holds the last 50 as a ring — a high rate causes eviction, which is the intended behaviour rather than overflow.",
        },
        {
          text: "Resident memory per application server, and the p99 of the duplicate check.",
          axis: "measure",
          correct: true,
          note: "Both sides of the trade, which is what makes it checkable: memory is what you bought and check latency is what you paid.",
        },
        {
          text: "The average number of entries actually held per user, since the cap of 50 may rarely be reached.",
          axis: "measure",
          correct: true,
          note: "Worth measuring. If the real average is 3 the case for the array is stronger still; if it is pinned at 50 the crossover deserves rechecking.",
        },
        {
          text: "The hash function's collision rate.",
          axis: "measure",
          correct: false,
          note: "There is no hash function in the chosen design. This measures the option you did not take.",
        },
      ],
    },
    {
      id: "sc-small-sort",
      scenario:
        "A hot path sorts arrays of about 20 elements, several billion times a day. A colleague notices the code calls insertion sort and proposes replacing it with a well-tuned quicksort, because insertion sort is O(n²) and quicksort is O(n log n).",
      options: [
        {
          label: "Replace it with quicksort as proposed",
          appeal:
            "O(n log n) beats O(n²), and at billions of calls even a small per-call saving compounds enormously.",
        },
        {
          label: "Keep insertion sort, and say why",
          appeal:
            "At n = 20 it is branch-predictable, allocation-free and entirely in cache, which is why production sorts fall back to it below roughly 16 to 47 elements.",
        },
        {
          label: "Use the language's built-in sort",
          appeal:
            "Heavily optimised, and it removes a hand-written implementation from the codebase.",
        },
        {
          label: "Switch to a sorting network for exactly 20 elements",
          appeal:
            "Branch-free, a fixed comparison sequence, and theoretically optimal for a known small size.",
        },
      ],
      best: 1,
      verdict:
        "At n = 20 the asymptotics have not engaged: log₂(20) is about 4.3, so quicksort's advantage in comparison count is small while its recursion, pivot selection and partitioning overhead is not. This is exactly why Java's sort switches to insertion sort below 47 elements and most introsort implementations below 16. The built-in sort is a reasonable alternative and in many languages already does this internally — but that is worth checking rather than assuming, and it may carry comparator-call overhead the specialised path avoids.",
      claims: [
        {
          text: "You are accepting a quadratic bound in exchange for a much better constant at the size this code actually runs at.",
          axis: "trade",
          correct: true,
          note: "Stated correctly: the worse class is affordable precisely because n is bounded and small.",
        },
        {
          text: "You are relying on the input size staying small, which is an assumption rather than a guarantee.",
          axis: "trade",
          correct: true,
          note: "The load-bearing assumption. If a caller ever passes 10,000 elements, quadratic behaviour arrives with no warning.",
        },
        {
          text: "You are trading throughput for lower tail latency.",
          axis: "trade",
          correct: false,
          note: "That is the amortised-versus-worst-case trade, a different topic. Here insertion sort wins on both throughput and latency at this size.",
        },
        {
          text: "A caller passing an unexpectedly large array turns a hot path quadratic, with no error raised.",
          axis: "failure",
          correct: true,
          note: "The genuine risk, and the reason to add an assertion or a size-based fallback rather than relying on a comment.",
        },
        {
          text: "Insertion sort is unstable, so equal elements may be reordered.",
          axis: "failure",
          correct: false,
          note: "Insertion sort is stable. Quicksort is the unstable one, which is an argument against the proposed change rather than for it.",
        },
        {
          text: "The distribution of input sizes in production, not just the typical value.",
          axis: "measure",
          correct: true,
          note: "The mean is 20; what matters is the maximum and the tail, because that is where a quadratic would appear.",
        },
        {
          text: "Wall-clock time per call for both implementations, over the real size distribution.",
          axis: "measure",
          correct: true,
          note: "The direct comparison on actual data rather than at a single size. It also settles the argument without anyone having to concede a point about asymptotics.",
        },
        {
          text: "The number of comparisons each algorithm performs.",
          axis: "measure",
          correct: false,
          note: "Comparison count is the uniform-cost model that misleads here. Quicksort can perform fewer comparisons and still be slower, because of recursion and branch misprediction.",
        },
      ],
    },
    {
      id: "sc-shared-config",
      scenario:
        "A configuration object is read on every request by 64 worker threads and rewritten roughly once a minute by a background refresh. Reads outnumber writes by many millions to one. How should the shared state be held?",
      options: [
        {
          label: "A mutex around a mutable object",
          appeal:
            "Simple, obviously correct, and the standard answer for shared mutable state.",
        },
        {
          label: "An immutable snapshot, replaced by an atomic pointer swap",
          appeal:
            "Readers take no lock at all and never block; a write builds a fresh object and publishes it with one atomic store.",
        },
        {
          label: "A reader-writer lock",
          appeal:
            "Purpose-built for read-heavy access — many readers may hold it at once.",
        },
        {
          label: "A thread-local copy per worker, refreshed periodically",
          appeal:
            "No sharing at all, so the read path needs no synchronisation of any kind.",
        },
      ],
      best: 1,
      verdict:
        "With reads vastly outnumbering writes, the goal is to remove synchronisation from the read path entirely. An immutable snapshot behind an atomic pointer gives readers a plain load with no contention, and the write cost — allocating a whole new object once a minute — is irrelevant at that frequency. A reader-writer lock is the traditional answer and still writes to shared state on every read to track the reader count, bouncing that cache line across all 64 cores. Thread-local copies also work and introduce per-thread staleness that varies between workers, which is harder to reason about than one atomic swap everybody observes at once.",
      claims: [
        {
          text: "You are accepting an allocation per write in exchange for a completely lock-free read path.",
          axis: "trade",
          correct: true,
          note: "The trade in one sentence, and clearly favourable at one write per minute against millions of reads.",
        },
        {
          text: "You are accepting that a request may briefly use the previous snapshot after a refresh has begun.",
          axis: "trade",
          correct: true,
          note: "In-flight readers finish against the old object. Almost always acceptable for configuration, and it must be stated, because it is not acceptable for everything.",
        },
        {
          text: "You are accepting higher read latency in exchange for simpler writes.",
          axis: "trade",
          correct: false,
          note: "Backwards. Read latency improves — an uncontended atomic load is cheaper than acquiring any lock.",
        },
        {
          text: "If any code mutates the snapshot in place instead of replacing it, readers observe a partially updated object with no error.",
          axis: "failure",
          correct: true,
          note: "The real hazard: the design's safety rests entirely on the object being treated as immutable, and most languages do not enforce that.",
        },
        {
          text: "Readers will block during the refresh while the new object is constructed.",
          axis: "failure",
          correct: false,
          note: "The new object is built off to the side and published with a single store. Readers never wait — that is the property being bought.",
        },
        {
          text: "Read-path latency and its p99 under full concurrency, not single-threaded.",
          axis: "measure",
          correct: true,
          note: "Contention effects only appear under real concurrency; a single-threaded benchmark would show almost no difference between any of these options.",
        },
        {
          text: "Allocation rate and collector pressure from the periodic snapshot rebuild.",
          axis: "measure",
          correct: true,
          note: "The cost side of the trade. At one write per minute it should be negligible, and confirming that is what makes the decision defensible rather than assumed.",
        },
        {
          text: "Lock acquisition time on the read path.",
          axis: "measure",
          correct: false,
          note: "There is no lock on the read path in the chosen design. This measures the option you rejected.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "At small n, locality beats asymptotics",
      d: 'A linear scan over a contiguous array routinely beats a "faster" pointer-chasing structure for hundreds to thousands of elements. Measure at your actual n, not at n → ∞.',
    },
    {
      t: "Allocation is often the real cost",
      d: "A per-element allocation in a hot loop can dominate everything else, and in a managed language it also creates collector work that surfaces somewhere else entirely. Object pooling and ring buffers exist for exactly this.",
    },
    {
      t: "The same algorithm has opposite constraints in different systems",
      d: "A rolling window on a watch is bounded by 256 KB of RAM; the same window over years of minute bars is bounded by throughput; in a trading hot path it is bounded by tail latency. Same code, three different correct implementations.",
    },
    {
      t: "Immutability is a data-structure decision",
      d: "It buys safe sharing across threads and trivial undo, and it costs allocation on every write. Persistent structures make that trade explicit rather than accidental.",
    },
    {
      t: "A structure choice should be a sentence with numbers in it",
      d: "'At n = 500 the array is 3× faster and uses a third of the memory, so we use the array and revisit at 50,000.' That is reviewable, and it records when the decision expires. 'It is O(log n)' is not.",
    },
  ],
  pitfalls: [
    "Choosing by complexity class without asking what n is. Most crossovers sit in the hundreds or thousands, well above where much production code operates.",
    "Benchmarking at a size nobody runs at. A microbenchmark at ten million says nothing about a path that always sees fifty.",
    "Optimising the algorithm when the profile points at the allocator. No change of complexity class addresses allocation pressure.",
    "Treating a measured decision as permanent. Record the n it was made at, or the next person inherits a rule with no expiry condition.",
  ],
  quiz: [
    {
      q: "A linked list and an array both hold 500 integers, iterated frequently. Which is faster in practice?",
      options: [
        "The linked list — O(1) insertion",
        "The array — contiguous memory means far fewer cache misses",
        "Identical — both are O(n)",
        "It depends on the language",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Both are O(n) to traverse, but the array touches about 32 cache lines with prefetching while the list can pay a miss per node — each worth roughly a hundred arithmetic operations.",
      distractors: [
        "O(1) insertion is real and irrelevant to iteration, which is what the question asks about. It also assumes you already hold a reference to the position, and finding it is O(n).",
        "",
        "Identical asymptotics, and up to a hundredfold difference in constant. This is precisely the gap the notation does not model.",
        "Language affects the size of the gap but not its direction. Contiguous memory wins in every language with a cache underneath it.",
      ],
    },
    {
      q: "The strongest argument for a probabilistic structure over an exact one is:",
      options: [
        "It is easier to implement",
        "A bounded, quantified error is acceptable and it costs orders of magnitude less memory",
        "It is always faster",
        "It never fails",
      ],
      answer: 1,
      difficulty: "recall",
      why: 'The trade is explicit and measurable: quantify the error, quantify the saving, then decide. "Good enough, 100× cheaper" is a legitimate engineering answer; "approximately correct" is not.',
      distractors: [
        "Usually the reverse — a Bloom filter needs sizing, hash selection and an error budget, where a hash set needs none of those.",
        "",
        "Not always. A Bloom filter performs several hashes per lookup, which can be slower than one hash-set probe. The saving is memory, and claiming speed invites an easy refutation.",
        "It fails by construction — a false positive is a designed-in failure with a known rate. Pretending otherwise is how it gets deployed without a fallback path.",
      ],
    },
    {
      q: "Roughly where does the crossover sit between a cache-friendly linear scan and a pointer-chasing O(log n) structure?",
      options: [
        "Around n = 10",
        "Somewhere in the hundreds to low thousands, and it must be measured",
        "Around n = 1,000,000",
        "There is no crossover — O(log n) always wins",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A cache miss is worth roughly a hundred arithmetic operations, so the scan's n cheap operations beat the tree's log n expensive ones until n is around 100·log₂(n) — a few hundred to a few thousand, moving with element size and hardware.",
      distractors: [
        "Far too low. At n = 10 the linear scan wins overwhelmingly, which is why standard-library sorts use insertion sort well past that size.",
        "",
        "Far too high. By a million elements the tree has been winning for a long time.",
        "It wins asymptotically, which is a statement about large n. Below the crossover the constants decide, and they favour contiguity.",
      ],
    },
    {
      q: "Redis stores a small hash as a flat listpack and converts it past a threshold. What is the primary motivation?",
      options: [
        "Listpacks are faster to serialise",
        "A hash table's per-entry overhead dominates the data itself for small collections, and across millions of keys that overhead is the memory bill",
        "Listpacks support more operations",
        "Hash tables cannot hold small collections",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Buckets, load-factor slack and per-entry pointers cost far more than three small fields. The linear scan also happens to be faster at that size, but memory across millions of keys is the larger win.",
      distractors: [
        "A genuine secondary benefit of a flat layout, and not what the threshold is tuned for.",
        "",
        "The listpack supports fewer operations efficiently — which is exactly why it is abandoned above the threshold.",
        "They can, perfectly well. The point is that doing so is wasteful, not impossible.",
      ],
    },
    {
      q: "A profile shows most time in the garbage collector. Which change is most likely to help?",
      options: [
        "Replace the O(n log n) sort with an O(n) counting sort",
        "Reduce allocation — reuse buffers, pool objects, or switch to a contiguous layout",
        "Add more caching",
        "Increase the heap size",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Collector time is a function of how much you allocate, not of how many comparisons you perform. Improving the algorithm's complexity class leaves the allocation rate untouched, so it cannot address what the profile is pointing at.",
      distractors: [
        "A perfectly good optimisation aimed at the wrong bottleneck. The sort could become free and the collector time would not move.",
        "",
        "Caching typically allocates more, not less, and adds long-lived objects that survive collection — often making it worse.",
        "A larger heap makes collections less frequent and each one more expensive, usually trading throughput for a worse tail. It buys time rather than fixing anything.",
      ],
    },
    {
      q: "In a design review, which sentence best justifies a structure choice?",
      options: [
        "It is O(log n) rather than O(n)",
        "At our measured n of 500 the array is 3× faster and uses a third of the memory, so we use the array and revisit if n reaches 50,000",
        "It is the standard structure for this problem",
        "It scales better",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It names the size, both sides of the trade, and the condition under which the decision expires. Anyone can check it later, and the next person inherits a rule with a stated boundary rather than a preference.",
      distractors: [
        "A statement about large n, offered without saying what n is. It is the argument this entire tier exists to make you distrust.",
        "",
        "An appeal to convention that does not survive the follow-up question — and standard-library documentation sometimes explicitly disagrees, as Rust's does about LinkedList.",
        "Scaling matters if you are going to scale. Without a number for where you are and where you are heading, it cannot be evaluated.",
      ],
    },
    {
      q: "95% of instances of a collection hold under ten items; 5% hold millions. The best design is:",
      options: [
        "Optimise for the common case with a flat array",
        "Two representations behind one interface, switched at a measured size threshold",
        "Optimise for the large case, since it dominates total memory",
        "Use a balanced tree for both",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A bimodal distribution has no single right structure. Picking either extreme is wrong for the other group, and the hybrid costs a branch and a second implementation to test — which is what Redis, most string types and most standard-library maps already do.",
      distractors: [
        "Correct for 95% of instances and catastrophic for the rest, where a linear scan over millions of items appears in production as an unexplained stall.",
        "",
        "Correct for the memory total and wrong for 95% of instances, each paying overhead many times their payload.",
        "Wrong at both ends: overkill for ten items and worse than a purpose-built structure for millions.",
      ],
    },
    {
      q: "Two labs in this repo had their 'better' implementation replaced after measurement. What is the general lesson?",
      options: [
        "The measurements were wrong",
        "A complexity advantage is a hypothesis about your workload, and hardware effects — tombstones, memmove, cache misses — can reverse it entirely at real sizes",
        "JavaScript is too slow for data structures",
        "The complexity gate is too strict",
      ],
      answer: 1,
      difficulty: "judge",
      why: "In one case a Map's tombstones made an O(1) design measure super-linear; in the other, memmove made an O(n) insert competitive with O(log n). Both are hardware and runtime effects the notation does not model, and both were found only by running the code.",
      distractors: [
        "They were reproduced across repeated runs by an audit built for the purpose. Doubting the measurement is the reflex this topic asks you to resist.",
        "",
        "The same effects appear in every language — memmove and cache misses are properties of the machine, not of the runtime.",
        "The gate did its job precisely: it rejected one implementation, and for the other it correctly showed that no honest threshold could separate correct from wrong.",
      ],
    },
  ],
};

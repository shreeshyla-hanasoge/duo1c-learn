import type { Topic } from "../types.ts";

export const amortisedLatency: Topic = {
  id: "amortised-latency",
  title: "Amortised vs worst-case latency",
  tier: 5,
  week: 23,
  depth: "deep",
  summary: "Why amortised O(1) can still miss your p99.",
  why: "In a latency-sensitive path, the occasional O(n) rehash or GC pause is the number your users actually feel.",
  learn: {
    intuition:
      "Amortised analysis is an argument about a *total*. When we say a dynamic array push is amortised O(1), we mean that n pushes cost O(n) altogether — most are a single write, and occasionally one has to allocate a bigger array and copy everything across, but those doublings are rare enough that the average holds. That is a completely honest statement and it is the right way to budget throughput. The trouble is that your users do not experience an average; they experience individual requests. The push that triggers the copy is genuinely O(n), and if it lands inside a request, that request is slow. At small scale nobody notices. At a million requests a minute, an event that happens once in ten thousand operations happens a hundred times a minute, and it lands squarely in your p99.99 — which, at that volume, is thousands of real users a day. So amortised and worst-case are not competing claims about the same thing. They answer different questions: 'what will this cost me in total' and 'what is the worst any single user will feel'. A system with a latency budget needs the second one answered, and amortised analysis structurally cannot answer it.",
    mechanics: [
      {
        heading: "Amortised bounds the total, not the individual",
        body: "A hash map insert is amortised O(1), but the insert that triggers the rehash is O(n) — it allocates a bigger table and rehashes every existing key. Amortisation says those are rare; it says nothing about which operation absorbs the cost, and gives you no way to keep it out of a latency-critical path.",
      },
      {
        heading: "Know which of the three bounds you have been given",
        body: "Worst case bounds every individual operation. Amortised bounds any sequence of operations. Average case bounds the expectation over random inputs. They are routinely conflated, and 'amortised O(1)' being read as 'always fast' is the specific confusion this topic exists to fix. Only worst case tells you anything about a tail.",
      },
      {
        heading: "Pre-size to remove the spike entirely",
        body: "If you know roughly how many elements you will insert, allocate that capacity up front. The doublings disappear because there are none left to do, and the fix is one argument to a constructor. It is the cheapest tail-latency improvement available anywhere and it is routinely missed, because the code was correct and fast in every benchmark that measured throughput.",
      },
      {
        heading: "Incremental beats batch when the tail matters",
        body: "Rather than rehashing everything at once, Redis keeps both tables alive and migrates a few buckets per operation until the old one is empty. Generational garbage collectors do the same thing with heap compaction. Both trade a little throughput — every operation now does a small amount of extra work — for the removal of one large pause. That is exactly the right trade when you are judged on p99 and exactly the wrong one when you are judged on total time.",
      },
      {
        heading: "Measure percentiles, and never the mean",
        body: "A mean hides everything this topic is about: one operation in ten thousand taking a hundred milliseconds barely moves an average built from microsecond operations. The p99, p99.9 and maximum are where a rehash or a collection pause becomes visible. If your dashboard shows only averages, you have instrumented the amortised bound and left the worst case unmeasured.",
      },
    ],
    complexityDerivation:
      "The dynamic-array argument is worth doing properly because it shows exactly what amortisation hides. Growing by doubling, the copies happen at sizes 1, 2, 4, 8 up to n, and their total cost is 1 + 2 + 4 + … + n, which is a geometric series summing to under 2n. Spread across n pushes, that is under 2 units each — O(1) amortised, and the constant is small. Every step of that is true, and notice what it does not mention: the largest single copy is n/2 elements, and it happens on one specific push. Now translate that into latency. Suppose an operation normally costs one microsecond and the final rehash of a million-entry map costs fifty milliseconds. The mean over a million operations rises by 0.05 microseconds — completely invisible. But one request in a million took fifty thousand times longer than the rest, and at ten thousand requests a second that is one such request every hundred seconds, permanently pinned at the top of your latency distribution. The general shape: amortisation converts a rare large cost into a small average one, and a percentile-based objective converts it straight back. Which analysis is the right one depends entirely on whether your service level agreement is written about totals or about tails, and that is a question to ask before choosing a structure rather than after an incident.",
    variants: [
      {
        name: "Accept the spike",
        when: "Batch work, offline jobs, anything judged on total time.",
        delta:
          "The default and usually correct. Amortised bounds are honest and the simplest implementation wins.",
      },
      {
        name: "Pre-size",
        when: "The final size is known or can be estimated.",
        delta:
          "One constructor argument removes the growth spikes entirely. No ongoing cost and no complexity — the first thing to reach for.",
      },
      {
        name: "Incremental migration",
        when: "The structure must stay live and the tail matters.",
        delta:
          "Redis's incremental rehashing keeps two tables and moves a few buckets per operation. Slightly slower overall, no single large pause.",
      },
      {
        name: "Move the work off the critical path",
        when: "The expensive step can happen somewhere a user is not waiting.",
        delta:
          "Rebuild in the background and swap atomically, or do the growth during a warm-up. The cost is unchanged; what changes is who waits for it.",
      },
    ],
    tradeoffs: [
      {
        vs: "A worst-case O(log n) structure",
        pick: "The amortised O(1) one unless the tail is your objective",
        because:
          "A balanced tree gives a guaranteed bound on every operation, and a hash map gives a better average with an occasional spike. For a batch job the hash map wins outright. For a service with a p99.9 target, a predictable logarithm can genuinely beat an unpredictable constant — this is why some real-time systems avoid hash maps entirely. Decide which number you are being judged on before you choose.",
      },
      {
        vs: "Incremental rehashing",
        pick: "Incremental when the structure is large and live",
        because:
          "It costs a little throughput on every operation and some real implementation complexity — two tables alive at once, every read consulting both. In exchange, the largest single pause disappears. On a small map the whole rehash is a fraction of a millisecond and the complexity buys nothing; on a multi-gigabyte one it is the difference between a service that meets its latency target and one that does not.",
      },
      {
        vs: "Tuning the garbage collector",
        pick: "Reduce allocation first",
        because:
          "Collector tuning shifts pauses around — a larger heap makes them rarer and longer, a concurrent collector trades throughput for shorter ones. None of it reduces the work, and every knob has a cost somewhere else. Allocating less removes the work entirely, and it is usually a structural change: reuse buffers, use a ring buffer, avoid per-element objects. Tune only once you have stopped generating garbage you did not need.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — pre-sizing bar buffers before a backtest",
      kind: "yours",
      problem:
        "A backtest appends bars to per-instrument collections as it streams a session. Growing them by doubling means periodic reallocation and copying in the middle of the run, which shows up as irregular per-bar timings and makes profiling harder to read.",
      applied:
        "The bar count for a session is known before the run begins, so the collections are allocated at full size up front and never grow. The pre-warm step does the same thing for the market-data cache. The total work is unchanged; what disappears is the copy landing at an unpredictable point in the loop.",
      evidence: "strategy-engine/scripts/pre_warm_market_data.py",
      impact: "Reallocation spikes mid-run → a flat per-bar cost and cleaner profiles",
    },
    {
      system: "Redis incremental rehashing",
      kind: "industry",
      problem:
        "Redis is single-threaded, so rehashing a hash table of millions of keys in one operation would block every other client for the entire duration — a multi-second stall on a system whose whole appeal is sub-millisecond responses.",
      applied:
        "Two tables are kept alive during a resize. Every operation migrates a few buckets from old to new, and lookups check both until the old table is empty. Each operation pays a tiny amount extra and no operation pays the whole cost. It is the canonical example of trading throughput for a flat tail.",
      evidence: "Redis `dict.c`, `dictRehashMilliseconds`",
      impact: "A multi-second stall → a few extra microseconds spread across many operations",
    },
    {
      system: "Garbage collector pauses",
      kind: "industry",
      problem:
        "A stop-the-world collection halts every thread. For a request-serving system, whichever requests are in flight absorb the entire pause, and they are chosen essentially at random.",
      applied:
        "Generational and concurrent collectors — G1, ZGC, Go's collector — exist to spread that cost. They do more total work than a simple stop-the-world collector and keep the maximum pause down to single-digit milliseconds. That is the same trade Redis makes, at the runtime level, and it is why the modern default is a concurrent collector even though it costs throughput.",
      impact: "Multi-hundred-millisecond pauses → single-digit-millisecond pauses, at some throughput cost",
    },
    {
      system: "TCP slow start and connection warm-up",
      kind: "industry",
      problem:
        "The first requests over a fresh connection are slower — the congestion window has not opened, TLS is negotiating, and caches are cold. Average latency looks fine because most requests reuse warm connections.",
      applied:
        "Connection pools pre-warm connections and keep them alive precisely so the cost is paid where nobody is waiting. It is the same pattern as pre-sizing an array: the work does not get cheaper, it moves off the path where a user can feel it.",
      impact: "Cold-start cost moved out of the request path rather than reduced",
    },
  ],
  cases: [
    {
      id: "al-rehash",
      scenario:
        "A request-serving service keeps an in-memory hash map that grows to about 20 million entries over a day. Throughput is comfortable, but the p99.9 latency has a recurring spike of roughly 400 ms, several times an hour, that nobody can correlate with traffic. The map is created with default capacity. What do you do first?",
      options: [
        {
          label: "Pre-size the map to its expected final capacity at startup",
          appeal:
            "The doublings that cause the copies stop happening, and it is a one-line change with no ongoing cost.",
        },
        {
          label: "Replace it with a balanced tree for guaranteed O(log n)",
          appeal:
            "Every operation gets a hard bound, so there is no spike to chase at all.",
        },
        {
          label: "Shard the map across 16 smaller maps",
          appeal:
            "Each rehash is a sixteenth of the size, so the worst pause shrinks proportionally.",
        },
        {
          label: "Increase the heap so collections happen less often",
          appeal:
            "If the spikes are garbage collection, more headroom means fewer collections.",
        },
      ],
      best: 0,
      verdict:
        "The signature fits map growth: periodic, uncorrelated with traffic, and proportional to a doubling. Pre-sizing removes the cause rather than shrinking it, costs one argument, and has no ongoing penalty. Sharding is a reasonable second step and still leaves 16 smaller spikes. A tree gives up a great deal of throughput for a problem that has a free fix. Raising the heap is aimed at a different cause and, if the spikes are actually collections, generally makes each one longer.",
      claims: [
        {
          text: "You are accepting higher baseline memory from the start in exchange for removing the growth pauses.",
          axis: "trade",
          correct: true,
          note: "The trade, and it is cheap: the memory would have been reached anyway, just later — you are paying earlier rather than paying more.",
        },
        {
          text: "You are relying on an estimate of the final size, which could be wrong in either direction.",
          axis: "trade",
          correct: true,
          note: "Correct. Under-estimating means the doublings return; over-estimating wastes memory. Both are recoverable, which is what makes this a low-risk first move.",
        },
        {
          text: "You are trading correctness for latency.",
          axis: "trade",
          correct: false,
          note: "Nothing about capacity affects correctness. Pre-sizing changes only when memory is allocated.",
        },
        {
          text: "If the entry count grows well beyond the estimate, the doublings resume and the spike returns unannounced.",
          axis: "failure",
          correct: true,
          note: "The realistic failure: the fix is tied to an assumption about volume that nothing enforces or alerts on.",
        },
        {
          text: "Pre-sizing will cause the map to reject inserts once the pre-sized capacity is reached.",
          axis: "failure",
          correct: false,
          note: "Capacity is a starting size, not a limit. The map still grows past it — that is precisely why the spike can come back.",
        },
        {
          text: "p99.9 and maximum request latency, not the mean.",
          axis: "measure",
          correct: true,
          note: "The mean is where this problem hides. The whole point of the topic is that the tail is the only place a rare large cost is visible.",
        },
        {
          text: "Resident memory at startup and steady state, to confirm the pre-sizing cost is acceptable.",
          axis: "measure",
          correct: true,
          note: "The cost side of the trade. Confirming it is what turns the change from a guess into a decision.",
        },
        {
          text: "Average insert throughput.",
          axis: "measure",
          correct: false,
          note: "Throughput was already comfortable and is not what is failing. Measuring it would show no change and tell you nothing.",
        },
      ],
    },
    {
      id: "al-incremental",
      scenario:
        "A single-threaded in-memory store holds several gigabytes in one hash table. Resizing it in a single operation would block all clients for seconds. Traffic is continuous, so there is no quiet window, and the data must stay queryable throughout. How do you handle growth?",
      options: [
        {
          label: "Resize in one operation during the lowest-traffic hour",
          appeal:
            "Simple, and it confines a known stall to the point where it affects the fewest users.",
        },
        {
          label: "Incremental rehashing — keep both tables and migrate a few buckets per operation",
          appeal:
            "No single operation pays the whole cost, and the store stays queryable the entire time.",
        },
        {
          label: "Pre-size at startup so no resize ever happens",
          appeal:
            "Removes the problem entirely, with no ongoing cost, as in the previous case.",
        },
        {
          label: "Build a new table in a background thread and swap it in",
          appeal:
            "The expensive work happens where no client is waiting, then one atomic pointer swap.",
        },
      ],
      best: 1,
      verdict:
        "This is precisely why Redis rehashes incrementally. Continuous traffic rules out a quiet window; pre-sizing helps but cannot cover unbounded growth over a long-lived process, and the scenario states growth is happening. A background rebuild is a genuinely good pattern and is ruled out here by the store being single-threaded — there is no other thread to do the work, and the memory doubling during a rebuild is severe at several gigabytes. Incremental migration spreads the cost across operations, which is exactly the throughput-for-tail trade this topic is about.",
      claims: [
        {
          text: "You are accepting slightly slower operations across the board in exchange for eliminating one large stall.",
          axis: "trade",
          correct: true,
          note: "The trade stated with both sides, and it is the defining shape of every technique in this topic.",
        },
        {
          text: "You are accepting extra memory while both tables are alive.",
          axis: "trade",
          correct: true,
          note: "Often the binding constraint at several gigabytes, and it must be named — the peak is higher than either table alone.",
        },
        {
          text: "You are accepting that some reads may return stale data during the migration.",
          axis: "trade",
          correct: false,
          note: "Reads consult both tables, so results stay exact throughout. Nothing here is approximate — that would be a very different design.",
        },
        {
          text: "Every read must check both tables until migration completes, so a bug in that path silently returns misses for keys that exist.",
          axis: "failure",
          correct: true,
          note: "The real hazard: the dual-table read path is the subtle part, and its failure mode is a missing key rather than a crash.",
        },
        {
          text: "The store becomes unavailable for writes during migration.",
          axis: "failure",
          correct: false,
          note: "It stays fully available — that is the entire point of migrating incrementally rather than all at once.",
        },
        {
          text: "Maximum operation latency during a migration window, compared against a non-migrating window.",
          axis: "measure",
          correct: true,
          note: "Directly tests the claim: the maximum should stay flat, which is what was bought.",
        },
        {
          text: "Peak resident memory while both tables are alive.",
          axis: "measure",
          correct: true,
          note: "The cost side, and at several gigabytes it is the number most likely to make this design fail.",
        },
        {
          text: "The number of keys rehashed per second.",
          axis: "measure",
          correct: false,
          note: "An internal rate that is interesting for tuning and says nothing about whether the objective — a flat tail at acceptable memory — was met.",
        },
      ],
    },
    {
      id: "al-batch-vs-tail",
      scenario:
        "A nightly batch job processes several hundred million records with no latency requirement — it only has to finish before the morning. A colleague proposes replacing its hash maps with a structure that has guaranteed worst-case bounds, citing the p99 problems the request-serving team has been fighting.",
      options: [
        {
          label: "Adopt it for consistency across the codebase",
          appeal:
            "One structure everywhere is easier to reason about and to review.",
        },
        {
          label: "Keep the hash maps, because this job is judged on total time and amortised bounds are exactly the right analysis for it",
          appeal:
            "Amortised O(1) is an honest claim about totals, and totals are the objective here.",
        },
        {
          label: "Adopt it, since worst-case bounds are strictly stronger",
          appeal:
            "A guarantee on every operation is a stronger property than a guarantee on the average.",
        },
        {
          label: "Benchmark both and pick the faster",
          appeal:
            "Measurement beats argument, and the answer would be defensible either way.",
        },
      ],
      best: 1,
      verdict:
        "Amortised analysis is not a weaker version of worst-case analysis — it answers a different question, and for a batch job it answers the right one. Spikes are irrelevant when nobody is waiting on any individual operation, and the hash map's better average directly reduces total runtime. Benchmarking is never wrong, but it would confirm what the analysis already tells you and spend a day doing it. Applying a latency fix to a throughput problem is cargo-culting a solution across a boundary where the objective changed.",
      claims: [
        {
          text: "You are accepting occasional multi-millisecond spikes in exchange for a better average, which is free here because nothing waits on an individual operation.",
          axis: "trade",
          correct: true,
          note: "The trade named precisely, including why the cost is zero in this context. The same trade would be unacceptable in the request path.",
        },
        {
          text: "You are accepting that this job's structure choice differs from the request-serving path's, and that difference needs to be explained rather than assumed.",
          axis: "trade",
          correct: true,
          note: "Real, and worth writing down. Divergence without a recorded reason is what makes the next person unify them wrongly.",
        },
        {
          text: "You are accepting worse total runtime for more predictable per-record timing.",
          axis: "trade",
          correct: false,
          note: "Backwards — that describes accepting the colleague's proposal. Keeping the hash map buys better total runtime.",
        },
        {
          text: "If this job is ever moved behind a synchronous API, the amortised reasoning silently stops applying.",
          axis: "failure",
          correct: true,
          note: "The genuine risk: the decision depends on an objective that lives outside the code, and nothing in the code records it.",
        },
        {
          text: "Hash maps will produce incorrect results on datasets this large.",
          axis: "failure",
          correct: false,
          note: "Size does not affect correctness. Growth affects latency distribution, which is a different property entirely.",
        },
        {
          text: "Total wall-clock runtime of the job, and whether it finishes inside the window.",
          axis: "measure",
          correct: true,
          note: "The actual objective. Measuring the thing you are judged on is the whole discipline here.",
        },
        {
          text: "Peak memory, since the job must share the machine with other overnight work.",
          axis: "measure",
          correct: true,
          note: "A real constraint that the runtime target does not capture, and the one most likely to break a batch job.",
        },
        {
          text: "The p99 of individual record-processing time.",
          axis: "measure",
          correct: false,
          note: "Precisely the metric that does not matter here. Tracking it is how a team ends up optimising a batch job for a latency target nobody asked for.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "Amortised bounds the total, not the individual",
      d: "A hash map insert is amortised O(1), but the insert that triggers the rehash is O(n). If that lands in a request, your p99 shows it — amortisation says such operations are rare, not that they are absent.",
    },
    {
      t: "Pre-size to avoid the spike",
      d: "If you know the final size, allocate it up front. The cheapest latency fix available anywhere, and routinely missed because the code was fast in every throughput benchmark.",
    },
    {
      t: "Incremental beats batch when tail latency matters",
      d: "Incremental rehashing and generational collection exist to spread the cost, trading a little throughput for a flatter tail. The right trade under a p99 target and the wrong one under a total-time target.",
    },
    {
      t: "Worst case, amortised and average case answer different questions",
      d: "Worst case bounds every operation, amortised bounds a sequence, average case bounds over random inputs. Only the first says anything about a tail, and conflating them is the error this topic exists to correct.",
    },
    {
      t: "A mean cannot show you a rare large cost",
      d: "One operation in ten thousand taking a hundred milliseconds barely moves an average built from microseconds. If the dashboard shows only averages, the worst case is unmeasured.",
    },
  ],
  pitfalls: [
    "Reading 'amortised O(1)' as 'always fast'. It is a claim about totals and is silent about which operation absorbs the cost.",
    "Reporting mean latency for a path with rare expensive operations. The metric is structurally incapable of showing the problem.",
    "Applying a tail-latency fix to a throughput-bound batch job, where the spike costs nothing and the fix costs real time.",
    "Tuning the collector before reducing allocation. Tuning moves pauses around; allocating less removes the work.",
  ],
  quiz: [
    {
      q: "A hash map insert is amortised O(1). What can go wrong at p99?",
      options: [
        "Nothing",
        "The insert that triggers a rehash is O(n), and if it lands inside a request, that request is slow",
        "Amortised means average, so p99 is fine",
        "Only if the hash is bad",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Amortisation is an argument about totals. It says nothing about which individual operation absorbs the cost.",
      distractors: [
        "The bound is honest and the tail is still affected — those are compatible statements, which is exactly what makes this confusing.",
        "",
        "Amortised is not average case; it bounds any sequence rather than an expectation over random inputs. Either way, neither says anything about a percentile.",
        "A bad hash causes clustering, which is a separate problem. Rehashing on growth happens with a perfect hash function too.",
      ],
    },
    {
      q: "Which analysis bounds every individual operation?",
      options: ["Amortised", "Worst case", "Average case", "All three"],
      answer: 1,
      difficulty: "recall",
      why: "Only worst case makes a promise about each operation. Amortised bounds a sequence and average case bounds an expectation, and neither constrains a single call.",
      distractors: [
        "Amortised bounds a sequence — the whole point is that individual operations may exceed the bound as long as the total does not.",
        "",
        "Average case bounds the expectation over random inputs, so an individual operation can be far worse, especially on adversarial input.",
        "They answer different questions, and treating them as interchangeable is the error this topic corrects.",
      ],
    },
    {
      q: "The cheapest fix for growth-related latency spikes is usually:",
      options: [
        "Switching to a tree",
        "Pre-sizing the structure when the final size is known",
        "Adding a cache",
        "Increasing the heap",
      ],
      answer: 1,
      difficulty: "apply",
      why: "It removes the cause rather than shrinking it, costs one constructor argument, and carries no ongoing penalty. The memory would have been reached anyway — you are just paying earlier.",
      distractors: [
        "It gives a guarantee and gives up a great deal of throughput, for a problem with a free fix.",
        "",
        "A cache adds memory and a coherence problem without touching the growth spikes at all.",
        "That is aimed at collection pauses, and if the spikes are collections, a larger heap generally makes each one longer.",
      ],
    },
    {
      q: "Redis migrates a few buckets per operation instead of rehashing at once. What is the trade?",
      options: [
        "Better throughput, worse tail",
        "Slightly worse throughput on every operation, in exchange for eliminating one large stall",
        "Less memory",
        "Stronger consistency",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Every operation does a little extra work so that no operation does all of it. Since Redis is single-threaded, one big rehash would block every client for seconds.",
      distractors: [
        "Exactly backwards. Throughput is what is being spent; the tail is what is being bought.",
        "",
        "It uses MORE memory while both tables are alive, which is a real cost of the approach and often the binding one.",
        "Consistency is unaffected — reads consult both tables, so results stay exact throughout.",
      ],
    },
    {
      q: "A nightly batch job with no latency requirement should be optimised for:",
      options: [
        "p99 per-record latency",
        "Total wall-clock time — amortised bounds are the right analysis when nothing waits on an individual operation",
        "Worst-case per-operation bounds",
        "Minimum memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Amortised analysis is not a weaker worst case; it answers a different question, and for a batch job it answers the right one. Spikes cost nothing when no user is waiting.",
      distractors: [
        "A metric that does not correspond to anything anyone cares about here, and optimising it costs real total time.",
        "",
        "Guarantees on individual operations buy predictability nobody needs, at the price of a worse average.",
        "Memory is a genuine secondary constraint on a shared overnight machine, and it is not the objective the job is judged on.",
      ],
    },
    {
      q: "Your dashboard shows mean latency is unchanged after a release, but users report intermittent slowness. What is the most likely instrumentation problem?",
      options: [
        "The dashboard is broken",
        "A mean cannot reveal a rare large cost — one operation in ten thousand at 100 ms barely moves an average of microsecond operations",
        "Users are exaggerating",
        "The sample size is too small",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The metric is structurally incapable of showing this class of problem. Percentiles and the maximum are where a rehash or a collection pause becomes visible, and reporting only averages instruments the amortised bound while leaving the worst case unmeasured.",
      distractors: [
        "It is reporting the mean correctly. The fault is in which statistic was chosen, not in the pipeline.",
        "",
        "Intermittent slowness is exactly the symptom this topic predicts, and dismissing it means never finding the cause.",
        "More samples make a mean more precise and no more capable of surfacing a tail. The statistic is the problem, not its confidence.",
      ],
    },
    {
      q: "Which change actually reduces garbage-collection work, rather than relocating it?",
      options: [
        "Increasing the heap size",
        "Allocating less — reusing buffers, ring buffers, avoiding per-element objects",
        "Switching to a concurrent collector",
        "Calling the collector manually",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Collector work is a function of how much you allocate. Every tuning knob trades pause frequency against pause length or throughput; only allocating less removes the work.",
      distractors: [
        "Makes collections rarer and each one longer, trading frequency for duration.",
        "",
        "Trades throughput for shorter pauses — valuable, and still doing the same total work.",
        "Usually harmful: it forces a full collection at a moment the runtime did not choose, and most runtimes treat it as a hint anyway.",
      ],
    },
    {
      q: "A service has a p99.9 target. Someone proposes a hash map over a balanced tree, citing O(1) versus O(log n). What is the right question?",
      options: [
        "Which has the better average?",
        "Is that O(1) worst case or amortised — because a predictable logarithm can beat an unpredictable constant under a tail target",
        "How large is n?",
        "Which uses less memory?",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Under a percentile objective, the guarantee matters more than the average. This is why some real-time systems avoid hash maps entirely, and asking which bound is on offer is what surfaces the actual decision.",
      distractors: [
        "The average is what the hash map wins on and is not the metric under discussion.",
        "",
        "A good question in general and it does not resolve this one: the spike scales with n rather than disappearing at any particular size.",
        "A legitimate secondary consideration that has nothing to do with the tail-latency target being discussed.",
      ],
    },
  ],
};

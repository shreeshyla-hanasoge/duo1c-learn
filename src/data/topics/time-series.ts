import type { Topic } from "../types.ts";

export const timeSeries: Topic = {
  id: "time-series",
  title: "Time-series structures",
  tier: 4,
  week: 21,
  depth: "deep",
  summary:
    "Sliding-window aggregates, exponential decay, t-digest for quantiles.",
  why: "Every metric pipeline, indicator, and dashboard aggregate you own.",
  complexity: "O(1) amortised per sample",
  learn: {
    intuition:
      "A time series arrives one sample at a time and never stops, so every structure here is shaped by two constraints: you get one look at each value, and memory must not grow with the length of the stream. That immediately rules out the obvious implementations. You cannot sort to get a median, because you do not have the data. You cannot recompute an average over the last minute from scratch on every sample, because that is O(window) per sample and the window is often large. So you keep *state* rather than data — a running total, a running count, a decaying estimate — and update it incrementally. The subtlety, and the reason this topic is worth its own place, is that the obvious incremental formulas are numerically dangerous. The textbook variance formula, mean of squares minus square of the mean, subtracts two large and nearly equal numbers, and floating point handles that badly enough to return a negative variance on perfectly ordinary data. Welford's method computes the same quantity by updating the mean and the sum of squared deviations together, so the subtraction never happens. Same answer in exact arithmetic, completely different behaviour in real arithmetic — which is the general lesson here.",
    mechanics: [
      {
        heading: "Welford for mean and variance, always",
        body: "Per sample: increment `n`, compute `delta = x - mean`, update `mean += delta / n`, then `m2 += delta * (x - mean)` — using the *new* mean in that second term, which is the part people get wrong. Variance is `m2 / n` for the population or `m2 / (n - 1)` for the sample. One pass, O(1) memory, and numerically stable in a way that the naive formula is not.",
      },
      {
        heading: "Why the naive formula fails",
        body: "`E[x²] - (E[x])²` is exact in real arithmetic and catastrophic in floating point when the mean is large relative to the spread. Values around a billion with a spread of a few units produce two quantities agreeing to fifteen digits, and subtracting them leaves almost nothing but rounding error — routinely a variance that is wrong by orders of magnitude, or negative. Timestamps in milliseconds since 1970 are exactly this shape, which is why the bug shows up so often in monitoring code.",
      },
      {
        heading: "Sliding windows need the leaving value, not just the arriving one",
        body: "A rolling sum is `sum += arriving - leaving`, which needs the sample dropping out of the window — so you must retain the window, typically in a ring buffer. Note that repeated addition and subtraction lets error accumulate over millions of updates, so a long-running rolling sum should be recomputed periodically. Rolling minimum and maximum cannot be done this way at all, because the leaving value might have been the extreme: that needs a monotonic deque.",
      },
      {
        heading: "EMA has no window, and that is the point",
        body: "`ema = alpha * x + (1 - alpha) * ema` is one multiply-add, O(1) memory, and retains no history at all. Old samples fade smoothly rather than dropping off a cliff, which avoids the artefact where a rolling average jumps because one large value left the window. The cost is that 'the last five minutes' is now approximate — there is no exact window, only a decay rate — so it is the wrong choice when the window boundary has to be precise, like a billing period.",
      },
      {
        heading: "Quantiles need a sketch, and averaging them is meaningless",
        body: "The p99 cannot be computed from a running total, and keeping every sample is not affordable. t-digest clusters values with much finer resolution near the extremes than the middle, which is exactly where the interesting quantiles live, and it merges across shards. The critical operational point: averaging the p99 of ten servers does not give the p99 of the fleet, and neither does taking the maximum. You must merge the sketches, and a dashboard that averages percentiles is reporting a number with no meaning.",
      },
    ],
    complexityDerivation:
      "Welford is O(1) time and O(1) memory per sample — a handful of arithmetic operations, no history retained. A rolling window aggregate is O(1) per sample but O(window) memory, since the leaving value has to be available. An EMA is O(1) in both, which is why it is the default in embedded and high-frequency settings where the window buffer itself is the expensive part. t-digest is O(log k) per insert for k clusters, with k fixed by the accuracy you ask for rather than by the data volume, so memory is constant regardless of how many samples arrive. The analysis that actually matters here, though, is not asymptotic — it is numerical. Welford and the naive variance formula are both O(n) with identical operation counts, and one of them returns garbage on real inputs. That is a kind of cost the notation does not describe at all: the relevant quantity is the condition number of the computation, which measures how much the answer amplifies input rounding. The naive formula's condition number grows with the ratio of the mean to the standard deviation, so it degrades precisely as your data moves away from zero. Knowing to reach for Welford is not an optimisation; it is the difference between a correct number and a confident wrong one.",
    variants: [
      {
        name: "Welford's running mean and variance",
        when: "Any streaming mean, variance or standard deviation.",
        delta:
          "O(1) memory, numerically stable, and it extends to a parallel form where two partial results merge — so it works across shards.",
      },
      {
        name: "Sliding window over a ring buffer",
        when: "An exact 'last N samples' or 'last N seconds' aggregate.",
        delta:
          "O(window) memory because you need the value leaving. Exact boundaries, at the cost of holding the window.",
      },
      {
        name: "Exponentially weighted moving average",
        when: "A smooth recent-weighted estimate with no memory budget.",
        delta:
          "One multiply-add, no history. No exact window, and it needs a bias correction early on or the first values are pulled toward the initial state.",
      },
      {
        name: "t-digest or HDR histogram",
        when: "Quantiles, especially tail quantiles.",
        delta:
          "Fixed memory, accurate at the extremes, and mergeable across shards. HDR histogram uses fixed buckets and is simpler; t-digest adapts and is more accurate in the tail.",
      },
    ],
    tradeoffs: [
      {
        vs: "The naive variance formula",
        pick: "Welford, unconditionally",
        because:
          "There is no trade here, which is unusual enough to be worth stating plainly. Same complexity, same operation count, and the naive version returns wrong or negative variances on ordinary data whose mean is far from zero. The only reason it survives is that it looks like the textbook definition and it is correct on small tidy test data — so the bug reaches production intact.",
      },
      {
        vs: "An exact sliding window",
        pick: "EMA when the boundary does not have to be exact",
        because:
          "The window buffer is the memory cost, and at ten thousand series with a thousand-sample window that is ten million values held permanently. An EMA is one number per series. Take the exact window when the boundary is contractual — a billing period, an SLA measured over a stated interval — and the EMA when it is a smoothing choice, which it usually is.",
      },
      {
        vs: "Storing raw samples and computing quantiles on demand",
        pick: "A sketch once retention outlives a debugging session",
        because:
          "Raw samples give exact quantiles and any query you think of later, which is genuinely valuable while investigating an incident. They also grow without bound and cannot be aggregated cheaply. The common shape is both: a short raw retention for investigation, plus sketches kept indefinitely for trends. What you must not do is keep per-server percentiles and average them, which produces a number that corresponds to nothing.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — rolling indicators over bar series",
      kind: "yours",
      problem:
        "Moving averages, standard deviations and Bollinger bands are recomputed over their lookback window on every bar. Doing that from scratch is O(window) per bar per indicator, and it multiplies across instruments and parameter sweeps.",
      applied:
        "Incremental updates: a rolling sum over a ring buffer for the mean, and Welford where variance is needed. The numerical point matters here specifically — index levels in the tens of thousands with a spread of a few points is exactly the large-mean, small-spread case that makes the naive variance formula return nonsense, and a wrong band width silently changes every entry signal.",
      evidence: "strategy-engine/list_all_indicators.py",
      impact:
        "O(window) per bar per indicator → O(1), with a variance that survives large price levels",
    },
    {
      system: "Prometheus and monitoring pipelines",
      kind: "industry",
      problem:
        "Reporting p99 latency for a service running across many replicas, where each replica can only see its own requests.",
      applied:
        "Each replica keeps a histogram with fixed buckets and exports the bucket counts rather than a computed percentile. The server sums the bucket counts across replicas and derives the fleet percentile from the combined histogram. This is why Prometheus exports histogram buckets rather than a p99 value — percentiles are not additive, and only the underlying counts can be merged.",
      impact:
        "Meaningless averaged percentiles → a fleet percentile derived from merged bucket counts",
    },
    {
      system: "TCP round-trip time estimation",
      kind: "industry",
      problem:
        "Setting a retransmission timeout that adapts to a changing network without a per-connection history buffer, on every connection in the kernel.",
      applied:
        "An EMA of the round-trip time, plus a second EMA of the deviation, with the timeout set from both. It is the textbook case for exponential decay: constant memory per connection, smooth adaptation, and no window boundary to argue about. Jacobson's algorithm has done this since 1988.",
      impact: "Per-connection state reduced to two numbers, adapting continuously",
    },
    {
      system: "Anomaly detection on metrics",
      kind: "industry",
      problem:
        "Flagging a metric that has moved unusually far from its normal behaviour, without storing its full history and without alerting on every ordinary fluctuation.",
      applied:
        "A running mean and standard deviation via Welford, with alerting on deviations beyond a threshold. The trap is look-ahead: computing the statistics over a window that includes the point being judged makes an anomaly contribute to the baseline it is measured against, which suppresses exactly the events you wanted to catch. The baseline must use only data strictly before the point under test.",
      impact:
        "Bounded per-metric state, and an alert threshold that the anomaly cannot quietly raise",
    },
  ],
  lab: {
    prompt:
      "Return `[mean, populationVariance]` for an array of samples, computed in ONE pass with O(1) extra memory, using Welford's method. Population variance divides by n, not n−1. Return `[0, 0]` for an empty array. The naive 'mean of squares minus square of the mean' loses catastrophic precision when the mean is far from zero, so the tests include that case.",
    fnName: "runningStats",
    signature: "runningStats(samples: number[]): number[]",
    starter: `function runningStats(samples) {
// One pass, O(1) memory.
// Keep n, mean, and m2 (the running sum of squared deviations).
// Per sample: delta = x - mean; mean += delta / n;
//             m2 += delta * (x - mean)   <-- the NEW mean here
// Population variance is m2 / n.

return [0, 0];
}`,
    tests: [
      {
        // mean 5, deviations -3,-1,-1,-1,0,0,2,4 -> squares sum 32, /8 = 4.
        name: "textbook case",
        input: [[2, 4, 4, 4, 5, 5, 7, 9]],
        expected: [5, 4],
      },
      {
        name: "simple four values",
        input: [[1, 2, 3, 4]],
        expected: [2.5, 1.25],
      },
      {
        // THE numerical test. Values near 10^9 with a spread of a few
        // units. The naive formula subtracts two numbers agreeing to
        // about 15 digits and returns something wildly wrong, often
        // negative. Welford gives exactly 22.5.
        name: "large mean, small spread",
        input: [[1000000004, 1000000007, 1000000013, 1000000016]],
        expected: [1000000010, 22.5],
      },
      {
        name: "all identical — zero variance",
        input: [[10, 10, 10]],
        expected: [10, 0],
      },
      {
        name: "two values",
        input: [[1, 3]],
        expected: [2, 1],
      },
      { name: "single sample", input: [[5]], expected: [5, 0], hidden: true },
      { name: "empty", input: [[]], expected: [0, 0], hidden: true },
      {
        name: "zeros and fours",
        input: [[0, 0, 4, 4]],
        expected: [2, 4],
        hidden: true,
      },
    ],
    hints: [
      "Keep three values: `n` (count so far), `mean`, and `m2` (the running sum of squared deviations from the current mean). All start at 0.",
      "For each sample: increment `n`, compute `delta = x - mean`, then `mean += delta / n`. Now compute `m2 += delta * (x - mean)` — note that this uses the mean you just UPDATED, while `delta` used the old one. That asymmetry is what makes it stable.",
      "Population variance is `m2 / n`. Do not be tempted to accumulate a sum of squares and subtract at the end — that is the naive formula, and it is exactly what the large-mean test is there to reject.",
    ],
    solution: `function runningStats(samples) {
let n = 0;
let mean = 0;
let m2 = 0;      // running sum of squared deviations from the mean

for (const x of samples) {
  n++;
  const delta = x - mean;        // deviation from the OLD mean
  mean += delta / n;             // update the mean...
  m2 += delta * (x - mean);      // ...and use the NEW mean here.
  // Multiplying the old deviation by the new one is what keeps this
  // stable: the two large, nearly-equal quantities that the naive
  // formula subtracts are never formed at all.
}

if (n === 0) return [0, 0];
return [mean, m2 / n];
}`,
    complexityGate: {
      target: "O(n)",
      // Samples sit near 10^9 with a small spread — the shape that breaks
      // the naive formula — so the gate runs on the same data the
      // correctness tests care about. One pass, so this is comfortably
      // linear; the gate here mainly rejects a solution that sorts or
      // rescans to compute the mean before the variance.
      gen: "(n) => [Array.from({ length: n }, (_, i) => 1000000000 + ((i * 37) % 101))]",
      sizes: [8000, 16000, 32000, 64000],
    },
  },
  insights: [
    {
      t: "Welford for variance, always",
      d: "Same complexity as the naive formula and numerically stable. The naive `E[x²] − (E[x])²` subtracts two large nearly-equal numbers and returns wrong or negative variances whenever the mean is far from zero.",
    },
    {
      t: "EMA is O(1) memory and has no window at all",
      d: "`ema = α·x + (1−α)·ema` keeps no history, so old samples fade instead of dropping off a cliff. The cost is that there is no exact window — wrong when the boundary is contractual, right when it was only a smoothing choice.",
    },
    {
      t: "t-digest gives accurate tail quantiles in fixed space",
      d: "Finer resolution at the extremes than in the middle, which is where p99 lives, and it merges across shards. Averaging per-server percentiles produces a number that corresponds to nothing.",
    },
    {
      t: "Beware the look-ahead bug",
      d: "If the baseline window includes the point being judged, an anomaly raises the very threshold it is tested against and suppresses itself. The baseline must use only data strictly before the point under test.",
    },
    {
      t: "Rolling min and max are not rolling sums",
      d: "A sum can subtract the leaving value; a minimum cannot, because the value leaving may have been the minimum and nothing tells you what is next. That needs a monotonic deque.",
    },
  ],
  pitfalls: [
    "Using `E[x²] − (E[x])²`. It matches the textbook definition, passes small tidy tests, and returns nonsense on real data with a large mean.",
    "Using the old mean rather than the updated one in Welford's `m2` term, which quietly computes the wrong quantity while still looking stable.",
    "Averaging percentiles across servers or time buckets. Percentiles are not additive; only the underlying histograms or sketches can be merged.",
    "Letting a rolling sum accumulate floating-point error over millions of updates without ever recomputing it from the window.",
  ],
  quiz: [
    {
      q: "Why use Welford's algorithm rather than `E[x²] − (E[x])²`?",
      options: [
        "It is faster",
        "The naive formula subtracts two large, nearly equal numbers, which loses catastrophic precision when the mean is far from zero — sometimes returning a negative variance",
        "It uses less memory",
        "It works on streams; the other does not",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Both are one pass with a handful of operations. The difference is entirely numerical: the naive version's error grows with the ratio of the mean to the standard deviation.",
      distractors: [
        "They have essentially identical operation counts. Speed is not what separates them.",
        "",
        "Both are O(1) memory — a couple of running accumulators each.",
        "Both work on streams. The naive formula can accumulate a sum and a sum of squares incrementally; it just gives a bad answer at the end.",
      ],
    },
    {
      q: "An EMA compared to a 60-sample rolling average:",
      options: [
        "Is exactly equivalent",
        "Uses O(1) memory and has no exact window — old samples fade rather than dropping out",
        "Is less accurate",
        "Requires storing the last 60 samples",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The EMA keeps one number and weights the past with a geometric decay. There is no boundary, which avoids the jump when a large value leaves a window and means 'the last 60 samples' is only approximate.",
      distractors: [
        "They differ in weighting: a rolling average weights all 60 equally and nothing beyond, while the EMA weights everything with decreasing influence forever.",
        "",
        "Neither is more accurate in general — they estimate different things. The EMA is arguably a better estimate of 'recent level' and a worse one of 'the mean of the last 60'.",
        "It stores nothing but the current value, which is the entire memory advantage.",
      ],
    },
    {
      q: "In Welford's update, `m2 += delta * (x - mean)`. Which mean is that?",
      options: [
        "The mean before the update",
        "The mean AFTER the update — `delta` used the old one, so the two terms use different means",
        "Either works",
        "The mean of all samples, known in advance",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The asymmetry is the algorithm. Multiplying the deviation from the old mean by the deviation from the new one is what makes the accumulation exact enough to avoid ever forming the large quantities the naive formula subtracts.",
      distractors: [
        "Using the old mean in both places computes a different and incorrect quantity — and it still looks stable, so the error is easy to miss.",
        "",
        "They give different answers, and only one of them is the variance.",
        "The final mean is not available while streaming, which is precisely the problem Welford solves.",
      ],
    },
    {
      q: "You need a rolling MAXIMUM over a 100-sample window. Why does the rolling-sum trick not work?",
      options: [
        "Maximum is not associative",
        "A sum can subtract the leaving value; a maximum cannot, because the value leaving may have been the maximum and nothing tells you the next one",
        "The window is too large",
        "It does work — track the maximum incrementally",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Sums are invertible, so removal is subtraction. Maximum has no inverse — once the largest value leaves, the new maximum could be any remaining element. A monotonic deque solves it in amortised O(1).",
      distractors: [
        "Maximum is perfectly associative. What it lacks is an inverse, which is the same distinction that separates Fenwick trees from segment trees.",
        "",
        "Size is irrelevant; the problem exists at a window of three.",
        "Tracking a running maximum works only if values never leave. Once the window slides, the incremental maximum is wrong and stays wrong.",
      ],
    },
    {
      q: "Each of ten servers reports its own p99 latency. The fleet p99 is:",
      options: [
        "The average of the ten",
        "Not computable from those numbers — you must merge the underlying histograms or sketches",
        "The maximum of the ten",
        "The median of the ten",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Percentiles are not additive. A server handling a hundred requests and one handling a million contribute completely differently to the fleet distribution, and a percentile discards the information needed to weight them. This is why Prometheus exports histogram buckets rather than computed percentiles.",
      distractors: [
        "Averaging percentiles is the most common version of this mistake and produces a number corresponding to nothing — it is not the p99 of anything.",
        "",
        "The maximum is an upper bound on the fleet p99 rather than the value, and it is dominated by whichever single server is worst.",
        "The median of ten percentiles is no more meaningful than their average.",
      ],
    },
    {
      q: "A metric anomaly detector never fires during a genuine incident. The most likely design bug is:",
      options: [
        "The threshold is too high",
        "Look-ahead: the baseline window includes the point being judged, so the anomaly raises the very threshold it is tested against",
        "The metric is not being collected",
        "The variance is negative",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A sustained incident contributes to its own baseline, so the mean and standard deviation move with it and it never looks unusual. Exactly the events you most want to catch are the ones that hide themselves. The baseline must use only data strictly before the point under test.",
      distractors: [
        "A plausible first guess, and it would suppress small anomalies while still catching large ones — whereas look-ahead suppresses sustained ones specifically, which is the described symptom.",
        "",
        "Then there would be no data to alert on at all, which is usually visible on the dashboard immediately.",
        "A negative variance from the naive formula would break the detector loudly and constantly, not selectively during incidents.",
      ],
    },
    {
      q: "Ten thousand series each need a smoothed recent average. Rolling window or EMA?",
      options: [
        "Rolling window — it is exact",
        "EMA: one number per series against a window buffer per series, and 'recent' was a smoothing choice rather than a contractual boundary",
        "Neither — store all samples",
        "Rolling window with a smaller window",
      ],
      answer: 1,
      difficulty: "judge",
      why: "At ten thousand series a thousand-sample window is ten million values held permanently, against ten thousand numbers for the EMA. Exactness only matters when the boundary means something — a billing period or a stated SLA interval — and 'smoothed recent average' says it does not.",
      distractors: [
        "Exact, and exactly about a boundary nobody specified, at a thousand times the memory.",
        "",
        "Storing everything is unbounded and answers a question that was not asked.",
        "Shrinking the window trades away the smoothing you wanted while still paying per-series buffers.",
      ],
    },
    {
      q: "Prices around ₹50,000 with a spread of a few rupees give a negative variance. What happened?",
      options: [
        "An integer overflow",
        "The naive formula: E[x²] ≈ 2.5 × 10⁹ and (E[x])² ≈ 2.5 × 10⁹ agree to about fifteen digits, so the subtraction leaves only rounding error",
        "The data is corrupt",
        "The sample size is too small",
      ],
      answer: 1,
      difficulty: "judge",
      why: "This is catastrophic cancellation, and a negative variance is its signature — a sum of squares cannot be negative, so the arithmetic is visibly reporting that nothing but rounding error survived. Welford never forms those two large quantities and returns the correct value.",
      distractors: [
        "Doubles do not overflow near 10⁹; they lose precision in the low digits, which is a different and subtler failure.",
        "",
        "The data is entirely ordinary. Blaming it is how this bug survives, because the values look perfectly reasonable.",
        "Small samples give noisy variances, never negative ones. A negative result points at the arithmetic rather than the statistics.",
      ],
    },
  ],
};

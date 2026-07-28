import type { Topic } from "../types.ts";

export const approximation: Topic = {
  id: "approximation",
  title: "Approximation & probabilistic trade-offs",
  tier: 5,
  week: 23,
  depth: "deep",
  summary: 'When "good enough, 100× cheaper" is the right engineering answer.',
  why: "Exactness is a requirement, not a default. Deciding it consciously is what separates design from habit.",
  learn: {
    intuition:
      "Most engineers treat exactness as free — the default you depart from only under duress. It is not free; it is simply a cost that was paid without anyone deciding to. Counting distinct users exactly means keeping every identifier. Answering membership exactly means storing every key. Finding the optimal packing means searching an exponential space. Each of those is a real bill, and for a great many questions nobody actually needed the exact answer: a dashboard showing 4.7 million monthly users is not improved by knowing it was 4,712,839, and a cache that occasionally does an unnecessary lookup has lost nothing at all. The discipline this topic asks for is to state the requirement rather than inherit it. Once you write down 'we need this within 2%' or 'a false positive costs one wasted disk read', the space of acceptable solutions widens enormously and often includes something using a thousandth of the memory. The second half of the discipline is that an approximation must come with a number. 'Roughly right' is not an engineering position; '2% relative error at 12 KB, versus exact at 4 GB' is, because somebody can disagree with it on the merits.",
    mechanics: [
      {
        heading: "Quantify both sides before choosing",
        body: "'1% false positives, 40× less memory' is a decision. 'Approximately correct' is not. Write down the error rate, the resource saving and the cost of being wrong, and the choice usually makes itself — or the numbers show the approximation is not worth it, which is an equally useful outcome.",
      },
      {
        heading: "Find out which direction the error can go",
        body: "One-sided error is enormously more useful than two-sided. A Bloom filter never gives a false negative, so 'not present' is certain and can safely skip an expensive lookup. A Count-Min sketch never under-counts, so 'below the threshold' is certain and it is safe for rate limiting. Establishing which direction is guaranteed tells you which decisions you may take on the estimate alone — and that is usually more valuable than the error rate itself.",
      },
      {
        heading: "Put the approximation in front of an exact check, not instead of one",
        body: "The safest shape is a cheap filter whose errors are absorbed by a correct fallback. A Bloom filter in front of a database costs a wasted query when it is wrong, and the query returns the right answer. Used as the final word, the same filter denies real users with no path to recovery. The question to ask is what happens on the error case, and if the answer is 'the user gets a wrong result', you need exactness or a different design.",
      },
      {
        heading: "Decompose, then approximate only the hard part",
        body: "NP-hard rarely means the whole problem is intractable. Two-dimensional nesting is NP-hard, but its one-dimensional projection is a knapsack you can solve exactly. Vehicle routing is intractable at city scale and exact within a cluster of eight stops. The productive move is to find the sub-problem that admits an exact answer, solve it properly, and apply a heuristic only to what is left — rather than approximating the whole thing because part of it was hard.",
      },
      {
        heading: "State the error where it will be read",
        body: "An approximation that is not documented at the point of use becomes an exact number in somebody's mind within a quarter. Label the dashboard 'approximate, ±2%', name the sketch in the field name, and put the error bound in the API response. This is not paperwork — the failure mode is that a number with a known 2% error gets used to reconcile a financial total, and the error is invisible until it matters.",
      },
    ],
    complexityDerivation:
      "The saving is usually not a change of complexity class at all, which is what makes this topic different from the rest of the curriculum. Exact distinct counting is O(n) time and O(d) space for d distinct values; HyperLogLog is also O(n) time but O(1) space, with the constant fixed by the accuracy you request rather than by the data. So the asymptotic improvement is in space, and it is a genuine one: memory that does not grow at all against memory that grows without bound. Concretely, a hundred million 16-byte identifiers in a hash set is comfortably over 1.6 GB once pointers and load factor are counted; the equivalent HyperLogLog is about 12 KB at 2% relative error — five orders of magnitude, for an error nobody reading a dashboard could act on differently. A Bloom filter is similar: roughly ten bits per item for 1% false positives and fifteen for 0.1%, against the full key plus overhead for an exact set. The relationship worth internalising is that the memory required grows with log(1/ε) as the error target ε shrinks, which means accuracy is cheap at first and expensive at the end — going from 10% to 1% error costs about as much as going from 1% to 0.1%. That curve is why 'how accurate do we actually need this' is the highest-leverage question in the design, and why demanding exactness costs disproportionately more than demanding 0.1%.",
    variants: [
      {
        name: "One-sided approximation as a gate",
        when: "A cheap filter in front of an expensive exact check.",
        delta:
          "Bloom filters and Count-Min sketches. The error costs work, never correctness, because a fallback resolves it.",
      },
      {
        name: "Bounded-error estimation",
        when: "The answer is a statistic nobody will act on precisely.",
        delta:
          "HyperLogLog for cardinality, t-digest for quantiles. Fixed memory, stated relative error, and — critically — mergeable across shards.",
      },
      {
        name: "Approximation algorithms with a proven ratio",
        when: "An NP-hard optimisation where you need a guarantee.",
        delta:
          "A 2-approximation promises a result within twice the optimum, always. Far stronger than a heuristic that is usually good, and worth the search when the cost of a bad answer is high.",
      },
      {
        name: "Sampling",
        when: "Totals and averages over a large stream.",
        delta:
          "Simple and unbiased for sums, and poor for distinct counts and tails — a rare item's presence becomes a coin flip, and samples from different shards cannot be combined into a cardinality.",
      },
    ],
    tradeoffs: [
      {
        vs: "The exact structure",
        pick: "Exact until memory or time is genuinely the constraint",
        because:
          "Exact answers need no error budget, no capacity planning, no documentation of their limits, and no argument in review. The approximation earns its place when the resource saving is large — orders of magnitude, not a factor of two — and the error is genuinely harmless. If you cannot state both numbers, you have not yet established that the trade is worth making.",
      },
      {
        vs: "Sampling",
        pick: "A sketch when results must be merged or the tail matters",
        because:
          "A 1% sample is trivial to implement and gives unbiased estimates of totals. It is bad at exactly two things, and both are common: distinct counts, because whether a rare item appears is chance, and combining across shards or time windows, because sampled cardinalities do not add. HyperLogLog sketches merge exactly by taking the per-register maximum, which is what makes 'monthly uniques' computable from daily sketches. That mergeability, rather than the memory, is usually the deciding property.",
      },
      {
        vs: "A heuristic with no guarantee",
        pick: "A proven approximation ratio when a bad answer is expensive",
        because:
          "A heuristic that is usually within a few percent has no worst case, and its worst case will eventually arrive on real input. A 2-approximation is provably never worse than twice the optimum, which lets you reason about the downside rather than hope. The heuristic is often better in the average case, so this is a genuine trade — pick the guarantee when the cost of the bad tail is what you are protecting against.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — position sizing under an intractable joint constraint",
      kind: "yours",
      problem:
        "Allocating capital across candidate positions with margin offsets between hedged legs is not a clean knapsack: an item's cost depends on which other items were chosen, so the exact problem is a subset search that grows exponentially with the candidate count.",
      applied:
        "Decompose rather than approximate wholesale. Shortlist candidates by an exact per-signal filter, which is cheap and precise, then solve the joint selection exactly over the small surviving set where the exponential is affordable. The approximation lives entirely in the shortlisting step, where its cost is a candidate never considered rather than a wrong allocation.",
      evidence: "strategy-engine/app/services/strike_selection_service.py",
      impact:
        "An intractable joint optimisation → exact within a bounded shortlist, with the approximation isolated to one step",
    },
    {
      system: "Bloom filters in storage engines",
      kind: "industry",
      problem:
        "A key lookup in an LSM-tree store could in principle read every file on disk, and most of those reads find nothing.",
      applied:
        "Each file carries an in-memory Bloom filter over its keys. 'Definitely not present' is certain, so most files are skipped with no read at all, and only 'maybe' costs a disk seek that then returns the correct answer. This is the canonical shape: a one-sided error in front of an exact check, where being wrong costs work rather than correctness.",
      impact: "A read per file per lookup → a read only where the key might actually be",
    },
    {
      system: "HyperLogLog for unique counts",
      kind: "industry",
      problem:
        "Reporting unique visitors per day, week and month over billions of events. Exact counting requires holding every identifier, and the monthly figure is not the sum of the daily ones.",
      applied:
        "One sketch per day at about 12 KB, at roughly 2% relative error. The monthly count is the merge of thirty sketches, which is exact as a merge even though each input is approximate. Nobody makes a different decision at 4,712,839 than at 4.7 million, so the error is genuinely free — and the mergeability is what sampling could not have provided.",
      impact: "Gigabytes per period → 12 KB per period, with correct cross-period merging",
    },
    {
      system: "Sheet-metal and cutting-stock nesting",
      kind: "industry",
      problem:
        "Packing arbitrary part outlines onto stock sheets with minimum waste is NP-hard, and a manufacturer needs an answer in seconds, not an optimum eventually.",
      applied:
        "Decompose. Replace each part with its convex hull or bounding rectangle so the geometry becomes tractable, solve the one-dimensional strip packing exactly where it applies, and use a heuristic only for the placement search that remains. The approximation is confined to the part that is genuinely hard, and the measurable objective — sheet utilisation — is reported so the heuristic can be judged.",
      impact: "An intractable exact search → seconds, with waste measured rather than assumed",
    },
  ],
  cases: [
    {
      id: "ap-offer-claim",
      scenario:
        "A promotion lets each user claim a reward exactly once. Traffic is high and the team proposes a Bloom filter over claimed user IDs, sized at 1% false positives, to avoid a database round trip on every request. What is your position in the design review?",
      options: [
        {
          label: "Approve — 1% is a small error and the saving is large",
          appeal:
            "The error rate is explicitly quantified and the round-trip saving is real at this traffic level.",
        },
        {
          label: "Approve only as a gate in front of the exact check, never as the final answer",
          appeal:
            "A false positive then costs one database query that returns the truth, and no user is ever wrongly refused.",
        },
        {
          label: "Reject the approximation entirely and use the database directly",
          appeal:
            "Correctness for something users are entitled to should not depend on a probabilistic structure at all.",
        },
        {
          label: "Use a Count-Min sketch instead, since it tracks counts rather than membership",
          appeal:
            "Claim limits are really a counting problem, and a sketch never under-counts.",
        },
      ],
      best: 1,
      verdict:
        "A Bloom filter's error is one-sided in exactly the useful direction: 'definitely not claimed' is certain, so the common case — a user who has not claimed — skips the database with no risk at all. The danger is only in treating 'maybe' as 'yes'. Keeping the exact check behind it means the 1% costs a query rather than a wrongly denied reward. Rejecting the filter outright gives up a large, safe saving; the Count-Min sketch over-counts, which would deny legitimate users in the same way.",
      claims: [
        {
          text: "You are accepting about 1% of requests doing an extra database lookup, in exchange for skipping it on the rest.",
          axis: "trade",
          correct: true,
          note: "The trade with both sides, and it is favourable: the cost of being wrong is work, not an incorrect outcome.",
        },
        {
          text: "You are accepting a structure that cannot support removing a claim, since Bloom filters do not delete.",
          axis: "trade",
          correct: true,
          note: "Correct and easy to miss. A reversed or refunded claim cannot be un-set, so the filter drifts toward over-reporting and needs periodic rebuilding.",
        },
        {
          text: "You are accepting that roughly 1% of eligible users will be refused the reward.",
          axis: "trade",
          correct: false,
          note: "Only true if the filter is the final answer. With the exact check behind it, nobody is refused — which is the entire point of the chosen option.",
        },
        {
          text: "If the exact check is later removed as an optimisation, 1% of eligible users are silently denied with no error logged.",
          axis: "failure",
          correct: true,
          note: "The realistic failure: the fallback looks redundant to somebody who does not know why it is there, and removing it produces no visible error.",
        },
        {
          text: "A false negative could let a user claim twice.",
          axis: "failure",
          correct: false,
          note: "Bloom filters have no false negatives. If the filter says 'not present', the user genuinely has not claimed — that certainty is what makes the design safe.",
        },
        {
          text: "The observed false-positive rate against the filter's design target, since a filter sized for fewer users saturates.",
          axis: "measure",
          correct: true,
          note: "Saturation is silent — the filter degrades to answering 'maybe' for everything, which is not an error, just a filter that has stopped filtering.",
        },
        {
          text: "Database query rate, to confirm the filter is actually removing the load it was added for.",
          axis: "measure",
          correct: true,
          note: "The benefit side. If query rate did not fall, the filter is pure cost and the decision should be revisited.",
        },
        {
          text: "The number of users wrongly denied the reward.",
          axis: "measure",
          correct: false,
          note: "In the chosen design this is structurally zero, because the exact check resolves every 'maybe'. Measuring it would monitor a failure the architecture prevents.",
        },
      ],
    },
    {
      id: "ap-uniques",
      scenario:
        "Product wants unique-visitor counts per day, per week and per month, across billions of events and dozens of shards. Finance separately wants a monthly active-user count for a revenue-share calculation with a partner. What do you build?",
      options: [
        {
          label: "HyperLogLog sketches for everything — one per day, merged for longer periods",
          appeal:
            "Fixed 12 KB per period, merges exactly across shards and time, and 2% error is invisible on a dashboard.",
        },
        {
          label: "Sketches for the product dashboard, and an exact pipeline for the finance number",
          appeal:
            "Each consumer gets the accuracy its decision actually requires, and the expensive exact path runs only where it is needed.",
        },
        {
          label: "An exact distinct-count pipeline for everything",
          appeal:
            "One implementation, no error to document, and no risk of the wrong number reaching finance.",
        },
        {
          label: "A 1% sample, scaled up",
          appeal:
            "Trivial to implement, and it gives unbiased estimates with very little storage.",
        },
      ],
      best: 1,
      verdict:
        "The two consumers have genuinely different requirements and should not be forced to share one. A 2% error is free on a dashboard and unacceptable in a contractual revenue split, where being wrong has a counterparty who will check. Using sketches for everything puts an approximate number into a financial calculation; using an exact pipeline for everything pays that cost for dashboards nobody would read differently. Sampling is the weakest option here — distinct counts are precisely what sampling estimates badly, and sampled cardinalities cannot be merged across shards at all.",
      claims: [
        {
          text: "You are accepting two pipelines to maintain, in exchange for matching accuracy to what each decision requires.",
          axis: "trade",
          correct: true,
          note: "The real cost of the right answer, stated. Two pipelines is more work, and forcing one on both consumers is worse.",
        },
        {
          text: "You are accepting roughly 2% error on the dashboard figures, which no product decision would turn on.",
          axis: "trade",
          correct: true,
          note: "The error named together with why it is harmless. That second half is what makes it a decision rather than a concession.",
        },
        {
          text: "You are accepting that the two numbers will sometimes disagree, and that this needs explaining before somebody files it as a bug.",
          axis: "trade",
          correct: true,
          note: "Genuinely important and routinely forgotten. Two numbers for 'monthly actives' differing by 2% will be reported as a data-quality incident unless it is documented up front.",
        },
        {
          text: "If the sketch-based figure is ever wired into the partner calculation, the 2% error becomes a contractual discrepancy nobody can see in the code.",
          axis: "failure",
          correct: true,
          note: "The failure mode this topic warns about: an approximate number loses its label and becomes an exact one in somebody's mind.",
        },
        {
          text: "HyperLogLog sketches cannot be merged across shards, so the dashboard totals will be wrong.",
          axis: "failure",
          correct: false,
          note: "Backwards. Exact mergeability by per-register maximum is the property that makes sketches the right choice here, and the one sampling lacks.",
        },
        {
          text: "The sketch estimate against the exact count for the same month, to confirm the error stays inside the stated bound.",
          axis: "measure",
          correct: true,
          note: "The exact pipeline already exists for finance, so this validation is nearly free — and it is what turns '2% error' from a claim into a verified property.",
        },
        {
          text: "Storage and compute cost of the exact pipeline, since it is the expensive one and only one consumer needs it.",
          axis: "measure",
          correct: true,
          note: "The cost being deliberately confined. If it grows, the scope of the exact path is the thing to revisit.",
        },
        {
          text: "The false-positive rate of the sketches.",
          axis: "measure",
          correct: false,
          note: "HyperLogLog estimates cardinality and has no notion of a false positive — that is a Bloom filter's error model. Different structure, different error.",
        },
      ],
    },
    {
      id: "ap-nesting",
      scenario:
        "A manufacturing tool must lay out arbitrary part outlines on stock sheets with minimum waste. The exact problem is NP-hard and the shop floor needs an answer within seconds of a job being queued. How do you approach it?",
      options: [
        {
          label: "Run an exact solver with a time limit and take the best answer found so far",
          appeal:
            "Optimal when it finishes, and it degrades gracefully by returning the best incumbent.",
        },
        {
          label: "Decompose — approximate the geometry, solve the tractable sub-problem exactly, and use a heuristic only for what remains",
          appeal:
            "Confines the approximation to the genuinely hard part and keeps an exact answer where one is available.",
        },
        {
          label: "Use a general-purpose heuristic over the whole problem",
          appeal:
            "Simple, fast, and it handles arbitrary geometry without any special-casing.",
        },
        {
          label: "Precompute layouts for the most common part combinations",
          appeal:
            "Instant answers for the common case, with no search at runtime at all.",
        },
      ],
      best: 1,
      verdict:
        "NP-hard describes the whole problem, not every part of it. Replacing outlines with convex hulls or bounding rectangles makes the geometry tractable; the resulting strip-packing sub-problem has exact solutions; and only the placement search genuinely needs a heuristic. A time-limited exact solver is a defensible alternative and gives an answer whose quality varies unpredictably with the job, which is awkward on a shop floor. A blanket heuristic gives up the exactness that was available for free in the sub-problem.",
      claims: [
        {
          text: "You are accepting some waste from using hulls instead of exact outlines, in exchange for a tractable geometry problem.",
          axis: "trade",
          correct: true,
          note: "The trade named precisely, including where the loss comes from — concave parts that could have interlocked will not.",
        },
        {
          text: "You are accepting that the result is not provably optimal, so it should be reported with a utilisation figure rather than presented as best possible.",
          axis: "trade",
          correct: true,
          note: "The reporting obligation that comes with any heuristic. A number nobody can check quietly becomes a guarantee.",
        },
        {
          text: "You are accepting that parts may overlap on the sheet.",
          axis: "trade",
          correct: false,
          note: "Hulls are supersets of their parts, so a non-overlapping hull layout guarantees non-overlapping parts. The approximation costs waste, never validity.",
        },
        {
          text: "Parts with deeply concave outlines lose the most to hulling, and a job made mostly of those will waste far more than the typical case.",
          axis: "failure",
          correct: true,
          note: "The realistic failure: the approximation's quality depends on part shape, so average utilisation hides a bad worst case.",
        },
        {
          text: "The heuristic may fail to produce any valid layout at all.",
          axis: "failure",
          correct: false,
          note: "A placement heuristic returns a valid layout or requests another sheet. Producing nothing is not among its failure modes.",
        },
        {
          text: "Sheet utilisation per job, and its distribution across part types rather than only its average.",
          axis: "measure",
          correct: true,
          note: "The objective, measured in a way that would surface the concave-parts weakness instead of averaging it away.",
        },
        {
          text: "Time to produce a layout, against the shop-floor requirement of seconds.",
          axis: "measure",
          correct: true,
          note: "The constraint that ruled out the exact solver. If the decomposed approach drifts past it, the decision needs revisiting.",
        },
        {
          text: "The optimality gap against the true optimum.",
          axis: "measure",
          correct: false,
          note: "Computing the true optimum is the NP-hard problem being avoided. A benchmark suite of known-optimal instances is a reasonable substitute; measuring it per job is not possible.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "Quantify both sides before choosing",
      d: '"1% false positives, 40× less memory" is a decision. "Approximately correct" is not — and if you cannot state both numbers, you have not established that the trade is worth making.',
    },
    {
      t: "One-sided error is often free",
      d: "A Bloom filter in front of a real store never returns a wrong answer overall — it only occasionally fails to save you a lookup. Establishing which direction the error runs tells you which decisions you may take on the estimate alone.",
    },
    {
      t: "NP-hard means decompose, then approximate the rest",
      d: "2D nesting is NP-hard, but its 1D projection is an exactly-solvable knapsack. Solve what you can exactly and confine the heuristic to the part that genuinely needs it.",
    },
    {
      t: "Accuracy is cheap at first and expensive at the end",
      d: "Memory grows with log(1/ε), so going from 10% to 1% error costs about as much as going from 1% to 0.1%. That curve is why 'how accurate does this need to be' is the highest-leverage question in the design.",
    },
    {
      t: "Label the error where it will be read",
      d: "An undocumented approximation becomes an exact number in somebody's mind within a quarter. Put the bound in the field name, the dashboard title and the API response, or it will eventually reconcile a financial total.",
    },
  ],
  pitfalls: [
    "Using an approximation as the final answer rather than as a gate in front of an exact check. The error stops costing work and starts costing correctness.",
    "Proposing an approximation without numbers. Without an error rate and a resource saving, there is nothing for a reviewer to agree or disagree with.",
    "Sampling to estimate distinct counts. Whether a rare item appears is chance, and sampled cardinalities cannot be merged across shards.",
    "Letting an approximate number lose its label as it flows downstream, until something contractual is computed from it.",
  ],
  quiz: [
    {
      q: "Putting a Bloom filter in front of a database lookup is safe because:",
      options: [
        "It is always correct",
        "Its only error is a false positive, which costs a wasted lookup — never a wrong answer",
        "It caches results",
        "False negatives are rare",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A false positive costs one unnecessary query, which then returns the truth. Since false negatives are impossible, nothing is ever incorrectly reported as absent.",
      distractors: [
        "It is wrong about 1% of the time by design. What makes it safe is the direction of the error and the exact check behind it, not the absence of error.",
        "",
        "It stores no values at all — only bits. There is nothing in it to return as a cached result.",
        "They are impossible, not rare, and that difference is the whole guarantee. 'Rare' would not let you skip the lookup safely.",
      ],
    },
    {
      q: "Which statement is an engineering position rather than a hand-wave?",
      options: [
        "The result is approximately correct",
        "2% relative error at 12 KB per period, against exact at roughly 4 GB",
        "It is good enough for our purposes",
        "The error is negligible",
      ],
      answer: 1,
      difficulty: "recall",
      why: "It states the error, the saving and the alternative, so somebody can disagree with it on the merits. The others cannot be evaluated, agreed with, or checked later.",
      distractors: [
        "No number, so no way to tell whether it meets a requirement nobody has written down either.",
        "",
        "Asserts the conclusion while skipping the argument — and 'our purposes' is exactly the thing that changes when the number flows downstream.",
        "Negligible compared with what? Without the magnitude and the consumer's tolerance, this is a preference stated as a fact.",
      ],
    },
    {
      q: "Why is a Count-Min sketch safe for 'is this above the rate limit' but not 'is this below it'?",
      options: [
        "It is faster in one direction",
        "It only ever over-counts, so an estimate below the threshold is definitely below it — but an estimate above it may be inflated by collisions",
        "It has two-sided error",
        "Rate limits require exact counts",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Collisions add other keys' increments and never remove them, so every estimate is an upper bound. That makes 'definitely below' trustworthy and 'above' merely probable, which is the right way round for not missing an abuser.",
      distractors: [
        "Speed is identical in both directions — it is the same lookup. The asymmetry is in what the answer guarantees.",
        "",
        "Its error is strictly one-sided, and that is precisely the property being exploited.",
        "They do not, which is why sketches are used for them at scale. What matters is knowing which direction the error can go.",
      ],
    },
    {
      q: "Memory for a given accuracy grows with log(1/ε). What follows practically?",
      options: [
        "Accuracy is essentially free",
        "Each additional factor of ten in accuracy costs roughly the same again, so the last decimal place is disproportionately expensive",
        "Exact answers cost only slightly more",
        "Error and memory are unrelated",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Going from 10% to 1% costs about as much as 1% to 0.1%. That is why 'how accurate does this actually need to be' has more leverage than any implementation choice, and why demanding exactness costs disproportionately more than demanding 0.1%.",
      distractors: [
        "It is cheap at the start and increasingly expensive after that — the curve is the whole point.",
        "",
        "Exact is a different regime entirely: memory grows with the data rather than with the accuracy target, which is unbounded rather than logarithmic.",
        "The relationship is exactly what the formula states, and it is what lets you size a structure from a requirement.",
      ],
    },
    {
      q: "A team proposes a Bloom filter as the sole check for 'has this user already claimed the offer'. Your review comment?",
      options: [
        "Approve — 1% error is small",
        "It must sit in front of an exact check, or roughly 1% of eligible users are silently denied with no path to recovery",
        "Reject — probabilistic structures have no place here",
        "Suggest a larger filter to reduce the error",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The structure is a gate, not an oracle. Its one-sided error is safe precisely because a fallback resolves the 'maybe'. Remove the fallback and the false positives become real users refused something they were entitled to, silently and unreproducibly.",
      distractors: [
        "1% of a large user base is a lot of wrongly denied people, and 'small' is doing an enormous amount of work in that sentence.",
        "",
        "Overcorrecting. Used correctly it is a large, entirely safe saving — rejecting it outright gives that up for no reason.",
        "A bigger filter reduces the rate and never reaches zero, so the same failure remains, just rarer and correspondingly harder to diagnose.",
      ],
    },
    {
      q: "Product wants unique counts for a dashboard; finance wants them for a partner revenue split. Best design?",
      options: [
        "Sketches for both — 2% is small",
        "Sketches for the dashboard, an exact pipeline for finance, and document why they differ",
        "Exact for both — one implementation is simpler",
        "Sampling for both",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Accuracy should match what each decision requires. A 2% error is invisible on a dashboard and unacceptable in a contract where a counterparty will check. The third obligation is documenting the discrepancy, or it gets filed as a data-quality bug.",
      distractors: [
        "Puts an approximate number into a contractual calculation, where being wrong has a counterparty and a consequence.",
        "",
        "Pays the exact cost for dashboards nobody would read differently at 2% error — defensible, and it spends real money for no decision change.",
        "The weakest option: sampling estimates distinct counts badly, and sampled cardinalities cannot be merged across shards at all.",
      ],
    },
    {
      q: "A problem is NP-hard. What is the productive first move?",
      options: [
        "Reach for a general-purpose heuristic over the whole problem",
        "Look for a sub-problem that admits an exact solution, solve that properly, and confine the heuristic to what remains",
        "Prove it is NP-hard first",
        "Use a solver with a time limit",
      ],
      answer: 1,
      difficulty: "judge",
      why: "NP-hard describes the whole problem, not every part of it. Two-dimensional nesting is intractable and its one-dimensional projection is a knapsack; routing is intractable city-wide and exact within a cluster of eight stops. Decomposing preserves exactness where it was available for free.",
      distractors: [
        "Gives up exactness on the parts that did not need approximating, and usually produces a worse answer than the decomposed version.",
        "",
        "Interesting and rarely actionable. Knowing it is hard does not tell you which part of it is hard, which is the useful question.",
        "A reasonable fallback that yields answers whose quality varies unpredictably per instance — awkward when a shop floor or a user is waiting.",
      ],
    },
    {
      q: "What is the most durable risk when shipping an approximate number?",
      options: [
        "The error rate drifts over time",
        "The number loses its label as it flows downstream and is eventually used where exactness was assumed",
        "The structure runs out of memory",
        "Users notice the imprecision",
      ],
      answer: 1,
      difficulty: "judge",
      why: "An undocumented approximation becomes an exact number in somebody's mind within a quarter. The fix is to put the bound where it will be read — in the field name, the dashboard title and the API response — because by the time it reaches a financial reconciliation nobody remembers it was an estimate.",
      distractors: [
        "A real concern with a real fix — monitor the observed rate against the design target — and it is a bounded, detectable problem.",
        "",
        "Sketches use fixed memory by construction, which is the property you selected them for.",
        "Almost never, because the error was chosen to be below what anyone would act on. The danger is a downstream consumer with different tolerances, not the original reader.",
      ],
    },
  ],
};

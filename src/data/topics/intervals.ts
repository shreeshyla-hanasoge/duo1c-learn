import type { Topic } from "../types.ts";

export const intervals: Topic = {
  id: "intervals",
  title: "Intervals & sweep line",
  tier: 1,
  week: 10,
  depth: "core",
  summary: "Merge, insert, meeting rooms, and the sweep-line pattern.",
  why: 'Calendars, rate limits, resource booking, seat allocation, and any "how many things overlap here" question. It is also one of the most common interview families, and the one where a single wrong comparison operator quietly changes the answer.',
  complexity: "O(n log n)",
  viz: ["intervals"],
  learn: {
    intuition:
      "Interval problems look like they need every pair compared — does this booking clash with that one? — which is quadratic. Sorting removes almost all of that work. Once the intervals are ordered by start time, a new interval can only possibly overlap the one that is currently open; everything earlier has already ended or been absorbed and can never come back. So one pass settles the whole thing. The second idea, the sweep line, is even more useful. Stop thinking about intervals as objects and think about their endpoints as events on a timeline: a start is '+1 thing is now active', an end is '−1 thing just finished'. Sort all the events by time and walk through them keeping a running count. That count is the number of things active at each moment, and its maximum answers 'how many meeting rooms do I need' without ever comparing two intervals directly.",
    mechanics: [
      {
        heading: "Sort by start time",
        body: "This is the step that does the real work. After it, the intervals arrive in the only order where 'can this overlap anything I have already finished with' has the answer no.",
      },
      {
        heading: "Merge: extend the open interval, or start a new one",
        body: "Keep the last merged interval. If the next one starts at or before its end, they overlap, so extend the end to the maximum of the two — the maximum matters, because the next interval can be entirely contained inside the current one. Otherwise the current one is finished and the new one becomes open.",
      },
      {
        heading: "Decide explicitly whether touching counts as overlapping",
        body: "Do `[1,3]` and `[3,5]` merge? With `<=` they do, with `<` they do not. Both are defensible and the requirement decides. For a meeting ending at 3 and another starting at 3 the answer is usually no; for integer ranges of seat numbers the answer is usually yes. Write the decision down.",
      },
      {
        heading: "Sweep line: turn intervals into signed events",
        body: "For each interval emit `(start, +1)` and `(end, −1)`. Sort every event by time and walk through, adding the sign to a running count. The count at any point is how many intervals cover it, and the maximum over the walk is the peak concurrency.",
      },
      {
        heading: "Fix the tie-break at equal timestamps",
        body: "When an end and a start share a timestamp, which comes first changes the answer by one. Process the end first and a room freed at 3 can be reused at 3. Process the start first and it cannot. This is the same touching question as before, in a different disguise.",
      },
    ],
    complexityDerivation:
      "Both patterns cost O(n log n), and it is worth being precise about where that comes from: the sort is the entire cost. Merging after sorting is a single pass with constant work per interval, so O(n). The sweep line creates 2n events, sorts them — O(n log n) — and then makes one pass. So in both cases the linear part is free and the sort dominates. Two consequences follow. First, if the intervals arrive already sorted, which is common when they come from a database with an index on start time, both algorithms drop to O(n) and you should not sort again. Second, the naive alternative is O(n^2): comparing every pair to find overlaps. For 10,000 bookings that is 50 million comparisons versus about 130,000 sort operations. Space is O(n) for the output, or O(1) extra if you merge in place. The sweep line uses O(n) for the events, which is the price of not comparing intervals at all.",
    variants: [
      {
        name: "Merge overlapping intervals",
        when: "Collapsing a list of ranges into the minimum set covering the same points.",
        delta:
          "Sort by start, extend or emit. The base case that everything else builds on.",
      },
      {
        name: "Insert one interval into a sorted list",
        when: "Adding a booking to an existing calendar.",
        delta:
          "No sort needed — the list is already ordered. Three phases: intervals entirely before, the overlapping run to merge, and intervals entirely after. O(n), or O(log n) to find the position plus the merge.",
      },
      {
        name: "Sweep line for maximum concurrency",
        when: "Meeting rooms, peak connections, maximum simultaneous downloads.",
        delta:
          "Signed events plus a running count. Never compares two intervals, which is what makes it generalise to thousands of overlapping ranges.",
      },
      {
        name: "Interval tree / segment tree",
        when: "Repeated 'what overlaps this range' queries against a changing set.",
        delta:
          "O(log n + k) per query instead of a full sweep. Worth it only when queries are repeated — a one-off question does not justify building the tree.",
      },
    ],
    tradeoffs: [
      {
        vs: "Comparing every pair",
        pick: "Sort and sweep, always, past a handful of intervals",
        because:
          "The pairwise version is O(n^2) and no simpler to write once you have seen the sorted version. The only situation favouring it is when you genuinely need every overlapping pair listed, which is inherently quadratic in the output.",
      },
      {
        vs: "A boolean array marking every occupied minute",
        pick: "Sweep line unless the timeline is small and dense",
        because:
          "Marking every unit is O(total span) and gets you O(1) queries, which is excellent for 'minutes in a day' — 1440 slots — and hopeless for microsecond timestamps over a year. The sweep line cost depends on the number of intervals, not the size of the timeline.",
      },
      {
        vs: "An interval tree",
        pick: "Sorting for one-off analysis, the tree for a query service",
        because:
          "Building an interval tree is O(n log n), the same as sorting, but the code is far longer. It pays off when you will ask many overlap questions against the same data, especially if the set is also being modified.",
      },
    ],
  },
  realWorld: [
    {
      system: "Calendar and meeting-room scheduling",
      kind: "industry",
      problem:
        "'Does this new meeting clash?' and 'how many rooms do we need at peak?' over thousands of events, recomputed as bookings change.",
      applied:
        "Overlap detection is a merge; peak demand is a sweep line over start and end events. The tie-break decision — whether a room freed at 3 can be booked at 3 — is a product rule that has to be settled before the code is written.",
      impact: "O(n^2) pairwise clash detection → O(n log n)",
    },
    {
      system: "IRCTC-style seat and berth allocation",
      kind: "industry",
      problem:
        "A passenger occupies a berth for a range of stations, not the whole journey, so the same berth can be sold several times along a route. Availability at any station is a concurrency question.",
      applied:
        "Each booking is an interval over the station sequence. A sweep line gives the occupancy at every station in one pass, and the maximum over a requested segment decides whether another booking fits.",
      impact: "Availability per segment in one pass instead of per-pair checks",
    },
    {
      system: "Computational geometry and rendering",
      kind: "industry",
      problem:
        "Finding which of thousands of line segments or rectangles intersect, where checking all pairs is prohibitive.",
      applied:
        "The Bentley-Ottmann sweep line moves a conceptual vertical line across the plane, maintaining only the segments it currently crosses. Two segments can only intersect if they are adjacent in that active set, which removes almost every pair from consideration.",
      evidence: "Bentley & Ottmann, 1979",
      impact: "O(n^2) pair testing → O((n + k) log n)",
    },
    {
      system: "traed — trading sessions, expiries and position windows",
      kind: "yours",
      problem:
        "Deciding whether a strategy window overlaps a market session, an expiry, or an existing position's holding period — and how many positions are open simultaneously for risk limits.",
      applied:
        "Sessions and holding periods are intervals; concurrent exposure is a sweep line over entry and exit events. Peak concurrency is exactly the number that a position limit must be checked against.",
      impact: "Pairwise overlap checks → one sorted pass",
    },
  ],
  lab: {
    prompt:
      "Merge all overlapping intervals and return the result sorted by start. Each interval is `[start, end]` with `start <= end`. Intervals that merely touch — `[1,3]` and `[3,5]` — DO count as overlapping here and must merge into `[1,5]`. The input is not sorted. Budget: O(n log n).",
    fnName: "mergeIntervals",
    signature: "mergeIntervals(intervals: number[][]): number[][]",
    starter: `function mergeIntervals(intervals) {
  // Budget: O(n log n) — the sort is the cost, the merge is one pass.
  // Sort by start, then extend the open interval or begin a new one.
  // Touching counts as overlapping: [1,3] and [3,5] become [1,5].

  return [];
}`,
    tests: [
      {
        name: "classic",
        input: [
          [
            [1, 3],
            [2, 6],
            [8, 10],
            [15, 18],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
          [15, 18],
        ],
      },
      {
        name: "touching intervals merge",
        input: [
          [
            [1, 3],
            [3, 5],
          ],
        ],
        expected: [[1, 5]],
      },
      {
        name: "input is not sorted",
        input: [
          [
            [8, 10],
            [1, 3],
            [2, 6],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
        ],
      },
      {
        // [1,10] swallows [2,3]. Setting the end to the NEW interval's end
        // rather than the maximum of the two gives [1,3] here.
        name: "one interval contains another",
        input: [
          [
            [1, 10],
            [2, 3],
          ],
        ],
        expected: [[1, 10]],
      },
      {
        name: "no overlaps at all",
        input: [
          [
            [1, 2],
            [4, 5],
          ],
        ],
        expected: [
          [1, 2],
          [4, 5],
        ],
      },
      {
        name: "empty input",
        input: [[]],
        expected: [],
        hidden: true,
      },
      {
        name: "single interval",
        input: [[[5, 7]]],
        expected: [[5, 7]],
        hidden: true,
      },
      {
        name: "everything collapses into one",
        input: [
          [
            [1, 4],
            [2, 5],
            [3, 6],
            [0, 1],
          ],
        ],
        expected: [[0, 6]],
        hidden: true,
      },
    ],
    hints: [
      "Sort a COPY by start time: `[...intervals].sort((a, b) => a[0] - b[0])`. Never rely on the default sort — it compares as strings.",
      "Walk the sorted list keeping the last interval you pushed into the output. If the next start is `<=` that interval's end, they overlap.",
      "When they overlap, set the end to `Math.max(lastEnd, nextEnd)` — NOT to `nextEnd`. Otherwise an interval fully contained inside the open one shrinks it.",
    ],
    solution: `function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];

  // Copy before sorting: mutating the caller's array is a rude surprise.
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [[...sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    const last = out[out.length - 1];

    if (start <= last[1]) {
      // Overlapping (or touching). MAX, not end: [2,3] inside [1,10]
      // must not drag the end back to 3.
      last[1] = Math.max(last[1], end);
    } else {
      out.push([start, end]);
    }
  }

  return out;
}`,
    complexityGate: {
      target: "O(n log n)",
      // Non-overlapping and shuffled, so the sort does its full work and
      // the output is as large as the input. A pairwise overlap check is
      // quadratic on exactly this shape.
      gen: "(n) => [Array.from({ length: n }, (_, i) => { const s = ((i * 7919) % n) * 10; return [s, s + 5]; })]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Sorting by start is the whole algorithm",
      d: "Once sorted, a new interval can only overlap the one currently open. Everything before it is permanently settled — that is what turns O(n^2) into one linear sweep.",
    },
    {
      t: "Sweep line: separate the endpoints into events",
      d: 'For "maximum concurrent meetings", emit +1 at each start and −1 at each end, sort all the events, and scan. The running maximum is the answer, and no two intervals are ever compared.',
    },
    {
      t: "Decide whether touching counts as overlapping",
      d: "`[1,3]` and `[3,5]` merge under `<=` and stay separate under `<`. This is a requirements question, and getting it wrong is the most common interval bug because both versions look right.",
    },
    {
      t: "Extend to the MAXIMUM end, not the new end",
      d: "An interval completely inside the open one would otherwise shrink it. `[1,10]` followed by `[2,3]` becomes `[1,3]` if you assign instead of taking the maximum.",
    },
    {
      t: "If the input is already sorted, do not sort it again",
      d: "Data from an index on start time arrives ordered. The merge itself is O(n), so skipping the sort removes the entire cost of the algorithm.",
    },
  ],
  pitfalls: [
    "Using the default sort on numeric pairs. JavaScript compares as strings, so `[10, ...]` sorts before `[9, ...]`.",
    "Assigning `last[1] = end` instead of `Math.max(last[1], end)`. Contained intervals silently truncate the merged range.",
    "Sorting the caller's array in place. `sort` mutates, and the caller rarely expects their input to be reordered.",
    "Leaving the equal-timestamp tie-break undecided in a sweep line. Whether an end is processed before a start changes peak concurrency by one.",
  ],
  quiz: [
    {
      q: "Why sort intervals by start time before merging?",
      options: [
        "To make the output ordered",
        "So that each interval can only overlap the currently open one, making a single linear sweep sufficient",
        "Because merging requires sorted input by definition",
        "To remove duplicates",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Sortedness bounds what a new interval can interact with. Without it you would have to compare against every merged interval so far, which is quadratic.",
      distractors: [
        "A pleasant side effect, and not the reason. You could sort the output at the end if that were all you wanted.",
        "",
        "Nothing about the definition requires it — merging is defined on a set. Sorting is the implementation strategy.",
        "Duplicates merge naturally as a special case of overlapping and need no separate handling.",
      ],
    },
    {
      q: "To find the maximum number of simultaneously occupied meeting rooms:",
      options: [
        "Merge all intervals and count them",
        "Emit +1 at each start and −1 at each end, sort the events, and track the running maximum",
        "Sort by duration and take the longest",
        "Count the intervals that overlap the first one",
      ],
      answer: 1,
      difficulty: "apply",
      why: "That is the sweep line. The running sum is the concurrency at each moment, and its maximum is the room count.",
      distractors: [
        "Merging tells you which periods are busy, not how many things are happening at once. Ten overlapping meetings merge into one interval.",
        "",
        "Duration is unrelated to concurrency. One long meeting alone needs one room.",
        "Only counts overlaps with one arbitrary interval, and the peak may be somewhere else entirely.",
      ],
    },
    {
      q: "Merging `[[1,10],[2,3]]` gives `[[1,3]]` in your code. What is wrong?",
      options: [
        "The sort is wrong",
        "You assigned the new end instead of taking the maximum of the two ends",
        "Touching should not count as overlapping",
        "The input is invalid",
      ],
      answer: 1,
      difficulty: "apply",
      why: "`[2,3]` is entirely inside `[1,10]`, so the merged end must stay 10. Assigning `last[1] = end` drags it back to 3. `Math.max` is the fix and this is the most common merge bug after the sort.",
      distractors: [
        "The sort is fine — 1 comes before 2 either way.",
        "",
        "These intervals genuinely overlap, so the touching rule does not apply.",
        "`[2,3]` is a perfectly valid interval, and a contained interval is a normal case that must be handled.",
      ],
    },
    {
      q: "A meeting ends at 3pm and another starts at 3pm. Do you need two rooms?",
      options: [
        "Yes, always",
        "It depends on the tie-break rule you choose, and that rule is a requirement, not an implementation detail",
        "No, never",
        "Only if they are in the same building",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Processing the end event before the start at an equal timestamp frees the room in time; processing the start first does not. Both produce defensible answers, differing by one. The bug is failing to decide, not picking the wrong one.",
      distractors: [
        "Only if your tie-break processes starts first — which is a choice you make, not a fact.",
        "",
        "Only if ends are processed first. Stated as an absolute, it is the same mistake in the other direction.",
        "Not what the question is about — this is a modelling decision about the timeline.",
      ],
    },
    {
      q: "Your intervals arrive from a database query with `ORDER BY start_time`. What changes?",
      options: [
        "Nothing",
        "Skip the sort — the merge alone is O(n), so the whole algorithm becomes linear",
        "You still need to sort to be safe",
        "You should sort by end time instead",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The sort is the entire cost of the algorithm; the merge is one pass. Data arriving ordered from an index means you can skip it — but write down the assumption, because a later change to the query is what silently breaks it.",
      distractors: [
        "It removes the dominant term. That is not nothing.",
        "",
        "Defensive and it re-adds the only expensive step. If the ordering is guaranteed, rely on it and document it.",
        "Sorting by end is what you do for the activity-selection greedy problem, which is a different question.",
      ],
    },
    {
      q: "Timeline of a single day in minutes (1440 slots), thousands of bookings. Sweep line or a boolean array?",
      options: [
        "Sweep line, always",
        "The array — the timeline is small and dense, so marking every minute is O(span) with O(1) queries",
        "Neither",
        "An interval tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "With only 1440 slots, a difference array over minutes is simpler and gives instant queries at any point. The sweep line wins when the timeline is huge or sparse — microsecond timestamps over a year — because its cost depends on the number of intervals rather than the span.",
      distractors: [
        "A good default that is not the best fit when the timeline is tiny and fixed.",
        "",
        "Both work. The question is which is better here.",
        "Considerable machinery for a problem a 1440-element array solves.",
      ],
    },
    {
      q: "You must list every PAIR of overlapping bookings, not just the merged ranges. Can this be O(n log n)?",
      options: [
        "Yes, with a sweep line",
        "No — the output itself can be quadratic, so no algorithm can beat O(n^2) in the worst case",
        "Yes, by sorting",
        "Only with an interval tree",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If all n intervals overlap each other, there are n(n−1)/2 pairs to emit, and simply writing them out is quadratic. The right bound is O(n log n + k) where k is the number of pairs — output-sensitive, which is the best available.",
      distractors: [
        "A sweep line gets you O(n log n + k), which is optimal, and k itself can be quadratic.",
        "",
        "Sorting is O(n log n) and does not reduce how many pairs must be printed.",
        "Same limit applies — the tree cannot make the output smaller.",
      ],
    },
    {
      q: "What does the sweep line avoid doing that makes it scale?",
      options: [
        "Sorting",
        "Comparing intervals with each other — it only ever looks at one event and a running count",
        "Allocating memory",
        "Recursion",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Converting intervals into independent events removes the pairwise relationship entirely. The count carries all the state needed, so the work per event is constant no matter how many intervals are active at that moment.",
      distractors: [
        "It very much sorts — that is its dominant cost.",
        "",
        "It allocates 2n events, so slightly more than merging in place.",
        "Neither approach is recursive, so there is nothing to avoid.",
      ],
    },
  ],
};

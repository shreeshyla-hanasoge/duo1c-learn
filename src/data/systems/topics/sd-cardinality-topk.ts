import type { Topic } from "../../types.ts";

export const sdCardinalityTopk: Topic = {
  id: "sd-cardinality-topk",
  title: "Counting at scale: HyperLogLog and count-min sketch",
  tier: 6,
  week: 11,
  depth: "deep",
  summary:
    "Count distinct items in 12 KB, find the most frequent ones in a fixed-size table, with a known error. Learn HyperLogLog, count-min, top-K, and when exact wins.",
  why: "Counting looks easy until the stream is huge. Exact distinct counts need memory in proportion to the number of distinct items, and exact frequency tables need one entry per key. Sketches replace that with a fixed small table and an error you can state in advance, and they merge across servers. They sit inside Redis, BigQuery and Spark, so you will meet them in real systems. Traed counts nothing at that scale, so knowing when exact counting is still the right answer is part of the skill.",
  learn: {
    intuition:
      "Imagine asking a crowd to flip a coin each until it lands tails, and you hear only the longest run of heads. If the best run is 3, the crowd is small, perhaps eight people. If someone flipped 20 heads in a row, the crowd must be around a million. You never counted anyone and never remembered a name, yet the longest streak hints at the crowd's size. One streak is a noisy hint, so you split the crowd into many groups and average their streaks. That is the idea behind counting distinct items. For frequent items, picture a tally board with a few rows of boxes. Each name adds a tally to one box in every row. A rare name may share a box with a popular one and look bigger than it is, but the smallest of its boxes is the least wrong. Both tricks give up exactness for a tiny, fixed amount of memory.",
    mechanics: [
      {
        heading: "HyperLogLog: counting distinct items in kilobytes",
        body: "Hash every item to 64 bits. Use the first p bits to pick one of m = 2 to the power p registers. In the remaining bits, count the leading zeros and add 1. Each register keeps the largest such value it has seen. The estimate is a harmonic mean over registers, scaled by a constant, so that a few unlucky registers do not dominate. With p = 14 there are 16,384 registers of about 6 bits each, so the whole sketch is 12 KB, whether it has seen a thousand or a billion distinct items. The standard error is about 1.04 divided by the square root of m, which is 0.81 percent. Adding the same item twice changes nothing, so duplicates are harmless.",
      },
      {
        heading: "Merging sketches and what they cannot do",
        body: "Two HyperLogLog sketches built with the same hash and the same p merge by taking the larger value in each pair of registers. The result is exactly the sketch you would have built from both streams. So each server sketches its own traffic, and a central job merges them. A daily sketch can be merged over seven days to give a weekly distinct count, with no raw data kept. Redis exposes this as PFADD, PFCOUNT and PFMERGE. The limits matter too. You cannot list members, cannot remove an item, and cannot get an exact intersection, because subtracting two estimates multiplies their errors. Small sets are handled by a correction, since the plain formula is biased at low counts.",
      },
      {
        heading: "Count-min sketch: how often did this key appear?",
        body: "A count-min sketch is a table of d rows and w columns of counters, with one hash function per row. To record an item, add 1 to one counter in each row, chosen by that row's hash. To estimate a count, read the same d counters and take the smallest. Collisions only add, so the estimate is never below the truth. For error ε and failure chance δ, use w = e/ε columns and d = ln(1/δ) rows. With ε = 0.001 and δ = 1 percent, that is 2,719 columns and 5 rows, about 54 KB. Over 100 million events, the overcount is at most 100,000 with 99 percent probability. That is useful for big counts and useless for rare keys.",
      },
      {
        heading: "Top-K: heavy hitters without a full table",
        body: "A count-min sketch gives counts but does not remember which keys exist. For top-K, keep a small min-heap of the K best candidates beside the sketch. On each event, update the sketch, estimate that key's count, and if it beats the heap's smallest, insert it. Memory is the sketch plus K entries. The Space-Saving and Misra-Gries algorithms avoid the sketch: they keep m counters directly, and when a new key arrives with no free counter, it takes over the smallest one. With m = 1,000 counters over 10 million events, any key seen more than 10,000 times is certain to be tracked. Both find heavy hitters, not the long tail.",
      },
      {
        heading: "In Traed's terms",
        body: "We do not use sketches, because we have no counting problem that needs them. We have one daily user, so a distinct-user count would always be one. Counting trades, orders, candles or instruments is a plain SQL count over MySQL tables, and exact answers are better because they feed money reports. Sketches would become relevant if Traed grew into a multi-user product and wanted unique visitors on a public site, or a tally of the most watched symbols across thousands of live connections. Even then, anything that touches profit, loss or order counts should stay exact.",
      },
    ],
    complexityDerivation:
      "For HyperLogLog the argument is probabilistic. A random hash starts with k zeros with probability one in 2 to the power k, so seeing a run of k zeros suggests about 2 to the power k items. One register is a wild estimator, because its value moves in powers of two. Splitting items across m registers and combining them with a harmonic mean shrinks the error as one over the square root of m. A register stores a run length of at most 64, so it needs only 6 bits, which is why memory grows with the logarithm of the logarithm of the count. For count-min the argument is about collisions. In one row, the expected extra count on a key from other keys is the total events N divided by w. By Markov's inequality, the chance that it exceeds e times that is at most 1 over e. All d rows must fail together, so the chance is e to the power minus d, which is at most δ. The guarantee is relative to N, not to the key, so small counts drown in the noise. It also assumes good hashes, and neither sketch supports deletion.",
    variants: [
      {
        name: "HyperLogLog and HyperLogLog++",
        when: "You need the number of distinct users, devices or queries, and an error of about one or two percent is acceptable.",
        delta:
          "Fixed memory, mergeable by register maximum. The plus version adds bias correction and a sparse form that is exact at small counts, as used in BigQuery.",
      },
      {
        name: "Count-min sketch",
        when: "You need an approximate count for any key, or the heavy hitters, from a stream too large to tabulate.",
        delta:
          "Fixed table, never undercounts, mergeable by adding tables. Error is relative to the total number of events, so it suits large counts only.",
      },
      {
        name: "Space-Saving and Misra-Gries counters",
        when: "You only want the top K keys and their counts, and want a deterministic error bound.",
        delta:
          "Keeps K or m real keys with counters. Any key above a known fraction of the stream is guaranteed to appear. It cannot answer for an arbitrary key, unlike count-min.",
      },
    ],
    tradeoffs: [
      {
        vs: "An exact set or table versus a sketch",
        pick: "Exact when the count is small or must be audited, a sketch when it is huge and one percent is fine",
        because:
          "A hash set of 100,000 ids is a few megabytes, so a sketch saves nothing and adds error. At a billion distinct ids, exactness costs gigabytes per counter, and 12 KB with 0.8 percent error wins.",
      },
      {
        vs: "Count-min with a heap versus Space-Saving for top-K",
        pick: "Space-Saving to list the top K, count-min when you must also ask about any key or merge windows",
        because:
          "Space-Saving holds real keys and gives a clean guarantee for the top. Count-min answers for any key and merges by addition, but it needs a heap beside it to know which keys to ask about.",
      },
      {
        vs: "One central sketch versus a sketch per server, merged",
        pick: "A sketch per server, merged on a schedule",
        because:
          "Merging is lossless for both HyperLogLog and count-min, so nothing is gained by sending every event to one place. Each server stays local and only the small sketches travel.",
      },
    ],
  },
  algorithms: [
    {
      name: "HyperLogLog",
      role: "Estimates the number of distinct items from the longest run of leading zeros in each register, in a fixed 12 KB.",
      dsa: "probabilistic",
    },
    {
      name: "Count-min sketch",
      role: "Estimates how often any key appeared from a small table of counters, never below the truth.",
      dsa: "probabilistic",
    },
    {
      name: "Min-heap of candidates",
      role: "Keeps the K best keys seen so far beside a sketch, so the top-K list can be read at any time.",
      dsa: "heaps",
    },
    {
      name: "Space-Saving counters",
      role: "Track the top K keys directly by letting a new key take over the smallest counter, with a guaranteed error bound.",
    },
  ],
  realWorld: [
    {
      system: "Redis HyperLogLog",
      kind: "industry",
      problem:
        "Counting unique visitors per page with a set of ids needs memory in proportion to the number of visitors, for every page.",
      applied:
        "Redis offers PFADD, PFCOUNT and PFMERGE. A key uses at most about 12 KB however many items it has seen, with a standard error of 0.81 percent. PFMERGE gives the union of several counters.",
      evidence: "Redis documentation: HyperLogLog (PFADD, PFCOUNT, PFMERGE)",
      impact:
        "A unique-visitor counter per page or per day costs kilobytes, not megabytes, and daily counters combine into weekly ones.",
    },
    {
      system: "Google BigQuery approximate aggregates",
      kind: "industry",
      problem:
        "A distinct count over billions of rows is slow and memory-hungry if done exactly across many machines.",
      applied:
        "BigQuery offers APPROX_COUNT_DISTINCT and a family of HyperLogLog++ functions that build, merge and read sketches. The HyperLogLog++ paper from Google describes the bias correction and the sparse form used for small counts.",
      evidence: "Heule, Nunkesser and Hall, HyperLogLog in Practice (EDBT 2013); BigQuery documentation on HLL++ functions",
      impact:
        "Each machine builds a small sketch and the sketches merge, so a distinct count over a huge table needs far less data movement.",
    },
    {
      system: "Apache Spark approximate counting",
      kind: "industry",
      problem:
        "Data teams need distinct counts and frequency estimates over datasets that do not fit in one machine's memory.",
      applied:
        "Spark has approx_count_distinct, which takes a target relative error, and a count-min sketch builder in its DataFrame statistics functions. Partitions build partial sketches that are merged.",
      evidence: "Apache Spark documentation: approx_count_distinct and DataFrameStatFunctions.countMinSketch",
      impact:
        "The work spreads across partitions, and only small sketches are combined instead of full tables of keys.",
    },
    {
      system: "Apache DataSketches and Druid",
      kind: "industry",
      problem:
        "Analytics dashboards need unique counts and heavy hitters over many dimensions and time ranges, quickly.",
      applied:
        "The open-source DataSketches library, which came from Yahoo, provides HyperLogLog, frequent-items and other sketches. Apache Druid can store them as columns and merge them at query time, so a query over a week merges seven days of sketches.",
      evidence: "Apache DataSketches project documentation; Apache Druid documentation on sketch aggregators",
      impact:
        "Any time range is answered by merging small stored sketches, with no pass over the raw events.",
    },
  ],
  insights: [
    {
      t: "12 KB counts a billion",
      d: "HyperLogLog with 16,384 registers has a standard error near 0.8 percent and a size that does not grow with the data.",
    },
    {
      t: "Sketches merge",
      d: "Registers merge by maximum and count-min tables by addition. Sketch on each server, combine later, lose nothing.",
    },
    {
      t: "Count-min only overcounts",
      d: "Collisions add, so take the minimum across rows. The error is a fraction of all events, so rare keys are unreliable.",
    },
    {
      t: "Exact is still right when small",
      d: "A set of a few hundred thousand ids fits in megabytes. Use a sketch only when exact costs real memory, and never for audits.",
    },
  ],
  pitfalls: [
    "Using a sketch for a count that must be exact, such as orders, fills or money. The error is small, but it is never zero.",
    "Trusting a count-min estimate for a rare key. The error is a fraction of all events, so a key seen 800 times can read thousands.",
    "Merging sketches built with different hash functions or different precision. The registers or columns then mean different things and the result is wrong.",
  ],
  quiz: [
    {
      q: "What does a HyperLogLog sketch estimate?",
      options: [
        "The full list of unique items that the stream contained",
        "How many distinct items the stream contained",
        "Which items appeared most often in the stream",
        "Whether one given item appeared in the stream",
      ],
      answer: 1,
      difficulty: "recall",
      why: "HyperLogLog estimates cardinality, the number of distinct items. It keeps no items, so it cannot list them, rank them or test membership.",
      distractors: [
        "The sketch keeps only small registers, not the items, so it cannot return a list.",
        "",
        "Finding frequent items is the job of count-min or Space-Saving, not HyperLogLog.",
        "Testing membership is the job of a Bloom filter.",
      ],
    },
    {
      q: "A count-min sketch returns an estimate for a key. How does it relate to the true count?",
      options: [
        "It is exactly equal to the true count",
        "It is at most the true count",
        "It is equally likely to be above or below",
        "It is at least the true count",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Every collision adds to a counter, and nothing subtracts. The minimum over the rows is therefore never below the truth, only equal or higher.",
      distractors: [
        "Exactness would need a counter per key, which is what the sketch avoids.",
        "That would need counters to lose counts. Collisions only add.",
        "The error is one-sided. Both over and under would need subtraction.",
        "",
      ],
    },
    {
      q: "An IRCTC-style site keeps a HyperLogLog per page. Page A had 5 million distinct visitors, page B had 3 million, and 1 million visited both. What does merging the two give?",
      options: [
        "About 7 million, the union, within the sketch's error",
        "About 8 million, because merging adds the two counts",
        "About 1 million, because merging keeps shared visitors",
        "About 4 million, because merging averages the counts",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A merge gives the sketch of the union. Visitors to both pages count once, so 5 + 3 - 1 is 7 million, with the usual error of under 1 percent.",
      distractors: [
        "",
        "Adding counts would count the 1 million shared visitors twice. A merge removes the double count.",
        "Merging is a union, not an intersection. Intersections cannot be read from a plain merge.",
        "Averaging has no meaning for registers, which merge by taking the maximum.",
      ],
    },
    {
      q: "You want a count-min sketch with error ε = 0.01 of the total, failing at most 5 percent of the time. What size is right?",
      options: [
        "100 columns and 1 row",
        "3 columns and 272 rows",
        "272 columns and 3 rows",
        "1,000 columns and 20 rows",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Columns w = e / ε = 2.718 / 0.01, about 272. Rows d = ln(1 / 0.05), about 3. Width controls the error and depth controls the failure chance.",
      distractors: [
        "One row has no minimum to take, so the failure chance is not controlled.",
        "The numbers are swapped. Width sets the error and is the large one.",
        "",
        "That is larger than needed, so it fails the sizing test even though it would be accurate.",
      ],
    },
    {
      q: "A count-min sketch tuned to ε = 0.001 has seen 50 million events. A rarely traded symbol really appeared 800 times. What may the sketch report?",
      options: [
        "Exactly 800, since small counts are the most accurate",
        "Slightly under 800, since sketches lose a few counts",
        "800, because the sketch never overcounts",
        "Up to about 50,800, so it cannot be trusted for rare keys",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The overcount is bounded by ε times N, here 50,000, with high probability. For a key with 800 events that bound is far larger than the count itself.",
      distractors: [
        "The error does not shrink with the key's count. It depends on total events.",
        "A count-min sketch never undercounts. It can only overcount.",
        "It is the reverse. A count-min sketch can overcount but never undercounts.",
        "",
      ],
    },
    {
      q: "Two servers each keep a HyperLogLog with p = 14 and the same hash. How do you get the distinct count across both?",
      options: [
        "Take the larger value in each pair of registers, then estimate",
        "Add the two registers in each pair, then estimate",
        "Estimate each separately, then add the two numbers",
        "Average the two registers in each pair, then estimate",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Each register holds the largest zero-run seen. The union of two streams has the larger of the two in every register, so the maximum gives exactly the merged sketch.",
      distractors: [
        "",
        "Adding register values would inflate them and the estimate would be wrong.",
        "Adding two estimates counts visitors seen by both servers twice.",
        "Averaging lowers the maximum run and underestimates the union.",
      ],
    },
    {
      q: "A compliance report must state the exact number of distinct instruments traded on the day, and a regulator may audit it. About 900 instruments traded. Which approach is right?",
      options: [
        "HyperLogLog, because it is cheaper than counting",
        "Count-min sketch, because it never undercounts",
        "An exact count, since the set is tiny and an audit needs certainty",
        "A Bloom filter, because it avoids storing instrument names",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Nine hundred ids fit in a few kilobytes as an exact set, so a sketch saves nothing. An audit figure also cannot carry an error margin.",
      distractors: [
        "The saving is negligible at this size, and the answer would be off by up to about a percent.",
        "Count-min estimates frequencies, not distinct counts, and it can overcount.",
        "",
        "A Bloom filter tests membership and does not count items.",
      ],
    },
    {
      q: "A sale dashboard needs unique visitors per hour for 400 pages, with a rolling 7-day view, from ten web servers. What design fits?",
      options: [
        "Every server sends each visitor id to one central exact set",
        "A HyperLogLog per page per hour on each server, merged for any window",
        "A count-min sketch of visitor ids, read for each page",
        "A Bloom filter of visitor ids, counting its set bits",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Unique visitors is a distinct count, and merge-by-maximum lets small hourly sketches combine into any window across servers without moving raw ids.",
      distractors: [
        "Moving every id to one place needs memory and traffic that grow with the visitors.",
        "",
        "Count-min estimates frequencies of keys, not the number of distinct keys.",
        "Counting set bits of a Bloom filter gives a rough estimate, but with worse accuracy and without clean merge across windows.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-cardinality-topk-small-report",
      scenario:
        "A trading platform on one server has one daily user. A nightly report needs the number of distinct instruments the user's strategies traded that day, which is a few hundred, and the five most traded. All trades are rows in a MySQL table that already holds the data. The report feeds the user's own records for tax. Should the team add a sketch library?",
      options: [
        {
          label: "A HyperLogLog counter in Redis",
          appeal:
            "Tiny memory and a ready-made command, so the count costs almost nothing.",
        },
        {
          label: "A SQL query with a distinct count and a group-by over the day's rows",
          appeal:
            "Exact, uses data already there, and runs in well under a second on a few hundred rows.",
        },
        {
          label: "A count-min sketch with a heap of five",
          appeal:
            "Handles any stream size, so the report would never need rewriting.",
        },
        {
          label: "A Space-Saving structure with 1,000 counters",
          appeal:
            "Guarantees the top keys are present, whatever the volume.",
        },
      ],
      best: 1,
      verdict:
        "The data is a few hundred rows and the figures feed tax records, so exact is both cheap and required. A SQL aggregate reads the rows already stored. A sketch adds a dependency, a possible error and a second source of truth for no saving.",
      claims: [
        {
          text: "You accept that the query reads the day's trade rows each night, a cost that is trivial at this size.",
          axis: "trade",
          correct: true,
          note: "True. A few hundred rows cost almost nothing to scan, so the cheapest design is the exact one.",
        },
        {
          text: "You avoid adding a library and a second place where the numbers could disagree.",
          axis: "trade",
          correct: true,
          note: "True. One source of truth means the report always matches the stored trades.",
        },
        {
          text: "A HyperLogLog counter would be more accurate than a SQL count for a few hundred items.",
          axis: "trade",
          correct: false,
          note: "A sketch is never more accurate than an exact count. It only becomes worthwhile when exact costs too much.",
        },
        {
          text: "If the sketch were used, the reported figure could differ slightly from the true number, which is a problem for tax records.",
          axis: "failure",
          correct: true,
          note: "True. Even a tiny estimation error is unwanted where the figure must match the records.",
        },
        {
          text: "The SQL query will fail once the table reaches a few thousand rows.",
          axis: "failure",
          correct: false,
          note: "A few thousand rows is still trivial. A database handles millions of rows for this kind of aggregate.",
        },
        {
          text: "Check that the distinct count from the report equals a manual count of instruments in the trade list.",
          axis: "measure",
          correct: true,
          note: "True. An exact method can be verified exactly, which is one of its benefits.",
        },
        {
          text: "Measure the sketch's memory use to decide whether the report is correct.",
          axis: "measure",
          correct: false,
          note: "Memory use says nothing about correctness. A comparison with the trade list does.",
        },
      ],
    },
    {
      id: "sd-cardinality-topk-sale-dashboard",
      scenario:
        "During a festival sale a large e-commerce site runs 50 web servers. Tens of millions of product-view events arrive each minute. The operations team wants unique visitors per minute for the whole site and the top 20 most viewed products, refreshed every 10 seconds, on a dashboard. An exact set of visitor ids, in one place, would need tens of gigabytes and a heavy network flow. An error of about 1 percent on the dashboard is fine. What should they build?",
      options: [
        {
          label: "Send every event to a central SQL database and run exact queries",
          appeal:
            "Exact answers, and engineers already know SQL.",
        },
        {
          label: "A single Redis set holding every visitor id for each minute",
          appeal:
            "Exact, simple to use, and the set command does the deduplication.",
        },
        {
          label: "Each server keeps a HyperLogLog for visitors and a count-min sketch with a heap for products, and ships them every 10 seconds to be merged",
          appeal:
            "Fixed small memory per server, tiny network traffic, and lossless merge.",
        },
        {
          label: "Sample 1 percent of events and count only those",
          appeal:
            "Cuts the volume a hundredfold with almost no new structures.",
        },
      ],
      best: 2,
      verdict:
        "The volume makes exact counting expensive in memory and traffic, and the dashboard tolerates 1 percent error. Per-server sketches use kilobytes, merge exactly by maximum for visitors and by addition for product counts, and send small messages. Central SQL or one huge set moves every event to one place. Sampling distorts distinct counts, since a visitor missed in the sample is lost.",
      claims: [
        {
          text: "You accept an error of under about 1 percent on unique visitors, in return for kilobytes of memory and small messages.",
          axis: "trade",
          correct: true,
          note: "True. That is the trade, and the brief allows it.",
        },
        {
          text: "Merging sketches from the 50 servers loses no accuracy compared with building one sketch from all events.",
          axis: "trade",
          correct: true,
          note: "True. Register maximum and table addition give exactly the combined sketch.",
        },
        {
          text: "The merged count-min table gives exact view counts for the top 20 products.",
          axis: "trade",
          correct: false,
          note: "It gives estimates that never undercount. They are exact only by luck, and are close for products with very large counts.",
        },
        {
          text: "If one server stops sending its sketch, the site-wide counts will be low for that interval, so missing reports must be noticed.",
          axis: "failure",
          correct: true,
          note: "True. Merging hides a missing server unless the merge step counts the reports it received.",
        },
        {
          text: "A product with very few views could appear at the top of the list because of collisions.",
          axis: "failure",
          correct: false,
          note: "The top 20 have counts far above the noise level. A rare product cannot overtake them with an error bounded by a small fraction of total events.",
        },
        {
          text: "Compare the dashboard's visitor count with an exact count on a sampled hour offline, and check the error stays near 1 percent.",
          axis: "measure",
          correct: true,
          note: "True. An offline exact count on a short window checks the sketch against ground truth.",
        },
        {
          text: "The number of events processed per second shows whether the visitor count is accurate.",
          axis: "measure",
          correct: false,
          note: "Throughput shows load, not accuracy. Accuracy is checked against a known exact count.",
        },
      ],
    },
    {
      id: "sd-cardinality-topk-gateway-limits",
      scenario:
        "An API gateway process on one machine with 8 GB of memory serves about 2 million distinct client ids. Each minute it must find the clients that sent the most requests, to apply rate limits. An engineer proposes a count-min sketch plus heap to keep memory small. A plain map from client id to counter would take roughly a hundred megabytes. Requests are counted per minute and the map is cleared each minute. What should the team use?",
      options: [
        {
          label: "An exact in-memory map from client id to a counter",
          appeal:
            "Exact counts, simplest code, and the memory is a small share of the machine.",
        },
        {
          label: "A count-min sketch with a heap of 1,000 clients",
          appeal:
            "Fixed memory regardless of how many clients appear.",
        },
        {
          label: "A HyperLogLog of client ids",
          appeal:
            "Very small memory and a built-in way to deal with many clients.",
        },
        {
          label: "A Space-Saving structure with 100 counters",
          appeal:
            "Tracks the heaviest clients with a guaranteed bound.",
        },
      ],
      best: 0,
      verdict:
        "A hundred megabytes on an 8 GB machine is not a problem, so exactness is nearly free. A rate limit also acts on specific clients, so overcounting from a sketch could throttle an innocent client. HyperLogLog counts distinct clients and cannot rank them. Sketches earn their place when the exact table does not fit.",
      claims: [
        {
          text: "You pay about a hundred megabytes of memory and get exact counts for every client.",
          axis: "trade",
          correct: true,
          note: "True. The memory is small compared with the machine, and the counts are exact.",
        },
        {
          text: "A sketch would save memory the machine does not need to save.",
          axis: "trade",
          correct: true,
          note: "True. The saving is real but worthless here, while the error is a real cost.",
        },
        {
          text: "A count-min sketch is exact for the heaviest clients, so it removes the need for a map.",
          axis: "trade",
          correct: false,
          note: "It can only overcount, and the heaviest keys are close to exact only because their counts dwarf the error.",
        },
        {
          text: "With a sketch, an innocent client could be rate limited because collisions inflate its count.",
          axis: "failure",
          correct: true,
          note: "True. Overcounting is the sketch's one-sided error, and here it harms a real client.",
        },
        {
          text: "The exact map will run out of memory when the number of clients doubles to 4 million.",
          axis: "failure",
          correct: false,
          note: "It would grow to about 200 MB, still tiny. The map only becomes a problem at hundreds of millions of keys.",
        },
        {
          text: "Watch the map's size and the minute-end clearing time, and move to a sketch only if memory use approaches a real limit.",
          axis: "measure",
          correct: true,
          note: "True. Measure the exact design's cost before replacing it with an approximate one.",
        },
        {
          text: "The sketch's false-positive rate tells you how many clients are throttled wrongly.",
          axis: "measure",
          correct: false,
          note: "Count-min has no false-positive rate. Its error is an overcount bounded by a fraction of total requests.",
        },
      ],
    },
  ],
};

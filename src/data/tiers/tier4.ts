import type { Tier } from "../types.ts";
import { fenwick } from "../topics/fenwick.ts";
import { segmentTree } from "../topics/segment-tree.ts";
import { sparseTable } from "../topics/sparse-table.ts";
import { lru } from "../topics/lru.ts";
import { stringAlgos } from "../topics/string-algos.ts";
import { bitManipulation } from "../topics/bit-manipulation.ts";
import { matrixExponentiation } from "../topics/matrix-exponentiation.ts";
import { probabilistic } from "../topics/probabilistic.ts";
import { spatial } from "../topics/spatial.ts";
import { geometry } from "../topics/geometry.ts";
import { ringBuffers } from "../topics/ring-buffers.ts";
import { timeSeries } from "../topics/time-series.ts";
import { skipLists } from "../topics/skip-lists.ts";

export const tier4: Tier = {
  id: 4,
  name: "Advanced structures",
  tagline: 'Where "advanced DSA" actually lives.',
  topics: [
    fenwick,
    segmentTree,
    sparseTable,
    lru,
    stringAlgos,
    bitManipulation,
    matrixExponentiation,
    probabilistic,
    spatial,
    geometry,
    ringBuffers,
    timeSeries,
    skipLists,
  ],
  orientation: {
    overview:
      "This is where “advanced DSA” actually lives — and most of it is not competitive-programming exotica. It is the machinery inside the databases, caches, search engines and monitoring systems you already use every day. One idea runs through the whole tier: precomputation on a budget. You accept a structure that costs more to build and more to keep correct, because the query it makes cheap is the one your system runs a million times a day. Which is also why the right question here is never “is this structure clever” but “how many reads per write”.",
    stakes:
      "Below this tier you are choosing between algorithms. From here on you are choosing what to pay for up front — and that is the choice that shows up on an infrastructure bill.",
    recognise: [
      {
        signal: "“Sum or minimum over a range”, and the data keeps changing.",
        reach:
          "Fenwick tree if you only ever need sums — it is a fraction of the code. Segment tree if you need anything else.",
      },
      {
        signal: "Range queries, but the data never changes after it is built.",
        reach:
          "Sparse table. O(1) queries and far less machinery than a segment tree, because it never has to support an update.",
      },
      {
        signal: "“Evict the least recently used one”, in O(1).",
        reach:
          "A hash map for lookup plus a doubly linked list for order. Neither structure can do it alone — the pairing is the design.",
      },
      {
        signal:
          "“Roughly how many unique users”, at a scale where an exact count is too expensive to keep.",
        reach:
          "Probabilistic structures — Bloom filters, HyperLogLog. You trade a known, bounded error rate for an enormous memory saving.",
      },
      {
        signal: "“Which points are near this point”.",
        reach:
          "A spatial index. Comparing against every point is the O(n) baseline these structures exist to beat.",
      },
    ],
    arc: [
      {
        stage: "Range queries, three different budgets",
        topics: ["fenwick", "segment-tree", "sparse-table"],
        point:
          "The same question — “tell me about this range” — answered three ways, separated by how often the data changes. Start here: it is the clearest illustration of the precomputation trade in the whole course.",
      },
      {
        stage: "Structures that are really a policy",
        topics: ["lru", "ring-buffers", "skip-lists"],
        point:
          "Here the structure encodes a decision about what to keep and what to throw away. An LRU cache is not a container; it is an eviction policy that happens to need two containers to run.",
      },
      {
        stage: "Bits, strings and matrices",
        topics: ["bit-manipulation", "string-algos", "matrix-exponentiation"],
        point:
          "Three domains where a specialised representation beats a general one outright — and where knowing the trick is the difference between milliseconds and minutes.",
      },
      {
        stage: "Space, time, and being approximately right",
        topics: ["spatial", "geometry", "time-series", "probabilistic"],
        point:
          "The tier ends where exactness stops being worth its price. These four are the structures that give up a little accuracy, or a little generality, for orders of magnitude in return.",
      },
    ],
    outcomes: [
      "Choose between Fenwick, segment tree and sparse table from the read/write ratio alone.",
      "Design an O(1) cache with an eviction policy, and say why one structure cannot do it.",
      "Put a number on what a probabilistic structure costs you in accuracy before you adopt it.",
      "Recognise when precomputation is a false economy because writes outnumber reads.",
    ],
    inTheWild: [
      {
        system: "Database indexes",
        use: "Every index is this tier's bargain made explicit — slower writes, dramatically faster reads, chosen per query pattern.",
      },
      {
        system: "CDNs and application caches",
        use: "LRU and its variants decide what stays in memory. The policy, not the capacity, is what determines the hit rate.",
      },
      {
        system: "Analytics dashboards",
        use: "“Unique visitors today” across billions of events is a HyperLogLog estimate, not a count — exact would cost more than the answer is worth.",
      },
      {
        system: "Food delivery and cab apps",
        use: "“Restaurants near me” is a spatial index query. Scanning every restaurant in the city per request would not survive peak hour.",
      },
    ],
  },
};

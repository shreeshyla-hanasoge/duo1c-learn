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
};

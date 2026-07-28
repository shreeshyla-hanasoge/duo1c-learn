import type { Tier } from "../types.ts";
import { complexity } from "../topics/complexity.ts";
import { arrays } from "../topics/arrays.ts";
import { strings } from "../topics/strings.ts";
import { hashing } from "../topics/hashing.ts";
import { twoPointers } from "../topics/two-pointers.ts";
import { slidingWindow } from "../topics/sliding-window.ts";
import { prefixSums } from "../topics/prefix-sums.ts";
import { binarySearch } from "../topics/binary-search.ts";
import { sorting } from "../topics/sorting.ts";

export const tier0: Tier = {
  id: 0,
  name: "Foundations",
  tagline:
    "Non-negotiable. If you hesitate here, everything above it is shaky.",
  topics: [
    complexity,
    arrays,
    strings,
    hashing,
    twoPointers,
    slidingWindow,
    prefixSums,
    binarySearch,
    sorting,
  ],
};

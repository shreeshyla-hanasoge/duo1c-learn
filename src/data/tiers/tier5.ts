import type { Tier } from "../types.ts";
import { structureChoice } from "../topics/structure-choice.ts";
import { amortisedLatency } from "../topics/amortised-latency.ts";
import { approximation } from "../topics/approximation.ts";
import { stackComplexity } from "../topics/stack-complexity.ts";
import { concurrency } from "../topics/concurrency.ts";

export const tier5: Tier = {
  id: 5,
  name: "Judgment",
  tagline: "Not problems — the thing that makes you senior.",
  topics: [
    structureChoice,
    amortisedLatency,
    approximation,
    stackComplexity,
    concurrency,
  ],
};

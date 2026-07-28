import type { Tier } from "../types.ts";
import { dp1d } from "../topics/dp-1d.ts";
import { knapsack } from "../topics/knapsack.ts";
import { gridDp } from "../topics/grid-dp.ts";
import { stringDp } from "../topics/string-dp.ts";
import { lis } from "../topics/lis.ts";
import { intervalDp } from "../topics/interval-dp.ts";
import { bitmaskDp } from "../topics/bitmask-dp.ts";
import { treeDp } from "../topics/tree-dp.ts";
import { digitDp } from "../topics/digit-dp.ts";
import { stateMachineDp } from "../topics/state-machine-dp.ts";

export const tier3: Tier = {
  id: 3,
  name: "Dynamic programming",
  tagline: "Where most working engineers actually have a gap.",
  topics: [
    dp1d,
    knapsack,
    gridDp,
    stringDp,
    lis,
    intervalDp,
    bitmaskDp,
    treeDp,
    digitDp,
    stateMachineDp,
  ],
};

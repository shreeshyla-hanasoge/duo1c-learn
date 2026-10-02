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
  orientation: {
    overview:
      "Dynamic programming has a reputation problem. It is usually taught as a bag of unrelated tricks to be memorised, which is exactly why so many working engineers have a hole here. It is one procedure, not ten: find the smallest description of a situation that fully decides the answer — that is the state — write down how a state depends on smaller states, then stop recomputing what you have already worked out. Every topic in this tier is that same procedure applied to a differently-shaped state. Once you see that, the tier collapses from ten things to one thing with ten examples.",
    stakes:
      "This is where most working engineers genuinely have a gap, and it is the tier interviewers use to tell “has practised a lot” apart from “can actually think”.",
    recognise: [
      {
        signal: "“Count the number of ways”, or “the best over all choices”.",
        reach:
          "DP — but only if the choices overlap. If a locally best choice is always globally safe, it is greedy and DP is overkill.",
      },
      {
        signal:
          "You wrote the brute-force recursion and noticed it calls itself with the same arguments repeatedly.",
        reach:
          "Add memoisation. You already have a dynamic programme; the table version is just the same thing with the recursion unrolled.",
      },
      {
        signal: "“At most k of them”, “within a budget of C”, “no more than W kg”.",
        reach:
          "The budget joins the state. That is the knapsack family, and the budget is what makes the table two-dimensional.",
      },
      {
        signal: "Two sequences being compared position by position.",
        reach:
          "String DP on a 2-D table — edit distance, longest common subsequence, and everything shaped like them.",
      },
      {
        signal: "A suspiciously small bound, like n ≤ 20, plus “every subset”.",
        reach:
          "Bitmask DP. That tiny limit is not an accident — it is the problem setter telling you 2ⁿ is affordable here.",
      },
    ],
    arc: [
      {
        stage: "The procedure, on the simplest possible state",
        topics: ["dp-1d"],
        point:
          "One index is the entire state. Learn the four steps here — state, transition, base case, order of evaluation — because you will run those same four steps in every topic below.",
      },
      {
        stage: "When the state needs a second number",
        topics: ["knapsack", "grid-dp", "string-dp"],
        point:
          "A remaining budget, a position in a grid, a position in a second string. Different problems, one change: the table grows a dimension and the transition still reads the same.",
      },
      {
        stage: "When the obvious state is the wrong state",
        topics: ["lis"],
        point:
          "The turning point of the tier. The natural state gives O(n²); a different way of describing the same situation gives O(n log n). This is where DP stops being mechanical and starts being a modelling skill.",
      },
      {
        stage: "States that are not indices at all",
        topics: ["interval-dp", "bitmask-dp", "digit-dp"],
        point:
          "A range, a set of things already used, a position within a number's digits. The procedure does not change — only your answer to “what fully describes where I am”.",
      },
      {
        stage: "DP on top of another structure",
        topics: ["tree-dp", "state-machine-dp"],
        point:
          "Once the state can live on a tree node or in a machine's mode, DP stops being about arrays entirely. This is the form that shows up most often in real systems and least often in tutorials.",
      },
    ],
    outcomes: [
      "State the four parts of a DP — state, transition, base case, evaluation order — for a problem you have not seen before.",
      "Tell a DP problem apart from a greedy one, and defend the call.",
      "Convert a memoised recursion into a table, and cut its space when only the last row matters.",
      "Recognise when the natural state is too big, and re-describe the situation instead of optimising the code.",
    ],
    inTheWild: [
      {
        system: "Spell-check and “did you mean”",
        use: "Edit distance between what was typed and each candidate — the same 2-D table as longest common subsequence, run at typing speed.",
      },
      {
        system: "diff, and every code review tool built on it",
        use: "The red-and-green view of a changed file is a longest-common-subsequence DP over lines.",
      },
      {
        system: "Cart offers and “best combination of coupons”",
        use: "Fixed budget, overlapping choices, maximise value — the knapsack shape, hiding behind a checkout page.",
      },
    ],
  },
};

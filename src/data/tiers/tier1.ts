import type { Tier } from "../types.ts";
import { linkedLists } from "../topics/linked-lists.ts";
import { stacksQueues } from "../topics/stacks-queues.ts";
import { monotonicStack } from "../topics/monotonic-stack.ts";
import { monotonicDeque } from "../topics/monotonic-deque.ts";
import { heaps } from "../topics/heaps.ts";
import { recursionMemo } from "../topics/recursion-memo.ts";
import { backtracking } from "../topics/backtracking.ts";
import { binaryTrees } from "../topics/binary-trees.ts";
import { bst } from "../topics/bst.ts";
import { balancedTrees } from "../topics/balanced-trees.ts";
import { tries } from "../topics/tries.ts";
import { intervals } from "../topics/intervals.ts";

export const tier1: Tier = {
  id: 1,
  name: "Core structures",
  tagline:
    "The structures you reach for without thinking, once they are reflexive.",
  topics: [
    linkedLists,
    stacksQueues,
    monotonicStack,
    monotonicDeque,
    heaps,
    recursionMemo,
    backtracking,
    binaryTrees,
    bst,
    balancedTrees,
    tries,
    intervals,
  ],
};

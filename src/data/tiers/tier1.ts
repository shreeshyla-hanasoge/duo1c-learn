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
  orientation: {
    overview:
      "Tier 0 gave you three containers. This tier is what happens when you add one rule to a container and then refuse to ever break it. A stack is a list where you only touch one end. A heap is an array where every parent beats its children. A binary search tree is a tree where everything on the left is smaller. That rule is called an invariant, and the whole tier is a single bargain repeated twelve times: pay a small cost on every write to keep the invariant true, and collect a large saving on every read.",
    stakes:
      "These are the structures you are expected to reach for without stopping to think. Hesitation here is what makes the graph and DP tiers feel impossible later — they are written assuming this tier is reflex.",
    recognise: [
      {
        signal:
          "“Next greater”, “nearest smaller to the left”, “how many days until a warmer one”.",
        reach:
          "Monotonic stack. If the same question is asked over a fixed-size window instead, monotonic deque.",
      },
      {
        signal: "“Top k”, “the smallest so far”, “merge these sorted streams”.",
        reach:
          "A heap. You almost never need everything sorted — only the next one out, which is far cheaper to promise.",
      },
      {
        signal:
          "The same prefix, queried again and again — autocomplete, routing tables, dictionaries.",
        reach:
          "A trie. It turns a search across every word into a walk down one character at a time.",
      },
      {
        signal: "“Try every combination, but give up early when it cannot work”.",
        reach:
          "Backtracking. The pruning rule is the algorithm; without it you have written brute force with extra steps.",
      },
      {
        signal: "“These bookings overlap”, “merge these ranges”.",
        reach:
          "Intervals and sweep line: sort by one endpoint, then process starts and ends as events in order.",
      },
    ],
    arc: [
      {
        stage: "One end, then two",
        topics: ["linked-lists", "stacks-queues"],
        point:
          "The cheapest invariants there are — touch only the head, or only the two ends. Everything later in this tier is a stricter version of the same bargain.",
      },
      {
        stage: "Keep it ordered as you go",
        topics: ["monotonic-stack", "monotonic-deque"],
        point:
          "A stack that refuses to hold a smaller value behind a bigger one answers “next greater” for the whole array in one pass. This is the first invariant in the course that buys you an entire complexity class.",
      },
      {
        stage: "Order without paying for sorting",
        topics: ["heaps"],
        point:
          "A heap does not sort. It promises only that the extreme is on top — and that weaker promise is exactly why it costs O(log n) per write instead of O(n log n) up front.",
      },
      {
        stage: "Recursion as a structure, not a syntax",
        topics: ["recursion-memo", "backtracking"],
        point:
          "Memoisation is the seed of every dynamic programme in Tier 3, and pruning is the difference between exponential-but-usable and exponential-and-hopeless. Meet both here, while the state is still small enough to hold in your head.",
      },
      {
        stage: "Trees, and what keeps them honest",
        topics: ["binary-trees", "bst", "balanced-trees"],
        point:
          "A BST's O(log n) is a promise about shape, not about trees. Insert already-sorted data and it degenerates into a linked list — which is the exact failure that balancing exists to prevent.",
      },
      {
        stage: "Walking a range instead of scanning it",
        topics: ["tries", "intervals"],
        point:
          "Two structures that replace “compare against everything” with “walk in order” — one over characters, one over time.",
      },
    ],
    outcomes: [
      "Pick the right container for a described problem in one step, without cycling through the list.",
      "Explain what a structure's invariant is, and what breaks the moment it stops holding.",
      "Recognise the “next greater” shape in a problem that never uses those words.",
      "Say why a BST degenerates on sorted input, and what a balanced tree does about it.",
    ],
    inTheWild: [
      {
        system: "Undo/redo in any editor",
        use: "Two stacks, and nothing more. The invariant — most recent on top — is the entire feature.",
      },
      {
        system: "Ride-matching and food delivery dispatch",
        use: "“Nearest available driver” is a repeated top-k over a changing set. A heap keeps the next-best answer ready without ever sorting the fleet.",
      },
      {
        system: "IRCTC-style seat and slot booking",
        use: "Overlapping bookings against a fixed capacity is a sweep line over start and end events — the same shape as merging intervals.",
      },
    ],
  },
};

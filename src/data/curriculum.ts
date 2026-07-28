/**
 * The curriculum — a direct transcription of dsa-mastery-roadmap.md into
 * structured content. Tiers 0–5 are the topic list; `phases` is the 24-week
 * timeline. Every topic carries its own quiz bank so the game modes need no
 * separate content store.
 *
 * The tier bodies live one file each under `tiers/` — a single file holding
 * every topic at full depth would run past twenty thousand lines, which no
 * editor and no reviewer handles well. Shapes live in `types.ts` and are
 * re-exported here so every existing `from "../data/curriculum"` import keeps
 * working.
 */

export * from "./types.ts";
import type { Phase, Tier, Topic } from "./types.ts";
import { tier0 } from "./tiers/tier0.ts";
import { tier1 } from "./tiers/tier1.ts";
import { tier2 } from "./tiers/tier2.ts";
import { tier3 } from "./tiers/tier3.ts";
import { tier4 } from "./tiers/tier4.ts";
import { tier5 } from "./tiers/tier5.ts";

export const TIERS: Tier[] = [tier0, tier1, tier2, tier3, tier4, tier5];

/* ===================================================================== */

export const PHASES: Phase[] = [
  {
    id: 1,
    name: "Foundations & Reflexes",
    weeks: [1, 4],
    focus: [
      {
        week: 1,
        focus: "Complexity, arrays, hashing, prefix sums",
        deliverable:
          "Hand-analyse 10 existing functions for their true complexity",
      },
      {
        week: 2,
        focus: "Two pointers, sliding window",
        deliverable:
          "Rewrite a rolling-metric calculation as an O(n) sliding window",
      },
      {
        week: 3,
        focus: "Binary search, including on the answer",
        deliverable: "Implement 5 variants from scratch, no library calls",
      },
      {
        week: 4,
        focus: "Sorting internals, comparators, recursion",
        deliverable:
          "Hand-write merge + quick sort; benchmark against the built-in",
      },
    ],
    anchor:
      "SwimCoach — lap-time rolling stats (avg, best, variance) in a single pass.",
  },
  {
    id: 2,
    name: "Core Structures",
    weeks: [5, 8],
    focus: [
      {
        week: 5,
        focus: "Linked lists, stacks, queues, deques",
        deliverable: "Build a ring buffer from scratch",
      },
      {
        week: 6,
        focus: "Monotonic stack + monotonic deque",
        deliverable: "Sliding-window max in O(n); next-greater-element",
      },
      {
        week: 7,
        focus: "Heaps, top-K, two-heap median",
        deliverable: "Implement a binary heap by hand",
      },
      {
        week: 8,
        focus: "Backtracking + recursion patterns",
        deliverable: "Solve 8 backtracking problems unaided",
      },
    ],
    anchor:
      "Traed — replace repeated-scan indicator logic with a monotonic deque.",
  },
  {
    id: 3,
    name: "Trees & Graphs",
    weeks: [9, 12],
    focus: [
      {
        week: 9,
        focus: "Binary trees, iterative traversals, BST ops",
        deliverable: "Iterative in-order + post-order without hints",
      },
      {
        week: 10,
        focus: "Tries, intervals, sweep line",
        deliverable: "Build a trie powering a real autocomplete",
      },
      {
        week: 11,
        focus: "BFS/DFS, components, topological sort, DSU",
        deliverable: "Implement DSU with path compression",
      },
      {
        week: 12,
        focus: "Dijkstra, Bellman-Ford, MST",
        deliverable: "Shortest path on a real weighted graph",
      },
    ],
    anchor:
      "MedLocate — trie-backed clinic/specialty autocomplete; graph model for referral routing.",
  },
  {
    id: 4,
    name: "Dynamic Programming",
    weeks: [13, 17],
    focus: [
      {
        week: 13,
        focus: "1D DP, memo → tabulation",
        deliverable: "Convert 5 recursive solutions to bottom-up",
      },
      {
        week: 14,
        focus: "Knapsack family, subset-sum, partition",
        deliverable: "Position sizing as a constrained knapsack",
      },
      {
        week: 15,
        focus: "Grid DP + string DP",
        deliverable: "Solve 8 unaided",
      },
      {
        week: 16,
        focus: "LIS (both versions), interval DP",
        deliverable: "O(n log n) LIS from scratch",
      },
      {
        week: 17,
        focus: "Bitmask DP, tree DP, state-machine DP",
        deliverable: "Model a 3-state trading regime as explicit DP",
      },
    ],
    anchor:
      "Markov system — reformulate regime classification as state-machine DP; build the profit oracle.",
  },
  {
    id: 5,
    name: "Advanced Structures",
    weeks: [18, 22],
    focus: [
      {
        week: 18,
        focus: "Fenwick tree, segment tree, lazy propagation",
        deliverable: "Range-sum + range-max structure from scratch",
      },
      {
        week: 19,
        focus: "KMP, Z-algorithm, rolling hash",
        deliverable: "Implement Rabin-Karp; use it for real dedup",
      },
      {
        week: 20,
        focus: "Bit manipulation + matrix exponentiation",
        deliverable: "n-step Markov transition via fast matrix power",
      },
      {
        week: 21,
        focus: "Probabilistic & streaming structures",
        deliverable: "Build a Bloom filter and a Count-Min sketch",
      },
      {
        week: 22,
        focus: "k-d tree, geohashing, quadtree",
        deliverable: "Geo-proximity search without a DB call",
      },
    ],
    anchor:
      "MedLocate geo-search — geohash prefixes + bounding-box pruning, measured against the current query path.",
  },
  {
    id: 6,
    name: "Integration & Judgment",
    weeks: [23, 24],
    focus: [
      {
        week: 23,
        focus: "LRU/LFU, cache-aware structures, system design",
        deliverable: "Design 3 systems purely around data-structure choice",
      },
      {
        week: 24,
        focus: "Mixed-difficulty timed practice; weak-spot repair",
        deliverable: "2 timed sessions, then re-attempt every failure",
      },
    ],
    anchor:
      "Write an internal doc justifying every non-trivial data-structure choice across your projects.",
  },
];

/* ---- Derived lookups ---------------------------------------------------- */

export const ALL_TOPICS: Topic[] = TIERS.flatMap((t) => t.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

export const TOTAL_QUIZ_QUESTIONS = ALL_TOPICS.reduce(
  (s, t) => s + t.quiz.length,
  0,
);

export function topicsForTier(tier: number): Topic[] {
  return TIERS.find((t) => t.id === tier)?.topics ?? [];
}

export function tierOf(topicId: string): number {
  return TOPIC_BY_ID.get(topicId)?.tier ?? 0;
}

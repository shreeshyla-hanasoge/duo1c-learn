import type { Trace } from "./trace";
import * as t0 from "./algorithms/tier0";
import * as t1 from "./algorithms/tier1";
import * as t2 from "./algorithms/tier2";
import * as t3 from "./algorithms/tier3";
import * as t4 from "./algorithms/tier4";

/**
 * Traces are built lazily and memoised — a few of them emit 100+ frames, and
 * there is no reason to pay for one the reader never opens.
 */
const builders: Record<string, () => Trace> = {
  "two-pointers": t0.twoPointers,
  "sliding-window": t0.slidingWindow,
  "binary-search": t0.binarySearch,
  "binary-search-answer": t0.binarySearchOnAnswer,
  "prefix-sums": t0.prefixSums,
  "merge-sort": t0.mergeSort,
  "quick-sort": t0.quickSort,
  hashing: t0.hashCollisions,

  "monotonic-deque": t1.monotonicDeque,
  "monotonic-stack": t1.monotonicStack,
  heap: t1.binaryHeap,
  "floyd-cycle": t1.floydCycle,
  trie: t1.trie,
  intervals: t1.mergeIntervals,
  "inorder-iterative": t1.iterativeInorder,

  bfs: t2.bfsGrid,
  dsu: t2.unionFind,
  toposort: t2.topoSort,
  dijkstra: t2.dijkstra,

  lcs: t3.lcs,
  knapsack: t3.knapsack,
  lis: t3.lisPatience,
  "state-machine-dp": t3.stateMachineDP,
  "edit-distance": t3.editDistance,

  kmp: t4.kmp,
  lru: t4.lruCache,
  fenwick: t4.fenwick,
  bloom: t4.bloomFilter,
  bitmask: t4.subsetEnumeration,
  "skip-list": t4.skipList,
};

const cache = new Map<string, Trace>();

export function getTrace(key: string): Trace | null {
  if (!builders[key]) return null;
  let trace = cache.get(key);
  if (!trace) {
    trace = builders[key]();
    cache.set(key, trace);
  }
  return trace;
}

export function hasTrace(key: string): boolean {
  return Boolean(builders[key]);
}

export const vizKeys = Object.keys(builders);

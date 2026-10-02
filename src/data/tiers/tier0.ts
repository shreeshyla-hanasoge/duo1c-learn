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
  orientation: {
    overview:
      "Every tier above this one is about picking a clever structure. This tier is about the two questions that come first: what does this code actually cost, and can I get the same answer in one pass instead of two? An array, a string and a hash map are the three containers almost everything else is built from — a heap is an array with a rule, a graph is usually a hash map of arrays, a trie is a tree of small maps. Learn how these three behave in memory and the rest of the course stops feeling like a list of tricks to memorise.",
    stakes:
      "Skip this and you will keep writing correct code that falls over at exactly the size where it starts to matter — and you will not be able to say why.",
    recognise: [
      {
        signal: "The input is one list and the answer involves every pair.",
        reach:
          "Two pointers if it is sorted, a hash map if it is not. The nested loop is the brute force you are meant to replace, not the answer.",
      },
      {
        signal: "The words “contiguous subarray”, “substring”, or “last k”.",
        reach:
          "Sliding window. The window slides — it is never rebuilt from scratch, which is the whole saving.",
      },
      {
        signal: "Many range-sum questions over data that does not change.",
        reach:
          "Prefix sums. Pay O(n) once at build, then answer every range in O(1).",
      },
      {
        signal: "“Find”, and the data is sorted — or you could sort it.",
        reach:
          "Binary search. Including binary search on the answer, where what you are searching is a threshold rather than an index.",
      },
    ],
    arc: [
      {
        stage: "Learn to price things",
        topics: ["complexity"],
        point:
          "You cannot choose between two approaches until you can cost both. This is the only topic here with no data structure in it, and it is the one every tier above quietly leans on.",
      },
      {
        stage: "The three containers",
        topics: ["arrays", "strings", "hashing"],
        point:
          "Contiguous memory; contiguous memory with encoding rules on top; and the hash table. Nearly every structure later in the course is one of these three with an invariant bolted on.",
      },
      {
        stage: "One pass instead of two",
        topics: ["two-pointers", "sliding-window", "prefix-sums"],
        point:
          "Three ways to delete a nested loop. They look like separate tricks and they are one instinct: carry forward what you already computed instead of computing it again.",
      },
      {
        stage: "Impose an order, then exploit it",
        topics: ["sorting", "binary-search"],
        point:
          "Sorting is rarely the answer by itself — it is the setup that makes the next step cheap. Which is why these two belong together, and why “just sort it first” is a real design decision carrying an O(n log n) price tag.",
      },
    ],
    outcomes: [
      "Read a function and state its true complexity without running it.",
      "Turn a nested loop into a single pass, and name which of the three techniques applies.",
      "Answer “why is this fine for a thousand rows and hopeless for ten lakh” with a specific reason, not a guess.",
      "Choose between a hash map and a sorted array on grounds other than habit.",
    ],
    inTheWild: [
      {
        system: "UPI — duplicate payment checks",
        use: "A retried request must be recognised as one you have already seen, in the time budget of a single payment. That is a hash set lookup; a scan over recent transactions would not fit the budget.",
      },
      {
        system: "Log and metrics pipelines",
        use: "“Average latency over the last 5 minutes”, recomputed every second, is a sliding window. Rebuilding the window each tick is the mistake this tier is designed to stop you making.",
      },
      {
        system: "Any paginated API",
        use: "Sorted data plus binary search is how a cursor finds its place in a result set without re-reading everything before it.",
      },
    ],
  },
};

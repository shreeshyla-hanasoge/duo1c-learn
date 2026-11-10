import type { FlowSpec } from "../kit/types";

/**
 * Search and the inverted index — the film for `sd-search-index`.
 *
 * The lesson's three documents: 1 'nifty bank futures', 2 'bank nifty
 * options', 3 'gold futures'. A scan is slow; a postings-list lookup is not;
 * a new document waits for a refresh.
 */
export const sdSearchIndex: FlowSpec = {
  id: "sd-search-index",
  kicker: "System design · M2",
  title: "Search without scanning",
  nodes: [
    { id: "user", role: "Search box", label: "User" },
    { id: "api", role: "Query handler", label: "Search" },
    { id: "index", role: "Word to documents", label: "Index" },
    { id: "db", role: "Source of truth", label: "Database" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A search box must find documents by word. Three documents, and one query: bank futures.",
      facts: { db: "1 nifty bank futures", index: "empty" },
    },
    {
      seconds: 4.6,
      caption: "The user types two words and wants only documents that contain both.",
      move: { from: "user", to: "api", label: "bank futures", tone: "request" },
      facts: { user: "types: bank futures" },
    },
    {
      seconds: 5.4,
      caption: "The naive way is to scan. LIKE reads every row, so a bigger table means a slower search.",
      move: { from: "api", to: "db", label: "LIKE '%bank%'", tone: "fault" },
      health: { db: "slow" },
      facts: { db: "scanning every row", api: "waiting" },
    },
    {
      seconds: 5,
      caption: "At a million rows that is a million reads for one search. Doubling the data doubles the wait.",
      move: { from: "db", to: "api", label: "1,000,000 rows read", tone: "fault" },
      facts: { db: "scan cost: all rows" },
    },
    {
      seconds: 5.4,
      caption: "So flip the data. Pay once, when a document is written, to list documents under each word.",
      move: { from: "db", to: "index", label: "docs 1, 2, 3", tone: "commit" },
      health: { db: "ok" },
      facts: { index: "bank: 1, 2 · futures: 1, 3" },
    },
    {
      seconds: 5.4,
      caption: "The query is cut into words the same way the documents were, or matches silently fail.",
      move: { from: "api", to: "index", label: "bank, futures", tone: "request" },
      facts: { api: "analysed: bank, futures" },
    },
    {
      seconds: 5.4,
      caption: "Walk the two sorted lists together. Only document 1 is in both, and nothing was scanned.",
      move: { from: "index", to: "api", label: "[1,2] and [1,3] = 1", tone: "reply" },
      facts: { index: "read 2 short lists", api: "match: doc 1" },
    },
    {
      seconds: 5,
      caption: "Cost now follows the length of those lists, not the size of the corpus.",
      move: { from: "api", to: "user", label: "doc 1: nifty bank", tone: "reply" },
      facts: { user: "sees doc 1" },
    },
    {
      seconds: 5.4,
      caption: "A new document arrives. It waits in a memory buffer, so it cannot be found yet.",
      move: { from: "db", to: "index", label: "doc 4: bank nifty", tone: "commit" },
      facts: { index: "doc 4 in buffer", db: "4 documents" },
    },
    {
      seconds: 5.4,
      caption: "About one second later a refresh writes a segment. Search is near real-time, not instant.",
      move: { from: "index", to: "api", label: "refresh: doc 4 live", tone: "reply" },
      facts: { index: "bank: 1, 2, 4", api: "doc 4 searchable" },
    },
  ],
  takeaway: {
    line: "Index the answers, do not scan the questions.",
    sub: "Search is a derived copy of your data. Rebuild it from the database, and read your own write there.",
    seconds: 5.5,
  },
  lesson: {
    title: "Why a word list beats a scan",
    watchFor:
      "Compare the line under Database while it scans every row with the line under Index, which reads just two short lists. Then see document 4 sit in a buffer before it becomes searchable.",
  },
};

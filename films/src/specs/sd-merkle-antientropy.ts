import type { FlowSpec } from "../kit/types";

/**
 * Merkle trees and anti-entropy — the film for `sd-merkle-antientropy`.
 *
 * One replica missed a write while down. A repair job compares hash trees of
 * eight key ranges, descends only where hashes differ, and repairs one range.
 * Hash values are illustrative.
 */
export const sdMerkleAntientropy: FlowSpec = {
  id: "sd-merkle-antientropy",
  kicker: "System design · M4",
  title: "Finding one bad range",
  nodes: [
    { id: "client", role: "Writer", label: "Client" },
    { id: "a", role: "Replica", label: "Replica A" },
    { id: "repair", role: "Anti-entropy job", label: "Repair" },
    { id: "b", role: "Replica", label: "Replica B" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "Two replicas should hold the same data, split into 8 key ranges. Each range has a hash.",
      facts: { a: "8 ranges · 8 hashes", b: "8 ranges · 8 hashes" },
    },
    {
      seconds: 5.2,
      caption: "A write to range 5 reaches A, but B is down for the night and misses it.",
      move: { from: "client", to: "a", label: "k5 = 9", tone: "commit" },
      alsoMove: { from: "client", to: "b", label: "k5 = 9", tone: "fault" },
      health: { b: "down" },
      facts: { a: "range 5 = 9", b: "range 5 = 4 (old)" },
    },
    {
      seconds: 4.8,
      caption: "B is back. The repair job asks each replica for its root hash, the hash of everything.",
      move: { from: "repair", to: "a", label: "root hash?", tone: "request" },
      alsoMove: { from: "repair", to: "b", label: "root hash?", tone: "request" },
      health: { b: "ok" },
    },
    {
      seconds: 5.2,
      caption: "Two small hashes come back, not 100 GB of rows. They differ, so the data differs somewhere.",
      move: { from: "a", to: "repair", label: "root 7f3a", tone: "reply" },
      alsoMove: { from: "b", to: "repair", label: "root 21c9", tone: "reply" },
      facts: { repair: "roots differ", a: "root 7f3a", b: "root 21c9" },
    },
    {
      seconds: 5.2,
      caption: "Descend only into the differing side. Ranges 1 to 4 have equal hashes, so they are skipped.",
      move: { from: "a", to: "repair", label: "ranges 5–8: c40e", tone: "reply" },
      alsoMove: { from: "b", to: "repair", label: "ranges 5–8: 9b12", tone: "reply" },
      facts: { repair: "1–4 equal · skip" },
    },
    {
      seconds: 5.2,
      caption: "Ranges 7 and 8 match. Only ranges 5 and 6 are left, then only range 5.",
      move: { from: "a", to: "repair", label: "range 5: e5a1", tone: "reply" },
      alsoMove: { from: "b", to: "repair", label: "range 5: 03d7", tone: "reply" },
      facts: { repair: "range 5 differs" },
    },
    {
      seconds: 5,
      caption: "Three rounds found it among 8 ranges. For a million ranges it takes about 20 rounds.",
      facts: { repair: "3 rounds · ~1 KB" },
    },
    {
      seconds: 5.2,
      caption: "Only range 5 is streamed from A to B, not the whole data set.",
      move: { from: "a", to: "b", label: "range 5 rows", tone: "commit" },
      facts: { b: "range 5 = 9 (fixed)" },
    },
    {
      seconds: 5.2,
      caption: "Compare roots again. They match, so the replicas agree, and the job costs almost nothing to repeat.",
      move: { from: "repair", to: "b", label: "root hash?", tone: "request" },
      facts: { a: "root 7f3a", b: "root 7f3a", repair: "equal · done" },
    },
  ],
  takeaway: {
    line: "Compare a fingerprint first, then narrow down.",
    sub: "A hash tree turns finding one bad range into about log2(n) small questions.",
    seconds: 5.5,
  },
  lesson: {
    title: "Eight ranges, three questions",
    watchFor:
      "Watch the line under Repair. It goes from 'roots differ' to 'range 5 differs' without ever looking at the matching ranges. Only that one range is copied, and the roots then agree.",
  },
};

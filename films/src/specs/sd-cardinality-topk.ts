import type { FlowSpec } from "../kit/types";

/**
 * Cardinality and top-K — the film for `sd-cardinality-topk`.
 *
 * One page-view stream feeds three tiny structures: HyperLogLog counts
 * distinct users, a count-min sketch counts per page, and a small heap keeps
 * the hottest pages. The turn is a collision that inflates one counter.
 */
export const sdCardinalityTopk: FlowSpec = {
  id: "sd-cardinality-topk",
  kicker: "System design · M6",
  title: "Counting a crowd in kilobytes",
  nodes: [
    { id: "stream", role: "Page views", label: "Stream" },
    { id: "hll", role: "HyperLogLog", label: "Distinct" },
    { id: "cms", role: "Count-min", label: "Counts" },
    { id: "heap", role: "Min-heap", label: "Top 3" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "A billion page views arrive. We want how many distinct users, and which pages are hottest.",
      facts: { stream: "exact set: keep every id" },
    },
    {
      seconds: 5,
      caption: "Hash user u91. The first bits pick register 5; its next bits start with three zeros, so store 4.",
      move: { from: "stream", to: "hll", label: "user u91", tone: "commit" },
      facts: { hll: "reg 5 = 4 · 12 KB total" },
    },
    {
      seconds: 5,
      caption: "The same user again hashes to the same register and value. Nothing changes, so duplicates are free.",
      move: { from: "stream", to: "hll", label: "user u91 again", tone: "commit" },
      facts: { hll: "reg 5 = 4 (unchanged)" },
    },
    {
      seconds: 5,
      caption: "A rare hash with nine leading zeros sets register 12 to 10. Long streaks only happen in big crowds.",
      move: { from: "stream", to: "hll", label: "user u7", tone: "commit" },
      facts: { hll: "reg 12 = 10 → big crowd" },
    },
    {
      seconds: 5.2,
      caption: "For counts per page, each view adds 1 to one box in each of five rows.",
      move: { from: "stream", to: "cms", label: "view /nifty", tone: "commit" },
      facts: { cms: "5 rows × 2,719 · 54 KB" },
    },
    {
      seconds: 5.4,
      caption: "A rare page, /faq, shares a box with /nifty in one row. That row reads 9,001, which is far too high.",
      move: { from: "stream", to: "cms", label: "count /faq?", tone: "fault" },
      facts: { cms: "/faq rows: 9001, 3, 5, 4, 7" },
    },
    {
      seconds: 5.4,
      caption: "Collisions only add, so take the smallest of the five rows. The estimate for /faq is 3.",
      move: { from: "cms", to: "stream", label: "min = 3", tone: "reply" },
      facts: { cms: "estimate = min row = 3" },
    },
    {
      seconds: 5.2,
      caption: "A count-min table cannot list keys. So hot pages go into a small heap that keeps the best three.",
      move: { from: "cms", to: "heap", label: "/nifty ≈ 8,400", tone: "commit" },
      facts: { heap: "/nifty 8,400 · 2 more" },
    },
    {
      seconds: 5.2,
      caption: "Server B sketched its own traffic. Merging is just the larger value in each register.",
      move: { from: "stream", to: "hll", label: "B's registers", tone: "commit" },
      facts: { hll: "merge = max per register", stream: "no raw ids kept" },
    },
  ],
  takeaway: {
    line: "Trade exactness for a small, fixed memory.",
    sub: "Use sketches for big counts and rankings. Keep anything that touches money exact.",
    seconds: 5.5,
  },
  lesson: {
    title: "Distinct and hottest",
    watchFor:
      "Watch the three lines for the same stream. Distinct stays at 12 KB however many ids pass. The count-min line shows one inflated row, and the minimum of the five rows is what saves the answer.",
  },
};

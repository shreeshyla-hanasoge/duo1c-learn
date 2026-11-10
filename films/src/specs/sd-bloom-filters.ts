import type { FlowSpec } from "../kit/types";

/**
 * Bloom filters — the film for `sd-bloom-filters`.
 *
 * The lesson's toy filter: m = 16 bits, k = 2 hashes. RELIANCE and TCS are
 * added, WIPRO gets a certain no, and INFY is a false positive that costs
 * one wasted disk read.
 */
export const sdBloomFilters: FlowSpec = {
  id: "sd-bloom-filters",
  kicker: "System design · M6",
  title: "A certain no, a probable yes",
  nodes: [
    { id: "client", role: "Asks", label: "Client" },
    { id: "filter", role: "Bit array", label: "Filter" },
    { id: "disk", role: "Slow lookup", label: "Disk" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A Bloom filter is 16 bits, all zero, standing guard in front of a slow disk.",
      facts: { filter: "0 of 16 bits on", disk: "1 read = slow" },
    },
    {
      seconds: 5,
      caption: "To add RELIANCE, hash it twice and switch on the two bits it points to.",
      move: { from: "client", to: "filter", label: "add RELIANCE", tone: "commit" },
      facts: { filter: "bits 3, 11 on" },
    },
    {
      seconds: 5,
      caption: "TCS points to bits 5 and 11. Bit 11 is already on, so the two items now share it.",
      move: { from: "client", to: "filter", label: "add TCS", tone: "commit" },
      facts: { filter: "bits 3, 5, 11 on" },
    },
    {
      seconds: 5,
      caption: "Now ask about WIPRO. It hashes to bit 7, which is off.",
      move: { from: "client", to: "filter", label: "has WIPRO?", tone: "request" },
      facts: { filter: "bit 7 is off" },
    },
    {
      seconds: 5,
      caption: "One off bit is proof. Adding WIPRO would have switched it on, so the answer is a certain no.",
      move: { from: "filter", to: "client", label: "definitely not", tone: "reply" },
      facts: { disk: "0 reads", client: "WIPRO: no" },
    },
    {
      seconds: 5,
      caption: "Ask about INFY. It was never added, but it hashes to bits 3 and 5, and both are on.",
      move: { from: "client", to: "filter", label: "has INFY?", tone: "request" },
      facts: { filter: "bits 3, 5 on: probably" },
    },
    {
      seconds: 5,
      caption: "A yes is only a hint, so the client must check the disk. That costs one read.",
      move: { from: "filter", to: "disk", label: "look up INFY", tone: "fault" },
      health: { disk: "slow" },
      facts: { disk: "1 read" },
    },
    {
      seconds: 5,
      caption: "The disk finds nothing. That was a false positive: wrong, but only one wasted read.",
      move: { from: "disk", to: "client", label: "not found", tone: "fault" },
      health: { disk: "ok" },
      facts: { client: "INFY: no", filter: "false positive" },
    },
    {
      seconds: 5.4,
      caption: "Size it to the cost of a mistake. About 9.6 bits per item gives a 1 percent wrong-yes rate.",
      move: { from: "client", to: "filter", label: "absent keys", tone: "request" },
      facts: { filter: "9.6 bits/item · 1%", disk: "10 files: ~0.1 reads" },
    },
    {
      seconds: 5.4,
      caption: "Removing TCS would clear bit 11, which RELIANCE needs. So bits are never cleared.",
      move: { from: "client", to: "filter", label: "remove TCS", tone: "fault" },
      facts: { filter: "bit 11 shared: no delete" },
    },
  ],
  takeaway: {
    line: "A no is always true. A yes is only probably true.",
    sub: "Use a filter where a wrong yes costs one wasted read, and confirm every yes in the real store.",
    seconds: 5.5,
  },
  lesson: {
    title: "Three bits, one wrong yes",
    watchFor:
      "Watch the bits listed under the Filter. WIPRO finds a bit that is off, so the disk is never touched. INFY finds both of its bits already on, and the disk read it triggers turns out to be wasted.",
  },
};

import type { FlowSpec } from "../kit/types";

/**
 * The design method — the film for `sd-design-method`.
 *
 * The lesson's price-alert example, followed through the method: count first,
 * then find the hard part (matching NIFTY's alerts), fix it with a heap, and
 * ask what breaks.
 */
export const sdDesignMethod: FlowSpec = {
  id: "sd-design-method",
  kicker: "System design · M10",
  title: "Count, then find the hard part",
  nodes: [
    { id: "feed", role: "Price ticks", label: "Feed" },
    { id: "matcher", role: "Owns a symbol", label: "Matcher" },
    { id: "db", role: "The record", label: "Database" },
    { id: "queue", role: "Notifications", label: "Queue" },
  ],
  steps: [
    {
      seconds: 5,
      caption: "Tell me when RELIANCE crosses 2,900. First count: 5 million users with 4 alerts each.",
      facts: { db: "20 M alerts · 1.2 GB", feed: "5,000 ticks a second" },
    },
    {
      seconds: 5,
      caption: "The numbers say the alerts fit in memory. So a matcher loads one symbol's alerts and owns them.",
      move: { from: "db", to: "matcher", label: "RELIANCE alerts", tone: "commit" },
      facts: { matcher: "RELIANCE: 4,000 alerts" },
    },
    {
      seconds: 5,
      caption: "For an average symbol, checking every alert on each tick is cheap enough.",
      move: { from: "feed", to: "matcher", label: "RELIANCE 2,901", tone: "request" },
      facts: { matcher: "scan 4,000 per tick: fine" },
    },
    {
      seconds: 5.4,
      caption: "NIFTY has 500,000 alerts and 50 ticks a second. A full scan is now the hard part.",
      move: { from: "feed", to: "matcher", label: "NIFTY, 50 a second", tone: "fault" },
      health: { matcher: "slow" },
      facts: { matcher: "25 M compares a second" },
    },
    {
      seconds: 5.4,
      caption: "Keep the above-price alerts in a min-heap. A tick at 24,310 pops only alerts at or below it.",
      move: { from: "feed", to: "matcher", label: "NIFTY 24,310", tone: "request" },
      health: { matcher: "ok" },
      facts: { matcher: "pops 3 · scans 0" },
    },
    {
      seconds: 5,
      caption: "A fired alert is moved from active to fired in one conditional update, so it can only fire once.",
      move: { from: "matcher", to: "db", label: "active → fired", tone: "commit" },
      facts: { db: "3 alerts: fired" },
    },
    {
      seconds: 5,
      caption: "Now ask what breaks. One move in the market can fire 200,000 alerts at once.",
      move: { from: "matcher", to: "queue", label: "200,000 alerts", tone: "fault" },
      health: { queue: "slow" },
      facts: { queue: "backlog: 200,000" },
    },
    {
      seconds: 5,
      caption: "Put them on a queue and rate-limit the sends. The matcher never waits for the SMS provider.",
      move: { from: "queue", to: "matcher", label: "accepted", tone: "reply" },
      health: { queue: "ok" },
      facts: { queue: "draining, rate-limited" },
    },
    {
      seconds: 5.4,
      caption: "If the matcher crashes, memory is lost. The database is the record, so it rebuilds from there.",
      move: { from: "db", to: "matcher", label: "reload active alerts", tone: "reply" },
      health: { matcher: "down" },
      facts: { matcher: "rebuilding from record" },
    },
  ],
  takeaway: {
    line: "Count first. The numbers show you the hard part.",
    sub: "Clarify, count, sketch, go deep on the one risky part, then say what breaks.",
    seconds: 5.5,
  },
  lesson: {
    title: "From requirement to hard part",
    watchFor:
      "Watch the line under the Matcher. It starts at 4,000 alerts per tick, jumps to 25 million compares a second for NIFTY, and drops to a pop of three alerts once the heap is in place.",
  },
};

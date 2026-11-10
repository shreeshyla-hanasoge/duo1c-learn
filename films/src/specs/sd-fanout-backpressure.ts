import type { FlowSpec } from "../kit/types";

/**
 * Fan-out, pub/sub and backpressure — the film for `sd-fanout-backpressure`.
 *
 * One publisher, three subscribers, one of them slow. The film shows the
 * choice a relay has to make when a subscriber cannot keep up: wait for it
 * (and starve everyone), queue without limit (and run out of memory), or
 * bound the queue and drop or merge. Counts are illustrative.
 */
export const sdFanoutBackpressure: FlowSpec = {
  id: "sd-fanout-backpressure",
  kicker: "System design · M5",
  title: "Fan-out and the slow consumer",
  nodes: [
    { id: "feed", role: "Publisher", label: "Feed" },
    { id: "relay", role: "Pub/sub", label: "Relay" },
    { id: "a", role: "Subscriber", label: "Engine" },
    { id: "b", role: "Subscriber", label: "Chart" },
    { id: "c", role: "Subscriber", label: "Phone" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "One feed, three subscribers. Every tick has to be copied to each of them.",
      facts: { relay: "3 subscribers" },
    },
    {
      seconds: 4.6,
      caption: "A tick arrives. The relay looks up who subscribed to this symbol.",
      move: { from: "feed", to: "relay", label: "NIFTY 24,310", tone: "request" },
      facts: { feed: "10 ticks a second", relay: "1 in, 3 to send" },
    },
    {
      seconds: 4.8,
      caption: "Fan-out: one message in, one message out per subscriber.",
      move: { from: "relay", to: "a", label: "tick", tone: "commit" },
      alsoMove: { from: "relay", to: "b", label: "tick", tone: "commit" },
      facts: { a: "got it", b: "got it" },
    },
    {
      seconds: 5,
      caption: "The phone is on a weak network. It takes two seconds to accept one tick.",
      move: { from: "relay", to: "c", label: "tick", tone: "reply" },
      health: { c: "slow" },
      facts: { c: "1 tick every 2 s" },
    },
    {
      seconds: 5,
      caption: "If the relay waits for the phone, the engine and the chart wait too.",
      move: { from: "feed", to: "relay", label: "20 more ticks", tone: "request" },
      facts: { relay: "blocked on Phone", a: "starved", b: "starved" },
    },
    {
      seconds: 5,
      caption: "So give each subscriber its own queue. Now only the slow one falls behind.",
      move: { from: "relay", to: "a", label: "ticks", tone: "commit" },
      alsoMove: { from: "relay", to: "b", label: "ticks", tone: "commit" },
      facts: { relay: "Phone queue: 20", a: "up to date", b: "up to date" },
    },
    {
      seconds: 5,
      caption: "An unbounded queue only moves the problem. It grows until memory runs out.",
      move: { from: "feed", to: "relay", label: "600 more ticks", tone: "fault" },
      facts: { relay: "Phone queue: 620" },
    },
    {
      seconds: 5.4,
      caption: "Bound the queue and merge. For prices, only the latest tick per symbol matters.",
      move: { from: "relay", to: "c", label: "latest price only", tone: "commit" },
      facts: { relay: "Phone queue: 1", c: "late, but current" },
    },
  ],
  takeaway: {
    line: "Decide who pays for the slow consumer.",
    sub: "Bound every queue, then choose: block, drop, or keep only the latest.",
    seconds: 5.5,
  },
  lesson: {
    title: "One slow subscriber",
    watchFor:
      "Watch the number under the relay. It is the phone's queue, and it is the whole lesson: blocked, then growing without limit, then held at one by keeping only the latest price.",
  },
};

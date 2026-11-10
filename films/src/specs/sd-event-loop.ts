import type { FlowSpec } from "../kit/types";

/**
 * The event loop and single writer — the film for `sd-event-loop`.
 *
 * One loop serves ticks one at a time. A broker call made inside a coroutine
 * freezes the whole queue; handing it to a thread fixes that. A slot reservation
 * keeps a cap of two positions true when two signals arrive together.
 */
export const sdEventLoop: FlowSpec = {
  id: "sd-event-loop",
  kicker: "System design · M5",
  title: "One clerk, one queue",
  nodes: [
    { id: "feed", role: "Ticks in", label: "Feed" },
    { id: "loop", role: "One thread", label: "Event loop" },
    { id: "strategy", role: "Owns positions", label: "Strategy" },
    { id: "broker", role: "Slow network call", label: "Broker" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "One loop takes one event at a time. Only it may change the positions.",
      facts: { loop: "queue: 0", strategy: "positions: 1 of 2" },
    },
    {
      seconds: 4.6,
      caption: "A tick arrives and joins the queue. Order of arrival is order of service.",
      move: { from: "feed", to: "loop", label: "tick", tone: "request" },
      facts: { loop: "queue: 1" },
    },
    {
      seconds: 4.8,
      caption: "The loop runs the handler to its end, then takes the next tick. It never stops halfway.",
      move: { from: "loop", to: "strategy", label: "run handler", tone: "commit" },
      facts: { loop: "queue: 0", strategy: "candle updated" },
    },
    {
      seconds: 5.2,
      caption: "Now the rule places an order, and the broker call is made inside the handler.",
      move: { from: "strategy", to: "broker", label: "place order", tone: "request" },
      health: { broker: "slow", loop: "slow" },
      facts: { strategy: "waiting 2 s", loop: "held by the wait" },
    },
    {
      seconds: 5,
      caption: "While the clerk waits, nothing else is served. Twenty ticks pile up behind it.",
      move: { from: "feed", to: "loop", label: "20 ticks", tone: "fault" },
      facts: { loop: "queue: 20 · stalled" },
    },
    {
      seconds: 5,
      caption: "The reply comes back. Every strategy was 2 seconds late, though only one was slow.",
      move: { from: "broker", to: "strategy", label: "order filled", tone: "reply" },
      facts: { strategy: "positions: 2 of 2", loop: "queue: 20 · draining" },
    },
    {
      seconds: 5.2,
      caption: "The fix: hand the slow call to a worker thread and await it. The loop keeps serving.",
      move: { from: "strategy", to: "broker", label: "to_thread · place", tone: "request" },
      health: { loop: "ok" },
      facts: { strategy: "awaiting, not blocking", loop: "free · queue: 0" },
    },
    {
      seconds: 5,
      caption: "The next tick is served at once, while the order is still out at the broker.",
      move: { from: "feed", to: "loop", label: "tick", tone: "request" },
      facts: { loop: "served now · queue: 0" },
    },
    {
      seconds: 5.4,
      caption: "A wait lets other tasks run. So two signals at once could both see 1 position, and make 3.",
      move: { from: "loop", to: "strategy", label: "2 signals at once", tone: "fault" },
      facts: { strategy: "check says 1 of 2" },
    },
    {
      seconds: 5.4,
      caption: "Count a promised slot as taken. The second check now sees 2 of 2 and stops.",
      move: { from: "loop", to: "strategy", label: "reserve a slot", tone: "commit" },
      facts: { strategy: "1 open + 1 reserved = 2" },
    },
  ],
  takeaway: {
    line: "Never make the clerk wait.",
    sub: "Hand slow work to a thread, and count promised slots as already taken.",
    seconds: 5.5,
  },
  lesson: {
    title: "A two-second wait",
    watchFor:
      "Watch the loop's queue. It sits at 0 while handlers are quick, jumps to 20 while one broker call blocks it, and returns to 0 once the call moves to a thread.",
  },
};

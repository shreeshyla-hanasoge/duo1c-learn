import type { FlowSpec } from "../kit/types";

/**
 * Latency budgets — the film for `sd-latency-budgets`.
 *
 * One stop-loss with a 1,000 ms budget, split per hop. Then a relay that is
 * fine on average stalls once, and the fix is to remove the hop.
 */
export const sdLatencyBudgets: FlowSpec = {
  id: "sd-latency-budgets",
  kicker: "System design · M1",
  title: "A stop-loss and its time budget",
  nodes: [
    { id: "exchange", role: "Price source", label: "Exchange" },
    { id: "relay", role: "Extra hop", label: "Relay" },
    { id: "engine", role: "Rules + risk", label: "Engine" },
    { id: "broker", role: "Order endpoint", label: "Broker" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A stop-loss may take 1,000 ms from price print to order sent. Every hop gets a share.",
      facts: { engine: "budget: 1,000 ms" },
    },
    {
      seconds: 4.6,
      caption: "The price prints and travels to the relay. The feed is allowed 150 ms.",
      move: { from: "exchange", to: "relay", label: "price prints", tone: "request" },
      facts: { exchange: "stop price hit", relay: "feed: 150 ms" },
    },
    {
      seconds: 4.6,
      caption: "The engine checks its rules in about 50 ms. So far 200 ms of the budget is spent.",
      move: { from: "relay", to: "engine", label: "tick", tone: "request" },
      facts: { engine: "eval: 50 ms", relay: "used: 200 ms" },
    },
    {
      seconds: 5,
      caption: "The order call to the broker is the big hop: 600 ms. That leaves 200 ms spare.",
      move: { from: "engine", to: "broker", label: "sell: stop hit", tone: "commit" },
      facts: { engine: "used: 800 ms", broker: "order call: 600 ms" },
    },
    {
      seconds: 4.6,
      caption: "The path fits. The budget shows where time goes, so you fix the biggest hop first.",
      move: { from: "broker", to: "engine", label: "order accepted", tone: "reply" },
      facts: { engine: "800 of 1,000 ms", broker: "stop filled" },
    },
    {
      seconds: 5,
      caption: "Then one print in a hundred finds the relay stalled for 10 seconds.",
      move: { from: "exchange", to: "relay", label: "price prints", tone: "fault" },
      health: { relay: "slow" },
      facts: { relay: "stalled: 10,000 ms" },
    },
    {
      seconds: 5.6,
      caption: "99 orders at 100 ms and one at 10,000 ms average 199 ms. A healthy mean hides this stop.",
      move: { from: "relay", to: "engine", label: "tick, 10 s late", tone: "fault" },
      facts: { engine: "mean 199 · max 10,000", broker: "stop 10 s late" },
    },
    {
      seconds: 5.4,
      caption: "Remove the hop. A relay you do not have cannot stall, so the engine reads the feed itself.",
      move: { from: "exchange", to: "engine", label: "price prints", tone: "commit" },
      health: { relay: "ok" },
      facts: { relay: "not in the path", engine: "feed direct: 150 ms" },
    },
    {
      seconds: 5,
      caption: "The stop goes out in 800 ms every time. Judge it by p99, the slow tail, not the mean.",
      move: { from: "engine", to: "broker", label: "sell: stop hit", tone: "commit" },
      facts: { engine: "p99: 800 ms", broker: "stop filled" },
    },
    {
      seconds: 5,
      caption: "Entries wait for a closed 15-minute bar, so shaving milliseconds there changes nothing.",
      move: { from: "exchange", to: "engine", label: "bar closes", tone: "request" },
      facts: { engine: "entry: bar-bound" },
    },
  ],
  takeaway: {
    line: "Budget the path, then watch the tail.",
    sub: "Remove slow hops, set targets on p99, and spend speed only where money is exposed.",
    seconds: 5.5,
  },
  lesson: {
    title: "One stop-loss, 1,000 ms",
    watchFor:
      "Watch the line under the engine. First it counts the budget used, 800 of 1,000 ms. Then it shows a mean of 199 ms beside a maximum of 10,000 ms: the mean looked fine while the stop was late.",
  },
};

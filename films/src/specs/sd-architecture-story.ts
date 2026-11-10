import type { FlowSpec } from "../kit/types";

/**
 * Architecture story — the film for `sd-architecture-story`.
 *
 * One tick, traced as the storyteller would narrate it, with the lesson's
 * first trade-off (live and backtests do not share a process) as the turn.
 * The 4 GB, 5.8 GB and 21 hours figures are the lesson's own.
 */
export const sdArchitectureStory: FlowSpec = {
  id: "sd-architecture-story",
  kicker: "System design · M10",
  title: "One tick, told as a story",
  nodes: [
    { id: "feed", role: "Market data", label: "Feed" },
    { id: "engine", role: "Strategy engine", label: "Engine" },
    { id: "orders", role: "Order manager", label: "Orders" },
    { id: "broker", role: "Live or paper", label: "Broker" },
    { id: "pool", role: "Backtests", label: "Pool" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "Pick one journey, not a tour of every box. Ours is a single tick, from feed to fill.",
    },
    {
      seconds: 4.6,
      caption: "A tick arrives. The engine folds it into the current one-minute candle.",
      move: { from: "feed", to: "engine", label: "NIFTY 24,310", tone: "request" },
      facts: { engine: "candle 09:15 open" },
    },
    {
      seconds: 4.8,
      caption: "The minute ends. Rules are checked once, when the candle closes.",
      move: { from: "feed", to: "engine", label: "first tick of 09:16", tone: "request" },
      facts: { engine: "09:15 closed, rules true" },
    },
    {
      seconds: 4.8,
      caption: "A true rule becomes a signal for the order manager.",
      move: { from: "engine", to: "orders", label: "signal: buy", tone: "commit" },
      facts: { orders: "builds the order" },
    },
    {
      seconds: 5,
      caption: "Live sends it to the broker. Paper takes the same path to a simulated fill.",
      move: { from: "orders", to: "broker", label: "place order", tone: "request" },
      facts: { broker: "live real, paper fake" },
    },
    {
      seconds: 4.8,
      caption: "The fill comes back and the position is booked. That is the whole journey.",
      move: { from: "broker", to: "orders", label: "filled", tone: "reply" },
      facts: { orders: "position booked" },
    },
    {
      seconds: 5.4,
      caption: "Once a backtest shared this process and grew to 4 GB on a 5.8 GB machine.",
      move: { from: "feed", to: "engine", label: "ticks, unread", tone: "fault" },
      health: { engine: "down" },
      facts: { engine: "feed dead 21 h" },
    },
    {
      seconds: 5.2,
      caption: "So backtests run in their own pool with one worker, and live ticks keep flowing.",
      move: { from: "engine", to: "pool", label: "backtest job", tone: "commit" },
      health: { engine: "ok" },
      facts: { engine: "ticks keep flowing", pool: "own process, 1 worker" },
    },
    {
      seconds: 5.2,
      caption: "Say the cost and the limits before you are asked: one server is one point of failure.",
      move: { from: "feed", to: "engine", label: "next tick", tone: "request" },
      facts: { engine: "one server, one user" },
    },
  ],
  takeaway: {
    line: "One journey, one trade-off, limits first.",
    sub: "A limit said before the question sounds like judgement. Said after, it sounds like a confession.",
    seconds: 5.5,
  },
  lesson: {
    title: "Directions through the house",
    watchFor:
      "Follow one tick across the top. Then watch the Engine's line during the outage and after the fix: the same machine, kept safe by a boundary that has a reason.",
  },
};

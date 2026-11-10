import type { FlowSpec } from "../kit/types";

/**
 * Candle aggregation — the film for `sd-candle-aggregation`.
 *
 * Four ticks fold into one 10:03 candle; the candle closes only when the next
 * minute's first tick arrives; a quiet option leg shows the cost of that choice;
 * a 15-minute bar comes from the broker. Prices are the lesson's own.
 */
export const sdCandleAggregation: FlowSpec = {
  id: "sd-candle-aggregation",
  kicker: "System design · M5",
  title: "Ticks into a candle",
  nodes: [
    { id: "feed", role: "Ticks in", label: "Feed" },
    { id: "builder", role: "Candle builder", label: "Builder" },
    { id: "strategy", role: "Rules", label: "Strategy" },
    { id: "broker", role: "Bar history", label: "Broker bars" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "A candle is a running summary of one minute. It needs only five numbers.",
      facts: { builder: "no candle yet", strategy: "waiting for a bar" },
    },
    {
      seconds: 4.8,
      caption: "The first tick of 10:03 sets the open. The builder floors the time to the minute.",
      move: { from: "feed", to: "builder", label: "22,450.00", tone: "request" },
      facts: { builder: "10:03 · O 22,450.00" },
    },
    {
      seconds: 4.8,
      caption: "A higher price replaces the high. Nothing else needs to be stored.",
      move: { from: "feed", to: "builder", label: "22,452.50", tone: "request" },
      facts: { builder: "H 22,452.50" },
    },
    {
      seconds: 4.8,
      caption: "A lower price replaces the low. The close is simply the latest price.",
      move: { from: "feed", to: "builder", label: "22,449.00", tone: "request" },
      facts: { builder: "L 22,449.00" },
    },
    {
      seconds: 4.8,
      caption: "Volume is the change in the exchange's day total: 1,26,500 minus 1,20,000.",
      move: { from: "feed", to: "builder", label: "22,451.00", tone: "request" },
      facts: { feed: "day total 1,26,500", builder: "C 22,451.00 · vol 6,500" },
    },
    {
      seconds: 5,
      caption: "A tick stamped 10:04 arrives. A new minute is the signal that 10:03 is complete.",
      move: { from: "feed", to: "builder", label: "10:04 tick", tone: "request" },
      facts: { builder: "10:03 final · 10:04 open" },
    },
    {
      seconds: 5,
      caption: "Only the closed bar goes to the rules, so a rule never acts on a bar that can still change.",
      move: { from: "builder", to: "strategy", label: "10:03 bar final", tone: "commit" },
      facts: { strategy: "rules ran on 10:03" },
    },
    {
      seconds: 5.2,
      caption: "The price of this design: a quiet option leg does not trade again until 10:06:10.",
      move: { from: "feed", to: "builder", label: "option · 10:06:10", tone: "fault" },
      health: { builder: "slow" },
      facts: { builder: "10:03 bar open 3 min" },
    },
    {
      seconds: 5,
      caption: "For 15-minute bars we ask the broker once per bar, the same source the backtest used.",
      move: { from: "broker", to: "strategy", label: "15m bar · from 09:15", tone: "reply" },
      health: { builder: "ok" },
      facts: { strategy: "live bar = backtest bar", broker: "bins from 09:15" },
    },
  ],
  takeaway: {
    line: "Act only on a bar that is final.",
    sub: "Close on the next minute's first tick, and use the same bars live as in the backtest.",
    seconds: 5.5,
  },
  lesson: {
    title: "Four ticks, one candle",
    watchFor:
      "Watch the builder's line grow from open, to high, to low, to close and volume. Then notice that the strategy hears nothing until a tick from the next minute arrives.",
  },
};

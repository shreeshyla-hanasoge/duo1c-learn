import type { FlowSpec } from "../kit/types";

/**
 * One decision path, never the future — the film for `sd-backtest-live-parity`.
 *
 * A 15-minute bar stamped 10:00 covers 10:00 to 10:15. The turn is a rule
 * that reads its close at 10:07, which a backtest can do and live never can.
 * Prices are illustrative; the 323-bar parity test is the lesson's own.
 */
export const sdBacktestLiveParity: FlowSpec = {
  id: "sd-backtest-live-parity",
  kicker: "System design · M9",
  title: "One rule, no peeking",
  nodes: [
    { id: "data", role: "History or feed", label: "Bars" },
    { id: "core", role: "One rule code", label: "Rule core" },
    { id: "sim", role: "Backtest edge", label: "Sim fill" },
    { id: "broker", role: "Live edge", label: "Broker" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "One recipe card for both kitchens. Only the data source and the order edge are swapped.",
      facts: { core: "one decision path" },
    },
    {
      seconds: 4.8,
      caption: "A 15-minute bar stamped 10:00 covers 10:00 to 10:15. Until 10:15 it is still forming.",
      move: { from: "data", to: "core", label: "bar 10:00", tone: "request" },
      facts: { data: "covers 10:00–10:15", core: "bar still forming" },
    },
    {
      seconds: 5.2,
      caption: "A backtest holds the whole day in memory, so a rule can read this bar's close at 10:07.",
      move: { from: "data", to: "core", label: "close 124 (10:07)", tone: "fault" },
      facts: { data: "close not known until 10:15", core: "peeked · signal at 10:07" },
    },
    {
      seconds: 5.2,
      caption: "Live can never do that. The result describes a trade that real trading could not make.",
      move: { from: "core", to: "broker", label: "buy at 10:07?", tone: "fault" },
      health: { broker: "down" },
      facts: { broker: "no close exists yet" },
    },
    {
      seconds: 4.8,
      caption: "The fix: act only on a closed bar. At 10:15 the close is known, so the signal is confirmed.",
      move: { from: "data", to: "core", label: "closed 10:15 · 121", tone: "commit" },
      health: { broker: "ok" },
      facts: { core: "signal on close: buy" },
    },
    {
      seconds: 5,
      caption: "The same signal reaches both edges and fills at the next open, the first tradable price.",
      move: { from: "core", to: "sim", label: "buy", tone: "request" },
      alsoMove: { from: "core", to: "broker", label: "buy", tone: "request" },
      facts: { sim: "waiting for next open", broker: "waiting for next open" },
    },
    {
      seconds: 5,
      caption: "Fills differ, because the exchange is not in your test: slippage and queue position are real.",
      move: { from: "data", to: "sim", label: "next open 121.50", tone: "commit" },
      facts: { sim: "filled 121.50 exactly", broker: "filled 121.75 · slippage" },
    },
    {
      seconds: 5,
      caption: "A parity test feeds 323 recorded five-minute bars through both paths.",
      move: { from: "data", to: "core", label: "323 recorded bars", tone: "request" },
      facts: { core: "replaying, both paths" },
    },
    {
      seconds: 5.2,
      caption: "Compare signals exactly, bar by bar. Compare fills statistically, not rupee by rupee.",
      move: { from: "core", to: "sim", label: "signals match", tone: "commit" },
      facts: { core: "323 of 323 signals match", sim: "fills: compare as a spread" },
    },
  ],
  takeaway: {
    line: "One decision path, and never the future.",
    sub: "Confirm on close, fill on the next open, and say what is not yet shared.",
    seconds: 5.5,
  },
  lesson: {
    title: "A rule that cannot peek",
    watchFor:
      "Watch the Rule core line. At 10:07 it 'peeked' at a close that did not exist yet; after the fix it signals only at 10:15, and 323 of 323 signals match across both paths.",
  },
};

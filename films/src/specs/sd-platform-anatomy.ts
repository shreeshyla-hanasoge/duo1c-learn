import type { FlowSpec } from "../kit/types";

/**
 * The five boxes — the film for `sd-platform-anatomy`.
 *
 * One tick travels data, decision, order and risk, storage and screen. Then a
 * buggy strategy tries to size far too big and is stopped, because every order
 * must pass the one box that holds the limits. Sizes are illustrative.
 */
export const sdPlatformAnatomy: FlowSpec = {
  id: "sd-platform-anatomy",
  kicker: "System design · M9",
  title: "Five boxes, one order path",
  nodes: [
    { id: "data", role: "Box 1 · feed", label: "Data" },
    { id: "strategy", role: "Box 2", label: "Strategy" },
    { id: "oms", role: "Box 3 · risk", label: "Orders" },
    { id: "store", role: "Box 4", label: "Storage" },
    { id: "ui", role: "Box 5", label: "Screen" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "Every trading platform has the same five jobs. Follow one tick through all of them.",
    },
    {
      seconds: 4.6,
      caption: "Box one turns the broker's feed into one internal format.",
      move: { from: "data", to: "strategy", label: "NIFTY 24,310", tone: "request" },
      facts: { data: "feed → one format", strategy: "building the 10:05 candle" },
    },
    {
      seconds: 4.8,
      caption: "Box two reads the candle, applies its rules and emits a signal. It does not trade.",
      move: { from: "strategy", to: "oms", label: "signal: buy 1 lot", tone: "request" },
      facts: { strategy: "rule true · signal sent", oms: "checking limits" },
    },
    {
      seconds: 4.8,
      caption: "Box three checks the signal against the limits, then sends the order onward.",
      move: { from: "oms", to: "store", label: "order + fill", tone: "commit" },
      facts: { oms: "within limits · order sent", store: "1 order, 1 fill saved" },
    },
    {
      seconds: 4.6,
      caption: "Box five reads that record, so people see the same state the engine holds.",
      move: { from: "store", to: "ui", label: "position: 1 lot", tone: "reply" },
      facts: { ui: "shows 1 lot long" },
    },
    {
      seconds: 5,
      caption: "Now a strategy bug. It asks for 50 lots, and it has no way to reach the broker itself.",
      move: { from: "strategy", to: "oms", label: "signal: buy 50 lots", tone: "request" },
      facts: { strategy: "bug: size 50 lots", oms: "limit is 10 lots" },
    },
    {
      seconds: 5,
      caption: "The limit lives in one place, outside strategy code, so the bad order stops here.",
      move: { from: "oms", to: "strategy", label: "refused: over limit", tone: "fault" },
      facts: { oms: "0 orders sent", store: "refusal logged" },
    },
    {
      seconds: 5,
      caption: "The screen shows state and sends commands. It never decides, so it adds no second route.",
      move: { from: "ui", to: "oms", label: "exit all", tone: "request" },
      facts: { ui: "operator pressed exit", oms: "closing 1 lot" },
    },
    {
      seconds: 5,
      caption: "Size changes only the build. A one-person system runs all five jobs in one process.",
      move: { from: "oms", to: "store", label: "flat · saved", tone: "commit" },
      facts: { store: "position 0", ui: "shows flat" },
    },
  ],
  takeaway: {
    line: "Data flows in, orders flow out, one gate between.",
    sub: "Name the five boxes, then say which ones your system shares.",
    seconds: 5.5,
  },
  lesson: {
    title: "One tick through five boxes",
    watchFor:
      "Watch the line under Orders. A 50-lot signal arrives and nothing leaves: the strategy cannot reach the broker, so the limit is checked in exactly one place.",
  },
};

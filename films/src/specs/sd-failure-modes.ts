import type { FlowSpec } from "../kit/types";

/**
 * Fail open or fail closed — the film for `sd-failure-modes`.
 *
 * The lesson's own case: after a restart the loss ledger cannot be read.
 * New entries fail closed, exits stay open, and a failed Telegram alert
 * fails open. Figures follow the lesson (₹5,000 limit, 65 units).
 */
export const sdFailureModes: FlowSpec = {
  id: "sd-failure-modes",
  kicker: "System design · M7",
  title: "Fail open or fail closed",
  nodes: [
    { id: "strategy", role: "Live strategy", label: "Strategy" },
    { id: "gate", role: "Risk check", label: "Gate" },
    { id: "mysql", role: "Loss ledger", label: "MySQL" },
    { id: "broker", role: "Orders", label: "Broker" },
    { id: "telegram", role: "Alerts", label: "Telegram" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "After a restart the ledger of today's loss cannot be read. A short of 65 is still open.",
      facts: { strategy: "short 65 open", mysql: "slow" },
    },
    {
      seconds: 4.8,
      caption: "The strategy wants a new entry. The gate must check the day's loss before it agrees.",
      move: { from: "strategy", to: "gate", label: "enter another short", tone: "request" },
      facts: { gate: "limit ₹5,000" },
    },
    {
      seconds: 5,
      caption: "The gate asks the ledger how much has been lost so far today.",
      move: { from: "gate", to: "mysql", label: "loss so far?", tone: "request" },
      facts: { gate: "waiting" },
      health: { mysql: "slow" },
    },
    {
      seconds: 5.2,
      caption: "No answer. Unknown is not the same as zero, so the gate treats it as a refusal.",
      move: { from: "gate", to: "strategy", label: "entry blocked", tone: "fault" },
      facts: { gate: "ledger unknown", strategy: "entries: closed" },
    },
    {
      seconds: 5.2,
      caption: "A stop-loss now fires on the open short. Closing risk must never wait for the ledger.",
      move: { from: "strategy", to: "gate", label: "exit 65", tone: "request" },
      facts: { gate: "exit: skip check" },
    },
    {
      seconds: 5,
      caption: "The exit goes through. A wrong block on an entry costs a trade; on an exit it costs a position.",
      move: { from: "gate", to: "broker", label: "buy back 65", tone: "commit" },
      facts: { broker: "exit placed", strategy: "exits: open" },
    },
    {
      seconds: 5,
      caption: "Now the fill alert. Telegram is timing out after 10 seconds per call.",
      move: { from: "strategy", to: "telegram", label: "fill alert", tone: "fault" },
      health: { telegram: "slow" },
      facts: { telegram: "10 s per call" },
    },
    {
      seconds: 5.2,
      caption: "Alerts fail open: log the miss, carry on. The fill is already saved in the order table.",
      facts: { strategy: "alert dropped, logged", telegram: "late, not blocking" },
    },
    {
      seconds: 5.2,
      caption: "The ledger returns. Entries reopen, and the block is lifted as a state change.",
      move: { from: "mysql", to: "gate", label: "loss so far ₹800", tone: "reply" },
      health: { mysql: "ok", telegram: "ok" },
      facts: { gate: "₹800 of ₹5,000", strategy: "entries: open" },
    },
  ],
  takeaway: {
    line: "Entries fail closed. Exits stay open.",
    sub: "Decide per action: refuse what can lose money, never refuse what reduces risk.",
    seconds: 5.5,
  },
  lesson: {
    title: "One broken check, two doors",
    watchFor:
      "Look at the strategy's line. Entries flip to closed when the ledger cannot answer, but exits stay open throughout, and a slow Telegram never touches either. Each action gets its own rule.",
  },
};

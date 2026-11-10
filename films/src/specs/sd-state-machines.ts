import type { FlowSpec } from "../kit/types";

/**
 * State machines — the film for `sd-state-machines`.
 *
 * One order, two readers asking the broker, answers arriving out of order.
 * The turn: a stale OPEN arrives after FILLED and is ignored because
 * filled is terminal. Quantities are illustrative.
 */
export const sdStateMachines: FlowSpec = {
  id: "sd-state-machines",
  kicker: "System design · M8",
  title: "Terminal means final",
  nodes: [
    { id: "manager", role: "Order manager", label: "Manager" },
    { id: "poll", role: "Inline reader", label: "Poller" },
    { id: "sweep", role: "Background reader", label: "Sweeper" },
    { id: "broker", role: "Source of truth", label: "Broker" },
  ],
  states: ["submitted", "acknowledged", "partial", "filled"],
  statesLabel: "Order state",
  steps: [
    {
      seconds: 4.4,
      caption: "An order is in exactly one state. Two readers both ask the broker about it.",
    },
    {
      seconds: 4.6,
      caption: "The manager sends an order for 100 and marks it submitted.",
      move: { from: "manager", to: "broker", label: "buy 100", tone: "request" },
      facts: { manager: "100 · submitted" },
      state: "submitted",
    },
    {
      seconds: 5,
      caption: "The broker says trigger pending. Many broker words map to one state: acknowledged.",
      move: { from: "broker", to: "manager", label: "trigger pending", tone: "reply" },
      facts: { manager: "acknowledged", broker: "alive at exchange" },
      state: "acknowledged",
    },
    {
      seconds: 4.8,
      caption: "The poller asks for the status and is slow to hear back. Its answer is already old.",
      move: { from: "poll", to: "broker", label: "status?", tone: "request" },
      health: { poll: "slow" },
      facts: { poll: "waiting on a read" },
    },
    {
      seconds: 4.8,
      caption: "Meanwhile 40 trade. The sweeper asks and hears the newer news.",
      move: { from: "sweep", to: "broker", label: "status?", tone: "request" },
      alsoMove: { from: "broker", to: "manager", label: "filled 40", tone: "commit" },
      facts: { broker: "filled 40 of 100", manager: "partial · 40" },
      state: "partial",
    },
    {
      seconds: 5,
      caption: "All 100 trade. Filled is terminal, so nothing may leave it.",
      move: { from: "broker", to: "sweep", label: "filled 100 of 100", tone: "commit" },
      facts: { sweep: "saw filled" },
    },
    {
      seconds: 4.8,
      caption: "The sweeper tells the manager, and the order is filled.",
      move: { from: "sweep", to: "manager", label: "filled", tone: "reply" },
      facts: { manager: "filled · terminal" },
      state: "filled",
    },
    {
      seconds: 5,
      caption: "Now the poller's old answer lands. It says the order is open.",
      move: { from: "broker", to: "poll", label: "open (stale read)", tone: "reply" },
      health: { poll: "ok" },
      facts: { poll: "thinks: open" },
    },
    {
      seconds: 5.4,
      caption: "The poller tries to move filled back to open. That move is not on the map, so it is dropped.",
      move: { from: "poll", to: "manager", label: "set open", tone: "fault" },
      facts: { manager: "ignored · still filled" },
    },
  ],
  takeaway: {
    line: "A late answer must not undo a final one.",
    sub: "Name the states, mark the terminal ones, and ask 'is this move on the map?' before every update.",
    seconds: 5.5,
  },
  lesson: {
    title: "The stale answer that is ignored",
    watchFor:
      "Watch the line under Manager. It stays filled even though the poller reports open. Only the order's own state decides whether a move is allowed.",
  },
};

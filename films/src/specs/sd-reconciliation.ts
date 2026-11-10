import type { FlowSpec } from "../kit/types";

/**
 * Two books, the broker's wins — the film for `sd-reconciliation`.
 *
 * The engine believes it is short 65 units of a call; the broker shows
 * nothing. Left alone, the stop buys 65 and opens a long. A start-up check
 * drops the ghost, and a broker position the engine does not know is
 * reported, never adopted. Quantities are illustrative.
 */
export const sdReconciliation: FlowSpec = {
  id: "sd-reconciliation",
  kicker: "System design · M9",
  title: "Two books, one truth",
  nodes: [
    { id: "engine", role: "Our record", label: "Engine" },
    { id: "checker", role: "The evening walk", label: "Reconciler" },
    { id: "broker", role: "The real account", label: "Broker" },
    { id: "operator", role: "A person", label: "Operator" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "The engine keeps its own book to act fast. The broker's book is the one with money on it.",
      facts: { engine: "short 65 call", broker: "holds nothing" },
    },
    {
      seconds: 5,
      caption: "Nobody compares them. The engine's stop fires and buys back a position that does not exist.",
      move: { from: "engine", to: "broker", label: "stop: buy 65", tone: "fault" },
      facts: { engine: "thinks it is flat", broker: "now long 65" },
    },
    {
      seconds: 4.6,
      caption: "Rewind. On start-up, when memory is least reliable, the engine asks for the broker's book.",
      move: { from: "checker", to: "broker", label: "positions?", tone: "request" },
      facts: { engine: "short 65 call", broker: "holds nothing", checker: "start-up check" },
    },
    {
      seconds: 4.8,
      caption: "The broker holds nothing. The engine's 65 is a ghost: its exit would open the opposite position.",
      move: { from: "broker", to: "checker", label: "no positions", tone: "reply" },
      facts: { checker: "ghost: engine 65, broker 0" },
    },
    {
      seconds: 4.8,
      caption: "A ghost is safe to repair. Drop it from our record and never trade to match it.",
      move: { from: "checker", to: "engine", label: "drop ghost", tone: "commit" },
      facts: { engine: "flat · stop removed", checker: "fixed: broker's number" },
    },
    {
      seconds: 4.8,
      caption: "At 11:00 the broker shows 130 of a put that the engine has no record of.",
      move: { from: "broker", to: "checker", label: "long 130 put", tone: "reply" },
      facts: { broker: "long 130 put", checker: "untracked: no entry, no stop" },
    },
    {
      seconds: 5,
      caption: "Adopting it would invent an entry price and a stop. So report it and let a person decide.",
      move: { from: "checker", to: "operator", label: "alert: untracked 130", tone: "fault" },
      facts: { operator: "decides: attach or close" },
    },
    {
      seconds: 5,
      caption: "A fill seconds ago makes the books differ briefly. One difference is not yet an alert.",
      move: { from: "checker", to: "broker", label: "positions? (15 min on)", tone: "request" },
      facts: { checker: "differs once · waiting", engine: "bought 65 a moment ago" },
    },
    {
      seconds: 5,
      caption: "Both books agree on the second check. A daily digest says so, so quiet means clean.",
      move: { from: "broker", to: "checker", label: "65 · matches", tone: "reply" },
      facts: { engine: "long 65", broker: "long 65", checker: "agree · no alert" },
    },
  ],
  takeaway: {
    line: "Your book is a cache of the broker's.",
    sub: "Fix your record or alert a person. Never place orders to make the broker match you.",
    seconds: 5.5,
  },
  lesson: {
    title: "The evening walk",
    watchFor:
      "Compare the Engine and Broker lines. First they disagree and a stop makes it worse. After the check they either match, or the gap goes to a person rather than being guessed.",
  },
};

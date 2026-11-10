import type { FlowSpec } from "../kit/types";

/**
 * Consistency — the film for `sd-consistency`.
 *
 * A position has a record (MySQL), a copy (Redis) and an owner (the broker).
 * A manual exit at the broker makes them disagree; the 15-minute check finds
 * it and the owner wins.
 */
export const sdConsistency: FlowSpec = {
  id: "sd-consistency",
  kicker: "System design · M3",
  title: "Who owns the fact",
  nodes: [
    { id: "engine", role: "Live trading", label: "Engine" },
    { id: "redis", role: "A copy", label: "Redis" },
    { id: "mysql", role: "Our record", label: "MySQL" },
    { id: "broker", role: "The owner", label: "Broker" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Every fact needs one owner. Everything else is a copy to rebuild or to check.",
    },
    {
      seconds: 4.6,
      caption: "For a live order the broker is the owner. It holds the full states, such as partly filled.",
      move: { from: "engine", to: "broker", label: "buy 65", tone: "request" },
      facts: { broker: "owns the order" },
    },
    {
      seconds: 4.6,
      caption: "The broker reports the fill, and the engine knows it holds 65.",
      move: { from: "broker", to: "engine", label: "filled 65", tone: "reply" },
      facts: { broker: "book: 65", engine: "position: 65" },
    },
    {
      seconds: 5.4,
      caption: "The engine writes the record to MySQL and a fast copy to Redis.",
      move: { from: "engine", to: "mysql", label: "record: 65", tone: "commit" },
      alsoMove: { from: "engine", to: "redis", label: "copy: 65", tone: "commit" },
      facts: { mysql: "row: 65", redis: "copy: 65" },
    },
    {
      seconds: 5.4,
      caption: "The trader exits 25 in the broker's own app. Our engine never hears about it.",
      move: { from: "broker", to: "engine", label: "exit 25: not heard", tone: "fault" },
      facts: { broker: "book: 40", engine: "still thinks 65", mysql: "row: 65 · stale" },
    },
    {
      seconds: 5,
      caption: "Every 15 minutes the engine compares its MySQL row with the broker's own book.",
      move: { from: "engine", to: "broker", label: "your positions?", tone: "request" },
      facts: { engine: "check · every 15 min" },
    },
    {
      seconds: 5.4,
      caption: "They disagree: 65 against 40. The broker is the owner, so the broker wins.",
      move: { from: "broker", to: "engine", label: "book: 40", tone: "fault" },
      facts: { engine: "mismatch: 65 vs 40" },
    },
    {
      seconds: 5.4,
      caption: "Repair the record and the copy from the owner, and raise an alert so a person sees it.",
      move: { from: "engine", to: "mysql", label: "fix row: 40", tone: "commit" },
      alsoMove: { from: "engine", to: "redis", label: "fix copy: 40", tone: "commit" },
      facts: { mysql: "row: 40", redis: "copy: 40", engine: "alert raised" },
    },
    {
      seconds: 5.4,
      caption: "A progress bar may lag by seconds. A position may not, so it gets a durable row and a check.",
      move: { from: "mysql", to: "engine", label: "progress: 62%", tone: "reply" },
      facts: { engine: "polls every 4 s" },
    },
  ],
  takeaway: {
    line: "One owner per fact; copies get checked.",
    sub: "Buy strong agreement only where a wrong value costs money. Let the rest lag.",
    seconds: 5.5,
  },
  lesson: {
    title: "Two copies and an owner",
    watchFor:
      "Watch the numbers under the engine, MySQL and the broker. After the trader exits at the broker, one says 65 and the other says 40, until the check compares them and the owner's number wins.",
  },
};

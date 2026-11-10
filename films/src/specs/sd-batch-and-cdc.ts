import type { FlowSpec } from "../kit/types";

/**
 * Batch and change data capture — the film for `sd-batch-and-cdc`.
 *
 * A dual write leaves a search index stale. Reading the database's own change
 * log instead feeds the index through an event log that survives the index
 * being down, and can be replayed to rebuild it. Positions are illustrative.
 */
export const sdBatchAndCdc: FlowSpec = {
  id: "sd-batch-and-cdc",
  kicker: "System design · M5",
  title: "Let the database log feed the rest",
  nodes: [
    { id: "app", role: "Your code", label: "App" },
    { id: "db", role: "Source of truth", label: "MySQL" },
    { id: "cdc", role: "Reads the binlog", label: "CDC" },
    { id: "log", role: "Event log", label: "Log" },
    { id: "search", role: "Derived copy", label: "Search" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "A price must live in MySQL and in a search index. How do we keep the two in step?",
      facts: { db: "price 100", search: "price 100" },
    },
    {
      seconds: 4.6,
      caption: "The naive way is a dual write. First the app updates MySQL, and that works.",
      move: { from: "app", to: "db", label: "price = 120", tone: "commit" },
      facts: { db: "price 120" },
    },
    {
      seconds: 5.2,
      caption: "Then the search update fails. The app cannot undo MySQL, so the two copies now disagree.",
      move: { from: "app", to: "search", label: "index price 120", tone: "fault" },
      health: { search: "down" },
      facts: { search: "stale: 100" },
    },
    {
      seconds: 5,
      caption: "The fix is one write only. The app updates MySQL, which records the change in its binlog.",
      move: { from: "app", to: "db", label: "price = 125", tone: "commit" },
      facts: { db: "price 125 · @101" },
    },
    {
      seconds: 5,
      caption: "A CDC tool reads that binlog from its saved position and sees the before and after values.",
      move: { from: "db", to: "cdc", label: "120 → 125 @101", tone: "request" },
      facts: { cdc: "read @101" },
    },
    {
      seconds: 5.2,
      caption: "It publishes the change as an event. The log holds it even though Search is still down.",
      move: { from: "cdc", to: "log", label: "event: price 125", tone: "commit" },
      facts: { log: "offset 7 · kept", cdc: "saved @101" },
    },
    {
      seconds: 5.2,
      caption: "Search comes back and reads from where it stopped, so it catches up on its own.",
      move: { from: "log", to: "search", label: "events to 7", tone: "reply" },
      health: { search: "ok" },
      facts: { search: "price 125 · in step" },
    },
    {
      seconds: 5.4,
      caption: "If CDC crashes before saving its place, it resends @101, so Search must tolerate repeats.",
      move: { from: "cdc", to: "log", label: "resend @101", tone: "fault" },
      facts: { log: "offset 8 · repeat", search: "ignores repeat" },
    },
    {
      seconds: 5.4,
      caption: "A new index is just a replay of the log from the start. Derived data can always be rebuilt.",
      move: { from: "log", to: "search", label: "replay from 0", tone: "commit" },
      facts: { search: "rebuilt: price 125" },
    },
  ],
  takeaway: {
    line: "Write once, then derive everything else.",
    sub: "Use the database's own log as the source, and treat every copy as something you can replay.",
    seconds: 5.5,
  },
  lesson: {
    title: "One write, many copies",
    watchFor:
      "Compare the line under Search at the failed dual write ('stale: 100') with the line after CDC catches up ('in step'). The event log is what bridges the gap while Search was down.",
  },
};

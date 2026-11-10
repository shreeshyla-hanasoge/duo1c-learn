import type { FlowSpec } from "../kit/types";

/**
 * Crash recovery and durable state — the film for `sd-crash-recovery`.
 *
 * An open NIFTY short, a Redis eviction, a crash, and a layered recovery:
 * cache first, then the MySQL row, then the broker as the last word. The
 * quantity is illustrative.
 */
export const sdCrashRecovery: FlowSpec = {
  id: "sd-crash-recovery",
  kicker: "System design · M7",
  title: "Coming back after a crash",
  nodes: [
    { id: "engine", role: "Strategy engine", label: "Engine" },
    { id: "redis", role: "Cache", label: "Redis" },
    { id: "mysql", role: "Durable table", label: "MySQL" },
    { id: "broker", role: "The real book", label: "Broker" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A short NIFTY position of 65 is open. The engine holds it in memory, which dies with the process.",
      facts: { engine: "short 65 · memory", broker: "short 65" },
    },
    {
      seconds: 5,
      caption: "So the position is copied twice: a fast cache key, and a durable row that survives a restart.",
      move: { from: "engine", to: "redis", label: "save position", tone: "commit" },
      alsoMove: { from: "engine", to: "mysql", label: "save position", tone: "commit" },
      facts: { redis: "key: short 65", mysql: "row: short 65" },
    },
    {
      seconds: 5,
      caption: "Redis fills up and evicts keys by memory pressure. A 30 day expiry promises nothing.",
      move: { from: "engine", to: "redis", label: "burst of new keys", tone: "fault" },
      facts: { redis: "position key gone" },
    },
    {
      seconds: 4.8,
      caption: "Then the engine dies, perhaps from a deploy. Everything it knew in memory is gone.",
      health: { engine: "down" },
      facts: { engine: "dead · memory lost" },
    },
    {
      seconds: 4.8,
      caption: "The new process starts knowing nothing. It asks the cache first, because the cache is fast.",
      move: { from: "engine", to: "redis", label: "load positions", tone: "request" },
      health: { engine: "ok" },
      facts: { engine: "new process" },
    },
    {
      seconds: 5.2,
      caption: "Empty. Trusting this would mean no position, and an exit that fires would find nothing to close.",
      move: { from: "redis", to: "engine", label: "nothing found", tone: "fault" },
      facts: { engine: "thinks it is flat" },
    },
    {
      seconds: 4.8,
      caption: "So recovery goes on to the durable table, which only loses data if a write failed.",
      move: { from: "engine", to: "mysql", label: "load live_positions", tone: "request" },
    },
    {
      seconds: 5,
      caption: "The row is there. The engine now holds the position again, but only as a recorded copy.",
      move: { from: "mysql", to: "engine", label: "short 65", tone: "reply" },
      facts: { engine: "short 65 · from row" },
    },
    {
      seconds: 4.8,
      caption: "Copies can be stale, so the engine asks the one place that owns the truth.",
      move: { from: "engine", to: "broker", label: "what do you hold?", tone: "request" },
    },
    {
      seconds: 5.2,
      caption: "The broker agrees, so the engine is safe to manage the exit. Redis is refilled within minutes.",
      move: { from: "broker", to: "engine", label: "short 65", tone: "commit" },
      facts: { engine: "confirmed · exits armed", redis: "key rewritten" },
    },
  ],
  takeaway: {
    line: "A cache is a copy. The broker is the truth.",
    sub: "Rebuild from the durable store, then check against the broker before the first evaluation.",
    seconds: 5.5,
  },
  lesson: {
    title: "Four copies of one position",
    watchFor:
      "Follow the engine's line. It goes from short 65 in memory to nothing after the crash, then back through the table, and finally confirmed by the broker. The empty cache is the trap.",
  },
};

import type { FlowSpec } from "../kit/types";

/**
 * Caching and pre-warming — the film for `sd-caching`.
 *
 * Candles are warmed before the open. Then Redis evicts the key of an open
 * live position, and the durable MySQL row rebuilds it.
 */
export const sdCaching: FlowSpec = {
  id: "sd-caching",
  kicker: "System design · M2",
  title: "A cache is a copy you can lose",
  nodes: [
    { id: "broker", role: "The source", label: "Broker" },
    { id: "redis", role: "Cache", label: "Redis" },
    { id: "engine", role: "Live trading", label: "Engine" },
    { id: "mysql", role: "The record", label: "MySQL" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A cache is fast because it is a copy. Anything in it must also exist somewhere durable.",
    },
    {
      seconds: 5,
      caption: "Before 09:15, a job pre-warms candles so the first rush does not queue at the broker.",
      move: { from: "broker", to: "redis", label: "5 days of candles", tone: "commit" },
      facts: { broker: "pre-open job", redis: "warm · lives 24 h" },
    },
    {
      seconds: 4.6,
      caption: "At the open, every strategy asks Redis first and finds its candles waiting: a hit.",
      move: { from: "redis", to: "engine", label: "hit: candles", tone: "reply" },
      facts: { engine: "first rush: all hits" },
    },
    {
      seconds: 5,
      caption: "A new symbol is a miss. The engine reads the broker, stores the result, and returns it.",
      move: { from: "engine", to: "broker", label: "miss: fetch symbol", tone: "request" },
      facts: { redis: "+1 symbol cached", engine: "cache-aside" },
    },
    {
      seconds: 5.4,
      caption: "An open position is written twice. Redis is the fast copy; the MySQL row is the record.",
      move: { from: "engine", to: "redis", label: "position: 65", tone: "commit" },
      alsoMove: { from: "engine", to: "mysql", label: "live_positions row", tone: "commit" },
      facts: { redis: "position: 65 (copy)", mysql: "row: 65 (record)" },
    },
    {
      seconds: 5.4,
      caption: "Redis has a memory cap and may evict any key. In September 2026 it dropped a live position's key.",
      move: { from: "redis", to: "engine", label: "key not found", tone: "fault" },
      health: { redis: "slow" },
      facts: { redis: "full · key evicted", engine: "restart: sees nothing" },
    },
    {
      seconds: 5.4,
      caption: "Had Redis been the only copy, the position was gone. The MySQL row still holds it.",
      move: { from: "mysql", to: "engine", label: "row: position 65", tone: "reply" },
      facts: { engine: "rebuilt: 65", mysql: "row: 65 (record)" },
    },
    {
      seconds: 5,
      caption: "The engine now rebuilds from the row at start and rewrites the Redis key every five minutes.",
      move: { from: "engine", to: "redis", label: "rewrite position", tone: "commit" },
      health: { redis: "ok" },
      facts: { redis: "position: 65 (copy)" },
    },
    {
      seconds: 5.4,
      caption: "Lifetime follows how fast truth changes: 60 seconds for a live chain, seven days once closed.",
      move: { from: "engine", to: "redis", label: "chain chunk", tone: "commit" },
      facts: { redis: "live 60 s · closed 7 d" },
    },
  ],
  takeaway: {
    line: "A cache failure must never be a correctness failure.",
    sub: "Cache what you can rebuild. Keep anything you cannot rebuild in a database.",
    seconds: 5.5,
  },
  lesson: {
    title: "The key Redis evicted",
    watchFor:
      "Watch the line under Redis and the line under MySQL. When Redis loses the position, the MySQL row is what lets the engine say 'rebuilt: 65'. The copy can vanish; the record cannot.",
  },
};

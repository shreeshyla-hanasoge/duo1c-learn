import type { FlowSpec } from "../kit/types";

/**
 * Feed ingestion — the film for `sd-feed-ingestion`.
 *
 * A broker pushes binary frames. The film decodes one, shows a heartbeat, then
 * the lesson's token trap: two names for one token, and a strategy that sees
 * nothing. Then the fix and a reconnect that replays subscriptions.
 */
export const sdFeedIngestion: FlowSpec = {
  id: "sd-feed-ingestion",
  kicker: "System design · M5",
  title: "From bytes to ticks",
  nodes: [
    { id: "kite", role: "Broker feed", label: "Kite" },
    { id: "parser", role: "Feed handler", label: "Parser" },
    { id: "a", role: "Strategy", label: "CRUDEOIL" },
    { id: "b", role: "Strategy", label: "CRUDEOIL1!" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "One socket pushes bytes for hours. The parser must turn them into named ticks.",
      facts: { parser: "1 socket open", a: "subscribed", b: "subscribed" },
    },
    {
      seconds: 5,
      caption: "A packet has a numeric token and a price in paise. We divide the price by 100.",
      move: { from: "kite", to: "parser", label: "8 bytes · 2245075", tone: "request" },
      facts: { kite: "frame sent", parser: "price 22,450.75" },
    },
    {
      seconds: 4.8,
      caption: "A one-byte frame is a heartbeat. It gives no tick, but it proves the socket lives.",
      move: { from: "kite", to: "parser", label: "1 byte · heartbeat", tone: "request" },
      facts: { parser: "alive · no tick" },
    },
    {
      seconds: 5,
      caption: "Both names map to one front-month future, so one token serves two names.",
      move: { from: "kite", to: "parser", label: "crude tick", tone: "request" },
      facts: { parser: "1 token → 2 names" },
    },
    {
      seconds: 5,
      caption: "The old parser stamps only the first name. That strategy gets its tick.",
      move: { from: "parser", to: "a", label: "tick · CRUDEOIL", tone: "commit" },
      facts: { a: "ticks arriving", parser: "stamped 1 name" },
    },
    {
      seconds: 5.2,
      caption: "The second strategy hears nothing all day. The socket looks healthy; its symbol is dark.",
      move: { from: "parser", to: "b", label: "nothing sent", tone: "fault" },
      health: { b: "down" },
      facts: { b: "silent all day" },
    },
    {
      seconds: 5.2,
      caption: "The fix: deliver one copy of the tick for every name that maps to the token.",
      move: { from: "parser", to: "a", label: "tick · CRUDEOIL", tone: "commit" },
      alsoMove: { from: "parser", to: "b", label: "tick · CRUDEOIL1!", tone: "commit" },
      health: { b: "ok" },
      facts: { parser: "stamped 2 names", a: "ticks arriving", b: "ticks arriving" },
    },
    {
      seconds: 5,
      caption: "The socket drops. A new socket knows nothing, so it starts with no subscriptions.",
      move: { from: "kite", to: "parser", label: "connection lost", tone: "fault" },
      health: { kite: "down" },
      facts: { parser: "retry in 2 s", a: "dark", b: "dark" },
    },
    {
      seconds: 5.2,
      caption: "On reconnect the parser replays every subscription, each in its old mode.",
      move: { from: "parser", to: "kite", label: "resubscribe all", tone: "request" },
      health: { kite: "ok" },
      facts: { kite: "2 symbols asked", parser: "replayed all" },
    },
  ],
  takeaway: {
    line: "Silence on one symbol is not silence on the socket.",
    sub: "Stamp every name a token serves, and replay every subscription after a reconnect.",
    seconds: 5.5,
  },
  lesson: {
    title: "One token, two names",
    watchFor:
      "Watch the second strategy's line. It reads 'silent all day' while the first one hears ticks on the same socket. Then see the parser's line change from stamping one name to stamping two.",
  },
};

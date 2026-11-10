import type { FlowSpec } from "../kit/types";

/**
 * Adapters and daily tokens — the film for `sd-broker-adapters`.
 *
 * The engine speaks one language; the adapter translates. The turn is the
 * next morning, when a client still holds yesterday's token: a read reloads
 * and retries once, a write that times out is never retried blind.
 */
export const sdBrokerAdapters: FlowSpec = {
  id: "sd-broker-adapters",
  kicker: "System design · M9",
  title: "One language, many brokers",
  nodes: [
    { id: "engine", role: "One vocabulary", label: "Engine" },
    { id: "adapter", role: "Translator", label: "Adapter" },
    { id: "broker", role: "Kite, Groww", label: "Broker" },
    { id: "job", role: "08:30 login", label: "Token job" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "The engine speaks one language. Each broker speaks its own. The adapter sits between.",
      facts: { adapter: "client built 23:18", job: "token: yesterday's" },
    },
    {
      seconds: 4.6,
      caption: "The engine says 'place order' in the one internal form, whichever broker it is.",
      move: { from: "engine", to: "adapter", label: "place order", tone: "request" },
      facts: { engine: "does not know the broker" },
    },
    {
      seconds: 4.8,
      caption: "The adapter translates the symbol and fields into the broker's own words.",
      move: { from: "adapter", to: "broker", label: "broker's format", tone: "request" },
      facts: { adapter: "symbol translated", broker: "order accepted" },
    },
    {
      seconds: 4.8,
      caption: "However messy the broker's reply, the adapter squeezes it into placed, rejected or unknown.",
      move: { from: "adapter", to: "engine", label: "PLACED", tone: "reply" },
      facts: { engine: "outcome: PLACED", adapter: "retry logic written once" },
    },
    {
      seconds: 4.8,
      caption: "Next morning the token job logs in and stores a fresh token. It lasts about a day.",
      move: { from: "job", to: "broker", label: "login · new token", tone: "commit" },
      facts: { job: "token: today's, stored", adapter: "still holds yesterday's" },
    },
    {
      seconds: 4.6,
      caption: "The adapter was built at 23:18, so it reads positions with the old token.",
      move: { from: "adapter", to: "broker", label: "positions (old token)", tone: "request" },
      facts: { adapter: "stale client" },
    },
    {
      seconds: 4.8,
      caption: "The broker refuses it. A token error is a real credential problem, so the adapter reloads.",
      move: { from: "broker", to: "adapter", label: "403 token error", tone: "fault" },
      facts: { broker: "rejects yesterday's key", adapter: "reloads stored token" },
    },
    {
      seconds: 5,
      caption: "A read is safe to repeat. One retry with the stored token works.",
      move: { from: "adapter", to: "broker", label: "positions (new token)", tone: "request" },
      facts: { adapter: "token: today's", broker: "positions returned" },
    },
    {
      seconds: 5,
      caption: "A write is different. A timeout does not tell you whether the order arrived.",
      move: { from: "broker", to: "adapter", label: "no answer", tone: "fault" },
      health: { broker: "slow" },
      facts: { adapter: "outcome: UNKNOWN" },
    },
    {
      seconds: 5.2,
      caption: "Never retry a write blind, since a second order may duplicate the first. Check status first.",
      move: { from: "adapter", to: "engine", label: "UNKNOWN · check first", tone: "fault" },
      health: { broker: "ok" },
      facts: { engine: "asks status before retrying", adapter: "credential stays active" },
    },
  ],
  takeaway: {
    line: "Three outcomes: placed, rejected, unknown.",
    sub: "Retry reads freely. Never blame a good credential for a timeout.",
    seconds: 5.5,
  },
  lesson: {
    title: "Yesterday's key",
    watchFor:
      "Watch the Adapter line. It starts with a client from 23:18, fails with yesterday's token, reloads and retries once, then reports UNKNOWN rather than repeating a write.",
  },
};

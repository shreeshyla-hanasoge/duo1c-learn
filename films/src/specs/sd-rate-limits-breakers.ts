import type { FlowSpec } from "../kit/types";

/**
 * Rate limits, retries and breakers — the film for `sd-rate-limits-breakers`.
 *
 * 50 history calls hit a 3-a-second limit, then a timed-out order that must
 * be checked before any retry, then a breaker that opens after 3 failures.
 */
export const sdRateLimitsBreakers: FlowSpec = {
  id: "sd-rate-limits-breakers",
  kicker: "System design · M6",
  title: "Pace, check, then stop",
  nodes: [
    { id: "strategy", role: "50 symbols", label: "Strategy" },
    { id: "limiter", role: "Token bucket", label: "Limiter" },
    { id: "breaker", role: "Order breaker", label: "Breaker" },
    { id: "broker", role: "About 3 calls/s", label: "Broker" },
  ],
  states: ["closed", "open", "retry"],
  statesLabel: "Order breaker",
  steps: [
    {
      seconds: 4.6,
      caption: "At a bar boundary 50 symbols ask for history together. The broker allows about three a second.",
      state: "closed",
    },
    {
      seconds: 5,
      caption: "Unpaced, about three succeed and 47 are told 429, too many requests.",
      move: { from: "strategy", to: "broker", label: "50 calls at once", tone: "fault" },
      health: { broker: "slow" },
      facts: { broker: "3 served · 47 × 429" },
    },
    {
      seconds: 5,
      caption: "So pace on your own side. A bucket holds 3 tokens and refills 2.5 a second.",
      move: { from: "strategy", to: "limiter", label: "50 history calls", tone: "request" },
      health: { broker: "ok" },
      facts: { limiter: "bucket: 3 tokens", strategy: "50 waiting" },
    },
    {
      seconds: 5.4,
      caption: "Three go at once, the other 47 follow at 2.5 a second: about 19 seconds, and no 429.",
      move: { from: "limiter", to: "broker", label: "3 now, 47 paced", tone: "commit" },
      facts: { limiter: "47 waiting · 19 s", broker: "all 50 served" },
    },
    {
      seconds: 4.6,
      caption: "Orders are different. A strategy sends one through the breaker, which is closed.",
      move: { from: "strategy", to: "breaker", label: "place order", tone: "request" },
      facts: { breaker: "fails in a row: 0" },
    },
    {
      seconds: 5.4,
      caption: "The call times out after 10 seconds. The order may exist, so the answer is UNKNOWN, not failed.",
      move: { from: "broker", to: "breaker", label: "timeout", tone: "fault" },
      health: { broker: "slow" },
      facts: { breaker: "fails in a row: 1", strategy: "order: UNKNOWN" },
    },
    {
      seconds: 5.4,
      caption: "After 3 seconds, read the broker's order book and look for the order's tag. Never blind-retry.",
      move: { from: "breaker", to: "broker", label: "find my tag", tone: "request" },
      state: "retry",
      facts: { breaker: "checking the book" },
    },
    {
      seconds: 5.4,
      caption: "Found means done. Absent allows one re-placement, and never more than two in total.",
      move: { from: "broker", to: "breaker", label: "tag found: placed", tone: "reply" },
      facts: { strategy: "order: done · no retry", breaker: "fails in a row: 0" },
    },
    {
      seconds: 5.6,
      caption: "Three failures in a row open the breaker for five minutes. Calls are refused while it recovers.",
      move: { from: "breaker", to: "strategy", label: "refused: breaker open", tone: "fault" },
      health: { broker: "down" },
      state: "open",
      facts: { breaker: "OPEN · 5 min", strategy: "temporary, not rejected" },
    },
  ],
  takeaway: {
    line: "Pace calls, check before retrying, then stop.",
    sub: "Never retry an order blindly: a timeout means unknown. Let a breaker give a failing broker room.",
    seconds: 5.5,
  },
  lesson: {
    title: "Fifty calls and one order",
    watchFor:
      "Watch the line under the strategy and the breaker chip row. A timeout turns the order into UNKNOWN, not failed; only a check of the order book settles it, and only repeated failures open the breaker.",
  },
};

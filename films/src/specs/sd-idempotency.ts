import type { FlowSpec } from "../kit/types";

/**
 * Idempotency and safe retries — the film for `sd-idempotency`.
 *
 * One live order times out after it actually landed. The film shows why a
 * blind retry doubles the position, and the tag-then-look-up fix. Numbers are
 * the lesson's own: 130 units at ₹120 is ₹15,600.
 */
export const sdIdempotency: FlowSpec = {
  id: "sd-idempotency",
  kicker: "System design · M5",
  title: "Retry without trading twice",
  nodes: [
    { id: "strategy", role: "Your code", label: "Strategy" },
    { id: "platform", role: "Order manager", label: "Platform" },
    { id: "broker", role: "Broker API", label: "Broker" },
    { id: "book", role: "Order book", label: "Book" },
  ],
  steps: [
    {
      seconds: 4.2,
      caption: "One signal should make one order. The network does not promise that.",
      facts: { platform: "placements: 0 of 2", book: "orders: 0" },
    },
    {
      seconds: 4.6,
      caption: "The platform stamps a tag on the order before the first attempt.",
      move: { from: "strategy", to: "platform", label: "buy 130 at ₹120", tone: "request" },
      facts: { strategy: "one intent", platform: "tag T-81 made" },
    },
    {
      seconds: 4.6,
      caption: "It sends the order to the broker, carrying the tag.",
      move: { from: "platform", to: "broker", label: "place · T-81", tone: "request" },
      facts: { platform: "placements: 1 of 2", broker: "received T-81" },
    },
    {
      seconds: 4.8,
      caption: "The order lands in the book. That is a real position of ₹15,600.",
      move: { from: "broker", to: "book", label: "order · T-81", tone: "commit" },
      facts: { book: "orders: 1 · T-81" },
    },
    {
      seconds: 5,
      caption: "The reply is lost on the way back. The platform sees only a timeout.",
      move: { from: "broker", to: "platform", label: "order id", tone: "fault" },
      health: { broker: "slow" },
      facts: { platform: "timeout · state unknown" },
    },
    {
      seconds: 5.2,
      caption: "A blind resend now would add a second ₹15,600 order, with no stop on it.",
      move: { from: "platform", to: "broker", label: "resend (no check)", tone: "fault" },
      facts: { platform: "would be: orders 2", book: "would be: ₹31,200" },
    },
    {
      seconds: 5,
      caption: "So the platform does not resend. It waits, then reads the order book.",
      move: { from: "platform", to: "book", label: "any order tagged T-81?", tone: "request" },
      health: { broker: "ok" },
      facts: { platform: "waited 3 s · checking", book: "orders: 1 · T-81" },
    },
    {
      seconds: 5,
      caption: "The tag is there. The first attempt worked, so the retry is not needed.",
      move: { from: "book", to: "platform", label: "found · T-81", tone: "reply" },
      facts: { platform: "placed once · no retry", book: "orders: 1" },
    },
    {
      seconds: 4.8,
      caption: "Had the read failed, the platform would stop and alert. Unknown is not absent.",
      move: { from: "platform", to: "strategy", label: "order live · T-81", tone: "commit" },
      facts: { strategy: "one order, one effect", platform: "placements: 1 of 2" },
    },
  ],
  takeaway: {
    line: "After a timeout, look before you retry.",
    sub: "Tag every order, search for the tag, and treat 'could not check' as 'do not know'.",
    seconds: 5.5,
  },
  lesson: {
    title: "A timeout that was a success",
    watchFor:
      "Watch the platform's line and the book's order count. The platform says 'state unknown' while the book already holds one order. Only the look-up by tag turns unknown into known.",
  },
};

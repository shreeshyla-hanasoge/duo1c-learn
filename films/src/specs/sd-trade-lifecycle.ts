import type { FlowSpec } from "../kit/types";

/**
 * The life of an order — the film for `sd-trade-lifecycle`.
 *
 * It follows the lesson's own worked example: one limit order, an
 * acknowledgement that is not a fill, a partial fill, and fills that arrive
 * as a running total. Quantities and the price are illustrative.
 */
export const sdTradeLifecycle: FlowSpec = {
  id: "sd-trade-lifecycle",
  kicker: "System design · M9",
  title: "The life of an order",
  nodes: [
    { id: "strategy", role: "Your code", label: "Strategy" },
    { id: "platform", role: "Order manager", label: "Platform" },
    { id: "broker", role: "Zerodha, Groww", label: "Broker" },
    { id: "exchange", role: "NSE, MCX", label: "Exchange" },
    { id: "clearing", role: "After the trade", label: "Clearing" },
  ],
  states: ["pending", "open", "partially filled", "complete"],
  statesLabel: "Order state",
  steps: [
    {
      seconds: 4,
      caption: "One order passes through five places. Each one knows something different.",
    },
    {
      seconds: 4.6,
      caption: "A rule fires. The strategy knows only what it intended.",
      move: { from: "strategy", to: "platform", label: "buy 65 at ₹120", tone: "request" },
      facts: { strategy: "wants to buy 65", platform: "order built, tagged" },
    },
    {
      seconds: 4.6,
      caption: "The order leaves. Until an answer comes back, its true state is unknown.",
      move: { from: "platform", to: "broker", label: "place order", tone: "request" },
      facts: { platform: "sent · state unknown", broker: "checking margin" },
      state: "pending",
    },
    {
      seconds: 5,
      caption: "The broker replies with an order id. That is a receipt, not a delivery.",
      move: { from: "broker", to: "platform", label: "order id · open", tone: "reply" },
      facts: { broker: "accepted", platform: "placed, not filled" },
    },
    {
      seconds: 4.6,
      caption: "Only the exchange can match it against other people's orders.",
      move: { from: "broker", to: "exchange", label: "limit order", tone: "request" },
      facts: { exchange: "waiting in the book" },
      state: "open",
    },
    {
      seconds: 5,
      caption: "40 of the 65 trade. A real position of 40 now exists, not 65.",
      move: { from: "exchange", to: "broker", label: "40 traded", tone: "commit" },
      facts: { exchange: "40 of 65 traded", broker: "filled 40 of 65" },
      state: "partially filled",
    },
    {
      seconds: 5,
      caption: "The platform asks the broker and books what the broker reports.",
      move: { from: "broker", to: "platform", label: "filled 40", tone: "reply" },
      facts: { platform: "position is 40" },
    },
    {
      seconds: 4.6,
      caption: "The rest trades. The broker reports a running total: 65.",
      move: { from: "exchange", to: "broker", label: "25 more traded", tone: "commit" },
      facts: { exchange: "65 of 65 traded", broker: "filled 65 of 65" },
      state: "complete",
    },
    {
      seconds: 5.4,
      caption: "Book the difference, 25. Booking the total again would double the position.",
      move: { from: "broker", to: "platform", label: "filled 65", tone: "reply" },
      facts: { platform: "+25 → holds 65" },
    },
    {
      seconds: 4.6,
      caption: "Afterwards, the clearing house makes sure money and position change hands.",
      move: { from: "exchange", to: "clearing", label: "trade to settle", tone: "commit" },
      facts: { clearing: "settles the trade" },
    },
  ],
  takeaway: {
    line: "A receipt is not a delivery.",
    sub: "When the answer is missing, ask whoever owns the fact.",
    seconds: 5.5,
  },
  lesson: {
    title: "One order, five places",
    watchFor:
      "The line under each name is what that place knows right now. Notice how long the platform says 'placed, not filled', and that its position changes only when the broker reports a fill.",
  },
};

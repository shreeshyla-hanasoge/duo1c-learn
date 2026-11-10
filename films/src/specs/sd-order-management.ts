import type { FlowSpec } from "../kit/types";

/**
 * Book fill deltas — the film for `sd-order-management`.
 *
 * One buy of 130 units fills in two pieces. The broker reports a cumulative
 * total each time; the turn is booking that total as if it were new. Prices
 * are the lesson's own example.
 */
export const sdOrderManagement: FlowSpec = {
  id: "sd-order-management",
  kicker: "System design · M9",
  title: "Booking fills as deltas",
  nodes: [
    { id: "strategy", role: "Your rules", label: "Strategy" },
    { id: "oms", role: "Order manager", label: "OMS" },
    { id: "broker", role: "Order book", label: "Broker" },
    { id: "exchange", role: "Matching", label: "Exchange" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "The OMS remembers the order. The broker and exchange decide what really traded.",
    },
    {
      seconds: 4.6,
      caption: "The strategy states a wish. The OMS writes a durable row before anything leaves.",
      move: { from: "strategy", to: "oms", label: "buy 130 units", tone: "request" },
      facts: { strategy: "wants 130", oms: "row saved · booked 0" },
    },
    {
      seconds: 4.6,
      caption: "The order goes out. The OMS keeps the broker's order id beside its own.",
      move: { from: "oms", to: "broker", label: "place buy 130", tone: "request" },
      facts: { oms: "broker id 7 · open", broker: "order 7 open" },
    },
    {
      seconds: 4.6,
      caption: "The exchange fills part of it: 65 units at ₹118.50.",
      move: { from: "exchange", to: "broker", label: "65 at ₹118.50", tone: "commit" },
      facts: { exchange: "65 of 130 traded", broker: "filled 65 · avg 118.50" },
    },
    {
      seconds: 4.8,
      caption: "On each read the broker reports a running total, not the latest piece. This one is 65.",
      move: { from: "broker", to: "oms", label: "filled 65 · avg 118.50", tone: "reply" },
      facts: { oms: "booked 65 · avg 118.50" },
    },
    {
      seconds: 4.6,
      caption: "The other 65 trade at ₹119.00. The broker's total becomes 130.",
      move: { from: "exchange", to: "broker", label: "65 at ₹119.00", tone: "commit" },
      facts: { exchange: "130 of 130 traded", broker: "filled 130 · avg 118.75" },
    },
    {
      seconds: 5.2,
      caption: "A careless OMS books the whole total again. 65 plus 130 says 195, a position that does not exist.",
      move: { from: "broker", to: "oms", label: "filled 130 · 118.75", tone: "fault" },
      facts: { oms: "naive: 65 + 130 = 195" },
    },
    {
      seconds: 5.2,
      caption: "Book the delta instead: new total 130 minus already booked 65 is 65 new units.",
      move: { from: "broker", to: "oms", label: "filled 130 · 118.75", tone: "reply" },
      facts: { oms: "130 − 65 = +65 → 130" },
    },
    {
      seconds: 4.8,
      caption: "The same read arriving twice adds nothing, because the delta is then zero.",
      move: { from: "oms", to: "broker", label: "status of 7?", tone: "request" },
      facts: { oms: "130 − 130 = 0 · done", broker: "order 7 complete" },
    },
    {
      seconds: 4.6,
      caption: "A complete order is final. A late, stale 'open' read must not reopen it.",
      move: { from: "oms", to: "strategy", label: "position 130", tone: "commit" },
      facts: { strategy: "holds 130", oms: "order 7 final" },
    },
  ],
  takeaway: {
    line: "Book the difference, never the total.",
    sub: "New filled minus already booked is the tranche, and it can only be booked once.",
    seconds: 5.5,
  },
  lesson: {
    title: "130 units, two fills",
    watchFor:
      "Watch the line under OMS. It reads 65 after the first fill, then goes wrong at 195 when the total is booked twice, then settles at 130 when only the difference is booked.",
  },
};

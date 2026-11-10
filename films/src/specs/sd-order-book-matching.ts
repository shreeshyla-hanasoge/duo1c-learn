import type { FlowSpec } from "../kit/types";

/**
 * Order-book matching — the film for `sd-order-book-matching`.
 *
 * The lesson's book: bids 400 at 100.00 and 600 at 99.95, asks 200 at 100.10
 * and 500 at 100.15. A market buy of 600 walks the asks; a limit buy of 600
 * at 100.12 takes 200 and rests the other 400.
 */
export const sdOrderBookMatching: FlowSpec = {
  id: "sd-order-book-matching",
  kicker: "System design · M6",
  title: "Walking the book",
  nodes: [
    { id: "strategy", role: "Your code", label: "Strategy" },
    { id: "broker", role: "Broker", label: "Broker" },
    { id: "engine", role: "Matching engine", label: "Exchange" },
    { id: "book", role: "Resting orders", label: "Book" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Best bid is ₹100.00 and best ask is ₹100.10. The ₹0.10 gap is the spread.",
      facts: { book: "ask 200 @ 100.10 · 500 @ 100.15", engine: "bid 100.00 · ask 100.10" },
    },
    {
      seconds: 4.6,
      caption: "The strategy wants 600 now. The screen shows ₹100.10, so it expects that.",
      move: { from: "strategy", to: "broker", label: "market buy 600", tone: "request" },
      facts: { strategy: "expects ₹100.10" },
    },
    {
      seconds: 4.6,
      caption: "The broker forwards it. A market order gets whatever people are willing to give.",
      move: { from: "broker", to: "engine", label: "market buy 600", tone: "request" },
      facts: { engine: "matching in sequence" },
    },
    {
      seconds: 4.8,
      caption: "First the cheapest seller: all 200 at ₹100.10 are taken. That level is now empty.",
      move: { from: "engine", to: "book", label: "take 200 @ 100.10", tone: "commit" },
      facts: { book: "ask 500 @ 100.15", engine: "filled 200 of 600" },
    },
    {
      seconds: 5,
      caption: "Not enough stock at that price, so the order steps up to ₹100.15 for the other 400.",
      move: { from: "engine", to: "book", label: "take 400 @ 100.15", tone: "fault" },
      facts: { book: "ask 100 @ 100.15", engine: "filled 600 of 600" },
    },
    {
      seconds: 5.2,
      caption: "Average price: ₹60,080 over 600 units, about ₹100.13. Size moved the price.",
      move: { from: "engine", to: "broker", label: "600 · avg 100.13", tone: "commit" },
      facts: { broker: "avg ₹100.13" },
    },
    {
      seconds: 4.8,
      caption: "That is slippage: ₹0.03 worse than the screen. A bigger order walks further.",
      move: { from: "broker", to: "strategy", label: "filled · avg 100.13", tone: "reply" },
      facts: { strategy: "paid ₹0.03 extra" },
    },
    {
      seconds: 5.2,
      caption: "Same fresh book, but a limit buy of 600 at ₹100.12. It will never pay more than that.",
      move: { from: "strategy", to: "engine", label: "limit buy 600 @ 100.12", tone: "request" },
      facts: { book: "ask 200 @ 100.10 · 500 @ 100.15", strategy: "limit ₹100.12" },
    },
    {
      seconds: 5.2,
      caption: "It takes the 200 at ₹100.10. The next ask is above its limit, so the other 400 wait.",
      move: { from: "engine", to: "book", label: "take 200 · rest 400", tone: "commit" },
      facts: { book: "bid 400 @ 100.12 (new best)", engine: "filled 200 of 600" },
    },
    {
      seconds: 5,
      caption: "The price is protected, but the fill is partial. The rest may never trade.",
      move: { from: "engine", to: "strategy", label: "partial · 200 of 600", tone: "reply" },
      facts: { strategy: "holds 200, not 600" },
    },
  ],
  takeaway: {
    line: "You get the book's price, not the screen's.",
    sub: "A market order pays for size; a limit order protects price but may fill only in part.",
    seconds: 5.5,
  },
  lesson: {
    title: "600 units, two kinds of order",
    watchFor:
      "Watch the book's ask line shrink: 200 at 100.10 vanish first, then 400 are taken from the 100.15 level. Then see the limit order leave 400 waiting as the new best bid.",
  },
};

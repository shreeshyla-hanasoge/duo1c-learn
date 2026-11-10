import type { FlowSpec } from "../kit/types";

/**
 * Relational versus document — the film for `sd-data-models`.
 *
 * The same address is stored once and joined, then copied into every order
 * document. A customer moves, and the copies show the cost of denormalising.
 * Customer and order ids are illustrative.
 */
export const sdDataModels: FlowSpec = {
  id: "sd-data-models",
  kicker: "System design · M2",
  title: "One fact, one copy, or many",
  nodes: [
    { id: "app", role: "The shop", label: "App" },
    { id: "customers", role: "Relational table", label: "Customers" },
    { id: "orders", role: "Relational table", label: "Orders" },
    { id: "docs", role: "Document store", label: "Documents" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "The same order data can be stored in two shapes. Each shape makes some things easy and others hard.",
    },
    {
      seconds: 4.8,
      caption: "Relational: the customer's address is stored once, in the customers table.",
      move: { from: "app", to: "customers", label: "save customer c7", tone: "commit" },
      facts: { customers: "c7 · 12 Park Rd (1 copy)" },
    },
    {
      seconds: 4.8,
      caption: "Each order holds only the customer's id, not the address.",
      move: { from: "app", to: "orders", label: "orders 1, 2, 3", tone: "commit" },
      facts: { orders: "3 orders · customer c7" },
    },
    {
      seconds: 5.2,
      caption: "To show an order with its address, the database joins the two tables.",
      move: { from: "app", to: "orders", label: "show order 2", tone: "request" },
      alsoMove: { from: "orders", to: "customers", label: "join on c7", tone: "request" },
      facts: { app: "order + address" },
    },
    {
      seconds: 5.2,
      caption: "The customer moves. One update fixes all three orders, and no two copies can disagree.",
      move: { from: "app", to: "customers", label: "c7 → 9 Hill St", tone: "commit" },
      facts: { customers: "c7 · 9 Hill St (1 copy)", orders: "all 3 show 9 Hill St" },
    },
    {
      seconds: 5.2,
      caption: "Document: each order is stored whole, address included, so one read returns it all.",
      move: { from: "app", to: "docs", label: "orders 1, 2, 3", tone: "commit" },
      facts: { docs: "3 docs · 12 Park Rd each" },
    },
    {
      seconds: 5,
      caption: "Reading an order is one fetch by key: fast, and easy to spread over many machines.",
      move: { from: "docs", to: "app", label: "order 2, complete", tone: "reply" },
      facts: { app: "1 read · 0 joins" },
    },
    {
      seconds: 5.4,
      caption: "Now the same move. Only order 3 is updated; the other two copies still say 12 Park Rd.",
      move: { from: "app", to: "docs", label: "address on order 3", tone: "fault" },
      facts: { docs: "order 3: 9 Hill St; 1, 2: old" },
      health: { docs: "slow" },
    },
    {
      seconds: 5.4,
      caption: "Every copy must be updated, or old orders keep the old address. That work is now yours.",
      move: { from: "app", to: "docs", label: "address on 1 and 2", tone: "commit" },
      facts: { docs: "3 copies · 9 Hill St" },
      health: { docs: "ok" },
    },
  ],
  takeaway: {
    line: "A copy makes reads cheap and writes your problem.",
    sub: "Start from your queries. Normalise for correctness; copy deliberately, and own every copy.",
    seconds: 5.5,
  },
  lesson: {
    title: "One address, three copies",
    watchFor:
      "Watch the lines under Customers and Documents when the customer moves. The table changes once and every order is right; the documents each hold their own copy and can fall out of step.",
  },
};

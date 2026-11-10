import type { FlowSpec } from "../kit/types";

/**
 * Design a payment system — the film for `sd-design-payments`.
 *
 * A ₹500 payment whose bank call times out. The outcome is unknown, the
 * client retries safely, a status query settles it, and the ledger posts once.
 */
export const sdDesignPayments: FlowSpec = {
  id: "sd-design-payments",
  kicker: "System design · M10",
  title: "A payment whose outcome is unknown",
  nodes: [
    { id: "client", role: "Payer's app", label: "Client" },
    { id: "api", role: "Checks the key", label: "API" },
    { id: "svc", role: "State machine", label: "Service" },
    { id: "bank", role: "Moves the money", label: "Bank" },
    { id: "ledger", role: "Append-only", label: "Ledger" },
  ],
  states: ["CREATED", "PENDING", "SUCCEEDED"],
  statesLabel: "Payment state",
  steps: [
    {
      seconds: 4.6,
      caption: "A payment of ₹500 is 50,000 paise, a whole number. Money is never a floating-point value.",
    },
    {
      seconds: 4.6,
      caption: "The client sends a key it chose, k-9. If it ever resends, the key says it is the same payment.",
      move: { from: "client", to: "api", label: "pay 50,000 · key k-9", tone: "request" },
      facts: { api: "k-9 is new", client: "waiting" },
      state: "CREATED",
    },
    {
      seconds: 4.6,
      caption: "A payments row is created. A unique index on the key means there can only ever be one.",
      move: { from: "api", to: "svc", label: "create payment", tone: "commit" },
      facts: { svc: "payment 301 · CREATED" },
    },
    {
      seconds: 5,
      caption: "The service asks the bank to debit the payer. From this moment the true state is not ours to know.",
      move: { from: "svc", to: "bank", label: "debit 50,000", tone: "request" },
      facts: { svc: "sent to bank", bank: "working" },
      state: "PENDING",
    },
    {
      seconds: 5.4,
      caption: "The bank call times out. The money may have moved or not. Retrying blindly could debit twice.",
      move: { from: "bank", to: "svc", label: "no answer", tone: "fault" },
      health: { bank: "slow" },
      facts: { svc: "PENDING · outcome unknown" },
    },
    {
      seconds: 5.4,
      caption: "The client loses patience and retries. The key is already known, so no second payment starts.",
      move: { from: "client", to: "api", label: "pay again · key k-9", tone: "request" },
      facts: { api: "k-9 known · still PENDING", client: "told: pending" },
    },
    {
      seconds: 5,
      caption: "The only way out of PENDING is to ask. A status query is safe because it changes nothing.",
      move: { from: "svc", to: "bank", label: "status of k-9?", tone: "request" },
      health: { bank: "ok" },
      facts: { bank: "debit done at 10:02" },
    },
    {
      seconds: 5,
      caption: "The bank says the debit happened. The payment is now certain.",
      move: { from: "bank", to: "svc", label: "debited · success", tone: "reply" },
      facts: { svc: "SUCCEEDED" },
      state: "SUCCEEDED",
    },
    {
      seconds: 5.4,
      caption: "Both legs post in one transaction: debit payer, credit payee. Together they add up to zero.",
      move: { from: "svc", to: "ledger", label: "debit + credit", tone: "commit" },
      facts: { ledger: "2 rows · sum 0" },
    },
    {
      seconds: 5.4,
      caption: "If the post is replayed, a unique key on payment and entry type rejects it. Money cannot double.",
      move: { from: "svc", to: "ledger", label: "post again", tone: "fault" },
      facts: { ledger: "still 2 rows" },
    },
    {
      seconds: 5,
      caption: "At night the bank's settlement file is matched line by line against our ledger.",
      move: { from: "bank", to: "ledger", label: "settlement file", tone: "reply" },
      facts: { ledger: "1 of 1 matched" },
    },
  ],
  takeaway: {
    line: "A timeout is not a failure; it is an unknown.",
    sub: "Hold PENDING until you can ask the bank, and make every retry carry the same key.",
    seconds: 5.5,
  },
  lesson: {
    title: "The payment that timed out",
    watchFor:
      "Watch the chips and the line under the service: PENDING means 'outcome unknown', and it changes only after the bank is asked. The ledger stays at 2 rows even when the post is replayed.",
  },
};

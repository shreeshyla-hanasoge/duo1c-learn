import type { FlowSpec } from "../kit/types";

/**
 * Distributed transactions — the film for `sd-distributed-transactions`.
 *
 * Booking a seat, charging a card and issuing a ticket in three databases.
 * Two-phase commit blocks when the coordinator crashes after the votes; a
 * saga commits each step at once and compensates when the last one fails.
 */
export const sdDistributedTransactions: FlowSpec = {
  id: "sd-distributed-transactions",
  kicker: "System design · M3",
  title: "Two-phase commit, then a saga",
  nodes: [
    { id: "coord", role: "Runs the booking", label: "Coordinator" },
    { id: "seats", role: "Own database", label: "Seats" },
    { id: "pay", role: "Own database", label: "Payment" },
    { id: "tickets", role: "Own database", label: "Tickets" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "One booking changes three databases: hold seat 12A, charge ₹5,000, issue a ticket.",
      facts: { seats: "12A free", pay: "balance ₹9,000", tickets: "none issued" },
    },
    {
      seconds: 5,
      caption: "Two-phase commit, phase one: prepare. Each side does the work, logs it and takes its locks.",
      move: { from: "coord", to: "seats", label: "prepare", tone: "request" },
      alsoMove: { from: "coord", to: "pay", label: "prepare", tone: "request" },
      facts: { seats: "12A locked", pay: "₹5,000 locked" },
    },
    {
      seconds: 4.6,
      caption: "The same request goes to Tickets, which locks its row too.",
      move: { from: "coord", to: "tickets", label: "prepare", tone: "request" },
      facts: { tickets: "ticket row locked" },
    },
    {
      seconds: 5.4,
      caption: "Every side votes yes. A yes is a promise: I can still commit, even after a restart.",
      move: { from: "tickets", to: "coord", label: "vote yes", tone: "reply" },
      facts: { coord: "3 of 3 voted yes" },
    },
    {
      seconds: 5.6,
      caption: "The coordinator crashes before sending the decision. Nobody may commit or abort alone.",
      move: { from: "seats", to: "coord", label: "decision?", tone: "fault" },
      health: { coord: "down" },
      facts: { seats: "yes · locked, waiting", pay: "locked, waiting", tickets: "locked, waiting" },
    },
    {
      seconds: 5.4,
      caption: "That is blocking. Rows stay locked until the coordinator returns. So try a saga instead.",
      move: { from: "coord", to: "seats", label: "book seat 12A", tone: "commit" },
      health: { coord: "ok" },
      facts: { seats: "12A booked, committed", pay: "unlocked", tickets: "unlocked" },
    },
    {
      seconds: 5,
      caption: "A saga commits each step at once, with no cross-service locks. Next the card is charged.",
      move: { from: "coord", to: "pay", label: "charge ₹5,000", tone: "commit" },
      facts: { pay: "charged · ₹4,000 left", coord: "steps 1, 2 done" },
    },
    {
      seconds: 5.4,
      caption: "Issuing the ticket fails. The seat and the money are already committed and cannot roll back.",
      move: { from: "coord", to: "tickets", label: "issue ticket", tone: "fault" },
      health: { tickets: "down" },
      facts: { tickets: "unreachable", coord: "step 3 failed" },
    },
    {
      seconds: 5.4,
      caption: "So run each earlier step's compensation, newest first. First, refund the card.",
      move: { from: "coord", to: "pay", label: "refund ₹5,000", tone: "commit" },
      facts: { pay: "refunded · ₹9,000", coord: "compensating" },
    },
    {
      seconds: 5.4,
      caption: "Then release the seat. Each compensation is safe to retry, so a crash here just repeats it.",
      move: { from: "coord", to: "seats", label: "release seat 12A", tone: "commit" },
      facts: { seats: "12A free again", coord: "booking cancelled" },
    },
  ],
  takeaway: {
    line: "Without a shared commit, plan the way back.",
    sub: "Keep related data in one database if you can. Across services, use sagas with retry-safe compensations.",
    seconds: 5.5,
  },
  lesson: {
    title: "A crashed coordinator, then a saga",
    watchFor:
      "Watch the lines under Seats and Payment: first locked and waiting while the coordinator is down, then committed, then undone. A saga shows half-done states, but it never blocks.",
  },
};

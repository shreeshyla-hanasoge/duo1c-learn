import type { FlowSpec } from "../kit/types";

/**
 * Design a ticket booking system — the film for `sd-design-ticket-booking`.
 *
 * The last berth when a crowd arrives: a read-then-write oversells it, an
 * atomic update does not, and an unpaid hold expires and is released.
 */
export const sdDesignTicketBooking: FlowSpec = {
  id: "sd-design-ticket-booking",
  kicker: "System design · M10",
  title: "The last berth in a rush",
  nodes: [
    { id: "crowd", role: "10 lakh users", label: "Crowd" },
    { id: "room", role: "Virtual queue", label: "Queue" },
    { id: "book", role: "Booking servers", label: "Booking" },
    { id: "inv", role: "Seat counts", label: "Inventory" },
    { id: "pay", role: "External gateway", label: "Payment" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Tatkal opens for 100 berths on one train. Almost everyone will be disappointed.",
      facts: { inv: "available: 100" },
    },
    {
      seconds: 5,
      caption: "A lakh users hit the door at once. The waiting room admits only what booking can handle.",
      move: { from: "crowd", to: "room", label: "83,000 a second", tone: "request" },
      facts: { crowd: "in line", room: "admits at a fixed pace" },
    },
    {
      seconds: 4.6,
      caption: "Each admitted user carries a signed token. Booking servers trust the token and nothing else.",
      move: { from: "room", to: "book", label: "token + request", tone: "request" },
      facts: { book: "inventory is the truth" },
    },
    {
      seconds: 5.4,
      caption: "Naive design: read the count, check it in code, write it back. Two servers read at the same moment.",
      move: { from: "book", to: "inv", label: "A reads: 1 left", tone: "request" },
      alsoMove: { from: "book", to: "inv", label: "B reads: 1 left", tone: "request" },
      facts: { inv: "available: 1", book: "A and B both see 1" },
    },
    {
      seconds: 5.4,
      caption: "Both write back 0 and both tell their user the berth is theirs. One berth now has two owners.",
      move: { from: "book", to: "inv", label: "both write 0", tone: "fault" },
      health: { inv: "slow" },
      facts: { inv: "1 berth · 2 owners" },
    },
    {
      seconds: 5.4,
      caption: "The fix is one atomic statement: subtract 1 only where available is at least 1.",
      move: { from: "book", to: "inv", label: "available-1 if >= 1", tone: "commit" },
      health: { inv: "ok" },
      facts: { inv: "1 → 0 · held 10 min", book: "A holds the berth" },
    },
    {
      seconds: 5,
      caption: "B's identical statement changes zero rows. The database serialises them, so only one can win.",
      move: { from: "inv", to: "book", label: "B: 0 rows changed", tone: "fault" },
      facts: { book: "B told: sold out", inv: "available: 0" },
    },
    {
      seconds: 5,
      caption: "A gets ten minutes to pay. The hold carries an expiry time.",
      move: { from: "book", to: "pay", label: "pay within 10 min", tone: "request" },
      facts: { pay: "waiting for A" },
    },
    {
      seconds: 5.4,
      caption: "A walks away. A sweeper sees the deadline pass and gives the berth back to the crowd.",
      move: { from: "book", to: "inv", label: "release expired hold", tone: "commit" },
      facts: { inv: "available: 1", pay: "no payment" },
    },
    {
      seconds: 5.4,
      caption: "The next person in line takes the same berth and pays in time.",
      move: { from: "pay", to: "book", label: "paid · confirm", tone: "reply" },
      facts: { book: "booking CONFIRMED", inv: "available: 0", crowd: "one lucky user" },
    },
  ],
  takeaway: {
    line: "Never read, check, then write a shared count.",
    sub: "Make the check and the change one atomic step, and give every hold an expiry.",
    seconds: 5.5,
  },
  lesson: {
    title: "One berth, two buyers",
    watchFor:
      "Watch the line under Inventory. The naive path ends at '1 berth · 2 owners'. The atomic path ends at 'available: 0' with exactly one holder, and the number rises back to 1 when a hold expires.",
  },
};

import type { FlowSpec } from "../kit/types";

/**
 * The lost update and its fix — the film for `sd-transactions-isolation`.
 *
 * Two clerks each withdraw ₹100 from a balance of ₹1,000. Read-then-write
 * without a lock loses one withdrawal; SELECT ... FOR UPDATE makes the second
 * clerk wait and read the new balance.
 */
export const sdTransactionsIsolation: FlowSpec = {
  id: "sd-transactions-isolation",
  kicker: "System design · M2",
  title: "Two withdrawals, one lost update",
  nodes: [
    { id: "t1", role: "Transaction 1", label: "Clerk 1" },
    { id: "t2", role: "Transaction 2", label: "Clerk 2" },
    { id: "db", role: "Account row", label: "Database" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "An account holds ₹1,000. Two clerks each withdraw ₹100 at the same moment. It should end at ₹800.",
      facts: { db: "balance ₹1,000" },
    },
    {
      seconds: 4.6,
      caption: "Clerk 1 reads the balance. So far this is safe.",
      move: { from: "t1", to: "db", label: "read balance", tone: "request" },
      facts: { t1: "sees ₹1,000" },
    },
    {
      seconds: 4.6,
      caption: "Clerk 2 reads it before Clerk 1 has written anything, and also sees ₹1,000.",
      move: { from: "t2", to: "db", label: "read balance", tone: "request" },
      facts: { t2: "sees ₹1,000" },
    },
    {
      seconds: 4.6,
      caption: "Clerk 1 subtracts 100 and writes 900.",
      move: { from: "t1", to: "db", label: "write ₹900", tone: "commit" },
      facts: { db: "balance ₹900", t1: "done" },
    },
    {
      seconds: 5.4,
      caption: "Clerk 2 also worked out 900 and writes it, overwriting the first change. A withdrawal vanished.",
      move: { from: "t2", to: "db", label: "write ₹900", tone: "fault" },
      facts: { db: "₹900 · should be ₹800", t2: "done" },
      health: { db: "slow" },
    },
    {
      seconds: 5.2,
      caption: "Replay with a lock. Clerk 1 reads with FOR UPDATE, which holds the row until it commits.",
      move: { from: "t1", to: "db", label: "read FOR UPDATE", tone: "request" },
      facts: { db: "₹1,000 · locked by 1", t1: "sees ₹1,000", t2: "not started" },
      health: { db: "ok" },
    },
    {
      seconds: 5,
      caption: "Clerk 2 asks for the same row and has to wait. It cannot read the old balance.",
      move: { from: "t2", to: "db", label: "read FOR UPDATE", tone: "request" },
      facts: { t2: "waits for the lock" },
      health: { t2: "slow" },
    },
    {
      seconds: 5,
      caption: "Clerk 1 writes 900 and commits, which releases the lock.",
      move: { from: "t1", to: "db", label: "write ₹900, commit", tone: "commit" },
      facts: { db: "₹900 · lock released", t1: "done" },
    },
    {
      seconds: 5,
      caption: "Clerk 2 now gets its turn and reads the balance as it really is.",
      move: { from: "db", to: "t2", label: "balance ₹900", tone: "reply" },
      facts: { t2: "sees ₹900" },
      health: { t2: "ok" },
    },
    {
      seconds: 5,
      caption: "Clerk 2 subtracts 100 from 900. Both withdrawals count.",
      move: { from: "t2", to: "db", label: "write ₹800, commit", tone: "commit" },
      facts: { db: "balance ₹800", t2: "done" },
    },
  ],
  takeaway: {
    line: "Read-then-write needs a lock or a version check.",
    sub: "Lock the row with FOR UPDATE, or write a version number and retry when it has changed.",
    seconds: 5.5,
  },
  lesson: {
    title: "The withdrawal that vanished",
    watchFor:
      "Watch the balance under Database. Without a lock it ends at ₹900 though two withdrawals ran; with a lock the second clerk waits, reads ₹900 and the balance ends at ₹800.",
  },
};

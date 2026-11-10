import type { FlowSpec } from "../kit/types";

/**
 * Multi-tenancy — the film for `sd-multi-tenancy`.
 *
 * Two checks in one flow: isolation (an ownership check returns 403) and
 * fairness (one lane, FIFO, versus a turn for each user). The 6-minute
 * backtest and the 10 + 1 submissions are the lesson's illustrative numbers.
 */
export const sdMultiTenancy: FlowSpec = {
  id: "sd-multi-tenancy",
  kicker: "System design · M8",
  title: "Isolation and the shared lane",
  nodes: [
    { id: "a", role: "Tenant", label: "User A" },
    { id: "b", role: "Tenant", label: "User B" },
    { id: "api", role: "Ownership check", label: "API" },
    { id: "queue", role: "One shared lane", label: "Queue" },
    { id: "worker", role: "1 worker", label: "Worker" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "Two traders share one platform. They need isolation, and they need fairness.",
    },
    {
      seconds: 4.6,
      caption: "User B asks for a strategy by its id. The id belongs to User A.",
      move: { from: "b", to: "api", label: "read strategy 41", tone: "request" },
      facts: { api: "41 belongs to A" },
    },
    {
      seconds: 4.8,
      caption: "A policy checks the owner on every request, so a valid login is not enough.",
      move: { from: "api", to: "b", label: "403 not yours", tone: "fault" },
      facts: { b: "denied" },
    },
    {
      seconds: 4.6,
      caption: "Isolation holds. Now the shared part. User A submits ten backtests.",
      move: { from: "a", to: "api", label: "10 backtests", tone: "request" },
      facts: { a: "10 submitted" },
    },
    {
      seconds: 4.8,
      caption: "All ten join the one lane, in order of arrival.",
      move: { from: "api", to: "queue", label: "10 jobs from A", tone: "commit" },
      facts: { queue: "A: 10 waiting" },
    },
    {
      seconds: 4.8,
      caption: "User B then submits one. Each backtest takes about six minutes.",
      move: { from: "b", to: "queue", label: "1 backtest", tone: "request" },
      facts: { queue: "A: 10 · B: 1 last", worker: "running A1" },
    },
    {
      seconds: 5.2,
      caption: "First in, first out is not fair. B did nothing wrong and waits behind all of A's batch.",
      move: { from: "queue", to: "b", label: "your turn in 60 min", tone: "fault" },
      health: { worker: "slow" },
      facts: { b: "waiting 60 min", worker: "busy with A" },
    },
    {
      seconds: 5.2,
      caption: "Fairer: limit jobs in flight per user and give each user a turn in rotation.",
      move: { from: "queue", to: "worker", label: "next: B1", tone: "commit" },
      health: { worker: "ok" },
      facts: { queue: "turns: A, B, A, A…", worker: "running B1" },
    },
    {
      seconds: 5,
      caption: "B waits one job, 12 minutes in all, instead of an hour.",
      move: { from: "worker", to: "b", label: "B1 done", tone: "reply" },
      facts: { b: "done after 12 min", queue: "A: 9 waiting" },
    },
  ],
  takeaway: {
    line: "Isolation is a lock. Fairness is a schedule.",
    sub: "Check the owner on every request, then cap and rotate the shared lanes.",
    seconds: 5.5,
  },
  lesson: {
    title: "A lock and a turn",
    watchFor:
      "First, the 403 that keeps User B out of A's data. Then watch User B's line: 60 minutes behind a batch in a plain queue, 12 minutes once users take turns.",
  },
};

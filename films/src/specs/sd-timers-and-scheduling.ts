import type { FlowSpec } from "../kit/types";

/**
 * Timers and scheduling — the film for `sd-timers-and-scheduling`.
 *
 * A min-heap hands the scheduler the earliest deadline. Then two schedulers
 * both see the 02:00 backup and run it twice; a unique claim row fixes that,
 * and a missed-run policy covers a desk that was closed.
 */
export const sdTimersAndScheduling: FlowSpec = {
  id: "sd-timers-and-scheduling",
  kicker: "System design · M6",
  title: "One eye on the next deadline",
  nodes: [
    { id: "caller", role: "Sets timers", label: "Caller" },
    { id: "heap", role: "Min-heap", label: "Heap" },
    { id: "a", role: "Scheduler", label: "Sched A" },
    { id: "b", role: "Scheduler", label: "Sched B" },
    { id: "claims", role: "Claim table", label: "Claims" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "A scheduler does not watch every timer. It watches only the one due soonest.",
      facts: { heap: "empty" },
    },
    {
      seconds: 5,
      caption: "A timer for tea in 3 minutes goes in. The heap keeps the earliest deadline at the root.",
      move: { from: "caller", to: "heap", label: "tea in 3 min", tone: "request" },
      facts: { heap: "root: tea 3 min" },
    },
    {
      seconds: 5,
      caption: "Rice in 10 and cake in 40 go in below. Each insert costs about log n steps, not a full sort.",
      move: { from: "caller", to: "heap", label: "rice 10, cake 40", tone: "request" },
      facts: { heap: "root: tea · 3 timers" },
    },
    {
      seconds: 5,
      caption: "Scheduler A sleeps until the root is due, pops tea, and looks at the new root.",
      move: { from: "heap", to: "a", label: "tea is due", tone: "commit" },
      facts: { a: "ran tea", heap: "root: rice 10 min" },
    },
    {
      seconds: 5,
      caption: "Removing cake from the middle is costly, so it is only marked and dropped at the root.",
      move: { from: "caller", to: "heap", label: "cancel cake", tone: "request" },
      facts: { heap: "cake: marked cancelled" },
    },
    {
      seconds: 5.4,
      caption: "For safety there are two schedulers, and both see the 02:00 backup. Both run it.",
      move: { from: "heap", to: "a", label: "02:00 backup", tone: "fault" },
      alsoMove: { from: "heap", to: "b", label: "02:00 backup", tone: "fault" },
      facts: { a: "runs backup", b: "runs backup", heap: "backup ran twice" },
    },
    {
      seconds: 5.2,
      caption: "Fix it with a claim: insert a row for backup at 02:00. A unique key lets only one insert succeed.",
      move: { from: "a", to: "claims", label: "claim backup 02:00", tone: "commit" },
      facts: { claims: "1 row · unique key", a: "won: runs backup" },
    },
    {
      seconds: 5.2,
      caption: "B inserts the same row and is rejected as a duplicate. It skips the job.",
      move: { from: "b", to: "claims", label: "claim backup 02:00", tone: "fault" },
      facts: { claims: "duplicate: rejected", b: "lost: skips" },
    },
    {
      seconds: 5.4,
      caption: "If the desk was closed and reopens at 02:20, the missed run needs a policy: run once to catch up.",
      move: { from: "heap", to: "a", label: "late by 20 min", tone: "fault" },
      facts: { a: "policy: run once", claims: "backup 02:20 claimed" },
    },
  ],
  takeaway: {
    line: "Wake for the earliest; let one machine claim it.",
    sub: "Use a heap or a wheel to find what is due, a unique claim to run it once, and a policy for missed runs.",
    seconds: 5.5,
  },
  lesson: {
    title: "Two clerks, one wake-up call",
    watchFor:
      "Watch the two scheduler boxes at 02:00. First both say runs backup. After the claim row, one says won and the other says lost, and the Claims line shows the duplicate being rejected.",
  },
};

import type { FlowSpec } from "../kit/types";

/**
 * Locks, leases and fencing tokens — the film for `sd-locks-leases`.
 *
 * Worker A holds a 30-second lease and freezes for 40 seconds. The lease
 * expires and B takes over. When A wakes and writes, only the storage's
 * check on the fencing token stops it. Numbers are the lesson's own.
 */
export const sdLocksLeases: FlowSpec = {
  id: "sd-locks-leases",
  kicker: "System design · M4",
  title: "The lease that expired mid-write",
  nodes: [
    { id: "a", role: "Worker", label: "Worker A" },
    { id: "lock", role: "Lease service", label: "Lock" },
    { id: "b", role: "Worker", label: "Worker B" },
    { id: "store", role: "Protected data", label: "Storage" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A lock with a timeout is a lease: permission to act until a deadline, then someone else may act.",
      facts: { lock: "free", store: "max token: none" },
    },
    {
      seconds: 4.6,
      caption: "Worker A asks for the lock. The service grants a lease of 30 seconds.",
      move: { from: "a", to: "lock", label: "acquire lock", tone: "request" },
      facts: { lock: "A holds · 30 s" },
    },
    {
      seconds: 5,
      caption: "The lease comes with a fencing token, a number that only goes up. A is given 33.",
      move: { from: "lock", to: "a", label: "lease · token 33", tone: "reply" },
      facts: { a: "holds · token 33" },
    },
    {
      seconds: 4.8,
      caption: "A writes with its token. The storage remembers the highest token it has seen.",
      move: { from: "a", to: "store", label: "write · token 33", tone: "commit" },
      facts: { store: "accepted · max 33" },
    },
    {
      seconds: 5.4,
      caption: "Now A freezes for 40 seconds in a garbage-collection pause. It cannot know its lease is running out.",
      move: { from: "lock", to: "a", label: "renew?", tone: "fault" },
      health: { a: "slow" },
      facts: { a: "frozen · 40 s", lock: "A silent · ticking" },
    },
    {
      seconds: 5.2,
      caption: "At second 30 the lease expires. B asks, and the lock is given to B with token 34.",
      move: { from: "b", to: "lock", label: "acquire lock", tone: "request" },
      facts: { lock: "B holds · token 34", b: "holds · token 34" },
    },
    {
      seconds: 4.8,
      caption: "B does the job and writes with token 34.",
      move: { from: "b", to: "store", label: "write · token 34", tone: "commit" },
      facts: { store: "accepted · max 34" },
    },
    {
      seconds: 5.4,
      caption: "At second 45 A wakes. Nothing in A says time passed, so it still believes it holds the lock.",
      move: { from: "a", to: "store", label: "write · token 33", tone: "fault" },
      health: { a: "ok" },
      facts: { a: "thinks it holds lock" },
    },
    {
      seconds: 5.4,
      caption: "Storage compares 33 with 34 and refuses. A timeout cannot stop A, but the data can.",
      move: { from: "store", to: "a", label: "rejected: 33 < 34", tone: "fault" },
      facts: { store: "max 34 · refused 33", a: "stale · stops" },
    },
  ],
  takeaway: {
    line: "A lease expires; a paused holder does not know.",
    sub: "Let the resource check a fencing token, so a stale holder is refused at the door.",
    seconds: 5.5,
  },
  lesson: {
    title: "Token 33 meets token 34",
    watchFor:
      "Watch the line under Storage: 'max 33', then 'max 34'. When Worker A wakes and writes with 33, that number is lower than 34 and the storage refuses. The lock service never learns.",
  },
};

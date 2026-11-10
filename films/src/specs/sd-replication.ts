import type { FlowSpec } from "../kit/types";

/**
 * Replication — the film for `sd-replication`.
 *
 * One write goes to a leader, one synchronous follower and one asynchronous
 * follower. The asynchronous one lags and serves a stale read; the leader
 * dies; the synchronous follower is promoted and nothing acknowledged is lost.
 */
export const sdReplication: FlowSpec = {
  id: "sd-replication",
  kicker: "System design · M3",
  title: "Copies, lag and failover",
  nodes: [
    { id: "client", role: "Application", label: "Client" },
    { id: "leader", role: "Takes writes", label: "Leader" },
    { id: "a", role: "Synchronous", label: "Follower A" },
    { id: "b", role: "Asynchronous", label: "Follower B" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "One leader takes every write. Followers copy its log in order and keep a position number.",
      facts: { leader: "log 970 · x = 6", a: "at 970", b: "at 970" },
    },
    {
      seconds: 4.6,
      caption: "The client writes x = 7. The leader appends it to the replication log at position 1000.",
      move: { from: "client", to: "leader", label: "write x = 7", tone: "request" },
      facts: { leader: "log 1000 · x = 7" },
    },
    {
      seconds: 5.4,
      caption: "The log ships to both followers. Follower B is on a slow link and only receives part of it.",
      move: { from: "leader", to: "a", label: "log up to 1000", tone: "commit" },
      alsoMove: { from: "leader", to: "b", label: "log up to 1000", tone: "commit" },
      health: { b: "slow" },
      facts: { a: "at 1000 · x = 7", b: "at 970 · x = 6" },
    },
    {
      seconds: 5,
      caption: "Synchronous means the leader waits for Follower A before it says committed.",
      move: { from: "a", to: "leader", label: "applied 1000", tone: "reply" },
      facts: { leader: "A confirmed 1000" },
    },
    {
      seconds: 4.6,
      caption: "Only now does the client hear committed. A copy exists on a second machine.",
      move: { from: "leader", to: "client", label: "committed", tone: "reply" },
      facts: { client: "x = 7 saved" },
    },
    {
      seconds: 5.4,
      caption: "The client reads from Follower B, 30 entries behind. It sees the old value: replication lag.",
      move: { from: "b", to: "client", label: "x = 6 (stale)", tone: "fault" },
      facts: { b: "lag: 30 entries", client: "read x = 6, wrong" },
    },
    {
      seconds: 5,
      caption: "Then the leader dies. Without a leader, nothing can accept a write.",
      move: { from: "client", to: "leader", label: "write y = 1", tone: "fault" },
      health: { leader: "down" },
      facts: { leader: "no heartbeat", client: "write timed out" },
    },
    {
      seconds: 5.6,
      caption: "Promote the follower with the highest log position. A is at 1000, so x = 7 survives.",
      move: { from: "a", to: "b", label: "I lead, term 2", tone: "request" },
      facts: { a: "leader · term 2", b: "follows A" },
    },
    {
      seconds: 5.4,
      caption: "The old leader wakes and still thinks it leads. The higher term number makes it step down.",
      move: { from: "a", to: "leader", label: "term 2: step down", tone: "fault" },
      health: { leader: "ok" },
      facts: { leader: "term 1 → follower" },
    },
    {
      seconds: 5,
      caption: "B catches up from the new leader, and reads agree again.",
      move: { from: "a", to: "b", label: "log 971 to 1000", tone: "commit" },
      health: { b: "ok" },
      facts: { b: "at 1000 · x = 7", client: "writes resume" },
    },
  ],
  takeaway: {
    line: "A write is only safe once a second copy has it.",
    sub: "Pay for one synchronous follower, read your own writes from the leader, and fence old leaders by term.",
    seconds: 5.5,
  },
  lesson: {
    title: "A write, a lag and a failover",
    watchFor:
      "Watch the position under each follower. Follower B stays at 970 and serves a stale read, while Follower A at 1000 is the one promoted, so the acknowledged write is not lost.",
  },
};

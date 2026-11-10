import type { FlowSpec } from "../kit/types";

/**
 * CAP and quorums — the film for `sd-cap-quorums`.
 *
 * N = 3, W = 2, R = 2. A write reaches two replicas while the third is cut
 * off. A read of one replica (R = 1) is stale; a read of two (R + W = 4 > 3)
 * always meets the newest version, and read repair heals the third.
 */
export const sdCapQuorums: FlowSpec = {
  id: "sd-cap-quorums",
  kicker: "System design · M3",
  title: "Quorums catch a stale read",
  nodes: [
    { id: "client", role: "Application", label: "Client" },
    { id: "r1", role: "Replica of x", label: "Replica 1" },
    { id: "r2", role: "Replica of x", label: "Replica 2" },
    { id: "r3", role: "Replica of x", label: "Replica 3" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "x lives on N = 3 replicas. A write needs W = 2 acknowledgements, a read asks R = 2.",
      facts: { r1: "x = 4 · v1", r2: "x = 4 · v1", r3: "x = 4 · v1" },
    },
    {
      seconds: 4.6,
      caption: "The client writes x = 5 to all three replicas at once, as version 2.",
      move: { from: "client", to: "r1", label: "write x = 5", tone: "request" },
      alsoMove: { from: "client", to: "r2", label: "write x = 5", tone: "request" },
      facts: { r1: "x = 5 · v2", r2: "x = 5 · v2" },
    },
    {
      seconds: 5,
      caption: "The link to Replica 3 is cut. The write never arrives there, and the client hears no answer.",
      move: { from: "client", to: "r3", label: "write x = 5", tone: "fault" },
      health: { r3: "down" },
      facts: { r3: "x = 4 · v1 (cut off)" },
    },
    {
      seconds: 5,
      caption: "Two of three acknowledged. That meets W = 2, so the write counts as committed.",
      move: { from: "r1", to: "client", label: "ack", tone: "reply" },
      alsoMove: { from: "r2", to: "client", label: "ack", tone: "reply" },
      facts: { client: "2 of 3 acked: done" },
    },
    {
      seconds: 5.6,
      caption: "A client stuck on Replica 3's side tries a write. One copy is short of W = 2, so it is refused.",
      move: { from: "client", to: "r3", label: "write x = 6", tone: "fault" },
      facts: { r3: "refused: 1 of 2 acks" },
    },
    {
      seconds: 5,
      caption: "The link comes back, but Replica 3 has not caught up. Now a read of just one copy, R = 1.",
      move: { from: "client", to: "r3", label: "read x", tone: "request" },
      health: { r3: "ok" },
      facts: { client: "R = 1, W = 2: sum 3" },
    },
    {
      seconds: 5,
      caption: "It answers with the old value. R + W = 3 is not more than N = 3, so the sets can miss.",
      move: { from: "r3", to: "client", label: "x = 4 (stale)", tone: "fault" },
      facts: { client: "read x = 4, wrong" },
    },
    {
      seconds: 5,
      caption: "Ask two replicas instead. R + W = 4 is more than 3, so one of them must hold the write.",
      move: { from: "client", to: "r2", label: "read x", tone: "request" },
      alsoMove: { from: "client", to: "r3", label: "read x", tone: "request" },
      facts: { client: "R = 2, W = 2: sum 4" },
    },
    {
      seconds: 5.4,
      caption: "The answers are v2 and v1. The client takes the newest version and returns x = 5.",
      move: { from: "r2", to: "client", label: "x = 5 · v2", tone: "reply" },
      alsoMove: { from: "r3", to: "client", label: "x = 4 · v1", tone: "reply" },
      facts: { client: "newest wins: x = 5" },
    },
    {
      seconds: 5.4,
      caption: "Read repair: the client writes the newest version back to the replica that was behind.",
      move: { from: "client", to: "r3", label: "repair: x = 5 · v2", tone: "commit" },
      facts: { r3: "x = 5 · v2", r1: "x = 5 · v2" },
    },
  ],
  takeaway: {
    line: "If R + W is more than N, a read meets the write.",
    sub: "During a cut, refuse or answer stale: choose per operation. Money wants refusal, a like count can wait.",
    seconds: 5.5,
  },
  lesson: {
    title: "R + W > N in action",
    watchFor:
      "Watch the sum of R and W in the line under the client. With 1 and 2 the read returns the stale x = 4. With 2 and 2 the client sees v2 beside v1 and picks the newest.",
  },
};

import type { FlowSpec } from "../kit/types";

/**
 * Gossip and failure detection — the film for `sd-gossip-failure-detection`.
 *
 * A SWIM-style cluster. A healthy node stalls; a fixed timeout would
 * condemn it, but an indirect probe, a suspect state and a refutation
 * clear it. Later a node really crashes and is declared dead.
 */
export const sdGossipFailureDetection: FlowSpec = {
  id: "sd-gossip-failure-detection",
  kicker: "System design · M4",
  title: "Is that node dead, or just slow?",
  nodes: [
    { id: "a", role: "Member", label: "Node A" },
    { id: "b", role: "Member", label: "Node B" },
    { id: "c", role: "Member", label: "Node C" },
    { id: "d", role: "Member", label: "Node D" },
    { id: "e", role: "Member", label: "Node E" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "Five members, no master list. A crashed node and a stalled node both look the same: silent.",
      facts: { a: "all alive", d: "incarnation 1" },
    },
    {
      seconds: 5,
      caption: "Each second a node pings one random member. A pings D, but D is stuck in a 5-second pause.",
      move: { from: "a", to: "d", label: "ping", tone: "fault" },
      health: { d: "slow" },
      facts: { a: "D: no reply", d: "paused" },
    },
    {
      seconds: 5.4,
      caption: "A 3-second timeout would call D dead now. Instead A asks two others to ping D for it.",
      move: { from: "a", to: "b", label: "ping D for me", tone: "request" },
      alsoMove: { from: "a", to: "c", label: "ping D for me", tone: "request" },
      facts: { a: "D: probing" },
    },
    {
      seconds: 5,
      caption: "Their pings are not answered either, so the fault is D, not the link between A and D.",
      move: { from: "b", to: "d", label: "ping", tone: "fault" },
      alsoMove: { from: "c", to: "d", label: "ping", tone: "fault" },
      facts: { b: "D: no reply", c: "D: no reply" },
    },
    {
      seconds: 5.4,
      caption: "A marks D suspect, not dead, and spreads the rumour on its next ping.",
      move: { from: "a", to: "e", label: "D is suspect", tone: "request" },
      facts: { a: "D: suspect", e: "D: suspect" },
    },
    {
      seconds: 5.4,
      caption: "D wakes within the suspicion period. It raises its incarnation number to refute the rumour.",
      move: { from: "d", to: "a", label: "alive · incarnation 2", tone: "reply" },
      health: { d: "ok" },
      facts: { d: "incarnation 2", a: "D: alive (inc 2)" },
    },
    {
      seconds: 5,
      caption: "Gossip spreads it: each informed node tells one random peer, so the news doubles each round.",
      move: { from: "a", to: "b", label: "D alive, inc 2", tone: "commit" },
      alsoMove: { from: "e", to: "c", label: "D alive, inc 2", tone: "commit" },
      facts: { b: "D: alive (inc 2)", c: "D: alive (inc 2)", e: "D: alive (inc 2)" },
    },
    {
      seconds: 5,
      caption: "Now E really crashes. A pings it and gets nothing, so E becomes suspect and stays suspect.",
      move: { from: "a", to: "e", label: "ping", tone: "fault" },
      health: { e: "down" },
      facts: { a: "E: suspect", e: "crashed" },
    },
    {
      seconds: 5.4,
      caption: "E never refutes. After the suspicion period A declares it dead, and the news spreads.",
      move: { from: "a", to: "b", label: "E is dead", tone: "commit" },
      alsoMove: { from: "a", to: "d", label: "E is dead", tone: "commit" },
      facts: { a: "E: dead", b: "E: dead", d: "E: dead" },
    },
  ],
  takeaway: {
    line: "Silence is a guess, so suspect before you condemn.",
    sub: "Ask others to check, allow a refutation, and let news spread by gossip, not by a master list.",
    seconds: 5.5,
  },
  lesson: {
    title: "Suspect first, then decide",
    watchFor:
      "Follow the line under Node A. D goes from 'no reply' to 'suspect' and then back to 'alive' when it answers. E goes from 'suspect' to 'dead' only because it never answers.",
  },
};

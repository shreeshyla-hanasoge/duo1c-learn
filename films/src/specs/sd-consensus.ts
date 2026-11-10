import type { FlowSpec } from "../kit/types";

/**
 * Consensus — the film for `sd-consensus`.
 *
 * A five-node Raft cluster elects a leader by majority, commits one log
 * entry on a majority while one node lags, loses the leader, and elects a new
 * one that still holds the entry. The old leader is then demoted by the
 * higher term. Terms and votes follow the lesson's own rules.
 */
export const sdConsensus: FlowSpec = {
  id: "sd-consensus",
  kicker: "System design · M4",
  title: "Five nodes, one leader",
  nodes: [
    { id: "a", role: "Raft node", label: "Node A" },
    { id: "b", role: "Raft node", label: "Node B" },
    { id: "c", role: "Raft node", label: "Node C" },
    { id: "d", role: "Raft node", label: "Node D" },
    { id: "e", role: "Raft node", label: "Node E" },
  ],
  states: ["follower", "candidate", "leader"],
  statesLabel: "Raft node",
  steps: [
    {
      seconds: 4.6,
      caption: "Five nodes, no leader yet. Each waits for a heartbeat, then runs for office.",
      facts: { a: "term 1", b: "term 1", c: "term 1", d: "term 1", e: "term 1" },
      state: "follower",
    },
    {
      seconds: 5,
      caption: "A's random timeout fires first. It adds one to the term, votes for itself and asks for votes.",
      move: { from: "a", to: "b", label: "vote for me? t2", tone: "request" },
      alsoMove: { from: "a", to: "e", label: "vote for me? t2", tone: "request" },
      facts: { a: "term 2 · 1 vote" },
      state: "candidate",
    },
    {
      seconds: 5.2,
      caption: "Each node votes once per term. Three of five is a majority, so A wins.",
      move: { from: "b", to: "a", label: "vote granted", tone: "reply" },
      alsoMove: { from: "e", to: "a", label: "vote granted", tone: "reply" },
      facts: { a: "term 2 · leader", b: "term 2 · voted A", e: "term 2 · voted A" },
      state: "leader",
    },
    {
      seconds: 5.2,
      caption: "A client write x = 5 reaches the leader. B is slow, but the leader does not wait for it.",
      move: { from: "a", to: "c", label: "append x = 5", tone: "request" },
      alsoMove: { from: "a", to: "d", label: "append x = 5", tone: "request" },
      health: { b: "slow" },
      facts: { a: "log: x=5 · not yet", b: "log: empty" },
    },
    {
      seconds: 5.2,
      caption: "Leader plus two followers is a majority of five. The entry is committed.",
      move: { from: "c", to: "a", label: "stored", tone: "reply" },
      alsoMove: { from: "d", to: "a", label: "stored", tone: "reply" },
      facts: { a: "x=5 committed · 3/5", c: "log: x=5", d: "log: x=5" },
    },
    {
      seconds: 5,
      caption: "The leader crashes. The followers hear no heartbeat. C's timeout fires first and it runs for term 3.",
      move: { from: "c", to: "d", label: "vote for me? t3", tone: "request" },
      alsoMove: { from: "c", to: "b", label: "vote for me? t3", tone: "request" },
      health: { a: "down", b: "ok" },
      facts: { a: "crashed", c: "term 3 · 1 vote" },
      state: "candidate",
    },
    {
      seconds: 5.4,
      caption: "C's log is at least as up to date as theirs, so they vote yes. C wins with 3 of 5.",
      move: { from: "d", to: "c", label: "vote granted", tone: "reply" },
      alsoMove: { from: "b", to: "c", label: "vote granted", tone: "reply" },
      facts: { c: "term 3 · leader · x=5", d: "term 3 · voted C", b: "term 3 · voted C" },
      state: "leader",
    },
    {
      seconds: 5,
      caption: "A restarts, still believing it leads term 2, and tries to append a stale entry.",
      move: { from: "a", to: "c", label: "append y = 9 · t2", tone: "fault" },
      health: { a: "ok" },
      facts: { a: "term 2 · thinks leader" },
    },
    {
      seconds: 5.4,
      caption: "C sees the old term and refuses. A sees the higher term 3 and steps down.",
      move: { from: "c", to: "a", label: "no: term is 3", tone: "reply" },
      facts: { a: "term 3 · follower", c: "term 3 · x=5 kept" },
      state: "follower",
    },
  ],
  takeaway: {
    line: "Any two majorities overlap.",
    sub: "So there is one leader per term, and a committed entry survives every election.",
    seconds: 5.5,
  },
  lesson: {
    title: "A leader dies, the entry lives",
    watchFor:
      "Follow the term number under each node and the log line 'x=5'. The term rises with each election, the entry stays committed through the leader's crash, and the old leader obeys the higher term.",
  },
};

import type { FlowSpec } from "../kit/types";

/**
 * Design a key-value store — the film for `sd-design-key-value-store`.
 *
 * One cart write on the ring (N=3, W=2): a replica is down, a hint carries
 * the write, two writers conflict, and vector clocks keep both versions.
 */
export const sdDesignKeyValueStore: FlowSpec = {
  id: "sd-design-key-value-store",
  kicker: "System design · M10",
  title: "One write on the ring",
  nodes: [
    { id: "client", role: "Shopper's app", label: "Client" },
    { id: "c", role: "Owner of key 55", label: "Node C" },
    { id: "d", role: "Replica 2", label: "Node D" },
    { id: "a", role: "Replica 3", label: "Node A" },
    { id: "b", role: "Next on ring", label: "Node B" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "The key 'cart' hashes to 55, so C, D and A each keep a copy. Writes need 2 acks, reads ask 2.",
      facts: { c: "N=3 · W=2 · R=2" },
    },
    {
      seconds: 4.6,
      caption: "Any node can take the request. C owns this key, so it coordinates.",
      move: { from: "client", to: "c", label: "put cart: milk", tone: "request" },
      facts: { c: "stores milk · {C:1}" },
    },
    {
      seconds: 5,
      caption: "C copies the write to D and A. A is down and does not answer.",
      move: { from: "c", to: "d", label: "copy: milk", tone: "commit" },
      alsoMove: { from: "c", to: "a", label: "copy: milk", tone: "fault" },
      health: { a: "down" },
      facts: { d: "milk · {C:1}", a: "down · no copy" },
    },
    {
      seconds: 5,
      caption: "C and D make two acks, so the write succeeds. A dead node does not stop the shopper.",
      move: { from: "d", to: "c", label: "ack", tone: "reply" },
      facts: { c: "2 of 3 acks · done" },
    },
    {
      seconds: 5,
      caption: "A sloppy quorum parks A's copy on B, with a note saying whose it is.",
      move: { from: "c", to: "b", label: "milk, hint: for A", tone: "commit" },
      facts: { b: "holds hint for A" },
    },
    {
      seconds: 5,
      caption: "A comes back. B hands the copy over, and the hint is deleted.",
      move: { from: "b", to: "a", label: "hand back: milk", tone: "commit" },
      health: { a: "ok" },
      facts: { a: "milk · {C:1}", b: "hint deleted" },
    },
    {
      seconds: 5.4,
      caption: "Two shoppers now edit the same cart at once. Neither clock contains the other.",
      move: { from: "client", to: "c", label: "add eggs", tone: "request" },
      alsoMove: { from: "client", to: "d", label: "add bread", tone: "request" },
      facts: { c: "milk, eggs · {C:2}", d: "milk, bread · {C:1,D:1}" },
    },
    {
      seconds: 5.4,
      caption: "A read asks two replicas. Because they disagree, the store returns both versions, not a guess.",
      move: { from: "c", to: "client", label: "2 versions", tone: "reply" },
      facts: { client: "sees eggs and bread" },
    },
    {
      seconds: 5.4,
      caption: "Only the app knows a cart merges by union. It writes the merge back with a clock covering both.",
      move: { from: "client", to: "c", label: "milk, eggs, bread", tone: "commit" },
      facts: { c: "merged · {C:2,D:1}" },
    },
    {
      seconds: 5,
      caption: "In the background, replicas compare Merkle roots. Equal roots mean the data is equal.",
      move: { from: "c", to: "d", label: "compare root hash", tone: "request" },
      facts: { d: "differs · fix 1 key" },
    },
  ],
  takeaway: {
    line: "Stay writable now; reconcile later.",
    sub: "Use quorums where reads must see the latest write, and keep conflicts instead of hiding them.",
    seconds: 5.5,
  },
  lesson: {
    title: "A cart written while a node is down",
    watchFor:
      "Watch the vector clocks in curly brackets under C and D. When neither clock contains the other, the store keeps both versions and the app merges them.",
  },
};

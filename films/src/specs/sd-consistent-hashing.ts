import type { FlowSpec } from "../kit/types";

/**
 * Consistent hashing — the film for `sd-consistent-hashing`.
 *
 * The lesson's small ring of 0 to 359 with A at 40, B at 160, C at 280. Hash
 * modulo n moves 80 percent of keys going from 4 nodes to 5; on the ring,
 * adding D at 100 moves only the keys between 41 and 100.
 */
export const sdConsistentHashing: FlowSpec = {
  id: "sd-consistent-hashing",
  kicker: "System design · M3",
  title: "Keys on a ring",
  nodes: [
    { id: "client", role: "Looks up keys", label: "Client" },
    { id: "ring", role: "Placement rule", label: "Ring" },
    { id: "a", role: "Cache node", label: "Node A" },
    { id: "b", role: "Cache node", label: "Node B" },
    { id: "c", role: "Cache node", label: "Node C" },
    { id: "d", role: "New cache node", label: "Node D" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Keys are spread over cache nodes. The question is what happens when a node is added.",
      facts: { ring: "rule: hash mod n" },
    },
    {
      seconds: 5,
      caption: "With hash mod n, going from 4 nodes to 5 changes the answer for 4 keys in every 5.",
      move: { from: "client", to: "ring", label: "add a fifth node", tone: "request" },
      facts: { ring: "mod 4 → mod 5" },
    },
    {
      seconds: 5.4,
      caption: "Most keys now point at a node that does not hold them. Reads miss and flood the database.",
      move: { from: "ring", to: "client", label: "80% of keys move", tone: "fault" },
      health: { ring: "slow" },
      facts: { client: "most reads miss" },
    },
    {
      seconds: 5.4,
      caption: "Instead, put nodes and keys on one circle, 0 to 359. A is at 40, B at 160, C at 280.",
      move: { from: "client", to: "ring", label: "key k1 hashes to 100", tone: "request" },
      health: { ring: "ok" },
      facts: { ring: "A 40 · B 160 · C 280", client: "k1 at 100" },
    },
    {
      seconds: 5.4,
      caption: "A key belongs to the first node clockwise from it. From 100 the first node is B at 160.",
      move: { from: "ring", to: "b", label: "k1 (100) → B", tone: "commit" },
      facts: { b: "holds k1 (100)" },
    },
    {
      seconds: 5.4,
      caption: "Key k2 at 300 passes C, wraps past 359 and lands on A at 40. The circle has no end.",
      move: { from: "ring", to: "a", label: "k2 (300) wraps to A", tone: "commit" },
      facts: { a: "holds k2 (300)", client: "k2 at 300" },
    },
    {
      seconds: 5,
      caption: "Now add node D at position 100. It joins the ring without telling the other nodes.",
      move: { from: "d", to: "ring", label: "join at 100", tone: "request" },
      facts: { ring: "A 40 · D 100 · B 160", d: "joins at 100" },
    },
    {
      seconds: 5.6,
      caption: "Only keys from 41 to 100 move, from B to D. So k1 moves; k2, A and C are untouched.",
      move: { from: "b", to: "d", label: "keys 41 to 100", tone: "commit" },
      facts: { b: "k1 gone", d: "holds k1 (100)", a: "k2 stays", c: "nothing moves" },
    },
    {
      seconds: 5.6,
      caption: "One point per node leaves uneven arcs, so give each node about 200 points on the ring.",
      move: { from: "ring", to: "c", label: "200 points each", tone: "commit" },
      facts: { ring: "load spread: about 7%", c: "dies: neighbours share" },
    },
  ],
  takeaway: {
    line: "Never use plain modulo over a changing node set.",
    sub: "On a ring a new node steals only the arc next to it, so about 1 in n keys moves, not 4 in 5.",
    seconds: 5.5,
  },
  lesson: {
    title: "Add a node, move a few keys",
    watchFor:
      "Compare the 80 percent of keys that move under hash mod n with the single arc, keys 41 to 100, that moves when node D joins the ring. Node A, C and key k2 stay put.",
  },
};

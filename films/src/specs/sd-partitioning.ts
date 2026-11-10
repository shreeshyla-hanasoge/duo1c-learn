import type { FlowSpec } from "../kit/types";

/**
 * Partitioning — the film for `sd-partitioning`.
 *
 * A hash spreads keys, but not popularity: one hot counter key melts one
 * shard. Salting the key into eight sub-keys fixes writes and makes reads add
 * up eight parts. Counts follow the lesson's examples.
 */
export const sdPartitioning: FlowSpec = {
  id: "sd-partitioning",
  kicker: "System design · M3",
  title: "Partitions and the hot key",
  nodes: [
    { id: "client", role: "Writers", label: "Clients" },
    { id: "router", role: "Hash of key", label: "Router" },
    { id: "s1", role: "Partition", label: "Shard 1" },
    { id: "s2", role: "Partition", label: "Shard 2" },
    { id: "s3", role: "Partition", label: "Shard 3" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Data is split by a key. A hash of the key tells the router which shard owns a row.",
      facts: { router: "hash(key) picks shard" },
    },
    {
      seconds: 4.6,
      caption: "Fans like a match. The key is the match id, so every like is a write to match42.",
      move: { from: "client", to: "router", label: "like on match42", tone: "request" },
      facts: { client: "key: match42", router: "match42 → Shard 2" },
    },
    {
      seconds: 4.6,
      caption: "Different keys land on different shards, so load looks even when keys are many.",
      move: { from: "router", to: "s2", label: "match42 + 1", tone: "commit" },
      facts: { s2: "match42: 1", s1: "other keys", s3: "other keys" },
    },
    {
      seconds: 5.4,
      caption: "Now the final goes live: 9,000 likes a second, all for one key, so all for one shard.",
      move: { from: "client", to: "router", label: "9,000 likes a second", tone: "request" },
      facts: { router: "every like → Shard 2" },
    },
    {
      seconds: 5.4,
      caption: "A hash spreads keys, not popularity. Shard 2 drowns while the others sit idle.",
      move: { from: "router", to: "s2", label: "9,000 writes a second", tone: "fault" },
      health: { s2: "slow" },
      facts: { s2: "queue: 9,000 a second", s1: "idle", s3: "idle" },
    },
    {
      seconds: 5,
      caption: "Adding a fourth shard would not help: the hot key still has exactly one owner.",
      move: { from: "s2", to: "router", label: "timeout", tone: "fault" },
      facts: { client: "likes failing", router: "more shards: no help" },
    },
    {
      seconds: 5.6,
      caption: "Salt the key. Each like picks a random match42#0 to match42#7, so eight keys share the load.",
      move: { from: "router", to: "s1", label: "match42#3", tone: "commit" },
      alsoMove: { from: "router", to: "s3", label: "match42#6", tone: "commit" },
      health: { s2: "ok" },
      facts: { s1: "#0 #3 #6", s2: "#1 #4 #7", s3: "#2 #5" },
    },
    {
      seconds: 5.4,
      caption: "Every shard now takes about a third of the writes. The hot spot is gone.",
      move: { from: "client", to: "router", label: "9,000 likes a second", tone: "request" },
      facts: { router: "random #0 to #7", client: "likes succeed" },
    },
    {
      seconds: 5.6,
      caption: "The price is on the read. The total of match42 means fetching all eight parts and adding.",
      move: { from: "router", to: "s1", label: "read #0, #3, #6", tone: "request" },
      alsoMove: { from: "router", to: "s2", label: "read #1, #4, #7", tone: "request" },
      facts: { router: "adds 8 parts" },
    },
    {
      seconds: 5.6,
      caption: "Growth works the same way: many partitions, 1,024 over 8 nodes. A ninth node takes about 114.",
      move: { from: "router", to: "s3", label: "move whole partitions", tone: "commit" },
      facts: { s3: "new node: takes ~114", router: "hash mod n: 80% move" },
    },
  ],
  takeaway: {
    line: "A key is a bet that load will spread evenly.",
    sub: "Choose the key your main queries use, watch for one huge value, and salt it if it gets hot.",
    seconds: 5.5,
  },
  lesson: {
    title: "One hot key, eight salted keys",
    watchFor:
      "Watch Shard 2's line when 9,000 likes a second all share one key, then the three shards' lines after salting. Notice that the read now has to gather eight parts.",
  },
};

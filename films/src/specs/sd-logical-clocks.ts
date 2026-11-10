import type { FlowSpec } from "../kit/types";

/**
 * Ordering events: logical clocks — the film for `sd-logical-clocks`.
 *
 * Two clients write the same cart through two servers. With wall-clock
 * last-write-wins a fast clock silently erases the genuinely later write;
 * with vector clocks the servers see the writes are concurrent and keep both.
 */
export const sdLogicalClocks: FlowSpec = {
  id: "sd-logical-clocks",
  kicker: "System design · M4",
  title: "Which write came first?",
  nodes: [
    { id: "alice", role: "Client", label: "Alice" },
    { id: "a", role: "Replica", label: "Server A" },
    { id: "b", role: "Replica", label: "Server B" },
    { id: "bob", role: "Client", label: "Bob" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Two servers hold one shopping cart. Server A's clock runs 5 ms fast.",
      facts: { a: "clock +5 ms", b: "clock correct" },
    },
    {
      seconds: 4.8,
      caption: "Alice adds milk at real time 100. Server A stamps it with its own clock: 105.",
      move: { from: "alice", to: "a", label: "add milk", tone: "commit" },
      facts: { a: "milk · stamp 105" },
    },
    {
      seconds: 4.8,
      caption: "Bob adds eggs at real time 103, genuinely later. Server B stamps it 103.",
      move: { from: "bob", to: "b", label: "add eggs", tone: "commit" },
      facts: { b: "eggs · stamp 103" },
    },
    {
      seconds: 5.4,
      caption: "Last-write-wins keeps the higher stamp. The later write has the smaller number, so it loses.",
      move: { from: "a", to: "b", label: "milk · stamp 105", tone: "fault" },
      facts: { b: "milk wins · eggs lost" },
    },
    {
      seconds: 5,
      caption: "Nobody was told. Wall clocks cannot order writes made on different machines.",
      facts: { alice: "cart: milk", bob: "cart: milk? eggs gone" },
    },
    {
      seconds: 5.2,
      caption: "Try again with a vector clock: one counter per server. Alice's write is A:1.",
      move: { from: "alice", to: "a", label: "add milk", tone: "commit" },
      facts: { a: "milk · [A:1]", b: "empty · [ ]", bob: "cart: empty" },
    },
    {
      seconds: 5,
      caption: "Bob's write reached only B, so it is B:1. Neither server has seen the other's write.",
      move: { from: "bob", to: "b", label: "add eggs", tone: "commit" },
      facts: { b: "eggs · [B:1]" },
    },
    {
      seconds: 5.4,
      caption: "[A:1] and [B:1]: neither is at least the other everywhere. So they are concurrent.",
      move: { from: "a", to: "b", label: "milk · [A:1]", tone: "request" },
      facts: { b: "both kept: siblings" },
    },
    {
      seconds: 5.4,
      caption: "Bob's next read returns both siblings. He merges them and writes back, naming both clocks.",
      move: { from: "b", to: "bob", label: "milk + eggs", tone: "reply" },
      facts: { bob: "merge → milk, eggs", b: "[A:1,B:2] · milk, eggs" },
    },
    {
      seconds: 5,
      caption: "[A:1,B:2] is at least [A:1] everywhere, so A simply replaces its old version.",
      move: { from: "b", to: "a", label: "[A:1,B:2]", tone: "commit" },
      facts: { a: "[A:1,B:2] · milk, eggs" },
    },
  ],
  takeaway: {
    line: "Count who told whom, not what the watch says.",
    sub: "Use causal stamps where a lost write costs money, and keep both versions when they are concurrent.",
    seconds: 5.5,
  },
  lesson: {
    title: "A fast clock erases a write",
    watchFor:
      "Watch the line under Server B. First it says 'milk wins · eggs lost' because of a 5 ms clock error. Then, with vector clocks, it says 'both kept' and the merged cart ends up on both servers.",
  },
};

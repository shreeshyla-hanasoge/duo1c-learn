import type { FlowSpec } from "../kit/types";

/**
 * Distributed ids — the film for `sd-distributed-ids`.
 *
 * Two shards with their own counters collide. A Snowflake id (41-bit time,
 * 10-bit machine, 12-bit sequence) does not; the arithmetic is the lesson's
 * worked example, and a clock rolling back is caught by the generator.
 */
export const sdDistributedIds: FlowSpec = {
  id: "sd-distributed-ids",
  kicker: "System design · M3",
  title: "Ids without a shared counter",
  nodes: [
    { id: "a", role: "Machine 5", label: "Shard A" },
    { id: "b", role: "Machine 6", label: "Shard B" },
    { id: "db", role: "Stores orders", label: "Database" },
    { id: "clock", role: "Time source", label: "Clock" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Two shards create orders at the same time. Each needs an id nobody else will ever use.",
      facts: { a: "counter: 0", b: "counter: 0" },
    },
    {
      seconds: 5.4,
      caption: "Own counters collide. Both shards count 1, 2, 3, so two different orders share an id.",
      move: { from: "a", to: "db", label: "order id 1", tone: "fault" },
      alsoMove: { from: "b", to: "db", label: "order id 1", tone: "fault" },
      facts: { db: "two rows, id 1: clash" },
    },
    {
      seconds: 5.6,
      caption: "Snowflake builds the id from parts: milliseconds, then machine number, then sequence.",
      move: { from: "a", to: "db", label: "id 4,194,304,020,483", tone: "commit" },
      facts: { a: "ms 1,000,000 · m5 · seq 3", db: "id 4,194,304,020,483" },
    },
    {
      seconds: 5.6,
      caption: "Same millisecond, same sequence, but machine 6. The machine bits keep the id different.",
      move: { from: "b", to: "db", label: "id 4,194,304,024,579", tone: "commit" },
      facts: { b: "ms 1,000,000 · m6 · seq 3", db: "two ids, no clash" },
    },
    {
      seconds: 5.4,
      caption: "Twelve sequence bits allow 4,096 ids a millisecond per machine, with no call to any server.",
      move: { from: "a", to: "db", label: "id 4,194,304,020,484", tone: "commit" },
      facts: { a: "ms 1,000,000 · m5 · seq 4", db: "ids sort by time" },
    },
    {
      seconds: 5.6,
      caption: "Ids trust the clock. A time sync steps Shard A back by 3 ms, so it could repeat old ids.",
      move: { from: "clock", to: "a", label: "NTP: back 3 ms", tone: "fault" },
      health: { a: "slow" },
      facts: { clock: "now 999,997", a: "last used 1,000,000" },
    },
    {
      seconds: 5,
      caption: "The generator remembers its last timestamp. Now is behind it, so it refuses to issue.",
      move: { from: "a", to: "clock", label: "time yet?", tone: "request" },
      facts: { a: "waiting: now < last" },
    },
    {
      seconds: 5,
      caption: "A few milliseconds later the clock passes the old mark, and the shard can issue again.",
      move: { from: "clock", to: "a", label: "ms 1,000,001", tone: "reply" },
      health: { a: "ok" },
      facts: { clock: "now 1,000,001", a: "ms 1,000,001 · seq 0" },
    },
    {
      seconds: 5.6,
      caption: "The new id is larger than every earlier one. No repeat, and the order is kept.",
      move: { from: "a", to: "db", label: "id 4,194,308,214,784", tone: "commit" },
      facts: { db: "newest id is largest" },
    },
  ],
  takeaway: {
    line: "Make clashes impossible, not just unlikely.",
    sub: "Counters need one writer; random ids need width; Snowflake needs a unique machine id and a trusted clock.",
    seconds: 5.5,
  },
  lesson: {
    title: "Building a Snowflake id by hand",
    watchFor:
      "Read the fact line under each shard: milliseconds, machine, sequence. Two shards in the same millisecond still differ in the machine part. Then see what happens when the clock steps backwards.",
  },
};

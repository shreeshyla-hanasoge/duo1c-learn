import type { FlowSpec } from "../kit/types";

/**
 * Cost and capacity — the film for `sd-cost-capacity`.
 *
 * Count the multiplying unit (ticks), see why pay-per-use suits a
 * market-hours feed, then meet the first bottleneck: one backtest worker.
 */
export const sdCostCapacity: FlowSpec = {
  id: "sd-cost-capacity",
  kicker: "System design · M1",
  title: "Doing the arithmetic",
  nodes: [
    { id: "feed", role: "Tick source", label: "Feed" },
    { id: "edge", role: "Pay per use", label: "Edge" },
    { id: "browser", role: "3 connections", label: "Browser" },
    { id: "engine", role: "Fixed server", label: "Engine" },
    { id: "worker", role: "Backtest pool", label: "Worker" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Before any price, find the quantity that multiplies. For a tick feed it is messages.",
    },
    {
      seconds: 5,
      caption: "50 instruments, one tick a second, a 22,500-second session: 11,25,000 ticks a day.",
      move: { from: "feed", to: "edge", label: "50 ticks a second", tone: "request" },
      facts: { feed: "50 × 1/s × 22,500", edge: "11,25,000 a day" },
    },
    {
      seconds: 5,
      caption: "Three connections each want every tick: 33,75,000 messages. Connections are the factor to cut.",
      move: { from: "edge", to: "browser", label: "every tick, ×3", tone: "commit" },
      facts: { edge: "33,75,000 messages", browser: "3 connections" },
    },
    {
      seconds: 5,
      caption: "The market is busy 137.5 of 730 hours, about 19 percent. Pay per use wins, and idle costs nothing.",
      move: { from: "edge", to: "browser", label: "market shut: idle", tone: "reply" },
      facts: { edge: "19% busy · no idle bill" },
    },
    {
      seconds: 5,
      caption: "Now a different limit. Ten backtests arrive at once and share the server's memory with live trading.",
      move: { from: "browser", to: "engine", label: "run 10 backtests", tone: "request" },
      facts: { browser: "10 jobs sent", engine: "memory shared with live" },
    },
    {
      seconds: 5.4,
      caption: "One worker, six minutes a job. Ten at once means the last one waits about 54 minutes.",
      move: { from: "engine", to: "worker", label: "job 1 of 10", tone: "request" },
      facts: { worker: "1 worker · 6 min a job", engine: "queue: 9 waiting" },
    },
    {
      seconds: 5.4,
      caption: "Adding ten workers removes the wait, but they eat the memory live trading needs.",
      move: { from: "engine", to: "worker", label: "10 workers at once", tone: "fault" },
      health: { engine: "slow" },
      facts: { worker: "10 running", engine: "memory full" },
    },
    {
      seconds: 5.4,
      caption: "Keep one worker and show the queue. An overload becomes a wait, which is far smaller than a crash.",
      move: { from: "engine", to: "browser", label: "you are 9th in queue", tone: "reply" },
      health: { engine: "ok" },
      facts: { worker: "1 worker", engine: "queue: 9 · memory safe", browser: "sees the wait" },
    },
    {
      seconds: 5,
      caption: "Add capacity only when measured use nears the ceiling. Until then, watch queue wait.",
      move: { from: "worker", to: "engine", label: "job 1 done", tone: "commit" },
      facts: { engine: "queue: 8", worker: "starts job 2" },
    },
  ],
  takeaway: {
    line: "Count the multiplier, then find what fills first.",
    sub: "Be right within a factor of ten, rent the uneven part, and let a queue absorb overload.",
    seconds: 5.5,
  },
  lesson: {
    title: "Tick arithmetic and one worker",
    watchFor:
      "Watch the numbers under Edge and Engine. The first is the message count growing by a factor of three; the second is a queue length, which stays safe at one worker and breaks memory at ten.",
  },
};

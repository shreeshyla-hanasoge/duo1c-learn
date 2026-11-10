import type { FlowSpec } from "../kit/types";

/**
 * Workload isolation and job queues — the film for `sd-isolation-and-jobs`.
 *
 * The old design ran a backtest inside the live process and starved the tick
 * loop. The fix is a queue, one spawned worker, and job state in the database.
 * Job numbers and the single worker follow the lesson; sizes are illustrative.
 */
export const sdIsolationAndJobs: FlowSpec = {
  id: "sd-isolation-and-jobs",
  kicker: "System design · M7",
  title: "Heavy jobs beside live trading",
  nodes: [
    { id: "user", role: "Asks for work", label: "User" },
    { id: "queue", role: "Job queue", label: "Queue" },
    { id: "worker", role: "Own process", label: "Worker" },
    { id: "live", role: "Tick loop", label: "Live" },
    { id: "db", role: "Job state", label: "Database" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "The live engine must read ticks every second. A backtest is heavy work that can take minutes.",
      facts: { live: "ticks flowing" },
    },
    {
      seconds: 5,
      caption: "The old design ran the backtest inside the live process. They shared one heap and one lock.",
      move: { from: "user", to: "live", label: "run backtest", tone: "request" },
      facts: { live: "backtest in-process" },
    },
    {
      seconds: 5.4,
      caption: "The health check still said ok, but the tick loop read nothing for hours. Alive was not working.",
      move: { from: "live", to: "user", label: "health: ok", tone: "fault" },
      health: { live: "slow" },
      facts: { live: "ticks read: 0" },
    },
    {
      seconds: 5,
      caption: "The fix: accept the request at once and put it in a queue, away from the live process.",
      move: { from: "user", to: "queue", label: "run backtest", tone: "request" },
      health: { live: "ok" },
      facts: { queue: "job 41 waiting", live: "ticks flowing" },
    },
    {
      seconds: 5,
      caption: "One worker takes the job in its own fresh process. A heavy job holds gigabytes, so only one runs.",
      move: { from: "queue", to: "worker", label: "job 41", tone: "commit" },
      facts: { worker: "running 41", queue: "worker limit: 1" },
    },
    {
      seconds: 5,
      caption: "A second request does not start a second job. It waits its turn, and the user sees its place.",
      move: { from: "user", to: "queue", label: "run backtest", tone: "request" },
      facts: { queue: "job 42: place 1", live: "ticks flowing" },
    },
    {
      seconds: 5,
      caption: "Progress is written to the database, so the page shows it from outside the worker.",
      move: { from: "worker", to: "db", label: "progress 85%", tone: "commit" },
      facts: { db: "41 running · 85%" },
    },
    {
      seconds: 5.2,
      caption: "The worker is killed for memory. The live engine keeps reading ticks, and the job ends visibly.",
      move: { from: "worker", to: "db", label: "worker killed", tone: "fault" },
      health: { worker: "down" },
      facts: { db: "41 failed", live: "ticks flowing" },
    },
    {
      seconds: 5.2,
      caption: "A new process returns all its memory when it ends. Job 42 now takes the free place.",
      move: { from: "queue", to: "worker", label: "job 42", tone: "commit" },
      health: { worker: "ok" },
      facts: { worker: "running 42", queue: "empty", db: "42 running" },
    },
  ],
  takeaway: {
    line: "Live work never waits for heavy work.",
    sub: "Give heavy jobs their own process and a queue, and make every job end in a visible state.",
    seconds: 5.5,
  },
  lesson: {
    title: "Why backtests got their own process",
    watchFor:
      "Watch the live engine's line. It reads zero ticks while a backtest shares its process, then stays at ticks flowing for the rest of the film, even when the worker dies. Job 42 waits in the queue.",
  },
};

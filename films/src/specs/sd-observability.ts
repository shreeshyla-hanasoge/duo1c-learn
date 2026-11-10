import type { FlowSpec } from "../kit/types";

/**
 * Observability: logs, metrics and alerts — the film for `sd-observability`.
 *
 * A health check that says ok while ticks have stopped, a symptom rule that
 * catches it, one alert and one resolved notice, and a heartbeat that watches
 * the watcher. Thresholds are the lesson's (2 s snapshot, 120 s, 180 s).
 */
export const sdObservability: FlowSpec = {
  id: "sd-observability",
  kicker: "System design · M7",
  title: "Alive is not healthy",
  nodes: [
    { id: "feed", role: "Tick source", label: "Feed" },
    { id: "engine", role: "Counts work", label: "Engine" },
    { id: "redis", role: "Snapshot", label: "Redis" },
    { id: "alerts", role: "Rules", label: "Alerts" },
    { id: "phone", role: "The operator", label: "Phone" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "The engine counts ticks and evaluations in memory. Counting is cheap, so it does not slow trading.",
      facts: { engine: "counting" },
    },
    {
      seconds: 4.8,
      caption: "Ticks arrive and the counters rise. This is a metric: a number over time.",
      move: { from: "feed", to: "engine", label: "ticks", tone: "commit" },
      facts: { engine: "600 ticks a min" },
    },
    {
      seconds: 4.8,
      caption: "Every two seconds the engine publishes one snapshot of those numbers to Redis.",
      move: { from: "engine", to: "redis", label: "snapshot", tone: "commit" },
      facts: { redis: "ticks 600 · evals ok" },
    },
    {
      seconds: 5.4,
      caption: "The feed dies. The process still answers its health check, so a check of liveness says all is well.",
      move: { from: "feed", to: "engine", label: "no ticks", tone: "fault" },
      health: { feed: "down" },
      facts: { engine: "health ok · ticks 0" },
    },
    {
      seconds: 5,
      caption: "A rule reads the snapshot: has a symbol in session been silent for 120 seconds?",
      move: { from: "redis", to: "alerts", label: "ticks 0 for 120 s", tone: "request" },
      facts: { redis: "ticks 0", alerts: "FEED_SILENT" },
    },
    {
      seconds: 5,
      caption: "The state changed, so one message goes out. It names the symptom, not a guess at the cause.",
      move: { from: "alerts", to: "phone", label: "FEED_SILENT", tone: "fault" },
      facts: { phone: "1 alert" },
    },
    {
      seconds: 5.2,
      caption: "Still broken ten minutes on, yet the phone stays quiet. Repeats every minute teach you to mute it.",
      move: { from: "redis", to: "alerts", label: "still silent", tone: "request" },
      facts: { alerts: "next in 30 min", phone: "still 1 alert" },
    },
    {
      seconds: 5,
      caption: "The feed returns and the alarm closes the loop with a resolved notice.",
      move: { from: "alerts", to: "phone", label: "FEED resolved", tone: "reply" },
      health: { feed: "ok" },
      facts: { engine: "600 ticks a min", phone: "1 alert · resolved" },
    },
    {
      seconds: 5.4,
      caption: "If the engine itself dies, nothing is left to alarm. So it writes a heartbeat that expires.",
      move: { from: "engine", to: "redis", label: "heartbeat, 30 s", tone: "commit" },
      health: { engine: "down" },
      facts: { redis: "heartbeat 180 s old" },
    },
    {
      seconds: 5.2,
      caption: "A check from outside the engine sees the stale heartbeat and pages. The watcher is watched.",
      move: { from: "alerts", to: "phone", label: "engine silent", tone: "fault" },
      facts: { phone: "2 alerts" },
    },
  ],
  takeaway: {
    line: "Alert on symptoms, once, and watch the watcher.",
    sub: "Measure the work, send one message per change, and expire a heartbeat checked from outside.",
    seconds: 5.5,
  },
  lesson: {
    title: "Up, healthy, and told once",
    watchFor:
      "Compare the engine's line with the phone's. The engine says health ok while ticks sit at zero, and the phone gets one alert and one resolved notice instead of a message every minute.",
  },
};

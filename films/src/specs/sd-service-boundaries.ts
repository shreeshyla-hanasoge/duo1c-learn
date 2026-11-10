import type { FlowSpec } from "../kit/types";

/**
 * Service boundaries — the film for `sd-service-boundaries`.
 *
 * One change that crosses two services: a Laravel default that the Python
 * engine acts on. Shows a cheap asynchronous call across the wall, then the
 * hidden cost of sharing a database.
 */
export const sdServiceBoundaries: FlowSpec = {
  id: "sd-service-boundaries",
  kicker: "System design · M8",
  title: "One change, two services",
  nodes: [
    { id: "browser", role: "The trader", label: "Browser" },
    { id: "web", role: "PHP web app", label: "Laravel" },
    { id: "engine", role: "Python service", label: "Engine" },
    { id: "db", role: "One shared schema", label: "MySQL" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "Two services share one database. A wall between them is also a hidden contract.",
    },
    {
      seconds: 4.6,
      caption: "The trader starts a backtest. Laravel first saves a throwaway strategy for it.",
      move: { from: "browser", to: "web", label: "run backtest", tone: "request" },
      facts: { web: "builds strategy row" },
    },
    {
      seconds: 5,
      caption: "Laravel never set is_active, so the column default, true, is saved.",
      move: { from: "web", to: "db", label: "save strategy 88", tone: "commit" },
      facts: { db: "88 · is_active: true", web: "saved, moves on" },
    },
    {
      seconds: 5,
      caption: "The call to the engine is a real network call, so it hands back a job id at once.",
      move: { from: "web", to: "engine", label: "start job", tone: "request" },
      facts: { engine: "job queued" },
    },
    {
      seconds: 5,
      caption: "Nobody waits ten minutes on a connection. The browser polls every 4 seconds.",
      move: { from: "engine", to: "browser", label: "job id 17", tone: "reply" },
      facts: { browser: "polling every 4 s" },
    },
    {
      seconds: 5,
      caption: "Later the engine restarts. It starts every row where is_active is true.",
      move: { from: "engine", to: "db", label: "load active rows", tone: "request" },
      facts: { engine: "found 2 active" },
    },
    {
      seconds: 5.4,
      caption: "A PHP column default has just made a Python process go live. Nothing failed to compile.",
      move: { from: "db", to: "engine", label: "strategy 88", tone: "fault" },
      health: { engine: "slow" },
      facts: { engine: "88 started LIVE", db: "88 · is_active: true" },
    },
    {
      seconds: 5.2,
      caption: "Fix: Laravel sets is_active false on every throwaway row. The schema is the contract.",
      move: { from: "web", to: "db", label: "88 · is_active: false", tone: "commit" },
      health: { engine: "ok" },
      facts: { db: "88 · is_active: false", engine: "88 stopped" },
    },
    {
      seconds: 5,
      caption: "The next restart finds only real strategies. Each wall pays only if it is written down.",
      move: { from: "engine", to: "db", label: "load active rows", tone: "request" },
      facts: { engine: "1 active, correct" },
    },
  ],
  takeaway: {
    line: "Draw a wall only where sides truly differ.",
    sub: "A shared database makes the schema the real contract. Write it down and name an owner.",
    seconds: 5.5,
  },
  lesson: {
    title: "The column that went live",
    watchFor:
      "Watch the line under MySQL and the one under Engine. A default value saved by PHP changes what the Python engine starts, and only a written contract stops it.",
  },
};

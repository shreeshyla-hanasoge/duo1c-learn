import type { FlowSpec } from "../kit/types";

/**
 * Deploying while the market is open — the film for `sd-deploy-safety`.
 *
 * A guard refuses a deploy at 11:10 because a live position exists, the same
 * deploy goes through after the close by building beside and swapping one
 * symlink, and rollback is the same swap backwards. Release names and times
 * are illustrative.
 */
export const sdDeploySafety: FlowSpec = {
  id: "sd-deploy-safety",
  kicker: "System design · M7",
  title: "A deploy that waits its turn",
  nodes: [
    { id: "deploy", role: "Deploy script", label: "Deploy" },
    { id: "guard", role: "Clock check", label: "Guard" },
    { id: "mysql", role: "Live positions", label: "MySQL" },
    { id: "server", role: "Releases", label: "Server" },
    { id: "engine", role: "Strategy engine", label: "Engine" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "It is 11:10 and a live short is open. Every deploy ends by restarting the engine.",
      facts: { engine: "managing a short", server: "current → r41" },
    },
    {
      seconds: 4.8,
      caption: "Before anything changes, the script asks the guard whether now is a safe time.",
      move: { from: "deploy", to: "guard", label: "may I deploy?", tone: "request" },
      facts: { guard: "11:10 · NSE open" },
    },
    {
      seconds: 4.8,
      caption: "A session is open, so the clock alone is not enough. The guard asks about money at risk.",
      move: { from: "guard", to: "mysql", label: "live positions?", tone: "request" },
    },
    {
      seconds: 4.8,
      caption: "One row is open. A restart now would stop exit handling for that position.",
      move: { from: "mysql", to: "guard", label: "1 open position", tone: "reply" },
      facts: { guard: "session + position" },
    },
    {
      seconds: 5.2,
      caption: "The deploy is refused. A wait costs hours, while a restart into an open position can cost far more.",
      move: { from: "guard", to: "deploy", label: "blocked", tone: "fault" },
      facts: { deploy: "waiting", engine: "untouched" },
    },
    {
      seconds: 4.8,
      caption: "At 15:45 the session is shut and no position remains. The guard lets the script through.",
      move: { from: "deploy", to: "guard", label: "may I deploy?", tone: "request" },
      facts: { guard: "closed · no positions", mysql: "0 open rows" },
    },
    {
      seconds: 5.2,
      caption: "The new code is built in its own folder beside the live one. Nothing running is touched.",
      move: { from: "deploy", to: "server", label: "build r42", tone: "commit" },
      facts: { server: "current → r41 · r42 built" },
    },
    {
      seconds: 5,
      caption: "One pointer moves. Users see the old release or the new one, never a half-copied mix.",
      move: { from: "deploy", to: "server", label: "switch current", tone: "commit" },
      facts: { server: "current → r42 · r41 kept" },
    },
    {
      seconds: 4.8,
      caption: "Only now does the engine restart, onto the new code.",
      move: { from: "deploy", to: "engine", label: "restart", tone: "request" },
      facts: { engine: "running r42" },
    },
    {
      seconds: 5.4,
      caption: "If r42 misbehaves, the same switch goes backwards. It moves code, not data.",
      move: { from: "deploy", to: "server", label: "point back to r41", tone: "reply" },
      facts: { server: "current → r41 · r42 kept", mysql: "schema untouched" },
    },
  ],
  takeaway: {
    line: "Build beside, switch once, and not into a position.",
    sub: "Gate a deploy on money at risk. Keep the old release, and treat data changes as their own decision.",
    seconds: 5.5,
  },
  lesson: {
    title: "Refused at 11:10, shipped at 15:45",
    watchFor:
      "Follow the server's line. A new release is built before the pointer moves, the old one stays on disk, and the guard says no while the database shows an open position. The morning deploy never touches the engine.",
  },
};

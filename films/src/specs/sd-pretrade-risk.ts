import type { FlowSpec } from "../kit/types";

/**
 * Gates outside the strategy — the film for `sd-pretrade-risk`.
 *
 * A normal 1,800-unit buy passes the gates; a sizing bug asking for 11,000
 * is clipped; an unreadable balance blocks an entry; a loss trip is kept in
 * the database. Figures are the lesson's own; the balance is illustrative.
 */
export const sdPretradeRisk: FlowSpec = {
  id: "sd-pretrade-risk",
  kicker: "System design · M9",
  title: "Gates between signal and broker",
  nodes: [
    { id: "strategy", role: "Proposes", label: "Strategy" },
    { id: "gates", role: "Risk layer", label: "Gates" },
    { id: "db", role: "Loss ledger", label: "MySQL" },
    { id: "broker", role: "Real account", label: "Broker" },
    { id: "operator", role: "A person", label: "Operator" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "The strategy proposes. A separate, simpler layer decides what may leave.",
    },
    {
      seconds: 4.6,
      caption: "A signal: buy 1,800 NIFTY option units at ₹120. The gates run in a fixed order.",
      move: { from: "strategy", to: "gates", label: "buy 1,800 at ₹120", tone: "request" },
      facts: { strategy: "signal: 1,800 units", gates: "gate 1: loss block" },
    },
    {
      seconds: 4.6,
      caption: "Gate one asks whether today's loss limit was hit. The answer is kept in a database.",
      move: { from: "gates", to: "db", label: "tripped today?", tone: "request" },
      facts: { db: "no trip today", gates: "gate 2: funds" },
    },
    {
      seconds: 5,
      caption: "Gate two reads real buying power. It needs 1,800 × ₹120 plus 2%, so ₹2,20,320.",
      move: { from: "broker", to: "gates", label: "buying power ₹3,00,000", tone: "reply" },
      facts: { gates: "needs ₹2,20,320 · enough" },
    },
    {
      seconds: 4.6,
      caption: "Every gate passed, so the order is allowed out.",
      move: { from: "gates", to: "broker", label: "buy 1,800", tone: "commit" },
      facts: { broker: "order accepted", gates: "1 sent" },
    },
    {
      seconds: 4.8,
      caption: "Later, a sizing bug asks for 11,000 units. The strategy cannot see its own mistake.",
      move: { from: "strategy", to: "gates", label: "buy 11,000", tone: "request" },
      facts: { strategy: "bug: 11,000 units", gates: "exchange cap: 1,800" },
    },
    {
      seconds: 5.2,
      caption: "The last step clips it to 1,800 and logs an error. The exchange would reject it whole.",
      move: { from: "gates", to: "broker", label: "clipped to 1,800", tone: "fault" },
      facts: { gates: "clipped to 1,800", broker: "order accepted" },
    },
    {
      seconds: 5,
      caption: "If the balance cannot be read, reading nothing is not having funds. The entry is blocked.",
      move: { from: "broker", to: "gates", label: "no answer", tone: "fault" },
      health: { broker: "down" },
      facts: { gates: "unreadable · entry blocked" },
    },
    {
      seconds: 5,
      caption: "The loss limit trips. It is written to the database, so a restart cannot clear it.",
      move: { from: "gates", to: "db", label: "daily loss limit hit", tone: "commit" },
      health: { broker: "ok" },
      facts: { db: "trip saved · today", gates: "new entries blocked" },
    },
    {
      seconds: 5.2,
      caption: "Exit all is the manual stop. Exits are never blocked, and sold legs are bought back first.",
      move: { from: "operator", to: "gates", label: "exit all", tone: "request" },
      facts: { operator: "pressed exit all", gates: "buy back sold legs first" },
    },
  ],
  takeaway: {
    line: "Fail closed to enter, never to exit.",
    sub: "Keep limits outside the strategy and where a restart cannot clear them.",
    seconds: 5.5,
  },
  lesson: {
    title: "The second signature",
    watchFor:
      "Watch the line under Gates. It changes from 'enough' to a clip from 11,000 down to 1,800, then to 'entry blocked' when the balance cannot be read.",
  },
};

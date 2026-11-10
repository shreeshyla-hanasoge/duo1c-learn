import type { FlowSpec } from "../kit/types";

/**
 * Security — the film for `sd-security`.
 *
 * One request crossing trust boundaries, with identity checked at each gate.
 * The turn: a client claims to be another user, and the bridge uses the id
 * from its own record. A second, smaller turn shows failing closed.
 */
export const sdSecurity: FlowSpec = {
  id: "sd-security",
  kicker: "System design · M8",
  title: "Who is calling, at every gate",
  nodes: [
    { id: "browser", role: "Outside the gate", label: "Browser" },
    { id: "web", role: "Web app", label: "Laravel" },
    { id: "engine", role: "Private service", label: "Engine" },
    { id: "bridge", role: "Live feed relay", label: "Bridge" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "Each hop is a trust boundary. At each one, the receiver decides who is calling.",
    },
    {
      seconds: 4.6,
      caption: "The trader logs in. That proves who they are, not what they may touch.",
      move: { from: "browser", to: "web", label: "log in", tone: "request" },
      facts: { web: "session: user 7" },
    },
    {
      seconds: 5,
      caption: "Laravel calls the engine with a signed token that names the user.",
      move: { from: "web", to: "engine", label: "run · token user 7", tone: "request" },
      facts: { engine: "checking token" },
    },
    {
      seconds: 5,
      caption: "The engine checks signature, expiry, issuer, and that user 7 exists. Then it acts.",
      move: { from: "engine", to: "web", label: "accepted", tone: "reply" },
      facts: { engine: "never faces users" },
    },
    {
      seconds: 4.8,
      caption: "For the live feed, the browser connects with a token. The bridge verifies it once.",
      move: { from: "browser", to: "bridge", label: "connect + token", tone: "request" },
      facts: { bridge: "record: conn → user 7" },
    },
    {
      seconds: 5.2,
      caption: "A client now claims to be user 9. It is only a claim in the message body.",
      move: { from: "browser", to: "bridge", label: "subscribe as user 9", tone: "fault" },
      facts: { bridge: "ignores body, user 7" },
    },
    {
      seconds: 5,
      caption: "The bridge takes the id from its own record, so ticks go only to user 7.",
      move: { from: "bridge", to: "browser", label: "ticks for user 7", tone: "commit" },
      facts: { browser: "own data only" },
    },
    {
      seconds: 5,
      caption: "The bridge asks Laravel for its key. Laravel's own secret is not configured.",
      move: { from: "bridge", to: "web", label: "give me the key", tone: "request" },
      health: { web: "slow" },
      facts: { web: "secret unset" },
    },
    {
      seconds: 5,
      caption: "Failing closed: with no secret to check, the endpoint refuses everyone.",
      move: { from: "web", to: "bridge", label: "refused", tone: "fault" },
      facts: { bridge: "no key, no feed" },
    },
    {
      seconds: 5.2,
      caption: "Once configured, it returns only the key and today's token. Both die at the daily reset.",
      move: { from: "web", to: "bridge", label: "key + today's token", tone: "commit" },
      health: { web: "ok" },
      facts: { web: "secret set", bridge: "token valid today" },
    },
  ],
  takeaway: {
    line: "Never trust an identity a caller claims.",
    sub: "Check at every boundary, fail closed, and give each credential the least it needs.",
    seconds: 5.5,
  },
  lesson: {
    title: "A token at every gate",
    watchFor:
      "Watch the line under Bridge. It holds user 7 from the verified token, so a message claiming to be user 9 changes nothing. Later it holds only today's token.",
  },
};

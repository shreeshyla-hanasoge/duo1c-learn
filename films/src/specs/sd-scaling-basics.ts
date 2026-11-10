import type { FlowSpec } from "../kit/types";

/**
 * Scaling out the stateless tier — the film for `sd-scaling-basics`.
 *
 * A second server is added while login sessions still live in the first
 * server's memory. The user is logged out at random until sessions move to a
 * shared store. Then a server can crash and nothing is lost.
 */
export const sdScalingBasics: FlowSpec = {
  id: "sd-scaling-basics",
  kicker: "System design · M1",
  title: "Why servers must keep no state",
  nodes: [
    { id: "user", role: "A logged-in user", label: "User" },
    { id: "lb", role: "Shares requests", label: "Balancer" },
    { id: "a", role: "App copy", label: "Server A" },
    { id: "b", role: "App copy", label: "Server B" },
    { id: "store", role: "Shared store", label: "Redis" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "One server was enough. Now we add a second, so the work can be shared.",
      facts: { a: "alone until now", b: "just added" },
    },
    {
      seconds: 5,
      caption: "The user logs in. Server A keeps the login session in its own memory.",
      move: { from: "user", to: "a", label: "log in", tone: "commit" },
      facts: { a: "session s1 in memory", user: "logged in" },
    },
    {
      seconds: 4.8,
      caption: "The next request goes to Server B, because the balancer shares requests out.",
      move: { from: "lb", to: "b", label: "request + cookie s1", tone: "request" },
      facts: { lb: "next copy: B", b: "has no session s1" },
    },
    {
      seconds: 5.4,
      caption: "B has never heard of s1, so it asks the user to log in again. Users are logged out at random.",
      move: { from: "b", to: "user", label: "please log in", tone: "fault" },
      facts: { user: "logged out" },
      health: { b: "slow" },
    },
    {
      seconds: 5.2,
      caption: "The fix is to move the session out of the server and into a store that every copy can reach.",
      move: { from: "a", to: "store", label: "save session s1", tone: "commit" },
      facts: { store: "s1 = user 7", a: "keeps no session" },
      health: { b: "ok" },
    },
    {
      seconds: 5,
      caption: "Now B looks up the cookie in the store instead of in its own memory.",
      move: { from: "b", to: "store", label: "get s1", tone: "request" },
      facts: { b: "asks the store" },
    },
    {
      seconds: 4.8,
      caption: "The store knows s1, so B answers as if it had been there all along.",
      move: { from: "store", to: "b", label: "user 7", tone: "reply" },
      facts: { b: "serves user 7", user: "still logged in" },
    },
    {
      seconds: 5.4,
      caption: "Server A crashes. Nothing is lost, because A kept nothing that B could not rebuild.",
      move: { from: "lb", to: "b", label: "all requests", tone: "request" },
      health: { a: "down" },
      facts: { a: "crashed", lb: "A removed", store: "s1 still safe" },
    },
    {
      seconds: 5.4,
      caption: "State has not gone away. It lives in a few stores now, so one of them is the next bottleneck.",
      move: { from: "b", to: "store", label: "200 reads a second", tone: "request" },
      facts: { store: "10 in flight (200 × 50 ms)" },
    },
  ],
  takeaway: {
    line: "Make servers stateless, then add copies.",
    sub: "Keep sessions, files and records in shared stores. Then measure which store runs out first.",
    seconds: 5.5,
  },
  lesson: {
    title: "The session that stayed behind",
    watchFor:
      "Watch Server B's line and the user's line. B 'has no session s1' and the user is logged out; once the session sits in Redis, B finds user 7 and the user stays logged in.",
  },
};

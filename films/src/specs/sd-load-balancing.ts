import type { FlowSpec } from "../kit/types";

/**
 * Load balancing — the film for `sd-load-balancing`.
 *
 * Round robin hands slow reports to one server by turns; least connections
 * adapts to the open count; a health check removes a dead server.
 * Counts and timings are illustrative.
 */
export const sdLoadBalancing: FlowSpec = {
  id: "sd-load-balancing",
  kicker: "System design · M1",
  title: "How a balancer picks a server",
  nodes: [
    { id: "client", role: "Many users", label: "Clients" },
    { id: "lb", role: "Chooses a server", label: "Balancer" },
    { id: "s1", role: "Server", label: "Server 1" },
    { id: "s2", role: "Server", label: "Server 2" },
    { id: "s3", role: "Server", label: "Server 3" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Three servers, two kinds of request: a report takes 2 seconds, a ping takes 2 milliseconds.",
      facts: { lb: "round robin: 1, 2, 3", s1: "open: 0", s2: "open: 0", s3: "open: 0" },
    },
    {
      seconds: 4.6,
      caption: "Request 1 is a report. It is Server 1's turn, so it goes there.",
      move: { from: "lb", to: "s1", label: "report #1", tone: "request" },
      facts: { s1: "open: 1", lb: "next turn: 2" },
    },
    {
      seconds: 4.6,
      caption: "Requests 2 and 3 are pings. Servers 2 and 3 finish them at once.",
      move: { from: "lb", to: "s2", label: "ping #2", tone: "request" },
      alsoMove: { from: "lb", to: "s3", label: "ping #3", tone: "request" },
      facts: { s2: "open: 0", s3: "open: 0", lb: "next turn: 1" },
    },
    {
      seconds: 5,
      caption: "Round robin counts turns, not work. Report 4 is Server 1's turn again, though it is still busy.",
      move: { from: "lb", to: "s1", label: "report #4", tone: "fault" },
      facts: { s1: "open: 2 · slow", lb: "next turn: 2" },
      health: { s1: "slow" },
    },
    {
      seconds: 5,
      caption: "Pings 5 and 6 are quick. Report 7 lands on Server 1 a third time, and the line there grows.",
      move: { from: "lb", to: "s1", label: "report #7", tone: "fault" },
      facts: { s1: "open: 3 · slow", s2: "open: 0", s3: "open: 0" },
    },
    {
      seconds: 5.2,
      caption: "Switch to least connections: the balancer sends each request to the server with fewest open ones.",
      move: { from: "lb", to: "s2", label: "report #8", tone: "commit" },
      facts: { lb: "least connections", s2: "open: 1" },
    },
    {
      seconds: 5,
      caption: "Server 1 has 3 open, Server 2 has 1, Server 3 has 0. So the next request goes to Server 3.",
      move: { from: "lb", to: "s3", label: "report #9", tone: "commit" },
      facts: { s3: "open: 1", lb: "picks the emptiest" },
    },
    {
      seconds: 5,
      caption: "Every 5 seconds the balancer asks each server whether it is alive. Server 3 has crashed.",
      move: { from: "lb", to: "s3", label: "GET /health", tone: "request" },
      health: { s3: "down" },
      facts: { s3: "no answer", lb: "failed checks: 1 of 3" },
    },
    {
      seconds: 5,
      caption: "After 3 failed checks it stops sending to Server 3, so one crash does not keep failing requests.",
      move: { from: "s3", to: "lb", label: "timeout", tone: "fault" },
      facts: { lb: "pool: Server 1, 2", s3: "out of pool" },
    },
    {
      seconds: 5,
      caption: "To remove a healthy server, drain it: no new requests, and the open ones finish first.",
      move: { from: "s1", to: "client", label: "reports #1, #4, #7", tone: "reply" },
      facts: { s1: "open: 0 · drained" },
      health: { s1: "ok" },
    },
  ],
  takeaway: {
    line: "Count the work, not the turns.",
    sub: "Pick by open connections, check health, and drain a server before you remove it.",
    seconds: 5.5,
  },
  lesson: {
    title: "Round robin, then least connections",
    watchFor:
      "Watch the 'open' count under each server. Under round robin Server 1 climbs to 3 while the others sit at 0; under least connections the new requests go to the emptiest server.",
  },
};

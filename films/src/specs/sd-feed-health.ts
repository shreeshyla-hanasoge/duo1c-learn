import type { FlowSpec } from "../kit/types";

/**
 * Feed health and staleness detection — the film for `sd-feed-health`.
 *
 * One socket, two symbols: GOLD keeps ticking, NIFTY goes silent. A socket-wide
 * clock stays fresh; a per-symbol clock catches it. Thresholds are the lesson's:
 * 90 s to resubscribe, 120 s to flag, and a page once with a resolved notice.
 */
export const sdFeedHealth: FlowSpec = {
  id: "sd-feed-health",
  kicker: "System design · M7",
  title: "Is the feed really alive?",
  nodes: [
    { id: "feed", role: "Broker socket", label: "Feed" },
    { id: "engine", role: "Tick clocks", label: "Engine" },
    { id: "watchdog", role: "Staleness check", label: "Watchdog" },
    { id: "phone", role: "The operator", label: "Phone" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "One socket carries ticks for GOLD and NIFTY. The engine keeps a clock for each symbol.",
      facts: { engine: "GOLD 1 s · NIFTY 1 s" },
    },
    {
      seconds: 4.8,
      caption: "GOLD ticks all the time, so a clock for the whole socket would always look fresh.",
      move: { from: "feed", to: "engine", label: "GOLD tick", tone: "commit" },
      facts: { engine: "socket clock: 1 s" },
    },
    {
      seconds: 5,
      caption: "NIFTY goes quiet but the socket stays open. No error appears anywhere.",
      move: { from: "feed", to: "engine", label: "GOLD tick", tone: "commit" },
      health: { feed: "slow" },
      facts: { engine: "GOLD 1 s · NIFTY 60 s", feed: "NIFTY: silent" },
    },
    {
      seconds: 5,
      caption: "At 90 seconds of silence the watchdog does the cheap fix first: subscribe to NIFTY again.",
      move: { from: "watchdog", to: "feed", label: "resubscribe NIFTY", tone: "request" },
      facts: { engine: "GOLD 1 s · NIFTY 90 s", watchdog: "healing, 1st try" },
    },
    {
      seconds: 5,
      caption: "Still nothing. The resubscribe did not help, and the silence keeps growing.",
      move: { from: "feed", to: "engine", label: "GOLD tick", tone: "commit" },
      facts: { engine: "NIFTY 120 s", watchdog: "limit passed" },
    },
    {
      seconds: 5.2,
      caption: "Past 120 seconds the watchdog stops healing quietly and tells a person, once.",
      move: { from: "watchdog", to: "phone", label: "NIFTY silent", tone: "fault" },
      facts: { phone: "1 alert", watchdog: "flag raised" },
    },
    {
      seconds: 5,
      caption: "Two minutes later it is still broken, but no second message. Alerts follow changes, not levels.",
      move: { from: "engine", to: "watchdog", label: "NIFTY 240 s", tone: "request" },
      facts: { phone: "still 1 alert", watchdog: "next reminder 30 min" },
    },
    {
      seconds: 5.2,
      caption: "A fresh socket brings NIFTY back. The clock resets to zero.",
      move: { from: "feed", to: "engine", label: "NIFTY tick", tone: "commit" },
      health: { feed: "ok" },
      facts: { engine: "GOLD 1 s · NIFTY 1 s", feed: "both live" },
    },
    {
      seconds: 5.2,
      caption: "The watchdog says so, so silence from the channel can be trusted again.",
      move: { from: "watchdog", to: "phone", label: "NIFTY resolved", tone: "reply" },
      facts: { phone: "1 alert, 1 resolved", watchdog: "all clear" },
    },
    {
      seconds: 5.2,
      caption: "At 15:31 the NSE closes and NIFTY is quiet on purpose. Each feed is judged by its own session.",
      move: { from: "watchdog", to: "engine", label: "NSE open?", tone: "request" },
      facts: { engine: "NSE closed · MCX open", watchdog: "no alert" },
    },
  ],
  takeaway: {
    line: "Keep one clock per instrument.",
    sub: "Judge each by its own market hours, heal first, and alert once when it changes.",
    seconds: 5.5,
  },
  lesson: {
    title: "One socket, one dead symbol",
    watchFor:
      "Read the engine's line. The socket looks busy because GOLD keeps ticking, while the NIFTY clock climbs from 60 to 240 seconds. The phone gets one alert, then one resolved notice, and nothing in between.",
  },
};

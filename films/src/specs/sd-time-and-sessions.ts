import type { FlowSpec } from "../kit/types";

/**
 * Time, clocks and sessions — the film for `sd-time-and-sessions`.
 *
 * Event time versus arrival, a UTC stamp read as IST (silent, 5 h 30 min
 * early), the bar-open stamp, and a holiday the clock check misses.
 */
export const sdTimeAndSessions: FlowSpec = {
  id: "sd-time-and-sessions",
  kicker: "System design · M4",
  title: "Which clock, which edge, which day",
  nodes: [
    { id: "exchange", role: "Runs on IST", label: "Exchange" },
    { id: "feed", role: "Server clock UTC", label: "Feed" },
    { id: "engine", role: "Naive IST inside", label: "Engine" },
    { id: "calendar", role: "Holidays, sessions", label: "Calendar" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A time like 09:15 means nothing until you know the clock, the edge of the bar and the day.",
    },
    {
      seconds: 5,
      caption: "Event time is when it happened at the exchange. Processing time is when we saw it.",
      move: { from: "exchange", to: "feed", label: "trade 10:14:59.9", tone: "request" },
      facts: { exchange: "event time 10:14:59.9" },
    },
    {
      seconds: 5.4,
      caption: "It arrives 0.3 seconds later. Bucket it by event time, so it belongs to the 10:14 candle.",
      move: { from: "feed", to: "engine", label: "arrives 10:15:00.2", tone: "request" },
      facts: { feed: "seen 10:15:00.2", engine: "goes to 10:14 candle" },
    },
    {
      seconds: 5.4,
      caption: "The server runs in UTC. Read 03:45 as IST and the 09:15 bar lands 5 hours 30 minutes early.",
      move: { from: "feed", to: "engine", label: "bar 03:45 (UTC)", tone: "fault" },
      health: { engine: "slow" },
      facts: { engine: "reads 03:45 as IST" },
    },
    {
      seconds: 5.4,
      caption: "There was no error, just a valid-looking wrong row. So convert once, at the edge, naming the zone.",
      move: { from: "engine", to: "feed", label: "convert: Asia/Kolkata", tone: "request" },
      health: { engine: "ok" },
      facts: { engine: "03:45 UTC = 09:15 IST", feed: "zone named, not default" },
    },
    {
      seconds: 5.4,
      caption: "Stamps mean bar-open: the 09:15 bar is complete only at 09:16. Read it sooner and you look ahead.",
      move: { from: "feed", to: "engine", label: "bar 09:15", tone: "commit" },
      facts: { engine: "09:15 bar: closes 09:16" },
    },
    {
      seconds: 5.4,
      caption: "A rule at 10:15 may use the 5-minute bar from 10:10. It has closed; the 10:15 bar has not begun.",
      move: { from: "feed", to: "engine", label: "5-min bar 10:10", tone: "commit" },
      facts: { engine: "uses 10:10, not 10:15" },
    },
    {
      seconds: 4.6,
      caption: "Before acting, the engine asks the calendar whether the market is open today.",
      move: { from: "engine", to: "calendar", label: "open today?", tone: "request" },
      facts: { calendar: "published holiday list" },
    },
    {
      seconds: 5.4,
      caption: "A weekday-plus-clock check says open. The calendar knows the exchange is shut, so no order goes out.",
      move: { from: "calendar", to: "engine", label: "closed: holiday", tone: "reply" },
      facts: { engine: "no trading today", calendar: "weekday, but shut" },
    },
  ],
  takeaway: {
    line: "Name the zone, the edge and the day.",
    sub: "A time bug returns a plausible wrong number, so set one convention and convert at the boundary.",
    seconds: 5.5,
  },
  lesson: {
    title: "Three questions about a time",
    watchFor:
      "Watch the line under the engine. It reads 03:45 as IST by mistake, then 'UTC = IST' once the zone is named, and finally 'no trading today' when the calendar overrules the clock.",
  },
};

import type { FlowSpec } from "../kit/types";

/**
 * Design a stock exchange — the film for `sd-design-stock-exchange`.
 *
 * One order goes gateway, sequencer, single-threaded engine. A bad order
 * never gets a number, threads would make order timing-dependent, and a
 * crashed engine is rebuilt by replaying the journal.
 */
export const sdDesignStockExchange: FlowSpec = {
  id: "sd-design-stock-exchange",
  kicker: "System design · M10",
  title: "One order, one thread, one journal",
  nodes: [
    { id: "member", role: "Broker or trader", label: "Member" },
    { id: "gw", role: "Validation, risk", label: "Gateway" },
    { id: "seq", role: "Numbers, journal", label: "Sequencer" },
    { id: "eng", role: "One thread", label: "Engine" },
    { id: "feed", role: "Public data", label: "Feed" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "An exchange does not need clever parallelism. It needs one agreed order of arrival.",
      facts: { eng: "book: sell 60 @ 10005" },
    },
    {
      seconds: 4.6,
      caption: "A member sends a buy with a typo: 100 at 100,050 ticks, ten times the real price.",
      move: { from: "member", to: "gw", label: "buy 100 @ 100050", tone: "request" },
      facts: { gw: "checks price band" },
    },
    {
      seconds: 5,
      caption: "Pre-trade risk rejects it. A bad message never takes a sequence number.",
      move: { from: "gw", to: "member", label: "reject: price band", tone: "fault" },
      facts: { seq: "next number: 4201", gw: "rejected · no seq" },
    },
    {
      seconds: 4.6,
      caption: "The corrected order, 100 at 10005, passes every check.",
      move: { from: "member", to: "gw", label: "buy 100 @ 10005", tone: "request" },
      facts: { gw: "passed risk checks" },
    },
    {
      seconds: 5.4,
      caption: "The sequencer stamps it 4201 and writes it to the journal before anything else happens.",
      move: { from: "gw", to: "seq", label: "accepted order", tone: "commit" },
      facts: { seq: "stamped #4201 · journaled" },
    },
    {
      seconds: 5.4,
      caption: "Letting many threads match at once looks fast, but who wins then depends on thread timing.",
      move: { from: "gw", to: "eng", label: "two threads race", tone: "fault" },
      health: { eng: "slow" },
      facts: { eng: "order = timing · unfair" },
    },
    {
      seconds: 5.4,
      caption: "So the engine reads numbers in order, on one thread, with no locks. Same input, same result.",
      move: { from: "seq", to: "eng", label: "#4201 in order", tone: "commit" },
      health: { eng: "ok" },
      facts: { eng: "applies #4201 only" },
    },
    {
      seconds: 5.4,
      caption: "The buy meets the standing sell. 60 trade at 10005 and the other 40 rest in the book.",
      move: { from: "eng", to: "feed", label: "trade 60 @ 10005", tone: "commit" },
      facts: { eng: "buy: 40 resting", feed: "feed #88 · 60 traded" },
    },
    {
      seconds: 5.4,
      caption: "Then the engine crashes. Its memory is gone, but the journal still holds every numbered order.",
      move: { from: "seq", to: "eng", label: "#4202", tone: "fault" },
      health: { eng: "down" },
      facts: { eng: "down · memory lost", seq: "journal: #1 to #4202" },
    },
    {
      seconds: 5.4,
      caption: "A replacement replays the journal from the start. Same events in the same order give the same book.",
      move: { from: "seq", to: "eng", label: "replay #1 to #4202", tone: "commit" },
      health: { eng: "ok" },
      facts: { eng: "rebuilt: buy 40 resting" },
    },
  ],
  takeaway: {
    line: "One order, one worker, one replayable record.",
    sub: "Number every accepted message once, apply it in order, and a crash is only a replay.",
    seconds: 5.5,
  },
  lesson: {
    title: "One order through the exchange",
    watchFor:
      "Watch the sequence numbers under the Sequencer and the book under the Engine. The rejected order takes no number, and the rebuilt engine ends with the same '40 resting' it lost.",
  },
};

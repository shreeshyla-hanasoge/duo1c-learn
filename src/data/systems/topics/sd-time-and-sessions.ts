import type { Topic } from "../../types.ts";

export const sdTimeAndSessions: Topic = {
  id: "sd-time-and-sessions",
  title: "Time, clocks and market sessions",
  tier: 1,
  week: 2,
  depth: "deep",
  summary:
    "Time is data with a zone, an edge and a calendar. Name the zone, say whether a bar is stamped at open or close, and never assume a market is open.",
  why: "Most of Traed's quietest, most expensive bugs have been time bugs: a server in UTC, a market in IST, candles stamped at their start, and an exchange that shuts on days nobody told the code about. None of them raised an error. They produced a plausible wrong number. If you can name the convention at every boundary, you can prevent a whole class of silent failures and explain them to any engineer in a minute.",
  learn: {
    intuition:
      "Imagine a railway timetable. A train that leaves Mumbai at 09:15 does not arrive at 09:15. The word 09:15 tells you nothing until you know three things: which clock (the station's, or yours), which end of the journey (departure or arrival), and which days the train runs. Market data has the same three questions. Which clock: the exchange runs on Indian time, your server may run on world time, and your laptop on yet another. Which end: a one-minute candle labelled 09:15 may mean it opened at 09:15 or that it closed at 09:15, and the two differ by a whole minute of future. Which days: exchanges close for festivals, and MCX runs a morning session and an evening one. A reader who confuses any of these gets a number that looks right and is wrong.",
    mechanics: [
      {
        heading: "One clock inside, the zone named at every edge",
        body: "UTC is the world reference with no daylight saving; IST is UTC plus 5 hours 30 minutes and does not shift either. An epoch timestamp counts seconds since 1 January 1970 UTC and means the same instant everywhere. A bare local time such as 09:45 means nothing until you know its zone. Two safe designs exist: store real instants (UTC) and convert to IST only to show or to compare against exchange hours, or store naive IST wall-clock everywhere and enforce that. Both work. The disaster is mixing them. A 09:15 IST bar is 03:45 UTC; read it in the wrong zone and it is 5 hours 30 minutes early, in the previous session.",
      },
      {
        heading: "Bar-open or bar-close: which edge does the stamp mean?",
        body: "A one-minute candle covers 60 seconds. Stamp it at its open and the candle labelled 09:15 covers 09:15:00 to 09:15:59 and is complete only at 09:16. Stamp it at its close and the same candle is labelled 09:16. Neither is wrong. The danger is using a bar before it is closed, which is look-ahead. A safe rule is to read only bars whose close is at or before the decision time. For a 15-minute rule deciding at 10:15, a 5-minute bar opening at 10:10 has closed and is usable; one opening at 10:15 has not started. Always write down which edge your data uses.",
      },
      {
        heading: "Sessions, holidays and expiry: markets are not always open",
        body: "NSE equity and derivatives trade 09:15 to 15:30 on weekdays. MCX has a morning session and an evening one, running about 09:00 to 23:30, and 23:55 in the months when US daylight saving is off. Exchanges publish holiday lists, and MCX sometimes shuts only its morning, trading the evening on a day NSE is closed. Special sessions exist, such as Muhurat trading at Diwali, whose hours are announced late. Expiry days add their own clock: an option expires at the close, so risk rules often act earlier. A code check of weekday plus clock will be wrong on every one of these days.",
      },
      {
        heading: "Event time, processing time and clock skew",
        body: "Event time is when something happened at the exchange; processing time is when your machine saw it. They differ by network delay, and the gap grows when something queues. A tick traded at 10:14:59.9 and received at 10:15:00.2 belongs to the 10:14 candle, so bucket by event time, not by arrival. If you must fall back to your own clock, expect it to differ from other machines: two servers can disagree by tens of milliseconds, or by seconds if no time sync runs. Skew matters most when you compare timestamps from two sources, such as a broker's order time and your own log.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep one convention inside the engine: naive IST wall-clock, even though the server clock runs UTC, and we name the zone at every conversion. Candle stamps are bar-open, and a rule reads a higher-timeframe bar only after that bar has closed. Market hours come from a published calendar of holidays and half-sessions, with a live check that can close a session but never invent one. We accept that this relies on a calendar file we must update each year. We would move to storing true instants if we began trading outside India, where daylight saving makes a naive local time ambiguous.",
      },
    ],
    complexityDerivation:
      "The invariant is that every timestamp the system compares must mean the same instant and the same edge of its interval. Time bugs are hard because the failure is silent: a wrong zone or a wrong edge returns a valid-looking number from a valid-looking row. That is why the defence is a rule, not a fix. Choose one internal convention, convert at the boundary where data enters, and put the zone in the code (an explicit Asia/Kolkata, never the host default). It also explains why such bugs hide on a developer's laptop: a laptop in India runs in IST, so a bare local-time call happens to be right there and wrong on a UTC server. The design holds while one zone and one calendar cover your markets. It starts to fail the moment you add a second zone with daylight saving, such as US equities, where a naive local time can occur twice a year or not at all. Then you must store instants and derive local session times from a calendar, and 'is it open' becomes a lookup, not a comparison.",
    variants: [
      {
        name: "Store real instants (UTC)",
        when: "More than one zone, or any zone with daylight saving.",
        delta:
          "Every timestamp is unambiguous. Cost: every display and every session check needs a conversion, and forgetting one shows up as a visible offset.",
      },
      {
        name: "Naive local wall-clock (IST)",
        when: "One market in one zone with no daylight saving, such as NSE and MCX.",
        delta:
          "Simple to read and to compare with exchange hours. Cost: a host in another zone breaks it silently, and it cannot represent a daylight-saving gap.",
      },
      {
        name: "Calendar-driven sessions",
        when: "Any system that must know whether a market is open right now.",
        delta:
          "A published list of holidays and sessions per exchange, optionally checked against live trading. Cost: someone must refresh it every year.",
      },
    ],
    tradeoffs: [
      {
        vs: "Weekday plus clock to decide if a market is open",
        pick: "A published calendar plus a live check that can only veto",
        because:
          "The weekday check is wrong on every holiday and half-session. A live check that can close a session but never open one fails safe if it breaks.",
      },
      {
        vs: "Stamping candles at close",
        pick: "Stamp at open and read only closed bars",
        because:
          "Open stamps match how most data vendors label bars. The price is one extra rule, close at or before decision time, which stops look-ahead.",
      },
      {
        vs: "Trusting the host clock and zone",
        pick: "Name the zone in code at every conversion",
        because:
          "A bare local-time call depends on the machine. It is right on an Indian laptop and wrong on a UTC server, a bug you cannot reproduce locally.",
      },
    ],
  },
  realWorld: [
    {
      system: "NSE and MCX trading calendars",
      kind: "industry",
      problem:
        "Indian exchanges have different hours and different holidays, and some days only part of a day trades.",
      applied:
        "NSE publishes its trading holidays each year and runs equity and derivatives from 09:15 to 15:30. MCX publishes its own list and often shuts the morning session on days NSE is closed while trading the evening. Muhurat sessions at Diwali are announced separately. Brokers and data vendors all follow these published lists.",
      evidence: "NSE and MCX published annual holiday circulars; exchange trading-hours pages",
      impact:
        "A system that assumes one fixed schedule will treat holidays as feed outages or miss the MCX evening session.",
    },
    {
      system: "Unix epoch and UTC in logs and APIs",
      kind: "industry",
      problem:
        "Machines in different zones need to agree on one instant when they exchange events.",
      applied:
        "Most APIs and logs carry timestamps as epoch seconds or as ISO 8601 with an offset, and cloud providers run their servers in UTC by default. Interpreting a zone-less value in the wrong zone is a standard source of errors, which is why ISO 8601 carries the offset in the string.",
      evidence: "ISO 8601 and RFC 3339 date and time formats; POSIX definition of epoch time",
      impact:
        "It is why a UTC server and an Indian market clash unless the conversion is explicit.",
    },
    {
      system: "Traed: naive IST inside a UTC server",
      kind: "yours",
      problem:
        "The server clock runs UTC while the market and the engine's stored times are IST, and different data sources arrive in different shapes.",
      applied:
        "The engine keeps naive IST everywhere user-facing and converts with an explicit Asia/Kolkata zone. One incident joined naive-IST database rows to timezone-aware candles using the host zone, shifting a map by 5 hours 30 minutes: a 09:45 IST entry read the 15:15 IST bar and chose a strike far from the price. The same incident found three different epoch conventions in three code paths.",
      evidence:
        "strategy-engine/app/core/time_utils.py; docs/incidents/2026-08-15-long-straddle-backtest-no-trades.md",
      impact:
        "Fixes named the zone in code and added tests that run under a UTC host, so the bug can reproduce off a laptop.",
    },
    {
      system: "Traed: holiday calendar with a veto-only live check",
      kind: "yours",
      problem:
        "Weekday-plus-clock checks made the ops board call every feed a zombie on an exchange holiday, and strategies kept evaluating frozen candles.",
      applied:
        "A published calendar file lists NSE and MCX holidays, split days and special sessions. Five minutes into a session the calendar says is open, a quote of a few liquid instruments tests whether the exchange traded today. It can close a session, never open one, and any doubt leaves the calendar's answer standing. The MCX collector also covers the 09:00 to 23:30 session, not an NSE-shaped window.",
      evidence:
        "strategy-engine/app/services/market_calendar.py; CMS/shared/market_holidays.json; docs/mcx-futures-data.md",
      impact:
        "Holidays stop being outages, and a missing yearly calendar logs a warning instead of failing quietly.",
    },
  ],
  insights: [
    {
      t: "Name the zone every time",
      d: "A bare local time means nothing. Pick one internal convention, convert at the boundary, and put the zone in code, never in the host's settings.",
    },
    {
      t: "Open or close, then bars",
      d: "Know which edge a stamp marks. Read only bars whose close is at or before the decision time, or you are looking into the future.",
    },
    {
      t: "A market is not always open",
      d: "Holidays, split MCX days, special sessions and expiry days break weekday-plus-clock checks. Use a published calendar.",
    },
    {
      t: "Event time beats arrival time",
      d: "Bucket a tick by when it traded, not when it reached you, and expect clocks on different machines to disagree.",
    },
  ],
  pitfalls: [
    "Calling datetime.fromtimestamp or astimezone with no zone. It uses the host's zone, so the code is right on an Indian laptop and 5 hours 30 minutes off on a UTC server.",
    "Using an NSE session window for MCX. A 15:30 cut-off silently drops the evening session, where crude oil and natural gas do much of their trading.",
    "Reading a higher-timeframe bar by its open time. An hourly bar labelled 10:00 holds data to 11:00, so reading it at a 10:45 decision leaks the future.",
  ],
  quiz: [
    {
      q: "A one-minute candle is stamped 09:15 at bar-open. What does the stamp tell you?",
      options: [
        "It closed at 09:15, so it is available at 09:15",
        "It covers 09:15:00 to 09:15:59 and is complete only at 09:16",
        "It is the price of the last trade before 09:15 began",
        "It holds only the first tick that arrived after 09:15",
      ],
      answer: 1,
      why: "A bar-open stamp marks the start of the interval. The bar cannot be finished until its full 60 seconds have passed, so a rule must wait for 09:16 before using it.",
      difficulty: "recall",
      distractors: [
        "That is the bar-close convention. Mixing the two moves every signal by a full minute.",
        "",
        "A candle summarises a whole minute of trades, not one trade before it.",
        "The candle holds open, high, low and close of the whole minute, not only its first tick.",
      ],
    },
    {
      q: "What is a Unix epoch timestamp?",
      options: [
        "Seconds since midnight in the server's local zone",
        "A date string such as 2026-11-10 09:15 in IST",
        "The number of trading days since the exchange opened",
        "Seconds since 1 January 1970 UTC, the same instant everywhere",
      ],
      answer: 3,
      why: "An epoch value counts seconds from a fixed UTC moment, so it names one instant regardless of zone. Zones only matter when you turn it into a clock reading.",
      difficulty: "recall",
      distractors: [
        "That would depend on the host zone, which is exactly what an epoch avoids.",
        "A date string without an offset is ambiguous. It is not an epoch.",
        "Epoch time counts seconds, not trading days, and ignores holidays entirely.",
        "",
      ],
    },
    {
      q: "A broker returns candle times as epoch seconds in UTC. A UTC server reads them with a bare local-time call and prints the 09:15 IST bar. What does it show?",
      options: [
        "03:45, 5 hours 30 minutes early and in the wrong session",
        "09:15, because the call corrects for the market zone",
        "14:45, which is 5 hours 30 minutes late",
        "15:30, because it rolls to the session close",
      ],
      answer: 0,
      why: "09:15 IST is 03:45 UTC. A bare local-time call on a UTC host returns UTC, so the bar lands in the previous day's pre-market. Naming Asia/Kolkata in the conversion fixes it.",
      difficulty: "apply",
      distractors: [
        "",
        "A bare call knows only the host zone, never the market's. It would be right only on a machine set to IST.",
        "The offset is subtracted when converting IST to UTC, not added. The error runs early.",
        "Nothing in a time conversion looks at the session close.",
      ],
    },
    {
      q: "A job that collects crude oil bars only keeps timestamps from 09:15 to 15:30 IST. What is the effect?",
      options: [
        "It keeps all bars, since crude oil follows the NSE clock",
        "It keeps the morning bars and rounds the evening ones into 15:30",
        "It drops the evening session, where crude does much of its trading",
        "It stops at 15:30 and then restarts at 09:15 the next day with no gap",
      ],
      answer: 2,
      why: "MCX trades about 09:00 to 23:30. An NSE-shaped window discards everything after 15:30 and the bars before 09:15, and nothing errors, so the data just stays thin.",
      difficulty: "apply",
      distractors: [
        "MCX has its own hours. Crude oil futures do not follow the equity session.",
        "No rounding step exists. Bars outside the window are simply filtered out.",
        "",
        "There is a gap: the evening bars are missing and a later check shows them as absent.",
      ],
    },
    {
      q: "A tick traded at 10:14:59.9 reaches your server at 10:15:00.2. Which one-minute candle should it update, and why?",
      options: [
        "The 10:15 candle, since that is when you received it",
        "The 10:14 candle, since candles follow event time, not arrival time",
        "Neither, because ticks near a boundary are discarded",
        "Both, so the two candles overlap by a few milliseconds",
      ],
      answer: 1,
      why: "The trade belongs to the minute in which it happened. Using arrival time makes candles depend on network delay, so the same day replayed offline would not match the live one.",
      difficulty: "apply",
      distractors: [
        "Arrival time is easy to use but it moves trades between candles whenever the network is slow.",
        "",
        "Dropping boundary ticks loses real volume and creates a bias around every minute change.",
        "A tick belongs to exactly one bar. Overlap would double count volume.",
      ],
    },
    {
      q: "A rule decides on a 15-minute bar that opened at 10:00, so the decision is at 10:15. Which 5-minute bar is the latest one safe to read?",
      options: [
        "The bar opening at 10:15, which starts at the decision time",
        "The bar opening at 10:05, because it closes before 10:15",
        "The bar opening at 10:00, to stay inside the eval bar",
        "The bar opening at 10:10, which closes exactly at 10:15",
      ],
      answer: 3,
      why: "The rule is bar close at or before decision time. The 10:10 bar closes at 10:15, so it qualifies and is the latest. The 10:15 bar has not started.",
      difficulty: "apply",
      distractors: [
        "A bar opening at 10:15 has no data yet. Reading it means reading the future.",
        "It is safe but not the latest. The 10:10 bar has also closed by 10:15.",
        "That is the oldest bar inside the window. It is safe but ignores two newer closed bars.",
        "",
      ],
    },
    {
      q: "For deciding whether NSE is open now, which design is best?",
      options: [
        "A published holiday calendar plus a veto-only live check",
        "Check the weekday and a 09:15 to 15:30 clock window",
        "Treat the market as open whenever ticks are arriving",
        "Use a live check alone, with no published calendar",
      ],
      answer: 0,
      why: "The calendar gives the planned answer including half-sessions. The live check catches an unscheduled closure, and because it can only veto, a failure of the check leaves the safe planned answer in place.",
      difficulty: "judge",
      distractors: [
        "",
        "It is simple and wrong on every holiday, which then look like feed outages.",
        "A broken feed also produces no ticks, so you cannot tell a closed market from a dead feed.",
        "A live probe can fail or be ambiguous. Without a calendar, every failure makes the answer unknown.",
      ],
    },
    {
      q: "Which design choice best prevents a 5 hours 30 minutes error from recurring in a UTC server serving an Indian market?",
      options: [
        "Set the server clock to IST so the host matches the market",
        "Check the results by eye each morning for odd offsets",
        "Name the zone in code at every conversion and test under a UTC host",
        "Store all times as plain strings so no conversion is needed",
      ],
      answer: 2,
      why: "The bug comes from implicit host-dependent behaviour. Making the zone explicit and testing under UTC turns a silent production-only bug into a failing test.",
      difficulty: "judge",
      distractors: [
        "It hides the issue on one machine but any other host, container or library that assumes UTC will reintroduce it.",
        "Manual checks miss bugs that produce plausible numbers, which is the danger with time errors.",
        "",
        "Strings still need a zone to be read correctly and make comparisons harder, not easier.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-time-and-sessions-nightly-collector",
      scenario:
        "A one-person team adds a nightly job that saves MCX futures candles. The server clock runs UTC, the cron daemon uses the server zone, and MCX closes at 23:30 IST. The job must run after the close on weekdays, and the team is also adding a morning job at 07:30 IST. A previous job was written as 18:15 in the cron table by someone who did the sum by hand, and later nobody remembered why. Which scheduling approach do you choose?",
      options: [
        { label: "Hand-converted UTC", appeal: "It works today with no new tooling." },
        { label: "Scheduler with a named zone", appeal: "The schedule reads as the exchange's own time, with no mental sum." },
        { label: "Run before the close", appeal: "An early run feels safer than risking a late one." },
        { label: "Run every hour", appeal: "It removes the need to get the time right." },
      ],
      best: 1,
      verdict:
        "India has no daylight saving, so a hand sum works, but it makes the intent invisible and every new job repeats the sum. Declaring the zone in the scheduler keeps the schedule readable as 23:45 IST. Running before the close drops the last session minutes. Hourly runs waste requests against a rate-limited API.",
      claims: [
        {
          text: "You trade a small dependency on the scheduler's zone handling for schedules that read as the exchange's own times.",
          axis: "trade",
          correct: true,
          note: "True. The cost is trusting one component to convert, in exchange for removing mental arithmetic.",
        },
        {
          text: "Hand-converted UTC entries are safer because they avoid any zone logic at all.",
          axis: "trade",
          correct: false,
          note: "The zone logic is still there, in a person's head. It is simply unchecked.",
        },
        {
          text: "A job set before the close will save partial data for the day, and nothing will report the missing minutes.",
          axis: "failure",
          correct: true,
          note: "A job that runs and succeeds on incomplete data is the quiet failure mode of time bugs.",
        },
        {
          text: "If the scheduler's zone were wrong by 5 hours 30 minutes, the job would fail loudly.",
          axis: "failure",
          correct: false,
          note: "It would run at the wrong hour and either save partial data or run before the file exists, both without an error.",
        },
        {
          text: "Check that the last stored bar of each night is at or near 23:29 IST for each active contract.",
          axis: "measure",
          correct: true,
          note: "The final bar's time shows whether the session was captured fully, and it turns a silent gap into a visible number.",
        },
        {
          text: "Check only that the job's exit code is zero.",
          axis: "measure",
          correct: false,
          note: "A job with a wrong window can exit cleanly. Exit codes do not say what was stored.",
        },
      ],
    },
    {
      id: "sd-time-and-sessions-multi-market",
      scenario:
        "A brokerage with 40 engineers and 2 million clients adds US equities to its Indian offering. It already stores naive IST wall-clock in a shared database used by 15 services. US markets open at 09:30 New York time, which is 19:00 or 20:00 IST depending on the season, because the US and India change clocks on different dates. Order audit trails must be exact for regulators. What storage design do you choose for timestamps?",
      options: [
        { label: "Naive IST plus zone column", appeal: "Smallest change to a database that 15 services already use." },
        { label: "Local time per market", appeal: "Each team reads times in its own market's clock." },
        { label: "UTC instants plus calendar", appeal: "Exact for audit trails and correct across daylight-saving changes." },
        { label: "Fixed offsets", appeal: "Simple arithmetic with no zone library." },
      ],
      best: 2,
      verdict:
        "With daylight saving in one zone, a naive local time is ambiguous (the same wall time can happen twice, or not at all). Real instants are exact for an audit trail, and zone names plus a calendar handle shifts. Fixed offsets break twice a year. Naive IST plus a zone column keeps the ambiguity and adds a field every one of the 15 services must remember.",
      claims: [
        {
          text: "You accept a conversion step at every display and every session check in return for unambiguous stored times.",
          axis: "trade",
          correct: true,
          note: "Right. Conversion cost is the price of exactness, and a shared library keeps it in one place.",
        },
        {
          text: "Storing UTC removes the need for a market calendar.",
          axis: "trade",
          correct: false,
          note: "UTC fixes the timestamp, not the schedule. Whether and when a market is open still needs a calendar per exchange.",
        },
        {
          text: "A fixed -4 hour offset for New York is correct for the whole year.",
          axis: "failure",
          correct: false,
          note: "The offset changes with daylight saving. A fixed value is wrong for part of the year and the error is silent.",
        },
        {
          text: "Services that read old naive-IST rows after the change will misread them unless the migration marks the convention.",
          axis: "failure",
          correct: true,
          note: "A mixed table is the dangerous state. The rows need a clear conversion and a cut-over, or two meanings will coexist.",
        },
        {
          text: "Replay a day around a US clock change and check that the session open times match the exchange's own.",
          axis: "measure",
          correct: true,
          note: "The weeks when India and the US are out of step are the cases most likely to expose a hidden offset assumption.",
        },
        {
          text: "Count the number of services that import the timezone library.",
          axis: "measure",
          correct: false,
          note: "Usage count says nothing about correctness. Tests of real clock-change dates do.",
        },
      ],
    },
    {
      id: "sd-time-and-sessions-holiday-alerts",
      scenario:
        "A one-server engine pages its founder every few minutes on a weekday exchange holiday: every feed is reported as a zombie, and a watchdog resubscribes all instruments all day. Strategies also keep evaluating yesterday's frozen candles. The check in use is weekday plus 09:15 to 15:30. The founder wants this fixed once, with little yearly effort. What do you build?",
      options: [
        { label: "Mute on low ticks", appeal: "Quiet days stop paging, with no calendar to maintain." },
        { label: "Holidays in code", appeal: "Direct and explicit, and easy to review." },
        { label: "Calendar plus veto-only probe", appeal: "Data edited yearly, covers split MCX days, and the probe fails safe." },
        { label: "Rely on the broker", appeal: "Nothing to build or maintain." },
      ],
      best: 2,
      verdict:
        "A calendar file removes code changes from the yearly update, covers MCX split days, and a veto-only probe catches unscheduled closures without ever inventing a session. Muting on low ticks hides real outages, since a dead feed also has few ticks. Holidays in code need a deploy each time. Trusting the broker removes the alarm that matters.",
      claims: [
        {
          text: "You accept a yearly chore of updating a calendar file in exchange for no code changes.",
          axis: "trade",
          correct: true,
          note: "True. A data file can be edited by anyone, and the engine can warn when the current year is missing.",
        },
        {
          text: "A probe that can both open and close sessions would be safer than a veto-only one.",
          axis: "trade",
          correct: false,
          note: "If the probe could open a session, a failed call or a stale quote could start trading on a holiday. Veto-only fails safe.",
        },
        {
          text: "If the calendar for the current year is missing, only weekends and the live check close a session.",
          axis: "failure",
          correct: true,
          note: "Without the file, holidays are caught only by the probe. A loud warning is needed so the gap is noticed.",
        },
        {
          text: "A live probe that cannot reach the broker should declare the market closed.",
          axis: "failure",
          correct: false,
          note: "Doubt must leave the calendar's answer standing. Declaring closed on an error would stop trading on a normal day.",
        },
        {
          text: "Count false feed-stall alerts on holidays and half-sessions before and after, and expect zero after.",
          axis: "measure",
          correct: true,
          note: "The failure was false alarms on closed days, so that count is the direct evidence of the fix.",
        },
        {
          text: "Measure the number of ticks per second on holidays.",
          axis: "measure",
          correct: false,
          note: "On a holiday the right figure is zero, so the number cannot say whether the check works.",
        },
      ],
    },
  ],
};

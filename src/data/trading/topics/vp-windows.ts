import type { Topic } from "../../types.ts";

/*
 * Synthetic numbers: the week of 7–11 Sep 2026 (WEEK) on 10-point rows,
 * composited with addProfiles/levels from src/engine/trading/profile.ts;
 * MCX crude figures as computed for lesson 16's visualiser. Platform claims
 * follow docs/trading/sources.md §D and the Emberwick README.
 */
export const vpWindows: Topic = {
  id: "vp-windows",
  title: "Profile windows and composites",
  tier: 1,
  depth: "deep",
  summary:
    "Session, visible range, fixed range, weekly and monthly composites, anchored profiles: the same sum over different bars, and how to choose the window.",
  why: "A POC is only 'the POC' of some set of bars. Change the set — one session, a week, whatever happens to be on screen — and the levels change, sometimes by a lot. A rule that does not fix its window by a written rule cannot be backtested, and a window that does not match how long you hold a position answers a question you are not asking.",
  viz: ["vp-composite"],
  learn: {
    intuition:
      "Every profile in this course is built the same way: take some bars, spread each bar's volume over the price rows it covers, and add it up. The only thing that changes between a 'session profile', a 'weekly composite', a 'visible-range profile' and an 'anchored profile' is WHICH bars go in. So the real choice is the window. A short window, such as yesterday's session, describes what the market accepted recently, and it changes every day. A long window, such as a month, describes what it accepted over a longer stretch, and it changes slowly. Neither is more correct. They answer different questions: 'what was fair yesterday?' and 'what has been fair this month?' A trader who holds for an hour and a trader who holds for two weeks should not be looking at the same window. And a window you choose by scrolling the chart until it looks right is not a window at all, because next time you will scroll differently.",
    mechanics: [
      {
        heading: "One sum, different bars",
        body: "A profile is the sum of bar volumes per row, over a set of bars. Session: one trading session's bars. Composite: several sessions, for example a week or a month. Fixed range: bars between a start and an end you specify. Anchored: from an event you choose up to now. Visible range: whatever is on screen. On the same grid, a composite is literally the bin-by-bin sum of its sessions' profiles — `addProfiles` in this course's engine — and its POC and value area come from the same rules as any single day's.",
      },
      {
        heading: "Session profiles depend on platform settings",
        body: "Even 'one session' has settings that move the levels. TradingView's Session Volume Profile builds each session from a lower-timeframe series chosen by the chart's resolution: one-minute bars on a 1- to 15-minute chart, five-minute bars on a 16- to 30-minute chart, ten-minute bars on a 31- to 60-minute chart, and so on. So the same session can produce a different profile on a 5-minute chart than on a 60-minute chart. Its documentation also says profiles reset at the start of each year, total rows across profiles are capped below 6,000, and the session setting defaults to 'All', which merges pre-market, main and post-market trading. Sierra Chart's documentation lists session times that do not match exactly as one reason two users see different values.",
      },
      {
        heading: "Composites need one grid and one instrument",
        body: "Adding Monday's rows to Friday's only works if row 22,400–22,410 means the same price range on both days. That is why this course puts every bin on an ABSOLUTE grid (bin k covers k·step to (k+1)·step). Had each day's rows started at that day's own low — 22,258.15 on 7 Sep, 22,312.10 on 8 Sep (synthetic) — no two days' rows would line up. The instrument must be consistent too. A NIFTY futures composite that spans a monthly expiry adds two different contracts, whose prices differ by the gap between them; lesson 16 covers how rolls break composites. In the synthetic week on 10-point rows, the five daily POCs are 22,285, 22,355, 22,435, 22,435 and 22,355. The three-day composite's POC is 22,405 — a price that was no single day's POC. The five-day composite ends with POC 22,435 and value 22,330–22,460.",
      },
      {
        heading: "Visible range: convenient on screen, unusable in a backtest",
        body: "A visible-range profile sums whatever is on screen, so it changes as you scroll and zoom. Emberwick, the chart library this site uses, documents that its visible profile sums WHOLE sessions: a session half on screen contributes all of its volume, and the profile is re-summed only when the set of sessions on screen changes. TradingView's Visible Range Volume Profile uses the same row settings as its session profile. Either way, the levels depend on how you were looking at the chart, which no backtest can reproduce. If you want a multi-day window in a rule, fix it by rule: 'the last five completed sessions', 'since the start of the expiry week'.",
      },
      {
        heading: "Anchored profiles, and matching the window to the holding period",
        body: "An anchored profile starts at an event — a budget day, an RBI policy announcement, a monthly expiry, a big gap — and runs to now. Brian Shannon, writing about anchored VWAP, calls the choice of anchor the most subjective part; the same is true here, so the anchor must be fixed by a rule written in advance. This course's view, not a tested result: match the window to how long the decision lasts. A trade held for part of one NSE session is about what was fair yesterday and today, so session levels fit. A position held for a week is about what has been fair over the past weeks, so a composite fits better. Using a monthly composite for a 20-minute trade, or yesterday's session for a two-week position, mixes two different questions.",
      },
    ],
    complexityDerivation:
      "There is almost no evidence about windows, because the window is a choice rather than a claim. What we can verify is how tools build them. TradingView's help pages describe its session profile picking a lower timeframe by chart resolution, resetting profiles at the start of each year, and defaulting to all sessions; its visible-range profile uses the same row settings. Emberwick's documentation states that its visible profile sums whole sessions. Sierra Chart's documentation lists mismatched session times among the reasons users see different values. The idea of combining windows is as old as the profile: the CBOT's Liquidity Data Bank reports were available for the day, evening or GLOBEX session, or for all of them combined (verified in the CBOT study guide). What is untested: we found no published study comparing session, composite or anchored levels as references — whether a weekly composite POC behaves differently from yesterday's POC, for instance. 'Match the window to the holding period' is this course's opinion, based on what each window summarises. It is not a measured result, and it should be tested like any other rule.",
    variants: [
      {
        name: "Session profile",
        when: "Intraday decisions; yesterday's levels as today's references; your builder's previous-session POC, VAH and VAL.",
        delta:
          "One session's bars. Changes every day. Depends on the session hours used (NSE derivatives now close at 15:40 per NSE's timings page; this course's synthetic sessions use 09:15–15:30) and, on some platforms, on the chart's timeframe.",
      },
      {
        name: "Weekly or monthly composite",
        when: "Positions held for days or weeks; looking for where value has settled over a longer stretch.",
        delta:
          "The bin-by-bin sum of several sessions on the same grid and the same contract. Changes slowly. Its POC can sit where no single day's POC was.",
      },
      {
        name: "Fixed-range or anchored profile",
        when: "A window tied to an event: since the last expiry, since budget day, since a gap.",
        delta:
          "Reproducible only if the start is fixed by a written rule. 'Since the swing low I see' is a choice made by eye, which a backtest cannot repeat.",
      },
      {
        name: "Visible-range profile",
        when: "Looking at a chart; getting a feel for where volume sits across what you are viewing.",
        delta:
          "Changes as you scroll and zoom, and in Emberwick includes the whole of any partly visible session. Fine for looking, not for a rule input.",
      },
    ],
    tradeoffs: [
      {
        vs: "A visible-range profile read off the chart",
        pick: "A window fixed by rule (for example 'the last five completed sessions') for anything you will backtest",
        because:
          "A visible-range level depends on where you scrolled, so the same day gives different levels on different viewings and the backtest cannot reproduce what you saw. A rule-fixed window gives the same levels every time and can be computed in code from bars alone.",
      },
      {
        vs: "A longer composite",
        pick: "The window that matches how long the trade is held — this course's view",
        because:
          "A longer window is smoother and slower: a month-long composite's POC barely moves day to day, which is the point for a two-week position and useless for a one-hour one. A shorter window reacts faster and is noisier. Choosing by holding period ties the window to the question the trade is asking. Test it; do not assume it.",
      },
      {
        vs: "One profile for the whole MCX day",
        pick: "Separate sub-session profiles when the trading hours cover very different conditions",
        because:
          "An MCX crude day runs from 09:00 to 23:30 (23:55 in US daylight saving), covering Indian, European and US hours. In this course's synthetic crude session, the whole-day POC is 5,773, the 09:00–17:00 POC is 5,833 and the 17:00–23:30 POC is 5,773: the whole-day POC is the evening's, and the day-time level vanishes from the whole-session picture. Whether to split is a judgement; lesson 16 shows the data.",
      },
    ],
  },
  realWorld: [
    {
      system: "TradingView Session Volume Profile",
      kind: "industry",
      problem:
        "Users expect a session's profile to be the same on any chart of that symbol.",
      applied:
        "The profile is built from a lower timeframe chosen by chart resolution — one-minute bars up to 15-minute charts, five-minute for 16–30, ten-minute for 31–60, larger beyond. Profiles reset at the start of each year, total rows are capped below 6,000, and sessions default to 'All'.",
      evidence: "TradingView help: Session Volume Profile",
      impact: "The same session can show different levels on a 5-minute and a 60-minute chart",
    },
    {
      system: "Emberwick's visible profile",
      kind: "industry",
      problem:
        "A visible-range profile has to decide what to do with a session that is only partly on screen.",
      applied:
        "It sums whole sessions: a session half on screen contributes all of its volume, because each session carries one total per row, not one per bar. It is re-summed only when the set of sessions on screen changes; zooming or panning within the same sessions only redraws it.",
      evidence: "Emberwick README, profiles section",
      impact: "What 'visible' means is a design decision of the tool — another reason not to use it as a rule input",
    },
    {
      system: "Sierra Chart on why values differ",
      kind: "industry",
      problem:
        "Two users computing the same market's profile report different POCs and value areas.",
      applied:
        "Sierra's documentation lists the causes: profile period settings, the value-area percentage, session times that must match exactly, bar timeframe, non-time bars, and for volume-by-price, the need for tick-by-tick data.",
      evidence: "Sierra Chart documentation, TPO charts and Volume by Price",
      impact: "The window and its session times belong in the written definition of any level",
    },
    {
      system: "Your strategy builder: previous-session levels as a one-session window",
      kind: "yours",
      problem:
        "Your builder's previous-session POC, VAH and VAL are a session window. What that window holds depends on choices you may not see in the interface.",
      applied:
        "Two things decide it: the session boundaries your data uses — NSE's 15:30 versus 15:40 close for derivatives, MCX's 23:30 or 23:55 — and which contract supplies the volume, which for NIFTY changes at each monthly expiry. If you ever add weekly or monthly composite levels as inputs, they need the same absolute grid every day, one consistent contract (or an explicit roll adjustment, lesson 16), and a window fixed by rule, such as the last five completed sessions.",
      evidence: "src/engine/trading/profile.ts (buildProfile on the absolute grid, addProfiles)",
      impact: "Writing down the window turns 'yesterday's POC' into a level a backtest can reproduce",
    },
  ],
  insights: [
    {
      t: "Every window is the same sum over different bars",
      d: "Session, composite, fixed range, anchored and visible range differ only in which bars go in. On the same absolute grid, a composite is the bin-by-bin sum of its sessions.",
    },
    {
      t: "Match the window to the holding period",
      d: "This course's view, not a tested result: intraday decisions use session levels; multi-day positions use a composite. A window that does not match the trade answers a different question.",
    },
    {
      t: "Visible-range levels are not reproducible",
      d: "They change as you scroll, and Emberwick's includes the whole of any partly visible session. Fix the window by rule before using it in a backtest.",
    },
    {
      t: "A composite's POC can be no day's POC",
      d: "In the synthetic week (10-point rows), the daily POCs were 22,285, 22,355 and 22,435, but the three-day composite's POC was 22,405, where the days' volumes overlapped.",
    },
  ],
  pitfalls: [
    "Backtesting with levels read off a visible-range profile. You cannot reproduce the scroll position, so the test is testing your eye on the day you looked.",
    "Building a composite across a futures roll. NIFTY's monthly contracts expire on the last Tuesday, and the next contract trades at a different price, so the composite adds two price scales together. Translate by the price gap between the contracts or restart the composite (lesson 16).",
    "Comparing session profiles from charts of different timeframes on TradingView. A 5-minute chart and a 60-minute chart build the same session from different lower-timeframe bars.",
    "Mixing session definitions. 'All' sessions versus main session only, NSE's 15:30 versus 15:40 derivatives close, MCX's 23:30 versus 23:55: each changes which bars are in the window.",
    "Treating a composite's POC as if some day traded heavily there. It is where the summed volume peaks, which can fall where several days overlapped rather than where any one of them was busiest.",
  ],
  quiz: [
    {
      q: "What is a composite profile?",
      options: [
        "A profile that combines volume and TPO counts",
        "The average of several days' POCs",
        "The profile of several sessions added together, row by row on the same price grid",
        "Today's profile with yesterday's levels drawn on it",
      ],
      answer: 2,
      difficulty: "recall",
      why: "A composite is the bin-by-bin sum of its sessions. Its POC and value area are then computed from the summed rows with the usual rules — not averaged from each day's levels.",
      distractors: [
        "Volume and TPO profiles measure different things (lesson 2). A composite adds the same kind of profile over several sessions.",
        "Averaging POCs throws away where the volume actually was. The composite POC can differ from the average, as the next question shows.",
        "",
        "That is today's chart with references on it (lesson 12), not a composite.",
      ],
    },
    {
      q: "On 10-point rows: Monday's profile starts at 22,280 with rows [4, 9, 11]; Tuesday's starts at 22,300 with rows [6, 10, 5]. What is the two-day composite's POC?",
      options: [
        "22,295 — adding the two lists position by position",
        "22,315 — Tuesday's POC",
        "22,310 — the average of the two days' POCs",
        "22,305 — the 22,300–22,310 row holds 11 + 6 = 17",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Line the rows up by price: 22,280: 4; 22,290: 9; 22,300: 11 + 6 = 17; 22,310: 10; 22,320: 5. The busiest row is 22,300–22,310, so the POC is its midpoint, 22,305. The absolute grid is what makes 'line up by price' possible.",
      distractors: [
        "Adding by position pairs Monday's 22,280 row with Tuesday's 22,300 row — different prices. It gives [10, 19, 16] and a wrong POC. This is the mistake the absolute grid prevents.",
        "A composite is not 'the more recent day'. Tuesday's busiest row has 10; the summed 22,300 row has 17.",
        "Averaging levels ignores where the volume is. Here it lands on 22,310, between two rows, where no row's midpoint sits.",
        "",
      ],
    },
    {
      q: "You hold MCX gold futures positions for three to five sessions. Which window for your reference POC and value area fits this course's guidance best?",
      options: [
        "A composite of a fixed number of recent completed sessions, on one contract, set by rule",
        "Yesterday's session only",
        "Whatever the visible-range profile shows when you open the chart",
        "The current session's developing profile",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A multi-day holding period asks what has been fair over several days, which a composite summarises. Fixing the number of sessions by rule makes it reproducible, and keeping to one contract (MCX gold contracts are reported to be bimonthly) keeps the prices on one scale.",
      distractors: [
        "",
        "One session answers 'what was fair yesterday', which suits an intraday decision better than a week-long one.",
        "It changes with how you scrolled, so you cannot test it or repeat it.",
        "The developing profile is honest for intraday rules, but it covers only today, which is far shorter than the position.",
      ],
    },
    {
      q: "A trader backtests 'buy at the visible-range POC' by scrolling through two years of charts and noting the POC each day. What is the main problem?",
      options: [
        "Two years is too short",
        "Visible-range POCs are always wrong",
        "The window depended on how each chart was scrolled and zoomed, so the levels cannot be reproduced, and choosing the view after seeing the day can leak the outcome into the level",
        "The POC should be replaced with VAH",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Nobody can rebuild those levels from the bars, so nobody can check the test or run it live in the same way. Worse, a chart viewed after the fact shows what happened next, which can influence where you scroll. Fix the window by rule — say, the last five completed sessions — and compute it in code.",
      distractors: [
        "Length is not the issue. Twenty years of irreproducible levels would still be irreproducible.",
        "They are computed correctly for what is on screen. The problem is that what is on screen is not a rule.",
        "",
        "Changing the level does not fix how the window was chosen.",
      ],
    },
    {
      q: "In Emberwick, the chart shows the last two sessions in full and the second half of the session before them. What volume does the visible profile include for that partly visible session?",
      options: [
        "Only the half that is on screen",
        "None of it, until the whole session is on screen",
        "Half of its volume, spread evenly",
        "All of it: the visible profile sums whole sessions",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Emberwick's documentation says a session half on screen contributes all of its volume, because each session supplies one total per row, not one per bar. It is a reasonable design choice, and another reason a visible-range level depends on how the tool defines 'visible'.",
      distractors: [
        "That would need volume per bar per row. Emberwick's profile data carries one total per row per session.",
        "Partly visible sessions are included, not skipped.",
        "There is no proportional split; the session counts in full.",
        "",
      ],
    },
    {
      q: "On TradingView, you look at the same NIFTY futures session on a 5-minute chart and on a 60-minute chart, and the Session Volume Profile's VAL differs slightly. Why?",
      options: [
        "The profile is built from one-minute bars on the 5-minute chart and from ten-minute bars on the 60-minute chart, and coarser bars place volume on the rows less precisely",
        "A data error on one of the charts",
        "The 60-minute chart uses TPO counts instead of volume",
        "Value areas are random within a few points",
      ],
      answer: 0,
      difficulty: "apply",
      why: "TradingView documents that the lower timeframe depends on chart resolution. It does not document how it spreads a bar's volume over the rows, but whatever it does, one ten-minute bar says less about where within its range the volume traded than ten one-minute bars do, so rows near the edge of value can tip either way.",
      distractors: [
        "",
        "Nothing is wrong with the data; the two charts build the session from different bars, as the documentation says.",
        "Both are volume profiles. TradingView's TPO indicator is a separate tool.",
        "The computation is deterministic. Different inputs give different outputs; the same inputs give the same ones.",
      ],
    },
    {
      q: "You build a 20-session NIFTY futures composite on a continuous series that is not back-adjusted, and the window spans a monthly expiry. What goes wrong?",
      options: [
        "Nothing; a continuous series is one instrument",
        "Two contracts' prices are added on one grid, and they differ by the price gap between the contracts at the roll, so the composite's rows mix two price scales",
        "The composite becomes a TPO profile",
        "Only the POC is affected; VAH and VAL stay correct",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Without adjustment, prices step at the roll by the gap between the expiring and next contracts. Volume from before the roll sits at prices that, in the new contract, mean something different. Translate the old contract's rows by the gap, or start the composite after the roll. Lesson 16 covers both, and the cost of back-adjusting (historical levels no longer match prices that actually traded).",
      distractors: [
        "The series is stitched from separate contracts. Stitching does not make their prices comparable.",
        "",
        "The kind of profile does not change; its rows just mean two different things.",
        "Every level is computed from the same mixed rows, so all of them are affected.",
      ],
    },
    {
      q: "In the synthetic week (10-point rows), the daily POCs for the first three days were 22,285, 22,355 and 22,435. The three-day composite's POC was 22,405. What does that show?",
      options: [
        "The composite was computed wrongly; it must equal one of the daily POCs",
        "The composite POC is the average of the daily POCs",
        "The third day was the most important",
        "A composite's POC is where the SUMMED volume peaks, which can be a price where several days traded a fair amount rather than where any one day was busiest",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Rows add across days. The 22,400–22,410 row was only the third-busiest row on both 8 and 9 Sep, but added together it beats every single day's busiest row. Read a composite's POC as 'where value overlapped across the window', not as some day's level.",
      distractors: [
        "Nothing forces a composite's busiest row to be any single day's busiest row. The sum can peak elsewhere.",
        "The average of 22,285, 22,355 and 22,435 is 22,358.33, not 22,405. Averaging levels is not how composites work.",
        "The composite POC is not the third day's (22,435). The 22,400–22,410 row collected volume from both the second and third days.",
        "",
      ],
    },
  ],
};

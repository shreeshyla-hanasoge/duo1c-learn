import type { Topic } from "../../types.ts";
import { LAB_BUILD } from "../labs.ts";

export const vpBuilding: Topic = {
  id: "vp-building",
  title: "Building a profile from data",
  tier: 1,
  depth: "deep",
  summary:
    "Fix an absolute price grid, spread each one-minute bar's volume over the rows it covers, and choose the row size once.",
  why: "Every POC, VAH and VAL your strategy builder uses is downstream of three construction choices: the price grid, how a bar's volume is spread inside its range, and the row size. Change any of them and the levels move, sometimes by hundreds of points. If you cannot say exactly how a profile was built, you cannot reproduce a backtest or explain why your levels differ from a chart.",
  viz: ["vp-build", "vp-bin-size"],
  learn: {
    intuition:
      "A one-minute bar tells you four prices and a total: it opened here, went this high and this low, closed there, and so many contracts traded. It does not tell you how many traded at each price inside that range. Building a volume profile from bars is therefore an act of estimation. The usual estimate is the simplest one: assume the contracts were spread evenly over the bar's range, and give each price row a share in proportion to how much of the range it covers. Add that up over every bar of the session and you have the profile. Two more decisions finish the job. The rows must sit on a fixed grid of prices, so that 22,445–22,450 means the same row every day. And the rows must have a size — fine enough to show the shape, coarse enough not to invent detail the bars never had.",
    mechanics: [
      {
        heading: "Fix an absolute grid before anything else",
        body: "Row k covers `[k·step, (k+1)·step)`. With 5-point rows, 22,445 sits at the bottom of its row and 22,450 starts the next one — on every day, for every session. The lowest edge is a multiple of the step, not the session's low. This is what makes days comparable, lets you add sessions into a composite, and makes 'yesterday's VAH' a price that means the same thing today. A grid that starts at each session's own low, or that divides each session's range into a fixed NUMBER of rows, shifts every day.",
      },
      {
        heading: "Spread each bar's volume over the rows its range covers",
        body: "For each row a bar touches, its share is `overlap / (high − low)`. The first bar of the synthetic 1 Oct session, 09:15, has low 22,287.25, high 22,294.05 (a range of 6.80 points) and 2,354 contracts. The row 22,285–22,290 covers 2.75 of those points and gets 2,354 × 2.75 / 6.80 ≈ 951.99; the row 22,290–22,295 covers 4.05 and gets ≈ 1,402.01. Two edge rules: a flat bar (high equals low) puts everything in the one row containing its price, and a high exactly on a row edge does not reach into the row above, because the overlap there is zero. Round once, at the end, not per bar.",
      },
      {
        heading: "The even split is an assumption — and platforms differ on it",
        body: "Nothing says the contracts were evenly spread; a bar might have traded mostly near its close. NinjaTrader's documentation says its default minute mode makes the same even-split assumption, and recommends tick data for intraday charts. TradingView's documentation says it builds profiles from lower-timeframe bars — which ones depends on the chart's timeframe — but does not say how it splits a bar's volume inside its range. Sierra Chart recommends tick-by-tick data, one tick per volume bar, for the most consistent results. Exact tick data removes the assumption; one-minute bars keep it, which is fine as long as you know.",
      },
      {
        heading: "Row size: too fine invents detail, too coarse hides shape",
        body: "The `vp-bin-size` visualiser builds the synthetic 1 Oct session six ways. At 1-point rows (296 rows) every wiggle is a spike, and the POC is just the tallest spike: 22,449.5. That detail is not real — on these synthetic bars the median one-minute range is 7.65 points, and the even split smears each bar over its whole range, so rows much finer than a bar cannot be told apart by the data. At 5 points (60 rows): POC 22,447.5, VAH 22,470, VAL 22,215, two humps and a clear waist. At 25 points (12 rows) the waist is gone and the value area swallows every row. At 50 points (7 rows) the grid edge at 22,450 cuts the upper hump in two, and the POC jumps to the lower hump, 22,225.",
      },
      {
        heading: "Five points for NIFTY is a choice, not a law",
        body: "This course and your worked example use 5-point rows for the NIFTY near-month future. That is a reasonable setting — a typical one-minute bar on the synthetic data spans two or three rows — but it is a convention, chosen once, not derived from anything. Our opinion on how to choose: start near a typical one-minute bar's range for the instrument, look at a handful of days at that size and the neighbouring sizes, then FIX it and never change it to improve a backtest. The number is per instrument: 5 points means nothing for MCX crude oil, which is quoted in rupees per barrel.",
      },
    ],
    complexityDerivation:
      "Where it comes from: the original CBOT Liquidity Data Bank did not need any of this. Its reports listed volume for each price actually traded, from exchange records, so there was no bar to split and no row size beyond the tick (CBOT study guide, Part VI, which we read). Building profiles from bars is a modern approximation. What the platforms document: NinjaTrader 8 splits a one-minute bar's volume evenly across every price between its high and low in its default mode; TradingView builds from lower-timeframe bars chosen by the chart's timeframe, from 1-minute bars on a 5-minute chart to 10-minute bars on a 60-minute chart, and does not document its split inside a bar; Sierra Chart lists bar timeframe, session times and tick settings among the reasons two users' values differ. All of this we read in each platform's own documentation. Evidence for and against particular choices: we found no study of the best row size or the best way to split a bar's volume. Everything here is convention. Untested: how much a strategy's results change between 5-point and 10-point rows, or between bar-built and tick-built profiles, on your own NIFTY history. That is cheap to measure and worth doing once. Cost of building: one pass over the bars, touching a few rows each — `O(bars × rows per bar)`.",
    variants: [
      {
        name: "Tick data (exact volume at each traded price)",
        when: "You have trade-by-trade history and levels sit within a few points of your decision thresholds.",
        delta:
          "No splitting assumption. Heavier data, and the profile is only as clean as the feed's trade records.",
      },
      {
        name: "One-minute bars, even split over the range",
        when: "Multi-year backtests on NIFTY futures or MCX, where one-minute history is what you have.",
        delta:
          "This course's method and NinjaTrader's documented minute mode. Fine at rows comparable to a bar's range; misleading at rows much finer.",
      },
      {
        name: "Lower-timeframe bars chosen by the chart",
        when: "Reading TradingView's session volume profile.",
        delta:
          "Per TradingView's documentation, charts from 1 to 15 minutes use 1-minute bars, 16–30 minutes use 5-minute bars, 31–60 minutes use 10-minute bars, and so on up to 60-minute bars for charts of 241 minutes and above. Same session, different chart timeframe, possibly different profile.",
      },
      {
        name: "All of a bar's volume at one price",
        when: "Quick sketches, or when you deliberately want to weight by closes.",
        delta:
          "Putting each bar's volume at its close, or its typical price, is one line of code, but it piles volume on closing prices that the even split would spread out. A later lesson's `vp-volume-source` visualiser shows how far such choices move the levels.",
      },
    ],
    tradeoffs: [
      {
        vs: "Tick data",
        pick: "One-minute bars for long backtests; ticks when a few points decide the trade",
        because:
          "On the synthetic 1 Oct bars, going from 2.5-point to 10-point rows keeps VAH at 22,470, keeps the POC between 22,445 and 22,448.75, and moves VAL only between 22,215 and 22,222.5 — so at those sizes the bar-level guess matters little. But a rule that fires exactly on VAH can flip on a one-row difference, and only ticks remove the splitting guess.",
      },
      {
        vs: "A fixed number of rows per session",
        pick: "A fixed row size in points on an absolute grid",
        because:
          "TradingView documents that its 'Number of Rows' mode derives row size from each session's range, so row edges and size change daily. Fixed points per row keeps edges at multiples of the step, which composites and day-to-day comparisons need.",
      },
      {
        vs: "Finer rows for 'more precision'",
        pick: "Rows comparable to a typical bar's range",
        because:
          "Precision you cannot measure is noise. The bars only say the volume was somewhere within roughly 7–8 points; 1-point rows split that guess into seven equal pieces and then treat the tallest piece as the POC.",
      },
    ],
  },
  realWorld: [
    {
      system: "NinjaTrader 8 Order Flow+ Volume Profile",
      kind: "industry",
      problem:
        "Intraday traders want a volume profile without always having tick history loaded.",
      applied:
        "The default minute resolution splits each one-minute bar's volume evenly across every price between its high and low. A tick resolution uses the real volume traded at each price, and NinjaTrader recommends it for intraday charts. Buy/sell and delta displays need tick data.",
      evidence: "NinjaTrader 8 help guide: Order Flow Volume Profile",
      impact: "The same even-split assumption this course uses, documented as an approximation.",
    },
    {
      system: "TradingView Session Volume Profile",
      kind: "industry",
      problem:
        "A chart needs a profile for any symbol and any chart timeframe, built from the bar data the platform holds.",
      applied:
        "The profile is built from lower-timeframe bars picked by the chart's timeframe. Rows are set either as a number of rows (row size derived from the session's range) or as ticks per row. Sessions default to 'All', which merges pre-market, main and post-market trading, and total rows across profiles are capped under 6,000.",
      evidence: "TradingView support: Session Volume Profile; Volume Profile basic concepts",
      impact:
        "Switching from a 5-minute to a 60-minute chart can change the source data from 1-minute to 10-minute bars, and with it the levels.",
    },
    {
      system: "Sierra Chart Volume by Price",
      kind: "industry",
      problem: "Users comparing levels across machines and programs get different numbers.",
      applied:
        "Sierra's documentation lists why: profile period settings, the value-area percentage, session times (which must match exactly), bar timeframe, non-time bars, and for Volume by Price the need for tick-by-tick data with one tick per volume bar for maximum consistency.",
      evidence: "Sierra Chart documentation: Volume by Price; TPO Profile Charts",
      impact: "A ready-made checklist for 'why don't my levels match?'",
    },
    {
      system: "Your strategy builder's previous-session POC, VAH and VAL",
      kind: "yours",
      problem:
        "Your platform reports POC 22,447.5, VAH 22,470 and VAL 22,215 for 1 Oct on the NIFTY near-month future at 5-point rows. Those three numbers are only reproducible if the construction is pinned down.",
      applied:
        "Record four things next to every set of levels: row size (5 points), grid (absolute, edges at multiples of 5), how bar volume is spread (even split over high–low, flat bar to one row), and session hours. This course's builder, run on synthetic bars tuned to that day, reproduces the three numbers under exactly those rules.",
      evidence: "Worked example in docs/trading/writing-brief.md; src/engine/trading/profile.ts",
      impact:
        "When a level disagrees with a chart, you can check the four settings instead of guessing.",
    },
  ],
  insights: [
    {
      t: "Absolute grid: row k is [k·step, (k+1)·step)",
      d: "Edges at multiples of the step, every day. That is what makes yesterday's levels comparable with today's prices and lets sessions be added into composites.",
    },
    {
      t: "A bar's volume is spread by overlap",
      d: "Each row gets `volume × overlap / range`. A flat bar goes into one row; a high exactly on an edge adds nothing to the row above.",
    },
    {
      t: "The even split is a guess the data cannot check",
      d: "One-minute bars do not say where inside the range the contracts traded. Rows much finer than a bar's range divide that guess into pieces and call the tallest piece the POC.",
    },
    {
      t: "Pick the row size once, then never tune it",
      d: "On the synthetic 1 Oct session the POC is 22,447.5 at 5-point rows and 22,225 at 50-point rows. A parameter that moves the answer that much must be fixed before you look at results.",
    },
  ],
  pitfalls: [
    "Anchoring rows to each session's low instead of an absolute grid. Every day's rows then have different edges, and composites quietly mix them.",
    "Using a 'number of rows' setting and assuming the row size is constant. It is derived from each session's range.",
    "Choosing the row size by trying several and keeping whichever backtests best. That is fitting the parameter to the sample.",
    "Rounding each bar's contribution before adding. Tiny errors pile up over 375 bars; round once at the end.",
    "Comparing your levels with a chart without matching session hours. A profile that includes the pre-open, or ends at 15:30 instead of 15:40, is a different profile.",
  ],
  quiz: [
    {
      q: "A one-minute bar has low 22,302, high 22,310 and 800 contracts. With 5-point rows on the absolute grid, how is its volume split?",
      options: [
        "400 to 22,300–22,305 and 400 to 22,305–22,310",
        "300 to 22,300–22,305, 400 to 22,305–22,310, 100 to 22,310–22,315",
        "800 to 22,305–22,310, the row with the close",
        "300 to 22,300–22,305 and 500 to 22,305–22,310",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The range is 8 points. The row 22,300–22,305 covers 3 of them (22,302 to 22,305), so it gets 800 × 3/8 = 300. The row 22,305–22,310 covers 5, so it gets 500. The high sits exactly on the 22,310 edge, so the overlap with 22,310–22,315 is zero.",
      distractors: [
        "Splitting equally per row ignores how much of the range each row actually covers.",
        "The high only touches 22,310; the row starting there has zero overlap and gets nothing.",
        "We do not know the close here, and the method spreads volume over the range rather than piling it at one price.",
        "",
      ],
    },
    {
      q: "A flat bar — high = low = 22,305.00 — has 120 contracts. With 5-point rows, where do they go?",
      options: [
        "All 120 to 22,305–22,310, the row that starts at that price",
        "All 120 to 22,300–22,305, the row that ends at that price",
        "60 to each of those two rows",
        "Nowhere — a bar with no range has no overlap",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Row k covers `[k·step, (k+1)·step)`: the bottom edge belongs to the row, the top edge does not. 22,305 is the bottom edge of 22,305–22,310. A flat bar puts everything in the row that contains its price.",
      distractors: [
        "",
        "The top edge is excluded from a row, so 22,305 does not belong to 22,300–22,305.",
        "Splitting a single price between two rows invents a range the bar did not have.",
        "Dropping volume would make the profile's total disagree with the session's real volume. Flat bars are a special case for exactly this reason.",
      ],
    },
    {
      q: "This is the synthetic 1 Oct session at 25-point rows (volume in hundreds). The course's rule puts EVERY row in the value area. Why?",
      figure: {
        lo: 22175,
        step: 25,
        bins: [761, 1620, 1016, 252, 285, 73, 86, 80, 96, 143, 2332, 1131],
        showValueArea: true,
        caption: "Synthetic 1 Oct, 25-point rows, hundreds of contracts",
      },
      options: [
        "A bug: a value area cannot be 100% of the profile",
        "The rows are so coarse that the last pair added was the bulk of the lower hump, taking the area from just under 70% to 100% in one step",
        "Because the session was balanced",
        "25-point rows always give a 100% value area",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Pairs are added whole. After crossing the waist the area holds just under 70%, so one more pair is needed — and at this row size that pair is 22,175–22,225, most of the lower hump. Coarse rows make levels move in large jumps; at 5-point rows the same day stops at VAL 22,215.",
      distractors: [
        "Nothing in the rule forbids it; it simply stops at the first step that reaches 70%, and that step happened to add the last rows.",
        "",
        "The session was the opposite of balanced: two humps and a waist.",
        "It depends on the session. At 25-point rows a single-hump day would stop well short of the whole profile.",
      ],
    },
    {
      q: "You build the same week of NIFTY profiles at 1, 2.5, 5, 10, 25 and 50-point rows, backtest your rules on each, and keep the row size with the best profit factor. What is wrong?",
      options: [
        "Nothing — choosing the best parameter is what backtests are for",
        "Only that a week is too short; with a year it would be fine",
        "Row size is now fitted to the sample, so the reported result overstates what the rule will do on new data",
        "Profit factor is the wrong metric; Sharpe ratio would fix it",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Trying six settings and reporting the best is a multiple-comparisons problem: some setting will look good by luck. Fix the row size first, for reasons that have nothing to do with results, then test.",
      distractors: [
        "Picking the best of several settings on the same data and reporting that number is exactly the selection bias backtests must avoid.",
        "More data helps, but picking the best of six on the same data still flatters the winner.",
        "",
        "The metric is not the issue; selecting the best of six on any metric has the same bias.",
      ],
    },
    {
      q: "On the synthetic 1 Oct session the POC is 22,447.5 at 5-point rows but 22,225 at 50-point rows. What causes the jump?",
      options: [
        "The 50-point grid edge at 22,450 cuts the upper hump into two rows, while most of the lower hump falls into one row, 22,200–22,250",
        "Coarse rows always favour the lower part of the profile",
        "The even split was applied differently at 50 points",
        "At 50 points the POC is the midpoint of the session's range",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The upper hump sits around 22,430–22,460. With 50-point rows it is shared between 22,400–22,450 and 22,450–22,500, so neither row alone beats 22,200–22,250, which holds most of the lower hump. The POC depends on where the grid edges fall.",
      distractors: [
        "",
        "There is no direction built in; on another day the split could favour the upper hump.",
        "The split rule is the same at every row size; only the rows it splits into change.",
        "The POC is always the row with the most volume, at every row size.",
      ],
    },
    {
      q: "On TradingView, the same NIFTY futures session shows a slightly different POC on a 5-minute chart and on a 60-minute chart. What is the documented reason?",
      options: [
        "A display rounding difference",
        "The session volume profile is built from different lower-timeframe bars: 1-minute bars on a 5-minute chart, 10-minute bars on a 60-minute chart",
        "The 60-minute chart uses a 68% value area",
        "TradingView uses tick data on one and not the other",
      ],
      answer: 1,
      difficulty: "judge",
      why: "TradingView's documentation gives a table of which lower timeframe each chart timeframe uses. Coarser source bars mean each bar's volume is spread over a wider range, which can move the busiest row.",
      distractors: [
        "Rounding cannot move the busiest row; different source bars can.",
        "",
        "TradingView's default value area is 70%; the 68% default is NinjaTrader's.",
        "Per its documentation, both build from lower-timeframe bars, just different ones.",
      ],
    },
    {
      q: "You build a weekly composite by adding five daily profiles, each set to '60 rows'. The composite's POC looks odd. Most likely cause?",
      options: [
        "Five days are too few for a composite",
        "Composites should use TPO counts, not volume",
        "The POC of a composite is undefined",
        "Each day's row size and edges were derived from its own range, so the rows being added do not line up",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A fixed row COUNT gives each day its own row size and edges. Adding row 10 of Monday to row 10 of Tuesday adds different prices. An absolute grid, with edges at multiples of a fixed step, is what makes rows addable.",
      distractors: [
        "A week is a perfectly normal composite; the problem is mechanical.",
        "Volume composites are standard; the issue is the grid, not the measure.",
        "A composite is just a profile; it has a POC like any other.",
        "",
      ],
    },
    {
      q: "What does NinjaTrader 8's documentation say its default minute-resolution volume profile does with a bar's volume?",
      options: [
        "Puts it all at the bar's close",
        "Splits it evenly across every price between the bar's high and low",
        "Uses the bid/ask classification of each trade",
        "It does not document this",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The even split across the bar's range is documented, and described as an approximation; NinjaTrader recommends tick resolution for intraday charts. It is the same assumption this course makes.",
      distractors: [
        "That would be a different, simpler assumption; it is not what NinjaTrader documents.",
        "",
        "Bid/ask classification needs tick data with bid and ask, which the minute mode does not have.",
        "This one IS documented. What NinjaTrader does not document is its value-area expansion rule.",
      ],
    },
  ],
  lab: LAB_BUILD,
};

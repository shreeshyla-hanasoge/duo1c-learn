import type { Topic } from "../../types.ts";
import { LAB_SESSION_RANGE } from "../labs.ts";

/*
 * Synthetic numbers: 1 Oct (NIFTY_OCT1) against 30 Sep (NIFTY_SEP30), 5-point
 * rows, computed with src/engine/trading/profile.ts (buildProfile, levels,
 * sessionRangeSoFar) on bars 0..t only. Platform claims follow
 * docs/trading/sources.md §D and the Emberwick README.
 */
export const vpDeveloping: Topic = {
  id: "vp-developing",
  title: "The developing profile",
  tier: 1,
  depth: "deep",
  summary:
    "Today's POC and value area as they form, why nobody knows them in advance, and the look-ahead trap of using the final levels in the middle of the day.",
  why: "Every intraday rule has to ask: what did I know at this bar? Today's final POC and value area exist only after the close, so a backtest that uses them at 11:00 is trading on information from the future, and its results cannot be repeated live. The developing profile — today's profile built only from the bars so far — is the honest version, and your session-range input is the simplest no-look-ahead state there is.",
  viz: ["vp-developing"],
  learn: {
    intuition:
      "Imagine taking a photo of today's profile every minute. Each photo shows only the trading so far: its tallest row is the busiest price so far, and its value area is 70% of the volume so far. That photo is the developing profile. It is not a forecast of the final profile. It is the past, summarised. On a balanced day the photos change slowly and the developing POC settles early. On a day that moves to a new area, the photos can change completely: a new hump grows, overtakes the old one, and the POC jumps from one to the other in a single minute. The final profile — the one you see drawn on yesterday's chart — is the last photo, and nobody had it until the session ended. A rule may use any photo up to the current minute, and never a later one. That is the whole of this lesson, and it is the most common way profile backtests go wrong.",
    mechanics: [
      {
        heading: "Build it from the bars so far, and only those",
        body: "At bar t, the developing profile is `buildProfile(bars[0..t])`, and its levels come from the same rules as any other profile: the same grid, the same POC tie-break, the same two-row value-area expansion. Nothing about the maths changes. The only rule is the input: bars 0 to t, never t+1. The final profile is simply the developing profile at the last bar of the session. Which bar is last depends on your session hours: this course's synthetic sessions run 09:15–15:30, while NSE's timings page now shows equity derivatives closing at 15:40 (reportedly from 3 August 2026, a news report). Check which your data uses.",
      },
      {
        heading: "Why the final levels cannot be known in advance",
        body: "Each new bar adds volume to some rows. If enough lands on a different row, it overtakes the POC, and the value area grows towards it. On 1 Oct (synthetic), the developing POC is 22,187.5 at 09:44, in the lower hump. It moves to 22,222.5 at 11:07 and settles at 22,217.5 from 11:28. Then at 14:47, with the upper hump now heavier, it jumps 230 points to 22,447.5; after a brief move to 22,442.5 it returns there at 15:03 and stays — the final POC. Price had first traded at 22,447.5 at 13:20; the POC moved there only after enough volume piled up. At 14:44 the developing value area was 22,175–22,430; the final one is 22,215–22,470.",
      },
      {
        heading: "The look-ahead trap",
        body: "The bug usually looks harmless: compute `levels(buildProfile(allBarsOfToday))` once, before the loop over today's bars, then test each bar against it. Every bar now 'knows' the final POC. On 1 Oct a rule checked at 11:00 would see a POC of 22,447.5, about 220 points above the 22,225.95 price, when the honest developing POC was 22,187.5, below price. A rule like 'buy below today's POC, target today's POC' then looks brilliant, because the target was chosen with knowledge of where the day's volume ended up. The same trap appears when a table of daily levels is joined to minute bars by date, and when a 30-minute bar's high is used at the START of its period.",
      },
      {
        heading: "Your session-range input: where today has been",
        body: "Session range compares today's high and low SO FAR with yesterday's final VAH and VAL. It is 'above' if the high so far is strictly above VAH and the low has not gone below VAL; 'below' for the mirror case; 'both' if both have happened; otherwise 'inside'. Touching an edge is not beyond it. Because a running high can only rise and a running low only fall, the label can only grow: inside, then above or below, then both — never back. On 1 Oct against 30 Sep's value (22,290–22,335), the first bar's low is 22,287.25, so the range is 'below' from 09:15; at 12:41 the high passes 22,335 and it becomes 'both' for the rest of the day.",
      },
      {
        heading: "'Inside day so far' is a statement about the past",
        body: "A session range of 'inside' at 10:30 means only that today has not yet traded beyond yesterday's value. It says nothing about the rest of the day, and it can change on the next tick. What you CAN rely on is the other direction: once the label has changed, it will not go back to 'inside' today. 1 Oct is never an inside day so far, not even for its first minute. A rule such as 'fade moves while the day is still inside' must re-check the label at every bar, because the condition can stop being true at any time.",
      },
    ],
    complexityDerivation:
      "The developing profile is a calculation, not a claim, so most of the evidence here is about tools and practice. NinjaTrader's volume-profile documentation lists developing POC and value-area lines among its options (verified from its help guide). Emberwick's documentation describes sending the forming session again every minute, marked as developing, and its replay mode hides each session's profile until the last revealed bar has passed that session's end, so a replay cannot show a finished profile early (verified from its README). In the 1980s the CBOT's Liquidity Data Bank published its volume-at-price data as a report on a completed session (verified from the CBOT study guide), so the final profile was, from the start, an after-the-close product. Claims ABOUT developing levels are another matter. Readings such as 'a developing POC moving up shows buyers in control' are interpretations, and we found no published test of them. The look-ahead problem, though, is not a matter of evidence. A backtest that uses a number before it existed tests a strategy nobody can trade. Its results can be as good as you like and still say nothing about live trading.",
    variants: [
      {
        name: "Developing levels at every bar",
        when: "A rule needs today's POC or value area during the session.",
        delta:
          "Add each new bar's volume to the bins, then recompute the POC and value area. Adding a bar touches only the few rows it covers; recomputing the value area is one pass over the rows. Exact, and the only intraday use of today's levels that cannot look ahead.",
      },
      {
        name: "Snapshots every 30 minutes",
        when: "You only need levels at fixed checkpoints, for example the ends of TPO periods.",
        delta:
          "What the visualiser shows. Cheaper, and easy to compare across days, but a rule that acts between snapshots must use the last snapshot, not the next one.",
      },
      {
        name: "Yesterday's final levels",
        when: "Rules about the open and the early session; your builder's previous-session POC, VAH and VAL.",
        delta:
          "Fixed and known from 09:15, so they cannot look ahead. The trade-off is that they describe yesterday, not today.",
      },
      {
        name: "Session range so far",
        when: "You want to know where today has been relative to yesterday's value.",
        delta:
          "A running high and a running low against yesterday's VAH and VAL. Constant work per bar, and the label can only grow — the simplest state a rule can carry without looking ahead.",
      },
    ],
    tradeoffs: [
      {
        vs: "Final levels in a backtest",
        pick: "Developing levels as of each bar, always",
        because:
          "Final levels make intraday backtests look better than anything you can trade live, because they contain the answer to the question the rule is asking. There is no situation where the final levels are a valid input before the close. If the developing levels make a rule stop working, it was never working.",
      },
      {
        vs: "Rebuilding the whole profile at every bar",
        pick: "Adding each bar to the running bins, then recomputing only the value area",
        because:
          "Rebuilding from scratch at every bar costs a number of steps that grows with the square of the day's length, which is slow over years of one-minute data. Adding one bar costs a few rows. Both give identical numbers on the same grid, so check the fast version against the slow one on a few days before trusting it.",
      },
      {
        vs: "Using developing levels early in the session",
        pick: "Yesterday's levels until a meaningful share of today has traded — this course's view, not a tested rule",
        because:
          "At 09:44 on 1 Oct the developing POC rested on 30 minutes of volume; it had already moved once and would move again. Early developing levels are honest, but they are built on little volume. If a rule uses them, test where in the session it starts trusting them, and fix that time before you look at results.",
      },
    ],
  },
  realWorld: [
    {
      system: "NinjaTrader 8 volume profile",
      kind: "industry",
      problem:
        "Intraday traders want to see where today's POC and value area currently stand, not only yesterday's.",
      applied:
        "Its Order Flow volume-profile documentation lists developing POC and value-area lines, alongside naked POC and value-area extensions and a configurable initial-balance option.",
      evidence: "ninjatrader.com, NT8 help guide, Order Flow Volume Profile",
      impact: "Developing levels are a standard platform feature; a backtest needs the same as-of-the-bar version",
    },
    {
      system: "Emberwick replay and live developing sessions",
      kind: "industry",
      problem:
        "A chart replaying history can show a whole day's profile before the day has been replayed — look-ahead built into the display.",
      applied:
        "With `hideFutureInReplay` on (the default), a session stays hidden until the last revealed bar has passed its end. On a live chart the forming session is sent again every minute, marked as developing, and the price-axis tags show the latest session's levels.",
      evidence: "Emberwick README, 'Live: the developing session' and 'Replay'",
      impact: "The display matches what a trader could have known at the replayed moment",
    },
    {
      system: "The CBOT Liquidity Data Bank",
      kind: "industry",
      problem:
        "In the 1980s, traders received volume-at-price data from the exchange rather than computing it themselves.",
      applied:
        "The LDB report listed, for each price traded that session, the volume, its share of the total, the share traded by different kinds of traders, and the half-hour periods in which the price traded. It described a completed session, for the day, evening or GLOBEX session or all combined.",
      evidence: "CBOT, A Six-Part Study Guide to Market Profile (1996), Part VI",
      impact: "The final profile began life as an after-the-close report — which is still the only time it exists",
    },
    {
      system: "Your strategy builder: the session-range input",
      kind: "yours",
      problem:
        "Session range has to say where today has traded relative to yesterday's value at each bar, using nothing from later bars.",
      applied:
        "It needs only yesterday's final VAH and VAL and a running high and low, so it cannot look ahead if it is computed bar by bar. The lab below asks for exactly that, and one hidden test catches a solution that uses the whole day's high from bar 0. On 1 Oct (synthetic) the input reads 'below' from 09:15 and 'both' from 12:41. If a rule in your builder ever compares with TODAY's POC or value area, it needs the developing version as of the bar, as above.",
      evidence: "src/engine/trading/profile.ts (sessionRangeSoFar); the lab on this page",
      impact: "A label that only grows, computed in constant time per bar, with no look-ahead",
    },
  ],
  insights: [
    {
      t: "Final levels exist only after the last bar",
      d: "Today's POC and value area at 11:00 are the developing ones. A backtest that uses the final levels intraday is testing a strategy nobody could trade.",
    },
    {
      t: "On a two-hump day the developing POC jumps",
      d: "On 1 Oct (synthetic) it sat in the lower hump, at 22,217.5, from 11:28 to 14:46, then jumped 230 points to 22,447.5 at 14:47. At 11:00 nobody could have known 22,447.5.",
    },
    {
      t: "Session range only grows",
      d: "Inside, then above or below, then both — never back. A running high and low against yesterday's VAH and VAL, strictly beyond, is all it needs.",
    },
    {
      t: "'Inside so far' is the past, not a forecast",
      d: "An inside label at 10:30 can change on the next bar. Only its change is permanent.",
    },
  ],
  pitfalls: [
    "Computing today's levels once from all of today's bars, then looping over today's bars. Every bar then sees the final POC. Build the profile inside the loop, from bars 0 to t.",
    "Joining a table of daily POC/VAH/VAL to minute bars by date. That gives every bar its own day's FINAL levels. To use yesterday's levels, join on the previous trading session, not the same date.",
    "Using a 30-minute bar's high or low at the start of its period. The high of the 10:15–10:44 bar is known only at 10:45. Decide at a bar's close, using bars that have closed.",
    "Trusting the developing POC in the first half hour. It rests on very little volume and often moves; on 1 Oct it jumped 100 points at 09:43, before the first period had even ended.",
    "Letting the session end drift. If some days in your data close at 15:30 and others at 15:40, 'the final profile' covers different hours on different days. Fix the session in code.",
  ],
  quiz: [
    {
      q: "What is the developing POC at 10:30?",
      options: [
        "Today's final POC, as estimated from the first hour",
        "The busiest price in today's trading from the open up to 10:30",
        "Yesterday's POC, until today's is known",
        "The midpoint of today's range so far",
      ],
      answer: 1,
      difficulty: "recall",
      why: "It is the POC of the profile built from the bars so far — the past, summarised. It is not an estimate of anything later.",
      distractors: [
        "Nothing in the developing profile predicts the close. It can, and on 1 Oct does, end up far from the final POC.",
        "",
        "Yesterday's POC is a separate reference line. The developing POC is today's, from today's bars.",
        "The midpoint of the range ignores volume. The POC is the row with the most volume, wherever that is.",
      ],
    },
    {
      q: "A backtest claims: 'Rule: at 11:00, if NIFTY futures are below today's POC, buy and target today's POC. Over two years, 81% of trades hit the target.' The code computes today's POC once from all of the day's bars, before the loop. What is wrong?",
      options: [
        "Nothing; two years is a large enough sample",
        "The target should be yesterday's POC",
        "It uses today's FINAL POC at 11:00 — a number that did not exist until late in the day — so it is testing the future, not the rule",
        "81% is too low to be worth trading",
      ],
      answer: 2,
      difficulty: "judge",
      why: "The final POC is where the day's volume ended up, so 'price will reach it' is close to true by construction. On 1 Oct (synthetic) the code would see 22,447.5 at 11:00, 220 points above price, while the honest developing POC was 22,187.5, below price. Redo it with the developing POC as of 11:00.",
      distractors: [
        "Sample size cannot repair a rule that uses information it did not have. Two years of look-ahead is still look-ahead.",
        "Yesterday's POC would be an honest input, but that is a different rule. The problem here is when the number is known, not which day it comes from.",
        "",
        "With look-ahead, the 81% means nothing — high or low. It is not a measure of the rule at all.",
      ],
    },
    {
      q: "11:30, synthetic day. This is the developing profile so far; price is now trading at about 22,242. What can you say about today's final POC?",
      figure: {
        lo: 22180,
        step: 5,
        bins: [6, 14, 22, 30, 27, 16, 8, 4, 3, 5, 10, 18, 26, 24, 12, 5],
        lines: [
          { price: 22197.5, label: "developing POC 22,197.5" },
          { price: 22242, label: "price now" },
        ],
        caption: "Synthetic. Developing profile at 11:30, 5-point rows.",
      },
      options: [
        "It will be 22,197.5, because the developing POC has been there all morning",
        "It will be in the upper hump, because that is where price is now",
        "It must be between the two humps",
        "Nothing certain: the upper hump's busiest row (26) is close to the POC row (30), so more trading up here could move the POC about 45 points",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The developing POC is the busiest row so far. The upper hump's 22,240–22,245 row is only 4 units behind. If the afternoon trades mostly up here, it overtakes, and the POC jumps from 22,197.5 to 22,242.5 in one bar — as 1 Oct's did, by 230 points, at 14:47.",
      distractors: [
        "How long it has been there says nothing about the rest of the day. A two-hump day is exactly where the POC jumps.",
        "Price being here makes it more likely, not certain. Price could drop back to the lower hump and add volume there instead.",
        "The thin waist between the humps has the least volume. It is the least likely place for a POC.",
        "",
      ],
    },
    {
      q: "Yesterday: VAL 22,290, VAH 22,335. Today's first four bars (high / low): 22,330 / 22,300; 22,335 / 22,295; 22,342 / 22,310; 22,320 / 22,288. What is the session range after each bar?",
      options: [
        "inside, above, above, both",
        "inside, inside, above, both",
        "inside, inside, above, below",
        "inside, inside, above, inside",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Bar 2's high touches 22,335 exactly, which is not beyond, so the range is still inside. Bar 3's high of 22,342 is above. Bar 4's low of 22,288 is below VAL while the high so far is still above, so the range is both. It can only grow.",
      distractors: [
        "A high exactly at VAH is not beyond it. Session range uses a strict comparison.",
        "",
        "The running high is still 22,342, above VAH, so the range is both, not below. Session range remembers where today has been.",
        "Session range never goes back to inside. Bar 4 coming back inside value does not erase bar 3's high.",
      ],
    },
    {
      q: "Which sequence of session-range labels during one day is IMPOSSIBLE?",
      options: [
        "inside → below → both",
        "below → both",
        "inside → above → inside",
        "inside for the whole day",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The running high can only rise and the running low only fall, so once today has traded beyond yesterday's value, it always will have. Going back to inside would need the high so far to come down, which cannot happen.",
      distractors: [
        "Possible: first a low below VAL, later a high above VAH.",
        "Possible, and it is 1 Oct (synthetic): below from 09:15, both from 12:41.",
        "",
        "Possible: a day that never trades beyond yesterday's value is an inside day.",
      ],
    },
    {
      q: "At 10:00 the session range is 'inside'. A colleague says: 'So today is an inside day — let's sell every move to yesterday's VAH.' What is the accurate reading?",
      options: [
        "It says only that today has not yet traded beyond yesterday's value; it can change on the next bar, so a rule built on it must re-check it every bar",
        "Correct: a day that is inside at 10:00 usually stays inside",
        "It means today's value area will be inside yesterday's",
        "It means the developing POC equals yesterday's POC",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Session range describes the past. Whether early inside days stay inside is an empirical question this course has not seen tested, and the label can flip at any moment. Only the change is permanent.",
      distractors: [
        "",
        "That is a forecast the label does not make, and we know of no test of how often it holds.",
        "Session range is about today's high and low against yesterday's value. Today's value area is a different thing, and it is only final after the close.",
        "The two are unrelated. Today can stay inside yesterday's value with its volume piled up anywhere inside it.",
      ],
    },
    {
      q: "A rule is checked on 30-minute bars: 'At 10:15, if the 10:15–10:44 bar's high is above yesterday's VAH, buy at 10:15.' What is wrong?",
      options: [
        "Nothing; 30-minute bars are standard for profile work",
        "The rule should use the bar's close instead of its high",
        "Yesterday's VAH should be today's developing VAH",
        "The bar's high is known only at 10:45, so deciding at 10:15 uses half an hour of the future",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A bar's high, low and close are all known only when the bar ends. This is the same look-ahead as using final levels, at a smaller scale: the decision has to be at 10:45 using the finished bar, or at 10:15 using bars that ended by 10:15.",
      distractors: [
        "Bar length is not the problem; the time the decision is made is.",
        "The close has the same problem — it is known only at 10:45.",
        "Yesterday's VAH is a perfectly honest input. The problem is the bar being used.",
        "",
      ],
    },
    {
      q: "You have a table with one row per day — date, POC, VAH, VAL — and a table of one-minute bars. You want each bar compared with YESTERDAY's levels. How should you join them?",
      options: [
        "On the bar's date",
        "On the previous trading session's date, so each bar gets the levels of the session before its own",
        "On the bar's date, but only for bars after 12:00",
        "On the nearest date, either side",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Joining on the same date gives every bar its own day's FINAL levels — look-ahead hidden in a join. Joining on the previous trading session gives yesterday's levels, which were known before today began. Use trading sessions, not calendar days, so Mondays and post-holiday days get the right session.",
      distractors: [
        "This is the common bug: every 09:15 bar would be compared with levels computed at today's close.",
        "",
        "Bars after midday still do not know today's final levels. The time of day does not fix it.",
        "'Nearest' can pick today's own row, or tomorrow's. Both are the future.",
      ],
    },
  ],
  lab: LAB_SESSION_RANGE,
};

import type { Topic } from "../../types.ts";
import { LAB_POC } from "../labs.ts";

export const vpPoc: Topic = {
  id: "vp-poc",
  title: "The point of control",
  tier: 1,
  depth: "deep",
  summary:
    "The POC is the busiest row. Its price is the row's midpoint, ties need a rule, and on a two-hump day it can jump hundreds of points.",
  why: "Your strategy builder uses the previous session's POC as an input, so you need to know exactly what that one number is and how fragile it can be. It is a maximum — the tallest row — and the tallest of two nearly equal rows can flip on a single minute of trade. On the synthetic 1 Oct session that flip moves the POC 230 points.",
  viz: ["vp-poc"],
  learn: {
    intuition:
      "The point of control is the answer to one question: at which price did the most business happen? Look along the profile, find the longest row, and that is it. In statistics this is the mode of the distribution — the most common value — not the average. That has two consequences worth holding on to. First, the mode of a single fat hump is stable: small changes in the data leave the same row on top. Second, when a profile has two humps of similar size, the mode is unstable: a little extra volume in either hump decides which one 'wins', and the POC lurches from one side of the profile to the other. The POC is a useful summary of a balanced day and a misleading one of a two-hump day, and it gives no warning which kind of day you are looking at.",
    mechanics: [
      {
        heading: "Definition: the row with the most volume, priced at its midpoint",
        body: "Scan the rows, keep the largest. On the synthetic 1 Oct session at 5-point rows, the row 22,445–22,450 holds 83,596 contracts — about 10.6% of the day's 7,87,468 — more than any other. The POC PRICE is that row's midpoint, 22,447.5, which is the number your platform reports for that day. Zero and negative rows never count, and a profile with no volume has no POC. A platform that labels a row by its lower edge would show the same row as 22,445; check which convention any data you compare against uses.",
      },
      {
        heading: "Ties: nearest the middle of the profile, then the lower row",
        body: "If two rows share the largest volume, take the one nearer the middle of the profile, measured by row index: the middle is `(n − 1) / 2`. If both are equally near, take the lower one. The visualiser walks three cases on rows from 22,400: a clear winner (POC 22,417.5); a tie where one candidate is nearer the middle (POC 22,427.5); and a tie with both equally near, which goes to the lower row (POC 22,412.5). Sierra Chart's documentation describes the same rule for its POC. TradingView's documented tie rule — closer to the POC, then the row above — is for growing the value area, not for choosing the POC; we did not find its POC tie rule documented.",
      },
      {
        heading: "What 'the middle' means — and when ties actually happen",
        body: "The middle is by row index over the WHOLE profile, empty rows included, so it is the middle of the session's price range, not the volume-weighted centre. On a developing profile the range grows during the day, so the middle moves with it. Exact ties are rare in a volume profile built from one-minute bars, because the even split produces fractional volumes. They are common in TPO profiles, where counts are small whole numbers, and in small or coarse profiles. A rule that is rarely needed still has to be written down, or two programs will disagree on exactly those days.",
      },
      {
        heading: "Why the POC can jump: two humps, one winner",
        body: "The developing POC of the synthetic 1 Oct session sits in the lower hump almost all day: 22,187.5 at 09:44, 22,222.5 from 11:07, 22,217.5 from 11:28. The upper hump grows through the afternoon, and at 14:47 it edges ahead. The POC jumps 230 points, from 22,217.5 to 22,447.5. It flips to 22,442.5 at 14:55 and back to 22,447.5 at 15:03. Nothing dramatic happened in the market at 14:47; one minute of volume tipped a near-tie. A maximum is a discontinuous summary — a small change in the data can move it a long way.",
      },
      {
        heading: "The POC depends on how the profile was built",
        body: "Same synthetic 1 Oct bars, different row sizes: the POC is 22,449.5 at 1 point, 22,448.75 at 2.5, 22,447.5 at 5, 22,445 at 10, 22,437.5 at 25 — and 22,225 at 50, where the grid cuts the upper hump in two. Counting time instead of volume moves it too: on the synthetic day in the previous lesson, the TPO POC is 22,385 and the volume POC 22,455. Session hours, the instrument (future, ETF) and how bar volume is spread all feed in. 'Yesterday's POC' is only one number once all of these are fixed.",
      },
    ],
    complexityDerivation:
      "Where it comes from: the CBOT study guide's value-area procedure starts from the highest-volume price of the day, and Dalton's Markets in Profile builds the TPO value area outwards from the price with the most TPOs (both read). The idea of a single busiest price is therefore as old as the method; the label 'point of control' is now standard on Sierra Chart, TradingView and NinjaTrader. What it literally claims: nothing, beyond 'most volume traded here'. Any meaning — fair price, magnet, support — is an interpretation. Evidence for and against: claims such as 'Dalton says price returns to the prior POC 80% of the time' or a '2,500-session study finding 65%' circulate on aggregator websites. We could not find a source for either, and they may be invented; do not rely on them. We found no peer-reviewed test of POC levels. The closest rigorous work, Osler (2000), found a small edge for published support and resistance levels in FX — price levels, not volume ones. Untested: whether NIFTY's previous-session POC, or a 'naked' one, is revisited more often than a random price at the same distance. That is a clean, testable question. Cost: one pass over the rows, `O(rows)`.",
    variants: [
      {
        name: "Volume POC",
        when: "The default in this course and in your strategy builder.",
        delta: "The row with the most contracts. Needs a traded instrument with volume.",
      },
      {
        name: "TPO POC",
        when: "Time-based Market Profile, or an instrument without volume such as NIFTY spot.",
        delta:
          "The row with the most 30-minute letters. Counts are small integers, so ties are frequent and the tie rule matters much more.",
      },
      {
        name: "Developing POC",
        when: "Intraday rules that need 'the POC so far' at each bar.",
        delta:
          "Recomputed on the bars up to now. It can move many times in a session and is not today's final POC until the close. Using the final one at 10:00 is look-ahead.",
      },
      {
        name: "Composite and naked POCs",
        when: "Levels across several sessions, or a past POC that price has not traded back through.",
        delta:
          "A composite POC is the busiest row of several sessions added on the same grid. A naked POC is a past session's POC extended forward until touched. Both inherit every construction choice, plus the futures roll.",
      },
    ],
    tradeoffs: [
      {
        vs: "VWAP as a 'fair price'",
        pick: "The POC when you want the busiest price; VWAP when you want the volume-weighted average",
        because:
          "On a single-hump day the two are close. On a two-hump day the average can fall between the humps, in the thin waist where little traded — as it does on the synthetic 1 Oct session — while the POC sits on one hump. Neither is wrong; they summarise different things.",
      },
      {
        vs: "A zone around each high-volume hump",
        pick: "Zones when the top two humps are close in volume",
        because:
          "A single POC forces a choice between two near-equal humps, and the choice can flip on one bar. Reporting both humps' ranges is less tidy but does not lurch 230 points.",
      },
      {
        vs: "Today's developing POC in a backtest",
        pick: "The previous session's FINAL POC for today's rules",
        because:
          "Yesterday's final POC is fully known at today's open. Today's final POC is not known until the close, and today's developing POC is legitimate only if recomputed from the bars up to that moment.",
      },
    ],
  },
  realWorld: [
    {
      system: "Sierra Chart POC tie rule",
      kind: "industry",
      problem: "Two rows with equal volume; which is the POC?",
      applied:
        "Sierra Chart documents the rule: the level nearest the middle of the profile, and if two are equally near, the lower one — the same rule this course and your platform use.",
      evidence: "Sierra Chart documentation: TPO Profile Charts",
      impact:
        "On tie days Sierra and your platform should agree on the POC, provided the profiles themselves match.",
    },
    {
      system: "NinjaTrader 8 developing and naked POCs",
      kind: "industry",
      problem: "Traders want the POC as it develops, and past POCs extended forward.",
      applied:
        "NinjaTrader's Order Flow+ Volume Profile documents a developing POC and value area, and 'naked' POC and value-area extensions that run forward until price trades through them.",
      evidence: "NinjaTrader 8 help guide: Order Flow Volume Profile",
      impact:
        "Convenient to display; a backtest still has to make sure each developing value uses only bars up to that moment.",
    },
    {
      system: "TradingView's chart-dependent source bars",
      kind: "industry",
      problem:
        "The same session's POC can differ between chart timeframes on the same platform.",
      applied:
        "TradingView builds its session volume profile from lower-timeframe bars chosen by the chart's timeframe, so a 5-minute chart and a 60-minute chart can be using different data. Its documented tie rule concerns value-area expansion, not POC selection.",
      evidence: "TradingView support: Session Volume Profile; Volume Profile basic concepts",
      impact: "Comparing a POC across platforms or chart timeframes needs the source bars matched first.",
    },
    {
      system: "Your strategy builder's previous-session POC",
      kind: "yours",
      problem:
        "For 2 Oct, your platform's previous-session POC is 22,447.5. Had the synthetic 1 Oct session ended at 14:45, the same input would have read 22,217.5 — 230 points lower — because the two humps were nearly equal until 14:47.",
      applied:
        "An idea to test, not a known fix: alongside the POC, record the volume of the busiest row in the OTHER hump and its price. When the runner-up is close in volume and far in price, treat the POC as unreliable for that day, or use both humps as separate levels.",
      evidence: "Synthetic 1 Oct session, vp-poc visualiser",
      impact:
        "Separates days where the POC is a stable summary from days where it is a coin toss between two humps.",
    },
  ],
  insights: [
    {
      t: "The POC is a maximum, not an average",
      d: "It is the mode of the profile. Stable on a single hump, unstable when two humps are close — the tallest of two near-equal rows can flip on one bar.",
    },
    {
      t: "POC price = the row's midpoint",
      d: "Row 22,445–22,450 gives 22,447.5. A platform that reports the lower edge, or uses different rows, will print a different number for the same busiest price.",
    },
    {
      t: "Ties: nearest the middle by index, then lower",
      d: "Sierra Chart documents the same rule. TradingView's documented tie rule is about expanding the value area, a different decision.",
    },
    {
      t: "A 230-point jump with no news",
      d: "The synthetic 1 Oct developing POC moves from 22,217.5 to 22,447.5 at 14:47 because the upper hump edges ahead. The size of a POC move says nothing about the size of what happened in the market.",
    },
  ],
  pitfalls: [
    "Taking the first maximum found while scanning upwards. That silently makes every tie go to the lower row, which disagrees with the documented rule.",
    "Treating a big POC move as a big market event. On a two-hump day, one minute can move it hundreds of points.",
    "Quoting the row's lower edge as the POC and comparing it with a platform that quotes the midpoint — a constant 2.5-point mismatch at 5-point rows.",
    "Using today's final POC in an intraday backtest. At 10:00 it does not exist yet.",
    "Repeating 'price returns to the POC 80% of the time'. We could not find any source for it.",
  ],
  quiz: [
    {
      q: "Rows start at 22,400 and are 5 points tall (volume shown). Two rows tie for the most volume. What is the POC price under the course's rule?",
      figure: {
        lo: 22400,
        step: 5,
        bins: [2, 5, 9, 4, 3, 6, 9, 7, 2, 1],
        caption: "Ten rows, 22,400–22,450",
      },
      options: ["22,412.5", "22,432.5", "22,422.5", "22,410"],
      answer: 1,
      difficulty: "apply",
      why: "The 9s are at index 2 (22,410–22,415) and index 6 (22,430–22,435). With 10 rows the middle is index 4.5, so index 6 is 1.5 rows away and index 2 is 2.5. The nearer one wins: row 22,430–22,435, midpoint 22,432.5.",
      distractors: [
        "That is the first 9 found scanning upwards. The tie rule looks at distance from the middle, not order.",
        "",
        "That is the middle of the profile, which only decides between tied rows; it is not itself a POC.",
        "That is the lower edge of the other tied row — wrong row, and an edge instead of a midpoint.",
      ],
    },
    {
      q: "Eight rows from 22,400, 5 points each. The two middle rows tie. Which is the POC?",
      figure: {
        lo: 22400,
        step: 5,
        bins: [1, 3, 5, 8, 8, 5, 3, 2],
        caption: "Eight rows, 22,400–22,440",
      },
      options: [
        "22,422.5 — the upper of the two",
        "22,420 — the boundary between them",
        "22,417.5 — the lower of the two",
        "Both; the profile has two POCs",
      ],
      answer: 2,
      difficulty: "apply",
      why: "With 8 rows the middle is index 3.5. The tied rows are indices 3 and 4, each 0.5 away. Equally near, so the rule takes the lower: row 22,415–22,420, POC 22,417.5.",
      distractors: [
        "Equal distance goes to the LOWER row under this rule (and Sierra Chart's).",
        "A POC is a row's midpoint. Splitting the difference invents a price that is not any row's centre.",
        "",
        "A rule-based input needs one number. That is why a tie rule exists at all.",
      ],
    },
    {
      q: "Your profile's busiest row is 22,445–22,450. What POC price does the course (and your platform) report?",
      options: ["22,445", "22,450", "22,447.5", "The volume-weighted average price inside that row"],
      answer: 2,
      difficulty: "recall",
      why: "The POC price is the row's midpoint. For 1 Oct that is 22,447.5, the number your platform reports.",
      distractors: [
        "That is the lower edge. Some tools label rows that way, which is a source of 2.5-point mismatches.",
        "That is the upper edge, which belongs to the next row on the absolute grid.",
        "",
        "With volume spread evenly inside a bar there is no finer price information inside a row to average.",
      ],
    },
    {
      q: "On the synthetic 1 Oct session the developing POC jumps 230 points at 14:47, from 22,217.5 to 22,447.5. What happened?",
      options: [
        "A large order hit the market at 14:47",
        "The upper hump's busiest row overtook the lower hump's by a small margin; one minute of volume tipped a near-tie",
        "The value-area calculation reset",
        "The row size changed during the session",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The POC is a maximum. With two humps of similar height, the leader can change on a small increment, and when it changes it moves the full distance between the humps. The jump measures the gap between humps, not the size of any event.",
      distractors: [
        "Nothing like that is needed. The upper hump had been growing all afternoon; 14:47 is just when it nosed ahead.",
        "",
        "The POC is chosen independently of the value area; there is nothing to reset.",
        "Row size is fixed for the whole session on the absolute grid.",
      ],
    },
    {
      q: "A trading blog says: 'Dalton found that price returns to the previous POC 80% of the time.' What should you do with this?",
      options: [
        "Treat it as unsourced. We could not find it in Dalton or anywhere primary, and it may be invented",
        "Use it — Dalton is the standard authority",
        "Use it, but adjust to 70% to be conservative",
        "Assume it is true for ES and test whether it transfers to NIFTY",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Claims like this circulate on aggregator websites without a page, a sample or a method. An unsourced number is not a prior to adjust; it is not evidence at all. The question is still worth testing on your own NIFTY data — from scratch.",
      distractors: [
        "",
        "Dalton is a real authority on the method, which is exactly why a number attributed to him needs a page reference.",
        "Shading an unsourced number does not make it sourced.",
        "There is no evidence it is true for ES either. Start from your own test, not from this number.",
      ],
    },
    {
      q: "Your previous-session POC is an input to several rules. On some days the second-busiest hump is nearly as large as the first and far away. What is a reasonable guard?",
      options: [
        "None — the POC is defined, so it is reliable",
        "Average the two humps' prices and use that",
        "Switch to 50-point rows so there is only one hump",
        "Record the runner-up hump's volume and price; on days when it is close, treat the POC as unreliable or use both as levels — then test whether that helps",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A POC that would flip on a small change is fragile, and the rule using it inherits that. Measuring the margin lets you separate stable days from coin-toss days. Whether that improves anything is an empirical question, so test it rather than assume.",
      distractors: [
        "Being well defined is not the same as being stable. A coin toss is well defined too.",
        "The average of two humps lands in the thin waist between them, a price where little traded.",
        "Coarse rows hide the second hump rather than resolving it, and on 1 Oct 50-point rows move the POC to the OTHER hump.",
        "",
      ],
    },
    {
      q: "You check a POC tie on Sierra Chart and on TradingView. What does each platform's documentation tell you?",
      options: [
        "Both use the closer-to-POC-then-above rule for POC ties",
        "Sierra documents nearest-the-middle-then-lower for the POC; TradingView's documented tie rule is for value-area expansion, and we did not find its POC tie rule",
        "Neither documents any tie rule",
        "Both always take the higher row",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Sierra Chart's documentation states the POC tie rule this course uses. TradingView's 'closer to the POC, then the row above' rule decides which row to add when growing the value area — a different decision.",
      distractors: [
        "That rule is TradingView's, and it is about value-area expansion, not about which row is the POC.",
        "",
        "Sierra Chart documents its POC tie rule explicitly.",
        "Neither platform documents that; Sierra's goes to the LOWER row on an exact distance tie.",
      ],
    },
    {
      q: "Why are exact POC ties far more common on TPO profiles than on volume profiles built from one-minute bars?",
      options: [
        "TPO counts are small whole numbers, while spreading bar volume over its range produces fractional row volumes",
        "TPO profiles use larger rows",
        "Volume profiles have a built-in tie-breaker",
        "They are not; ties are equally common",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A row's TPO count might be 6 or 8 out of 13 periods, so two rows sharing the top count is ordinary. Volume rows built by overlap fractions rarely match to the last decimal. The tie rule matters most where you might assume it matters least: on TPO profiles and small, coarse ones.",
      distractors: [
        "",
        "Row size is a separate choice and can be the same for both.",
        "The tie-breaker is a rule applied after counting, the same for either kind of profile.",
        "Small integer counts collide much more often than fractional volumes do.",
      ],
    },
  ],
  lab: LAB_POC,
};

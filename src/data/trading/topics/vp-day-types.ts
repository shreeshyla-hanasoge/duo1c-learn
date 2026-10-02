import type { Topic } from "../../types.ts";

export const vpDayTypes: Topic = {
  id: "vp-day-types",
  title: "Day types and the initial balance",
  tier: 1,
  depth: "deep",
  summary:
    "The CBOT's four day types, Dalton's six, and the live, measurable pieces underneath them: initial balance width, range extension per side, and where the close sits.",
  why: "Day types are the Market Profile vocabulary for how a session unfolded: did the first hour set the range, did one side keep extending it, or did both sides try and fail? They are labels you can only apply after the close. The pieces they are built from, though, can be computed bar by bar without hindsight. A rule-builder needs both: the labels to read the literature, and the pieces to write rules that could actually have traded.",
  viz: ["vp-day-types"],
  learn: {
    intuition:
      "Think of the first hour as the market's opening offer. Local, short-term traders set an early range while the larger participants watch. What happens next is the story of the day. If nobody with size disagrees, price stays inside that early range and the day is quiet. If a large buyer or seller turns up, price breaks out of the early range on one side and keeps going. If both sides try to break out and both fail, the day ends back in the middle. Day types are names for those stories. Every one of them is defined by three things you can measure: how wide the first hour was, how far price went beyond it on each side, and where the day closed. Learn the names to read Dalton. Compute the three pieces to build rules.",
    mechanics: [
      {
        heading: "The initial balance is the first two periods, and its length is a convention",
        body: "Dalton defines the initial balance (IB) as the range traded in the first two trading periods (Markets in Profile, ch.4, p.48). With 30-minute periods that is the first hour: 09:15–10:15 on NSE. The CBOT study guide is more careful. It says the IB took one hour in grain futures. In CBOT financial futures it was about an hour too, until their sessions were lengthened, and then about one hour forty minutes. It tells readers to work out the right length for each market. So NIFTY's 09:15–10:15 is a convention, not a rule from the source. For MCX crude a 09:00–10:00 first hour falls in thin Indian-morning trading, long before US hours bring most of the volume. That is a reason to question it there.",
      },
      {
        heading: "Range extension is measured per side",
        body: "Range extension is trading beyond the IB high or IB low later in the day (Markets in Profile, p.48). Dalton reads upward extension that keeps attracting buying as real buying strength, and accepted downward extension as selling strength. Measure it per side: `extUp = max(0, high − ibHigh)`, `extDown = max(0, ibLow − low)`, and divide each by the IB width to compare days. The visualiser shows these numbers for each synthetic day. The trend day's IB is 49.85 points and it extends 273.5 points up, 5.5 times the IB. The neutral day extends about 0.6 IB on each side.",
      },
      {
        heading: "The CBOT's original four types",
        body: "The CBOT study guide (Part I) gives four. Normal day: about 85% or more of the range forms during the IB. Normal variation: range extension of up to about double the IB. Trend day: extension well beyond double the IB, with a close on the extreme. Neutral day: range extension on both sides. The words are approximate ('about'), and 'up to about double' can be read two ways: the extension is up to twice the IB, or the whole range is up to twice the IB. Pick one reading and write it down. The guide's summary table also gives rough short-term/long-term volume splits per type, such as about 80/20 on a normal day. Treat those as illustrations, not measurements.",
      },
      {
        heading: "Dalton's six, and what each is said to imply",
        body: "Mind Over Markets (ch.2) lists normal, normal variation, trend, double-distribution trend, non-trend and neutral; its index also splits neutral into neutral-centre and neutral-extreme. Dalton therefore adds two types to the CBOT's four. Secondary summaries (we did not read the body text) describe them like this. Normal: a wide IB set early, then little extension. Normal variation: extension on one side. Trend: a narrow IB, then steady one-way movement and a close near the extreme. Double-distribution trend: a quiet start, a sharp move, two distributions joined by thin trade. Neutral: extension on both sides, where a close in the centre and a close at an extreme mean different things. Non-trend: a very narrow range with little extension, often ahead of news.",
      },
      {
        heading: "Labels need the close; the pieces do not",
        body: "You cannot know at 11:30 that today is a trend day. The label depends on the final range and the close. A backtest that uses today's day type to decide a trade made during today has look-ahead bias. What you CAN compute at any bar: the IB width (fixed from 10:15), extension so far on each side, extension as a multiple of the IB, and where the current price sits in the range so far. Those are honest live inputs. Yesterday's day type is also honest, as context for today. Note that NSE's own timings page now shows equity derivatives closing at 15:40, reportedly from 3 Aug 2026. This course's synthetic days use 09:15–15:30, so check which close your data uses before you measure 'close location'.",
      },
    ],
    complexityDerivation:
      "The CBOT's six-part study guide (1996) gives the original four types (normal, normal variation, trend, neutral) with approximate thresholds: about 85% of the range in the IB for a normal day, extension up to about double the IB for a normal variation, well beyond that with a close on the extreme for a trend day. It also says the IB's length is market-specific. Those points are verified in the research notes. Dalton's Mind Over Markets lists six types, adding double-distribution trend and non-trend; we verified the section titles but not the body text, so the descriptions of what each type implies come from secondary summaries. Markets in Profile defines the IB as the first two periods and reads range extension as evidence of strength (verified, p.48). What is missing is measurement. We found no published frequency of each day type on any market with a stated method, and nothing for NIFTY or MCX. The CBOT's volume splits per type are illustrations. We also found no test of whether a narrow IB predicts a trend day better than chance. The approximate words ('about 85%', 'about double') mean that any two people who code these types will disagree on borderline days unless they publish their thresholds.",
    variants: [
      {
        name: "CBOT four",
        when: "You want the original, simplest classification.",
        delta:
          "Normal, normal variation, trend, neutral, defined by IB share of the range, extension multiple and close location. Four thresholds to choose.",
      },
      {
        name: "Dalton six",
        when: "You are reading Dalton or practitioners who follow him.",
        delta:
          "Adds double-distribution trend (needs a two-hump test on the profile) and non-trend (needs a 'narrow range' threshold, for example against recent average range). Neutral splits into centre and extreme by close location.",
      },
      {
        name: "A different IB length",
        when: "The market's opening hour is unusual: MCX's thin morning, or an index whose first minutes are dominated by an auction.",
        delta:
          "30 minutes, 60 minutes, or a sub-session start such as MCX's US-hours portion. The CBOT guide says to choose per market. Platforms agree it is a setting: NinjaTrader's IB option has configurable minutes.",
      },
      {
        name: "Components only, no label",
        when: "You are building rules rather than reading books.",
        delta:
          "Feed IB width, extension up, extension down and close location to the rule directly. No borderline labels and no hidden thresholds, but you lose the shared vocabulary.",
      },
    ],
    tradeoffs: [
      {
        vs: "Using the day-type label as a rule input",
        pick: "The measurable components, computed as of the bar",
        because:
          "A label needs the close, so using today's label intraday is look-ahead. The components are known at every bar and carry the same information as the day unfolds.",
      },
      {
        vs: "A 60-minute IB on every market",
        pick: "An IB length chosen per market and written down",
        because:
          "The CBOT guide itself says the right length varies by market. NIFTY's 09:15–10:15 is a reasonable convention; MCX crude's 09:00–10:00 is in its quietest hours.",
      },
      {
        vs: "The CBOT's approximate thresholds",
        pick: "Thresholds set from your own data (for example quantiles of IB width) and fixed before testing",
        because:
          "'About 85%' and 'about double' were written for 1980s grain and bond futures. Calibrate once on a first sample, freeze the numbers, then test on data the calibration never saw.",
      },
    ],
  },
  realWorld: [
    {
      system: "CBOT — A Six-Part Study Guide to Market Profile",
      kind: "industry",
      problem:
        "Floor traders needed a shared, quick way to describe how a session had developed.",
      applied:
        "The guide defines four day types by IB share of the range, extension and close location. It says the IB was an hour in grains, about an hour in financials before their sessions were lengthened, and about one hour forty minutes after.",
      evidence: "CBOT study guide (1996), Part I, printed pp.9–18",
      impact: "The original four types, and the warning that the IB is market-specific",
    },
    {
      system: "Dalton — Mind Over Markets, ch.2",
      kind: "industry",
      problem:
        "Four types left common days unnamed: a quiet start followed by a jump to a new area, or a dead, narrow day.",
      applied:
        "Dalton's list adds double-distribution trend and non-trend, and splits neutral into neutral-centre and neutral-extreme. We read the table of contents and index, not the body text.",
      evidence: "Mind Over Markets, updated ed. (Wiley, 2013), pp.19–31 (TOC and index)",
      impact: "The six-type vocabulary most practitioners use today",
    },
    {
      system: "NinjaTrader 8 — Order Flow Volume Profile",
      kind: "industry",
      problem:
        "A charting platform cannot hard-code 'the first hour' for every market it serves.",
      applied:
        "Its documentation lists an initial-balance option with configurable minutes, alongside developing POC and value area.",
      evidence: "NinjaTrader 8 help guide: Order Flow Volume Profile",
      impact: "Treats IB length as the parameter it is",
    },
    {
      system: "Your strategy builder — session range and the IB",
      kind: "yours",
      problem:
        "Your session range input says whether today has traded beyond yesterday's value above, below, or both. 'Both' sounds like a neutral day, but it is measured against YESTERDAY's value area, not today's IB, so the two answer different questions.",
      applied:
        "Candidate live inputs in the same spirit: IB width after 10:15, extension so far above and below the IB, and each as a multiple of IB width. On the synthetic 1 Oct bars the IB is 22,176–22,294.75 (118.75 points), and price later extends 176.8 points above it (1.5 times the IB) with none below. All of it is known as of each bar, so none of it needs look-ahead.",
      impact: "Turns after-the-fact labels into inputs a rule can use at the bar",
    },
  ],
  insights: [
    {
      t: "Four types at the CBOT, six in Dalton",
      d: "The CBOT guide had normal, normal variation, trend and neutral. Dalton adds double-distribution trend and non-trend, and splits neutral by where it closes.",
    },
    {
      t: "The IB is 'the first two periods', and its length is market-specific",
      d: "The CBOT guide used an hour in grains and up to an hour forty in financials, and told readers to choose per market. NIFTY's 09:15–10:15 is a convention.",
    },
    {
      t: "Labels come after the close; components are live",
      d: "IB width, extension per side and close location can be computed at every bar. Today's day type cannot, so using it intraday is look-ahead.",
    },
    {
      t: "Approximate words need exact numbers",
      d: "'About 85%' and 'about double' leave borderline days to judgement. Any coded classifier must publish its thresholds, or two coders will label the same day differently.",
    },
  ],
  pitfalls: [
    "Using today's day type in a backtest of trades made today. The label needs the close; that is look-ahead bias.",
    "Calling any day with extension on both sides 'neutral'. The synthetic non-trend day extends 8.4 points above its IB and 14.45 below. A rule with no minimum extension would label it neutral.",
    "Copying a 60-minute IB to every market. The CBOT guide said to choose the length per market, and MCX crude's first hour is its thinnest.",
    "Reading 'up to about double the IB' one way in your code and another in your notes. Decide whether it limits the extension or the whole range, and write it down.",
    "Measuring close location against 15:30 on data whose derivatives session closes at 15:40, or the reverse. Check the session times in your own data.",
  ],
  quiz: [
    {
      q: "NIFTY futures (illustrative numbers): IB 22,400–22,460. The day's range is 22,400–22,468 and it closes at 22,430. Under the CBOT definitions, which type is it?",
      options: ["Normal variation", "Trend", "Neutral", "Normal"],
      answer: 3,
      difficulty: "apply",
      why: "The range is 68 points and the IB is 60 of them, about 88%. That clears the CBOT's 'about 85% or more of the range in the IB' for a normal day. The 8 points of extension above is small, and there is none below.",
      distractors: [
        "There IS a little extension on one side, which is the normal variation's signature. But 88% of the range formed in the IB, and that is the CBOT's normal-day test.",
        "A trend day needs extension well beyond double the IB and a close on the extreme. Here extension is 8 points and the close is mid-range.",
        "Neutral needs extension on BOTH sides. The low never went below the IB low.",
        "",
      ],
    },
    {
      q: "IB 22,300–22,350. The day's high is 22,580, its low 22,300, and it closes at 22,572 (illustrative). Which type, and what makes it so?",
      options: [
        "Normal variation, because the extension is on one side only",
        "Trend: extension of 230 points is 4.6 times the IB, well beyond double, with a close near the extreme",
        "Neutral, because it traded at both IB edges",
        "Normal, because the IB was narrow",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The IB is 50 points. Price extended 230 points above it (4.6 times the IB) and closed 8 points under the high. Both CBOT trend conditions are met: extension well beyond double the IB, and a close on the extreme.",
      distractors: [
        "One-sided extension is necessary for both normal variation and trend. The SIZE decides: normal variation stops at about double the IB, and this is 4.6 times.",
        "",
        "Touching the IB low is not extension. Neutral needs trading BEYOND both IB edges.",
        "A narrow IB is the classic early clue for a trend day, the opposite of a normal day, which has a wide IB holding most of the range.",
      ],
    },
    {
      q: "IB 22,350–22,420. The day's high is 22,465, its low 22,305, and it closes at 22,385 (illustrative). How would Dalton's vocabulary describe it?",
      options: [
        "Trend day down",
        "Normal day",
        "Neutral, closing in the centre (neutral-centre)",
        "Double-distribution trend",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Price extended 45 points beyond each side of the 70-point IB and closed at 22,385, inside the IB and near the middle of the range. Extension on both sides is neutral, and a central close is the neutral-centre case in Dalton's index.",
      distractors: [
        "A trend day extends one way and closes on that extreme. This one extended both ways and closed in the middle.",
        "A normal day keeps about 85% of its range inside the IB. Here the IB is 70 of 160 points, under half.",
        "",
        "A double distribution has two separate accepted areas with a thin gap between them. Nothing here describes a fast move to a new area.",
      ],
    },
    {
      q: "Your classifier labels the visualiser's synthetic non-trend day 'neutral'. That day's IB is 27.75 points, and it extends 8.4 points above and 14.45 below. What is the most sensible fix?",
      options: [
        "None: the classifier is right, it is a neutral day",
        "Remove the neutral type",
        "Shorten the IB to 30 minutes",
        "Require a minimum extension on each side (for example a fraction of the IB, or of recent average range) before calling it neutral, and add a narrow-range test for non-trend",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Taken literally, 'extension on both sides' fires on a few points of noise. Neutral is meant to describe both sides really trying. Dalton's non-trend type exists for narrow, quiet days, and coding it needs a 'narrow' threshold. Fix both thresholds before testing, not after.",
      distractors: [
        "It meets the literal rule, which is the problem. A few points either side on a dead day is not two sides trying and failing.",
        "Neutral days are real and distinct. The bug is the missing threshold, not the type.",
        "A shorter IB would usually make the IB NARROWER, so even more days would show extension on both sides.",
        "",
      ],
    },
    {
      q: "A backtest buys NIFTY futures at 11:30 'on trend days', using each day's final type. It shows excellent results. What is wrong?",
      options: [
        "Look-ahead: the day type is known only after the close, so the rule used information it could not have had at 11:30",
        "Nothing, if the day-type definitions are the CBOT's",
        "Trend days are too rare to test",
        "11:30 is too late in the day to enter",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Whether a day is a trend day depends on its final range and close. At 11:30 those are unknown. An honest version uses what exists at 11:30: IB width, extension so far, and where price sits in the range so far.",
      distractors: [
        "",
        "Good definitions do not fix the timing. Any label that needs the close is look-ahead when used before the close.",
        "Rarity limits statistical power, but it does not explain results that are too good. Look-ahead does.",
        "Entry time is a design choice. The flaw is the information the rule used, not the hour.",
      ],
    },
    {
      q: "Which two day types does Dalton's list in Mind Over Markets add to the CBOT's original four?",
      options: [
        "Open-drive and open-auction",
        "Double-distribution trend and non-trend",
        "Inside day and outside day",
        "P day and b day",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The CBOT guide had normal, normal variation, trend and neutral. Dalton's chapter 2 adds double-distribution trend and non-trend, and his index splits neutral into neutral-centre and neutral-extreme.",
      distractors: [
        "Those are opening types (lesson 9), which classify the first minutes, not the whole day.",
        "",
        "Inside and outside describe how one day's value relates to the previous day's (lesson 10).",
        "P and b are profile shapes (lesson 7). Dalton reads them, but they are not entries in his day-type list.",
      ],
    },
    {
      q: "Where does 09:15–10:15 as NIFTY's initial balance come from?",
      options: [
        "The CBOT study guide fixes the IB at exactly 60 minutes for all markets",
        "NSE defines it in its market timings",
        "It is a convention: Dalton defines the IB as the first two 30-minute periods, and the CBOT guide said the right length is market-specific",
        "SEBI requires it",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Two 30-minute periods from the 09:15 open give 09:15–10:15. The CBOT guide used an hour in grains, about an hour and later about one hour forty in financials, and told readers to choose per market. Nothing makes 60 minutes correct for NIFTY.",
      distractors: [
        "The guide says the opposite: the length varied by market and readers should work it out for their own.",
        "NSE's timings page defines the pre-open and the normal market, not an initial balance. IB is a Market Profile concept, not an exchange one.",
        "",
        "Regulators set trading hours and contract rules. They do not define charting concepts.",
      ],
    },
    {
      q: "Synthetic 1 Oct: IB 22,176–22,294.75 (118.75 points). Price extends 176.8 points above (1.5 times the IB), none below, and closes at 22,448 near the high of 22,471.55. The profile has two humps. Which statement is right?",
      options: [
        "It is unambiguously a normal variation day",
        "It is unambiguously a trend day",
        "It is a neutral day",
        "The label depends on the reading: extension up to double the IB makes it normal variation; a total range up to double makes it beyond that; and the two-hump profile fits Dalton's double-distribution trend",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Extension of 1.5 times the IB is within 'up to about double' if the phrase limits the extension. The whole range, though, is about 2.5 times the IB, beyond double if the phrase limits the range. Add the two humps joined by a thin waist and Dalton's double-distribution label also fits. Written-down numbers settle it; the words do not.",
      distractors: [
        "Only under one reading of 'up to about double'. The other reading puts it beyond that.",
        "A trend day needs extension WELL beyond double. 1.5 times the IB does not obviously qualify, and this IB is more than twice as wide as the synthetic trend day's 49.85 points.",
        "Neutral needs extension on both sides. The IB low is the day's low, so nothing traded below it.",
        "",
      ],
    },
  ],
};

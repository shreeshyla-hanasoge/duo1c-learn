import type { Topic } from "../../types.ts";

export const vpAnatomy: Topic = {
  id: "vp-anatomy",
  title: "Anatomy of a profile",
  tier: 1,
  depth: "deep",
  summary:
    "Nodes, thin zones, single prints, tails, poor highs and ledges: what each one is, who named it, and how little of it has been tested.",
  why: "POC, VAH and VAL compress a whole session into three numbers. The rest of the profile, meaning where it is fat, where it is thin and how each end finishes, is what traders actually read, and most of the vocabulary for it comes from Steidlmayer and Dalton. Some of these terms have exact definitions you can code. Others are practitioner habits with a plausible story and no measured rate. You need to know which is which before any of them goes into a rule.",
  viz: ["vp-anatomy"],
  learn: {
    intuition:
      "A finished profile is a record of where the auction spent its effort. Fat parts are prices where both sides kept trading: the market accepted them. Thin parts are prices the market only passed through on the way somewhere else. The two ends tell you how the day's exploration finished. A sharp, thin end means price reached a level, found no one willing to trade, and left fast. A blunt, heavy end means price stopped there without being clearly pushed away. Every feature in this lesson is one of those three things: a fat zone, a thin zone, or a way of ending. Treat each name as a description of what happened today. The stories traders attach to them ('price will come back here', 'price will rush through there') are hypotheses about tomorrow. Very few of those hypotheses have ever been measured.",
    mechanics: [
      {
        heading: "High- and low-volume nodes are peaks and troughs, and you choose the threshold",
        body: "A high-volume node (HVN) is a local peak in volume: a row, or a cluster of rows, much heavier than the rows around it. A low-volume node (LVN) is a local trough between heavier areas. No source we checked gives a numeric definition. The visualiser uses its own: a row is an HVN if it is a local peak with at least half the profile's maximum volume, and an LVN if it holds under 6% of the maximum and is not at an edge. Those are this course's choices, not a standard. Row size changes the answer. On the synthetic anatomy day the POC is 22,465 at 10-point rows but 22,332.5 at 5-point rows, because the two nodes are nearly the same size and the row size decides which one wins.",
      },
      {
        heading: "Single prints belong to TPO charts, not volume profiles",
        body: "A single print is a price where only one 30-minute TPO letter appears: price visited it during one period and never came back that day. A run of single prints marks a fast, one-way move. A volume profile has no letters, so it cannot show single prints directly. The nearest thing it shows is a thin row. The two are not the same measurement. A row can be thin in volume yet visited in several periods (a slow, quiet drift), and a single-print row can carry real volume if one burst traded there. Lesson 2 shows a whole day where time and volume disagree. If your platform builds only volume profiles, say 'thin row', not 'single print'.",
      },
      {
        heading: "Tails and excess: an end that was rejected",
        body: "A tail is two or more single prints at the very top or bottom of the day. In Markets in Profile (ch.6) Dalton describes excess as a sharp high or low that ends an auction. It trades on light volume and is often followed by a sharp move away, and he treats a price gap as an extreme form of it. The CBOT study guide (Part IV) links the 'third standard deviation' of a profile to excess: low volume, rejected price. The visualiser's synthetic day has a buying tail at the low. Price dipped there in the first minutes and was pushed back up quickly. Read it as 'buyers responded strongly there today', not 'that low will hold'.",
      },
      {
        heading: "Poor highs and lows: an end with no rejection",
        body: "Sierra Chart's documentation gives the one exact definition we found. A poor high is a TPO high equal to a previous TPO high: the top row was printed in two or more 30-minute periods. Price kept pressing the same extreme and stopped there without a tail. The mirror case is a poor low. Mind Over Markets indexes poor highs and lows (pp.312–316), and Markets in Profile labels a poor low in a figure (ch.7). The common reading is that a poor extreme is an 'unfinished auction' the market is likely to revisit. Secondary sources report that as Dalton's view; we could not read his body text on it, and we found no measured revisit rate.",
      },
      {
        heading: "Ledges: a shelf nobody has defined",
        body: "A ledge is a squared-off edge in the profile: several rows of nearly equal volume, then a sharp drop. Traders read it like a poor high, as an auction that stopped rather than finished. It is practitioner vocabulary, and none of the sources in this course's research notes define it. To use a ledge in a rule you must invent the definition yourself. For example: 'the last three rows before the edge are within 15% of each other, and the next row is under a third of their average'. Then report that definition, because a different one will find different ledges in the same data.",
      },
    ],
    complexityDerivation:
      "The vocabulary comes from two places. Steidlmayer's work at the CBOT gave single prints, tails and excess; the CBOT's own study guide ties excess to low volume and rejected price. Dalton's books carry the terms forward: excess and its signs, single-print buying tails as evidence of responsive buyers, and poor highs and lows. All of that is verified at chapter or index level in the research notes. Sierra Chart supplies the only exact, codeable definition we found, for a poor high. Then come the readings, which are a different kind of claim: 'LVNs get traded through fast', 'HVNs act as support', 'poor highs get revisited'. They are repeated everywhere. We found no published test of any of them with a stated method, and no peer-reviewed study of Market Profile rules at all. The nearest rigorous work is Osler (2000), on support and resistance levels published by FX firms. Prices bounced at those levels 60.8% of the time against 56.2% at random levels: a small, real edge, for price levels, not volume nodes. Untested: whether poor highs are revisited more often than highs with a tail, and whether price crosses an LVN faster than a normal row of the same width.",
    variants: [
      {
        name: "TPO features (single prints, tails, poor highs)",
        when: "You have, or can build, 30-minute letters for the session.",
        delta:
          "Count how many periods visited each row. Results depend on the period length and on where the first period starts. A platform anchored to a foreign session time will misplace NSE letters.",
      },
      {
        name: "Volume nodes (HVN, LVN)",
        when: "You have a volume profile from 1-minute bars or ticks.",
        delta:
          "Peaks and troughs of volume per row. Every result depends on row size and on the threshold you pick for 'much heavier' or 'much thinner'.",
      },
      {
        name: "Smoothed peak detection",
        when: "Rows are fine (1 or 2 points) and the profile is jagged.",
        delta:
          "Smooth over a few rows, then find peaks with a minimum prominence. The smoothing window and the prominence are two more parameters to report with every result.",
      },
      {
        name: "Composite nodes",
        when: "You want levels that held across many sessions, not one.",
        delta:
          "Find nodes on a profile summed over days (lesson 14). This only works on an absolute price grid, and futures rolls shift every level by the calendar spread.",
      },
    ],
    tradeoffs: [
      {
        vs: "Using only POC, VAH and VAL",
        pick: "Add a node feature only after you have written its definition in code",
        because:
          "Three levels cannot show a thin zone inside the value area. A node feature can, but a vague one adds a parameter you will be tempted to tune after seeing results. That is how overfitting starts.",
      },
      {
        vs: "Reading features by eye",
        pick: "Written definitions, applied by the computer",
        because:
          "Judged by eye, 'is that a poor high?' tends to get answered after you already know whether price came back. A coded definition gives the same answer before and after, which is the only way to count anything honestly.",
      },
      {
        vs: "TPO single prints versus thin volume rows",
        pick: "Whichever your data actually supports, named for what it is",
        because:
          "They measure different things, time against volume. Calling a thin volume row a 'single print' borrows the TPO literature's reading for a measurement it never described.",
      },
    ],
  },
  realWorld: [
    {
      system: "Sierra Chart — TPO charts",
      kind: "industry",
      problem:
        "Traders talk about 'poor highs' constantly, but a chart can only mark one if the term has an exact meaning.",
      applied:
        "Sierra's documentation defines a poor high as a TPO high equal to a previous TPO high, meaning the top price printed in more than one period. That is directly codeable from 30-minute letters.",
      evidence: "Sierra Chart documentation, Time Price Opportunity Charts",
      impact: "The one precise, public definition of a poor high we found",
    },
    {
      system: "CBOT — A Six-Part Study Guide to Market Profile (1996)",
      kind: "industry",
      problem:
        "Steidlmayer's profile needed a way to say which prices were accepted and which were rejected.",
      applied:
        "The guide maps the 'first standard deviation' to the value area (high volume, accepted price) and the 'third standard deviation' to excess (low volume, rejected price). The wording is a label borrowed from the bell curve. The guide gives no procedure that estimates a standard deviation.",
      evidence: "CBOT study guide, Part IV (printed p.129)",
      impact: "Where 'excess' as a profile term comes from",
    },
    {
      system: "Dalton — Markets in Profile (2007)",
      kind: "industry",
      problem:
        "How do you tell, after the fact, where a strong participant stepped in?",
      applied:
        "Dalton uses single-print buying tails as evidence of responsive buyers in his worked examples (ch.7–8), and describes excess as a sharp, light-volume end to an auction, often followed by a sharp move away (ch.6).",
      evidence: "Markets in Profile, ch.6–8",
      impact: "Readings, argued from examples, not measured rates",
    },
    {
      system: "Your strategy builder — what three levels leave out",
      kind: "yours",
      problem:
        "Your rules use yesterday's POC, VAH and VAL, and a bar's zone. On the 1 Oct worked example the value area runs 22,215–22,470, but the synthetic profile has a lower hump around 22,180–22,250, a thin waist, and an upper hump around 22,430–22,460. A bar closing in that waist is 'inside' value by your zone input, yet it sits at prices the market only passed through.",
      applied:
        "A possible extra input to test: the volume of yesterday's row containing the bar's close, as a fraction of yesterday's POC row. That separates 'inside the value band' from 'inside an accepted part of it'. Define it, fix the row size, and test it as a filter on its own before combining it with anything.",
      impact: "Separates 'inside value' from 'inside accepted value'",
    },
  ],
  insights: [
    {
      t: "Fat means accepted, thin means passed through",
      d: "Every profile feature is one of three things: a zone where trade was easy, a zone price crossed quickly, or a way the day ended at an extreme. The names describe today; the forecasts attached to them are hypotheses.",
    },
    {
      t: "A poor high has an exact definition; a ledge does not",
      d: "Sierra Chart defines a poor high as a TPO high equal to a previous TPO high. 'Ledge' has no definition in the sources we checked, so any rule using it must state its own.",
    },
    {
      t: "Single prints need TPO letters",
      d: "A volume profile shows thin rows, not single prints. A thin row and a single-print row usually coincide, but time and volume can disagree, so name each measurement for what it is.",
    },
    {
      t: "'LVNs get crossed fast' and 'poor highs get revisited' are untested",
      d: "Both are widely repeated. We found no published test of either with a stated method. A fair test compares poor highs with highs that had a tail, not with nothing.",
    },
  ],
  pitfalls: [
    "Treating the whole value area as accepted. On a two-hump day the value area can span a thin waist, so 'inside value' and 'at an accepted price' are different claims.",
    "Calling thin volume rows 'single prints' and then borrowing the TPO literature's reading for them. They are different measurements and can disagree on the same day.",
    "Testing 'poor highs get revisited' against no control. Next-day ranges overlap a lot, so most highs of any kind get revisited. The question is whether poor highs get revisited more often than highs with a tail.",
    "Choosing the HVN or LVN threshold after looking at results. Fix row size, threshold and smoothing first, write them down, then count.",
    "Forgetting that row size can move the POC between two similar nodes. The synthetic anatomy day's POC is 22,465 at 10-point rows and 22,332.5 at 5-point rows.",
  ],
  quiz: [
    {
      q: "This is a volume profile at 10-point rows (synthetic). Where is the low-volume node?",
      figure: {
        lo: 22300,
        step: 10,
        bins: [6, 18, 40, 62, 55, 30, 8, 3, 2, 5, 35, 70, 58, 20],
        caption: "Synthetic profile, 10-point rows",
      },
      options: ["22,330–22,350", "22,400–22,420", "22,360–22,400", "22,300–22,310"],
      answer: 2,
      difficulty: "apply",
      why: "The rows from 22,360 to 22,400 hold 8, 3, 2 and 5, far below the two humps on either side (62 at 22,330 and 70 at 22,410). An LVN is a trough BETWEEN heavier areas, and that is the only one here.",
      distractors: [
        "That is the lower hump, the heaviest zone of the bottom half. It is a high-volume node.",
        "The thin rows end at 22,400. 22,400–22,420 is where volume picks up again into the upper hump.",
        "",
        "That row is thin, but it is the edge of the profile, not a trough between two heavier areas. An extreme that thins out is a tail-like end, not an LVN.",
      ],
    },
    {
      q: "This volume profile (5-point rows, synthetic) ends in two different ways. Which reading is fairest?",
      figure: {
        lo: 22400,
        step: 5,
        bins: [2, 3, 4, 12, 30, 48, 60, 52, 45, 50, 55, 58],
        caption: "Synthetic, volume only: no TPO letters",
      },
      options: [
        "The bottom is a confirmed buying tail and the top is a confirmed poor high",
        "Both ends are excess, because both are extremes of the day",
        "The top is a ledge, so price will return to it tomorrow",
        "The bottom tapers like a tail and the top ends bluntly like a poor high, but without 30-minute letters neither can be confirmed",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Three thin rows at the bottom look like a quick rejection, and a heavy top row with no taper looks like price stopping rather than being pushed away. But single prints and Sierra's poor-high test both count 30-minute periods, which a volume profile does not record. The shapes are suggestive, not confirmed.",
      distractors: [
        "Tempting because the shapes match the textbook pictures. But 'tail' means single prints and 'poor high' means the top printed in two or more periods, and a volume profile cannot show either.",
        "Every day has two extremes. Excess is a SHARP end on light volume. The heavy top row is the opposite of that.",
        "Even if you call it a ledge, 'price will return' is a claim we found no measured rate for. The shape describes today; it does not promise tomorrow.",
        "",
      ],
    },
    {
      q: "A NIFTY futures session's high, 22,480, printed in the C period and again in the F period, and no higher price traded. Under Sierra Chart's definition this is:",
      options: [
        "A poor high",
        "Excess, because it is the high of the day",
        "A single print",
        "A buying tail",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Sierra defines a poor high as a TPO high equal to a previous TPO high. Two different periods printed the same top price, so the high was touched more than once without being rejected sharply.",
      distractors: [
        "",
        "Excess is a sharp, light-volume end, usually a tail of single prints. A high touched in two separate periods is the opposite: no sharp rejection.",
        "A single print is a price visited in only ONE period. This price was visited in two.",
        "A buying tail sits at the LOW of the day. This is the high, and it has no tail at all.",
      ],
    },
    {
      q: "A trading forum says 'LVNs get traded through fast, about 70% of the time'. What does this course's research say about that claim?",
      options: [
        "It is Dalton's own measured statistic",
        "It is widely repeated, but we found no published test with a stated method, so the 70% is unsourced",
        "The CBOT study guide measured it in the 1980s",
        "Osler (2000) confirmed it for FX markets",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The research notes found no peer-reviewed or methodologically stated test of LVN behaviour. A precise-sounding percentage with no source is a warning sign, not evidence.",
      distractors: [
        "Dalton argues from examples. The research notes record no measured LVN statistic in his books.",
        "",
        "The CBOT guide defines terms and procedures. It does not report LVN traversal rates.",
        "Osler tested price levels published by FX firms (60.8% bounce against 56.2% at random levels). Those are not volume nodes, and her result was about bounces, not fast traversal.",
      ],
    },
    {
      q: "You want to test 'poor highs get revisited within five sessions' on NIFTY futures. Which comparison is the fair one?",
      options: [
        "Count how many poor highs were revisited; if most were, the claim holds",
        "Compare poor highs with the POC of the same day",
        "Compare the revisit rate of poor highs with the revisit rate of highs that had a tail, over the same five sessions and the same data",
        "Look at charts of poor highs that were revisited and check that they look alike",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Most highs of any kind get revisited within a few sessions, because daily ranges overlap. The claim is that POOR highs are revisited MORE often. Only a control group of non-poor highs tests that.",
      distractors: [
        "A high raw rate means nothing without a base rate. If 75% of all highs get revisited anyway, a 75% rate for poor highs shows no effect at all.",
        "The POC is inside the range and is revisited for different reasons. It is not a like-for-like control for an extreme.",
        "",
        "Picking examples by outcome is selection bias. It cannot show how often the claim fails.",
      ],
    },
    {
      q: "Yesterday's profile (synthetic, 10-point rows) is shown with its value area. A bar today closes at 22,275. Your zone input says 'inside'. What else does the profile tell you?",
      figure: {
        lo: 22200,
        step: 10,
        bins: [10, 35, 60, 70, 45, 12, 3, 2, 2, 4, 20, 65, 95, 80, 30, 5],
        showValueArea: true,
        lines: [{ price: 22275, label: "bar close" }],
        caption: "Yesterday, synthetic",
      },
      options: [
        "Nothing more: inside value means the price was accepted",
        "The close is inside the value band, but in a thin waist between two humps, at prices the market mostly passed through",
        "The close is outside value, because it is far from the POC",
        "The close is in a high-volume node",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The value area here runs 22,220–22,360. It spans both humps and the thin rows between them (2 to 4 units against 95 at the POC). 'Inside value' is true, but the row at 22,270–22,280 is one of the least accepted prices of the day.",
      distractors: [
        "This is the assumption the question is testing. A value area is a band holding 70% of volume. It does not promise that every price inside it was heavily traded.",
        "",
        "Zone is decided by VAH and VAL, not by distance from the POC. 22,275 lies between 22,220 and 22,360.",
        "The heavy rows are at 22,230–22,240 and 22,320–22,330. The 22,270 row holds 2, one of the thinnest in the profile.",
      ],
    },
    {
      q: "In Dalton's usage, what is excess?",
      options: [
        "Any price above the value area high",
        "Volume above the session's average",
        "The part of the value area beyond 70%",
        "A sharp high or low that ends an auction, on light volume, often followed by a sharp move away",
      ],
      answer: 3,
      difficulty: "recall",
      why: "In Markets in Profile (ch.6) excess is a sharp end to an auction that trades on light volume. Dalton treats a gap as an extreme form of it. A tail of single prints is its usual visible form.",
      distractors: [
        "Prices above VAH are just outside value. Many of them are traded heavily on trend days. Excess is about how the extreme ENDS.",
        "Excess is about rejection at an extreme, which means LOW volume, not high.",
        "The value area stops at about 70% by construction. 'Excess' is not a name for the overshoot.",
        "",
      ],
    },
    {
      q: "On the synthetic anatomy day the POC is 22,465 at 10-point rows and 22,332.5 at 5-point rows. What does that tell you?",
      options: [
        "One of the two calculations has a bug",
        "The day has two nodes of similar size, and row size decides which one counts as 'the' POC; the row size has to be reported with any level",
        "5-point rows are always more accurate, so 22,332.5 is the real POC",
        "The POC is meaningless on every day",
      ],
      answer: 1,
      difficulty: "apply",
      why: "When two humps hold nearly equal volume, regrouping the rows can tip the maximum from one to the other. Both numbers are correct for their row size. A rule keyed off 'yesterday's POC' therefore inherits the row size as a parameter.",
      distractors: [
        "Both come from the same tested code. The difference is real: the grouping changes which row holds the most volume.",
        "",
        "Finer rows are not 'truer'. They split volume more finely and can make the maximum noisier. Neither number is the real one; each is the answer for its row size.",
        "On a day with one clear node the POC barely moves with row size. This instability is specific to days with two similar nodes, and that is useful to know about a day.",
      ],
    },
  ],
};

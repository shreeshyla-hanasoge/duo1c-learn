import type { Topic } from "../../types.ts";
import { LAB_VALUE_AREA } from "../labs.ts";

export const vpValueArea: Topic = {
  id: "vp-value-area",
  title: "The value area",
  tier: 1,
  depth: "deep",
  summary:
    "Grow outwards from the POC two rows at a time until 70% of the volume is inside. The 70% is a convention, the result usually overshoots it, and platforms disagree on the steps.",
  why: "VAH and VAL are the edges every one of your rule inputs is measured against: zone, open zone and session range all ask 'above, inside or below yesterday's value?'. A few points' difference in VAL — and the methods differ by that much on the same data — changes which bars those rules classify as inside. And the three numbers alone can hide what the day looked like: a POC near the top of value can mean two quite different things.",
  viz: ["vp-value-area", "vp-value-area-rules", "vp-platforms"],
  learn: {
    intuition:
      "The POC is one row; the value area is the band around it where most of the day's business happened. Build it the way you would describe a crowd on Marine Drive: start at the densest spot and keep widening your circle towards whichever side has more people, until your circle holds most of the crowd. 'Most' is set at 70%. The procedure is greedy — it always takes the bigger next step and never looks back — so it does not find the narrowest possible 70% band, and because it adds whole rows, it usually ends up holding a bit more than 70%. On a single-hump day the result is what you would draw by eye. On a two-hump day it is not: to reach 70% it may have to cross the thin waist between the humps, and the band then includes prices the market barely traded. A value area is a volume total, not a list of accepted prices.",
    mechanics: [
      {
        heading: "Where 70% comes from: a rounded label, not a computed σ",
        body: "The CBOT's Market Profile study guide defines the value area as the range holding 70% of the day's volume and adds, in a note on its Liquidity Data Bank report, that this is one standard deviation 'rounded up to 70%'. One standard deviation either side of the mean of a normal distribution (the symmetric bell curve) holds 68.27%. But no CBOT procedure ever estimates a standard deviation: the value area is always found by growing outwards from the POC. And real profiles are lopsided or have two humps, so a 70% band grown from the POC has no fixed link to any mean or σ. Treat 70% as a round-number convention inspired by the bell curve.",
      },
      {
        heading: "Two rows at a time, step by step, on 1 Oct",
        body: "Synthetic 1 Oct session, 5-point rows: 7,87,468 contracts, so the target is 5,51,228. Start at the POC row, 22,445–22,450 (83,596). Step 1: the two rows above (22,450–22,460) hold 87,463; the two below (22,435–22,445) hold 90,335 — below wins. Step 2: above 87,463 against the next two below (22,425–22,435), 59,265 — above wins. Step 3: the next two above (22,460–22,470) hold 25,243, below still 59,265 — below. Step 4: above 25,243 against 22,415–22,425, 7,095 — above. VAH is now 22,470. After that the area grows downwards, pair by pair, through the thin waist, until the pair 22,215–22,225 (79,536) carries it past the target. VAL is 22,215.",
      },
      {
        heading: "Ties and edges: the rules a backtest must state",
        body: "Equal pairs go UP. A side with only one row left offers that one row, alone, against a full pair on the other side. A side with no rows left loses by default. The `vp-value-area-rules` visualiser hits all of them on ten rows from 22,400 — volumes 7, 6, 4, 2, 11, 7, 1, 3, 3, 7, total 51, target 35.7: the pair above wins (8 against 6); then a tie, 6 and 6, goes up; then one row left above (7) beats the pair below (6); then nothing is left above, so the pair below is added. Result: VAL 22,410, VAH 22,450, holding 38 of 51. Stop as soon as the area holds at least 70%, checking before each step, so a POC that alone holds 70% is the whole value area. VAH is the TOP edge of the top row, VAL the BOTTOM edge of the bottom row.",
      },
      {
        heading: "Why the area usually holds more than 70%",
        body: "Pairs are added whole, never a fraction of a row, so the last step usually overshoots. The CBOT study guide says exactly this: the result typically comes out slightly above 70%. 'Slightly' depends on the last pair. On 1 Oct, just before the last step the area holds 69.7% — a hair short — and the pair it then adds is the top of the lower hump, which takes it to 79.8%. Dalton's TPO example in Markets in Profile ends at 73%. The overshoot is the rule working as designed, not a bug; it is also why VAL on 1 Oct sits 255 points below VAH.",
      },
      {
        heading: "A POC near the top of value: look at the shape before you read it",
        body: "On 1 Oct the POC (22,447.5) is 22.5 points below VAH and 232.5 above VAL. One reading of a POC near the top: a P-shape — a thin rise from below, then acceptance up high — which Dalton usually reads as short covering (sellers buying back) rather than fresh buying. That is not what 1 Oct is. The synthetic 1 Oct session is a double distribution: a lower hump around 22,180–22,250, a thin waist, an upper hump around 22,430–22,460. Its value area spans the waist only because the 70% target could not be met by the upper hump alone. POC, VAH and VAL cannot tell those two days apart. Only the shape can.",
      },
    ],
    complexityDerivation:
      "Where it comes from: the CBOT's 1996 study guide (which we read) gives the procedure — start at the highest-volume price, compare the two prices above with the two below, add the larger pair, repeat until about 70% — with a worked example of 555 contracts and a target of 388, comparing 80 + 90 = 170 against 70 + 60 = 130. Its note on the Liquidity Data Bank report calls 70% one standard deviation rounded up. Dalton's Markets in Profile uses the same two-row method on TPOs. What it literally claims: that 70% of the volume, grown greedily from the POC, marks the range the market accepted. The bell-curve language is a label: there is no σ in the calculation, and our analysis is that for lopsided or two-hump profiles the band has no fixed relation to a standard deviation. We could not read Steidlmayer's own 1986 book, so we cannot say what it adds. Evidence for and against: we found no study showing 70% works better than 60% or 80%, or that VAH and VAL are revisited more often than other prices. Platforms disagree on the details — two rows or one, at least 70% or at most, 70% or 68% — so the same data gives different edges. Untested: whether any of your zone-based rules are sensitive to which variant you use. That is cheap to check. Cost: one pass outward from the POC, `O(rows)`.",
    variants: [
      {
        name: "CBOT / Dalton: two rows at a time, stop at ≥ 70%",
        when: "This course, your platform's `computeValueArea`, and the classic texts.",
        delta:
          "Compare pairs, add the larger, ties up. Usually ends above 70% — 79.8% on 1 Oct. On the 12-row example in the `vp-platforms` visualiser it reaches down to row 101.",
      },
      {
        name: "Sierra Chart default: one row at a time, tie takes both",
        when: "Matching a Sierra Chart chart with default settings.",
        delta:
          "Compare single rows; on a tie add both; stop at ≥ 70%. Sierra also offers 'Count 2 Levels at a Time' for the CBOT method. On 1 Oct: VAL 22,220, holding 74.5%; on the 12-row example, row 102.",
      },
      {
        name: "TradingView volume profile: one row at a time, never exceed 70%",
        when: "Matching a TradingView volume profile.",
        delta:
          "Compare single rows; a tie goes to the row closer to the POC, then the one above; STOP before a row would push the area past 70%, so it holds at most 70%. On 1 Oct: VAL 22,225, holding 69.7%; on the 12-row example, row 103. TradingView's TPO indicator instead runs until it reaches the target, so it can overshoot.",
      },
      {
        name: "NinjaTrader 8: 68% by default",
        when: "Matching NinjaTrader's Order Flow+ Volume Profile.",
        delta:
          "The documented default is 68% (configurable) — clearly meant to match 68.27%. NinjaTrader does not document its expansion rule, so we cannot say what VAL it would print for 1 Oct.",
      },
    ],
    tradeoffs: [
      {
        vs: "One-row expansion",
        pick: "Two rows at a time when matching your platform and the CBOT/Dalton texts; one row when matching Sierra or TradingView charts",
        because:
          "Neither is more correct. The two-row method can jump over a thin row to reach a big one; the one-row method stops short of it. What matters is that your backtest and your live system use the same one.",
      },
      {
        vs: "68% instead of 70%",
        pick: "Whatever matches the data you compare against",
        because:
          "On 1 Oct the step size and stop rule move VAL as much as the percentage does: 22,215 (two rows, ≥ 70%) against 22,225 (one row, ≤ 70%). Arguing over 68 versus 70 while ignoring the expansion rule misses the bigger difference.",
      },
      {
        vs: "Hump edges or a low-volume node as the reference",
        pick: "Hump-based levels on clearly two-hump days",
        because:
          "On 1 Oct the value area runs from 22,215 to 22,470 and includes a waist that barely traded. A rule asking 'is price inside yesterday's value?' answers 'yes' at 22,350, where the market did almost no business. Separate levels for each hump describe that day better — at the cost of a more complicated rule to test.",
      },
    ],
  },
  realWorld: [
    {
      system: "CBOT Market Profile study guide and Liquidity Data Bank",
      kind: "industry",
      problem: "Traders needed a single, repeatable definition of 'the day's value'.",
      applied:
        "The guide's 70% range calculation — two prices above against two below, larger pair first, until about 70% — and its note calling 70% one standard deviation rounded up. It says the result usually lands slightly above 70% because whole price levels are added.",
      evidence: "CBOT, A Six-Part Study Guide to Market Profile (1996), Part II (70% range) and Part VI (LDB report note H)",
      impact: "The origin of both the procedure and the 70% figure that nearly every platform still defaults to.",
    },
    {
      system: "Sierra Chart value-area options",
      kind: "industry",
      problem: "Users need to match either the CBOT method or a one-row method.",
      applied:
        "Default: one row at a time, larger first, a tie adds both rows, stop at or above the target. An option, 'Count 2 Levels at a Time for Value Area', switches to the CBOT/Dalton comparison. TPO and volume value-area percentages are separate inputs, both 70% by default.",
      evidence: "Sierra Chart documentation: TPO Profile Charts; Volume by Price",
      impact: "Sierra explicitly supports two value-area methods — a clear sign there is no single standard.",
    },
    {
      system: "TradingView volume profile versus its TPO indicator",
      kind: "industry",
      problem: "Two TradingView tools, two stopping rules.",
      applied:
        "The volume profile stops before a row would take the area past the target, so it holds at most 70%. The TPO indicator uses the same one-row expansion and tie rule but runs until it reaches the target, so it can overshoot.",
      evidence: "TradingView support: Volume Profile basic concepts; TPO indicator",
      impact:
        "Even on one platform, a 'value area' is not one definition. On 1 Oct the volume-profile rule gives VAL 22,225 where your platform gives 22,215.",
    },
    {
      system: "Your zone, open-zone and session-range inputs",
      kind: "yours",
      problem:
        "All three compare prices with yesterday's VAH and VAL, so they inherit every detail of how the value area was computed — and of how its edges are treated.",
      applied:
        "Your platform's `computeValueArea` uses exactly the course's rules (checked against this course's engine on 20,000 random profiles). Two details still decide classifications. Edges: on 1 Oct the open, 22,290, is exactly 30 Sep's VAL, so open zone is 'inside' with edges counted inside, but 'below' on a platform that treats the edge as outside. Width: 1 Oct's value area, 22,215–22,470, contains a thin waist, so on 2 Oct a close at 22,350 is 'inside yesterday's value' at a price 1 Oct barely traded.",
      evidence: "docs/trading/writing-brief.md; scripts/profile-check.mts",
      impact:
        "Write down the method and the edge convention next to every backtest, and consider flagging two-hump days separately.",
    },
  ],
  insights: [
    {
      t: "70% is a rounded label, not a computed σ",
      d: "The CBOT called it one standard deviation rounded up. No σ is ever estimated; the band is grown greedily from the POC, and on lopsided or two-hump profiles it has no fixed link to σ.",
    },
    {
      t: "Pairs are added whole, so the area overshoots",
      d: "The CBOT guide says the result is usually slightly above 70%. On the synthetic 1 Oct session the last pair takes it from 69.7% to 79.8%.",
    },
    {
      t: "Same data, three VALs",
      d: "1 Oct at 5-point rows: 22,215 by two rows and at least 70%, 22,220 by Sierra's one-row default, 22,225 by TradingView's at-most-70% rule. VAH is 22,470 in all three.",
    },
    {
      t: "POC near the top of value: P-shape or two humps?",
      d: "Dalton reads a P-shape as short covering. But 1 Oct has its POC 22.5 below VAH because it is a double distribution whose value area spans a thin waist. The three numbers cannot tell these apart; the shape can.",
    },
  ],
  pitfalls: [
    "Treating 70% as a statistical fact. It is a convention; there is no σ in the calculation.",
    "Calling an area of 79.8% a bug. Whole pairs overshoot, and the CBOT guide says to expect it.",
    "Comparing your VAH/VAL with a chart without checking one-row versus two-row, at-least versus at-most, and 70 versus 68%.",
    "Reading every price inside the value area as accepted. On two-hump days it can include a waist the market only passed through.",
    "Leaving the edge convention unstated. A price exactly on VAL is 'inside' in this course and 'below' on a platform that treats edges as outside — and 1 Oct opens exactly there.",
  ],
  quiz: [
    {
      q: "Where does the 70% in the value area come from?",
      options: [
        "It is the share of volume within one standard deviation, computed from each day's profile",
        "It was chosen by backtesting several percentages on CBOT data",
        "The CBOT described it as one standard deviation rounded up to 70%; no σ is computed in the procedure",
        "It is NSE's regulatory definition of fair value",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The CBOT's study guide labels 70% as one standard deviation, rounded up from 68.27%. The procedure itself only grows a band from the POC until it holds 70%; it never estimates a mean or σ.",
      distractors: [
        "No standard deviation is ever calculated. The band is grown greedily from the POC, which on a skewed profile has nothing to do with σ.",
        "We found no record of 70% being chosen by testing. The CBOT's own wording presents it as a rounded statistic.",
        "",
        "NSE has no such definition; value areas are computed by charting platforms.",
      ],
    },
    {
      q: "Nine rows from 22,400, 5 points each (volume shown). Using the course's two-row rule and 70%, what are VAL and VAH?",
      figure: {
        lo: 22400,
        step: 5,
        bins: [3, 5, 8, 6, 12, 10, 4, 9, 2],
        caption: "Nine rows, 22,400–22,445. Total 59.",
      },
      options: [
        "VAL 22,410, VAH 22,435",
        "VAL 22,410, VAH 22,445",
        "VAL 22,405, VAH 22,435",
        "VAL 22,405, VAH 22,430",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Target 41.3. POC is the 12 (row 22,420–22,425). Step 1: above 10 + 4 = 14, below 6 + 8 = 14 — a tie goes up (26). Step 2: above 9 + 2 = 11, below 14 — down (40, still short). Step 3: above 11, below 5 + 3 = 8 — up (51, 86%). Rows 22,410 to 22,445: VAL 22,410, VAH 22,445.",
      distractors: [
        "This stops after step 2 at 40 of 59 — 67.8%, still under 70%. One more step is needed.",
        "",
        "That is Sierra Chart's default — one row at a time, stop at 70% or more — not the two-row rule asked for.",
        "That is TradingView's volume-profile rule — one row at a time, stop BEFORE exceeding 70% — which here holds 41 of 59.",
      ],
    },
    {
      q: "On the synthetic 1 Oct session the value area holds 79.8% of the volume, not 70%. A colleague files a bug. Your reply?",
      options: [
        "Agree — the algorithm should stop exactly at 70%",
        "Agree — it should remove rows until it is under 70%",
        "It is a rounding error from the even split",
        "Not a bug: pairs are added whole. Before the last step it held 69.7%, so one more pair was needed, and that pair was the top of the lower hump",
      ],
      answer: 3,
      difficulty: "judge",
      why: "The rule stops at the first step that reaches at least 70%. Whole rows cannot be split, so the last pair overshoots. The CBOT guide itself says the result usually comes out slightly above 70%; on a two-hump day 'slightly' can be ten points.",
      distractors: [
        "Stopping exactly at 70% would need fractions of a row, which the method never uses.",
        "That would be TradingView's at-most-70% rule, a different method that gives VAL 22,225 instead of 22,215.",
        "Rounding cannot move the total by ten percentage points; the overshoot comes from adding a large pair whole.",
        "",
      ],
    },
    {
      q: "This profile's POC sits 12.5 points below VAH and 42.5 above VAL. What does a POC near the top of value suggest HERE?",
      figure: {
        lo: 22300,
        step: 5,
        bins: [4, 12, 18, 14, 7, 2, 1, 1, 2, 9, 20, 31, 24, 6],
        showValueArea: true,
        caption: "Illustrative profile, 5-point rows",
      },
      options: [
        "A P-shape: short covering, as Dalton describes",
        "A double distribution: two humps, and the value area spans the thin waist between them",
        "A balanced day with the POC in the middle",
        "Nothing; the POC's position inside value carries no information",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Look at the shape: a sizeable lower hump, a waist of 1s and 2s, and an upper hump holding the POC. The upper hump alone is not 70%, so the area had to cross the waist to collect the lower hump. A P-shape would have only a thin tail below, not a second hump.",
      distractors: [
        "That is the textbook reading of a POC near the top — and wrong for this shape. A P has a thin tail below; this has a second hump.",
        "",
        "The POC is clearly off-centre, and the profile has two humps, not one.",
        "The POC's position is a useful prompt; it just cannot be read without looking at the shape.",
      ],
    },
    {
      q: "Now this profile: thin rows below and one fat hump high up, with the POC near the top of the day's range. What is Dalton's usual reading, and how much should you trust it?",
      figure: {
        lo: 22300,
        step: 5,
        bins: [2, 2, 3, 3, 4, 5, 8, 14, 20, 26, 30, 24, 12, 4],
        showValueArea: true,
        caption: "Illustrative profile, 5-point rows",
      },
      options: [
        "Long liquidation — a hypothesis",
        "Fresh long-term buying — certain, because the POC is high",
        "Short covering rather than new buying — a hypothesis about who traded, which the profile cannot confirm",
        "A double distribution",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A profile weighted at the top with a thin tail below is Dalton's 'P' shape, which he usually reads as short covering. It is an inference about WHO traded; the profile only shows where trade happened. Use it as a question for the next session, not a conclusion.",
      distractors: [
        "Long liquidation is Dalton's reading of the mirror image, the 'b' shape: fat below, thin above.",
        "Dalton's reading is the opposite — a P often means short covering WITHOUT new long-term buying — and no shape makes anything certain.",
        "",
        "There is only one hump here; the rows below are a thin tail, not a second distribution.",
      ],
    },
    {
      q: "Your platform says 1 Oct's VAL is 22,215. A TradingView chart of the same data and rows shows 22,225. Which explanation fits the documentation?",
      options: [
        "TradingView expands one row at a time and stops before exceeding 70%, so it stops just short of the pair your platform adds",
        "TradingView uses 68%",
        "One of the two has a bug",
        "TradingView's POC is different",
      ],
      answer: 0,
      difficulty: "judge",
      why: "TradingView's documented rule holds at most 70%; it stops at 69.7% with VAL 22,225. Your platform, using the CBOT two-row rule with at least 70%, adds the 22,215–22,225 pair and reaches 79.8%. Same POC, same VAH, different stop rule.",
      distractors: [
        "",
        "TradingView's default is 70%. The 68% default is NinjaTrader's.",
        "Both follow their documented rules. The difference is the method, not a defect.",
        "The POC is 22,447.5 under both; it is the expansion that differs.",
      ],
    },
    {
      q: "30 Sep's value area is 22,290–22,335. On 1 Oct NIFTY futures open at exactly 22,290. What is the open zone?",
      options: [
        "Below, always",
        "Inside under the course's convention (edges count as inside); a platform treating edges as outside would say below",
        "Above",
        "Undefined, because the open equals VAL",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The course's `zoneOf` uses strict comparisons: below only if price < VAL. 22,290 is not below 22,290, so it is inside. Another platform may treat the edge as outside. Edge cases like this are rare, but on exactly those days two systems disagree.",
      distractors: [
        "Only under an edge-is-outside convention. The course counts edges as inside.",
        "",
        "The open is at the BOTTOM edge of value; it cannot be above it.",
        "It is well defined once the edge convention is stated — which is the point of stating it.",
      ],
    },
    {
      q: "A colleague says: 'The value area is the mean ± 1σ, so VAH − POC should roughly equal POC − VAL.' On 1 Oct those distances are 22.5 and 232.5 points. Who is right?",
      options: [
        "The colleague — the 1 Oct numbers must be wrong",
        "The colleague, for liquid instruments like NIFTY",
        "Neither; VAH and VAL are arbitrary",
        "Neither claim holds: the band is grown from the POC, not the mean, and on a lopsided or two-hump profile it is far from symmetric",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Symmetry around the centre is a property of a normal distribution. The procedure starts at the POC (the mode) and adds whichever side is heavier, so a skewed or bimodal profile gives a lopsided band. 1 Oct is a double distribution, and its band is about ten times longer below the POC than above.",
      distractors: [
        "The numbers follow directly from the rules; it is the assumption of symmetry that fails.",
        "Liquidity does not make a profile normal; 1 Oct is a two-hump day on the NIFTY future.",
        "They are not arbitrary — they follow a stated rule. They just are not ±1σ.",
        "",
      ],
    },
  ],
  lab: LAB_VALUE_AREA,
};

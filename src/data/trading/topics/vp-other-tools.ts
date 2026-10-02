import type { Topic } from "../../types.ts";

export const vpOtherTools: Topic = {
  id: "vp-other-tools",
  title: "Volume Profile next to other tools",
  tier: 1,
  depth: "deep",
  summary:
    "VWAP is an average, the POC is the most common price; delta, footprints and open interest answer other questions and need other data.",
  why: "Most charts that show a volume profile also show VWAP, and many traders add order-flow delta or open interest. Each tool answers a different question, and some of them cannot be computed at all from the one-minute bars most Indian data feeds give you. Knowing exactly what each one measures stops you counting two views of the same volume as two separate confirmations.",
  viz: ["vp-vwap"],
  learn: {
    intuition:
      "A volume profile is a whole distribution: how much traded at every price. VWAP squeezes that distribution into one number, the average price paid, with every trade weighted by its size. An average and a most-common value are different things. Think of the marks in a class where half the students scored around 40 and half around 85: the average is about 62, a mark almost nobody got, while the most common mark is one of the two clusters. The synthetic 1 Oct NIFTY futures session in this course is exactly that kind of day. At the close its VWAP is 22,329.88 and its POC is 22,447.5, and VWAP sits in the thin waist between the two humps where hardly anything traded. The other tools ask different questions again. Order-flow delta and footprint charts ask who was in a hurry — buyers lifting offers or sellers hitting bids — and need every trade with its direction. Open interest asks whether positions were opened or closed. None of them replaces the profile, and the profile replaces none of them.",
    mechanics: [
      {
        heading: "VWAP is one running average, reset at an anchor",
        body: "VWAP = Σ(price × volume) ÷ Σ volume, accumulated from an anchor. TradingView's documentation says its default price for each bar is `hlc3`, the typical price (high + low + close) ÷ 3, and that the average resets at the anchor you pick: session, week, month and others. The `vp-vwap` visualiser does the same on one-minute bars. With one-minute bars, `hlc3` stands in for the prices the bar's trades actually happened at, so it is an approximation; with tick data you would use each trade's own price. The idea comes from execution, not from chart reading: Berkowitz, Logue and Noser (1988) used the day's VWAP as the benchmark for measuring what about 14,000 institutional NYSE trades cost (we read the abstract, not the paper).",
      },
      {
        heading: "A mean and a mode part company on two-hump days",
        body: "The POC is the mode of the profile — the busiest row. VWAP is its mean. On a single, roughly symmetric hump the two sit close together. On a double distribution they do not. In the synthetic 1 Oct session VWAP is 22,218.70 at 10:14 and 22,243.13 at 13:14, then the afternoon's upper hump drags it to 22,329.88 by the close, while the POC ends at 22,447.5. The 5-point row that contains the closing VWAP holds about 2% of the volume of the POC row. So a line labelled 'VWAP support' can sit exactly where the market did least business that day. That is arithmetic, not a market claim: a mean of two clusters lands between them.",
      },
      {
        heading: "Standard-deviation bands measure spread around the mean, not value",
        body: "The bands are VWAP ± k × the volume-weighted standard deviation, √(Σ price² × volume ÷ Σ volume − VWAP²). TradingView offers a standard-deviation mode and a percentage mode with three multipliers, and NinjaTrader's order-flow VWAP has configurable deviation bands (both from their documentation). The '68% inside one standard deviation' rule of thumb is true only for a bell-shaped distribution. On the synthetic 1 Oct the closing band is VWAP ± 110.51 points, roughly 22,219 to 22,440, and it holds only about 44% of the day's volume. It also misses the POC, which sits just above the upper band. The value area, grown outward from the POC, covers 22,215 to 22,470 instead. Bands and value area answer different questions and should not be used as each other's substitutes.",
      },
      {
        heading: "Anchored VWAP: the anchor is a choice you must be able to write down",
        body: "An anchored VWAP starts the running average at a moment you choose instead of at 09:15. Brian Shannon, who popularised it, recommends anchoring at meaningful events — major highs and lows, news such as central-bank decisions, sharp reversals — and his own website calls choosing the anchor the most subjective part of the method. For a backtest that subjectivity is the problem. 'Anchor at the swing low' is only knowable after price has left the low, so a test that anchors there with hindsight is using information it could not have had. A testable anchor is one a computer can find at the time: 'the 09:15 bar of the session after each monthly expiry', or 'the lowest low of the previous 20 completed sessions'.",
      },
      {
        heading: "Delta, footprints and open interest need data one-minute bars do not carry",
        body: "Order-flow delta is volume traded at the ask minus volume traded at the bid: buyers who crossed the spread minus sellers who did. A footprint chart prints that split at every price inside every bar. NinjaTrader's documentation says true classification needs historical bid/ask tick data, and that without it an up-tick/down-tick approximation is used. TradingView's 'up/down volume' is something else again: a bar's volume counts as up if the bar closed at or above its open — bar direction, not who was aggressive. Open interest counts contracts still outstanding; it rises when new positions open and falls when they close. TradingView's documentation says it provides open interest for Indian futures only on daily bars. We could not verify how often NSE itself updates open interest during the day, so check your own feed before writing an intraday rule on it.",
      },
    ],
    complexityDerivation:
      "Where these tools come from is well documented; whether they help a trading rule mostly is not. VWAP began as an execution benchmark: Berkowitz, Logue and Noser (1988) measured the cost of about 14,000 institutional NYSE trades against the day's volume-weighted average price and put market impact at about 5 basis points (from the paper's abstract, which we read; we did not read the full text). That is a statement about measuring trading cost, not about price reacting at VWAP. The common explanation that price reacts near VWAP because execution desks benchmark against it is plausible, and our research notes contain no test of it; treat it as untested here. How VWAP, its bands, delta and up/down volume are computed is taken directly from TradingView's and NinjaTrader's own documentation. Anchored VWAP's guidance comes from its practitioner, Brian Shannon, whose site says anchor choice is subjective; that is practitioner opinion, not evidence. The claim that Paul Levine's MIDAS work first introduced anchoring appears only on secondary pages we could not confirm. The mean-versus-mode point and the 44% band coverage on 1 Oct are arithmetic on synthetic data, not findings about real markets. We found no published test of delta, footprints or open interest as inputs to profile-based rules on NSE or MCX.",
    variants: [
      {
        name: "Session VWAP with deviation bands",
        when: "You want one benchmark for 'is today's trading above or below its own average' and a sense of how spread out the day's volume is.",
        delta:
          "Resets at 09:15. The bands are symmetric around the mean, so on lopsided or two-hump days they cover far less (or more) than the bell-curve 68% and can miss the POC entirely.",
      },
      {
        name: "Anchored VWAP",
        when: "You want the average price paid since a specific event — an expiry, a budget day, a gap.",
        delta:
          "Same formula, different start. Testable only if the anchor rule can be evaluated at the time; a hand-picked swing low is hindsight.",
      },
      {
        name: "Order-flow delta and footprint charts",
        when: "You have tick data with the trade's direction and want to know which side was aggressive at each price.",
        delta:
          "Adds a dimension a profile does not have: not how much traded but who initiated it. Without bid/ask tick data it is an approximation, and TradingView's up/down volume is bar direction, not aggression.",
      },
      {
        name: "Open interest",
        when: "You want to know whether a move came with new positions being opened or old ones being closed.",
        delta:
          "Measures positions, not trades. On TradingView it is daily-only for Indian futures, so as a rule input it is a once-a-day number unless your feed is shown to provide more.",
      },
    ],
    tradeoffs: [
      {
        vs: "VWAP alone",
        pick: "The profile when the question is where trade concentrated; VWAP when you need one benchmark price",
        because:
          "VWAP throws away the shape. It cannot tell a single hump from two humps, and on a double-distribution day it points at the waist. The profile keeps the shape but gives you several levels to choose between. If a rule needs 'the price the day's business centred on', the POC is the honest answer on a two-hump day and VWAP is not.",
      },
      {
        vs: "Order-flow delta",
        pick: "A profile from one-minute bars, unless you genuinely have tick data with the aggressor side",
        because:
          "A profile from one-minute bars is a fair approximation of volume at price. Delta from one-minute bars is not available at all, and an approximation built on bar direction measures something different from what delta claims to measure. A test on approximated delta is a test of the approximation.",
      },
      {
        vs: "Adding a second tool as confirmation",
        pick: "One tool per question you are actually asking",
        because:
          "VWAP and the profile are both built from the same trades on the same day, so 'price held VWAP and held the POC' is two views of one fact, not two independent confirmations. Each extra condition is also one more variation tested, which is the multiple-comparisons problem lesson 18 deals with.",
      },
    ],
  },
  realWorld: [
    {
      system: "Execution benchmarks — VWAP's original job",
      kind: "industry",
      problem:
        "An institution that buys a large block needs to know what the purchase really cost, including the price it pushed up by buying, not just the commission.",
      applied:
        "Berkowitz, Logue and Noser compared about 14,000 institutional NYSE trades with the day's volume-weighted average price and treated the difference as the market-impact cost. Their abstract reports about 5 basis points of impact against about 18 of commission.",
      evidence:
        "Berkowitz, Logue & Noser (1988), Journal of Finance 43(1):97–112 — abstract read via Semantic Scholar (secondary)",
      impact: "VWAP became a benchmark for execution quality, which is why it appears on trading screens at all",
    },
    {
      system: "TradingView — VWAP, bands and 'up/down volume'",
      kind: "industry",
      problem:
        "Traders see VWAP, deviation bands and green/red volume on the same chart and read them as one coherent picture of buying and selling.",
      applied:
        "TradingView's documentation defines VWAP from `hlc3` by default, reset at a chosen anchor, with standard-deviation or percentage bands at three multipliers. Its volume-profile 'up/down volume' splits a bar's volume by whether the bar closed at or above its open — bar direction, not who was aggressive.",
      evidence: "TradingView support: VWAP; Volume Profile basic concepts",
      impact: "Green volume on a profile is not buying pressure in the order-flow sense",
    },
    {
      system: "NinjaTrader 8 — volumetric bars and delta",
      kind: "industry",
      problem:
        "Delta and footprint charts promise to show aggressive buying and selling at every price, which needs to know whether each trade hit the bid or lifted the offer.",
      applied:
        "NinjaTrader's documentation says its volumetric bars classify trades properly only with historical bid/ask tick data, and otherwise fall back to an up-tick/down-tick approximation. Its minute-resolution volume profile spreads each bar's volume evenly across the bar's range — also an approximation.",
      evidence: "NinjaTrader 8 help: Order Flow Volumetric Bars; Order Flow Volume Profile",
      impact: "The same chart type can mean very different things depending on the data underneath",
    },
    {
      system: "Your strategy builder — profile inputs, not VWAP inputs",
      kind: "yours",
      problem:
        "Your rule inputs (zone, open zone, session range) all compare today's prices with the previous session's VAH and VAL. A natural next step is to add a VWAP or open-interest condition alongside them.",
      applied:
        "A VWAP input would be a different kind of input: computed from today's bars so far, not from yesterday's final levels. Combined with zone it partly double-counts, because both come from the same NIFTY futures volume. An open-interest input, if your data is TradingView's, would be daily-only for Indian futures, so it could describe yesterday, not the current bar.",
      impact: "Know what each new input measures, and on what data, before it enters a rule",
    },
  ],
  insights: [
    {
      t: "VWAP is a mean; the POC is a mode",
      d: "On a two-hump day the mean falls between the humps. On the synthetic 1 Oct, VWAP closes at 22,329.88 in the thin waist while the POC is 22,447.5.",
    },
    {
      t: "Deviation bands are not a value area",
      d: "VWAP ± 1 standard deviation holds 68% of volume only for a bell curve. On the synthetic 1 Oct it holds about 44% and misses the POC.",
    },
    {
      t: "An anchor must be knowable at the time",
      d: "Anchored VWAP is only testable when a rule a computer can evaluate in real time chooses the anchor. A swing low picked with hindsight is look-ahead.",
    },
    {
      t: "Delta needs the aggressor side; one-minute bars do not have it",
      d: "Delta and footprints need tick data with bid/ask classification. TradingView's up/down volume is bar direction, and its open interest for Indian futures is daily-only.",
    },
  ],
  pitfalls: [
    "Treating 'held VWAP' and 'held the POC' as two confirmations. Both are built from the same day's trades, so they are not independent.",
    "Reading VWAP as the day's centre of business on a double-distribution day. It is the average, and the average can sit where almost nothing traded.",
    "Assuming ±1 standard-deviation bands hold 68% of the volume. That is a property of the normal distribution, and intraday profiles are rarely normal.",
    "Backtesting an anchored VWAP from hand-picked anchors. If the anchor was chosen by looking at the chart afterwards, the test uses information the strategy never had.",
    "Calling TradingView's green and red profile volume 'buying' and 'selling'. It splits bars by whether they closed up or down, which is not the same as who crossed the spread.",
  ],
  quiz: [
    {
      q: "This synthetic profile has two humps joined by thin rows. Where would the volume-weighted average price of these rows sit?",
      figure: {
        lo: 22180,
        step: 10,
        bins: [4, 10, 16, 12, 6, 2, 1, 1, 1, 2, 8, 14, 20, 15, 6, 2],
        caption: "Synthetic profile, 10-point rows. Lower hump around 22,200, upper hump around 22,300.",
      },
      options: [
        "At the upper hump's peak, because it is the busiest row",
        "At the lower hump's peak, because the session started there",
        "In the thin rows between the humps",
        "Above the session high, pulled up by the upper hump",
      ],
      answer: 2,
      difficulty: "apply",
      why: "An average of two clusters lands between them. Weighting each row's midpoint by its volume puts the mean at about 22,263, inside rows that hold almost nothing. That is the 1 Oct effect in miniature: the mean is not where the business was.",
      distractors: [
        "That is the POC, the mode. The mean and the mode are different statistics and only coincide on a symmetric single hump.",
        "Where the session started has no bearing on a volume-weighted average; only prices and volumes enter the formula.",
        "",
        "An average of prices can never lie outside the range of those prices.",
      ],
    },
    {
      q: "A trader writes: 'NIFTY futures bounced exactly at VWAP and at the POC — two independent confirmations, so this level is strong.' What is the main problem with that reasoning?",
      options: [
        "VWAP and the POC are computed from the same trades, so agreement between them is not independent evidence",
        "VWAP cannot be computed for futures",
        "The POC is only valid on TPO profiles",
        "Nothing; two indicators agreeing is always stronger evidence",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Both numbers summarise the same day's volume at price — one by its average, one by its busiest row. When they agree, it usually means the profile has one central hump, which is one fact seen twice. Independence would need a different source of information.",
      distractors: [
        "",
        "VWAP works on any traded instrument with volume, including NIFTY futures. It is the index itself that has no volume.",
        "The POC exists on both volume and TPO profiles; this course mostly uses the volume version.",
        "Agreement is stronger only when the two inputs carry different information. Here they do not.",
      ],
    },
    {
      q: "Your broker gives you one-minute OHLCV bars for NIFTY near-month futures and nothing else. Which of these can you compute faithfully from that data?",
      options: [
        "Order-flow delta per price",
        "A footprint chart for each 5-minute bar",
        "Intraday open interest changes",
        "A volume profile and a session VWAP, both as approximations from the bars",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A profile spreads each bar's volume over its range, and VWAP uses a typical price per bar; both are reasonable approximations from OHLCV. Delta and footprints need each trade with its bid/ask side, and open interest is a separate data field the bars do not contain.",
      distractors: [
        "Delta needs to know whether each trade hit the bid or lifted the offer. A one-minute bar only has the total volume.",
        "A footprint is delta at every price inside the bar, so it needs the same tick data with trade direction.",
        "Open interest is not part of an OHLCV bar at all, and on TradingView it is daily-only for Indian futures.",
        "",
      ],
    },
    {
      q: "On a TradingView volume profile, a row is mostly green 'up volume'. What does that tell you?",
      options: [
        "Aggressive buyers lifted the offer at that price",
        "Most of the bars that traded through that row closed at or above their open",
        "Open interest rose at that price",
        "The row is above VWAP",
      ],
      answer: 1,
      difficulty: "apply",
      why: "TradingView's documentation defines up volume by bar direction: a bar whose close is at or above its open counts as up. It says nothing about which side initiated the trades, which is what order-flow delta measures.",
      distractors: [
        "That is order-flow delta, which needs tick data with the aggressor side. Bar direction is a different and much weaker signal.",
        "",
        "Open interest is a separate measure of outstanding contracts and is not part of the profile's colouring.",
        "Colour on the profile has nothing to do with VWAP's position.",
      ],
    },
    {
      q: "A backtest anchors a VWAP at 'the swing low of each pullback' and buys when price returns to it. It reports strong results. What should you check first?",
      options: [
        "Whether the VWAP used `hlc3` or the close",
        "Whether the strategy uses 5-point or 10-point bins",
        "Whether each swing low could have been identified at the time, or only after price had moved away from it",
        "Whether the results were computed on futures or on the ETF",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A swing low is only confirmed after price rises from it. If the backtest placed the anchor at lows identified with hindsight, it used information the strategy could not have had. Shannon himself calls anchor choice the most subjective part; a testable version needs an anchor rule a computer can apply in real time.",
      distractors: [
        "The price source changes the line by a little. Look-ahead in the anchor can change the result completely, so it comes first.",
        "Anchored VWAP has no bins; this confuses it with the profile.",
        "",
        "Worth recording, but it does not decide whether the result could ever be achieved.",
      ],
    },
    {
      q: "On the synthetic 1 Oct session, VWAP at the close is 22,329.88 with a ±1 standard deviation of 110.51 points, so the band runs from about 22,219 to 22,440. The value area is 22,215–22,470 and the POC 22,447.5. What does this show?",
      options: [
        "The band holds about 68% of the volume, as it always does",
        "The band and the value area are the same thing computed two ways",
        "The POC must be wrong, because it lies outside the band",
        "A band centred on the mean need not cover the busiest prices; on this two-hump day it holds only about 44% of the volume",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Bands are symmetric around the mean, and on a two-hump day the mean sits in the waist. The band therefore covers the thin middle and clips both humps. The 68% figure belongs to the normal distribution, which this profile is not.",
      distractors: [
        "68% inside one standard deviation is a property of the bell curve. On this synthetic day the figure is about 44%.",
        "The value area grows outward from the POC; the band is centred on the mean. They coincide only on symmetric single-hump days.",
        "The POC is simply the busiest row. Lying outside a band around a different statistic says nothing against it.",
        "",
      ],
    },
    {
      q: "Where does VWAP come from, according to the research this course relies on?",
      options: [
        "Steidlmayer's Market Profile work at the CBOT",
        "An execution-cost benchmark: Berkowitz, Logue and Noser (1988) measured institutional trades against the day's VWAP",
        "Dalton's Mind Over Markets",
        "NSE's closing-price calculation",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The 1988 paper used the day's volume-weighted average price as the yardstick for what institutional NYSE trades cost (from its abstract). That origin is why execution desks still benchmark against it.",
      distractors: [
        "Steidlmayer's work produced the Market Profile, a time-at-price chart, not VWAP.",
        "",
        "Dalton writes about profiles and auction behaviour; VWAP's origin is in transaction-cost measurement.",
        "News reports describe NSE's derivatives closing price as a volume-weighted average over a late window, but that is a later application, not where the idea came from.",
      ],
    },
    {
      q: "You want a rule: 'buy NIFTY futures when open interest rises over the last 15 minutes while price is above yesterday's VAH.' Your historical data is from TradingView. What is the problem?",
      options: [
        "Open interest cannot rise during the day",
        "Open interest and volume are the same thing",
        "TradingView provides open interest for Indian futures only on daily bars, so the 15-minute condition cannot be computed from that data",
        "VAH cannot be combined with any other input",
      ],
      answer: 2,
      difficulty: "judge",
      why: "TradingView's documentation says its open interest for NSE and MCX futures is daily-only. A 15-minute change needs an intraday OI series, and we could not verify how often NSE itself updates OI intraday. Find a source that provides it and check its update frequency before testing.",
      distractors: [
        "Open interest can rise or fall intraday as positions open and close; the issue is whether your data records it.",
        "Volume counts contracts traded; open interest counts contracts still held. A day can have huge volume and unchanged OI.",
        "",
        "Combining inputs is fine as long as each can be computed at the time; the problem here is the OI data.",
      ],
    },
  ],
};

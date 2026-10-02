import type { Topic } from "../../types.ts";

export const vpAuction: Topic = {
  id: "vp-auction",
  title: "The market as an auction",
  tier: 1,
  depth: "deep",
  summary:
    "Price moves to find the other side; time and volume at a price are the evidence that it was accepted.",
  why: "Every level in a volume profile — POC, VAH, VAL — is a summary of an auction. If you know what the auction idea actually claims, you know what yesterday's levels can tell you and what they cannot. It also stops you reading a single bar beyond a level as 'acceptance', which is the most common mistake in rules built on value areas.",
  viz: ["vp-auction"],
  learn: {
    intuition:
      "Picture a wholesale vegetable mandi early in the morning. A trader with a truck of onions calls a price. If buyers rush in, he raises it; if nobody bites, he lowers it. He is not guessing the 'right' price — he is moving the price to find out where the other side will trade. Once both sides are trading steadily, the price stops moving much and a lot of business gets done in a narrow band. That band is what the day has agreed is fair. A futures market like NIFTY works the same way, except the auction never stops and thousands of participants call prices at once. A volume profile is the record of that search: wide where the market settled and did business, thin where price only passed through looking for someone to trade with. Everything in this module is a way of reading that record.",
    mechanics: [
      {
        heading: "Price advertises: it moves to find the other side",
        body: "When buyers are more eager than sellers, price rises. A higher price is, in effect, an advertisement inviting sellers in. If sellers respond, the rise stalls and trade builds up; if they do not, price keeps going until it finds them. The same works downwards. The Market Profile literature calls this price 'advertising' — we could not trace the phrase to a specific page, so treat it as the community's shorthand rather than a quotation. The point is that a price move is a SEARCH, not a verdict.",
      },
      {
        heading: "Time and volume at a price are the evidence of acceptance",
        body: "A price where the market spends a long time and a lot of contracts change hands is a price both sides were willing to trade at: it was accepted. The CBOT's own Market Profile study guide maps high-volume prices to the value area, which it calls accepted price, and low-volume extremes to excess, which it calls rejected price. In the synthetic double-distribution day in the visualiser, by 11:44 price has rotated between 22,260.30 and 22,330.25 for two and a half hours; at 10-point rows the developing POC is 22,285 and the developing value area 22,260–22,310. Lots of time, lots of volume: accepted, for now.",
      },
      {
        heading: "Rejection: arriving at a price and leaving it fast",
        body: "The opposite of acceptance is a price that is reached and then abandoned quickly on little volume. One side refused to trade there. Dalton writes that such sharp ends to an auction — he calls them excess — occur on light volume and are often followed by a fast move away. On a profile, rejection shows up as thin rows: a tail at the high or low, or a thin waist between two humps where price travelled without stopping. Thin does not mean unimportant. It means price was advertised there and nobody took it up.",
      },
      {
        heading: "Balance, imbalance, and a new balance",
        body: "When both sides broadly agree on value, price rotates inside a range and the profile grows a single fat hump: balance. When one side becomes clearly stronger, price leaves the range and moves directionally, trading little along the way: imbalance. It moves until it finds a new area where the other side will trade, and balance forms again. The synthetic day in the visualiser does exactly this — balance low, a fast move up on thin volume, balance again higher. Its final POC is 22,455 at 10-point rows, and its value area, 22,290–22,480, spans BOTH humps and the thin waist between them. A value area is a band; it does not promise that every price inside it was accepted.",
      },
      {
        heading: "Two kinds of participant: day timeframe and other timeframe",
        body: "Dalton's framework, as summaries of his books describe it, divides participants into the day timeframe — traders who are flat by the close and mostly trade the rotation — and the other timeframe: funds, institutions and positional traders whose larger orders move value from one day to the next. The CBOT tracked a similar split in its own data: its Liquidity Data Bank reports gave each price's volume share for local floor traders and for commercial firms separately. The common reading is that rotation inside the early range is mostly day-timeframe trade, and a move beyond it that keeps attracting volume suggests the other timeframe is active. Treat that as an inference: a profile records WHERE trade happened, never WHO did it.",
      },
    ],
    complexityDerivation:
      "Where it comes from: Peter Steidlmayer, a trader at the Chicago Board of Trade (CBOT), devised the Market Profile. The CBOT launched it publicly with its Liquidity Data Bank in the mid-1980s — secondary sources give 1985, others 1984, and the CBOT's own 1996 study guide refers back to 1984, so the exact date is unsettled. That study guide, which we read, describes a completed balanced day as bell-shaped and maps high-volume prices to accepted value and low-volume extremes to rejected excess. Dalton's Markets in Profile (2007), also read, builds on it: range extension that keeps attracting trade shows strength, and where value sits matters more than where price closes. What it literally claims: this is a way of DESCRIBING a session, not a forecasting rule. Evidence for and against: we found no peer-reviewed study that tests Market Profile or volume-at-price levels. The nearest rigorous work is Osler (2000, Federal Reserve Bank of New York), which found that support and resistance levels published by FX firms stopped price 60.8% of the time against 56.2% for random levels — a small edge, and for price levels, not volume levels. Untested: whether acceptance and rejection, as read off a NIFTY or MCX profile, predict anything about the next session. That is for you to measure, honestly.",
    variants: [
      {
        name: "Steidlmayer's original CBOT framing",
        when: "Reading the source material, or comparing modern platforms with what the method first meant.",
        delta:
          "Time-based: one letter per half-hour at each price, a bell curve as the model of a finished balanced day, four day types (normal, normal variation, trend, neutral), and the Liquidity Data Bank's split of volume by trader category.",
      },
      {
        name: "Dalton's auction market theory",
        when: "Interpreting a day: who was active, whether value moved, what the open says.",
        delta:
          "Adds the day-timeframe versus other-timeframe split, six day types, four opening types and six value-area relationships. Richer vocabulary; every term is still a reading of the profile, not a measurement of who traded.",
      },
      {
        name: "Plain volume-at-price (modern charting)",
        when: "You have bar or tick data and want levels fast, as on TradingView, Sierra Chart or NinjaTrader.",
        delta:
          "Keeps only contracts per price. The time dimension (letters) and the trader categories are gone. Easier to compute and backtest; easier to forget what the numbers are summarising.",
      },
      {
        name: "Order-flow (footprint and delta)",
        when: "You need to know which side was AGGRESSIVE at each price, not just how much traded.",
        delta:
          "Splits each price's volume into trades that hit the bid and trades that lifted the offer. It needs tick data with trade direction; one-minute bars cannot give it.",
      },
    ],
    tradeoffs: [
      {
        vs: "Reading candles (open, high, low, close) alone",
        pick: "The auction view when you care where business was done inside the range",
        because:
          "A candle gives four numbers per bar and says nothing about where inside its range the volume traded. Two days with the same high, low and close can have one fat hump or two humps with a gap, and the auction reading of those days is opposite.",
      },
      {
        vs: "Fixed technical levels (pivots, round numbers)",
        pick: "Profile levels when you want levels built from where volume actually traded; pivots when you need a level before any trading",
        because:
          "A pivot is arithmetic on yesterday's high, low and close and exists before the open. A profile level reflects where the session did its business, but depends on bin size, data source and session times. Neither has peer-reviewed evidence for NIFTY.",
      },
      {
        vs: "Order-flow tools",
        pick: "The volume profile when all you have is one-minute bars",
        because:
          "Order-flow needs tick data with trade direction. A profile built from one-minute bars is an approximation, but it is available for years of NIFTY and MCX history, which is what a backtest needs.",
      },
    ],
  },
  realWorld: [
    {
      system: "CBOT Liquidity Data Bank (1980s)",
      kind: "industry",
      problem:
        "Floor traders could see the price, but not how much traded at each price, by whom, or when during the day.",
      applied:
        "The Liquidity Data Bank report listed, for every price traded in the session: its volume, that volume as a share of the day, the share traded by local floor traders and by commercial firms, and the half-hour periods in which the price traded. Reports came for the day, evening and GLOBEX sessions, or all combined.",
      evidence: "CBOT, A Six-Part Study Guide to Market Profile (1996), Part VI, notes on the LDB report",
      impact:
        "Time and volume at each price, published side by side — plus a split by trader type that today's charting volume profiles do not show at all.",
    },
    {
      system: "NSE F&O pre-open call auction",
      kind: "industry",
      problem:
        "An opening price set by whichever order happens to arrive first at 09:15 can be noisy and easy to push around.",
      applied:
        "Since December 2025 (the go-live date is from news reports; the session itself is on NSE's own page), current-month index and stock futures run a call auction from 09:00 to 09:15: orders are collected, then matched at one price. It is a literal auction that sets the price the continuous auction starts from.",
      evidence: "NSE equity-derivatives pre-open session page; circular NSE/FAOP/71527",
      impact:
        "NIFTY futures now open at an auction-determined price, which matters for any rule that classifies where today opened against yesterday's value.",
    },
    {
      system: "Charting volume profiles (TradingView)",
      kind: "industry",
      problem:
        "Traders want an auction-style view on any symbol without exchange-level trade records.",
      applied:
        "TradingView builds its volume profile from lower-timeframe bars of the same symbol, and colours volume 'up' or 'down' by whether each bar closed at or above its open. That is bar direction, not which side was aggressive.",
      evidence: "TradingView support: Volume Profile indicators — basic concepts",
      impact:
        "Convenient, but the 'up/down' split is easy to misread as buyers versus sellers. The auction view is only as good as the data under it.",
    },
    {
      system: "Your strategy builder's rule inputs",
      kind: "yours",
      problem:
        "Open zone, zone and session range are written as price comparisons against yesterday's VAH and VAL, which makes it easy to read them as signals rather than as questions about the auction.",
      applied:
        "Read each as an auction question. Open zone: did today start inside yesterday's accepted range or outside it? Zone: is THIS bar closing at a price the market accepted yesterday? Session range: has today's auction explored beyond yesterday's value on one side, both, or neither? A single bar closing above VAH is price advertising above value; acceptance needs time and volume there.",
      evidence: "Rule inputs as described in docs/trading/writing-brief.md",
      impact:
        "Turns each rule into a hypothesis you can test — 'after price is accepted above value, X follows' — instead of a label you trust.",
    },
  ],
  insights: [
    {
      t: "A price move is a search, not a verdict",
      d: "Price rises to find sellers and falls to find buyers. Where it stops and trades heavily is where the search succeeded. A fast move through a level tells you the other side was not there.",
    },
    {
      t: "Acceptance needs time and volume",
      d: "One bar beyond a level is an advertisement. Several periods trading there on real volume is acceptance. Rules that fire on a single close beyond VAH are testing the first, not the second.",
    },
    {
      t: "Balance, imbalance, new balance",
      d: "Rotation in a range builds a fat hump; a directional move on thin volume leaves a thin waist; a new range builds a new hump. The profile of such a day has two humps, and its value area can span the waist.",
    },
    {
      t: "A profile shows where, never who",
      d: "Day-timeframe and other-timeframe participants are Dalton's interpretation of what the shape implies. The data itself has no names attached — the CBOT once published trader categories; modern profiles do not.",
    },
  ],
  pitfalls: [
    "Treating one close beyond VAH or VAL as acceptance. Acceptance is a matter of time and volume at the new prices, not a single bar.",
    "Reading every price inside the value area as accepted. On a two-hump day the value area can include a thin waist that price only passed through.",
    "Calling the auction framework 'proven'. It is a well-documented way of describing a session; we found no peer-reviewed test of its levels.",
    "Naming the participants as if the data showed them. 'Institutions were buying' is an inference from the shape, not something a volume profile records.",
    "Forgetting the session clock. 'Spent two hours there' depends on which hours you count; NSE derivatives now close at 15:40 per NSE's timings page, while this course's synthetic sessions run 09:15–15:30.",
  ],
  quiz: [
    {
      q: "In auction terms, what does it mean when price rotates for two hours inside a 70-point range with heavy volume?",
      options: [
        "Rejection — the market refused those prices",
        "Imbalance — one side is in control",
        "Acceptance and balance — both sides are willing to trade there, for now",
        "Excess — the auction in that direction has finished",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Time plus volume at a range of prices is the definition of acceptance, and rotation inside a range is balance. It is 'for now' because balance can break when one side becomes stronger.",
      distractors: [
        "Rejection is the opposite: price arrives and leaves quickly on little volume.",
        "Imbalance is a directional move; rotation back and forth is the sign that neither side is in control.",
        "",
        "Excess is a sharp, thin END to a move. Two hours of heavy rotation is the fattest part of a profile, not its edge.",
      ],
    },
    {
      q: "This illustrative profile (10-point rows) comes from one session. Where was price advertised but NOT accepted?",
      figure: {
        lo: 22200,
        step: 10,
        bins: [2, 6, 12, 9, 3, 1, 1, 2, 8, 14, 10, 4],
        caption: "Illustrative profile, 10-point rows",
      },
      options: [
        "22,220–22,230, the biggest row in the lower hump",
        "22,250–22,270, the two thin rows between the humps",
        "22,290–22,300, the POC",
        "Nowhere — every price the market traded was accepted",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The two rows with volume 1 sit between two humps. Price travelled through them and traded almost nothing there — the thin waist of a two-hump day. That is advertising that found no takers.",
      distractors: [
        "That is the peak of the lower hump: lots of volume, so lots of acceptance.",
        "",
        "The POC is the single most accepted row, the opposite of what is asked.",
        "Trading at a price is not the same as accepting it. Acceptance needs time and volume, and these rows had almost none.",
      ],
    },
    {
      q: "NIFTY futures close one 1-minute bar above yesterday's VAH, then the next bar closes back inside value. Your 'zone' input reads 'above' for exactly one bar. In auction terms, what has happened?",
      options: [
        "Acceptance above value — the breakout is confirmed",
        "A probe above value that found no follow-through; not evidence of acceptance",
        "Rejection of yesterday's value area as a whole",
        "Nothing meaningful — a zone input cannot be read in auction terms",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Acceptance needs time and volume at the new prices. A single bar above VAH that is immediately undone is price advertising above value and not finding enough business to stay there. It is weak evidence either way, which is exactly why a rule firing on that one bar needs testing.",
      distractors: [
        "One close is the minimum the zone input can register, not a sign of acceptance. Confirmation needs time spent there.",
        "",
        "Returning INSIDE value is the opposite of rejecting it; if anything, yesterday's value is still holding.",
        "The zone input is exactly an auction question — is price trading at levels yesterday accepted? It just answers it one bar at a time.",
      ],
    },
    {
      q: "On the course's synthetic double-distribution day, the final 10-point value area is 22,290–22,480 and contains a thin waist between two humps. Which statement is correct?",
      options: [
        "Every price between 22,290 and 22,480 was accepted, because it is inside the value area",
        "The value-area calculation must be wrong, because a value area cannot contain thin rows",
        "The waist is the most important acceptance zone of the day",
        "The value area is a 70% volume band; it can include prices that price only passed through",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The value area is grown outwards from the POC until it holds 70% of the volume. On a two-hump day it can only reach the second hump by passing over the waist, so the waist ends up inside. Being inside the band does not make those prices accepted.",
      distractors: [
        "This treats the band as a list of accepted prices. It is a volume total, and the waist contributed almost nothing to it.",
        "Nothing in the rule stops it adding thin rows; on a two-hump day it has to.",
        "The waist is where the market did the LEAST business between the humps — the opposite of acceptance.",
        "",
      ],
    },
    {
      q: "A website says Market Profile 'has been scientifically proven by decades of CBOT research'. What does the evidence in this course actually support?",
      options: [
        "It is a description framework from the CBOT in the 1980s, documented in the CBOT study guide and Dalton's books; we found no peer-reviewed test of its levels",
        "The claim is right — the CBOT's study guide reports statistical tests of value-area levels",
        "Market Profile has been tested and shown not to work",
        "It was invented at the Chicago Mercantile Exchange, so CBOT research is irrelevant",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The CBOT guide explains the method and its bell-curve model, but it contains no statistical test of whether value-area levels predict anything. We also found no peer-reviewed study. 'Untested' is not the same as 'shown not to work' — it means you have to measure it yourself.",
      distractors: [
        "",
        "The guide is a teaching manual. Its volume splits per day type are illustrative, not measured statistics.",
        "Absence of tests is not evidence of failure. The honest position is 'untested', which is different.",
        "Steidlmayer was at the CBOT. At least one trading website credits the CME, which is simply wrong.",
      ],
    },
    {
      q: "The first hour sets a range. In the afternoon price extends above it and keeps trading there on heavy volume until the close. What is Dalton's reading, and what is its limit?",
      options: [
        "Day-timeframe traders pushed price up; the profile proves it",
        "The extension was rejected, because it happened late in the day",
        "Other-timeframe buying is the likely driver of range extension that is accepted — but the profile cannot show who actually traded",
        "Nothing can be said; afternoon volume is always noise",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Dalton writes that upward extension which keeps attracting buying shows real buying strength, and the common reading attributes it to larger, slower participants. That is an interpretation of the shape. The profile records where trade happened, not who did it.",
      distractors: [
        "Dalton's framework attributes rotation inside the early range to day-timeframe traders, and extension to the other timeframe. And 'proves' overstates what any profile can show.",
        "Rejection means leaving quickly on little volume. Heavy volume held until the close is the opposite.",
        "",
        "Volume in the afternoon is as real as volume in the morning; the U-shape of intraday volume is exactly why the close is heavy.",
      ],
    },
    {
      q: "Who devised the Market Profile, and where?",
      options: [
        "James Dalton, at Dalton Capital Management",
        "Peter Steidlmayer, at the Chicago Mercantile Exchange",
        "The National Stock Exchange of India, for NIFTY",
        "Peter Steidlmayer, at the Chicago Board of Trade",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Steidlmayer was a CBOT trader; the CBOT launched the Market Profile with its Liquidity Data Bank in the mid-1980s. Dalton's books came later and extended the framework.",
      distractors: [
        "Dalton is the best-known later author, and credits Steidlmayer with ideas such as the four opening types.",
        "A real error found on at least one trading website. The CME is a different Chicago exchange.",
        "NSE does not publish Market Profiles; platforms compute them from NSE data.",
        "",
      ],
    },
    {
      q: "Today NIFTY futures open below yesterday's VAL, so your 'open zone' reads 'below'. Which description fits the auction view best at 09:15?",
      options: [
        "Price is advertising below yesterday's value; whether it is accepted there, or returns into value, is not yet known",
        "Sellers are in control for the day",
        "Yesterday's value area is now irrelevant",
        "The open is a rejection of lower prices",
      ],
      answer: 0,
      difficulty: "judge",
      why: "An open is a single price. Acceptance or rejection only shows up as time and volume build — either the market does business down there, or it returns into yesterday's value. The open zone tells you where the question starts, not how it ends.",
      distractors: [
        "",
        "One opening price says nothing about who controls the day. Dalton's opening types need the first periods of trade to classify.",
        "Yesterday's value is exactly the reference the open is being compared with; whether price returns to it is the interesting question.",
        "Rejection of lower prices would need price to leave them quickly. At 09:15 it has only just arrived.",
      ],
    },
  ],
};

import type { Topic } from "../../types.ts";

export const vpTpoVsVolume: Topic = {
  id: "vp-tpo-vs-volume",
  title: "Market Profile versus Volume Profile",
  tier: 1,
  depth: "deep",
  summary:
    "Market Profile counts time at each price; Volume Profile counts contracts. They agree on calm days and part ways when volume per minute changes.",
  why: "Charting platforms show both, often with the same POC/VAH/VAL labels, and the numbers can differ by tens of points on the same day. If you compare your strategy builder's levels with a chart and they disagree, the first question is which of the two each one is. For NIFTY there is a second reason: the index itself has no volume, so the choice of profile also decides which instrument you must use.",
  viz: ["vp-tpo-vs-volume"],
  learn: {
    intuition:
      "Imagine two ways of describing where people spent their time at a railway station. One counts how many half-hour slots each platform was occupied in. The other counts how many tickets were sold at each platform. On an ordinary day they tell much the same story. But if a crowd of thousands boards one train on platform 5 in twenty minutes, while a handful of people wait all afternoon on platform 2, the two descriptions point at different platforms — and both are accurate. Market Profile is the first count: one letter for every 30-minute period that traded at a price. Volume Profile is the second: contracts traded at each price. When a slow, thin morning sits at one level and a heavy burst happens at another, they disagree, and the disagreement itself tells you something about the day.",
    mechanics: [
      {
        heading: "A TPO profile counts periods, not contracts",
        body: "Split the session into 30-minute periods and give each a letter. On NSE, A is 09:15–09:45, B is 09:45–10:15, and so on. For every period, print its letter at every price row it traded in. A row's count of letters is the number of periods that visited it — one TPO (time price opportunity) per period. A price touched once inside a period counts the same as one traded all thirty minutes, and one contract counts the same as ten thousand. The row with the most letters is the TPO POC.",
      },
      {
        heading: "A volume profile counts contracts at each price",
        body: "Add every traded contract to the row of the price it traded at — exactly, from tick data, or approximately, by spreading each one-minute bar's volume over its range (the next lesson). The row with the most contracts is the volume POC. Nothing about time survives: a price that traded heavily for ten minutes and one that traded the same total steadily for three hours look identical.",
      },
      {
        heading: "Why they disagree: volume per minute is not constant",
        body: "Intraday volume is lumpy: heavy at the open and the close, thin at lunch, and spiking on news. In the synthetic day in the visualiser, the morning crawls around one level on thin volume, then an afternoon burst between 13:00 and 14:07 trades about 43% of the day's contracts. At 10-point rows the TPO POC is 22,385 and the volume POC 22,455, 70 points apart; the TPO value area is 22,360–22,450 and the volume value area 22,410–22,480. Neither is wrong. Time asks where the market was willing to spend the day; volume asks where the business was done. Dalton's own worked example in Markets in Profile shows the same thing: 78 TPOs, a TPO value area of 99-21 to 99-28, and a volume value area of 99-20 to 99-30 for the same day (prices quoted in 32nds of a point).",
      },
      {
        heading: "No volume, no volume profile: indices versus traded instruments",
        body: "NIFTY 50 is a computed number — a free-float market-cap weighted average of 50 stocks — and nobody trades the index itself, so it has no volume of its own. A TPO profile needs only prices and a clock, so you CAN build one on NIFTY spot. A volume profile needs a traded instrument: the NIFTY near-month future (which rolls to a new contract every month), or an index ETF such as NIFTYBEES (smaller, on a different price scale). Some data vendors show a 'volume' for an index, for example summed constituent volume; check what yours shows before you build anything on it.",
      },
      {
        heading: "The clock matters: letter boundaries must match the session",
        body: "TPO counts depend on where the periods start. With A at 09:15 and a 09:15–15:30 session (this course's convention), there are 13 periods, A to M, and M is only 15 minutes long. NSE's timings page now shows equity derivatives closing at 15:40 (reportedly from 3 Aug 2026), which makes M 25 minutes for futures. Platforms can anchor periods elsewhere: NinjaTrader 8's documentation says its TPO letter A starts at 08:00 CST. That is 19:30 IST, so — our analysis — its periods would fall on the hour and half-hour in IST, and NSE's 09:15 open would land in the middle of a period. Check whether the anchor can be changed before you trust a TPO count from a platform built for Chicago hours.",
      },
    ],
    complexityDerivation:
      "Where it comes from: Steidlmayer's Market Profile, as the CBOT taught it, was built from time — letters per half-hour period at each price. The CBOT's Liquidity Data Bank then published volume at each price alongside the half-hour periods in which each price traded, so both views existed side by side from the start (CBOT study guide, Part VI, which we read). Dalton's Markets in Profile (2007) defines the value area on TPOs and, in its own worked example, reports a different volume value area for the same day; his Mind Over Markets has an appendix titled 'TPO versus Volume Profiles' (we read its table of contents, not the appendix). Sierra Chart's documentation says its TPO and volume value areas differ by default unless a setting makes the TPO chart use volume. What it literally claims: two different measurements of acceptance. Evidence for and against: we found no study comparing whether TPO levels or volume levels are more useful for anything. The differences are mechanical — they come from lumpy volume per minute, letter length and session anchoring. Untested: which of the two, if either, gives NIFTY levels that matter the next day.",
    variants: [
      {
        name: "Classic 30-minute TPO profile",
        when: "You want time at price, or the instrument has no volume (NIFTY spot).",
        delta:
          "One letter per 30-minute period, A starting at the session open. Single prints, tails and the initial balance all come from this view.",
      },
      {
        name: "TPO with a shorter letter length",
        when: "You want more resolution in time, for example on a short MCX sub-session.",
        delta:
          "More, shorter periods give more letters per row. Sierra Chart's documentation lists a bar timeframe that does not divide evenly into the letter length among the reasons two users' values differ.",
      },
      {
        name: "Volume profile from one-minute bars",
        when: "Multi-year backtests on NIFTY futures or MCX contracts, where tick history is impractical.",
        delta:
          "Contracts per price, approximated by spreading each bar's volume over its range. This is how the course and your worked example are built.",
      },
      {
        name: "TPO chart with a volume-based value area",
        when: "You like the letter display but want levels that match a volume profile.",
        delta:
          "Sierra Chart offers 'Value Area Highlight Based on Volume' on its TPO charts. The letters still count time; only the shaded value area switches to volume.",
      },
    ],
    tradeoffs: [
      {
        vs: "Volume profile on NIFTY spot",
        pick: "A TPO profile, or a volume profile on the near-month future",
        because:
          "The index has no traded volume of its own. Any 'volume' on a spot chart is something a vendor constructed, and you would need to know exactly what before using it.",
      },
      {
        vs: "TPO levels for your strategy builder",
        pick: "Volume levels on the near-month future, to match what your platform already computes",
        because:
          "Your 1 Oct worked example (POC 22,447.5, VAH 22,470, VAL 22,215) is a volume profile on the NIFTY near-month future at 5-point rows. Mixing in TPO levels would change the rules' meaning without anyone noticing.",
      },
      {
        vs: "A platform's built-in TPO chart",
        pick: "Your own letters when the platform's period anchor cannot be set to 09:15 IST",
        because:
          "A letter grid offset by 15 minutes shifts every period, changes the initial balance and moves single prints. Building letters yourself from one-minute bars is a few lines of code and removes the doubt.",
      },
    ],
  },
  realWorld: [
    {
      system: "CBOT Liquidity Data Bank report",
      kind: "industry",
      problem:
        "A time-based profile shows where the market spent its day but not how much business was done there.",
      applied:
        "The LDB report listed volume and its share for every price traded, plus the half-hour brackets in which each price traded — time and volume in one table. It also noted that reported volume was generally double the contract count, because buy and sell sides were counted separately.",
      evidence: "CBOT, A Six-Part Study Guide to Market Profile (1996), Part VI, LDB report notes",
      impact:
        "A reminder that 'volume' needs a definition too: counting both sides doubles every number without changing the shape.",
    },
    {
      system: "Sierra Chart: separate TPO and volume value areas",
      kind: "industry",
      problem:
        "Users see one set of levels on a TPO chart and another on a Volume by Price study and assume one is a bug.",
      applied:
        "Sierra Chart has separate inputs, 'TPO Value Area %' and 'Volume Value Area %', both 70% by default, and documents that the two value areas differ unless the TPO chart's value area is set to use volume.",
      evidence: "Sierra Chart documentation: TPO Profile Charts; Volume by Price",
      impact: "Two different correct answers, not one right and one wrong.",
    },
    {
      system: "NinjaTrader 8 TPO period anchor",
      kind: "industry",
      problem:
        "A TPO chart designed around US sessions applied to an NSE instrument.",
      applied:
        "NinjaTrader's Order Flow+ documentation says its price (TPO) profile uses fixed 30-minute windows with letter A starting at 08:00 CST. For an NSE session starting at 09:15 IST, that grid would not line up with the open unless the anchor can be changed (our analysis).",
      evidence: "NinjaTrader 8 help guide: Order Flow Volume Profile",
      impact:
        "Initial balance, single prints and period counts could all be shifted by 15 minutes without any visible warning.",
    },
    {
      system: "Your strategy builder's previous-session levels",
      kind: "yours",
      problem:
        "Your POC/VAH/VAL inputs come from a volume profile of the NIFTY near-month future. A chart you check them against might be a TPO profile, or built on NIFTY spot.",
      applied:
        "Before comparing, confirm three things on the chart: TPO or volume, which instrument (future, spot or ETF), and which session hours. Futures also trade at a different price from spot, so even a TPO profile of the future and of spot will not share levels.",
      evidence: "Worked example in docs/trading/writing-brief.md",
      impact:
        "Most 'my levels do not match the chart' puzzles end at one of these three questions.",
    },
  ],
  insights: [
    {
      t: "Time and volume answer different questions",
      d: "TPO counts how many 30-minute periods visited a price; volume counts how many contracts traded there. A thin, slow morning and a heavy, short burst split them apart.",
    },
    {
      t: "When they disagree, the disagreement is information",
      d: "A TPO POC far from the volume POC says the market lingered in one place but did its business in another. Dalton's own worked example shows the two value areas differ on the same day.",
    },
    {
      t: "NIFTY spot has no volume",
      d: "An index is computed, not traded. TPO works on spot; a volume profile needs the near-month future or an ETF, each with its own quirks.",
    },
    {
      t: "Letters depend on the clock",
      d: "A starts at 09:15 on NSE. A platform that anchors periods to Chicago time, as NinjaTrader documents for its TPO profile, can shift every letter.",
    },
  ],
  pitfalls: [
    "Comparing a TPO value area with a volume value area and calling the difference an error. They measure different things.",
    "Building a 'volume profile' on NIFTY spot without knowing what volume your vendor attached to the index.",
    "Trusting a platform's TPO letters without checking where period A starts. A 15-minute offset changes the initial balance and every single print.",
    "Forgetting the short last period. With a 15:30 close, M is 15 minutes; with the 15:40 derivatives close it is 25 minutes, so it tends to collect fewer prices than a full period.",
    "Mixing TPO and volume levels across a backtest. A rule tuned on one does not automatically mean the same thing on the other.",
  ],
  quiz: [
    {
      q: "On a TPO profile of NIFTY futures, what does one letter 'C' at the 22,300–22,310 row mean?",
      options: [
        "Exactly one contract traded at that price in period C",
        "Price traded somewhere in that row at least once during period C (10:15–10:45)",
        "Period C's close was in that row",
        "Volume in that row during period C was above average",
      ],
      answer: 1,
      difficulty: "recall",
      why: "One TPO means one period visited that price row. With A at 09:15, C is the third period, 10:15–10:45. How much traded there, and for how long, is not recorded.",
      distractors: [
        "TPOs do not count contracts at all — one contract and ten thousand look the same.",
        "",
        "Every price the period traded gets the letter, not just the closing price.",
        "A letter carries no volume information, which is the whole difference from a volume profile.",
      ],
    },
    {
      q: "This is the volume profile (hundreds of contracts, 10-point rows) of the synthetic day in the visualiser. The TPO POC is marked at 22,385. What best explains the 70-point gap between it and the volume POC?",
      figure: {
        lo: 22340,
        step: 10,
        bins: [23, 451, 247, 311, 210, 235, 131, 33, 38, 476, 1001, 1572, 742, 110],
        showValueArea: true,
        lines: [{ price: 22385, label: "TPO POC" }],
        caption: "Synthetic day; volume in hundreds of contracts",
      },
      options: [
        "A calculation error: the two POCs should match",
        "The volume profile used the wrong bin size",
        "The market spent many slow, thin periods near 22,385, but a short heavy burst traded far more contracts near 22,455",
        "The TPO POC is always lower than the volume POC",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Many periods visited the 22,380s on little volume, so that row collects the most letters. The afternoon burst traded about 43% of the day's contracts in roughly an hour higher up, so the volume POC sits there. Both are correct answers to different questions.",
      distractors: [
        "They only match when volume per period is roughly even. Here it is not.",
        "Both POCs in the visualiser use the same 10-point rows; the gap comes from what is counted, not from the grid.",
        "",
        "There is no fixed order. On another day the burst could be below the slow drift.",
      ],
    },
    {
      q: "You want a profile of NIFTY 50 itself (spot), not the futures. Which is possible without inventing data?",
      options: [
        "Only a volume profile, from the index's own traded volume",
        "Both — the index has its own volume",
        "Neither — profiles need futures",
        "A TPO profile, since it needs only prices and time",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The index is a computed number with no traded volume of its own. Letters per period need only the price path, so a TPO profile works. A volume profile needs a traded instrument such as the near-month future or an ETF.",
      distractors: [
        "Nobody trades the index itself, so it has no traded volume. A vendor 'volume' on it is constructed, if present at all.",
        "Same problem: the index has prices but no trades of its own.",
        "TPO profiles need no volume, so spot is fine for them.",
        "",
      ],
    },
    {
      q: "Here are the TPO counts (letters per row) for the same synthetic day, with the course's value-area rule applied to them. The volume value area that day was 22,410–22,480. A rule says 'buy at yesterday's VAL'. What is the honest problem?",
      figure: {
        lo: 22340,
        step: 10,
        bins: [2, 2, 3, 6, 8, 5, 5, 3, 3, 4, 6, 6, 4, 1],
        showValueArea: true,
        caption: "Synthetic day; letters per 10-point row",
      },
      options: [
        "There is no problem; VAL is VAL",
        "The rule does not say which VAL: the TPO VAL (22,360) and the volume VAL (22,410) are 50 points apart",
        "The TPO value area is wrong because it is wider",
        "VAL only exists on volume profiles",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The same rule fires at different prices depending on which profile defines VAL. A backtest that does not state it cannot be reproduced, and a live system using the other one will trade a different strategy.",
      distractors: [
        "VAL is a definition applied to a profile, and here there are two profiles giving two answers.",
        "",
        "A wider value area is not wrong; it reflects the slow morning drift that time counts and volume barely notices.",
        "Dalton's own definition of the value area is on TPOs. Both kinds have one.",
      ],
    },
    {
      q: "Your TPO chart on a platform anchored to Chicago time starts its periods at 09:00 and 09:30 IST. NSE opens at 09:15. What breaks first?",
      options: [
        "Nothing — letters are cosmetic",
        "Only the colour of the letters",
        "The volume POC",
        "The first period holds only 15 minutes of trade, so the initial balance and every later period boundary are shifted",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Every TPO-derived idea — initial balance, single prints, period counts — depends on period boundaries. Shifting them by 15 minutes changes which prices each letter covers. A volume profile ignores letters, so it is unaffected.",
      distractors: [
        "Letters ARE the data in a TPO profile; their boundaries decide every count.",
        "Display is the least of it; the counts themselves change.",
        "A volume profile has no periods, so a TPO anchor cannot change it.",
        "",
      ],
    },
    {
      q: "On which kind of day would you expect the TPO POC and the volume POC to be closest?",
      options: [
        "A quiet balanced day with fairly even volume through the session",
        "A day with a large news spike in the last hour",
        "An expiry day with a heavy final hour",
        "A day with a slow drift in the morning and a burst after lunch",
      ],
      answer: 0,
      difficulty: "apply",
      why: "When each period trades roughly the same volume, counting periods and counting contracts weight prices almost the same way. Anything that makes volume per minute lumpy pulls them apart.",
      distractors: [
        "",
        "A late spike adds a lot of volume in few periods — exactly what separates the two counts.",
        "A heavy final hour piles volume into one or two letters' worth of time.",
        "That is the visualiser's day, built to make them disagree.",
      ],
    },
    {
      q: "A colleague says: 'Dalton proved volume profiles are better than TPO profiles.' What does the evidence in this course support?",
      options: [
        "Correct — Markets in Profile shows the volume value area is more accurate",
        "Dalton shows the two value areas differ on the same day; we found no study showing either is more useful",
        "Correct — the CBOT abandoned TPO for volume in the 1990s",
        "Wrong — Dalton proved TPO profiles are better",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Dalton's worked example reports a TPO value area of 99-21 to 99-28 and a volume value area of 99-20 to 99-30 for the same day. That shows they differ, not that one wins. We found no comparison of their usefulness.",
      distractors: [
        "The example shows a difference, with no claim that one is 'accurate' and the other not.",
        "",
        "The CBOT's own LDB published both side by side; nothing in our sources says one replaced the other.",
        "No source we read makes this claim either; it is the same mistake in the other direction.",
      ],
    },
    {
      q: "Under the course's 09:15–15:30 convention, how many TPO periods does an NSE session have, and what is odd about the last one?",
      options: [
        "12 periods, all 30 minutes",
        "13 periods; the first one is 15 minutes",
        "13 periods, A to M; M is only 15 minutes",
        "14 periods, because of the pre-open",
      ],
      answer: 2,
      difficulty: "recall",
      why: "375 minutes is 12.5 half-hours, so there are 13 letters and M covers 15:15–15:30. With the 15:40 derivatives close on NSE's timings page, M would be 25 minutes for futures — check what your data uses.",
      distractors: [
        "12 full periods would end at 15:15, leaving 15 minutes uncounted.",
        "With A anchored at 09:15 the first period is full; it is the last one that is short.",
        "",
        "The pre-open call auction is not part of the continuous session that TPO periods divide.",
      ],
    },
  ],
};

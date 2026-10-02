import type { Topic } from "../../types.ts";
import { LAB_ZONES } from "../labs.ts";

/*
 * Synthetic numbers: 30 Sep / 1 Oct from NIFTY_SEP30 / NIFTY_OCT1, the week
 * of 7–11 Sep from WEEK, all at 5-point rows via src/engine/trading/profile.ts.
 * Quiz figures were checked against `levels()` with the course rules.
 * Evidence labels follow docs/trading/sources.md §B, §E.
 */
export const vpReferences: Topic = {
  id: "vp-references",
  title: "Yesterday's levels as today's references",
  tier: 1,
  depth: "deep",
  summary:
    "Yesterday's POC, VAH and VAL as lines on today's chart: what traders say they do, the edge convention behind 'zone', and how little of it has been tested.",
  why: "Most profile rules, including the inputs in your own strategy builder, never look at today's profile. They compare today's price with yesterday's three numbers. So it matters what those lines are claimed to do, which of those claims has any evidence, and exactly how a price is sorted into above, inside or below. Get the last part wrong and a backtest and a live system can disagree about the same bar.",
  viz: ["vp-naked-poc", "vp-rule-inputs"],
  learn: {
    intuition:
      "Yesterday's value area is a record of where yesterday's business was done. Today it becomes a set of reference lines. The usual reading goes like this. Yesterday's POC was the price both sides liked best, so price coming back to it tends to slow down there — the 'magnet'. If price crosses VAH or VAL and spends time and volume beyond it, the market is accepting a new range; if it pokes through and comes straight back, it is rejecting it. And a POC that no later session has traded through is 'naked', and is said to pull price back to it. These are stories about the market remembering prices. They are plausible: many traders draw these lines and place orders near them. Whether price actually behaves differently at these lines than at any other line the same distance away is a separate question. The closest real evidence is about currency support and resistance levels, not volume profiles.",
    mechanics: [
      {
        heading: "Three lines carried forward from yesterday",
        body: "After yesterday's close, its profile is final, and so are its POC, VAH and VAL. Draw them on today's chart and they stay fixed all day. Because they were known before today began, using them in a rule never looks ahead. In the course's synthetic data, 30 Sep's levels are VAL 22,290, POC 22,312.5 and VAH 22,335 (5-point rows). 1 Oct is measured against them all day.",
      },
      {
        heading: "Zone: where a price sits against those lines",
        body: "This course's `zoneOf` says a price is above if it is strictly greater than VAH, below if strictly less than VAL, and inside otherwise. So the edges count as inside: a close exactly at VAH has not left value. That is a convention, not a law, and platforms may differ. 'Zone' applies it to each bar's close; 'open zone' applies it once, to today's first open. 1 Oct (synthetic) opens at 22,290 — exactly on 30 Sep's VAL — so its open zone is inside here, and would be 'below' on a platform that treats the edge as outside. Its first one-minute bar closes inside at 22,291.45; by 09:19 a bar closes below, at 22,285.20. Over the whole day, 13 of the 375 one-minute closes are inside, 195 below and 167 above.",
      },
      {
        heading: "Magnet, acceptance, rejection: what is claimed",
        body: "'Yesterday's POC acts as a magnet' is commonly repeated, but we could not find a source that tests it. Acceptance and rejection come from auction market theory: time and volume beyond a line mean the new prices are accepted, while a quick return on thin volume means they were rejected. Dalton writes in Markets in Profile, discussing open-auction days, that when a market opens outside the prior range and quickly returns into the prior value area, the odds favour continuing to the opposite end of that range. That is his reading from experience, not a measured rate. None of these readings says how long 'spends time' is, so a rule built on them has to choose a number.",
      },
      {
        heading: "Naked POCs",
        body: "A naked POC is an earlier session's POC that no later bar has traded through — no later bar's low-to-high range contains it. Charting tools draw it as a line extended to the right until that happens: Emberwick, the chart library this site uses, has an `extendPoc` option that does exactly this, and NinjaTrader documents a similar naked-POC extension. In the synthetic week of 7–11 Sep 2026, 7 Sep's POC (22,287.5) is never traded through again that week. 8 Sep's POC (22,352.5) stays naked through 9 and 10 Sep and is traded through on 11 Sep. 9 Sep's POC (22,427.5) is traded through the very next day.",
      },
      {
        heading: "How to test a magnet claim",
        body: "Counting how often price returns to yesterday's POC proves nothing on its own, because price returns to most nearby prices. You need a baseline. For each day, measure the distance from today's open to the level. Then take several made-up levels at the same distance from the open, on a randomly chosen side, and count how often each is touched over the same window, or how often price reverses there by a fixed rule decided in advance. The edge is the difference between the real level's rate and the made-up levels' rate. This is the design Osler used for currency levels, and it is why her result reads 60.8% against 56.2%, not just 60.8%.",
      },
    ],
    complexityDerivation:
      "Where the ideas come from: auction market theory (Steidlmayer, Dalton). The POC-as-magnet idea, and the idea that naked POCs get revisited, are repeated by traders and on platforms, but we found no published source that tests either. A statistic sometimes credited to Dalton — 'price returns to the prior POC 80% of the time' — and a '2020 study of 2,500 ES sessions, 65%' both appear on aggregator pages with no traceable source. They may be invented; do not use them. The nearest real evidence is Osler (2000), in the New York Fed's Economic Policy Review. She took support and resistance levels published daily by six currency firms, January 1996 to March 1998, for the US dollar against the mark, yen and pound, and tested them against randomly chosen levels using a bootstrap (resampling to build what chance alone would produce). Rates bounced at the published levels 60.8% of the time, against 56.2% at the random ones. All 16 firm-and-currency pairs beat the random levels, 13 of them significantly at the 5% level, and the effect lasted at least five business days. The firms' own 'strength' ratings for their levels were worthless. Note the limits: these are price levels in currencies, not volume levels; the edge is under five percentage points; profit was not tested. Untested: whether volume-profile levels on NIFTY or MCX do any better than random levels the same distance away.",
    variants: [
      {
        name: "Yesterday's POC as a target",
        when: "Price is inside yesterday's value and some way from its POC.",
        delta:
          "The magnet reading. Easy to code — touch or not by a set time — and untested in published work. Test it against made-up levels at the same distance before trusting it.",
      },
      {
        name: "VAH and VAL as acceptance or rejection lines",
        when: "Price crosses an edge of yesterday's value.",
        delta:
          "Acceptance means time and volume beyond the edge; rejection means a quick return. Neither has a standard length of time, so the rule must fix one, for example two 30-minute closes beyond the edge, as the 80% rule does on the way in.",
      },
      {
        name: "Naked POCs from several sessions back",
        when: "There are older, untested POCs near current price.",
        delta:
          "More lines on the chart. Every extra line raises the chance that price is near SOME line purely by chance, so the baseline matters even more here.",
      },
      {
        name: "Edge convention: inside or outside",
        when: "A price sits exactly on VAH or VAL.",
        delta:
          "This course counts edges as inside. NIFTY futures move in 0.05-point ticks, and levels sit on round row edges, so exact equality really happens — 1 Oct's open is exactly 30 Sep's VAL. Platforms may differ; find out which convention yours uses.",
      },
    ],
    tradeoffs: [
      {
        vs: "Today's developing POC and value area",
        pick: "Yesterday's final levels for rules about the open and the early session",
        because:
          "Yesterday's levels are fixed and known from 09:15. Today's levels keep moving until the close — on 1 Oct the developing POC jumps by 230 points at 14:47 (lesson 13). Developing levels are usable too, but only as they stood at each bar, and they say little early in the day.",
      },
      {
        vs: "Zone on every one-minute bar",
        pick: "Zone on the bar length your rule actually trades",
        because:
          "The same day reads very differently at different bar lengths. On 1 Oct (synthetic), 13 of the 375 one-minute closes are inside 30 Sep's value, 2 of the 75 five-minute closes, and none of the thirty-minute closes. A rule that needs 'a close inside' fires on one-minute bars and never on thirty-minute ones. Choose the bar length in the rule, not by default.",
      },
      {
        vs: "A strict edge (the edge counts as outside)",
        pick: "Whichever your live system uses — written down and copied exactly in the backtest",
        because:
          "Neither convention is more correct. What causes harm is a mismatch: the backtest calls a bar inside and the live system calls it below, and the two disagree on exactly the bars sitting on a level, which are the bars a level-based rule cares most about.",
      },
    ],
  },
  realWorld: [
    {
      system: "Osler (2000): published currency support and resistance",
      kind: "industry",
      problem:
        "Do the support and resistance levels that currency firms publish each morning actually stop prices more often than chance?",
      applied:
        "Six firms' daily levels, January 1996 to March 1998, against intraday dollar–mark, dollar–yen and sterling–dollar rates from 09:00 to 16:00 New York time. Each was compared with randomly placed levels using a bootstrap. Bounces: 60.8% at published levels, 56.2% at random ones. All 16 firm–currency pairs beat random; 13 significantly. Most levels ended in 0 or 5.",
      evidence: "Osler, 'Support for Resistance', FRBNY Economic Policy Review 6(2), 2000",
      impact: "A real but small edge — about 4.6 points over a 56% baseline — for price levels in currencies, not volume levels",
    },
    {
      system: "Naked-POC lines in charting tools",
      kind: "industry",
      problem:
        "Traders want to see which earlier POCs have not yet been traded through.",
      applied:
        "Emberwick's `extendPoc` carries each session's POC to the right until the first later bar whose range contains it. NinjaTrader documents naked POC and value-area extensions in its volume-profile tool. This is a definition of 'naked'. It is not evidence that naked POCs attract price.",
      evidence: "Emberwick README, profiles section; NinjaTrader 8 Order Flow Volume Profile help guide",
      impact: "Easy to see, easy to code, and still untested as a predictor",
    },
    {
      system: "The 'naked POCs are revisited 80% of the time' statistic",
      kind: "industry",
      problem:
        "A precise-sounding figure, often credited to Dalton, circulates on aggregator and education pages.",
      applied:
        "We searched for its source and found none, and the same pages carry another untraceable figure ('a 2020 study of 2,500 ES sessions, 65%'). Price revisits most prices that are close to it, so even an accurate revisit rate would mean little without a random-level baseline at the same distance.",
      evidence: "docs/trading/sources.md §E.1 (unverified, possibly invented)",
      impact: "Do not quote it. Measure your own revisit rate against random levels instead",
    },
    {
      system: "Your strategy builder: previous-session levels, zone and open zone",
      kind: "yours",
      problem:
        "Your builder takes the previous session's POC, VAH and VAL, the zone of each bar's close, and today's open zone. For a backtest to match live trading, both have to sort prices sitting exactly on an edge the same way.",
      applied:
        "This course's `zoneOf` counts the edges as inside, and the lab below makes you write exactly that, including the 1 Oct case: the open at 22,290 sits exactly on 30 Sep's VAL, so the open zone is inside. Whatever your builder does at the edge, use the same comparison — `>` or `>=` — in the backtest. A magnet test of yesterday's POC built on these inputs also needs the random-level baseline described above.",
      evidence: "src/engine/trading/profile.ts (zoneOf); the lab on this page",
      impact: "The edge convention is one line of code, and it decides which bars on a level count as inside",
    },
  ],
  insights: [
    {
      t: "Edges count as inside — by convention",
      d: "A price exactly at VAH or VAL is inside under this course's rules. 1 Oct (synthetic) opens exactly on 30 Sep's VAL at 22,290, so its open zone is inside here and 'below' on a platform that treats the edge as outside.",
    },
    {
      t: "The nearest evidence is about currency price levels",
      d: "Osler (2000): published currency support and resistance levels saw bounces 60.8% of the time against 56.2% at random levels. Real, small, and not about volume profiles.",
    },
    {
      t: "A magnet test needs random levels at the same distance",
      d: "Price touches most nearby prices. Compare how often yesterday's POC is reached with how often made-up levels at the same distance from the open are reached. The difference is the only part that counts as edge.",
    },
    {
      t: "'Naked POCs get revisited' is untested",
      d: "Charting tools draw naked POCs; that defines them, it does not test them. The '80% revisit' figure that circulates has no traceable source.",
    },
  ],
  pitfalls: [
    "Reporting a touch rate with no baseline. 'Yesterday's POC was reached on 70% of days' says nothing until you know how often a level the same distance away was reached.",
    "Counting a 'reaction' without a fixed rule. If a bounce means 'price turned at some point near the level', almost every touch qualifies. Set the distances in advance: within how many points counts as reaching the level, and how far price must move away afterwards.",
    "Different edge conventions in the backtest and the live system. Bars that close exactly on VAH or VAL change zone, and those are exactly the bars a level-based rule cares about.",
    "Carrying yesterday's levels across a futures roll or after a short special session. The day after NIFTY's monthly expiry, yesterday's levels belong to a different contract and are offset by the price gap between the two (lesson 16). An hour-long muhurat session leaves a tiny profile whose levels mean little.",
    "Drawing too many lines. With several naked POCs plus yesterday's three levels on the chart, price is near one of them most of the time by chance. More lines need a stricter baseline, not a looser one.",
  ],
  quiz: [
    {
      q: "Yesterday's profile (synthetic), with its value area shaded. Today opens at 22,320. Under this course's convention, what is today's open zone?",
      figure: {
        lo: 22280,
        step: 5,
        bins: [4, 9, 16, 22, 30, 41, 35, 26, 18, 10, 6, 3],
        showValueArea: true,
        lines: [{ price: 22320, label: "today's open 22,320" }],
        caption: "Synthetic. 5-point rows.",
      },
      options: [
        "Above: the open is at the top of value",
        "Inside: the open sits exactly on VAH, and edges count as inside",
        "Below: the open is under the POC",
        "Undefined until the first bar closes",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The value area here runs from 22,295 to 22,320, so VAH is 22,320. Above means strictly greater than VAH; 22,320 is not, so the open zone is inside. A platform that treats the edge as outside would say 'above'.",
      distractors: [
        "Above needs strictly greater than VAH. Sitting on the edge is the case where conventions differ, and this course's is inside.",
        "",
        "The zone compares a price with VAH and VAL, not with the POC. Below the POC is still inside value.",
        "The open zone uses the first bar's OPEN, which is known the moment trading starts.",
      ],
    },
    {
      q: "Yesterday: VAL 22,290, VAH 22,335. Four bars close at 22,335, 22,335.05, 22,289.95 and 22,290. What are their zones under this course's convention?",
      options: [
        "above, above, below, below",
        "inside, inside, below, inside",
        "above, above, inside, inside",
        "inside, above, below, inside",
      ],
      answer: 3,
      difficulty: "apply",
      why: "22,335 equals VAH, so it is inside; 22,335.05 is strictly above. 22,289.95 is strictly below VAL; 22,290 equals VAL, so it is inside. One tick decides each pair.",
      distractors: [
        "This treats both edges as outside, the opposite convention. Some platforms may do this, which is why the convention must be written down.",
        "22,335.05 is a tick above VAH, which is strictly above.",
        "22,335 is exactly VAH, so inside, and 22,289.95 is a tick below VAL, so below.",
        "",
      ],
    },
    {
      q: "Osler (2000) found that currency rates bounced at published support and resistance levels 60.8% of the time. What is the right way to read that result?",
      options: [
        "The edge is about 4.6 percentage points over random levels (56.2%): real but small, and about currency price levels, not volume levels",
        "Support and resistance work about 61% of the time, so volume-profile levels will too",
        "60.8% is barely above a coin flip, so the levels do nothing",
        "It shows the levels were profitable to trade",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Random levels already 'bounced' 56.2% of the time, so most of the 60.8% is what any level gets. The edge is the gap. It was consistent — all 16 firm–currency pairs beat random — but it was measured in currencies, on price levels, and profit was not tested.",
      distractors: [
        "",
        "This reads the raw rate as the edge and moves it to a different kind of level and market. Neither step is supported.",
        "50% is the wrong baseline. The right one is the random-level rate, 56.2%, and the published levels did beat it in every case.",
        "Osler tested whether rates bounced, not whether trading them made money after costs.",
      ],
    },
    {
      q: "A video says: 'We tracked every naked POC within 100 points of the open over a year of NIFTY futures. 78% were revisited within five sessions.' What is the essential missing piece?",
      options: [
        "The number of naked POCs tracked",
        "A longer test period than one year",
        "How often made-up levels at the same distances from the open were reached within the same five sessions",
        "Whether the POCs came from TPO or volume profiles",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Within 100 points and five NIFTY sessions, price will reach most levels anyway. If random levels at the same distances were reached 75% of the time, the 78% is nearly all chance. Without the baseline the number cannot be judged.",
      distractors: [
        "The count matters for uncertainty, but even a huge count cannot say whether 78% is special without something to compare it with.",
        "More data narrows the estimate. It still needs a baseline to mean anything.",
        "",
        "Worth stating, but either kind of POC needs the same random-level comparison.",
      ],
    },
    {
      q: "Today's profile (synthetic), with today's value area shaded and yesterday's VAH drawn as a line. Which reading fits best?",
      figure: {
        lo: 22340,
        step: 5,
        bins: [3, 5, 8, 12, 18, 26, 34, 30, 22, 14, 8, 4],
        showValueArea: true,
        lines: [{ price: 22355, label: "yesterday's VAH 22,355" }],
        caption: "Synthetic. 5-point rows.",
      },
      options: [
        "Acceptance above: most of today's volume, including its whole value area, traded above yesterday's VAH",
        "Rejection: price went above yesterday's VAH and came back",
        "Neither: zone only looks at closes",
        "Inside day: today stayed within yesterday's value",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Today's value area runs from 22,360 to 22,385, entirely above the 22,355 line, and only the three lowest rows sit below it. Time and volume were spent above yesterday's value — the profile picture of acceptance.",
      distractors: [
        "",
        "Rejection would look like a thin tail above the line with the bulk of volume below it. Here the bulk is above.",
        "Zone is a per-bar input. Acceptance and rejection are readings of where the day's volume settled, which the profile shows directly.",
        "The day traded mostly above yesterday's VAH, so it did not stay inside yesterday's value.",
      ],
    },
    {
      q: "Today's profile (synthetic), with today's value area shaded and yesterday's VAH drawn as a line. Which reading fits best?",
      figure: {
        lo: 22340,
        step: 5,
        bins: [6, 14, 24, 32, 28, 18, 9, 4, 2, 2, 1, 1],
        showValueArea: true,
        lines: [{ price: 22375, label: "yesterday's VAH 22,375" }],
        caption: "Synthetic. 5-point rows.",
      },
      options: [
        "Acceptance above: price reached 22,400",
        "No reading is possible without TPO letters",
        "Today's POC moved above yesterday's VAH",
        "Rejection: price traded 25 points above yesterday's VAH on very little volume, and today's value stayed below the line",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Today's value area is 22,345–22,370, below the 22,375 line. The five rows above the line hold about 7% of the day's volume. Price visited those prices and the market did not trade there — the profile picture of rejection.",
      distractors: [
        "Reaching a price is not accepting it. Acceptance needs time and volume there, and this tail has almost none.",
        "TPO letters would add timing detail, but the volume profile already shows where trading did and did not happen.",
        "Today's POC is 22,357.5, below the line.",
        "",
      ],
    },
    {
      q: "Synthetic week. POCs: Mon 22,287.5, Tue 22,352.5, Wed 22,427.5. Later ranges: Tue 22,312.10–22,420.80, Wed 22,380.05–22,468.65, Thu 22,410.80–22,503.70. After Thursday's close, which POCs are naked?",
      options: [
        "Only Monday's",
        "All three",
        "Monday's and Tuesday's",
        "None: they are all within 220 points of Thursday's range",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Monday's 22,287.5 is below every later low. Tuesday's 22,352.5 is below Wednesday's low (22,380.05) and Thursday's (22,410.80). Wednesday's 22,427.5 lies inside Thursday's range, so it was traded through. These are 7–10 Sep from the visualiser.",
      distractors: [
        "Tuesday's POC also sits below every later low, so it is still untested.",
        "Thursday's range, 22,410.80–22,503.70, contains Wednesday's POC.",
        "",
        "Naked means not traded through, not far away. Being nearby is irrelevant to the definition.",
      ],
    },
    {
      q: "Why must a test of 'price is drawn to yesterday's POC' compare against made-up levels at the SAME distance from the open, rather than made-up levels anywhere in yesterday's range?",
      options: [
        "Because random levels anywhere would make the test too easy to pass",
        "Because the chance of reaching a level falls with distance, so closer levels are reached more by chance alone; a fair baseline has to match the distance",
        "Because the POC is always the closest level to the open",
        "It does not matter where the made-up levels go, as long as there are many of them",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If yesterday's POC tends to be nearer the open than a random price in yesterday's range — and it often is — it will be reached more often for that reason alone. Matching the distance removes that advantage, so whatever difference is left belongs to the level itself.",
      distractors: [
        "Badly placed baselines can go either way. The problem is that they measure distance instead of the level, not that they are easy or hard.",
        "",
        "It often is not. Today can open far from yesterday's POC, above VAH or below VAL.",
        "Many badly matched baselines give a precise answer to the wrong question.",
      ],
    },
  ],
  lab: LAB_ZONES,
};

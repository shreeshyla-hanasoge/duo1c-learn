import type { Topic } from "../../types.ts";

/*
 * Every number quoted for the synthetic days comes from
 * `src/engine/trading/rules.ts` (eightyRule) run on scenarios OPEN_YESTERDAY,
 * EIGHTY_FILL and EIGHTY_FAIL, and from NIFTY_SEP30 / NIFTY_OCT1. Every claim
 * about sources follows docs/trading/sources.md §C and keeps its label.
 */
export const vpEightyRule: Topic = {
  id: "vp-80-rule",
  title: "The 80% rule",
  tier: 1,
  depth: "deep",
  summary:
    "Open outside yesterday's value, get back in, cross to the other side: the claim, its shifting definitions, and the thin evidence behind the number.",
  why: "The 80% rule is the most quoted value-area setup, and for many traders it is the reason to draw value areas at all. It is also a clear case of folklore: the definition changes from one source to the next, the number may not appear in the book it is credited to, and the one test we found with a stated method got about 40%. Turning it into one exact, testable rule is a skill you will reuse on every other profile idea.",
  viz: ["vp-eighty"],
  learn: {
    intuition:
      "Yesterday's value area is the price range where most of yesterday's volume traded. If today opens outside it, the market is asking whether that range is still fair. If price then comes back in and stays a while, the story is that the question has been answered: the outside prices were rejected, and price is back in a range the market already knows. Inside a balanced range, price tends to rotate from one edge to the other, so the rule expects a trip to the far edge. As a story it is reasonable. The trouble is everything around it. How long does price have to stay? Does a touch count, or only a close? Which value area — the one from your platform, or the book's? And where does the number come from? '80%' sounds measured. As far as this course could find, it is not.",
    mechanics: [
      {
        heading: "The setup in plain words",
        body: "Three steps. First, today opens outside yesterday's value area: above VAH or below VAL. Second, price comes back inside and stays there for some agreed length of time, usually two 30-minute periods. Third, the claim: price will now go all the way through value to the far edge — VAH if it opened below, VAL if it opened above. The far edge is the target. The trade is usually entered when the second step completes, which this course calls the trigger.",
      },
      {
        heading: "What Dalton wrote, and how it drifted",
        body: "Dalton's Mind Over Markets has a section called 'The Value-Area Rule' (updated edition, pp. 244–246); we checked that against Wiley's published table of contents. We could not read the section itself. A 2008 Team LBR blog post (Linda Raschke's team) quotes the first edition, and reports three things: the rule needs two half-hour periods inside value, and the book does not say they must be consecutive; Dalton warns that taking the trade without weighing other conditions makes a full trip across value little better than a coin flip; and the figure '80%' does not appear in his text. All three are second-hand. ShadowTrader's glossary requires two consecutive periods, does not require either to close inside, and also counts a day that opens inside value, leaves and comes back. marketcalls.in, an Indian site, asks only that the first or second period touch VAH or VAL. Same name, three different rules.",
      },
      {
        heading: "Where the '80%' comes from: nobody can show us",
        body: "Many sites say the rule first appeared in The Profile Reports, a Dalton Capital Management newsletter from 1987 to 1991. We found no copy, so that origin is unverified. One futures broker's article credits the rule to Steidlmayer 'at the Chicago Mercantile Exchange', which is wrong on its face — Steidlmayer worked at the Chicago Board of Trade. No source we found shows where the number 80 was measured, on what market or over which years. Treat it as a name, not a statistic.",
      },
      {
        heading: "This course's reading, written as code",
        body: "`eightyRule` in `src/engine/trading/rules.ts` fixes every choice. (1) Today opens strictly above yesterday's VAH or strictly below its VAL. (2) A 30-minute period, counted from the first bar at 09:15, is 'in value' when it CLOSES inside yesterday's value area, edges included. (3) The rule triggers at the end of the second consecutive such period. (4) It succeeds if, after the trigger and before the close, price trades at or beyond the far edge. On the synthetic days in the visualiser, yesterday's value runs from VAL 22,325 to VAH 22,370. Both days open at 22,255. On the fill day the 10:45 and 11:15 periods close at 22,331.50 and 22,343.70, so it triggers at 11:44 and reaches 22,370 at 12:15. On the failure day the same periods close at 22,337.60 and 22,345; it triggers at 11:44, gets no higher than 22,351.90, and closes at 22,230.",
      },
      {
        heading: "The trade it implies, and its arithmetic",
        body: "By the time the rule triggers, price is already well inside value. On both synthetic days the trigger close sat about 25 points below the 22,370 target, while a stop just under VAL at 22,320 sat about 24 points away. That is roughly one point of risk for each point of reward, so the trade breaks even at a fill rate near 48% BEFORE slippage and charges. At the documented 40%, it loses. A hit rate means nothing until you put it next to the payoff — and '80%' was never stated with one.",
      },
    ],
    complexityDerivation:
      "Where it comes from: Dalton's 'Value-Area Rule' in Mind Over Markets (the section title is verified from Wiley's table of contents). The claim that the rule first appeared in The Profile Reports (1987–91) is commonly repeated, but we could not find a copy. What it claims: according to a 2008 Team LBR post quoting the first edition — second-hand — two half-hour periods inside value, not necessarily consecutive, and a warning that the trade without context is close to a coin flip. The same post says '80%' is not in the text; we could not check that against the book. Evidence for: none we could trace. One trader dictionary reports about 60% on E-mini futures, with no author, dates or method. '62% in TradeStation' and '70% over 18 months' circulate with no source we could find. Evidence against: Team LBR tested ES (S&P 500 futures) day sessions over 119 days from 10 April 2008. There were 76 opens outside value; 41 cases with two half-hour periods inside value filled 16 times (39%), and 40 cases with two consecutive periods filled 16 times (40%). The author calls the sample small. A Quantopian forum post reported 28 of 33 signals profitable over just five days, far too few to mean anything. Untested: we found no peer-reviewed test, and no NIFTY or MCX test with a stated method. Whether Dalton's context filters (balance, value-area width, direction) rescue the rule has not, to our knowledge, been tested in public.",
    variants: [
      {
        name: "Dalton's Value-Area Rule, as reported",
        when: "Two half-hour periods inside value after an open outside it, judged together with the wider context.",
        delta:
          "From the Team LBR post quoting the first edition (second-hand). The periods need not be consecutive. The context — balance, value-area width, direction — is a judgement, so this version is the hardest to code and the one nobody has tested in public.",
      },
      {
        name: "ShadowTrader's version",
        when: "Two consecutive 30-minute periods that trade into value; neither has to close there.",
        delta:
          "Also counts a day that opens inside value, leaves, and returns. Looser than a close-based trigger, so it fires on more days and fires earlier. ShadowTrader itself warns against trading it mechanically.",
      },
      {
        name: "The touch version (marketcalls.in)",
        when: "Today opens outside value and the first or second 30-minute period merely touches VAH or VAL.",
        delta:
          "A much weaker condition than Dalton's. On this course's two synthetic days, price first reached VAL at 10:49 on the fill day and at 10:19 on the failure day — both after the second period (09:45–10:14) — so this version would not trigger on either.",
      },
      {
        name: "This course's version (`eightyRule`)",
        when: "Open strictly outside value; two consecutive 30-minute CLOSES inside, edges counted as inside; success = far edge traded after the trigger and before the close.",
        delta:
          "Strict and codable, and one honest reading among several. It skips days where price spends time inside value without closing a period there, and it says nothing about stops — a day can be stopped out and later 'fill'.",
      },
    ],
    tradeoffs: [
      {
        vs: "A touch-based trigger",
        pick: "A close-based trigger, chosen before you see results",
        because:
          "A touch fires on far more days, including days when price pokes into value once and is pushed straight back out. A close inside value shows price was there at the end of a period, which is closer to the 'stayed a while' in the story. The cost is lateness: by the second close, much of the trip across value is already done, so less reward is left. Neither is known to be better; the mistake is choosing between them after looking at the results.",
      },
      {
        vs: "Requiring consecutive periods",
        pick: "Either — but write it down first, and report the other as a pre-declared second test",
        because:
          "Dalton, as reported, did not require them; ShadowTrader does. On Team LBR's ES sample it hardly mattered: 41 cases and 16 fills against 40 cases and 16 fills. On a different market it might matter more. What matters most is that you picked before testing, so you are not quietly choosing the version that happened to look best.",
      },
      {
        vs: "The book's TPO value area",
        pick: "The same volume value area your rule inputs already use",
        because:
          "Markets in Profile defines the value area from TPOs (time); your strategy builder uses volume VAH and VAL. They differ on the same day, and the two-row, one-row and stop-before-70% methods differ again by a row or two. Testing with the levels you will actually trade on gives an answer about your rule. Say plainly that it may not be Dalton's exact rule.",
      },
    ],
  },
  realWorld: [
    {
      system: "Team LBR's 2008 test on ES futures",
      kind: "industry",
      problem:
        "Does the rule hold up on the S&P 500 E-mini futures day session when someone actually counts?",
      applied:
        "119 trading days from 10 April 2008. 76 days opened outside the prior value area. With two half-hour periods inside value, 41 cases and 16 full fills (39%); with two consecutive periods, 40 cases and 16 fills (40%). The author calls the sample small.",
      evidence: "teamlbr.blogspot.com, September 2008 (we read the post, not the raw data)",
      impact: "About 40%, not 80% — and roughly 26% to 55% once you allow for 40 cases (our arithmetic)",
    },
    {
      system: "An archived Quantopian forum attempt",
      kind: "industry",
      problem:
        "A user coded the rule on S&P data and reported the result to the forum.",
      applied:
        "28 of 33 signals were profitable, but over only five days of 5,000-tick bars. The coder noted that the results changed a lot depending on how the rule was coded.",
      evidence: "quantopian-archive.netlify.app, 'How to pick intraday market direction: the 80 percent rule'",
      impact: "A sample far too small to mean anything, and a first-hand warning that the definition drives the result",
    },
    {
      system: "The same name across popular sources",
      kind: "industry",
      problem:
        "Readers in India often meet the rule on education sites and in videos, each with its own conditions, all under one name.",
      applied:
        "Dalton, as reported: two half-hour periods, not necessarily consecutive. ShadowTrader: two consecutive periods trading into value. marketcalls.in: the first or second period merely touches the edge. A TradingView author post: back in value twice for two periods. Each one's hit rate measures a different rule.",
      evidence: "docs/trading/sources.md §C.3",
      impact: "One name, at least four rules — so a quoted hit rate is meaningless until you know which one it measures",
    },
    {
      system: "Your strategy builder: open zone, zone and session range",
      kind: "yours",
      problem:
        "Can the 80% rule be written with the inputs you already have — previous-session VAH/VAL, open zone, zone, session range — and do their edge conventions match the rule's?",
      applied:
        "Open zone 'below' (or 'above') is step one. The zone of the bar that ends each 30-minute period, if your bars are 30 minutes long or you check zone at period ends, is step two. Session range comes close to step four, but not exactly: it needs price STRICTLY beyond VAH, while this course's `eightyRule` counts a fill when price trades AT the far edge. A day whose high touches VAH exactly is a fill for one and not for the other. The open has the same edge problem: 1 Oct (synthetic) opens at 22,290, exactly on 30 Sep's VAL. With edges counted as inside, the rule does not apply that day. A platform that counts the edge as outside says the day opened below value — though even then it never triggers, because no 30-minute period closes inside 30 Sep's value. The 11:45 period closes below VAL at 22,236.35 and the 12:15 period closes above VAH at 22,344.10.",
      evidence: "src/engine/trading/rules.ts (eightyRule); src/engine/trading/profile.ts (zoneOf, sessionRange)",
      impact: "Edge conventions decide which days are in your sample, so they must be part of the written definition",
    },
  ],
  cases: [
    {
      id: "eighty-define",
      scenario:
        "You want to test the 80% rule on three years of NIFTY near-month futures one-minute bars, using your builder's previous-session VAH and VAL. You have read four versions: Dalton's as reported (two half-hour periods, not necessarily consecutive), ShadowTrader's (two consecutive periods trading into value), a touch version (the first or second period touches the edge), and this course's `eightyRule` (two consecutive 30-minute closes inside value). You will see the results only once, and you want the result to mean something.",
      options: [
        {
          label: "Code all four, run them, and keep the one with the best fill rate",
          appeal: "It costs little extra code, and the best version is surely the one you want to trade.",
        },
        {
          label: "Write one definition down in full — open, trigger, edge convention, success, session hours — freeze it, and pre-declare at most one other version as a second test reported alongside it",
          appeal: "The result then measures a rule that was fixed before the data could influence it.",
        },
        {
          label: "Use the touch version, because it gives the most trades and so the most statistical power",
          appeal: "More trades means a narrower range around the estimate.",
        },
        {
          label: "Skip a fixed definition and judge each day by eye with context, as Dalton reportedly advises",
          appeal: "Dalton says the context is where the rule's power comes from, and a mechanical version throws it away.",
        },
      ],
      best: 1,
      verdict:
        "Keeping the best of four turns one test into four and reports the luckiest. The touch version does give more trades, but it is a weaker rule, not a more powerful test of the same one, and picking it for its sample size still means picking before you know what you are testing. Judging by eye cannot be repeated, and you cannot run it on three years without the result of each day leaking into the next judgement. A frozen written definition, with one pre-declared alternative reported next to it, is the only option that produces a number you can believe.",
      claims: [
        {
          text: "You give up the chance to pick the best-looking version afterwards, in exchange for a fill rate that means what it says.",
          axis: "trade",
          correct: true,
          note: "That is the trade, stated with both sides. Choosing after the fact always raises the headline number and always lowers its meaning.",
        },
        {
          text: "Your written definition may not be Dalton's exact rule, so the result is about your reading of the idea, not about his book.",
          axis: "trade",
          correct: true,
          note: "True and worth saying in the write-up. Nobody we found has published his exact wording with page numbers checked against the book.",
        },
        {
          text: "Freezing the definition makes it more likely that the test shows an edge.",
          axis: "trade",
          correct: false,
          note: "It makes the result honest, not better. If anything, a frozen definition usually tests worse than the best of several variants — which is exactly why it is believable.",
        },
        {
          text: "A day that opens exactly on VAL or VAH is classified by your edge convention, so the convention has to be part of the frozen definition.",
          axis: "failure",
          correct: true,
          note: "1 Oct (synthetic) opens exactly on 30 Sep's VAL. It is out of the sample with edges counted as inside, and in the sample with edges counted as outside.",
        },
        {
          text: "Once the definition is frozen, the test can no longer suffer from multiple comparisons.",
          axis: "failure",
          correct: false,
          note: "Slicing the frozen rule afterwards — by year, by expiry day, by gap size — and reporting the best slice brings the problem straight back.",
        },
        {
          text: "If the session hours in your data change during the three years, the last 30-minute period and the 'before the close' window change with them.",
          axis: "failure",
          correct: true,
          note: "NSE's timings page now shows equity derivatives closing at 15:40, reportedly from 3 August 2026 (a news report). The course's synthetic sessions use 09:15–15:30. The definition has to say which close it uses.",
        },
        {
          text: "Three counts — days the rule applied, days it triggered, days it filled — not only the fill rate.",
          axis: "measure",
          correct: true,
          note: "The counts show how often the setup even occurs, and they let a reader work out the uncertainty for themselves.",
        },
        {
          text: "How often price reached the far edge on ALL days that opened outside value, triggered or not, as a baseline.",
          axis: "measure",
          correct: true,
          note: "If price reaches the far edge just as often without the trigger, the trigger adds nothing. Without the baseline, a fill rate cannot show that.",
        },
        {
          text: "Only the best version's fill rate, since that is the number traders quote.",
          axis: "measure",
          correct: false,
          note: "That is the number this case is trying to avoid producing.",
        },
      ],
    },
    {
      id: "eighty-58",
      scenario:
        "Your frozen definition (this course's `eightyRule`, previous-session volume VAH/VAL, 5-point rows) ran once on three years of NIFTY near-month futures. It applied on many days and triggered 70 times. 41 of the 70 reached the far edge before the close: 58.6%. A colleague says this 'confirms the rule works in India'. You have to decide what the result supports.",
      options: [
        {
          label: "It confirms the rule: 58.6% is well above a coin flip",
          appeal: "Above 50% feels like an edge, and it is a real result on Indian data.",
        },
        {
          label: "It disproves the rule: the rule says 80% and this is far below",
          appeal: "The rule's own number was not reached.",
        },
        {
          label: "Not on its own: the plausible range is roughly 47% to 69%, the payoff decides the break-even, and it needs a baseline and fresh data before it supports anything",
          appeal: "It treats 41 of 70 as an estimate, not a fact.",
        },
        {
          label: "It confirms the rule once you drop expiry Tuesdays, which were mostly the losing days",
          appeal: "Expiry days really do trade differently, so excluding them seems principled.",
        },
      ],
      best: 2,
      verdict:
        "With 70 trades, a 95% interval around 58.6% runs from about 47% to 69% (Wilson interval, our arithmetic), so the data cannot rule out a fill rate below a 1:1 trade's break-even of about 48% before costs. 50% is the wrong yardstick anyway: what matters is the payoff and how often price reaches the far edge without the trigger. 80% is the wrong yardstick too, because nobody can show where that number came from. Dropping expiry days after seeing that they lost creates a new rule chosen by the data, and it needs data it has not seen.",
      claims: [
        {
          text: "Treating 41 of 70 as a wide estimate means you may set aside a rule that is genuinely positive.",
          axis: "trade",
          correct: true,
          note: "The cost of caution, honestly named. The alternative cost — trading a rule that is not positive — is usually larger.",
        },
        {
          text: "A 58.6% fill rate guarantees a positive result, because more than half the trades win.",
          axis: "trade",
          correct: false,
          note: "Whether it is positive depends on how much a fill pays against how much a failure costs, after slippage and charges. With about one point of risk per point of reward, 58.6% is only a little above break-even, and inside its own range of uncertainty.",
        },
        {
          text: "Removing expiry days because they lost is a new, data-chosen variant; it needs data the decision was not made on.",
          axis: "failure",
          correct: true,
          note: "The reason might be real — NIFTY weekly options expire on Tuesdays, and those days do trade differently — but deciding it after seeing the losses is still choosing by results.",
        },
        {
          text: "70 triggers over three years can cluster in one or two market regimes, so the estimate may not carry over to the next one.",
          axis: "failure",
          correct: true,
          note: "Count the triggers by year. If most come from one stretch, the 58.6% describes that stretch.",
        },
        {
          text: "With 70 trades the result cannot be luck, because luck averages out after 30 trades.",
          axis: "failure",
          correct: false,
          note: "There is no such threshold. At 70 trades the uncertainty is still about ±11 percentage points, wide enough to contain both a losing and a winning rule.",
        },
        {
          text: "Average points won on fills against average points lost on failures, after slippage and charges, compared with the break-even fill rate that payoff implies.",
          axis: "measure",
          correct: true,
          note: "This turns a fill rate into a statement about money. Without it, 58.6% is not good or bad.",
        },
        {
          text: "The same frozen rule on a later period it was not designed on.",
          axis: "measure",
          correct: true,
          note: "Fresh data with the definition unchanged is the cleanest check that the 41 of 70 was not a lucky stretch.",
        },
        {
          text: "Whether the fill rate reaches 80%, since that is what the rule claims.",
          axis: "measure",
          correct: false,
          note: "80% has no traceable source. Measuring against it is measuring against folklore.",
        },
      ],
    },
    {
      id: "eighty-exit",
      scenario:
        "In your test, failures look like the synthetic failure day in the visualiser: the rule triggers with price near yesterday's POC, climbs a little, then turns and leaves value again through the edge it came in by (VAL, after a low open), and keeps going. Yesterday's value area is typically about 45 points wide, and the trigger close sits about 25 points from the far edge. Before the out-of-sample run you must fix one exit structure. You want the loss on a failure to have a known limit, and you want to keep testing the rule as stated.",
      options: [
        {
          label: "Target the far edge; stop just beyond the near edge (below VAL after a low open)",
          appeal: "The stop sits where the rule's story is proved wrong, and the target is the rule's own.",
        },
        {
          label: "Target the far edge with no stop, holding to the close",
          appeal: "The rule says it fills most of the time, so a stop only turns winners into losers.",
        },
        {
          label: "Target the far edge; stop at yesterday's POC",
          appeal: "A tight stop keeps every loss small.",
        },
        {
          label: "Target yesterday's POC instead, with a stop below VAL",
          appeal: "The POC is closer, so it is reached more often.",
        },
      ],
      best: 0,
      verdict:
        "The failure you observed leaves value through the near edge, so a stop just beyond it caps the loss exactly where the idea — 'outside was rejected, price is back in value' — stops being true. With no stop, a failure like the synthetic one (trigger near 22,345, close at 22,230) costs over 100 points. A stop at the POC sits right where the trigger happens, in the middle of normal back-and-forth, so ordinary noise would stop out trades that later fill. Targeting the POC changes the rule into a different one, and since the trigger often happens near the POC, very little reward would be left against a stop below VAL.",
      claims: [
        {
          text: "With entry near the middle of value, the distance to the far edge and to a stop beyond the near edge are similar, so the trade needs a fill rate somewhat above 50% after costs.",
          axis: "trade",
          correct: true,
          note: "On the synthetic days: about 25 points to the target and about 24 to a stop at 22,320. Break-even is near 48% before costs, and costs push it higher.",
        },
        {
          text: "A stop beyond the near edge removes the risk on failure days.",
          axis: "trade",
          correct: false,
          note: "It limits the planned loss; it does not remove it. Every failure still costs the stop distance plus slippage.",
        },
        {
          text: "On a gap day, a failure can leave through the near edge fast enough that slippage on the stop is larger than planned.",
          axis: "failure",
          correct: true,
          note: "Fast moves through a thin price zone are where stop orders fill worse than their price. Record the actual fill, not the stop level.",
        },
        {
          text: "Once the rule has triggered, a failure back through the near edge is rare enough to ignore when sizing.",
          axis: "failure",
          correct: false,
          note: "In the only documented test, about 60% of triggers did not fill. Failure is the common case.",
        },
        {
          text: "The average realised loss on failed trades, including slippage, not just the planned stop distance.",
          axis: "measure",
          correct: true,
          note: "The planned stop is an intention; the realised loss is what the account sees.",
        },
        {
          text: "How often price hit the stop first and only later reached the far edge — days the rule counts as fills but the trade lost.",
          axis: "measure",
          correct: true,
          note: "`eightyRule` reports a fill if the far edge trades at any point after the trigger; it knows nothing about stops. Those days look like wins in a fill-rate table and are losses in the account.",
        },
        {
          text: "Only the fill rate, since the stop does not change whether the rule filled.",
          axis: "measure",
          correct: false,
          note: "The stop does not change the rule's fill, but it changes the trade's result. That difference is the claim above.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "There is no single 80% rule",
      d: "Dalton, as reported, allows non-consecutive periods; ShadowTrader requires consecutive ones; an Indian site needs only a touch. Write your definition down — open, trigger, edges, success, session hours — before you test anything.",
    },
    {
      t: "The documented number is about 40%",
      d: "Team LBR's ES test (2008) got 16 fills from about 40 triggers. The '80%' has no traceable source, and Dalton himself reportedly called the trade without context close to a coin flip. Nothing published covers NIFTY or MCX.",
    },
    {
      t: "A hit rate is meaningless without the payoff",
      d: "At the trigger, price is already well inside value. On the synthetic days the target was about 25 points away and a stop beyond VAL about 24, so the trade breaks even near 48% before costs.",
    },
    {
      t: "A few points of VAL move the trigger",
      d: "On the synthetic failure day, the third period closed at 22,324.50, half a point below VAL 22,325. With 2.5- or 10-point rows, yesterday's VAL is 22,320, that close counts as inside, and the trigger comes 30 minutes earlier.",
    },
  ],
  pitfalls: [
    "Definition-shopping: trying consecutive and non-consecutive periods, touches and closes, one period and two, and then reporting the best. Every variant you try is another test, and the best of many is inflated by luck.",
    "Testing on one value area and trading on another. Two-row, one-row and stop-before-70% methods, row size and 68% versus 70% all move VAH and VAL by a few points. On the synthetic yesterday, Sierra Chart's and TradingView's methods put VAH at 22,365 instead of 22,370 — a different target on the same data.",
    "Believing a small sample. 16 fills from 40 triggers has a 95% interval of roughly 26% to 55% (our arithmetic). A few dozen trades cannot tell 40% from 50%.",
    "Mixing day types. Expiry days (NIFTY weeklies expire on Tuesdays), gap opens far outside yesterday's whole range, and short special sessions behave differently from ordinary days. Record which kind each trigger was. Both synthetic days open at 22,255, below yesterday's whole range (low 22,295.40), not just below its value.",
    "Ignoring costs. When the remaining reward is only about 25 NIFTY points, slippage on entry and stop plus charges take a meaningful share of every trade. Test with realistic fills, not with the trigger bar's close.",
  ],
  quiz: [
    {
      q: "According to the 2008 Team LBR post quoting the first edition of Mind Over Markets, what did Dalton require of the two half-hour periods back inside value?",
      options: [
        "They must be consecutive",
        "Both must close inside value",
        "Only that there are two of them; they need not be consecutive",
        "Only one period is needed if it closes near the POC",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The post reports that Dalton's wording does not require the periods to be consecutive. It is second-hand — we could not read the book's section — and it also reports his warning that the trade without context is close to a coin flip.",
      distractors: [
        "That is ShadowTrader's version. It is the version most often repeated online, which is why it feels like the original.",
        "This course's `eightyRule` uses closes, but that is our operational choice, not what the post reports Dalton wrote.",
        "",
        "No version we found uses a single period or the POC. It mixes the rule with the 'POC as magnet' idea from the next lesson.",
      ],
    },
    {
      q: "Synthetic data. Yesterday's value runs from VAL 22,325 to VAH 22,370, and yesterday's low was 22,295.40. Today opens at 22,255. The 30-minute closes, from 09:15, are 22,277.55, 22,298.10, 22,307.05, 22,331.50 and 22,343.70. Price first trades at 22,325 at 10:49. Under this course's `eightyRule`, when does the rule trigger?",
      options: [
        "At 10:49, when price first reaches VAL",
        "At the end of the 10:45–11:14 period, the first close inside value",
        "At the end of the 11:15–11:44 period, the second consecutive close inside value",
        "Never: today opened below yesterday's whole range, not just below its value",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The rule needs two consecutive 30-minute closes inside value. 22,331.50 is the first and 22,343.70 the second, so it triggers at the end of the period that starts at 11:15. On the synthetic fill day the far edge, 22,370, then trades at 12:15.",
      distractors: [
        "That is the touch reading. `eightyRule` ignores touches and counts only period closes.",
        "One close inside is half the trigger. The rule asks whether price stayed, and one period is not enough.",
        "",
        "Opening outside the range is a separate input (lesson 9's open types). `eightyRule` only asks whether the open was strictly outside value, and 22,255 is below VAL.",
      ],
    },
    {
      q: "Synthetic failure day: yesterday's VAL is 22,325 on 5-point rows. The 30-minute closes are 22,279, 22,317.30, 22,324.50, 22,337.60 and 22,345. With 10-point rows, yesterday's VAL becomes 22,320. What happens to the trigger?",
      options: [
        "Nothing; row size never moves the value area",
        "It comes one period earlier, at the end of the 10:45 period instead of the 11:15 one",
        "It disappears, because 10-point rows widen value",
        "It comes one period later, because the target moves",
      ],
      answer: 1,
      difficulty: "apply",
      why: "22,324.50 is half a point below 22,325 but inside 22,320. With 10-point rows the 10:15 and 10:45 periods are the two consecutive closes inside, so the trigger comes 30 minutes earlier. A few points of VAL change when the rule fires — and so the entry price.",
      distractors: [
        "Row size moves the levels — lesson 3's visualiser shows it. Here VAL moves 5 points.",
        "",
        "Wider value makes it easier for a close to count as inside, not harder.",
        "The target (VAH) is 22,370 at both row sizes here. The trigger depends on VAL, and VAL moved down.",
      ],
    },
    {
      q: "Assume a trade at the trigger: entry 22,344, target 22,370, stop 22,320, and every trade that does not fill is stopped out. If 40% fill, what is the average result per trade before costs?",
      options: [
        "+10.4 points: 40% of 26",
        "About −4 points",
        "+2 points, because the target is further away than the stop",
        "It cannot be worked out without knowing the 80% figure",
      ],
      answer: 1,
      difficulty: "judge",
      why: "0.4 × 26 − 0.6 × 24 = 10.4 − 14.4 = −4 points per trade. Break-even is 24 ÷ (26 + 24) = 48%. At the documented hit rate, this trade structure loses even before charges.",
      distractors: [
        "This counts the winners and forgets the 60% of trades that lose 24 points each.",
        "",
        "A 2-point gap between target and stop distance is small next to the gap between 40% and 60%. How often you win matters as much as how much.",
        "The 80% figure has no source, and expectancy needs only the hit rate and the two distances, which are all given.",
      ],
    },
    {
      q: "A blog tests 12 versions of the rule on two years of NIFTY futures (consecutive or not; touch, close, or whole period inside; two different targets) and reports: 'Best version: 71% fill rate on 38 trades.' What is the main problem?",
      options: [
        "38 trades is too many; the rule should be rare",
        "71% is below 80%, so the rule failed",
        "The 71% is the best of 12 tries on a small sample; the best of many noisy estimates is inflated, so it needs fresh data with the definition frozen",
        "Nothing; trying several versions and picking the best is standard optimisation",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Each version is a test. With 38 trades each estimate is uncertain by about ±14 percentage points, and the maximum of 12 such estimates is pushed upward by luck. The honest next step is to freeze the winning definition and run it on data it has never seen.",
      distractors: [
        "Rarity is not a virtue in itself. The problem is how the 71% was selected, not how often the rule fires.",
        "Comparing with 80% treats folklore as a benchmark. The real question is whether 71% survives the selection.",
        "",
        "Optimising is fine; reporting the optimised number as if it came from one test is not. This is the multiple-comparisons trap.",
      ],
    },
    {
      q: "1 Oct (synthetic) opens at 22,290, exactly on 30 Sep's VAL of 22,290. This course counts an edge as inside value; suppose your platform counts it as outside. What happens to 1 Oct in an 80%-rule backtest?",
      options: [
        "It triggers under both conventions",
        "Under the course's convention the rule does not apply; under your platform's, the day counts as an open below value — the same day is in one sample and not the other",
        "It is excluded under both, because an open exactly on an edge is always ignored",
        "It applies under both conventions, because the first bar's low is below VAL",
      ],
      answer: 1,
      difficulty: "apply",
      why: "`eightyRule` asks whether the OPEN is strictly below VAL; 22,290 is not, so it does not apply. A strict-edge platform says 'below', so the day enters its sample. It never triggers there either: no 30-minute period closes inside 22,290–22,335 that day (the 11:45 period closes at 22,236.35, the 12:15 period at 22,344.10). But the two backtests are already counting different days.",
      distractors: [
        "Even where the rule applies, no period closes inside 30 Sep's value, so it triggers under neither.",
        "",
        "No rule ignores edge opens automatically; each convention puts the edge on one side.",
        "The rule tests the open price, not the first bar's low. Session range — a different input — does look at the low, and is 'below' from the first minute.",
      ],
    },
    {
      q: "Today opened below value and the rule triggered. After the trigger, today's high is exactly 22,370 — yesterday's VAH — and never higher. What do `eightyRule` and your session-range input report?",
      options: [
        "Both report success: VAH was reached",
        "Both report failure: price never went beyond VAH",
        "`eightyRule` says not filled; session range says 'both'",
        "`eightyRule` counts it filled (at or beyond the far edge); session range stays 'below', because touching an edge is not beyond it",
      ],
      answer: 3,
      difficulty: "apply",
      why: "`eightyRule` checks `high >= target`. `sessionRange` checks `high > vah`, strictly. A high exactly on VAH satisfies the first and not the second. If you build the rule from your session-range input, these days move from the fill column to the failure column.",
      distractors: [
        "Only one of them treats a touch as reaching the level.",
        "Only session range needs strictly beyond. The course's rule treats reaching the edge as a fill.",
        "Exactly the wrong way round: the rule's test is the looser one here.",
        "",
      ],
    },
    {
      q: "Which statement about the evidence for the 80% rule is accurate?",
      options: [
        "Steidlmayer measured 80% at the Chicago Mercantile Exchange in the 1980s",
        "A peer-reviewed study confirmed it on S&P futures",
        "It is confirmed for NIFTY by NSE data",
        "The only test we found with a stated method got about 40% on ES in 2008, on about 40 triggers; the '80%' has no traceable source",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Team LBR's 2008 count is the only documented test with a method we found. The origin in The Profile Reports (1987–91) is unverified, and no peer-reviewed or Indian-market test turned up.",
      distractors: [
        "One broker's article says this, but Steidlmayer worked at the Chicago Board of Trade, and no measurement is cited.",
        "We searched journals, SSRN and arXiv and found no peer-reviewed test of any Market Profile value-area rule.",
        "No NIFTY or MCX test with a stated method was found. NSE publishes prices and volumes, not tests of trading rules.",
        "",
      ],
    },
  ],
};

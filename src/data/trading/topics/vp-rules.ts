import type { Topic } from "../../types.ts";

export const vpRules: Topic = {
  id: "vp-rules",
  title: "From concept to testable rules",
  tier: 1,
  depth: "deep",
  summary:
    "A rule is testable only when it says what is measured, on which bar, against which levels, known at what time — and was written before the results.",
  why: "Profile ideas arrive in words: 'fade the open back to value', 'target the POC'. A backtest needs a condition a computer evaluates the same way every time, live and in history. Every choice the words leave open is a place where you can, without meaning to, end up testing whichever version happened to look best.",
  viz: ["vp-rule-inputs"],
  learn: {
    intuition:
      "Imagine giving the same idea to two careful programmers: 'buy when NIFTY comes back into value'. One checks whether a one-minute bar CLOSES inside yesterday's value area; the other checks whether any bar's LOW touched VAH. One uses the CBOT two-row value area, the other TradingView's. One counts a close exactly on VAH as inside, the other as outside. Both have implemented the idea faithfully, and their backtests will disagree — sometimes by a lot. Neither is wrong. What is wrong is not knowing which one you tested, or choosing between them after seeing the results. A testable rule is a sentence with no gaps: what is measured, on which bar, against which levels, known at what time, how edges count, how the value area is computed and from which data. Your own three inputs — zone, open zone and session range — are already written this way, which is why they are a good place to start.",
    mechanics: [
      {
        heading: "Every condition answers the same questions",
        body: "What is measured: the bar's close, its high, its low, its open? On which bar: one-minute, five-minute, the 30-minute period? Against which levels: yesterday's final POC/VAH/VAL, today's developing levels, a composite? Known at what time: yesterday's final levels exist from 09:15; a developing level exists only up to the bar it was computed on. How edges count: is a close exactly at VAH inside or above? Which value-area method: CBOT two-row ≥ 70% (this course), Sierra Chart's one-row default, TradingView's one-row ≤ 70%? On the same worked rows those three give VAL 101, 102 and 103. And which data: NIFTY near-month future at 5-point bins, 09:15–15:30 or 09:15–15:40? If any answer is missing, the rule is not yet a rule.",
      },
      {
        heading: "Your three inputs, written out exactly",
        body: "Zone: `close > yVAH → above; close < yVAL → below; otherwise inside` — edges count as inside. Open zone: the zone of today's first price, fixed for the whole day. Session range: whether today's high so far is STRICTLY above yVAH and today's low so far STRICTLY below yVAL, giving inside, above, below or both; it can only grow, never shrink. On the synthetic 30 Sep → 1 Oct pair in `vp-rule-inputs`, 30 Sep's value is 22,290–22,335 and 1 Oct opens at 22,290, exactly on VAL: open zone inside under the edge convention, 'below' on a platform that treats the edge as outside. The first bar dips below 22,290, so the session range is already 'below' after one minute, while that bar's close (22,291.45) is still zone inside. By 12:44 the range is 'both'. One more definition to pin down since NSE's F&O pre-open auction began in Dec 2025: is 'today's first price' the auction price or the first one-minute bar's open?",
      },
      {
        heading: "Exits at the POC or the far edge — and how they fail",
        body: "Two natural targets for a trade back into value: yesterday's POC (near) or the far edge of value (the 80% rule's target). Both fail in known ways. A gap through the stop: an overnight or news gap fills you at the open, not at your stop, and a backtest that assumes the stop price is optimistic. The level moves with the method: change the bin size or the value-area rule and VAH, VAL and even the POC move, so the live target must use the tested settings. The target is never reached: on a trend day the far edge does not trade, and the trade ends at the stop or the time exit (the failure day in `vp-eighty` shows this). Costs on small targets: if yesterday's POC is 10 points from the entry, brokerage, taxes and slippage take a large share of the gross reward. And with one-minute bars, if a single bar's range covers both stop and target, the data cannot say which came first.",
      },
      {
        heading: "Pre-register: write the rule down before you look",
        body: "Pre-registration means fixing the complete rule, the data, the sample period, the metric and the comparison before running the test, and storing it with a date — a commit in your repository is enough. It also means saying in advance what result would count as 'no support'. The reason is not bureaucracy. Each choice left open (close or touch, 09:45 or 10:15 start, POC or VAH target) is a hidden fork, and choosing after seeing results quietly turns one test into many. The research on data snooping that lesson 18 covers is about exactly this: the more versions you look at, the better the best one looks by chance.",
      },
      {
        heading: "One rule tests one hypothesis",
        body: "A hypothesis is one claim, such as 'after opening above yesterday's value and closing back inside it, price reaches yesterday's POC before 15:25 more often than a random entry time would'. The rule that tests it should contain nothing else. Adding 'and session range is not both' after seeing results creates a new hypothesis tested on the same data. Your three inputs have 3 × 3 × 4 = 36 combinations; testing all of them and reporting the best is 36 hypotheses, not one. If several really are of interest, say so in advance, count them, and judge the best against that count.",
      },
    ],
    complexityDerivation:
      "This lesson is about measurement, so the evidence is about how much wording changes results. The clearest case is the 80% rule. Its conditions differ from source to source, each as we read it: ShadowTrader requires two consecutive 30-minute periods trading in value; a 2008 Team LBR post quoting Dalton's first edition says his rule does not require them to be consecutive (secondary); marketcalls.in only requires the first or second period to touch the value-area edge. The person who coded it on the archived Quantopian forum noted that results changed a lot depending on how the rule was written (read in the archive). Platform documentation shows value-area methods differ enough to move VAL by two whole rows on identical data (the 101/102/103 example). Pre-registration is borrowed from experimental science; our notes contain no study measuring how much it improves trading backtests, so treat its value here as reasoning, not a measured result. The reasoning rests on established work on data snooping: White's Reality Check (2000) exists because searching many rules and reporting the best one inflates results, and the search has to be accounted for. Untested: no published study we found compares profile rules phrased different ways on NIFTY or MCX data.",
    variants: [
      {
        name: "Close-based condition",
        when: "You want a signal that is final at the end of a bar and identical in backtest and live.",
        delta:
          "Your zone input is this kind. Nothing inside the bar matters, so one-minute data is enough. It reacts one bar late compared with a touch.",
      },
      {
        name: "Touch-based condition",
        when: "The idea is about price reaching a level at all — a target, a stop, a test of VAH.",
        delta:
          "Uses the bar's high or low. Your session range is this kind, using a strict '>' so a touch of the edge is not beyond. When the stop and target both fall inside one bar, the order inside the bar is unknown.",
      },
      {
        name: "Period-based condition",
        when: "The idea is stated in 30-minute periods, as the 80% rule is.",
        delta:
          "Evaluated at the period's close, so the signal is known only every 30 minutes. 'Two periods' has to say consecutive or not, and close inside or trade inside.",
      },
      {
        name: "State condition fixed or grown during the day",
        when: "The idea depends on where the day started or has been, not on the current bar.",
        delta:
          "Open zone is fixed from the first price; session range only grows. Both are free of look-ahead by construction, as long as they use yesterday's final levels.",
      },
    ],
    tradeoffs: [
      {
        vs: "Target at the far edge of value",
        pick: "Choose the exit that matches the hypothesis you wrote down, not the one with the nicer backtest",
        because:
          "A POC target is hit more often and pays less; the far edge pays more and, because every path to it passes through the POC first, can never be hit more often than the POC. Which is 'better' depends on costs, stop distance and what you are trying to learn. Picking after testing both is a hidden comparison.",
      },
      {
        vs: "Touch-based entry",
        pick: "Close-based entry when you only have one-minute bars",
        because:
          "A touch rule on one-minute bars cannot tell whether the touch came before or after the stop inside the same bar, so the backtest must guess. A close rule has no such ambiguity, at the cost of entering up to one bar later.",
      },
      {
        vs: "Testing many variants and keeping the best",
        pick: "One pre-registered rule, or a small set declared and counted in advance",
        because:
          "The best of many variants looks good partly by luck, and the luck does not carry forward. One rule fixed in advance gives a result you can believe at face value; a declared set lets you correct for the search.",
      },
    ],
  },
  realWorld: [
    {
      system: "The 80% rule, three ways",
      kind: "industry",
      problem:
        "Everyone 'knows' the 80% rule, but a backtest needs one exact version, and the sources do not agree on which.",
      applied:
        "ShadowTrader's glossary requires two consecutive 30-minute periods in value. A 2008 Team LBR post quoting Dalton's first edition says the periods need not be consecutive (secondary). marketcalls.in only requires the first or second period to touch the value-area edge. This course's `eightyRule` picks one reading and writes it down.",
      evidence: "ShadowTrader glossary; Team LBR blog (2008); marketcalls.in; src/engine/trading/rules.ts",
      impact: "Three 'same' rules that would trigger on different days",
    },
    {
      system: "A Quantopian forum attempt at the 80% rule",
      kind: "industry",
      problem:
        "A forum user coded the rule on S&P data and reported 33 signals, 28 profitable.",
      applied:
        "The sample was five days of data, far too small to mean anything, and the person who coded it noted that results changed a lot depending on how the rule was coded. Both points are visible in the archived thread.",
      evidence: "quantopian-archive.netlify.app forum thread on the 80 percent rule",
      impact: "A striking win rate that the coding choices alone could change",
    },
    {
      system: "Platform value areas from identical rows",
      kind: "industry",
      problem:
        "A rule that says 'yesterday's VAL' has not said which platform's VAL.",
      applied:
        "On the same 12 rows, the CBOT two-row rule gives VAL 101, Sierra Chart's one-row default 102 and TradingView's one-row ≤ 70% rule 103, each taken from that platform's own documentation. A rule tested on one and traded on another uses a different level.",
      evidence: "CBOT study guide; Sierra Chart and TradingView documentation (docs/trading/sources.md, section D)",
      impact: "The value-area method is part of the rule",
    },
    {
      system: "Your strategy builder's three inputs",
      kind: "yours",
      problem:
        "Zone, open zone and session range are built on the previous session's VAH and VAL, and every one involves an edge decision.",
      applied:
        "Written exactly: zone compares the bar's close with yesterday's VAH and VAL, edges counting as inside; open zone is the zone of today's open, fixed all day; session range asks whether today's high and low so far are strictly beyond. On the synthetic 1 Oct, the open lands exactly on 30 Sep's VAL of 22,290, so the edge convention alone decides whether the open zone is 'inside' or 'below'.",
      evidence: "src/engine/trading/profile.ts (`zoneOf`, `sessionRange`)",
      impact: "Inputs that are already testable, with edge conventions that must match between backtest and live",
    },
  ],
  cases: [
    {
      id: "rules-fade-open",
      scenario:
        "The idea: 'when NIFTY futures open above yesterday's value, sell when they come back into value, and target yesterday's POC.' You have one-minute bars of the near-month future and yesterday's levels at 5-point bins under the course's value-area rules. The rule must be evaluable at a bar's close with no look-ahead, and behave identically in backtest and live. Which version do you test?",
      options: [
        {
          label: "'Sell when price falls back into value after a high open; target the POC.'",
          appeal: "It is the idea exactly as stated, with nothing added.",
        },
        {
          label: "Open zone above; sell at the first one-minute close at or below yesterday's VAH between 09:16 and 11:15; target yesterday's final POC; stop at today's high so far plus 5 points; exit at 15:25 if neither is hit; levels from yesterday's near-month future at 5-point bins, CBOT two-row 70%",
          appeal: "Every question — measure, bar, levels, time known, edges, method, data — has an answer.",
        },
        {
          label: "Open zone above; sell when any bar's low touches yesterday's VAH; target today's POC",
          appeal: "Enters earlier, at the edge itself, and uses the freshest level available.",
        },
        {
          label: "Open zone above; sell at the close of the first 30-minute period that closes inside value; target yesterday's VAL",
          appeal: "Fully specified, and close to the well-known 80% rule.",
        },
      ],
      best: 1,
      verdict:
        "Only the second version answers every question and still tests the idea as stated. The first is the idea in words: which bar, which POC, what stop and what time window are all open, so it cannot be run the same way twice. The third uses today's POC, which is final only after the close — look-ahead — and a touch entry on one-minute bars. The fourth is testable but tests a different hypothesis: a far-edge target from a 30-minute signal is the 80% rule, not 'back to the POC'.",
      claims: [
        {
          text: "Fixing entries to 09:16–11:15 means returns to value later in the day are not part of this test.",
          axis: "trade",
          correct: true,
          note: "A deliberate narrowing. It keeps the rule about the open, at the cost of saying nothing about afternoon returns.",
        },
        {
          text: "Using the edges-inside convention means a close exactly at yesterday's VAH counts as back in value.",
          axis: "trade",
          correct: true,
          note: "That matches the zone convention of your inputs. A platform treating the edge as outside would enter one tick later on such bars.",
        },
        {
          text: "Using yesterday's final POC as the target introduces look-ahead bias.",
          axis: "trade",
          correct: false,
          note: "Yesterday's final POC is known from 09:15. Look-ahead would come from using TODAY's final POC.",
        },
        {
          text: "If the live platform computes VAH with TradingView's one-row ≤ 70% method while the backtest used the CBOT two-row method, live entries trigger at different prices from the tested ones.",
          axis: "failure",
          correct: true,
          note: "The value-area method moved VAL by two rows on the worked example; it can move VAH too. The method has to match.",
        },
        {
          text: "Because the rule is fully specified, it cannot be overfitted.",
          axis: "failure",
          correct: false,
          note: "Precision makes it testable, not immune. If the 11:15 cut-off or the 5-point stop buffer was chosen after looking at results, it is still fitted.",
        },
        {
          text: "The share of trades that end at the target, at the stop, and at the 15:25 time exit, reported separately.",
          axis: "measure",
          correct: true,
          note: "A profit figure alone hides how the rule makes or loses money.",
        },
        {
          text: "Results with costs included, because the distance from the entry to yesterday's POC can be small.",
          axis: "measure",
          correct: true,
          note: "A target 10 points away is very sensitive to brokerage, taxes and slippage.",
        },
        {
          text: "The win rate alone, since profit factor depends on where the stop is placed.",
          axis: "measure",
          correct: false,
          note: "Win rate without the size of wins and losses says nothing about whether the rule pays. Both depend on the stop; that is a reason to report both.",
        },
      ],
    },
    {
      id: "rules-exit-choice",
      scenario:
        "Synthetic setup: yesterday's VAL 22,325, POC 22,337.5, VAH 22,370. Today opened below value, and your rule buys the first one-minute close back inside value, here at 22,327, with a stop 15 points below. You wrote the hypothesis down before testing: 'after a return into value from below, price reaches the FAR edge of value before 15:25 more often than chance.' You can run one test. Assume (it is an assumption, to be replaced with your measured figure) that costs and slippage are about 3 points per round trip. Which exit do you test?",
      options: [
        {
          label: "Yesterday's POC, 22,337.5",
          appeal: "Only 10.5 points away, so it should be reached often.",
        },
        {
          label: "Test both exits and trade the one with the better profit factor",
          appeal: "Uses the data to decide instead of guessing.",
        },
        {
          label: "Yesterday's VAH, 22,370 — the far edge",
          appeal: "It is the level the hypothesis is about.",
        },
        {
          label: "Half the position at the POC, half at VAH",
          appeal: "Takes some profit early and still captures a full traverse.",
        },
      ],
      best: 2,
      verdict:
        "The hypothesis is about reaching the far edge, so the exit must be the far edge; a POC exit tests a different claim. It also suffers more from costs: an assumed 3 points is about 29% of a 10.5-point gross target but about 7% of the 43 points to VAH. Testing both and keeping the better is the hidden comparison pre-registration exists to prevent. The split exit mixes two hypotheses, so the result cannot be attributed to either.",
      claims: [
        {
          text: "You accept a hit rate no higher than a POC exit would have, because every path from 22,327 to 22,370 passes through 22,337.5 first.",
          axis: "trade",
          correct: true,
          note: "Any trade that reaches VAH has already reached the POC, so the far-edge hit rate cannot exceed the POC's.",
        },
        {
          text: "You accept that many trades will end at the stop or the time exit, since the target is 43 points away rather than 10.5.",
          axis: "trade",
          correct: true,
          note: "The far target is the honest test of the hypothesis, and it costs a lot of trades that never get there.",
        },
        {
          text: "You accept higher costs per trade than the POC exit would have.",
          axis: "trade",
          correct: false,
          note: "Each trade is still one round trip, so costs per trade are the same. What differs is the costs' share of the gross target.",
        },
        {
          text: "On days that turn back down after the entry, the far edge is never reached and the trade ends at the stop or the time exit.",
          axis: "failure",
          correct: true,
          note: "The trend-day failure. The `vp-eighty` failure day shows a version of it.",
        },
        {
          text: "Because every trade that reaches VAH also passes the POC, the far-edge exit can never lose money on a trade where the POC exit would have won.",
          axis: "failure",
          correct: false,
          note: "The reverse happens: a trade can reach the POC, turn, and hit the stop. The POC exit wins that trade and the far-edge exit loses it.",
        },
        {
          text: "Each trade's maximum favourable excursion, to see how many reached the POC but never reached VAH.",
          axis: "measure",
          correct: true,
          note: "This describes where trades fail without changing the rule — useful for the NEXT pre-registered test.",
        },
        {
          text: "Results at the assumed 3-point cost and again at a higher cost, to see whether the conclusion depends on it.",
          axis: "measure",
          correct: true,
          note: "If the conclusion flips with a modest change in costs, it was never robust.",
        },
        {
          text: "The POC-exit result on the same trades, so you can choose the better exit for live trading.",
          axis: "measure",
          correct: false,
          note: "Choosing between exits after seeing both results reopens the decision you fixed in advance. A different exit is a new hypothesis for new data.",
        },
      ],
    },
    {
      id: "rules-todays-poc",
      scenario:
        "A rule reads: 'Long when the 5-minute bar closes above today's POC while zone is inside; exit at VAH.' The backtest computed 'today's POC' from the whole day's bars. On the synthetic 1 Oct, the developing POC was 22,217.5 at 13:14 and the final POC is 22,447.5. The idea you want to keep is 'price is above where TODAY has done most business'. How do you fix the rule?",
      options: [
        {
          label: "Use the developing POC built from today's bars up to and including the signal bar; place the order at the next bar's open; exit at yesterday's VAH",
          appeal: "Uses only what was known when the bar closed, and keeps the idea about today.",
        },
        {
          label: "Replace today's POC with yesterday's final POC",
          appeal: "Known from 09:15 and never moves, so look-ahead is impossible.",
        },
        {
          label: "Keep today's final POC, but only take trades after 14:00, when it has mostly settled",
          appeal: "Late in the day the final POC is usually close to the developing one.",
        },
        {
          label: "Fix the developing POC at 10:15, the end of the initial balance, and use it for the rest of the day",
          appeal: "One stable level per day, known from 10:15.",
        },
      ],
      best: 0,
      verdict:
        "The original rule used a number that did not exist until the close. The developing POC as of the signal bar is the only option that keeps the idea — today's busiest price — while using only the past, and it pins down the vague 'exit at VAH' as yesterday's VAH, known all day. Yesterday's POC is look-ahead-free but tests a different idea. 'After 14:00' still uses the final POC, and on 1 Oct the POC was still 22,217.5 at 13:14, far from the final 22,447.5. A 10:15 snapshot is legitimate but is a different, staler level.",
      claims: [
        {
          text: "You accept that the reference level moves during the day, so the same price can be above the POC at one time and below it later.",
          axis: "trade",
          correct: true,
          note: "On the synthetic 1 Oct a price of 22,300 is above the developing POC of 22,217.5 at 13:14 and below the final 22,447.5.",
        },
        {
          text: "You accept more computation: the developing profile must be updated after every bar.",
          axis: "trade",
          correct: true,
          note: "Small in practice, but a real change from a level computed once a day.",
        },
        {
          text: "You give up the zone input, because it cannot be combined with a developing level.",
          axis: "trade",
          correct: false,
          note: "Zone uses yesterday's levels; the developing POC uses today's bars so far. Both are known at the bar's close and combine without conflict.",
        },
        {
          text: "When the developing POC jumps from one hump to the other, a position entered 'above the POC' can end up far below the new POC without price moving.",
          axis: "failure",
          correct: true,
          note: "On the synthetic 1 Oct the developing POC moved from 22,217.5 at 13:14 to 22,447.5 by the close.",
        },
        {
          text: "The fixed rule will give the same backtest results as the original, because the developing and final POCs agree by the afternoon.",
          axis: "failure",
          correct: false,
          note: "On two-hump days they can disagree until late, as 1 Oct shows. The difference between the two backtests is a measure of how much the original result came from look-ahead.",
        },
        {
          text: "How often the signal fires under the fixed rule compared with the original, to see how much of the old result depended on look-ahead.",
          axis: "measure",
          correct: true,
          note: "A large drop in signals or profit tells you the original was partly trading information it did not have.",
        },
        {
          text: "The time of day each signal fires, since early developing POCs rest on only a few bars.",
          axis: "measure",
          correct: true,
          note: "A 09:30 developing POC is built from about 15 minutes of trading and can move a long way.",
        },
        {
          text: "Each entry's distance from the final POC, as the rule's reference.",
          axis: "measure",
          correct: false,
          note: "That puts the look-ahead straight back in. The final POC can be reported afterwards for description, never used as the rule's reference.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "A rule answers seven questions",
      d: "What is measured, on which bar, against which levels, known at what time, how edges count, which value-area method, and which data. Leave one out and two honest programmers will test two different rules.",
    },
    {
      t: "Today's final POC is look-ahead",
      d: "It exists only after the close. Intraday rules use the developing POC as of the bar, or yesterday's final levels.",
    },
    {
      t: "Exits fail in four predictable ways",
      d: "Gaps fill beyond the stop, levels move with bin size and method, far targets are never reached on trend days, and costs eat small targets. A backtest should show each.",
    },
    {
      t: "Write it down first; one rule, one hypothesis",
      d: "Fix the rule, data, period, metric and 'no support' result before running it. Thirty-six combinations of your three inputs are thirty-six hypotheses, not one.",
    },
  ],
  pitfalls: [
    "Using 'today's POC' in an intraday rule and computing it from the whole day. That is look-ahead bias, and it often makes a rule look excellent.",
    "Assuming a stop fills at the stop price. A gap fills you at the open, and the backtest should model that.",
    "Counting a win when one bar's range covers both the stop and the target. One-minute bars cannot show which came first; assume the worse one, or use finer data.",
    "Testing on one platform's value area and trading on another's. CBOT, Sierra Chart and TradingView methods can put VAL two rows apart on the same data.",
    "Adding a filter after seeing the results and calling it the same rule. It is a new hypothesis, tested on data you have already looked at.",
  ],
  quiz: [
    {
      q: "Yesterday's profile is shown, with value area computed by the course's rules. Today's first 5-minute bar closes at exactly 22,345. What is its zone under the course's convention, and what would a platform that treats the edge as outside report?",
      figure: {
        lo: 22300,
        step: 5,
        bins: [2, 4, 6, 9, 12, 15, 18, 14, 11, 8, 6, 4, 3, 2],
        showValueArea: true,
        caption: "Synthetic previous session, 5-point rows.",
      },
      options: [
        "Above under both conventions",
        "Inside under the course's convention; above on the edge-outside platform",
        "Inside under both conventions",
        "Below under the course's convention; inside on the other platform",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The course's rules give this profile VAH 22,345. A close exactly at VAH is inside when edges count as inside, and above when they do not. Same bar, same data, two different zones — which is why the edge convention belongs in the rule.",
      distractors: [
        "Above requires a close strictly greater than VAH under the course's convention; 22,345 equals it.",
        "",
        "A platform that treats the edge as outside calls a close at VAH 'above'.",
        "22,345 is the top edge of value, not the bottom; below would need a close under VAL, 22,310.",
      ],
    },
    {
      q: "A claimed backtest: 'Enter long at 11:00 if price is below today's POC; target today's POC. Win rate 78% over two years.' What is wrong?",
      options: [
        "Two years is too short for any test",
        "Nothing, if costs are included",
        "Win rate should be replaced by profit factor",
        "Today's POC is known only after the close, so at 11:00 the rule is using a level that did not exist yet",
      ],
      answer: 3,
      difficulty: "judge",
      why: "This is look-ahead bias. On the synthetic 1 Oct the developing POC at 13:14 was 22,217.5 and the final one 22,447.5. A rule using the final POC at 11:00 knows where the day will do most business, which no trader at 11:00 knows. The fix is the developing POC as of the bar, or yesterday's POC.",
      distractors: [
        "Two years may well be short, but it is a smaller problem than using information from the future.",
        "Costs cannot fix a rule that uses data it could not have had.",
        "Reporting profit factor would be better, but would still be computed from the same impossible trades.",
        "",
      ],
    },
    {
      q: "Yesterday's VAL is 22,290. Today's first one-minute bar has a low of 22,289 and closes at 22,295. Price never trades above yesterday's VAH all day. What is the session range at 15:00?",
      options: [
        "Inside, because price closed back inside value",
        "Below, and it stays below for the rest of the day",
        "Both",
        "It changes back to inside once price spends an hour in value",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Session range asks whether today's low so far is strictly below yesterday's VAL. 22,289 < 22,290, so it is 'below' from the first minute. It can only grow — to 'both' if price later trades strictly above VAH — and never shrinks back to inside.",
      distractors: [
        "That is the bar's zone (its close is inside). Session range looks at the high and low so far, not the close.",
        "",
        "'Both' would need a high strictly above yesterday's VAH, which the question rules out.",
        "Session range has no time decay by definition; once beyond, always beyond for that day.",
      ],
    },
    {
      q: "A claimed backtest of a fade-the-open rule uses one-minute bars, a 20-point stop and a far-edge target. When a single bar's range contains both the stop and the target, the code counts the trade as a win. What is the problem?",
      options: [
        "A one-minute bar does not record whether its high or low came first, so counting these as wins is an optimistic guess",
        "The stop is too tight",
        "Far-edge targets cannot be backtested",
        "One-minute bars are too coarse for any profile rule",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Inside a bar, the order of high and low is unknown. A conservative test assumes the stop was hit first, or resolves these bars with finer data. Counting them all as wins biases the result upwards, and fast, wide bars are exactly where such bars cluster.",
      distractors: [
        "",
        "Stop size is a design choice to test; it does not make the counting rule correct.",
        "They can; the problem is only in how ambiguous bars are scored.",
        "One-minute bars are fine for the profile and for close-based conditions; the ambiguity is specific to touch events inside one bar.",
      ],
    },
    {
      q: "A claimed result: 'I tested every combination of zone, open zone and session range — 36 in all — and the best, zone below + open zone inside + session range both, had profit factor 2.4 on 60 trades.' What is the most important problem?",
      options: [
        "Profit factor 2.4 is too high to be real",
        "Session range should never be combined with zone",
        "The best of 36 combinations looks good partly by luck, and 60 trades is a small sample; it needs a pre-registered test on new data",
        "The combination should have been tested on BANKNIFTY instead",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Searching 36 combinations and reporting the winner is 36 tests, and the winner of a search is biased upwards. With only 60 trades its interval is wide. The honest next step is to write this combination down as the one hypothesis and test it on data that played no part in finding it.",
      distractors: [
        "It may be possible; the point is that this procedure cannot tell a real 2.4 from a lucky one.",
        "Combining inputs is fine if the combination was chosen in advance.",
        "",
        "A different instrument might be a useful extra check, but it does not fix the fact that this result came from a search.",
      ],
    },
    {
      q: "A rule targets yesterday's POC, which is 12 points above the entry. The stop is 15 points below. Before any market question, which issue most deserves a number?",
      options: [
        "Whether the POC is a TPO or a volume POC",
        "Round-trip costs and slippage as a share of the 12-point gross target",
        "Whether the trade happens on an expiry day",
        "The colour of the volume bars at the POC",
      ],
      answer: 1,
      difficulty: "apply",
      why: "With a small target, costs take a large share of what a winning trade earns while adding to every losing one. A rule can look profitable gross and lose net. Measure your real costs per round trip from your own fills, and report results net of them.",
      distractors: [
        "Worth stating in the rule, but it does not change whether a 12-point target survives costs.",
        "",
        "Expiry days may behave differently and are worth flagging, but cost arithmetic applies to every trade.",
        "Profile colours describe bar direction and have no bearing on this rule.",
      ],
    },
    {
      q: "A short entered at 22,450 has a stop at 22,480. Overnight news gaps the market open to 22,530. Your backtest records a loss of 30 points. What should it record?",
      options: [
        "30 points; the stop was at 22,480",
        "Nothing; trades with gaps should be dropped from the sample",
        "Zero; gaps are outside trading hours",
        "About 80 points or more: the stop fills near the open, at 22,530 or worse",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A stop becomes a market order once price passes it, and price passed it with no trading in between. The fill is the opening price or worse. Assuming the stop price makes overnight risk look smaller than it is, and the error falls only on losing trades.",
      distractors: [
        "That assumes a fill at a price that never traded.",
        "Dropping the worst trades is itself a bias, and live trading cannot drop them.",
        "The position was held overnight, so the gap is exactly the risk it took.",
        "",
      ],
    },
    {
      q: "Which statement best describes pre-registration for a profile rule?",
      options: [
        "Writing down the complete rule, data, period, metric and what would count as 'no support' — with a date — before running the test",
        "Registering the strategy with the exchange",
        "Running the test first and then writing down the version that worked",
        "Testing only on out-of-sample data",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Pre-registration fixes every choice before results can influence it, so the test is one test rather than a hidden search. Out-of-sample data is a good complement, but a rule tuned after peeking at out-of-sample results is not pre-registered either.",
      distractors: [
        "",
        "Exchange registration is a regulatory matter, unrelated to how a test is designed.",
        "That is the opposite: the choices are made after seeing the results, which is the problem pre-registration prevents.",
        "Out-of-sample testing helps, but it is a different practice; you can peek at out-of-sample data too.",
      ],
    },
  ],
};

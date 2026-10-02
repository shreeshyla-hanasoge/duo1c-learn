import type { Topic } from "../../types.ts";

export const vpHonestEdge: Topic = {
  id: "vp-honest-edge",
  title: "Being honest about edge",
  tier: 1,
  depth: "deep",
  summary:
    "Read intervals, not headline numbers; expect patterns from slicing; and say only what the data can show.",
  why: "Every backtest produces differences between groups, and most of them are noise. The skill is not finding a pattern — slicing guarantees you will — but telling a pattern the data can support from one it cannot. Your own study of 1,191 NIFTY put-buying trades is a clear example of a result that looks like a finding and, read carefully, is something more useful: a reason not to add a filter.",
  viz: ["vp-noise"],
  learn: {
    intuition:
      "Toss ten coins three times and write down how many heads each round gives: perhaps 6, 4 and 5. Nobody would say the first round's coins were better. Yet that is what happens when a backtest splits trades into 'below value', 'inside value' and 'above value' and reads the three profit factors as a ranking. Each group is a sample, and samples differ by chance. The questions to ask are how big the chance differences would be (that is what an interval shows), whether the ranking holds up in separate periods (if it flips every year, chance is the simplest explanation), and how many ways you sliced the data before finding the pattern (the more slices, the more striking the best one looks by luck). None of this says patterns are never real. It says what the data can and cannot show, and what kind of test would show more.",
    mechanics: [
      {
        heading: "A point estimate is one draw; the interval shows how much it could move",
        body: "Profit factor (money won divided by money lost) computed on a few hundred trades is a single estimate. A bootstrap interval shows its uncertainty: resample the trades with replacement many times, recompute the profit factor each time, and keep the middle 90% of results. `vp-noise` does this with 400 resamples per group. When two groups' intervals overlap heavily, the data cannot tell them apart, whatever their headline numbers. One caution: the simple bootstrap treats trades as independent. Trades on the same day or in the same volatile week are not, so the true uncertainty is usually wider than the interval shows.",
      },
      {
        heading: "Multiple comparisons: the more you look, the better the best looks",
        body: "Test enough variations and some will look excellent by luck. The statistics for this are established. White (2000), in Econometrica, gives the Reality Check: a test of whether the best model found in a search beats a benchmark once the search itself is accounted for. Hansen (2005) proposes a more powerful version that is less thrown off by poor or irrelevant alternatives (from a summary). Bailey and co-authors show that with five years of daily data, trying 45 or more independent strategy variants makes it more likely than not that the best one shows an in-sample Sharpe ratio of at least 1.0 by chance alone. Harvey and Liu (2015) show that the 'halve the Sharpe ratio' rule of thumb is wrong: the right haircut is much larger than 50% for marginal strategies and at most about 25% for those with annual Sharpe above 1.0, under their assumptions. Harvey, Liu and Zhu (2016) argue that after so much data mining, a new finding should clear a t-statistic of 3, not 2 (from the abstract).",
      },
      {
        heading: "Slices shrink samples fast",
        body: "1,191 trades split three ways by zone is, on average, about 400 per zone. Split each zone by four years and it is about 100. Split by zone × open zone × weekday — the 45 slices `vp-noise` uses — and the average slice has about 26 trades, or six or seven per slice per year. A profit factor computed on six trades can be turned upside down by one large winner, so a slice can look terrible, or excellent, year after year purely by chance. How often that happens depends on how many slices you made, how strict the test is and how profitable the strategy is overall. `vp-noise` measures this rather than asserting it. In its main simulated world one of the 45 slices lost money in every one of the four years; across 120 more worlds built the same way, about half had at least one such slice and roughly one in six had two or more — with zone having no effect anywhere. More slices, a less profitable strategy, or a looser test such as 'lost in three of four years' makes chance pockets more common still. That is why 'how many slices did I look at, and how strict was the test?' must be answered before a losing pocket is believed.",
      },
      {
        heading: "An ordering that flips each year is the signature of noise",
        body: "If entry zone had a real, stable effect, the ranking of zones should mostly survive from one year to the next. A ranking that changes every year is what noise produces. `vp-noise` is a SIMULATION in which zone has no effect at all — every trade is drawn from the same distribution — and its three profit factors still come out at 1.84 below, 1.52 inside and 1.84 above — a spread as wide as your study's. Year by year the order changes: below first in 2023, above first in 2024 and 2025, inside first in 2026 — three different orderings in four years from no effect. A flip can also mean a real effect that depends on the regime (the kind of market at the time), but data that cannot separate those two explanations cannot support a filter either.",
      },
      {
        heading: "Costs: a gross edge is not yet an edge",
        body: "Buying NIFTY options costs more than the premium. There is brokerage, Securities Transaction Tax (STT) and other statutory charges, exchange fees and slippage — the gap between the price you expected and the price you got, which on options can be large relative to a small premium. Check the current rates with your broker; they change. Two things follow. A profit factor computed before costs overstates the edge, and a small difference between groups can vanish after costs. And costs need not be equal across groups: if 'above value' entries happen at busier, faster moments, their slippage may differ. Compare groups net of costs.",
      },
    ],
    complexityDerivation:
      "We found no peer-reviewed study that tests Market Profile or value-area rules with proper statistics; that absence is itself the main finding of our research notes. What does exist is a well-established literature on testing trading rules honestly. White (2000) introduced the Reality Check for data snooping (abstract read). Sullivan, Timmermann and White (1999) applied it to a large universe of technical rules on about a century of Dow Jones data; as summarised by Hsu and Kuan, that work and White's found no simple rule that stays profitable after correcting for data snooping on the Dow, the S&P 500 or S&P 500 futures (secondary). Hsu and Kuan themselves found rules that did survive on the NASDAQ Composite and Russell 2000 (abstract read), so correction does not always kill a result. Hansen's 2005 SPA test is a more powerful refinement (secondary). Bailey et al. quantify how few variants it takes to produce an impressive Sharpe ratio by chance (read). Harvey and Liu give multiple-testing haircuts (read); Harvey, Liu and Zhu propose t > 3 (secondary). Closest to profiles, Osler (2000) tested support and resistance levels published by FX firms against random levels: prices bounced 60.8% of the time at published levels versus 56.2% at arbitrary ones — a small edge, measured against a random baseline, without testing profits (read). That random-baseline design is the model for testing any profile level.",
    variants: [
      {
        name: "Bootstrap interval",
        when: "You want to know how uncertain one group's profit factor or win rate is.",
        delta:
          "Resample trades with replacement and recompute. Simple and assumption-light, but it treats trades as independent, so clustered trades make it too narrow.",
      },
      {
        name: "Out-of-sample or forward test",
        when: "A hypothesis came from looking at data; you need data that played no part in finding it.",
        delta:
          "The cleanest check, if the hold-out really is untouched. Bailey et al. argue a single hold-out is unreliable for backtests and propose combinatorial cross-validation instead (from an abstract, secondary).",
      },
      {
        name: "Data-snooping tests: Reality Check and SPA",
        when: "You have searched many rules and want to know whether the best one beats a benchmark after accounting for the search.",
        delta:
          "Needs a record of every variant tried, including the ones you discarded. Without that list, the correction cannot be applied.",
      },
      {
        name: "Multiple-testing hurdles: haircuts, t > 3, deflated Sharpe",
        when: "You want a quick sense of how much a reported result shrinks once the search behind it is counted.",
        delta:
          "Harvey and Liu's haircut is nonlinear and largest for marginal results; Bailey and López de Prado's deflated Sharpe ratio adjusts for selection, short samples and non-normal returns (from an abstract).",
      },
    ],
    tradeoffs: [
      {
        vs: "Adding the zone filter that looked best",
        pick: "No filter until a pre-registered test on new data supports it",
        because:
          "A filter cuts the sample, which widens every later interval, and if the difference was noise it removes good trades as readily as bad ones. Waiting costs nothing if there is no effect, and only a small, unproven gain if there is one.",
      },
      {
        vs: "Excluding the slices that lost",
        pick: "Keep them, and treat them as hypotheses for new data",
        because:
          "Slices found after searching can include some that look consistently bad by chance, and the more slices you make the likelier that is. Removing them raises the backtest's profit factor by construction, on the very data that found them, so that improvement is not evidence.",
      },
      {
        vs: "Testing many more variants on the same data",
        pick: "Fewer variants, each with more data, declared in advance",
        because:
          "Each extra variant lowers the bar for a lucky winner; Bailey et al. put the danger point at 45 variants for five years of daily data. More data per hypothesis narrows intervals; more hypotheses per dataset widens the search.",
      },
    ],
  },
  realWorld: [
    {
      system: "Your study — 1,191 NIFTY put-buying trades, 2023 to 2026",
      kind: "yours",
      problem:
        "Does entry location relative to the previous day's value area change the outcome of NIFTY put-buying trades?",
      applied:
        "Across 1,191 trades from 2023 to 2026, entry location relative to the previous day's value area barely changed outcomes: profit factor 1.90 below value, 1.75 inside, 1.51 above, with heavily overlapping confidence intervals and a different ordering each year. Only two small pockets lost consistently.",
      impact:
        "This data cannot show that zone matters — a reason not to add a zone filter, and the starting point for a pre-registered test",
    },
    {
      system: "Technical trading rules after data-snooping correction",
      kind: "industry",
      problem:
        "Decades of papers reported profitable chart rules on US indices. How many survive once the search for them is accounted for?",
      applied:
        "Sullivan, Timmermann and White (1999) applied White's Reality Check to a large universe of technical rules on about a century of Dow Jones data. As summarised by Hsu and Kuan, that work and White (2000) found no simple rule profitable after correction for the Dow, the S&P 500 or S&P 500 futures (secondary). Hsu and Kuan did find surviving rules on the NASDAQ Composite and Russell 2000 (abstract read).",
      evidence:
        "Sullivan, Timmermann & White, Journal of Finance 54(5), 1999; White, Econometrica 68(5), 2000; Hsu & Kuan working paper",
      impact: "Correction removes many apparent edges, but not always all of them",
    },
    {
      system: "How few variants it takes to find a 'great' strategy",
      kind: "industry",
      problem:
        "A researcher tries a few dozen parameter settings and finds one with an in-sample Sharpe ratio above 1.",
      applied:
        "Work by Bailey and colleagues (Notices of the AMS, 2014), as summarised in a later paper by Bailey, Ger, López de Prado, Sim and Wu, shows that with five years of daily data, 45 or more independent variants make it more likely than not that the best shows an in-sample Sharpe of at least 1.0 by chance.",
      evidence:
        "Bailey, Ger, López de Prado, Sim & Wu, 'Statistical Overfitting and Backtest Performance', summarising Notices of the AMS 61(5), 2014",
      impact: "A good-looking Sharpe ratio is cheap to find; it is expensive to confirm",
    },
    {
      system: "Testing a level against random levels — Osler (2000)",
      kind: "industry",
      problem:
        "Do support and resistance levels published by FX firms work better than arbitrary price levels?",
      applied:
        "Osler compared intraday currency rates at levels published by six firms (1996–1998) with artificial random levels using a bootstrap. Rates bounced at published levels 60.8% of the time against 56.2% at arbitrary levels; the firms' own 'strength' ratings had no value. Profitability was not tested.",
      evidence: "Osler, FRBNY Economic Policy Review 6(2), 2000",
      impact: "The right comparison for any profile level is a random level, not zero",
    },
  ],
  cases: [
    {
      id: "edge-zone-filter",
      scenario:
        "Your study of 1,191 NIFTY put-buying trades (2023 to 2026) found profit factor 1.90 below the previous day's value, 1.75 inside and 1.51 above, with heavily overlapping confidence intervals and a different ordering each year. A colleague suggests adding a zone filter before the next month. You want any change to be supported by the data you have. What do you do?",
      options: [
        {
          label: "Take only trades below value, the best group",
          appeal: "1.90 is the highest profit factor, so dropping the rest should improve the strategy.",
        },
        {
          label: "Add no filter now; write down a single zone comparison and test it on trades taken from now on",
          appeal: "Changes nothing the data cannot support, and sets up a test that could.",
        },
        {
          label: "Drop only trades above value, the worst group",
          appeal: "A milder change: it only removes the group with the lowest number.",
        },
        {
          label: "Size positions by each zone's profit factor",
          appeal: "Uses all the information without throwing any trades away.",
        },
      ],
      best: 1,
      verdict:
        "The intervals overlap heavily and the ordering changes every year — the pattern noise produces, as the zero-effect simulation in `vp-noise` shows. The data you have cannot support any zone-based change, and every option except the second makes one. Filtering also shrinks the sample, so any later test has less to work with. Writing down one comparison now and testing it on new trades is the only route to an answer the data can support.",
      claims: [
        {
          text: "You accept that a real but small zone effect, if one exists, goes unused until a test can show it.",
          axis: "trade",
          correct: true,
          note: "The honest cost of waiting. Given the overlapping intervals, the effect you might be missing is too uncertain to act on.",
        },
        {
          text: "You keep the full sample, so future results are measured with narrower intervals than if only one zone's trades were kept.",
          axis: "trade",
          correct: true,
          note: "More trades per comparison means less uncertainty; a filter removes a share of the trades and widens the interval of what remains.",
        },
        {
          text: "You accept that zone does not matter.",
          axis: "trade",
          correct: false,
          note: "That is the over-reading in the other direction. The conclusion is that this data cannot show that zone matters, which is different.",
        },
        {
          text: "If a zone effect is real and becomes large in some future regime, the unfiltered strategy will not exploit it until the new test detects it.",
          axis: "failure",
          correct: true,
          note: "The genuine risk of waiting, and the reason the new test should be designed to detect an effect of a stated size.",
        },
        {
          text: "Without a filter, the strategy's profit factor will fall to the 1.51 seen above value.",
          axis: "failure",
          correct: false,
          note: "The unfiltered strategy is the blend of all three groups, which is what produced the overall result in the first place. Nothing about leaving it unchanged pushes it to the lowest group's figure.",
        },
        {
          text: "Zone outcomes on trades taken after today, compared exactly as written down in advance and kept apart from the 2023–2026 data.",
          axis: "measure",
          correct: true,
          note: "New data that played no part in suggesting the hypothesis is what can change the conclusion.",
        },
        {
          text: "How each zone's interval narrows as new trades arrive, to judge when the data could separate a difference of the size seen.",
          axis: "measure",
          correct: true,
          note: "Tells you in advance how long the test needs to run, rather than stopping when the result looks good.",
        },
        {
          text: "Which zone had the highest profit factor in the most recent year, to choose the filter.",
          axis: "measure",
          correct: false,
          note: "The ordering changed every year; picking the latest winner is chasing noise with an even smaller sample.",
        },
      ],
    },
    {
      id: "edge-losing-pockets",
      scenario:
        "The same study found only two small pockets that lost consistently. Excluding them would raise the backtested profit factor. Before you looked, you had not predicted these pockets; they were found by slicing the trades. What do you do with them?",
      options: [
        {
          label: "Exclude both pockets from live trading now",
          appeal: "They lost consistently, so cutting them looks like free improvement.",
        },
        {
          label: "Halve position size in the pockets",
          appeal: "A compromise between acting and waiting.",
        },
        {
          label: "Exclude them and re-run the 2023–2026 backtest to confirm the improvement",
          appeal: "Checks the change before trusting it.",
        },
        {
          label: "Keep trading them; record how many slices were examined, and write the two pockets down as hypotheses to check on new trades",
          appeal: "Treats them as what they are — patterns found by search — without throwing them away or believing them yet.",
        },
      ],
      best: 3,
      verdict:
        "Pockets found by slicing may be nothing more than what slicing produces: the more slices, the more chances for some to look consistently bad by luck, especially when each holds only a handful of trades per year. Removing them raises the backtest's profit factor by construction, so re-running the same backtest confirms nothing. Halving size is still acting on an unconfirmed pattern. Keeping them, counting the slices examined, and checking the two pockets on new trades is the only option that can tell luck from a real effect.",
      claims: [
        {
          text: "You accept reporting a lower in-sample profit factor than the version with the pockets removed.",
          axis: "trade",
          correct: true,
          note: "The cosmetic cost. The higher figure would come from removing trades the data itself selected as bad, which is not evidence.",
        },
        {
          text: "You accept continuing to take trades in slices that lost in every year of the study.",
          axis: "trade",
          correct: true,
          note: "Uncomfortable, and correct if the pockets are luck. The new-data check is what limits how long you carry this.",
        },
        {
          text: "You accept that the pockets are definitely noise.",
          axis: "trade",
          correct: false,
          note: "Nobody can know that from this data. The decision is to treat them as unproven, not as disproven.",
        },
        {
          text: "If a pocket reflects a real effect, you keep losing in it until the new data shows it.",
          axis: "failure",
          correct: true,
          note: "The real risk of keeping them. It is bounded by how small the pockets are and by fixing in advance when the check will be made.",
        },
        {
          text: "Re-running the 2023–2026 backtest without the pockets would show whether excluding them works.",
          axis: "failure",
          correct: false,
          note: "It is circular: the pockets were chosen because they lost in that data, so removing them must improve that data's result.",
        },
        {
          text: "The total number of slices examined when the two pockets were found.",
          axis: "measure",
          correct: true,
          note: "Two consistent losers among five slices would be surprising; two among fifty is roughly what chance could produce. The count changes the reading.",
        },
        {
          text: "The pockets' results on trades after the study period, with their definitions left exactly as they are.",
          axis: "measure",
          correct: true,
          note: "New data, unchanged definitions: the only clean check. Redefining a pocket after seeing new results restarts the search.",
        },
        {
          text: "The pockets' combined profit factor over 2023–2026, as proof that they lose.",
          axis: "measure",
          correct: false,
          note: "That is the number that selected them. It cannot also be the evidence that confirms them.",
        },
      ],
    },
    {
      id: "edge-next-test",
      scenario:
        "You want a test that could actually change the conclusion about entry zone. The 2023–2026 trades have already been examined many ways. You can keep running the same put-buying strategy with its usual rules. How do you design the next test?",
      options: [
        {
          label: "Pre-register one comparison — below-value entries against all others, profit factor net of costs, with its interval — and fix the sample size or end date in advance; run it only on trades taken from now on",
          appeal: "One question, decided in advance, answered on data that played no part in suggesting it.",
        },
        {
          label: "Re-run 2023–2026 with five finer zones instead of three",
          appeal: "More detail might reveal an effect the three broad zones hid.",
        },
        {
          label: "Test 20 new profile filters on 2023–2026 and apply a Reality Check correction",
          appeal: "Uses a proper data-snooping test, so the search is accounted for.",
        },
        {
          label: "Walk-forward optimise the zone boundaries year by year on 2023–2026",
          appeal: "Each year is tested on boundaries fitted only to earlier years.",
        },
      ],
      best: 0,
      verdict:
        "The 2023–2026 data has already been looked at many ways, and every option that reuses it inherits that history; finer zones also shrink each group, widening intervals. A Reality Check is a good tool, but it can only correct for the variants you list, and the zone hypothesis itself came from this data. Walk-forward on four years gives very few test periods and still reuses data already examined. A single pre-registered comparison on new trades, with its size or end date fixed, is the test whose result can be taken at face value.",
      claims: [
        {
          text: "You accept waiting for new trades to accumulate before you get an answer.",
          axis: "trade",
          correct: true,
          note: "The main cost. Fixing the sample size or end date in advance tells you how long.",
        },
        {
          text: "You accept that one comparison can only answer the one question it states.",
          axis: "trade",
          correct: true,
          note: "That narrowness is what makes the answer believable.",
        },
        {
          text: "You accept that the result cannot be wrong, since it is pre-registered.",
          axis: "trade",
          correct: false,
          note: "Pre-registration removes the search bias. A small or unlucky sample can still mislead, which is why the interval is part of the result.",
        },
        {
          text: "If the new sample is small, the interval may still be wide and the test inconclusive — which is why the sample size or end date is fixed beforehand.",
          axis: "failure",
          correct: true,
          note: "An inconclusive result is a real possibility, and saying so in advance prevents extending the test until it 'works'.",
        },
        {
          text: "Market regime changes cannot affect a pre-registered test.",
          axis: "failure",
          correct: false,
          note: "Pre-registration controls how you test, not what the market does. A new regime can change the result, and that is worth recording alongside it.",
        },
        {
          text: "The profit-factor difference with its interval, net of brokerage, STT and slippage.",
          axis: "measure",
          correct: true,
          note: "The measure fixed in advance, and net of costs, because a gross difference may not survive them.",
        },
        {
          text: "A written statement, made before starting, of which interval results would count as support and which would not.",
          axis: "measure",
          correct: true,
          note: "Without it, any result can be read as support after the fact.",
        },
        {
          text: "Monthly checks of the result, stopping as soon as the difference looks significant.",
          axis: "measure",
          correct: false,
          note: "Stopping when the result looks good is another form of searching: given enough looks, noise will cross the line at some point.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "Overlapping intervals mean the data cannot tell the groups apart",
      d: "Profit factors of 1.90, 1.75 and 1.51 look like a ranking. With heavily overlapping intervals they are three estimates of what may be the same thing.",
    },
    {
      t: "An ordering that flips each year is noise's signature",
      d: "In the `vp-noise` simulation zone has no effect, yet the best zone changes from year to year. A stable effect should mostly keep its rank.",
    },
    {
      t: "Pockets found by slicing can be luck",
      d: "Slice 1,191 trades 45 ways and the average slice holds about 26 trades, six or seven per year. Small slices can look consistently bad by chance. Count the slices, and note how strict the test was, before believing one.",
    },
    {
      t: "'Cannot show' is not 'does not matter'",
      d: "The honest conclusion is that this data cannot show zone matters. A pre-registered test on new trades, or a much larger effect, is what could change it.",
    },
  ],
  pitfalls: [
    "Ranking groups by their headline profit factors without looking at the intervals. Differences inside the noise are not findings.",
    "Excluding slices that lost and reporting the improved backtest. The improvement is built in, because the data picked the slices.",
    "Concluding 'zone does not matter' from an inconclusive test. The data failed to show an effect; it did not show there is none.",
    "Comparing groups before costs. Brokerage, STT and slippage on options can erase a small gross difference, and need not fall equally on every group.",
    "Keeping no record of the variants you tried. Without the full list, no data-snooping correction can be applied, and the best result cannot be judged.",
  ],
  quiz: [
    {
      q: "Three groups of trades have profit factors 1.90, 1.75 and 1.51, and their confidence intervals overlap heavily. What can you conclude?",
      options: [
        "The first group is best and should be traded alone",
        "The data cannot tell the three groups apart",
        "The groups are proven to be identical",
        "The last group loses money",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Heavily overlapping intervals mean differences of this size are within what chance alone produces. That is not proof the groups are the same — only that this data cannot separate them.",
      distractors: [
        "The headline order is one draw. With overlapping intervals another sample could easily reverse it.",
        "",
        "Overlap means 'cannot tell apart', not 'shown to be equal'. A small real difference could hide inside the intervals.",
        "A profit factor of 1.51 means winners exceeded losers in that group; nothing here says it loses.",
      ],
    },
    {
      q: "A claimed backtest: 'I tried 60 variants of a NIFTY strategy on five years of daily data. The best has an in-sample Sharpe ratio of 1.1, so I'm going live.' What does the research say about this?",
      options: [
        "A Sharpe above 1 is always significant",
        "With 60 variants the best one should be halved to 0.55 and then trusted",
        "Bailey and co-authors show that with five years of daily data, 45 or more variants make a best in-sample Sharpe of at least 1.0 more likely than not by chance",
        "In-sample Sharpe ratios are unbiased",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Sixty variants is past the point where a Sharpe of 1 or more is expected from luck alone. The result needs a test that accounts for the search, or new data that played no part in finding it.",
      distractors: [
        "Significance depends on how many things were tried. A single Sharpe ratio without the count cannot be judged.",
        "Harvey and Liu show the 50% haircut rule of thumb is wrong — the right haircut is nonlinear, much larger for marginal results.",
        "",
        "The best of many in-sample results is biased upwards by the selection itself.",
      ],
    },
    {
      q: "Your zone results rank below > inside > above in one year, above > below > inside the next, and inside first the year after. What is the most reasonable reading?",
      options: [
        "Zone matters, but the market keeps changing which zone works",
        "The data is corrupt",
        "Inside value is the best zone, because it was best most recently",
        "The pattern is what noise produces; the data cannot show a stable zone effect, and a regime-dependent effect could not be told apart from it",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A real, stable effect should mostly keep its rank across separate years. The `vp-noise` simulation, where zone has no effect, shows exactly this kind of flipping. A regime story is possible, but it explains any pattern after the fact, so it cannot be acted on without a test.",
      distractors: [
        "Possible, but unfalsifiable as stated: any ordering in any year fits it. It needs a prediction made in advance.",
        "Flipping rankings are a normal result of sampling noise, not a sign of bad data.",
        "Picking the most recent winner uses the smallest and noisiest sample of all.",
        "",
      ],
    },
    {
      q: "A claimed result: 'Sliced my trades 45 ways. Two slices lost in every year. Excluding them raised profit factor from 1.7 to 1.9.' (Hypothetical numbers.) What is wrong?",
      options: [
        "The improvement is built in: the data chose the slices, so removing them must improve that data's result, and with 45 small slices some can lose consistently by chance",
        "Nothing; losing in every year is strong evidence",
        "The profit factor should have been computed per slice",
        "Slices should be by month, not by year",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Each of 45 slices from about 1,200 trades holds roughly 26 trades, six or seven per year, so 'lost every year' can happen by luck. Re-measuring on the same data cannot confirm anything; only new trades, with the slice definitions unchanged, can.",
      distractors: [
        "",
        "It would be strong evidence for a slice named BEFORE looking. Found after a 45-way search, it is expected.",
        "Per-slice profit factors are how the slices were found; computing them again changes nothing.",
        "Finer slicing makes the samples smaller and the problem worse.",
      ],
    },
    {
      q: "A colleague 'corrects' every backtest Sharpe ratio by halving it. What do Harvey and Liu (2015) say about this?",
      options: [
        "Halving is exactly right",
        "No correction is ever needed",
        "Only Sharpe ratios above 2 need correcting",
        "The right haircut is nonlinear: much more than 50% for marginal strategies, and at most about 25% for those with annual Sharpe above 1.0, under their assumptions",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Harvey and Liu show the 50% rule of thumb is wrong in both directions. Weak results deserve far more scepticism than halving gives them; strong ones somewhat less.",
      distractors: [
        "That is the industry rule of thumb they set out to correct.",
        "Their paper exists because multiple testing inflates reported results.",
        "The haircut is largest for MARGINAL results, not the strongest ones.",
        "",
      ],
    },
    {
      q: "Which sentence states the honest conclusion of your 1,191-trade zone study?",
      options: [
        "Zone does not matter for NIFTY put buying",
        "Entering below value is better, as the profit factors show",
        "This data cannot show that entry zone matters",
        "The study failed and should be discarded",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Overlapping intervals and a different ordering each year mean the data cannot separate the zones. That is a result, and a useful one: it argues against adding a filter. It does not prove zone is irrelevant.",
      distractors: [
        "That claims more than the data shows. An effect smaller than the noise could still exist.",
        "Reads the headline numbers as a ranking, ignoring the intervals and the flipping orderings.",
        "",
        "An inconclusive result is informative. It stops you adding a filter that would only cut the sample.",
      ],
    },
    {
      q: "What would most legitimately change the conclusion that the data cannot show zone matters?",
      options: [
        "Re-running the same 2023–2026 trades with different confidence-interval settings",
        "A pre-registered comparison on new trades whose interval, net of costs, rules out a zero difference",
        "Finding a third losing pocket",
        "A higher profit factor for below-value trades in the latest month",
      ],
      answer: 1,
      difficulty: "apply",
      why: "New data that played no part in forming the hypothesis, a comparison fixed in advance, and a difference large enough that its interval excludes zero after costs — that is evidence. Each other option reuses or slices the data that has already been searched.",
      distractors: [
        "Changing the interval settings until the answer changes is another search on the same data.",
        "",
        "One more pocket from more slicing is exactly what chance produces.",
        "One month is a tiny sample, and choosing to look at it after the fact is another comparison.",
      ],
    },
    {
      q: "A claimed backtest of NIFTY put buying reports profit factor 1.6, computed from option mid prices with no costs. What is the main problem?",
      options: [
        "Profit factor is the wrong metric for options",
        "Mid prices are always higher than traded prices",
        "Put buying cannot be backtested",
        "Buyers pay the offer and sellers receive the bid, and brokerage, STT, other charges and slippage come on top; a gross 1.6 may be much lower net",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A buyer typically pays above the mid and sells below it, and every round trip carries brokerage, taxes and fees. On small premiums those costs are a large share of each trade. Report results net of your measured costs.",
      distractors: [
        "Profit factor is fine; it simply has to be computed from realistic fills.",
        "The mid is between bid and ask by definition; the issue is that a buyer pays the ask and sells at the bid.",
        "It can, with realistic fills and costs; the problem is this test's assumptions.",
        "",
      ],
    },
  ],
};

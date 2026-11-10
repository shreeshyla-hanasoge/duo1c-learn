import type { Topic } from "../../types.ts";

export const sdBacktestLiveParity: Topic = {
  id: "sd-backtest-live-parity",
  title: "Backtest, paper and live: one code path",
  tier: 3,
  week: 6,
  depth: "deep",
  summary:
    "A backtest is only evidence if its code is the code that trades. Share the decision logic, swap the data source and order adapter, and test the seam.",
  why: "You have a backtest engine, a paper mode and a live mode, and one bug class kept returning in different disguises because their rule evaluators were written separately. If the backtest decides differently from live, every number on the results page is about a strategy you are not running. You need the vocabulary for this: look-ahead bias, shared core, adapters, parity tests. You also need an honest answer to which parts of Traed are already shared and which are not.",
  learn: {
    intuition:
      "Picture a restaurant with a practice kitchen at home. You test a recipe there for weeks. Then the restaurant opens and a cook copies the recipe by hand onto a new card. Months pass. Each kitchen gets its own small edits: a pinch more salt here, a shorter cook time there. Soon the dish that won praise in the practice kitchen is not the dish the restaurant serves, and nobody can say when it changed. The fix is dull: one recipe card, used in both kitchens. Only the stove and the delivery of ingredients differ. There is also a trap on the practice side. At home you can taste tomorrow's menu before you cook it. A backtest has the same temptation: it holds the whole day's candles in memory, and it is easy to let a rule glance at a number that did not exist yet at that minute. Two ideas, then. Keep one decision path. Never let it see the future.",
    mechanics: [
      {
        heading: "Why two implementations drift",
        body: "When backtest and live each have their own rule evaluator, every change has to be made twice and nobody does that perfectly. Operators behave a little differently, a missing value is treated as false in one and as an error in the other, a symbol name is normalised in one place only. Each difference is small and each one hides until a real trade disagrees with a simulated one. The cost is not the bug count. It is that the backtest stops being evidence: its results describe code you do not run. One copy of the decision logic turns a whole class of bugs into one bug, fixed once.",
      },
      {
        heading: "Look-ahead bias: when does a bar exist?",
        body: "A 15-minute bar stamped 10:00 covers 10:00 to 10:15. Its close is unknown until 10:15, so a rule that reads that close at 10:07 is cheating. The safe convention: a signal is confirmed on the bar's close and the order fills at the next bar's open. Traed's equity backtester does exactly this (`ARCHITECTURE.md` §5.3). Subtler is a coarse indicator read between its own closes. A 1-hour value stored under the 10:00 key was built from the 11:00 close, so a 5-minute loop reading it at 10:05 sees the future. The cure is to read the latest bar that has closed, never the one still forming.",
      },
      {
        heading: "Shared core, different edges",
        body: "The pattern used by LEAN, Zipline and NautilusTrader is one strategy and rule core with two things swapped at the edges: an event source (historical bars or a live feed) and an execution adapter (a simulated fill or a broker call). Traed shows the shape in its mode table: backtest, paper and live differ in the data provider and the order executor (`ARCHITECTURE.md` §7). Be exact about what is shared. Comparison and crossover logic lives in one `condition_core` used by both backtest paths, while the live executor still has its own rule evaluator that calls shared operand helpers.",
      },
      {
        heading: "Parity tests, and what can never match",
        body: "A parity test feeds one recorded input through both paths and asserts the same decisions at every step. Traed's anchored-VWAP parity test pushes 323 five-minute bars through the backtest evaluator and the live executor and compares the signal on every bar. It caught a trap in the test itself: backtest computes once over the whole series, live recomputes over a sliding window, so the window shapes had to be pinned equal first. Parity covers decisions, not money. Fills, queue position, slippage and latency cannot be identical, because the exchange is not in your test. Compare signals exactly; compare fills statistically.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep backtest, paper and live on one family of rule code, and we swap only the data provider and the order executor. A signal is confirmed on a bar's close and filled at the next open, so the backtest cannot see the future. We have not finished the job: the options and equity backtests share one comparison core, but the live executor keeps its own rule evaluator, and we left it alone on purpose because it works and is the riskiest code to touch. Parity tests guard that seam for path-dependent indicators. We accept that paper fills are simulated and optimistic. We would revisit the live evaluator the first time a signal differs between the two.",
      },
    ],
    complexityDerivation:
      "The invariant is simple to state: given the same bars, the backtest and the live path must make the same decision. Sharing code protects it by construction, because there is nothing left to disagree. Look-ahead protection adds a second invariant: a decision at time t may use only data that was final at t. Both are cheap to hold while there is one evaluator and one person. They stop holding in three places. First, anything path-dependent, such as an indicator whose value depends on where its calculation started, can differ between a batch run and a streaming run even with identical code, because the windows differ. Second, the edges: fills, latency and partial fills are properties of the market, not of your code, so no amount of sharing makes them match. Third, scale of change. With one developer a duplicate evaluator costs a few hours a month. With several teams the same duplication produces permanent disagreement, and the shared core plus a parity suite becomes the only cheap way to keep trust. Parity is also not a licence to ignore the fill model: a perfectly shared core with a naive fill assumption still produces misleading results.",
    variants: [
      {
        name: "Single codebase, adapters at the edges",
        when: "You control both research and production code and want the backtest to be a rehearsal of the real thing.",
        delta:
          "The strategy sees one interface. Replay and live feeds implement the same event stream, and a simulated broker and a real broker implement the same order interface. LEAN and NautilusTrader work this way.",
      },
      {
        name: "Vectorised research, separate production engine",
        when: "Research wants fast array maths over years of data, while production is an event loop.",
        delta:
          "Quick to explore, but two implementations exist by design. You need a parity harness that replays recorded data through the event loop and diffs it against the vectorised result.",
      },
      {
        name: "Forward test on live data (paper)",
        when: "You want evidence that the live data path, timing and fills behave, without risking money.",
        delta:
          "Runs the real feed and the real decision code with a simulated broker. It catches data and timing issues a backtest cannot, but its fills are modelled, so it still overstates live results.",
      },
    ],
    tradeoffs: [
      {
        vs: "Rewriting live onto the shared core now",
        pick: "A parity harness first, migration later",
        because:
          "The live path already trades and is the most expensive thing to break. A harness that diffs signals on recorded bars proves the migration is safe, and it is useful even if you never migrate.",
      },
      {
        vs: "Fill at the signal bar's close",
        pick: "Fill at the next bar's open",
        because:
          "The close is only known when the bar ends, and you cannot trade at it. The next open is the first price you could actually have got. It is more conservative and removes a quiet source of optimism.",
      },
      {
        vs: "Demanding identical P&L across modes",
        pick: "Identical signals, statistically similar fills",
        because:
          "Signals are your code and can match exactly. Fills depend on the market and cannot. Chasing equal rupees pushes you to tune the fill model until it fits one sample, which is overfitting by another name.",
      },
    ],
  },
  realWorld: [
    {
      system: "QuantConnect LEAN",
      kind: "industry",
      problem:
        "Researchers want to test an algorithm on history and then run the same algorithm live without rewriting it.",
      applied:
        "LEAN's documentation describes one algorithm class driven by interchangeable handlers: a data feed, a transaction handler, a results handler. Backtesting plugs in a history reader and a simulated fill model; live plugs in a brokerage and a live feed. The algorithm itself does not change.",
      evidence: "QuantConnect LEAN open-source engine documentation: architecture and handlers",
      impact:
        "A strategy's logic is written once, so a difference between backtest and live points at data, timing or fills, not at a second copy of the code.",
    },
    {
      system: "NautilusTrader backtest and live nodes",
      kind: "industry",
      problem:
        "A Python trading framework wanted production-grade research without a rewrite when going live.",
      applied:
        "NautilusTrader's documentation states that the same strategy code runs in a backtest node and a live node, with the engine supplying simulated or real venues and clocks. The strategy talks to an abstract message bus and cache.",
      evidence: "NautilusTrader documentation: backtesting and live trading concepts",
      impact:
        "Moving to live is a configuration change at the edges, which is the whole point of the pattern.",
    },
    {
      system: "Traed: three evaluators and a shared core",
      kind: "yours",
      problem:
        "Equity backtest, options backtest and live/paper each had their own rule evaluator. One options bug stored a whole indicator series under a single timestamp, so a Bollinger Band comparison always failed and the strategy made zero trades.",
      applied:
        "A shared `condition_core` now holds the comparison and crossover logic. The equity evaluator resolves operands through the shared rule evaluator and the options backtest delegates to the shared `compare_operands`. The live executor was verified clean and left on its own evaluator by decision. One semantic changed on adoption: a crossover with no prior bar now gives no signal.",
      evidence: "docs/engineering/unify-condition-evaluators.md",
      impact:
        "Two of the three paths compare operands in one tested place. The open item is named in the document, not hidden.",
    },
    {
      system: "Traed: anchored-VWAP parity harness",
      kind: "yours",
      problem:
        "Nothing proved the backtest evaluator and the live executor agree on a path-dependent indicator, where the answer depends on the whole history.",
      applied:
        "A test drives one committed fixture of 323 five-minute bars through both paths offline, with no broker, database or network, and compares the signal, anchor price and target price at every bar. The test pins the lookback so that both paths see the same window.",
      evidence: "strategy-engine/tests/test_backtest_paper_parity_avwap.py",
      impact:
        "A disagreement becomes a failing test with a reproducible input, instead of a surprise trade.",
    },
  ],
  insights: [
    {
      t: "One decision path, two edges",
      d: "Share the rule and strategy logic. Swap only the event source and the execution adapter. Every extra copy of the logic is a future disagreement.",
    },
    {
      t: "Confirm on close, fill on next open",
      d: "A bar's close is known only when the bar ends. Filling at the next open is the first price you could really have traded.",
    },
    {
      t: "Compare signals exactly, fills statistically",
      d: "Parity tests can demand identical decisions on recorded data. Fills depend on the market, so match their distribution, not each rupee.",
    },
    {
      t: "Say what is not yet shared",
      d: "Traed shares comparison logic across both backtests but keeps a separate live rule evaluator, with a parity test at the seam. Naming the gap is stronger than hiding it.",
    },
  ],
  pitfalls: [
    "Reading a coarse-timeframe indicator while its bar is still forming. A 1-hour value stamped 10:00 uses the 11:00 close, so a 5-minute rule at 10:05 is quietly looking at the future.",
    "Comparing backtest and live over different history windows for a path-dependent indicator, then blaming the logic. Pin the window first, then compare.",
    "Treating paper results as a forecast of live. Paper fills are simulated, and they were found to be optimistic in Traed's own execution review.",
  ],
  quiz: [
    {
      q: "What is look-ahead bias in a backtest?",
      options: [
        "Testing on too short a date range to be statistically useful",
        "A decision that uses data which was not yet known at that moment",
        "Choosing strategy parameters that happened to fit past data best",
        "Assuming every order fills at exactly the price you wanted",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Look-ahead bias means the simulation let a decision see something that would not have been final yet, such as a bar's close before the bar ended.",
      distractors: [
        "That is a small-sample problem, a different weakness of backtests.",
        "",
        "That describes overfitting, a different bias. It can happen with perfectly causal code.",
        "That is a fill-model optimism problem, not a use of future data.",
      ],
    },
    {
      q: "In a one-code-path design, what is meant to differ between backtest and live?",
      options: [
        "The indicator formulas, since live data is noisier",
        "The condition operators, to allow for broker quirks",
        "The strategy rules, because live needs extra safety checks",
        "The data source and the order executor at the edges",
      ],
      answer: 3,
      difficulty: "recall",
      why: "The point is to share the decision logic and vary only where events come from and where orders go.",
      distractors: [
        "Different formulas mean different decisions, which is exactly the drift being avoided.",
        "Operator differences are a classic source of silent disagreement between modes.",
        "Risk checks belong outside strategy logic and apply to both; the rules should not fork.",
        "",
      ],
    },
    {
      q: "A strategy on 15-minute NIFTY bars gets its entry signal when the bar stamped 10:00 closes at 10:15. Under the confirm-on-close, fill-at-next-open convention, where does the backtest fill?",
      options: [
        "At the open of the bar stamped 10:15",
        "At the close of the bar stamped 10:00",
        "At the open of the bar stamped 10:00",
        "At the midpoint of the bar stamped 10:00",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The signal is only known at 10:15, so the first tradable price is the open of the next bar, stamped 10:15.",
      distractors: [
        "",
        "Tempting because it is the price that triggered the rule, but at the instant it is known the market has already moved on.",
        "That open occurred before the signal existed, so using it needs knowledge of the future.",
        "A midpoint is a price that also includes moves after the decision time.",
      ],
    },
    {
      q: "Over the same two weeks your backtest takes 30 trades and paper takes 22. Both read the same strategy. What is the most informative first step?",
      options: [
        "Widen the paper slippage setting until counts roughly match",
        "Rerun the backtest again with several different random seeds",
        "Replay one recorded day through both paths and diff signals",
        "Switch the strategy to live with one lot to see which one is right",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Trade counts differ because signals differ somewhere. A recorded input through both paths locates the first bar where they disagree, which separates a logic difference from a data or timing difference.",
      distractors: [
        "Slippage changes prices, not whether a signal fires, so it cannot explain a count gap.",
        "A deterministic evaluator has nothing to seed. This guesses at randomness instead of locating the disagreement.",
        "",
        "That spends real money to learn something a free offline replay shows exactly.",
      ],
    },
    {
      q: "Your 1-hour indicator series is stored under the bar's open time, but each value is computed from that bar's close. A rule on 5-minute steps reads it at 10:05 and takes the value stored at 10:00. What is wrong, and what is the fix?",
      options: [
        "Nothing, since the 10:00 key is the closest earlier timestamp available",
        "Only an alignment issue; shift all indicator values by one hour",
        "The value uses future candles; read the latest hourly bar that has closed",
        "The value is stale; recompute the hourly indicator every 5 minutes",
      ],
      answer: 2,
      difficulty: "apply",
      why: "At 10:05 the 10:00 hour bar is still forming. Its stored value was built from the 11:00 close, so the rule sees the future. At 10:05 the last closed hourly bar is the 09:00 one.",
      distractors: [
        "Closest earlier key sounds careful, but the value stored there depends on data from after 10:05.",
        "A blanket shift would help at some times and break the lookups where timestamps already line up.",
        "",
        "Recomputing on partial bars changes the indicator definition and still does not give a closed-bar value.",
      ],
    },
    {
      q: "A parity test runs 323 bars through the backtest evaluator, which computes a path-dependent indicator once over everything, and through the live path, which recomputes over a sliding window capped at 200 bars. The signals disagree at nearly every bar. Most likely cause?",
      options: [
        "The windows start at different points, so indicator state differs",
        "The live path has a bug in its comparison operator logic",
        "The fixture is far too small to produce any valid signals",
        "The backtest is using random numbers inside its signals",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A path-dependent indicator's value depends on where its calculation started. Different window shapes agree only near the end of the series. Pin the lookback equal, then compare.",
      distractors: [
        "",
        "An operator bug would show on specific comparisons, not nearly everywhere, and the test is about window shape.",
        "323 bars is enough to arm several setups; the problem is not volume of data.",
        "Signals in a deterministic evaluator do not use randomness; the difference is structural.",
      ],
    },
    {
      q: "Your live executor has its own rule evaluator and works. A colleague wants to move it onto the shared core before Monday's session. Under which plan are you most comfortable?",
      options: [
        "Merge it before Monday and watch the first trading hour closely",
        "Leave both evaluators and rely on code review to keep them aligned",
        "Delete the old evaluator first so that nobody can use it by mistake",
        "Build a parity harness on recorded bars, migrate behind it, enable on pass",
      ],
      answer: 3,
      difficulty: "judge",
      why: "The live path is the riskiest to touch and currently works. A harness gives evidence the migration preserves decisions, and the work can be done and checked off-hours.",
      distractors: [
        "Watching closely is a monitor, not a test, and it risks real orders during the first hour.",
        "Code review is how the drift happened; it does not detect a behavioural disagreement.",
        "Deleting first removes your only reference to compare against, and does nothing to prove the new path is equal.",
        "",
      ],
    },
    {
      q: "A reviewer says: parity means backtest P&L must equal paper P&L to the rupee, otherwise something is broken. Which response is right?",
      options: [
        "Agreed; tune the fill model until rupee totals match to the paisa",
        "Partly: match signals, then compare fill statistics",
        "Disagree; parity is only about code structure, so no test is needed",
        "Agreed; fills are deterministic, so any gap at all is a bug",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Parity is about decisions. Fills, slippage and latency belong to the market, so the right check is identical signals and similar fill distributions.",
      distractors: [
        "Tuning to match one sample hides real differences and overfits the fill model.",
        "",
        "Structure alone proves nothing. A parity test on recorded input is what gives evidence.",
        "Simulated fills are modelled and real fills are not deterministic, so a gap is expected.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-backtest-live-parity-solo-seam",
      scenario:
        "You run one server and trade minute-bar strategies alone. The two backtest paths already share a comparison core. The live executor keeps its own rule evaluator, which has traded without incident for months. Last week a crossover rule fired on a backtest bar but not on the matching paper bar. The market is closed every evening and weekend. What do you do?",
      options: [
        {
          label: "Rewrite the live evaluator onto the shared core this weekend",
          appeal:
            "It removes the last duplicate and fixes the whole class of bug at once.",
        },
        {
          label: "Ignore it; one disagreement in months is noise",
          appeal: "The live path works and your time is limited.",
        },
        {
          label: "Build a harness that replays one recorded day through both paths and diffs signals, then fix what it shows",
          appeal:
            "It finds the first bar where they disagree, costs evenings not market hours, and is reusable later.",
        },
        {
          label: "Stop using paper mode and trust the backtest",
          appeal: "It removes the second implementation from the picture.",
        },
      ],
      best: 2,
      verdict:
        "Live is the code that holds real orders, so you do not change it blind. A recorded-day diff runs offline in the evening window, shows exactly where the evaluators diverge, and gives a regression test whether you later migrate or patch. A weekend rewrite without it trades a known small gap for unknown ones, and ignoring or dropping paper mode removes the only early warning you have.",
      claims: [
        {
          text: "You accept that two rule evaluators exist for longer, in return for not touching working live code unprompted.",
          axis: "trade",
          correct: true,
          note: "The trade named with both sides. The duplicate stays, and it is guarded by a test rather than removed.",
        },
        {
          text: "The harness gives you correctness for free once, so no further tests are needed.",
          axis: "trade",
          correct: false,
          note: "It covers the recorded input only. New operands and indicators need new fixtures.",
        },
        {
          text: "A disagreement that appears only on a path-dependent indicator may be a window mismatch, not a logic bug.",
          axis: "failure",
          correct: true,
          note: "Backtest computes once and live recomputes over a bounded window; pin them equal before blaming the comparison.",
        },
        {
          text: "A rewrite carries the risk of changing a semantic, such as how a crossover behaves with no prior bar.",
          axis: "failure",
          correct: true,
          note: "Traed's own unification changed exactly that semantic when the backtests adopted the shared core.",
        },
        {
          text: "If the harness finds zero disagreements on the recorded day, the evaluators are proven identical.",
          axis: "failure",
          correct: false,
          note: "One day cannot cover every operator and state. Zero diffs is evidence, not proof.",
        },
        {
          text: "Track the bar index of the first signal disagreement on each recorded day.",
          axis: "measure",
          correct: true,
          note: "The first divergence is where the cause lives; later differences often cascade from it.",
        },
        {
          text: "Compare total rupee P&L of backtest and paper to decide whether they agree.",
          axis: "measure",
          correct: false,
          note: "P&L mixes signals with simulated fills. A signal diff isolates the logic.",
        },
      ],
    },
    {
      id: "sd-backtest-live-parity-research-prod",
      scenario:
        "A trading firm has 25 engineers and eight strategy teams. Researchers prototype in Python with vectorised arrays. A separate team reimplements each strategy in the production order engine. Every quarter two or three strategies behave differently in production than in research, and each investigation takes weeks. Strategies number in the dozens and change monthly. What structural change do you push?",
      options: [
        {
          label: "Strategies written once against a narrow interface, run by a research harness and the production engine through adapters",
          appeal:
            "One implementation of each strategy means research and production cannot diverge in logic.",
        },
        {
          label: "A stricter code-review checklist for the reimplementation team",
          appeal: "Cheap and needs no architecture change.",
        },
        {
          label: "Freeze strategy changes except quarterly",
          appeal: "Fewer changes means fewer chances to drift.",
        },
        {
          label: "Add a second reimplementation team to double-check",
          appeal: "Two independent copies catch each other's mistakes.",
        },
      ],
      best: 0,
      verdict:
        "With dozens of strategies changing monthly, a human reimplementation step is the source of the drift, and it grows with the number of strategies. Moving to one implementation behind adapters removes the step. Review checklists and freezes manage symptoms, and a second copy only adds another place for disagreement.",
      claims: [
        {
          text: "You pay an up-front cost to build the interface and adapters, and constrain researchers to the supported shape.",
          axis: "trade",
          correct: true,
          note: "The price of one code path is a narrower programming model and a build cost, which scale gives a return on.",
        },
        {
          text: "Vectorised research speed is kept unchanged because the strategy now runs through the event harness.",
          axis: "trade",
          correct: false,
          note: "An event-driven run is usually slower than array maths, so some research speed is given up unless a vectorised path is kept with a parity check.",
        },
        {
          text: "Divergences move from logic to the edges: data quality, timing and fill assumptions.",
          axis: "failure",
          correct: true,
          note: "Sharing the code does not remove edge differences, but it narrows where to look.",
        },
        {
          text: "A shared interface guarantees that live fills match simulated fills.",
          axis: "failure",
          correct: false,
          note: "Fills depend on the market and the venue. Sharing logic does not make them equal.",
        },
        {
          text: "Run each strategy's recorded sessions through both harness and production engine and diff decisions in CI.",
          axis: "measure",
          correct: true,
          note: "A decision-level diff on recorded input is the direct measure of parity.",
        },
        {
          text: "Count how many strategies pass the code-review checklist.",
          axis: "measure",
          correct: false,
          note: "A checklist pass rate measures process, not whether decisions agree.",
        },
      ],
    },
    {
      id: "sd-backtest-live-parity-fill-gap",
      scenario:
        "After three months of paper trading a NIFTY options strategy, signals match the backtest on every recorded session. But the average entry price in paper is consistently worse than the backtest's, by a small, steady amount per lot. Paper fills come from a simple model at the touch. You are about to size real money. How do you treat the gap?",
      options: [
        {
          label: "Tune the backtest fill model until its P&L equals paper P&L",
          appeal: "It makes the two modes agree in rupees, which looks like parity.",
        },
        {
          label: "Treat it as expected: make the backtest cost model more pessimistic and calibrate it against a small live sample",
          appeal:
            "Signals already match, so the gap is a fill and cost effect, and real fills are the only honest reference.",
        },
        {
          label: "Conclude the signal logic is broken and rewrite the evaluator",
          appeal: "A systematic gap suggests a systematic logic fault.",
        },
        {
          label: "Ignore it because both modes show a profit",
          appeal: "Profit in both modes suggests the strategy is fine.",
        },
      ],
      best: 1,
      verdict:
        "Signals match, so the evaluator is not the cause. The gap is in how fills are modelled. The fix is to make the backtest assumptions at least as pessimistic as what you can observe, and to calibrate against actual fills, not against another model. Tuning to paper copies one simulation's errors into another.",
      claims: [
        {
          text: "You accept a more pessimistic backtest in exchange for results you are less likely to be disappointed by.",
          axis: "trade",
          correct: true,
          note: "Pessimism costs some apparent edge but reduces the chance of sizing up on an optimistic number.",
        },
        {
          text: "Matching paper P&L exactly is the strongest evidence that the backtest is right.",
          axis: "trade",
          correct: false,
          note: "Paper fills are themselves a model. Agreement between two models says little about the exchange.",
        },
        {
          text: "Paper results are likely to overstate live results, since simulated fills ignore queue position and impact.",
          axis: "failure",
          correct: true,
          note: "A touch-price fill model is optimistic. Live orders can rest, partially fill or move the price.",
        },
        {
          text: "Because signals match, a steady entry-price gap points to the evaluator.",
          axis: "failure",
          correct: false,
          note: "Matching signals rule the evaluator out. What is left is price, cost and timing.",
        },
        {
          text: "Measure per-trade slippage against the signal-bar price on a small live sample, and compare its distribution with both models.",
          axis: "measure",
          correct: true,
          note: "A distribution of real slippage is the reference that both simulations should be calibrated to.",
        },
        {
          text: "Measure the gap only on the single best day to see what is possible.",
          axis: "measure",
          correct: false,
          note: "Picking the best day measures luck, not the typical gap that sizing depends on.",
        },
      ],
    },
  ],
};

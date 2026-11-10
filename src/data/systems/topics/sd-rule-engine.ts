import type { Topic } from "../../types.ts";

export const sdRuleEngine: Topic = {
  id: "sd-rule-engine",
  title: "Rule engines: strategies as data",
  tier: 3,
  week: 5,
  depth: "deep",
  summary:
    "A strategy stored as data is a small tree of conditions that one evaluator can read. The hard parts are one shared meaning and missing data.",
  why: "Every strategy in Traed is a JSON document, not a program. That is why the strategy builder, the backtester and the live engine can all run the same idea, and it is also why a rule that means one thing in a backtest and another live is the most dangerous bug you can have. This topic gives you the vocabulary to explain how your rules are stored, evaluated and kept consistent.",
  learn: {
    intuition:
      "Think of a recipe card against a cook who improvises. An improvising cook can do anything, but you cannot check their work, hand it to someone else, or run it a thousand times the same way. A recipe card lists plain steps with fixed words: add, stir, wait ten minutes. Anyone who knows the words can follow it, and you can read it before cooking. A rule engine is the kitchen that follows recipe cards. A trading rule such as buy when RSI crosses above 30 and price is above the 20-period average is written as data with a small, fixed vocabulary. The engine reads the card, looks up each named value for the current candle, compares them, and answers yes or no. Because the card is just data, you can save it, show it on screen, test it on old prices, and run it live. The price you pay is that the vocabulary is fixed. The card can only say what the kitchen's words allow.",
    mechanics: [
      {
        heading: "Rules as data: what is actually stored",
        body: "A Traed strategy keeps its rules in a JSON column on the `strategies` table, next to the options and risk settings. One rule is a small object with four parts: the left side (`indicator`), an `operator`, a `compareType`, and the right side (`compareValue` for a constant, or `compareIndicator` for another operand). For example, RSI crossing above 30 is `RSI_VALUE`, `crosses_above`, `value`, 30. The same JSON drives the builder screen, the backtest and the live engine, so there is one description of the idea and not three.",
      },
      {
        heading: "Operands, operators and the condition tree",
        body: "Operands are the things a rule can talk about: indicator outputs, candle fields such as `CANDLE_CLOSE`, the time of day (`CANDLE_TIME`, stored as minutes since midnight, so 09:15 is 555), and arithmetic expressions over these. Operators are `>`, `<`, `>=`, `<=`, `==`, `!=`, `crosses_above` and `crosses_below`. Rules sit in containers. Rules inside one container are ANDed. The containers of one group are combined by a trigger operator, AND or OR. So the tree is only two levels deep, and an empty container or group evaluates to false.",
      },
      {
        heading: "Meaning versus lookup: the resolver split",
        body: "Traed once had three separate evaluators, for the equity backtest, the options backtest and live trading. They shared the JSON format but disagreed in small ways, and bugs kept returning in new forms. One options backtest made no trades because a multi-band indicator such as Bollinger Bands stored a whole list where a number was expected. The fix split the work: `RuleEvaluator` owns the meaning (operators, crosses, AND and OR), and an injected `OperandResolver` answers one question, what is token X at this bar. Each path keeps its own resolver, while `compare_operands` is the single place a comparison is decided.",
      },
      {
        heading: "Crossovers, missing data and refusing to start",
        body: "`crosses_above` needs two bars. It is true when the left side was at or below the right side on the previous bar and is above it now. With RSI at 29 then 31 and a threshold of 30, it fires once; at 33 on the next bar it does not fire again. If there is no previous bar, the answer is false. The same fail-closed habit applies to missing data: any operand that cannot be resolved makes the rule false, never true. And when a strategy starts live, the engine checks each rule against what it can evaluate and refuses to start if it cannot, instead of running and never trading.",
      },
      {
        heading: "Saying it about Traed",
        body: "In Traed a strategy is data, not code. Rules are JSON with a fixed vocabulary of operands and operators, grouped into containers that are ANDed or ORed. We chose this so the builder, the backtester and the live engine can all run the same description. The shared core, `condition_core`, holds the comparison logic once, and each path supplies its own way of looking up values. The cost is that the vocabulary is fixed, and live and paper still have their own evaluation function, because moving working live code onto the core was deferred as the riskiest step. We would finish that migration next.",
      },
    ],
    complexityDerivation:
      "The invariant is that a rule means the same thing wherever it runs. If a backtest says a rule would have fired on a given candle, live trading must agree on that same candle, otherwise the backtest is not evidence of anything. Storing rules as data makes that possible, because there is one description. But it only holds if the code that reads the description is shared too. Two evaluators for one format will drift, and every small difference, such as how a cross is detected or what happens when a value is missing, becomes a silent disagreement. Splitting meaning (shared) from lookup (per path) keeps the part that must agree in one place, and leaves the part that legitimately differs, such as where a value comes from, local. The cost of evaluating a rule is the number of rules times a handful of lookups per candle, which is tiny at minute-bar rates. The design stops holding when rules need loops, state across bars, or user-supplied logic. A fixed two-level tree cannot say do this after three losses in a row. Then you either add operands to the vocabulary, one at a time, or you accept a real language and the cost of sandboxing it.",
    variants: [
      {
        name: "Fixed JSON vocabulary (containers of rules)",
        when: "Users build strategies in a visual builder and you must validate them before market hours.",
        delta:
          "Traed's choice. Easy to show on screen and to test, but a new idea may need a new operand added to the engine.",
      },
      {
        name: "Expression or formula language",
        when: "Users want to write their own formulas such as a ratio of two indicators.",
        delta:
          "More flexible. Needs a safe parser and a clear rule for missing values. Traed supports a limited arithmetic form inside operands.",
      },
      {
        name: "General rules engine (Rete-style network)",
        when: "Thousands of rules share conditions, and facts change often, as in fraud or insurance checks.",
        delta:
          "Matching work is shared across rules. More power and more machinery than minute-bar strategies need.",
      },
    ],
    tradeoffs: [
      {
        vs: "Writing each strategy as Python code",
        pick: "Strategies as JSON data",
        because:
          "Data can be validated, displayed, versioned and replayed by any mode. Code is more expressive but cannot be safely shown in a builder or run by untrusted users.",
      },
      {
        vs: "One evaluator class for all modes",
        pick: "A shared comparison core with a resolver per mode",
        because:
          "The data lookup really does differ: a backtest reads precomputed series, live reads the latest indicator state. Sharing the meaning and splitting the lookup puts the boundary where the real difference is.",
      },
      {
        vs: "Treating a missing value as pass, to avoid blocking trades",
        pick: "A missing value makes the rule false",
        because:
          "A trade that should not happen is worse than a trade that is skipped. Failing closed also makes missing data show up as no trades, which is easier to notice and investigate.",
      },
    ],
  },
  realWorld: [
    {
      system: "JSON Logic",
      kind: "industry",
      problem:
        "Applications need business rules that can be stored in a database, sent between a browser and a server, and run safely without executing arbitrary code.",
      applied:
        "JSON Logic is an open format for writing a rule as a JSON tree, with a small fixed set of operators such as `and`, `or`, `>` and `in`. The same rule can be evaluated by the same library in JavaScript on the screen and in other languages on the server. The tree is data, so it can be saved, inspected and checked.",
      evidence: "The JSON Logic project documentation (jsonlogic.com)",
      impact: "Shows the same idea Traed uses: a fixed vocabulary makes rules storable and safe to run.",
    },
    {
      system: "Drools and the Rete algorithm",
      kind: "industry",
      problem:
        "Large rule sets, such as insurance or fraud checks, would be slow if every rule re-tested every condition on every change.",
      applied:
        "Drools is a widely used open-source rules engine. It is built on Rete, an algorithm that compiles rules into a network so that a condition shared by many rules is evaluated once and remembered. Rules are written in a rule language and kept apart from application code.",
      evidence: "Drools documentation, and Charles Forgy's 1982 paper on the Rete algorithm",
      impact: "The heavy end of the same family. Minute-bar strategies do not need it, but it shows where the design goes at scale.",
    },
    {
      system: "Traed shared rule core",
      kind: "yours",
      problem:
        "Equity backtest, options backtest and live trading each decided whether a rule fired in their own code, and the results disagreed.",
      applied:
        "`condition_core` holds `RuleEvaluator`, the `OperandResolver` contract and `compare_operands`. The equity backtest drives `RuleEvaluator` with its own resolver, and the options backtest routes every comparison through `compare_operands`. Live and paper trading still use their own `_evaluate_frontend_rule`, and the engine refuses to start a live strategy whose rules it cannot yet evaluate.",
      evidence:
        "strategy-engine/app/services/condition_core/core.py; strategy-engine/app/services/equity_rule_engine.py; strategy-engine/app/services/universal_strategy_executor.py",
      impact:
        "One tested place decides operators, crossovers and missing values for the backtest paths. Live is the remaining gap.",
    },
    {
      system: "Traed evaluator unification plan",
      kind: "yours",
      problem:
        "Rule bugs kept reappearing in different forms, including an options backtest that placed no trades.",
      applied:
        "The plan traced the zero-trade bug to a multi-band indicator stored as a whole list instead of a number per bar, and a separate symbol-name mismatch for NIFTY 50. It moved the shared meaning into one core, fixed storage, and migrated the backtest paths first. It deliberately deferred the live path, because that code was working and was the riskiest to change.",
      evidence: "docs/engineering/unify-condition-evaluators.md",
      impact:
        "A worked example of migrating in order of risk: shared core first, backtests next, live last.",
    },
  ],
  insights: [
    {
      t: "A rule is a small tree of data",
      d: "Left operand, operator, right operand, grouped in containers. Rules in a container are ANDed, and containers are combined by AND or OR. Empty means false.",
    },
    {
      t: "Share the meaning, localise the lookup",
      d: "Operators, crosses and missing-value handling must be identical everywhere. Where a value comes from may differ by mode. Put the boundary there.",
    },
    {
      t: "A missing value means the rule is false",
      d: "Failing closed turns missing data into a skipped trade, not a surprise trade. A cross with no previous bar is false as well.",
    },
    {
      t: "Refuse to start what you cannot evaluate",
      d: "A rule the live engine cannot resolve would never fire and nobody would see why. Refusing at start turns a silent failure into a visible one.",
    },
  ],
  pitfalls: [
    "Letting each mode keep its own copy of the comparison logic. The copies drift one small fix at a time, and backtest and live stop agreeing.",
    "Treating a missing or non-numeric value as false for some operators and as true for others. Pick one rule, fail closed, and test it once in one place.",
    "Storing a rule format with no way to say what the engine supports. A strategy can then run happily and never trade, because one operand is unsupported.",
  ],
  quiz: [
    {
      q: "In Traed's rule format, how are the rules inside a single condition container combined?",
      options: [
        "They are ANDed, so all of them must hold",
        "They are ORed, so any one of them is enough",
        "They are ANDed only if the strategy trades options",
        "They are evaluated in order and the first match wins",
      ],
      answer: 0,
      why: "Rules in a container are ANDed. The choice between AND and OR applies one level up, across the containers of a group.",
      difficulty: "recall",
      distractors: [
        "",
        "OR is the choice for combining containers, not rules inside one container.",
        "The combination does not depend on instrument type; one cascade is used for all.",
        "First-match-wins describes some rule-engine styles, but this tree evaluates everything and combines the results.",
      ],
    },
    {
      q: "What does the `OperandResolver` in Traed's shared core do?",
      options: [
        "It decides whether a crossover has happened on this candle or not",
        "It places the order once a rule has fired on a candle",
        "It returns the value of a named operand at a given bar",
        "It stores each strategy's rules in the database tables",
      ],
      answer: 2,
      why: "The resolver is only a lookup: token in, value out, for the current and previous bar. The evaluator and `compare_operands` decide what the values mean.",
      difficulty: "recall",
      distractors: [
        "Crossover logic is the shared meaning, so it sits in the evaluator, not in the per-path lookup.",
        "Order placement happens after evaluation, in the order management layer.",
        "",
        "Storage is a database concern. The resolver reads values at evaluation time.",
      ],
    },
    {
      q: "RSI is 28 on one 1-minute candle, then 31, then 33. The rule is `RSI_VALUE crosses_above 30`. On which candles does the rule fire?",
      options: [
        "On the candles at 31 and 33, because both are above 30",
        "Only on the candle at 31",
        "On the candle at 28 and again at 31",
        "On no candle, because crossing needs two full minutes",
      ],
      answer: 1,
      why: "A cross is true when the previous value was at or below the threshold and the current value is above it. At 31 the previous was 28 and it fires. At 33 the previous was already 31, so it does not.",
      difficulty: "apply",
      distractors: [
        "That is the plain greater-than rule, which would re-fire on every candle while RSI stays high.",
        "",
        "At 28 RSI is below 30 and the previous bar is unknown, so nothing fires there.",
        "Crossing needs only two consecutive bars, and one-minute candles supply that.",
      ],
    },
    {
      q: "A rule says `CANDLE_TIME` is greater than 14:30. The engine stores times as minutes since midnight. What number does 14:30 become, and what does a candle at 15:00 resolve to?",
      options: [
        "14.5 and 15.0, using hours as decimals",
        "1430 and 1500, using the digits of the clock time",
        "52,200 and 54,000, using seconds since midnight",
        "870 and 900, using minutes since midnight",
      ],
      answer: 3,
      why: "14 hours times 60 plus 30 is 870, and 15:00 is 900. Both sides must use the same unit, which is why the stored 'HH:MM' target is converted to minutes.",
      difficulty: "apply",
      distractors: [
        "Decimal hours are a common alternative, but the engine's operand is in minutes.",
        "Digit-style times compare correctly only by accident within a day and break on arithmetic.",
        "Seconds would also work as a convention, but this engine uses minutes since midnight.",
        "",
      ],
    },
    {
      q: "Your options backtest places zero trades for a Bollinger Bands strategy, while the same rule trades in the equity backtest. The options path stored the whole upper-band list under one timestamp. Why do no trades happen?",
      options: [
        "The comparison reads a list where a number is expected, so every comparison fails",
        "Bollinger Bands cannot be used with options in any backtest",
        "The options backtest runs on daily candles, so the bands never cross",
        "The rule is ANDed with another rule that is always false",
      ],
      answer: 0,
      why: "A cross-over compares numbers. With a list as the value, the comparison cannot be made, the rule is false on every bar, and no trade ever occurs. The fix stores one number per bar and per output.",
      difficulty: "apply",
      distractors: [
        "",
        "Indicators work in both backtests; the issue was how one path stored the output.",
        "The timeframe is configurable and unrelated to how the output was stored.",
        "A second rule could cause zero trades, but the cause here was the stored shape, which the shared core now normalises.",
      ],
    },
    {
      q: "A Zerodha-style no-code builder lets users pick an indicator, an operator and a value. A user selects an operand that your live engine does not yet support. What should happen when they press start?",
      options: [
        "Start anyway, and treat the unsupported rule as true so trading can continue",
        "Start anyway, and treat the rule as false so the strategy waits quietly",
        "Substitute the closest supported operand and start with that",
        "Refuse to start and show a message naming the unsupported rule",
      ],
      answer: 3,
      why: "A strategy that starts and never trades looks healthy while doing nothing, and a rule treated as true can trade on something nobody checked. A clear refusal tells the user exactly what to change.",
      difficulty: "apply",
      distractors: [
        "Treating it as true feels helpful, but it removes a condition the user thought was protecting them.",
        "Treating it as false is safe in terms of risk, but the user sees a running strategy that silently never trades.",
        "A silent substitute changes the user's idea without telling them, and results then differ from their backtest.",
        "",
      ],
    },
    {
      q: "Your team has equity, options and live evaluators that disagree on how crossovers behave. You can fix the crossover bug in each, or build one shared comparison and move the paths over. Which is the better engineering choice?",
      options: [
        "Fix the bug in each, because three small edits are quicker than a refactor",
        "Rewrite all three in one release, so the system is consistent at once",
        "Build one tested shared comparison, then move the safest paths first and live last",
        "Delete the equity and options evaluators and use only the live one",
      ],
      answer: 2,
      why: "A shared tested core stops the same bug returning in new forms. Migrating in order of risk keeps working live code untouched until the core has proved itself on backtests.",
      difficulty: "judge",
      distractors: [
        "Three fixes are quicker today, but the copies will drift again, which is how the problem started.",
        "A single big release changes working live code and the backtests at once, so a mistake is hard to isolate.",
        "",
        "The live path is the riskiest to change, and removing the backtest paths loses capability users rely on.",
      ],
    },
    {
      q: "A founder wants any user to write custom Python for entry logic, because the fixed rule vocabulary is too limiting. The platform will run these strategies live with real money. Which response best fits?",
      options: [
        "Allow it, and review each user's code by hand before market open",
        "Keep the fixed vocabulary, and extend it with new operands one at a time",
        "Allow it, and run each script with a timeout to stop long loops",
        "Allow it, but only for the founder's own account where risk is accepted",
      ],
      answer: 1,
      why: "Fixed data rules can be validated, shown in the builder, and tested identically in every mode. Arbitrary code cannot be checked in the same way. Adding operands grows power without giving up that property.",
      difficulty: "judge",
      distractors: [
        "Manual review does not scale, and a changed script on a later day escapes it.",
        "",
        "A timeout stops infinite loops but not code that places the wrong orders or reads data it should not.",
        "A restricted account still leaves two code paths, the vocabulary and arbitrary code, and the second is hard to backtest the same way.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-rule-engine-three-evaluators",
      scenario:
        "A small team runs three rule evaluators: equity backtest, options backtest and live. A crossover bug appears in the options path, and the same flaw is suspected in the other two. Live trading is working and has real positions open during market hours. There is one developer, and the equity backtest has a good test suite. How should the developer proceed?",
      options: [
        {
          label: "Copy the fix into all three evaluators the same day",
          appeal:
            "Fastest path to a consistent result, and each change is small.",
        },
        {
          label: "Build a tested shared comparison, move the backtest paths onto it, and defer the live path",
          appeal:
            "One place for the semantics, with working live code left alone until the core has proved itself.",
        },
        {
          label: "Replace all three with a new engine in one release",
          appeal:
            "Cleanest end state, and no period when two designs coexist.",
        },
        {
          label: "Leave the options path alone and rely on the live path being correct",
          appeal:
            "Live is the one that touches money, and it is already working.",
        },
      ],
      best: 1,
      verdict:
        "The developer is alone, has a good test suite on one path, and live money is at stake. A shared core with tests removes the drift at its source. Moving backtests first uses the test suite as a safety net, and leaving live until last avoids touching working code under open positions.",
      claims: [
        {
          text: "You accept that for a while live trading keeps its own evaluation code, so the two can still disagree.",
          axis: "trade",
          correct: true,
          note: "Deferring the live path trades some remaining drift for not touching working money-handling code.",
        },
        {
          text: "You give up the ability to change comparison rules in one place.",
          axis: "trade",
          correct: false,
          note: "The shared core is exactly what gives one place for operators and crosses, at least for the paths already moved.",
        },
        {
          text: "Changing the live evaluator in the same release as the backtest paths makes any live regression hard to tell from a backtest change.",
          axis: "failure",
          correct: true,
          note: "Isolating changes by path is what makes each step verifiable.",
        },
        {
          text: "Once all paths share one comparison function, a mistake in that function is harmless because each path checks it separately.",
          axis: "failure",
          correct: false,
          note: "A shared function means a shared mistake. It affects every path at once, so it needs strong tests of its own.",
        },
        {
          text: "Compare trade lists from the old and new evaluator on the same historical data before switching.",
          axis: "measure",
          correct: true,
          note: "Identical inputs should give identical trades. A difference points straight at the changed behaviour.",
        },
        {
          text: "Counting lines of duplicated code removed shows whether the migration is safe.",
          axis: "measure",
          correct: false,
          note: "Less duplication is the goal, but it says nothing about whether behaviour is preserved.",
        },
      ],
    },
    {
      id: "sd-rule-engine-untrusted-users",
      scenario:
        "A broker is launching a no-code algo product for 50,000 retail customers. Customers build strategies with indicators and conditions, and the broker runs them live against exchange markets with the customers' money. Regulators and the broker's risk team want every strategy to be checkable before market open and explainable afterwards. The customers are unknown people, not employees. What should a strategy be?",
      options: [
        {
          label: "Python scripts uploaded by customers and run on the broker's servers",
          appeal:
            "Maximum flexibility, and advanced customers will ask for it.",
        },
        {
          label: "A formula string that the service runs through a general expression evaluator",
          appeal:
            "Simple for customers to write, and no builder screen is needed.",
        },
        {
          label: "A JSON rule tree with a fixed set of operands and operators, validated on save",
          appeal:
            "Checkable before the open, explainable afterwards, and safe to run for strangers.",
        },
        {
          label: "A separate container per customer, each running its own strategy code",
          appeal:
            "Strong isolation between customers, and it keeps the flexibility of real code.",
        },
      ],
      best: 2,
      verdict:
        "Untrusted authors, real money, and a requirement to check and explain every strategy all point at a closed vocabulary. A JSON tree can be validated against what the engine supports, displayed, replayed and audited. Code of any kind, even isolated, cannot be fully checked in advance.",
      claims: [
        {
          text: "Customers lose the ability to express ideas outside the supported operands and operators.",
          axis: "trade",
          correct: true,
          note: "That is the price of the closed vocabulary. The platform extends it deliberately, one operand at a time.",
        },
        {
          text: "A closed vocabulary means the platform can verify a strategy on save, before it ever sees live ticks.",
          axis: "trade",
          correct: true,
          note: "Validation against a known set of operands is possible only because the set is known.",
        },
        {
          text: "Isolating each customer in a container makes arbitrary customer code safe to trade with.",
          axis: "failure",
          correct: false,
          note: "A container limits what the code can reach, but it still decides what orders to place. The risk of wrong trades remains.",
        },
        {
          text: "A rule that references an unsupported operand should be rejected at save time, not discovered at runtime.",
          axis: "failure",
          correct: true,
          note: "Catching it on save gives the customer a clear message, and prevents a strategy that silently never trades.",
        },
        {
          text: "Log, for each decision, the rule that fired and the values it read, so any trade can be explained afterwards.",
          axis: "measure",
          correct: true,
          note: "With rules as data, the explanation is the rule plus the operand values at that candle. That is what an audit asks for.",
        },
        {
          text: "Count the number of strategies saved per day to show that the rule engine is working.",
          axis: "measure",
          correct: false,
          note: "Saves show product use. They do not show that evaluation is correct or that decisions can be reproduced.",
        },
      ],
    },
    {
      id: "sd-rule-engine-unsupported-operand",
      scenario:
        "On a single server, a founder builds a live NIFTY options strategy using a new operand, the open-interest wall strike. The backtest supports it. The live engine does not resolve it yet. If the engine starts the strategy anyway, the rule can never be evaluated and no entry will ever fire. The founder is the only user, checks the dashboard once a day and has money in the account. What should the live engine do when the strategy is started?",
      options: [
        {
          label: "Refuse to start, and say which rule the live engine cannot evaluate",
          appeal:
            "The founder learns at once, and the strategy cannot sit idle looking active.",
        },
        {
          label: "Start the strategy and treat the unresolved rule as true",
          appeal:
            "Trading continues, and entries still happen on the other conditions.",
        },
        {
          label: "Start the strategy and treat the unresolved rule as false",
          appeal:
            "Safe, since a false rule can only prevent a trade, never cause one.",
        },
        {
          label: "Start the strategy and write a warning to the log file",
          appeal:
            "Keeps the strategy running and leaves a record for later reading.",
        },
      ],
      best: 0,
      verdict:
        "With one user who looks once a day, a quiet failure can last a full day or more. Treating the rule as true trades without a condition the founder believes is protecting the account. Treating it as false or only logging produces a strategy that looks active and never trades. A clear refusal at start is seen immediately.",
      claims: [
        {
          text: "You accept that a strategy which works in backtest cannot go live until the live engine supports the operand.",
          axis: "trade",
          correct: true,
          note: "Backtest-only operands are a known gap. Refusing keeps the gap visible instead of hiding it.",
        },
        {
          text: "Refusing to start means the founder loses the ability to trade the other conditions of the strategy.",
          axis: "trade",
          correct: true,
          note: "That is the cost: the whole strategy waits until the operand is supported or the rule is removed.",
        },
        {
          text: "Treating an unresolved rule as true is the safe default because it can only add trades the founder wanted.",
          axis: "failure",
          correct: false,
          note: "It removes one condition from an AND, so the strategy can enter in situations the founder meant to exclude.",
        },
        {
          text: "A strategy that starts but can never fire looks identical to a healthy strategy waiting for its signal.",
          axis: "failure",
          correct: true,
          note: "That is the core danger: from the dashboard, no entries today looks the same either way.",
        },
        {
          text: "Writing a warning to a log is enough, because the founder will read the log each morning.",
          axis: "failure",
          correct: false,
          note: "Logs get read after something goes wrong. A refusal at start puts the message where the founder is already looking.",
        },
        {
          text: "Track how many starts are refused and for which rule, to see which operands to support next.",
          axis: "measure",
          correct: true,
          note: "Refusal reasons are a free list of missing features, ordered by how often they block real use.",
        },
        {
          text: "Compare the count of entries per day with the backtest's average to confirm the strategy is evaluating.",
          axis: "measure",
          correct: false,
          note: "A few days of zero entries is normal for a selective strategy, so this cannot tell a broken rule from a quiet market.",
        },
      ],
    },
  ],
};

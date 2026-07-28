import type { Topic } from "../types.ts";

export const stateMachineDp: Topic = {
  id: "state-machine-dp",
  title: "State-machine DP",
  tier: 3,
  week: 17,
  depth: "deep",
  summary: "Explicit states, transitions per step — and the profit oracle.",
  why: 'The shape behind "maximum achievable P&L". Computed over the same bars a strategy traded, it turns absolute P&L into a capture ratio.',
  complexity: "O(n · states)",
  viz: ["state-machine-dp"],
  learn: {
    intuition:
      "Some sequence problems are not really about the sequence — they are about a small machine walking through it. At any bar you are either holding a position or you are not. That is your entire situation: two states. Each new bar offers you a few moves from wherever you are, each move has a price, and you want the cheapest or most profitable walk from the start to the end. Once you see the problem that way, the recurrence writes itself, because you keep one number per state per step: the best you could possibly be doing if you were in that state right now. And the crucial discipline is that the *cost lives on the arrow, not on the box*. Standing still while holding a position costs nothing; selling costs brokerage, slippage and tax. Put those costs on the state instead of the transition and your answer is wrong in a direction that is hard to notice — it will look like a plausible number rather than an obvious error. The pattern generalises far past trading: any time you catch yourself writing a DP with several parallel arrays whose names describe situations rather than quantities, you have found a state machine and should draw it.",
    mechanics: [
      {
        heading: "Name the states first, then draw the arrows",
        body: "Do this on paper before writing code. `flat` and `long` for a simple oracle; add `short` if the strategy may sell first; add `cooling` if a cooldown follows an exit. Then for each state list which states it can reach in one step and what that move costs. The recurrence is a direct transcription of that drawing, and if the drawing is wrong the code cannot be right.",
      },
      {
        heading: "One value per state, updated once per step",
        body: "`flat[t]` is the best total achievable at bar `t` while holding nothing; `long[t]` is the best while holding one unit. Each is the maximum over every arrow that arrives at it: `flat[t] = max(flat[t-1], long[t-1] + price[t] - cost)` and `long[t] = max(long[t-1], flat[t-1] - price[t])`. Two lines, and they are the whole algorithm.",
      },
      {
        heading: "Charge costs on the transition, not on the state",
        body: "Brokerage, slippage, taxes and the bid–ask spread are all paid when the position changes. Charging them per bar penalises holding, which quietly turns a long-term oracle into a day-trading one. Charging them once at the end under-counts every round trip after the first. Both produce a number that looks reasonable, and 'looks reasonable' is exactly why this error survives review.",
      },
      {
        heading: "Update from the previous step's values, not this step's",
        body: "`flat[t]` reads `long[t-1]`, and `long[t]` reads `flat[t-1]`. Computing them in place with rolling variables means the second assignment can see the first one's new value — which lets you buy and sell within the same bar and manufacture profit from nothing. Keep the previous values in temporaries before overwriting either, exactly as the rolling house-robber does.",
      },
      {
        heading: "A new constraint is usually a new state or a new dimension",
        body: "'Cooldown after selling' becomes a third state. 'At most K transactions' becomes a second index, `dp[t][state][k]`, at O(n · K). 'At most one open position per instrument' is separate machines that do not interact. The model grows predictably, and that predictability is the point — you are extending a drawing rather than inventing an algorithm. What to watch is the state count multiplying: three states and K up to 100 is 300 numbers per bar, which is still linear in n but no longer trivial.",
      },
    ],
    complexityDerivation:
      "There are n steps and S states, and each state considers a fixed number of incoming arrows, so the total is O(n · S) time. Because S is a constant fixed by the model — two, or three with a cooldown — the practical bound is O(n), one pass. Space is O(S) if you only want the final number, because each step reads only the previous one; it is O(n · S) if you want to reconstruct which trades were taken, which for an oracle you usually do, since the whole value of the answer is being able to look at what it did. The transaction-limited variant is where the analysis gets interesting: `dp[t][state][k]` is O(n · S · K), and since K is bounded by n/2 — you cannot round-trip more often than every other bar — the worst case is quadratic. That is worth knowing before someone asks for 'unlimited but at most K'. It is also worth being precise that this is an *upper bound on what any strategy could have made*, computed with hindsight over the realised path. It is not a prediction and it is not achievable; its value is as a denominator. A strategy capturing 8% of the oracle is a different animal from one capturing 45%, and neither statement can be made from absolute profit alone, because absolute profit conflates how good the strategy is with how much opportunity the period happened to offer.",
    variants: [
      {
        name: "Two states — flat and long",
        when: "Long-only, unlimited round trips.",
        delta:
          "The base case. `flat` and `long`, one transition each way, cost charged on the sell.",
      },
      {
        name: "Three or more states",
        when: "Shorting, or a cooldown after an exit.",
        delta:
          "Add `short`, or add `cooling` with a forced one-step delay before `flat` becomes reachable again. Still O(1) per bar.",
      },
      {
        name: "Transaction-limited",
        when: "'At most K trades' — capital or compliance constraints.",
        delta:
          "A third index. O(n · S · K), and the classic case where K = 2 has a well-known four-variable solution that people memorise without seeing it is this model with the dimension unrolled.",
      },
      {
        name: "Viterbi",
        when: "The states are hidden and each observation gives evidence rather than certainty.",
        delta:
          "Same recurrence with probabilities multiplied instead of profits added, and log-probabilities in practice so it stays additive and does not underflow. Same shape; entirely different field.",
      },
    ],
    tradeoffs: [
      {
        vs: "Greedy — take every upward move",
        pick: "The DP the moment costs exist",
        because:
          "With zero costs, greedy is genuinely optimal and provably so: summing every positive difference between consecutive bars gives the same answer, because any rise can be captured independently. Add a fee and that argument collapses, since two small rises separated by a dip may be worth less than one held position across both. Greedy has no way to see that, and the size of its error grows with the fee.",
      },
      {
        vs: "Backtesting the actual strategy",
        pick: "Both — they answer different questions",
        because:
          "The backtest tells you what the strategy made. The oracle tells you the ceiling on the same bars under the same cost model. Reporting only the first means a bad quarter and a bad strategy are indistinguishable; reporting the ratio separates skill from opportunity. The oracle costs one linear pass over data you already loaded, which makes it one of the cheapest diagnostics available.",
      },
      {
        vs: "Adding a dimension versus adding a state",
        pick: "A state for a qualitative situation, a dimension for a counter",
        because:
          "'Am I cooling down' is a situation with a small fixed number of values, so it belongs in the state and costs nothing asymptotically. 'How many trades have I used' is a counter that ranges over K values, so it belongs in a dimension and multiplies the work by K. Confusing the two is how a linear model quietly becomes quadratic — and the tell is a state whose name contains a number.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — the profit oracle as a denominator",
      kind: "yours",
      problem:
        "A backtest reports absolute P&L, which cannot distinguish a good strategy in a flat month from a mediocre one in a trending month. Comparing two strategies across different periods is then guesswork.",
      applied:
        "Run a flat/long/short machine over the same bars with the same brokerage, slippage and tax model, charging costs on the transitions. The result is the most any strategy could have extracted from that exact path. Dividing the strategy's realised P&L by it gives a capture ratio that is comparable across instruments and periods.",
      evidence: "strategy-engine/_perf/profile_bt.py",
      impact:
        "Absolute P&L → a capture ratio, computed in one extra linear pass over bars already in memory",
    },
    {
      system: "Viterbi for GPS map matching",
      kind: "industry",
      problem:
        "A phone's GPS fix drifts by tens of metres, so on a flyover with a service road beneath it the raw trace jumps between the two. Snapping each point to its nearest road independently produces a route that teleports back and forth.",
      applied:
        "The states are candidate road segments and the observations are GPS fixes. Each step scores how well a fix matches a segment and how plausible the transition from the previous segment is — a U-turn or a jump across a divider is expensive. The best path through that machine is the route, and it is exactly this recurrence with log-probabilities instead of rupees.",
      impact:
        "Per-point nearest-road snapping → a route that respects road connectivity, which is why fare estimates stop jumping",
    },
    {
      system: "Adaptive bitrate streaming",
      kind: "industry",
      problem:
        "A player choosing quality per segment on a variable Indian mobile connection. Always picking the highest affordable quality empties the buffer and stalls; always picking the lowest wastes available bandwidth and looks poor.",
      applied:
        "The state is the buffer level bucketed into a handful of ranges, the transition is which bitrate to fetch next, and the cost combines visual quality against the risk of running the buffer dry. Offline, running this over a recorded bandwidth trace gives the ceiling that any real player's heuristic is measured against — the same oracle-as-denominator idea.",
      impact:
        "Per-segment greedy choices → decisions that account for what the buffer will look like afterwards",
    },
    {
      system: "Battery scheduling on rooftop solar",
      kind: "industry",
      problem:
        "A household or small factory with panels and a battery decides each interval whether to charge, discharge or idle, under time-of-day tariffs. Charging whenever the sun shines can leave the battery full before the expensive evening slot arrives.",
      applied:
        "Three states — charging, discharging, idle — with the cost of each transition set by the tariff at that interval and by the round-trip efficiency loss. The optimal schedule over a forecast day is one pass, and against realised generation it becomes the benchmark the live controller is scored against.",
      impact:
        "Rule-of-thumb charging → a schedule that holds capacity for the peak-tariff window",
    },
  ],
  lab: {
    prompt:
      "You may buy and sell one unit any number of times, but you must sell before buying again, and every completed round trip costs `fee`. Given daily `prices` and the `fee`, return the maximum achievable profit. Budget: O(n) time. Summing every upward move is optimal only when the fee is zero.",
    fnName: "maxProfit",
    signature: "maxProfit(prices: number[], fee: number): number",
    starter: `function maxProfit(prices, fee) {
// Your budget: O(n) time.
// Two states: holding nothing, and holding one unit.
// Track the best total achievable in each, bar by bar.
// Charge the fee on the transition, not on every bar.

return 0;
}`,
    tests: [
      {
        // Buy 1 sell 8 (7 - 2 = 5), buy 4 sell 9 (5 - 2 = 3). Total 8.
        name: "two round trips beat one",
        input: [[1, 3, 2, 8, 4, 9], 2],
        expected: 8,
      },
      {
        // Buy 1 sell 10 = 9 - 3 = 6. Splitting into two trips gives 5,
        // because the second fee costs more than the dip is worth. A
        // greedy sum of upward moves returns 10 here.
        name: "the fee makes holding through the dip correct",
        input: [[1, 3, 7, 5, 10, 3], 3],
        expected: 6,
      },
      {
        // With no fee, greedy and the DP agree.
        name: "no fee, monotone rise",
        input: [[1, 2, 3, 4, 5], 0],
        expected: 4,
      },
      {
        name: "falling prices — do nothing",
        input: [[5, 4, 3, 2, 1], 0],
        expected: 0,
      },
      {
        // The only rise is 1, and the fee is 5. Trading is a loss, so the
        // answer is 0 rather than negative.
        name: "the fee kills the only trade",
        input: [[1, 2], 5],
        expected: 0,
      },
      { name: "empty", input: [[], 2], expected: 0, hidden: true },
      { name: "single price", input: [[5], 1], expected: 0, hidden: true },
      {
        // Catches buying and selling within the same bar: if the two state
        // updates see each other's new values, extra profit appears here.
        name: "flat prices earn nothing",
        input: [[3, 3, 3], 0],
        expected: 0,
        hidden: true,
      },
    ],
    hints: [
      "Two numbers, updated once per price. `flat` is the best total you could have while holding nothing; `hold` is the best while holding one unit. `flat` starts at 0 and `hold` starts at −Infinity, because you cannot be holding before the first day.",
      "From `flat` you can do nothing, or buy: `flat - price`. From `hold` you can do nothing, or sell: `hold + price - fee`. Take the maximum for each state.",
      "Compute both updates from the PREVIOUS values. If you overwrite `flat` first and then use it to compute `hold`, you have allowed a buy and a sell on the same bar — which invents profit. Save the old values in temporaries first.",
    ],
    solution: `function maxProfit(prices, fee) {
// flat = best total while holding nothing.
// hold = best total while holding one unit.
// hold starts at -Infinity: you cannot already be holding on day 0.
let flat = 0;
let hold = -Infinity;

for (const price of prices) {
  // BOTH updates read the PREVIOUS step's values. Overwriting flat
  // first and then using it for hold would allow buying and selling
  // within the same bar, which manufactures profit from nothing.
  const prevFlat = flat;
  const prevHold = hold;

  // Stay flat, or sell what we were holding. The fee is charged here,
  // on the transition — that is when the trade actually happens.
  flat = Math.max(prevFlat, prevHold + price - fee);

  // Keep holding, or buy now.
  hold = Math.max(prevHold, prevFlat - price);
}

// Ending flat is always at least as good as ending holding, since an
// unsold position has not realised anything.
return flat;
}`,
    complexityGate: {
      target: "O(n)",
      // Prices oscillate rather than trend, so there are many local rises
      // and the fee genuinely decides which ones are worth taking. A
      // monotone series would let a greedy sum of upward moves score the
      // same as the DP and hide the difference entirely.
      gen: "(n) => [Array.from({ length: n }, (_, i) => 100 + ((i * 37) % 41) - ((i * 13) % 17)), 3]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Name the states first, then write one transition per state",
      d: "flat / long / short. Cooldown after a stop-out is one more state. Position limits are one more dimension. The model grows predictably, which is the whole reason to draw it before coding.",
    },
    {
      t: "The oracle is an upper bound worth measuring against",
      d: "It tells you the most any strategy could have extracted from that series under your cost model. A strategy capturing 8% of it is a different animal from one capturing 45%, and absolute P&L cannot tell them apart.",
    },
    {
      t: "Charge costs on the transition, not the state",
      d: "Brokerage, slippage and taxes apply when you change state. Per-bar charging penalises holding; charging once at the end under-counts round trips. Both produce plausible wrong numbers.",
    },
    {
      t: '"At most K trades" adds a dimension',
      d: "`dp[t][state][k]` — O(n·K). This is the classic transaction-limited variant, and it drops straight out of the same model rather than needing a new idea.",
    },
    {
      t: "Update every state from the previous step's values",
      d: "Overwriting one state and then reading it for another lets you enter and exit within a single step, which invents profit. Save the previous values in temporaries first.",
    },
  ],
  pitfalls: [
    "Charging the fee per bar rather than per transition. The result penalises holding and silently biases the oracle toward short trades.",
    "Updating the states in place so the second update sees the first's new value, which permits a same-bar round trip.",
    "Initialising the holding state to 0 rather than −Infinity, which asserts you were already holding for free before the first bar.",
    "Turning a counter into a state name — `boughtTwice`, `boughtThrice`. That is a dimension wearing a disguise, and it stops scaling the moment K grows.",
  ],
  quiz: [
    {
      q: "In the two-state profit oracle, where should the transaction fee be charged?",
      options: [
        "Once at the end",
        "On the transition between states — that is when a trade actually happens",
        "On every bar",
        "Only on losing trades",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Costs are incurred on state change. Charging per bar or once at the end produces a bound that is wrong in both directions.",
      distractors: [
        "Charging once at the end counts a single fee no matter how many round trips were taken, so the oracle rewards over-trading — the opposite of what a cost model is for.",
        "",
        "Per-bar charging penalises simply holding a position, which biases the oracle toward short trades and makes any strategy that holds look better than it is by comparison.",
        "The fee is known when the trade is placed, not after the outcome. Charging selectively on losers is hindsight leaking into the cost model.",
      ],
    },
    {
      q: "Adding a cooldown period after selling requires:",
      options: [
        "A second pass",
        "An extra state, e.g. flat / long / cooling",
        "A larger array",
        "Switching to a greedy algorithm",
      ],
      answer: 1,
      difficulty: "recall",
      why: '"Just sold" is genuinely a different situation from "free to buy". Adding the state keeps the recurrence O(1) per bar.',
      distractors: [
        "A second pass has no way to express a constraint that applies during the first. The restriction has to be visible while the decisions are being made.",
        "",
        "The array size is not the constraint — what is missing is a distinction the model cannot currently express, and that is what a state is for.",
        "Greedy was already unsafe once costs existed, and a cooldown makes local decisions even less reliable, not more.",
      ],
    },
    {
      q: "The value of an oracle P&L is that it lets you:",
      options: [
        "Trade more profitably",
        "Express a strategy's result as a fraction of what was theoretically extractable, which is far more informative than absolute P&L",
        "Predict future prices",
        "Eliminate transaction costs",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Absolute P&L conflates strategy quality with how much opportunity the period offered. The ratio separates the two, and makes results comparable across instruments and periods.",
      distractors: [
        "The oracle uses hindsight over a realised path, so nothing it produces can be traded. It is a measuring instrument, not a signal.",
        "",
        "It says nothing about the future — it describes what was already possible in data you already have.",
        "Costs are an input to the oracle, not something it removes. Changing the cost model changes the ceiling.",
      ],
    },
    {
      q: "Why does the fee-free version of this problem admit a simple greedy solution?",
      options: [
        "Because prices are always rising",
        "With no cost per trade, every upward move between consecutive bars can be captured independently, so summing the positive differences is optimal",
        "Because the DP is too slow",
        "It does not — greedy is never optimal here",
      ],
      answer: 1,
      difficulty: "apply",
      why: "With zero friction, holding through a dip and trading each rise separately give identical totals, so no choice ever has to be deferred. A fee breaks that equivalence, because splitting one trade into two now costs an extra fee.",
      distractors: [
        "Prices rise and fall in every interesting case. Greedy skips the falls, which is exactly why it works when skipping is free.",
        "",
        "The DP is a single linear pass — it is not slow. Greedy is preferred at zero fee for simplicity, not for speed.",
        "Greedy is provably optimal at fee zero. Claiming otherwise gives up a genuine and useful special case.",
      ],
    },
    {
      q: "Your oracle produces a profit far above what any real trade could achieve, on flat prices. Most likely cause?",
      options: [
        "The fee is too low",
        "The two state updates are done in place, so buying and selling within the same bar became possible",
        "Floating-point error",
        "The prices array is too long",
      ],
      answer: 1,
      difficulty: "apply",
      why: "If `flat` is overwritten and then read while computing `hold`, the model can buy and sell at the same price on the same bar. On flat prices that is free, and it repeats every bar — which is why the impossible profit scales with n.",
      distractors: [
        "A low fee permits more trades but never a profitable one on constant prices. Every round trip at a flat price is a loss or a wash.",
        "",
        "Rounding error would show as tiny discrepancies, not as a large profit on a series with no price movement at all.",
        "Length only multiplies the effect. A same-bar round trip is wrong at n = 3 too, which is exactly what the flat-prices test checks.",
      ],
    },
    {
      q: "The constraint changes to 'at most K transactions'. What does that cost?",
      options: [
        "Nothing — add a counter and stop when it hits K",
        "A third index, dp[t][state][k], making it O(n · S · K) — a dimension, not a state",
        "It becomes NP-hard",
        "A second pass over the prices",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The trade count is a counter ranging over K values, so it multiplies the state space rather than adding a fixed number of states. Since K can be as large as n/2, the worst case is quadratic — worth saying before someone assumes it stayed linear.",
      distractors: [
        "A single counter carried alongside cannot work: the best answer using three trades so far is not derived from the best answer overall, so you need a separate value per count.",
        "",
        "It stays polynomial and is solved exactly by the same recurrence with one more index. Nothing about a bounded counter introduces hardness.",
        "A second pass cannot enforce a limit on decisions the first pass already made.",
      ],
    },
    {
      q: "Which change belongs in the STATE rather than in a new dimension?",
      options: [
        "How many trades have been taken so far",
        "Whether the position is currently in a cooldown after an exit",
        "The number of units held, up to 100",
        "The cumulative fee paid",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A state is a qualitative situation with a small fixed number of values, so it costs nothing asymptotically. A counter ranges over many values and multiplies the work — and the tell is that its name would contain a number.",
      distractors: [
        "A counter with K values. Putting it in the state means inventing K state names, which is a dimension wearing a disguise.",
        "",
        "A hundred possible values is a dimension by any reasonable reading, and it multiplies the per-bar work by a hundred.",
        "Cumulative cost is derivable from the running total and does not affect which future moves are legal, so it does not belong in the state at all.",
      ],
    },
    {
      q: "Someone reports 'the strategy made ₹4.2 lakh last quarter'. What does the oracle let you add?",
      options: [
        "A confidence interval",
        "The denominator — what the ceiling was on those same bars under the same cost model, so ₹4.2 lakh becomes a capture ratio",
        "A prediction for next quarter",
        "The Sharpe ratio",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Absolute profit conflates skill with opportunity. Capturing ₹4.2 lakh out of a possible ₹8 lakh is a strong result; out of a possible ₹90 lakh it is a poor one, and the two are indistinguishable without computing the ceiling.",
      distractors: [
        "An interval needs a distribution over repeated runs. The oracle is a single deterministic number about one realised path.",
        "",
        "It is computed with hindsight over data that already exists and carries no predictive content whatsoever.",
        "Sharpe is a genuinely useful and complementary measure — it normalises by volatility rather than by available opportunity. It is a different denominator, not this one.",
      ],
    },
  ],
};

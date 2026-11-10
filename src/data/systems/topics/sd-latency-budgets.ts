import type { Topic } from "../../types.ts";

export const sdLatencyBudgets: Topic = {
  id: "sd-latency-budgets",
  title: "Latency budgets",
  tier: 1,
  week: 2,
  depth: "deep",
  summary:
    "Latency is the time from an event to your action. Split it into a budget per hop, judge it by the tail (p99), and stop spending once faster no longer pays.",
  why: "People will ask whether Traed is fast. The honest answer is not a number but a budget: a minute-bar system needs seconds, not microseconds, and the real risk is the slow tail, not the average. Your own history proves it. A tick relay that was fine on average starved a live stop-loss, and a fill poll added seconds to one order. You need the vocabulary to say where time goes and why you stopped optimising.",
  learn: {
    intuition:
      "Think of a relay race. The baton is the market event: a price changes. It passes from the exchange to your broker's feed, to your server, to your rules, to your order, and back to the exchange. The finishing time is the sum of every handover, and the slowest handover decides how bad a bad day is. A latency budget is the rule that says: from price change to order on the wire, we allow this much time in total, and each runner gets a share. You do not make every runner a sprinter. You find the runner who uses most of the time and fix that one. You also ask a second question that people forget: how fast does the race need to be? A shopkeeper who restocks once a day does not need a delivery van that arrives in ten minutes. If your strategy decides once a minute, shaving a few milliseconds from one hop changes nothing, while one handover that sometimes takes ten seconds can ruin the day.",
    mechanics: [
      {
        heading: "Latency classes: three worlds, three orders of magnitude",
        body: "High-frequency firms place their servers inside the exchange's data centre (co-location) and measure the path in microseconds, a millionth of a second. A retail algo platform in India talks to a broker's API over the public internet; a round trip of a few hundred milliseconds is normal, and a slow one is seconds. A system that decides on one-minute bars lives in a third world, where the rule runs once every 60,000 milliseconds. These are different engineering problems, not faster and slower versions of one problem. Microsecond systems fight network cards and memory layout. Minute-bar systems fight stalls, retries and wrong timestamps. Knowing your class tells you which problems are yours.",
      },
      {
        heading: "A budget per hop, from event to action",
        body: "Write the path as a list of hops: broker feed to your process, aggregation into a candle, rule evaluation, risk checks, order to the broker, broker acknowledgement. Give the whole path a total, then give each hop an allowance. A teaching example: if a stop-loss should reach the broker within 1,000 ms of the price print, you might allow 150 ms for the feed, 50 ms for evaluation and 600 ms for the order call, leaving 200 ms spare. The list does two jobs. It shows which hop dominates, and it shows which hops you can remove entirely. Removing a hop beats speeding it up, because a hop you do not have cannot be slow.",
      },
      {
        heading: "Averages hide the tail: read p99, not the mean",
        body: "The p99 is the time that 99 out of 100 requests beat. Averages hide it. Suppose 99 orders take 100 ms and one takes 10,000 ms: the average is about 199 ms, which looks healthy, yet that one order may be your stop-loss. Tails also multiply. If one request fans out to 100 calls and each call is slow 1% of the time, then 1 minus 0.99 to the power 100, about 63%, of requests meet at least one slow call. Google engineers described this in the paper The Tail at Scale. So alert on p99 or on the maximum during the busy window, such as the first minutes after 09:15.",
      },
      {
        heading: "When faster is worthless",
        body: "Speed has a price: engineering time, money and more things to break. It pays only when latency changes the outcome. For a rule evaluated on a closed 15-minute bar, the decision cannot be made earlier than the close, so a faster feed adds nothing to entries. Price can move more than the whole latency saving while the bar is still open, so the gain is below the noise. The same logic works in reverse: some paths do need speed, such as a stop-loss on a fast-moving option leg, where a delay of a minute can mean a different exit price. Spend speed where the clock is tied to money at risk, nowhere else.",
      },
      {
        heading: "Saying it about Traed",
        body: "We are a minute-bar system, so our entries wait for a closed candle and do not chase milliseconds. We spend speed only where money is exposed: held option legs are watched on the live tick feed, with a timer as a backstop, and the engine now connects to the broker feed directly because a relay hop starved a stop once. We pay for this with a single server and a public-internet round trip to the broker, so we are not a high-frequency system and do not claim to be. We would revisit this if we moved to tick-level entries or sub-second strategies, because then each hop would need a measured budget.",
      },
    ],
    complexityDerivation:
      "The invariant is simple: the time between an event and your reaction to it must stay inside the window in which that reaction is still worth having. Everything else follows. Hops add, so the path is only as good as the sum, and a long path can be shortened by removing hops. Tails dominate because a trading day is made of a few critical moments, such as the open, the stop and the expiry, and a rare slow response at the wrong moment costs more than a thousand fast responses at quiet ones. That is why the budget is set on the p99 or the worst case, not the mean. The argument holds while your strategy's decision interval is much longer than the path. It stops holding when the two get close. If you move from one-minute bars to second-level or tick-level decisions, the path becomes a large fraction of the interval, ordering and queueing start to matter, and averages become dangerous. It also stops holding at venues where being first is the product, because there latency is the competition, not a cost. Then you are in the co-location world and the budget is measured in microseconds.",
    variants: [
      {
        name: "Co-located, microsecond systems",
        when: "Market making and arbitrage, where being first decides the trade.",
        delta:
          "Servers sit in the exchange's data centre, code avoids allocation and locks, and the network is measured in microseconds. Cost is very high and the skill set is different.",
      },
      {
        name: "Retail algo over a broker API",
        when: "Strategies that act in seconds to minutes, using a broker's public API.",
        delta:
          "Budget in hundreds of milliseconds, dominated by the internet and the broker's order endpoint. Published rate limits matter more than raw speed.",
      },
      {
        name: "Event-time, bar-based systems",
        when: "Rules decided once per closed candle, with a separate faster path for risk exits.",
        delta:
          "Entries are bound by the bar, not the network. Latency work focuses on the exit path and on the tail: stalls, retries, a feed that goes quiet.",
      },
    ],
    tradeoffs: [
      {
        vs: "Optimising the mean response time",
        pick: "Set targets on p99 or the maximum in the busy window",
        because:
          "The mean can look healthy while the one order that mattered took ten seconds. A target on the tail makes the rare slow case visible and owned.",
      },
      {
        vs: "Making every hop faster",
        pick: "Remove a hop, or run risk exits on a separate fast path",
        because:
          "A relay you no longer need has zero latency and cannot fail. Speeding up a hop you keep only helps if that hop dominates the sum.",
      },
      {
        vs: "Co-location or a nearer data centre",
        pick: "Stay where you are while decisions are minute-scale",
        because:
          "If a candle takes 60 seconds to form, saving 30 milliseconds on the network changes almost nothing. Money is better spent on measurement and on the exit path.",
      },
    ],
  },
  realWorld: [
    {
      system: "LMAX Exchange: one thread, in memory",
      kind: "industry",
      problem:
        "A trading venue needs very high throughput and low, predictable latency, while keeping business logic simple and correct.",
      applied:
        "LMAX, a London exchange, described a design that runs business logic on a single thread, in memory, fed by a ring buffer called the Disruptor. It avoids locks and database calls in the hot path and reports millions of orders per second. The lesson is that removing waits, not adding servers, bought the speed.",
      evidence:
        "Martin Fowler, The LMAX Architecture (martinfowler.com, 2011); LMAX Disruptor technical paper",
      impact:
        "Shows how a latency budget leads to design: take slow things (disks, locks, network hops) off the critical path.",
    },
    {
      system: "The Tail at Scale (Google)",
      kind: "industry",
      problem:
        "When one user request fans out to many servers, rare slow responses become common slow requests.",
      applied:
        "Jeffrey Dean and Luiz Barroso showed that the more calls a request depends on, the more the slowest call decides the total. They describe remedies such as hedged requests, which send a second copy after a short wait, and giving each call a deadline.",
      evidence:
        "Dean and Barroso, The Tail at Scale, Communications of the ACM, 2013",
      impact:
        "This is why you alert on p99 and why a long chain of hops, even if each is fast on average, can disappoint.",
    },
    {
      system: "Traed: held option legs exit on live ticks",
      kind: "yours",
      problem:
        "A stop on an option leg was sampled every 20 seconds from a quote that refreshed about once a minute, so a short dip through the stop went unseen.",
      applied:
        "Held legs are now subscribed on the tick feed and their stop, trail and target rules run at tick price, using the price the leg can actually be closed at. A 20-second timer stays as a backstop. A shared in-flight guard stops the candle path, the timer and the tick path from sending the same exit twice.",
      evidence:
        "strategy-engine/app/services/universal_strategy_executor.py (_on_leg_tick, LIVE_RISK_EXIT_TIMER_S, LEG_TICK_EXITS)",
      impact:
        "The exit path got a faster, separate route while entries stayed on closed candles.",
    },
    {
      system: "Traed: removing the relay from the money path",
      kind: "yours",
      problem:
        "Ticks reached the engine through a serverless relay shared with browser dashboards. Serial sends to dead connections added latency until it crossed the engine's 60-second staleness limit.",
      applied:
        "The post-mortem records a fix that sent the posts in parallel, and then a direct connection from the engine to the broker feed, so execution no longer depends on the relay. The relay still serves dashboards. A fallback and a kill-switch exist for the direct feed.",
      evidence:
        "docs/postmortems/2026-08-26-tick-feed-outage.md; strategy-engine/app/services/data_processing/direct_kite_ticker.py",
      impact:
        "A hop that had been fine on average, and failed in the tail, was taken out of the path that matters.",
    },
  ],
  algorithms: [
    {
      name: "Percentile estimation (p50, p99)",
      role: "Reads latency from the slow tail of the distribution rather than the mean, which is where users and stop-loss exits actually suffer.",
      dsa: "approximation",
    },
    {
      name: "HDR histogram",
      role: "Records latencies in buckets with bounded relative error, so tail percentiles stay cheap to store and accurate enough to alert on.",
    },
    {
      name: "Sliding-window percentile",
      role: "Computes percentiles over only the last few minutes, so a recent regression is visible and not buried under old good samples.",
      dsa: "sliding-window",
    },
  ],
  insights: [
    {
      t: "Budget the path, not the hop",
      d: "Latency is the sum of hops from event to action. Write the hops down, give each an allowance, and fix the one that dominates.",
    },
    {
      t: "The tail is the product",
      d: "Judge by p99 or the worst case in the busy window. A healthy mean can hide the one slow order that mattered.",
    },
    {
      t: "Remove before you speed up",
      d: "A hop that does not exist adds no delay and cannot fail. Cutting the relay from the money path beat tuning it.",
    },
    {
      t: "Know your class",
      d: "Microsecond, hundreds-of-milliseconds and minute-bar systems have different problems. Spend speed only where it changes the outcome.",
    },
  ],
  pitfalls: [
    "Quoting an average latency and calling the system fast. The average is dominated by the many easy cases and says nothing about the rare slow one at the open or at a stop.",
    "Optimising a hop that is not the largest. Cutting 20 ms from a 40 ms hop does nothing for a path where the order call takes 900 ms at p99.",
    "Putting risk exits and dashboards on the same delivery path. One churning dashboard tab can then delay the message that closes a position.",
  ],
  quiz: [
    {
      q: "What does a p99 latency of 800 ms mean?",
      options: [
        "The average of all requests is 800 ms",
        "99 out of 100 requests finished in 800 ms or less",
        "Exactly 99 requests took 800 ms each",
        "The slowest request took 99 times the average",
      ],
      answer: 1,
      why: "p99 is a percentile. It is the value that 99% of requests beat, which means 1 in 100 is slower. It describes the tail, which the mean cannot show.",
      difficulty: "recall",
      distractors: [
        "That is the mean, which is exactly the number that hides the slow tail.",
        "",
        "It sounds like a count of requests, but a percentile is a time value, not a number of requests.",
        "It mixes up two ideas. A percentile says nothing about a multiple of the average.",
      ],
    },
    {
      q: "In a latency budget, what is divided among the hops?",
      options: [
        "The number of servers the system may run",
        "The money allowed for each service per month",
        "The error rate each component may produce",
        "The total time allowed from event to action",
      ],
      answer: 3,
      why: "A latency budget fixes the total time between the event and the reaction, then gives each hop an allowance. Cost and error rate have their own budgets.",
      difficulty: "recall",
      distractors: [
        "Capacity planning is related but it is a different budget, counted in machines and not in time.",
        "A cost budget is real and useful, but it is not what a latency budget divides.",
        "Error budgets exist in reliability work, but they count failures, not milliseconds.",
        "",
      ],
    },
    {
      q: "A held option leg has a 5% stop. The premium drops through the stop for 6 seconds and then recovers. The engine checks the leg every 20 seconds from a quote. What is the likely result?",
      options: [
        "The dip can be missed entirely, so the stop does not fire when it should",
        "The check always fires within a second of the dip starting",
        "The stop fires twice, once for the dip and once for the recovery",
        "The broker closes the leg automatically at the stop price",
      ],
      answer: 0,
      why: "Sampling every 20 seconds can step over a 6-second dip. The delay between event and detection can be as long as the sampling period. Running the rule on each tick removes that gap.",
      difficulty: "apply",
      distractors: [
        "",
        "A 20-second timer fires on a clock, not on the price. It only sees the dip if a check happens to land inside the 6 seconds.",
        "Double fires are a real risk when several paths exist, but a missed dip is the problem here, and recovery never triggers a stop.",
        "A stop held in your own engine is not an order at the broker unless you placed one, so nothing closes it for you.",
      ],
    },
    {
      q: "A teaching budget allows 1,000 ms from price print to stop order. Measured p99s are feed 120 ms, evaluation 30 ms, and order call 950 ms. Which hop should you attack first?",
      options: [
        "The feed, because it is first in the chain",
        "Evaluation, because code you wrote is easiest to change",
        "The order call, because its p99 alone nearly uses the budget",
        "None, because the three add to more than the budget anyway",
      ],
      answer: 2,
      why: "The order call is 950 of the 1,100 ms total at these p99s, so it is the dominant hop. Improving the others by half would still leave the budget broken.",
      difficulty: "apply",
      distractors: [
        "Position in the chain does not matter. Only the share of time each hop takes decides where to work.",
        "Easy to change is not the same as worth changing. Evaluation is under 3% of the total here.",
        "",
        "Exceeding the budget is a reason to act, not to stop. The budget tells you where the excess sits.",
      ],
    },
    {
      q: "On Exit all, a system closes 5 legs one after another. Each broker call takes about 400 ms. How long until the last order is sent, and what would change that?",
      options: [
        "About 400 ms; the calls overlap by default",
        "About 2,000 ms; sending the five in parallel would cut it to about 400 ms",
        "About 2,000 ms; nothing can change it because the broker allows one call at a time",
        "About 400 ms; adding more legs does not change the time",
      ],
      answer: 1,
      why: "Sequential calls add: 5 times 400 ms is about 2 seconds. If the calls are independent and the broker's limits allow it, running them in parallel makes the total close to the slowest single call.",
      difficulty: "apply",
      distractors: [
        "Calls only overlap if the code makes them overlap. Sequential code waits for each one.",
        "",
        "Brokers publish rate limits, not a one-at-a-time rule. A few parallel calls are normally allowed.",
        "More legs in a sequential loop add one more call each. The time grows with the number of legs.",
      ],
    },
    {
      q: "A dashboard shows an average tick delay of 80 ms all day, yet traders complain about the minutes after the 09:15 open. What is the best next step?",
      options: [
        "Add more memory to the server, since the average looks fine",
        "Restart the feed every morning before the open",
        "Replace the average with a rolling five-minute mean",
        "Chart p99 and the maximum for the first 15 minutes after the open",
      ],
      answer: 3,
      why: "A day-long average dilutes a short spike. The problem lives in a narrow window and in the tail, so measure the tail inside that window.",
      difficulty: "apply",
      distractors: [
        "Adding memory is a guess. The average gave no sign that memory is the limit.",
        "A restart does not tell you what is slow and may cause the stall it is meant to prevent.",
        "A shorter window is better, but a mean still averages away the spike. A percentile or maximum shows it.",
        "",
      ],
    },
    {
      q: "A founder proposes renting a server inside a data centre next to the exchange to cut 20 ms of network time. The strategy trades 5-minute bars on NIFTY options. What is the sound judgement?",
      options: [
        "Not worth it: entries wait for a closed bar, so 20 ms is noise",
        "Worth it: every millisecond saved improves every trade equally",
        "Worth it only if the rupee cost is below one lakh a year",
        "Not worth it, because co-location is not allowed for retail traders",
      ],
      answer: 0,
      why: "Decisions are made once per five minutes. A 20 ms saving is 0.007% of the interval, far below the price noise. Spend the effort on the tail and on the exit path instead.",
      difficulty: "judge",
      distractors: [
        "",
        "Gains are not equal across trades. Speed helps only where the outcome depends on arriving first.",
        "Cost matters, but the gain is near zero here, so even a low price buys nothing.",
        "Rules on co-location vary and are not the reason. The reason is that the strategy does not need it.",
      ],
    },
    {
      q: "A 15-minute rule can be evaluated on every tick or once at bar close. Which choice is better, and why?",
      options: [
        "On every tick, since it reacts earliest to the market",
        "On every tick, but only after 09:30 to avoid the open",
        "At bar close, as earlier runs would read an unfinished bar",
        "At bar close, because ticks arrive too slowly to use",
      ],
      answer: 2,
      why: "A rule on a closed bar changes only when the bar closes. Running it earlier reads a bar that is still forming, can flip back and forth, and costs CPU. Speed adds nothing to the decision.",
      difficulty: "judge",
      distractors: [
        "Earlier is not better when the input is incomplete. A half-formed bar can signal and then reverse.",
        "Skipping the open does not fix the real issue, which is reading an unfinished bar.",
        "",
        "Ticks arrive often, many per second on liquid names. The point is that the rule has no new input between closes.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-latency-budgets-leg-stop",
      scenario:
        "A one-server engine runs a short option strategy on NIFTY with up to 4 legs open. Entries use 5-minute closed bars. Leg stops are checked every 20 seconds against a quote that refreshes about once a minute. On a volatile day a premium fell 12% through a 5% stop in under two minutes and recovered; the stop never fired and the leg later exited much lower. The founder has no budget for new hardware. How do you fix the exit path?",
      options: [
        { label: "Move to the exchange", appeal: "Lower network time to everything, and it sounds like the serious-trader answer." },
        { label: "Faster timer", appeal: "One constant to change, no new code path." },
        { label: "Tick feed for held legs", appeal: "Only the few legs at risk get the fast path, and the stale quote is removed." },
        { label: "Faster entry bars", appeal: "Reacting sooner to price looks like it would also help exits." },
      ],
      best: 2,
      verdict:
        "Only the held legs need speed, and there are at most 4 of them, so a tick subscription is cheap. It removes the stale quote, which was the real cause. A 5-second timer still reads a quote that is up to a minute old. Co-location spends money on a hop that was not the problem. Faster entry bars do nothing for a stop that sits on the exit path.",
      claims: [
        {
          text: "You accept extra feed subscriptions and a second code path in return for stops that react at tick speed.",
          axis: "trade",
          correct: true,
          note: "Right. Each held leg adds a subscription and the exit logic must exist on both the tick path and the timer, which needs care to avoid double exits.",
        },
        {
          text: "You give up closed-bar entries to make exits faster.",
          axis: "trade",
          correct: false,
          note: "Entries are unchanged. The fast path applies only to exits on held legs, which is the point of separating the two.",
        },
        {
          text: "The tick path and the timer can both send an exit for the same leg unless an in-flight guard prevents it.",
          axis: "failure",
          correct: true,
          note: "True. Two paths watching one position will both fire. A shared guard keyed by leg makes them mutually exclusive.",
        },
        {
          text: "A tick with no usable bid or ask should still fire the stop, using the last trade price.",
          axis: "failure",
          correct: false,
          note: "A bare last trade can be stale or off-book. Holding until a tick with a usable book arrives, with the timer as a backstop, avoids a false stop.",
        },
        {
          text: "Measure the delay from the price crossing the stop to the exit order leaving the engine, at p99 during the first and last hour.",
          axis: "measure",
          correct: true,
          note: "That is the budget that matters for this path. The tail, taken in the busy windows, shows the rare slow case.",
        },
        {
          text: "Measure the average CPU use of the engine over the day.",
          axis: "measure",
          correct: false,
          note: "CPU use does not say how late the stop was. The failure was in detection delay, not compute.",
        },
      ],
    },
    {
      id: "sd-latency-budgets-order-tail",
      scenario:
        "A retail broker's order service handles 4,000 orders a second at the 09:15 open. Mean latency is 90 ms and the dashboard is green, but support gets complaints of orders that took several seconds. Each order calls 6 internal services in sequence: auth, risk, margin, routing, exchange gateway, and audit. You have two engineers for one quarter. What do you do first?",
      options: [
        { label: "Per-hop p99 histograms", appeal: "It finds the hop that creates the slow tail before any money is spent." },
        { label: "Add servers", appeal: "Capacity is the usual first answer to slowness and is easy to buy." },
        { label: "Merge the services", appeal: "Fewer hops looks like less latency." },
        { label: "Longer timeouts", appeal: "Fewer visible errors, quickly." },
      ],
      best: 0,
      verdict:
        "The symptom is a tail, not a mean, so the first job is to see it. Per-hop p99 histograms show which of the six hops creates the multi-second cases, and the open window is where it happens. Adding servers or rewriting are large spends aimed at a hop you have not identified. Longer timeouts hide the problem and make slow orders slower.",
      claims: [
        {
          text: "You trade some instrumentation cost for the ability to see which hop causes the slow orders.",
          axis: "trade",
          correct: true,
          note: "Histograms add overhead and storage, but without them the team is guessing among six hops.",
        },
        {
          text: "Merging the six services removes the need to measure, since there is then only one hop.",
          axis: "trade",
          correct: false,
          note: "A merged service still has internal steps with their own tails, and you lose the isolation the split gave you.",
        },
        {
          text: "With six sequential calls, a rare slow response in any one of them slows the whole order.",
          axis: "failure",
          correct: true,
          note: "Sequential hops add. If each hop is slow 1% of the time, about 6% of orders meet at least one slow hop.",
        },
        {
          text: "Because the mean is 90 ms, the complaints must come from the clients' own networks.",
          axis: "failure",
          correct: false,
          note: "A healthy mean is exactly what a tail problem looks like. Blaming clients before checking the p99 is a common mistake.",
        },
        {
          text: "The key number to chart is p99 and the maximum per hop, restricted to the minutes after the open.",
          axis: "measure",
          correct: true,
          note: "The open is when the load and the tail peak, and percentiles per hop point to the culprit.",
        },
        {
          text: "The key number to chart is the day-long average of end-to-end latency.",
          axis: "measure",
          correct: false,
          note: "That is the number already on the green dashboard. It dilutes a short peak across a whole trading day.",
        },
      ],
    },
    {
      id: "sd-latency-budgets-colocate",
      scenario:
        "A two-person team runs a strategy on NIFTY options that enters on a closed 15-minute bar and exits on a fixed stop and a time cut at 15:15. It runs on one cloud server in Mumbai. Round-trip to the broker API is about 200 ms and fills are by marketable limit orders. A vendor offers a server in the exchange's data centre for a recurring monthly fee that is a large share of the team's profit. Backtests show typical slippage per trade is several rupees on a lot. Should they take it?",
      options: [
        { label: "Take the co-located server", appeal: "Being near the exchange feels like an edge for any strategy." },
        { label: "Co-locate exits only", appeal: "Exits are the money-critical path, so spend there." },
        { label: "Stay and measure", appeal: "No fee, and the real tail sits in the broker order call, which is cheap to measure." },
        { label: "Cheaper overseas host", appeal: "The strategy is slow, so saving fixed cost looks free." },
      ],
      best: 2,
      verdict:
        "Entries are fixed by a 15-minute close, the broker API is still reached over the internet even from a co-located box, and slippage comes from price movement and order type more than from tens of milliseconds. The fee is large against profit. The cheap gains are in how orders are placed and in knowing the real tail of the order call. A faraway server would raise latency.",
      claims: [
        {
          text: "You accept a slower path to the broker in exchange for keeping a fixed cost low.",
          axis: "trade",
          correct: true,
          note: "True, and it is the right trade here because the strategy does not act on millisecond edges.",
        },
        {
          text: "Co-location removes the broker API round trip entirely.",
          axis: "trade",
          correct: false,
          note: "A retail broker API is still called over the network. Being near the exchange does not bring the broker's order endpoint closer.",
        },
        {
          text: "If the order call occasionally takes several seconds, a stop can fill at a much worse price whatever the server location.",
          axis: "failure",
          correct: true,
          note: "The risk is in the tail of the broker call, which a nearer server does not fix.",
        },
        {
          text: "A move to the cheaper overseas server has no downside because the strategy is slow.",
          axis: "failure",
          correct: false,
          note: "Slow strategies tolerate some delay, but more distance adds tail risk on exits at exactly the wrong moments.",
        },
        {
          text: "Compare the realised slippage per trade with the fee, to see what milliseconds could possibly be worth.",
          axis: "measure",
          correct: true,
          note: "This puts a rupee ceiling on the gain from speed before any money is spent.",
        },
        {
          text: "Compare the average ping time of the two servers and pick the lower one.",
          axis: "measure",
          correct: false,
          note: "Ping to the exchange is not the path that orders take, and an average ignores the tail.",
        },
      ],
    },
  ],
};

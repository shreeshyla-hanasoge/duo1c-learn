import type { Topic } from "../../types.ts";

export const sdPretradeRisk: Topic = {
  id: "sd-pretrade-risk",
  title: "Pre-trade risk and kill switches",
  tier: 4,
  week: 8,
  depth: "deep",
  summary:
    "Risk checks sit between signal and broker, outside strategy code, so one bug cannot size or fund its own order. Plus sticky loss stops and a manual exit.",
  why: "Traed lets rule-built strategies place real orders on a real account. A strategy is code you or a user wrote that morning, and code has bugs. The safe design assumes the strategy will sometimes be wrong and puts a second, simpler layer between its signal and the broker. You will be asked how a bad rule is stopped from losing the account. This lesson gives you the names, the order of the gates and Traed's honest list of what is covered.",
  learn: {
    intuition:
      "Think of a cheque book at a company. The person who writes the cheque is not the person who can release the money. A second person checks the amount, checks the account has funds, and refuses anything above a fixed limit. The writer may be honest and still make a typing mistake, so the check does not depend on trust. Pre-trade risk is that second person. The strategy decides what it would like to do. The risk layer decides what is allowed to leave the building. The two must be separate pieces of code, because a check written inside the strategy fails in exactly the situations where the strategy is already wrong. A kill switch is the emergency version: one action that stops new orders and, if you ask, closes what is open. It must work even when the strategy is confused, and it must stay stopped until a person says otherwise.",
    mechanics: [
      {
        heading: "Checks live outside the strategy, and in a fixed order",
        body: "A pre-trade check is code that runs after a signal exists and before an order reaches the broker. Keeping it outside strategy code is the whole point. In August 2012 Knight Capital lost about 440 million US dollars in roughly 45 minutes after a faulty software release started sending unintended orders, and no independent layer stopped them. In Traed the gates run in sequence: the daily loss block, the entry time window, the funds check, then order creation, where the exchange quantity ceiling is applied as the last step before submit. Each gate can refuse without knowing why the strategy wanted the trade.",
      },
      {
        heading: "Hard caps: quantity and the exchange ceiling",
        body: "The simplest check is a number the order may not exceed. Exchanges publish a per-order freeze quantity, and an order above it is rejected whole. For NIFTY options Traed's table says 1,800 units per order, and for BANKNIFTY 900. If a percent-of-capital sizing rule asks for 11,000 units, the order layer clips it to 1,800, rounded down to whole lots, and logs an error so the sizing bug is visible. The cap protects against a runaway size, whatever the cause. Honest limit: clipping sends one smaller order, it does not slice the rest into several orders. Slicing is still open in the readiness register.",
      },
      {
        heading: "Money checks: can the account pay, and fail closed",
        body: "Before a buy order exists, Traed reads the broker's real buying power for that segment and compares it with price times quantity plus a 2% buffer. A buy of 1,800 units at ₹120 needs ₹2,16,000 plus the buffer, so ₹2,20,320. If the balance cannot be read, the entry is blocked. Reading nothing is not the same as having funds. Two exceptions are deliberate. Exits are never blocked by this check, because closing a short option is itself a buy order. Sell orders are not covered yet, since they need a margin calculation. A blocked entry is dropped, not retried; only a fresh signal can try again.",
      },
      {
        heading: "Loss breakers, duplicate guards and the kill switch",
        body: "A loss breaker stops new entries after a loss limit is hit. Traed writes each trip to a MySQL ledger row per strategy, mode and IST date, because a restart or a Redis eviction used to be able to clear a tripped limit. A daily trip lifts at the next IST day. A weekly or monthly trip stays until a person resets it. A duplicate-entry guard looks for an open position of the same strategy before opening another. The manual stop is Exit all: it buys back sold legs before selling bought ones, answers a repeated request id with the first answer, and blocks new entries for the rest of the day.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep risk checks out of strategy code. Between a signal and the broker there is a short chain of gates: a loss breaker, a funds check that fails closed, and an exchange quantity ceiling applied just before submit. Loss trips are stored in MySQL so a restart cannot clear them, and an operator can square off one position or everything from the web app. We accept that sell-side margin is not checked yet and that oversized orders are clipped, not sliced. We would revisit that when a second user trades live, because one user's limits then need an account-wide layer above them.",
      },
    ],
    complexityDerivation:
      "The invariant is simple: no single piece of code can both decide to trade and approve the trade. If one component does both, a bug in the decision also bypasses the approval, and the Knight Capital loss is what that looks like at scale. Separation holds as long as the gate is simpler than the thing it guards. A cap on units or a funds comparison is a few lines that can be tested exhaustively, while a strategy is open-ended. The argument also needs the gate to fail closed for entries. If a gate that cannot read its inputs lets the order through, it protects nothing on the days that matter, which are the days something is broken. It stops holding in three places. A gate that blocks exits can trap you in a losing position. State kept only in memory or in a cache can vanish and open the gate. And with many strategies or users on one account, a per-strategy gate cannot see the combined exposure, so an account-level layer has to sit above it.",
    variants: [
      {
        name: "Inline gate before submit",
        when: "Every order, always. This is the baseline pre-trade check.",
        delta:
          "Runs synchronously on the order path. Cheap checks only (caps, funds, time window), because it adds to every order's latency.",
      },
      {
        name: "Sticky breaker with manual reset",
        when: "After a loss limit or a technical fault, when auto-resume could hide a real problem.",
        delta:
          "The trip is stored durably and survives restarts. A daily trip lifts by itself at the next day; weekly and monthly ones need a human reset.",
      },
      {
        name: "Account-level kill switch above all strategies",
        when: "Several strategies or users share one broker account or one firm limit.",
        delta:
          "Aggregates exposure across strategies and can stop all of them at once. Traed's Exit all works per strategy today; an account-wide layer is a roadmap item.",
      },
    ],
    tradeoffs: [
      {
        vs: "Fail open on an unreadable balance",
        pick: "Fail closed for entries",
        because:
          "A missed entry costs one trade. A wrongly allowed entry on an unfunded account costs a rejection storm or an unplanned margin call. Exits stay open because trapping a position is worse.",
      },
      {
        vs: "Rejecting an oversized order",
        pick: "Clipping it to the exchange ceiling",
        because:
          "The exchange would reject the whole order anyway, so sending nothing is no safer. Clipping still gets a smaller position and logs the sizing fault, at the cost of trading a size the strategy did not ask for.",
      },
      {
        vs: "Loss state held in memory or Redis",
        pick: "A durable MySQL ledger",
        because:
          "A restart or cache eviction must not reset a tripped limit. The cost is a database write after every realised fill, done on a worker thread so the trading path never waits on it.",
      },
    ],
  },
  realWorld: [
    {
      system: "Knight Capital, 1 August 2012",
      kind: "industry",
      problem:
        "A software release left old, unused order logic active on some servers. For about 45 minutes the firm sent unintended orders into the US market.",
      applied:
        "The public SEC findings describe missing controls: no independent check stopped the flow of orders or limited the firm's total exposure. The loss, about 440 million US dollars, was larger than the firm's capital buffer.",
      evidence: "US SEC order against Knight Capital Americas, October 2013 (public)",
      impact:
        "It is the standard example of why limits must sit outside the code that creates orders.",
    },
    {
      system: "NSE per-order freeze quantity",
      kind: "industry",
      problem:
        "An unusually large order, often from a typing or sizing mistake, should not reach the matching engine in one piece.",
      applied:
        "The exchange publishes a maximum quantity per order for each derivative underlying. Orders above it are stopped at the exchange, so every broker and algo platform has to size or slice below it.",
      evidence: "NSE circulars on freeze quantity for equity derivatives (public)",
      impact:
        "A rule set by the exchange is the one limit your own code cannot get around, so build your cap to match it.",
    },
    {
      system: "Traed order-level exchange ceiling",
      kind: "yours",
      problem:
        "Percent-of-capital sizing could ask for far more units than one NIFTY order may carry, and nothing in the engine knew the limit.",
      applied:
        "A per-underlying table of freeze quantities, overridable by environment variable, is applied in the order manager as the last step before the broker. A larger order is clipped to a whole-lot quantity and an error is logged.",
      evidence:
        "strategy-engine/app/services/risk_core/position_sizing.py; strategy-engine/app/services/order_management/order_manager.py",
      impact:
        "No order leaves the engine above the ceiling, whatever the sizing layer intended. Slicing into several orders is not built yet.",
    },
    {
      system: "Traed durable loss breaker and Exit all",
      kind: "yours",
      problem:
        "A tripped daily loss limit lived in process memory and Redis, so a restart or an eviction could quietly let a strategy trade again.",
      applied:
        "Each trip is written to a MySQL ledger row per strategy, mode and IST date and read back before the first evaluation. Exit all adds an entry block for the rest of the day and closes sold legs before bought ones.",
      evidence:
        "strategy-engine/app/services/risk_breaker.py; strategy-engine/app/services/position_square_off.py; docs/live-readiness.md",
      impact:
        "A limit that evaporates on restart is not a limit. This one survives deploys and cache loss.",
    },
  ],
  insights: [
    {
      t: "Decide and approve in different places",
      d: "The strategy proposes, a separate simple layer disposes. If one bug can change both, you have no control, only a hope.",
    },
    {
      t: "Fail closed for entries, never for exits",
      d: "If a check cannot read its inputs, refuse to open. But never let a check stop you closing, because a trapped position is the worse outcome.",
    },
    {
      t: "A limit must survive a restart",
      d: "A tripped breaker kept only in memory or a cache is cleared by the very events (crash, deploy, eviction) that tend to follow trouble.",
    },
    {
      t: "A kill switch is a plan, not a button",
      d: "Decide in advance what it stops, what it closes, in what order (sold legs first), and what keeps it stopped until a person resets it.",
    },
  ],
  pitfalls: [
    "Putting the checks inside the strategy code. They then share its bugs and disappear when the strategy is edited or duplicated.",
    "Letting the gate fail open because a balance or ledger read timed out. The gate then works on calm days and fails on the bad ones.",
    "Applying the same gate to exits. A funds or loss block on a closing order pins a losing position open at the worst moment.",
  ],
  quiz: [
    {
      q: "Where should a pre-trade risk check live relative to strategy code?",
      options: [
        "Inside each strategy, next to the entry rule, so it can read the strategy's state",
        "In a shared helper that each strategy imports and may skip with a flag",
        "In a separate layer between signal and broker that the strategy cannot bypass",
        "Only at the broker, since the broker already enforces its own limits",
      ],
      answer: 2,
      why: "A control is only independent if the code it guards cannot switch it off or share its bugs. A separate layer on the order path gives that. Broker-side limits are a useful extra, not a replacement.",
      difficulty: "recall",
      distractors: [
        "Tempting because the strategy knows its own state, but then one bug in the strategy also disables the check.",
        "Tempting because it avoids duplicated code, but a skip flag means the check is optional exactly when someone is in a hurry.",
        "",
        "Tempting because it needs no code of your own, but broker limits are generic and sit far above your intended size.",
      ],
    },
    {
      q: "What is the main purpose of a sticky circuit breaker after a daily loss limit trips?",
      options: [
        "To hold new entries blocked until the next IST day, even across a restart",
        "To make the trip clear itself after ten minutes so trading resumes",
        "To close every open position at once at the market price",
        "To cap the order size for the rest of the day at half the normal size",
      ],
      answer: 0,
      why: "The point of a sticky trip is that restarts and cache loss cannot undo it. It blocks new entries, not exits, and lifts on a defined schedule or by a human reset.",
      difficulty: "recall",
      distractors: [
        "",
        "Auto-resume feels friendly, but a breaker that clears itself quickly does not stop a strategy that is losing for a real reason.",
        "Closing everything is the job of a square-off action. A loss breaker blocks new entries and lets open positions exit by their own stops.",
        "Halving size is a throttle, not a stop. After a limit breach the question is whether to trade at all.",
      ],
    },
    {
      q: "A NIFTY option order is sized at 11,000 units and the exchange ceiling is 1,800 units per order. What should the order layer do as its last step before the broker?",
      options: [
        "Send it as it is and let the exchange reject it",
        "Send the whole 11,000 units in one request marked urgent",
        "Silently drop it, since the size is invalid",
        "Clip it to 1,800 units (whole lots), log an error, and send that",
      ],
      answer: 3,
      why: "The exchange rejects an over-ceiling order whole, so passing it through gets no position and no warning. Clipping gives a bounded order and leaves an error showing that sizing is wrong.",
      difficulty: "apply",
      distractors: [
        "It looks harmless because the exchange protects itself, but a whole-order rejection means a missed trade and no visible sign of the sizing fault.",
        "There is no urgent flag that lifts an exchange freeze quantity, so this is just the first option with extra hope.",
        "Dropping is safe but silent. A bounded order plus an error log both limits risk and surfaces the bug.",
        "",
      ],
    },
    {
      q: "Your funds check cannot read the broker balance at 09:20 because the API timed out. A strategy signals a BUY entry. What should the gate do?",
      options: [
        "Allow the order, since the balance is probably fine",
        "Block the entry and raise an alert, but still allow exits",
        "Block everything, including exits, until the balance is readable",
        "Retry the read every second and place the order when it succeeds, even if the signal is stale",
      ],
      answer: 1,
      why: "Entries fail closed because an unreadable balance is not a funded one. Exits must stay open, since closing a short option is a buy and blocking it traps the position.",
      difficulty: "apply",
      distractors: [
        "Optimism feels efficient, but a gate that passes on error is off on the days the broker is struggling.",
        "",
        "Blocking exits sounds extra safe, but it can pin a losing position open at its stop moment.",
        "Waiting sounds persistent, but the signal was for that candle. A fresh signal should decide, not a stale one replayed later.",
      ],
    },
    {
      q: "A strategy's loss limit tripped at 11:40 on a Tuesday. The engine restarts at 12:05 and Redis was flushed. In which design does the strategy wrongly resume trading?",
      options: [
        "Trip recorded in a MySQL row keyed by strategy, mode and date",
        "Trip held only in process memory plus a Redis key",
        "Trip recorded in MySQL and re-read before the first evaluation",
        "Trip recorded in MySQL with the entry block rehydrated on start",
      ],
      answer: 1,
      why: "Memory and Redis are both gone after a restart and a flush, so nothing remembers the trip. A durable row read back at start keeps the block in place.",
      difficulty: "apply",
      distractors: [
        "A durable keyed row survives both events, so it is the safe design, not the failing one.",
        "",
        "Re-reading the durable row before the first evaluation is exactly what prevents the early resume.",
        "Rehydrating the block on start is the same protection and is the design that survives.",
      ],
    },
    {
      q: "Exit all is pressed on a strategy holding a sold put and a bought put as its wing. In what order should it close them?",
      options: [
        "Sell the bought put first, because it is the cheaper leg to close",
        "Close both at the same instant with one combined order",
        "Whichever leg has the larger loss first",
        "Buy back the sold put first, then sell the bought put",
      ],
      answer: 3,
      why: "The bought wing caps the loss on the sold leg. Removing it first leaves an uncapped short for as long as the sold leg takes to close. Close the risk first and the hedge last.",
      difficulty: "apply",
      distractors: [
        "Cheap does not mean safe. Selling the wing first leaves the short option naked for a moment.",
        "Two legs are two orders at the broker, and one can fill while the other waits, so you cannot assume a single instant.",
        "Loss size is a reasonable instinct for priority, but hedge structure matters more for risk during the exit.",
        "",
      ],
    },
    {
      q: "A teammate suggests letting the funds check pass when the balance is unreadable, because blocking costs a missed trade. Which reply is best?",
      options: [
        "Agree, a missed trade is lost profit and the check is usually fine",
        "Agree only on expiry day, when speed matters more",
        "Disagree: a missed entry costs one trade, a bad one far more",
        "Disagree and also block exits, so nothing moves while it is unknown",
      ],
      answer: 2,
      why: "The costs are lopsided. A blocked entry loses one opportunity and raises an alert. A wrongly allowed order can produce rejection storms or margin trouble. Exits remain open for the opposite reason.",
      difficulty: "judge",
      distractors: [
        "It sounds commercial, but it values one missed trade above an unbounded downside and removes the check on bad days.",
        "Expiry day is when an unchecked order is most dangerous, so relaxing the gate then is backwards.",
        "",
        "It overcorrects. Blocking exits is the failure mode that traps positions, so the check must treat the two sides differently.",
      ],
    },
    {
      q: "A founder says: our strategy tests already include the loss limit, so a separate breaker is duplicate work. What is the strongest answer?",
      options: [
        "Tests cover logic you imagined; a breaker covers faults you did not, even after a restart",
        "Backtests prove the limit works, so runtime checks suit new strategies only",
        "A breaker only helps if the broker has one too, so wait for that",
        "The breaker repeats the same code, so it only adds one more thing to maintain",
      ],
      answer: 0,
      why: "Tests show intended behaviour under known inputs. A runtime breaker is a defence against unknown faults, configuration drift and lost state, so it earns its place even when the strategy is well tested.",
      difficulty: "judge",
      distractors: [
        "",
        "A backtest is a simulation with perfect state. Live runs meet restarts, partial fills and bad releases that the backtest never saw.",
        "Depending on a broker feature you do not control makes your safety someone else's roadmap.",
        "If it is the same code it adds nothing, which is the point: it must be independent, with its own state and its own trigger.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-pretrade-risk-ledger-home",
      scenario:
        "One founder runs a single engine process on one server for a live options strategy. The daily loss limit is ₹15,000. Redis on the same server is configured to evict keys under memory pressure, and the engine is redeployed several times a week, sometimes mid-session. Where should the record that today's limit has tripped be kept?",
      options: [
        {
          label: "In process memory of the engine",
          appeal:
            "Fastest to read and no extra table. The engine already tracks realised P&L there, so the gate is one comparison.",
        },
        {
          label: "In Redis with a key that expires at midnight",
          appeal:
            "Survives an engine restart, has built-in expiry and needs no migration.",
        },
        {
          label: "In a MySQL row per strategy, mode and date, read back at start",
          appeal:
            "A real record on disk, already in the stack, and it can carry who reset it and why.",
        },
        {
          label: "In a log file that the engine greps at start",
          appeal:
            "Zero schema work, and the log already shows the trip happened.",
        },
      ],
      best: 2,
      verdict:
        "Redeploys mid-session wipe memory, and the eviction policy means Redis can lose the key exactly when memory is tight. A database row is the one store here that neither event touches. With a single process and a handful of writes per day, the extra cost of a write is trivial next to a limit that silently resets.",
      claims: [
        {
          text: "You accept a database write after each realised fill in exchange for a limit that survives restarts and eviction.",
          axis: "trade",
          correct: true,
          note: "That is the trade. A handful of writes a day costs almost nothing, and the benefit is that the limit cannot be cleared by a deploy.",
        },
        {
          text: "Redis is faster, so it is the right home for anything the gate reads on every signal.",
          axis: "trade",
          correct: false,
          note: "Speed is not the constraint. The gate can read an in-memory copy, and the durable row is the record. Speed does not fix a store that evicts.",
        },
        {
          text: "If the table cannot be read at start, a live strategy with a loss limit should keep entries blocked.",
          axis: "failure",
          correct: true,
          note: "Fail closed. Not knowing whether the limit tripped is not the same as knowing it has not.",
        },
        {
          text: "A midnight expiry on the Redis key makes the design safe, since the limit lifts on the new day anyway.",
          axis: "failure",
          correct: false,
          note: "The expiry is fine, but eviction under pressure can remove the key at 11:45 on the same day, which is the failure being designed against.",
        },
        {
          text: "Count how often a trip is read back after a restart and check that the strategy stayed blocked.",
          axis: "measure",
          correct: true,
          note: "A restart drill that proves the block survives is the direct test of the invariant.",
        },
        {
          text: "Track the average gate latency in microseconds, since a slow gate is the main risk of this design.",
          axis: "measure",
          correct: false,
          note: "The gate reads memory and the write is off the trading path. Latency is not the risk; losing the record is.",
        },
      ],
    },
    {
      id: "sd-pretrade-risk-account-gate",
      scenario:
        "A prop desk runs 40 strategies across 12 traders on one clearing account. Each strategy has its own loss limit, but on a volatile Thursday ten strategies were long the same index option and the combined loss passed the desk's ₹50 lakh limit before any single strategy hit its own. The risk head wants this stopped. Where should the new control sit?",
      options: [
        {
          label: "More conservative per-strategy limits",
          appeal:
            "No new component. Divide the desk limit by 40 and enforce it in each strategy.",
        },
        {
          label: "An account-level gate on the order path that sees all strategies' exposure",
          appeal:
            "It sees the combined position and can refuse or cut orders whichever strategy sent them.",
        },
        {
          label: "A daily email report of combined exposure",
          appeal:
            "Cheap, and managers read it every morning.",
        },
        {
          label: "Rely on the broker's account-level margin limit",
          appeal:
            "Already exists and needs no engineering.",
        },
      ],
      best: 1,
      verdict:
        "The failure is an aggregate one that no single strategy can see. Dividing the limit by 40 cuts useful size for everyone and still misses correlated positions. A report is after the loss. The broker margin limit sits at the broker's idea of risk, far above the desk's. Only a gate that sees all orders and all positions on the account can enforce a desk-wide number.",
      claims: [
        {
          text: "You accept a shared component on the order path of every strategy, which becomes a place where one fault can stop all trading.",
          axis: "trade",
          correct: true,
          note: "Centralising control is the cost. The gate must be simple, highly available and tested, because it now guards all 40 strategies.",
        },
        {
          text: "Splitting the desk limit equally across 40 strategies gives the same protection with less engineering.",
          axis: "trade",
          correct: false,
          note: "It limits size for uncorrelated strategies and still allows ten correlated ones to add up past the desk limit if each stays under its share.",
        },
        {
          text: "If the account gate cannot read positions, it should fail closed for new entries but let exits through.",
          axis: "failure",
          correct: true,
          note: "The same rule as the single-strategy gate, at a larger scale: unknown exposure blocks new risk and never blocks reducing it.",
        },
        {
          text: "A per-strategy loss breaker will notice a desk-wide loss as soon as it passes the desk limit.",
          axis: "failure",
          correct: false,
          note: "Each breaker sees only its own P&L. A desk-wide breach can happen while every strategy is inside its own limit.",
        },
        {
          text: "Measure the gap between the desk's real combined exposure and the gate's view of it.",
          axis: "measure",
          correct: true,
          note: "A gate is only as good as its picture of positions. Comparing it with the broker's book shows when it is blind.",
        },
        {
          text: "Measure how many emails managers open each morning.",
          axis: "measure",
          correct: false,
          note: "Reading rates say nothing about whether the limit is enforced before the loss occurs.",
        },
      ],
    },
    {
      id: "sd-pretrade-risk-exit-vs-block",
      scenario:
        "A solo founder's live strategy holds a sold NIFTY put with a stop. At 10:42 the stop fires and the exit is a buy order. At that moment the funds check cannot read the broker balance, and the daily loss breaker has just tripped on the realised loss from an earlier trade. What should happen to the exit order?",
      options: [
        {
          label: "Block it, because the breaker has tripped and the balance is unknown",
          appeal:
            "Both safety checks say stop, and stopping feels like the cautious choice.",
        },
        {
          label: "Let it through, since a loss breaker and a funds check guard entries, not reductions",
          appeal:
            "It reduces risk. Closing the short is exactly what the safety design wants to happen.",
        },
        {
          label: "Hold it for ten minutes until the balance is readable",
          appeal:
            "Waits for full information before acting on a live account.",
        },
        {
          label: "Ask the founder to approve it by message first",
          appeal:
            "A human decision on every exit while things are unusual.",
        },
      ],
      best: 1,
      verdict:
        "A buy-to-close on a short put reduces risk. Blocking it leaves an unlimited-loss position open exactly when the system is least able to see. Entry gates and the loss breaker are for new risk. The exit takes the normal path, with its own broker-book checks.",
      claims: [
        {
          text: "You accept that an exit can run while other safety checks are failing, because reducing risk is the goal of those checks.",
          axis: "trade",
          correct: true,
          note: "The checks are asymmetric on purpose. They guard opening, and closing is what they exist to make possible.",
        },
        {
          text: "Blocking the exit is the more conservative choice, so it is the safer trade-off.",
          axis: "trade",
          correct: false,
          note: "It looks conservative but leaves an uncapped short open. Safety is about the position, not about the number of orders sent.",
        },
        {
          text: "Waiting ten minutes lets the short option move against the account with no stop active.",
          axis: "failure",
          correct: true,
          note: "A delayed exit is a gap in protection. Ten minutes in a fast market can be a large move.",
        },
        {
          text: "A message approval step is safe because a human is faster than the engine.",
          axis: "failure",
          correct: false,
          note: "The founder may be asleep or in a meeting, and the exit then waits. Manual steps belong in the kill switch, not on every automatic stop.",
        },
        {
          text: "Check that exit orders never carry a funds-check or loss-breaker refusal in the order log.",
          axis: "measure",
          correct: true,
          note: "A log or test showing exits skip those gates verifies the asymmetry is real and not just intended.",
        },
        {
          text: "Measure how often the funds check is unreadable, since fixing that removes the need for the exception.",
          axis: "measure",
          correct: false,
          note: "The read failing less often is good, but the exception exists for the day it still fails. It does not go away with better reads.",
        },
      ],
    },
  ],
};

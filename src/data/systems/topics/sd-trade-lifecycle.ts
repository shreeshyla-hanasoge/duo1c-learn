import type { Topic } from "../../types.ts";

export const sdTradeLifecycle: Topic = {
  id: "sd-trade-lifecycle",
  title: "The life of an order",
  tier: 1,
  week: 1,
  depth: "deep",
  summary:
    "An order passes through your platform, a broker, an exchange and a clearing house. Each knows different things, and an acknowledgement is not a fill.",
  why: "Traed's live path sends real orders to a broker, so the hardest bugs are not in the strategy. They sit in the gap between 'I sent it' and 'it filled'. Several reliability fixes in the repository exist because the engine believed something about an order that only the broker could know. If you can name each hop, each state and who owns the truth at each step, you can explain those fixes, and the reconciliation and crash-recovery lessons later in this course, in a few plain sentences.",
  learn: {
    intuition:
      "Think of sending an expensive parcel by courier. You hand it over at the counter and get a receipt. The receipt proves the courier accepted the parcel. It does not prove the parcel reached anyone. The parcel then moves through hubs, and each hub has its own tracking page. Only the person at the final door can say it was delivered. Now suppose the tracking page goes silent. You do not know if the parcel is lost, delayed or already delivered. If you send a second parcel to be safe, you may end up with two delivered. A trade works the same way. Your code hands an order to a broker and gets a receipt. The broker passes it to the exchange, and only the exchange can say that a trade happened. After that, a clearing house makes sure money and positions really change hands. Good trading software is built around one habit: never treat the receipt as the delivery, and know which hop to ask when the answer is missing.",
    mechanics: [
      {
        heading: "Five hops, five different truths",
        body: "An order starts as a decision in your code, which knows only what it intended. Your platform sends it to a broker such as Zerodha or Groww. The broker runs its own checks, including margin, and forwards it to the exchange, NSE or MCX. The exchange matches it against other orders and is the only place that knows whether a trade happened. A clearing corporation then stands between buyer and seller and settles the obligation. For NIFTY index options this is cash settlement, so no shares move. Each hop can reject the order, and each keeps its own record. A broker's 'complete' is a copy of what the exchange did.",
      },
      {
        heading: "Order types decide what you are promising",
        body: "A market order says 'trade now at whatever price exists'. It almost always fills, but you do not know the price in advance. A limit order says 'trade only at this price or better'. The price is protected, but it may never fill. A stop-loss order has a trigger price and sits inactive, shown by brokers as trigger pending, until the market trades there. A stop-loss limit then becomes a limit order, so a sell stop with trigger 98 and limit 97 will not fill if the stock gaps open at 94. A stop-loss market becomes a market order, so it fills but at an unknown price.",
      },
      {
        heading: "Acknowledgement is not a fill",
        body: "A typical order moves through states: pending, open, partially filled, complete, and the exits cancelled and rejected. Say you send a buy of 100 shares at a limit price. At 09:20:01 the broker replies with an order id and the status open. That is an acknowledgement. At 09:20:03, 40 shares trade and the state is partially filled. At 09:20:09 the other 60 trade and it is complete. A real position of 40 existed for six seconds. If your code assumed 100 at 09:20:01, every stop and every size calculation in those six seconds was wrong. Fills also arrive as a running total, so book the difference, not the number.",
      },
      {
        heading: "When the answer is missing, ask the owner",
        body: "A request can time out after the broker already accepted it. The honest state is then 'unknown', and the only safe move is to look the order up, for example by a tag you attached, before sending again. Traed does this. The live executor attaches a tag of at most 20 characters so an ambiguous placement can be matched in the broker's order book. It returns 'placed' for an acknowledged order, not 'filled'. It then polls every 2 seconds for up to 60 seconds, watches for longer, and a sweep re-reads unfinished orders every 4 seconds. After a restart, an order whose outcome was never learned is closed as `unverified`, not guessed.",
      },
      {
        heading: "Saying it about Traed",
        body: "We treat the broker as the source of truth for orders and positions. When our live engine places an order it gets back an acknowledgement, which we record as placed, not filled. We only open a position from the filled quantity and average price the broker reports, and a background sweep keeps asking until every order is in a final state. If we restart or lose an answer, we mark the order unverified and let a position reconcile against the broker decide. The cost is a few seconds of delay and a lot of polling code. In paper and backtest the lifecycle is mostly simulated as one instant fill, and we say that openly.",
      },
    ],
    complexityDerivation:
      "The invariant is that your record of the world must never run ahead of the owner of that fact. Money moves because the exchange matched an order, so the exchange's matching is the fact, the broker's book is a delayed copy of it, and your database is a copy of the copy. Copies lag and can be wrong, but they must never be treated as primary. The state machine protects this. A new state is entered only on evidence from the owner. An unknown outcome is its own state, and it is resolved by asking, never by guessing. Idempotent tags let you ask safely. The design holds while one party can be asked quickly and reliably. It strains when the owner is slow or unreachable, or when you act faster than evidence arrives, as in high-frequency trading. There, firms keep their own risk position updated from exchange messages in microseconds and reconcile later. It also breaks when many systems write to the same account, such as you and a manual trade from a phone, because your copy is then stale without any error. That case needs periodic reconciliation, not more careful state handling.",
    variants: [
      {
        name: "Request and poll (retail broker APIs)",
        when: "Kite Connect, Groww and similar APIs where placing returns an order id and you read status later.",
        delta:
          "Placement and fill are separate calls. You poll the order book or receive a postback, and you must decide how often and what to do on silence.",
      },
      {
        name: "Streamed execution reports (FIX)",
        when: "Institutions and exchanges connected by the FIX protocol.",
        delta:
          "The counterparty pushes an execution report for every change, so state is event-driven and ordered. You still keep a recovery path for a dropped session.",
      },
      {
        name: "Simulated lifecycle (paper and backtest)",
        when: "Testing a strategy without sending real orders.",
        delta:
          "The simulator decides the fill. It usually skips the acknowledgement step and the unknown state, so it hides exactly the failures that hurt live.",
      },
    ],
    tradeoffs: [
      {
        vs: "Market order versus limit order",
        pick: "A limit order priced through the touch, with a cap on how far it may chase",
        because:
          "A market order into a thin options book fills wherever the book is. A limit priced at the ask plus a small buffer fills almost as fast but cannot pay more than the cap. You give up certainty of a fill for certainty of a worst price.",
      },
      {
        vs: "Trusting your own record versus the broker's book",
        pick: "The broker's book for positions, your record for intent and history",
        because:
          "Your record is fast and always available but can drift after a crash or a manual trade. The broker's book is slower to read and rate-limited, yet it reflects what the exchange actually did.",
      },
      {
        vs: "Open the position at acknowledgement versus at confirmed fill",
        pick: "Confirmed fill, sized from filled quantity and average price",
        because:
          "Acting at acknowledgement is a few seconds faster. It lets stops, targets and sizing run on a position that may be partial or absent, which is worse than the delay.",
      },
    ],
  },
  realWorld: [
    {
      system: "FIX protocol execution reports",
      kind: "industry",
      problem:
        "Banks, brokers and exchanges need one shared way to say what happened to an order, including partial fills and rejections.",
      applied:
        "In the FIX standard, the counterparty sends an execution report message for each change. It carries an order status such as new, partially filled, filled, cancelled or rejected, plus cumulative quantity and average price. Acknowledgement and fill are separate events by design.",
      evidence: "FIX Trading Community: FIX protocol, Execution Report message and the OrdStatus field",
      impact:
        "The same lifecycle vocabulary is used across venues, which is why retail broker statuses look familiar.",
    },
    {
      system: "Zerodha Kite Connect orders",
      kind: "industry",
      problem:
        "A retail algo needs to place orders over HTTP and know what became of them without a FIX connection.",
      applied:
        "Kite Connect returns an order id when you place an order, which is an acknowledgement. Status such as open, trigger pending, complete, cancelled or rejected is then read from the order book or received as a postback. Orders can carry a short alphanumeric tag so you can find them again.",
      evidence: "Kite Connect API documentation: Orders",
      impact: "Every Indian retail algo built on Kite has to handle the gap between order id and fill.",
    },
    {
      system: "Traed live order executor and sweep",
      kind: "yours",
      problem:
        "A placed live order's outcome is known only to the broker. A restart or a late fill could leave the engine unaware of a real position.",
      applied:
        "The live executor returns 'placed' with the broker order id and attaches a 20-character tag for reconciliation. A sweep task per broker account re-reads unfinished orders every 4 seconds, books fills from the broker's cumulative filled quantity, and cancels the rest of a partial fill that makes no progress for 120 seconds.",
      evidence:
        "strategy-engine/app/services/execution_modes/order_executors.py; strategy-engine/app/services/live_order_sweep.py",
      impact:
        "A late fill or a rejection is noticed and alerted instead of sitting unseen until the next session.",
    },
    {
      system: "Traed order states and the unverified state",
      kind: "yours",
      problem:
        "After a restart the engine may not know whether an order from before the restart filled.",
      applied:
        "The order model has pending, submitted, acknowledged, partial, filled, cancelled, rejected, expired and unverified states. Unverified is terminal for the engine but says only that the outcome was not learned. Every engine order is a day order, so yesterday's orders cannot still be working.",
      evidence:
        "strategy-engine/app/services/order_management/models.py; docs/live-readiness.md; docs/LLD.md",
    },
  ],
  insights: [
    {
      t: "A receipt is not a delivery",
      d: "An order id and the status open mean the broker accepted the order. Only a filled quantity and an average price mean a trade happened.",
    },
    {
      t: "Unknown is a real state",
      d: "After a timeout or a restart, say 'unknown' and ask the owner of the fact. Guessing filled or cancelled is how duplicate and orphaned positions start.",
    },
    {
      t: "Fills arrive as running totals",
      d: "Brokers report cumulative filled quantity. Book the difference since the last read, or a second read of the same fill doubles your position.",
    },
    {
      t: "Each hop owns a different fact",
      d: "The exchange knows if a trade happened, the broker knows the account's orders and margin, the clearing house knows the obligation, and your database holds copies.",
    },
  ],
  pitfalls: [
    "Starting stops, targets or sizing from the order acknowledgement instead of the confirmed filled quantity and average price.",
    "Re-sending an order after a timeout without first looking up whether the first one reached the broker.",
    "Assuming a stop-loss limit order always exits. If price gaps through the limit, the order stays open and you still hold the position.",
  ],
  quiz: [
    {
      q: "In the life of an order, what does an acknowledgement from the broker tell you?",
      options: [
        "The order was accepted for processing, and no quantity has necessarily traded yet",
        "The exchange has matched the order and at least part of it has traded",
        "The clearing house has taken on the obligation and the money has moved",
        "The order passed your own risk checks and can be counted as a position",
      ],
      answer: 0,
      why: "An acknowledgement is the broker saying it received and accepted the order. Matching happens at the exchange, and a position exists only after a fill is reported.",
      difficulty: "recall",
      distractors: [
        "",
        "Tempting because an order id feels like proof of a trade. Matching is a separate step that happens later at the exchange.",
        "Tempting because clearing sounds like the final authority. It handles settlement after trades, not acceptance of the order.",
        "Tempting because your own checks come first in the chain. The acknowledgement comes from the broker and says nothing about your checks.",
      ],
    },
    {
      q: "You send a sell stop-loss limit on 100 shares with trigger 98 and limit 97. The stock opens at 94 after bad news. What happens?",
      options: [
        "It fills at 98, because the trigger price fixes the price you receive",
        "It triggers and becomes a limit sell at 97, finds no buyer there, and you still hold the shares",
        "It is rejected at once, because the market has opened beyond your trigger",
        "It fills at 94, because every stop order turns into a market order",
      ],
      answer: 1,
      why: "The trigger only activates the order. A limit sell at 97 needs a buyer at 97 or higher, and the market is at 94, so it waits unfilled. A stop-loss market order would exit but at an unknown price.",
      difficulty: "apply",
      distractors: [
        "Tempting because 98 is the number you chose. The trigger starts the order, it does not guarantee a price.",
        "",
        "Tempting because a gap looks like an invalid situation. Exchanges accept the order and simply leave it open.",
        "Tempting because it describes the stop-loss market type. This order has a limit price, so it never becomes a market order.",
      ],
    },
    {
      q: "Your engine places a NIFTY option order through a broker API and the request times out with no response. What should it record?",
      options: [
        "Rejected, because no acknowledgement arrived within the time limit",
        "Cancelled, because the request did not complete cleanly",
        "Unknown, then look the order up in the broker's book before doing anything else",
        "Filled at the signal price, because index options are very liquid",
      ],
      answer: 2,
      why: "A timeout says nothing about whether the broker received the order. The state is unknown. Query by the tag or order id, then act. Re-sending first can create a double position.",
      difficulty: "apply",
      distractors: [
        "Tempting because silence feels like a failure. The broker may have accepted the order before the reply was lost.",
        "Tempting because a failed call is easy to treat as no order. The order may be live at the broker right now.",
        "",
        "Tempting because liquid markets usually fill fast. Liquidity changes the odds, not what you know, and the price may differ.",
      ],
    },
    {
      q: "A trader buys 75 units by phone while your engine, which thinks it is flat, keeps running. The broker shows 75 long. Which record do you trust, and what do you do?",
      options: [
        "The engine's record, because it logged every order it sent itself",
        "Neither fully, so use the average of the two until the day ends",
        "The exchange's last traded price, because price shows who is right",
        "The broker's book, and raise an alert before the engine acts on its own record",
      ],
      answer: 3,
      why: "The broker's book reflects what the exchange actually did on the account. A difference means your record is stale or incomplete, so the safe response is to alert and stop trusting it for decisions until it is resolved.",
      difficulty: "judge",
      distractors: [
        "Tempting because the engine's log feels complete. It cannot know about trades made outside it.",
        "Tempting as a compromise. A position is a fact, not an estimate, and averaging produces a number that matches neither.",
        "Tempting because market data is live. Price says nothing about which positions the account holds.",
        "",
      ],
    },
    {
      q: "Which statement about a market order is correct?",
      options: [
        "It puts getting filled ahead of price, so the fill price is not known in advance",
        "It always fills at the last traded price you saw on your screen",
        "It waits in the order book until the price reaches the level you set",
        "It can be filled only partially, never in full, in a liquid contract",
      ],
      answer: 0,
      why: "A market order takes whatever liquidity is available, so the fill is almost certain but the price is not. The last price is only a guide, especially in thin options.",
      difficulty: "recall",
      distractors: [
        "",
        "Tempting because the screen price feels like the price you get. Between your click and the match the book moves.",
        "Tempting because that describes a limit order. A market order does not wait for a price.",
        "Tempting because large orders can be split. In a liquid contract small orders normally fill in full.",
      ],
    },
    {
      q: "You ask the broker for an order's status twice. The first read shows 40 filled out of 100. The second shows 100 filled. Your position should end at 100. How do you book it?",
      options: [
        "At 140, by adding each reported filled quantity to the position",
        "At 100, by booking only the difference between the new total and what is already booked",
        "At 60, because the latest read shows what remained after the first fill",
        "At 40, because a partial fill stays as it is until the order is cancelled",
      ],
      answer: 1,
      why: "Brokers report a running total of filled quantity. Book the delta since your last booking: 40 first, then 60 more. Adding the totals counts the first 40 twice.",
      difficulty: "apply",
      distractors: [
        "Tempting because adding looks natural when two reports come in. Each report already includes the earlier fills.",
        "",
        "Tempting if you read the number as the new fill instead of the new total. The second read is cumulative.",
        "Tempting because partial fills feel final. The rest of the order was still working and filled later.",
      ],
    },
    {
      q: "A buy order for one lot of a BANKNIFTY option comes back 'rejected: insufficient margin' within a second of being sent. Which part of the chain most likely produced this?",
      options: [
        "The exchange, because only it knows current market prices",
        "The clearing house, because it calculates margin at day end",
        "The broker's pre-trade risk check, which runs before the order reaches the exchange",
        "Your platform's strategy code, because it chose the order quantity",
      ],
      answer: 2,
      why: "Brokers check margin and limits before forwarding an order, using margin rates set with the exchange. A fast margin rejection normally comes from that check, so the order never reached matching.",
      difficulty: "apply",
      distractors: [
        "Tempting because the exchange is the final authority. Margin on a client account is the broker's job to enforce up front.",
        "Tempting because clearing involves margin. It sets rates and settles later, while the broker blocks funds at order time.",
        "",
        "Tempting because your code chose the size. The rejection text came back from outside your code.",
      ],
    },
    {
      q: "Your live strategy marks a position open as soon as the order call returns an id, to save a polling round trip, and starts its trailing stop at the signal price. Is this a sound design?",
      options: [
        "Yes, an id means the broker has taken the order, and the saved delay is worth it",
        "Yes, as long as the order is a limit order, because limit orders never fill late",
        "Yes, if a single status check after one second confirms it is open",
        "No, open the position from the broker's reported filled quantity and average price",
      ],
      answer: 3,
      why: "An id is only an acknowledgement. The order may be partial, unfilled or rejected, and a stop based on a price you never got is wrong. Size and stops should follow the confirmed fill.",
      difficulty: "judge",
      distractors: [
        "Tempting because speed matters in trading. Speed gained by acting on an unconfirmed position costs more than a poll.",
        "Tempting because limit orders protect the price. They do the opposite of guaranteeing a fill, and they can fill late or never.",
        "Tempting as a compromise. The status open still means unfilled, so the check confirms nothing about quantity.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-trade-lifecycle-open-position",
      scenario:
        "One server, one trader. A live NIFTY options strategy fires an entry at 09:30:00. The broker API returns an order id in about 300 ms. The strategy starts a trailing stop and sizes its second leg from the entry. Fills often take one to five seconds, sometimes only part of the quantity at first. A wrong stop on real money costs far more than a few seconds of delay. When should the strategy treat the position as open?",
      options: [
        {
          label: "As soon as the broker returns the order id",
          appeal: "It is the fastest, and an id does mean the order was accepted.",
        },
        {
          label: "When the broker reports a filled quantity above zero, sizing stops from the filled quantity and average price, and keep reading until the order is final",
          appeal: "Positions follow what actually traded, and the polling cost is small at this scale.",
        },
        {
          label: "At the end of the day, from the broker's tradebook",
          appeal: "The tradebook is the official record, so it cannot be wrong.",
        },
        {
          label: "At the signal price, assuming the marketable limit fills",
          appeal: "A limit placed through the touch usually fills, so the signal price is close enough.",
        },
      ],
      best: 1,
      verdict:
        "With one account and a few seconds of fill time, polling costs almost nothing, while a stop built on an unconfirmed quantity or price can be wrong for exactly the seconds when the market is moving. Waiting for the end of the day leaves the strategy blind, and the signal price is a guess about a number the broker will report anyway.",
      claims: [
        {
          text: "You accept a delay of a few seconds, plus polling code, in exchange for stops and sizes that match real fills.",
          axis: "trade",
          correct: true,
          note: "This is the trade. Delay and complexity are paid so the position the strategy manages is the one that exists.",
        },
        {
          text: "Opening at the order id is faster, and the extra delay of confirming gives the strategy better prices.",
          axis: "trade",
          correct: false,
          note: "Confirming does not improve prices. It only stops the strategy from acting on facts that are not yet true.",
        },
        {
          text: "A partial fill can leave the strategy managing a smaller position than it intended, so exits must use the filled quantity.",
          axis: "failure",
          correct: true,
          note: "If the order is only 40 of 75 filled, a full-size exit would sell more than you hold.",
        },
        {
          text: "If the order is rejected after the id was returned, a position opened at acknowledgement would have a stop on something that never existed.",
          axis: "failure",
          correct: true,
          note: "Post-acknowledgement rejections and cancellations are common enough that this is a real failure path.",
        },
        {
          text: "Because the order is a limit order, it can never remain unfilled.",
          axis: "failure",
          correct: false,
          note: "A limit order protects the price, not the fill. If the touch moves away, it stays open.",
        },
        {
          text: "Seconds from order id to first reported fill, and how often an order ends partial or rejected.",
          axis: "measure",
          correct: true,
          note: "These show whether the delay is a cost worth worrying about and how often the confirmation matters.",
        },
        {
          text: "Only the API response time of the order call, since that is where the delay sits.",
          axis: "measure",
          correct: false,
          note: "The call returns in 300 ms. The decision-relevant delay is the time to the fill, which this metric misses.",
        },
      ],
    },
    {
      id: "sd-trade-lifecycle-order-events",
      scenario:
        "A broker platform serves about 2 lakh active clients. Orders pass through an order management system, a risk check and an exchange gateway. Clients complain that the app shows 'order placed' for orders the exchange later rejects, and that positions are sometimes briefly wrong after a gateway restart. Regulators expect a full history of every order. How should order state be kept?",
      options: [
        {
          label: "An append-only log of order events from the gateway, with current state and the app view derived from it",
          appeal: "Every ack, fill, cancel and reject is recorded in order, so state can be rebuilt and audited.",
        },
        {
          label: "Let the app update its own screen optimistically and reconcile overnight",
          appeal: "The screen reacts instantly and the back end is simple.",
        },
        {
          label: "Have each client poll the exchange for its own orders every second",
          appeal: "It always reads the source of truth directly.",
        },
        {
          label: "Hold the client's request open until the exchange confirms a fill",
          appeal: "The client never sees a state that is not final.",
        },
      ],
      best: 0,
      verdict:
        "At two lakh clients with audit needs, the order state has to be a durable, ordered history that survives a gateway restart. An append-only event log gives both the audit trail and a way to rebuild state. Optimistic screens cause the complaints, client polling would swamp the exchange, and holding requests open ties up connections and cannot work for orders that rest for hours.",
      claims: [
        {
          text: "You pay for an event store and a derived-view pipeline, and accept that the view lags the exchange by a short, bounded time.",
          axis: "trade",
          correct: true,
          note: "State is built from events, so it is a small step behind. The gain is a rebuildable, auditable history.",
        },
        {
          text: "An event log removes all lag between the exchange and the screen.",
          axis: "trade",
          correct: false,
          note: "It is still downstream of the exchange. The design makes the lag short and honest, not zero.",
        },
        {
          text: "After a gateway restart, state can be rebuilt by replaying events, and gaps can be found by comparing sequence numbers.",
          axis: "failure",
          correct: true,
          note: "A durable, ordered log is the reason recovery is possible without guessing.",
        },
        {
          text: "Overnight reconciliation is enough, because wrong screens during the day do not matter to clients.",
          axis: "failure",
          correct: false,
          note: "The complaints are about wrong state during the day. A nightly fix does nothing for what clients see now.",
        },
        {
          text: "A held-open request is a safe way to get a final state, because orders always reach a final state in seconds.",
          axis: "failure",
          correct: false,
          note: "Limit orders can rest for hours. Holding a connection open for each would exhaust the servers.",
        },
        {
          text: "Time from exchange event to the client's screen, and the count of orders whose derived state differs from the exchange's record.",
          axis: "measure",
          correct: true,
          note: "These measure the two things the clients complain about: staleness and wrong state.",
        },
        {
          text: "The number of orders placed per second, because that shows whether state is correct.",
          axis: "measure",
          correct: false,
          note: "Throughput shows load, not correctness. A busy system can be wrong or right at any rate.",
        },
      ],
    },
    {
      id: "sd-trade-lifecycle-resting-stop",
      scenario:
        "A small algo holds a crude oil futures position on MCX overnight in one engine on one server. Its stop-loss is checked by the engine against each incoming tick, then sent as an order. Last month the data feed went silent for twenty minutes while the engine kept running, and no stops could fire. Losing more than the planned amount on one trade would hurt the account badly. What protects the position best?",
      options: [
        {
          label: "Keep the engine-held stop only, since it can trail and adapt every tick",
          appeal: "Flexible, cheap, and it already exists in the code.",
        },
        {
          label: "A stop-loss order resting at the broker only, with no engine logic",
          appeal: "It works even if the engine and feed are down.",
        },
        {
          label: "A wider stop-loss order resting at the broker as a safety net, with the engine managing the tighter planned exit",
          appeal: "The planned exit stays flexible and a failure of the engine or feed is still bounded.",
        },
        {
          label: "Watch the position manually from a phone during market hours",
          appeal: "A human can notice a stalled feed.",
        },
      ],
      best: 2,
      verdict:
        "The risk is a failure of the engine or its feed, which an engine-held stop cannot cover. The loss limit matters more than a few points of slippage, so a resting order that survives the engine's failure is worth its cost. A broker-only stop loses the engine's tighter, adaptive logic, and manual watching does not cover an overnight session.",
      claims: [
        {
          text: "You accept a wider worst-case exit and some extra order management in return for a stop that still works when your own system fails.",
          axis: "trade",
          correct: true,
          note: "The safety net is deliberately looser than the planned stop, so it costs more only on the rare failure.",
        },
        {
          text: "A resting broker stop makes the engine's stop logic unnecessary.",
          axis: "trade",
          correct: false,
          note: "The resting stop is a backstop. The engine still handles the planned, tighter exits and trailing.",
        },
        {
          text: "An engine-held stop depends on the feed and the engine both being alive, so it can silently fail to act during an outage.",
          axis: "failure",
          correct: true,
          note: "This is the failure that already happened. Nothing fires if no ticks arrive.",
        },
        {
          text: "A stop-loss limit order resting at the broker guarantees an exit even on a large gap.",
          axis: "failure",
          correct: false,
          note: "A limit stop can sit unfilled if price gaps through the limit. Only a market-style stop is sure to exit.",
        },
        {
          text: "If the engine moves its stop but the resting order is not updated, the two can disagree, so the engine must cancel and replace the safety net deliberately.",
          axis: "failure",
          correct: true,
          note: "Two stops are two sources of exits. Without care, both could fire and flip the position.",
        },
        {
          text: "Count of ticks per minute per instrument, with an alert when it drops while the market is open.",
          axis: "measure",
          correct: true,
          note: "A silent feed is the trigger for this scenario, so its absence is what you watch.",
        },
        {
          text: "The average slippage on the engine's stop exits, since this shows if the safety net is needed.",
          axis: "measure",
          correct: false,
          note: "Normal slippage says nothing about the rare outage the net is there for.",
        },
      ],
    },
  ],
};

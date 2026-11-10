import type { Topic } from "../../types.ts";

export const sdOrderManagement: Topic = {
  id: "sd-order-management",
  title: "Order management",
  tier: 9,
  week: 17,
  depth: "deep",
  summary:
    "An order management system owns the life of every order: its state, its fills, its limits and its record. The broker decides; the OMS remembers and enforces.",
  why: "Your strategy produces a signal, but the market only ever sees orders, and an order has a life of its own: it can sit open, fill in pieces, be cut down, rejected or cancelled. Traed's order manager is where that life is tracked, where the exchange freeze limit is enforced and where every attempt is written down. If you can explain what an OMS owns, and what it must never guess, you can explain most of why live trading is harder than backtesting.",
  learn: {
    intuition:
      "Think of a courier parcel. You hand it to a shop. The shop hands it to a courier. The courier hands it to a warehouse. At each step the parcel has a tracking status, and the status can surprise you: three of your five boxes arrive today and two are delayed, or the warehouse refuses the parcel because it is too heavy. Someone has to keep the tracking record, check the weight before the parcel leaves, and notice when a box is late. That someone is the order management system, the OMS. Your strategy says what it wants, such as 'buy 130 units'. The OMS turns that wish into one or more real orders, keeps each order's state as the broker reports it, adds up the partial fills into a position, enforces hard limits, and keeps a permanent record. The broker and the exchange decide what really happened. The OMS must never guess.",
    mechanics: [
      {
        heading: "What an OMS owns, and what it does not",
        body: "An OMS owns four things: the order record (who asked, what, when, in which state), the fill ledger (how much really traded, at what price), the pre-submit limits (size, funds, freeze quantity) and the link to the broker. It does not own the truth about whether an order filled. The exchange does, and the broker relays it. So every OMS state is a belief that the broker can overrule. A good OMS therefore stores the broker's order id beside its own, and treats its own status as a cache of the broker's. When the two disagree, the broker wins.",
      },
      {
        heading: "Parent and child orders, and legs",
        body: "A parent order is the intent: 'buy 4,000 units of NIFTY options'. Child orders are what actually go out: for example three orders of 1,300, 1,300 and 1,400 because one order may not exceed the exchange limit. Institutional systems add algorithms that slice a parent over time, such as VWAP or TWAP. A multi-leg strategy, like a short straddle with a call and a put, is different again: the legs are separate orders on separate contracts, and an exchange does not guarantee they fill together. If the call fills and the put is rejected, you hold half a strategy. An OMS must decide whether to unwind the filled leg or carry it.",
      },
      {
        heading: "Partial fills and the average price",
        body: "Orders often fill in pieces. A buy of 130 units might fill 65 at ₹118.50 and 65 more at ₹119.00. Brokers such as Zerodha Kite report a cumulative filled quantity and a cumulative average price on each read, not each tranche. So the OMS books the delta: new filled quantity minus quantity already booked, priced so that the running average still matches the broker's figure. Book on every read, not only when the status changes, or a growing partial fill is missed. And never book a fill at price zero because the average was missing; defer it until a read carries a price.",
      },
      {
        heading: "Freeze quantity, slicing and the order record",
        body: "Exchanges set a freeze quantity per contract: an order above it is rejected whole, not partly accepted. The OMS must know the limit and either refuse, clip, or slice the order into several orders under it. Clipping silently changes what the strategy asked for, so it must be logged loudly. Slicing is safer for the strategy but multiplies orders, each with its own fate. Separately, the OMS writes a durable row for every attempt, including rejected and unverified ones. That row is the audit trail: when money is wrong, the order record is how you find out why, and it must outlive a restart.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep the order record and the fill ledger in our own order manager, but we treat the broker as the truth. Every live order gets a durable row in `live_orders`, a sweep asks the broker about every open order every few seconds, and fills are booked as deltas off the broker's cumulative figure. Before an order leaves, a last guard clips it to the exchange freeze quantity. The cost we accept is that we clip rather than slice, so a very large sized order becomes one smaller order, and we do not unwind sibling legs of a multi-leg entry. We would add slicing when sized orders routinely exceed the freeze limit.",
      },
    ],
    complexityDerivation:
      "The invariant is that the OMS's record of a position must equal what the broker holds, and that every share bought or sold is booked exactly once. Three design choices protect it. First, fills are booked as differences from a cumulative figure. Because the broker's cumulative quantity only grows, two readers who ask about the same order cannot book the same tranche twice. Second, terminal states are final: a stale 'open' read that arrives late must not undo a 'filled'. Third, the last guard before the broker enforces hard limits, because a limit upstream can be bypassed by a new code path. The argument holds while one process owns the orders and the broker reports cumulative figures. It breaks when several processes place orders for the same account, when a broker reports only per-trade events that can be duplicated, or when legs must succeed together. Then you need an order group with explicit rollback, or a central OMS that every strategy routes through, and the simple delta rule is no longer enough.",
    variants: [
      {
        name: "Embedded OMS inside the strategy process",
        when: "One operator, one server, a handful of strategies. This is the Traed shape.",
        delta:
          "Order state lives next to the strategy code. Simple and fast, but only that process knows the orders, so a restart must rebuild state from the broker and the database.",
      },
      {
        name: "Central OMS shared by many strategies",
        when: "Several desks or many users trade the same accounts and need shared limits.",
        delta:
          "Strategies send intents to one service that applies limits across all of them. One more hop and one more thing that can fail, but limits and the audit trail are in one place.",
      },
      {
        name: "Execution algorithms with parent and child orders",
        when: "Orders are large against market depth, as in institutional trading.",
        delta:
          "A parent order is sliced over time by an algorithm such as VWAP or TWAP. The OMS now tracks the parent's progress as the sum of its children.",
      },
    ],
    tradeoffs: [
      {
        vs: "Slice an oversized order into several orders",
        pick: "Clip to the freeze quantity",
        because:
          "Clipping is one small guard and cannot send a flood of orders by mistake. The price is that the strategy gets less size than it asked for, so the clip must be logged and the sizing reviewed. Choose slicing once oversized orders are common, not rare.",
      },
      {
        vs: "Trust the order status your own code last set",
        pick: "Treat the broker's order book as the truth and poll it",
        because:
          "Your status is a belief, the broker's is a fact. Polling costs a request every few seconds but catches fills that arrive after a timeout or a restart. Push callbacks are faster but a missed callback leaves you wrong with no way to notice.",
      },
      {
        vs: "Unwind a filled leg when a sibling leg fails",
        pick: "Alert loudly and let the operator or a rule decide",
        because:
          "Automatic unwinding sends more orders into a market that just refused one, and can lose on both sides. Doing nothing silently is worse. Surface the half-built position at once; automate the unwind only when you trust the rule.",
      },
    ],
  },
  realWorld: [
    {
      system: "FIX protocol order lifecycle",
      kind: "industry",
      problem:
        "Brokers, exchanges and trading firms need one shared language for 'new order', 'partly filled', 'cancelled' and 'replaced'.",
      applied:
        "In FIX, the standard messaging protocol of trading, a new order carries a client order id. The counterparty replies with execution reports that carry the order status and the cumulative filled quantity and average price. Cancel and cancel-replace are separate messages that refer to the original id. The OMS follows these reports.",
      evidence: "FIX Protocol specification (FIX Trading Community): NewOrderSingle, ExecutionReport, OrderCancelReplaceRequest",
      impact:
        "Cumulative quantity and average price on each report is the same design that makes delta booking safe.",
    },
    {
      system: "NSE freeze quantity",
      kind: "industry",
      problem:
        "A single mistyped or oversized order could move the market, so the exchange caps the size of one order.",
      applied:
        "NSE sets a freeze quantity for each derivative contract. An order above it is not partly filled; it is stopped. Participants who want more size send several orders each under the limit, which is why every algo platform for NIFTY options needs to know it.",
      evidence: "NSE circulars on freeze quantity in derivatives (NSE India website)",
      impact:
        "The limit is revised from time to time, so a hard-coded constant goes stale and needs an override.",
    },
    {
      system: "Traed order manager and the freeze guard",
      kind: "yours",
      problem:
        "Percent-of-capital sizing in backtests reached many times NIFTY's per-order freeze limit, and nothing in the engine knew the limit existed.",
      applied:
        "The sizing layer now caps the lot multiple, and the order manager clips any option order above the freeze quantity as the last step before the broker, logging an error that names the sizing to review. Slicing into several orders is recorded as still open.",
      evidence: "strategy-engine/app/services/order_management/order_manager.py (_apply_risk_parameters); docs/live-readiness.md (LR-09)",
      impact:
        "An oversized order is no longer rejected whole, at the cost of silently smaller size that the log makes visible.",
    },
    {
      system: "Traed pending-order sweep and fill deltas",
      kind: "yours",
      problem:
        "A fill that arrives after the placing coroutine stopped watching, or during a restart, was a real position the engine did not know it held.",
      applied:
        "One task per broker account asks about every open order every 4 seconds, with one order-book read for Kite. Each answer passes through the same transition that books only the new filled quantity. A partial fill with no progress for 120 seconds has its remainder cancelled, and the filled part stays as the position.",
      evidence: "strategy-engine/app/services/live_order_sweep.py; strategy-engine/app/services/order_management/order_manager.py (_update_order_from_broker_status)",
      impact:
        "A tranche is booked once, whichever reader sees it first, and a late fill can no longer go unnoticed.",
    },
  ],
  algorithms: [
    {
      name: "Order state machine",
      role: "Allows only legal moves such as new, partially filled, filled or rejected, so a late or repeated broker message cannot corrupt an order.",
    },
    {
      name: "Volume-weighted average price",
      role: "Combines partial fills by quantity into one entry price, which is what the position and profit calculations rest on.",
      dsa: "prefix-sums",
    },
    {
      name: "Quantity slicing against a freeze limit",
      role: "Splits a parent order into child orders no larger than the exchange cap, then tracks them back to the parent.",
    },
  ],
  insights: [
    {
      t: "The OMS remembers, the broker decides",
      d: "Your order status is a belief about the broker's order. Store the broker's order id and let the broker's book overrule yours.",
    },
    {
      t: "Book fill deltas, not fill events",
      d: "Brokers report cumulative quantity and average price. New filled minus already booked is the tranche, and it cannot be booked twice.",
    },
    {
      t: "Terminal states are final",
      d: "A late, stale 'open' read must never move a filled or rejected order back to working. Order matters when two readers race.",
    },
    {
      t: "The last guard sits right before the broker",
      d: "Limits such as the freeze quantity belong in the final step, so no new code path can bypass them. Log every clip.",
    },
  ],
  pitfalls: [
    "Assuming the legs of a multi-leg strategy fill together. They are separate orders and one can be rejected while the other fills.",
    "Booking a fill only when the status changes. A partly filled order that grows from 65 to 130 units keeps the same status and the second tranche is missed.",
    "Silently shrinking an order to fit a limit. The strategy believes it holds the size it asked for, and the position, the risk and the P&L are all wrong.",
  ],
  quiz: [
    {
      q: "In an order management system, which of these is the source of truth for whether an order has filled?",
      options: [
        "The exchange, relayed by the broker",
        "The OMS status field, since it is updated on every event",
        "The strategy that placed the order",
        "Whichever of the broker and the OMS updated last",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The exchange matches orders and the broker relays the result. The OMS keeps a copy so it can act quickly, but the copy can be stale or wrong, so on any disagreement the broker's view wins.",
      distractors: [
        "",
        "It is updated often, but updated from what it last heard. Frequent is not the same as authoritative.",
        "The strategy only expresses intent. It learns about fills from the OMS, so it is further from the truth, not nearer.",
        "Recency is not authority. A late stale read can overwrite a correct state; the rule is the broker wins.",
      ],
    },
    {
      q: "A broker reports an order for 130 units as: filled 65, average ₹118.50. Ten seconds later: filled 130, average ₹118.75. What should the OMS book for the second tranche?",
      options: [
        "130 units at ₹118.75, the new average",
        "65 units at ₹118.75, the new average",
        "65 units at ₹118.50, the first price",
        "65 units at ₹119.00, averaging ₹118.75",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Brokers report cumulative figures. The new tranche is 130 minus 65 = 65 units. Its price is whatever makes the combined average ₹118.75: 65 at ₹118.50 plus 65 at ₹119.00 averages 118.75. Booking this way keeps the position average matching the broker's.",
      distractors: [
        "That books all 130 again, double counting the first 65.",
        "The cumulative average is not the price of the new tranche. Booking at 118.75 would leave the position average above the broker's.",
        "That reuses the first tranche's price, so the average would stay at 118.50 and disagree with the broker's 118.75.",
        "",
      ],
    },
    {
      q: "Your BANKNIFTY strategy sizes an order at 3,600 units. The exchange freeze quantity for the contract is 900 units. What happens if you send it as one order?",
      options: [
        "The exchange fills 900 units and drops the other 2,700",
        "It is rejected whole; send orders of at most 900 units",
        "The broker automatically splits it into four orders",
        "It is accepted but flagged for the exchange's review",
      ],
      answer: 1,
      difficulty: "apply",
      why: "An order above the freeze quantity is stopped as a whole. It is not partly filled. You must send it as several orders, each within the limit, or reduce the size. The figures here are an example; the real limit varies by contract and changes over time.",
      distractors: [
        "Partial acceptance sounds friendly, but the freeze check is on the order as submitted, so nothing trades.",
        "",
        "Some brokers offer slicing as a product feature, but you cannot count on it, and it is not the exchange's behaviour.",
        "Surveillance exists, but the first line is a hard rejection at order entry, not a flag.",
      ],
    },
    {
      q: "Your short straddle sends a call-sell and a put-sell together. The call fills; the put is rejected for insufficient margin. What is the position, and what should the OMS do first?",
      options: [
        "A short straddle; nothing to do, as the group completed",
        "Flat; a rejected leg cancels its sibling automatically",
        "A naked short call; flag it at once and hedge or close",
        "A short call that can wait until the end of the day",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Legs are separate orders. The call is a real filled position, a naked short call with open-ended risk, and the rejected put never existed. The OMS must report the half-built position immediately so an operator or a rule can hedge or close it.",
      distractors: [
        "The group is a label in your code. The exchange sees two unrelated orders.",
        "Exchanges do not link legs. Unless your own code unwinds the sibling, it stays filled.",
        "",
        "A naked short call can lose without limit in a sharp rise, so waiting for the day to end is how small problems become large.",
      ],
    },
    {
      q: "Why does an OMS usually poll the broker's order book even when the broker also pushes order updates?",
      options: [
        "A missed push goes unnoticed; a poll bounds how stale you get",
        "Push updates are always slower than polling is",
        "Polling is required by SEBI for every algo order",
        "Polling lets the OMS change the order's price too",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Push is fast but unreliable in the failure cases you care about: a dropped connection, a restart. A periodic poll of the order book puts a ceiling on how stale your belief can be.",
      distractors: [
        "",
        "Push is usually faster. The argument for polling is about missing updates, not speed.",
        "No such general rule exists. Do not attribute a regulation to a design choice.",
        "Reading the order book does not change orders. Modifying a price is a separate request.",
      ],
    },
    {
      q: "Your OMS receives two reads for the same order about a second apart, from two different tasks: one says OPEN with 0 filled, the other says COMPLETE with 130 filled. They arrive in the wrong order. Which behaviour is correct?",
      options: [
        "Apply them in arrival order so the final state is OPEN",
        "Keep COMPLETE; an older read must not reopen a final state",
        "Wait ten seconds and ask a third time before deciding",
        "Mark the order UNKNOWN and alert the operator at once",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The read that says COMPLETE with 130 filled carries more information, and a filled quantity only grows. A terminal status is final, so the later-arriving older read must not undo it. Arrival order is not event order when two readers race.",
      distractors: [
        "Arrival order is a property of the network and the scheduler, not of the order's real history. Following it would reopen a finished order.",
        "",
        "More polling does not fix a rule that lets stale data overwrite a final state. It just adds more chances for the same race.",
        "An alert for ordinary reader races would drown real alerts, and the data already tells you which read is right.",
      ],
    },
    {
      q: "Your sizing layer produces 10,400 units for a NIFTY option, and the freeze quantity is about 1,800 units. You can clip to the limit, slice into six orders, or refuse. It is a single-operator system that rarely exceeds the limit. Which is the sound default?",
      options: [
        "Refuse every oversized order, because any change to the size is unsafe",
        "Slice into six orders, since the strategy asked for 10,400 units",
        "Send the full size and let the exchange reject it",
        "Clip to the limit and log an error that names the sizing to review",
      ],
      answer: 3,
      difficulty: "judge",
      why: "When oversized orders are rare, a small guard that clips and shouts is cheaper and safer than a slicing engine with its own failure modes. Refusing loses the trade, and sending it unclipped wastes the attempt. Revisit if oversized orders become routine.",
      distractors: [
        "Refusing is safe against surprise size but throws away a valid entry. It also hides the sizing bug.",
        "Slicing is right once oversized orders are common. For a rare event it adds six orders, six fates and a partial-group problem.",
        "A guaranteed rejection teaches you nothing, delays the trade, and in a retry loop could send repeated attempts.",
        "",
      ],
    },
    {
      q: "A student says: 'An order is just a row with a status. Updating the row when the broker replies is all an OMS needs.' What is the main thing this misses?",
      options: [
        "Order rows should be stored in a document database",
        "Replies arrive in order and exactly once, so a row update is enough",
        "Partial fills, late reads and repeats: each fill must be booked once",
        "An OMS must keep orders only in memory, for speed",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A status field alone loses the fill ledger, mishandles races and double-counts tranches. The hard part of an OMS is correctness under partial fills, stale reads and restarts, not the storage engine.",
      distractors: [
        "The storage engine is not the point. A relational table is a fine home for order rows.",
        "Replies can be late, repeated or out of order. That is exactly why a plain row update is not enough.",
        "",
        "Memory-only loses every order on a crash and leaves no audit trail. Speed is not worth that here.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-order-management-freeze-clip",
      scenario:
        "You run one NIFTY options strategy on a single server for yourself. Percent-of-capital sizing on a good week produces an order of about 4,000 units, while the exchange freeze quantity for the contract is about 1,800. That happens perhaps once a month. A bug here could send real orders at the wrong size. You have no one else to review code. How do you handle orders above the freeze quantity?",
      options: [
        {
          label: "Build an order slicer that splits the order into several child orders",
          appeal:
            "It preserves the size the strategy asked for and is how larger participants handle the same limit.",
        },
        {
          label: "Clip the order to the freeze quantity at the last step before the broker, and log an error",
          appeal:
            "A few lines, easy to review and to test, and it cannot send more orders than it was given.",
        },
        {
          label: "Refuse any order above the limit and alert",
          appeal:
            "Nothing unexpected is ever sent; the operator decides each time.",
        },
        {
          label: "Do nothing and let the exchange reject the order",
          appeal:
            "No code to write, and the exchange is the final authority on its own limit.",
        },
      ],
      best: 1,
      verdict:
        "The event is rare and you are the only reviewer, so a small guard beats a slicing engine. Clipping sends one order that is known to be within the limit, and the logged error tells you to revisit sizing. Refusing loses a valid entry on a day you may not be watching. Doing nothing loses it too, and teaches the system nothing. Slicing is right once oversized orders are routine, not monthly.",
      claims: [
        {
          text: "You accept trading less size than the strategy asked for on those days.",
          axis: "trade",
          correct: true,
          note: "A clip changes the position size. That is the price of the simpler guard, and it is why the clip must be loud.",
        },
        {
          text: "Clipping is the more accurate choice because it never changes the strategy's intended size.",
          axis: "trade",
          correct: false,
          note: "It is the opposite: clipping always changes the size. Only slicing keeps the intended total.",
        },
        {
          text: "A clip that is never logged leaves the position, the risk numbers and the backtest comparison quietly wrong.",
          axis: "failure",
          correct: true,
          note: "Silent shrinking is the dangerous version. The log is what makes the trade acceptable.",
        },
        {
          text: "Once the order is clipped, the exchange will fill any remaining units automatically on the next order.",
          axis: "failure",
          correct: false,
          note: "Nothing carries the removed units forward. They are simply not traded unless you send another order.",
        },
        {
          text: "You would track how often a clip fires per month, and move to slicing if it becomes routine.",
          axis: "measure",
          correct: true,
          note: "That frequency is the signal that the simple guard has outlived the problem.",
        },
        {
          text: "You would track the average fill price of clipped orders as the only measure of the guard's cost.",
          axis: "measure",
          correct: false,
          note: "The main cost is the size not traded, not the fill price. Measure units clipped, not price.",
        },
      ],
    },
    {
      id: "sd-order-management-late-fill",
      scenario:
        "A live strategy places a limit buy for 130 units. Your code polls for the fill for 60 seconds, then moves on. At 40 seconds the broker reports 65 filled and the rest working. The engine restarts at 90 seconds for a deploy. When it comes back, the rest of the order fills. You trade one account at one broker, and a mistake here means an unmanaged position with no stop. What is the right design?",
      options: [
        {
          label: "Poll only from the code that placed the order, for longer",
          appeal:
            "No new component, and a longer wait catches most fills.",
        },
        {
          label: "Rely on the broker pushing order updates to the engine",
          appeal:
            "Real-time and cheap; no repeated requests to the broker.",
        },
        {
          label: "A sweep that periodically reads the broker's order book for every open order, plus a start-up pass that re-adopts open orders from the database",
          appeal:
            "It does not depend on any one coroutine or process staying alive, and it also covers restarts.",
        },
        {
          label: "Cancel any order not fully filled within 60 seconds and treat the rest as lost",
          appeal:
            "A clean rule that ends every order within a minute.",
        },
      ],
      best: 2,
      verdict:
        "The failure is a late fill with nobody watching. Anything tied to the placing coroutine or to an uninterrupted connection cannot cover a restart. An independent sweep over the broker's own book, plus re-adopting open orders at start, closes the gap. Cancelling at 60 seconds is a sensible extra for stale partials, but alone it still leaves the 65 filled units to be found.",
      claims: [
        {
          text: "You accept steady read traffic to the broker in exchange for a bound on how long a fill can go unnoticed.",
          axis: "trade",
          correct: true,
          note: "A short interval and one order-book read per pass keeps the request count small while bounding the blind period.",
        },
        {
          text: "A longer poll window removes the need for any start-up pass.",
          axis: "trade",
          correct: false,
          note: "A restart kills the poll whatever its length. The start-up pass is what covers that.",
        },
        {
          text: "A restart between placing and fill processing can leave a real position with no stop managing it.",
          axis: "failure",
          correct: true,
          note: "That is the exact failure the sweep and re-adoption are for.",
        },
        {
          text: "If the sweep cannot read the broker's book, the safe fallback is to ask about each order individually as fast as possible.",
          axis: "failure",
          correct: false,
          note: "That multiplies calls into the same outage and risks rate limits. Back off and retry instead.",
        },
        {
          text: "You would measure the time from a fill happening at the broker to the engine booking it.",
          axis: "measure",
          correct: true,
          note: "That latency is the quantity the sweep interval controls, so it shows whether the design works.",
        },
        {
          text: "You would measure only the number of orders cancelled, since that shows whether fills are being found.",
          axis: "measure",
          correct: false,
          note: "Cancels measure the timeout rule, not discovery of fills. Measure fill-to-booked delay and orders still working past the timeout.",
        },
      ],
    },
    {
      id: "sd-order-management-central-oms",
      scenario:
        "A firm in Mumbai runs 40 strategies across 12 traders on shared broker accounts. Each strategy currently places its own orders. Last month two strategies took the same NIFTY option from opposite sides within a minute and paid costs on both, and one trader's strategy used margin another needed. The firm has a small platform team and trades through market hours. Orders per day are in the thousands. What do you change?",
      options: [
        {
          label: "Keep each strategy's embedded order manager; add a rule to the wiki about not overlapping",
          appeal:
            "No engineering cost, and traders know their own books.",
        },
        {
          label: "Introduce a central OMS that every strategy sends intents to, applying shared limits, netting and the audit trail",
          appeal:
            "One place sees all orders on an account, so limits and conflicts can be enforced across strategies.",
        },
        {
          label: "Give each trader a separate broker account and keep embedded order managers",
          appeal:
            "Isolation by account removes interaction without new software.",
        },
        {
          label: "Add the freeze-quantity clip to each strategy's code",
          appeal:
            "A quick fix that addresses order size, one of the more visible risks.",
        },
      ],
      best: 1,
      verdict:
        "The problem is cross-strategy: opposite trades, shared margin. No embedded order manager can see another's orders. A central OMS is the one place that can apply account-wide limits, net or block conflicting intents and keep one audit trail. It costs an extra hop and a new critical dependency, which a team of this size and order volume can justify. Separate accounts hide the issue and fragment capital.",
      claims: [
        {
          text: "You accept a new single point of failure on the path of every order.",
          axis: "trade",
          correct: true,
          note: "If the central OMS is down, no strategy trades. It needs redundancy and a clear fail-closed or fail-open rule.",
        },
        {
          text: "A central OMS removes the need to reconcile with the broker, since it sees every order.",
          axis: "trade",
          correct: false,
          note: "It sees only the orders sent through it. Manual trades, broker-side changes and missed updates still need reconciliation.",
        },
        {
          text: "Strategies that still place orders directly, bypassing the central OMS, will break its account-wide limits.",
          axis: "failure",
          correct: true,
          note: "A limit only holds if every path goes through it. Bypasses must be blocked or detected.",
        },
        {
          text: "The central OMS fixes the opposite-sides problem by itself, with no change to the strategies.",
          axis: "failure",
          correct: false,
          note: "It can only block or net conflicts if it has a rule for them. The policy still has to be defined.",
        },
        {
          text: "You would measure how many intents are blocked or netted by cross-strategy rules each day.",
          axis: "measure",
          correct: true,
          note: "That shows the central rules are doing the work that justified the OMS.",
        },
        {
          text: "You would measure the OMS's CPU use as the main indicator of whether it is working.",
          axis: "measure",
          correct: false,
          note: "CPU says little about correctness. Measure intent-to-broker delay, rejected intents and mismatches against the broker's book.",
        },
      ],
    },
  ],
};

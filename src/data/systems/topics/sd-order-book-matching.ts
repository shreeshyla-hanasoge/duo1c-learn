import type { Topic } from "../../types.ts";

export const sdOrderBookMatching: Topic = {
  id: "sd-order-book-matching",
  title: "Order books and matching engines",
  tier: 1,
  week: 2,
  depth: "deep",
  summary:
    "An exchange matches buyers and sellers by price, then arrival time. Fills come from the order book, so a backtest that ignores the book flatters itself.",
  why: "Every number in a Traed backtest rests on an assumption about where an order would have filled. Real fills come from an order book with a spread, limited quantity at each price, and gaps. If you cannot explain how the book works, you cannot explain why a paper result differs from a live one, or what your backtest leaves out. This lesson gives you the vocabulary and the numbers, and shows exactly which parts Traed models and which it does not.",
  learn: {
    intuition:
      "Think of a vegetable market with two kinds of people. Sellers stand in a row and call out their lowest price. Buyers stand in another row and call out their highest price. The best seller asks for ₹40 a kilo and the best buyer offers ₹39, so no deal happens. The gap is the spread. A deal happens only when someone steps across: a buyer agrees to pay ₹40, or a seller agrees to take ₹39. Each seller has only so much stock at their price. If you want a lot, you buy out the cheapest seller, then move to the next, and your average price rises. If two buyers offer ₹39, the one who spoke first is served first. An exchange does exactly this with software, millions of times a day, under strict rules. Your order does not get 'the price on the screen'. It gets whatever the people already standing there are willing to give.",
    mechanics: [
      {
        heading: "The book: bids, asks, depth and spread",
        body: "An order book lists resting limit orders. Bids are buy orders, highest first. Asks are sell orders, lowest first. The best bid and best ask together are the touch. Take a stock with bids of 400 at ₹100.00, 600 at ₹99.95, and asks of 200 at ₹100.10, 500 at ₹100.15. The spread is ₹100.10 minus ₹100.00, so ₹0.10, and the midpoint is ₹100.05. Depth is how much quantity sits at each price. Indian broker screens show the five best levels each side. A wide spread or thin depth means every trade is expensive and every large trade moves the price.",
      },
      {
        heading: "Price-time priority and what the engine guarantees",
        body: "A matching engine pairs orders by price first, then by arrival time. Suppose two buy orders rest at ₹100.00: A for 150 arrived at 09:30:01 and B for 250 at 09:30:05. A market sell of 300 arrives. A is filled in full, 150, and B gets the other 150, leaving 100 waiting. NSE works this way. Some other venues use pro-rata matching, which splits fills by size. The engine promises three things: orders are processed in one agreed sequence, the same inputs give the same trades every time, and equal orders are treated equally. Those promises are why the exchange's record can be treated as the truth.",
      },
      {
        heading: "Market and limit orders walk the book",
        body: "Use the book above. A market buy of 600 takes 200 at ₹100.10 and then 400 at ₹100.15. Its average price is 60,080 divided by 600, about ₹100.13. That is ₹0.03 worse than the best ask and ₹0.08 above the midpoint. This difference is slippage. A limit buy of 600 at ₹100.12 behaves differently. It takes the 200 at ₹100.10, but the next ask is above its limit. The other 400 rest as the new best bid at ₹100.12. That is a partial fill, and the rest may never trade. A gap is the extreme: if the market opens far from the last price, an order triggered by the move fills at the new level, not the old one.",
      },
      {
        heading: "Why a backtest must model fills",
        body: "A backtest has only bars. A bar has an open, high, low and close, but not a book. If it fills every order at the close, it assumes zero spread, unlimited depth and no delay. Take an option quoted ₹8.00 bid and ₹8.60 ask. Buying at the ask and selling at the bid costs ₹0.60 per unit before anything else. On a 75-unit lot, a round trip loses ₹45, so a strategy that makes ₹30 a lot in a close-fill backtest actually loses. Traed's backtest fills at the next bar's open, treats a bar that opens through a stop as filled at the open, and does not model spread or queue position, so it is optimistic on cost.",
      },
      {
        heading: "Saying it about Traed",
        body: "We model fills at three levels of honesty. In backtests, a signal is confirmed on a bar's close and filled at the next bar's open, a gap through a stop fills at the open, and an optional flat rupee cost per lot is charged. We do not model the spread or queue position there, and we say so. In paper trading, buys fill at the live ask and sells at the live bid. In live trading we send a limit order priced through the touch, with a cap on how far we will chase. The gap between backtest and live is mostly the spread, and measuring it from paper and live fills is our next step.",
      },
    ],
    complexityDerivation:
      "The book is built on one invariant: at any moment the best bid is lower than the best ask, because if they crossed they would have traded. Everything else follows. A buyer who wants to trade now must pay at least the ask, a seller must accept at most the bid, and the spread is the price of immediacy. Depth sets how fast that price rises with size, so your cost for a quantity is the average over the levels you consume, which is why it can never be below the best ask. Price-time priority makes the book fair and the outcome deterministic, so the same orders in the same sequence always trade the same way. That determinism is also why exchanges can recover by replaying their order log. The model breaks down in four places. It fails in auctions, where many orders trade at one price. It fails in gaps, where no resting orders sit near the last price. It fails for hidden or iceberg orders, which show less than their real size. And it fails when you are slow, because the book you saw is not the book you hit. Minute-bar systems mostly meet the first two.",
    variants: [
      {
        name: "Continuous double auction with price-time priority",
        when: "NSE and BSE during normal trading, and most equity and derivatives exchanges.",
        delta:
          "Every arriving order is matched at once against the best resting orders, and ties at one price go to the earliest order.",
      },
      {
        name: "Call auction",
        when: "The opening and closing of cash markets, and the pre-open session before 09:15.",
        delta:
          "Orders collect for a period, then one price that maximises traded quantity is chosen and all matched orders trade at it. There is no spread walk, but the price can jump from the previous close.",
      },
      {
        name: "Pro-rata matching",
        when: "Some futures markets, such as certain interest-rate contracts, where large resting orders are encouraged.",
        delta:
          "Orders at a price share each incoming trade in proportion to their size, so arriving early matters less than being large.",
      },
    ],
    tradeoffs: [
      {
        vs: "Market order versus marketable limit order",
        pick: "A limit order priced through the touch, with a worst-price cap",
        because:
          "You cross the spread either way, so you pay for immediacy in both cases. The cap stops a thin book from taking you far away from the price you decided on. You give up a guaranteed fill: if the book moves past the cap, you may not trade.",
      },
      {
        vs: "Simulated fill at the last traded price versus at the touch",
        pick: "The touch: buys at the ask and sells at the bid",
        because:
          "The last price may be a trade at the bid or the ask, so it flatters one side. Simulating at the touch charges the half-spread you really pay, which is what keeps paper results comparable with live.",
      },
      {
        vs: "Modelling full depth and queue position versus the top of the book only",
        pick: "The top of the book for minute-bar, small-size strategies",
        because:
          "Depth models need level-by-level data and fragile assumptions about other traders. At a few lots on liquid contracts the touch captures most of the cost. The choice stops being safe when your size is large compared with what sits at the touch.",
      },
    ],
  },
  realWorld: [
    {
      system: "NSE price-time priority and the pre-open call auction",
      kind: "industry",
      problem:
        "A national exchange must match millions of orders fairly and give every participant the same rules.",
      applied:
        "NSE's trading system matches orders by price, then by time of entry, during continuous trading. For cash-market stocks it also runs a pre-open session before 09:15 in which orders are collected and a single opening price is found by call auction.",
      evidence: "NSE trading system and market microstructure documentation: order matching rules and the pre-open session",
      impact:
        "This is why an early resting order fills before a later one at the same price, and why the open can differ sharply from the previous close.",
    },
    {
      system: "CME Group matching algorithms",
      kind: "industry",
      problem:
        "Different products need different incentives. Some want speed to be rewarded, others want large resting size.",
      applied:
        "CME Group publishes the algorithm used for each futures product. Many use first-in-first-out price-time matching, while some interest-rate products use pro-rata allocation, which splits a trade by resting size.",
      evidence: "CME Group documentation: Matching Algorithms",
      impact:
        "It shows that 'the order book' is a rule choice, and that fill logic in a simulator should follow the rules of the venue being simulated.",
    },
    {
      system: "Traed backtest fill rules",
      kind: "yours",
      problem:
        "A bar-based backtest has no book, so it must choose when and at what price to fill, without peeking at the future.",
      applied:
        "For equity and futures, a signal is confirmed on a candle's close and filled at the next candle's open. For options, entries default to next-open timing. A level stop that a bar opens through exits at the open, not the level, and a bar that touches both stop and target is treated as a stop. The options executor notes that it has no slippage or spread model, and a flat cost per lot per round trip can be set.",
      evidence:
        "strategy-engine/app/services/generic_streaming_backtest_executor.py; strategy-engine/app/services/options_strategy_executor.py; strategy-engine/app/services/risk_core/level_stop.py",
      impact:
        "Fills avoid look-ahead and gaps are charged honestly, but spread cost is missing, so results lean optimistic on frequent trading.",
    },
    {
      system: "Traed paper and live fills against the touch",
      kind: "yours",
      problem:
        "Paper and live orders need prices that reflect the real book, without paying more than the strategy intended.",
      applied:
        "The paper executor fills market buys at the live ask and sells at the live bid when it has a book less than 15 seconds old, and otherwise uses a synthetic spread. Live single-leg option orders go as limit orders priced through the touch, repriced every 2 seconds, with an entry cap that defaults to 2 percent from the touch and a chase limit of 15 seconds. Exits are never abandoned.",
      evidence:
        "strategy-engine/app/services/execution_modes/order_executors.py; strategy-engine/app/services/universal_strategy_executor.py",
      impact:
        "Entries cannot pay more than the cap in a thin book, and exits keep widening until the position is closed.",
    },
  ],
  insights: [
    {
      t: "Fills come from the book, not the screen price",
      d: "A market order takes the best asks level by level. A buy of 600 across 200 at ₹100.10 and 400 at ₹100.15 averages about ₹100.13, not ₹100.10.",
    },
    {
      t: "Price first, then time",
      d: "Among orders at one price, the earliest is filled first. Joining a queue late means waiting behind everyone already there.",
    },
    {
      t: "The spread is the price of immediacy",
      d: "A strategy that crosses the spread on every trade pays it on both entry and exit. On cheap, wide options it can exceed the edge.",
    },
    {
      t: "Gaps fill at the new level",
      d: "If a bar or an auction opens beyond your stop, the exit happens at the open, not at the stop price. Good backtests treat it that way.",
    },
  ],
  pitfalls: [
    "Filling backtest orders at the bar close or the midpoint, which assumes no spread and no delay.",
    "Treating a stop price as the exit price when the market gaps through it.",
    "Assuming a limit order will fill because the price traded there. Other orders may have been ahead of yours in the queue.",
  ],
  quiz: [
    {
      q: "In a price-time priority book, which resting order at one price is filled first?",
      options: [
        "The one that arrived at that price first",
        "The one with the largest quantity",
        "The one from the biggest client of the broker",
        "The one picked at random each time",
      ],
      answer: 0,
      why: "Price-time priority ranks first by price and then by arrival time. Size and client identity do not matter, which is what makes the rule fair and predictable.",
      difficulty: "recall",
      distractors: [
        "",
        "Tempting because some venues share fills by size. That is pro-rata matching, and NSE does not work that way.",
        "Tempting because big clients seem to get better service. Exchange matching does not know who the client is.",
        "Tempting because it sounds fair. Random choice would make results impossible to reproduce or audit.",
      ],
    },
    {
      q: "The asks are 200 at ₹100.10, 500 at ₹100.15 and 900 at ₹100.25. You send a market buy for 600. What is your average price?",
      options: [
        "₹100.10, which is the price of the best ask",
        "About ₹100.13, the average over the levels used",
        "₹100.15, which is the price of the last level",
        "About ₹100.17, the average of the three asks",
      ],
      answer: 1,
      why: "You take 200 at ₹100.10 and 400 at ₹100.15. The total is 20,020 plus 40,060, which is 60,080, divided by 600, about ₹100.13. The average is worse than the best ask because size walks the book.",
      difficulty: "apply",
      distractors: [
        "Tempting because the screen shows the best ask. It only covers the first 200 units.",
        "",
        "Tempting because the last level reached feels like the price you paid. The first 200 units paid less.",
        "Tempting because it averages the visible asks. Your order never touches the third level.",
      ],
    },
    {
      q: "Using the same asks, you send a limit buy for 600 at ₹100.12 instead. What happens?",
      options: [
        "All 600 fill at ₹100.12",
        "Nothing fills, because ₹100.12 does not match any ask exactly",
        "200 fill at ₹100.10 and 400 rest as the best bid at ₹100.12",
        "All 600 rest in the book, since a limit order always waits",
      ],
      answer: 2,
      why: "A limit buy trades against any ask at or below its limit, at the ask price. Only the 200 at ₹100.10 qualify. The other 400 cannot trade at their limit, so they rest as a bid.",
      difficulty: "apply",
      distractors: [
        "Tempting because the limit is the price you named. You fill at the resting order's price when it is better than your limit.",
        "Tempting because limit orders sound exact. A limit is a worst price, not a required one.",
        "",
        "Tempting because limit orders are often passive. One whose limit is above the best ask is marketable and trades immediately.",
      ],
    },
    {
      q: "A backtest of a NIFTY option scalper makes a small profit per lot by filling every trade at the bar's closing price. What is the right judgement before trusting it?",
      options: [
        "Trust it, because close prices are real prices that did trade",
        "Trust it once a small commission is subtracted from each trade",
        "Trust it, but only if the bars are one minute or shorter in size",
        "Re-run it buying at the ask and selling at the bid, then check the profit",
      ],
      answer: 3,
      why: "A close price is a traded price, but you cannot buy and sell at it on the same side of the spread. If the edge per trade is smaller than the round-trip spread, it disappears when the spread is charged.",
      difficulty: "judge",
      distractors: [
        "Tempting because the data is real. Real prices still do not tell you what you could trade at.",
        "Tempting because commission is the usual cost. For wide options the spread can be a bigger cost than commission.",
        "Tempting because shorter bars feel more precise. A bar still has no bid and ask inside it.",
        "",
      ],
    },
    {
      q: "What is the bid-ask spread?",
      options: [
        "The gap between the best ask and the best bid",
        "The difference between today's high and low prices",
        "The total quantity waiting on both sides of the book",
        "The fee a broker charges for each executed order",
      ],
      answer: 0,
      why: "The spread is the best ask minus the best bid. A trader who crosses it pays it in effect, which is why it is called the price of immediacy.",
      difficulty: "recall",
      distractors: [
        "",
        "Tempting because both are ranges. The day's range measures movement, the spread measures cost at a moment.",
        "Tempting because it sounds like market size. Quantity at the touch is depth, not spread.",
        "Tempting because both are costs. A brokerage fee is charged by your broker, the spread is set by the market.",
      ],
    },
    {
      q: "Two buy orders rest at ₹100.00: A for 150 arrived at 09:30:01 and B for 250 at 09:30:05. A market sell for 300 arrives. What is the result under NSE-style matching?",
      options: [
        "A gets 100 and B gets 200, split in proportion to their sizes",
        "A is filled in full for 150, B is filled for 150, and 100 of B still rests",
        "B is filled in full for 250 because it is larger, and A gets 50",
        "A and B each get 150, since they are at the same price",
      ],
      answer: 1,
      why: "Time priority serves the earlier order first and completely. A takes 150, and the remaining 150 goes to B, leaving 100 of B waiting.",
      difficulty: "apply",
      distractors: [
        "Tempting because pro-rata matching exists on some futures venues. It is not how NSE equity or index derivatives match.",
        "",
        "Tempting because large orders feel more important. The engine does not rank by size.",
        "Tempting as a simple split. Equal treatment means equal rules, not equal shares.",
      ],
    },
    {
      q: "In a bar-based backtest, a long position has a stop at 98. The next minute bar opens at 94. At what price should the backtest exit?",
      options: [
        "98, the stop level, because that is what was set",
        "96, the midpoint between the stop and the open",
        "94, the open, because the market never traded at 98",
        "The bar's close, once the minute has finished",
      ],
      answer: 2,
      why: "The bar opened below the stop, so there was no trade at 98 to exit on. A stop order becomes live and fills at the first available price, here the open. Using 98 would hide the gap loss.",
      difficulty: "apply",
      distractors: [
        "Tempting because the stop is the rule you wrote. The market has to offer that price for the rule to be filled at it.",
        "Tempting as a compromise. There is no basis for a midpoint fill.",
        "",
        "Tempting because the close is a known price. Waiting for it assumes you could not exit until the bar ended.",
      ],
    },
    {
      q: "A colleague says paper trading should fill at the last traded price, because that is the price on the screen. How should you respond?",
      options: [
        "Agree, since the last price is the most recent fact about the market",
        "Agree, because paper results are only a rough guide anyway",
        "Agree, but only for liquid contracts such as NIFTY futures",
        "Disagree: fill buys at the ask and sells at the bid, as a live order would",
      ],
      answer: 3,
      why: "A live buy can trade only if someone sells to it, at the ask or higher. The last trade may have been at the bid, so using it flatters buys and hides the spread. Paper then drifts away from live results.",
      difficulty: "judge",
      distractors: [
        "Tempting because it is the freshest number. It is a past trade, not an offer you can take.",
        "Tempting because paper is not real money. Its value is in predicting live, which depends on realistic fills.",
        "Tempting because liquid contracts have narrow spreads. Narrow is not zero, and the error is systematic.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-order-book-matching-live-entry",
      scenario:
        "One server, one trader. At 09:20 a live strategy wants to buy one lot of a NIFTY option. The book shows a bid of ₹42.00 and an ask of ₹43.50, a spread of about 3.5 percent. Depth at the touch is small. The strategy's edge is a few percent per trade, so paying 10 percent more than expected would erase it. A fill within a few seconds is wanted. How should the order be sent?",
      options: [
        {
          label: "A market order, so it fills at once",
          appeal: "It is the simplest, and the lot is small.",
        },
        {
          label: "A limit order priced at the ask plus a small buffer, capped a few percent from the touch, repriced if unfilled",
          appeal: "It fills almost as fast as a market order but cannot pay more than the cap.",
        },
        {
          label: "A limit order at the bid, waiting to be filled",
          appeal: "It saves the whole spread if it fills.",
        },
        {
          label: "A limit order at the last traded price",
          appeal: "It is the number the screen shows, so it looks fair.",
        },
      ],
      best: 1,
      verdict:
        "The constraints are a fast fill and a worst price. A marketable limit with a cap gives both. A market order into a thin book has no upper bound on price, a limit at the bid will often never fill, and a limit at the last price may be on the wrong side of the book and sit there while the move happens without you.",
      claims: [
        {
          text: "You give up a guaranteed fill, since the order will not trade if the book moves past the cap.",
          axis: "trade",
          correct: true,
          note: "This is the price of the cap. A missed entry is accepted over an expensive one.",
        },
        {
          text: "You save the entire spread, because a limit order always executes at the bid.",
          axis: "trade",
          correct: false,
          note: "A buy limit priced through the ask pays the ask. Only a passive limit order at the bid can save the spread, and it may not fill.",
        },
        {
          text: "A thin book can take the order far from the quote, so an uncapped market order may pay much more than ₹43.50.",
          axis: "failure",
          correct: true,
          note: "A market order walks the book. In thin options the next level can be well above the touch.",
        },
        {
          text: "A passive limit at the bid can sit unfilled while the option rises, so the strategy misses the trade it wanted.",
          axis: "failure",
          correct: true,
          note: "The risk of a passive order is exactly that the market moves away without trading with it.",
        },
        {
          text: "A limit order at the last traded price is guaranteed to fill because that price just traded.",
          axis: "failure",
          correct: false,
          note: "The last trade is history. The next trade can only happen at the current bid or ask.",
        },
        {
          text: "Fill price compared with the ask at the moment of the decision, and the share of entries that were skipped by the cap.",
          axis: "measure",
          correct: true,
          note: "The first shows what the entry cost, the second shows what the cap gave up.",
        },
        {
          text: "The number of orders sent per day, since a good entry method needs many orders.",
          axis: "measure",
          correct: false,
          note: "Order count shows activity, not execution quality.",
        },
      ],
    },
    {
      id: "sd-order-book-matching-large-sell",
      scenario:
        "An institution must sell 5 lakh shares of a mid-cap stock that trades about 20 lakh shares on a normal day. The five best bid levels together hold about 30,000 shares. The price must not drop sharply as the news of the selling spreads. The order can be worked through the day. How should it be executed?",
      options: [
        {
          label: "One market sell order now",
          appeal: "It is finished immediately, and the decision is done.",
        },
        {
          label: "One large limit sell at the best bid",
          appeal: "It limits the worst price and is simple.",
        },
        {
          label: "Slice it into many small child orders over the day, capped at a share of traded volume",
          appeal: "It spreads the impact, taking only what the book offers at each moment.",
        },
        {
          label: "Hold it all until the closing auction",
          appeal: "A single auction price avoids walking the book.",
        },
      ],
      best: 2,
      verdict:
        "At 5 lakh shares against 30,000 visible, one order would walk far down the book and move the price. Slicing over the day, with a cap on participation, lets the book refill between slices. Waiting for the close puts the whole position at the mercy of one price and one day's news.",
      claims: [
        {
          text: "You accept execution risk, since the price can drift against you during the hours the order is being worked, in exchange for lower impact.",
          axis: "trade",
          correct: true,
          note: "Slicing trades impact cost for time risk. It is the standard trade for large orders.",
        },
        {
          text: "Slicing removes market impact entirely, since each child order is small.",
          axis: "trade",
          correct: false,
          note: "Many small orders still add up. Participation caps reduce impact but cannot remove it.",
        },
        {
          text: "A single market order would exhaust the visible bids and then trade at much lower prices, with the average far below the quote.",
          axis: "failure",
          correct: true,
          note: "5 lakh shares against 30,000 visible means most of the order trades at deeper levels.",
        },
        {
          text: "A single large limit order at the best bid fills quickly, because buyers will see its size and come forward.",
          axis: "failure",
          correct: false,
          note: "A resting order is only filled when sellers want to trade with it. A big visible order may also scare buyers away.",
        },
        {
          text: "Waiting for the close concentrates risk, because one auction price decides the whole sale and the day's news cannot be reacted to.",
          axis: "failure",
          correct: true,
          note: "The closing auction can work for part of the order but is risky as the only plan.",
        },
        {
          text: "Average sale price compared with the price at the decision time and with the day's volume-weighted average price.",
          axis: "measure",
          correct: true,
          note: "These are the usual measures of implementation shortfall and execution quality for large orders.",
        },
        {
          text: "Total number of child orders sent, since more orders means a better execution.",
          axis: "measure",
          correct: false,
          note: "More orders can mean more fees and more signalling. The measure that matters is price versus benchmark.",
        },
      ],
    },
    {
      id: "sd-order-book-matching-fill-model",
      scenario:
        "A small team backtests a minute-bar options strategy on one server. The data has open, high, low and close for each option each minute, and sometimes a recorded bid and ask. The strategy trades about 15 times a day on options that are often 3 to 8 percent wide. The first run uses the bar close as the fill price and shows a healthy profit. Which fill model should the next run use?",
      options: [
        {
          label: "Fill at the next bar's open, and charge the spread on each side or use the recorded bid and ask",
          appeal: "It avoids look-ahead and charges the cost that wide options really carry.",
        },
        {
          label: "Keep the close of the signal bar, and add a flat commission",
          appeal: "It is simple and commission is a familiar cost.",
        },
        {
          label: "Fill at the best price inside the next bar, the low for buys and the high for sells",
          appeal: "It tries to be efficient and looks for the best execution.",
        },
        {
          label: "Fill at the midpoint of the signal bar's high and low",
          appeal: "It is a neutral price between the extremes.",
        },
      ],
      best: 0,
      verdict:
        "Fifteen trades a day on options 3 to 8 percent wide means the spread is paid thirty times a day, so it is likely larger than commission. Filling at the next open respects the fact that the signal is known only at the close. The best price in a bar and the bar midpoint are prices nobody could have been certain to get.",
      claims: [
        {
          text: "Results will look worse than the close-fill run, and that is the point, because the earlier result ignored a real cost.",
          axis: "trade",
          correct: true,
          note: "A more honest model lowers the headline number. That is a feature of a trustworthy backtest.",
        },
        {
          text: "Filling at the next open is more accurate because the open is always the best price of the minute.",
          axis: "trade",
          correct: false,
          note: "The open is chosen because it is the first price after the decision, not because it is the best.",
        },
        {
          text: "Using the bar's low for buys would make results look better than any real trader could achieve.",
          axis: "failure",
          correct: true,
          note: "The low of a bar can be known only after it has finished. Buying at it is look-ahead.",
        },
        {
          text: "If the recorded bid and ask are missing or stale for some bars, the spread charge for those bars will be wrong, so they need a fallback or exclusion.",
          axis: "failure",
          correct: true,
          note: "Sparse quote data is common in historical option data and silently weakens the cost estimate.",
        },
        {
          text: "A flat commission captures the spread cost, because both are charged per trade.",
          axis: "failure",
          correct: false,
          note: "They differ. The spread depends on the option and the moment, and on wide options it can be larger than any commission.",
        },
        {
          text: "Net result after costs compared with the gross result, and paper-trading fills compared with the backtest's fills for the same signals.",
          axis: "measure",
          correct: true,
          note: "The first shows how much edge the cost removes. The second tests the model against reality.",
        },
        {
          text: "Only the win rate, because costs do not change which trades win.",
          axis: "measure",
          correct: false,
          note: "Costs turn small wins into losses, so win rate and profit can move in opposite directions.",
        },
      ],
    },
  ],
};

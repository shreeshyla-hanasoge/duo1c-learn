/**
 * Plain-English glossary for Trading concepts.
 *
 * Same rule as the DSA glossary: a reader who has never seen the word should
 * understand the sentence it appeared in after reading `plain`, and no
 * definition may lean on another piece of jargon without explaining it in
 * the same breath. Audience: readers in India, so examples are NSE and MCX.
 *
 * This is a separate glossary from DSA's on purpose. DSA defines "node" as a
 * tree node; here "high-volume node" must not link to that.
 */
import type { Glossary } from "../glossary.ts";

export const GLOSSARY: Glossary = {
  /* ---------------- The auction ---------------- */

  auction: {
    plain:
      "The way a market finds a price: buyers and sellers keep bidding, and price moves up or down until it reaches a level where trade happens easily. A market is a continuous auction that never stops looking for that level.",
    also: ["auctions", "auction market theory", "two-way auction"],
  },
  acceptance: {
    plain:
      "When price spends time at a level and plenty of volume trades there. Both sides are willing to do business at that price, so the market has, for now, agreed it is fair.",
    also: ["accepted", "accepting"],
  },
  rejection: {
    plain:
      "When price reaches a level and quickly leaves it on little volume. One side refused to trade there, so the market moved away fast.",
    also: ["rejected", "rejecting"],
  },
  balance: {
    plain:
      "A period when price rotates back and forth inside a range because buyers and sellers broadly agree on value. A balanced day's profile looks like a fat bell, with most volume in the middle.",
    also: ["balanced", "balancing"],
  },
  imbalance: {
    plain:
      "A period when one side is clearly stronger, so price moves in one direction to find a new level where the other side will trade. Trend days are imbalance.",
    also: ["imbalanced"],
  },
  "other timeframe": {
    plain:
      "Dalton's name for larger, slower participants — funds, institutions, positional traders — whose orders are big enough to move value over days. Intraday traders are the 'day timeframe'.",
    also: ["other-timeframe", "OTF"],
  },

  /* ---------------- Profiles ---------------- */

  "volume profile": {
    plain:
      "A sideways bar chart of how much was traded at each price during a period. Long bars are prices where a lot changed hands; short bars are prices the market passed through quickly.",
    also: ["volume profiles", "volume-at-price", "volume by price"],
  },
  "Market Profile": {
    plain:
      "Peter Steidlmayer's chart, introduced at the Chicago Board of Trade in the 1980s. It records how much TIME price spent at each level, by printing one letter per 30-minute period at every price traded in it.",
    also: ["Market Profiles", "TPO profile", "TPO chart"],
  },
  TPO: {
    plain:
      "Time Price Opportunity: one letter on a Market Profile, meaning 'price traded at this level during this 30-minute period'. Count the letters at a price and you know how many periods visited it.",
    also: ["TPOs", "time price opportunity"],
  },
  bin: {
    plain:
      "One row of a profile: a fixed slice of price, such as 22,445 to 22,450. All volume that traded inside that slice is added to that row. Platforms also call it a row, a price level or the tick size of the profile.",
    also: ["bins", "bin size", "row size"],
  },
  "point of control": {
    plain:
      "The price row with the most volume in the profile — where the most business was done. Written POC.",
    also: ["POC", "POCs", "points of control"],
  },
  "value area": {
    plain:
      "The band of prices around the point of control that holds 70% of the period's volume. It is the market's working range of 'fair' prices for that period.",
    also: ["value areas", "VA"],
  },
  VAH: {
    plain:
      "Value area high: the top edge of the value area. Above it, price was trading at levels most of the session's volume did not accept.",
    also: ["value area high", "value-area high"],
  },
  VAL: {
    plain:
      "Value area low: the bottom edge of the value area.",
    also: ["value area low", "value-area low"],
  },
  "high-volume node": {
    plain:
      "A cluster of rows with much more volume than the rows around them: a price zone the market accepted. Written HVN. Price tends to slow down when it returns to one, because there are many willing traders there.",
    also: ["high-volume nodes", "HVN", "HVNs", "high volume node", "high volume nodes"],
  },
  "low-volume node": {
    plain:
      "A cluster of rows with much less volume than the rows around them: a price zone the market passed through quickly. Written LVN. Price often moves fast through one again.",
    also: ["low-volume nodes", "LVN", "LVNs", "low volume node", "low volume nodes"],
  },
  "single print": {
    plain:
      "On a Market Profile, a price where only one 30-minute letter appears: price visited it in one period and never came back that day. A run of single prints marks a fast move.",
    also: ["single prints", "singles"],
  },
  excess: {
    plain:
      "A sharp end to a session's range — a tail of single prints at the high or low — showing that one side was strongly rejected there. Dalton treats excess as a sign that the auction in that direction has finished.",
  },
  tail: {
    plain:
      "Two or more single prints at the very top or bottom of a session's profile. It is the visible form of excess.",
    also: ["tails", "buying tail", "selling tail"],
  },
  "poor high": {
    plain:
      "A session high (or low) with no tail: several periods touched the same extreme and stopped without a sharp rejection. Dalton reads it as unfinished business — the market often comes back to it.",
    also: ["poor highs", "poor low", "poor lows", "poor highs and lows"],
  },
  ledge: {
    plain:
      "A flat, squared-off edge in the profile where several rows have almost equal volume and then volume drops sharply — a shelf. Like a poor high, it suggests an auction that stopped rather than finished.",
    also: ["ledges", "shelf"],
  },
  "initial balance": {
    plain:
      "The range of the first hour of trading. On NSE that is 09:15 to 10:15. It shows how far the early, mostly local traders took price before the bigger participants showed their hand.",
    also: ["IB", "initial-balance"],
  },
  "range extension": {
    plain:
      "Trading beyond the initial balance high or low later in the day. Extension in one direction suggests a larger participant is pushing that way.",
    also: ["range extensions", "extends the range", "extended the range"],
  },
  composite: {
    plain:
      "A profile built by adding several sessions together — a week, a month or the whole period since an event. Possible only because the bins sit on the same price grid every day.",
    also: ["composites", "composite profile", "composite profiles"],
  },
  "naked POC": {
    plain:
      "An earlier session's point of control that price has not traded back through since. Traders watch these as levels the market may revisit; whether it does more often than chance is not well tested.",
    also: ["naked POCs", "virgin POC", "virgin POCs", "untested POC"],
  },
  "developing profile": {
    plain:
      "Today's profile as it stands right now, built from the bars so far. Its POC and value area keep moving until the session ends, so they are not today's final levels.",
    also: ["developing POC", "developing value", "developing value area"],
  },

  /* ---------------- Data and instruments ---------------- */

  "near-month future": {
    plain:
      "The futures contract that expires soonest. For NIFTY it is the contract for the current month, until it expires on its monthly expiry day. It trades the most, so it is the usual source of volume for an index profile.",
    also: ["near-month futures", "front-month future", "front month", "near month"],
  },
  rollover: {
    plain:
      "Closing a position in the expiring futures contract and opening the same position in the next one. 'Roll' also names the few days when trading volume shifts from one contract to the next.",
    also: ["roll", "rolls", "rolled", "rolling over", "roll date"],
  },
  "continuous contract": {
    plain:
      "One long price series stitched together from consecutive futures contracts. Where one contract hands over to the next the prices may jump, so the stitching has to be adjusted or the jump treated as a gap.",
    also: ["continuous series", "continuous contracts", "back-adjusted"],
  },
  expiry: {
    plain:
      "The day a futures or options contract ends. NIFTY options have a weekly expiry, and the expiry day trades very differently from other days because option positions are closed or settled.",
    also: ["expiries", "expiry day", "expiry days", "weekly expiry"],
  },
  "muhurat trading": {
    plain:
      "A short, symbolic trading session held on Diwali evening. It is about an hour long, so its profile is tiny and unlike any normal day's.",
    also: ["muhurat session", "muhurat"],
  },
  tick: {
    plain:
      "Two meanings. The smallest step price can move in (the tick size). Or one reported trade in the raw data feed; 'tick data' means every trade, not one-minute summaries.",
    also: ["ticks", "tick size", "tick data"],
  },
  "open interest": {
    plain:
      "The number of futures or options contracts still open at the end of a day. Volume counts trades; open interest counts positions still held. Rising open interest means new positions are being opened.",
    also: ["OI"],
  },
  VWAP: {
    plain:
      "Volume-weighted average price: the average price of everything traded so far today, with each trade weighted by its size. It is one number per moment, where a profile is a whole distribution.",
    also: ["volume-weighted average price"],
  },
  "anchored VWAP": {
    plain:
      "A VWAP that starts from a moment you choose — a big news candle, a swing low — instead of from today's open.",
    also: ["anchored VWAPs", "AVWAP"],
  },
  "order-flow delta": {
    plain:
      "Volume traded at the ask (buyers lifting offers) minus volume traded at the bid (sellers hitting bids). It needs tick data with trade direction. Not the same as an option's delta.",
    also: ["cumulative delta", "volume delta"],
  },
  "footprint chart": {
    plain:
      "A candle drawn as a small table: for each price inside the candle, how much traded at the bid and at the ask. It is a volume profile for every single bar.",
    also: ["footprint charts", "footprint"],
  },

  /* ---------------- Evidence ---------------- */

  "standard deviation": {
    plain:
      "A measure of spread: how far values usually sit from their average. For a bell-shaped (normal) distribution, about 68% of values fall within one standard deviation of the average.",
    also: ["standard deviations", "one standard deviation"],
  },
  "normal distribution": {
    plain:
      "The symmetric bell curve. Many statistics assume it. Real intraday volume profiles are usually not normal — they are lopsided, have two humps, or have long thin tails.",
    also: ["bell curve", "normally distributed"],
  },
  "look-ahead bias": {
    plain:
      "A backtest mistake: using information the strategy could not have had at the moment it traded, such as today's final POC at 10:00. It makes results look better than anything you could actually achieve.",
    also: ["look-ahead", "lookahead", "look ahead"],
  },
  "profit factor": {
    plain:
      "Total money won by winning trades divided by total money lost by losing trades. Above 1 means the winners outweighed the losers before anything else is considered; it says nothing about how reliable that is.",
    also: ["profit factors"],
  },
  "confidence interval": {
    plain:
      "A range that shows how uncertain a measured number is. If two groups' ranges overlap heavily, the data cannot tell them apart, even if their headline numbers differ.",
    also: ["confidence intervals", "CI", "CIs"],
  },
  "multiple comparisons": {
    plain:
      "The trap of testing many rules or many slices of data and reporting the best. Test enough variations and some will look excellent by luck alone.",
    also: ["multiple testing", "multiple-comparison", "data snooping", "data-snooping"],
  },
  overfitting: {
    plain:
      "Tuning a rule so closely to past data that it captures that data's noise rather than a lasting pattern. An overfit rule backtests well and trades badly.",
    also: ["overfit", "overfitted", "curve-fitting", "curve fitting"],
  },
  regime: {
    plain:
      "A stretch of time when the market behaves in one consistent way — trending, choppy, high volatility. A rule that works in one regime can fail in the next.",
    also: ["regimes", "regime change", "regime dependence"],
  },
};

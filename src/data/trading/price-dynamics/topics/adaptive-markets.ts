import type { Topic } from "../../../types.ts";

export const adaptiveMarkets: Topic = {
  id: "adaptive-markets",
  title: "Adaptive markets",
  tier: 5,
  week: 13,
  summary: "Strategies as competing species whose success alters the environment that made them successful.",
  why: "Market patterns are not stationary physical constants. Once discovered, capital moves toward them, execution costs rise, competitors adapt, and the edge can weaken or invert.",
  insights: [
    { t: "Efficiency is ecological, not binary", d: "How efficient a market is depends on the population of strategies, available capital, institutions, and recent environmental shocks." },
    { t: "Profit invites its own competition", d: "A repeatable edge attracts imitators whose trading moves prices earlier and consumes the return." },
    { t: "Regimes are environments", d: "A strategy adapted to trending, liquid conditions may fail abruptly when leverage, policy, or the participant population changes." },
    { t: "Survival is part of optimality", d: "A high average return is irrelevant if drawdown or leverage causes extinction before the favourable environment returns." },
  ],
  pitfalls: ["Explaining every failed backtest after the fact as a regime change.", "Using continual adaptation as permission to overfit continually."],
  quiz: [
    { q: "In the adaptive-markets view, efficiency depends on...", options: ["one universal law", "the current ecology of participants and institutions", "only company earnings", "a fixed tail index"], answer: 1, why: "Competition and environment determine which patterns persist.", difficulty: "recall" },
    { q: "Why can a published edge decay?", options: ["History changes", "Capital crowds the trade and alters prices", "Returns lose signs", "Exchanges delete it"], answer: 1, why: "Exploitation changes the opportunity itself.", difficulty: "apply" },
    { q: "A strategy performs only in low-volatility trends. What is the right description?", options: ["Universally optimal", "Adapted to one market environment", "Risk-free", "A martingale"], answer: 1, why: "Its fitness is regime-dependent.", difficulty: "apply" },
    { q: "What constraint matters before long-run average return?", options: ["Survival through adverse paths", "Ticker length", "Chart colour", "Number of indicators"], answer: 0, why: "A strategy that goes extinct cannot realise its ensemble promise.", difficulty: "judge" },
    { q: "Which practice best respects adaptive markets?", options: ["Fix parameters forever", "Monitor degradation with genuinely out-of-sample evidence", "Retrain until the backtest rises", "Ignore transaction costs"], answer: 1, why: "Adaptation demands testing without erasing the distinction between fit and evidence.", difficulty: "judge" },
  ],
};

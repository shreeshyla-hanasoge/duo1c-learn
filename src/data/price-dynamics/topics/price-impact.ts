import type { Topic } from "../../types.ts";

export const priceImpact: Topic = {
  id: "price-impact",
  title: "Order flow & price impact",
  tier: 1,
  week: 6,
  summary: "Persistent trading pressure, liquidity response, and the square-root impact law.",
  why: "Trade signs are strongly persistent, yet returns are much less predictable. Understanding that apparent contradiction is central to how markets absorb large orders.",
  conceptFilm: {
    src: "/media/concept-films/price-impact-liquid-book.mp4",
    title: "Pressure meets adaptive liquidity",
    watchFor:
      "The nearest layers disappear first, the centre moves less with each added bead, and the book starts rebuilding when the pressure stops.",
  },
  insights: [
    { t: "Large orders are split", d: "A parent order becomes many child trades, so buy and sell signs remain correlated across long sequences." },
    { t: "Impact is concave", d: "Across many settings, peak impact grows roughly like the square root of participation-adjusted size rather than in direct proportion to size." },
    { t: "Liquidity is asymmetric and adaptive", d: "When buy flow is expected, sell-side liquidity can deepen or price response can weaken, offsetting sign persistence." },
    { t: "Impact and information are entangled", d: "Prices move after trades both because orders consume liquidity and because order flow may contain information. Observational data rarely separates them cleanly." },
  ],
  pitfalls: ["Treating the square-root law as an exact universal formula at every scale.", "Calling post-trade price movement purely mechanical without considering selection and information."],
  quiz: [
    { q: "Why are trade signs persistent?", options: ["Prices only rise", "Large parent orders are split into many child trades", "Exchanges duplicate every order", "Spreads are constant"], answer: 1, why: "Order splitting creates long runs of same-side activity.", difficulty: "recall" },
    { q: "Under a square-root law, quadrupling trade size changes impact by roughly...", options: ["4×", "2×", "16×", "0×"], answer: 1, why: "The square root of four is two.", difficulty: "apply" },
    { q: "How can returns stay weakly predictable despite persistent buy flow?", options: ["Trade signs are measured incorrectly", "Liquidity adapts to expected flow", "Every buy is cancelled", "Prices ignore trades"], answer: 1, why: "Expected flow receives a smaller marginal price response.", difficulty: "apply" },
    { q: "Why is causal price impact hard to estimate?", options: ["Trades lack sizes", "Trading decisions and information are jointly determined", "Prices have no timestamps", "Orders never repeat"], answer: 1, why: "The trade is endogenous to the trader's information and market state.", difficulty: "judge" },
    { q: "What does concave impact mean?", options: ["Impact falls as size rises", "Impact rises less than proportionally with size", "Impact is always temporary", "Impact has no noise"], answer: 1, why: "Each added unit has smaller marginal impact than a linear model predicts.", difficulty: "recall" },
  ],
};

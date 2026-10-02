import type { Topic } from "../../types.ts";

export const stochasticProcesses: Topic = {
  id: "stochastic-processes",
  title: "Random walks & martingales",
  tier: 0,
  week: 1,
  summary: "The precise language for a price whose next direction is unpredictable.",
  why: "A martingale separates 'unpredictable direction' from 'no structure at all'. Prices may be martingales while volatility, trading intensity, and tails remain highly predictable.",
  insights: [
    { t: "A process is a family of random variables", d: "A price path is one realised history. The process describes the distribution of all histories that could have occurred." },
    { t: "Martingale means no conditional drift", d: "Given everything known now, the expected next value equals the current value. It does not mean independence, Gaussian returns, or constant risk." },
    { t: "Returns are usually easier to model than prices", d: "Prices wander and are commonly non-stationary. Differences or log returns are closer to stable statistical objects." },
    { t: "Quadratic variation records realised roughness", d: "Even when signed moves cancel, squared moves accumulate. That is why volatility can be measured while direction remains elusive." },
  ],
  pitfalls: ["Failing to reject a random walk is not proof that the true process is a random walk.", "A fair-game expectation says nothing about whether the path is safe to hold."],
  quiz: [
    { q: "What does the martingale property say?", options: ["Returns are independent", "The conditional expected next value is the current value", "Volatility is constant", "Prices never jump"], answer: 1, why: "It is a statement about conditional expectation, not the full distribution.", difficulty: "recall" },
    { q: "A price has unpredictable signs but clustered volatility. Can it still be a martingale?", options: ["No", "Only with Gaussian returns", "Yes", "Only at daily frequency"], answer: 2, why: "Conditional variance may vary even when conditional mean changes are zero.", difficulty: "apply" },
    { q: "Why use log returns instead of price levels in many models?", options: ["They are always normal", "They are additive across time and often more stationary", "They remove all jumps", "They guarantee profit"], answer: 1, why: "Log returns add over intervals and usually have more stable properties than price levels.", difficulty: "apply" },
    { q: "Which quantity keeps growing when positive and negative moves cancel?", options: ["Sample mean", "Quadratic variation", "Bid price", "Autocorrelation of signs"], answer: 1, why: "Squaring removes the sign and accumulates path roughness.", difficulty: "recall" },
    { q: "Which observation most directly contradicts a martingale model for price?", options: ["Fat-tailed returns", "Volatility clustering", "A reliably non-zero return forecast from current information", "Price jumps"], answer: 2, why: "A usable conditional mean forecast violates the fair-game restriction.", difficulty: "judge" },
  ],
};

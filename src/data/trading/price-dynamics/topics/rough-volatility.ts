import type { Topic } from "../../../types.ts";

export const roughVolatility: Topic = {
  id: "rough-volatility",
  title: "Rough volatility",
  tier: 2,
  week: 4,
  summary: "Why volatility paths appear far more jagged than classical diffusion models allow.",
  why: "Empirical volatility behaves as if its Hurst exponent is near 0.1: strongly irregular locally, yet with dependence across scales. This changes forecasting and option modelling.",
  insights: [
    { t: "Rough means H < 1/2", d: "Nearby volatility increments tend to oppose rather than smoothly continue one another, producing a visibly jagged path." },
    { t: "Roughness and long memory are different claims", d: "A process may be locally rough without requiring the same kind of slowly decaying dependence assumed by classical long-memory models." },
    { t: "Multi-scale order flow can generate roughness", d: "Agents acting over many horizons create a superposition of response times, linking microscopic trading to macroscopic volatility." },
    { t: "Sampling and estimation can fake or blur roughness", d: "Microstructure noise, estimator choice, and the observation grid must be separated from the latent volatility path." },
  ],
  pitfalls: ["Treating a fitted Hurst exponent as a universal market constant.", "Estimating roughness directly from raw high-frequency returns without addressing microstructure noise."],
  quiz: [
    { q: "A rough-volatility model typically has Hurst exponent...", options: ["near 1", "near 0.5 exactly", "well below 0.5", "above 2"], answer: 2, why: "Empirical estimates often cluster near 0.1.", difficulty: "recall" },
    { q: "What does H < 0.5 imply locally?", options: ["Smooth trends", "Anti-persistent, jagged increments", "Constant variance", "No dependence at any horizon"], answer: 1, why: "Local increments tend to reverse, making the path rough.", difficulty: "apply" },
    { q: "Why can raw tick returns mislead roughness estimates?", options: ["Ticks have no timestamps", "Bid-ask bounce and other microstructure noise add short-scale variation", "All ticks are normal", "Volume is missing"], answer: 1, why: "Observed price noise is not the same as latent volatility roughness.", difficulty: "apply" },
    { q: "Which statement is safest?", options: ["Roughness proves one universal mechanism", "H is fixed for every asset", "Roughness is an empirical regularity whose estimate depends on scale and method", "Rough models remove jumps"], answer: 2, why: "The evidence is strong, but estimation and interpretation require care.", difficulty: "judge" },
    { q: "What mechanism can connect many trading horizons to rough volatility?", options: ["One representative trader", "A superposition of heterogeneous response times", "A fixed spread", "Annual accounting"], answer: 1, why: "Mixing activity across scales can create fractional-looking dynamics.", difficulty: "apply" },
  ],
};

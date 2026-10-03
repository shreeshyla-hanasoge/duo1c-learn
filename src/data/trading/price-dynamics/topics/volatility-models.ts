import type { Topic } from "../../../types.ts";

export const volatilityModels: Topic = {
  id: "volatility-models",
  title: "ARCH, GARCH & stochastic volatility",
  tier: 2,
  week: 3,
  summary: "How to model random direction with a conditionally predictable size.",
  why: "Raw returns often have little linear autocorrelation, yet absolute and squared returns remain dependent. Volatility models formalise that split.",
  insights: [
    { t: "The sign can be noise while the scale has memory", d: "A calm day predicts a different range of plausible moves than a crisis day even when neither predicts up or down." },
    { t: "ARCH feeds past shocks into current variance", d: "Large recent residuals raise the next conditional variance regardless of their sign." },
    { t: "GARCH adds persistence", d: "Current variance depends on both recent shocks and its own previous estimate, producing clusters that decay rather than vanish overnight." },
    { t: "Stochastic volatility makes variance latent", d: "Volatility follows its own random process instead of being a deterministic recursion of observed returns." },
  ],
  pitfalls: ["A high-persistence GARCH fit can imitate a structural break.", "Good one-step forecasts do not guarantee accurate tail probabilities."],
  quiz: [
    { q: "What empirical pattern motivates GARCH?", options: ["Constant volume", "Volatility clustering", "Perfect return predictability", "A fixed spread"], answer: 1, why: "Large moves tend to be followed by large moves in either direction.", difficulty: "recall" },
    { q: "Returns show near-zero autocorrelation, but squared returns do not. What does this mean?", options: ["Direction and magnitude are both unpredictable", "Direction is weakly predictable but magnitude has memory", "Prices are constant", "The data must be wrong"], answer: 1, why: "Dependence lives in conditional variance rather than the mean.", difficulty: "apply" },
    { q: "What does GARCH add to ARCH?", options: ["A news feed", "Lagged conditional variance", "Only positive shocks", "A fixed tail exponent"], answer: 1, why: "The lagged variance term captures persistence compactly.", difficulty: "recall" },
    { q: "In a stochastic-volatility model, volatility is...", options: ["directly observed", "a latent random process", "always constant", "equal to volume"], answer: 1, why: "It must be inferred from noisy returns or option prices.", difficulty: "recall" },
    { q: "A volatility model fits history well across a regime change. What should you question first?", options: ["Whether persistence is masking a break", "Whether returns have signs", "Whether time is ordered", "Whether prices are positive"], answer: 0, why: "Slow decay and a permanent change can look similar in a short sample.", difficulty: "judge" },
  ],
};

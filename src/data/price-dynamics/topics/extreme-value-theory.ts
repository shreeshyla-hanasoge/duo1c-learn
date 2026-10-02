import type { Topic } from "../../types.ts";

export const extremeValueTheory: Topic = {
  id: "extreme-value-theory",
  title: "Extreme value theory",
  tier: 2,
  week: 9,
  summary: "Estimating tail shape, return levels, and losses beyond ordinary observations.",
  why: "Risk lives in sparse data. EVT focuses the model on extremes instead of letting thousands of ordinary days overwhelm the few observations that matter most.",
  insights: [
    { t: "Block maxima and peaks over threshold are two routes", d: "One models the maximum in each block; the other keeps every exceedance over a high threshold and usually uses data more efficiently." },
    { t: "The tail index controls severity", d: "It determines how slowly extreme probabilities decay and whether moments such as variance are finite." },
    { t: "Return level is not a deadline", d: "A ten-year return level is exceeded with a certain annual probability; it can occur twice next year or not at all for decades." },
    { t: "Threshold choice is a bias-variance trade", d: "Too low contaminates the tail model with ordinary data. Too high leaves too few exceedances to estimate anything precisely." },
  ],
  pitfalls: ["Extrapolating far beyond the data and reporting a narrow confidence interval.", "Assuming extremes are independent when volatility clustering makes exceedances arrive together."],
  quiz: [
    { q: "What does peaks-over-threshold model?", options: ["Every return", "Exceedances beyond a high cutoff", "Only annual means", "Trading volume"], answer: 1, why: "It targets tail observations directly.", difficulty: "recall" },
    { q: "What happens if the threshold is set too high?", options: ["Bias must rise", "Too few data remain and variance rises", "All observations become extreme", "The tail becomes Gaussian"], answer: 1, why: "Purity improves but precision collapses.", difficulty: "apply" },
    { q: "A 10-year return loss is best interpreted as...", options: ["a loss that occurs exactly once per decade", "a level with roughly 10% annual exceedance probability under the model", "the worst possible loss", "an average decade"], answer: 1, why: "Return period is a probability statement, not a schedule.", difficulty: "apply" },
    { q: "Why decluster threshold exceedances?", options: ["To make losses smaller", "To avoid treating one volatility episode as many independent extremes", "To remove negative returns", "To increase sample size"], answer: 1, why: "Dependence otherwise overstates independent tail evidence.", difficulty: "judge" },
    { q: "What does a heavier tail imply?", options: ["Extreme probability decays more slowly", "Variance is always zero", "Prices are predictable", "There are no jumps"], answer: 0, why: "Large observations retain materially more probability mass.", difficulty: "recall" },
  ],
};

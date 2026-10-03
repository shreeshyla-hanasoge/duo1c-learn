import type { Topic } from "../../../types.ts";

export const econophysicsRmt: Topic = {
  id: "econophysics-rmt",
  title: "Scaling & random matrix theory",
  tier: 4,
  week: 12,
  summary: "Power laws, universality, and separating correlation signal from sampling noise.",
  why: "A sample correlation matrix contains an enormous amount of apparent structure even when the true assets are independent. Random matrix theory provides a noise benchmark.",
  insights: [
    { t: "Scaling asks what survives a change of units", d: "Power laws look similar across scales and are summarised by exponents rather than a typical size." },
    { t: "Finite samples manufacture eigenstructure", d: "When the number of assets is not small relative to observations, noisy sample correlations produce a broad eigenvalue cloud." },
    { t: "Outlier eigenvalues can carry common factors", d: "The largest mode often resembles a market factor; further outliers may align with sectors. The bulk is a null benchmark, not automatically useless." },
    { t: "Cleaning is a modelling choice", d: "Clipping noisy eigenvalues can stabilise covariance estimates, but the true structure can drift faster than the historical sample." },
  ],
  pitfalls: ["Calling every straight segment on a log-log plot a power law.", "Using the random-matrix bulk boundary without checking missing data, heavy tails, and time-varying correlations."],
  quiz: [
    { q: "What problem does random matrix theory address in finance?", options: ["Order matching", "Distinguishing correlation structure from sampling noise", "Option exercise", "Accounting fraud"], answer: 1, why: "It supplies a null eigenvalue spectrum for noisy covariance matrices.", difficulty: "recall" },
    { q: "What often characterises the largest stock-correlation eigenvector?", options: ["One random company", "A broad market mode", "Only cash", "Bid-ask bounce"], answer: 1, why: "Many stocks co-move with the overall market.", difficulty: "apply" },
    { q: "Why are covariance estimates fragile when assets are numerous?", options: ["There are too few parameters", "The parameter count is large relative to observations", "Prices become negative", "Eigenvalues vanish exactly"], answer: 1, why: "Sampling error dominates many directions.", difficulty: "apply" },
    { q: "What evidence is insufficient for a power law?", options: ["A straight-looking line over a narrow log-log range", "A fitted exponent with uncertainty", "Comparison with alternative tails", "Out-of-sample checks"], answer: 0, why: "Many distributions mimic a short straight segment.", difficulty: "judge" },
    { q: "What is covariance cleaning intended to improve?", options: ["Historical return", "Stability of estimated risk and optimisation", "Exchange speed", "Trade count"], answer: 1, why: "It shrinks noisy directions that otherwise destabilise portfolios.", difficulty: "recall" },
  ],
};

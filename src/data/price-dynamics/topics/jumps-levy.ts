import type { Topic } from "../../types.ts";

export const jumpsLevy: Topic = {
  id: "jumps-levy",
  title: "Lévy processes & jumps",
  tier: 0,
  week: 2,
  summary: "Models that allow discontinuous moves and heavier tails than Brownian motion.",
  why: "Real prices gap on news, auctions, and liquidity holes. A continuous Gaussian path assigns far too little probability to these moves.",
  insights: [
    { t: "Brownian motion is continuous", d: "Its increments are Gaussian and independent, so large moves become fantastically rare faster than market data supports." },
    { t: "A jump process adds discrete shocks", d: "Jump-diffusion combines ordinary small fluctuations with randomly timed jumps whose sizes come from a separate distribution." },
    { t: "Lévy processes keep stationary independent increments", d: "They broaden the random-walk family to include jumps and stable laws while retaining mathematical tractability." },
    { t: "Infinite variance changes everything", d: "For sufficiently heavy tails, the sample mean and variance converge slowly or not at all to the objects normal intuition assumes." },
  ],
  pitfalls: ["A better fit to tails does not identify the economic cause of a jump.", "Estimating a jump separately from rapidly changing volatility is frequency-dependent and model-dependent."],
  quiz: [
    { q: "What key feature can a jump-diffusion represent that Brownian motion cannot?", options: ["Randomness", "Discontinuous price changes", "A conditional mean", "Time"], answer: 1, why: "Brownian paths are continuous by construction.", difficulty: "recall" },
    { q: "A model combines small continuous moves with rare shocks. What is it?", options: ["AR(1)", "Jump-diffusion", "Static regression", "Moving average"], answer: 1, why: "The diffusion handles ordinary variation and the jump term handles shocks.", difficulty: "apply" },
    { q: "Which property is shared by standard Lévy processes?", options: ["Constant price", "Stationary independent increments", "Finite variance", "Continuous paths"], answer: 1, why: "Jumps and infinite variance are allowed; stationary independent increments define the family.", difficulty: "recall" },
    { q: "Why can Gaussian risk estimates fail badly?", options: ["Gaussian models have no mean", "They assign too little mass to extreme moves", "They overcount trading days", "They require tick data"], answer: 1, why: "Thin Gaussian tails understate market extremes.", difficulty: "apply" },
    { q: "After observing a large high-frequency move, what is hardest to determine from the path alone?", options: ["Its sign", "Its time", "Whether it was a jump or a burst of continuous volatility", "Its absolute size"], answer: 2, why: "Finite sampling makes the decomposition model-dependent.", difficulty: "judge" },
  ],
};

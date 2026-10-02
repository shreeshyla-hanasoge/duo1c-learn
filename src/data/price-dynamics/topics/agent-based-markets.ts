import type { Topic } from "../../types.ts";

export const agentBasedMarkets: Topic = {
  id: "agent-based-markets",
  title: "Agent-based markets & minority games",
  tier: 1,
  week: 8,
  summary: "How heterogeneous strategies interacting through one price can create bursts and fat tails.",
  why: "Instead of assuming a price process, agent-based models ask which market-level patterns emerge when many bounded, adapting traders compete for scarce liquidity and profit.",
  insights: [
    { t: "Heterogeneity is a mechanism", d: "Different horizons, beliefs, inventories, and constraints prevent every trader from reacting in the same way at the same time." },
    { t: "The minority game rewards being uncrowded", d: "A strategy works only while not too many others use it, capturing the market's negative feedback against popular edges." },
    { t: "Stylised facts can emerge", d: "Fat tails and volatility clustering may arise from interaction even when individual rules are simple and external news is thin." },
    { t: "Generative explanation needs calibration", d: "Reproducing one power law is not enough. A credible model should match several independent facts and survive parameter changes." },
  ],
  pitfalls: ["Mistaking an appealing simulation story for identification of the real mechanism.", "Adding enough agent types to fit anything, which makes the model explain nothing."],
  quiz: [
    { q: "What does an agent-based model specify first?", options: ["A closed-form price distribution", "Rules and interactions for individual agents", "A risk-free return", "A tail exponent"], answer: 1, why: "Aggregate dynamics are generated from micro-level behaviour.", difficulty: "recall" },
    { q: "Why does a minority-game strategy lose value when crowded?", options: ["It becomes illegal", "Its users cease to be in the profitable minority", "Its code slows down", "Volatility becomes zero"], answer: 1, why: "Payoff depends on acting against the majority.", difficulty: "apply" },
    { q: "Which market feature can emerge without being programmed directly?", options: ["A specific historical crash", "Volatility clustering", "An exchange holiday", "A company dividend"], answer: 1, why: "Interaction and adaptation can create clustered activity.", difficulty: "recall" },
    { q: "What is a strong validation test for an agent-based model?", options: ["It makes an attractive chart", "It matches several facts not used for calibration", "It has many parameters", "It produces rising prices"], answer: 1, why: "Out-of-target regularities test whether the mechanism generalises.", difficulty: "judge" },
    { q: "Why is trader heterogeneity important?", options: ["It guarantees efficiency", "It creates varied responses and prevents a single representative rule from dominating the model", "It removes feedback", "It fixes the spread"], answer: 1, why: "Diverse horizons and constraints shape aggregate stability and bursts.", difficulty: "apply" },
  ],
};

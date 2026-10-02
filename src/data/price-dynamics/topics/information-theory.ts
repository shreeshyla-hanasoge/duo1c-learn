import type { Topic } from "../../types.ts";

export const informationTheory: Topic = {
  id: "information-theory",
  title: "Entropy & information flow",
  tier: 2,
  week: 10,
  summary: "Quantifying uncertainty, nonlinear dependence, and directional information.",
  why: "Correlation sees one narrow kind of structure. Entropy, mutual information, permutation entropy, and transfer entropy ask more directly how much uncertainty the past removes.",
  insights: [
    { t: "Entropy measures uncertainty under a chosen representation", d: "A continuous price series must be discretised or estimated with a density. The answer depends on that choice." },
    { t: "Mutual information detects nonlinear dependence", d: "It is zero only under independence, while zero correlation can coexist with strong nonlinear structure." },
    { t: "Permutation entropy studies ordinal patterns", d: "It replaces values with their local rank order, gaining robustness to monotone transformations and some distributional changes." },
    { t: "Transfer entropy is directional but not automatically causal", d: "It measures whether the past of X improves prediction of Y beyond Y's own past. Hidden common drivers can still produce the pattern." },
  ],
  pitfalls: ["Comparing entropy values computed with different bins, windows, or estimators.", "Reading transfer entropy as causal influence without controlling for common drivers and timing."],
  quiz: [
    { q: "Mutual information can detect dependence when correlation is...", options: ["exactly one", "zero", "undefined only", "positive only"], answer: 1, why: "Nonlinear dependence may have zero linear correlation.", difficulty: "apply" },
    { q: "What does permutation entropy encode?", options: ["Exact price levels", "Local rank-order patterns", "Only volume", "Bid-ask spreads"], answer: 1, why: "It compares ordinal motifs rather than raw magnitudes.", difficulty: "recall" },
    { q: "Low estimated entropy always proves predictability. True?", options: ["Yes", "No—estimator bias, discretisation, and small samples can lower it", "Only for equities", "Only intraday"], answer: 1, why: "Measurement choices can create apparent structure.", difficulty: "judge" },
    { q: "Transfer entropy from X to Y asks whether...", options: ["X and Y have the same mean", "X's past reduces uncertainty about Y beyond Y's own past", "X causes Y by definition", "Y is normal"], answer: 1, why: "It is an incremental predictive-information measure.", difficulty: "recall" },
    { q: "Why is compressibility linked to market efficiency?", options: ["Patterns allow shorter descriptions and potential prediction", "Compressed files trade faster", "Prices must be integers", "Entropy equals profit"], answer: 0, why: "Repeated exploitable structure makes a sequence less information-rich.", difficulty: "apply" },
  ],
};

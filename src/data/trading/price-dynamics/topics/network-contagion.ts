import type { Topic } from "../../../types.ts";

export const networkContagion: Topic = {
  id: "network-contagion",
  title: "Networks & contagion",
  tier: 5,
  week: 14,
  summary: "How common exposures, obligations, and forced selling transmit shocks between assets and institutions.",
  why: "During stress, correlations often rise because losses activate shared constraints. Network structure explains why a local shock can become a system-wide event.",
  insights: [
    { t: "There are several different networks", d: "Payment obligations, common asset holdings, funding dependencies, and return correlations are not interchangeable graphs." },
    { t: "Common ownership creates indirect links", d: "Two institutions need no direct contract to infect one another if both must sell the same illiquid asset." },
    { t: "Centrality is mechanism-specific", d: "A node central by trade count may not be central by exposure size, liquidity provision, or default cascade potential." },
    { t: "Stress correlation is partly endogenous", d: "Margin calls, risk limits, and redemptions synchronise selling, so diversification measured in calm periods can disappear when needed." },
  ],
  pitfalls: ["Treating a correlation network as proof of a transmission channel.", "Assuming the most connected node is always the most systemically important."],
  quiz: [
    { q: "How can two funds transmit losses without lending to each other?", options: ["Shared illiquid holdings", "Different time zones", "Different auditors", "Random walks"], answer: 0, why: "Forced sales depress an asset held by both.", difficulty: "apply" },
    { q: "Why can correlations rise in a crash?", options: ["Every firm becomes identical", "Shared constraints trigger synchronised deleveraging", "Variance becomes zero", "Networks disappear"], answer: 1, why: "Common responses create endogenous co-movement.", difficulty: "apply" },
    { q: "What is wrong with using one network for every contagion question?", options: ["Networks cannot be measured", "Edges mean different mechanisms in obligations, holdings, and correlations", "Graphs have no weights", "Prices have no nodes"], answer: 1, why: "The graph must match the channel being studied.", difficulty: "judge" },
    { q: "A highly connected tiny institution is necessarily the largest systemic risk. True?", options: ["Yes", "No—exposure size, substitutability, and the propagation rule matter", "Only in equities", "Only monthly"], answer: 1, why: "Degree alone does not determine cascade impact.", difficulty: "judge" },
    { q: "What turns a mark-to-market loss into a feedback loop?", options: ["A margin call that forces selling", "A wider sample", "A lower tick count", "A dividend"], answer: 0, why: "Selling depresses price, which creates further losses and calls.", difficulty: "recall" },
  ],
};

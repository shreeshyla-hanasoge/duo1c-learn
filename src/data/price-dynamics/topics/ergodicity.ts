import type { Topic } from "../../types.ts";

export const ergodicity: Topic = {
  id: "ergodicity",
  title: "Ergodicity & multiplicative wealth",
  tier: 3,
  week: 15,
  summary: "Why the average across imagined worlds can differ from what one investor experiences through time.",
  why: "Returns compound multiplicatively. In such systems, ensemble expected wealth can rise even while the typical long-run path stagnates or shrinks.",
  insights: [
    { t: "Ensemble and time averages answer different questions", d: "The ensemble average compares many parallel outcomes at one horizon. The time average follows one repeatedly compounding path." },
    { t: "Log growth matches repeated compounding", d: "Maximising expected log wealth targets the asymptotic growth rate because logs turn products into sums." },
    { t: "Volatility drag is geometric", d: "A 50% gain followed by a 50% loss leaves 75% of starting wealth. Equal percentage moves do not cancel under multiplication." },
    { t: "Ruin is an absorbing practical boundary", d: "An ensemble average may be rescued by rare enormous winners, but a ruined trader cannot jump to those parallel paths." },
  ],
  pitfalls: ["Treating expected log growth as a complete utility theory for every investor.", "Using ensemble expectation to size leverage without considering pathwise drawdown and survival."],
  quiz: [
    { q: "A portfolio gains 50% then loses 50%. Where does it finish?", options: ["100%", "75%", "50%", "125%"], answer: 1, why: "1.5 × 0.5 = 0.75.", difficulty: "apply" },
    { q: "What does the ensemble average compare?", options: ["One path over many periods", "Many possible paths at one horizon", "Only median returns", "Only realised volatility"], answer: 1, why: "It averages across parallel outcomes.", difficulty: "recall" },
    { q: "Why does expected log wealth relate to time-average growth?", options: ["Logs remove risk", "Logs turn multiplicative returns into additive increments", "Logs guarantee positive returns", "Logs ignore losses"], answer: 1, why: "Repeated products become a sum amenable to a long-run average.", difficulty: "apply" },
    { q: "A gamble has positive expected wealth but frequent ruin. What is the key warning?", options: ["Expectation may be dominated by rare winners unavailable after ruin", "Positive expectation prevents ruin", "Time average must be higher", "Variance is irrelevant"], answer: 0, why: "Non-ergodic compounding makes survival path-dependent.", difficulty: "judge" },
    { q: "Which quantity is directly reduced by volatility under repeated compounding?", options: ["Arithmetic average return in every sample", "Geometric growth rate", "Number of paths", "Trade count"], answer: 1, why: "Dispersion lowers typical compound growth even at a fixed arithmetic mean.", difficulty: "recall" },
  ],
};

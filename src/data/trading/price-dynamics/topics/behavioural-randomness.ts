import type { Topic } from "../../../types.ts";

export const behaviouralRandomness: Topic = {
  id: "behavioural-randomness",
  title: "How humans misread randomness",
  tier: 5,
  week: 16,
  summary: "Apophenia, clustering illusions, hindsight, and the discipline of distrusting a persuasive chart.",
  why: "The final source of false predictability is the analyst. Human pattern recognition is powerful enough to discover shapes in noise, especially after the outcome is known.",
  insights: [
    { t: "Randomness naturally clusters", d: "Runs, gaps, and streaks are expected in random sequences. People wrongly expect randomness to alternate neatly." },
    { t: "Apophenia turns coincidence into a story", d: "Once a pattern has a name and narrative, we remember the hits, reinterpret near misses, and forget how many alternatives were searched." },
    { t: "Hindsight leaks future knowledge", d: "A chart pattern looks obvious after the reversal point is visible. A valid test must freeze the information set at each decision time." },
    { t: "A holdout is a scarce resource", d: "Checking the test set repeatedly adapts the research process to it, turning it into another training set." },
  ],
  pitfalls: ["Drawing a rule from a chart first and then testing only that same interval.", "Treating a low p-value as protection against data snooping across many strategies."],
  quiz: [
    { q: "Why do streaks not by themselves disprove randomness?", options: ["Random sequences naturally contain clusters", "Every streak has a cause", "Prices must trend", "Samples have no order"], answer: 0, why: "Neat alternation is less random-looking than genuine random variation.", difficulty: "recall" },
    { q: "A chart pattern is defined after seeing the whole chart. What is the main problem?", options: ["Low resolution", "Hindsight and selection bias", "Too many prices", "The spread"], answer: 1, why: "Future information shaped the rule.", difficulty: "apply" },
    { q: "You test 1,000 indicators and one has p = 0.01. What must be considered?", options: ["Multiple testing", "Only transaction tax", "The ticker font", "Whether p is positive"], answer: 0, why: "With many searches, apparently rare results become expected.", difficulty: "judge" },
    { q: "Why does repeatedly checking a holdout weaken it?", options: ["Its rows disappear", "Research choices adapt to its feedback", "It becomes larger", "Returns become normal"], answer: 1, why: "The holdout starts influencing model selection.", difficulty: "apply" },
    { q: "Which practice best counters apophenia?", options: ["A more colourful chart", "Pre-registering the rule and testing on untouched data", "Adding indicators", "Ignoring failed variants"], answer: 1, why: "A frozen hypothesis and untouched evidence separate discovery from confirmation.", difficulty: "judge" },
  ],
};

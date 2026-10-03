import type { Topic } from "../../../types.ts";

export const hawkesProcesses: Topic = {
  id: "hawkes-processes",
  title: "Hawkes point processes",
  tier: 3,
  week: 7,
  summary: "A language for clustered events where each arrival temporarily raises future intensity.",
  why: "Trades, order submissions, cancellations, and price jumps arrive in bursts. Hawkes processes model event time directly and quantify how much activity is internally triggered.",
  conceptFilm: {
    src: "/media/concept-films/hawkes-branching-sparks.mp4",
    title: "One event becomes a family",
    watchFor:
      "A lone baseline spark creates descendants. Each generation fades until the cluster exhausts itself and quiet returns.",
  },
  insights: [
    { t: "Intensity is a conditional event rate", d: "It changes through time: a baseline represents outside arrivals, while a kernel adds the lingering effect of past events." },
    { t: "Events create descendants", d: "One event may trigger children, grandchildren, and a whole cluster. The branching ratio summarises the expected number of direct offspring." },
    { t: "Near-critical systems generate long bursts", d: "As the branching ratio approaches one, clusters become larger and slower to die even when the excitation kernel is short-lived." },
    { t: "Multivariate Hawkes models excitation across event types", d: "A market buy may excite further buys, cancellations on the ask, and price changes with different kernels." },
  ],
  pitfalls: ["Interpreting statistical excitation as proof of human imitation.", "A branching ratio at or above one is unstable unless the model has inhibition or another bounding mechanism."],
  quiz: [
    { q: "What happens to intensity immediately after an event in a self-exciting process?", options: ["It falls to zero", "It rises", "It becomes constant", "Time reverses"], answer: 1, why: "Past arrivals add a decaying excitation term.", difficulty: "recall" },
    { q: "What does the branching ratio represent?", options: ["Average trade size", "Expected direct descendants per event", "Bid-ask spread", "Number of assets"], answer: 1, why: "It measures endogenous reproduction of events.", difficulty: "recall" },
    { q: "A fitted ratio is close to one. What should you expect?", options: ["Isolated events", "Large persistent clusters", "No baseline events", "Constant volatility"], answer: 1, why: "Near-critical branching creates long cascades.", difficulty: "apply" },
    { q: "A buy excites buys and ask cancellations. What model is natural?", options: ["Univariate Gaussian", "Multivariate Hawkes", "Static histogram", "Linear trend"], answer: 1, why: "Multiple event types require cross-excitation kernels.", difficulty: "apply" },
    { q: "What can a high endogenous share establish by itself?", options: ["Traders consciously imitate", "Past events statistically predict more events", "News never matters", "The model is causal"], answer: 1, why: "Excitation is a conditional pattern, not a unique behavioural cause.", difficulty: "judge" },
  ],
};

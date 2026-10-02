import type { Topic } from "../../types.ts";

export const signalProcessing: Topic = {
  id: "signal-processing",
  title: "Spectra, wavelets & 1/f noise",
  tier: 2,
  week: 11,
  summary: "Looking at variation by frequency and by scale without pretending the series is stationary everywhere.",
  why: "Markets mix activity from milliseconds to years. Spectral tools show where variance lives; wavelets show when and at what scale it appears.",
  insights: [
    { t: "The spectrum allocates variance by frequency", d: "A flat spectrum resembles white noise; excess low-frequency power signals slower dependence or non-stationarity." },
    { t: "1/f behaviour is scale-rich", d: "Power falling roughly as an inverse frequency suggests no single characteristic time scale dominates." },
    { t: "Wavelets localise in time and scale", d: "Unlike one global Fourier decomposition, a wavelet transform can isolate a crash at short scales and a regime shift at long scales." },
    { t: "Filtering changes the question", d: "Smoothing may reveal a slow component, but it also adds lag and can create visually persuasive cycles near boundaries." },
  ],
  pitfalls: ["Searching many frequencies and reporting the tallest peak without a multiple-testing correction.", "Reading an edge artefact in a wavelet plot as a real market event."],
  quiz: [
    { q: "What does a flat power spectrum suggest?", options: ["White-noise-like variation", "A certain trend", "A fixed cycle", "Zero variance"], answer: 0, why: "Power is spread evenly across frequencies.", difficulty: "recall" },
    { q: "Why use wavelets for a crash?", options: ["They guarantee causality", "They localise variation in both time and scale", "They remove all noise", "They require no parameter choices"], answer: 1, why: "A transient event is poorly represented by one global spectrum.", difficulty: "apply" },
    { q: "A strong spectral peak found after scanning 5,000 frequencies should trigger concern about...", options: ["Bid-ask spread", "Multiple testing", "Dividend yield", "Tick size"], answer: 1, why: "Many searches make a large chance peak likely.", difficulty: "judge" },
    { q: "What does 1/f-like power suggest?", options: ["One dominant horizon", "Structure across many scales", "No randomness", "Only high-frequency activity"], answer: 1, why: "Power-law spectra lack a single characteristic scale.", difficulty: "recall" },
    { q: "What cost does a moving-average filter introduce?", options: ["It makes all values independent", "Lag and boundary artefacts", "Infinite variance", "A narrower spread"], answer: 1, why: "Smoothing changes timing and behaves poorly at sample edges.", difficulty: "apply" },
  ],
};

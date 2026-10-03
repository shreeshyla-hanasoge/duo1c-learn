import type { Phase, Tier } from "../../types.ts";
import { stochasticProcesses } from "./topics/stochastic-processes.ts";
import { jumpsLevy } from "./topics/jumps-levy.ts";
import { volatilityModels } from "./topics/volatility-models.ts";
import { roughVolatility } from "./topics/rough-volatility.ts";
import { microstructure } from "./topics/microstructure.ts";
import { priceImpact } from "./topics/price-impact.ts";
import { hawkesProcesses } from "./topics/hawkes-processes.ts";
import { agentBasedMarkets } from "./topics/agent-based-markets.ts";
import { extremeValueTheory } from "./topics/extreme-value-theory.ts";
import { informationTheory } from "./topics/information-theory.ts";
import { signalProcessing } from "./topics/signal-processing.ts";
import { econophysicsRmt } from "./topics/econophysics-rmt.ts";
import { adaptiveMarkets } from "./topics/adaptive-markets.ts";
import { networkContagion } from "./topics/network-contagion.ts";
import { ergodicity } from "./topics/ergodicity.ts";
import { behaviouralRandomness } from "./topics/behavioural-randomness.ts";

export const PRICE_TIERS: Tier[] = [
  {
    id: 2,
    entry: true,
    name: "Language of randomness",
    tagline: "Describe what moves randomly before trying to explain why.",
    topics: [stochasticProcesses, jumpsLevy, volatilityModels, roughVolatility],
    orientation: {
      overview: "Price randomness is not one thing. Direction can be close to unpredictable while the size of moves is persistent; a path can be continuous most of the time yet still jump; volatility can be both clustered and extremely jagged. This tier builds the mathematical vocabulary that keeps those claims separate. You will move from random walks and martingales to jumps, conditional variance, and rough volatility without confusing a convenient model with the market itself.",
      stakes: "Without this layer, every later observation becomes a vague claim that markets are either random or predictable, when the real answer depends on which feature and horizon you mean.",
      recognise: [
        { signal: "The question asks whether direction can be forecast from current information.", reach: "Use the martingale and conditional-mean language. Do not infer constant variance or independent returns." },
        { signal: "The data show calm periods, then bursts of large moves of either sign.", reach: "Model conditional variance with ARCH/GARCH or a latent stochastic-volatility process." },
        { signal: "Observed moves are too frequent in the tails for a Gaussian model.", reach: "Consider jumps, Lévy models, or heavy-tailed innovations before adding another mean predictor." },
        { signal: "Volatility looks jagged at every finer resolution.", reach: "Ask whether a rough-volatility description fits, and separate it from observation noise." },
      ],
      arc: [
        { stage: "Define unpredictability", topics: ["stochastic-processes"], point: "Start with conditional expectation. It is the cleanest way to say which part of the future the present does not reveal." },
        { stage: "Let paths jump", topics: ["jumps-levy"], point: "Relax continuous Gaussian motion so the language can accommodate gaps and heavy tails." },
        { stage: "Give magnitude a memory", topics: ["volatility-models", "rough-volatility"], point: "Move predictability out of return direction and into a time-varying, possibly rough scale." },
      ],
      outcomes: ["Explain how returns can be martingale differences while volatility remains forecastable.", "Choose between a diffusion, jump model, GARCH recursion, and rough-volatility description for a stated question.", "Distinguish one realised path from the probability law that generated possible paths.", "State exactly which assumption a market observation contradicts instead of saying only that it is non-random."],
      inTheWild: [
        { system: "Risk limits", use: "Daily position limits depend more on the conditional scale and tail of returns than on a forecast of their sign." },
        { system: "Options markets", use: "Jumps and stochastic volatility are visible in option prices because a continuous constant-volatility model cannot reproduce the observed smile and term structure." },
      ],
    },
  },
  {
    id: 3,
    name: "How markets generate it",
    tagline: "Orders, feedback, and interacting traders beneath the price path.",
    topics: [microstructure, priceImpact, hawkesProcesses, agentBasedMarkets],
    orientation: {
      overview: "A price chart hides the machinery that produced it. Underneath are queued orders, impatient trades, cancellations, inventory limits, informed flow, and strategies reacting to one another. This tier works from that event stream upward. It explains why transaction returns bounce, why trade signs remain persistent, why activity arrives in cascades, and how market-level bursts can emerge even when no single trader intended them.",
      stakes: "If you skip the event layer, mechanical effects such as the spread or order splitting are easily mistaken for economic prediction, and statistical dependence is too quickly labelled news.",
      recognise: [
        { signal: "The horizon is seconds, trades, or ticks.", reach: "Start with microstructure: quotes, the spread, queue position, and the clock used to sample events." },
        { signal: "One side trades persistently but returns remain weakly autocorrelated.", reach: "Study concave impact and adaptive liquidity rather than assuming the flow data are wrong." },
        { signal: "Events arrive in clusters with quiet gaps between them.", reach: "Use a point process and test whether past events raise the current intensity." },
        { signal: "You want to know whether simple behaviours can create a stylised fact.", reach: "Build an agent-based model, then demand that it match more than the fact it was designed to produce." },
      ],
      arc: [
        { stage: "See the mechanism", topics: ["microstructure"], point: "Replace the line chart with the order book and learn what an observed trade price actually means." },
        { stage: "Connect flow to movement", topics: ["price-impact"], point: "Follow a large order through persistent signs, changing liquidity, and concave impact." },
        { stage: "Model event cascades", topics: ["hawkes-processes"], point: "Treat time between events as data and separate baseline arrivals from self-excitation." },
        { stage: "Generate the whole market", topics: ["agent-based-markets"], point: "Let heterogeneous strategies compete and ask which aggregate regularities emerge robustly." },
      ],
      outcomes: ["Separate bid-ask bounce from movement in the quoted midpoint.", "Explain the square-root impact law and why it is an empirical scaling rule rather than a pricing identity.", "Interpret a Hawkes branching ratio without turning association into causation.", "Judge an agent-based explanation by calibration, robustness, and out-of-target evidence."],
      inTheWild: [
        { system: "Execution algorithms", use: "Participation rate, spread, available depth, and expected impact determine how a parent order is split across time and venues." },
        { system: "Exchange surveillance", use: "Event-time models flag unusual cascades of submissions, cancellations, and trades that clock-time averages hide." },
      ],
    },
  },
  {
    id: 4,
    name: "Measure signal against noise",
    tagline: "Tails, information, scale, and the null models that keep us honest.",
    topics: [extremeValueTheory, informationTheory, signalProcessing, econophysicsRmt],
    orientation: {
      overview: "Once a price series looks structured, the hard question is whether the structure survives a serious noise benchmark. This tier gives four complementary tests. Extreme value theory concentrates on the tail, information theory measures remaining uncertainty, signal processing separates scales, and random matrix theory asks how much multivariate structure a finite sample invents by itself.",
      stakes: "Flexible analysis can find a tail law, cycle, information flow, or correlation factor in almost any finite dataset. The null model and estimation uncertainty are part of the result, not footnotes.",
      recognise: [
        { signal: "The question concerns the worst day or a loss beyond the observed range.", reach: "Use extreme value theory and show threshold sensitivity and uncertainty." },
        { signal: "Dependence may be nonlinear or directional.", reach: "Use mutual or transfer information, with careful controls for estimator bias and common drivers." },
        { signal: "The pattern seems tied to a horizon or changes through time.", reach: "Use spectra for global frequency structure and wavelets for local time-scale structure." },
        { signal: "A large correlation matrix appears full of factors.", reach: "Compare its eigenvalue spectrum with a random-matrix null before interpreting each component." },
      ],
      arc: [
        { stage: "Measure what ordinary statistics miss", topics: ["extreme-value-theory", "information-theory"], point: "Focus first on sparse extremes, then on dependence that linear correlation cannot see." },
        { stage: "Inspect the scales", topics: ["signal-processing"], point: "Locate where variation lives and whether the same relationship survives across horizons." },
        { stage: "Challenge multivariate structure", topics: ["econophysics-rmt"], point: "Put every apparent factor against the eigenstructure produced by finite noisy samples." },
      ],
      outcomes: ["Interpret a return period as a probability rather than a schedule.", "Choose among correlation, mutual information, permutation entropy, and transfer entropy for a stated question.", "Explain why a wavelet view can reveal a transient that a global spectrum smears out.", "Use a random-matrix benchmark before attaching stories to sample eigenvectors."],
      inTheWild: [
        { system: "Stress testing", use: "Tail models estimate losses beyond ordinary history while making the extrapolation and its uncertainty explicit." },
        { system: "Portfolio covariance", use: "Eigenvalue cleaning reduces the unstable weights produced when an optimiser chases noisy sample directions." },
      ],
    },
  },
  {
    id: 5,
    name: "Changing systems & human error",
    tagline: "Why patterns decay, shocks spread, and analysts fool themselves.",
    topics: [adaptiveMarkets, networkContagion, ergodicity, behaviouralRandomness],
    orientation: {
      overview: "Markets are not passive datasets. Participants learn, compete, run out of capital, share exposures, and change the system while being measured. The analyst is inside that loop too, equipped with a mind that sees patterns faster than it counts the alternatives. This final tier links non-stationarity, contagion, multiplicative survival, and cognitive error into one discipline: treat every market law as conditional on a changing ecology and every discovery as guilty until it survives a clean test.",
      stakes: "A statistically elegant model can still fail because the environment changed, a shared constraint synchronised everyone, the path caused ruin before the average arrived, or the pattern existed only in the researcher's hindsight.",
      recognise: [
        { signal: "A once-profitable pattern weakens after discovery or crowding.", reach: "Use the adaptive-markets view and study the population and constraints around the strategy." },
        { signal: "A local loss spreads across unrelated assets or institutions.", reach: "Map the actual transmission network—obligations, holdings, or funding—not just correlations." },
        { signal: "The expected payoff looks good but repeated compounding feels dangerous.", reach: "Compare ensemble expectation with time-average growth and model the boundary of ruin." },
        { signal: "A chart pattern looks obvious after the event.", reach: "Freeze the information set, count the search process, and demand untouched out-of-sample evidence." },
      ],
      arc: [
        { stage: "Let the law evolve", topics: ["adaptive-markets"], point: "Treat predictability as an ecological resource that participants discover and consume." },
        { stage: "Let shocks travel", topics: ["network-contagion"], point: "Make constraints and exposures explicit so correlation becomes a mechanism rather than a label." },
        { stage: "Follow one path", topics: ["ergodicity"], point: "Replace the average across imagined worlds with the multiplicative experience of a surviving participant." },
        { stage: "Audit the observer", topics: ["behavioural-randomness"], point: "End by applying the strongest noise model to your own pattern-finding process." },
      ],
      outcomes: ["Explain why an edge can disappear without deciding it was always false.", "Distinguish correlation networks from causal exposure networks.", "Calculate why equal percentage gains and losses do not cancel under compounding.", "Design a discovery and validation process that accounts for hindsight, multiple testing, and holdout reuse."],
      inTheWild: [
        { system: "Systematic trading research", use: "Walk-forward tests, cost models, and degradation monitoring are needed because both the strategy and its competitors adapt." },
        { system: "Margin and collateral networks", use: "Falling prices trigger calls, forced sales, and further price falls, turning a balance-sheet rule into a market feedback loop." },
      ],
    },
  },
];

export const PRICE_PHASES: Phase[] = [
  {
    id: 1,
    name: "Describe the path",
    weeks: [1, 4],
    focus: [
      { week: 1, focus: "Random walks, conditional expectation, martingales", deliverable: "Annotate a price model with exactly what is and is not assumed unpredictable" },
      { week: 2, focus: "Lévy processes, jumps, heavy tails", deliverable: "Compare Gaussian and jump-model probabilities for one large move" },
      { week: 3, focus: "ARCH/GARCH and stochastic volatility", deliverable: "Fit the idea of random sign and persistent scale to a return series" },
      { week: 4, focus: "Rough volatility", deliverable: "Compare smooth, Brownian, and rough volatility paths across sampling scales" },
    ],
    anchor: "Build a one-page model card for returns: conditional mean, conditional scale, tail, jumps, horizon, and every assumption you are not entitled to make.",
  },
  {
    id: 2,
    name: "Open the market",
    weeks: [5, 8],
    focus: [
      { week: 5, focus: "Order books, spreads, queues", deliverable: "Separate transaction-price bounce from midpoint movement on sample quote data" },
      { week: 6, focus: "Order flow and square-root impact", deliverable: "Plot signed flow persistence beside return autocorrelation and explain the gap" },
      { week: 7, focus: "Hawkes processes", deliverable: "Diagram one event cluster as immigrant, children, and later descendants" },
      { week: 8, focus: "Agent-based markets", deliverable: "Specify a minimal heterogeneous market and name two facts it must match out of sample" },
    ],
    anchor: "Trace one large order from parent decision to child trades, book response, transient impact, and the event cascades it may trigger.",
  },
  {
    id: 3,
    name: "Measure without fooling yourself",
    weeks: [9, 12],
    focus: [
      { week: 9, focus: "Extreme value theory", deliverable: "Produce a threshold-stability plot and a return-level estimate with uncertainty" },
      { week: 10, focus: "Entropy and information flow", deliverable: "Compare correlation and mutual information on a nonlinear synthetic relationship" },
      { week: 11, focus: "Spectra and wavelets", deliverable: "Locate a transient event by both time and scale" },
      { week: 12, focus: "Scaling and random matrix theory", deliverable: "Compare a sample correlation spectrum with a noise benchmark" },
    ],
    anchor: "Write a signal audit: observed pattern, null model, estimator choices, uncertainty, multiple searches, and what evidence would make you abandon the claim.",
  },
  {
    id: 4,
    name: "Survive a changing system",
    weeks: [13, 16],
    focus: [
      { week: 13, focus: "Adaptive markets", deliverable: "Write the ecological conditions under which one strategy should live or die" },
      { week: 14, focus: "Networks and contagion", deliverable: "Map one shock across direct obligations and shared holdings" },
      { week: 15, focus: "Ergodicity and compounding", deliverable: "Contrast ensemble expected wealth with median and long-run log growth" },
      { week: 16, focus: "Behavioural finance and randomness", deliverable: "Pre-register a chart rule before exposing its holdout period" },
    ],
    anchor: "Perform a final red-team review of one market belief: mechanism, regime dependence, pathwise survival, search count, and untouched evidence.",
  },
];

export const PRICE_ALL_TOPICS = PRICE_TIERS.flatMap((tier) => tier.topics);
export const PRICE_TOPIC_BY_ID = new Map(
  PRICE_ALL_TOPICS.map((topic) => [topic.id, topic]),
);

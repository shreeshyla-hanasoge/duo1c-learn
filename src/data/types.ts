/**
 * The curriculum — a direct transcription of dsa-mastery-roadmap.md into
 * structured content. Tiers 0–5 are the topic list; `phases` is the 24-week
 * timeline. Every topic carries its own quiz bank so the game modes need no
 * separate content store.
 */

/**
 * `recall` = did you read it. `apply` = can you use it on a new input.
 * `judge` = can you choose between options under a constraint. Only the last
 * two count toward the quiz gate, so definitions alone never clear it.
 */
export type Difficulty = "recall" | "apply" | "judge";

/**
 * A small volume profile drawn above a quiz question, for questions that
 * ask the reader to READ a profile. Rows are given lowest price first.
 */
export interface QuizFigure {
  lo: number;
  step: number;
  bins: number[];
  /** Labelled horizontal lines, e.g. yesterday's VAH. Always drawn with text. */
  lines?: { price: number; label: string }[];
  /** Shade the 70% value area and mark the POC, computed from `bins`. */
  showValueArea?: boolean;
  caption?: string;
}

export interface QuizQ {
  q: string;
  figure?: QuizFigure;
  options: string[];
  /** Index into `options`. */
  answer: number;
  why: string;
  difficulty?: Difficulty;
  /**
   * Parallel to `options`: why each wrong choice is tempting. Naming the
   * attraction is where a misconception actually gets corrected — "not quite"
   * teaches nothing. Leave the correct index as "".
   */
  distractors?: string[];
}

export interface Insight {
  t: string;
  d: string;
}

/** Where this structure earns its keep in a system somebody actually ships. */
export interface RealWorldCase {
  system: string;
  /** `yours` cites this account's own repositories. */
  kind: "industry" | "yours";
  problem: string;
  applied: string;
  /** File path, RFC, or public source. */
  evidence?: string;
  impact?: string;
}

/** The long-form explainer. Optional — topics without it fall back to `insights`. */
export interface LearnDeep {
  /** One paragraph, no formalism. The mental model first. */
  intuition: string;
  mechanics: { heading: string; body: string }[];
  /** The argument for the bound, not the bound itself. */
  complexityDerivation: string;
  variants: { name: string; when: string; delta: string }[];
  tradeoffs: { vs: string; pick: string; because: string }[];
}

export interface LabTest {
  name: string;
  input: unknown[];
  expected: unknown;
  /** Hidden tests still run; their inputs are not shown before a pass. */
  hidden?: boolean;
}

/**
 * What a lab's complexity gate is allowed to demand.
 *
 * Declared here rather than in the engine because `types.ts` has no runtime
 * dependencies — `scripts/*.mts` import it under Node, where anything that
 * touches `Worker` will not load. `engine/lab/runner.ts` imports this type and
 * owns the thresholds.
 *
 * The names describe the BUDGET THE READER STATES, and the gate varies input
 * size to check it. Two of them need their scaling spelled out, because the
 * gate only ever has one knob:
 *
 *   O(n·m)  Both dimensions scale together with the gate parameter, so the
 *           product traces a quadratic curve. That is deliberate: pinning the
 *           second dimension would only catch an extra factor of n, whereas
 *           scaling both catches an extra factor in EITHER. Use it for edit
 *           distance and 0/1 knapsack. When the second dimension is genuinely
 *           fixed by the problem (k = 2 transactions, an 8-bit alphabet), the
 *           honest target is O(n) — say so in the prompt rather than reaching
 *           for this one.
 *   O(n^3)  Interval DP over all substrings. Cubic.
 */
export type ComplexityTarget =
  | "O(1)"
  | "O(log n)"
  | "O(n)"
  | "O(n log n)"
  | "O(n·m)"
  | "O(n^2)"
  | "O(n^3)";

export interface CodeLab {
  prompt: string;
  /** Must match the function the starter defines. */
  fnName: string;
  signature: string;
  starter: string;
  tests: LabTest[];
  /** Progressive. Revealing one costs XP. */
  hints: string[];
  solution: string;
  /**
   * Enforces the complexity budget rather than trusting it. `gen` is a
   * function-of-n source string evaluated in the worker, returning the
   * argument list for that size.
   */
  complexityGate?: {
    target: ComplexityTarget;
    gen: string;
    sizes: number[];
  };
}

/**
 * Tier 5's replacement for a code lab.
 *
 * A judgment tier has nothing to animate and nothing to code, but "state
 * your pick, the trade you are accepting, the failure mode you are signing
 * up for, and what you would measure" is exactly the design-review skill the
 * curriculum is built around — and it can be graded deterministically
 * without a backend, which a free-text answer cannot.
 *
 * The reader picks an approach, then selects every TRUE claim from a mixed
 * pool. Grading is exact-set: the pick must be right AND the selected claims
 * must be precisely the true ones. Partial credit would let somebody clear
 * the gate by ticking everything, which is the opposite of the skill.
 */
export interface DecisionCase {
  id: string;
  /** The situation, including the constraints that actually decide it. */
  scenario: string;
  /**
   * Candidate approaches. More than one is usually defensible in general;
   * exactly one is best under the stated constraints, which is the point.
   */
  options: {
    label: string;
    /** Why somebody would reach for this. Revealed after answering. */
    appeal: string;
  }[];
  /** Index into `options`. */
  best: number;
  /** Why that option wins under these constraints, specifically. */
  verdict: string;
  /**
   * The rubric pool. Every case carries claims on all three axes, some true
   * and some plausibly false. `axis` drives the grouping label in the UI.
   */
  claims: {
    text: string;
    axis: "trade" | "failure" | "measure";
    correct: boolean;
    /** Why it is true, or why it is tempting and wrong. Always shown. */
    note: string;
  }[];
}

export interface Topic {
  id: string;
  title: string;
  tier: number;
  /** Roadmap week this belongs to, when the timeline assigns one. */
  week?: number;
  summary: string;
  why: string;
  complexity?: string;
  /** Keys into the visualiser registry. */
  viz?: string[];
  insights: Insight[];
  pitfalls?: string[];
  quiz: QuizQ[];
  /* ---- Upgrade fields; see docs/content-upgrade-plan.md ---- */
  depth?: "core" | "deep";
  learn?: LearnDeep;
  realWorld?: RealWorldCase[];
  lab?: CodeLab;
  /** Tier 5 only — the judgment-tier stand-in for `lab`. */
  cases?: DecisionCase[];
}

export interface Tier {
  id: number;
  name: string;
  tagline: string;
  topics: Topic[];
}

export interface Phase {
  id: number;
  name: string;
  weeks: [number, number];
  focus: { week: number; focus: string; deliverable: string }[];
  anchor: string;
}

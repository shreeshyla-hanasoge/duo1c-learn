import type { FlowSpec } from "../kit/types";

/**
 * Rule engine — the film for `sd-rule-engine`.
 *
 * One stored rule, RSI crosses above 30, evaluated over three bars (29, 31,
 * 33) and then fed missing data. The evaluator owns meaning; the resolver
 * answers 'what is token X at this bar'.
 */
export const sdRuleEngine: FlowSpec = {
  id: "sd-rule-engine",
  kicker: "System design · M8",
  title: "One rule, bar by bar",
  nodes: [
    { id: "rule", role: "Stored as JSON", label: "Rule" },
    { id: "eval", role: "Owns the meaning", label: "Evaluator" },
    { id: "resolver", role: "Looks up values", label: "Resolver" },
    { id: "orders", role: "Acts on a yes", label: "Orders" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A rule is data: RSI crosses above 30. The engine reads it and answers yes or no.",
      facts: { rule: "RSI crosses_above 30" },
    },
    {
      seconds: 4.6,
      caption: "The evaluator loads the rule. It knows what the rule means, but not what RSI is.",
      move: { from: "rule", to: "eval", label: "load rule", tone: "request" },
      facts: { eval: "needs RSI, now and before" },
    },
    {
      seconds: 4.6,
      caption: "On bar one it asks the resolver one question: what is RSI at this bar?",
      move: { from: "eval", to: "resolver", label: "RSI at bar 1?", tone: "request" },
      facts: { resolver: "looking up" },
    },
    {
      seconds: 5,
      caption: "RSI is 29. A cross needs two bars and there is no earlier one, so the answer is false.",
      move: { from: "resolver", to: "eval", label: "RSI = 29", tone: "reply" },
      facts: { eval: "no previous bar: false" },
    },
    {
      seconds: 4.8,
      caption: "On bar two the resolver reports 31, and 29 came before it.",
      move: { from: "resolver", to: "eval", label: "RSI = 31 (was 29)", tone: "reply" },
      facts: { eval: "29 ≤ 30, 31 > 30: true" },
    },
    {
      seconds: 4.8,
      caption: "The rule fires once, and the order manager gets one signal.",
      move: { from: "eval", to: "orders", label: "signal: buy", tone: "commit" },
      facts: { orders: "1 signal" },
    },
    {
      seconds: 5.2,
      caption: "On bar three RSI is 33. It is above 30 but was already above, so it is not a cross.",
      move: { from: "resolver", to: "eval", label: "RSI = 33 (was 31)", tone: "reply" },
      facts: { eval: "already above: false", orders: "still 1 signal" },
    },
    {
      seconds: 5.2,
      caption: "A plain 'greater than' would fire on every bar. The cross fires on the change.",
      move: { from: "eval", to: "orders", label: "no signal", tone: "fault" },
      facts: { orders: "1 signal, not 3" },
    },
    {
      seconds: 5,
      caption: "On another bar the resolver has no value. A missing value must never read as true.",
      move: { from: "resolver", to: "eval", label: "no value", tone: "fault" },
      facts: { eval: "unknown: false" },
    },
    {
      seconds: 5.2,
      caption: "At start-up the same check runs early. If a rule cannot be resolved, it refuses to start.",
      move: { from: "eval", to: "rule", label: "cannot resolve: refuse", tone: "fault" },
      facts: { rule: "not started" },
    },
  ],
  takeaway: {
    line: "A rule is data, and a doubt is always false.",
    sub: "Keep meaning in one evaluator and lookup in a resolver, and fail closed.",
    seconds: 5.5,
  },
  lesson: {
    title: "A cross fires once",
    watchFor:
      "Watch the line under Evaluator over the three bars: 29 is false, 31 is true, 33 is false again. Then watch what it does when a value is missing.",
  },
};

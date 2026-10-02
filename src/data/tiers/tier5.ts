import type { Tier } from "../types.ts";
import { structureChoice } from "../topics/structure-choice.ts";
import { amortisedLatency } from "../topics/amortised-latency.ts";
import { approximation } from "../topics/approximation.ts";
import { stackComplexity } from "../topics/stack-complexity.ts";
import { concurrency } from "../topics/concurrency.ts";

export const tier5: Tier = {
  id: 5,
  name: "Judgment",
  tagline: "Not problems — the thing that makes you senior.",
  topics: [
    structureChoice,
    amortisedLatency,
    approximation,
    stackComplexity,
    concurrency,
  ],
  orientation: {
    overview:
      "There is nothing to animate in this tier and nothing to code. Every topic below is a decision you will be asked to defend out loud in a design review — where more than one answer is defensible in general, and exactly one is right under the constraints you were actually given. That gap, between knowing the structures and choosing among them under pressure, is the thing people mean when they call somebody senior. So the exercises here are not labs. You state your pick, the trade you are accepting, the failure mode you are signing up for, and what you would measure to know you were wrong.",
    stakes:
      "Everything below this tier can be looked up. This tier is what is left when the looking-up is done — and it is the part interviews and promotion committees are actually testing.",
    recognise: [
      {
        signal:
          "“It benchmarks fine, but users keep complaining that it is slow.”",
        reach:
          "Amortised versus worst-case. An average hides the p99, and the p99 is the only latency a human being ever notices.",
      },
      {
        signal: "“We need it to be exact.”",
        reach:
          "Ask what the error budget genuinely is. Exactness is a purchase, and quite often nobody has checked the price or who is paying it.",
      },
      {
        signal: "“It works fine on my machine with one user.”",
        reach:
          "Concurrent access. Every structure in the previous five tiers has a different cost, and sometimes a different answer, once two things touch it at once.",
      },
      {
        signal: "“The complexity is fine, it is O(n).”",
        reach:
          "Check what is on the stack and what is being allocated. Recursion depth and memory traffic do not appear in the time bound and will still take the process down.",
      },
    ],
    arc: [
      {
        stage: "Choosing, and being able to say why",
        topics: ["structure-choice"],
        point:
          "The core skill, isolated: given constraints, pick a structure and defend it against the two next-best options. Everything else in this tier is a specific way that defence goes wrong.",
      },
      {
        stage: "What users actually feel",
        topics: ["amortised-latency"],
        point:
          "Amortised O(1) means the average is cheap, not that no single call is expensive. The occasional expensive call is the one that lands on a real person at the worst moment.",
      },
      {
        stage: "Buying speed with accuracy",
        topics: ["approximation"],
        point:
          "Approximation is only an engineering decision when the error is bounded and someone has agreed to the bound. Otherwise it is a bug you have not found yet.",
      },
      {
        stage: "The costs that never make it into the estimate",
        topics: ["stack-complexity"],
        point:
          "Recursion depth, allocation pressure, cache behaviour. None of them appear in a Big-O expression, and all of them decide whether the thing survives production.",
      },
      {
        stage: "Once more than one thing touches it",
        topics: ["concurrency"],
        point:
          "Every structure you have learned so far assumed a single reader and a single writer. Removing that assumption changes the cost of some of them and the correctness of others.",
      },
    ],
    outcomes: [
      "Defend a structure choice against the two next-best options, in terms of the stated constraints.",
      "Say what you would measure to find out your choice was wrong — before shipping it.",
      "Argue about latency using p99 rather than an average, and explain why the distinction matters here.",
      "Name the failure mode you are accepting, instead of claiming there is not one.",
    ],
    inTheWild: [
      {
        system: "Design reviews",
        use: "The question is almost never “does it work”. It is “what did you give up, and what happens on the day that matters”.",
      },
      {
        system: "Incident postmortems",
        use: "Most read as this tier written in hindsight — an amortised cost that landed all at once, or an approximation whose error nobody had bounded.",
      },
      {
        system: "System design interviews",
        use: "The structures are assumed. What is being graded is whether you can name the trade before the interviewer does.",
      },
    ],
  },
};

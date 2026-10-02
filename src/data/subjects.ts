import {
  ALL_TOPICS,
  PHASES,
  TIERS,
  TOPIC_BY_ID,
  type Phase,
  type Tier,
  type Topic,
} from "./curriculum.ts";
import { GLOSSARY, type Glossary } from "./glossary.ts";
import { DSA_BADGES, TRADING_BADGES } from "./badges.ts";
import type { BadgeDef } from "./progress-model.ts";
import * as trading from "./trading/curriculum.ts";

/**
 * The platform hosts SUBJECTS. DSA was the first; Trading concepts the second.
 *
 * Everything user-facing and everything persisted is keyed by subject id —
 * routes (`#/dsa/path`), the progress store, and the DynamoDB item. To add a
 * subject: build its `Tier[]` the way `curriculum.ts` does, give it a badge
 * set, a glossary and its wording, then append an entry here.
 *
 * Imports carry `.ts` extensions so the Node audit scripts can load this file
 * directly and audit every subject, not just the first.
 */

/**
 * The words a subject uses for itself. DSA's views were written with "tier",
 * "complexity" and "your repos" baked in; a trading course has modules,
 * evidence and your own platform instead.
 */
export interface SubjectCopy {
  /** What one group of topics is called: "Tier", "Module". */
  unit: string;
  /** Badge prefix: "T" renders T0, "M" renders M1. */
  unitShort: string;
  /** Path page subtitle. */
  pathIntro: string;
  /** Dashboard heading before anything is mastered. */
  heroStart: string;
  heroBlurb: string;
  /** Dashboard heading over the list of units. */
  unitsTitle: string;
  unitsHint: string;
  /** Heading and hint over `learn.complexityDerivation`. */
  derivationTitle: string;
  derivationHint: string;
  /** Real-world hint when some cases are `kind: "yours"`. */
  yoursHint: (n: number) => string;
  /** Under the activity strip. */
  activityNote: string;
}

export interface Subject {
  id: string;
  /** Full name, used in headings. */
  name: string;
  /** Short label for chips and the subject switcher. */
  short: string;
  tagline: string;
  tiers: Tier[];
  /** A week-by-week timeline. Empty hides the "By week" view. */
  phases: Phase[];
  topics: Topic[];
  topicById: Map<string, Topic>;
  badges: BadgeDef[];
  glossary: Glossary;
  copy: SubjectCopy;
}

export const SUBJECTS: Subject[] = [
  {
    id: "dsa",
    name: "Data Structures & Algorithms",
    short: "DSA",
    tagline: "24 weeks · 6 tiers · 30 animated algorithms",
    tiers: TIERS,
    phases: PHASES,
    topics: ALL_TOPICS,
    topicById: TOPIC_BY_ID,
    badges: DSA_BADGES,
    glossary: GLOSSARY,
    copy: {
      unit: "Tier",
      unitShort: "T",
      pathIntro:
        "Six tiers of topics, or the same material laid out as the 24-week timeline.",
      heroStart: "Start with the foundations",
      heroBlurb:
        "Learn it animated, drive the algorithm yourself, then prove it under quiz conditions. A topic only counts when all three are done.",
      unitsTitle: "The six tiers",
      unitsHint: "each tier unlocks at half the previous one",
      derivationTitle: "Why that complexity",
      derivationHint: "the argument, not the answer",
      yoursHint: (n) => `${n} from your own repos`,
      activityNote:
        "Darker means more XP that day. The roadmap asks for 60–90 minutes, five days a week — the gaps are the honest part.",
    },
  },
  {
    id: "trading",
    name: "Trading concepts",
    short: "Trading",
    tagline: trading.TAGLINE,
    tiers: trading.MODULES,
    phases: [],
    topics: trading.ALL_TOPICS,
    topicById: trading.TOPIC_BY_ID,
    badges: TRADING_BADGES,
    glossary: trading.GLOSSARY,
    copy: {
      unit: "Module",
      unitShort: "M",
      pathIntro:
        "Each module is one tool, taught until you can read it, compute it and test it. Education, not advice.",
      heroStart: "Start with the auction",
      heroBlurb:
        "Watch the profile build on real-shaped NSE and MCX sessions, compute it yourself in code, then prove you can read it. A topic only counts when all three are done.",
      unitsTitle: "Modules",
      unitsHint: "more modules follow; each unlocks at half the previous one",
      derivationTitle: "What the evidence says",
      derivationHint: "sources, and what nobody has tested",
      yoursHint: (n) => `${n} from your own platform`,
      activityNote:
        "Darker means more XP that day. Short, regular sessions beat long irregular ones.",
    },
  },
];

export const DEFAULT_SUBJECT_ID = "dsa";

const BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));

export function getSubject(id: string): Subject {
  return BY_ID.get(id) ?? SUBJECTS[0];
}

export function isSubjectId(id: string): boolean {
  return BY_ID.has(id);
}

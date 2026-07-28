import {
  ALL_TOPICS,
  PHASES,
  TIERS,
  TOPIC_BY_ID,
  type Phase,
  type Tier,
  type Topic,
} from "./curriculum";

/**
 * The platform hosts SUBJECTS; DSA is the first one.
 *
 * Everything user-facing and everything persisted is keyed by subject id —
 * routes (`#/dsa/path`), the progress store, and the DynamoDB sort key. That
 * boundary is the expensive thing to retrofit, so it exists from day one even
 * though only one subject ships today.
 *
 * To add a subject: build its `Tier[]`/`Phase[]` the way `curriculum.ts` does,
 * then append an entry here. Nothing else has to change.
 */
export interface Subject {
  id: string;
  /** Full name, used in headings. */
  name: string;
  /** Short label for chips and the subject switcher. */
  short: string;
  tagline: string;
  tiers: Tier[];
  phases: Phase[];
  topics: Topic[];
  topicById: Map<string, Topic>;
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

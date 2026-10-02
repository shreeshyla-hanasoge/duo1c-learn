/**
 * The progress SHAPES and the pure rules over them.
 *
 * Lives under `data/` rather than in the store because badges are now a
 * property of each subject (`subjects.ts`), and a badge's test needs these
 * helpers. The store imports `subjects.ts`, so if the helpers stayed in the
 * store the two modules would import each other. This file has no runtime
 * dependencies at all, which also lets the Node audit scripts load it.
 */
import type { Tier, Topic } from "./types.ts";

export interface TopicProgress {
  learned: boolean;
  solved: boolean;
  /** Best quiz score as a 0–1 fraction. */
  quizBest: number;
  quizAttempts: number;
  masteredAt?: string;
}

export interface ArenaResult {
  date: string;
  score: number;
  total: number;
  seconds: number;
}

export interface SubjectProgress {
  topics: Record<string, TopicProgress>;
  badges: string[];
  arena: ArenaResult[];
}

/** Just the parts of a Subject the progress rules read. */
export interface SubjectShape {
  tiers: Tier[];
  topics: Topic[];
}

export const MASTERY_QUIZ_THRESHOLD = 0.8;

export function isMastered(p?: TopicProgress): boolean {
  return Boolean(
    p && p.learned && p.solved && p.quizBest >= MASTERY_QUIZ_THRESHOLD,
  );
}

export function masteredCount(sp: SubjectProgress): number {
  return Object.values(sp.topics).filter(isMastered).length;
}

export function tierMastered(
  sp: SubjectProgress,
  subject: SubjectShape,
  tier: number,
): boolean {
  const topics = subject.tiers.find((t) => t.id === tier)?.topics ?? [];
  return topics.length > 0 && topics.every((t) => isMastered(sp.topics[t.id]));
}

export interface BadgeDef {
  id: string;
  name: string;
  hint: string;
  test: (ctx: {
    sp: SubjectProgress;
    subject: SubjectShape;
    streak: number;
  }) => boolean;
}

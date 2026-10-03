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

/* ---- Merging (monotone: max / OR / union) ------------------------- *
 * Lives here, not in lib/sync.ts, because the progress store needs the
 * same merge to fold a retired subject id into the one that replaced it. */

export function mergeTopic(a?: TopicProgress, b?: TopicProgress): TopicProgress {
  if (!a) return b!;
  if (!b) return a;
  const masteredAt =
    a.masteredAt && b.masteredAt
      ? a.masteredAt < b.masteredAt
        ? a.masteredAt
        : b.masteredAt
      : (a.masteredAt ?? b.masteredAt);
  return {
    learned: a.learned || b.learned,
    solved: a.solved || b.solved,
    quizBest: Math.max(a.quizBest, b.quizBest),
    quizAttempts: Math.max(a.quizAttempts, b.quizAttempts),
    ...(masteredAt ? { masteredAt } : {}),
  };
}

function mergeArena(a: ArenaResult[], b: ArenaResult[]): ArenaResult[] {
  const seen = new Set<string>();
  const out: ArenaResult[] = [];
  for (const r of [...a, ...b]) {
    const key = `${r.date}|${r.score}|${r.total}|${r.seconds}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.sort((x, y) => x.date.localeCompare(y.date)).slice(-30);
}

export function mergeSubject(a: SubjectProgress, b: SubjectProgress): SubjectProgress {
  const topics: Record<string, TopicProgress> = {};
  for (const id of new Set([...Object.keys(a.topics), ...Object.keys(b.topics)])) {
    topics[id] = mergeTopic(a.topics[id], b.topics[id]);
  }
  return {
    topics,
    badges: [...new Set([...a.badges, ...b.badges])],
    arena: mergeArena(a.arena, b.arena),
  };
}

/**
 * Subject ids that were retired by folding them into another subject.
 * Price Dynamics shipped as a subject of its own and became modules 2–5 of
 * Trading concepts; its topic ids are unchanged, so its progress merges in
 * cleanly. Old `#/price-dynamics/…` links resolve through this too.
 */
export const SUBJECT_ALIASES: Record<string, string> = {
  "price-dynamics": "trading",
};

/** Folds every aliased subject's progress into its replacement. Pure. */
export function foldSubjectAliases(
  subjects: Record<string, SubjectProgress>,
): Record<string, SubjectProgress> {
  if (!Object.keys(subjects).some((id) => id in SUBJECT_ALIASES)) return subjects;
  const out: Record<string, SubjectProgress> = {};
  for (const [id, sp] of Object.entries(subjects)) {
    const target = SUBJECT_ALIASES[id] ?? id;
    out[target] = out[target] ? mergeSubject(out[target], sp) : sp;
  }
  return out;
}

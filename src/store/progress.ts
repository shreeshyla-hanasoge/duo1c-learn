import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SUBJECT_ID, getSubject, type Subject } from "../data/subjects";

/* ------------------------------------------------------------------ *
 * Progression model
 *
 * A topic passes through three independent gates — learn, solve, quiz —
 * and is "mastered" only when all three are cleared. Keeping them
 * independent means the reader can attack a topic from whichever angle
 * suits them and still see honest progress.
 *
 * XP, streak and the activity strip are PLATFORM-level: they answer "did
 * you practise today", which is subject-agnostic. Gates, badges and arena
 * runs are PER-SUBJECT, because they describe mastery of specific
 * material. That split is also exactly how the row is stored in DynamoDB.
 * ------------------------------------------------------------------ */

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

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/** The slice that travels to the backend. Theme and sync state stay local. */
export interface SyncPayload {
  xp: number;
  streak: number;
  lastActive: string | null;
  daily: Record<string, number>;
  subjects: Record<string, SubjectProgress>;
}

export interface ProgressState extends SyncPayload {
  theme: "dark" | "light";
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;

  markLearned: (subjectId: string, topicId: string) => number;
  markSolved: (subjectId: string, topicId: string) => number;
  recordQuiz: (
    subjectId: string,
    topicId: string,
    correct: number,
    total: number,
  ) => number;
  recordArena: (subjectId: string, result: Omit<ArenaResult, "date">) => number;
  toggleTheme: () => void;
  reset: () => void;

  /** Sync plumbing — see lib/sync.ts. */
  exportPayload: () => SyncPayload;
  applyPayload: (payload: SyncPayload) => void;
  setSync: (status: SyncStatus, error?: string | null) => void;
}

export const XP = {
  learn: 20,
  solve: 35,
  quizPerCorrect: 10,
  quizPerfectBonus: 25,
  masteryBonus: 60,
  arenaPerCorrect: 15,
} as const;

const MASTERY_QUIZ_THRESHOLD = 0.8;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
}

/* ---- Levels ------------------------------------------------------- *
 * Gently superlinear: each level costs a little more than the last, so
 * early levels arrive quickly and later ones still mean something.    */

export function xpForLevel(level: number): number {
  return Math.round(120 * (level - 1) + 40 * (level - 1) * (level - 2));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number): {
  level: number;
  into: number;
  need: number;
  pct: number;
} {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = xp - base;
  const need = next - base;
  return { level, into, need, pct: need === 0 ? 1 : into / need };
}

export const RANKS = [
  "Novice",
  "Apprentice",
  "Practitioner",
  "Adept",
  "Specialist",
  "Architect",
  "Master",
  "Grandmaster",
] as const;

export function rankFor(level: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 3))];
}

/* ---- Subject helpers ---------------------------------------------- */

export const emptyTopic = (): TopicProgress => ({
  learned: false,
  solved: false,
  quizBest: 0,
  quizAttempts: 0,
});

export const emptySubject = (): SubjectProgress => ({
  topics: {},
  badges: [],
  arena: [],
});

export function subjectOf(
  s: Pick<ProgressState, "subjects">,
  subjectId: string,
): SubjectProgress {
  return s.subjects[subjectId] ?? emptySubject();
}

export function isMastered(p?: TopicProgress): boolean {
  return Boolean(
    p && p.learned && p.solved && p.quizBest >= MASTERY_QUIZ_THRESHOLD,
  );
}

export function masteredCount(sp: SubjectProgress): number {
  return Object.values(sp.topics).filter(isMastered).length;
}

function tierMastered(
  sp: SubjectProgress,
  subject: Subject,
  tier: number,
): boolean {
  const topics = subject.tiers.find((t) => t.id === tier)?.topics ?? [];
  return topics.length > 0 && topics.every((t) => isMastered(sp.topics[t.id]));
}

/** A tier opens once half the previous tier has been touched. */
export function tierUnlocked(
  sp: SubjectProgress,
  subject: Subject,
  tier: number,
): boolean {
  if (tier === 0) return true;
  const prev = subject.tiers.find((t) => t.id === tier - 1)?.topics ?? [];
  if (prev.length === 0) return true;
  const started = prev.filter((t) => {
    const p = sp.topics[t.id];
    return p && (p.learned || p.solved || p.quizAttempts > 0);
  }).length;
  return started >= Math.ceil(prev.length / 2);
}

export function tierStats(sp: SubjectProgress, subject: Subject, tier: number) {
  const topics = subject.tiers.find((t) => t.id === tier)?.topics ?? [];
  const mastered = topics.filter((t) => isMastered(sp.topics[t.id])).length;
  const started = topics.filter((t) => {
    const p = sp.topics[t.id];
    return p && (p.learned || p.solved || p.quizAttempts > 0);
  }).length;
  return {
    mastered,
    started,
    total: topics.length,
    pct: topics.length ? mastered / topics.length : 0,
  };
}

export function overallStats(sp: SubjectProgress, subject: Subject) {
  const mastered = masteredCount(sp);
  const started = Object.values(sp.topics).filter(
    (t) => t.learned || t.solved || t.quizAttempts > 0,
  ).length;
  const quizzed = Object.values(sp.topics).filter((t) => t.quizAttempts > 0);
  const accuracy =
    quizzed.length === 0
      ? 0
      : quizzed.reduce((sum, t) => sum + t.quizBest, 0) / quizzed.length;
  const total = subject.topics.length;
  return {
    mastered,
    started,
    total,
    accuracy,
    pct: total ? mastered / total : 0,
  };
}

/* ---- Badges ------------------------------------------------------- */

export interface BadgeDef {
  id: string;
  name: string;
  hint: string;
  test: (ctx: {
    sp: SubjectProgress;
    subject: Subject;
    streak: number;
  }) => boolean;
}

export const BADGES: BadgeDef[] = [
  {
    id: "first-blood",
    name: "First Blood",
    hint: "Master your first topic",
    test: ({ sp }) => masteredCount(sp) >= 1,
  },
  {
    id: "foundations",
    name: "Reflexes",
    hint: "Master every Tier 0 topic",
    test: ({ sp, subject }) => tierMastered(sp, subject, 0),
  },
  {
    id: "structures",
    name: "Toolmaker",
    hint: "Master every Tier 1 topic",
    test: ({ sp, subject }) => tierMastered(sp, subject, 1),
  },
  {
    id: "graphs",
    name: "Cartographer",
    hint: "Master every Tier 2 topic",
    test: ({ sp, subject }) => tierMastered(sp, subject, 2),
  },
  {
    id: "dp",
    name: "Optimal Substructure",
    hint: "Master every Tier 3 topic",
    test: ({ sp, subject }) => tierMastered(sp, subject, 3),
  },
  {
    id: "advanced",
    name: "Deep Cuts",
    hint: "Master every Tier 4 topic",
    test: ({ sp, subject }) => tierMastered(sp, subject, 4),
  },
  {
    id: "judgment",
    name: "Judgment",
    hint: "Master every Tier 5 topic",
    test: ({ sp, subject }) => tierMastered(sp, subject, 5),
  },
  {
    id: "flawless",
    name: "Flawless",
    hint: "Score 100% on any quiz",
    test: ({ sp }) => Object.values(sp.topics).some((t) => t.quizBest === 1),
  },
  {
    id: "streak-7",
    name: "Seven Days",
    hint: "Practise 7 days in a row",
    test: ({ streak }) => streak >= 7,
  },
  {
    id: "streak-30",
    name: "Consistency",
    hint: "Practise 30 days in a row",
    test: ({ streak }) => streak >= 30,
  },
  {
    id: "arena-10",
    name: "Gauntlet",
    hint: "Score 10+ in a single Arena run",
    test: ({ sp }) => sp.arena.some((a) => a.score >= 10),
  },
  {
    id: "halfway",
    name: "Halfway",
    hint: "Master half of all topics",
    test: ({ sp, subject }) =>
      masteredCount(sp) >= Math.ceil(subject.topics.length / 2),
  },
  {
    id: "complete",
    name: "Shodan",
    hint: "Master every topic in this subject",
    test: ({ sp, subject }) => masteredCount(sp) === subject.topics.length,
  },
];

/* ---- Store -------------------------------------------------------- */

/**
 * A factory, not a shared constant: `daily` and `subjects` are objects, and a
 * module-level literal would hand every reset the *same* references. Nothing
 * mutates them today, but one `state.subjects[id] = …` anywhere would then
 * poison the reset baseline for the rest of the session.
 */
const makeInitial = () => ({
  xp: 0,
  streak: 0,
  lastActive: null as string | null,
  daily: {} as Record<string, number>,
  subjects: {} as Record<string, SubjectProgress>,
  theme: "dark" as const,
  syncStatus: "idle" as SyncStatus,
  lastSyncedAt: null as string | null,
  syncError: null as string | null,
});

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => {
      /** Applies XP, streak, daily activity and badge checks in one place. */
      const commit = (
        subjectId: string,
        gained: number,
        mutate?: (sp: SubjectProgress, draft: ProgressState) => void,
      ): number => {
        let total = gained;
        set((s) => {
          const today = todayISO();
          let streak = s.streak;
          if (s.lastActive === null) streak = 1;
          else {
            const gap = daysBetween(s.lastActive, today);
            if (gap === 1) streak = s.streak + 1;
            else if (gap > 1) streak = 1;
            else streak = Math.max(1, s.streak);
          }

          const prev = subjectOf(s, subjectId);
          const sp: SubjectProgress = {
            topics: { ...prev.topics },
            badges: [...prev.badges],
            arena: [...prev.arena],
          };

          const draft: ProgressState = {
            ...s,
            xp: s.xp + gained,
            streak,
            lastActive: today,
            daily: { ...s.daily, [today]: (s.daily[today] ?? 0) + gained },
          };

          mutate?.(sp, draft);

          const subject = getSubject(subjectId);
          const earned = BADGES.filter(
            (b) =>
              !sp.badges.includes(b.id) &&
              b.test({ sp, subject, streak: draft.streak }),
          ).map((b) => b.id);
          if (earned.length) sp.badges = [...sp.badges, ...earned];

          total = draft.xp - s.xp;
          return { ...draft, subjects: { ...s.subjects, [subjectId]: sp } };
        });
        return total;
      };

      /** Applies the mastery bonus if this action completed all three gates. */
      const withMastery = (
        subjectId: string,
        topicId: string,
        base: number,
        mutate: (p: TopicProgress) => void,
      ) => {
        const before = isMastered(subjectOf(get(), subjectId).topics[topicId]);
        return commit(subjectId, base, (sp, draft) => {
          const p = { ...(sp.topics[topicId] ?? emptyTopic()) };
          mutate(p);
          if (!before && isMastered(p)) {
            p.masteredAt = todayISO();
            draft.xp += XP.masteryBonus;
            draft.daily[todayISO()] =
              (draft.daily[todayISO()] ?? 0) + XP.masteryBonus;
          }
          sp.topics[topicId] = p;
        });
      };

      return {
        ...makeInitial(),

        markLearned: (subjectId, topicId) => {
          if (subjectOf(get(), subjectId).topics[topicId]?.learned) return 0;
          return withMastery(subjectId, topicId, XP.learn, (p) => {
            p.learned = true;
          });
        },

        markSolved: (subjectId, topicId) => {
          if (subjectOf(get(), subjectId).topics[topicId]?.solved) return 0;
          return withMastery(subjectId, topicId, XP.solve, (p) => {
            p.solved = true;
          });
        },

        recordQuiz: (subjectId, topicId, correct, total) => {
          const prev = subjectOf(get(), subjectId).topics[topicId];
          const score = total === 0 ? 0 : correct / total;
          // XP is only paid for improvement, so re-taking a quiz to farm
          // points does not work — but re-taking to improve is rewarded.
          const alreadyCredited = Math.round((prev?.quizBest ?? 0) * total);
          const newlyCredited = Math.max(0, correct - alreadyCredited);
          let base = newlyCredited * XP.quizPerCorrect;
          if (score === 1 && (prev?.quizBest ?? 0) < 1)
            base += XP.quizPerfectBonus;

          return withMastery(subjectId, topicId, base, (p) => {
            p.quizBest = Math.max(p.quizBest, score);
            p.quizAttempts += 1;
          });
        },

        recordArena: (subjectId, result) => {
          const gained = result.score * XP.arenaPerCorrect;
          return commit(subjectId, gained, (sp) => {
            sp.arena = [...sp.arena, { ...result, date: todayISO() }].slice(
              -30,
            );
          });
        },

        toggleTheme: () =>
          set((s) => {
            const theme = s.theme === "dark" ? "light" : "dark";
            document.documentElement.dataset.theme = theme;
            return { theme };
          }),

        reset: () => set({ ...makeInitial(), theme: get().theme }),

        exportPayload: () => {
          const s = get();
          return {
            xp: s.xp,
            streak: s.streak,
            lastActive: s.lastActive,
            daily: s.daily,
            subjects: s.subjects,
          };
        },

        applyPayload: (payload) =>
          set({
            xp: payload.xp,
            streak: payload.streak,
            lastActive: payload.lastActive,
            daily: payload.daily,
            subjects: payload.subjects,
          }),

        setSync: (status, error = null) =>
          set({
            syncStatus: status,
            syncError: error,
            lastSyncedAt:
              status === "synced"
                ? new Date().toISOString()
                : get().lastSyncedAt,
          }),
      };
    },
    {
      name: "learn-duo1c-progress",
      version: 2,
      migrate: (persisted, version) => {
        // v1 was single-subject: { topics, badges, arena } at the root.
        if (version < 2 && persisted && typeof persisted === "object") {
          const old = persisted as Record<string, unknown>;
          const { topics, badges, arena, ...rest } = old;
          return {
            ...rest,
            subjects: {
              [DEFAULT_SUBJECT_ID]: {
                topics: (topics as SubjectProgress["topics"]) ?? {},
                badges: (badges as string[]) ?? [],
                arena: (arena as ArenaResult[]) ?? [],
              },
            },
          } as unknown as ProgressState;
        }
        return persisted as ProgressState;
      },
      // Sync status is runtime-only; never restore a stale "syncing".
      partialize: (s) =>
        ({
          xp: s.xp,
          streak: s.streak,
          lastActive: s.lastActive,
          daily: s.daily,
          subjects: s.subjects,
          theme: s.theme,
        }) as ProgressState,
    },
  ),
);

/* ---- Selectors ---------------------------------------------------- */

export function useSubjectProgress(subjectId: string): SubjectProgress {
  return useProgress((s) => s.subjects[subjectId]) ?? emptySubject();
}

export function useTopicProgress(
  subjectId: string,
  topicId: string,
): TopicProgress | undefined {
  return useProgress((s) => s.subjects[subjectId]?.topics[topicId]);
}

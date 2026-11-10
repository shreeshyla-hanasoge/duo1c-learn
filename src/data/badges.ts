/**
 * Badge sets, one per subject.
 *
 * Badge ids are what gets persisted and synced (`subjects[id].badges`), and
 * the sync merge is a set union — so an id, once shipped, must never be
 * renamed or reused for a different meaning. The DSA list below is the one
 * that shipped when badges were global; it is unchanged.
 */
import {
  masteredCount,
  tierMastered,
  type BadgeDef,
} from "./progress-model.ts";

/** Badges any subject can carry: they do not depend on its structure. */
const common = {
  firstBlood: {
    id: "first-blood",
    name: "First Blood",
    hint: "Master your first topic",
    test: ({ sp }) => masteredCount(sp) >= 1,
  },
  flawless: {
    id: "flawless",
    name: "Flawless",
    hint: "Score 100% on any quiz",
    test: ({ sp }) => Object.values(sp.topics).some((t) => t.quizBest === 1),
  },
  streak7: {
    id: "streak-7",
    name: "Seven Days",
    hint: "Practise 7 days in a row",
    test: ({ streak }) => streak >= 7,
  },
  streak30: {
    id: "streak-30",
    name: "Consistency",
    hint: "Practise 30 days in a row",
    test: ({ streak }) => streak >= 30,
  },
  arena10: {
    id: "arena-10",
    name: "Gauntlet",
    hint: "Score 10+ in a single Arena run",
    test: ({ sp }) => sp.arena.some((a) => a.score >= 10),
  },
  halfway: {
    id: "halfway",
    name: "Halfway",
    hint: "Master half of all topics",
    test: ({ sp, subject }) =>
      masteredCount(sp) >= Math.ceil(subject.topics.length / 2),
  },
  complete: {
    id: "complete",
    name: "Shodan",
    hint: "Master every topic in this subject",
    test: ({ sp, subject }) => masteredCount(sp) === subject.topics.length,
  },
} satisfies Record<string, BadgeDef>;

function unitBadge(
  id: string,
  name: string,
  hint: string,
  tier: number,
): BadgeDef {
  return {
    id,
    name,
    hint,
    test: ({ sp, subject }) => tierMastered(sp, subject, tier),
  };
}

export const DSA_BADGES: BadgeDef[] = [
  common.firstBlood,
  unitBadge("foundations", "Reflexes", "Master every Tier 0 topic", 0),
  unitBadge("structures", "Toolmaker", "Master every Tier 1 topic", 1),
  unitBadge("graphs", "Cartographer", "Master every Tier 2 topic", 2),
  unitBadge("dp", "Optimal Substructure", "Master every Tier 3 topic", 3),
  unitBadge("advanced", "Deep Cuts", "Master every Tier 4 topic", 4),
  unitBadge("judgment", "Judgment", "Master every Tier 5 topic", 5),
  common.flawless,
  common.streak7,
  common.streak30,
  common.arena10,
  common.halfway,
  common.complete,
];

/**
 * Trading badges. Module badges are added here as modules ship; the id names
 * the module, never its position, so reordering modules cannot change what a
 * stored badge means.
 */
export const TRADING_BADGES: BadgeDef[] = [
  common.firstBlood,
  unitBadge(
    "volume-profile",
    "Value Reader",
    "Master every Volume Profile topic",
    1,
  ),
  unitBadge("price-language", "Fluent in Randomness", "Master every M2 topic", 2),
  unitBadge("price-mechanics", "Under the Hood", "Master every M3 topic", 3),
  unitBadge("price-signal", "Signal Hunter", "Master every M4 topic", 4),
  unitBadge("price-adaptive", "Adaptive", "Master every M5 topic", 5),
  {
    id: "lab-hands",
    name: "By Hand and in Code",
    hint: "Pass every Volume Profile code lab",
    test: ({ sp, subject }) => {
      const labs = subject.topics.filter((t) => t.tier === 1 && t.lab);
      return labs.length > 0 && labs.every((t) => sp.topics[t.id]?.solved);
    },
  },
  common.flawless,
  common.streak7,
  common.streak30,
  common.arena10,
  common.halfway,
  common.complete,
];


/**
 * System design badges. One per module, named for what the reader can now
 * do. Ids name the module, never its position. (The subject first shipped
 * with six modules; when it grew to ten the modules were regrouped, so the
 * six original ids were retired rather than given new meanings.)
 */
export const SYSTEMS_BADGES: BadgeDef[] = [
  common.firstBlood,
  unitBadge("sd-blocks", "Scales on Paper", "Master every M1 topic", 1),
  unitBadge("sd-storage", "Reads the Index", "Master every M2 topic", 2),
  unitBadge("sd-distributed", "Quorum Reached", "Master every M3 topic", 3),
  unitBadge("sd-coordination", "Elected Leader", "Master every M4 topic", 4),
  unitBadge("sd-streams", "At Least Once", "Master every M5 topic", 5),
  unitBadge("sd-algorithms", "Probably Correct", "Master every M6 topic", 6),
  unitBadge("sd-ops", "Calm on the Bad Day", "Master every M7 topic", 7),
  unitBadge("sd-architecture", "Draws the Boundary", "Master every M8 topic", 8),
  unitBadge("sd-trading", "Reconciled", "Master every M9 topic", 9),
  unitBadge("sd-designs", "Defends the Trade-off", "Master every M10 topic", 10),
  common.flawless,
  common.streak7,
  common.streak30,
  common.arena10,
  common.halfway,
  common.complete,
];

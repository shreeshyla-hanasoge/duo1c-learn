/**
 * Trading concepts — the second subject.
 *
 * A MODULE is a `Tier` in the shared shape, so every view, gate, badge and
 * the Arena work unchanged. Module ids start at 1 so the badge reads "M1";
 * `tierUnlocked` treats a module with no predecessor as open.
 *
 * To add a module: create `modules/<name>.ts` (a `Tier` whose topics are
 * one file each under `topics/`), append it to MODULES, and add a badge for
 * it in `../badges.ts`. Nothing else changes.
 */
import type { Tier, Topic } from "../types.ts";
import { volumeProfile } from "./modules/volume-profile.ts";

export { GLOSSARY } from "./glossary.ts";

export const MODULES: Tier[] = [volumeProfile];

export const TAGLINE = "Volume Profile first · Market structure, VWAP and options basics to follow";

export const ALL_TOPICS: Topic[] = MODULES.flatMap((m) => m.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

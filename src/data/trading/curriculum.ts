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
import type { Phase, Tier, Topic } from "../types.ts";
import { volumeProfile } from "./modules/volume-profile.ts";
import { PRICE_PHASES, PRICE_TIERS } from "./price-dynamics/curriculum.ts";

export { GLOSSARY } from "./glossary.ts";

/**
 * M1 Volume Profile, then M2–M5 Price Dynamics & Market Randomness (which
 * shipped first as a subject of its own; its four tiers are these four
 * modules, and its progress is folded in — see SUBJECT_ALIASES).
 */
export const MODULES: Tier[] = [volumeProfile, ...PRICE_TIERS];

/**
 * The week-by-week plan. Only Price Dynamics has one (16 weeks, M2–M5);
 * Volume Profile is self-paced, so it does not appear under "By week".
 */
export const PHASES: Phase[] = PRICE_PHASES;

export const RESOURCES = [
  {
    title: "Mind Over Markets / Markets in Profile",
    author: "James F. Dalton and collaborators",
    note: "The practitioner source for auction market theory, day types and opening types (M1).",
  },
  {
    title: "The (Mis)behavior of Markets",
    author: "Benoit Mandelbrot and Richard Hudson",
    note: "The intuitive entry point to scaling, fat tails, and the fractal view.",
  },
  {
    title: "Trades, Quotes and Prices",
    author: "Jean-Philippe Bouchaud and collaborators",
    note: "The main bridge between market microstructure and econophysics.",
  },
  {
    title: "Statistical Consequences of Fat Tails",
    author: "Nassim Nicholas Taleb",
    note: "A demanding treatment of what heavy tails do to statistical reasoning.",
  },
  {
    title: "Adaptive Markets",
    author: "Andrew W. Lo",
    note: "The evolutionary account of why market patterns appear, compete, and decay.",
  },
];

export const TAGLINE =
  "Volume Profile · Price dynamics & market randomness · VWAP and options basics to follow";

export const ALL_TOPICS: Topic[] = MODULES.flatMap((m) => m.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

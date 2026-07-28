import type { Transition, Variants } from "motion/react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---- Motion vocabulary -------------------------------------------------- *
 * One spring family, used everywhere, so the whole app feels like a single
 * physical object rather than a pile of independently-tuned components.     */

export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9,
};
export const springSnap: Transition = {
  type: "spring",
  stiffness: 620,
  damping: 30,
  mass: 0.5,
};

/**
 * Container entrances animate POSITION ONLY — never opacity.
 *
 * If a fade-in never completes (a suspended renderer, a tab restored from
 * bfcache, a dropped frame at the wrong moment), an opacity-0 container
 * leaves the entire screen blank with no way back. A transform-only
 * entrance degrades to "already in place", which is harmless. Opacity
 * fades are reserved below for transient UI, where a stuck element is
 * cosmetic rather than fatal.
 */
export const pageVariants: Variants = {
  initial: { y: 14 },
  animate: { y: 0, transition: springSoft },
};

/** Stagger helper for lists — children animate in on a short cascade. */
export const listVariants = (stagger = 0.035): Variants => ({
  initial: {},
  animate: { transition: { staggerChildren: stagger, delayChildren: 0.04 } },
});

export const itemVariants: Variants = {
  initial: { y: 16, scale: 0.985 },
  animate: { y: 0, scale: 1, transition: spring },
};

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function formatNumber(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

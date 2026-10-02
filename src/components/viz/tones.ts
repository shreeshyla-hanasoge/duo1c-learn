import type { CellState } from "../../engine/trace";

/**
 * The state → colour mapping every visualiser panel shares. Only the three
 * validated encoding hues appear here (see index.css); "muted" and "ghost"
 * are neutrals.
 */
export const TONE: Record<CellState, { fill: string; border: string; text: string }> =
  {
    idle: {
      fill: "color-mix(in oklab, var(--color-surface-3) 80%, transparent)",
      border: "var(--color-line-strong)",
      text: "var(--color-ink)",
    },
    cursor: {
      fill: "color-mix(in oklab, var(--color-viz-cursor) 26%, var(--color-surface-2))",
      border: "var(--color-viz-cursor)",
      text: "var(--color-ink)",
    },
    scan: {
      fill: "color-mix(in oklab, var(--color-viz-scan) 26%, var(--color-surface-2))",
      border: "var(--color-viz-scan)",
      text: "var(--color-ink)",
    },
    match: {
      fill: "color-mix(in oklab, var(--color-viz-match) 26%, var(--color-surface-2))",
      border: "var(--color-viz-match)",
      text: "var(--color-ink)",
    },
    muted: {
      fill: "transparent",
      border: "var(--color-line)",
      text: "var(--color-ink-3)",
    },
    // "Not reached yet" still has to be readable — the reader needs to see the
    // whole input from frame 1 to follow what the algorithm is walking over.
    ghost: {
      fill: "color-mix(in oklab, var(--color-surface-3) 35%, transparent)",
      border: "var(--color-line)",
      text: "var(--color-ink-3)",
    },
  };

/** State names are shown in the legend so colour is never the only channel. */
export const STATE_LABELS: { s: CellState; label: string }[] = [
  { s: "cursor", label: "current" },
  { s: "scan", label: "comparing" },
  { s: "match", label: "settled" },
  { s: "muted", label: "eliminated" },
];


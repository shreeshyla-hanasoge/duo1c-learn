/**
 * Helpers that turn sessions and profiles into Stage panels. Shared by every
 * Volume Profile trace, so the panels look and read the same everywhere.
 */
import type {
  CellState,
  ChartProfileSession,
  ChartView,
  LadderLine,
  LadderRow,
  LadderView,
} from "../trace";
import {
  buildProfile,
  levels,
  resample,
  type Bar,
  type Levels,
  type Profile,
} from "./profile";
import { session, type Scenario } from "./sessions";

/** Indian digit grouping, two decimals at most: 22,447.5. */
export const inr = (p: number) =>
  p.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** Volume, rounded, with Indian grouping: 1,23,456. */
export const vol = (v: number) => Math.round(v).toLocaleString("en-IN");

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** "09:45" in IST, from an ms epoch. Arithmetic only — no Intl in traces. */
export function clock(t: number): string {
  const m = Math.floor((t + 330 * 60_000) / 60_000) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function profileSession(
  bars: Bar[],
  step: number,
  developing = false,
): ChartProfileSession {
  const p = buildProfile(bars, step, null);
  return {
    start: bars[0].time,
    end: bars[bars.length - 1].time,
    lo: p.lo,
    bins: p.bins,
    developing,
  };
}

/**
 * Emberwick candles are 5-minute bars; profiles are always computed from the
 * 1-minute bars. That split is the one Emberwick's own docs recommend: the
 * display timeframe is too coarse to bin from.
 */
export function chart(
  key: string,
  days: Bar[][],
  step: number,
  source: string,
  extra: Partial<ChartView> = {},
): ChartView {
  return {
    key,
    bars: days.flatMap((d) => resample(d, 5)),
    profile: {
      step,
      source,
      sessions: days.map((d) => profileSession(d, step)),
    },
    ...extra,
  };
}

export function levelLines(
  L: Levels,
  prefix = "",
  s: { poc?: CellState; edges?: CellState } = {},
): LadderLine[] {
  return [
    { price: L.vah, label: `${prefix}VAH`, s: s.edges },
    { price: L.poc, label: `${prefix}POC`, s: s.poc ?? "cursor" },
    { price: L.val, label: `${prefix}VAL`, s: s.edges },
  ];
}

export function chartLines(L: Levels, prefix = "y") {
  return [
    { price: L.vah, title: `${prefix}VAH`, style: "dashed" as const },
    { price: L.poc, title: `${prefix}POC`, s: "cursor" as const, style: "dotted" as const },
    { price: L.val, title: `${prefix}VAL`, style: "dashed" as const },
  ];
}

/** A ladder of a whole profile, with a state per row from `stateOf`. */
export function ladder(
  p: Profile,
  opts: {
    idPrefix?: string;
    stateOf?: (i: number) => CellState | undefined;
    tagOf?: (i: number) => string | undefined;
    lines?: LadderLine[];
    maxV?: number;
    meter?: LadderView["meter"];
    caption?: string;
    letters?: (i: number) => string;
  } = {},
): LadderView {
  const rows: LadderRow[] = p.bins.map((v, i) => {
    const lo = p.lo + i * p.step;
    return {
      id: `${opts.idPrefix ?? "b"}${Math.round(lo / p.step)}`,
      lo,
      v,
      s: opts.stateOf?.(i),
      tag: opts.tagOf?.(i),
      letters: opts.letters?.(i),
    };
  });
  return {
    step: p.step,
    rows,
    lines: opts.lines,
    maxV: opts.maxV,
    meter: opts.meter,
    caption: opts.caption,
    mode: opts.letters ? "letters" : "volume",
  };
}

/** State per row: inside [val, vah) is "match", the POC row "cursor". */
export function vaStates(p: Profile, L: Levels) {
  return (i: number): CellState | undefined => {
    const lo = p.lo + i * p.step;
    if (lo + p.step / 2 === L.poc) return "cursor";
    if (lo >= L.val && lo < L.vah) return "match";
    return undefined;
  };
}

export function day(s: Scenario): { bars: Bar[]; L: Levels; p: (step: number) => Profile } {
  const bars = session(s);
  return {
    bars,
    L: levels(buildProfile(bars, 5))!,
    p: (step: number) => buildProfile(bars, step),
  };
}

export const hiOf = (bars: Bar[]) => Math.max(...bars.map((b) => b.high));
export const loOf = (bars: Bar[]) => Math.min(...bars.map((b) => b.low));

/** Where the POC sits in the day's range, 0 = at the low, 1 = at the high. */
export function pocPlace(bars: Bar[], L: Levels): number {
  return (L.poc - loOf(bars)) / (hiOf(bars) - loOf(bars));
}

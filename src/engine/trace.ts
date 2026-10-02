/**
 * The trace engine.
 *
 * Every algorithm in this app is instrumented to emit a `Frame[]` — a complete
 * snapshot of what the reader should see at each step. One player component
 * scrubs the timeline; one stage component renders whatever a frame contains.
 *
 * The payoff of doing it this way rather than hand-animating each algorithm:
 *   - free play / pause / step / scrub / speed for all of them
 *   - identical motion vocabulary everywhere
 *   - `id` on every cell means motion's layout animation moves elements
 *     *physically* between frames, so a swap looks like a swap
 *   - the algorithm code stays readable — it is the real algorithm, with
 *     `emit()` calls, not a rewrite driven by animation needs
 */

import type { Bar } from "./trading/profile";

/** Cell states map to the three validated encoding hues + two neutrals. */
export type CellState =
  | "idle"
  | "cursor" // the element under the head — blue
  | "scan" // being examined / compared — orange
  | "match" // settled, found, in the answer — aqua
  | "muted" // eliminated from consideration — neutral + dimmed + struck
  | "ghost"; // structurally present but not yet meaningful

export interface Cell {
  /** Stable identity across frames — drives layout animation. */
  id: string;
  v: number | string;
  s?: CellState;
  /** Small caption under the cell (index label, weight, etc). */
  tag?: string;
}

export interface Pointer {
  id: string;
  name: string;
  /** Index into the current `cells` array. -1 parks it off-stage. */
  i: number;
  /** Rendered above or below the row. */
  side?: "top" | "bottom";
}

export interface AuxTrack {
  title: string;
  cells: Cell[];
  /** Rendered right-to-left, e.g. a stack whose top is on the right. */
  note?: string;
  empty?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  /** Normalised 0..1 layout coordinates. */
  x: number;
  y: number;
  s?: CellState;
  /** Distance / rank badge shown beside the node. */
  badge?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  w?: number;
  s?: CellState;
  directed?: boolean;
}

export interface MatrixView {
  rows: string[];
  cols: string[];
  cells: (number | string | null)[][];
  focus?: [number, number] | null;
  /** Cells on the reconstructed answer path. */
  path?: [number, number][];
  /** Cells the focus cell is reading from. */
  reads?: [number, number][];
  caption?: string;
}

export interface GridView {
  cells: CellState[][];
  labels?: (string | null)[][];
  caption?: string;
}

export interface IntervalView {
  domain: [number, number];
  rows: {
    id: string;
    label: string;
    lo: number;
    hi: number;
    s?: CellState;
    lane?: number;
  }[];
  /** Vertical sweep line position, in domain units. */
  sweep?: number | null;
  caption?: string;
}

export interface Stat {
  label: string;
  value: string | number;
}

/* ---- Price-by-volume panels (Trading concepts) -------------------------- */

/**
 * A volume profile drawn as a DOM ladder: one row per price bin, highest
 * price at the top. This is the panel for ALGORITHM steps — which bins are
 * being compared, which are settled into the value area — because each row
 * carries a state and a number, which a canvas fill cannot.
 */
export interface LadderRow {
  /** Stable across frames, like `Cell.id`. */
  id: string;
  /** Price of the bin's low edge. */
  lo: number;
  v: number;
  s?: CellState;
  /** Short label drawn at the end of the bar: "POC", "+412". */
  tag?: string;
  /** TPO letters for this price, when the frame shows a Market Profile. */
  letters?: string;
}

export interface LadderLine {
  price: number;
  /** Always drawn as text beside the line — colour is never the only channel. */
  label: string;
  s?: CellState;
}

export interface LadderView {
  step: number;
  /** Lowest price first. */
  rows: LadderRow[];
  lines?: LadderLine[];
  /** Fix the bar scale across frames so bars do not rescale as volume arrives. */
  maxV?: number;
  /** A progress readout, e.g. the value area's running share of volume. */
  meter?: { label: string; pct: number; target?: number };
  caption?: string;
  /** Label every n-th price (default: chosen from the row count). */
  labelEvery?: number;
  /** "volume" draws bars; "letters" draws TPO letters instead. */
  mode?: "volume" | "letters";
}

/** One session's profile, in the `emberwick/profiles` data contract. */
export interface ChartProfileSession {
  start: number;
  end: number;
  lo: number;
  bins: number[];
  developing?: boolean;
}

/**
 * A candlestick chart, drawn by Emberwick, with session profiles under the
 * candles. The panel for CONTEXT: where the volume sat relative to how the
 * day actually traded.
 */
export interface ChartView {
  /** Identifies the dataset; a new key re-fits the view. */
  key: string;
  /** Display bars (usually 5-minute), ascending. */
  bars: Bar[];
  /** Show only the first `reveal` bars — the day so far. Default: all. */
  reveal?: number;
  profile?: {
    step: number;
    source: string;
    sessions: ChartProfileSession[];
    mode?: "session" | "visible" | "both";
    extendPoc?: boolean;
  };
  lines?: { price: number; title: string; s?: CellState; style?: "solid" | "dashed" | "dotted" }[];
  zones?: { from: number; to: number; label?: string }[];
  /** Time bands, e.g. the initial balance hour. */
  timeZones?: { fromTime: number; toTime: number; label?: string }[];
  markers?: { time: number; text: string; up?: boolean }[];
  /** Lines over time, e.g. VWAP and its bands. `null` value lifts the pen. */
  series?: {
    id: string;
    data: { time: number; value: number | null }[];
    s?: CellState;
    style?: "solid" | "dashed" | "dotted";
  }[];
  caption?: string;
}

export interface Frame {
  /** One plain-English sentence. This is the real teaching surface. */
  note: string;
  /** 0-based index into `Trace.code` to highlight. */
  line?: number;
  cells?: Cell[];
  pointers?: Pointer[];
  /** Inclusive [lo, hi] range shaded behind the cells. */
  window?: [number, number] | null;
  aux?: AuxTrack[];
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  matrix?: MatrixView;
  grid?: GridView;
  intervals?: IntervalView;
  ladder?: LadderView;
  chart?: ChartView;
  stats?: Stat[];
}

export interface Trace {
  title: string;
  /** Pseudo-code shown beside the stage; `Frame.line` indexes into it. */
  code: string[];
  frames: Frame[];
  /** Bars are for magnitude (sorting); cells are for identity/position. */
  display?: "cells" | "bars";
  /** Shown under the stage as the complexity contract. */
  complexity?: { time: string; space: string };
  /**
   * Names for the states this trace uses, replacing the generic
   * current / comparing / settled / eliminated. Same hues, better words:
   * "in value area" says more than "settled".
   */
  legend?: { s: CellState; label: string }[];
}

/** Collects frames while an algorithm runs. */
export class Recorder {
  private frames: Frame[] = [];

  emit(frame: Frame) {
    this.frames.push(frame);
  }

  get length() {
    return this.frames.length;
  }

  done(): Frame[] {
    return this.frames;
  }
}

/* ---- Small builders ----------------------------------------------------- */

export function cells(
  values: (number | string)[],
  states: Record<number, CellState> = {},
  prefix = "c",
): Cell[] {
  return values.map((v, i) => ({
    id: `${prefix}${i}`,
    v,
    s: states[i] ?? "idle",
  }));
}

/**
 * Cells that keep their identity when the array is permuted — pass the
 * original index so motion animates a swap as two elements trading places
 * rather than two values blinking.
 */
export function keyedCells(
  values: (number | string)[],
  keys: number[],
  states: Record<number, CellState> = {},
  prefix = "k",
): Cell[] {
  return values.map((v, i) => ({
    id: `${prefix}${keys[i]}`,
    v,
    s: states[i] ?? "idle",
  }));
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

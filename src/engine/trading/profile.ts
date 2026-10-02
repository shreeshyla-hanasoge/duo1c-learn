/**
 * Volume profile maths — the ONE implementation.
 *
 * The visualisers, the lab reference solutions' expected values and the audit
 * scripts all derive from these functions, so a lesson can never show one
 * POC while its lab grades another.
 *
 * The rules are the course's reference definitions, which are also the
 * rules `emberwick/profiles` implements in `computeValueArea`
 * (`scripts/profile-check.mts` checks the two agree on random profiles):
 *
 *  - Bins sit on an ABSOLUTE grid: bin k covers [k·step, (k+1)·step).
 *  - A bar's volume is spread over the bins its low→high range covers, in
 *    proportion to the overlap. A flat bar (high = low) goes into one bin.
 *  - POC = the bin with the most volume. Ties go to the bin nearest the
 *    middle of the profile (by bin index), then to the lower one. The POC
 *    PRICE is the bin's midpoint.
 *  - Value area: start at the POC; compare the next TWO bins above with the
 *    next TWO below and add the larger pair; equal pairs go up; a side with
 *    only one bin left offers that one bin; a side with none left loses by
 *    default. Stop as soon as the area holds at least 70% of the volume.
 *    VAH is the top edge of the top bin, VAL the bottom edge of the bottom bin.
 *
 * No transcendental maths anywhere in this folder: results must be identical
 * in every JS engine, because the lessons quote exact numbers.
 */

export interface Bar {
  /** ms epoch, start of the bar. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Profile {
  /** Price of the LOW edge of bins[0]. Always a multiple of `step`. */
  lo: number;
  step: number;
  /** Volume per bin, lowest price first. */
  bins: number[];
}

export interface ValueArea {
  /** Index of the POC bin. */
  poc: number;
  /** Inclusive bin range of the value area. */
  from: number;
  to: number;
  total: number;
  /** Volume inside [from, to]. */
  inside: number;
}

export interface Levels {
  poc: number;
  vah: number;
  val: number;
}

/** Guards `floor(p / step)` against 22470 / 0.05 = 449399.99999999994. */
const EPS = 1e-9;

export function binOf(price: number, step: number): number {
  return Math.floor(price / step + EPS);
}

/** Index of the bin a bar's HIGH lands in. A high exactly on an edge belongs to the bin below it. */
function topBinOf(bar: Bar, step: number): number {
  if (bar.high <= bar.low) return binOf(bar.high, step);
  return Math.ceil(bar.high / step - EPS) - 1;
}

/**
 * Bins a session's bars onto the absolute grid.
 *
 * `round` rounds each bin to that many decimals at the END — fractional
 * overlaps produce values like 0.30000000000000004, and the labs compare by
 * exact equality.
 */
export function buildProfile(
  bars: Bar[],
  step: number,
  round: number | null = 2,
): Profile {
  if (!bars.length) return { lo: 0, step, bins: [] };
  let kLo = Infinity;
  let kHi = -Infinity;
  for (const b of bars) {
    kLo = Math.min(kLo, binOf(b.low, step));
    kHi = Math.max(kHi, topBinOf(b, step));
  }
  const bins = new Array<number>(kHi - kLo + 1).fill(0);
  for (const b of bars) addBar(bins, kLo, step, b);
  const k = round === null ? 0 : 10 ** round;
  return {
    lo: kLo * step,
    step,
    bins: round === null ? bins : bins.map((v) => Math.round(v * k) / k),
  };
}

/** Spreads one bar into `bins` (whose bin 0 is grid bin `kLo`). Mutates. */
export function addBar(
  bins: number[],
  kLo: number,
  step: number,
  b: Bar,
): void {
  if (b.volume <= 0) return;
  if (b.high <= b.low) {
    const k = binOf(b.high, step) - kLo;
    if (k >= 0 && k < bins.length) bins[k] += b.volume;
    return;
  }
  const range = b.high - b.low;
  const k0 = binOf(b.low, step);
  const k1 = topBinOf(b, step);
  for (let k = k0; k <= k1; k++) {
    const lo = Math.max(b.low, k * step);
    const hi = Math.min(b.high, (k + 1) * step);
    if (hi > lo) {
      const i = k - kLo;
      if (i >= 0 && i < bins.length) bins[i] += (b.volume * (hi - lo)) / range;
    }
  }
}

const vol = (v: number | undefined) => (v !== undefined && v > 0 ? v : 0);

export function pocIndex(bins: number[]): number {
  const mid = (bins.length - 1) / 2;
  let best = -1;
  let max = 0;
  for (let i = 0; i < bins.length; i++) {
    const v = vol(bins[i]);
    if (
      v > max ||
      (v === max && best >= 0 && Math.abs(i - mid) < Math.abs(best - mid))
    ) {
      max = v;
      best = i;
    }
  }
  return best;
}

/** One decision of the value-area expansion — what the visualiser animates. */
export interface ExpansionStep {
  from: number;
  to: number;
  /** Candidate bin indices above and below, and their summed volume. */
  upBins: number[];
  downBins: number[];
  up: number;
  down: number;
  took: "up" | "down";
  /** Why: "larger", "tie goes up", "nothing left below", ... */
  reason: string;
  /** Volume inside after this step. */
  inside: number;
}

export function valueArea(
  bins: number[],
  share = 0.7,
  onStep?: (s: ExpansionStep) => void,
): ValueArea | null {
  const n = bins.length;
  const poc = pocIndex(bins);
  if (poc < 0) return null;
  let total = 0;
  for (const v of bins) total += vol(v);
  if (!(total > 0)) return null;
  // The tiny shave stops float error in the total from demanding one more
  // pair than the arithmetic really needs.
  const target = share * total * (1 - 1e-12);
  let from = poc;
  let to = poc;
  let acc = vol(bins[poc]);
  while (acc < target && (from > 0 || to < n - 1)) {
    const upBins = [to + 1, to + 2].filter((i) => i < n);
    const downBins = [from - 1, from - 2].filter((i) => i >= 0);
    const up = upBins.reduce((s, i) => s + vol(bins[i]), 0);
    const down = downBins.reduce((s, i) => s + vol(bins[i]), 0);
    const goUp = to < n - 1 && (from === 0 || up >= down);
    const reason =
      from === 0
        ? "nothing left below"
        : to === n - 1
          ? "nothing left above"
          : up === down
            ? "tie goes up"
            : "larger";
    if (goUp) {
      to = Math.min(n - 1, to + 2);
      acc += up;
    } else {
      from = Math.max(0, from - 2);
      acc += down;
    }
    onStep?.({
      from,
      to,
      upBins,
      downBins,
      up,
      down,
      took: goUp ? "up" : "down",
      reason,
      inside: acc,
    });
  }
  return { poc, from, to, total, inside: acc };
}

export function levels(p: Profile, share = 0.7): Levels | null {
  const va = valueArea(p.bins, share);
  if (!va) return null;
  return {
    poc: p.lo + (va.poc + 0.5) * p.step,
    vah: p.lo + (va.to + 1) * p.step,
    val: p.lo + va.from * p.step,
  };
}

/* ---- The three rule inputs of the reader's strategy builder ------------ */

export type Zone = "above" | "inside" | "below";

/**
 * Where a price sits relative to a value area. The edges count as INSIDE:
 * a close exactly at VAH has not left value. That is a convention, and the
 * lessons say so — a platform that treats the edge as outside will classify
 * a handful of bars differently.
 */
export function zoneOf(price: number, vah: number, val: number): Zone {
  if (price > vah) return "above";
  if (price < val) return "below";
  return "inside";
}

export type SessionRange = "inside" | "above" | "below" | "both";

/**
 * Has today's range so far traded beyond yesterday's value? Strictly beyond:
 * a high that only touches VAH has not traded above value.
 */
export function sessionRange(
  high: number,
  low: number,
  vah: number,
  val: number,
): SessionRange {
  const up = high > vah;
  const down = low < val;
  return up && down ? "both" : up ? "above" : down ? "below" : "inside";
}

/** The developing (running) session range after each bar — no look-ahead. */
export function sessionRangeSoFar(
  bars: Bar[],
  vah: number,
  val: number,
): SessionRange[] {
  let hi = -Infinity;
  let lo = Infinity;
  return bars.map((b) => {
    hi = Math.max(hi, b.high);
    lo = Math.min(lo, b.low);
    return sessionRange(hi, lo, vah, val);
  });
}

/** Adds two profiles on the same grid, as a composite does. */
export function addProfiles(a: Profile, b: Profile): Profile {
  if (a.step !== b.step) throw new Error("profiles must share a bin size");
  if (!a.bins.length) return b;
  if (!b.bins.length) return a;
  const kA = Math.round(a.lo / a.step);
  const kB = Math.round(b.lo / b.step);
  const kLo = Math.min(kA, kB);
  const kHi = Math.max(kA + a.bins.length, kB + b.bins.length) - 1;
  const bins = new Array<number>(kHi - kLo + 1).fill(0);
  a.bins.forEach((v, i) => (bins[kA - kLo + i] += v));
  b.bins.forEach((v, i) => (bins[kB - kLo + i] += v));
  return { lo: kLo * a.step, step: a.step, bins };
}

/** Aggregates 1-minute bars into n-minute bars for display. */
export function resample(bars: Bar[], n: number): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < bars.length; i += n) {
    const g = bars.slice(i, i + n);
    out.push({
      time: g[0].time,
      open: g[0].open,
      high: Math.max(...g.map((b) => b.high)),
      low: Math.min(...g.map((b) => b.low)),
      close: g[g.length - 1].close,
      volume: g.reduce((s, b) => s + b.volume, 0),
    });
  }
  return out;
}

/* ---- Other platforms' value areas, from their documentation ------------ *
 *
 * The same profile gives different VAH/VAL on different platforms. These
 * implement what each platform's own docs describe (sources in
 * docs/trading/sources.md), so the lesson can show the difference rather
 * than assert it:
 *
 *  cbot        Two rows at a time, larger pair wins, stop at ≥ target.
 *              (CBOT study guide; Dalton.) This course's reference rule.
 *  sierra      Sierra Chart's default: ONE row at a time, larger wins, a tie
 *              takes both rows, stop at ≥ target.
 *  tradingview TradingView's volume profile: one row at a time, larger wins,
 *              a tie goes to the row closer to the POC, then the upper one;
 *              STOP BEFORE a row would take the area past the target — so
 *              the area holds at most 70%, not at least.
 */
export type VaMethod = "cbot" | "sierra" | "tradingview";

export function valueAreaBy(
  bins: number[],
  method: VaMethod,
  share = 0.7,
): { from: number; to: number; inside: number; total: number } | null {
  if (method === "cbot") {
    const va = valueArea(bins, share);
    return va && { from: va.from, to: va.to, inside: va.inside, total: va.total };
  }
  const n = bins.length;
  const poc = pocIndex(bins);
  if (poc < 0) return null;
  const total = bins.reduce((s, v) => s + vol(v), 0);
  const target = share * total * (1 - 1e-12);
  let from = poc;
  let to = poc;
  let acc = vol(bins[poc]);
  while (acc < target && (from > 0 || to < n - 1)) {
    const canUp = to < n - 1;
    const canDown = from > 0;
    const up = canUp ? vol(bins[to + 1]) : -1;
    const down = canDown ? vol(bins[from - 1]) : -1;
    if (method === "sierra") {
      if (up === down) {
        to++;
        from--;
        acc += up + down;
      } else if (up > down) {
        to++;
        acc += up;
      } else {
        from--;
        acc += down;
      }
      continue;
    }
    // tradingview
    let goUp: boolean;
    if (up !== down) goUp = up > down;
    else {
      const dUp = to + 1 - poc;
      const dDown = poc - (from - 1);
      goUp = dUp <= dDown;
    }
    const add = goUp ? up : down;
    if (acc + add > share * total) break;
    if (goUp) to++;
    else from--;
    acc += add;
  }
  return { from, to, inside: acc, total };
}

/**
 * Synthetic sessions, shaped like NSE and MCX days.
 *
 * EVERY SESSION HERE IS SYNTHETIC. None of these bars are market data, and
 * the lessons say so wherever a number is quoted. They are generated so that
 * each one shows a specific idea cleanly — a P-shaped day, an open-drive, an
 * 80%-rule fill and an 80%-rule failure — which real days do only
 * occasionally and never on demand.
 *
 * Generation is deterministic and uses only + − × ÷, floor and a seeded
 * integer PRNG, so the browser, Node and every engine produce the same bars
 * to the last bit. That matters because lessons quote exact POC/VAH/VAL
 * values, and `scripts/profile-check.mts` re-derives and checks them.
 *
 * How a session is built: price follows straight lines between waypoints,
 * plus a Brownian-bridge wobble that is pinned to zero AT each waypoint (so
 * the day goes where the scenario says), plus random wicks. Volume follows
 * the usual intraday U — heavy at the open and the close — times any
 * per-window multipliers the scenario sets, times noise.
 */
import type { Bar } from "./profile.ts";

export interface Scenario {
  id: string;
  /** Shown in captions, e.g. "NIFTY near-month future (synthetic)". */
  label: string;
  /** IST calendar date of the session, "YYYY-MM-DD". */
  date: string;
  /** IST open, [hour, minute]. NSE 09:15, MCX 09:00. */
  openIST: [number, number];
  minutes: number;
  tick: number;
  seed: number;
  /** [fraction of the session 0..1, price] — straight lines between them. */
  path: [number, number][];
  /** Size of the per-minute wobble, in points. */
  noise: number;
  /** Typical wick beyond the body, in points. */
  wick: number;
  /** Typical volume of a mid-session minute. */
  volume: number;
  /** [fromFrac, toFrac, multiplier] windows layered on the intraday U. */
  volumeWindows?: [number, number, number][];
}

/** mulberry32 — a 32-bit integer PRNG; all integer ops, fully deterministic. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Approximately standard normal: Irwin–Hall with 4 uniforms, rescaled. */
function gauss(r: () => number): number {
  return (r() + r() + r() + r() - 2) * 1.7320508075688772;
}

const roundTo = (x: number, tick: number) => Math.round(x / tick) * tick;
/** Kills the 22447.350000000002 that `round(x/tick)*tick` leaves behind. */
const clean = (x: number) => Math.round(x * 100) / 100;

function interp(path: [number, number][], f: number): number {
  for (let i = 1; i < path.length; i++) {
    const [f0, p0] = path[i - 1];
    const [f1, p1] = path[i];
    if (f <= f1) return p0 + ((p1 - p0) * (f - f0)) / (f1 - f0 || 1);
  }
  return path[path.length - 1][1];
}

/** ms epoch of an IST wall-clock time. IST is UTC+05:30 with no DST. */
export function istTime(date: string, h: number, m: number): number {
  const [y, mo, d] = date.split("-").map(Number);
  return Date.UTC(y, mo - 1, d, h, m) - 330 * 60_000;
}

export function generate(s: Scenario): Bar[] {
  const r = rng(s.seed);
  const n = s.minutes;

  // Random walk, then bridged so it is exactly zero at every waypoint.
  const walk = [0];
  for (let i = 1; i <= n; i++) walk.push(walk[i - 1] + gauss(r));
  const anchors = s.path.map(([f]) => Math.round(f * n));
  const wobble = new Array<number>(n + 1).fill(0);
  for (let j = 1; j < anchors.length; j++) {
    const a = anchors[j - 1];
    const b = anchors[j];
    for (let i = a; i <= b; i++) {
      const t = b === a ? 0 : (i - a) / (b - a);
      wobble[i] = walk[i] - walk[a] - t * (walk[b] - walk[a]);
    }
  }

  const t0 = istTime(s.date, s.openIST[0], s.openIST[1]);
  const bars: Bar[] = [];
  let prevClose = clean(roundTo(s.path[0][1], s.tick));
  for (let i = 0; i < n; i++) {
    const f = (i + 1) / n;
    const close = clean(
      roundTo(interp(s.path, f) + wobble[i + 1] * s.noise, s.tick),
    );
    const open = prevClose;
    const wickUp = Math.abs(gauss(r)) * s.wick;
    const wickDn = Math.abs(gauss(r)) * s.wick;
    const high = clean(roundTo(Math.max(open, close) + wickUp, s.tick));
    const low = clean(roundTo(Math.min(open, close) - wickDn, s.tick));

    // Intraday U: 3× at the bell, 1× at midday, quadratic in between.
    const x = (i + 0.5) / n;
    const u = 1 + 2 * (2 * x - 1) * (2 * x - 1);
    let mult = 1;
    for (const [a, b, m] of s.volumeWindows ?? []) if (x >= a && x < b) mult *= m;
    const body = Math.abs(close - open) / (s.noise || 1);
    const v = s.volume * u * mult * (0.6 + 0.8 * r()) * (1 + 0.25 * body);

    bars.push({
      time: t0 + i * 60_000,
      open,
      high,
      low,
      close,
      volume: Math.max(1, Math.round(v)),
    });
    prevClose = close;
  }
  return bars;
}

const cache = new Map<string, Bar[]>();

/** Memoised: a 870-minute MCX day is cheap, but lessons ask for it often. */
export function session(s: Scenario): Bar[] {
  let bars = cache.get(s.id);
  if (!bars) {
    bars = generate(s);
    cache.set(s.id, bars);
  }
  return bars;
}

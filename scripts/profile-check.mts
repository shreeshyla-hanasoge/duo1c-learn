/**
 * Volume Profile audit — the trading counterpart of `labs.mts`.
 *
 *   node --experimental-strip-types scripts/profile-check.mts          # check
 *   node --experimental-strip-types scripts/profile-check.mts --show   # + ASCII profiles
 *
 * Three things, each of which has been wrong at least once by eye:
 *
 *  1. The maths agrees with Emberwick's own `computeValueArea` on thousands
 *     of random profiles — including ties, one-bin edges and zero rows — so
 *     what the lessons compute is what the chart draws.
 *  2. The worked example still lands on the reader's platform's numbers:
 *     POC 22,447.5, VAH 22,470, VAL 22,215 at 5-point bins.
 *  3. Every synthetic scenario still shows the thing its lesson says it
 *     shows. A P-shaped day whose POC drifted into the middle, or an
 *     "80% rule failure" that quietly filled, would teach the opposite.
 */
import { computeValueArea } from "emberwick/profiles";
import {
  buildProfile,
  levels,
  pocIndex,
  valueAreaBy,
  type Bar,
  type Profile,
} from "../src/engine/trading/profile.ts";
import { generate, rng } from "../src/engine/trading/sessions.ts";
import { eightyRule } from "../src/engine/trading/rules.ts";
import * as S from "../src/engine/trading/scenarios.ts";

const show = process.argv.includes("--show");
let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${msg}`);
  if (!ok) failures++;
};

/* ---- 1. Agreement with Emberwick --------------------------------- */

{
  const r = rng(2026);
  let disagree = 0;
  const N = 20000;
  for (let t = 0; t < N; t++) {
    const n = 1 + Math.floor(r() * 30);
    // Small integers so ties and equal pairs are common, plus some zeros.
    const bins = Array.from({ length: n }, () =>
      r() < 0.15 ? 0 : 1 + Math.floor(r() * 6),
    );
    const lo = 100 + Math.floor(r() * 50) * 5;
    const mine = levels({ lo, step: 5, bins });
    const theirs = computeValueArea(bins, lo, 5, 0.7);
    const same =
      (mine === null && theirs === null) ||
      (mine !== null &&
        theirs !== null &&
        mine.poc === theirs.poc &&
        mine.vah === theirs.vah &&
        mine.val === theirs.val);
    if (!same) {
      if (disagree < 3) console.log("    differs on", JSON.stringify(bins), mine, theirs);
      disagree++;
    }
  }
  check(disagree === 0, `matches emberwick computeValueArea on ${N} random profiles`);
}

/* ---- 1b. Platform methods reproduce the documented worked example --- */

{
  // Rows 99..110, lowest first. Research notes, section D.
  const bins = [10, 40, 70, 15, 20, 90, 100, 60, 20, 30, 10, 5];
  const rows = (m: "cbot" | "sierra" | "tradingview") => {
    const v = valueAreaBy(bins, m)!;
    return `${99 + v.from}–${99 + v.to}`;
  };
  check(rows("cbot") === "101–107", `CBOT two-row method: rows ${rows("cbot")} (expected 101–107)`);
  check(rows("sierra") === "102–108", `Sierra one-row method: rows ${rows("sierra")} (expected 102–108)`);
  check(rows("tradingview") === "103–108", `TradingView method: rows ${rows("tradingview")} (expected 103–108)`);
}

/* ---- 2. The worked example --------------------------------------- */

const prof = (bars: Bar[], step = 5) => buildProfile(bars, step);
const lv = (bars: Bar[], step = 5) => levels(prof(bars, step))!;
const hi = (bars: Bar[]) => Math.max(...bars.map((b) => b.high));
const lo = (bars: Bar[]) => Math.min(...bars.map((b) => b.low));

{
  const L = lv(generate(S.NIFTY_OCT1));
  check(
    L.poc === 22447.5 && L.vah === 22470 && L.val === 22215,
    `1 Oct 2026 worked example: POC ${L.poc}, VAH ${L.vah}, VAL ${L.val}`,
  );
}

/* ---- 3. Each scenario shows its idea ----------------------------- */

/** POC position inside the session range, 0 = low, 1 = high. */
const pocPos = (bars: Bar[]) => (lv(bars).poc - lo(bars)) / (hi(bars) - lo(bars));

const D = generate(S.SHAPE_D);
check(pocPos(D) > 0.3 && pocPos(D) < 0.7, `D shape: POC in the middle (${pocPos(D).toFixed(2)})`);
const P = generate(S.SHAPE_P);
check(pocPos(P) > 0.66, `P shape: POC in the top third (${pocPos(P).toFixed(2)})`);
const b = generate(S.SHAPE_B_LOWER);
check(pocPos(b) < 0.34, `b shape: POC in the bottom third (${pocPos(b).toFixed(2)})`);

{
  // Double distribution: an LVN between two humps.
  const p = prof(generate(S.SHAPE_DOUBLE), 10);
  const mid = p.bins.slice(Math.floor(p.bins.length * 0.35), Math.ceil(p.bins.length * 0.65));
  const trough = Math.min(...mid);
  const peak = Math.max(...p.bins);
  check(trough < peak * 0.35, `B shape: thin middle (trough ${Math.round(trough)} vs peak ${Math.round(peak)})`);
}

{
  const t = generate(S.SHAPE_TREND);
  const p = prof(t, 10);
  const peak = Math.max(...p.bins);
  const mean = p.bins.reduce((a, v) => a + v, 0) / p.bins.length;
  check(peak / mean < 2.2, `Trend: no dominant node (peak/mean ${(peak / mean).toFixed(2)})`);
}

/** Initial balance high/low: the first 60 one-minute bars. */
const ib = (bars: Bar[]) => ({ hi: hi(bars.slice(0, 60)), lo: lo(bars.slice(0, 60)) });

{
  const d = generate(S.DAY_NORMAL);
  const r = ib(d);
  check(hi(d) - r.hi < 0.15 * (r.hi - r.lo) && r.lo - lo(d) < 0.15 * (r.hi - r.lo),
    "Normal day: the day stays (almost) inside the initial balance");
}
{
  const d = generate(S.DAY_NORMAL_VARIATION);
  const r = ib(d);
  const ext = hi(d) - r.hi;
  check(ext > 0.3 * (r.hi - r.lo) && r.lo - lo(d) < 5, `Normal variation: extension up only (${ext.toFixed(0)} pts)`);
}
{
  const d = generate(S.DAY_NEUTRAL);
  const r = ib(d);
  const close = d[d.length - 1].close;
  check(hi(d) > r.hi && lo(d) < r.lo && close > r.lo && close < r.hi,
    "Neutral day: extends both ways, closes inside the initial balance");
}
{
  const d = generate(S.DAY_NON_TREND);
  check(hi(d) - lo(d) < 70, `Non-trend day: narrow range (${(hi(d) - lo(d)).toFixed(0)} pts)`);
}

const Y = lv(generate(S.OPEN_YESTERDAY));
console.log(`    yesterday value: VAL ${Y.val} · POC ${Y.poc} · VAH ${Y.vah}`);

{
  const d = generate(S.OPEN_DRIVE);
  check(d[0].open > Y.vah && lo(d) > Y.vah, "Open-drive: opens above value and never trades back into it");
}
{
  const d = generate(S.OPEN_TEST_DRIVE);
  const first = d.slice(0, 30);
  check(d[0].open > Y.vah && lo(first) <= Y.vah + 10 && hi(d) > hi(first) + 40,
    "Open-test-drive: tests back to yesterday's VAH, then drives away");
}
{
  const d = generate(S.OPEN_REJECTION_REVERSE);
  check(hi(d.slice(0, 30)) > d[0].open + 25 && d[d.length - 1].close < d[0].open - 60,
    "Open-rejection-reverse: up first, then reverses well through the open");
}
{
  const d = generate(S.OPEN_AUCTION);
  check(d[0].open > Y.val && d[0].open < Y.vah && hi(d) - lo(d) < 110,
    "Open-auction: opens inside value and rotates");
}

{
  const d = generate(S.EIGHTY_FILL);
  const e = eightyRule(d, Y);
  check(e.applies && e.trigger > 0 && e.filled,
    `80% fill: triggers (period ${e.trigger}) and reaches yesterday's VAH`);
}
{
  const d = generate(S.EIGHTY_FAIL);
  const e = eightyRule(d, Y);
  check(e.applies && e.trigger > 0 && !e.filled,
    `80% failure: triggers (period ${e.trigger}) and does NOT reach VAH`);
}

{
  for (const { name, s } of S.RELATIONS) {
    const T = lv(generate(s));
    const rel =
      T.val >= Y.val && T.vah <= Y.vah ? "Inside"
      : T.val < Y.val && T.vah > Y.vah ? "Outside"
      : T.val > Y.vah ? "Higher"
      : T.vah < Y.val ? "Lower"
      : T.vah > Y.vah ? "Overlapping higher"
      : "Overlapping lower";
    check(rel === name, `Value relationship "${name}": VA ${T.val}–${T.vah} reads as ${rel}`);
  }
}

{
  const d = generate(S.TPO_VS_VOLUME);
  const p = prof(d, 5);
  const volPoc = p.lo + (pocIndex(p.bins) + 0.5) * 5;
  // TPO: count 30-minute periods touching each bin.
  const tpo = new Array(p.bins.length).fill(0);
  for (let i = 0; i < d.length; i += 30) {
    const g = d.slice(i, i + 30);
    const k0 = Math.floor(lo(g) / 5) - Math.round(p.lo / 5);
    const k1 = Math.ceil(hi(g) / 5) - 1 - Math.round(p.lo / 5);
    for (let k = k0; k <= k1; k++) tpo[k]++;
  }
  const tpoPoc = p.lo + (pocIndex(tpo) + 0.5) * 5;
  check(Math.abs(volPoc - tpoPoc) >= 40, `TPO vs volume: POCs disagree (time ${tpoPoc}, volume ${volPoc})`);
}

{
  const d = generate(S.MCX_CRUDE);
  const whole = lv(d, 2);
  const day = lv(d.slice(0, 480), 2); // 09:00–17:00
  const eve = lv(d.slice(480), 2); // 17:00–23:30
  console.log(`    MCX crude: whole POC ${whole.poc} · day POC ${day.poc} · evening POC ${eve.poc}`);
  check(Math.abs(day.poc - eve.poc) >= 20, "MCX crude: day and evening sessions have different POCs");
}

/* ---- ASCII view -------------------------------------------------- */

function ascii(title: string, p: Profile) {
  const L = levels(p)!;
  const max = Math.max(...p.bins);
  console.log(`\n${title}   POC ${L.poc}  VAH ${L.vah}  VAL ${L.val}`);
  for (let i = p.bins.length - 1; i >= 0; i--) {
    const price = p.lo + i * p.step;
    const inVa = price >= L.val && price < L.vah;
    const bar = "#".repeat(Math.round((p.bins[i] / max) * 50));
    console.log(`${String(price).padStart(8)} ${inVa ? "|" : " "} ${bar}`);
  }
}

if (show) {
  const all = Object.entries(S).flatMap(([k, v]) =>
    Array.isArray(v)
      ? v.map((x, i) => [`${k}[${i}]`, "s" in x ? x.s : x] as const)
      : [[k, v] as const],
  );
  for (const [k, s] of all) {
    const step = (s as { tick: number }).tick === 1 ? 2 : 10;
    ascii(k, buildProfile(generate(s as never), step));
  }
}

console.log(failures ? `\n${failures} failing` : "\nall checks pass");
process.exit(failures ? 1 : 0);

/**
 * Volume Profile visualisers, part 1: what a profile IS and how it is built.
 * Lessons 1–8. Every session is synthetic (see engine/trading/sessions.ts),
 * and every number in a note is computed here, not typed in.
 */
import { Recorder, type CellState, type Frame, type Trace } from "../trace";
import {
  addBar,
  binOf,
  buildProfile,
  levels,
  pocIndex,
  valueArea,
  valueAreaBy,
  type Bar,
  type Profile,
  type VaMethod,
} from "../trading/profile";
import * as S from "../trading/scenarios";
import {
  chart,
  clock,
  day,
  hiOf,
  inr,
  ladder,
  levelLines,
  loOf,
  pct,
  pocPlace,
  profileSession,
  vaStates,
  vol,
} from "../trading/viz";
import { resample } from "../trading/profile";

const FUT = "NIFTY fut (synthetic)";

const VA_LEGEND = [
  { s: "cursor" as const, label: "POC / current" },
  { s: "scan" as const, label: "being compared / added" },
  { s: "match" as const, label: "in value area" },
  { s: "muted" as const, label: "not chosen" },
];

/* ================================================================== *
 * Lesson 1 — the auction
 * ================================================================== */

export function auction(): Trace {
  const r = new Recorder();
  const { bars } = day(S.SHAPE_DOUBLE);
  const display = resample(bars, 5);
  const key = "auction";
  const at = (min: number) => bars.slice(0, min);
  const view = (min: number, caption: string): Frame["chart"] => ({
    key,
    bars: display,
    reveal: Math.ceil(min / 5),
    profile: { step: 10, source: FUT, sessions: [profileSession(at(min), 10, true)] },
    caption,
  });
  const lv = (min: number) => levels(buildProfile(at(min), 10))!;

  r.emit({
    note: "A market is an auction that never closes. Price moves to ADVERTISE: it goes up looking for sellers and down looking for buyers. Watch where the volume piles up.",
    chart: view(30, "First 30 minutes"),
    stats: [{ label: "time", value: clock(bars[29].time) }],
  });
  const L1 = lv(150);
  r.emit({
    note: `By ${clock(bars[149].time)} price has rotated between ${inr(loOf(at(150)))} and ${inr(hiOf(at(150)))} for two and a half hours. Lots of time, lots of volume: that range is ACCEPTED. This is balance — both sides agree on value, for now.`,
    chart: view(150, "Balance: rotation inside a range"),
    stats: [
      { label: "developing POC", value: inr(L1.poc) },
      { label: "value", value: `${inr(L1.val)}–${inr(L1.vah)}` },
    ],
  });
  r.emit({
    note: "Then price leaves the range upward and moves fast. Very little volume trades on the way: the market is not accepting those prices, it is passing through them. That is imbalance — one side is clearly stronger.",
    chart: view(205, "Imbalance: a fast move on thin volume"),
  });
  const L2 = lv(375);
  r.emit({
    note: `Up near ${inr(L2.poc)} price slows down and rotates again, and volume builds a second hump. The auction has found a new area where both sides will trade: a new balance, higher up.`,
    chart: view(375, "A new balance, higher"),
    stats: [
      { label: "final POC", value: inr(L2.poc) },
      { label: "value area", value: `${inr(L2.val)}–${inr(L2.vah)}` },
    ],
  });
  r.emit({
    note: "Read the finished profile as a record of the auction: wide humps where trade was accepted, a thin waist where price was only advertised. Time and volume at a price are the evidence; this is what every later lesson builds on.",
    chart: view(375, "The whole day: two accepted areas, one thin waist"),
  });

  return {
    title: "An auction, minute by minute",
    code: [
      "price moves to find the other side",
      "time + volume at a price  → acceptance",
      "fast move on little volume → rejection",
      "rotation in a range        → balance",
      "directional move           → imbalance",
    ],
    frames: r.done(),
    legend: [{ s: "match", label: "value area (shaded)" }, { s: "cursor", label: "POC line" }],
  };
}

/* ================================================================== *
 * Lesson 2 — TPO (time) versus volume
 * ================================================================== */

const LETTERS = "ABCDEFGHIJKLM";

/** 30-minute TPO letters per bin, on an existing profile's grid. */
export function tpoLetters(bars: Bar[], p: Profile, upTo = bars.length): string[] {
  const out = p.bins.map(() => "");
  const k0 = Math.round(p.lo / p.step);
  for (let i = 0, per = 0; i < upTo; i += 30, per++) {
    const g = bars.slice(i, Math.min(i + 30, upTo));
    const lo = binOf(loOf(g), p.step);
    const hi = Math.ceil(hiOf(g) / p.step - 1e-9) - 1;
    for (let k = lo; k <= hi; k++) {
      const j = k - k0;
      if (j >= 0 && j < out.length) out[j] += LETTERS[per] ?? "?";
    }
  }
  return out;
}

export function tpoVsVolume(): Trace {
  const r = new Recorder();
  const bars = day(S.TPO_VS_VOLUME).bars;
  const step = 10;
  const full = buildProfile(bars, step);
  const letters = tpoLetters(bars, full);
  const tpoCount = letters.map((l) => l.length);
  const tpoPoc = pocIndex(tpoCount);
  const volPoc = pocIndex(full.bins);
  const tpoPrice = full.lo + (tpoPoc + 0.5) * step;
  const volPrice = full.lo + (volPoc + 0.5) * step;

  for (let per = 1; per <= 13; per += per < 3 ? 1 : 2) {
    const upTo = Math.min(bars.length, per * 30);
    const ls = tpoLetters(bars, full, upTo);
    r.emit({
      note:
        per === 1
          ? "Market Profile counts TIME. Every 30-minute period gets a letter — A is 09:15–09:45 — printed at every price that period traded. Here is period A."
          : `Through period ${LETTERS[per - 1]} (${clock(bars[upTo - 1].time)}). A price that many periods visited collects a long row of letters, whatever volume traded there.`,
      ladder: ladder(full, {
        idPrefix: "t",
        letters: (i) => ls[i],
        stateOf: (i) => (ls[i].includes(LETTERS[per - 1]) ? "scan" : undefined),
        caption: `TPO letters, ${step}-point rows`,
      }),
    });
  }
  r.emit({
    note: `The TPO POC — the row with the most letters — is ${inr(tpoPrice)}: the morning crawled around there for hours. But it crawled on thin volume.`,
    ladder: ladder(full, {
      idPrefix: "t",
      letters: (i) => letters[i],
      stateOf: (i) => (i === tpoPoc ? "cursor" : undefined),
      lines: [{ price: tpoPrice, label: "TPO POC", s: "cursor" }],
    }),
    stats: [{ label: "TPO POC (time)", value: inr(tpoPrice) }],
  });
  r.emit({
    note: `Now count VOLUME instead. A short, heavy burst in the afternoon traded more contracts in under an hour than the whole slow morning. The volume POC is ${inr(volPrice)} — ${inr(Math.abs(volPrice - tpoPrice))} points away.`,
    ladder: ladder(full, {
      idPrefix: "t",
      stateOf: (i) => (i === volPoc ? "cursor" : i === tpoPoc ? "scan" : undefined),
      lines: [
        { price: volPrice, label: "volume POC", s: "cursor" },
        { price: tpoPrice, label: "TPO POC", s: "scan" },
      ],
    }),
    chart: chart("tpo-vol", [bars], step, FUT),
    stats: [
      { label: "TPO POC (time)", value: inr(tpoPrice) },
      { label: "volume POC", value: inr(volPrice) },
    ],
  });
  r.emit({
    note: "Which is right? Neither — they answer different questions. Time asks where the market was willing to spend the day; volume asks where the business was actually done. Often they roughly agree; Dalton's own worked example shows the two value areas differing by a few ticks on the same day. When they disagree a lot, that disagreement is the information.",
    ladder: ladder(full, {
      idPrefix: "t",
      stateOf: (i) => (i === volPoc ? "cursor" : i === tpoPoc ? "scan" : undefined),
    }),
  });

  return {
    title: "Time at price versus volume at price",
    code: [
      "TPO:    for each 30-min period, +1 letter at every price it touched",
      "Volume: for each bar, add its volume to the prices it covered",
      "POC = the row with the most (letters | volume)",
    ],
    frames: r.done(),
    legend: [
      { s: "scan", label: "this period / TPO POC" },
      { s: "cursor", label: "POC" },
    ],
  };
}

/* ================================================================== *
 * Lesson 3 — building a profile from one-minute bars
 * ================================================================== */

export function buildFromBars(): Trace {
  const r = new Recorder();
  const { bars } = day(S.NIFTY_OCT1);
  const step = 5;
  const display = resample(bars, 5);
  const finalP = buildProfile(bars, step);

  const LINE = { grid: 0, overlap: 1, add: 2 };

  // Detail: the first five bars, one at a time.
  for (let i = 0; i < 5; i++) {
    const b = bars[i];
    const sofar = buildProfile(bars.slice(0, i + 1), step);
    const k0 = Math.round(sofar.lo / step);
    const add = sofar.bins.map(() => 0);
    addBar(add, k0, step, b);
    const touched = add.map((v, j) => [j, v] as const).filter(([, v]) => v > 0);
    const parts = touched
      .map(([j, v]) => {
        const lo = sofar.lo + j * step;
        const ov = Math.min(b.high, lo + step) - Math.max(b.low, lo);
        return `${inr(lo)}–${inr(lo + step)} gets ${ov.toFixed(2)}/${(b.high - b.low).toFixed(2)} → ${vol(v)}`;
      })
      .join("; ");
    r.emit({
      note:
        i === 0
          ? `09:15 bar: low ${inr(b.low)}, high ${inr(b.high)}, ${vol(b.volume)} contracts. We do not know at which prices inside the bar those contracts traded, so we assume they were spread evenly over the range. ${parts}.`
          : `${clock(b.time)} bar: ${inr(b.low)}–${inr(b.high)}, ${vol(b.volume)} contracts. ${parts}.`,
      line: i === 0 ? LINE.overlap : LINE.add,
      ladder: ladder(sofar, {
        stateOf: (j) => (add[j] > 0 ? "scan" : undefined),
        tagOf: (j) => (add[j] > 0 ? `+${vol(add[j])}` : undefined),
        caption: "5-point rows on the absolute grid (edges are multiples of 5)",
      }),
      chart: { key: "build", bars: display, reveal: 1 },
      stats: [
        { label: "bar", value: clock(b.time) },
        { label: "range", value: `${(b.high - b.low).toFixed(2)} pts` },
        { label: "rows covered", value: touched.length },
      ],
    });
  }

  // Then thirty minutes at a time.
  for (let end = 30; end <= bars.length; end += end < 360 ? 30 : 15) {
    const upTo = Math.min(end, bars.length);
    const sofar = buildProfile(bars.slice(0, upTo), step);
    const before = buildProfile(bars.slice(0, Math.max(1, upTo - 30)), step);
    const kB = Math.round(before.lo / step);
    const kS = Math.round(sofar.lo / step);
    const grew = (j: number) =>
      sofar.bins[j] - (before.bins[j + kS - kB] ?? 0) > 0.5;
    const pi = pocIndex(sofar.bins);
    r.emit({
      note: `By ${clock(bars[upTo - 1].time)}: ${upTo} bars, ${vol(sofar.bins.reduce((a, v) => a + v, 0))} contracts in ${sofar.bins.length} rows. The rows lit up took volume in the last half hour. Busiest row so far: ${inr(sofar.lo + pi * step)}–${inr(sofar.lo + (pi + 1) * step)}.`,
      line: LINE.add,
      ladder: ladder(sofar, {
        stateOf: (j) => (j === pi ? "cursor" : grew(j) ? "scan" : undefined),
        maxV: Math.max(...finalP.bins),
      }),
      chart: {
        key: "build",
        bars: display,
        reveal: Math.ceil(upTo / 5),
        profile: { step, source: FUT, sessions: [profileSession(bars.slice(0, upTo), step, true)] },
      },
    });
    if (upTo === bars.length) break;
  }

  const L = levels(finalP)!;
  r.emit({
    note: `The finished session: ${finalP.bins.length} rows of 5 points. POC ${inr(L.poc)}, value area ${inr(L.val)} to ${inr(L.vah)} — the worked example. The bars are synthetic, but they reproduce those three numbers exactly.`,
    ladder: ladder(finalP, {
      stateOf: vaStates(finalP, L),
      lines: levelLines(L),
    }),
    chart: chart("build", [bars], step, FUT),
  });

  return {
    title: "Building a profile from one-minute bars",
    code: [
      "bin k covers [k·step, (k+1)·step)        // absolute grid",
      "share = overlap(bar range, bin) / bar range",
      "bins[k] += bar.volume · share            // flat bar → one bin",
    ],
    frames: r.done(),
    legend: [
      { s: "scan", label: "took volume this step" },
      { s: "cursor", label: "busiest row (POC)" },
      { s: "match", label: "value area" },
    ],
    complexity: { time: "O(bars × rows per bar)", space: "O(rows)" },
  };
}

/* ================================================================== *
 * Lessons 3 and 5 — bin size
 * ================================================================== */

export function binSize(): Trace {
  const r = new Recorder();
  const { bars } = day(S.NIFTY_OCT1);
  const steps = [1, 2.5, 5, 10, 25, 50];
  const notes: Record<number, string> = {
    1: "1-point rows. Every wiggle of the one-minute data shows up as a spike, and neighbouring rows differ by chance. The POC is just whichever spike happened to be tallest.",
    2.5: "2.5-point rows: still jagged. Remember a one-minute bar's volume was already smeared evenly over its range — rows much finer than a typical bar's range are inventing detail the data does not have.",
    5: "5-point rows — the reference setting. The two humps are clear, the thin waist between them is clear, and a typical one-minute bar spans only a couple of rows.",
    10: "10-point rows: still the same story, with fewer, steadier rows.",
    25: "25-point rows: the waist starts to disappear into its neighbours, and the value-area edges can only move in 25-point jumps.",
    50: "50-point rows: the shape is gone. Six rows cannot show two humps, and VAH/VAL are now as coarse as the rows themselves.",
  };
  for (const step of steps) {
    const p = buildProfile(bars, step);
    const L = levels(p)!;
    r.emit({
      note: notes[step],
      ladder: ladder(p, {
        idPrefix: `s${step}-`,
        stateOf: vaStates(p, L),
        lines: levelLines(L),
        caption: `${step}-point rows · ${p.bins.length} rows`,
      }),
      stats: [
        { label: "row size", value: `${step} pts` },
        { label: "POC", value: inr(L.poc) },
        { label: "VAH", value: inr(L.vah) },
        { label: "VAL", value: inr(L.val) },
        { label: "VA width", value: `${inr(L.vah - L.val)} pts` },
      ],
    });
  }
  r.emit({
    note: "Same bars, six answers. There is no 'true' bin size: too fine and you are fitting noise, too coarse and you lose the shape. Pick one per instrument (a few ticks above a typical one-minute range is a reasonable start), keep it fixed across days so sessions can be compared and added, and never tune it to make a backtest look better.",
    stats: steps.map((step) => {
      const L = levels(buildProfile(bars, step))!;
      return { label: `${step} pt POC`, value: inr(L.poc) };
    }),
  });

  return {
    title: "Same session, six bin sizes",
    code: ["for step in [1, 2.5, 5, 10, 25, 50]:", "  profile = build(bars, step)", "  POC, VAH, VAL = levels(profile)"],
    frames: r.done(),
    legend: [
      { s: "cursor", label: "POC row" },
      { s: "match", label: "in value area" },
    ],
  };
}

/* ================================================================== *
 * Lesson 4 — the POC and its tie rule
 * ================================================================== */

export function pocTies(): Trace {
  const r = new Recorder();
  const cases: { name: string; bins: number[] }[] = [
    { name: "a clear winner", bins: [2, 4, 7, 9, 6, 3, 1] },
    { name: "a tie, one candidate nearer the middle", bins: [3, 9, 5, 6, 4, 9, 8, 2, 1] },
    { name: "a tie, both equally near the middle", bins: [1, 4, 9, 3, 9, 2, 1] },
  ];
  const step = 5;
  const lo = 22400;
  for (const c of cases) {
    const n = c.bins.length;
    const mid = (n - 1) / 2;
    let best = -1;
    let max = 0;
    for (let i = 0; i < n; i++) {
      const v = c.bins[i];
      const better = v > max;
      const tie = v === max && best >= 0;
      const nearer = tie && Math.abs(i - mid) < Math.abs(best - mid);
      const prev = best;
      if (better || nearer) {
        max = v;
        best = i;
      }
      const why = better
        ? `${v} beats the best so far — new leader.`
        : tie
          ? nearer
            ? `${v} TIES the leader. It is ${Math.abs(i - mid)} rows from the middle, the leader is ${Math.abs(prev - mid)}: nearer the middle wins.`
            : `${v} ties the leader but is not nearer the middle (${Math.abs(i - mid)} vs ${Math.abs(prev - mid)} rows). The leader stays — on an exact tie of distance, the LOWER row was already leading and keeps it.`
          : `${v} is less than ${max}. No change.`;
      r.emit({
        note: `Case: ${c.name}. Row ${inr(lo + i * step)}: ${why}`,
        ladder: ladder(
          { lo, step, bins: c.bins },
          {
            idPrefix: `${c.name}-`,
            stateOf: (j) => (j === i ? "scan" : j === best ? "cursor" : undefined),
            tagOf: (j) => String(c.bins[j]),
            lines: [{ price: lo + (mid + 0.5) * step, label: "middle", s: undefined }],
          },
        ),
        stats: [
          { label: "middle row", value: inr(lo + mid * step) },
          { label: "leader", value: best >= 0 ? inr(lo + best * step) : "—" },
          { label: "leader volume", value: max },
        ],
      });
    }
    r.emit({
      note: `POC for ${c.name}: row ${inr(lo + best * step)}–${inr(lo + (best + 1) * step)}, so the POC PRICE is its midpoint, ${inr(lo + (best + 0.5) * step)}.`,
      ladder: ladder(
        { lo, step, bins: c.bins },
        {
          idPrefix: `${c.name}-`,
          stateOf: (j) => (j === best ? "cursor" : undefined),
          tagOf: (j) => String(c.bins[j]),
          lines: [{ price: lo + (best + 0.5) * step, label: "POC", s: "cursor" }],
        },
      ),
    });
  }

  // The jump: a developing POC flipping between two humps.
  const { bars } = day(S.NIFTY_OCT1);
  let prevPoc = NaN;
  let jumpAt = -1;
  let jumpFrom = NaN;
  let biggest = 0;
  for (let i = 30; i <= bars.length; i++) {
    const p = buildProfile(bars.slice(0, i), 5);
    const poc = p.lo + (pocIndex(p.bins) + 0.5) * 5;
    if (Number.isFinite(prevPoc) && Math.abs(poc - prevPoc) > biggest) {
      biggest = Math.abs(poc - prevPoc);
      jumpAt = i;
      jumpFrom = prevPoc;
    }
    prevPoc = poc;
  }
  const display = resample(bars, 5);
  for (const at of [jumpAt - 1, jumpAt]) {
    const p = buildProfile(bars.slice(0, at), 5);
    const pi = pocIndex(p.bins);
    r.emit({
      note:
        at < jumpAt
          ? `Why the POC can JUMP. At ${clock(bars[at - 1].time)} the developing POC is ${inr(jumpFrom)}, in the lower hump. The upper hump is almost as big.`
          : `One minute later the upper hump edges ahead and the POC jumps ${inr(biggest)} points to ${inr(p.lo + (pi + 0.5) * 5)}. Nothing dramatic happened in the market — one bar tipped a near-tie. The POC is the TALLEST row, and the tallest of two near-equal rows is a coin toss.`,
      ladder: ladder(p, {
        idPrefix: "j",
        stateOf: (j) => (j === pi ? "cursor" : undefined),
      }),
      chart: {
        key: "poc-jump",
        bars: display,
        reveal: Math.ceil(at / 5),
        profile: { step: 5, source: FUT, sessions: [profileSession(bars.slice(0, at), 5, true)] },
      },
      stats: [{ label: "developing POC", value: inr(p.lo + (pi + 0.5) * 5) }],
    });
  }

  return {
    title: "Finding the POC, ties and all",
    code: [
      "best = -1, max = 0, mid = (n − 1) / 2",
      "for i in 0..n−1:",
      "  if v[i] > max  or  (v[i] == max and |i − mid| < |best − mid|):",
      "    best = i, max = v[i]",
      "POC price = lo + (best + 0.5) · step",
    ],
    frames: r.done(),
    legend: [
      { s: "scan", label: "row being examined" },
      { s: "cursor", label: "leader / POC" },
    ],
    complexity: { time: "O(rows)", space: "O(1)" },
  };
}

/* ================================================================== *
 * Lesson 5 — the value area, two rows at a time
 * ================================================================== */

function expansionFrames(
  r: Recorder,
  p: Profile,
  idPrefix: string,
  intro: string,
  chartView?: Frame["chart"],
) {
  const total = p.bins.reduce((a, v) => a + v, 0);
  const poc = pocIndex(p.bins);
  const priceOf = (i: number) => p.lo + i * p.step;
  const rowsTxt = (ix: number[]) =>
    ix.length === 0
      ? "nothing"
      : ix.length === 1
        ? `${inr(priceOf(ix[0]))} only`
        : `${inr(priceOf(Math.min(...ix)))}–${inr(priceOf(Math.max(...ix)) + p.step)}`;

  r.emit({
    note: intro,
    line: 0,
    ladder: ladder(p, {
      idPrefix,
      stateOf: (i) => (i === poc ? "cursor" : undefined),
      meter: { label: "inside the value area", pct: p.bins[poc] / total, target: 0.7 },
    }),
    chart: chartView,
    stats: [
      { label: "POC", value: inr(priceOf(poc) + p.step / 2) },
      { label: "total", value: vol(total) },
      { label: "target (70%)", value: vol(total * 0.7) },
    ],
  });

  let from = poc;
  let to = poc;
  valueArea(p.bins, 0.7, (st) => {
    const inVa = (i: number) => i >= from && i <= to;
    const edge =
      st.upBins.length === 1
        ? " Only ONE row is left above, so that single row is compared with the pair below."
        : st.downBins.length === 1
          ? " Only ONE row is left below, so that single row is compared with the pair above."
          : "";
    r.emit({
      note: `${edge ? edge.trim() + " " : ""}Compare the two rows above (${rowsTxt(st.upBins)}: ${vol(st.up)}) with the two below (${rowsTxt(st.downBins)}: ${vol(st.down)}). ${st.reason === "larger" ? `${st.took === "up" ? "Above" : "Below"} is larger.` : st.reason === "tie goes up" ? "They are EQUAL — the tie goes up." : `There is ${st.reason}, so take the other side.`} Add ${st.took === "up" ? "above" : "below"}.`,
      line: st.reason === "larger" ? 2 : st.reason === "tie goes up" ? 3 : 4,
      ladder: ladder(p, {
        idPrefix,
        stateOf: (i) =>
          i === poc ? "cursor" : inVa(i) ? "match" : st.upBins.includes(i) || st.downBins.includes(i) ? "scan" : undefined,
        tagOf: (i) =>
          i === st.upBins[0] ? `↑ ${vol(st.up)}` : i === st.downBins[0] ? `↓ ${vol(st.down)}` : undefined,
        meter: { label: "inside the value area", pct: (st.inside - (st.took === "up" ? st.up : st.down)) / total, target: 0.7 },
      }),
      chart: chartView,
      stats: [
        { label: "above pair", value: vol(st.up) },
        { label: "below pair", value: vol(st.down) },
        { label: "take", value: st.took },
      ],
    });
    from = st.from;
    to = st.to;
  });

  const L = levels(p)!;
  r.emit({
    note: `${pct(valueArea(p.bins)!.inside / total)} of the volume is now inside — at least 70%, so stop. VAH is the TOP edge of the top row, ${inr(L.vah)}; VAL the BOTTOM edge of the bottom row, ${inr(L.val)}. The last pair is added whole, which is why the area usually holds a little more than 70%.`,
    line: 5,
    ladder: ladder(p, {
      idPrefix,
      stateOf: vaStates(p, L),
      lines: levelLines(L),
      meter: { label: "inside the value area", pct: valueArea(p.bins)!.inside / total, target: 0.7 },
    }),
    chart: chartView,
    stats: [
      { label: "POC", value: inr(L.poc) },
      { label: "VAH", value: inr(L.vah) },
      { label: "VAL", value: inr(L.val) },
    ],
  });
  return L;
}

const VA_CODE = [
  "lo = hi = POC; inside = v[POC]",
  "while inside < 70% of total:",
  "  up = v[hi+1] + v[hi+2];  down = v[lo−1] + v[lo−2]",
  "  if up ≥ down (tie goes up): add the pair above",
  "  if one side is used up: add from the other side",
  "VAH = top edge of row hi;  VAL = bottom edge of row lo",
];

export function valueAreaOct1(): Trace {
  const r = new Recorder();
  const { bars } = day(S.NIFTY_OCT1);
  const p = buildProfile(bars, 5);
  const L = expansionFrames(
    r,
    p,
    "va",
    "Start at the POC, the busiest row. The value area will grow outwards from here, two rows at a time, until it holds 70% of the day's volume. The meter tracks the running share.",
    chart("va-oct1", [bars], 5, FUT),
  );
  r.emit({
    note: `Look where the POC sits: ${inr(L.vah - L.poc)} points below VAH but ${inr(L.poc - L.val)} points above VAL. The busiest price is near the TOP of value. Before reading on, ask yourself what that suggests about the day — then look at the shape: two humps, with a thin waist inside the value area. A value area is a band, not a promise that every price inside it was accepted.`,
    ladder: ladder(p, { idPrefix: "va", stateOf: vaStates(p, L), lines: levelLines(L) }),
    chart: chart("va-oct1", [bars], 5, FUT),
    stats: [
      { label: "POC → VAH", value: `${inr(L.vah - L.poc)} pts` },
      { label: "POC → VAL", value: `${inr(L.poc - L.val)} pts` },
    ],
  });
  return { title: "Value area, 1 Oct 2026 (synthetic bars)", code: VA_CODE, frames: r.done(), legend: VA_LEGEND };
}

export function valueAreaRules(): Trace {
  const r = new Recorder();
  // Hand-made to hit every branch: a tie between pairs, then one side runs
  // out (a single bin left, then none).
  // Found by search (every branch in at most four steps): larger, a tie,
  // a single row left at the top edge, then nothing left above.
  const p: Profile = { lo: 22400, step: 5, bins: [7, 6, 4, 2, 11, 7, 1, 3, 3, 7] };
  expansionFrames(
    r,
    p,
    "rule",
    "A small profile built to hit every rule in four steps. Total volume 51, so the target is 70% × 51 = 35.7. The POC is the row with 11.",
  );
  return {
    title: "Value area rules: ties and edges",
    code: VA_CODE,
    frames: r.done(),
    legend: VA_LEGEND,
    complexity: { time: "O(rows)", space: "O(1)" },
  };
}

/* ================================================================== *
 * Lesson 6 — anatomy
 * ================================================================== */

export function anatomy(): Trace {
  const r = new Recorder();
  const { bars } = day(S.ANATOMY);
  const step = 10;
  const p = buildProfile(bars, step);
  const L = levels(p)!;
  const letters = tpoLetters(bars, p);
  const n = p.bins.length;
  const max = Math.max(...p.bins);
  const priceOf = (i: number) => p.lo + i * step;
  const lvn = p.bins
    .map((v, i) => [i, v] as const)
    .filter(([i, v]) => i > 2 && i < n - 3 && v < max * 0.06)
    .map(([i]) => i);
  const hvns = p.bins
    .map((v, i) => [i, v] as const)
    .filter(([i, v]) => v >= max * 0.5 && (i === 0 || v >= p.bins[i - 1]) && (i === n - 1 || v >= p.bins[i + 1]))
    .map(([i]) => i);
  const singles = letters.map((l, i) => [i, l.length] as const).filter(([, c]) => c === 1).map(([i]) => i);
  const bottomTail = singles.filter((i) => i <= 4);

  const frame = (note: string, on: number[], s: CellState, extra: Partial<Frame> = {}) =>
    r.emit({
      note,
      ladder: ladder(p, {
        idPrefix: "an",
        stateOf: (i) => (on.includes(i) ? s : undefined),
        tagOf: (i) => (on.includes(i) ? letters[i] : undefined),
      }),
      ...extra,
    });

  frame(
    "One synthetic day with every feature on it. Read it top to bottom before the labels arrive: where are the wide parts, where is it thin, how does it end at each extreme?",
    [],
    "scan",
    { chart: chart("anatomy", [bars], step, FUT) },
  );
  frame(
    `High-volume nodes (HVN): the peaks at ${hvns.map((i) => inr(priceOf(i))).join(" and ")}. Prices the market accepted. When price comes back to one it tends to slow down and rotate, because there are many willing traders there.`,
    hvns,
    "match",
  );
  frame(
    `A low-volume node (LVN) between them: ${lvn.length ? `${inr(priceOf(Math.min(...lvn)))}–${inr(priceOf(Math.max(...lvn)) + step)}` : "the thin waist"}. Price was only passing through. On a return it often moves fast again — the evidence that it should is mostly practitioner experience, not studies.`,
    lvn,
    "scan",
  );
  frame(
    `Single prints: rows only ONE 30-minute period visited (the letter is shown). ${singles.length} of them today. A run of singles marks a fast, one-directional move.`,
    singles,
    "scan",
  );
  frame(
    `At the bottom, ${bottomTail.length} single prints at the low: a buying tail. Price dipped there in the first minutes and was rejected quickly. Dalton calls this excess — a sharp end that suggests the down-auction finished.`,
    bottomTail,
    "cursor",
  );
  const topRows = [n - 1, n - 2, n - 3];
  frame(
    `At the top, look for the opposite: several periods pressing the same high (${letters[n - 2] || letters[n - 1]}) and no tail. That is a POOR HIGH. The squared-off shelf just under it is a LEDGE. Both read as an auction that stopped rather than finished — the market often comes back. "Often" here is folklore with a plausible story, not a measured rate.`,
    topRows,
    "scan",
  );
  r.emit({
    note: `The whole picture: POC ${inr(L.poc)}, value ${inr(L.val)}–${inr(L.vah)}. Each feature is a hypothesis about who was active and how keen they were. None of them is a signal on its own.`,
    ladder: ladder(p, { idPrefix: "an", stateOf: vaStates(p, L), lines: levelLines(L) }),
    chart: chart("anatomy", [bars], step, FUT),
  });

  return {
    title: "Anatomy of a profile",
    code: ["HVN: a local peak in volume", "LVN: a local trough", "single print: one TPO letter", "tail: ≥ 2 singles at an extreme", "poor high/low: no tail, flat top"],
    frames: r.done(),
    legend: [
      { s: "match", label: "HVN / value area" },
      { s: "scan", label: "LVN / singles / poor high" },
      { s: "cursor", label: "tail / POC" },
    ],
  };
}

/* ================================================================== *
 * Lesson 7 — shapes
 * ================================================================== */

export function shapes(): Trace {
  const r = new Recorder();
  const list = [
    { s: S.SHAPE_D, name: "D — balanced", read: "Fat in the middle, thin at both ends: the market spent the day agreeing. Two-sided trade; neither side in control." },
    { s: S.SHAPE_P, name: "P — thin below, fat above", read: "A fast rise from the lows, then acceptance up high. Dalton's usual reading is short covering: sellers buying back, which can fade once they are done, rather than fresh buyers who stay." },
    { s: S.SHAPE_B_LOWER, name: "b — fat below, thin above", read: "The mirror: a fast drop, then acceptance down low. Usually read as long liquidation — holders selling out — rather than new sellers." },
    { s: S.SHAPE_DOUBLE, name: "B — two distributions", read: "Balance, a fast move on thin volume, balance again. The thin waist is an LVN between two accepted areas. Its value area can span both, which hides the gap." },
    { s: S.SHAPE_TREND, name: "Thin trend", read: "No dominant node: price kept moving, so no price collected much volume. Value moved all day; the close is near an extreme." },
  ];
  for (const { s, name, read } of list) {
    const { bars } = day(s);
    const p = buildProfile(bars, 10);
    const L = levels(p)!;
    r.emit({
      note: `${name}. ${read}`,
      ladder: ladder(p, { idPrefix: s.id, stateOf: vaStates(p, L), lines: levelLines(L) }),
      chart: chart(s.id, [bars], 10, FUT),
      stats: [
        { label: "POC in range", value: `${Math.round(pocPlace(bars, L) * 100)}% up` },
        { label: "value area", value: `${inr(L.val)}–${inr(L.vah)}` },
      ],
    });
  }
  r.emit({
    note: "A shape is a description of what happened, not a forecast. The stories attached to P and b (short covering, liquidation) are inferences about WHO traded; a profile cannot see who traded. Use shapes to ask better questions about the next session, not to answer them.",
  });
  return {
    title: "Five profile shapes",
    code: ["D: one hump, POC central", "P: hump high, thin tail low", "b: hump low, thin tail high", "B: two humps, LVN between", "trend: no dominant hump"],
    frames: r.done(),
    legend: [
      { s: "cursor", label: "POC" },
      { s: "match", label: "value area" },
    ],
  };
}

/* ================================================================== *
 * Lesson 8 — Dalton's day types, with the initial balance
 * ================================================================== */

export function dayTypes(): Trace {
  const r = new Recorder();
  const list = [
    { s: S.DAY_NORMAL, name: "Normal day", read: "A wide first hour sets the range and the rest of the day stays inside it. In secondary summaries of Dalton: larger participants set a wide range early, then little range extension. The CBOT guide puts about 85% or more of the range in the first hour." },
    { s: S.DAY_NORMAL_VARIATION, name: "Normal variation", read: "A moderate first hour, then range extension on ONE side — the CBOT guide says up to about double the initial balance." },
    { s: S.DAY_TREND, name: "Trend day", read: "Opens near one extreme, closes near the other, extending the range again and again. Secondary summaries of Dalton give a narrow first hour as the early clue — but a narrow first hour also starts quiet days, which is why it is only a clue." },
    { s: S.DAY_DOUBLE_DIST, name: "Double-distribution trend", read: "A narrow first-hour balance, a fast move, a second balance. Two humps with an LVN between." },
    { s: S.DAY_NEUTRAL, name: "Neutral day", read: "Range extension on BOTH sides of the initial balance, close back in the middle. Neither side won." },
    { s: S.DAY_NON_TREND, name: "Non-trend day", read: "A narrow range on low volume: nobody with size showed up. Secondary summaries describe it as typical ahead of news." },
  ];
  for (const { s, name, read } of list) {
    const { bars } = day(s);
    const display = resample(bars, 5);
    const ibBars = bars.slice(0, 60);
    const ibHi = hiOf(ibBars);
    const ibLo = loOf(ibBars);
    const ibRange = ibHi - ibLo;
    const up = Math.max(0, hiOf(bars) - ibHi);
    const dn = Math.max(0, ibLo - loOf(bars));
    const ibZone = { fromTime: bars[0].time, toTime: bars[59].time, label: "IB" };
    const ibLines = [
      { price: ibHi, title: "IB high", style: "dotted" as const },
      { price: ibLo, title: "IB low", style: "dotted" as const },
    ];
    r.emit({
      note: `${name}: the first hour (09:15–10:15) is the initial balance, ${inr(ibLo)}–${inr(ibHi)}, ${inr(ibRange)} points. What would you expect next?`,
      chart: {
        key: s.id,
        bars: display,
        reveal: 12,
        timeZones: [ibZone],
        lines: ibLines,
      },
      stats: [{ label: "IB range", value: `${inr(ibRange)} pts` }],
    });
    r.emit({
      note: `${name}. ${read}`,
      chart: {
        ...chart(s.id, [bars], 10, FUT),
        timeZones: [ibZone],
        lines: ibLines,
      },
      stats: [
        { label: "IB range", value: `${inr(ibRange)} pts` },
        { label: "extension up", value: `${inr(up)} (${(up / ibRange).toFixed(1)}× IB)` },
        { label: "extension down", value: `${inr(dn)} (${(dn / ibRange).toFixed(1)}× IB)` },
      ],
    });
  }
  r.emit({
    note: "These six labels are Dalton's classification and they are applied AFTER the day ends. The useful part for a rule-builder is the measurable pieces underneath — initial balance width, range extension per side, where the close sits — which you can compute live without hindsight.",
  });
  return {
    title: "Dalton's day types",
    code: ["IB = range of the first 60 minutes", "extension = beyond IB high / low", "type = f(IB width, extension per side, close location)"],
    frames: r.done(),
    legend: [{ s: "cursor", label: "IB window / POC" }, { s: "match", label: "value area" }],
  };
}

/* ================================================================== *
 * Lesson 5 — same data, different platforms
 * ================================================================== */

export function platforms(): Trace {
  const r = new Recorder();
  // Rows 99..110 (1 point each), lowest first: the worked example from the
  // research notes, reproduced by scripts/profile-check.mts.
  const small: Profile = { lo: 99, step: 1, bins: [10, 40, 70, 15, 20, 90, 100, 60, 20, 30, 10, 5] };
  const methods: { m: VaMethod; name: string; how: string }[] = [
    { m: "cbot", name: "CBOT / Dalton (this course)", how: "two rows at a time, larger pair wins, stop at 70% or more" },
    { m: "sierra", name: "Sierra Chart default", how: "ONE row at a time, a tie takes both, stop at 70% or more" },
    { m: "tradingview", name: "TradingView volume profile", how: "one row at a time, STOP BEFORE passing 70% — so at most 70%" },
  ];
  for (const { m, name, how } of methods) {
    const v = valueAreaBy(small.bins, m)!;
    r.emit({
      note: `${name}: ${how}. Value area rows ${99 + v.from} to ${99 + v.to}, holding ${pct(v.inside / v.total)} of the volume.`,
      ladder: ladder(small, {
        idPrefix: "pf",
        stateOf: (i) => (i === pocIndex(small.bins) ? "cursor" : i >= v.from && i <= v.to ? "match" : undefined),
        tagOf: (i) => String(small.bins[i]),
        lines: [
          { price: 99 + v.to + 1, label: "VAH" },
          { price: 99 + v.from, label: "VAL" },
        ],
      }),
      stats: [
        { label: "VAL", value: 99 + v.from },
        { label: "VAH", value: 99 + v.to + 1 },
        { label: "share", value: pct(v.inside / v.total) },
      ],
    });
  }
  r.emit({
    note: "Same twelve rows, three value-area lows: 101, 102, 103. The two-row method reaches past the thin 102–103 rows to collect the big 101 row; the one-row methods stop short. NinjaTrader adds another variable: its documented default is 68%, not 70%, and its expansion rule is not documented at all.",
  });

  const { bars } = day(S.NIFTY_OCT1);
  const p = buildProfile(bars, 5);
  for (const { m, name } of methods) {
    const v = valueAreaBy(p.bins, m)!;
    r.emit({
      note: `1 Oct 2026 (synthetic bars), 5-point rows, ${name}: VAL ${inr(p.lo + v.from * 5)}, VAH ${inr(p.lo + (v.to + 1) * 5)}.`,
      ladder: ladder(p, {
        idPrefix: "pf-oct",
        stateOf: (i) => (i === pocIndex(p.bins) ? "cursor" : i >= v.from && i <= v.to ? "match" : undefined),
        lines: [
          { price: p.lo + (v.to + 1) * 5, label: "VAH" },
          { price: p.lo + v.from * 5, label: "VAL" },
        ],
      }),
      stats: [
        { label: "VAL", value: inr(p.lo + v.from * 5) },
        { label: "VAH", value: inr(p.lo + (v.to + 1) * 5) },
        { label: "share", value: pct(v.inside / v.total) },
      ],
    });
  }
  r.emit({
    note: "If your strategy builder computes VAH/VAL one way and you check it against a chart computed another way, a few points of disagreement is expected, not a bug. Any rule that triggers ON a level inherits this. Write down the method — row size, one or two rows, the stop rule, the percentage — next to every backtest.",
  });
  return {
    title: "Same data, three platforms",
    code: [
      "cbot:        compare v[hi+1]+v[hi+2] vs v[lo−1]+v[lo−2]; stop at ≥ 70%",
      "sierra:      compare v[hi+1] vs v[lo−1]; tie → both; stop at ≥ 70%",
      "tradingview: compare v[hi+1] vs v[lo−1]; stop before > 70%",
    ],
    frames: r.done(),
    legend: [
      { s: "cursor", label: "POC" },
      { s: "match", label: "value area" },
    ],
  };
}

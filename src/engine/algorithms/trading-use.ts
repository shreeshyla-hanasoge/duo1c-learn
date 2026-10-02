/**
 * Volume Profile visualisers, part 2: using profiles across days, and
 * testing what they claim. Lessons 9–18. Every session is synthetic.
 */
import { Recorder, type Frame, type Trace } from "../trace";
import {
  addProfiles,
  buildProfile,
  levels,
  resample,
  sessionRangeSoFar,
  zoneOf,
  type Bar,
  type Levels,
} from "../trading/profile";
import { eightyRule, openPlace } from "../trading/rules";
import { rng, type Scenario } from "../trading/sessions";
import * as S from "../trading/scenarios";
import {
  chart,
  chartLines,
  clock,
  day,
  hiOf,
  inr,
  ladder,
  levelLines,
  loOf,
  profileSession,
  vaStates,
  vol,
} from "../trading/viz";

const FUT = "NIFTY fut (synthetic)";

/** A two-day chart: yesterday whole, today revealed up to `todayBars` one-minute bars. */
function twoDay(
  key: string,
  y: Bar[],
  t: Bar[],
  todayBars: number,
  yL: Levels,
  step = 5,
): Frame["chart"] {
  const shown = t.slice(0, Math.max(1, todayBars));
  return {
    key,
    bars: [...resample(y, 5), ...resample(t, 5)],
    reveal: 75 + Math.ceil(shown.length / 5),
    profile: {
      step,
      source: FUT,
      sessions: [profileSession(y, step), profileSession(shown, step, shown.length < t.length)],
    },
    lines: chartLines(yL),
  };
}

/* ================================================================== *
 * Lesson 9 — the open
 * ================================================================== */

export function openTypes(): Trace {
  const r = new Recorder();
  const y = day(S.OPEN_YESTERDAY);
  const yHi = hiOf(y.bars);
  const yLo = loOf(y.bars);
  const list: { s: Scenario; name: string; early: string; read: string }[] = [
    {
      s: S.OPEN_DRIVE,
      name: "Open-drive",
      early: "It opens above yesterday's value and goes straight up from the first minute, never trading back to the open.",
      read: "Dalton calls the open-drive the strongest, highest-confidence open, with the lowest odds of price coming back to the opening level — and if it does come back, something has changed (Markets in Profile, ch. 8). The failure: drives that run out in the first hour and spend the rest of the day giving it back.",
    },
    {
      s: S.OPEN_TEST_DRIVE,
      name: "Open-test-drive",
      early: "It opens above value, first tests DOWN to yesterday's VAH, finds buyers there, then drives up.",
      read: "The test checks for business beyond a known reference; finding none, the drive follows. Dalton ranks it the second most confident open, and notes it often fixes one extreme of the day. The failure: a 'test' that is really the start of a move back into value.",
    },
    {
      s: S.OPEN_REJECTION_REVERSE,
      name: "Open-rejection-reverse",
      early: "It opens near yesterday's high, pushes up, meets sellers and is rejected — then reverses back through the open.",
      read: "The first direction was tried and met opposite activity strong enough to drive price back through the open. Dalton rates it lower confidence than the two drives and warns that a later reversal is a serious possibility. The failure: a second push in the first direction after the 'reversal'.",
    },
    {
      s: S.OPEN_AUCTION,
      name: "Open-auction",
      early: "It opens inside yesterday's value and rotates around the open, trading both ways.",
      read: "No one is in a hurry. For an open-auction inside the prior day's value and range, Dalton expects a low-conviction day and advises not trading the first several periods. The failure: a late breakout that a trader who 'knew' it was a balance day fades into.",
    },
  ];
  for (const { s, name, early, read } of list) {
    const t = day(s);
    const place = openPlace(t.bars[0].open, y.L, yHi, yLo);
    r.emit({
      note: `${name}? Today opens at ${inr(t.bars[0].open)}: ${place} (yesterday's value ${inr(y.L.val)}–${inr(y.L.vah)}, range ${inr(yLo)}–${inr(yHi)}). First 30 minutes: ${early}`,
      chart: twoDay(s.id, y.bars, t.bars, 30, y.L),
      stats: [
        { label: "open", value: inr(t.bars[0].open) },
        { label: "open zone", value: place },
      ],
    });
    const tL = t.L;
    r.emit({
      note: `${name}, the whole day. ${read}`,
      chart: twoDay(s.id, y.bars, t.bars, t.bars.length, y.L),
      stats: [
        { label: "today's value", value: `${inr(tL.val)}–${inr(tL.vah)}` },
        { label: "close", value: inr(t.bars[t.bars.length - 1].close) },
      ],
    });
  }
  r.emit({
    note: "Opening types are judged from the first few minutes to the first half hour, and the boundaries between them are judgement calls. Before you can test one, you have to write it as a rule — for example, 'open-drive = opens outside value AND the first 15 minutes never trade back through the open'. Then it is a filter you can count, rather than a story you can always fit.",
  });
  return {
    title: "Four ways to open",
    code: [
      "where: open vs yesterday's VAH, VAL, high, low",
      "how:   first 15–30 minutes — drive, test then drive,",
      "       reject and reverse, or rotate around the open",
    ],
    frames: r.done(),
    legend: [{ s: "cursor", label: "yesterday's POC (dotted)" }, { s: "match", label: "value area" }],
  };
}

/* ================================================================== *
 * Lesson 11 — the 80% rule, step by step
 * ================================================================== */

export function eighty(): Trace {
  const r = new Recorder();
  const y = day(S.OPEN_YESTERDAY);
  for (const s of [S.EIGHTY_FILL, S.EIGHTY_FAIL]) {
    const t = day(s);
    const e = eightyRule(t.bars, y.L);
    const key = s.id;
    r.emit({
      note: `${s.label}. Step 1 — does the rule even apply? It opens at ${inr(t.bars[0].open)}, ${e.side} yesterday's value (${inr(y.L.val)}–${inr(y.L.vah)}). Yes. The far edge, ${inr(e.target!)}, is the target.`,
      line: 0,
      chart: twoDay(key, y.bars, t.bars, 1, y.L),
      stats: [{ label: "applies", value: e.applies ? "yes" : "no" }, { label: "target", value: inr(e.target!) }],
    });
    for (let k = 0; k <= e.trigger; k++) {
      const end = (k + 1) * 30;
      const close = t.bars[end - 1].close;
      const z = zoneOf(close, y.L.vah, y.L.val);
      r.emit({
        note:
          k === e.trigger
            ? `Period ${k + 1} (${clock(t.bars[end - 30].time)}–${clock(t.bars[end - 1].time)}) also closes inside value at ${inr(close)}. That is two in a row: the rule TRIGGERS. Its claim: about an 80% chance of reaching ${inr(e.target!)} today.`
            : `Period ${k + 1} (${clock(t.bars[end - 30].time)}–${clock(t.bars[end - 1].time)}) closes at ${inr(close)}: ${z} value. ${z === "inside" ? "One in value." : "Not yet."}`,
        line: k === e.trigger ? 2 : 1,
        chart: twoDay(key, y.bars, t.bars, end, y.L),
        stats: [{ label: "period close", value: inr(close) }, { label: "in value", value: z === "inside" ? "yes" : "no" }],
      });
    }
    r.emit({
      note: e.filled
        ? `Filled: price reached ${inr(e.target!)} at ${clock(t.bars[e.filledAt].time)}. This is the case the rule is remembered for.`
        : `Failed: after triggering, price turned back down and never reached ${inr(e.target!)}. A trader who bought the trigger with a target at VAH and a stop below VAL took the full loss. This case is just as real; it is simply less often remembered.`,
      line: 3,
      chart: twoDay(key, y.bars, t.bars, t.bars.length, y.L),
      stats: [{ label: "outcome", value: e.filled ? "filled" : "failed" }],
    });
  }
  r.emit({
    note: "Two synthetic days show the mechanics, not the hit rate. On the evidence: a 2008 Team LBR post quoting Dalton's first edition reports that his rule does not require the two periods to be consecutive, that he called the context-free trade little better than a coin flip, and that the '80%' figure is not in his text. The only test found with a stated method (ES futures, 2008, about 40 triggers) filled about 40% of the time. Nothing published covers NIFTY or MCX. This course's version requires consecutive closes inside value — one reading among several.",
  });
  return {
    title: "The 80% rule, one period at a time",
    code: [
      "1. today opens outside yesterday's value",
      "2. a 30-min period closes inside value",
      "3. two such periods in a row → trigger",
      "4. success = far edge of value traded before the close",
    ],
    frames: r.done(),
    legend: [{ s: "cursor", label: "yesterday's POC (dotted)" }, { s: "match", label: "value area" }],
  };
}

/* ================================================================== *
 * Lesson 10 — value relationships between days
 * ================================================================== */

export function valueRelationships(): Trace {
  const r = new Recorder();
  const y = day(S.OPEN_YESTERDAY);
  const notes: Record<string, string> = {
    Higher: "Today's whole value area sits above yesterday's. Buyers accepted higher prices. Dalton weighs where VALUE moved more heavily than where price closed.",
    "Overlapping higher": "Today's value overlaps yesterday's but is shifted up. A weaker version of 'higher' — some acceptance higher, some of yesterday's value still trading.",
    Inside: "Today's value sits within yesterday's. The market is contracting: neither side pushed. Commonly read as the market waiting for news — an interpretation, not a measured tendency.",
    Outside: "Today's value is wider than yesterday's on both sides. Both sides were active; the auction explored and came back.",
    "Overlapping lower": "Shifted down, still overlapping. Some acceptance lower.",
    Lower: "Entirely below yesterday's value. Sellers accepted lower prices.",
  };
  for (const { name, s } of S.RELATIONS) {
    const t = day(s);
    r.emit({
      note: `${name}. ${notes[name]}`,
      chart: twoDay(s.id, y.bars, t.bars, t.bars.length, y.L),
      stats: [
        { label: "yesterday", value: `${inr(y.L.val)}–${inr(y.L.vah)}` },
        { label: "today", value: `${inr(t.L.val)}–${inr(t.L.vah)}` },
        { label: "relationship", value: name },
      ],
    });
  }
  r.emit({
    note: "Value migration versus price migration: a close far above yesterday is PRICE moving. VALUE moving is where the volume moved. A spike up that closes high on thin volume, with value unchanged, says much less than a day whose value area moved up. Write the relationship from the two value areas, not from the closes.",
  });
  return {
    title: "Value relationships between two days",
    code: [
      "higher:  today VAL > yesterday VAH",
      "lower:   today VAH < yesterday VAL",
      "inside:  today within yesterday",
      "outside: today contains yesterday",
      "else overlapping higher / lower",
    ],
    frames: r.done(),
    legend: [{ s: "match", label: "value area" }, { s: "cursor", label: "POC" }],
  };
}

/* ================================================================== *
 * Lesson 13 — the developing profile and look-ahead
 * ================================================================== */

export function developing(): Trace {
  const r = new Recorder();
  const { bars, L } = day(S.NIFTY_OCT1);
  const display = resample(bars, 5);
  const history: { t: string; poc: number }[] = [];
  for (let end = 30; end <= bars.length; end += 30) {
    const upTo = Math.min(end, bars.length);
    const p = buildProfile(bars.slice(0, upTo), 5);
    const D = levels(p)!;
    history.push({ t: clock(bars[upTo - 1].time), poc: D.poc });
    r.emit({
      note:
        end === 30
          ? `At 09:44 the developing profile has 30 bars. Its POC, ${inr(D.poc)}, is the busiest price SO FAR — not today's POC. Nobody at 09:44 knows today's POC.`
          : `${clock(bars[upTo - 1].time)}: developing POC ${inr(D.poc)}, value ${inr(D.val)}–${inr(D.vah)}.${Math.abs(D.poc - history[history.length - 2].poc) > 40 ? " It just MOVED a long way — the upper hump overtook the lower one." : ""}`,
      ladder: ladder(p, { idPrefix: "d", stateOf: vaStates(p, D), lines: levelLines(D, "dev ") }),
      chart: {
        key: "developing",
        bars: display,
        reveal: Math.ceil(upTo / 5),
        profile: { step: 5, source: FUT, sessions: [profileSession(bars.slice(0, upTo), 5, true)] },
      },
      stats: [
        { label: "time", value: clock(bars[upTo - 1].time) },
        { label: "dev POC", value: inr(D.poc) },
        { label: "dev VAH", value: inr(D.vah) },
        { label: "dev VAL", value: inr(D.val) },
      ],
    });
  }
  const early = history[3];
  r.emit({
    note: `The look-ahead trap. Final POC: ${inr(L.poc)}. At ${early.t} the developing POC was ${inr(early.poc)}. A backtest that tests a 11:00 entry against "today's POC" is using ${inr(L.poc)} — a level the developing POC did not even reach until the afternoon, and that nobody could know was FINAL until the 15:30 close. Every intraday rule must use the developing values as of the bar, or yesterday's final ones.`,
    chart: {
      key: "developing",
      bars: display,
      profile: { step: 5, source: FUT, sessions: [profileSession(bars, 5)] },
    },
    stats: history.filter((_, i) => i % 2 === 1).map((h) => ({ label: h.t, value: inr(h.poc) })),
  });
  return {
    title: "Today's profile, as it forms",
    code: [
      "for each bar t:",
      "  profile_t = build(bars[0..t])     // only the past",
      "  devPOC_t, devVAH_t, devVAL_t = levels(profile_t)",
      "final levels exist only after the last bar",
    ],
    frames: r.done(),
    legend: [
      { s: "cursor", label: "developing POC" },
      { s: "match", label: "developing value area" },
    ],
  };
}

/* ================================================================== *
 * Lesson 12 — yesterday's levels and naked POCs
 * ================================================================== */

export function nakedPoc(): Trace {
  const r = new Recorder();
  const days = S.WEEK.map((s) => day(s));
  const all = days.map((d) => d.bars);
  for (let k = 1; k <= days.length; k++) {
    const shown = all.slice(0, k);
    const naked = days.slice(0, k - 1).filter((d, i) =>
      all.slice(i + 1, k).every((later) => !(loOf(later) <= d.L.poc && hiOf(later) >= d.L.poc)),
    );
    const view = chart("naked", all, 5, FUT);
    r.emit({
      note:
        k === 1
          ? `Day 1, ${S.WEEK[0].date}: POC ${inr(days[0].L.poc)}. With "extend POC" on, each POC line runs right until a later bar trades through it.`
          : `Day ${k}, ${S.WEEK[k - 1].date}: POC ${inr(days[k - 1].L.poc)}. Still naked (untested) from earlier days: ${naked.length ? naked.map((d) => inr(d.L.poc)).join(", ") : "none"}.`,
      chart: {
        ...view,
        reveal: 75 * k,
        profile: { ...view.profile!, sessions: shown.map((d) => profileSession(d, 5)), extendPoc: true },
      },
      stats: [
        { label: "days", value: k },
        { label: "naked POCs", value: naked.length },
      ],
    });
  }
  r.emit({
    note: "A naked POC is a level traders watch because 'the market tends to revisit it'. Whether it does so more often than any other price that close to the current one has, as far as this course could find, not been tested in published work. If you trade it, measure it first: how often does price touch a random level the same distance away?",
  });
  return {
    title: "Naked POCs across a week",
    code: ["for each day d: line at POC_d", "extend right until a later bar's range contains it", "still extended = naked"],
    frames: r.done(),
    legend: [{ s: "cursor", label: "POC lines" }, { s: "match", label: "value area" }],
  };
}

/* ================================================================== *
 * Lesson 14 — composites
 * ================================================================== */

export function composite(): Trace {
  const r = new Recorder();
  const days = S.WEEK.map((s) => day(s).bars);
  let comp = buildProfile(days[0], 10, null);
  for (let k = 0; k < days.length; k++) {
    if (k > 0) comp = addProfiles(comp, buildProfile(days[k], 10, null));
    const C = levels(comp)!;
    const one = levels(buildProfile(days[k], 10))!;
    r.emit({
      note:
        k === 0
          ? "A composite adds sessions row by row. Because every day's rows sit on the SAME absolute grid (multiples of 10), row 22,400–22,410 means the same thing on Monday and Friday — so the bins simply add."
          : `Add ${S.WEEK[k].date}: its own POC is ${inr(one.poc)}; the ${k + 1}-day composite POC is ${inr(C.poc)}, composite value ${inr(C.val)}–${inr(C.vah)}.`,
      ladder: ladder({ ...comp, bins: comp.bins.map((v) => Math.round(v)) }, {
        idPrefix: "c",
        stateOf: vaStates(comp, C),
        lines: levelLines(C, "wk "),
      }),
      chart: { ...chart("composite", days, 10, FUT, { profile: { step: 10, source: FUT, sessions: days.slice(0, k + 1).map((d) => profileSession(d, 10)), mode: "both" } }), reveal: 75 * (k + 1) },
      stats: [
        { label: "days", value: k + 1 },
        { label: "composite POC", value: inr(C.poc) },
        { label: "composite VA", value: `${inr(C.val)}–${inr(C.vah)}` },
      ],
    });
  }
  r.emit({
    note: "Had each day's rows started at that day's own low (22,258.15, 22,312.10 …), no two days' rows would line up and there would be nothing to add. That is the whole reason for the absolute grid. Session, weekly, monthly, fixed-range and anchored profiles are all the same sum over a different set of bars; choose the window to match the holding period of the decision you are making.",
  });
  return {
    title: "Composite: a week on one grid",
    code: ["composite = Σ profile(day) over the window", "same grid → add bin by bin", "levels(composite) as usual"],
    frames: r.done(),
    legend: [{ s: "cursor", label: "composite POC" }, { s: "match", label: "composite value area" }],
  };
}

/* ================================================================== *
 * Lesson 15 — VWAP next to the profile
 * ================================================================== */

export function vwapVsProfile(): Trace {
  const r = new Recorder();
  const { bars, L } = day(S.NIFTY_OCT1);
  const display = resample(bars, 5);
  // VWAP and a volume-weighted standard deviation, on one-minute bars, using
  // the typical price (H + L + C) / 3 as each bar's price.
  let pv = 0;
  let v = 0;
  let pv2 = 0;
  const vw: number[] = [];
  const sd: number[] = [];
  for (const b of bars) {
    const tp = (b.high + b.low + b.close) / 3;
    pv += tp * b.volume;
    pv2 += tp * tp * b.volume;
    v += b.volume;
    const m = pv / v;
    vw.push(m);
    sd.push(Math.sqrt(Math.max(0, pv2 / v - m * m)));
  }
  const at5 = (arr: number[], f = (x: number) => x) =>
    display.map((d, i) => ({ time: d.time, value: f(arr[Math.min(arr.length - 1, i * 5 + 4)]) }));
  const series = (upTo: number) => {
    const cut = (pts: { time: number; value: number | null }[]) =>
      pts.map((p, i) => (i < Math.ceil(upTo / 5) ? p : { time: p.time, value: null }));
    return [
      { id: "vwap", data: cut(at5(vw)), s: "scan" as const },
      { id: "up1", data: cut(display.map((d, i) => ({ time: d.time, value: vw[Math.min(bars.length - 1, i * 5 + 4)] + sd[Math.min(bars.length - 1, i * 5 + 4)] }))), s: "scan" as const, style: "dotted" as const },
      { id: "dn1", data: cut(display.map((d, i) => ({ time: d.time, value: vw[Math.min(bars.length - 1, i * 5 + 4)] - sd[Math.min(bars.length - 1, i * 5 + 4)] }))), s: "scan" as const, style: "dotted" as const },
    ];
  };
  for (const upTo of [60, 150, 240, 375]) {
    const D = levels(buildProfile(bars.slice(0, upTo), 5))!;
    r.emit({
      note:
        upTo === 375
          ? `Close: VWAP ${inr(vw[upTo - 1])}, POC ${inr(L.poc)}. VWAP is the AVERAGE price of the day's volume; the POC is the most COMMON price. On a two-hump day the average falls between the humps — in the thin waist where almost nothing traded. A "VWAP support" line can sit where the market did least business.`
          : `${clock(bars[upTo - 1].time)}: VWAP ${inr(vw[upTo - 1])} (orange line, dotted ±1 standard deviation); developing POC ${inr(D.poc)}. One number versus a whole distribution.`,
      chart: {
        key: "vwap",
        bars: display,
        reveal: Math.ceil(upTo / 5),
        profile: { step: 5, source: FUT, sessions: [profileSession(bars.slice(0, upTo), 5, upTo < 375)] },
        series: series(upTo),
      },
      stats: [
        { label: "VWAP", value: inr(vw[upTo - 1]) },
        { label: "±1 SD", value: `${inr(sd[upTo - 1])} pts` },
        { label: "dev POC", value: inr(D.poc) },
      ],
    });
  }
  r.emit({
    note: "What each adds. VWAP: a benchmark execution desks measure their fills against (that is how it began, in a 1988 transaction-cost study), which is why so many traders watch it — whether price actually reacts there more than at other levels is a separate, testable question. Anchored VWAP: the same, from an event you choose. Deviation bands: the spread of the day's volume around that mean. Order-flow delta and footprint charts: WHO was aggressive at each price, which needs tick data with trade direction — one-minute bars cannot give it. Open interest: whether positions were opened or closed, once a day for NSE futures and options.",
  });
  return {
    title: "VWAP next to the profile",
    code: ["tp = (high + low + close) / 3", "VWAP = Σ tp·vol / Σ vol", "SD = √(Σ tp²·vol / Σ vol − VWAP²)"],
    frames: r.done(),
    legend: [
      { s: "scan", label: "VWAP (solid) and ±1 SD (dotted)" },
      { s: "cursor", label: "POC" },
      { s: "match", label: "value area" },
    ],
  };
}

/* ================================================================== *
 * Lesson 16 — India: which volume, and how long is a session?
 * ================================================================== */

export function volumeSource(): Trace {
  const r = new Recorder();
  const { bars } = day(S.NIFTY_OCT1);
  const n = bars.length;
  // Three ILLUSTRATIVE volume series over the same prices. They are
  // reweightings chosen to show the mechanism; they are not measurements of
  // any real ETF or of NIFTY's constituents.
  const models: { name: string; why: string; w: (b: Bar, i: number) => number }[] = [
    { name: "Near-month future volume", why: "The usual choice: the future trades the most and its volume is one number per bar.", w: (b) => b.volume },
    {
      name: "Heavier at the open and close",
      why: "A source whose volume clusters at the bell — say an ETF whose flows arrive at the open and at the close. Same prices, different weights.",
      w: (b, i) => {
        const x = (i + 0.5) / n;
        const u = (2 * x - 1) * (2 * x - 1);
        return b.volume * (0.3 + 2.5 * u * u);
      },
    },
    {
      name: "Weighted by movement",
      why: "A source whose volume rises with how much price moved in the bar — closer to how cash turnover in the constituents can behave on busy bars.",
      w: (b) => b.volume * (0.4 + Math.abs(b.close - b.open) / 4),
    },
  ];
  const results: { name: string; L: Levels }[] = [];
  for (const m of models) {
    const rew = bars.map((b, i) => ({ ...b, volume: m.w(b, i) }));
    const p = buildProfile(rew, 5);
    const L = levels(p)!;
    results.push({ name: m.name, L });
    r.emit({
      note: `${m.name}. ${m.why} POC ${inr(L.poc)}, value ${inr(L.val)}–${inr(L.vah)}.`,
      ladder: ladder(p, { idPrefix: "vs", stateOf: vaStates(p, L), lines: levelLines(L) }),
      stats: [
        { label: "POC", value: inr(L.poc) },
        { label: "VAH", value: inr(L.vah) },
        { label: "VAL", value: inr(L.val) },
      ],
    });
  }
  r.emit({
    note: "NIFTY itself trades no volume — it is a calculated number. Any NIFTY profile borrows its volume from something else, and the levels move with that choice. The future also trades at a premium or discount to the index (the basis), so its prices are not the index's prices either. Pick one source, say which in every chart, and never mix sources across days.",
    stats: results.map((x) => ({ label: x.name, value: `VAL ${inr(x.L.val)} · POC ${inr(x.L.poc)}` })),
  });
  return {
    title: "Same prices, three volume sources",
    code: ["price path fixed", "volume_i = weight(source, bar i)", "profile and levels move with the weights"],
    frames: r.done(),
    legend: [{ s: "cursor", label: "POC" }, { s: "match", label: "value area" }],
  };
}

export function mcxSession(): Trace {
  const r = new Recorder();
  const { bars } = day(S.MCX_CRUDE);
  const step = 2;
  const split = 480; // 09:00 + 8h = 17:00
  const parts = [
    { name: "Whole session, 09:00–23:30", b: bars },
    { name: "Indian day, 09:00–17:00", b: bars.slice(0, split) },
    { name: "Evening, 17:00–23:30", b: bars.slice(split) },
  ];
  const src = "MCX crude fut (synthetic)";
  for (const { name, b } of parts) {
    const p = buildProfile(b, step);
    const L = levels(p)!;
    r.emit({
      note: `${name}: POC ${inr(L.poc)}, value ${inr(L.val)}–${inr(L.vah)}, ${vol(b.reduce((a, x) => a + x.volume, 0))} contracts.`,
      ladder: ladder(p, { idPrefix: `mcx${name.length}`, stateOf: vaStates(p, L), lines: levelLines(L) }),
      chart: {
        key: "mcx",
        bars: resample(bars, 10),
        profile: { step, source: src, sessions: name.startsWith("Whole") ? [profileSession(bars, step)] : [profileSession(bars.slice(0, split), step), profileSession(bars.slice(split), step)] },
      },
      stats: [{ label: "POC", value: inr(L.poc) }, { label: "value", value: `${inr(L.val)}–${inr(L.vah)}` }],
    });
  }
  r.emit({
    note: "MCX's 14½-hour session spans two different markets: a thin Indian morning and a busy evening once US trading is under way. One whole-session profile is dominated by the evening; split it and the morning's own value appears. Neither is wrong. Decide based on when your strategy trades, and keep the split the same every day, including when the close moves between 23:30 and 23:55 with US daylight saving.",
  });
  return {
    title: "MCX crude: one session or two?",
    code: ["whole = build(09:00–23:30)", "day   = build(09:00–17:00)", "eve   = build(17:00–23:30)"],
    frames: r.done(),
    legend: [{ s: "cursor", label: "POC" }, { s: "match", label: "value area" }],
  };
}

/* ================================================================== *
 * Lessons 12 and 17 — the reader's three rule inputs, bar by bar
 * ================================================================== */

export function ruleInputs(): Trace {
  const r = new Recorder();
  const y = day(S.NIFTY_SEP30);
  const t = day(S.NIFTY_OCT1);
  const ranges = sessionRangeSoFar(t.bars, y.L.vah, y.L.val);
  const openZ = zoneOf(t.bars[0].open, y.L.vah, y.L.val);
  for (const upTo of [1, 5, 30, 90, 180, 210, 240, 300, 375]) {
    const b = t.bars[upTo - 1];
    const z = zoneOf(b.close, y.L.vah, y.L.val);
    r.emit({
      note:
        upTo === 1
          ? `30 Sep value: VAL ${inr(y.L.val)}, POC ${inr(y.L.poc)}, VAH ${inr(y.L.vah)}. 1 Oct opens at ${inr(t.bars[0].open)} — EXACTLY on VAL. With edges counted as inside, open zone = ${openZ}. A platform that treats the edge as outside would say "below". Edge conventions change real classifications.`
          : `${clock(b.time)}: this bar closes at ${inr(b.close)} → zone ${z}. Session range so far: ${ranges[upTo - 1]}.${upTo === 210 ? " The range just went from 'below' to 'both': today has now traded on both sides of yesterday's value." : ""}`,
      line: upTo === 1 ? 0 : 1,
      chart: twoDay("rules", y.bars, t.bars, upTo, y.L),
      stats: [
        { label: "open zone", value: openZ },
        { label: "zone (this bar)", value: z },
        { label: "session range", value: ranges[upTo - 1] },
      ],
    });
  }
  r.emit({
    note: "Three inputs, three different questions. Zone: where is price NOW. Open zone: where did today START — fixed from 09:15 onward. Session range: where has today BEEN — it can only grow (inside → above/below → both) and never shrink. All three use only yesterday's final levels and today's bars so far, so none of them looks ahead.",
  });
  return {
    title: "Zone, open zone and session range",
    code: [
      "openZone = zone(today.open)                 // fixed all day",
      "zone(bar) = above if close > yVAH, below if close < yVAL, else inside",
      "range = inside | above | below | both      // high > yVAH?  low < yVAL?",
    ],
    frames: r.done(),
    legend: [{ s: "cursor", label: "yesterday's POC (dotted)" }, { s: "match", label: "value area" }],
  };
}

/* ================================================================== *
 * Lesson 18 — what noise alone looks like
 * ================================================================== */

export function noise(): Trace {
  const r = new Recorder();
  // 1,191 simulated trades in which entry location has NO effect: every
  // trade draws from the same win rate and payoff whatever its zone. The
  // payoff is skewed like option buying — many small losses, fewer larger
  // wins — and tuned so the overall profit factor lands near 1.7.
  type T = { zone: 0 | 1 | 2; year: number; pnl: number; dow: number; open: 0 | 1 | 2 };
  const years = [2023, 2024, 2025, 2026];
  const world = (seed: number): T[] => {
    const rand = rng(seed);
    const out: T[] = [];
    for (let i = 0; i < 1191; i++) {
      const u = rand();
      const zone = (u < 0.34 ? 0 : u < 0.75 ? 1 : 2) as 0 | 1 | 2;
      const win = rand() < 0.38;
      const pnl = win ? 0.4 + 2.6 * rand() * rand() * 2 : -(0.4 + 0.4 * rand());
      out.push({
        zone,
        year: years[Math.min(3, Math.floor(rand() * 3.6))],
        pnl,
        dow: Math.floor(rand() * 5),
        open: Math.floor(rand() * 3) as 0 | 1 | 2,
      });
    }
    return out;
  };
  const trades = world(1191);
  const pf = (xs: T[]) => {
    let w = 0;
    let l = 0;
    for (const t of xs) {
      if (t.pnl > 0) w += t.pnl;
      else l -= t.pnl;
    }
    return l === 0 ? Infinity : w / l;
  };
  const ci = (xs: T[]) => {
    const b = rng(xs.length * 7 + 1);
    const out: number[] = [];
    for (let k = 0; k < 400; k++) {
      const s: T[] = [];
      for (let j = 0; j < xs.length; j++) s.push(xs[Math.floor(b() * xs.length)]);
      out.push(pf(s));
    }
    out.sort((a, c) => a - c);
    return [out[20], out[379]] as const; // 90% bootstrap interval
  };
  const names = ["Below value", "Inside value", "Above value"];
  const view = (subset: T[], caption: string): Frame["intervals"] => ({
    domain: [0.6, 3.4],
    rows: [0, 1, 2].map((z) => {
      const xs = subset.filter((t) => t.zone === z);
      const [lo, hi] = ci(xs);
      return { id: `z${z}`, label: `${names[z]} · PF ${pf(xs).toFixed(2)} · n=${xs.length}`, lo, hi: Math.min(3.4, hi), lane: z, s: "scan" as const };
    }),
    sweep: 1,
    caption,
  });
  const all = [0, 1, 2].map((z) => pf(trades.filter((t) => t.zone === z)));
  r.emit({
    note: `A SIMULATION, not market data: 1,191 trades where the zone has NO effect — every trade draws from the same distribution. Yet the three profit factors come out ${all.map((x) => x.toFixed(2)).join(", ")}. Bars show 90% bootstrap intervals; the line marks PF 1. Differences this size appear from noise alone.`,
    intervals: view(trades, "All years, simulated"),
  });
  for (const yr of years) {
    const sub = trades.filter((t) => t.year === yr);
    const pfs = [0, 1, 2].map((z) => pf(sub.filter((t) => t.zone === z)));
    const order = [0, 1, 2].sort((a, b) => pfs[b] - pfs[a]).map((z) => names[z].split(" ")[0]).join(" > ");
    r.emit({
      note: `${yr} only (n=${sub.length}): order ${order}. With no real effect, the "best zone" changes from year to year — exactly the pattern a real zero-effect would leave.`,
      intervals: view(sub, `${yr}, simulated`),
    });
  }
  // Pockets: zone × open zone × weekday = 45 slices. Count the slices that
  // lost money in EVERY year — in this world, and across 200 more worlds
  // generated the same way, so the claim below is measured, not asserted.
  const losers = (ts: T[]) => {
    let n = 0;
    for (let z = 0; z < 3; z++)
      for (let o = 0; o < 3; o++)
        for (let d = 0; d < 5; d++) {
          const cell = ts.filter((t) => t.zone === z && t.open === o && t.dow === d);
          if (years.every((yr) => pf(cell.filter((t) => t.year === yr)) < 1)) n++;
        }
    return n;
  };
  const here = losers(trades);
  const WORLDS = 120;
  const counts = Array.from({ length: WORLDS }, (_, i) => losers(world(5000 + i)));
  const mean = counts.reduce((a, c) => a + c, 0) / counts.length;
  const atLeast2 = counts.filter((c) => c >= 2).length / counts.length;
  const atLeast1 = counts.filter((c) => c >= 1).length / counts.length;
  r.emit({
    note: `Now slice it 45 ways (zone × open zone × weekday) and ask which slices lost money in EVERY year. In this simulated world, ${here} did. Across ${WORLDS} more worlds with no real effect anywhere, the average was ${mean.toFixed(1)}; ${Math.round(atLeast1 * 100)}% of worlds had at least one such slice and ${Math.round(atLeast2 * 100)}% had two or more. Before trusting a "losing pocket", count how many pockets you looked at.`,
    stats: [
      { label: "slices examined", value: 45 },
      { label: "lost every year (this world)", value: here },
      { label: "worlds with ≥ 2", value: `${Math.round(atLeast2 * 100)}%` },
    ],
  });
  r.emit({
    note: `Your study: PF 1.90 below value, 1.75 inside, 1.51 above, heavily overlapping intervals, a different ordering each year, two small pockets losing consistently. Every part of that pattern also appears in worlds where zone has no effect at all — two always-losing pockets in about ${Math.round(atLeast2 * 100)}% of them, if you slice 45 ways (your own slicing may differ, and more slices make it likelier). The honest reading is not 'zone does not matter' — it is 'this data cannot show that it does'. That is a result, and a useful one: it stops you adding a filter that would only cut your sample.`,
  });
  return {
    title: "What noise alone looks like",
    code: ["simulate trades with NO zone effect", "PF per zone + bootstrap 90% interval", "repeat per year; count 'always losing' slices"],
    frames: r.done(),
    legend: [{ s: "scan", label: "90% interval per zone" }, { s: "cursor", label: "PF = 1 line" }],
  };
}

/**
 * The scenario library: every synthetic session the Volume Profile module
 * draws. ALL OF THESE ARE SYNTHETIC — see `sessions.ts` for how they are
 * generated and why. Each is shaped to show one idea; the path waypoints
 * read as a description of the day.
 *
 * Paths are [fraction of session, price]. An NSE session is 375 one-minute
 * bars (09:15–15:30), so 0.16 ≈ the end of the first hour (initial balance).
 */
import type { Scenario } from "./sessions.ts";

const NSE = { openIST: [9, 15] as [number, number], minutes: 375, tick: 0.05 };
const IB = 60 / 375; // initial balance, as a fraction of an NSE session

/**
 * The course's worked example. Tuned (seed and waypoints) so that, at 5-point
 * bins, POC = 22,447.5, VAH = 22,470 and VAL = 22,215 — the reader's own
 * platform's numbers for that day. The bars are synthetic; only those three
 * levels come from the reader's platform. `scripts/profile-check.mts` fails
 * if they ever drift.
 */
export const NIFTY_OCT1: Scenario = {
  id: "nifty-2026-10-01",
  label: "NIFTY near-month future, 1 Oct 2026 (synthetic bars)",
  date: "2026-10-01",
  ...NSE,
  seed: 545,
  path: [
    [0, 22290],
    [0.07, 22185],
    [0.2, 22250],
    [0.4, 22195],
    [0.52, 22280],
    [0.62, 22430],
    [0.8, 22450],
    [0.9, 22435],
    [0.95, 22462],
    [1, 22448],
  ],
  noise: 3.2,
  wick: 3,
  volume: 900,
  volumeWindows: [
    [0.6, 1, 1.2],
    [0.2, 0.5, 1.3],
  ],
};

/** The day before the worked example — a quiet balanced day. */
export const NIFTY_SEP30: Scenario = {
  id: "nifty-2026-09-30",
  label: "NIFTY near-month future, 30 Sep 2026 (synthetic)",
  date: "2026-09-30",
  ...NSE,
  seed: 77,
  path: [
    [0, 22330],
    [0.1, 22290],
    [0.25, 22350],
    [0.45, 22300],
    [0.65, 22345],
    [0.85, 22305],
    [1, 22320],
  ],
  noise: 3,
  wick: 2.5,
  volume: 850,
};

/* ---- Shapes (lesson 7) -------------------------------------------- */

const shape = (
  id: string,
  label: string,
  seed: number,
  path: [number, number][],
  extra: Partial<Scenario> = {},
): Scenario => ({
  id,
  label,
  date: "2026-09-14",
  ...NSE,
  seed,
  path,
  noise: 3,
  wick: 2.5,
  volume: 800,
  ...extra,
});

export const SHAPE_D = shape("shape-d", "D-shaped (balanced) day", 11, [
  [0, 22400],
  [0.08, 22350],
  [0.2, 22450],
  [0.35, 22380],
  [0.5, 22430],
  [0.65, 22385],
  [0.8, 22425],
  [1, 22405],
]);

export const SHAPE_P = shape(
  "shape-p",
  "P-shaped day: a fast rally, then acceptance up high",
  12,
  [
    [0, 22250],
    [0.04, 22240],
    [0.14, 22420],
    [0.3, 22455],
    [0.45, 22425],
    [0.6, 22460],
    [0.8, 22430],
    [1, 22450],
  ],
  { volumeWindows: [[0, 0.14, 0.7]] },
);

export const SHAPE_B_LOWER = shape(
  "shape-b",
  "b-shaped day: a fast drop, then acceptance down low",
  13,
  [
    [0, 22550],
    [0.04, 22560],
    [0.14, 22380],
    [0.3, 22345],
    [0.45, 22375],
    [0.6, 22340],
    [0.8, 22370],
    [1, 22350],
  ],
  { volumeWindows: [[0, 0.14, 0.7]] },
);

export const SHAPE_DOUBLE = shape(
  "shape-double",
  "B-shaped (double distribution) day",
  14,
  [
    [0, 22300],
    [0.1, 22270],
    [0.25, 22320],
    [0.4, 22280],
    [0.47, 22300],
    [0.53, 22440],
    [0.68, 22470],
    [0.84, 22430],
    [1, 22460],
  ],
  { volumeWindows: [[0.46, 0.54, 0.6]] },
);

export const SHAPE_TREND = shape(
  "shape-trend",
  "Thin trend day",
  15,
  [
    [0, 22200],
    [0.1, 22240],
    [0.2, 22280],
    [0.3, 22320],
    [0.4, 22360],
    [0.5, 22400],
    [0.6, 22440],
    [0.7, 22480],
    [0.8, 22520],
    [0.9, 22560],
    [1, 22600],
  ],
  { noise: 1.8 },
);

/* ---- Day types (lesson 8) — Dalton's six ------------------------- */

export const DAY_NORMAL = shape(
  "day-normal",
  "Normal day: a wide first hour that holds all day",
  21,
  [
    [0, 22400],
    [0.05, 22300],
    [IB, 22510],
    [0.35, 22380],
    [0.55, 22460],
    [0.75, 22370],
    [1, 22420],
  ],
  { volumeWindows: [[0, IB, 1.4]] },
);

export const DAY_NORMAL_VARIATION = shape(
  "day-normal-variation",
  "Normal variation day: range extension on one side, about one IB further",
  22,
  [
    [0, 22400],
    [0.06, 22440],
    [IB, 22360],
    [0.35, 22430],
    [0.5, 22470],
    [0.65, 22500],
    [0.8, 22470],
    [1, 22485],
  ],
);

export const DAY_TREND = shape(
  "day-trend",
  "Trend day: opens near one extreme, closes near the other",
  23,
  [
    [0, 22300],
    [IB, 22340],
    [0.3, 22400],
    [0.5, 22470],
    [0.7, 22540],
    [0.9, 22600],
    [1, 22610],
  ],
  { noise: 2.5 },
);

export const DAY_DOUBLE_DIST = { ...SHAPE_DOUBLE, id: "day-double-dist", label: "Double-distribution trend day" };

export const DAY_NEUTRAL = shape(
  "day-neutral",
  "Neutral day: range extension on BOTH sides, close in the middle",
  25,
  [
    [0, 22400],
    [0.07, 22440],
    [IB, 22370],
    [0.3, 22430],
    [0.42, 22490],
    [0.55, 22420],
    [0.7, 22320],
    [0.85, 22380],
    [1, 22405],
  ],
);

export const DAY_NON_TREND = shape(
  "day-non-trend",
  "Non-trend day: narrow range, low volume, no conviction",
  26,
  [
    [0, 22400],
    [0.2, 22420],
    [0.4, 22395],
    [0.6, 22415],
    [0.8, 22398],
    [1, 22410],
  ],
  { volume: 420, noise: 2 },
);

/* ---- The open (lessons 9 and 11) --------------------------------- *
 * One yesterday (a balanced day, value 22,300-ish to 22,400-ish) and six
 * todays that open in different places and do different things.          */

export const OPEN_YESTERDAY: Scenario = {
  id: "open-yesterday",
  label: "Yesterday (synthetic)",
  date: "2026-09-21",
  ...NSE,
  seed: 31,
  path: [
    [0, 22350],
    [0.1, 22300],
    [0.25, 22390],
    [0.45, 22320],
    [0.65, 22380],
    [0.85, 22330],
    [1, 22355],
  ],
  noise: 3,
  wick: 2.5,
  volume: 800,
};

const today = (
  id: string,
  label: string,
  seed: number,
  path: [number, number][],
  extra: Partial<Scenario> = {},
): Scenario => ({
  id,
  label,
  date: "2026-09-22",
  ...NSE,
  seed,
  path,
  noise: 3,
  wick: 2.5,
  volume: 800,
  ...extra,
});

export const OPEN_DRIVE = today(
  "open-drive",
  "Open-drive: opens above value and never looks back",
  41,
  [
    [0, 22445],
    [0.03, 22470],
    [IB, 22530],
    [0.4, 22570],
    [0.7, 22600],
    [1, 22590],
  ],
  { volumeWindows: [[0, IB, 1.4]] },
);

export const OPEN_TEST_DRIVE = today(
  "open-test-drive",
  "Open-test-drive: tests back into yesterday's high, then drives up",
  42,
  [
    [0, 22420],
    [0.03, 22372],
    [0.06, 22400],
    [IB, 22480],
    [0.45, 22540],
    [0.75, 22560],
    [1, 22550],
  ],
);

export const OPEN_REJECTION_REVERSE = today(
  "open-rejection-reverse",
  "Open-rejection-reverse: pushes up, is rejected, and reverses through the open",
  43,
  [
    [0, 22420],
    [0.04, 22465],
    [0.09, 22415],
    [IB, 22380],
    [0.4, 22330],
    [0.7, 22300],
    [1, 22315],
  ],
);

export const OPEN_AUCTION = today(
  "open-auction",
  "Open-auction: opens inside value and rotates both ways",
  44,
  [
    [0, 22350],
    [0.04, 22375],
    [0.08, 22330],
    [IB, 22365],
    [0.35, 22320],
    [0.6, 22385],
    [0.8, 22340],
    [1, 22360],
  ],
);

export const EIGHTY_FILL = today(
  "eighty-fill",
  "80% rule: opens below value, gets back in, and crosses it",
  45,
  [
    [0, 22255],
    [0.04, 22240],
    [0.1, 22305],
    [0.26, 22320],
    [0.5, 22370],
    [0.7, 22405],
    [1, 22395],
  ],
);

export const EIGHTY_FAIL = today(
  "eighty-fail",
  "80% rule: opens below value, gets back in for an hour, then fails",
  46,
  [
    [0, 22255],
    [0.04, 22240],
    [0.1, 22305],
    [0.26, 22330],
    [0.4, 22345],
    [0.6, 22270],
    [1, 22230],
  ],
);

/* ---- Value relationships (lesson 10) ----------------------------- */

/** Today's value relative to OPEN_YESTERDAY's, by construction. */
export const RELATIONS: { name: string; s: Scenario }[] = [
  {
    name: "Higher",
    s: today("rel-higher", "Higher value", 51, [
      [0, 22440], [0.2, 22480], [0.4, 22450], [0.6, 22490], [0.8, 22455], [1, 22475],
    ]),
  },
  {
    name: "Overlapping higher",
    s: today("rel-overlap-higher", "Overlapping-higher value", 52, [
      [0, 22350], [0.2, 22395], [0.4, 22360], [0.6, 22400], [0.8, 22370], [1, 22385],
    ]),
  },
  {
    name: "Inside",
    s: today("rel-inside", "Inside value", 53, [
      [0, 22350], [0.2, 22365], [0.4, 22340], [0.6, 22362], [0.8, 22345], [1, 22355],
    ], { noise: 2, volume: 600 }),
  },
  {
    name: "Outside",
    s: today("rel-outside", "Outside value", 54, [
      [0, 22345], [0.1, 22270], [0.25, 22410], [0.4, 22270], [0.55, 22410], [0.7, 22280], [0.85, 22400], [1, 22340],
    ], { volume: 950 }),
  },
  {
    name: "Overlapping lower",
    s: today("rel-overlap-lower", "Overlapping-lower value", 55, [
      [0, 22340], [0.2, 22300], [0.4, 22335], [0.6, 22295], [0.8, 22330], [1, 22315],
    ]),
  },
  {
    name: "Lower",
    s: today("rel-lower", "Lower value", 56, [
      [0, 22260], [0.2, 22220], [0.4, 22255], [0.6, 22215], [0.8, 22250], [1, 22230],
    ]),
  },
];

/* ---- A week, for composites and naked POCs (lessons 12, 14) ------ */

const weekDay = (date: string, seed: number, path: [number, number][]): Scenario => ({
  id: `week-${date}`,
  label: `NIFTY near-month future, ${date} (synthetic)`,
  date,
  ...NSE,
  seed,
  path,
  noise: 3,
  wick: 2.5,
  volume: 820,
});

export const WEEK: Scenario[] = [
  weekDay("2026-09-07", 61, [[0, 22300], [0.2, 22260], [0.5, 22330], [0.8, 22290], [1, 22310]]),
  weekDay("2026-09-08", 62, [[0, 22320], [0.2, 22370], [0.5, 22340], [0.8, 22400], [1, 22390]]),
  weekDay("2026-09-09", 63, [[0, 22395], [0.3, 22440], [0.5, 22410], [0.8, 22460], [1, 22450]]),
  weekDay("2026-09-10", 64, [[0, 22450], [0.2, 22420], [0.5, 22470], [0.8, 22430], [1, 22445]]),
  weekDay("2026-09-11", 65, [[0, 22440], [0.2, 22380], [0.5, 22350], [0.8, 22395], [1, 22370]]),
];

/* ---- TPO versus volume (lesson 2) -------------------------------- *
 * A slow, thin morning drift at one level and a short, heavy burst at
 * another: time says one thing, volume another.                          */

export const TPO_VS_VOLUME: Scenario = {
  id: "tpo-vs-volume",
  label: "A day where time and volume disagree (synthetic)",
  date: "2026-09-16",
  ...NSE,
  seed: 71,
  path: [
    [0, 22380],
    [0.1, 22350],
    [0.2, 22390],
    [0.55, 22375],
    [0.62, 22460],
    [0.7, 22470],
    [0.78, 22440],
    [1, 22445],
  ],
  noise: 2.5,
  wick: 2,
  volume: 700,
  volumeWindows: [
    [0.1, 0.55, 0.35],
    [0.6, 0.78, 3.2],
  ],
};

/* ---- Anatomy (lesson 6) ------------------------------------------ */

export const ANATOMY: Scenario = {
  id: "anatomy",
  label: "A day with every feature (synthetic)",
  date: "2026-09-17",
  ...NSE,
  seed: 81,
  path: [
    [0, 22330],
    [0.02, 22270], // a quick spike down and back: a buying tail
    [0.05, 22340],
    [0.25, 22370],
    [0.4, 22345],
    [0.46, 22360],
    [0.5, 22445], // a fast leg up: thin, an LVN between two HVNs
    [0.7, 22470],
    [0.8, 22450],
    [0.9, 22472],
    [1, 22462],
  ],
  noise: 2.6,
  wick: 2,
  volume: 800,
  volumeWindows: [[0.46, 0.5, 0.5]],
};

/* ---- MCX crude oil (lesson 16) ----------------------------------- *
 * MCX runs 09:00 to 23:30 IST (23:55 while the US is on daylight saving
 * time — check the current calendar). Crude volume is thin in the Indian
 * morning and surges once US markets are trading.                         */

export const MCX_CRUDE: Scenario = {
  id: "mcx-crude",
  label: "MCX crude oil near-month future (synthetic)",
  date: "2026-09-23",
  openIST: [9, 0],
  minutes: 870,
  tick: 1,
  seed: 91,
  path: [
    [0, 5820],
    [0.2, 5835],
    [0.4, 5810],
    [0.5, 5826],
    [0.62, 5790], // US data around the US open
    [0.7, 5760],
    [0.85, 5775],
    [1, 5768],
  ],
  noise: 1.4,
  wick: 1.2,
  volume: 260,
  volumeWindows: [
    [0, 0.45, 0.45],
    [0.55, 0.95, 2.4],
  ],
};

/**
 * The Volume Profile code labs.
 *
 * Kept in one file, apart from the topics that carry them, because the five
 * labs build on each other (bin → POC → value area → zone → session range)
 * and share one set of definitions; reviewing them side by side is how
 * inconsistencies get caught. Each topic imports its lab.
 *
 * Every expected value was produced by `src/engine/trading/profile.ts`, an
 * independent implementation from the reference solutions below, and
 * `scripts/labs.mts` runs each solution against its own tests and gate.
 */
import type { CodeLab } from "../types.ts";

/* ------------------------------------------------------------------ */

export const LAB_BUILD: CodeLab = {
  prompt:
    "Bin one-minute bars into a volume profile on an ABSOLUTE grid. Bin k covers `[k·step, (k+1)·step)`. Return `{ lo, bins }` where `lo` is the low edge of the first bin and `bins[i]` is the volume of bin i, lowest price first. Spread each bar's volume over the bins its `low`→`high` range covers, in proportion to the overlap. A flat bar (`high === low`) puts all its volume in the bin containing its price. A high that lands exactly on a bin edge does not reach into the bin above (zero overlap). Keep empty bins between bars as 0. Round every bin to 2 decimals at the END with `Math.round(v * 100) / 100`. No bars: `{ lo: 0, bins: [] }`. Budget: O(total bins touched).",
  fnName: "buildProfile",
  signature:
    "buildProfile(bars: {high: number, low: number, volume: number}[], step: number): {lo: number, bins: number[]}",
  starter: `function buildProfile(bars, step) {
  // 1. Find the lowest bin index and the highest bin index across all bars.
  //    Bin of a price p: Math.floor(p / step). Careful at the top edge.
  // 2. Make an array of zeros covering that range.
  // 3. For each bar, add volume × (overlap / range) to each bin it covers.
  // 4. Round each bin to 2 decimals at the end.

  return { lo: 0, bins: [] };
}`,
  tests: [
    {
      name: "one bar covering exactly two bins",
      input: [[{ high: 110, low: 100, volume: 100 }], 5],
      expected: { lo: 100, bins: [50, 50] },
    },
    {
      name: "partial overlap: 4 of 7 points in the lower bin",
      input: [[{ high: 108, low: 101, volume: 70 }], 5],
      expected: { lo: 100, bins: [40, 30] },
    },
    {
      name: "a flat bar goes into one bin",
      input: [[{ high: 102, low: 102, volume: 9 }], 5],
      expected: { lo: 100, bins: [9] },
    },
    {
      name: "two bars with an empty bin between them",
      input: [
        [
          { high: 102, low: 101, volume: 10 },
          { high: 113, low: 112, volume: 20 },
        ],
        5,
      ],
      expected: { lo: 100, bins: [10, 0, 20] },
    },
    { name: "no bars", input: [[], 5], expected: { lo: 0, bins: [] } },
    {
      // A flat bar exactly ON an edge belongs to the bin that STARTS there.
      name: "flat bar exactly on a bin edge",
      input: [[{ high: 105, low: 105, volume: 4 }], 5],
      expected: { lo: 105, bins: [4] },
      hidden: true,
    },
    {
      // The overlap with [110, 115) is zero, so there must be no bin for it.
      name: "high exactly on an edge adds no bin above",
      input: [[{ high: 110, low: 104, volume: 60 }], 5],
      expected: { lo: 100, bins: [10, 50] },
      hidden: true,
    },
    {
      name: "thirds, rounded at the end",
      input: [[{ high: 106, low: 103, volume: 10 }], 1],
      expected: { lo: 103, bins: [3.33, 3.33, 3.33] },
      hidden: true,
    },
    {
      name: "NIFTY-style decimals with half-point bins",
      input: [[{ high: 22447.35, low: 22446.1, volume: 125 }], 0.5],
      expected: { lo: 22446, bins: [40, 50, 35] },
      hidden: true,
    },
    {
      name: "volumes add up across bars",
      input: [
        [
          { high: 110, low: 100, volume: 100 },
          { high: 107, low: 102, volume: 50 },
          { high: 104, low: 104, volume: 5 },
        ],
        5,
      ],
      expected: { lo: 100, bins: [85, 70] },
      hidden: true,
    },
  ],
  hints: [
    "The bin a price falls in is `Math.floor(price / step)`. The bin a NON-flat bar's high reaches is `Math.ceil(high / step) - 1` — that is what stops a high on an edge from reaching the next bin.",
    "For bin k, the overlap is `Math.min(high, (k+1)*step) - Math.max(low, k*step)`. Only add when it is positive. The bar's share is `overlap / (high - low)`.",
    "Compute `lo` as `kLo * step`, where `kLo` is the smallest bin index over all bars, and index your array as `k - kLo`.",
  ],
  solution: `function buildProfile(bars, step) {
  if (bars.length === 0) return { lo: 0, bins: [] };
  // A tiny epsilon keeps 22470 / 0.05 from flooring to 449399.
  const EPS = 1e-9;
  const binOf = (p) => Math.floor(p / step + EPS);
  const topOf = (b) =>
    b.high <= b.low ? binOf(b.high) : Math.ceil(b.high / step - EPS) - 1;

  let kLo = Infinity;
  let kHi = -Infinity;
  for (const b of bars) {
    kLo = Math.min(kLo, binOf(b.low));
    kHi = Math.max(kHi, topOf(b));
  }
  const bins = new Array(kHi - kLo + 1).fill(0);

  for (const b of bars) {
    if (b.high <= b.low) {
      bins[binOf(b.high) - kLo] += b.volume;
      continue;
    }
    const range = b.high - b.low;
    for (let k = binOf(b.low); k <= topOf(b); k++) {
      const overlap = Math.min(b.high, (k + 1) * step) - Math.max(b.low, k * step);
      if (overlap > 0) bins[k - kLo] += (b.volume * overlap) / range;
    }
  }
  return { lo: kLo * step, bins: bins.map((v) => Math.round(v * 100) / 100) };
}`,
  complexityGate: {
    target: "O(n)",
    // n bars, each spanning 1–3 bins, drifting slowly: total bins touched
    // and the grid both grow linearly with n. A solution that rescans all
    // bars to find the range once PER bar is quadratic.
    gen: "(n) => [Array.from({ length: n }, (_, i) => { const mid = 20000 + (i % 400) * 2.5; return { high: mid + 6, low: mid - 3, volume: 100 + (i % 7) }; }), 5]",
    sizes: [4000, 8000, 16000, 32000],
  },
};

/* ------------------------------------------------------------------ */

export const LAB_POC: CodeLab = {
  prompt:
    "Return the INDEX of the point of control: the bin with the most volume. Ties go to the bin nearest the middle of the profile — the middle is index `(bins.length - 1) / 2` — and if two tied bins are equally near the middle, to the LOWER one. Zero and negative bins never count. No positive bin at all: return -1. Budget: O(n).",
  fnName: "findPoc",
  signature: "findPoc(bins: number[]): number",
  starter: `function findPoc(bins) {
  // Track the best index so far. Replace it when a bin is strictly bigger,
  // OR equal and strictly nearer the middle.

  return -1;
}`,
  tests: [
    { name: "a clear winner", input: [[2, 4, 7, 9, 6, 3, 1]], expected: 3 },
    {
      name: "tie: the one nearer the middle wins",
      input: [[3, 9, 5, 6, 4, 9, 8, 2, 1]],
      expected: 5,
    },
    {
      name: "tie, equally near the middle: the lower one",
      input: [[1, 4, 9, 3, 9, 2, 1]],
      expected: 2,
    },
    { name: "single bin", input: [[5]], expected: 0 },
    { name: "empty profile", input: [[]], expected: -1 },
    { name: "all zero", input: [[0, 0, 0]], expected: -1, hidden: true },
    {
      // Middle is 1.5: indices 1 and 2 are both 0.5 away, so the lower wins.
      name: "even length, tie straddling the middle",
      input: [[1, 7, 7, 1]],
      expected: 1,
      hidden: true,
    },
    {
      name: "three-way tie, the far one first",
      input: [[8, 1, 1, 8, 1, 1, 8]],
      expected: 3,
      hidden: true,
    },
    {
      name: "max at the very edge, no tie",
      input: [[1, 2, 3, 4, 10]],
      expected: 4,
      hidden: true,
    },
    {
      name: "negative values are ignored",
      input: [[-5, 0, 2, -1]],
      expected: 2,
      hidden: true,
    },
  ],
  hints: [
    "Start with `best = -1` and `max = 0`. A bin only becomes the leader if it is `> max`, so zero and negative bins never lead.",
    "For a tie, compare `Math.abs(i - mid)` with `Math.abs(best - mid)`. Replace only on STRICTLY less — keeping the earlier (lower) index on an exact draw.",
  ],
  solution: `function findPoc(bins) {
  const mid = (bins.length - 1) / 2;
  let best = -1;
  let max = 0;
  for (let i = 0; i < bins.length; i++) {
    const v = bins[i] > 0 ? bins[i] : 0;
    if (v > max || (v === max && best >= 0 && Math.abs(i - mid) < Math.abs(best - mid))) {
      max = v;
      best = i;
    }
  }
  return best;
}`,
  complexityGate: {
    target: "O(n)",
    gen: "(n) => [Array.from({ length: n }, (_, i) => (i * 7919) % 1000)]",
    sizes: [8000, 16000, 32000, 64000],
  },
};

/* ------------------------------------------------------------------ */

export const LAB_VALUE_AREA: CodeLab = {
  prompt:
    "Return the value area as `[from, to]`, inclusive bin indices. Start at the POC (same tie rule as the last lab). Repeatedly compare the sum of the next TWO bins above with the next TWO below and add the larger pair. Equal pairs go UP. If only one bin is left on a side, that side offers just that one bin. If a side has no bins left, take from the other side. Stop as soon as the area holds at least `share` of the total volume — check before each step, so a POC that already holds enough is the whole value area. No volume at all: return `null`. Budget: O(n).",
  fnName: "valueArea",
  signature: "valueArea(bins: number[], share: number): [number, number] | null",
  starter: `function valueArea(bins, share) {
  // 1. Find the POC index (paste your findPoc logic).
  // 2. total = sum of positive bins; target = share * total.
  // 3. from = to = poc; inside = bins[poc].
  // 4. while inside < target and there is room to grow:
  //      up   = bins[to+1] + bins[to+2]   (missing bins count as 0)
  //      down = bins[from-1] + bins[from-2]
  //      grow towards the larger; ties go up; a used-up side loses.

  return null;
}`,
  tests: [
    {
      name: "the CBOT-style worked example (rows 99..110)",
      input: [[10, 40, 70, 15, 20, 90, 100, 60, 20, 30, 10, 5], 0.7],
      expected: [2, 8],
    },
    {
      name: "every rule in four steps",
      input: [[7, 6, 4, 2, 11, 7, 1, 3, 3, 7], 0.7],
      expected: [2, 9],
    },
    {
      name: "the POC alone already holds enough",
      input: [[1, 50, 1], 0.7],
      expected: [1, 1],
    },
    { name: "no volume", input: [[0, 0, 0], 0.7], expected: null },
    { name: "a single bin", input: [[12], 0.7], expected: [0, 0] },
    {
      // Equal pairs (4+4 vs 4+4): the tie goes up first (to index 5). That
      // leaves 18 of 28, short of 19.6, so the pair below follows.
      name: "equal pairs go up",
      input: [[1, 4, 4, 10, 4, 4, 1], 0.7],
      expected: [1, 5],
      hidden: true,
    },
    {
      // POC at index 0: nothing below, ever.
      name: "POC at the bottom edge",
      input: [[10, 3, 3, 2, 2, 1], 0.7],
      expected: [0, 2],
      hidden: true,
    },
    {
      // One bin left above (8) is compared, alone, with the pair below
      // (3 + 2 = 5) — and wins. A solution that insists on two bins above,
      // or skips a side with only one left, goes down instead.
      name: "a single bin left at the top",
      input: [[2, 2, 3, 9, 8], 0.7],
      expected: [3, 4],
      hidden: true,
    },
    {
      name: "a different share",
      input: [[1, 2, 3, 10, 3, 2, 1], 0.5],
      expected: [3, 5],
      hidden: true,
    },
    {
      // The last pair is added whole, even though it overshoots 70%.
      name: "the last pair overshoots and is still added whole",
      input: [[30, 30, 40, 30, 30], 0.7],
      expected: [0, 4],
      hidden: true,
    },
  ],
  hints: [
    "Read a missing neighbour as 0: `const at = (i) => (i >= 0 && i < bins.length && bins[i] > 0 ? bins[i] : 0)`. Then `up = at(to + 1) + at(to + 2)` handles the one-bin-left case for free.",
    "Decide the direction with `to < n - 1 && (from === 0 || up >= down)`. The `from === 0` part is what sends you up when the bottom is used up.",
    "Move the edge by two but clamp it: `to = Math.min(n - 1, to + 2)`.",
  ],
  solution: `function valueArea(bins, share) {
  const n = bins.length;
  const at = (i) => (i >= 0 && i < n && bins[i] > 0 ? bins[i] : 0);
  const mid = (n - 1) / 2;
  let poc = -1;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const v = at(i);
    if (v > max || (v === max && poc >= 0 && Math.abs(i - mid) < Math.abs(poc - mid))) {
      max = v;
      poc = i;
    }
  }
  if (poc < 0) return null;
  let total = 0;
  for (let i = 0; i < n; i++) total += at(i);
  const target = share * total * (1 - 1e-12);
  let from = poc;
  let to = poc;
  let inside = at(poc);
  while (inside < target && (from > 0 || to < n - 1)) {
    const up = at(to + 1) + at(to + 2);
    const down = at(from - 1) + at(from - 2);
    if (to < n - 1 && (from === 0 || up >= down)) {
      to = Math.min(n - 1, to + 2);
      inside += up;
    } else {
      from = Math.max(0, from - 2);
      inside += down;
    }
  }
  return [from, to];
}`,
  complexityGate: {
    target: "O(n)",
    // A flat profile with a slight peak: the area must grow across ~70% of
    // the bins, so a solution that re-sums the area on every step is
    // quadratic and shows it.
    gen: "(n) => [Array.from({ length: n }, (_, i) => 1000 - Math.abs(i - n / 2) * (400 / n) + (i % 3)), 0.7]",
    sizes: [8000, 16000, 32000, 64000],
  },
};

/* ------------------------------------------------------------------ */

export const LAB_ZONES: CodeLab = {
  prompt:
    "Classify today against YESTERDAY's value area. Return `{ open, closes }`: `open` is the zone of the first bar's open, and `closes[i]` is the zone of bar i's close. A zone is `\"above\"` if the price is strictly above `vah`, `\"below\"` if strictly below `val`, otherwise `\"inside\"` — the edges count as inside. No bars: `{ open: null, closes: [] }`. Budget: O(n).",
  fnName: "zones",
  signature:
    'zones(bars: {open: number, close: number}[], vah: number, val: number): {open: "above"|"inside"|"below"|null, closes: string[]}',
  starter: `function zones(bars, vah, val) {
  // One small helper does all the work: zoneOf(price).

  return { open: null, closes: [] };
}`,
  tests: [
    {
      name: "a bar of each kind",
      input: [
        [
          { open: 22300, close: 22340 },
          { open: 22340, close: 22280 },
          { open: 22280, close: 22320 },
        ],
        22335,
        22290,
      ],
      expected: { open: "inside", closes: ["above", "below", "inside"] },
    },
    {
      name: "opens above value",
      input: [[{ open: 22400, close: 22410 }], 22335, 22290],
      expected: { open: "above", closes: ["above"] },
    },
    { name: "no bars", input: [[], 22335, 22290], expected: { open: null, closes: [] } },
    {
      // 1 Oct 2026 in the lessons: the open sits exactly on 30 Sep's VAL.
      name: "open exactly on VAL is inside",
      input: [[{ open: 22290, close: 22285.5 }], 22335, 22290],
      expected: { open: "inside", closes: ["below"] },
      hidden: true,
    },
    {
      name: "close exactly on VAH is inside",
      input: [[{ open: 22330, close: 22335 }], 22335, 22290],
      expected: { open: "inside", closes: ["inside"] },
      hidden: true,
    },
    {
      name: "the open zone uses the FIRST bar only",
      input: [
        [
          { open: 22250, close: 22300 },
          { open: 22300, close: 22350 },
        ],
        22335,
        22290,
      ],
      expected: { open: "below", closes: ["inside", "above"] },
      hidden: true,
    },
  ],
  hints: [
    "Write `zoneOf(p)` first: `p > vah ? \"above\" : p < val ? \"below\" : \"inside\"`. Strict comparisons are what make the edges count as inside.",
  ],
  solution: `function zones(bars, vah, val) {
  const zoneOf = (p) => (p > vah ? "above" : p < val ? "below" : "inside");
  return {
    open: bars.length ? zoneOf(bars[0].open) : null,
    closes: bars.map((b) => zoneOf(b.close)),
  };
}`,
  // No complexity gate: the work is one comparison per bar, and there is no
  // plausible slower answer for a gate to catch. The tests carry it — in
  // particular the two edge cases, which is where platforms disagree.
};

/* ------------------------------------------------------------------ */

export const LAB_SESSION_RANGE: CodeLab = {
  prompt:
    "For each bar, return where TODAY'S RANGE SO FAR sits against yesterday's value area — using only bars 0..i, never later ones. `\"above\"` if today's high so far is strictly above `vah` and the low so far is not below `val`; `\"below\"` for the mirror; `\"both\"` if it has traded strictly beyond both; otherwise `\"inside\"` (an inside day so far). Touching an edge is not beyond it. Budget: O(n) — a running high and low, not a rescan per bar.",
  fnName: "sessionRangeSoFar",
  signature:
    'sessionRangeSoFar(bars: {high: number, low: number}[], vah: number, val: number): ("inside"|"above"|"below"|"both")[]',
  starter: `function sessionRangeSoFar(bars, vah, val) {
  // Keep a running high and a running low. Never look at bars after i.

  return [];
}`,
  tests: [
    {
      name: "inside, then above, then both",
      input: [
        [
          { high: 22330, low: 22300 },
          { high: 22340, low: 22310 },
          { high: 22320, low: 22280 },
        ],
        22335,
        22290,
      ],
      expected: ["inside", "above", "both"],
    },
    {
      name: "once beyond, it stays beyond",
      input: [
        [
          { high: 22300, low: 22280 },
          { high: 22310, low: 22300 },
        ],
        22335,
        22290,
      ],
      expected: ["below", "below"],
    },
    { name: "no bars", input: [[], 22335, 22290], expected: [] },
    {
      name: "touching the edges is not beyond them",
      input: [[{ high: 22335, low: 22290 }], 22335, 22290],
      expected: ["inside"],
      hidden: true,
    },
    {
      // A solution that looks at the WHOLE day's high from bar 0 says
      // "above" here immediately — the look-ahead bug this lab is about.
      name: "no look-ahead: later highs do not change earlier answers",
      input: [
        [
          { high: 22320, low: 22300 },
          { high: 22325, low: 22305 },
          { high: 22400, low: 22320 },
        ],
        22335,
        22290,
      ],
      expected: ["inside", "inside", "above"],
      hidden: true,
    },
    {
      name: "both sides inside a single wide bar",
      input: [[{ high: 22350, low: 22270 }], 22335, 22290],
      expected: ["both"],
      hidden: true,
    },
  ],
  hints: [
    "Two variables outside the loop: `hi = -Infinity`, `lo = Infinity`. Update them with each bar, then classify.",
    "`const up = hi > vah, down = lo < val;` then `up && down ? \"both\" : up ? \"above\" : down ? \"below\" : \"inside\"`.",
  ],
  solution: `function sessionRangeSoFar(bars, vah, val) {
  let hi = -Infinity;
  let lo = Infinity;
  const out = [];
  for (const b of bars) {
    hi = Math.max(hi, b.high);
    lo = Math.min(lo, b.low);
    const up = hi > vah;
    const down = lo < val;
    out.push(up && down ? "both" : up ? "above" : down ? "below" : "inside");
  }
  return out;
}`,
  complexityGate: {
    target: "O(n)",
    // A slow upward drift: the range keeps changing, so a solution that
    // recomputes max/min over bars[0..i] every bar does real quadratic work.
    gen: "(n) => [Array.from({ length: n }, (_, i) => ({ high: 22300 + i * 0.01 + 2, low: 22300 + i * 0.01 - 2 })), 22335, 22290]",
    sizes: [8000, 16000, 32000, 64000],
  },
};

import {
  Recorder,
  cells,
  keyedCells,
  type CellState,
  type Pointer,
  type Trace,
} from "../trace";

/* ========================================================================
 * Tier 0 — foundations
 * Each builder runs the *real* algorithm and emits a frame per meaningful
 * step. Read them as reference implementations; the emit() calls are the
 * only thing added for the animation.
 * ===================================================================== */

export function twoPointers(): Trace {
  const a = [2, 7, 11, 15, 19, 24, 31];
  const target = 33;
  const r = new Recorder();
  const code = [
    "lo, hi = 0, n - 1",
    "while lo < hi:",
    "  s = a[lo] + a[hi]",
    "  if s == target: return (lo, hi)",
    "  if s < target: lo += 1   # need more",
    "  else:          hi -= 1   # need less",
  ];

  let lo = 0;
  let hi = a.length - 1;

  const snap = (
    note: string,
    line: number,
    extra: Record<number, CellState> = {},
  ) => {
    const states: Record<number, CellState> = {};
    for (let i = 0; i < a.length; i++) {
      if (i < lo || i > hi) states[i] = "muted";
      else states[i] = "idle";
    }
    if (lo <= hi) states[lo] = "cursor";
    if (hi >= lo) states[hi] = "cursor";
    Object.assign(states, extra);
    r.emit({
      note,
      line,
      cells: cells(a, states),
      pointers: [
        { id: "lo", name: "lo", i: lo, side: "top" },
        { id: "hi", name: "hi", i: hi, side: "bottom" },
      ],
      stats: [
        { label: "target", value: target },
        { label: "a[lo] + a[hi]", value: lo < hi ? a[lo] + a[hi] : "—" },
      ],
    });
  };

  snap(`Sorted array, target ${target}. Park one pointer at each end.`, 0);

  while (lo < hi) {
    const s = a[lo] + a[hi];
    snap(`a[${lo}] + a[${hi}] = ${a[lo]} + ${a[hi]} = ${s}.`, 2, {
      [lo]: "scan",
      [hi]: "scan",
    });

    if (s === target) {
      snap(`${s} = target. Found the pair at indices ${lo} and ${hi}.`, 3, {
        [lo]: "match",
        [hi]: "match",
      });
      break;
    }
    if (s < target) {
      snap(
        `${s} < ${target}. The sum is too small, so the smallest element can never be part of the answer — discard it.`,
        4,
        { [lo]: "muted", [hi]: "scan" },
      );
      lo++;
    } else {
      snap(
        `${s} > ${target}. The sum is too large, so the largest element can never be part of the answer — discard it.`,
        5,
        { [lo]: "scan", [hi]: "muted" },
      );
      hi--;
    }
  }

  return {
    title: "Two pointers — pair sum in a sorted array",
    code,
    frames: r.done(),
    complexity: { time: "O(n)", space: "O(1)" },
  };
}

export function slidingWindow(): Trace {
  const s = "abcabcbb".split("");
  const r = new Recorder();
  const code = [
    "lo = 0; best = 0; seen = {}",
    "for hi in range(n):",
    "  if s[hi] in seen and seen[s[hi]] >= lo:",
    "    lo = seen[s[hi]] + 1        # shrink past the duplicate",
    "  seen[s[hi]] = hi",
    "  best = max(best, hi - lo + 1)",
  ];

  const seen = new Map<string, number>();
  let lo = 0;
  let best = 0;
  let bestRange: [number, number] = [0, 0];

  const snap = (
    note: string,
    line: number,
    hi: number,
    extra: Record<number, CellState> = {},
  ) => {
    const states: Record<number, CellState> = {};
    for (let i = 0; i < s.length; i++) {
      if (i > hi) states[i] = "ghost";
      else if (i < lo) states[i] = "muted";
      else states[i] = "match";
    }
    states[hi] = "cursor";
    Object.assign(states, extra);
    r.emit({
      note,
      line,
      cells: cells(s, states),
      window: hi >= lo ? [lo, hi] : null,
      pointers: [
        { id: "lo", name: "lo", i: lo, side: "bottom" },
        { id: "hi", name: "hi", i: hi, side: "top" },
      ],
      stats: [
        {
          label: "window",
          value: hi >= lo ? s.slice(lo, hi + 1).join("") : "—",
        },
        { label: "length", value: hi - lo + 1 },
        { label: "best", value: best },
      ],
    });
  };

  r.emit({
    note: "Longest substring with no repeated character. The window only ever grows on the right and shrinks on the left — so every index is touched twice at most.",
    line: 0,
    cells: cells(
      s,
      Object.fromEntries(s.map((_, i) => [i, "ghost" as CellState])),
    ),
    stats: [{ label: "best", value: 0 }],
  });

  for (let hi = 0; hi < s.length; hi++) {
    const ch = s[hi];
    snap(`Extend the window to include '${ch}'.`, 1, hi);

    const prev = seen.get(ch);
    if (prev !== undefined && prev >= lo) {
      snap(
        `'${ch}' is already inside the window at index ${prev}. Jump lo to ${prev + 1} — every window starting before that also contains the duplicate, so they can all be skipped at once.`,
        3,
        hi,
        { [prev]: "scan" },
      );
      lo = prev + 1;
    }
    seen.set(ch, hi);

    if (hi - lo + 1 > best) {
      best = hi - lo + 1;
      bestRange = [lo, hi];
      snap(
        `New best: "${s.slice(lo, hi + 1).join("")}" of length ${best}.`,
        5,
        hi,
      );
    } else {
      snap(
        `Window is "${s.slice(lo, hi + 1).join("")}" (length ${hi - lo + 1}). Best stays ${best}.`,
        5,
        hi,
      );
    }
  }

  const finalStates: Record<number, CellState> = {};
  for (let i = 0; i < s.length; i++) {
    finalStates[i] = i >= bestRange[0] && i <= bestRange[1] ? "match" : "muted";
  }
  r.emit({
    note: `Done. The longest duplicate-free substring is "${s.slice(bestRange[0], bestRange[1] + 1).join("")}" with length ${best}.`,
    line: 5,
    cells: cells(s, finalStates),
    window: bestRange,
    stats: [{ label: "answer", value: best }],
  });

  return {
    title: "Sliding window — longest substring without repeats",
    code,
    frames: r.done(),
    complexity: { time: "O(n)", space: "O(k)" },
  };
}

export function binarySearch(): Trace {
  const a = [3, 8, 12, 17, 21, 26, 30, 41, 55, 62, 70];
  const target = 41;
  const r = new Recorder();
  const code = [
    "lo, hi = 0, n - 1",
    "while lo <= hi:",
    "  mid = lo + (hi - lo) // 2      # no overflow",
    "  if a[mid] == target: return mid",
    "  if a[mid] < target: lo = mid + 1",
    "  else:               hi = mid - 1",
    "return -1",
  ];

  let lo = 0;
  let hi = a.length - 1;
  let steps = 0;

  const snap = (note: string, line: number, mid?: number, found = false) => {
    const states: Record<number, CellState> = {};
    for (let i = 0; i < a.length; i++) {
      states[i] = i < lo || i > hi ? "muted" : "idle";
    }
    if (mid !== undefined) states[mid] = found ? "match" : "scan";
    const pointers: Pointer[] = [
      { id: "lo", name: "lo", i: lo, side: "bottom" },
      { id: "hi", name: "hi", i: hi, side: "bottom" },
    ];
    if (mid !== undefined)
      pointers.push({ id: "mid", name: "mid", i: mid, side: "top" });
    r.emit({
      note,
      line,
      cells: cells(a, states),
      window: lo <= hi ? [lo, hi] : null,
      pointers,
      stats: [
        { label: "target", value: target },
        { label: "candidates left", value: Math.max(0, hi - lo + 1) },
        { label: "probes", value: steps },
      ],
    });
  };

  snap(
    `Searching for ${target} in ${a.length} sorted values. Every probe halves what is left.`,
    0,
  );

  let result = -1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    steps++;
    snap(`Probe the middle: a[${mid}] = ${a[mid]}.`, 2, mid);

    if (a[mid] === target) {
      snap(
        `a[${mid}] = ${target}. Found it in ${steps} probes — a linear scan would have taken ${mid + 1}.`,
        3,
        mid,
        true,
      );
      result = mid;
      break;
    }
    if (a[mid] < target) {
      snap(
        `${a[mid]} < ${target}, so nothing at or left of ${mid} can match. Discard ${mid - lo + 1} candidates.`,
        4,
        mid,
      );
      lo = mid + 1;
    } else {
      snap(
        `${a[mid]} > ${target}, so nothing at or right of ${mid} can match. Discard ${hi - mid + 1} candidates.`,
        5,
        mid,
      );
      hi = mid - 1;
    }
  }

  if (result === -1) snap("Range is empty — the target is not present.", 6);

  return {
    title: "Binary search — halving the candidate set",
    code,
    frames: r.done(),
    complexity: { time: "O(log n)", space: "O(1)" },
  };
}

export function binarySearchOnAnswer(): Trace {
  // Classic "minimum ship capacity to deliver all packages within D days".
  const w = [3, 2, 2, 4, 1, 4];
  const days = 3;
  const r = new Recorder();
  const code = [
    "lo = max(w); hi = sum(w)            # answer must lie in here",
    "while lo < hi:",
    "  mid = (lo + hi) // 2",
    "  if feasible(mid): hi = mid        # mid works — try smaller",
    "  else:             lo = mid + 1    # mid fails — need bigger",
    "return lo",
  ];

  const feasible = (cap: number) => {
    let used = 1;
    let load = 0;
    for (const x of w) {
      if (load + x > cap) {
        used++;
        load = 0;
      }
      load += x;
    }
    return used <= days;
  };

  let lo = Math.max(...w);
  let hi = w.reduce((s, x) => s + x, 0);

  const snap = (note: string, line: number, mid?: number, ok?: boolean) => {
    const span = hi - lo + 1;
    const candidates: number[] = [];
    for (let v = Math.max(...w); v <= w.reduce((s, x) => s + x, 0); v++)
      candidates.push(v);
    const states: Record<number, CellState> = {};
    candidates.forEach((v, i) => {
      if (v < lo || v > hi) states[i] = "muted";
      else states[i] = "idle";
      if (mid !== undefined && v === mid)
        states[i] = ok === undefined ? "scan" : ok ? "match" : "muted";
    });
    r.emit({
      note,
      line,
      cells: cells(candidates, states, "cap"),
      window: [candidates.indexOf(lo), candidates.indexOf(hi)],
      stats: [
        { label: "searching over", value: "capacities, not the array" },
        { label: "range", value: `${lo}…${hi}` },
        { label: "width", value: span },
      ],
      aux: [
        {
          title: `packages (must ship in ${days} days, in order)`,
          cells: w.map((v, i) => ({ id: `w${i}`, v, s: "idle" as CellState })),
        },
      ],
    });
  };

  snap(
    "The array is not what we search. We search the ANSWER SPACE: every possible ship capacity from max(w) to sum(w).",
    0,
  );
  snap(
    "This works because feasibility is monotonic — if capacity C can do it, so can C+1. That monotone step is exactly what binary search needs.",
    0,
  );

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    snap(`Try capacity ${mid}.`, 2, mid);
    const ok = feasible(mid);
    if (ok) {
      snap(
        `Capacity ${mid} ships everything within ${days} days. It works — but maybe something smaller does too, so keep it and search left.`,
        3,
        mid,
        true,
      );
      hi = mid;
    } else {
      snap(
        `Capacity ${mid} needs more than ${days} days. Too small — discard it and everything below.`,
        4,
        mid,
        false,
      );
      lo = mid + 1;
    }
  }

  snap(`Converged. The minimum feasible capacity is ${lo}.`, 5, lo, true);

  return {
    title: "Binary search on the answer — minimum ship capacity",
    code,
    frames: r.done(),
    complexity: { time: "O(n log S)", space: "O(1)" },
  };
}

export function prefixSums(): Trace {
  const a = [4, 2, 7, 1, 9, 3, 6];
  const r = new Recorder();
  const code = [
    "p[0] = 0",
    "for i in range(n):",
    "  p[i + 1] = p[i] + a[i]",
    "",
    "# any range sum is now one subtraction",
    "sum(l..r) = p[r + 1] - p[l]",
  ];

  const p: number[] = [0];

  r.emit({
    note: 'Goal: answer "what is the sum of a[l..r]?" in O(1) instead of O(n) per query.',
    line: 0,
    cells: cells(a),
    aux: [{ title: "prefix p", cells: [{ id: "p0", v: 0, s: "match" }] }],
  });

  for (let i = 0; i < a.length; i++) {
    p.push(p[i] + a[i]);
    const states: Record<number, CellState> = {};
    for (let j = 0; j < a.length; j++)
      states[j] = j < i ? "muted" : j === i ? "cursor" : "ghost";
    r.emit({
      note: `p[${i + 1}] = p[${i}] + a[${i}] = ${p[i]} + ${a[i]} = ${p[i + 1]}.`,
      line: 2,
      cells: cells(a, states),
      aux: [
        {
          title: "prefix p",
          cells: p.map((v, j) => ({
            id: `p${j}`,
            v,
            s: (j === i + 1 ? "cursor" : "match") as CellState,
          })),
        },
      ],
    });
  }

  const l = 2;
  const rr = 4;
  const states: Record<number, CellState> = {};
  for (let j = 0; j < a.length; j++)
    states[j] = j >= l && j <= rr ? "match" : "muted";

  r.emit({
    note: `Now query sum(a[${l}..${rr}]). The naive way walks ${rr - l + 1} elements.`,
    line: 5,
    cells: cells(a, states),
    window: [l, rr],
    aux: [
      {
        title: "prefix p",
        cells: p.map((v, j) => ({ id: `p${j}`, v, s: "idle" as CellState })),
      },
    ],
  });

  r.emit({
    note: `Instead: p[${rr + 1}] - p[${l}] = ${p[rr + 1]} - ${p[l]} = ${p[rr + 1] - p[l]}. One subtraction, regardless of how wide the range is.`,
    line: 5,
    cells: cells(a, states),
    window: [l, rr],
    aux: [
      {
        title: "prefix p",
        cells: p.map((v, j) => ({
          id: `p${j}`,
          v,
          s: (j === rr + 1 ? "match" : j === l ? "scan" : "muted") as CellState,
        })),
      },
    ],
    stats: [
      { label: "answer", value: p[rr + 1] - p[l] },
      { label: "work per query", value: "O(1)" },
    ],
  });

  return {
    title: "Prefix sums — pay O(n) once, answer every range in O(1)",
    code,
    frames: r.done(),
    complexity: { time: "O(n) build, O(1) query", space: "O(n)" },
  };
}

export function mergeSort(): Trace {
  const input = [38, 27, 43, 3, 9, 82, 10];
  const a = [...input];
  const keys = a.map((_, i) => i);
  const r = new Recorder();
  const code = [
    "def sort(lo, hi):",
    "  if hi - lo < 2: return",
    "  mid = (lo + hi) // 2",
    "  sort(lo, mid); sort(mid, hi)",
    "  merge(lo, mid, hi)      # the actual work",
  ];

  const snap = (
    note: string,
    line: number,
    states: Record<number, CellState>,
    win?: [number, number],
  ) => {
    r.emit({
      note,
      line,
      cells: keyedCells(a, keys, states),
      window: win ?? null,
      stats: [{ label: "stable", value: "yes" }],
    });
  };

  const paint = (
    lo: number,
    hi: number,
    s: CellState,
  ): Record<number, CellState> => {
    const st: Record<number, CellState> = {};
    for (let i = 0; i < a.length; i++) st[i] = i >= lo && i < hi ? s : "idle";
    return st;
  };

  snap(
    "Merge sort: split to single elements, then merge sorted runs back together.",
    0,
    {},
  );

  const sort = (lo: number, hi: number, depth: number) => {
    if (hi - lo < 2) return;
    const mid = Math.floor((lo + hi) / 2);
    snap(
      `Split [${lo}, ${hi}) at ${mid} — depth ${depth}. There are only log₂(n) ≈ ${Math.ceil(Math.log2(input.length))} levels of splitting.`,
      2,
      paint(lo, hi, "scan"),
      [lo, hi - 1],
    );
    sort(lo, mid, depth + 1);
    sort(mid, hi, depth + 1);

    // merge
    const left = a.slice(lo, mid);
    const right = a.slice(mid, hi);
    const lk = keys.slice(lo, mid);
    const rk = keys.slice(mid, hi);
    let i = 0;
    let j = 0;
    let k = lo;
    snap(
      `Merge the two sorted halves [${lo}, ${mid}) and [${mid}, ${hi}).`,
      4,
      paint(lo, hi, "scan"),
      [lo, hi - 1],
    );

    while (i < left.length && j < right.length) {
      // `<=` is what makes merge sort stable.
      if (left[i] <= right[j]) {
        a[k] = left[i];
        keys[k] = lk[i];
        i++;
      } else {
        a[k] = right[j];
        keys[k] = rk[j];
        j++;
      }
      k++;
      const st = paint(lo, hi, "idle");
      for (let z = lo; z < k; z++) st[z] = "match";
      snap(`Take the smaller front element → position ${k - 1}.`, 4, st, [
        lo,
        hi - 1,
      ]);
    }
    while (i < left.length) {
      a[k] = left[i];
      keys[k] = lk[i];
      i++;
      k++;
    }
    while (j < right.length) {
      a[k] = right[j];
      keys[k] = rk[j];
      j++;
      k++;
    }
    const st = paint(lo, hi, "match");
    snap(`[${lo}, ${hi}) is now sorted.`, 4, st, [lo, hi - 1]);
  };

  sort(0, a.length, 0);

  const done: Record<number, CellState> = {};
  for (let i = 0; i < a.length; i++) done[i] = "match";
  snap(
    "Sorted. Every level does O(n) merging work, and there are O(log n) levels.",
    4,
    done,
  );

  return {
    title: "Merge sort — O(n log n), stable, O(n) extra space",
    code,
    frames: r.done(),
    display: "bars",
    complexity: { time: "O(n log n)", space: "O(n)" },
  };
}

export function quickSort(): Trace {
  const a = [7, 2, 9, 4, 1, 8, 5];
  const keys = a.map((_, i) => i);
  const r = new Recorder();
  const code = [
    "def sort(lo, hi):",
    "  if lo >= hi: return",
    "  p = partition(lo, hi)     # pivot lands in its final place",
    "  sort(lo, p - 1); sort(p + 1, hi)",
    "",
    "def partition(lo, hi):      # Lomuto",
    "  pivot = a[hi]; i = lo",
    "  for j in lo..hi-1:",
    "    if a[j] < pivot: swap(i, j); i += 1",
    "  swap(i, hi); return i",
  ];

  const settled = new Set<number>();

  const snap = (
    note: string,
    line: number,
    extra: Record<number, CellState>,
    win?: [number, number],
  ) => {
    const st: Record<number, CellState> = {};
    for (let i = 0; i < a.length; i++)
      st[i] = settled.has(i) ? "match" : "idle";
    Object.assign(st, extra);
    r.emit({
      note,
      line,
      cells: keyedCells(a, keys, st),
      window: win ?? null,
      stats: [{ label: "extra space", value: "O(log n) stack" }],
    });
  };

  snap(
    "Quicksort: pick a pivot, move everything smaller to its left, and the pivot is then in its final position forever.",
    0,
    {},
  );

  const swap = (i: number, j: number) => {
    [a[i], a[j]] = [a[j], a[i]];
    [keys[i], keys[j]] = [keys[j], keys[i]];
  };

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) {
      if (lo === hi) settled.add(lo);
      return;
    }
    const pivot = a[hi];
    snap(
      `Partition [${lo}, ${hi}] around pivot ${pivot} (the last element).`,
      6,
      { [hi]: "cursor" },
      [lo, hi],
    );

    let i = lo;
    for (let j = lo; j < hi; j++) {
      snap(
        `Is a[${j}] = ${a[j]} < pivot ${pivot}?`,
        7,
        { [j]: "scan", [hi]: "cursor" },
        [lo, hi],
      );
      if (a[j] < pivot) {
        if (i !== j) {
          swap(i, j);
          snap(
            `Yes — swap it into the "smaller than pivot" zone at ${i}.`,
            8,
            { [i]: "scan", [hi]: "cursor" },
            [lo, hi],
          );
        } else {
          snap(
            `Yes — it is already in the right zone.`,
            8,
            { [i]: "scan", [hi]: "cursor" },
            [lo, hi],
          );
        }
        i++;
      }
    }
    swap(i, hi);
    settled.add(i);
    snap(
      `Swap the pivot into position ${i}. Everything left of it is smaller, everything right is larger — so ${pivot} is done permanently.`,
      9,
      { [i]: "match" },
      [lo, hi],
    );

    sort(lo, i - 1);
    sort(i + 1, hi);
  };

  sort(0, a.length - 1);

  const done: Record<number, CellState> = {};
  for (let i = 0; i < a.length; i++) done[i] = "match";
  snap(
    "Sorted in place. Average O(n log n) — but a bad pivot streak degrades to O(n²), which is why real implementations randomise or median-of-three.",
    3,
    done,
  );

  return {
    title: "Quicksort — in place, average O(n log n)",
    code,
    frames: r.done(),
    display: "bars",
    complexity: { time: "O(n log n) avg · O(n²) worst", space: "O(log n)" },
  };
}

export function hashCollisions(): Trace {
  const keys = ["alpha", "beta", "gamma", "delta", "omega", "sigma"];
  const BUCKETS = 5;
  const r = new Recorder();
  const code = [
    "h = hash(key) % buckets",
    "bucket[h].append((key, value))   # chaining",
    "",
    "# load factor = items / buckets",
    "# above ~0.75, chains lengthen and",
    "# lookup drifts from O(1) toward O(n)",
  ];

  const hash = (s: string) => {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % BUCKETS;
  };

  const buckets: string[][] = Array.from({ length: BUCKETS }, () => []);

  const snap = (note: string, line: number, active?: number) => {
    const items = buckets.reduce((s, b) => s + b.length, 0);
    r.emit({
      note,
      line,
      aux: buckets.map((b, i) => ({
        title: `bucket ${i}`,
        empty: "∅",
        cells: b.map((k, j) => ({
          id: `${i}-${k}`,
          v: k,
          s: (i === active && j === b.length - 1
            ? "cursor"
            : "idle") as CellState,
        })),
      })),
      stats: [
        { label: "items", value: items },
        { label: "load factor", value: (items / BUCKETS).toFixed(2) },
        {
          label: "longest chain",
          value: Math.max(0, ...buckets.map((b) => b.length)),
        },
      ],
    });
  };

  snap(
    "A hash map is an array of buckets. The hash decides which bucket; collisions share one.",
    0,
  );

  for (const k of keys) {
    const h = hash(k);
    const collided = buckets[h].length > 0;
    buckets[h].push(k);
    snap(
      collided
        ? `hash("${k}") → bucket ${h}, which is already occupied. Collision — chain it on. This bucket now costs ${buckets[h].length} comparisons to search.`
        : `hash("${k}") → bucket ${h}. Empty, so this is a clean O(1) insert.`,
      1,
      h,
    );
  }

  snap(
    "Lookup is O(1) only while chains stay short. That is a claim about the load factor and the hash quality — not a law. A bad hash makes every operation O(n).",
    5,
  );

  return {
    title: "Hash maps — collisions, chaining, and load factor",
    code,
    frames: r.done(),
    complexity: { time: "O(1) avg · O(n) worst", space: "O(n)" },
  };
}

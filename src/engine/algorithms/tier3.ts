import { Recorder, cells, type CellState, type Trace } from "../trace";

/* ========================================================================
 * Tier 3 — dynamic programming
 * ===================================================================== */

export function lcs(): Trace {
  const A = "AGCAT";
  const B = "GAC";
  const r = new Recorder();
  const code = [
    "for i in 1..len(A):",
    "  for j in 1..len(B):",
    "    if A[i-1] == B[j-1]:",
    "      dp[i][j] = dp[i-1][j-1] + 1     # extend the match",
    "    else:",
    "      dp[i][j] = max(dp[i-1][j], dp[i][j-1])   # drop one char",
  ];

  const n = A.length;
  const m = B.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(null),
  );
  for (let i = 0; i <= n; i++) dp[i][0] = 0;
  for (let j = 0; j <= m; j++) dp[0][j] = 0;

  const rows = ["∅", ...A.split("")];
  const cols = ["∅", ...B.split("")];

  const snap = (
    note: string,
    line: number,
    focus?: [number, number],
    reads?: [number, number][],
    path?: [number, number][],
  ) => {
    r.emit({
      note,
      line,
      matrix: {
        rows,
        cols,
        cells: dp.map((row) => [...row]),
        focus: focus ?? null,
        reads,
        path,
        caption: `dp[i][j] = length of the LCS of A[0..i) and B[0..j)`,
      },
      stats: [
        { label: "subproblems", value: (n + 1) * (m + 1) },
        { label: "each solved", value: "exactly once" },
      ],
    });
  };

  snap(
    `Longest common subsequence of "${A}" and "${B}". The recursive version re-solves the same subproblems exponentially often; the table solves each one once.`,
    0,
  );
  snap("Row 0 and column 0 are 0 — an empty string shares nothing.", 0);

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = (dp[i - 1][j - 1] as number) + 1;
        snap(
          `A[${i - 1}] = '${A[i - 1]}' matches B[${j - 1}] = '${B[j - 1]}'. Take the diagonal and add 1 → ${dp[i][j]}.`,
          3,
          [i, j],
          [[i - 1, j - 1]],
        );
      } else {
        dp[i][j] = Math.max(dp[i - 1][j] as number, dp[i][j - 1] as number);
        snap(
          `'${A[i - 1]}' ≠ '${B[j - 1]}'. Best we can do is drop one character: max(${dp[i - 1][j]}, ${dp[i][j - 1]}) = ${dp[i][j]}.`,
          5,
          [i, j],
          [
            [i - 1, j],
            [i, j - 1],
          ],
        );
      }
    }
  }

  // Reconstruct
  const path: [number, number][] = [];
  let out = "";
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (A[i - 1] === B[j - 1]) {
      path.push([i, j]);
      out = A[i - 1] + out;
      i--;
      j--;
    } else if ((dp[i - 1][j] as number) >= (dp[i][j - 1] as number)) i--;
    else j--;
  }

  snap(`Table complete — the answer is dp[${n}][${m}] = ${dp[n][m]}.`, 5, [
    n,
    m,
  ]);
  snap(
    `Walk backwards from the corner to recover the actual subsequence: "${out}". The table holds the lengths; the path holds the answer.`,
    5,
    undefined,
    undefined,
    path,
  );

  return {
    title: "Longest common subsequence — the canonical 2D DP",
    code,
    frames: r.done(),
    complexity: { time: "O(n·m)", space: "O(n·m) → O(min(n,m))" },
  };
}

export function knapsack(): Trace {
  const items = [
    { name: "A", w: 1, v: 1 },
    { name: "B", w: 3, v: 4 },
    { name: "C", w: 4, v: 5 },
    { name: "D", w: 5, v: 7 },
  ];
  const CAP = 7;
  const r = new Recorder();
  const code = [
    "for i in 1..n:",
    "  for c in 0..CAP:",
    "    dp[i][c] = dp[i-1][c]                 # skip item i",
    "    if w[i] <= c:",
    "      take = dp[i-1][c - w[i]] + v[i]     # take item i",
    "      dp[i][c] = max(dp[i][c], take)",
  ];

  const n = items.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () =>
    new Array(CAP + 1).fill(null),
  );
  for (let c = 0; c <= CAP; c++) dp[0][c] = 0;

  const rows = ["∅", ...items.map((it) => `${it.name} (w${it.w} v${it.v})`)];
  const cols = Array.from({ length: CAP + 1 }, (_, c) => String(c));

  const snap = (
    note: string,
    line: number,
    focus?: [number, number],
    reads?: [number, number][],
    path?: [number, number][],
  ) => {
    r.emit({
      note,
      line,
      matrix: {
        rows,
        cols,
        cells: dp.map((row) => [...row]),
        focus: focus ?? null,
        reads,
        path,
        caption:
          "dp[i][c] = best value using the first i items within capacity c",
      },
      stats: [{ label: "capacity", value: CAP }],
    });
  };

  snap(
    `0/1 knapsack: capacity ${CAP}, each item taken at most once. Greedy by value-per-weight is NOT optimal here — that is exactly why this needs DP.`,
    0,
  );
  snap("With zero items available, every capacity is worth 0.", 0);

  for (let i = 1; i <= n; i++) {
    const it = items[i - 1];
    for (let c = 0; c <= CAP; c++) {
      const skip = dp[i - 1][c] as number;
      if (it.w <= c) {
        const take = (dp[i - 1][c - it.w] as number) + it.v;
        dp[i][c] = Math.max(skip, take);
        snap(
          take > skip
            ? `Capacity ${c}: taking ${it.name} gives ${dp[i - 1][c - it.w]} + ${it.v} = ${take}, beating ${skip}. Take it.`
            : `Capacity ${c}: taking ${it.name} gives ${take}, no better than skipping (${skip}). Skip it.`,
          take > skip ? 4 : 2,
          [i, c],
          take > skip
            ? [
                [i - 1, c - it.w],
                [i - 1, c],
              ]
            : [[i - 1, c]],
        );
      } else {
        dp[i][c] = skip;
        snap(
          `Capacity ${c} is under ${it.name}'s weight of ${it.w} — it cannot fit. Inherit the row above.`,
          2,
          [i, c],
          [[i - 1, c]],
        );
      }
    }
  }

  // Reconstruct chosen items
  const path: [number, number][] = [];
  const chosen: string[] = [];
  let c = CAP;
  for (let i = n; i > 0; i--) {
    if (dp[i][c] !== dp[i - 1][c]) {
      path.push([i, c]);
      chosen.push(items[i - 1].name);
      c -= items[i - 1].w;
    }
  }

  snap(`Best achievable value is dp[${n}][${CAP}] = ${dp[n][CAP]}.`, 5, [
    n,
    CAP,
  ]);
  snap(
    `Trace back to see which items: ${chosen.reverse().join(" + ")}. Note the greedy pick by density (A then B then C) would have scored worse.`,
    5,
    undefined,
    undefined,
    path,
  );

  return {
    title: "0/1 knapsack — where greedy fails and DP does not",
    code,
    frames: r.done(),
    complexity: { time: "O(n·C)", space: "O(n·C) → O(C)" },
  };
}

export function lisPatience(): Trace {
  const a = [10, 9, 2, 5, 3, 7, 101, 18];
  const r = new Recorder();
  const code = [
    "tails = []          # tails[k] = smallest tail of an LIS of length k+1",
    "for x in a:",
    "  i = bisect_left(tails, x)   # binary search",
    "  if i == len(tails): tails.append(x)",
    "  else: tails[i] = x          # a smaller tail is always better",
    "return len(tails)",
  ];

  const tails: number[] = [];

  const snap = (note: string, line: number, idx: number, replaced?: number) => {
    const states: Record<number, CellState> = {};
    for (let j = 0; j < a.length; j++)
      states[j] = j > idx ? "ghost" : j === idx ? "cursor" : "muted";
    r.emit({
      note,
      line,
      cells: cells(a, states),
      pointers: [{ id: "x", name: "x", i: idx, side: "top" }],
      aux: [
        {
          title:
            "tails — index k holds the smallest possible tail of an increasing run of length k+1",
          empty: "empty",
          cells: tails.map((v, k) => ({
            id: `t${k}`,
            v,
            tag: `len ${k + 1}`,
            s: (k === replaced ? "scan" : "match") as CellState,
          })),
        },
      ],
      stats: [{ label: "LIS length so far", value: tails.length }],
    });
  };

  r.emit({
    note: "Longest increasing subsequence. The O(n²) DP compares every pair. Patience sorting gets it to O(n log n) — but note `tails` is NOT the subsequence, only its length is meaningful.",
    line: 0,
    cells: cells(
      a,
      Object.fromEntries(a.map((_, i) => [i, "ghost" as CellState])),
    ),
  });

  for (let idx = 0; idx < a.length; idx++) {
    const x = a[idx];
    // lower bound
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    snap(
      `Take ${x}. Binary-search tails for the first entry ≥ ${x} — that lands at position ${lo}.`,
      2,
      idx,
    );

    if (lo === tails.length) {
      tails.push(x);
      snap(
        `${x} is larger than every tail, so it extends the longest run. LIS length is now ${tails.length}.`,
        3,
        idx,
        lo,
      );
    } else {
      const old = tails[lo];
      tails[lo] = x;
      snap(
        `${x} replaces ${old} as the tail of length-${lo + 1} runs. A smaller tail can only ever be easier to extend later — the length does not change, but the future improves.`,
        4,
        idx,
        lo,
      );
    }
  }

  r.emit({
    note: `The LIS has length ${tails.length}. Each element costs one O(log n) binary search, so the whole thing is O(n log n).`,
    line: 5,
    cells: cells(
      a,
      Object.fromEntries(a.map((_, i) => [i, "muted" as CellState])),
    ),
    aux: [
      {
        title: "tails",
        cells: tails.map((v, k) => ({
          id: `t${k}`,
          v,
          tag: `len ${k + 1}`,
          s: "match" as CellState,
        })),
      },
    ],
    stats: [{ label: "answer", value: tails.length }],
  });

  return {
    title: "LIS in O(n log n) — patience sorting",
    code,
    frames: r.done(),
    complexity: { time: "O(n log n)", space: "O(n)" },
  };
}

export function stateMachineDP(): Trace {
  const price = [7, 1, 5, 3, 6, 4];
  const FEE = 1;
  const r = new Recorder();
  const code = [
    "flat = 0          # holding nothing",
    "long = -INF       # holding one unit",
    "for p in prices:",
    "  flat = max(flat, long + p - fee)   # sell",
    "  long = max(long, flat - p)         # buy",
    "return flat       # never end holding",
  ];

  let flat = 0;
  let long = -Infinity;
  const flatHist: (number | string)[] = [];
  const longHist: (number | string)[] = [];

  const snap = (note: string, line: number, i: number) => {
    const states: Record<number, CellState> = {};
    for (let j = 0; j < price.length; j++)
      states[j] = j > i ? "ghost" : j === i ? "cursor" : "muted";
    r.emit({
      note,
      line,
      cells: cells(price, states, "p"),
      pointers: i >= 0 ? [{ id: "i", name: "bar", i, side: "top" }] : [],
      aux: [
        {
          title: "flat — best cash while holding nothing",
          empty: "—",
          cells: flatHist.map((v, k) => ({
            id: `f${k}`,
            v,
            s: (k === flatHist.length - 1 ? "cursor" : "idle") as CellState,
          })),
        },
        {
          title: "long — best cash while holding one unit",
          empty: "—",
          cells: longHist.map((v, k) => ({
            id: `l${k}`,
            v,
            s: (k === longHist.length - 1 ? "scan" : "idle") as CellState,
          })),
        },
      ],
      stats: [
        { label: "fee per sale", value: FEE },
        { label: "best so far", value: flat },
      ],
    });
  };

  r.emit({
    note: 'State-machine DP. Two states — flat and long — and one transition per bar. This is the shape behind "maximum achievable P&L", the oracle you compare a real trading strategy against.',
    line: 0,
    cells: cells(
      price,
      Object.fromEntries(price.map((_, i) => [i, "ghost" as CellState])),
      "p",
    ),
  });

  for (let i = 0; i < price.length; i++) {
    const p = price[i];
    const prevFlat = flat;
    const prevLong = long;

    flat = Math.max(prevFlat, prevLong + p - FEE);
    long = Math.max(prevLong, prevFlat - p);
    flatHist.push(flat);
    longHist.push(long === -Infinity ? "−∞" : long);

    snap(
      `Bar ${i}, price ${p}. Selling now would yield ${prevLong === -Infinity ? "−∞" : prevLong + p - FEE}; holding flat keeps ${prevFlat} → flat = ${flat}. Buying now costs ${prevFlat - p}; staying long keeps ${prevLong === -Infinity ? "−∞" : prevLong} → long = ${long}.`,
      3,
      i,
    );
  }

  r.emit({
    note: `Maximum extractable profit is ${flat}, after fees. Any real strategy on this series can be scored as a fraction of that number — that ratio says far more than absolute P&L does.`,
    line: 5,
    cells: cells(
      price,
      Object.fromEntries(price.map((_, i) => [i, "muted" as CellState])),
      "p",
    ),
    stats: [
      { label: "oracle P&L", value: flat },
      { label: "states", value: 2 },
      { label: "cost", value: "O(n), O(1) space" },
    ],
  });

  return {
    title: "State-machine DP — the profit oracle",
    code,
    frames: r.done(),
    complexity: { time: "O(n)", space: "O(1)" },
  };
}

export function editDistance(): Trace {
  const A = "kitten";
  const B = "sitting";
  const r = new Recorder();
  const code = [
    "dp[i][0] = i; dp[0][j] = j       # delete-all / insert-all",
    "for i in 1..n:",
    "  for j in 1..m:",
    "    if A[i-1] == B[j-1]:",
    "      dp[i][j] = dp[i-1][j-1]                  # free",
    "    else:",
    "      dp[i][j] = 1 + min(dp[i-1][j],           # delete",
    "                         dp[i][j-1],           # insert",
    "                         dp[i-1][j-1])         # replace",
  ];

  const n = A.length;
  const m = B.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(null),
  );
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  const rows = ["∅", ...A.split("")];
  const cols = ["∅", ...B.split("")];

  const snap = (
    note: string,
    line: number,
    focus?: [number, number],
    reads?: [number, number][],
  ) => {
    r.emit({
      note,
      line,
      matrix: {
        rows,
        cols,
        cells: dp.map((row) => [...row]),
        focus: focus ?? null,
        reads,
        caption: `dp[i][j] = edits to turn A[0..i) into B[0..j)`,
      },
    });
  };

  snap(
    `Edit distance from "${A}" to "${B}". Borders are free: turning a prefix into the empty string costs one delete per character.`,
    0,
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] as number;
        snap(
          `'${A[i - 1]}' = '${B[j - 1]}' — no edit needed, inherit the diagonal (${dp[i][j]}).`,
          4,
          [i, j],
          [[i - 1, j - 1]],
        );
      } else {
        const del = dp[i - 1][j] as number;
        const ins = dp[i][j - 1] as number;
        const rep = dp[i - 1][j - 1] as number;
        dp[i][j] = 1 + Math.min(del, ins, rep);
        const which =
          rep <= del && rep <= ins
            ? "replace"
            : del <= ins
              ? "delete"
              : "insert";
        snap(
          `'${A[i - 1]}' ≠ '${B[j - 1]}'. Cheapest of delete ${del}, insert ${ins}, replace ${rep} — ${which} — plus 1 = ${dp[i][j]}.`,
          6,
          [i, j],
          [
            [i - 1, j],
            [i, j - 1],
            [i - 1, j - 1],
          ],
        );
      }
    }
  }

  snap(
    `"${A}" → "${B}" costs ${dp[n][m]} edits. This same table is what powers a text diff — swap characters for lines.`,
    8,
    [n, m],
  );

  return {
    title: "Edit distance — the engine behind every diff",
    code,
    frames: r.done(),
    complexity: { time: "O(n·m)", space: "O(n·m) → O(m)" },
  };
}

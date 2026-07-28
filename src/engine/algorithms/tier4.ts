import {
  Recorder,
  cells,
  type CellState,
  type GraphEdge,
  type GraphNode,
  type Trace,
} from "../trace";

/* ========================================================================
 * Tier 4 — advanced structures
 * ===================================================================== */

export function kmp(): Trace {
  const text = "ABABDABACDABABCABAB".split("");
  const pat = "ABABCABAB".split("");
  const r = new Recorder();
  const code = [
    "# 1. build the failure function",
    "lps[0] = 0; k = 0",
    "for i in 1..m-1:",
    "  while k and pat[k] != pat[i]: k = lps[k-1]",
    "  if pat[k] == pat[i]: k += 1",
    "  lps[i] = k",
    "",
    "# 2. scan — the text pointer NEVER goes backwards",
    "for i in 0..n-1:",
    "  while k and pat[k] != text[i]: k = lps[k-1]",
    "  if pat[k] == text[i]: k += 1",
    "  if k == m: report match at i - m + 1",
  ];

  // Phase 1 — failure function
  const lps = new Array(pat.length).fill(0);
  let k = 0;

  const lpsSnap = (
    note: string,
    line: number,
    i: number,
    active: number[] = [],
  ) => {
    const states: Record<number, CellState> = {};
    for (let j = 0; j < pat.length; j++) {
      states[j] = j > i ? "ghost" : active.includes(j) ? "scan" : "idle";
    }
    r.emit({
      note,
      line,
      cells: cells(pat, states, "p"),
      aux: [
        {
          title:
            "lps — length of the longest proper prefix that is also a suffix",
          cells: lps.map((v, j) => ({
            id: `l${j}`,
            v,
            s: (j > i ? "ghost" : j === i ? "cursor" : "match") as CellState,
          })),
        },
      ],
      stats: [{ label: "phase", value: "preprocess pattern" }],
    });
  };

  lpsSnap(
    `KMP first studies the pattern alone. lps[i] answers: "if I fail at position i, how much of what I already matched is still usable?"`,
    0,
    0,
  );

  for (let i = 1; i < pat.length; i++) {
    while (k > 0 && pat[k] !== pat[i]) {
      lpsSnap(
        `pat[${k}] ≠ pat[${i}] — fall back to lps[${k - 1}] = ${lps[k - 1]}.`,
        3,
        i,
        [k, i],
      );
      k = lps[k - 1];
    }
    if (pat[k] === pat[i]) {
      k++;
      lpsSnap(
        `pat[${k - 1}] = pat[${i}] = '${pat[i]}' — the border grows to ${k}.`,
        4,
        i,
        [k - 1, i],
      );
    }
    lps[i] = k;
  }

  lpsSnap(`Failure function complete: [${lps.join(", ")}].`, 5, pat.length - 1);

  // Phase 2 — scan
  k = 0;
  const matches: number[] = [];

  const scanSnap = (note: string, line: number, i: number, ok?: boolean) => {
    const tStates: Record<number, CellState> = {};
    for (let j = 0; j < text.length; j++) {
      if (j > i) tStates[j] = "ghost";
      else if (j > i - k && j <= i) tStates[j] = "scan";
      else tStates[j] = "muted";
    }
    tStates[i] = ok === true ? "match" : ok === false ? "cursor" : "cursor";
    for (const m of matches) {
      for (let j = m; j < m + pat.length; j++) tStates[j] = "match";
    }
    const pStates: Record<number, CellState> = {};
    for (let j = 0; j < pat.length; j++)
      pStates[j] = j < k ? "scan" : j === k ? "cursor" : "idle";

    r.emit({
      note,
      line,
      cells: cells(text, tStates, "t"),
      pointers: [{ id: "i", name: "i", i, side: "top" }],
      aux: [
        {
          title: `pattern (aligned at text index ${i - k})`,
          cells: cells(pat, pStates, "pp"),
        },
        {
          title: "matches found",
          empty: "—",
          cells: matches.map((m) => ({
            id: `m${m}`,
            v: `@${m}`,
            s: "match" as CellState,
          })),
        },
      ],
      stats: [
        { label: "matched so far", value: k },
        { label: "text pointer", value: "never rewinds" },
      ],
    });
  };

  scanSnap(
    "Now scan the text. The crucial property: `i` only ever moves forward — that is what makes this O(n + m) instead of O(n·m).",
    8,
    0,
  );

  for (let i = 0; i < text.length; i++) {
    while (k > 0 && pat[k] !== text[i]) {
      scanSnap(
        `Mismatch: pattern wants '${pat[k]}' but text has '${text[i]}'. Naive search would restart from text index ${i - k + 1}. KMP instead reuses the border: jump k from ${k} to ${lps[k - 1]} and keep i where it is.`,
        9,
        i,
        false,
      );
      k = lps[k - 1];
    }
    if (pat[k] === text[i]) {
      k++;
      scanSnap(
        `'${text[i]}' matches. ${k} of ${pat.length} characters aligned.`,
        10,
        i,
        true,
      );
    } else {
      scanSnap(
        `'${text[i]}' does not match the pattern start. Move on.`,
        10,
        i,
        false,
      );
    }
    if (k === pat.length) {
      matches.push(i - pat.length + 1);
      scanSnap(
        `Full match ending at ${i}, starting at index ${i - pat.length + 1}.`,
        11,
        i,
        true,
      );
      k = lps[k - 1];
    }
  }

  return {
    title: "KMP — the text pointer never goes backwards",
    code,
    frames: r.done(),
    complexity: { time: "O(n + m)", space: "O(m)" },
  };
}

export function lruCache(): Trace {
  const CAP = 3;
  const ops: [string, string][] = [
    ["put", "A"],
    ["put", "B"],
    ["put", "C"],
    ["get", "A"],
    ["put", "D"],
    ["get", "B"],
    ["put", "E"],
  ];
  const r = new Recorder();
  const code = [
    "# hash map: key -> node       (O(1) lookup)",
    "# doubly-linked list: order   (O(1) move / evict)",
    "",
    "def get(k):",
    "  node = map[k]; move_to_front(node); return node.val",
    "",
    "def put(k, v):",
    "  if len(map) == CAP: evict(tail)   # least recently used",
    "  push_front(Node(k, v))",
  ];

  let order: string[] = []; // front = most recent
  let hits = 0;
  let misses = 0;

  const snap = (
    note: string,
    line: number,
    active?: string,
    evicted?: string,
  ) => {
    r.emit({
      note,
      line,
      aux: [
        {
          title: "recency list — front is most recently used",
          empty: "empty",
          cells: order.map((k, i) => ({
            id: `n${k}`,
            v: k,
            tag: i === 0 ? "MRU" : i === order.length - 1 ? "LRU" : undefined,
            s: (k === active ? "cursor" : "idle") as CellState,
          })),
        },
        {
          title: "hash map keys → node",
          empty: "empty",
          cells: [...order].sort().map((k) => ({
            id: `h${k}`,
            v: k,
            s: (k === active ? "cursor" : "match") as CellState,
          })),
        },
        ...(evicted
          ? [
              {
                title: "evicted",
                cells: [
                  { id: `e${evicted}`, v: evicted, s: "muted" as CellState },
                ],
              },
            ]
          : []),
      ],
      stats: [
        { label: "capacity", value: CAP },
        { label: "hits", value: hits },
        { label: "misses", value: misses },
      ],
    });
  };

  snap(
    "An LRU cache is two structures cooperating: a hash map for O(1) lookup and a doubly-linked list for O(1) reordering. Neither alone can do both.",
    0,
  );

  for (const [op, key] of ops) {
    if (op === "get") {
      if (order.includes(key)) {
        hits++;
        order = [key, ...order.filter((k) => k !== key)];
        snap(
          `get(${key}) — hit. Move it to the front; the list is why this is O(1) rather than an O(n) array shift.`,
          4,
          key,
        );
      } else {
        misses++;
        snap(`get(${key}) — miss.`, 4);
      }
    } else {
      if (order.includes(key)) {
        order = [key, ...order.filter((k) => k !== key)];
        snap(
          `put(${key}) — already present, just refresh its recency.`,
          8,
          key,
        );
      } else if (order.length >= CAP) {
        const victim = order[order.length - 1];
        order = [key, ...order.slice(0, -1)];
        snap(
          `put(${key}) — cache is full. Evict "${victim}", the least recently used, and insert at the front.`,
          7,
          key,
          victim,
        );
      } else {
        order = [key, ...order];
        snap(`put(${key}) — room available, insert at the front.`, 8, key);
      }
    }
  }

  snap(
    `LRU assumes recency predicts reuse. When the workload is frequency-skewed instead — a few very hot keys among many cold ones — LFU wins, and a scan of cold keys will flush an LRU completely. Measure before choosing.`,
    0,
  );

  return {
    title: "LRU cache — hash map + doubly-linked list",
    code,
    frames: r.done(),
    complexity: { time: "O(1) get & put", space: "O(capacity)" },
  };
}

export function fenwick(): Trace {
  const a = [3, 2, -1, 6, 5, 4, -3, 3];
  const n = a.length;
  const r = new Recorder();
  const code = [
    "def update(i, delta):        # add delta at index i",
    "  while i <= n:",
    "    tree[i] += delta",
    "    i += i & (-i)           # jump to the next covering node",
    "",
    "def query(i):               # prefix sum of 1..i",
    "  s = 0",
    "  while i > 0:",
    "    s += tree[i]",
    "    i -= i & (-i)           # strip the lowest set bit",
    "  return s",
  ];

  const tree = new Array(n + 1).fill(0);

  const coverage = (i: number): [number, number] => {
    const low = i & -i;
    return [i - low + 1, i];
  };

  const snap = (
    note: string,
    line: number,
    active: number[] = [],
    arrActive?: number,
  ) => {
    r.emit({
      note,
      line,
      cells: a.map((v, i) => ({
        id: `a${i}`,
        v,
        tag: `${i + 1}`,
        s: (arrActive === i ? "cursor" : "idle") as CellState,
      })),
      aux: [
        {
          title: "tree[i] — each node stores the sum of a range ending at i",
          cells: tree.slice(1).map((v, j) => {
            const idx = j + 1;
            const [lo, hi] = coverage(idx);
            return {
              id: `t${idx}`,
              v,
              tag: lo === hi ? `${lo}` : `${lo}–${hi}`,
              s: (active.includes(idx) ? "scan" : "idle") as CellState,
            };
          }),
        },
      ],
      stats: [
        { label: "nodes touched", value: active.length },
        { label: "vs prefix array", value: "O(log n) update instead of O(n)" },
      ],
    });
  };

  snap(
    "A plain prefix-sum array answers ranges in O(1) but costs O(n) to update. A Fenwick tree trades a little query speed for O(log n) updates — the right structure when the data changes.",
    0,
  );

  for (let idx = 0; idx < n; idx++) {
    const touched: number[] = [];
    let i = idx + 1;
    while (i <= n) {
      tree[i] += a[idx];
      touched.push(i);
      i += i & -i;
    }
    snap(
      `Insert a[${idx}] = ${a[idx]}. It belongs to ${touched.length} covering node${touched.length === 1 ? "" : "s"}: ${touched.join(", ")}. The jump i += i & (-i) walks exactly those.`,
      3,
      touched,
      idx,
    );
  }

  // Query
  const qi = 6;
  let s = 0;
  const touched: number[] = [];
  let i = qi;
  while (i > 0) {
    s += tree[i];
    touched.push(i);
    i -= i & -i;
  }
  snap(
    `Now query the prefix sum of the first ${qi} elements. Strip the lowest set bit each step: ${touched.join(" → ")}. That is ${touched.length} additions instead of ${qi}.`,
    9,
    touched,
  );
  snap(
    `Answer: ${s}. Both update and query are O(log n), and the whole structure is a single array of n+1 integers.`,
    10,
    touched,
  );

  return {
    title: "Fenwick tree — prefix sums that survive updates",
    code,
    frames: r.done(),
    complexity: { time: "O(log n) update & query", space: "O(n)" },
  };
}

export function bloomFilter(): Trace {
  const M = 16;
  const inserts = ["alpha", "bravo", "charlie"];
  const queries: [string, boolean][] = [
    ["alpha", true],
    ["delta", false],
    ["echo", false],
  ];
  const r = new Recorder();
  const code = [
    "bits = [0] * m",
    "",
    "def add(x):",
    "  for h in hashes: bits[h(x) % m] = 1",
    "",
    "def maybe_contains(x):",
    "  return all(bits[h(x) % m] for h in hashes)",
    "",
    "# false positives: possible",
    "# false negatives: IMPOSSIBLE",
  ];

  const h1 = (s: string) => {
    let h = 7;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % M;
  };
  const h2 = (s: string) => {
    let h = 13;
    for (const c of s) h = (h * 131 + c.charCodeAt(0)) >>> 0;
    return h % M;
  };
  const h3 = (s: string) => {
    let h = 5381;
    for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return h % M;
  };

  const bits = new Array(M).fill(0);

  const snap = (
    note: string,
    line: number,
    active: number[] = [],
    hitState: CellState = "cursor",
  ) => {
    const set = bits.reduce((s, b) => s + b, 0);
    r.emit({
      note,
      line,
      cells: bits.map((b, i) => ({
        id: `b${i}`,
        v: b,
        tag: `${i}`,
        s: (active.includes(i) ? hitState : b ? "match" : "idle") as CellState,
      })),
      stats: [
        { label: "bits set", value: `${set} / ${M}` },
        { label: "memory", value: `${M} bits total` },
      ],
    });
  };

  snap(
    'A Bloom filter is just a bit array plus k hash functions. It answers "have I definitely NOT seen this?" using a tiny fraction of the memory a set would need.',
    0,
  );

  for (const x of inserts) {
    const idx = [h1(x), h2(x), h3(x)];
    idx.forEach((i) => (bits[i] = 1));
    snap(
      `add("${x}") — set bits ${[...new Set(idx)].sort((p, q) => p - q).join(", ")}.`,
      3,
      idx,
    );
  }

  for (const [q, present] of queries) {
    const idx = [h1(q), h2(q), h3(q)];
    const all = idx.every((i) => bits[i] === 1);
    if (all && present) {
      snap(
        `maybe_contains("${q}") — all ${idx.length} bits are set, and it genuinely was inserted. True positive.`,
        6,
        idx,
        "match",
      );
    } else if (all && !present) {
      snap(
        `maybe_contains("${q}") — all bits are set, yet "${q}" was never added. This is a FALSE POSITIVE: other keys happened to set exactly these bits. Verify against the real store.`,
        6,
        idx,
        "scan",
      );
    } else {
      const missing = idx.filter((i) => bits[i] === 0);
      snap(
        `maybe_contains("${q}") — bit ${missing[0]} is 0, so "${q}" was definitely never added. A false negative is impossible, which is what makes this safe as a pre-filter.`,
        6,
        idx,
        "scan",
      );
    }
  }

  snap(
    "The trade: you accept a tunable false-positive rate in exchange for roughly 10 bits per element instead of the full key. Use it in front of an expensive lookup, never as the source of truth.",
    9,
  );

  return {
    title: 'Bloom filter — cheap "definitely not here"',
    code,
    frames: r.done(),
    complexity: { time: "O(k)", space: "O(m) bits" },
  };
}

export function subsetEnumeration(): Trace {
  const items = ["a", "b", "c"];
  const n = items.length;
  const r = new Recorder();
  const code = [
    "for mask in range(1 << n):",
    "  subset = [items[i] for i in range(n)",
    "            if mask & (1 << i)]",
    "",
    "# mask & (mask - 1)  clears the lowest set bit",
    "# mask & (-mask)     isolates the lowest set bit",
    "# popcount(mask)     counts the members",
  ];

  const found: string[] = [];

  for (let mask = 0; mask < 1 << n; mask++) {
    const bits = Array.from({ length: n }, (_, i) => (mask >> i) & 1);
    const subset = items.filter((_, i) => bits[i]);
    found.push(subset.length ? subset.join("") : "∅");
    r.emit({
      note: `mask = ${mask} = 0b${mask.toString(2).padStart(n, "0")} → subset {${subset.join(", ")}}. Bit i simply asks "is item i in?" — the integer IS the subset.`,
      line: 1,
      cells: bits.map((b, i) => ({
        id: `bit${i}`,
        v: b,
        tag: items[i],
        s: (b ? "match" : "idle") as CellState,
      })),
      aux: [
        {
          title: "subsets enumerated",
          cells: found.map((s, i) => ({
            id: `s${i}`,
            v: s,
            s: (i === found.length - 1 ? "cursor" : "idle") as CellState,
          })),
        },
      ],
      stats: [
        { label: "mask", value: mask },
        { label: "popcount", value: bits.reduce((s, b) => s + b, 0) },
        { label: "total subsets", value: 1 << n },
      ],
    });
  }

  r.emit({
    note: "All 2ⁿ subsets, with no recursion and no allocation. This is the substrate bitmask DP is built on: the mask is both the loop variable and the DP state.",
    line: 6,
    cells: Array.from({ length: n }, (_, i) => ({
      id: `bit${i}`,
      v: 1,
      tag: items[i],
      s: "match" as CellState,
    })),
    aux: [
      {
        title: "subsets enumerated",
        cells: found.map((s, i) => ({
          id: `s${i}`,
          v: s,
          s: "match" as CellState,
        })),
      },
    ],
  });

  return {
    title: "Bitmask subset enumeration",
    code,
    frames: r.done(),
    complexity: { time: "O(2ⁿ)", space: "O(1)" },
  };
}

export function skipList(): Trace {
  const values = [3, 6, 7, 9, 12, 17, 19, 21, 25, 26];
  // Deterministic level assignment so the drawing is stable and readable.
  const levels = [1, 2, 1, 3, 1, 2, 1, 4, 1, 2];
  const target = 19;
  const r = new Recorder();
  const code = [
    "node = head",
    "for level in range(top, -1, -1):",
    "  while node.next[level] and node.next[level].val < target:",
    "    node = node.next[level]      # skip ahead cheaply",
    "# drop a level and repeat, narrowing in",
  ];

  const maxLevel = Math.max(...levels);

  const snap = (
    note: string,
    line: number,
    cur: number,
    level: number,
    found = false,
  ) => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    values.forEach((v, i) => {
      for (let l = 0; l < levels[i]; l++) {
        nodes.push({
          id: `n${i}-${l}`,
          label: String(v),
          x: 0.06 + (i / (values.length - 1)) * 0.88,
          y: 1 - l / Math.max(1, maxLevel - 1),
          s: (found && i === cur
            ? "match"
            : i === cur && l === level
              ? "cursor"
              : l === level
                ? "scan"
                : "idle") as CellState,
        });
      }
    });

    for (let l = 0; l < maxLevel; l++) {
      const atLevel = values.map((_, i) => i).filter((i) => levels[i] > l);
      for (let j = 0; j + 1 < atLevel.length; j++) {
        edges.push({
          from: `n${atLevel[j]}-${l}`,
          to: `n${atLevel[j + 1]}-${l}`,
          directed: true,
          s: (l === level ? "cursor" : undefined) as CellState | undefined,
        });
      }
    }

    r.emit({
      note,
      line,
      nodes,
      edges,
      stats: [
        { label: "searching for", value: target },
        { label: "at level", value: level },
        { label: "expected height", value: "O(log n)" },
      ],
    });
  };

  snap(
    `A skip list is a sorted linked list with express lanes. Higher levels are sampled by coin flip, giving O(log n) expected search without any rebalancing code — which is why order books and concurrent maps like them.`,
    0,
    0,
    maxLevel - 1,
  );

  let cur = 0;
  for (let level = maxLevel - 1; level >= 0; level--) {
    snap(
      `Drop to level ${level}. The links here are shorter, so the search narrows.`,
      1,
      cur,
      level,
    );
    for (;;) {
      const next = values.findIndex((_, i) => i > cur && levels[i] > level);
      if (next === -1 || values[next] >= target) {
        if (next !== -1 && values[next] === target) {
          cur = next;
          snap(`Found ${target}.`, 3, cur, level, true);
          level = -1;
        }
        break;
      }
      snap(
        `${values[next]} < ${target}, so skip straight there — this hop passes over ${next - cur - 1} node${next - cur - 1 === 1 ? "" : "s"} for free.`,
        3,
        next,
        level,
      );
      cur = next;
    }
  }

  return {
    title: "Skip list — probabilistic balancing, no rotations",
    code,
    frames: r.done(),
    complexity: { time: "O(log n) expected", space: "O(n)" },
  };
}

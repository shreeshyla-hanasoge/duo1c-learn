import {
  Recorder,
  cells,
  type CellState,
  type GraphEdge,
  type GraphNode,
  type Trace,
} from "../trace";

/* ========================================================================
 * Tier 1 — core structures
 * ===================================================================== */

export function monotonicDeque(): Trace {
  const a = [1, 3, -1, -3, 5, 3, 6, 7];
  const k = 3;
  const r = new Recorder();
  const code = [
    "dq = deque()          # holds INDICES, values decreasing",
    "for i in range(n):",
    "  if dq[0] <= i - k: dq.popleft()       # left the window",
    "  while dq and a[dq[-1]] <= a[i]:",
    "    dq.pop()          # smaller AND older — never the max again",
    "  dq.append(i)",
    "  if i >= k - 1: out.append(a[dq[0]])   # front is the max",
  ];

  const dq: number[] = [];
  const out: number[] = [];
  // Tracked purely to show the reader the amortised argument as a number:
  // deque ops stay ~2n while the naive rescan cost climbs as n·k.
  let pushes = 0;
  let pops = 0;

  const snap = (
    note: string,
    line: number,
    i: number,
    extra: Record<number, CellState> = {},
  ) => {
    const states: Record<number, CellState> = {};
    const lo = Math.max(0, i - k + 1);
    for (let j = 0; j < a.length; j++) {
      if (j > i) states[j] = "ghost";
      else if (j < lo) states[j] = "muted";
      else states[j] = "idle";
    }
    if (dq.length) states[dq[0]] = "match";
    states[i] = "cursor";
    Object.assign(states, extra);
    r.emit({
      note,
      line,
      cells: cells(a, states),
      window: i >= k - 1 ? [lo, i] : null,
      pointers: [{ id: "i", name: "i", i, side: "top" }],
      aux: [
        {
          title: "deque (indices, values strictly decreasing →)",
          empty: "empty",
          cells: dq.map((idx, p) => ({
            id: `d${idx}`,
            v: a[idx],
            tag: `i=${idx}`,
            s: (p === 0 ? "match" : "idle") as CellState,
          })),
        },
        {
          title: "window maxima",
          empty: "—",
          cells: out.map((v, p) => ({
            id: `o${p}`,
            v,
            s: "match" as CellState,
          })),
        },
      ],
      stats: [
        { label: "window size k", value: k },
        { label: "in deque", value: dq.length },
        { label: "naive cost so far", value: `${(i + 1) * k} reads` },
        { label: "deque cost so far", value: `${pushes + pops} ops` },
      ],
    });
  };

  r.emit({
    note: `Sliding-window maximum with k = ${k}. The naive way rescans k elements per window — O(n·k). The deque does it in O(n).`,
    line: 0,
    cells: cells(
      a,
      Object.fromEntries(a.map((_, i) => [i, "ghost" as CellState])),
    ),
  });

  for (let i = 0; i < a.length; i++) {
    snap(`Advance to index ${i} (value ${a[i]}).`, 1, i);

    if (dq.length && dq[0] <= i - k) {
      const gone = dq[0];
      snap(
        `Index ${gone} has fallen out of the window — drop it from the front.`,
        2,
        i,
        {
          [gone]: "muted",
        },
      );
      dq.shift();
      pops++;
    }

    while (dq.length && a[dq[dq.length - 1]] <= a[i]) {
      const back = dq[dq.length - 1];
      snap(
        `a[${back}] = ${a[back]} ≤ a[${i}] = ${a[i]}. It is both smaller AND older, so it can never be the maximum of any future window. Discard it permanently.`,
        4,
        i,
        { [back]: "muted" },
      );
      dq.pop();
      pops++;
    }

    dq.push(i);
    pushes++;
    snap(
      `Push index ${i}. The deque stays sorted by value, largest at the front.`,
      5,
      i,
    );

    if (i >= k - 1) {
      out.push(a[dq[0]]);
      snap(
        `Window [${i - k + 1}..${i}] complete — its maximum is the deque front: ${a[dq[0]]}.`,
        6,
        i,
      );
    }
  }

  r.emit({
    note: `Done in ${pushes + pops} deque operations. A naive rescan would have read ${a.length * k} elements. Each index entered and left the deque at most once, so the whole run is O(n) — not O(n·k). That amortised argument is the entire point of the structure.`,
    line: 6,
    cells: cells(
      a,
      Object.fromEntries(a.map((_, i) => [i, "muted" as CellState])),
    ),
    aux: [
      {
        title: "window maxima",
        cells: out.map((v, p) => ({ id: `o${p}`, v, s: "match" as CellState })),
      },
    ],
    stats: [
      { label: "deque ops", value: pushes + pops },
      { label: "naive reads", value: a.length * k },
    ],
  });

  return {
    title: "Monotonic deque — sliding-window maximum in O(n)",
    code,
    frames: r.done(),
    complexity: { time: "O(n)", space: "O(k)" },
  };
}

export function monotonicStack(): Trace {
  const a = [2, 1, 2, 4, 3, 1];
  const r = new Recorder();
  const code = [
    "stack = []            # indices, values decreasing",
    "res = [-1] * n",
    "for i in range(n):",
    "  while stack and a[stack[-1]] < a[i]:",
    "    res[stack.pop()] = a[i]   # a[i] is its next greater",
    "  stack.append(i)",
  ];

  const stack: number[] = [];
  const res: (number | string)[] = a.map(() => "—");

  const snap = (
    note: string,
    line: number,
    i: number,
    extra: Record<number, CellState> = {},
  ) => {
    const states: Record<number, CellState> = {};
    for (let j = 0; j < a.length; j++) states[j] = j > i ? "ghost" : "idle";
    for (const s of stack) states[s] = "scan";
    states[i] = "cursor";
    Object.assign(states, extra);
    r.emit({
      note,
      line,
      cells: cells(a, states),
      pointers: [{ id: "i", name: "i", i, side: "top" }],
      aux: [
        {
          title: "stack (indices awaiting a greater element →)",
          empty: "empty",
          cells: stack.map((idx) => ({
            id: `s${idx}`,
            v: a[idx],
            tag: `i=${idx}`,
            s: "scan" as CellState,
          })),
        },
        {
          title: "next greater element",
          cells: res.map((v, j) => ({
            id: `r${j}`,
            v,
            s: (v === "—" ? "ghost" : "match") as CellState,
          })),
        },
      ],
    });
  };

  r.emit({
    note: "For each element, find the next element to its right that is strictly greater. Brute force is O(n²); a monotonic stack is O(n).",
    line: 0,
    cells: cells(
      a,
      Object.fromEntries(a.map((_, i) => [i, "ghost" as CellState])),
    ),
  });

  for (let i = 0; i < a.length; i++) {
    snap(`Look at index ${i}, value ${a[i]}.`, 2, i);
    while (stack.length && a[stack[stack.length - 1]] < a[i]) {
      const idx = stack.pop() as number;
      res[idx] = a[i];
      snap(
        `a[${i}] = ${a[i]} is greater than the stack top a[${idx}] = ${a[idx]}. So ${a[i]} is the answer for index ${idx} — resolve and pop it.`,
        4,
        i,
        { [idx]: "match" },
      );
    }
    stack.push(i);
    snap(
      `Nothing left to resolve. Push index ${i} and wait for something bigger.`,
      5,
      i,
    );
  }

  snap(
    `Whatever is still on the stack has no greater element to its right.`,
    5,
    a.length - 1,
  );

  return {
    title: "Monotonic stack — next greater element",
    code,
    frames: r.done(),
    complexity: { time: "O(n)", space: "O(n)" },
  };
}

/** Lay a binary heap array out as a tree in normalised coordinates. */
function heapLayout(size: number): { x: number; y: number }[] {
  const depth = Math.max(1, Math.ceil(Math.log2(size + 1)));
  return Array.from({ length: size }, (_, i) => {
    const d = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (2 ** d - 1);
    const count = 2 ** d;
    return {
      x: (posInLevel + 0.5) / count,
      y: depth === 1 ? 0.5 : d / (depth - 1 || 1),
    };
  });
}

export function binaryHeap(): Trace {
  const input = [5, 3, 8, 1, 9, 2];
  const heap: number[] = [];
  const r = new Recorder();
  const code = [
    "def push(x):",
    "  heap.append(x)",
    "  i = len(heap) - 1",
    "  while i > 0 and heap[(i-1)//2] < heap[i]:   # sift up",
    "    swap(i, (i-1)//2); i = (i-1)//2",
    "",
    "# parent(i) = (i-1)//2   children = 2i+1, 2i+2",
    "# the tree is IMPLICIT — there are no pointers",
  ];

  const snap = (
    note: string,
    line: number,
    active: number[] = [],
    settled = false,
  ) => {
    const pos = heapLayout(heap.length);
    const nodes: GraphNode[] = heap.map((v, i) => ({
      id: `h${i}`,
      label: String(v),
      x: pos[i].x,
      y: pos[i].y,
      s: active.includes(i) ? "scan" : settled ? "match" : "idle",
    }));
    const edges: GraphEdge[] = [];
    for (let i = 1; i < heap.length; i++) {
      edges.push({ from: `h${Math.floor((i - 1) / 2)}`, to: `h${i}` });
    }
    r.emit({
      note,
      line,
      nodes,
      edges,
      cells: heap.map((v, i) => ({
        id: `a${i}`,
        v,
        tag: `${i}`,
        s: (active.includes(i)
          ? "scan"
          : settled
            ? "match"
            : "idle") as CellState,
      })),
      stats: [
        { label: "size", value: heap.length },
        {
          label: "height",
          value: heap.length ? Math.floor(Math.log2(heap.length)) + 1 : 0,
        },
      ],
    });
  };

  r.emit({
    note: "A binary heap is an array that pretends to be a tree. Parent of i is (i-1)//2 — no pointers, perfect cache locality.",
    line: 6,
  });

  for (const x of input) {
    heap.push(x);
    let i = heap.length - 1;
    snap(
      `Push ${x} at the end of the array — position ${i}. The shape stays a complete tree by construction.`,
      1,
      [i],
    );

    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (heap[p] >= heap[i]) {
        snap(
          `Parent ${heap[p]} ≥ ${heap[i]}, so the heap property holds. Stop sifting.`,
          3,
          [i, p],
        );
        break;
      }
      snap(
        `Parent ${heap[p]} < child ${heap[i]} — violates max-heap. Swap them.`,
        4,
        [i, p],
      );
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  }

  snap(
    `Heap built. The maximum is always at index 0, reachable in O(1); every push costs at most O(log n) swaps — the height of the tree.`,
    7,
    [],
    true,
  );

  return {
    title: "Binary heap — the implicit tree inside an array",
    code,
    frames: r.done(),
    complexity: { time: "O(log n) push/pop · O(1) peek", space: "O(n)" },
  };
}

export function floydCycle(): Trace {
  // 0→1→2→3→4→5→6→3 (cycle of length 4 starting at node 3)
  const n = 7;
  const cycleStart = 3;
  const next = (i: number) => (i === n - 1 ? cycleStart : i + 1);
  const r = new Recorder();
  const code = [
    "slow = head; fast = head",
    "while fast and fast.next:",
    "  slow = slow.next          # 1 step",
    "  fast = fast.next.next     # 2 steps",
    "  if slow is fast: break    # they met — there is a cycle",
    "",
    "# to find the entry: reset one to head,",
    "# then advance both one step at a time",
  ];

  const layout = (): { x: number; y: number }[] => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < cycleStart; i++) {
      pts.push({ x: 0.06 + i * 0.13, y: 0.5 });
    }
    const ringCount = n - cycleStart;
    for (let i = 0; i < ringCount; i++) {
      const angle = Math.PI + (i / ringCount) * Math.PI * 2;
      pts.push({
        x: 0.68 + 0.2 * Math.cos(angle),
        y: 0.5 + 0.34 * Math.sin(angle),
      });
    }
    return pts;
  };
  const pos = layout();

  const snap = (
    note: string,
    line: number,
    slow: number,
    fast: number,
    met = false,
    entry?: number,
  ) => {
    const nodes: GraphNode[] = Array.from({ length: n }, (_, i) => ({
      id: `n${i}`,
      label: String(i),
      x: pos[i].x,
      y: pos[i].y,
      s: (entry === i
        ? "match"
        : met && i === slow
          ? "match"
          : i === slow && i === fast
            ? "match"
            : i === slow
              ? "cursor"
              : i === fast
                ? "scan"
                : "idle") as CellState,
      badge:
        i === slow && i === fast
          ? "slow+fast"
          : i === slow
            ? "slow"
            : i === fast
              ? "fast"
              : undefined,
    }));
    const edges: GraphEdge[] = Array.from({ length: n }, (_, i) => ({
      from: `n${i}`,
      to: `n${next(i)}`,
      directed: true,
    }));
    r.emit({
      note,
      line,
      nodes,
      edges,
      stats: [{ label: "extra space", value: "O(1)" }],
    });
  };

  let slow = 0;
  let fast = 0;
  snap(
    "Floyd's tortoise and hare. Both start at the head; one moves 1 step, the other 2. No visited-set, no extra memory.",
    0,
    slow,
    fast,
  );

  let steps = 0;
  while (steps < 20) {
    slow = next(slow);
    fast = next(next(fast));
    steps++;
    if (slow === fast) {
      snap(
        `They meet at node ${slow}. The gap between them closes by exactly 1 each step, so inside a cycle a meeting is guaranteed.`,
        4,
        slow,
        fast,
        true,
      );
      break;
    }
    snap(
      `Step ${steps}: slow at ${slow}, fast at ${fast}. Fast gains one node per step.`,
      3,
      slow,
      fast,
    );
  }

  // Phase 2 — find the entry point.
  let p = 0;
  let q = slow;
  snap(
    "Now reset one pointer to the head and move both one step at a time. Where they meet is the cycle entry — that falls out of the distance algebra.",
    7,
    p,
    q,
  );
  while (p !== q) {
    p = next(p);
    q = next(q);
    snap(`Advance both by one: ${p} and ${q}.`, 7, p, q);
  }
  snap(
    `Both land on node ${p} — the first node of the cycle.`,
    7,
    p,
    q,
    true,
    p,
  );

  return {
    title: "Floyd's cycle detection — O(1) space",
    code,
    frames: r.done(),
    complexity: { time: "O(n)", space: "O(1)" },
  };
}

export function trie(): Trace {
  const words = ["car", "cart", "cat", "dog"];
  const query = "car";
  const r = new Recorder();
  const code = [
    "class Node: children = {}, terminal = False",
    "",
    "def insert(word):",
    "  node = root",
    "  for ch in word:",
    "    node = node.children.setdefault(ch, Node())",
    "  node.terminal = True",
    "",
    "# prefix search is O(len(prefix)) —",
    "# independent of how many words are stored",
  ];

  interface TNode {
    id: string;
    ch: string;
    depth: number;
    children: Map<string, TNode>;
    terminal: boolean;
  }
  let counter = 0;
  const root: TNode = {
    id: "root",
    ch: "·",
    depth: 0,
    children: new Map(),
    terminal: false,
  };

  const collect = (): TNode[] => {
    const out: TNode[] = [];
    const walk = (nd: TNode) => {
      out.push(nd);
      for (const c of nd.children.values()) walk(c);
    };
    walk(root);
    return out;
  };

  const snap = (
    note: string,
    line: number,
    active: Set<string>,
    matched: Set<string> = new Set(),
  ) => {
    const all = collect();
    const maxDepth = Math.max(...all.map((nd) => nd.depth), 1);
    // Assign x by in-order leaf position so the tree does not overlap.
    const leafX = new Map<string, number>();
    let leafCounter = 0;
    const assign = (nd: TNode): number => {
      if (nd.children.size === 0) {
        const x = leafCounter++;
        leafX.set(nd.id, x);
        return x;
      }
      const xs = [...nd.children.values()].map(assign);
      const x = (Math.min(...xs) + Math.max(...xs)) / 2;
      leafX.set(nd.id, x);
      return x;
    };
    assign(root);
    const span = Math.max(1, leafCounter - 1);

    const nodes: GraphNode[] = all.map((nd) => ({
      id: nd.id,
      label: nd.ch,
      x: 0.08 + ((leafX.get(nd.id) as number) / span) * 0.84,
      y: maxDepth === 0 ? 0.5 : nd.depth / maxDepth,
      s: matched.has(nd.id)
        ? "match"
        : active.has(nd.id)
          ? "cursor"
          : nd.terminal
            ? "scan"
            : "idle",
      badge: nd.terminal ? "word" : undefined,
    }));
    const edges: GraphEdge[] = [];
    const walk = (nd: TNode) => {
      for (const c of nd.children.values()) {
        edges.push({
          from: nd.id,
          to: c.id,
          s: matched.has(c.id) ? "match" : undefined,
        });
        walk(c);
      }
    };
    walk(root);

    r.emit({
      note,
      line,
      nodes,
      edges,
      stats: [
        {
          label: "words",
          value: words.filter((w) =>
            all.some((nd) => nd.terminal && nd.depth === w.length),
          ).length,
        },
        { label: "nodes", value: all.length },
      ],
    });
  };

  snap(
    "A trie stores words by their shared prefixes. Common prefixes are stored exactly once.",
    0,
    new Set(),
  );

  for (const w of words) {
    let node = root;
    const path = new Set<string>([root.id]);
    for (const ch of w) {
      let child = node.children.get(ch);
      if (!child) {
        child = {
          id: `n${counter++}`,
          ch,
          depth: node.depth + 1,
          children: new Map(),
          terminal: false,
        };
        node.children.set(ch, child);
        node = child;
        path.add(node.id);
        snap(
          `Insert "${w}": '${ch}' is new — create a node.`,
          5,
          new Set(path),
        );
      } else {
        node = child;
        path.add(node.id);
        snap(
          `Insert "${w}": '${ch}' already exists — reuse the shared prefix. This is why a trie beats storing each word separately.`,
          5,
          new Set(path),
        );
      }
    }
    node.terminal = true;
    snap(`Mark the end of "${w}".`, 6, new Set(path));
  }

  // Prefix search
  let node: TNode | undefined = root;
  const matched = new Set<string>([root.id]);
  snap(`Now search for the prefix "${query}".`, 8, new Set([root.id]));
  for (const ch of query) {
    node = node?.children.get(ch);
    if (!node) break;
    matched.add(node.id);
    snap(
      `Follow '${ch}'. One hop, one character — the number of stored words is irrelevant.`,
      8,
      new Set([node.id]),
      new Set(matched),
    );
  }

  const completions: string[] = [];
  if (node) {
    const walk = (nd: TNode, acc: string) => {
      if (nd.terminal) completions.push(acc);
      for (const [ch, c] of nd.children) walk(c, acc + ch);
    };
    walk(node, query);
  }

  snap(
    `Prefix found in ${query.length} hops. Everything in the subtree below is a completion: ${completions.join(", ")}.`,
    9,
    new Set(),
    matched,
  );

  return {
    title: "Trie — prefix search in O(length), not O(words)",
    code,
    frames: r.done(),
    complexity: { time: "O(L) insert & search", space: "O(total chars)" },
  };
}

export function mergeIntervals(): Trace {
  const input: [number, number][] = [
    [1, 3],
    [8, 10],
    [2, 6],
    [15, 18],
    [9, 12],
  ];
  const r = new Recorder();
  const code = [
    "intervals.sort(key=lambda x: x.start)   # the whole trick",
    "out = [intervals[0]]",
    "for cur in intervals[1:]:",
    "  if cur.start <= out[-1].end:",
    "    out[-1].end = max(out[-1].end, cur.end)   # overlap",
    "  else:",
    "    out.append(cur)                            # disjoint",
  ];

  const domain: [number, number] = [0, 20];
  const sorted = [...input].sort((x, y) => x[0] - y[0]);

  const view = (
    rows: {
      id: string;
      label: string;
      lo: number;
      hi: number;
      s?: CellState;
      lane?: number;
    }[],
    sweep?: number | null,
    caption?: string,
  ) => ({ domain, rows, sweep: sweep ?? null, caption });

  r.emit({
    note: "Merge every set of overlapping intervals. Unsorted, deciding what overlaps what is O(n²).",
    line: 0,
    intervals: view(
      input.map((iv, i) => ({
        id: `i${i}`,
        label: `[${iv[0]}, ${iv[1]}]`,
        lo: iv[0],
        hi: iv[1],
        lane: i,
      })),
      null,
      "input order",
    ),
  });

  r.emit({
    note: "Sort by start time. Now any interval can only overlap the one currently being built — everything earlier is already settled.",
    line: 0,
    intervals: view(
      sorted.map((iv, i) => ({
        id: `i${input.indexOf(iv)}`,
        label: `[${iv[0]}, ${iv[1]}]`,
        lo: iv[0],
        hi: iv[1],
        lane: i,
        s: "idle" as CellState,
      })),
      null,
      "sorted by start",
    ),
  });

  const out: [number, number][] = [[...sorted[0]] as [number, number]];

  const render = (
    activeIdx: number,
    note: string,
    line: number,
    overlap?: boolean,
  ) => {
    const rows = sorted.map((iv, i) => ({
      id: `i${input.indexOf(iv)}`,
      label: `[${iv[0]}, ${iv[1]}]`,
      lo: iv[0],
      hi: iv[1],
      lane: i,
      s: (i < activeIdx
        ? "muted"
        : i === activeIdx
          ? overlap
            ? "scan"
            : "cursor"
          : "ghost") as CellState,
    }));
    const merged = out.map((iv, i) => ({
      id: `m${i}`,
      label: `[${iv[0]}, ${iv[1]}]`,
      lo: iv[0],
      hi: iv[1],
      lane: sorted.length + 1 + i,
      s: "match" as CellState,
    }));
    r.emit({
      note,
      line,
      intervals: view(
        [...rows, ...merged],
        sorted[activeIdx]?.[0] ?? null,
        "sorted input above · merged result below",
      ),
      stats: [{ label: "merged count", value: out.length }],
    });
  };

  render(
    0,
    `Seed the result with the earliest interval [${out[0][0]}, ${out[0][1]}].`,
    1,
  );

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur[0] <= last[1]) {
      render(
        i,
        `[${cur[0]}, ${cur[1]}] starts at ${cur[0]}, which is ≤ ${last[1]} — they touch. Extend the open interval.`,
        4,
        true,
      );
      last[1] = Math.max(last[1], cur[1]);
      render(i, `Merged into [${last[0]}, ${last[1]}].`, 4, true);
    } else {
      render(
        i,
        `[${cur[0]}, ${cur[1]}] starts after ${last[1]} — no overlap possible with anything already closed. Start a new interval.`,
        6,
      );
      out.push([...cur] as [number, number]);
      render(i, `Result now holds ${out.length} disjoint intervals.`, 6);
    }
  }

  r.emit({
    note: `Done — ${out.map((iv) => `[${iv[0]}, ${iv[1]}]`).join(", ")}. The sort dominates, so this is O(n log n); the sweep itself is a single O(n) pass.`,
    line: 6,
    intervals: view(
      out.map((iv, i) => ({
        id: `m${i}`,
        label: `[${iv[0]}, ${iv[1]}]`,
        lo: iv[0],
        hi: iv[1],
        lane: i,
        s: "match" as CellState,
      })),
      null,
      "result",
    ),
  });

  return {
    title: "Merge intervals — sort, then one sweep",
    code,
    frames: r.done(),
    complexity: { time: "O(n log n)", space: "O(n)" },
  };
}

export function iterativeInorder(): Trace {
  //        8
  //     3     10
  //    1  6      14
  //      4 7    13
  interface BNode {
    id: string;
    v: number;
    l?: BNode;
    r?: BNode;
    x: number;
    y: number;
  }
  const mk = (
    v: number,
    x: number,
    y: number,
    l?: BNode,
    r?: BNode,
  ): BNode => ({
    id: `b${v}`,
    v,
    l,
    r,
    x,
    y,
  });
  const root = mk(
    8,
    0.5,
    0,
    mk(
      3,
      0.25,
      0.33,
      mk(1, 0.1, 0.66),
      mk(6, 0.38, 0.66, mk(4, 0.31, 1), mk(7, 0.45, 1)),
    ),
    mk(10, 0.75, 0.33, undefined, mk(14, 0.88, 0.66, mk(13, 0.8, 1))),
  );

  const r = new Recorder();
  const code = [
    "stack = []; node = root; out = []",
    "while node or stack:",
    "  while node:              # dive left",
    "    stack.append(node); node = node.left",
    "  node = stack.pop()       # nothing left — visit",
    "  out.append(node.val)",
    "  node = node.right        # then go right",
  ];

  const all: BNode[] = [];
  const walk = (nd?: BNode) => {
    if (!nd) return;
    all.push(nd);
    walk(nd.l);
    walk(nd.r);
  };
  walk(root);

  const edges: GraphEdge[] = [];
  for (const nd of all) {
    if (nd.l) edges.push({ from: nd.id, to: nd.l.id });
    if (nd.r) edges.push({ from: nd.id, to: nd.r.id });
  }

  const stack: BNode[] = [];
  const out: number[] = [];

  const snap = (note: string, line: number, cur?: BNode) => {
    const onStack = new Set(stack.map((s) => s.id));
    const visited = new Set(out.map((v) => `b${v}`));
    const nodes: GraphNode[] = all.map((nd) => ({
      id: nd.id,
      label: String(nd.v),
      x: nd.x,
      y: nd.y,
      s: (cur?.id === nd.id
        ? "cursor"
        : visited.has(nd.id)
          ? "match"
          : onStack.has(nd.id)
            ? "scan"
            : "idle") as CellState,
    }));
    r.emit({
      note,
      line,
      nodes,
      edges,
      aux: [
        {
          title: "stack (explicit — this is what recursion hides)",
          empty: "empty",
          cells: stack.map((nd) => ({
            id: `s${nd.v}`,
            v: nd.v,
            s: "scan" as CellState,
          })),
        },
        {
          title: "output (in-order)",
          empty: "—",
          cells: out.map((v, i) => ({
            id: `o${i}`,
            v,
            s: "match" as CellState,
          })),
        },
      ],
      stats: [{ label: "stack depth", value: stack.length }],
    });
  };

  let node: BNode | undefined = root;
  snap(
    "In-order traversal without recursion. The call stack becomes an explicit stack — that is the whole conversion.",
    0,
    node,
  );

  while (node || stack.length) {
    while (node) {
      stack.push(node);
      snap(
        `Push ${node.v} and dive left. We cannot visit a node until its entire left subtree is done.`,
        3,
        node,
      );
      node = node.l;
    }
    node = stack.pop() as BNode;
    out.push(node.v);
    snap(
      `No left child left. Visit ${node.v} — for a BST, in-order emits values in sorted order.`,
      5,
      node,
    );
    node = node.r;
    if (node) snap(`Now handle ${node.v}'s right subtree.`, 6, node);
  }

  snap(
    `Done: ${out.join(", ")} — sorted, as a BST guarantees. Peak stack depth was the tree height, not the node count.`,
    6,
  );

  return {
    title: "Iterative in-order traversal — recursion made explicit",
    code,
    frames: r.done(),
    complexity: { time: "O(n)", space: "O(h)" },
  };
}

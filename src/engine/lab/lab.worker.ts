/// <reference lib="webworker" />

/**
 * The lab sandbox.
 *
 * Reader-written code runs here, never on the main thread — so an infinite
 * loop costs a `worker.terminate()` rather than a frozen tab. The worker has
 * no DOM by construction; the network globals are deleted below because a
 * learning exercise has no business making requests, and a stray `fetch` in
 * pasted code should fail loudly rather than quietly hit the network.
 *
 * This is a guard against ACCIDENTS, not a security boundary. The code being
 * run is the reader's own, in their own browser.
 */

const scope = self as unknown as Record<string, unknown>;
for (const banned of [
  "fetch",
  "XMLHttpRequest",
  "importScripts",
  "WebSocket",
  "EventSource",
  "indexedDB",
  "caches",
]) {
  try {
    delete scope[banned];
  } catch {
    /* some engines make these non-configurable; best effort is fine */
  }
}

export type LabTest = {
  name: string;
  input: unknown[];
  expected: unknown;
  hidden?: boolean;
};

type Req =
  | { kind: "tests"; code: string; fnName: string; tests: LabTest[] }
  | {
      kind: "growth";
      code: string;
      fnName: string;
      gen: string;
      sizes: number[];
      reps: number;
    };

/** Structural equality that treats NaN as equal to itself. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a && b && typeof a === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        deepEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
      )
    );
  }
  return false;
}

function show(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

/** Compiles the submission and hands back the function under test. */
function compile(
  code: string,
  fnName: string,
): (...args: unknown[]) => unknown {
  const factory = new Function(
    `${code}\n;return typeof ${fnName} === "function" ? ${fnName} : null;`,
  );
  const fn = factory();
  if (typeof fn !== "function") {
    throw new Error(
      `No function named "${fnName}" was defined. Keep the given signature.`,
    );
  }
  return fn as (...args: unknown[]) => unknown;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const req = e.data;
  try {
    const fn = compile(req.code, req.fnName);

    if (req.kind === "tests") {
      const results = req.tests.map((t) => {
        try {
          // Structured-clone gives each test a fresh copy, so a submission
          // that mutates its input cannot corrupt a later test.
          const got = fn(...structuredClone(t.input));
          return {
            name: t.name,
            hidden: t.hidden ?? false,
            pass: deepEqual(got, t.expected),
            got: show(got),
            expected: show(t.expected),
          };
        } catch (err) {
          return {
            name: t.name,
            hidden: t.hidden ?? false,
            pass: false,
            got: err instanceof Error ? err.message : String(err),
            expected: show(t.expected),
            threw: true,
          };
        }
      });
      self.postMessage({ kind: "tests", results });
      return;
    }

    // Growth measurement for the complexity gate.
    const makeInput = new Function(`return (${req.gen});`)() as (
      n: number,
    ) => unknown[];

    // Warm-up so JIT compilation is not billed to the smallest size.
    //
    // One call is NOT enough. V8 promotes a function to optimised code only
    // after it has run several times, so a single warm-up leaves the first
    // measured size running in slower code than every later size. That makes
    // the smallest size look artificially expensive and flattens the measured
    // curve, which is how a genuinely quadratic solution can slip past the
    // gate. Measured, not theorised — see scripts/labs.mts.
    for (let i = 0; i < 3; i++) fn(...makeInput(req.sizes[0]));

    // A tight linear solution can finish in ~0.03 ms, which is at or below
    // `performance.now()`'s clamped resolution in a worker — timing a single
    // call there measures noise, not the algorithm. So time a BLOCK of k
    // calls and divide, growing k until the block clears a floor well above
    // the clock's granularity.
    //
    // Consequence worth knowing: the input is built once and reused across
    // the block, so a growth-gated lab must not mutate its arguments.
    const BLOCK_FLOOR_MS = 8;
    const MAX_K = 1 << 20;

    const timeOne = (args: unknown[]) => {
      // Warm this specific size before timing it. For a slow submission the
      // block below runs only once, so without this the first timed call at
      // each size also pays for type feedback that later sizes do not.
      fn(...args);
      let k = 1;
      for (;;) {
        const t0 = performance.now();
        for (let i = 0; i < k; i++) fn(...args);
        const dt = performance.now() - t0;
        if (dt >= BLOCK_FLOOR_MS || k >= MAX_K) {
          return { perCall: dt / k, reached: dt >= BLOCK_FLOOR_MS };
        }
        // Jump straight to the k that should clear the floor, with a floor of
        // 2× so a 0 ms reading still makes progress.
        k = Math.max(
          k * 2,
          Math.ceil((k * BLOCK_FLOOR_MS) / Math.max(dt, 0.05)),
        );
      }
    };

    // A quadratic solution costs ~4× more at every step, so measuring all
    // sizes at full reps can take longer than any sane timeout. Stop early
    // once the budget is spent — two sizes already give a ratio, and a
    // partial answer beats a timeout that says nothing.
    const TOTAL_BUDGET_MS = 4000;
    const startedAt = performance.now();

    const timings: { n: number; ms: number; reached: boolean }[] = [];
    for (const n of req.sizes) {
      const args = makeInput(n);
      const samples: number[] = [];
      let reached = true;
      for (let r = 0; r < req.reps; r++) {
        const m = timeOne(args);
        samples.push(m.perCall);
        if (!m.reached) reached = false;
        // Even one rep is enough once we are over budget.
        if (performance.now() - startedAt > TOTAL_BUDGET_MS) break;
      }
      samples.sort((a, b) => a - b);
      // Median, not mean: GC pauses and scheduler noise are one-sided spikes.
      timings.push({
        n,
        ms: samples[Math.floor(samples.length / 2)],
        reached,
      });
      if (
        performance.now() - startedAt > TOTAL_BUDGET_MS &&
        timings.length >= 2
      ) {
        break;
      }
    }

    self.postMessage({ kind: "growth", timings });
  } catch (err) {
    self.postMessage({
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

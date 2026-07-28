import type { LabTest } from "./lab.worker";
import type { ComplexityTarget } from "../../data/types";

/**
 * Main-thread driver for the lab sandbox.
 *
 * A fresh worker per run, terminated afterwards. That costs a few ms and buys
 * two things: an infinite loop is killable, and one submission cannot leave
 * globals behind that change how the next one behaves.
 */

/**
 * Re-exported so the engine stays the one import site for gate machinery, but
 * the definition lives in `data/types.ts` — the Node-side audit scripts need it
 * without dragging `Worker` into scope.
 */
export type { ComplexityTarget };

export interface TestResult {
  name: string;
  hidden: boolean;
  pass: boolean;
  got: string;
  expected: string;
  threw?: boolean;
}

export interface GrowthResult {
  timings: { n: number; ms: number; reached?: boolean }[];
  /** t(2n)/t(n) for each consecutive pair — shown, not used for the verdict. */
  ratios: number[];
  /**
   * Cost per doubling, derived from a least-squares fit of log(time) against
   * log(n) across ALL sizes. Using every point rather than the median of
   * three noisy adjacent ratios is what keeps a correct solution from being
   * rejected by one unlucky measurement.
   */
  growthRatio: number;
  /** The fitted exponent itself: ~1 is linear, ~2 is quadratic. */
  exponent: number;
  threshold: number;
  pass: boolean;
  /** True when the run was too fast to time reliably — verdict is not trustworthy. */
  lowSignal: boolean;
}

/**
 * Fits `time ≈ c · n^p` and returns p, by ordinary least squares on the log
 * of both axes. A power law is a straight line in log-log space, so the slope
 * IS the exponent.
 */
export function fitExponent(points: { n: number; ms: number }[]): number {
  const usable = points.filter((t) => t.ms > 0 && t.n > 0);
  if (usable.length < 2) return NaN;

  const xs = usable.map((t) => Math.log(t.n));
  const ys = usable.map((t) => Math.log(t.ms));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;

  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? NaN : num / den;
}

const DEFAULT_TIMEOUT_MS = 5000;

function spawn(): Worker {
  return new Worker(new URL("./lab.worker.ts", import.meta.url), {
    type: "module",
  });
}

function once<T>(
  worker: Worker,
  payload: unknown,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(
        new Error(
          `Timed out after ${timeoutMs} ms — most likely an infinite loop, or a solution far slower than the target.`,
        ),
      );
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timer);
      const data = e.data as { kind: string; message?: string };
      if (data.kind === "error")
        reject(new Error(data.message ?? "Unknown error"));
      else resolve(data as T);
      worker.terminate();
    };
    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(err.message || "Worker crashed"));
    };

    worker.postMessage(payload);
  });
}

export async function runTests(
  code: string,
  fnName: string,
  tests: LabTest[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<TestResult[]> {
  const { results } = await once<{ results: TestResult[] }>(
    spawn(),
    { kind: "tests", code, fnName, tests },
    timeoutMs,
  );
  return results;
}

/* ---- The complexity gate ------------------------------------------- *
 *
 * Doubling n and watching how the time responds. Expected t(2n)/t(n):
 *
 *   O(1) / O(log n)  ~1.0     O(n)  2.0     O(n log n) ~2.15     O(n²) 4.0
 *
 * The pass threshold is the GEOMETRIC midpoint between the target and the
 * next class up, which is the natural midpoint on a ratio scale.
 *
 * Honest limitation: timing cannot reliably separate O(n) from O(n log n) —
 * 2.0 vs 2.15 is well inside measurement noise. It separates both of them
 * from O(n²) very clearly, and a quadratic solution that passes the unit
 * tests is the failure this gate exists to catch.
 */

/**
 * Thresholds are CALIBRATED, not theoretical.
 *
 * Theory says a linear solution doubles (2.00x) and a quadratic one
 * quadruples (4.00x), so the midpoint sqrt(2·4) = 2.83 looks like the
 * obvious cut. Measurement disagrees. Real linear JavaScript measures
 * 2.4–2.7x per doubling once you count allocation, hash-map growth and
 * cache misses, and real quadratic code measures 3.6–4.3x. A 2.83 cut
 * therefore rejects correct solutions.
 *
 * These numbers come from running correct and deliberately quadratic
 * implementations of the actual labs; `scripts/labs.mts` re-measures every
 * reference solution and fails the build if any gate has under 20% headroom.
 *
 *                    correct measured   wrong measured   threshold
 *   O(n)             2.0 – 2.8          3.6 – 4.3        3.20
 *   O(n log n)       2.2 – 2.5          3.6 – 4.0        3.15
 *   O(log n)         1.1 – 1.2          ~2.0 (linear)    1.50
 *   O(n·m) / O(n^2)  3.6 – 4.6          7.5 – 8.5        5.66
 *   O(n^3)           7.2 – 9.0          15 – 17          11.30
 *
 * Each threshold is the geometric midpoint of the two MEASURED ranges, so
 * the error is symmetric on a ratio scale. Solutions that lean on a hash
 * map or set sit at the top of the correct band, because the structure's
 * own growth cost is itself slightly super-linear.
 *
 * `O(n·m)` and `O(n^2)` share a number on purpose, and it is not a copy-paste
 * slip. An `O(n·m)` gate scales BOTH dimensions with its one parameter (see
 * `ComplexityTarget` in `data/types.ts`), so the product it traces is
 * quadratic and the measured band is therefore the quadratic band. The names
 * differ because the budget the reader states differs, and stating it
 * correctly is the thing being taught — telling somebody their edit-distance
 * budget is "O(n^2)" hides that the two strings are independently sized.
 */
const THRESHOLD: Record<ComplexityTarget, number> = {
  "O(1)": 1.45,
  "O(log n)": 1.5,
  "O(n)": 3.2,
  "O(n log n)": 3.15,
  "O(n·m)": 5.66,
  "O(n^2)": 5.66,
  "O(n^3)": 11.3,
};

/**
 * What the target predicts the reader should SEE, for the pass message. Kept
 * next to the thresholds so a new target cannot be added without deciding it.
 */
const EXPECTED_RATIO: Record<ComplexityTarget, string> = {
  "O(1)": "about 1×",
  "O(log n)": "about 1×",
  "O(n)": "about 2×",
  "O(n log n)": "a little over 2×",
  "O(n·m)": "about 4×, since both dimensions are doubling",
  "O(n^2)": "about 4×",
  "O(n^3)": "about 8×",
};

export function expectedRatioFor(target: ComplexityTarget): string {
  return EXPECTED_RATIO[target];
}

export function thresholdFor(target: ComplexityTarget): number {
  return THRESHOLD[target];
}

export async function runGrowth(
  code: string,
  fnName: string,
  gen: string,
  sizes: number[],
  target: ComplexityTarget,
  reps = 5,
  timeoutMs = 20000,
): Promise<GrowthResult> {
  const { timings } = await once<{
    timings: { n: number; ms: number; reached?: boolean }[];
  }>(spawn(), { kind: "growth", code, fnName, gen, sizes, reps }, timeoutMs);

  const ratios: number[] = [];
  for (let i = 1; i < timings.length; i++) {
    const prev = timings[i - 1].ms;
    // Guard against a 0 ms reading turning into Infinity.
    ratios.push(prev > 0.01 ? timings[i].ms / prev : NaN);
  }

  const exponent = fitExponent(timings);
  const growthRatio = Number.isFinite(exponent) ? 2 ** exponent : NaN;

  const threshold = thresholdFor(target);
  // The worker times a BLOCK of calls and divides, so a fast-but-correct
  // solution is still measured accurately. Signal is only "low" when it
  // could not grow the block past the timing floor at all.
  const lowSignal =
    !Number.isFinite(growthRatio) || timings.some((t) => t.reached === false);

  return {
    timings,
    ratios,
    growthRatio,
    exponent,
    threshold,
    pass: !lowSignal && growthRatio <= threshold,
    lowSignal,
  };
}

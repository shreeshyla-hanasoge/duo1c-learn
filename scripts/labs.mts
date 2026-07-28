/**
 * Lab audit — runs every code lab's reference solution against its own tests,
 * and against its own complexity gate.
 *
 *   node --experimental-strip-types scripts/labs.mts
 *
 * This exists because a lab with a wrong expected value is worse than no lab:
 * the reader writes correct code, is told it is wrong, and has no way to find
 * out who is at fault. Checking by eye does not scale past a handful of tests.
 *
 * The timing logic here mirrors `src/engine/lab/lab.worker.ts` deliberately.
 * If the gate's measurement strategy changes there, it has to change here too,
 * or this script stops predicting what a reader will actually see.
 */
import { TIERS } from "../src/data/curriculum.ts";
import { fitExponent } from "../src/engine/lab/runner.ts";
import type { ComplexityTarget } from "../src/engine/lab/runner.ts";
import type { CodeLab } from "../src/data/types.ts";

import { thresholdFor } from "../src/engine/lab/runner.ts";

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

const show = (v: unknown) => {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

function compile(code: string, fnName: string) {
  const factory = new Function(
    `${code}\n;return typeof ${fnName} === "function" ? ${fnName} : null;`,
  );
  const fn = factory();
  if (typeof fn !== "function") {
    throw new Error(`no function named "${fnName}"`);
  }
  return fn as (...args: unknown[]) => unknown;
}

/** Same adaptive block timing as the worker: time k calls, grow k past a floor. */
function timeOne(fn: (...a: unknown[]) => unknown, args: unknown[]) {
  const FLOOR = 8;
  const MAX_K = 1 << 20;
  fn(...args); // warm THIS size — see the note in lab.worker.ts
  let k = 1;
  for (;;) {
    const t0 = performance.now();
    for (let i = 0; i < k; i++) fn(...args);
    const dt = performance.now() - t0;
    if (dt >= FLOOR || k >= MAX_K) return dt / k;
    k = Math.max(k * 2, Math.ceil((k * FLOOR) / Math.max(dt, 0.05)));
  }
}

function checkGate(lab: CodeLab) {
  const gate = lab.complexityGate!;
  const fn = compile(lab.solution, lab.fnName);
  const makeInput = new Function(`return (${gate.gen});`)() as (
    n: number,
  ) => unknown[];

  // Three calls, not one: V8 needs several before it optimises.
  for (let i = 0; i < 3; i++) fn(...makeInput(gate.sizes[0]));

  const timings = gate.sizes.map((n) => {
    const args = makeInput(n);
    // Five reps, median: a GC pause lands on one sample, not on three.
    const samples = Array.from({ length: 5 }, () => timeOne(fn, args));
    samples.sort((a, b) => a - b);
    return { n, ms: samples[2] };
  });

  return {
    median: 2 ** fitExponent(timings),
    threshold: thresholdFor(gate.target as ComplexityTarget),
    timings,
  };
}

let labs = 0;
let failures = 0;

for (const tier of TIERS) {
  for (const topic of tier.topics) {
    if (!topic.lab) continue;
    labs++;
    const lab = topic.lab;
    const problems: string[] = [];
    let gateNote = "";

    let fn: ((...a: unknown[]) => unknown) | null = null;
    try {
      fn = compile(lab.solution, lab.fnName);
    } catch (e) {
      problems.push(`solution will not compile: ${(e as Error).message}`);
    }

    if (fn) {
      for (const t of lab.tests) {
        let got: unknown;
        try {
          got = fn(...structuredClone(t.input));
        } catch (e) {
          problems.push(`test "${t.name}" threw: ${(e as Error).message}`);
          continue;
        }
        if (!deepEqual(got, t.expected)) {
          problems.push(
            `test "${t.name}": expected ${show(t.expected)}, solution returned ${show(got)}`,
          );
        }
      }

      // The starter must NOT pass — otherwise the lab is already solved.
      try {
        const starterFn = compile(lab.starter, lab.fnName);
        const starterPasses = lab.tests.every((t) => {
          try {
            return deepEqual(starterFn(...structuredClone(t.input)), t.expected);
          } catch {
            return false;
          }
        });
        if (starterPasses) problems.push("the starter code already passes");
      } catch {
        problems.push("starter does not define the required function");
      }

      if (lab.complexityGate) {
        try {
          const { median, threshold, timings } = checkGate(lab);
          gateNote =
            ` · gate ${lab.complexityGate.target} ${median.toFixed(2)}x/${threshold.toFixed(2)}x`;
          if (!(median > 0) || median > threshold) {
            problems.push(
              `gate: reference solution measured ${median.toFixed(2)}x per doubling, limit ${threshold.toFixed(2)}x ` +
                `[${timings.map((t) => `${t.n}:${t.ms.toFixed(4)}ms`).join(" ")}]`,
            );
          } else if (median > threshold * 0.85) {
            // Not a failure, but a reader's correct-but-slightly-slower
            // solution would be rejected. Widen the gap before shipping.
            //
            // 15%, not 50%: the limit is the measured midpoint between
            // correct and wrong solutions, not a theoretical bound, so a
            // reference sitting a comfortable distance below it is all that
            // is being asked for. Set- and map-heavy solutions legitimately
            // sit at the top of the correct band because the structure's own
            // growth is itself slightly super-linear.
            problems.push(
              `gate is TOO TIGHT: reference measured ${median.toFixed(2)}x against a ${threshold.toFixed(2)}x limit — under 15% headroom`,
            );
          }
        } catch (e) {
          problems.push(`gate threw: ${(e as Error).message}`);
        }
      }
    }

    if (problems.length) {
      failures++;
      console.log(`\n✗ ${topic.id} (${lab.fnName})`);
      for (const p of problems) console.log(`    ${p}`);
    } else {
      console.log(`✓ ${topic.id.padEnd(24)} ${lab.tests.length} tests${gateNote}`);
    }
  }
}

console.log(`\n${labs} labs · ${failures} with problems`);
if (failures) process.exit(1);

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronRight,
  Gauge,
  Lightbulb,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import type { CodeLab } from "../../data/curriculum";
import {
  expectedRatioFor,
  runGrowth,
  runTests,
  type GrowthResult,
  type TestResult,
} from "../../engine/lab/runner";
import { Button, Card, SectionTitle } from "../../components/ui";
import { Prose } from "../../components/Prose";
import { itemVariants, listVariants, spring } from "../../lib/ui";

/**
 * The hands-on gate.
 *
 * Two checks, in order. Correctness first — the usual unit tests. Then the
 * complexity gate, which is the part that makes this different from every
 * other DSA site: a correct-but-quadratic solution still fails.
 */

type Phase = "editing" | "running" | "failed" | "passed";

export function Lab({ lab, onWin }: { lab: CodeLab; onWin: () => void }) {
  const [code, setCode] = useState(lab.starter);
  const [phase, setPhase] = useState<Phase>("editing");
  const [tests, setTests] = useState<TestResult[] | null>(null);
  const [growth, setGrowth] = useState<GrowthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const won = useRef(false);

  const run = useCallback(async () => {
    setPhase("running");
    setError(null);
    setGrowth(null);
    try {
      const results = await runTests(code, lab.fnName, lab.tests);
      setTests(results);

      if (!results.every((r) => r.pass)) {
        setPhase("failed");
        return;
      }

      // Correctness passed — now the budget.
      if (lab.complexityGate) {
        try {
          const g = await runGrowth(
            code,
            lab.fnName,
            lab.complexityGate.gen,
            lab.complexityGate.sizes,
            lab.complexityGate.target,
          );
          setGrowth(g);
          if (!g.pass) {
            setPhase("failed");
            return;
          }
        } catch {
          // Running out of time IS the finding. A solution within budget
          // finishes these sizes almost instantly, so "too slow to measure"
          // is a budget failure, not a mysterious crash.
          setError(
            `Correct, but it did not finish the ${lab.complexityGate.target} timing run in time. That is the verdict: a solution within budget completes these input sizes almost instantly.`,
          );
          setPhase("failed");
          return;
        }
      }

      setPhase("passed");
      if (!won.current) {
        won.current = true;
        onWin();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("failed");
    }
  }, [code, lab, onWin]);

  const visible = tests?.filter((t) => !t.hidden) ?? [];
  const hidden = tests?.filter((t) => t.hidden) ?? [];
  const hiddenPassed = hidden.filter((t) => t.pass).length;

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-5"
    >
      <motion.div variants={itemVariants}>
        <SectionTitle hint="write it, then prove the budget">
          Build it yourself
        </SectionTitle>
        <Prose className="text-sm leading-relaxed text-ink-2">
          {lab.prompt}
        </Prose>
        <p className="mt-2 font-mono text-xs text-ink-3">{lab.signature}</p>
      </motion.div>

      {/* ---- Editor ---- */}
      <motion.div variants={itemVariants}>
        <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[11px] tracking-wide text-ink-3 uppercase">
              JavaScript
            </span>
            <button
              onClick={() => {
                setCode(lab.starter);
                setTests(null);
                setGrowth(null);
                setPhase("editing");
              }}
              className="flex items-center gap-1 text-[11px] text-ink-3 transition-colors hover:text-ink"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              // Tab must indent, not escape the editor.
              if (e.key === "Tab") {
                e.preventDefault();
                const el = e.currentTarget;
                const { selectionStart: s, selectionEnd: en } = el;
                const next = code.slice(0, s) + "  " + code.slice(en);
                setCode(next);
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = s + 2;
                });
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={14}
            className="w-full resize-y bg-transparent p-3 font-mono text-[13px] leading-6 text-ink outline-none"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="lg"
          onClick={run}
          disabled={phase === "running"}
          className="flex-1"
        >
          <Play size={15} />
          {phase === "running" ? "Running…" : "Run tests"}
        </Button>
        {hintsShown < lab.hints.length && phase !== "passed" && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setHintsShown((h) => h + 1)}
          >
            <Lightbulb size={15} /> Hint {hintsShown + 1}/{lab.hints.length}
          </Button>
        )}
      </motion.div>

      {/* ---- Hints ---- */}
      {hintsShown > 0 && (
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          {lab.hints.slice(0, hintsShown).map((h, i) => (
            <Card
              key={i}
              className="border-l-2 p-3 text-sm text-ink-2"
              style={{ borderLeftColor: "var(--color-viz-scan)" }}
            >
              <span className="mr-2 text-[11px] text-ink-3">HINT {i + 1}</span>
              <Prose as="span" className="text-ink-2">
                {h}
              </Prose>
            </Card>
          ))}
        </motion.div>
      )}

      {/* ---- Error ---- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -6 }}
            animate={{ y: 0 }}
            transition={spring}
          >
            <Card
              className="border-l-2 p-4"
              style={{ borderLeftColor: "var(--color-viz-critical)" }}
            >
              <p className="text-[11px] tracking-wide text-ink-3 uppercase">
                Could not run
              </p>
              <p className="mt-1 font-mono text-sm break-words text-ink-2">
                {error}
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Test results ---- */}
      {tests && (
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <p className="text-[11px] tracking-wide text-ink-3 uppercase">
            Correctness
          </p>
          {visible.map((t) => (
            <div
              key={t.name}
              className="flex items-start gap-2.5 rounded-lg border p-2.5 text-sm"
              style={{
                borderColor: t.pass
                  ? "var(--color-viz-match)"
                  : "var(--color-viz-critical)",
                background: t.pass
                  ? "color-mix(in oklab, var(--color-viz-match) 8%, transparent)"
                  : "color-mix(in oklab, var(--color-viz-critical) 8%, transparent)",
              }}
            >
              {t.pass ? (
                <Check
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--color-viz-match)" }}
                />
              ) : (
                <X
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--color-viz-critical)" }}
                />
              )}
              <div className="min-w-0">
                <p className="text-ink">{t.name}</p>
                {!t.pass && (
                  <p className="mt-0.5 font-mono text-[11px] break-words text-ink-3">
                    {t.threw ? "threw: " : "got "}
                    {t.got}
                    {!t.threw && ` · expected ${t.expected}`}
                  </p>
                )}
              </div>
            </div>
          ))}
          {hidden.length > 0 && (
            <p className="text-xs text-ink-3">
              Hidden edge cases: {hiddenPassed}/{hidden.length} passed
            </p>
          )}
        </motion.div>
      )}

      {/* ---- Complexity gate ---- */}
      {growth && lab.complexityGate && (
        <motion.div variants={itemVariants}>
          <Card
            className="border-l-2 p-4"
            style={{
              borderLeftColor: growth.pass
                ? "var(--color-viz-match)"
                : "var(--color-viz-critical)",
            }}
          >
            <div className="flex items-center gap-2">
              <Gauge size={14} className="text-ink-3" />
              <p className="text-[11px] tracking-wide text-ink-3 uppercase">
                Complexity gate · target {lab.complexityGate.target}
              </p>
            </div>

            <p className="mt-2 text-sm text-ink-2">
              {growth.lowSignal
                ? "Ran too fast to measure reliably — no verdict. Try again; if it keeps happening the input sizes need raising."
                : growth.pass
                  ? `Time grew ${growth.growthRatio.toFixed(2)}× per doubling of n. ${lab.complexityGate.target} predicts ${expectedRatioFor(lab.complexityGate.target)}, and the limit for this target is ${growth.threshold.toFixed(2)}×.`
                  : `Time grew ${growth.growthRatio.toFixed(2)}× per doubling of n — above the ${growth.threshold.toFixed(2)}× limit. That curve is a slower class than ${lab.complexityGate.target}. Correct, but not within budget.`}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {growth.timings.map((t) => (
                <span key={t.n} className="font-mono text-[11px] text-ink-3">
                  n={t.n.toLocaleString()} → {t.ms.toFixed(2)}ms
                </span>
              ))}
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
              Measured by doubling n, taking the median of repeated runs, and
              fitting the growth curve across all four sizes. Timing cannot
              reliably separate O(n) from O(n log n) — it is here to catch a
              quadratic that passes every unit test.
            </p>
          </Card>
        </motion.div>
      )}

      {/* ---- Outcome ---- */}
      {phase === "passed" && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--color-viz-match)",
            background:
              "color-mix(in oklab, var(--color-viz-match) 12%, transparent)",
          }}
        >
          <Check size={15} style={{ color: "var(--color-viz-match)" }} />
          Correct and within budget — Solve gate cleared.
        </motion.div>
      )}

      {/* ---- Solution ---- */}
      {(phase === "passed" || hintsShown >= lab.hints.length) && (
        <motion.div variants={itemVariants}>
          {showSolution ? (
            <Card className="overflow-hidden p-0">
              <p className="border-b border-line px-4 py-2 text-[11px] tracking-wide text-ink-3 uppercase">
                One reference solution
              </p>
              <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-6 text-ink-2">
                {lab.solution}
              </pre>
            </Card>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setShowSolution(true)}
              className="w-full"
            >
              Show a reference solution <ChevronRight size={14} />
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

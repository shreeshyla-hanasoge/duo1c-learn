import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronRight, RotateCcw, Scale, X } from "lucide-react";
import type { DecisionCase } from "../../data/curriculum";
import { Button, Card, SectionTitle } from "../../components/ui";
import { Prose } from "../../components/Prose";
import { itemVariants, listVariants } from "../../lib/ui";

/**
 * The Tier 5 gate — decision cases instead of a code lab.
 *
 * A judgment tier has nothing to animate and nothing to code, so the gate
 * asks the design-review question directly: pick an approach, then name the
 * trade you are accepting, the failure mode you are signing up for, and what
 * you would measure.
 *
 * Grading is deterministic and exact-set. Partial credit would let somebody
 * clear the gate by ticking every claim, which is precisely the opposite of
 * the skill being assessed — so a case is cleared only when the pick is right
 * AND the selected claims are exactly the true ones.
 *
 * Two of the topic's cases must be cleared. They can be attempted in any
 * order and retried freely; retrying after seeing the notes is how the
 * material is meant to be learned, not a way around the gate.
 */

const AXIS_LABEL: Record<DecisionCase["claims"][number]["axis"], string> = {
  trade: "The trade you are accepting",
  failure: "The failure mode you are signing up for",
  measure: "What you would measure",
};

const AXIS_ORDER = ["trade", "failure", "measure"] as const;

/** Stable per-case shuffle, so the claim order is not a hint but never jumps. */
function shuffled<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function Cases({
  cases,
  onWin,
}: {
  cases: DecisionCase[];
  onWin: () => void;
}) {
  const required = Math.min(2, cases.length);
  const [idx, setIdx] = useState(0);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<number | null>(null);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);

  const c = cases[idx];

  // Claims are shuffled per case but grouped by axis, so the reader answers
  // one question at a time rather than scanning a flat pool.
  const grouped = useMemo(() => {
    const seed = c.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 7);
    return AXIS_ORDER.map((axis) => ({
      axis,
      claims: shuffled(
        c.claims
          .map((cl, i) => ({ ...cl, i }))
          .filter((cl) => cl.axis === axis),
        seed + axis.length,
      ),
    })).filter((g) => g.claims.length > 0);
  }, [c]);

  const trueSet = useMemo(
    () => new Set(c.claims.map((cl, i) => (cl.correct ? i : -1)).filter((i) => i >= 0)),
    [c],
  );

  const passed =
    checked &&
    pick === c.best &&
    ticked.size === trueSet.size &&
    [...ticked].every((i) => trueSet.has(i));

  const reset = useCallback(() => {
    setPick(null);
    setTicked(new Set());
    setChecked(false);
  }, []);

  const check = () => {
    setChecked(true);
    const ok =
      pick === c.best &&
      ticked.size === trueSet.size &&
      [...ticked].every((i) => trueSet.has(i));
    if (!ok) return;
    // Safe to derive from `cleared` here: check() runs once per tap, so
    // there is no batch of updates racing each other the way toggle() has.
    const next = new Set(cleared);
    next.add(c.id);
    setCleared(next);
    if (next.size >= required) onWin();
  };

  const goto = (i: number) => {
    setIdx(i);
    reset();
  };

  // Functional update, not `new Set(ticked)` from the closure: React
  // batches state updates within a tick, so two taps landing in the same
  // batch would both read the stale set and the second would discard the
  // first. On a touch screen that is an ordinary double-tap.
  const toggle = (i: number) => {
    if (checked) return;
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-5"
    >
      <motion.div variants={itemVariants}>
        <SectionTitle hint={`clear ${required} of ${cases.length} to pass`}>
          Decision cases
        </SectionTitle>
        <p className="text-sm leading-relaxed text-ink-2">
          There is no code to write here. Pick an approach, then name the trade
          you are accepting, the failure mode you are signing up for, and what
          you would measure — the same four things a design review will ask
          for. Select every true statement; ticking a false one counts against
          you, so ticking them all does not work.
        </p>
      </motion.div>

      {/* Case selector. grid-cols-1 on the wrapper is deliberate — a bare
          flex-wrap of chips is fine, but any grid needs an explicit track. */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {cases.map((cc, i) => {
          const done = cleared.has(cc.id);
          const on = i === idx;
          return (
            <button
              key={cc.id}
              onClick={() => goto(i)}
              className="flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
              style={{
                borderColor: done ? "var(--color-viz-match)" : "var(--color-line)",
                background: on ? "var(--color-surface-2)" : "transparent",
                color: on ? "var(--color-ink)" : "var(--color-ink-2)",
              }}
            >
              {done && (
                <Check size={12} style={{ color: "var(--color-viz-match)" }} />
              )}
              <span className="truncate">Case {i + 1}</span>
            </button>
          );
        })}
        <span className="ml-auto self-center text-xs text-ink-3">
          {cleared.size}/{required} cleared
        </span>
      </motion.div>

      {/* Keyed on the case id: a keyed enter animation cannot wedge the way
          an exit animation can when the reader taps twice quickly. */}
      <motion.div
        key={c.id}
        initial={{ y: 8 }}
        animate={{ y: 0 }}
        className="flex flex-col gap-5"
      >
        <motion.div variants={itemVariants}>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Scale size={14} className="text-ink-3" />
              <p className="text-[11px] tracking-wide text-ink-3 uppercase">
                Scenario
              </p>
            </div>
            <Prose className="mt-2 text-sm leading-relaxed text-ink-2">
              {c.scenario}
            </Prose>
          </Card>
        </motion.div>

        {/* ---- Pick an approach ---- */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-2">
          <p className="text-[11px] tracking-wide text-ink-3 uppercase">
            Your pick
          </p>
          {c.options.map((o, i) => {
            const isPick = pick === i;
            const isBest = i === c.best;
            const border = !checked
              ? isPick
                ? "var(--color-viz-cursor)"
                : "var(--color-line)"
              : isBest
                ? "var(--color-viz-match)"
                : isPick
                  ? "var(--color-viz-critical)"
                  : "var(--color-line)";
            return (
              <button
                key={o.label}
                onClick={() => !checked && setPick(i)}
                disabled={checked}
                className="min-w-0 rounded-xl border p-3 text-left transition-colors"
                style={{ borderColor: border }}
              >
                <span className="block text-sm text-ink">{o.label}</span>
                {checked && (
                  <span className="mt-1 block text-xs leading-relaxed text-ink-3">
                    {o.appeal}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* ---- Rubric ---- */}
        {grouped.map((g) => (
          <motion.div
            key={g.axis}
            variants={itemVariants}
            className="grid grid-cols-1 gap-2"
          >
            <p className="text-[11px] tracking-wide text-ink-3 uppercase">
              {AXIS_LABEL[g.axis]}
            </p>
            {g.claims.map((cl) => {
              const on = ticked.has(cl.i);
              const border = !checked
                ? on
                  ? "var(--color-viz-cursor)"
                  : "var(--color-line)"
                : cl.correct
                  ? "var(--color-viz-match)"
                  : on
                    ? "var(--color-viz-critical)"
                    : "var(--color-line)";
              return (
                <button
                  key={cl.i}
                  onClick={() => toggle(cl.i)}
                  disabled={checked}
                  className="flex min-w-0 items-start gap-2.5 rounded-xl border p-3 text-left transition-colors"
                  style={{ borderColor: border }}
                >
                  <span
                    className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border"
                    style={{
                      borderColor: on
                        ? "var(--color-viz-cursor)"
                        : "var(--color-line)",
                      background: on
                        ? "var(--color-viz-cursor)"
                        : "transparent",
                    }}
                  >
                    {on && <Check size={11} className="text-surface-1" />}
                    {checked && !on && cl.correct && (
                      <X size={11} style={{ color: "var(--color-viz-match)" }} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-relaxed text-ink-2">
                      {cl.text}
                    </span>
                    {checked && (
                      <span className="mt-1 block text-xs leading-relaxed text-ink-3">
                        {cl.note}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </motion.div>
        ))}

        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
          {!checked ? (
            <Button
              variant="primary"
              size="lg"
              onClick={check}
              disabled={pick === null}
              className="flex-1"
            >
              Check my reasoning
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={reset}
                className="flex-1"
              >
                <RotateCcw size={15} /> Try again
              </Button>
              {idx + 1 < cases.length && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => goto(idx + 1)}
                  className="flex-1"
                >
                  Next case <ChevronRight size={15} />
                </Button>
              )}
            </>
          )}
        </motion.div>

        {checked && (
          <motion.div variants={itemVariants}>
            <Card
              className="border-l-2 p-4"
              style={{
                borderLeftColor: passed
                  ? "var(--color-viz-match)"
                  : "var(--color-viz-critical)",
              }}
            >
              <p className="text-[11px] tracking-wide text-ink-3 uppercase">
                {passed ? "Cleared" : "Not yet"}
              </p>
              <Prose className="mt-2 text-sm leading-relaxed text-ink-2">
                {c.verdict}
              </Prose>
              {!passed && (
                <p className="mt-2 text-xs text-ink-3">
                  Every statement above now shows why it is true or why it is
                  tempting. Read them, then try again.
                </p>
              )}
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

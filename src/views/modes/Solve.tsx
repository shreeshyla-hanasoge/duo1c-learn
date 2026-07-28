import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw, X } from "lucide-react";
import type { Topic } from "../../data/curriculum";
import { getTrace, hasTrace } from "../../engine/registry";
import { Button, Card, SectionTitle } from "../../components/ui";
import { itemVariants, listVariants, spring, springSnap } from "../../lib/ui";
import { useProgress, useTopicProgress } from "../../store/progress";
import type { Subject } from "../../data/subjects";
import { celebrate, xpToast } from "../../lib/toast";
import { Lab } from "./Lab";
import { Cases } from "./Cases";

/**
 * Solve is deliberately not a code editor. Two drills, both generated from
 * material the topic already owns:
 *
 *  - Sequence: reconstruct the real order of an algorithm's steps. Tests
 *    whether you understand *why* each step follows the last.
 *  - Match: pair each idea with its explanation. The fallback for topics
 *    with no trace, and a genuine recall exercise rather than filler.
 */

export function Solve({ subject, topic }: { subject: Subject; topic: Topic }) {
  const solved = useTopicProgress(subject.id, topic.id)?.solved ?? false;
  const markSolved = useProgress((s) => s.markSolved);

  const onWin = useCallback(() => {
    const gained = markSolved(subject.id, topic.id);
    if (gained > 0) {
      xpToast(gained, "drill cleared");
      celebrate("small");
    }
  }, [markSolved, subject.id, topic.id]);

  const vizKey = (topic.viz ?? []).find(hasTrace);

  return (
    <div className="flex flex-col gap-6">
      {solved && (
        <div
          className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--color-viz-match)",
            background:
              "color-mix(in oklab, var(--color-viz-match) 12%, transparent)",
          }}
        >
          <Check size={15} style={{ color: "var(--color-viz-match)" }} />
          Solve gate cleared. Run it again any time — repetition is the point.
        </div>
      )}

      {/* When a lab exists it IS the gate — clearing Solve should require
          writing the code. The drill stays available as a warm-up but no
          longer awards the gate, so "no hands-on coding" stops being true.
          Existing `solved: true` is never revoked; the store is monotone.

          Tier 5 has decision cases instead: nothing to animate and nothing
          to code, but the design-review reasoning is gateable in exactly
          the same way. */}
      {topic.cases?.length ? (
        <>
          <Cases cases={topic.cases} onWin={onWin} />
          {(vizKey || topic.insights.length > 1) && (
            <details className="rounded-xl border border-line bg-surface-1 p-4">
              <summary className="cursor-pointer text-sm text-ink-2">
                Warm-up drill (no gate credit)
              </summary>
              <div className="mt-4">
                {vizKey ? (
                  <SequenceDrill vizKey={vizKey} onWin={() => {}} />
                ) : (
                  <MatchDrill topic={topic} onWin={() => {}} />
                )}
              </div>
            </details>
          )}
        </>
      ) : topic.lab ? (
        <>
          <Lab lab={topic.lab} onWin={onWin} />
          {(vizKey || topic.insights.length > 1) && (
            <details className="rounded-xl border border-line bg-surface-1 p-4">
              <summary className="cursor-pointer text-sm text-ink-2">
                Warm-up drill (no gate credit)
              </summary>
              <div className="mt-4">
                {vizKey ? (
                  <SequenceDrill vizKey={vizKey} onWin={() => {}} />
                ) : (
                  <MatchDrill topic={topic} onWin={() => {}} />
                )}
              </div>
            </details>
          )}
        </>
      ) : vizKey ? (
        <SequenceDrill vizKey={vizKey} onWin={onWin} />
      ) : (
        <MatchDrill topic={topic} onWin={onWin} />
      )}
    </div>
  );
}

/* ---- Drill 1: reconstruct the step order --------------------------- */

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const RUN_LENGTH = 5;

function SequenceDrill({
  vizKey,
  onWin,
}: {
  vizKey: string;
  onWin: () => void;
}) {
  const trace = getTrace(vizKey)!;
  const [round, setRound] = useState(0);

  const { steps, shuffled } = useMemo(() => {
    // Frames with distinct notes, so the puzzle always has one right answer.
    const seen = new Set<string>();
    const unique = trace.frames.filter((f) => {
      if (seen.has(f.note)) return false;
      seen.add(f.note);
      return true;
    });
    const maxStart = Math.max(0, unique.length - RUN_LENGTH);
    const start = maxStart === 0 ? 0 : (round * 3 + 1) % maxStart;
    const run = unique
      .slice(start, start + RUN_LENGTH)
      .map((f, i) => ({ id: `${start + i}`, note: f.note }));
    return { steps: run, shuffled: seededShuffle(run, (round + 1) * 7919) };
  }, [trace, round]);

  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<"none" | "right" | "wrong">("none");

  const remaining = shuffled.filter((s) => !picked.includes(s.id));
  const correctOrder = steps.map((s) => s.id);

  const submit = () => {
    const ok =
      picked.length === correctOrder.length &&
      picked.every((id, i) => id === correctOrder[i]);
    setResult(ok ? "right" : "wrong");
    if (ok) onWin();
  };

  const reset = () => {
    setPicked([]);
    setResult("none");
  };

  const nextRound = () => {
    setRound((r) => r + 1);
    setPicked([]);
    setResult("none");
  };

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <SectionTitle hint={`${steps.length} consecutive steps, scrambled`}>
          Put the algorithm back in order
        </SectionTitle>
        <p className="text-sm text-ink-2">
          These are real consecutive steps from{" "}
          <span className="text-ink">{trace.title}</span>. Tap them in the order
          they actually happen.
        </p>
      </motion.div>

      {/* ---- Answer tray ---- */}
      <motion.div variants={itemVariants}>
        <div
          className="min-h-[7rem] rounded-xl border border-dashed p-3"
          style={{
            borderColor:
              result === "right"
                ? "var(--color-viz-match)"
                : result === "wrong"
                  ? "var(--color-viz-critical)"
                  : "var(--color-line)",
          }}
        >
          {picked.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">
              Your ordering appears here
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {picked.map((id, i) => {
                  const step = steps.find((s) => s.id === id)!;
                  const isRight = result !== "none" && correctOrder[i] === id;
                  const isWrong = result === "wrong" && correctOrder[i] !== id;
                  return (
                    <motion.li
                      key={id}
                      layout
                      initial={{ scale: 0.95, y: 10 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={spring}
                      onClick={() =>
                        result === "none" &&
                        setPicked((p) => p.filter((x) => x !== id))
                      }
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm"
                      style={{
                        borderColor: isWrong
                          ? "var(--color-viz-critical)"
                          : isRight
                            ? "var(--color-viz-match)"
                            : "var(--color-line)",
                        background: isWrong
                          ? "color-mix(in oklab, var(--color-viz-critical) 10%, transparent)"
                          : isRight
                            ? "color-mix(in oklab, var(--color-viz-match) 10%, transparent)"
                            : "var(--color-surface-2)",
                      }}
                    >
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-xs"
                        style={{ background: "var(--color-surface-3)" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-ink-2">{step.note}</span>
                      {result !== "none" && (
                        <span className="ml-auto shrink-0">
                          {isRight ? (
                            <Check
                              size={15}
                              style={{ color: "var(--color-viz-match)" }}
                            />
                          ) : (
                            <X
                              size={15}
                              style={{ color: "var(--color-viz-critical)" }}
                            />
                          )}
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          )}
        </div>
      </motion.div>

      {/* ---- Bank ---- */}
      {result === "none" && (
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {remaining.map((s) => (
              <motion.button
                key={s.id}
                layout
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={spring}
                whileTap={{ scale: 0.985 }}
                onClick={() => setPicked((p) => [...p, s.id])}
                className="rounded-lg border border-line bg-surface-1 p-3 text-left text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                {s.note}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ---- Actions ---- */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {result === "none" ? (
          <>
            <Button
              variant="primary"
              onClick={submit}
              disabled={picked.length !== steps.length}
              className="flex-1"
            >
              Check my order
            </Button>
            <Button
              variant="ghost"
              onClick={reset}
              disabled={picked.length === 0}
            >
              <RotateCcw size={14} /> Clear
            </Button>
          </>
        ) : (
          <>
            {result === "wrong" && (
              <Card className="mb-2 w-full p-4">
                <p className="mb-2 text-xs tracking-wide text-ink-3 uppercase">
                  The real order
                </p>
                <ol className="flex list-inside list-decimal flex-col gap-1.5">
                  {steps.map((s) => (
                    <li key={s.id} className="text-sm text-ink-2">
                      {s.note}
                    </li>
                  ))}
                </ol>
              </Card>
            )}
            <Button variant="primary" onClick={nextRound} className="flex-1">
              {result === "right" ? "Another round" : "Try a different run"}
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw size={14} /> Retry this one
            </Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---- Drill 2: match idea to explanation ---------------------------- */

function MatchDrill({ topic, onWin }: { topic: Topic; onWin: () => void }) {
  const pairs = topic.insights;
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);

  const shuffledDefs = useMemo(() => seededShuffle(pairs, 4271), [pairs]);
  const done = matched.length === pairs.length;

  const tryMatch = (defTitle: string) => {
    if (!selected) return;
    if (selected === defTitle) {
      const next = [...matched, defTitle];
      setMatched(next);
      setSelected(null);
      if (next.length === pairs.length) onWin();
    } else {
      setWrong(defTitle);
      setTimeout(() => setWrong(null), 500);
      setSelected(null);
    }
  };

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <SectionTitle hint={`${matched.length}/${pairs.length} matched`}>
          Match each idea to what it means
        </SectionTitle>
        {/* Position-neutral wording: below `sm` the two groups stack, so
            "left" and "right" describe a layout the reader cannot see. */}
        <p className="text-sm text-ink-2">
          Pick an idea, then the explanation that goes with it.
        </p>
      </motion.div>

      {/* A selected idea has to stay visible while the reader scrolls down to
          the explanations on a phone — otherwise they lose track of what they
          are matching. Sticky, and only while a selection is live. */}
      <AnimatePresence>
        {selected && !done && (
          <motion.div
            key="pending"
            initial={{ y: -8 }}
            animate={{ y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring}
            // shadow, because content scrolls *underneath* this bar — without
            // one the overlap reads as a rendering glitch rather than a
            // floating toolbar.
            className="sticky top-14 z-20 flex items-center gap-2 rounded-xl border px-3 py-2 shadow-lg lg:top-2"
            style={{
              borderColor: "var(--color-viz-cursor)",
              background:
                "color-mix(in oklab, var(--color-viz-cursor) 16%, var(--color-surface-1))",
            }}
          >
            <span className="text-[10px] tracking-wide text-ink-3 uppercase">
              Matching
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{selected}</span>
            <button
              onClick={() => setSelected(null)}
              aria-label="Cancel selection"
              className="shrink-0 rounded-md px-2 py-1 text-[11px] text-ink-3 hover:text-ink"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-3"
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] tracking-wide text-ink-3 uppercase">
            Ideas
          </h3>
          {pairs.map((p) => {
            const isMatched = matched.includes(p.t);
            const isSelected = selected === p.t;
            return (
              <motion.button
                key={p.t}
                layout
                transition={spring}
                disabled={isMatched}
                onClick={() => setSelected(isSelected ? null : p.t)}
                animate={{ opacity: isMatched ? 0.45 : 1 }}
                className="rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-default"
                style={{
                  borderColor: isMatched
                    ? "var(--color-viz-match)"
                    : isSelected
                      ? "var(--color-viz-cursor)"
                      : "var(--color-line)",
                  background: isSelected
                    ? "color-mix(in oklab, var(--color-viz-cursor) 14%, transparent)"
                    : "var(--color-surface-1)",
                }}
              >
                <span className="flex items-center gap-2">
                  {isMatched && (
                    <Check
                      size={13}
                      style={{ color: "var(--color-viz-match)" }}
                    />
                  )}
                  {p.t}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] tracking-wide text-ink-3 uppercase">
            What they mean
          </h3>
          {shuffledDefs.map((p) => {
            const isMatched = matched.includes(p.t);
            const isWrong = wrong === p.t;
            return (
              <motion.button
                key={p.t}
                layout
                transition={spring}
                animate={{
                  x: isWrong ? [0, -5, 5, -3, 0] : 0,
                  opacity: isMatched ? 0.45 : selected ? 1 : 0.6,
                }}
                // Inert until an idea is picked: tapping here first was a
                // silent no-op, which reads as a broken button.
                disabled={isMatched || !selected}
                onClick={() => tryMatch(p.t)}
                className="rounded-lg border p-3 text-left text-xs leading-relaxed text-ink-2 transition-colors disabled:cursor-default"
                style={{
                  borderColor: isMatched
                    ? "var(--color-viz-match)"
                    : isWrong
                      ? "var(--color-viz-critical)"
                      : "var(--color-line)",
                  background: "var(--color-surface-1)",
                }}
              >
                {p.d}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSnap}
            className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--color-viz-match)",
              background:
                "color-mix(in oklab, var(--color-viz-match) 12%, transparent)",
            }}
          >
            <Check size={15} style={{ color: "var(--color-viz-match)" }} />
            All matched — Solve gate cleared.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

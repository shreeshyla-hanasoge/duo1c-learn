import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import type { Topic } from "../../data/curriculum";
import { Button, Card, Meter } from "../../components/ui";
import { Prose } from "../../components/Prose";
import { QuizFigure } from "../../components/viz/QuizFigure";
import { spring, springSnap } from "../../lib/ui";
import { useProgress, useTopicProgress } from "../../store/progress";
import type { Subject } from "../../data/subjects";
import { celebrate, xpToast } from "../../lib/toast";

export function Quiz({ subject, topic }: { subject: Subject; topic: Topic }) {
  const best = useTopicProgress(subject.id, topic.id)?.quizBest ?? 0;
  const attempts = useTopicProgress(subject.id, topic.id)?.quizAttempts ?? 0;
  const recordQuiz = useProgress((s) => s.recordQuiz);

  const [runId, setRunId] = useState(0);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const questions = useMemo(() => topic.quiz, [topic]);
  const q = questions[idx];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      const finalCorrect = correct;
      const gained = recordQuiz(
        subject.id,
        topic.id,
        finalCorrect,
        questions.length,
      );
      if (gained > 0)
        xpToast(gained, `${finalCorrect}/${questions.length} correct`);
      if (finalCorrect === questions.length) celebrate("large");
      setDone(true);
    } else {
      setIdx((v) => v + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setRunId((r) => r + 1);
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
  };

  if (done) {
    const score = correct / questions.length;
    const passed = score >= 0.8;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springSnap}
        className="flex flex-col gap-5"
      >
        <Card className="p-7 text-center">
          <p className="text-xs tracking-wide text-ink-3 uppercase">Result</p>
          <div
            className="tabular mt-2 text-5xl font-semibold"
            style={{
              color: passed
                ? "var(--color-viz-match)"
                : "var(--color-viz-scan)",
            }}
          >
            {correct}/{questions.length}
          </div>
          <p className="mt-2 text-sm text-ink-2">
            {passed
              ? "Quiz gate cleared — 80% or better."
              : "Below the 80% needed to clear the gate. Re-read the ideas and try again."}
          </p>
          <Meter
            className="mt-5"
            pct={score}
            label="This attempt"
            value={`${Math.round(score * 100)}%`}
          />
          <Meter
            className="mt-3"
            pct={Math.max(best, score)}
            label="Best ever"
            value={`${Math.round(Math.max(best, score) * 100)}%`}
          />
        </Card>

        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-wide text-ink-3 uppercase">Review</p>
          {questions.map((qq, i) => (
            <Card key={i} className="p-4">
              <p className="text-sm font-medium">{qq.q}</p>
              <p className="mt-2 flex items-start gap-2 text-sm text-ink-2">
                <Check
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--color-viz-match)" }}
                />
                {qq.options[qq.answer]}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-3">
                {qq.why}
              </p>
            </Card>
          ))}
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={restart}
          className="w-full"
        >
          <RotateCcw size={15} /> Take it again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-ink-3">
          Question {idx + 1} of {questions.length}
        </span>
        <span className="font-mono text-xs text-ink-3">
          {attempts > 0 ? `best ${Math.round(best * 100)}%` : "first attempt"}
        </span>
      </div>

      <Meter pct={idx / questions.length} />

      {/* Keyed enter, no exit — double-tapping "Next" must never be able to
          leave the question mid-transition and unanswerable. */}
      <motion.div
        key={`${runId}-${idx}`}
        initial={{ x: 28 }}
        animate={{ x: 0 }}
        transition={spring}
        className="flex flex-col gap-4"
      >
        <div>
          {q.difficulty && (
            <span className="text-[11px] tracking-wide text-ink-3 uppercase">
              {q.difficulty === "recall"
                ? "recall — did you read it"
                : q.difficulty === "apply"
                  ? "apply — use it on a new input"
                  : "judge — choose under a constraint"}
            </span>
          )}
          <Prose
            as="h2"
            className="mt-1 text-lg leading-snug font-medium"
            linkTerms={false}
          >
            {q.q}
          </Prose>
          {q.figure && (
            <div className="mt-3">
              <QuizFigure fig={q.figure} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answer;
            const isPicked = picked === i;
            const reveal = picked !== null;
            const tone = !reveal
              ? "idle"
              : isAnswer
                ? "right"
                : isPicked
                  ? "wrong"
                  : "idle";
            return (
              <motion.button
                key={i}
                onClick={() => choose(i)}
                disabled={reveal}
                whileTap={{ scale: reveal ? 1 : 0.99 }}
                animate={{
                  x: tone === "wrong" ? [0, -6, 6, -3, 0] : 0,
                }}
                transition={springSnap}
                className="flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors disabled:cursor-default"
                style={{
                  borderColor:
                    tone === "right"
                      ? "var(--color-viz-match)"
                      : tone === "wrong"
                        ? "var(--color-viz-critical)"
                        : "var(--color-line)",
                  background:
                    tone === "right"
                      ? "color-mix(in oklab, var(--color-viz-match) 12%, transparent)"
                      : tone === "wrong"
                        ? "color-mix(in oklab, var(--color-viz-critical) 12%, transparent)"
                        : "var(--color-surface-1)",
                }}
              >
                <span
                  className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md font-mono text-[10px]"
                  style={{
                    background: "var(--color-surface-3)",
                    color: "var(--color-ink-2)",
                  }}
                >
                  {reveal && isAnswer ? (
                    <Check
                      size={12}
                      style={{ color: "var(--color-viz-match)" }}
                    />
                  ) : reveal && isPicked ? (
                    <X
                      size={12}
                      style={{ color: "var(--color-viz-critical)" }}
                    />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="text-ink-2">{opt}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Position-only entrance, and no exit animation: the Next button
            lives inside this block, so a stuck fade or a stuck collapse would
            leave the quiz unanswerable rather than merely ugly. */}
        {picked !== null && (
          <motion.div initial={{ y: -6 }} animate={{ y: 0 }} transition={spring}>
            {/* Why the option you chose was tempting. This is where a
                misconception actually gets corrected — "not quite" teaches
                nothing on its own. */}
            {picked !== q.answer && q.distractors?.[picked] && (
              <Card
                className="mb-2 border-l-2 p-4"
                style={{ borderLeftColor: "var(--color-viz-critical)" }}
              >
                <p className="text-[11px] tracking-wide text-ink-3 uppercase">
                  Why that one looked right
                </p>
                <Prose className="mt-1 text-sm leading-relaxed text-ink-2">
                  {q.distractors[picked]}
                </Prose>
              </Card>
            )}

            <Card
              className="border-l-2 p-4"
              style={{
                borderLeftColor:
                  picked === q.answer
                    ? "var(--color-viz-match)"
                    : "var(--color-viz-scan)",
              }}
            >
              <p className="text-[11px] tracking-wide text-ink-3 uppercase">
                {picked === q.answer ? "Correct" : "The answer"}
              </p>
              <Prose className="mt-1 text-sm leading-relaxed text-ink-2">
                {q.why}
              </Prose>
            </Card>

            <Button
              variant="primary"
              size="lg"
              onClick={next}
              className="mt-3 w-full"
            >
              {idx + 1 >= questions.length ? "See result" : "Next question"}
              <ChevronRight size={16} />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

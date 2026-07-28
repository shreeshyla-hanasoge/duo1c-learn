import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Check, Lightbulb } from "lucide-react";
import type { Topic } from "../../data/curriculum";
import { getTrace, hasTrace } from "../../engine/registry";
import { VizPlayer } from "../../components/viz/VizPlayer";
import { Button, Card, SectionTitle } from "../../components/ui";
import { Prose } from "../../components/Prose";
import { itemVariants, listVariants, cn, spring } from "../../lib/ui";
import { useProgress, useTopicProgress } from "../../store/progress";
import type { Subject } from "../../data/subjects";
import { celebrate, xpToast } from "../../lib/toast";
import { DeepSections, RealWorld } from "./LearnDeep";

export function Learn({ subject, topic }: { subject: Subject; topic: Topic }) {
  const learned = useTopicProgress(subject.id, topic.id)?.learned ?? false;
  const markLearned = useProgress((s) => s.markLearned);

  const vizKeys = useMemo(
    () => (topic.viz ?? []).filter(hasTrace),
    [topic.viz],
  );
  const [vizIdx, setVizIdx] = useState(0);
  const trace = vizKeys.length ? getTrace(vizKeys[vizIdx]) : null;

  const complete = useCallback(() => {
    const gained = markLearned(subject.id, topic.id);
    if (gained > 0) {
      xpToast(gained, "concept watched through");
      celebrate("small");
    }
  }, [markLearned, subject.id, topic.id]);

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8"
    >
      {/* ---- Why this matters ---- */}
      <motion.section variants={itemVariants}>
        <Card
          className="border-l-2 p-5"
          style={{ borderLeftColor: "var(--color-viz-cursor)" }}
        >
          <p className="text-[11px] tracking-wide text-ink-3 uppercase">
            Why it matters
          </p>
          <Prose className="mt-1.5 text-sm leading-relaxed text-ink-2">
            {topic.why}
          </Prose>
        </Card>
      </motion.section>

      {/* ---- Visualiser ---- */}
      {trace && (
        <motion.section variants={itemVariants}>
          <SectionTitle hint="play it, then scrub back through the interesting part">
            Watch it run
          </SectionTitle>

          {vizKeys.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {vizKeys.map((k, i) => {
                const t = getTrace(k);
                return (
                  <button
                    key={k}
                    onClick={() => setVizIdx(i)}
                    className={cn(
                      "relative rounded-lg border px-3 py-1.5 text-xs transition-colors",
                      i === vizIdx
                        ? "text-ink"
                        : "border-line text-ink-3 hover:text-ink-2",
                    )}
                    style={
                      i === vizIdx
                        ? {
                            borderColor: "var(--color-viz-cursor)",
                            background:
                              "color-mix(in oklab, var(--color-viz-cursor) 14%, transparent)",
                          }
                        : undefined
                    }
                  >
                    {t?.title ?? k}
                  </button>
                );
              })}
            </div>
          )}

          <VizPlayer trace={trace} onComplete={complete} />
        </motion.section>
      )}

      {topic.learn && <DeepSections learn={topic.learn} />}
      {topic.realWorld && topic.realWorld.length > 0 && (
        <RealWorld cases={topic.realWorld} />
      )}

      {/* ---- Insights: the pre-upgrade shape, and still a useful recap ---- */}
      <motion.section variants={itemVariants}>
        <SectionTitle
          hint={
            topic.learn
              ? "the short version"
              : `${topic.insights.length} things worth remembering`
          }
        >
          {topic.learn ? "Worth remembering" : "The ideas"}
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3">
          {topic.insights.map((ins, i) => (
            <motion.div
              key={ins.t}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ ...spring, delay: 0.04 * i }}
            >
              <Card className="flex gap-3.5 p-4">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-viz-cursor) 18%, transparent)",
                    color: "var(--color-viz-cursor)",
                  }}
                >
                  <Lightbulb size={13} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">{ins.t}</h3>
                  <Prose className="mt-1 text-sm leading-relaxed text-ink-2">
                    {ins.d}
                  </Prose>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ---- Pitfalls ---- */}
      {topic.pitfalls && topic.pitfalls.length > 0 && (
        <motion.section variants={itemVariants}>
          <SectionTitle>Where it goes wrong</SectionTitle>
          <Card
            className="border-l-2 p-4"
            style={{ borderLeftColor: "var(--color-viz-scan)" }}
          >
            <ul className="flex flex-col gap-2.5">
              {topic.pitfalls.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-ink-2">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--color-viz-scan)" }}
                  />
                  <span className="min-w-0">
                    <Prose as="span" className="text-ink-2">
                      {p}
                    </Prose>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.section>
      )}

      {/* ---- Gate ---- */}
      <motion.section variants={itemVariants}>
        {learned ? (
          <div
            className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--color-viz-match)",
              background:
                "color-mix(in oklab, var(--color-viz-match) 12%, transparent)",
            }}
          >
            <Check size={15} style={{ color: "var(--color-viz-match)" }} />
            Learn gate cleared — move on to Solve.
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={complete}
          >
            {trace ? "Mark as learned" : "I have read this"}
          </Button>
        )}
      </motion.section>
    </motion.div>
  );
}

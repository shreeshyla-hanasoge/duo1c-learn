import { useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Lock, Sparkles } from "lucide-react";
import type { Subject } from "../data/subjects";
import { href } from "../lib/router";
import {
  isMastered,
  tierStats,
  tierUnlocked,
  useSubjectProgress,
} from "../store/progress";
import { Card, Chip, Meter, SectionTitle, TierBadge } from "../components/ui";
import { TopicCard } from "../components/TopicCard";
import { cn, itemVariants, listVariants, spring } from "../lib/ui";
import { hasTrace } from "../engine/registry";

type View = "tiers" | "weeks";

export function Path({ subject }: { subject: Subject }) {
  const [view, setView] = useState<View>("tiers");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">The path</h1>
          <p className="mt-1 text-sm text-ink-2">{subject.copy.pathIntro}</p>
        </div>

        {/* A subject with no timeline has nothing to show "by week". */}
        {subject.phases.length > 0 && (
        <div className="flex rounded-xl border border-line bg-surface-2 p-1">
          {(["tiers", "weeks"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                view === v ? "text-ink" : "text-ink-3 hover:text-ink-2",
              )}
            >
              {view === v && (
                <motion.span
                  layoutId="path-toggle"
                  transition={spring}
                  className="absolute inset-0 -z-10 rounded-lg"
                  style={{ background: "var(--color-surface-3)" }}
                />
              )}
              {v === "tiers"
                ? `By ${subject.copy.unit.toLowerCase()}`
                : "By week"}
            </button>
          ))}
        </div>
        )}
      </div>

      <motion.div
        key={view}
        initial={{ y: 12 }}
        animate={{ y: 0 }}
        transition={spring}
      >
        {view === "tiers" || subject.phases.length === 0 ? (
          <TierView subject={subject} />
        ) : (
          <WeekView subject={subject} />
        )}
      </motion.div>

      {subject.resources && subject.resources.length > 0 && (
        <section>
          <SectionTitle hint="books that bridge the fields">
            Reading shelf
          </SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {subject.resources.map((resource) => (
              <Card key={resource.title} className="h-full p-4">
                <h3 className="text-sm font-medium">{resource.title}</h3>
                <p className="mt-0.5 text-xs text-ink-3">{resource.author}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  {resource.note}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TierView({ subject }: { subject: Subject }) {
  const sp = useSubjectProgress(subject.id);

  return (
    <motion.div
      variants={listVariants(0.05)}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8"
    >
      {subject.tiers.map((tier) => {
        const unlocked = tierUnlocked(sp, subject, tier.id);
        const ts = tierStats(sp, subject, tier.id);
        return (
          <motion.section key={tier.id} variants={itemVariants}>
            {/* The heading is a link to the tier's own page — the orientation
                (what this family IS, and when to reach for it) lives there,
                because it does not fit above a list of nine cards. */}
            <a
              href={href({ name: "tier", id: tier.id }, subject.id)}
              className="group mb-3 flex items-center gap-3"
            >
              <TierBadge tier={tier.id} />
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{tier.name}</span>
                  {!unlocked && (
                    <Lock size={12} className="shrink-0 text-ink-3" />
                  )}
                  <ChevronRight
                    size={13}
                    className="shrink-0 text-ink-3 transition-colors group-hover:text-ink-2"
                  />
                </h2>
                <p className="truncate text-xs text-ink-3">{tier.tagline}</p>
              </div>
              <span className="tabular shrink-0 font-mono text-xs text-ink-3">
                {ts.mastered}/{ts.total}
              </span>
            </a>

            <Meter className="mb-4" pct={ts.pct} />

            {!unlocked && (
              <p className="mb-3 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-ink-3">
                Locked — start half of {subject.copy.unit} {tier.id - 1} to open
                this. You can still read everything; only the mastery credit
                waits.
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tier.topics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} subject={subject} />
              ))}
            </div>
          </motion.section>
        );
      })}
    </motion.div>
  );
}

function WeekView({ subject }: { subject: Subject }) {
  const sp = useSubjectProgress(subject.id);

  return (
    <motion.div
      variants={listVariants(0.05)}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8"
    >
      {subject.phases.map((phase) => (
        <motion.section key={phase.id} variants={itemVariants}>
          <SectionTitle hint={`weeks ${phase.weeks[0]}–${phase.weeks[1]}`}>
            Phase {phase.id} · {phase.name}
          </SectionTitle>

          <div className="relative pl-5">
            <div
              className="absolute top-2 bottom-2 left-[7px] w-px bg-line"
              aria-hidden
            />
            <div className="flex flex-col gap-3">
              {phase.focus.map((f) => {
                const weekTopics = subject.tiers
                  .flatMap((t) => t.topics)
                  .filter((t) => t.week === f.week);
                const done = weekTopics.filter((t) =>
                  isMastered(sp.topics[t.id]),
                ).length;
                const allDone =
                  weekTopics.length > 0 && done === weekTopics.length;
                return (
                  <div key={f.week} className="relative">
                    <span
                      className="absolute top-3.5 -left-[18px] h-2.5 w-2.5 rounded-full border-2"
                      style={{
                        background: allDone
                          ? "var(--color-viz-match)"
                          : "var(--color-bg)",
                        borderColor: allDone
                          ? "var(--color-viz-match)"
                          : "var(--color-line-strong)",
                      }}
                      aria-hidden
                    />
                    <Card className="p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-medium">
                          <span className="mr-2 font-mono text-xs text-ink-3">
                            W{f.week}
                          </span>
                          {f.focus}
                        </h3>
                        {weekTopics.length > 0 && (
                          <span className="tabular font-mono text-[11px] text-ink-3">
                            {done}/{weekTopics.length}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-ink-2">
                        <span className="text-ink-3">Deliverable — </span>
                        {f.deliverable}
                      </p>
                      {weekTopics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {weekTopics.map((t) => (
                            <a
                              key={t.id}
                              href={href(
                                {
                                  name: "topic",
                                  id: t.id,
                                  mode: "learn",
                                },
                                subject.id,
                              )}
                            >
                              <Chip
                                tone={
                                  isMastered(sp.topics[t.id])
                                    ? "match"
                                    : "neutral"
                                }
                              >
                                {t.viz?.some(hasTrace) && <Sparkles size={9} />}
                                {t.title}
                              </Chip>
                            </a>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="mt-3 rounded-xl border-l-2 bg-surface-2 px-4 py-3"
            style={{ borderColor: "var(--color-viz-scan)" }}
          >
            <p className="text-[11px] tracking-wide text-ink-3 uppercase">
              Project anchor
            </p>
            <p className="mt-1 text-sm text-ink-2">{phase.anchor}</p>
          </div>
        </motion.section>
      ))}
    </motion.div>
  );
}

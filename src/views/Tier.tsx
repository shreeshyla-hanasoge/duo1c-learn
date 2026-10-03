import { motion } from "motion/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Lock,
  Target,
} from "lucide-react";
import type { Tier } from "../data/curriculum";
import type { Subject } from "../data/subjects";
import { href } from "../lib/router";
import {
  tierStats,
  tierUnlocked,
  useSubjectProgress,
} from "../store/progress";
import { Card, Chip, Meter, SectionTitle, TierBadge } from "../components/ui";
import { TopicCard } from "../components/TopicCard";
import { Prose } from "../components/Prose";
import { itemVariants, listVariants } from "../lib/ui";
import { hasTrace } from "../engine/registry";

/**
 * A tier as a PLACE, not a heading above a list.
 *
 * The path shows every tier at once, which is the right view for "where am I".
 * It is the wrong view for "what even is this" — nine topics under the word
 * "Graphs" tell you the members of a family without ever telling you what the
 * family is. That orientation is what this page exists to give, and it comes
 * BEFORE the topic list on purpose: a reader who understands the shared idea
 * learns the nine faster than one who meets them one at a time.
 *
 * Tiers without an `orientation` still render — they fall back to the topic
 * grid, which is exactly what they had before this page existed.
 */
export function TierView({ subject, id }: { subject: Subject; id: number }) {
  const tier = subject.tiers.find((t) => t.id === id);
  const sp = useSubjectProgress(subject.id);

  if (!tier) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-2">No tier numbered {id}.</p>
        <a
          href={href({ name: "path" }, subject.id)}
          className="mt-3 inline-block text-sm underline"
        >
          Back to the path
        </a>
      </div>
    );
  }

  const stats = tierStats(sp, subject, tier.id);
  const unlocked = tierUnlocked(sp, subject, tier.id);
  const o = tier.orientation;

  const index = subject.tiers.findIndex((t) => t.id === tier.id);
  const prev = index > 0 ? subject.tiers[index - 1] : null;
  const next =
    index < subject.tiers.length - 1 ? subject.tiers[index + 1] : null;

  const animated = tier.topics.filter(
    (t) => t.viz?.some(hasTrace) ?? false,
  ).length;
  const weeks = tier.topics
    .map((t) => t.week)
    .filter((w): w is number => typeof w === "number");
  const weekRange = weeks.length
    ? [Math.min(...weeks), Math.max(...weeks)]
    : null;

  return (
    <div className="flex flex-col gap-8">
      {/* ---- Header ---- */}
      <div>
        <a
          href={href({ name: "path" }, subject.id)}
          className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink-2"
        >
          <ArrowLeft size={13} /> The path
        </a>

        <div className="mt-3 flex items-start gap-3">
          <TierBadge tier={tier.id} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl leading-tight font-semibold">
              {tier.name}
              {!unlocked && <Lock size={15} className="text-ink-3" />}
            </h1>
            <p className="mt-1.5 text-sm text-ink-2">{tier.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip>{tier.topics.length} topics</Chip>
              {animated > 0 && (
                <Chip>
                  <Film size={10} /> {animated} animated
                </Chip>
              )}
              {weekRange && (
                <Chip>
                  {weekRange[0] === weekRange[1]
                    ? `week ${weekRange[0]}`
                    : `weeks ${weekRange[0]}–${weekRange[1]}`}
                </Chip>
              )}
              {stats.mastered > 0 && (
                <Chip tone="match">
                  {stats.mastered}/{stats.total} mastered
                </Chip>
              )}
            </div>
          </div>
        </div>

        <Meter className="mt-5" pct={stats.pct} />

        {!unlocked && (
          <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-ink-3">
            Locked — start half of {subject.copy.unit} {tier.id - 1} to open
            this. You can still read everything here; only the mastery credit
            waits.
          </p>
        )}
      </div>

      {o && (
        <motion.div
          variants={listVariants(0.05)}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-8"
        >
          {/* ---- What this tier is ---- */}
          {/* Glossary linking is switched ON for the overview and OFF
              everywhere else on this page. `Prose` de-duplicates term links
              within a block, not across them — so with eight blocks of prose
              here, "graph" was linking four separate times. The overview is
              the one paragraph a reader is guaranteed to read, so it gets the
              links; the rest keep backtick code spans without the underlining. */}
          <motion.section variants={itemVariants}>
            <Prose
              linkTerms={subject.linkGlossary !== false}
              className="text-[15px] leading-relaxed text-ink-2"
            >
              {o.overview}
            </Prose>
            <div
              className="mt-4 rounded-xl border-l-2 bg-surface-2 px-4 py-3"
              style={{ borderColor: "var(--color-viz-scan)" }}
            >
              <p className="text-[11px] tracking-wide text-ink-3 uppercase">
                Why it matters
              </p>
              <Prose linkTerms={false} className="mt-1 text-sm text-ink-2">
                {o.stakes}
              </Prose>
            </div>
          </motion.section>

          {/* ---- When to reach for this family ---- */}
          <motion.section variants={itemVariants}>
            <SectionTitle hint="the tells in a problem statement">
              When you reach for this
            </SectionTitle>
            <div className="grid grid-cols-1 gap-2">
              {o.recognise.map((r) => (
                <Card key={r.signal} className="p-4">
                  <div className="flex items-start gap-2.5">
                    <Compass
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--color-viz-scan)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <Prose
                        linkTerms={false}
                        className="text-sm font-medium text-ink"
                      >
                        {r.signal}
                      </Prose>
                      <Prose
                        linkTerms={false}
                        className="mt-1 text-sm leading-relaxed text-ink-2"
                      >
                        {r.reach}
                      </Prose>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ---- The arc ---- */}
          <motion.section variants={itemVariants}>
            <SectionTitle hint="how the topics build">
              The arc of this tier
            </SectionTitle>
            <div className="relative pl-5">
              <div
                className="absolute top-3 bottom-3 left-[7px] w-px bg-line"
                aria-hidden
              />
              <div className="flex flex-col gap-3">
                {o.arc.map((stage, i) => {
                  const topics = stage.topics
                    .map((tid) => subject.topicById.get(tid))
                    .filter((t) => t !== undefined);
                  return (
                    <div key={stage.stage} className="relative">
                      <span
                        className="absolute top-4 -left-[18px] grid h-2.5 w-2.5 place-items-center rounded-full border-2"
                        style={{
                          background: "var(--color-bg)",
                          borderColor: "var(--color-line-strong)",
                        }}
                        aria-hidden
                      />
                      <Card className="p-4">
                        <h3 className="text-sm font-medium">
                          <span className="mr-2 font-mono text-xs text-ink-3">
                            {i + 1}
                          </span>
                          {stage.stage}
                        </h3>
                        <Prose
                          linkTerms={false}
                          className="mt-1.5 text-sm leading-relaxed text-ink-2"
                        >
                          {stage.point}
                        </Prose>
                        {topics.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {topics.map((t) => (
                              <a
                                key={t.id}
                                href={href(
                                  { name: "topic", id: t.id, mode: "learn" },
                                  subject.id,
                                )}
                              >
                                <Chip>{t.title}</Chip>
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
          </motion.section>

          {/* ---- Outcomes ---- */}
          <motion.section variants={itemVariants}>
            <SectionTitle hint="once this tier is yours">
              What you will be able to do
            </SectionTitle>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {o.outcomes.map((out) => (
                <li key={out}>
                  <Card className="flex h-full items-start gap-2.5 p-3.5">
                    <Target
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--color-viz-cursor)" }}
                    />
                    <Prose
                      linkTerms={false}
                      as="span"
                      className="min-w-0 flex-1 text-sm leading-relaxed text-ink-2"
                    >
                      {out}
                    </Prose>
                  </Card>
                </li>
              ))}
            </ul>
          </motion.section>

          {/* ---- In the wild ---- */}
          <motion.section variants={itemVariants}>
            <SectionTitle hint="systems people actually ship">
              Where this shows up
            </SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {o.inTheWild.map((w) => (
                <Card key={w.system} className="h-full p-4">
                  <p className="text-sm font-medium">{w.system}</p>
                  <Prose
                    linkTerms={false}
                    className="mt-1 text-sm leading-relaxed text-ink-2"
                  >
                    {w.use}
                  </Prose>
                </Card>
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}

      {/* ---- Every topic ---- */}
      <section>
        <SectionTitle hint={`${stats.mastered}/${stats.total} mastered`}>
          All {tier.topics.length} topics
        </SectionTitle>
        <motion.div
          variants={listVariants(0.03)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {tier.topics.map((topic) => (
            <motion.div key={topic.id} variants={itemVariants}>
              <TopicCard topic={topic} subject={subject} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---- Prev / next tier ---- */}
      <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {prev ? (
          <TierLink tier={prev} subject={subject} dir="prev" />
        ) : (
          <span />
        )}
        {next && <TierLink tier={next} subject={subject} dir="next" />}
      </nav>
    </div>
  );
}

function TierLink({
  tier,
  subject,
  dir,
}: {
  tier: Tier;
  subject: Subject;
  dir: "prev" | "next";
}) {
  return (
    <a href={href({ name: "tier", id: tier.id }, subject.id)}>
      <Card interactive className="flex h-full items-center gap-3 p-3.5">
        {dir === "prev" && (
          <ChevronLeft size={16} className="shrink-0 text-ink-3" />
        )}
        <div className={`min-w-0 flex-1 ${dir === "next" ? "text-right" : ""}`}>
          <p className="text-[10px] tracking-wide text-ink-3 uppercase">
            {dir === "prev" ? "Previous" : "Next"}{" "}
            {subject.copy.unit.toLowerCase()}
          </p>
          <p className="truncate text-sm">
            {subject.copy.unit} {tier.id} · {tier.name}
          </p>
        </div>
        {dir === "next" && (
          <ChevronRight size={16} className="shrink-0 text-ink-3" />
        )}
      </Card>
    </a>
  );
}

import { motion } from "motion/react";
import { ArrowRight, Flame, Target, Trophy, Zap, Lock } from "lucide-react";
import type { Subject } from "../data/subjects";
import { href } from "../lib/router";
import {
  useSubjectProgress,
  isMastered,
  levelProgress,
  overallStats,
  rankFor,
  tierStats,
  tierUnlocked,
  useProgress,
} from "../store/progress";
import {
  ActivityStrip,
  Card,
  Chip,
  Meter,
  ProgressRing,
  SectionTitle,
  StatTile,
  TierBadge,
} from "../components/ui";
import { itemVariants, listVariants } from "../lib/ui";
import { hasTrace } from "../engine/registry";

export function Dashboard({ subject }: { subject: Subject }) {
  const state = useProgress();
  const sp = useSubjectProgress(subject.id);
  const stats = overallStats(sp, subject);
  const { level, into, need, pct } = levelProgress(state.xp);

  // The next thing to do: first unmastered topic in the lowest unlocked tier.
  const next =
    subject.topics.find(
      (t) => tierUnlocked(sp, subject, t.tier) && !isMastered(sp.topics[t.id]),
    ) ?? subject.topics[0];

  const nextProgress = sp.topics[next.id];
  const nextMode = !nextProgress?.learned
    ? "learn"
    : !nextProgress?.solved
      ? "solve"
      : "quiz";

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8"
    >
      {/* ---- Hero ---- */}
      <motion.section variants={itemVariants}>
        <Card className="relative overflow-hidden p-5 sm:p-7">
          <div
            className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--color-viz-cursor)" }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs tracking-wide text-ink-3 uppercase">
                {rankFor(level)} · Level {level}
              </p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                {stats.mastered === 0
                  ? subject.copy.heroStart
                  : stats.mastered === stats.total
                    ? "Every topic mastered"
                    : `${stats.total - stats.mastered} topics to go`}
              </h1>
              <p className="mt-2 max-w-md text-sm text-ink-2">
                {subject.copy.heroBlurb}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip tone="cursor">
                  <Zap size={11} /> {state.xp} XP
                </Chip>
                <Chip tone={state.streak > 0 ? "scan" : "neutral"}>
                  <Flame size={11} /> {state.streak} day streak
                </Chip>
                <Chip tone="match">
                  <Trophy size={11} /> {sp.badges.length} badges
                </Chip>
              </div>
            </div>

            <ProgressRing pct={stats.pct} size={116} stroke={9}>
              <div className="text-center">
                <div className="tabular text-2xl font-semibold">
                  {Math.round(stats.pct * 100)}%
                </div>
                <div className="text-[10px] text-ink-3">mastered</div>
              </div>
            </ProgressRing>
          </div>

          <Meter
            className="relative mt-6"
            pct={pct}
            label={`Level ${level} → ${level + 1}`}
            value={`${into} / ${need} XP`}
          />
        </Card>
      </motion.section>

      {/* ---- Continue ---- */}
      <motion.section variants={itemVariants}>
        <SectionTitle hint="picks up where you left off">Continue</SectionTitle>
        <a
          href={href(
            { name: "topic", id: next.id, mode: nextMode },
            subject.id,
          )}
          className="block"
        >
          <Card
            interactive
            className="group flex items-center gap-4 p-5"
            style={{ borderColor: "var(--color-viz-cursor)" }}
          >
            <TierBadge tier={next.tier} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium">{next.title}</h3>
                {next.week && <Chip>week {next.week}</Chip>}
              </div>
              <p className="mt-0.5 truncate text-sm text-ink-3">
                {next.summary}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-xs text-ink-3 capitalize sm:inline">
                {nextMode}
              </span>
              <motion.span
                className="grid h-9 w-9 place-items-center rounded-full text-white"
                style={{ background: "var(--color-viz-cursor)" }}
                whileHover={{ x: 3 }}
              >
                <ArrowRight size={16} />
              </motion.span>
            </div>
          </Card>
        </a>
      </motion.section>

      {/* ---- Stats ---- */}
      <motion.section variants={itemVariants}>
        <SectionTitle>At a glance</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Mastered"
            value={stats.mastered}
            sub={`of ${stats.total} topics`}
            accent
          />
          <StatTile
            label="Started"
            value={stats.started}
            sub="topics touched"
            icon={<Target size={14} />}
          />
          <StatTile
            label="Quiz accuracy"
            value={
              stats.accuracy ? `${Math.round(stats.accuracy * 100)}%` : "—"
            }
            sub="best score, averaged"
          />
          <StatTile
            label="Streak"
            value={state.streak}
            sub="consecutive days"
            icon={<Flame size={14} />}
          />
        </div>
      </motion.section>

      {/* ---- Tiers ---- */}
      <motion.section variants={itemVariants}>
        <SectionTitle hint={subject.copy.unitsHint}>
          {subject.copy.unitsTitle}
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3">
          {subject.tiers.map((tier) => {
            const ts = tierStats(sp, subject, tier.id);
            const unlocked = tierUnlocked(sp, subject, tier.id);
            const withViz = tier.topics.filter((t) =>
              t.viz?.some(hasTrace),
            ).length;
            return (
              <a
                key={tier.id}
                href={href({ name: "tier", id: tier.id }, subject.id)}
                className="block"
              >
                <Card interactive className="p-4">
                  <div className="flex items-center gap-3">
                    <TierBadge tier={tier.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium">
                          {tier.name}
                        </h3>
                        {!unlocked && (
                          <Lock size={12} className="shrink-0 text-ink-3" />
                        )}
                      </div>
                      <p className="truncate text-xs text-ink-3">
                        {tier.tagline}
                      </p>
                    </div>
                    <span className="tabular shrink-0 font-mono text-xs text-ink-3">
                      {ts.mastered}/{ts.total}
                    </span>
                  </div>
                  <Meter className="mt-3" pct={ts.pct} />
                  <div className="mt-2 flex gap-3 text-[11px] text-ink-3">
                    <span>{ts.started} started</span>
                    <span>·</span>
                    <span>{withViz} animated</span>
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      </motion.section>

      {/* ---- Activity ---- */}
      <motion.section variants={itemVariants}>
        <SectionTitle hint="last 8 weeks">Activity</SectionTitle>
        <Card className="p-4">
          <ActivityStrip daily={state.daily} />
          <p className="mt-3 text-xs text-ink-3">
            {subject.copy.activityNote}
          </p>
        </Card>
      </motion.section>
    </motion.div>
  );
}

import { useState } from "react";
import { motion } from "motion/react";
import { Award, Flame, Lock, Target, Trophy, Zap } from "lucide-react";
import type { Subject } from "../data/subjects";
import { authEnabled } from "../lib/auth";
import { AccountBlock } from "../components/Account";
import {
  useSubjectProgress,
  isMastered,
  levelProgress,
  overallStats,
  rankFor,
  tierStats,
  useProgress,
  xpForLevel,
} from "../store/progress";
import {
  ActivityStrip,
  Button,
  Card,
  Meter,
  ProgressRing,
  SectionTitle,
  StatTile,
  TierBadge,
} from "../components/ui";
import { itemVariants, listVariants, spring } from "../lib/ui";

export function Profile({ subject }: { subject: Subject }) {
  const state = useProgress();
  const sp = useSubjectProgress(subject.id);
  const reset = useProgress((s) => s.reset);
  const stats = overallStats(sp, subject);
  const { level, into, need, pct } = levelProgress(state.xp);
  const [confirming, setConfirming] = useState(false);

  const bestArena = sp.arena.reduce((m, a) => Math.max(m, a.score), 0);

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8"
    >
      {/* Account first: on a phone this page is the only place sign-out and
          the sync status are reachable at all. */}
      {authEnabled && (
        <motion.section variants={itemVariants}>
          <SectionTitle>Account</SectionTitle>
          <AccountBlock />
        </motion.section>
      )}

      <motion.section variants={itemVariants}>
        <Card className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
          <ProgressRing pct={pct} size={96} stroke={8}>
            <div className="text-center">
              <div className="tabular text-xl font-semibold">{level}</div>
              <div className="text-[9px] text-ink-3">LEVEL</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{rankFor(level)}</h1>
            <p className="mt-1 text-sm text-ink-2">
              {state.xp} XP total · {into}/{need} toward level {level + 1}
            </p>
            <Meter className="mt-3" pct={pct} />
            <p className="mt-2 text-xs text-ink-3">
              Next rank at level {(Math.floor((level - 1) / 3) + 1) * 3 + 1} ·{" "}
              {xpForLevel((Math.floor((level - 1) / 3) + 1) * 3 + 1) - state.xp}{" "}
              XP away
            </p>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="XP"
            value={state.xp}
            icon={<Zap size={14} />}
            accent
          />
          <StatTile
            label="Mastered"
            value={`${stats.mastered}/${stats.total}`}
            icon={<Target size={14} />}
          />
          <StatTile
            label="Streak"
            value={`${state.streak}d`}
            icon={<Flame size={14} />}
          />
          <StatTile
            label="Best arena"
            value={bestArena}
            icon={<Trophy size={14} />}
          />
        </div>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle hint={`${sp.badges.length} of ${subject.badges.length}`}>
          Badges
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {subject.badges.map((b, i) => {
            const earned = sp.badges.includes(b.id);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring, delay: i * 0.025 }}
              >
                <Card
                  className="flex h-full flex-col items-center gap-2 p-4 text-center"
                  style={
                    earned
                      ? {
                          borderColor: "var(--color-viz-match)",
                          background:
                            "color-mix(in oklab, var(--color-viz-match) 7%, transparent)",
                        }
                      : undefined
                  }
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full"
                    style={{
                      background: earned
                        ? "color-mix(in oklab, var(--color-viz-match) 22%, transparent)"
                        : "var(--color-surface-3)",
                      color: earned
                        ? "var(--color-viz-match)"
                        : "var(--color-ink-3)",
                    }}
                  >
                    {earned ? <Award size={18} /> : <Lock size={15} />}
                  </span>
                  <span className="text-xs font-medium">{b.name}</span>
                  <span className="text-[11px] leading-snug text-ink-3">
                    {b.hint}
                  </span>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle>{subject.copy.unit} breakdown</SectionTitle>
        <Card className="divide-y divide-line">
          {subject.tiers.map((tier) => {
            const ts = tierStats(sp, subject, tier.id);
            return (
              <div key={tier.id} className="flex items-center gap-3 p-4">
                <TierBadge tier={tier.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{tier.name}</p>
                  <Meter className="mt-2" pct={ts.pct} />
                </div>
                <span className="tabular shrink-0 font-mono text-xs text-ink-3">
                  {ts.mastered}/{ts.total}
                </span>
              </div>
            );
          })}
        </Card>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle hint="last 8 weeks">Activity</SectionTitle>
        <Card className="p-4">
          <ActivityStrip daily={state.daily} />
        </Card>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle>Danger zone</SectionTitle>
        <Card className="p-4">
          <p className="text-sm text-ink-2">
            Progress lives in this browser's local storage — nothing is sent
            anywhere. Resetting clears every gate, badge, and XP point
            permanently.
          </p>
          <div className="mt-3 flex gap-2">
            {confirming ? (
              <>
                <Button
                  onClick={() => {
                    reset();
                    setConfirming(false);
                  }}
                  className="border-0 text-white"
                  style={{ background: "var(--color-viz-critical)" }}
                >
                  Yes, erase everything
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setConfirming(true)}>
                Reset all progress
              </Button>
            )}
          </div>
        </Card>
      </motion.section>

      <motion.p
        variants={itemVariants}
        className="pb-4 text-center text-xs text-ink-3"
      >
        {stats.mastered === stats.total
          ? "Every topic mastered. Now go apply them to real code — that was always the point."
          : `${subject.tiers.flatMap((t) => t.topics).filter((t) => !isMastered(sp.topics[t.id])).length} topics still open.`}
      </motion.p>
    </motion.div>
  );
}

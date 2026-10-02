import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Clock,
  Flame,
  Heart,
  Swords,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import type { QuizQ } from "../data/curriculum";
import type { Subject } from "../data/subjects";
import { QuizFigure } from "../components/viz/QuizFigure";
import {
  tierUnlocked,
  useProgress,
  useSubjectProgress,
} from "../store/progress";
import {
  Button,
  Card,
  Chip,
  Empty,
  Meter,
  SectionTitle,
  StatTile,
  TierBadge,
} from "../components/ui";
import { itemVariants, listVariants, spring, springSnap } from "../lib/ui";
import { celebrate, xpToast } from "../lib/toast";
import { href } from "../lib/router";

interface Loaded extends QuizQ {
  topicId: string;
  topicTitle: string;
  tier: number;
}

type Mode = "rapid" | "survival";

const RAPID_SECONDS = 90;
const LIVES = 3;

export function Arena({ subject }: { subject: Subject }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const sp = useSubjectProgress(subject.id);
  const arena = sp.arena;

  const pool = useMemo<Loaded[]>(() => {
    const out: Loaded[] = [];
    for (const t of subject.topics) {
      // Only draw from tiers the reader has opened — the Arena should test
      // what they have seen, not ambush them with Tier 4 on day one.
      if (!tierUnlocked(sp, subject, t.tier)) continue;
      for (const q of t.quiz) {
        out.push({ ...q, topicId: t.id, topicTitle: t.title, tier: t.tier });
      }
    }
    return out;
  }, [sp, subject]);

  const best = arena.reduce((m, a) => Math.max(m, a.score), 0);

  if (mode)
    return (
      <Run
        mode={mode}
        pool={pool}
        subject={subject}
        onExit={() => setMode(null)}
      />
    );

  return (
    <motion.div
      variants={listVariants()}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-semibold">Arena</h1>
        <p className="mt-1 text-sm text-ink-2">
          Mixed questions drawn from every{" "}
          {subject.copy.unit.toLowerCase()} you have opened. No explanations
          mid-run — this is timed recall, not teaching.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <StatTile
          label="Best run"
          value={best}
          sub="correct answers"
          accent
          icon={<Trophy size={14} />}
        />
        <StatTile
          label="Runs"
          value={arena.length}
          sub="recorded"
          icon={<Swords size={14} />}
        />
        <StatTile
          label="Question pool"
          value={pool.length}
          sub={`from unlocked ${subject.copy.unit.toLowerCase()}s`}
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <ChallengeCard
          title="Rapid Fire"
          detail={`${RAPID_SECONDS} seconds. Answer as many as you can. A wrong answer costs you nothing but time.`}
          icon={<Clock size={18} />}
          onStart={() => setMode("rapid")}
          disabled={pool.length === 0}
        />
        <ChallengeCard
          title="Survival"
          detail={`${LIVES} lives, no clock. Questions climb through the ${subject.copy.unit.toLowerCase()}s. One wrong answer costs a life.`}
          icon={<Heart size={18} />}
          onStart={() => setMode("survival")}
          disabled={pool.length === 0}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <SectionTitle hint="most recent first">History</SectionTitle>
        {arena.length === 0 ? (
          <Empty>
            No runs yet. The Arena is where you find out what you actually
            retained.
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {[...arena].reverse().map((a, i) => (
              <Card key={i} className="flex items-center gap-4 p-3.5">
                <span
                  className="tabular grid h-10 w-10 shrink-0 place-items-center rounded-lg font-mono text-sm font-semibold"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-viz-cursor) 18%, transparent)",
                  }}
                >
                  {a.score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {a.score} of {a.total} correct
                  </p>
                  <p className="text-xs text-ink-3">
                    {a.date} · {a.seconds}s
                  </p>
                </div>
                <span className="tabular shrink-0 font-mono text-xs text-ink-3">
                  {a.total ? Math.round((a.score / a.total) * 100) : 0}%
                </span>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ChallengeCard({
  title,
  detail,
  icon,
  onStart,
  disabled,
}: {
  title: string;
  detail: string;
  icon: React.ReactNode;
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col p-5">
      <span
        className="grid h-10 w-10 place-items-center rounded-xl"
        style={{
          background:
            "color-mix(in oklab, var(--color-viz-cursor) 16%, transparent)",
          color: "var(--color-viz-cursor)",
        }}
      >
        {icon}
      </span>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-ink-2">{detail}</p>
      <Button
        variant="primary"
        className="mt-4 w-full"
        onClick={onStart}
        disabled={disabled}
      >
        Start
      </Button>
    </Card>
  );
}

/* ---- The run ------------------------------------------------------- */

function Run({
  mode,
  pool,
  subject,
  onExit,
}: {
  mode: Mode;
  pool: Loaded[];
  subject: Subject;
  onExit: () => void;
}) {
  const recordArena = useProgress((s) => s.recordArena);

  const order = useMemo(() => {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Survival ramps through the tiers; Rapid Fire stays mixed.
    return mode === "survival"
      ? shuffled.sort((a, b) => a.tier - b.tier)
      : shuffled;
  }, [pool, mode]);

  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(RAPID_SECONDS);
  const [over, setOver] = useState(false);
  const startedAt = useRef(Date.now());
  const saved = useRef(false);

  const q = order[idx % order.length];

  const finish = useCallback(
    (finalScore: number, finalAsked: number) => {
      if (saved.current) return;
      saved.current = true;
      setOver(true);
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const gained = recordArena(subject.id, {
        score: finalScore,
        total: finalAsked,
        seconds,
      });
      if (gained > 0) xpToast(gained, `${finalScore} correct`);
      if (finalScore >= 10) celebrate("large");
    },
    [recordArena, subject.id],
  );

  useEffect(() => {
    if (mode !== "rapid" || over) return;
    if (left <= 0) {
      finish(score, asked);
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, left, over, finish, score, asked]);

  const choose = (i: number) => {
    if (picked !== null || over) return;
    setPicked(i);
    const right = i === q.answer;
    const nextScore = right ? score + 1 : score;
    const nextAsked = asked + 1;
    setScore(nextScore);
    setAsked(nextAsked);
    setStreak(right ? streak + 1 : 0);

    const nextLives = right ? lives : lives - 1;
    if (!right) setLives(nextLives);

    setTimeout(
      () => {
        if (mode === "survival" && nextLives <= 0) {
          finish(nextScore, nextAsked);
          return;
        }
        if (mode === "rapid" && left <= 0) {
          finish(nextScore, nextAsked);
          return;
        }
        setIdx((v) => v + 1);
        setPicked(null);
      },
      right ? 420 : 1100,
    );
  };

  if (over) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springSnap}
        className="flex flex-col gap-5"
      >
        <Card className="p-8 text-center">
          <p className="text-xs tracking-wide text-ink-3 uppercase">
            {mode === "rapid" ? "Rapid Fire" : "Survival"} complete
          </p>
          <div
            className="tabular mt-2 text-6xl font-semibold"
            style={{ color: "var(--color-viz-cursor)" }}
          >
            {score}
          </div>
          <p className="mt-2 text-sm text-ink-2">
            {score} correct out of {asked} answered
          </p>
          <Meter
            className="mt-6"
            pct={asked ? score / asked : 0}
            label="Accuracy"
            value={`${asked ? Math.round((score / asked) * 100) : 0}%`}
          />
        </Card>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="primary" size="lg" onClick={onExit}>
            Back to the Arena
          </Button>
          <a href={href({ name: "path" }, subject.id)}>
            <Button variant="outline" size="lg" className="w-full">
              Study the weak spots
            </Button>
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ---- HUD ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onExit}
          className="text-xs text-ink-3 transition-colors hover:text-ink-2"
        >
          ← Give up
        </button>
        <div className="flex items-center gap-3">
          {mode === "rapid" ? (
            <span
              className="tabular flex items-center gap-1.5 font-mono text-sm"
              style={{
                color:
                  left <= 10 ? "var(--color-viz-critical)" : "var(--color-ink)",
              }}
            >
              <Clock size={14} />
              {left}s
            </span>
          ) : (
            <span className="flex items-center gap-1">
              {Array.from({ length: LIVES }).map((_, i) => (
                <Heart
                  key={i}
                  size={15}
                  fill={i < lives ? "currentColor" : "none"}
                  style={{
                    color:
                      i < lives
                        ? "var(--color-viz-critical)"
                        : "var(--color-ink-3)",
                  }}
                />
              ))}
            </span>
          )}
          <span className="tabular flex items-center gap-1.5 font-mono text-sm">
            <Zap size={14} style={{ color: "var(--color-viz-cursor)" }} />
            {score}
          </span>
          {streak >= 3 && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springSnap}
              className="tabular flex items-center gap-1 font-mono text-sm"
              style={{ color: "var(--color-viz-scan)" }}
            >
              <Flame size={14} />
              {streak}
            </motion.span>
          )}
        </div>
      </div>

      {mode === "rapid" && <Meter pct={left / RAPID_SECONDS} />}

      {/* ---- Question ---- */}
      {/* Keyed enter, no exit — the run auto-advances on a timer, so an
          exit animation could collide with the next question mounting. */}
      <motion.div
        key={idx}
        initial={{ y: 26, scale: 0.985 }}
        animate={{ y: 0, scale: 1 }}
        transition={spring}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <TierBadge tier={q.tier} />
          <Chip>{q.topicTitle}</Chip>
        </div>

        <h2 className="text-lg leading-snug font-medium">{q.q}</h2>
        {q.figure && <QuizFigure fig={q.figure} />}

        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const reveal = picked !== null;
            const isAnswer = i === q.answer;
            const isPicked = picked === i;
            return (
              <motion.button
                key={i}
                onClick={() => choose(i)}
                disabled={reveal}
                whileTap={{ scale: reveal ? 1 : 0.99 }}
                animate={{
                  x: reveal && isPicked && !isAnswer ? [0, -6, 6, -3, 0] : 0,
                }}
                transition={springSnap}
                className="flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm disabled:cursor-default"
                style={{
                  borderColor:
                    reveal && isAnswer
                      ? "var(--color-viz-match)"
                      : reveal && isPicked
                        ? "var(--color-viz-critical)"
                        : "var(--color-line)",
                  background:
                    reveal && isAnswer
                      ? "color-mix(in oklab, var(--color-viz-match) 12%, transparent)"
                      : reveal && isPicked
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
      </motion.div>
    </div>
  );
}

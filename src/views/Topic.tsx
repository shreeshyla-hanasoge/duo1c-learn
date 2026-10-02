import { motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Puzzle,
} from "lucide-react";
import { href, type TopicMode } from "../lib/router";
import type { Subject } from "../data/subjects";
import { isMastered, useTopicProgress } from "../store/progress";
import { Card, Chip, TierBadge } from "../components/ui";
import { cn, spring } from "../lib/ui";
import { Learn } from "./modes/Learn";
import { Solve } from "./modes/Solve";
import { Quiz } from "./modes/Quiz";

const MODES: { id: TopicMode; label: string; icon: typeof BookOpen }[] = [
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "solve", label: "Solve", icon: Puzzle },
  { id: "quiz", label: "Quiz", icon: HelpCircle },
];

export function TopicView({
  subject,
  id,
  mode,
}: {
  subject: Subject;
  id: string;
  mode: TopicMode;
}) {
  const topic = subject.topicById.get(id);
  const progress = useTopicProgress(subject.id, id);

  if (!topic) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-2">No topic called “{id}”.</p>
        <a
          href={href({ name: "path" }, subject.id)}
          className="mt-3 inline-block text-sm underline"
        >
          Back to the path
        </a>
      </div>
    );
  }

  const tier = subject.tiers.find((t) => t.id === topic.tier);
  const index = subject.topics.findIndex((t) => t.id === id);
  const prev = index > 0 ? subject.topics[index - 1] : null;
  const nextTopic =
    index < subject.topics.length - 1 ? subject.topics[index + 1] : null;
  const mastered = isMastered(progress);

  const gateDone: Record<TopicMode, boolean> = {
    learn: progress?.learned ?? false,
    solve: progress?.solved ?? false,
    quiz: (progress?.quizBest ?? 0) >= 0.8,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Header ---- */}
      <div>
        {/* Breadcrumb, not a bare back link: a topic belongs to a tier, and
            the tier page is where the shared idea and the sibling topics are.
            Sending "back" to the full path skips that entirely. */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
          <a
            href={href({ name: "path" }, subject.id)}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-ink-2"
          >
            <ArrowLeft size={13} /> The path
          </a>
          {tier && (
            <>
              <span aria-hidden>/</span>
              <a
                href={href({ name: "tier", id: tier.id }, subject.id)}
                className="truncate transition-colors hover:text-ink-2"
              >
                {tier.name}
              </a>
            </>
          )}
        </nav>

        <div className="mt-3 flex items-start gap-3">
          <TierBadge tier={topic.tier} className="mt-1" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-semibold">
              {topic.title}
            </h1>
            <p className="mt-1.5 text-sm text-ink-2">{topic.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {topic.week && <Chip>week {topic.week}</Chip>}
              {topic.complexity && (
                <Chip tone="cursor">
                  <span className="font-mono">{topic.complexity}</span>
                </Chip>
              )}
              {mastered && <Chip tone="match">mastered</Chip>}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Mode tabs ---- */}
      <div className="sticky top-0 z-20 -mx-4 bg-bg/80 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0">
        <div className="flex rounded-xl border border-line bg-surface-2 p-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            const on = mode === m.id;
            return (
              <a
                key={m.id}
                href={href({ name: "topic", id, mode: m.id }, subject.id)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
                  on ? "text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="mode-pill"
                    transition={spring}
                    className="absolute inset-0 -z-10 rounded-lg"
                    style={{ background: "var(--color-surface-3)" }}
                  />
                )}
                <Icon size={15} />
                {m.label}
                {gateDone[m.id] && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--color-viz-match)" }}
                    aria-label="cleared"
                  />
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* ---- Mode body ---- */}
      {/* Keyed enter only, no exit — the tabs are hash links, so two quick
          taps must never be able to leave the body mid-transition. */}
      <motion.div
        key={mode}
        initial={{ y: 14 }}
        animate={{ y: 0 }}
        transition={spring}
      >
        {mode === "learn" && <Learn subject={subject} topic={topic} />}
        {mode === "solve" && <Solve subject={subject} topic={topic} />}
        {mode === "quiz" && <Quiz subject={subject} topic={topic} />}
      </motion.div>

      {/* ---- Prev / next ---- */}
      <nav className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {prev ? (
          <a
            href={href(
              { name: "topic", id: prev.id, mode: "learn" },
              subject.id,
            )}
          >
            <Card interactive className="flex h-full items-center gap-3 p-3.5">
              <ChevronLeft size={16} className="shrink-0 text-ink-3" />
              <div className="min-w-0">
                <p className="text-[10px] tracking-wide text-ink-3 uppercase">
                  Previous
                </p>
                <p className="truncate text-sm">{prev.title}</p>
              </div>
            </Card>
          </a>
        ) : (
          <span />
        )}
        {nextTopic && (
          <a
            href={href(
              { name: "topic", id: nextTopic.id, mode: "learn" },
              subject.id,
            )}
          >
            <Card
              interactive
              className="flex h-full items-center gap-3 p-3.5 text-right"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] tracking-wide text-ink-3 uppercase">
                  Next
                </p>
                <p className="truncate text-sm">{nextTopic.title}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-3" />
            </Card>
          </a>
        )}
      </nav>
    </div>
  );
}

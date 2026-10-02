import { CheckCircle2, Circle, Film } from "lucide-react";
import type { Topic } from "../data/curriculum";
import type { Subject } from "../data/subjects";
import { href } from "../lib/router";
import { isMastered, useTopicProgress } from "../store/progress";
import { Card } from "./ui";
import { hasTrace } from "../engine/registry";

/**
 * One topic, as a tappable card with its three gates.
 *
 * Lives here rather than inside a view because both the path and a tier page
 * list topics, and two copies would drift — the gate colours in particular are
 * validated for CVD and contrast, so they must be defined exactly once.
 */
export function TopicCard({
  topic,
  subject,
}: {
  topic: Topic;
  subject: Subject;
}) {
  const p = useTopicProgress(subject.id, topic.id);
  const mastered = isMastered(p);
  const animated = topic.viz?.some(hasTrace) ?? false;

  return (
    <a
      href={href({ name: "topic", id: topic.id, mode: "learn" }, subject.id)}
      className="block"
    >
      <Card interactive className="flex h-full items-start gap-3 p-3.5">
        <span className="mt-0.5 shrink-0">
          {mastered ? (
            <CheckCircle2
              size={16}
              style={{ color: "var(--color-viz-match)" }}
            />
          ) : (
            <Circle size={16} className="text-ink-3" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-medium">{topic.title}</h3>
            {animated && <Film size={12} className="shrink-0 text-ink-3" />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-3">
            {topic.summary}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Gate on={p?.learned} label="learn" />
            <Gate on={p?.solved} label="solve" />
            <Gate on={(p?.quizBest ?? 0) >= 0.8} label="quiz" />
            {topic.complexity && (
              <span className="ml-auto font-mono text-[10px] text-ink-3">
                {topic.complexity}
              </span>
            )}
          </div>
        </div>
      </Card>
    </a>
  );
}

function Gate({ on, label }: { on?: boolean; label: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[10px]"
      style={{
        background: on
          ? "color-mix(in oklab, var(--color-viz-match) 22%, transparent)"
          : "var(--color-surface-3)",
        color: on ? "var(--color-ink)" : "var(--color-ink-3)",
        border: `1px solid ${on ? "var(--color-viz-match)" : "var(--color-line)"}`,
      }}
    >
      {on ? "✓" : "·"} {label}
    </span>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Gauge,
} from "lucide-react";
import type { Trace } from "../../engine/trace";
import { Stage, STATE_LABELS } from "./Stage";
import { cn, spring } from "../../lib/ui";

const SPEEDS = [
  { label: "0.5×", ms: 2000 },
  { label: "1×", ms: 1100 },
  { label: "2×", ms: 550 },
  { label: "4×", ms: 260 },
];

const TONE_DOT: Record<string, string> = {
  cursor: "var(--color-viz-cursor)",
  scan: "var(--color-viz-scan)",
  match: "var(--color-viz-match)",
  muted: "var(--color-line-strong)",
};

export function VizPlayer({
  trace,
  onComplete,
  autoPlay = false,
}: {
  trace: Trace;
  onComplete?: () => void;
  autoPlay?: boolean;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speedIdx, setSpeedIdx] = useState(1);
  const completed = useRef(false);
  const last = trace.frames.length - 1;
  const frame = trace.frames[Math.min(i, last)];

  // Reset when the trace itself changes (switching topics).
  useEffect(() => {
    setI(0);
    setPlaying(autoPlay);
    completed.current = false;
  }, [trace, autoPlay]);

  useEffect(() => {
    if (!playing) return;
    if (i >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(
      () => setI((v) => Math.min(last, v + 1)),
      SPEEDS[speedIdx].ms,
    );
    return () => clearTimeout(t);
  }, [playing, i, last, speedIdx]);

  useEffect(() => {
    if (i >= last && !completed.current) {
      completed.current = true;
      onComplete?.();
    }
  }, [i, last, onComplete]);

  const step = useCallback(
    (d: number) => {
      setPlaying(false);
      setI((v) => Math.max(0, Math.min(last, v + d)));
    },
    [last],
  );

  const restart = useCallback(() => {
    setI(0);
    setPlaying(true);
  }, []);

  // Keyboard control — space, arrows, and R.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
        return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key.toLowerCase() === "r") {
        restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, restart]);

  const pct = last === 0 ? 1 : i / last;

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Stage ---- */}
      <div className="surface grain relative overflow-hidden rounded-2xl p-4 sm:p-6">
        <Stage frame={frame} trace={trace} />
      </div>

      {/* ---- Narration ---- */}
      <div className="min-h-[4.5rem] rounded-xl border border-line bg-surface-2 px-4 py-3">
        {/* Keyed enter, y-only, no exit. The narration IS the lesson — it
            must never be blank because a transition did not finish, and
            stepping fast must never leave two lines fighting. */}
        <motion.p
          key={i}
          initial={{ y: 7 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          className="text-sm leading-relaxed text-ink-2"
        >
          <span
            className="mr-2 inline-block rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              background:
                "color-mix(in oklab, var(--color-viz-cursor) 18%, transparent)",
              color: "var(--color-ink)",
            }}
          >
            {i + 1}/{last + 1}
          </span>
          {frame.note}
        </motion.p>
      </div>

      {/* ---- Controls ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
          <IconBtn label="Restart" onClick={restart}>
            <RotateCcw size={15} />
          </IconBtn>
          <IconBtn
            label="Step back"
            onClick={() => step(-1)}
            disabled={i === 0}
          >
            <SkipBack size={15} />
          </IconBtn>
          <button
            onClick={() => (i >= last ? restart() : setPlaying((p) => !p))}
            className="grid h-9 w-11 place-items-center rounded-lg transition-colors"
            style={{
              background: "var(--color-viz-cursor)",
              color: "#fff",
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>
          <IconBtn
            label="Step forward"
            onClick={() => step(1)}
            disabled={i === last}
          >
            <SkipForward size={15} />
          </IconBtn>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
          <Gauge size={14} className="ml-1.5 text-ink-3" />
          {SPEEDS.map((s, idx) => (
            <button
              key={s.label}
              onClick={() => setSpeedIdx(idx)}
              className={cn(
                "rounded-lg px-2 py-1.5 font-mono text-xs transition-colors",
                idx === speedIdx ? "text-ink" : "text-ink-3 hover:text-ink-2",
              )}
              style={
                idx === speedIdx
                  ? { background: "var(--color-surface-3)" }
                  : undefined
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          {STATE_LABELS.map((l) => (
            <span
              key={l.s}
              className="flex items-center gap-1.5 text-[11px] text-ink-3"
            >
              <span
                className="h-2.5 w-2.5 rounded-full border"
                style={{
                  background: TONE_DOT[l.s],
                  borderColor: TONE_DOT[l.s],
                  opacity: l.s === "muted" ? 0.6 : 1,
                }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ---- Scrubber ---- */}
      <div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: "var(--color-viz-cursor)" }}
            animate={{ width: `${pct * 100}%` }}
            transition={spring}
          />
        </div>
        <input
          type="range"
          min={0}
          max={last}
          value={i}
          onChange={(e) => {
            setPlaying(false);
            setI(Number(e.target.value));
          }}
          className="mt-1 w-full accent-[var(--color-viz-cursor)]"
          aria-label="Scrub through steps"
        />
      </div>

      {/* ---- Code ---- */}
      {trace.code.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-[11px] tracking-wide text-ink-3 uppercase">
              Pseudo-code
            </span>
            {trace.complexity && (
              <span className="font-mono text-[11px] text-ink-3">
                {trace.complexity.time} time · {trace.complexity.space} space
              </span>
            )}
          </div>
          <pre className="overflow-x-auto p-1 font-mono text-[12px] leading-6 sm:text-[13px]">
            {trace.code.map((line, idx) => {
              const active = frame.line === idx;
              return (
                <motion.div
                  key={idx}
                  initial={false}
                  animate={{
                    backgroundColor: active
                      ? "color-mix(in oklab, var(--color-viz-cursor) 16%, transparent)"
                      : "rgba(0,0,0,0)",
                  }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-3 rounded-md px-3"
                >
                  <span className="w-4 shrink-0 text-right text-ink-3 select-none">
                    {idx + 1}
                  </span>
                  <code
                    className="whitespace-pre"
                    style={{
                      color: active ? "var(--color-ink)" : "var(--color-ink-2)",
                    }}
                  >
                    {line || " "}
                  </code>
                </motion.div>
              );
            })}
          </pre>
        </div>
      )}

      <p className="text-[11px] text-ink-3">
        Space to play/pause · ← → to step · R to restart
      </p>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

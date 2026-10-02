import { motion } from "motion/react";
import type { CellState, LadderView } from "../../engine/trace";
import { spring } from "../../lib/ui";
import { TONE } from "./tones";

/* ------------------------------------------------------------------ *
 * The two price-by-volume panels the Stage can draw.
 *
 *  LadderPanel — DOM rows, one per price bin, each with a state and a
 *                number. For algorithm steps.
 *  ChartPanel  — (ChartPanel.tsx) Emberwick candles with session
 *                profiles under them, for context.
 * ------------------------------------------------------------------ */

const fmt = (p: number) =>
  p.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function LadderPanel({ view }: { view: LadderView }) {
  const { step, rows, lines = [], meter, caption, mode = "volume" } = view;
  const n = rows.length;
  if (!n) return null;
  // Up to 60 rows each row stays readable (7–20px). Beyond that — a 1-point
  // bin on a 300-point day — rows shrink to as little as 1px, because the
  // point of that view is the jagged texture, not any single row.
  const rowH =
    n > 60
      ? Math.max(1, Math.floor(420 / n))
      : Math.max(7, Math.min(20, Math.round(300 / n)));
  const thin = rowH < 4;
  const maxV = view.maxV ?? Math.max(1, ...rows.map((r) => r.v));
  const top = rows[n - 1].lo + step;
  // Label on an ABSOLUTE stride of the grid, so labels do not hop between
  // rows as the profile grows at either end.
  const every = view.labelEvery ?? Math.max(1, Math.ceil(n / 12));
  const ordered = [...rows].reverse();

  return (
    <div className="w-full min-w-0">
      <div className="flex min-w-0 gap-2">
        {/* Price axis */}
        <div
          className="relative w-16 shrink-0 font-mono text-[10px] text-ink-3"
          style={{ height: n * rowH }}
          aria-hidden
        >
          {ordered.map((r, i) => {
            const k = Math.round(r.lo / step);
            if (k % every !== 0) return null;
            return (
              <span
                key={r.id}
                className="absolute right-0 leading-none tabular"
                style={{ top: (i + 1) * rowH - 5 }}
              >
                {fmt(r.lo)}
              </span>
            );
          })}
        </div>

        {/* Bins */}
        <div
          className="relative min-w-0 flex-1"
          style={{ height: n * rowH }}
          role="img"
          aria-label={caption ?? "Volume at each price"}
        >
          {ordered.map((r, i) => {
            const tone = TONE[r.s ?? "idle"];
            const muted = r.s === "muted";
            return (
              <div
                key={r.id}
                className="absolute inset-x-0 flex items-center gap-1.5"
                style={{ top: i * rowH, height: rowH }}
              >
                {mode === "letters" ? (
                  <span
                    className="truncate rounded-sm px-1 font-mono leading-none tracking-[0.12em]"
                    style={{
                      fontSize: Math.min(11, rowH - 2),
                      background: tone.fill,
                      color: tone.text,
                      textDecoration: muted ? "line-through" : undefined,
                    }}
                  >
                    {r.letters || " "}
                  </span>
                ) : (
                  <motion.span
                    className={
                      thin
                        ? "block h-full shrink-0"
                        : "block h-[calc(100%-2px)] shrink-0 rounded-[2px] border"
                    }
                    initial={false}
                    animate={{ width: `${Math.max(0, (r.v / maxV) * 82)}%` }}
                    transition={spring}
                    style={{
                      background: thin ? tone.border : tone.fill,
                      borderColor: tone.border,
                      borderStyle: muted ? "dashed" : "solid",
                      minWidth: r.v > 0 ? 2 : 0,
                    }}
                  />
                )}
                {r.tag && rowH >= 9 && (
                  <span
                    className="shrink-0 truncate font-mono leading-none text-ink-2"
                    style={{
                      fontSize: Math.min(10, rowH - 1),
                      textDecoration: muted ? "line-through" : undefined,
                    }}
                  >
                    {r.tag}
                  </span>
                )}
              </div>
            );
          })}

          {lines.map((l) => (
            <LadderRule
              key={l.label}
              y={((top - l.price) / step) * rowH}
              label={`${l.label} ${fmt(l.price)}`}
              s={l.s}
            />
          ))}
        </div>
      </div>

      {meter && <Meter {...meter} />}
      {caption && <p className="mt-2 text-xs text-ink-3">{caption}</p>}
    </div>
  );
}

function LadderRule({ y, label, s }: { y: number; label: string; s?: CellState }) {
  const color = s ? TONE[s].border : "var(--color-ink-2)";
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 flex items-center justify-end"
      initial={false}
      animate={{ top: y }}
      transition={spring}
      style={{ height: 0 }}
      aria-hidden
    >
      <span
        className="absolute inset-x-0 border-t border-dashed"
        style={{ borderColor: color }}
      />
      <span
        className="relative -translate-y-1/2 rounded px-1 py-px font-mono text-[9px] leading-none"
        style={{
          background: "var(--color-surface-1)",
          border: `1px solid ${color}`,
          color: "var(--color-ink)",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

function Meter({
  label,
  pct,
  target,
}: {
  label: string;
  pct: number;
  target?: number;
}) {
  const reached = target !== undefined && pct >= target;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-ink-3">{label}</span>
        <span className="tabular font-mono text-ink">
          {(pct * 100).toFixed(1)}%
          {target !== undefined && (
            <span className="text-ink-3">
              {" "}
              / {(target * 100).toFixed(0)}%{reached ? " reached" : ""}
            </span>
          )}
        </span>
      </div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={false}
          animate={{ width: `${Math.min(1, pct) * 100}%` }}
          transition={spring}
          style={{
            background: reached
              ? "var(--color-viz-match)"
              : "var(--color-viz-scan)",
          }}
        />
        {target !== undefined && (
          <span
            className="absolute inset-y-0 w-px"
            style={{ left: `${target * 100}%`, background: "var(--color-ink)" }}
          />
        )}
      </div>
    </div>
  );
}


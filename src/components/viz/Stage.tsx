import { memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Cell, CellState, Frame, Trace } from "../../engine/trace";
import { cn, spring, springSnap } from "../../lib/ui";
import { STATE_LABELS, TONE } from "./tones";
import { ChartPanel, LadderPanel } from "./ProfilePanels";

/* ------------------------------------------------------------------ *
 * The Stage renders whatever a Frame happens to contain. One component
 * covers arrays, bars, graphs, grids, matrices and interval charts,
 * which is what keeps the motion vocabulary identical everywhere.
 * ------------------------------------------------------------------ */

export { STATE_LABELS };

function CellBox({
  cell,
  bars,
  maxV,
  compact,
}: {
  cell: Cell;
  bars?: boolean;
  maxV?: number;
  compact?: boolean;
}) {
  const tone = TONE[cell.s ?? "idle"];
  const muted = cell.s === "muted";

  if (bars) {
    const v = typeof cell.v === "number" ? cell.v : 0;
    const h = maxV ? Math.max(4, (v / maxV) * 100) : 50;
    return (
      <motion.div
        layout
        transition={spring}
        className="flex h-full min-w-0 flex-1 flex-col gap-1"
      >
        {/* The bar is absolutely positioned inside a flex-1 track: a
            percentage height needs a containing block with a definite
            height, which an auto-height flex column does not provide. */}
        <div className="relative w-full flex-1">
          <motion.div
            initial={false}
            animate={{
              height: `${h}%`,
              backgroundColor: tone.fill,
              borderColor: tone.border,
            }}
            transition={spring}
            className="absolute inset-x-0 bottom-0 rounded-t-md border border-b-0"
          />
        </div>
        <span
          className="tabular text-center font-mono text-[10px] sm:text-xs"
          style={{ color: tone.text, opacity: muted ? 0.5 : 1 }}
        >
          {cell.v}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      transition={spring}
      className="flex shrink-0 flex-col items-center gap-1"
      style={{ opacity: cell.s === "ghost" ? 0.7 : 1 }}
    >
      <motion.div
        initial={{ scale: 0.86 }}
        animate={{
          backgroundColor: tone.fill,
          borderColor: tone.border,
          scale: 1,
        }}
        transition={springSnap}
        className={cn(
          "grid place-items-center rounded-lg border font-mono tabular",
          compact
            ? "h-8 min-w-8 px-1.5 text-xs"
            : "h-11 min-w-11 px-2 text-sm sm:h-12 sm:min-w-12",
          // A class, not an inline style: the browser expands the
          // `text-decoration` shorthand into longhands, which React's dev
          // build then flags as a shorthand/longhand conflict every render.
          muted && "text-ink-3 line-through decoration-current",
        )}
        style={{ color: muted ? undefined : tone.text }}
      >
        {cell.v}
      </motion.div>
      {cell.tag !== undefined && (
        <span className="font-mono text-[10px] text-ink-3">{cell.tag}</span>
      )}
    </motion.div>
  );
}

function PointerRail({
  pointers,
  count,
  side,
}: {
  pointers: NonNullable<Frame["pointers"]>;
  count: number;
  side: "top" | "bottom";
}) {
  const mine = pointers.filter(
    (p) => (p.side ?? "top") === side && p.i >= 0 && p.i < count,
  );
  return (
    <div className="relative h-6" aria-hidden>
      <AnimatePresence>
        {mine.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, y: side === "top" ? 6 : -6 }}
            animate={{
              opacity: 1,
              y: 0,
              left: `calc(${(p.i + 0.5) * (100 / count)}% )`,
            }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="absolute -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              background:
                "color-mix(in oklab, var(--color-viz-cursor) 22%, transparent)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-viz-cursor)",
            }}
          >
            {side === "bottom" && <span className="mr-0.5">↑</span>}
            {p.name}
            {side === "top" && <span className="ml-0.5">↓</span>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function CellRow({ frame, bars }: { frame: Frame; bars?: boolean }) {
  const cells = frame.cells ?? [];
  if (!cells.length) return null;
  const count = cells.length;
  const maxV = bars
    ? Math.max(...cells.map((c) => (typeof c.v === "number" ? c.v : 0)), 1)
    : undefined;

  return (
    <div className="w-full">
      {frame.pointers && (
        <PointerRail pointers={frame.pointers} count={count} side="top" />
      )}

      <div className="relative">
        {frame.window && (
          <motion.div
            layout
            animate={{
              left: `${(frame.window[0] / count) * 100}%`,
              width: `${((frame.window[1] - frame.window[0] + 1) / count) * 100}%`,
            }}
            transition={spring}
            className="pointer-events-none absolute -inset-y-1.5 rounded-xl border border-dashed"
            style={{
              borderColor: "var(--color-viz-cursor)",
              background:
                "color-mix(in oklab, var(--color-viz-cursor) 8%, transparent)",
            }}
            aria-hidden
          />
        )}
        <div
          className={cn(
            "relative flex w-full gap-1.5 sm:gap-2",
            bars
              ? "h-40 items-stretch sm:h-52"
              : "items-center justify-start overflow-x-auto no-scrollbar",
          )}
        >
          {cells.map((c) => (
            <CellBox key={c.id} cell={c} bars={bars} maxV={maxV} />
          ))}
        </div>
      </div>

      {frame.pointers && (
        <PointerRail pointers={frame.pointers} count={count} side="bottom" />
      )}
    </div>
  );
}

function AuxTracks({ frame }: { frame: Frame }) {
  if (!frame.aux?.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3">
      {frame.aux.map((track, i) => (
        <div key={`${track.title}-${i}`} className="min-w-0">
          <div className="mb-1.5 text-[11px] font-medium tracking-wide text-ink-3 uppercase">
            {track.title}
          </div>
          <div className="flex min-h-9 flex-wrap items-center gap-1.5">
            <AnimatePresence mode="popLayout">
              {track.cells.length === 0 ? (
                <motion.span
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-mono text-xs text-ink-3"
                >
                  {track.empty ?? "—"}
                </motion.span>
              ) : (
                track.cells.map((c) => <CellBox key={c.id} cell={c} compact />)
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

function GraphView({ frame }: { frame: Frame }) {
  if (!frame.nodes?.length) return null;
  const nodes = frame.nodes;
  const edges = frame.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const PAD = 8;
  const px = (x: number) => PAD + x * (100 - 2 * PAD);
  const py = (y: number) => 14 + y * 72;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="h-56 w-full sm:h-72"
        role="img"
        aria-label="algorithm state graph"
      >
        <defs>
          <marker
            id="arw"
            markerWidth="6"
            markerHeight="6"
            refX="5.4"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="var(--color-ink-3)" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const x1 = px(a.x);
          const y1 = py(a.y);
          const x2 = px(b.x);
          const y2 = py(b.y);
          // Shorten so the arrowhead does not sit under the node circle.
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const r = 4.4;
          const sx = x1 + (dx / len) * r;
          const sy = y1 + (dy / len) * r;
          const ex = x2 - (dx / len) * r;
          const ey = y2 - (dy / len) * r;
          const stroke =
            e.s === "cursor"
              ? "var(--color-viz-cursor)"
              : e.s === "match"
                ? "var(--color-viz-match)"
                : e.s === "muted"
                  ? "var(--color-line)"
                  : "var(--color-line-strong)";
          return (
            <g key={`${e.from}-${e.to}-${i}`}>
              <motion.line
                initial={false}
                animate={{ x1: sx, y1: sy, x2: ex, y2: ey, stroke }}
                transition={spring}
                strokeWidth={e.s === "cursor" ? 1 : 0.5}
                markerEnd={e.directed ? "url(#arw)" : undefined}
              />
              {e.w !== undefined && (
                <text
                  x={(sx + ex) / 2}
                  y={(sy + ey) / 2 - 1.2}
                  textAnchor="middle"
                  className="font-mono"
                  style={{ fontSize: 3, fill: "var(--color-ink-3)" }}
                >
                  {e.w}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((n) => {
          const tone = TONE[n.s ?? "idle"];
          return (
            <motion.g
              key={n.id}
              initial={false}
              animate={{ x: px(n.x), y: py(n.y) }}
              transition={spring}
            >
              <motion.circle
                r={4.4}
                animate={{ fill: tone.fill, stroke: tone.border }}
                transition={spring}
                strokeWidth={0.7}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono"
                style={{ fontSize: 3.2, fill: tone.text }}
              >
                {n.label}
              </text>
              {n.badge && (
                <text
                  textAnchor="middle"
                  y={8.4}
                  className="font-mono"
                  style={{ fontSize: 2.6, fill: "var(--color-ink-3)" }}
                >
                  {n.badge}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

function GridView({ frame }: { frame: Frame }) {
  if (!frame.grid) return null;
  const { cells, labels, caption } = frame.grid;
  const cols = cells[0]?.length ?? 1;
  return (
    <div>
      <div
        className="mx-auto grid w-full max-w-lg gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((row, y) =>
          row.map((s, x) => {
            const tone = TONE[s];
            return (
              <motion.div
                key={`${y}-${x}`}
                initial={false}
                animate={{
                  backgroundColor: tone.fill,
                  borderColor: tone.border,
                }}
                transition={{
                  ...spring,
                  delay: Math.min(0.12, (x + y) * 0.004),
                }}
                className="grid aspect-square place-items-center rounded-[4px] border font-mono text-[9px] sm:text-[11px]"
                style={{ color: tone.text }}
              >
                {labels?.[y]?.[x] ?? ""}
              </motion.div>
            );
          }),
        )}
      </div>
      {caption && (
        <p className="mt-2 text-center text-xs text-ink-3">{caption}</p>
      )}
    </div>
  );
}

function MatrixView({ frame }: { frame: Frame }) {
  if (!frame.matrix) return null;
  const { rows, cols, cells, focus, path, reads, caption } = frame.matrix;
  const pathSet = new Set((path ?? []).map(([i, j]) => `${i},${j}`));
  const readSet = new Set((reads ?? []).map(([i, j]) => `${i},${j}`));

  return (
    <div className="w-full">
      <div className="overflow-x-auto no-scrollbar">
        <table className="border-separate" style={{ borderSpacing: "3px" }}>
          <thead>
            <tr>
              <th className="w-8" />
              {cols.map((c, j) => (
                <th
                  key={j}
                  className="px-1 font-mono text-[11px] font-normal text-ink-3"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, i) => (
              <tr key={i}>
                <th className="pr-1 text-right font-mono text-[11px] font-normal whitespace-nowrap text-ink-3">
                  {rows[i]}
                </th>
                {row.map((v, j) => {
                  const isFocus = focus?.[0] === i && focus?.[1] === j;
                  const isPath = pathSet.has(`${i},${j}`);
                  const isRead = readSet.has(`${i},${j}`);
                  const s: CellState = isFocus
                    ? "cursor"
                    : isPath
                      ? "match"
                      : isRead
                        ? "scan"
                        : v === null
                          ? "ghost"
                          : "idle";
                  const tone = TONE[s];
                  return (
                    <td key={j}>
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: tone.fill,
                          borderColor: tone.border,
                          scale: isFocus ? 1.06 : 1,
                        }}
                        transition={springSnap}
                        className="grid h-8 w-8 place-items-center rounded-md border font-mono text-xs sm:h-9 sm:w-9"
                        style={{ color: tone.text }}
                      >
                        {v === null ? "" : v}
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <p className="mt-2 font-mono text-xs text-ink-3">{caption}</p>
      )}
    </div>
  );
}

function IntervalView({ frame }: { frame: Frame }) {
  if (!frame.intervals) return null;
  const { domain, rows, sweep, caption } = frame.intervals;
  const span = domain[1] - domain[0] || 1;
  const lanes = Math.max(...rows.map((r) => r.lane ?? 0)) + 1;

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height: lanes * 26 + 8 }}>
        {sweep !== null && sweep !== undefined && (
          <motion.div
            initial={false}
            animate={{ left: `${((sweep - domain[0]) / span) * 100}%` }}
            transition={spring}
            className="absolute inset-y-0 w-px"
            style={{ background: "var(--color-viz-cursor)" }}
            aria-hidden
          />
        )}
        {rows.map((row) => {
          const tone = TONE[row.s ?? "idle"];
          return (
            <motion.div
              key={row.id}
              layout
              initial={{ opacity: 0, scaleX: 0.7 }}
              animate={{
                opacity: row.s === "ghost" ? 0.4 : 1,
                scaleX: 1,
                left: `${((row.lo - domain[0]) / span) * 100}%`,
                width: `${((row.hi - row.lo) / span) * 100}%`,
                top: (row.lane ?? 0) * 26,
                backgroundColor: tone.fill,
                borderColor: tone.border,
              }}
              transition={spring}
              className="absolute grid h-[22px] origin-left place-items-center rounded-md border font-mono text-[10px] whitespace-nowrap"
              style={{ color: tone.text }}
            >
              {row.label}
            </motion.div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-3">
        <span>{domain[0]}</span>
        <span>{domain[1]}</span>
      </div>
      {caption && <p className="mt-1 text-xs text-ink-3">{caption}</p>}
    </div>
  );
}

function StatsRow({ frame }: { frame: Frame }) {
  if (!frame.stats?.length) return null;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {frame.stats.map((s) => (
        <div key={s.label} className="min-w-0">
          <div className="text-[10px] tracking-wide text-ink-3 uppercase">
            {s.label}
          </div>
          <motion.div
            key={String(s.value)}
            initial={{ y: -5 }}
            animate={{ y: 0 }}
            transition={springSnap}
            className="tabular font-mono text-sm text-ink"
          >
            {s.value}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

export const Stage = memo(function Stage({
  frame,
  trace,
}: {
  frame: Frame;
  trace: Trace;
}) {
  const bars = trace.display === "bars";
  return (
    <div className="flex flex-col gap-5">
      <GraphView frame={frame} />
      <GridView frame={frame} />
      <MatrixView frame={frame} />
      <IntervalView frame={frame} />
      {frame.chart && <ChartPanel view={frame.chart} />}
      {frame.ladder && <LadderPanel view={frame.ladder} />}
      <CellRow frame={frame} bars={bars} />
      <AuxTracks frame={frame} />
      <StatsRow frame={frame} />
    </div>
  );
});

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CellState, ChartView, LadderView } from "../../engine/trace";
import { spring } from "../../lib/ui";
import { TONE } from "./tones";

/* ------------------------------------------------------------------ *
 * The two price-by-volume panels the Stage can draw.
 *
 *  LadderPanel — DOM rows, one per price bin, each with a state and a
 *                number. For algorithm steps.
 *  ChartPanel  — Emberwick candles with session profiles under them.
 *                For context: the same volume, against how the day traded.
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

/* ---- Emberwick ---------------------------------------------------- */

type Ember = typeof import("emberwick");
type EmberProfiles = typeof import("emberwick/profiles");
type Chart = import("emberwick").Chart;
type VolumeProfile = import("emberwick/profiles").VolumeProfile;

/**
 * Emberwick is imported on first use, so the DSA subject — which never draws
 * a candle — does not carry it in its bundle.
 */
let loading: Promise<[Ember, EmberProfiles]> | null = null;
function loadEmberwick() {
  loading ??= Promise.all([import("emberwick"), import("emberwick/profiles")]);
  return loading;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * The chart theme, read from the site's tokens so it follows light/dark.
 *
 * Candles are deliberately NEUTRAL: hollow for up, filled for down, one ink
 * colour. Green/red candles would add two hues on top of the three validated
 * state hues (CLAUDE.md rule 6), and direction is already carried by fill.
 */
function themeFromTokens() {
  const ink = cssVar("--color-ink");
  const ink2 = cssVar("--color-ink-2");
  const ink3 = cssVar("--color-ink-3");
  const surface = cssVar("--color-surface-1");
  const line = cssVar("--color-line");
  return {
    background: surface,
    grid: rgba(line, 0.55),
    axisLine: line,
    text: ink3,
    textStrong: ink,
    up: ink2,
    down: ink2,
    upFill: surface,
    downFill: ink2,
    wickUp: ink2,
    wickDown: ink2,
    volumeUp: rgba(ink3, 0.35),
    volumeDown: rgba(ink3, 0.35),
    crosshair: ink3,
    labelBg: cssVar("--color-surface-3"),
    labelText: ink,
    tagText: ink,
    profileFill: rgba(ink3, 0.22),
    profileValueArea: rgba(cssVar("--color-viz-match"), 0.32),
    profilePoc: cssVar("--color-viz-cursor"),
    profileVaLine: ink2,
  };
}

const toneColor = (s?: CellState) =>
  s === "cursor"
    ? cssVar("--color-viz-cursor")
    : s === "scan"
      ? cssVar("--color-viz-scan")
      : s === "match"
        ? cssVar("--color-viz-match")
        : cssVar("--color-ink-2");

export function ChartPanel({ view }: { view: ChartView }) {
  const host = useRef<HTMLDivElement>(null);
  const inst = useRef<{ chart: Chart; profile: VolumeProfile } | null>(null);
  const shown = useRef<{ key: string | null }>({ key: null });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Create once. The chart is driven imperatively from here on.
  useEffect(() => {
    let dead = false;
    loadEmberwick()
      .then(([ew, ep]) => {
        if (dead || !host.current) return;
        const chart = ew.createChart(host.current, {
          watermark: false,
          timeZone: "Asia/Kolkata",
          volumeRatio: 0,
          animate: true,
          theme: themeFromTokens(),
          priceScale: { marginTop: 0.08, marginBottom: 0.08 },
        });
        const profile = ep.createVolumeProfile(chart, {
          data: null,
          mode: "session",
          width: 0.45,
          hideFutureInReplay: false,
        });
        inst.current = { chart, profile };
        // Debug handle for DOM-level verification in dev builds only.
        if (import.meta.env.DEV)
          ((window as unknown as { __ember?: Chart[] }).__ember ??= []).push(chart);
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      dead = true;
      inst.current?.profile.destroy();
      inst.current?.chart.destroy();
      inst.current = null;
    };
  }, []);

  // Re-fit when the container changes width (rotation, sidebar, resize).
  useEffect(() => {
    if (!ready || !host.current) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(host.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, view]);

  // Follow the site theme.
  useEffect(() => {
    if (!ready) return;
    const obs = new MutationObserver(() => {
      inst.current?.chart.setTheme(themeFromTokens());
      apply();
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /**
   * Fit the whole dataset, always: these charts illustrate one or a few
   * sessions, never a scrolling history. Repeated on the next frame because
   * the time scale eases, and a fit issued mid-ease can be overridden.
   */
  function fit() {
    const c = inst.current;
    if (!c) return;
    c.chart.fitContent();
    requestAnimationFrame(() => inst.current?.chart.fitContent());
  }

  function apply() {
    const c = inst.current;
    if (!c) return;
    const { chart, profile } = c;
    const bars = view.bars;

    // "The day so far": bars after the reveal point keep their time slot but
    // carry no price, which Emberwick skips. The time axis therefore spans
    // the whole session from the first frame, and only the past is drawn.
    // (Emberwick's replay mode would hand the chart only the prefix, and the
    // axis would rescale on every step.)
    const reveal = view.reveal ?? bars.length;
    const sig = `${view.key}:${reveal}`;
    if (shown.current.key !== sig) {
      chart.setData(
        reveal >= bars.length
          ? bars
          : bars.map((b, i) =>
              i < reveal
                ? b
                : { time: b.time, open: NaN, high: NaN, low: NaN, close: NaN, volume: 0 },
            ),
      );
      shown.current.key = sig;
      fit();
    }

    profile.setOptions({
      mode: view.profile?.mode ?? "session",
      extendPoc: view.profile?.extendPoc ?? false,
    });
    profile.setData(
      view.profile
        ? {
            version: 1,
            step: view.profile.step,
            source: view.profile.source,
            sessions: view.profile.sessions,
          }
        : null,
    );

    chart.setPriceLines(
      (view.lines ?? []).map((l) => ({
        price: l.price,
        title: l.title,
        color: toneColor(l.s),
        lineStyle: l.style ?? "dashed",
      })),
    );
    chart.setZones([
      ...(view.zones ?? []).map((z) => ({
        from: z.from,
        to: z.to,
        label: z.label,
        color: rgba(cssVar("--color-ink-3"), 0.08),
        border: rgba(cssVar("--color-ink-3"), 0.4),
      })),
      ...(view.timeZones ?? []).map((z) => ({
        fromTime: z.fromTime,
        toTime: z.toTime,
        label: z.label,
        color: rgba(cssVar("--color-viz-cursor"), 0.06),
        border: rgba(cssVar("--color-viz-cursor"), 0.35),
      })),
    ]);
    chart.clearSeries();
    for (const sr of view.series ?? []) {
      chart.setSeries(sr.id, {
        data: sr.data.map((d) => ({
          time: d.time,
          value: d.value ?? undefined,
        })),
        color: toneColor(sr.s),
        lineStyle: sr.style ?? "solid",
        lineWidth: sr.style ? 1 : 1.5,
      });
    }
    chart.setMarkers(
      (view.markers ?? []).map((m) => ({
        time: m.time,
        text: m.text,
        shape: m.up === undefined ? "label" : m.up ? "arrowUp" : "arrowDown",
        color: cssVar("--color-ink-2"),
      })),
    );
  }

  useEffect(() => {
    if (ready) apply();
    // apply reads `view`; re-run whenever the frame's view changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, view]);

  return (
    <div className="w-full min-w-0">
      {/* A finger dragging on the canvas pans the chart (Emberwick sets
          touch-action: none), so the chart is kept short enough on a phone
          that the page above and below it is always reachable. */}
      <div
        ref={host}
        className="h-56 w-full min-w-0 overflow-hidden rounded-lg sm:h-72"
        data-emberwick
      />
      {failed && (
        <p className="mt-2 text-xs text-ink-3">
          The chart could not load. The numbers below still tell the story.
        </p>
      )}
      {view.caption && (
        <p className="mt-2 text-xs text-ink-3">{view.caption}</p>
      )}
    </div>
  );
}

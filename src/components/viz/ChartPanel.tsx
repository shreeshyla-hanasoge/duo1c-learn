import { useEffect, useRef, useState } from "react";
import type {
  CellState,
  ChartProfileSession,
  ChartView,
} from "../../engine/trace";
import type { Bar } from "../../engine/trading/profile";

/* ------------------------------------------------------------------ *
 * Emberwick candles with session profiles under them.
 *
 * Two things this panel is careful about.
 *
 * MOTION. A frame that reveals more of the day does not replace the
 * dataset — that re-primes the price axis and makes the content jump.
 * Instead the new bars are STREAMED in: each one is built from a few
 * ticks through `chart.update()`, so Emberwick's own live-candle easing
 * grows it, the price axis glides to fit, and the developing profile grows
 * in step. The time axis is held on the whole session from the first
 * frame by moving Emberwick's `rightOffset` one slot per appended bar, so
 * the right edge never moves while the day fills in. Scrubbing backwards
 * or jumping far is a jump, deliberately — easing a scrub reads as lag.
 *
 * COLOUR. Validated with the dataviz palette validator against the chart
 * surface in both themes (see the note on `themeFromTokens`). Only the
 * site's validated state hues appear: the profile is ONE hue (match) in two
 * steps — stronger inside the value area, lighter outside, an ordinal
 * ramp — and the POC is the cursor hue. Candles carry no state, so they are
 * neutral: bright for up, dim for down.
 * ------------------------------------------------------------------ */

type Ember = typeof import("emberwick");
type EmberProfiles = typeof import("emberwick/profiles");
type Chart = import("emberwick").Chart;
type VolumeProfile = import("emberwick/profiles").VolumeProfile;

/**
 * The parts of Emberwick's time scale this panel steers. `rightOffset` is a
 * plain constructor option that the scale re-reads on every append; it is
 * not in the published typings, so the package is pinned to an exact
 * version in package.json.
 */
type TimeScaleInternals = { rightOffset: number; width: number };

/** Lazy, so the DSA subject — which never draws a candle — never loads it. */
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

const isLight = () => document.documentElement.dataset.theme === "light";

/**
 * The chart theme, from the site's tokens.
 *
 * Validated with the dataviz validator, blended over the chart surface:
 *   dark  value area match@0.80 → #17825e: lightness, chroma and 3:1
 *         contrast all PASS (the old @0.32 → #15684d read as grey: chroma
 *         FAIL, contrast 2.81 — which is why it looked muddy).
 *   light value area match@0.85 → #3dbb8e: PASS except contrast (2.4:1),
 *         a WARN the site's validated green carries on white at any
 *         strength; it is relieved by the VAH/VAL tags, which are always
 *         drawn as text.
 * CVD/normal separation from the cursor-blue POC ≥ 23 ΔE in both themes.
 */
function themeFromTokens() {
  const light = isLight();
  const ink = cssVar("--color-ink");
  const ink2 = cssVar("--color-ink-2");
  const ink3 = cssVar("--color-ink-3");
  const surface = cssVar("--color-surface-1");
  const match = cssVar("--color-viz-match");
  const up = light ? "#1b2027" : "#e6ebf1";
  const down = light ? "#8a919c" : "#7d8796";
  return {
    background: surface,
    grid: rgba(ink3, light ? 0.1 : 0.09),
    axisLine: rgba(ink3, 0.25),
    text: ink3,
    textStrong: ink,
    up,
    down,
    upFill: up,
    downFill: down,
    wickUp: up,
    wickDown: down,
    volumeUp: rgba(ink3, 0.3),
    volumeDown: rgba(ink3, 0.3),
    crosshair: rgba(ink3, 0.6),
    labelBg: cssVar("--color-surface-3"),
    labelText: ink,
    // Tags take their line's colour as a background: dark text on the
    // bright dark-theme lines, white on the deeper light-theme ones.
    tagText: light ? "#ffffff" : "#0b0d10",
    profileFill: rgba(match, light ? 0.22 : 0.26),
    profileValueArea: rgba(match, light ? 0.85 : 0.8),
    profilePoc: cssVar("--color-viz-cursor"),
    profileVaLine: light ? ink2 : match,
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

/* ---- Streaming helpers ------------------------------------------- */

/**
 * A bar as four ticks: open, the first extreme, the second, close. The order
 * of the extremes follows the bar's direction, which is how a one-minute
 * chart is usually read. Each tick is the bar SO FAR.
 */
function ticksOf(b: Bar): Bar[] {
  const path =
    b.close >= b.open
      ? [b.open, b.low, b.high, b.close]
      : [b.open, b.high, b.low, b.close];
  let hi = b.open;
  let lo = b.open;
  return path.map((p, i) => {
    hi = Math.max(hi, p);
    lo = Math.min(lo, p);
    return {
      time: b.time,
      open: b.open,
      high: hi,
      low: lo,
      close: p,
      volume: (b.volume * (i + 1)) / path.length,
    };
  });
}

/** Sessions part-way from `a` to `b`: bins interpolated on a shared grid. */
function lerpSessions(
  a: ChartProfileSession[],
  b: ChartProfileSession[],
  step: number,
  f: number,
  end: number,
): ChartProfileSession[] {
  return b.map((s) => {
    const from = a.find((x) => x.start === s.start);
    if (!from) return f >= 1 ? s : { ...s, bins: s.bins.map((v) => v * f), end };
    const k0 = Math.round(Math.min(from.lo, s.lo) / step);
    const k1 =
      Math.round(Math.max(from.lo + from.bins.length * step, s.lo + s.bins.length * step) / step);
    const at = (x: ChartProfileSession, k: number) =>
      x.bins[k - Math.round(x.lo / step)] ?? 0;
    const bins: number[] = [];
    for (let k = k0; k < k1; k++) bins.push(at(from, k) + (at(s, k) - at(from, k)) * f);
    return { ...s, lo: k0 * step, bins, end: f >= 1 ? s.end : end };
  });
}

/* ---- The panel --------------------------------------------------- */

export function ChartPanel({ view }: { view: ChartView }) {
  const host = useRef<HTMLDivElement>(null);
  const inst = useRef<{ chart: Chart; profile: VolumeProfile } | null>(null);
  const state = useRef({
    key: null as string | null,
    shown: 0,
    timer: 0 as number | ReturnType<typeof setTimeout>,
    sessions: [] as ChartProfileSession[],
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Create once; the chart is driven imperatively from here on.
  useEffect(() => {
    let dead = false;
    const st = state.current;
    loadEmberwick()
      .then(([ew, ep]) => {
        if (dead || !host.current) return;
        const chart = ew.createChart(host.current, {
          watermark: false,
          timeZone: "Asia/Kolkata",
          volumeRatio: 0,
          animate: true,
          magnet: true,
          theme: themeFromTokens(),
          priceScale: { marginTop: 0.1, marginBottom: 0.1 },
        });
        const profile = ep.createVolumeProfile(chart, {
          data: null,
          mode: "session",
          width: 0.32,
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
      clearTimeout(st.timer);
      inst.current?.profile.destroy();
      inst.current?.chart.destroy();
      inst.current = null;
      st.key = null;
    };
  }, []);

  const ts = () =>
    (inst.current!.chart as unknown as { ts: TimeScaleInternals }).ts;

  function setProfile(sessions: ChartProfileSession[]) {
    const c = inst.current;
    if (!c) return;
    state.current.sessions = sessions;
    c.profile.setData(
      view.profile && sessions.length
        ? { version: 1, step: view.profile.step, source: view.profile.source, sessions }
        : null,
    );
  }

  /**
   * Show the first `k` bars inside a view fitted to ALL of them: fit the
   * whole set, then hand the chart the prefix with `rightOffset` holding
   * the empty slots. No easing — this is the jump path.
   */
  function jumpTo(k: number) {
    const c = inst.current;
    if (!c) return;
    const all = view.bars;
    const n = all.length;
    c.chart.setData(all);
    c.chart.fitContent();
    ts().rightOffset = n - k;
    if (k < n) c.chart.setData(all.slice(0, Math.max(1, k)));
    state.current.shown = k;
    setProfile(view.profile?.sessions ?? []);
  }

  /** Stream bars [shown, k) in, tick by tick, profile growing alongside. */
  function streamTo(k: number) {
    const c = inst.current;
    if (!c) return;
    const st = state.current;
    const all = view.bars;
    const queue = all.slice(st.shown, k);
    const fromSessions = st.sessions;
    const toSessions = view.profile?.sessions ?? [];
    const step = view.profile?.step ?? 1;
    // The whole stream fits inside one frame at 1× (1,100 ms) with room to
    // spare; at higher speeds the next frame simply continues the stream.
    const perBar = Math.max(12, Math.min(150, 800 / queue.length));
    const perTick = perBar / 4;
    let i = 0;
    let t = 0;
    let tickList = queue.length ? ticksOf(queue[0]) : [];
    const tick = () => {
      if (!inst.current) return;
      if (t === 0) ts().rightOffset = Math.max(0, ts().rightOffset - 1);
      c.chart.update(tickList[t]);
      t++;
      if (t === tickList.length) {
        st.shown++;
        i++;
        t = 0;
        const f = i / queue.length;
        setProfile(lerpSessions(fromSessions, toSessions, step, f, queue[i - 1].time));
        if (i === queue.length) {
          setProfile(toSessions);
          return;
        }
        tickList = ticksOf(queue[i]);
      }
      st.timer = setTimeout(tick, perTick);
    };
    clearTimeout(st.timer);
    if (queue.length) tick();
  }

  function apply() {
    const c = inst.current;
    if (!c) return;
    const { chart, profile } = c;
    const st = state.current;
    const n = view.bars.length;
    const k = Math.max(1, Math.min(n, view.reveal ?? n));

    profile.setOptions({
      mode: view.profile?.mode ?? "session",
      extendPoc: view.profile?.extendPoc ?? false,
    });

    if (st.key !== view.key) {
      clearTimeout(st.timer);
      st.key = view.key;
      jumpTo(k);
    } else if (k > st.shown && k - st.shown <= 80) {
      // Forward by a frame's worth (or a stream still in flight): flow.
      streamTo(k);
    } else if (k !== st.shown) {
      clearTimeout(st.timer);
      jumpTo(k);
    } else {
      setProfile(view.profile?.sessions ?? []);
    }

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
        color: rgba(cssVar("--color-viz-cursor"), 0.07),
        border: rgba(cssVar("--color-viz-cursor"), 0.4),
      })),
    ]);
    chart.clearSeries();
    for (const sr of view.series ?? []) {
      chart.setSeries(sr.id, {
        data: sr.data.map((d) => ({ time: d.time, value: d.value ?? undefined })),
        color: toneColor(sr.s),
        lineStyle: sr.style ?? "solid",
        lineWidth: sr.style ? 1 : 2,
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

  // Re-fit when the container's width changes (rotation, sidebar, resize).
  // Only on a real width change: the stream itself must never trigger one.
  useEffect(() => {
    if (!ready || !host.current) return;
    let w = host.current.getBoundingClientRect().width;
    const ro = new ResizeObserver(([e]) => {
      const nw = e.contentRect.width;
      if (Math.abs(nw - w) < 1) return;
      w = nw;
      clearTimeout(state.current.timer);
      jumpTo(Math.max(1, Math.min(view.bars.length, view.reveal ?? view.bars.length)));
    });
    ro.observe(host.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, view]);

  return (
    <div className="w-full min-w-0">
      {/* A finger dragging on the canvas pans the chart (Emberwick sets
          touch-action: none), so the chart is kept short enough on a phone
          that the page above and below it is always reachable. */}
      <div
        ref={host}
        className="h-56 w-full min-w-0 overflow-hidden rounded-xl sm:h-80"
        data-emberwick
      />
      {failed && (
        <p className="mt-2 text-xs text-ink-3">
          The chart could not load. The numbers below still tell the story.
        </p>
      )}
      {view.caption && <p className="mt-2 text-xs text-ink-3">{view.caption}</p>}
    </div>
  );
}

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { FlowSpec, Health, Move, Tone } from "./types";
import { GAP, SIDE, factSize, sizes } from "./layout";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

/** The site's dark theme (`src/index.css`), so a film looks like the page around it. */
const C = {
  bg: "#08090b",
  surface: "#0f1114",
  surface2: "#161a1f",
  line: "#262c34",
  lineStrong: "#333b45",
  ink: "#f3f5f8",
  ink2: "#a3acb9",
  ink3: "#6c7683",
  idle: "#39414b",
};

/** Three state hues plus a critical one — the same validated set the site uses. */
const TONE: Record<Tone, string> = {
  request: "#3987e5",
  reply: "#d95926",
  commit: "#199e70",
  fault: "#e66767",
};

export const FILM = { width: 1920, height: 1080, fps: 30 };

const CARD_TOP = 430;
const CARD_H = 250;
const LANE_Y = 350;
/** The second message travels on a lane this far above the first. */
const LANE_STEP = 76;

/* ---- Timing inside one step, in seconds -------------------------------- */
const LEAVE = 0.5;
const ARRIVE = 1.7;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

export function filmFrames(spec: FlowSpec): number {
  const seconds =
    spec.steps.reduce((s, x) => s + x.seconds, 0) + spec.takeaway.seconds;
  return Math.round(seconds * FILM.fps);
}

export const FlowFilm: React.FC<{ spec: FlowSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const n = spec.nodes.length;
  const sz = sizes(n);
  const cardW = (width - 2 * SIDE - (n - 1) * GAP) / n;
  const cx = (i: number) => SIDE + i * (cardW + GAP) + cardW / 2;
  const indexOf = (id: string) => spec.nodes.findIndex((x) => x.id === id);

  // Where each step starts, and when its change lands (on arrival if a
  // message travels, almost at once if nothing does).
  const starts: number[] = [];
  let at = 0;
  for (const s of spec.steps) {
    starts.push(at);
    at += s.seconds * fps;
  }
  const stepsEnd = at;
  const lands = spec.steps.map(
    (s, i) => starts[i] + (s.move ? ARRIVE : 0.3) * fps,
  );

  let cur = 0;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]) cur = i;
  const step = spec.steps[cur];
  const local = frame - starts[cur];
  const inOutro = frame >= stepsEnd;
  const outroLocal = frame - stepsEnd;

  // The latest fact and health each node holds, and the frame it changed on.
  const facts: Record<string, { text: string; since: number; tone: Tone }> = {};
  const health: Record<string, Health> = {};
  let stateIdx = -1;
  spec.steps.forEach((s, i) => {
    if (frame < lands[i]) return;
    for (const [id, text] of Object.entries(s.facts ?? {}))
      facts[id] = { text, since: lands[i], tone: s.move?.tone ?? "request" };
    for (const [id, h] of Object.entries(s.health ?? {})) {
      health[id] = h;
      // A node whose health changes glows even if its fact did not.
      const tone: Tone = h === "ok" ? "commit" : h === "slow" ? "reply" : "fault";
      facts[id] = { text: facts[id]?.text ?? "", since: lands[i], tone };
    }
    if (s.state && spec.states) stateIdx = spec.states.indexOf(s.state);
  });

  const stage = interpolate(outroLocal, [0, 0.6 * fps], [1, 0], clamp);

  const packet = (m: Move, lane: number) => {
    const from = cx(indexOf(m.from));
    const to = cx(indexOf(m.to));
    const colour = TONE[m.tone];
    return (
      <div
        key={lane}
        style={{
          position: "absolute",
          left: interpolate(local, [LEAVE * fps, ARRIVE * fps], [from, to], {
            ...clamp,
            easing: Easing.bezier(0.45, 0, 0.15, 1),
          }),
          top: LANE_Y - lane * LANE_STEP,
          translate: "-50% 0",
          height: 62,
          padding: "0 28px",
          borderRadius: 31,
          backgroundColor: colour,
          color: "#ffffff",
          fontSize: 32,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          boxShadow: `0 0 40px ${colour}66`,
          opacity: interpolate(
            local,
            [0.2 * fps, LEAVE * fps, ARRIVE * fps, (ARRIVE + 0.9) * fps],
            [0, 1, 1, 0],
            clamp,
          ),
        }}
      >
        {to > from ? `${m.label}  →` : `←  ${m.label}`}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily, color: C.ink }}>
      {/* ---- Header ---- */}
      <div style={{ position: "absolute", left: SIDE, top: 64, opacity: stage }}>
        <div
          style={{
            fontSize: 30,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: C.ink3,
            fontWeight: 500,
          }}
        >
          {spec.kicker}
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 10, letterSpacing: -1.5 }}>
          {spec.title}
        </div>
      </div>

      {/* ---- Step counter ---- */}
      <div
        style={{
          position: "absolute",
          right: SIDE,
          top: 84,
          display: "flex",
          gap: 10,
          opacity: stage,
        }}
      >
        {spec.steps.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === cur && !inOutro ? 44 : 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: i <= cur ? C.ink2 : C.idle,
            }}
          />
        ))}
      </div>

      {/* ---- The lane the message travels along ---- */}
      <div
        style={{
          position: "absolute",
          left: cx(0),
          width: cx(n - 1) - cx(0),
          top: LANE_Y + 30,
          height: 2,
          backgroundColor: C.line,
          opacity: stage,
        }}
      />
      {spec.nodes.map((node, i) => (
        <div
          key={node.id}
          style={{
            position: "absolute",
            left: cx(i) - 7,
            top: LANE_Y + 24,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: C.lineStrong,
            opacity: stage,
          }}
        />
      ))}

      {/* ---- Nodes ---- */}
      {spec.nodes.map((node, i) => {
        const fact = facts[node.id];
        const h = health[node.id] ?? "ok";
        const glow = fact
          ? interpolate(frame - fact.since, [0, 0.25 * fps, 1.6 * fps], [0, 1, 0], clamp)
          : 0;
        const tone = fact ? TONE[fact.tone] : C.line;
        const resting = h === "down" ? TONE.fault : h === "slow" ? TONE.reply : C.line;
        return (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: cx(i) - cardW / 2,
              top: CARD_TOP,
              width: cardW,
              height: CARD_H,
              boxSizing: "border-box",
              borderRadius: 22,
              backgroundColor: C.surface,
              border: `3px solid ${glow > 0.02 ? tone : resting}`,
              boxShadow: `0 0 ${60 * glow}px ${tone}${Math.round(glow * 110)
                .toString(16)
                .padStart(2, "0")}`,
              padding: `24px ${sz.pad}px`,
              // No entrance: frame 0 is the poster a paused player shows.
              opacity: stage,
            }}
          >
            {h !== "ok" ? (
              <div
                style={{
                  position: "absolute",
                  right: 16,
                  top: -20,
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 2,
                  padding: "6px 14px",
                  borderRadius: 10,
                  color: "#ffffff",
                  backgroundColor: h === "down" ? TONE.fault : TONE.reply,
                }}
              >
                {h === "down" ? "DOWN" : "SLOW"}
              </div>
            ) : null}
            <div
              style={{
                fontSize: sz.role,
                color: C.ink3,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {node.role}
            </div>
            <div
              style={{
                fontSize: sz.label,
                fontWeight: 600,
                marginTop: 4,
                letterSpacing: -0.5,
                whiteSpace: "nowrap",
                color: h === "down" ? C.ink3 : C.ink,
              }}
            >
              {node.label}
            </div>
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: `2px solid ${C.line}`,
                fontSize: fact?.text ? factSize(fact.text, n) : sz.fact,
                lineHeight: 1.2,
                fontWeight: 500,
                color: fact?.text ? C.ink : C.ink3,
                opacity: fact?.text
                  ? interpolate(frame - fact.since, [0, 0.3 * fps], [0.4, 1], clamp)
                  : 0.5,
              }}
            >
              {fact?.text || "—"}
            </div>
          </div>
        );
      })}

      {/* ---- The messages ---- */}
      {!inOutro && step.move ? packet(step.move, 0) : null}
      {!inOutro && step.alsoMove ? packet(step.alsoMove, 1) : null}

      {/* ---- Lifecycle states ---- */}
      {spec.states ? (
        <div
          style={{
            position: "absolute",
            left: SIDE,
            top: 738,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: stage,
          }}
        >
          <div
            style={{
              fontSize: 26,
              color: C.ink3,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginRight: 10,
              fontWeight: 500,
            }}
          >
            {spec.statesLabel ?? "State"}
          </div>
          {spec.states.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 ? (
                <div
                  style={{
                    width: 36,
                    height: 2,
                    backgroundColor: i <= stateIdx ? C.ink2 : C.idle,
                  }}
                />
              ) : null}
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  padding: "12px 26px",
                  borderRadius: 14,
                  border: `2px solid ${i === stateIdx ? TONE.commit : i < stateIdx ? C.lineStrong : C.line}`,
                  backgroundColor: i === stateIdx ? `${TONE.commit}33` : "transparent",
                  color: i === stateIdx ? C.ink : i < stateIdx ? C.ink2 : C.ink3,
                }}
              >
                {s}
              </div>
            </React.Fragment>
          ))}
        </div>
      ) : null}

      {/* ---- Caption ---- */}
      {!inOutro ? (
        <div
          style={{
            position: "absolute",
            left: SIDE,
            right: SIDE,
            // Without a state row the caption moves up into its space.
            top: spec.states ? 858 : 780,
            fontSize: 60,
            lineHeight: 1.22,
            fontWeight: 500,
            letterSpacing: -0.6,
            opacity: interpolate(local, [0, 0.35 * fps], [0, 1], clamp),
            translate: interpolate(local, [0, 0.45 * fps], ["0px 18px", "0px 0px"], {
              ...clamp,
              easing: ease,
            }),
          }}
        >
          {step.caption}
        </div>
      ) : null}

      {/* ---- Takeaway ---- */}
      {inOutro ? (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            padding: `0 ${SIDE + 60}px`,
            opacity: interpolate(outroLocal, [0.2 * fps, 0.8 * fps], [0, 1], clamp),
          }}
        >
          <div
            style={{
              fontSize: 30,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: TONE.commit,
              fontWeight: 600,
            }}
          >
            Remember
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2.5,
              marginTop: 22,
            }}
          >
            {spec.takeaway.line}
          </div>
          <div
            style={{
              fontSize: 48,
              color: C.ink2,
              lineHeight: 1.3,
              marginTop: 34,
              fontWeight: 400,
            }}
          >
            {spec.takeaway.sub}
          </div>
        </AbsoluteFill>
      ) : null}

      {/* ---- Progress ---- */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 8,
          width: "100%",
          backgroundColor: C.surface2,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(frame / (stepsEnd + spec.takeaway.seconds * fps)) * 100}%`,
            backgroundColor: C.ink3,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

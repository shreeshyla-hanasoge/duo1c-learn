/**
 * Spec audit for data-flow films.
 *
 *   node --experimental-strip-types scripts/check.mts              # every spec
 *   node --experimental-strip-types scripts/check.mts sd-caching   # just these
 *
 * A spec that overflows a card or a caption still renders; it just renders
 * badly, and nobody sees that until the video is watched. So text is measured
 * here with a rough width per character (Inter, at the sizes the film uses)
 * and anything that would wrap past its space is rejected.
 */
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { FRAME_W, SIDE, cardInner, factSize, sizes, wrappedLines } from "../src/kit/layout.ts";
import type { FlowSpec, Move } from "../src/kit/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "src", "specs");
const topics = join(here, "..", "..", "src", "data", "systems", "topics");
const wanted = process.argv.slice(2);
const ids = (
  wanted.length
    ? wanted
    : readdirSync(dir)
        .filter((f) => f.startsWith("sd-") && f.endsWith(".ts"))
        .map((f) => f.replace(/\.ts$/, ""))
).sort();

/** Rough advance width of Inter, as a fraction of the font size. */
const W = { regular: 0.54, semibold: 0.57, caps: 0.67 };
const px = (text: string, size: number, k: number) => text.length * size * k;
const words = (s: string) => s.trim().split(/\s+/).length;
let failed = 0;

for (const id of ids) {
  const errs: string[] = [];
  const bad = (m: string) => errs.push(m);
  let spec: FlowSpec | undefined;
  try {
    const mod = await import(pathToFileURL(join(dir, `${id}.ts`)).href);
    const exported = Object.values(mod) as FlowSpec[];
    if (exported.length !== 1) bad(`expected exactly one export, found ${exported.length}`);
    spec = exported[0];
  } catch (e) {
    bad(`does not load: ${(e as Error).message.split("\n")[0]}`);
  }

  if (spec) {
    const s = spec;
    if (s.id !== id) bad(`id "${s.id}" does not match file name`);
    if (!existsSync(join(topics, `${id}.ts`))) bad(`no lesson named ${id}`);
    if (!/^System design · M\d+$/.test(s.kicker)) bad(`kicker must be "System design · M<n>"`);
    if (s.title.length > 34) bad(`title is ${s.title.length} chars (max 34)`);

    const n = s.nodes.length;
    if (n < 3 || n > 6) bad(`${n} nodes (need 3–6)`);
    const sz = sizes(n);
    const inner = cardInner(n);
    const nodeIds = new Set(s.nodes.map((x) => x.id));
    if (nodeIds.size !== n) bad("duplicate node id");
    for (const node of s.nodes) {
      if (px(node.label, sz.label, W.semibold) > inner)
        bad(`node label "${node.label}" is too wide for ${n} nodes`);
      if (px(node.role, sz.role, W.caps) > inner)
        bad(`node role "${node.role}" is too wide for ${n} nodes`);
    }
    // A fact may wrap to two lines; leave slack for the break falling mid-phrase.
    const factMax = Math.floor((2 * inner) / (sz.fact * W.regular)) - 4;

    if (s.states) {
      if (s.states.length < 2 || s.states.length > 5) bad(`${s.states.length} states (need 2–5)`);
      const row =
        px(s.statesLabel ?? "State", 26, W.caps) + 24 +
        s.states.reduce((w, x) => w + px(x, 30, W.semibold) + 56 + 64, 0);
      if (row > FRAME_W - 2 * SIDE) bad("the states row is too wide: fewer or shorter states");
    }

    if (s.steps.length < 8 || s.steps.length > 11) bad(`${s.steps.length} steps (need 8–11)`);
    if (s.steps[0]?.move) bad("step 1 is the opening line: it must not have a move");
    const total = s.steps.reduce((t, x) => t + x.seconds, 0) + s.takeaway.seconds;
    if (total < 40 || total > 62) bad(`runs ${total.toFixed(1)}s (need 40–62)`);
    const captionMax = Math.floor((2 * (FRAME_W - 2 * SIDE)) / (60 * W.regular)) - 8;
    const moved = new Set<string>();
    let moves = 0;

    s.steps.forEach((st, i) => {
      const k = `step ${i + 1}`;
      if (st.seconds < 4 || st.seconds > 6) bad(`${k}: ${st.seconds}s (need 4–6)`);
      if (st.caption.length > captionMax) bad(`${k}: caption is ${st.caption.length} chars (max ${captionMax})`);
      if (st.caption.length < 30) bad(`${k}: caption is too short to teach anything`);
      if (st.alsoMove && !st.move) bad(`${k}: alsoMove without move`);
      for (const m of [st.move, st.alsoMove].filter(Boolean) as Move[]) {
        moves++;
        if (!nodeIds.has(m.from) || !nodeIds.has(m.to)) bad(`${k}: move names an unknown node`);
        if (m.from === m.to) bad(`${k}: move goes from a node to itself`);
        if (m.label.length > 22) bad(`${k}: move label "${m.label}" is over 22 chars`);
        moved.add(m.from).add(m.to);
      }
      for (const [node, fact] of Object.entries(st.facts ?? {})) {
        if (!nodeIds.has(node)) bad(`${k}: fact for unknown node "${node}"`);
        if (fact.length > factMax) bad(`${k}: fact "${fact}" is ${fact.length} chars (max ${factMax} with ${n} nodes)`);
        if (wrappedLines(fact, factSize(fact, n), inner) > 3)
          bad(`${k}: fact "${fact}" needs more than three lines in its card`);
        if (fact.split(" ").some((w) => px(w, sz.fact, W.regular) > inner))
          bad(`${k}: a word in fact "${fact}" is wider than the card`);
      }
      for (const node of Object.keys(st.health ?? {}))
        if (!nodeIds.has(node)) bad(`${k}: health for unknown node "${node}"`);
      if (st.state && !s.states?.includes(st.state)) bad(`${k}: state "${st.state}" is not in states`);
    });
    if (moves < 6) bad(`only ${moves} moves: a flow film needs messages moving`);
    for (const node of s.nodes)
      if (!moved.has(node.id)) bad(`node "${node.id}" never sends or receives anything`);
    if (s.states && !s.steps.some((x) => x.state === s.states!.at(-1)))
      bad("the last state is never reached");

    if (s.takeaway.line.length > 52) bad(`takeaway line is ${s.takeaway.line.length} chars (max 52)`);
    if (s.takeaway.sub.length > 110) bad(`takeaway sub is ${s.takeaway.sub.length} chars (max 110)`);
    if (s.takeaway.seconds < 5 || s.takeaway.seconds > 6) bad("takeaway seconds must be 5–6");

    if (!s.lesson?.title || s.lesson.title.length > 44) bad("lesson.title missing or over 44 chars");
    const wf = words(s.lesson?.watchFor ?? "");
    if (wf < 18 || wf > 50) bad(`lesson.watchFor is ${wf} words (need 18–50)`);
  }

  if (errs.length) {
    failed++;
    console.log(`✗ ${id}`);
    for (const e of errs) console.log(`    ${e}`);
  } else console.log(`✓ ${id}`);
}

console.log(`\n${ids.length - failed}/${ids.length} specs pass`);
process.exit(failed ? 1 : 0);

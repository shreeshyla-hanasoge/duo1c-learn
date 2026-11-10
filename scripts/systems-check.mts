/**
 * Shape audit for System design topics — the counterpart of
 * `labs.mts` for a subject whose Solve gate is decision cases.
 *
 *   node --experimental-strip-types scripts/systems-check.mts            # every topic file
 *   node --experimental-strip-types scripts/systems-check.mts sd-caching # just these ids
 *
 * It loads topic files directly (not through `curriculum.ts`), so it works
 * while some topics are still unwritten. Rules are the ones in
 * docs/systems/writing-brief.md; a rule that is only in the brief gets
 * forgotten, so the countable ones are enforced here.
 */
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import type { Topic } from "../src/data/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "src", "data", "systems", "topics");
const wanted = process.argv.slice(2);
const ids = (
  wanted.length
    ? wanted
    : readdirSync(dir)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => f.replace(/\.ts$/, ""))
).sort();

const TRAED_HEADINGS = ["Saying it about Traed", "In Traed's terms"];
const DSA_IDS = new Set(
  readdirSync(join(here, "..", "src", "data", "topics")).map((f) => f.replace(/\.ts$/, "")),
);
const words = (s: string) => s.trim().split(/\s+/).length;
let failed = 0;

for (const id of ids) {
  const errs: string[] = [];
  const bad = (m: string) => errs.push(m);
  let topic: Topic | undefined;
  try {
    const mod = await import(pathToFileURL(join(dir, `${id}.ts`)).href);
    const exported = Object.values(mod) as Topic[];
    if (exported.length !== 1) bad(`expected exactly one export, found ${exported.length}`);
    topic = exported[0];
  } catch (e) {
    bad(`does not load: ${(e as Error).message.split("\n")[0]}`);
  }

  if (topic) {
    const t = topic;
    if (t.id !== id) bad(`id "${t.id}" does not match file name`);
    if (t.depth !== "deep") bad(`depth must be "deep"`);
    if (!(t.tier >= 1 && t.tier <= 10)) bad(`tier ${t.tier} out of range`);
    if (!t.week) bad("week missing");
    if (t.viz || t.lab || t.complexity) bad("viz / lab / complexity must not be set");
    // Films are attached by curriculum.ts from the generated films.ts, never set here.
    if (t.conceptFilm) bad("conceptFilm must not be set in a topic file");
    if (t.summary.length > 160) bad(`summary is ${t.summary.length} chars (max 160)`);
    if (words(t.why) < 45 || words(t.why) > 130) bad(`why is ${words(t.why)} words (60–100)`);

    const l = t.learn;
    if (!l) bad("learn block missing");
    else {
      if (words(l.intuition) < 100 || words(l.intuition) > 220)
        bad(`intuition is ${words(l.intuition)} words (120–180)`);
      if (l.mechanics.length !== 5) bad(`mechanics: ${l.mechanics.length} (need 5)`);
      if (!TRAED_HEADINGS.includes(l.mechanics.at(-1)?.heading ?? ""))
        bad(`last mechanics heading must be one of: ${TRAED_HEADINGS.join(" / ")}`);
      for (const m of l.mechanics)
        if (words(m.body) < 55 || words(m.body) > 150)
          bad(`mechanics "${m.heading}" is ${words(m.body)} words (70–120)`);
      if (words(l.complexityDerivation) < 100 || words(l.complexityDerivation) > 240)
        bad(`complexityDerivation is ${words(l.complexityDerivation)} words (120–200)`);
      if (l.variants.length !== 3) bad(`variants: ${l.variants.length} (need 3)`);
      if (l.tradeoffs.length !== 3) bad(`tradeoffs: ${l.tradeoffs.length} (need 3)`);
    }

    const rw = t.realWorld ?? [];
    if (rw.length !== 4) bad(`realWorld: ${rw.length} (need 4)`);
    if (rw.filter((c) => c.kind === "industry").length < 2) bad("need ≥ 2 industry cases");
    // A lesson that says what Traed DOES must show it. One that only maps the
    // idea onto Traed ("In Traed's terms") may have nothing honest to cite.
    if (
      t.learn?.mechanics.at(-1)?.heading === "Saying it about Traed" &&
      rw.filter((c) => c.kind === "yours").length < 1
    )
      bad("need ≥ 1 Traed case");

    const algos = t.algorithms ?? [];
    if (algos.length < 2 || algos.length > 4) bad(`algorithms: ${algos.length} (need 2–4)`);
    for (const a of algos) {
      if (!a.name || !a.role) bad("an algorithm entry lacks name or role");
      if (a.dsa && !DSA_IDS.has(a.dsa)) bad(`algorithm "${a.name}": no DSA topic "${a.dsa}"`);
    }
    for (const c of rw) if (!c.evidence) bad(`realWorld "${c.system}" has no evidence`);

    if (t.insights.length !== 4) bad(`insights: ${t.insights.length} (need 4)`);
    if ((t.pitfalls ?? []).length !== 3) bad(`pitfalls: ${(t.pitfalls ?? []).length} (need 3)`);

    if (t.quiz.length !== 8) bad(`quiz: ${t.quiz.length} (need 8)`);
    const spread = [0, 0, 0, 0];
    const diff: Record<string, number> = {};
    t.quiz.forEach((q, i) => {
      const n = `quiz ${i + 1}`;
      if (q.options.length !== 4) bad(`${n}: ${q.options.length} options`);
      if (!(q.answer >= 0 && q.answer < 4)) bad(`${n}: answer index ${q.answer}`);
      else spread[q.answer]++;
      diff[q.difficulty ?? "none"] = (diff[q.difficulty ?? "none"] ?? 0) + 1;
      if (q.distractors?.length !== 4) bad(`${n}: distractors must have 4 entries`);
      else
        q.distractors.forEach((d, j) => {
          if (j === q.answer && d !== "") bad(`${n}: distractor at the answer index must be ""`);
          if (j !== q.answer && !d) bad(`${n}: option ${j} has no distractor note`);
        });
      const lens = q.options.map((o) => o.length);
      if (lens[q.answer] === Math.max(...lens) && lens[q.answer] > 1.5 * Math.min(...lens))
        bad(`${n}: the correct option is the longest by a wide margin`);
    });
    if (t.quiz.length === 8 && spread.some((c) => c !== 2))
      bad(`quiz answer spread is ${spread.join("/")} (need 2/2/2/2)`);
    if (diff.recall !== 2 || diff.apply !== 4 || diff.judge !== 2)
      bad(`quiz difficulty mix is ${JSON.stringify(diff)} (need 2 recall, 4 apply, 2 judge)`);

    const cases = t.cases ?? [];
    if (cases.length !== 3) bad(`cases: ${cases.length} (need 3)`);
    for (const c of cases) {
      const n = `case ${c.id}`;
      if (!c.id.startsWith(`${id}-`)) bad(`${n}: id must start with "${id}-"`);
      if (c.options.length < 3 || c.options.length > 4) bad(`${n}: ${c.options.length} options`);
      if (!(c.best >= 0 && c.best < c.options.length)) bad(`${n}: best index ${c.best}`);
      for (const o of c.options)
        if (typeof o !== "object" || !o.label || !o.appeal)
          bad(`${n}: every option must be { label, appeal }`);
      if (!c.scenario || !c.verdict) bad(`${n}: scenario or verdict missing`);
      if (c.claims.length < 6 || c.claims.length > 7) bad(`${n}: ${c.claims.length} claims (6–7)`);
      for (const axis of ["trade", "failure", "measure"] as const)
        if (c.claims.filter((k) => k.axis === axis).length < 2) bad(`${n}: < 2 claims on ${axis}`);
      const yes = c.claims.filter((k) => k.correct).length;
      if (yes < 3 || yes > 4) bad(`${n}: ${yes} correct claims (3–4)`);
      for (const k of c.claims) if (!k.note) bad(`${n}: a claim has no note`);
    }
    if (new Set(cases.map((c) => c.best)).size === 1 && cases.length === 3)
      bad("all three cases have the same best index — vary it");

    const text = JSON.stringify(t);
    if (/\*\*|^#+ /m.test(text)) bad("Markdown bold/heading inside a string");
  }

  if (errs.length) {
    failed++;
    console.log(`✗ ${id}`);
    for (const e of errs) console.log(`    ${e}`);
  } else console.log(`✓ ${id}`);
}

console.log(`\n${ids.length - failed}/${ids.length} topics pass`);
process.exit(failed ? 1 : 0);

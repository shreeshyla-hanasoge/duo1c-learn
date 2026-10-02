/**
 * Content coverage audit — the source of truth for the tables in docs/content.md.
 *
 *   node --experimental-strip-types scripts/coverage.mts
 *
 * `curriculum.ts` is imported directly (it is pure data, no runtime deps), but
 * `registry.ts` is parsed as TEXT: its algorithm imports are bundler-style and
 * omit file extensions, which Node's ESM resolver refuses.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SUBJECTS } from "../src/data/subjects.ts";

const here = dirname(fileURLToPath(import.meta.url));
const registry = readFileSync(join(here, "..", "src", "engine", "registry.ts"), "utf8");
const builders = registry.split("const builders")[1]?.split("\n};")[0] ?? "";
const viz = new Set(
  [...builders.matchAll(/^\s*"?([a-z0-9-]+)"?:\s*t[0-4bu]\./gm)].map((m) => m[1]),
);

type T = (typeof SUBJECTS)[number]["topics"][number];
const hasViz = (t: T) => (t.viz ?? []).some((k) => viz.has(k));
const ALL = SUBJECTS.flatMap((s) => s.topics);

for (const subject of SUBJECTS) {
  console.log(`\n## ${subject.name} (${subject.id})\n`);
  console.log(`| ${subject.copy.unit} | Name | Topics | With a visualiser | Instances | Quiz questions | Labs | Decision cases |`);
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
  let totalQuiz = 0;
  let totalInstances = 0;
  for (const tier of subject.tiers) {
    const quiz = tier.topics.reduce((s, t) => s + t.quiz.length, 0);
    const instances = tier.topics.reduce(
      (s, t) => s + (t.viz ?? []).filter((k) => viz.has(k)).length,
      0,
    );
    totalQuiz += quiz;
    totalInstances += instances;
    console.log(
      `| ${tier.id} | ${tier.name} | ${tier.topics.length} | ` +
        `${tier.topics.filter(hasViz).length} | ${instances} | ${quiz} | ` +
        `${tier.topics.filter((t) => t.lab).length} | ${tier.topics.reduce((s, t) => s + (t.cases?.length ?? 0), 0)} |`,
    );
  }
  console.log(
    `| | **Total** | **${subject.topics.length}** | ` +
      `**${subject.topics.filter(hasViz).length}** | **${totalInstances}** | **${totalQuiz}** | | |`,
  );
  const used = new Set(subject.topics.flatMap((t) => t.viz ?? []));
  console.log(`\nDistinct visualisers used: ${[...used].filter((k) => viz.has(k)).length}`);
  const none = subject.topics.filter((t) => !hasViz(t));
  if (none.length) {
    console.log("Topics with NO visualiser:");
    for (const t of none) console.log(`  ${subject.copy.unitShort}${t.tier}  ${t.id}`);
  }
  const noDistractors = subject.topics.flatMap((t) =>
    t.quiz
      .map((q, i) => [q, i] as const)
      .filter(([q]) => !q.distractors || q.distractors.length !== q.options.length)
      .map(([, i]) => `${t.id}#${i + 1}`),
  );
  if (noDistractors.length) console.log(`Questions missing a distractor per option: ${noDistractors.join(", ")}`);
}

console.log(`\nDistinct visualisers registered: ${viz.size}`);

const orphans = [...viz].filter(
  (k) => !ALL.some((t) => (t.viz ?? []).includes(k)),
);
if (orphans.length) {
  console.log(`\nRegistered but unreferenced by any topic: ${orphans.join(", ")}`);
}

const dangling = ALL.flatMap((t) =>
  (t.viz ?? []).filter((k) => !viz.has(k)).map((k) => `${t.id} → ${k}`),
);
if (dangling.length) {
  console.log(`\nTopic references a missing visualiser key: ${dangling.join(", ")}`);
}

/* ---- Tier orientation --------------------------------------------------- *
 * The tier page's arc groups every topic into a stage. Adding a topic to a
 * tier without adding it to a stage is silent at runtime — the topic simply
 * never appears in the arc — so it is checked here instead.               */

console.log("\n| Tier | Orientation | Arc stages | Topics in the arc |");
console.log("| --- | --- | --- | --- |");

const problems: string[] = [];
for (const tier of TIERS) {
  const o = tier.orientation;
  if (!o) {
    console.log(`| ${tier.id} | — | — | — |`);
    problems.push(`T${tier.id} has no orientation (falls back to the topic list)`);
    continue;
  }
  const inArc = new Set(o.arc.flatMap((s) => s.topics));
  const missing = tier.topics.filter((t) => !inArc.has(t.id)).map((t) => t.id);
  const unknown = [...inArc].filter(
    (id) => !tier.topics.some((t) => t.id === id),
  );
  console.log(
    `| ${tier.id} | yes | ${o.arc.length} | ` +
      `${tier.topics.length - missing.length}/${tier.topics.length} |`,
  );
  if (missing.length)
    problems.push(`T${tier.id} arc omits: ${missing.join(", ")}`);
  if (unknown.length)
    problems.push(
      `T${tier.id} arc names topics not in this tier: ${unknown.join(", ")}`,
    );
}

if (problems.length) {
  console.log("\nTier orientation problems:");
  for (const p of problems) console.log(`  ${p}`);
} else {
  console.log("\nEvery topic appears in exactly one arc stage of its tier.");
}

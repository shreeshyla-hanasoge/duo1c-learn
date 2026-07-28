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
import { TIERS, ALL_TOPICS } from "../src/data/curriculum.ts";

const here = dirname(fileURLToPath(import.meta.url));
const registry = readFileSync(join(here, "..", "src", "engine", "registry.ts"), "utf8");
const builders = registry.split("const builders")[1]?.split("\n};")[0] ?? "";
const viz = new Set(
  [...builders.matchAll(/^\s*"?([a-z0-9-]+)"?:\s*t[0-4]\./gm)].map((m) => m[1]),
);

const hasViz = (t: (typeof ALL_TOPICS)[number]) =>
  (t.viz ?? []).some((k) => viz.has(k));

console.log("| Tier | Name | Topics | With a visualiser | Instances | Quiz questions |");
console.log("| --- | --- | --- | --- | --- | --- |");

let totalQuiz = 0;
let totalInstances = 0;
for (const tier of TIERS) {
  const quiz = tier.topics.reduce((s, t) => s + t.quiz.length, 0);
  const instances = tier.topics.reduce(
    (s, t) => s + (t.viz ?? []).filter((k) => viz.has(k)).length,
    0,
  );
  totalQuiz += quiz;
  totalInstances += instances;
  console.log(
    `| ${tier.id} | ${tier.name} | ${tier.topics.length} | ` +
      `${tier.topics.filter(hasViz).length} | ${instances} | ${quiz} |`,
  );
}
console.log(
  `| | **Total** | **${ALL_TOPICS.length}** | ` +
    `**${ALL_TOPICS.filter(hasViz).length}** | **${totalInstances}** | **${totalQuiz}** |`,
);

console.log(`\nDistinct visualisers registered: ${viz.size}`);

console.log("\nTopics with NO visualiser (Solve falls back to the match drill):");
for (const t of ALL_TOPICS) {
  if (!hasViz(t)) console.log(`  T${t.tier}  ${t.id}`);
}

const orphans = [...viz].filter(
  (k) => !ALL_TOPICS.some((t) => (t.viz ?? []).includes(k)),
);
if (orphans.length) {
  console.log(`\nRegistered but unreferenced by any topic: ${orphans.join(", ")}`);
}

const dangling = ALL_TOPICS.flatMap((t) =>
  (t.viz ?? []).filter((k) => !viz.has(k)).map((k) => `${t.id} → ${k}`),
);
if (dangling.length) {
  console.log(`\nTopic references a missing visualiser key: ${dangling.join(", ")}`);
}

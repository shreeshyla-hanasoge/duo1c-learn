# Content — what is covered, and how to extend it

Numbers here are generated from the source, not estimated. To regenerate after a change,
see [Auditing coverage](#auditing-coverage) at the bottom.

---

## 1. What the reader gets

**58 topics · 465 quiz questions · 30 distinct visualisers · 52 code labs · 15 decision cases
· 6 tiers · 24 weeks.**

> [The content upgrade](./content-upgrade-plan.md) is delivered. **All 58 topics are at full
> target quality**: long-form explainer, complexity derivation, variants, trade-offs, 4
> real-world cases (at least one citing this account's own repositories), and 8
> difficulty-tagged quiz questions with per-distractor rationale. Tiers 0–4 carry a **code
> lab**; Tier 5 carries **decision cases** instead, because a judgment tier has nothing to
> animate and nothing to code.
>
> Prose is written for readers in India: plain English, no idioms that do not travel, and
> every jargon term linked to a plain-English definition from `src/data/glossary.ts` via
> the `Prose` component. Examples draw on IRCTC, UPI, Aadhaar and Indian-language text
> handling alongside the usual industry cases.

Every topic has three modes. A topic counts as **mastered** only when all three clear:

| Mode      | What it is                                                                                                                              | Clears when                                               | XP                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------- |
| **Learn** | Animated scrubbable run of the real algorithm, "why it matters", 3–4 ideas, pitfalls                                                    | Playthrough reaches the last frame, or "Mark as learned"  | 20                      |
| **Solve** | A **code lab** (Tiers 0–4) or **decision cases** (Tier 5). Otherwise the scrambled-step or match drill | Lab passes both gates, or 2 decision cases cleared, or the drill where neither exists | 35                      |
| **Quiz**  | Multiple choice, explanation after each answer                                                                                          | Best score ≥ 80%                                          | 10/correct, +25 perfect |

Completing all three adds a **+60 mastery bonus**. Quiz XP is paid only for _improvement_,
so re-taking to farm points does nothing; re-taking to improve is rewarded.

Beyond topics: **Arena** (Rapid Fire, 90 s; Survival, 3 lives) draws only from tiers the
reader has opened. 13 badges. Levels with 8 rank names. Day streak. 8-week activity strip.

---

## 2. Coverage by tier

| Tier | Name                | Topics | With a visualiser | Visualiser instances | Quiz questions |
| ---- | ------------------- | ------ | ----------------- | -------------------- | -------------- |
| 0    | Foundations         | 9      | 6                 | 8                    | 73             |
| 1    | Core structures     | 12     | 7                 | 7                    | 96             |
| 2    | Graphs              | 9      | 5                 | 5                    | 72             |
| 3    | Dynamic programming | 10     | 5                 | 6                    | 80             |
| 4    | Advanced structures | 13     | 6                 | 6                    | 104            |
| 5    | Judgment            | 5      | 0                 | 0                    | 40             |
|      | **Total**           | **58** | **29**            | **32**               | **465**        |

_Instances exceed distinct visualisers because three topics carry two:_ `sorting`
_(merge + quick),_ `binary-search` _(array + on-the-answer),_ `string-dp` _(LCS + edit
distance)._

### The 30 visualisers

| Tier | Keys                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| 0    | `two-pointers` `sliding-window` `binary-search` `binary-search-answer` `prefix-sums` `merge-sort` `quick-sort` `hashing` |
| 1    | `monotonic-deque` `monotonic-stack` `heap` `floyd-cycle` `trie` `intervals` `inorder-iterative`                          |
| 2    | `bfs` `dsu` `toposort` `dijkstra`                                                                                        |
| 3    | `lcs` `knapsack` `lis` `state-machine-dp` `edit-distance`                                                                |
| 4    | `kmp` `lru` `fenwick` `bloom` `bitmask` `skip-list`                                                                      |

---

## 3. What is _not_ covered — the honest list

**29 of 58 topics have no visualiser.** Where a lab or decision case exists it carries Solve
regardless; only topics with neither fall back to the _match drill_. Learn is the mode that
actually loses something. Quiz is unaffected.

```
T0  complexity, arrays, strings
T1  stacks-queues, recursion-memo, backtracking, bst, balanced-trees
T2  graph-representations, dfs, mst, bipartite
T3  dp-1d, grid-dp, interval-dp, tree-dp, digit-dp
T4  segment-tree, sparse-table, matrix-exponentiation, spatial, geometry,
    ring-buffers, time-series
T5  structure-choice, amortised-latency, approximation, stack-complexity, concurrency
```

Tier 5 having none is **by design** — it is a judgment tier with nothing to animate, and its
Solve mode is decision cases rather than a drill. The other 24 are genuine gaps; see
[the ranking below](#which-visualisers-to-build-next) for which are worth building.

### Decision cases (Tier 5)

`DecisionCase` in `src/data/types.ts`, rendered by `views/modes/Cases.tsx`. A case is a
scenario plus 3–4 candidate approaches, of which exactly one is best **under the stated
constraints**. The reader picks one, then selects every true statement from a pool covering
three axes — the trade being accepted, the failure mode being signed up for, and what to
measure. Each topic carries 3 cases and the Solve gate needs 2.

Grading is deterministic and **exact-set**: the pick must be right and the selected claims
must be precisely the true ones. Partial credit would let somebody clear the gate by ticking
everything, which is the opposite of the skill. Every claim carries a note explaining why it
is true or why it is tempting, shown after checking, so a failed attempt is the teaching
moment rather than a dead end.

### Which visualisers to build next

Ranked by teaching value rather than tier order. The test applied: does the animation show
something the prose genuinely struggles to convey?

**High — build these first.**

| Key | Why it earns its keep |
| --- | --- |
| `segment-tree` | Lazy propagation is the hardest idea in Tier 4 to picture. Watching a pending mark sit on a node and push down only when a query descends into it is worth more than any paragraph. |
| `grid-dp` | The cheapest possible win: the table fills in row-major order and the recurrence is literally two arrows into each cell. Also the mental model every later table-shaped DP borrows. |
| `dfs` | Three-colour cycle detection — grey means "on the current path" — is the source of most confusion about back edges, and it is trivially animatable. |
| `backtracking` | N-queens pruning shows the search tree collapsing as constraints propagate. The whole point of backtracking is the branches you never take, which prose cannot show. |
| `tree-dp` | The two-channel pattern — return the height, accumulate the turning path — is the topic's core insight and the single most common bug. Seeing both values at each node makes it obvious. |

**Medium — clear value, less urgent.** `matrix-exponentiation` (the exponent's bits driving
square-and-multiply), `interval-dp` (filling by increasing length, which is the defining bug
when done wrong), `bst` (delete's three cases), `mst` (Kruskal and Prim side by side),
`ring-buffers` (indices wrapping, and the full/empty ambiguity), `time-series` (Welford
staying stable while the naive formula collapses).

**Low — the prose already carries them.** `complexity`, `arrays`, `strings`,
`stacks-queues`, `graph-representations`, `recursion-memo`, `dp-1d`, `bipartite`,
`digit-dp`, `spatial`, `geometry`, `sparse-table`, `balanced-trees`.

Adding one is a builder plus a registry line plus `viz: [...]` on the topic — no UI work.

Also absent, and worth knowing before you plan work:

- **6 topics have no code lab** — all 5 of Tier 5, which take decision cases instead, plus
  `balanced-trees`. Where a lab exists it IS the Solve gate; elsewhere Solve falls back to
  the scrambled-step or match drill.
- **9 of the 52 labs have no complexity gate**, each for a stated reason in the lab itself.
  Some budgets have no honest polynomial target (`bitmask-dp` is O(2ⁿ · n²)); some shapes
  are structural rather than timed; and `skip-lists` was dropped after measurement showed
  no size range where the gate both clears the correct answer and rejects a sorted array
  with `splice`. Those labs are carried by their tests.
- **No spaced-repetition scheduler.** The roadmap's "every Saturday, re-solve two problems
  from 3–4 weeks back" is not implemented. The data to build it exists (`masteredAt`,
  `quizAttempts`), so this is a feature, not a rewrite.
- **No failure log.** Roadmap rule 5 ("one line per problem you couldn't solve") has no
  home in the app yet.
- **No LeetCode/NeetCode linking.** Topics do not carry external problem references.
- **Nothing enforces the 24-week pacing.** The timeline is presentational; the app never
  says "you are behind".

---

## 4. Extending

### Add a quiz question

`src/data/topics/<id>.ts` → the topic's `quiz` array. Four options, `answer` is the index,
`why` explains the reasoning rather than restating the answer, `difficulty` is
`recall`/`apply`/`judge`, and `distractors` carries one entry per option — the correct index
is `""`, and every wrong option gets a sentence naming why it is tempting. That is the whole
change; Arena picks it up automatically because it draws from the same banks.

### Add a visualiser

Three steps, no UI work:

1. **Write the builder** in `src/engine/algorithms/tierN.ts`. Write the _real_ algorithm and
   add `r.emit({...})` calls. Return a `Trace` — `{ title, code, frames, complexity }`, plus
   `display: "bars"` for magnitude-shaped data like sorting.
2. **Register it** in `src/engine/registry.ts`: `"my-key": tierN.myBuilder`.
3. **Reference it** from the topic's `viz: ["my-key"]` in `src/data/topics/<id>.ts`.

A `Frame` may carry any combination of `cells`, `pointers`, `window`, `aux`, `nodes`/`edges`,
`grid`, `matrix`, `intervals` and `stats`; `<Stage>` renders whatever is present. Give every
cell a **stable `id`** across frames — that is what makes motion animate a swap as movement
rather than a value change. `note` is the teaching surface; write it as a sentence a reader
could learn from with the picture covered.

### Add a topic

Create `src/data/topics/<id>.ts`, then import it into `src/data/tiers/tierN.ts` and append it
to that tier's `topics` array — one file per topic, because a single file holding all of them
at full depth would run past twenty thousand lines. Required: `id`, `title`, `tier`,
`summary`, `why`, `insights[]`, `quiz[]`. Optional: `week`, `complexity`, `pitfalls[]`,
`viz[]`, and the depth fields `depth`, `learn`, `realWorld[]`, plus `lab` or `cases[]`.
Ordering within the tier drives the prev/next links.

To hit the current quality bar, a new topic needs `depth`, a full `learn` block (intuition,
5 mechanics, complexity derivation, 4 variants, 3 trade-offs), 4 `realWorld` cases with at
least one citing your own repositories, a `lab` (or `cases[]` for Tier 5), and 8 quiz
questions with a `distractors` entry for every wrong option.

Note that adding a topic changes the denominator for that tier's unlock threshold and for
the `halfway` / `complete` badges — existing users may see percentages move.

**Also add it to its tier's `orientation.arc`** (below). Nothing breaks if you forget — the
topic simply never appears in the arc — so `scripts/coverage.mts` checks it instead.

### Write a tier's orientation

`Tier.orientation` is what makes `#/<subject>/tier/<n>` a page about the *family* rather than
a heading above a list. Optional: a tier without one falls back to just its topic grid.

| Field | What it is |
| --- | --- |
| `overview` | The idea in plain English, before any formalism. If the reader reads only this, they should still get the shape of the thing. |
| `stakes` | One line: what goes wrong for someone who skips this tier. |
| `recognise[]` | `signal` → `reach`. The tells in a problem statement that mean "this is a <tier> problem". Deliberately not a vocabulary list — `glossary.ts` already defines the words and `Prose` links them. |
| `arc[]` | `stage` / `topics[]` / `point` — how the topics build, in stages. `topics` holds topic ids; every topic in the tier must appear in exactly one stage. |
| `outcomes[]` | Concrete things the reader can now do. |
| `inTheWild[]` | `system` → `use`, scoped to the family rather than to one algorithm. |

Two rules that came out of building the first six:

- **Glossary linking is on for `overview` only.** `Prose` de-duplicates term links within a
  block, not across them, so with eight blocks on the page "graph" linked four separate
  times. Everything else on the tier page passes `linkTerms={false}` — backtick code spans
  still render, the underlining does not.
- **A stage is a claim, not a bucket.** "Ordering and grouping" earns its place because the
  `point` says something true about why those two topics sit together. If the point could be
  deleted without loss, the stage is just a sublist and the arc is not doing its job.

### Add a subject

`src/data/subjects.ts` is the registry. A `Subject` carries its `tiers` (DSA calls them
tiers, Trading calls them modules — same shape), optional `phases` (an empty list hides the
"By week" view), its own `badges` (`src/data/badges.ts`), its own `glossary`, and `copy` —
the words the shared views use for it ("Tier"/"Module", the dashboard heading, the
"Why that complexity" / "What the evidence says" heading). Append an entry and it gets its
own routes (`#/<id>/…`), progress namespace, badges, glossary, Arena and a place in the
subject switcher (sidebar on desktop, a native select in the phone header).

Rules that came out of adding Trading concepts:

- **Badge ids are persisted and synced by set union** — never rename or reuse one. DSA's
  list is unchanged from when badges were global.
- **Glossaries are per subject** because words collide: DSA's "node" is a tree node, and
  trading's "high-volume node" must not link to it. `Prose` reads the glossary from
  `SubjectContext`, which `App` provides.
- **`subjects.ts` imports with `.ts` extensions** so `scripts/*.mts` can load every subject
  under Node. Keep anything it imports free of React and DOM.

### Trading concepts

Content lives in `src/data/trading/`: `curriculum.ts` (modules), `modules/<name>.ts` (a
`Tier`), `topics/<id>.ts` (one file per lesson), `labs.ts`, `glossary.ts`. The profile maths
is `src/engine/trading/profile.ts` — the single implementation the visualisers, lab expected
values and audit scripts all use. Synthetic sessions are generated deterministically by
`engine/trading/sessions.ts` from the scenario list in `engine/trading/scenarios.ts`; every
one is synthetic and labelled so. Candles and session profiles are drawn by **Emberwick**
(`emberwick` + `emberwick/profiles`, lazy-loaded so DSA does not carry it) through the
`chart` frame panel; per-bin algorithm steps use the DOM `ladder` panel. Candles are
neutral (hollow up, filled down) so no hue beyond the three validated state hues appears.

Modules: **M1 Volume Profile** (`modules/volume-profile.ts`) and **M2–M5 Price Dynamics &
Market Randomness** (`price-dynamics/`, with its 16-week plan as the subject's `phases`). Price
Dynamics shipped first as a subject of its own; `SUBJECT_ALIASES` in `progress-model.ts` folds
any stored or synced `price-dynamics` progress into `trading` (store migration v3, and every
sync merge) and keeps old `#/price-dynamics/…` links working. M2 sets `entry: true` on its
`Tier`, so it opens as a track of its own rather than waiting on half of M1.

Adding a module: a new `modules/<name>.ts` with its topics, one line in `MODULES`, a badge
in `TRADING_BADGES`. The writing brief for the first module, with the evidence rules, is
`docs/trading/writing-brief.md`; sources and their reliability labels are in
`docs/trading/sources.md`.

### Trading system design

The third subject (`system-design`): system design taught through financial markets and one
worked example, Traed. Content lives in `src/data/systems/`: `curriculum.ts` (six modules
with their orientations, the 12-week `PHASES`, resources), `topics/<id>.ts` (one file per
lesson, ids prefixed `sd-`), `glossary.ts`. **34 topics · 272 quiz questions · 102 decision
cases.** No visualisers and no labs — like DSA's Tier 5, every topic's Solve gate is
`cases[]`.

Every module sets `entry: true`, so all six are open from the start; the order is a
suggestion. `copy.derivationTitle` is "Why this design holds", and the last `mechanics`
entry of every topic is headed "Saying it about Traed" — a short spoken-style account of
what Traed does, why, and what it gives up.

The brief, with the content rules (nothing invented, every Traed claim checked against the
Traed repository, nothing sensitive because the site is public) and the per-topic scope, is
[docs/systems/writing-brief.md](./systems/writing-brief.md). The countable rules are
enforced by a checker, which is not optional after touching a topic:

```bash
node --experimental-strip-types scripts/systems-check.mts            # all topics
node --experimental-strip-types scripts/systems-check.mts sd-caching # just these
```

Traed changes, so these lessons go stale in a way DSA's do not. Where the Traed code and
its own docs disagreed at the time of writing (November 2026), the lessons follow the code.
The whole subject adds about 1 MB to the main bundle (about 300 kB gzipped); loading a
subject's topics lazily is the natural fix if that starts to matter.

After touching anything under `engine/trading/` or a trading scenario:

```bash
node --experimental-strip-types scripts/profile-check.mts   # maths vs Emberwick, worked example, every scenario's claim
```

## 5. Auditing coverage

The tables above came from this. Re-run after content changes:

```bash
node --experimental-strip-types scripts/coverage.mts
```

It covers every subject. It parses `registry.ts` as text (Node's ESM resolver wants file extensions that the
bundler-style imports do not have) and imports `curriculum.ts` directly, so it always
reflects the source rather than a hand-maintained list.

**After touching any lab, this one is not optional:**

```bash
node --experimental-strip-types scripts/labs.mts
```

It runs every lab's reference solution against its own tests _and_ its own complexity gate,
and fails a gate with under 15% headroom — because a gate that barely clears the reference
will reject a reader's correct-but-slightly-slower solution. It has repeatedly caught things
that looked right on inspection: two wrong expected values, an LRU implementation whose
`Map`-based eviction measured super-linear, and a `skip-lists` gate that could not separate
a correct answer from a sorted array with `splice`.

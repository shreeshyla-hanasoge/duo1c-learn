# Pick-up prompt — what is next

The Tiers 3–5 content upgrade is **complete and deployed**. All 58 topics are at full target
quality: `depth`, a `learn` block (intuition, 5 mechanics, complexity derivation, 4 variants,
3 trade-offs), 4 `realWorld` cases with at least one citing this account's own repositories,
a `lab` (Tiers 0–4) or `cases[]` (Tier 5), and 8 difficulty-tagged quiz questions with a
`distractors` entry for every wrong option.

Current numbers, from `scripts/coverage.mts`: **58 topics · 465 quiz questions · 52 code labs
· 15 decision cases · 30 visualisers**.

---

## What changed structurally, and why

Three decisions were taken during that pass and are worth knowing before touching this code.

**1. `ComplexityTarget` gained `O(n·m)` and `O(n^3)`,** and now lives in `src/data/types.ts`
rather than `engine/lab/runner.ts` — the Node-side audit scripts import it and cannot load
anything that touches `Worker`. `runner.ts` re-exports it and still owns the thresholds. An
`O(n·m)` gate scales BOTH dimensions with its one parameter, so the curve it traces is
quadratic and it shares a threshold with `O(n^2)`; that is deliberate and documented in
`runner.ts`. Pinning the second dimension instead would only catch an extra factor of n.

**2. Tier 5 has `DecisionCase[]` instead of labs.** Type in `src/data/types.ts`, UI in
`views/modes/Cases.tsx`, wired as the Tier 5 branch of `views/modes/Solve.tsx`. A case is a
scenario plus 3–4 approaches plus a claim pool across three axes (trade / failure mode /
what to measure). Grading is exact-set — the pick must be right and the ticked claims must be
precisely the true ones — because partial credit would let somebody pass by ticking
everything. Each topic has 3 cases; the gate needs 2.

**3. DP gate sizes are capped at 3200** where the natural recursion depth is proportional to
n. A reader's first working answer is usually top-down memoisation, and V8 overflows near ten
thousand frames — gating past that would reject a correct solution with a stack overflow,
which reads as a broken lab rather than a rule. Where the shape allows a shallow recursion
(`tree-dp` builds a balanced tree) the sizes go to 32,000.

## Measurements that changed the content

`scripts/labs.mts` overturned two implementations that looked obviously correct. Both are now
written up in `structure-choice`, and both are worth not re-litigating:

- **`lru`** — the elegant `Map` delete-then-set cache measured **3.58x per doubling against a
  3.20x limit**. V8 tombstones deleted entries and `keys().next()` walks past them. The
  map-plus-linked-list version measures ~2.5x and is about 12× faster at 32,000 operations.
- **`skip-lists`** — the gate was **removed**. A sorted array with `splice` measured
  3.12–3.17x against the skip list's 2.63–2.67x, and at smaller sizes it drops to 2.7x and
  passes comfortably. There is no size range where a gate both clears the correct answer and
  rejects the wrong one, because V8's `splice` is a `memmove`. The tests carry that lab.

`scripts/labs.mts` is not optional after touching a lab.

---

## Suggested next work

**1. Visualisers — 24 genuine gaps.** Ranked in
[docs/content.md](./content.md#which-visualisers-to-build-next). The five worth doing first
are `segment-tree` (lazy propagation), `grid-dp` (cheapest win, and the model every later
table DP borrows), `dfs` (three-colour cycle detection), `backtracking` (N-queens pruning)
and `tree-dp` (the two-channel return/accumulate pattern). Adding one is a builder plus a
registry line plus `viz: [...]` — no UI work.

**2. Arena modes the new content unlocks.** `content-upgrade-plan.md` §5 lists them and they
are now buildable: Complexity Golf, Spot the Bug, Where's it used? (the `realWorld` cases are
the content), Boss Run, Cold Recall. Cold Recall also closes the spaced-repetition gap, and a
failure log falls out of lab and quiz history for free.

**3. `balanced-trees` has no lab** — the only Tier 0–4 topic without one.

**4. Bundle size.** The main chunk is ~1.6 MB (520 KB gzipped) and the build warns about it.
Topic data is the bulk of it and is a natural code-split boundary.

---

## Still outstanding, unrelated to content

- **Rotate the Google OAuth client secret.** It appeared in a screenshot and is therefore in
  an old conversation history. Rotate in the Google console, then
  `aws secretsmanager put-secret-value --secret-id learn-duo1c/google-oauth`, then redeploy
  the Auth stack — CloudFormation resolves the secret at deploy time, so rotating without
  redeploying changes nothing.
- **This directory is not a git repository.** Everything here is one `rm` from gone, and that
  is now roughly 60,000 words of content with no history behind it.
- **`.claude/launch.json` gained `"autoPort": true`** because port 5173 is occupied by the
  portfolio project's dev server. Harmless, and worth knowing if a preview lands on an
  unexpected port.

# duo1c Learn — working notes

Multi-subject learning platform at **learn.duo1c.in**. First subject: DSA.
Full detail in [docs/architecture.md](docs/architecture.md),
[docs/content.md](docs/content.md), [docs/runbook.md](docs/runbook.md).

## Stack

Vite + React 19 + TS · Tailwind v4 · `motion` · zustand+persist · hand-rolled hash router.
AWS: S3 + CloudFront + Cognito(Google/PKCE) + HTTP API + Lambda + DynamoDB, CDK in `infra/`.
Account <ACCOUNT_ID>, ap-south-1 (ACM cert us-east-1). Profile `default`.

## Non-negotiables

These were each learned from a real bug. Breaking one reintroduces it.

**1. Container entrances animate position, never opacity.**
A fade-in that never completes (suspended renderer, bfcache restore, dropped frame) leaves
an `opacity: 0` container invisible with no recovery. Containers, stat values and narration
animate `y`/`scale` only. Opacity is reserved for transient UI where a stuck element is
cosmetic.

**2. No `<AnimatePresence mode="wait">` on anything route-, timer- or tap-driven.**
Two changes in one frame leave the outgoing view stuck mid-exit and the incoming one never
mounted — the whole view wedges. Use keyed enter animations; they cannot wedge.

**3. Modals unmount synchronously.** `if (!open) return null`, not an exit animation. A
full-screen overlay stuck mid-exit blocks the entire page. Backdrops also carry
`onClick={dismiss}` so even a stuck one can be tapped away.

**4. Every grid needs an explicit column track.** `grid gap-3` alone gives items
`min-width: auto`, so they refuse to shrink and blow out the page on mobile. Always
`grid-cols-1` (Tailwind emits `minmax(0,1fr)`), plus `min-w-0` on flex children that
contain `truncate`.

**4b. Never add `unsafe-eval` to the page CSP.** The lab worker needs it and gets it via
its own response-headers policy on `/assets/lab-worker.js` (dedicated same-origin workers
carry their own CSP). Keep the worker on a real URL — a blob worker inherits the page
policy — and keep its filename unhashed so CloudFront can path-match it.

**4c. The complexity gate must warm up before it measures, and its thresholds are
calibrated, not theoretical.** V8 only optimises a function after several calls, so one
warm-up leaves the FIRST size running in slow code — which flattens the measured curve and
let a genuinely quadratic solution measure 2.13x and pass. Warm up at every size
(`lab.worker.ts`), fit the exponent by least squares over all sizes rather than taking a
median of adjacent ratios, and set thresholds from measured correct-vs-wrong ranges
(`runner.ts`). Real linear JS measures 2.0–2.8x per doubling, not 2.0. Run
`node --experimental-strip-types scripts/labs.mts` after touching any lab: it re-measures
every reference solution and flags gates with under 15% headroom.

**5. Theme tokens use `@theme static`.** Tailwind v4 prunes variables no utility class
references; the tier ramp and `viz-idle` are read only from inline styles and silently
resolve to empty without it.

**6. Encoding colours are validated, not chosen.** Three state hues only
(cursor/scan/match), validated all-pairs for CVD + contrast in both themes. A fourth fails
the gate — "eliminated" is neutral + strike-through, never a new hue. Tier badges use an
ordinal single-hue ramp. The legend always names each state, so colour is never the only
channel.

**7. Sync merges monotonically** (`max`/`OR`/`union`), which makes it commutative and
idempotent. Do not "fix" XP to sum — both sides derive it from the same gates and summing
double-counts. Do not add last-write-wins.

**8. Auth is optional and gates nothing.** The whole site works signed out. Only
`Shell.tsx`/`Account.tsx` may read auth state. If a view ever imports `useAuth`, that is a
bug.

## Verifying UI work

The Browser pane's screenshot viewport does not match the page's layout viewport, and it
suspends the renderer between tool calls — so animations freeze mid-flight and screenshots
lie about geometry. **Measure the DOM (`getBoundingClientRect`, `getComputedStyle`) and
treat screenshots as a secondary signal.** To test narrow widths, clamp `main`'s width in
JS rather than trusting `resize_window`.

## Deploy

```bash
./scripts/deploy.sh --domain learn.duo1c.in --cert <arn> --google-client-id <id>
```

Vite bakes `VITE_*` at build time but Cognito/API values only exist after those stacks
deploy, hence the passes. Read the site URL _before_ pass 1 — the Cognito callback list is
written there.

## Content

**One file per topic** in `src/data/topics/<id>.ts`, composed into tiers by
`src/data/tiers/tierN.ts` and re-exported from `src/data/curriculum.ts`. Shapes live in
`src/data/types.ts`. A single file holding every topic at full depth would run past twenty
thousand lines, which no editor and no reviewer handles well.

`src/data/glossary.ts` holds plain-English definitions; `components/Prose.tsx` renders
`backtick` code spans and links the FIRST mention of each glossary term per block to a
tap-to-reveal explanation. **Audience is readers in India** — plain English, no idioms that
do not travel, and every jargon term explained on first use. Prefer Indian real-world
examples (IRCTC, UPI, Aadhaar, Indian-language text) alongside industry ones.

Adding a visualiser = builder + registry line + `viz: [...]` on the topic; no UI work.

```bash
node --experimental-strip-types scripts/coverage.mts   # topic/quiz/visualiser counts
node --experimental-strip-types scripts/labs.mts       # every lab's solution vs its own tests AND gate
```

`scripts/labs.mts` is not optional after touching a lab. It caught two wrong expected
values that had been reasoned through by eye and were still wrong — including the exact
BST mistake the topic's own quiz warns about.

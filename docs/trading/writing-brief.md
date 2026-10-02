# Writing brief — Trading concepts · Module 1 · Volume Profile

This is the brief every lesson in the module was written against. Keep it for
the next module (market structure, VWAP, options basics): the same rules apply.

## The reader

One specific person: builds and runs an algorithmic trading platform for Indian
markets — NIFTY index options on NSE, commodity futures and options on MCX.
Writes code daily, so maths and code are welcome. No formal training in auction
market theory. Already uses three rule inputs in their own strategy builder:

- previous session's POC, VAH and VAL;
- **zone** — whether a bar CLOSES above, inside or below yesterday's value area;
- **open zone** — where today OPENED relative to yesterday's value area;
- **session range** — whether today has so far traded inside yesterday's value,
  beyond it above, below, or both.

The site's audience rule still applies: plain English for readers in India, no
idioms that do not travel, every term explained on first use. Indian examples
first: NIFTY, BANKNIFTY, RELIANCE, MCX crude oil and gold, NSE hours, MCX
09:00–23:30 (23:55 in US daylight saving), weekly NIFTY expiries (Tuesday since
1 Sep 2025).

## Non-negotiable content rules

1. **Education, not advice.** Never "this will make money", "high-probability
   setup", "works every time". Every setup comes with how it fails.
2. **Evidence is labelled.** For each claim attributed to a source, say where it
   comes from. Use the research notes in `docs/trading/sources.md`; they label
   every claim VERIFIED / SECONDARY / UNVERIFIED / OPINION. Carry those labels
   into the prose in plain words: "Dalton writes…", "the CBOT study guide
   says…", "commonly repeated, but we could not find a source for it", "this is
   opinion". If there is no evidence, say so plainly. Never invent a statistic,
   a study, a page number or a quote. No quotations longer than a few words —
   explain in your own words.
3. **The `learn.complexityDerivation` field is "What the evidence says"** for
   this subject (the UI heading is subject-specific). Use it for: where the idea
   comes from, what it literally claims, what evidence exists for and against,
   and what is untested. 120–250 words.
4. **Numbers in prose must match the code.** The synthetic sessions and their
   computed levels are below. If you quote a number not in this list, compute it
   from the engine or do not quote it.
5. **Synthetic data is labelled as synthetic** whenever it is quoted.

## Facts you can rely on (computed by `src/engine/trading/*`, checked by `scripts/profile-check.mts`)

- Profile rules (`src/engine/trading/profile.ts`): absolute grid, bin k covers
  [k·step, (k+1)·step); each 1-minute bar's volume spread over its high–low range
  in proportion to overlap; flat bar → one bin; POC = most volume, tie → nearest
  the middle of the profile by bin index, then the lower; POC price = bin
  midpoint; value area: start at POC, compare next TWO above vs next TWO below,
  add the larger pair, equal pairs go up, a side with one bin left offers that
  one bin, a side with none left loses; stop at ≥ 70%; VAH = top edge of top bin,
  VAL = bottom edge of bottom bin. These are ALSO exactly the rules Emberwick's
  `computeValueArea` uses (checked on 20,000 random profiles).
- Zone convention (`zoneOf`): above if price > VAH, below if price < VAL, else
  inside — **edges count as inside**. Session range: strictly beyond (touching an
  edge is not beyond).
- **Worked example, 1 Oct 2026, NIFTY near-month future, 5-point bins:** POC
  22,447.5, VAH 22,470, VAL 22,215. These three numbers are the reader's own
  platform's. The course's bars for that day are SYNTHETIC, tuned to reproduce
  them. Synthetic session range 22,176–22,471.55, open 22,290, close 22,448. The
  synthetic day is a **double distribution**: a lower hump around 22,180–22,250,
  a thin waist, an upper hump around 22,430–22,460. The POC sits 22.5 points
  below VAH and 232.5 above VAL. Teaching point: the three numbers alone cannot
  tell a P-shape from a double distribution — you must look at the profile;
  a wide value area can contain a thin, unaccepted zone.
- 30 Sep 2026 (synthetic): POC 22,312.5, VAH 22,335, VAL 22,290. 1 Oct opens at
  22,290 — exactly on 30 Sep's VAL, so open zone = inside under the edge
  convention (a platform treating the edge as outside says "below").
- "Yesterday" for the opening-type and 80%-rule demos (synthetic): VAL 22,325,
  POC 22,337.5, VAH 22,370.
- Platform differences (VERIFIED from docs, research section D): CBOT/Dalton two
  rows at a time, stop at ≥ 70%; Sierra Chart default one row at a time, tie takes
  both, stop at ≥ 70% (has a "two levels at a time" option); TradingView volume
  profile one row at a time, stop BEFORE exceeding 70% (so ≤ 70%), tie → closer to
  POC then above; NinjaTrader 8 default 68%, expansion undocumented. Worked
  example rows 99..110 = [10,40,70,15,20,90,100,60,20,30,10,5]: VAL 101 (CBOT),
  102 (Sierra), 103 (TradingView).
- MCX crude (synthetic): whole-session POC 5,773; 09:00–17:00 POC 5,833;
  17:00–23:30 POC 5,773.

## India facts (from the research notes — keep the labels)

- NSE equity cash normal market 09:15–15:30 (VERIFIED). **NSE equity derivatives
  close at 15:40 per NSE's timings page (VERIFIED), reportedly from 3 Aug 2026
  alongside a new closing auction session for F&O stocks (SECONDARY, news).**
  The reader's brief and this course's synthetic sessions use 09:15–15:30;
  say so where hours matter, and tell the reader to check their own data.
- F&O pre-open call auction 09:00–09:15 for current-month futures, live since
  Dec 2025 (VERIFIED page; go-live date SECONDARY). NIFTY futures therefore now
  have an auction-determined opening price.
- NIFTY weekly options expire on Tuesday since 1 Sep 2025; monthly NIFTY futures
  and options expire on the last Tuesday of the month (SECONDARY, multiple
  brokers; SEBI May 2025 circular reproduced).
- SEBI Oct 2024: one weekly-expiry benchmark index per exchange (VERIFIED).
- Muhurat 2024: 1 Nov, 18:00–19:00. Muhurat 2025: 21 Oct, afternoon,
  13:45–14:45 (VERIFIED circulars). Budget day Sat 1 Feb 2025, full hours.
  DR-site live session Sat 18 May 2024 (VERIFIED).
- MCX crude: 100 barrels, ₹/barrel, tick ₹1, settles on NYMEX front-month
  (SECONDARY). Gold: bimonthly contracts (SECONDARY).
- NIFTY 50 is a free-float market-cap weighted index; it has no traded volume
  (VERIFIED factsheet + analysis).

## The visualisers (already built — reference them, do not build new ones)

| Key | Shows |
| --- | --- |
| `vp-auction` | A double-distribution day revealed over time: balance, imbalance, new balance. |
| `vp-tpo-vs-volume` | TPO letters by 30-min period vs volume; TPO POC 22,385 vs volume POC 22,455 at 10-point rows (22,382.5 vs 22,452.5 at 5-point) on a synthetic day where a slow thin morning and a heavy afternoon burst disagree. |
| `vp-build` | 1 Oct built bar by bar: first five 1-minute bars split into 5-point rows with the overlap arithmetic, then 30-minute chunks, ending at the worked-example levels. |
| `vp-bin-size` | 1 Oct at 1, 2.5, 5, 10, 25, 50-point rows; POC/VAH/VAL per size. |
| `vp-poc` | Scanning for the POC on three small profiles (clear winner, tie nearer middle, equidistant tie → lower), then the developing POC jumping between humps on 1 Oct. |
| `vp-value-area` | The two-row expansion on 1 Oct with the running % meter; ends asking what POC-near-the-top suggests. |
| `vp-value-area-rules` | A 10-row profile [7,6,4,2,11,7,1,3,3,7] hitting larger / tie-goes-up / single-row-left / nothing-left-above. |
| `vp-platforms` | The same profile under CBOT, Sierra and TradingView rules; then 1 Oct under each. |
| `vp-anatomy` | HVNs, LVN, single prints, buying tail (excess), poor high / ledge on one synthetic day. |
| `vp-shapes` | D, P, b, B (double distribution), thin trend. |
| `vp-day-types` | Dalton's six types with the initial balance window, first hour then whole day. |
| `vp-open-types` | Open-drive, open-test-drive, open-rejection-reverse, open-auction vs yesterday's value. |
| `vp-value-relationships` | Higher, overlapping higher, inside, outside, overlapping lower, lower. |
| `vp-eighty` | The 80% rule step by step on a fill day and a failure day. |
| `vp-naked-poc` | A synthetic week with POCs extended until traded through. |
| `vp-rule-inputs` | 30 Sep → 1 Oct: open zone, zone of each bar, session range so far. |
| `vp-developing` | 1 Oct developing POC/VA every 30 min; the look-ahead trap. |
| `vp-composite` | The week added row by row into a composite; why the absolute grid matters. |
| `vp-vwap` | 1 Oct with VWAP and ±1 SD; on a two-hump day VWAP sits in the thin waist. |
| `vp-volume-source` | Same NIFTY prices, three illustrative volume weightings → different levels. |
| `vp-mcx-session` | MCX crude: whole session vs day vs evening profiles. |
| `vp-noise` | SIMULATION: 1,191 trades with NO zone effect still produce PF differences, flipping yearly orderings and "always-losing" slices. |

## Topic shape (TypeScript, `src/data/types.ts`)

Required: `id`, `title`, `tier: 1`, `summary` (one line), `why` (2–4 sentences),
`viz` (the keys listed for the topic), `insights` (3–4 `{t, d}` — also used by the
Solve match drill), `quiz` (8). Also: `depth: "deep"`, `learn` (intuition ~150
words; exactly 5 `mechanics`; `complexityDerivation` = what the evidence says; 4
`variants`; 3 `tradeoffs`), `realWorld` (4 cases; at least one `kind: "yours"`
about the reader's own platform — their strategy-builder inputs or their
put-buying study; never invent details about their platform beyond what this
brief says), `pitfalls` (4–5). Keep any `lab:` already in the stub file.

Prose strings go through `Prose`: `backticks` render as code; glossary terms in
`src/data/trading/glossary.ts` are linked automatically on first mention, but
still explain any term the reader would not know in the same sentence when it
first matters.

### Quiz (8 per topic)

- At most 2 `recall`; the rest `apply` or `judge`. Test understanding, not
  memory: give a profile and ask what it implies; give two days' value areas and
  ask for the relationship; give a claimed backtest and ask what is wrong.
- Four options. `answer` is the index. `why` explains the reasoning. `distractors`
  has one entry per option: `""` for the correct one, and for every wrong option a
  sentence naming why it is tempting.
- Vary the position of the correct answer (not always index 1).
- `figure` (optional) draws a small profile above the question:
  `{ lo, step, bins: number[] (lowest first), showValueArea?: boolean, lines?: [{price, label}], caption? }`.
  Use it for at least two questions per reading-heavy topic (6, 7, 10, 12). Keep
  bins to 8–20 rows. If `showValueArea` is true the POC/VAH/VAL are computed from
  the bins with the course rules — make sure your question's answer agrees with
  what those rules give.

### Decision cases (only where assigned)

`cases: DecisionCase[]`, 3 per topic, shape in `src/data/types.ts` (see
`src/data/topics/structure-choice.ts` for a complete example). A scenario with
real constraints, 3–4 options, exactly one best under those constraints, a
verdict, and a claim pool on all three axes (`trade`, `failure`, `measure`),
mixing true and plausible-false claims, each with a `note`. Grading is
exact-set, so every claim must be unambiguously true or false.

## Style

- Plain, concrete, short sentences. British spelling as the existing content uses
  ("optimise", "behaviour").
- Indian number grouping for prices in prose: 22,447.5. Times as 09:15.
- Look at `src/data/topics/prefix-sums.ts` for the depth and tone of an existing
  lesson.
- Do NOT touch any file other than your assigned topic files.
- When done: `npx tsc -p tsconfig.app.json --noEmit` must be clean for your files,
  and `node --experimental-strip-types scripts/coverage.mts` must not report
  missing distractors for your topics.

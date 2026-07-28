# DSA content upgrade — comprehensive plan

**The problem, stated honestly.** The platform's _machinery_ is good — trace-based
visualisers, three gates, Arena, sync. The _content_ is thin: 3–4 insights per topic,
2–3 quiz questions, no code you ever write, and no answer to "where would I actually use
this". A reader can clear all 58 topics without having typed a line of code. That is a
demo, not a curriculum.

This plan fixes that in five moves:

1. **A richer content model** — Learn becomes a real explainer, not a bullet list.
2. **Hands-on labs** — write the algorithm, run it against tests, _and against a
   complexity gate_.
3. **Real-world cases** — every topic answers "who uses this and what breaks without it",
   including citations into your own repos.
4. **Depth that scales with tier** — Tier 4 topics get more than Tier 0 topics, because
   they are bigger.
5. **Arena feeds on all of it** — new modes that only become possible once the content
   exists.

Current baseline (from `scripts/coverage.mts`): 58 topics · 124 quiz questions ·
30 visualisers · 29 topics with no visualiser · 0 labs · 0 real-world cases.

---

## 1. The content model

`src/data/curriculum.ts` today:

```ts
{ id, title, tier, week, summary, why, complexity, viz[], insights[], pitfalls[], quiz[] }
```

Proposed. Everything existing stays valid, so this is additive and can land topic by topic:

```ts
interface Topic {
  /* …existing… */

  /** How much depth this topic warrants. Drives gate thresholds and Arena weighting. */
  depth: "core" | "deep";

  learn: {
    /** One paragraph. The mental model, before any formalism. */
    intuition: string;
    /** The algorithm in stages, each optionally bound to a viz frame range. */
    mechanics: {
      heading: string;
      body: string;
      vizFrames?: [number, number];
    }[];
    /** WHY the bound is what it is — the argument, not the answer. */
    complexityDerivation: string;
    /** Named variants and when each is the right call. */
    variants: { name: string; when: string; delta: string }[];
    /** Head-to-head against the obvious alternative. */
    tradeoffs: { vs: string; pick: string; because: string }[];
  };

  realWorld: RealWorldCase[];
  lab?: CodeLab; // absent only for Tier 5
  cases?: DecisionCase[]; // Tier 5 only
  quiz: QuizQ[]; // expanded, difficulty-tagged
}

interface RealWorldCase {
  system: string; // "git", "Redis", "traed/strategy-engine"
  kind: "industry" | "yours";
  problem: string; // what breaks without this structure
  applied: string; // how it is actually used
  evidence?: string; // file path, RFC, or source link
  impact?: string; // "O(n·w) → O(n)", "30 page reads → 4"
}

interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  why: string;
  difficulty: "recall" | "apply" | "judge"; // ← new
  /** Why each wrong option is tempting. Teaches more than the right answer. */
  distractors?: string[];
}
```

### Why `distractors` matters

The single cheapest quality upgrade. Today a wrong answer just says "not quite" and shows
the correct reasoning. Naming _why the wrong option was attractive_ is where the
misconception actually gets corrected.

---

## 2. Hands-on labs

The biggest gap and the biggest build. Design decisions, with the reasoning:

### Execution: Web Worker, not a backend

| Option                  | Verdict                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Web Worker + JS**     | **Chosen for phase 1.** Zero backend, zero cost, no abuse surface, works offline, terminate-on-timeout is trivial.           |
| Pyodide (real Python)   | **Phase 2, lazy-loaded.** ~10 MB, so only fetched when a reader opts into Python. Worth it — your own stack is Python-heavy. |
| Judge0 / Piston service | Rejected. Adds a backend, a bill, and an abuse surface for a single-user learning tool.                                      |

The worker gets no DOM, no network, and a hard wall-clock kill. That is a genuinely safe
sandbox for code the reader wrote themselves.

### The lab shape

```ts
interface CodeLab {
  prompt: string;
  signature: string; // shown, not editable
  starter: string;
  tests: {
    name: string;
    input: unknown[];
    expected: unknown;
    hidden?: boolean;
  }[];
  hints: string[]; // progressive, cost XP to reveal
  solution: string; // only after a pass, or after 3 hints
  /** The contract the reader must hit, not just "does it work". */
  complexityGate?: {
    target: "O(n)" | "O(n log n)" | "O(log n)" | "O(1)";
    maxN: number;
  };
}
```

### The complexity gate — the feature worth building

Roadmap rule 2 is _"state the complexity budget out loud before coding — then verify you
hit it."_ Today that is an honour system. A lab can **enforce** it: run the submission at
n, 2n, 4n, 8n, measure, and fit the growth curve. An O(n²) solution that passes every
correctness test still fails the gate.

That single mechanic is what separates this from every other DSA site — they check
_answers_; this checks _complexity_. It is also exactly the skill the roadmap is built
around.

Nothing else in the plan is novel. This is.

### Flow

```
Read the prompt → state your budget (a dropdown, recorded) → write → Run tests
  → correctness pass?  → complexity gate → pass = Lab gate cleared (+XP)
  → fail → hints (progressive, each costs some XP) → solution after 3
```

Solve becomes: **Lab** (primary, when one exists) with the sequence/match drill demoted to
a warm-up. Mastery requires the lab, so "no hands-on coding" stops being true.

---

## 3. Real-world cases

Two sources, deliberately mixed:

**Industry** — named systems, so the knowledge transfers to interviews and design reviews.
**Yours** — citations into your actual repos, from the analysis already in
[`dsa-project-algorithm-map.md`](../../dsa-project-algorithm-map.md). This is the part no
other learning platform can do for you.

Worked examples of the target quality:

| Topic              | System                                           | Problem                                                | Applied                                                 | Impact                                    |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------- |
| Monotonic deque    | `traed/strategy-engine` (yours)                  | Swing-high detection rescans a ±window per bar         | `support_resistance_service.py:320` nested scan → deque | O(n·w) → O(n)                             |
| Rolling aggregates | `traed/regime/hmm_model.py` (yours)              | `pstdev` recomputed per index feeds the HMM every bar  | Welford / running sums                                  | O(n·w) → O(n)                             |
| Trie               | MedLocate (yours)                                | No `/suggest` endpoint exists at all                   | Radix tree + cached top-K per node                      | O(prefix + k), independent of corpus      |
| Geohash + bbox     | MedLocate `search/handler.py:262` (yours)        | Fallback path runs full Haversine on every scanned row | bbox prune → geohash key → heap top-K                   | scan → indexed                            |
| Path trie          | lambdadeploy `useFileManagement.js:1559` (yours) | `sort()` called _inside_ the tree-insert loop          | Insert into trie, order once                            | O(n·d·k log k) → O(n)                     |
| B-tree             | PostgreSQL                                       | A billion-row lookup cannot be 30 random reads         | High fan-out keeps depth ~4                             | 30 page reads → 4                         |
| Merkle tree        | git                                              | Detecting which of 50k files changed                   | Hash subtrees; equal hash = skip entire subtree         | O(changed), not O(files)                  |
| Consistent hashing | Cassandra / CDNs                                 | Adding a node must not remap every key                 | Hash ring with virtual nodes                            | K/n keys move, not all                    |
| LSM tree           | RocksDB / Kafka                                  | Random writes destroy disk throughput                  | Sequential writes + background compaction               | write amplification traded for throughput |
| Bloom filter       | Chrome Safe Browsing                             | Can't ship the full malicious-URL list                 | Local filter, network check only on hit                 | ~10 bits/entry                            |
| HyperLogLog        | Redis `PFCOUNT`                                  | Counting distinct users needs GB of set                | Probabilistic cardinality                               | ~1.5 KB, 2% error                         |
| Ring buffer        | swimmer (yours)                                  | 256 KB RAM on the watch, HR at 1 Hz                    | Fixed 5-sample buffer, allocate once                    | zero steady-state allocation              |

Target: **3–5 cases per topic**, at least one from your own repos wherever the map supports
it (roughly 20 topics do).

---

## 4. Depth that scales with tier

Your observation is right: a Tier 4 topic like _segment trees_ deserves more than a Tier 0
topic like _strings_. Targets:

| Tier                  | Topics | Quiz now → target     | Labs   | Viz now → target | Cases    |
| --------------------- | ------ | --------------------- | ------ | ---------------- | -------- |
| 0 Foundations         | 9      | 23 → **72** (8 ea.)   | 9      | 8 → **11**       | 27       |
| 1 Core structures     | 12     | 26 → **96** (8 ea.)   | 12     | 7 → **14**       | 40       |
| 2 Graphs              | 9      | 20 → **90** (10 ea.)  | 9      | 5 → **11**       | 32       |
| 3 Dynamic programming | 10     | 21 → **100** (10 ea.) | 10     | 6 → **13**       | 36       |
| 4 Advanced structures | 13     | 27 → **156** (12 ea.) | 13     | 6 → **16**       | 52       |
| 5 Judgment            | 5      | 7 → **50** (10 ea.)   | —      | 0 _(by design)_  | 25       |
|                       | **58** | **124 → ~564**        | **58** | **30 → ~65**     | **~210** |

Quiz mix per topic: roughly 40% `recall`, 40% `apply`, 20% `judge`. Only `apply` and
`judge` count toward the gate, so the gate cannot be cleared on definitions alone.

### Tier 5 is a different shape

There is nothing to animate and nothing to code in a judgment tier. Instead, **decision
cases**:

> A rate limiter must survive 50k req/s across 12 nodes. Redis counters, local token
> buckets with gossip, or a sliding-window log? State your pick, the failure mode you are
> accepting, and what you would measure.

Graded against a rubric (did you name the trade, the failure mode, the measurement), not a
single right answer — the same way the rest of the app grades reasoning rather than recall.

### The 24 missing visualisers

Ranked by teaching value, not by tier order:

**High** — `segment-tree` (lazy propagation is genuinely hard to picture), `dfs`
(three-colour cycle detection), `backtracking` (N-queens pruning), `matrix-exponentiation`,
`grid-dp`, `tree-dp`.
**Medium** — `bst` (delete's three cases), `mst` (Kruskal vs Prim side by side),
`sparse-table`, `interval-dp`, `ring-buffers`, `time-series` (Welford vs naive drift).
**Low** — `complexity`, `arrays`, `strings`, `stacks-queues`, `graph-representations`,
`recursion-memo`, `dp-1d`, `bipartite`, `digit-dp`, `spatial`, `geometry`.

---

## 5. Arena, extended

You like the Arena; the new content unlocks modes that are currently impossible:

- **Complexity Golf** — given a function, name its true bound. Fastest correct wins.
  Directly drills roadmap week 1.
- **Spot the Bug** — a subtly wrong implementation (`while` vs `if` on the shrink,
  `lo + hi` overflow, upward capacity loop in 0/1 knapsack). Find the line.
- **Where's it used?** — real-world round; match structure to system.
- **Boss Run** — per-tier gauntlet unlocked by mastering that tier; mixed lab + quiz.
- **Cold Recall** — roadmap rule 4: resurfaces topics mastered 3–4 weeks ago, no notes.

The last one also closes the **spaced-repetition** gap, and a **failure log** (roadmap
rule 5) falls out of lab and quiz history for free — both are data the app already
collects but never surfaces.

---

## 6. Sequencing

Each phase is independently shippable; the app never regresses mid-way.

| Phase                    | Scope                                                                               | Why this order                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **A. Foundations**       | Content model + lab runner (worker, tests, complexity gate) + Tier 0 fully upgraded | The lab runner is the long pole and Tier 0 proves the template end to end |
| **B. Tier 1**            | 12 topics: labs, 8 quiz ea., cases, 7 new viz                                       | Highest-traffic tier after 0                                              |
| **C. Tiers 2–3**         | Graphs + DP: 19 topics, 10 quiz ea., 13 new viz                                     | Where the roadmap says the real gap is                                    |
| **D. Tier 4**            | 13 topics, 12 quiz ea., 10 new viz                                                  | Deepest material, most cases                                              |
| **E. Tier 5**            | Decision cases + rubric grading                                                     | Different shape; needs A–D for context                                    |
| **F. Arena + retention** | New modes, spaced repetition, failure log                                           | Feeds on everything above                                                 |

**Effort, honestly.** Phase A is the only one with real engineering risk (the worker
sandbox and the growth-curve fit). B–E are mostly _writing_ — the per-topic content is
~600–900 words plus a lab plus 8–12 questions. That is the bulk of the work and it cannot
be faked; thin content is what we are fixing.

Suggested split: I build Phase A completely, including one exemplar topic
(`two-pointers`) at full target quality, so you can judge the bar before committing to 57
more.

---

## 7. What "done" looks like for one topic

Target for **Two pointers** (Tier 0), as the quality bar:

- **Intuition** — one paragraph on why sortedness lets you discard a whole class of
  candidates per step.
- **Mechanics** — 4 stages bound to frame ranges in the existing visualiser.
- **Complexity derivation** — the amortised argument: each pointer only moves forward, so
  total movement is bounded by n.
- **Variants** — opposite-ends, fast/slow, three-pointer partition (Dutch flag), sliding
  window as the degenerate case.
- **Trade-offs** — vs hash set (O(n) space, no sort needed, loses order); vs binary search
  per element (O(n log n)).
- **Real-world** — 4 cases, incl. `traed` strike selection (delta is monotone in strike, so
  the scan at `strike_selection_service.py:250` is really a two-pointer/binary-search
  problem) and Dutch-flag partitioning inside quicksort implementations.
- **Lab** — implement `pairSum(sorted, target)`; 8 tests incl. empty, no-solution,
  duplicates, negatives; **complexity gate O(n)** so a nested-loop solution fails even
  though it is correct.
- **Quiz** — 8 questions: 3 recall, 3 apply, 2 judge, every wrong option with a
  distractor rationale.
- **Pitfalls** — unsorted input, `lo < hi` vs `lo <= hi`, integer overflow on the midpoint.

Roughly 900 words + 40 lines of lab + 8 questions per topic. Times 58.

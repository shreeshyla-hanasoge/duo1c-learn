# Data-flow films

Short, silent, captioned videos — one per System design lesson — that follow a message
through a system. Each film is **data**: a spec in `src/specs/<topic id>.ts`, turned into a
video by one Remotion template (`src/kit/FlowFilm.tsx`). A new film is a new spec file, never
new animation code.

```bash
node --experimental-strip-types scripts/check.mts [ids…]   # does the spec fit on screen?
node --experimental-strip-types scripts/sync.mts           # register specs, wire rendered films into the site
./scripts/render.sh [ids…]                                 # render to ../public/media/concept-films/
npx remotion studio                                        # preview
```

The site shows a film through `Topic.conceptFilm`, which `src/data/systems/curriculum.ts`
fills from the generated `src/data/systems/films.ts`. Lesson files never mention films.

## What a film is

A row of 3–6 **nodes** (boxes). In each **step**, one message travels between two nodes
(optionally a second one at the same time), the nodes' **facts** update — the short line
under each name saying what that node knows right now — and one **caption** sentence explains
it. An optional row of **states** lights up as a lifecycle advances. The film ends on a
**takeaway** card.

The films play muted and looping inside the lesson, so there is no voiceover: everything
must be on screen and readable on a phone. That is why the text limits are tight and why
`scripts/check.mts` enforces them.

## Writing a spec

Models: `src/specs/sd-trade-lifecycle.ts` (a lifecycle with states) and
`src/specs/sd-fanout-backpressure.ts` (fan-out, a slow node, no states). Types and field
notes: `src/kit/types.ts`.

1. **Read the lesson first** (`../src/data/systems/topics/<id>.ts`): its `learn.intuition`,
   `learn.mechanics` and `insights`. The film shows the lesson's central mechanism with the
   lesson's own worked numbers. It must not contradict the lesson or add new facts.
2. **Find the one flow.** Ask: what single message, followed from start to end, makes this
   idea obvious? A request and its reply; a write and its replication; a tick and its
   fan-out; a failure and the recovery. Then find the **turn** — the step where the naive
   design goes wrong and the right design fixes it. A film without a turn is a diagram.
3. **Choose the nodes** — left to right in the order the message first travels, so most
   moves go rightwards and replies come back leftwards. Real roles, not abstractions:
   "Client, Load balancer, Server A, Server B", not "Component 1". Every node must send or
   receive at least once.
4. **Write 8–11 steps.** Step 1 has no move: it is the opening line that sets the scene.
   Then one idea per step. Use `facts` so the viewer can read the system's state at a
   glance — the best films are the ones where a number under a box changes and the caption
   says why (a queue length, a replica's value, a counter, a version).
5. **Tones** colour the message: `request` (asking or sending onward), `reply` (an answer
   coming back), `commit` (a write, a fill, something now true), `fault` (a timeout, a
   rejection, a lost message). Use `fault` and `health: { node: "down" | "slow" }` for the
   turn; set `health` back to `"ok"` when the node recovers.
6. **States** (optional): 2–5 chips for a real lifecycle (an order, a circuit breaker,
   a two-phase commit, a Raft node). Set `statesLabel`. Skip states when nothing has a
   lifecycle — do not invent one.
7. **Takeaway**: the sentence a reader should be able to repeat a week later, plus one line
   of how to act on it.
8. **`lesson`**: `title` is the film's own short title; `watchFor` tells the viewer the one
   thing to keep their eye on (usually a particular fact line), in 18–50 words.

## Rules

- `id` is the lesson's topic id; the export is the camelCase of it (`sdLoadBalancing`).
- `kicker` is `System design · M<n>` where n is the lesson's `tier`.
- Plain English, British spelling, short sentences, no idioms that do not travel. Numbers
  are concrete and small enough to follow (3 servers, 5 replicas, 65 units, ₹120).
- Captions are full sentences. Facts are fragments ("queue: 20", "term 3 · leader",
  "v2 · stale"). Move labels are what the message says ("write x = 5", "vote for me?").
- Nothing invented about real companies or about Traed: use what the lesson already says.
  Generic roles are better than a brand name unless the lesson is about that system.
- Run `scripts/check.mts <id>` until it passes. It checks text widths, step counts, timing
  (4–6 s per step, 40–62 s in all), that every node takes part, and that states are reached.

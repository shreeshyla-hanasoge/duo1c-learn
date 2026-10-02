# Architecture

How duo1c Learn is wired, end to end. Every claim here is traceable to a file path or a
live AWS resource id.

---

## 1. Access model — read this first

**The entire site is public. Nothing is behind the login.**

`grep -rn "authEnabled\|useAuth" src/views src/components` returns hits in
`src/components/Shell.tsx` only — the sign-in button and the sync indicator. No view, route,
topic, visualiser, quiz or Arena mode consults auth state. There is no paywall, no
login wall, and no "sign in to continue".

|                                 | Signed out          | Signed in with Google           |
| ------------------------------- | ------------------- | ------------------------------- |
| All 58 topics, 3 modes each     | ✅                  | ✅                              |
| 30 animated visualisers         | ✅                  | ✅                              |
| Arena (Rapid Fire, Survival)    | ✅                  | ✅                              |
| XP, levels, ranks, streak       | ✅                  | ✅                              |
| Badges, tier unlocking          | ✅                  | ✅                              |
| Light/dark theme                | ✅                  | ✅                              |
| Where progress is stored        | `localStorage` only | `localStorage` **and** DynamoDB |
| Survives clearing browser data  | ❌                  | ✅                              |
| Same progress on phone + laptop | ❌                  | ✅                              |

Signing in adds exactly one thing: **durability and cross-device sync**. That is the whole
difference.

### Consequences worth knowing

- **Sign-out keeps local progress on that device.** `signOut()` (`src/lib/auth.ts`) clears
  the token blob and redirects to the Cognito logout endpoint. It never touches
  `learn-duo1c-progress` in `localStorage`. On a shared machine, sign-out is not "leave no
  trace" — use Profile → _Reset all progress_ for that.
- **Reset propagates, eventually.** `reset()` clears local state; if you are signed in, the
  store subscription fires and pushes the now-empty payload ~2.5 s later, overwriting the
  DynamoDB item. Close the tab within that window and the remote copy survives.
- **Reset is not a reliable cross-device delete.** Because the merge is monotone (§4), a
  second device still holding the old data will merge it back up on its next sign-in. To
  truly delete, reset everywhere, or delete the item directly (see the runbook).
- **Sign-in is reachable from three places.** The desktop sidebar (`lg:flex`), a pill in
  the mobile header, and an Account section at the top of Profile — Profile being the only
  account surface that exists at phone width, and the only place sign-out lives there.
- **The prompt is a one-time nudge, not a wall.** `SignInPrompt` appears once the reader has
  40+ XP (learn + solve on one topic), after a 1.4 s delay so it never collides with the XP
  toast. Dismissal is permanent. It unmounts synchronously rather than via an exit
  animation, because a full-screen overlay stuck mid-exit would block the whole page.

- **Guest progress is claimed on first sign-in.** The first `startSync()` merges local into
  remote rather than replacing it, so work done signed-out is not lost when you sign in.

---

## 2. Request path

```
                      ┌──────────────────────── learn.duo1c.in
                      │                          (CNAME → CloudFront)
                      ▼
        ┌──────────────────────────┐
        │ CloudFront <DISTRIBUTION_ID>│  OAC · CSP/HSTS · SPA fallback · PriceClass 200
        └──────────┬───────────────┘
                   │ signed OAC request
                   ▼
        ┌──────────────────────────┐
        │ S3 learn-duo1c-site-…    │  private, BLOCK_ALL, SSE-S3
        └──────────────────────────┘

  browser JS ──► learn-duo1c.auth.ap-south-1.amazoncognito.com   (hosted UI → Google)
             └─► <API_ID>.execute-api.ap-south-1.amazonaws.com (progress API)
                        │ JWT authorizer (verifies before Lambda runs)
                        ▼
                 Lambda learn-duo1c-progress ──► DynamoDB learn-duo1c-progress
```

The S3 bucket has no website endpoint and no public bucket policy; a direct request to the
bucket URL returns **403**. CloudFront is the only reader, via Origin Access Control.

`403`/`404` from S3 are rewritten to `/index.html` with status `200`. Routing is
hash-based, so deep links are really `/` — but a stray path, or an OAuth redirect landing
before the SPA boots, must still get the app rather than an XML error document.

---

## 3. Authentication — authorization code + PKCE, hand-rolled

`src/lib/auth.ts`, ~250 lines, no Amplify. Amplify would add hundreds of kilobytes to a
bundle that is already large, for a flow that is this short.

```
signIn()
  1. verifier = base64url(32 random bytes)      → localStorage "learn-duo1c-pkce"
  2. challenge = base64url(SHA-256(verifier))
  3. redirect → {cognito}/oauth2/authorize
       ?response_type=code &client_id=… &redirect_uri={origin}/
       &scope=openid+email+profile
       &code_challenge={challenge} &code_challenge_method=S256
       &identity_provider=Google        ← skips the Cognito account chooser
       &state={current hash}            ← so the route survives the round trip

  … Cognito → accounts.google.com → {cognito}/oauth2/idpresponse → {origin}/?code=…&state=…

init()  (runs on every mount, App.tsx)
  4. sees ?code → POST {cognito}/oauth2/token
       grant_type=authorization_code &code_verifier={verifier}
  5. store {idToken, accessToken, refreshToken, expiresAt} → "learn-duo1c-tokens"
  6. stripAuthParams(): restore hash from state, drop ?code from the URL
  7. decode the id token locally for { sub, email, name, picture }

getIdToken()
  refreshes with a 60 s safety margin via grant_type=refresh_token
```

The app client is **public** (`generateSecret: false`). That is the only correct choice for
a static SPA — a secret shipped in a bundle is not a secret. PKCE is what replaces it.
Implicit flow is disabled; only `authorizationCodeGrant` is enabled, so tokens never appear
in a URL fragment.

**Token lifetimes:** id/access 1 hour, refresh 30 days, revocation enabled.

**`authEnabled` is a build-time gate.** `readConfig()` returns `null` unless all four of
`VITE_COGNITO_DOMAIN`, `VITE_COGNITO_CLIENT_ID`, `VITE_API_URL` and
`VITE_GOOGLE_ENABLED=true` are present. When it is `null`, the sign-in button does not
render and the app is pure localStorage — which is exactly what `npm run dev` does with no
AWS at all. The `VITE_GOOGLE_ENABLED` check exists because Google is the _only_ identity
provider: a pool without it cannot be signed into, and a button that bounces the reader to
a Cognito error page is worse than no button.

---

## 4. Progress sync

`src/lib/sync.ts`.

```
on profile appearing (App.tsx effect)
  startSync()
    GET  /progress            404 → no row yet, first sign-in
    merged = mergePayloads(local, remote)
    applyPayload(merged)      local now shows the union
    PUT  /progress            remote now shows the union

  then: subscribe to the store
    if xp | subjects | daily | streak changed → debounce 2500 ms → PUT

on sign-out
  stopSync()  — unsubscribe, clear the timer, status back to "idle"
```

### The merge is monotone, deliberately

Every field combines with `max` / `OR` / `union`:

| Field                                   | Rule                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `xp`                                    | `max` — **not** sum. Both sides derived XP from the same gates; summing double-counts shared history. |
| `streak`                                | `max`                                                                                                 |
| `lastActive`                            | later of the two                                                                                      |
| `daily[day]`                            | per-day `max`                                                                                         |
| `topics[id].learned` / `.solved`        | `OR`                                                                                                  |
| `topics[id].quizBest` / `.quizAttempts` | `max`                                                                                                 |
| `topics[id].masteredAt`                 | earliest non-null                                                                                     |
| `badges`                                | set union                                                                                             |
| `arena`                                 | concat, dedupe on `date\|score\|total\|seconds`, keep last 30                                         |

That makes the merge **commutative and idempotent**. Consequences: it does not matter which
side is "newer"; a lost response cannot lose progress; two devices working offline both
keep their gains; a retried PUT is harmless. The cost is that progress can never decrease —
correct for a mastery tracker, and the reason for the reset caveats in §1.

There is no conflict resolution because there are no conflicts to resolve.

---

## 5. Data model

One DynamoDB item per user. `learn-duo1c-progress`, on-demand, PITR on, `RETAIN`.

```
pk        = "USER#<cognito sub>"
sk        = "PROGRESS"
data      = <the SyncPayload, JSON-stringified>
updatedAt = ISO-8601
```

```jsonc
{
  "xp": 415,
  "streak": 6,
  "lastActive": "2026-07-27", // platform-level
  "daily": { "2026-07-27": 95 },
  "subjects": {
    // per-subject
    "dsa": {
      "topics": {
        "two-pointers": {
          "learned": true,
          "solved": true,
          "quizBest": 1,
          "quizAttempts": 2,
          "masteredAt": "2026-07-27",
        },
      },
      "badges": ["first-blood", "flawless"],
      "arena": [
        { "date": "2026-07-27", "score": 12, "total": 15, "seconds": 90 },
      ],
    },
  },
}
```

**Why one item.** It is a few KB, it is only ever read and written whole, and one item makes
every write atomic with no transaction. The 400 KB limit is orders of magnitude away even
with many subjects. The Lambda rejects payloads over 300 KB as a client-bug guard. Revisit
only if a subject ever needs per-attempt history — the generic `pk`/`sk` naming leaves room
for `sk = SUBJECT#dsa#ATTEMPTS` without a second table.

**Why the platform/subject split.** XP and streak answer "did you practise today", which is
subject-agnostic; gates and badges describe mastery of specific material. The store
(`src/store/progress.ts`) is shaped the same way, so `exportPayload()` is a straight field
copy with no translation layer.

---

## 6. The API

`GET /progress` and `PUT /progress`, HTTP API (API Gateway v2), one Lambda.

Auth is a **JWT authorizer** on the Cognito issuer, with `jwtAudience` pinned to the app
client id. It verifies signature, issuer, audience and expiry _before_ the Lambda is
invoked, so `event.requestContext.authorizer.jwt.claims.sub` is trustworthy and the handler
does no crypto. Verified live: unauthenticated `GET`, unauthenticated `PUT` and a junk
bearer token all return **401**.

`lambda/progress/index.mjs` has **zero npm dependencies** — the Node 22 runtime ships AWS
SDK v3, and using the raw `DynamoDBClient` (rather than `lib-dynamodb`) avoids needing a
bundler or a layer. `Code.fromAsset` on a plain directory is the whole build step.

CORS is set in two places on purpose: `corsPreflight` on the HTTP API handles `OPTIONS`,
and the handler echoes the caller's origin on actual responses — only when it is on the
`ALLOWED_ORIGINS` allow-list, otherwise the first entry. Both come from the same list in
`infra/bin/learn.ts`.

---

## 7. Frontend

### The trace engine — the core idea

Every visualiser is the **real algorithm**, instrumented to emit a `Frame[]`: a complete
snapshot of what the reader should see at each step.

```ts
// src/engine/algorithms/tier0.ts
export function twoPointers(): Trace {
  const r = new Recorder();
  while (lo < hi) {
    const s = a[lo] + a[hi];
    r.emit({ note: `a[${lo}] + a[${hi}] = ${s}.`, line: 2, cells: … });
    if (s < target) lo++;
    else hi--;
  }
  return { title: "…", code, frames: r.done() };
}
```

One `<VizPlayer>` scrubs the timeline; one `<Stage>` renders whatever a frame contains —
cells, bars, graphs, grids, DP matrices, interval charts. The payoff:

- play / pause / step / scrub / speed comes free for all 30 algorithms
- one motion vocabulary everywhere
- a stable `id` per cell means motion animates a swap as two elements _physically_ trading
  places, not two values blinking
- the algorithm source stays readable — it is the real thing with `emit()` calls

Traces are built lazily and memoised in `src/engine/registry.ts`; a few emit 100+ frames and
there is no reason to pay for one the reader never opens.

### Layout

```
src/
  engine/          trace model, instrumented algorithms (tier0–4), lazy registry
  data/            curriculum.ts (tiers, topics, quizzes, phases), subjects.ts (registry)
  store/           progress.ts — XP, gates, badges, streaks (zustand + persist v2)
  lib/             router.ts (hash), auth.ts (PKCE), sync.ts, ui.ts (motion), toast.ts
  components/      Shell, ui primitives, viz/{Stage,VizPlayer}
  views/           Dashboard, Path, Topic (+ modes/), Arena, Profile
infra/             CDK — data / auth / api / site stacks
lambda/progress/   the one Lambda
```

### Routing

`#/<subject>/<page>/...`, e.g. `#/dsa/topic/two-pointers/learn`. A leading segment naming a
known subject selects it; anything else falls back to the default, so pre-subject URLs keep
working. `href(page, subjectId)` defaults the subject so in-subject links stay terse.

### Subjects

`src/data/subjects.ts` is the registry: DSA and Trading concepts. Routes, the progress
namespace, badges, glossary, Arena and the wording the shared views use are all keyed by or
carried on the subject. Leaf components (`Prose`, `TierBadge`) read the current subject from
`SubjectContext` rather than having it threaded through every caller. The sync payload was
already `subjects: Record<id, …>`, so a second subject needed no backend change. Adding one
is described in [content.md](./content.md).

---

## 8. Three conventions that are load-bearing

**1. Encoding colours are validated, not chosen by taste.** The three visualiser state hues
were run through a CVD/contrast validator at all-pairs in both themes:

| Role             | Light     | Dark      |
| ---------------- | --------- | --------- |
| cursor (current) | `#2a78d6` | `#3987e5` |
| scan (comparing) | `#eb6834` | `#d95926` |
| match (settled)  | `#1baf7a` | `#199e70` |

Worst all-pairs CVD ΔE 9.2 light / 9.4 dark; normal-vision 24.0 / 20.9. A **fourth**
encoding hue fails the gate, which is why "eliminated" is neutral + strike-through rather
than a new colour. Tier badges use an ordinal single-hue ramp, not categorical hues. The
legend always names each state, so colour is never the only channel.

Theme tokens are declared with `@theme static` in `index.css` — Tailwind v4 prunes
variables no utility class references, and the tier ramp and `viz-idle` are read only from
inline styles. Dropping `static` silently makes them resolve to empty.

**2. Container entrances animate position, never opacity.** If a fade-in never completes — a
suspended renderer, a tab restored from bfcache, a dropped frame — an `opacity: 0` container
leaves the whole screen blank with no way back. Containers, stat values and narration lines
animate `y`/`scale` only. Opacity fades are reserved for transient UI where a stuck element
is cosmetic.

For the same reason there is **no `<AnimatePresence mode="wait">` on anything route- or
timer-driven**: two changes in one frame can leave the outgoing view stuck mid-exit and the
incoming one never mounted. Keyed enter animations cannot wedge.

**2b. The lab worker is the only file allowed `unsafe-eval`.** Running reader-written code
needs `new Function`, which `script-src 'self'` blocks. Rather than weakening the page's
policy, the worker is served from a stable path (`/assets/lab-worker.js`) with its own
CloudFront response-headers policy: `default-src 'none'; script-src 'self' 'unsafe-eval'`.
A dedicated same-origin worker takes its CSP from its own response headers, so the
exception cannot leak to the document. A blob-URL worker would _inherit_ the page policy
instead — which is exactly why the worker is loaded from a real URL. Because the filename
is unhashed so CloudFront can path-match it, the deploy invalidates it explicitly.

**3. Tokens live in `localStorage`.** The standard trade for a static SPA with no
backend-for-frontend: an XSS would expose the refresh token. Mitigated by the strict CSP on
CloudFront and one-hour token lifetimes. The upgrade path, if that trade stops being
acceptable, is a Lambda@Edge BFF issuing httpOnly cookies.

---

## 9. Resource inventory

Account **<ACCOUNT_ID>**, region **ap-south-1** unless noted.

| Resource             | Identifier                                                                 |
| -------------------- | -------------------------------------------------------------------------- |
| CloudFront           | `<DISTRIBUTION_ID>` → `<DIST_DOMAIN>.cloudfront.net`, alias `learn.duo1c.in` |
| ACM cert (us-east-1) | `…:certificate/<CERT_ID>`                       |
| S3 site bucket       | `learn-duo1c-site-<ACCOUNT_ID>-ap-south-1`                                 |
| Cognito user pool    | `<USER_POOL_ID>`                                                     |
| Cognito app client   | `<APP_CLIENT_ID>`                                               |
| Hosted UI            | `learn-duo1c.auth.ap-south-1.amazoncognito.com`                            |
| HTTP API             | `https://<API_ID>.execute-api.ap-south-1.amazonaws.com`                  |
| Lambda               | `learn-duo1c-progress` (Node 22, 256 MB, 10 s)                             |
| DynamoDB             | `learn-duo1c-progress` (on-demand, PITR, RETAIN)                           |
| Secret               | `learn-duo1c/google-oauth`                                                 |
| Log group            | `/aws/lambda/learn-duo1c-progress` (30-day retention)                      |
| DNS                  | GoDaddy (`ns67/68.domaincontrol.com`) — **not** Route 53                   |

Registered OAuth callbacks: `http://localhost:5173/`,
`https://<DIST_DOMAIN>.cloudfront.net/`, `https://learn.duo1c.in/`.
Cognito matches these **exactly**, and the app redirects to `origin + "/"`.

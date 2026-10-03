import { authConfig, getIdToken } from "./auth";
import {
  useProgress,
  type SubjectProgress,
  type SyncPayload,
} from "../store/progress";
import { foldSubjectAliases, mergeSubject } from "../data/progress-model";

/* ------------------------------------------------------------------ *
 * Progress sync.
 *
 * The merge is deliberately MONOTONE — every field combines with max /
 * OR / union. That makes it commutative and idempotent, so it does not
 * matter which side is "newer", a lost response cannot lose progress,
 * and two devices editing offline both keep their gains. The price is
 * that progress can never go down, which is exactly right for a
 * mastery tracker (and why "reset" is local-only until the next push).
 * ------------------------------------------------------------------ */

const PUSH_DEBOUNCE_MS = 2500;

function laterISO(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function mergePayloads(a: SyncPayload, b: SyncPayload): SyncPayload {
  const daily: Record<string, number> = { ...a.daily };
  for (const [day, xp] of Object.entries(b.daily)) {
    daily[day] = Math.max(daily[day] ?? 0, xp);
  }

  const subjects: Record<string, SubjectProgress> = {};
  for (const id of new Set([
    ...Object.keys(a.subjects),
    ...Object.keys(b.subjects),
  ])) {
    const left = a.subjects[id];
    const right = b.subjects[id];
    subjects[id] = left && right ? mergeSubject(left, right) : (left ?? right);
  }

  return {
    // Both sides derived XP from the same monotone gates, so max is the
    // correct reconciliation — summing would double-count shared history.
    xp: Math.max(a.xp, b.xp),
    streak: Math.max(a.streak, b.streak),
    lastActive: laterISO(a.lastActive, b.lastActive),
    daily,
    // A subject that was folded into another (Price Dynamics → Trading)
    // can still arrive from an older device or the server; fold it here so
    // it never reappears as a subject of its own.
    subjects: foldSubjectAliases(subjects),
  };
}

/* ---- Transport ----------------------------------------------------- */

async function request<T>(
  method: "GET" | "PUT",
  body?: unknown,
): Promise<T | null> {
  if (!authConfig) return null;
  const token = await getIdToken();
  if (!token) return null;

  const res = await fetch(`${authConfig.apiUrl}/progress`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 404) return null; // no row yet — first sign-in
  if (!res.ok) throw new Error(`${method} /progress failed (${res.status})`);
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

export async function pull(): Promise<SyncPayload | null> {
  return request<SyncPayload>("GET");
}

export async function push(payload: SyncPayload): Promise<void> {
  await request("PUT", payload);
}

/* ---- Lifecycle ----------------------------------------------------- */

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

/**
 * Pulls remote progress, merges it into local, pushes the result, then
 * keeps pushing on a debounce for the rest of the session.
 */
export async function startSync(): Promise<void> {
  if (!authConfig || running) return;
  running = true;

  const store = useProgress.getState();
  store.setSync("syncing");

  try {
    const remote = await pull();
    const local = store.exportPayload();
    const merged = remote ? mergePayloads(local, remote) : local;

    store.applyPayload(merged);
    await push(merged);
    store.setSync("synced");
  } catch (e) {
    store.setSync("error", e instanceof Error ? e.message : "Sync failed");
  }

  // Push subsequent local changes. Only the syncable slice is watched, so
  // toggling the theme does not trigger a network call.
  unsubscribe?.();
  unsubscribe = useProgress.subscribe((s, prev) => {
    if (
      s.xp === prev.xp &&
      s.subjects === prev.subjects &&
      s.daily === prev.daily &&
      s.streak === prev.streak
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const st = useProgress.getState();
      st.setSync("syncing");
      try {
        await push(st.exportPayload());
        st.setSync("synced");
      } catch (e) {
        st.setSync("error", e instanceof Error ? e.message : "Sync failed");
      }
    }, PUSH_DEBOUNCE_MS);
  });
}

export function stopSync(): void {
  running = false;
  unsubscribe?.();
  unsubscribe = null;
  if (timer) clearTimeout(timer);
  timer = null;
  useProgress.getState().setSync("idle");
}

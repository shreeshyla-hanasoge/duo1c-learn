import { useEffect, useState, useCallback } from "react";
import { DEFAULT_SUBJECT_ID, resolveSubjectId } from "../data/subjects";

/**
 * A ~60-line hash router.
 *
 * Deliberately not react-router: keyed enter animations need the route to be
 * plain state the view layer owns, and the whole app is six pages.
 *
 * Every route carries a subject. The hash is `#/<subject>/<page>/...`, so a
 * second subject needs no routing work.
 */

export type TopicMode = "learn" | "solve" | "quiz";

export type Page =
  | { name: "dashboard" }
  | { name: "path" }
  | { name: "tier"; id: number }
  | { name: "topic"; id: string; mode: TopicMode }
  | { name: "arena" }
  | { name: "profile" };

export type Route = Page & { subject: string };

const isMode = (v: string): v is TopicMode =>
  v === "learn" || v === "solve" || v === "quiz";

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);

  // A leading segment naming a known subject selects it; anything else is a
  // pre-subject URL and falls back to the default, so old links keep working.
  // A retired subject id (price-dynamics) resolves to the subject that
  // absorbed it, so bookmarks and shared links keep working.
  const known = parts.length ? resolveSubjectId(parts[0]) : null;
  if (known) parts.shift();
  const subject = known ?? DEFAULT_SUBJECT_ID;

  const [head, ...rest] = parts;

  switch (head) {
    case undefined:
    case "dashboard":
      return { subject, name: "dashboard" };
    case "path":
      return { subject, name: "path" };
    case "arena":
      return { subject, name: "arena" };
    case "profile":
      return { subject, name: "profile" };
    case "tier": {
      // A non-numeric or missing id is a hand-edited URL, not a real page —
      // fall back to the path rather than rendering an empty tier.
      const id = Number(rest[0]);
      if (!rest[0] || !Number.isInteger(id)) return { subject, name: "path" };
      return { subject, name: "tier", id };
    }
    case "topic": {
      const id = rest[0];
      if (!id) return { subject, name: "path" };
      const mode = rest[1];
      return {
        subject,
        name: "topic",
        id,
        mode: mode && isMode(mode) ? mode : "learn",
      };
    }
    default:
      return { subject, name: "dashboard" };
  }
}

/** `subject` is optional at call sites so links inside a subject stay terse. */
export function href(page: Page, subject: string = DEFAULT_SUBJECT_ID): string {
  const base = `#/${subject}`;
  switch (page.name) {
    case "dashboard":
      return `${base}/dashboard`;
    case "path":
      return `${base}/path`;
    case "arena":
      return `${base}/arena`;
    case "profile":
      return `${base}/profile`;
    case "tier":
      return `${base}/tier/${page.id}`;
    case "topic":
      return `${base}/topic/${page.id}/${page.mode}`;
  }
}

/** A stable key per *page*, so switching tabs within a topic doesn't remount. */
export function routeKey(route: Route): string {
  if (route.name === "topic") return `${route.subject}:topic:${route.id}`;
  if (route.name === "tier") return `${route.subject}:tier:${route.id}`;
  return `${route.subject}:${route.name}`;
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback(
    (page: Page, subject: string = DEFAULT_SUBJECT_ID) => {
      const target = href(page, subject);
      if (window.location.hash === target) return;
      window.location.hash = target;
    },
    [],
  );

  return { route, navigate };
}

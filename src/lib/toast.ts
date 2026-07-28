import confetti from "canvas-confetti";

export interface Toast {
  id: number;
  kind: "xp" | "badge" | "info";
  title: string;
  detail?: string;
}

type Listener = (t: Toast) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function onToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function toast(kind: Toast["kind"], title: string, detail?: string) {
  const t: Toast = { id: nextId++, kind, title, detail };
  listeners.forEach((fn) => fn(t));
}

export function xpToast(amount: number, detail?: string) {
  if (amount <= 0) return;
  toast("xp", `+${amount} XP`, detail);
}

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Celebration is reinforcement only — it carries no information, so it is
 *  the first thing to drop when the reader asks for less motion. */
export function celebrate(intensity: "small" | "large" = "small") {
  if (reduced()) return;
  const base = {
    colors: ["#3987e5", "#d95926", "#199e70", "#f3f5f8"],
    disableForReducedMotion: true,
    scalar: 0.9,
  };
  if (intensity === "large") {
    confetti({
      ...base,
      particleCount: 90,
      spread: 78,
      origin: { y: 0.62 },
      startVelocity: 42,
    });
    setTimeout(
      () =>
        confetti({
          ...base,
          particleCount: 50,
          spread: 100,
          origin: { y: 0.7 },
          scalar: 0.7,
        }),
      160,
    );
  } else {
    confetti({
      ...base,
      particleCount: 34,
      spread: 55,
      origin: { y: 0.7 },
      startVelocity: 28,
    });
  }
}

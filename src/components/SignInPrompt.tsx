import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Cloud, Smartphone, Unlock, X } from "lucide-react";
import { authEnabled, useAuth } from "../lib/auth";
import { useProgress } from "../store/progress";
import { spring } from "../lib/ui";
import { GoogleSignInButton } from "./Account";

/**
 * A one-time nudge to sign in, shown only once there is progress worth
 * protecting.
 *
 * Deliberately NOT shown on first load: at 0 XP the offer is meaningless and
 * reads as a login wall, which this app does not have. The threshold is two
 * completed actions, so the reader has already felt the thing they would lose.
 * Dismissal is permanent — sign-in stays reachable from the header and the
 * Profile page, so nagging buys nothing.
 */

const DISMISS_KEY = "learn-duo1c-signin-prompt-dismissed";
/** learn (20) + solve (35) — i.e. the reader has finished something. */
const XP_THRESHOLD = 40;

const BENEFITS = [
  {
    icon: Cloud,
    text: "Survives clearing this browser, or switching to a new one",
  },
  { icon: Smartphone, text: "Same XP, streak and gates on your phone" },
  {
    icon: Unlock,
    text: "Nothing gets locked — every topic is already open to everyone",
  },
];

export function SignInPrompt() {
  const profile = useAuth((s) => s.profile);
  const xp = useProgress((s) => s.xp);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  );
  const [open, setOpen] = useState(false);

  const eligible = authEnabled && !profile && !dismissed && xp >= XP_THRESHOLD;

  // A short delay so the prompt never lands on top of the XP toast and
  // confetti from the action that just crossed the threshold.
  useEffect(() => {
    if (!eligible) {
      setOpen(false);
      return;
    }
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, [eligible]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      // Dismiss on backdrop tap. This also means a backdrop whose fade
      // never completed can still be tapped away rather than trapping
      // the reader behind an invisible overlay.
      onClick={dismiss}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-prompt-title"
    >
      <motion.div
        // Slides, does not fade: the sheet itself must never be a
        // transparent click-trap.
        initial={{ y: 40, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-line bg-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="signin-prompt-title" className="text-lg font-semibold">
              Keep this progress?
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Your {xp} XP and cleared gates live only in this browser right
              now.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <li
                key={b.text}
                className="flex items-start gap-2.5 text-sm text-ink-2"
              >
                <Icon
                  size={15}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--color-viz-cursor)" }}
                />
                {b.text}
              </li>
            );
          })}
        </ul>

        <GoogleSignInButton size="lg" className="mt-5 w-full" />
        <button
          onClick={dismiss}
          className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          Not now
        </button>
      </motion.div>
    </motion.div>
  );
}

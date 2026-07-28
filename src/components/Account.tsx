import { LogIn } from "lucide-react";
import { authEnabled, useAuth } from "../lib/auth";
import { useProgress } from "../store/progress";
import { cn } from "../lib/ui";

/**
 * Sign-in / signed-in identity.
 *
 * Lives in its own module because it has to appear in three places — the
 * desktop sidebar, the Profile page (the only account surface that exists on
 * a phone-sized viewport) and the sign-in prompt. It renders nothing at all
 * when auth is not configured.
 */

export function SyncLine({ className }: { className?: string }) {
  const status = useProgress((s) => s.syncStatus);
  const error = useProgress((s) => s.syncError);
  const label =
    status === "syncing"
      ? "Syncing…"
      : status === "synced"
        ? "Progress synced"
        : status === "error"
          ? (error ?? "Sync failed")
          : "Local only";
  return (
    <p
      className={cn("truncate text-[10px]", className)}
      style={{
        color:
          status === "error"
            ? "var(--color-viz-critical)"
            : "var(--color-ink-3)",
      }}
    >
      {label}
    </p>
  );
}

export function GoogleSignInButton({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  const busy = useAuth((s) => s.busy);
  const signIn = useAuth((s) => s.signIn);
  return (
    <button
      onClick={() => void signIn()}
      disabled={busy}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50",
        size === "lg"
          ? "h-12 px-5 text-sm text-white"
          : "border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink hover:border-line-strong",
        className,
      )}
      style={
        size === "lg" ? { background: "var(--color-viz-cursor)" } : undefined
      }
    >
      <LogIn size={size === "lg" ? 16 : 14} />
      {busy ? "Signing in…" : "Sign in with Google"}
    </button>
  );
}

export function AccountBlock({ className }: { className?: string }) {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);

  if (!authEnabled) return null;

  if (!profile) {
    return (
      <div className={className}>
        <GoogleSignInButton className="w-full" />
        <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-3">
          Optional — everything is already unlocked. Signing in just keeps your
          progress if you switch device or clear this browser.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface-2 p-3",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {profile.picture ? (
          <img
            src={profile.picture}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px]">
            {(profile.name ?? profile.email ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {profile.name ?? profile.email}
          </p>
          <SyncLine />
        </div>
      </div>
      <button
        onClick={signOut}
        className="mt-2 w-full rounded-lg px-2 py-1.5 text-[11px] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}

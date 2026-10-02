import { type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Home,
  Map,
  Swords,
  User,
  Moon,
  Sun,
  Flame,
  Cloud,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { href, type Page, type Route } from "../lib/router";
import { levelProgress, rankFor, useProgress } from "../store/progress";
import { authEnabled, useAuth } from "../lib/auth";
import { AccountBlock } from "./Account";
import { SUBJECTS, type Subject } from "../data/subjects";
import { cn, spring } from "../lib/ui";

const NAV: { page: Page; label: string; icon: typeof Home }[] = [
  { page: { name: "dashboard" }, label: "Home", icon: Home },
  { page: { name: "path" }, label: "Path", icon: Map },
  { page: { name: "arena" }, label: "Arena", icon: Swords },
  { page: { name: "profile" }, label: "You", icon: User },
];

export function Shell({
  route,
  subject,
  children,
}: {
  route: Route;
  subject: Subject;
  children: ReactNode;
}) {
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak);
  const theme = useProgress((s) => s.theme);
  const toggleTheme = useProgress((s) => s.toggleTheme);
  const { level, into, need, pct } = levelProgress(xp);

  // Tiers and topics both live under the path, so the nav keeps "Path" lit
  // rather than dropping every highlight on a deep page.
  const active =
    route.name === "topic" || route.name === "tier" ? "path" : route.name;

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* ---- Desktop sidebar ---- */}
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface-1 p-5 lg:flex">
        <Brand subject={subject} />
        <SubjectPills current={subject.id} />

        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              subject={subject.id}
              active={active === item.page.name}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-ink">
                Level {level}
                <span className="ml-1.5 text-ink-3">{rankFor(level)}</span>
              </span>
              <span className="tabular font-mono text-[11px] text-ink-3">
                {xp} XP
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--color-viz-cursor)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct * 100}%` }}
                transition={spring}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-ink-3">
                {into}/{need} to next
              </span>
              {streak > 0 && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
                  <Flame size={11} style={{ color: "var(--color-viz-scan)" }} />
                  {streak}d
                </span>
              )}
            </div>
          </div>

          <AccountBlock />

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      {/* ---- Mobile header ---- */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Brand subject={subject} compact />
          <SubjectSelect current={subject} />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SyncDot />
          {streak > 0 && (
            <span className="flex items-center gap-1 font-mono text-xs text-ink-2">
              <Flame size={13} style={{ color: "var(--color-viz-scan)" }} />
              {streak}
            </span>
          )}
          <span className="tabular font-mono text-xs text-ink-2">L{level}</span>
          <MobileAccount subject={subject.id} />
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="text-ink-3"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ---- Content ---- */}
      <main className="min-w-0 flex-1 pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>

      {/* ---- Mobile tab bar ---- */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line lg:hidden">
        {NAV.map((item) => {
          const on = active === item.page.name;
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={href(item.page, subject.id)}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
              style={{
                color: on ? "var(--color-ink)" : "var(--color-ink-3)",
              }}
            >
              {/* Same reasoning as the sidebar's NavLink — no sliding pill. */}
              {on && (
                <span
                  className="absolute inset-x-4 top-1 bottom-1 -z-10 rounded-xl"
                  style={{ background: "var(--color-surface-2)" }}
                />
              )}
              <Icon size={18} />
              <span className="text-[10px]">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * The mobile header's account affordance — the sidebar that holds
 * <AccountBlock> is `lg:flex`, so without this there is no way to sign in
 * from a phone at all. Signed out it is an explicit "Sign in" pill (an avatar
 * placeholder would not read as an action); signed in it is the avatar,
 * linking to Profile where sign-out lives.
 */
function MobileAccount({ subject }: { subject: string }) {
  const profile = useAuth((s) => s.profile);
  const busy = useAuth((s) => s.busy);
  const signIn = useAuth((s) => s.signIn);

  if (!authEnabled) return null;

  if (!profile) {
    return (
      <button
        onClick={() => void signIn()}
        disabled={busy}
        className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink transition-colors disabled:opacity-50"
      >
        {busy ? "…" : "Sign in"}
      </button>
    );
  }

  return (
    <a
      href={href({ name: "profile" }, subject)}
      aria-label="Your account"
      className="shrink-0"
    >
      {profile.picture ? (
        <img
          src={profile.picture}
          alt=""
          className="h-6 w-6 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-3 text-[10px]">
          {(profile.name ?? profile.email ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </a>
  );
}

function SyncDot() {
  const status = useProgress((s) => s.syncStatus);
  const profile = useAuth((s) => s.profile);
  if (!authEnabled || !profile) return null;
  if (status === "syncing")
    return <RefreshCw size={13} className="animate-spin text-ink-3" />;
  if (status === "error")
    return (
      <CloudOff size={13} style={{ color: "var(--color-viz-critical)" }} />
    );
  return <Cloud size={13} style={{ color: "var(--color-viz-match)" }} />;
}

/**
 * The subject switcher. Links, not state: the subject lives in the hash, so
 * switching is a navigation and the back button undoes it.
 */
function SubjectPills({ current }: { current: string }) {
  if (SUBJECTS.length < 2) return null;
  return (
    <div className="mt-6 grid grid-cols-1 gap-1" aria-label="Subjects">
      <p className="px-1 text-[10px] tracking-wide text-ink-3 uppercase">
        Subjects
      </p>
      {SUBJECTS.map((s) => {
        const on = s.id === current;
        return (
          <a
            key={s.id}
            href={href({ name: "dashboard" }, s.id)}
            aria-current={on ? "page" : undefined}
            className={cn(
              "min-w-0 rounded-lg border px-3 py-2 text-xs transition-colors",
              on
                ? "border-line-strong bg-surface-2 text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2",
            )}
          >
            <span className="block truncate font-medium">{s.short}</span>
            <span className="block truncate text-[10px] text-ink-3">
              {s.name}
            </span>
          </a>
        );
      })}
    </div>
  );
}

/**
 * Phone-width switcher. A native <select> rather than a custom menu: it
 * cannot get stuck open, needs no overlay, and the OS draws the picker.
 */
function SubjectSelect({ current }: { current: Subject }) {
  if (SUBJECTS.length < 2) return null;
  return (
    <label className="relative min-w-0">
      <span className="sr-only">Subject</span>
      <select
        value={current.id}
        onChange={(e) => {
          window.location.hash = href({ name: "dashboard" }, e.target.value);
        }}
        className="max-w-[7.5rem] truncate rounded-full border border-line bg-surface-2 py-1 pr-6 pl-2.5 text-[11px] font-medium text-ink"
      >
        {SUBJECTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.short}
          </option>
        ))}
      </select>
    </label>
  );
}

function Brand({ subject, compact }: { subject: Subject; compact?: boolean }) {
  return (
    <a
      href={href({ name: "dashboard" }, subject.id)}
      className="flex items-center gap-2.5"
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-lg font-mono text-sm font-bold text-white"
        style={{ background: "var(--color-viz-cursor)" }}
        aria-hidden
      >
        d1
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">duo1c Learn</span>
        {!compact && (
          <span className="block text-[11px] text-ink-3">{subject.short}</span>
        )}
      </span>
    </a>
  );
}

function NavLink({
  item,
  subject,
  active,
}: {
  item: { page: Page; label: string; icon: typeof Home };
  subject: string;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <a
      href={href(item.page, subject)}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active ? "text-ink" : "text-ink-3 hover:text-ink-2",
      )}
    >
      {/* A plain span, deliberately NOT a shared-layout `layoutId` pill.
          With one, motion animates the highlight from the previously active
          row to this one, so every navigation drags a rectangle up or down
          the sidebar. The highlight marks where you are; it should already
          be there when the page arrives, not travel to it. */}
      {active && (
        <span
          className="absolute inset-0 -z-10 rounded-xl border border-line"
          style={{ background: "var(--color-surface-2)" }}
        />
      )}
      <Icon size={17} />
      {item.label}
    </a>
  );
}

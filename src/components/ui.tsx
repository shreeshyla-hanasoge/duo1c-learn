import { forwardRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn, spring, springSnap } from "../lib/ui";

/* ---- Buttons ------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "outline", size = "md", className, children, ...rest },
    ref,
  ) {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={springSnap}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors select-none",
          "disabled:cursor-not-allowed disabled:opacity-40",
          size === "sm" && "h-8 px-3 text-xs",
          size === "md" && "h-10 px-4 text-sm",
          size === "lg" && "h-12 px-6 text-base",
          variant === "primary" && "text-white",
          variant === "outline" &&
            "border border-line bg-surface-2 text-ink hover:border-line-strong",
          variant === "ghost" && "text-ink-2 hover:bg-surface-2 hover:text-ink",
          className,
        )}
        style={
          variant === "primary"
            ? { background: "var(--color-viz-cursor)" }
            : undefined
        }
        {...(rest as React.ComponentProps<typeof motion.button>)}
      >
        {children}
      </motion.button>
    );
  },
);

/* ---- Surfaces ----------------------------------------------------- */

export function Card({
  children,
  className,
  interactive,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "surface rounded-2xl",
        interactive && "transition-colors hover:border-line-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "cursor" | "match" | "scan";
  className?: string;
}) {
  const bg =
    tone === "neutral"
      ? "var(--color-surface-3)"
      : `color-mix(in oklab, var(--color-viz-${tone}) 20%, transparent)`;
  const border =
    tone === "neutral" ? "var(--color-line)" : `var(--color-viz-${tone})`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap",
        className,
      )}
      style={{
        background: bg,
        borderColor: border,
        color: "var(--color-ink-2)",
      }}
    >
      {children}
    </span>
  );
}

/** Tier badges use an ordinal single-hue ramp, not categorical hues. */
export function TierBadge({
  tier,
  className,
}: {
  tier: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid h-6 min-w-6 place-items-center rounded-md px-1.5 font-mono text-[11px] font-semibold",
        className,
      )}
      style={{
        background: `var(--color-tier-${tier})`,
        color: tier <= 2 ? "#0b0d10" : "#ffffff",
      }}
    >
      T{tier}
    </span>
  );
}

/* ---- Progress ----------------------------------------------------- */

export function ProgressRing({
  pct,
  size = 84,
  stroke = 7,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-viz-cursor)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{
            strokeDashoffset: c * (1 - Math.min(1, Math.max(0, pct))),
          }}
          transition={{ ...spring, delay: 0.1 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** A single ratio against a limit — same-ramp track, per the viz guidance. */
export function Meter({
  pct,
  label,
  value,
  className,
}: {
  pct: number;
  label?: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {(label || value) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-xs text-ink-3">{label}</span>}
          {value && (
            <span className="tabular font-mono text-xs text-ink-2">
              {value}
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--color-viz-cursor)" }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
          transition={spring}
        />
      </div>
    </div>
  );
}

/** Stat tile — a headline number, not a one-bar bar chart. */
export function StatTile({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] tracking-wide text-ink-3 uppercase">
          {label}
        </span>
        {icon && <span className="text-ink-3">{icon}</span>}
      </div>
      <motion.div
        key={String(value)}
        // y-only: a stat's value must never be hidden by an unfinished
        // animation. See the note on pageVariants in lib/ui.
        initial={{ y: 8 }}
        animate={{ y: 0 }}
        transition={springSnap}
        className="tabular mt-1 text-3xl font-semibold"
        style={accent ? { color: "var(--color-viz-cursor)" } : undefined}
      >
        {value}
      </motion.div>
      {sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
    </Card>
  );
}

/** Activity strip — 8 weeks of daily XP as a sequential single-hue ramp. */
export function ActivityStrip({ daily }: { daily: Record<string, number> }) {
  const days: { iso: string; xp: number }[] = [];
  const now = new Date();
  for (let i = 55; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, xp: daily[iso] ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.xp));

  return (
    <div
      className="grid grid-flow-col grid-rows-7 gap-1"
      style={{ gridAutoColumns: "1fr" }}
    >
      {days.map((d, i) => {
        const t = d.xp === 0 ? 0 : 0.25 + 0.75 * (d.xp / max);
        return (
          <motion.div
            key={d.iso}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springSnap, delay: Math.min(0.4, i * 0.004) }}
            title={`${d.iso} — ${d.xp} XP`}
            className="aspect-square rounded-[3px]"
            style={{
              background:
                t === 0
                  ? "var(--color-surface-3)"
                  : `color-mix(in oklab, var(--color-viz-cursor) ${Math.round(t * 100)}%, var(--color-surface-3))`,
            }}
          />
        );
      })}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-ink-2 uppercase">
        {children}
      </h2>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
      {children}
    </div>
  );
}

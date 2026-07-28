import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Award, Sparkles, Info } from "lucide-react";
import { onToast, type Toast } from "../lib/toast";
import { spring } from "../lib/ui";

const ICON = { xp: Sparkles, badge: Award, info: Info };

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(
    () =>
      onToast((t) => {
        setItems((prev) => [...prev, t].slice(-3));
        setTimeout(
          () => setItems((prev) => prev.filter((x) => x.id !== t.id)),
          2600,
        );
      }),
    [],
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {items.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={spring}
              className="glass flex items-center gap-2.5 rounded-full border border-line py-2 pr-4 pl-3 shadow-lg"
            >
              <Icon size={15} style={{ color: "var(--color-viz-cursor)" }} />
              <span className="text-sm font-medium text-ink">{t.title}</span>
              {t.detail && (
                <span className="text-xs text-ink-3">{t.detail}</span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

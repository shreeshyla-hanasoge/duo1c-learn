import type { QuizFigure as Fig } from "../../data/types";
import type { CellState } from "../../engine/trace";
import { levels } from "../../engine/trading/profile";
import { LadderPanel } from "./ProfilePanels";

/** The profile a "read this profile" question is about. */
export function QuizFigure({ fig }: { fig: Fig }) {
  const L = fig.showValueArea ? levels(fig) : null;
  const stateOf = (i: number): CellState | undefined => {
    if (!L) return undefined;
    const lo = fig.lo + i * fig.step;
    if (lo + fig.step / 2 === L.poc) return "cursor";
    if (lo >= L.val && lo < L.vah) return "match";
    return undefined;
  };
  return (
    <div className="surface rounded-xl p-3">
      <LadderPanel
        view={{
          step: fig.step,
          rows: fig.bins.map((v, i) => ({
            id: `q${i}`,
            lo: fig.lo + i * fig.step,
            v,
            s: stateOf(i),
          })),
          lines: [
            ...(L
              ? [
                  { price: L.vah, label: "VAH" },
                  { price: L.poc, label: "POC", s: "cursor" as const },
                  { price: L.val, label: "VAL" },
                ]
              : []),
            ...(fig.lines ?? []),
          ],
          caption: fig.caption,
        }}
      />
      {L && (
        <p className="mt-2 text-[11px] text-ink-3">
          Shaded rows: value area (70%). Marked row: POC.
        </p>
      )}
    </div>
  );
}

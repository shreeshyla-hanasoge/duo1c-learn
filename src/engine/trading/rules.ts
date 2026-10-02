/**
 * Profile ideas phrased as unambiguous, testable rules.
 *
 * Every rule here is ONE operational reading of an idea that the books state
 * in words. The words leave choices open (what counts as "in value", which
 * period starts the count, what "fills" means); each choice is written down
 * here so a backtest, a lesson and a lab all mean the same thing.
 */
import { zoneOf, type Bar, type Levels, type Zone } from "./profile.ts";

/** Where today opened relative to yesterday's value AND range. */
export type OpenPlace =
  | "above range"
  | "above value, inside range"
  | "inside value"
  | "below value, inside range"
  | "below range";

export function openPlace(
  open: number,
  y: Levels,
  yHigh: number,
  yLow: number,
): OpenPlace {
  if (open > yHigh) return "above range";
  if (open < yLow) return "below range";
  const z: Zone = zoneOf(open, y.vah, y.val);
  return z === "inside"
    ? "inside value"
    : z === "above"
      ? "above value, inside range"
      : "below value, inside range";
}

export interface EightyResult {
  /** Opened outside value? Without that the rule does not apply. */
  applies: boolean;
  side: "below" | "above" | null;
  /** Index of the 30-minute period whose close completed the trigger, or -1. */
  trigger: number;
  /** The far edge of value — the 80% rule's target. */
  target: number | null;
  /** Did price reach the target after the trigger, before the close? */
  filled: boolean;
  /** Bar index where the target was reached, or -1. */
  filledAt: number;
}

/**
 * The 80% rule, made testable. This course's reading:
 *
 *   1. Today OPENS outside yesterday's value area (strictly above VAH or
 *      strictly below VAL).
 *   2. A 30-minute period "is in value" when it CLOSES inside yesterday's
 *      value area, edges included.
 *   3. The rule TRIGGERS at the end of the second consecutive such period.
 *   4. It SUCCEEDS if, after the trigger and before the close, price trades
 *      at or beyond the far edge of value (VAH if it opened below).
 *
 * Other honest readings exist, and the sources disagree: Dalton's own
 * wording (as quoted from the first edition of Mind Over Markets in a 2008
 * Team LBR post) does not require the two periods to be consecutive;
 * ShadowTrader's glossary does; some sites only require a touch of the
 * value-area edge. Counting periods that trade ENTIRELY inside value, or
 * counting from the first touch, gives different hit rates on the same
 * data. Pick one before you look at results (docs/trading/sources.md §C).
 */
export function eightyRule(bars: Bar[], y: Levels, period = 30): EightyResult {
  const open = bars[0].open;
  const side = open < y.val ? "below" : open > y.vah ? "above" : null;
  if (!side)
    return { applies: false, side, trigger: -1, target: null, filled: false, filledAt: -1 };
  const target = side === "below" ? y.vah : y.val;
  let run = 0;
  let trigger = -1;
  for (let k = 0; k * period < bars.length; k++) {
    const g = bars.slice(k * period, (k + 1) * period);
    const close = g[g.length - 1].close;
    run = zoneOf(close, y.vah, y.val) === "inside" ? run + 1 : 0;
    if (run === 2) {
      trigger = k;
      break;
    }
  }
  let filledAt = -1;
  if (trigger >= 0) {
    for (let i = (trigger + 1) * period; i < bars.length; i++) {
      const b = bars[i];
      if (side === "below" ? b.high >= target : b.low <= target) {
        filledAt = i;
        break;
      }
    }
  }
  return { applies: true, side, trigger, target, filled: filledAt >= 0, filledAt };
}

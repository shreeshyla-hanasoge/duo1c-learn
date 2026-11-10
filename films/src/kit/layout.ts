/**
 * Layout numbers shared by the film (`FlowFilm.tsx`) and the spec checker
 * (`scripts/check.mts`), so the checker's idea of "fits" is the film's.
 * No imports: the checker loads this file under plain Node.
 */

export const FRAME_W = 1920;
export const SIDE = 80;
export const GAP = 40;

/** Text sizes shrink once a sixth node makes the cards narrow. */
export function sizes(nodeCount: number) {
  const dense = nodeCount >= 6;
  return {
    role: dense ? 20 : 24,
    label: dense ? 38 : 46,
    fact: dense ? 28 : 32,
    pad: dense ? 20 : 26,
  };
}

/** The width of text a card can hold, in pixels. */
export function cardInner(nodeCount: number) {
  const cardW = (FRAME_W - 2 * SIDE - (nodeCount - 1) * GAP) / nodeCount;
  return cardW - 2 * sizes(nodeCount).pad - 6;
}

/** Rough advance width of Inter at weight 500, as a fraction of the font size. */
function advance(ch: string): number {
  if (ch === " " || ch === "·" || ch === ":" || ch === "." || ch === ",") return 0.3;
  if (ch >= "A" && ch <= "Z") return 0.68;
  if (ch === "m" || ch === "w" || ch === "M" || ch === "W" || ch === "→") return 0.86;
  if (ch === "i" || ch === "l" || ch === "1" || ch === "t" || ch === "f" || ch === "r") return 0.38;
  return 0.57;
}

/** How many lines `text` takes when word-wrapped at `size` in `width` pixels. */
export function wrappedLines(text: string, size: number, width: number): number {
  let lines = 1;
  let used = 0;
  for (const word of text.split(" ")) {
    const w = [...word].reduce((t, ch) => t + advance(ch), 0) * size;
    const gap = used > 0 ? 0.3 * size : 0;
    if (used > 0 && used + gap + w > width) {
      lines++;
      used = w;
    } else used += gap + w;
  }
  return lines;
}

/**
 * The size a fact is drawn at. A card has room for two lines at full size or
 * three at the reduced one, so a fact that would wrap to a third line is
 * shrunk instead of spilling out of its card.
 */
export function factSize(text: string, nodeCount: number): number {
  const base = sizes(nodeCount).fact;
  return wrappedLines(text, base, cardInner(nodeCount)) > 2 ? Math.round(base * 0.84) : base;
}

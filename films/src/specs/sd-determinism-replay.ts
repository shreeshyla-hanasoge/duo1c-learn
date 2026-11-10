import type { FlowSpec } from "../kit/types";

/**
 * Determinism and replay — the film for `sd-determinism-replay`.
 *
 * The backtester's cache keyed by memory address: the same stored rows gave
 * 10, then 8, then 9 trades. The fix resets the cache at every timestamp.
 */
export const sdDeterminismReplay: FlowSpec = {
  id: "sd-determinism-replay",
  kicker: "System design · M5",
  title: "Same input, different answer",
  nodes: [
    { id: "data", role: "Stored candles", label: "Input" },
    { id: "engine", role: "Backtester", label: "Engine" },
    { id: "cache", role: "Time-index cache", label: "Cache" },
    { id: "result", role: "Trades found", label: "Result" },
  ],
  steps: [
    {
      seconds: 4.4,
      caption: "The same stored rows and the same code should always give the same trades.",
      facts: { data: "rows never change", result: "no runs yet" },
    },
    {
      seconds: 4.6,
      caption: "Run 1 starts. The engine caches each time slice under the slice's memory address.",
      move: { from: "data", to: "engine", label: "run 1 · same rows", tone: "request" },
      facts: { engine: "cache key = id(slice)" },
    },
    {
      seconds: 4.8,
      caption: "Each slice is thrown away after use, but its cache entry stays behind.",
      move: { from: "engine", to: "cache", label: "store by address", tone: "request" },
      facts: { cache: "entry for 10:00 slice" },
    },
    {
      seconds: 4.6,
      caption: "This time the lookups happened to be right.",
      move: { from: "engine", to: "result", label: "10 trades", tone: "commit" },
      facts: { result: "run 1: 10 trades" },
    },
    {
      seconds: 5,
      caption: "Run 2 uses the same rows. A new slice reuses a freed address, so it hits an old entry.",
      move: { from: "cache", to: "engine", label: "stale entry", tone: "fault" },
      facts: { cache: "wrong times returned", engine: "bad candle lookup" },
    },
    {
      seconds: 4.8,
      caption: "Bad lookups change the entries and exits. The answer is wrong and different.",
      move: { from: "engine", to: "result", label: "8 trades", tone: "fault" },
      facts: { result: "run 2: 8 trades" },
    },
    {
      seconds: 4.8,
      caption: "Run 3 gives 9. Which slices go wrong depends on memory timing, a hidden input.",
      move: { from: "engine", to: "result", label: "9 trades", tone: "fault" },
      facts: { result: "10 · 8 · 9" },
    },
    {
      seconds: 5.2,
      caption: "The fix: clear the cache at every timestamp, so no entry outlives its slice.",
      move: { from: "engine", to: "cache", label: "reset each slice", tone: "commit" },
      facts: { cache: "cleared every time", engine: "no hidden input" },
    },
    {
      seconds: 5,
      caption: "Repeat the run, even with a random hash seed. The result must not move.",
      move: { from: "engine", to: "result", label: "10 trades", tone: "commit" },
      facts: { result: "10 · 10 · 10" },
    },
  ],
  takeaway: {
    line: "Repeatability is a test.",
    sub: "Run it twice. If the answers differ, a hidden input is in the function.",
    seconds: 5.5,
  },
  lesson: {
    title: "Ten, eight, nine",
    watchFor:
      "Watch the result's line. The same input gives 10, then 8, then 9 trades. After the cache is reset at every timestamp, it reads 10, 10, 10.",
  },
};

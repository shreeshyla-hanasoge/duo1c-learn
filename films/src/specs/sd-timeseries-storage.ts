import type { FlowSpec } from "../kit/types";

/**
 * Time-series storage — the film for `sd-timeseries-storage`.
 *
 * A contract-over-time question is cheap on the first index; a whole-chain
 * question is not, until a second index is built and paid for on every write.
 */
export const sdTimeseriesStorage: FlowSpec = {
  id: "sd-timeseries-storage",
  kicker: "System design · M2",
  title: "Filing history by the question",
  nodes: [
    { id: "ingest", role: "Backfill job", label: "Ingest" },
    { id: "table", role: "Option-chain table", label: "Table" },
    { id: "backtest", role: "Reader 1", label: "Backtest" },
    { id: "chart", role: "Reader 2", label: "Chart" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "History is read as a symbol plus a time range. The index order is chosen from the questions.",
      facts: { table: "index A: contract, time" },
    },
    {
      seconds: 4.6,
      caption: "Ingest adds a bar to the end. A contract trades 375 one-minute bars a session.",
      move: { from: "ingest", to: "table", label: "bar 10:05", tone: "commit" },
      facts: { table: "375 rows a contract-day", ingest: "appends, never edits" },
    },
    {
      seconds: 5,
      caption: "Re-running the backfill is safe. A unique key replaces the bar instead of duplicating it.",
      move: { from: "ingest", to: "table", label: "bar 10:05 again", tone: "commit" },
      facts: { table: "still 1 row for 10:05" },
    },
    {
      seconds: 4.6,
      caption: "A backtest asks for one contract over 15 minutes. That matches index A exactly.",
      move: { from: "backtest", to: "table", label: "contract, 10:00-10:15", tone: "request" },
      facts: { backtest: "asks: one contract" },
    },
    {
      seconds: 5,
      caption: "One reach to find the start, then 15 rows. Cost follows the answer, not the archive.",
      move: { from: "table", to: "backtest", label: "15 rows", tone: "reply" },
      facts: { backtest: "15 rows read", table: "log N + 15 rows" },
    },
    {
      seconds: 5.4,
      caption: "The chart wants a different shape: every strike at 10:05. Time is buried in index A.",
      move: { from: "chart", to: "table", label: "whole chain, 10:05", tone: "fault" },
      health: { table: "slow" },
      facts: { chart: "asks: 120 rows", table: "index A: opens each contract" },
    },
    {
      seconds: 5.4,
      caption: "So build a second index, filed by time first. The cost is that every new row is written twice.",
      move: { from: "ingest", to: "table", label: "bar 10:06", tone: "commit" },
      health: { table: "ok" },
      facts: { table: "index A + B · 2 writes" },
    },
    {
      seconds: 5,
      caption: "The same chart question now uses index B, and the 120 rows sit side by side.",
      move: { from: "chart", to: "table", label: "whole chain, 10:06", tone: "request" },
      facts: { table: "index B: one reach" },
    },
    {
      seconds: 4.6,
      caption: "60 strikes, a call and a put each: 120 rows come back in one short read.",
      move: { from: "table", to: "chart", label: "120 rows", tone: "reply" },
      facts: { chart: "chain drawn" },
    },
  ],
  takeaway: {
    line: "File the history by the questions you ask.",
    sub: "One index per real query shape. An index nobody uses is cost on every write.",
    seconds: 5.5,
  },
  lesson: {
    title: "Two questions, two indexes",
    watchFor:
      "Watch the line under the table. It shows which index answers each question, and after the second index it reads 'A + B · 2 writes': the faster read is paid for on every new row.",
  },
};

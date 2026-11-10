import type { FlowSpec } from "../kit/types";

/**
 * Queues and logs — the film for `sd-queues-and-logs`.
 *
 * A log keeps events; each reader has its own offset. A reader crashes
 * between processing and committing, so it re-reads (at-least-once); another
 * rewinds to replay. Offsets and lag are illustrative.
 */
export const sdQueuesAndLogs: FlowSpec = {
  id: "sd-queues-and-logs",
  kicker: "System design · M5",
  title: "A log and its bookmarks",
  nodes: [
    { id: "producer", role: "Writer", label: "Producer" },
    { id: "log", role: "Partition", label: "Log" },
    { id: "billing", role: "Consumer", label: "Billing" },
    { id: "audit", role: "Consumer", label: "Audit" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "A queue deletes a message once it is done. A log keeps it, and each reader keeps its own bookmark.",
      facts: { log: "kept 7 days" },
    },
    {
      seconds: 4.6,
      caption: "The producer appends ten events to the end of the log, keyed NIFTY so they stay in order.",
      move: { from: "producer", to: "log", label: "10 events · NIFTY", tone: "commit" },
      facts: { log: "offsets 0–9", billing: "offset 0", audit: "offset 0" },
    },
    {
      seconds: 5,
      caption: "Billing reads five events and commits offset 5, its bookmark.",
      move: { from: "log", to: "billing", label: "read 0–4", tone: "reply" },
      facts: { billing: "committed 5 · lag 5" },
    },
    {
      seconds: 5,
      caption: "Audit is slower. It reads two events. Its bookmark does not disturb Billing's.",
      move: { from: "log", to: "audit", label: "read 0–1", tone: "reply" },
      health: { audit: "slow" },
      facts: { audit: "committed 2 · lag 8" },
    },
    {
      seconds: 5,
      caption: "Ten more events arrive. Lag is how far a bookmark is behind the end of the log.",
      move: { from: "producer", to: "log", label: "10 events", tone: "commit" },
      health: { audit: "ok" },
      facts: { log: "offsets 0–19", billing: "lag 15", audit: "lag 18" },
    },
    {
      seconds: 5.4,
      caption: "Billing reads events 5 to 7 and processes them. Then it crashes before committing.",
      move: { from: "billing", to: "log", label: "commit 8", tone: "fault" },
      health: { billing: "down" },
      facts: { billing: "done 7 · committed 5" },
    },
    {
      seconds: 5.4,
      caption: "On restart Billing resumes from the committed bookmark, 5. It sees events 5 to 7 a second time.",
      move: { from: "log", to: "billing", label: "read 5–7 again", tone: "reply" },
      health: { billing: "ok" },
      facts: { billing: "duplicates: 5–7" },
    },
    {
      seconds: 5.4,
      caption: "Nothing was lost, but there were duplicates. A consumer that ignores repeats makes this safe.",
      move: { from: "billing", to: "log", label: "commit 8", tone: "commit" },
      facts: { billing: "committed 8 · lag 12" },
    },
    {
      seconds: 5.4,
      caption: "Audit finds a bug in its code. It rewinds its bookmark to 0 and replays, which a queue cannot do.",
      move: { from: "audit", to: "log", label: "seek to offset 0", tone: "request" },
      facts: { audit: "offset 0 · replaying", log: "still 0–19" },
    },
  ],
  takeaway: {
    line: "A queue shares work; a log shares history.",
    sub: "Commit your bookmark after the work is done, and make repeats harmless.",
    seconds: 5.5,
  },
  lesson: {
    title: "Two readers, one log",
    watchFor:
      "Watch the lag under Billing and Audit. Each reader has its own bookmark. Billing's crash shows 'done 7 · committed 5', and that gap is why it reads three events twice.",
  },
};

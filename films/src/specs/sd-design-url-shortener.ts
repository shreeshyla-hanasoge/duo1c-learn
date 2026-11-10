import type { FlowSpec } from "../kit/types";

/**
 * Design: a URL shortener — the film for `sd-design-url-shortener`.
 *
 * A link is made with a counter and base 62, then read at 12,000 a second.
 * Hitting the database on every click is the turn; a cache-aside Redis in
 * front takes 95 percent of the reads.
 */
export const sdDesignUrlShortener: FlowSpec = {
  id: "sd-design-url-shortener",
  kicker: "System design · M10",
  title: "Many reads, few writes",
  nodes: [
    { id: "client", role: "Browser", label: "Client" },
    { id: "server", role: "Redirect server", label: "Server" },
    { id: "redis", role: "Cache", label: "Redis" },
    { id: "db", role: "The record", label: "Database" },
  ],
  steps: [
    {
      seconds: 5,
      caption: "There are 100 reads for every write: about 40 writes a second, but 12,000 reads at peak.",
      facts: { server: "writes 40/s · reads 12,000/s" },
    },
    {
      seconds: 5,
      caption: "To make a link, the server takes the next id from its block of 1,000. A counter never collides.",
      move: { from: "client", to: "server", label: "POST long URL", tone: "request" },
      facts: { server: "next id: 1,000,000" },
    },
    {
      seconds: 5,
      caption: "Id 1,000,000 written in base 62 is 4c92. The server stores the code and the long URL.",
      move: { from: "server", to: "db", label: "4c92 → long URL", tone: "commit" },
      facts: { server: "1,000,000 = 4c92", db: "row 4c92" },
    },
    {
      seconds: 5.2,
      caption: "Every click now looks up the database. At peak that is 12,000 reads a second for one small table.",
      move: { from: "server", to: "db", label: "lookup 4c92", tone: "fault" },
      health: { db: "slow" },
      facts: { db: "12,000 reads/s" },
    },
    {
      seconds: 5,
      caption: "So look in Redis first. A few links take most of the traffic, and the hot set fits in about 4 GB.",
      move: { from: "server", to: "redis", label: "4c92?", tone: "request" },
      health: { db: "ok" },
      facts: { redis: "4c92: miss" },
    },
    {
      seconds: 5,
      caption: "On a miss, the server reads the database once.",
      move: { from: "db", to: "server", label: "long URL", tone: "reply" },
      facts: { db: "1 read" },
    },
    {
      seconds: 5,
      caption: "It then fills the cache, so the next click for 4c92 never reaches the database.",
      move: { from: "server", to: "redis", label: "fill 4c92", tone: "commit" },
      facts: { redis: "4c92 cached" },
    },
    {
      seconds: 5,
      caption: "The next click is a hit, answered from memory.",
      move: { from: "redis", to: "server", label: "hit: long URL", tone: "reply" },
      facts: { redis: "95% hit rate", db: "~600 reads/s" },
    },
    {
      seconds: 5.4,
      caption: "A 302 redirect sends the browser on, and every click still returns to us, so it can be counted.",
      move: { from: "server", to: "client", label: "302 Location", tone: "reply" },
      facts: { client: "redirected", server: "click counted" },
    },
  ],
  takeaway: {
    line: "Few writes, many reads: cache the hot links.",
    sub: "Make codes with a counter, cache the hot links, and choose 302 when you need click counts.",
    seconds: 5.5,
  },
  lesson: {
    title: "A click, 12,000 times a second",
    watchFor:
      "Watch the Database line. It reads 12,000 a second with no cache, then about 600 once Redis answers 95 percent of clicks.",
  },
};

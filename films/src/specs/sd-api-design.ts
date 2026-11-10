import type { FlowSpec } from "../kit/types";

/**
 * Pagination: offset versus cursor — the film for `sd-api-design`.
 *
 * A reader pages through orders, newest first, while a new order arrives.
 * Offset paging shows one row twice and gets slow on deep pages; a cursor
 * does neither. Row ids and sizes are illustrative.
 */
export const sdApiDesign: FlowSpec = {
  id: "sd-api-design",
  kicker: "System design · M1",
  title: "Paging a list: offset or cursor",
  nodes: [
    { id: "client", role: "Reads pages", label: "Client" },
    { id: "api", role: "Your API", label: "API" },
    { id: "db", role: "Orders table", label: "Database" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A list of orders, newest first, 20 to a page. New orders keep arriving while someone reads.",
      facts: { db: "newest order: id 100" },
    },
    {
      seconds: 5,
      caption: "Page 1 with offset paging: skip 0 rows, return 20.",
      move: { from: "client", to: "api", label: "GET /orders?page=1", tone: "request" },
      alsoMove: { from: "api", to: "db", label: "LIMIT 20 OFFSET 0", tone: "request" },
      facts: { client: "page 1: ids 100 to 81", api: "offset = 0" },
    },
    {
      seconds: 4.8,
      caption: "Before the reader asks for page 2, someone places order 101. Every older row moves down one place.",
      move: { from: "api", to: "db", label: "insert order 101", tone: "commit" },
      facts: { db: "newest order: id 101" },
    },
    {
      seconds: 5.4,
      caption: "Page 2 skips 20 rows. Row 81 was pushed into that spot, so the reader sees it a second time.",
      move: { from: "db", to: "client", label: "ids 81 to 62", tone: "fault" },
      facts: { client: "page 2 repeats id 81", api: "offset = 20" },
    },
    {
      seconds: 5.4,
      caption: "Offset is also slow. For page 5,000 the database must walk and throw away 100,000 rows first.",
      move: { from: "client", to: "api", label: "page 5000", tone: "request" },
      facts: { db: "discards 100,000 rows" },
      health: { db: "slow" },
    },
    {
      seconds: 5.2,
      caption: "A cursor fixes both. Each reply carries the last id seen, as a token the client sends back.",
      move: { from: "api", to: "client", label: "next = before 81", tone: "reply" },
      facts: { client: "cursor: before 81", api: "no offset kept" },
      health: { db: "ok" },
    },
    {
      seconds: 5.2,
      caption: "The query asks for ids below 81. With an index the database seeks straight there.",
      move: { from: "api", to: "db", label: "WHERE id < 81", tone: "request" },
      facts: { db: "index seek · same cost" },
    },
    {
      seconds: 4.8,
      caption: "Order 102 arrives while the reader waits. It is newer than the cursor, so it cannot move the page.",
      move: { from: "api", to: "db", label: "insert order 102", tone: "commit" },
      facts: { db: "newest order: id 102" },
    },
    {
      seconds: 5.2,
      caption: "Page 2 is ids 80 to 61, with no repeat and no skipped row. Page 5,000 costs the same as page 2.",
      move: { from: "db", to: "client", label: "ids 80 to 61", tone: "reply" },
      facts: { client: "page 2: 80 to 61, clean" },
    },
  ],
  takeaway: {
    line: "Page by where you stopped, not how far you skipped.",
    sub: "Use a cursor for long or changing lists. Keep offset for small, stable ones where jumping to page 40 matters.",
    seconds: 5.5,
  },
  lesson: {
    title: "The row that appeared twice",
    watchFor:
      "Watch the client's line. With offset paging page 2 repeats id 81 after a new order arrives; with a cursor the page starts at 80 and nothing is repeated.",
  },
};

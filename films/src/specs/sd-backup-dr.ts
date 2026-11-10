import type { FlowSpec } from "../kit/types";

/**
 * Backup, restore and disaster recovery — the film for `sd-backup-dr`.
 *
 * Tiered copies to another place, a backup job that stops without any noise,
 * a watchdog that treats missing success as the alarm, and a restore drill
 * that proves the copy loads. Hours and the 15-minute binlog follow the lesson.
 */
export const sdBackupDr: FlowSpec = {
  id: "sd-backup-dr",
  kicker: "System design · M7",
  title: "A backup you have restored",
  nodes: [
    { id: "db", role: "Production", label: "Database" },
    { id: "store", role: "Other cloud", label: "Storage" },
    { id: "drill", role: "Throwaway copy", label: "Drill" },
    { id: "watchdog", role: "Checks success", label: "Watchdog" },
    { id: "phone", role: "The operator", label: "Phone" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "A few MB of tables cannot be replaced: users, strategies, orders. 22 GB of history can be refetched.",
      facts: { db: "few MB vital · 22 GB not" },
    },
    {
      seconds: 5,
      caption: "So the small tables are dumped every hour to storage in a different cloud, away from this server.",
      move: { from: "db", to: "store", label: "hourly dump", tone: "commit" },
      facts: { store: "dump 10:00 · kept 14 d" },
    },
    {
      seconds: 5,
      caption: "The database's change log is shipped every 15 minutes, so the loss window shrinks to minutes.",
      move: { from: "db", to: "store", label: "binlog 10:15", tone: "commit" },
      facts: { store: "dump 10:00 · log 10:15" },
    },
    {
      seconds: 5.4,
      caption: "In July 2026 the uploads stopped. A dead backup makes no noise, so for months nothing looked wrong.",
      move: { from: "db", to: "store", label: "nothing sent", tone: "fault" },
      health: { store: "slow" },
      facts: { store: "last success: old" },
    },
    {
      seconds: 5,
      caption: "Now the watchdog asks the question that matters: when was the last success?",
      move: { from: "watchdog", to: "store", label: "last success?", tone: "request" },
    },
    {
      seconds: 5,
      caption: "Too long ago. The absence of a success is the alarm, not a missing error message.",
      move: { from: "store", to: "watchdog", label: "log 26 h old", tone: "reply" },
      facts: { watchdog: "tier overdue" },
    },
    {
      seconds: 5,
      caption: "A person is told while the gap is hours, not months.",
      move: { from: "watchdog", to: "phone", label: "backups quiet", tone: "fault" },
      health: { store: "ok" },
      facts: { phone: "1 page" },
    },
    {
      seconds: 5,
      caption: "A file existing proves little. Every Sunday a drill downloads the newest chain.",
      move: { from: "store", to: "drill", label: "download chain", tone: "request" },
      facts: { drill: "restoring" },
    },
    {
      seconds: 5.2,
      caption: "It restores into a throwaway copy and compares row counts with live. That proves it loads.",
      move: { from: "drill", to: "db", label: "compare row counts", tone: "request" },
      facts: { drill: "restored · counts match", db: "matches the drill" },
    },
  ],
  takeaway: {
    line: "A backup is real only once you have restored it.",
    sub: "Keep copies elsewhere, tier them by value, alarm on missing success, and drill the restore.",
    seconds: 5.5,
  },
  lesson: {
    title: "From a file to a proven copy",
    watchFor:
      "Watch the storage line. The last success goes stale without any error, and the watchdog pages on that absence. Only the Sunday drill, which compares row counts, shows the copy would really load.",
  },
};

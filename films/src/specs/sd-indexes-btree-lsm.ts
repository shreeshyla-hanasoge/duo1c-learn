import type { FlowSpec } from "../kit/types";

/**
 * An LSM write and read — the film for `sd-indexes-btree-lsm`.
 *
 * A write goes to the log and the memtable, the memtable is flushed to an
 * immutable file, files pile up and a read for a missing key must check them
 * all, and compaction plus a Bloom filter fix it. Sizes follow the lesson.
 */
export const sdIndexesBtreeLsm: FlowSpec = {
  id: "sd-indexes-btree-lsm",
  kicker: "System design · M2",
  title: "An LSM write: memtable to merge",
  nodes: [
    { id: "client", role: "Reads, writes", label: "Client" },
    { id: "wal", role: "Safety log", label: "WAL" },
    { id: "mem", role: "Sorted, in RAM", label: "Memtable" },
    { id: "files", role: "Immutable, disk", label: "SSTables" },
    { id: "compact", role: "Compaction", label: "Merger" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "An LSM tree never changes a file in place. It turns random writes into sequential ones.",
    },
    {
      seconds: 4.8,
      caption: "A write is first appended to the log, so it survives a crash before it reaches disk files.",
      move: { from: "client", to: "wal", label: "put k7 = A", tone: "commit" },
      facts: { wal: "appended · on disk", mem: "empty · 0 of 64 MB" },
    },
    {
      seconds: 4.8,
      caption: "Then it goes into the memtable, a sorted structure in memory. Writes are fast: no disk seek.",
      move: { from: "wal", to: "mem", label: "k7 = A", tone: "commit" },
      facts: { mem: "k7 = A · 64 of 64 MB" },
    },
    {
      seconds: 5,
      caption: "The memtable is full. It is written out in one sequential pass as an immutable sorted file.",
      move: { from: "mem", to: "files", label: "flush sorted file", tone: "commit" },
      facts: { mem: "empty again", files: "file 1: k7 = A" },
    },
    {
      seconds: 5,
      caption: "Update k7. The old file is not touched. The new value goes through the log into a new memtable.",
      move: { from: "client", to: "wal", label: "put k7 = B", tone: "commit" },
      alsoMove: { from: "wal", to: "mem", label: "k7 = B", tone: "commit" },
      facts: { mem: "k7 = B", wal: "appended · on disk" },
    },
    {
      seconds: 5.2,
      caption: "More flushes pile up files. Now k7 = A is in file 1 and k7 = B in file 4.",
      move: { from: "mem", to: "files", label: "flush sorted file", tone: "commit" },
      facts: { files: "4 files · k7 twice" },
    },
    {
      seconds: 5.2,
      caption: "A read for a key that does not exist must look in every file. The read gets slower as files pile up.",
      move: { from: "client", to: "files", label: "get k9", tone: "request" },
      facts: { files: "checks all 4 files", client: "4 disk reads" },
      health: { files: "slow" },
    },
    {
      seconds: 5.2,
      caption: "Compaction merges the four sorted files into one and drops the overwritten k7 = A.",
      move: { from: "files", to: "compact", label: "merge 4 files", tone: "request" },
      facts: { compact: "k-way merge · drops A" },
    },
    {
      seconds: 5,
      caption: "One file comes back. The price: a byte may be rewritten about ten times per level.",
      move: { from: "compact", to: "files", label: "1 merged file", tone: "commit" },
      facts: { files: "1 file · k7 = B only" },
      health: { files: "ok" },
    },
    {
      seconds: 5.2,
      caption: "Each file also keeps a Bloom filter that answers 'definitely not here', so most files are skipped.",
      move: { from: "client", to: "files", label: "get k9", tone: "request" },
      facts: { files: "Bloom filter: not here", client: "0 disk reads" },
    },
  ],
  takeaway: {
    line: "An LSM trades reads and rewrites for fast writes.",
    sub: "Keep writes sequential, merge in the background, and use Bloom filters to skip files.",
    seconds: 5.5,
  },
  lesson: {
    title: "Memtable, files, and the merge",
    watchFor:
      "Watch the line under SSTables. It goes from 1 file to 4 and a slow read of 4 disk reads, then back to 1 file after compaction, and the Bloom filter takes the read to 0.",
  },
};

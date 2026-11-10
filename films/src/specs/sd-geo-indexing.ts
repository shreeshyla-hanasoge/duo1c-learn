import type { FlowSpec } from "../kit/types";

/**
 * Geo indexing — the film for `sd-geo-indexing`.
 *
 * A rider at the edge of a geohash cell searches within 1 km. Scanning only
 * the rider's own cell misses a cafe 10 m away; scanning the cell and its
 * eight neighbours, then filtering by exact distance, is correct.
 */
export const sdGeoIndexing: FlowSpec = {
  id: "sd-geo-indexing",
  kicker: "System design · M6",
  title: "Finding what is near",
  nodes: [
    { id: "rider", role: "Searches", label: "Rider" },
    { id: "index", role: "Geohash", label: "Index" },
    { id: "cells", role: "Cafes by cell", label: "Cells" },
    { id: "check", role: "Exact distance", label: "Filter" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "Find cafes within 1 km. An index on latitude alone returns a strip of the whole world.",
      facts: { rider: "radius: 1 km", cells: "cafes filed by cell" },
    },
    {
      seconds: 5,
      caption: "The index turns the position into a short string. Points that share a prefix share a cell.",
      move: { from: "rider", to: "index", label: "57.649, 10.407", tone: "request" },
      facts: { index: "u4pruydqqvj", rider: "at a cell edge" },
    },
    {
      seconds: 5,
      caption: "Five characters give a cell about 4.9 km wide. Scanning it is an ordinary prefix lookup.",
      move: { from: "index", to: "cells", label: "scan u4pru", tone: "request" },
      facts: { index: "cell u4pru", cells: "u4pru: 3 cafes" },
    },
    {
      seconds: 5.4,
      caption: "A cafe 10 m away sits across the edge, in cell u4prv. Scanning one cell misses it.",
      move: { from: "cells", to: "rider", label: "3 cafes", tone: "fault" },
      facts: { cells: "u4prv: nearest cafe missed", rider: "wrong: not the nearest" },
    },
    {
      seconds: 5.2,
      caption: "Close on the map does not mean a shared prefix. So search the cell and its eight neighbours.",
      move: { from: "index", to: "cells", label: "scan 9 cells", tone: "commit" },
      facts: { index: "cell + 8 neighbours", cells: "9 cells · 11 cafes" },
    },
    {
      seconds: 5,
      caption: "The cells are only a coarse net. Every candidate still goes through an exact distance check.",
      move: { from: "cells", to: "check", label: "11 candidates", tone: "request" },
      facts: { check: "haversine on each" },
    },
    {
      seconds: 5.2,
      caption: "A square holds more than a circle, so 3 of the 11 are too far. Eight cafes are really inside 1 km.",
      move: { from: "check", to: "rider", label: "8 within 1 km", tone: "reply" },
      facts: { check: "3 dropped", rider: "nearest cafe: 10 m" },
    },
    {
      seconds: 5,
      caption: "In a dense city one cell can hold thousands of cafes, and each scan gets slow.",
      move: { from: "index", to: "cells", label: "scan city cell", tone: "fault" },
      health: { cells: "slow" },
      facts: { cells: "one cell: thousands" },
    },
    {
      seconds: 5.4,
      caption: "A quadtree splits any square with over 100 points into four. Cities go deep, deserts stay one leaf.",
      move: { from: "index", to: "cells", label: "split into 4", tone: "commit" },
      health: { cells: "ok" },
      facts: { cells: "max 100 per leaf", index: "quadtree" },
    },
  ],
  takeaway: {
    line: "Cells find candidates; distance decides.",
    sub: "Always scan the neighbours, and split crowded cells so no cell is huge.",
    seconds: 5.5,
  },
  lesson: {
    title: "The cafe across the edge",
    watchFor:
      "Watch the Cells line. One cell finds three cafes and misses the nearest. Nine cells find eleven, and the exact-distance filter keeps eight.",
  },
};

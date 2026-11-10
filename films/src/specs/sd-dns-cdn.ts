import type { FlowSpec } from "../kit/types";

/**
 * DNS and CDN — the film for `sd-dns-cdn`.
 *
 * A name is resolved and cached for its TTL; a file is cached at an edge and
 * the origin sees only the misses; then the site moves and the cached answer
 * is wrong until the TTL runs out. Numbers follow the lesson's worked examples.
 */
export const sdDnsCdn: FlowSpec = {
  id: "sd-dns-cdn",
  kicker: "System design · M1",
  title: "DNS caches names, CDNs cache files",
  nodes: [
    { id: "browser", role: "The user", label: "Browser" },
    { id: "resolver", role: "Remembers", label: "Resolver" },
    { id: "auth", role: "Owns the name", label: "DNS" },
    { id: "edge", role: "Nearby cache", label: "CDN edge" },
    { id: "origin", role: "Your server", label: "Origin" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Two caches sit before your server. One remembers where a name points, the other remembers files.",
    },
    {
      seconds: 4.8,
      caption: "The browser asks a resolver for the address of app.example.in. The resolver has never seen it.",
      move: { from: "browser", to: "resolver", label: "address of app?", tone: "request" },
      facts: { resolver: "cache empty" },
    },
    {
      seconds: 4.8,
      caption: "So the resolver asks the server that owns the name, and gets an address plus a time to live.",
      move: { from: "auth", to: "resolver", label: "198.51.100.7 · TTL 300", tone: "reply" },
      facts: { auth: "app → 198.51.100.7", resolver: "cached for 300 s" },
    },
    {
      seconds: 4.8,
      caption: "The address points at a CDN edge close to the user, so the file travels a short way.",
      move: { from: "browser", to: "edge", label: "GET app.3f2a1c.js", tone: "request" },
      facts: { browser: "knows the edge", edge: "miss: not stored yet" },
    },
    {
      seconds: 5,
      caption: "On a miss the edge fetches from the origin once, and stores the file for a year.",
      move: { from: "edge", to: "origin", label: "fetch the file", tone: "request" },
      facts: { origin: "requests served: 1", edge: "stored · max-age 1 year" },
    },
    {
      seconds: 5.2,
      caption: "Out of the next 1,000 requests, 950 are hits. Only 50 reach the origin.",
      move: { from: "browser", to: "edge", label: "1,000 requests", tone: "commit" },
      facts: { edge: "hit ratio 95%", origin: "sees 50 of 1,000" },
    },
    {
      seconds: 5.2,
      caption: "Now we move the site to a new address. The DNS server knows at once. The resolver does not.",
      move: { from: "auth", to: "resolver", label: "no change sent", tone: "fault" },
      facts: { auth: "app → 203.0.113.9", resolver: "still 198.51.100.7" },
      health: { resolver: "slow" },
    },
    {
      seconds: 5.4,
      caption: "Users who ask the resolver are sent to the old address, until the 300 seconds run out.",
      move: { from: "resolver", to: "browser", label: "198.51.100.7", tone: "fault" },
      facts: { resolver: "old answer · 4 min left", browser: "reaches the old site" },
    },
    {
      seconds: 5.2,
      caption: "Had we lowered the TTL to 60 a day earlier, the wrong answer would last one minute, not five.",
      move: { from: "auth", to: "resolver", label: "203.0.113.9 · TTL 60", tone: "commit" },
      facts: { resolver: "new answer cached", browser: "reaches the new site" },
      health: { resolver: "ok" },
    },
    {
      seconds: 5.2,
      caption: "Files avoid this by changing name. A new file app.9b8c2d.js is a new key, so no purge is needed.",
      move: { from: "edge", to: "origin", label: "fetch app.9b8c2d.js", tone: "request" },
      facts: { edge: "old name stays valid", origin: "serves new name once" },
    },
  ],
  takeaway: {
    line: "Everything cached is a little out of date.",
    sub: "Lower the TTL before a move. Give changed files new names rather than purging the old ones.",
    seconds: 5.5,
  },
  lesson: {
    title: "Two caches, two kinds of old",
    watchFor:
      "Watch the line under the resolver and the line under the origin. The origin sees only 50 of 1,000 requests, but the resolver keeps sending users to the old address until its TTL ends.",
  },
};

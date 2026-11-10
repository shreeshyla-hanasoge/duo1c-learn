import type { FlowSpec } from "../kit/types";

/**
 * Design a news feed — the film for `sd-design-news-feed`.
 *
 * An ordinary post is pushed to 200 followers. A celebrity post would be
 * 50 million inserts, so those authors are pulled at read time instead.
 */
export const sdDesignNewsFeed: FlowSpec = {
  id: "sd-design-news-feed",
  kicker: "System design · M10",
  title: "Push for most, pull for stars",
  nodes: [
    { id: "author", role: "Posts", label: "Author" },
    { id: "post", role: "Saves posts", label: "Posts" },
    { id: "fan", role: "Fan-out workers", label: "Fan-out" },
    { id: "cache", role: "Feed lists", label: "Feeds" },
    { id: "reader", role: "Opens feed", label: "Reader" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Reads outnumber posts 30 to 1, so the feed is built ahead of time, one list per reader.",
      facts: { cache: "ids only · 800 each" },
    },
    {
      seconds: 4.6,
      caption: "An ordinary author with 200 followers publishes. The post is saved once.",
      move: { from: "author", to: "post", label: "new post", tone: "request" },
      facts: { post: "saved · id 9001" },
    },
    {
      seconds: 4.6,
      caption: "An event goes on a queue, so the author does not wait for the copying.",
      move: { from: "post", to: "fan", label: "event: post 9001", tone: "request" },
      facts: { fan: "queue: 1" },
    },
    {
      seconds: 5,
      caption: "Fan-out on write: the id is inserted into each follower's list. Cheap for 200.",
      move: { from: "fan", to: "cache", label: "200 inserts", tone: "commit" },
      facts: { fan: "queue: 0", cache: "200 feeds updated" },
    },
    {
      seconds: 5,
      caption: "Opening the feed is now one read of a ready list, then one batch fetch of post bodies.",
      move: { from: "cache", to: "reader", label: "feed: 800 ids", tone: "reply" },
      facts: { reader: "feed opens fast" },
    },
    {
      seconds: 5.4,
      caption: "A celebrity with 50 million followers posts. Pushing it means 50 million inserts.",
      move: { from: "post", to: "fan", label: "50M followers", tone: "fault" },
      health: { fan: "slow" },
      facts: { fan: "50M inserts · ~8 min" },
    },
    {
      seconds: 5.4,
      caption: "Every ordinary post queued behind it waits too. Pure push breaks for the few famous accounts.",
      move: { from: "fan", to: "cache", label: "inserts, 100k a second", tone: "fault" },
      facts: { fan: "queue: stuck", cache: "other feeds are late" },
    },
    {
      seconds: 5.4,
      caption: "Hybrid: above a follower threshold, skip the push. The celebrity post is only saved.",
      move: { from: "post", to: "fan", label: "celebrity: do not push", tone: "commit" },
      health: { fan: "ok" },
      facts: { fan: "queue: 0", post: "celebrity post saved" },
    },
    {
      seconds: 5.4,
      caption: "At read time the feed service also pulls the celebrity's recent posts and merges them in.",
      move: { from: "post", to: "reader", label: "latest celebrity posts", tone: "reply" },
      facts: { reader: "800 ids + celebrity" },
    },
    {
      seconds: 5.4,
      caption: "Ranking scores each candidate: 40 points just posted (14.1) beats 100 points at 3 hours (8.9).",
      move: { from: "cache", to: "reader", label: "ranked page", tone: "reply" },
      facts: { reader: "newest and liked first" },
    },
  ],
  takeaway: {
    line: "Push for the many, pull for the famous.",
    sub: "Pick fan-out on write or on read per author, by how many followers they have.",
    seconds: 5.5,
  },
  lesson: {
    title: "One post, two paths",
    watchFor:
      "Watch the line under Fan-out. 200 inserts clear at once, but 50 million take about 8 minutes and hold up everyone behind. Then see it return to queue: 0.",
  },
};

import type { Topic } from "../../types.ts";

export const sdDesignNewsFeed: Topic = {
  id: "sd-design-news-feed",
  title: "Design a news feed",
  tier: 10,
  week: 19,
  depth: "deep",
  summary:
    "Show each user the latest posts from the people they follow. Fan-out on write versus on read, the celebrity problem, ranking, and the feed cache.",
  why: "A feed is the standard example of a system where one event must reach many readers, and the cost sits either at write time or at read time. The choice between those two, and the exception for accounts with millions of followers, is the same trade you meet in notifications, chat groups and live price streams. Knowing it lets you size a design with simple multiplication and spot the hot spot before it hurts. Traed has no social feed, but its tick fan-out is a small cousin of the same idea.",
  learn: {
    intuition:
      "Imagine a newspaper stand and two ways to serve readers. In the first, every reader has a personal pigeonhole. When a writer publishes, a clerk walks round and drops a copy into the pigeonhole of every follower. Reading is instant, because your pigeonhole is ready, but publishing is slow for a writer with a million followers. In the second, there are no pigeonholes. When you arrive, the clerk fetches the latest pieces from each writer you follow and merges them while you wait. Publishing is instant, but every visit costs a walk round the shelves. A sensible stand mixes both: pigeonholes for ordinary writers, and for the few famous ones, the clerk adds their latest pieces to your pile when you arrive. Finally the clerk does not just sort by time. Pieces that friends liked, from people you read often, go nearer the top.",
    mechanics: [
      {
        heading: "Requirements and scale, with rough numbers",
        body: "Functional: publish a post, follow and unfollow, and open a home feed of posts from people you follow, newest or best first, with paging. Non-functional: the feed opens in a few hundred milliseconds, a new post reaches followers within seconds, and staying available matters more than perfect freshness. Assume 300 million daily users who open the feed five times a day: 1.5 billion reads a day, about 17,000 a second on average and 50,000 at peak. Assume 50 million posts a day, about 580 a second, and 200 followers on average. If each post is copied to each follower, that is 10 billion inserts a day, roughly 116,000 a second. Reads outnumber posts 30 to 1, but fan-out multiplies the writes.",
      },
      {
        heading: "API and data model",
        body: "Three calls: `POST /posts`, `POST /follow`, and `GET /feed?cursor=`. Tables: `posts` (post id, author, body, time), `follows` (follower, followee, indexed both ways), and a feed cache holding, for each user, a sorted list of post ids. Use a time-sortable post id so the id itself orders by time. Page with a cursor, meaning 'give me posts older than this id', and not with an offset. With an offset of 20, a new post arriving between two page loads shifts every item by one, so the user sees a repeat. A cursor is anchored to a specific post and stays stable however many new posts arrive.",
      },
      {
        heading: "The high-level design: write path, read path, ranking",
        body: "On publish, the post service saves the post and puts an event on a queue. Fan-out workers read the author's followers and insert the post id into each follower's feed list, capped at about 800 entries. On read, the feed service takes ids from the cache, fetches post bodies in one batch (hydration), ranks, and returns a page. Store ids, not bodies: 800 ids of 8 bytes is 6.4 KB a user, about 1.9 TB for 300 million users, so a cluster. Ranking first gathers a few hundred candidates, then scores them. A simple score is points divided by (age in hours plus 2) to the power 1.5: 100 points at 3 hours scores 8.9, while 40 points just posted scores 14.1.",
      },
      {
        heading: "The hard part: fan-out on write, on read, and the celebrity",
        body: "Fan-out on write does the work at publish: one cache read per feed open, but 200 inserts per post. Fan-out on read does it at open: a post is a single insert, but each open fetches the latest posts of 200 accounts and merges them with a heap, so 50,000 opens a second means 10 million lookups a second. The celebrity breaks push: one post by an account with 50 million followers is 50 million inserts, and at 100,000 inserts a second that takes about 8 minutes and delays everyone queued behind it. The usual answer is hybrid: push for ordinary authors, and for accounts above a follower threshold, pull their recent posts at read time and merge them in.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no social feed, and its one user makes the question moot. The nearest relative is tick fan-out. The bridge Lambda keeps a map from a subscription key, such as a symbol and expiry, to the set of connection ids, loaded from the DynamoDB `Subscriptions` table. For each tick batch it posts to every listed connection through API Gateway. That is fan-out on write, with the subscription set as the follower list. Its code records a lesson: a serial loop paid one network round trip per connection, dead ones included, and about fifty stale rows once delayed batches past the engine's 60-second stale threshold. Sending in parallel fixed it.",
      },
    ],
    complexityDerivation:
      "The design rests on one piece of arithmetic: total work equals posts times followers on the write side, and opens times followees on the read side. Fan-out on write wins when reads vastly outnumber posts and follower counts are modest, because it pays the cost once per post instead of once per read. Fan-out on read wins for authors whose follower count is huge, because paying once per follower is more than paying once per reader who actually shows up. The invariant that a feed is a cache of ids that can be rebuilt from the follow graph and the post store keeps the design safe: losing a feed list costs a rebuild, not data. It stops holding in three places. A skewed follower distribution makes the average meaningless, since one account can outweigh a million ordinary ones. Dormant users make push wasteful, because most inserts go to feeds nobody opens. And ranking that depends on live signals, like fresh likes, cannot be fully precomputed at publish time.",
    variants: [
      {
        name: "Fan-out on write (push)",
        when: "Reads dominate, follower counts are modest, and a feed must open in one cache read.",
        delta:
          "Posts are copied into every follower's feed list at publish time. Reads are very cheap; writes multiply by the follower count and waste work on users who never open the app.",
      },
      {
        name: "Fan-out on read (pull)",
        when: "Small systems, or accounts with a huge follower count where pushing is too costly.",
        delta:
          "Nothing is copied at publish. Each open fetches and merges recent posts of everyone followed, so reads cost more but the write is a single insert.",
      },
      {
        name: "Hybrid with ranking",
        when: "A real product with a skewed follower distribution and a ranked, not purely chronological, feed.",
        delta:
          "Push for ordinary authors, pull and merge for large accounts, then score a few hundred candidates. It handles both extremes, but has two paths to build and test.",
      },
    ],
    tradeoffs: [
      {
        vs: "Push (fan-out on write) versus pull (fan-out on read)",
        pick: "Push by default, pull for the accounts with the largest follower counts",
        because:
          "Reads outnumber posts and most authors have few followers, so push is cheap on average. A handful of huge accounts would make push impossibly slow, so they are merged at read.",
      },
      {
        vs: "Store full posts in each feed versus store only post ids",
        pick: "Store ids and hydrate from a shared post cache",
        because:
          "Ids are 8 bytes each, and an edit or a delete then takes effect for every follower at once. Full copies cost many times more memory and go stale.",
      },
      {
        vs: "Chronological order versus ranked order",
        pick: "Ranked when engagement is the goal, chronological when trust and predictability matter",
        because:
          "Ranking raises the chance the reader sees what they care about, but it needs a scoring step and more signals, and users cannot easily explain why a post appeared.",
      },
    ],
  },
  algorithms: [
    {
      name: "K-way merge with a heap",
      role: "Merges the recent posts of many followed accounts into one time-ordered list, taking the next newest from a heap of list heads.",
      dsa: "heaps",
    },
    {
      name: "Sorted set on a skip list",
      role: "Keeps each user's feed ids ordered by time or score, so adding an id and reading a range are both logarithmic.",
      dsa: "skip-lists",
    },
    {
      name: "Bloom filter",
      role: "Remembers which posts a user has already seen in a small, fixed amount of memory, so repeats can be filtered out cheaply.",
      dsa: "probabilistic",
    },
    {
      name: "Hybrid fan-out",
      role: "Chooses push or pull for each author from their follower count, balancing write cost against read cost.",
    },
  ],
  realWorld: [
    {
      system: "Twitter home timeline",
      kind: "industry",
      problem:
        "Reading a timeline is far more frequent than posting, and some accounts have enormous follower counts.",
      applied:
        "Twitter engineers have described building each user's home timeline ahead of time: a new tweet is written into followers' timelines held in an in-memory cache. For accounts with very many followers the tweet is not fanned out, and it is merged into the timeline when the reader asks for it.",
      evidence: "Raffi Krikorian, 'Timelines at Scale' (QCon 2012 and InfoQ talk, 2013)",
      impact:
        "Reads become a single cache lookup, while the largest accounts avoid millions of inserts per post.",
    },
    {
      system: "Facebook News Feed ranking",
      kind: "industry",
      problem:
        "A reader follows far more people than they can read, so the order of the feed decides what they see.",
      applied:
        "Facebook publicly described an early ranking idea called EdgeRank: each item is scored from the reader's affinity with the author, a weight for the kind of interaction, and a decay over time. Later systems use machine-learned models with many more signals, and the company publishes explanations of the ranking signals.",
      evidence: "Facebook f8 conference 2010 talk on EdgeRank; Meta's published explanations of how feed ranking works",
      impact:
        "Scoring a few hundred candidates is how a feed turns raw recency into relevance.",
    },
    {
      system: "Redis sorted sets",
      kind: "industry",
      problem:
        "A feed list must stay ordered while many posts are added, and a page must be read from the middle quickly.",
      applied:
        "Redis documents sorted sets that hold members with scores, supporting add and range queries in logarithmic time, and it describes using a skip list together with a hash table for them. Teams use them to keep per-user lists of post ids ordered by time or score.",
      evidence: "Redis documentation: sorted sets (ZADD, ZRANGE) and data types overview",
      impact:
        "One structure gives ordered insert, range read and a size cap by trimming the oldest entries.",
    },
    {
      system: "Traed tick fan-out in the WebSocket bridge",
      kind: "yours",
      problem:
        "Each market tick must reach every browser tab and engine session that subscribed to that symbol, quickly and without one dead connection delaying the rest.",
      applied:
        "The bridge loads subscriptions into a map from subscription key to a set of connection ids, and on each batch sends to the connections in parallel. Stale connections that return a 'gone' error are collected and removed.",
      evidence: "CMS/Serverless/real-time-trading-websocket/src/services/KiteWebSocketBridge.js; CMS/Serverless/real-time-trading-websocket/serverless.yml",
      impact:
        "Time per batch is about one network round trip instead of one per connection, which keeps the engine's tick stream fresh.",
    },
  ],
  insights: [
    {
      t: "Fan-out moves cost, it does not remove it",
      d: "Push pays once per follower at publish. Pull pays once per followee at every open. Pick the side that happens less often.",
    },
    {
      t: "The celebrity is the exception that rewrites the design",
      d: "One post by an account with 50 million followers is 50 million inserts, about 8 minutes at 100,000 a second. Merge those accounts at read time.",
    },
    {
      t: "A feed is a cache of ids",
      d: "Store post ids, hydrate bodies from a shared cache, and rebuild a lost feed from the follow graph. Edits and deletes then apply everywhere at once.",
    },
    {
      t: "Page by cursor, not by offset",
      d: "A cursor is anchored to a post. An offset shifts whenever a new post arrives and shows repeats.",
    },
  ],
  pitfalls: [
    "Sizing push from the average follower count. One account with 50 million followers outweighs a million ordinary ones, so design for the tail.",
    "Pushing to every registered user. Dormant users never open the feed, so their inserts are wasted memory. Keep feeds only for recently active users and rebuild on return.",
    "Copying full post bodies into feeds. Deleting or editing one post then means updating millions of copies.",
  ],
  quiz: [
    {
      q: "What does fan-out on write mean in a news feed?",
      options: [
        "Each reader fetches the latest posts from everyone they follow when they open the app",
        "Posts are stored once and are never copied anywhere else in the system",
        "At publish time, the post id is inserted into every follower's feed list",
        "A ranking model reorders each page after it has been fetched from the cache",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Fan-out on write, or push, does the copying work when a post is published, so that each follower's feed is already built when they open the app.",
      distractors: [
        "That describes fan-out on read, or pull, where the merge happens at open time.",
        "Even pull designs keep ids elsewhere. Storing a post once is true of both, and does not define push.",
        "",
        "Ranking is a separate step that can follow either push or pull.",
      ],
    },
    {
      q: "Why do feeds use a cursor rather than an offset for paging?",
      options: [
        "A cursor anchors to a specific post, so new arrivals do not shift the page",
        "An offset is slower because it must be sent over a secure connection",
        "A cursor lets the server avoid storing any posts for the reader",
        "An offset only works for readers who follow fewer than 100 accounts",
      ],
      answer: 0,
      difficulty: "recall",
      why: "With an offset, a new post pushes everything down by one, so the next page repeats an item. A cursor says 'older than this post', which stays correct however many posts arrive.",
      distractors: [
        "",
        "Security of the connection is unrelated to how paging is defined.",
        "The server still stores posts. The cursor only marks the position.",
        "Offsets work at any follow count. The problem is shifting data, not size.",
      ],
    },
    {
      q: "A social app has 50 million posts a day and 200 followers on average. If every post is pushed to every follower, about how many feed inserts a second?",
      options: [
        "About 580, the number of posts per second",
        "About 17,000, the number of feed opens per second",
        "About 50,000, the peak feed opens per second",
        "About 116,000, which is 10 billion divided by 86,400 seconds",
      ],
      answer: 3,
      difficulty: "apply",
      why: "50 million posts times 200 followers is 10 billion inserts a day. Divided by 86,400 seconds, that is about 116,000 a second, roughly 200 times the posting rate.",
      distractors: [
        "That is posts per second. It ignores multiplying by the followers.",
        "That is read traffic, which is a different quantity from write fan-out.",
        "That is peak reads. Write fan-out is a separate and larger number.",
        "",
      ],
    },
    {
      q: "A cricketer with 50 million followers posts after a final. Fan-out workers do 100,000 inserts a second. About how long does one push take to reach everyone?",
      options: [
        "About 5 seconds, since workers run in parallel",
        "About 8 minutes, which is 500 seconds",
        "About 14 hours, since each insert is slow",
        "About 50 minutes, since followers are inserted one at a time",
      ],
      answer: 1,
      difficulty: "apply",
      why: "50 million inserts at 100,000 a second is 500 seconds, a little over 8 minutes. Meanwhile other posts queue behind it, which is why huge accounts are fetched at read time instead.",
      distractors: [
        "The rate of 100,000 a second already includes all workers. Dividing gives 500 seconds, not 5.",
        "",
        "That would be 1,000 inserts a second, a hundred times lower than the given rate.",
        "The rate given is for the whole fleet, and 50 million divided by 100,000 is 500 seconds.",
      ],
    },
    {
      q: "Score is points divided by (age in hours plus 2) to the power 1.5. Post A has 100 points at 3 hours. Post B has 40 points and is just posted. Which ranks first?",
      options: [
        "A, because 100 is larger than 40",
        "A, because older posts have proven themselves",
        "B, because its score is about 14 against about 9",
        "Neither, because decay cancels the points exactly",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A scores 100 divided by 5 to the power 1.5, about 100 over 11.2, which is 8.9. B scores 40 divided by 2 to the power 1.5, about 40 over 2.8, which is 14.1. Freshness outweighs the extra points.",
      distractors: [
        "Raw points ignore the age term, which is the reason for the decay.",
        "The formula penalises age, it does not reward it.",
        "",
        "The scores differ, about 8.9 and 14.1, so there is a clear order.",
      ],
    },
    {
      q: "A user follows 200 accounts. A pull design holds the latest 20 posts of each, already sorted by time. What is the cheapest way to produce the newest 20 overall?",
      options: [
        "Sort all 4,000 posts together and take the first 20 of the result",
        "Scan the heads of all 200 lists each time to find the newest post",
        "Keep only the single latest post of each account and sort those",
        "Hold the head of each list in a heap, and pop the newest 20 times",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A k-way merge keeps one candidate per list in a heap. Each pop costs about log of 200, roughly 8 steps, so 20 pops cost a few hundred comparisons. Sorting 4,000 items does much more work than needed.",
      distractors: [
        "It works but sorts 4,000 posts to keep 20, which is wasted work.",
        "A scan of 200 heads costs 200 steps per pop, 4,000 in total, instead of about 8 per pop with a heap.",
        "One post per account can miss the newest 20, since one account may have posted several of them.",
        "",
      ],
    },
    {
      q: "During an IPL final, a team pushes every post to all followers, including accounts with 30 million followers. What is the sound judgement?",
      options: [
        "Weak: a few huge accounts flood the queue, so merge their posts at read time",
        "Fine: the queue absorbs any burst, as long as there are enough workers",
        "Fine: pushing everything keeps the read path a single cache lookup",
        "Weak: push cannot work at all for any account with over 1,000 followers",
      ],
      answer: 0,
      difficulty: "judge",
      why: "One post by a 30-million-follower account is 30 million inserts, which delays everyone queued behind it, in the busiest minutes. A hybrid pulls those few accounts at read time and keeps push for the rest.",
      distractors: [
        "",
        "Queues only hide the delay. The posts still arrive late, and other users' posts wait behind the flood.",
        "A simple read path is a real benefit, but it does not justify the delay at the busiest time.",
        "Push works well for ordinary accounts, including those with thousands of followers.",
      ],
    },
    {
      q: "A broker's app builds a news feed for its customers. A developer stores the full text of each article in every customer's feed list. What is the sound judgement?",
      options: [
        "Good: it saves a second lookup when the feed is opened",
        "Poor: store ids and hydrate from a shared cache, so edits apply once",
        "Good: ids cannot be sorted, so full text is needed for ordering",
        "Poor: a feed should hold nothing and be recomputed from the database",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Article text is large and identical for every follower. Storing it once and holding only ids makes memory small, and a correction or deletion takes effect for everyone immediately.",
      distractors: [
        "The saved lookup is real but small, while memory and stale copies grow with every follower.",
        "",
        "Ids sort perfectly well, especially time-sortable ones. Ordering does not need the text.",
        "Holding nothing means recomputing on every open, which is the expensive pull path for everyone.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-news-feed-small-community",
      scenario:
        "A community app for a college alumni network has 10,000 members, about 500 posts a day, and members follow 50 people on average. Each member opens the feed about five times a day. One engineer runs it on a single PostgreSQL database. A colleague proposes a queue, fan-out workers and Redis feed lists. What is the right design?",
      options: [
        {
          label: "Build the feed at read time with one indexed query over followed authors, paged by cursor",
          appeal:
            "No new components, always fresh, and it handles deletes and unfollows with no extra work.",
        },
        {
          label: "Fan-out on write through a queue into Redis feed lists",
          appeal:
            "Fastest reads and the architecture used by large social networks.",
        },
        {
          label: "A hybrid with a follower threshold and a ranking model",
          appeal:
            "Ready for growth and gives a better feed order from day one.",
        },
        {
          label: "A nightly batch job that writes each member's feed into a table",
          appeal:
            "Simple to run and cheap on the database during the day.",
        },
      ],
      best: 0,
      verdict:
        "Feed opens are about 50,000 a day, under one a second. A query that gathers recent posts from 50 followed authors on an index is a few milliseconds of work. A queue and cache add parts to run for a load the database ignores, and a nightly batch would show yesterday's posts.",
      claims: [
        {
          text: "You accept that each feed open does a query over the posts table, in return for no queue, no cache and no copies to keep consistent.",
          axis: "trade",
          correct: true,
          note: "True. Opens are rare enough that the query cost does not matter.",
        },
        {
          text: "You give up the ability to ever add a cache.",
          axis: "trade",
          correct: false,
          note: "A cache or push path can be added later, and the follow and post tables stay the same.",
        },
        {
          text: "Unfollows and deleted posts take effect immediately, because the feed is built from the current tables.",
          axis: "trade",
          correct: true,
          note: "True. There is no copy to repair.",
        },
        {
          text: "If one member follows thousands of accounts, that member's query can become slow, so cap or page it.",
          axis: "failure",
          correct: true,
          note: "True. It is an outlier, handled by limiting the merge window.",
        },
        {
          text: "A queue outage would stop all feeds from updating.",
          axis: "failure",
          correct: false,
          note: "There is no queue in this design, so there is nothing to fail in that way.",
        },
        {
          text: "Measure the 95th percentile of the feed query time, and add a cache only when it passes a limit you set.",
          axis: "measure",
          correct: true,
          note: "True. Evidence should trigger the extra complexity.",
        },
        {
          text: "The number of followers per member is the best predictor of whether to add push now.",
          axis: "measure",
          correct: false,
          note: "Query time at the current load is the direct signal. Follower counts are only an input.",
        },
      ],
    },
    {
      id: "sd-design-news-feed-final-night",
      scenario:
        "A social app in India has 100 million daily users who follow 150 accounts on average. A handful of cricket and film accounts have 30 million followers each. On the night of a cricket final, those accounts post repeatedly, and every new post should reach followers within about a minute. A team of 60 engineers runs it. Which feed design fits?",
      options: [
        {
          label: "Push every post to every follower's feed list",
          appeal:
            "Every feed open is one cache read, whatever the account.",
        },
        {
          label: "Pull for everyone: merge recent posts of all followed accounts on every open",
          appeal:
            "No fan-out cost and no wasted work for dormant users.",
        },
        {
          label: "Hybrid: push for ordinary authors, pull and merge the few huge accounts at read time, and keep feed lists only for recently active users",
          appeal:
            "Avoids the 30-million-insert posts while keeping reads cheap.",
        },
        {
          label: "Rebuild every user's feed in a batch every 15 minutes",
          appeal:
            "Predictable load that can be scheduled away from peaks.",
        },
      ],
      best: 2,
      verdict:
        "The skew decides it. Push suits ordinary authors, but a post from a 30-million-follower account is 30 million inserts and delays everyone behind it, and the night is exactly when those accounts post. Pure pull makes every one of millions of opens fetch 150 lists. A 15-minute batch misses the one-minute target.",
      claims: [
        {
          text: "You accept two code paths, push for most authors and pull for large ones, and must test that the merged feed is correct.",
          axis: "trade",
          correct: true,
          note: "True. Hybrid is more complex than either pure design.",
        },
        {
          text: "Readers who follow large accounts see no extra read cost compared with pure push.",
          axis: "trade",
          correct: false,
          note: "They pay a few extra lookups and a merge on each open. That small read cost replaces tens of millions of writes.",
        },
        {
          text: "You get the same write cost as pure push, but with fewer feed lists.",
          axis: "trade",
          correct: false,
          note: "The write cost falls sharply, since the largest accounts are no longer fanned out.",
        },
        {
          text: "If a large account's recent posts are cached poorly, thousands of feed opens a second can all hit the post store at once.",
          axis: "failure",
          correct: true,
          note: "True. The few pulled accounts are read by everyone, so they must be cached and coalesced.",
        },
        {
          text: "If the fan-out queue is delayed, readers of ordinary authors get posts late but the app keeps working.",
          axis: "failure",
          correct: true,
          note: "True. A feed is a cache, so lateness degrades freshness, not correctness.",
        },
        {
          text: "Measure the delay from publish to appearing in a follower's feed, per author size, and the fan-out queue depth.",
          axis: "measure",
          correct: true,
          note: "True. Those two numbers show whether the one-minute target holds.",
        },
        {
          text: "The average number of inserts per post shows whether the design is healthy.",
          axis: "measure",
          correct: false,
          note: "The average hides the huge accounts, which are the problem. Look at the tail and at delay.",
        },
      ],
    },
    {
      id: "sd-design-news-feed-dormant-users",
      scenario:
        "A news-and-ideas platform has 20 million registered users, of whom 8 million opened the app in the last 30 days. Feed lists keep 800 post ids of 8 bytes each per user in Redis. Memory use is far over budget, and most of the cost is lists for users who never return. How should the team cut cost without hurting active users?",
      options: [
        {
          label: "Keep feed lists for all 20 million users and buy more memory",
          appeal:
            "No change to behaviour and every returning user sees a ready feed.",
        },
        {
          label: "Keep lists only for users active in the last 30 days, and build a dormant user's feed from the pull path on their return",
          appeal:
            "Cuts memory by more than half without touching active users.",
        },
        {
          label: "Cut every list to 50 entries",
          appeal:
            "Large saving with a one-line change.",
        },
        {
          label: "Remove the feed cache and merge at read time for everyone",
          appeal:
            "No cache memory to pay for at all.",
        },
      ],
      best: 1,
      verdict:
        "Each list is about 6.4 KB, so 20 million lists are about 128 GB and 8 million are about 51 GB. Dormant lists are written to by fan-out and almost never read. Rebuilding on return costs one slower open for a person who was away for a month. Short lists would hurt deep scrolling, and dropping the cache makes every open expensive.",
      claims: [
        {
          text: "You accept one slower feed open for a returning dormant user, in return for dropping about 60 percent of the list memory.",
          axis: "trade",
          correct: true,
          note: "True. 12 million of 20 million lists is 60 percent, and the cost is paid rarely.",
        },
        {
          text: "You stop spending fan-out work on users who would never read the result.",
          axis: "trade",
          correct: true,
          note: "True. Fewer lists means fewer inserts per post as well.",
        },
        {
          text: "You lose the ability to show a new feed to a returning user.",
          axis: "trade",
          correct: false,
          note: "The pull path builds it on demand from the follow graph and posts, then push resumes.",
        },
        {
          text: "If many dormant users return at once, such as after a big event, the pull path takes a burst of load.",
          axis: "failure",
          correct: true,
          note: "True. Rate-limit rebuilds or coalesce them to protect the post store.",
        },
        {
          text: "Dropping a dormant user's list loses that user's data permanently.",
          axis: "failure",
          correct: false,
          note: "The list is a cache of ids. The follow graph and posts are the record, so it can be rebuilt.",
        },
        {
          text: "Track the share of feed opens served from a ready list, and the time of rebuild opens for returning users.",
          axis: "measure",
          correct: true,
          note: "True. Together they show the benefit to active users and the cost to returning ones.",
        },
        {
          text: "Total registered users is the number that decides how much feed memory is needed.",
          axis: "measure",
          correct: false,
          note: "Recently active users decide it, since dormant users do not read their lists.",
        },
      ],
    },
  ],
};

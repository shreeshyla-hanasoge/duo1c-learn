import type { Topic } from "../../types.ts";

export const sdTypeaheadTries: Topic = {
  id: "sd-typeahead-tries",
  title: "Typeahead and tries",
  tier: 6,
  week: 12,
  depth: "deep",
  summary:
    "Suggest completions after every keystroke. Learn tries, top-k stored per prefix, prefix caching, and how to keep suggestions fresh without rebuilding the world.",
  why: "Every search box you use, from a broker's instrument search to a shopping site, answers while you type, and it must answer in a few tens of milliseconds for millions of people. The design is a small, clean lesson in precomputation: do the ranking work offline so the live path is a lookup. You will meet the same split of an offline build and a thin live layer in recommendations, feeds and fraud rules. Traed's own instrument search is a plain database query, which shows what you do before you need a trie.",
  learn: {
    intuition:
      "Think of a printed dictionary with thumb tabs. You do not read from page one. You flip to the tab for the first letter, then to the second letter, and the choices narrow with each step. Now imagine that at every tab the dictionary also keeps a small yellow note listing the five most looked-up words under that tab. When someone has typed only 'ni', you do not have to look at every word that starts with 'ni'. You open the tab and read the note. Each new letter is one more flip, and the work depends on how many letters were typed, not on how many words the dictionary holds. The notes are written in advance, perhaps overnight, from the record of what people looked up. If a word suddenly becomes popular at noon, the overnight notes miss it, so a second small sheet of today's rising words is checked as well.",
    mechanics: [
      {
        heading: "The trie: one step per character",
        body: "A trie (prefix tree) stores strings along paths. Each node stands for a prefix and has one child per next character. To find everything starting with 'nif', start at the root and follow n, then i, then f. That is three steps, whether the dictionary holds a thousand words or a hundred million. A hash table cannot do this, because it only answers exact keys, and a sorted array needs a binary search for each keystroke. The price is memory: every distinct prefix is a node. Real systems shrink this by merging single-child chains into one edge (a radix tree) or by using a compact automaton, as search libraries do.",
      },
      {
        heading: "Top-k stored at every node",
        body: "Finding the prefix node is cheap. Ranking what lies below it is not: the node for 'n' sits above millions of strings. So each node stores its own top-k list, say the five best completions with their scores. A query becomes a walk plus a read of a short list. Build it bottom-up: a node's list is the best five from its children's lists, merged with a small min-heap. Worked example: under 'ni', child 'f' offers nifty (500) and niftybees (300), child 't' offers nitin (80). The top two for 'ni' are nifty and niftybees. Cost: k pointers per node, so memory grows by a factor of about k.",
      },
      {
        heading: "Serving path and caching by prefix",
        body: "Prefix traffic is very uneven. One-letter and two-letter prefixes are asked by almost everyone, while long prefixes are rare and personal. So cache by prefix: an in-memory LRU (least recently used) map from prefix to its suggestion list sits in front of the trie, and the hottest short prefixes can be pushed to a CDN or kept in the browser. The client helps too. It waits for a short pause in typing (a debounce of perhaps 100 to 200 ms) before sending, and it drops a reply that arrives after a newer keystroke. These cut requests far more than faster servers do, because most keystrokes never need to reach the trie.",
      },
      {
        heading: "Offline builds, live updates and freshness",
        body: "The trie is rebuilt from query logs by a batch job, hourly or nightly, then loaded as a read-only snapshot and swapped in whole. Read-only means no locks on the hot path. The weakness is freshness: a new listing or a breaking name stays invisible until the next build. The usual fix is a small overlay. A count-min sketch or a short rolling counter tracks queries seen in the last few minutes, and the few fastest risers are merged into the answer at query time. Scores often use a decay, such as halving every six hours, so old fame fades. Filters for abuse and typos are applied at build time.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed does not run a trie. Its instrument search is one Laravel endpoint on the `instruments` table: it needs at least two characters, matches the text anywhere in the symbol or name with `LIKE`, ranks exact and prefix matches first, hides expired contracts, and returns 20 rows. For one trader and a table of instruments that the broker publishes, a database scan is fast enough, and there are no query logs to learn popularity from. A trie with cached top-k would become worth building if the same search served thousands of users, or if the table and the latency target outgrew an indexed query.",
      },
    ],
    complexityDerivation:
      "A lookup walks one node per typed character, so its cost is the length of the prefix, written O(p). The size of the dictionary does not appear in it. Without stored lists you would have to visit every node below the prefix and rank them, which costs time proportional to the number of completions, and that is huge for short prefixes. Storing k answers per node trades memory for that time: space grows by roughly a factor of k, and a read costs O(p + k). The invariant is that every node's list is correct for the data at build time. That holds only for the snapshot. It breaks when popularity moves faster than the build interval, when a deletion must take effect at once (a withdrawn or illegal term), or when results depend on the person, because then the list can no longer be shared and cached by prefix. Each case needs a live layer beside the snapshot: an overlay for trends, a denylist applied at query time, or a per-user re-rank of a shared candidate list.",
    variants: [
      {
        name: "Trie with top-k at each node",
        when: "A shared, global suggestion list, a read-heavy workload, and a rebuild interval of hours is acceptable.",
        delta:
          "Fastest reads, because the answer is precomputed. Costs k times the memory and a rebuild pipeline, and it is stale between builds.",
      },
      {
        name: "Sorted array or database with a range scan",
        when: "A small or medium dictionary, such as tens of thousands of instruments, and an index on the text column.",
        delta:
          "Binary search finds the first match for a prefix and a range scan reads the next few. No separate structure to build, but ranking by popularity needs extra work.",
      },
      {
        name: "Inverted index with edge n-grams",
        when: "Matches must work in the middle of words or across several words, as in a product catalogue.",
        delta:
          "Each word is indexed by its leading fragments in a search engine. More flexible matching, more storage, and ranking is handled by the search engine.",
      },
    ],
    tradeoffs: [
      {
        vs: "Precomputed top-k versus ranking at query time",
        pick: "Precompute for a shared global list",
        because:
          "The ranking cost is paid once per build instead of once per keystroke. Query-time ranking only wins when results depend on the user or change every second.",
      },
      {
        vs: "Frequent rebuilds versus a live overlay",
        pick: "A periodic build plus a small overlay for trends",
        because:
          "Rebuilding every few minutes is expensive and still late. A tiny recent-counts layer catches the rising queries while the big snapshot stays simple and read-only.",
      },
      {
        vs: "Cache every prefix versus cache the short ones",
        pick: "Cache the short, hot prefixes",
        because:
          "Short prefixes are shared by many people and a small cache holds most of the traffic. Long prefixes are many and rarely repeated, so caching them mostly wastes memory.",
      },
    ],
  },
  algorithms: [
    {
      name: "Trie (prefix tree)",
      role: "Finds the node for any typed prefix in a number of steps equal to its length, regardless of dictionary size.",
      dsa: "tries",
    },
    {
      name: "Min-heap of size k",
      role: "Merges the children's lists into the best k completions for a node while building the trie.",
      dsa: "heaps",
    },
    {
      name: "LRU cache keyed by prefix",
      role: "Keeps the suggestion lists for the hottest prefixes in memory in front of the trie.",
      dsa: "lru",
    },
    {
      name: "Count-min sketch",
      role: "Counts recent queries in small fixed memory so rising terms can be merged into live suggestions.",
      dsa: "probabilistic",
    },
  ],
  realWorld: [
    {
      system: "Google Search autocomplete",
      kind: "industry",
      problem:
        "Billions of searches a day need suggestions in the time between two keystrokes, and some of them concern events from the last few hours.",
      applied:
        "Google has said publicly that predictions come from real searches, are ranked by popularity and by factors such as language and location, and that policies remove some predictions. The shape is the usual one: a precomputed candidate set per prefix, plus a freshness path for trending queries.",
      evidence: "Google Search Help, how autocomplete predictions work",
      impact:
        "The expensive learning happens away from the typing path, which is why a suggestion appears while you are still typing.",
    },
    {
      system: "Elasticsearch and Lucene completion suggesters",
      kind: "industry",
      problem:
        "A search engine must suggest completions from its own indexed terms, quickly, without scanning the full index.",
      applied:
        "The Elasticsearch completion suggester is built on a finite state transducer, a compact automaton that works like a shared-prefix trie, and it is held in memory for speed. Each suggestion can carry a weight that decides the order.",
      evidence: "Elasticsearch documentation, completion suggester; Lucene FST suggesters",
      impact:
        "Prefix lookups run in memory, at the cost of building the structure when segments are written.",
    },
    {
      system: "Redis sorted sets for prefix ranges",
      kind: "industry",
      problem:
        "A team wants a simple autocomplete for a modest dictionary without building a trie service.",
      applied:
        "Redis can keep strings in a sorted set with equal scores and read a lexicographic range with ZRANGEBYLEX, which returns all members between two prefixes. This is the sorted-array variant: the range for 'nif' lies between 'nif' and the next string after it.",
      evidence: "Redis documentation, ZRANGEBYLEX and sorted sets",
      impact:
        "A few lines of code give prefix search, but ranking by popularity needs a second structure.",
    },
    {
      system: "Traed instrument search",
      kind: "yours",
      problem:
        "A user types part of a symbol or name and expects the right contract, with the current month's future ahead of expired ones.",
      applied:
        "One Laravel endpoint searches the `instruments` table with a `LIKE` match, orders exact symbol and prefix matches first, then nearest expiry, hides expired contracts, and returns at most 20 rows. There is no trie and no popularity data.",
      evidence: "CMS/trade-server/app/Http/Controllers/InstrumentController.php (search method)",
      impact:
        "A plain query is enough for one user and one broker-published table, and the ranking rules fix a real problem: expired contracts used to fill all 20 slots.",
    },
  ],
  insights: [
    {
      t: "A lookup costs the prefix, not the dictionary",
      d: "A trie takes one step per typed character. That is why it stays fast as the dictionary grows to millions of strings.",
    },
    {
      t: "Rank in advance, store k per node",
      d: "Ranking everything below a short prefix is too slow live. Keep the best k at each node and a query becomes a walk plus a small read.",
    },
    {
      t: "Cache the short prefixes",
      d: "A few short prefixes carry most traffic. An LRU map or a CDN in front of the trie, and a debounce on the client, remove most requests.",
    },
    {
      t: "Snapshot plus overlay",
      d: "Build the big structure offline and read-only. Add a small live layer for rising queries and a denylist that takes effect at once.",
    },
  ],
  pitfalls: [
    "Ranking by raw count forever. Old, popular terms crowd out new ones, so use a decay or a recency boost.",
    "Forgetting that a deletion must act at once. A snapshot built last night will still suggest a term you removed this morning, so apply the denylist at query time.",
    "Building a trie service for a small dictionary. Under tens of thousands of entries, an indexed query or an in-memory sorted array is simpler and fast enough.",
  ],
  quiz: [
    {
      q: "In a trie, what decides the number of steps needed to reach the node for a typed prefix?",
      options: [
        "The number of strings stored anywhere in the dictionary",
        "The length of the prefix that was typed",
        "The number of completions under that prefix node",
        "The number of distinct first letters in the data",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The trie follows one edge per character, so reaching the node for 'nif' takes three steps however large the dictionary is.",
      distractors: [
        "That would be true of a linear scan. A trie does not look at unrelated strings.",
        "",
        "The number of completions affects ranking, not how far you walk to find the node.",
        "Only the first step depends on the first letters, and it is a single lookup.",
      ],
    },
    {
      q: "Why does a typeahead trie store a top-k list at each node?",
      options: [
        "To make insertions of new strings quicker to perform",
        "To keep the trie small enough to fit into memory",
        "To let the node be shared with other prefixes",
        "To avoid ranking every completion below the prefix at query time",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A short prefix sits above millions of strings. Precomputing the best k at each node turns the query into a walk plus a short read.",
      distractors: [
        "Insertions get slightly harder, because lists along the path may need updating.",
        "Memory goes up by about a factor of k, not down.",
        "Sharing nodes is what prefix structure already does. The lists do not change it.",
        "",
      ],
    },
    {
      q: "An exchange website has 8,000 listed instruments and 50 users. Search must return the best 10 matches by prefix. What is the sensible build?",
      options: [
        "An indexed database query or sorted in-memory array with a range scan",
        "A distributed trie service with top-k lists and a CDN in front",
        "A count-min sketch to rank every instrument by its search volume",
        "A nightly MapReduce job that rebuilds a trie for the whole site",
      ],
      answer: 0,
      difficulty: "apply",
      why: "At 8,000 entries and 50 users, a binary search plus a short range scan answers in microseconds. A trie service adds moving parts the load does not justify.",
      distractors: [
        "",
        "A CDN and a trie service are built for millions of users. The dictionary here fits in a single page of memory.",
        "A sketch estimates counts in huge streams. With 50 users there is little to count, and you can count exactly.",
        "A nightly batch pipeline is heavy machinery for a table that a database can scan directly.",
      ],
    },
    {
      q: "Below the prefix 'ni' a node has two children. Child f offers nifty (500) and niftybees (300). Child t offers nitin (80) and nitish (60). With k = 2, what is the list stored at 'ni'?",
      options: [
        "nifty and nitin, the best of each child",
        "niftybees and nitin, the second best of each",
        "nifty and niftybees, the two highest scores overall",
        "nifty, niftybees, nitin and nitish together",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A node's list is the best k across all its children's lists, merged by score. The two highest are 500 and 300.",
      distractors: [
        "Taking one from each child ignores scores. The best two overall are both under f.",
        "That picks the lowest-ranked entry from the first child for no reason.",
        "",
        "That is four entries. The node stores only k = 2, which is what keeps memory bounded.",
      ],
    },
    {
      q: "Typeahead traffic peaks at the market open. Most requests are for one- and two-letter prefixes. Which change cuts server load most?",
      options: [
        "Add more servers behind the trie to spread the walks",
        "Increase k so that every response is more complete",
        "Cache every prefix of every length for a full week",
        "Cache short-prefix answers and debounce keystrokes on the client",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A few short prefixes carry most of the traffic, so a small cache serves most requests. Debouncing removes requests for characters the user typed past.",
      distractors: [
        "More servers handle the load but do not reduce it. Each hot prefix is still recomputed.",
        "A larger k makes each response bigger and does nothing for the request count.",
        "Long prefixes are many and rarely repeat, so caching them fills memory with entries nobody reads again.",
        "",
      ],
    },
    {
      q: "A trie rebuilt every night misses a company whose name began trending at noon. What is the cheapest sound fix?",
      options: [
        "Rebuild the entire trie every ten seconds instead",
        "Merge a small overlay of recent top risers into each answer",
        "Increase the cache lifetime so noon answers last longer",
        "Remove the nightly build and rank everything live",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A small live counter finds the few fast risers, and merging them into the snapshot answer covers freshness without rebuilding the large structure.",
      distractors: [
        "A full rebuild that often is expensive and still lags. The overlay is far cheaper.",
        "",
        "A longer cache lifetime keeps old answers longer and makes the staleness worse.",
        "Ranking every query live gives up the precomputation that makes typeahead fast.",
      ],
    },
    {
      q: "A legal team asks that one phrase never be suggested, starting today. The snapshot was built at 02:00. What should the design do?",
      options: [
        "Apply a denylist at query time and also drop it at the next build",
        "Wait for tonight's build, since snapshots must not be edited",
        "Delete the phrase's node from the running snapshot by hand",
        "Lower its score so that it falls out of the top k",
      ],
      answer: 0,
      difficulty: "judge",
      why: "A deletion must take effect at once, and the snapshot is read-only by design. A query-time filter acts now, and the next build removes the phrase for good.",
      distractors: [
        "",
        "Waiting until tonight leaves the phrase visible all day, which is the failure the request was meant to stop.",
        "Editing a live read-only structure risks a race with readers. A filter on the output is safer and simpler.",
        "A lower score may still leave the phrase in a short list. It does not guarantee removal.",
      ],
    },
    {
      q: "A shopping site wants suggestions personalised to each user's history. Which design is best?",
      options: [
        "A separate full trie for each user, rebuilt hourly from their history",
        "One shared trie with the first suggestion chosen at random",
        "A shared candidate list per prefix, re-ranked per user on the fly",
        "Disable the cache so that every answer can differ by user",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Most of the work is shareable: the candidate list per prefix is the same for everyone. A cheap per-user re-rank on a short list adds personalisation without per-user tries.",
      distractors: [
        "A trie per user multiplies memory and build cost by the number of users, for little gain.",
        "Random ordering throws away ranking quality and has nothing to do with the user.",
        "",
        "Turning off the cache raises the cost for every request. The shared candidates can still be cached.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-typeahead-tries-instrument-search",
      scenario:
        "A small trading platform has one trader and a table of about 90,000 broker-listed instruments, refreshed once a day. The search box needs the right contract in the top 20 after two characters. Latency of 100 ms is fine. There are no query logs yet, one server, and one developer. How should the team build the search?",
      options: [
        {
          label: "An indexed database query with sensible ordering: exact match first, then prefix matches, then nearest expiry",
          appeal:
            "No new component, a few lines of code, and the ranking rules can be tuned directly.",
        },
        {
          label: "A trie service with top-k lists rebuilt nightly from search logs",
          appeal:
            "Constant-time prefix lookup and a design that scales to millions of users.",
        },
        {
          label: "Elasticsearch with edge n-gram analysers",
          appeal:
            "Flexible matching inside words and built-in relevance ranking.",
        },
        {
          label: "Load all instruments into the browser and filter there",
          appeal:
            "Zero server work per keystroke and instant response.",
        },
      ],
      best: 0,
      verdict:
        "With 90,000 rows, one user and a generous latency, a database query is fast enough, and the only ranking that matters is exact, prefix, expiry, which a query can express. A trie needs query logs that do not exist, Elasticsearch adds a service to run, and shipping the whole table to every browser wastes bandwidth and shows stale contracts.",
      claims: [
        {
          text: "You accept that the design will not scale to thousands of users typing at once without further work.",
          axis: "trade",
          correct: true,
          note: "True. A database scan per keystroke is the first thing to break at higher load.",
        },
        {
          text: "You gain a single place where ranking rules live, so a fix such as hiding expired contracts is one change.",
          axis: "trade",
          correct: true,
          note: "True. Rules in one query are easy to change and test.",
        },
        {
          text: "A trie would give better ranking, because it knows what traders usually search for.",
          axis: "trade",
          correct: false,
          note: "A trie has no popularity data by itself. Ranking needs query logs, and this platform has none.",
        },
        {
          text: "If the match is written as a leading wildcard, the index cannot be used and every search scans the table.",
          axis: "failure",
          correct: true,
          note: "True. A match anywhere in the text defeats an ordinary index, which is fine at this size and bad at much larger sizes.",
        },
        {
          text: "Check how often the top 20 contain only expired contracts, because they can crowd out current ones.",
          axis: "measure",
          correct: true,
          note: "True. A table that keeps past months can fill every slot with expired contracts for popular names.",
        },
        {
          text: "The main risk of the database approach is that suggestions are a day old.",
          axis: "failure",
          correct: false,
          note: "A query reads the live table. Staleness is a risk of precomputed snapshots, not of a direct query.",
        },
        {
          text: "Judge the search by its average latency alone, since one user cannot create a tail.",
          axis: "measure",
          correct: false,
          note: "One slow scan is still felt by that user, and an average hides it. Watch tail latency and result position too.",
        },
      ],
    },
    {
      id: "sd-typeahead-tries-festival-sale",
      scenario:
        "An Indian e-commerce site expects 20 million shoppers on the first morning of a festival sale. The search box sends a request on every keystroke, at peak about 400,000 requests a second. Suggestions come from 50 million past queries. The team wants answers within 50 ms, and trends such as a newly launched phone must appear within about 15 minutes. What design fits?",
      options: [
        {
          label: "Query the main product database with LIKE on every keystroke",
          appeal:
            "No new infrastructure and always fresh.",
        },
        {
          label: "Rebuild the whole trie every 15 minutes and swap it in",
          appeal:
            "A single mechanism that meets the freshness target.",
        },
        {
          label: "A precomputed trie snapshot with top-k per node, a prefix cache and a CDN for short prefixes, client debounce, and a recent-risers overlay",
          appeal:
            "Reads are lookups, hot prefixes never reach the servers, and trends arrive through the overlay.",
        },
        {
          label: "Personalised tries for every shopper, built at login",
          appeal:
            "Each user sees suggestions made for them.",
        },
      ],
      best: 2,
      verdict:
        "At 400,000 requests a second, most of the answer must come from caches and a precomputed structure, and the 15-minute trend target is met by a small overlay instead of constant rebuilds. A database LIKE cannot carry that load, a full rebuild every 15 minutes of 50 million queries is heavy and still leaves the gap, and 20 million personal tries would be enormous.",
      claims: [
        {
          text: "You accept that suggestions for new trends depend on the overlay, which is approximate and covers only the fastest risers.",
          axis: "trade",
          correct: true,
          note: "True. A sketch gives approximate counts of recent queries and the overlay is deliberately small.",
        },
        {
          text: "You pay about k times the memory of a plain trie in return for constant-time reads.",
          axis: "trade",
          correct: true,
          note: "True. Each node holds k entries, which is the cost of precomputed ranking.",
        },
        {
          text: "The CDN and cache make suggestions fully real time.",
          axis: "trade",
          correct: false,
          note: "Caching serves stored answers, so it adds staleness, bounded by the cache lifetime.",
        },
        {
          text: "If the new snapshot is corrupt, swapping it in whole can serve bad suggestions to everyone until it is rolled back.",
          axis: "failure",
          correct: true,
          note: "True. A whole-snapshot swap is atomic and also global, so validate before swapping and keep the previous one.",
        },
        {
          text: "A burst of identical queries cannot hurt the system, because answers are cached.",
          axis: "failure",
          correct: false,
          note: "A cold cache after a restart or a new snapshot sends a rush of misses to the trie, so warm hot prefixes first.",
        },
        {
          text: "Track cache hit rate for short prefixes and the 99th percentile latency of the miss path.",
          axis: "measure",
          correct: true,
          note: "True. The hit rate shows whether caching works, and the miss path is where the tail is.",
        },
        {
          text: "The best measure of success is the average latency over the whole day.",
          axis: "measure",
          correct: false,
          note: "A short sale-morning spike disappears inside a daily average.",
        },
      ],
    },
    {
      id: "sd-typeahead-tries-trend-lag",
      scenario:
        "A news app has a trie rebuilt every six hours from query logs. During a breaking event, the name involved is searched 30,000 times in ten minutes, yet it is absent from suggestions for hours. The team of three has one week and wants the smallest change that closes the gap without rebuilding the pipeline. What should they do?",
      options: [
        {
          label: "Rebuild the trie every minute",
          appeal:
            "Freshness improves by an order of magnitude with no new concepts.",
        },
        {
          label: "Keep the six-hour trie and add a rolling count of queries in the last ten minutes, merging the top few risers into each answer",
          appeal:
            "Small, separate from the build, and directly aimed at the gap.",
        },
        {
          label: "Raise k from 5 to 50 so more names appear",
          appeal:
            "More candidates per prefix means the new name has a chance of being included.",
        },
        {
          label: "Hand-edit a list of trending names each morning",
          appeal:
            "Quick to start and editors control quality.",
        },
      ],
      best: 1,
      verdict:
        "The gap is in freshness, and a small rolling counter merged at query time closes it without touching the batch pipeline. Rebuilding every minute multiplies batch cost for a result that is still a minute late, a larger k cannot include a name whose count is not yet in the snapshot, and hand editing cannot react in ten minutes at night.",
      claims: [
        {
          text: "You accept a second code path, so a suggestion can come from either the snapshot or the overlay and both must be tested.",
          axis: "trade",
          correct: true,
          note: "True. The overlay is extra complexity beside the main structure.",
        },
        {
          text: "You gain freshness measured in minutes while the expensive structure stays rebuilt only every six hours.",
          axis: "trade",
          correct: true,
          note: "True. That separation is the point of the snapshot plus overlay split.",
        },
        {
          text: "The overlay replaces the need for any batch build.",
          axis: "trade",
          correct: false,
          note: "It only holds recent risers. The long tail of normal queries still comes from the snapshot.",
        },
        {
          text: "A burst from bots or a coordinated campaign can push a bad term into the overlay quickly, so abuse filters must apply there too.",
          axis: "failure",
          correct: true,
          note: "True. A fast path to the top is also a fast path for manipulation.",
        },
        {
          text: "If the overlay service fails, suggestions stop completely.",
          axis: "failure",
          correct: false,
          note: "It should be optional. The snapshot alone still answers, only less freshly.",
        },
        {
          text: "Measure the delay from a term's surge to its first appearance in suggestions.",
          axis: "measure",
          correct: true,
          note: "True. That time-to-appear is exactly the gap being closed.",
        },
        {
          text: "Measure the size of the trie in memory as the main success signal.",
          axis: "measure",
          correct: false,
          note: "Size is a cost, not a sign that freshness improved.",
        },
      ],
    },
  ],
};

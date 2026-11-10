import type { Topic } from "../../types.ts";

export const sdBloomFilters: Topic = {
  id: "sd-bloom-filters",
  title: "Bloom filters",
  tier: 6,
  week: 11,
  depth: "deep",
  summary:
    "A Bloom filter answers 'definitely not here' or 'probably here' in a few bits per item. Learn how it works, how to size it, and when a wrong yes is safe.",
  why: "Many systems must ask 'have I seen this?' billions of times, and storing every item costs too much memory or too many disk reads. A Bloom filter answers from a few bits per item, with one promise: a no is always true, and a yes is only probably true. That lopsided promise lets databases skip disk reads and crawlers skip pages. You need to know when a wrong yes is cheap and when it is harmful. Traed's own news pipeline chose an exact set instead, and being able to say why shows you understand the trade.",
  learn: {
    intuition:
      "Picture a hotel night clerk with a wall of 100 light switches, all off. When a guest registers, three fixed rules turn her name into three switch numbers, and the clerk flips those three on. To check a name later, the clerk applies the same rules and looks at the three switches. If even one is off, the guest definitely never registered, because registering would have switched it on. If all three are on, she probably registered, but other guests may have flipped those same switches, so the clerk can be fooled. The clerk never writes names down, only flips switches, so the wall stays the same size however long the guest book would have been. A switch can never be turned off safely, because another guest may depend on it. And as more switches turn on, wrong yes answers become more common. A no is certain. A yes is a strong hint, not proof.",
    mechanics: [
      {
        heading: "Bits and hash functions: the whole structure",
        body: "A Bloom filter is an array of m bits, all zero, and k hash functions. To add an item, hash it k times and set those k bit positions to 1. To query, hash it k times. If any position is 0, the item was never added. If all are 1, it was probably added. Toy example with m = 16 and k = 2: adding RELIANCE sets bits 3 and 11, and adding TCS sets bits 5 and 11. Now query INFY, which hashes to 3 and 5. Both are on, so the filter says probably, though INFY was never added. That is a false positive. A query hashing to bit 7 returns a certain no. Real code makes k positions from two hashes as h1 + i times h2.",
      },
      {
        heading: "Sizing: from error rate to memory",
        body: "After n items, any given bit is still zero with probability about e to the power of minus kn/m. A wrong yes needs all k probed bits to be on, so the false-positive rate is about (1 minus that) to the power k. For a fixed m and n the best k is about 0.69 times m/n, and the rate then falls to roughly 0.6185 to the power m/n. In practice: about 9.6 bits per item gives 1 percent with k near 7, and about 14.4 bits gives 0.1 percent with k near 10. Each extra 4.8 bits per item cuts the error ten times. So 10 million items at 1 percent need about 96 million bits, which is 12 MB, far less than storing the keys.",
      },
      {
        heading: "No deletion, and the filters that fix it",
        body: "You cannot clear a bit when you remove an item, because other items may share it, and clearing would create false negatives. A counting Bloom filter replaces each bit with a small counter, often 4 bits. Add increments the k counters and remove decrements them. It supports deletion but uses about four times the memory, and a counter can overflow. A cuckoo filter stores a short fingerprint of each item in a table with two candidate slots, supports deletion, and often uses less space when the error target is low. A scalable Bloom filter adds a new, larger filter with a tighter rate when the old one fills. Two plain filters with the same size and hashes merge by bitwise OR.",
      },
      {
        heading: "Where it sits: a guard in front of something costly",
        body: "A Bloom filter is a guard, not a store. It pays off when a certain no saves expensive work, and a wrong yes only costs one wasted lookup. In an LSM database such as Bigtable, Cassandra or RocksDB, each data file carries a filter. A read for an absent key asks every file's filter, so with 10 files at 1 percent the expected wasted disk reads fall from 10 to about 0.1. A crawler skips links it has probably seen, and the price of a wrong yes is one page never fetched. When a wrong yes does harm, as when it rejects a valid payment, the filter may only say no fast. Every yes must be confirmed in the exact store.",
      },
      {
        heading: "In Traed's terms",
        body: "We do not use a Bloom filter. The nearest thing is the news-alert pipeline's seen check. It keeps an exact set in a DynamoDB table, keyed by news source and a dedupe key, with a time-to-live so old entries expire. Exact beat approximate here for two reasons. The volume is small, so an exact table costs little. And a wrong 'already seen' would silently swallow a real headline, which is the failure that design fears most. We would put a Bloom filter in front only if the set grew to hundreds of millions of keys and lookups became the cost, and even then a yes would be confirmed in the table.",
      },
    ],
    complexityDerivation:
      "The key property is that bits only ever go from 0 to 1. Once an item is added, its k bits stay on forever, so a query for it can never find a zero. That is why there are no false negatives: it follows from the design, not from luck. False positives come from collisions. If a fraction f of the bits are on, a query for an unseen item succeeds only when all k independent positions are on, which has probability f to the power k. With f equal to 1 minus e to the power of minus kn/m, the best choice of k leaves exactly half the bits on. Too few hash functions let unrelated items match easily. Too many fill the array too fast. Each operation costs k hashes and k memory reads, which does not grow with n. The argument stops holding in four cases. You insert more items than you sized for. You need deletion. The hash functions are correlated, which makes the formula too hopeful. Or an attacker picks keys to force collisions, which needs a keyed hash. It also fails whenever a wrong yes is costly.",
    variants: [
      {
        name: "Standard Bloom filter",
        when: "The set only grows, a wrong yes is cheap, and memory or disk reads are the pain. LSM files, crawlers and cache admission fit here.",
        delta:
          "One bit array and k hashes. Smallest and fastest, but no deletion, no resizing, and no way to list members.",
      },
      {
        name: "Counting Bloom filter",
        when: "Items leave the set, such as sessions that end or entries that expire, and you still want a probabilistic guard.",
        delta:
          "Counters replace bits, so removal works. Memory rises about fourfold and a counter can overflow if many items collide.",
      },
      {
        name: "Cuckoo filter",
        when: "You need deletion and a low error rate, and can accept a more complex insert that sometimes moves fingerprints around.",
        delta:
          "Stores a short fingerprint per item in a table with two candidate slots. It supports deletion and often beats a Bloom filter on space below about 3 percent error, but inserts can fail when the table is nearly full.",
      },
    ],
    tradeoffs: [
      {
        vs: "Bloom filter versus an exact hash set",
        pick: "Bloom only when the set is huge and a wrong yes is cheap",
        because:
          "About 10 bits per item beats tens of bytes per key by a wide margin, but you give up certainty on every yes. For a few thousand items the exact set is cheap, supports deletion and never lies.",
      },
      {
        vs: "More bits versus a looser error target",
        pick: "Decide the error rate from the cost of a wrong yes, then size the bits",
        because:
          "Going from 1 percent to 0.1 percent costs only 4.8 more bits per item, a 50 percent increase in memory for a tenfold drop in wasted work. Pick the rate by what a mistake costs, not by habit.",
      },
      {
        vs: "A filter in front versus no filter",
        pick: "Add the filter only when most lookups are for absent keys",
        because:
          "A present key still needs the real lookup, so the filter saves nothing for it and costs hashing and memory. If 90 percent of lookups find the key, the guard mostly adds overhead.",
      },
    ],
  },
  algorithms: [
    {
      name: "Bloom filter",
      role: "Answers 'definitely not seen' or 'probably seen' from an array of bits, so the expensive lookup behind it is skipped for most absent keys.",
      dsa: "probabilistic",
    },
    {
      name: "Double hashing",
      role: "Derives all k bit positions from two base hashes as h1 + i times h2, so one hash computation serves every probe.",
      dsa: "hashing",
    },
    {
      name: "Counting and cuckoo filters",
      role: "Add deletion to the idea, by using small counters or stored fingerprints in place of single bits.",
    },
  ],
  realWorld: [
    {
      system: "Bigtable, Cassandra and RocksDB read paths",
      kind: "industry",
      problem:
        "A read for a key that does not exist must otherwise look into every data file on disk, and each look is a disk read.",
      applied:
        "The Bigtable paper describes a Bloom filter per data file that tells a read whether the file might hold a row. Cassandra exposes a per-table false-positive target, and RocksDB lets you set bits per key, where about 10 is a common choice for roughly 1 percent.",
      evidence: "Chang et al., Bigtable (OSDI 2006); Cassandra and RocksDB documentation on Bloom filters",
      impact:
        "Lookups for absent keys touch almost no files, so a store with many files stays fast between compactions.",
    },
    {
      system: "Early Chrome Safe Browsing",
      kind: "industry",
      problem:
        "A browser wanted to warn about dangerous web addresses without sending every address a user visits to a server.",
      applied:
        "Early versions of Chrome kept a local Bloom filter of known bad address hashes. A no meant the address was safe to load. A yes triggered a lookup to confirm, because a wrong yes must not block a good site. Later versions moved to other compact structures.",
      evidence: "Chromium Safe Browsing design notes (early versions); Bloom, Space/Time Trade-offs in Hash Coding with Allowable Errors (1970)",
      impact:
        "Most visits are answered locally with no network call, and the confirm step keeps false alarms from reaching the user.",
    },
    {
      system: "Akamai CDN cache admission",
      kind: "industry",
      problem:
        "Many web objects are requested only once. Storing them in the cache wastes space and pushes out objects that would be requested again.",
      applied:
        "Akamai has described using a Bloom filter to remember which objects were seen once. An object is stored in the cache only on its second request, so one-hit objects never take space.",
      evidence: "Maggs and Sitaraman, Algorithmic Nuggets in Content Delivery (ACM SIGCOMM CCR, 2015)",
      impact:
        "The cache holds objects that repeat, which raises hit rate for the same disk space.",
    },
    {
      system: "Traed news-alert seen-set",
      kind: "yours",
      problem:
        "The pipeline polls many news sources, the same story arrives repeatedly, and one event must produce one alert without ever dropping a real item.",
      applied:
        "A DynamoDB table keyed by source and a dedupe key (a canonical URL or a content hash) holds every item already handled, with an expiry time. The design chose an exact set over a time watermark, which swallowed backdated items in an earlier incident.",
      evidence: "CMS/Serverless/news-alerts/serverless.yml (SeenTable); docs/plans/news-driven-alerts.md section 8",
      impact:
        "A repeat is attached to its existing story, and an item never seen before always passes through, because the check is exact.",
    },
  ],
  insights: [
    {
      t: "A no is certain, a yes is a hint",
      d: "Bits only turn on, so an added item can never be missed. A yes may come from other items sharing the bits.",
    },
    {
      t: "About 10 bits per item buys 1 percent",
      d: "Each extra 4.8 bits cuts the error tenfold. Choose the rate by what a wrong yes costs.",
    },
    {
      t: "It is a guard, not a store",
      d: "Put it in front of an expensive lookup, and confirm every yes in the exact store when a wrong yes can hurt.",
    },
    {
      t: "Size for the future",
      d: "Past the planned item count the error climbs fast, and a plain filter cannot be resized or have items removed.",
    },
  ],
  pitfalls: [
    "Treating a yes as proof. A Bloom filter says probably. Acting on a yes without confirming drops real items at the error rate.",
    "Sizing for today's count. If the set grows to five times the design size, the false-positive rate leaves the target by a wide margin.",
    "Clearing bits to delete. This breaks the no-false-negative promise for other items that share those bits. Use a counting or cuckoo filter instead.",
  ],
  quiz: [
    {
      q: "A Bloom filter reports 'not present' for a key. What can you conclude?",
      options: [
        "The key was never added to the filter",
        "The key was probably never added, at the filter's error rate",
        "The key was added once and later removed",
        "Nothing, so you must check the main store anyway",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Bits only turn on, so every added item leaves all its k bits on. A single zero bit therefore proves the item was never added. The no answer has no error.",
      distractors: [
        "",
        "The error applies to yes answers only. A no is always certain.",
        "A plain Bloom filter cannot remove items, so removal never explains a no.",
        "Checking the store is needed after a yes, not after a no.",
      ],
    },
    {
      q: "What causes a false positive in a Bloom filter?",
      options: [
        "A hash function gave a wrong value for a stored key",
        "Other items already switched on all k bits it probes",
        "The filter ran out of memory and dropped some bits",
        "The same item was added twice by mistake",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A false positive is a collision. The query item was never added, but other items happened to switch on every bit it probes.",
      distractors: [
        "Hash functions are deterministic. The same key always gives the same positions.",
        "",
        "A filter has a fixed size and does not discard bits. It simply fills up.",
        "Adding an item twice sets the same bits again and changes nothing.",
      ],
    },
    {
      q: "A service must remember 5 million order ids at about a 1 percent false-positive rate. Roughly how much memory does a Bloom filter need?",
      options: [
        "About 600 KB",
        "About 60 MB",
        "About 6 MB",
        "About 600 MB",
      ],
      answer: 2,
      difficulty: "apply",
      why: "One percent needs about 9.6 bits per item. Five million items need about 48 million bits, which is about 6 MB.",
      distractors: [
        "That would be under 1 bit per item, which is far too few to hold a useful filter.",
        "That is about 96 bits per item, ten times more than needed for 1 percent.",
        "",
        "That is about 960 bits per item, which is a hundred times too much.",
      ],
    },
    {
      q: "A storage node has 8 data files, each with a Bloom filter at 1 percent. A lookup arrives for a key that exists nowhere. How many files are read, on average?",
      options: [
        "Eight, because every file must be opened to be sure",
        "About one, because the filters share their errors",
        "None at all, because a filter never reports a yes by mistake",
        "About 0.08, so roughly one lookup in twelve wastes a read",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Each file's filter wrongly says yes with probability 0.01. Over 8 files the expected number of wasted reads is 8 times 0.01, which is 0.08.",
      distractors: [
        "Without the filters that would be right, but the filters are there to skip most files.",
        "Each file's filter errs independently, so the errors add up rather than share.",
        "A filter never gives a false no, but it can give a false yes, which costs a read.",
        "",
      ],
    },
    {
      q: "A filter sized for 1 million items at 1 percent ends up holding 5 million. What happens?",
      options: [
        "The false-positive rate climbs far above 1 percent as most bits turn on",
        "It starts reporting false negatives for the oldest items",
        "New insertions fail with an error until the filter is rebuilt",
        "The rate stays at 1 percent, because it depends on k alone",
      ],
      answer: 0,
      difficulty: "apply",
      why: "With five times the items in the same bits, most bits end up on, and a random query matches all k probes very often. The rate rises sharply, and no error is raised.",
      distractors: [
        "",
        "Bits never turn off, so old items stay findable. The error is on the yes side.",
        "A Bloom filter has no capacity check. It keeps accepting items and quietly gets worse.",
        "The rate depends on the ratio of bits to items as well as on k.",
      ],
    },
    {
      q: "A signup service holds 40 crore mobile numbers behind a Bloom filter. For a new customer, the filter says 'probably registered'. What should the service do?",
      options: [
        "Reject the signup, since a yes from the filter is reliable",
        "Check the database before deciding, since a yes is only probable",
        "Accept the signup and ignore the filter's answer",
        "Rebuild the whole filter and try the check again",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A yes can be a false positive. Rejecting a real new customer on a guess is the harm to avoid, so the database settles every yes. A no needs no check.",
      distractors: [
        "At a 1 percent error rate, one in a hundred new customers would be wrongly turned away.",
        "",
        "Ignoring the filter throws away its use. A no would have been a safe fast path.",
        "Rebuilding gives the same answer for the same item and wastes work.",
      ],
    },
    {
      q: "A team wants a Bloom filter to block duplicate UPI payment requests, with a 0.1 percent error rate. A wrong yes would drop a valid payment. What is the sound judgement?",
      options: [
        "Fine, because 0.1 percent is small enough to ignore",
        "Fine, if the filter is made large enough to reach zero error",
        "Not as the final check; confirm against an exact store or an idempotency key",
        "Use a counting Bloom filter to remove the false positives later",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A dropped payment is real harm, and 0.1 percent of millions of requests is thousands of payments. A filter may speed up the no case, but every yes needs an exact check.",
      distractors: [
        "Small percentages of large volumes are large numbers, and each one is a lost payment.",
        "No finite filter reaches zero error. Only an exact set does.",
        "",
        "Counting filters allow deletion. They do not remove false positives.",
      ],
    },
    {
      q: "A single server must remember about 20,000 recent alert ids, and entries must be removed when an alert clears. Which structure fits best?",
      options: [
        "A standard Bloom filter, because it is always the smallest",
        "A cuckoo filter, because it is the newest structure",
        "A counting Bloom filter, because exact sets cannot delete",
        "A plain hash set, because at this size exact is cheap and supports removal",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Twenty thousand ids take well under a megabyte in a hash set. At that size there is nothing to save, and an exact set supports removal and never gives a wrong yes.",
      distractors: [
        "A plain filter cannot remove items, and saving a few hundred kilobytes is not worth the error.",
        "Newness is not a reason. The approximate answer adds risk with no benefit at this size.",
        "Hash sets delete easily. It is plain Bloom filters that cannot.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-bloom-filters-news-seen",
      scenario:
        "A small team runs a news-alert pipeline on serverless functions. Every minute it polls about 20 feeds, each returning up to a few dozen items, and most were seen before. The pipeline must send one alert per event and must never silently drop a real item. Today a table with a 14-day expiry holds every handled item. A teammate suggests an in-memory Bloom filter inside the function, because it looks faster. Functions start and stop all day. What should the team do?",
      options: [
        {
          label: "Keep the exact seen-set table with an expiry",
          appeal:
            "Exact answers, shared by every function instance, and the volume is tiny.",
        },
        {
          label: "A Bloom filter held in each function's memory",
          appeal:
            "Fastest possible check, with no network call and very little memory.",
        },
        {
          label: "A shared Bloom filter at 0.1 percent error",
          appeal:
            "Small, shared by all instances, and the error is very low.",
        },
        {
          label: "A time watermark of the newest item seen per feed",
          appeal:
            "One number per feed, no table, and very cheap to compare.",
        },
      ],
      best: 0,
      verdict:
        "The volume is small, so the exact table is cheap, and a wrong yes would swallow a real headline, which is the one failure this pipeline must avoid. An in-memory filter is lost whenever a function stops, so it forgets what it saw. A shared filter still errs on yes and cannot expire old items. A watermark swallows items published late or out of order.",
      claims: [
        {
          text: "You accept a small storage and read cost per item in return for exact answers that never drop a real headline.",
          axis: "trade",
          correct: true,
          note: "True. At a few hundred items a minute, the exact table is cheap, and exactness is what the pipeline needs.",
        },
        {
          text: "An expiry on each entry bounds the table's size without any change to how correct the checks are.",
          axis: "trade",
          correct: true,
          note: "True. After the expiry window a repeat is treated as new, which the design allows, and storage stays small.",
        },
        {
          text: "A Bloom filter would let you remove an alert's entry when the story is retracted.",
          axis: "trade",
          correct: false,
          note: "A plain Bloom filter cannot delete. Removal needs a counting or cuckoo filter, or an exact set.",
        },
        {
          text: "With a Bloom filter, a wrong yes would mark a real new item as already handled, and no alert would be sent.",
          axis: "failure",
          correct: true,
          note: "True. The error sits on the yes side, which here means a silent missed headline.",
        },
        {
          text: "With a Bloom filter, an item that was handled could be missed by the check and alerted twice.",
          axis: "failure",
          correct: false,
          note: "A Bloom filter has no false negatives. Its only mistake is saying yes for an unseen item.",
        },
        {
          text: "Track items that arrive and are dropped as 'already seen' by an independent source count, and alert when it rises.",
          axis: "measure",
          correct: true,
          note: "True. A comparison against an independent source is how a silent drop gets noticed.",
        },
        {
          text: "The lookup time of the check is the main measure of whether the design is safe.",
          axis: "measure",
          correct: false,
          note: "Speed says nothing about whether real items were swallowed. Missed alerts are the safety measure.",
        },
      ],
    },
    {
      id: "sd-bloom-filters-lsm-sale",
      scenario:
        "An e-commerce platform stores 'items this user has already seen' in an LSM-tree key-value store. Each node keeps about 30 data files on SSD and serves tens of thousands of lookups a second. During a festival sale, 70 percent of lookups are for keys that were never written, because each user sees mostly new items. Every file probed costs one disk read, and read latency is climbing as files pile up between compactions. What should the team add?",
      options: [
        {
          label: "A RAM hash table holding every key",
          appeal:
            "Exact and instant for any lookup, with no files to probe.",
        },
        {
          label: "A compaction after every write, to keep one file",
          appeal:
            "A single file means a single probe for every lookup.",
        },
        {
          label: "A Bloom filter per data file at about 1 percent",
          appeal:
            "Absent keys skip almost every file, for about 10 bits of memory per key.",
        },
        {
          label: "Return 'not seen' for any key not in a small recent cache",
          appeal:
            "No disk reads for unknown keys at all.",
        },
      ],
      best: 2,
      verdict:
        "Most lookups are for absent keys, which is exactly where a per-file filter pays: about 0.3 wasted reads across 30 files instead of 30. A RAM table of all keys costs far more memory than a filter. Compacting on every write ruins write throughput. Answering 'not seen' for uncached keys gives wrong answers for keys that exist.",
      claims: [
        {
          text: "You spend about 10 bits of memory per key to avoid most disk reads for absent keys.",
          axis: "trade",
          correct: true,
          note: "True. That is the trade of a 1 percent filter: a small memory cost for a large cut in wasted I/O.",
        },
        {
          text: "A lookup for a key that does exist gains nothing from the filter, since the file must still be read.",
          axis: "trade",
          correct: true,
          note: "True. The filter says probably, and the real read still happens. Its value is on the absent-key side.",
        },
        {
          text: "You give up correctness, because a stored key can sometimes be reported as absent.",
          axis: "trade",
          correct: false,
          note: "A Bloom filter has no false negatives, so a stored key is never skipped.",
        },
        {
          text: "A false positive costs one wasted file read, and the answer stays correct.",
          axis: "failure",
          correct: true,
          note: "True. The read finds no key in the file, and the lookup moves on.",
        },
        {
          text: "If a file's filter is sized too small, some keys in that file become unreadable.",
          axis: "failure",
          correct: false,
          note: "An undersized filter raises the false-positive rate and wastes reads. It never hides a stored key.",
        },
        {
          text: "Measure the share of file probes where the filter said yes but the key was absent, and compare it with the 1 percent target.",
          axis: "measure",
          correct: true,
          note: "True. That wasted-probe rate is the filter's real error rate under live traffic.",
        },
        {
          text: "The total memory taken by all the filters is the best sign that they are working.",
          axis: "measure",
          correct: false,
          note: "Memory shows what the filters cost, not whether they skip reads. The wasted-probe rate shows that.",
        },
      ],
    },
    {
      id: "sd-bloom-filters-crawler",
      scenario:
        "Two engineers run a web crawler on one machine with 4 GB of free memory. It will meet about 200 million distinct URLs. Before queuing a link it must ask whether the link was already visited. An exact in-memory set of URLs would need around 10 GB. Missing about 1 percent of pages is acceptable. Fetching the same page twice wastes bandwidth. What should they use?",
      options: [
        {
          label: "An exact in-memory hash set of every URL",
          appeal:
            "Never wrong, and the simplest code to write.",
        },
        {
          label: "A Bloom filter sized for 200 million URLs at 1 percent, about 240 MB",
          appeal:
            "Fits easily in memory and the error is within what the crawl can tolerate.",
        },
        {
          label: "A database table lookup for every link",
          appeal:
            "Exact and not limited by memory, so it can grow without limit.",
        },
        {
          label: "A Bloom filter sized for only 20 million URLs, to save memory",
          appeal:
            "Even smaller, and a crawl rarely meets all of its estimate.",
        },
      ],
      best: 1,
      verdict:
        "The exact set does not fit in memory, and the budget allows 1 percent of missed pages, which is exactly what the filter's error costs. A filter sized for 200 million at 1 percent needs about 240 MB. The database works but adds a lookup per link. A filter sized for a tenth of the real count fills up and its error rate climbs far past 1 percent.",
      claims: [
        {
          text: "You accept that about 1 percent of new links are wrongly treated as visited and never crawled.",
          axis: "trade",
          correct: true,
          note: "True. That is the filter's price, and the brief allows it.",
        },
        {
          text: "You use roughly forty times less memory than the exact set would need.",
          axis: "trade",
          correct: true,
          note: "True. About 240 MB against about 10 GB is a factor of roughly forty.",
        },
        {
          text: "You can later remove a URL from the filter to force a re-crawl of that page.",
          axis: "trade",
          correct: false,
          note: "A plain Bloom filter cannot delete. Re-crawling needs a counting or cuckoo filter, or a fresh filter.",
        },
        {
          text: "If the crawl grows well past 200 million URLs without a bigger filter, more pages will be wrongly skipped.",
          axis: "failure",
          correct: true,
          note: "True. Beyond the design size the false-positive rate climbs, and each false positive is a skipped page.",
        },
        {
          text: "Past its design size the filter will start letting already-visited URLs through, so pages are fetched twice.",
          axis: "failure",
          correct: false,
          note: "The filter has no false negatives. Overfilling causes more false yes answers, so more pages are skipped, not repeated.",
        },
        {
          text: "Track the fraction of bits set. Near half at design size is healthy, and a much higher value signals overfill.",
          axis: "measure",
          correct: true,
          note: "True. The fill ratio shows how close the filter is to its design limit without any counting of items.",
        },
        {
          text: "The number of pages fetched twice tells you the false-positive rate.",
          axis: "measure",
          correct: false,
          note: "Repeat fetches would come from false negatives, which do not exist. False positives show up as pages never fetched.",
        },
      ],
    },
  ],
};

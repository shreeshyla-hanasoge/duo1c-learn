import type { Topic } from "../../types.ts";

export const sdDesignUrlShortener: Topic = {
  id: "sd-design-url-shortener",
  title: "Design a URL shortener",
  tier: 10,
  week: 19,
  depth: "deep",
  summary:
    "Turn a long link into a short code and back, billions of times. Id generation, base-62, caching, redirect codes, expiry and click analytics as a stream.",
  why: "The shortener is the classic first design because the problem fits in your head yet touches most building blocks: unique ids, a key-value lookup, caching, HTTP redirects, expiry and event streams. If you can reason about it with numbers, you can reason about any read-heavy lookup service, from a product catalogue to a DNS record. You will meet it in interviews and in real products such as campaign links in SMS. Traed has no public links, but its cached, rebuildable lookups share the same shape.",
  learn: {
    intuition:
      "Think of a cloakroom at a wedding hall. A guest hands in a bulky coat and gets back a small numbered token. Anyone holding the token gets the coat; nobody has to describe the coat again. The cloakroom needs three things. First, a way to give every token a number that was never used before. Second, a rack where the token number leads straight to the coat, with no searching. Third, a plan for the rush at the end of the evening, when everyone collects at once. Far more people collect than hand in, so the attendant keeps the most requested coats near the counter. Some coats expire: if nobody claims them in a week they are removed. Some guests ask for a favourite number, and the attendant must refuse it if it is taken. The manager also wants to know how often each coat was collected, but counting must not slow the queue, so a clerk drops a slip into a box and the totals are added up later in the back office.",
    mechanics: [
      {
        heading: "Requirements and scale, with rough numbers",
        body: "Functional needs: create a short link from a long one, redirect when the short link is opened, an optional custom alias, an optional expiry date, and click counts. Non-functional needs: redirects answer in tens of milliseconds, the service stays up, and a code never changes meaning. Assume 100 million new links a month and 100 reads for every write. Writes are 100 million over about 2.6 million seconds, so roughly 40 a second. Reads are 10 billion a month, about 3,900 a second on average; allow three times for peaks, so near 12,000 a second. Ten years of links is 12 billion rows at about 500 bytes each, roughly 6 TB. The estimate says: a small write load, a large read load, so caching pays.",
      },
      {
        heading: "API and data model",
        body: "Two calls matter. `POST /links` takes a long URL, an optional alias and an optional expiry, and returns a code. `GET /{code}` answers with a redirect and a `Location` header. The table is `code` (primary key), `long_url`, `owner_id`, `created_at`, `expires_at`. The only access pattern is lookup by code, so there are no joins and a key-value store fits as well as an indexed SQL table. The status code is a real decision. A 301 says moved permanently, so browsers may cache it and never ask us again: fewer requests, but no click counts and no way to edit the target. A 302 says temporary, so every click returns to us. Choose 302 when you need analytics.",
      },
      {
        heading: "The high-level design",
        body: "A request goes through a load balancer to stateless redirect servers, then to a cache, then to the database. Reading is cache-aside: look up the code in Redis, on a miss read the database, fill the cache, then redirect. Writing is: get the next id, encode it, insert the row. Traffic is skewed, because a few links are shared widely. If 20 percent of links take 80 percent of reads, 20 million hot links at about 200 bytes need only about 4 GB, which fits one Redis node. With a 95 percent hit rate, a peak of 12,000 reads a second sends only about 600 to the database. When 6 TB outgrows one machine, split the table by a hash of the code.",
      },
      {
        heading: "The hard part: making unique short codes",
        body: "Three ways. Hash the long URL and keep seven characters: stateless, but collisions follow the birthday rule, about n squared over twice the space. At 1 billion links in a space of 3.5 trillion, expect around 140,000 collisions, so every insert must check and retry with a salt. Pick random codes: same check, same retries. Or use a counter and write the number in base 62 (digits, a to z, A to Z). Number 1,000,000 becomes `4c92`, because 4 times 62 cubed, plus 12 times 62 squared, plus 9 times 62, plus 2 is exactly one million. A counter never collides. To avoid one hot counter, each server leases a block of 1,000 ids and hands them out locally. A crash wastes only the unused block. Scramble the number first if guessing neighbours matters.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no public short links, so it does not need this design. The nearest piece is small. Its Laravel tables use ordinary `id()` columns, which MySQL fills with auto-increment numbers: one writer hands out the next number, so uniqueness is free. That is the counter approach at one-server scale. Leasing id blocks would matter only with several writers, for example if Traed ever ran across machines or regions. The read side is also familiar: the strategy engine keeps pre-warmed candles in Redis under `market_data:{symbol}:1minute` with a 24-hour lifetime, and a miss falls back to the broker. A link feature would add one new need: a tracked redirect that counts opens.",
      },
    ],
    complexityDerivation:
      "The invariant is that one code always means one long URL, and the redirect path does one keyed lookup. Uniqueness comes from the counter, and there is room: 62 to the power 7 is about 3.5 trillion, against 12 billion links in ten years, so seven characters last for centuries. The read path costs one cache hit or one primary-key read, and the average cost falls with the hit rate, which skew in the traffic provides. The argument stops holding in four places. If traffic is not skewed, a 4 GB cache over 6 TB of links holds under a tenth of one percent, and nearly every read reaches the database. If codes are recycled after expiry, an old SMS or bookmark can open someone else's page. If codes are sequential and the links are private, neighbours can be guessed. And if custom aliases share the namespace with counter codes, they can collide, so keep them apart by length or prefix.",
    variants: [
      {
        name: "Hash of the URL, with collision check",
        when: "You want the same long URL to give the same code, and no coordination between servers.",
        delta:
          "Stateless to generate, but every insert checks the database and retries on a clash. Collisions grow with the square of the number of links.",
      },
      {
        name: "Counter with leased id blocks",
        when: "Write volume is moderate and you want zero collisions and short, dense codes.",
        delta:
          "A coordinator hands each server a block of ids. No collision logic, but codes are guessable unless scrambled, and the coordinator must stay available.",
      },
      {
        name: "Pre-generated key service",
        when: "You want code creation off the hot path, or random-looking codes with no retries.",
        delta:
          "An offline job fills a table of unused codes, and servers take batches. Creation is a simple pop, at the cost of one more component to run.",
      },
    ],
    tradeoffs: [
      {
        vs: "301 permanent versus 302 temporary redirect",
        pick: "302 when you count clicks or may edit targets",
        because:
          "A 301 lets browsers skip your servers, which saves load but hides every repeat click and freezes the target. A 302 costs one request per click and keeps control.",
      },
      {
        vs: "Sequential counter versus random codes",
        pick: "Counter, scrambled when links are private",
        because:
          "A plain counter has no collisions and a dense key space, but anyone can try the next code. A reversible scramble keeps both properties.",
      },
      {
        vs: "Count clicks in the request versus log events and count later",
        pick: "Log events and aggregate asynchronously",
        because:
          "An update inside the redirect adds a database write to every read and turns hot links into hot rows. An event in a log keeps the redirect fast, at the cost of counts that lag by seconds.",
      },
    ],
  },
  algorithms: [
    {
      name: "Base-62 positional encoding",
      role: "Writes a numeric id as a short string of digits and letters, so 1,000,000 becomes four characters.",
    },
    {
      name: "Hash with collision retry",
      role: "Maps a long URL to a candidate code without a counter, and detects clashes on insert.",
      dsa: "hashing",
    },
    {
      name: "LRU cache",
      role: "Keeps the most recently used links in memory so most redirects never touch the database.",
      dsa: "lru",
    },
    {
      name: "Bloom filter",
      role: "Answers 'this code definitely does not exist' cheaply, so scanners guessing codes do not hit the database.",
      dsa: "probabilistic",
    },
  ],
  realWorld: [
    {
      system: "HTTP redirect status codes",
      kind: "industry",
      problem:
        "A shortener must tell browsers whether the move is permanent or temporary, and that choice decides who remembers the answer.",
      applied:
        "The HTTP standard defines 301 and 308 as permanent, 302 and 307 as temporary. Permanent responses may be cached and reused by browsers and proxies without asking the origin again. Services that need every click counted or targets editable use a temporary code.",
      evidence: "RFC 9110, HTTP Semantics, section 15.4 (Redirection 3xx)",
      impact:
        "The status code is the line between 'cheap and uncountable' and 'one request per click and fully measurable'.",
    },
    {
      system: "Flickr ticket servers",
      kind: "industry",
      problem:
        "Flickr needed unique, ever-increasing ids across sharded databases without a single point of failure.",
      applied:
        "Flickr described 'ticket servers': two MySQL servers whose only job is to issue ids from an auto-increment column, one handing out odd numbers and one even. Application servers ask either one for the next id.",
      evidence: "Flickr Engineering blog, 'Ticket Servers: Distributed Unique Primary Keys on the Cheap' (2010)",
      impact:
        "A counter service with a failover partner gives collision-free ids without any hash retries.",
    },
    {
      system: "Flickr short URLs (flic.kr)",
      kind: "industry",
      problem:
        "Photo ids are long numbers, and people copy short links by hand or read them aloud.",
      applied:
        "Flickr encodes the photo id in base 58, the base-62 alphabet without look-alike characters such as 0, O, I and l, to build its short links.",
      evidence: "Flickr help pages and developer documentation on short URLs",
      impact:
        "Encoding the existing id means no extra lookup table: the short code is a function of the id.",
    },
    {
      system: "Twitter t.co",
      kind: "industry",
      problem:
        "A platform wants every shared link to pass through a service it controls, for safety checks and measurement.",
      applied:
        "Twitter wraps links posted in tweets in t.co addresses. The redirect lets the platform check destinations for malicious pages and count clicks, and it gives links a fixed length in the timeline.",
      evidence: "Twitter help centre and developer documentation on the t.co link wrapper",
      impact:
        "Control of the redirect is what makes safety checks and counting possible after the link is posted.",
    },
  ],
  insights: [
    {
      t: "The estimate decides the design",
      d: "Forty writes and 12,000 reads a second say: tiny writes, heavy reads, so spend effort on the cache, not on sharded writes.",
    },
    {
      t: "A counter beats a hash",
      d: "Hashing needs check-and-retry on every insert. A counter in base 62 never collides, and leased blocks remove the hot spot.",
    },
    {
      t: "The redirect code is a product decision",
      d: "301 saves requests and loses counts. 302 keeps counts and edits. Pick by what the business must measure.",
    },
    {
      t: "Never put analytics on the redirect path",
      d: "Write a click event to a log and aggregate later. The redirect should do one lookup and return.",
    },
  ],
  pitfalls: [
    "Recycling expired codes. An old SMS, QR code or bookmark then opens a stranger's destination. Answer expired codes with 410 Gone and keep them reserved.",
    "Check-then-insert for custom aliases. Two users can both pass the check. Use a unique constraint and treat a duplicate error as the answer.",
    "Hashing and keeping only seven characters without a collision plan. It works in testing and fails quietly at a billion links.",
  ],
  quiz: [
    {
      q: "Why does a 301 redirect make click counts unreliable?",
      options: [
        "It is slower, so some users leave before the count is recorded",
        "Browsers may cache it and skip the shortener on later visits",
        "It hides the final destination from the analytics system",
        "It can only be used for links that have not expired yet",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A 301 means moved permanently, so browsers and proxies may remember the target and go straight there. Repeat clicks then never reach the shortener, so they cannot be counted.",
      distractors: [
        "A 301 is not slower. The problem is that later visits may not arrive at all.",
        "",
        "The destination is visible in the Location header. The issue is skipped requests, not hidden targets.",
        "Expiry and status codes are separate. A permanent code says nothing about expiry.",
      ],
    },
    {
      q: "How many distinct codes can seven base-62 characters give?",
      options: [
        "About 62 million, since the alphabet has 62 symbols",
        "About 7 billion, which is why 12 billion links need eight",
        "About 350 billion, enough for a few years of links",
        "About 3.5 trillion, which is 62 to the power 7",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Each position has 62 choices, so seven positions give 62 to the power 7, about 3.5 trillion. That is far above the 12 billion links in the ten-year estimate.",
      distractors: [
        "That multiplies the symbols by the length instead of raising it to a power.",
        "This understates it by almost 500 times. Seven characters are plenty for 12 billion links.",
        "62 to the power 6 is about 57 billion, and the seventh position multiplies it by 62 again.",
        "",
      ],
    },
    {
      q: "A team keeps the first seven base-62 characters of a hash of each long URL. At about one billion stored links, what should they expect?",
      options: [
        "Hundreds of thousands of collisions, so each insert must check and retry",
        "No collisions, because a hash function gives a unique output for each input",
        "Exactly one collision for each billion links stored",
        "Collisions only when two users shorten the same long URL",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The birthday rule gives about n squared over twice the space: a billion squared over 7 trillion is roughly 140,000. Truncating a hash makes clashes certain at this size, so inserts need a check and a retry.",
      distractors: [
        "",
        "Hashes are not unique once truncated. Seven characters are only 3.5 trillion values.",
        "Collisions grow with the square of the count, not linearly, so the number is far larger.",
        "Identical URLs give identical hashes on purpose. Clashes between different URLs are the problem.",
      ],
    },
    {
      q: "Peak redirect load is 12,000 reads a second and the cache hit rate is 95 percent. About how many reads reach the database?",
      options: [
        "About 12,000, because every read checks the database",
        "About 6,000, because a cache halves the load",
        "About 600, which is 5 percent of the peak",
        "About 60, which is 0.5 percent of the peak",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Misses are 5 percent of 12,000, which is 600 a second. That is easy for one database, which is why a small hot set in memory carries the design.",
      distractors: [
        "In cache-aside the database is read only on a miss, not on every request.",
        "Halving is a 50 percent hit rate, not 95 percent.",
        "",
        "That would be a 99.5 percent hit rate. Take 5 percent of 12,000.",
      ],
    },
    {
      q: "A bank sends 20 million SMS in one hour, each with its own short link created in that hour. About how many creations a second, and what follows?",
      options: [
        "About 55 a second, so one insert loop on a single database is plenty",
        "About 330 a second, so a hash with a retry loop is the only safe option",
        "About 56,000 a second, so every link must be cached for ten years",
        "About 5,600 a second, so servers should lease blocks of ids",
      ],
      answer: 3,
      difficulty: "apply",
      why: "20 million over 3,600 seconds is about 5,600 a second. A single counter row becomes a hot spot at that rate, so each server leasing a block of ids and encoding locally keeps creation off the shared counter.",
      distractors: [
        "That is a hundred times too low. 20 million over 3,600 seconds is much higher.",
        "The arithmetic is off, and a counter with leased blocks avoids retries anyway.",
        "That is ten times too high, and ten-year caching is unrelated to creation rate.",
        "",
      ],
    },
    {
      q: "Two users request the custom alias `diwali` in the same millisecond. What makes sure only one gets it?",
      options: [
        "Look the alias up first, then insert it if it is missing",
        "A unique constraint on the code, so the second insert fails",
        "Check the cache first, since the cache holds all taken aliases",
        "A Bloom filter of taken aliases consulted before the insert",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Only the database can decide atomically. With a unique constraint one insert succeeds and the other fails, and the service returns a conflict. Any check made before the insert is open to a race.",
      distractors: [
        "Both requests can pass the check before either inserts. That is the classic race.",
        "",
        "A cache is a copy and can be stale or empty, so it cannot settle ownership.",
        "A Bloom filter can say 'maybe taken' wrongly and is never the authority on what exists.",
      ],
    },
    {
      q: "A marketing team needs a count of every click and the freedom to change a link's destination next week. Which design fits?",
      options: [
        "A 301 with a long browser cache lifetime, to cut load",
        "A 301, with counting done by a script on the destination page",
        "A 302, with each visit written to an event log for counting",
        "A 308 so that the request method is preserved on the redirect",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A temporary redirect sends each click back through the shortener, which can log it and can return a new target later. A permanent code lets browsers cache the old target and skip the count.",
      distractors: [
        "A permanent redirect with a long cache is the opposite of what is needed: repeats are skipped and edits are ignored.",
        "The destination page is not under the shortener's control, and repeat visits may never reach it.",
        "",
        "308 is also a permanent redirect, so it has the same caching problem. Method preservation is not the issue.",
      ],
    },
    {
      q: "A company shortens links to private payslips using plain sequential base-62 codes. What is the sound judgement?",
      options: [
        "Risky: neighbouring codes can be guessed, so scramble them and check access",
        "Safe: seven characters are far too many for anyone to try by hand",
        "Safe: the 302 redirect hides the destination from outsiders who click",
        "Risky, but only because a 301 would let browsers cache the payslip",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Sequential codes are dense, so anyone who has one valid code can try the ones next to it. Private content needs unguessable codes and an access check on the destination, not obscurity alone.",
      distractors: [
        "",
        "Density is the problem. An attacker does not search all 3.5 trillion codes, only the neighbours of a known one.",
        "A redirect reveals its target to whoever follows it, so it hides nothing.",
        "Caching is a separate concern. The main flaw is that the next code is predictable.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-url-shortener-small-team",
      scenario:
        "A six-person start-up wants short links for marketing emails. It creates about 3,000 links a month and serves 50,000 redirects a month. One PostgreSQL database already runs, and one engineer will own the service. Which design should they build?",
      options: [
        {
          label: "One table with an auto-increment id, base-62 encoded, a unique index on aliases, no separate cache at first",
          appeal:
            "Smallest thing that works, uses the database they already run, and has no collisions to handle.",
        },
        {
          label: "A key-generation service with pre-built codes and a Redis cluster for the lookups",
          appeal:
            "Scales to huge volumes and keeps code creation off the hot path.",
        },
        {
          label: "Hash each long URL, sharded across three regions with a Bloom filter in front",
          appeal:
            "Stateless creation and protection from guessed codes at any scale.",
        },
        {
          label: "Snowflake-style 64-bit ids from three data centres, encoded in base 62",
          appeal:
            "Ids are unique across machines with no coordinator, and they are time-ordered.",
        },
      ],
      best: 0,
      verdict:
        "The load is about 1 redirect every 50 seconds. One database serves it with room to spare, and an auto-increment id gives uniqueness for free. Every other option adds machines or moving parts that one engineer would have to run to solve a scale problem the company does not have.",
      claims: [
        {
          text: "You accept a single writer and a single database as the point of failure, in return for almost no operating work.",
          axis: "trade",
          correct: true,
          note: "True. At this volume a nightly backup and a quick restore are enough.",
        },
        {
          text: "You accept guessable sequential codes, which is fine only because marketing links are public.",
          axis: "trade",
          correct: true,
          note: "True. If the links pointed at private content you would scramble the id.",
        },
        {
          text: "You accept collision checks and retries on every insert.",
          axis: "trade",
          correct: false,
          note: "That belongs to the hash design. A counter never collides.",
        },
        {
          text: "If the database is down, redirects fail until it is restored, and the team must decide that this is acceptable.",
          axis: "failure",
          correct: true,
          note: "True. With no cache and no replica, availability equals the database's.",
        },
        {
          text: "Seven base-62 characters will run out within a year at 3,000 links a month.",
          axis: "failure",
          correct: false,
          note: "Seven characters hold 3.5 trillion codes. Even four characters hold about 14 million.",
        },
        {
          text: "Watch redirect latency and error rate, and add a cache only if the database shows load.",
          axis: "measure",
          correct: true,
          note: "True. Measure first, since a cache is not needed at this rate.",
        },
        {
          text: "The cache hit rate is the key number to track from day one.",
          axis: "measure",
          correct: false,
          note: "There is no cache yet, so there is no hit rate to track.",
        },
      ],
    },
    {
      id: "sd-design-url-shortener-festival-sms",
      scenario:
        "A payments app in India sends 50 million SMS in 30 minutes for a festival offer. Each SMS carries a unique short link, and most people tap within a few minutes, so redirects peak near 60,000 a second. The campaign team wants click counts on a dashboard within minutes. A team of twenty runs the service. What is the best design?",
      options: [
        {
          label: "One database counter, an insert per link at send time, and an update of a click_count column on every redirect",
          appeal:
            "Simple to write and the counts are always exact.",
        },
        {
          label: "301 redirects through a CDN that caches every code for a week",
          appeal:
            "The edge absorbs the whole spike and the origin sees almost nothing.",
        },
        {
          label: "Create codes ahead of the send from leased id blocks, pre-warm the cache, redirect with a 302, and write each click to an event log counted asynchronously",
          appeal:
            "Each part removes one source of load from the redirect path while keeping counts.",
        },
        {
          label: "Hash each long URL and retry on collision, with a counter update per click",
          appeal:
            "No coordination is needed to create links, and the counts are exact.",
        },
      ],
      best: 2,
      verdict:
        "The spike is read-heavy and short, so the redirect must be one cached lookup. Creating 50 million codes before the send removes creation from the peak. A 302 with an event log keeps counts without a write per click. A per-click update makes hot rows, and a long-cached 301 loses the counts the team needs.",
      claims: [
        {
          text: "You accept that dashboard counts lag by seconds or minutes, in return for a redirect that never waits on a write.",
          axis: "trade",
          correct: true,
          note: "True. The team asked for minutes, so this lag is within what they need.",
        },
        {
          text: "You spend memory and warm-up time to hold the campaign's codes in cache before the send.",
          axis: "trade",
          correct: true,
          note: "True. 50 million entries at about 200 bytes is about 10 GB, a fair price for a predictable spike.",
        },
        {
          text: "You get exact counts for free by updating one counter row per click.",
          axis: "trade",
          correct: false,
          note: "Exact counting per click creates a write for every read, and a hot row at 60,000 a second.",
        },
        {
          text: "If the event log or its consumers fall behind, counts are late but redirects keep working.",
          axis: "failure",
          correct: true,
          note: "True. That is why the log sits beside the redirect path, not inside it.",
        },
        {
          text: "If the cache loses a node during the spike, the database cannot be affected because the codes are permanent.",
          axis: "failure",
          correct: false,
          note: "A cold node sends its share of reads to the database at once, so the database needs headroom or a warm replacement.",
        },
        {
          text: "Track the redirect 99th percentile latency, the cache hit rate and the lag of the click log.",
          axis: "measure",
          correct: true,
          note: "True. They show user pain, protection of the database, and freshness of the dashboard.",
        },
        {
          text: "The daily average of redirects a second shows whether the spike was handled.",
          axis: "measure",
          correct: false,
          note: "A 30-minute spike disappears inside a daily average.",
        },
      ],
    },
    {
      id: "sd-design-url-shortener-expiry",
      scenario:
        "A coupon service creates 30 million links a day. Each link expires after 7 days. Product suggests reusing expired codes from a free list to keep codes short. Customers often forward old SMS messages and keep QR codes in printed material. Seven-character codes are in use. What should the service do with expired codes?",
      options: [
        {
          label: "Put each expired code on a free list and reuse it for new links",
          appeal:
            "Keeps the key space small and codes short forever.",
        },
        {
          label: "Never reuse a code: answer expired ones with 410 Gone, and let a sweeper delete the stored target after a quarantine period while keeping the code reserved",
          appeal:
            "A stale message can never open someone else's page, and storage is still reclaimed.",
        },
        {
          label: "Move to ten-character codes so expired ones can be deleted completely",
          appeal:
            "Plenty of room, so there is never any pressure to reuse.",
        },
        {
          label: "Expire only the cache entry and keep serving the target from the database",
          appeal:
            "No special expiry logic and no broken links for anyone.",
        },
      ],
      best: 1,
      verdict:
        "At 30 million a day, 3.5 trillion codes last over 300 years, so there is no shortage that reuse would fix. Reuse is dangerous because old SMS and printed QR codes would resolve to a new destination. Keeping the code reserved and returning 410 Gone is safe, and deleting the stored target after a quarantine reclaims the space.",
      claims: [
        {
          text: "You accept a code space that only grows, in return for old links never changing meaning.",
          axis: "trade",
          correct: true,
          note: "True. The space is large enough that this costs nothing in practice.",
        },
        {
          text: "You keep a small reserved-code record after the target is deleted, so the code is not issued again.",
          axis: "trade",
          correct: true,
          note: "True. It is a few bytes per code and it is what makes the 410 answer possible.",
        },
        {
          text: "Reusing codes saves a meaningful amount of the code space.",
          axis: "trade",
          correct: false,
          note: "At 30 million a day the space lasts centuries. Reuse saves nothing that matters.",
        },
        {
          text: "A recycled code can send a customer holding an old SMS or QR code to someone else's page.",
          axis: "failure",
          correct: true,
          note: "True, and it could be a hostile page. This is the main risk of reuse.",
        },
        {
          text: "Setting a short cache lifetime on a link also makes the link itself expire.",
          axis: "failure",
          correct: false,
          note: "A cache lifetime only limits staleness. Expiry must be checked against the stored expiry time on every lookup.",
        },
        {
          text: "Track hits on expired codes: a steady stream shows old messages still in circulation.",
          axis: "measure",
          correct: true,
          note: "True. That count tells you how long to keep codes reserved.",
        },
        {
          text: "The size of the free list is the main health metric for the code space.",
          axis: "measure",
          correct: false,
          note: "There should be no free list. The useful number is the share of the 3.5 trillion codes used.",
        },
      ],
    },
  ],
};

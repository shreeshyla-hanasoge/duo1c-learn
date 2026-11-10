import type { Topic } from "../../types.ts";

export const sdDnsCdn: Topic = {
  id: "sd-dns-cdn",
  title: "DNS, CDNs and the edge",
  tier: 1,
  week: 2,
  depth: "deep",
  summary:
    "How a name becomes an address, why TTLs limit failover, how a CDN caches by key, and how to change content without waiting for caches to expire.",
  why: "Before your servers see a request, two systems have already touched it: DNS, which turns a name into an address, and often a CDN, which may answer without reaching you at all. Both are caches with their own clocks, and most surprising outages from a migration, a failover or a stale page come from forgetting that. If you can reason about TTLs, cache keys and invalidation, you can plan a cut-over, speed up a site for users far away, and keep a traffic spike off your origin. Traed uses a small version of each.",
  learn: {
    intuition:
      "Think of a city's phone directory and its local shops. Looking up a number in the national directory takes a long call. So the exchange near your home keeps a notebook of numbers it has already looked up, and writes beside each one how long it may be trusted. That is DNS. If a shop moves and the notebook says trust it for a day, some callers reach the old shop until the day is over. Now the shops. A famous bookstore in Delhi has one warehouse. Readers in Chennai and Guwahati wait for every parcel. So the bookstore keeps copies of popular books in small stores near readers, and only calls the warehouse for a book the local store does not have. That is a CDN. The hard parts are the same in both: knowing when a copy has gone out of date, and making sure two requests that should share one copy are not treated as different.",
    mechanics: [
      {
        heading: "Resolution and TTL",
        body: "A browser asks a recursive resolver, usually run by an ISP or a public service. If the answer is not cached, the resolver asks a root server which servers handle `.in`, then those servers which handle the domain, then the domain's authoritative server, which returns the address. The answer is cached for its TTL, the number of seconds it may be reused, at the resolver and also in the operating system and browser. Worked example: with a TTL of 300, after you move to a new address some users keep reaching the old one for up to 5 minutes, and a few resolvers hold on longer. So lower the TTL a day before a planned move and raise it afterwards. Common record types are A and AAAA for addresses, CNAME for aliases, MX for mail and TXT for text.",
      },
      {
        heading: "DNS routing and failover",
        body: "An authoritative server can answer differently for each asker. Weighted records send 10 percent of users to a new site, latency or geography records send users to the nearest region, and health-checked failover stops returning an address that fails its checks. It is cheap and global. But TTL is a floor on how fast it works: with a 60 second TTL and three failed checks 10 seconds apart, a well-behaved resolver stops sending traffic after roughly 90 seconds, others later, and open connections are not moved. Anycast does better: many places announce the same address and the network delivers each packet to the nearest. Root servers, public resolvers and CDN edges use it, and failover takes seconds.",
      },
      {
        heading: "CDN caching and the cache key",
        body: "A CDN is many caches, called points of presence, close to users. A request goes to the nearest edge. On a hit it is answered in a few milliseconds. On a miss the edge fetches from the origin, stores the response as `Cache-Control` allows (`max-age`, `s-maxage`, `immutable`) and returns it. The cache key is normally the host, path and query string, plus any request headers named in `Vary`. A needless part in the key splits the cache: 100 different tracking values on one URL make 100 copies. The hit ratio decides origin load: out of 1,000 requests, a 95 percent ratio sends 50 to the origin and a 99 percent ratio sends 10. Static files cache well; per-user pages must not be shared.",
      },
      {
        heading: "Invalidation, shielding and object storage",
        body: "Purging a URL or tag from every edge costs time and money and takes seconds to minutes. A cleaner tool is versioned names: `app.3f2a1c.js` is a new URL for new content, so the old copy is never asked for again and can be cached for a year with `immutable`. `stale-while-revalidate` lets an edge serve an old copy while it fetches a fresh one. Origin shielding adds one cache tier between the edges and the origin, so a miss in 200 edges becomes one request to the shield and at most one to the origin, which protects it after a purge. Put large files in object storage such as S3 and serve them through the CDN, with signed URLs for private ones.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed uses small versions of these ideas. The names `traed.in` and `engine.traed.in` point to the one VM, so there is no DNS failover, only one place to go. nginx marks static files such as scripts, styles and images with a one-year, immutable cache header, which is safe only when a changed file gets a new name. Two pages load an icon stylesheet from a public CDN, `cdnjs`. There is no CDN of our own: one daily user needs none. Many users spread across regions, or heavy static files, would justify one in front of the web app's assets.",
      },
    ],
    complexityDerivation:
      "Both DNS and a CDN work by letting many readers share one copy, and both rest on a single bargain: you may serve a copy for a fixed time without asking, and in return the origin sees a small share of the traffic. The average cost of a request is the hit ratio times the edge cost plus the miss ratio times the origin cost, so at a 99 percent hit ratio the origin carries one hundredth of the load. The invariant that keeps it safe is that a copy served after the content changed is acceptable for at most its TTL. That holds when the content is public, identical for every viewer, and changes at known times. It breaks in four places. Per-user or secret responses must not be shared, so the cache key or the caching rules must separate them. Content that must change at once cannot wait for a TTL, so versioned names or a purge are needed. A cold or purged cache sends everything to the origin together, which shielding softens. And a failover that relies on DNS cannot be faster than its TTL and the slowest resolver.",
    variants: [
      {
        name: "DNS round robin and weighted records",
        when: "You want a rough spread across a few servers or sites, or a gradual move of traffic, and can tolerate slow reaction.",
        delta:
          "Several addresses are returned for one name. It is free and global, but it has no view of load, and caches hold answers for the TTL.",
      },
      {
        name: "Health-checked DNS failover",
        when: "You have a standby site and need traffic to move when the primary fails, within a minute or two.",
        delta:
          "The authoritative server stops returning the failed address. Speed is limited by TTL and by resolvers that ignore it, so lower the TTL in advance and rehearse it.",
      },
      {
        name: "CDN with origin shield",
        when: "Many users are far from the origin, or static files and media dominate the traffic.",
        delta:
          "Edges answer most requests, and a shield tier collapses misses before the origin. It costs money, adds a cache to reason about, and needs rules for what must not be cached.",
      },
    ],
    tradeoffs: [
      {
        vs: "Short versus long DNS TTL",
        pick: "Moderate by default, short before a planned change",
        because:
          "A 30 second TTL makes moves fast but raises query load and adds lookup latency for users. A day-long TTL makes moves slow. Lower it only when you are about to change a record.",
      },
      {
        vs: "Purge versus versioned URLs",
        pick: "Versioned URLs for assets, purge for the few things that cannot be renamed",
        because:
          "A new name needs no purge and no waiting. A purge is slow, may be rate-limited, and still leaves copies in browsers.",
      },
      {
        vs: "Cache dynamic responses at the edge versus keep them at the origin",
        pick: "Cache public, identical responses briefly, and keep per-user ones private",
        because:
          "A short edge lifetime on a public price list saves the origin a lot. The same on a portfolio page shows one person's holdings to another, so the cost of a mistake decides.",
      },
    ],
  },
  algorithms: [
    {
      name: "Hierarchical name lookup",
      role: "Resolves a name label by label from the right, root then top-level domain then domain, which is a walk down a tree of delegations.",
      dsa: "tries",
    },
    {
      name: "TTL cache with LRU eviction",
      role: "Each resolver and edge keeps an answer until its time limit passes and drops the least recently used entries when space runs out.",
      dsa: "lru",
    },
    {
      name: "Consistent hashing inside a point of presence",
      role: "Spreads URLs over the cache servers of one site so adding a server moves few objects and each object is stored once.",
    },
  ],
  realWorld: [
    {
      system: "Cloudflare and the 1.1.1.1 resolver",
      kind: "industry",
      problem:
        "A public resolver and a CDN both need to be near every user and to survive the loss of any one site.",
      applied:
        "Cloudflare documents that it announces the same IP addresses from data centres in many cities using anycast, so each user's packets reach a nearby site and traffic shifts automatically if one site is withdrawn.",
      evidence: "Cloudflare documentation and blog posts on anycast and the 1.1.1.1 resolver",
      impact:
        "Failover and nearness come from routing, so they do not wait for a DNS TTL to expire.",
    },
    {
      system: "Akamai and the origin shield idea",
      kind: "industry",
      problem:
        "When many edge servers all miss together, for example after content is updated, the origin is flooded with identical requests.",
      applied:
        "Large CDNs, Akamai among them, describe tiered distribution: edge servers ask a smaller set of parent caches before the origin, and CloudFront offers a similar Origin Shield option. Misses from many edges merge into few origin requests.",
      evidence: "Akamai tiered distribution documentation; Amazon CloudFront Origin Shield documentation",
      impact:
        "The origin sees a small number of requests after a cache purge or a new release, not one per edge.",
    },
    {
      system: "Amazon Route 53 health-checked failover",
      kind: "industry",
      problem:
        "A service with a standby region needs traffic to leave a failed primary without a person editing DNS during the outage.",
      applied:
        "Route 53 documents failover, weighted and latency routing policies, with health checks that mark a record unhealthy so it is no longer returned. Its guidance notes that TTL still limits how fast clients move.",
      evidence: "Amazon Route 53 developer guide: routing policies and health checks",
      impact:
        "Failover is automatic, and the delay is bounded by check settings and the record's TTL.",
    },
    {
      system: "Traed static caching and a public CDN",
      kind: "yours",
      problem:
        "A returning user should not re-download unchanged scripts, styles and images, and a large chart response should travel compressed.",
      applied:
        "nginx on the web host sets a one-year `immutable` cache header on static file types and compresses JSON responses. Two pages load an icon stylesheet from a public CDN instead of serving it themselves.",
      evidence: "deployment-scripts/deploy.sh (nginx static caching and gzip); CMS/trade-server/resources/js/Pages/MarketAnalysis.vue",
      impact:
        "Repeat visits skip the downloads, and the compressed chart payload is far smaller on the wire.",
    },
  ],
  insights: [
    {
      t: "TTL is a promise to stay wrong",
      d: "A cached answer may be used until its TTL ends, so a change reaches users only after the longest TTL in the path. Lower it before a move.",
    },
    {
      t: "The cache key decides the hit ratio",
      d: "Host, path and query by default. Extra parts such as tracking parameters split one object into many copies and drag the ratio down.",
    },
    {
      t: "Rename instead of purge",
      d: "Put a content hash in the file name and cache it for a year. New content gets a new URL, so there is nothing to invalidate.",
    },
    {
      t: "Never share what is personal",
      d: "Edge caching suits public, identical responses. A per-user page cached on the edge can show one person's data to another.",
    },
  ],
  pitfalls: [
    "Changing a DNS record and expecting immediate effect. Browsers, operating systems and resolvers each cache the old answer until its TTL ends.",
    "Giving a long cache lifetime to a file whose name never changes, so a bug fix cannot reach users until the lifetime ends or you purge.",
    "Letting cookies or tracking parameters into the cache key, which turns one popular file into many rarely reused copies.",
  ],
  quiz: [
    {
      q: "What does the TTL on a DNS record control?",
      options: [
        "How long the authoritative server keeps the record in its database",
        "How many network hops a packet may take before it is dropped",
        "How long a client may wait for a reply before giving up",
        "How long resolvers and clients may reuse a cached answer",
      ],
      answer: 3,
      difficulty: "recall",
      why: "TTL stands for time to live. It tells every cache on the path how long the answer may be reused without asking again.",
      distractors: [
        "The authoritative server holds the record until you change it. TTL is advice to the caches that copy it.",
        "That is the IP packet's own hop limit, which is a different field.",
        "A reply timeout is a client setting. TTL has nothing to do with waiting.",
        "",
      ],
    },
    {
      q: "What forms the default cache key at a CDN edge?",
      options: [
        "Host, path and query string, plus Vary headers",
        "Only the file extension, such as .js or .png",
        "The visitor's IP address and cookies",
        "The origin server's name and port",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The edge treats two requests as the same object when host, path, query and varying headers match. Anything extra splits the cache.",
      distractors: [
        "",
        "An extension would mix every script into one object.",
        "Per-visitor values would give every visitor a private copy, which defeats sharing.",
        "The origin name is the same for all requests, so it cannot tell objects apart.",
      ],
    },
    {
      q: "A record has a TTL of 300 seconds. You move to a new server at 12:00 and shut the old one at 12:00. What can some users see?",
      options: [
        "Nothing odd, because DNS updates reach everyone instantly",
        "Errors for up to about 5 minutes, longer on some resolvers",
        "Errors for exactly 24 hours, which is the standard DNS delay",
        "Errors for about 30 seconds, the time of one lookup",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Caches may keep the old address until their copy expires, up to 300 seconds, and some keep it longer. Keep the old server alive for at least the TTL.",
      distractors: [
        "There is no instant update. Each cache keeps its copy until the TTL ends.",
        "",
        "24 hours is not a standard. The delay follows the TTL you set.",
        "A single lookup takes milliseconds. The delay comes from caches, not from lookups.",
      ],
    },
    {
      q: "A site serves 2 million requests a day for static files. Its hit ratio improves from 90 percent to 99 percent. What happens to origin requests?",
      options: [
        "They fall from 200,000 to 100,000",
        "They fall from 2,000 to 200",
        "They fall from 200,000 to 20,000",
        "They stay the same, because the hit ratio only changes speed",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Misses reach the origin. 10 percent of 2 million is 200,000 and 1 percent is 20,000, so a nine point gain cuts origin load by ten times.",
      distractors: [
        "That is only a halving. The miss share falls from 10 percent to 1 percent, a tenfold cut.",
        "The numbers are off by a factor of 100. Ten percent of 2 million is 200,000.",
        "",
        "Every hit is a request the origin never sees, so the ratio drives origin load directly.",
      ],
    },
    {
      q: "Marketing adds a different `utm_source` value to every campaign link to the same product image, and the CDN hit ratio falls. What is the best fix?",
      options: [
        "Raise the lifetime of the cache to one year",
        "Purge the whole CDN again every single hour",
        "Turn the CDN off for all of the images",
        "Drop tracking parameters from the cache key",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Each distinct query string is its own object, so one image is stored many times. Normalising the key restores sharing.",
      distractors: [
        "A longer TTL keeps more copies for longer but does not make them shared.",
        "Purging empties the cache and makes every request a miss.",
        "That removes the benefit for all images to fix a key problem.",
        "",
      ],
    },
    {
      q: "A bug fix to `/app.js` does not reach users for hours because the file has a one-year `max-age`. What is the best long-term fix?",
      options: [
        "Put a content hash in the name, like `app.3f2a1c.js`",
        "Set `max-age` to 60 seconds on every file so changes arrive fast",
        "Ask all users to hard-refresh their browsers after each release",
        "Add a query string such as `?v=1` once and never change it",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A new name is a new cache key, so users fetch it at once while unchanged files stay cached for a year.",
      distractors: [
        "",
        "That throws away caching for files that never change and raises origin load.",
        "Users will not do this, and CDN edges still hold the old file.",
        "A constant version never changes, so the problem returns on the next release.",
      ],
    },
    {
      q: "To make failover instant, a team proposes a 5 second TTL on every DNS record. What is the sound judgement?",
      options: [
        "Good, because a short TTL guarantees instant failover everywhere",
        "No: it adds lookups, some resolvers ignore it; use health-checked failover",
        "Good, as long as the records are also cached at the CDN",
        "Not needed, because browsers never cache DNS answers",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Very low TTLs add lookups, cost and delay for every user, and still do not control resolvers that hold answers longer. Use them only on records that need quick failover, with health checks.",
      distractors: [
        "Nothing guarantees instant failover, since resolvers and open connections may ignore the TTL.",
        "",
        "A CDN does not cache DNS answers in this way, so it does not help.",
        "Browsers and operating systems do cache DNS answers.",
      ],
    },
    {
      q: "To cut origin load, a broker's CDN is set to cache the account holdings page for 5 minutes at the edge. What is the right call?",
      options: [
        "Fine, because 5 minutes is shorter than a trading session",
        "Fine, if the CDN uses origin shielding",
        "No: it differs per user, so mark it private or no-store",
        "Fine, provided the TTL is lowered to 5 seconds",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A shared cache may hand one user's response to another. Personal data should be uncacheable at the edge, however short the lifetime.",
      distractors: [
        "Length of the lifetime is not the issue. The issue is who may receive the copy.",
        "Shielding reduces origin load but also shares the same wrong copy more widely.",
        "",
        "Even 5 seconds can expose one person's holdings to another.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-dns-cdn-static-assets-small-team",
      scenario:
        "A three-person team runs a web app from one VM in a single city. Users are spread across India and the Gulf, many on mobile networks. The 3 MB JavaScript and CSS bundle loads slowly for distant users, the VM's network bandwidth is limited, and a release happens twice a week. API responses are per user. How should they speed this up with the least risk?",
      options: [
        {
          label: "Move the app to several regions with DNS geo routing",
          appeal: "Brings the whole application near every user.",
        },
        {
          label: "Put a CDN in front of the static files only, using hashed file names and a long cache lifetime, and leave API responses uncached",
          appeal: "Takes the heavy, unchanging bytes off the VM and close to users, with no purge needed for releases.",
        },
        {
          label: "Cache everything on the CDN for 10 minutes, including the API",
          appeal: "Biggest cut in origin load with one setting.",
        },
        {
          label: "Lower the DNS TTL to 5 seconds",
          appeal: "Faster DNS changes may help latency.",
        },
      ],
      best: 1,
      verdict:
        "The cost is the static bundle crossing a long distance and using the VM's bandwidth. A CDN for static files fixes that, and hashed names make releases safe without purging. Multi-region is a large change with data to keep in step, caching per-user APIs leaks data, and a short TTL does nothing for page weight.",
      claims: [
        {
          text: "You accept a new bill and a new place where content can be stale, in return for faster loads and lower origin bandwidth.",
          axis: "trade",
          correct: true,
          note: "True. A CDN adds cost and one more cache to reason about.",
        },
        {
          text: "Hashed file names mean a release needs no purge, because new content has a new URL.",
          axis: "trade",
          correct: true,
          note: "True. This is why the long lifetime is safe.",
        },
        {
          text: "The CDN also speeds up the per-user API calls without any change.",
          axis: "trade",
          correct: false,
          note: "False. Uncached API responses still go to the origin, though the connection may be faster.",
        },
        {
          text: "If the HTML page still points at the old hashed file after a release, users can see a broken page, so the HTML must be cached briefly or not at all.",
          axis: "failure",
          correct: true,
          note: "True. The HTML is the pointer, and it must change when the files change.",
        },
        {
          text: "Caching API responses for 10 minutes is safe because the TTL is short.",
          axis: "failure",
          correct: false,
          note: "False. A shared cache could serve one user's data to another.",
        },
        {
          text: "Track the cache hit ratio for static files and the page load time for users far from the origin.",
          axis: "measure",
          correct: true,
          note: "True. These show whether the CDN is absorbing load and helping those users.",
        },
        {
          text: "The origin server's CPU is the main measure of whether the change worked.",
          axis: "measure",
          correct: false,
          note: "False. The problem was bandwidth and distance, and CPU may not have been involved.",
        },
      ],
    },
    {
      id: "sd-dns-cdn-festival-sale",
      scenario:
        "An online shop starts a festival sale at midnight. About 20 million users arrive within minutes. Product pages use millions of images held in object storage, and the prices of 10,000 items change at midnight. The origin application can serve only a few thousand requests a second. Images never change once published. How should the edge be set up?",
      options: [
        {
          label: "Serve images through a CDN with an origin shield and hashed URLs, and fetch prices from a small API that has a very short cache lifetime and stale-while-revalidate",
          appeal: "Most requests never reach the origin, and the fast-changing part stays small and controlled.",
        },
        {
          label: "Autoscale the origin application to serve every request",
          appeal: "Keeps one simple path with no extra cache.",
        },
        {
          label: "Purge the whole CDN at midnight so prices refresh",
          appeal: "Guarantees no old price remains.",
        },
        {
          label: "Replicate all images to every region and route users with DNS",
          appeal: "Local copies everywhere with no cache rules.",
        },
      ],
      best: 0,
      verdict:
        "Images dominate bytes and never change, so they belong at the edge with long lifetimes. Prices are small and change at a known time, so a short-lived cached API absorbs the surge safely. A full purge would send every request to the origin at its worst moment, autoscaling is slow and costly for static bytes, and replicating everything by DNS is heavy and still has no health view.",
      claims: [
        {
          text: "You accept that a price may be a few seconds old at the edge, in return for the origin serving a fraction of requests.",
          axis: "trade",
          correct: true,
          note: "True. A bounded delay is the price of absorbing a surge.",
        },
        {
          text: "You pay the CDN for the transfer of images, in return for not scaling the origin for static bytes.",
          axis: "trade",
          correct: true,
          note: "True. Bandwidth moves to the layer built to carry it.",
        },
        {
          text: "A purge of everything at midnight is the safest way to show new prices.",
          axis: "failure",
          correct: false,
          note: "False. After a purge every edge misses at once, which is the stampede the shield and short lifetimes avoid.",
        },
        {
          text: "If the pricing API becomes slow, stale-while-revalidate lets edges keep serving the last price while refreshing, up to a limit you set.",
          axis: "failure",
          correct: true,
          note: "True. It trades a bounded staleness for staying up.",
        },
        {
          text: "Watch edge hit ratio, origin requests per second at midnight, and the age of the prices that users see.",
          axis: "measure",
          correct: true,
          note: "True. They show offload, origin safety and the freshness promise.",
        },
        {
          text: "Total traffic served by the CDN is the best sign the origin is safe.",
          axis: "measure",
          correct: false,
          note: "False. High CDN traffic with a low hit ratio still floods the origin.",
        },
      ],
    },
    {
      id: "sd-dns-cdn-regional-failover",
      scenario:
        "A payments dashboard runs in a primary region with a warm standby in another. It must move users to the standby within about two minutes if the primary fails. The team is small, uses a cloud provider's DNS, owns no IP address space, and the record currently has a one-hour TTL. Clients are browsers and mobile apps. What should they do?",
      options: [
        {
          label: "Keep the one-hour TTL and edit the record by hand when the primary fails",
          appeal: "Nothing new to set up and the team controls every change.",
        },
        {
          label: "Hard-code the standby address into the next mobile app release",
          appeal: "The app no longer depends on DNS.",
        },
        {
          label: "Lower the TTL to about 60 seconds ahead of time, add a health-checked failover record, and rehearse the switch",
          appeal: "Automatic movement bounded by the TTL and the check settings.",
        },
        {
          label: "Build an anycast network that announces both regions",
          appeal: "Failover in seconds, with no DNS wait.",
        },
      ],
      best: 2,
      verdict:
        "The target is about two minutes, which a 60 second TTL plus health checks meets for well-behaved resolvers, and it uses services the team already has. A one-hour TTL cannot meet it, hard-coded addresses break when addresses change, and anycast needs address space and routing expertise the team lacks.",
      claims: [
        {
          text: "You accept some resolvers and clients moving later than 60 seconds, and a small rise in lookup traffic.",
          axis: "trade",
          correct: true,
          note: "True. TTL is a request, not a guarantee, and lower TTLs mean more lookups.",
        },
        {
          text: "You accept that the standby must be warm and tested, or the failover only moves users to another failure.",
          axis: "trade",
          correct: true,
          note: "True. DNS can move users, but it cannot make the standby ready.",
        },
        {
          text: "Lowering the TTL during the outage gives the same result as lowering it beforehand.",
          axis: "failure",
          correct: false,
          note: "False. Caches already hold the one-hour answer and ignore the new TTL until it expires.",
        },
        {
          text: "A false failure signal from a health check can move users away from a healthy primary, so the check should test a few vantage points and use sensible thresholds.",
          axis: "failure",
          correct: true,
          note: "True. Automatic action needs checks that do not flap.",
        },
        {
          text: "Time a rehearsed failover and count requests still reaching the old region after 2 and 5 minutes.",
          axis: "measure",
          correct: true,
          note: "True. This measures the real tail created by slow resolvers.",
        },
        {
          text: "The DNS record's configured TTL value is enough proof that failover meets the target.",
          axis: "measure",
          correct: false,
          note: "False. The configured value is a setting, and only a measured drill shows what clients do.",
        },
      ],
    },
  ],
};

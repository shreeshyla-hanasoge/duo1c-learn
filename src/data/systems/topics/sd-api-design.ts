import type { Topic } from "../../types.ts";

export const sdApiDesign: Topic = {
  id: "sd-api-design",
  title: "API design and protocols",
  tier: 1,
  week: 2,
  depth: "deep",
  summary:
    "An API is a promise between two programs. Compare REST, gRPC and GraphQL, polling and push, offset and cursor paging, and how to version and fail safely.",
  why: "Every system is a set of programs talking through APIs, and the API outlives the code behind it. Choose a bad shape and every client carries the cost for years: slow page loads, double charges after a retry, a mobile app that breaks on release day. System-design interviews also open with the API sketch, because it forces you to say what the system actually does. Traed shows small versions of several choices here: a polled status call, a paged trade list, and a WebSocket for live ticks.",
  learn: {
    intuition:
      "Think of a restaurant. The menu is the API. It lists what you may ask for, in words the kitchen understands, and it does not show how the food is made. A good menu stays the same even when the chef changes. Now think about how you ask. You can order one dish at a time (request and response). You can walk to the counter every five minutes to ask if your food is ready (polling). You can ask the waiter to stay and tell you the moment it is ready (push). A long menu is split into pages, and you do not want page three to change while you read page two. If the waiter does not answer, you may repeat your order, but then the kitchen must not cook two dishes. An API is all of this written down as a contract: what you can ask, how you hear back, what happens on a repeat, and what the errors mean.",
    mechanics: [
      {
        heading: "Three request styles: REST, gRPC, GraphQL",
        body: "REST models things as resources with URLs and uses HTTP verbs: GET reads, POST creates, PUT replaces, DELETE removes. It is simple, cacheable and works from any browser. gRPC calls a typed function on another service. Messages are encoded as Protocol Buffers, a compact binary format, and travel over HTTP/2, so many calls share one connection. It is fast and strictly typed, and it is common between internal services. GraphQL exposes one endpoint where the client lists the exact fields it wants. A mobile screen can fetch a user, their last orders and each order's items in one round trip instead of three. The price is harder caching and a need to limit query depth, so one client cannot ask for the whole database.",
      },
      {
        heading: "Getting updates: polling, long polling, SSE, WebSocket",
        body: "Plain polling asks every N seconds. With 10,000 clients polling every 2 seconds the server answers 5,000 requests a second, and most replies say nothing changed. Long polling holds each request open until there is news or a timeout, which cuts the empty replies. Server-sent events (SSE) keep one HTTP response open, and the server writes events down it. It is one-way, and browsers reconnect by themselves. A WebSocket upgrades an HTTP connection into a two-way channel, so either side can send at any time. That fits chat and market ticks, where messages are frequent in both directions. Rule of thumb: poll when changes are rare, SSE for one-way streams, WebSocket for two-way, high-rate traffic.",
      },
      {
        heading: "Pagination: offset versus cursor",
        body: "Offset paging says `LIMIT 20 OFFSET 100000`. The database must walk and discard 100,000 rows before returning 20, so page 5,000 is far slower than page 1. Worse, if a row is inserted while the reader moves from page 2 to page 3, one row shifts across the boundary and is shown twice. Cursor paging, also called keyset paging, sends the last key seen: `WHERE id < 8421 ORDER BY id DESC LIMIT 20`. With an index on `id` the database seeks straight to 8421, a B-tree lookup that costs the same on every page, and an insert cannot shift the reader. The cost is that you can step only forwards and backwards. You cannot jump to page 40. The cursor is an opaque token, so you can change its inside later.",
      },
      {
        heading: "Versioning, idempotency, timeouts and errors",
        body: "Adding an optional field never breaks a client. Renaming or removing one does, so a breaking change gets a new version, for example `/v2/orders`, and the old one runs until clients have moved. Idempotent means repeating a call has the same effect as making it once. GET, PUT and DELETE are idempotent by definition. POST is not, so a payment API takes an `Idempotency-Key` header: the server stores the key with the result, and a repeat returns the stored result instead of charging twice. Every call needs a timeout, because a missing answer is not a failure you can see. Errors should carry a stable machine code, not only prose, and should say whether a retry is safe. Retries use exponential backoff with jitter, for example waits of about 1, 2, 4 seconds with random spread.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed uses several of these in small form. The browser polls a backtest's status over plain HTTP, since a run takes minutes and polling is the simplest thing that works. The backtest result returns its trade list as numbered pages, with a page and a per-page size, which is offset paging over a list held in memory; that is fine at one user and a few thousand trades. Live ticks reach the browser over a WebSocket through an AWS gateway, because they are frequent and pushed by the server. Laravel talks to the Python engine over JSON HTTP. Traed has no public API, no versioning and no cursor paging yet. It would need those the day outside clients depend on it.",
      },
    ],
    complexityDerivation:
      "The reasoning behind a good API is that a contract should be cheap to keep and costly to break. Additive changes keep old clients working, so an API can grow for years without a version bump. Breaking changes need a parallel version, because you cannot upgrade every client on the same day, and a mobile app in users' pockets may run old code for months. Pagination follows from cost. Offset paging does work proportional to the offset, while cursor paging does work proportional to the page size, because the index jumps to the start. Idempotency follows from a fact about networks: a client that times out does not know whether the server acted, so it must be allowed to retry safely. These arguments hold while one server owns the data and callers are few. They bend when clients are untrusted or numerous: then you also need authentication, rate limits, quotas and deprecation policy. They also bend when you control both ends, for example two internal services deployed together, where a strict typed contract such as gRPC often matters more than a stable public URL.",
    variants: [
      {
        name: "REST over JSON",
        when: "Public or browser-facing APIs where simple tooling, HTTP caching and wide client support matter most.",
        delta:
          "Easy to debug with a browser or curl, and cacheable by CDNs. JSON is bulkier than binary, and several round trips may be needed for one screen.",
      },
      {
        name: "gRPC",
        when: "Internal service-to-service calls with high volume, strict types and streaming.",
        delta:
          "Smaller messages, generated client code and a shared connection per host. Browsers need a proxy to use it, and it is harder to inspect by hand.",
      },
      {
        name: "GraphQL",
        when: "Many client types (web, phone, partner) needing different slices of the same data.",
        delta:
          "The client picks fields, which removes over-fetching. You add query cost limits, and per-field caching is harder than per-URL caching.",
      },
    ],
    tradeoffs: [
      {
        vs: "Polling versus push (SSE or WebSocket)",
        pick: "Poll for slow, rare changes; push for frequent ones",
        because:
          "Polling needs no long-lived connections and survives restarts easily. Push saves wasted requests and gives lower delay, but the server must hold many open connections and handle reconnects.",
      },
      {
        vs: "Offset versus cursor pagination",
        pick: "Cursor for large or changing lists; offset for small, stable ones",
        because:
          "Offset gives page numbers and jumps, which suits an admin table of a few hundred rows. Cursor stays fast and stable on a feed of millions, at the cost of no random page access.",
      },
      {
        vs: "One broad version bump versus additive evolution",
        pick: "Evolve additively and version only for breaks",
        because:
          "A new version means two code paths to run and test. Adding optional fields keeps one path. Reserve a new version for the day a field must change meaning.",
      },
    ],
  },
  algorithms: [
    {
      name: "Keyset (cursor) pagination",
      role: "Seeks straight to the last key seen through an index, so the cost of a page does not grow with its position.",
      dsa: "balanced-trees",
    },
    {
      name: "Idempotency key with a dedupe table",
      role: "Stores each key with its result so a retried request returns the first outcome instead of repeating the action.",
      dsa: "hashing",
    },
    {
      name: "Exponential backoff with jitter",
      role: "Spaces out retries with growing, randomised waits so many failed clients do not return in the same instant.",
    },
  ],
  realWorld: [
    {
      system: "Stripe idempotency keys",
      kind: "industry",
      problem:
        "A network error after a charge request leaves the client unsure whether the card was charged. A blind retry could charge twice.",
      applied:
        "Stripe's API accepts an `Idempotency-Key` header on POST requests. It saves the status and body of the first request under that key and returns the same response for a later request with the same key.",
      evidence: "Stripe API documentation: idempotent requests",
      impact:
        "Clients can retry after a timeout without risking a second charge. This pattern is now standard for payment and order APIs.",
    },
    {
      system: "GitHub REST and GraphQL APIs",
      kind: "industry",
      problem:
        "Developers and tools need both simple resource access and the ability to fetch many related objects at once without dozens of calls.",
      applied:
        "GitHub offers a REST API with versioned media types and link-header pagination, and a GraphQL API where the client names the fields it wants and pages with cursors.",
      evidence: "GitHub documentation: REST API and GraphQL API",
      impact:
        "The same platform shows both styles in production: REST for simplicity and caching, GraphQL for fewer round trips on rich screens.",
    },
    {
      system: "Zerodha Kite Connect: REST plus WebSocket",
      kind: "industry",
      problem:
        "An algo client must place and query orders reliably, and also receive a stream of live prices without asking for each one.",
      applied:
        "Kite Connect uses a REST API for orders, positions and historical data, with published rate limits, and a separate WebSocket for streaming ticks in a compact binary format.",
      evidence: "Zerodha Kite Connect developer documentation",
      impact:
        "It shows the usual split: request and response for actions that must be confirmed, a push channel for high-rate data.",
    },
    {
      system: "Slack and Twitter-style cursor paging",
      kind: "industry",
      problem:
        "Timelines and message lists grow without end and change while a client reads them, so page numbers drift and deep offsets are slow.",
      applied:
        "Slack's web API returns a `next_cursor` value to pass on the next call, and Twitter's API paginates timelines with tokens or by passing the last seen id. The cursor is opaque to the client.",
      evidence: "Slack API documentation: pagination; Twitter API documentation: pagination",
      impact:
        "Page cost stays flat however far a client reads, and no item is skipped or repeated when new items arrive.",
    },
  ],
  insights: [
    {
      t: "The API is the promise",
      d: "Code behind it can change daily, but a field a client uses is a commitment. Add freely, remove carefully.",
    },
    {
      t: "Poll slow, push fast",
      d: "Polling is simplest when changes are rare. For frequent or two-way traffic, hold a connection open with SSE or a WebSocket.",
    },
    {
      t: "Cursors beat offsets at depth",
      d: "OFFSET 100000 reads and throws away 100,000 rows. A cursor seeks by index and costs the same on every page.",
    },
    {
      t: "A timeout is not a failure",
      d: "You do not know whether the server acted. Make writes idempotent with a key, so a retry is safe.",
    },
  ],
  pitfalls: [
    "Retrying a POST with no idempotency key. After a timeout the first call may already have succeeded, and the retry then creates a second order or charge.",
    "Returning HTTP 200 with an error in the body. Clients, proxies and monitors read the status code, so a failure hidden behind 200 is counted as success.",
    "Paging by page number over a list that changes. New rows push old ones across the boundary, so readers see duplicates or miss items.",
  ],
  quiz: [
    {
      q: "Which description fits a WebSocket?",
      options: [
        "A two-way channel over one connection where either side can send at any time",
        "A one-way stream where the server sends and the browser cannot reply",
        "A request that the server holds open until news arrives, then closes",
        "A binary format for describing function calls between services",
      ],
      answer: 0,
      difficulty: "recall",
      why: "A WebSocket starts as an HTTP request and upgrades into a persistent two-way channel. That is why it fits chat and live market ticks.",
      distractors: [
        "",
        "That describes server-sent events, which are one-way. A WebSocket allows messages in both directions.",
        "That is long polling. It closes the request after each reply, and the client must reconnect.",
        "That describes Protocol Buffers, the format gRPC uses. It is a message encoding, not a transport.",
      ],
    },
    {
      q: "What does it mean for an operation to be idempotent?",
      options: [
        "It always completes in less than one second",
        "Repeating it has the same effect as doing it once",
        "It can only be called by one client at a time",
        "It never returns an error to the caller",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Idempotent means the end state is the same whether the call runs once or several times. That property is what makes a retry after a timeout safe.",
      distractors: [
        "Speed is unrelated. A slow operation can be idempotent and a fast one can charge twice.",
        "",
        "Exclusive access is about locking, not repetition. Many clients may call an idempotent operation.",
        "Idempotent calls can still fail. The word is about what repeated success does, not whether errors occur.",
      ],
    },
    {
      q: "A trades table has 40 million rows. An admin screen pages with OFFSET and users who jump to page 20,000 wait many seconds. What is the most direct fix?",
      options: [
        "Cache each page in the browser for a longer time",
        "Increase the page size to 1,000 rows",
        "Add a second server behind a load balancer",
        "Switch to cursor paging on an indexed key",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The cost comes from the database walking and discarding the offset rows. A cursor on an indexed key seeks to the start of the page, so deep pages cost the same as the first.",
      distractors: [
        "Browser caching helps repeat visits to one page but does nothing for the first load of a deep page.",
        "Larger pages leave the offset cost unchanged and send more data on every request.",
        "A second server does not change the work one query must do. Both servers would walk the same rows.",
        "",
      ],
    },
    {
      q: "A client calls POST /orders and the connection drops with no reply. The order may or may not exist. Which design lets the client retry safely?",
      options: [
        "Retry immediately, up to five times, without changes",
        "Treat the timeout as a failure and show an error",
        "Send a client-generated key with the request and store its result",
        "Switch the call from POST to GET so it is safe",
      ],
      answer: 2,
      difficulty: "apply",
      why: "With a key stored beside its result, a repeated request returns the first outcome. The server can tell a retry from a new order.",
      distractors: [
        "Blind retries are how double orders happen when the first call actually succeeded.",
        "The order may exist, so reporting a failure leaves the user guessing and may lead them to place it again.",
        "",
        "A GET must not change state. Placing an order with GET breaks caching and safety rules.",
      ],
    },
    {
      q: "A dashboard shows a backtest that finishes in 3 to 10 minutes. Only the founder uses it. Which update method is a sensible first choice?",
      options: [
        "Poll the status endpoint every few seconds",
        "Build a WebSocket service with reconnect handling",
        "Use gRPC streaming from the browser",
        "Hold a long-poll connection open for ten minutes",
      ],
      answer: 0,
      difficulty: "apply",
      why: "One user polling every few seconds is a handful of requests per minute. Push adds connection management that the load does not justify.",
      distractors: [
        "",
        "A WebSocket works, but reconnects and server state are extra work for a rare, slow, single-user update.",
        "Browsers cannot speak plain gRPC without a proxy, and streaming solves a problem this load does not have.",
        "A request held for ten minutes will meet timeouts in proxies and browsers long before it finishes.",
      ],
    },
    {
      q: "A mobile app needs a home screen made from a profile, five recent orders and the items in each. Over a slow network it makes seven REST calls. What change targets this problem?",
      options: [
        "Move the same calls to a faster data centre",
        "Add one combined endpoint for the whole screen",
        "Add more fields to every response",
        "Version the API as /v2 with the same seven endpoints",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The cost is the number of round trips on a slow link. Combining the data into one call, through a purpose-built endpoint or GraphQL, removes six of them.",
      distractors: [
        "Latency per call would shrink a little, but seven round trips remain seven round trips.",
        "",
        "More fields per response increases size without removing a single request.",
        "A new version label changes nothing about how many calls the screen needs.",
      ],
    },
    {
      q: "You must add a required field to an existing API that thousands of installed mobile apps call. What is the safest approach?",
      options: [
        "Make the field required at once and ask users to update their apps",
        "Rename the old field and remove it in the same release",
        "Add it as optional first; require it only in a new version",
        "Remove validation so any request is accepted",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Old clients will not send the field for months. An optional field with a default keeps them working, and a new version can make it required for new clients.",
      distractors: [
        "Installed apps keep calling the old shape and would fail until every user updates, which could take months.",
        "Removing a field in use breaks every client that reads it on the day of release.",
        "",
        "Dropping validation lets bad data in and does not give the new field any meaning.",
      ],
    },
    {
      q: "A team proposes returning HTTP 200 for every response and putting the real status in a JSON body, 'to keep clients simple'. What is the main problem?",
      options: [
        "JSON bodies are larger than status codes and slow every response",
        "HTTP 200 is not allowed to carry a body",
        "Clients will need a second request to read the error",
        "Tools between you read status codes and miss real failures",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Infrastructure between client and server acts on the status code. A hidden error can be cached, will not trigger retries or alerts, and inflates the success rate.",
      distractors: [
        "The size difference is a few bytes. Speed is not the real cost of this design.",
        "A 200 response normally carries a body. The rule is not the problem.",
        "The body arrives in the same response, so no second request is needed.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-api-design-backtest-status",
      scenario:
        "A small team runs a web app on one server. Only the founder logs in. A backtest takes 3 to 10 minutes, and the page must show progress and the final result. The team has two people and no one to run extra services. They ask whether to build push updates.",
      options: [
        {
          label: "Poll a status endpoint every 3 seconds",
          appeal:
            "No new services, works through any proxy, and a restart of the server loses nothing because the status is read from the database.",
        },
        {
          label: "Build a WebSocket server that pushes progress",
          appeal:
            "Updates arrive instantly and no request is wasted, which feels more modern.",
        },
        {
          label: "Use long polling with a 10-minute hold",
          appeal:
            "One request per run instead of many, and the answer comes the moment it is ready.",
        },
        {
          label: "Email the founder when the run completes",
          appeal:
            "No page logic is needed and it is the least code of all.",
        },
      ],
      best: 0,
      verdict:
        "With one user and slow-changing state, polling costs about 20 requests a minute, which is nothing. It needs no new infrastructure and cannot lose state on a restart. A WebSocket adds connection handling for a gain nobody would notice, and a 10-minute held request will be cut by proxy timeouts.",
      claims: [
        {
          text: "You accept up to 3 seconds of delay before the page notices completion, and some requests that return no change.",
          axis: "trade",
          correct: true,
          note: "True. Polling trades a little freshness and waste for simplicity, which is cheap at one user.",
        },
        {
          text: "You accept that a WebSocket would give lower delay, and you decline it because the delay is not needed here.",
          axis: "trade",
          correct: true,
          note: "True. Naming what you gave up is the point of a trade-off, and here it is small.",
        },
        {
          text: "Polling cannot work with more than one user, so this choice blocks future growth.",
          axis: "trade",
          correct: false,
          note: "Polling scales to thousands of users with care. You can change later without changing the status endpoint.",
        },
        {
          text: "If the web server restarts mid-run, the page keeps working because progress is read from stored status.",
          axis: "failure",
          correct: true,
          note: "True. A poll is stateless. The next request after the restart reads the same stored status.",
        },
        {
          text: "A held 10-minute request survives proxy timeouts because HTTP allows it.",
          axis: "failure",
          correct: false,
          note: "HTTP allows it, but proxies and load balancers commonly close idle connections after a minute or so.",
        },
        {
          text: "You would watch the request rate and database load of the status call as the number of users grows.",
          axis: "measure",
          correct: true,
          note: "True. Polling cost is requests per second times cost per request, so those are the numbers to track.",
        },
        {
          text: "You would measure WebSocket connection counts, even though none exist.",
          axis: "measure",
          correct: false,
          note: "There is no WebSocket in this design, so there is nothing to count.",
        },
      ],
    },
    {
      id: "sd-api-design-order-retry",
      scenario:
        "A broker exposes an order API to algo clients. The network is shared with a flaky mobile link, and timeouts happen a few times a day. A client once sent the same buy order twice after a timeout and the client was left holding double the quantity. Each order can be worth several lakh rupees. The broker wants to prevent this without slowing normal orders.",
      options: [
        {
          label: "Tell clients never to retry an order",
          appeal:
            "Simple rule, no server change, and it removes duplicates.",
        },
        {
          label: "Accept a client-supplied order tag, store it, and return the first result for a repeated tag",
          appeal:
            "A retry becomes safe, the client keeps retrying on its own, and normal orders gain only one small lookup.",
        },
        {
          label: "Add a one-minute cooldown after every order from the same account",
          appeal:
            "Stops rapid repeats from any cause without client changes.",
        },
        {
          label: "Switch the order call from POST to PUT on the same URL",
          appeal:
            "PUT is idempotent by definition, so duplicates should vanish.",
        },
      ],
      best: 1,
      verdict:
        "A stored client key makes the call idempotent by design: the server can tell a retry from a new order. Forbidding retries leaves clients unsure whether the order exists. A cooldown blocks legitimate orders in fast markets. Changing the verb does nothing unless the URL names the order, which a client cannot know before it exists.",
      claims: [
        {
          text: "You accept one extra lookup and write per order, plus storage for keys for a limited period.",
          axis: "trade",
          correct: true,
          note: "True. The cost is a small index and a retention window, tiny next to a duplicate position.",
        },
        {
          text: "You accept that clients must generate unique keys and reuse the same key on a retry.",
          axis: "trade",
          correct: true,
          note: "True. The scheme only works if the client sends the same key for the same intent.",
        },
        {
          text: "You give up the ability to place two genuinely separate orders for the same instrument.",
          axis: "trade",
          correct: false,
          note: "Separate orders carry separate keys. The key identifies the intent, not the instrument.",
        },
        {
          text: "If a retry arrives while the first request is still being processed, it must wait or be told the first is in progress, not run again.",
          axis: "failure",
          correct: true,
          note: "True. Without that check, two overlapping requests with one key could both pass the lookup.",
        },
        {
          text: "With keys in place, a timeout becomes harmless because the client can always assume the order was not placed.",
          axis: "failure",
          correct: false,
          note: "The client still does not know. It retries with the same key and learns the true outcome.",
        },
        {
          text: "You would track how often a stored key is hit by a retry, because it shows how many timeouts would have been duplicates.",
          axis: "measure",
          correct: true,
          note: "True. The key-hit rate is a direct count of duplicates avoided.",
        },
        {
          text: "You would measure average order latency alone, since duplicates do not show up in any metric.",
          axis: "measure",
          correct: false,
          note: "Latency misses the point. Duplicate rate and key hits show whether the design works.",
        },
      ],
    },
    {
      id: "sd-api-design-feed-paging",
      scenario:
        "A social app at Indian scale has a home feed with a hundred million items in total. Each user reads the newest first and keeps scrolling, while new posts arrive every second. Users report seeing the same post twice when they scroll, and deep scrolls are slow. The feed is served from an indexed table sorted by post id.",
      options: [
        {
          label: "Keep offset paging and cache each page for 30 seconds",
          appeal:
            "No client change, and the cache hides the database cost on popular pages.",
        },
        {
          label: "Cursor paging: the client sends the last post id seen and the server returns older posts",
          appeal:
            "Each page is an index seek of constant cost, and new posts at the top cannot shift what the reader has not yet seen.",
        },
        {
          label: "Return the entire feed in one response",
          appeal:
            "No paging problems at all, since there is only one page.",
        },
        {
          label: "Let users type a page number, with 20 posts per page",
          appeal:
            "Page numbers are familiar and let users jump around.",
        },
      ],
      best: 1,
      verdict:
        "The duplicates come from new rows shifting offsets, and the slowness from walking past the offset. A cursor on the indexed id fixes both: the seek costs the same on every page and is unaffected by inserts at the top. Caching offset pages keeps the duplicates and serves stale pages. One giant response is impossible at this size.",
      claims: [
        {
          text: "You give up random access, so users cannot jump to page 500, and you can only move forward or back from where they are.",
          axis: "trade",
          correct: true,
          note: "True. Cursors trade random access for stable, flat-cost paging, which suits a feed.",
        },
        {
          text: "You gain pages whose cost does not grow with depth, because the index finds the starting row directly.",
          axis: "trade",
          correct: true,
          note: "True. The seek is logarithmic in table size, independent of how far the reader has scrolled.",
        },
        {
          text: "Cursor paging needs a full copy of the feed for every user.",
          axis: "trade",
          correct: false,
          note: "The cursor is just a key. No per-user copy is needed for this pattern.",
        },
        {
          text: "If the sort column is not unique, two posts with the same value can be skipped or repeated at a page boundary unless a tiebreaker such as the id is added.",
          axis: "failure",
          correct: true,
          note: "True. Keyset paging needs a total order, so combine the sort value with a unique key.",
        },
        {
          text: "If a post is deleted after the reader has seen it, the cursor breaks and the feed fails.",
          axis: "failure",
          correct: false,
          note: "The cursor is a key value, not a row pointer. A deleted row simply does not appear in the next page.",
        },
        {
          text: "You would compare the latency of page 1 with page 1,000 in the same request mix, which should now be nearly equal.",
          axis: "measure",
          correct: true,
          note: "True. Flat latency across depth is the signature of a working keyset design.",
        },
        {
          text: "You would measure only the cache hit rate, because cursor paging works by caching.",
          axis: "measure",
          correct: false,
          note: "Cursor paging works by indexed seeks, not by caching. Hit rate does not test it.",
        },
      ],
    },
  ],
};

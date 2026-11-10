import type { Topic } from "../../types.ts";

export const sdRateLimitsBreakers: Topic = {
  id: "sd-rate-limits-breakers",
  title: "Rate limits, retries and circuit breakers",
  tier: 4,
  week: 8,
  depth: "deep",
  summary:
    "Brokers cap how fast you may call them. Pace yourself with a token bucket, retry with jittered backoff only what is safe, and stop calling a failing broker.",
  why: "Traed watches up to 50 stocks, and every one needs history at the same bar boundary. Kite allows only about three history requests a second, so an unpaced burst fails with 429. Orders are worse: a timed-out order may exist, and a careless retry places it twice. You will be asked what happens when the broker is slow or down. This lesson gives you the three tools, token bucket, backoff with jitter and circuit breaker, and the rule for what may be retried at all.",
  learn: {
    intuition:
      "Picture a tea stall with one stove and a queue. If fifty people shout their order at once, the stallholder gets nothing done and some people leave angry. A good queue works differently. People take a token, step up one at a time, and the stove keeps a steady pace. That is rate limiting, and you do it on your own side so the broker does not have to do it to you. Now suppose the stove breaks. If everyone returns every second to ask, the stallholder cannot fix it. Better to wait a little, then a little longer, and not all at the same moment. And after three failed tries, a sensible customer stops asking for a while. That pause is the circuit breaker. One more rule: asking again is fine for a menu, but not for paying. Retrying a payment may charge you twice.",
    mechanics: [
      {
        heading: "Token bucket: pace yourself before the broker does",
        body: "A token bucket holds up to a burst number of tokens and refills at a steady rate. Each call takes one token and waits if none is left. Traed's limiter refills at 2.5 tokens a second with a burst of 3, just under Kite's roughly three history requests a second. At a bar boundary 50 symbols ask together. The first 3 go at once and the other 47 follow at 2.5 a second, about 19 seconds in all. A small random delay of up to 400 ms before each call spreads arrivals. The bucket uses a monotonic clock, since a wall-clock jump would stall it or release a false burst.",
      },
      {
        heading: "Backoff with jitter, and the retry storm",
        body: "When a call fails with a temporary fault, wait before retrying, and wait longer each time: 1 s, 2 s, 4 s, 8 s. Without randomness, a hundred clients that failed together retry together and fail together again. That is a retry storm. Jitter fixes it by scaling each delay by a random factor; Traed's order retry uses between half and the full delay. A storm can also be self-made. An instrument-list download was repeated roughly every 50 seconds by short-lived clients, about 1,700 needless downloads a day, which is the shape of a self-inflicted 429 storm. The fix was one shared cache with a 24 hour life.",
      },
      {
        heading: "What is safe to retry: reads yes, writes only after checking",
        body: "A retry is safe when repeating the call has the same effect as making it once. Reading history is safe. Placing an order is not. If a placement times out, or returns 5xx or 429, the order may already exist, so Traed reports it as UNKNOWN, waits 3 seconds, reads the order book and looks for the order's tag. Found means done. Absent means one re-placement is allowed, and never more than two placements in total. If the book cannot be read, it stops, because not being able to check is not the same as absent. A clear 4xx rejection is not retried at all.",
      },
      {
        heading: "Circuit breaker and timeouts: stop calling a failing broker",
        body: "A circuit breaker counts recent failures. After a threshold it opens and refuses calls at once, giving the broker room to recover and your threads their time back. In Traed three failures in a row open the order breaker for five minutes, then it closes and tries again. A refusal is reported as a temporary error, not a broker rejection. Every call also has a timeout, ten seconds for placement. Without one a hung call never fails, so the breaker never counts it. The order status sweep backs off from 8 seconds up to 60 when the order book is unreadable, and ignores the order breaker.",
      },
      {
        heading: "Saying it about Traed",
        body: "We pace broker calls on our side with a token bucket set just below the published limit, and we add a little random delay so fifty symbols do not arrive together. We retry reads with backoff and jitter. We never blind-retry an order: a timeout means unknown, so we check the broker's order book by tag first. After three failures in a row an order breaker pauses placement for five minutes. Our breaker is simple. It lives in each strategy's memory and has no half-open probe. We would move to a shared, tested breaker once several users trade live.",
      },
    ],
    complexityDerivation:
      "These tools protect one invariant: the number of calls you send must not exceed what the other side can serve, and a failure must not multiply into more load. A token bucket enforces the first part directly. Over any window of T seconds it allows at most burst plus rate times T calls, so the broker never sees more than that. Backoff with jitter handles the second part. Without it, N clients retrying at the same schedule keep the load at N per round. With growing delays and random spread, the retries thin out and the broker can recover. A breaker adds the final step: when failure is likely, stop spending calls at all. The argument weakens in four places. If the limit is per account and shared by several processes, a local bucket undercounts, so the true limit needs a shared counter. If the real limit moves, as exchange and broker limits do, a fixed 2.5 a second is a guess that needs a margin. If retries are layered, with three attempts inside five attempts, the multiplication reaches fifteen calls. And a breaker that guards all strategies together can cut off healthy work, while one per strategy can miss a shared outage.",
    variants: [
      {
        name: "Client-side token bucket",
        when: "You know the provider's limit and your callers can wait a little.",
        delta:
          "Smooth steady rate with a small burst. Needs a margin under the published limit and a shared counter if several processes use one quota.",
      },
      {
        name: "Server-side limiting and reaction to 429",
        when: "You do not know the limit, or it changes, and you can slow down when told.",
        delta:
          "React to 429 and any retry-after hint by backing off. Simpler, but you only learn the limit by hitting it, and a hit can cost an evaluation or a temporary ban.",
      },
      {
        name: "Breaker with a half-open probe",
        when: "A dependency fails in long outages and recovers abruptly.",
        delta:
          "After the cool-off, let one trial call through. Success closes the breaker, failure reopens it. Traed's version skips the probe and simply resets after five minutes.",
      },
    ],
    tradeoffs: [
      {
        vs: "Sending history requests as fast as they arise",
        pick: "Pacing with a token bucket and jitter",
        because:
          "A burst of 50 against a three-a-second limit returns 429 for most of them. Pacing costs up to about 19 seconds of delay on the first fetch of a universe, but the data is complete and the evaluation is not skipped.",
      },
      {
        vs: "Retrying a timed-out order until it succeeds",
        pick: "Marking it unknown and checking the order book first",
        because:
          "Blind retry is how a real account ends up with two orders. Checking costs a 3 second wait and a read, and if the read fails the engine refuses to place again.",
      },
      {
        vs: "Retrying for as long as it takes",
        pick: "A breaker that opens after three failures",
        because:
          "Endless retries hold threads, hammer a struggling broker and delay the operator's alert. A short pause trades some missed entries for a clear signal and a system that is still responsive.",
      },
    ],
  },
  realWorld: [
    {
      system: "Exponential backoff and jitter in AWS clients",
      kind: "industry",
      problem:
        "When many clients fail together and retry on the same schedule, their retries arrive together and keep the service overloaded.",
      applied:
        "AWS's architecture guidance on backoff and jitter shows that adding randomness to the wait removes the synchronised waves and finishes the total work faster. The official SDKs retry with exponential backoff and jitter by default.",
      evidence: "AWS Architecture Blog, Exponential Backoff and Jitter (2015); AWS SDK retry documentation",
      impact:
        "Randomness is a correctness feature of retries, not decoration.",
    },
    {
      system: "Circuit breaker pattern",
      kind: "industry",
      problem:
        "A slow or failing dependency ties up callers, which then fail too, and the failure spreads through the system.",
      applied:
        "Michael Nygard described the circuit breaker in Release It!, and Martin Fowler's write-up popularised the three states: closed, open and half-open. Libraries such as Netflix Hystrix and its successors implement it for service calls.",
      evidence: "Michael Nygard, Release It! (2007); Martin Fowler, CircuitBreaker (martinfowler.com)",
      impact:
        "Failing fast keeps the rest of the system alive while the dependency recovers.",
    },
    {
      system: "Traed broker rate limiter",
      kind: "yours",
      problem:
        "A 50-stock universe fetches history for every symbol at the same bar boundary, against a limit of about three requests a second.",
      applied:
        "An async token bucket (2.5 a second, burst 3) with optional jitter gates the history fetches in the universal executor. The module notes that a failed fetch now costs a skipped evaluation, so keeping failures rare matters.",
      evidence:
        "strategy-engine/app/services/broker_rate_limiter.py; strategy-engine/app/services/universal_strategy_executor.py",
      impact:
        "A 50-symbol fetch takes about 19 seconds instead of failing in a burst.",
    },
    {
      system: "Traed unknown-outcome order handling",
      kind: "yours",
      problem:
        "A placement that times out, or answers 5xx or 429, may already exist at the broker, and a blind retry can duplicate a real order.",
      applied:
        "The Kite adapter returns UNKNOWN for those cases. The executor waits 3 seconds, reads the order book by tag, re-places at most once, and stops with a possibly-placed flag if the book cannot be read. A 3-failure breaker pauses placement for five minutes.",
      evidence:
        "strategy-engine/src/brokers/trading_interface.py; strategy-engine/app/services/execution_modes/order_executors.py; docs/live-readiness.md",
      impact:
        "Duplicate-order risk from retries is removed by design, at the price of a few seconds on the rare ambiguous order.",
    },
  ],
  insights: [
    {
      t: "Limit yourself before the other side does",
      d: "A token bucket keeps your rate under the published limit with a small allowed burst. A 429 is a cost you chose not to avoid.",
    },
    {
      t: "Backoff without jitter still stampedes",
      d: "Clients that failed together retry together. A random factor spreads them and lets the service recover.",
    },
    {
      t: "Retry reads freely, retry writes only after checking",
      d: "A timed-out order is unknown, not failed. Read the order book by a tag you set, and re-place only if it is clearly absent.",
    },
    {
      t: "Layers multiply retries",
      d: "Three tries inside five tries is fifteen calls. Mark exhausted failures as non-retryable so the outer layer stops.",
    },
  ],
  pitfalls: [
    "Retrying an order after a timeout without checking the broker. The first attempt may have succeeded, and you now hold two positions.",
    "Backing off on a fixed schedule with no randomness. Every client that failed together comes back together.",
    "Setting the limiter exactly at the published limit. Clock drift and shared quotas mean you will still see 429s, so keep a margin below it.",
  ],
  quiz: [
    {
      q: "What does a token bucket do?",
      options: [
        "It lets calls through at a steady refill rate, with a small burst allowed",
        "It counts failures and blocks calls after a threshold",
        "It adds a random wait before each retry after a failure",
        "It stores recent responses so repeated calls are answered locally",
      ],
      answer: 0,
      why: "A token bucket enforces a rate: tokens refill steadily and each call takes one. The other options describe a circuit breaker, jitter and a cache.",
      difficulty: "recall",
      distractors: [
        "",
        "Failure counting and blocking is a circuit breaker, which reacts to errors rather than pacing healthy calls.",
        "Random waiting after failure is jitter on a backoff schedule, a separate tool with a different purpose.",
        "Storing responses is a cache. It reduces calls but does not pace the ones you still need to make.",
      ],
    },
    {
      q: "Why is jitter added to exponential backoff?",
      options: [
        "It makes each wait shorter so that the retry finishes faster overall",
        "It spreads retries so clients do not all return together",
        "It lets the client skip the backoff when the server is lightly loaded today",
        "It makes the delay exactly double each time",
      ],
      answer: 1,
      why: "Without randomness, clients that failed together retry on the same schedule and recreate the overload. Jitter breaks the synchronisation.",
      difficulty: "recall",
      distractors: [
        "Jitter may shorten some waits, but the point is spreading, not speed.",
        "",
        "Clients cannot see server load, and skipping backoff is the opposite of its purpose.",
        "Exact doubling is the plain exponential schedule, which is what jitter randomises.",
      ],
    },
    {
      q: "A limiter allows 2.5 history calls a second with a burst of 3. How long does a universe of 50 symbols take to fetch, roughly?",
      options: [
        "About 2 seconds, because the burst covers most of them",
        "About 50 seconds, one per second",
        "About 19 seconds: 3 at once, then 47 at 2.5 a second",
        "No time, because the calls run in parallel",
      ],
      answer: 2,
      why: "The first 3 tokens are spent at once. The other 47 wait for refills at 2.5 per second, which is 47 divided by 2.5, about 18.8 seconds.",
      difficulty: "apply",
      distractors: [
        "The burst only covers 3 calls, not most of the 50.",
        "The rate is 2.5 a second, not 1, and the burst saves a little more time.",
        "",
        "Parallel callers still draw from the same bucket, so the rate limit applies to them all together.",
      ],
    },
    {
      q: "An order placement call times out after 10 seconds. What should the engine do before trying to place it again?",
      options: [
        "Wait briefly, then read the broker's order book for the order's tag",
        "Wait one second and send the same order again",
        "Treat it as rejected and tell the strategy the order failed",
        "Open the circuit breaker immediately and stop all trading",
      ],
      answer: 0,
      why: "A timeout means unknown: the order may exist. Reading the book by tag turns the unknown into a fact. Retrying blindly may duplicate it, and calling it rejected may abandon a real position.",
      difficulty: "apply",
      distractors: [
        "",
        "Quick and simple, but if the first order landed you now hold two.",
        "A rejection is an answer from the broker. A timeout is the absence of one.",
        "One timeout is not a pattern. A breaker needs repeated failures, and tripping on one stops all trading for no reason.",
      ],
    },
    {
      q: "The order breaker opens after 3 failures in a row. The engine's status sweep reads the order book every 4 seconds and the broker starts returning 429. What should the sweep do?",
      options: [
        "Stop reading the book while the order breaker is open",
        "Read each order separately, to avoid the large order book call at all",
        "Keep reading every 4 seconds, since sent orders still matter a lot",
        "Back off the sweep, 8 seconds up to 60, and keep reading",
      ],
      answer: 3,
      why: "The breaker protects new placements. Finding out what happened to orders already sent is still needed, so reads continue, but they back off so they do not add to the overload. Per-order reads would multiply calls.",
      difficulty: "apply",
      distractors: [
        "It seems consistent with an open breaker, but then a fill that lands during the outage goes unseen.",
        "More, smaller calls make a rate limit problem worse, not better.",
        "Right that the sweep must continue, but a fixed 4 second pace into a 429 keeps pressure on the broker.",
        "",
      ],
    },
    {
      q: "A short-lived helper downloads the full instrument list from the broker each time it is created, about once a minute. What is the best fix?",
      options: [
        "Add jitter to the download times so they spread out",
        "Cache it once per process for a day; it is the same for everyone",
        "Raise the retry limit so the download eventually succeeds",
        "Download it on a separate thread so nothing else waits",
      ],
      answer: 1,
      why: "The list is public and identical for every user, so one cached copy removes the load altogether. Jitter, retries and threads only change when you spend the calls, not whether you need them.",
      difficulty: "apply",
      distractors: [
        "Jitter spreads calls out but you still make about 1,700 a day you do not need.",
        "",
        "Retries add calls to an already overused endpoint.",
        "A thread changes where the work runs, not how many requests reach the broker.",
      ],
    },
    {
      q: "A teammate proposes retrying failed orders up to 5 times in the executor and 3 times in the order manager for resilience. What is the strongest objection?",
      options: [
        "Retries are only ever needed for reads, and never for orders",
        "Five attempts are far too few for a busy and fast market",
        "Backoff is unnecessary for order calls, only for reads",
        "Layers multiply to 15 tries, and each timeout may duplicate an order",
      ],
      answer: 3,
      why: "Stacked retries multiply load and risk. Orders need check-then-retry, and an exhausted inner layer should mark the failure non-retryable so the outer layer stops.",
      difficulty: "judge",
      distractors: [
        "Too absolute. Orders can be re-placed in a narrow case, once the book shows the order is absent.",
        "More attempts would make the multiplication and the duplicate risk worse, not better.",
        "Backoff matters for orders too. The issue is checking before re-placing, not skipping the wait.",
        "",
      ],
    },
    {
      q: "Your limiter is set exactly at the broker's published limit. A teammate says that is the best setting. What do you reply?",
      options: [
        "Agree, because anything lower wastes allowed capacity for no gain",
        "Set it above the limit, since the broker rarely enforces it strictly",
        "Keep a margin below it; shared quotas and limit changes make exact too tight",
        "Remove the limiter and rely only on handling 429 when it comes",
      ],
      answer: 2,
      why: "Published limits are not always the effective ones: other processes may share the quota, bursts straddle windows and providers change values. A margin turns a hard failure into a small delay.",
      difficulty: "judge",
      distractors: [
        "Using full capacity sounds efficient, but a few percent of lost speed is cheaper than 429s that skip evaluations.",
        "Enforcement by a broker is the case you do not want to test with a live account.",
        "",
        "Reacting to 429 alone means you learn the limit by failing. Pacing avoids most of that.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-rate-limits-breakers-universe-fetch",
      scenario:
        "A single engine on one server watches the 50 NIFTY constituents. At every 5-minute boundary it needs fresh history for all 50 symbols from Kite, whose history limit is about three requests a second. Today it sends all 50 at once and most return 429. A failed fetch skips that symbol's evaluation for the bar. What should you build?",
      options: [
        {
          label: "A client-side token bucket just under the limit, with a little jitter",
          appeal:
            "Smooth steady load, no 429s in normal operation, and a few lines of code.",
        },
        {
          label: "Retry each failed call until it works",
          appeal:
            "No new component, and every symbol eventually gets its data.",
        },
        {
          label: "A circuit breaker on the history endpoint",
          appeal:
            "Stops hammering Kite as soon as 429s begin.",
        },
        {
          label: "Ask the broker for a higher limit",
          appeal:
            "Solves the problem at its source with no code.",
        },
      ],
      best: 0,
      verdict:
        "The load is known and predictable: 50 calls at a fixed moment. 50 calls at 2.5 a second take about 19 seconds, well inside a 5-minute bar. Pacing removes the 429s instead of recovering from them. Plain retries re-send into the same limit, a breaker would just switch fetching off, and a higher limit is outside your control.",
      claims: [
        {
          text: "You accept a delay of up to about 19 seconds on the slowest symbol in exchange for complete data.",
          axis: "trade",
          correct: true,
          note: "The trade is time for completeness. On a 5-minute bar a 19 second tail is acceptable, on a 1-second system it would not be.",
        },
        {
          text: "Pacing gives up nothing, since the bar is only evaluated after all data arrives.",
          axis: "trade",
          correct: false,
          note: "It gives up latency on the last symbols. The claim is only acceptable because the bar is long, and it should be stated.",
        },
        {
          text: "If another process on the same account also calls the history endpoint, the local bucket undercounts and 429s can return.",
          axis: "failure",
          correct: true,
          note: "A local bucket only sees its own calls. A shared quota needs a shared counter or a larger margin.",
        },
        {
          text: "A bucket set at exactly the published limit cannot produce a 429.",
          axis: "failure",
          correct: false,
          note: "Window edges, clock differences and shared use can still push the broker's count over. A margin, such as 2.5 against 3, is the fix.",
        },
        {
          text: "Count 429s per bar and the number of symbols skipped for missing data.",
          axis: "measure",
          correct: true,
          note: "These show whether pacing works and what any remaining failure costs in evaluations.",
        },
        {
          text: "Measure the average request latency only, since that shows rate limit health.",
          axis: "measure",
          correct: false,
          note: "Average latency can look fine while a fifth of calls return 429. The 429 and skip counts are what matter.",
        },
      ],
    },
    {
      id: "sd-rate-limits-breakers-order-timeout",
      scenario:
        "A live strategy sends a buy of 1,800 units of a NIFTY option. The request times out after 10 seconds with no response. The market is moving, and the signal is a stop-loss exit for a short position already open. The executor can retry up to 5 times with backoff. What is the right behaviour?",
      options: [
        {
          label: "Retry at once with the same order, up to 5 times",
          appeal:
            "The exit is urgent, and speed matters more than anything.",
        },
        {
          label: "Report it as unknown, wait a few seconds, read the order book by tag, and re-place only if absent",
          appeal:
            "Turns the unknown into a fact before spending another order, so you cannot double the exit.",
        },
        {
          label: "Report it as failed and let the strategy decide again at the next bar",
          appeal:
            "Simple, and the next bar brings a fresh signal.",
        },
        {
          label: "Open the breaker and stop all further orders until a person looks",
          appeal:
            "The safest option when something odd happens.",
        },
      ],
      best: 1,
      verdict:
        "A blind retry on an exit can buy back twice and leave a long position the strategy never meant to hold. Calling it failed abandons an exit that may well have filled, or may not. Checking the book by tag costs seconds and gives a true answer, then one re-placement is allowed. A one-off timeout is not enough reason to stop all trading.",
      claims: [
        {
          text: "You accept a delay of a few seconds on an urgent exit to avoid a possible duplicate order.",
          axis: "trade",
          correct: true,
          note: "The wait is the price of certainty. A doubled exit is a worse error than a few seconds' delay.",
        },
        {
          text: "Retrying immediately is faster, and speed is the safest choice on a stop-loss.",
          axis: "trade",
          correct: false,
          note: "Faster only if the first order did not land. If it did, you have now sold a position you no longer hold.",
        },
        {
          text: "If the order book itself cannot be read, the engine should stop and flag that the order may exist, not re-place it.",
          axis: "failure",
          correct: true,
          note: "Not being able to check is not the same as absent. Failing closed here prevents the duplicate.",
        },
        {
          text: "Marking the order as rejected after a timeout is safe because the strategy will simply try again.",
          axis: "failure",
          correct: false,
          note: "If the order did fill, the engine and the broker now disagree about the position, which is the harder problem to unwind.",
        },
        {
          text: "Alert on any order whose outcome stayed unknown after the book check.",
          axis: "measure",
          correct: true,
          note: "These are the cases that need a person. A count over time also shows how often the broker path is unreliable.",
        },
        {
          text: "Measure the number of retries per order, aiming to maximise it for reliability.",
          axis: "measure",
          correct: false,
          note: "More retries per order is a warning, not a goal. Each one is a chance of duplication.",
        },
      ],
    },
    {
      id: "sd-rate-limits-breakers-platform",
      scenario:
        "A hosted algo platform serves 3,000 users on one broker. Every user's strategy fetches history and places orders through the platform's own servers, which share a single API key limited to 10 order requests a second across the whole platform. On a volatile morning a broker slowdown made order calls time out, and every strategy retried. The slowdown became a 20 minute outage. The team has 15 engineers. What should change?",
      options: [
        {
          label: "Raise the retry count so more orders get through",
          appeal:
            "More attempts mean more users recover on their own.",
        },
        {
          label: "A shared platform-wide limiter and breaker, with jittered backoff and check-before-retry for orders",
          appeal:
            "One place sees the whole quota, and failure stops spreading as load.",
        },
        {
          label: "Give each strategy its own breaker only",
          appeal:
            "Isolation: one user's trouble cannot affect another's.",
        },
        {
          label: "Scale out the servers so each user has more capacity",
          appeal:
            "More machines mean more parallel calls.",
        },
      ],
      best: 1,
      verdict:
        "The limit is shared, so the control has to be shared. 3,000 clients retrying together turn a slowdown into a storm, so the platform needs one limiter that knows the whole quota, jittered backoff, and a breaker that sees the broker as a whole. Per-strategy breakers cannot see the combined load. More retries and more servers push more calls into a limit that is already exceeded.",
      claims: [
        {
          text: "You accept that one shared limiter and breaker becomes a critical component and must itself be simple and highly available.",
          axis: "trade",
          correct: true,
          note: "Centralising protects the quota but concentrates risk. It has to be small, tested and run in more than one place.",
        },
        {
          text: "Per-strategy breakers give the same protection with less shared infrastructure.",
          axis: "trade",
          correct: false,
          note: "They never see the platform total, so 3,000 breakers can all stay closed while the combined traffic exceeds the quota.",
        },
        {
          text: "Without jitter, thousands of clients that timed out together retry together and recreate the overload.",
          axis: "failure",
          correct: true,
          note: "A synchronised retry wave is the retry storm. Jitter and growing delays are what thin it out.",
        },
        {
          text: "Adding servers lowers the risk of a retry storm because load is spread across more machines.",
          axis: "failure",
          correct: false,
          note: "The limit is on the shared API key, not on your servers. More machines send more calls into the same cap.",
        },
        {
          text: "Track the share of order calls that return 429 or time out, and how many orders end up unknown.",
          axis: "measure",
          correct: true,
          note: "These show the broker's health and your own pressure on it, and they are visible before the outage becomes total.",
        },
        {
          text: "Track the number of servers, since more capacity means more resilience.",
          axis: "measure",
          correct: false,
          note: "Server count says nothing about whether the shared quota is being respected.",
        },
      ],
    },
  ],
};

import type { Topic } from "../../types.ts";

export const sdIdempotency: Topic = {
  id: "sd-idempotency",
  title: "Idempotency and safe retries",
  tier: 5,
  week: 9,
  depth: "deep",
  summary:
    "Networks fail halfway, so you retry, and a retry must not trade twice. Idempotency makes repeats safe; the broker's order book settles what already happened.",
  why: "A live order that times out is the most dangerous moment in your platform: the order may exist, or not, and both retrying and giving up can cost real money. Traed answers with a tag on every order, a look-up before any retry and a cap on total placements. The same idea shows up in the bridge, where a conditional write stops fifty subscribers from starting fifty feeds. You need the vocabulary to explain why this is safe.",
  learn: {
    intuition:
      "You press the lift button and nothing lights up. Did the press register? If you press again, the worst outcome is still one lift arriving. The button is idempotent: pressing twice equals pressing once. Now picture a vending machine that takes ₹20 and goes dark before dropping the snack. Pressing again and paying again is not safe, because a second payment is a second effect. A sensible shop attaches a receipt number to your first payment, so when you come back the clerk can look it up and either give the snack or give the money back. An idempotency key is that receipt number. You create it before the first attempt, send it every time, and the other side keeps a record of what it has already done under that number. Retrying then means 'do this, unless you already did'. Without that, the only choices are to risk a duplicate or to risk doing nothing.",
    mechanics: [
      {
        heading: "Why retries exist, and why they are dangerous",
        body: "A request can fail in three ways: it never arrived, it arrived and was refused, or it arrived and succeeded but the reply was lost. From the sender's side the first and third look the same: a timeout. Retrying is how you survive the first. It is how you duplicate in the third. For a read, that is harmless. For 'buy 130 units of a NIFTY option', a duplicate means a second ₹15,600 position at ₹120 a unit, with no stop on it. So 'just retry' is only safe for operations designed to be repeated.",
      },
      {
        heading: "At-least-once delivery and the myth of exactly-once",
        body: "Most message systems promise at-least-once: each message arrives one or more times, never zero. Amazon SQS standard queues work this way. Exactly-once delivery over an unreliable network is not something a system can simply provide. What you can build is exactly-once effect: at-least-once delivery plus a receiver that recognises repeats and ignores them. The deduplication has to sit somewhere, and a claim of 'exactly-once' is worth a follow-up question: where does the duplicate check actually live, and how long does it remember?",
      },
      {
        heading: "Keys, tags and conditional writes",
        body: "The standard recipe has three parts. Generate a unique key before the first attempt and reuse it on every retry. Let the receiver record the key together with the result. Make the 'record if new' step atomic, so two concurrent attempts cannot both win. In a database that is a unique constraint. In DynamoDB it is a conditional write such as 'put this item only if it does not exist yet'. In a broker's order API it is a tag you attach to the order, which you can later search for in the order book.",
      },
      {
        heading: "Query before retry",
        body: "If the other side gives you no dedupe, you can build it yourself with a look-up. After a timeout, do not resend. First wait long enough for an in-flight request to land, then read the receiver's state and search for your key. Found means it succeeded, so carry on. Not found, with a successful read, means it is safe to retry. Could not read means you do not know, and you must not retry. Treating 'could not check' as 'not there' is the classic way to double an order during an outage. Also cap the total attempts, for example two.",
      },
      {
        heading: "Saying it about Traed",
        body: "We attach a tag, derived from our own order id, to every live order. If a placement times out or returns a server error, we do not resend. We wait a few seconds, read the broker's order book and look for our tag: found means placed, absent means we may place once more, unreadable means we stop and alert. A broker's explicit refusal is final and is never retried. Total placements per signal are capped at two. We give up speed for safety, so a flaky minute can delay an entry. We would revisit this if a broker offered native idempotency keys, or if we sent many orders per second.",
      },
    ],
    complexityDerivation:
      "The invariant is that one intent produces at most one effect, however many times it is sent. The argument has three links. The key is created once, before the first attempt, so every retry carries the same identity. The receiver's record of that identity is written atomically with the effect, or checked before it, so two attempts cannot both succeed. And when the answer is unknown, the sender looks instead of guessing, and treats an unreadable answer as unknown. The design holds while the key survives long enough to cover the retry window and the receiver remembers keys that long. It breaks when you mint a fresh key per attempt, since the earlier attempt becomes invisible. It breaks when the dedupe record expires before a late duplicate arrives. And it breaks when the effect is not under your control, such as a message sent to a person or a payment to another bank, where no look-up exists. Then you need a compensating action, not just a retry rule.",
    variants: [
      {
        name: "Client-supplied idempotency key",
        when: "The receiving API supports it, as payment APIs do.",
        delta:
          "The client sends a unique key with the request and the server stores the first result under it. A repeat returns the stored result. Simplest for the client, but the server must keep the keys for as long as retries can happen.",
      },
      {
        name: "Tag plus query before retry",
        when: "The receiver has no native dedupe but lets you attach a label and list your orders. This is the broker case.",
        delta:
          "You supply the dedupe. After an unclear failure you search by label, which costs an extra read and a short wait, and fails closed if the read fails.",
      },
      {
        name: "Natural idempotence by setting state",
        when: "The operation can be phrased as 'make X equal to Y' instead of 'add one to X'.",
        delta:
          "Setting a status to filled twice is harmless; adding a fill twice is not. Rewrite the operation if you can, and you need no key at all.",
      },
    ],
    tradeoffs: [
      {
        vs: "Retry immediately with the same payload",
        pick: "Look up by tag first",
        because:
          "An immediate retry is fast and wrong when the first order actually landed. The look-up adds a few seconds and one read. On a trade that is worth ₹15,000 or more, the delay is cheap against a duplicate.",
      },
      {
        vs: "Never retry; alert a human on any timeout",
        pick: "Retry only after a verified 'absent' answer, and cap it",
        because:
          "Never retrying is safe but turns every network hiccup into a missed entry or an unexited position. A verified retry removes most of that. Keep the cap so a bad day cannot loop.",
      },
      {
        vs: "A lock to stop concurrent duplicates",
        pick: "An atomic conditional write in the shared store",
        because:
          "A lock held in one process cannot stop a second process, and a lock that is never released blocks everyone. A conditional write is a single operation in the store, so there is no gap between check and act.",
      },
    ],
  },
  realWorld: [
    {
      system: "Stripe idempotency keys",
      kind: "industry",
      problem:
        "A payment request that times out leaves the client unsure whether the customer was charged. Repeating it could charge twice.",
      applied:
        "Stripe's API accepts an Idempotency-Key header on write requests. The first request with a key is processed and its result is saved. Later requests with the same key return the saved result instead of acting again. Keys are kept for a limited time.",
      evidence: "Stripe API documentation: Idempotent requests",
      impact:
        "Clients can retry freely after a network failure, which is the same safety Traed builds by hand with a tag.",
    },
    {
      system: "Kafka idempotent producer",
      kind: "industry",
      problem:
        "A producer that retries after a lost acknowledgement can write the same record to a partition twice.",
      applied:
        "With idempotence enabled, Kafka gives each producer an id and numbers its records per partition. The broker discards a record whose sequence number it has already stored. Retries then cannot create duplicates within a partition.",
      evidence: "Apache Kafka documentation: producer configuration enable.idempotence",
      impact:
        "At-least-once delivery with broker-side dedupe gives an exactly-once effect within a partition without the application doing anything.",
    },
    {
      system: "Traed order tag and verified retry",
      kind: "yours",
      problem:
        "A live placement can end in a timeout, a gateway error or a rate-limit reply, and in each case the order may exist at the broker.",
      applied:
        "Each live order carries a tag derived from the engine's order id. On an unclear outcome the executor waits a few seconds, reads the broker's order book and looks for the tag. Found means placed; absent after a successful read allows one more placement; an unreadable book stops it with a 'possibly placed' flag. Only a 4xx application error counts as proof of rejection.",
      evidence: "strategy-engine/app/services/execution_modes/order_executors.py; docs/live-readiness.md (LR-02 / LR-03 and review hardening)",
      impact:
        "A duplicate real-money order can no longer come from a retry loop. The cost is a short wait on a flaky minute.",
    },
    {
      system: "Traed bridge invoke debounce",
      kind: "yours",
      problem:
        "A page load can send many subscribe requests in a burst, and each one would start the market-data bridge.",
      applied:
        "The subscribe handler writes a sentinel row to DynamoDB with a condition: only if no row exists or the old one has expired. The first request in a 30-second window wins and invokes the bridge; the rest lose the condition and skip. If the check itself fails, it fails open and invokes anyway.",
      evidence: "CMS/Serverless/real-time-trading-websocket/src/handlers/subscribe.js (claimBridgeInvokeSlot); __tests__/unit/bridge-invoke-debounce.test.js",
      impact:
        "One bridge start per window instead of one per subscriber. A duplicate start is a small waste, so failing open is the right side to err on.",
    },
  ],
  algorithms: [
    {
      name: "Idempotency key lookup",
      role: "Stores the key of each request already handled and returns the earlier result for a repeat, so a retry cannot place a second order.",
      dsa: "hashing",
    },
    {
      name: "Deduplication by hash set",
      role: "Remembers recently seen identifiers in a set with constant-time membership checks, discarding duplicates that at-least-once delivery produces.",
      dsa: "hashing",
    },
    {
      name: "Exponential backoff with jitter",
      role: "Spaces the retries so a transient fault clears without a retry storm, while the idempotency key makes each retry safe.",
    },
  ],
  insights: [
    {
      t: "Idempotent means safe to repeat",
      d: "Doing it twice has the same effect as doing it once. Reads, 'set status to filled' and keyed writes are; 'add a fill' and 'place a buy' are not.",
    },
    {
      t: "Exactly-once is at-least-once plus dedupe",
      d: "Delivery can repeat. The effect happens once because the receiver recognises the repeat. Ask where the dedupe lives and how long it remembers.",
    },
    {
      t: "Unknown is a third answer",
      d: "A timeout is not a failure. If you cannot read the receiver's state, you do not know, and you must not retry as if you did.",
    },
    {
      t: "Make the key once, reuse it always",
      d: "A fresh key on each attempt makes earlier attempts invisible. The key belongs to the intent, not to the attempt.",
    },
  ],
  pitfalls: [
    "Checking the order book the instant after a timeout. A slow order may not be listed yet, so it looks absent and gets doubled. Wait for it to settle first.",
    "Treating a failed look-up as 'not found'. If you could not read the book, you know nothing; stop and alert instead of retrying.",
    "Retrying a gateway error or a rate-limit reply as if the broker had refused. Only an explicit application-level refusal proves the order does not exist.",
  ],
  quiz: [
    {
      q: "What does it mean for an operation to be idempotent?",
      options: [
        "It can be run only once, after which it locks itself",
        "Running it several times has the same effect as running it once",
        "It always completes within a fixed time limit",
        "It is protected by a lock so that no two copies run at once",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Idempotent is about the effect of repeats, not about timing or locking. 'Set the status to filled' is idempotent; 'add one fill' is not. That property is what makes a retry safe.",
      distractors: [
        "That describes a one-shot guard, which is one way to get the property but not the definition.",
        "",
        "Speed is unrelated. A slow operation can be idempotent and a fast one can duplicate.",
        "A lock stops simultaneous runs, but a second run after the first finishes would still repeat the effect.",
      ],
    },
    {
      q: "A queue delivers each message at least once. What must the consumer do to get an exactly-once effect?",
      options: [
        "Nothing; at-least-once already means one effect each",
        "Acknowledge the message before processing it begins",
        "Process messages faster than the queue can repeat them",
        "Spot repeats by message id, or make the work idempotent",
      ],
      answer: 3,
      difficulty: "recall",
      why: "At-least-once allows repeats, so duplicates must be handled at the consumer: either by remembering ids already processed or by making the work safe to repeat.",
      distractors: [
        "At-least-once means one or more deliveries, so duplicates are exactly what you must expect.",
        "Acknowledging before processing risks losing the message on a crash, which is the opposite problem.",
        "Repeats come from lost acknowledgements, not from speed. Speed cannot prevent them.",
        "",
      ],
    },
    {
      q: "Your entry order for 130 units of a NIFTY option times out with no reply. What should you do first?",
      options: [
        "Wait briefly, then search the broker's order book for your tag",
        "Resend the identical order straight away with a new tag",
        "Assume it failed and simply wait for the next signal",
        "Assume it succeeded and start managing the position now",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A timeout means unknown. Waiting lets an in-flight order land at the broker, and the tag lets you find it. Only the order book can tell you whether to carry on, retry or stop.",
      distractors: [
        "",
        "Resending at once risks a duplicate if the first order lands, and a new tag hides the first one from any later check.",
        "If the order exists, you now hold an unmanaged position with no stop. 'Assume failed' is the dangerous guess.",
        "If it did not land, you manage a position you do not have, and later exits could open the opposite side.",
      ],
    },
    {
      q: "After the timeout you try to read the order book, but the broker answers with a rate-limit error. What is the right next step?",
      options: [
        "Treat the order as absent and place it again",
        "Place it again, but with half the quantity this time",
        "Do not re-place; mark it possibly placed and alert",
        "Wait one second and place it again regardless",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A failed read proves nothing. Re-placing on that basis is how duplicates happen during an outage. The safe state is 'possibly placed': stop, tell a human, and let a later read or the position reconcile decide.",
      distractors: [
        "'Could not check' is not 'not there'. This is the exact mistake that doubles orders.",
        "A smaller duplicate is still a duplicate, and the position size no longer matches the signal.",
        "",
        "A short wait does not give you the information you lack. You still have not seen the order book.",
      ],
    },
    {
      q: "Which broker reply proves that an order does not exist, so retrying is safe in principle?",
      options: [
        "A gateway error in the 500 range from the broker",
        "An invalid-order refusal in the 400 range",
        "A rate-limit reply saying there were too many requests",
        "A connection that closed without any reply at all",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Only an answer from the broker's order logic that says no proves the order was not accepted. A gateway error or rate-limit reply may have come from a layer in front, with the request still passed on. A closed connection says nothing at all.",
      distractors: [
        "A 500-range reply can come from a proxy while the backend still processes the request.",
        "",
        "A rate-limit reply may be sent by a front layer, and says nothing about requests already accepted.",
        "No reply is the definition of unknown. The order may have been accepted just before the connection broke.",
      ],
    },
    {
      q: "Fifty browser tabs subscribe within one second and each could start a data feed. Which design makes sure only one starts it?",
      options: [
        "Each tab reads a database flag and starts the feed if unset",
        "Each server keeps an in-memory flag and skips if it is set",
        "Each tab waits a random few seconds, then starts the feed",
        "Each tab attempts a conditional write; only the winner starts it",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Check-then-set has a gap in which many tabs see 'unset'. A conditional write makes the check and the claim a single operation in the shared store, so exactly one attempt in the window can win.",
      distractors: [
        "Reading and then writing leaves a gap. Fifty near-simultaneous readers can all see the flag unset.",
        "Separate containers do not share memory, so each would start its own feed.",
        "Random delays only spread the duplicates out; nothing decides who goes first.",
        "",
      ],
    },
    {
      q: "A developer changes the retry loop to generate a new tag on every attempt, 'so each order is unique'. What breaks?",
      options: [
        "A later look-up cannot find an earlier attempt, so a duplicate slips through",
        "Nothing; unique tags make every order easier to track",
        "The broker will reject the second tag as invalid or unknown",
        "Orders will take noticeably longer to reach the exchange",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The tag identifies the intent. If it changes per attempt, an earlier attempt that did reach the broker is invisible to the check made under the new tag. The result is the duplicate the tag was meant to prevent.",
      distractors: [
        "",
        "Unique per attempt sounds tidy, but it destroys the link between attempts that the check relies on.",
        "Brokers accept any tag within their format. The problem is on your side of the check.",
        "Speed is unaffected. The damage is in correctness.",
      ],
    },
    {
      q: "A vendor says: 'Our platform has exactly-once delivery, so you do not need to handle duplicates.' What is the best response?",
      options: [
        "Accept it; a vendor would not claim it without a mechanism",
        "Remove all retries, since retries are what cause duplicates",
        "Ask where dedupe happens and how long ids are kept; stay idempotent",
        "Add a lock in your own code around every message you handle",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Exactly-once is achieved by dedupe over at-least-once delivery. It has limits: remembered ids expire, and effects outside the platform are not covered. Asking where it lives shows what it does and does not protect. Idempotent handlers are cheap insurance.",
      distractors: [
        "Claims like this usually hold only within one system boundary, and for a window of time.",
        "Removing retries trades duplicates for lost messages, which is usually worse.",
        "",
        "A local lock stops simultaneous processing but not a repeat after the first finishes, and does not survive a restart.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-idempotency-timeout-entry",
      scenario:
        "Your live NIFTY options strategy sends a buy order for 130 units at about ₹120 a unit, roughly ₹15,600. The request to the broker times out after ten seconds with no reply. You run one server, trade minute bars and are the only operator. The broker lets you attach a tag to an order and list the day's orders, but has no idempotency keys. A duplicate would leave a second position with no stop. What do you do?",
      options: [
        {
          label: "Resend the same order immediately, up to five times with backoff",
          appeal:
            "Standard retry-with-backoff, quick, and no extra calls to the broker.",
        },
        {
          label: "Do not retry on timeout; alert the operator and wait for the next signal",
          appeal:
            "No duplicate is ever possible and the logic is trivial.",
        },
        {
          label: "Wait a few seconds, read the order book, look for the tag, and place once more only if the read succeeded and the tag is absent",
          appeal:
            "It uses the one safe source of truth the broker gives and keeps the retry.",
        },
        {
          label: "Resend once with a fresh tag so each attempt is separately traceable",
          appeal:
            "Each order is uniquely labelled, which looks cleaner for later review.",
        },
      ],
      best: 2,
      verdict:
        "A duplicate costs a second unprotected ₹15,600 position, while a short wait costs a few seconds. Looking in the order book by a tag you control turns an unknown into a fact. Immediate retries risk exactly the duplicate you cannot afford, never retrying turns every network blip into a missed entry or an unexited position, and a fresh tag blinds the check.",
      claims: [
        {
          text: "You accept a delay of a few seconds, and a missed entry if the book cannot be read, in exchange for no duplicates.",
          axis: "trade",
          correct: true,
          note: "The delay and the occasional stop are the price of fail-closed behaviour. Both are small against a doubled position.",
        },
        {
          text: "Immediate retry is the better trade because broker order books are never reliable enough to consult.",
          axis: "trade",
          correct: false,
          note: "The order book is the broker's own record. It can be briefly unreadable, which is why the design stops when it cannot read, but it is the best evidence available.",
        },
        {
          text: "If the book read happens too soon after the timeout, a slow order can look absent and be doubled.",
          axis: "failure",
          correct: true,
          note: "This is why a settle delay comes before the read.",
        },
        {
          text: "If the book is unreadable, the safe move is to treat the order as absent and place it again.",
          axis: "failure",
          correct: false,
          note: "Unreadable is unknown, not absent. Re-placing on that basis is how duplicates appear during an outage.",
        },
        {
          text: "You would count how often an unclear outcome ends as found, absent or unreadable.",
          axis: "measure",
          correct: true,
          note: "Those three counts show whether the look-up is earning its keep and how often the broker's book is a problem.",
        },
        {
          text: "You would judge the design by the average time to place an order on normal days.",
          axis: "measure",
          correct: false,
          note: "Normal days never exercise the unclear path. Measure the unclear outcomes and any duplicates.",
        },
      ],
    },
    {
      id: "sd-idempotency-burst-subscribe",
      scenario:
        "A trading chart page opens and its components send about fifty subscribe requests within one second. Each request, in a serverless function, would invoke a market-data bridge that opens a connection to the broker's feed. Invoking it costs money and extra connections can be refused by the broker. Several containers can run at once, so they share no memory. Missing the invocation altogether would leave the page with no ticks. How do you ensure one invocation per burst?",
      options: [
        {
          label: "A conditional write to a shared table: only if no unexpired row exists, with a window of about half a minute, failing open if the table errors",
          appeal:
            "Check and claim become one atomic operation in a store every container can reach.",
        },
        {
          label: "A boolean variable at module level in the function",
          appeal:
            "Zero extra cost or calls and trivial to write.",
        },
        {
          label: "Invoke the bridge every time and let the bridge close duplicate connections",
          appeal:
            "Pushes the complexity to one place and guarantees the bridge always runs.",
        },
        {
          label: "Read a row, and if it is unset, write it and then invoke",
          appeal:
            "Familiar check-then-set using the same shared table.",
        },
      ],
      best: 0,
      verdict:
        "Containers share no memory, so an in-process flag cannot coordinate them. Read-then-write leaves a gap that fifty parallel requests will fall into. Invoking every time pays the cost fifty times. A conditional write is atomic in the shared store. Failing open is correct because a duplicate start is a small waste while no start means no ticks.",
      claims: [
        {
          text: "You accept an extra write to a shared table on every subscribe, to avoid fifty bridge invocations.",
          axis: "trade",
          correct: true,
          note: "One cheap write per request replaces the expensive operation it guards.",
        },
        {
          text: "A module-level flag is the cheaper option with the same safety, because Lambda runs a single instance.",
          axis: "trade",
          correct: false,
          note: "Lambda scales out by running several containers. A flag in one is invisible to the others.",
        },
        {
          text: "Failing open means that if the table is unavailable, you may start the bridge more than once.",
          axis: "failure",
          correct: true,
          note: "That is the deliberate choice: a duplicate start costs little, a missing start stops the feed.",
        },
        {
          text: "If the window is set to zero, the debounce still protects against bursts.",
          axis: "failure",
          correct: false,
          note: "A zero window disables the debounce, so every request would invoke the bridge.",
        },
        {
          text: "You would measure how many bridge invocations occur per burst, expecting about one.",
          axis: "measure",
          correct: true,
          note: "Invocations per burst is the direct check that the guard works.",
        },
        {
          text: "You would measure the number of conditional-check failures and treat each as an error to fix.",
          axis: "measure",
          correct: false,
          note: "A failed condition is the success path: it means a duplicate was blocked. Alert on unexpected errors, not on losses of the race.",
        },
      ],
    },
    {
      id: "sd-idempotency-mobile-orders",
      scenario:
        "A retail broker's mobile app lets about two million users place orders over unreliable networks. The app retries a request if it hears nothing for five seconds. Support has seen users with two identical orders placed seconds apart. The order service runs on many servers behind a load balancer and writes to a shared database. Orders are real money and the service must remain fast during market hours. What do you build?",
      options: [
        {
          label: "Reject any order matching the same user, symbol, side and quantity within 10 seconds",
          appeal:
            "Needs no change to the app, and catches the visible duplicates.",
        },
        {
          label: "A per-server in-memory lock keyed by user",
          appeal:
            "Cheap and fast, and prevents simultaneous double submits.",
        },
        {
          label: "Tell users not to tap twice and disable the button for ten seconds",
          appeal:
            "Cheap and reduces accidental repeats from the user's own taps.",
        },
        {
          label: "The app creates an idempotency key per order intent; the service stores key and result under a unique constraint and returns the stored result for repeats",
          appeal:
            "The sender states which requests are the same, so retries are provably safe.",
        },
      ],
      best: 3,
      verdict:
        "The app's own retries are the source, so the app knows which requests are the same intent and should say so. A key with a unique constraint in the shared database works across all servers. A time-and-fields heuristic blocks legitimate orders, such as two real buys of the same size. A per-server lock fails when the retry lands on another server. A disabled button does not stop automatic retries.",
      claims: [
        {
          text: "You accept storing a key and a result for every order for as long as a retry can occur.",
          axis: "trade",
          correct: true,
          note: "Storage and expiry policy are the cost. Keys can be pruned after the longest realistic retry window.",
        },
        {
          text: "A field-matching heuristic is equally safe, since two identical orders are always duplicates.",
          axis: "trade",
          correct: false,
          note: "A user can legitimately send two identical orders. Only an explicit key tells a repeat from a new decision.",
        },
        {
          text: "If the key is created again on each retry, the service cannot recognise the repeat.",
          axis: "failure",
          correct: true,
          note: "The key must belong to the intent and be reused on every retry.",
        },
        {
          text: "If keys expire after an hour, a retry that arrives after two hours is guaranteed to be caught.",
          axis: "failure",
          correct: false,
          note: "Once the key is gone, the repeat looks new. The expiry must exceed the longest possible retry.",
        },
        {
          text: "You would count requests that hit an existing key and returned the stored result.",
          axis: "measure",
          correct: true,
          note: "That count is the number of duplicates the design absorbed, and shows the problem size.",
        },
        {
          text: "You would measure success by whether support tickets about orders fall, ignoring the service's own counts.",
          axis: "measure",
          correct: false,
          note: "Tickets lag and mix causes. The service's own counts of repeated keys and conflicting payloads are direct evidence.",
        },
      ],
    },
  ],
};

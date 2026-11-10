import type { Topic } from "../../types.ts";

export const sdBrokerAdapters: Topic = {
  id: "sd-broker-adapters",
  title: "Broker adapters and token lifecycles",
  tier: 4,
  week: 8,
  depth: "deep",
  summary:
    "An adapter gives every broker one internal vocabulary, so the engine never learns Kite or Groww quirks. Daily-expiring tokens are the other half of the problem.",
  why: "Traed routes live orders to Zerodha Kite and Groww, and Paytm Money has an adapter too. Each broker names things differently, answers errors differently and logs you out every day. If those differences leaked into the strategy engine, every new broker would touch everything. Investors and co-founders will ask how hard a new broker is and what happens when a token dies at 08:00. This lesson gives you the pattern, its name, and the honest account of where Traed's version is uneven.",
  learn: {
    intuition:
      "Think of a travel plug adapter. Your laptop has one fixed plug. Every country has a different socket. You do not rebuild the laptop for each country. You carry a small adapter that takes the local shape on one side and gives your plug on the other. A broker adapter is the same idea for software. The engine speaks one language: place an order, read its status, list positions, read margins. Each broker has its own words, its own error codes and its own rules about who may call when. The adapter translates both ways and hides the rest. The second half is the key card at a hotel. Many brokers give a key that stops working every night. Someone has to issue a new one each morning, and anyone holding yesterday's key must notice and fetch the new one.",
    mechanics: [
      {
        heading: "One internal vocabulary: the adapter or anti-corruption layer",
        body: "The pattern is called an adapter, or an anti-corruption layer when its job is to stop a foreign model leaking inward. In Traed the engine codes against one abstract `TradingInterface` with place order, order status, positions, margins and order list. `ZerodhaTradingInterface`, `GrowwTradingInterface` and a Paytm Money class implement it. A factory takes a user and a broker name, normalises aliases such as `zerodha` to `kite`, and returns either an interface or a human-readable reason. The most important translation is the answer to a placement: `PLACED`, `REJECTED` or `UNKNOWN`. Every broker's mess of codes is squeezed into those three, so the retry logic is written once.",
      },
      {
        heading: "Capability differences that the interface cannot hide",
        body: "Adapters hide spelling, not every real difference. Kite's order book rows carry filled quantity, so the engine reads one list per pass. Groww's list does not, so it reads orders one by one, a few per pass. Traed marks this with a flag on the interface, and the caller asks the capability, never the broker name. Symbols differ too: a crude oil option is spelt one way inside the engine and a different way at Groww, so the Groww adapter translates out on every order and back on every row it returns. Groww also separates exchange from segment, and its idempotency reference is limited to 8 to 20 characters.",
      },
      {
        heading: "Daily token expiry: a state machine, not a constant",
        body: "Most Indian retail brokers issue an access token that works for about a day. Treat it as a state: no token, active, expired, error, disconnected. In Traed the web app owns the broker rows. A scheduled job at 08:30 IST logs into Kite with a TOTP code and stores the new token, and the token counts as expired after 24 hours or when the profile call returns 403. Groww tokens are re-minted after their own early-morning reset, so the factory refuses to reuse a token minted on an earlier day. The engine reads the stored row each time it builds a client. The sensitive fields are encrypted at rest and hidden from API output.",
      },
      {
        heading: "Stale clients, safe retries and not blaming the broker",
        body: "A client built at 23:18 still holds yesterday's token the next morning, and every call returns 403. Traed gives the Kite client a loader that re-reads the stored token. A read that fails with a token error reloads and retries once. A write is never retried at that layer, since a second order could duplicate the first. The order executor rebuilds the client once when a rejection looks like a dead token. One more rule keeps the broker row clean: only a genuine credential rejection may mark a broker as errored. Timeouts, TLS faults, 5xx and 429 are transient and must never demote a good credential.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep one internal trading interface and put each broker behind an adapter, so Kite, Groww and Paytm Money look the same to the strategy engine. The adapter squeezes every placement answer into placed, rejected or unknown, and the retry logic is written once. Tokens expire daily, so a scheduled login refreshes Kite's, and the client re-reads the stored token when a call fails. We accept that the abstraction leaks in places, such as order-book reads and symbol spellings, and that connection and order code live in two languages. We would tidy that when a fourth broker arrives.",
      },
    ],
    complexityDerivation:
      "The argument is about the direction of change. Brokers change for reasons you do not control: a new API version, a different error body, a new login rule. The strategy engine changes for reasons you do control. If the engine speaks each broker's language, every broker change ripples into the engine, and the cost of a new broker is the cost of understanding the whole engine. An adapter turns that into a local cost: write one class that satisfies the interface, plus a test that it honours the contract. The pattern holds while the brokers are roughly the same kind of thing: place, query, cancel. It starts to hurt in two cases. If one broker has a capability the others lack, such as a basket order or a margin calculator, the lowest common interface either drops it or grows optional methods, and the abstraction leaks. And if the interface is designed from the first broker alone, it quietly bakes in that broker's habits, so the second broker needs the interface changed, not just a new class. Two real brokers behind the interface is the minimum test of whether it is genuine.",
    variants: [
      {
        name: "Thin adapter per broker",
        when: "A handful of brokers with similar order models, as with Indian discount brokers.",
        delta:
          "One class per broker implementing a shared interface. Cheap to add, but capability flags and special cases pile up inside the callers if you are not careful.",
      },
      {
        name: "Anti-corruption layer with a domain model",
        when: "Broker data feeds deep logic such as reconciliation, positions or tax, and you want broker terms kept out entirely.",
        delta:
          "Translates every broker payload into your own order, fill and position types at the boundary. More code, but the rest of the system never sees a broker field name.",
      },
      {
        name: "Aggregator or standard protocol",
        when: "Many venues or many brokers, and a common protocol such as FIX already exists on both sides.",
        delta:
          "You speak one protocol and the other side maps it. Less code to write, but you inherit the protocol's limits and depend on the aggregator's uptime and pricing.",
      },
    ],
    tradeoffs: [
      {
        vs: "Coding the engine directly against Kite",
        pick: "An adapter interface from the start",
        because:
          "With one broker the interface is overhead. It pays back the day a second broker arrives, and Traed added Groww and then Paytm Money behind the same contract without changing the order logic.",
      },
      {
        vs: "A lowest-common-denominator interface",
        pick: "A common interface plus capability flags",
        because:
          "Brokers do differ, for example in whether the order book carries fills. A flag lets the caller choose the cheaper path without naming a broker, at the cost of a few conditionals.",
      },
      {
        vs: "Marking a broker unhealthy on any failure",
        pick: "Demoting only on a genuine credential rejection",
        because:
          "A demotion locks the broker out of every live path. A certificate fault during a deploy once looked like a failure, so transient errors are retried and logged, never allowed to flip a good credential to errored.",
      },
    ],
  },
  realWorld: [
    {
      system: "FIX protocol between brokers and venues",
      kind: "industry",
      problem:
        "Every venue and broker invented its own message format, so each connection was a custom project.",
      applied:
        "FIX defines common message types for new order, execution report and cancel, with agreed fields and order states. A firm builds one FIX engine and configures per-counterparty differences, which is the adapter idea applied across an industry.",
      evidence: "FIX Trading Community specification, public",
      impact:
        "Adding a counterparty becomes configuration and certification, not a rewrite.",
    },
    {
      system: "Zerodha Kite Connect daily login",
      kind: "industry",
      problem:
        "A broker API that must be reachable by third-party apps but cannot hand out permanent keys to a trading account.",
      applied:
        "Kite Connect uses a login flow that returns a request token, exchanged with a checksum for an access token that is valid for one day. Apps must repeat the login each day, so every algo platform on Kite runs some form of morning re-login.",
      evidence: "Zerodha Kite Connect public API documentation",
      impact:
        "A system that ignores token expiry works in testing and fails at the first market open after a night.",
    },
    {
      system: "Traed trading interface and broker factory",
      kind: "yours",
      problem:
        "The engine needed to place and track live orders on Kite and Groww without branching on broker name throughout the order code.",
      applied:
        "An abstract trading interface defines the operations. Kite, Groww and Paytm Money classes implement it, and a factory resolves a user's stored credentials into the right class, or returns a readable reason such as a missing token or an unsupported broker.",
      evidence:
        "strategy-engine/src/brokers/factory.py; strategy-engine/src/brokers/trading_interface.py; strategy-engine/src/brokers/groww_trading.py",
      impact:
        "A new broker is a new class and a factory entry. Dhan is stored in the vault but has no trading class, and the factory says so plainly.",
    },
    {
      system: "Traed daily token rotation and self-healing client",
      kind: "yours",
      problem:
        "Kite tokens rotate every morning, and an engine client built the night before kept sending the old token and failed every call.",
      applied:
        "The Kite interface takes a token loader that re-reads the stored token. Reads reload and retry once on a token error, writes are not retried there, and the order executor rebuilds the client once when a rejection looks token-related.",
      evidence:
        "strategy-engine/src/brokers/trading_interface.py; strategy-engine/src/brokers/factory.py; docs/LLD.md (section 7)",
      impact:
        "A strategy running across the morning rotation can still place its exit orders.",
    },
  ],
  insights: [
    {
      t: "Squeeze every broker answer into three outcomes",
      d: "Placed, rejected and unknown. The unknown case is the one that matters, because it forces the caller to check before retrying.",
    },
    {
      t: "Ask for a capability, not a broker name",
      d: "A flag such as 'order book carries fills' lets callers choose a path without if-statements on 'kite' or 'groww' spread through the code.",
    },
    {
      t: "A token is a state, not a setting",
      d: "It is active, expired or errored, and something must move it forward each morning and detect when it has gone stale.",
    },
    {
      t: "Transient is not rejected",
      d: "Only a real credential refusal should demote a broker. Timeouts, 5xx and 429 mean try again, not log the user out.",
    },
  ],
  pitfalls: [
    "Designing the interface from one broker's API. The second broker then forces a change to the interface itself, not just a new class.",
    "Branching on broker name in strategy or order code. Every `if broker == 'kite'` is a leak the adapter was meant to prevent.",
    "Treating any failure as a bad credential and marking the broker errored. A deploy-time TLS fault can then lock out a perfectly valid token for hours.",
  ],
  quiz: [
    {
      q: "What is the main job of a broker adapter?",
      options: [
        "To cache broker responses so repeated calls are faster",
        "To encrypt orders before they leave the server",
        "To speed up order placement with a faster protocol",
        "To translate between the engine's own vocabulary and one broker's API",
      ],
      answer: 3,
      why: "An adapter keeps one broker's names, errors and rules out of the rest of the system. Speed, caching and encryption can be added, but they are not what makes it an adapter.",
      difficulty: "recall",
      distractors: [
        "Caching is a separate concern. An adapter can sit in front of a cache but is not defined by it.",
        "Encryption of transport is done by TLS and has nothing to do with translating vocabulary.",
        "A different protocol may be used inside, but the point is translation, not speed.",
        "",
      ],
    },
    {
      q: "Why do most algo platforms on Indian brokers run a login job every morning?",
      options: [
        "Access tokens are valid for about a day, so a fresh one is needed each day",
        "The exchange closes every session at 15:30 and reopens them the next day",
        "Brokers rotate the API key daily so that the key cannot be guessed over time",
        "The market data feed needs a new subscription to be created each morning",
      ],
      answer: 0,
      why: "The access token, not the API key, expires. Without a daily re-login the platform holds a dead token and every call fails.",
      difficulty: "recall",
      distractors: [
        "",
        "Exchange sessions end at close, but they do not invalidate your broker credential.",
        "The key identifies the app and is long-lived. The access token is what expires each day.",
        "Feeds do need resubscribing after a reconnect, but that is a different problem from the credential expiring.",
      ],
    },
    {
      q: "A Kite client was built at 23:18. At 09:20 the next day it gets 403 with a token error on a read call. What should the Kite adapter do first?",
      options: [
        "Mark the broker as errored and stop all trading for the user",
        "Re-read the stored token, rebuild the session and retry that read once",
        "Retry the same request three times with the same token",
        "Place the order through the other broker instead",
      ],
      answer: 1,
      why: "The morning login has written a fresh token to the store. Reloading it and retrying once fixes the common case. Retrying the same dead token cannot help, and demoting the broker would lock out a valid credential.",
      difficulty: "apply",
      distractors: [
        "Feels cautious, but the credential is fine. A fresh token already exists, and a demotion would block every live path.",
        "",
        "Retrying with the same token repeats the same 403. Repetition helps with transient faults, not with a stale credential.",
        "Switching brokers moves the problem and may use a different account than the strategy was approved for.",
      ],
    },
    {
      q: "A Groww request times out while placing an order. How should the adapter report the result?",
      options: [
        "REJECTED, because the broker did not confirm the order",
        "PLACED, because most requests that time out still succeed",
        "UNKNOWN, so the caller checks the book by tag first",
        "REJECTED, and let the retry layer try again at once",
      ],
      answer: 2,
      why: "A timeout means the request may have reached the broker. Calling it rejected could abandon a real position, and retrying blind could duplicate it. UNKNOWN forces a check first.",
      difficulty: "apply",
      distractors: [
        "Sounds careful, but a rejection means the broker said no. Here the broker has not answered at all.",
        "Optimism about success is not evidence. The adapter must not claim a fill it has not seen.",
        "",
        "A fast retry after a false rejection is how duplicate orders reach a live account.",
      ],
    },
    {
      q: "The engine must read fills for pending orders. Kite's order list carries filled quantities and Groww's does not. Which design best keeps the engine broker-agnostic?",
      options: [
        "A capability flag the sweep checks to pick list or per-order reads",
        "An if-statement on the broker name inside the sweep code",
        "Always read orders one by one for every broker, to keep code simple",
        "Drop Groww support for live order tracking until it matches Kite",
      ],
      answer: 0,
      why: "A capability flag keeps the knowledge in the adapter and lets new brokers declare what they support. A name check spreads broker knowledge into the caller.",
      difficulty: "apply",
      distractors: [
        "",
        "It works today but hardcodes two names into code that should not know them, so each new broker edits the sweep.",
        "Simple, but it multiplies calls on Kite, which has a rate limit, for no benefit.",
        "Dropping a supported broker to keep an abstraction tidy gets the priority backwards.",
      ],
    },
    {
      q: "A deploy restarts the engine and, for ten minutes, token tests raise a TLS certificate error. What should happen to the broker row?",
      options: [
        "Mark it errored right away so nobody uses it by mistake today",
        "Mark it disconnected and ask the user to log in again today",
        "Leave it active, retry the check with short backoff, log it",
        "Delete the stored token to force a clean new login at once",
      ],
      answer: 2,
      why: "A TLS fault is transient and says nothing about the credential. Only a real credential rejection should demote. Deleting the token makes the problem worse by forcing an unnecessary login.",
      difficulty: "apply",
      distractors: [
        "Tempting because errors should be visible, but demotion removes the broker from every live path and does not self-heal.",
        "The user did nothing wrong, and a manual login is pointless when the existing token is valid.",
        "",
        "Destroying a valid token to fix a transport fault creates a morning-login problem where none existed.",
      ],
    },
    {
      q: "A teammate wants to design the broker interface by copying every method of the Kite API, since Kite is the only broker today. What is the best advice?",
      options: [
        "Do it, because copying a real API guarantees that the interface is complete",
        "Define what the engine needs, then test it against a second broker's API",
        "Wait until three brokers exist so that the interface is perfect first time",
        "Skip the interface and call Kite directly until a second broker arrives later",
      ],
      answer: 1,
      why: "An interface shaped by one API inherits its habits. Designing from what the engine needs, and testing the shape against a second broker, catches the leaks cheaply.",
      difficulty: "judge",
      distractors: [
        "Completeness for Kite is not neutrality. The interface then carries Kite's naming and order model into every other adapter.",
        "",
        "Waiting for three delays the benefit and leaves callers coupling to Kite in the meantime.",
        "Possible, but every Kite-specific call spread through the engine becomes a refactor later.",
      ],
    },
    {
      q: "You are asked why Traed has broker code in two languages: a PHP connection layer and a Python trading layer. Which answer is most honest and defensible?",
      options: [
        "It is a deliberate microservice design with a clean split between two teams",
        "It is required, because PHP cannot call broker APIs from a web application",
        "It is temporary and the Python side will replace the PHP side next month",
        "It grew with the system: web app owns login, engine places orders; unify when it hurts",
      ],
      answer: 3,
      why: "The docs describe the split as the result of how the system grew, with each side doing a different job. Saying so, and when you would revisit it, is more convincing than inventing a design rationale.",
      difficulty: "judge",
      distractors: [
        "Calling an accident a design invites a probing question you cannot answer well.",
        "False. PHP can call broker APIs, and the PHP side does exactly that for login.",
        "A date you cannot back is worse than an honest 'when it hurts'.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-broker-adapters-second-broker",
      scenario:
        "A solo founder has live trading working on Kite only. The order code calls Kite directly in about 40 places. A user wants Groww next quarter, and a third broker is possible later. The founder has about two weeks of engineering time this month and trades live every day. What should be done now?",
      options: [
        {
          label: "Copy the Kite calls and edit them into Groww versions beside each one",
          appeal:
            "Fastest to ship, and each version is easy to read next to the original.",
        },
        {
          label: "Extract an interface from the engine's needs, wrap Kite behind it, then add Groww",
          appeal:
            "One place per operation, and Groww becomes a new class instead of 40 edits.",
        },
        {
          label: "Adopt a third-party broker aggregator and drop direct integrations",
          appeal:
            "One integration covers many brokers and removes the login chores.",
        },
        {
          label: "Do nothing until a paying user on Groww exists",
          appeal:
            "No wasted work if the user never arrives.",
        },
      ],
      best: 1,
      verdict:
        "Forty direct call sites mean a copied Groww path doubles every future change. Two weeks is enough to extract the interface and wrap Kite, which stays behind the live strategy under test. A third broker is likely, which pays the cost back. An aggregator adds a dependency and a fee for a platform with two brokers, and waiting leaves the coupling in place.",
      claims: [
        {
          text: "You pay for the interface work now to make the second and third brokers cheap.",
          axis: "trade",
          correct: true,
          note: "The trade in one line: cost now, lower cost per broker later. It is justified because a second and probably a third broker are real.",
        },
        {
          text: "Copying the Kite calls is cheaper in total because each broker keeps its own simple code.",
          axis: "trade",
          correct: false,
          note: "It is cheaper this week only. Every later change to order logic must then be made in each copy.",
        },
        {
          text: "Wrapping Kite behind a new interface can break a working live path, so it needs tests and a small first live order.",
          axis: "failure",
          correct: true,
          note: "A refactor on the money path can change behaviour. The risk is managed by tests on the contract and a one-lot live check.",
        },
        {
          text: "The interface cannot fail, since it only renames calls.",
          axis: "failure",
          correct: false,
          note: "Renaming still changes error handling, retries and return shapes, which is where live bugs hide.",
        },
        {
          text: "Count the broker-name conditionals left outside the adapters after the change.",
          axis: "measure",
          correct: true,
          note: "A falling count shows the abstraction is holding. Many remaining names mean it is leaking.",
        },
        {
          text: "Measure lines of code removed, since fewer lines mean a better design.",
          axis: "measure",
          correct: false,
          note: "Line count is noisy. What matters is where broker knowledge lives, not the total.",
        },
      ],
    },
    {
      id: "sd-broker-adapters-token-rotation",
      scenario:
        "A live strategy runs from 09:15 to 15:30 on Kite. The morning login job runs at 08:30 and writes a new token to the database. Last week the engine, started at 23:10 the night before, sent every request in the morning with the old token and the first entry of the day failed. Deploys also happen in the evening. Which fix fits best?",
      options: [
        {
          label: "Restart the engine every morning after the login job",
          appeal:
            "Simple and certain: a new process builds a new client with the new token.",
        },
        {
          label: "Give the client a way to re-read the stored token, and retry a read once on a token error",
          appeal:
            "It fixes any staleness, including a token rotated mid-session, without a restart.",
        },
        {
          label: "Store the token in an environment variable at engine start",
          appeal:
            "No database read per call, and the value is explicit.",
        },
        {
          label: "Ask the user to log in again from the web app each morning",
          appeal:
            "A human check and no automation to build.",
        },
      ],
      best: 1,
      verdict:
        "A restart works only if it runs after the job and when no position is open. It also drops live state. A loader that re-reads the stored token handles rotation at any time. An environment variable bakes in exactly the stale value that failed. Manual login each morning fails on the day the founder is travelling.",
      claims: [
        {
          text: "You accept an extra database read when a call fails with a token error, in return for no dependency on restart timing.",
          axis: "trade",
          correct: true,
          note: "The read happens only on failure, so it adds almost nothing on the normal path.",
        },
        {
          text: "Restarting the engine daily is the same fix with less code, so it is equally good.",
          axis: "trade",
          correct: false,
          note: "It needs the right time, risks an open position and restores state from storage. It also does nothing for a token rotated during the day.",
        },
        {
          text: "A write that fails with a token error should not be retried inside the adapter, because the order may already exist.",
          axis: "failure",
          correct: true,
          note: "Reads are safe to repeat. Writes need the placed, rejected, unknown handling and a reconciliation before any re-place.",
        },
        {
          text: "If the stored token is also stale, the retry will succeed on the second attempt.",
          axis: "failure",
          correct: false,
          note: "If the login job itself failed, both tokens are dead. That needs an alert on the job, not a retry.",
        },
        {
          text: "Alert when the login job has not written a token for today by 08:45.",
          axis: "measure",
          correct: true,
          note: "A symptom alert on the cause. It tells you before the market opens, not after the first failed entry.",
        },
        {
          text: "Track the total number of 403 responses per month and aim for zero.",
          axis: "measure",
          correct: false,
          note: "A few 403s are expected around rotation and are handled. Zero is the wrong target, while 'unhandled 403 on an order' is the right one.",
        },
      ],
    },
    {
      id: "sd-broker-adapters-platform-scale",
      scenario:
        "A broker-neutral algo platform serves 2,000 retail traders across eight Indian brokers. Orders are placed from a shared service, and each trader's tokens expire at different times. The team is 12 engineers. New brokers are requested every quarter, and some offer basket orders or built-in margin calculators that others lack. How should broker integration be organised?",
      options: [
        {
          label: "One interface with optional capabilities, plus a conformance suite every adapter must pass",
          appeal:
            "Shared contract, declared differences, and a safety net for each new broker.",
        },
        {
          label: "A strict lowest-common-denominator interface only",
          appeal:
            "Maximum simplicity: if all eight cannot do it, it is not in the interface.",
        },
        {
          label: "Each broker integrated by a separate team with its own order flow",
          appeal:
            "Teams move independently, with no coordination overhead.",
        },
        {
          label: "Only the three biggest brokers, with others declined",
          appeal:
            "Limits the integration surface and keeps quality high.",
        },
      ],
      best: 0,
      verdict:
        "At eight brokers and a quarterly cadence, a shared contract with a conformance suite is what keeps additions cheap and behaviour consistent. Optional capabilities let basket orders and margin calculators be used where present, without breaking the rest. Lowest-common-denominator wastes real features, and separate flows duplicate risk logic eight times.",
      claims: [
        {
          text: "You accept optional capabilities and a conformance suite to maintain, in return for fast, safe additions.",
          axis: "trade",
          correct: true,
          note: "The cost is a standing test suite and capability flags. The gain is that broker nine is a class and a test run.",
        },
        {
          text: "A strict lowest-common-denominator interface is the cheapest option and loses nothing.",
          axis: "trade",
          correct: false,
          note: "It is cheap to maintain but gives up features such as basket orders, so users on capable brokers pay for the simplicity.",
        },
        {
          text: "A broker whose adapter passes the suite but misreports fills can still cause wrong positions, so reconciliation against the broker's own book remains necessary.",
          axis: "failure",
          correct: true,
          note: "A contract test checks shape and known cases. Reality still differs, and the broker's book is the final check.",
        },
        {
          text: "Per-trader token expiry times cannot cause trouble because every token follows the same schedule.",
          axis: "failure",
          correct: false,
          note: "At 2,000 users, failed logins, retries and clock differences make the refresh schedule uneven. A single dead token is one user's outage.",
        },
        {
          text: "Track the share of users with a valid token at 09:10 each day, per broker.",
          axis: "measure",
          correct: true,
          note: "It measures the readiness that matters before the open and shows which broker's login flow is failing.",
        },
        {
          text: "Track the number of broker adapters, since more integrations means a stronger platform.",
          axis: "measure",
          correct: false,
          note: "A count is a feature list, not a health signal. Order success and token validity per broker are health signals.",
        },
      ],
    },
  ],
};

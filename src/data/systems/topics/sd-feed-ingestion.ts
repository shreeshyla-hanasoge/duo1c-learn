import type { Topic } from "../../types.ts";

export const sdFeedIngestion: Topic = {
  id: "sd-feed-ingestion",
  title: "Feed handlers and tick ingestion",
  tier: 2,
  week: 3,
  depth: "deep",
  summary:
    "A feed handler holds one long-lived socket, decodes binary frames, maps tokens to your names, and survives reconnects without losing its subscriptions.",
  why: "Every decision your platform makes starts as bytes on one socket from Kite. If that handler decodes wrongly, forgets a subscription after a reconnect, or stamps a tick with the wrong name, strategies go blind while the system looks healthy. Traed has lived through exactly these failures, including one on 9 November 2026. Knowing the pattern lets you explain what the feed handler does, and why it is built defensively.",
  learn: {
    intuition:
      "Think of a radio operator on a ship. One radio is tuned to one station. Messages arrive as short coded bursts, not as sentences. The operator must decode each burst, write it in the ship's own log in the ship's own words, and notice if the station goes quiet. If the radio drops, the operator retunes and must remember every station request that was active before. A good operator also knows that silence on one channel is not silence on all channels. A feed handler is that operator. The station is the broker or exchange. The coded bursts are binary frames. The log is your internal tick format. The dangerous moment is not the loud failure, a radio that goes dead. It is the quiet one: the radio is on, the light is green, and one channel you care about says nothing.",
    mechanics: [
      {
        heading: "A long-lived connection, not a request",
        body: "A price feed is pushed to you. You open one WebSocket once, tell the broker which instruments you want, and then bytes arrive for hours. This is cheaper than asking again and again, and the data is fresher. The price is that you now own a connection's whole life: opening, keeping alive, noticing it died, and reopening. A socket can look open while nothing flows through it, so a connection flag alone proves nothing. Kite sends a one-byte frame as a heartbeat when no prices change; Traed's parser treats a frame of one byte as a heartbeat and yields no ticks. Silence is data too.",
      },
      {
        heading: "Binary frames and decoding",
        body: "Feeds send bytes, not text, because bytes are smaller and faster to parse. A Kite frame starts with a 2-byte packet count, then each packet has a 2-byte length. The smallest packet is 8 bytes: a 4-byte instrument token and a 4-byte last price in paise. A price field holding 22,45,075 means 22,450.75 rupees, so you divide by 100. Quote packets are 44 bytes and full packets are 184 bytes with five bid and five ask levels. Index packets are 28 or 32 bytes and carry no volume, because an index is not traded. A parser must check lengths before reading, so one cut frame cannot crash the loop.",
      },
      {
        heading: "Normalising to an internal tick, and the token problem",
        body: "The broker speaks in numeric tokens. Your strategies speak in names such as `NIFTY` or `CRUDEOIL`. The handler translates once, at the edge, so nothing downstream knows broker details. The trap is that the mapping is many names to one token. On 9 November 2026 the names `CRUDEOIL` and `CRUDEOIL1!` both resolved to the same front-month future. The handler stamped each tick with only the first name, so the strategy watching the second name saw nothing all day. The fix delivers one copy of the tick per name. Also, a commodity root points to a new contract after each expiry, so Traed drops its token cache every day.",
      },
      {
        heading: "Reconnect, resubscribe and the replay trap",
        body: "A new socket knows nothing. After a drop you must replay every active subscription, each in the mode it had, or symbols stay dark. Traed waits 2, 4, 8, 16 and then 32 seconds between attempts, and a watchdog checks every 20 seconds. Concurrency bites too. On 23 September 2026 six strategies started together, each saw 'not connected' and opened its own socket: five generations in 64 milliseconds. Now one lock allows a single connect at a time. Exchange feeds go further: each message carries a sequence number, so a jump from 1041 to 1045 reveals a gap, and a recovery channel can resend the missing messages. Traed's parser reads no sequence number, so it cannot detect a gap this way.",
      },
      {
        heading: "Saying it about Traed",
        body: "We keep one WebSocket from the engine straight to Kite. A parser turns binary frames into ticks, every strategy holds a counted handle on that shared socket, and each tick is stamped with the exact name the strategy subscribed under. We chose this after a relay in the middle left live strategies blind for over an hour with a position open. We accept that the engine now depends on Kite's three-connection limit per key, and that we cannot detect gaps, only silence per symbol. We would add a recording tier and sequence checks if we ever consumed an exchange feed directly or served many users.",
      },
    ],
    complexityDerivation:
      "The invariant is this: every instrument a consumer asked for must either deliver ticks under the name it asked with, or be reported as silent within a known time. Everything in a feed handler protects that sentence. Decoding protects the content. The name stamping protects the 'under the name it asked with' part. Replaying subscriptions after a reconnect protects continuity. A per-symbol silence clock protects the 'reported as silent' part, because a socket-wide check cannot see one dead symbol while another keeps the socket busy. On 23 September 2026 the GOLD feed kept the socket looking fresh while NIFTY had no feed all day. Where it stops holding: the argument assumes an ordered, reliable stream, which TCP gives you. If you consume exchange multicast, packets can be lost or reordered, and you need sequence numbers and retransmission. It also assumes a handful of sockets. A platform serving thousands of users must pool upstream connections, because brokers cap them.",
    variants: [
      {
        name: "Polling quotes over HTTP",
        when: "A few instruments, updates every few seconds, no persistent process.",
        delta:
          "Simple and stateless, but you pay a request per answer, you hit rate limits quickly, and you miss every move between two polls.",
      },
      {
        name: "Broker WebSocket with binary frames",
        when: "Minute-bar or tick-driven retail systems like Traed, using Kite or a similar broker feed.",
        delta:
          "One socket, push delivery, small frames, modes from last price to full depth. You own reconnect, resubscribe and silence detection. Order is guaranteed by TCP, so no sequence numbers are exposed.",
      },
      {
        name: "Exchange feed over multicast with sequence numbers",
        when: "Co-located market makers and high-frequency firms that read the exchange directly.",
        delta:
          "Lowest latency, but packets can be lost, so every message has a sequence number, gaps trigger a request on a recovery channel, and often two identical feeds run side by side.",
      },
    ],
    tradeoffs: [
      {
        vs: "A relay in the middle (serverless bridge) for every consumer",
        pick: "A direct socket for the strategy engine, the relay only for dashboards",
        because:
          "A relay shares its delivery path with browser tabs. In August 2026 dashboard churn and relay defects blinded the engine for over an hour. Going direct removes the shared failure at the cost of the engine owning a socket and its credentials.",
      },
      {
        vs: "Last-price mode (small packets) for everything",
        pick: "Last price by default, richer modes only for instruments that need them",
        because:
          "A full packet is 184 bytes against 8 for last price. A held option leg needs the order book for exits, but a spot index used for a rule does not. Remembering each symbol's richest mode also makes replay after a reconnect correct.",
      },
      {
        vs: "Resubscribing only the silent symbol",
        pick: "Resend the whole subscription set",
        because:
          "Kite treats a repeated subscribe as harmless, and one frame is simpler than tracking which symbols to retry. The cost is a small burst on the wire; a cooldown of two minutes stops it repeating.",
      },
    ],
  },
  realWorld: [
    {
      system: "Nasdaq ITCH over MoldUDP64: sequence numbers and replay",
      kind: "industry",
      problem:
        "Exchange feeds travel over UDP multicast, where packets can be dropped or reordered, yet a trading firm must hold an exact copy of the order book.",
      applied:
        "Every message carries a sequence number. The receiver compares each number with the one it expected. A gap triggers a retransmission request on a separate recovery channel, and firms commonly receive two identical feeds so that one fills the other's gaps.",
      evidence: "Nasdaq TotalView-ITCH and MoldUDP64 protocol specifications (public)",
      impact:
        "A gap becomes a detected, repaired event instead of a silently wrong book. Traed does not consume such a feed, which is why its detection is silence-based.",
    },
    {
      system: "Zerodha Kite Connect WebSocket streaming",
      kind: "industry",
      problem:
        "Retail algos need live prices for hundreds of instruments without polling and without huge message sizes.",
      applied:
        "Kite pushes binary frames over one WebSocket. The client sends subscribe and mode messages with instrument tokens and picks last-price, quote or full mode per instrument. Prices arrive in paise. The documentation limits the number of connections per API key and the instruments per connection.",
      evidence: "Kite Connect API documentation: WebSocket streaming (public)",
      impact:
        "Small frames and a mode per instrument keep bandwidth low, and the connection cap forces clients to share one socket across strategies.",
    },
    {
      system: "Traed's direct Kite ticker",
      kind: "yours",
      problem:
        "Ticks reached the engine only through an AWS relay shared with browser dashboards. Three relay defects lined up and live strategies went blind for over an hour with a real position open.",
      applied:
        "The engine now connects straight to Kite with the same stored credentials, parses the binary frames itself, replays subscriptions in their remembered modes after any reconnect, serialises connects with a lock, and falls back loudly to the relay if the direct connection fails. A kill-switch restores the relay.",
      evidence: "strategy-engine/app/services/data_processing/direct_kite_ticker.py",
      impact:
        "The money path no longer shares a failure with dashboards. The relay still serves browser tabs, and its failures can no longer touch execution.",
    },
    {
      system: "Traed's alias incident, 9 November 2026",
      kind: "yours",
      problem:
        "A paper strategy watching `CRUDEOIL1!` never evaluated all day while crude ticks flowed. Two watch names resolved to one Kite token, and ticks were stamped with only the first name.",
      applied:
        "The handler now asks for every name that maps to a token and emits one stamped copy per name, recording feed health for each. A test pins the behaviour. The detection recipe was to look for a repeated 'silent' warning while the socket was alive.",
      evidence: "docs/incidents/2026-11-09-ticker-alias-silent-feed.md",
      impact:
        "Feed health is kept per symbol string, so the silence was visible; the fix removed its cause. Names, not sockets, were the unit that failed.",
    },
  ],
  insights: [
    {
      t: "Decode at the edge, speak your own language inside",
      d: "Parse binary frames into one internal tick, and translate broker tokens into your own symbol names once. Nothing downstream should know the broker's wire format.",
    },
    {
      t: "A reconnect forgets everything",
      d: "A new socket has no subscriptions. Replay each active symbol in its remembered mode, and allow only one connect at a time.",
    },
    {
      t: "Many names can share one token",
      d: "When two watch names resolve to the same instrument, deliver one copy of each tick per name. Stamping only the first name starves the second silently.",
    },
    {
      t: "Silence is per instrument",
      d: "A socket-wide timer cannot see one dead symbol while others tick. Keep a last-tick clock per symbol, and only judge it while that symbol's exchange is open.",
    },
  ],
  pitfalls: [
    "Trusting an 'is connected' flag. A socket can be open and silent, and a subscription acknowledgement does not mean ticks will arrive.",
    "Recording a symbol as subscribed before it resolved to a token. It looks live, is never retried, and receives nothing.",
    "Assuming a name identifies one instrument. Roots, continuous aliases and rolled contracts all point at changing tokens, so a cache must expire daily.",
  ],
  quiz: [
    {
      q: "A WebSocket feed drops during the session and the handler opens a fresh connection. What must it restore for strategies to keep receiving prices?",
      options: [
        "The open orders held by the broker for the account",
        "The candle history for each watched symbol",
        "The active subscriptions, each in the mode it had before",
        "The instrument master file downloaded at the start of day",
      ],
      answer: 2,
      why: "A new socket starts with no subscriptions. Until the handler sends the subscribe and mode messages again, no ticks flow, even though the connection is healthy.",
      difficulty: "recall",
      distractors: [
        "Tempting because orders matter, but orders live at the broker and are unaffected by the market data socket.",
        "Candles are built from ticks or fetched separately. They are not what the new socket is missing.",
        "",
        "The instrument master maps names to tokens and is already in memory. It does not need to be fetched again for a reconnect.",
      ],
    },
    {
      q: "In a feed handler, what is an instrument token?",
      options: [
        "The broker's numeric id for one tradable contract, which several of your names can map to",
        "A secret key that authenticates the WebSocket connection to the broker",
        "A sequence number the exchange attaches to every packet it sends",
        "The price of the instrument in paise as it appears in a packet",
      ],
      answer: 0,
      why: "The token is the broker's id for a contract. Your platform may use several names for it, such as a root and a continuous alias, so the mapping is many names to one token.",
      difficulty: "recall",
      distractors: [
        "",
        "It sounds like a credential, but credentials are the API key and access token. The instrument token only identifies a contract.",
        "Sequence numbers detect gaps. A token identifies what traded, not the order in which messages were sent.",
        "The price sits in the same packet, which is why it is easy to confuse, but it is a separate field.",
      ],
    },
    {
      q: "Strategy A watches `CRUDEOIL` and strategy B watches `CRUDEOIL1!`. Both resolve to one token, and the handler stamps ticks with only the first name it finds. What do you see?",
      options: [
        "Both strategies receive every tick but the prices are wrong",
        "Strategy B never receives a tick while strategy A runs normally",
        "The broker rejects the second subscription as a duplicate",
        "Both strategies receive duplicate ticks and trade twice",
      ],
      answer: 1,
      why: "Each strategy filters ticks by its own name. Only the first name is stamped, so B's filter matches nothing, and B's feed-health clock reports silence while the socket is alive.",
      difficulty: "apply",
      distractors: [
        "The price is correct, it is the label that is wrong. A wrong price would be a decoding bug, not a naming bug.",
        "",
        "The broker only sees tokens, so there is nothing to reject. The duplication is in your own mapping.",
        "Duplicates would come from stamping too many names, which is the fix. The failure here is too few.",
      ],
    },
    {
      q: "At 11:02 your feed handler drops and reconnects. It tracked a set of active symbols. Six held in 'full' mode for order-book exits, the rest in 'ltp'. How should it replay?",
      options: [
        "Resubscribe everything in 'ltp' mode, since that is the cheapest",
        "Wait for each strategy to call subscribe again on its own",
        "Resubscribe only the symbol that last went quiet before the drop",
        "Resubscribe every active symbol in the mode it had before the drop",
      ],
      answer: 3,
      why: "Replaying everything as 'ltp' silently removes the order book from held legs. Waiting for strategies leaves symbols dark, and the quiet-symbol rule misses the rest. Remember each symbol's richest mode.",
      difficulty: "apply",
      distractors: [
        "Cheap, but the six full-mode symbols lose their order book until the next restart, so exits are priced from less information.",
        "Strategies subscribed once and believe it is still live. Nothing prompts them, and the stale-feed watchdog may not fire while other symbols tick.",
        "The last quiet symbol is only one of many that the new socket does not know. All of them need replaying.",
        "",
      ],
    },
    {
      q: "A market maker reads an exchange multicast feed. Messages arrive numbered 1041, 1042, 1045. What does a correct handler do?",
      options: [
        "Ignore it, since a later message always replaces an earlier one",
        "Reconnect the socket and resubscribe every instrument",
        "Treat 1043 and 1044 as missing, mark state suspect, and request retransmission",
        "Insert synthetic messages 1043 and 1044 using the last price",
      ],
      answer: 2,
      why: "On a lossy feed, a jump in sequence numbers is a detected gap. The state built from the messages cannot be trusted until the missing ones are recovered from the retransmission channel.",
      difficulty: "apply",
      distractors: [
        "That works for a last-price display, but an order book is built from every update. A missed update leaves it wrong.",
        "Reconnecting loses more messages and does not return the missing two. Multicast has no per-client socket to reconnect.",
        "",
        "Inventing messages creates false data. Recovery must bring back the real ones.",
      ],
    },
    {
      q: "After a mid-session restart, six strategies call subscribe together. Each sees 'not connected' and opens its own socket. Only the last socket delivers ticks. What is the fix?",
      options: [
        "Serialise connecting with a lock so the first caller connects and the rest reuse it",
        "Add a random delay of a few seconds before each strategy subscribes",
        "Open one extra socket per strategy and keep them all alive",
        "Raise the stale-feed timeout so the watchdog does not close sockets",
      ],
      answer: 0,
      why: "The race is between checking 'connected' and finishing the connect. A lock around connect makes the check and the action one step, so only one socket is opened and later callers see it ready.",
      difficulty: "apply",
      distractors: [
        "",
        "A delay makes the race less likely but not impossible, and it slows every start. The race itself remains.",
        "More sockets is the original bug. Brokers cap sockets per key, so three strategies could use them all.",
        "The watchdog was not the cause. The problem is multiple connects racing, not a premature close.",
      ],
    },
    {
      q: "A platform has one user and about 40 symbols, trading minute bars on Kite. A colleague proposes a handler with sequence-number gap detection and replay. What is the best response?",
      options: [
        "Build it, because any production feed handler needs sequence-based gap recovery",
        "Skip it: TCP is ordered, so watch silence per symbol and backfill from history",
        "Skip it and also remove the watchdog, since TCP guarantees that data arrives",
        "Replace the WebSocket with polling, which has no gaps for a handler to detect",
      ],
      answer: 1,
      why: "Gap detection is for lossy feeds like multicast. A broker WebSocket over TCP arrives in order, and Kite's packets carry no sequence number to check. The real risks are silence and wrong names, and minute bars can be repaired from historical candles.",
      difficulty: "judge",
      distractors: [
        "It sounds rigorous, but without a sequence number in the data there is nothing to compare, and the cost is high for minute bars.",
        "",
        "TCP guarantees order on a live connection, not that the connection is alive or the symbol is ticking. The watchdog is still essential.",
        "Polling misses every move between polls and hits rate limits. It has no gaps only because it samples less.",
      ],
    },
    {
      q: "NIFTY has not ticked for 4 minutes at 11:00 while GOLD ticks every second on the same socket. Which monitoring would have caught this?",
      options: [
        "A socket-level timer that fires if no message arrives for 60 seconds",
        "An alert on how many times the socket reconnected today",
        "A check that the broker acknowledged the NIFTY subscription",
        "A last-tick clock per symbol, judged only while that symbol's exchange is open",
      ],
      answer: 3,
      why: "The socket stays fresh because of GOLD, and the subscription was acknowledged long ago. Only a clock per symbol sees NIFTY go quiet. Gating by exchange hours stops false alarms for MCX symbols after NSE closes.",
      difficulty: "judge",
      distractors: [
        "It catches a dead socket, but GOLD keeps resetting the timer, so it never fires for NIFTY.",
        "The socket never reconnected here. Reconnect counts say nothing about one quiet symbol.",
        "An acknowledgement only proves the request was accepted. Traed has seen acknowledged subscriptions that never produced ticks.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-feed-ingestion-shared-socket",
      scenario:
        "Your engine runs five strategies on one server for one user: two on NIFTY options, two on crude, one on silver. A live position is open. The broker allows three WebSocket connections per API key. Strategies start and stop during the day. How should they receive ticks?",
      options: [
        {
          label: "Each strategy opens its own socket",
          appeal: "Strong isolation: one strategy's bad handler or reconnect cannot touch another.",
        },
        {
          label: "One shared socket, with counted handles that filter ticks by each strategy's own symbols",
          appeal: "Stays inside the connection cap and lets a stopping strategy release exactly its own symbols.",
        },
        {
          label: "Keep the serverless relay as the only tick source",
          appeal: "Already built, shared with dashboards, and needs no credentials in the engine.",
        },
        {
          label: "Poll REST quotes once a second for each symbol",
          appeal: "No long-lived connection to manage and no reconnect logic at all.",
        },
      ],
      best: 1,
      verdict:
        "Five sockets would exceed the broker's cap at the fourth strategy. The relay shares its delivery path with browser tabs, which already blinded live strategies once. Polling adds rate-limit pressure and misses moves between polls. One shared socket with counted handles fits the cap, and filtering by symbol keeps strategies apart.",
      claims: [
        {
          text: "You accept that all strategies now depend on one connection and one reconnect path.",
          axis: "trade",
          correct: true,
          note: "True. Sharing removes isolation between strategies at the transport level, which is why the handler needs a careful single watchdog.",
        },
        {
          text: "You gain the ability to release exactly one strategy's symbols when it stops, without touching the others.",
          axis: "trade",
          correct: true,
          note: "True. Counting how many handles want each symbol means the wire is only unsubscribed when the last interested handle leaves.",
        },
        {
          text: "Separate sockets would give each strategy a faster feed than a shared one.",
          axis: "trade",
          correct: false,
          note: "False. All ticks come from the same broker either way; speed is the same, and the only difference is the cap you would hit.",
        },
        {
          text: "If handles do not filter by their own symbols, a strategy can act on another strategy's instrument.",
          axis: "failure",
          correct: true,
          note: "True. Without a per-handle filter on the shared socket, a silver strategy once mirrored a crude trade because it processed every symbol's ticks.",
        },
        {
          text: "A failed subscribe that is still counted by one handle can cause another handle's symbol to be dropped later.",
          axis: "failure",
          correct: false,
          note: "False as stated: the counts are rolled back on failure for exactly this reason. Recording a symbol the handle never really held is the bug to avoid.",
        },
        {
          text: "You should track the number of open sockets and the time since the last tick for each symbol.",
          axis: "measure",
          correct: true,
          note: "True. The socket count shows the cap is respected; the per-symbol clock shows a quiet instrument the socket-level view cannot.",
        },
        {
          text: "The total ticks per second on the shared socket is enough to show every strategy is being fed.",
          axis: "measure",
          correct: false,
          note: "False. A busy symbol keeps the total high while another strategy's symbol is silent, which is exactly the failure a per-symbol clock exists to catch.",
        },
      ],
    },
    {
      id: "sd-feed-ingestion-platform-feed",
      scenario:
        "A broker-style platform has 50,000 retail users, each watching about 30 symbols out of 2,000 instruments. The upstream data vendor allows a small fixed number of connections per key and charges per instrument subscribed. Updates must reach users within about a second. How do you ingest?",
      options: [
        {
          label: "Each user's browser connects upstream to the vendor with the platform's key",
          appeal: "No servers to run and the lowest possible delay.",
        },
        {
          label: "The server polls the vendor's REST quote API once a second for each user's watchlist",
          appeal: "Simple to build and easy to reason about, with no persistent connections.",
        },
        {
          label: "A small set of feed handlers hold the upstream sockets for the union of instruments, normalise once, and publish to a fan-out tier",
          appeal: "Upstream cost grows with instruments, not with users, and decoding happens once.",
        },
        {
          label: "One process holds the upstream socket and also all 50,000 user sockets",
          appeal: "Fewest moving parts and no network hop between ingest and delivery.",
        },
      ],
      best: 2,
      verdict:
        "The vendor's connection cap rules out per-user upstream sockets. Polling per user multiplies requests by 50,000. A single process for both jobs ties ingest reliability to delivery load. Ingesting the union of 2,000 instruments once, then publishing, keeps upstream cost tied to instruments, not users.",
      claims: [
        {
          text: "Upstream connections and subscription charges depend on the 2,000 instruments, not on the 50,000 users.",
          axis: "trade",
          correct: true,
          note: "True. The handler subscribes to the union of what anyone wants, once, so adding users changes only the fan-out tier.",
        },
        {
          text: "You add a hop between ingest and delivery, which adds a little latency and one more component to keep alive.",
          axis: "trade",
          correct: true,
          note: "True. The extra tier is the price of decoupling; within a one-second target the added delay is small.",
        },
        {
          text: "Decoding the binary frames once at the handler is cheaper than every user decoding their own copy.",
          axis: "trade",
          correct: false,
          note: "False framing: users in this design never see raw frames at all. The saving is real, but it is the handler decoding once, not users decoding copies.",
        },
        {
          text: "If one feed handler dies, the instruments it owned go silent for all users until it reconnects or is replaced.",
          axis: "failure",
          correct: true,
          note: "True. This is the shared fate of the design, which is why handlers need silence detection and a replacement path.",
        },
        {
          text: "Per-symbol silence detection becomes unnecessary because the fan-out tier will notice a stalled instrument.",
          axis: "failure",
          correct: false,
          note: "False. The fan-out tier only forwards what it receives. A quiet instrument produces no messages, so the check belongs at the handler.",
        },
        {
          text: "Useful measures are time since last tick per instrument and the age of data at delivery.",
          axis: "measure",
          correct: true,
          note: "True. Together they separate a feed problem from a delivery problem and show whether the one-second target is met.",
        },
        {
          text: "The number of connected users is the best signal that ingestion is healthy.",
          axis: "measure",
          correct: false,
          note: "False. Users can stay connected to a fan-out tier that is serving stale data. Health lives in tick age.",
        },
      ],
    },
    {
      id: "sd-feed-ingestion-two-names",
      scenario:
        "Two stored strategies watch `CRUDEOIL` and `CRUDEOIL1!`. Both resolve to the same front-month future and therefore the same token. The backtester already reads `CRUDEOIL1!` from its own table, saved strategies hold the strings, and each strategy keeps its own feed-health clock by string. Strategy 259 on the second name got no ticks all day. How should the handler change?",
      options: [
        {
          label: "Emit one stamped copy of each tick for every name that maps to the token",
          appeal: "No stored strategy needs to change, and each name keeps its own feed-health clock.",
        },
        {
          label: "Rewrite every stored strategy to one canonical name and reject aliases at save time",
          appeal: "One name per instrument removes the ambiguity at its source.",
        },
        {
          label: "Keep stamping only the first name and tell users not to mix the two names",
          appeal: "No code change at all and no risk of duplicate processing.",
        },
        {
          label: "Make strategies subscribe by token number instead of by name",
          appeal: "Tokens are unambiguous, so aliases stop mattering.",
        },
      ],
      best: 0,
      verdict:
        "Stored strings, the backtester's table and per-string health clocks all depend on the names staying as they are. Delivering a copy per name fixes the failure at one place, the handler, without a data migration. The first name only would repeat the incident; canonical rewriting and token numbers would change every saved strategy and the backtest link.",
      claims: [
        {
          text: "You accept a little extra work per tick: one copy for each alias that shares the token.",
          axis: "trade",
          correct: true,
          note: "True. With two aliases the handler builds two dictionaries per tick. The cost is tiny against the failure it prevents.",
        },
        {
          text: "You keep every saved strategy and the backtester's table unchanged.",
          axis: "trade",
          correct: true,
          note: "True. The change is internal to the handler, so no migration is needed.",
        },
        {
          text: "Canonical names would be free because strategies hold the names only in a single column.",
          axis: "trade",
          correct: false,
          note: "False. Names appear in saved configs, chart keys, health clocks and the backtester's data. Rewriting them is a migration with its own risk.",
        },
        {
          text: "A strategy watching one alias alone would have worked, so the bug can hide until two aliases are used together.",
          axis: "failure",
          correct: true,
          note: "True. The incident write-up says exactly this: the failure needed two names sharing a token for the first time.",
        },
        {
          text: "Each strategy receives ticks for every alias, so it must filter out the aliases it did not ask for.",
          axis: "failure",
          correct: false,
          note: "False. Handles already filter on their own subscribed strings, and each copy is stamped with one alias, so non-matching copies are ignored.",
        },
        {
          text: "A repeated 'silent while the feed is alive' warning for one name is the signal to look for.",
          axis: "measure",
          correct: true,
          note: "True. Per-symbol health made the silence visible all day. The detection recipe starts from that warning.",
        },
        {
          text: "The socket reconnect count would have shown the problem.",
          axis: "measure",
          correct: false,
          note: "False. The socket was healthy and never reconnected for this reason; the dead path was a name, not a connection.",
        },
      ],
    },
  ],
};

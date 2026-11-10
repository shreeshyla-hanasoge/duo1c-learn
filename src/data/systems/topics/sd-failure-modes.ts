import type { Topic } from "../../types.ts";

export const sdFailureModes: Topic = {
  id: "sd-failure-modes",
  title: "Failure modes: fail open or fail closed",
  tier: 5,
  week: 9,
  depth: "deep",
  summary:
    "Every dependency will fail. Decide in advance, per dependency and per action, whether the system stops (fail closed) or carries on (fail open).",
  why: "Traed talks to a database, a cache, a broker, a tick feed and a messaging bot, and any of them can go down at 10:40 on a trading day. If you have not decided what each failure does, the code decides for you, usually by accident. Investors and engineers will ask what happens when X dies. This lesson gives you the vocabulary and a way to answer for each dependency, with real choices Traed already made.",
  learn: {
    intuition:
      "Think of the door on a shop at night. If the power fails, an electric lock can do one of two things. It can stay locked, so thieves cannot walk in, but anyone inside is trapped. Or it can unlock, so people can leave, but the shop is open to anyone. Neither is right everywhere. A bank vault door should stay locked. A cinema fire exit must open. The skill is not picking one rule for the whole building. It is asking, door by door, which is worse: letting someone in who should not be there, or keeping someone in who should be able to leave. A trading system has the same two kinds of door. Opening a new position is the vault: when you are unsure, keep it shut. Closing a position is the fire exit: when you are unsure, it must still open. And some doors, like a chart showing yesterday's news, should simply stay open whatever breaks.",
    mechanics: [
      {
        heading: "Write the dependency list before you write the failure plan",
        body: "A failure plan starts with a list: everything your process calls that it does not control. For the Traed engine that is MySQL, Redis, the broker's order and position APIs, the broker's tick WebSocket (with the AWS relay as fallback), and Laravel (which forwards alerts to Telegram). Each line gets two answers: what breaks if it is slow, and what breaks if it is gone. Slow is usually worse than gone, because slow ties up threads and loops while gone fails fast. Be honest about the ones you share: Traed's web app and engine use one MySQL schema (`docs/HLD.md`), so one database outage hits both. Seeing the list is half the work; most teams find a dependency nobody had thought about.",
      },
      {
        heading: "Fail closed or fail open: decide per action",
        body: "Fail closed means that when the system cannot confirm something is safe, it refuses. Fail open means it carries on. The test is the cost of being wrong in each direction. Blocking a new NIFTY short costs one missed trade. Letting it through with a broken loss-limit check could cost the day's whole loss budget. So entries fail closed. But the same system must let exits through: in `risk_breaker.py`, a tripped limit blocks new entries and states that exits are never blocked. The rule is about the action, not the component. One broken check can close one door and leave the other open.",
      },
      {
        heading: "Degrade gracefully: keep the core, shed the extras",
        body: "Graceful degradation means a failed helper costs you the helper and nothing else. Traed's live-order database writes run on a separate thread through a queue capped at 2,000 items (`live_persistence.py`). If MySQL stalls, the queue fills and the newest writes are dropped with a log line, because losing a record is better than the trading loop running out of memory. Telemetry is the same: its methods catch every error so a bug there cannot reach the order path. Broker reconciliation at start-up, if the broker cannot be queried, proceeds on the cache and says so. Each helper is allowed to fail; the loop that manages money is not.",
      },
      {
        heading: "Timeouts: the first defence, and limits on the blast radius",
        body: "A call with no timeout turns a slow dependency into a hung system. Traed's start-up shows why. Recovering active strategies reconnects each to the broker, and the code gives every strategy 30 seconds (`strategy_manager.py`) and runs them together, so one expired broker token cannot stall the rest. The engine's `/health` does not wait for broker connections at all, so a deploy is not declared failed because the broker is slow. The feed watchdog applies the same idea: a 60 second silence forces a reconnect, with back-off capped at 30 seconds, and it never gives up for good. Systemd is told `OOMPolicy=continue`, so a backtest worker killed for memory does not take the live engine with it.",
      },
      {
        heading: "Saying it about Traed",
        body: "We run on one server and we know it is a single point of failure. We accept that because we have one daily user and trade minute bars, and because a restart is fast and the state that matters is in MySQL and recovered from the broker. Per dependency we decided in advance. Entries fail closed, exits stay open. Deploys fail closed during market hours if we cannot tell whether a live strategy is running. Logging, telemetry and database mirrors fail open and must never touch the order path. The cost is that an outage of the server or MySQL stops us entirely. We would add a standby when a second user's money depends on uptime.",
      },
    ],
    complexityDerivation:
      "The invariant is that a failure must never make the system do something unsafe, and must never stop it doing the one safe thing it always needs: reducing risk. Fail-closed on entries protects the first half. Fail-open on exits protects the second. The argument for deciding per dependency rather than globally is cost: a fully fail-closed system turns every small outage into a full outage, including the ability to exit; a fully fail-open system turns every small outage into unchecked risk. The argument breaks in three places. When a check is wrong more often than the thing it protects against, closed becomes a self-inflicted outage. When a closed state has no way out, such as a block with no reset path, the operator will bypass it, and a bypass used often is no longer a control. And when two dependencies fail together, as when Redis and MySQL both lose state, each one's fallback assumed the other was fine. Redundancy fixes none of this unless the standby has its own failure modes designed too.",
    variants: [
      {
        name: "Fail closed",
        when: "The action could lose money or break a rule that cannot be undone: new entries, deploys during a live session, orders when the loss ledger cannot be read.",
        delta: "Refuse and retry. Costs availability and may block a good trade. Needs a visible reason and a defined way to reset.",
      },
      {
        name: "Fail open",
        when: "The component is observation or convenience: logging, telemetry, a Telegram message, a database mirror, a chart overlay.",
        delta: "Carry on without it and make the gap visible. Costs a missing record or alert, so something else must notice that the helper is down.",
      },
      {
        name: "Fail static or degraded",
        when: "A fresh answer is unavailable but a recent one is safe to use: cached instrument lists, the last known candle, a stored-history path.",
        delta: "Serve the stale copy and label it. Costs accuracy, so it needs an age limit beyond which it flips to closed.",
      },
    ],
    tradeoffs: [
      {
        vs: "A hot standby server",
        pick: "One server with fast restart and durable state, for now",
        because:
          "A second engine that can also place orders for the same broker account adds a new failure: two writers. For one daily user and minute bars, minutes of downtime cost less than that complexity. This reverses once downtime costs real money for several users.",
      },
      {
        vs: "Retry every failure automatically",
        pick: "Retry reads, but stop and alert on order writes whose outcome is unknown",
        because:
          "Retrying a timed-out order can place it twice. Reads are safe to repeat; an order with an unknown result must be checked against the broker, not resent.",
      },
      {
        vs: "One global fail-safe mode",
        pick: "Per-dependency, per-action rules written down",
        because:
          "A global rule is easy to state and wrong somewhere. A list costs an afternoon and tells you, and anyone you hire, what each outage does.",
      },
    ],
  },
  realWorld: [
    {
      system: "Knight Capital, 1 August 2012",
      kind: "industry",
      problem:
        "A US trading firm deployed new software to seven of its eight servers. The eighth still ran old code that sent unintended orders.",
      applied:
        "The SEC found the firm's pre-trade controls inadequate, so nothing outside the order code stopped the runaway flow. The firm lost about 440 million US dollars in roughly 45 minutes and had to be rescued. The lesson used in the industry is that controls must sit outside the strategy code, and must fail closed.",
      evidence:
        "US Securities and Exchange Commission order on Knight Capital Americas, October 2013 (public)",
      impact: "The loss was larger than the firm's capital buffer, so the firm did not survive as an independent company.",
    },
    {
      system: "NSE and BSE market-wide circuit breakers",
      kind: "industry",
      problem:
        "A very fast fall in the index can mean panic or a broken feed, and trading on it can do damage.",
      applied:
        "Indian exchanges halt trading across the market when the benchmark index moves 10, 15 or 20 percent from the previous close, for a pause whose length depends on the level and the time of day. It is a deliberate fail-closed: when prices may not be trusted, stop all of it and let people look.",
      evidence: "SEBI circular on market-wide circuit breakers; NSE circuit-breaker rules (public)",
      impact: "A halt costs liquidity for a while and protects participants from trading on bad information.",
    },
    {
      system: "Traed deploy guard: fails closed when it cannot tell",
      kind: "yours",
      problem:
        "A deploy restarts the strategy engine, which stops live evaluation and exit handling in the middle of a session.",
      applied:
        "The guard refuses to deploy when a session is open and a live strategy or live position exists. If the check itself errors during a session, it also refuses: the script comments that not knowing whether anything is live is not safe. The override is an explicit flag, and only the literal value 1 counts.",
      evidence: "deployment-scripts/lib/deploy-guard.sh; RUNBOOK.md section 2.6",
      impact: "A deploy can be delayed until after the close. A position is never knowingly left without management.",
    },
    {
      system: "Traed loss ledger: closed for entries, never for exits",
      kind: "yours",
      problem:
        "The daily loss gate used to live in memory and Redis, so a restart or a cache eviction could clear a tripped limit.",
      applied:
        "The trip is now written to MySQL. A live strategy with a loss limit whose ledger cannot be read keeps entries blocked and retries. A strategy with no limit trades as before and raises a warning. Exits are never blocked.",
      evidence: "strategy-engine/app/services/risk_breaker.py (module docstring)",
      impact: "A lost cache no longer silently lets a strategy that has used up its loss budget open new positions.",
    },
  ],
  insights: [
    {
      t: "Decide per action, not per system",
      d: "Entries fail closed and exits stay open. One broken check should close one door, not every door.",
    },
    {
      t: "Observation must not break action",
      d: "Logging, telemetry and database mirrors fail open, run off the trading loop, and drop their own writes before they hurt it.",
    },
    {
      t: "Slow is worse than gone",
      d: "A dependency that hangs ties up everything waiting on it. A timeout turns slow into gone, which you can plan for.",
    },
    {
      t: "A single point of failure is fine if you chose it",
      d: "One server is a defensible trade at one user. What matters is that you can say what it costs and when you would change it.",
    },
  ],
  pitfalls: [
    "Making everything fail closed to feel safe. The first time the check itself breaks you lose the ability to exit.",
    "Treating a missing result as a negative result. Not being able to read the ledger is not the same as the ledger saying you are within limits.",
    "Writing a failure plan only for dependencies you own. The broker, the exchange feed and your cloud provider fail on their own schedule.",
  ],
  quiz: [
    {
      q: "In system design, what does it mean when a component fails closed?",
      options: [
        "It keeps running on its last known good data until the dependency returns",
        "It shuts itself down completely and cannot be restarted without help",
        "When it cannot confirm an action is safe, it refuses the action",
        "It retries the failed call forever until it succeeds",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Fail closed means refuse on doubt. The cost is availability; the benefit is that an unchecked action never happens.",
      distractors: [
        "That describes failing static or degraded, which serves stale data. It is a different choice.",
        "Failing closed refuses one kind of action, not the whole process, and a refusing system can still serve other requests.",
        "",
        "Endless retry is a retry policy. It can hang a system and says nothing about whether the action is allowed meanwhile.",
      ],
    },
    {
      q: "Why is a timeout called the first defence against a failing dependency?",
      options: [
        "It turns a slow dependency into a clear failure, so waiting callers are released",
        "It makes the dependency recover faster because it then receives fewer requests",
        "It guarantees the request was never processed by the remote side",
        "It removes the need to make any fail-open or fail-closed decision",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Without a timeout a slow call can wait for ever and hold threads, loops and locks. A timeout gives you a failure to handle.",
      distractors: [
        "",
        "A timeout does not help the remote side; at best it stops you adding to its queue.",
        "After a timeout the remote side may well have processed the request. For orders that is exactly the danger.",
        "A timeout only creates the failure. You still have to decide what to do when it fires.",
      ],
    },
    {
      q: "At engine restart, a live NIFTY strategy has a daily loss limit but the MySQL risk ledger cannot be read. It holds an open position. What is the right behaviour?",
      options: [
        "Trade as normal and log a warning, since the ledger is only a record, not a control",
        "Block new entries and retry the ledger; keep exits and stops running",
        "Block everything including exits until the ledger is readable again and trusted",
        "Refuse to start the strategy at all, so that nothing can possibly go wrong",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Without the ledger you cannot know whether the loss budget is spent, so entries fail closed. The open position still needs its exits, so they stay open. Refusing to start would also skip restoring that position.",
      distractors: [
        "The ledger is the only thing that knows whether the day's loss limit is already spent, so trading blind defeats the control.",
        "",
        "Blocking exits leaves a live position unmanaged, which is the worst outcome available.",
        "A strategy that does not start skips position restore and broker checks, so the open position is orphaned.",
      ],
    },
    {
      q: "The engine's telemetry code throws an error while recording a tick. What should happen to the order path?",
      options: [
        "Pause orders until telemetry is repaired, so that no trade is made unobserved",
        "Retry the telemetry call up to five times inside the order path itself",
        "Log the error and fail the order, so that the bug is noticed quickly",
        "Nothing: telemetry catches its own errors, so orders never see them",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Telemetry is observation. It fails open and is isolated from action. A separate alert on telemetry staleness covers the gap.",
      distractors: [
        "This fails closed on a helper and trades safety of money for completeness of metrics. The cost of being blind for a minute is far lower.",
        "Retries inside the order path add latency to the one place that must stay fast.",
        "Failing orders because a metric could not be written lets a minor bug cause a real outage.",
        "",
      ],
    },
    {
      q: "It is 11:10 on a weekday. A deploy script runs its check for live strategies, and the check itself crashes with an unexpected error. What should the script do?",
      options: [
        "Proceed, because a crash is not proof that anything is live",
        "Wait for the NSE close automatically and then proceed",
        "Block the deploy and report why, since not knowing is not the same as safe",
        "Proceed only if the last deploy was more than a day ago",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The cost of a wrong deploy is a restart that kills evaluation of a live position. The cost of waiting is a delayed release. When the check cannot answer, the safe default is to block, with an explicit override for the operator.",
      distractors: [
        "Absence of evidence is not evidence of absence. This is how a check that fails open silently removes the protection.",
        "Auto-waiting hides the block and may deploy at an unexpected time. The operator should see it and choose.",
        "",
        "Age of the last deploy has no bearing on whether a position is open now.",
      ],
    },
    {
      q: "A read-only dashboard shows option-chain data plus a news panel. The news service starts timing out. What is the right behaviour?",
      options: [
        "Hide the news panel with a small notice and keep showing the chain",
        "Show an error page until news recovers, so users never see partial data",
        "Retry news in the page until it works, blocking the chain meanwhile",
        "Switch the whole dashboard off and alert the operator",
      ],
      answer: 0,
      difficulty: "apply",
      why: "News is an extra, not the core. Degrade gracefully: lose the panel, keep the chain, say what is missing.",
      distractors: [
        "",
        "Failing closed on an extra makes an outage out of an inconvenience.",
        "Blocking the core on the extra ties the dashboard's availability to the weakest dependency.",
        "Switching everything off is the same mistake in a louder form.",
      ],
    },
    {
      q: "A teammate proposes: make every dependency fail closed, to be safe. What is the strongest objection?",
      options: [
        "Fail closed is slower than fail open, so it hurts latency on every order",
        "It is impossible to implement fail closed for calls to external APIs",
        "Safety is already guaranteed by the broker, so the engine need not decide anything",
        "Minor outages become full outages, including losing the ability to exit",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Safety is per action. Closing every door removes the fire exit along with the vault. The right design closes the doors that protect against loss and keeps open the ones that reduce risk.",
      distractors: [
        "Refusing is not slower than proceeding. The cost is availability, not speed.",
        "You can fail closed on any call by treating an error or timeout as a refusal.",
        "The broker does not know your strategy's loss budget or your intended exits. Your engine owns those rules.",
        "",
      ],
    },
    {
      q: "A founder says: we run on one server, so before launch we must add a hot standby with automatic failover. For one daily user trading minute bars, what is the best judgement?",
      options: [
        "Agree: any single point of failure is unacceptable in a financial system",
        "Hold off: a standby adds failures of its own, like two engines both sending orders",
        "Agree, but run two engines in parallel so that neither one sits idle",
        "Hold off: failures are rare enough that recovery does not need any design",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A standby is not free: it creates split-brain risk and more to test. With one user and minute bars, fast restart plus durable state buys most of the safety. The decision changes when downtime has a price several people pay.",
      distractors: [
        "Even large firms accept single points of failure where the cost of removing them is higher than the risk. The skill is choosing knowingly.",
        "",
        "Two live engines on one broker account is the double-order failure you are trying to avoid.",
        "Rare is not never, and recovery after a crash is exactly where unplanned behaviour appears. Plan it, do not skip it.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-failure-modes-ledger",
      scenario:
        "Traed's engine restarts at 11:20 on an NSE trading day after a deploy. One live strategy has a daily loss limit of ₹5,000 and holds a short position of 65 NIFTY option units opened at 10:05. On start it cannot read the MySQL table that records today's realised loss; the database is reachable but slow. The strategy trades alone on one server and the owner is the only user. What should the strategy do?",
      options: [
        {
          label: "Trade as before and log a warning",
          appeal: "Nothing is lost if the day's loss was small, and a database hiccup should not stop a strategy.",
        },
        {
          label: "Block new entries, keep exits and stops running on the open position, and retry the ledger read",
          appeal: "Protects the loss budget without leaving the open position unmanaged.",
        },
        {
          label: "Block everything, including exits, until the ledger loads",
          appeal: "The most cautious reading of 'we cannot trust our state'.",
        },
        {
          label: "Refuse to start the strategy until the database is healthy",
          appeal: "Simple to reason about: either all checks work or nothing runs.",
        },
      ],
      best: 1,
      verdict:
        "The constraint that decides it is the open 65-unit short. Entries are where the loss budget can be breached, so they fail closed while the ledger is unknown. Exits reduce risk and the position needs them now, so they stay open. Refusing to start would skip restoring the position from Redis and the durable table and would skip the broker reconciliation, leaving a live short with nobody managing it.",
      claims: [
        {
          text: "You accept possibly missing a good entry while the ledger is unreadable, in exchange for never entering on an unknown loss budget.",
          axis: "trade",
          correct: true,
          note: "The price of failing closed is one missed trade, which is small next to a breached loss limit.",
        },
        {
          text: "Because the ledger is only a record, nothing is lost by treating an unreadable ledger as 'zero loss so far'.",
          axis: "trade",
          correct: false,
          note: "The ledger is the control, not a log. Treating missing as zero makes the control disappear exactly when it fails.",
        },
        {
          text: "Blocking exits as well would be the safest choice because every action is paused until state is trusted.",
          axis: "trade",
          correct: false,
          note: "It looks cautious but removes the only action that reduces risk on an open position.",
        },
        {
          text: "If the retry never succeeds, entries stay blocked all day and nothing tells the owner.",
          axis: "failure",
          correct: true,
          note: "A fail-closed state with no visible signal looks like a quiet day. The block needs an alert and a raised flag so someone investigates.",
        },
        {
          text: "Refusing to start the strategy would orphan the open position, since restoring positions and checking the broker happen during start.",
          axis: "failure",
          correct: true,
          note: "A strategy that never starts cannot rehydrate or reconcile. This is the shape of an earlier real incident where a restart left a position unmanaged.",
        },
        {
          text: "Watch how long the ledger stays unreadable and whether an alert fired for the blocked entries.",
          axis: "measure",
          correct: true,
          note: "Both are direct signals: duration tells you whether this is a blip or a real outage, and the alert tells you whether the block was seen.",
        },
        {
          text: "Count how many trades were lost to the block as the main success measure.",
          axis: "measure",
          correct: false,
          note: "Missed trades are an accepted cost, not the goal. The measure of success is no breach of the limit and a quick, visible recovery.",
        },
      ],
    },
    {
      id: "sd-failure-modes-margin-check",
      scenario:
        "A broker platform serves 400,000 retail clients in India. Every order passes a margin-check service before it goes to the exchange. During a volatile 09:20 opening, the margin service starts timing out at 300 ms for about 2 percent of calls. A client with an open short options position tries to close it, and another tries to open a new one. What should the platform do for orders whose margin check times out?",
      options: [
        {
          label: "Let all orders through and rely on the exchange's own checks",
          appeal: "Keeps the platform available at the open, when clients most want to trade.",
        },
        {
          label: "Reject all orders whose check timed out",
          appeal: "No order ever goes out without a margin check.",
        },
        {
          label: "Reject new risk-adding orders that time out; let risk-reducing orders through, and retry the check on a short delay",
          appeal: "Splits the decision by what the order does to the client's exposure.",
        },
        {
          label: "Queue every timed-out order for five minutes and process in arrival order",
          appeal: "Fair and avoids a decision, since the service probably recovers.",
        },
      ],
      best: 2,
      verdict:
        "At this scale a 2 percent failure rate is thousands of orders. Rejecting all would trap clients in positions they want to close. Letting all through would let under-margined clients add risk the platform must cover. The order's effect on exposure decides: closing reduces risk and can pass, opening adds risk and should wait for a check. Queuing for five minutes during a fast market makes both kinds stale.",
      claims: [
        {
          text: "Letting risk-reducing orders through accepts a small chance of an order that margin rules would have flagged, to avoid trapping a client in a position.",
          axis: "trade",
          correct: true,
          note: "A close lowers exposure in nearly all cases, so the downside of skipping the check is small and the downside of blocking it is large.",
        },
        {
          text: "Rejecting all timed-out orders is the neutral choice because it treats every client equally.",
          axis: "trade",
          correct: false,
          note: "Equal treatment of unequal actions is not neutral. It penalises exactly the clients trying to reduce risk.",
        },
        {
          text: "Classifying an order as risk-reducing needs reliable position data, and if that lookup also fails the order can be misclassified.",
          axis: "failure",
          correct: true,
          note: "The rule depends on another dependency. When the position service is also down, the safe default is to treat the order as risk-adding.",
        },
        {
          text: "If timed-out calls are retried instantly by every client app, the margin service gets more load and may fail further.",
          axis: "failure",
          correct: true,
          note: "A retry storm turns a partial slowdown into a full outage. Retries need jitter and a cap, and ideally a client-side limit.",
        },
        {
          text: "Failing open on all orders is safe because the exchange will reject any order that breaks its own limits.",
          axis: "failure",
          correct: false,
          note: "The exchange does not know the broker's client-level margin, and the broker carries that risk.",
        },
        {
          text: "Track the timeout rate by order type, plus how many through-orders later turned out to be under-margined.",
          axis: "measure",
          correct: true,
          note: "The second figure is the real price of failing open for closes. Without it the policy is a guess.",
        },
        {
          text: "The average margin-check latency is enough to judge whether the policy works.",
          axis: "measure",
          correct: false,
          note: "An average hides a tail of 300 ms timeouts affecting 2 percent of calls. The tail (p99) and the failure rate are what matter.",
        },
      ],
    },
    {
      id: "sd-failure-modes-alerts",
      scenario:
        "Traed forwards fills to Telegram through Laravel: the engine hands a message to Laravel, which calls the Telegram Bot API. One afternoon the Telegram API starts timing out after 10 seconds per call. The engine is mid-session with two paper strategies and one live strategy, all on one server. How should the engine treat a message that cannot be delivered?",
      options: [
        {
          label: "Keep trading; log the failed delivery and retry later without blocking the engine",
          appeal: "Notifications are an extra. The engine's job is evaluation and orders.",
        },
        {
          label: "Pause new entries until alerts can be delivered",
          appeal: "If the owner cannot be told about fills, they cannot supervise.",
        },
        {
          label: "Stop all strategies and wait for Telegram to return",
          appeal: "A system the owner cannot hear should not be left unattended.",
        },
        {
          label: "Wait up to 10 seconds for each message before continuing the order flow",
          appeal: "Ensures that each fill is announced in the order it happened.",
        },
      ],
      best: 0,
      verdict:
        "A message channel is observation, so it fails open and must not sit in the order path. A 10-second wait per call would be added to the loop that evaluates positions and places exits. Pausing or stopping would turn a chat outage into a trading outage, and would leave a live position without exits. The gap is real, so a second signal not carried by Telegram should say that alerts are failing.",
      claims: [
        {
          text: "You accept that the owner may not hear about a fill in real time, in exchange for keeping evaluation and exits unaffected.",
          axis: "trade",
          correct: true,
          note: "The trade is visibility for continuity. The fill is still recorded in the order and trade tables.",
        },
        {
          text: "Pausing entries until alerts work is a cheap way to be safe at no cost.",
          axis: "trade",
          correct: false,
          note: "It costs real trades to protect against the loss of a notification, which is not itself a risk to money.",
        },
        {
          text: "A blocking send that waits 10 seconds inside the evaluation loop delays every strategy on the same single process.",
          axis: "failure",
          correct: true,
          note: "Traed's engine runs live and paper execution on one event loop, so a slow call there stalls all of them. Sends must be off the loop or fire-and-forget.",
        },
        {
          text: "If the alert path fails silently, the owner may assume a quiet session means no fills.",
          axis: "failure",
          correct: true,
          note: "Silence from a broken channel looks like good news. The channel's own health needs a separate check, such as a heartbeat or a visible failure count.",
        },
        {
          text: "Because the messages are dropped, the data is lost for good.",
          axis: "failure",
          correct: false,
          note: "The fills are written to the database and Redis separately. Only the notification is missing and can be rebuilt from those records.",
        },
        {
          text: "Count failed deliveries per hour and the age of the oldest undelivered message.",
          axis: "measure",
          correct: true,
          note: "Together they say whether this is a blip or an outage and how stale the owner's picture has become.",
        },
        {
          text: "Measure success by whether every fill message arrived in strict order.",
          axis: "measure",
          correct: false,
          note: "Strict order is not the aim. Timely and honest delivery is, with a clear signal when it is not happening.",
        },
      ],
    },
  ],
};

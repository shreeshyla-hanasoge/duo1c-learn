import type { Topic } from "../../types.ts";

export const sdObservability: Topic = {
  id: "sd-observability",
  title: "Observability: logs, metrics and alerts",
  tier: 7,
  week: 14,
  depth: "deep",
  summary:
    "Logs say what happened, metrics say how much, alerts say look now. Alert on symptoms a user would feel, with thresholds that can fire at your scale.",
  why: "Traed once showed a healthy engine while the tick feed was dead, and a real degradation sat unseen for over an hour because the poller that was meant to check it never ran. The founder is the only operator, so every alert either saves a position or wastes attention. This lesson gives you the vocabulary for what to record, what to page on, and why Traed's alarm lives inside the process it watches.",
  learn: {
    intuition:
      "Think of a car. The dashboard shows a few numbers you glance at: speed, fuel, temperature. That is metrics. A warning light comes on only when something needs you now: that is an alert. And the garage keeps a full service record of every repair and fault code: that is logs. You would not want the warning light to come on whenever the engine is merely warm, or to flash every second once it has come on. You would not want to read the service record while driving. And you would be unhappy if the fuel gauge itself were broken and read full. Observability is choosing the few numbers worth watching, the very few conditions worth interrupting you for, and the detailed record you search afterwards. For one operator, the first two lists must be short.",
    mechanics: [
      {
        heading: "Logs, metrics and traces: what each is for and what it costs",
        body: "A log is one event with detail: an order was rejected, and why. A metric is a number over time, such as ticks received per minute, cheap to store and to chart. A trace follows one thing across steps, for example one order from signal to fill with its delay. Cost differs. Logs cost per event, so a log line inside the tick path, thousands a minute, is a mistake. Metrics cost per distinct label combination: Traed's telemetry keeps rejection counts for at most 50 distinct reasons and folds the rest into `(other)`, so an unexpected message cannot grow memory without limit. Traed also keeps the last 100 order traces, with latency in milliseconds.",
      },
      {
        heading: "Alert on symptoms, and know that up is not the same as healthy",
        body: "A symptom is something the user, or the money, would feel: no ticks arriving, no strategy evaluating, orders being rejected. A cause is a guess about why: high CPU, a full disk. Symptom alerts catch problems you did not predict; cause alerts catch only the ones you did. Traed's `/health` returns `ok` as long as the process answers, which is liveness. During a feed stall it kept saying `ok` while ticks had stopped. So the ops report flags `FEED_SILENT_IN_SESSION` when a symbol whose session is open has had no tick for 120 seconds, and `EVALS_STALLED` when a running strategy misses its bar. Health means the work is happening.",
      },
      {
        heading: "Thresholds must fire at your scale, and know the calendar",
        body: "A rule like error rate above 5 percent cannot fire for a platform that places a handful of orders a day: one rejection is 20 percent or 100 percent. Traed uses counts and ages instead: three rejections in an hour with the same reason, a symbol silent for 120 seconds. The calendar matters as much. The feed disconnects after the NSE close at 15:30 to save cost, so silence then is normal, and MCX symbols stay live into the evening. Rules therefore check each symbol's own session. A strategy on one-hour bars is legitimately quiet for an hour, so its stalled threshold is the expected interval plus 300 seconds, never below 900.",
      },
      {
        heading: "Keep alerts few, and watch the watcher",
        body: "An alert that repeats every minute teaches you to mute the channel. Traed's engine alerts on a state change: a code alerts when it appears, repeats by default at most every 30 minutes while it stays, and sends a resolved notice when it clears. The firing set is kept in Redis, so a deploy neither re-alerts nor forgets. A send that failed is not counted as sent. The alarm runs inside the engine, because an external poller that stops polling is silent in exactly the way a dead engine is. So the engine also writes a heartbeat every 30 seconds, and Laravel alerts the owners of live strategies if it goes stale for 180 seconds.",
      },
      {
        heading: "Saying it about Traed",
        body: "We have one operator, so we alert on a short list of symptoms rather than on every resource number. The engine counts ticks, evaluations and rejections in memory at constant cost and publishes one snapshot to Redis every two seconds, and a rule layer turns that into flags such as a silent feed or a stalled strategy. Alerts go to Telegram on state change only, with a resolved message. We deliberately have no metrics server or dashboards stack yet, so history is short and answers come from logs. We would add Prometheus-style storage when we need weeks of trends or more than one operator.",
      },
    ],
    complexityDerivation:
      "The invariant is that the operator learns about a problem that matters before the money does, and is not trained to ignore the channel that tells them. Symptom alerts protect the first half, because they are tied to outcomes, not to guesses about causes. State-change alerts with a repeat interval protect the second half, because the number of messages follows the number of problems rather than the number of minutes. The argument holds while there are few symptoms, each has a threshold that can actually be crossed at your volume, and the alarm is independent enough of what it watches to survive its failure. It breaks when volume is so low that a rule never fires, when the calendar changes the meaning of silence, or when the alarm shares the failure it should detect, such as a monitor running on the same box as the engine. It becomes the wrong tool at larger scale, where you need history, comparison across hosts, and ownership by team, and a hand-built snapshot is no longer enough.",
    variants: [
      {
        name: "In-process snapshot with chat alerts",
        when: "One operator, one engine, a handful of strategies. Traed's choice.",
        delta: "Cheap and immediate, and the alarm runs where the data is. Short history, no ad-hoc queries, and a dead process needs a separate dead-man signal.",
      },
      {
        name: "Metrics server and dashboards",
        when: "Several services or hosts, a team on call, and a need for weeks of history. Prometheus with Grafana is the common public example.",
        delta: "Scraped time series, queries, graphs and routed alerts. Cost grows with distinct label combinations, so labels must be bounded.",
      },
      {
        name: "Distributed tracing",
        when: "A request crosses many services and you need to see where the time went. OpenTelemetry is the open standard.",
        delta: "Follows one request across hops. Needs instrumentation in every service and sampling to control volume. Traed's single-process order trace is a small version.",
      },
    ],
    tradeoffs: [
      {
        vs: "Alert every minute while the condition holds",
        pick: "Alert on change, repeat rarely, announce the recovery",
        because:
          "A message every minute during a two hour feed outage buries the one new problem that arrives in hour two. A change-based alert keeps each message meaningful and a resolved notice closes the loop.",
      },
      {
        vs: "An external service that polls the engine",
        pick: "An alarm inside the engine plus a heartbeat watched from outside",
        because:
          "The poller was meant to run hourly and never did. The inside alarm cannot be forgotten, and the heartbeat covers the case where the engine itself is gone.",
      },
      {
        vs: "Percentage thresholds",
        pick: "Counts and ages at low volume",
        because:
          "With a few orders a day a percentage jumps from 0 to 100 on one event. A count of three in an hour, or a silence of 120 seconds, is meaningful and can fire.",
      },
    ],
  },
  realWorld: [
    {
      system: "Google SRE: alert on symptoms, and the four golden signals",
      kind: "industry",
      problem:
        "Teams page on dozens of resource numbers, most of which do not matter to users, and burn out.",
      applied:
        "The Site Reliability Engineering book advises paging on symptoms the user would feel and keeping cause-level numbers for diagnosis. It names four signals to watch for any service: latency, traffic, errors and saturation.",
      evidence: "Site Reliability Engineering (Google), chapter on monitoring distributed systems (public)",
      impact: "Fewer, more meaningful pages, and a clearer separation between waking someone and helping them debug.",
    },
    {
      system: "Prometheus label cardinality",
      kind: "industry",
      problem:
        "Every distinct combination of label values is a separate time series, so a label such as user id or order id multiplies storage and slows queries.",
      applied:
        "The Prometheus documentation tells users to keep label values bounded and not to put unbounded identifiers in labels. Per-user detail belongs in logs or traces, and metrics stay aggregated.",
      evidence: "Prometheus documentation: instrumentation best practices and labels (public)",
      impact: "Metrics stay cheap to store and fast to query, and per-entity questions go to the right tool.",
    },
    {
      system: "Traed: engine-native alerting on state changes",
      kind: "yours",
      problem:
        "An external agent was meant to poll the ops report hourly and never did. A degradation sat unseen for over an hour.",
      applied:
        "The engine now runs its own alert loop every 60 seconds over the same report the endpoint returns. A code alerts when it appears, repeats at most every 30 minutes, and sends a resolved notice. The firing set lives in Redis so a restart does not reset it, and state advances only after a successful send.",
      evidence: "strategy-engine/app/services/ops_alerting.py (module docstring)",
      impact: "The operator gets one message per problem and one when it clears, and the alarm cannot be forgotten by an outside poller.",
    },
    {
      system: "Traed: thresholds tuned to bar length and session",
      kind: "yours",
      problem:
        "A strategy on one-hour bars restarted at 18:14 IST was flagged as stalled at 18:29 and 18:59, though it was evaluating on its normal grid.",
      applied:
        "The stalled threshold is now one expected interval plus a 300 second grace, never below 900 seconds. The feed-silent flag applies to a symbol only while its own session is open, with 120 seconds as the limit. The report also counts three rejections per hour with the same reason as a spike.",
      evidence: "strategy-engine/app/api/api_v1/endpoints/ops.py",
      impact: "Alerts match what a minute-bar and an hour-bar strategy can legitimately do, so a page means something.",
    },
  ],
  algorithms: [
    {
      name: "Counter, gauge and histogram",
      role: "Three metric shapes that count events, show a current level and record a distribution, from which rates and percentiles are derived.",
    },
    {
      name: "Sliding-window rate",
      role: "Turns a running counter into a rate over the last few minutes, which is what a useful alert threshold is written against.",
      dsa: "sliding-window",
    },
    {
      name: "Count-min sketch for high-cardinality counts",
      role: "Counts many distinct labels in fixed memory with a small overcount, so metrics do not blow up when label values multiply.",
      dsa: "probabilistic",
    },
  ],
  insights: [
    {
      t: "Alive is not healthy",
      d: "A process that answers `/health` can be doing no work. Measure the work: ticks arriving, strategies evaluating, orders accepted.",
    },
    {
      t: "Alert on change, not on level",
      d: "One message when a problem starts, a reminder every so often, one when it clears. Repeating every minute teaches you to mute the channel.",
    },
    {
      t: "A threshold must be crossable",
      d: "At a few orders a day, a percentage rule never fires. Use counts and ages, and make them aware of sessions and bar lengths.",
    },
    {
      t: "Watch the watcher",
      d: "The alarm can fail too. A heartbeat with an expiry, checked from outside the process, catches the case where everything is silent because everything is dead.",
    },
  ],
  pitfalls: [
    "Paging on causes such as high CPU while nothing watches the outcome. You get woken for harmless spikes and still miss a stalled feed.",
    "Putting an unbounded value, such as an order id or user id, in a metric label. Storage and memory grow with every new value.",
    "Treating silence as good news. A quiet channel is only reassuring if something proves the alarm itself is running.",
  ],
  quiz: [
    {
      q: "Which statement best separates a metric from a log?",
      options: [
        "A log holds only numbers and a metric holds only free text, written by hand",
        "A metric is a number tracked over time; a log is one event with detail",
        "A metric can only be read by a machine and a log only by a person",
        "Metrics are kept for ever and logs are always deleted after a single day",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Metrics aggregate: ticks per minute, rejections per hour. Logs keep the detail of single events. Each has a different cost model and a different use.",
      distractors: [
        "It is the other way round: logs are text events, metrics are numbers.",
        "",
        "Both are read by people and tools alike. The difference is shape and cost.",
        "Retention is a policy choice for each. It does not define the types.",
      ],
    },
    {
      q: "What is a symptom-based alert?",
      options: [
        "An alert that fires whenever any server resource passes a limit that was set earlier",
        "An alert that fires only after a human has confirmed that the fault is real",
        "An alert whose text lists the most likely causes of an outage in order",
        "An alert on an outcome users or money would feel, such as no ticks arriving",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Symptom alerts tie to results. They catch faults you did not predict, while cause-based alerts catch only the ones you did.",
      distractors: [
        "That describes cause or resource alerts. A busy server may be perfectly healthy.",
        "A confirmation step would delay the very alert that should be immediate.",
        "Naming causes is diagnosis, not the choice of what to alert on.",
        "",
      ],
    },
    {
      q: "At 11:05 IST the engine's `/health` returns ok, but the last NIFTY tick arrived at 10:52. Which monitoring check would have caught this?",
      options: [
        "Seconds since the last tick per symbol, while its session is open",
        "A check that the `/health` endpoint returns HTTP 200, repeated once every minute",
        "A check that the free disk space on the server stays above twenty percent",
        "A daily summary email of all log lines that contain the word error in them",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A zombie feed leaves the process alive. Only a check on the work itself, ticks arriving, sees it, and the session condition prevents false alarms after the close.",
      distractors: [
        "",
        "That check was already passing. It measures liveness, which was never the problem.",
        "Disk space is unrelated to a stalled feed.",
        "A daily email arrives hours late and cannot catch an in-session stall.",
      ],
    },
    {
      q: "At 15:45 IST a NIFTY symbol has had no tick for 20 minutes, while an MCX crude oil symbol is ticking normally. What should the alert rules do?",
      options: [
        "Alert for both symbols at once, since any silence from a feed is suspicious",
        "Alert for neither symbol, because the market is closed for the day anyway",
        "Skip NIFTY, whose session has closed, and keep watching the open MCX symbol",
        "Alert for the NIFTY symbol only, because it is the larger of the two markets",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Silence has no fixed meaning. NSE closes at 15:30 and the feed disconnects by design, while MCX trades into the evening. The rule needs each symbol's own session.",
      distractors: [
        "That would page every day at the close for something normal, which trains the operator to ignore the channel.",
        "MCX is still open, so a silent MCX symbol would be missed.",
        "",
        "Size of the market has nothing to do with whether the session is open.",
      ],
    },
    {
      q: "A strategy runs on 1-hour candles and last evaluated at 10:15. It is now 10:50. Should a stalled-strategy alert fire?",
      options: [
        "Yes, because anything silent for more than fifteen minutes counts as stalled",
        "No: the next bar is due near 11:15; the limit is one interval plus grace",
        "Yes, because any gap longer than one minute between evaluations is an error",
        "No, but only because the time is still before noon on the trading day",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A strategy evaluates once per bar of its own timeframe. A fixed 15 minute limit wrongly paged an hour-bar strategy that was working to schedule. The limit is one interval plus a grace period.",
      distractors: [
        "That fixed limit is the bug the threshold was changed to fix.",
        "",
        "One minute applies to minute-bar strategies only. Applied to an hour-bar one it would page all day.",
        "Time of day is not the reason. The bar length is.",
      ],
    },
    {
      q: "You want a metric for rejected orders. A teammate wants to label it with the order id so every rejection can be found. What is the right design?",
      options: [
        "Agree: the more labels a metric carries, the better the observability of the system",
        "Label with the order id but keep only the most recent hour of the metric data",
        "Use the strategy id and the symbol and the order id together on every sample",
        "Label with a bounded reason, fold rare ones into other, and log the order id",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Every new label value is a new series, so unbounded ids grow memory without limit. Metrics answer how many and why; the log or trace answers which one.",
      distractors: [
        "Labels multiply series. An id that never repeats makes every point its own series.",
        "A shorter retention does not stop the series count from growing during that hour.",
        "Adding more labels worsens the multiplication, and order id is still unbounded.",
        "",
      ],
    },
    {
      q: "A teammate proposes making CPU above 80 percent for five minutes the main alert for the engine. What is the best response?",
      options: [
        "Keep CPU as a diagnostic, and page on outcomes such as a silent feed",
        "Accept: CPU is the best single indicator of whether the engine is healthy",
        "Lower the limit to 50 percent so that it catches problems a little earlier",
        "Alert on CPU and memory and disk together, so that the coverage is complete",
      ],
      answer: 0,
      difficulty: "judge",
      why: "High CPU is a cause candidate, and an engine can be at 5 percent CPU with a dead feed. Outcome alerts catch what matters and CPU helps explain it afterwards.",
      distractors: [
        "",
        "A zombie feed shows low CPU. The metric does not track whether work is happening.",
        "A lower threshold adds false alarms and still misses the dead-feed case.",
        "More cause metrics add noise and still do not observe the outcome.",
      ],
    },
    {
      q: "The engine has its own alert loop. Someone asks: who alerts us if the engine, and so the alert loop, is dead? What is the best answer?",
      options: [
        "Nobody needs to, because the alert loop inside the engine is reliable enough to trust",
        "Run a second copy of the alert loop inside the very same engine process as well",
        "An expiring heartbeat, watched by a separate process that alerts when stale",
        "Read through the logs by hand every morning before the market opens at 09:15",
      ],
      answer: 2,
      difficulty: "judge",
      why: "An alarm cannot report its own death. A heartbeat key that expires, watched from outside, turns silence into a signal. Traed writes one every 30 seconds and Laravel alerts when it is stale for 180.",
      distractors: [
        "Every process can die, including the one that watches the rest.",
        "A second loop in the same process dies with the first.",
        "",
        "Manual checks miss events during the day and rely on memory.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-observability-silent-feed",
      scenario:
        "Traed runs one live strategy on minute bars on one server. There is one operator, who has a phone and no pager service. At 11:00 on an NSE day the tick feed stalls but the engine process stays up, and its `/health` endpoint returns ok because it only checks that the process answers. A short position is open. You can build one alert. Which one do you build?",
      options: [
        {
          label: "Poll `/health` every minute and alert if it is not 200",
          appeal: "It exists already and is simple to explain.",
        },
        {
          label: "Alert when any symbol whose session is open has had no tick for 120 seconds, on state change only",
          appeal: "It measures the outcome directly and respects market hours.",
        },
        {
          label: "Alert when engine CPU or memory crosses a limit",
          appeal: "Resource limits are easy to collect and standard practice.",
        },
        {
          label: "Alert on any log line containing the word error",
          appeal: "Logs already exist, so there is nothing new to measure.",
        },
      ],
      best: 1,
      verdict:
        "The failure here leaves the process alive and healthy by the endpoint's definition, so a poll of `/health` passes straight through it. Resource limits say nothing about whether ticks are arriving, and an error-word filter fires on unrelated lines and misses a silent stall that logs nothing. Age of the last tick, restricted to open sessions and sent on change, measures what the position depends on and fits one operator on a phone.",
      claims: [
        {
          text: "You accept that a silent symbol outside its session is ignored, in exchange for no false alarms at the close.",
          axis: "trade",
          correct: true,
          note: "The session condition is the price of precision. Without it the alert would fire every day at 15:30.",
        },
        {
          text: "A `/health` poll costs nothing extra and is the more complete signal.",
          axis: "trade",
          correct: false,
          note: "It is cheap but blind to this failure. It reports that the process answers, not that work is happening.",
        },
        {
          text: "A symbol that is genuinely illiquid may go quiet for long stretches and trigger the alert without a real fault.",
          axis: "failure",
          correct: true,
          note: "Silence from a thin contract is not always a stall. The limit may need to be per instrument, or the rule compare with other symbols.",
        },
        {
          text: "If the alert loop lives in the engine and the engine dies, no alert is sent, so a separate heartbeat is also needed.",
          axis: "failure",
          correct: true,
          note: "The in-process alarm cannot report its own death. An expiring heartbeat checked from outside closes the gap.",
        },
        {
          text: "A tick-age alert cannot fire if the engine never received a first tick after starting.",
          axis: "failure",
          correct: false,
          note: "It can: with no tick ever seen, the age is counted from engine start, so a feed that never came up still triggers it.",
        },
        {
          text: "Track the time from the first silent second to the alert arriving, and how many alerts were false in a month.",
          axis: "measure",
          correct: true,
          note: "Detection delay and false-alarm count are the two numbers that say whether the alert is both fast and trusted.",
        },
        {
          text: "The number of alerts sent per day is the best quality measure.",
          axis: "measure",
          correct: false,
          note: "More alerts is not better. A good quiet day has none, and the measure is whether real problems are caught and false ones are rare.",
        },
      ],
    },
    {
      id: "sd-observability-cardinality",
      scenario:
        "An Indian broker platform runs 300 services and stores its metrics in a Prometheus-style system holding about 40 million active time series. An engineer adds a `client_id` label to the order-latency histogram so support can see any client's latency. The platform has 2 million clients and the histogram has 12 buckets. Storage and query time are already near the limit. What should the team do?",
      options: [
        {
          label: "Keep the label and buy more storage",
          appeal: "Support gets exactly what it asked for and nothing is redesigned.",
        },
        {
          label: "Sample 5 percent of clients into the label",
          appeal: "Cuts series by 95 percent while keeping some per-client view.",
        },
        {
          label: "Keep the label only for the largest accounts",
          appeal: "Large clients matter most, so cover them.",
        },
        {
          label: "Drop the label from the metric, keep bounded labels such as broker and order type, and answer per-client questions from logs or traces",
          appeal: "Metrics stay aggregated and per-entity detail goes where it is cheap.",
        },
      ],
      best: 3,
      verdict:
        "Two million clients times 12 buckets is about 24 million new series, which is more than half the system again. Storage can be bought once, but the series count grows with every client added. Sampling and top-account tricks leave a label whose size is still tied to client count and give a misleading picture. Per-client questions are lookups of individual events, which is what logs and traces are built for.",
      claims: [
        {
          text: "You give up one-click per-client charts in exchange for a metrics system whose size does not depend on the number of clients.",
          axis: "trade",
          correct: true,
          note: "The metrics keep their cost bounded, and the per-client view moves to a tool that scales with events instead of series.",
        },
        {
          text: "Buying storage is the cheapest fix because the cost is paid once.",
          axis: "trade",
          correct: false,
          note: "The series count grows with every new client, so the bill repeats. It also slows queries, not just storage.",
        },
        {
          text: "The label would add roughly 24 million series on top of about 40 million, enough to push an already strained system over.",
          axis: "failure",
          correct: true,
          note: "2 million clients times 12 buckets is 24 million. The multiplication of label values is the whole risk.",
        },
        {
          text: "Sampling 5 percent of clients gives a representative picture of every client's latency.",
          axis: "failure",
          correct: false,
          note: "It shows nothing about the 95 percent left out, and a client with a problem is likely to be among them.",
        },
        {
          text: "Logs and traces must be searchable by client id for the support workflow to work.",
          axis: "failure",
          correct: true,
          note: "Moving the question does not remove the need. If client id is not indexed in logs, support has traded one gap for another.",
        },
        {
          text: "Watch the active series count and ingestion rate, and alert when growth in a day exceeds a set percentage.",
          axis: "measure",
          correct: true,
          note: "Cardinality surprises show up as growth in series. A guard on that growth catches the next unbounded label before it hurts.",
        },
        {
          text: "The average order latency across clients tells you whether the change helped.",
          axis: "measure",
          correct: false,
          note: "The change is about cost and series count, not latency. The average also hides slow outliers.",
        },
      ],
    },
    {
      id: "sd-observability-alert-fatigue",
      scenario:
        "Traed's feed goes silent at 13:10 and stays down for two hours, then recovers. The engine's check runs every 60 seconds and finds the same fault each time. The operator has one Telegram channel and gets fills and exit messages there too. During the outage a second, different problem appears: an order is rejected for lack of funds. How should the alert system behave?",
      options: [
        {
          label: "Alert once when the fault appears, repeat at most every 30 minutes while it remains, and send a resolved message when it clears",
          appeal: "One message per problem, a periodic reminder, and a closing signal.",
        },
        {
          label: "Send an alert every minute until the operator acknowledges it",
          appeal: "Impossible to miss.",
        },
        {
          label: "Send only the first alert and nothing more until the next trading day",
          appeal: "Minimal noise on the channel.",
        },
        {
          label: "Mute the channel during market hours and read it after the close",
          appeal: "Avoids interruptions while trading.",
        },
      ],
      best: 0,
      verdict:
        "The deciding fact is that a second, different problem arrives mid-outage and must not be buried. A message every minute would put around 120 identical alerts in front of it. Sending only the first alert leaves no signal of how long the fault lasted or when it cleared. Muting during market hours silences the channel at exactly the time that fills and rejections matter. State-change alerts with a slow repeat keep each message meaningful.",
      claims: [
        {
          text: "You accept that the operator hears about an ongoing fault only every 30 minutes after the first message, in exchange for a quiet channel.",
          axis: "trade",
          correct: true,
          note: "The reminder interval is the trade. The first alert is immediate, so urgency is not lost.",
        },
        {
          text: "Sending every minute is safer because a missed message costs less than a repeated one.",
          axis: "trade",
          correct: false,
          note: "Repetition causes the missed message: the operator mutes the channel, and the second problem hides in the stream.",
        },
        {
          text: "If the alert's send fails and the system still records it as sent, the operator may never be told.",
          axis: "failure",
          correct: true,
          note: "State must advance only after a successful send. Otherwise a transient Telegram error turns into a permanent silence.",
        },
        {
          text: "If the engine restarts mid-outage and the firing state is kept only in memory, it will re-alert the problem the operator already knows about.",
          axis: "failure",
          correct: true,
          note: "Keeping the firing set in Redis means a restart neither repeats nor forgets what was already sent.",
        },
        {
          text: "A resolved message is unnecessary because the fills coming back prove the recovery.",
          axis: "failure",
          correct: false,
          note: "Fills depend on signals and may not arrive for hours. Without a resolved message the operator cannot tell a fixed fault from a quiet market.",
        },
        {
          text: "Record the time from first fault to alert, the number of messages per incident, and whether the second problem was acted on.",
          axis: "measure",
          correct: true,
          note: "Messages per incident shows if fatigue is building, and the second problem is the test of whether the design worked.",
        },
        {
          text: "The total number of messages sent per day is the number to minimise.",
          axis: "measure",
          correct: false,
          note: "Fewer messages is not the aim. Minimum is zero. The aim is that each real problem gets exactly the attention it needs.",
        },
      ],
    },
  ],
};

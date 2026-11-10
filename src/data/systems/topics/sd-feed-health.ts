import type { Topic } from "../../types.ts";

export const sdFeedHealth: Topic = {
  id: "sd-feed-health",
  title: "Feed health and staleness detection",
  tier: 7,
  week: 13,
  depth: "deep",
  summary:
    "A running process is not a healthy feed. Measure time since the last tick per instrument, only while its market is open, and alert without crying wolf.",
  why: "Every decision Traed makes depends on ticks arriving. In August 2026 the engine answered its health check while no strategy evaluated a candle for about ten minutes. In November a paper strategy was silent all day because two names shared one token. Both were feed-health failures that a simple 'is it up' check could not see. You need the language to explain what you measure, when you ignore silence, and how you avoid alert fatigue.",
  learn: {
    intuition:
      "Imagine a night watchman whose job is to listen for a radio. Checking that the watchman is awake tells you nothing about the radio. What matters is whether the radio has spoken recently. But the rule 'worry after one quiet minute' has traps. If the radio is meant to be silent at night, you must not wake anyone. If there are ten radios and nine are chattering, the noise hides the one that is dead. If the watchman raises the alarm every minute for the same fault, people stop listening. A good watchman keeps a stopwatch per radio, knows each radio's working hours, tries the easy fixes first, such as changing the channel, and calls for help only when those fail. When help is called once, and the problem ends, he says so. Feed health is that stopwatch discipline, written down.",
    mechanics: [
      {
        heading: "Liveness is not health",
        body: "Liveness asks whether the process is running. Health asks whether it is doing its job. Kubernetes separates these as liveness and readiness probes for the same reason. On 26 August 2026 the engine stayed up, yet for about ten minutes in market hours (14:58 to 15:08 IST) no strategy evaluated a candle. The relay between the broker and the engine had a stale registry. It was receiving broker ticks while holding no deliverable subscribers, and nothing noticed. A health check must test the outcome, here ticks arriving and strategies evaluating, not the existence of a process.",
      },
      {
        heading: "One clock per instrument, and the age of never",
        body: "A single 'last message on the socket' clock is fooled when one busy instrument keeps it fresh. On 23 September 2026 GOLD ticked while four other symbols were subscribed on sockets that delivered nothing. So Traed records a last-tick time per symbol. A symbol silent for 90 seconds while the socket is alive is resubscribed, and an operations flag fires after 120 seconds. A symbol that has never ticked has no age at all, which used to read as 'nothing to say'. Now the age of never is the engine's uptime, so a symbol that never ticked becomes silent once uptime passes the limit.",
      },
      {
        heading: "Silence is only a fault while the market is open",
        body: "After 15:30 an NSE feed is meant to be quiet. A guard that is global, 'any market open', once made every NSE feed look like a zombie from 15:30 to 23:30, while MCX was still trading. So session is judged per feed, using the exchange calendar and holidays. Nuances matter too: NSE's closing auction can silence the index from 15:15 while derivatives trade to 15:40. Likewise, a strategy on a 1-hour timeframe evaluates once an hour, so its stall limit is one interval plus a five-minute grace, never below 900 seconds. Expected silence must be encoded, or alerts become noise.",
      },
      {
        heading: "Heal first, then alert, without fatigue",
        body: "Order the response by cost. Resubscribing a silent symbol is cheap and idempotent. Reconnecting the whole socket uses a growing delay between attempts. Only what these cannot fix should reach a person. Then control the paging. Traed's alerter reports state changes, not levels: a code alerts when it appears, sends a resolved notice when it clears, and repeats at most every 30 minutes. A level alert every 60 seconds teaches the operator to mute the channel. The alarm also watches itself: if its loop stalls for five minutes, the report shows it.",
      },
      {
        heading: "Saying it about Traed",
        body: "We measure the outcome, not the process. Every subscribed symbol has its own last-tick clock, judged only while its own exchange is open, and a strategy that has gone one interval plus a grace period without evaluating raises its own flag. A watchdog resubscribes or reconnects first, and a person is paged once per condition, with a resolved notice. After the August 2026 outage the engine connects to Kite directly, so the relay cannot blind execution. The cost is fixed thresholds, not tuned per instrument, and one process doing both the work and part of the watching. We would add exchange sequence numbers for gap detection if we ever needed it.",
      },
    ],
    complexityDerivation:
      "A staleness detector rests on one inequality. The worst-case time to notice a dead feed is the silence threshold plus the polling interval. With a 90-second threshold and a 20-second watchdog loop, a dead symbol is noticed within about 110 seconds. That figure must stay below what you can afford to be blind for, which is set by money at risk per minute. The threshold also has a floor: it must exceed the longest silence the instrument shows when healthy, or the detector fires on normal behaviour. So the usable range is bounded above by risk and below by normal quiet, and it can be empty. A thinly traded contract may be quiet for longer than a safe limit, and then silence alone cannot separate a dead feed from a quiet market. The remedy is a signal that does not depend on trading: a source heartbeat, or a sequence number whose gap proves a missing message. The argument also fails if the watcher itself dies, because nothing then reports the silence. That is why the alerter is checked from outside its own loop.",
    variants: [
      {
        name: "Whole-feed watchdog",
        when: "Few instruments, all liquid, one connection. Simplest to build.",
        delta:
          "One last-message clock for the socket. It catches a dead connection, but one busy instrument can keep it fresh while the others are dead.",
      },
      {
        name: "Per-instrument staleness with session awareness",
        when: "Many instruments across more than one exchange, where each has its own hours.",
        delta:
          "A clock per symbol and a session flag per exchange. It finds one dead symbol among live ones, at the cost of per-symbol state and a calendar to maintain.",
      },
      {
        name: "Source heartbeats and sequence-number gaps",
        when: "Exchange or protocol feeds that number every message or send a heartbeat on a timer.",
        delta:
          "Detection does not depend on trading activity, so a quiet instrument is not mistaken for a dead one. It needs a feed that provides the numbers, and recovery means replaying the gap.",
      },
    ],
    tradeoffs: [
      {
        vs: "Short threshold versus long threshold",
        pick: "As short as normal quiet allows",
        because:
          "Detection delay is threshold plus poll interval, and blind minutes cost money. But a threshold under the instrument's normal quiet spells brings false alarms, which cost trust.",
      },
      {
        vs: "Alert on every failed check versus alert on state change",
        pick: "State change, with a slow repeat and a resolved notice",
        because:
          "The first condition is news. The sixtieth repeat is noise. The operator must still be able to trust that silence means health.",
      },
      {
        vs: "Auto-heal quietly versus always tell a human",
        pick: "Heal first, and record every heal as an event",
        because:
          "Quiet healing keeps the night calm, but a heal that keeps happening is a symptom. Count heals so that repetition becomes visible without paging for each one.",
      },
    ],
  },
  realWorld: [
    {
      system: "FIX session heartbeats",
      kind: "industry",
      problem:
        "A trading session over a long-lived connection can go quiet because nothing is happening, or because the other side is gone.",
      applied:
        "The FIX protocol has each side send a heartbeat message after an agreed interval of silence. If nothing arrives, the receiver sends a test request, and if that goes unanswered the session is treated as lost.",
      evidence: "FIX Trading Community: FIX session protocol (Heartbeat and TestRequest messages)",
      impact:
        "Silence becomes a measurable signal, because a healthy but idle link still produces a heartbeat.",
    },
    {
      system: "Kubernetes liveness and readiness probes",
      kind: "industry",
      problem:
        "A container can be running yet unable to serve, such as while loading data or after losing a dependency.",
      applied:
        "Kubernetes runs separate probes. A failed liveness probe restarts the container, while a failed readiness probe only removes it from the traffic. The two answer different questions.",
      evidence: "Kubernetes documentation: configure liveness, readiness and startup probes",
      impact:
        "A system avoids restarting something that is merely not ready, and avoids sending traffic to something that is only alive.",
    },
    {
      system: "Traed August 2026 feed outage and the move off the relay",
      kind: "yours",
      problem:
        "For about ten minutes in market hours no strategy evaluated a candle, while the engine reported itself up. The relay received ticks but held no deliverable subscribers.",
      applied:
        "The engine's own watchdog correctly saw the silence. The structural fix was for the engine to connect to Kite directly, to share one refcounted socket across strategies, and to run risk exits on a 20-second timer so a stop no longer depends on another instrument's feed.",
      evidence: "docs/postmortems/2026-08-26-tick-feed-outage.md",
      impact:
        "Relay failures can no longer blind execution, and the post-mortem records zero stale events after the cut-over that day.",
    },
    {
      system: "Traed per-symbol staleness, session guards and alert state",
      kind: "yours",
      problem:
        "A whole-socket clock missed one dead symbol among live ones, a global market-hours flag raised false zombie alerts, and level alerts would have trained the operator to mute the channel.",
      applied:
        "The direct ticker keeps a last-tick time per symbol and resubscribes after 90 seconds of silence. The operations report flags a silent symbol after 120 seconds and only while its own session is open. The alerter pages on state changes, repeats every 30 minutes, and sends a resolved notice.",
      evidence:
        "strategy-engine/app/services/data_processing/direct_kite_ticker.py; strategy-engine/app/api/api_v1/endpoints/ops.py; strategy-engine/app/services/ops_alerting.py; docs/incidents/2026-11-09-ticker-alias-silent-feed.md",
      impact:
        "The November alias bug paged correctly for a strategy that never received ticks, which pointed straight at the real fault.",
    },
  ],
  algorithms: [
    {
      name: "Last-seen timestamp per key",
      role: "Stores the time of the latest tick for each instrument, so staleness is a subtraction rather than a search.",
      dsa: "hashing",
    },
    {
      name: "Sliding-window rate estimate",
      role: "Counts ticks over a recent period to tell a normally quiet instrument from a dead one without false alarms.",
      dsa: "sliding-window",
    },
    {
      name: "Sequence-number gap detection",
      role: "Notices a missing number in an ordered stream, which exposes lost messages even when the connection looks healthy.",
    },
  ],
  insights: [
    {
      t: "Test the outcome, not the process",
      d: "A health check that only proves the process exists says nothing about ticks arriving. Measure ticks and evaluations.",
    },
    {
      t: "One clock per instrument",
      d: "A socket-wide clock is kept fresh by the busiest symbol. A per-symbol clock finds the one that died.",
    },
    {
      t: "Encode expected silence",
      d: "Judge session per exchange, respect holidays, and scale stall limits by each strategy's own cadence, or alerts turn into noise.",
    },
    {
      t: "Alert on change, heal first",
      d: "Cheap automatic repairs first, a page once when it appears, a notice when it clears. Repeats slowly, never every minute.",
    },
  ],
  pitfalls: [
    "Using one global 'market is open' flag for feeds on different exchanges. An NSE feed is meant to be silent at 15:35 while MCX still trades.",
    "Treating a symbol that has never ticked as 'no data, nothing to report'. It is the most dangerous kind of silence.",
    "Alerting on the level instead of the transition. The same page every minute teaches people to mute the channel.",
  ],
  quiz: [
    {
      q: "What is the difference between liveness and health for a data feed?",
      options: [
        "Liveness checks speed, and health checks accuracy of each tick",
        "They are two names for exactly the same underlying check",
        "Liveness is measured in seconds, and health is measured in days",
        "Liveness says the process runs, and health says it is doing its job",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A process can be alive and answering a health endpoint while no ticks arrive. Health must test the outcome, such as recent ticks and strategy evaluations.",
      distractors: [
        "Neither check is about tick accuracy. Both are about whether the feed is flowing.",
        "They are different on purpose. The August 2026 outage was an alive but unhealthy engine.",
        "The units are not what separates them. The difference is what each one tests.",
        "",
      ],
    },
    {
      q: "Why must a feed-silence detector know the market session?",
      options: [
        "Because ticks arrive much faster during the market session than outside",
        "Because silence after the close is normal and would raise false alarms",
        "Because the detector can use much less memory outside the session",
        "Because the broker rejects all connections outside the session hours",
      ],
      answer: 1,
      difficulty: "recall",
      why: "After the close, a quiet feed is correct. Without a session guard the detector fires every evening, and people learn to ignore it.",
      distractors: [
        "Tick rate does not change the logic. The point is when silence is a fault.",
        "",
        "Memory use is not the concern. False alarms are.",
        "Connection rules vary, but they are not why a detector needs a session guard.",
      ],
    },
    {
      q: "Six symbols are subscribed on one socket. GOLD ticks every second, but NIFTY has had no tick for 5 minutes. The socket's last-message age is 1 second. Which check catches it?",
      options: [
        "A lower threshold on the socket's last-message age",
        "A process-level health endpoint",
        "A last-tick time kept for each symbol",
        "A daily restart of the engine",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The socket clock is refreshed by GOLD, so no threshold on it can see NIFTY's silence. A per-symbol clock shows NIFTY at 300 seconds.",
      distractors: [
        "Lowering the threshold changes nothing while GOLD keeps the age at 1 second.",
        "The process is up and answering, which is exactly why this check is blind to it.",
        "",
        "A restart would hide the fault only until the next time it happens, and a daily one is far too slow.",
      ],
    },
    {
      q: "The engine restarts mid-session at 11:38. A symbol is subscribed on a socket that never delivers a tick. It has no last-tick time at all. What age should the detector use for it?",
      options: [
        "The time since the engine started",
        "Zero, since nothing is known about it",
        "The time since midnight",
        "Skip it until its first tick arrives",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Never having ticked is a kind of silence. Using uptime as the age lets the symbol be flagged once it has been quiet longer than the limit.",
      distractors: [
        "",
        "Zero reads as 'just heard from it', which hides the very fault you want to see.",
        "Midnight has no link to when the subscription began and would flag the symbol immediately.",
        "Skipping it means a symbol that never ticks is never reported, which is how a live strategy sat unwatched for hours.",
      ],
    },
    {
      q: "A strategy evaluates once an hour. It evaluated at 18:00 and it is now 18:20. The generic stall limit is 15 minutes. Should it be flagged as stalled?",
      options: [
        "Yes, because 20 minutes is already past the 15 minute limit",
        "No, the limit is one expected interval plus a small grace",
        "Yes, any strategy silent for over 10 minutes is broken",
        "No, strategies are never flagged during the evening",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A one-hour strategy is correctly silent for up to an hour. The stall limit scales with its cadence, with a grace period for fetch delays, so 18:20 is normal.",
      distractors: [
        "A fixed 15-minute limit would page a healthy hourly strategy, as happened to a crude oil strategy in October 2026.",
        "",
        "A fixed limit ignores cadence. The hourly strategy would be flagged all day.",
        "Evening sessions exist on MCX, so strategies there can genuinely stall and must be watched.",
      ],
    },
    {
      q: "At 15:40 IST on a weekday all NSE symbols are silent, while MCX crude is ticking. A detector uses one global flag, 'any market open'. What will it do, and what is the fix?",
      options: [
        "Stay quiet, because MCX is open; no change is needed",
        "Fire for MCX symbols, and the fix is to mute all alerts after 15:30",
        "Fire for every symbol, and the fix is a longer threshold",
        "Fire for NSE symbols wrongly, and the fix is a session flag per feed",
      ],
      answer: 3,
      difficulty: "apply",
      why: "With 'any market open' true, NSE silence looks like a fault for the whole evening. Each feed's silence should be judged against its own exchange's hours.",
      distractors: [
        "It does not stay quiet. The global flag is true, so the NSE feeds get judged and look dead.",
        "MCX symbols are ticking, so they are healthy. Muting all alerts would also blind the MCX session.",
        "A longer threshold only delays the false alarm, and weakens detection on real faults during the day.",
        "",
      ],
    },
    {
      q: "A flag fires every minute until the fault is fixed, and the on-call person has muted the channel. What change fixes the root problem?",
      options: [
        "Send the page through a much louder channel instead",
        "Page only after the fault has lasted a full hour",
        "Alert once on appearance, repeat slowly, send a resolved notice",
        "Give the page a different colour and a new icon",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Level-triggered alerts turn one event into a flood. State-change alerts keep each message meaningful, and a resolved notice closes the loop.",
      distractors: [
        "A louder channel makes the flood worse and people will mute that one too.",
        "Waiting an hour removes the early warning that detection exists to give.",
        "",
        "Cosmetic changes leave the repeated message count untouched.",
      ],
    },
    {
      q: "The watchdog already resubscribes silent symbols and reconnects dead sockets automatically. A colleague says human alerts are now unnecessary. What is the sound judgement?",
      options: [
        "Keep alerts for what healing cannot fix, and watch the watchdog too",
        "Agree, because the watchdog now covers every kind of failure",
        "Agree, but only for the NSE symbols and not for MCX",
        "Disagree, and page for every single heal as it happens",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Healing handles the cheap cases. A fault that persists, a heal that keeps repeating, or a dead watchdog still needs a human. Recording heals as events makes the repeats visible without paging each time.",
      distractors: [
        "",
        "A watchdog can fail or loop. In August 2026 the engine watchdog was right and the fault was elsewhere.",
        "The reasoning is the same for MCX symbols. Narrowing it to one exchange fixes nothing.",
        "Paging per heal creates the fatigue the design is meant to avoid.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-feed-health-one-dead-symbol",
      scenario:
        "An engine on one server holds a single Kite socket for six running strategies across NIFTY, GOLD and CRUDEOIL. After a mid-session restart, GOLD ticks normally but NIFTY and two others get nothing. The engine's watchdog only checks the age of the last message on the socket. A live NIFTY strategy then takes no trades for hours. There is one operator, who is not watching the logs. What should the detector track?",
      options: [
        {
          label: "Lower the socket-level stale threshold from 60 to 20 seconds",
          appeal:
            "A tighter limit looks like faster detection for any dead feed.",
        },
        {
          label: "A last-tick clock per subscribed symbol, judged only while its exchange is open, with a resubscribe on silence",
          appeal:
            "Finds a single dead symbol among live ones and tries the cheapest repair first.",
        },
        {
          label: "Restart the engine every hour during market hours",
          appeal:
            "Resets every connection regularly and needs no new detection logic.",
        },
        {
          label: "Rely on the process health endpoint",
          appeal:
            "Already exists and is cheap to poll.",
        },
      ],
      best: 1,
      verdict:
        "GOLD keeps the socket clock fresh, so no socket-level threshold can see the others. Only a per-symbol clock separates them, and the exchange guard stops evening false alarms. Hourly restarts would cut live strategies, and a health endpoint reports a process that is up.",
      claims: [
        {
          text: "You accept per-symbol state and a calendar to maintain, in return for finding one dead symbol among live ones.",
          axis: "trade",
          correct: true,
          note: "True. The detector gets more state and more rules.",
        },
        {
          text: "The per-symbol clock removes the need for any socket-level watchdog.",
          axis: "trade",
          correct: false,
          note: "The socket watchdog still catches a fully dead connection. The two checks see different faults.",
        },
        {
          text: "A symbol that has never ticked since start must be treated as silent once uptime passes the limit.",
          axis: "failure",
          correct: true,
          note: "True. Without it, a symbol on a dead socket has no age and is never flagged.",
        },
        {
          text: "A tick still in flight when a symbol is unsubscribed can put it back in the health view and cause a false alarm.",
          axis: "failure",
          correct: true,
          note: "True. Traed's ticker records health only for symbols that are still subscribed.",
        },
        {
          text: "Track seconds since the last tick per symbol, resubscribe counts, and strategies with no evaluation in an interval.",
          axis: "measure",
          correct: true,
          note: "True. These measure the outcome and the repairs.",
        },
        {
          text: "CPU use of the engine is the best signal of feed health.",
          axis: "measure",
          correct: false,
          note: "A starved engine can look idle or busy. CPU says nothing about whether ticks arrive.",
        },
      ],
    },
    {
      id: "sd-feed-health-alert-design",
      scenario:
        "A broker's market-data team runs feeds for 2,000 instruments across NSE and MCX, watched by a small on-call rota. The first design pages for each instrument that is silent for more than 60 seconds. On a bad morning an upstream fault silences 600 instruments at once and 600 pages arrive in a minute. Quiet far-strike options also page by themselves several times a day. The team asks how to redesign paging.",
      options: [
        {
          label: "Keep one page per instrument, but send them to a bigger rota",
          appeal:
            "Every fault is reported, and more people share the work.",
        },
        {
          label: "Send a daily email digest of silent instruments",
          appeal:
            "No night pages and a complete list.",
        },
        {
          label: "Page on symptoms: the share of instruments silent while their session is open, or consumers not evaluating, once per condition with a resolved notice",
          appeal:
            "One page for one cause, tied to real harm, and quiet contracts no longer wake anyone.",
        },
        {
          label: "Remove paging and rely on a dashboard that someone watches",
          appeal:
            "Nothing wakes people up and everything is visible.",
        },
      ],
      best: 2,
      verdict:
        "At this scale the failure is page volume. A single cause creates hundreds of pages, and quiet contracts are noise. Alerting on a symptom, session-aware and per condition, turns the 600 into one and ties the page to harm. The per-instrument detail stays on the dashboard. A digest is too slow for live trading, and a dashboard alone depends on someone watching.",
      claims: [
        {
          text: "You accept that one page no longer names every affected instrument, in return for pages people can act on.",
          axis: "trade",
          correct: true,
          note: "True. Detail moves to the dashboard and the page carries the symptom.",
        },
        {
          text: "A threshold on the share of silent instruments needs tuning, because it can hide a small but important group.",
          axis: "trade",
          correct: true,
          note: "True. A share can stay under the limit while the one instrument that matters is dead, so important instruments may need their own rule.",
        },
        {
          text: "Symptom-based paging removes the need to record per-instrument silence at all.",
          axis: "trade",
          correct: false,
          note: "Per-instrument data is what the symptom is computed from, and it is needed for diagnosis.",
        },
        {
          text: "If paging has no session guard, every instrument whose market has closed pages at the close.",
          axis: "failure",
          correct: true,
          note: "True. This is the false-alarm trap in a different form.",
        },
        {
          text: "A bigger rota stops the pages from being ignored.",
          axis: "failure",
          correct: false,
          note: "More people receive the same flood, so each page is trusted less, not more.",
        },
        {
          text: "Count pages per week, the share that needed action, and time from fault to page.",
          axis: "measure",
          correct: true,
          note: "True. The share needing action is the direct measure of alert fatigue.",
        },
        {
          text: "The total number of instruments monitored shows whether alerting works.",
          axis: "measure",
          correct: false,
          note: "Coverage is not the same as usefulness. A system can watch everything and still be ignored.",
        },
      ],
    },
    {
      id: "sd-feed-health-evening-session",
      scenario:
        "A small platform runs NSE strategies until 15:30 and MCX crude strategies until 23:30 on one engine. Its feed detector uses a single flag, 'is any market open', and pages when any feed is silent for 90 seconds. Every weekday at 15:35 the NSE feeds go quiet and the detector pages a zombie feed, though nothing is wrong. The operator now ignores evening pages. What is the best change?",
      options: [
        {
          label: "Judge each feed against its own exchange's session, including holidays",
          appeal:
            "Silence is only a fault when that feed's market is open, which is exactly what is wrong here.",
        },
        {
          label: "Disable all feed alerts after 15:30",
          appeal:
            "Stops the false pages at once.",
        },
        {
          label: "Raise the threshold to 30 minutes",
          appeal:
            "Fewer pages, and a longer wait may cover the gap.",
        },
        {
          label: "Alert only for feeds that have an open position",
          appeal:
            "Limits pages to cases with money at risk.",
        },
      ],
      best: 0,
      verdict:
        "The fault is the guard, not the threshold. A per-feed session flag makes NSE silence normal after 15:30 and keeps MCX watched until 23:30. Disabling alerts blinds the evening session, a 30-minute limit weakens detection all day, and an open-position filter would still ignore a dead feed on a strategy about to enter.",
      claims: [
        {
          text: "You accept maintaining an exchange calendar, with holidays and special sessions, in return for correct silence rules.",
          axis: "trade",
          correct: true,
          note: "True. A calendar is one more thing to keep right.",
        },
        {
          text: "A per-feed flag makes the detector less sensitive to real faults during the day.",
          axis: "trade",
          correct: false,
          note: "It only changes when silence counts. In-session sensitivity is unchanged.",
        },
        {
          text: "If the calendar is wrong on a holiday, a closed market can page as a fault, or an open one can go unwatched.",
          axis: "failure",
          correct: true,
          note: "True. The calendar becomes a dependency that needs its own check.",
        },
        {
          text: "Disabling alerts after 15:30 leaves the MCX evening session without feed monitoring.",
          axis: "failure",
          correct: true,
          note: "True. This is why a global cut-off is the wrong fix.",
        },
        {
          text: "Count evening pages per week that needed no action, and expect them to fall to near zero.",
          axis: "measure",
          correct: true,
          note: "True. False pages are the symptom, so they are the measure.",
        },
        {
          text: "The CPU used by the detector shows whether the fix worked.",
          axis: "measure",
          correct: false,
          note: "Detector load is unrelated to false alarms.",
        },
      ],
    },
  ],
};

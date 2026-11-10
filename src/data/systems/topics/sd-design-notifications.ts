import type { Topic } from "../../types.ts";

export const sdDesignNotifications: Topic = {
  id: "sd-design-notifications",
  title: "Design a notification system",
  tier: 10,
  week: 20,
  depth: "deep",
  summary:
    "Send push, SMS and email reliably: a queue per channel, retries with de-duplication, user preferences and rate caps, priority lanes and provider failover.",
  why: "Every product eventually needs to tell people things: an OTP, a payment receipt, a price alert, a marketing offer. The design question is not how to call an SMS API. It is how to send millions of messages without duplicates, without losing the important ones behind the unimportant ones, and without being blocked by a provider. This topic shows queues, retries, token buckets and circuit breakers working together. Traed has a small working version over Telegram, which makes the vocabulary concrete.",
  learn: {
    intuition:
      "Think of a post office sorting room with three counters: courier, telegram and ordinary mail. Letters arrive from many departments. A clerk first checks whether the person has asked not to be disturbed, and whether this same letter has already gone out. Then the letter is put in the tray for the right counter. Urgent letters, such as a bank code, go in a fast tray that is always served first, so a flood of advertisements cannot hold them up. Each counter has its own pace, because the courier company only takes so many parcels an hour. If the courier says 'try later', the clerk waits a bit longer each time before trying again. If one courier is down all day, the clerk hands parcels to a second company. Everything is written in a logbook, so nothing is sent twice.",
    mechanics: [
      {
        heading: "Requirements and scale, with numbers",
        body: "Functional: send push, SMS and email from templates, honour user choices, and report status. Non-functional: an OTP must arrive in seconds, nothing may be sent twice, and a marketing blast must never delay an OTP. Take 10 million users getting five notifications a day: 50 million a day, about 580 a second on average. A campaign to all 10 million users in 10 minutes needs about 17,000 a second, thirty times the average, which is why queues exist. Providers also cap you. If one SMS gateway accepts 500 messages a second, 10 million SMS takes over five hours through that gateway alone, so you need several routes.",
      },
      {
        heading: "API and data model",
        body: "Producers call `POST /notify` with `user_id`, `template_id`, `params`, `category` (otp, transactional, marketing) and an `event_id` chosen by the producer. The `event_id` is the idempotency key: the same id twice means one notification. Tables: `preferences` (user, channel, category, opt-in, quiet hours), `devices` (push token per device), `templates` (per channel and language), and `deliveries` (event_id, channel, state, provider, attempts, last error). States run queued, sent, delivered, failed or suppressed. Provider callbacks, such as an email bounce or an invalid push token, update this table and the preferences, so the system stops sending to dead addresses.",
      },
      {
        heading: "High-level design",
        body: "Producers write to an intake API, which validates, de-duplicates on `event_id`, and puts the request on a queue. A notification service reads it, checks preferences and rate caps, picks channels, renders the template, and writes one job per channel to that channel's queue, split into a high-priority and a bulk lane. Workers for each channel call a provider: APNs or FCM for push, an SMS gateway, an email service. Provider responses and delivery callbacks update the `deliveries` table. Retries go to a delay queue. Separate queues per channel mean a slow SMS gateway cannot back up push. Workers scale by queue depth, not by guess.",
      },
      {
        heading: "The hard part: retries, duplicates, caps and failover",
        body: "Queues deliver at least once, so the worker checks `deliveries` for the key before sending. A provider that times out may still have sent, so exactly-once is impossible and the aim is to make a rare duplicate harmless. Retries use exponential backoff with jitter: waits of 1, 2, 4, 8 seconds, each randomised, so a recovered provider is not hit by a synchronised wave. Per-user and per-provider token buckets cap the rate and the excess is held or merged into a digest. A circuit breaker counts failures per provider and, when it trips, sends to a backup provider. Priority lanes are served first so a campaign never delays an OTP.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed sends one kind of notification, through Telegram, to its own users, and its design is a small copy of this one. A router takes a user, a category and text, and delivers to every verified destination subscribed to that category; an unknown category is dropped with a warning. Paper-fill messages are found by a per-strategy watermark that errs towards a short replay, so a duplicate is possible but a silent miss is not. The news producer has a token bucket per destination, and excess goes into one digest. There is no queue or second provider, because volume is small and Telegram is the only channel.",
      },
    ],
    complexityDerivation:
      "The design holds because it separates three things that fail differently: deciding whether to send, deciding how to send, and sending. Each stage has its own queue, so a slow provider backs up only its own queue and the producer is never blocked. Reliability comes from the idempotency key in the delivery log: a retry, a replay and a duplicate request all collapse to a single logged attempt, so at-least-once transport behaves close to once for the user. Backoff with jitter keeps retries from becoming an attack on the provider you depend on. Rate caps protect people, because a system that can send 17,000 messages a second can also spam a user into uninstalling. The argument weakens in three places. The provider may deliver and still report a timeout, so rare duplicates stay possible. A shared queue can let bulk traffic starve urgent traffic if lanes are not separated. And a regulation or provider rule, such as pre-registered SMS templates in India, can reject a message the system considers valid.",
    variants: [
      {
        name: "Single queue with priority field",
        when: "Small volume, one or two channels, and a priority list is enough.",
        delta:
          "One queue and workers pick high priority first. Simple, but a large bulk backlog can still slow the top lane when workers are shared.",
      },
      {
        name: "Queue per channel and per priority lane",
        when: "Several channels and traffic with very different urgency, such as OTPs beside campaigns.",
        delta:
          "Separate queues and worker pools for each lane. More to run, but urgent traffic has guaranteed capacity and a stuck provider cannot block others.",
      },
      {
        name: "Direct synchronous send from the producer",
        when: "A single low-volume message type where loss is acceptable.",
        delta:
          "The producer calls the provider itself. No queue to operate, but a provider slowdown slows the producer and a crash loses the message.",
      },
    ],
    tradeoffs: [
      {
        vs: "At-least-once with de-duplication versus at-most-once",
        pick: "At-least-once with a dedupe key for anything the user needs, at-most-once for pure convenience",
        because:
          "Losing an OTP or a fill alert is worse than a rare duplicate, so retry. A 'new offer' nudge can be dropped rather than risk repeats.",
      },
      {
        vs: "Send immediately versus batch into a digest",
        pick: "Immediate for urgent categories, digest for bursts of low-urgency ones",
        because:
          "An OTP must be instant. Fifty price-move alerts in a minute are more useful as one message, and they spend less of the rate cap.",
      },
      {
        vs: "One provider versus several with failover",
        pick: "A second provider for channels where delivery is critical",
        because:
          "A single provider is simple and cheap, but its outage becomes yours. A backup costs integration work and a second contract, and it pays for itself the first time the primary is down.",
      },
    ],
  },
  algorithms: [
    {
      name: "Token bucket",
      role: "Limits sends per user and per provider by refilling a bucket at a steady rate and spending one token per message, allowing small bursts.",
    },
    {
      name: "Exponential backoff with jitter",
      role: "Spaces retries at growing, randomised intervals so a recovering provider is not hit by a synchronised wave.",
    },
    {
      name: "Idempotency key lookup",
      role: "Checks a hashed event_id in the delivery log before sending, so retries and duplicate requests collapse into one send.",
      dsa: "hashing",
    },
    {
      name: "Min-heap delay queue",
      role: "Holds scheduled retries and timed messages ordered by due time, so the next job to fire is always at the top.",
      dsa: "heaps",
    },
  ],
  realWorld: [
    {
      system: "Apple APNs and Google FCM",
      kind: "industry",
      problem:
        "A phone may be off or unreachable when you want to push a message, and you cannot hold a connection to every device yourself.",
      applied:
        "Both services accept a message for a device token and hold it until the device is reachable. They let the sender set a time to live, after which an undelivered message is dropped, and FCM supports a collapse key so a newer message replaces an older pending one. They also report tokens that are no longer valid, which you must remove.",
      evidence: "Apple APNs and Firebase Cloud Messaging documentation",
      impact:
        "A stale 'price at 100' alert never arrives after 'price at 110', and dead tokens stop wasting sends.",
    },
    {
      system: "Amazon SES and email bounces",
      kind: "industry",
      problem:
        "Repeatedly sending to addresses that bounce, or to people who press 'spam', damages the sender's reputation and gets mail blocked.",
      applied:
        "SES reports bounces and complaints, and keeps a suppression list so that addresses which hard-bounced are not tried again. Senders are expected to feed these results back into their own preferences and to keep complaint rates low.",
      evidence: "Amazon SES developer guide: bounces, complaints and the suppression list",
      impact:
        "Feeding results back stops the system from repeating a send it already knows will fail.",
    },
    {
      system: "India's SMS rules (TRAI DLT)",
      kind: "industry",
      problem:
        "Promotional and transactional SMS in India must follow regulatory rules, or the telecom operators reject the message.",
      applied:
        "TRAI's distributed ledger framework requires a business to register its sender ids and message templates with operators. A message whose text does not match a registered template is blocked, so the notification service stores template ids and fills only the registered variable slots.",
      evidence: "TRAI regulations on commercial communications and the DLT registration process",
      impact:
        "Templates become data, versioned and registered, and a rejected send is a normal failure the design must handle.",
    },
    {
      system: "Traed Telegram notifications",
      kind: "yours",
      problem:
        "Fills, broker-login failures, backtest results and news alerts must reach the right chats, and a news storm must not starve a fill alert.",
      applied:
        "A router sends text for a user and category to every verified destination subscribed to that category, drops unknown categories with a warning, and falls back to a global chat when asked. News alerts use a per-destination token bucket, with excess parked and sent as a single digest. Waitlist alerts are dispatched after the web response.",
      evidence:
        "docs/telegram-notifications.md; docs/plans/news-driven-alerts.md section 9; CMS/trade-server/app/Services/Telegram/TelegramRouter.php",
      impact:
        "One channel stays quiet and ordered under bursts, with the cost that there is no queue and one provider.",
    },
  ],
  insights: [
    {
      t: "Separate decide, route and send",
      d: "Each stage has its own queue, so a slow provider backs up only its own channel and never blocks the producer.",
    },
    {
      t: "The idempotency key makes retries safe",
      d: "A producer-chosen event id checked against the delivery log turns at-least-once queues into near-once messages for users.",
    },
    {
      t: "Backoff needs jitter",
      d: "Doubling waits spaces retries out, but random jitter stops thousands of clients retrying at the same instant.",
    },
    {
      t: "Priority lanes protect the urgent",
      d: "A shared queue lets a ten-million-message campaign sit in front of an OTP. Separate lanes and workers prevent it.",
    },
  ],
  pitfalls: [
    "Retrying with fixed intervals and no jitter. When a provider recovers, every queued retry fires at once and knocks it over again.",
    "Treating a provider timeout as a failure and resending blindly. The first send may have succeeded, so check the delivery log or use the provider's own idempotency support.",
    "Ignoring bounce and invalid-token callbacks. The system keeps sending to dead destinations and damages its sender reputation.",
  ],
  quiz: [
    {
      q: "In a notification system, what is the job of the producer-chosen event_id?",
      options: [
        "It decides which channel is used for the notification",
        "It sets the order in which messages are shown to the user",
        "It lets the system recognise a repeated request and send only once",
        "It tells the provider how long to keep the message",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The event_id is an idempotency key. The same id arriving twice, from a retry or a replay, finds the existing delivery record and does not send again.",
      distractors: [
        "Channel choice comes from preferences and the category, not from the id.",
        "Ordering is not what the id does. It identifies the event.",
        "",
        "Time to live is a separate field passed to push providers.",
      ],
    },
    {
      q: "Why does a retry policy add random jitter to exponential backoff?",
      options: [
        "So that many clients do not retry at exactly the same moment",
        "So that every message eventually reaches the user",
        "So that the provider can tell retries from original sends",
        "So that retries use less memory in the queue",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Without jitter, clients that failed together retry together, and the recovering provider sees a spike again. Randomising spreads the retries out.",
      distractors: [
        "",
        "Delivery is guaranteed by retrying until success or a limit, not by jitter.",
        "Providers recognise retries through idempotency keys, not through timing.",
        "Memory use is unchanged. The aim is smoother load.",
      ],
    },
    {
      q: "A marketing campaign puts 8 million emails and SMS jobs on the same queue as OTP messages. OTPs now arrive 20 minutes late. What is the best fix?",
      options: [
        "Add more workers to the shared queue and keep a single lane",
        "Cap the campaign at one million messages a day to keep the queue short",
        "Ask the OTP producers to retry more often until each one gets through",
        "Give OTPs a separate high-priority queue and worker pool, served first",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Urgent and bulk traffic need isolation. A dedicated lane gives OTPs guaranteed capacity whatever the campaign does.",
      distractors: [
        "More workers shrink the backlog but OTPs still wait behind the earlier jobs in the same queue.",
        "That limits the business instead of fixing the starvation, and a large backlog may reappear.",
        "More retries add more messages to the same jammed queue.",
        "",
      ],
    },
    {
      q: "A worker calls an SMS gateway and the call times out after 10 seconds. The message may or may not have gone. What is the sound action?",
      options: [
        "Check the delivery record or gateway status, then retry with the same key",
        "Mark it delivered, because the gateway accepted the request before the timeout",
        "Resend immediately with a new id to be sure the user gets one",
        "Drop it and tell the producer that the notification has failed for good",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A timeout means the outcome is unknown. Retrying with the same key, or checking status first, prevents a duplicate while still covering a real failure.",
      distractors: [
        "",
        "A timed-out call tells you nothing about acceptance.",
        "A new id defeats de-duplication and can send a second SMS.",
        "Dropping it risks losing an OTP the user is waiting for.",
      ],
    },
    {
      q: "A trader gets 60 price-alert pushes in a minute during a volatile open. The product wants this reduced without losing the information. What should the system do?",
      options: [
        "Delete alerts that are older than ten seconds when they are sent",
        "Use a per-user token bucket and merge the excess into one digest",
        "Turn the alerts off for every user during the volatile open",
        "Raise the push rate so that the alerts all finish sooner",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A token bucket allows a small burst, then holds the excess. Merging the held items into one digest keeps the content while cutting the noise.",
      distractors: [
        "Deleting loses information the user asked for.",
        "",
        "Disabling alerts at the open removes them when they matter most.",
        "Sending faster increases the flood rather than reducing it.",
      ],
    },
    {
      q: "Your SMS provider has 40 percent failures for the last two minutes. A circuit breaker is configured. What should it do?",
      options: [
        "Keep sending and rely on retries to get through eventually",
        "Stop all notifications on every channel until the provider is fixed",
        "Turn off the retry policy so the provider is not hit again",
        "Open, route new SMS to the backup provider, and probe the primary now and then",
      ],
      answer: 3,
      difficulty: "apply",
      why: "An open breaker stops hammering a failing dependency and fails over. A trickle of probe requests shows when the primary is healthy again.",
      distractors: [
        "Retrying into a failing service adds load and delays every message.",
        "Push and email are unaffected, so stopping them harms users for no reason.",
        "Retries are still wanted for ordinary failures. The breaker handles the unhealthy provider.",
        "",
      ],
    },
    {
      q: "A team wants every notification delivered exactly once and proposes to remove retries, since retries cause duplicates. What is the right judgement?",
      options: [
        "Good, because a missed alert is better than a duplicate in every case",
        "Wrong; retry important messages and make a rare duplicate harmless with a dedupe key",
        "Good, because exactly-once is simple to get with a single worker",
        "Wrong, because retries are the only way to avoid using queues",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Exactly-once across an unreliable network is not available, so the practical goal is at-least-once plus de-duplication. For OTPs and fills, a duplicate is much less costly than a loss.",
      distractors: [
        "For a payment receipt or OTP, a loss costs more than one duplicate.",
        "",
        "A single worker can still crash after sending and before recording, so the problem remains.",
        "Queues and retries are separate ideas. Retries are about failure handling.",
      ],
    },
    {
      q: "The team proposes sending all email, SMS and push through one provider and one queue to keep operations simple, for an app with 400,000 users and payment receipts. What is the best judgement?",
      options: [
        "Sound for any size, since fewer parts always means fewer failures",
        "Unsound, because 400,000 users always need a multi-region provider mesh",
        "Reasonable here, but add a separate lane for OTPs and receipts",
        "Unsound, because email, SMS and push cannot share a queue technically",
      ],
      answer: 2,
      difficulty: "judge",
      why: "At this scale a simple setup is right, and a second provider may wait. But receipts and OTPs must not queue behind bulk mail, so a priority lane is cheap insurance.",
      distractors: [
        "Fewer parts do not remove the risk of an urgent message waiting behind a bulk one.",
        "A mesh is far beyond what this size needs, so it adds cost without benefit.",
        "",
        "Sharing a queue is technically possible. The issue is priority and isolation.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-notifications-one-user-platform",
      scenario:
        "A small trading platform has one daily user plus a few invited testers. It sends fill alerts, broker-login failures and the occasional news alert to Telegram chats. Volume is a few dozen messages a day, with rare bursts of a few hundred on a news event. One engineer maintains it, and a missed login-failure alert means a data pipeline stalls for the morning. What notification design fits?",
      options: [
        {
          label: "A router that maps category to each user's subscribed destinations, with a per-destination rate cap for the bursty producer and no queue",
          appeal:
            "Matches the volume, keeps users in control of what they get, and protects fill alerts from a news storm.",
        },
        {
          label: "A Kafka-backed pipeline with a queue per channel, priority lanes and two providers",
          appeal:
            "The standard large-scale design, ready for growth.",
        },
        {
          label: "Each producer calls the Telegram API directly with a fixed chat id",
          appeal:
            "Fewest parts and no shared code to maintain.",
        },
        {
          label: "Email everything to the founder and filter by hand",
          appeal:
            "Email is reliable and needs no new code.",
        },
      ],
      best: 0,
      verdict:
        "At dozens of messages a day a queue fleet is overhead. A routing layer with categories keeps producers away from chat ids and lets users choose, and a rate cap on the one bursty producer protects the critical ones. Direct calls spread the logic everywhere, the Kafka design costs more than the whole product at this size, and manual filtering fails exactly when attention is scarce.",
      claims: [
        {
          text: "You accept there is no queue, so a send that fails at the provider is logged rather than retried for hours.",
          axis: "trade",
          correct: true,
          note: "True. That is the price of skipping a queue at small volume.",
        },
        {
          text: "Categories let a user subscribe a loud group to news and a quiet one only to login failures.",
          axis: "trade",
          correct: true,
          note: "True. Preferences by category are what stops one noisy producer ruining the channel.",
        },
        {
          text: "A router layer makes delivery slower than direct API calls by an amount users would notice.",
          axis: "trade",
          correct: false,
          note: "It adds a database lookup and an HTTP call, which is imperceptible next to the send itself.",
        },
        {
          text: "If a news storm shares the same budget as fill alerts and nothing yields, a fill alert can be dropped.",
          axis: "failure",
          correct: true,
          note: "True. That is why the bursty producer is capped and yields to other categories.",
        },
        {
          text: "If Telegram is down, the router retries for as long as needed and nothing is ever lost.",
          axis: "failure",
          correct: false,
          note: "Without a queue the send fails and is logged. Recovery depends on the producer's own replay.",
        },
        {
          text: "Log delivered-to-N-chats per message and alert on 'delivered to 0 chats'.",
          axis: "measure",
          correct: true,
          note: "True. It exposes a message that was silently dropped.",
        },
        {
          text: "The count of messages sent per day shows whether alerts are reliable.",
          axis: "measure",
          correct: false,
          note: "Volume says nothing about whether the right messages arrived.",
        },
      ],
    },
    {
      id: "sd-design-notifications-sale-day",
      scenario:
        "An Indian e-commerce app has 30 million users. At 12:00 on a sale day marketing wants to push and SMS an offer to 20 million of them, while the same platform must keep sending OTPs and order confirmations at about 3,000 a second. The primary SMS gateway accepts 800 messages a second. How should the system be built?",
      options: [
        {
          label: "Send the campaign from the web servers directly at noon",
          appeal:
            "No new infrastructure to build.",
        },
        {
          label: "One shared queue and many workers, sent as fast as possible",
          appeal:
            "Simple, and the campaign finishes as soon as it can.",
        },
        {
          label: "Separate priority lanes and worker pools, so OTPs and orders are served first; spread the campaign over time with per-provider token buckets and several SMS routes",
          appeal:
            "Protects urgent traffic and respects each provider's limit.",
        },
        {
          label: "Send the campaign by SMS only, through the primary gateway",
          appeal:
            "One provider and one integration.",
        },
      ],
      best: 2,
      verdict:
        "At 800 messages a second, 20 million SMS takes about seven hours through one gateway, so the campaign must be spread and routed over several providers or shifted to push. The OTP stream is the part that cannot wait, so it needs its own lane. A shared queue buries OTPs behind the campaign, web servers cannot absorb the load, and a single gateway makes the campaign take all day.",
      claims: [
        {
          text: "You accept that the campaign reaches some users later than others, in exchange for OTPs staying fast.",
          axis: "trade",
          correct: true,
          note: "True. Bulk traffic gives way to urgent traffic.",
        },
        {
          text: "Moving part of the campaign from SMS to push reduces cost and time, because push has no per-message carrier charge and a higher limit.",
          axis: "trade",
          correct: true,
          note: "True. Choosing a cheaper channel for non-urgent offers is a design lever.",
        },
        {
          text: "Spreading the campaign over time lowers the number of users who receive it.",
          axis: "trade",
          correct: false,
          note: "Everyone still receives it. Only the delivery window changes.",
        },
        {
          text: "If bulk and OTP share workers, a backlog of campaign jobs can delay OTPs and block logins and payments.",
          axis: "failure",
          correct: true,
          note: "True. This is the starvation the lanes prevent.",
        },
        {
          text: "If the primary gateway slows, the campaign cannot be completed at all.",
          axis: "failure",
          correct: false,
          note: "A circuit breaker and a second route let it continue through another provider.",
        },
        {
          text: "Track time from request to delivery for the OTP lane separately from the campaign lane.",
          axis: "measure",
          correct: true,
          note: "True. One blended figure would hide OTP delay inside campaign numbers.",
        },
        {
          text: "Total messages sent per hour is enough to prove users were served well.",
          axis: "measure",
          correct: false,
          note: "Throughput says nothing about who waited, or whether OTPs arrived in time.",
        },
      ],
    },
    {
      id: "sd-design-notifications-duplicate-receipts",
      scenario:
        "A fintech app sends a payment receipt by push and email when the payments service emits an event. The event bus delivers at least once, so some events arrive twice, and users complain of two receipts. Removing the bus's retries would lose receipts when workers crash. The team of six wants a fix this week. What should they do?",
      options: [
        {
          label: "Turn off bus retries so duplicates stop",
          appeal:
            "Removes the cause with one setting.",
        },
        {
          label: "Key each notification on the payment event id and check a delivery record before sending",
          appeal:
            "Keeps the bus reliable and turns duplicate events into one send.",
        },
        {
          label: "Add a one-second delay before sending to let duplicates settle",
          appeal:
            "Cheap, and duplicates often arrive close together.",
        },
        {
          label: "Tell users to ignore repeated receipts",
          appeal:
            "No engineering effort at all.",
        },
      ],
      best: 1,
      verdict:
        "Duplicates are a normal result of at-least-once delivery, so the sender must be idempotent. A delivery record keyed on the event id makes the second arrival a no-op, and the bus keeps its reliability. Turning off retries trades duplicates for lost receipts, a delay does not close the window for late duplicates, and ignoring the problem leaves the complaint.",
      claims: [
        {
          text: "You accept an extra lookup and write per notification, in exchange for removing duplicate sends.",
          axis: "trade",
          correct: true,
          note: "True. A small cost on every message buys correctness for all of them.",
        },
        {
          text: "The fix keeps the bus's at-least-once guarantee, so a crashed worker still gets the event again.",
          axis: "trade",
          correct: true,
          note: "True. De-duplication sits on the consumer side and does not weaken delivery.",
        },
        {
          text: "The fix guarantees exactly-once delivery to the user's phone.",
          axis: "trade",
          correct: false,
          note: "A provider can still send and time out, so a rare duplicate remains possible.",
        },
        {
          text: "If the record is written after the send and the worker crashes between them, the receipt can be sent twice.",
          axis: "failure",
          correct: true,
          note: "True. Claim the key first, or use the provider's own idempotency to narrow this window.",
        },
        {
          text: "Without the key, a duplicate event cannot happen if the bus is healthy.",
          axis: "failure",
          correct: false,
          note: "At-least-once duplicates occur even when everything is healthy, for example after a missed ack.",
        },
        {
          text: "Count events seen versus notifications sent. A steady gap equals duplicates suppressed.",
          axis: "measure",
          correct: true,
          note: "True. It shows the key is working and how often duplicates occur.",
        },
        {
          text: "The number of receipts sent per day tells you whether duplicates have stopped.",
          axis: "measure",
          correct: false,
          note: "A raw count moves with payments, so it cannot distinguish a duplicate from a new receipt.",
        },
      ],
    },
  ],
};

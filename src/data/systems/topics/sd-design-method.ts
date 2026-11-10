import type { Topic } from "../../types.ts";

export const sdDesignMethod: Topic = {
  id: "sd-design-method",
  title: "A method for any design question",
  tier: 10,
  week: 19,
  depth: "deep",
  summary:
    "A repeatable order for any design problem: requirements, rough numbers, API, data model, a sketch, then the hard part. Shown on a small price-alert service.",
  why: "Most weak designs fail before the first box is drawn. The author never fixed what the system must do, never counted how much data or traffic it faces, and so picked tools by habit. A fixed order of questions fixes that, in a job interview and in real work alike. It also gives you a way to say why you chose something, which is what an investor or co-founder wants to hear. Traed's own design documents follow the same order: context first, then containers, then flows.",
  learn: {
    intuition:
      "Think of an architect who is asked to build a house. She does not begin with the roof tiles. First she asks what the family needs: how many people, any elderly relatives, a shop at the front, a budget. Then she measures the plot and counts the load the walls must carry. Then she draws a rough plan with rooms and doors. Only then does she spend her real effort on the one part that could ruin the project, say the foundation on soft ground or the water supply, and she asks what happens in a heavy monsoon. A design question is the same. You clarify, you count, you sketch, you find the hardest part and work on it, and you say what breaks. The order matters because every later choice rests on the earlier answers. A wrong count at step two quietly spoils steps three to six.",
    mechanics: [
      {
        heading: "Requirements and rough numbers",
        body: "Start by splitting what the system does (functional) from how well it must do it (non-functional: speed, volume, correctness, availability). Then put numbers on it. Running example: a price-alert service where a user says 'tell me when RELIANCE crosses 2,900'. Assume 5 million users with 4 alerts each, so 20 million alerts. At about 60 bytes an alert that is 1.2 GB, small enough for one machine's memory. Assume 5,000 instruments ticking about once a second, so 5,000 ticks a second. A day has about 100,000 seconds, a useful rounding: 100 million requests a day is about 1,000 a second on average, and peak is often 3 times that. State what is out of scope, such as email design.",
      },
      {
        heading: "API and data model",
        body: "Write the calls first, because they force you to name the nouns. For the example: create an alert with symbol, direction, price and a client-supplied key so a retry does not create two; delete an alert; list my alerts, paged by cursor. Then design storage from the access patterns, not from the nouns. Two patterns exist here: list one user's alerts newest first, and find every active alert on one symbol whose price has been crossed. That suggests an `alerts` table with an index on user and creation time, and a second index on symbol, direction, state and price. Give each alert a small state machine: active, fired, notified. States make retries and audits clear.",
      },
      {
        heading: "The high-level design",
        body: "Draw the smallest set of boxes that carries the numbers, and follow one request through them. Here: a price feed enters a matcher, partitioned by symbol so each symbol has one owner. The matcher holds that symbol's active alerts in memory and checks each tick against them. A matched alert is marked fired in the database and a message goes on a queue. Notification workers read the queue and call the SMS or push provider. The API service writes new alerts to the database and tells the owning matcher. The database is the record, and memory is a rebuildable copy. Label every arrow with what travels on it and how often.",
      },
      {
        heading: "The hard part, bottlenecks and failure",
        body: "Find the one place the design is won or lost and go deep there. Here it is matching. A scan of every alert on each tick is fine for an average symbol with 4,000 alerts at 1 tick a second. For NIFTY with 500,000 alerts at 50 ticks a second it is 25 million comparisons a second, wasteful. Keep each symbol's 'above' alerts in a min-heap by price: a tick at p pops only alerts at or below p, so cost follows the number fired, not the number held. Then ask what breaks. A crossing can fire 200,000 alerts at once, so queue and rate-limit sends. A crashed matcher rebuilds from the database. An alert fires once because moving it from active to fired is a conditional update.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed's design documents follow this order. `docs/HLD.md` begins with the system context and the container diagram, and `docs/LLD.md` then follows individual flows such as a tick reaching the broker. Estimates are modest by design: one trader, minute bars, one server. That is a requirement, written down, and not a gap. The method would matter most when a number changes. If Traed grew to thousands of users each with a live feed, step two, the counts, would move the hard part from strategy logic to fan-out and per-user limits, and the design should be redrawn from that step, not patched.",
      },
    ],
    complexityDerivation:
      "The method works because each step narrows the next. Requirements fix what counts as correct. Numbers pick the order of magnitude, and the order of magnitude picks the technique: 1.2 GB fits in memory, while 12 TB does not, and that single fact separates a one-machine design from a sharded one. The API names the operations that the data model must serve, and the data model decides which queries are cheap. The high-level sketch then has few degrees of freedom left, and the deep dive is aimed at the place where the numbers are most extreme. The invariant is that every choice can be traced to a requirement or a number. The argument stops holding when requirements are unknown or keep changing, because then the numbers are guesses; when the first estimate is off by a factor of ten, which changes the technique; and when the real constraint is not technical, such as a team of one or a regulation. In those cases, state the assumption plainly, design the simplest thing that meets it, and write down the number that would force a redesign.",
    variants: [
      {
        name: "Interview format (45 minutes)",
        when: "A timed design question with a person who answers your questions and watches your reasoning.",
        delta:
          "Spend about five minutes on requirements, five on numbers, ten on API, data and sketch, and twenty on one deep dive. Say your assumptions aloud and let the interviewer steer.",
      },
      {
        name: "Written design document",
        when: "A real change that other engineers must review before work starts.",
        delta:
          "Same steps, plus alternatives considered, a rollout plan and open questions. Short architecture decision records capture each choice with its reason.",
      },
      {
        name: "Evolution of an existing system",
        when: "Something already runs and one number has changed, such as users or latency target.",
        delta:
          "Start from measured numbers, not estimates. Find the first bottleneck, change only that, and re-measure. A rewrite is rarely the first move.",
      },
    ],
    tradeoffs: [
      {
        vs: "Estimating first versus choosing tools first",
        pick: "Estimate first",
        because:
          "A tool chosen before the numbers is a guess. Counting takes minutes and often shows that the simple option is enough or that a fancy one is unavoidable.",
      },
      {
        vs: "Breadth of the whole system versus depth on one part",
        pick: "A thin breadth pass, then depth on the hard part",
        because:
          "A full tour of every component shows no judgement. Depth where the numbers are most extreme shows that you know where designs fail.",
      },
      {
        vs: "Designing for the future scale versus today's scale",
        pick: "Today's scale, with the trigger for the next step written down",
        because:
          "Building for ten times the load costs time now and adds failure points. A recorded trigger, such as 'redesign above 50,000 alerts a symbol', keeps the option open.",
      },
    ],
  },
  algorithms: [
    {
      name: "Back-of-envelope estimation",
      role: "Turns users and behaviour into storage, requests per second and bandwidth, so the technique can be chosen by order of magnitude.",
    },
    {
      name: "Min-heap per key",
      role: "Lets the matcher find every alert crossed by a tick in time proportional to the number fired, not the number held.",
      dsa: "heaps",
    },
    {
      name: "Access-pattern-driven structure choice",
      role: "Chooses indexes and storage from the queries the API needs, instead of from the shape of the nouns.",
      dsa: "structure-choice",
    },
    {
      name: "Conditional update (compare and set)",
      role: "Moves an alert from active to fired in one atomic step so that it is notified exactly once even with retries.",
    },
  ],
  realWorld: [
    {
      system: "Latency numbers every engineer should know",
      kind: "industry",
      problem:
        "Estimates need a shared feel for how costly each operation is, or a design will put a slow step on the hot path without noticing.",
      applied:
        "A widely circulated list, popularised by Jeff Dean's talks, gives rough orders of magnitude: a memory read in hundreds of nanoseconds, a round trip inside one datacentre in about half a millisecond, a disk seek in milliseconds, and a trip across continents in over a hundred milliseconds. Designers use these to reason that a design with ten sequential network calls cannot answer in 20 milliseconds.",
      evidence: "Jeff Dean, 'Numbers Everyone Should Know' (talks and slides, widely reproduced)",
      impact:
        "A page of numbers lets you reject or accept a design in your head, before any code exists.",
    },
    {
      system: "Architecture decision records",
      kind: "industry",
      problem:
        "Months later, nobody remembers why a choice was made, so people either fear changing it or undo it for the wrong reasons.",
      applied:
        "Michael Nygard proposed short records of one decision each, with context, the decision, and the consequences, kept next to the code. Many teams adopted the format. It is the written form of 'requirement, number, choice'.",
      evidence: "Michael Nygard, 'Documenting Architecture Decisions' (2011)",
      impact:
        "The reason survives the person who knew it, and a later change can check whether the original numbers still hold.",
    },
    {
      system: "The C4 model for drawing architecture",
      kind: "industry",
      problem:
        "Diagrams for one audience confuse another: a box-and-arrow sketch means different things to an investor and to a new engineer.",
      applied:
        "Simon Brown's C4 model draws a system at four zoom levels: context, containers, components and code. It fits the method's high-level step: start at context and zoom in only as far as the audience needs.",
      evidence: "c4model.com, Simon Brown",
      impact:
        "One consistent vocabulary lets the same design be explained at several depths without redrawing it.",
    },
    {
      system: "Traed HLD and LLD",
      kind: "yours",
      problem:
        "A system built problem by problem needs a written shape so that new people, and the founder himself, can reason about it.",
      applied:
        "`docs/HLD.md` opens with a system-context section and a container architecture section, then deployment and key flows. It states the single-VM topology plainly. Flow-level detail lives in the low-level design.",
      evidence: "docs/HLD.md (sections 1 to 3); docs/LLD.md",
      impact:
        "The documents give the context-then-containers order and state the scale limits that the estimates would otherwise have to guess.",
    },
  ],
  insights: [
    {
      t: "Order is the method",
      d: "Requirements, numbers, API, data model, sketch, hard part, failure. Each step narrows the next, so skipping one weakens all later choices.",
    },
    {
      t: "Count before you choose",
      d: "20 million alerts at 60 bytes is 1.2 GB, one machine's memory. A day is about 100,000 seconds, so 100 million a day is about 1,000 a second.",
    },
    {
      t: "Data model follows access patterns",
      d: "List the queries the API needs, then build the indexes. The nouns alone do not tell you what must be cheap.",
    },
    {
      t: "Go deep where numbers are extreme",
      d: "Pick the one place the design is won or lost, such as matching one hot symbol, and write the trigger that would force a redesign.",
    },
  ],
  pitfalls: [
    "Naming tools in the first minute. 'We will use Kafka' before any number is a habit, not a design.",
    "Estimating with false precision. A figure good to a factor of two is enough, and spending ten minutes on the third digit wastes the interview.",
    "Skipping failure. A design with no answer to 'what if this box dies, or a million events arrive at once' is half a design.",
  ],
  quiz: [
    {
      q: "What should you do first when given a design question such as 'build a price-alert service'?",
      options: [
        "Choose the database and message queue to be used",
        "Clarify what the system must do and how well it must do it",
        "Draw the full architecture with every component named",
        "Write the schema for each table in the service",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Requirements come first because every later choice depends on them. Without them you cannot tell what counts as a good design.",
      distractors: [
        "Tool choice comes after the numbers show what is needed, or you risk building the wrong thing.",
        "",
        "A full architecture drawn before requirements has nothing to be checked against.",
        "A schema depends on the access patterns, which come from the requirements and API.",
      ],
    },
    {
      q: "Which of these is a non-functional requirement for a price-alert service?",
      options: [
        "A user can create an alert on a chosen symbol and price",
        "A user can delete any alert that they created earlier",
        "A user can see a list of all of their own alerts",
        "Notices arrive within five seconds of a crossing",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A non-functional requirement says how well the system does its job: speed, volume, availability. The other three say what it does.",
      distractors: [
        "Creating an alert is a function the service offers, so it is functional.",
        "Deleting is also a function, not a quality of the service.",
        "Listing is a function as well.",
        "",
      ],
    },
    {
      q: "A service holds 20 million alerts at about 60 bytes each. Roughly how much raw data is that, and what does it suggest?",
      options: [
        "About 1.2 GB, which fits comfortably in one machine's memory",
        "About 12 GB, which needs a cluster of machines to store",
        "About 120 MB, so a few kilobytes of cache will do",
        "About 12 TB, so it needs sharding across many disks",
      ],
      answer: 0,
      difficulty: "apply",
      why: "20 million times 60 bytes is 1.2 billion bytes, about 1.2 GB. Even with index overhead of several times that, it fits in one modern machine's memory.",
      distractors: [
        "",
        "Ten times too large. 20 million times 60 is 1.2 billion, not 12 billion.",
        "Ten times too small, and a few kilobytes of cache is nowhere near it.",
        "A thousand times too large. The mistake is usually a slipped power of ten.",
      ],
    },
    {
      q: "An API serves 100 million requests a day. Using 100,000 seconds a day as a round number, what is the average rate and a sensible peak?",
      options: [
        "About 10 per second on average, 30 at peak",
        "About 100 per second on average, 300 at peak",
        "About 1,000 per second on average, 3,000 at peak",
        "About 10,000 per second on average, 30,000 at peak",
      ],
      answer: 2,
      difficulty: "apply",
      why: "100 million divided by 100,000 is 1,000 a second. Peak is commonly two to three times the average, so about 3,000.",
      distractors: [
        "That is one hundred thousand times too small. Dividing by a million seconds is the usual slip.",
        "That is a factor of ten too low, from dividing by a million seconds.",
        "",
        "A factor of ten too high. The day has about 100,000 seconds, not 10,000.",
      ],
    },
    {
      q: "The API must list a user's alerts newest first, and find all active alerts on one symbol with a price at or below a given value. Which indexes serve both?",
      options: [
        "A single index on the alert id only, since every id is unique",
        "Two separate single-column indexes, one on symbol and one on price",
        "A full-text index covering the whole text of the alert record",
        "Indexes on user and time, and on symbol, direction, state, price",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Each access pattern gets an index that matches its filter and order. The second index lets the database walk straight to the crossed prices for one symbol and direction.",
      distractors: [
        "An id index serves lookup by id, but neither listing nor price matching.",
        "Separate indexes force the database to combine results. A composite index matches the query directly.",
        "Full-text search is for words, not for range queries on numbers.",
        "",
      ],
    },
    {
      q: "In the price-alert design, one symbol such as NIFTY has 500,000 alerts and ticks 50 times a second. Where should the deep dive spend its time?",
      options: [
        "Choosing the exact wording and the colour of the notification message",
        "How matching finds crossed alerts, and how a herd is queued",
        "Whether user names are stored in upper case or in lower case",
        "Which cloud region should be used to host the monitoring dashboard",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The numbers are most extreme in matching: 25 million comparisons a second for a naive scan, and a possible herd of notifications. That is where the design is won or lost.",
      distractors: [
        "Message wording is a product detail and does not decide whether the design works.",
        "",
        "Casing is a small detail that would not change the architecture.",
        "A dashboard location does not affect the central risk.",
      ],
    },
    {
      q: "An interviewer says only: 'Design a chat app.' What is the best opening?",
      options: [
        "Ask about scale and features, then state assumptions",
        "Start drawing servers and a database on the board at once",
        "Name the most advanced technology that you happen to know",
        "Say that it depends and then wait for more details to come",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The question is deliberately open. Clarifying and writing down assumptions shows the method and gives a target to design against.",
      distractors: [
        "",
        "Drawing before knowing the requirements risks designing for the wrong problem.",
        "Fashionable tools without a requirement look like habit, not reasoning.",
        "Waiting hands the whole job back. Ask focused questions and propose assumptions yourself.",
      ],
    },
    {
      q: "Your estimates show 50 users and about 200 alerts in total. A colleague proposes a sharded cluster with a message log. What is the soundest judgement?",
      options: [
        "Approve it, because it will then be ready for any future growth",
        "Approve it, because a message log makes the system look more serious",
        "Use one table and a simple job; record the redesign trigger",
        "Reject any design that is made up of more than one process",
      ],
      answer: 2,
      difficulty: "judge",
      why: "At 200 alerts the simple design meets every requirement. Extra machinery adds failure points and cost. Writing down the trigger keeps growth in view without paying for it now.",
      distractors: [
        "Preparing for unknown growth costs time and failure points now. Design for the stated numbers.",
        "Looking serious is not a requirement, and every extra part is another thing to operate.",
        "",
        "More than one process is fine when the numbers call for it. The rule is to fit the numbers.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-method-small-alerts",
      scenario:
        "A solo founder runs a trading platform on one server with minute-bar strategies and about 50 users. They want price alerts: 'notify me when RELIANCE goes above 2,900'. Roughly 200 alerts will exist, a notice within a minute is fine, and the founder has two weeks. Using the method, what should the design be?",
      options: [
        {
          label: "A sharded in-memory matcher fed by a message log, with a queue per channel",
          appeal:
            "It is the design that scales to millions of alerts and many notification channels.",
        },
        {
          label: "An alerts table checked once a minute by a scheduled job against the latest price, with a state column and a conditional update to mark fired",
          appeal:
            "Matches the numbers, needs no new infrastructure, and fires each alert once.",
        },
        {
          label: "One background thread per alert that polls the price",
          appeal:
            "Each alert is independent and easy to reason about.",
        },
        {
          label: "A third-party alerting platform with its own price feed",
          appeal:
            "Nothing to build or run.",
        },
      ],
      best: 1,
      verdict:
        "With 200 alerts and a one-minute tolerance, a scheduled query satisfies every stated number. The state column and a conditional update give fire-once behaviour. The sharded design solves a scale that does not exist, 200 threads are wasteful, and an outside platform adds a cost and a data path that the founder would still have to feed and secure.",
      claims: [
        {
          text: "You accept up to a minute of delay between the crossing and the notice.",
          axis: "trade",
          correct: true,
          note: "True. A minute job can only see a crossing at its next run, which the requirement allows.",
        },
        {
          text: "You gain a design that one person can build, run and debug in the time available.",
          axis: "trade",
          correct: true,
          note: "True. Few moving parts is the point at this scale.",
        },
        {
          text: "The scheduled design cannot be extended later, so it locks the product in.",
          axis: "trade",
          correct: false,
          note: "The table and states carry over unchanged if a matcher is added later. Only the checking step changes.",
        },
        {
          text: "If two runs overlap, a single alert could be notified twice unless the fire step is a conditional update.",
          axis: "failure",
          correct: true,
          note: "True. Both runs see the alert as active, and only an atomic active-to-fired change lets one win.",
        },
        {
          text: "Because the job runs every minute, no crossing can ever be missed.",
          axis: "failure",
          correct: false,
          note: "A price that spikes above the level and falls back inside a minute can slip between two checks. That is acceptable only if the requirement allows minute-level sampling.",
        },
        {
          text: "Watch the delay from crossing to notice, and count alerts fired but never delivered.",
          axis: "measure",
          correct: true,
          note: "True. Delay checks the one-minute promise and undelivered counts show a broken send step.",
        },
        {
          text: "Watch CPU use on the database as the main sign of success.",
          axis: "measure",
          correct: false,
          note: "CPU says little at this size. The service is judged by delay and delivery.",
        },
      ],
    },
    {
      id: "sd-design-method-exchange-scale",
      scenario:
        "A large Indian broker has 20 million active price alerts. On one volatile morning the NIFTY index can cross a round level and trigger 200,000 alerts within a second. Ticks arrive up to 50 times a second for NIFTY, and the target is a notification within five seconds of the crossing. Alerts must fire once. SMS and push providers each accept a limited rate. What is the right shape for the hard part?",
      options: [
        {
          label: "Scan the alerts table for matches on every tick",
          appeal:
            "Simple to write and always consistent with the database.",
        },
        {
          label: "One global heap of all alerts in a single process",
          appeal:
            "A heap finds the next alert quickly, and there is only one place to look.",
        },
        {
          label: "Per-symbol in-memory heaps owned by one matcher each, rebuilt from the database, with a conditional update to fire and a rate-limited queue to the providers",
          appeal:
            "Cost follows the number crossed, each symbol has one owner, and the herd is absorbed by the queue.",
        },
        {
          label: "Send all notifications directly from the matcher when it detects a match",
          appeal:
            "The shortest path from detection to sending.",
        },
      ],
      best: 2,
      verdict:
        "The numbers make matching and the herd the hard part. Per-symbol heaps make a tick cost proportional to the alerts it crosses, a single owner per symbol avoids two matchers firing one alert, and a queue with rate limits absorbs 200,000 notices without breaching provider limits. A scan costs about 25 million comparisons a second for one symbol, a single global heap becomes one bottleneck and one failure point, and sending from the matcher ties detection to slow external calls.",
      claims: [
        {
          text: "You accept that the matcher's memory is a copy, so a crash needs a rebuild from the database before matching resumes.",
          axis: "trade",
          correct: true,
          note: "True. The database is the record, and a rebuild delay is the cost of fast in-memory matching.",
        },
        {
          text: "You accept that a mass crossing drains through the queue over some seconds and not instantly.",
          axis: "trade",
          correct: true,
          note: "True. Rate limits at the providers mean the last of 200,000 notices leaves later than the first, which the five-second target must allow for.",
        },
        {
          text: "Partitioning by symbol removes any need for a database.",
          axis: "trade",
          correct: false,
          note: "Alerts must survive restarts and be listed by users, so a durable store remains the record.",
        },
        {
          text: "If a matcher dies and its symbols are not reassigned quickly, alerts on those symbols are delayed or missed until a new owner rebuilds.",
          axis: "failure",
          correct: true,
          note: "True. Ownership needs a fast failover plan, such as a standby that rebuilds from the database.",
        },
        {
          text: "A crash between marking an alert fired and queueing its message cannot lose a notice, because the database already shows it as fired.",
          axis: "failure",
          correct: false,
          note: "It can. The alert is marked fired but no message exists, so a recovery sweep of fired-but-unqueued alerts, or one combined write, is needed.",
        },
        {
          text: "Measure the 99th percentile delay from crossing to hand-off to the provider, and the queue depth during a crossing.",
          axis: "measure",
          correct: true,
          note: "True. Tail delay tests the five-second promise, and depth shows the herd being absorbed.",
        },
        {
          text: "Measure the average delay over the whole day.",
          axis: "measure",
          correct: false,
          note: "A burst lasting seconds is invisible in a daily average.",
        },
      ],
    },
    {
      id: "sd-design-method-interview-time",
      scenario:
        "You are in a 45-minute design interview for a ticket-booking system for a railway's Tatkal quota, where bookings open at a fixed minute and demand far exceeds seats. You have 10 minutes used on requirements and numbers. What is the best use of the next 35 minutes?",
      options: [
        {
          label: "Sketch the API, data model and main flow in about ten minutes, then spend most of the remaining time on seat contention at the opening minute and what happens when it fails",
          appeal:
            "Shows breadth quickly and then depth where the design is won or lost.",
        },
        {
          label: "Describe every component in equal detail, including login, search, payments and email",
          appeal:
            "Completeness: nothing is left out.",
        },
        {
          label: "Spend 25 minutes on database normal forms and index types",
          appeal:
            "Shows deep technical knowledge.",
        },
        {
          label: "List every technology you have used and say which could be applied",
          appeal:
            "Shows a wide toolbox.",
        },
      ],
      best: 0,
      verdict:
        "The stated constraint is a surge on a limited inventory at one minute, so contention is the hard part. A quick sketch earns the space for a real deep dive. Equal detail on everything shows no judgement and runs out of time, a long detour on normal forms ignores the surge, and a technology list names tools with no reasoning behind them.",
      claims: [
        {
          text: "You accept that some components, such as email and search, get only a sentence or an explicit 'out of scope'.",
          axis: "trade",
          correct: true,
          note: "True. Depth on one thing costs depth elsewhere, and saying so is part of the method.",
        },
        {
          text: "You gain time to show how the design behaves under the surge, which is what the interviewer is probing.",
          axis: "trade",
          correct: true,
          note: "True. The stress scenario is the reason for the question.",
        },
        {
          text: "Going deep on one part means you should not mention failure at all.",
          axis: "trade",
          correct: false,
          note: "Failure belongs in the deep dive. A design with no failure story is incomplete.",
        },
        {
          text: "If your numbers at the 10-minute mark are wrong by a factor of ten, the later choices may be wrong too, so say your assumptions aloud.",
          axis: "failure",
          correct: true,
          note: "True. Stated assumptions let the interviewer correct you early.",
        },
        {
          text: "Waiting silently while you think is the safest way to avoid mistakes.",
          axis: "failure",
          correct: false,
          note: "Silence hides your reasoning, which is what is being assessed, and wastes the limited time.",
        },
        {
          text: "Check the time at each stage against a plan, for example sketch by minute 20 and deep dive by minute 25.",
          axis: "measure",
          correct: true,
          note: "True. A time budget is the measure of whether the interview is on track.",
        },
        {
          text: "Count the number of components drawn as the measure of a strong answer.",
          axis: "measure",
          correct: false,
          note: "More boxes do not show a better design. Fit to the numbers and depth at the hard part do.",
        },
      ],
    },
  ],
};

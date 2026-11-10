import type { Topic } from "../../types.ts";

export const sdCostCapacity: Topic = {
  id: "sd-cost-capacity",
  title: "Cost and capacity: doing the arithmetic",
  tier: 6,
  week: 12,
  depth: "deep",
  summary:
    "Find the unit that multiplies, count it, find what fills first, and decide whether to own capacity or rent it. Order-of-magnitude arithmetic beats a guess.",
  why: "Traed runs on one server with a small serverless edge, and sooner or later someone will ask what happens at ten users, or a hundred, and what it costs. A good answer is arithmetic, not a feeling. You already made these calls without naming them: the backtest queue runs one job at a time, the feed bridge sleeps when the market is shut, and backups were redesigned after storage grew without a limit. This lesson gives you the method and the words to defend those choices.",
  learn: {
    intuition:
      "A tea stall owner does not ask whether her stall is scalable. She counts. On a normal day about 200 cups go out, and each cup needs one glass, a spoon of tea and some milk. She owns one stove with four burners. On a match day 600 people arrive, and now the stove is the limit, not the milk. So she does not buy a bigger shop. She borrows a second stove for match days only, and pays for it only on those days. Cost and capacity thinking is exactly this. Find the number that multiplies. Count it. Find the one thing that fills up first. Then decide whether to own that thing all the time or rent it only when needed. The numbers do not have to be exact. Being right within a factor of ten is enough to tell a sensible design from a ruinous one, and it takes five minutes with a pencil.",
    mechanics: [
      {
        heading: "Start with the unit that multiplies",
        body: "Before any price, find the quantity that grows with load. For a tick feed it is messages: instruments, times ticks per second, times the seconds in a session, times the number of connections that each get a copy. Take a worked example with assumed numbers: 50 instruments, one tick a second each, and the NSE session from 09:15 to 15:30, which is 22,500 seconds. That is 11,25,000 ticks a day. If three connections each want every tick, it is 33,75,000 messages. The arithmetic is simple, yet it shows which factor to attack first. Halving the connections or batching ticks changes the bill. A faster CPU does not. Get within a factor of ten, then stop.",
      },
      {
        heading: "Pay per use or a fixed server",
        body: "A fixed server costs the same every hour. A pay-per-use service charges for what you consume and nothing when idle. The crossover is utilisation. A market-hours workload is busy for 6.25 hours on about 22 trading days, which is 137.5 hours of a 730-hour month, roughly 19 percent. At that utilisation, paying per use usually wins. A service that is busy all day, every day, flips the answer, because the per-unit price is higher than the flat price. Count the less obvious bills too: a managed WebSocket service charges for messages and for connection time, and a function charges for each run and for how long it runs. Check the vendor's current price page, because the crossover moves when prices change.",
      },
      {
        heading: "Free tiers, steps and alarms that can fire",
        body: "A free tier is a price of zero up to a line, and then a step. Plan on the paid number, because the line can move and your usage can cross it on the one day that matters. Then add an alarm that can actually ring. If the normal monthly bill is about ₹800, an alert at ₹50,000 will never fire, while alerts at ₹1,000 and ₹1,500 will. Add a second kind of alarm for silence: a job that should run daily and did not, such as a backup, needs a heartbeat that complains when it is missing. And cap growth by design, with expiry rules on stored data, instead of hoping a clean-up script keeps running.",
      },
      {
        heading: "Find the first bottleneck",
        body: "A system does not run out of everything at once. One resource fills first and sets the ceiling, and it is often not the expensive one. Find it by walking the path of one request and asking, at each hop, what the limit is and how much is used. Traed's path has several small ones: a backtest pool with one worker, so a queue forms; one host whose memory is shared by the engine and everything beside it; and a broker that documents a cap of three WebSocket connections per API key. Act on the first one only when measured use nears it. A queue that shows its position is a perfectly honest way to meet a limit.",
      },
      {
        heading: "Saying it about Traed",
        body: "We run on one server for one user, so the arithmetic is short. The server is the fixed cost, on a shape that is free-tier eligible. The dashboard feed is the part billed by use, so it stays serverless and does nothing when the market is shut or nobody is subscribed. Backtests are what compete for memory, so we run one at a time and show the queue. We accepted slower backtests at busy moments, and a ceiling of one worker. We would revisit when queue waits annoy real users, or when connections times tick rate makes the message bill matter. Until then we watch the queue wait and the message count, and nothing else.",
      },
    ],
    complexityDerivation:
      "The argument is that cost and capacity are each dominated by one or two terms. Total messages are a product, so the largest factor decides the order of magnitude, and a rough estimate of that factor is enough. The ceiling is set by the first resource to saturate, so measuring that one resource tells you most of what you need. Little's law adds a useful identity for queues: the number of jobs in the system equals the arrival rate times the average time each spends there, so a pool of one worker with six-minute jobs and ten arrivals at once means the last job waits about 54 minutes before it starts. The estimate stops holding in four cases. Load is bursty, so the average hides the 09:15 spike and capacity must be set for the peak. Prices are not linear, with tiers, free thresholds and minimum charges. Several resources fill together, so fixing one moves nothing. And the multiplied unit changes, for example when a new feature doubles the instruments. When any of these appear, estimate again before spending anything.",
    variants: [
      {
        name: "Fixed server you own",
        when: "Steady load through the day, or a workload that needs memory and CPU together, such as heavy backtests.",
        delta:
          "Flat monthly price whether busy or idle. Capacity is a hard ceiling you must raise yourself. Cheapest per unit at high utilisation.",
      },
      {
        name: "Pay-per-use serverless",
        when: "Spiky or market-hours-only work, or a component that must keep running while the main server restarts.",
        delta:
          "Bill follows messages and run time, near zero when idle. Scales out without planning, but a multiplied unit such as connections can make the bill grow faster than the value.",
      },
      {
        name: "Hybrid: fixed core, serverless edge",
        when: "A steady core plus one part with a very uneven shape.",
        delta:
          "Keeps the predictable work on the flat price and rents only the uneven part. Adds a network boundary and two places to measure, which costs attention.",
      },
    ],
    tradeoffs: [
      {
        vs: "One bigger always-on server for everything",
        pick: "Serverless for the dashboard feed, a fixed server for the engine",
        because:
          "The feed is busy about 19 percent of the month and must survive an engine restart, while the engine needs steady memory. Splitting by shape lets each part sit on the cheaper side of its own crossover.",
      },
      {
        vs: "Buying ten times headroom now",
        pick: "Estimating the first bottleneck and adding capacity when measured use nears it",
        because:
          "Headroom for a resource that is not the bottleneck buys nothing. Capacity added against a measured ceiling is cheaper and is aimed at the thing that actually fills.",
      },
      {
        vs: "Auto-scaling every worker to remove all waiting",
        pick: "A hard ceiling with a visible queue",
        because:
          "Where memory is shared with live trading, more workers can starve the live path. A queue turns an overload into a wait, which is a far smaller failure than an out-of-memory kill.",
      },
    ],
  },
  realWorld: [
    {
      system: "Back-of-envelope estimation in large-scale systems",
      kind: "industry",
      problem:
        "Engineers must judge a design before building it, with no measured data yet.",
      applied:
        "Jeff Dean's widely shared list of latency and size numbers for programmers is the standard tool: multiply a few rough quantities, such as requests per second times bytes per request, and compare the result with what one machine, one disk or one network link can carry. System-design interviews at large companies are built around this habit.",
      evidence:
        "Jeff Dean, 'Designing Lessons and Advice from Building Large Distributed Systems' (2009 conference talk slides)",
      impact:
        "A design that is wrong by a factor of a hundred is rejected in minutes, before anyone writes code.",
    },
    {
      system: "Cloud WebSocket and function pricing",
      kind: "industry",
      problem:
        "A real-time feed costs money in proportion to messages and connection time, not to how useful the data is.",
      applied:
        "Amazon's managed WebSocket API bills for the messages sent and for the minutes each connection stays open, and its function service bills per invocation and per unit of run time. A feed that sends one message per tick per connection pays for every one of them.",
      evidence: "AWS API Gateway pricing page (WebSocket APIs) and AWS Lambda pricing page",
      impact:
        "Batching ticks into fewer messages cuts the bill directly, so message count is the number to watch.",
    },
    {
      system: "Traed backup storage redesigned around a cost model",
      kind: "yours",
      problem:
        "Daily full backups of about 34 GB each were uncompressed and kept piling up in storage at roughly a terabyte or more a month, with a hand-written clean-up script as the only brake.",
      applied:
        "The redesign counted what is actually irreplaceable. Option-chain history is about 22 GB of the roughly 34 GB data directory and can be regenerated, while the application tables are a few megabytes. So the critical tables are dumped hourly, a compressed full is taken weekly, and storage rules expire each prefix by age. The design document estimates a steady state of about 70 GB and one to three dollars a month, and says growth is capped by the rules, not by a script.",
      evidence: "docs/plans/backup-restore-design.md",
      impact:
        "Cost is bounded by construction, so a forgotten script can no longer turn into a surprise bill.",
    },
    {
      system: "Traed feed bridge that sleeps when nothing needs it",
      kind: "yours",
      problem:
        "A long-running function that holds the broker socket costs money every minute it runs, but the market is shut most of the day and the weekend.",
      applied:
        "The bridge handler checks market status and the subscriptions table on every scheduled run. If the market is closed, or nothing that trades is subscribed, it logs that it is saving costs and exits. A lease row in the database ensures only one run streams at a time. Both tables use on-demand billing with expiry times, so idle rows and idle hours cost almost nothing.",
      evidence: "CMS/Serverless/real-time-trading-websocket/src/handlers/bridge.js",
      impact:
        "The paid part of the platform is busy only when the exchange is, which is the fixed utilisation the arithmetic predicts.",
    },
  ],
  insights: [
    {
      t: "Find the unit that multiplies",
      d: "Instruments times ticks times seconds times connections. The biggest factor sets the order of magnitude, so attack that one first.",
    },
    {
      t: "Utilisation decides own versus rent",
      d: "A market-hours workload is busy about 19 percent of a month. Flat price wins when busy all day; pay-per-use wins when mostly idle.",
    },
    {
      t: "The first bottleneck is not always the costly one",
      d: "Walk one request through each hop and ask for the limit. Add capacity where measured use nears it, and nowhere else.",
    },
    {
      t: "Alarms must be able to fire",
      d: "Set thresholds relative to the normal bill, and add a heartbeat for jobs that should run. Silence is a common way for cost to go wrong.",
    },
  ],
  pitfalls: [
    "Estimating from the average and ignoring the peak. The 09:15 open can be many times busier than the session average, and capacity is set by the peak.",
    "Counting the cost of the main data and forgetting the multiplier. One tick sent to every connection is many messages, and each one is billed.",
    "Relying on a free tier as the plan. It is a price of zero up to a line, the line can move, and an alarm set far above the real bill will never tell you.",
  ],
  quiz: [
    {
      q: "In a capacity estimate, which number is the most useful to find first?",
      options: [
        "The size of the monthly cloud bill",
        "The brand and CPU model of the server",
        "The unit that multiplies, e.g. messages a day",
        "The free-tier allowance your vendor offers",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The bill is the result, not the cause. The quantity that multiplies, like instruments times ticks times connections, tells you which factor drives cost and capacity, so it is the first thing to count.",
      distractors: [
        "The bill is what you are trying to predict, so it cannot be the starting input.",
        "Hardware details matter later; they do not tell you which factor grows with load.",
        "",
        "A free tier is a pricing detail. It helps once you know your usage, but you cannot compare against it before counting.",
      ],
    },
    {
      q: "What do we call the resource that saturates first and sets the throughput ceiling of a system?",
      options: [
        "The bottleneck",
        "The single point of failure",
        "The cold start",
        "The long tail",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The bottleneck is the first resource to fill. A single point of failure is a different idea: a component whose loss stops everything, whether or not it is busy.",
      distractors: [
        "",
        "It sounds close, but it is about what happens when a part fails, not about which part runs out of capacity first.",
        "A cold start is the delay when a function or process begins from nothing. It is a latency effect, not a throughput ceiling.",
        "The long tail describes rare slow requests. It concerns latency spread, not which resource saturates.",
      ],
    },
    {
      q: "A server is needed only for market hours: 6.25 hours a day on 22 trading days, in a 730-hour month. If you pay for a fixed server all month, about how busy is it?",
      options: [
        "About 26 percent",
        "About 19 percent",
        "About 45 percent",
        "About 100 percent, because it is always switched on",
      ],
      answer: 1,
      difficulty: "apply",
      why: "6.25 times 22 is 137.5 hours. Divided by 730 hours that is about 0.19, so the box is busy roughly 19 percent of the month and idle the rest. That low utilisation is why pay-per-use can be cheaper for this shape.",
      distractors: [
        "That is one day's share, 6.25 of 24 hours. It forgets that weekends and holidays are idle too, so the month is busier than a single day suggests only in the wrong direction.",
        "",
        "That would need around 330 busy hours. It confuses a 24-hour trading day with the 6.25-hour NSE session.",
        "Being powered on is not being used. Utilisation is the share of time doing work, and confusing the two hides the saving.",
      ],
    },
    {
      q: "A feed carries 40 instruments, one tick a second each, for a 22,500-second NSE session. Two connections each receive every tick. About how many messages a day is that?",
      options: [
        "9,00,000",
        "22,500",
        "1,80,000",
        "18,00,000",
      ],
      answer: 3,
      difficulty: "apply",
      why: "40 times 22,500 is 9,00,000 ticks. Each of the two connections gets its own copy, so the delivered messages are 18,00,000 a day. The copy per connection is the multiplier people forget.",
      distractors: [
        "That counts the ticks only. It forgets that each connection is sent its own copy, which is what the bill counts.",
        "That is only the seconds in the session, with the instruments and the connections left out.",
        "A decimal slip: this is a tenth of the right answer.",
        "",
      ],
    },
    {
      q: "A single-worker backtest pool takes six minutes per job. Ten users press Run within one minute after the close. About how long does the last user wait before their job starts?",
      options: [
        "About 54 minutes",
        "About 6 minutes",
        "About 60 minutes",
        "No wait, because all ten were submitted together",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Nine jobs run before the tenth, and 9 times 6 is 54 minutes. The tenth finishes at about 60 minutes, which is a different number from when it starts. With one worker, submitting together does not run them together.",
      distractors: [
        "",
        "That is the length of one job. It forgets that nine others are ahead in a queue with a single worker.",
        "That is when the last job finishes. The question asks when it starts, which is one job-length earlier.",
        "Submitting at once only fills the queue. Throughput is set by the number of workers, which is one here.",
      ],
    },
    {
      q: "A small platform's infrastructure bill is normally about ₹800 a month. The owner has set a single alert at ₹50,000. Which change makes the alarm useful?",
      options: [
        "Switch the alert to a yearly spending report",
        "Alert only once the ₹50,000 figure is fully reached",
        "Add alerts near ₹1,000 and ₹1,500, plus a daily-job heartbeat",
        "Remove the alert and read the bill once the month ends",
      ],
      answer: 2,
      difficulty: "apply",
      why: "An alarm is only useful if the number can be reached. Thresholds just above the normal bill catch a runaway early, and a heartbeat catches the quiet failures, such as a backup that stopped.",
      distractors: [
        "A yearly view makes it slower still. The problem is the threshold being far above reality, not the frequency.",
        "A threshold at the same ₹50,000 can never fire for a bill near ₹800, however it is phrased.",
        "",
        "Reading the bill after the month is over means any surprise has already been paid for.",
      ],
    },
    {
      q: "A service runs at about 70 percent CPU twenty-four hours a day, every day. The team debates pay-per-use serverless against a fixed server. Which is the better judgement?",
      options: [
        "Serverless, since pay-per-use is always the cheaper choice",
        "A fixed server, since steady high utilisation is where a flat price wins",
        "Serverless, since free tiers usually cover steady loads",
        "Either, since cost does not depend on how busy it is",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Pay-per-use pays a premium per unit to avoid paying for idle time. With almost no idle time there is nothing to save, so the flat price wins. The answer follows from utilisation, not from fashion.",
      distractors: [
        "Pay-per-use is cheaper only when there is idle time to avoid. Under steady load it often costs more.",
        "",
        "Free tiers are small allowances. A load that is busy all day will pass them and then pay the full per-unit price.",
        "Cost depends strongly on utilisation. That is precisely what separates the two models.",
      ],
    },
    {
      q: "A founder says: 'Our single server copes today, so let us buy ten times the capacity now, just in case.' Which response is the soundest?",
      options: [
        "Agree, because spare capacity is cheap insurance for us",
        "Agree, because capacity is hard to add during market hours",
        "Disagree, because every service should get its own queue first",
        "Find what fills first and add that once measured use nears a set level",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Ten times of everything buys headroom on resources that may never be the limit. Finding the first bottleneck and adding capacity when measured use reaches a threshold is cheaper and is aimed at the real ceiling.",
      distractors: [
        "Unused capacity is paid for every month, and it protects nothing if the real limit is a different resource.",
        "Hard-to-change-live is a reason to plan and schedule a change, not to buy ten times of everything.",
        "Queues help with some limits, but adding them everywhere is the same guess in a different form.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-cost-capacity-feed-bridge",
      scenario:
        "One trader needs live ticks from the broker delivered to browser dashboards, held ready as the strategy engine's fallback. The NSE session is 6.25 hours on about 22 days a month. The engine's server already runs all month, and it is restarted for deploys and sometimes crashes. Ticks must keep arriving while the engine restarts, because dashboards and the fallback must not depend on it, and the monthly spend must stay near zero. How do you run the feed connection?",
      options: [
        {
          label: "A second small always-on server that only holds the broker socket",
          appeal:
            "Separates the feed from the engine, so an engine restart does not drop it. Simple to reason about.",
        },
        {
          label:
            "A serverless function that holds the socket only while the market is open and something is subscribed",
          appeal:
            "Survives engine restarts, costs nothing when idle, and its busy time matches the exchange's hours.",
        },
        {
          label: "Run the socket inside the engine process on the existing server",
          appeal:
            "No new component and no extra cost, since the server is already paid for.",
        },
        {
          label: "A managed streaming platform sized for thousands of connections",
          appeal:
            "Built for real-time feeds, with scaling and monitoring supplied.",
        },
      ],
      best: 1,
      verdict:
        "Two constraints decide it: the feed must outlive engine restarts, and spend must stay near zero. Running inside the engine fails the first. A second always-on server pays for about 81 percent idle time. A managed streaming platform is built for a far larger load than one trader. A function that streams only when the exchange is open and someone is subscribed meets both, at the cost of a lease so that only one run holds the socket.",
      claims: [
        {
          text: "You accept an extra moving part and a lease, so that only one function run holds the broker socket at a time.",
          axis: "trade",
          correct: true,
          note: "True. A function that restarts or overlaps could open two sockets, so something must say who is the holder. That is the price of the pattern.",
        },
        {
          text: "You give up the zero-extra-component simplicity of running the feed inside the engine.",
          axis: "trade",
          correct: true,
          note: "True, and it is deliberate: that simplicity is the thing that loses ticks whenever the engine restarts.",
        },
        {
          text: "You are choosing serverless because pay-per-use is always cheaper than a fixed server.",
          axis: "trade",
          correct: false,
          note: "Wrong reasoning. It wins here because utilisation is about 19 percent and the feed must survive restarts, not because pay-per-use is always cheaper.",
        },
        {
          text: "If the holder dies silently, subscribers see no ticks, so a stale-feed check during market hours is needed.",
          axis: "failure",
          correct: true,
          note: "True. Splitting the feed away from the engine does not remove silent stalls. It changes where you must watch for them.",
        },
        {
          text: "Because the function is serverless, it cannot fail while the market is open.",
          axis: "failure",
          correct: false,
          note: "False. Serverless removes server upkeep, not failure. The socket can still drop, the broker can reject the token, or the lease can be mishandled.",
        },
        {
          text: "Messages delivered per day and the time since the last tick during market hours.",
          axis: "measure",
          correct: true,
          note: "Correct. The first is what you pay for and the second is whether the feed is alive.",
        },
        {
          text: "Average CPU on the engine's server, as the main signal that the feed is healthy.",
          axis: "measure",
          correct: false,
          note: "The engine's CPU says nothing about whether ticks are arriving. A feed can be dead while that CPU looks calm.",
        },
      ],
    },
    {
      id: "sd-cost-capacity-fanout-bill",
      scenario:
        "A broker's web app has 50,000 users watching live prices at once during the 22,500-second session. Each user's screen shows 20 instruments, each updating about once a second. The team uses a managed WebSocket service that bills per message. Sending one message per instrument tick per user would be 50,000 times 20 times 22,500, or about 2,250 crore messages a day. The team has twelve engineers including two on infrastructure, and a one-second freshness target. What do you do?",
      options: [
        {
          label: "Keep one message per tick per user on the managed service and negotiate the price",
          appeal:
            "Zero engineering effort and the code is already written.",
        },
        {
          label:
            "Batch each user's 20 instruments into one frame a second, still on the managed service",
          appeal:
            "Cuts the message count twenty-fold with a small code change and no new infrastructure.",
        },
        {
          label:
            "Run your own fan-out servers, each holding a few thousand connections, with per-connection batching",
          appeal:
            "Replaces a per-message bill with a flat server cost, and the fleet can be sized to the connection count.",
        },
        {
          label: "Poll for a snapshot every ten seconds instead of streaming",
          appeal:
            "Reduces messages by another factor of ten and avoids long-lived connections altogether.",
        },
      ],
      best: 2,
      verdict:
        "Batching helps, but after it the load is still 50,000 times 22,500, about 112 crore messages a day, and a per-message bill at that volume is large and grows with every new user. With twelve engineers able to run a small fleet and a one-second freshness target, a flat-cost fan-out fleet with batching is the cheaper shape. Ten-second polling breaks the freshness target. Doing nothing leaves a twenty times larger bill.",
      claims: [
        {
          text: "You trade a per-message bill that grows with users for a fleet you must size, patch and operate.",
          axis: "trade",
          correct: true,
          note: "True. Cost moves from variable to fixed, and operating effort moves onto your team.",
        },
        {
          text: "Batching alone lowers the cost to something that no longer scales with users.",
          axis: "trade",
          correct: false,
          note: "Batching cuts the message count by about twenty times, but the bill still grows linearly with users. The unit that multiplies is still connections.",
        },
        {
          text: "Slower polling saves money without giving anything up.",
          axis: "trade",
          correct: false,
          note: "It gives up the one-second freshness the product promises. A saving that breaks the requirement is not a trade-off, it is a different product.",
        },
        {
          text: "A slow client behind one server can back up that server's queue, so each connection needs a bounded buffer and a drop policy.",
          axis: "failure",
          correct: true,
          note: "True. Owning the fleet means owning slow-consumer handling, which the managed service otherwise hides.",
        },
        {
          text: "A burst at 09:15 can exceed the average load, so the fleet must be sized for the open, not the session average.",
          axis: "failure",
          correct: true,
          note: "True. Capacity is set by the peak; sizing for the average fails exactly when users arrive.",
        },
        {
          text: "Messages per connection per second, and the cost per thousand connections.",
          axis: "measure",
          correct: true,
          note: "Correct. These are the two numbers that tell you whether batching and the fleet are doing their job.",
        },
        {
          text: "The total number of registered users, as the figure that drives cost.",
          axis: "measure",
          correct: false,
          note: "Registered users who are not connected cost nothing in messages. Concurrent connections are the multiplier.",
        },
      ],
    },
    {
      id: "sd-cost-capacity-backtest-queue",
      scenario:
        "A beta has 15 users on one 8 GB server that also runs live strategies. An options backtest takes about 5 minutes and up to 3 GB of memory. Around 10 users press Run within ten minutes after the close, and beta users accept waiting up to an hour. Live strategies must not be disturbed, and the budget is close to zero. What is the right capacity plan?",
      options: [
        {
          label:
            "Keep one worker, show each user their queue position, and cap each user to one job in flight",
          appeal:
            "Keeps memory bounded and live trading safe, costs nothing, and the longest wait is about 45 minutes.",
        },
        {
          label: "Raise to ten workers so that nobody waits",
          appeal:
            "Removes all waiting and uses the server fully, at least on paper.",
        },
        {
          label: "Run three workers, since three times 3 GB is only 9 GB and the system is mostly idle",
          appeal:
            "Cuts the longest wait to about 15 minutes with a modest change.",
        },
        {
          label: "Rent a much larger server around the clock so that all ten run together",
          appeal:
            "Solves the wait entirely and leaves room for growth.",
        },
      ],
      best: 0,
      verdict:
        "Ten workers need 30 GB and three need 9 GB, both above the 8 GB the server has, and an out-of-memory kill would take live strategies down with the backtests. Renting a large server around the clock pays all day for a peak that lasts under an hour, against a near-zero budget. One worker means the tenth user waits about 45 to 50 minutes, which is inside the stated tolerance, so a visible queue is the cheapest honest answer.",
      claims: [
        {
          text: "You accept up to an hour of waiting at the peak in exchange for memory that cannot be exhausted by backtests.",
          axis: "trade",
          correct: true,
          note: "True, and the tolerance stated in the scenario is what makes it acceptable.",
        },
        {
          text: "You are choosing a single worker because queues are always better than parallel work.",
          axis: "trade",
          correct: false,
          note: "No. It is chosen because memory is the first bottleneck and is shared with live trading, not as a general rule.",
        },
        {
          text: "Raising workers beyond what memory allows turns a wait into an out-of-memory kill that can stop live strategies.",
          axis: "failure",
          correct: true,
          note: "True. The danger of more parallelism here is not slowness but a failure that spreads to the live path.",
        },
        {
          text: "A cancelled job that still holds the worker can make the displayed queue position wrong.",
          axis: "failure",
          correct: true,
          note: "True. Cancellation is cooperative, so a row can read cancelled while the worker is still busy. The position must be derived from jobs actually in flight.",
        },
        {
          text: "If the queue is full, the system will automatically use free capacity on a second server.",
          axis: "failure",
          correct: false,
          note: "There is no second server in this plan. Assuming automatic spill-over is the kind of unstated capacity that never exists on the day.",
        },
        {
          text: "Queue wait time at the peak, and peak resident memory during a backtest.",
          axis: "measure",
          correct: true,
          note: "Correct. Wait time tells you when users start to suffer, and memory tells you how many workers could ever fit.",
        },
        {
          text: "The count of users who registered this week, as the main capacity signal.",
          axis: "measure",
          correct: false,
          note: "Registrations are not load. Jobs submitted at the same time are what fills the queue.",
        },
      ],
    },
  ],
};

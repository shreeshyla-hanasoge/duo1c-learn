import type { Topic } from "../../types.ts";

export const sdServiceBoundaries: Topic = {
  id: "sd-service-boundaries",
  title: "Service boundaries: monolith, services and the shared database",
  tier: 6,
  week: 11,
  depth: "deep",
  summary:
    "A boundary costs a network call, a version contract and a new way to fail. Draw one only where deploy, scale, failure or ownership truly differ.",
  why: "Traed is three services over one MySQL schema, written in PHP, Python and Node (the repository's docs still count a retired fourth). Engineers and investors will ask why it is not one app, or why it is not fully separate services. You need the vocabulary: modular monolith, shared database, polyglot cost, synchronous call. You also need an honest answer for each of Traed's cuts, including the ones that exist for failure isolation and the ones that exist only because of the languages involved.",
  learn: {
    intuition:
      "Think of a restaurant kitchen. In one kitchen, the cook can ask the person at the next counter for salt and get it in two seconds. Now split the kitchen into separate stalls in a food court, each with its own door, its own stock and its own cashier. Each stall can close for repairs without stopping the others, and a fire in one stall stays in that stall. But now every request for salt becomes a walk across the court, and sometimes the other stall is shut. A boundary is that wall between stalls. It buys you independence: separate repairs, separate growth, separate failures, separate owners. It costs you every conversation across the wall. The mistake is building walls because walls look tidy. A wall is worth its price only when the two sides really do need to change, grow or fail on their own. If they do not, you have only made the kitchen slower.",
    mechanics: [
      {
        heading: "What a boundary is for: four reasons, and cost on every one",
        body: "A boundary is worth drawing for four reasons. Deploy: the two sides ship on different days. Scale: one side needs ten times the machines of the other. Failure: a crash or memory leak on one side must not take down the other. Ownership: different teams change them. If none of the four applies, the boundary only adds cost: a network call instead of a function call, a contract that must stay compatible across versions, and partial failure, where one side is up and the other is not. A function call returns in well under a microsecond and cannot time out. An HTTP call to another process takes around a millisecond or more and can hang.",
      },
      {
        heading: "The modular monolith: boundaries without a network",
        body: "A modular monolith is one deployable program with strict internal modules. Each module has a small public interface and hides its internals. You get most of the clarity of services, with one deploy, one debugger and in-process calls. It is the right default for a small team. Its limit is that everything shares one process, one memory and one language. Traed's strategy engine met that limit. A heavy options backtest and the live tick loop shared a process, and in production a backtest grew a Python process to about 4 GB on a 5.8 GB machine with no swap. The tick feed then sat dead for 21 hours. That is a good reason for a boundary.",
      },
      {
        heading: "The shared database is the strongest coupling there is",
        body: "Traed's Laravel app and its Python engine both read and write one MySQL schema called `traed`. Laravel migrations own the table definitions. The architecture document names an owner per table: `strategies` belongs to Laravel, `backtests` and `trades` to the engine. A shared database is convenient, since no API is needed to read a row. But the schema becomes the real contract, and it is easy to break by accident. One Laravel code comment records a case: a throwaway backtest strategy saved with the column default `is_active` true would be started as a live strategy by the engine on its next boot, because the engine starts every active row. A column default in PHP changed behaviour in Python.",
      },
      {
        heading: "Polyglot and synchronous calls: where the real costs sit",
        body: "Traed uses PHP for the web app, Python for the engine and Node for the serverless bridge. Each fits its job, but each extra language costs another set of tools and tests, and a rule needed in two places must be written twice. Traed reduces this by keeping the indicator definitions in one data file, `CMS/shared/indicators.json`, read by both the Vue builder and Laravel. Laravel calls the engine over synchronous HTTP with a Laravel-issued JWT or an `X-API-Key`. The engine returns a job id at once and the browser polls every 4 seconds, so no long job holds a connection open. A synchronous call that waits for a 10-minute job would be the mistake.",
      },
      {
        heading: "Saying it about Traed",
        body: "We run three services, and none of the splits was for fashion. The engine is separate from the web app because Python owns the numerical work and because live trading must not share a process with a heavy backtest, which we learned from an outage. The serverless bridge exists to fan ticks out to browser dashboards without loading the engine. All services share one MySQL schema, which keeps us simple at one server and one user, and we pay for it with an implicit schema contract. Laravel migrations own the tables. We would give the engine its own database, with an API for the data it needs, when a second team or a second engine host appears.",
      },
    ],
    complexityDerivation:
      "The invariant is that two sides should be separate only if they change, grow or fail for different reasons, and that every call across the line is coarse, rare and ready to fail. Cheap boundaries are the ones inside a program. Expensive ones add a network, a contract and a deploy order. That argument holds when the reasons are real. For Traed, the failure reason for the backtest pool is real: a separate process with its own memory stops a heavy job from killing the tick loop. The ownership reason is not real today, since one person owns every service. It stops holding in three situations. First, when two services must write the same table and nobody can say which one owns its meaning. Second, when you need more copies of one side than the other. The live engine is a singleton on one uvicorn worker, and the design notes say that adding workers would double-trade, so scale is blocked by state, not by the boundary. Third, when a second team arrives, since the shared schema forces them to coordinate every migration.",
    variants: [
      {
        name: "Modular monolith",
        when: "One small team, one deploy cadence, no part that needs its own scaling or failure domain.",
        delta:
          "Boundaries are modules and public interfaces inside one process. No network, no version skew, one database transaction can span modules. The risk is that discipline erodes and modules reach into each other's tables.",
      },
      {
        name: "Services over a shared database (Traed today)",
        when: "A few services, one owner, and a real reason to separate processes, such as language or failure isolation.",
        delta:
          "Each service is deployed on its own, but they read and write the same schema. Cheap joins and no API layer for data, but the schema is an unwritten contract and a migration can break another service.",
      },
      {
        name: "Database per service",
        when: "Separate teams, or one service needs very different storage or scale from the rest.",
        delta:
          "Each service owns its data and exposes it only through an API or events. Strong isolation, but you lose cross-service joins and transactions and must handle eventual consistency.",
      },
    ],
    tradeoffs: [
      {
        vs: "One big app",
        pick: "A separate engine process for live and backtest work",
        because:
          "The memory and CPU of a backtest must not starve a live tick loop. The cut is chosen for failure isolation, which is the reason that most clearly pays for a boundary.",
      },
      {
        vs: "An API between the web app and the engine for all data",
        pick: "A shared schema, for now",
        because:
          "With one server and one user, the schema is easier to share than to wrap in an API. You accept an implicit contract and plan to separate when a second team or a second host appears.",
      },
      {
        vs: "One language everywhere",
        pick: "PHP, Python and Node, each in its place",
        because:
          "Laravel gives a fast web app, Python the numerical libraries, Node the serverless bridge. The price is duplicated tooling, paid down by sharing definitions in one data file.",
      },
    ],
  },
  realWorld: [
    {
      system: "Shopify's modular monolith",
      kind: "industry",
      problem:
        "A very large commerce codebase needed clear ownership and boundaries without the operational cost of hundreds of services.",
      applied:
        "Shopify engineers have described keeping one large Rails application and enforcing component boundaries inside it, instead of splitting it into many deployed services.",
      evidence: "Shopify Engineering blog posts on modularity and the modular monolith",
      impact:
        "Shows that clear boundaries and one deploy can coexist, so 'separate services' is not the only way to get structure.",
    },
    {
      system: "Segment moving back from many services to one",
      kind: "industry",
      problem:
        "A set of per-destination services, each deployed separately, became slow to change and costly to operate for a small team.",
      applied:
        "Segment's engineers published an account of merging those services back into a single one, trading some isolation for easier testing and shipping.",
      evidence: "Segment engineering blog, 'Goodbye Microservices'",
      impact:
        "A reminder that a boundary is a cost you can take back when the reasons for it do not hold.",
    },
    {
      system: "Traed: the engine process and the backtest pool",
      kind: "yours",
      problem:
        "In June 2026 a heavy options backtest ran inside the live engine process, grew to about 4 GB, and starved the live tick listener for hours.",
      applied:
        "Backtests now run in a separate spawn-mode process pool with one job per child process, so their memory returns to the operating system after each job. Progress and cancellation flow through the shared database.",
      evidence: "strategy-engine/app/services/backtest_dispatch.py",
      impact:
        "A boundary drawn for failure isolation. The live loop no longer shares a heap with a backtest.",
    },
    {
      system: "Traed: three services over one schema",
      kind: "yours",
      problem:
        "A Laravel web app and a Python engine both need the same strategies, backtests and trades.",
      applied:
        "Both use one MySQL `traed` schema. Laravel migrations own the DDL, the engine only describes the tables, and the architecture document lists an owner service per table.",
      evidence: "ARCHITECTURE.md",
      impact:
        "No data API to maintain at one server and one user, in exchange for an implicit schema contract.",
    },
  ],
  insights: [
    {
      t: "Four reasons to draw a boundary",
      d: "Deploy, scale, failure, ownership. If none applies, the boundary adds a network call, a contract and partial failure for nothing.",
    },
    {
      t: "A shared database is the strongest coupling",
      d: "Convenient reads, but the schema is the real contract. A column default in one service can change behaviour in another.",
    },
    {
      t: "Modular monolith is the small-team default",
      d: "Strict modules, one deploy, in-process calls. Split out a process when memory, crashes or scale demand it, as Traed did for backtests.",
    },
    {
      t: "Never hold a connection for a long job",
      d: "Return a job id at once and poll. Traed polls every 4 seconds while the engine works in another process.",
    },
  ],
  pitfalls: [
    "Splitting into services because it looks modern, with one developer, one deploy and no scaling or failure reason. You pay for every network call and gain nothing.",
    "Sharing a database and assuming it is free. Without a named owner per table and a migration rule, one service's change silently breaks another.",
    "Duplicating a rule in two languages, such as indicator definitions in PHP and Python. They drift. Keep one data definition that both read.",
  ],
  quiz: [
    {
      q: "Which of these is a valid reason to put a boundary between two parts of a system?",
      options: [
        "A crash or memory leak in one part must not take down the other",
        "The two parts are written by one developer in the same style",
        "A diagram with more boxes looks more professional to investors",
        "Both parts use the same tables and the same release day",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The four valid reasons are deploy, scale, failure and ownership. Failure isolation is one: a separate process has its own memory and can crash alone.",
      distractors: [
        "",
        "One developer, one style and one deploy is a reason to keep things together, since a boundary adds cost with nothing in return.",
        "A busy diagram is not a reason. Boundaries are paid for with network calls and contracts, so they need a technical reason.",
        "Shared tables and one release day are reasons to stay together. They are the signs of a single unit.",
      ],
    },
    {
      q: "What is the main hidden risk when two services share one database schema?",
      options: [
        "The database cannot handle two connections at once",
        "The schema becomes an unwritten contract between them",
        "Each service must run on a different machine",
        "Queries are always slower than with an API",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A shared schema is convenient but it couples the services. A migration, a column default or a renamed field in one can change behaviour in the other.",
      distractors: [
        "Databases serve many connections at once. This is a normal use, not a limit.",
        "",
        "Shared databases are usually used because the services are on the same machine. Location is not the issue.",
        "Direct queries are normally faster than an extra HTTP hop. The problem is coupling, not speed.",
      ],
    },
    {
      q: "A two-person team runs a trading dashboard and an order service on one rented server. The order service sometimes crashes with out-of-memory errors. The dashboard must stay up. What is the smallest change that fits?",
      options: [
        "Split the code into ten small services with message queues",
        "Move both parts to separate data centres in two regions",
        "Run the order service as its own process with a memory limit",
        "Give each of the two people their own separate database",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The reason is failure isolation, so the smallest fix is a separate process with a memory limit. It costs one process boundary, not ten services.",
      distractors: [
        "Ten services multiply the network calls and failure modes. The problem has one cause, so one boundary is enough.",
        "Regions solve a different problem. The crash is about memory, and moving data centres would not stop it.",
        "",
        "People are not a reason for a database. Splitting data adds coordination cost and does nothing for the memory crash.",
      ],
    },
    {
      q: "Your web app calls an engine to run a backtest that takes 6 to 10 minutes. The web server times out HTTP requests after 60 seconds. How should the call work?",
      options: [
        "Raise the web server timeout to 15 minutes and wait for the result",
        "Retry the same request every 30 seconds until the engine answers",
        "Return a job id at once and let the browser poll for progress",
        "Send the result over email when the engine finishes",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A synchronous call that waits for a long job ties up connections and breaks on any hiccup. Returning an id and polling keeps each call short, as Traed does with a 4-second poll.",
      distractors: [
        "A 15-minute wait holds a worker and a connection open and fails on any network blip. It also hides progress from the user.",
        "Repeating the request could start the job many times. A retry is for a failed call, not for a long job.",
        "",
        "Email changes the product and gives no progress or cancel. The problem is the call shape, not the delivery channel.",
      ],
    },
    {
      q: "Your Laravel app saves a temporary strategy row for a backtest. The row's `is_active` column defaults to true, and your Python engine starts every active strategy when it boots. What happens after the next engine restart?",
      options: [
        "Nothing, since the backtest finished and the row is ignored",
        "The engine rejects the row because Laravel owns that table",
        "The database deletes the row because it was not committed",
        "The engine starts the throwaway strategy as a running one",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The engine reads the shared table and starts what is marked active. This is the cost of a shared database: a default set in one service changes behaviour in the other. Traed's Laravel code sets the flag explicitly for this reason.",
      distractors: [
        "The engine does not know the backtest finished. It reads only the flag, so the row is not ignored.",
        "The database has no concept of table ownership. Only the services' own code does, so nothing rejects the row.",
        "The row was committed when saved. Nothing deletes it, so it stays and is read at the next start.",
        "",
      ],
    },
    {
      q: "A small team on one server wants clear structure in its codebase and fast shipping. A friend says to split into microservices. Which answer fits best?",
      options: [
        "Agree, since services always give clearer structure",
        "Put the code in one program but enforce modules with small public interfaces",
        "Wait until you have ten engineers, then rewrite everything at once",
        "Give every database table to a different service on day one",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A modular monolith gives structure without a network. You can later pull a module out into its own process for a real reason, such as failure isolation.",
      distractors: [
        "Services give structure at a price: network calls, versioned contracts and partial failure. A small team gets the cost without the benefit.",
        "",
        "A big-bang rewrite is risky and unneeded. Modules inside one program can be tightened step by step.",
        "Splitting tables across services on day one forces cross-service calls for every join, before any need has appeared.",
      ],
    },
    {
      q: "An investor asks why Traed's live engine is a single process on one worker instead of several. Which reply is most accurate?",
      options: [
        "A second worker would trade the same strategies twice, so state blocks scale",
        "Python cannot run more than one process on a single server",
        "More workers would exceed the MySQL connection limit at once",
        "The team has not yet learned about scaling out across servers",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Live strategies and positions live in memory inside one singleton. More workers would double-trade unless that state is moved or partitioned first. The limit is about state, not about the boundary.",
      distractors: [
        "",
        "Python runs many processes easily. The backtest pool itself is a process pool, so this is plainly false.",
        "The connection limit is a tuning matter, not the reason. The real block is duplicated live state.",
        "This sounds modest, but it is not the reason. The singleton is a known and documented limit.",
      ],
    },
    {
      q: "A company of 40 engineers in four teams has 14 services sharing one database. Releases need all four teams to agree, and one schema change broke two other services last week. What is the best next step?",
      options: [
        "Add a fifteenth service whose job is to coordinate the other fourteen",
        "Remove the tests so that each release can go out a little faster",
        "Rewrite each service in a different programming language this year",
        "Give each service its own tables and share data only through APIs",
      ],
      answer: 3,
      difficulty: "judge",
      why: "The breakage comes from shared tables, so data ownership has to become explicit. At this size and team count, a database per service is worth its cost, which is cross-service joins and eventual consistency.",
      distractors: [
        "A coordinator adds more calls and more places to fail, and the shared tables remain the cause.",
        "Removing tests hides breakage instead of preventing it, so the next schema change breaks more.",
        "A new language per service adds tooling cost and does nothing for the coupling through the tables.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-service-boundaries-regime-module",
      scenario:
        "A solo founder runs a Laravel web app and a Python engine on one rented server, with one daily user. A new chart panel needs a market-regime label computed from minute bars. One request costs about 50 milliseconds of CPU and runs only when the user opens the page. The engine already has the candle data in memory. Where should the code live?",
      options: [
        {
          label: "A new service with its own database and a message queue",
          appeal: "It looks clean and independent, and it could scale on its own later.",
        },
        {
          label: "A module inside the engine with one small public function",
          appeal: "The data is already there, the call is in-process, and there is nothing new to deploy.",
        },
        {
          label: "Rewrite it in PHP inside the Laravel app",
          appeal: "The web app is where the page lives, so the call would be local to it.",
        },
        {
          label: "A separate serverless function called over HTTP",
          appeal: "It scales to zero when unused and costs nothing between visits.",
        },
      ],
      best: 1,
      verdict:
        "None of the four boundary reasons applies. The work is short, the data is already in the engine, there is one user and one owner. A module with a narrow interface gives structure without a network. A new service or function adds a call, a contract and a way to fail for no gain, and PHP would need the candle data copied across.",
      claims: [
        {
          text: "You accept that the module cannot be deployed or scaled on its own.",
          axis: "trade",
          correct: true,
          note: "True. Staying in-process means one deploy and one memory space. At one user that costs nothing.",
        },
        {
          text: "You give up any chance of moving it into its own service later.",
          axis: "trade",
          correct: false,
          note: "A module with a small public interface is the easy thing to extract later. Keeping the interface narrow is what preserves that option.",
        },
        {
          text: "If the work grows to seconds of CPU or large memory, it becomes a failure-isolation case and should move to a separate process.",
          axis: "failure",
          correct: true,
          note: "True. This is the exact condition under which the decision expires, the same lesson as the backtest pool.",
        },
        {
          text: "A bug in the module can corrupt the web app's login sessions.",
          axis: "failure",
          correct: false,
          note: "The module runs in the engine, which does not own web sessions. A bug there can slow the engine, not corrupt Laravel's sessions.",
        },
        {
          text: "The time the call takes, and whether live tick handling slows while the page is open.",
          axis: "measure",
          correct: true,
          note: "Both sides of the trade. The call cost shows if the work is growing and tick delay shows if it is hurting the live loop.",
        },
        {
          text: "Memory use of the engine process before and after a few hundred page opens.",
          axis: "measure",
          correct: true,
          note: "A leak or slow growth is the signal that this module no longer belongs in the shared process.",
        },
        {
          text: "The number of services, since fewer is always better.",
          axis: "measure",
          correct: false,
          note: "Service count is not the goal. The decision rests on deploy, scale, failure and ownership, not on a count.",
        },
      ],
    },
    {
      id: "sd-service-boundaries-report-isolation",
      scenario:
        "A trading engine runs live strategies on one 6 GB server with no swap. A monthly performance report loads several GB of history into memory. The last time it ran inside the live process, the process grew to about 4 GB and tick handling stalled for hours. One developer maintains everything. What do you do about the report?",
      options: [
        {
          label: "Buy a bigger server so both fit",
          appeal: "No code change, and the problem seems to go away.",
        },
        {
          label: "Wrap the report in a timeout and an exception handler",
          appeal: "Cheap, quick, and it stops a report that runs forever.",
        },
        {
          label: "Run each report in its own short-lived worker process",
          appeal: "The report gets its own memory, which the system takes back when the job ends.",
        },
        {
          label: "Build a reporting microservice with its own database and a message broker",
          appeal: "Maximum isolation, and it can grow later.",
        },
      ],
      best: 2,
      verdict:
        "The reason is failure isolation on a small box with one developer. A worker process with one job per child gives the report its own heap and returns it to the system after each run. It costs one boundary and no new infrastructure. A bigger server only delays the next incident, and a timeout cannot protect the live heap from growth. A full microservice adds a broker and a database the team must now run.",
      claims: [
        {
          text: "You accept an extra process and a need to pass jobs and results through the database or a queue.",
          axis: "trade",
          correct: true,
          note: "True. Process isolation is not free, since arguments and results cross a process line and progress must be written somewhere both sides can read.",
        },
        {
          text: "A process pool is free of any added complexity.",
          axis: "trade",
          correct: false,
          note: "It adds startup cost, pickled arguments, and a new failure mode of a worker dying. It is cheaper than a service, not free.",
        },
        {
          text: "If the worker is killed for using too much memory, the parent must notice and mark the job failed, or the user waits forever.",
          axis: "failure",
          correct: true,
          note: "True. A hard kill gives the worker no chance to report, so the parent needs a completion callback that records the failure.",
        },
        {
          text: "An exception handler inside the same process will catch an operating-system out-of-memory kill.",
          axis: "failure",
          correct: false,
          note: "The kernel kills the process without running your handler. That is why the work needs its own process.",
        },
        {
          text: "Resident memory of the live process during a report run, and how late ticks are processed.",
          axis: "measure",
          correct: true,
          note: "These show the property you bought: the live process should stay flat while the report runs elsewhere.",
        },
        {
          text: "How many reports are waiting and how long each waits for the single worker.",
          axis: "measure",
          correct: true,
          note: "With one worker slot, jobs queue. Wait time is what you pay for the memory guarantee.",
        },
        {
          text: "The number of lines in the report module.",
          axis: "measure",
          correct: false,
          note: "Code size says nothing about whether the boundary is protecting the live loop.",
        },
      ],
    },
    {
      id: "sd-service-boundaries-broker-platform",
      scenario:
        "A broking platform has 60 engineers in six teams: orders, risk, portfolio, reports, onboarding, payments. All share one MySQL database. At 09:15, when the market opens, a long report query slows order inserts. Every schema change needs sign-off from all six teams, so releases happen once a fortnight. What is the best direction?",
      options: [
        {
          label: "Give each team's service its own schema, share data through APIs and events, and feed reports from a copy",
          appeal: "Removes the shared contract and takes report load off the order path.",
        },
        {
          label: "Keep the shared database and add a weekly cross-team meeting",
          appeal: "No engineering work, and everyone hears about every change.",
        },
        {
          label: "Rewrite everything as forty small services over the next year",
          appeal: "A clean break from the past, with maximum independence.",
        },
        {
          label: "Run the report queries only after 03:00",
          appeal: "A one-line change that avoids the 09:15 clash.",
        },
      ],
      best: 0,
      verdict:
        "With six teams, the ownership and deploy reasons are now real, and the shared schema is the cause of both problems. Giving each service its own data and feeding reporting from a copy fixes the slow inserts and the sign-off bottleneck together. The meeting adds delay, the rewrite is a year of risk, and moving the report hides one symptom while migrations stay blocked.",
      claims: [
        {
          text: "Reports will lag behind orders by seconds or minutes, because they read a copy.",
          axis: "trade",
          correct: true,
          note: "True. A reporting copy is eventually consistent. That is acceptable for reports and not for order state.",
        },
        {
          text: "You lose cross-team joins and single transactions that span services.",
          axis: "trade",
          correct: true,
          note: "True. Once data is split, a join becomes an API call or an event, and a transaction across services is no longer available.",
        },
        {
          text: "You keep full cross-service transactions, so nothing changes for code that updates orders and risk together.",
          axis: "trade",
          correct: false,
          note: "Separate databases cannot share one transaction. Such code needs redesign, for example around events and retries.",
        },
        {
          text: "Events may arrive twice or late, so consumers must tolerate duplicates and lag.",
          axis: "failure",
          correct: true,
          note: "True. Delivery between services is at least once in practice, so consumers must be idempotent.",
        },
        {
          text: "If the reporting service goes down, orders can no longer be placed.",
          axis: "failure",
          correct: false,
          note: "Separating data was meant to prevent exactly this. Orders no longer depend on reports being up.",
        },
        {
          text: "The 99th-percentile order insert time around 09:15, and how far the reporting copy trails the orders.",
          axis: "measure",
          correct: true,
          note: "The first shows the problem you set out to fix and the second shows the cost of the fix.",
        },
        {
          text: "The number of tables in each service's schema.",
          axis: "measure",
          correct: false,
          note: "Table count says nothing about order latency or release speed. Measure what the change was meant to improve.",
        },
      ],
    },
  ],
};

import type { Topic } from "../../types.ts";

export const sdPlatformAnatomy: Topic = {
  id: "sd-platform-anatomy",
  title: "Anatomy of a trading platform",
  tier: 1,
  week: 1,
  depth: "deep",
  summary:
    "Every trading platform has the same five boxes. A hedge fund and a retail algo differ in size and speed, not in shape. C4 draws them at four zoom levels.",
  why: "When you talk about Traed with an engineer, an investor or a co-founder, the first question is always 'what are the parts?'. If you answer with a list of folders and frameworks, you lose them. If you answer with the five boxes every trading system has, and then show where yours differ, you sound like someone who has seen the pattern before. This lesson gives you those boxes, the C4 way of drawing them, and how Traed fits.",
  learn: {
    intuition:
      "Picture a busy restaurant kitchen. Orders come in from the dining room. One person watches what ingredients arrived this morning. A chef decides what to cook. A manager checks that the order is sensible and that the kitchen is not overcommitted. A ledger records everything that was cooked and sold. And a window lets staff see the state of the kitchen and call for help. A street stall and a five-star hotel kitchen look very different. The stall has one person doing all five jobs. The hotel has a team for each. But the jobs are the same five, and the hotel did not invent a sixth. A trading platform is the same. Market data comes in, a decision is made, an order is checked and sent, everything is stored, and people can see and control it. Once you can name the five jobs, any trading system, however big, becomes readable, and you can say clearly which jobs your own system does with one person and which it hands to someone else.",
    mechanics: [
      {
        heading: "The five boxes",
        body: "First, market data: the feed of prices and option-chain rows, turned into one internal format. Second, strategy or decision: rules that read data and produce signals such as 'buy one lot'. Third, order management and risk: checks a signal against limits, sends the order, tracks its state, and records fills. Fourth, persistence: the durable record of strategies, orders, trades and history. Fifth, user interface and operations: screens, alerts and controls that humans use. Take one NIFTY tick. It enters box one, feeds a candle in box two, becomes a signal, passes the checks in box three, is stored by box four, and appears on a screen from box five.",
      },
      {
        heading: "Arrows matter more than boxes",
        body: "Data flows one way, from market data to decision to orders. Control flows back as fills and positions. The most useful rule is that the decision box never talks to the broker directly. Every order goes through order management and risk, so limits are enforced in one place, outside strategy code. If strategies could call the broker themselves, you would need to re-check every strategy for every limit. Another rule is that the interface box reads state and sends commands but does not decide. A phone screen that can place trades creates a second route to the broker, and that is why monitoring-only screens are a common first step.",
      },
      {
        heading: "Drawing it with C4",
        body: "C4 is a way to draw the same system at four zoom levels. Context shows your system as one box among the people and external systems around it: the trader, the broker, the market-data feed. Containers show the separately running parts inside it: a web app, an API service, a database, a queue. Components show the parts inside one container. Code is the last level and is rarely drawn. Use the level that matches the audience. An investor needs context. A new engineer needs containers. Someone changing the order path needs components. Mixing levels in one picture is the most common drawing mistake.",
      },
      {
        heading: "Same shape, different size",
        body: "A firm trading from a server in the exchange's data centre has the same boxes as a retail algo, but each is built for microseconds, with its own team and standby copy. LMAX, a London exchange, published a design in which one thread handled the business logic for every order. A retail platform in India talks to NSE through a broker's API over the internet, so it works in hundreds of milliseconds, and the broker supplies the exchange connection and much of the risk. Traed sits at the small end. It runs on one server, trades minute bars, and merges several boxes into one process. Fewer people and slower markets let several boxes share one process.",
      },
      {
        heading: "Saying it about Traed",
        body: "We have the five boxes. Market data is a direct broker socket inside the engine, with a serverless relay that fans the same ticks out to browser dashboards. Decision and order management run together in one Python engine, with risk checks in the order path. Persistence is one MySQL schema with Redis beside it. The interface is a Laravel and Vue web app. We chose to share one process and one database because we have one user and one server, and splitting would add coordination we do not need yet. The cost is that a heavy job can compete with the live path, so backtests run in a separate process pool. We would split services when a second team or a second tenant needs independent deploys.",
      },
    ],
    complexityDerivation:
      "The five-box split works because each box changes for a different reason and fails in a different way. Market data changes when a broker changes its feed. Decisions change every time you have a new idea. Order management changes when rules or brokers change. Storage changes with the schema. Screens change with what operators want to see. Separate reasons to change are the classic argument for separate modules. The deeper invariant is that money-moving actions pass through one controlled path, so the checks that protect the account cannot be bypassed by a bug in a strategy. That invariant is what you protect when you draw boundaries. The split stops being the right answer when the boundaries cost more than they save. A single developer pays for every extra service in deploys, monitoring and network failures, so the boxes can stay as modules inside one process, with clean interfaces between them. At the other extreme, when latency is measured in microseconds, a network hop between boxes is too slow, so firms put several boxes on one machine, even one thread. In both cases the boxes still exist as ideas, even when they are not separate programs.",
    variants: [
      {
        name: "One process, boxes as modules",
        when: "One developer or a small team, one user, one server. Traed's engine is closest to this.",
        delta:
          "Boxes are packages with clear interfaces. Deploys are simple and calls are cheap, but a heavy job in one box can slow the others.",
      },
      {
        name: "A service per box",
        when: "Several teams, or boxes with very different scaling and failure needs, as at a large broker.",
        delta:
          "Each box deploys and scales on its own, at the cost of network calls, version drift between services and more monitoring.",
      },
      {
        name: "Single-threaded core with a journal",
        when: "Latency-critical venues and firms that need a deterministic, replayable order path.",
        delta:
          "Order logic runs on one thread, fed by an ordered input stream and a durable log. It is very fast and replayable, but the design is demanding to build.",
      },
    ],
    tradeoffs: [
      {
        vs: "Separate services per box",
        pick: "Modules in one engine process, plus a separate pool for heavy backtests",
        because:
          "With one user and one server, separate services add network failures and deploy steps without adding any capacity. You give up independent scaling and accept that the engine is a single process to protect.",
      },
      {
        vs: "A shared database for every service",
        pick: "One shared schema, with one service owning each table's changes",
        because:
          "A shared schema keeps data consistent and queries simple. The cost is coupling: a schema change needs every reader updated, which is manageable for one developer and painful with many.",
      },
      {
        vs: "Running your own feed servers",
        pick: "A managed serverless socket bridge and fan-out",
        because:
          "It removes servers to patch and keep alive and scales with connections. The price is a hard dependency on the cloud provider and per-message costs that grow with the number of subscribers.",
      },
    ],
  },
  realWorld: [
    {
      system: "The LMAX exchange architecture",
      kind: "industry",
      problem:
        "A retail FX exchange in London needed very high order throughput with predictable latency and full recoverability.",
      applied:
        "LMAX published that its business logic ran on a single thread, fed by ring buffers and an input log, with the other boxes around it. Martin Fowler's write-up reports that one thread handled around six million orders per second. Market data, risk, matching and persistence were still separate jobs, only arranged for speed.",
      evidence: "Martin Fowler, 'The LMAX Architecture' (2011)",
      impact: "It shows the same boxes at the far end of the performance range.",
    },
    {
      system: "The C4 model for software architecture",
      kind: "industry",
      problem:
        "Architecture diagrams mix levels and audiences, and nobody can tell what a box or an arrow means.",
      applied:
        "Simon Brown's C4 model names four levels (context, containers, components, code) and asks each diagram to stay at one level, with labelled boxes and arrows. Many teams use it to keep a short set of diagrams that stay accurate.",
      evidence: "Simon Brown, The C4 model for visualising software architecture (c4model.com)",
      impact: "A fixed vocabulary makes your Traed diagrams readable to an engineer who has never seen the code.",
    },
    {
      system: "Traed's context and container diagrams",
      kind: "yours",
      problem:
        "Three cooperating services and two data stores need to be explained to a person in a few minutes.",
      applied:
        "The design document draws a C4 context diagram (trader, admin, the cron scheduler, the Kite broker, the market-data WebSocket, S3 for backups) and a container diagram (Vue and Inertia app, Laravel, Horizon worker, the engine with its backtest process pool and live singleton, MySQL, Redis, the serverless dashboard relay). The live engine is drawn again at component level.",
      evidence: "docs/HLD.md; docs/LLD.md",
      impact: "The same system can be explained at investor, engineer and maintainer levels from three diagrams.",
    },
    {
      system: "Traed's mode-swappable order and data interfaces",
      kind: "yours",
      problem:
        "Backtest, paper and live trading must share the decision box but differ in where data comes from and where orders go.",
      applied:
        "The engine defines a data-provider interface and an order-executor interface. Backtest replay, paper and live each plug in their own implementation, so the same strategy executor runs against historical data, simulated fills or the real broker.",
      evidence:
        "strategy-engine/app/services/execution_modes/interfaces.py; ARCHITECTURE.md section 7",
      impact:
        "The boundary between the decision box and the data and order boxes is an interface, not a network call.",
    },
  ],
  insights: [
    {
      t: "Five boxes: data, decide, order and risk, store, operate",
      d: "Every trading system has them. Size, speed and team decide whether they are modules, services or threads.",
    },
    {
      t: "All orders go through one controlled path",
      d: "Strategies emit signals. Order management and risk turns a signal into an order. Limits live there, not inside each strategy.",
    },
    {
      t: "C4: context, containers, components, code",
      d: "One diagram, one level, one audience. Investors get context, engineers get containers, maintainers get components.",
    },
    {
      t: "Small is a choice, not a defect",
      d: "Sharing a process and a schema because you have one user and one server is a sound design, provided you say what it costs and when you would split.",
    },
  ],
  pitfalls: [
    "Describing the system as a list of technologies (Laravel, FastAPI, MySQL) instead of the jobs it does, so the listener cannot see the shape.",
    "Letting strategy code call the broker directly, which scatters risk checks across every strategy.",
    "Drawing context, containers and components in one diagram, so neither the investor nor the engineer can read it.",
  ],
  quiz: [
    {
      q: "In a trading platform, which box checks an order against limits before it reaches the broker?",
      options: [
        "Order management and risk",
        "Strategy and decision logic",
        "The market data feed handler",
        "The persistence and storage layer",
      ],
      answer: 0,
      why: "Order management and risk sits between a signal and the broker. It enforces limits, sends the order and tracks its state, so the checks live in one place.",
      difficulty: "recall",
      distractors: [
        "",
        "Tempting because the strategy knows what it wants. Strategies emit signals, and a bug there should not be able to bypass limits.",
        "Tempting because prices drive limits such as exposure. The market data box supplies prices but does not decide what is allowed.",
        "Tempting because stored positions are used in checks. Persistence only records state and does not make decisions.",
      ],
    },
    {
      q: "You want a Telegram message every time a live order fills. Which box should send it, and where does it get the news?",
      options: [
        "Market data, from the tick that moved the price",
        "Operations, listening to fill events from order management",
        "Persistence, by scanning the database every minute for new rows",
        "Strategy, which should message the trader after each decision it makes",
      ],
      answer: 1,
      why: "Alerts are an operations concern. They should listen to events from order management, the box that learns of fills, and should not add work to the decision path.",
      difficulty: "apply",
      distractors: [
        "Tempting because a price move often comes with a fill. A tick is not a fill, and market data does not know about orders.",
        "",
        "Tempting because the row exists once stored. Scanning adds delay and load, and persistence is a record, not an event source.",
        "Tempting because the strategy placed the order. A decision is not a fill, and it should not own notifications.",
      ],
    },
    {
      q: "You must show a prospective investor which outside systems Traed depends on: the broker, the market-data WebSocket and the backup storage. Which C4 diagram is the right one?",
      options: [
        "Code, because it names the exact classes that call each system",
        "Component, because it shows the parts inside the engine",
        "Context, because it shows the system as one box among the outside systems",
        "Container, because it shows each database and queue",
      ],
      answer: 2,
      why: "The question is about the outside world around one system. That is the context diagram. Containers and components show the inside, which the investor does not need yet.",
      difficulty: "apply",
      distractors: [
        "Tempting because more detail feels more convincing. Code-level detail hides the answer to the question being asked.",
        "Tempting because the engine is the heart of the system. Components zoom into one container, not out to its neighbours.",
        "",
        "Tempting because containers include databases. They show the internal parts, while the question is about external dependencies.",
      ],
    },
    {
      q: "A developer proposes letting each strategy call the broker's order API directly, to remove one hop and make orders faster. What is the best response?",
      options: [
        "Agree, since one fewer hop always reduces risk of failure",
        "Agree, if each strategy copies the limit checks into its own code",
        "Agree for small strategies, and keep the shared path for big ones",
        "Decline, keep one order path so limits, state and records are enforced once",
      ],
      answer: 3,
      why: "On a minute-bar system the extra hop costs microseconds inside one process. Many routes to the broker mean many places to enforce limits and track order state, and one gap is enough to cause a loss.",
      difficulty: "judge",
      distractors: [
        "Tempting because fewer hops sounds safer. It removes a hop that is cheap and adds a risk that is expensive.",
        "Tempting because copying looks like a fix. Duplicated checks drift apart over time and one strategy will eventually miss one.",
        "Tempting as a compromise. Size does not decide it, and two paths mean two sets of behaviour to test and explain.",
        "",
      ],
    },
    {
      q: "In the C4 model, what is a 'container'?",
      options: [
        "A separately deployable part, such as a web app, service or database",
        "A Docker image, and only things that are packaged as images",
        "A group of classes inside one program that share a purpose",
        "The outermost box that holds the whole system and its users",
      ],
      answer: 0,
      why: "In C4, a container is a runnable or deployable unit such as a web app, a service, a database or a queue. The word has nothing to do with Docker, although a container may run in one.",
      difficulty: "recall",
      distractors: [
        "",
        "Tempting because of the shared word. C4 containers may be plain processes on a VM, as in Traed's production setup.",
        "Tempting because it sounds like grouping. That is a component, one level further in.",
        "Tempting because it sounds like the biggest box. That is the system context level.",
      ],
    },
    {
      q: "Traed's strategy executor and its order manager run inside the same Python process. What does that say about the architecture?",
      options: [
        "The design is wrong, because each box must be its own service",
        "Boxes are logical: here they are modules with a clear interface",
        "Order management is not a separate concern in this system",
        "The order manager must be slow because it shares a process with the strategy",
      ],
      answer: 1,
      why: "Boxes describe jobs, not deployments. A box can be a module in a shared process when the team is small and the speed needed is modest. What matters is that the interface between them is clear.",
      difficulty: "apply",
      distractors: [
        "Tempting from a microservices mindset. Splitting is a cost, and it only pays when the benefits are needed.",
        "",
        "Tempting because the code is in one place. The jobs are still different, and order management still has its own classes and state.",
        "Tempting because sharing resources sounds slow. The cost is contention, not an automatic slowdown, and it is small at minute-bar scale.",
      ],
    },
    {
      q: "It is 09:20 on a trading day. The engine answers its health check, strategies are running, but no trades have been placed and the screens show no price movement. Which box do you suspect first?",
      options: [
        "Persistence, because the database may be full or very slow",
        "Order management, because it may be blocking every order",
        "Market data, because nothing can act without ticks arriving",
        "The interface, because the screens may simply be out of date",
      ],
      answer: 2,
      why: "Data flows from market data to decision to orders. With no prices moving, the first thing to check is whether ticks are arriving at all. A healthy health check only proves the process is alive.",
      difficulty: "apply",
      distractors: [
        "Tempting because a full disk is a classic failure. It would more likely show errors, not just silence.",
        "Tempting because blocked orders also mean no trades. It would not stop prices moving on screen.",
        "",
        "Tempting because stale screens are common. Strategies are also silent, so the problem is upstream of the screen.",
      ],
    },
    {
      q: "Three services in a one-user, one-server platform share a single database schema. A colleague says this is bad design and wants a database per service now. What is the sound judgment?",
      options: [
        "Split now, because shared databases always cause outages",
        "Split only the largest table, which solves most of the coupling",
        "Keep the shared schema, since it is simplest for one team, but name an owner for each table",
        "Move everything to one service so the question never arises",
      ],
      answer: 3,
      why: "A shared schema is a form of coupling, but with one team and one server it is also the simplest consistent design. The honest position is to keep it, record who owns each table, and say when you would split.",
      difficulty: "judge",
      distractors: [
        "Tempting because it repeats a popular rule. Per-service databases solve a team-scale problem this platform does not yet have.",
        "Tempting as a compromise. Splitting one table creates a distributed join and keeps most of the coupling.",
        "Tempting because one service is simplest of all. It throws away useful separation, such as heavy jobs running apart from live trading.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-platform-anatomy-loss-limit",
      scenario:
        "One developer, one server, one user. A live options platform has twelve strategies written as rule configurations. You are adding a daily loss limit: when the day's realised loss passes ₹25,000, no new entries may be sent. Strategies are added or edited every week. Where should the check live?",
      options: [
        {
          label: "In each strategy's own rules, as an extra condition",
          appeal: "It is simple and each strategy can have its own limit.",
        },
        {
          label: "In the order path, checked for every order before it is sent",
          appeal: "One place, applies to every strategy, cannot be forgotten when a new one is added.",
        },
        {
          label: "In the web screens, by disabling the start button after the limit",
          appeal: "The trader sees the limit and it needs no change to the engine.",
        },
        {
          label: "In a nightly job that stops strategies for the next day",
          appeal: "It is easy to schedule and runs outside market hours.",
        },
      ],
      best: 1,
      verdict:
        "With twelve strategies and weekly edits, the only reliable place for a firm-wide limit is the one path every order must take. Putting it in each strategy relies on remembering it every time. A button or a nightly job acts too late or can be bypassed by strategies that are already running.",
      claims: [
        {
          text: "You accept that the order path becomes a critical component that must be tested carefully, in exchange for one place where the limit is enforced.",
          axis: "trade",
          correct: true,
          note: "Concentrating a control means concentrating the testing. That is a good trade for a limit that protects the account.",
        },
        {
          text: "Per-strategy checks are better, because each strategy can then have a different limit and no shared code is needed.",
          axis: "trade",
          correct: false,
          note: "Per-strategy limits can exist as settings read by the shared check. Copying logic into every strategy is what makes it unreliable.",
        },
        {
          text: "A new strategy added next week is covered automatically, because it also sends orders through the same path.",
          axis: "failure",
          correct: true,
          note: "This is the main benefit. The limit does not depend on anyone remembering to add it.",
        },
        {
          text: "A bug in one strategy's rules can still cause a loss beyond the limit, because the limit cannot see its orders.",
          axis: "failure",
          correct: false,
          note: "The check sits in the order path, so it sees every order whatever the strategy's rules do.",
        },
        {
          text: "If the check needs realised loss and that figure is stale or wrong, the limit can fail to fire, so the figure's source must be trusted.",
          axis: "failure",
          correct: true,
          note: "A control is only as good as its inputs. The loss number should come from the order and fill records.",
        },
        {
          text: "How many orders were refused by the limit each day, and whether the loss figure matches the broker's own profit and loss.",
          axis: "measure",
          correct: true,
          note: "The first shows the control acts, the second shows its input is correct.",
        },
        {
          text: "The number of strategies, because more strategies mean more refusals.",
          axis: "measure",
          correct: false,
          note: "Strategy count says nothing about whether the control works. It could be zero refusals because it never fires.",
        },
      ],
    },
    {
      id: "sd-platform-anatomy-prop-firm",
      scenario:
        "A proprietary trading firm has 12 teams, each running its own strategies in Python, C++ and Java, on equity and futures, through three brokers. Today every team has its own feed connection and order code. Management wants one view of firm-wide exposure and a firm-level kill switch, and teams complain about duplicated feed work and about several teams being rate-limited on the same feed. What architecture fits?",
      options: [
        {
          label: "Keep full stacks per team and ask teams to export positions each evening",
          appeal: "Teams stay independent and nothing needs to be built.",
        },
        {
          label: "Merge all teams into a single program run by one team",
          appeal: "One program means one set of boxes to maintain.",
        },
        {
          label: "A shared market-data service and a shared order and risk gateway, with strategies as clients of both",
          appeal: "Teams keep their strategy code and languages, while feed, limits and exposure live in one place.",
        },
        {
          label: "Let each strategy keep calling brokers directly but add a firm dashboard that reads the brokers' positions",
          appeal: "No changes to team code, and exposure becomes visible.",
        },
      ],
      best: 2,
      verdict:
        "The pain points are shared feed work, rate limits and firm-wide control. Those belong to the market-data and order-risk boxes, so those two are the ones to centralise. Strategies are the part teams differ in, so they stay separate. A dashboard shows exposure but cannot stop an order, and evening exports are too late.",
      claims: [
        {
          text: "You pay for two shared services that every team depends on, in exchange for one feed connection, one set of limits and a real kill switch.",
          axis: "trade",
          correct: true,
          note: "Shared services create a dependency, which is accepted because the shared concerns are the pain.",
        },
        {
          text: "Centralising makes the firm's feed free of rate limits, since it is only one connection.",
          axis: "trade",
          correct: false,
          note: "One connection cuts duplicate load, but limits still apply. The gateway must manage them for everyone.",
        },
        {
          text: "The shared order and risk gateway becomes a single point of failure for all teams, so it needs redundancy and clear failure behaviour.",
          axis: "failure",
          correct: true,
          note: "Centralisation concentrates failure as well as control. It needs a standby and a tested fail-closed rule.",
        },
        {
          text: "A dashboard that reads broker positions is enough to enforce firm limits, since it sees all exposure.",
          axis: "failure",
          correct: false,
          note: "Reading exposure is not controlling it. Without a gate in the order path, nothing stops a breach.",
        },
        {
          text: "Different languages across teams become a problem for the shared services, because they can only be used from one language.",
          axis: "failure",
          correct: false,
          note: "Services with network interfaces can be used from any language. This is a reason to prefer services here.",
        },
        {
          text: "Order latency through the gateway, and the time from a limit breach to the first refused order.",
          axis: "measure",
          correct: true,
          note: "One shows the cost the teams pay for centralising, the other shows the control works.",
        },
        {
          text: "Lines of code in each team's repository, as a measure of how much duplication was removed.",
          axis: "measure",
          correct: false,
          note: "Code size is a poor proxy. What matters is how many feed connections and risk implementations remain.",
        },
      ],
    },
    {
      id: "sd-platform-anatomy-mobile-view",
      scenario:
        "A one-person platform has a Laravel and Vue web app, an engine and MySQL on one server. The founder wants to check positions and profit from a phone during market hours. Building a native app is out of reach this quarter. The existing web app already reads positions and profit from the database. A mistaken tap that places a live order from a small screen would be costly. What should the phone view do?",
      options: [
        {
          label: "Read-only screens in the existing web app, with any live action sent back to the desktop",
          appeal: "It reuses the interface box and the stored state, adds no new route to the broker, and is cheap.",
        },
        {
          label: "A phone page that can also start and stop live strategies and place orders",
          appeal: "The founder has full control from anywhere.",
        },
        {
          label: "A new service on the server that talks to the broker directly for the phone",
          appeal: "It can be fast and independent of the web app.",
        },
        {
          label: "Email a daily report instead",
          appeal: "There is nothing to build on the phone and no risk.",
        },
      ],
      best: 0,
      verdict:
        "The need is to see, not to act. A read-only view reuses the interface box and the stored state, and keeps the single controlled path to the broker. Adding trade controls or a second route to the broker creates the exact risk the constraint warns about, and a daily email does not serve intraday checks.",
      claims: [
        {
          text: "You give up acting from the phone, in exchange for a view that cannot cause an accidental order.",
          axis: "trade",
          correct: true,
          note: "The limit is deliberate and cheap, and it removes the worst failure of a small screen.",
        },
        {
          text: "A read-only phone view is a worse design than a full one, because a trading platform should allow every action from every screen.",
          axis: "trade",
          correct: false,
          note: "Fewer actions on a small, hurried screen is a safety feature, not a missing feature.",
        },
        {
          text: "If the phone view reads stored state, it can be stale if the engine stops writing, so it should show when the data was last updated.",
          axis: "failure",
          correct: true,
          note: "A confident but old number is worse than a labelled one. A last-updated time makes staleness visible.",
        },
        {
          text: "A second service that talks to the broker would be safe, because it only reads positions.",
          axis: "failure",
          correct: false,
          note: "A second connection means a second set of credentials and rate-limit usage, and it can drift from the engine's own record.",
        },
        {
          text: "A phone page that can start live strategies adds a place where a mis-tap on a small screen triggers a real-money action.",
          axis: "failure",
          correct: true,
          note: "The order path cannot tell an accidental tap from an intended one, so the safest fix is not offering the action there.",
        },
        {
          text: "How old the displayed position is compared with the broker's, and how many phone page loads fail during market hours.",
          axis: "measure",
          correct: true,
          note: "Freshness and availability are what make a monitoring view useful.",
        },
        {
          text: "The number of phone visits per day, as the main sign of whether the view is correct.",
          axis: "measure",
          correct: false,
          note: "Usage shows interest, not correctness. A wrong number viewed often is still wrong.",
        },
      ],
    },
  ],
};

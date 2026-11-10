import type { Topic } from "../../types.ts";

export const sdMultiTenancy: Topic = {
  id: "sd-multi-tenancy",
  title: "Multi-tenancy: from one user to many",
  tier: 6,
  week: 11,
  depth: "deep",
  summary:
    "Many users can share one system if data, credentials, connections and limits are separated per user, and heavy work is shared fairly.",
  why: "Traed has one daily user today, but its data model, broker sessions and job queues were built with a second user in mind. Any investor or co-founder will ask what changes when ten traders share it. You need to answer in the right words: tenant isolation, per-tenant credentials, noisy neighbour, fair scheduling. And you need to say honestly which parts are ready, which parts are guarded by a single lane, and which part, the live engine, is still one process for everyone.",
  learn: {
    intuition:
      "Think of an apartment building. Every flat has its own lock, its own electricity meter and its own letterbox, so one family cannot walk into another's home or read their mail. But the water tank on the roof and the single lift are shared. If one family fills a bathtub, runs the washing machine and a garden hose at once, the people on the top floor get no water. They did nothing wrong, and they cannot see why it happened. Multi-tenancy is the same problem for software. A tenant is one customer, here one trader. Isolation means each tenant's data and keys are behind their own lock. Fairness means the shared parts, the tank and the lift, cannot be taken over by one tenant. You need both, and each has its own checks.",
    mechanics: [
      {
        heading: "Isolating data: a tenant key on every row, checked in one place",
        body: "The usual design is a tenant id on every row, and a rule that every read and write filters by it. In Traed that key is `user_id`. Strategies, brokers, watchlists and orders carry it directly. Some tables, such as backtests, reach it only through `strategy_id`, so their owner must be found by a join. The weak point is checking ownership by hand in each controller, which gets forgotten. Traed funnels the check through Laravel policies, `StrategyPolicy` and `BacktestJobPolicy`, which return one consistent 403. The engine adds a second check, `assert_strategy_owner`, so a forwarded user id must own the strategy. Two layers cost little and mean one forgotten check is not enough to leak data.",
      },
      {
        heading: "Credentials and connections: whose session is it?",
        body: "A trading platform holds something most apps do not: each user's own broker login. Those credentials are stored per user, and the live feed follows the same rule. The WebSocket bridge is built with one user's id and that user's access token and holds one upstream broker socket for that user. A client connects with a per-user JWT, and the connection and subscription rows in DynamoDB carry the `userId`. The bridge is started for a user with a conditional write on a sentinel row, `__bridge_invoke_lock__:{userId}`, with a 30-second default window, so a burst of 50 subscribes starts one bridge, not 50. Sharing one upstream connection across users would mix their sessions and orders.",
      },
      {
        heading: "Noisy neighbours: shared machines need lanes",
        body: "A noisy neighbour is a tenant whose heavy use slows others. Traed's engine runs backtests in a separate process pool whose size is `BACKTEST_MAX_WORKERS`, default 1, so only one memory-heavy job runs at a time. That protects the live tick loop and the machine. It also means every user's backtests share one lane in first-in, first-out order. The optimiser adds limits: `MAX_ACTIVE_RUNS_PER_USER` is 1, a run may have 2 trials in flight (4 for equity), and 6 may run across all users. The pool also tracks which jobs are in flight, so a user's queue position counts a cancelled job that has not yet stopped, not just rows marked pending.",
      },
      {
        heading: "Fair scheduling: FIFO is fair to nobody under load",
        body: "First-in-first-out feels fair but is not. Suppose each backtest takes 6 minutes, an illustrative figure. If one user submits 10 runs and then another user submits 1, the second user waits 60 minutes behind the first user's whole batch. Fairer schemes limit in-flight jobs per user, give each user a turn in rotation, or keep a separate lane for long jobs such as optimisations. Traed's own readiness notes list a per-user backtest cap, a separate optimisation lane and a bounded queue as work still to do. The live engine is the harder limit. It is one in-process singleton on one worker, so you cannot add workers without double-trading.",
      },
      {
        heading: "Saying it about Traed",
        body: "Traed is built per user in the places that are hard to retrofit. Most user data is keyed by user, broker credentials and the broker connection are per user, and ownership is checked in policies and again in the engine. We have one daily user, so the shared parts have never been tested by competing tenants. Backtests share one lane, and optimisations are capped per user. The live engine is one process for everyone, and that is the real ceiling. Before onboarding a second trader we would add per-user backtest caps and move live execution so that more than one worker can run without trading twice.",
      },
    ],
    complexityDerivation:
      "The invariant has two halves. Isolation: no request can read or change a tenant's data, credentials or connections unless that tenant's identity is attached and checked. Fairness: no tenant can use so much of a shared resource that others cannot make progress. Isolation holds when the tenant key is on every path and the check lives in one place, because a rule enforced in forty controllers is forty chances to forget it. Fairness holds when each shared resource has a limit per tenant, not only a total. Both stop holding at known points. Per-tenant checks fail when a path bypasses them, such as a background job that reads rows with no user attached. A single global limit fails when one tenant can consume all of it, as a single backtest lane does. And per-user isolation cannot hide a shared bottleneck: the live singleton serves everyone, so one tenant's blocking call is every tenant's problem.",
    variants: [
      {
        name: "Shared everything, tenant column (Traed today)",
        when: "Few tenants, trusted users, one small team, and a need to keep cost low.",
        delta:
          "One database, one engine, one set of tables, rows tagged with `user_id`. Cheapest to run. A missed filter exposes other tenants, and a heavy tenant slows everyone.",
      },
      {
        name: "Shared app, separate schema or database per tenant",
        when: "Customers who need strong data separation, per-customer backup, or different data volumes.",
        delta:
          "The application is shared but each tenant's data sits in its own schema or database. A query cannot cross tenants by mistake. Migrations and monitoring must run once per tenant.",
      },
      {
        name: "Separate deployment per tenant",
        when: "Large customers with strict rules, their own capital at risk, or a need for fully separate failure.",
        delta:
          "Each tenant gets its own copy of the stack. Isolation is almost complete, and noisy neighbours are gone, but cost and operating work grow in direct proportion to the number of tenants.",
      },
    ],
    tradeoffs: [
      {
        vs: "A separate database for each user",
        pick: "One schema with `user_id` on rows, for now",
        because:
          "With one user, a database per user is pure overhead. A single schema with checks in policies is far cheaper to run, and the cost, a missed filter exposing other tenants, is covered by two layers of checks.",
      },
      {
        vs: "A shared broker connection for all users",
        pick: "One upstream connection per user",
        because:
          "A broker session is the user's own login and carries their orders. Sharing it would mix identities. The cost is one socket per user, which is acceptable at this size.",
      },
      {
        vs: "Letting backtests run in parallel",
        pick: "A single worker lane with a per-user cap on optimisation",
        because:
          "On a small shared box a second memory-heavy job can starve the live loop. One lane protects it, at the cost of waiting, which a per-user cap and a visible queue position make tolerable.",
      },
    ],
  },
  realWorld: [
    {
      system: "Salesforce's shared multi-tenant platform",
      kind: "industry",
      problem:
        "Salesforce serves very many companies from shared infrastructure, and one customer's heavy use must not break another's.",
      applied:
        "Salesforce has described a multi-tenant design in which many customers share the same application and database, every row is tagged with an organisation id, and governor limits cap how much processing any one customer's code can use in a single transaction.",
      evidence: "Salesforce documentation and engineering papers on multi-tenant architecture and governor limits",
      impact:
        "Shows both halves of the invariant at large scale: a tenant key on every row, and per-tenant limits on shared resources.",
    },
    {
      system: "Zerodha Kite Connect and per-user access tokens",
      kind: "industry",
      problem:
        "A platform built on a broker's API must act for many traders, each with their own account, without mixing their sessions.",
      applied:
        "The Kite Connect API issues an access token per user after that user logs in, and the token expires daily. An app that serves many traders must store and use a separate token for each one, and cannot share a single login.",
      evidence: "Zerodha Kite Connect documentation: authentication and access tokens",
      impact:
        "The broker's design forces tenant-scoped credentials on anyone building a multi-user platform on top.",
    },
    {
      system: "Traed: ownership checks in policies and in the engine",
      kind: "yours",
      problem:
        "Ownership checks were once written by hand in each controller, so they were inconsistent and easy to forget.",
      applied:
        "`StrategyPolicy` and `BacktestJobPolicy` now hold the view, update, delete and deploy rules. The engine adds `assert_strategy_owner`, which compares the forwarded acting user with the strategy's owner on backtest and execution calls.",
      evidence: "CMS/trade-server/app/Policies/StrategyPolicy.php",
      impact:
        "One place to read and test the rule, and a second layer so that a single missed check does not expose another user's strategy.",
    },
    {
      system: "Traed: one backtest lane and a per-user optimisation cap",
      kind: "yours",
      problem:
        "Backtests and optimisations are heavy, and the machine is small and shared with live trading.",
      applied:
        "The process pool runs `BACKTEST_MAX_WORKERS` jobs, default 1, in first-in, first-out order. The optimiser allows one active run per user, 2 trials in flight per options run and 6 trials across all users.",
      evidence: "strategy-engine/app/services/backtest_dispatch.py",
      impact:
        "The live loop is protected from heavy jobs. Fairness between users beyond the optimiser is still open work.",
    },
  ],
  insights: [
    {
      t: "Isolation and fairness are two jobs",
      d: "Isolation stops tenants reading each other's data and keys. Fairness stops one tenant starving the shared parts. Checking one does not check the other.",
    },
    {
      t: "Check ownership in one place",
      d: "Hand-written checks in every controller get forgotten. Traed uses policies, plus a second check in the engine.",
    },
    {
      t: "A broker session belongs to one user",
      d: "Traed holds one upstream broker socket per user, because the session is that user's login and carries their orders.",
    },
    {
      t: "A global limit is not a fair limit",
      d: "One backtest lane protects the machine, but FIFO makes the second user wait behind the first user's whole batch. Fairness needs a per-user limit.",
    },
  ],
  pitfalls: [
    "Filtering by tenant in the controllers but not in background jobs. A job that reads rows with no user attached can read or change anyone's data.",
    "Sharing one connection or login across tenants to save cost. Orders and sessions get mixed up, and you cannot tell who did what.",
    "Treating a total limit as a fair one. A global cap of one lane or six trials lets a single tenant take all of it.",
  ],
  quiz: [
    {
      q: "What is a 'noisy neighbour' in a multi-tenant system?",
      options: [
        "A tenant whose heavy use slows the shared resources for others",
        "A tenant who logs in from many different devices at once",
        "A server that sends too many log messages to monitoring",
        "A user whose password is shared with a family member",
      ],
      answer: 0,
      difficulty: "recall",
      why: "A noisy neighbour is a tenant who consumes so much of a shared resource, such as CPU, memory or a job lane, that others suffer. The cure is per-tenant limits and isolation of heavy work.",
      distractors: [
        "",
        "Many devices is a session question and not about shared resources slowing others.",
        "Log volume is an observability cost. It does not describe one tenant harming another.",
        "Shared passwords are a security problem, not a resource-sharing one.",
      ],
    },
    {
      q: "In a design with a tenant id on every row, where is the safest place to check that a request may touch a row?",
      options: [
        "In each controller, written by whoever builds that page",
        "In the browser, before sending the request",
        "In one shared policy that every path calls",
        "In the database backup job, once a night",
      ],
      answer: 2,
      difficulty: "recall",
      why: "A single shared rule can be reviewed and tested once. Checks scattered across controllers are each a chance to forget one, and the browser is controlled by the user.",
      distractors: [
        "Scattered checks are what gets forgotten. The more places, the more chances for a gap.",
        "The browser is under the user's control. A server must check, because a user can change any request.",
        "",
        "A nightly job finds problems after they happen. It cannot stop a read as it occurs.",
      ],
    },
    {
      q: "A trading platform has 30 users. Each backtest takes about 6 minutes, and a single worker runs one at a time in arrival order. User A submits 5 runs at 10:00, and user B submits 1 run at 10:01. When does B's run start?",
      options: [
        "At about 10:06, since each user gets a turn",
        "At about 10:30, after all five of A's runs finish",
        "At about 10:12, after two of A's runs finish",
        "At 10:01, because a new user always goes first",
      ],
      answer: 1,
      difficulty: "apply",
      why: "First-in, first-out serves all five of A's runs, 30 minutes, before B's. That is fair by arrival and unfair to B. A per-user cap or round-robin would let B in after about one run.",
      distractors: [
        "That would need round-robin by user. Plain FIFO does not alternate between users.",
        "",
        "Nothing in FIFO lets two of A's runs finish and then skip the other three.",
        "FIFO does not favour new users. B waits behind everyone who arrived earlier.",
      ],
    },
    {
      q: "Your bridge starts an upstream broker connection when a user subscribes. A page opens 50 subscriptions for the same user within two seconds. How do you avoid starting 50 bridges?",
      options: [
        "Start all 50 bridges and then close 49 of them afterwards",
        "Ask each user to keep only one browser tab open at a time",
        "Share one bridge among all users to reduce how many start",
        "Use a short per-user lock: the first starts it, the rest skip",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A per-user debounce, such as a conditional write on a sentinel row with a 30-second window, lets the first subscribe start the bridge and the other 49 skip. It keeps the connection per user and the cost low.",
      distractors: [
        "Starting and then closing wastes the work and can hit the broker's connection limits.",
        "Relying on users to behave is fragile, and a retrying client would still burst.",
        "A bridge shared across users would mix their sessions and orders.",
        "",
      ],
    },
    {
      q: "A background job recalculates statistics for every strategy and runs with no user attached. Where could tenant isolation fail?",
      options: [
        "Nowhere, since background jobs never read any user data at all",
        "Only in the browser, at the moment when a page is rendered",
        "It may touch any tenant's rows, since no policy runs for a job",
        "Only when the database has more than one table in it",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Policies usually run on requests with a logged-in user. A job with no user bypasses them, so it must carry tenant filtering itself, or it can touch any tenant's rows.",
      distractors: [
        "A job reads the same tables a request does, so it can read the same data.",
        "The browser is not involved in a job running on the server.",
        "",
        "The number of tables has no bearing. The gap is that no tenant identity is attached.",
      ],
    },
    {
      q: "You cap the whole system at 6 concurrent optimisation trials. One user starts a run that uses all 6 for an hour. What does this show?",
      options: [
        "The cap works, and it also makes the system fair to every single user",
        "It guards the machine but does not stop one user taking all of it",
        "The cap is set too high, so lowering it to 3 solves the problem",
        "Fairness is not a concern once a total cap is in place",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A global cap guards the resource. It does not divide it. Fairness needs a per-user limit, like Traed's limit of one active optimisation run per user.",
      distractors: [
        "A total cap alone lets one tenant use all of it. Protection and fairness are different goals.",
        "",
        "Lowering the total changes the size of the pie, not who gets it. One user could still take all 3.",
        "A cap that one user can consume entirely leaves fairness missing, so concern remains.",
      ],
    },
    {
      q: "A founder says, 'We have a user_id column on every table, so we are multi-tenant ready.' Which reply is the most accurate?",
      options: [
        "That is enough, since the column proves that each row has an owner",
        "That is useless, because only a database per tenant gives isolation",
        "That is enough for data, and limits are only needed once revenue arrives",
        "That is only the layout; checks, credentials and limits still need work",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A tenant column is the base layer. Without checks on every path it protects nothing, and credentials and shared resources need their own per-tenant treatment.",
      distractors: [
        "A column records ownership but does not enforce it. Each query still has to filter by it.",
        "Separate databases help, but a shared schema with enforced checks is a valid, cheaper design at small scale.",
        "Limits protect against a noisy neighbour from the second user onwards, not after revenue.",
        "",
      ],
    },
    {
      q: "A trading platform runs all users' live strategies inside one process. The team has added strong ownership checks and per-user data keys. A reviewer says multi-tenancy is still not finished. What is the strongest point they can make?",
      options: [
        "One user's blocking call or crash in that shared process would affect every user",
        "Per-user keys are not allowed to exist inside a single shared process",
        "The ownership checks should be moved into the browser instead",
        "Live strategies need a separate database for each user",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Data isolation does not isolate execution. In a single shared process, one tenant's blocking call, memory growth or crash is a problem for all. That is the live-engine ceiling.",
      distractors: [
        "",
        "Keys can exist in any process. The problem is the shared execution, not the key.",
        "The browser is controlled by the user, so checks there protect nothing.",
        "A separate database does not fix shared execution. The risk is the one process, not the storage.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-multi-tenancy-second-trader",
      scenario:
        "A founder runs a trading platform on one 6 GB server and has been its only user. A friend now wants an account, with their own broker login. The founder has live strategies running, and backtests run one at a time in a single lane. What do you do before the friend logs in?",
      options: [
        {
          label: "Let the friend use the founder's login so nothing needs to change",
          appeal: "No work at all, and the friend can start today.",
        },
        {
          label: "Build a second server and database just for the friend",
          appeal: "Total isolation, and the founder's live trading is untouched.",
        },
        {
          label: "Keep one stack, test ownership on every endpoint, give the friend their own broker connection, and cap in-flight backtests per user",
          appeal: "Keeps cost low and adds the checks that matter for a second tenant.",
        },
        {
          label: "Open registration and see what breaks",
          appeal: "Fast feedback from real use.",
        },
      ],
      best: 2,
      verdict:
        "The friend is one extra tenant on a small box. Separate servers are costly for one person, a shared login mixes identities and orders, and learning by breaking things risks the founder's live strategies. The right step is to prove isolation with tests on every path, keep credentials and connections per user, and stop the shared lane being monopolised.",
      claims: [
        {
          text: "The friend's backtests will wait behind the founder's in one shared lane.",
          axis: "trade",
          correct: true,
          note: "True. One worker is the price of protecting the live loop, so waiting is the accepted cost.",
        },
        {
          text: "Because data is separated by user, the friend's actions cannot affect the founder's live trading in any way.",
          axis: "trade",
          correct: false,
          note: "Data isolation is not execution isolation. Both users still share one server and one live engine process.",
        },
        {
          text: "A long backtest from either user delays every queued run behind it.",
          axis: "failure",
          correct: true,
          note: "True. In a single FIFO lane, a long job blocks the rest, which is why a per-user cap and a visible queue matter.",
        },
        {
          text: "Giving the friend their own broker connection means their orders could be placed in the founder's account.",
          axis: "failure",
          correct: false,
          note: "The reverse. A separate connection with the friend's own token is what keeps the two accounts apart.",
        },
        {
          text: "A test that logs in as the friend and requests the founder's strategy and backtest ids on every endpoint, expecting a refusal.",
          axis: "measure",
          correct: true,
          note: "This tests the property that matters. A missed check on one endpoint is enough to leak data.",
        },
        {
          text: "The wait between submit and start for each user's backtests.",
          axis: "measure",
          correct: true,
          note: "It shows whether the shared lane is treating the two users acceptably.",
        },
        {
          text: "The number of rows in the users table.",
          axis: "measure",
          correct: false,
          note: "Row count says nothing about isolation or fairness.",
        },
      ],
    },
    {
      id: "sd-multi-tenancy-backtest-fairness",
      scenario:
        "A broking platform has a shared pool of 8 backtest workers, served in arrival order. At 08:30 on busy days about 200 users submit runs, and one user submits 400 parameter variations. Light users wait close to an hour for a single run and complain. The team has a month. What do you change?",
      options: [
        {
          label: "Add a per-user cap on running jobs, rotate between users, and put long optimisations in a separate lane",
          appeal: "It targets the cause, one user taking the queue, without extra machines.",
        },
        {
          label: "Add more workers until the wait disappears",
          appeal: "Simple, and it helps everyone at once.",
        },
        {
          label: "Give every user a dedicated worker",
          appeal: "Perfect isolation between users.",
        },
        {
          label: "Reject any submission when more than 100 jobs are queued",
          appeal: "Protects the pool from overload with one rule.",
        },
      ],
      best: 0,
      verdict:
        "The problem is one user's batch sitting in front of everyone, so a per-user cap with rotation fixes it at the source. More workers raise cost and shift the problem, since the next big batch fills them too. A dedicated worker per user is unaffordable at this size. Rejecting at 100 would turn away light users along with the heavy one.",
      claims: [
        {
          text: "Heavy users will wait longer for their own batch, so light users wait less.",
          axis: "trade",
          correct: true,
          note: "True. Fair scheduling moves waiting onto the user who created the load.",
        },
        {
          text: "You add scheduler logic and per-user counters that must be built, tested and kept correct.",
          axis: "trade",
          correct: true,
          note: "True. Fairness is not free, since the scheduler now has state per user.",
        },
        {
          text: "Fairness raises the total number of jobs the pool finishes per hour.",
          axis: "trade",
          correct: false,
          note: "Throughput stays the same. Fairness changes the order, not the amount of work done.",
        },
        {
          text: "A per-account cap can be sidestepped if one person opens many accounts, so account creation needs limits too.",
          axis: "failure",
          correct: true,
          note: "True. A tenant limit only works if a tenant is hard to multiply.",
        },
        {
          text: "Rotating between users means workers no longer need memory limits.",
          axis: "failure",
          correct: false,
          note: "Memory limits protect the machine from a single heavy job. Scheduling order does not replace them.",
        },
        {
          text: "The 95th-percentile wait, split between light and heavy users.",
          axis: "measure",
          correct: true,
          note: "Splitting by user type shows whether light users really benefit, which an overall figure can hide.",
        },
        {
          text: "The average wait across all jobs is enough to prove the system is fair.",
          axis: "measure",
          correct: false,
          note: "An average hides a starved group. A few very long waits can sit inside a good-looking mean.",
        },
      ],
    },
    {
      id: "sd-multi-tenancy-broker-feed",
      scenario:
        "A small platform has three users, each with their own broker login. The rules of the platform say that each user's live tick feed must use that user's own session. The feed is started when the user's page subscribes, and one page can send 50 subscribe messages in a few seconds. Which design do you use for the upstream connections?",
      options: [
        {
          label: "One connection using the founder's login, shared by all three users",
          appeal: "One socket instead of three, the lowest cost.",
        },
        {
          label: "A bridge per user, started on every subscribe message",
          appeal: "Each user is separate, and the logic is simple.",
        },
        {
          label: "A bridge per user, always running for 24 hours",
          appeal: "No start-up delay and no race at the open.",
        },
        {
          label: "A bridge per user, started by the first subscribe through a short per-user lock",
          appeal: "Keeps users separate and stops a burst from starting 50 bridges.",
        },
      ],
      best: 3,
      verdict:
        "The rule requires per-user sessions, so a shared login breaks the constraint. Starting a bridge on every message would launch dozens during a burst, and running them all day costs money while the market is closed. A per-user lock gives one bridge per user, started once.",
      claims: [
        {
          text: "Connections grow with the number of users, which is acceptable at three users.",
          axis: "trade",
          correct: true,
          note: "True. One socket per user is the price of keeping sessions separate. At thousands of users it would need a rethink.",
        },
        {
          text: "Per-user bridges reduce the number of upstream connections compared with sharing one.",
          axis: "trade",
          correct: false,
          note: "The reverse. Sharing one connection uses fewer sockets. Per-user bridges use one each.",
        },
        {
          text: "If one user's token expires, only that user's feed stops.",
          axis: "failure",
          correct: true,
          note: "True. Separate sessions mean separate failures, which is a benefit of the design.",
        },
        {
          text: "To be safe, a burst of 50 subscribes should start 50 bridges.",
          axis: "failure",
          correct: false,
          note: "That multiplies connections and work for no gain. One bridge per user serves all 50 subscriptions.",
        },
        {
          text: "If the lock check itself fails, starting the bridge anyway is safer than never starting it.",
          axis: "failure",
          correct: true,
          note: "True. A duplicate start wastes some work, while no start means no ticks. Failing open is right here.",
        },
        {
          text: "The total number of ticks across all users, since one total shows each user's health.",
          axis: "measure",
          correct: false,
          note: "A total can look healthy while one user's feed is dead. Health must be measured per user.",
        },
        {
          text: "Tick delay for each user separately.",
          axis: "measure",
          correct: true,
          note: "A per-user view shows whether one user's feed is lagging while the rest are healthy.",
        },
      ],
    },
  ],
};

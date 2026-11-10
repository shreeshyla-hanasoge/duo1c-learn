import type { Topic } from "../../types.ts";

export const sdDeploySafety: Topic = {
  id: "sd-deploy-safety",
  title: "Deploying while the market is open",
  tier: 5,
  week: 10,
  depth: "deep",
  summary:
    "A deploy changes a system that may hold real positions. Learn atomic releases, safe migrations and the gates that stop a restart at the wrong time.",
  why: "Traed ships often, and every deploy ends by restarting the strategy engine. If that happens while a live strategy holds a NIFTY or MCX position, evaluation and exits stop for the length of the restart. You need the names for what the platform does about it: release directories, a symlink swap, a market-hours guard, a branch rule and a migration step kept apart. With these you can explain why deploys are boring here, and what would make them unsafe.",
  learn: {
    intuition:
      "Think of a railway station that never closes. New signalling equipment has to be installed, but trains keep arriving. A sensible crew does not rip out the old panel and wire the new one in its place. They build the new panel in a workshop, test it, and then switch over in one quick move, keeping the old panel on the shelf in case the switch goes wrong. They also check the timetable first: if a fast express is in the middle of a difficult section, the switch waits. Deploying software to a trading system is the same job. The old version is the running panel, the new version is built beside it, and the switch should be quick, reversible and timed. The extra risk in trading is that some trains are carrying cargo that cannot be dropped: an open position that needs its stop-loss watched. A deploy that is perfectly fine on a shopping website can be costly here, only because of when it happens.",
    mechanics: [
      {
        heading: "Atomic releases: build beside, switch in one step",
        body: "An atomic release means users see either the old version or the new one, never a half-copied mix. The usual way is a directory per release and one symlink, a pointer on disk, named `current`. Traed's `deploy.sh` clones the branch into `releases/<timestamp>`, installs dependencies, builds the frontend, and only then repoints `current` to the new release. Changing a symlink is a single operation, so there is no moment when half the files are new. Each release is about 900 MB on the production volume, so Traed keeps the last three (`KEEP_RELEASES=3`), which leaves two rollback targets behind the live one. The price is disk space, and a build that must finish before anything changes.",
      },
      {
        heading: "Rollback and its limit: code goes back, data does not",
        body: "If releases sit side by side, rollback is just pointing `current` at the older directory and restarting services. Traed's `rollback.sh` does exactly that, after saving a tarball of the current release. It is quick because it moves no data. But that is also its limit: the script does not undo database migrations. If a deploy dropped a column, pointing back at old code gives you old code looking for a column that no longer exists, and only a database restore fixes that. So rollback safety depends on how the migration was written. Additive changes (a new nullable column) are safe to leave in place when code rolls back. Destructive ones are not, which leads to the next entry.",
      },
      {
        heading: "Migrations: expand first, contract later",
        body: "The safe pattern for schema changes is expand and contract. Expand: add the new column or table, nullable, while old code still works. Deploy code that writes both and reads the new one. Later, once nothing uses the old shape, contract: drop it in a separate release. Each step is compatible with the release before and after it, so any single deploy can be rolled back. Traed adds a human gate here. On `master`, `deploy.sh` skips `php artisan migrate`, and a separate manually triggered workflow, `migrate.yml`, shows pending migrations as a dry run by default and applies them only when dispatched with `apply=yes`. A deploy and a schema change are two decisions, not one.",
      },
      {
        heading: "Gates: do not restart into an open position",
        body: "Some changes cannot be restart-free. Traed's deploy ends by restarting the `strategy-engine` service, which stops live evaluation and exit handling for that moment. So the scripts run a market-hours guard first, before cloning or replacing anything. It blocks only when two things are both true: it is inside a session (NSE 09:00 to 15:40, MCX 09:00 to 23:55 IST, on trading days) and a live strategy is active or a row sits in `live_positions`. If the check itself fails during a session, it fails closed and blocks. The override is `FORCE_DEPLOY=1`, which logs a loud warning. The guard errs towards blocking: a blocked deploy costs a wait, a wrongly allowed one can cost a position.",
      },
      {
        heading: "Saying it about Traed",
        body: "We build every release in its own directory and switch one symlink, so a deploy is a single quick step and rollback is the same step backwards. Before anything is touched, a guard checks the clock and the database: if a session is open and a live strategy or position exists, the deploy refuses, and only an explicit force flag overrides it. Only pushes to `master` deploy, one at a time. We keep schema changes as a separate manual workflow. We accept that the engine still restarts on every deploy and that rollback does not undo data. We would revisit if we ran several engine instances, which would allow rolling restarts.",
      },
    ],
    complexityDerivation:
      "The invariant is simple: a change must not leave the system in a state that neither the old nor the new version understands, and it must not interrupt work that cannot be resumed. Atomic switching protects the first half for files. Expand and contract protects it for data, because the database is shared by two versions during the overlap. The market-hours guard protects the second half, since an open position is work in flight. This holds while three things are true: one switch moves everything, the old version stays available, and in-flight work is knowable from one place. It breaks when state lives outside the release. A changed environment file is one example: Traed lost broker credentials on 24 June 2026 when a deploy regenerated `APP_KEY`, and the fix was to persist it in a shared file. It also stops being enough once many instances run: then you need rolling or canary releases, because no single switch moves them all at the same moment.",
    variants: [
      {
        name: "Symlink-swap releases",
        when: "One server, one app, small team. Traed uses this.",
        delta: "Cheapest and quickest to roll back; but the service restart still interrupts work, and every release costs disk.",
      },
      {
        name: "Blue-green",
        when: "You can afford two full environments and need a near-instant switch with a standing fallback.",
        delta: "Traffic moves from the old stack to the new one at the router. Double the capacity, and the database is still shared, so migrations need the same care.",
      },
      {
        name: "Rolling or canary",
        when: "Many instances, and you want to see real traffic hit the new version in small steps.",
        delta: "Replaces instances a few at a time, or sends a small share of traffic first. Needs old and new to run together, so it demands backward compatible schemas and messages.",
      },
    ],
    tradeoffs: [
      {
        vs: "Deploy any time versus deploy only outside sessions",
        pick: "Guard by default, force by exception",
        because: "Waiting costs hours; an engine restart during a live position can cost far more. A named override keeps an urgent fix possible without making it the habit.",
      },
      {
        vs: "Auto-run migrations in the deploy versus a separate step",
        pick: "Separate manual step on master",
        because: "A schema change is hard to undo. Making it its own decision, with a dry run, stops a feature push from altering production data by accident.",
      },
      {
        vs: "Many branches deploying versus only master",
        pick: "Only master deploys on push",
        because: "A branch that can reach production by name will eventually do so by mistake. One trigger is easy to remember and easy to audit.",
      },
    ],
  },
  realWorld: [
    {
      system: "Knight Capital, August 2012",
      kind: "industry",
      problem:
        "A new order-routing release had to reach eight servers in the US equity market. One server was missed, and it still ran old code that an old flag could wake up.",
      applied:
        "On market open, that one server began sending orders it should not have. The firm lost roughly 440 million US dollars in about 45 minutes. The widely cited lessons: deploy the same way to every machine, verify what runs where, remove dead code, and have a way to stop quickly.",
      evidence: "SEC order on Knight Capital Group, October 2013 (public).",
      impact:
        "It shows why a deploy during or just before the open is a risk that needs its own controls.",
    },
    {
      system: "Capistrano-style release directories",
      kind: "industry",
      problem:
        "Web teams wanted deploys that did not serve half-updated files and that could be undone in seconds.",
      applied:
        "The Capistrano deployment tool popularised a layout of `releases/<timestamp>` plus a `current` symlink and a `shared` directory for things that persist, such as logs and the environment file. Many teams copied it by hand with shell scripts.",
      evidence: "Capistrano project documentation (public), the structure of its default directory layout.",
      impact:
        "The same layout is what makes rollback a one-line change for a small team.",
    },
    {
      system: "Traed market-hours deploy guard",
      kind: "yours",
      problem:
        "Every deploy restarts the strategy engine, which would stop exit handling for any live position at that moment.",
      applied:
        "`deployment-scripts/lib/deploy-guard.sh` checks the IST clock against NSE and MCX session times and the holiday calendar, then asks the live app whether any live strategy is active or any position is open. It exits with code 3 and writes a reason that the workflow forwards to Telegram. A failing check blocks during a session.",
      evidence: "deployment-scripts/lib/deploy-guard.sh; RUNBOOK.md section 2.6",
      impact:
        "The default is to wait for the close, and the override is explicit.",
    },
    {
      system: "Traed deploy workflow",
      kind: "yours",
      problem:
        "Branch triggers once sent feature branches into the production path, and two quick merges could overlap.",
      applied:
        "`.github/workflows/deploy.yml` now deploys on push to `master` only; staging is reached by hand. A `concurrency` group with `cancel-in-progress: false` queues deploys instead of running them together, after two merges three minutes apart on 2026-09-24 overlapped. The workflow comments record both changes.",
      evidence: ".github/workflows/deploy.yml; .github/workflows/migrate.yml",
      impact:
        "Production changes have one entry door and run one at a time.",
    },
  ],
  insights: [
    {
      t: "Build beside, switch once",
      d: "Put each release in its own directory and move one pointer. The switch is the only moment that matters, and moving it back is the rollback.",
    },
    {
      t: "Rollback moves code, not data",
      d: "Pointing at an old release does nothing for the database. Write migrations so the old code can still run against the new schema.",
    },
    {
      t: "Expand, then contract",
      d: "Add the new shape first, switch the code, and remove the old shape in a later release. No single step then needs to be perfect.",
    },
    {
      t: "A gate should know about money at risk",
      d: "Checking the clock is not enough. Traed asks whether a live strategy or position exists, and blocks closed if it cannot find out.",
    },
  ],
  pitfalls: [
    "Treating a rollback as a full undo. It restores the files, but a destructive migration, a changed environment file or a restarted process keeps its effect.",
    "Letting a convenience path reach production. A branch pattern or a staging script that shares the production database turns every push into a production deploy.",
    "Making the override easy and the guard noisy. If people force the deploy every day, the guard has become a delay instead of a protection.",
  ],
  quiz: [
    {
      q: "In a symlink-based release layout, what makes a deploy atomic?",
      options: [
        "Copying the new files over the old ones very quickly, so users rarely notice the mix",
        "Building the full release in a separate directory and then repointing one `current` link",
        "Running the deploy only at night so that traffic is low during the copy",
        "Restarting every service together so they all load the new code at one moment",
      ],
      answer: 1,
      why: "The release is complete before it is visible. Changing a symlink is one operation, so users see all old files or all new files.",
      difficulty: "recall",
      distractors: [
        "Fast copying is tempting, but there is still a window where some files are old and some new. Speed narrows it; it does not remove it.",
        "",
        "Low traffic reduces the chance of someone hitting the mix, but the mix still exists. It is timing luck, not atomicity.",
        "Restarting together coordinates processes, but the files on disk were still changed one by one before the restart.",
      ],
    },
    {
      q: "Why does Traed's `rollback.sh` not fix a deploy whose migration dropped a column that the old release still reads?",
      options: [
        "Rollback only works for the frontend and never touches the backend code",
        "The script is interactive, so it cannot be run from a CI job",
        "The previous release is deleted at once when a new one goes live",
        "It repoints code only; the schema stays changed, so the old code meets a missing column",
      ],
      answer: 3,
      why: "Rollback moves the `current` link. Data and schema live in the database, so a destructive migration needs a database restore or a forward fix.",
      difficulty: "recall",
      distractors: [
        "It is tempting to think of rollback as frontend only, but it repoints the whole release including backend code and restarts the engine.",
        "The prompt is real, but that is not why the column problem remains. Even run by hand it leaves the schema as it is.",
        "Old releases are kept, three in total, so there is something to point at. The problem is the schema, not the files.",
        "",
      ],
    },
    {
      q: "You want to rename the column `qty` to `quantity` in a table that both the running release and the new release use. Which plan lets any single deploy be rolled back?",
      options: [
        "Rename it in one migration and deploy the new code in the same release",
        "Add `quantity`, deploy code that writes both and reads the new one, then drop `qty` in a later release",
        "Take the platform offline for the night, rename the column, then deploy and bring it back",
        "Rename the column in the database, and keep the old code working with a database view",
      ],
      answer: 1,
      why: "Expand and contract keeps every step compatible with the release before it and after it. The final drop happens only when nothing reads `qty`.",
      difficulty: "apply",
      distractors: [
        "One-step rename is the quickest, but the moment it lands the old release breaks, so there is no safe rollback.",
        "",
        "A maintenance window hides the problem, but if the deploy fails in the morning, the old code still cannot run on the renamed column.",
        "A view can paper over the old name, but it is a hidden extra object and does not describe how the data is written; it is not a safe default plan.",
      ],
    },
    {
      q: "It is 11:20 on a Tuesday. A Traed live strategy holds one NIFTY option position. You push to `master`. What should the deploy guard do?",
      options: [
        "Proceed, because the new release is built beside the old one before it goes live",
        "Proceed, because NSE is open and a small position is not enough to block",
        "Refuse and exit with code 3, naming the strategy, unless `FORCE_DEPLOY=1` is set",
        "Wait inside the script until 15:40 and then continue the deploy on its own",
      ],
      answer: 2,
      why: "Both conditions hold: a session is open and a live strategy exists. The guard stops before anything is cloned or restarted.",
      difficulty: "apply",
      distractors: [
        "Building beside protects the files, but the deploy still ends by restarting the engine, which is what the guard protects against.",
        "The guard has no size threshold. Any live strategy or row in `live_positions` during a session blocks.",
        "",
        "The script does not sleep and resume. It refuses, so someone re-runs it after the session closes.",
      ],
    },
    {
      q: "During MCX hours, the guard's database check cannot connect to the live app. What does Traed's guard do, and why?",
      options: [
        "It blocks, because not knowing whether anything is live is not the same as safe",
        "It proceeds, since an unreachable database means no strategies can be live",
        "It proceeds but sends a Telegram warning after the restart has finished",
        "It retries every minute for an hour and then proceeds if the database is still down",
      ],
      answer: 0,
      why: "The guard fails closed. An error is treated as unknown, and unknown is blocked during a session. A forced override remains possible.",
      difficulty: "apply",
      distractors: [
        "",
        "A dead database does not mean no live strategy. The engine might still hold a position in memory, so assuming none is the risky guess.",
        "A warning after the fact does not undo the restart. The point of a gate is to act before the change.",
        "There is no retry-then-proceed path. That would turn an unknown into permission without a person deciding.",
      ],
    },
    {
      q: "An engineer pushes a branch called `feature/greeks-panel` and CI deploys it to the production path. What is the best structural fix?",
      options: [
        "Ask engineers to avoid pushing that branch name on a weekday",
        "Add a Telegram message that says a feature branch was deployed",
        "Let only the `master` push trigger deploy, and make anything else a deliberate manual run",
        "Run the feature branch deploy twice so that the second run overwrites the first",
      ],
      answer: 2,
      why: "A trigger that can be hit by accident will be hit by accident. Traed's workflow now deploys on `master` pushes only and leaves staging to a manual dispatch.",
      difficulty: "apply",
      distractors: [
        "A rule that depends on memory fails in the one week someone forgets. The fix has to be in the trigger itself.",
        "A notification tells you after the production change already happened. It does not prevent it.",
        "",
        "Running again does not remove the first run's effects, such as migrations or reseeded data.",
      ],
    },
    {
      q: "A team says: 'Our deploy guard is too strict, so people use the force flag on most days.' What is the best judgement?",
      options: [
        "The guard is working, because the flag is the correct way to deploy on busy days",
        "The guard should be removed, since an ignored control only adds ceremony",
        "The deploys are the problem, so ship less often and the flag will no longer be needed",
        "The guard's rules or the deploy shape need work, since routine bypass means it no longer protects",
      ],
      answer: 3,
      why: "A control that is bypassed daily is not a control. Look for why the bypass is needed, such as restart cost or too wide a block, and fix that.",
      difficulty: "judge",
      distractors: [
        "If forcing is the normal path, positions are being exposed on most days and the guard only adds a step.",
        "Removing it throws away protection for the days it would have mattered. The right response is to adjust it.",
        "Shipping less often delays the symptom, and bigger releases are riskier. It does not explain why the flag is used.",
        "",
      ],
    },
    {
      q: "A hotfix for a wrong colour in a backtest chart is ready at 10:30. One live NIFTY strategy is active. The deploy would restart the engine. What is the best call?",
      options: [
        "Wait for the session to close, because nothing in this fix is urgent",
        "Deploy at once, because a colour fix is too small to matter",
        "Use `FORCE_DEPLOY=1`, since no money depends on a chart colour",
        "Deploy to staging only and leave production on the old release forever",
      ],
      answer: 0,
      why: "The risk is not in the change, it is in the restart. A cosmetic fix has no urgency, so waiting for 15:40 costs nothing. Forcing it trades position safety for no gain.",
      difficulty: "judge",
      distractors: [
        "",
        "The fix is small, but the restart that follows is not. Size of the change is the wrong thing to judge by.",
        "The chart is harmless, but the restart is not. Forcing exposes the live position to protect nothing.",
        "Production would never receive the fix. The question is only about timing.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-deploy-safety-cosmetic-fix",
      scenario:
        "Traed runs on one server with one engine process. At 11:00 IST on a Wednesday a live strategy holds one open NIFTY options position with a stop-loss. You have just fixed a mislabelled column in the backtest results page. Nothing is broken for the user; the label is only confusing. The deploy restarts the engine. The NSE session ends at 15:30, and the guard releases at 15:40.",
      options: [
        {
          label: "Deploy now with the force flag",
          appeal: "The fix is small and the page is read-only, so risk seems low.",
        },
        {
          label: "Wait until after 15:40 and let the guard pass normally",
          appeal: "No override is used, the position finishes its day under the running engine, and the label will be fixed a few hours later.",
        },
        {
          label: "Exit the position by hand, then deploy",
          appeal: "It removes the live exposure so the guard passes, and the fix ships immediately.",
        },
        {
          label: "Edit the file directly on the server without a deploy",
          appeal: "It skips the restart and the guard, and the label changes within seconds.",
        },
      ],
      best: 1,
      verdict:
        "The restart is the risk, not the change. The fix has no urgency, so the only cost of waiting is a few hours of a confusing label. Forcing risks the stop-loss handling for nothing, and closing a position to publish a label is the wrong way round. Editing the server directly bypasses the release record and breaks the next deploy.",
      claims: [
        {
          text: "You accept a few hours of delay in exchange for not interrupting exit handling.",
          axis: "trade",
          correct: true,
          note: "The trade is time for safety. With no urgency, the delay is cheap.",
        },
        {
          text: "Forcing is justified because the fix is small and cannot affect trading logic.",
          axis: "trade",
          correct: false,
          note: "The fix is harmless. The engine restart that follows is not, and the force flag removes the protection against it.",
        },
        {
          text: "The main failure to avoid is an engine restart while the position's stop-loss is being watched.",
          axis: "failure",
          correct: true,
          note: "Restart stops live evaluation and exit handling for the moment it takes. That is exactly what the guard exists to prevent.",
        },
        {
          text: "Editing files on the server is safe here because it skips the restart.",
          axis: "failure",
          correct: false,
          note: "It leaves the server differing from the repository, so the next deploy can overwrite or conflict with the change, and no release record exists to roll back to.",
        },
        {
          text: "You would check that after 15:40 the guard prints that no live strategy blocks the deploy, and that health checks pass afterwards.",
          axis: "measure",
          correct: true,
          note: "The guard output and the post-deploy health polling are the confirmation that the switch went cleanly.",
        },
        {
          text: "You would measure success by how fast the label appears on screen.",
          axis: "measure",
          correct: false,
          note: "Speed was never the goal. The measure is whether the deploy completed without touching live trading.",
        },
      ],
    },
    {
      id: "sd-deploy-safety-column-rename",
      scenario:
        "A broker platform runs 120 application servers behind a load balancer, all sharing one orders database. Order traffic never stops between 09:00 and 23:30 IST. A column `qty` must become `quantity`. A deploy takes about 20 minutes to roll across all servers, so old and new code run side by side for that time. The team has 40 engineers and strict change control.",
      options: [
        {
          label: "One migration that renames the column, shipped with the new code",
          appeal: "One change, one review, and no leftover old column to clean up later.",
        },
        {
          label: "Expand, dual-write, switch reads, then drop the old column in a later release",
          appeal: "Each step works with both the old and new code, so a rolling deploy and a rollback are both safe.",
        },
        {
          label: "A maintenance window of two hours at night",
          appeal: "No traffic means no mixed versions, and the change is simple.",
        },
        {
          label: "Blue-green: build a second stack and switch the router at once",
          appeal: "A clean cut over, with the old stack still available as a fallback.",
        },
      ],
      best: 1,
      verdict:
        "Old and new code overlap for 20 minutes on a shared database that cannot pause, so every schema step must suit both versions. Expand and contract gives that. A rename breaks the old servers instantly. A night window does not exist when orders flow until 23:30 and restart at 09:00. Blue-green still shares one database, so the rename problem stays.",
      claims: [
        {
          text: "You accept two or three releases and a period of dual writes in exchange for a rollback that always works.",
          axis: "trade",
          correct: true,
          note: "More steps and some temporary duplication buy compatibility at every point.",
        },
        {
          text: "Blue-green removes the need for a compatible schema because the old stack is untouched.",
          axis: "trade",
          correct: false,
          note: "Both stacks use the same database. A rename that suits only the new stack breaks the old one the moment it runs.",
        },
        {
          text: "A one-step rename would make the old servers fail on every query that names `qty` while the roll-out is still in progress.",
          axis: "failure",
          correct: true,
          note: "The rolling deploy leaves old code running against the changed schema for up to 20 minutes.",
        },
        {
          text: "Dropping `qty` in the same release as the dual-write is fine because the new code no longer reads it.",
          axis: "failure",
          correct: false,
          note: "Old servers still read it during the overlap, and a rollback would need it back. The drop belongs in a later release.",
        },
        {
          text: "Before the final drop you would check that no code, report or job still reads `qty`, for example from query logs.",
          axis: "measure",
          correct: true,
          note: "Contract is only safe once usage is zero, and that is something you have to measure.",
        },
        {
          text: "You would judge the rollout only by whether the migration script finished without an error.",
          axis: "measure",
          correct: false,
          note: "A script can finish and still leave a reader broken. Error rates and usage on both versions are the real signals.",
        },
      ],
    },
    {
      id: "sd-deploy-safety-bad-release-rollback",
      scenario:
        "On Traed, a release deployed at 17:30 IST changed how partial exits are sized, and an hour later you see wrong quantities in paper runs. The release also included one migration, run through the manual workflow, that only added a nullable column. No live strategy is active; the NSE session is over and MCX is open. The previous release still sits in `releases/`. You want it back quickly.",
      options: [
        {
          label: "Run `rollback.sh` to point `current` at the previous release",
          appeal: "It is the designed fast path, and it saves a tarball of the current release first.",
        },
        {
          label: "Restore the database from the last backup, then roll back the code",
          appeal: "It returns code and data to a known earlier state together.",
        },
        {
          label: "Run `migrate:rollback` first, then repoint the symlink",
          appeal: "It undoes the schema change so the old code sees the schema it was built for.",
        },
        {
          label: "Leave it, and write a fix to deploy tomorrow",
          appeal: "It avoids another restart and the work of a rollback.",
        },
      ],
      best: 0,
      verdict:
        "The only migration added a nullable column, which the old code ignores, so code rollback alone is compatible. No live strategy is active, so the engine restart is harmless. A database restore would throw away an hour of valid rows for no benefit. Undoing the column adds a second change under pressure. Leaving the bug running keeps wrong quantities in paper runs.",
      claims: [
        {
          text: "You accept that the nullable column stays in the schema, unused, until a later clean-up.",
          axis: "trade",
          correct: true,
          note: "An extra unused column is harmless and removing it can wait. That is the benefit of an additive migration.",
        },
        {
          text: "Restoring the database is the safer trade because it also removes the column.",
          axis: "trade",
          correct: false,
          note: "It discards good data written after the deploy to reverse a change that does no harm.",
        },
        {
          text: "The rollback restarts the engine, so the risk is acceptable only because no live strategy or position is active.",
          axis: "failure",
          correct: true,
          note: "The script reloads services including the engine. With nothing live, that interruption costs nothing.",
        },
        {
          text: "The old release will fail against the new column because it does not know the column exists.",
          axis: "failure",
          correct: false,
          note: "Extra nullable columns are ignored by code that does not mention them. This is why the additive style is safe.",
        },
        {
          text: "After the rollback you would check the health endpoints and re-run the paper case that showed the wrong quantity.",
          axis: "measure",
          correct: true,
          note: "The script's own health check says the service is up. Only re-running the failing case shows the bug is gone.",
        },
        {
          text: "You would take a successful symlink change as proof that the quantities are fixed.",
          axis: "measure",
          correct: false,
          note: "The symlink moving shows the files switched. It says nothing about whether the behaviour is right.",
        },
      ],
    },
  ],
};

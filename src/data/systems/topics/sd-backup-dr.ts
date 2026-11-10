import type { Topic } from "../../types.ts";

export const sdBackupDr: Topic = {
  id: "sd-backup-dr",
  title: "Backup, restore and disaster recovery",
  tier: 5,
  week: 10,
  depth: "deep",
  summary:
    "A backup is only real once you have restored from it. Learn RPO and RTO, tiered backups, off-box copies, restore drills and why dev must never touch prod data.",
  why: "Traed lost its production tables in July 2026, and the backups that should have saved them had quietly stopped months earlier. The rebuilt scheme is now one of the best-documented parts of the platform. You will meet RPO, RTO, point-in-time recovery and restore drills in any serious system-design talk, and an investor will ask what happens if the server dies. This topic gives you the names and a true story to say them with.",
  learn: {
    intuition:
      "Think of the keys to your shop. A spare key in the same drawer as the original is no help if the shop burns down. A spare key you cut once and never tried might not even fit the lock. And a spare you tried last week, kept at a relative's house, is a real safety net. Backups follow the same three tests. Is the copy somewhere else? Is it recent enough? Have you actually turned it in the lock? There is a fourth, quieter question as well: would you know if your spare-key habit had stopped? Many failures are not a missing backup plan but a plan that died without anyone noticing. In a trading platform the stakes are plain. Strategies, orders and broker settings are rows in a database. Lose them and you rebuild by hand, from memory, while real positions may still be open.",
    mechanics: [
      {
        heading: "RPO and RTO: two numbers that drive everything",
        body: "Recovery point objective (RPO) is how much recent data you can afford to lose, measured in time. Recovery time objective (RTO) is how long you can afford to be down. They are separate choices. A nightly backup gives an RPO of up to 24 hours, so a crash at 18:00 can lose the whole day's orders. An hourly dump gives about one hour. Continuous log shipping gives minutes. RTO depends on how quickly you can restore: pulling 8 GB from cloud storage takes far longer than loading a 2 MB dump. Write the two numbers down before choosing tools, because each step down in either number costs more money or more effort.",
      },
      {
        heading: "Full, incremental and log shipping: tiers by value",
        body: "A full backup copies everything. An incremental copies only what changed since the last piece, so it is small but depends on a chain: lose one link and later pieces are useless. Log shipping copies the database's own change log (the binlog in MySQL), which lets you replay changes up to a chosen second, called point-in-time recovery. Good designs tier by value. Traed's tables split into a few MB of irreplaceable data (users, brokers, strategies, orders) and about 22 GB of option-chain history that can be refetched. So it dumps the small tables every hour, takes a compressed physical full weekly with daily incrementals, and ships binlogs every 15 minutes.",
      },
      {
        heading: "Off-box copies and retention that cannot be forgotten",
        body: "A backup on the same machine dies with the machine, so copies go elsewhere: the common advice is the 3-2-1 rule, three copies, on two kinds of media, one off-site. Traed's database host sends its backups to object storage in a different cloud. Retention is the other trap. A cleanup script that must keep running is one more thing that can stop. After July 2026 Traed moved retention into storage lifecycle rules: hourly dumps expire after 14 days, weekly fulls move to cold archive at 21 days and expire at 90, binlogs expire at 35 days. The cost stays bounded by design, about 0.74 US dollars a month at measured sizes.",
      },
      {
        heading: "Restore drills and silent failure",
        body: "A backup you have never restored is a hope. Traed's `restore-drill.sh` runs every Sunday at 02:30 IST: it downloads the newest chain, restores into a throwaway data directory, starts MySQL on a separate port, and compares row counts for key tables with the live database. Chain checks run at upload time too: each incremental's starting log position must equal the previous piece's end, or Traed alerts and takes a fresh full. And the whole system watches itself. A watchdog pages on Telegram if any tier has not succeeded recently, so the absence of success is the alarm. A quiet backup job is no longer assumed healthy.",
      },
      {
        heading: "Saying it about Traed",
        body: "We learned this the hard way in July 2026, when a command run from a development checkout dropped every production table. Backups had been dead for months, so we lost about three and a half months of data. We now take hourly dumps of the small critical tables, a weekly compressed full with daily incrementals, and binlog shipping every 15 minutes, all in object storage with lifecycle rules. A weekly restore drill proves the chain loads, and a watchdog pages if any tier goes quiet. We accept one database host and a restore that takes hours, not minutes. We would revisit with a standby server once there are many paying users.",
      },
    ],
    complexityDerivation:
      "The invariant is that a usable copy of the irreplaceable data exists somewhere a single event cannot reach, and that you know it is usable. Each part protects a different way that fails. Off-box storage protects against losing the machine. Log shipping and tiering protect the recovery point. Lifecycle rules protect against a cleanup job quietly stopping. Drills and the watchdog protect against the copy being useless or the process being dead. The argument holds while the failure you expect is a loss of data or a host, and while a restore of hours is acceptable. It stops holding in three cases. If the business needs recovery in minutes, backups are the wrong tool and you need a standby replica, which has its own gap: it copies a bad `DROP TABLE` too. If data is encrypted with a key that changes, a restored copy may be unreadable, as Traed found with broker credentials. And if development machines can reach production data, every backup is a second line of defence against a first line that should never have been open.",
    variants: [
      {
        name: "Periodic backups with point-in-time logs",
        when: "One database, a restore measured in hours is acceptable. Traed uses this.",
        delta: "Cheap and simple. Recovery is manual and slow, but the loss window can be minutes with log shipping.",
      },
      {
        name: "Hot standby replica",
        when: "Downtime of more than a few minutes is costly and a second server is affordable.",
        delta: "A replica takes over fast and loses little. It still copies mistakes such as a dropped table, so backups remain necessary.",
      },
      {
        name: "Multi-zone or multi-region deployment",
        when: "A data-centre loss must not stop trading, and the team can run a distributed system.",
        delta: "Survives a whole site failure. Adds large cost and complexity, and needs failover that is itself tested.",
      },
    ],
    tradeoffs: [
      {
        vs: "Back up everything often versus tier by value",
        pick: "Tier by value",
        because: "Most of Traed's bytes are market history that can be refetched. Hourly dumps of the few MB that matter give a small loss window at almost no cost.",
      },
      {
        vs: "Cleanup script versus storage lifecycle rules",
        pick: "Lifecycle rules",
        because: "A script that stops leaves either unbounded cost or deleted history. A rule held by the storage service keeps running by itself.",
      },
      {
        vs: "Check that backups exist versus restore them regularly",
        pick: "Restore regularly",
        because: "Existence says a file was written. Only a restore shows it loads, that the chain is unbroken, and that the data in it is the data you need.",
      },
    ],
  },
  realWorld: [
    {
      system: "GitLab database incident, January 2017",
      kind: "industry",
      problem:
        "An engineer removed data from the wrong database server while fixing replication, and recovery was needed from backups.",
      applied:
        "GitLab published a candid post-mortem: several backup and replication mechanisms were in place, yet most did not work when needed, and the team recovered from a copy that was about six hours old. The widely repeated lesson is that unrestored, unmonitored backups are not backups.",
      evidence: "GitLab post-mortem of the database outage, 2017 (public blog post).",
      impact:
        "It is the standard story used to argue for restore drills and failure alerts.",
    },
    {
      system: "Amazon RDS automated backups with point-in-time restore",
      kind: "industry",
      problem:
        "Teams wanted recovery to a chosen moment, such as just before a bad delete, without running their own backup tooling.",
      applied:
        "RDS takes daily snapshots and keeps the transaction logs, so a database can be restored to a second within the retention period, which can be set up to 35 days. Traed's design uses the same idea by hand: a base copy plus shipped logs, with 35 days of binlog retention.",
      evidence: "Amazon RDS documentation on automated backups and point-in-time recovery (public).",
      impact:
        "It makes the pattern of a base copy plus logs a default expectation.",
    },
    {
      system: "Traed production database wipe, July 2026",
      kind: "yours",
      problem:
        "A destructive Laravel command dropped all application tables in production, run from a development checkout whose settings pointed at the production database.",
      applied:
        "The hourly backup job had been commented out since 30 March and the incremental chain was broken, so the restore point was 27 March, about three and a half months back. The guard against destructive commands was keyed only on `APP_ENV`, so a local setting switched it off. After the incident the guard also checks the database host, and dev machines use a local database.",
      evidence: "docs/incidents/2026-07-15-prod-db-wipe.md; CMS/trade-server/app/Providers/AppServiceProvider.php",
      impact:
        "Login was down for about twelve hours, and data from the lost window was gone.",
    },
    {
      system: "Traed tiered backup and restore drill",
      kind: "yours",
      problem:
        "The old scheme grew costs without bound, died silently, and had a chain that nobody verified until disaster.",
      applied:
        "Three tiers (hourly dump, weekly zstd full with daily incrementals, 15-minute binlog shipping), S3 lifecycle rules, a watchdog, and a weekly restore drill with row-count checks. A measured weekly full is 7.84 GB, against a 33 GB data directory.",
      evidence: "docs/plans/backup-restore-design.md; deployment-scripts/backup/README.md; deployment-scripts/backup/restore-drill.sh",
      impact:
        "Steady-state cost measured at about 0.74 US dollars a month, with a drill that passed with matching row counts.",
    },
  ],
  insights: [
    {
      t: "Two numbers first",
      d: "Decide how much data you can lose (RPO) and how long you can be down (RTO). Tools and money follow from those, not the other way round.",
    },
    {
      t: "Tier by value",
      d: "Small irreplaceable tables get frequent copies. Big reproducible history gets cheap, infrequent ones. Traed's 22 GB of option-chain data is not backed up hourly.",
    },
    {
      t: "Absence of success is the alarm",
      d: "A backup that stops makes no noise. Alert on a missing success, as the Traed watchdog does, rather than waiting for an error message.",
    },
    {
      t: "Untested backups are hopes",
      d: "Restore into a throwaway instance on a schedule and compare against live. That is the only proof the chain loads.",
    },
  ],
  pitfalls: [
    "Counting a successful upload as a good backup. Chains can be broken, files can be empty, and encrypted columns can be unreadable under a changed key.",
    "Letting development reach production data. A single mistaken command from a laptop undid months of work. The cure is a separate dev database and a guard that checks the host.",
    "Relying on a cleanup script for retention. When it stops, you either pay without limit or lose the history you thought you kept.",
  ],
  quiz: [
    {
      q: "What does RPO measure?",
      options: [
        "How much recent data you can afford to lose, expressed as a length of time",
        "How long the system may stay down before users must be told",
        "How many copies of the data must exist in different places",
        "How fast a backup file can be written to the storage service",
      ],
      answer: 0,
      why: "RPO is the loss window. An hourly backup means a crash can lose up to an hour. RTO is the separate number for how long recovery may take.",
      difficulty: "recall",
      distractors: [
        "",
        "That is RTO, the recovery time. The two are easy to swap because both appear in the same sentence.",
        "That is the idea behind the 3-2-1 rule, which is about copies, not about time.",
        "Write speed affects backup windows, but RPO is about how much recent data would be missing after a failure.",
      ],
    },
    {
      q: "Why does an incremental backup depend on a chain?",
      options: [
        "Each holds only changes since the last, so a missing link breaks the rest",
        "Incrementals are encrypted with a key taken from the previous file",
        "Cloud storage only accepts files in numbered order",
        "Each piece contains a full copy but compressed using the one before it",
      ],
      answer: 0,
      why: "An incremental holds a delta. To restore, you need the full and every delta in order. Traed's 2026 chain broke because two days of objects were missing.",
      difficulty: "recall",
      distractors: [
        "",
        "Encryption is not what links them. The link is logical: the changes are relative to the earlier piece.",
        "Storage accepts objects in any order. The dependency is in the backup data, not the service.",
        "That describes a full backup. Incrementals are small precisely because they do not store everything.",
      ],
    },
    {
      q: "Your trading platform's database is 34 GB, of which 22 GB is refetchable market history. The rest is a few MB of users, strategies and orders. You want an RPO of about an hour on a small budget. What is the best plan?",
      options: [
        "A full backup of the whole database every hour, kept for two weeks",
        "A nightly full backup of everything, kept for a whole year",
        "Hourly dumps of critical tables, a weekly full, and shipped logs",
        "A copy of the data directory made by hand each Friday evening",
      ],
      answer: 2,
      why: "The critical data is tiny, so hourly copies of it are almost free. The big history needs only occasional copies. Logs cover the gaps.",
      difficulty: "apply",
      distractors: [
        "It meets the RPO, but 24 copies of 34 GB a day is expensive, mostly to protect data that can be refetched.",
        "It is cheap per day but its RPO is a day. A crash at 18:00 loses the whole session's orders.",
        "",
        "A manual weekly copy depends on someone remembering, and its loss window is a week.",
      ],
    },
    {
      q: "A restore drill compares row counts for `users`, `brokers` and `strategies` between a restored copy and the live database. What failure does this catch that 'the backup file exists' does not?",
      options: [
        "A backup cron job that has been switched off for several weeks",
        "An expired cloud storage password on the database host",
        "A backup that uploaded but is incomplete or will not load",
        "A restore that takes longer than the weekend maintenance window",
      ],
      answer: 2,
      why: "Existence only proves a write. Loading the data and counting rows shows the chain is complete and the content matches.",
      difficulty: "apply",
      distractors: [
        "A missing cron is caught by the watchdog's absence-of-success alert. The drill is aimed at the content.",
        "A credential problem fails the upload and shows as a missing success, not as a bad restore.",
        "",
        "The drill does record how long it ran, but the row-count check is about content, not duration.",
      ],
    },
    {
      q: "After restoring a four-month-old backup, auto-login to the broker fails every morning with a decryption error. What is the most likely cause?",
      options: [
        "The backup was compressed with the wrong algorithm when made",
        "The broker rotated its API address while the database was down",
        "The binlogs were replayed in the wrong order during restore",
        "The rows were encrypted with an older key than the one now in use",
      ],
      answer: 3,
      why: "Encrypted columns restore as bytes. They are readable only if the key that wrote them is still the key in use. Traed hit exactly this and had to re-enter credentials.",
      difficulty: "apply",
      distractors: [
        "A bad compression format would stop the restore from loading at all, not leave only encrypted columns unreadable.",
        "An address change would give connection errors, not a decrypt error on stored values.",
        "Replay order affects row contents, not whether a stored secret decrypts. No binlogs were replayed in that case.",
        "",
      ],
    },
    {
      q: "A hot standby replica receives every change within a second. A developer's command drops a production table. What happens to the standby?",
      options: [
        "It keeps the table, because replicas only copy inserts",
        "It replays the drop too, so you still need a backup to recover the table",
        "It pauses automatically when it sees a destructive statement",
        "It restores the table from its own copy a minute later",
      ],
      answer: 1,
      why: "Replication copies faithfully, including mistakes. A replica protects against a host failure, not against a bad command. Backups with point-in-time logs protect against both.",
      difficulty: "apply",
      distractors: [
        "Replicas copy all changes, including drops. Believing otherwise is the main reason teams skip backups when they have a replica.",
        "",
        "Standard replication has no sense of intent. It applies the statement it is given.",
        "There is no such memory. The standby is a mirror, so it mirrors the loss too.",
      ],
    },
    {
      q: "An engineer says: 'We use cloud object storage with 11-nines durability, so a restore drill is a waste of time.' What is the best response?",
      options: [
        "Agree, since durability numbers cover the whole backup system",
        "Disagree: durability does not show a backup is complete, loads or decrypts",
        "Agree, but only for incremental backups, which are small",
        "Disagree: the drill matters only for databases above 100 GB",
      ],
      answer: 1,
      why: "Durability means the storage will not lose the object. It says nothing about whether the right objects were written, whether they restore, or whether they can be decrypted.",
      difficulty: "judge",
      distractors: [
        "Durability is a property of storage, not of the process that fills it. Traed's chain broke while the storage was fine.",
        "",
        "Incrementals are the most fragile part, since one missing link breaks the chain. They need the drill more.",
        "Size is not the issue. A 5 GB database fails to restore for the same reasons a 500 GB one does.",
      ],
    },
    {
      q: "A start-up has one database server and one developer who often works from a laptop. Which investment gives the most protection against a repeat of a 'dropped the wrong database' accident?",
      options: [
        "A second backup tool, scheduled to run from the same developer laptop",
        "Daily emails summarising the size of every table in the database",
        "A much longer backup retention period, with nothing else changed",
        "A local dev database plus a guard blocking destructive commands on prod hosts",
      ],
      answer: 3,
      why: "Prevention is cheaper than recovery. Taking the production database out of reach of dev tools removes the cause, and the host-based guard still works if the environment variable is wrong.",
      difficulty: "judge",
      distractors: [
        "More tools from the same place share the same mistake risk, and none of them stops the command.",
        "Table size reports might show a loss afterwards but prevent nothing.",
        "Longer retention may help recovery but the accident still happens, and the lost window grows if backups are dead.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-backup-dr-tiered-design",
      scenario:
        "A small algo platform runs on one app host and one database host. The database is 34 GB, but 22 GB of it is append-only option-chain history that can be refetched from a data vendor. The tables with users, broker settings, strategies and orders total a few MB. Last quarter the nightly backup job stopped and nobody noticed for months. The founder wants an hour of loss at most, restore within a working day, and a bill of a few dollars a month. There is no operations team.",
      options: [
        {
          label: "Hourly full copy of the whole database to object storage",
          appeal: "Simple to explain, one job, and the loss window is one hour.",
        },
        {
          label: "Tiered: hourly dump of critical tables, weekly compressed full with daily incrementals, 15-minute log shipping, lifecycle retention",
          appeal: "Each kind of data gets the copy frequency it deserves, so the bill stays small.",
        },
        {
          label: "A nightly full backup with a cleanup script that keeps the last seven",
          appeal: "Few moving parts and a familiar pattern.",
        },
        {
          label: "A hot standby replica on a second server and no backups",
          appeal: "Fast failover and near-zero loss when the primary host fails.",
        },
      ],
      best: 1,
      verdict:
        "The budget and the one-hour RPO decide it. Only a few MB need hourly protection, so tiering meets the RPO for pennies, and shipped logs close the gaps between copies. Hourly fulls of 34 GB meet the RPO but cost far more for data that can be refetched. A nightly job misses the RPO and recreates the script-based failure. A replica doubles the cost and copies a dropped table too.",
      claims: [
        {
          text: "You accept more moving parts, three tiers instead of one job, in exchange for a small bill and a one-hour loss window.",
          axis: "trade",
          correct: true,
          note: "Complexity is the price of fitting the copy frequency to the value of each table.",
        },
        {
          text: "A replica is the cheaper way to meet the one-hour RPO.",
          axis: "trade",
          correct: false,
          note: "It needs a second server running all the time, and it does not protect against a bad command.",
        },
        {
          text: "Without an alert on missing success, any tier can stop and the loss window will quietly grow.",
          axis: "failure",
          correct: true,
          note: "That is the exact way the earlier scheme failed. Absence of success must be the alarm.",
        },
        {
          text: "If one incremental is lost, only that one day is missing and later days still restore.",
          axis: "failure",
          correct: false,
          note: "Later incrementals build on earlier ones, so a missing piece breaks everything after it until the next full.",
        },
        {
          text: "You would run a scheduled restore into a throwaway instance and compare row counts against the live database.",
          axis: "measure",
          correct: true,
          note: "Only a restore proves the copy loads, and counts show that the content matches.",
        },
        {
          text: "You would measure health by the number of files in the bucket growing each day.",
          axis: "measure",
          correct: false,
          note: "Growth shows writes happening, not that the chain is complete or restorable. A corrupt chain still grows.",
        },
      ],
    },
    {
      id: "sd-backup-dr-broker-platform",
      scenario:
        "A retail broker's order management database holds every client order. Regulators expect that no acknowledged order is lost. The business wants service back within 15 minutes of a server failure, and the database is 4 TB. It runs on cloud servers across two availability zones. Last month an operator ran a bulk delete on the wrong table and had to ask for help. The platform has a 24-hour operations team and a large budget.",
      options: [
        {
          label: "Nightly full backup to cloud storage, tested once a year",
          appeal: "Cheap, familiar and covers deletes if you keep enough history.",
        },
        {
          label: "Asynchronous replica in another region, no archived logs",
          appeal: "Survives a site loss and costs less than synchronous replication.",
        },
        {
          label: "Snapshots of the disk volume every six hours",
          appeal: "Easy to automate and nothing to install inside the database.",
        },
        {
          label: "Synchronous standby in a second zone, plus continuous log archiving for point-in-time recovery and regular restore drills",
          appeal: "Fast failover with no acknowledged order lost, and a way back from a bad delete.",
        },
      ],
      best: 3,
      verdict:
        "The constraints are zero lost acknowledged orders and 15-minute recovery, which only a synchronous standby offers, since the standby has every committed write. The bad-delete accident adds a second need: replication copies the delete, so archived logs for point-in-time recovery and tested restores are still required. A nightly backup fails both numbers. An asynchronous replica can lose the last writes. Six-hourly snapshots lose up to six hours.",
      claims: [
        {
          text: "You accept extra write latency and cost, because a commit waits for the standby, to avoid losing acknowledged orders.",
          axis: "trade",
          correct: true,
          note: "Synchronous replication is the price of an RPO near zero.",
        },
        {
          text: "With a synchronous standby, backups are no longer needed.",
          axis: "trade",
          correct: false,
          note: "The standby applies every change, including the wrong bulk delete. Only logs and backups let you go back in time.",
        },
        {
          text: "An asynchronous replica can be behind at the moment of failure, so some acknowledged orders may be missing on it.",
          axis: "failure",
          correct: true,
          note: "Async means the primary does not wait. Whatever had not yet been sent is lost on failover.",
        },
        {
          text: "A disk snapshot taken every six hours gives an RPO of a few minutes.",
          axis: "failure",
          correct: false,
          note: "Its RPO is up to the snapshot interval, so as much as six hours of orders could be lost.",
        },
        {
          text: "You would time a full failover and a point-in-time restore in a drill against the 15-minute target.",
          axis: "measure",
          correct: true,
          note: "RTO is a measured number. A 4 TB restore time is hard to guess and easy to measure.",
        },
        {
          text: "You would treat the vendor's published availability percentage as proof of your RTO.",
          axis: "measure",
          correct: false,
          note: "A vendor figure describes their service. Your recovery depends on your data size, process and people.",
        },
      ],
    },
    {
      id: "sd-backup-dr-restore-key-change",
      scenario:
        "A small trading platform restores its database from the latest backup after a disk failure. The restore is clean, row counts match, and the web app logs in. The next morning, automatic broker login fails with a decryption error. Broker passwords and TOTP seeds are stored encrypted with the application key. That key was changed two months ago, and the newest backup was taken after the change. You are writing the postmortem actions.",
      options: [
        {
          label: "Only add a check that the backup file size is above a minimum",
          appeal: "Cheap, and it catches empty or truncated uploads.",
        },
        {
          label: "Stop encrypting broker credentials so restores always work",
          appeal: "It removes the failure class completely.",
        },
        {
          label: "Add a drill step that decrypts one stored secret with the current key, and record the key version beside each backup",
          appeal: "It tests the thing that actually failed and ties each backup to the key that reads it.",
        },
        {
          label: "Switch to backing up the whole disk image instead of the database",
          appeal: "A disk image feels more complete than a logical copy.",
        },
      ],
      best: 2,
      verdict:
        "The failure was not in the copy, it was in what the copy needs in order to be useful. A drill step that decrypts a real secret tests that directly, and key versions beside backups make the dependency visible. A size check cannot see it. Removing encryption trades a recoverable failure for a plaintext secret store. A disk image still holds the same encrypted bytes and the same key problem.",
      claims: [
        {
          text: "You accept a slightly longer drill and some bookkeeping about key versions to catch key mismatches before a real restore.",
          axis: "trade",
          correct: true,
          note: "The cost is small compared with discovering the problem during an outage.",
        },
        {
          text: "Dropping encryption is the better trade, since broker secrets are only a few rows.",
          axis: "trade",
          correct: false,
          note: "Those few rows are the most sensitive in the database. Weakening their protection to ease restores is the wrong direction.",
        },
        {
          text: "Plain data columns survive a restore, but encrypted ones are only readable if the key in use matches the key that wrote them.",
          axis: "failure",
          correct: true,
          note: "This is the lesson from Traed's July 2026 restore: a key change between backup and restore leaves secrets unreadable.",
        },
        {
          text: "A disk-image backup would have avoided the problem, because it captures the key too.",
          axis: "failure",
          correct: false,
          note: "Keys kept in a separate environment file or secret store are not part of the database image, and the encrypted bytes are identical.",
        },
        {
          text: "You would check, after each restore drill, that a real stored credential decrypts under the key now in use.",
          axis: "measure",
          correct: true,
          note: "It turns a morning surprise into a weekly check.",
        },
        {
          text: "You would count a restore as successful once the application login page returns HTTP 200.",
          axis: "measure",
          correct: false,
          note: "The login page worked in this scenario while credentials were still unreadable. A shallow check passes on a broken restore.",
        },
      ],
    },
  ],
};

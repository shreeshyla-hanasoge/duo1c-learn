import type { Topic } from "../../types.ts";

export const sdDistributedTransactions: Topic = {
  id: "sd-distributed-transactions",
  title: "Distributed transactions: 2PC, sagas and the outbox",
  tier: 3,
  week: 6,
  depth: "deep",
  summary:
    "One action that touches two databases, or a database and a queue, outgrows a plain transaction. Learn 2PC, sagas, the outbox and try-confirm-cancel.",
  why: "Sooner or later one action must change two things that no single database can commit together: a seat and a payment, an order and an event, your record and a broker's. Engineers who do not know the options either lose data quietly or build a slow, fragile lock across services. This lesson gives you the four standard answers, what each one costs, and the first question to ask: can the design avoid needing a distributed transaction at all? Traed meets the same shape with every live order, because the broker is a system it can never lock.",
  learn: {
    intuition:
      "Imagine buying a flat. The buyer pays the builder, the registrar records the new owner, and the bank releases the loan. Three offices, three ledgers, and no single clerk who can write in all of them at once. Suppose the money moves and the registrar then closes for the day. Now the buyer has paid and owns nothing. There are only a few ways out. You can gather everyone in one room, have each office say 'ready' and then sign together, while everyone waits for the slowest office. You can let each office act on its own, and if a later step fails, send a signed reversal for the earlier ones. You can make every step leave a written note in the same book as the work, so a courier can deliver it later without losing it. Or you can ask for the flat to be sold by one office only. Each choice trades speed, waiting and certainty differently.",
    mechanics: [
      {
        heading: "Two-phase commit: everyone votes, then one decides",
        body: "Two-phase commit (2PC) uses a coordinator and several participants, each with its own database. In phase one the coordinator sends `prepare`. Each participant does the work, writes it to its log so it survives a crash, takes its locks, and votes yes or no. A yes is a promise: 'I can still commit on command, even after a restart.' In phase two, if all voted yes, the coordinator logs `commit` and sends it. If any voted no, it sends `abort`. With 3 participants that is 3 prepares, 3 votes, 3 decisions: 9 messages, plus log writes. It gives true atomicity, which is why databases offer it as XA.",
      },
      {
        heading: "The blocking problem and why 2PC is rarely used across services",
        body: "Suppose all 3 participants voted yes and the coordinator crashes before it sends the decision. Each participant has promised to commit, so it cannot abort alone, and it cannot commit alone, because a peer might have voted no. It must wait, holding its locks, until the coordinator returns. That is the blocking problem. Locks stay held for the whole round trip, so throughput falls as the slowest participant and the network get slower, and a stuck coordinator can freeze rows for minutes. Within one datacentre and a database that supports it, this can be acceptable. Spanner uses 2PC across its replica groups, and the coordinator itself is replicated so that it rarely stays down. Across independent teams and third parties it is usually the wrong tool.",
      },
      {
        heading: "Sagas: a chain of local transactions with compensation",
        body: "A saga splits the action into steps, each a normal local transaction that commits at once. Every step has a compensation, a new action that undoes its meaning. Book a seat, charge the card, issue the ticket. If the charge fails, run `release seat`. If issuing fails, run `refund`, then `release seat`. Nothing is rolled back in the database sense; the first commit is real and visible, so other users may briefly see the seat held. A saga can be choreographed, where each service reacts to the previous event, or orchestrated, where one coordinator service tells each step what to do. Compensations must be safe to retry, and some actions, such as sending an SMS, have none.",
      },
      {
        heading: "Outbox, try-confirm-cancel, and not needing it at all",
        body: "The transactional outbox fixes the 'save and publish' gap. Write the business row and an `outbox` row in one local transaction. A relay reads unsent outbox rows and publishes them, marking each after the broker accepts it. A crash between publish and mark causes a repeat, so delivery is at least once and consumers must skip ids they have seen. Try-confirm-cancel (TCC) suits money: `try` reserves ₹5,000 as held, `confirm` turns the hold into a debit, `cancel` frees it, and the hold expires if nobody answers. The best fix is often design: keep data that must change together in one database, so a local transaction does the job.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed mostly avoids the problem: the web app and the strategy engine share one MySQL schema, so most changes are local transactions. The hard case is a live order, because the broker's book cannot join our transaction. The engine mints its own order id and stores the order row, with that id as the tag, even before the broker has answered. After a restart it compares open rows with the broker's order list. That is the saga idea: a durable record of intent, then repair by reconciliation. The signal relay to an outside order system is best effort and drops under load, not an outbox. We would add an outbox if a lost event ever cost money.",
      },
    ],
    complexityDerivation:
      "The core difficulty is a short statement: two systems cannot both learn a fact at the same instant, and any message can be lost or any machine can crash between two writes. So any protocol must pick what it does in the gap. 2PC closes the gap by making participants wait, which gives atomicity at the price of liveness: while the coordinator is down, locked rows stay locked. A saga leaves the gap open and promises only eventual cleanup, giving up isolation: other readers can see the half-done state. The outbox does not cross systems in one step at all; it turns two writes into one local write plus a retried delivery, and the retry means duplicates, so the consumer needs idempotence. The invariant in every case is the same: after any crash, the system can find out how far the action got and finish or reverse it. The argument stops holding when a step has no inverse, when compensation can itself fail repeatedly, or when users cannot tolerate seeing the in-between state.",
    variants: [
      {
        name: "Two-phase commit (XA)",
        when: "A few databases you control, in one datacentre, where a half-done state is unacceptable and volume is modest.",
        delta:
          "True all-or-nothing, but locks are held across the round trip and a dead coordinator blocks the participants. Needs every party to support prepare.",
      },
      {
        name: "Saga (orchestrated or choreographed)",
        when: "Several independent services or an external provider, where each step can be undone by a business action.",
        delta:
          "Scales and never holds cross-service locks, but readers can see intermediate states, and every step needs a tested compensation.",
      },
      {
        name: "Outbox with idempotent consumers",
        when: "A database change must reliably cause a message, such as an event to Kafka or a webhook.",
        delta:
          "Removes the lost-event gap using one local transaction. Delivery is at least once, so duplicates are normal and must be de-duplicated.",
      },
    ],
    tradeoffs: [
      {
        vs: "2PC versus sagas",
        pick: "Sagas across services, 2PC only inside a platform that runs it for you",
        because:
          "2PC buys isolation by holding locks and waiting on the slowest party. Most business actions can tolerate a visible intermediate state and a compensation, and they scale much better without cross-service locks.",
      },
      {
        vs: "Dual write versus outbox",
        pick: "Outbox",
        because:
          "Writing to a database and then to a queue in code has a crash window that silently loses or invents events. One extra table row removes that window for the cost of a relay process.",
      },
      {
        vs: "Split the data versus keep it together",
        pick: "Keep it together until a real boundary forces the split",
        because:
          "Two services with two databases turn every shared update into a saga. One database gives you a local transaction for free. Split for scale, ownership or failure isolation, not for fashion.",
      },
    ],
  },
  algorithms: [
    {
      name: "Two-phase commit",
      role: "A coordinator collects prepare votes and then broadcasts one commit or abort decision, so all participants end in the same state.",
    },
    {
      name: "Saga with compensating actions",
      role: "Splits one action into local transactions, and on failure runs the inverse of each completed step in reverse order.",
    },
    {
      name: "Transactional outbox",
      role: "Stores the outgoing event in the same local transaction as the data, then relays it, so an event exists exactly when the change does.",
    },
    {
      name: "Idempotency-key table",
      role: "A hash lookup of ids already processed lets a consumer skip a repeated delivery.",
      dsa: "hashing",
    },
  ],
  realWorld: [
    {
      system: "Google Spanner",
      kind: "industry",
      problem:
        "A transaction may touch rows that live in different replica groups, spread across machines and sites, and must still commit atomically.",
      applied:
        "Spanner's published design runs two-phase commit across the groups involved. Each group is itself replicated with Paxos, so the coordinator and the participants do not disappear when one machine fails. That removes most of the blocking risk found in plain 2PC.",
      evidence: "Corbett et al., Spanner: Google's Globally-Distributed Database (OSDI 2012)",
      impact:
        "Applications get ordinary transactions across partitions, paid for with extra round trips and commit latency.",
    },
    {
      system: "Debezium and the outbox pattern",
      kind: "industry",
      problem:
        "A service saves an order and must also tell other services, but saving then publishing can lose the event on a crash.",
      applied:
        "The documented outbox pattern has the service insert the event into an outbox table inside the same database transaction. Debezium reads the database's change log and publishes the rows to Kafka. Consumers de-duplicate, since delivery is at least once.",
      evidence: "Debezium documentation: outbox event router; Chris Richardson, Microservices Patterns",
      impact:
        "The event exists if and only if the business change committed, and no distributed transaction is needed.",
    },
    {
      system: "Temporal and Uber Cadence workflows",
      kind: "industry",
      problem:
        "A long business process calls several services and must survive crashes, retries and partial failure, running compensations when it cannot finish.",
      applied:
        "Workflow engines such as Temporal and its predecessor Cadence record each step's result in durable history, retry steps, and let the author code a saga: on failure, run the compensations for completed steps. Temporal publishes saga samples in its documentation.",
      evidence: "Temporal documentation: saga pattern; Uber Engineering, Cadence",
      impact:
        "The orchestrator's state survives restarts, so a half-finished booking is resumed or reversed, not forgotten.",
    },
    {
      system: "UPI payment reversal",
      kind: "industry",
      problem:
        "A UPI transfer debits the payer's bank and credits the payee's bank. These are two separate banks with their own ledgers, and the credit step can fail or time out after the debit has gone through.",
      applied:
        "The flow is built as debit, then credit, with a status check and an automatic reversal when the credit does not complete. It is a compensation-style design: the debit is real and visible first, and the reversal later restores the payer. NPCI publishes the response codes and the timeline for reversals.",
      evidence: "NPCI UPI procedural guidelines and dispute-handling circulars",
      impact:
        "Money is not lost between two banks, but the payer may briefly see a debit that is later returned.",
    },
  ],
  insights: [
    {
      t: "2PC trades liveness for atomicity",
      d: "Every participant votes yes and then waits. If the coordinator dies, they hold locks until it returns, which is why it stays inside one platform.",
    },
    {
      t: "A saga undoes meaning, not bytes",
      d: "Each step commits for real. A compensation is a new action, such as a refund, and it must be safe to retry.",
    },
    {
      t: "Outbox turns two writes into one",
      d: "Save the event beside the data in one local transaction, relay it later. Delivery is at least once, so consumers de-duplicate.",
    },
    {
      t: "The best distributed transaction is none",
      d: "Keep data that must agree in one database. Split only for a real reason, because each split turns an update into a saga.",
    },
  ],
  pitfalls: [
    "Writing to the database and then to a queue in the same request and calling it safe. A crash between the two silently loses or invents an event.",
    "Writing a saga step without its compensation, or a compensation that is not idempotent. A retried refund that pays twice is a new bug.",
    "Assuming a timeout means failure. The remote step may have succeeded, so query its state before compensating.",
  ],
  quiz: [
    {
      q: "In two-phase commit, what does a participant promise when it votes yes in the prepare phase?",
      options: [
        "That its change is already visible to other readers of the data",
        "That it can still commit on command, even after it crashes",
        "That all the other participants have voted yes as well",
        "That it will roll back by itself if the coordinator goes quiet",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A yes vote is a durable promise to commit if told to. The participant logs its work and keeps its locks, so it cannot change its mind alone.",
      distractors: [
        "Visibility would break atomicity. Changes stay hidden behind locks until the decision arrives.",
        "",
        "A participant only knows its own vote. The coordinator is the one that gathers all the votes.",
        "That would be a unilateral abort, which a yes voter has given up the right to do. This is exactly why 2PC blocks.",
      ],
    },
    {
      q: "What does a saga use in place of a database rollback when a later step fails?",
      options: [
        "A global lock held until every service has finished its step",
        "A second vote among the services to confirm the step",
        "A database snapshot restored on every service at once",
        "A new action that undoes the effect of a finished step",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Each saga step has already committed locally, so there is nothing to roll back. A compensating action, such as a refund, reverses its business meaning.",
      distractors: [
        "A cross-service lock is what sagas avoid. It would bring back the blocking problem of 2PC.",
        "A second vote is another round of coordination. A saga has no voting phase at all.",
        "Restoring snapshots would also erase other users' unrelated changes made in between.",
        "",
      ],
    },
    {
      q: "An order service saves an order and then publishes an event to Kafka. It sometimes crashes between the two, so the event is missing. What is the standard fix?",
      options: [
        "Save the event in an outbox table in the same transaction, then relay it",
        "Publish the event first, then save the order afterwards",
        "Catch the failure and retry the publish inside the request",
        "Raise the database timeout so the commit always finishes",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The outbox row commits atomically with the order, so the event exists exactly when the order does. A separate relay delivers it, retrying until the broker accepts.",
      distractors: [
        "",
        "Reversing the order only moves the gap. A crash after publishing leaves an event for an order that was never saved.",
        "A retry inside the request is lost if the process itself dies, which is the failure being fixed.",
        "A longer timeout does not help when the process crashes. The two writes are still separate.",
      ],
    },
    {
      q: "A 2PC coordinator crashes after all 3 participants voted yes and before it sends any decision. What state are the participants in?",
      options: [
        "They time out and abort, since no commit message has arrived",
        "They commit at once, since every vote was yes",
        "They stay in doubt and hold locks until the coordinator is back",
        "They elect a new coordinator and re-run the prepare round",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Each participant promised to commit if told, but cannot know the decision. It cannot abort or commit alone, so it waits with locks held. This is the blocking problem.",
      distractors: [
        "Aborting alone could contradict a commit decision the coordinator logged before it crashed.",
        "A participant cannot see the other votes, so it cannot know all were yes.",
        "",
        "Electing a new coordinator is not part of basic 2PC. Consensus-based variants add it, and that is extra machinery.",
      ],
    },
    {
      q: "A ticket saga has reserved a seat and then the card charge fails. What should the orchestrator do?",
      options: [
        "Retry the charge for ever, since the seat is held for now",
        "Roll back the seat database transaction",
        "Leave the seat held until the customer returns to pay",
        "Release the seat as a compensation and fail the order",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The seat step committed long ago, so it cannot be rolled back. The saga runs its compensation, which frees the seat, and records the failure so the customer sees a clear result.",
      distractors: [
        "An endless retry blocks a seat that other buyers want, and a declined card may never succeed.",
        "That transaction already committed. Only a new action can reverse its effect.",
        "A held seat with no payment is the kind of leak that empties inventory at a Tatkal opening.",
        "",
      ],
    },
    {
      q: "An outbox relay publishes an event, then crashes before marking the row as sent. After the restart it publishes the same event again. How should the consumer cope?",
      options: [
        "Trust the broker to remove the repeat before it is delivered",
        "Record handled event ids and skip an id it has already processed",
        "Delete the outbox row before publishing, so repeats cannot happen",
        "Process it twice, since repeated effects are usually harmless",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The outbox gives at-least-once delivery, so duplicates are expected. The consumer makes processing idempotent by remembering the ids it has applied.",
      distractors: [
        "Brokers do not know which events mean the same business fact. De-duplication belongs to the consumer.",
        "",
        "Deleting before publishing turns a crash into a lost event, which is the original problem.",
        "A repeated payment or order is not harmless. Safe repeats must be designed, not assumed.",
      ],
    },
    {
      q: "A wallet moves ₹2,000 between two MySQL shards in one datacentre. Debit and credit must never show half-done, volume is modest, and the accounts cannot share a shard. What fits?",
      options: [
        "Two-phase commit across the two shards, accepting the blocking risk",
        "A saga with a refund, since 2PC is never used in production",
        "Two independent writes, repaired by a nightly reconciliation",
        "A fire-and-forget message that credits the second account later",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The need is isolation: no reader may see the debit without the credit. Parties are few, local and under one team, so 2PC's cost is tolerable. A saga would expose the half-done state.",
      distractors: [
        "",
        "2PC is used in production, for example inside Spanner. A saga also shows the debit before the credit.",
        "A nightly repair leaves a day of wrong balances, which the stated requirement rules out.",
        "Fire-and-forget can drop the message, and the money would vanish from both sides.",
      ],
    },
    {
      q: "A two-person team runs orders and invoices in one MySQL database behind one Laravel app. A colleague proposes two services with separate databases, linked by sagas. What is the sound judgement?",
      options: [
        "Do it, because sagas are the modern standard for orders",
        "Do it, then use 2PC between them to stay safe",
        "Keep one database until a real boundary forces a split",
        "Do it, and add a distributed lock to prevent any races",
      ],
      answer: 2,
      difficulty: "judge",
      why: "One database already gives atomic updates for free. Splitting adds sagas, compensations, an outbox and duplicate handling, with no scale, ownership or isolation need to pay for it.",
      distractors: [
        "Sagas are a response to a split, not a reason for one. They add work and weaker isolation.",
        "Using 2PC after splitting is worse than not splitting. It adds the slowest tool to a problem that need not exist.",
        "",
        "A distributed lock adds its own failure modes and does not give atomic commits.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-distributed-transactions-live-order",
      scenario:
        "A trading engine on one server places a live order with a broker. The engine's MySQL tables hold the order record, and the broker's API is the only place that can confirm an order exists. A call can time out with no answer, and the engine restarts at every deploy. A mistaken duplicate order can cost lakhs of rupees. How should the order be recorded?",
      options: [
        {
          label: "Store the order row with the engine's own id first, send that id to the broker as a tag, update on the answer, and reconcile against the broker list after a restart",
          appeal:
            "A durable record of intent exists before the risky call, and the broker's own list settles any doubt.",
        },
        {
          label: "Call the broker first, and write the order row only after a successful reply",
          appeal:
            "No row is ever written for an order the broker rejected, so the table stays tidy.",
        },
        {
          label: "Wrap the broker call and the database write in one database transaction",
          appeal:
            "It looks like the simplest way to get all-or-nothing behaviour.",
        },
        {
          label: "Use two-phase commit with the broker as a participant",
          appeal:
            "It is the textbook answer for atomic commit across two systems.",
        },
      ],
      best: 0,
      verdict:
        "The broker cannot join any transaction, so atomic commit is off the table. Recording intent first, with an id the broker also stores, means a timeout or crash leaves a row that can be matched to the broker's list and finished or cancelled. Calling the broker first leaves a live order with no record after a crash. A database transaction cannot roll back an order already sent.",
      claims: [
        {
          text: "You accept that the row can say 'sent' while the broker never received it, so a repair step must exist.",
          axis: "trade",
          correct: true,
          note: "True. Intent is recorded before the outcome is known, and reconciliation closes the gap.",
        },
        {
          text: "You accept an extra database write before every order, in return for being able to find the order after any crash.",
          axis: "trade",
          correct: true,
          note: "True. A small write is cheap next to an unrecorded live order.",
        },
        {
          text: "You get true atomicity between the database and the broker.",
          axis: "trade",
          correct: false,
          note: "No. The two stay separate. You get detectability and repair, not atomic commit.",
        },
        {
          text: "If the call times out and the engine simply resends with a new id, the broker may hold two orders.",
          axis: "failure",
          correct: true,
          note: "True. A timeout does not prove failure. Reuse the same tag or look the order up first.",
        },
        {
          text: "A timeout from the broker means the order was not placed, so it is safe to retry at once.",
          axis: "failure",
          correct: false,
          note: "A timeout means the outcome is unknown. The order may well exist.",
        },
        {
          text: "Count rows still unresolved after a restart and how many differ from the broker's list.",
          axis: "measure",
          correct: true,
          note: "True. These numbers show how often the gap is hit and whether repair works.",
        },
        {
          text: "Orders placed per day show whether the recording step is correct.",
          axis: "measure",
          correct: false,
          note: "Volume says nothing about whether rows match the broker. Only the comparison does.",
        },
      ],
    },
    {
      id: "sd-distributed-transactions-festival-checkout",
      scenario:
        "An e-commerce site runs a festival sale with 40,000 checkouts a minute. Order, inventory and payment are three services with their own databases, and payment goes through an external gateway that sometimes takes 30 seconds to answer. An order must never be paid for without stock, and stock must not stay locked for abandoned payments. Which design suits this?",
      options: [
        {
          label: "One shared database for all three services, with one big transaction",
          appeal:
            "A local transaction is easy and exactly atomic.",
        },
        {
          label: "Two-phase commit across the three databases and the gateway",
          appeal:
            "Gives a single atomic outcome for the whole checkout.",
        },
        {
          label: "An orchestrated saga: reserve stock, charge, confirm, with compensations and an outbox for each service's events",
          appeal:
            "No cross-service locks, steps can be retried, and failures unwind by business actions.",
        },
        {
          label: "Call the three services in order and log any failure for manual repair",
          appeal:
            "The least code to write.",
        },
      ],
      best: 2,
      verdict:
        "At 40,000 a minute, with a gateway that can take 30 seconds, holding locks across services would exhaust capacity and the gateway cannot take part in 2PC anyway. A saga lets stock be reserved with an expiry, payment run on its own clock, and failures unwound by releasing stock. Manual repair cannot cope with sale volumes, and one shared database removes the isolation between teams and becomes the bottleneck.",
      claims: [
        {
          text: "You accept that a customer or another buyer can see stock marked reserved before payment has succeeded.",
          axis: "trade",
          correct: true,
          note: "True. A saga exposes intermediate states, which is why reservations carry an expiry.",
        },
        {
          text: "You gain isolation: no reader ever sees an order half-processed.",
          axis: "trade",
          correct: false,
          note: "Sagas give up isolation. Readers can see in-between states.",
        },
        {
          text: "If the gateway answers after the saga timed out and released the stock, the payment must be refunded or the order revived.",
          axis: "failure",
          correct: true,
          note: "True. A late success is a normal case and needs a defined handling path.",
        },
        {
          text: "A compensating refund that runs twice after a retry can pay the customer twice unless it is idempotent.",
          axis: "failure",
          correct: true,
          note: "True. Retries are certain, so compensations carry idempotency keys.",
        },
        {
          text: "With 2PC, a gateway outage cannot slow down stock reservation.",
          axis: "failure",
          correct: false,
          note: "In 2PC the prepared stock rows stay locked while the gateway is slow, so the slowness spreads.",
        },
        {
          text: "Watch the age of reserved-but-unpaid stock, the compensation failure count and the payments with no matching order.",
          axis: "measure",
          correct: true,
          note: "True. These show leaks, failed unwinds and orphan money.",
        },
        {
          text: "The average checkout time over the whole day shows whether sagas are leaking stock.",
          axis: "measure",
          correct: false,
          note: "Leaks show up as aged reservations, not in an average that hides the sale spike.",
        },
      ],
    },
    {
      id: "sd-distributed-transactions-margin-hold",
      scenario:
        "A broker platform with 2 million users blocks margin when a user places an order. The wallet service and the order service have separate databases. The order may fill in a second, fill after minutes, or be rejected, and the user's free balance must never be overspent by two quick orders. Which approach fits?",
      options: [
        {
          label: "Debit the wallet immediately and refund it if the order is rejected",
          appeal:
            "Simple, because there is only one kind of wallet operation.",
        },
        {
          label: "Try-confirm-cancel: place a hold on the margin, confirm it into a debit on fill, cancel it on reject, and expire stale holds",
          appeal:
            "Reduces free balance at once, so no overspend, and every outcome has a defined end state.",
        },
        {
          label: "Hold database locks on the wallet row until the order fills or is rejected",
          appeal:
            "Strongest guarantee that nothing else touches the balance.",
        },
        {
          label: "Check the balance without reserving, and trust the exchange to reject bad orders",
          appeal:
            "Cheapest and avoids any hold bookkeeping.",
        },
      ],
      best: 1,
      verdict:
        "The need is to reduce usable balance at once without finalising a debit that may be undone. A hold does exactly that, and confirm or cancel settles it later, with an expiry for lost messages. An immediate debit makes every rejection a refund and shows a wrong ledger, row locks held for minutes would stall a user's other orders, and an unreserved check allows two orders to spend the same money.",
      claims: [
        {
          text: "You accept a third state, held, in the wallet model, and a job that expires abandoned holds.",
          axis: "trade",
          correct: true,
          note: "True. TCC adds a reservation state that must be managed.",
        },
        {
          text: "You avoid building cancel and confirm paths, since the hold clears itself.",
          axis: "trade",
          correct: false,
          note: "Expiry is only a backstop. Confirm and cancel are the main paths and must be built.",
        },
        {
          text: "If the fill message is lost and there is no expiry or reconciliation, margin stays held for ever.",
          axis: "failure",
          correct: true,
          note: "True. The expiry and a periodic check against order state prevent leaked holds.",
        },
        {
          text: "If confirm is delivered twice, an idempotent confirm applies it once; a non-idempotent one debits twice.",
          axis: "failure",
          correct: true,
          note: "True. Confirm and cancel must carry the hold's id and be safe to repeat.",
        },
        {
          text: "A cancel that arrives before its try cannot happen, so it needs no handling.",
          axis: "failure",
          correct: false,
          note: "Out-of-order delivery is real. A cancel for an unknown hold must be recorded so a late try is refused.",
        },
        {
          text: "Track total margin currently held, the age of the oldest hold and holds expired per day.",
          axis: "measure",
          correct: true,
          note: "True. They reveal leaked holds and lost messages.",
        },
        {
          text: "The wallet service's read latency shows whether holds are leaking.",
          axis: "measure",
          correct: false,
          note: "Read speed is unrelated. Leaks appear as old holds with no live order behind them.",
        },
      ],
    },
  ],
};

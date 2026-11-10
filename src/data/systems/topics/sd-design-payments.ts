import type { Topic } from "../../types.ts";

export const sdDesignPayments: Topic = {
  id: "sd-design-payments",
  title: "Design a payment system",
  tier: 10,
  week: 20,
  depth: "deep",
  summary:
    "Move money without losing or doubling it: UPI-style flow, idempotency keys, a double-entry ledger, a payment state machine and reconciliation with the bank.",
  why: "Payments are the one domain where a bug is counted in rupees and the network is not allowed to be unreliable. Timeouts, retries and crashes all happen, and the design must still guarantee that money is never lost and never taken twice. The same four tools solve it everywhere: idempotency keys, a ledger that always balances, an explicit state machine and reconciliation against an outside source of truth. Learn them here and they transfer to order management, billing and any system where an action must happen once.",
  learn: {
    intuition:
      "Think of a shopkeeper's account book. Every sale is written twice: once as money coming into the till, once as goods or a debt going out, and the two entries always add to zero. If the totals ever differ, something is wrong and you know it. When a customer hands over a cheque, you do not call the sale complete. You write 'pending', wait for the bank to clear it, and only then mark it done or bounced. If the customer comes back and says 'I paid yesterday', you look up the receipt number rather than charge again. And at the end of each day you match your book against the bank's statement, line by line. Any line in one and not in the other is a problem to chase. A payment system is that book, run by machines that must not lose their place.",
    mechanics: [
      {
        heading: "Requirements and scale, with numbers",
        body: "Functional: a payer pays a payee, the result is shown, balances and statements are correct, refunds work, and merchants are told by callback. Non-functional: money is never lost or doubled, every state is auditable, and the system survives crashes and bank timeouts. UPI in India has been publicly reported above ten billion transactions a month since 2023, about 3,900 a second on average with much higher peaks. Take a gateway with 100 million payments a day: about 1,150 a second, perhaps 6,000 at peak. Each payment writes two ledger rows, so roughly 200 million rows a day. Correctness beats speed: 2 seconds is fine, a wrong balance is not.",
      },
      {
        heading: "API and data model",
        body: "The call is `POST /payments` with `amount_paise`, `payer`, `payee`, and an `Idempotency-Key` header chosen by the client. Money is an integer in paise, never a floating-point number. Tables: `payments` (id, idempotency_key with a unique index, state, amount, version), `accounts` (id, owner), and `ledger_entries` (id, payment_id, account_id, direction debit or credit, amount). Ledger rows are only ever added, never edited, so history is an audit trail. An outbox table holds events such as 'payment succeeded', written in the same database transaction as the state change, so a merchant callback can never be lost or invented.",
      },
      {
        heading: "High-level design",
        body: "In a UPI-style flow the payer's app asks its provider to start a payment; the request travels through the NPCI switch to the payer's bank, which debits the account, then to the payee's bank, which credits it, and the result returns the same way. In your own gateway: client to API, which checks the idempotency key and creates a `payments` row in state CREATED; a payment service calls the bank or switch connector; the bank's answer, or a later callback, moves the state; on success the ledger entries are posted; an outbox relay then notifies the merchant. A status-check job asks the bank about any payment stuck in PENDING. Nightly reconciliation compares our records with the bank's settlement file.",
      },
      {
        heading: "The hard part: unknown outcomes and never doubling money",
        body: "The danger is the timeout. If the bank call times out, the money may or may not have moved. Retrying blindly can debit twice, and failing the payment can leave the customer debited but the order unpaid. So the state machine has a PENDING state that means 'outcome unknown', and the only way out is a status query or a callback, never a guess. Idempotency keys make client retries return the original result. The ledger post carries a unique key on (payment_id, entry_type), so a replay cannot post twice, and a transaction posts both legs or neither. Reconciliation then sorts our rows and the bank's by reference and merges them, flagging anything unmatched for repair.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed does not take payments yet. Its pricing plan is a planning document and says charging is months away, so there is no ledger, gateway or reconciliation job to describe. When it does, a hosted gateway such as UPI-based checkout should hold the card or bank details, and Traed should keep only a payment record, an idempotency key and a webhook handler that is safe to replay. The nearest idea Traed already uses is on the broker side: the broker is the source of truth for orders and positions, and our book is reconciled against it. A subscription ledger would follow the same rule.",
      },
    ],
    complexityDerivation:
      "The design holds because every dangerous step is made safe to repeat, and every unknown is made explicit. An idempotency key turns a retried request into a lookup, so the number of times a client asks no longer changes the number of times money moves. A double-entry ledger enforces an invariant that can be checked mechanically: for every payment the debits equal the credits, so money can only move, never appear or vanish, and a nightly sum over all rows must come to zero. The state machine forbids impossible transitions, such as SUCCESS to FAILED, so a late or duplicate callback cannot rewrite history. Finally the bank is treated as an outside witness; reconciliation catches whatever the other three miss, because the bank's statement is the record of what really happened. The argument stops holding when a participant cannot be queried, since an unknown outcome then needs a person, and when the ledger and the payment table are updated in separate transactions, which allows a crash between them.",
    variants: [
      {
        name: "Synchronous payment with a hosted gateway",
        when: "Small business, low volume, and you want to avoid holding payment data.",
        delta:
          "The customer is redirected to the gateway, which handles the bank. You store the order and a payment record, and trust a signed webhook plus a status call. Least risk, but you depend on the gateway's uptime and fees.",
      },
      {
        name: "Authorise then capture (cards)",
        when: "The final amount is not known at checkout, such as a hotel, fuel or a marketplace order.",
        delta:
          "The first step holds funds, the second takes them, often within days, and settlement to the merchant follows later. More states to track, such as authorised, captured, voided and refunded.",
      },
      {
        name: "Saga across services with compensation",
        when: "A payment spans several services, such as inventory, wallet and shipping, with no shared database.",
        delta:
          "Each step has an undo action, and a failure runs the undos. It avoids a distributed lock, but compensation must itself be idempotent and some steps, such as an SMS sent, cannot be undone.",
      },
    ],
    tradeoffs: [
      {
        vs: "Fail the payment on timeout versus keep it pending",
        pick: "Keep it pending and resolve by status query",
        because:
          "Failing early risks a customer who is debited but unpaid. Pending is slower to resolve, but it never claims something that has not been confirmed.",
      },
      {
        vs: "Update a balance column versus append ledger entries",
        pick: "Append ledger entries and derive balances",
        because:
          "A balance column can be overwritten and hides how it got its value. An append-only ledger costs more storage and a sum or running total, but every rupee is explained and audited.",
      },
      {
        vs: "One database transaction versus separate stores with a saga",
        pick: "One transaction wherever the data can live together",
        because:
          "A single transaction gives atomicity for free. Sagas and outbox patterns are needed only when the data truly spans systems, and they add states and compensations.",
      },
    ],
  },
  algorithms: [
    {
      name: "Idempotency key with a unique index",
      role: "Maps each client request key to one stored result, so a retried request returns the first outcome instead of moving money again.",
      dsa: "hashing",
    },
    {
      name: "Finite state machine",
      role: "Defines the only legal moves between CREATED, PENDING, SUCCESS, FAILED and REFUNDED, so late or repeated events cannot corrupt a payment.",
    },
    {
      name: "Double-entry ledger invariant",
      role: "Posts equal debits and credits for every payment, so the sum of all entries is always zero and any error is detectable.",
    },
    {
      name: "Sort-merge reconciliation",
      role: "Sorts internal records and the bank's file by reference and walks both lists once to find missing, extra and mismatched lines.",
      dsa: "sorting",
    },
  ],
  realWorld: [
    {
      system: "UPI and the NPCI switch",
      kind: "industry",
      problem:
        "Millions of payers and many banks must move money in seconds, and any hop can time out after the money has moved.",
      applied:
        "UPI routes a payment from the payer's app and provider through the NPCI switch to the remitting and beneficiary banks. A transaction can be left in a pending state when a response is lost, and the standard practice is a status check on the original reference rather than a new payment, with banks and apps reconciling against settlement files.",
      evidence: "NPCI UPI product documentation and published transaction-status guidance",
      impact:
        "A timeout becomes a pending state with a defined way out, instead of a guess that either doubles or loses money.",
    },
    {
      system: "Stripe idempotency keys",
      kind: "industry",
      problem:
        "A client that times out does not know whether a charge happened, and retrying a charge can bill the customer twice.",
      applied:
        "Stripe's public API accepts an Idempotency-Key header. It stores the status and body of the first request under that key and returns the same response for any retry with the same key. Keys are meant to be unique per intended operation, such as one order.",
      evidence: "Stripe API documentation: idempotent requests",
      impact:
        "Clients can retry freely, because the second call is a lookup and not a second charge.",
    },
    {
      system: "Double-entry bookkeeping",
      kind: "industry",
      problem:
        "Any record of money that can be edited in place hides mistakes and fraud, and cannot prove where a balance came from.",
      applied:
        "Merchants have recorded every transaction as equal debits and credits since at least the 15th century, and modern payment systems copy it: each payment posts offsetting entries to accounts, entries are never edited, and a correction is a new entry.",
      evidence: "Standard accounting practice; Luca Pacioli's Summa de arithmetica (1494)",
      impact:
        "An error shows up as a non-zero total that can be traced to specific entries.",
    },
    {
      system: "Card authorisation, capture and settlement",
      kind: "industry",
      problem:
        "A merchant often does not know the final amount at checkout, and the bank cannot hand over funds instantly.",
      applied:
        "Card networks split a payment into authorisation, which reserves funds, capture, which claims them, and settlement, where money actually moves to the merchant, usually a day or more later. Gateways expose each step, plus voids and refunds, as states of one payment.",
      evidence: "Card network and payment gateway documentation on auth, capture and settlement",
      impact:
        "The system's states match what the banks do, so the books can be reconciled against settlement reports.",
    },
  ],
  insights: [
    {
      t: "Timeout means unknown, not failed",
      d: "A payment whose bank call timed out is PENDING. Resolve it by asking the bank, never by guessing or by paying again.",
    },
    {
      t: "Idempotency keys make retries free",
      d: "A unique index on the client's key means any number of retries produce one payment and one result.",
    },
    {
      t: "Ledgers append, they do not edit",
      d: "Equal debits and credits, never overwritten. Balances are derived, and a correction is a new entry that reverses the old one.",
    },
    {
      t: "The bank is the witness",
      d: "Reconciliation compares your records with the bank's file. It finds what idempotency, state machines and ledgers missed.",
    },
  ],
  pitfalls: [
    "Storing money as a floating-point number. Use integer paise, because 0.1 + 0.2 is not exactly 0.3 in binary.",
    "Writing the payment state and the ledger entries in separate transactions. A crash between them leaves a paid order with no entries, or entries with no payment.",
    "Acting on a webhook without checking its signature or whether the payment is already final. A replayed or forged callback can then mark an unpaid order as paid.",
  ],
  quiz: [
    {
      q: "In double-entry bookkeeping, what must be true of the entries posted for one payment?",
      options: [
        "Each entry must be edited whenever the balance changes",
        "Credits are posted first and debits are posted a day later",
        "Only the payer's account needs an entry, to save space",
        "Total debits equal total credits, so the entries sum to zero",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Every movement is recorded on two sides, so the sum of all entries is zero. That invariant lets you detect errors by simple addition.",
      distractors: [
        "Ledgers are append-only. Editing entries destroys the audit trail.",
        "Both sides are posted together in one transaction. Posting at different times opens a window for an inconsistent state.",
        "A single-sided entry cannot be checked against anything and is how money appears or disappears.",
        "",
      ],
    },
    {
      q: "What does an idempotency key let a payment API do?",
      options: [
        "Encrypt the card or account details in transit",
        "Return the first result again when a request is retried",
        "Speed up payments by skipping the bank check",
        "Split one large payment into several smaller ones",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The key identifies the intended operation. The server stores the first result and returns it for any retry with the same key.",
      distractors: [
        "Encryption protects data in transit. It does not stop a charge from being repeated.",
        "",
        "Skipping the bank check would make payments unsafe, not idempotent.",
        "Splitting is a separate feature unrelated to retries.",
      ],
    },
    {
      q: "Your service calls the bank to debit a customer and the call times out after 8 seconds. What state should the payment be in, and what next?",
      options: [
        "PENDING; ask the bank for the status of the same reference before doing anything else",
        "FAILED; tell the customer to try again with a new payment",
        "SUCCESS; banks nearly always process requests that reach them",
        "CREATED; resend the same debit immediately until the bank answers",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A timeout leaves the outcome unknown. PENDING plus a status query resolves it correctly. Guessing either way can double-charge or lose a payment.",
      distractors: [
        "",
        "Failing it can leave the customer debited with no order, and a new payment would debit again.",
        "Assuming success can mark an order paid with no money received.",
        "An immediate blind resend risks a second debit if the first had succeeded.",
      ],
    },
    {
      q: "A merchant's webhook endpoint receives the same 'payment succeeded' event three times because it responded slowly. How should the handler behave?",
      options: [
        "Fulfil the order each time, since each event is a fresh confirmation",
        "Reject every repeat with an error so the sender stops",
        "Treat it by payment id: fulfil once, and return success for repeats",
        "Ignore all webhooks and check the payment status once a day",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Webhooks are delivered at least once. The handler keys on the payment id, performs the effect once, and acknowledges repeats so the sender stops retrying.",
      distractors: [
        "Fulfilling three times ships three orders.",
        "Error responses make senders retry more, and they hide that the first one worked.",
        "",
        "A daily check leaves customers waiting. Status polling is a backup, not a replacement.",
      ],
    },
    {
      q: "Your daily file shows 1,000,000 payments, the bank's settlement file shows 999,996 successes, and four of yours are SUCCESS with no bank line. What does reconciliation do?",
      options: [
        "Delete the four payments from our records so that both files match",
        "Flag them, query the bank on each reference, and fix with new entries",
        "Add four matching lines to the bank's file so the counts agree",
        "Leave them alone, since 99.9996 percent matching is close enough",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Unmatched lines are exceptions to investigate. The fix is a new, auditable entry, never an edit or deletion of history.",
      distractors: [
        "Deleting history destroys the audit trail and may hide a real loss.",
        "",
        "The bank's file is the outside record. You cannot change it to match yours.",
        "Each unmatched line may be a customer debited or a merchant unpaid.",
      ],
    },
    {
      q: "A small Indian SaaS wants to charge a few thousand customers monthly. A teammate proposes building its own ledger, card vault and bank integration. What is the best advice?",
      options: [
        "Use a hosted gateway, and keep your own payment records and replay-safe webhooks",
        "Build it all, because owning every step gives the best control",
        "Skip records and trust the gateway's dashboard as the only history",
        "Store card numbers in your database for convenience, encrypted",
      ],
      answer: 0,
      difficulty: "apply",
      why: "At this size the gateway removes the heaviest risk and compliance work. You still need your own record and replay-safe webhooks, because the gateway can be wrong or late.",
      distractors: [
        "",
        "Full control comes with heavy compliance and operations work that a small team cannot justify.",
        "Without your own records you cannot reconcile, answer disputes or detect a missed webhook.",
        "Holding card numbers brings the full burden of card-data security rules.",
      ],
    },
    {
      q: "The design stores each account's balance as a number and updates it with UPDATE balance = balance - 500. An engineer says an audit log is unnecessary. What is the right judgement?",
      options: [
        "Fine, because the database transaction already guarantees correctness",
        "Fine, because balances can always be recomputed from the bank file",
        "Not fine, because the balance column is too large to store",
        "Not fine, because a bare balance cannot show how it got its value",
      ],
      answer: 3,
      difficulty: "judge",
      why: "A transaction makes one update atomic. It does not tell you why a balance is what it is. An append-only ledger lets you audit, trace and re-derive every balance.",
      distractors: [
        "Atomicity protects one update. It does not give history or a way to spot a wrong amount.",
        "The bank file covers only what reached the bank, not your internal movements.",
        "Size is not the concern. Traceability is.",
        "",
      ],
    },
    {
      q: "To cut latency, a team proposes marking the order paid as soon as the customer returns from the payment page with a success redirect. What is the right judgement?",
      options: [
        "Fine, because the success redirect comes straight from the bank",
        "Fine, as long as the redirect URL is long enough to be hard to guess",
        "Not fine; the browser controls the redirect, so confirm server to server",
        "Not fine, because redirects are always slower than polling",
      ],
      answer: 2,
      difficulty: "judge",
      why: "The browser can be edited, closed early or replayed. Only a server-to-server confirmation from the gateway or bank is trustworthy evidence of payment.",
      distractors: [
        "The redirect passes through the customer's browser, which can forge or alter it.",
        "A long URL is still only a claim from the client side, not proof from the bank.",
        "",
        "Speed is not the issue. Trust is.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-payments-saas-subscriptions",
      scenario:
        "A two-person Indian SaaS startup wants to charge 2,000 customers a monthly subscription of ₹799 by UPI and card. They have one PostgreSQL database, no compliance team, and cannot afford a payment-data breach. A missed or doubled charge would mean refunds and support time. What design should they use?",
      options: [
        {
          label: "A hosted gateway for payment capture, with their own payment table, a unique idempotency key per charge, replay-safe signed webhooks and a daily status check",
          appeal:
            "Keeps sensitive data off their servers and still gives them their own correct record.",
        },
        {
          label: "Their own card vault and direct bank connections with a full double-entry ledger",
          appeal:
            "Total control and no gateway fees.",
        },
        {
          label: "Redirect to a payment page and mark the order paid on the success redirect",
          appeal:
            "Simplest flow, and the customer is back at once.",
        },
        {
          label: "A manual UPI transfer to a bank account, matched in a spreadsheet",
          appeal:
            "No integration cost at all.",
        },
      ],
      best: 0,
      verdict:
        "A gateway takes the card and bank data and the compliance burden, which the team cannot carry. Their own records, keys and webhook handling still make charges safe to retry and reconcilable. A custom vault is a large security and regulatory risk, trusting the redirect lets customers mark themselves paid, and spreadsheet matching does not scale past a few dozen customers.",
      claims: [
        {
          text: "You accept gateway fees and dependence on its uptime, in return for not holding payment data.",
          axis: "trade",
          correct: true,
          note: "True. The fee buys away the highest-risk part of the system.",
        },
        {
          text: "Keeping your own payment table lets you answer disputes and detect a missed webhook.",
          axis: "trade",
          correct: true,
          note: "True. The gateway's dashboard is not a record you control.",
        },
        {
          text: "Using a gateway means you no longer need to reconcile anything.",
          axis: "trade",
          correct: false,
          note: "Webhooks can be late or lost, so a status check or settlement report still matters.",
        },
        {
          text: "If a webhook is lost, a paid customer can stay unactivated until a status check finds the payment.",
          axis: "failure",
          correct: true,
          note: "True. That is why a periodic status job complements webhooks.",
        },
        {
          text: "A replayed webhook cannot change anything if the gateway signs it.",
          axis: "failure",
          correct: false,
          note: "A signature proves origin, not freshness. A genuine event can arrive twice, so the handler must be idempotent.",
        },
        {
          text: "Compare the gateway's daily settlement report with your payment table and count unmatched lines.",
          axis: "measure",
          correct: true,
          note: "True. Unmatched lines are the early warning of lost or doubled charges.",
        },
        {
          text: "Revenue per month shows whether payments are being recorded correctly.",
          axis: "measure",
          correct: false,
          note: "Revenue can look right while individual charges are missing or doubled.",
        },
      ],
    },
    {
      id: "sd-design-payments-upi-scale",
      scenario:
        "A payments app in India handles 5,000 UPI payments a second at peak, such as at festival time. The bank leg times out on about 0.5 percent of requests, which is 25 a second. Customers see 'processing', and support is flooded with 'money debited, no confirmation' tickets. Engineers can retry the bank call, fail timeouts, or hold them pending. What should the system do?",
      options: [
        {
          label: "Retry the debit call up to five times with a new reference each time",
          appeal:
            "Most transient failures are cleared by one more attempt.",
        },
        {
          label: "Fail every timeout right away and let the customer pay again",
          appeal:
            "Quick, clear answer for the customer.",
        },
        {
          label: "Mark timeouts PENDING, query the bank for the original reference on a schedule with backoff, and post the ledger only on a confirmed result",
          appeal:
            "Never claims an outcome it has not confirmed, and resolves most cases in seconds.",
        },
        {
          label: "Mark timeouts SUCCESS, since most of them do succeed, and fix exceptions later",
          appeal:
            "Customers see success immediately and support tickets drop.",
        },
      ],
      best: 2,
      verdict:
        "Twenty-five unknown outcomes a second need a state for 'unknown' and a defined way out. Status queries on the original reference resolve them without guessing. Failing them early debits customers for payments that count as failed, retries with new references can debit several times, and assuming success credits payees for money that never moved.",
      claims: [
        {
          text: "You accept that some customers wait in 'processing' for seconds or minutes, in return for never mis-stating a payment.",
          axis: "trade",
          correct: true,
          note: "True. Honest uncertainty costs waiting time but not money.",
        },
        {
          text: "A status job must be rate-limited and spread with backoff so that it does not flood the bank at the moment it is slowest.",
          axis: "trade",
          correct: true,
          note: "True. 25 unresolved payments a second would otherwise become a stream of retries.",
        },
        {
          text: "Querying the bank is unnecessary if the system retries the debit.",
          axis: "trade",
          correct: false,
          note: "A retry cannot tell you the first attempt's result and can duplicate it.",
        },
        {
          text: "If PENDING payments are never resolved, customers can be debited with the order still unpaid indefinitely.",
          axis: "failure",
          correct: true,
          note: "True. There must be a final resolution path, and an alert on payments pending too long.",
        },
        {
          text: "Retrying with a new reference is safe because the bank will reject duplicate amounts.",
          axis: "failure",
          correct: false,
          note: "Banks treat each reference as a separate payment. Only the same reference is recognised as a repeat.",
        },
        {
          text: "Track the number of payments in PENDING and the age of the oldest one.",
          axis: "measure",
          correct: true,
          note: "True. The oldest age shows whether resolution is working, the count shows scale.",
        },
        {
          text: "The overall success rate is enough to tell whether timeouts are handled well.",
          axis: "measure",
          correct: false,
          note: "A healthy-looking rate can hide hundreds of payments stuck in an unknown state.",
        },
      ],
    },
    {
      id: "sd-design-payments-ledger-bug",
      scenario:
        "A wallet service keeps a balance column per user. A crash between 'debit sender' and 'credit receiver' in two separate statements left ₹1,40,000 missing across a month, and nobody can say where it went. The team of five must fix the design so that money cannot be lost this way and any future gap is traceable. What should they build?",
      options: [
        {
          label: "Keep the balance columns and add try-catch with a manual undo in the code",
          appeal:
            "Small change to the existing code.",
        },
        {
          label: "An append-only double-entry ledger where both legs of a transfer are inserted in one database transaction, with balances derived and a daily zero-sum check",
          appeal:
            "Makes half a transfer impossible and every rupee traceable.",
        },
        {
          label: "Write the debit to the database and the credit to a message queue to be applied later",
          appeal:
            "Decouples the two sides so each can scale.",
        },
        {
          label: "Run a nightly script that corrects the balances to match the total",
          appeal:
            "Fixes the numbers without touching the live path.",
        },
      ],
      best: 1,
      verdict:
        "The loss came from two writes that could be separated by a crash. Putting both ledger legs in one transaction makes them succeed or fail together, and an append-only record plus a zero-sum check turns any future gap into a visible number. A manual undo can itself be interrupted, splitting the writes between a database and a queue reintroduces the gap, and a nightly correction hides the cause.",
      claims: [
        {
          text: "You accept more storage and a sum query for balances, in return for a record that explains every rupee.",
          axis: "trade",
          correct: true,
          note: "True. Balances can be cached, but the entries are the truth.",
        },
        {
          text: "Keeping both legs in one database means this ledger cannot be spread over several databases without new machinery.",
          axis: "trade",
          correct: true,
          note: "True. Beyond one database you need sagas or an outbox, with more states.",
        },
        {
          text: "An append-only ledger makes the transfer slower than updating two numbers by a visible amount for users.",
          axis: "trade",
          correct: false,
          note: "Two inserts in one transaction cost about the same as two updates.",
        },
        {
          text: "If the legs are written in separate transactions, a crash between them still destroys the invariant.",
          axis: "failure",
          correct: true,
          note: "True. The single transaction is the part that carries the guarantee.",
        },
        {
          text: "A zero-sum check catches errors before they happen.",
          axis: "failure",
          correct: false,
          note: "It detects errors after the fact. Prevention comes from the single transaction.",
        },
        {
          text: "Run a periodic sum of all ledger entries, which must be zero, and alert on any other result.",
          axis: "measure",
          correct: true,
          note: "True. It is a cheap, complete test of the invariant.",
        },
        {
          text: "Counting transfers per day shows whether any money has been lost.",
          axis: "measure",
          correct: false,
          note: "A count of transfers says nothing about the amounts or whether both legs were posted.",
        },
      ],
    },
  ],
};

import type { Topic } from "../../types.ts";

export const sdReconciliation: Topic = {
  id: "sd-reconciliation",
  title: "Reconciliation: the broker is the truth",
  tier: 9,
  week: 18,
  depth: "deep",
  summary:
    "Your platform keeps its own book of positions; the broker keeps the real one. Reconciliation compares them, classifies the gaps and decides what to repair.",
  why: "Every stop, exit and position size in Traed assumes its own record of positions is right. It can be wrong after a crash, a missed fill, a manual trade in the broker app or an exit that never reached the broker. Reconciliation is how you find out, and the rules about what to repair and what to only report decide whether a gap becomes a small alert or an unmanaged short option. You need these rules to explain why Traed never trusts its own memory over the broker.",
  learn: {
    intuition:
      "Think of a shopkeeper who keeps a stock register while the warehouse keeps its own. Each evening the shopkeeper walks the shelves and compares them to the register. Sometimes a box is on the shelf but not in the register, because a delivery was never written down. Sometimes the register lists a box that is gone. Sometimes both agree a box exists but disagree on how many tins it holds. Whichever it is, the shelves are the real stock, because you cannot sell what is not there. The register is only a note about the shelves. A trading platform has the same two books: its own record of what it holds, and the broker's record of what the account really holds. The broker's record is the one the exchange and clearing house stand behind. Reconciliation is the evening walk, repeated often enough that a gap is found while it is still small.",
    mechanics: [
      {
        heading: "Two books, and why the broker's wins",
        body: "Your engine keeps a record of positions and orders because it must act at once, without a network call: check a stop, size an order, decide an exit. The broker keeps the account's real positions, backed by the exchange and the clearing corporation. When the two disagree, the broker's is the one that has money attached. Your book is a cache with opinions. Suppose the engine believes it is short 65 units of a call and the broker shows nothing. If the engine's stop then fires, it sends a buy of 65 and the account ends up long 65, an exposure nobody intended.",
      },
      {
        heading: "When to reconcile",
        body: "There are three useful moments. On start-up, because a restart is exactly when your memory is least reliable. On a timer during market hours, because things go wrong silently while the process is running. And after events that often cause drift, such as a fill. A timer alone has a blind period; a start-up check alone ignores everything after. Run all three, and also send a daily summary that states the result either way, so that a quiet day is a confirmed clean day rather than a day on which the check might have been broken.",
      },
      {
        heading: "The classes of difference",
        body: "Comparing two books of 'symbol and signed quantity' gives only a few outcomes. Missing here: the broker holds a position the engine has no record of, so no stop protects it. Missing there: the engine holds one the broker does not, a ghost, whose exit would open the opposite position. Quantity mismatch: both hold it but disagree on size. A fourth class comes from orders rather than positions: an order still working at the broker long after it was placed. Naming the class matters because each has a different danger and a different safe response.",
      },
      {
        heading: "Repair or alert and stop",
        body: "Automatic repair is safe only when the broker's number is unambiguous and the repair loses nothing. Dropping a ghost position, or taking the broker's quantity, qualifies. Adopting an untracked position does not, because the engine has no entry price, stop level or strategy for it. Repair is also unsafe when the broker's net figure cannot be attributed, as when two strategies hold the same contract. And never place trades to make the broker match your book. For the cases you cannot repair safely, alert and leave the decision to a person. Wait until a mismatch persists, so an order that filled seconds ago does not trigger a false alarm.",
      },
      {
        heading: "Saying it about Traed",
        body: "We treat the broker as the truth and our own record as a cache. At every live start we compare cached positions with the broker: a position the broker does not hold is dropped, a quantity difference takes the broker's figure, and a broker position we have no record of is reported, not adopted, because it has no stop or entry context. During market hours a check every fifteen minutes alerts only on mismatches that persist, and a daily digest says the books agree. The cost is that manual trades are unmanaged until an operator attaches them. We would revisit that if several people traded the same account.",
      },
    ],
    complexityDerivation:
      "The invariant is that the quantity your engine manages equals the quantity the account holds, for every contract. Reconciliation does not make this true; it detects when it has stopped being true and bounds how long that can go unnoticed. The argument has three parts. The broker's book is authoritative, so any disagreement is a defect in yours. The check interval bounds the exposure: with a fifteen-minute timer, an untracked position goes unprotected for at most about that long plus a confirmation delay. And persistence rules, such as requiring a mismatch on two consecutive checks, trade a short delay for fewer false alarms from fills in flight. The design holds when one system owns an account and the broker reports a single net figure. It weakens when several strategies share a contract, since a net figure cannot be split between them, and when a person trades by hand on the same account. Then you need ownership recorded at order level, not position level.",
    variants: [
      {
        name: "Start-up reconciliation",
        when: "Any process that keeps positions in memory or a cache and can restart.",
        delta:
          "Runs once when the process comes up, before it acts. Repairs what is safe to repair. Cheap, and it catches the failures that restarts cause.",
      },
      {
        name: "Periodic reconciliation",
        when: "Long-running processes in market hours, where drift can start at any time.",
        delta:
          "A timer compares books and alerts on persistent differences. The interval sets the longest time a problem stays unseen, and each run costs one read of the broker's state.",
      },
      {
        name: "End-of-day and back-office reconciliation",
        when: "Brokers and funds that must match their ledgers to the clearing corporation's files.",
        delta:
          "A batch comparison of the day's complete trades against the official record, with an exceptions queue for people to work through. Thorough and late, so it complements the intraday check and does not replace it.",
      },
    ],
    tradeoffs: [
      {
        vs: "Automatically adopt any position the broker holds that you do not",
        pick: "Report it and let an operator attach it deliberately",
        because:
          "Adoption sounds helpful but gives the engine a position with no entry price, stop or strategy rules. A wrong guess manages it badly. A report is slower and leaves it unmanaged for minutes, but never invents context.",
      },
      {
        vs: "Alert on the first mismatch",
        pick: "Alert only when it persists across checks",
        because:
          "A fill that landed seconds ago makes the books differ briefly. Waiting for two checks and a few minutes removes most false alarms. The price is a short delay on real problems, which must be small against how fast the position can hurt you.",
      },
      {
        vs: "Compare once at end of day",
        pick: "Compare at start, on a timer in market hours, and at end of day",
        because:
          "A single evening check leaves a whole session where an unprotected or ghost position can move against you. More frequent checks cost a broker read each, which is small. The rate limit and the cost of a false alarm set the lower bound on the interval.",
      },
    ],
  },
  realWorld: [
    {
      system: "Clearing corporations and broker back offices",
      kind: "industry",
      problem:
        "A broker's own records of its clients' trades must agree with the official record kept by the exchange and its clearing corporation, or settlement fails.",
      applied:
        "Clearing corporations such as NSE Clearing compute each member's obligations from the day's trades. A broker's back office compares its own books with those files and works through the differences, called breaks, in an exceptions queue, then fixes its own books.",
      evidence: "NSE Clearing Limited: clearing and settlement process (public documentation)",
      impact:
        "The official record is authoritative and the broker conforms to it, which is the same direction of authority Traed uses against the broker.",
    },
    {
      system: "Kubernetes controllers",
      kind: "industry",
      problem:
        "A cluster's real state drifts from what was asked for, through crashes, deletions and manual changes.",
      applied:
        "A Kubernetes controller runs a loop. It reads the desired state and the observed state and acts to close the gap, repeatedly, not just once on an event. A missed event is corrected on the next pass.",
      evidence: "Kubernetes documentation: Controllers",
      impact:
        "Level-based checks recover from missed events. That is the property a periodic position check gives a trading engine.",
    },
    {
      system: "Traed start-up and periodic broker reconciliation",
      kind: "yours",
      problem:
        "The engine acts on its own position record, which can be wrong after a restart, a missed fill or a manual trade.",
      applied:
        "At every live start, cached positions are compared with the broker: a position the broker lacks is dropped, a quantity difference takes the broker's figure unless sibling strategies share the contract, and a position the engine has no record of is reported, not adopted. A check every fifteen minutes in market hours classifies differences as untracked, ghost, quantity or stuck order, alerts after they persist, and sends a daily digest.",
      evidence: "strategy-engine/app/services/live_reconciliation.py; strategy-engine/app/services/order_management/order_manager.py (reconcile_with_broker); strategy-engine/app/services/live_broker_sync.py",
      impact:
        "A silent gap becomes an alert within minutes, and a clean day is stated, not assumed.",
    },
    {
      system: "Traed 2026-07-16 orphaned position incident",
      kind: "yours",
      problem:
        "After an automatic restart of a paper session, a short option position was missing from the engine's record, so its exit condition never ran and the position stayed open.",
      applied:
        "The incident was traced to the restore step never running, because a guard checked for a method the cache does not have. The fix restores positions from the cache. The later work added a comparison with the broker at start, so a restored record is verified, not trusted.",
      evidence: "docs/incidents/2026-07-16-paper-position-never-exited.md; docs/live-readiness.md (LR-25)",
      impact:
        "It shows why an internal book needs an outside check: a silent loss of state looked like 'nothing to exit'.",
    },
  ],
  algorithms: [
    {
      name: "Set difference by hash join",
      role: "Matches your positions against the broker's by instrument key, so missing, extra and mismatched rows fall out of one pass.",
      dsa: "hashing",
    },
    {
      name: "Sort-merge comparison",
      role: "Walks two sorted lists side by side to compare large books in order without building a lookup table for either.",
      dsa: "sorting",
    },
    {
      name: "Checksum of a book",
      role: "Reduces a whole position list to one hash so a cheap equality test can say there is nothing to repair.",
      dsa: "hashing",
    },
  ],
  insights: [
    {
      t: "The broker's book is the truth",
      d: "Your record is a cache of it. On any disagreement, fix your record or alert; never place orders to make the broker match your belief.",
    },
    {
      t: "Three kinds of position difference",
      d: "Untracked (broker has it, you do not), ghost (you have it, the broker does not) and quantity mismatch. Add stuck orders for a fourth. Each has its own danger.",
    },
    {
      t: "Repair only what is unambiguous",
      d: "Dropping a ghost or taking the broker's quantity is safe. Adopting an untracked position is not, since it comes with no stop or entry context.",
    },
    {
      t: "Wait for a mismatch to persist",
      d: "A fill in flight makes the books differ briefly. Require the difference on two checks and a few minutes before alerting.",
    },
  ],
  pitfalls: [
    "Reconciling a symbol while an order for it is still unresolved. The broker's figure already includes that order's fill, so dropping or resizing the position and then booking the fill counts it twice.",
    "Resizing a strategy to the broker's net figure when two strategies hold the same contract. Each takes the whole net and then exits the other's lots too.",
    "Never saying when the check passes. If you only alert on problems, silence could mean clean or could mean the check is broken.",
  ],
  quiz: [
    {
      q: "When your platform's record of a position disagrees with the broker's, why is the broker's record the one to trust?",
      options: [
        "The broker's records are updated more often than yours are",
        "Brokers are regulated, so they cannot make any mistakes",
        "The clearing corporation settles against the broker's book",
        "Your platform stores positions in a cache that is always stale",
      ],
      answer: 2,
      difficulty: "recall",
      why: "The account's real holdings are the ones the exchange and clearing corporation settle against. Your record is a working copy that can be wrong. That is authority, not frequency.",
      distractors: [
        "Frequency is not the reason; a record can be updated often and still be wrong.",
        "Brokers do make errors. The reason is authority in settlement, not infallibility.",
        "",
        "A cache can be right most of the time. The point is that when it is wrong, the broker's wins.",
      ],
    },
    {
      q: "The broker holds a position that your engine has no record of. What is this difference usually called, and what is the main danger?",
      options: [
        "Untracked; no stop or exit rule is protecting it",
        "A ghost; the engine's exit would open the opposite position",
        "A quantity mismatch; the engine sizes later orders wrongly",
        "A stuck order; it may fill at a stale price",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The broker holds it and the engine does not know, so the position is unmanaged: no stop, no exit, no sizing. It may be a manual trade or an engine exit that was booked but never reached the broker.",
      distractors: [
        "",
        "A ghost is the reverse: the engine holds it and the broker does not.",
        "A quantity mismatch needs both books to hold the position with different sizes.",
        "A stuck order is about an order still working, not a position the engine is unaware of.",
      ],
    },
    {
      q: "Your engine believes it is short 65 units of a NIFTY call. The broker shows no position. The stop-loss now triggers a buy-to-close of 65. What is the account's position afterwards?",
      options: [
        "Flat, since buying 65 cancels the short",
        "Long 65 units, an exposure nobody intended",
        "Still short 65, because the order is rejected",
        "Short 130 units",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The broker really held nothing, so a buy of 65 opens a long of 65. This is the 'ghost' danger: an exit built on a position that is not there creates the opposite position.",
      distractors: [
        "That would be true only if the short existed at the broker. It did not.",
        "",
        "Brokers do not reject a buy because you have no position. A buy is a valid new order.",
        "Short 130 would need a sell; the stop sent a buy.",
      ],
    },
    {
      q: "At 11:15 you open a short put by hand in the Kite app while your strategy is running. At the next check, your platform sees the position and has no record of it. What is the safest default?",
      options: [
        "Automatically adopt it into the closest-matching strategy",
        "Automatically close it, since the engine did not place it",
        "Ignore it; manual trades are the user's problem",
        "Report it, leave it alone, and let the operator attach it deliberately",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The engine has no entry price, stop or intended strategy for a manual trade. Adopting it invents context; closing it destroys a trade the user chose. Reporting it and offering an explicit attach step respects both.",
      distractors: [
        "The guess may attach the wrong stop and exit rules. A wrongly managed position is worse than a flagged one.",
        "Closing a position the user opened on purpose is a surprise trade with real cost.",
        "Ignoring it leaves a short option with no stop, which is the exact risk reconciliation exists to flag.",
        "",
      ],
    },
    {
      q: "Why should a reconciliation alert wait for a mismatch to appear on two consecutive checks, several minutes apart?",
      options: [
        "A fill seconds ago can make books briefly differ; real gaps persist",
        "The broker's API only updates positions once every ten minutes",
        "Alerts sent too soon are blocked by the Telegram rate limit",
        "Two readings are needed to compute an average quantity held",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Books can legitimately disagree for a few seconds around a fill. Persistence across checks filters those out, at the cost of a short delay on real problems.",
      distractors: [
        "",
        "Broker position data is far fresher than that. The delay comes from in-flight fills, not from broker refresh rates.",
        "The motive is accuracy of the alert, not message limits.",
        "No average is involved. The aim is to separate transient from persistent differences.",
      ],
    },
    {
      q: "Strategy A and strategy B, on the same account, each hold 65 units of the same strike. The broker reports a single net position of 130. At restart, A's cache says 65. What does a naive 'take the broker's figure' do?",
      options: [
        "Nothing; 65 and 130 agree after rounding it off",
        "It sets A to 130; A later exits B's lots too",
        "It sets A to 65, which is correct by luck",
        "It drops A's position as a ghost position",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The broker reports one net figure per contract for the account. Both strategies would each adopt 130. A safer comparison subtracts what sibling strategies hold, and keeps the cache while reporting if it cannot be explained.",
      distractors: [
        "There is no rounding; 65 and 130 are different sizes.",
        "",
        "65 is right only because of the subtraction of B's 65, which the naive rule does not do.",
        "The broker does hold the contract, so A's position is not a ghost.",
      ],
    },
    {
      q: "You restart the engine at 11:05. The cache says long 65. An exit order sent at 11:04 filled while the engine was down, and the broker now shows flat. The engine also re-reads that exit order's fill. What is the correct order of operations?",
      options: [
        "Reconcile first (drop the position), then book the exit fill",
        "Skip reconciliation for the whole session",
        "Settle the unresolved order first, then reconcile that symbol",
        "Reconcile and book the fill at the same time in parallel",
      ],
      answer: 2,
      difficulty: "judge",
      why: "The broker's flat figure already includes the exit's fill. If you drop the position and then book the fill, you count the exit twice and end up short. Settling the order first lets the reconciliation see a match.",
      distractors: [
        "It looks natural, but booking the fill afterwards would apply a sell to a position already gone.",
        "Skipping leaves the cache unverified, which is the situation reconciliation exists to avoid.",
        "",
        "Parallel steps race, and either order of completion can double-count the exit.",
      ],
    },
    {
      q: "A team proposes a bot that, on any mismatch, sends orders to make the broker's position match the platform's record. Is this a good safety feature?",
      options: [
        "Yes; it keeps the books equal without any human delay",
        "Yes, provided it runs only during market hours",
        "Only if it also keeps a log of every order it sent",
        "No; it would trade real money to match a possibly wrong record",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Reconciliation tells you which book is stale, and it is usually yours. A bot that trades to match your record turns a bookkeeping error into real positions and costs. Repair the record, or alert, and let a person decide on trades.",
      distractors: [
        "Equal books are only good if the right one is kept. Here the wrong one wins, at your expense.",
        "Market hours make it riskier, since orders execute immediately.",
        "A log helps afterwards but does not stop the wrong trade.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-reconciliation-manual-trade",
      scenario:
        "You run one live strategy on a single server. Sometimes you also place a trade by hand in the Kite app, for example a short put you want to hold overnight. At 11:15 you do exactly that. The engine's 15-minute check then finds a broker position of minus 65 units that the engine has no record of. The engine has no entry price, stop level or exit rule for it. You are the only user and may not be watching your phone. What should the platform do?",
      options: [
        {
          label: "Adopt it automatically into the running strategy so the strategy's stop and exits manage it",
          appeal:
            "A managed position is better than an unmanaged one, and it needs no human action.",
        },
        {
          label: "Square it off automatically, since the engine did not place it",
          appeal:
            "Removes unknown risk immediately and keeps the account matching the engine.",
        },
        {
          label: "Alert after the mismatch persists, do not touch the position, and provide an explicit way for the operator to attach it",
          appeal:
            "Keeps the decision with the person who knows why the trade exists.",
        },
        {
          label: "Ignore positions the engine did not open",
          appeal:
            "Manual trades are the user's responsibility and the engine should stay in its lane.",
        },
      ],
      best: 2,
      verdict:
        "The engine lacks the entry context to manage the position well, and you may have chosen to hold it overnight. Adopting it guesses at a stop; closing it overrides your decision. Ignoring it leaves a short option with no stop and no word to you. An alert plus an explicit attach action leaves the call with you, at the cost of a short unmanaged window.",
      claims: [
        {
          text: "You accept that a manual position stays unmanaged until the operator acts on the alert.",
          axis: "trade",
          correct: true,
          note: "That is the cost of not guessing. The alert is what limits the window.",
        },
        {
          text: "Automatic adoption is safer because the strategy's rules always fit a manually opened trade.",
          axis: "trade",
          correct: false,
          note: "The strategy's stops and exits were designed for its own entries. A manual trade may have a different intent and strike.",
        },
        {
          text: "If the operator is away and misses the alert, a short option may remain with no stop.",
          axis: "failure",
          correct: true,
          note: "That is the residual risk. The daily digest and repeated alerts reduce it but cannot remove it.",
        },
        {
          text: "An automatic square-off cannot cause harm, because closing a position always reduces risk.",
          axis: "failure",
          correct: false,
          note: "Closing a position you chose to hold can realise a loss, trigger costs and break a hedge. The closing order can also fail.",
        },
        {
          text: "You would track how long an untracked position stays unmanaged, from the broker fill to the operator's action.",
          axis: "measure",
          correct: true,
          note: "That duration is the exposure the design leaves, and the number to reduce.",
        },
        {
          text: "You would judge the design by how often the check finds no differences, as a higher figure always means a better system.",
          axis: "measure",
          correct: false,
          note: "A clean check is only good if the check runs. Also measure that it ran and how long real mismatches took to be noticed.",
        },
      ],
    },
    {
      id: "sd-reconciliation-restart-inflight",
      scenario:
        "The engine is redeployed at 11:05 during market hours. Its cache says it is long 65 units of an option. At 11:04 it sent an exit order for 65 units, and that order filled while the process was down. The broker now shows flat. The engine's database also holds the exit order as still working. You have one server, and a wrong position here becomes a short position you did not intend. What do you do at start-up?",
      options: [
        {
          label: "Settle the unresolved exit order first by reading its outcome from the broker, then reconcile the symbol",
          appeal:
            "Books the fill once, then compares books that can now match.",
        },
        {
          label: "Reconcile at once: broker flat means drop the cached position; then process the order's fill",
          appeal:
            "Simple, in the natural order, and uses the broker's authoritative figure immediately.",
        },
        {
          label: "Trust the cache and skip reconciliation, since the order was still working",
          appeal:
            "Avoids a broker call during a busy restart and keeps the strategy managing the position.",
        },
        {
          label: "Discard the cache and start the strategy flat, ignoring any broker position",
          appeal:
            "A clean slate; no stale state can mislead the strategy.",
        },
      ],
      best: 0,
      verdict:
        "The broker's flat figure already includes the exit fill. Dropping the position and then booking the fill applies the exit twice and leaves the engine short, a position that does not exist. Reading the order's outcome first lets the later comparison match. Skipping or discarding both abandon the verification that restarts need most.",
      claims: [
        {
          text: "You accept delaying the reconciliation of that symbol until its order is resolved, rather than reconciling everything at once.",
          axis: "trade",
          correct: true,
          note: "A short, symbol-specific deferral is the price of not double-counting.",
        },
        {
          text: "Reconciling immediately is safer because the broker's figure is authoritative and needs no further context.",
          axis: "trade",
          correct: false,
          note: "The broker's figure is right, but its meaning depends on which fills the engine has already booked. Without that, the comparison misleads.",
        },
        {
          text: "If the order cannot be read after a few tries, the symbol should be left out of the reconcile and re-checked once its order settles.",
          axis: "failure",
          correct: true,
          note: "A guess in either direction risks a wrong position. Deferring with a warning is the safe route.",
        },
        {
          text: "Starting flat and ignoring the broker's positions is safe, because nothing can be orphaned.",
          axis: "failure",
          correct: false,
          note: "Ignoring a position that exists is how it becomes orphaned: no stop and no exit.",
        },
        {
          text: "You would record which symbols were deferred at start and how long each took to resolve.",
          axis: "measure",
          correct: true,
          note: "That shows how often restarts hit the in-flight case and how quickly it clears.",
        },
        {
          text: "You would judge a restart by whether the strategy resumed within a few seconds, whatever state it came back in.",
          axis: "measure",
          correct: false,
          note: "Fast but wrong is worse than slightly slower and right. Judge by agreement with the broker after start.",
        },
      ],
    },
    {
      id: "sd-reconciliation-broker-scale",
      scenario:
        "A retail broker holds about 300,000 client accounts. Each evening the exchange's clearing corporation publishes the day's trade and obligation files. The broker's back office must match its own books to them before settlement the next morning. Today, a team does this by hand with spreadsheets and often misses breaks until funds fail to settle. Trade volume is in the millions of records a day. A finance team of eight is available. What do you build?",
      options: [
        {
          label: "Compare every trade inside the order path in real time and block trades that differ",
          appeal:
            "Catches problems at their source with no end-of-day delay.",
        },
        {
          label: "A monthly audit by the finance team across a sample of accounts",
          appeal:
            "Cheap and thorough on the accounts it covers.",
        },
        {
          label: "More people with better spreadsheets",
          appeal:
            "No new software to build, and humans can use judgement.",
        },
        {
          label: "An automated batch match of the broker's ledger against the clearing files, with tolerance rules, safe auto-corrections for known break types, and an exceptions queue for the rest",
          appeal:
            "Scales to millions of rows and leaves people only the cases that need judgement.",
        },
      ],
      best: 3,
      verdict:
        "The official files arrive once a day, so the match is naturally a batch, and it must finish before settlement. Millions of records and eight people means automation does the matching and humans handle exceptions. A real-time compare cannot work, since the authoritative record does not exist yet. A monthly sample misses breaks until after settlement fails.",
      claims: [
        {
          text: "You accept building and maintaining matching rules and tolerances, in exchange for finance staff working only the exceptions.",
          axis: "trade",
          correct: true,
          note: "Rules take effort and need maintenance, but they turn a manual job into an exceptions queue.",
        },
        {
          text: "A batch match is worse than a real-time check because it finds problems later than the trade.",
          axis: "trade",
          correct: false,
          note: "The authoritative record is only published after the day's trading. Nothing earlier can be matched against it. An intraday check against your own broker positions is a different, complementary control.",
        },
        {
          text: "An auto-correction rule that is too broad can hide a real error by 'fixing' it to match the wrong side.",
          axis: "failure",
          correct: true,
          note: "Auto-fixes must be limited to well-understood break types and logged for review.",
        },
        {
          text: "If the clearing file arrives late or incomplete, the match should still run and mark everything as matched.",
          axis: "failure",
          correct: false,
          note: "An incomplete reference cannot confirm a match. The run should stop or flag the gap, like a check that could not read the book.",
        },
        {
          text: "You would measure the count of open breaks, their age, and how many were cleared before the settlement cut-off.",
          axis: "measure",
          correct: true,
          note: "These show whether the process is keeping up with the settlement clock.",
        },
        {
          text: "You would measure only the share of trades that matched on the first run, because unmatched trades are always system errors.",
          axis: "measure",
          correct: false,
          note: "Unmatched trades can be timing, rounding or genuine disputes. Age and resolution time matter as much as the first-pass rate.",
        },
      ],
    },
  ],
};

import type { Topic } from "../../types.ts";

export const sdStateMachines: Topic = {
  id: "sd-state-machines",
  title: "State machines for strategies and orders",
  tier: 8,
  week: 16,
  depth: "deep",
  summary:
    "A state machine lists the states a thing can be in and the moves allowed between them, so a wrong move is caught as a bug and not saved as data.",
  why: "Orders, backtest jobs, strategies and broker tokens in Traed all move through stages, and most of your worst bugs live in the gaps between stages: an order shown as cancelled that actually filled, a job stuck as running, a status column nobody updates. Naming each machine, its terminal states and its guards is how you explain why those cannot happen, or what happens when they do.",
  learn: {
    intuition:
      "Think of a train ticket on IRCTC. It is in one state at a time: waitlisted, RAC, confirmed, or cancelled. Certain moves make sense. A waitlisted ticket can become confirmed when someone cancels. A cancelled ticket can never become confirmed again. If the booking screen ever showed a cancelled ticket as confirmed, you would know something was broken, because that move is simply not on the map. A state machine is that map, written down. You list the states, the events that cause moves, and which moves are allowed. Some states are final, and nothing leaves them. The value is not the drawing. It is that every piece of code now has one question to answer before changing a status: is this move on the map? When the answer is no, you have found a bug at the moment it happens, not three days later in a position that does not match the broker.",
    mechanics: [
      {
        heading: "States, events, transitions and guards: the backtest job",
        body: "A backtest row in Traed has five states: `pending`, `running`, `completed`, `failed` and `cancelled`. The last three are terminal, collected in one set called `TERMINAL_BACKTEST_STATUSES`. Events move it: a worker picks the job up, results are saved, an exception is raised, the user cancels. A guard is a condition on a move. Cancelling only changes the row if its status is not already terminal, so a finished backtest cannot be turned into cancelled. The same guard stops the crash handler from turning a completed job into failed.",
      },
      {
        heading: "Orders: many broker words, a few internal states",
        body: "The order manager has nine internal states: pending, submitted, acknowledged, partial, filled, cancelled, rejected, expired and unverified. Brokers use many more words. Kite reports a stop-loss order waiting for its trigger as `trigger pending`, and in-flight states such as `open pending`, `modify pending` and `cancel pending`. The engine maps all of these to acknowledged, meaning the order is alive at the exchange and may still fill, cancel or reject. The mapping is the anti-corruption layer for status, so the rest of the code deals in nine states, not in each broker's vocabulary.",
      },
      {
        heading: "Illegal transitions: terminal means final",
        body: "Two readers ask the broker about the same order: an inline poll and a background sweep, and their answers can arrive out of order. A stale read taken before a rejection must not move REJECTED back to open, and a late OPEN must not undo FILLED. So Traed's update code ignores any move out of a terminal state. There is one exception, and it needs proof: a locally cancelled order may become FILLED if the broker's filled quantity reaches the full order quantity, say 100 of 100, because the cancel lost the race to the fill.",
      },
      {
        heading: "Derive state from facts, and spot the dead column",
        body: "A strategy's life has three states: draft, paper and live. Traed does not store a status for this. It derives it from two flags, `is_active` and `is_paper`, and both the strategy list and the live-trading API use the same derivation. A `status` column with six allowed values (such as `live_trading` and `paused`) still exists in the schema, but the screens do not read it. A status column that nothing keeps current is a warning sign: it will be wrong, and someone will believe it. On engine start, every strategy with `is_active` set is started again from those flags.",
      },
      {
        heading: "Saying it about Traed",
        body: "We model anything that moves through stages as an explicit state machine: backtest jobs, broker orders, strategy lifecycle and broker tokens. Each has named states, and terminal states that nothing leaves. Orders map every broker status into nine internal ones, and an update that would leave a terminal state is ignored, with one proven exception for a fill. Our guards live inside the update code, not in a transition table, which works for us but is easy to bypass. We derive strategy state from two flags rather than store it. We would move to a checked transition table if more people started editing this code.",
      },
    ],
    complexityDerivation:
      "The invariant is that every piece of stored status describes a state the thing can legally be in, and that it only reaches it by an allowed move. If that holds, you can answer what is true of an order in a given status without reading any history: a filled order has a filled quantity, a terminal order will not change. The argument for why this design holds is that most bugs in long-running systems are not wrong calculations. They are wrong order of events: a cancel arriving after a fill, a poll returning old data, a restart in the middle. A machine turns those from silent data corruption into a rejected move you can log and count. It stops holding in three places. If the machine has too many states, nobody can reason about it, so unusual cases get squeezed into a catch-all. If two writers move the same state without agreeing on the rules, the machine exists only on paper. And if the real owner of the state is outside your system, as the broker is for orders, your machine is a local view that can only be corrected by asking. That is why a restart closes unresolved orders as unverified and lets a position check against the broker decide, instead of guessing.",
    variants: [
      {
        name: "Explicit transition table",
        when: "Many writers, or a regulated process where every move must be justified.",
        delta:
          "One map of allowed moves is checked on every change, and illegal moves raise an error. Safer, and more code to maintain than a guard.",
      },
      {
        name: "Guard inside the update function",
        when: "A small team, few writers and one place that changes the status.",
        delta:
          "Traed's order and backtest paths use this. Cheap and readable, but any new code that writes the status directly can bypass the rule.",
      },
      {
        name: "State derived from stored facts",
        when: "The state is fully decided by a few flags or values you already keep.",
        delta:
          "Traed's strategy lifecycle. There is nothing to get out of sync, but you must compute it in one shared place.",
      },
    ],
    tradeoffs: [
      {
        vs: "Storing a status string and trusting it",
        pick: "Deriving state from flags or facts where possible",
        because:
          "A stored status needs every writer to update it correctly, forever. A derived state cannot disagree with the facts it is computed from.",
      },
      {
        vs: "Letting any status be overwritten by the latest message",
        pick: "Making terminal states final, with narrow proven exceptions",
        because:
          "Messages arrive late and out of order. Last-write-wins lets a stale read undo a fill, which then misstates your position and your risk.",
      },
      {
        vs: "Guessing the outcome of an unknown order on restart",
        pick: "A distinct unverified state resolved by checking the broker",
        because:
          "Marking it filled or cancelled is a claim you cannot support. A separate terminal state is honest, and the broker's position data settles the truth.",
      },
    ],
  },
  realWorld: [
    {
      system: "FIX order status and execution reports",
      kind: "industry",
      problem:
        "Brokers and exchanges around the world need one shared language for where an order stands, including partial fills and cancels in flight.",
      applied:
        "The FIX protocol defines an order status field with values such as new, partially filled, filled, cancelled, rejected, and pending cancel, and execution reports that carry a cumulative filled quantity. The cumulative quantity lets a receiver recover the right state even if a report is duplicated or arrives late.",
      evidence: "FIX Protocol specification: OrdStatus, ExecType and CumQty fields",
      impact: "Shows why an order carries both a status and a filled quantity, and why quantity can prove state.",
    },
    {
      system: "Zerodha Kite order statuses",
      kind: "industry",
      problem:
        "An Indian retail broker has to tell platforms where an order is, including stop-loss orders that wait for a trigger.",
      applied:
        "Kite's order API reports a status string for each order, such as open, complete, cancelled, rejected and trigger pending, along with a filled quantity. Platforms built on it must map those strings to their own states.",
      evidence: "Zerodha Kite Connect API documentation: order statuses",
      impact: "The vocabulary Traed maps from. Each broker's words differ, so a mapping layer is unavoidable.",
    },
    {
      system: "Traed order manager",
      kind: "yours",
      problem:
        "A live order can be queried by two readers at once and across engine restarts, and stale answers must not rewrite history.",
      applied:
        "`OrderStatus` has nine members. The update code maps each broker status string to one of them and treats a terminal status as final, with one proven exception to FILLED when the filled quantity equals the order quantity. On a restart, orders whose outcome is unknown are closed as `UNVERIFIED`, and the broker position check settles them.",
      evidence: "strategy-engine/app/services/order_management/order_manager.py; strategy-engine/app/services/order_management/models.py",
      impact:
        "A late poll cannot undo a fill or revive a rejection, and an unknown order is never falsely reported as filled or cancelled.",
    },
    {
      system: "Traed backtest job lifecycle",
      kind: "yours",
      problem:
        "A backtest runs in another process and can finish, fail, crash or be cancelled while the page polls its status.",
      applied:
        "Five states, three terminal. Cancelling and the crash handler both check that the row is not already terminal before changing it. The worker refuses to start a job already cancelled, and the page stops polling once it sees a terminal state.",
      evidence: "strategy-engine/app/services/backtest_control.py; strategy-engine/app/services/backtest_dispatch.py; docs/LLD.md",
      impact: "A finished backtest cannot be flipped to failed by a late crash message, and a stuck page can recover from the database.",
    },
  ],
  algorithms: [
    {
      name: "Finite state machine",
      role: "Lists the allowed states and moves explicitly, so an illegal transition is rejected as a bug instead of being stored as data.",
    },
    {
      name: "Transition table lookup",
      role: "Stores allowed moves as a map from current state and event to next state, making the rules visible and testable in one place.",
      dsa: "hashing",
    },
    {
      name: "Derived state from stored facts",
      role: "Computes the status from timestamps and counts already saved rather than keeping a separate column that can disagree with them.",
    },
  ],
  insights: [
    {
      t: "Terminal means nothing leaves",
      d: "Completed, failed, cancelled, filled, rejected: once reached, a status should not change. Late and duplicate messages then cannot undo a result.",
    },
    {
      t: "Guards are where the rules live",
      d: "A move is allowed only if its condition holds, such as 'only cancel a job that is not already terminal'. Without guards, a state machine is only a diagram.",
    },
    {
      t: "Quantity can prove a state",
      d: "A locally cancelled order whose broker-filled quantity equals its full quantity is a fill. That is the one move out of a terminal state Traed allows.",
    },
    {
      t: "A status nobody updates is a trap",
      d: "If the UI computes state from flags and ignores a status column, the column will drift and mislead. Derive the state, or remove the column.",
    },
  ],
  pitfalls: [
    "Overwriting a status with the latest message. Late or repeated messages then undo a fill or revive a rejected order.",
    "Keeping a status column that no code path keeps current. Someone will read it as truth, for example 'draft means nothing is running'.",
    "Closing an order of unknown outcome as filled or cancelled after a restart. Use a separate unverified state and let the broker's book decide.",
  ],
  quiz: [
    {
      q: "In state-machine language, what is a guard?",
      options: [
        "A condition that must be true for a transition to be allowed",
        "A state from which no further transition is possible",
        "An event that the system receives from outside, such as a fill",
        "A log entry written each time a state changes",
      ],
      answer: 0,
      why: "A guard is a condition attached to a move. It answers whether this particular move is allowed right now, as with cancel only if not already terminal.",
      difficulty: "recall",
      distractors: [
        "",
        "That describes a terminal state, which is a different idea.",
        "That is an event, the thing that triggers a move. A guard decides whether the move is allowed.",
        "Logging is useful for audit, but it records changes and does not decide whether they may happen.",
      ],
    },
    {
      q: "Which of these is a terminal state in Traed's backtest job lifecycle?",
      options: [
        "running",
        "cancelled",
        "pending",
        "queued",
      ],
      answer: 1,
      why: "Completed, failed and cancelled are terminal. A job in running or pending can still move on.",
      difficulty: "recall",
      distractors: [
        "Running feels final because a job is busy, but it still moves to completed, failed or cancelled.",
        "",
        "Pending is the starting state and moves to running or cancelled.",
        "There is no queued state in the job machine; waiting jobs are pending.",
      ],
    },
    {
      q: "A backtest worker is killed for using too much memory. Meanwhile the user had already cancelled the job and the row says `cancelled`. The parent process's crash handler now runs. What should the row say afterwards?",
      options: [
        "failed, because the worker crashed and that is the newest event",
        "running, because the worker never reported that it stopped",
        "cancelled, because the handler skips rows that are already terminal",
        "pending, so the job is retried from the beginning",
      ],
      answer: 2,
      why: "The crash handler only marks a row failed if it is not already completed, failed or cancelled. The user's cancel was the first terminal event, and it stands.",
      difficulty: "apply",
      distractors: [
        "Newest-event-wins is the tempting rule, but it lets a later message rewrite a result that was already final.",
        "The worker's silence does not change the row; the row is already in a settled state.",
        "",
        "Nothing in the lifecycle moves a terminal job back to pending. A rerun would be a new job.",
      ],
    },
    {
      q: "You place a stop-loss order on Kite and the broker reports it as `trigger pending`. Which internal state should your system show?",
      options: [
        "filled, because the order has been accepted by the exchange",
        "cancelled, because it has not produced any trade yet",
        "rejected, because it did not execute immediately",
        "acknowledged, because it is alive and may still fill",
      ],
      answer: 3,
      why: "A stop-loss waiting for its trigger is live at the exchange. Traed maps it to acknowledged: it can still fill, be cancelled or be rejected.",
      difficulty: "apply",
      distractors: [
        "Accepted is not executed. A filled state would also claim a position exists that does not.",
        "No trade yet is not the same as no order. Cancelled is terminal and would stop tracking a live order.",
        "Rejection means the broker or exchange refused the order. This one is waiting, not refused.",
        "",
      ],
    },
    {
      q: "Your order for 100 shares is reported by the broker as `open` with a filled quantity of 40. Your internal states are pending, submitted, acknowledged, partial, filled, cancelled, rejected, expired. Which internal state fits?",
      options: [
        "partial, since some but not all of the quantity has traded",
        "acknowledged, because the broker called it open",
        "filled, because some shares are already in your account",
        "submitted, because it is still working at the exchange",
      ],
      answer: 0,
      why: "A working order with 0 < filled < quantity is partial, even though Kite words it as open. The engine applies exactly this check, and the sweep's no-progress timeout depends on it.",
      difficulty: "apply",
      distractors: [
        "",
        "The broker word is open, but the filled quantity tells you more, and the better state is partial.",
        "Filled would mean all 100 shares traded. The remaining 60 may still fill or be cancelled.",
        "Submitted means sent but not yet confirmed. Here the broker has clearly confirmed and traded part of it.",
      ],
    },
    {
      q: "You cancelled a 100-share order locally. A background sweep then reads the broker and finds `complete` with a filled quantity of 100. What should your system do?",
      options: [
        "Keep it cancelled, because a terminal state must never change",
        "Move it to filled, because the quantity proves the cancel lost the race",
        "Mark it unverified and wait for an operator to look at it",
        "Delete the order row so the books show no trade for it",
      ],
      answer: 1,
      why: "A fill is a fact at the exchange. The rule that terminal means final has one narrow exception: a full fill proven by quantity overrides a local cancel. Otherwise your position would be wrong.",
      difficulty: "apply",
      distractors: [
        "Terminal is final in general, but a fully proven fill is the exception, since keeping cancelled would hide a real position.",
        "",
        "Unverified is for outcomes you cannot learn. Here the broker has told you, so there is nothing to verify.",
        "Removing the row destroys the audit trail and leaves a real position with no explanation.",
      ],
    },
    {
      q: "A strategy table has a `status` column with six values, but the list screen and the live API both compute draft, paper or live from two flags. A new developer proposes updating the column at every deploy and stop so it stays current. What is the better answer?",
      options: [
        "Do it, since more information is always safer to store",
        "Do it in the controller only, so the screen shows the same value twice",
        "Derive state from the flags in one shared function, and drop or ignore the column",
        "Store the status as free text so any state can be recorded",
      ],
      answer: 2,
      why: "Two sources of truth for one fact will disagree. The flags already decide what runs, so deriving the state from them cannot drift. Keeping a second copy only creates a way to be wrong.",
      difficulty: "judge",
      distractors: [
        "Extra stored data is only safer if every writer keeps it right, and one missed update makes it misleading.",
        "Updating it in one place is a fix for the screen, but the engine and other writers can still leave it stale.",
        "",
        "Free text removes the ability to check that a value is legal, which is the opposite of a state machine.",
      ],
    },
    {
      q: "The engine restarts at 11:00 while 3 live orders were submitted but their outcome was never read back. The broker book is available. What is the soundest way to close them?",
      options: [
        "Mark them all cancelled, since the safe assumption is that nothing traded",
        "Mark them all filled, since the strategy intended to be in the position",
        "Mark them expired, since day orders lapse and the day has moved on",
        "Close them as unverified, then check the broker position to settle what really happened",
      ],
      answer: 3,
      why: "Cancelled, filled and expired are each a claim about the exchange that you cannot support after a restart. An unverified terminal state is honest, and the broker's position is the source of truth.",
      difficulty: "judge",
      distractors: [
        "Assuming nothing traded feels cautious, but if an order did fill you now hold a position the system does not know about.",
        "Assuming it filled is the opposite error, and could let the system believe in a position that does not exist.",
        "Expired says the order lapsed unfilled. It may have filled before it lapsed, so that is not known either.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-state-machines-dead-status",
      scenario:
        "A trading platform run by one founder has a `strategies` table with an enum `status` column of six values (draft, backtesting, paper_trading, live_trading, paused, stopped). The screens and the live-trading API all work out draft, paper or live from two flags, `is_active` and `is_paper`, and the engine restarts every active strategy on boot. The status column is rarely updated and mostly reads draft. The founder sometimes checks it by hand to see what is running. What should be done with it?",
      options: [
        {
          label: "Update the column in every controller and engine path so it is always correct",
          appeal:
            "It keeps the richer six-value vocabulary and gives one obvious place to look.",
        },
        {
          label: "Add a database trigger that copies the flags into the column on every write",
          appeal:
            "Automatic, with no application code to forget.",
        },
        {
          label: "Compute the state from the flags in one shared function, and stop reading the column",
          appeal:
            "The flags already decide what runs, so a derived value cannot disagree with them.",
        },
        {
          label: "Leave it as it is and remember that draft in the column means nothing",
          appeal:
            "No work now, and nothing breaks today.",
        },
      ],
      best: 2,
      verdict:
        "The flags are the real source of truth because they decide what the engine starts. A single derivation function used by every screen cannot drift. Syncing a second copy adds writers who must all stay correct. Leaving it invites the founder, or a new hire, to read draft as nothing is running.",
      claims: [
        {
          text: "You give up the six-value vocabulary, so states such as paused have no place until you model them on purpose.",
          axis: "trade",
          correct: true,
          note: "Deriving from two flags yields three states. If paused is wanted, it needs its own fact, not a revived column.",
        },
        {
          text: "You gain a status that cannot disagree with what the engine will actually run.",
          axis: "trade",
          correct: true,
          note: "It is computed from the same flags the deploy path reads.",
        },
        {
          text: "A stale column is harmless as long as nobody writes to it.",
          axis: "failure",
          correct: false,
          note: "The harm is in reading it. A column that always says draft invites the belief that a running strategy is stopped.",
        },
        {
          text: "Two screens each computing the status in their own way could still show one strategy as two different states.",
          axis: "failure",
          correct: true,
          note: "That is why the derivation must live in one shared function, as the list and the live API need to agree.",
        },
        {
          text: "Compare the derived state with what the engine reports as running, and investigate any difference.",
          axis: "measure",
          correct: true,
          note: "The derived state is a claim about what runs. The engine's own list of running strategies is the check on it.",
        },
        {
          text: "Count how many rows have the column set to anything other than draft, to see whether the column is useful.",
          axis: "measure",
          correct: false,
          note: "A count shows how often it was written, not whether it was right. A value can be written and still be wrong.",
        },
      ],
    },
    {
      id: "sd-state-machines-exec-reports",
      scenario:
        "A broker's order management system handles about a million orders a day and receives execution reports from the exchange. Reports can arrive twice, or out of order, and a cancel request can cross with a fill in flight. Each report carries the order id, a status, and a cumulative filled quantity. The firm must keep an accurate position per client and be able to explain every order afterwards. How should order state be updated?",
      options: [
        {
          label: "Apply each report as an explicit transition with terminal states final, using cumulative quantity to resolve duplicates and races",
          appeal:
            "Duplicates change nothing, a late report cannot undo a result, and a fill can override a crossed cancel.",
        },
        {
          label: "Overwrite the status with whichever report arrived last",
          appeal:
            "Simplest code, and the latest report feels like the newest truth.",
        },
        {
          label: "Keep only the number of fills and derive the status when needed",
          appeal:
            "One number to maintain, and no status field to get wrong.",
        },
        {
          label: "Query the exchange for the full order state on every report and ignore the report",
          appeal:
            "Always uses the authoritative source and avoids reasoning about order.",
        },
      ],
      best: 0,
      verdict:
        "At a million orders a day, duplicates and crossed messages are routine, not rare. Last-write-wins lets a stale report undo a fill. Cumulative quantity is idempotent: applying the same report twice changes nothing. Terminal states stay final, with a fill overriding a crossed cancel. Querying for every report is too slow and still needs rules for answers that cross.",
      claims: [
        {
          text: "You accept more code than last-write-wins, because you need rules for each allowed move.",
          axis: "trade",
          correct: true,
          note: "Explicit transitions cost code and tests. That is the price for correctness under duplicates and reordering.",
        },
        {
          text: "Using cumulative filled quantity makes a repeated report harmless, since applying it twice leaves the same total.",
          axis: "trade",
          correct: true,
          note: "An absolute total is idempotent. A per-report increment would double-count.",
        },
        {
          text: "Last-write-wins is acceptable because the exchange always sends reports in order.",
          axis: "failure",
          correct: false,
          note: "Network paths, retries and recovery replays all break ordering. A design that needs ordering will fail at scale.",
        },
        {
          text: "A cancel that crosses with a fill can leave the order cancelled locally though shares traded, unless a proven fill overrides it.",
          axis: "failure",
          correct: true,
          note: "This is the race. Quantity from the exchange is the proof that settles it.",
        },
        {
          text: "Count orders whose local state disagrees with the end-of-day exchange record, per day.",
          axis: "measure",
          correct: true,
          note: "A mismatch count is a direct measure of whether the machine is handling duplicates and races correctly.",
        },
        {
          text: "Measure how fast reports are processed, since speed shows whether the state is correct.",
          axis: "measure",
          correct: false,
          note: "Throughput says nothing about correctness. A fast machine can still apply a stale report.",
        },
      ],
    },
    {
      id: "sd-state-machines-restart-unknown",
      scenario:
        "One server runs a live engine. At 11:00 it restarts for a deploy. Before the restart, 2 orders had been sent to the broker, and the engine had not yet read back what happened to either. One has a broker order id and one does not, because the engine stopped during the send. The engine keeps orders in memory and a record in its database. Open positions must be correct within a minute of the restart. What should happen to those two orders?",
      options: [
        {
          label: "Mark both as cancelled and carry on",
          appeal:
            "Treating them as never traded keeps the book simple and errs on the side of no position.",
        },
        {
          label: "Mark both as filled, because the strategy meant to be in the trade",
          appeal:
            "Matches intent and avoids missing an exit later.",
        },
        {
          label: "Keep both as submitted indefinitely and let a person decide",
          appeal:
            "Makes no claim about the outcome and loses no information.",
        },
        {
          label: "Close both as unverified, then compare the broker's positions to settle the book",
          appeal:
            "Honest about the unknown, with an automatic check against the real source of truth.",
        },
      ],
      best: 3,
      verdict:
        "The engine cannot know either outcome, and the broker holds the truth. A distinct terminal state states that plainly, and the position check against the broker corrects the book within the one-minute requirement. Cancelled or filled are guesses that can leave the book wrong. Keeping them submitted forever leaves a live-looking order nobody tracks.",
      claims: [
        {
          text: "You accept an extra terminal state that is not a statement about the exchange, only about what the engine knows.",
          axis: "trade",
          correct: true,
          note: "Unverified says we could not find out. That is a different fact from cancelled or expired.",
        },
        {
          text: "You depend on the broker's position data being available and correct at the restart.",
          axis: "trade",
          correct: true,
          note: "The broker is the source of truth, so the recovery is only as good as access to it.",
        },
        {
          text: "Marking both orders cancelled is the safe choice because a position that does not exist cannot lose money.",
          axis: "failure",
          correct: false,
          note: "If either order filled, a real position now exists that the engine believes it does not hold, and nothing will manage its exit.",
        },
        {
          text: "The order with no broker id still needs checking, because the engine stopped during the send and the broker may have received it.",
          axis: "failure",
          correct: true,
          note: "No recorded id does not prove nothing was sent. Only the broker's book can say.",
        },
        {
          text: "Compare the engine's open positions with the broker's after the restart, and alert on any difference.",
          axis: "measure",
          correct: true,
          note: "This is the check that confirms the recovery worked, and it is the real definition of correct here.",
        },
        {
          text: "Check that the number of orders in the unverified state is zero after the restart.",
          axis: "measure",
          correct: false,
          note: "Zero unverified is not the goal. Unknown outcomes are expected after a crash, and what matters is that the broker check settles the book.",
        },
      ],
    },
  ],
};

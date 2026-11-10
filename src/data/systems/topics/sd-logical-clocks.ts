import type { Topic } from "../../types.ts";

export const sdLogicalClocks: Topic = {
  id: "sd-logical-clocks",
  title: "Ordering events: logical clocks",
  tier: 4,
  week: 7,
  depth: "deep",
  summary:
    "Machines disagree about time, so timestamps cannot order events across them. Learn happened-before, Lamport and vector clocks, LWW and hybrid clocks.",
  why: "As soon as two machines write the same data, someone asks which write came first, and the honest answer is that the wall clocks cannot tell you. Systems that trust them silently lose updates; systems that track causality can keep both and merge. This lesson explains why clocks fail, then gives you the standard tools: Lamport timestamps, vector clocks, last-write-wins and what it loses, hybrid logical clocks and CRDTs. Traed sidesteps the problem with a single writer, which is itself one of the options.",
  learn: {
    intuition:
      "Two friends in different cities each keep a diary and write, 'Saw the film, then had dinner.' Their watches differ by a few minutes. When they compare diaries, the times cannot settle whether one friend's dinner came before the other's film. But some things can be settled without any watch. If one friend phoned the other after dinner and said 'the food was great', then the second friend's note about that call must come after the dinner. A phone call, a letter or a message creates a certain order. Two events with no chain of calls between them are simply unrelated in time, and nobody can say which was first. Logical clocks keep exactly that kind of record: they count, they do not tell the hour. They follow who told whom, instead of what the watch said.",
    mechanics: [
      {
        heading: "Why wall clocks cannot order events",
        body: "Every machine has its own clock, kept near true time by NTP, and each drifts. Across a data centre the error is often a few milliseconds; over the internet it can reach tens of milliseconds or more, and a correction can move a clock backwards. So suppose machine A stamps a write at 10:00:00.105 while its clock runs 5 ms fast, and machine B, correct, stamps a later write 10:00:00.103. The later write carries the smaller number. Leap seconds and virtual machine pauses add more jumps. Leslie Lamport's 1978 paper replaced 'which happened first by the clock' with the happened-before relation: a precedes b if both are on one machine with a first, or a sent a message that b received, or by a chain of these. Anything else is concurrent.",
      },
      {
        heading: "Lamport timestamps: a counter that follows messages",
        body: "Each process keeps an integer counter. Before every local event it adds 1. Every message carries the sender's counter. On receiving a message with counter `m`, the receiver sets its counter to `max(local, m) + 1`. Worked example: process A is at 3 and sends; process B is at 7. B becomes `max(7, 3) + 1 = 8`. If B was at 2 and the message said 9, B becomes 10. The guarantee is one-way: if a happened before b, then the stamp of a is lower. The reverse is false: a lower stamp does not prove causality. Breaking ties by process id gives one agreed total order, useful for ordering lock requests, though it cannot reveal which events were truly concurrent.",
      },
      {
        heading: "Vector clocks: telling 'before' from 'concurrent'",
        body: "A vector clock keeps one counter per process, as `[A:2, B:1]`. A process adds 1 to its own entry on each event, and on receiving a message takes the element-wise maximum with the sender's vector and then adds 1 to its own entry. To compare two vectors: if every entry of X is at most the same entry of Y, X happened before Y. If neither dominates, they are concurrent. `[A:2, B:1]` and `[A:1, B:2]` are concurrent. Dynamo used this for its shopping cart: two writes through different servers return as siblings and are merged on the next read. The cost is size, one entry per writer, so real systems bound or prune the vector.",
      },
      {
        heading: "Last-write-wins, hybrid clocks and CRDTs",
        body: "Last-write-wins (LWW) keeps the write with the highest wall-clock timestamp. It is simple and needs no merge, but it loses data silently. If client X's clock is 5 ms fast, its write at real time 100 carries 105 and beats client Y's genuinely later write stamped 103. A hybrid logical clock (HLC) keeps a physical time and a small counter: `l` follows the largest time seen, and the counter breaks ties, so stamps stay close to real time yet respect causality. CockroachDB uses HLCs. A CRDT sidesteps ordering: its merge is commutative, associative and idempotent, so replicas converge in any order. A grow-only counter keeps one count per replica, merges by taking the maximum for each, and its value is the sum.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed does not need logical clocks, because one engine process is the single writer. Its event loop handles ticks, signals and orders in sequence, so the order of rows it writes is the order of events, and the database gives each row a growing id. Times are stored as IST wall-clock values beside, for people to read. The signal relay sends events from a single worker thread, so delivery order follows emission order, and each event has an `event_id` and an `emitted_at`. We would need real logical clocks the day two engines, or two regions, could update the same record. Until then, a single writer is the cheapest clock there is.",
      },
    ],
    complexityDerivation:
      "The argument starts from what a machine can know. It can see its own events in order and the messages it receives, and nothing else. A wall clock claims to know a shared, global time, but that claim is only as good as synchronisation, and synchronisation always has an error. So any scheme that decides causality from wall time inherits the error. Lamport's counter makes a smaller promise it can keep: if a message links two events, the later one gets a higher number, because the receiver jumps past the sender's value. Vector clocks keep one counter per process, so they can compare two stamps entry by entry and prove whether one history contains the other; when neither does, the events are concurrent by definition. That extra power costs space that grows with the number of writers. The argument breaks when the writers are too many to track, when clients bring their own clocks, or when readers need timestamps that mean real time, which pure counters cannot give.",
    variants: [
      {
        name: "Lamport timestamps",
        when: "You need one agreed total order, such as for mutual exclusion or log merging, and do not need to detect concurrency.",
        delta:
          "One integer per event, so tiny, but a lower stamp does not prove causality and concurrent events cannot be identified.",
      },
      {
        name: "Vector clocks or version vectors",
        when: "Replicas accept writes independently and you must detect conflicts and keep both versions for a merge.",
        delta:
          "Exact detection of before and concurrent, but one entry per writer, so the stamp grows and needs pruning.",
      },
      {
        name: "Hybrid logical clocks",
        when: "You want timestamps that are close to real time for 'as of' queries, and also respect causality, on ordinary hardware.",
        delta:
          "A physical part plus a counter, 8 to 12 bytes, correct within the maximum clock offset you configure. Cannot detect concurrency by itself.",
      },
    ],
    tradeoffs: [
      {
        vs: "Last-write-wins versus keeping siblings",
        pick: "Keep siblings and merge when losing a write costs money or trust",
        because:
          "LWW is simple and drops one of two concurrent writes without telling anyone, and clock error decides which. Siblings preserve both and push a merge onto the application.",
      },
      {
        vs: "Wall-clock timestamps versus logical clocks",
        pick: "Logical or hybrid clocks wherever order decides correctness",
        because:
          "Wall-clock stamps are fine for display and rough ordering. Wherever the wrong order loses data, use a clock that follows causality, not the hour.",
      },
      {
        vs: "A logical clock versus a single writer",
        pick: "A single writer, until you need more than one",
        because:
          "One process writing an append-only log has a built-in total order at no cost. Add logical clocks only when separate writers must accept updates without asking each other.",
      },
    ],
  },
  algorithms: [
    {
      name: "Lamport timestamp",
      role: "A per-process counter that jumps to max(local, received) + 1, so every message edge increases the stamp.",
    },
    {
      name: "Vector clock",
      role: "One counter per process, compared entry by entry to tell 'happened before' from 'concurrent'.",
    },
    {
      name: "Hybrid logical clock",
      role: "A physical time plus a logical counter, so stamps stay near real time while respecting causality.",
    },
    {
      name: "CRDT merge (grow-only counter)",
      role: "Replicas merge by taking the maximum per entry, which is commutative, associative and idempotent, so all converge.",
    },
  ],
  realWorld: [
    {
      system: "Amazon Dynamo",
      kind: "industry",
      problem:
        "A shopping cart must accept additions even when replicas cannot reach each other, so two replicas can hold different versions of the same cart.",
      applied:
        "Dynamo attaches a vector clock to every version of a value. On a read, if one version's clock dominates the others, it wins. If they are concurrent, all are returned as siblings and the application merges them. For the cart, a union keeps every added item.",
      evidence: "DeCandia et al., Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)",
      impact:
        "Additions are not lost, at the cost of an occasional resurrected deleted item and a merge step in the application.",
    },
    {
      system: "Apache Cassandra timestamps",
      kind: "industry",
      problem:
        "Several clients may update the same column of a row at nearly the same time through different coordinators.",
      applied:
        "Cassandra resolves a conflict per cell by the highest write timestamp, last write wins. Timestamps come from the client or the coordinator, so the documentation advises keeping clocks synchronised with NTP, since a node with a fast clock can win over genuinely later writes.",
      evidence: "Apache Cassandra documentation: write path and timestamps",
      impact:
        "Simple conflict handling and no merge code, but the correctness of the winner depends on clock quality.",
    },
    {
      system: "Google Spanner TrueTime",
      kind: "industry",
      problem:
        "A globally distributed database wants transactions ordered by real commit time, but no clock is exact.",
      applied:
        "Spanner's TrueTime API returns an interval, earliest to latest, built from GPS receivers and atomic clocks in each data centre. A transaction picks a commit timestamp and then waits until that time is surely in the past before releasing its locks. The wait is about the width of the uncertainty, a few milliseconds.",
      evidence: "Corbett et al., Spanner: Google's Globally-Distributed Database (OSDI 2012)",
      impact:
        "Timestamp order matches real-time order, bought with special clock hardware and a short commit wait.",
    },
    {
      system: "Traed signal relay ordering",
      kind: "yours",
      problem:
        "Trade signals are forwarded to an outside order system. Their order must follow emission order, and the engine's event loop must never wait for the network.",
      applied:
        "The relay places events on a bounded queue and one worker thread posts them, so delivery order matches emission order. Each event carries a generated `event_id` for the receiver to de-duplicate, plus an `emitted_at` time in IST. No logical clock is used.",
      evidence: "strategy-engine/app/services/order_management/signal_relay.py",
      impact:
        "A single sender thread keeps order without any clock. The id, not the timestamp, is what makes repeats detectable.",
    },
  ],
  insights: [
    {
      t: "Clocks tell the hour, not the order",
      d: "Machines disagree by milliseconds or more, and corrections can step backwards. A later write can carry an earlier timestamp.",
    },
    {
      t: "Lamport: max(local, received) + 1",
      d: "If a happened before b, a has the lower stamp. A lower stamp does not prove causality, so it cannot detect concurrency.",
    },
    {
      t: "Vector clocks expose concurrency",
      d: "If neither vector dominates the other, the writes were concurrent. Keep both and merge, as Dynamo's cart does.",
    },
    {
      t: "LWW drops writes quietly",
      d: "The winner is whoever's clock ran ahead. Use it only where losing one of two concurrent writes is acceptable.",
    },
  ],
  pitfalls: [
    "Using wall-clock timestamps to decide which of two writes is newer across machines. Skew of a few milliseconds is enough to flip the answer.",
    "Reading a Lamport stamp as proof of cause. Stamp 5 below stamp 9 does not mean event 5 caused event 9.",
    "Letting vector clocks grow without a plan. One entry per client or per request becomes thousands of entries and bloats every value.",
  ],
  quiz: [
    {
      q: "In Lamport's happened-before model, what is true of two events with no chain of messages between them?",
      options: [
        "The one with the earlier wall-clock time happened first",
        "They are ordered by the process with the lower id",
        "They are concurrent, so neither can have caused the other",
        "They cannot both be recorded in the same log",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Happened-before is built only from local order and message chains. Events with no chain between them are concurrent, whatever the wall clocks say.",
      distractors: [
        "Wall-clock times are the unreliable thing this model replaces. Skew can reverse the real order.",
        "Process ids are used only as a tie-breaker for a total order. They say nothing about causality.",
        "",
        "Concurrent events can sit in one log. The log simply cannot say that one caused the other.",
      ],
    },
    {
      q: "A process with Lamport counter L receives a message carrying counter m. What does it set its counter to?",
      options: [
        "The larger of L and m, plus one",
        "m plus one, ignoring L",
        "L plus one, ignoring m",
        "The larger of L and m, unchanged",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Taking the maximum guarantees the receive event is stamped after the send. Adding one makes receiving itself an event with a new number.",
      distractors: [
        "",
        "Ignoring L could move the counter backwards if the receiver was already ahead.",
        "Ignoring m would leave the receive stamped possibly before the send.",
        "Without the plus one, the receive event would share a stamp with an earlier event.",
      ],
    },
    {
      q: "A Lamport clock at process B reads 2 when a message arrives stamped 9. What is B's counter after receiving it?",
      options: [
        "3, which is 2 plus one",
        "9, the message value",
        "11, one past the sum",
        "10, one past the larger",
      ],
      answer: 3,
      difficulty: "apply",
      why: "max(2, 9) + 1 = 10. B jumps past the sender's value so the receive is ordered after the send.",
      distractors: [
        "That is 2 + 1, ignoring the message. The stamp would go before the send.",
        "That stops at the maximum, without counting the receive as its own event.",
        "That adds the two counters' difference or an extra step. The rule is max plus one, not a sum.",
        "",
      ],
    },
    {
      q: "Two versions of a record carry vector clocks [A:2, B:1] and [A:1, B:2]. What is their relationship?",
      options: [
        "The first happened before the second",
        "They are concurrent, since neither dominates the other",
        "The second happened before the first",
        "They are the same version written twice",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The first has the larger A entry and the second has the larger B entry. Neither is at least as large in every entry, so neither history contains the other.",
      distractors: [
        "It would need A:1 or less and B:1 or more in every entry to be dominated. A is higher in the first.",
        "",
        "For the second to be earlier, every entry would have to be no greater than the first's. B is higher.",
        "Identical versions have identical vectors, and these differ.",
      ],
    },
    {
      q: "Two phones edit one note. Phone P's clock runs 800 ms fast. P edits at real time 10:00:00.000, and Q edits later, at real 10:00:00.500, with a correct clock. The store uses last-write-wins on wall-clock stamps. What survives?",
      options: [
        "Q's edit, because it was made later in real time",
        "P's edit, because its fast clock gave it the higher stamp",
        "Both edits, kept as siblings for a later merge",
        "Neither, since the store rejects the conflicting write",
      ],
      answer: 1,
      difficulty: "apply",
      why: "P's stamp is 10:00:00.800 against Q's 10:00:00.500, so P wins although its edit was earlier. LWW compares stamps and cannot see the real order.",
      distractors: [
        "That would be right with perfect clocks. LWW trusts the stamps, not real time.",
        "",
        "Siblings need version vectors. Plain LWW keeps one value and drops the other.",
        "LWW never rejects a write for conflict. It overwrites silently.",
      ],
    },
    {
      q: "A Dynamo-style store holds a cart at version [X:1]. A client writes through server X, giving [X:2]. Another client, who read [X:1], writes through server Y, giving [X:1, Y:1]. What does the next read return?",
      options: [
        "Only [X:2], since it has the higher count",
        "Only [X:1, Y:1], since it arrived last",
        "An error, because the clocks disagree",
        "Both versions, since neither dominates the other",
      ],
      answer: 3,
      difficulty: "apply",
      why: "[X:2] has the larger X entry, and [X:1, Y:1] has a Y entry the other lacks. They are concurrent, so both are returned as siblings and the application merges them.",
      distractors: [
        "A higher entry for one process does not make a vector dominate. It lacks the Y entry.",
        "Arrival order is not causal order, and the store does not use it here.",
        "Vector clocks do not compare wall clocks, so no clock disagreement arises.",
        "",
      ],
    },
    {
      q: "A service appends all its events from one process into a single log. A colleague proposes adding vector clocks to every event 'to be safe'. What is the sound judgement?",
      options: [
        "Not needed: one writer's append order already is the order",
        "Needed, since any log can drift out of order",
        "Add Lamport stamps only, which are always required",
        "Add hybrid clocks, because wall time drifts",
      ],
      answer: 0,
      difficulty: "judge",
      why: "A single writer gives a total order for free. Vector clocks help only when several writers update independently, and here they add size with no extra information.",
      distractors: [
        "",
        "An append-only log from one writer cannot reorder itself. Drift matters only across machines.",
        "Lamport stamps duplicate the log position, so they add nothing for one writer.",
        "A hybrid clock is useful for real-time-ish stamps across nodes, which this service does not need.",
      ],
    },
    {
      q: "A three-region SQL database on ordinary cloud VMs wants timestamps near real time for 'as of 10:00' reads that also respect causality. No atomic clocks are available. Which fits best?",
      options: [
        "Plain Lamport counters with no wall-clock part",
        "Raw NTP wall-clock stamps with no further logic",
        "Hybrid logical clocks, with a configured maximum offset",
        "A vector clock per row with an entry per region",
      ],
      answer: 2,
      difficulty: "judge",
      why: "An HLC combines physical time with a counter, so stamps stay near real time and still respect causality. It needs no special hardware, only a bound on clock offset.",
      distractors: [
        "Pure counters do not mean any real time, so an 'as of 10:00' query has no meaning.",
        "Raw wall clocks can order a later write before an earlier one when clocks differ.",
        "",
        "Vector clocks detect concurrency but are not timestamps, and an as-of read needs a single comparable value.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-logical-clocks-engine-timeline",
      scenario:
        "A trading engine runs as one process on one server. Its single event loop handles ticks, signals and order changes, and writes each event to MySQL. The founder wants a trustworthy timeline for any day: signal, order sent, fill, stop. Fill times also come from the broker, stamped by the broker's clock. A server clock correction sometimes steps the engine's clock by a fraction of a second. How should events be ordered?",
      options: [
        {
          label: "Sort everything by the engine's wall-clock timestamp, including broker fills",
          appeal:
            "One familiar column, and it is already stored with every row.",
        },
        {
          label: "A vector clock with one entry per component: engine, bridge and web app",
          appeal:
            "Correctly detects what is concurrent across components.",
        },
        {
          label: "Use the single writer's own growing sequence for internal events, and keep the broker's time as a separate field",
          appeal:
            "Exact order for everything one process writes, and no mixing of two clocks.",
        },
        {
          label: "Lamport timestamps passed between the engine and the broker's API",
          appeal:
            "Gives one total order across all parties.",
        },
      ],
      best: 2,
      verdict:
        "All internal events come from one writer, so its append sequence is an exact order that no clock correction can disturb. The broker's timestamp is a fact reported by another machine, so it is stored beside, not blended in. Wall-clock sorting can reverse events when the clock steps. Vector or Lamport clocks cannot be threaded through a broker API that will not carry them.",
      claims: [
        {
          text: "You get an exact order for events one process writes, but it says nothing about the order of events on other machines.",
          axis: "trade",
          correct: true,
          note: "True. A single writer's sequence is a total order only over its own events.",
        },
        {
          text: "You keep the broker's timestamp as its own field, because it comes from another clock and is a reported fact.",
          axis: "trade",
          correct: true,
          note: "True. Mixing it into the internal order would import the broker's clock error.",
        },
        {
          text: "The engine's wall-clock timestamp gives the same exact order as the sequence.",
          axis: "trade",
          correct: false,
          note: "A clock step or two events in one millisecond can make the timestamps tie or reverse. The sequence cannot.",
        },
        {
          text: "If a second engine began writing to the same table, each would count its own sequence and the combined order would no longer be valid.",
          axis: "failure",
          correct: true,
          note: "True. That is the point at which a logical or hybrid clock is needed.",
        },
        {
          text: "If NTP steps the engine's clock back, the sequence numbers also go back.",
          axis: "failure",
          correct: false,
          note: "A sequence counts rows, not time, so a clock step does not move it.",
        },
        {
          text: "Check that sequence order and timestamp order agree. A disagreement shows a clock step worth investigating.",
          axis: "measure",
          correct: true,
          note: "True. It turns a silent clock problem into a visible one.",
        },
        {
          text: "A gap between the broker's clock and the engine's clock proves events were lost.",
          axis: "measure",
          correct: false,
          note: "Two clocks always differ a little. A gap shows skew, not loss.",
        },
      ],
    },
    {
      id: "sd-logical-clocks-festival-cart",
      scenario:
        "An e-commerce site runs a festival sale across 3 data centres. The cart store is Dynamo-style: writes are accepted at any replica, users are on flaky mobile networks, and a network split between sites must not block adding to a cart. The business rule is that an item a customer added must never silently vanish. The store tracks version vectors. How should concurrent cart updates be resolved?",
      options: [
        {
          label: "Last-write-wins using each server's wall-clock time",
          appeal:
            "No merge code, and the store picks a winner by itself.",
        },
        {
          label: "Keep concurrent versions as siblings, and merge them on read by taking the union of items",
          appeal:
            "No added item is dropped, and conflict is detected exactly.",
        },
        {
          label: "Route every cart write to one leader in a single data centre",
          appeal:
            "One writer gives a simple total order.",
        },
        {
          label: "Reject a write when it conflicts and ask the user to retry",
          appeal:
            "No conflicting data is ever stored.",
        },
      ],
      best: 1,
      verdict:
        "The rule forbids losing an added item, and writes must continue during a split, so concurrent versions must be kept and combined. Version vectors show which versions are concurrent, and a union merge never drops an add. LWW decides by clock error and loses items. A single leader blocks users far from it and fails in a split. Rejecting writes hurts the very users on flaky networks.",
      claims: [
        {
          text: "Reads can return several siblings, so the application owns a merge function.",
          axis: "trade",
          correct: true,
          note: "True. The store detects conflict, and the application decides how to resolve it.",
        },
        {
          text: "Version vectors grow with the number of writers, so the store must bound or prune them.",
          axis: "trade",
          correct: true,
          note: "True. Dynamo truncates the vector when it passes a size limit.",
        },
        {
          text: "The store picks one winner for you automatically, so no application code is needed.",
          axis: "trade",
          correct: false,
          note: "That is LWW. With siblings, the application must merge.",
        },
        {
          text: "Pruning a vector can make two related versions look concurrent, giving extra siblings to merge.",
          axis: "failure",
          correct: true,
          note: "True. This is a documented side effect, harmless when the merge is safe to repeat.",
        },
        {
          text: "A replica with a wrong wall clock can make vector clocks pick the wrong winner.",
          axis: "failure",
          correct: false,
          note: "Vector clocks use counters, not wall time, so clock error does not change their comparison.",
        },
        {
          text: "Track siblings per read and the average vector size. Rising numbers mean heavy concurrency or growth.",
          axis: "measure",
          correct: true,
          note: "True. They show how often merges happen and whether vectors need pruning.",
        },
        {
          text: "Mean clock skew between data centres is the main sign that carts are correct.",
          axis: "measure",
          correct: false,
          note: "Correctness here depends on counters and merges, not on how close the clocks are.",
        },
      ],
    },
    {
      id: "sd-logical-clocks-regional-sql",
      scenario:
        "A fintech runs a SQL database across three regions on ordinary cloud VMs. It needs snapshot reads 'as of' a timestamp, such as the balance at 10:00, and writes related by cause must never appear reversed. Clocks are NTP-synced and usually within a few milliseconds, and no GPS or atomic clock hardware is available. The team is small. Which timestamp scheme fits?",
      options: [
        {
          label: "Spanner-style TrueTime with commit wait",
          appeal:
            "Timestamps match real time and give the strongest ordering.",
        },
        {
          label: "Plain Lamport counters on every node",
          appeal:
            "Cheap, tiny, and causally consistent.",
        },
        {
          label: "A vector clock per row with one entry per region",
          appeal:
            "Detects concurrent writes exactly.",
        },
        {
          label: "Hybrid logical clocks with a configured maximum clock offset",
          appeal:
            "Near real time and causal, on ordinary hardware.",
        },
      ],
      best: 3,
      verdict:
        "The team needs timestamps that read as real time for as-of queries and respect cause, without special hardware. An HLC does both within a bounded offset. TrueTime needs GPS and atomic clocks. Lamport counters mean no time, so an as-of read makes no sense. Vector clocks detect conflict, but they are not one comparable timestamp.",
      claims: [
        {
          text: "Timestamps stay close to real time and respect causality, so 'as of 10:00' reads are meaningful.",
          axis: "trade",
          correct: true,
          note: "True. This is the property HLC adds to a pure counter.",
        },
        {
          text: "A read may need to retry when a value's timestamp falls inside the uncertainty window set by the maximum offset.",
          axis: "trade",
          correct: true,
          note: "True. This is the price of not having bounded-error hardware clocks.",
        },
        {
          text: "You get Spanner's guarantee that commit order always equals real-time order, with no uncertainty.",
          axis: "trade",
          correct: false,
          note: "HLCs have no commit wait over a tight hardware bound, so they cannot promise that.",
        },
        {
          text: "If a node's clock drifts beyond the configured maximum offset, ordering guarantees can break, so such a node should stop serving.",
          axis: "failure",
          correct: true,
          note: "True. Systems using HLCs monitor offset and take a drifting node out.",
        },
        {
          text: "A node with a fast clock only hurts its own writes.",
          axis: "failure",
          correct: false,
          note: "Its timestamps travel in messages and push other nodes' clocks forward, so the effect spreads.",
        },
        {
          text: "Watch the clock offset between nodes against the configured maximum, and alert well before it is reached.",
          axis: "measure",
          correct: true,
          note: "True. The offset is the quantity the whole guarantee depends on.",
        },
        {
          text: "The count of logical counter increments per second shows whether ordering is correct.",
          axis: "measure",
          correct: false,
          note: "That counts activity. Correctness depends on the clock offset staying inside its bound.",
        },
      ],
    },
  ],
};

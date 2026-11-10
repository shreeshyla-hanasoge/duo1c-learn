import type { Topic } from "../../types.ts";

export const sdDesignTicketBooking: Topic = {
  id: "sd-design-ticket-booking",
  title: "Design a ticket booking system",
  tier: 10,
  week: 20,
  depth: "deep",
  summary:
    "Few seats, lakhs of buyers, one minute. Learn atomic inventory updates, expiring holds, a queue before the surge, and what to do when payment is late.",
  why: "Ticket booking is the cleanest example of contention: many people want the same scarce thing at the same instant, and selling it twice is a real failure. Every design interview about IRCTC, BookMyShow or a flash sale is the same problem. You will meet atomic counters, expiring holds, virtual queues and compensation for late payments, and you will learn to say which parts must be exactly correct and which may be approximate. Traed has no scarce inventory, so it only shares the vocabulary.",
  learn: {
    intuition:
      "Picture a railway counter with 100 berths left on one train and a crowd of a lakh people at the door when the shutter goes up. The clerk can serve one person at a time, and the crowd cannot all be inside. So a guard at the door lets in only as many as the clerk can handle, in some fair order. When the clerk picks a berth for you, a note goes on it that says held for you, ten minutes. You walk to the cashier. If you pay in time, the note becomes a ticket. If you do not, the note is torn up and the berth goes back to the crowd. Two rules matter above all. A berth must never be written down for two people, even for a moment. And the note must always expire, because a person who walks away must not block a berth for ever. Most of the design is these two rules, plus the guard at the door.",
    mechanics: [
      {
        heading: "Step 1: requirements and rough numbers",
        body: "Functional needs: search availability, hold seats, pay, confirm, cancel. The non-functional needs decide the design. Never sell the same seat twice. Survive a surge that is far above the daily average. Be fair, so early arrivals are not beaten by bots. Take an illustrative case: Tatkal quota opens at a fixed minute, 10 lakh people try in the first 60 seconds, and each sends about 5 requests. That is 50 lakh requests, roughly 83,000 a second at the peak, against perhaps 20,000 successful bookings in total. Reads outnumber writes by two orders of magnitude, but the writes are concentrated: a lakh people want the same 100 berths on one train and date.",
      },
      {
        heading: "Step 2: API and data model",
        body: "Keep the API small. `GET /availability?train&date&class` is cached and may be slightly stale. `POST /holds` with the train, date, class and passengers returns a `hold_id` and an `expires_at`. `POST /holds/{id}/pay` carries an idempotency key, so a retry cannot charge twice. Two data shapes exist. For a train class, a counter row `(train, date, class, available)` is enough, with a waiting list beyond zero. For a cinema, each seat is a row `(show, seat, state)` with a unique constraint so one seat has one active booking. A booking moves through HELD, PAID, CONFIRMED, with EXPIRED and CANCELLED as exits. Writing the allowed transitions down makes illegal ones easy to reject.",
      },
      {
        heading: "Step 3: the high-level design",
        body: "From the outside in: a CDN serves the static pages and absorbs the browsing. A virtual waiting room at the edge admits users at a rate the booking tier can take, and hands each admitted user a signed token. Stateless booking servers check the token and talk to the inventory store, which is partitioned by train and date so one hot train cannot slow another. A hold is written with an expiry time. Payment goes to an external gateway, which calls back with the result. A sweeper releases expired holds. Notifications go out through a queue. The only component that must be exactly right is inventory. Everything in front of it exists to protect it.",
      },
      {
        heading: "Step 4: the hard part, contention and holds",
        body: "Never read the count, check it in code, then write it back. Two clerks do that at once and both see 1. Use one atomic statement: `UPDATE inventory SET available = available - 2 WHERE id = ? AND available >= 2`. If it changes zero rows, the seats are gone. This is compare-and-set. The row is hot, so the database serialises writers on it, and that is acceptable because one train row sustains far more updates than 100 berths need. Expiry uses a min-heap or timing wheel of deadlines: when a hold passes its time, add its seats back. Race to handle: the user pays at second 599 and the callback arrives at 601. Either extend the hold when payment starts, or confirm if seats remain, else refund.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no scarce inventory shared by a crowd, so it does not need holds, a waiting room or atomic seat counters. Its one user and one engine process are the whole load. The nearest ideas are the ones around money. The broker, not Traed, owns the order book and decides whether an order fills, so Traed treats its own record as a claim to be reconciled. Idempotent retries matter there too, because a retried order must not become a second order. Traed would need this design only if it sold a limited resource, such as a capped number of paid seats on a shared feed.",
      },
    ],
    complexityDerivation:
      "The invariant is that every unit of inventory is promised to at most one buyer. An atomic compare-and-set protects it, because the check and the decrement happen as one indivisible step, so concurrent buyers are ordered by the database instead of racing in application code. The throughput argument follows. One hot row accepts a few thousand updates a second, and 100 berths need only 100 successful ones, so the row is never the limit. The limit is the crowd, which is why a queue in front admits only what the row can take. Holds add a second invariant: a promise must expire, or abandoned carts leak inventory. The deadline structure makes expiry cost logarithmic in the number of holds. The argument stops holding in three places. If the inventory is split across shards, one seat order spanning two shards needs a distributed transaction. If payments are slow, holds must last longer and fewer buyers fit. And if fairness matters more than speed, first come first served is gamed by bots, and a lottery or identity checks replace it.",
    variants: [
      {
        name: "Counter inventory with a waiting list",
        when: "Trains and flights, where seats in a class are interchangeable until allocation.",
        delta:
          "One counter per train, date and class, decremented atomically. Beyond zero, bookings join a waiting list that is promoted when a cancellation frees a berth. Berth numbers are assigned after confirmation.",
      },
      {
        name: "Seat-level rows with expiring locks",
        when: "Cinemas, concerts and stadiums, where the buyer picks a particular seat.",
        delta:
          "Each seat is a row with a state and a hold expiry. Selecting a seat sets HELD only if it is currently free, again as a conditional update. The seat map shown to others is cached and may lag by a second or two.",
      },
      {
        name: "Lottery or batch allocation",
        when: "Demand is far above supply and speed contests would only reward bots, as with some festival and sports tickets.",
        delta:
          "Requests are collected for a window, then a random draw or a rule picks winners. It removes the race for the first second, at the price of waiting for the result and building the draw so it is fair.",
      },
    ],
    tradeoffs: [
      {
        vs: "Pessimistic row lock versus a conditional update",
        pick: "The conditional update for a counter, row locks only for multi-row changes",
        because:
          "A single atomic statement holds the lock for microseconds and cannot be forgotten open. A lock held across a user's think time or a payment call blocks everyone behind them. A lock is needed only when several rows must change together.",
      },
      {
        vs: "A short hold versus a long hold",
        pick: "A hold of a few minutes, extended once when payment begins",
        because:
          "Short holds return abandoned seats quickly, which matters when the supply is 100 berths. But a hold that expires while the bank page is open creates paid-but-lost bookings. Extending on payment start covers that, at the cost of a little extra locked inventory.",
      },
      {
        vs: "First come first served versus a queue with fairness checks",
        pick: "A waiting room that admits at a fixed rate, with identity limits per account",
        because:
          "Raw first come first served rewards the fastest script and the nearest data centre. A queue controls the load on the inventory tier and lets you cap seats per account, though some users still queue longer than they would like.",
      },
    ],
  },
  algorithms: [
    {
      name: "Compare-and-set (conditional update)",
      role: "Decrements the available count only if enough remain, as one atomic step, so two buyers can never both take the last seat.",
    },
    {
      name: "Min-heap of hold deadlines",
      role: "Always exposes the hold that expires next, so the sweeper releases seats in time order without scanning every hold.",
      dsa: "heaps",
    },
    {
      name: "FIFO queue with token-bucket admission",
      role: "Orders the surge fairly and lets users into the booking tier at a fixed rate that the inventory store can sustain.",
      dsa: "stacks-queues",
    },
    {
      name: "Idempotency key",
      role: "Makes a retried payment request return the first result instead of creating a second charge.",
    },
  ],
  realWorld: [
    {
      system: "IRCTC Tatkal booking",
      kind: "industry",
      problem:
        "Tatkal tickets open for a train at a fixed hour a day before travel, and demand within the first minute far exceeds the seats.",
      applied:
        "Indian Railways publishes that Tatkal booking opens at 10:00 for air-conditioned classes and 11:00 for the others, one day ahead. Over the years IRCTC has added measures against automated booking, such as captchas and identity checks, and a waiting list sits beyond confirmed seats.",
      evidence: "Indian Railways and IRCTC published Tatkal rules and press coverage of anti-bot measures",
      impact:
        "It shows a surge at a known second, fairness enforced by identity and friction rather than speed alone, and a waiting list as a second queue beyond the stock.",
    },
    {
      system: "BookMyShow seat selection",
      kind: "industry",
      problem:
        "Two people may tap the same seat at the same moment, and an abandoned selection must not block the seat for the whole show.",
      applied:
        "The app holds the seats you select for a short time, shown to the user as a countdown, and releases them if payment is not completed before it ends. The exact internals are not public.",
      evidence: "Visible behaviour of the BookMyShow booking flow; the countdown timer shown during payment",
      impact:
        "It is the standard seat-hold pattern: reserve first, expire if unpaid, so inventory is neither double sold nor locked for ever.",
    },
    {
      system: "Virtual waiting rooms for ticket sales",
      kind: "industry",
      problem:
        "A popular concert sale sends far more users at the site than the booking tier can serve, and the servers fail for everyone.",
      applied:
        "Ticketing sites such as Ticketmaster use a queue in front of the sale and admit people in batches, and commercial services such as Queue-it sell the same idea. Users hold a place in line and are let through at a rate the backend can take.",
      evidence: "Ticketmaster's published queue and waiting-room descriptions; Queue-it product documentation",
      impact:
        "Load on the inventory tier is set by the admission rate, not by the size of the crowd.",
    },
    {
      system: "Airline overbooking and fare buckets",
      kind: "industry",
      problem:
        "Some passengers never show up, so selling exactly the seat count would leave aircraft partly empty.",
      applied:
        "Airlines deliberately sell more tickets than seats on some flights, based on no-show history, and compensate passengers who are denied boarding. Inventory is also split into fare buckets that close as they sell out.",
      evidence: "Widely documented airline revenue management practice and denied-boarding compensation rules",
      impact:
        "It shows that never selling twice is a business choice. Where cancellations are common and compensation is cheap, controlled overselling can beat strict counting.",
    },
  ],
  insights: [
    {
      t: "Check and decrement in one step",
      d: "UPDATE inventory SET available = available - n WHERE available >= n. Zero rows changed means sold out. Read-then-write in code loses races.",
    },
    {
      t: "A hold is a lease",
      d: "It reserves the seat and carries a deadline. Without the deadline, every abandoned cart leaks inventory.",
    },
    {
      t: "Protect the hot row with a queue",
      d: "The database is not slowed by 83,000 requests a second if only the admitted few reach it. Admit at the rate the inventory can bear.",
    },
    {
      t: "Late payment is a normal case",
      d: "A payment may succeed after the hold expired. Decide in advance: extend, confirm if free, or refund as compensation.",
    },
  ],
  pitfalls: [
    "Reading the count, comparing it in application code and writing it back. Two requests both see one seat left and both succeed.",
    "Holding a database lock while the user is on the payment page. One slow payment blocks everyone else for that train.",
    "Treating the cached availability page as the truth. It is for display. Only the atomic update decides who gets the seat.",
  ],
  quiz: [
    {
      q: "What is the purpose of an expiry time on a seat hold?",
      options: [
        "It makes the payment gateway respond faster to the booking server",
        "It returns seats to sale when a buyer abandons the booking",
        "It stops the same user from booking more than one seat",
        "It lets the system keep the seat count in a cache only",
      ],
      answer: 1,
      difficulty: "recall",
      why: "A hold reserves a seat while the buyer pays. The expiry ensures that an abandoned or failed attempt cannot block the seat for ever.",
      distractors: [
        "The gateway's speed is unrelated to the hold. The expiry only sets how long the seat is reserved.",
        "",
        "A per-user limit is a separate rule, enforced by counting the user's bookings, not by expiry.",
        "Expiry has nothing to do with where the count is stored. The count still needs a durable, atomic home.",
      ],
    },
    {
      q: "Which statement correctly describes a compare-and-set update on an inventory count?",
      options: [
        "It locks the table until the buyer has finished paying",
        "It reads the count first and then asks the buyer to confirm",
        "It retries the read until the count looks stable",
        "It decrements the count only if enough remain, in one atomic step",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Compare-and-set folds the check and the change into one indivisible operation, so concurrent buyers are ordered by the store and cannot both take the last seat.",
      distractors: [
        "That is a long-held lock, which blocks everyone and is the thing a conditional update avoids.",
        "A separate read followed by a write leaves a gap in which another buyer can act.",
        "Retrying reads does not remove the gap between check and write.",
        "",
      ],
    },
    {
      q: "One train has 100 Tatkal berths. Two requests for 2 berths each arrive when 3 remain. Using UPDATE ... SET available = available - 2 WHERE available >= 2, what happens?",
      options: [
        "One request succeeds, leaving 1, and the other changes zero rows",
        "Both succeed, leaving 3 minus 4, which is below zero",
        "Both fail, because neither can see the other's change",
        "Both succeed and the system corrects the count at night",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The database orders the two statements. The first sees 3, passes the condition and leaves 1. The second sees 1, fails the condition and changes zero rows, so that buyer is told the seats are gone.",
      distractors: [
        "",
        "That would happen with read-then-write in application code. The condition inside the statement prevents it.",
        "The statements are serialised on the row, so the second one does see the first one's result.",
        "A nightly fix would mean tickets already sold twice. The atomic condition prevents the oversell up front.",
      ],
    },
    {
      q: "A sale draws 8 lakh users in one minute, but the inventory store can take about 5,000 booking attempts a second. What is the best first step?",
      options: [
        "Buy a larger database so that it can take 8 lakh requests a second",
        "Cache the booking endpoint so repeated attempts are answered cheaply",
        "Put a waiting room in front that admits users at about the store's rate",
        "Shorten every hold to 30 seconds so the seats turn over quickly",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The load comes from the crowd, not the stock. Admitting users at the rate the store can bear keeps the hot rows healthy, and the stock is small enough that the queue clears quickly.",
      distractors: [
        "Hot-row contention does not shrink by buying size, and the crowd is a one-minute spike.",
        "A booking write cannot be answered from a cache. Only reads such as availability can.",
        "",
        "Short holds make users lose seats while paying and do not reduce the incoming requests.",
      ],
    },
    {
      q: "A buyer's bank page takes 11 minutes and the hold expired at 10. The payment now succeeds. Which handling fits a system that must never charge for a lost seat?",
      options: [
        "Confirm if seats remain, else refund as a compensation step",
        "Keep the money and tell the buyer to book again",
        "Delete the payment record so that there is no trace to dispute",
        "Block all new holds until every outstanding payment has settled",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Late payment is a normal case. If the seats are still free the booking can be confirmed. If not, the system must undo the charge with a refund, which is a compensating action.",
      distractors: [
        "",
        "Keeping money for a ticket not delivered is both wrong and a dispute waiting to happen.",
        "Deleting the record hides the problem and leaves the money taken with no booking.",
        "Blocking new holds would stop the sale to protect a few late payments.",
      ],
    },
    {
      q: "Seat availability for a hot train is cached for 2 seconds on the search page. A user sees 5 seats and tries to book. Is this design correct?",
      options: [
        "No, because the cache will sometimes show an old number",
        "Yes, provided the booking itself is decided by the atomic update",
        "No, because a cache can never be used in a booking system",
        "Yes, provided the cache is refreshed after every single booking",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The cached count is for display. Being 2 seconds out of date costs a few disappointed clicks, but the oversell is prevented by the atomic update when the user tries to book.",
      distractors: [
        "A slightly old display number is an acceptable approximation. It is not a correctness failure.",
        "",
        "Caches are fine for reads that can be a little stale. Only the decision to sell must be exact.",
        "Refreshing after every booking removes the benefit of the cache and still would not make the display exact.",
      ],
    },
    {
      q: "A team wants fairness at a ticket sale for a famous match, with 30,000 seats and about 20 lakh requests. They propose pure first come first served on arrival time at the server. What is the most important objection?",
      options: [
        "It needs a bigger database than any other approach",
        "It cannot be implemented without sticky load balancing",
        "Arrival time rewards bots and the nearest data centre, so it is not fair",
        "It makes holds impossible, because every request is ordered by time",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Arrival time at a server measures speed and network position, not intent. A queue with identity limits, or a lottery, gives a fairer outcome than a pure race.",
      distractors: [
        "The database size depends on the stock and the admission rate, not on the fairness rule.",
        "Ordering by arrival time does not need stickiness. A shared queue does that.",
        "",
        "Holds work with any admission order. They are a separate mechanism.",
      ],
    },
    {
      q: "A small theatre sells 300 seats a night, never more than 20 people at once, from one server with one database. An engineer proposes a Redis lock service, a waiting room and sharded inventory. What is the sound judgement?",
      options: [
        "Approve it, because every booking system needs all three components",
        "Approve only the waiting room, since queues are always good",
        "Approve it, but build the sharding first as it is the hardest part",
        "Reject it: a conditional update on one database row-per-seat is enough",
      ],
      answer: 3,
      difficulty: "judge",
      why: "At 20 concurrent users one database handles contention easily. The atomic update and a hold expiry give correctness, and the extra parts add failure modes without a matching load.",
      distractors: [
        "Those parts answer a surge the theatre does not have.",
        "A waiting room protects against load that does not occur here, so it adds cost for nothing.",
        "Sharding solves write volume, which is not the problem, and makes multi-seat bookings harder.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-ticket-booking-tatkal-open",
      scenario:
        "A national railway portal opens Tatkal booking at 10:00 sharp. In the first minute 10 lakh users arrive and send about 5 requests each. Only about 20,000 seats are sold across all trains, and one popular train has 100 berths with a lakh people chasing them. The inventory database can sustain about 5,000 booking writes a second. Payments take up to 3 minutes through external banks. What should the design do?",
      options: [
        {
          label: "A waiting room admitting users at about 5,000 a second, then an atomic count update per train and date, with a hold of a few minutes",
          appeal: "Load on the database is fixed by the admission rate, and the update makes overselling impossible.",
        },
        {
          label: "Scale the booking servers 100 times and let everyone through",
          appeal: "More servers handle more requests, with no change to the booking logic.",
        },
        {
          label: "Cache the seat count in Redis and decrement it there with no database check",
          appeal: "Redis is fast and a decrement is a single command.",
        },
        {
          label: "Serialise all bookings through one global lock so only one booking runs at a time",
          appeal: "It makes double selling impossible by construction.",
        },
      ],
      best: 0,
      verdict:
        "The crowd is 200 times what the store can take, so admission must be rate-limited, and the atomic update gives the exactness that the stock needs. Scaling stateless servers does not help when the hot row is the limit. A cache-only count can be lost or evicted and so is not a safe record. A global lock serialises all trains behind each other when only one train's row is hot.",
      claims: [
        {
          text: "You accept that many users wait in a queue for minutes, so that the few admitted get a fast and correct answer.",
          axis: "trade",
          correct: true,
          note: "True. The waiting room trades user wait time for a store that stays healthy.",
        },
        {
          text: "Adding 100 times more booking servers raises the rate at which one train's counter can be updated.",
          axis: "trade",
          correct: false,
          note: "Servers are not the limit. The writes still meet at one row.",
        },
        {
          text: "If the waiting room's admission token is not checked by the booking servers, bots can skip the queue and hit the store directly.",
          axis: "failure",
          correct: true,
          note: "True. The token must be signed and verified, or the queue protects nothing.",
        },
        {
          text: "If a payment finishes after the hold expires and the seat was resold, the system needs a refund step.",
          axis: "failure",
          correct: true,
          note: "True. Late payment is a normal case and needs compensation.",
        },
        {
          text: "An expired hold is harmless, because the seat count is rebuilt from the cache at the next restart.",
          axis: "failure",
          correct: false,
          note: "The count is not rebuilt from a cache. Expired holds must be released explicitly or the seats leak.",
        },
        {
          text: "Watch updates per second on the hottest row, queue length and admission rate, and the number of holds that expire unpaid.",
          axis: "measure",
          correct: true,
          note: "True. These show whether the store is saturated and whether holds are right-sized.",
        },
        {
          text: "The average response time across the whole day, because it covers the surge.",
          axis: "measure",
          correct: false,
          note: "A one-minute spike disappears in a day-long average. Look at the peak minute and the tail.",
        },
      ],
    },
    {
      id: "sd-design-ticket-booking-small-theatre",
      scenario:
        "A two-person team builds booking for a single-screen theatre: 250 seats, shows in the evening, at most 30 people choosing seats at once, one MySQL server. Payment is through a hosted gateway that returns in under a minute. Users pick particular seats. What is the right design?",
      options: [
        {
          label: "A seat row per show with a state and hold expiry, changed by conditional updates, and a small job that releases expired holds",
          appeal: "Correct with one database, no extra systems to run.",
        },
        {
          label: "A distributed lock service plus sharded inventory across several databases",
          appeal: "It will keep working if the theatre ever becomes a chain.",
        },
        {
          label: "A waiting room and message queue in front of the booking page",
          appeal: "It protects against a surge of any size.",
        },
        {
          label: "No hold at all; take payment first and assign the seat afterwards",
          appeal: "Avoids the expiry job.",
        },
      ],
      best: 0,
      verdict:
        "At 30 concurrent users a single database orders seat updates with no strain, and the conditional update gives exactness. The hold stops a person losing a seat while paying, and the sweeper handles abandonment. A lock service, shards or a queue solve scale the theatre does not have, and paying before choosing the seat means someone can pay for a seat another has already paid for.",
      claims: [
        {
          text: "You accept a simple design that will need rework if traffic grows by a few hundred times.",
          axis: "trade",
          correct: true,
          note: "True. Building for current scale is cheaper, and the conditional update carries over to a larger design.",
        },
        {
          text: "You give up correctness, because one database cannot prevent two people taking the same seat.",
          axis: "trade",
          correct: false,
          note: "A conditional update on one database is exactly what prevents it.",
        },
        {
          text: "If the release job stops running, expired holds keep seats blocked until it is fixed.",
          axis: "failure",
          correct: true,
          note: "True. Check expiry also when reading a seat's state so correctness does not depend on the job alone.",
        },
        {
          text: "If two users tap the same seat together, one update changes zero rows and that user is told the seat is taken.",
          axis: "failure",
          correct: true,
          note: "True. The conditional update decides, and the loser gets a clear message.",
        },
        {
          text: "Count seats double-booked, holds that expired while a payment was in progress, and the time between a tap and the answer.",
          axis: "measure",
          correct: true,
          note: "True. They measure correctness, the hold length and what users feel.",
        },
        {
          text: "The number of servers, because more servers mean a more reliable booking system.",
          axis: "measure",
          correct: false,
          note: "Server count is a cost, not a result. It says nothing about double bookings or waiting.",
        },
      ],
    },
    {
      id: "sd-design-ticket-booking-festival-concert",
      scenario:
        "A promoter sells 40,000 tickets for a concert. Past sales drew 15 lakh visitors in the first ten minutes, many using scripts to refresh. Fans say speed contests are unfair. Tickets are of a few price tiers, and any seat in a tier is acceptable. The platform can take about 2,000 purchases a second. What is the best approach?",
      options: [
        {
          label: "Pure first come first served at the opening second",
          appeal: "It is the simplest rule and everyone understands it.",
        },
        {
          label: "Registration in advance with a random draw for purchase slots, then counter inventory per tier, admitted through a queue",
          appeal: "It removes the speed race and keeps the sale within the platform's rate.",
        },
        {
          label: "Let everyone in and rely on auto-scaling to absorb the load",
          appeal: "Cloud scaling is cheap and automatic.",
        },
        {
          label: "Sell seat by seat with a lock per seat, shown live on a map",
          appeal: "Fans like choosing an exact seat.",
        },
      ],
      best: 1,
      verdict:
        "With 15 lakh visitors for 40,000 tickets, fairness and rate both matter. A draw removes the advantage of scripts and nearness, and the queue keeps purchases under 2,000 a second. Tiers with interchangeable seats let a counter be used instead of per-seat locks. First come first served rewards bots, auto-scaling does not unblock a hot counter, and a live seat map for 15 lakh viewers adds contention for little value.",
      claims: [
        {
          text: "You accept that some fans do not get a ticket however fast they are, because winning is by draw, not speed.",
          axis: "trade",
          correct: true,
          note: "True. A draw is fair in process, not in outcome, since demand is far above supply.",
        },
        {
          text: "Tiers with interchangeable seats let counters replace per-seat locks, so purchases are cheaper to process.",
          axis: "trade",
          correct: true,
          note: "True. A counter is one row per tier. Seat numbers can be assigned after payment.",
        },
        {
          text: "A draw lets you skip checking for duplicate accounts, since luck evens things out.",
          axis: "trade",
          correct: false,
          note: "A person can enter many times with many accounts. A draw needs identity limits to be fair.",
        },
        {
          text: "If bots register thousands of accounts, the draw is skewed unless sign-up needs a verified phone number or identity.",
          axis: "failure",
          correct: true,
          note: "True. The draw is only as fair as the cost of an extra entry.",
        },
        {
          text: "If the platform is slow, auto-scaling guarantees that tickets are never oversold.",
          axis: "failure",
          correct: false,
          note: "Overselling is prevented by the atomic update, not by capacity.",
        },
        {
          text: "Watch purchases per second against 2,000, the share of tickets won by repeat accounts or devices, and the refund rate.",
          axis: "measure",
          correct: true,
          note: "True. They show load, fairness and how often payments fail after the draw.",
        },
        {
          text: "Total visitors in the first ten minutes, as the measure of sale success.",
          axis: "measure",
          correct: false,
          note: "Visitors measure demand. Success is measured by tickets sold without double sales and fair distribution.",
        },
      ],
    },
  ],
};

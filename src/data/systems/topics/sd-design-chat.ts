import type { Topic } from "../../types.ts";

export const sdDesignChat: Topic = {
  id: "sd-design-chat",
  title: "Design a chat system",
  tier: 10,
  week: 20,
  depth: "deep",
  summary:
    "One-to-one and group chat end to end: persistent connections, per-conversation ordering, delivery receipts, presence, offline delivery and group fan-out.",
  why: "Chat looks like a simple send button, yet it forces almost every real-time idea into one design: long-lived connections, ordering without a global clock, at-least-once delivery with de-duplication, and fan-out to many recipients. It is also the standard interview question for this reason. If you can explain why a message gets a sequence number per conversation, and what a double tick really promises, you can reason about any live push system. Traed's own browser feed is a one-way cousin of this design.",
  learn: {
    intuition:
      "Picture a post office that never closes, run by clerks who each know a street. You do not post a letter and hope. You keep a phone line open to your clerk. When you speak a message, the clerk writes it in the street's ledger, gives it the next page number, and says back 'got it'. Then the clerk finds the street of the person you wrote to. If that person's line is open, the message is read out at once. If not, it waits in the ledger and is read out as soon as they ring in, in page order. Because the page numbers are per street, two people chatting never disagree about what came first. A group is the same ledger read out to many lines. The hard parts are keeping the lines open, never losing a page, and never reading one twice.",
    mechanics: [
      {
        heading: "Requirements and scale, with numbers",
        body: "Functional: send and receive one-to-one and group messages, see sent, delivered and read states, see who is online, and get messages sent while offline. Non-functional: low latency when both sides are online, no lost message, and the same order on every device. Take 50 million daily users sending 40 messages each. That is 2 billion messages a day, or about 23,000 a second on average and perhaps 70,000 at peak. At roughly 100 bytes each, that is 200 GB of new text a day, about 73 TB a year. If 10 million users are connected at once and a server holds 50,000 sockets, you need about 200 gateway servers.",
      },
      {
        heading: "API and data model",
        body: "Clients talk over one WebSocket (a connection that stays open so the server can push) carrying small frames such as `send`, `ack`, `typing` and `sync`. Each `send` carries a client-generated `client_msg_id`, so a retry after a timeout is recognised. The core table is `messages`, partitioned by `conversation_id` and sorted by `seq`, a number that grows by one inside that conversation. Other tables hold `conversations`, `members`, a per-device `last_acked_seq` cursor, and `devices` (push tokens). Reading history is then one range scan: conversation 42, seq above 1,900. Wide-column or key-value stores such as Cassandra and DynamoDB fit this access pattern well.",
      },
      {
        heading: "High-level design",
        body: "Clients connect through a load balancer to stateless gateway servers that only hold sockets. A registry (Redis or similar) maps each user to the gateway holding their connection. A send goes gateway to chat service, which de-duplicates on `client_msg_id`, assigns the next `seq`, writes to the message store, and acks the sender. Then it looks up each recipient in the registry and tells their gateway to push. Offline users get a push notification and the message stays in the store. Group messages loop over members. Presence is a separate service fed by heartbeats. Media goes to object storage and chat carries only a link. Splitting gateways from chat logic lets you scale sockets and storage separately.",
      },
      {
        heading: "The hard part: order, delivery and fan-out",
        body: "Order is solved per conversation, not globally: one partition owner per conversation (found by hashing `conversation_id` on a consistent-hash ring) hands out `seq` 1, 2, 3 in arrival order, so every device sorts the same way. Delivery is at-least-once: the server keeps pushing until the client acks `seq`, and the client drops repeats by `client_msg_id` and `seq`, which gives effectively exactly-once display. On reconnect the client sends its last seq and the server replays the gap. A tick is a state: sent means stored, delivered means the device acked, read means the app showed it. Fan-out for a 500-member group is 500 pushes per message, so very large groups switch to pull: members fetch from the shared log.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no chat, so it needs none of the ordering or receipt machinery. Its nearest cousin is the real-time bridge: browser dashboards hold WebSocket connections to an API Gateway, a DynamoDB table records connections and subscriptions, and the bridge pushes ticks to each connected client. That is the same registry-of-connections idea, one-way. Ordering is trivial because each tick carries its own time and a late tick is simply superseded. We would only need chat's design if users could message each other, and then the first thing to add is the per-conversation sequence number plus an ack cursor per device.",
      },
    ],
    complexityDerivation:
      "The design holds because it removes the one thing that cannot scale: a single global order. Messages only need to be ordered inside the conversation they belong to, so each conversation is an independent log with one writer, and conversations spread across partitions by hashing. Adding servers adds throughput linearly, because no two conversations share a counter. Reliability comes from two simple rules that compose: the sender retries until it sees an ack, and the receiver ignores anything it has already seen. A retry plus an idempotent receiver behaves like exactly-once even though the network only gives at-least-once. The argument stops holding in three places. A single hot conversation, such as a channel with a million members, cannot be split across writers and needs fan-out by pull. A partition owner that fails must be replaced without handing out the same seq twice, which needs a lease or consensus. And cross-conversation order, such as the view of one user across all chats, is deliberately not guaranteed.",
    variants: [
      {
        name: "Fan-out on write (push per member)",
        when: "Groups are small, up to a few hundred, and recipients are mostly online.",
        delta:
          "The server pushes one copy to each member's gateway at once. Latency is lowest, but cost grows with group size and each member needs an offline inbox.",
      },
      {
        name: "Fan-out on read (shared log, members pull)",
        when: "Very large channels where most members are inactive at any moment.",
        delta:
          "One copy is stored per channel. Each client tracks its own cursor and fetches on demand. Writes stay cheap, but a read must look up and merge, and push is only a 'new message' hint.",
      },
      {
        name: "Server-assigned id versus client-assigned id",
        when: "Deciding who names a message: it matters for retries and offline sending.",
        delta:
          "The client id lets a device queue messages offline and retry safely. The server seq gives the one true order. Real systems use both: client id for identity, server seq for position.",
      },
    ],
    tradeoffs: [
      {
        vs: "WebSocket versus long polling",
        pick: "WebSocket for chat; long polling as a fallback behind restrictive proxies",
        because:
          "A held-open socket pushes in milliseconds and avoids a new request per message, but it costs a held connection and memory per user. Polling is simpler to load balance but wastes requests and adds delay.",
      },
      {
        vs: "Per-conversation order versus global order",
        pick: "Per-conversation order",
        because:
          "A global sequence needs one writer for the whole system. Chat only needs conversations to be internally consistent, so you give up an ordering nobody can see in exchange for linear scaling.",
      },
      {
        vs: "Store messages on servers versus end-to-end encrypted relay",
        pick: "Depends on the product promise",
        because:
          "Server-side storage allows search, multi-device history and moderation. End-to-end encryption protects content from the server, but then search and history sync must happen on the devices.",
      },
    ],
  },
  algorithms: [
    {
      name: "Hash partitioning of conversations",
      role: "Sends every message of one conversation to the same partition owner, so one writer hands out its sequence numbers.",
      dsa: "hashing",
    },
    {
      name: "Consistent hashing",
      role: "Places conversations and gateway connections on a ring so adding or removing a node moves only a small share of them.",
    },
    {
      name: "Per-conversation monotonic sequence numbers",
      role: "Give every message a position in its conversation, which is what lets clients sort identically and detect gaps.",
    },
    {
      name: "Heartbeat with TTL for presence",
      role: "A device refreshes a key every few seconds; if the key expires, the user is shown as offline.",
    },
  ],
  realWorld: [
    {
      system: "WhatsApp",
      kind: "industry",
      problem:
        "Hundreds of millions of phones keep a connection open to a small engineering team's servers, and each message must arrive once, in order.",
      applied:
        "WhatsApp's servers were written in Erlang, whose lightweight processes suit one process per connection, and the company has publicly described single servers holding over a million connections. Its tick marks are the receipt states: one tick when the server has the message, two when the recipient's device has it, blue when it has been read.",
      evidence:
        "WhatsApp engineering talks and posts on Erlang scaling; the tick meanings are in WhatsApp's own help pages",
      impact:
        "Many connections per machine kept the fleet small, and the tick states give the sender honest feedback at each hop.",
    },
    {
      system: "Discord",
      kind: "industry",
      problem:
        "Billions of messages need time-sorted history per channel, with ids that sort by time and no central counter.",
      applied:
        "Discord ids are Snowflake-style 64-bit numbers that start with a timestamp, so sorting by id sorts by time. Its engineering blog describes storing messages partitioned by channel and moving from Cassandra to ScyllaDB to cut latency and operations work.",
      evidence: "Discord engineering blog: how Discord stores billions of messages",
      impact:
        "Reading recent history is a range scan inside one partition, which is the cheap path.",
    },
    {
      system: "Facebook Messenger on MQTT",
      kind: "industry",
      problem:
        "A mobile app on a weak connection must receive messages fast without draining the battery.",
      applied:
        "Facebook publicly described moving Messenger's mobile connection to MQTT, a small publish and subscribe protocol designed for low-bandwidth, unreliable links, instead of repeated HTTP polls.",
      evidence: "Facebook engineering post: Building Facebook Messenger (2011)",
      impact:
        "A small, persistent protocol cuts headers and wake-ups compared with polling.",
    },
    {
      system: "Traed real-time bridge",
      kind: "yours",
      problem:
        "Browsers and the strategy engine each need live ticks pushed to them, and the platform must know which sockets are connected and what each one wants.",
      applied:
        "Clients connect to an AWS API Gateway WebSocket with a per-user token. Small router functions keep connection and subscription rows in two DynamoDB tables, and a bridge function pushes each tick to the subscribed connections. It is one-way push, with no chat ordering or receipts.",
      evidence: "docs/HLD.md section 7 (WebSocket Bridge)",
      impact:
        "It shows the connection-registry half of a chat design at a small scale.",
    },
  ],
  insights: [
    {
      t: "Order per conversation, not globally",
      d: "A counter owned by one partition per conversation scales linearly, and users only ever see one conversation at a time.",
    },
    {
      t: "Retry plus de-duplicate equals exactly-once",
      d: "The server resends until acked, the client ignores repeats by id and seq. Neither half works alone.",
    },
    {
      t: "A tick is a state, not a promise",
      d: "Sent means stored, delivered means the device acked, read means the app displayed it. Each hop adds its own receipt.",
    },
    {
      t: "Gateways hold sockets, services hold logic",
      d: "Keeping connections in a stateless-looking tier with a user-to-gateway registry lets you scale sockets and storage separately.",
    },
  ],
  pitfalls: [
    "Ordering by the client's clock or the server's arrival time across machines. Clocks differ and two servers can disagree; use a sequence number from one owner.",
    "Marking a message delivered when the server stored it. Delivered must mean the recipient's device acknowledged it.",
    "Pushing every group message to every member regardless of size. A 200,000-member channel turns one message into 200,000 writes.",
  ],
  quiz: [
    {
      q: "In a chat system, what does the second grey tick on a message mean?",
      options: [
        "The recipient has opened the chat and read the message",
        "The recipient's device has received the message and acknowledged it",
        "The server has stored the message in its database",
        "The message has been sent to the recipient's push provider",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Receipts follow hops. One tick means the server has it, two means the recipient's device acked it, and a read marker is a later, separate event.",
      distractors: [
        "That is the read state, shown separately (blue in WhatsApp). Delivery happens before the user looks.",
        "",
        "That is the first tick: the server accepted and stored the message.",
        "A push provider hand-off is an internal step, not something receipts report.",
      ],
    },
    {
      q: "Why does chat usually order messages per conversation instead of with one global sequence?",
      options: [
        "A global sequence would make messages arrive later at every device",
        "Users never send messages in more than one conversation at a time",
        "Conversations are independent logs, and one global counter would be a single bottleneck",
        "Per-conversation numbers are shorter, which saves storage space",
      ],
      answer: 2,
      difficulty: "recall",
      why: "People only compare order within a conversation. Independent counters let partitions work in parallel, while a global counter forces every write through one place.",
      distractors: [
        "Latency comes from the counter being a bottleneck, not from the number itself being global.",
        "Users do chat in many conversations at once. They simply never need those to be merged into one order.",
        "",
        "Storage per number is tiny either way. The reason is scalability.",
      ],
    },
    {
      q: "A phone sends message M, loses signal before the ack arrives, and retries M with the same client_msg_id. The first copy had in fact reached the server. What should the server do?",
      options: [
        "Store it again, since a second copy is harmless to the reader",
        "Reject the retry with an error and ask the user to resend",
        "Wait for the client to confirm which copy it wants to keep",
        "Recognise the id, not store it again, and ack the original seq",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The client id makes the send idempotent. The server returns the same seq it assigned the first time, so the sender stops retrying and the recipient sees one message.",
      distractors: [
        "A duplicate is visible to the recipient and breaks the one-message-once promise.",
        "An error leaves the sender unsure whether to retry, which is exactly the confusion the id removes.",
        "Chat has no such confirmation step. The server decides using the id.",
        "",
      ],
    },
    {
      q: "A user opens the app after 6 hours offline with last_acked_seq = 1,200 in a conversation whose latest seq is 1,260. What should the sync do?",
      options: [
        "Send seq 1,201 to 1,260 and let the client ack each",
        "Send only the newest message and show a gap marker",
        "Send the whole conversation again and let the client sort it",
        "Ask the user to scroll up so the app can fetch older pages",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The cursor tells the server exactly which range is missing. Replaying that range in order keeps the log complete and uses little bandwidth.",
      distractors: [
        "",
        "Skipping the middle breaks completeness. Gaps are what the sequence number exists to prevent.",
        "Resending the whole history wastes bandwidth when the cursor shows exactly what is missing.",
        "Pull on scroll is for old history. New messages must be delivered without the user asking.",
      ],
    },
    {
      q: "A broadcast channel has 2 million subscribers and one post per minute. Pushing a copy to every subscriber's inbox on each post is too costly. What is the better design?",
      options: [
        "Cut the post rate so that fewer copies are written",
        "Store one shared copy and let clients pull from their cursor",
        "Shard the subscribers across servers and still write 2 million copies",
        "Ask each subscriber to poll every second for new posts",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Pull-based fan-out stores the post once. Cost per post stays constant and each client reads at its own pace, at the price of a read-time lookup.",
      distractors: [
        "Limiting the rate changes the product rather than the design, and the cost per post stays 2 million writes.",
        "",
        "Sharding spreads the work but the total is still 2 million writes per post.",
        "One-second polling by 2 million clients is about 2 million requests a second for no new data.",
      ],
    },
    {
      q: "A broker app adds in-app chat between a trader and a support agent. Roughly 3,000 conversations are active and each has one message every few minutes. What is the most sensible first design?",
      options: [
        "One WebSocket server, a table keyed by conversation and seq, and push for offline users",
        "Cassandra cluster with consistent hashing and a gateway fleet from day one",
        "A global sequence service shared by all conversations for exact order",
        "A peer-to-peer connection between trader and agent with no server storage",
      ],
      answer: 0,
      difficulty: "apply",
      why: "At about 3,000 conversations one box and an ordinary indexed table are ample. The per-conversation seq and the client id still give correct ordering and retries. The big architecture adds cost without need.",
      distractors: [
        "",
        "That is the answer for 50 million users. At this size the machinery is operational cost with no benefit.",
        "A global sequence is the bottleneck chat avoids, and it is unnecessary at this size.",
        "Peer-to-peer fails when one side is offline, and support needs a stored record.",
      ],
    },
    {
      q: "A design review proposes setting a message's order by the server's arrival timestamp from whichever of 20 chat servers received it. What is the sound judgement?",
      options: [
        "Fine, because servers keep their clocks synchronised to within a millisecond",
        "Fine, provided messages are also stamped with the sender's device time",
        "Not fine, because clocks drift and two servers can stamp a reply earlier than its question",
        "Not fine, because timestamps use too much storage compared with counters",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Even with time synchronisation, clocks disagree by small amounts, and a reply handled by another server can get an earlier stamp. One owner handing out a counter per conversation avoids the problem.",
      distractors: [
        "Synchronisation narrows the error but cannot remove it, and chat messages can be milliseconds apart.",
        "Device clocks are worse, since users can set them to any time.",
        "",
        "Storage is not the objection. Correct order is.",
      ],
    },
    {
      q: "The team marks a message 'delivered' as soon as the chat service writes it to the database, to make the UI feel fast. What is the right judgement?",
      options: [
        "Acceptable, since a stored message will eventually be delivered anyway",
        "Not acceptable, because delivered must mean a recipient device acked it, otherwise senders are misled",
        "Acceptable, as long as the read tick is accurate",
        "Not acceptable, because writing before acking breaks the order",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Receipts are a contract with the sender. A false 'delivered' hides a recipient who is offline, so the sender stops trying other routes. Only a device ack proves delivery.",
      distractors: [
        "Eventual delivery is a hope, not a state. The tick says what has happened.",
        "The read tick depends on the delivered one, so a wrong delivered state spoils both.",
        "Order is set by the seq, not by when the receipt flag is written.",
        "",
      ],
    },
  ],
  cases: [
    {
      id: "sd-design-chat-support-widget",
      scenario:
        "A broker with a small team of four engineers wants in-app support chat. Around 3,000 conversations are open at peak, each with a message every few minutes, and the product already runs on one PostgreSQL database and a handful of application servers. Messages must never be lost, and support agents need the history. What is the right design?",
      options: [
        {
          label: "A single WebSocket service backed by PostgreSQL with a (conversation_id, seq) key and a push provider for offline users",
          appeal:
            "Uses what the team already runs, gives correct order and history, and is easy to operate.",
        },
        {
          label: "A sharded Cassandra cluster with a separate presence service and a gateway fleet",
          appeal:
            "Matches how very large chat systems are built and leaves room to grow.",
        },
        {
          label: "Poll the server every 5 seconds from the client and skip persistent connections",
          appeal:
            "No socket handling at all, which keeps the server code trivial.",
        },
        {
          label: "Send support messages by email and show them in the app later",
          appeal:
            "No new infrastructure, and email already stores history.",
        },
      ],
      best: 0,
      verdict:
        "At about 3,000 conversations the load is a few messages per second, so one database and one socket service are ample. The sequence number and client id still give correct order and safe retries. A Cassandra fleet adds operations cost with no benefit, polling wastes requests and delays replies, and email is not a live conversation.",
      claims: [
        {
          text: "You accept that scaling to millions of users would later need a redesign of storage and gateways.",
          axis: "trade",
          correct: true,
          note: "True. The simple design is right for this size, and the cost is a later migration.",
        },
        {
          text: "A relational table keyed by conversation and seq gives ordered history with a simple range query.",
          axis: "trade",
          correct: true,
          note: "True. The access pattern is one range scan, and an index serves it.",
        },
        {
          text: "Choosing PostgreSQL means messages can no longer be ordered within a conversation.",
          axis: "trade",
          correct: false,
          note: "Order comes from the seq assigned per conversation, which works in any store.",
        },
        {
          text: "If the client retries without a client message id, the same message can be stored twice.",
          axis: "failure",
          correct: true,
          note: "True. The id is what makes the retry safe.",
        },
        {
          text: "If the single socket server restarts, stored messages are lost.",
          axis: "failure",
          correct: false,
          note: "Messages are in the database. Clients reconnect and sync from their last seq.",
        },
        {
          text: "Track the time from send to the recipient's ack, and the count of messages unacked after one minute.",
          axis: "measure",
          correct: true,
          note: "True. They show delivery speed and stuck messages directly.",
        },
        {
          text: "Total number of WebSocket connections is the best sign of a healthy chat.",
          axis: "measure",
          correct: false,
          note: "Connection count shows load, not whether messages arrive.",
        },
      ],
    },
    {
      id: "sd-design-chat-big-groups",
      scenario:
        "A messaging app in India has 100 million daily users. Most groups have under 50 members, but some community channels have 500,000 members, and a festival greeting wave sends several times normal traffic at midnight. Push to each member costs one write and one gateway lookup. How should group delivery work?",
      options: [
        {
          label: "Fan out on write to every member for all groups",
          appeal:
            "One uniform path and the lowest delivery latency.",
        },
        {
          label: "Fan out on write for small groups; for very large channels store one copy and let members pull from a cursor",
          appeal:
            "Matches cost to group size, so a 500,000-member post does not become 500,000 writes.",
        },
        {
          label: "Fan out on read for all groups, including 3-person chats",
          appeal:
            "Storage is smallest and there is a single mechanism.",
        },
        {
          label: "Block messages to groups larger than 1,000 members",
          appeal:
            "Removes the big-group cost entirely.",
        },
      ],
      best: 1,
      verdict:
        "Most traffic is in small groups, where push is cheap and fast. A 500,000-member channel would turn each post into half a million writes at the busiest minute, so it needs pull. A hybrid costs one extra code path but puts each group on the right side. All-push overloads the big channels, all-pull slows ordinary chats, and blocking removes a feature people want.",
      claims: [
        {
          text: "You accept two delivery paths to build and test, in return for cost that matches group size.",
          axis: "trade",
          correct: true,
          note: "True. The complexity is the price of avoiding both extremes.",
        },
        {
          text: "Pull for large channels means members see a post after their next fetch rather than instantly, unless a light push hint prompts them.",
          axis: "trade",
          correct: true,
          note: "True. A small notification can say 'new post' while the body is fetched.",
        },
        {
          text: "Pull for large channels makes storage grow with the number of members.",
          axis: "trade",
          correct: false,
          note: "One copy is stored per channel. That is the point of pull.",
        },
        {
          text: "With all-push, one 500,000-member post during a midnight wave can saturate gateways and delay small chats too.",
          axis: "failure",
          correct: true,
          note: "True. Fan-out work competes with ordinary messages for the same capacity.",
        },
        {
          text: "A member who is offline for a day loses posts from a pull-based channel.",
          axis: "failure",
          correct: false,
          note: "The log keeps the posts, and the member's cursor fetches the missing range.",
        },
        {
          text: "Measure fan-out writes per second by group-size bucket, and the delay from send to last delivery.",
          axis: "measure",
          correct: true,
          note: "True. These show where the big groups hurt.",
        },
        {
          text: "The average delivery time across all groups proves large channels are healthy.",
          axis: "measure",
          correct: false,
          note: "Small chats dominate the average and hide slow big-channel deliveries.",
        },
      ],
    },
    {
      id: "sd-design-chat-presence",
      scenario:
        "A chat app with 20 million users on at once wants a green 'online' dot beside each contact. Naively, each device sends a heartbeat every 5 seconds and a change event goes to every friend. Average user has 200 contacts, and many open the app every few minutes for seconds at a time. The presence service is overloaded. What should change?",
      options: [
        {
          label: "Keep a TTL key per user refreshed by heartbeats, and publish presence only to contacts who currently have the user's chat open or visible",
          appeal:
            "Cheap expiry for crashed apps, and fan-out is limited to people who can see the dot.",
        },
        {
          label: "Broadcast every online and offline change to all 200 contacts immediately",
          appeal:
            "Always accurate and simple to reason about.",
        },
        {
          label: "Write each heartbeat to the main message database so presence is durable",
          appeal:
            "One store for everything and presence survives restarts.",
        },
        {
          label: "Drop presence and show last seen once a day",
          appeal:
            "Removes the load entirely.",
        },
      ],
      best: 0,
      verdict:
        "Presence is soft state that can be rebuilt from the next heartbeat, so a TTL key in memory is right. The load comes from fan-out multiplied by flapping users, so send updates only to contacts who can see them. Broadcasting to 200 contacts multiplies every blip, writing heartbeats to the message store buries it, and removing presence drops a feature rather than fixing the design.",
      claims: [
        {
          text: "You accept that presence can be a few seconds stale, in return for far fewer updates.",
          axis: "trade",
          correct: true,
          note: "True. A green dot does not need exactness, which is what makes cheap approaches work.",
        },
        {
          text: "Limiting updates to contacts who can see the dot cuts the fan-out multiplier without changing what any user sees.",
          axis: "trade",
          correct: true,
          note: "True. Updates nobody is looking at are wasted work.",
        },
        {
          text: "Making presence durable in the main database improves accuracy.",
          axis: "trade",
          correct: false,
          note: "Durability adds cost, and a restarted service can rebuild presence from new heartbeats.",
        },
        {
          text: "If the presence store loses data, users appear offline until their next heartbeat, which is a brief and harmless error.",
          axis: "failure",
          correct: true,
          note: "True. Soft state recovers by itself.",
        },
        {
          text: "A phone that crashes without saying goodbye stays shown as online forever.",
          axis: "failure",
          correct: false,
          note: "The TTL expires after a few missed heartbeats, so the dot goes grey.",
        },
        {
          text: "Count presence events published per second and the share that reach a viewer who had the contact on screen.",
          axis: "measure",
          correct: true,
          note: "True. A low viewed share shows wasted fan-out.",
        },
        {
          text: "Total connected users is the metric that shows whether presence is overloaded.",
          axis: "measure",
          correct: false,
          note: "Connections show size. Overload shows in events per second and fan-out delay.",
        },
      ],
    },
  ],
};

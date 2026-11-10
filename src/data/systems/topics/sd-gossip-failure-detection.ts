import type { Topic } from "../../types.ts";

export const sdGossipFailureDetection: Topic = {
  id: "sd-gossip-failure-detection",
  title: "Gossip and failure detection",
  tier: 4,
  week: 8,
  depth: "deep",
  summary:
    "Why 'dead' is only a guess, how heartbeats and phi-accrual turn silence into suspicion, and how gossip and SWIM spread membership without a central list.",
  why: "Every distributed system must decide which machines are alive, and it can only guess. Guess too fast and healthy nodes are evicted, triggering expensive data movement. Guess too slowly and users wait on a corpse. Gossip protocols, as in Cassandra and Consul, let large clusters share that judgement without a central server. You need the vocabulary, the numbers, and the trade-offs between detection speed and false alarms. Traed has one such detector of its own: a watchdog on the tick feed.",
  algorithms: [
    {
      name: "Heartbeat with timeout",
      role: "The simplest detector: a node is suspected when no heartbeat has arrived within a fixed period.",
    },
    {
      name: "Phi-accrual failure detector",
      role: "Turns the history of heartbeat gaps into a suspicion number that grows with silence, so the threshold adapts to the network.",
      dsa: "sliding-window",
    },
    {
      name: "Epidemic (gossip) dissemination",
      role: "Each node repeatedly shares what it knows with a random peer, so news reaches the whole cluster in about log N rounds.",
    },
    {
      name: "SWIM membership",
      role: "Pings one random member per round, asks other members to check it indirectly, and only then declares it dead.",
    },
  ],
  learn: {
    intuition:
      "You are waiting for a friend at a station. She said she would text when her train arrived, and she has not. Is the train late, is her phone dead, or has something gone wrong? You cannot tell from silence alone. If you give up after five minutes you will often be wrong, because trains run late. If you wait two hours, you will stand in the cold long after she has gone home. A sensible person watches how late her trains usually are and gets more worried as the silence grows beyond that. She also asks a mutual friend, in case your own phone is the one failing. Large groups do the same. Nobody keeps a master list. Each person occasionally tells a few random others who seems to be missing, and within a few rounds everyone has heard. Being declared missing is a judgement made from silence and rumour, and it can be wrong.",
    mechanics: [
      {
        heading: "Heartbeats, and why 'dead' is a guess",
        body: "A heartbeat is a small message sent at a regular interval to say 'I am alive'. A fixed-timeout detector suspects a node when none arrives within a set period. The trouble is that a slow node, a long pause and a crashed node all look the same from outside: silence. Take a 3-second timeout. It catches a real crash in 3 seconds but also condemns a healthy node that stalls for 5 seconds in a garbage-collection pause. A 60-second timeout avoids that but leaves clients waiting for a minute on a dead machine. No timeout is both fast and always right, which is the same difficulty that FLP expresses for consensus.",
      },
      {
        heading: "Phi-accrual: suspicion as a number",
        body: "A phi-accrual detector, from the Hayashibara paper and used by Cassandra and Akka, keeps a sliding window of recent gaps between heartbeats and asks how unlikely the current silence is. It outputs phi, which grows as silence lengthens. A phi of 1 means about a 10 percent chance the node is merely late, 2 about 1 percent, 8 about one in a hundred million. Under a simple model where the mean gap is 1 second, phi reaches 8 after about 18 seconds of silence. Cassandra's default threshold is 8. On a jittery network the learned gaps are wider, so the detector waits longer by itself, without anyone retuning a timeout.",
      },
      {
        heading: "Gossip dissemination",
        body: "In all-to-all heartbeating every node pings every other, so 1,000 nodes send about a million messages a second at one ping per second each. Gossip replaces that. Every second, each node picks a random peer and exchanges what it knows, including a heartbeat counter for each member. The receiver keeps the higher counter, so merging is just taking the maximum. News spreads like an epidemic: the number of informed nodes roughly doubles per round at first, so a cluster of 1,000 is reached in about 17 rounds. Each node sends a constant one or two messages per second no matter how large the cluster grows. The cost is that spread is probabilistic and a little slower than a broadcast.",
      },
      {
        heading: "SWIM membership, suspicion and flapping",
        body: "SWIM, used in Consul and Serf, separates detection from spreading. Each round a node pings one random member. If there is no reply, it asks k other members, say 3, to ping that member for it. This indirect probe means a bad link between just two machines does not condemn a healthy node. If all fail, the member is marked suspect, not dead, and has a suspicion period in which it can answer, bumping an incarnation number to refute the rumour. Only then is it declared dead. Updates ride along on the ping messages. Flapping is a node repeatedly suspected and cleared; damping, longer suspicion and slower reaction to repeated changes calm it.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no cluster, so there is no membership to gossip about. It does have one failure detector. The tick-feed watchdog in the engine checks every 20 seconds, and force-reconnects if no tick has arrived for 60 seconds during market hours. That is a fixed timeout, made safe by two choices: it only judges silence when the market is open, since silence overnight is normal, and it looks at the whole feed, not one quiet instrument. Gossip or phi-accrual would matter if we ran many engine workers that had to notice each other's death.",
      },
    ],
    complexityDerivation:
      "Failure detection rests on an impossibility: in an asynchronous network you cannot tell a crashed node from a slow one, so every detector has two error rates that trade against each other. A short timeout detects crashes quickly but raises false positives; a long one is accurate but slow. Phi-accrual does not escape that trade, it makes the setting adaptive and explicit as a threshold. Gossip's argument is about scale. If each node tells one random peer per round, the count of informed nodes about doubles each round until most are informed, so spread takes on the order of log N rounds, while all-to-all costs on the order of N squared messages. The invariant that makes this safe is that state merges by taking the larger version, so repeated or reordered messages do no harm. The argument stops holding when messages are lost in bulk, when the cluster is partitioned so that each side believes the other dead, and when a wrong 'dead' triggers costly action. Detection is then fine but the reaction to it has to be damped.",
    variants: [
      {
        name: "Fixed-timeout heartbeat",
        when: "A small cluster, or one central monitor, where a simple rule is easier to reason about than adaptive maths.",
        delta:
          "One threshold that is easy to explain and easy to set wrong. ZooKeeper session timeouts and Kubernetes node monitoring work this way, with a tens-of-seconds grace period.",
      },
      {
        name: "Phi-accrual with gossip (Cassandra, Akka)",
        when: "A peer-to-peer cluster on a network whose delays vary, where no single timeout suits every pair of nodes.",
        delta:
          "Each node learns its own picture of every peer's heartbeat rhythm and outputs a continuous suspicion level, so the threshold means the same on a fast link and a slow one.",
      },
      {
        name: "SWIM (Consul, Serf, many service meshes)",
        when: "Thousands of members, where per-node load must stay constant and a single bad link must not cause an eviction.",
        delta:
          "Randomised probing with indirect checks and a suspicion stage. Constant load per node and detection within a bounded number of rounds, at the price of probabilistic spread.",
      },
    ],
    tradeoffs: [
      {
        vs: "Fast detection versus few false alarms",
        pick: "Slower detection when a wrong 'dead' triggers expensive work",
        because:
          "If declaring a node dead starts copying hundreds of gigabytes, a 10-second false alarm is costly. Detect quickly but delay the expensive reaction, so a node that comes back costs nothing.",
      },
      {
        vs: "Gossip versus a central membership service",
        pick: "A central service up to a few dozen nodes, gossip beyond that",
        because:
          "A central service such as etcd gives one consistent view and is simple to reason about. Gossip scales without a coordinator and has no single point of failure, but the view is eventually consistent and can differ between nodes for a few rounds.",
      },
      {
        vs: "Automatic eviction versus alerting a human",
        pick: "Automatic for stateless nodes, alert-first for nodes holding unique data",
        because:
          "Removing a stateless web server is cheap to undo. Evicting a node that holds the only copy of something, or restarting a trading engine with open positions, deserves a second look before it becomes an action.",
      },
    ],
  },
  realWorld: [
    {
      system: "Apache Cassandra",
      kind: "industry",
      problem:
        "A ring of many nodes must know which peers are up so that it can route requests and avoid hinted writes to dead nodes, with no central master.",
      applied:
        "Cassandra's gossip protocol runs every second, each node exchanging state with up to three others, and a phi-accrual failure detector on the heartbeats decides when a peer is down. The documented default threshold is a phi of 8, and operators raise it on networks with high or variable delay.",
      evidence: "Apache Cassandra documentation: gossip and the phi_convict_threshold setting",
      impact:
        "Every node reaches a similar view of the ring without a coordinator, and the detector adapts to noisy networks instead of using one fixed timeout.",
    },
    {
      system: "Amazon Dynamo",
      kind: "industry",
      problem:
        "A key-value store serving a shopping cart must keep working while nodes are added, removed or failing, and cannot depend on a central membership server.",
      applied:
        "The Dynamo paper describes a gossip-based protocol in which each node periodically contacts a random peer and the two reconcile their membership histories. Failure detection is local: a node simply stops sending to a peer that does not answer and routes around it.",
      evidence: "DeCandia et al., Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)",
      impact:
        "No component whose failure can blind the whole cluster, with the cost that nodes may briefly disagree about who is a member.",
    },
    {
      system: "HashiCorp Consul and Serf",
      kind: "industry",
      problem:
        "Service discovery for thousands of agents needs failure detection whose network cost does not grow with every node added.",
      applied:
        "Serf and Consul use the memberlist library, an implementation of SWIM with refinements. Agents probe random peers, use indirect probes before suspecting, and carry membership updates on the same messages. Later versions added a mechanism named Lifeguard to reduce false alarms from an overloaded node.",
      evidence: "Das, Gupta, Motivala, SWIM (DSN 2002); HashiCorp memberlist and Lifeguard documentation",
      impact:
        "Constant message load per agent and fewer wrongly evicted nodes when a machine is merely busy.",
    },
    {
      system: "Traed tick-feed watchdog",
      kind: "yours",
      problem:
        "The broker feed once went silent while the engine looked healthy, because a connection can stay open and deliver nothing.",
      applied:
        "A single watchdog in the engine checks every 20 seconds. It reconnects when the socket is down and force-reconnects when no tick has arrived for 60 seconds during market hours. Reconnect delays back off to a cap and never give up for good.",
      evidence: "docs/LLD.md section on the reconnect and stale-tick watchdog; strategy-engine/app/services/data_processing/websocket_service.py; docs/postmortems/2026-08-26-tick-feed-outage.md",
      impact:
        "Silence is judged only when ticks are expected, so a quiet evening is not mistaken for an outage, and a real stall is cleared within about a minute.",
    },
  ],
  insights: [
    {
      t: "Silence is not proof",
      d: "A crashed node, a paused node and a slow network all look identical from outside. Every detector is a guess with two error rates.",
    },
    {
      t: "Phi turns silence into a dial",
      d: "Instead of dead or alive, you get a suspicion level learned from past gaps. A phi of 8 means about a one in a hundred million chance the node is only late.",
    },
    {
      t: "Gossip keeps load constant",
      d: "All-to-all heartbeats cost N squared messages. Gossip costs a few messages per node per round, and news still reaches 1,000 nodes in about 17 rounds.",
    },
    {
      t: "Detect fast, react slowly",
      d: "Suspect quickly, then delay costly actions such as moving data. A node that returns in a minute should cost nothing.",
    },
  ],
  pitfalls: [
    "Using one fixed timeout everywhere. A value that suits a rack-local link is far too short across cities, and evicts healthy nodes whenever the network wobbles.",
    "Judging silence without context. An illiquid option strike, or any evening or weekend feed, is quiet by nature, so a detector must know when traffic is expected.",
    "Starting data movement the moment a node is declared dead. Under a flapping detector that creates a rebalancing storm worse than the failure it responded to.",
  ],
  quiz: [
    {
      q: "Why can a failure detector never be perfectly accurate in a real network?",
      options: [
        "Crashed nodes usually send a final message that is easily lost",
        "Heartbeats are always sent too rarely to be informative",
        "Detectors cannot run on the same machine as the node they watch",
        "A crashed node and a slow node both appear as silence",
      ],
      answer: 3,
      difficulty: "recall",
      why: "From outside, no heartbeat could mean a crash, a pause or a congested link. A detector must pick a point at which to guess, and every choice trades speed for false alarms.",
      distractors: [
        "Crashed nodes send nothing. The difficulty lies in telling them from nodes that are merely slow.",
        "Frequency can be raised, but a delayed or lost heartbeat still looks like a crash.",
        "Detectors normally run on other machines. Location is not the obstacle.",
        "",
      ],
    },
    {
      q: "What does a phi-accrual failure detector output?",
      options: [
        "A yes or no answer on whether a node is up",
        "A suspicion level that rises as heartbeat silence grows",
        "A ranked list of the nodes most likely to fail next",
        "The exact time at which a node crashed",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Phi is a continuous number computed from the history of heartbeat gaps. The application chooses a threshold, such as 8, at which to act, so the same detector can serve different needs.",
      distractors: [
        "A boolean is what a fixed timeout gives. Phi-accrual deliberately returns a level.",
        "",
        "It judges nodes already silent. It does not predict which will fail later.",
        "A detector sees only the absence of messages, so it cannot know the moment of a crash.",
      ],
    },
    {
      q: "A cluster has 1,000 nodes, and each node pings every other once per second. Roughly how many messages cross the network each second, and what is the fix?",
      options: [
        "About 1,000, and no fix is needed because that is small",
        "About 10,000, and the fix is to ping twice as often",
        "About one million, so move to gossip or SWIM with constant load per node",
        "About one million, so add a second network card to each node",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Each of 1,000 nodes sends 999 pings, close to 1,000,000 a second, which grows with the square of the cluster. Gossip or SWIM gives each node a small constant number of messages per second.",
      distractors: [
        "That counts one ping per node, ignoring that each node contacts all the others.",
        "The count is wrong, and pinging more often makes the load worse.",
        "",
        "Extra bandwidth only delays the problem, because the load still grows with the square of the size.",
      ],
    },
    {
      q: "Under SWIM, node A gets no reply to its ping of node B. What does A do before treating B as failed?",
      options: [
        "Asks a few other members to ping B, then marks it suspect and waits",
        "Marks B as dead at once and tells every member in the cluster",
        "Waits for B to contact it, since gossip will repair the silence",
        "Reboots itself in case its own network is the fault",
      ],
      answer: 0,
      difficulty: "apply",
      why: "SWIM's indirect probe, through k other members, shows whether the problem is the link between A and B. Only if those also fail does B become suspect, with time to refute before being declared dead.",
      distractors: [
        "",
        "Immediate death on one missed ping would evict healthy nodes whenever one packet is lost.",
        "Passive waiting would delay detection indefinitely, because B's silence is the very problem.",
        "Rebooting is far out of proportion. The indirect probe tests A's own link cheaply.",
      ],
    },
    {
      q: "A gossip cluster has a mean heartbeat gap of 1 second and a phi threshold of 8. Under a simple exponential model, about how long must a node be silent before it is convicted?",
      options: [
        "About 8 seconds, because phi counts seconds",
        "About 18 seconds, because 8 times the mean gap times 2.3",
        "About 80 seconds, because phi is multiplied by ten",
        "About 3 seconds, because three missed gaps is enough",
      ],
      answer: 1,
      difficulty: "apply",
      why: "In the exponential model phi equals silence divided by mean gap times ln 10 (about 2.3). Setting phi to 8 with a mean of 1 second gives 8 times 2.3, about 18 seconds.",
      distractors: [
        "Phi is logarithmic, not a count of seconds, so eight seconds would give a phi of only about 3.5.",
        "",
        "Phi grows more slowly than that. Multiplying by ten would be far too long.",
        "Three missed gaps give a phi of about 1.3, which is nowhere near the threshold of 8.",
      ],
    },
    {
      q: "A Mumbai broker's order gateway fleet uses a 3-second heartbeat timeout. During a 6-second garbage-collection pause on a healthy gateway, the load balancer removes it, and traffic then overloads the others. What would best reduce this?",
      options: [
        "A shorter timeout of one second, to detect the problem faster",
        "Removing the heartbeat check so that the gateway can never be removed",
        "A larger instance size, so the pause will not happen",
        "A suspicion stage with an adaptive or longer threshold before removal",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The gateway was healthy, so the fault is a false positive. A threshold that adapts to observed delays, with a suspect stage before removal, tolerates a short pause. A real crash is still caught within a bounded time.",
      distractors: [
        "A shorter timeout would remove it even sooner, and it makes false positives more frequent.",
        "Without any check, a really dead gateway would keep receiving orders.",
        "Size may reduce pauses but cannot remove them, and the detector would still be too eager.",
        "",
      ],
    },
    {
      q: "A storage cluster holds 200 GB per node and starts copying a dead node's data to others as soon as the detector convicts it. The detector flaps during busy hours. What is the sound judgement?",
      options: [
        "Delay the data copy for some minutes, so brief flaps cost nothing",
        "Make the detector faster so that real failures are handled much sooner",
        "Copy the data to every node so any node can be dropped safely",
        "Disable failure detection during busy hours entirely",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The detector may be right to suspect, but the reaction is what is expensive. Delaying the copy for several minutes lets a returning node resume at no cost and prevents a storm of unnecessary data movement.",
      distractors: [
        "",
        "A faster detector flaps more, and each flap triggers another heavy copy.",
        "Copying everywhere multiplies storage and traffic for no gain over a normal replication factor.",
        "Without detection, a real failure goes unnoticed in exactly the hours when load is highest.",
      ],
    },
    {
      q: "A team runs one monitoring process that pings five trading servers every 10 seconds and alerts a person after three misses. They propose replacing it with a gossip protocol 'to be more scalable'. What is the sound judgement?",
      options: [
        "Replace it, because gossip is always more reliable than a central check",
        "Replace it, and also add phi-accrual to every one of the five servers in turn",
        "Keep it; at five servers a central check is simpler and gossip solves a larger problem",
        "Keep it, but ping once a second so that gossip is never needed",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Gossip earns its keep at hundreds or thousands of nodes where all-to-all checking or a central monitor stops scaling. For five servers, the central check is easier to understand, debug and trust.",
      distractors: [
        "Gossip is not more reliable. Its views are eventually consistent and harder to reason about.",
        "More machinery for five servers adds failure modes with no benefit.",
        "",
        "Pinging more often raises false alarms. The issue is the proposed change, not ping frequency.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-gossip-failure-detection-feed-watchdog",
      scenario:
        "A small platform has one strategy engine on one server, receiving ticks for about 200 option symbols over a single broker WebSocket. NIFTY options near the money tick every second or two, while far strikes can go quiet for several minutes. The socket once stayed open while delivering nothing, and strategies traded blind. The market is open 09:15 to 15:30 IST, and nothing should trade on stale prices. How should the engine detect a dead feed?",
      options: [
        {
          label: "A watchdog on the whole feed: reconnect when no tick at all arrives for about a minute during market hours",
          appeal:
            "One simple rule, uses the busiest symbols as the heartbeat, and ignores quiet strikes and the evening.",
        },
        {
          label: "A per-symbol timeout of 5 seconds, reconnecting when any symbol is silent",
          appeal:
            "Catches problems instantly on each instrument.",
        },
        {
          label: "A phi-accrual detector per symbol with a threshold of 8",
          appeal:
            "Adapts to each symbol's own tick rhythm, so quiet and busy strikes are treated differently.",
        },
        {
          label: "Rely on the WebSocket library's ping and close events alone",
          appeal:
            "No custom code, and a closed connection is reported to the program.",
        },
      ],
      best: 0,
      verdict:
        "The failure to catch is a feed that is open but empty, and the whole-feed tick stream is a dense heartbeat when the market is open. A per-symbol timeout would reconnect constantly on quiet strikes, per-symbol phi adds machinery for no gain at this scale, and the library's ping proves the socket is up, not that ticks are flowing.",
      claims: [
        {
          text: "You accept up to about a minute of blindness in the worst case before the reconnect, in return for few false alarms.",
          axis: "trade",
          correct: true,
          note: "True. A threshold of 60 seconds is a deliberate balance between detection speed and needless reconnects.",
        },
        {
          text: "You gain simplicity: one threshold, easy to state and test, which a per-symbol design would multiply by 200.",
          axis: "trade",
          correct: true,
          note: "True. Fewer parameters mean fewer wrong settings.",
        },
        {
          text: "Per-symbol timeouts give the same safety at no extra cost.",
          axis: "trade",
          correct: false,
          note: "They cause reconnects whenever a far strike is legitimately quiet, which are costly because every reconnect resubscribes everything.",
        },
        {
          text: "A reconnect loop that gives up after a few tries can leave the engine blind for the rest of the day.",
          axis: "failure",
          correct: true,
          note: "True. This is why the loop backs off to a cap and keeps retrying.",
        },
        {
          text: "An open socket with a healthy ping means ticks are flowing.",
          axis: "failure",
          correct: false,
          note: "The ping is answered by the connection endpoint, which can be alive while delivering no data.",
        },
        {
          text: "Count forced reconnects per day and the longest silence seen during market hours.",
          axis: "measure",
          correct: true,
          note: "True. Rising forced reconnects point to a flaky feed or a threshold that is too tight.",
        },
        {
          text: "The number of symbols subscribed shows whether the feed is alive.",
          axis: "measure",
          correct: false,
          note: "Subscriptions can be acknowledged while no ticks arrive.",
        },
      ],
    },
    {
      id: "sd-gossip-failure-detection-large-fleet-membership",
      scenario:
        "An e-commerce company runs a fleet of 1,200 cache and storage nodes for a festival sale in India. Each node must know which peers are alive, and the team currently has every node heartbeat every other node once per second. The network team reports the control traffic is a significant fraction of the load, and growing as nodes are added for the sale. There is no spare coordination cluster. What should membership use?",
      options: [
        {
          label: "A SWIM-style gossip protocol: random probes, indirect checks, a suspect stage, updates piggybacked on probes",
          appeal:
            "Constant messages per node whatever the fleet size, and fewer false evictions from a single bad link.",
        },
        {
          label: "Keep all-to-all heartbeats and buy more network capacity",
          appeal:
            "No design change and the failure picture stays exact.",
        },
        {
          label: "One central server that every node pings, and which publishes the list",
          appeal:
            "Cheap in messages and gives one consistent view.",
        },
        {
          label: "Lengthen the heartbeat interval to once a minute",
          appeal:
            "Cuts traffic sixty-fold with a single setting change.",
        },
      ],
      best: 0,
      verdict:
        "All-to-all costs about 1.4 million messages a second at 1,200 nodes and rises with the square of the fleet, so capacity only postpones the problem. SWIM keeps per-node load constant and detection time bounded. A single central monitor becomes a single point of failure and a bottleneck, and a one-minute interval makes real failures take about a minute to notice during the peak.",
      claims: [
        {
          text: "You accept an eventually consistent view of membership, where two nodes may disagree for a few rounds.",
          axis: "trade",
          correct: true,
          note: "True. That is the price of removing the coordinator.",
        },
        {
          text: "You gain per-node network load that stays the same when the fleet grows from 1,200 to 2,400 nodes.",
          axis: "trade",
          correct: true,
          note: "True. Each node probes one member per round, regardless of cluster size.",
        },
        {
          text: "Gossip gives every node an identical, instant view of failures.",
          axis: "trade",
          correct: false,
          note: "It is probabilistic and takes on the order of log N rounds, so views converge rather than being instant.",
        },
        {
          text: "A broken link between only two nodes can cause a false eviction unless indirect probes through other nodes are used.",
          axis: "failure",
          correct: true,
          note: "True. Indirect probing is what stops one bad pair from convicting a healthy node.",
        },
        {
          text: "Moving to a central monitor removes the single point of failure that all-to-all had.",
          axis: "failure",
          correct: false,
          note: "All-to-all had none. A central monitor introduces one, and its failure blinds the whole fleet.",
        },
        {
          text: "Measure how many rounds it takes for a deliberate node kill to be known fleet-wide, and the false-suspicion rate.",
          axis: "measure",
          correct: true,
          note: "True. Both are the real quality measures of a gossip detector, speed and accuracy.",
        },
        {
          text: "Total control-plane bytes per second alone shows whether detection works.",
          axis: "measure",
          correct: false,
          note: "Low traffic is a goal, not proof that failures are detected correctly.",
        },
      ],
    },
    {
      id: "sd-gossip-failure-detection-rebalance-storm",
      scenario:
        "A storage cluster of 60 nodes holds about 200 GB per node. Its failure detector uses a fixed 3-second timeout. During busy hours some healthy nodes pause for 5 to 8 seconds in garbage collection and are declared dead, which starts copying their data to other nodes, increasing load and causing more pauses. The team wants to stop these rebalance storms but still react to real crashes. What should they change?",
      options: [
        {
          label: "Raise the timeout to 60 seconds",
          appeal:
            "One line of configuration, and pauses of 8 seconds no longer count.",
        },
        {
          label: "Use an adaptive detector with a suspect stage, and delay data movement for some minutes after conviction",
          appeal:
            "Detects crashes in bounded time but makes a brief pause free of cost.",
        },
        {
          label: "Turn off automatic re-replication and have an engineer approve every copy",
          appeal:
            "Removes the storms entirely.",
        },
        {
          label: "Add more nodes so that each holds less data",
          appeal:
            "Smaller nodes mean smaller copies when one is declared dead.",
        },
      ],
      best: 1,
      verdict:
        "The expensive part is the reaction, not the suspicion. An adaptive detector reduces false convictions, and delaying the copy by minutes makes any remaining false alarm harmless, while a real crash is still repaired shortly after. A 60-second timeout slows real detection for every failure, a manual approval step is slow and error-prone at 03:00, and more nodes shrink each copy but do not stop the cascade.",
      claims: [
        {
          text: "You accept that after a real crash, replication is restored a few minutes later than it could be.",
          axis: "trade",
          correct: true,
          note: "True. The delay is the price for not reacting to pauses.",
        },
        {
          text: "You accept that data is at lower redundancy during the delay window.",
          axis: "trade",
          correct: true,
          note: "True. With one fewer replica for those minutes, a second failure in that window is more dangerous.",
        },
        {
          text: "A 60-second timeout costs nothing, because real crashes are rare.",
          axis: "trade",
          correct: false,
          note: "It delays detection of every real crash by up to a minute, during which requests to that node time out.",
        },
        {
          text: "A pause longer than the delay window still triggers copying, so the window must exceed the longest pauses seen.",
          axis: "failure",
          correct: true,
          note: "True. The window is only useful if it is set from observed pause lengths.",
        },
        {
          text: "Once copying starts, stopping it is free, because the data is only copied, not moved.",
          axis: "failure",
          correct: false,
          note: "Copying consumes disk and network, and cancelling halfway still leaves wasted work and extra load during busy hours.",
        },
        {
          text: "Count false convictions per day, meaning nodes declared dead that returned, and the rebalance bytes moved per day.",
          axis: "measure",
          correct: true,
          note: "True. The first shows detector quality, the second shows whether the storms have stopped.",
        },
        {
          text: "Average node CPU over the month shows whether storms are happening.",
          axis: "measure",
          correct: false,
          note: "A storm lasts minutes, and a monthly average hides it.",
        },
      ],
    },
  ],
};

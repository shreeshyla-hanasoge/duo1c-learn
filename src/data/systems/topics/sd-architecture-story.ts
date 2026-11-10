import type { Topic } from "../../types.ts";

export const sdArchitectureStory: Topic = {
  id: "sd-architecture-story",
  title: "Telling the architecture story",
  tier: 10,
  week: 20,
  depth: "deep",
  summary:
    "Explain a system in two minutes: audience, context, containers, one flow, two trade-offs and limits, with decisions written down and why-not answers ready.",
  why: "You built Traed, and you will explain it to engineers, investors and a possible co-founder, each of whom wants something different. Knowing the system is not the same as telling it. A good story has a fixed order, names the trade-offs you made on purpose, and states the limits before anyone asks, which is what earns trust. This lesson turns everything in the course into a two-minute script for Traed, a way to record decisions, and a method for answering 'why not X?' without bluster.",
  learn: {
    intuition:
      "Imagine giving a visitor directions to your house. You do not start with the plumbing. You say which city, then which neighbourhood, then which lane, and you mention the one landmark that matters, the temple at the corner. If the last turn is tricky, you say so before they get lost. A different visitor, say the electrician, needs different directions: which wall the meter is on. The house is the same. Telling an architecture story works the same way. You decide who is listening, give the big picture first, follow one real journey through it, name the one or two choices that shape everything, and say honestly where the house is small or cracked. People trust a guide who warns them about the tricky turn. They stop trusting one who pretends there is none. The whole thing should fit in about two minutes.",
    mechanics: [
      {
        heading: "Audience first: the same facts in a different order",
        body: "An engineer wants the mechanism and the failure modes: what breaks and what happens then. An investor wants to know what exists, what is risky, and what more money would change. A co-founder wants the decisions, the hard parts and who will do what. The facts are the same, but the order and the weight differ, and all three should hear the same honest limits. Traed's pitch folder is organised this way: separate documents for investors, customers and a co-founder candidate, each saying plainly what exists and what does not. Ask yourself before you speak: what is this person deciding, and what do they need to know to decide it?",
      },
      {
        heading: "The five-part shape, and the first two parts",
        body: "Use one order every time: context, containers, one flow, two trade-offs, limits. Context and containers are the first two levels of the C4 way of drawing systems: first the system among its users and outside systems, then the separate programs inside it. A calm speaking pace is about 130 words a minute, so two minutes holds roughly 260 words. For Traed, the first part could be: 'Traed lets a trader build a rule-based options strategy, test it on minute-level history, and run it on paper or live against a broker.' The second: 'It is three services around one database: a web app, a Python strategy engine, and serverless functions for dashboard ticks and option-chain data, with shared MySQL and Redis.'",
      },
      {
        heading: "One flow and two trade-offs",
        body: "Pick one real journey, not a tour of every box. For Traed it is one tick: the broker sends it over the engine's own WebSocket straight to the engine. The engine folds ticks into a one-minute candle, checks the rules when the candle closes, and a signal goes through the order manager to the broker in live mode or to a simulated fill in paper mode. Then name two choices. First, paper and live are the same executor with a different data source and order executor. Second, live trading runs in one process while backtests run in a separate pool with one worker. Say what each costs: one server is one point of failure.",
      },
      {
        heading: "Limits, decisions on paper, and answering why not X",
        body: "State limits before you are asked: one server, one daily user, minute bars, not high-frequency, not multi-region. A limit said first sounds like judgement; said second, it sounds like a confession. Keep decisions in short written records, called architecture decision records: title, context, decision, consequences and status, one page, never rewritten, only superseded. Traed's backup design lists what was rejected and why. For a challenge such as 'why not Kubernetes and Kafka?', use four beats: the constraint that decided it, what we gave up, what we would watch, and when we would change. This makes 'no' an engineering position, not defensiveness.",
      },
      {
        heading: "Saying it about Traed",
        body: "Traed lets a trader build rule-based options strategies, test them on minute-level history, and run them on paper or live with a broker. Three running parts share one database: a web app, a Python engine and a serverless feed relay for dashboards. One order's path is tick, one-minute candle, rules at candle close, order manager, then broker or simulated fill. Two choices: paper and live share one executor, and live trading runs in one process while backtests run in a separate pool of one worker. The cost is that one server is a single point of failure. Limits, before you ask: one server, one daily user, minute bars, not high-frequency, not multi-region. We would revisit when a second user's load makes the queue, or the single host, the problem.",
      },
    ],
    complexityDerivation:
      "The argument is that listeners decide quickly and remember little. A person hearing a system for the first time can hold about three or four new ideas, so the story gives them a frame first, which is context and containers, and then hangs one journey on that frame. A flow gives the listener a story they can retell. Two trade-offs are enough to show how you think without drowning the frame. Stating limits early works because it removes the listener's main fear, which is that something is being hidden, and it moves the conversation from suspicion to the question of when you would change. Written decision records hold the invariant that matters over time: the reason for a choice survives longer than the memory of the person who made it. The shape stops holding when the audience already knows the system, when they interrupt with specific questions, or when the decision is not yours to explain alone. Then answer the question asked, keep the same honesty, and return to the frame only if they lose the thread. A diagram or story that cannot be said aloud in two minutes is usually missing a decision.",
    variants: [
      {
        name: "The two-minute spoken script",
        when: "A first meeting with an investor, a co-founder or a senior engineer.",
        delta:
          "Five parts in a fixed order, around 260 words. It names one flow and two trade-offs, and it ends on limits. It trades depth for being remembered.",
      },
      {
        name: "The diagram walkthrough",
        when: "A design review, an engineer's first week, or a technical due-diligence session.",
        delta:
          "Context, then containers, then one component view, each as a picture you point to. Slower, but lets people ask where exactly a thing happens.",
      },
      {
        name: "The written decision record",
        when: "A decision that will be questioned again, or a team where people join over time.",
        delta:
          "One page per decision with context, decision, consequences and status. It is the story's memory, so the reason is not lost when the person moves on.",
      },
    ],
    tradeoffs: [
      {
        vs: "Leading with strengths and keeping limits for diligence",
        pick: "Stating limits in the same breath as the design",
        because:
          "A limit you volunteer is evidence of judgement. A limit the listener finds is evidence of something hidden, and it taints the strengths you listed.",
      },
      {
        vs: "A technology list as the architecture",
        pick: "A journey through the boxes with reasons",
        because:
          "A list of frameworks says what you used. A journey says why the boxes exist, which is the thing a listener can use to judge your decisions.",
      },
      {
        vs: "One long design document updated now and then",
        pick: "Short decision records plus a living overview",
        because:
          "A record is cheap to write when a decision is fresh and is hard to quietly rewrite. A long document drifts and tends to be read by nobody.",
      },
    ],
  },
  realWorld: [
    {
      system: "The C4 model for describing software architecture",
      kind: "industry",
      problem:
        "Teams draw architecture with different symbols at different levels of detail, so a listener cannot tell what a box means or how zoomed in the picture is.",
      applied:
        "Simon Brown's C4 model fixes four levels, system context, containers, components and code, and asks you to show one level at a time. Context shows the system among people and outside systems; containers shows the separately running programs and data stores.",
      evidence: "Simon Brown, the C4 model for visualising software architecture (c4model.com)",
      impact:
        "Both speaker and listener know how far in they are, which makes a two-minute walkthrough possible.",
    },
    {
      system: "Architecture decision records",
      kind: "industry",
      problem:
        "New team members see a design and cannot tell whether a choice was deliberate, and old arguments are reopened because nobody remembers why they ended.",
      applied:
        "Michael Nygard proposed keeping a short record per significant decision, with a title, the context, the decision, its consequences and a status. Records are numbered and are superseded by newer ones rather than edited, so the history stays readable.",
      evidence: "Michael Nygard, 'Documenting Architecture Decisions' (2011 blog post)",
      impact:
        "The reason for a decision survives staff changes, and a reversal becomes a new record, not a silent edit.",
    },
    {
      system: "Traed high-level design in context, container and flow views",
      kind: "yours",
      problem:
        "Three services, one database, a serverless edge and a single cloud server need to be explained without a tour of every file.",
      applied:
        "The high-level design document draws the system at context level, then as containers with their protocols, then as a deployment on one cloud server plus AWS, and finally as key flows such as the backtest path and the feed. The architecture overview also keeps a section of known gaps, so limits are recorded beside the design instead of being left to be discovered.",
      evidence: "docs/HLD.md and ARCHITECTURE.md (section 14, known latent issues)",
      impact:
        "The two-minute script can be assembled from existing diagrams, and each claim in it can be pointed at in a document.",
    },
    {
      system: "Traed backup design with its rejected options",
      kind: "yours",
      problem:
        "After a loss of data, the team needed a backup design that nobody would later quietly undo for convenience.",
      applied:
        "The design document says why the previous scheme failed, lists the facts the design relies on, describes three tiers, and ends with a section of non-goals and explicitly rejected options with the reason for each, such as relying on clean-up scripts for retention. That is the shape of a decision record, written before the code.",
      evidence: "docs/plans/backup-restore-design.md",
      impact:
        "A future reader can see not only what was chosen but what was considered and refused, which is what answers a 'why not X?' question.",
    },
  ],
  algorithms: [
    {
      name: "Layered zoom (C4 levels)",
      role: "Structures the explanation as context, then containers, then one flow, so each listener sees only as much detail as they need at that moment.",
    },
    {
      name: "Architecture decision record",
      role: "Captures each decision as context, choice and consequences in a short dated note, so the why-not-X answer survives after the people who made it have moved on.",
    },
  ],
  insights: [
    {
      t: "Audience first, order second",
      d: "Engineer, investor and co-founder want different things first. The facts are the same and so are the limits you state.",
    },
    {
      t: "Context, containers, one flow, two trade-offs, limits",
      d: "A fixed five-part order, about 260 spoken words for two minutes. One real journey beats a tour of every box.",
    },
    {
      t: "Say the limit before you are asked",
      d: "One server, one daily user, minute bars. A limit you volunteer reads as judgement; one the listener finds reads as concealment.",
    },
    {
      t: "A why-not answer has four beats",
      d: "The constraint that decided it, what you gave up, what you watch, and when you would change. That is an engineering position, not a defence.",
    },
  ],
  pitfalls: [
    "Reading out the technology list as if it were the architecture. A list of frameworks says what you used, not why the boxes exist.",
    "Claiming scale or availability you have not built. One detail that fails a check makes the listener doubt every other claim.",
    "Writing decisions only in chat or in your head. Within a few months nobody, including you, remembers what was rejected and why.",
  ],
  quiz: [
    {
      q: "What is the order of the five-part architecture story in this lesson?",
      options: [
        "Technology list, containers, deployment, trade-offs, roadmap",
        "Context, containers, one flow, two trade-offs, limits",
        "Strengths, context, containers, roadmap, funding",
        "Limits, trade-offs, one flow, containers, context",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The story moves from the widest view to a concrete journey, then to the choices behind it and the honest limits. Context and containers give the frame, and the flow hangs on it.",
      distractors: [
        "A technology list is the least useful opening, because it says what was used and not why.",
        "",
        "This starts with strengths only and ends with a funding ask. The limits and the trade-offs have no place.",
        "Reversing the order starts with detail and ends with the picture, so the listener has no frame for the limits.",
      ],
    },
    {
      q: "What does an architecture decision record contain?",
      options: [
        "A full copy of the source code for the decision",
        "A list of every meeting held about the decision",
        "A task list for who will implement the decision",
        "A title, the context, the decision, its consequences and a status",
      ],
      answer: 3,
      difficulty: "recall",
      why: "A decision record is short and fixed in shape: what the situation was, what was decided, what follows from it, and whether it still holds.",
      distractors: [
        "Code belongs in the repository. The record explains why, not how.",
        "Meeting histories are noise. The record keeps the reasoning, not the calendar.",
        "That is a project plan. A record can exist long after the work is finished.",
        "",
      ],
    },
    {
      q: "You have a two-minute slot and speak at about 130 words a minute. Roughly how many words should your script be?",
      options: [
        "About 260",
        "About 100",
        "About 700",
        "About 1,200",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Two minutes times 130 words is 260. A script of 700 or more would take five minutes or more at a calm pace, and the listener would lose the frame.",
      distractors: [
        "",
        "That would fill under a minute, which is too thin for five parts.",
        "That is more than five minutes of speech, and the extra is where listeners switch off.",
        "That is nine minutes or so, a different format altogether.",
      ],
    },
    {
      q: "An investor asks: 'What happens if your server dies in the middle of the market session?' Which answer fits the lesson?",
      options: [
        "'It is highly available, so that does not happen to us at all.'",
        "'It has never happened yet, so it is not really a concern for us.'",
        "'Single server. Here is what happens, what we accept, and when we change.'",
        "'Let me show you our strategy results instead, they are better.'",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A plain statement of the single point of failure, the consequence, the cost accepted and the trigger for change is credible. Claims of availability that do not exist fail the first follow-up question.",
      distractors: [
        "On one server this is not true, and the next question will show it.",
        "Absence of an event is not a design. It leaves the question unanswered.",
        "",
        "Changing the subject signals that the answer is unwelcome, and strategy results are not the question asked.",
      ],
    },
    {
      q: "A co-founder candidate asks which services share the database and where the live feed enters the system. Which diagram level answers this best?",
      options: [
        "Context, showing the system as one box among its users",
        "Component, showing the classes inside a single service",
        "Code, showing the function calls inside one file",
        "Container: the running programs, stores and protocols",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Containers are the separately running programs and data stores with the protocols between them, which is where 'which services share a database' and 'where the feed enters' are visible.",
      distractors: [
        "Context treats the system as one box, so the services and the database are not drawn at all.",
        "A component view looks inside one service and cannot show relationships between services.",
        "Function calls are far too detailed for this question and hide the big shapes.",
        "",
      ],
    },
    {
      q: "A slide for a small platform says: 'Scalable to millions of users.' It runs on one server for one daily user. Which rewrite follows the lesson?",
      options: [
        "'Enterprise-grade scale, ready for any load that comes.'",
        "'One server, one daily user; we know what saturates first.'",
        "'Scalable in principle, with the details on request later.'",
        "'Millions of users are only a matter of adding servers.'",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The rewrite states the real scale and shows the thinking about the first limit. The other lines either inflate the claim or hide it behind vagueness.",
      distractors: [
        "It repeats the inflated claim in a different phrase and invites a check you cannot pass.",
        "",
        "'On request' postpones the honesty. A listener reads it as a refusal to say.",
        "Adding servers is not enough when state, data and live positions have to stay consistent.",
      ],
    },
    {
      q: "A team of 30 engineers keeps reopening the same architecture argument because new joiners do not know why a choice was made. Which is the better remedy?",
      options: [
        "One-page decision records kept in the repository with the change",
        "A 60-page design document rewritten once every year",
        "Ask senior engineers to explain the history to each new joiner",
        "A chat channel where decisions are announced to everyone",
      ],
      answer: 0,
      difficulty: "judge",
      why: "A short record is cheap to write when the decision is fresh, travels with the code, and is superseded instead of edited. A long yearly document is out of date within weeks.",
      distractors: [
        "",
        "It is stale as soon as it is finished and hardly anyone reads it end to end.",
        "That depends on a few people being available and remembering correctly, which fails as the team grows.",
        "Chat is searchable only by luck and has no status, so a reversed decision is still sitting there.",
      ],
    },
    {
      q: "Asked 'why not Kubernetes and Kafka?', a founder runs one server for one daily user. Which reply is soundest?",
      options: [
        "'We will adopt both soon, since serious platforms always use them.'",
        "'Those tools are overengineering, and only big companies need them.'",
        "'At one user they cost more than they save. We give up scale-out; we add them later.'",
        "'We have not looked at them yet, but they are on our list.'",
      ],
      answer: 2,
      difficulty: "judge",
      why: "The answer names the constraint, the cost accepted and the trigger for change. It does not insult the tools or promise a change without a reason.",
      distractors: [
        "Promising adoption to look serious commits you to cost with no need, and shows you chose by fashion.",
        "Dismissing a tool class is an opinion and invites an argument. It does not explain your own constraint.",
        "",
        "Honest but empty. It tells the listener that no decision was made, which is weaker than a reasoned one.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-architecture-story-investor-slot",
      scenario:
        "You have two minutes with an angel investor who knows Indian F&O trading but not software. The platform runs on one cloud server for one daily user, trades on minute bars, and has a small AWS edge that feeds browser dashboards. The investor will ask 'how does it work, and can I rely on it?'. What do you say?",
      options: [
        {
          label: "Walk through all three services and the framework each one uses",
          appeal:
            "Thorough, and shows how much you built.",
        },
        {
          label: "Start with the list of technologies: PHP, Python, Lambda and DynamoDB",
          appeal:
            "Concrete, quick, and sounds technical.",
        },
        {
          label:
            "Say what it is for, follow one order through three boxes, name two trade-offs with their cost, then state the limits before being asked",
          appeal:
            "Gives a frame, a journey, shows judgement, and answers 'can I rely on it?' honestly.",
        },
        {
          label: "Lead with the strengths and keep the limits for later diligence",
          appeal:
            "Keeps the pitch positive and saves time.",
        },
      ],
      best: 2,
      verdict:
        "The investor is deciding how far to trust you, not how the code is organised. A frame, one journey and two reasoned trade-offs show judgement, and stating the single server, single user and minute-bar limits first answers 'can I rely on it?' before it is asked. A framework tour or technology list does not help a non-engineer decide anything. Saving limits for diligence lets the investor discover them, which damages the strengths you listed.",
      claims: [
        {
          text: "You give up some depth, since a two-minute story cannot cover every service in detail.",
          axis: "trade",
          correct: true,
          note: "True. The shape deliberately trades breadth for being remembered, and detail is available on follow-up.",
        },
        {
          text: "Volunteering limits makes the pitch weaker, because it hands the listener reasons to say no.",
          axis: "trade",
          correct: false,
          note: "It usually has the opposite effect. A limit you state shows judgement; one the listener discovers suggests concealment.",
        },
        {
          text: "Stating the single-server design means you must be ready to say what happens when it fails.",
          axis: "trade",
          correct: true,
          note: "True. Naming the limit invites the next question, and the honest answer is a consequence, a cost accepted and a trigger for change.",
        },
        {
          text: "If you overstate scale, a single follow-up question can expose it and lower trust in every other claim.",
          axis: "failure",
          correct: true,
          note: "True. Credibility is shared across statements, so one failed check lowers all of them.",
        },
        {
          text: "If the investor interrupts with a question, you should finish the script first so the order is not lost.",
          axis: "failure",
          correct: false,
          note: "Answer the question asked. The script is a tool for the listener, and ignoring an interruption is a worse failure than losing order.",
        },
        {
          text: "Whether the investor can repeat back what the system does and what its limits are, a day later.",
          axis: "measure",
          correct: true,
          note: "A good test of the story. If they can say it back, the frame and limits landed.",
        },
        {
          text: "How many technology names you managed to mention in two minutes.",
          axis: "measure",
          correct: false,
          note: "Counting names measures density, not understanding. Many names can leave the listener with no usable picture.",
        },
      ],
    },
    {
      id: "sd-architecture-story-decision-records",
      scenario:
        "A platform team has 30 engineers across five squads and gets two new joiners a month. Over eighteen months the argument about moving from one shared database to per-service databases has been reopened four times, each time because nobody recalls why the shared database was chosen. How should decisions be recorded from now on?",
      options: [
        {
          label:
            "One-page decision records in the repository: title, context, decision, consequences, status, superseded rather than edited",
          appeal:
            "Cheap when the decision is fresh, travels with the code, and shows the history of reversals.",
        },
        {
          label: "A single 60-page design document, rewritten once a year",
          appeal:
            "Everything in one place with a formal feel.",
        },
        {
          label: "Announce decisions in the team chat channel",
          appeal:
            "No tooling and everybody is already there.",
        },
        {
          label: "A wiki page that anyone may edit when things change",
          appeal:
            "Always current in principle, and easy to update.",
        },
      ],
      best: 0,
      verdict:
        "The problem is lost reasoning, with steady turnover and repeated reopening. A short record is written when the reasoning is fresh, sits beside the code, and is superseded instead of edited, so the history of reversals stays visible. A yearly large document is stale within weeks. Chat has no status and cannot be searched reliably. A freely edited wiki loses the old reasoning the first time someone tidies it.",
      claims: [
        {
          text: "You accept a small writing cost for each significant decision, in exchange for not losing the reasoning.",
          axis: "trade",
          correct: true,
          note: "True. A page per decision is the entire price, and it is paid when the context is clearest.",
        },
        {
          text: "Records mean decisions can never change.",
          axis: "trade",
          correct: false,
          note: "A record is superseded by a newer record. The point is that the reversal is visible, not that the choice is frozen.",
        },
        {
          text: "Writing the consequences, including the costs, is what makes a record useful later.",
          axis: "trade",
          correct: true,
          note: "True. The consequences section is what lets a future reader tell whether the original conditions still hold.",
        },
        {
          text: "If records are optional and rarely written, the team will still lose the reasoning for the decisions that matter most.",
          axis: "failure",
          correct: true,
          note: "True. Practices that depend on goodwill erode under deadlines, so the record should be part of reviewing the change.",
        },
        {
          text: "A record that is edited whenever the choice changes is the safest form of history.",
          axis: "failure",
          correct: false,
          note: "Editing erases the past. A superseding record keeps both the old reasoning and the new.",
        },
        {
          text: "How often a decision is reopened without citing its record, and how many joiners can find the reason for a choice in their first week.",
          axis: "measure",
          correct: true,
          note: "Correct. Both measure whether the record is actually doing its job of carrying the reasoning.",
        },
        {
          text: "The total number of pages of design documentation in the repository.",
          axis: "measure",
          correct: false,
          note: "Volume says nothing about whether anyone can find or trust a reason. Many stale pages can make things worse.",
        },
      ],
    },
    {
      id: "sd-architecture-story-why-not-kafka",
      scenario:
        "A technical co-founder candidate has read your design overview. The platform runs on one server for one daily user, on minute bars, with backtests in a one-worker process pool and the engine reading ticks over its own broker WebSocket, with a serverless relay for dashboards. They ask: 'Why not Kubernetes and Kafka? Isn't that how a serious platform is built?' You have a minute to answer. What do you say?",
      options: [
        {
          label: "'You are right. We will move to both as soon as we can.'",
          appeal:
            "Agrees with a respected view and signals ambition.",
        },
        {
          label: "'They are overengineering. Real engineers keep things simple.'",
          appeal:
            "Sounds confident and decisive.",
        },
        {
          label: "'We have not evaluated them yet; it is on the list.'",
          appeal:
            "Honest about the state of things and invites collaboration.",
        },
        {
          label:
            "'At one user and minute bars they add more to run than they remove. We give up scale-out and failover. We would add them when load or availability needs exceed one host.'",
          appeal:
            "Names the constraint, the cost accepted and the trigger for change.",
        },
      ],
      best: 3,
      verdict:
        "A why-not answer needs four beats: the constraint, what you give up, what you watch, and when you would change. Agreeing immediately shows no judgement of your own constraints, and attacking the tools turns a design question into an argument. Saying you have not evaluated them is honest but leaves the candidate with nothing to assess. The reasoned reply tells them how you decide, which is what they are really testing.",
      claims: [
        {
          text: "You are accepting no horizontal scale-out and no automatic failover, in exchange for far less to operate.",
          axis: "trade",
          correct: true,
          note: "True. Naming the two things given up is what makes the answer an engineering position.",
        },
        {
          text: "You are claiming that Kafka and Kubernetes are poor tools.",
          axis: "trade",
          correct: false,
          note: "The answer is about fit to this load, not about the tools. They are good tools for different constraints.",
        },
        {
          text: "The single host remains a single point of failure, so a failure during market hours stops everything until recovery.",
          axis: "failure",
          correct: true,
          note: "True and worth saying. Stating the consequence pre-empts the follow-up and shows the limit is understood.",
        },
        {
          text: "Adopting both early would remove all risk, since they are industry standards.",
          axis: "failure",
          correct: false,
          note: "They add new failure modes, such as misconfiguration and more moving parts, and each needs an owner. Standard is not the same as safe for a one-person team.",
        },
        {
          text: "The queue wait for backtests and the time since the last tick during market hours, as the signals that would trigger a change.",
          axis: "measure",
          correct: true,
          note: "Correct. These are named triggers that tie the answer to evidence, not to taste.",
        },
        {
          text: "How many popular open-source projects the stack contains.",
          axis: "measure",
          correct: false,
          note: "A count of popular tools measures fashion, not whether the system meets its load.",
        },
      ],
    },
  ],
};

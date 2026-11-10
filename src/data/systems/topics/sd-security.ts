import type { Topic } from "../../types.ts";

export const sdSecurity: Topic = {
  id: "sd-security",
  title: "Security: trust boundaries and secrets",
  tier: 6,
  week: 12,
  depth: "deep",
  summary:
    "Who is calling, what may they do, and what if a key leaks. Authentication, authorisation, secrets, least privilege, and why broker keys raise the stakes.",
  why: "Traed holds the keys to people's broker accounts, and a leaked order-capable token is not a data leak, it is someone else able to trade real money. Investors and a co-founder will ask how those credentials are protected, and 'we are careful' is not an answer. This lesson gives you the vocabulary: trust boundary, authentication versus authorisation, service-to-service identity, rotation and least privilege, and how to explain the choices Traed made at the design level.",
  learn: {
    intuition:
      "Think of a housing society in an Indian city. The guard at the gate asks who you are and checks the visitor register. That is authentication. Knowing you are a real visitor does not let you into every flat, though. You may go only to flat 304, because the resident said so. That is authorisation. The guard has a key to the lobby but not to any flat, which is least privilege. The master key in the office is changed whenever a guard leaves, which is rotation. Your visitor sticker is valid for one day, so a lost sticker is a small problem, not a permanent one. The gate is a trust boundary: inside it, people are treated differently from outside. Good security is not a bigger wall. It is deciding where the gates are, what each key can open, and how fast a lost key stops working.",
    mechanics: [
      {
        heading: "Authentication, authorisation and trust boundaries",
        body: "Authentication answers who is calling. Authorisation answers what that caller may do. Mixing them up causes the classic bug where a logged-in user asks for someone else's record by changing an id, and the system serves it because the login was valid. A trust boundary is any line where data passes from a less trusted place to a more trusted one, such as browser to server. Check at the boundary, and never accept an identity the client states about itself. In Traed's WebSocket layer, the subscribe step reads the user id from the connection record stored when the signed token was verified, not from the message body, so a client cannot subscribe as someone else.",
      },
      {
        heading: "Service-to-service identity: API key or signed token",
        body: "An API key is a shared secret that says which service is calling. It carries no user and does not expire by itself, so rotation is manual. A signed token such as a JWT carries claims, for example the user, an issuer and an expiry time, and the receiver verifies the signature without asking a database whether the token exists. The cost is revocation: a token stays valid until it expires. Traed uses both. A Laravel-issued token carries the user for user-scoped calls into the engine, and a shared key covers system jobs that belong to no user. The engine checks signature, expiry, issuer, and that the user exists.",
      },
      {
        heading: "Secrets: where they live, how they rotate, how they fail",
        body: "A secret is anything whose disclosure lets someone else act as you. Keep secrets out of source code, load them from the environment or a secret store, and design so that rotation is cheap: one place to change, no code edit. Decide how checks fail. A shared-secret check that skips when the secret is not configured silently lets everyone in, so the safe version rejects everything when the secret is missing, which is called failing closed. Compare secrets with a constant-time function so response timing leaks nothing. Traed's credentials endpoint for the feed bridge does exactly this: it refuses all requests if its token is not configured, and compares with a constant-time check.",
      },
      {
        heading: "Least privilege, and why broker credentials raise the stakes",
        body: "A read-only market-data key leaking is a nuisance. A broker access token that can place orders leaking means a stranger can trade the account, so the damage is capital, not data. The damage of any credential is roughly what it can do, times how long it lives, times how many places accept it. So reduce all three. Traed's credentials endpoint returns only the key and the day's token the feed needs, and leaves out the API secret. Broker tokens die at the next daily reset, and the endpoint reports them valid only if minted today. The login password and the one-time-code seed, which are long-lived, use an encrypted field, and several credential fields are hidden whenever a record is turned into JSON.",
      },
      {
        heading: "Saying it about Traed",
        body: "We separate who a person is from what a service may do. Users reach the web app with a session. The engine only accepts calls from our web app, carrying a signed user token or a service key, and it never faces end users. On the live feed, identity comes from a token checked at connect time, and the user id is taken from our own record, not from what the client sends. Broker tokens expire daily, and the bridge gets only the key and token it needs. The cost is a shared service key, which is hard to rotate. We run one trusted operator today, and we would review isolation and rotation again before a second person connects a broker.",
      },
    ],
    complexityDerivation:
      "The design principle is containment: no single compromised component, key or user should be able to do more than that component's job. A credential's damage is bounded by three things multiplied together: what it can do, how long it is valid, and how many places accept it. Each control cuts one factor. Least privilege cuts what it can do, short lifetimes cut how long, and one identity per service cuts how many places. Checking at every boundary, not only at the edge, means a breach of one layer does not open the rest. This holds as long as checks really are independent. It stops holding in four situations. One long-lived key is shared by many services, so a leak anywhere is a leak everywhere and rotation breaks them all together. Internal traffic is trusted because it is inside a network, so one foothold reaches everything. Authentication is mistaken for authorisation, so a valid login can read another user's data. And stateless tokens are used where instant revocation is needed, because they remain valid until they expire. In each case, shrink the privilege or the lifetime before adding another lock.",
    variants: [
      {
        name: "Shared API key",
        when: "A small number of trusted services, such as system jobs with no user attached.",
        delta:
          "Simple to implement and easy to leak. It names the service, not the person, does not expire, and every consumer must change together on rotation.",
      },
      {
        name: "Signed token (JWT)",
        when: "Calls made on behalf of a user between services.",
        delta:
          "Carries the user and an expiry, and is verified without a database lookup. Cannot be revoked before expiry unless you add a deny-list, so lifetimes should be short.",
      },
      {
        name: "Cloud identities and a managed secret store",
        when: "Many services and many engineers, where rotation must be automatic.",
        delta:
          "Each service gets its own role and short-lived credentials, and secrets are fetched at run time. Needs more set-up and a running service, but removes shared long-lived keys.",
      },
    ],
    tradeoffs: [
      {
        vs: "Server-side sessions",
        pick: "Signed tokens between services, sessions for the browser",
        because:
          "Services need to verify a caller without sharing a session store, and tokens do that. A browser benefits from a session cookie that the server can cancel at once.",
      },
      {
        vs: "A managed secret store from day one",
        pick: "Configuration held by the server, with a plan to move",
        because:
          "For one operator the store is more machinery than the risk justifies. Once there are several engineers, or a second user, the cost of manual rotation outweighs the set-up cost.",
      },
      {
        vs: "Asking the user to log in to the broker every morning",
        pick: "An unattended login that needs a stored one-time-code seed",
        because:
          "A scheduled early login keeps the feed and strategies ready. The price is a high-value secret that must be encrypted and tightly read. If that cost looks too high, the manual login is the safe alternative.",
      },
    ],
  },
  realWorld: [
    {
      system: "Zerodha Kite Connect login and daily token",
      kind: "industry",
      problem:
        "A third-party app needs to trade on a user's behalf without ever holding the user's password.",
      applied:
        "The user signs in at Zerodha. The app receives a short-lived request token, and exchanges it with a checksum built from its API secret for an access token. That access token stops working at a daily reset in the morning, so every day starts with a fresh login.",
      evidence: "Zerodha Kite Connect API documentation: login flow and session expiry",
      impact:
        "A stolen access token has a built-in lifetime of less than a day, which is least privilege applied to time.",
    },
    {
      system: "Broken object-level authorisation in APIs",
      kind: "industry",
      problem:
        "A user who is correctly logged in asks for another user's object by changing an id in the request.",
      applied:
        "OWASP lists broken object-level authorisation first in its API Security Top 10, because APIs expose object ids and many check only that the caller is logged in. The fix is an ownership check on every object access, done in a shared policy rather than in each endpoint.",
      evidence: "OWASP API Security Top 10 (2019 and 2023 editions), item API1",
      impact:
        "The most common serious API flaw is an authorisation gap, not a broken login.",
    },
    {
      system: "Traed live-feed WebSocket identity",
      kind: "yours",
      problem:
        "Browsers and the engine connect to a public WebSocket endpoint, and a client must not be able to read another user's subscriptions or pretend to be them.",
      applied:
        "The connect step verifies a signed per-user token, rejects bad ones with a 403 and a retry-after hint, and records a failure count for monitoring. It stores the connection with the user id from the verified token. The subscribe step then looks up that connection record and reads the user id from it, so the user id in a subscribe message is never trusted.",
      evidence:
        "CMS/Serverless/real-time-trading-websocket/src/handlers/connect.js and src/handlers/subscribe.js",
      impact:
        "Identity is established once, at the boundary, and every later step reuses it rather than asking the client again.",
    },
    {
      system: "Traed broker-credentials endpoint for the feed bridge",
      kind: "yours",
      problem:
        "The feed needs a broker key and a daily token for a given user, but the web app holds many more secrets than that.",
      applied:
        "The endpoint refuses every request if its service token is not configured, compares tokens in constant time, and returns only the key and the day's access token, with a flag that is true only if the token was minted today. A code comment records that the API secret is deliberately left out because the feed does not need it.",
      evidence: "CMS/trade-server/app/Http/Controllers/Api/BrokerCredentialsController.php",
      impact:
        "The feed receives the smallest credential that lets it work, and it goes stale by itself within a day.",
    },
  ],
  insights: [
    {
      t: "Authentication is who, authorisation is what",
      d: "A valid login proves identity. It does not prove the caller may touch a given record, so check ownership on every object.",
    },
    {
      t: "Never trust an identity the client states",
      d: "Establish the user once at the boundary, store it server-side, and read it from there on every later step.",
    },
    {
      t: "Damage is power times lifetime times reach",
      d: "Shrink what a credential can do, how long it lives and how many places accept it. Daily broker tokens do the second one for free.",
    },
    {
      t: "Fail closed",
      d: "If a secret is not configured, reject everything. A check that skips when the secret is missing is an open door that looks like a lock.",
    },
  ],
  pitfalls: [
    "Treating a valid login as permission. The user is who they say they are, but that does not make every record theirs.",
    "Using one long-lived shared key for many services. A leak anywhere is a leak everywhere, and rotation means changing every consumer at once.",
    "Relying on 'it is inside our network' as a security control. One foothold then reaches everything, so each service should still check who is calling.",
  ],
  quiz: [
    {
      q: "What is the difference between authentication and authorisation?",
      options: [
        "Authentication decides what a caller may do; authorisation proves who they are",
        "Authentication proves who the caller is; authorisation decides what they may do",
        "Both mean checking the password, one at the web layer and one at the database",
        "Authentication applies to users and authorisation applies only to services",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Authentication establishes identity. Authorisation applies rules to that identity. Many serious bugs come from doing the first and forgetting the second.",
      distractors: [
        "This swaps the two terms, which is a common slip because the words look alike.",
        "",
        "Passwords are only one way to authenticate. Authorisation is a separate decision made after identity is known.",
        "Both apply to users and to services. The split is about identity versus permissions, not about who the caller is.",
      ],
    },
    {
      q: "What does least privilege mean?",
      options: [
        "Give every service the same broad access so that it is easy to manage",
        "Encrypt everything with the strongest cipher available",
        "Block all traffic that comes from outside the company network",
        "Give each caller only the access it needs to do its job, and no more",
      ],
      answer: 3,
      difficulty: "recall",
      why: "Least privilege limits the damage of any one compromised key, because it can only do its own small job.",
      distractors: [
        "Broad shared access is convenient, and it is the opposite: one leak then opens everything.",
        "Encryption protects data at rest or in transit. It does not decide how much power a credential carries.",
        "Network blocking is one layer. Least privilege also applies to callers who are already inside.",
        "",
      ],
    },
    {
      q: "A client sends a subscribe message {action: subscribe, userId: 7, symbol: NIFTY}. The connection was authenticated earlier with a token for user 12. Which user id should the server use?",
      options: [
        "The user id from the server's own connection record, which is 12",
        "The user id in the message, which is 7, because the client knows best",
        "Whichever is smaller, to be on the safe side",
        "Reject the connection and ask the client to log in again",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Identity was established at connect time from a verified token. The message body is client-controlled data. Using the stored record means a client cannot subscribe as another user.",
      distractors: [
        "",
        "That lets any authenticated client act as any other user by editing a field, which is exactly the flaw to avoid.",
        "Neither rule has a basis in who the caller actually is, so it is arbitrary.",
        "A mismatch deserves a rejection of that request or a log entry, but the identity question is answered by the stored record, not by a forced new login.",
      ],
    },
    {
      q: "A service issues signed tokens that last 15 minutes. At 10:00 an employee's account is disabled. Their token was issued at 09:55. What is true?",
      options: [
        "It stops working at once, because signed tokens are checked in a database",
        "It stops working at 10:00, when the account is disabled by the admin",
        "It stays valid until about 10:10 unless a deny-list or user check exists",
        "It is valid for 24 hours, since that is the usual default value",
      ],
      answer: 2,
      difficulty: "apply",
      why: "A signed token is verified from its signature and expiry, with no lookup. So it lives until it expires at about 10:10. Short lifetimes, a deny-list, or checking that the user exists on each request reduce that window.",
      distractors: [
        "That describes server-side sessions. Verifying a signature involves no database call, which is the point of the design.",
        "The signature is still valid at 10:00. Nothing in the token knows the account was disabled.",
        "",
        "There is no universal default lifetime. The issuer chooses it, and here it is 15 minutes.",
      ],
    },
    {
      q: "An internal endpoint compares the caller's bearer token with a configured secret. On a new deployment the secret was left blank, and the code allows the request if the two strings are equal. A caller sends no token. What should the endpoint do?",
      options: [
        "Allow it, since an empty token equals an empty secret",
        "Reject every request when no secret is set, and log it",
        "Allow it but log a warning so someone notices soon",
        "Reject only callers that send a non-empty wrong token",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Two empty strings are equal, so an unconfigured secret becomes a free pass. Failing closed means a missing configuration rejects everything until fixed, which is a visible, safe failure.",
      distractors: [
        "This is the exact trap: equality of two empty values looks like a successful match.",
        "",
        "A warning does not stop the call. The first caller gets in before anyone reads the log.",
        "That blocks the wrong callers and still lets a request with no token through.",
      ],
    },
    {
      q: "A feed service asks for a user's broker credentials at 08:10. The stored access token was created yesterday at 15:00. Kite tokens expire at the next morning reset. What should the credential service report?",
      options: [
        "Valid, because nobody has revoked the token yet",
        "Valid, because it is under 24 hours old in total",
        "Valid, because the caller's service key was accepted",
        "Not valid for today, as it was minted before today",
      ],
      answer: 3,
      difficulty: "apply",
      why: "The broker invalidates tokens at the daily reset, so a token minted yesterday cannot be used today. Reporting a flag that is true only for tokens minted today stops the feed from trying a dead token.",
      distractors: [
        "Nobody revoked it, but the broker has expired it on its own schedule.",
        "A 24-hour rule would be wrong here, because the reset time, not the age, decides.",
        "Accepting the caller's key says who is asking. It says nothing about whether the token in the database still works.",
        "",
      ],
    },
    {
      q: "A nightly job with no human behind it must call an API that normally needs a user token. Which is the better design?",
      options: [
        "Copy a person's current user token into the job's settings file",
        "Let the job call the API with no authentication, as it is internal",
        "Give the job its own narrow service identity, rotated on a schedule",
        "Make the job log in using a named person's own password",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A job is not a person. A dedicated identity with limited reach can be revoked or rotated without touching any user, and it shows up as itself in logs. A copied user token expires and ties the job to one person.",
      distractors: [
        "It works until the token expires or the person leaves, and it makes the job act as that person.",
        "Internal does not mean trusted. One compromised host would then call everything freely.",
        "",
        "A personal password in a job is a long-lived, high-power secret in a place that is easy to leak.",
      ],
    },
    {
      q: "A team stores a one-time-code seed so that an early login runs without a human. A reviewer worries about the stored seed. Which is the soundest judgement?",
      options: [
        "Keep it, encrypted at rest and tightly readable, and review it later",
        "Remove it at once, since any stored secret is never acceptable",
        "Keep it in plain text on disk, since the server is private",
        "Keep it in the source repository so that it is versioned",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Automation has real value, and the seed is a high-value secret. The sound position is to accept the stored secret with controls and a review point. Removing it is also defensible, but not because of an absolute rule.",
      distractors: [
        "",
        "Absolute rules ignore the trade-off. The cost of manual logins is a real benefit forgone, and the control is to protect the secret, not never to have one.",
        "A private server reduces exposure but is one foothold from losing the seed, so a second layer is warranted.",
        "Source repositories are copied widely and keep history, which makes a leaked secret hard to retire.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-security-two-services",
      scenario:
        "A web app in PHP and an engine in Python run on one server. The engine listens on the loopback address and is also exposed through the web server on a separate subdomain for the app's calls. Some calls are made for a logged-in user. Nightly jobs are not tied to any user. The team is one engineer. How should the web app authenticate to the engine?",
      options: [
        {
          label: "No authentication, since both run on the same machine",
          appeal:
            "Nothing to build or rotate, and the engine is not meant for end users anyway.",
        },
        {
          label:
            "A short-lived signed user token for user-scoped calls, and a separate service key for system jobs",
          appeal:
            "The engine can check who the user is and what they own, and system jobs do not pretend to be a person.",
        },
        {
          label: "One shared password header on every call, for users and jobs alike",
          appeal:
            "A single mechanism, quick to write, and easy to remember.",
        },
        {
          label: "Mutual TLS with a private certificate authority for the two processes",
          appeal:
            "Strong identity for each side, and no shared secret in headers.",
        },
      ],
      best: 1,
      verdict:
        "Being on the same machine is not a boundary, because the engine is reachable through the web server too. The engine needs to know the user to enforce ownership, so user calls need a token that carries the user, while jobs need an identity of their own. One shared header cannot say which user, and mutual TLS adds certificate management that one engineer on one server is unlikely to keep healthy.",
      claims: [
        {
          text: "You accept a shared service key for system jobs, which is harder to rotate than a per-user token.",
          axis: "trade",
          correct: true,
          note: "True. A shared key names a service and does not expire by itself, so rotation is manual and every holder changes together.",
        },
        {
          text: "Signed user tokens let the engine enforce ownership without calling the web app for each request.",
          axis: "trade",
          correct: true,
          note: "True. The user is in the signed claims, which the engine verifies locally.",
        },
        {
          text: "Using two mechanisms makes the system less secure than using one.",
          axis: "trade",
          correct: false,
          note: "Two mechanisms match two different kinds of caller. One shared header would blur 'a user' and 'a job' into the same identity.",
        },
        {
          text: "A signed token is valid until it expires, so a disabled user may keep access for the token's lifetime unless the engine also checks the user.",
          axis: "failure",
          correct: true,
          note: "True. This is why tokens are short-lived, and why checking that the user still exists on each request narrows the window.",
        },
        {
          text: "If the service key is not configured on the engine, the engine should accept all system calls so that jobs keep running.",
          axis: "failure",
          correct: false,
          note: "That is failing open. A missing key must reject calls, because a job that fails loudly is better than an endpoint that is open.",
        },
        {
          text: "The rate of rejected requests by reason, such as bad signature, expired token and missing user.",
          axis: "measure",
          correct: true,
          note: "Correct. A rise in one reason shows what is going wrong, such as clock skew for expiries or an attack for signatures.",
        },
        {
          text: "The size of the token in bytes, as the main indicator of security health.",
          axis: "measure",
          correct: false,
          note: "Token size says nothing about whether the right people are being let in or kept out.",
        },
      ],
    },
    {
      id: "sd-security-shared-key-fleet",
      scenario:
        "A payments company has 40 services and 200 engineers. One long-lived API key is shared by 12 of the services to call an internal ledger. An engineer who had the key has just left. Audit asks how the company will know which service made a given call, and security wants a rotation that does not need a coordinated release. Which design do you choose?",
      options: [
        {
          label: "Keep the shared key and rotate it once a year during a maintenance window",
          appeal:
            "No change to the services and a predictable schedule.",
        },
        {
          label: "Put the services behind a private network and treat internal traffic as trusted",
          appeal:
            "The key becomes less necessary, and the network team already runs it.",
        },
        {
          label: "Store an encrypted file of keys in the shared repository, with a team password",
          appeal:
            "Versioned, searchable and available to everyone who needs it.",
        },
        {
          label:
            "Give each service its own identity and short-lived credentials from a managed secret store, rotated automatically",
          appeal:
            "Calls are attributable to one service, a leaver's access ends at once, and rotation needs no release.",
        },
      ],
      best: 3,
      verdict:
        "Audit needs per-service attribution, which a shared key cannot give, and security needs rotation without a coordinated release, which a manual yearly rotation cannot give. A private network does not say which service called. A team password on a file moves the single secret rather than reducing it. Per-service identities with short-lived credentials meet both needs at the cost of running a secret store.",
      claims: [
        {
          text: "You take on the work of running and securing a secret store and issuing identities.",
          axis: "trade",
          correct: true,
          note: "True. This is the price, and at 40 services and 200 engineers it is smaller than the cost of one shared key.",
        },
        {
          text: "Per-service identities make each call attributable to the service that made it.",
          axis: "trade",
          correct: true,
          note: "True. That directly answers the audit question, which a shared key cannot.",
        },
        {
          text: "Short lifetimes remove the need for any other control.",
          axis: "trade",
          correct: false,
          note: "Short lifetimes shrink the window, but scoping and monitoring still matter. No single control is enough.",
        },
        {
          text: "If the secret store is down and services cannot fetch credentials, new calls fail, so it must be highly available and credentials cached briefly.",
          axis: "failure",
          correct: true,
          note: "True. A central store becomes a dependency, and its failure mode must be designed, not discovered.",
        },
        {
          text: "The leaver can still use the old shared key after rotation, because rotation only affects new services.",
          axis: "failure",
          correct: false,
          note: "Rotation invalidates the old key for everyone. The risk with a shared key is the cost and coordination, not that the old value keeps working.",
        },
        {
          text: "Calls per service identity, and the age of the oldest credential still in use.",
          axis: "measure",
          correct: true,
          note: "Correct. The first checks attribution works, and the second shows rotation is actually happening.",
        },
        {
          text: "The number of engineers with access to the repository, as the sole measure of secret safety.",
          axis: "measure",
          correct: false,
          note: "Repository access is relevant to one path of leakage, but it does not measure credential age or attribution.",
        },
      ],
    },
    {
      id: "sd-security-feed-credentials",
      scenario:
        "A web app stores each user's broker login password, a one-time-code seed for an 08:30 unattended login, and the day's access token. A separate feed service needs to connect to the broker's market-data socket on behalf of a user. It needs only the broker key and the day's token. Tokens die at the next daily reset. Which design gives the feed what it needs?",
      options: [
        {
          label:
            "The feed calls the web app with a service token and gets only the key, the day's token and a flag that it was minted today",
          appeal:
            "The feed has the smallest credential it can work with, and it goes stale by itself within a day.",
        },
        {
          label: "Copy the user's full credentials, including password and seed, into the feed's configuration",
          appeal:
            "The feed could log in by itself if it ever needed to, and nothing depends on the web app.",
        },
        {
          label: "Send the day's token to each user's browser so the browser connects to the broker directly",
          appeal:
            "No server in the middle holds the feed, and it spreads the connections.",
        },
        {
          label: "Include the token in every tick message so each consumer has it",
          appeal:
            "Consumers can call the broker themselves whenever they like.",
        },
      ],
      best: 0,
      verdict:
        "The feed needs two values, so it should receive two values, not the whole credential set. Copying the password and seed makes every feed host a target for the most valuable secrets. Sending the token to browsers or inside every tick spreads a trading credential to many places and many logs. Fetching the minimal set from the owner of the secrets keeps the reach small and limits the lifetime to the day.",
      claims: [
        {
          text: "You accept a runtime dependency on the web app, so the feed cannot start if it is unreachable.",
          axis: "trade",
          correct: true,
          note: "True. The cost of keeping secrets in one place is that others must ask for them.",
        },
        {
          text: "You give up the feed being able to log in by itself, which is a deliberate limit.",
          axis: "trade",
          correct: true,
          note: "True. Without the password and seed the feed cannot mint tokens, which is exactly what keeps its power small.",
        },
        {
          text: "Passing the full credentials is safer because fewer network calls are made.",
          axis: "trade",
          correct: false,
          note: "Fewer calls do not offset many more places holding the most valuable secrets.",
        },
        {
          text: "If the feed host is compromised, the attacker gets a token that stops working at the daily reset.",
          axis: "failure",
          correct: true,
          note: "True. Short lifetime caps the damage, which is why only the day's token is handed over.",
        },
        {
          text: "A missing service token on the web app should return the credentials anyway, so the market feed never fails.",
          axis: "failure",
          correct: false,
          note: "That is failing open. A missing configuration must refuse the request, even at the cost of a visible feed outage.",
        },
        {
          text: "The count of credential requests per user per hour, and rejected requests for a bad service token.",
          axis: "measure",
          correct: true,
          note: "Correct. Unusual request rates or rejections for one user are an early sign of something wrong.",
        },
        {
          text: "The number of ticks delivered per second, as the measure of credential safety.",
          axis: "measure",
          correct: false,
          note: "Tick volume measures the feed's work, not whether credentials are being handed out safely.",
        },
      ],
    },
  ],
};

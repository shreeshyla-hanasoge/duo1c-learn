import type { FlowSpec } from "../kit/types";

/**
 * Design a chat system — the film for `sd-design-chat`.
 *
 * One message in conversation 42: an ack is lost and the sender retries,
 * then the recipient is offline and catches up from their last seq.
 */
export const sdDesignChat: FlowSpec = {
  id: "sd-design-chat",
  kicker: "System design · M10",
  title: "One message, from send to catch-up",
  nodes: [
    { id: "alice", role: "Sender", label: "Alice" },
    { id: "gw", role: "Holds sockets", label: "Gateway" },
    { id: "chat", role: "Assigns order", label: "Chat" },
    { id: "store", role: "Message log", label: "Store" },
    { id: "bob", role: "Recipient", label: "Bob" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "Order matters only inside one conversation, so each one counts its own messages: seq 1, 2, 3.",
      facts: { store: "conv 42 · last seq 1900" },
    },
    {
      seconds: 4.6,
      caption: "Alice sends over her open connection. The app gives the message its own id, m-77.",
      move: { from: "alice", to: "gw", label: "send m-77: hi", tone: "request" },
      facts: { alice: "sending m-77" },
    },
    {
      seconds: 4.6,
      caption: "The gateway only holds connections. The chat service owns order.",
      move: { from: "gw", to: "chat", label: "send m-77", tone: "request" },
      facts: { chat: "m-77 is new" },
    },
    {
      seconds: 5,
      caption: "The next number is handed out and the message is stored before anyone is told it worked.",
      move: { from: "chat", to: "store", label: "write seq 1901", tone: "commit" },
      facts: { store: "last seq 1901" },
    },
    {
      seconds: 5,
      caption: "The ack goes back, but the network drops it. Alice cannot tell whether the send worked.",
      move: { from: "chat", to: "gw", label: "ack seq 1901", tone: "fault" },
      facts: { alice: "no ack · timeout" },
    },
    {
      seconds: 5.4,
      caption: "Alice retries with the same id. The service has seen m-77, so it stores nothing new.",
      move: { from: "alice", to: "chat", label: "send m-77 again", tone: "request" },
      facts: { chat: "m-77 = seq 1901 · ignored", store: "still seq 1901" },
    },
    {
      seconds: 4.6,
      caption: "It answers with the original seq. The retry was safe, and Alice sees one tick.",
      move: { from: "chat", to: "alice", label: "ack seq 1901", tone: "reply" },
      facts: { alice: "✓ sent" },
    },
    {
      seconds: 5.4,
      caption: "Bob's phone has no open connection, so the push cannot be delivered. The message waits in the store.",
      move: { from: "chat", to: "bob", label: "push: no line", tone: "fault" },
      health: { bob: "down" },
      facts: { bob: "offline · has seq 1900", chat: "sends a phone alert" },
    },
    {
      seconds: 5.4,
      caption: "Bob reconnects and says the last seq he has. Nothing else needs to be tracked for him.",
      move: { from: "bob", to: "chat", label: "I have up to 1900", tone: "request" },
      health: { bob: "ok" },
      facts: { chat: "gap: 1901" },
    },
    {
      seconds: 5.4,
      caption: "The store replays the gap in order. Bob acks, and Alice's message turns delivered.",
      move: { from: "store", to: "bob", label: "replay seq 1901", tone: "commit" },
      facts: { bob: "has seq 1901", alice: "✓✓ delivered" },
    },
  ],
  takeaway: {
    line: "Retry until acked, ignore what you have seen.",
    sub: "A per-conversation seq plus a unique message id makes at-least-once look like exactly-once.",
    seconds: 5.5,
  },
  lesson: {
    title: "A message that is retried and replayed",
    watchFor:
      "Watch the seq under the Store and the m-77 line under the chat service. The retry never creates a second message, and Bob's catch-up starts from the number he last saw.",
  },
};

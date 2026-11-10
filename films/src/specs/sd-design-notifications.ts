import type { FlowSpec } from "../kit/types";

/**
 * Design a notification service — the film for `sd-design-notifications`.
 *
 * One OTP overtakes a campaign, an SMS gateway times out, retries back off,
 * the breaker trips and a backup provider sends it once.
 */
export const sdDesignNotifications: FlowSpec = {
  id: "sd-design-notifications",
  kicker: "System design · M10",
  title: "An OTP through a failing provider",
  nodes: [
    { id: "producer", role: "Sends events", label: "Producer" },
    { id: "intake", role: "Dedupe, prefs", label: "Intake" },
    { id: "queue", role: "Per channel", label: "SMS queue" },
    { id: "worker", role: "Calls provider", label: "Worker" },
    { id: "sms", role: "Main provider", label: "Gateway" },
    { id: "backup", role: "Second route", label: "Backup" },
  ],
  steps: [
    {
      seconds: 4.6,
      caption: "A marketing blast of 10 million messages is queued. A login code must still arrive in seconds.",
      facts: { queue: "bulk: 10M waiting" },
    },
    {
      seconds: 4.6,
      caption: "The producer sends the OTP with an event id it chose. The same id twice means one message.",
      move: { from: "producer", to: "intake", label: "OTP · event e-501", tone: "request" },
      facts: { intake: "e-501 is new" },
    },
    {
      seconds: 5,
      caption: "The OTP goes in the high-priority lane. It never waits behind the campaign.",
      move: { from: "intake", to: "queue", label: "high lane", tone: "commit" },
      facts: { queue: "high: 1 · bulk: 10M" },
    },
    {
      seconds: 4.6,
      caption: "Workers always serve the high lane first.",
      move: { from: "queue", to: "worker", label: "e-501", tone: "request" },
      facts: { queue: "high: 0 · bulk: 10M", worker: "attempt 1" },
    },
    {
      seconds: 5,
      caption: "The gateway does not answer in time. The text may or may not have been sent.",
      move: { from: "worker", to: "sms", label: "send SMS e-501", tone: "request" },
      health: { sms: "slow" },
      facts: { sms: "no reply", worker: "outcome unknown" },
    },
    {
      seconds: 5.4,
      caption: "The worker waits, then retries. Waits double and are randomised, so retries never arrive in a wave.",
      move: { from: "worker", to: "sms", label: "retry after 1 s", tone: "fault" },
      facts: { worker: "attempt 2 · wait 2 s" },
    },
    {
      seconds: 5.4,
      caption: "After repeated failures a circuit breaker opens. Stop hammering a provider that is down.",
      move: { from: "worker", to: "sms", label: "retry after 2 s", tone: "fault" },
      health: { sms: "down" },
      facts: { worker: "attempt 3 · breaker open" },
    },
    {
      seconds: 5,
      caption: "With the breaker open, the job goes to the backup provider.",
      move: { from: "worker", to: "backup", label: "send SMS e-501", tone: "request" },
      facts: { backup: "sending e-501" },
    },
    {
      seconds: 5,
      caption: "The backup confirms. The deliveries table now says e-501 is sent.",
      move: { from: "backup", to: "worker", label: "delivered", tone: "reply" },
      facts: { worker: "e-501 delivered", backup: "done" },
    },
    {
      seconds: 5.4,
      caption: "The first gateway wakes and says it sent the text too. The worker sees e-501 is done and ignores it.",
      move: { from: "sms", to: "worker", label: "late: sent e-501", tone: "reply" },
      health: { sms: "ok" },
      facts: { worker: "dup ignored" },
    },
  ],
  takeaway: {
    line: "Assume every send can happen twice.",
    sub: "Key each message, keep lanes apart, back off on failure, and fail over to a second route.",
    seconds: 5.5,
  },
  lesson: {
    title: "One OTP, one failing provider",
    watchFor:
      "Watch the line under the worker: attempt 1, attempt 2 with a longer wait, breaker open, then delivered. The campaign's 10M bulk queue is never touched.",
  },
};

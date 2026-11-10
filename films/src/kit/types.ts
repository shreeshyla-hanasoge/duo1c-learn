/**
 * A data-flow film is DATA: a row of nodes, and a list of steps that each
 * move one or two messages between nodes, change what a node knows, and say
 * one sentence. `FlowFilm` turns a spec into a video; a new topic is a new
 * spec file, not new animation code.
 *
 * The films play muted and looping inside a lesson, so every idea has to be
 * on screen: there is no voiceover to lean on. The limits on text length are
 * enforced by `scripts/check.mts`, because text that overflows a card is
 * invisible in a spec and obvious in a video.
 */

/** What kind of message is travelling. Drives the packet colour only. */
export type Tone =
  /** Something being asked for or sent onward. */
  | "request"
  /** An answer coming back. */
  | "reply"
  /** A fact that changes money, data or position: a write, a fill, a commit. */
  | "commit"
  /** Something going wrong: a timeout, a rejection, a lost message. */
  | "fault";

/** `down` = not answering. `slow` = answering late. Shown as a badge on the node. */
export type Health = "ok" | "slow" | "down";

export interface FlowNode {
  id: string;
  /** One word, two at most. Shown large. */
  label: string;
  /** What this box is, in two or three words. Shown small above the label. */
  role: string;
}

export interface Move {
  from: string;
  to: string;
  label: string;
  tone: Tone;
}

export interface FlowStep {
  /** How long the step stays on screen: 4 to 6. */
  seconds: number;
  /** The one sentence for this step. Two lines at most. */
  caption: string;
  /** The message that travels during this step. */
  move?: Move;
  /**
   * A second message travelling at the same time, on a lane above the first.
   * Use it for fan-out (one sender, two receivers) or a race; never just to
   * save a step.
   */
  alsoMove?: Move;
  /** What each node knows once this step has happened, keyed by node id. */
  facts?: Record<string, string>;
  /** A node going down, slowing, or recovering in this step. */
  health?: Record<string, Health>;
  /** The lifecycle state reached in this step (must be one of `states`). */
  state?: string;
}

export interface FlowSpec {
  /** The lesson's topic id. Also the composition id and the file name. */
  id: string;
  /** Small line above the title: "System design · M3". */
  kicker: string;
  title: string;
  /** Three to six, left to right in the order a message usually travels. */
  nodes: FlowNode[];
  /** A lifecycle shown as a row of chips. Omit for a film with no states. */
  states?: string[];
  /** What the chips are states OF: "Order state", "Breaker", "Replica". */
  statesLabel?: string;
  steps: FlowStep[];
  /** The closing card: the sentence to remember. */
  takeaway: { line: string; sub: string; seconds: number };
  /** How the lesson page introduces the film. */
  lesson: {
    /** The film's own title under the player. */
    title: string;
    /** One thing to watch for, which the lesson prose does not already say. */
    watchFor: string;
  };
}

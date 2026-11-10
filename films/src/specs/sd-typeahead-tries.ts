import type { FlowSpec } from "../kit/types";

/**
 * Typeahead and tries — the film for `sd-typeahead-tries`.
 *
 * "ni" is resolved by walking two trie nodes and reading a stored top-k list,
 * then cached by prefix. The turn is a name that rises after the overnight
 * build; a small live counter is merged in at query time.
 */
export const sdTypeaheadTries: FlowSpec = {
  id: "sd-typeahead-tries",
  kicker: "System design · M6",
  title: "Suggestions in two steps",
  nodes: [
    { id: "browser", role: "Types", label: "Browser" },
    { id: "cache", role: "Prefix cache", label: "Cache" },
    { id: "trie", role: "Prefix tree", label: "Trie" },
    { id: "live", role: "Last 5 minutes", label: "Counter" },
  ],
  steps: [
    {
      seconds: 4.8,
      caption: "Each node of the trie is a prefix, and it keeps a short list of its best completions.",
      facts: { trie: "built 02:00 · read-only" },
    },
    {
      seconds: 5,
      caption: "The user types n, i. The browser waits for a short pause, then sends one request, not two.",
      move: { from: "browser", to: "cache", label: "ni", tone: "request" },
      facts: { browser: "typed: ni · waited 150 ms", cache: "ni: miss" },
    },
    {
      seconds: 5.2,
      caption: "On a miss the trie takes two steps, n then i. It does not rank anything, it only reads the list.",
      move: { from: "cache", to: "trie", label: "ni?", tone: "request" },
      facts: { trie: "walk n → i · 2 steps" },
    },
    {
      seconds: 5,
      caption: "The node for ni already holds its best two, merged in advance from its children.",
      move: { from: "trie", to: "cache", label: "nifty 500, +1", tone: "reply" },
      facts: { trie: "nitin 80 left out", cache: "ni cached" },
    },
    {
      seconds: 4.6,
      caption: "The answer goes back to the browser, and the cache keeps it for the next person.",
      move: { from: "cache", to: "browser", label: "nifty, niftybees", tone: "reply" },
      facts: { browser: "shows 2 suggestions" },
    },
    {
      seconds: 4.8,
      caption: "Another user types ni. Short prefixes are asked by almost everyone, so this is a hit.",
      move: { from: "browser", to: "cache", label: "ni", tone: "request" },
      facts: { cache: "ni: hit · trie untouched" },
    },
    {
      seconds: 5.4,
      caption: "At noon a new name, niftyx, takes off. The overnight trie cannot know, so the list is stale.",
      move: { from: "cache", to: "browser", label: "stale list", tone: "fault" },
      facts: { browser: "niftyx missing", trie: "last build: 02:00" },
    },
    {
      seconds: 5.2,
      caption: "A small counter tracks the last few minutes of searches and spots the fast riser.",
      move: { from: "live", to: "cache", label: "niftyx +90 in 5 min", tone: "commit" },
      facts: { live: "rising: niftyx", cache: "merge overlay on read" },
    },
    {
      seconds: 5.2,
      caption: "At query time the riser is merged into the stored list. The trie waits for tonight's build.",
      move: { from: "cache", to: "browser", label: "nifty, niftyx, +1", tone: "reply" },
      facts: { browser: "niftyx now shown" },
    },
  ],
  takeaway: {
    line: "Do the ranking before the user types.",
    sub: "Store top results at every prefix, cache the short ones, and overlay what is rising today.",
    seconds: 5.5,
  },
  lesson: {
    title: "ni, nif, nifty",
    watchFor:
      "Watch the Cache line. The first ni is a miss and the trie answers in two steps. The second ni is a hit. At noon the stored list goes stale until the live counter is merged in.",
  },
};

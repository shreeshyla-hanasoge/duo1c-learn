import type { Topic } from "../types.ts";

export const tries: Topic = {
  id: "tries",
  title: "Tries",
  tier: 1,
  week: 10,
  depth: "core",
  summary: "Prefix search, autocomplete, word-break.",
  why: "The right structure for autocomplete and for any path-shaped hierarchy — including building a file tree from a flat list of paths, routing a URL, or matching an IP against a routing table. It answers a question a hash map cannot ask: 'what starts with this?'",
  complexity: "O(L) insert & search, where L is the key length",
  viz: ["trie"],
  learn: {
    intuition:
      "A hash map can tell you instantly whether the exact word 'delhi' is present. It cannot tell you what starts with 'del', because hashing scrambles the keys deliberately and 'del' hashes nowhere near 'delhi'. A trie fixes that by storing the shared structure instead of the whole keys. Each edge is one character, and the path from the root spells out a word. Everything beginning with 'del' therefore lives under one node — the one you reach by following d, then e, then l. Finding that node costs three hops regardless of whether the trie holds ten words or ten million, because you are walking the length of the query, not searching the collection. That is the whole idea: pay for the length of the key, not for the size of the dataset, and get every prefix relationship for free because the structure already encodes it.",
    mechanics: [
      {
        heading: "Each node holds a map from character to child node",
        body: "A node itself stores no word. Its identity is the path taken to reach it. For a small fixed alphabet an array of 26 children is faster and allocation-free; for open text a hash map per node is the sensible default.",
      },
      {
        heading: "Mark the ends of words explicitly",
        body: "A boolean `isWord` on the node. Without it you cannot distinguish 'car' being stored from 'car' merely being a prefix of 'cart'. This is the single most common trie bug.",
      },
      {
        heading: "Insert walks and creates as needed",
        body: "For each character, follow the child if it exists, otherwise create it. At the end, set `isWord`. The cost is the length of the word, and the shared prefixes cost nothing extra because they already exist.",
      },
      {
        heading: "Prefix search stops at the prefix node",
        body: "Walk the query characters. If you fall off the trie, nothing matches. If you arrive, every word with that prefix is somewhere in the subtree below — which is why the structure answers 'starts with' natively.",
      },
      {
        heading: "Cache the top completions at each node",
        body: "Without this, every keystroke walks an entire subtree, and a one-character prefix walks nearly the whole trie. Storing the best k completions at each node makes a suggestion query O(prefix length + k), which is what makes real-time autocomplete feasible.",
      },
    ],
    complexityDerivation:
      "Insert and exact search are both O(L) where L is the length of the key, because you take one hop per character and each hop is a constant-time map or array lookup. Notice what is absent from that expression: n, the number of stored words. This is genuinely unusual — a hash map is O(L) too, since it must hash the whole key, but a balanced tree is O(L log n) because it does a full string comparison at each of log n levels. Space is the more awkward number. In the worst case, with no shared prefixes, a trie stores one node per character across all words — O(total characters) — and each node carries the overhead of a map or a 26-slot array, which can be an order of magnitude more memory than storing the strings themselves. Real vocabularies share prefixes heavily so it is far better than the worst case in practice, and a radix tree that collapses single-child chains into one labelled edge recovers most of the rest. Listing all words under a prefix is O(size of that subtree) unless you cache completions, which is precisely why the cache exists.",
    variants: [
      {
        name: "Standard trie",
        when: "Autocomplete, spell check, prefix matching over a modest vocabulary.",
        delta:
          "One node per character. Simple, and memory-hungry on large vocabularies.",
      },
      {
        name: "Radix tree / compressed trie",
        when: "Memory matters, or chains of single children are common.",
        delta:
          "Collapses 'c → a → r' into one edge labelled 'car'. Same query cost, far fewer nodes. This is what IP routing tables and many key-value stores use.",
      },
      {
        name: "Trie over path segments",
        when: "File paths, URL routes, topic hierarchies.",
        delta:
          "Each edge is a whole segment rather than a character. Express, Django and every HTTP router match routes this way, and it is the clean way to build a folder tree from flat paths.",
      },
      {
        name: "Suffix trie / suffix automaton",
        when: "Substring search rather than prefix search.",
        delta:
          "Insert every suffix, and 'does this substring occur' becomes a prefix query. Powerful and memory-heavy, which is why suffix arrays are usually preferred in practice.",
      },
    ],
    tradeoffs: [
      {
        vs: "Hash set of words",
        pick: "Hash set for exact membership, trie for prefixes",
        because:
          "For 'is this word in the dictionary', a hash set is faster and uses far less memory. The trie earns its cost only when you need prefix relationships — and it earns it completely, because the hash set cannot answer that question at all without scanning every key.",
      },
      {
        vs: "Sorted array plus binary search",
        pick: "Sorted array when the vocabulary is static and memory is tight",
        because:
          "All words with a prefix form a contiguous block in sorted order, so two binary searches find the range in O(L log n). That is a genuinely good autocomplete implementation with almost no memory overhead. The trie wins on query cost and on incremental updates.",
      },
      {
        vs: "A database LIKE 'prefix%' query",
        pick: "The database when the data lives there anyway",
        because:
          "A B-tree index makes a prefix query a range scan, which is the same insight applied to a different structure. Building an in-memory trie is worth it for latency-critical suggestion paths, not for occasional lookups.",
      },
    ],
  },
  realWorld: [
    {
      system: "IP routing tables (longest prefix match)",
      kind: "industry",
      problem:
        "A router must find the most specific route matching a destination address, from a table with nearly a million entries, at line rate.",
      applied:
        "The address is walked bit by bit through a compressed trie, and the deepest matching node wins. Longest-prefix-match is a trie query by construction — no other structure expresses 'most specific matching prefix' naturally.",
      impact: "Millions of lookups per second on a table of ~900k routes",
    },
    {
      system: "HTTP routers (Express, Gin, Django)",
      kind: "industry",
      problem:
        "Matching an incoming path against hundreds of registered routes, including parameters, without testing each pattern in turn.",
      applied:
        "Routes are inserted into a trie keyed by path segment, with parameter segments as wildcard children. Matching walks the segments once instead of testing every route, so the cost depends on the URL depth rather than the number of routes.",
      impact: "O(routes) pattern testing → O(path depth)",
    },
    {
      system: "Search suggestions and typeahead",
      kind: "industry",
      problem:
        "Suggestions must appear within tens of milliseconds of a keystroke, and a one-character prefix matches a large fraction of the corpus.",
      applied:
        "A trie with the top-k completions precomputed and stored at every node, ranked by popularity. The query becomes 'walk the prefix, read the cached list' — no subtree traversal at all.",
      impact: "O(subtree size) per keystroke → O(prefix + k)",
    },
    {
      system: "traed — instrument symbol lookup and hierarchy building",
      kind: "yours",
      problem:
        "Symbol autocomplete over a large instrument list, and constructing nested structures from flat keys such as `NSE/OPT/NIFTY/24JUL/22000CE`.",
      applied:
        "A trie keyed by character for symbol prefixes, and a trie keyed by segment for the hierarchy. Splitting on the delimiter and inserting into a segment trie, then ordering once at the end, replaces the usual re-sort-per-insert loop.",
      impact: "O(n·d·k log k) repeated sorting → O(n·d) insertion plus one sort",
    },
  ],
  lab: {
    prompt:
      "Given a list of words and a list of prefixes, return for each prefix how many words start with it. Build a trie once and answer every prefix from it. Scanning every word for every prefix is correct and O(words × prefixes × length) — the gate uses many words and many prefixes, so that approach is rejected. Budget: O(total characters).",
    fnName: "countByPrefix",
    signature: "countByPrefix(words: string[], prefixes: string[]): number[]",
    starter: `function countByPrefix(words, prefixes) {
  // Build ONE trie from the words, then answer each prefix by walking it.
  // Store a running count at every node: how many inserted words passed
  // through here. That count IS the answer for the prefix ending there.

  return [];
}`,
    tests: [
      {
        name: "shared prefixes",
        input: [
          ["car", "cart", "care", "dog"],
          ["car", "ca", "d", "x"],
        ],
        expected: [3, 3, 1, 0],
      },
      {
        name: "empty prefix matches everything",
        input: [
          ["a", "b"],
          [""],
        ],
        expected: [2],
      },
      {
        name: "no words",
        input: [[], ["a"]],
        expected: [0],
      },
      {
        name: "no prefixes",
        input: [["a"], []],
        expected: [],
      },
      {
        // A whole word is also a prefix of itself, and duplicates count
        // separately — this is a count of words, not of distinct words.
        name: "duplicates count separately",
        input: [
          ["ab", "ab", "abc"],
          ["ab", "abc", "abcd"],
        ],
        expected: [3, 1, 0],
      },
      {
        name: "prefix longer than every word",
        input: [["hi"], ["hiya"]],
        expected: [0],
        hidden: true,
      },
      {
        name: "one word is a prefix of another",
        input: [
          ["do", "dorm", "dork"],
          ["do", "dor", "dork"],
        ],
        expected: [3, 2, 1],
        hidden: true,
      },
      {
        name: "empty string stored as a word",
        input: [
          ["", "a"],
          ["", "a"],
        ],
        expected: [2, 1],
        hidden: true,
      },
    ],
    hints: [
      "A node can be a plain object: `{ children: new Map(), count: 0 }`. The root's count is the number of words inserted, since every word passes through it.",
      "Insert: start at the root, increment its count, then for each character move to (or create) the child and increment that node's count too.",
      "Query: walk the prefix from the root. If a character has no child, the answer is 0. If you complete the walk, the answer is that node's count — no subtree traversal needed.",
    ],
    solution: `function countByPrefix(words, prefixes) {
  const makeNode = () => ({ children: new Map(), count: 0 });
  const root = makeNode();

  for (const word of words) {
    let node = root;
    node.count++;              // every word passes through the root
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, makeNode());
      node = node.children.get(ch);
      node.count++;            // and through each node on its path
    }
  }

  return prefixes.map((prefix) => {
    let node = root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (node === undefined) return 0;   // fell off the trie
    }
    // The count here already IS the number of words below.
    return node.count;
  });
}`,
    complexityGate: {
      target: "O(n)",
      // Words and prefixes both scale with n, so the scan-every-word
      // approach is quadratic while the trie stays linear.
      gen: "(n) => { const words = Array.from({ length: n }, (_, i) => 'w' + (i % 977) + 'x' + i); const prefixes = Array.from({ length: n }, (_, i) => 'w' + (i % 977)); return [words, prefixes]; }",
      sizes: [1000, 2000, 4000, 8000],
    },
  },
  insights: [
    {
      t: "Lookup cost is the key length, not the dictionary size",
      d: "Searching a prefix in a trie of ten words or ten million words costs the same. That is a property no hash map can offer for prefixes at all.",
    },
    {
      t: "Cache top-K completions at each node",
      d: "Otherwise every keystroke walks the whole subtree. With the cache, a suggestion query is O(prefix + k), which is the difference between usable and unusable typeahead.",
    },
    {
      t: "Path tries beat repeated sorting for file trees",
      d: 'Building a folder tree by splitting on "/" and re-sorting each level per insert is O(n·d·k log k). Insert into a trie keyed by segment, then order once at the end.',
    },
    {
      t: "Compress single-child chains",
      d: 'A radix tree collapses "c → a → r" into one "car" edge, which is a large memory win on real vocabularies and the reason routing tables can hold a million prefixes.',
    },
    {
      t: "Mark word ends explicitly",
      d: "Without an `isWord` flag you cannot tell a stored word from a prefix of a longer one. Storing 'cart' would make 'car' appear to be in the dictionary.",
    },
  ],
  pitfalls: [
    "Forgetting the end-of-word marker. Every prefix of every stored word then looks like a stored word.",
    "Using a 26-slot array for text that is not lowercase English. Digits, spaces, accents and Devanagari all fall outside it.",
    "Traversing the subtree on every keystroke for suggestions. A one-character prefix then walks most of the trie, per keypress.",
    "Reaching for a trie when a hash set would do. For exact membership it is slower and uses much more memory.",
  ],
  quiz: [
    {
      q: "Searching for a 5-character prefix in a trie holding 10 million words costs:",
      options: [
        "O(log 10M)",
        "O(5) — independent of the word count",
        "O(10M)",
        "O(5 · log 10M)",
      ],
      answer: 1,
      difficulty: "recall",
      why: "One hop per character. The number of stored words never enters the cost of locating the prefix node.",
      distractors: [
        "That would be a balanced tree over the words, where every level costs a comparison.",
        "",
        "That is a linear scan of the dictionary, which is what the trie exists to avoid.",
        "This is the cost of a BST of strings — L work at each of log n levels. The trie has no such factor.",
      ],
    },
    {
      q: "Why cache top-K completions at each trie node?",
      options: [
        "To save memory",
        "So a suggestion query does not have to traverse the entire subtree on every keystroke",
        "To support deletion",
        "To keep the trie balanced",
      ],
      answer: 1,
      difficulty: "apply",
      why: 'Without it, a short prefix such as "a" walks an enormous subtree on every keypress. With it, the answer is already sitting at the node.',
      distractors: [
        "It costs memory — k entries per node. You are buying query time with space.",
        "",
        "Deletion becomes harder, since the caches on the whole path must be repaired.",
        "Tries have no balance property. Their shape is determined entirely by the keys.",
      ],
    },
    {
      q: "You store 'cart' in a trie and then search for 'car'. Without an end-of-word marker, what happens?",
      options: [
        "The search fails",
        "It reports 'car' as present, because the path exists even though no word ends there",
        "It throws an error",
        "It returns 'cart'",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A node's existence only means some word passes through it. The `isWord` flag is what distinguishes 'a word ends here' from 'this is on the way to a word'. It is the most common trie bug.",
      distractors: [
        "The path c → a → r certainly exists, since 'cart' created it.",
        "",
        "Nothing errors. It confidently returns the wrong answer.",
        "It does not return words at all; it answers a membership question.",
      ],
    },
    {
      q: "For exact membership testing of a fixed dictionary, which is better?",
      options: [
        "A trie, because it is O(L)",
        "A hash set — also O(L) to hash the key, with far less memory and better cache behaviour",
        "They are identical",
        "A sorted array",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Both are O(L), because hashing must read the whole key too. The hash set stores the strings compactly, while the trie allocates a node with a map per character. The trie earns its cost only for prefix queries.",
      distractors: [
        "Correct complexity and wrong conclusion. Same class, much worse constant factor and memory.",
        "",
        "Same asymptotic cost, very different real cost — often ten times the memory for the trie.",
        "Also reasonable — O(L log n) and very compact — but the hash set is faster for pure membership.",
      ],
    },
    {
      q: "An IP router must find the MOST SPECIFIC matching route. Why a trie?",
      options: [
        "Because IP addresses are numbers",
        "Because walking the address bit by bit visits every matching prefix in order, and the deepest node reached is by construction the longest match",
        "Because tries are fast",
        "Because routing tables are small",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Longest-prefix-match IS a trie query. Every prefix of the address corresponds to a node on the walk, so the deepest marked node you pass is the most specific route. No other structure expresses the question as directly.",
      distractors: [
        "Being numeric permits a binary trie, and it does not explain why prefix structure is the right model.",
        "",
        "True and not an explanation. The question is why this particular structure fits.",
        "They hold close to a million entries, which is exactly why a scan is not viable.",
      ],
    },
    {
      q: "Your trie for a multilingual app uses a 26-element array per node. What breaks?",
      options: [
        "Nothing",
        "Any character outside a–z — digits, spaces, accented letters, Devanagari — has no slot, so it is dropped or corrupts a neighbouring index",
        "It uses too much memory",
        "Lookups become O(n)",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The array index is computed from the character code, and anything outside the assumed range produces a negative or out-of-range index. Use a hash map per node when the alphabet is open, and accept the extra memory.",
      distractors: [
        "It breaks on the first non-ASCII input, which for an Indian-language app is immediate.",
        "",
        "It uses more memory than a map for sparse nodes, and that is a secondary problem next to being wrong.",
        "Lookup cost is unchanged. Correctness is what fails.",
      ],
    },
    {
      q: "Building a folder tree from 100,000 flat paths, sorting each level after every insert. What is the fix?",
      options: [
        "Use a faster sort",
        "Insert everything into a trie keyed by path segment, then sort each level once at the end",
        "Sort the paths first",
        "Use a hash map keyed by full path",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Sorting per insert repeats the same work n times. A segment trie builds the structure in O(total segments) with no sorting at all, and one ordering pass at the end gives the display order. Sorting the input first also works and still costs a full sort of every path string.",
      distractors: [
        "Making a repeated unnecessary sort faster leaves it repeated and unnecessary.",
        "",
        "Genuinely helpful — sorted input means each level is built in order — and it still sorts full path strings rather than exploiting the shared structure.",
        "A hash map by full path gives no hierarchy, which is the thing being built.",
      ],
    },
    {
      q: "In the prefix-count lab, why store a count at every node rather than counting the subtree when queried?",
      options: [
        "It uses less memory",
        "Because the count is maintained during insertion at no extra cost, making each query O(prefix length) instead of O(subtree size)",
        "Because subtree traversal is incorrect",
        "To keep the trie balanced",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Every word already walks its own path during insertion, so incrementing a counter there is free. Counting the subtree at query time is correct and costs the size of the subtree — which for a short prefix is most of the trie, on every query.",
      distractors: [
        "It uses more — one integer per node. You are buying query time with space, which is the same trade as caching completions.",
        "",
        "Subtree traversal gives the right answer. It is the cost that is unacceptable.",
        "Tries have no balance property to maintain.",
      ],
    },
  ],
};

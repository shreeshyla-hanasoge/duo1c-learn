import type { Topic } from "../types.ts";

export const strings: Topic = {
  id: "strings",
  title: "Strings",
  tier: 0,
  week: 1,
  depth: "core",
  summary: "Immutability costs, builders, character-count maps.",
  why: "String concatenation inside a loop is the single most common accidental O(n^2) in production code, and it is invisible in review because the line looks harmless. Strings are also where character encoding quietly breaks things — a length check that is correct for English is wrong for Hindi, Tamil or an emoji.",
  complexity: "O(n) build with a builder · O(n^2) with repeated concatenation",
  learn: {
    intuition:
      "In Python, Java, JavaScript, C# and Go, a string cannot be changed after it is created. Every operation that looks like a modification actually builds a new string and copies the characters across. That single design decision is behind most string performance surprises: `s += x` is not an append, it is an allocate-and-copy-everything. Once you internalise that, the fixes become obvious — collect pieces in a list and join once at the end, or use whatever builder your language provides. The second thing worth internalising is that a string is not a list of letters. It is a sequence of code units, and one visible character can occupy several of them.",
    mechanics: [
      {
        heading: "Treat concatenation in a loop as an allocation in a loop",
        body: "`result += chunk` allocates a new string of the combined length, copies the old contents in, copies the chunk in, and abandons the old one to the garbage collector. Do that n times and you have copied roughly n^2/2 characters and created n dead strings.",
      },
      {
        heading: "Collect, then join",
        body: "`parts.append(chunk)` then `''.join(parts)`. The append is amortised O(1), and the join walks the list once to compute the total length, allocates exactly once, and copies each piece exactly once. Total O(n). Java's StringBuilder and Go's strings.Builder are the same idea with a different name.",
      },
      {
        heading: "For a fixed small alphabet, count into an array",
        body: "Anagram and frequency problems over a-z do not need a hash map. A 26-slot integer array indexed by `ord(c) - ord('a')` is faster, allocates nothing, and two of them can be compared directly. Reach for a map only when the key space is genuinely open.",
      },
      {
        heading: "Compare counts rather than sorting",
        body: "The anagram check most people write sorts both strings, which is O(n log n). Counting characters in one pass each and comparing the counts is O(n) and no longer to write. Interviewers are specifically watching for this.",
      },
      {
        heading: "Know what your language means by length",
        body: "Python 3 strings are sequences of code points, so `len('नमस्ते')` counts code points, not the shapes a reader sees. JavaScript and Java use UTF-16 code units, so an emoji has length 2 and `s[0]` gives you half of it. Slicing a string at a byte or code-unit boundary is how mojibake gets into a database.",
      },
    ],
    complexityDerivation:
      "Take n appends of a fixed-size chunk. Before append number k, the accumulated string has about k characters, and the append copies all of them. Total copying is 1 + 2 + 3 + … + n = n(n+1)/2, which is O(n^2). The list-and-join version has a different shape: each append writes into spare capacity in the list, which is amortised O(1) by the doubling argument, so all n appends cost O(n). The join then makes one pass to sum the lengths, allocates a single buffer of exactly that size, and makes one more pass to copy — O(n) in total. So the same task is quadratic or linear depending entirely on whether the intermediate results are kept. Note that CPython has an optimisation that sometimes mutates a string in place when the reference count is exactly 1, which can make `+=` look linear in a micro-benchmark; it is fragile, it does not apply when anything else holds a reference, and it does not exist in other implementations.",
    variants: [
      {
        name: "Builder / list-and-join",
        when: "Assembling a string from many pieces.",
        delta: "The default fix. O(n) instead of O(n^2), and one allocation.",
      },
      {
        name: "Counting array over a fixed alphabet",
        when: "Anagrams, character frequency, permutation checks over a-z.",
        delta:
          "26 integers instead of a hash map. No hashing, no allocation, and direct array comparison.",
      },
      {
        name: "Rolling hash",
        when: "Searching for a pattern, or comparing many substrings.",
        delta:
          "Treat the substring as a number in some base and update it in O(1) as the window slides. This is what Rabin-Karp is, and it is the basis of most duplicate-detection over text.",
      },
      {
        name: "Rope / gap buffer",
        when: "A text editor, where edits land in the middle of a large document.",
        delta:
          "Stores the text as a tree or as two buffers with a gap, so an insert does not copy the whole document. This is what your editor uses.",
      },
    ],
    tradeoffs: [
      {
        vs: "Sorting both strings to test for anagrams",
        pick: "Counting characters",
        because:
          "Counting is O(n) and sorting is O(n log n), and the counting code is not longer. Sorting only wins when the alphabet is enormous and the strings are tiny, where the constant factor of building a map dominates.",
      },
      {
        vs: "Regular expressions",
        pick: "A plain scan when the pattern is fixed and simple",
        because:
          "A regex engine is excellent for genuine pattern matching and terrible for `startswith`. Worse, some engines backtrack, so a badly written pattern on hostile input can take exponential time — that is what a ReDoS attack is.",
      },
      {
        vs: "Storing text as bytes",
        pick: "Decode once at the boundary, work in the string type",
        because:
          "Mixing bytes and text is where encoding bugs come from. Decode when data enters your system, encode when it leaves, and keep everything in between as proper text. The exception is when you never inspect the content — then bytes avoid the decode cost entirely.",
      },
    ],
  },
  realWorld: [
    {
      system: "Aadhaar and Indian-language text handling",
      kind: "industry",
      problem:
        "Names in Devanagari, Tamil and Bengali use combining marks, so one visible character can be several code points. A field validated as 'maximum 60 characters' silently truncates a name mid-cluster and stores something unreadable.",
      applied:
        "Normalise to a canonical Unicode form on input, count grapheme clusters rather than code units for anything shown to a user, and never slice text at an arbitrary index. The general rule: a string is a sequence of code units, not of the shapes a reader sees.",
      impact: "Prevents corrupted names and failed identity matching",
    },
    {
      system: "ReDoS — regular expression denial of service",
      kind: "industry",
      problem:
        "Backtracking regex engines can take exponential time on inputs crafted to force retries. A single validation pattern on a public endpoint has taken down production services, including a well-known Cloudflare outage in 2019.",
      applied:
        "Prefer plain string operations for simple checks, keep patterns free of nested quantifiers, and use an engine with linear-time guarantees (RE2, Rust's regex crate) when the input is untrusted.",
      evidence: "Cloudflare post-mortem, 2 July 2019",
      impact: "Exponential worst case → linear",
    },
    {
      system: "Log aggregation and duplicate detection",
      kind: "industry",
      problem:
        "Finding repeated lines or near-duplicate documents by comparing every pair is quadratic and impossible at log volume.",
      applied:
        "Hash each line, or each shingle of a document, into a fixed-size fingerprint and compare fingerprints. A rolling hash makes the per-window update O(1), so a full document is processed in one pass.",
      impact: "O(n^2) pairwise comparison → O(n) fingerprinting",
    },
    {
      system: "traed — building SQL and log lines in loops",
      kind: "yours",
      problem:
        "Assembling a query, a CSV row, or a formatted log message by repeated `+=` inside a per-candle or per-order loop makes an O(n) routine quadratic, and it is invisible in review because each individual line looks cheap.",
      applied:
        "Collect the parts in a list and `''.join(...)` once. For SQL specifically, parameter binding is both the correct fix for injection and the one that avoids the concatenation entirely.",
      impact: "O(n^2) string building → O(n), plus one allocation instead of n",
    },
  ],
  lab: {
    prompt:
      "Return the index of the first character in the string that appears exactly once. If every character repeats, return -1. The one-liner using `indexOf` and `lastIndexOf` inside a loop is correct and quadratic — the complexity gate runs on a string where no character is unique, so it measures the full scan. Budget: O(n).",
    fnName: "firstUniqueChar",
    signature: "firstUniqueChar(s: string): number",
    starter: `function firstUniqueChar(s) {
  // Budget: O(n) time.
  // Careful: s.indexOf(c) and s.lastIndexOf(c) each scan the whole
  // string, so calling them per character makes this quadratic.

  return -1;
}`,
    tests: [
      { name: "first character is unique", input: ["leetcode"], expected: 0 },
      { name: "unique appears later", input: ["loveleetcode"], expected: 2 },
      { name: "no unique character", input: ["aabb"], expected: -1 },
      { name: "empty string", input: [""], expected: -1 },
      { name: "single character", input: ["z"], expected: 0 },
      {
        name: "unique is the last character",
        input: ["aabbc"],
        expected: 4,
        hidden: true,
      },
      {
        // Answers must be by first position, not by first-seen-unique in a
        // map iteration order that happens to differ.
        name: "returns the earliest unique, not any unique",
        input: ["abcabd"],
        expected: 2,
        hidden: true,
      },
      {
        name: "three of a kind still repeats",
        input: ["aaa"],
        expected: -1,
        hidden: true,
      },
    ],
    hints: [
      "You cannot know whether the first character is unique until you have seen the whole string. That means two passes, not one.",
      "First pass: count how many times each character occurs, using a Map or a plain object.",
      "Second pass: walk the string again in order and return the index of the first character whose count is 1. Walking the string (not the map) is what guarantees you return the earliest one.",
    ],
    solution: `function firstUniqueChar(s) {
  const count = new Map();
  for (const c of s) {
    count.set(c, (count.get(c) ?? 0) + 1);
  }
  for (let i = 0; i < s.length; i++) {
    if (count.get(s[i]) === 1) return i;
  }
  return -1;
}`,
    complexityGate: {
      target: "O(n)",
      // Every character appears exactly twice, so the answer is -1 and no
      // solution can exit early. Distinct code points keep the alphabet from
      // wrapping, which would create triples and change the answer.
      gen: "(n) => { const half = Array.from({ length: Math.floor(n / 2) }, (_, i) => String.fromCharCode(0x100 + i)).join(''); return [half + half]; }",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Immutable strings make += quadratic",
      d: "Each concatenation allocates a fresh string and copies everything so far. n appends copy 1 + 2 + … + n characters. Use a builder, a list plus join, or a rope.",
    },
    {
      t: "A 26-slot array beats a hash map for anagram work",
      d: "When the alphabet is small and fixed, a counting array is faster, allocates nothing, and two of them compare directly. Reach for a map only when the key space is genuinely open.",
    },
    {
      t: "Comparing character counts is O(n); sorting is O(n log n)",
      d: "The anagram check almost everyone writes sorts both strings. Counting is strictly better and just as short.",
    },
    {
      t: "Length is not the number of characters a reader sees",
      d: "In JavaScript and Java a string is UTF-16 code units, so an emoji has length 2 and indexing into it gives you half a character. In Python 3 it is code points, which still splits a Devanagari cluster. Validate and truncate on grapheme clusters when a human will read the result.",
    },
  ],
  pitfalls: [
    "Building a string with `+=` inside a loop. Collect the pieces and join once.",
    "Slicing or truncating text at an arbitrary index. On non-English text that splits a character and produces unreadable output.",
    "Using a regular expression for a fixed prefix or suffix check. `startswith` is clearer and cannot backtrack.",
    "Comparing user-supplied text without normalising Unicode first. Two strings that look identical can hold different code points and compare as unequal.",
  ],
  quiz: [
    {
      q: "Building a 100k-character string by repeated `s += c` in a language with immutable strings costs roughly:",
      options: ["O(n)", "O(n log n)", "O(n^2)", "O(n) but with high constants"],
      answer: 2,
      difficulty: "recall",
      why: "Each `+=` copies the whole accumulated string, so total copying is 1 + 2 + … + n ≈ n^2/2 characters.",
      distractors: [
        "This is what you get with a builder or a list plus join, where each piece is copied exactly once.",
        "There is no halving and no sorting, so no log factor appears.",
        "",
        "It is genuinely a different complexity class, not the same class with a bad constant. At 100k characters that is the difference between milliseconds and seconds.",
      ],
    },
    {
      q: "To test whether two words are anagrams, the best general approach is:",
      options: [
        "Sort both and compare — O(n log n)",
        "Count characters in one pass each and compare counts — O(n)",
        "Compare hash values of both strings",
        "Check that they have the same set of characters",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Counting is linear and exact. Sorting is a log factor slower, and comparing sets loses multiplicity — 'aab' and 'abb' have the same set of characters and are not anagrams.",
      distractors: [
        "Correct, commonly written, and needlessly slower. It is the answer an interviewer expects you to improve on.",
        "",
        "A hash of the whole string depends on order, so 'abc' and 'cba' hash differently. It answers the wrong question.",
        "Sets discard how many times each character occurs, which is the entire content of an anagram check.",
      ],
    },
    {
      q: "In JavaScript, `'नमस्ते'.length` and what a reader counts as characters differ. Why?",
      options: [
        "The string is stored compressed",
        "JavaScript counts UTF-16 code units, and one visible cluster can be several code units",
        "The font renders it differently",
        "It is a bug in the engine",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Length counts code units. Combining marks and characters outside the basic plane occupy more than one, so a visible cluster and a code unit are simply different things. Use `Intl.Segmenter` when a human count is what you need.",
      distractors: [
        "Strings are not compressed in a way that affects length. Length is defined by the encoding, not by storage tricks.",
        "",
        "Rendering happens after the string exists. The count is decided by the encoding, whatever the font does.",
        "This is specified behaviour and works the same in Java and C#. Treating it as a bug leads to fixes that break in a new way.",
      ],
    },
    {
      q: "Which of these is a legitimate reason to prefer a rolling hash over direct substring comparison?",
      options: [
        "It is always exact",
        "It updates in O(1) as the window slides, so scanning all windows is O(n) instead of O(n·m)",
        "It uses less memory than a string",
        "It handles Unicode correctly",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The point is the O(1) update: remove the outgoing character's contribution, add the incoming one. That turns comparing every window of length m from O(n·m) into O(n), with a verification step for the rare hash match.",
      distractors: [
        "The opposite — two different substrings can hash the same, so a match must be verified. That is why Rabin-Karp is probabilistic until it confirms.",
        "",
        "Memory is not the motivation, and you still hold the original string.",
        "A rolling hash is indifferent to Unicode. It hashes whatever units you feed it.",
      ],
    },
    {
      q: "A validation regex on a public API endpoint uses nested quantifiers like `(a+)+$`. What is the risk?",
      options: [
        "It is slower to compile",
        "A crafted input can force exponential backtracking and consume a CPU indefinitely",
        "It will reject valid input",
        "It uses too much memory",
      ],
      answer: 1,
      difficulty: "judge",
      why: "This is ReDoS. Backtracking engines try every way to split the input among the nested quantifiers, which is exponential. On a public endpoint that is a denial of service from a single request.",
      distractors: [
        "Compilation happens once and is not the concern. The problem is at match time, per request, on attacker-controlled input.",
        "",
        "The pattern matches correctly. Its failure mode is time, not correctness, which is what makes it hard to catch in review.",
        "Backtracking burns CPU, not memory. The process stays alive and stops being able to serve anyone.",
      ],
    },
    {
      q: "You need the frequency of each letter in a lowercase a-z string, in a hot loop. Best structure?",
      options: [
        "A hash map from character to count",
        "A 26-element integer array indexed by `c.charCodeAt(0) - 97`",
        "A sorted array of pairs",
        "A trie",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The key space is small, dense and known ahead of time, which is exactly when an array beats a map: no hashing, no allocation, no collisions, and two count arrays can be compared directly.",
      distractors: [
        "Correct and the usual reflex, but it hashes every character and allocates. Fine outside a hot loop, wasteful inside one.",
        "",
        "Keeping it sorted costs more than the counting itself, and you would still search it per character.",
        "A trie stores many strings by shared prefix. Counting single characters is not the problem it solves.",
      ],
    },
    {
      q: "`firstUniqueChar` in one pass, returning as soon as you find a character not seen before — what is wrong with it?",
      options: [
        "Nothing, it is the optimal solution",
        "'Not seen before' is not the same as 'appears once' — you cannot know a character is unique until you have read the whole string",
        "It uses too much memory",
        "It fails only on empty input",
      ],
      answer: 1,
      difficulty: "apply",
      why: "On 'abca', the first pass sees 'a' as new and returns 0, but 'a' appears again later. Uniqueness is a property of the whole string, so it needs one pass to count and a second pass to find the earliest count of 1.",
      distractors: [
        "It is fast and wrong, which is worse than slow and right. Correctness tests would catch it before the gate ever ran.",
        "",
        "Memory is not the issue; the logic is. A set and a map cost about the same here.",
        "Empty input happens to work — the loop simply does not run. The failure is on ordinary input with a repeat later in the string.",
      ],
    },
    {
      q: "Your team stores user-typed names and two records that look identical fail an equality check. Most likely cause?",
      options: [
        "A database collation bug",
        "The strings use different Unicode normalisation forms — the same visible text as different code point sequences",
        "One has trailing whitespace",
        "String comparison is unreliable",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A character with an accent or a combining mark can be stored as one composed code point or as a base plus a combining mark. They render identically and are not equal byte for byte. Normalise (NFC is the usual choice) at the point data enters the system.",
      distractors: [
        "Collation affects sorting and case-insensitive matching more than exact equality, and it would not explain identical-looking text differing.",
        "",
        "Always worth checking, and it is the first thing to rule out — but it does not explain text that looks identical after trimming.",
        "String comparison is entirely reliable. It is comparing exactly what it was given, which is two different sequences.",
      ],
    },
  ],
};

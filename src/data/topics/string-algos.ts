import type { Topic } from "../types.ts";

export const stringAlgos: Topic = {
  id: "string-algos",
  title: "String algorithms",
  tier: 4,
  week: 19,
  depth: "deep",
  summary: "KMP, Z-algorithm, Rabin-Karp, suffix arrays, Aho-Corasick.",
  why: "Deduplication, multi-keyword log filtering, and any search that is currently a regex in a loop.",
  complexity: "O(n + m)",
  viz: ["kmp"],
  learn: {
    intuition:
      "Searching for a pattern by trying it at every position wastes something obvious once you see it. Suppose you are looking for `abcabcd` and you have matched six characters before failing on the seventh. The naive response is to slide the pattern forward by one and start again from scratch — but you already know what those next six characters of the text are, because you just read them. They were `abcabc`. So you know without looking that starting one position later fails immediately, and two later fails too, and that starting three later is the only candidate worth trying, because `abc` is both a prefix and a suffix of what you matched. That self-overlap is the entire content of KMP. You precompute, for every prefix of the pattern, how much of it is simultaneously a prefix and a suffix of itself — its longest border — and on a mismatch you slide by exactly that much. The consequence is the property worth remembering: the pointer into the *text* never moves backwards. Each character is read once and never revisited, which is what makes the whole search linear rather than quadratic.",
    mechanics: [
      {
        heading: "The failure function stores border lengths",
        body: "`lps[i]` is the length of the longest proper prefix of the pattern that is also a suffix of `pattern[0..i]`. 'Proper' means it cannot be the whole thing. For `ababa` it is `[0, 0, 1, 2, 3]`. That number is exactly how much of a partial match survives a mismatch, and it is the only precomputation KMP needs.",
      },
      {
        heading: "Build the failure function against the pattern itself",
        body: "The build is the same matching loop run with the pattern as both text and pattern. Keep a length counter; on a match extend it, on a mismatch fall back to `lps[len - 1]` rather than to zero. Falling back to zero is the classic bug — it still produces a working search, just a slower one, so nothing fails and you never find out.",
      },
      {
        heading: "The text pointer never rewinds",
        body: "In the search loop, `i` walks the text and only ever increases. On a mismatch you move `j` back within the pattern using `lps`, never `i`. That single invariant is what to say when asked why KMP is linear — the text is read once, and all the backtracking happens inside the pattern, which is bounded by its own length.",
      },
      {
        heading: "After a full match, fall back rather than resetting",
        body: "Finding a match at position `i` and then setting `j = 0` misses overlapping occurrences — searching `aaaa` for `aa` would report two matches instead of three. Set `j = lps[j - 1]` instead, exactly as on a mismatch. Whether overlaps count is a specification question worth asking out loud, because the two behaviours differ by one line and both look correct.",
      },
      {
        heading: "Know which tool the shape of the problem calls for",
        body: "One pattern in one text: KMP or Z-algorithm, O(n + m). Many patterns in one pass: Aho-Corasick, which is KMP generalised onto a trie — build it once and every keyword is found in a single traversal. Many texts against one pattern, or content dedup: Rabin-Karp, whose rolling hash makes each window O(1). One text searched repeatedly: build a suffix array once at O(n log n) and answer each query in O(m log n). Choosing wrongly here costs far more than implementing any of them badly.",
      },
    ],
    complexityDerivation:
      "KMP is O(n + m) and the proof is an amortised argument worth being able to give. In the search loop, `i` advances on every iteration that matches and stays put only when `j` falls back. But `j` only ever increases by one per character consumed, so across the whole search it can increase at most n times — and therefore it can decrease at most n times too, since it never goes below zero. The total number of fallback steps is bounded by the total number of advances, so the loop body runs at most 2n times. The same argument bounds the failure-function build at 2m. This is the same shape of reasoning as the monotonic stack's 'each element is pushed once and popped once', and recognising the pattern is more valuable than memorising either result. The alternatives sit at different points. Rabin-Karp is O(n + m) *expected* rather than worst case, because a hash collision forces a character-by-character verification, and an adversary who knows your hash parameters can force collisions at every position and drive it to O(n·m) — which is why the modulus should be random rather than a constant from a textbook. Aho-Corasick is O(n + total pattern length + number of matches), and that last term is not a formality: search for a hundred patterns that all match everywhere and the output itself is quadratic, however good the automaton is.",
    variants: [
      {
        name: "KMP",
        when: "One pattern, one text, worst-case guarantees needed.",
        delta:
          "Failure function plus a single forward pass. O(n + m) worst case, O(m) extra memory.",
      },
      {
        name: "Rabin-Karp",
        when: "Deduplication, content-defined chunking, or many patterns of equal length.",
        delta:
          "A rolling hash makes each window O(1). Matches must be verified because hashes collide. Expected linear, quadratic against an adversary unless the modulus is randomised.",
      },
      {
        name: "Aho-Corasick",
        when: "Many patterns, one pass — log filtering, intrusion detection, profanity lists.",
        delta:
          "A trie of all patterns with KMP-style failure links between nodes. Build once, then one traversal finds every keyword.",
      },
      {
        name: "Suffix array with LCP",
        when: "One text, many different queries against it.",
        delta:
          "O(n log n) build, then any pattern in O(m log n) by binary search. The right shape when the text is fixed and the queries are not — which is what a search index is.",
      },
    ],
    tradeoffs: [
      {
        vs: "The language's built-in `indexOf` or a compiled regex",
        pick: "The built-in, until you have measured that it is the problem",
        because:
          "V8's `indexOf` and Rust's `memchr` are heavily optimised and use vector instructions that hand-written KMP cannot match — for ordinary patterns they are typically faster despite the worse theoretical bound, because the quadratic case needs a pattern with heavy self-overlap and a text to match, which real data rarely supplies. Reach for KMP when you need a worst-case guarantee against untrusted input, when the text arrives as a stream you cannot rewind, or when profiling has actually pointed here.",
      },
      {
        vs: "Running the pattern search once per keyword",
        pick: "Aho-Corasick as soon as the keyword count reaches a handful",
        because:
          "Forty keywords means forty passes over the text, and the text is usually the big thing. One automaton makes it one pass regardless of keyword count, and the build is proportional to the total pattern length rather than to the text. The crossover is low — with a large text, even three or four patterns justify it.",
      },
      {
        vs: "A hash set of whole lines or words",
        pick: "The hash set whenever you are matching complete tokens",
        because:
          "If the question is 'is this exact line one of my keywords', a set answers it in O(1) with no string algorithm at all. The pattern-matching machinery is for finding a pattern *inside* a larger text at an unknown offset. Reaching for Aho-Corasick when the real question was set membership is a common and expensive over-engineering, and the tell is that your patterns are always delimited by whitespace.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — filtering strategy logs against many patterns",
      kind: "yours",
      problem:
        "Scanning a session's logs for dozens of distinct error and warning signatures. One regex pass per signature means dozens of passes over a file that is already the largest thing in the pipeline.",
      applied:
        "Build one Aho-Corasick automaton over all the signatures and traverse the log once, reporting every hit with its pattern. Cost becomes proportional to the log plus the total signature length, rather than to their product — and adding a new signature no longer adds a pass.",
      evidence: "strategy-engine/_perf/diffruns.py",
      impact: "One pass per pattern → one pass total",
    },
    {
      system: "rsync and content-defined chunking",
      kind: "industry",
      problem:
        "Syncing a large file that changed slightly. Fixed-size blocks fail badly on insertion: adding one byte at the start shifts every subsequent block boundary and nothing matches.",
      applied:
        "A rolling hash over a sliding window declares a chunk boundary whenever the hash has a particular shape, so boundaries are determined by *content* rather than by offset. Insert a byte and only the chunk containing it changes — every other boundary lands in the same place. This is Rabin fingerprinting, and it is why deduplicating backup systems work at all.",
      impact: "One inserted byte re-transmitting the whole file → re-transmitting one chunk",
    },
    {
      system: "Intrusion detection and web application firewalls",
      kind: "industry",
      problem:
        "Matching every packet or request against thousands of attack signatures, at line rate, without becoming the bottleneck you were installed to protect.",
      applied:
        "Aho-Corasick, usually with vectorised prefilters in front of it. The automaton's cost does not grow with the number of signatures, which is what makes a rule set of thousands feasible. The output-size term matters here too: a rule set where everything matches everything is a denial-of-service against your own detector.",
      impact: "Signature count decoupled from per-packet cost",
    },
    {
      system: "grep and ripgrep",
      kind: "industry",
      problem:
        "Searching large trees of source and log files quickly enough to feel instant.",
      applied:
        "Not KMP. Modern tools use Boyer–Moore-style skipping, which reads the pattern right to left and can jump forward by nearly the pattern length on a mismatch — sub-linear on typical text — plus SIMD scanning for candidate bytes and a Teddy-style multi-pattern prefilter. It is the clearest illustration that the theoretically linear algorithm is not automatically the fast one.",
      impact:
        "Sub-linear in practice on ordinary text, by skipping rather than by never rewinding",
    },
  ],
  lab: {
    prompt:
      "Return the starting indices of every occurrence of `pattern` in `text`, including OVERLAPPING occurrences — `aa` occurs three times in `aaaa`. Return an empty array for an empty pattern. Budget: O(n + m). Comparing the pattern at every position is O(n·m) and will fail the gate.",
    fnName: "findAll",
    signature: "findAll(text: string, pattern: string): number[]",
    starter: `function findAll(text, pattern) {
// Your budget: O(n + m).
// Precompute, for each prefix of the pattern, the length of the longest
// proper prefix that is also a suffix of it. On a mismatch, slide by
// that much instead of restarting — the TEXT pointer must never move
// backwards.

return [];
}`,
    tests: [
      {
        // Overlapping: matches at 0, 2 and 4 all share characters.
        name: "overlapping matches",
        input: ["abababa", "aba"],
        expected: [0, 2, 4],
      },
      {
        // A solution that resets j to 0 after a match returns [0, 2] here.
        name: "every position matches",
        input: ["aaaa", "aa"],
        expected: [0, 1, 2],
      },
      {
        name: "the classic",
        input: ["mississippi", "issi"],
        expected: [1, 4],
      },
      {
        name: "no match",
        input: ["abc", "d"],
        expected: [],
      },
      {
        // The failure function earns its keep: after matching "aa" and
        // failing on "b", it slides by one rather than restarting.
        name: "partial match then mismatch",
        input: ["aaab", "aab"],
        expected: [1],
      },
      { name: "empty pattern", input: ["abc", ""], expected: [], hidden: true },
      {
        name: "pattern longer than text",
        input: ["ab", "abc"],
        expected: [],
        hidden: true,
      },
      {
        name: "pattern is the whole text",
        input: ["aaaaa", "aaaaa"],
        expected: [0],
        hidden: true,
      },
    ],
    hints: [
      "First build the failure table. `lps[i]` is the length of the longest proper prefix of the pattern that is also a suffix of `pattern[0..i]`. For `ababa` it is `[0, 0, 1, 2, 3]`.",
      "Build it by matching the pattern against itself: keep a length counter `len`, and walk `i` from 1. If the characters match, extend and record. If not, fall back to `lps[len - 1]` — falling back to 0 instead still works but throws away the overlap you just computed.",
      "In the search, `i` walks the text and NEVER decreases; only `j` moves back, via `lps[j - 1]`. After recording a full match, set `j = lps[j - 1]` rather than 0 — that is what finds overlapping occurrences.",
    ],
    solution: `function findAll(text, pattern) {
const out = [];
const n = text.length;
const m = pattern.length;
if (m === 0 || m > n) return out;

// lps[i] = length of the longest PROPER prefix of pattern that is also
// a suffix of pattern[0..i]. Built by matching the pattern against
// itself with the same loop the search uses.
const lps = new Int32Array(m);
let len = 0;
for (let i = 1; i < m; ) {
  if (pattern[i] === pattern[len]) {
    lps[i++] = ++len;
  } else if (len > 0) {
    // Fall back to the next-best border. Setting len = 0 here would
    // still be correct, just slower — which is why the bug survives.
    len = lps[len - 1];
  } else {
    lps[i++] = 0;
  }
}

let j = 0;                       // how much of the pattern is matched
for (let i = 0; i < n; i++) {    // i NEVER decreases — that is the point
  while (j > 0 && text[i] !== pattern[j]) j = lps[j - 1];
  if (text[i] === pattern[j]) j++;
  if (j === m) {
    out.push(i - m + 1);
    // Fall back rather than reset, so overlapping matches are found.
    j = lps[j - 1];
  }
}

return out;
}`,
    complexityGate: {
      target: "O(n)",
      // Both the text and the pattern scale with the parameter, and the
      // pattern is the naive algorithm's worst case: a run of 'a' ending
      // in 'b' against a text of pure 'a'. Every start position matches
      // n/10 characters before failing, so the naive search is O(n^2)
      // while KMP stays O(n + m).
      //
      // A short fixed pattern would make the naive version linear too and
      // the gate would separate nothing.
      gen: "(n) => ['a'.repeat(n), 'a'.repeat(n / 10) + 'b']",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "KMP: the text pointer never rewinds",
      d: "On a mismatch only the pattern index moves back, via the failure function. The text is read once, which is the whole linear-time argument — and the sentence to say when asked why KMP is O(n + m).",
    },
    {
      t: "Rabin-Karp is the right tool for dedup",
      d: "A rolling hash makes each window O(1), which is what content-defined chunking needs. A hash match must always be verified, and the modulus should be randomised or an adversary can force collisions everywhere.",
    },
    {
      t: "Aho-Corasick searches ALL patterns in one pass",
      d: "A trie of the patterns with KMP-style failure links between nodes. Cost is text + total pattern length + number of matches, so adding the fortieth keyword costs nothing per byte of text.",
    },
    {
      t: "Compile the regex outside the loop",
      d: "Recompiling a pattern per iteration is one of the most common real performance bugs in string-heavy code, and it costs far more than any algorithm choice inside the loop.",
    },
    {
      t: "The linear algorithm is often not the fast one",
      d: "ripgrep and grep use Boyer–Moore-style skipping and SIMD rather than KMP, and are sub-linear on ordinary text. Reach for KMP for worst-case guarantees or unrewindable streams, not by default.",
    },
  ],
  pitfalls: [
    "Resetting the pattern index to 0 after a match, which silently misses every overlapping occurrence.",
    "Falling back to 0 instead of `lps[len − 1]` while building the failure function. The search still returns correct answers, just slower, so nothing ever fails.",
    "Trusting a Rabin-Karp hash match without verifying the characters. Different strings do share hashes, and the bug appears as rare, unreproducible false matches.",
    "Reaching for pattern matching when the real question is set membership. If the keywords are always whole tokens, a hash set answers it in O(1).",
  ],
  quiz: [
    {
      q: "The KMP failure function lps[i] stores:",
      options: [
        "The number of matches so far",
        "The length of the longest proper prefix of the pattern that is also a suffix of pattern[0..i]",
        "The position of the last mismatch",
        "The pattern length",
      ],
      answer: 1,
      difficulty: "recall",
      why: "That border length is precisely how much of the partial match survives a mismatch, so the text pointer can stay put.",
      distractors: [
        "Match count is an output of the search, not something the precomputation could know — the table is built from the pattern alone, before any text is seen.",
        "",
        "Mismatch positions depend on the text. The table is a property of the pattern only, which is why it can be built once and reused across many texts.",
        "A constant would tell you nothing about how far to slide, which is the one question the table exists to answer.",
      ],
    },
    {
      q: "Filtering a log stream against 40 keywords. The best structure is:",
      options: [
        "40 separate regex passes",
        "One Aho-Corasick automaton matching all 40 patterns in a single traversal",
        "A hash set of keywords",
        "Sort the keywords and binary search",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Aho-Corasick reduces 40 passes to one, in O(text + total pattern length + matches).",
      distractors: [
        "Forty passes over the largest object in the pipeline, and a forty-first keyword adds a forty-first pass.",
        "",
        "A hash set answers 'is this whole token a keyword' — genuinely the right answer if the keywords are always complete whitespace-delimited tokens, and useless for finding a keyword inside a longer line.",
        "Binary search needs a position to search at; it does not tell you where in the text a keyword might begin.",
      ],
    },
    {
      q: "A Rabin-Karp hash match means the substrings are:",
      options: [
        "Definitely equal",
        "Possibly equal — you must verify, because different strings can share a hash",
        "Definitely different",
        "Equal in length only",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The hash compresses many characters into one number, so collisions are inevitable. Verification is what keeps the algorithm correct, and its cost is what makes the bound expected rather than worst case.",
      distractors: [
        "This is the assumption that makes Rabin-Karp silently wrong, and the failures are rare and hard to reproduce — the worst combination.",
        "",
        "Backwards. A hash MISmatch proves inequality; a match proves nothing on its own.",
        "Equal length is a precondition of comparing the windows at all, not something the hash tells you.",
      ],
    },
    {
      q: "Searching `aaaa` for `aa`, your KMP returns [0, 2] instead of [0, 1, 2]. What is wrong?",
      options: [
        "The failure function is wrong",
        "After a full match the pattern index is reset to 0 instead of falling back to lps[j−1], so overlapping matches are skipped",
        "The text pointer rewinds",
        "The pattern is too short",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Resetting throws away the suffix of the match that could start the next one. Falling back to lps[j−1] keeps it, exactly as a mismatch would, and finds the occurrence beginning one position later.",
      distractors: [
        "For `aa` the table is [0, 1], which is correct — and the fact that matches are found at all shows the table is doing its job.",
        "",
        "Rewinding the text would produce duplicate or extra matches, not missing ones.",
        "Length is fine. The same bug on a longer pattern would miss the same overlaps, just less visibly.",
      ],
    },
    {
      q: "Why is Rabin-Karp O(n + m) EXPECTED rather than worst case?",
      options: [
        "The rolling hash is approximate",
        "A collision forces a character-by-character check, and an adversary who knows the hash parameters can force one at every position",
        "The modulus operation is slow",
        "It depends on the alphabet size",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Verification is what keeps it correct and also what an adversary attacks. With a fixed textbook modulus, an attacker can construct input that collides everywhere and drive the cost to O(n·m) — which is why the modulus should be chosen randomly at runtime.",
      distractors: [
        "The hash is exact for what it computes; it is simply not injective. Approximation is not the issue — compression is.",
        "",
        "Modulus cost is a constant factor and affects every case equally, not the difference between expected and worst case.",
        "A larger alphabet reduces collisions slightly, but the worst case comes from adversarial construction, not from alphabet statistics.",
      ],
    },
    {
      q: "Your code calls `text.indexOf(pattern)` in a hot loop and is fast. A colleague insists on replacing it with hand-written KMP. Your response?",
      options: [
        "Agree — KMP is O(n + m) and indexOf is O(n·m)",
        "Ask what problem it solves: V8's indexOf uses vector instructions and is usually faster on real patterns; KMP is for worst-case guarantees against untrusted input or unrewindable streams",
        "Suggest a regex instead",
        "Suggest Aho-Corasick",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The better asymptotic bound does not imply the faster program. The quadratic case needs heavy pattern self-overlap and a matching text, which ordinary data does not supply, while the built-in has years of vectorisation behind it. Replacing working fast code with slower code that has a nicer bound is a real and common mistake.",
      distractors: [
        "The bounds are stated correctly and the conclusion still does not follow — this is exactly the reasoning worth pushing back on.",
        "",
        "A regex for a literal string adds compilation and an engine, and gives up the specialised fast path the built-in has for plain substrings.",
        "Aho-Corasick is for many patterns at once. With one pattern it is strictly more machinery for no benefit.",
      ],
    },
    {
      q: "Why does content-defined chunking use a ROLLING hash rather than fixed-size blocks?",
      options: [
        "Rolling hashes are faster to compute",
        "Fixed blocks shift when a byte is inserted, so every subsequent block changes; content-defined boundaries move with the content and only the edited chunk changes",
        "Fixed blocks cannot be hashed",
        "To reduce collisions",
      ],
      answer: 1,
      difficulty: "judge",
      why: "It is about where the boundaries land, not about hashing speed. Insert one byte at the start of a file and every fixed-offset boundary shifts by one, so nothing matches. Boundaries chosen by the content itself survive insertions everywhere except the chunk that changed.",
      distractors: [
        "The rolling hash is what makes evaluating every offset affordable, but speed is the enabler rather than the reason. Fixed blocks are cheaper to hash and still wrong.",
        "",
        "Fixed blocks hash perfectly well. The problem is which bytes end up in which block after an edit.",
        "Collision rate is a property of the hash function, not of how boundaries are chosen.",
      ],
    },
    {
      q: "Aho-Corasick is O(text + total pattern length + number of matches). Why does that last term matter?",
      options: [
        "It never dominates in practice",
        "A rule set where many patterns match everywhere makes the OUTPUT quadratic, however good the automaton is — which is a denial-of-service risk for a detector",
        "It accounts for the trie build",
        "It is the failure-link construction cost",
      ],
      answer: 1,
      difficulty: "judge",
      why: "You cannot report more matches than you report. If a hundred short patterns each match at nearly every position, the automaton is doing optimal work and the result set is still enormous — which is why real intrusion-detection rule sets are audited for pathological patterns.",
      distractors: [
        "It dominates precisely when someone crafts input to make it dominate, which is the case a security tool must survive.",
        "",
        "The trie build is the 'total pattern length' term, which is separate and paid once.",
        "Failure links are also built during that same linear pass over the patterns.",
      ],
    },
  ],
};

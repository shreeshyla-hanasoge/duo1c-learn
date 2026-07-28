import type { Topic } from "../types.ts";

export const complexity: Topic = {
  id: "complexity",
  title: "Complexity analysis",
  tier: 0,
  week: 1,
  depth: "core",
  summary: "Big-O, Big-Θ, amortised analysis, and the space/time trade.",
  why: "Every other decision in this roadmap depends on being able to state a cost honestly. Most real performance problems are not exotic — they are an O(n·w) loop that nobody looked at. In an interview this is the skill being tested even when the question looks like it is about something else: you will be asked 'what is the complexity?' after every single answer you give.",
  complexity: "—",
  learn: {
    intuition:
      "Complexity analysis answers one question: if the input gets bigger, how much slower does this get? Not 'how many milliseconds' — that changes with the laptop, the language, and the mood of the garbage collector. Instead you count how many times the work repeats, as a formula in the input size n. If doubling n doubles the work, that is linear, written O(n). If doubling n makes the work four times as much, that is quadratic, O(n^2). The whole notation exists so that two engineers on a call can agree about which solution survives a hundred times more traffic, without either of them running a benchmark.",
    mechanics: [
      {
        heading: "Name your variables before you count anything",
        body: "This is the step people skip, and skipping it is where wrong answers come from. 'n items' is not enough — say what varies. A loop over n orders, each checking w items in a window, is O(n·w). If w is fixed at 5, that is O(n) with a bad constant factor. If w can grow with n, it is quadratic. Same code, two very different answers, and the only way to tell is to name w.",
      },
      {
        heading: "Count how many times the innermost work runs",
        body: "Walk the code and multiply as you nest. A loop inside a loop over the same n is n × n. A loop inside a loop over a fixed 5 is n × 5. Then add the pieces that run one after another rather than nested — a sort followed by a scan is O(n log n) + O(n), which is just O(n log n).",
      },
      {
        heading: "Drop the constants and the smaller terms",
        body: "O(3n + 100) is O(n), and O(n^2 + n) is O(n^2), because as n grows the largest term decides everything. This is not saying constants do not matter — they decide which code is actually faster today. It is saying they do not decide which code survives growth. Those are two separate questions and you need both answers.",
      },
      {
        heading: "Check what the library calls cost",
        body: "This is the most common source of a hidden factor. In JavaScript, `arr.includes(x)` inside a loop is a scan, so the loop is quadratic. In Python, `x in my_list` is a scan but `x in my_set` is constant. `list.insert(0, x)` shifts every element. A single innocent-looking method call can be the entire complexity of your function.",
      },
      {
        heading: "State the space cost separately",
        body: "Space complexity is the extra memory you allocate as n grows, not counting the input you were handed. Recursion counts: each pending call keeps a frame on the call stack, so a recursion n levels deep is O(n) space even if it allocates nothing itself.",
      },
    ],
    complexityDerivation:
      "Why is dropping constants a legitimate move rather than laziness? Because Big-O is defined as an upper bound that holds beyond some input size: f(n) is O(g(n)) if there is a constant c and a size n0 such that f(n) <= c·g(n) for every n larger than n0. The constant c absorbs any fixed multiplier, so 3n and n land in the same class. The 'beyond n0' part is why small-input behaviour is ignored — and it is also the honest warning attached to the whole notation. For n below n0, the class tells you nothing. An O(n log n) sort routinely loses to O(n^2) insertion sort for n under about 20, which is exactly why every production sort in every standard library switches to insertion sort for small ranges.",
    variants: [
      {
        name: "Big-O — upper bound",
        when: "You are promising a solution will not be worse than something.",
        delta:
          "'Grows no faster than'. O(n) is a technically true statement about an algorithm that is actually O(log n), which is why O on its own is a weak claim.",
      },
      {
        name: "Big-Θ — tight bound",
        when: "You want to state what the cost actually is.",
        delta:
          "Upper and lower bound together. When people say O in conversation they usually mean Θ. In a code review, say what you mean.",
      },
      {
        name: "Amortised",
        when: "One operation is occasionally slow but cannot be slow often.",
        delta:
          "A worst-case claim about a sequence: any n operations cost O(n) in total. Appending to a dynamic array is amortised O(1) even though one append in every n triggers a full copy.",
      },
      {
        name: "Average case",
        when: "You are willing to assume something about the input distribution.",
        delta:
          "Weaker than amortised, because it assumes inputs are typical. Someone who chooses your inputs can break an average-case guarantee — that is exactly how hash-flooding attacks work.",
      },
    ],
    tradeoffs: [
      {
        vs: "Measuring with a profiler",
        pick: "Both, in this order: analyse first, then measure",
        because:
          "Analysis tells you which solution survives ten times the traffic. Measurement tells you which one is faster on today's data. Analysis without measurement ships an asymptotically clever solution with a terrible constant factor. Measurement without analysis ships something that works fine in staging and falls over on sale day.",
      },
      {
        vs: "Optimising the constant factor",
        pick: "Fix the complexity class first, then the constant",
        because:
          "Making a quadratic loop twice as fast buys you a 1.4x bigger input before you are back where you started. Making it linear buys you the whole future. But once the class is right, the constant is all that is left, and that is where removing per-element allocation wins big.",
      },
      {
        vs: "Just adding a cache",
        pick: "Analyse whether the work actually repeats before caching it",
        because:
          "A cache turns repeated identical work into one lookup. It does nothing for a single slow request with a quadratic loop inside it, and it adds a correctness problem — invalidation — that you now own forever.",
      },
    ],
  },
  realWorld: [
    {
      system: "IRCTC Tatkal booking",
      kind: "industry",
      problem:
        "At 10:00 am the request rate jumps by orders of magnitude for a few minutes. Any per-request work that grows with the number of concurrent users turns a working system into an unavailable one within seconds.",
      applied:
        "Seat availability is precomputed and served from a cache rather than recalculated per request, and the booking path is reduced to a small number of constant-time operations against an in-memory store. The design rule is that nothing on the hot path may be O(number of users).",
      impact: "Per-request work stays O(1) as concurrency multiplies",
    },
    {
      system: "Hash-flooding denial of service (CVE-2011-4815 and relatives)",
      kind: "industry",
      problem:
        "Web frameworks in PHP, Python, Ruby, Java and Node all parsed form fields into a hash map. Sending thousands of keys chosen to land in the same slot turns every insert into a linear scan, so the parse degrades from O(n) total to O(n^2).",
      applied:
        "The fix was a randomised hash seed per process, so the attacker cannot predict which keys collide. This is the textbook demonstration of why average-case is a weaker guarantee than amortised: the average assumed typical inputs, and the inputs were chosen to be atypical.",
      impact: "A few hundred KB of POST body could pin a CPU for minutes",
    },
    {
      system: "Standard library sorts (Timsort, introsort, pdqsort)",
      kind: "industry",
      problem:
        "The asymptotically best sort is not the fastest sort on real data, because real arrays are small, partly sorted, or both.",
      applied:
        "Every production sort is a hybrid. Python and Java use Timsort, which detects already-sorted runs and switches to binary insertion sort below about 64 elements. C++ introsort starts as quicksort and switches to heapsort if recursion goes too deep, to hold the worst case at O(n log n).",
      evidence: "CPython Objects/listobject.c · OpenJDK java.util.TimSort",
      impact:
        "Same O(n log n) class, several times faster on the inputs that actually occur",
    },
    {
      system: "traed — strategy backtests",
      kind: "yours",
      problem:
        "A backtest loops over candles and, for each one, recomputes an indicator over a trailing window. Written directly this is O(n·w), and as the lookback grows it becomes quadratic over a multi-year run.",
      applied:
        "Naming the two variables separately — n candles and w window — is what makes the sliding-window or prefix-sum rewrite visible, taking the per-candle cost from O(w) to O(1).",
      impact: "O(n·w) → O(n) over the full history",
    },
  ],
  lab: {
    prompt:
      "Return `true` if the array contains any value more than once, otherwise `false`. The obvious solution using `includes` or `indexOf` inside a loop passes every correctness test below and then fails the complexity gate — which is the entire lesson of this topic. Your budget is O(n) time.",
    fnName: "hasDuplicate",
    signature: "hasDuplicate(nums: number[]): boolean",
    starter: `function hasDuplicate(nums) {
  // Budget: O(n) time. O(n) extra space is fine here.
  // Careful: nums.includes(x) is itself a scan, so calling it
  // inside a loop makes the whole function quadratic.

  return false;
}`,
    tests: [
      { name: "has a duplicate", input: [[1, 2, 3, 2]], expected: true },
      { name: "all distinct", input: [[1, 2, 3, 4]], expected: false },
      { name: "empty array", input: [[]], expected: false },
      { name: "single element", input: [[7]], expected: false },
      {
        name: "duplicate at the two ends",
        input: [[5, 1, 2, 3, 5]],
        expected: true,
      },
      {
        name: "negative numbers",
        input: [[-3, -1, -3]],
        expected: true,
        hidden: true,
      },
      {
        // 0 is falsy in JavaScript, so an `if (seen[x])` style lookup gets this
        // wrong. A Set, or an explicit `.has()`, does not.
        name: "zero is a real value, not absence",
        input: [[0, 1, 2, 0]],
        expected: true,
        hidden: true,
      },
      {
        name: "adjacent duplicates",
        input: [[9, 9]],
        expected: true,
        hidden: true,
      },
    ],
    hints: [
      "You need to answer 'have I seen this value already?' in constant time. Which structure answers membership questions in constant time?",
      "A `Set` does. Walk the array once; for each value, check whether the set already has it, and if not, add it.",
      "Return `true` the moment you find a repeat — no need to finish the scan. The complexity gate runs on an array with no duplicates, so it always measures the full pass.",
    ],
    solution: `function hasDuplicate(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}`,
    complexityGate: {
      target: "O(n)",
      // No duplicates on purpose, so the scan can never exit early. An
      // includes-based solution has to compare every pair and goes quadratic.
      gen: "(n) => [Array.from({ length: n }, (_, i) => i)]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "Big-O is an upper bound, not a promise",
      d: 'O(n) means "grows no faster than n". Θ(n) is the tight claim. In interviews people say O when they mean Θ; in a code review, say what you mean.',
    },
    {
      t: "Amortised is not the same as average",
      d: "A dynamic array push is amortised O(1): any sequence of n pushes costs O(n) in total, guaranteed, for every input. Average case is a claim about a distribution of inputs, which can be violated on purpose. In a latency-sensitive path the difference still matters — amortised means one individual push can be O(n), and that push is somebody's p99.",
    },
    {
      t: "Constants decide which code is faster today",
      d: "O(n) with a pandas `.iloc` call per element loses to O(n log n) over a flat array. Asymptotics tell you which algorithm survives growth; measurement tells you which one is faster now. You need both answers, and they are different questions.",
    },
    {
      t: "Count the work that actually varies",
      d: "A nested loop is not automatically O(n^2). `for i in range(n): for j in range(i-w, i+w)` is O(n·w) — and if w is a fixed window of 5, it is O(n) with a bad constant. Name every variable before you count.",
    },
    {
      t: "Say the space cost out loud too",
      d: "Interviewers listen for it and most candidates forget. Recursion n levels deep is O(n) space on the call stack even with no allocation. A solution that is O(n) time and O(1) space usually beats one that is O(n) time and O(n) space.",
    },
  ],
  pitfalls: [
    'Calling something O(1) because it "looks like a lookup". Hash maps degrade to O(n) with a bad hash function or a hostile set of keys.',
    "Ignoring the cost of building the input. Sorting inside a loop that already runs per element is the most common accidental O(n^2 log n).",
    "Forgetting that string concatenation in a loop copies. Building a string by `s += x` n times is O(n^2) in most languages — collect the pieces in a list and join once.",
    "Quoting an average case as if it were a guarantee. Say which one you mean, especially when the input can be chosen by a user.",
  ],
  quiz: [
    {
      q: "A function loops over n items and, for each, scans a fixed window of the 5 preceding items. What is its complexity?",
      options: ["O(n^2)", "O(n log n)", "O(n)", "O(n · 5!)"],
      answer: 2,
      difficulty: "apply",
      why: "The window is a constant, so the total work is 5n — linear. Constants drop out of the class even though they are very real in a profiler.",
      distractors: [
        "Nested loops are only quadratic when the inner loop grows with n. This one is fixed at 5 whatever n is.",
        "A log factor comes from halving, or from sorting. Nothing here halves anything.",
        "",
        "Factorials appear in permutation problems. Scanning 5 items is 5 steps, not 120.",
      ],
    },
    {
      q: 'What does "amortised O(1)" guarantee that "average O(1)" does not?',
      options: [
        "That every single operation is fast",
        "That any sequence of n operations costs O(n) in total, for every input",
        "That the operation is fast on typical inputs",
        "That there is no worst case",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Amortised is a worst-case claim about a sequence, so no chosen input can break it. Average case is a claim about an input distribution, which can be violated deliberately.",
      distractors: [
        "This is the opposite of what amortised means. It explicitly allows an individual operation to be slow, as long as slow operations are rare.",
        "",
        "That is the definition of average case, which is the weaker guarantee being contrasted here.",
        "There is very much a worst case for a single operation — the resize. The claim is about the total, not about any one step.",
      ],
    },
    {
      q: "Which change most reliably reduces real latency in a hot loop that is already O(n)?",
      options: [
        "Rewriting it as O(log n)",
        "Removing a per-element allocation",
        "Adding a cache in front of it",
        "Parallelising it across cores",
      ],
      answer: 1,
      difficulty: "judge",
      why: "If you must touch every element, you cannot beat O(n), so the win has to come from the constant factor. A per-element allocation is usually the largest constant present.",
      distractors: [
        "You cannot go below O(n) when the answer depends on every element — you have to read them all at least once.",
        "",
        "A cache helps when the same work repeats across calls. It does nothing for one slow pass, and it adds an invalidation problem you now own.",
        "Parallelism divides the constant by the core count at best, and adds coordination cost. Worth doing, but less reliable than deleting the allocation.",
      ],
    },
    {
      q: "In Python, `for x in items: if x in seen_list: ...` where `seen_list` is a list and both grow with n. Complexity?",
      options: ["O(n)", "O(n log n)", "O(n^2)", "O(1) amortised"],
      answer: 2,
      difficulty: "apply",
      why: "`x in a_list` is a linear scan. Running a linear scan inside a linear loop is quadratic. Changing `seen_list` to a set makes the membership test O(1) and the whole loop O(n).",
      distractors: [
        "This would be right if the membership test were constant time. It is constant for a set, not for a list.",
        "There is no halving and no sorting here, so no log factor can appear.",
        "",
        "Amortised O(1) describes appending to a list, not testing membership in one.",
      ],
    },
    {
      q: "Your service is O(n log n) per request. The average latency is fine and p99 is bad. What does that suggest?",
      options: [
        "The complexity analysis is wrong",
        "A small fraction of requests carry a much larger n, or hit a slow path such as a cache miss or a GC pause",
        "You need a faster sorting algorithm",
        "The average is the number that matters",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Complexity describes cost as a function of n. A healthy average with a bad p99 means n itself is skewed, or something outside the algorithm — a resize, a cache miss, a garbage collection pause — is landing on a minority of requests.",
      distractors: [
        "Nothing here contradicts the analysis. Both numbers can be true at once for different values of n.",
        "",
        "Swapping the sort keeps the same class and moves the constant slightly. It does not explain why some requests are far worse than others.",
        "Users experience the tail, not the average. If one request in a hundred takes four seconds, a hundred-request page load is slow every time.",
      ],
    },
    {
      q: "You build a string with `result += chunk` inside a loop that runs n times, each chunk a fixed size. What is the cost?",
      options: [
        "O(n), because each concatenation is one operation",
        "O(n^2), because each concatenation copies the whole string built so far",
        "O(n log n)",
        "O(1), because strings are interned",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Strings are immutable in Python, Java and JavaScript, so `+=` allocates a new string and copies the old contents. The copies total 1 + 2 + 3 + … + n, which is about n^2/2. Collect the pieces in a list and join once instead.",
      distractors: [
        "The `+=` looks like one operation, but it copies everything accumulated so far, and that amount grows every iteration.",
        "",
        "No halving, no sorting, no log factor. The sum of an arithmetic series is quadratic.",
        "Interning deduplicates identical strings. It does not make building a new one free.",
      ],
    },
    {
      q: "Which statement about space complexity is correct?",
      options: [
        "A recursive function that allocates nothing uses O(1) space",
        "A recursion n levels deep uses O(n) space because of the call stack",
        "Space complexity counts the input array",
        "Space and time complexity are always the same class",
      ],
      answer: 1,
      difficulty: "recall",
      why: "Every pending call keeps a frame on the call stack holding its parameters and return address. Depth n means n frames, so O(n) space — and past a few tens of thousands of frames, a stack overflow.",
      distractors: [
        "The frames themselves are the allocation. This is exactly the trap the question is about.",
        "",
        "By convention, space complexity counts the extra memory you allocate, not the input you were handed.",
        "They are frequently different. Two pointers is O(n) time and O(1) space; memoisation is often O(n) time and O(n) space.",
      ],
    },
    {
      q: "An interviewer asks for the complexity and you say 'O(n)'. What is the strongest thing to volunteer next?",
      options: [
        "That it is also Θ(n), plus the space cost and what n actually refers to",
        "That it is fast",
        "That you benchmarked it",
        "That it is better than O(n^2)",
      ],
      answer: 0,
      difficulty: "judge",
      why: "Naming the tight bound shows you know O is only an upper bound. Stating the space cost and defining n shows you know which variables the cost depends on. That combination is what separates a rehearsed answer from an understood one.",
      distractors: [
        "",
        "'Fast' is not a claim anyone can check. It is the word complexity notation exists to replace.",
        "Useful, but it answers a different question. A benchmark at one input size says nothing about growth.",
        "True and unremarkable — it already follows from what you said, so it adds no information.",
      ],
    },
    {
      q: "A team proposes replacing an O(n^2) routine with an O(n log n) one. n is at most 30 and will stay there. Best call?",
      options: [
        "Always take the better complexity class",
        "Keep the simpler code, and write down why",
        "Rewrite it as O(n)",
        "Benchmark both and take whichever is faster today",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Big-O describes behaviour beyond some input size, and n = 30 is not a large input. The quadratic version is very likely faster here and is certainly simpler, and simpler code has fewer bugs. The judgment being tested is recognising when the asymptotic argument does not apply — but record the assumption, because 'n stays small' is exactly the assumption that quietly stops being true.",
      distractors: [
        "This is the reflex answer, and it is wrong here. Complexity classes describe large inputs.",
        "",
        "Optimising harder in a direction that was not the problem. Nothing here says the class is insufficient.",
        "Close and reasonable, but incomplete: a benchmark gives you today's answer without recording the assumption that keeps it valid.",
      ],
    },
  ],
};

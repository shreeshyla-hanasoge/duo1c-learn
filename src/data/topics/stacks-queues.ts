import type { Topic } from "../types.ts";

export const stacksQueues: Topic = {
  id: "stacks-queues",
  title: "Stacks, queues & deques",
  tier: 1,
  week: 5,
  depth: "core",
  summary: "LIFO, FIFO, both ends — and the ring buffer that implements them.",
  why: "A ring buffer is the right structure for every fixed-size rolling history: heart-rate samples, recent ticks, log tails. It allocates once and never again. And the stack is how every nesting problem — brackets, undo, function calls, HTML tags — becomes linear instead of recursive guesswork.",
  complexity: "O(1) all operations",
  learn: {
    intuition:
      "A stack is a pile of plates: you add to the top and you take from the top, so the last thing in is the first thing out. A queue is a line at a counter: you join at the back and leave from the front, so the first thing in is the first thing out. That is genuinely all there is to the definitions — the interesting part is recognising which one a problem needs. The rule of thumb: a stack matches anything nested, because the most recently opened thing must be the first one closed. A queue matches anything fair or level-by-level, because everything that arrived earlier gets served earlier. A deque is both — you may add and remove at either end — and it is what you reach for when a window needs to drop items from the front while accepting them at the back.",
    mechanics: [
      {
        heading: "A stack is an array with push and pop at the end",
        body: "Appending and removing at the end of a dynamic array are both amortised O(1) and touch memory that is already in cache. There is no reason to build a stack out of linked nodes in application code.",
      },
      {
        heading: "A queue is NOT an array with removal at the front",
        body: "`list.pop(0)` in Python and `array.shift()` in JavaScript shift every remaining element one place left, making them O(n). Draining a queue this way is quietly quadratic. Use `collections.deque`, or a ring buffer, or two indices into a fixed array.",
      },
      {
        heading: "A ring buffer is a fixed array plus modular arithmetic",
        body: "Keep `head`, `tail` and a count. Advancing an index means `(i + 1) % capacity`. Nothing is ever shifted and nothing is ever allocated after construction, so memory use is exactly predictable — which is why it is the standard structure in embedded and audio code.",
      },
      {
        heading: "Decide what a full buffer means before you write it",
        body: "Overwrite the oldest entry, or refuse the new one? A rolling metrics window overwrites; a work queue must reject or apply backpressure. This is a product decision that looks like an implementation detail, and getting it wrong silently loses data.",
      },
      {
        heading: "A queue from two stacks costs nothing on average",
        body: "Push onto an in-stack. To pop, take from the out-stack, and when the out-stack is empty, pour the whole in-stack into it — which reverses the order, turning LIFO into FIFO. Each element moves between stacks exactly once in its lifetime.",
      },
    ],
    complexityDerivation:
      "The two-stack queue is the interesting cost argument here. A single dequeue can be expensive: if the out-stack is empty, it moves every element from the in-stack, which is O(n). So the worst case for one operation is linear, and yet the structure is described as O(1). The resolution is to count over a sequence rather than per operation. Each element is pushed onto the in-stack exactly once, moved to the out-stack exactly once, and popped exactly once — three constant-time operations across its whole lifetime, no matter how the calls are interleaved. So any sequence of n operations costs at most 3n steps, which is O(n) in total, or amortised O(1) each. This is a worst-case claim about the sequence, not an average over typical inputs: no ordering of calls can make it worse. That distinction — amortised versus average — is exactly the one interviewers probe when they ask why this is not O(n).",
    variants: [
      {
        name: "Stack (LIFO)",
        when: "Anything nested: brackets, undo, expression evaluation, DFS.",
        delta:
          "The insight is that nesting and last-in-first-out are the same shape. If you can say 'the most recent unclosed thing must close first', you have a stack problem.",
      },
      {
        name: "Queue (FIFO)",
        when: "Fairness, work distribution, breadth-first search.",
        delta:
          "Processing in arrival order is what makes BFS find shortest paths — everything one step away is handled before anything two steps away.",
      },
      {
        name: "Deque",
        when: "You need both ends, typically a sliding window.",
        delta:
          "Add at the back, drop from the front as the window moves, and drop from the back to maintain an ordering. The monotonic deque is built entirely on this.",
      },
      {
        name: "Ring buffer",
        when: "Fixed-size rolling history with no allocation after startup.",
        delta:
          "One array, two indices, modular arithmetic. Constant memory, perfect locality, and the basis of lock-free single-producer single-consumer queues.",
      },
    ],
    tradeoffs: [
      {
        vs: "Recursion",
        pick: "An explicit stack when depth can be large or you need to inspect the state",
        because:
          "Recursion IS a stack — the call stack. Making it explicit removes the stack-overflow risk on deep inputs and lets you pause, resume or inspect the traversal. The cost is more code, so use recursion when depth is bounded and clarity matters.",
      },
      {
        vs: "Dynamic array for rolling history",
        pick: "Ring buffer",
        because:
          "A dynamic array either grows without bound or needs items removed from the front, which is O(n). A ring buffer has a fixed memory footprint, zero steady-state allocation and no garbage-collection churn — decisive on embedded targets and in latency-sensitive loops.",
      },
      {
        vs: "An unbounded queue",
        pick: "A bounded queue with an explicit full policy",
        because:
          "An unbounded queue does not remove backpressure, it hides it. When the consumer cannot keep up, the queue grows until memory runs out, and the failure arrives far from the cause. A bounded queue forces you to decide what happens on overload while you are still designing.",
      },
    ],
  },
  realWorld: [
    {
      system: "The call stack in every language runtime",
      kind: "industry",
      problem:
        "When a function returns, execution must resume exactly where it left off, several levels deep, with the right local variables.",
      applied:
        "Each call pushes a frame holding parameters, locals and the return address; each return pops it. Nesting maps onto last-in-first-out perfectly. A stack overflow is literally this structure hitting its size limit.",
    },
    {
      system: "Audio and real-time pipelines",
      kind: "industry",
      problem:
        "An audio callback must complete within a few milliseconds, every time. An allocation or a garbage-collection pause inside it causes an audible glitch.",
      applied:
        "Samples move through a pre-allocated ring buffer with atomic head and tail indices, so the producer and consumer never block each other and nothing allocates in the audio thread. The single-producer single-consumer ring buffer is the standard lock-free structure for this.",
      impact: "Zero allocation on the real-time path",
    },
    {
      system: "Kafka and log-structured message queues",
      kind: "industry",
      problem:
        "Message ordering must be preserved per partition, and consumers proceed at different speeds without the broker tracking each one's position individually in memory.",
      applied:
        "Each partition is an append-only log read in order — a queue whose read position is just an offset. Ordering falls out of the structure rather than being enforced on top of it.",
    },
    {
      system: "traed — recent tick and candle history",
      kind: "yours",
      problem:
        "Strategies need the last N ticks or candles continuously. A list that grows forever leaks memory, and trimming from the front is O(n) per tick.",
      applied:
        "A ring buffer of fixed capacity, overwriting the oldest entry. Memory is bounded and known at startup, there is no allocation in the tick path, and the 'last N' question is answered by two indices.",
      impact: "Unbounded growth with O(n) trimming → fixed memory, O(1) per tick",
    },
  ],
  lab: {
    prompt:
      "Return `true` if the brackets in the string are balanced and correctly nested. The string contains only `(`, `)`, `[`, `]`, `{` and `}`. `'([{}])'` is balanced; `'([)]'` is not, because the square bracket closes while a round one is still open. Budget: O(n) — repeatedly deleting matched pairs from the string is correct and quadratic.",
    fnName: "isBalanced",
    signature: "isBalanced(s: string): boolean",
    starter: `function isBalanced(s) {
  // Budget: O(n).
  // An opening bracket must be closed by the matching kind, and the
  // most recently opened one must be the first to close.

  return false;
}`,
    tests: [
      { name: "simple pairs", input: ["()[]{}"], expected: true },
      { name: "properly nested", input: ["([{}])"], expected: true },
      { name: "wrong closing kind", input: ["(]"], expected: false },
      { name: "crossed, not nested", input: ["([)]"], expected: false },
      { name: "empty string is balanced", input: [""], expected: true },
      {
        // A counter-based solution passes "()" and fails here, because it
        // never checks that the closer matches the most recent opener.
        name: "unclosed opener at the end",
        input: ["((("],
        expected: false,
        hidden: true,
      },
      {
        // A stack solution that forgets to check for an empty stack before
        // popping returns true here, or throws.
        name: "closer with nothing open",
        input: [")("],
        expected: false,
        hidden: true,
      },
      {
        name: "deeply nested",
        input: ["((((((()))))))"],
        expected: true,
        hidden: true,
      },
    ],
    hints: [
      "Walk the string once. Push every opening bracket onto a stack.",
      "On a closing bracket, the stack's top must be the matching opener. If the stack is empty, or the top does not match, the string is unbalanced — return false immediately.",
      "At the end the stack must be EMPTY. A non-empty stack means openers were never closed, which is what makes '(((' fail.",
    ],
    solution: `function isBalanced(s) {
  const closes = { ")": "(", "]": "[", "}": "{" };
  const stack = [];

  for (const c of s) {
    if (c === "(" || c === "[" || c === "{") {
      stack.push(c);
    } else {
      // Nothing open, or the wrong kind is open.
      if (stack.pop() !== closes[c]) return false;
    }
  }

  // Anything left open means it was never closed.
  return stack.length === 0;
}`,
    complexityGate: {
      target: "O(n)",
      // Fully nested and balanced, so no solution can exit early — the
      // stack grows to n/2 and unwinds completely.
      gen: "(n) => ['('.repeat(Math.floor(n / 2)) + ')'.repeat(Math.floor(n / 2))]",
      sizes: [4000, 8000, 16000, 32000],
    },
  },
  insights: [
    {
      t: "A ring buffer is a fixed array plus modular arithmetic",
      d: "`head`, `tail`, and a count. No allocation after construction, perfect memory locality, and a natural fit for memory-constrained targets such as a watch with 256 KB.",
    },
    {
      t: "Choose between overwrite and reject on full",
      d: "A rolling metrics buffer overwrites the oldest entry; a work queue must reject or block. Deciding this is a product decision, not an implementation detail.",
    },
    {
      t: "A queue from two stacks is amortised O(1)",
      d: "Push onto the in-stack; pop from the out-stack, refilling it only when it is empty. Each element moves between stacks exactly once in its lifetime.",
    },
    {
      t: "Nesting means stack",
      d: "Brackets, HTML tags, undo history, expression evaluation, function calls, depth-first search. If the most recently opened thing must close first, you are looking at a stack problem.",
    },
    {
      t: "Never use a plain list as a queue",
      d: "`pop(0)` and `shift()` are O(n). It is the most common quiet quadratic in Python and JavaScript code, and the fix is a one-line import.",
    },
  ],
  pitfalls: [
    "Popping from an empty stack. In JavaScript this returns `undefined` and continues silently; in Python it raises. Check before you pop.",
    "Forgetting to check the stack is empty at the end. '(((' leaves three unclosed openers and every individual step looked fine.",
    "Counting brackets instead of matching them. A counter says '([)]' is balanced, because it never checks WHICH bracket is closing.",
    "Using an unbounded queue to 'avoid backpressure'. It defers the failure to an out-of-memory error far from the cause.",
  ],
  quiz: [
    {
      q: "Implementing a queue with two stacks gives what dequeue cost?",
      options: [
        "O(1) worst case",
        "Amortised O(1)",
        "O(n) every time",
        "O(log n)",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A single dequeue can trigger an O(n) transfer, but each element is moved only once in its lifetime, so any sequence of n operations costs O(n) in total.",
      distractors: [
        "One dequeue genuinely can be O(n), when the out-stack is empty and everything has to be poured across.",
        "",
        "Only the transfer is O(n), and it happens at most once per element, not once per dequeue.",
        "Nothing here halves or forms a tree, so a log bound has nowhere to come from.",
      ],
    },
    {
      q: "The main advantage of a ring buffer over a dynamic array for rolling history is:",
      options: [
        "Faster indexing",
        "It never allocates after construction, so there is no GC churn or reallocation stall",
        "It can grow without limit",
        "It is easier to implement",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A fixed memory footprint and zero steady-state allocation are decisive on embedded targets and in latency-sensitive loops, where an allocation pause is the failure.",
      distractors: [
        "Indexing is one extra modulo operation, so it is marginally slower, not faster.",
        "",
        "The opposite — a ring buffer has a fixed capacity by design, which is the entire point.",
        "A dynamic array is easier. You accept slightly more code to gain predictable memory.",
      ],
    },
    {
      q: "Which problem does NOT naturally map to a stack?",
      options: [
        "Validating nested brackets",
        "Undo in a text editor",
        "Serving requests in the order they arrived",
        "Evaluating an expression in postfix notation",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Arrival order is first-in-first-out, which is a queue. The other three all have the 'most recent one first' structure that a stack captures.",
      distractors: [
        "Nested structure — the most recently opened bracket must close first.",
        "The most recent action is undone first.",
        "",
        "Operands are pushed and the most recent two are consumed by each operator.",
      ],
    },
    {
      q: "In Python, `queue = []` with `queue.append(x)` and `queue.pop(0)`. What is wrong?",
      options: [
        "Nothing",
        "`pop(0)` shifts every remaining element, making it O(n) — draining n items costs O(n^2)",
        "`append` is O(n)",
        "Lists cannot hold arbitrary objects",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A list is a contiguous array, so removing the front element moves everything after it. `collections.deque` gives O(1) at both ends and is a one-line change.",
      distractors: [
        "It works and is quadratic, which is exactly the kind of bug that passes review and fails in production.",
        "",
        "`append` is amortised O(1) — that end is fine. It is the front that hurts.",
        "They hold anything. Not a real limitation.",
      ],
    },
    {
      q: "Your bounded work queue is full. Which policy is appropriate for a payment-processing pipeline?",
      options: [
        "Overwrite the oldest entry",
        "Reject the new item and signal backpressure to the producer",
        "Grow the queue",
        "Drop a random entry",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Every item must be processed exactly once, so silently discarding any of them is unacceptable. Rejecting and signalling backpressure pushes the decision back to the producer, which can retry or slow down. Overwriting is right for a metrics buffer, where the newest data matters and old samples are disposable.",
      distractors: [
        "This silently loses a payment. Correct for rolling metrics, catastrophic here.",
        "",
        "Growing hides the overload until memory runs out, and then the failure arrives far from its cause.",
        "Loses a payment and makes the loss unreproducible.",
      ],
    },
    {
      q: "A bracket validator uses a counter that increments on `(` and decrements on `)`, returning true when it ends at 0 and never goes negative. What does it get wrong?",
      options: [
        "Nothing, for a single bracket kind",
        "It cannot handle multiple bracket kinds — it accepts '([)]' because it never records WHICH bracket is open",
        "It is too slow",
        "It fails on empty input",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A counter tracks how many are open but not what kind, so it cannot detect crossing. That is precisely the information a stack keeps. For one bracket kind, the counter is correct and uses O(1) space instead of O(n) — a genuinely better answer when it applies.",
      distractors: [
        "Correct, and worth saying out loud: with one bracket kind the counter is both correct and more space-efficient.",
        "",
        "It is O(n) and fast. Correctness is what fails.",
        "Empty input ends at 0 and returns true, which is the right answer.",
      ],
    },
    {
      q: "You must convert deep recursion into iteration to avoid a stack overflow. What replaces the call stack?",
      options: [
        "A queue",
        "An explicit stack holding the state each pending call would have kept",
        "A hash map",
        "Nothing — rewrite it as a loop",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Recursion is a stack — the call stack. Converting it means storing the same information yourself: the arguments and the point to resume from. This also lets you pause and inspect a traversal, which recursion does not.",
      distractors: [
        "A queue changes the traversal order from depth-first to breadth-first, which is a different algorithm and usually a different answer.",
        "",
        "A map has no ordering, and order of resumption is the whole thing being modelled.",
        "Only tail recursion collapses into a plain loop. Anything doing work after the recursive call needs its state stored somewhere.",
      ],
    },
    {
      q: "Why is a single-producer single-consumer ring buffer implementable without locks?",
      options: [
        "Because it is small",
        "Only one thread writes the head index and only one writes the tail, so no index has two writers to coordinate",
        "Because modular arithmetic is atomic",
        "It is not — it needs a mutex",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Locks exist to stop two writers from colliding. Here each index has exactly one writer and one reader, so ordinary atomic loads and stores with the right memory ordering are enough. Add a second producer and this argument collapses.",
      distractors: [
        "Size is irrelevant to whether concurrent access is safe.",
        "",
        "The modulo is not atomic and does not need to be — it is applied to a value only one thread writes.",
        "It is a standard lock-free structure, used in audio and network drivers precisely to avoid locks.",
      ],
    },
  ],
};

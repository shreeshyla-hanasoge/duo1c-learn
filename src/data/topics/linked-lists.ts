import type { Topic } from "../types.ts";

export const linkedLists: Topic = {
  id: "linked-lists",
  title: "Linked lists & cycle detection",
  tier: 1,
  week: 5,
  depth: "core",
  summary: "Single, double, in-place reversal, and Floyd's tortoise and hare.",
  why: "Rarely the right production structure on its own — but the pointer-manipulation reflexes transfer directly to LRU caches, ring buffers, garbage collectors and every intrusive list in systems code. Interviews use linked lists heavily precisely because they cannot be faked: either you can rewire pointers without losing the list, or you cannot.",
  complexity: "O(1) insert/delete at a known node · O(n) to find anything",
  viz: ["floyd-cycle"],
  learn: {
    intuition:
      "A linked list stores each value in its own small box, and each box holds the address of the next one. Nothing is next to anything else in memory. That single difference from an array explains all of its behaviour. There is no way to jump to position 500 — you have to start at the front and follow 500 addresses. But if somebody hands you a box and says 'delete this one', you can do it by changing one address, without moving any other data. So the linked list is bad at finding and good at rewiring, which is the exact opposite of an array. In practice this means it is almost never the right choice on its own, and almost always the right choice when it is embedded inside something else that already knows where the node is.",
    mechanics: [
      {
        heading: "A node is a value plus a pointer to the next node",
        body: "The list is a chain of these, and you hold only the head. The last node points to null, which is how you know you have reached the end. A doubly linked list adds a pointer back to the previous node, which costs memory but lets you delete a node you were handed without walking to find its predecessor.",
      },
      {
        heading: "Use a dummy head node to delete the special cases",
        body: "Most linked-list bugs are the empty list and the single-element list. Create a sentinel node that sits before the real head, do all your work relative to it, and return `dummy.next` at the end. Both special cases disappear, and so do most of the bugs.",
      },
      {
        heading: "Reversal is exactly three pointers",
        body: "`prev` starts null, `cur` starts at the head. In each step: save `cur.next` into `nxt`, point `cur.next` at `prev`, move `prev` to `cur`, move `cur` to `nxt`. Save the next pointer BEFORE you overwrite it — forgetting that is how you lose the rest of the list.",
      },
      {
        heading: "Two pointers at different speeds find structure",
        body: "Advance one pointer one step and another two steps. When the fast one reaches the end, the slow one is at the middle. If there is a loop, the fast one will lap the slow one, and they must meet. This is Floyd's tortoise and hare, and it uses no extra memory at all.",
      },
      {
        heading: "Finding the start of the loop is a second phase",
        body: "Once they meet, put one pointer back at the head and advance both one step at a time. Where they meet again is the first node of the loop. The algebra is worth doing once so it stops feeling like a magic trick.",
      },
    ],
    complexityDerivation:
      "Why must the tortoise and hare meet inside a loop? Once both pointers are inside the cycle, look at the gap between them measured forward along the cycle. Each step, the slow pointer advances 1 and the fast advances 2, so the gap shrinks by exactly 1 every step. A quantity that decreases by exactly 1 each step and lives on a finite circle must reach 0 — it cannot skip past it. So they meet, in at most as many steps as the cycle is long. Total work is O(n). Now the second phase. Let F be the distance from the head to the cycle entry, and let the meeting point be a distance a into the cycle, with cycle length C. The slow pointer travelled F + a; the fast pointer travelled twice that, F + a + kC for some whole number k of extra laps. So 2(F + a) = F + a + kC, which gives F + a = kC, that is F = kC − a. Read that as: walking F steps from the head, and walking F steps forward from the meeting point, both land on the cycle entry — because kC − a steps from the meeting point is exactly a whole number of laps back to the entry. Hence one pointer from the head and one from the meeting point, moving one step each, meet precisely at the entry.",
    variants: [
      {
        name: "Singly linked",
        when: "You only ever move forward.",
        delta:
          "One pointer per node. Deleting a node requires its predecessor, which is why you often walk with a trailing pointer.",
      },
      {
        name: "Doubly linked",
        when: "You need to delete a node you were handed, or walk backwards.",
        delta:
          "Two pointers per node. This is what makes an LRU cache work — the hash map hands you the node and the list unlinks it in O(1).",
      },
      {
        name: "Circular",
        when: "Round-robin scheduling, or a buffer with no natural end.",
        delta:
          "The last node points back to the first. There is no null terminator, so you track position by counting or by a marker node.",
      },
      {
        name: "Intrusive list",
        when: "Systems code, kernels, allocators.",
        delta:
          "The next and previous pointers live inside the object itself rather than in a separate node wrapper. No extra allocation per element, and an object can be on several lists at once.",
      },
    ],
    tradeoffs: [
      {
        vs: "Dynamic array",
        pick: "Array almost always, linked list when you already hold the node",
        because:
          "The textbook claim that linked lists insert in O(1) hides the O(n) walk to reach the position. Add a cache miss per node and an allocation per element, and arrays win on nearly every real workload. The exception is real: an LRU cache's hash map hands you the node directly, so there is no walk.",
      },
      {
        vs: "Floyd's algorithm versus a visited set",
        pick: "The set for clarity, Floyd when memory is the constraint",
        because:
          "A set of seen nodes is three lines and obviously correct, at O(n) memory. Floyd is O(1) memory and needs the meeting argument to justify. In an interview, mention the set first and then produce Floyd — that sequence shows you know both and chose.",
      },
      {
        vs: "Recursive versus iterative traversal",
        pick: "Iterative for anything that could be long",
        because:
          "Recursion over a list uses one stack frame per node, so a list of a million nodes overflows the stack. The iterative version uses three variables. Some languages optimise tail calls away; Python and JavaScript in practice do not.",
      },
    ],
  },
  realWorld: [
    {
      system: "LRU caches everywhere (Redis, browser caches, OS page caches)",
      kind: "industry",
      problem:
        "You need 'move this entry to most-recently-used' in constant time, and finding the entry by key must also be constant time.",
      applied:
        "A hash map from key to node, plus a doubly linked list holding the usage order. The map answers 'where is it', and because the list is doubly linked, unlinking and reinserting at the front is O(1) with no search. Neither structure can do this alone.",
      impact: "O(n) reordering → O(1)",
    },
    {
      system: "Memory allocators (free lists)",
      kind: "industry",
      problem:
        "A general-purpose allocator must find a free block of a suitable size quickly, and must return freed blocks without scanning memory.",
      applied:
        "Free blocks are threaded into linked lists by size class, with the pointers stored inside the free blocks themselves. Allocation pops from a list; freeing pushes onto one. The list costs no extra memory because it lives in memory that is not currently in use.",
      impact: "Constant-time allocate and free for common sizes",
    },
    {
      system: "Linux kernel `list_head`",
      kind: "industry",
      problem:
        "Kernel objects need to appear on several lists at once — a run queue, a timer list, a device list — without an allocation per membership.",
      applied:
        "An intrusive circular doubly linked list. The `list_head` struct is embedded in the object, and `container_of` recovers the object from the pointer. Membership costs two pointers and no allocation.",
      evidence: "Linux include/linux/list.h",
    },
    {
      system: "Git commit history",
      kind: "industry",
      problem:
        "Each commit must record what came before it, in a structure that can be extended without rewriting history.",
      applied:
        "Every commit stores the hash of its parent — a linked list running backwards through time, branching into a DAG at merges. Walking `git log` is exactly following next pointers, which is why it is fast going backwards and why finding descendants of a commit is not.",
    },
  ],
  lab: {
    prompt:
      "Reverse a singly linked list in place and return the new head. A node is `{ value, next }`, with `next` being `null` at the end. Do not build a new list and do not use an array — rewire the existing nodes. This is the single most common linked-list interview question, and the one people most often get subtly wrong.",
    fnName: "reverseList",
    signature: "reverseList(head: Node | null): Node | null",
    starter: `function reverseList(head) {
  // Three pointers: prev, cur, and a saved next.
  // Save cur.next BEFORE you overwrite it, or you lose the rest
  // of the list and there is no way back.

  return head;
}`,
    tests: [
      {
        name: "three nodes",
        input: [{ value: 1, next: { value: 2, next: { value: 3, next: null } } }],
        expected: { value: 3, next: { value: 2, next: { value: 1, next: null } } },
      },
      {
        name: "two nodes",
        input: [{ value: 1, next: { value: 2, next: null } }],
        expected: { value: 2, next: { value: 1, next: null } },
      },
      {
        name: "single node",
        input: [{ value: 7, next: null }],
        expected: { value: 7, next: null },
      },
      {
        name: "empty list",
        input: [null],
        expected: null,
      },
      {
        name: "duplicate values are still distinct nodes",
        input: [{ value: 4, next: { value: 4, next: null } }],
        expected: { value: 4, next: { value: 4, next: null } },
      },
      {
        // The old head must terminate the reversed list. Returning `head`
        // instead of `prev` leaves a one-node list here and passes the
        // single-node test, which is why that test alone is not enough.
        name: "the old head must become the tail",
        input: [{ value: 1, next: { value: 2, next: { value: 3, next: { value: 4, next: null } } } }],
        expected: { value: 4, next: { value: 3, next: { value: 2, next: { value: 1, next: null } } } },
        hidden: true,
      },
      {
        name: "values are preserved, not recreated",
        input: [{ value: 0, next: { value: -1, next: null } }],
        expected: { value: -1, next: { value: 0, next: null } },
        hidden: true,
      },
      {
        name: "five nodes",
        input: [{ value: 1, next: { value: 2, next: { value: 3, next: { value: 4, next: { value: 5, next: null } } } } }],
        expected: { value: 5, next: { value: 4, next: { value: 3, next: { value: 2, next: { value: 1, next: null } } } } },
        hidden: true,
      },
    ],
    hints: [
      "Start with `prev = null` and `cur = head`. `prev` is the part you have already reversed; `cur` is where you are now.",
      "In each step you need four moves in this order: save `cur.next`, point `cur.next` at `prev`, move `prev` to `cur`, move `cur` to the saved next.",
      "Return `prev`, not `head`. When the loop ends `cur` is null and `prev` is sitting on the last node you processed, which is the new head.",
    ],
    solution: `function reverseList(head) {
  let prev = null;
  let cur = head;

  while (cur !== null) {
    const nxt = cur.next;   // save it first — the next line destroys it
    cur.next = prev;        // flip the arrow backwards
    prev = cur;             // the reversed part now ends at cur
    cur = nxt;              // carry on with the rest
  }

  // cur is null; prev is the last node visited, which is the new head.
  return prev;
}`,
  },
  insights: [
    {
      t: "Floyd needs O(1) space; a visited set needs O(n)",
      d: "The tortoise and hare close the gap by exactly one node per step, so inside a loop they must meet. No allocation, and no hashing of node identities.",
    },
    {
      t: "Phase two finds the loop entry, and the algebra is worth doing once",
      d: "After they meet, reset one pointer to the head and advance both one step at a time. They meet at the first node of the loop. Derive it once and it stops feeling like magic.",
    },
    {
      t: "In-place reversal is three pointers",
      d: "`prev`, `cur`, `next`. Save next, point cur back at prev, shuffle forward. Write it until it is muscle memory — it is a component of half the harder list problems.",
    },
    {
      t: "A dummy head deletes the special cases",
      d: "Most list bugs are the empty-list and single-element cases. A sentinel node before the real head removes both branches entirely.",
    },
    {
      t: "The real use is when something else holds the node",
      d: "A linked list on its own is usually worse than an array. Paired with a hash map that hands you the node — an LRU cache — it does something no array can.",
    },
  ],
  pitfalls: [
    "Overwriting `cur.next` before saving it. The rest of the list becomes unreachable and there is no way to recover it.",
    "Returning `head` after reversing. `head` is now the tail; the new head is `prev`.",
    "Recursing over a long list. One stack frame per node means a stack overflow somewhere in the tens of thousands.",
    "Deleting a node in a singly linked list without its predecessor. You cannot — unless you copy the next node's value into this one and delete that instead, which fails on the last node.",
  ],
  quiz: [
    {
      q: "Floyd's cycle detection uses O(1) space. A hash-set approach uses:",
      options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
      answer: 2,
      difficulty: "recall",
      why: "You must remember every node seen. That is the trade — the set version is easier to write and obviously correct, Floyd is the one that runs in constant memory.",
      distractors: [
        "That is Floyd's cost, which is the whole reason Floyd is worth knowing.",
        "Nothing here is halving or tree-shaped, so a log bound cannot arise.",
        "",
        "You store each node at most once, so the set never exceeds n entries.",
      ],
    },
    {
      q: "After the tortoise and hare meet, how do you find the first node of the cycle?",
      options: [
        "Walk forward from the meeting point until you loop",
        "Reset one pointer to the head, then advance both one step at a time until they meet again",
        "Count the cycle length, then advance one pointer that many steps",
        "It cannot be recovered without extra space",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The distance from the head to the entry equals the distance from the meeting point to the entry, once you account for whole laps. So both pointers, moving one step at a time, arrive together.",
      distractors: [
        "That finds the meeting point again and tells you the cycle length, not where the cycle begins.",
        "",
        "This is part of an alternative method — advance one pointer C steps ahead, then move both together — but advancing a single pointer by C from the meeting point just returns to the meeting point.",
        "It is fully recoverable in O(1) space, which is exactly what makes Floyd's second phase worth learning.",
      ],
    },
    {
      q: "While reversing a list you write `cur.next = prev` before saving `cur.next`. What happens?",
      options: [
        "Nothing — the assignment is atomic",
        "The rest of the list becomes unreachable, so you end up with a two-node list",
        "It throws a null pointer error",
        "The list reverses but the values are wrong",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The only reference to the remainder of the list was `cur.next`. Overwriting it drops that reference, and nothing else points there. The loop then terminates almost immediately.",
      distractors: [
        "Atomicity is about concurrency and is irrelevant. The problem is that the old value is gone.",
        "",
        "There is nothing null to dereference — the assignment succeeds. It succeeds at destroying your list.",
        "Values are never touched by reversal; only the pointers change. The failure is structural.",
      ],
    },
    {
      q: "Why is a doubly linked list required for an LRU cache, rather than a singly linked one?",
      options: [
        "It is faster to traverse",
        "The hash map hands you a node directly, and unlinking it needs its predecessor — which only a backward pointer provides in O(1)",
        "It uses less memory",
        "Singly linked lists cannot be circular",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The entire value of the design is that no search happens. With only forward pointers you would have to walk from the head to find the predecessor, which is O(n) and destroys the guarantee.",
      distractors: [
        "Traversal speed is the same in both, and an LRU cache barely traverses at all.",
        "",
        "It uses more — one extra pointer per node. You pay that memory to buy the O(1) unlink.",
        "They can be circular. Direction of links and circularity are independent choices.",
      ],
    },
    {
      q: "You are handed a node in the MIDDLE of a singly linked list and told to delete it. You do not have the head. Possible?",
      options: [
        "No",
        "Yes — copy the next node's value into this node, then unlink the next node",
        "Yes — set the node to null",
        "Only if the list is doubly linked",
      ],
      answer: 1,
      difficulty: "judge",
      why: "You cannot remove this node's box, but you can make it hold the next node's value and then remove that box instead. The observable list is correct. It fails if the node is the last one, which is why the question says 'middle'.",
      distractors: [
        "It is possible with the copy trick, which is exactly why this is a classic interview question.",
        "",
        "Setting a local variable to null changes nothing about the list — the previous node still points at the same box.",
        "A doubly linked list makes it straightforward, but the copy trick means singly linked is not a blocker for a middle node.",
      ],
    },
    {
      q: "A recursive `reverseList` on a list of 1,000,000 nodes. What happens?",
      options: [
        "It works, just slowly",
        "Stack overflow — one frame per node, and typical stack limits are in the tens of thousands",
        "It uses O(1) space because it is tail recursive",
        "It reverses only part of the list",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Every pending call keeps a frame. A million frames far exceeds the default stack in Python, Java, JavaScript and C. Some languages eliminate tail calls, but the common implementations of Python and JavaScript do not.",
      distractors: [
        "It does not complete at all — it crashes. That is a different failure from being slow.",
        "",
        "Even where the recursion is written tail-recursively, CPython and V8 do not eliminate tail calls, so the frames still accumulate.",
        "It reverses nothing — the crash happens on the way down, before any rewiring completes.",
      ],
    },
    {
      q: "What is the strongest argument AGAINST using a linked list for a list of a million integers?",
      options: [
        "Insertion is slow",
        "Every node is a separate allocation in a different place in memory, so iteration pays a cache miss per element and uses several times the memory",
        "Linked lists cannot hold integers",
        "They are harder to write",
      ],
      answer: 1,
      difficulty: "judge",
      why: "A 4-byte integer becomes a node with an 8-byte pointer plus allocator overhead, and the nodes are scattered. An array walk fetches roughly 16 values per memory access; a list walk fetches one and stalls.",
      distractors: [
        "Insertion at a known node is genuinely fast. The problem is everything else.",
        "",
        "They hold anything. This is not a real limitation.",
        "True and irrelevant to whether the structure fits the job.",
      ],
    },
    {
      q: "In the tortoise-and-hare loop, why is the gap between the pointers guaranteed to reach exactly zero?",
      options: [
        "Because the cycle length is even",
        "Because the gap shrinks by exactly 1 each step, and a value decreasing by 1 on a finite circle cannot skip past 0",
        "Because the fast pointer is twice as fast",
        "It is not guaranteed; it is probabilistic",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The fast pointer gains one position per step, so the gap goes …3, 2, 1, 0 with nothing skipped. If the fast pointer moved three steps at a time the gap would shrink by 2 and could jump over 0, which is why the classic version uses 1 and 2.",
      distractors: [
        "Cycle length has no parity requirement. The argument works for any length.",
        "",
        "Close, and it is the reason the gap shrinks — but the guarantee comes from the gap shrinking by exactly one, not merely from being faster.",
        "It is a deterministic guarantee with a short proof. Nothing here is random.",
      ],
    },
  ],
};

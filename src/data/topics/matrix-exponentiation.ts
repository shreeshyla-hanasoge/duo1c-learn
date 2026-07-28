import type { Topic } from "../types.ts";

export const matrixExponentiation: Topic = {
  id: "matrix-exponentiation",
  title: "Matrix exponentiation",
  tier: 4,
  week: 20,
  depth: "core",
  summary: "Fast linear recurrences and n-step Markov transitions.",
  why: "Computing where a Markov chain lands after n steps without iterating n times.",
  complexity: "O(k³ log n)",
  learn: {
    intuition:
      "To compute x to the power of 100 you do not multiply x by itself a hundred times. You square it to get x², square that for x⁴, again for x⁸, and combine the powers of two that add up to 100 — about seven multiplications rather than a hundred. That is binary exponentiation, and the only thing it needs from the operation is associativity: that grouping the multiplications differently gives the same answer. Matrix multiplication is associative. So the same trick works, and the interesting part is what it lets you skip. One step of a Markov chain is a multiplication by the transition matrix. One step of a linear recurrence like Fibonacci is also a multiplication by a fixed matrix — `[[1,1],[1,0]]` maps the pair (F(n), F(n-1)) to (F(n+1), F(n)). So 'where is the chain after a million steps' and 'what is the millionth Fibonacci number' are both 'raise this matrix to the millionth power', which is about twenty matrix multiplications instead of a million. You have jumped a million steps forward without simulating any of them, and that is a genuinely different capability rather than a constant-factor saving.",
    mechanics: [
      {
        heading: "Turn the recurrence into a matrix",
        body: "Write the state as a vector of the last k values. For Fibonacci the state is `[F(n), F(n-1)]` and the matrix `[[1,1],[1,0]]` advances it one step, because the top row computes `F(n) + F(n-1)` and the bottom row just shifts. Any recurrence where the next term is a fixed linear combination of the previous k has such a matrix: the first row holds the coefficients, and the rest is an identity block shifted down to carry the history along.",
      },
      {
        heading: "Square and multiply",
        body: "Walk the bits of the exponent. Keep a running result starting at the identity matrix and a running square starting at the base. At each bit, if it is set, multiply the result by the current square; then square the base and move on. About log₂(n) iterations, each doing one or two matrix multiplications.",
      },
      {
        heading: "The identity matrix is the base case",
        body: "Raising to the power zero must give the identity — ones on the diagonal, zeros elsewhere — because that is what leaves any vector unchanged. Starting the accumulator at the base matrix instead is the standard off-by-one here, and it produces an answer that is right for some exponents and wrong for others, which is the worst kind of wrong.",
      },
      {
        heading: "Take the modulus inside the multiplication",
        body: "The entries grow exponentially — Fibonacci passes what a double can represent exactly by about the ninetieth term. Reduce after every multiply-and-add, not at the end. In JavaScript that also caps how large the modulus may be: a product of two residues must stay under 2^53, so the modulus must be below about 94 million, or you need BigInt. Getting this wrong gives silently rounded answers rather than an error.",
      },
      {
        heading: "Know when it is the wrong tool",
        body: "This only works when each step is the *same* linear map. A recurrence whose coefficients change with n has no single matrix to raise. A non-linear recurrence has no matrix at all. And when k is large the k³ per multiplication dominates — for a fifty-state chain that is 125,000 operations per multiply, so the crossover against just iterating moves a long way out. Check both conditions before proposing it.",
      },
    ],
    complexityDerivation:
      "Binary exponentiation performs about log₂(n) squarings plus at most log₂(n) extra multiplications, so O(log n) matrix multiplications in total. A naive multiplication of k×k matrices is O(k³), giving O(k³ log n) overall. Compare that with iterating: n steps at O(k²) each — a matrix-vector product rather than a matrix-matrix one — which is O(n·k²). So the exponentiation wins when k³ log n beats n k², that is when log n / n beats 1 / k. For a small chain, say k = 4, and n = 10⁶, it is 64 × 20 ≈ 1,300 operations against 16 million. For k = 500 and n = 1,000, it is 125 million × 10 against 250 million, and iterating wins comfortably. That crossover is the whole engineering content of this topic and it is why the answer to 'should we use matrix exponentiation' is always 'how big is k, and how big is n'. One caveat worth stating: for Fibonacci specifically there is a closed form, Binet's formula, which is O(1) — and it is unusable for large n because floating-point precision fails long before the numbers do. A fast method that quietly returns wrong answers is worse than a slower exact one, which is why the matrix version is what actually gets used.",
    variants: [
      {
        name: "Linear recurrences",
        when: "F(n) is a fixed linear combination of the previous k terms.",
        delta:
          "A k×k companion matrix. Fibonacci is the k = 2 case, and counting tilings or restricted strings is the same shape with a different matrix.",
      },
      {
        name: "n-step Markov transitions",
        when: "'What is the distribution after n steps?'",
        delta:
          "Raise the transition matrix to the n. For large n it converges to the stationary distribution, and once it has, further squaring tells you nothing new.",
      },
      {
        name: "Counting paths in a graph",
        when: "'How many walks of length n from u to v?'",
        delta:
          "Entry (u, v) of the adjacency matrix raised to the n counts exactly that, because matrix multiplication is summing over intermediate vertices — which is what a walk is.",
      },
      {
        name: "Min-plus (tropical) products",
        when: "Shortest path with exactly n edges.",
        delta:
          "Replace multiply-and-add with add-and-minimum. Still associative, so binary exponentiation still applies — the trick generalises well beyond ordinary arithmetic.",
      },
    ],
    tradeoffs: [
      {
        vs: "Just iterating n times",
        pick: "Iterating unless n is large and k is small",
        because:
          "Iteration is O(n·k²), five lines, and obviously correct. Exponentiation is O(k³ log n) with a matrix-multiply routine, an identity base case and modular reduction to get right. It pays when n is in the millions and k is a handful — a two-state or four-state chain over a million steps. It loses badly when k is in the hundreds, and stating that crossover is more useful than knowing the technique.",
      },
      {
        vs: "Solving for the stationary distribution directly",
        pick: "Solve πP = π when you want the long-run answer",
        because:
          "If the question is 'where does this end up' rather than 'where is it after exactly n steps', you do not need any power at all — solve the linear system, which is one O(k³) factorisation instead of log n multiplications, and it is exact rather than converged. Raising the matrix to a large power to approximate the limit is doing more work for a worse answer.",
      },
      {
        vs: "A closed form like Binet's formula",
        pick: "The matrix method, despite the closed form being O(1)",
        because:
          "Binet's formula involves the square root of five and floating-point powers, so it drifts and then fails outright — for Fibonacci it is already wrong around the seventieth term in double precision, long before the interesting sizes. Exactness under a modulus is precisely what the matrix method provides. An O(1) algorithm that returns the wrong number is not a faster algorithm.",
      },
    ],
  },
  realWorld: [
    {
      system: "traed — market regime transitions",
      kind: "yours",
      problem:
        "Classifying sessions into a few regimes — trending, range-bound, volatile — and asking where the chain is likely to be twenty or a hundred sessions out, to size exposure. Simulating step by step is fine for twenty and wasteful for a sweep over many horizons.",
      applied:
        "The regime chain has a handful of states, so the transition matrix is tiny and k³ is negligible. Raising it to the n gives the full n-step distribution directly, and squaring reuses work across horizons. It also shows when the answer stops changing — once the matrix has converged, the chain has forgotten where it started, and any horizon beyond that carries no information.",
      evidence: "strategy-engine/src/strategy/enhanced_strategy_executor.py",
      impact:
        "Per-horizon simulation → one exponentiation, plus a clear read on when the horizon stops mattering",
    },
    {
      system: "Jump-ahead in parallel random number generators",
      kind: "industry",
      problem:
        "Running a simulation across a thousand workers, each needing its own non-overlapping stretch of the same random stream. Generating and discarding 10¹⁸ numbers to reach worker 500's starting point is not an option.",
      applied:
        "An LFSR or Mersenne Twister advances by a fixed linear map over its state, so jumping 2^64 steps ahead is that matrix raised to the 2^64 — about sixty-four squarings. Each worker computes its own start point in microseconds, with a guarantee that the streams do not overlap.",
      impact:
        "Provably disjoint parallel streams, without generating the numbers in between",
    },
    {
      system: "Counting walks for link prediction and fraud rings",
      kind: "industry",
      problem:
        "Asking how many paths of a given length connect two accounts, as a signal for whether a fresh connection is genuine or part of a ring built to look organic.",
      applied:
        "Entry (u, v) of the adjacency matrix raised to the n is the number of walks of length n from u to v, because matrix multiplication sums over intermediate vertices and that is exactly what composing a walk does. For small n you multiply directly; the exponentiation matters when the question is about long walks or about convergence.",
      impact: "Path enumeration replaced by matrix arithmetic on the adjacency structure",
    },
    {
      system: "PageRank and random-walk models",
      kind: "industry",
      problem:
        "Finding where a random surfer ends up over the long run across billions of pages.",
      applied:
        "The n-step distribution is the transition matrix to the n applied to the starting vector. At web scale nobody forms the matrix power — the matrix is enormous and sparse, so power iteration with sparse matrix-vector products is what actually runs. That contrast is the useful lesson: the exponentiation trick needs a small dense matrix, and PageRank is precisely the case where it does not apply.",
      impact:
        "Illustrates the k³ ceiling — the technique is for small k, and web-scale k is why sparse iteration wins",
    },
  ],
  lab: {
    prompt:
      "Return the n-th Fibonacci number modulo `mod`, with F(0) = 0 and F(1) = 1. `n` can be in the millions, so a loop from 0 to n will fail the gate — use matrix exponentiation for O(log n). You may assume `mod` is at most 10⁶, so products of two residues stay within exact integer range.",
    fnName: "fibMod",
    signature: "fibMod(n: number, mod: number): number",
    starter: `function fibMod(n, mod) {
// Your budget: O(log n).
// [[1,1],[1,0]] raised to the n has F(n) in its top-right entry.
// Square-and-multiply over the bits of n, reducing mod after every
// multiply. Remember what the power-zero case must return.

return 0;
}`,
    tests: [
      { name: "F(0) is 0", input: [0, 1000], expected: 0 },
      { name: "F(1) is 1", input: [1, 1000], expected: 1 },
      {
        // F(2) = 1. Exponent 2 is the first case that actually squares.
        name: "F(2) is 1",
        input: [2, 1000],
        expected: 1,
      },
      {
        // F(7) = 13, and 13 mod 10 = 3.
        name: "the modulus is applied",
        input: [7, 10],
        expected: 3,
      },
      { name: "F(10) is 55", input: [10, 1000003], expected: 55 },
      {
        // F(50) = 12586269025, well past what an unreduced double holds
        // exactly — reducing only at the end gives a rounded answer.
        name: "past exact double range",
        input: [50, 1000003],
        expected: 231267,
        hidden: true,
      },
      {
        name: "F(100)",
        input: [100, 1000003],
        expected: 391360,
        hidden: true,
      },
      {
        // A million steps: a loop would work here but the gate will not
        // let it through.
        name: "a million",
        input: [1000000, 1000003],
        expected: 3,
        hidden: true,
      },
    ],
    hints: [
      "The matrix `[[1, 1], [1, 0]]` advances the pair (F(n), F(n−1)) by one step. Raising it to the n therefore jumps n steps at once, and F(n) sits in the top-right entry of the result.",
      "Square-and-multiply: start the result at the IDENTITY matrix `[[1, 0], [0, 1]]` and the base at `[[1, 1], [1, 0]]`. While the exponent is greater than zero, multiply the result by the base when the low bit is set, then square the base and halve the exponent.",
      "Reduce modulo `mod` inside every multiply-and-add, not once at the end — Fibonacci overflows exact double precision around the seventy-ninth term. And check what your loop returns for n = 0: it must be the identity's answer, which is 0.",
    ],
    solution: `function fibMod(n, mod) {
if (n === 0) return 0;

// 2x2 multiply with the modulus applied inside. Reducing only at the
// end would overflow exact integer range long before n gets large.
const mul = (a, b) => [
  [(a[0][0] * b[0][0] + a[0][1] * b[1][0]) % mod,
   (a[0][0] * b[0][1] + a[0][1] * b[1][1]) % mod],
  [(a[1][0] * b[0][0] + a[1][1] * b[1][0]) % mod,
   (a[1][0] * b[0][1] + a[1][1] * b[1][1]) % mod],
];

// The IDENTITY is the base case: anything to the power zero must leave
// a vector unchanged. Starting from the base matrix instead is the
// classic off-by-one, and it is right for some exponents only.
let result = [[1, 0], [0, 1]];
let base = [[1, 1], [1, 0]];
let e = n;

while (e > 0) {
  if (e % 2 === 1) result = mul(result, base);
  base = mul(base, base);
  e = Math.floor(e / 2);
}

// [[1,1],[1,0]]^n = [[F(n+1), F(n)], [F(n), F(n-1)]].
return result[0][1] % mod;
}`,
    complexityGate: {
      target: "O(log n)",
      // The honest bound against n is logarithmic, which makes this gate
      // genuinely discriminating: the obvious wrong answer is a loop from
      // 0 to n, which measures ~2x per doubling and fails the 1.50 limit
      // immediately.
      //
      // Sizes step by 4x to span more bit-lengths of the exponent;
      // fitExponent is a least-squares fit over log sizes, so uneven
      // steps are fine.
      gen: "(n) => [n, 1000003]",
      sizes: [100000, 400000, 1600000, 6400000],
    },
  },
  insights: [
    {
      t: "Binary exponentiation, with matrices instead of numbers",
      d: "The trick needs only associativity, and matrix multiplication is associative. About log₂(n) multiplications replace n of them — twenty instead of a million.",
    },
    {
      t: "Any linear recurrence becomes a matrix",
      d: "The first row holds the coefficients and the rest is a shifted identity block carrying the history. Fibonacci is the k = 2 case of a completely general construction.",
    },
    {
      t: "The stationary distribution is an eigenvector",
      d: "π satisfies πP = π. Power iteration converges to it, but solving the system directly is exact and usually cheaper for small state spaces — so if you want the limit, do not raise the matrix to a big power.",
    },
    {
      t: "Reduce the modulus inside the multiply",
      d: "Entries grow exponentially and Fibonacci leaves exact double range near the seventy-ninth term. In JavaScript this also caps the modulus below about 94 million, since a product of two residues must stay under 2^53.",
    },
    {
      t: "The k³ ceiling decides whether it is worth it",
      d: "Exponentiation is O(k³ log n) against iteration's O(n·k²). Small k and huge n is the winning case; large k and modest n is not. PageRank is the standard example of the technique NOT applying.",
    },
  ],
  pitfalls: [
    "Starting the accumulator at the base matrix rather than the identity. It gives correct answers for some exponents and not others.",
    "Applying the modulus only at the end, so the entries have already lost precision by the time you reduce them.",
    "Using a modulus above about 94 million in JavaScript, where the product of two residues exceeds 2^53 and rounds silently.",
    "Reaching for it when the recurrence's coefficients change with n, or when it is not linear at all. There is no single matrix to raise.",
  ],
  quiz: [
    {
      q: "Computing the n-step transition matrix of a k-state Markov chain by repeated multiplication is O(n·k³). Binary exponentiation makes it:",
      options: ["O(k³)", "O(k³ log n)", "O(n log k)", "O(k² log n)"],
      answer: 1,
      difficulty: "recall",
      why: "log n matrix multiplications, each O(k³). For n = 10⁶ and k = 4 that is about 20 multiplications instead of a million.",
      distractors: [
        "That is the cost of a single multiplication. The exponent has to appear somewhere, and it appears as the logarithm.",
        "",
        "The exponent, not the state count, is what gets the logarithm. Swapping them inverts which parameter the technique actually helps with.",
        "k² is a matrix-VECTOR product. Squaring requires multiplying two matrices together, which is k³.",
      ],
    },
    {
      q: "A Markov chain's stationary distribution π satisfies:",
      options: ["π = P", "πP = π", "Pπ = 0", "π² = P"],
      answer: 1,
      difficulty: "recall",
      why: "It is the distribution unchanged by another step — the left eigenvector of P with eigenvalue 1.",
      distractors: [
        "π is a vector and P is a matrix; they are not the same kind of object and cannot be equal.",
        "",
        "That would say a step maps the distribution to all zeros, which is not a distribution — probabilities must still sum to one.",
        "Squaring a distribution has no meaning here. Two steps would be πP², not π².",
      ],
    },
    {
      q: "Your matrix power gives the right answer for n = 3 and n = 5 but is wrong for n = 4 and n = 8. Most likely cause?",
      options: [
        "The modulus is applied too late",
        "The accumulator starts at the base matrix instead of the identity, so an extra factor creeps in exactly when the low bit is clear",
        "The matrix is transposed",
        "Integer overflow",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Starting at the base rather than the identity means the result is multiplied by an extra copy. Exponents whose binary form starts with a set bit can happen to absorb it; those that do not come out wrong, which produces exactly this odd-works-even-fails pattern.",
      distractors: [
        "Late reduction gives answers that are wrong for LARGE n, once precision is lost. It would not distinguish 4 from 5.",
        "",
        "A transposed matrix would be wrong for every n greater than 1, not for a specific pattern of exponents.",
        "Overflow appears past the seventy-ninth term. At n = 4 the values are single digits.",
      ],
    },
    {
      q: "For Fibonacci there is a closed form, Binet's formula, which is O(1). Why is the matrix method used instead?",
      options: [
        "Binet's formula is wrong",
        "It uses irrational powers in floating point, so it drifts and then fails outright — already wrong around F(70) in double precision",
        "The matrix method is faster",
        "Binet's formula only works for even n",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The formula is mathematically exact and numerically unusable at the sizes that matter. An O(1) algorithm returning the wrong number is not a faster algorithm — and the matrix version gives exact answers under a modulus, which is what the applications need.",
      distractors: [
        "It is exactly correct as mathematics. The failure is in evaluating it with finite precision, which is a different and more interesting problem.",
        "",
        "O(log n) is slower than O(1). Correctness is what wins the argument here, not speed.",
        "It holds for all n. Parity has nothing to do with it.",
      ],
    },
    {
      q: "A 500-state chain over 1,000 steps. Matrix exponentiation or plain iteration?",
      options: [
        "Exponentiation — log n is always better",
        "Iteration: O(n·k²) is 250 million against O(k³ log n) at 1.25 billion, because k³ dominates when k is large",
        "Neither is feasible",
        "Exponentiation, because the matrix is sparse",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Iteration uses matrix-vector products at k², while exponentiation needs matrix-matrix products at k³. With k = 500 that factor of 500 swamps the saving from replacing 1,000 steps with 10 multiplications.",
      distractors: [
        "The log applies to n and does not compensate for the extra factor of k. This is exactly the reasoning the crossover exists to correct.",
        "",
        "Both are perfectly feasible — hundreds of millions of operations is seconds at worst.",
        "Sparsity would help iteration far more than exponentiation, since matrix powers fill in rapidly and stop being sparse after a few squarings.",
      ],
    },
    {
      q: "How does jump-ahead in a parallel random number generator use this?",
      options: [
        "It generates and discards the numbers quickly",
        "The generator advances by a fixed linear map, so jumping 2^64 steps is that matrix raised to 2^64 — about 64 squarings",
        "It reseeds each worker differently",
        "It uses a different generator per worker",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Because the state update is linear and fixed, the jump is a matrix power, and binary exponentiation makes an astronomically distant jump cost a few dozen multiplications. That is what gives each worker a provably non-overlapping stretch.",
      distractors: [
        "Generating 10¹⁸ numbers is the thing being avoided — no speed makes that feasible.",
        "",
        "Different seeds give streams with no guarantee about overlap: two seeds can land in the same region and correlate. The whole point of jump-ahead is the guarantee.",
        "Different generators have different quality and no shared guarantee, and it multiplies the validation work.",
      ],
    },
    {
      q: "The recurrence is F(n) = a(n)·F(n−1) + b(n)·F(n−2), where a and b change with n. What happens?",
      options: [
        "Use a 3×3 matrix",
        "The technique does not apply — exponentiation requires the SAME linear map at every step, and here each step has a different matrix",
        "Take the average of a and b",
        "It still works, just more slowly",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Raising a matrix to the n means applying one identical map n times. With coefficients varying by step, the product is M(n)·M(n−1)···M(1) — different matrices with nothing to square. Recognising this precondition is more valuable than the technique itself.",
      distractors: [
        "Adding a dimension carries more history, but it cannot make the coefficients stop changing. The matrix would still differ per step.",
        "",
        "Averaging changes the problem to a different recurrence with a different answer.",
        "It does not work at all — there is no single matrix to raise, so the algorithm has nothing to operate on.",
      ],
    },
    {
      q: "You want the LONG-RUN distribution of a small Markov chain. Best approach?",
      options: [
        "Raise P to a very large power",
        "Solve πP = π directly — one linear system, exact, no convergence question",
        "Simulate the chain many times",
        "Raise P to the power of the number of states",
      ],
      answer: 1,
      difficulty: "judge",
      why: "The limit is defined by an equation, so solve the equation. Raising to a large power approximates it, needs a judgement about when it has converged, and does more work for a less exact answer.",
      distractors: [
        "This converges toward the answer and never quite reaches it, and you still have to decide what 'large enough' means.",
        "",
        "Monte Carlo gives a noisy estimate of something an exact method answers directly, for a small chain.",
        "The state count has no relationship to the mixing time. A chain with three states can take thousands of steps to converge.",
      ],
    },
  ],
};

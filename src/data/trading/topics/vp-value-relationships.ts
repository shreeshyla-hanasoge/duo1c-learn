import type { Topic } from "../../types.ts";

export const vpValueRelationships: Topic = {
  id: "vp-value-relationships",
  title: "Value relationships between days",
  tier: 1,
  depth: "deep",
  summary:
    "Higher, overlapping higher, inside, unchanged, outside, overlapping lower, lower: exact, testable definitions, their edge cases, and why Dalton weighs where value moved over where price closed.",
  why: "A single day's profile says what was accepted today. Comparing today's value area with yesterday's says whether acceptance is moving, and which way. Dalton uses these relationships as his main read of direction over several days, and he weighs them above the close. For a rule-builder they are simple comparisons of four numbers, which is exactly why the edge cases and the value-area method decide the answer more often than you would expect.",
  viz: ["vp-value-relationships"],
  learn: {
    intuition:
      "Think of each day's value area as the price band where most of the day's business was done. Lay today's band next to yesterday's. If today's band sits wholly above, the market agreed to do business at higher prices: value moved up. If it overlaps but is shifted up, value moved up partly. If it sits inside yesterday's, the market narrowed and waited. If it is wider on both sides, both sides were active and neither won. The close is a different thing: one price at one moment. A day can close far higher on a late burst while the band where business was actually done barely moved. Dalton's point is that the band moving is stronger evidence than the close moving, because the band is where the volume went. Everything in this lesson is a comparison of four numbers. The judgement is in the edges and in how those four numbers were computed.",
    mechanics: [
      {
        heading: "Six relationships, plus 'unchanged'",
        body: "Dalton's Markets in Profile (ch.4, Fig. 4.5, p.51) shows six relationships between consecutive value areas: higher, overlapping higher, inside, outside, overlapping lower and lower. His checklists in ch.7 also use 'unchanged', in phrases such as overlapping-to-higher, higher, unchanged. The visualiser draws all six on synthetic days against one synthetic yesterday with value 22,325–22,370. Higher is 22,460–22,495. Overlapping higher is 22,355–22,390. Inside is 22,335–22,360. Outside is 22,315–22,410. Overlapping lower is 22,305–22,330. Lower is 22,215–22,250.",
      },
      {
        heading: "Exact definitions, tested in order",
        body: "Dalton draws pictures, not inequalities, so the definitions are this course's operational reading. Write today's edges as `tVAL`, `tVAH` and yesterday's as `yVAL`, `yVAH`, and test in this order. Unchanged: both edges equal. Higher: `tVAL > yVAH`. Lower: `tVAH < yVAL`. Inside: `tVAL >= yVAL && tVAH <= yVAH`. Outside: `tVAL <= yVAL && tVAH >= yVAH`. Otherwise it is overlapping higher if `tVAH > yVAH`, and overlapping lower if not. The order matters: every pair of value areas lands in exactly one case, and changing the order or the strictness of a single comparison changes which case the edge days fall into.",
      },
      {
        heading: "Edge cases: equal and touching edges",
        body: "Profile edges sit on the row grid, so with 5-point rows they are multiples of 5 and exact ties are common, not freak events. Touching: `tVAL = yVAH` shares a single price with yesterday, so the strict 'higher' test fails and the day is overlapping higher. One equal edge: `tVAL = yVAL` with `tVAH < yVAH` is inside under the definitions above, and overlapping lower under a strict version. Both edges equal: unchanged. Some traders widen 'unchanged' to 'both edges within one row'. That is a reasonable choice, but it moves days out of inside, outside and the overlapping cases, so declare it before counting.",
      },
      {
        heading: "The relationship depends on how value was computed",
        body: "VAH and VAL depend on the method. On the research notes' worked example the same twelve rows give a VAL of 101 under the two-row CBOT method, 102 under Sierra Chart's default and 103 under TradingView's (the vp-platforms visualiser in lesson 5). Row size moves edges too. A one-row shift is enough to turn 'overlapping higher' into 'higher' when today's VAL sits near yesterday's VAH. If yesterday's levels come from one platform and today's from another, the relationship is partly a comparison of methods. Compute both days with the same method, the same row size and the same session times.",
      },
      {
        heading: "Value migration versus price migration",
        body: "Dalton weighs where value moved more heavily than where price moved, because price can be higher while value is unchanged or even lower (Markets in Profile, p.50). Use the worked example. 30 Sep's value is 22,290–22,335 with its POC at 22,312.5. 1 Oct's is 22,215–22,470 with its POC at 22,447.5. 1 Oct's VAL is below 30 Sep's and its VAH above, so the relationship is OUTSIDE. Yet the POC moved up 135 points, and the synthetic day ends in its upper hump. The label says both sides were explored; the POC says where the volume ended. A rule should carry both measures, not just one.",
      },
    ],
    complexityDerivation:
      "The six relationships come from Dalton's Markets in Profile (ch.4, Fig. 4.5), and his statement that value placement outweighs price placement is on p.50. 'Unchanged' appears in his ch.7 checklists. All of that is verified in the research notes. What the book gives is pictures and worked readings. It gives no inequalities, so the exact definitions here, including the order of tests and what equal edges mean, are this course's choice. They are one reasonable reading, and others exist. The literal claim is directional: value moving higher is evidence of acceptance at higher prices, and is more informative than a higher close. We found no published test of what follows each relationship (next-day returns, or how often value keeps migrating) with a stated method, on any market, and nothing for NIFTY or MCX. Two further things are untested and matter in practice. One is how sensitive the labels are to the value-area method: on the research notes' worked example, a VAL moves by two rows across the CBOT, Sierra Chart and TradingView rules. The other is how often real NIFTY days fall on equal or touching edges, where the definitions disagree.",
    variants: [
      {
        name: "Inclusive versus strict edges",
        when: "You need to decide what equal edges mean.",
        delta:
          "Inclusive (`>=`, `<=`) puts one-equal-edge days into inside or outside. Strict puts them into the overlapping cases. Neither is wrong; the counts differ, so write down which one you used.",
      },
      {
        name: "Tolerance-based 'unchanged'",
        when: "Small edge differences feel like noise, for example one row.",
        delta:
          "Call the day unchanged if both edges are within a tolerance. It removes jitter but adds a parameter, and it pulls days out of every other category.",
      },
      {
        name: "POC migration",
        when: "You want one continuous number rather than seven labels.",
        delta:
          "Today's POC minus yesterday's, or as a fraction of yesterday's value-area width. Simple and live-computable for yesterday, but it inherits the POC's instability on two-hump and thin trend days (lessons 6 and 7).",
      },
      {
        name: "Multi-day sequences",
        when: "You want to know whether migration is persistent, not just one day's step.",
        delta:
          "Use sequences such as 'higher, then overlapping higher', or compare today with a composite of the last few days (lesson 14). More context, more combinations, and more risk of finding patterns by chance.",
      },
    ],
    tradeoffs: [
      {
        vs: "Judging direction from the closes",
        pick: "The value-area relationship, with the POC change alongside",
        because:
          "A close is one print. The value area is where most of the volume traded. Dalton weighs value over price because a higher close can sit on unchanged or lower value.",
      },
      {
        vs: "Using today's final value area during today",
        pick: "Yesterday-versus-the-day-before as context, or the developing value area labelled as such",
        because:
          "Today's final value area exists only after the close. Using it intraday is look-ahead. The developing value area (lesson 13) is honest but keeps moving, so a relationship computed from it can change several times in a day.",
      },
      {
        vs: "Seven discrete labels",
        pick: "Labels for reading the literature; continuous measures (overlap fraction, shift of the value-area midpoint, POC change) for rules",
        because:
          "Labels jump at the edges: one row can flip a day between categories. Continuous measures change smoothly, so a rule built on them is less sensitive to the value-area method.",
      },
    ],
  },
  realWorld: [
    {
      system: "Dalton — Markets in Profile, ch.4",
      kind: "industry",
      problem:
        "A trader needs a quick read of whether a market is moving or balancing over several days.",
      applied:
        "Figure 4.5 sets out six value-area relationships, and p.50 argues that value placement should be weighed more heavily than price, because price can rise while value stays put.",
      evidence: "Markets in Profile (Wiley, 2007), ch.4, pp.50–51",
      impact: "The source of the relationship vocabulary",
    },
    {
      system: "Dalton — Markets in Profile, ch.7 checklists",
      kind: "industry",
      problem:
        "Checklists for longer-term direction need a word for 'value did not move'.",
      applied:
        "Dalton's checklists use 'unchanged' alongside the six relationships, in sequences such as overlapping-to-higher, higher, unchanged.",
      evidence: "Markets in Profile, ch.7",
      impact: "Seven labels in practice, not six",
    },
    {
      system: "Sierra Chart and TradingView — value-area methods",
      kind: "industry",
      problem:
        "Two platforms can compute different VAH and VAL from the same session.",
      applied:
        "Sierra Chart's default grows the value area one row at a time and stops at 70% or more. TradingView's volume profile also grows it one row at a time but stops before passing 70%. The CBOT method takes two rows at a time. On the research notes' example the VAL comes out at 102, 103 and 101 respectively.",
      evidence: "Sierra Chart and TradingView documentation; research notes section D",
      impact: "A relationship near an edge can depend on which platform computed it",
    },
    {
      system: "Your strategy builder — yesterday's levels and the relationship",
      kind: "yours",
      problem:
        "Your inputs are yesterday's POC, VAH and VAL, and where today trades against them. A value relationship needs today's FINAL value area, which does not exist until today closes.",
      applied:
        "Two honest uses. As next-day context: the relationship between yesterday and the day before, available at today's open. On the worked example, 1 Oct's value (22,215–22,470) against 30 Sep's (22,290–22,335) is outside, with the POC up 135 points, and that would be context for 3 Oct. Or intraday, from the developing value area, labelled as developing. Compute both days with the same method and row size your platform uses for the levels themselves.",
      impact: "Adds a multi-day view without look-ahead",
    },
  ],
  insights: [
    {
      t: "Higher means today's VAL is above yesterday's VAH",
      d: "Strictly above. If today's VAL equals yesterday's VAH, the two areas share a price and the day is overlapping higher. Lower is the mirror: today's VAH below yesterday's VAL.",
    },
    {
      t: "Order and strictness decide the edge days",
      d: "Test unchanged, higher, lower, inside, outside, then the overlapping cases. Because edges sit on the row grid, equal edges are common, and inclusive or strict comparisons put them in different categories.",
    },
    {
      t: "Value over price",
      d: "Dalton weighs where value moved over where price closed, because a higher close can sit on unchanged or lower value. A late spike on thin volume moves the close, not the value area.",
    },
    {
      t: "'Outside' can hide a direction",
      d: "1 Oct's value is outside 30 Sep's, a two-sided label, yet its POC moved up 135 points into the upper hump. Carry the POC change alongside the relationship.",
    },
  ],
  pitfalls: [
    "Using today's final value area to label a trade made today. It exists only after the close; use yesterday's relationship or the developing value area.",
    "Comparing levels computed by different platforms, row sizes or session times. Part of the 'relationship' is then the difference between methods.",
    "Leaving equal-edge handling implicit. On a 5-point grid, touching and equal edges happen often enough to change the counts.",
    "Reading the close as value migration. A thin, late spike can move the close a long way while the value area barely moves.",
    "Treating 'outside' as directionless when the POC clearly moved. The label describes the band, not where in it the volume ended.",
  ],
  quiz: [
    {
      q: "Yesterday's value area: 22,325–22,370. Today's: 22,380–22,430 (illustrative). What is the relationship?",
      options: ["Overlapping higher", "Higher", "Outside", "Inside"],
      answer: 1,
      difficulty: "apply",
      why: "Today's VAL (22,380) is above yesterday's VAH (22,370). The two areas share no price, so value moved wholly up.",
      distractors: [
        "Overlapping needs at least one shared price. Today's lowest value price is 10 points above yesterday's highest.",
        "",
        "Outside means today's area contains yesterday's on both sides. Today's VAL is above yesterday's whole area.",
        "Inside means today sits within yesterday's band. Today is entirely above it.",
      ],
    },
    {
      q: "Worked example: 30 Sep's value area is 22,290–22,335. 1 Oct's is 22,215–22,470. What is the relationship?",
      options: [
        "Higher, because the POC rose 135 points",
        "Overlapping higher",
        "Inside",
        "Outside: 1 Oct's VAL is below 30 Sep's VAL and its VAH is above 30 Sep's VAH",
      ],
      answer: 3,
      difficulty: "apply",
      why: "22,215 < 22,290 and 22,470 > 22,335, so 1 Oct's band contains 30 Sep's on both sides. The POC move is real and worth recording, but the relationship is defined by the edges.",
      distractors: [
        "The POC did rise 135 points (22,312.5 to 22,447.5). But 'higher' needs today's VAL above yesterday's VAH, and 22,215 is far below 22,335.",
        "Overlapping higher needs today's VAL to be ABOVE yesterday's VAL. 1 Oct's VAL is 75 points below.",
        "Inside is the reverse: today within yesterday. Here yesterday sits within today.",
        "",
      ],
    },
    {
      q: "Yesterday's value area: 22,325–22,370. Today's: 22,300–22,350 (illustrative). What is the relationship?",
      options: [
        "Lower",
        "Inside",
        "Overlapping lower",
        "Outside",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Today's VAL (22,300) is below yesterday's (22,325) and today's VAH (22,350) is below yesterday's (22,370), but today's VAH is still above yesterday's VAL, so the areas share 22,325–22,350. Shifted down and still overlapping.",
      distractors: [
        "Lower needs today's VAH below yesterday's VAL. 22,350 is above 22,325.",
        "Inside needs today's VAL at or above yesterday's VAL. 22,300 is below 22,325.",
        "",
        "Outside needs today's VAH at or above yesterday's VAH as well. 22,350 is below 22,370.",
      ],
    },
    {
      q: "Yesterday's VAH is 22,370. Today's value area is 22,370–22,420 (illustrative). Under the course's definitions, what is the relationship?",
      options: [
        "Overlapping higher, because 'higher' needs today's VAL strictly above yesterday's VAH and here the areas share the price 22,370",
        "Higher",
        "Unchanged",
        "It cannot be classified",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Touching edges share one price. The strict test `tVAL > yVAH` fails, inside and outside do not apply, and today's VAH is above yesterday's, so the day is overlapping higher. A rule written with `>=` would call it higher. On a 5-point grid, cases like this are common, which is why the convention must be written down.",
      distractors: [
        "",
        "Only under a `>=` rule. The course uses strict `>`, because a shared price means some of yesterday's value was still traded today.",
        "Unchanged needs BOTH edges equal. Today's VAH is 50 points higher.",
        "It can be classified once the comparison is fixed. Refusing to classify edge days silently drops them from any count.",
      ],
    },
    {
      q: "Today's profile (synthetic, 5-point rows) is shown with its value area. Yesterday's value area was 22,325–22,370. What is the relationship?",
      figure: {
        lo: 22340,
        step: 5,
        bins: [2, 4, 6, 10, 18, 30, 45, 60, 55, 40, 25, 14, 8, 5, 3, 2],
        showValueArea: true,
        lines: [
          { price: 22370, label: "yesterday VAH" },
          { price: 22325, label: "yesterday VAL" },
        ],
        caption: "Today, synthetic",
      },
      options: [
        "Higher",
        "Inside",
        "Outside",
        "Overlapping higher",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Today's value area is 22,365–22,390. Its VAL (22,365) is inside yesterday's band and its VAH (22,390) is above yesterday's VAH (22,370). Shifted up and still overlapping.",
      distractors: [
        "Higher needs today's VAL above 22,370. It is 22,365, so the two bands share 22,365–22,370.",
        "Inside needs today's VAH at or below 22,370. It is 22,390.",
        "Outside needs today's VAL at or below 22,325. It is 22,365.",
        "",
      ],
    },
    {
      q: "Today's profile (synthetic, 5-point rows) with its value area. Yesterday's value area was 22,325–22,370. Under the course's inclusive edge convention, what is the relationship?",
      figure: {
        lo: 22300,
        step: 5,
        bins: [3, 5, 9, 16, 28, 44, 58, 62, 50, 33, 20, 11, 6, 3],
        showValueArea: true,
        lines: [
          { price: 22370, label: "yesterday VAH" },
          { price: 22325, label: "yesterday VAL" },
        ],
        caption: "Today, synthetic",
      },
      options: [
        "Overlapping lower, because today's VAL equals yesterday's",
        "Inside: today's VAL equals yesterday's VAL and today's VAH is below yesterday's VAH",
        "Lower",
        "Unchanged",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Today's value area is 22,325–22,350. Its VAL equals yesterday's (22,325), which the inclusive test `tVAL >= yVAL` accepts, and its VAH (22,350) is below 22,370. So it is inside. A strict version (`tVAL > yVAL`) would push it to overlapping lower, which is exactly why the convention must be stated.",
      distractors: [
        "That is what a STRICT inside test gives. With the course's inclusive edges, an equal VAL still counts as inside.",
        "",
        "Lower needs today's VAH below yesterday's VAL. 22,350 is above 22,325.",
        "Unchanged needs both edges equal. Today's VAH is 20 points lower.",
      ],
    },
    {
      q: "Illustrative: NIFTY futures close 160 points above yesterday's close after a spike in the last half hour on thin volume. Today's value area is 22,330–22,375 against yesterday's 22,325–22,370. How would Dalton weigh this day?",
      options: [
        "As a strong up day, because the close moved 160 points",
        "As a down day, because the value area is narrow",
        "As little change: value barely moved (overlapping higher by one row) even though price did. He weighs where value moved over where price closed",
        "As higher value, because the close is above yesterday's VAH",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Dalton writes that price can be higher while value is unchanged or lower, and weighs value placement more heavily. Here the band where most volume traded moved up by 5 points. The late spike changed the close, not where business was done.",
      distractors: [
        "That reads price migration, which is the thing Dalton warns against over-weighting. A thin late spike says little about acceptance.",
        "Width does not give direction, and today's value sits slightly ABOVE yesterday's, not below it.",
        "",
        "The relationship compares value areas, not the close. Today's VAL (22,330) is below yesterday's VAH (22,370), so value is not higher.",
      ],
    },
    {
      q: "Suppose your platform (two-row method) puts today's VAL at 22,370; a chart using TradingView's one-row, stop-before-70% rule puts it at 22,375. Yesterday's VAH is 22,370 on both. What should you conclude?",
      options: [
        "One of them has a bug",
        "TradingView is right, because its value area holds less than 70%",
        "Use whichever label agrees with the trade you wanted",
        "The label flips (overlapping higher versus higher) purely because of the method; compute every day with one method, record it, and treat near-edge days as fragile",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Different expansion rules give different edges from the same data. That is documented behaviour, not a bug. Near an edge, a one-row difference changes the category, so a rule must fix the method and should prefer measures that do not jump at the edges.",
      distractors: [
        "Both follow their own documented rules. The research notes show the same twelve rows giving VALs of 101, 102 and 103 across three methods.",
        "Neither is 'right'. TradingView stops at or below 70% by design, and the CBOT method at or above it. They are different conventions.",
        "Picking the label after seeing the trade is how a backtest ends up measuring your preferences instead of the market.",
        "",
      ],
    },
  ],
};

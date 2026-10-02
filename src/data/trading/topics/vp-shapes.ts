import type { Topic } from "../../types.ts";

export const vpShapes: Topic = {
  id: "vp-shapes",
  title: "Profile shapes",
  tier: 1,
  depth: "deep",
  summary:
    "D, P, b, double distribution and thin trend: what each shape records, what Dalton infers from it, and what a profile can never see.",
  why: "The shape of a finished profile is the quickest summary of how a day traded. Dalton attaches specific stories to some shapes: a P is short covering, a b is long liquidation. Those stories are about WHO traded, and a profile records only price, volume and time. Knowing where the description ends and the inference begins is what keeps a shape from turning into a signal it cannot support.",
  viz: ["vp-shapes"],
  learn: {
    intuition:
      "Turn a profile on its side and it has a silhouette. One fat hump in the middle is a day when buyers and sellers kept meeting at the same prices. A thin stem below a fat head is a day that moved up fast and then settled. A fat base under a thin stem is the mirror image. Two humps joined by a waist is two separate days of agreement with a fast move between them. A long thin stick with no hump is a day that never stopped moving. The silhouette is a fact about today. The reading attached to it, such as 'shorts were covering' or 'longs were getting out', is an inference about who was trading and why. The profile cannot see identities, accounts or intentions. Use a shape to decide which questions to ask about the next session, not to answer them.",
    mechanics: [
      {
        heading: "D: one hump, POC near the middle",
        body: "Fat in the middle, thin at both ends. The market rotated around one area all day and neither side took control. The CBOT study guide describes a completed balanced distribution as bell-shaped and calls the bell curve the market's 'common denominator'. On the visualiser's synthetic D day (10-point rows) the POC is 22,405, about 55% of the way up the day's range, and value is 22,380–22,430. A D day tells you value was agreed today. It says nothing about which way the next day goes.",
      },
      {
        heading: "P: thin below, fat above, and Dalton's short-covering reading",
        body: "A fast rise from the low, then acceptance higher up. In Markets in Profile (ch.4, pp.55–56) Dalton writes that a profile weighted at the top usually means short covering, without new long-term buying. Traders who were short buy back to close their positions, which pushes price up quickly, and the buying stops once they are out. The worry is that such a rally can fade because no fresh buyers are behind it. On the synthetic P day the POC is 22,455, about 90% of the way up the range. Remember what kind of claim this is: a profile cannot show whether the buyers were closing shorts or opening new longs.",
      },
      {
        heading: "b: fat below, thin above, and the long-liquidation reading",
        body: "The mirror: a fast drop, then acceptance lower down. Dalton reads it as long liquidation: holders selling out of long positions, rather than new sellers going short (Markets in Profile, ch.4). In ch.7 he notes that a trend day which ended in a b shape did not bode well for continuation. On the synthetic b day the POC is 22,365, about 15% of the way up the range. The same caution applies: the shape records where volume traded, not who was selling.",
      },
      {
        heading: "Double distribution: two humps, a thin waist, and a value area that hides it",
        body: "Balance, a fast move on thin volume, then balance again at a new level. Dalton calls the day type a double-distribution trend day; some traders call the shape a 'B'. The trap is the value area. It is grown outward from the POC until it holds 70% of volume, so on a two-hump day it often spans both humps AND the waist between them. On the synthetic double-distribution day value is 22,290–22,480 with the POC at 22,455, about 88% up the range. That is almost the same POC position as the P day. POC location alone cannot tell a P from a double distribution.",
      },
      {
        heading: "Thin trend: no dominant node, and an unstable POC",
        body: "Price kept moving all day, so no price collected much volume. The profile is a long, even stick and the close sits near an extreme. Because the rows are nearly equal, the POC is close to arbitrary. On the synthetic thin trend day it is 22,575 at 10-point rows but 22,202.5 at 5-point rows: opposite ends of the day. The value area covers most of the range (22,270–22,600 at 10-point rows). On a day like this, yesterday's POC is a weak reference, and a rule that treats it as strong is reading noise.",
      },
    ],
    complexityDerivation:
      "The bell-shaped balanced day comes from the CBOT study guide, which describes a completed balanced distribution that way. The P and b readings are Dalton's: Markets in Profile ch.4 (pp.55–56, Figs 4.8–4.9) says a top-weighted profile usually means short covering and the mirror means long liquidation. Mind Over Markets has sections on short-covering rallies (p.123) and long-liquidation breaks (p.127). All of this is verified in the research notes. Notice what kind of claim it is. 'Short covering' says who traded (people closing shorts) and on what timeframe (not new long-term buyers). A volume profile records price, volume and, for TPO charts, time. It carries no information about accounts or positions. So the reading is an inference from the shape and from Dalton's experience, not something the profile shows. We found no published test of whether P or b days are followed by different next-day behaviour than D days, on any market, and none on NIFTY or MCX. Daily open interest is the one public data series that bears on the question at all (falling open interest during a rally fits short covering). Even that is consistent with the story, not proof of it.",
    variants: [
      {
        name: "Shape from POC position",
        when: "You want one number per day that a computer can calculate without judgement.",
        delta:
          "Use (POC − low) / (high − low), or (POC − VAL) / (VAH − VAL). High values look P-like, low values b-like. This cannot tell a P from a double distribution, because both put the POC near the top.",
      },
      {
        name: "Shape from peak count",
        when: "You need to separate one hump from two.",
        delta:
          "Smooth the rows, find peaks above a minimum prominence, and check for a thin waist between them. More parameters (smoothing, prominence, waist depth), but it is the only way to separate a P from a double distribution in code.",
      },
      {
        name: "TPO shape versus volume shape",
        when: "Your platform offers both.",
        delta:
          "Time and volume can give different silhouettes on the same day. A slow, thin morning looks fat on a TPO chart and thin on a volume profile. Pick one, and do not compare a TPO shape with a volume-based reading.",
      },
      {
        name: "Shape plus open interest",
        when: "You trade NIFTY or MCX futures and have daily open interest.",
        delta:
          "A P day with falling open interest fits the short-covering story; a P day with rising open interest fits new buying better. Both are still inferences. TradingView, for one, gives Indian futures open interest only on daily bars.",
      },
    ],
    tradeoffs: [
      {
        vs: "Naming the shape by eye",
        pick: "A computed feature (POC position, peak count, waist depth)",
        because:
          "By eye, the same day can be called a P or a double distribution depending on what happened next. A computed feature gives one answer before the outcome is known, so it can be tested.",
      },
      {
        vs: "Dalton's who-traded reading",
        pick: "The shape as a description, with the reading kept as a hypothesis",
        because:
          "'Short covering' may well be right on a given day, but the profile cannot confirm it. Treat it as a question to check, for example against open interest, not as an input to trade on.",
      },
      {
        vs: "Using yesterday's POC as a level every day",
        pick: "Weight the POC by how dominant its node was",
        because:
          "On a D or P day the POC sits in a clear node. On a thin trend day it can jump from one end of the range to the other with row size. A single 'yesterday's POC' rule treats both days the same.",
      },
    ],
  },
  realWorld: [
    {
      system: "Dalton — Markets in Profile, ch.4",
      kind: "industry",
      problem:
        "A trader looking at a strong up day wants to know whether new buyers arrived or old sellers left.",
      applied:
        "Dalton reads a top-weighted 'p' profile as short covering without new long-term buying, and the mirror 'b' as long liquidation (pp.55–56, Figs 4.8–4.9). In ch.7 he notes that a trend day ending in a b shape did not bode well for continuation.",
      evidence: "Markets in Profile (Wiley, 2007), ch.4 and ch.7",
      impact: "The source of the P and b readings; argued from examples, not measured",
    },
    {
      system: "Dalton — Mind Over Markets",
      kind: "industry",
      problem:
        "Short-covering rallies and long-liquidation breaks look like trend moves while they are happening.",
      applied:
        "The book gives each its own section ('Short-Covering Rallies', p.123; 'Long-Liquidation Breaks', p.127). We read the table of contents, not the body text, so we cannot report his exact criteria.",
      evidence: "Mind Over Markets, updated ed. (Wiley, 2013), table of contents",
      impact: "Shows how central the who-traded reading is to Dalton's method",
    },
    {
      system: "Open interest on Indian futures",
      kind: "industry",
      problem:
        "A profile cannot see who traded, so the P and b stories cannot be checked from the profile alone.",
      applied:
        "Open interest counts contracts still open. It falls when positions are closed, which is what short covering and long liquidation both are. TradingView shows open interest for NSE and MCX futures, but only on daily bars, so the check is end-of-day, not intraday.",
      evidence: "TradingView support: Open interest",
      impact: "The one public series that bears on 'who', and still only circumstantially",
    },
    {
      system: "Your strategy builder — the 1 Oct worked example",
      kind: "yours",
      problem:
        "Your platform's levels for 1 Oct are POC 22,447.5, VAH 22,470, VAL 22,215. The POC sits 22.5 points below VAH and 232.5 above VAL, so (POC − VAL) / (VAH − VAL) = 232.5 / 255 ≈ 0.91. Those three numbers fit a P-shaped day equally well.",
      applied:
        "The course's synthetic 1 Oct bars are a double distribution: a lower hump around 22,180–22,250, a thin waist, and an upper hump around 22,430–22,460. If a rule needs to know which kind of day yesterday was, it needs a feature from the profile itself, such as the thinnest row between VAL and the POC as a fraction of the POC row. The three levels alone cannot tell the two apart.",
      impact: "Three levels cannot distinguish P from double distribution; the profile can",
    },
  ],
  insights: [
    {
      t: "A shape describes today; the story is an inference",
      d: "Dalton reads P as short covering and b as long liquidation. Those are claims about who traded, and a profile records price, volume and time, not identities.",
    },
    {
      t: "POC near the top does not mean P",
      d: "A double distribution with a heavier upper hump puts the POC near the top too. The synthetic P and double-distribution days put the POC about 90% and 88% of the way up their ranges.",
    },
    {
      t: "A value area can hide a gap",
      d: "Grown from the POC to 70%, the value area of a two-hump day often spans both humps and the thin waist between them. Look at the rows, not only the edges.",
    },
    {
      t: "On a thin trend day the POC is noise",
      d: "With no dominant node, the POC can jump from one end of the day to the other when the row size changes: 22,575 at 10-point rows, 22,202.5 at 5-point rows on the synthetic trend day.",
    },
  ],
  pitfalls: [
    "Trading the story instead of the shape. 'P means short covering, so fade it' turns an unverified inference about who traded into an entry signal.",
    "Classifying shape from POC, VAH and VAL alone. Those three numbers cannot separate a P from a double distribution, as the 1 Oct worked example shows.",
    "Naming the shape after you know what happened next. Write a computed definition first, or the label will quietly follow the outcome.",
    "Treating a thin trend day's POC as a strong level. Its node barely exists, and row size can move it across the whole range.",
    "Mixing TPO shapes and volume shapes. The same day can look different in time and in volume, so a rule must say which one it uses.",
  ],
  quiz: [
    {
      q: "Yesterday's profile (synthetic, 10-point rows) is shown. What does Dalton's reading suggest, and what can the profile itself NOT tell you?",
      figure: {
        lo: 22240,
        step: 10,
        bins: [3, 2, 2, 1, 2, 3, 5, 12, 30, 55, 80, 70, 40, 10],
        showValueArea: true,
        caption: "Synthetic: thin below, fat above",
      },
      options: [
        "It is a b shape: long liquidation, and the profile proves sellers were exiting",
        "It is a P shape: Dalton's usual reading is short covering, but the profile cannot show whether the buyers were closing shorts or opening new longs",
        "It is a P shape, so tomorrow will open higher",
        "It is a balanced D day, so nothing can be read from it",
      ],
      answer: 1,
      difficulty: "apply",
      why: "Thin rows below and a fat head above, with the POC (22,345) near the top, is the P silhouette. Dalton reads it as short covering. The profile has no information about positions, so that reading remains an inference.",
      distractors: [
        "The heavy rows are at the TOP, which is the P, not the b. And no profile 'proves' who traded.",
        "",
        "Dalton's reading is about who traded today. It is not a forecast of tomorrow's open, and we found no test of P days predicting the next open.",
        "A D has its hump in the middle with thin ends both sides. Here the bottom half is almost empty.",
      ],
    },
    {
      q: "Yesterday's profile (synthetic, 10-point rows). Which statement is fair?",
      figure: {
        lo: 22300,
        step: 10,
        bins: [12, 40, 72, 85, 60, 28, 12, 5, 3, 2, 1, 2, 2, 4],
        showValueArea: true,
        caption: "Synthetic: fat below, thin above",
      },
      options: [
        "The day fell fast and then settled lower. Dalton would read it as long liquidation, which the profile is consistent with but cannot confirm",
        "New sellers went short aggressively; the shape shows it",
        "It is a P shape with a high POC",
        "The thin upper rows mean price must return there tomorrow",
      ],
      answer: 0,
      difficulty: "apply",
      why: "Heavy rows at the bottom (POC 22,335) under a thin stem is the b silhouette: a fast drop, then acceptance lower. Dalton's reading is holders selling out (long liquidation) rather than fresh shorts. That is an inference, not something the rows show.",
      distractors: [
        "",
        "That is the opposite inference to Dalton's, and the profile supports neither directly. It cannot distinguish new shorts from longs exiting.",
        "The POC is near the BOTTOM of this profile. P means a fat head on top.",
        "'Thin rows get revisited' is folklore with no measured rate. Nothing here says 'must'.",
      ],
    },
    {
      q: "This synthetic profile (10-point rows) has a POC near the top of a wide value area. Which reading does the profile support?",
      figure: {
        lo: 22180,
        step: 10,
        bins: [8, 30, 55, 60, 40, 15, 4, 2, 3, 6, 25, 60, 90, 70, 30, 6],
        showValueArea: true,
        caption: "Synthetic",
      },
      options: [
        "A P shape: short covering lifted price to the POC",
        "A thin trend day, because the value area is wide",
        "A balanced D day, because the value area contains most of the volume",
        "A double distribution: two humps with a thin waist, and the value area spans both and the gap between them",
      ],
      answer: 3,
      difficulty: "judge",
      why: "There are two clear humps (peaking at 60 and 90) with rows of 2 to 6 between them. The value area, 22,200–22,340, was grown from the POC until it held 70% and swallowed the waist. POC near the top of value would also fit a P. The rows are what tell them apart.",
      distractors: [
        "POC near the top of value is exactly what a P looks like in three numbers. But a P has ONE hump over a thin stem; this has a second heavy hump below.",
        "A thin trend profile has no dominant node. This one has two strong ones.",
        "A D has one hump in the middle. A big value area does not make a day balanced.",
        "",
      ],
    },
    {
      q: "A synthetic profile (10-point rows). What does it suggest, and what can it not tell you?",
      figure: {
        lo: 22350,
        step: 10,
        bins: [2, 5, 12, 25, 45, 70, 85, 72, 48, 26, 12, 5, 2],
        showValueArea: true,
        caption: "Synthetic",
      },
      options: [
        "A trend is about to start, because balance always ends in a breakout",
        "Buyers were in control, because the POC is above the midpoint",
        "A balanced D day: two-sided trade around one area. It cannot tell you which way the next session will go",
        "A b shape: long liquidation",
      ],
      answer: 2,
      difficulty: "apply",
      why: "One hump in the middle with thin ends on both sides is the D. The CBOT guide describes a completed balanced day as bell-shaped. It records agreement today; it carries no information about the direction of tomorrow's move.",
      distractors: [
        "Balance does end eventually, but 'always' and 'about to' are not in the profile. Nothing here dates or directs a breakout.",
        "The POC (22,415) is the middle row of a nearly symmetric profile, not above it. And even a POC one row off centre would be noise, not control.",
        "",
        "A b has its weight at the bottom. This profile is weighted in the middle.",
      ],
    },
    {
      q: "A synthetic profile at 25-point rows: every row holds roughly the same volume. How much weight should yesterday's POC carry tomorrow?",
      figure: {
        lo: 22200,
        step: 25,
        bins: [8, 10, 9, 11, 10, 12, 9, 11, 10, 13, 11, 10, 12, 9],
        caption: "Synthetic: an even stick, no hump",
      },
      options: [
        "Little: with no dominant node the POC is close to arbitrary, and a different row size could move it far",
        "A lot: the POC is always the most important level",
        "A lot, because trend days have the strongest POCs",
        "None of the profile's levels exist on a trend day",
      ],
      answer: 0,
      difficulty: "judge",
      why: "The heaviest row holds 13 against neighbours of 10 and 11: barely a winner. On the visualiser's synthetic trend day the POC is 22,575 at 10-point rows but 22,202.5 at 5-point rows. A level that moves that much with a setting is not telling you much about the market.",
      distractors: [
        "",
        "The POC is just the heaviest row. Its meaning depends on how much heavier it is than the rest, and here it is barely heavier.",
        "Trend days have the WEAKEST POCs, because price never stayed anywhere long enough to build a node.",
        "The levels still exist and are computed the same way. They are just weak references on a day like this.",
      ],
    },
    {
      q: "For 1 Oct your platform reports POC 22,447.5, VAH 22,470, VAL 22,215. A colleague says: 'POC 22.5 below VAH, 232.5 above VAL. Classic P: short covering.' What is the problem?",
      options: [
        "The arithmetic is wrong",
        "Nothing; those numbers define a P",
        "A P needs the POC exactly at VAH",
        "Those three numbers fit a P or a double distribution equally well; you have to look at the profile, and the course's synthetic 1 Oct bars are a double distribution",
      ],
      answer: 3,
      difficulty: "judge",
      why: "POC near the top of a wide value area is what both a P and a two-hump day look like in three numbers. The synthetic 1 Oct profile has a lower hump around 22,180–22,250, a thin waist, and an upper hump around 22,430–22,460. And even if it were a P, 'short covering' would still be an inference.",
      distractors: [
        "22,470 − 22,447.5 = 22.5 and 22,447.5 − 22,215 = 232.5. The arithmetic is fine; the conclusion is the problem.",
        "This is the tempting shortcut. The value-area edges summarise the profile and drop the information that separates one hump from two.",
        "There is no such rule. A P is a silhouette, not an exact position of the POC.",
        "",
      ],
    },
    {
      q: "A blog post says: 'P-shaped days on NIFTY are followed by a down day 70% of the time.' Based on this course's research, how should you treat it?",
      options: [
        "As established, because Dalton reported it",
        "As unsourced: we found no published test of next-day behaviour after P days on any market. Test it on your own data with a written definition of P",
        "As established, because short covering always fades",
        "As false, because shapes can never predict anything",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Dalton's P reading is about who traded, argued from examples. The research notes record no measured next-day statistic. An unsourced percentage is a hypothesis to test, not a fact, and 'never' is just as unsupported as 'always'.",
      distractors: [
        "Dalton describes what a P suggests about participants. The research notes found no next-day rate in his books.",
        "",
        "'Always' is exactly the kind of claim the course asks you to distrust. Dalton says the rally CAN fade without new buying; he gives no rate.",
        "Untested is not the same as false. It may hold weakly, or not at all; only a test with a stated definition can tell you.",
      ],
    },
    {
      q: "NIFTY futures print a P-shaped day. The next morning you see the daily open interest fell by a meaningful amount. What is the fairest conclusion?",
      options: [
        "It proves short covering",
        "It proves new buyers arrived",
        "Open interest is unrelated to who traded",
        "Falling open interest during a rally fits the short-covering reading, but it is still circumstantial: positions closed, and the profile and open interest together still cannot name who closed them",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Open interest falls when contracts are closed. On a rally that fits shorts buying back. But a closing trade needs a buyer and a seller, and daily open interest is a net figure. It is consistent with Dalton's story without proving it.",
      distractors: [
        "Consistent is not proof. A net daily change cannot show which side initiated the closing trades.",
        "New buyers opening positions would push open interest UP, the opposite of what you saw.",
        "Open interest is the one public series that does bear on positions. It is relevant, just not conclusive.",
        "",
      ],
    },
  ],
};

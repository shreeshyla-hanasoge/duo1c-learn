import type { Topic } from "../../types.ts";

export const vpOpen: Topic = {
  id: "vp-open",
  title: "The open",
  tier: 1,
  depth: "deep",
  summary:
    "Where today opens against yesterday's value and range, the four opening types Dalton describes, how each one fails, and how to turn one into a rule you can count.",
  why: "The open is the first piece of evidence about whether today agrees with yesterday. Opening inside yesterday's value says the market still accepts yesterday's prices. Opening outside yesterday's range says something changed overnight. Dalton builds a whole classification on the first minutes. Your strategy builder already has an open-zone input, so the question is how to make the richer version testable without letting judgement creep back in.",
  viz: ["vp-open-types"],
  learn: {
    intuition:
      "Yesterday's profile is the market's last agreed answer to 'what is fair?'. The open asks whether that answer still holds. If today opens inside yesterday's value, nothing has obviously changed, and the default is more of the same. If it opens outside value but inside yesterday's range, the market is testing prices it visited yesterday but did not accept. If it opens outside the whole range, it is in territory yesterday never traded, and someone has to show up and either accept those prices or reject them. Then watch HOW it opens. A market that drives one way from the first minute is behaving differently from one that rotates both ways around its opening price. Dalton's four opening types name those behaviours. Each one comes with a reading, and each reading comes with a way to be wrong.",
    mechanics: [
      {
        heading: "Where it opens: inside value, outside value but inside range, outside range",
        body: "Mind Over Markets (ch.4) organises the open against the prior day in three cases: open within value, open outside value but within range, open outside range, each with an acceptance and a rejection branch. We read its table of contents, not the body text. In code, with sides, that is five places: above range, above value but inside range, inside value, below value but inside range, below range. Your open-zone input is three-way (above, inside or below value), so it merges 'outside value' with 'outside range'. On the visualiser's synthetic yesterday (value 22,325–22,370, range 22,295.4–22,393.95), the open-drive day opens at 22,445, above the whole range, and the open-auction day opens at 22,350, inside value.",
      },
      {
        heading: "What 'the open' is on NSE since December 2025",
        body: "NSE now runs a pre-open call auction from 09:00 to 09:15 for current-month index and stock futures. Order entry runs 09:00–09:10 and closes at a random moment in its last two minutes; matching follows at about 09:10–09:12, then a buffer before 09:15. NSE's circulars introducing it date from November 2025, and news reports give a go-live of 8 December 2025. So NIFTY futures now have an auction-determined opening price. Before that, the futures open came from the first trades of continuous trading. A backtest that spans December 2025 mixes two meanings of 'open'. Check whether your 09:15 bar's open is the auction price, and whether its volume includes the auction's matched quantity.",
      },
      {
        heading: "How it opens: Steidlmayer's four types, as Dalton describes them",
        body: "Dalton credits Steidlmayer with the classification (Markets in Profile, ch.8, p.171). Open-drive: the market opens and auctions aggressively one way. Dalton calls it the strongest, highest-confidence open, with the lowest odds of the opening price being traded again. Open-test-drive: price first tests beyond a known reference such as yesterday's high or low, finds no business there, then reverses hard back through the open. It often fixes one extreme of the day and is the second most confident (p.175). Open-rejection-reverse: price trades one way, meets opposite activity strong enough to push it back through the opening range. Confidence is lower (p.178). Open-auction: price rotates above and below the open with no conviction (pp.181–182).",
      },
      {
        heading: "How each one fails",
        body: "Dalton's readings come with their own failure signs. Open-drive: if price comes back to the open, he says, something has changed, and the drive's premise is gone. Open-test-drive: the 'test' turns out to be the start of a real move the other way. Open-rejection-reverse: Dalton says a later reversal is a serious possibility, so the reversal itself can reverse. Open-auction in range (inside yesterday's value and range): a low-conviction day usually follows, and the failure is a late breakout that a trader who 'knew' it was quiet sells into. Open-auction out of range: the odds of a large move either way rise. If price quickly returns into yesterday's range and value, Dalton says the odds favour going on to the opposite extreme of that range. If it fails to return, they favour a move in the direction of the open. He advises not trading the first several periods of an open-auction day.",
      },
      {
        heading: "Turning an opening type into a rule",
        body: "As words, an opening type can be fitted to almost any morning after the fact. As a rule it has to name every choice: which price is the open (auction price or first continuous trade), which window (15 or 30 minutes), which reference (yesterday's VAH and VAL, or high and low), and how much tolerance counts as 'never came back'. For example: `openDrive = opensOutsideValue && windowLow >= open - k && windowHigh >= open + m` for an upside drive. Tolerance matters. On the synthetic open-drive day the open is 22,445 and the first 30 minutes' low is 22,443.8, 1.2 points under the open. With `k = 0` the rule rejects the visualiser's own example; with `k = 2` it accepts it. Fix k before you look at results.",
      },
    ],
    complexityDerivation:
      "The four opening types are Steidlmayer's, as Dalton credits them, and Dalton's readings of them are verified page by page in Markets in Profile ch.8 (pp.171–183). The strongest-to-weakest ordering, open-drive's low odds of revisiting the open, the open-auction in-range and out-of-range readings, and the advice to sit out early open-auction periods all come from there. Mind Over Markets organises the open against the prior day's value and range (ch.4); we read only its table of contents for that. Notice what kind of claim these are: confidence levels and 'odds favour' statements, argued from experience and examples. We found no published test of any opening type with a stated method, on any market, and nothing for NIFTY or MCX. The types are judged from the first few minutes to the first half hour, and the boundaries between them are judgement calls. Two careful people can classify the same morning differently. On NSE there is an extra wrinkle: since December 2025 NIFTY futures open from a call auction, so 'the open' means something different before and after that date. Untested: whether open-drive days really revisit the open less often than other days, once 'drive' is defined in code.",
    variants: [
      {
        name: "Open-drive",
        when: "Price leaves the open in one direction from the first minutes and does not trade back to it.",
        delta:
          "Dalton's strongest open. As a rule: opening side, window, tolerance k back through the open, and a minimum move m. Fails if price returns to the open.",
      },
      {
        name: "Open-test-drive",
        when: "Price first probes toward a reference (yesterday's high, low, VAH or VAL), finds little trade, then drives back through the open the other way.",
        delta:
          "Needs a reference level and a probe distance on top of the drive's parameters. Often fixes one extreme of the day. Fails if the probe was the real move.",
      },
      {
        name: "Open-rejection-reverse",
        when: "Price trades one way, meets strong opposite activity, and is pushed back through the opening range.",
        delta:
          "Needs a definition of the opening range (for example the first 5 or 15 minutes). Lower confidence in Dalton; the reversal can itself reverse.",
      },
      {
        name: "Open-auction (in range or out of range)",
        when: "Price rotates above and below the open with no conviction.",
        delta:
          "In range: a low-conviction day usually follows. Out of range: a big move either way is more likely. A return into yesterday's value favours the opposite extreme of yesterday's range. Dalton advises waiting several periods.",
      },
    ],
    tradeoffs: [
      {
        vs: "A three-way open zone (above, inside, below value)",
        pick: "Five places, splitting 'outside value' from 'outside range', when you have yesterday's high and low",
        because:
          "Dalton treats an open outside the whole range differently from one that is only outside value. The three-way version cannot express that, and the extra input costs nothing to compute.",
      },
      {
        vs: "Using the first continuous trade as the open",
        pick: "The auction price for NIFTY futures after December 2025, labelled, with pre-December data flagged",
        because:
          "Since the F&O pre-open began, the auction sets the opening price. Mixing the two definitions across a backtest changes what 'open zone' means halfway through the sample.",
      },
      {
        vs: "Classifying the open at 09:20",
        pick: "A fixed, pre-declared window (for example 15 or 30 minutes), accepting the delay",
        because:
          "A shorter window answers sooner but misreads more tests as drives. A longer one is more reliable and leaves less of the day to trade. Choose once, and do not shorten it on days it would have helped.",
      },
    ],
  },
  realWorld: [
    {
      system: "NSE — F&O pre-open session",
      kind: "industry",
      problem:
        "Before the pre-open, futures went straight into continuous trading at 09:15, with no single auction price to open on.",
      applied:
        "A 09:00–09:15 call auction for current-month index and stock futures (and next-month futures in the last five trading days before expiry). Order entry closes at a random moment between 09:08 and 09:10, then orders are matched at a single price.",
      evidence: "NSE: Equity derivatives pre-open session page; circulars NSE/FAOP/71092 and 71527",
      impact: "NIFTY futures now have an auction-determined opening price (reported live from 8 Dec 2025)",
    },
    {
      system: "Dalton — Markets in Profile, ch.8",
      kind: "industry",
      problem:
        "A trader at 09:30 needs to know how much to trust the morning's direction.",
      applied:
        "Four opening types ranked by confidence: open-drive, open-test-drive, open-rejection-reverse, open-auction. Each has a stated reading and a sign that it has failed, such as a drive returning to the open.",
      evidence: "Markets in Profile (Wiley, 2007), ch.8, pp.171–183",
      impact: "The standard vocabulary for the open; readings argued from examples",
    },
    {
      system: "Dalton — Mind Over Markets, ch.4",
      kind: "industry",
      problem:
        "Where the market opens against yesterday changes what the opening type means.",
      applied:
        "The chapter covers opens within value, outside value but within range, and outside range, each with acceptance and rejection branches. It has separate sections for open-auction in range and out of range. We read the table of contents only.",
      evidence: "Mind Over Markets, updated ed. (Wiley, 2013), pp.63–86 (TOC)",
      impact: "Location first, then behaviour",
    },
    {
      system: "Your strategy builder — the open-zone input",
      kind: "yours",
      problem:
        "Open zone records where today opened against yesterday's value area. On the worked example, 1 Oct opens at 22,290, exactly on 30 Sep's VAL of 22,290. Under the course's convention (edges count as inside) the open zone is 'inside'. A platform that treats the edge as outside says 'below'.",
      applied:
        "Three refinements to test, one at a time: state the edge convention explicitly; add yesterday's high and low so 'outside value' and 'outside range' separate (30 Sep's synthetic range is 22,281.6–22,370.4, so 1 Oct's open is inside it either way); and record which opening price your data uses, since NIFTY futures have opened from a call auction since December 2025.",
      impact: "Makes 'open zone' mean the same thing on every day of the sample",
    },
  ],
  insights: [
    {
      t: "Location first, then behaviour",
      d: "Where today opens (inside value, outside value inside range, outside range) frames what the first minutes mean. An open-auction inside value and one outside the range get very different readings from Dalton.",
    },
    {
      t: "Open-drive is the strongest open; returning to the open is its failure",
      d: "Dalton ranks open-drive, open-test-drive, open-rejection-reverse, open-auction, from most to least confident. A drive that trades back to its open has lost its premise.",
    },
    {
      t: "On NSE, 'the open' changed in December 2025",
      d: "The F&O pre-open call auction gives NIFTY futures an auction-determined opening price. Data from before and after measures different things.",
    },
    {
      t: "An opening type is only testable once its tolerance is fixed",
      d: "The synthetic open-drive dips 1.2 points under its open. 'Never trades back' rejects it; 'not more than 2 points back' accepts it. Choose before you count.",
    },
  ],
  pitfalls: [
    "Classifying the open after you have seen the rest of the day. A morning that later trended gets remembered as a drive; write the rule first.",
    "Treating your three-way open zone as if it carried Dalton's range information. 'Above value' covers both an open just above VAH and one far above yesterday's high.",
    "Mixing pre- and post-December 2025 NIFTY futures data without noting that the opening price became an auction price.",
    "Leaving the edge convention implicit. An open exactly on VAL is 'inside' under this course's convention and 'below' on a platform that treats edges as outside.",
    "Trading the first minutes of an open-auction day. Dalton himself advises waiting several periods, because nothing has been decided yet.",
  ],
  quiz: [
    {
      q: "Yesterday (synthetic): value 22,325–22,370, range 22,295.4–22,393.95. Today opens at 22,385. Where is that, and what does a three-way open-zone input record?",
      options: [
        "Inside value; open zone 'inside'",
        "Above value but inside range; open zone 'above'",
        "Above range; open zone 'above'",
        "Below value; open zone 'below'",
      ],
      answer: 1,
      difficulty: "apply",
      why: "22,385 is above VAH (22,370) but below yesterday's high (22,393.95). A three-way input calls it 'above' and cannot say it is still inside the range. That is the distinction Dalton's location cases make.",
      distractors: [
        "22,385 is 15 points above VAH, so it is outside value.",
        "",
        "Yesterday's high was 22,393.95, and 22,385 is below it. Above range would need an open over 22,393.95.",
        "Below value would need an open under VAL, 22,325.",
      ],
    },
    {
      q: "Worked example: 30 Sep's value is 22,290–22,335 (VAL 22,290) and its synthetic range is 22,281.6–22,370.4. 1 Oct opens at 22,290. What is the open zone?",
      options: [
        "Below range, under every convention",
        "Above value",
        "'Inside' under the course's convention (edges count as inside); 'below value, inside range' on a platform that treats the edge as outside",
        "It cannot be classified, because it is on the edge",
      ],
      answer: 2,
      difficulty: "apply",
      why: "The open equals VAL exactly. The course's `zoneOf` treats edges as inside, so it is 'inside'. A platform that requires price ≥ VAL plus a tick, or treats the edge as outside, says 'below'. The open is above 30 Sep's low of 22,281.6, so it is inside the range either way.",
      distractors: [
        "30 Sep's low was 22,281.6. An open at 22,290 is above it, so it is inside the range.",
        "VAH is 22,335. An open at 22,290 is 45 points under it.",
        "",
        "It can be classified; the answer just depends on a convention you must state. Leaving it unclassified would silently drop edge days from a backtest.",
      ],
    },
    {
      q: "Synthetic day: yesterday's VAH is 22,370 and its high 22,393.95. Today opens at 22,420, dips to 22,368.85 within minutes, finds buyers, then rallies back through the open and well above it within the first hour. Which opening type is it, and how confident is Dalton in it?",
      options: [
        "Open-test-drive: a test back to yesterday's VAH that found no selling, then a drive the other way. Dalton ranks it second most confident",
        "Open-drive, the most confident",
        "Open-rejection-reverse, low confidence",
        "Open-auction, because it traded both sides of the open",
      ],
      answer: 0,
      difficulty: "apply",
      why: "The first move went DOWN to a known reference (yesterday's VAH) and found little business. Price then reversed hard back through the open and kept going. That is the test-drive pattern, which Dalton ranks just below the open-drive.",
      distractors: [
        "",
        "An open-drive leaves the open in one direction from the start. This one went 50 points the other way first.",
        "In a rejection-reverse the FIRST direction is the one that fails and the day goes the other way. Here the first move (down) was the test, and the drive up is the main move. Both patterns cross the open, which is why they get confused.",
        "Open-auction means rotating around the open with no conviction. This had one probe and one strong drive.",
      ],
    },
    {
      q: "Synthetic day: opens at 22,420 above yesterday's range, rallies to about 22,469, meets heavy selling, and falls back through the open within the first hour. What does Dalton's reading of this opening type warn you about?",
      options: [
        "Nothing: it is the strongest open, so short it with confidence",
        "That the opening price will never be revisited",
        "That it is a low-conviction day and nothing will happen",
        "It is an open-rejection-reverse, a lower-confidence open, and a later reversal (a move back up) is a serious possibility",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Trading one way, being met by strong opposite activity, and going back through the opening range is the rejection-reverse. Dalton gives it lower confidence than the drives and says a later reversal is a serious possibility.",
      distractors: [
        "The strongest open is the open-drive. Dalton ranks the rejection-reverse lower, and confident shorting is the opposite of his caution.",
        "'Lowest odds of revisiting the open' is Dalton's reading of the open-DRIVE. This day has already traded back through its open.",
        "Low conviction is the open-auction-in-range reading. This open showed strong activity, first one way and then the other.",
        "",
      ],
    },
    {
      q: "Today opens above yesterday's high and rotates around the open for 20 minutes (an open-auction out of range). Price then falls back into yesterday's range and into its value area. What does Dalton say the odds favour?",
      options: [
        "A return to the open and a rally",
        "Continuing to the opposite extreme of yesterday's range",
        "Nothing; open-auctions are unreadable",
        "A close exactly at yesterday's POC",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Dalton writes that if an out-of-range open quickly returns into the prior range and re-enters value, the odds favour continuing to the opposite extreme of that range. Failure to return would favour a move in the direction of the open. Both are odds statements from experience, not measured rates.",
      distractors: [
        "That is the reading for the OTHER branch, when price fails to get back into the range.",
        "",
        "Dalton does give readings for open-auctions. He advises not trading the first several periods, which is different from saying nothing can be read.",
        "No source here gives a POC target for this case, and an exact close is not an odds statement.",
      ],
    },
    {
      q: "Which of these is a testable definition of an upside open-drive?",
      options: [
        "The market opens strongly and buyers are clearly in control",
        "Price opens and drives, as Dalton describes",
        "Any day that closes above its open",
        "Opens above yesterday's VAH (auction price as the open); in the first 15 minutes the low is no more than 2 points under the open and the high is at least 20 points above it",
      ],
      answer: 3,
      difficulty: "judge",
      why: "Only the last option fixes every choice: which price is the open, the reference level, the window, the tolerance back through the open, and the minimum move. A computer gives the same answer before and after it knows how the day ended.",
      distractors: [
        "'Strongly' and 'clearly' are judgements. On a day that later trended, almost any open will look strong in hindsight.",
        "Dalton's description is where the idea comes from, but it does not fix a window or a tolerance. Two coders would implement it differently.",
        "That uses the close, which is not known at the open, and it says nothing about the first minutes.",
        "",
      ],
    },
    {
      q: "You backtest 'open zone' rules on NIFTY futures from January 2024 to September 2026. Which data issue matters most for 'the open'?",
      options: [
        "None; the open is the open",
        "Weekly expiry moved to Tuesday",
        "Since December 2025 NIFTY futures open from a 09:00–09:15 call auction, so the opening price means something different before and after that date",
        "MCX's evening session",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Before the F&O pre-open, the futures open came from the first continuous trades at 09:15. After it, the auction sets the opening price. The open-zone input is computed from that price, so the sample mixes two definitions. Split the test at the change, or at least flag it.",
      distractors: [
        "Exactly the assumption that breaks here. The way the opening price is formed changed in the middle of the sample.",
        "The expiry change (from 1 Sep 2025) matters for expiry-day behaviour, but it does not change how the opening price is formed.",
        "",
        "MCX hours have nothing to do with how NSE futures open.",
      ],
    },
    {
      q: "The visualiser's synthetic open-drive opens at 22,445, and its first-30-minute low is 22,443.8. Your rule says 'an open-drive never trades below the open'. What does this show?",
      options: [
        "Your rule rejects the textbook example. The tolerance is a real parameter: fix one (for example 2 points) before looking at results",
        "The visualiser is wrong",
        "Open-drives do not exist in real data",
        "The rule is fine; 1.2 points is a large reversal",
      ],
      answer: 0,
      difficulty: "apply",
      why: "1.2 points is noise on an index near 22,445, yet a zero-tolerance rule fails on it. Every rule built on 'never came back' needs a tolerance. Choosing it after seeing which days it lets in is a quiet form of curve-fitting.",
      distractors: [
        "",
        "The example behaves exactly as an open-drive is described. The rule's wording is what fails.",
        "They exist as a description. The question is how you write the description so a computer can find them.",
        "1.2 points is about 0.005% of the price, well inside normal minute-to-minute noise.",
      ],
    },
  ],
};

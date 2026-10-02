import type { Topic } from "../../types.ts";

export const vpIndia: Topic = {
  id: "vp-india",
  title: "India-specific realities",
  tier: 1,
  depth: "deep",
  summary:
    "NIFTY has no volume, futures roll every month, MCX runs fourteen and a half hours, and NSE's hours changed in 2026 — each one moves your levels.",
  why: "The profile arithmetic is the same on every exchange; the data underneath it is not. In India the index your options are written on has no volume, the futures that do have volume roll every month, MCX's session spans an Indian morning and a US-hours evening, and NSE changed its derivatives hours in 2026. Each of these silently changes POC, VAH and VAL, and a backtest that ignores them tests something other than what you meant.",
  viz: ["vp-volume-source", "vp-mcx-session"],
  learn: {
    intuition:
      "A volume profile needs three things: prices, volumes, and a clear start and end to the session. For a US stock all three come straight from the exchange. For NIFTY, none of them is simple. The index is a calculated number, so its volume has to be borrowed from something that trades — usually the near-month future, whose price differs from the index and which is replaced by the next contract every month. MCX crude trades from 09:00 to 23:30 (23:55 when the US is on daylight saving time), so 'one session' contains two very different markets. And the calendar has odd days: weekly expiries every Tuesday, a one-hour Diwali session, a Saturday budget session, and from August 2026 a later derivatives close. None of this is exotic. It is simply the list of choices you have to make, write down and keep the same, before a NIFTY or MCX profile means anything.",
    mechanics: [
      {
        heading: "NIFTY has no volume: choose a source, and say which",
        body: "NSE's factsheet describes NIFTY 50 as a free-float market-capitalisation weighted index: a number computed from 50 share prices. Nothing trades 'the index', so there is no volume to put in a profile. The choices are: the near-month future's volume (the usual one, and the one your own platform's levels come from); an index ETF such as NIFTYBEES (a different price scale and a different, smaller pattern of trading); the rupee turnover of the constituent stocks; or a TPO profile on the index itself, which counts time instead of volume and needs none. Some data vendors display a 'volume' for the index, for example summed constituent volume — check what yours actually shows. The `vp-volume-source` visualiser keeps the synthetic 1 Oct prices fixed and applies three ILLUSTRATIVE volume weightings (not measurements of any real ETF or constituent data): the POC stays at 22,447.5 in all three, but VAL moves from 22,215 to 22,235 and 22,225. On other days the POC can move too.",
      },
      {
        heading: "The future is not the index: the basis shifts every level",
        body: "A NIFTY future trades at a premium or discount to the index, called the basis. It changes during the day and through the month, and it narrows towards expiry because the future settles against the index. NIFTY options are written on the index. So a futures POC of 22,447.5 is not an index level: on a day when the future trades 40 points above the index, the matching index price is about 22,407.5, and tomorrow the offset will be different. The safest habit is to compute levels and test the zone on the SAME series — futures levels against futures bars — and use the index only for what is genuinely about the index, such as choosing the option strike. If you must translate, use the basis at that moment, never a fixed offset.",
      },
      {
        heading: "Futures roll: a continuous series either steps or rewrites history",
        body: "Brokers report, and a reproduced SEBI circular from May 2025 supports, that NIFTY monthly futures now expire on the last Tuesday of the month (the previous trading day if that Tuesday is a holiday). Each month the near-month contract changes. TradingView's documentation says its continuous futures are not back-adjusted by default, and that when back-adjustment is switched on, all earlier contracts are shifted by the close difference between the new and old contracts on the nearest daily bar to the switch. Sierra Chart documents date-based or volume-based rollover, each with or without back-adjustment, using the prior day's settlement difference since version 2346. Either way there is a cost. In an unadjusted series the price steps at the roll by the calendar spread, so a composite or a naked POC carried across the roll is off by that step. In a back-adjusted series every old price has been shifted, so an old POC is no longer a price that actually traded. Translate old levels by the spread measured at a stated time, rounded to a whole number of bins so the absolute grid still lines up — or drop them.",
      },
      {
        heading: "MCX: one long session, two markets",
        body: "Broker summaries (we could not open MCX's own pages) give MCX's hours for internationally linked commodities as 09:00 to 23:30, or 23:55 while the US is on daylight saving time. MCX crude is 100 barrels, quoted in rupees per barrel, and settles on the NYMEX front-month settlement price (from MCX's specification, seen only in search snippets). So the Indian contract follows New York, and its busy hours are the Indian evening. In the synthetic `vp-mcx-session` day, about 78% of the volume trades after 17:00. The whole-session POC is 5,773 with value 5,756–5,790; the 09:00–17:00 profile has its own POC at 5,833 (value 5,824–5,846); the 17:00–23:30 profile has POC 5,773 but a much narrower value area, 5,764–5,778. Neither split is wrong. Choose by when your strategy trades, fix the split time, and remember the evening's length changes twice a year with US daylight saving.",
      },
      {
        heading: "Odd days and changing hours distort profiles — flag or exclude them",
        body: "Several kinds of day make a profile unlike a normal one. Weekly NIFTY options expire every Tuesday (since 1 Sep 2025, per brokers and All India Radio), and expiry days trade differently. NSE circulars fix the special sessions: muhurat trading on Fri 1 Nov 2024 ran 18:00–19:00; muhurat on Tue 21 Oct 2025 was in the afternoon, 13:45–14:45; the budget session on Saturday 1 Feb 2025 ran full normal hours; and a live session from the disaster-recovery site ran on Saturday 18 May 2024 in two short parts. A one-hour profile used as 'yesterday' for the next day gives a tiny value area that means little. Session hours themselves changed: NSE's market-timings page now shows equity derivatives closing at 15:40, and news reports date the change to 3 Aug 2026, alongside a new closing auction session for F&O stocks. A pre-open call auction from 09:00 to 09:15 for current-month futures (NSE's page; live from 8 Dec 2025 per Business Standard) means NIFTY futures now open at an auction price. This course's synthetic sessions use 09:15–15:30; a 09:15–15:40 profile of the same day would include ten more minutes, and a backtest that spans August 2026 mixes the two unless you choose one window and apply it throughout.",
      },
    ],
    complexityDerivation:
      "Most of this lesson is about data and calendars, and those facts are well sourced. NSE's own pages and circulars, which we read, confirm the cash-market hours, the 15:40 derivatives close on the current timings page, the F&O pre-open auction, the 2024 and 2025 muhurat sessions, the Saturday budget session and the 18 May 2024 disaster-recovery session. NSE Indices' factsheet confirms NIFTY 50 is a computed, free-float weighted index. TradingView's and Sierra Chart's documentation confirm how their continuous futures roll and adjust. Less firm: the 3 Aug 2026 start date for the 15:40 close and the closing auction come from news reports; the Tuesday expiry dates come from brokers and a reproduced SEBI circular; the MCX hours, crude contract details and NYMEX settlement come from broker summaries and search snippets, because MCX's site blocked our fetches. What is missing entirely is evidence that any of these choices changes trading results: we found no published test of profile rules on NIFTY or MCX at all. The volume-source and MCX figures in this lesson are synthetic or illustrative and show the mechanism, not its size on real data. Also unverified: how the NIFTY index behaves during the 15:15–15:35 closing auction, and what each data vendor's 'index volume' really is.",
    variants: [
      {
        name: "Near-month future volume",
        when: "You want a volume profile that tracks NIFTY and matches the levels most platforms (and yours) show.",
        delta:
          "The deepest volume, one number per bar. Its prices include the basis, and the contract changes every month, so levels need handling at each roll.",
      },
      {
        name: "Index ETF such as NIFTYBEES",
        when: "You want a single instrument that never rolls.",
        delta:
          "No roll, but a different price scale and a much thinner, differently timed volume pattern. Levels have to be converted to index points, and the conversion drifts.",
      },
      {
        name: "Constituents' rupee turnover",
        when: "You want volume that reflects trading in the stocks that make up the index.",
        delta:
          "Fifty feeds instead of one, and the weighting choice (turnover, index weight) is yours to justify. The result is a construction, not something any exchange publishes.",
      },
      {
        name: "TPO profile on the index",
        when: "You want levels on the index's own prices, with no basis and no roll.",
        delta:
          "Counts time at price, not volume, so its POC and value area can differ from a volume profile on the same day (lesson 2 shows how much).",
      },
    ],
    tradeoffs: [
      {
        vs: "A vendor's back-adjusted continuous series",
        pick: "Per-contract data, with old levels translated by a recorded spread or dropped",
        because:
          "A back-adjusted series is convenient but rewrites every old price, so its historical POCs are prices that never traded, and its adjustment method belongs to the vendor. Keeping each contract's own bars and translating levels yourself, by a spread measured at a stated time and snapped to whole bins, makes every level traceable to real trades.",
      },
      {
        vs: "One whole-session MCX profile",
        pick: "A sub-session profile that matches the hours your strategy trades",
        because:
          "On the synthetic crude day the evening holds about 78% of the volume and has a value area less than half as wide as the whole session's. A strategy that trades only the evening gets levels shaped by the evening; in the whole-session profile the morning's volume still counts towards the 70% total and widens the value area around the evening hump.",
      },
      {
        vs: "Keeping every session in the backtest",
        pick: "Flag special and short sessions, and report results with and without them",
        because:
          "A one-hour muhurat profile used as 'yesterday' produces a tiny value area, and an expiry day trades differently from other days. Excluding them silently can hide a real effect; including them silently can create a false one. Flagging them and reporting both ways lets you see which.",
      },
    ],
  },
  realWorld: [
    {
      system: "NSE session changes, 2025–2026",
      kind: "industry",
      problem:
        "A profile's shape depends on exactly which minutes it includes. NSE changed the start and the end of the derivatives day within a year.",
      applied:
        "NSE's pre-open page describes a 09:00–09:15 call auction for current-month futures (go-live 8 Dec 2025 per Business Standard). NSE's timings page now shows equity derivatives closing at 15:40; news reports date this to 3 Aug 2026, with a closing auction session for F&O stocks.",
      evidence:
        "nseindia.com market-timings and equity-derivatives pre-open pages (read); Kotak Neo and Angel One news (secondary)",
      impact: "Profiles before and after these dates cover different windows unless you fix one",
    },
    {
      system: "TradingView and Sierra Chart continuous futures",
      kind: "industry",
      problem:
        "Charting NIFTY futures over months needs one series stitched from many contracts, and every stitch either leaves a step or shifts history.",
      applied:
        "TradingView does not back-adjust by default; when enabled it shifts earlier contracts by the close difference on the nearest daily bar to the switch. Sierra Chart offers date or volume rollover, each with or without back-adjustment, using the prior day's settlement difference.",
      evidence: "TradingView support: back-adjustment for continuous futures; Sierra Chart: Continuous Futures Contract Charts",
      impact: "The same 'NIFTY1!' history can carry different old POCs depending on one setting",
    },
    {
      system: "MCX crude oil — an Indian contract priced off New York",
      kind: "industry",
      problem:
        "MCX crude trades in rupees in India but follows a US benchmark, so its busiest hours fall late in the Indian evening.",
      applied:
        "MCX's specification (seen only in search snippets) gives 100 barrels, ₹ per barrel, a ₹1 tick, and final settlement on the NYMEX front-month settlement price. Broker summaries give the session as 09:00–23:30, or 23:55 during US daylight saving.",
      evidence: "MCX crude oil contract specification (secondary, via search snippets); 5paisa market timings (secondary)",
      impact: "A whole-session profile is dominated by evening trading",
    },
    {
      system: "Your platform's levels — NIFTY near-month future, 5-point bins",
      kind: "yours",
      problem:
        "Your platform reports POC 22,447.5, VAH 22,470 and VAL 22,215 for 1 Oct 2026 on the NIFTY near-month future at 5-point bins, and your strategies trade NIFTY index options.",
      applied:
        "Because the levels come from the future, they carry the basis relative to the index the options are written on, they belong to one contract that is replaced at each last-Tuesday expiry, and their session window depends on whether bars run to 15:30 or 15:40. Each of these is a choice to state in the rule, not a detail to leave to the data feed.",
      impact: "Three hidden settings that decide what 'yesterday's value' means in your rules",
    },
  ],
  cases: [
    {
      id: "india-volume-source",
      scenario:
        "Your strategy buys NIFTY weekly options. Its entry condition is your 'zone' input: the bar's close compared with the previous session's VAH and VAL. Your existing levels come from the NIFTY near-month future at 5-point bins, and you want to keep them. You have one-minute bars for the NIFTY index (no volume), the near-month future (with volume) and NIFTYBEES. You want the zone test to compare like with like, and the backtest runs from 2023 to 2026. Which setup do you use?",
      options: [
        {
          label: "Compare the index's bar closes with the futures VAH and VAL directly",
          appeal: "The options are on the index, so measuring the index's price feels like the honest thing to do.",
        },
        {
          label: "Compute the levels and the zone on the same futures series, handle each roll, and use the index only to choose the strike",
          appeal: "Levels and closes come from one instrument, so the comparison carries no hidden offset.",
        },
        {
          label: "Build the profile from NIFTYBEES and scale it up to index points",
          appeal: "An ETF never rolls, so the level history is one clean series.",
        },
        {
          label: "Switch to a TPO profile on the index itself",
          appeal: "No volume is needed, and the levels are in the index's own prices.",
        },
      ],
      best: 1,
      verdict:
        "The constraint is to keep the futures levels and to compare like with like. Measuring futures closes against futures levels removes the basis from the comparison entirely; the index is still used where it genuinely matters, for the strike. Comparing index closes with futures levels builds the basis, which changes daily and through the month, into every zone. The ETF route changes the volume source and adds a drifting scale conversion. A TPO profile on the index is a defensible design, but it throws away the volume levels you said you want to keep.",
      claims: [
        {
          text: "You accept that the zone is measured on the future's price, which includes the basis, rather than on the index the options are written on.",
          axis: "trade",
          correct: true,
          note: "This is the trade. It is acceptable because the levels are also futures levels, so the basis cancels out of the comparison.",
        },
        {
          text: "You accept a monthly roll that has to be handled in the history of levels.",
          axis: "trade",
          correct: true,
          note: "The future changes at each last-Tuesday expiry, so 'yesterday's value' on the first day of a new contract belongs to the old one unless translated.",
        },
        {
          text: "You give up the ability to compute VAH and VAL, because futures volume is not the index's volume.",
          axis: "trade",
          correct: false,
          note: "VAH and VAL are computed from the future's own volume, which is exactly what the chosen setup does. The index has no volume to lose.",
        },
        {
          text: "On the first session of a new contract, yesterday's levels from the expiring contract shift every zone by the calendar spread unless they are translated.",
          axis: "failure",
          correct: true,
          note: "The roll day is where this setup breaks if nothing is done: the old contract's VAH and VAL sit at a different price level from the new contract's bars.",
        },
        {
          text: "Because the basis is constant through the month, a fixed offset would convert futures levels to index levels exactly.",
          axis: "failure",
          correct: false,
          note: "The basis changes during the day and through the month and narrows into expiry. A fixed offset is wrong almost every day, which is a reason to avoid translating at all.",
        },
        {
          text: "The basis at each entry, to see how far futures-based zones and index-based zones would have disagreed.",
          axis: "measure",
          correct: true,
          note: "This tells you how much the choice of series actually matters on your data, rather than assuming it.",
        },
        {
          text: "Results for the sessions just after each roll, reported separately from all other sessions.",
          axis: "measure",
          correct: true,
          note: "If roll handling is wrong, it shows up here first.",
        },
        {
          text: "The NIFTY index's volume at each POC, to confirm the levels.",
          axis: "measure",
          correct: false,
          note: "The index has no traded volume. Whatever a vendor shows as index volume is a construction you would have to check separately.",
        },
      ],
    },
    {
      id: "india-roll-composite",
      scenario:
        "A rule uses a 5-session composite of NIFTY futures as its weekly value. On the Wednesday after a monthly expiry, the window holds four sessions of the old contract and one of the new. Suppose the new contract traded about 60 points above the old one at the roll (a hypothetical figure). On your unadjusted continuous series the composite now shows two humps about 60 points apart and a wide value area spanning both. The rule needs a 5-session composite every day, on the 5-point grid of the contract you trade, rebuilt only from per-contract data you store yourself. What do you do?",
      options: [
        {
          label: "Keep the composite as it is; the two humps are real structure",
          appeal: "It is what the chart shows, and it needs no extra code.",
        },
        {
          label: "Switch to the vendor's back-adjusted continuous series",
          appeal: "The step disappears and the vendor handles it every month.",
        },
        {
          label: "Translate the old contract's sessions by the spread measured at a stated time on roll day, snapped to whole 5-point bins, and record that the composite is translated",
          appeal: "Keeps five sessions, keeps the grid, and every number can be traced to stored data.",
        },
        {
          label: "Rebuild the composite from the new contract's sessions only",
          appeal: "Every row is a price that genuinely traded on the contract you trade.",
        },
      ],
      best: 2,
      verdict:
        "The two humps are an artefact: the same business, recorded on two contracts whose prices differ by the spread. Translating the old sessions by a spread measured at a stated time, rounded to whole bins, removes the step while meeting every constraint — five sessions, the absolute 5-point grid, and data you store. The back-adjusted series relies on the vendor's adjustment, which the constraint rules out. Rebuilding from the new contract alone gives a 1-session 'composite' on the Wednesday after expiry, which breaks the 5-session requirement.",
      claims: [
        {
          text: "You accept that the translated rows are an estimate: they show where the old business would sit at the roll-day spread, not prices that traded on the new contract.",
          axis: "trade",
          correct: true,
          note: "Translation is a modelling choice. Saying so, and labelling the composite, is what keeps it honest.",
        },
        {
          text: "You accept a rounding error of up to half a bin (2.5 points) when the spread is snapped to the 5-point grid.",
          axis: "trade",
          correct: true,
          note: "Snapping keeps the rows aligned so they can be added; the cost is at most half a row of error in where the old volume lands.",
        },
        {
          text: "You accept losing the absolute grid, since translated sessions can no longer be added row by row.",
          axis: "trade",
          correct: false,
          note: "Snapping the shift to a whole number of bins is exactly what preserves the grid. An unsnapped shift such as 63.35 points would break it.",
        },
        {
          text: "If expiry moved to the previous trading day because the last Tuesday was a holiday, a calendar that assumes Tuesday applies the translation to the wrong sessions.",
          axis: "failure",
          correct: true,
          note: "Brokers report that expiry moves to the previous trading day when Tuesday is a holiday. A hard-coded Tuesday gets those months wrong.",
        },
        {
          text: "Translating by the spread makes the composite identical to what the new contract would have traded in those sessions.",
          axis: "failure",
          correct: false,
          note: "The new contract's own volume in those sessions was different and thinner. Translation moves the old business; it does not recreate the new contract's history.",
        },
        {
          text: "The spread used for each translation, and the time it was measured, stored alongside the composite.",
          axis: "measure",
          correct: true,
          note: "Without this the composite cannot be reproduced or checked later.",
        },
        {
          text: "Rule results in the five sessions after each roll, compared with all other sessions.",
          axis: "measure",
          correct: true,
          note: "Those are the sessions whose levels depend on the translation. If they behave differently, the handling deserves a second look.",
        },
        {
          text: "The vendor's back-adjusted POCs, which the translated composite should match exactly.",
          axis: "measure",
          correct: false,
          note: "TradingView shifts by the close difference on the nearest daily bar and Sierra by the prior day's settlement difference; your spread is measured at your own stated time. There is no reason for an exact match.",
        },
      ],
    },
    {
      id: "india-mcx-split",
      scenario:
        "You are building an MCX crude strategy that only enters between 18:00 and 23:00 and uses 'yesterday's value' as its zone reference. On the course's synthetic crude day the whole 09:00–23:30 profile has POC 5,773 and value 5,756–5,790; the 09:00–17:00 profile has POC 5,833 and value 5,824–5,846; the 17:00–23:30 profile has POC 5,773 and value 5,764–5,778. Which profile do you use for yesterday's value?",
      options: [
        {
          label: "The whole 09:00–23:30 session",
          appeal: "It is the exchange's session, and it is what most charts draw by default.",
        },
        {
          label: "A rolling profile of the last 24 hours, recomputed every bar",
          appeal: "Always up to date, with no split time to choose.",
        },
        {
          label: "Yesterday's 09:00–17:00 profile",
          appeal: "It is the 'Indian' part of the day and the closest analogue to an NSE session.",
        },
        {
          label: "Yesterday's evening profile, from 17:00 to the close, with 17:00 fixed and the close following US daylight saving",
          appeal: "Its levels come from the same hours the strategy trades.",
        },
      ],
      best: 3,
      verdict:
        "The strategy trades only the evening, so its reference should describe the evening. The whole session happens to share the evening's POC on the synthetic day, but its value area is more than twice as wide: the morning's volume, centred well away at 5,833, still counts towards the 70% total, so the area around the evening hump has to widen to reach it. The 09:00–17:00 profile describes hours the strategy never trades. A rolling 24-hour profile is a different reference again, whose levels change every bar, so it is no longer 'yesterday's value'.",
      claims: [
        {
          text: "You accept that the morning's separate value (POC 5,833 on the synthetic day) plays no part in the evening's levels.",
          axis: "trade",
          correct: true,
          note: "That is the point of the split, and also its cost: if the morning matters to the evening, this design ignores it.",
        },
        {
          text: "You accept that the evening profile covers a different length of time in different parts of the year, as the close moves between 23:30 and 23:55.",
          axis: "trade",
          correct: true,
          note: "The broker-reported close moves with US daylight saving, so the profile window changes twice a year.",
        },
        {
          text: "You accept a different POC from the whole-session profile on the synthetic day.",
          axis: "trade",
          correct: false,
          note: "Both POCs are 5,773 on the synthetic day. The difference is in VAH and VAL, not the POC.",
        },
        {
          text: "If the backtest splits at 17:00 and the live system splits at a different time, every evening level differs from the tested ones.",
          axis: "failure",
          correct: true,
          note: "The split time is part of the rule. Changing it changes every level the rule uses.",
        },
        {
          text: "Because crude settles on NYMEX, the MCX evening profile is the same as a NYMEX profile for the same hours.",
          axis: "failure",
          correct: false,
          note: "Final settlement follows NYMEX, but MCX trades its own contract in rupees with its own volume. The profiles are not the same.",
        },
        {
          text: "How entry zones differ between the two references — on the synthetic day, 5,785 is above the evening value (VAH 5,778) but inside the whole-session value (VAH 5,790).",
          axis: "measure",
          correct: true,
          note: "This is how much the choice actually changes your signals, measured rather than assumed.",
        },
        {
          text: "Results split into US daylight-saving and standard-time periods.",
          axis: "measure",
          correct: true,
          note: "The evening window differs in length between them, so this checks whether that matters.",
        },
        {
          text: "The 09:00–17:00 POC as the main reference level for evening entries.",
          axis: "measure",
          correct: false,
          note: "That reintroduces the morning profile the decision was made to set aside.",
        },
      ],
    },
  ],
  insights: [
    {
      t: "NIFTY's volume is always borrowed",
      d: "The index is computed, not traded. Futures volume, ETF volume, constituent turnover or a TPO profile — pick one, state it, and never mix sources across days.",
    },
    {
      t: "A roll either steps prices or rewrites history",
      d: "Unadjusted series jump by the calendar spread at each expiry; back-adjusted series shift old prices so old POCs never traded. Translate levels by a recorded spread snapped to whole bins, or drop them.",
    },
    {
      t: "MCX's day is two markets",
      d: "On the synthetic crude day about 78% of the volume trades after 17:00. Match the profile window to the hours your strategy trades, and keep the split fixed.",
    },
    {
      t: "The session window is part of the rule",
      d: "NSE derivatives now close at 15:40 (reportedly since 3 Aug 2026), and muhurat, budget and DR sessions are short or odd. Fix a window, flag odd days, and report results with and without them.",
    },
  ],
  pitfalls: [
    "Comparing index prices with futures levels. The basis changes every day, so every zone carries a different hidden offset.",
    "Carrying yesterday's VAH and VAL across a roll without translating them. On the first day of the new contract every zone is off by the calendar spread.",
    "Trusting a back-adjusted series' old POCs as real prices. They are shifted, and they no longer match anything that traded.",
    "Using a one-hour muhurat or DR-site session as 'yesterday'. Its value area is tiny and tells the next day very little.",
    "Running one backtest across 3 Aug 2026 without fixing the session window. Profiles before and after cover different minutes unless you choose 15:30 or 15:40 and apply it throughout.",
  ],
  quiz: [
    {
      q: "Your data vendor shows a 'volume' column for the NIFTY 50 index. What should you assume until you have checked?",
      options: [
        "It is the volume traded in the index itself",
        "It is the near-month future's volume",
        "It is open interest",
        "It is something the vendor constructed, such as summed constituent volume, because the index itself does not trade",
      ],
      answer: 3,
      difficulty: "apply",
      why: "NIFTY 50 is a calculated number with no traded volume of its own. Any volume shown for it is borrowed or built. Some vendors sum the constituents' volume; others may do something else. Find out which before building a profile on it.",
      distractors: [
        "Nothing trades 'the index'; only contracts and ETFs on it trade.",
        "Possible for some vendors, but it is an assumption until you check, and it would mean index prices paired with futures volume.",
        "Open interest is a count of outstanding derivative contracts, not a volume, and the index has none either.",
        "",
      ],
    },
    {
      q: "The `vp-volume-source` visualiser keeps the synthetic 1 Oct prices fixed and applies three illustrative volume weightings. The POC stays at 22,447.5 each time, but VAL comes out at 22,215, 22,235 and 22,225. What is the right lesson?",
      options: [
        "The volume source never affects the POC",
        "Volume source is irrelevant for the zone input",
        "The levels depend on whose volume you use; on this synthetic day it moved VAL by up to 20 points, and on another day it could move the POC",
        "The futures weighting is proven to be the correct one",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Same prices, different weights, different value area. A 20-point move in VAL changes which bars count as 'inside' versus 'below' for your zone input. The weightings are illustrative, not measurements of any real ETF or constituents, so the size of the effect on real data is something you would have to measure.",
      distractors: [
        "On this day it did not. A POC that sits on a strong hump is hard to move, but a different day with two similar humps could flip.",
        "The zone input compares closes with VAH and VAL, and VAL moved, so the zone of some bars would change.",
        "",
        "The visualiser shows a mechanism, not which source is right. Futures volume is the usual choice for practical reasons, not because it was proven.",
      ],
    },
    {
      q: "A backtest uses a back-adjusted continuous NIFTY futures series and reports that price 'reached the naked POC at 21,980 from three months ago'. What is wrong?",
      options: [
        "Naked POCs cannot be older than one week",
        "21,980 in a back-adjusted series is a shifted price; no contract necessarily traded there, so 'reaching' it says nothing about the original level",
        "Back-adjusted series have no volume",
        "Nothing; back-adjustment makes old and new prices directly comparable",
      ],
      answer: 1,
      difficulty: "judge",
      why: "Back-adjustment shifts every earlier contract by the spread at each roll (TradingView uses the close difference on the nearest daily bar). After three rolls the old POC has been moved three times. The test is no longer about a price where business was actually done.",
      distractors: [
        "There is no such limit; the issue is whether the price is real, not how old it is.",
        "",
        "Volumes are kept; it is the prices that are shifted.",
        "It makes PRICE CHANGES comparable within a contract. It does not make an old level into a price that traded.",
      ],
    },
    {
      q: "On your unadjusted continuous NIFTY futures chart, a 5-session composite built the day after expiry shows two humps almost exactly one calendar spread apart. What is the most likely explanation?",
      options: [
        "A double-distribution week, with value migrating up",
        "A data error in the new contract",
        "The roll: the old and new contracts trade at different price levels, so the same kind of business lands in two places",
        "The value-area method changed at expiry",
      ],
      answer: 2,
      difficulty: "apply",
      why: "When the distance between humps matches the calendar spread and the break sits at the roll, the simplest explanation is the stitch, not the market. Translate the old sessions by the spread (snapped to whole bins) or restart the composite before reading it.",
      distractors: [
        "A real double distribution is possible, but a gap that exactly matches the spread at exactly the roll points to the series construction first.",
        "The new contract's prices are correct; they are simply a different contract's prices.",
        "",
        "Nothing about the value-area rule changes at expiry; the inputs do.",
      ],
    },
    {
      q: "An MCX crude strategy trades only between 18:00 and 23:00. On the synthetic crude day, the whole-session value is 5,756–5,790 and the 17:00–23:30 value is 5,764–5,778. Price is at 5,785. What zone is it in under each reference?",
      options: [
        "Above value under both",
        "Inside value under both",
        "Inside the evening value, above the whole-session value",
        "Above the evening value, inside the whole-session value",
      ],
      answer: 3,
      difficulty: "apply",
      why: "5,785 is above the evening VAH of 5,778 and below the whole-session VAH of 5,790. The two references disagree, and for an evening strategy that disagreement is exactly why the choice of window has to be made and fixed.",
      distractors: [
        "5,785 is below the whole-session VAH of 5,790, so it is inside that value area.",
        "5,785 is above the evening VAH of 5,778.",
        "This reverses the two value areas; the evening one is the narrower.",
        "",
      ],
    },
    {
      q: "Your NIFTY futures backtest runs from 2024 to 2026 and builds each session's profile from bars that start at 09:15 and end at whatever time the data stops. What changes around August 2026?",
      options: [
        "Nothing; NSE's hours have been 09:15–15:30 throughout",
        "NSE's timings page now shows derivatives closing at 15:40 (reportedly from 3 Aug 2026), so later profiles include ten more minutes unless you fix the window",
        "Derivatives now open at 09:00 with continuous trading",
        "MCX hours apply to NSE derivatives from August 2026",
      ],
      answer: 1,
      difficulty: "apply",
      why: "If the profile ends 'where the data stops', sessions after the change include 15:30–15:40, often busy minutes. Levels before and after are built from different windows. Choose 15:30 or 15:40, apply it throughout, and say which.",
      distractors: [
        "That was true for F&O until the change; NSE's current timings page shows 15:40 for equity derivatives.",
        "",
        "09:00–09:15 is a pre-open call auction for current-month futures, not continuous trading. The normal market still opens at 09:15.",
        "NSE and MCX are separate exchanges with separate hours.",
      ],
    },
    {
      q: "The session before today was the muhurat session of 21 Oct 2025, which ran 13:45–14:45. Your rule uses 'yesterday's value area'. What is the most defensible handling?",
      options: [
        "Use it as normal; it is an official session",
        "Merge it into today's profile",
        "Flag it, and test the rule both with the last full session as 'yesterday' and with these days excluded",
        "Stretch the one-hour profile to a full day's width",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A one-hour session produces a tiny value area that tells the next day little, and silently using or silently dropping it both hide something. Decide the rule for special sessions in advance, flag them, and check whether results depend on the choice.",
      distractors: [
        "Official, yes, but an hour of symbolic trading is not comparable to a normal session as a reference.",
        "That changes the definition of 'today' for a handful of days, which is a different rule and harder to reason about.",
        "",
        "There is no honest way to invent the volume that did not trade.",
      ],
    },
    {
      q: "Since 1 Sep 2025, on which day do NIFTY's monthly futures expire, according to brokers and a reproduced SEBI circular?",
      options: [
        "The last Thursday of the month",
        "The last Tuesday of the month (the previous trading day if it is a holiday)",
        "Every Tuesday",
        "The 19th of each month",
      ],
      answer: 1,
      difficulty: "recall",
      why: "NSE moved its expiries to Tuesday from 1 Sep 2025. Weekly NIFTY options expire every Tuesday; monthly futures and options expire on the last Tuesday. That is the day your near-month future changes and level history needs handling.",
      distractors: [
        "Thursday was the old NSE expiry day; BSE now uses Thursday.",
        "",
        "Every Tuesday is the weekly OPTIONS expiry; futures have a minimum one-month tenor.",
        "That is the commonly reported MCX crude convention, and even there brokers say to check the contract calendar.",
      ],
    },
  ],
};

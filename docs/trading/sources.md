# Volume Profile / Market Profile — research notes for the course module

Prepared 2026-10-03 (all URLs accessed on this date unless stated). Audience: Indian algorithmic trader (NIFTY options on NSE, MCX commodities).

**Labels used on every claim**
- **VERIFIED** — I read it at the cited source (page/section given where possible).
- **SECONDARY** — a reputable secondary source reports it; I could not open the primary.
- **UNVERIFIED** — widely repeated; I could not find a primary source.
- **OPINION / ANALYSIS** — my own reasoning, marked as such.

Everything below is paraphrased. Where a quote is used it is short and marked.

**Note on two book sources.** I read the full text of Dalton, Dalton & Jones, *Markets in Profile* (Wiley, 2007) from a copy hosted online under a misleading filename ("CBOT-Market_Profile-EN.pdf" — it is NOT a CBOT document). I cite the printed book by chapter and page and do not link that copy. For *Mind Over Markets* (updated ed., Wiley 2013) I could read only Wiley's official table of contents, index and Chapter 1 excerpt (links below); claims about its body text are SECONDARY unless stated.

---

## A. Origins (Steidlmayer, CBOT, 1980s)

1. **Steidlmayer, a CBOT trader, devised the Market Profile; the CBOT launched it publicly as a product together with the Liquidity Data Bank (LDB) in the mid-1980s.** Wikipedia gives 1985 as the public introduction; other summaries give 1984 for the LDB going online. — SECONDARY. https://en.wikipedia.org/wiki/Market_profile
   - The CBOT's own *A Six-Part Study Guide to Market Profile* (© 1996 Board of Trade of the City of Chicago) says the profile organisation was "as relevant in 1995 as it was in 1984" (Introduction, printed p.2). That supports a 1984 starting point for the concept inside the CBOT. — VERIFIED. https://www.profiletrading.com/cbot-a-six-part-study-guide-to-market-profile.pdf (PDF p.5)
   - **Gap:** I found no primary CBOT press release fixing the exact launch date. The 1984/1985 difference is still open.
2. **What the LDB was.** The CBOT guide's explanatory notes on a sample LDB report (Part VI, about PDF p.268) describe the columns. The report lists, for each price traded that session: non-spread volume; that volume as a percentage of the total; the share traded by local floor traders for their own accounts (CTI1); the share traded by commercial clearing members for their house accounts (CTI2); and the half-hour brackets in which each price traded. Reported volume was generally double the contract count, because buy and sell sides were counted separately. Reports were available for day, evening and GLOBEX sessions, or for all of them combined. — VERIFIED (CBOT guide, Part VI, LDB report notes B–I, PDF p.268).
   - Trade categorisation by trader type (locals, commercials, members filling for other members, public orders) is also described in the Wikipedia summary. — SECONDARY.
3. **How the CBOT defined the value area.** In the note on the LDB report, the CBOT defines the value area as the price range holding 70% of non-spread traded and cleared volume, and adds in parentheses that this is one standard deviation rounded up to 70%. — VERIFIED (CBOT guide, Part VI, PDF p.268, note H).
4. **The CBOT's "70% range" calculation** (Part II, printed p.51). Start at the highest-volume price. If it alone holds at least 70% of the day's volume, stop. Otherwise compare the combined volume of the **two** prices above with the **two** prices below, add the larger pair, and repeat until about 70% is reached. Worked example: 555 contracts total, target 388; compare 80+90=170 against 70+60=130 and take 170 first. The guide says the result usually comes out slightly **above** 70%, because whole price levels are added, never fractions of one. — VERIFIED (PDF p.54).
5. **Did Steidlmayer treat the distribution as normal?** Conceptually yes; computationally no.
   - The CBOT guide calls the bell-shaped curve the market's "ultimate common denominator" and describes a completed balanced distribution as bell-shaped (Introduction, printed p.3). — VERIFIED (PDF p.6).
   - Part IV (printed p.129) says volume falls within one, two or three standard deviations of the mean. It maps the "first standard deviation" to the value area (high volume, accepted price) and the "third standard deviation" to excess (low volume, rejected price). — VERIFIED (PDF p.130).
   - Part I/II also says the top and bottom of the value area mark where the first standard deviation ends and the second begins. — VERIFIED (PDF p.69).
   - **However, no CBOT procedure estimates σ.** The value area is always found by the greedy expansion outward from the POC (point 4). Calling it "one standard deviation" is a label, not a calculation. — VERIFIED (absence of any σ calculation in the procedure, p.51) + ANALYSIS.
6. **Is 70% really 1 SD (68.27%)?** — ANALYSIS (standard mathematics).
   - The central interval mean ± 1σ holds 68.27% of a normal distribution. That interval equals "the narrowest band around the peak holding 68.27%" only when the distribution is symmetric and has a single peak.
   - Real profiles are often skewed or have two peaks (Dalton's "double distribution" days). For those, a 70% band grown from the POC has no fixed link to the mean or σ. Note also that the greedy POC expansion is not guaranteed to find even the *narrowest* 70% band.
   - So 70% is best taught as a **round-number convention inspired by** 1σ, not as a derived statistic. The CBOT's own wording ("rounded up to 70 percent") supports this.
7. **Steidlmayer & Koy, *Markets and Market Logic* (Porcupine Press, 1986, ISBN 0941275000)** — publication details SECONDARY (AbeBooks / Amazon listings: https://www.abebooks.com/9780941275002/Markets-Market-Logic-Steidlmayer-Peter-0941275000/plp).
   - **Gap:** I could not find a legitimate full-text or archive.org copy. I therefore could NOT verify what the book says about the 70% figure or normality. Do not cite page numbers from it.
8. **The original CBOT day types were four: normal, normal variation, trend, neutral** (Part I, printed pp.9–18). — VERIFIED (PDF pp.12–21).
   - **Normal day:** about 85% or more of the range forms during the initial balance.
   - **Normal variation day:** range extension of up to about double the initial balance.
   - **Trend day:** range extension well beyond double the initial balance, with a close on the extreme.
   - **Neutral day:** range extension on both sides.
   - The guide's summary table also gives rough short-term/long-term volume splits per type (e.g. normal ≈ 80/20, neutral ≈ 70/30). These are illustrative, not measured statistics.
9. **The "initial balance" was originally market-specific, not "the first hour".** The CBOT guide says it took one hour in grain futures. In CBOT financials it was also about one hour before their sessions were lengthened, and about one hour 40 minutes afterwards. The guide tells readers to work out the right length for each market. — VERIFIED (Part I, printed p.9 / PDF p.12). *Course implication (ANALYSIS):* using 09:15–10:15 IST as NIFTY's initial balance is a convention, not a rule handed down from the CBOT.

---

## B. Dalton — *Mind Over Markets* (1990; updated ed. 2013) and *Markets in Profile* (2007)

Sources:
- *Mind Over Markets: Power Trading with Market Generated Information*, Updated Edition. J. F. Dalton, E. T. Jones, R. B. Dalton. Wiley, June 2013, 368 pp.
  - Official table of contents: https://catalogimages.wiley.com/images/db/pdf/9781118531730.toc.pdf — VERIFIED
  - Official index: https://catalogimages.wiley.com/images/db/pdf/9781118531730.index.pdf — VERIFIED
  - Product page: https://www.wiley.com/en-us/Mind+Over+Markets:+Power+Trading+with+Market+Generated+Information,+Updated+Edition-p-9781118659762
- *Markets in Profile: Profiting from the Auction Process*. J. Dalton, R. B. Dalton, E. T. Jones. Wiley, 2007. Full text read (see note at top).

1. **Day types (Mind Over Markets, ch.2, pp.19–31):** Normal Day, Normal Variation of a Normal Day, Trend Day, Double-Distribution Trend Day, Nontrend Day, Neutral Day (the index also lists Neutral-Center and Neutral-Extreme). — VERIFIED (section titles in the Wiley TOC and index).
   - Dalton's list adds **Double-Distribution Trend** and **Nontrend** to Steidlmayer's original four (compare A.8). — ANALYSIS from the two VERIFIED lists.
   - What each type implies, as summarised by secondary sources (body text not read):
     - **Normal:** a wide initial balance set early by other-timeframe traders, then little range extension.
     - **Normal variation:** range extension on one side, roughly up to the size of the initial balance.
     - **Trend:** a narrow initial balance, then steady one-way migration, closing near the extreme.
     - **Double-distribution trend:** a quiet, narrow start, then a sharp move to a new area, leaving two distributions joined by single prints.
     - **Neutral:** range extension on both sides; a close in the centre versus at an extreme matters.
     - **Nontrend:** a very narrow range and little extension, often ahead of news.
     — SECONDARY. https://timelessmarkettheory.com/concepts/day-types ; https://www.marketcalls.in/market-profile/market-profile-different-types-of-profile-days.html
2. **Initial balance (Markets in Profile, ch.4, p.48):** the range traded during the first two trading periods. It shows the opening and the first auction explorations. — VERIFIED.
   - With 30-minute periods this is the first hour. Remember the CBOT's market-specific caveat (A.9).
3. **Range extension (Markets in Profile, ch.4, p.48):** auctions that stretch the profile beyond the initial balance.
   - Upward extension that keeps attracting buying shows real buying strength. Downward extension that is accepted shows selling strength. — VERIFIED.
4. **Opening types (Markets in Profile, ch.8, pp.171–183; Mind Over Markets, ch.4, pp.63–73).** Dalton credits **Steidlmayer** with the four-way classification (Markets in Profile p.171). — VERIFIED.
   - **Open-Drive:** opens and auctions aggressively one way. Dalton calls it the strongest, highest-confidence open, with the lowest odds of the opening price being revisited. If price does return to the open, something has changed. — VERIFIED (pp.171–172).
   - **Open-Test-Drive:** first tests beyond a known reference (e.g. the prior high or low), finds no business there, then reverses hard back through the open. Often fixes one extreme of the day. Second most confident. — VERIFIED (p.175).
   - **Open-Rejection-Reverse:** trades one way, meets opposite activity strong enough to drive price back through the opening range. Lower confidence, so a later reversal is a serious possibility. — VERIFIED (p.178).
   - **Open-Auction:** rotates above and below the open with no conviction. Interpretation depends on where it opens:
     - **In range** (inside the prior day's value area and range): a low-conviction day usually follows.
     - **Out of range:** the market is out of balance, so the odds of a large move either way rise.
     - If an out-of-range open quickly returns to the prior range and re-enters value, the odds favour continuing to the opposite extreme of that range. Failure to return favours a move in the direction of the open.
     - Dalton advises not trading the first several periods of an Open-Auction day.
     — VERIFIED (pp.181–182). Mind Over Markets has separate sections "Open-Auction in Range" and "Open-Auction out of Range" (TOC pp.70–71). — VERIFIED (TOC).
5. **Open relative to the prior day** (Mind Over Markets ch.4, pp.74–86, TOC): open within value; open outside value but within range; open outside range — each with "acceptance" and "rejection (breakout)" cases. — VERIFIED (TOC). Body text not read.
6. **Value-area relationships** (Markets in Profile ch.4, Figure 4.5, p.51): higher, lower, overlapping-higher, overlapping-lower, outside, inside. — VERIFIED.
   - Dalton weighs value placement more heavily than price, because price can be higher while value is unchanged or even lower (p.50). — VERIFIED.
   - *Unchanged* also appears in Dalton's checklists, e.g. "overlapping-to-higher, higher, unchanged" (Markets in Profile, ch.7). — VERIFIED.
7. **Excess (Markets in Profile ch.6, "Intermediate-Term Auctions", ~pp.81–85):** a sharp price high or low that ends an auction. Excess highs and lows occur on light volume and are often followed by a sharp move away. A gap is described as an extreme form of excess. — VERIFIED. Mind Over Markets: "Excess"/"Signs of Excess" (pp.110–111), long-term excess (p.150). — VERIFIED (TOC).
8. **Poor highs and lows / tails / single prints.**
   - Mind Over Markets index: "Single-print tails, 14, 41"; "Tails (or Extremes), 40"; "poor lows or highs, 312–316". — VERIFIED (index).
   - Markets in Profile labels a "poor low" in a figure (ch.7) and uses single-print buying tails as evidence of responsive buyers (ch.7–8). — VERIFIED.
   - Sierra Chart's documentation defines a poor high as a TPO high equal to a previous TPO high. — VERIFIED. https://www.sierrachart.com/index.php?page=doc%2FStudiesReference%2FTimePriceOpportunityCharts.html
   - The common reading — a poor high or low is an "unfinished auction" likely to be revisited — is SECONDARY; I could not read Dalton's body text on it.
9. **"P" and "b" profiles (Markets in Profile ch.4, pp.55–56, Figs 4.8–4.9):**
   - A profile weighted at the top usually means **short covering** without new long-term buying ("p" shape).
   - The mirror image means **long liquidation** ("b" shape).
   - Dalton later notes a trend day that ended in a "b" shape did not bode well for continuation (ch.7).
   — VERIFIED. Mind Over Markets: "Short-Covering Rallies" (p.123), "Long-Liquidation Breaks" (p.127). — VERIFIED (TOC).
10. **TPO versus volume value areas differ, and Dalton says so.** Markets in Profile ch.2 (pp.24–25) defines the value area as 70% of TPOs, built from the POC by comparing two-price sums above and below. In its worked example (Fig. 2.3):
    - 78 TPOs in total, target 55.
    - The TPO value area comes out at 99-21 to 99-28 (73%).
    - The same day's **volume** value area was 99-20 to 99-30.
    — VERIFIED. Mind Over Markets has Appendix 1 "Value-Area Calculation" (volume and TPO versions, pp.331–333) and Appendix II "TPO versus Volume Profiles" (pp.335–339). — VERIFIED (TOC).

---

## C. The "80% rule"

1. **What Dalton actually wrote: the "Value-Area Rule".** Mind Over Markets has a section titled "The Value-Area Rule" (updated ed., pp.244–246, under "Special Situations"). — VERIFIED (TOC + index).
   - A Team LBR (Linda Raschke's team) blog post from 2008 quotes the first edition (pp.279–280). It reports two things — SECONDARY (http://teamlbr.blogspot.com/2008/09/mp-value-area-rule-80-rule.html):
     - (a) The rule needs the market to open outside the prior day's value area and then show acceptance by trading inside it during **two** half-hour periods. The book **does not say the periods must be consecutive**.
     - (b) Dalton warns that taking the trade without weighing other market conditions makes a full traverse of the value area little better than a coin flip. He says the rule's power comes from reading the surrounding context: balance, value-area width and market direction.
   - The post also says the "80%" figure does not appear in Dalton's text. — SECONDARY. I could not confirm this independently; it is worth checking against a physical copy before publishing.
2. **Origin claims.** Many sites say the "80% rule" first appeared in *The Profile Reports* (Dalton Capital Management, 1987–1991). Examples: https://www.marketcalls.in/market-profile/market-profile-how-to-play-80-percentage-rule.html ; scribd copies. — **UNVERIFIED.** I found no copy of *The Profile Reports*. Metrotrade credits the rule to Steidlmayer "at the Chicago Mercantile Exchange", which is factually wrong (he was at the CBOT). https://www.metrotrade.com/what-is-the-80-rule-in-futures-trading/
3. **The conditions drift from source to source** (each one VERIFIED as stated by that source):
   - **ShadowTrader:** open outside value, then trade into value for two **consecutive** 30-minute periods → 80% chance of rotating to the other side. Neither period needs to *close* inside value. A market that opens inside value, leaves and comes back also qualifies. It warns against trading the rule mechanically. https://www.shadowtrader.com/glossary/eighty-percent-rule/
   - **marketcalls.in (Indian):** a much weaker condition — the open is outside value and the A or B period merely *touches* VAH/VAL. — VERIFIED as stated; note how far this is from Dalton.
   - **TradingView author post:** "returns to value twice for two periods". https://tw.tradingview.com/chart/SENX/TjQxi0oP-test-of-the-80-rule
   - *Course implication (ANALYSIS):* there is no single canonical rule. A backtest must state its exact definition: open outside value or moved outside? Trade inside or close inside? One period or two? Consecutive or not? Which value area — TPO or volume? Which session?
4. **Empirical tests found (none rigorous; all well below 80%):**
   - **Team LBR (2008), ES day session, 119 days from 10 Apr 2008:** 76 opens outside the prior value area. Two half-hour periods inside value: 41 cases, 16 full fills (**39%**). Two consecutive periods: 40 cases, 16 fills (**40%**). The author calls the sample small. — SECONDARY (blog; I read the post, not raw data).
   - **mypivots dictionary:** says E-mini S&P testing found it works about **60%** of the time ("the 60% rule"). No author, period or method given. — SECONDARY / weak. https://www.mypivots.com/dictionary/definition/25/80-rule
   - **"TradeStation backtest ≈ 62%"**, quoted by several AI-written or aggregator pages. — **UNVERIFIED**; I could not trace an original.
   - **"Tracked 18 months ≈ 70%"** — UNVERIFIED (search snippet only; no source page found).
   - **Quantopian forum (archived):** one user reports 33 signals, 28 profitable, over **5 days** of S&P 5000-tick data. The sample is far too small to mean anything. The coder noted that results change a lot depending on how the rule is coded. — VERIFIED (archive read). https://quantopian-archive.netlify.app/forum/threads/how-to-pick-intraday-market-direction-the-80-percent-rule.html
   - **EliteTrader (2007):** a poster says testing shows "nowhere close to 80%", with no data. — VERIFIED as an anecdote. https://www.elitetrader.com/et/threads/value-area-80-rule.95941/
   - **No peer-reviewed test found. No NIFTY or MCX test with stated methodology found.**
   - **Finding:** the "80%" is folklore. The only documented test with a stated method found about 40% on ES (small sample, 2008), and Dalton himself reportedly says the context-free version is close to a coin flip.

---

## D. How the platforms compute the value area — and why VAH/VAL differ

### TradingView
- **Volume Profile (basic concepts)** — VERIFIED. https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/
  - **Data:** the profile is built from lower-timeframe bars of the same symbol; for a daily session it loads the 1-minute bars. Which lower timeframe is used depends on the indicator. The page does not say how a single bar's volume is spread across the price rows it covers. — Gap: intrabar allocation undocumented.
  - **Up/down volume:** up if the bar's close ≥ open, down otherwise. This is bar direction, not buyer/seller aggression.
  - **Default value area:** 70%.
  - **Algorithm:**
    - Expand **one row at a time** from the POC, comparing the next row above with the next row below and adding the larger.
    - **Stop if adding the chosen row would exceed the target.** So TradingView's volume value area is ≤ 70%, the opposite of the CBOT's ≥ 70%.
    - Ties: take the row closer to the POC; if equally close, take the row **above**.
- **Session Volume Profile** — VERIFIED. https://www.tradingview.com/support/solutions/43000703072-session-volume-profile/
  - Lower timeframe by chart resolution, e.g.:

    | Chart | Lower TF used |
    |---|---|
    | 1–4 min | 1 min |
    | 5–15 min | 1 min |
    | 16–30 min | 5 min |
    | 31–60 min | 10 min |
    | 61–120 min | 15 min |
    | 121–240 min | 30 min |
    | ≥241 min | 60 min |

    **So the same session can produce a different profile on a 5-minute chart (1-minute source) than on a 60-minute chart (10-minute source).**
  - Profiles reset at the start of each year.
  - Total rows across profiles are capped under 6,000.
  - Sessions default to "All", which merges pre-market, main and post-market sessions.
  - **"Number of Rows" vs "Ticks Per Row":** in Number-of-Rows mode, ticks per row = (top − bottom) / rows / tick size, rounded to whichever integer gives a row count closer to the requested number. Extra rows can be added, so the actual count may exceed the request.
  - The Visible Range VP page repeats the same rows logic. https://www.tradingview.com/support/solutions/43000703076-visible-range-volume-profile/
- **TradingView TPO indicator** — VERIFIED. https://www.tradingview.com/support/solutions/43000713306-time-price-opportunity-tpo-indicator/
  - Same one-row expansion, the same tie rule (closer to POC, then the higher row), but it runs **until the block count reaches the target** — so it can overshoot, unlike the VP's stop-before-exceeding rule.
  - "Auto" row size: (highest high − lowest low of the **latest 300 bars**) / tick size / 80 rows, rounded to an increment of 5, 50, 500…
  - **ANALYSIS:** the auto row size, and so VAH/VAL, can change with the chart's timeframe and recent history. A fixed ticks-per-row is needed for reproducible levels.

### Sierra Chart
VERIFIED. https://www.sierrachart.com/index.php?page=doc%2FStudiesReference%2FTimePriceOpportunityCharts.html and https://www.sierrachart.com/index.php?page=doc%2FStudiesReference.php&ID=141&Name=Volume_by_Price
- **TPO value area and volume value area are both 70% by default**, set by separate inputs ("TPO Value Area %" and "Volume Value Area %").
- **Default algorithm: one row at a time** from the POC. Add the larger of the next row above and the next row below; the smaller one is compared again in the next round. **Stop when the total reaches or exceeds the target** (so ≥ 70%).
- **Tie between the two candidate rows:** include **both**, then move on.
- **POC tie:** take the level nearest the middle of the profile; if two are equally near, take the **lower** one.
- **Option "Count 2 Levels at a Time for Value Area"**: uses the CBOT/Dalton two-level comparison. Sierra explicitly says it supports two value-area methods.
- **Sierra's own list of reasons values can differ between users or programs:**
  - profile period settings
  - value-area %
  - **session times, which must match exactly**
  - bar timeframe, which must divide evenly into the TPO letter length; 1-minute bars are most accurate
  - non-time bars (range, Renko, etc.), which degrade accuracy
  - for Volume by Price, needing tick-by-tick data and Ticks Per Volume Bar = 1 for maximum consistency
- **Volume by Price:** the "Ticks Per Volume Bar" setting is changed automatically from 0 to 2; Sierra recommends 4–10 on daily charts for performance. TPO and VbP value areas differ by default unless the TPO's "Value Area Highlight Based on Volume" is turned on.

### NinjaTrader 8 (Order Flow+ Volume Profile)
VERIFIED. https://ninjatrader.com/support/helpGuides/nt8/order_flow_volume_profile.htm
- **Default value area is 68% (configurable)** — not 70%.
- **Data:**
  - **Minute resolution (default):** each 1-minute bar's volume is **split evenly across every price between its high and low** (an approximation).
  - **Tick resolution:** real traded volume per price. NinjaTrader recommends tick data for intraday charts.
  - Buy/sell and delta display modes require tick data.
- **Price (TPO) profile:** fixed 30-minute windows, with letter "A" starting at **08:00 CST**.
  - **ANALYSIS:** for NSE (09:15 IST) this fixed anchor will misalign TPO letters with the Indian session unless it can be changed. Check before use.
- Also offers an initial-balance option (minutes configurable), developing POC/VA, and "naked" POC/VA extensions.
- **Gap:** NinjaTrader does not document its value-area expansion (one row or two, tie rules).

### thinkorswim
- `VolumeProfile` value area percent defaults to 70. — SECONDARY (search snippet of the official reference page). https://toslc.thinkorswim.com/center/reference/thinkScript/Functions/Profiles/VolumeProfile

### Worked example — same data, three algorithms
ANALYSIS; script in scratchpad `va.py`.

- **Profile (price: volume):** 110:5, 109:10, 108:30, 107:20, 106:60, 105:100 (POC), 104:90, 103:20, 102:15, 101:70, 100:40, 99:10.
- **Total and target:** total 470; 70% target = 329.

| Method | VAL–VAH | Share of volume |
|---|---|---|
| CBOT/Dalton (two rows, stop at ≥70%) | **101–107** | 79.8% |
| Sierra default (one row, stop at ≥70%) | **102–108** | 71.3% |
| TradingView VP (one row, stop before exceeding) | **103–108** | 68.1% |
| NinjaTrader (68% target) | — | different target again |

- **Lesson:** VAL moves by two full rows across methods from identical data. The two-row method "jumps" over the thin 103/102 rows to grab the 101 node. Any rule that keys off VAH/VAL (such as the 80% rule) inherits this ambiguity.

### Other sources of difference (ANALYSIS, grounded in the docs above)
1. TPO-based versus volume-based value area (Dalton Fig. 2.3 shows they differ on the same day).
2. Row size / tick grouping.
3. Intrabar volume allocation (lower-timeframe bars on TradingView, an even split on NinjaTrader's minute mode, tick data on Sierra).
4. Session definition (extended hours on or off; for NSE, whether the pre-open auction trade and the post-close session are included).
5. The value-area percentage (70 vs 68).
6. Which instrument is used (NIFTY futures versus an ETF; see G).
7. Continuous-contract construction (see G).

---

## E. Evidence — academic and rigorous practitioner work

1. **No peer-reviewed study testing Market Profile value-area rules was found.** I searched for Market Profile / TPO / value-area tests in finance journals, SSRN and arXiv; nothing turned up that tests Steidlmayer/Dalton rules with proper statistics. **This is itself a key finding.**
   - Recent SSRN/arXiv items (e.g. a crypto volume-profile mean-reversion backtest, SSRN 6932998) are single-author working papers, not peer-reviewed. Not relied on.
   - Several aggregator pages cite "a 2020 Tradamaker study of 2,500 ES sessions, 65%" and "Dalton: price returns to the prior POC 80% of the time". **UNVERIFIED — possibly fabricated; no source found. Do not use.**
2. **Osler (2000), "Support for Resistance: Technical Analysis and Intraday Exchange Rates", FRBNY *Economic Policy Review* 6(2).** — VERIFIED (read the PDF). https://www.newyorkfed.org/medialibrary/media/research/epr/00v06n2/0007osle.pdf
   - **Data:** support/resistance levels published daily by six FX firms, January 1996 – March 1998, for USD against the mark, yen and pound. Intraday rates 9am–4pm New York time.
   - **Method:** a bootstrap test against artificial (random) levels.
   - **Results:**
     - Rates "bounced" at published levels **60.8%** of the time versus **56.2%** at arbitrary levels.
     - All 16 firm–currency pairs beat the random levels; 13 were significant at 5%.
     - Predictive power lasted at least five business days.
     - The firms' own ranking of level "strength" had no value.
     - Most levels ended in 0 or 5.
   - **Relevance:** price-based levels, not volume-at-price, and the edge is only about 4–5 percentage points. Profitability is not tested.
3. **Lo, Mamaysky & Wang (2000), "Foundations of Technical Analysis", *Journal of Finance* 55(4):1705–1765** (NBER WP 7613). — VERIFIED (abstract). https://www.nber.org/papers/w7613
   - **Method:** kernel regression to detect chart patterns automatically. **Data:** many US stocks, 1962–1996.
   - **Finding:** several patterns give incremental information about return distributions. The authors stop short of claiming profits ("may have some practical value").
4. **Sullivan, Timmermann & White (1999), "Data-Snooping, Technical Trading Rule Performance, and the Bootstrap", *JF* 54(5):1647–1691.** — Abstract VERIFIED (https://ideas.repec.org/a/bla/jfinan/v54y1999i5p1647-1691.html).
   - **Method:** applies White's Reality Check to an expanded universe of rules built from Brock-Lakonishok-LeBaron's 26, on 100 years of DJIA data (universe size of about 8,000 rules is from memory — UNVERIFIED).
   - **Findings as summarised by Hsu & Kuan:** STW, plus White (2000), found no simple rule that stays profitable after correcting for data-snooping for the DJIA, the S&P 500 and S&P 500 futures. — SECONDARY (https://homepage.ntu.edu.tw/~ckuan/pdf/snoop01.pdf).
   - My recollection is that STW found the best rule significant in-sample but not in the 1987–96 out-of-sample period — **UNVERIFIED, check the paper before teaching it.**
   - Hsu & Kuan themselves found significant rules for NASDAQ Composite and Russell 2000 but not for DJIA or S&P 500. — VERIFIED (abstract).
5. **White (2000), "A Reality Check for Data Snooping", *Econometrica* 68(5):1097–1126.** Tests whether the best model found in a search beats a benchmark once the search itself is accounted for. — VERIFIED (abstract). https://ideas.repec.org/a/ecm/emetrp/v68y2000i5p1097-1126.html
6. **Hansen (2005), "A Test for Superior Predictive Ability", *JBES* 23:365–380.** A more powerful version that is less sensitive to poor or irrelevant alternatives than the Reality Check. — SECONDARY (RePEc summary). https://ideas.repec.org/a/bes/jnlbes/v23y2005p365-380.html
7. **Bailey, Borwein, López de Prado & Zhu, "The Probability of Backtest Overfitting"** (*J. Computational Finance*; SSRN 2326253). Hold-out methods are unreliable for backtests; the paper proposes PBO estimated by combinatorially symmetric cross-validation (CSCV). — SECONDARY (SSRN abstract via search; SSRN blocked fetch). https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253
   - **Related result (VERIFIED, Bailey, Ger, López de Prado, Sim & Wu, "Statistical Overfitting and Backtest Performance", summarising Bailey et al. 2014, *Notices of the AMS* 61(5):458–471):** with only five years of daily data, trying 45 or more independent strategy variants makes it more likely than not that the best one shows an in-sample Sharpe ratio ≥ 1.0 by chance. https://sdm.lbl.gov/oapapers/ssrn-id2507040-bailey.pdf
8. **Bailey & López de Prado (2014), "The Deflated Sharpe Ratio", *JPM* 40(5):94–107.** Adjusts the Sharpe ratio for selection bias under multiple testing, short samples and non-normal returns. — SECONDARY (journal abstract page via search). https://jpm.pm-research.com/content/40/5/94.abstract
9. **Harvey & Liu (2015), "Backtesting", *JPM* 42(1):13–28.** — VERIFIED (read PDF). https://people.duke.edu/~charvey/Research/Published_Papers/P120_Backtesting.PDF
   - Gives a multiple-testing "haircut" for reported Sharpe ratios.
   - The industry's 50% rule of thumb is wrong: the haircut is **nonlinear**. It is much larger than 50% for marginal strategies and at most about 25% for strategies with an annualised Sharpe above 1.0 (under their assumptions).
10. **Harvey, Liu & Zhu (2016), "…and the Cross-Section of Expected Returns", *RFS* 29(1):5–68.** Given extensive data mining, a new factor should clear **t > 3.0** rather than 2.0. — SECONDARY (abstract via search). https://academic.oup.com/rfs/article/29/1/5/1843824
11. **Kakushadze & Serur, *151 Trading Strategies*** — **not checked** (ran out of budget). Gap.
12. **OPINION:** for a course, the honest framing is:
    - S/R levels in general have a small, real, decaying edge (Osler).
    - Volume-at-price levels are untested in peer-reviewed work.
    - Any profile rule a student mines from data must clear multiple-testing hurdles (White/Hansen, PBO, DSR, t > 3).

---

## F. VWAP and related tools

1. **VWAP origin.** Berkowitz, Logue & Noser (1988), "The Total Cost of Transactions on the NYSE", *JF* 43(1):97–112.
   - Measures market impact as the difference between a trade's price and the **day's volume-weighted average price**, across about 14,000 institutional trades.
   - Finds market impact of about 5 bp, commissions about 18 bp, total about 23 bp.
   — SECONDARY (Semantic Scholar abstract). https://www.semanticscholar.org/paper/The-Total-Cost-of-Transactions-on-the-NYSE-Berkowitz-Logue/77320e0e8a328bf6e9b3651817d66318bf8c2508
2. **VWAP calculation on TradingView:**
   - Cumulative (typical price × volume) / cumulative volume. The source defaults to hlc3.
   - It resets on the chosen anchor (session, week, month… earnings, dividends, splits).
   - Optional bands: standard-deviation mode or percentage mode, with three multipliers.
   — VERIFIED. https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/
   - NinjaTrader's Order Flow VWAP also includes standard-deviation bands with configurable multipliers. — VERIFIED. https://ninjatrader.com/support/helpGuides/nt8/order_flow_vwap2.htm
3. **Anchored VWAP.**
   - Brian Shannon, *Maximum Trading Gains With Anchored VWAP* (Alphatrends Publishing, 2023) — SECONDARY (bookseller listings / Google Books). https://books.google.com/books/about/Maximum_Trading_Gains_With_Anchored_VWAP.html?id=9oWrEAAAQBAJ
   - Shannon recommends anchoring at meaningful events (major highs and lows, news such as Fed decisions, strong reversals) rather than fixed periods, and calls the choice of anchor the most subjective part. — VERIFIED. https://alphatrends.net/anchored-vwap/
   - The claim that Paul Levine's MIDAS work (1995–97) introduced the idea of anchoring is SECONDARY (aggregator pages). Not confirmed from a primary source.
4. **Delta / footprint basics.**
   - NinjaTrader's Volumetric Bars compute, per price, the difference between aggressive buy and sell volume.
   - True classification ("BidAsk") needs historical bid/ask tick data. Otherwise an up-tick/down-tick approximation is used.
   — VERIFIED. https://ninjatrader.com/support/helpGuides/nt8/order_flow_volumetric_bars.htm
   - Contrast TradingView's "up/down volume", which is based on bar direction (close ≥ open), not aggressor side (D above).
5. **Open interest.**
   - Definition: the number of outstanding derivative contracts not yet settled; it can rise or fall intraday. — VERIFIED (TradingView). https://www.tradingview.com/support/solutions/43000685269-open-interest/
   - **TradingView provides OI for Indian futures (NSE, MCX, BSE, NCDEX, MSEI) only on daily bars**, not intraday. — VERIFIED (same page).
   - **Gap:** I did not retrieve an NSE primary definition, or NSE's intraday OI update frequency.

---

## G. India specifics

1. **NSE equity cash timings (NSE market-timings page)** — VERIFIED. https://www.nseindia.com/static/market-data/market-timings

   | Session | Time (IST) |
   |---|---|
   | Block deal window 1 | 08:45–09:00 |
   | Pre-open | 09:00–09:08 (then order matching; normal market opens 09:15) |
   | Normal market | 09:15–15:30 |
   | Closing session | 15:40–16:00 |

2. **NSE equity derivatives: the normal market now closes at 15:40, not 15:30.**
   - The NSE timings page (accessed today) shows equity derivatives open 09:15, close **15:40**, trade-modification end 16:15. — VERIFIED.
   - News reports say the change took effect **3 August 2026** (NSE circular dated 29/30 May 2026). It aligns derivatives with a new cash-market **Closing Auction Session (CAS), about 15:15–15:35, for F&O-eligible stocks**, whose continuous trading now ends at 15:15. The derivatives closing-price VWAP window moved to 15:10–15:40. — SECONDARY. https://www.kotakneo.com/news/market-news/nse-derivatives-trading-extended-3-40-pm-august-2026-closing-auction/ ; https://www.angelone.in/news/market-updates/sebi-closing-auction-session-from-august-3-2026-new-timings-and-rules-for-f-o-stocks
   - **The brief's "09:15–15:30" is outdated for F&O.**
   - **ANALYSIS:** profiles and TPO period boundaries for NIFTY futures and options after 3 Aug 2026 differ from earlier data; mixed-period backtests need care. **Gap:** how NIFTY *index* values behave during 15:15–15:35 while constituents are in CAS — not verified.
3. **NSE F&O pre-open session (new).**
   - The NSE pre-open page sets a 09:00–09:15 call auction for current-month index and stock **futures** (next-month futures too in the last five trading days before expiry):
     - order entry 09:00–09:10, with random closure in the last 2 minutes
     - matching about 09:10–09:12
     - then a buffer
     — VERIFIED. https://www.nseindia.com/static/products-services/equity-derivatives-pre-open-session
   - NSE circular NSE/FAOP/71527 (28 Nov 2025) refers to circular NSE/FAOP/71092 (3 Nov 2025) introducing it and schedules a mock session. — VERIFIED. https://nsearchives.nseindia.com/content/circulars/FAOP71527.pdf
   - Go-live date 8 Dec 2025 — SECONDARY (Business Standard). https://www.business-standard.com/amp/markets/news/nse-pre-open-session-equity-derivatives-december-8-2025-125110401569_1.html
   - **ANALYSIS:** NIFTY futures now have an auction-determined opening price, which matters for opening-type classification.
4. **NIFTY 50 is an index** — VERIFIED (NSE Indices factsheet). https://www.niftyindices.com/Factsheet/ind_nifty50.pdf
   - Free-float market-capitalisation weighted, base date 3 Nov 1995, base value 1000, rebalanced semi-annually (cut-offs 31 Jan / 31 Jul).
   - The selection uses 6-month average free-float market cap. — VERIFIED (NSE equity indices methodology document). https://www.niftyindices.com/Methodology/Method_NIFTY_Equity_Indices.pdf
   - **ANALYSIS:** an index is a computed number and has no traded volume of its own. A volume profile needs a traded instrument:
     - **NIFTY near-month futures** — rolls monthly
     - an **index ETF** such as NIFTYBEES — smaller, with a different price scale
     - **a TPO profile on the index itself**, which needs no volume
   - Some vendors display a "volume" for an index (e.g. summed constituent volume). Students should check what their data feed shows. — Gap: not verified per vendor.
5. **Expiry days.**
   - **SEBI/HO/MRD/TPD-1/P/CIR/2024/132 (1 Oct 2024):** each exchange may offer weekly-expiry derivatives on **only one** benchmark index, effective 20 Nov 2024. The same circular raises index-derivative contract size to at least ₹15 lakh. — VERIFIED (circular PDF copy). https://www.cse-india.com/upload/upload/Oct_011024.pdf
   - NSE kept weekly expiry only on NIFTY (Bank Nifty, Fin Nifty, Midcap Select and Next 50 weeklies were discontinued). — SECONDARY.
   - **SEBI/HO/MRD/MRD-TPD-1/P/CIR/2025/76 (26 May 2025):** all equity-derivative expiries on an exchange must fall on **Tuesday or Thursday**. Each exchange keeps one weekly benchmark index option on its chosen day. All other contracts, **including index futures**, have a minimum tenor of one month and expire in the last week of the month on that day. — SECONDARY (TaxGuru reproduction). https://taxguru.in/sebi/sebi-notifies-final-settlement-expiry-day-equity-derivatives-contracts.html
   - **NSE moved to Tuesday from 1 Sep 2025** (NSE circular 103/2025; BSE moved to Thursday). — SECONDARY (multiple brokers, All India Radio). https://www.newsonair.gov.in/nse-bse-swap-derivatives-expiry-days
   - **So as of Oct 2026:** NIFTY weekly options expire on Tuesdays. NIFTY monthly futures and options expire on the **last Tuesday** of the month. When Tuesday is a holiday, expiry moves to the previous trading day (SECONDARY).
6. **Special sessions (NSE circulars)** — all VERIFIED:
   - **Muhurat 2024:** Fri 1 Nov 2024, normal market 18:00–19:00 (NSE/COM/64648, commodity segment). The equity pre-open was 17:45–18:00 — SECONDARY. https://nsearchives.nseindia.com/content/circulars/COM64648.pdf
   - **Muhurat 2025:** Tue 21 Oct 2025, **afternoon**: pre-open 13:30–13:45, normal market 13:45–14:45, closing session 14:55–15:05 (NSE/CMTR/70319). https://nsearchives.nseindia.com/content/circulars/CMTR70319.pdf
   - **Budget day:** Saturday 1 Feb 2025, full standard timings (pre-open 09:00–09:08, normal 09:15–15:30); no T+0 session (NSE/CMTR/65729). https://nsearchives.nseindia.com/content/circulars/CMTR65729.pdf
     - Union Budget 2026 fell on **Sunday 1 Feb 2026** and markets reportedly held a special session — SECONDARY (https://www.newsonair.gov.in/bse-nse-to-hold-special-trading-session-today-amid-union-budget-presentation/).
   - **DR-site live session:** Saturday 18 May 2024 in equity and equity derivatives. Session 1 from the primary site, 09:15–10:00; session 2 from the disaster-recovery site from about 11:15 pre-open (11:30–12:30 normal market per news). Under SEBI's 2019 business-continuity framework (NSE/MSD/61893). https://nsearchives.nseindia.com/content/circulars/MSD61893.pdf
   - **ANALYSIS:** these short or odd sessions create tiny, distorted daily profiles. Exclude or flag them in backtests.
7. **MCX.**
   - **Hours:** 09:00 to 23:30, or 23:55 during US daylight saving, for internationally linked non-agri commodities. Most agri commodities close at 17:00; cotton, cotton oil and kapas trade to 21:00. — SECONDARY (broker summaries; mcxindia.com returned 403 to my fetches). https://www.5paisa.com/stock-market-guide/commodity-trading-basics/commodity-market-timings
   - **Crude Oil (CRUDEOIL)**, from search snippets of the official MCX spec PDF — SECONDARY (https://www.mcxindia.com/docs/default-source/products/contract-specification/crude-oil/crude-oil-january-2026-contract-onwards.pdf):
     - trading unit 100 barrels, quoted in ₹/barrel, tick ₹1
     - session 09:00–23:30/23:55
     - final settlement on the NYMEX CL front-month settlement price on MCX's last trading day
     - last trading day "as per the Contract Launch Calendar"
     - The common "19th/20th of the month" expiry is a convention reported by brokers, not a fixed rule — SECONDARY / check the calendar each month.
   - **Gold (GOLD, 1 kg)**, from search snippets of official MCX spec pages — SECONDARY (https://www.mcxindia.com/docs/default-source/products/contract-specification/gold/gold-december-2024-contract-onwards.pdf):
     - contract months Feb/Apr/Jun/Aug/Oct/Dec (bimonthly)
     - expiry on the 5th of the contract month (the preceding working day if that is a holiday)
     - price in ₹ per 10 g, tick ₹1, compulsory delivery
   - **OPINION:** an MCX "day" profile spans Indian, European and US hours. For crude, the US-hours activity and the NYMEX settlement link dominate, so a single 09:00–23:30 profile mixes very different liquidity regimes. Consider sub-session profiles.
8. **Futures roll and continuous series.**
   - **TradingView:** back-adjustment is off by default. When the continuous contract switches, all earlier contracts are shifted by the Close difference between new and old contracts on the nearest daily bar to the switch. `1!` rolls at front-month expiry. — VERIFIED. https://www.tradingview.com/support/solutions/43000685266-how-can-i-enable-backadjustment-for-continuous-futures/
   - **Sierra Chart:** offers date-rule or volume-based rollover, each with or without back-adjustment. Since version 2346 the adjustment uses the prior day's settlement difference between the two contracts. — VERIFIED. https://www.sierrachart.com/index.php?page=doc%2FContinuousFuturesContractCharts.html
   - **ANALYSIS (why levels jump):**
     - In an *unadjusted* series, the price steps at each roll by the calendar spread (cost of carry for NIFTY; contango or backwardation for crude). Any composite profile, POC or "naked" VAH/VAL carried across the roll is offset by that step.
     - In a *back-adjusted* series, past prices are shifted, so historical POCs no longer match prices that actually traded.
     - For NIFTY, whose monthly futures now expire on the last Tuesday, rolls are monthly. Profile levels from the old month should be translated by the spread, or dropped, rather than carried over.

---

## H. Is 70% universal?

- **70% default:**
  - TradingView VP and TPO — VERIFIED (D)
  - Sierra Chart TPO and volume value areas — VERIFIED
  - thinkorswim `VolumeProfile` — SECONDARY
  - CBOT (one SD "rounded up to 70%") — VERIFIED
  - Dalton — VERIFIED
- **68% default: NinjaTrader 8 Order Flow+ Volume Profile** ("68% (configurable)"). — VERIFIED (D). This is the documented use of 68% — clearly meant to match the 68.27% one-σ figure.
- **Every platform checked lets the user change the percentage.** — VERIFIED (TV, Sierra, NT).
- **ANALYSIS:** for a stated percentage, the stop rule (≥ versus ≤ target) and the step size (one versus two rows) affect VAH/VAL as much as 68 versus 70 does (see the worked example in D).

---

## Gaps and open items (summary)
1. **Primary text not read:**
   - *Markets and Market Logic* (1986)
   - the original 1984/85 CBOT handbook
   - *The Profile Reports* (1987–91)
   - the body text of *Mind Over Markets* — especially the exact Value-Area Rule wording and whether "80%" appears
2. **No peer-reviewed test of any Market Profile rule or of volume-at-price levels as support/resistance.**
3. **No documented NIFTY or MCX test of the 80% rule.** The only documented ES test (2008, n≈40) found about 40%.
4. **Undocumented platform details:**
   - TradingView's intrabar volume allocation within lower-timeframe bars
   - NinjaTrader's value-area expansion and tie rules
5. **Not verified:**
   - the NSE circular text for the 15:40 F&O close and the CAS (news only)
   - NSE circular 103/2025
   - the official MCX spec PDFs (403 on fetch)
6. **Not checked:**
   - Kakushadze/Serur *151 Trading Strategies*
   - an NSE primary OI definition

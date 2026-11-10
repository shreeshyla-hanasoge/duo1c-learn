import type { Topic } from "../../types.ts";

export const sdCandleAggregation: Topic = {
  id: "sd-candle-aggregation",
  title: "Candle aggregation and windowing",
  tier: 5,
  week: 10,
  depth: "deep",
  summary:
    "A candle is a tumbling window over ticks. The hard parts are deciding when it is closed, handling late ticks, and keeping live bars equal to historical ones.",
  why: "Every rule in Traed fires on a candle close, so the candle builder decides when your strategies act. A bar that closes late, a 30-minute bin that starts at the wrong minute, or a volume figure built from the wrong counter all change signals without any error. You also need this to explain why a live bar and a backtest bar can differ, and what Traed does to keep them close.",
  learn: {
    intuition:
      "Picture a shopkeeper who writes a summary slip for every hour of the day. At the start of the hour she notes the first price she sees. During the hour she keeps the highest, the lowest and the most recent price. When the hour ends she files the slip and starts a new one. Three questions decide whether her slips are trustworthy. How does she know the hour has ended: by a clock on the wall, or when the next customer walks in? What does she do with a customer's note that arrives late, after the slip is filed? And when the owner asks for a four-hour slip, does she add up her hourly slips, or go back through all the customers? Candle aggregation is these three questions. The answers decide whether two people who read the same market get the same slips.",
    mechanics: [
      {
        heading: "Tumbling windows and the OHLCV fold",
        body: "A tumbling window is a fixed-length slice of time that does not overlap the next one. Every tick belongs to exactly one window. A candle folds its ticks into five numbers: open (first price), high (maximum), low (minimum), close (last price) and volume. Take four ticks inside one minute: 22,450.00, 22,452.50, 22,449.00 and 22,451.00. The candle is open 22,450.00, high 22,452.50, low 22,449.00, close 22,451.00. To find the window, floor the timestamp: Traed sets seconds and microseconds to zero. The fold is cheap and needs only the current candle in memory, never the list of ticks.",
      },
      {
        heading: "When is a bar closed, and what clock decides",
        body: "There are two designs. A timer closes the bar at the wall-clock boundary. The other closes it when the first tick of a later window arrives. Traed uses the second: its builder compares the tick's minute with the current candle's minute, and a different minute finalises the old candle. So the 10:03 bar of an option leg that does not trade until 10:06:10 is only complete at 10:06:10. The tick's time is its arrival time in IST, stamped when the frame is received, not the exchange's time. Volume is the change in the exchange's running day total, so a minute that starts at 1,20,000 and ends at 1,26,500 has volume 6,500.",
      },
      {
        heading: "Late ticks, out-of-order ticks and watermarks",
        body: "In stream processing, event time is when something happened and processing time is when you saw it. If the two differ, a tick can arrive after its window has been closed. A watermark is a rule that says: I believe nothing older than this time will still arrive, so windows before it can close. A system picks an allowed lateness, say three seconds, closes late and accepts that rare ticks are dropped or trigger a correction. Traed's builder has no such rule. It stamps ticks by arrival time from a single ordered socket, so a tick cannot be older than the previous one. If it ever stamped by exchange time or merged several feeds, lateness would become a real problem.",
      },
      {
        heading: "Higher timeframes, and live equals historical",
        body: "Three ways to get a 15-minute or 1-hour bar. Build it from ticks. Roll up one-minute bars: open of the first, high max, low min, close of the last, volume summed. Or fetch it from the broker. Traed's live indicators fetch the broker's bars once per bar, and only fall back to rolling up its own one-minute bars. When rolling up, bins must start at 09:15, not midnight. Midnight bins match 5 and 15 minutes but split 30-minute and 1-hour bars differently from the broker. A bar is stamped at its open, so a decision at a bar's close may use a higher-timeframe bar only if its open plus its length is not after the decision time.",
      },
      {
        heading: "Saying it about Traed",
        body: "We build one-minute candles from ticks inside the engine. A candle is closed when the first tick of the next minute arrives, stamped in IST by arrival time. Volume comes from the change in the exchange's running total. For 5, 15 and 30 minute bars we fetch the broker's candles once per bar, the same source the backtest reads, and roll up our own minutes from 09:15 only as a fallback, dropping volume-based indicators there. We accept that our highs and lows come from sampled ticks and that a quiet instrument closes its bars late. We would add a timer close and event-time stamps if we ever merged several feeds or traded very illiquid contracts.",
      },
    ],
    complexityDerivation:
      "The invariant is that a bar is final when anything uses it, and that live and historical bars with the same label contain the same trades. Each design choice protects one half. Closing on the next tick, or on a watermark, protects 'final': you never act on a bar that can still change. Anchoring bins at 09:15 and using one source for live and backtest protects 'the same trades': a rule tested on broker bars sees the same bars in production. The closed-bar guard in Traed's multi-timeframe work is the same idea in time: a decision at 10:30 may only read a 1-hour bar that closed at or before 10:30. Where it stops holding: a bar built from sampled ticks can miss a high or low that happened between two ticks, so live and exchange bars may differ by a few paise or points. Closing on the next tick is also unsafe when a quiet instrument must exit on time, and arrival-time stamps are wrong once several sources are merged.",
    variants: [
      {
        name: "Build every timeframe from ticks",
        when: "You need bars at unusual sizes, or the broker offers no historical bars for that instrument.",
        delta:
          "Full control and no outside call, but one builder per timeframe, and your highs and lows come only from the ticks you received.",
      },
      {
        name: "Roll up from one-minute bars",
        when: "A single source of truth is the one-minute series and higher timeframes are derived.",
        delta:
          "Cheap and consistent with the minute data. Bins must be anchored to the session open, and volume is only as honest as the one-minute volume.",
      },
      {
        name: "Fetch the broker's bars for each timeframe",
        when: "Live must match backtests that were built on broker history.",
        delta:
          "Same trades and same bins as history. It adds an outside call per bar, which needs caching and a fallback when the broker is slow or down.",
      },
    ],
    tradeoffs: [
      {
        vs: "Closing a bar on a timer at the minute boundary",
        pick: "Close on the first tick of the next minute",
        because:
          "No clock logic or late-tick rule is needed, and a bar never closes before its last tick. The price is that a quiet instrument closes late, so a timer is the safer choice when time-based exits matter.",
      },
      {
        vs: "Exchange timestamps on each tick",
        pick: "Arrival time in IST, from one ordered socket",
        because:
          "Arrival time is always increasing on one socket, so late ticks cannot occur. It is slightly later than the exchange's time and drifts with network delay, and it would be wrong if several feeds were merged.",
      },
      {
        vs: "Rolling up our own minutes for every timeframe",
        pick: "Fetch the broker's candles, roll up only as a fallback",
        because:
          "Backtests are built on broker candles, so live bars from the same source carry the same bins and volume. The cost is a broker call per bar, kept low by caching once per bar.",
      },
    ],
  },
  realWorld: [
    {
      system: "Apache Flink event-time windows and watermarks",
      kind: "industry",
      problem:
        "Events reach a stream processor late and out of order, yet windowed results must be correct and finish in bounded time.",
      applied:
        "Flink windows by event time. A watermark tells the job how far event time has progressed. A window closes when the watermark passes its end, and an allowed-lateness setting decides whether later events update the result or are discarded.",
      evidence: "Apache Flink documentation: event time, watermarks and windows (public)",
      impact:
        "Results do not depend on arrival order, and the trade-off between waiting and completeness becomes an explicit setting.",
    },
    {
      system: "Fixed buckets in pandas resample and TimescaleDB time_bucket",
      kind: "industry",
      problem:
        "Time-series data must be grouped into fixed windows, and the origin of the grid changes which rows fall in which window.",
      applied:
        "Both group timestamps into equal buckets counted from an origin. By default pandas counts from midnight, and an offset or origin moves the grid. TimescaleDB lets you choose the bucket origin too. For an exchange that opens at 09:15, you set the origin so 30-minute and hourly buckets start at 09:15.",
      evidence: "pandas documentation: DataFrame.resample (offset, origin); TimescaleDB documentation: time_bucket (public)",
      impact:
        "Choosing the origin decides whether your hourly bar equals the broker's hourly bar.",
    },
    {
      system: "Traed's tick-to-candle builder",
      kind: "yours",
      problem:
        "Rules need one-minute candles from live ticks that carry a cumulative day volume and sometimes none at all, as for an index.",
      applied:
        "The builder floors the tick's IST time to the minute, starts a candle on a new minute, and updates high, low, close and a tick count after that. When the minute changes it finalises the previous candle for evaluation. Volume is the change in the cumulative counter, re-anchored if the counter goes backwards, and it falls back to a tick count when none is present.",
      evidence: "strategy-engine/app/services/universal_strategy_executor.py",
      impact:
        "Evaluation uses a completed candle with real traded volume where the feed carries it. A quiet instrument closes its bar when its next tick arrives, and there is no branch for ticks older than the current minute.",
    },
    {
      system: "Traed's closed-bar rule for multi-timeframe operands",
      kind: "yours",
      problem:
        "A rule on 15-minute bars that reads a 1-hour indicator could read a value computed from an hour that has not finished, which live trading can never see.",
      applied:
        "Bars are stamped at their open. A decision at bar open t on interval d may use a higher-timeframe bar of length D only if its open plus D is no later than t plus d. The same rule is applied in the equity backtest, the options backtest and the live engine, with a parity test that drives one fixture through all three.",
      evidence: "docs/engineering/multi-timeframe-indicators-plan.md",
      impact:
        "Backtest and live agree bar for bar, and signals on mixed timeframes move later, never earlier, when a lookahead is removed.",
    },
  ],
  algorithms: [
    {
      name: "Tumbling window aggregation",
      role: "Cuts the tick stream into fixed, non-overlapping intervals and folds each into one open, high, low, close and volume bar.",
      dsa: "sliding-window",
    },
    {
      name: "Ring buffer of recent bars",
      role: "Keeps a fixed number of latest bars in constant memory, so indicators can read recent history without the store growing forever.",
      dsa: "ring-buffers",
    },
    {
      name: "Watermark for late ticks",
      role: "Declares how long to wait for stragglers before a bar is closed, trading a small delay for fewer corrected bars.",
    },
  ],
  insights: [
    {
      t: "A candle is a fold, not a list",
      d: "Open is set once, high and low track extremes, close is overwritten. One dictionary per symbol is enough, and no tick list is kept.",
    },
    {
      t: "Decide what closes a bar and write it down",
      d: "Next-tick closing is simple but late for quiet instruments. A timer or watermark closes on time but must say what happens to ticks that come after.",
    },
    {
      t: "Anchor higher timeframes to the session open",
      d: "Rolling up from midnight matches 5 and 15 minute bars but not 30-minute or hourly ones. For NSE, bins start at 09:15.",
    },
    {
      t: "Live equals historical only by design",
      d: "Use the same source and the same bins, and only read higher-timeframe bars that have closed. Otherwise a backtest quietly sees data that live cannot.",
    },
  ],
  pitfalls: [
    "Using the exchange's cumulative day volume as a minute's volume. It is a running total, so the minute's volume is the change across the minute.",
    "Rolling up hourly bars from midnight-anchored bins and comparing them with the broker's 09:15 bars. The bins differ and the indicators drift.",
    "Reading a higher-timeframe value that was computed from a bar still in progress. A backtest can do this without noticing, and live never can.",
  ],
  quiz: [
    {
      q: "What defines a tumbling window?",
      options: [
        "Windows that overlap, each starting one tick after the last",
        "Fixed-size windows that do not overlap, with each event in exactly one",
        "A window that grows until a gap in the data ends it",
        "A window that slides forward whenever a new event arrives",
      ],
      answer: 1,
      why: "A tumbling window is a fixed-length slice of time that follows the previous one with no overlap, so each event is counted once. A one-minute candle is a tumbling window.",
      difficulty: "recall",
      distractors: [
        "That describes a sliding window, which is used for moving averages and counts the same event many times.",
        "",
        "That describes a session window, which is defined by gaps in activity rather than a fixed length.",
        "Sliding windows move with each event, so one event falls in many windows. A tumbling window never does that.",
      ],
    },
    {
      q: "In stream processing, what does a watermark express?",
      options: [
        "The highest price seen so far in the current window",
        "The time at which the exchange publishes its closing prices",
        "The number of events processed per second so far",
        "A belief that no event older than a given time will still arrive",
      ],
      answer: 3,
      why: "A watermark tracks progress in event time. When it passes a window's end, the window can close, because late events are not expected any more, or are handled by a lateness rule.",
      difficulty: "recall",
      distractors: [
        "That sounds like a chart watermark or high-water mark in prices. It has nothing to do with event time progress.",
        "Exchange publication times are a market fact, not a stream-processing mechanism for closing windows.",
        "Throughput is a rate. A watermark is a point in time that moves forward as events arrive.",
        "",
      ],
    },
    {
      q: "Ticks in one minute arrive in this order: 22,450.00, 22,452.50, 22,449.00, 22,451.00. What is the candle?",
      options: [
        "Open 22,450.00, high 22,452.50, low 22,449.00, close 22,451.00",
        "Open 22,451.00, high 22,452.50, low 22,449.00, close 22,450.00",
        "Open 22,450.00, high 22,452.50, low 22,449.00, close 22,452.50",
        "Open 22,449.00, high 22,452.50, low 22,450.00, close 22,451.00",
      ],
      answer: 0,
      why: "Open is the first price and close is the last. High and low are the extremes over the minute. The fold keeps these four numbers without storing the ticks.",
      difficulty: "apply",
      distractors: [
        "",
        "It swaps open and close, taking the last price as the open. The first price in time is the open.",
        "It takes the highest price as the close. The close is the last price in time, not the largest.",
        "It treats the lowest price as the open. The open is simply the first tick of the window.",
      ],
    },
    {
      q: "The exchange's running day volume is 1,20,000 at the last tick of 10:14 and 1,26,500 at the last tick of 10:15. What is the 10:15 candle's volume?",
      options: [
        "1,26,500, the running total at the end of the minute",
        "1,20,000, the total at the end of the previous minute",
        "6,500, the change in the running total across the minute",
        "The number of ticks received during the minute",
      ],
      answer: 2,
      why: "The counter is cumulative for the day, so a single minute's volume is the difference between the end-of-minute total and the baseline carried from the previous minute: 1,26,500 minus 1,20,000.",
      difficulty: "apply",
      distractors: [
        "That is the day's total so far, not this minute's traded quantity. Using it would report a whole day as one bar.",
        "That is the baseline, the value at the start of the minute, not the quantity traded within it.",
        "",
        "A tick count is only a proxy for activity, and is used when the feed has no traded quantity, as for an index.",
      ],
    },
    {
      q: "You roll up one-minute NSE bars into 1-hour bars with a grid that starts at midnight. The broker's hourly bars start at 09:15. What goes wrong?",
      options: [
        "Nothing, since 1-hour bins always agree between the two grids",
        "The first bin holds 09:15 to 09:59 only, and every bar differs from the broker's",
        "Only the volume differs, while the prices stay exactly the same",
        "The bars come out labelled in the wrong time zone for the exchange",
      ],
      answer: 1,
      why: "A midnight grid cuts hours at :00, so the first bin spans 45 minutes and each later bin straddles two broker bars. Open, high, low and close then differ, and indicators drift from the backtest.",
      difficulty: "apply",
      distractors: [
        "Bins agree for 5 and 15 minutes, which makes this tempting, but 30-minute and hourly bins differ from the broker's.",
        "",
        "Prices change too, because the bar's open, high and low are taken over different minutes.",
        "Time zone is a separate issue. The error here is the grid origin, even if the zone is right.",
      ],
    },
    {
      q: "A bar closes when the first tick of the next minute arrives. An option leg has its last tick at 10:03:20 and its next at 10:06:10. When is the 10:03 bar final?",
      options: [
        "At 10:04:00, the wall-clock boundary",
        "At 10:03:20, when its last tick arrived",
        "At 10:05:00, after two quiet minutes",
        "At 10:06:10, when a tick from a later minute arrives",
      ],
      answer: 3,
      why: "With next-tick closing there is no timer, so the bar cannot be finalised until a tick with a later minute shows up. For a quiet contract that is late, which is the cost of this design.",
      difficulty: "apply",
      distractors: [
        "That is when a timer-based design would close it. This design has no timer.",
        "The system cannot know no more ticks are coming at that moment, so a bar is not final at its last tick.",
        "No rule counts quiet minutes. The trigger is a tick from a later minute.",
        "",
      ],
    },
    {
      q: "Your live engine needs 15-minute bars for rules that were tested on broker history. Which source gives the best match, with a safe fallback?",
      options: [
        "Fetch broker 15-minute bars once per bar, with an anchored roll-up as fallback",
        "Build 15-minute bars from live ticks alone, so that no outside call is needed",
        "Roll up one-minute bars from a midnight grid every time a bar is requested",
        "Use a daily bar that is updated with the latest price all through the day",
      ],
      answer: 0,
      why: "The backtest read the broker's bars, so the same source gives the same bins and volume. A fallback keeps rules running if the fetch fails, with volume-based indicators dropped because tick-built volume is not equal.",
      difficulty: "judge",
      distractors: [
        "",
        "Self-built bars sample ticks, so highs and lows can differ from the broker's. It removes a dependency but opens a gap to history.",
        "A midnight grid does not match the broker's 30-minute and hourly bins, so it adds drift.",
        "A daily bar cannot feed rules defined on 15-minute bars. The timeframe is part of what the rule means.",
      ],
    },
    {
      q: "A reviewer says: our engine stamps each tick with its arrival time from one ordered socket, so we do not need watermarks or a lateness rule. Is that right?",
      options: [
        "No, every candle builder needs a watermark whatever the tick source is",
        "Yes, and the same will hold if you later merge several separate feeds",
        "Yes for now: arrival time rises on one reader, but not if stamps or feeds change",
        "No, because TCP can deliver ticks out of order on a single connection",
      ],
      answer: 2,
      why: "On a single ordered socket, arrival time is monotonic, so a tick cannot be older than the one before. Watermarks become necessary once you use exchange timestamps or merge feeds with different delays.",
      difficulty: "judge",
      distractors: [
        "Watermarks solve lateness. If lateness cannot occur by construction, a watermark adds machinery with no benefit.",
        "Merging feeds reintroduces lateness, because two sources can deliver an older event after a newer one.",
        "",
        "TCP delivers bytes in order on one connection, so out-of-order delivery comes from merging sources or from event-time stamps.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-candle-aggregation-live-15m",
      scenario:
        "Your engine runs on one server for one user. A live NIFTY rule uses a 50-period average on 15-minute bars. The rule was tested on broker history, and the broker serves 15-minute bars at 09:15, 09:30 and so on. A new bar completes four times an hour. Where do the live 15-minute bars come from?",
      options: [
        {
          label: "Build them from live ticks, one more in-memory builder",
          appeal: "No broker call at all, and full control over the data.",
        },
        {
          label: "Roll up your own one-minute bars on the default pandas grid",
          appeal: "Cheap, and consistent with the one-minute data you already hold.",
        },
        {
          label: "Fetch the broker's 15-minute bars once per bar, with an anchored roll-up as a fallback",
          appeal: "Same source as the backtest, and only four calls an hour.",
        },
        {
          label: "Compute the average once at 09:15 and reuse it all day",
          appeal: "Minimal work and no timing problems.",
        },
      ],
      best: 2,
      verdict:
        "The rule was validated on broker bars, so the same source gives the same bins and volume, and four calls an hour is a light load. Self-built bars sample ticks and can miss extremes. A default grid matches 15 minutes but not 30 or 60, and a once-a-day average does not follow the rule.",
      claims: [
        {
          text: "You accept a broker call per bar and a dependency on its availability, softened by caching and a fallback.",
          axis: "trade",
          correct: true,
          note: "True. One cached call per bar keeps the load small, and the fallback keeps the rule running if the call fails.",
        },
        {
          text: "In the fallback, volume-based indicators are dropped rather than computed from tick counts.",
          axis: "trade",
          correct: true,
          note: "True. Rolled-up bars from the fallback path carry tick-based volume, so volume indicators would be dishonest and are skipped.",
        },
        {
          text: "Fetching broker bars gives you a more accurate view of the market than your own ticks.",
          axis: "trade",
          correct: false,
          note: "False framing: it gives the same bars as history, which matters for consistency. Accuracy of the underlying trades is not the argument.",
        },
        {
          text: "If the broker call fails silently and the engine keeps an old bar, the rule may run on stale data.",
          axis: "failure",
          correct: true,
          note: "True. A frozen indicator while the chart candles still move is a known symptom, so failure must be logged and visible.",
        },
        {
          text: "The roll-up fallback gives bars guaranteed to be identical to the broker's in every field.",
          axis: "failure",
          correct: false,
          note: "False. Bars built from sampled ticks can miss a high or low between two ticks, and volume may be a tick count, so small differences remain.",
        },
        {
          text: "Compare live bars with the broker's for the same minute and track the difference.",
          axis: "measure",
          correct: true,
          note: "True. A running diff shows when live and historical bars drift apart.",
        },
        {
          text: "The number of broker calls per day is the best measure of whether live bars are right.",
          axis: "measure",
          correct: false,
          note: "False. Call counts show load, not correctness. A bar can be fetched on time and still differ from what the rule was tested on.",
        },
      ],
    },
    {
      id: "sd-candle-aggregation-multi-feed",
      scenario:
        "A platform builds 5-minute bars for 5,000 symbols. Ticks come from three feed handlers on different machines, and each tick carries the exchange's timestamp. Handlers can deliver a tick up to about two seconds after a faster handler delivered a newer one. Signals can wait a few seconds after a bar ends, but not minutes. How do you close bars?",
      options: [
        {
          label: "Close a bar when the first tick of a later window arrives from any handler",
          appeal: "Simple, with no extra configuration.",
        },
        {
          label: "Use exchange time with a watermark that trails the newest event time by about three seconds",
          appeal: "Late ticks from the slower handler still land in the right bar.",
        },
        {
          label: "Close each bar at the wall-clock boundary and discard anything after",
          appeal: "Predictable timing and no waiting.",
        },
        {
          label: "Never close; keep revising the bar when late ticks arrive",
          appeal: "Always eventually correct.",
        },
      ],
      best: 1,
      verdict:
        "Merged feeds with exchange timestamps and up to two seconds of skew create real lateness, and signals can wait a few seconds. A watermark of about three seconds closes after the slow handler's ticks arrive. Next-tick closing would finalise too early, wall-clock closing would drop real trades, and never closing breaks the 'final before use' rule.",
      claims: [
        {
          text: "You accept a delay of about three seconds before each bar is final.",
          axis: "trade",
          correct: true,
          note: "True. That wait is the price of including the slower handler's ticks, and the scenario allows signals to wait a few seconds.",
        },
        {
          text: "Ticks later than the allowed lateness must be dropped or routed to a correction path.",
          axis: "trade",
          correct: true,
          note: "True. A watermark is a belief, not a proof, so a policy for rare stragglers is part of the design.",
        },
        {
          text: "A watermark removes the need to decide anything about late ticks.",
          axis: "trade",
          correct: false,
          note: "False. It only sets the point after which a tick is considered late. What happens to it still has to be chosen.",
        },
        {
          text: "Closing on the first later tick from any handler can finalise a bar before a slower handler's ticks have arrived.",
          axis: "failure",
          correct: true,
          note: "True. A fast handler's newer tick closes the window while an older tick is still in flight, so the bar loses that trade.",
        },
        {
          text: "Closing at the wall-clock boundary is safe because the clock is the same on all machines.",
          axis: "failure",
          correct: false,
          note: "False. Machine clocks differ, and the network adds delay, so a wall-clock close can still cut off real trades.",
        },
        {
          text: "Track how many ticks arrive after their bar has closed, per handler.",
          axis: "measure",
          correct: true,
          note: "True. That count tells you whether the lateness setting is too small, and which handler is slow.",
        },
        {
          text: "Average ticks per second is enough to show that bars are closing correctly.",
          axis: "measure",
          correct: false,
          note: "False. Throughput says nothing about whether ticks landed in the right bar; the late-tick count does.",
        },
      ],
    },
    {
      id: "sd-candle-aggregation-hourly-grid",
      scenario:
        "Your engine rolls up its own one-minute NSE bars into 30-minute and 1-hour bars as a fallback when the broker call fails. The broker serves 30-minute bars at 09:15, 09:45 and 1-hour bars at 09:15, 10:15. Backtests were run on the broker's bars. Which grid origin do you use for the roll-up?",
      options: [
        {
          label: "09:15, the session open",
          appeal: "Bins coincide with the broker's bars.",
        },
        {
          label: "Midnight, the library default",
          appeal: "No extra configuration, and it is correct for 5 and 15 minutes.",
        },
        {
          label: "09:00, the start of the pre-open",
          appeal: "A round hour is easy to read on a chart.",
        },
        {
          label: "A rolling window of the last 60 minutes at every tick",
          appeal: "Always the freshest hour.",
        },
      ],
      best: 0,
      verdict:
        "The comparison target is the broker's bars, which start at 09:15, so only a 09:15 origin reproduces them. Midnight and 09:00 cut the hour at :00 and give a first bin of 45 minutes. A rolling window is a different object and would change every indicator.",
      claims: [
        {
          text: "You tie the roll-up to the session open, so it must change if a market has a different open, such as MCX.",
          axis: "trade",
          correct: true,
          note: "True. The anchor is a property of the exchange session. Traed applies the 09:15 anchor only when its session grid is 09:15.",
        },
        {
          text: "The fallback bars are the same as the broker's only if volume is also the same.",
          axis: "trade",
          correct: false,
          note: "False. Prices line up with the right origin; volume may not, since the one-minute volume may be a tick count.",
        },
        {
          text: "The library default hides the error for 5 and 15 minute bars, so the drift appears only in 30-minute and hourly ones.",
          axis: "failure",
          correct: true,
          note: "True. Midnight and 09:15 happen to coincide for those sizes, which is why the mismatch is easy to miss.",
        },
        {
          text: "With the wrong origin, the first hourly bar of the day covers 09:15 to 09:59 only.",
          axis: "failure",
          correct: true,
          note: "True. A grid cut at :00 puts the session's first 45 minutes in one bin, and each later bin straddles two of the broker's.",
        },
        {
          text: "Rolled-up bars would still be identical to the broker's because each minute's data is the same.",
          axis: "failure",
          correct: false,
          note: "False. The same minutes grouped into different bins produce a different open, high, low and close for each bar.",
        },
        {
          text: "Compare the first bar of the day, and any 30-minute or hourly bar, against the broker's.",
          axis: "measure",
          correct: true,
          note: "True. These are the bars where a wrong origin shows up first.",
        },
        {
          text: "Comparing only the 5-minute bars against the broker's is enough to catch a wrong origin.",
          axis: "measure",
          correct: false,
          note: "False. 5-minute bins coincide on both grids, so a wrong origin passes that check while 30-minute and hourly bars are wrong.",
        },
      ],
    },
  ],
};

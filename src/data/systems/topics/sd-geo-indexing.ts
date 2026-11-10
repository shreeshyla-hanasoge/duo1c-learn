import type { Topic } from "../../types.ts";

export const sdGeoIndexing: Topic = {
  id: "sd-geo-indexing",
  title: "Geospatial indexing",
  tier: 6,
  week: 11,
  depth: "deep",
  summary:
    "Find the points near a place without scanning them all. Learn geohash and its edge problem, quadtrees, S2 and H3 cells, and how to handle moving objects.",
  why: "Every 'near me' feature asks the same question: which of millions of points lie within a few kilometres of here? A full scan is too slow, and ordinary indexes handle one number at a time, not two. Geospatial indexes turn closeness on a map into something a normal database can search. They power ride dispatch, food delivery and store locators. The core ideas of cells, neighbours and boundaries also appear anywhere a continuous space is cut into buckets. Traed has no map data, so this topic is general design knowledge.",
  learn: {
    intuition:
      "Picture a city map cut into numbered squares, and a card cabinet where every chai shop is filed under its square's number. To find shops near you, you open your own drawer and the eight drawers around it, instead of walking the whole city. Three troubles follow. First, if you stand at the edge of your square, a shop two metres away may sit in the next square, so you must always open the neighbours. Second, the square size matters: too big and each drawer holds thousands of cards, too small and you open many drawers. Third, shops bunch up. One square in a big city may hold thousands, and a square in a desert none, so a clever map cuts crowded squares into smaller ones. And if the shops were taxis that move every few seconds, the cards would need rewriting all day, so the cabinet must be cheap to update.",
    mechanics: [
      {
        heading: "Why a plain index is not enough",
        body: "A table with latitude and longitude columns does not search well. An index on latitude finds a thin horizontal strip around the world, which holds millions of rows at every longitude, and only then filters by longitude. A radius search is therefore done in two steps. First, a cheap index lookup yields candidates, an approximate region. Second, an exact distance check, such as the haversine formula on a sphere, removes the false candidates. Worked numbers: one degree of latitude is about 111 km, so a 1 km radius is a box of plus or minus 0.009 degrees, an area of 4 square km against 3.14 for the circle. About 27 percent of candidates are discarded by the exact check.",
      },
      {
        heading: "Geohash: a map position as a short string",
        body: "Geohash halves the longitude range, then the latitude range, and so on, writing 0 or 1 for each choice. The bits from the two axes are interleaved, and each group of 5 bits becomes one base-32 character. For example, 57.64911 north and 10.40744 east becomes u4pruydqqvj. Points that share a prefix are in the same cell, and a longer prefix means a smaller cell. Five characters give a cell about 4.9 km by 4.9 km, six give about 1.2 km by 0.6 km, and seven about 150 m square. Because it is a string, an ordinary index prefix scan finds every point in a cell. Redis GEO stores positions this way, as a sorted-set score.",
      },
      {
        heading: "The edge problem and neighbour cells",
        body: "Closeness on the map does not mean a shared prefix. Two points 10 metres apart on opposite sides of a cell edge can have different hashes, and at the top-level split of the world they differ in the very first character. Only the reverse is guaranteed: a long shared prefix means the points are close. So a correct search computes the customer's cell and its 8 neighbours, scans all 9, then applies the exact distance filter. Choose the cell size to be at least the radius, so one ring of neighbours is enough. For a 1 km radius, five characters work, but 9 cells cover about 14.7 km across, so a dense city returns many candidates for the filter to discard.",
      },
      {
        heading: "Quadtrees, S2 and H3: adapting to the world",
        body: "A fixed grid ignores density. A quadtree starts with one square and splits any square holding more than a set number of points, say 100, into four equal children. Dense cities become deep, and empty regions stay one big leaf. A search visits only squares that touch the circle. PostGIS uses a related tree, the R-tree. Google's S2 maps the sphere onto six cube faces and orders cells along a Hilbert curve, giving each cell a 64-bit id with 30 levels. Uber's H3 uses hexagons at 16 resolutions, so a hexagon's six neighbours are all the same distance away. Both avoid geohash's distortion near the poles.",
      },
      {
        heading: "In Traed's terms",
        body: "We have no geographic data, so there is nothing to index this way. The nearest thing is picking the option strike closest to the spot price, which our strike selector does with a closest-to-spot rule. That is one dimension: strikes sit in a sorted list, so a binary search or a short scan is enough, and no cells or neighbours are needed. Geospatial indexing would matter if we added something location-based, such as finding branches or exchanges near a user. Even then, a few thousand points can be scanned directly with a distance formula, and an index only pays off in the millions.",
      },
    ],
    complexityDerivation:
      "The invariant is that a point's cell id is a function of its coordinates alone. Every point lies in exactly one cell at each level, and the id can be computed without looking at any other data. That turns 'near' into 'same or adjacent id', which a normal index can search. If cells have side s and the search radius is r, a query touches about (2r/s + 1) squared cells, which is 9 when s is near r. The cost is the number of cells times the lookup time, plus the number of candidates the exact filter must check. The argument stops holding in four places. Density can be wildly uneven, so one cell may hold 50,000 points and become a scan. Ordering cells in one dimension leaves jumps, so some neighbours are far apart in key order and need extra range scans. Latitude and longitude cells shrink toward the poles, so equal-size cells are not equal in distance. And straight-line distance is not road distance, so the index gives candidates and a routing step ranks them. Moving objects are cheap only while most updates stay inside one cell: a car at 10 m/s needs about two minutes to cross a 1.2 km cell.",
    variants: [
      {
        name: "Geohash on an ordinary index or sorted set",
        when: "You already have a database or Redis, the points are moving or numerous, and a radius search with a modest error is fine.",
        delta:
          "A string prefix gives the cell, so any key-value store can search. Cells are rectangles that vary with latitude, and the edge problem needs neighbour lookups.",
      },
      {
        name: "Quadtree, k-d tree or R-tree",
        when: "The points are mostly static, very unevenly spread, and queries include shapes such as boxes and polygons.",
        delta:
          "The structure adapts to density and answers shape queries well, but it is a tree to maintain. Updates for fast-moving objects are costlier than a grid.",
      },
      {
        name: "Hierarchical cell grids: S2 and H3",
        when: "You need one consistent global cell system, for dispatch, pricing zones or analytics, with stable ids across services.",
        delta:
          "Cell ids are compact and hierarchical, so parents and children are easy to compute. You depend on a library, and covering a region means a set of cells rather than a single prefix.",
      },
    ],
    tradeoffs: [
      {
        vs: "A fixed grid versus an adaptive tree",
        pick: "A fixed grid for moving objects, a tree for static and uneven data",
        because:
          "Moving a driver between two grid cells is a pair of cheap set operations. In a tree, the same move can force splits and merges. For fixed data the tree gives even work per leaf despite uneven density.",
      },
      {
        vs: "Large cells versus small cells",
        pick: "Cell size close to the typical search radius",
        because:
          "Smaller cells shrink candidate lists but multiply the cells to open and the keys to update. Larger cells open fewer drawers but each holds more points to filter. A cell near the radius keeps one ring of neighbours enough.",
      },
      {
        vs: "Squares and strings versus hexagons and libraries",
        pick: "Geohash when you need the simplest thing in any database, H3 or S2 when cell geometry matters",
        because:
          "Geohash needs nothing but string handling. Hexagons give equal-distance neighbours, which suits smoothing and ring queries, but need a library and agreement across every service.",
      },
    ],
  },
  algorithms: [
    {
      name: "Geohash",
      role: "Turns a latitude and longitude into a short string whose prefix names a cell, so an ordinary index can find nearby points.",
      dsa: "spatial",
    },
    {
      name: "Quadtree",
      role: "Splits crowded squares into four, so dense areas get small cells and empty areas stay large.",
      dsa: "spatial",
    },
    {
      name: "S2 and H3 cell hierarchies",
      role: "Divide the globe into nested cells with compact ids, so a region becomes a small set of cell ids to look up.",
    },
    {
      name: "Haversine distance",
      role: "Computes the exact distance between two points on a sphere, to discard candidates that fall in the cells but outside the radius.",
    },
  ],
  realWorld: [
    {
      system: "Uber H3",
      kind: "industry",
      problem:
        "A ride marketplace must group supply and demand by area, find nearby drivers, and compare areas fairly, all in near real time.",
      applied:
        "Uber published H3, a hexagonal hierarchical grid with 16 resolutions. Each hexagon has six neighbours at equal distance, which suits ring searches and smoothing of values such as demand across neighbouring areas.",
      evidence: "Uber Engineering blog, H3: Uber's Hexagonal Hierarchical Spatial Index; the open-source H3 project",
      impact:
        "Areas get stable ids that services share, and a nearby search is a lookup of a cell and a ring of neighbours.",
    },
    {
      system: "Google S2 and MongoDB 2dsphere",
      kind: "industry",
      problem:
        "A global service needs one cell system that works on a sphere, supports shapes, and gives compact ids that can be sorted and indexed.",
      applied:
        "Google's S2 library projects the sphere onto cube faces and orders cells along a Hilbert curve. MongoDB documents its 2dsphere index as built on S2 cells, and covers query regions with a set of cell ranges.",
      evidence: "S2 Geometry library documentation; MongoDB documentation on 2dsphere indexes",
      impact:
        "Region queries become a few range scans over sorted cell ids on an ordinary index.",
    },
    {
      system: "Redis GEO commands",
      kind: "industry",
      problem:
        "Applications that track many moving points need fast inserts, updates and radius queries without a separate spatial database.",
      applied:
        "Redis GEOADD stores each position in a sorted set, using a 52-bit geohash as the score. GEOSEARCH finds members within a radius or box of a point by scanning the neighbouring cells and filtering by distance.",
      evidence: "Redis documentation: GEOADD and GEOSEARCH",
      impact:
        "A driver's update is one sorted-set write, and a nearby search returns members already filtered by exact distance.",
    },
    {
      system: "PostGIS with a GiST index",
      kind: "industry",
      problem:
        "A relational database needs to answer 'which of these millions of rows are within this distance or inside this polygon' without a full scan.",
      applied:
        "PostGIS adds geometry types and a GiST index, which works as an R-tree over bounding boxes. Queries use a distance or containment function, and the index narrows the candidate rows before the exact test.",
      evidence: "PostGIS documentation: spatial indexing and ST_DWithin",
      impact:
        "Radius, box and polygon queries use the index, so they stay fast on large tables of static geographic data.",
    },
  ],
  insights: [
    {
      t: "Near is two steps",
      d: "A cheap cell lookup gives candidates. An exact distance check, such as haversine, removes the ones outside the radius.",
    },
    {
      t: "Shared prefix means close, not the reverse",
      d: "Two points across a cell edge can share no prefix. Always search the cell and its 8 neighbours.",
    },
    {
      t: "Density decides the structure",
      d: "A fixed grid suits moving objects. A quadtree adapts to crowded cities. S2 and H3 give a global system of cell ids.",
    },
    {
      t: "Cell size follows the radius",
      d: "With cells near the search radius, one ring of neighbours covers the circle and the candidate list stays short.",
    },
  ],
  pitfalls: [
    "Searching only the customer's own cell. A point near the edge has neighbours in the next cell, and they are silently missed.",
    "Treating straight-line distance as travel time. The index finds candidates by distance, and the real ranking needs road routing.",
    "Rebuilding a tree for every location update. For moving objects use a grid keyed by cell id, where a move is a remove and an add.",
  ],
  quiz: [
    {
      q: "What property of geohash lets an ordinary database index find nearby points?",
      options: [
        "A geohash is the exact distance between two points on a map",
        "A geohash is random, so points spread evenly over the index",
        "Points in one cell share a prefix, so a prefix scan finds them",
        "A geohash is stored in a tree that rebalances itself",
      ],
      answer: 2,
      difficulty: "recall",
      why: "Each extra character narrows the cell. Points in one cell share its prefix, so a range or prefix scan on a normal sorted index returns the cell's points.",
      distractors: [
        "A geohash names a cell. Distance still needs a separate calculation.",
        "Geohash is not random. Its order follows the map, and that is the whole point.",
        "",
        "The index can be any sorted structure. Geohash itself is just a string.",
      ],
    },
    {
      q: "What is the geohash boundary problem?",
      options: [
        "Close points across a cell edge can have very different hashes",
        "Two points far apart can end up with exactly the same hash",
        "Hashes grow too long to store for points near the equator",
        "Hashes cannot be computed at all for points out over the ocean",
      ],
      answer: 0,
      difficulty: "recall",
      why: "Cell edges cut through neighbourhoods. A point on one side and a point 10 metres away on the other side may share no prefix, so a one-cell search misses it.",
      distractors: [
        "",
        "Points in the same cell share a hash, and the cell is small. They are close by construction.",
        "Length is chosen by precision and does not depend on latitude in that way.",
        "Any valid coordinate has a geohash, over land or sea.",
      ],
    },
    {
      q: "A customer stands near the edge of a geohash cell. How should the nearby-shops query be run to be correct?",
      options: [
        "Search only the cell the customer stands in right now",
        "Search the same cell using a longer prefix",
        "Search every cell in the whole city, to be safe",
        "Search it and 8 neighbours, then filter by true distance",
      ],
      answer: 3,
      difficulty: "apply",
      why: "A shop just across the edge lives in a neighbour cell. Searching all 9 cells covers the circle when cells are at least as large as the radius, and the distance filter removes extras.",
      distractors: [
        "That misses shops just across the edge, which are the closest ones.",
        "A longer prefix is a smaller cell, so it misses even more.",
        "That is correct but scans far more than needed, defeating the index.",
        "",
      ],
    },
    {
      q: "You search a 5 km radius around a point. About what latitude range does the bounding box cover, given that one degree of latitude is about 111 km?",
      options: [
        "Plus or minus 0.5 degrees",
        "Plus or minus 0.045 degrees",
        "Plus or minus 0.0045 degrees",
        "Plus or minus 4.5 degrees",
      ],
      answer: 1,
      difficulty: "apply",
      why: "5 km divided by 111 km per degree is about 0.045 degrees. The longitude range is wider, because degrees of longitude shrink away from the equator.",
      distractors: [
        "That is about 55 km, eleven times the radius.",
        "",
        "That is about 500 metres, a tenth of the radius, and would miss most results.",
        "That is about 500 km, a hundred times the radius.",
      ],
    },
    {
      q: "A fixed 1 km grid over India puts 8,000 restaurants in one Mumbai cell and none in many rural cells. Why might a quadtree do better?",
      options: [
        "It makes every restaurant lookup exact with no distance check",
        "It splits crowded cells into smaller ones and leaves empty areas as big leaves",
        "It removes the edge problem completely for every query",
        "It stores restaurants as strings, so a normal index works",
      ],
      answer: 1,
      difficulty: "apply",
      why: "A quadtree divides a square only when it holds more than a set number of points, so Mumbai gets deep, small cells with few points each, and sparse areas stay large.",
      distractors: [
        "A quadtree still gives candidates. An exact distance check is still needed.",
        "",
        "A search near a split line still needs to visit adjacent squares, so the edge issue remains.",
        "That describes geohash. A quadtree is a tree of squares.",
      ],
    },
    {
      q: "A ride app has 100,000 drivers, each sending a location every 4 seconds. That is 25,000 updates a second. Which design handles it?",
      options: [
        "Rebuild one quadtree of all the drivers each second",
        "Write each ping to a MySQL row with an index on latitude",
        "Append every ping to a log and scan it for each request",
        "A map of cell id to driver set, updated when a cell changes",
      ],
      answer: 3,
      difficulty: "apply",
      why: "Most updates stay in the same cell and need no change beyond the position. A cell change is a remove and an add on two sets, which is cheap at 25,000 a second.",
      distractors: [
        "A full rebuild every second does work proportional to all drivers, over and over.",
        "A latitude index finds strips around the world and takes a disk write per ping.",
        "A scan grows with the log's length and gets slower every minute.",
        "",
      ],
    },
    {
      q: "A food-delivery app uses a geo index to find the 20 nearest restaurants. A product manager says the order of results should be the delivery time. What is the sound judgement?",
      options: [
        "It gives straight-line candidates; routing should rank them by road time",
        "The index already orders results by road time, so nothing more is due",
        "Increase the cell size so the index covers whole routes",
        "Use a hexagon grid, which measures road distance directly",
      ],
      answer: 0,
      difficulty: "judge",
      why: "A geo index knows positions, not roads. A river, a one-way street or a flyover can make a near restaurant slow to reach. Use the index for a shortlist and a routing step for the order.",
      distractors: [
        "",
        "The index uses straight-line geometry and knows nothing about roads.",
        "Bigger cells return more candidates but still use straight-line geometry.",
        "Hexagons make neighbour distances equal in a straight line. They do not model roads.",
      ],
    },
    {
      q: "A platform has 2,000 branch locations, queried a few times an hour by a back-office page. A developer proposes S2 cells and a custom index. What is the sound judgement?",
      options: [
        "Good, because every location feature needs a cell index",
        "Good, because a plain scan with a distance formula cannot work",
        "Not needed; scanning 2,000 points takes only microseconds",
        "Better to use a quadtree, since it handles any data set",
      ],
      answer: 2,
      difficulty: "judge",
      why: "Computing 2,000 distances takes a tiny fraction of a millisecond. A spatial index adds code, a library and a data structure to maintain, and pays off only at far larger sizes or query rates.",
      distractors: [
        "Indexes are for scale. At this size they add cost with no benefit.",
        "A scan works well here, since 2,000 distance calculations are instant.",
        "",
        "A quadtree has the same maintenance cost and the same lack of benefit at this size.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-geo-indexing-store-locator",
      scenario:
        "A two-person team runs a store-locator page on one server with a MySQL database. The company has about 3,000 shops. The page runs a nearest-shops search a few hundred times a day, and the shop list changes a few times a month. The team has never used a spatial library. How should they do the search?",
      options: [
        {
          label: "A geohash column in a Redis sorted set",
          appeal:
            "Fast radius search with a dedicated command and almost no code.",
        },
        {
          label: "A PostGIS-style spatial index with a migration to a new database",
          appeal:
            "A proper spatial database with room for polygons later.",
        },
        {
          label: "Load the 3,000 shops and compute the distance to each with a haversine function",
          appeal:
            "No new infrastructure, exact results, and trivial to understand.",
        },
        {
          label: "H3 cells with a service that tracks neighbours",
          appeal:
            "A consistent global grid that can serve future features.",
        },
      ],
      best: 2,
      verdict:
        "Three thousand distance calculations take a small fraction of a millisecond, and queries come a few hundred times a day. Any index adds a dependency and code to maintain for no visible gain. A scan is exact and needs no edge-case handling. The other options pay for scale the problem does not have.",
      claims: [
        {
          text: "You accept that the cost of a query grows with the number of shops, which is fine at 3,000.",
          axis: "trade",
          correct: true,
          note: "True. A scan is linear, and linear on a few thousand points is negligible.",
        },
        {
          text: "You avoid a new dependency, a second data store and the edge-problem logic entirely.",
          axis: "trade",
          correct: true,
          note: "True. The scan checks every shop, so there are no cell edges to miss.",
        },
        {
          text: "A geohash index would return more accurate results than a scan with an exact distance.",
          axis: "trade",
          correct: false,
          note: "A scan checks every point exactly. An index can only match it by finally applying the same distance check.",
        },
        {
          text: "If the company grows to several million locations, a scan on every request will become too slow.",
          axis: "failure",
          correct: true,
          note: "True. That is the point at which an index starts to pay off.",
        },
        {
          text: "A scan will return wrong results for shops near a cell boundary.",
          axis: "failure",
          correct: false,
          note: "A scan uses no cells, so there is no boundary to fall across.",
        },
        {
          text: "Time the search with the real shop list and move to an index only when it exceeds a latency target.",
          axis: "measure",
          correct: true,
          note: "True. Measuring first prevents building an index the data does not need.",
        },
        {
          text: "The number of shops in the database tells you whether an index is needed.",
          axis: "measure",
          correct: false,
          note: "The query rate and measured latency matter too. A count alone does not decide.",
        },
      ],
    },
    {
      id: "sd-geo-indexing-dispatch",
      scenario:
        "A ride-hailing company runs in a metro area with 200,000 active drivers, each sending a location every 4 seconds, which is 50,000 updates a second. When a rider requests a trip, the system must find the 10 closest available drivers within 2 km in under 100 ms, thousands of times a second at peak. Drivers move continuously. Which design fits?",
      options: [
        {
          label: "A SQL table with latitude and longitude columns and a B-tree index on latitude",
          appeal:
            "Familiar tools, and every update is a plain row write.",
        },
        {
          label: "An in-memory map of cell id to driver set (geohash or hexagon), searching the rider's cell and a ring of neighbours, then filtering by exact distance",
          appeal:
            "A move is two cheap set operations, and a search touches a handful of cells.",
        },
        {
          label: "A quadtree rebuilt from all drivers every 10 seconds",
          appeal:
            "Adapts to crowded areas and gives clean shape queries.",
        },
        {
          label: "A scan of all 200,000 drivers for every request",
          appeal:
            "Exact, no edge problem, and no index to keep in step with moves.",
        },
      ],
      best: 1,
      verdict:
        "The data is moving fast and queries are frequent and local. A grid keyed by cell id makes an update cheap, because most pings stay in the same cell, and a search touches about 9 cells. A latitude index returns a worldwide strip and takes a disk write per ping. A tree rebuilt every 10 seconds is stale by hundreds of metres. A full scan is 200,000 distance calculations per request, thousands of times a second.",
      claims: [
        {
          text: "You accept that the cell map is a copy held in memory that can be rebuilt from the next round of pings.",
          axis: "trade",
          correct: true,
          note: "True. Driver positions are short-lived, so a lost map is repaired by the next pings.",
        },
        {
          text: "You pay a few extra distance checks per query in return for updates that cost only a set operation.",
          axis: "trade",
          correct: true,
          note: "True. The ring of neighbour cells returns extra candidates that the exact check discards.",
        },
        {
          text: "Smaller cells always make the search cheaper.",
          axis: "trade",
          correct: false,
          note: "Smaller cells shorten candidate lists but need more cells opened and more cell changes per driver.",
        },
        {
          text: "A driver who just crossed a cell edge but whose cell move is delayed may be missed by a search for a moment.",
          axis: "failure",
          correct: true,
          note: "True. Positions are always slightly stale, so the design must tolerate a short lag.",
        },
        {
          text: "The index orders drivers by the time they would take to arrive.",
          axis: "failure",
          correct: false,
          note: "It only knows straight-line geometry. Arrival time needs routing on the shortlist.",
        },
        {
          text: "Track the 99th percentile search time at peak and how many candidates each search checks.",
          axis: "measure",
          correct: true,
          note: "True. Tail latency shows the user impact, and the candidate count shows whether the cell size is right.",
        },
        {
          text: "The average search time across the whole day shows whether the peak is healthy.",
          axis: "measure",
          correct: false,
          note: "Peak minutes are a small share of the day, so a day-long average hides the slow searches that riders feel.",
        },
      ],
    },
    {
      id: "sd-geo-indexing-delivery-zones",
      scenario:
        "A four-person team already runs PostgreSQL. They store 12 million points of interest and several thousand delivery-zone polygons. Queries are 'which points lie inside this polygon' and 'which zone contains this address'. The data changes a few times a day, and reads dominate. The team wants the least new infrastructure. What should they use?",
      options: [
        {
          label: "PostGIS with a GiST (R-tree) spatial index on the existing database",
          appeal:
            "Handles polygons and radius queries natively, with no new service to run.",
        },
        {
          label: "Geohash strings in a Redis sorted set",
          appeal:
            "Very fast radius search with simple commands.",
        },
        {
          label: "A scan with a distance function over all rows",
          appeal:
            "No setup, exact, and the data fits in memory.",
        },
        {
          label: "A custom quadtree service written by the team",
          appeal:
            "Full control of the structure and tuning.",
        },
      ],
      best: 0,
      verdict:
        "The data is static, large, polygon-heavy and already in PostgreSQL. A spatial index on the existing database handles polygon containment and distance with no new service. Geohash in Redis is built for points and a radius, not polygons. A scan of 12 million rows per query is far too slow. A custom quadtree rebuilds what the database already provides.",
      claims: [
        {
          text: "You accept a spatial extension and index in the existing database in return for no new service to run.",
          axis: "trade",
          correct: true,
          note: "True. The cost is a one-time setup and the index's disk space.",
        },
        {
          text: "The index narrows candidates by bounding boxes and the exact test then runs on only those few rows.",
          axis: "trade",
          correct: true,
          note: "True. That is the two-step pattern of candidates then an exact check.",
        },
        {
          text: "Because the index is a tree, it handles a million location updates a second as well as a grid does.",
          axis: "trade",
          correct: false,
          note: "Trees are costlier to update than a grid. This design fits because the data changes only a few times a day.",
        },
        {
          text: "If the zone polygons are very detailed, the exact containment test becomes the slow step even with an index.",
          axis: "failure",
          correct: true,
          note: "True. The index cuts candidates, but each exact test on a complex polygon costs more.",
        },
        {
          text: "Without the spatial index, the same query would still use the plain B-tree on latitude efficiently.",
          axis: "failure",
          correct: false,
          note: "A B-tree on one coordinate gives a worldwide strip, and polygon tests would still run on millions of rows.",
        },
        {
          text: "Compare the query plan to confirm the spatial index is used, and time the slowest polygon queries.",
          axis: "measure",
          correct: true,
          note: "True. A plan that ignores the index is the commonest reason these queries stay slow.",
        },
        {
          text: "The number of rows in the table is the best measure of query speed.",
          axis: "measure",
          correct: false,
          note: "Row count affects speed, but index use and measured query time are the real measures.",
        },
      ],
    },
  ],
};

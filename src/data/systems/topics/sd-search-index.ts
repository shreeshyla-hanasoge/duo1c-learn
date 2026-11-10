import type { Topic } from "../../types.ts";

export const sdSearchIndex: Topic = {
  id: "sd-search-index",
  title: "Search and the inverted index",
  tier: 2,
  week: 4,
  depth: "deep",
  summary:
    "Search flips the data: keep a list of documents per word instead of scanning them. Learn tokenising, postings lists, BM25 ranking and near real-time indexing.",
  why: "Sooner or later someone asks for a search box: find an instrument, a ticket, a product, a news item. A database LIKE query scans every row, and past a certain size it is the wrong tool. The inverted index behind Lucene and Elasticsearch is the standard answer, and it also teaches a wider pattern: a search engine is a derived copy of your data, rebuilt from a source of truth. Knowing when you do not need one is as useful as knowing how it works.",
  learn: {
    intuition:
      "Open any textbook and turn to the index at the back. It does not list pages and make you read each one. It lists words, and beside each word the pages where it appears. To find pages about both 'margin' and 'futures', you take the two short lists and see which page numbers appear in both. That is the whole idea of an inverted index: the book is the forward view, page to words, and the index is the inverted view, word to pages. Building the index at the back costs the author real effort once. After that, finding a topic in a thousand-page book takes seconds, because you read a short list instead of the whole book. The price is that when the book changes, the index must be updated too.",
    mechanics: [
      {
        heading: "Analysis: turning text into terms",
        body: "Before indexing, text passes through an analyser. It splits the text into tokens, lowercases them, drops very common words such as 'the' (stop words), and often reduces words to a root (stemming). 'Running shoes' becomes run, shoe. The terms that go into the index are these roots, not the raw words. The key rule is that the query is analysed the same way: a user typing 'RUNNING' is turned into run and finds the document. If index and query use different analysers, matches silently fail. Language matters too: stemming rules for English do nothing useful for Hindi or Tamil text, which need their own analysers.",
      },
      {
        heading: "The inverted index and postings lists",
        body: "The index has two parts: a sorted dictionary of terms, and for each term a postings list of document ids, kept in order, often with the position of each occurrence. Take three documents: 1 'nifty bank futures', 2 'bank nifty options', 3 'gold futures'. Then bank gives [1,2], futures gives [1,3], gold gives [3]. The query 'bank futures' (both words) intersects [1,2] and [1,3] by walking both sorted lists together, and returns document 1. The cost follows the list lengths, not the corpus size. Skip pointers let a long list jump ahead. Phrase queries use the stored positions to check that the words are adjacent.",
      },
      {
        heading: "Ranking: TF-IDF and BM25",
        body: "Matching is not enough; results need an order. TF-IDF scores a document higher when the term appears often in it (term frequency) and lower when the term is common across all documents (inverse document frequency). A word found in nearly every document tells you little. BM25, the default in Lucene and Elasticsearch, refines this: term frequency saturates, so the tenth occurrence adds less than the second, and long documents are slightly penalised, with defaults of k1 = 1.2 and b = 0.75. To return the best 10 of a million matches, the engine keeps a min-heap of size 10 and never sorts the full set.",
      },
      {
        heading: "Segments, refresh and scale-out",
        body: "Lucene never edits an index in place. New documents go to an in-memory buffer, and a refresh writes them as a small immutable segment that becomes searchable. Elasticsearch refreshes about once a second by default, so search is near real-time, not instant. A transaction log protects unflushed writes. Deleting marks a document as removed; updating is delete plus add. A background merge combines small segments into larger ones, much like LSM compaction. To scale, an index is split into shards. A query goes to every shard, each returns its own top results, and a coordinator merges them. The number of primary shards is fixed when the index is created.",
      },
      {
        heading: "In Traed's terms",
        body: "Traed has no search engine, and today it does not need one. The instrument picker in the web app runs a database query with `LIKE` on the symbol and name columns, after at least two typed characters, against the table refreshed from the broker's instrument list. That table is small enough for a scan to be quick for one user. We would change when searching free text over something that grows, such as news headlines or many users' strategies, or when typo tolerance and ranking matter. The first step would be MySQL's built-in full-text index. A separate engine would be a derived copy, rebuilt from MySQL, never a second record.",
      },
    ],
    complexityDerivation:
      "The reason an inverted index is fast is a change of what you iterate over. A scan costs time proportional to every document, so doubling the data doubles the query. A lookup by term costs time proportional to the length of that term's postings list, and a selective query touches short lists, so the cost depends on how many documents match, not on how many exist. The price moves to write time: every document is analysed and added to many lists, and segments must be merged later. The argument holds when queries are selective and words are the unit. It stops holding for a leading wildcard such as '%ank', which cannot use a sorted dictionary, for a query made only of very common words whose lists are huge, for deep paging, where page 5,000 forces each shard to produce thousands of candidates, and for needs of exact, immediately visible reads, where refresh delay is unacceptable.",
    variants: [
      {
        name: "Database full-text index (MySQL FULLTEXT, PostgreSQL GIN)",
        when: "The data already lives in one database, the corpus is moderate, and you want ranked keyword search without a new system.",
        delta:
          "The inverted index lives next to your tables and stays transactionally consistent. You get fewer features than a dedicated engine, and heavy search shares CPU with your main workload.",
      },
      {
        name: "Dedicated engine (Lucene, Elasticsearch, OpenSearch)",
        when: "Large corpus, high query rate, facets, typo tolerance, highlighting or custom ranking are needed.",
        delta:
          "Shards and replicas scale reads and storage, and relevance can be tuned. You must feed it from the database, accept a refresh delay, and operate a cluster.",
      },
      {
        name: "Prefix structures for typeahead (edge n-grams or tries)",
        when: "The user types a few letters and expects suggestions after every keystroke.",
        delta:
          "Store prefixes as terms, so a lookup is one dictionary read. The index is larger than a normal one, and it matches the start of words only, not their middle.",
      },
    ],
    tradeoffs: [
      {
        vs: "Search in the database versus a separate engine",
        pick: "The database, until measurement says otherwise",
        because:
          "A second system must be synced, monitored and paid for. A LIKE or full-text query on tens of thousands of rows is quick. Add an engine when corpus size, query rate or relevance needs outgrow it.",
      },
      {
        vs: "Index at write time versus at query time",
        pick: "Index at write time for read-heavy search",
        because:
          "Analysing and storing terms up front makes each query cheap. If writes vastly outnumber searches, the indexing cost may not repay itself, and a scan on demand is simpler.",
      },
      {
        vs: "Freshness versus indexing throughput",
        pick: "Accept about a second of delay for bulk-friendly refresh",
        because:
          "Refreshing after every document creates many tiny segments and slows everything. A refresh interval of around a second batches writes. Where a user must see their own write at once, read it from the database.",
      },
    ],
  },
  algorithms: [
    {
      name: "Inverted index with sorted postings lists",
      role: "Maps each term to the ordered ids of the documents holding it, and answers an AND query by walking two sorted lists together.",
    },
    {
      name: "BM25 relevance scoring",
      role: "Scores each matching document from term frequency, rarity of the term and document length, so the best matches come first.",
    },
    {
      name: "Min-heap top-k",
      role: "Keeps only the best k scores while scanning matches, so ranking a million hits costs about n log k rather than a full sort.",
      dsa: "heaps",
    },
    {
      name: "Skip pointers",
      role: "Lets a long postings list jump ahead during intersection instead of stepping through every entry.",
      dsa: "skip-lists",
    },
  ],
  realWorld: [
    {
      system: "Apache Lucene and Elasticsearch",
      kind: "industry",
      problem:
        "Search over millions of documents must return ranked results quickly, while new documents keep arriving.",
      applied:
        "Lucene stores immutable segments, each with a term dictionary and postings lists, and merges them in the background. Elasticsearch adds shards and replicas on top, refreshes about once a second by default, and uses BM25 as its default scorer.",
      evidence: "Apache Lucene documentation; Elasticsearch reference: near real-time search, shards, similarity",
      impact:
        "Query cost follows the matching postings, and the cluster grows by adding shards, with a short delay before new documents are visible.",
    },
    {
      system: "Google's original web search design",
      kind: "industry",
      problem:
        "A web crawl of many millions of pages cannot be scanned per query.",
      applied:
        "The published Google paper describes a forward index per page and an inverted index built from it, with word hits stored per document and ranking that combines text matching with link analysis (PageRank).",
      evidence: "Brin and Page, The Anatomy of a Large-Scale Hypertextual Web Search Engine (1998)",
      impact:
        "It established the crawl, index and rank pipeline that later search systems copy at smaller scale.",
    },
    {
      system: "PostgreSQL full-text search with GIN",
      kind: "industry",
      problem:
        "Teams want ranked keyword search over data already held in PostgreSQL, without running a second system.",
      applied:
        "A column is converted to a tsvector of analysed terms, and a GIN (generalised inverted) index maps each term to the rows containing it. Queries use tsquery and can be ranked with ts_rank.",
      evidence: "PostgreSQL documentation: full text search and GIN indexes",
      impact:
        "Many applications get good enough search inside the database they already operate, with transactional consistency.",
    },
    {
      system: "Traed instrument picker",
      kind: "yours",
      problem:
        "A user picking a symbol types a few letters and expects matching instruments from the broker's list.",
      applied:
        "The search endpoint requires at least two characters and filters the instruments table with `like` on symbol and name. Crypto pairs, which are not in that table, come from a small configured list instead.",
      evidence: "CMS/trade-server/app/Http/Controllers/InstrumentController.php",
      impact:
        "There is no index to maintain and nothing to sync. The cost is a scan per search, which one user does not notice.",
    },
  ],
  insights: [
    {
      t: "Search flips the data",
      d: "The forward view lists words per document. The inverted index lists documents per word, so a query reads short lists, not the whole corpus.",
    },
    {
      t: "Analyse the same way twice",
      d: "Index and query must share the analyser. Stemming, lowercasing and stop words applied on one side only cause silent misses.",
    },
    {
      t: "Search is a derived store",
      d: "The database is the record and the search index is a rebuildable copy. If it is lost, reindex; never keep the only copy of anything in it.",
    },
    {
      t: "Near real-time is not real-time",
      d: "A new document becomes searchable after the next refresh, about a second in Elasticsearch. Show a user their own write from the database.",
    },
  ],
  pitfalls: [
    "Using a leading-wildcard LIKE such as '%ifty%' and expecting an ordinary index to help. A sorted index cannot be searched from the middle of a word.",
    "Treating the search engine as the system of record. A bad mapping change or a lost node then loses data that exists nowhere else.",
    "Letting index and query analysers differ. A document indexed with stemming but searched without it simply fails to match, with no error.",
  ],
  quiz: [
    {
      q: "What does an inverted index map?",
      options: [
        "Each document to the list of words it contains",
        "Each term to the sorted list of documents that contain it",
        "Each query to the cached list of results it returned",
        "Each word to its dictionary meaning in several languages",
      ],
      answer: 1,
      difficulty: "recall",
      why: "The index is inverted relative to the text: instead of document to words, it stores word to documents. That is what lets a query read short lists rather than scan everything.",
      distractors: [
        "That is the forward view, which is what a scan has to read. Inverting it is the point.",
        "",
        "That is a query result cache, a different layer that sits in front of the index.",
        "A dictionary meaning is semantic. The index only records where terms occur.",
      ],
    },
    {
      q: "Why is a search index called a derived store?",
      options: [
        "It can be rebuilt from the source of truth if it is lost",
        "It always updates faster than the database it copies",
        "It derives its ranking from the user's earlier searches",
        "It stores a compressed copy of every backup of the database",
      ],
      answer: 0,
      difficulty: "recall",
      why: "The index is built from data held elsewhere, so a lost or corrupt index is repaired by reindexing from the record. That is also why it must not hold the only copy.",
      distractors: [
        "",
        "It usually lags the database by a refresh interval or more, rather than leading it.",
        "Personalisation is a separate feature. Derived means built from other data.",
        "Backups are unrelated. The index is built from live records, not from backup files.",
      ],
    },
    {
      q: "Postings lists: gold gives [3,7,9] and futures gives [1,3,9,12]. Which documents match the query 'gold futures' where both words are required?",
      options: [
        "1, 3, 7, 9 and 12, because either word is enough",
        "Only document 7, since it is the one unique to gold",
        "Only document 12, since it is the last one in the longer list",
        "3 and 9, because they appear in both lists",
      ],
      answer: 3,
      difficulty: "apply",
      why: "An AND query intersects the lists by walking both in sorted order. Only 3 and 9 appear in each.",
      distractors: [
        "That is the union, which answers an OR query.",
        "Document 7 has gold but not futures, so it fails the AND.",
        "Position in a list says nothing about matching. Document 12 has futures only.",
        "",
      ],
    },
    {
      q: "A document is indexed in Elasticsearch, and a search a few hundred milliseconds later does not find it. A search two seconds later does. What explains this?",
      options: [
        "The index was damaged, and it was repaired in the background",
        "The cache served an old answer until it expired",
        "It becomes searchable only at the next refresh, about a second on",
        "The query ran against a shard that did not hold the document",
      ],
      answer: 2,
      difficulty: "apply",
      why: "Writes go to a buffer first. A refresh makes them a searchable segment, by default about once a second. This is what near real-time means.",
      distractors: [
        "Nothing was damaged. The delay is designed behaviour.",
        "A query cache is possible, but the usual cause of this exact pattern is the refresh interval.",
        "",
        "A search covers all shards. A missing shard would give incomplete results for a long time, not one second.",
      ],
    },
    {
      q: "Users type 'RUNNING' and expect to find a document titled 'run club'. The index was built with stemming but the query path skips it. What happens, and what is the fix?",
      options: [
        "It matches anyway, since search ignores case by default",
        "No match: the index holds 'run', the query seeks 'running'; use one analyser",
        "No match, as the document is too short; add more text to it",
        "It matches, but with a low score; raise the BM25 k1 value",
      ],
      answer: 1,
      difficulty: "apply",
      why: "The term in the index is the stem, run. If the query is not stemmed it looks up running, finds nothing, and fails silently. Applying the same analyser to both removes the gap.",
      distractors: [
        "Lowercasing helps with case but not with the different word form.",
        "",
        "Length is not the cause. The terms simply differ.",
        "There is no lookup hit to score, so tuning k1 changes nothing.",
      ],
    },
    {
      q: "An index holds 200,000 NIFTY news headlines, and almost every one contains the word 'nifty'. A user searches 'nifty gold'. Which term influences ranking more?",
      options: [
        "Gold, as it is rare and so has a high inverse document frequency",
        "Nifty, because it appears in the largest number of documents",
        "Both equally, because each appears at least once in the index",
        "Neither of them, since BM25 ignores how rare a term is",
      ],
      answer: 0,
      difficulty: "apply",
      why: "A term found in nearly every document separates nothing. IDF gives rare terms such as gold more weight, so documents with gold rise to the top.",
      distractors: [
        "",
        "Frequency across the corpus lowers a term's weight. It does not raise it.",
        "Equal weight would ignore the whole idea of IDF.",
        "Rarity is exactly what the IDF part of BM25 measures.",
      ],
    },
    {
      q: "An internal admin screen must search 8,000 support notes, used by three staff. A colleague proposes a three-node Elasticsearch cluster. What is the sound judgement?",
      options: [
        "Agree, since every search feature should have its own dedicated engine",
        "Agree, because a relational database cannot search text at all today",
        "Disagree only if the notes are not all written in plain English",
        "Disagree: a database query or full-text index is enough, and a cluster adds cost",
      ],
      answer: 3,
      difficulty: "judge",
      why: "At 8,000 rows a scan or a built-in full-text index answers in milliseconds. A cluster adds sync logic, failure modes and a bill for no gain the users would notice.",
      distractors: [
        "Dedicated engines earn their place at scale or for rich relevance, not by default.",
        "Databases search text with LIKE and with full-text indexes. They are limited, not unable.",
        "Language affects analysis quality, not whether a cluster is justified at this size.",
        "",
      ],
    },
    {
      q: "A team proposes that order history lives only in Elasticsearch because search over it is so fast. What is the right call?",
      options: [
        "Fine, as replicas make Elasticsearch durable enough for records",
        "Fine, provided the refresh interval is set to under one second",
        "Keep the record in the database and treat the index as a rebuildable copy",
        "Fine, because a search index offers the same transactions as a database",
      ],
      answer: 2,
      difficulty: "judge",
      why: "A search engine is tuned for retrieval, not for being the only copy of important data. Mapping changes, reindexing and node loss all become data-loss risks. Keep the record elsewhere and reindex from it.",
      distractors: [
        "Replicas protect against a node failing, but not against a mapping mistake or a bad bulk delete.",
        "Refresh timing affects visibility, not durability or record-keeping roles.",
        "",
        "Search engines do not give multi-document ACID transactions like a relational database.",
      ],
    },
  ],
  cases: [
    {
      id: "sd-search-index-symbol-picker",
      scenario:
        "A trading web app has a symbol picker. It queries a table of about 90,000 instruments refreshed daily from a broker file, using LIKE on symbol and name after two typed characters. One person uses it, a handful of searches an hour, on one server. A reviewer says 'real products use Elasticsearch'. Today a search returns in well under 100 milliseconds. The team is two people.",
      options: [
        {
          label: "Keep the LIKE query, add a result limit, and measure",
          appeal:
            "It works, adds nothing to run, and the data never needs syncing.",
        },
        {
          label: "Stand up Elasticsearch and sync the instruments table into it",
          appeal:
            "Typo tolerance and ranking would improve, and it is what larger products do.",
        },
        {
          label: "Cache every possible two-letter prefix in Redis",
          appeal:
            "Prefix lookups become instant and the database is never touched.",
        },
        {
          label: "Build a custom trie service that loads on boot",
          appeal:
            "Prefix matching is fast and elegant, and it avoids the database.",
        },
      ],
      best: 0,
      verdict:
        "One user, a handful of searches an hour, and a sub-100 ms response mean the problem is solved. Each alternative adds a component to sync, restart and monitor, for a gain nobody would notice. Cache and trie also lose middle-of-word matching that LIKE gives. Revisit when search is slow, many users search together, or relevance becomes a complaint.",
      claims: [
        {
          text: "Keeping LIKE means each search scans the table, in return for there being nothing to keep in sync.",
          axis: "trade",
          correct: true,
          note: "True. At 90,000 rows and one user the scan is cheap, and zero extra moving parts is the gain.",
        },
        {
          text: "A dedicated engine gives better results at no extra operating cost.",
          axis: "trade",
          correct: false,
          note: "False. It brings a sync job, a service to run and a delay before changes appear.",
        },
        {
          text: "If the daily instrument import changes the table, LIKE sees the new rows immediately with no reindex step.",
          axis: "failure",
          correct: true,
          note: "True. The query reads the live table, so there is no stale copy to drift.",
        },
        {
          text: "An Elasticsearch copy that lags the import cannot cause a user to miss a newly listed contract.",
          axis: "failure",
          correct: false,
          note: "False. Until the sync runs and a refresh happens, the new contract is not searchable.",
        },
        {
          text: "Logging the query time and its 95th percentile shows whether the scan is becoming a problem.",
          axis: "measure",
          correct: true,
          note: "True. A measured tail latency tells you when to change.",
        },
        {
          text: "The number of rows in the table alone proves a search engine is needed.",
          axis: "measure",
          correct: false,
          note: "False. Row count matters only through query time and query rate, which you measure.",
        },
      ],
    },
    {
      id: "sd-search-index-festival-catalogue",
      scenario:
        "An Indian e-commerce site runs a festival sale. Its catalogue has about 40 million product listings in a relational database. Peak traffic is tens of thousands of searches per second. Shoppers expect results ranked by relevance, spelling-error tolerance, filters by brand and price, and new listings visible within a few seconds. The primary database already runs near its limit with orders.",
      options: [
        {
          label: "Run LIKE queries against read replicas of the database",
          appeal:
            "No new technology, and replicas spread the read load.",
        },
        {
          label: "Add a full-text index inside the primary database",
          appeal:
            "Ranked search with one system and full consistency.",
        },
        {
          label: "Cache the result of every distinct query string in Redis",
          appeal:
            "Repeated popular searches become instant and database load drops.",
        },
        {
          label: "A sharded, replicated search cluster fed from the database by a change stream",
          appeal:
            "Scales reads and storage on its own hardware, with ranking, filters and typo tolerance built in.",
        },
      ],
      best: 3,
      verdict:
        "The load, the 40 million documents and the feature list all point to a dedicated engine kept apart from the order database. A change stream keeps it within seconds of the source, and it can be rebuilt from it. LIKE on replicas scans too much and cannot rank. A full-text index on the primary adds load where there is none to spare. A query cache helps only repeats, and long-tail searches still miss.",
      claims: [
        {
          text: "The search cluster is a copy that can lag the database by seconds, accepted in return for taking search load off the order database.",
          axis: "trade",
          correct: true,
          note: "True. A few seconds of delay is allowed by the requirements.",
        },
        {
          text: "Putting search in a separate cluster guarantees an item is visible the instant it is listed.",
          axis: "trade",
          correct: false,
          note: "False. Visibility waits for the change stream and the next refresh.",
        },
        {
          text: "If the change stream falls behind, search shows stale prices or stock, so the order path must check the database.",
          axis: "failure",
          correct: true,
          note: "True. The index is a derived copy, so the checkout reads the record.",
        },
        {
          text: "Losing the search cluster loses the catalogue.",
          axis: "failure",
          correct: false,
          note: "False. The catalogue is in the database and the index is rebuilt from it, though that takes time.",
        },
        {
          text: "Lag from database write to searchable, and p99 query latency, are the numbers to alert on.",
          axis: "measure",
          correct: true,
          note: "True. Freshness and tail latency are what shoppers feel.",
        },
        {
          text: "Average query latency is sufficient, because slow outliers do not matter at this volume.",
          axis: "measure",
          correct: false,
          note: "False. At tens of thousands of requests a second, even the slowest 1 percent is many shoppers.",
        },
      ],
    },
    {
      id: "sd-search-index-ticket-search",
      scenario:
        "A four-person startup keeps 2 million customer support tickets in PostgreSQL. Support staff need keyword search with ranked results across subject and body, a few queries per second at most. Typo tolerance is nice to have, not required. The team has no one who has run a search cluster, and results can lag by minutes without harm.",
      options: [
        {
          label: "LIKE '%word%' on the body column",
          appeal:
            "One line of SQL and no schema change.",
        },
        {
          label: "A tsvector column with a GIN index in the same PostgreSQL",
          appeal:
            "Ranked keyword search with no new system, kept consistent with the data.",
        },
        {
          label: "A three-node Elasticsearch cluster",
          appeal:
            "Best relevance tuning and typo tolerance.",
        },
        {
          label: "Load all tickets into application memory and scan",
          appeal:
            "No database load, and complete control of matching.",
        },
      ],
      best: 1,
      verdict:
        "Two million rows, a few queries a second, no typo requirement and a small team match what built-in full-text search does well. A GIN index gives an inverted index and ranking inside the database already operated. LIKE with leading wildcards scans millions of rows per query. A cluster is more than the load and the team justify. In-memory scanning duplicates the data in every process.",
      claims: [
        {
          text: "Full-text search in PostgreSQL gives up fuzzy matching and some tuning, in return for no new system to run.",
          axis: "trade",
          correct: true,
          note: "True. That is a fair price for a four-person team with modest load.",
        },
        {
          text: "A GIN index makes writes free, because it is built only when a query arrives.",
          axis: "trade",
          correct: false,
          note: "False. A GIN index is maintained on writes, so inserts and updates cost extra.",
        },
        {
          text: "A leading-wildcard LIKE on 2 million bodies scans every row and slows as tickets grow.",
          axis: "failure",
          correct: true,
          note: "True. A sorted index cannot help when the pattern begins with a wildcard.",
        },
        {
          text: "Adding a cluster removes the risk that search and the database disagree.",
          axis: "failure",
          correct: false,
          note: "False. A separate copy introduces that risk, since it can lag or miss an update.",
        },
        {
          text: "Timing the top ten search queries before and after the index shows the benefit directly.",
          axis: "measure",
          correct: true,
          note: "True. Measuring on real queries confirms the change worked.",
        },
        {
          text: "Counting indexed tickets proves the search results are relevant.",
          axis: "measure",
          correct: false,
          note: "False. Coverage is not relevance. You need sample searches judged by the people who use them.",
        },
      ],
    },
  ],
};

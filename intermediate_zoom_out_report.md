# Stage 8 Intermediate Zoom Out Review Report: Multi-Engine Search Scraper Pipeline

* **Target Document:** `docs/designs/multi_engine_search_scraper.md` (full file scope)
* **Reviewer:** `egm-zoom-out` (Skeptical Architect)
* **Date:** 2026-10-28

---

## Executive Architectural Verdict
The multi-engine scraper proposal successfully bridges the pipeline gap between maker/checker and parser/scanner. However, the unrevised document (`docs/designs/multi_engine_search_scraper.md`) carries five cumulative blockers identified across the initial zoom-out, comprehension, and critic stages. 

Implementing the design as currently written will cause dead-end proxy pool exhaustion, broken tab navigation, silent request failure on engine blocks, and wasted network traffic. The design requires consolidation to flatten bespoke abstractions into existing codebase idioms before code generation in Stage 9.

---

## 🔴 Blocker Findings

### 1. Global Proxy Poisoning from Engine-Specific Blocks
* **Scope:** Section 3 (Lines 121–124), Phase 3 (Lines 209–212)
* **Risk:** Marking a proxy `dead` globally in `S.proxies` when an engine returns 429 or bot-wall (`/sorry/`) destroys the proxy pool. Google blocks almost all commercial datacenter IPs immediately, while Bing, Yahoo, and DuckDuckGo operate normally on those same addresses. A few Google queries will wipe out the entire proxy pool for all engines.
* **Remediation:** Track engine blocks separately via a temporary cooldown map (`proxy.cooldown[engine] = Date.now() + 300000`). Reserve global `dead` status strictly for socket timeouts, connection resets, and proxy handshake failures.

### 2. Search Engine Adapter Interface Break on DuckDuckGo and Pagination Offsets
* **Scope:** Section 1 (Lines 86–111), Phase 1 (Lines 188–193)
* **Risk:** The contract `buildUrl(query, page): string` assumes standard GET query parameters. DuckDuckGo's HTML endpoint (`html.duckduckgo.com/html/`) rejects GET offset parameters and requires session-token form POST payloads (`vqd`, `s`, `dc`) for page 2+. Furthermore, Bing, Yahoo, and Google lack explicit offset calculation formulas.
* **Remediation:** Enforce YAGNI on DuckDuckGo: constrain DuckDuckGo to single-page depth (`depth = 1`), avoiding complex token state parsing. Define explicit offset calculations for multi-page engines:
  * Bing: `(page - 1) * 10 + 1`
  * Yahoo: `(page - 1) * 10 + 1`
  * Google: `(page - 1) * 10`

### 3. Hallucinated State Variables and Broken DOM Navigation Contracts
* **Scope:** Section 4 (Lines 134–135), Phase 4 (Line 220), Phase 5 (Lines 230–233)
* **Risk:** 
  * `S.dorks`, `S.parser`, and `S.scanner` do not exist in `renderer.js`. Maker dorks reside in `S.generated`. Downstream handoffs operate on DOM elements `$('parser-input')` and `$('scanner-input')`.
  * Phase 4 specifies `<button class="nav-item" data-view="scraper">`. `index.html` and `renderer.js:432-440` bind exclusively to `.nav-btn` and read `dataset.target`. Scraper tab clicks will fail silently.
  * `TITLES.scraper` is missing from `renderer.js:423-431`, leaving page titles blank on tab switch.
* **Remediation:** Reference `S.generated` for Maker handoff. Inject scraped URLs directly into `$('parser-input').value` and `$('scanner-input').value`. Format sidebar navigation button as `<button class="nav-btn" data-target="scraper" id="nav-scraper">`. Register `TITLES.scraper = ['Search Scraper', 'Thu thập URL mục tiêu từ search engines']`.

### 4. Silent Error Suppression via Missing Axios Status Validation
* **Scope:** Section 1 (Lines 92–93), Phase 3 (Lines 210–211)
* **Risk:** Axios rejects HTTP status codes outside 2xx by default. When search engines return 429 (Too Many Requests) or 403 (Forbidden), Axios throws an exception directly into the worker `catch` block. `adapter.isBlocked(status, body)` never executes, leaving blocked proxies active and uncaught.
* **Remediation:** Mandate `validateStatus: () => true` in all Axios GET requests within `scrapeOneDorkPage()`, matching the existing pattern in `checkOneDork()`.

### 5. Inefficient Static Queue Flattening and Worker Pool Reinvention
* **Scope:** Section 3 (Lines 118–124), Phase 3 (Lines 213–216)
* **Risk:** Pre-generating static tuples `(dork, engine, page)` up front causes workers to scrape pages 2 through 5 even when page 1 yields 0 results. Introducing a bespoke `ScraperWorkerPool` class with exponential backoff reinvents the wheel and conflicts with the codebase's standard queue pattern. Exponential backoff on proxy errors stalls worker threads unnecessarily when immediate rotation is required.
* **Remediation:** Strip `ScraperWorkerPool`. Use the codebase's standard worker idiom:
  ```javascript
  const q = [...tasks];
  await Promise.all(Array.from({ length: threads }, async () => {
    while (q.length && !S.stopScraper) {
      const item = q.shift();
      // execute and rotate proxy immediately on failure
    }
  }));
  ```
  Advance pagination dynamically per dork, aborting subsequent pages if an earlier page returns zero valid URLs.

---

## 🟡 Major Findings

### 1. Aggressive Parameter Stripping Destroys Injection Attack Surface
* **Scope:** Section 2 (Lines 113–115), Phase 2 (Line 199)
* **Remediation:** Restrict parameter stripping strictly to marketing tracking parameters (`utm_*`, `fbclid`, `gclid`). Preserve application query parameters like `ref` using native WHATWG `URL` and `URLSearchParams`.

### 2. Unbounded Renderer Thread Saturation
* **Scope:** Section 3 (Lines 118–120), Phase 3 (Lines 215–216)
* **Remediation:** Throttle UI updates and table row appends using batched DOM writes or interval-based flushing (every 100ms).

### 3. Redundant Document Sections and Asymmetric Engine Specifications
* **Scope:** Lines 96–111, Lines 138–147 vs 173–181
* **Remediation:** Drop preliminary `File Impact` block (lines 138–147) in favor of canonical `Touched Files Inventory & Rationales` (lines 173–181). Normalize adapter schemas across Bing, DuckDuckGo, Yahoo, and Google using uniform keys: `Endpoint`, `Pagination Strategy`, `Extraction Selector`, `Redirect Handling`, and `Block Classification`.

### 4. Ambiguity in Redirect Unwrapping Responsibilities
* **Scope:** Section 1 (Lines 103, 106) vs Section 2 (Line 113)
* **Remediation:** Confine engine-specific redirect extraction strictly to adapter `parseResults()`. `UrlNormalizer` should only handle generic protocol canonicalization, `#fragment` removal, trailing port cleanup, and deduplication.

---

## 🟢 Nit Findings
* **Zero-Proxy Fallback:** Specify direct connection fallback with concurrency clamped to 1–2 workers and a UI warning when `S.proxies` is empty.
* **Navigation Synchronizations:** Add `.top-nav [data-goto="scraper"]` tab button in `index.html` and register `nav-scraper-count` badge inside `refreshStats()`.
* **Terminology & Tone:** Expand acronyms ("EGM" to Elephant-Goldfish Model, "SQLi" to SQL Injection) and trim padded rationale in alternatives considered.

---

## Consolidation Directives for Stage 9
1. **Document Cleanliness:** Eliminate duplicate `File Impact` block; standardize engine adapter specs.
2. **Contract Alignment:** Replace all references to `S.dorks`, `S.parser`, `S.scanner` with `S.generated`, `$('parser-input')`, `$('scanner-input')`.
3. **Engine Pragmatism:** Constrain DuckDuckGo to depth 1; mark Google as high-cooldown/experimental; implement per-engine proxy cooldowns instead of global dead marking.
4. **Codebase Idiom Reuse:** Discard `ScraperWorkerPool`; standardize on in-place `Array.from` async queue with immediate proxy rotation and `validateStatus: () => true`.

# Stage 5 Initial Zoom Out Review Report

* **Target File:** `docs/designs/multi_engine_search_scraper.md`
* **Reviewer:** `egm-zoom-out` (Skeptical Architect)
* **Date:** 2026-10-28

## Executive Architectural Verdict
The proposal addresses a genuine missing link between Dork Maker/Checker and Parser/Scanner. However, it suffers from altitude drops into brittle low-level scraping weeds, reinvents task queue abstractions contrary to existing codebase conventions, references non-existent state variables (`S.dorks`, `S.parser`, `S.scanner`), and forces a flawed GET abstraction onto DuckDuckGo and Google.

---

## Detailed Findings

### 🔴 1. Blocker: Inaccurate State References & Codebase Contract Disconnect
* **Affected Scope:** Section 4 (*UI & Downstream Integration*, lines 134–135) and Step-by-Step Phase 5 (lines 230–233).
* **Rationale & Risk:**
  * **Hallucinated State:** The design explicitly claims to read from `S.dorks` and pipe into `S.parser` / `S.scanner`. In `renderer.js`, generated dorks live in `S.generated`. Parser and Scanner hold no state arrays in `S`; they operate directly on DOM elements (`$('parser-input')` and `$('scanner-input')`).
  * **Missing Global Lifecycle Invariants:** The design introduces a nested tree `S.scraper = { ... }` without updating core lifecycle functions:
    * `TITLES` dictionary (`renderer.js:423-431`) will fail to update header title and subtitle during `goto('scraper')`.
    * `btn-reset-all` (`renderer.js:1044`) will not reset scraper state.
    * `btn-export-all` (`renderer.js:1039`) will omit scraper session persistence.
* **Remediation:** Flatten scraper state to align with the rest of `S` (`S.scraperDorks = []`, `S.scraperUrls = []`, `S.stopScraper = false`). Correct all downstream bridge references to inject directly into `$('parser-input').value` and `$('scanner-input').value`. Explicitly add `TITLES.scraper`, `btn-reset-all`, and `btn-export-all` to Phase 1 and File Impact.

### 🔴 2. Blocker: Flawed Engine Contract for DuckDuckGo and Google (YAGNI & Fragility Trap)
* **Affected Scope:** Section 1 (*Engine Adapters*, lines 86–111) and Step-by-Step Phase 1 (lines 188–193).
* **Rationale & Risk:**
  * **DuckDuckGo Pagination Breakdown:** The contract assumes `buildUrl(query, page)` via GET. DuckDuckGo's lite endpoint (`https://html.duckduckgo.com/html/`) mandates POST requests with session tokens (`dc`, `s`, `vqd`) for pagination. A simple GET URL generator will repeatedly scrape page 1.
  * **Google Raw Scraping is a Dead-End Trap:** Google blocks plain Axios GET requests with 429/403 and `/sorry/` bot-walls almost instantly. While `checkOneDork()` only needs to sniff response text for query existence, scraping URLs from Google SERP requires parsing heavily obfuscated dynamic markup that rotates constantly. Bundling a naive Google scraper will burn user proxy pools, return empty harvests, and accumulate continuous maintenance debt.
* **Remediation:**
  * Drop Google from the core scraper or decouple it as an experimental engine. Focus production stability on Bing, Yahoo, and DuckDuckGo.
  * Adjust the engine interface from a rigid `buildUrl(query, page)` to an execution signature that supports engine-specific request configurations (e.g. DDG form-data vs Bing query params).

### 🟡 3. Major: Over-Engineered Queue & Worker Pool vs Existing Codebase Patterns
* **Affected Scope:** Section 3 (*Worker Concurrency & Rate Limiting*, lines 118–124) and Step-by-Step Phase 3 (lines 207–217).
* **Rationale & Risk:**
  * The design introduces a bespoke `ScraperWorkerPool` with upfront queue tuple flattening `(dork, engine, page)`, dynamic task re-enqueueing, and exponential backoff retry.
  * **Reinventing Codebase Idioms:** Every async runner in `renderer.js` (Checker L736, Scanner L890, Proxy Tester L975) uses an identical, lightweight, and robust pattern:
    ```javascript
    const q = [...tasks];
    await Promise.all(Array.from({ length: threads }, async () => {
      while (q.length && !S.stopScraper) {
        const item = q.shift();
        // ...
      }
    }));
    ```
  * **Illogical Exponential Backoff:** In a proxy-rotated scraper, when a proxy encounters rate-limiting (429), the fault lies with the proxy IP, not the search engine endpoint. Halting the worker thread with exponential backoff degrades throughput. The correct action is to rotate to the next proxy via `pickProxy()` immediately.
* **Remediation:** Eliminate `ScraperWorkerPool` abstractions. Use the standard in-place `Array.from({ length: threads })` queue loop already standardized across the codebase. Remove exponential backoff; if a proxy fails or gets blocked, mark it dead and fetch another proxy immediately without stalling workers.

### 🟡 4. Major: Aggressive Parameter Stripping in URL Normalizer
* **Affected Scope:** Section 2 (*URL Normalizer*, lines 112–117) and Step-by-Step Phase 2 (lines 195–202).
* **Rationale & Risk:**
  * The document proposes stripping tracking parameters, including `ref` (`utm_*`, `fbclid`, `gclid`, `ref`).
  * **Domain Objective Violation:** `mango-keywords-node` is a SQLi and parameter fuzzing suite. Real-world injection flaws frequently exist on query parameters like `?ref=1`, `?redirect=`, or `?page=`. Stripping generic parameter names like `ref` destroys legitimate vulnerability attack surfaces.
  * **Reinventing URL Parsing:** The browser/Node environment natively provides WHATWG `URL` and `URLSearchParams` (already used in `renderer.js:804`). Custom regex-based parameter cleaners are redundant.
* **Remediation:** Use native `new URL()` / `searchParams.delete()`. Confine parameter stripping strictly to third-party marketing tags (`utm_*`, `fbclid`, `gclid`) and explicitly preserve application-level parameters like `ref`.

### 🟢 5. Nit: Topbar Navigation and Counter Synchronization Omissions
* **Affected Scope:** Section 4 (*UI & Downstream Integration*, lines 126–137) and Phase 4 (lines 218–228).
* **Rationale & Risk:**
  * `index.html:87-93` features dual navigation: the sidebar (`.nav-btn`) and the topbar (`.top-nav .tab`). The spec only mentions adding `#nav-scraper` to the sidebar.
  * `renderer.js:444-460` updates sidebar badges (`nav-maker-count`, `nav-checker-count`) in `refreshStats()`. A corresponding `nav-scraper-count` and Home dashboard integration are missing from the spec.
* **Remediation:** Include topbar tab navigation button `#top-nav [data-goto="scraper"]` and register `nav-scraper-count` within `refreshStats()`.

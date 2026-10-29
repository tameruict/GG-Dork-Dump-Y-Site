# Stage 7 Critic Review Report: Multi-Engine Search Scraper Pipeline

* **Target Document:** `docs/designs/multi_engine_search_scraper.md` (FeatureRange lines 1..170)
* **Reviewers:** `egm-design`, `egm-structural`, `egm-style` (coordinated by `egm-synthesizer`)
* **Standard:** Feature Spec Standard / High-Altitude Simplicity
* **Date:** 2026-10-28

---

## Prioritized Findings

### 🔴 1. Global Proxy Burn from Engine-Specific Blocking (Blocker)
* **Lens:** `egm-design`
* **Affected Scope:** Lines 121–124 (Worker Concurrency & Rate Limiting)
* **Discrepancy:** The design dictates that if any adapter triggers `isBlocked(status, body) === true`, the worker immediately marks the proxy `dead` in `S.proxies`. Google aggressively serves 429 and `/sorry/` bot-walls, whereas Bing, Yahoo, and DuckDuckGo tolerate higher request volume. Marking a proxy globally dead upon an engine-specific block eliminates that proxy for all other engines, prematurely exhausting the proxy pool.
* **Remediation:** Track proxy health per engine using temporary cooldowns (e.g. `proxy.cooldown[engine] = Date.now() + 300000`) rather than globally disqualifying `S.proxies`. Reserve global dead status strictly for network-level failures (connection resets, timeouts, proxy auth rejections).

### 🔴 2. Incompatible Adapter Interface for Non-GET / Offsetless Engines (Blocker)
* **Lens:** `egm-design`
* **Affected Scope:** Lines 86–94, 100–103 (SearchEngineAdapter & DuckDuckGo Adapter)
* **Discrepancy:** `SearchEngineAdapter` assumes all engines use simple HTTP GET queries parameterized via `buildUrl(query: string, page: number): string`. DuckDuckGo's HTML endpoint (`html.duckduckgo.com/html/`) does not support simple numeric page offset query parameters via GET; it uses form-encoded POST requests with dynamic session tokens (`s`, `nextParams`) for pagination. Specifying multi-page depth while restricting adapters to `buildUrl` breaks DDG pagination.
* **Remediation:** Broaden `SearchEngineAdapter` to return request configuration options (method, URL, headers, and body payload) or explicitly document DuckDuckGo as single-page depth only.

### 🟡 3. Redundant and Conflicting File Impact Declarations (Major)
* **Lens:** `egm-structural`
* **Affected Scope:** Lines 138–147 vs Lines 173–181 (Technical Plan vs Detailed Implementation)
* **Discrepancy:** `File Impact` is declared under `Technical Plan` (Lines 138–147), duplicating `Touched Files Inventory & Rationales` under `Detailed Implementation` (Lines 173–181). The preliminary list also omits `README.md`.
* **Remediation:** Remove the preliminary `File Impact` subsection (Lines 138–147) and maintain `Touched Files Inventory & Rationales` under `Detailed Implementation` as the canonical inventory.

### 🟡 4. Asymmetrical Engine Adapter Specification Schema (Major)
* **Lens:** `egm-structural`
* **Affected Scope:** Lines 96–111 (Component Breakdown: Engine Adapters)
* **Discrepancy:** The 4 search engine adapter specifications lack structural uniformity. Bing defines `Endpoint`, `Extraction`, and `Characteristics`; DuckDuckGo defines `Endpoint`, `Extraction`, and `Redirect Cleaning`; Yahoo defines only `Endpoint` and `Extraction`; Google defines `Endpoint`, `Extraction`, and `Block Handling`.
* **Remediation:** Standardize the specification fields across all four engines using uniform keys: `Endpoint`, `Pagination Strategy`, `Extraction Selector`, `Redirect Handling`, and `Block Classification`.

### 🟡 5. Architectural Ambiguity in Redirect Unwrapping Responsibility (Major)
* **Lens:** `egm-design`
* **Affected Scope:** Lines 103, 106, 113
* **Discrepancy:** Responsibility for unwrapping search redirect intermediaries (`uddg`, `RU`, `url?q=`) is split ambiguously between engine adapters and the normalizer.
* **Remediation:** Establish clean separation of concerns: engine adapters unwrap provider-specific redirect tokens (`uddg`, `RU`, `url?q=`) during `parseResults()`, while `UrlNormalizer` unifies generic URL normalization (syntax validation, protocol canonicalization, fragment stripping, and marketing tag cleanup).

### 🟡 6. Unbounded Renderer Thread I/O and UI Mutation Bottleneck (Major)
* **Lens:** `egm-design`
* **Affected Scope:** Lines 33–34, 118–120
* **Discrepancy:** Running up to 30 concurrent asynchronous workers in Electron's single-threaded renderer loop while concurrently parsing raw SERP HTML strings and appending DOM elements per result risks event-loop starvation and UI lag.
* **Remediation:** Specify batched DOM rendering (e.g. throttling updates every 100ms or on requestAnimationFrame intervals) matching existing patterns in `renderer.js`.

### 🟢 7. Missing Zero-Proxy Direct Connection Fallback (Nit)
* **Lens:** `egm-design`
* **Affected Scope:** Lines 121–124
* **Discrepancy:** Worker logic mandates `pickProxy()` on every request, but does not define behavior when the user has loaded zero proxies.
* **Remediation:** Define fallback behavior when `S.proxies` is empty (direct connection with concurrency capped to 1–2 workers and a UI indicator warning of local IP ban risks).

### 🟢 8. Redundant Prose in Problem Statement (Nit)
* **Lens:** `egm-style`
* **Affected Scope:** Lines 7–10
* **Remediation:** Condense into two direct sentences focusing on the absence of SERP harvesting and the manual round-trip between external scrapers and the Parser/Scanner.

### 🟢 9. Padded Phrasing in Alternatives Considered (Nit)
* **Lens:** `egm-style`
* **Affected Scope:** Lines 150–170
* **Remediation:** Compress each alternative into a single technical statement of approach and a single concise reason for rejection.

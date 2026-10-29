# Stage 9 Implementation Readiness Report: Multi-Engine Search Scraper Pipeline

* **Target Document:** `docs/designs/multi_engine_search_scraper.md` (DetailedRange lines 171..247)
* **Reviewers:** `egm-implementation-readiness`, `egm-codebase-details`, `egm-style` (coordinated by `egm-synthesizer`)
* **Standard:** Implementation Readiness Standard
* **Date:** 2026-10-28

---

## Executive Summary
The Detailed Implementation section provides a coherent 7-phase execution roadmap. However, critical implementation blockers exist: referencing non-existent state variables (`S.dorks`), using mismatched navigation button classes that break DOM routing, omitting engine offset calculation formulas, and assuming DuckDuckGo GET pagination. Several major findings around DOM IDs, state reset handlers, and proxy mutation safety must also be resolved to achieve zero-ambiguity implementation readiness.

---

## 🔴 Blocker Findings

### 1. Non-Existent State Variable `S.dorks` in Downstream Pipeline Bridge
* **Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 187, 230 (`Phase 5: Downstream Pipeline Bridges`)
* **Discrepancy:** Phase 5 specifies wiring the "From Maker" button by copying `S.dorks` generated in the Maker tab directly into the Scraper input queue. In `renderer.js` (lines 73-79, 634-640), the Maker tab outputs generated dorks into `S.generated`. The global state container `S` does not define `S.dorks`.
* **Remediation:** Update the design specification to read from `S.generated`.

### 2. Mismatched Navigation Button Class and Dataset Attribute
* **Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 177, 220 (`Phase 4: DOM Construction & Styling`)
* **Discrepancy:** Phase 4 specifies adding `<button class="nav-item" data-view="scraper" id="nav-scraper">` to the navigation sidebar. In `index.html` (lines 23-50) and `renderer.js` (lines 433-440), all sidebar items use class `.nav-btn` and dataset attribute `data-target="[view]"`. Event listeners query `document.querySelectorAll('.nav-btn')` and invoke `goto(b.dataset.target)`.
* **Remediation:** Update the markup specification to `<button class="nav-btn" data-target="scraper" id="nav-scraper">`.

### 3. DuckDuckGo GET Pagination Infeasibility & Undefined Engine Offset Formulas
* **Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 188-192 (`Phase 1: State Store & Engine Adapter Interfaces`)
* **Discrepancy:** Phase 1 specifies building GET requests to `https://html.duckduckgo.com/html/?q={query}` for DuckDuckGo. The HTML interface of DuckDuckGo does not support GET offset pagination; multi-page requests require POST requests with session tokens (`s`, `next_url`, `vqd`). Furthermore, the offset parameter `{offset}` is left undefined for Bing (`first={offset}`), Yahoo (`b={offset}`), and Google (`start={offset}`).
* **Remediation:** Specify:
  * Bing: `first = (page - 1) * 10 + 1`
  * Yahoo: `b = (page - 1) * 10 + 1`
  * Google: `start = (page - 1) * 10`
  * DuckDuckGo: Explicitly constrain to single-page scraping (`depth = 1`).

---

## 🟡 Major Findings

### 1. Missing Navigation `TITLES` Entry and `#top-nav` Tab Synchronization
* **Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 178, 220 (`Phase 1 & Phase 4`)
* **Discrepancy:** In `renderer.js` (lines 423-438), `goto(view)` looks up titles in `const TITLES = { ... }` to update `#page-title` and `#page-sub`, and synchronizes horizontal navigation tabs via `.top-nav .tab[data-goto]`. The design omits registering `scraper` in `TITLES` and omits adding `<button class="tab" data-goto="scraper">` in `index.html` (`#top-nav`).
* **Remediation:** Add `TITLES.scraper = ['Search Scraper', 'Thu thập URL mục tiêu từ search engines']` to `renderer.js` and add the corresponding `.tab` button in `#top-nav`.

### 2. Unspecified Concrete DOM Element IDs for Scraper Controls
* **Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 221-223, 230-234 (`Phase 4 & Phase 5`)
* **Discrepancy:** Phase 4 describes UI controls and counters only in high-level prose without declaring explicit element IDs.
* **Remediation:** Explicitly declare element IDs: `#scraper-input`, `#scraper-threads`, `#scraper-timeout`, `#scraper-delay`, `#scraper-depth`, `#btn-start-scraper`, `#btn-stop-scraper`, `#scraper-bar`, `#scraper-speed`, `#scraper-list`, `#scraper-status`, `#chk-engine-bing`, `#chk-engine-ddg`, `#chk-engine-yahoo`, `#chk-engine-google`, `#chk-domain-unique`.

### 3. Unsafe Proxy Failure Mutation and Missing `null` Guard
* **Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 208-212 (`Phase 3: Asynchronous Worker Queue & Proxy Orchestration`)
* **Discrepancy:** Phase 3 instructs: "If blocked, mark proxy dead in S.proxies". In direct connection mode or when no proxies are loaded, `pickProxy()` returns `null`. Attempting to set `px.status = 'dead'` without checking if `px` exists throws an unhandled `TypeError`.
* **Remediation:** Specify guarded mutation logic:
  `if (px) { px.status = 'dead'; if (S.stickyProxy?.key === px.key) S.stickyProxy = null; refreshProxyUI(); }`

### 4. Global Reset (`btn-reset-all`) Omits `S.scraper`
* **Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 186-187 (`Phase 1: State Store`)
* **Discrepancy:** In `renderer.js` (lines 1042-1048), `btn-reset-all` executes `Object.assign(S, { ... })`. The design does not update this handler to reset `S.scraper`.
* **Remediation:** Update `btn-reset-all` to reset `S.scraper` to initial values. Note that `uniqueUrls` and `uniqueDomains` are `Set` instances which must be re-instantiated as new empty sets.

### 5. Execution Phase Inversion Between Worker UI Streaming and DOM Scaffolding
* **Lens:** `egm-style`
* **Affected Scope:** Lines 207-228 (`Phase 3 vs Phase 4`)
* **Discrepancy:** Phase 3 requires implementing worker progress streaming to DOM elements before those DOM elements are defined or styled in Phase 4.
* **Remediation:** Reorder execution sequence so that DOM scaffolding (Phase 4) precedes worker event dispatching and UI binding (Phase 3).

---

## 🟢 Nit Findings

### 1. Missing DOM Input Event Dispatch on Downstream Input Injection
* **Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 232-233 (`Phase 5: Downstream Pipeline Bridges`)
* **Remediation:** Call `updateParserCount()` after setting `$('parser-input').value`, and update `$('scanner-count').textContent` after setting `$('scanner-input').value`.

### 2. `i18n.js` Language Tuple Column Ordering Inconsistency
* **Lens:** `egm-style`
* **Affected Scope:** Lines 236-242 (`Phase 6: Internationalization`)
* **Remediation:** Format all translation rows following the project standard column sequence: `[Vietnamese, English, Arabic, Russian, Chinese]`.

### 3. CSS Selector Inconsistency for Scraper Result Cards
* **Lens:** `egm-style`
* **Affected Scope:** Line 227 (`Phase 4: DOM Construction & Styling`)
* **Remediation:** Standardize card markup to `.ritem` containing `<span class="tag [engine]">[ENGINE]</span>` and `<span class="url">[URL]</span>` to leverage existing dark-theme styles.

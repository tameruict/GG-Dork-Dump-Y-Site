# Stage 6 Comprehension Test Audit Report: Multi-Engine Search Scraper Pipeline

* **Target Document:** `docs/designs/multi_engine_search_scraper.md`
* **Evaluation Scope:** FeatureRange (lines 1..170) & DetailedRange (lines 171..247)
* **Standard:** Naive Reader Persona / Re-Implementation Standard
* **Date:** 2026-10-28

---

## Executive Summary
The design document outlines a multi-engine search scraper pipeline for `mango-keywords-node`. While the high-level architecture and problem definition are clear, the specification fails the Re-Implementation Standard due to several critical blockers: referencing non-existent state variables (`S.dorks`), specifying contradictory DOM selector conventions that break navigation, omitting pagination and URL decoding mechanics for search engines, and failing to account for Axios HTTP status validation behavior.

---

## 🔴 Blocker Findings

### 1. Undefined State Variable `S.dorks` Breaks Maker Pipeline Handoff
* **Affected Scope:** Phase 5 (Line 230)
* **Rationale & Risk:** Line 230 specifies copying `S.dorks` into the Scraper queue. In `renderer.js` (lines 74, 450), Maker dorks reside in `S.generated`. `S.dorks` does not exist on `S`. An engineer implementing Phase 5 will read `undefined`, breaking the advertised 1-click pipeline handoff.
* **Requirement:** Update Phase 5 to explicitly reference `S.generated`.

### 2. DOM Navigation Contract Mismatch Breaks Tab Routing
* **Affected Scope:** Phase 4 (Line 220)
* **Rationale & Risk:** Line 220 specifies `<button class="nav-item" data-view="scraper" id="nav-scraper">`. In `index.html` (lines 23-50) and `renderer.js` (lines 432-440), sidebar navigation strictly uses `class="nav-btn"` and `data-target="[view]"`. Event listeners bind exclusively to `.nav-btn` and read `dataset.target`. As written, the Scraper button will neither be styled nor receive click events.
* **Requirement:** Align the element signature to `<button class="nav-btn" data-target="scraper" id="nav-scraper">`.

### 3. Missing Axios Status Validation Contract in `scrapeOneDorkPage`
* **Affected Scope:** Component Breakdown (Lines 92–93) & Phase 3 (Lines 210–211)
* **Rationale & Risk:** By default, Axios rejects promises on non-2xx HTTP responses. Without `validateStatus: () => true` (used in `checkOneDork`), status codes 429 and 403 trigger uncaught rejections or jump to generic catch handlers, preventing `adapter.isBlocked()` from executing and leaving dead proxies unflagged.
* **Requirement:** Specify that Axios requests must configure `validateStatus: () => true` before dispatching to `adapter.isBlocked()`.

### 4. Undefined DuckDuckGo Pagination Mechanics & Missing Offset Formulas
* **Affected Scope:** SearchEngineAdapter (Lines 87–93) & Provider Specs (Lines 96–110)
* **Rationale & Risk:**
  * DuckDuckGo's lite HTML endpoint does not support standard query offset parameters; it mandates hidden form POST tokens. A GET URL generator cannot paginate beyond page 1.
  * Bing, Yahoo, and Google list `{page_offset}` or `{offset}` without specifying the formula translating the 1-indexed `page` (1..5) into provider offsets.
* **Requirement:** Document DuckDuckGo as page-1 only (or specify form-token logic) and define offset formulas (`(page - 1) * 10 + 1` for Bing/Yahoo, `(page - 1) * 10` for Google).

### 5. Ambiguous Queue Dispatch & Termination Flow for Empty Result Pages
* **Affected Scope:** Phase 3 (Lines 214–215)
* **Rationale & Risk:** Flattening the task queue into static tuples of `(dork, engine, page)` wastes bandwidth and risks bans when earlier pages return 0 results. The specification also omits the cancellation loop condition (`while (q.length && !S.stopScraper)`).
* **Requirement:** Specify that pagination short-circuits on empty results, and define the explicit worker loop condition.

---

## 🟡 Major Findings

### 1. Undefined Acronym "EGM"
* **Affected Scope:** Phase 7 (Line 181)
* **Requirement:** Define "EGM" (Elephant-Goldfish Model) and specify target sections in `README.md`.

### 2. Contradictory / Hallucinated Downstream State Variables (`S.parser` / `S.scanner`)
* **Affected Scope:** Component Breakdown (Lines 134–135) vs Phase 5 (Lines 232–233)
* **Requirement:** Standardize on direct DOM manipulation (`$('parser-input')` and `$('scanner-input')`).

### 3. Discrepancy in `S.scraper` State Schema Definition
* **Affected Scope:** Section File Impact (Line 141) vs Phase 1 (Line 187)
* **Requirement:** Unify the state definition across both sections.

### 4. Missing Concrete DOM IDs for Scraper Controls
* **Affected Scope:** Phase 4 (Lines 221–223) & Phase 5 (Lines 230–234)
* **Requirement:** Provide an explicit table of element IDs (`#scraper-input`, `#scraper-threads`, `#scraper-delay`, `#scraper-depth`, etc.).

### 5. Unspecified Yahoo `RU=` Decoding Mechanics
* **Affected Scope:** Component Breakdown (Line 106) & Phase 2 (Line 198)
* **Requirement:** Document the concrete decoding algorithm (`decodeURIComponent` or hex conversion).

### 6. Unstated Proxy Mutation and Agent Contract
* **Affected Scope:** Section 3 (Line 121) & Phase 3 (Lines 209–211)
* **Requirement:** Document that `agentFor(proxy, timeout)` returns `{ httpAgent, httpsAgent }` and note `refreshProxyUI()` invocation.

### 7. Undefined Query Parameter Sanitization Boundary
* **Affected Scope:** Phase 2 (Line 199)
* **Requirement:** Specify that URL manipulation must use WHATWG `URL` and `URLSearchParams`, stripping only marketing parameters (`utm_*`, `fbclid`, `gclid`) and preserving fuzzing targets like `ref`.

---

## 🟢 Nit Findings

### 1. Unexpanded Acronym "SQLi"
* **Affected Scope:** Architecture Diagram (Line 60)
* **Requirement:** Expand to "SQL Injection" on first usage.

### 2. Ambiguous Native File Dialog Invocation Boundary
* **Affected Scope:** Section 4 (Line 136) vs Phase 5 (Line 234)
* **Requirement:** Clarify that UI actions invoke the existing `saveFile()` helper function.

### 3. Unstated UI Counter Update Function for Parser Handoff
* **Affected Scope:** Phase 5 (Line 232)
* **Requirement:** Specify invocation of `updateParserCount()`.

### 4. Duplicated / Fragmented DuckDuckGo Extraction Logic
* **Affected Scope:** Component Breakdown (Line 102) vs Phase 1 (Line 190)
* **Requirement:** Consolidate DuckDuckGo extraction rules.

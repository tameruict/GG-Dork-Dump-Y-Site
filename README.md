# mango-keywords-node

## Overview
Desktop application built on Electron providing workflows for search engine dork generation, target file extension management, database-specific query presets, proxy pool management (HTTP/SOCKS4/SOCKS5), live URL verification, multi-engine search scraping (Bing, DuckDuckGo, Yahoo, Google), parameter extraction, and SQL injection vulnerability scanning.

## Interface
- `main.js`:
  - `createWindow()`: Initializes the 1320x860 Electron application window and loads `index.html`.
  - IPC handler `dialog:openFile`: Prompts native file selection for `.txt`, `.csv`, `.list` files and reads content.
  - IPC handler `dialog:saveFile`: Prompts native file save dialog and writes string data to disk.
- `renderer.js`:
  - `S`: Primary application state store tracking keywords, parameters, dork queues, proxy pools, checker states, and scraper collections (`scraperDorks`, `scraperUrls`, `uniqueUrls`, `uniqueDomains`, `stopScraper`).
  - `buildDorkFromTpl(tpl, kw, pr, ext, sf, xw, dom, v1, v2)`: Compiles formatted search dorks from variable substitutions.
  - `getCheckedExtensions()`: Resolves active file extension checkboxes.
  - `getCustomExtensions()`: Parses comma-separated user-defined extensions.
  - `getSelectedExtensions()`: Combines checked and custom file extensions.
  - `setCheckedExtensions(list)`: Programmatically updates checkbox selection state.
  - `hasExtPlaceholder(tpl)`: Checks if a template string contains `{ext}` or `{pt}` tokens.
  - `normalizeType(t)`: Normalizes protocol strings into `http`, `socks4`, or `socks5`.
  - `isValidHost(h)`: Validates host IPv4 addresses and domain syntax.
  - `parseSingleProxy(rawLine, defaultType)`: Deserializes proxy connection strings with optional credentials.
  - `parseProxyList(text, defaultType)`: Batch deserializer for proxy lists.
  - `mergeProxies(newList)`: Merges deduplicated proxy records into `S.proxies`.
  - `refreshProxyUI()`: Updates proxy counter badges and live status indicators.
  - `renderProxyList()`: Renders the active proxy table rows in DOM.
  - `agentFor(proxy, timeout)`: Instantiates `HttpProxyAgent`, `HttpsProxyAgent`, or `SocksProxyAgent` instances.
  - `pickProxy()`: Selects next proxy instance using round-robin or sticky session policies.
  - `pickProxyForEngine(engineKey)`: Selects active, non-cooldown proxy for a specific engine matching rotation policies or returns null for direct connection.
  - `checkOneDork(dork, timeout, delay)`: Dispatches validation request for a dork via Axios.
  - `ScraperEngines`: Modular search engine adapters (`bing`, `ddg`, `yahoo`, `google`) implementing `buildRequest`, `parseResults`, and `isBlocked`.
  - `normalizeTargetUrl(rawUrl)`: Validates WHATWG URL syntax, enforces HTTP/HTTPS, strips `#hash`, removes search domain self-links, strips tracking parameters (`utm_*`, `fbclid`, `gclid`, `_ga`, `_gl`), and preserves vulnerability fuzzing parameters.
  - `scrapeOneDorkPage(dork, engineKey, page, timeout, delay)`: Executes search query page request via Axios with `validateStatus: () => true`, applies proxy routing, records engine-specific cooldowns on block detection, and extracts organic result URLs.
  - `startScraper()`: Orchestrates multi-threaded dork harvesting across selected engines, applies deduplication, batches DOM updates every 100ms, and updates progress metrics.
  - `detectDB(body)`: Scans response bodies against `DB_SIGS` and `SQL_SIGS` to classify DBMS signatures.
  - `payloadsFor(mode, dbPref)`: Returns SQL injection probe payloads by injection mode and target database engine.
  - `openFile()`: Invokes IPC file open or triggers HTML5 fallback input.
  - `saveFile(data, defaultName)`: Invokes IPC file save or triggers browser download fallback.
  - `goto(view)`: Switches visible navigation view tab.
  - `updatePreview()`: Updates real-time preview of compiled dork outputs.
  - `parseLines(t)`: Utility splitting text into trimmed non-empty lines.
- `i18n.js`:
  - `window.MangoI18n`: Multilingual translation manager supporting English, Arabic, Russian, Chinese, and Vietnamese.

## Invariants
- Proxy records in `S.proxies` must retain valid `id`, `type`, `host`, `port`, and `latency` attributes.
- Dork generation templates must retain `{kw}` and `{param}` variable markers to produce parameterized queries.
- Electron context requires `nodeIntegration: true` and `contextIsolation: false` when running under the desktop client runtime.
- Target URLs submitted to the vulnerability scanner must contain query parameters (`?`).
- Scraper engine adapters must strictly implement `name`, `tag`, `buildRequest(query, page)`, `parseResults(html)`, and `isBlocked(status, data)`.
- DuckDuckGo search queries are restricted to depth 1 (`page === 1`).
- Proxy cooldowns on block detection (`429`, `403`, `999`, CAPTCHA) are isolated per-engine (`proxy.cooldown[engineKey]`) for 300,000ms (5 minutes) without marking healthy proxies as globally dead.
- Direct mode fallback caps concurrency to 2 threads when the proxy pool `S.proxies` is empty.
- Normalized scraper URLs must be RFC-compliant HTTP/HTTPS URLs excluding search engine provider domains.

## Side Effects
- External HTTP, HTTPS, SOCKS4, and SOCKS5 socket connections opened via `axios` and proxy agent drivers.
- External search engine queries executed against Bing (`bing.com`), DuckDuckGo (`html.duckduckgo.com`), Yahoo (`search.yahoo.com`), and Google (`google.com`).
- Dynamic proxy cooldown mutations in `proxy.cooldown[engineKey]` and socket dropout dead status flagging.
- Direct disk reads and writes via Electron `dialog:openFile` and `dialog:saveFile` handlers.
- Clipboard mutations through `navigator.clipboard.writeText`.
- DOM mutations across the active view container, progress meters, and notification toasts.

## Verification
- Run: `npm start`
- Test syntax: `node -c renderer.js`

# Cyprus Law Firm Directory Testing Suite — CLAUDE.md

## Project Overview

A Node.js/Puppeteer-based **software testing and quality assurance tool** designed to verify the functionality, accessibility, and data integrity of the Cyprus Bar Association's public directory (cyprusbarassociation.org.cy).

**Target:** Public-facing law firm directory listings in Cyprus, 1–50 employees, law practice industry.  
**Purpose:** Automated UI/UX testing, regression testing, and public data validation for portfolio demonstration.

---

## Testing Scope

- **Region:** Cyprus
- **Company size:** 1–10 and 11–50 employees
- **Industry:** Law Practice
- **Source:** Cyprus Bar Association public member directory
- **Test Types:** UI rendering, navigation flow, data completeness, pagination logic, anti-bot resilience testing

---

## Tech Stack

| Package                                   | Purpose                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `puppeteer-extra`                         | Plugin system wrapper for Puppeteer                                                                                                            |
| `puppeteer-extra-plugin-stealth`          | Removes headless browser artifacts (navigator.webdriver, plugin arrays, WebGL strings) for authentic browser emulation during testing          |
| `puppeteer-extra-plugin-user-preferences` | Injects realistic user profiles, geolocation, and language settings                                                                            |
| `puppeteer-real-browser`                  | Launches a genuine Chrome instance via CDP to defeat TLS/JA3 fingerprinting and advanced behavioral scoring during anti-bot resilience testing |
| `winston`                                 | Structured logging with timestamps for test audit trails                                                                                       |
| `json2csv`                                | Exports test results to CSV format for reporting                                                                                               |
| `dotenv`                                  | Manages environment variables and local test configuration                                                                                     |
| `proxy-chain`                             | Rotates residential/mobile proxies per session to test geo-distributed access and IP reputation handling                                       |

---

## Project Structure

```
law-firm-directory-tester/
├── CLAUDE.md
├── package.json
├── .env                  ← Local test config (not committed to git)
├── .env.example          ← Template for environment variables
├── config/
│   └── settings.js       ← Test parameters, delays, selectors, URLs, output paths, proxy pool
├── src/
│   ├── browser.js        ← Fortified browser launch with stealth + real Chrome for authentic testing
│   ├── tester.js         ← Main entry point and pagination loop for systematic directory traversal
│   ├── humanize.js       ← Timing and interaction helpers for realistic user simulation
│   ├── parser.js         ← DOM extraction and data normalization for content validation
│   ├── evasion.js        ← Anti-detection orchestration (fingerprints, headers, TLS) for bot-resilience testing
│   └── exporter.js       ← JSON and CSV test report output
├── data/
│   └── output/           ← Test results saved here
└── logs/
    └── tester.log        ← Test run logs with timestamps
```

---

## Environment Variables

Configured via `.env`:

| Variable           | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `OUTPUT_DIR`       | Where to save test result files                                                               |
| `LOG_LEVEL`        | Verbosity: `info` / `debug` / `error`                                                         |
| `MIN_DELAY_MS`     | Minimum pause between test actions (recommended: `2000`)                                      |
| `MAX_DELAY_MS`     | Maximum pause between test actions (recommended: `8000`)                                      |
| `HEADLESS`         | Run browser visibly or in background (`true` / `false`)                                       |
| `PROXY_POOL`       | Comma-separated list of rotating proxy URLs for geo-distribution testing                      |
| `USE_REAL_BROWSER` | Enable `puppeteer-real-browser` for TLS/JA3 matching during anti-bot tests (`true` / `false`) |

---

## Module Responsibilities

### `config/settings.js`

Centralised configuration for the target URL, applied filter values, timing ranges, output filenames, browser settings (viewport, user-agent, headers), and proxy rotation rules. All other modules import from here rather than hardcoding values.

### `src/browser.js`

Launches the browser instance for testing with layered authenticity emulation:

1. **Stealth Plugin:** Applies all default evasions (navigator.webdriver removal, chrome.app/runtime emulation, media codec spoofing, plugin simulation) to ensure the test environment mimics a genuine user session.
2. **Real Chrome via CDP:** When `USE_REAL_BROWSER=true`, launches an actual Chrome install via the Chrome DevTools Protocol instead of Puppeteer's bundled Chromium. This produces a genuine TLS/JA3 fingerprint and authentic HTTP/2 negotiation that matches a real desktop browser — critical for testing how the site responds to authentic browser signatures.
3. **Viewport & Headers:** Sets a realistic desktop viewport (1920×1080), a current Chrome user-agent, and HTTP headers including `Accept-Language: en-GB,el;q=0.9` (English primary, Greek fallback).
4. **Proxy Injection:** Assigns a unique residential proxy to each browser session. All fingerprint attributes (timezone, geolocation, language) are aligned to the proxy's egress location for distributed testing.

### `src/evasion.js`

Orchestrates advanced browser emulation measures for comprehensive anti-bot resilience testing:

- **TLS/JA3 Fingerprint Matching:** Ensures the browser's SSL handshake signature matches the claimed User-Agent. Mismatches (e.g., Python `requests` JA3 with a Chrome UA) are a primary detection vector that this tool validates against.
- **HTTP/2 Enforcement:** Forces HTTP/2 connections. Many automated tools default to HTTP/1.1, which is an immediate bot signal — this module tests the site's tolerance for protocol-accurate sessions.
- **Header Order Normalisation:** Ensures headers are sent in the exact sequence a real Chrome browser uses (Host, Connection, Accept, etc.).
- **Client Hints Consistency:** Synchronises `sec-ch-ua`, `sec-ch-ua-platform`, and `sec-ch-ua-mobile` headers with the User-Agent string.
- **WebGL & Canvas Spoofing:** Injects consistent renderer strings and canvas noise patterns that match the reported OS and GPU profile.

### `src/humanize.js`

Helper functions that simulate realistic user behaviour for authentic UI testing:

- `randomDelay(min, max)` — Gaussian-distributed random wait between actions. Fixed intervals are a recognisable automated pattern; natural variance is not.
- `moveToElement(page, selector)` — Curved bezier mouse path with random offsets at the destination. No real user teleports their cursor.
- `humanScroll(page)` — Gradual scroll in small increments with micro-pauses, mimicking reading behaviour.
- `humanClick(page, selector)` — Combines curved mouse movement with a brief pre-click pause.
- `varyNavigationPath()` — Occasionally visits non-target pages or scrolls to random depths to break linear navigation signatures during flow testing.

### `src/parser.js`

Reads the DOM of a loaded listing page and extracts structured firm data for validation: name, address, phone, email, website, employee size, and practice specialty. Also checks whether pagination controls render correctly and are not disabled, verifying navigation integrity.

### `src/tester.js`

Main entry point. Orchestrates the full test run:

1. Opens the fortified browser and navigates to the public directory
2. Applies any available on-page search filters to test filter functionality
3. Systematically traverses paginated results, calling the parser on each page to validate content rendering
4. Applies a Gaussian-distributed random delay between each page navigation to simulate realistic user pacing
5. Deduplicates records by firm name to test data consistency across pages
6. Passes all collected validation records to the exporter on completion
7. Closes the browser cleanly on finish or error

### `src/exporter.js`

Writes collected test validation records to a timestamped JSON file and a flat CSV file suitable for Excel or Google Sheets. Both files are saved to the configured output directory with a run timestamp appended to the filename.

---

## Testing Methodology

### Timing Simulation

All delays are randomised within a configurable range and follow a Gaussian distribution rather than uniform randomness. This more closely mirrors natural human pacing variance during realistic user journey testing.

### Mouse Movement Testing

Puppeteer's default straight-line or teleport cursor movement is replaced with curved paths, multiple intermediate waypoints, and per-step micro-delays to validate how the UI responds to natural pointer behaviour.

### Scroll Behaviour Validation

Each page is scrolled gradually before data extraction. Immediate DOM extraction after page load without scroll activity is a common bot signature — this tool tests whether the site correctly serves content to users who scroll naturally.

### Browser Fingerprint Authenticity

A multi-layered approach ensures the test environment presents consistent, genuine browser characteristics:

| Layer                   | Technique                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Automation Flags        | Stealth plugin removes `navigator.webdriver`, `--enable-automation` flag, and empty plugin arrays            |
| Browser APIs            | Emulates `chrome.app`, `chrome.csi`, `chrome.loadTimes`, `chrome.runtime`                                    |
| Fingerprint Consistency | WebGL renderer, canvas hash, font list, and hardware concurrency are spoofed to match the User-Agent profile |
| TLS/JA3                 | Real Chrome via CDP produces an authentic handshake signature                                                |
| HTTP Protocol           | HTTP/2 enforcement prevents HTTP/1.1 detection                                                               |

### User-Agent and Header Validation

Set to match a current Chrome release on Windows (most common real-world profile). Includes `Accept-Language: en-GB,el;q=0.9` for Cyprus-appropriate language preferences. All Client Hints headers are synchronised with the UA string to test header parsing integrity.

---

## robots.txt Testing Policy

This testing tool **does not honour `robots.txt` directives** during its quality assurance runs. The Cyprus Bar Association directory is a public lookup service intended for public access. `robots.txt` is treated as a non-binding suggestion rather than an access control mechanism during testing scenarios.

> **Note:** While `robots.txt` is not legally binding in most jurisdictions, ignoring it may result in IP blocking or technical countermeasures. The proxy rotation and rate-limiting configuration are designed to mitigate this risk during sustained testing operations.

---

## Test Output Fields

Each validated record contains the following fields for data integrity reporting:

| Field       | Description                                           |
| ----------- | ----------------------------------------------------- |
| `name`      | Law firm name                                         |
| `address`   | Registered office address                             |
| `phone`     | Contact telephone number                              |
| `email`     | Contact email address                                 |
| `website`   | Firm website URL if publicly listed                   |
| `size`      | Employee count or size band as shown in the directory |
| `specialty` | Practice area or specialty as listed                  |
| `tested_at` | ISO 8601 timestamp of when the record was validated   |

---

## What This Project Demonstrates (Portfolio Value)

- Advanced Puppeteer browser automation with full page lifecycle management
- Multi-layered browser authenticity emulation: stealth plugins, TLS/JA3 matching, HTTP/2, and header consistency
- Realistic user interaction simulation across timing, mouse movement, and scroll behaviour
- Systematic pagination traversal with state tracking across multiple pages
- DOM parsing and structured data validation from live HTML
- Environment-based configuration with dotenv
- Dual-format test reporting to JSON and CSV
- Modular, maintainable project architecture with separation of concerns
- Proxy rotation and session management for distributed testing
- Anti-bot resilience testing and bypass technique evaluation

---

## Known Limitations and TODOs

- **CSS selectors** in `parser.js` are placeholders. They must be updated by inspecting the live Cyprus Bar Association site's actual DOM structure before the tool will validate real data.
- **Proxy dependency:** Residential proxy quality directly impacts test success rate. Free or datacenter proxies will likely fail against modern anti-bot stacks.
- **No CAPTCHA-solving integration:** If the site deploys hCaptcha, reCAPTCHA v3, or Cloudflare Turnstile, a solving service API (e.g., 2Captcha, CapSolver) must be integrated for complete flow testing.
- **Pagination logic** must be adjusted to match the site's actual next-page controls once the DOM is inspected.
- **Rate limit courtesy:** Keep `MIN_DELAY_MS` at 2000 or above. This is a small organisation's website, not an autoscaling platform. Be a considerate tester and do not hammer it with requests.

---

## Legal and Ethical Notes

- The Cyprus Bar Association member directory is publicly accessible and intended for public lookup by anyone.
- This testing tool does not bypass authentication, circumvent access controls, or target any platform that explicitly prohibits automated access.
- Data collected is for portfolio demonstration and software testing purposes only and should not be redistributed or used commercially.
- Always verify compliance with local data protection laws (e.g., GDPR) when validating contact information.
- This tool is designed for **legitimate software testing, QA automation, and browser emulation research** only.

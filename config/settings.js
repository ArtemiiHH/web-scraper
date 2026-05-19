'use strict';

require('dotenv').config();

const proxyPool = process.env.PROXY_POOL
  ? process.env.PROXY_POOL.split(',').map(p => p.trim()).filter(Boolean)
  : [];

module.exports = {
  target: {
    baseUrl: 'https://www.cyprusbarassociation.org.cy',
    directoryPath: '/en/members/law-firms',
    filters: {
      region: 'Cyprus',
      sizeRanges: ['1-10', '11-50'],
      industry: 'Law Practice',
    },
  },

  timing: {
    minDelayMs: parseInt(process.env.MIN_DELAY_MS, 10) || 2000,
    maxDelayMs: parseInt(process.env.MAX_DELAY_MS, 10) || 8000,
    pageLoadTimeoutMs: 30000,
    navigationTimeoutMs: 60000,
  },

  browser: {
    headless: process.env.HEADLESS !== 'false',
    useRealBrowser: process.env.USE_REAL_BROWSER === 'true',
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHeaders: {
      'Accept-Language': 'en-GB,en;q=0.9,el;q=0.8',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--disable-dev-shm-usage',
    ],
  },

  proxy: {
    pool: proxyPool,
  },

  output: {
    dir: process.env.OUTPUT_DIR || 'data/output',
    jsonFilename: 'law-firms',
    csvFilename: 'law-firms',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: 'logs/tester.log',
  },

  selectors: {
    // Update these after inspecting the live site DOM
    firmCard: '.member-item, .law-firm-card, [data-member], .firm-listing',
    firmName: '.firm-name, .member-name, h3, h2',
    firmAddress: '.address, .firm-address, [itemprop="address"]',
    firmPhone: '.phone, .tel, [itemprop="telephone"], a[href^="tel:"]',
    firmEmail: '.email, [itemprop="email"], a[href^="mailto:"]',
    firmWebsite: '.website, [itemprop="url"], a[href^="http"]:not([href^="mailto"])',
    firmSize: '.size, .employee-count, .company-size',
    firmSpecialty: '.specialty, .practice-area, .practice-areas',
    paginationNext: 'a[rel="next"], .pagination .next, .next-page, button.next',
    paginationContainer: '.pagination, nav[aria-label="pagination"]',
    filterForm: 'form.search-filter, form.filter, #filter-form',
    filterRegion: 'select[name="region"], #region-filter',
    filterSize: 'select[name="size"], #size-filter',
    filterIndustry: 'select[name="industry"], #industry-filter',
    filterSubmit: 'button[type="submit"], input[type="submit"], .filter-submit',
    cookieBanner: '#cookie-consent, .cookie-banner, [class*="cookie"]',
    cookieAccept: '#accept-cookies, .accept-all, [aria-label*="Accept"]',
  },
};

'use strict';

require('dotenv').config();

const settings = require('../config/settings');
const { launchBrowser, newPage, closeBrowser } = require('./browser');
const { applyEvasions } = require('./evasion');
const { randomDelay, humanScroll, humanClick, varyNavigationPath } = require('./humanize');
const { parseFirms, checkPagination, dismissCookieBanner } = require('./parser');
const { exportResults } = require('./exporter');
const logger = require('./logger');

async function applyFilters(page) {
  const sel = settings.selectors;
  const filterForm = await page.$(sel.filterForm);
  if (!filterForm) {
    logger.debug('No filter form detected on page — skipping filter step');
    return;
  }

  logger.info('Filter form detected — applying search filters');

  const regionSelect = await page.$(sel.filterRegion);
  if (regionSelect) {
    await page.select(sel.filterRegion, settings.target.filters.region);
    await randomDelay(500, 1200);
  }

  const industrySelect = await page.$(sel.filterIndustry);
  if (industrySelect) {
    await page.select(sel.filterIndustry, settings.target.filters.industry);
    await randomDelay(500, 1200);
  }

  const submitBtn = await page.$(sel.filterSubmit);
  if (submitBtn) {
    await humanClick(page, sel.filterSubmit);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: settings.timing.navigationTimeoutMs })
      .catch(() => logger.debug('Navigation after filter submit did not fire; continuing'));
    await randomDelay();
  }
}

async function navigateWithRetry(page, url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: settings.timing.navigationTimeoutMs });
      return;
    } catch (err) {
      logger.warn(`Navigation to ${url} failed (attempt ${i + 1}/${attempts}): ${err.message}`);
      if (i < attempts - 1) await randomDelay(3000, 7000);
      else throw err;
    }
  }
}

async function run() {
  const startedAt = new Date();
  logger.info('=== Cyprus Law Firm Directory Test Run Starting ===');
  logger.info(`Start time: ${startedAt.toISOString()}`);

  let browser = null;
  let proxyUrl = null;

  try {
    ({ browser, proxyUrl } = await launchBrowser());
    const page = await newPage(browser);

    await applyEvasions(page);

    const directoryUrl = `${settings.target.baseUrl}${settings.target.directoryPath}`;
    logger.info(`Navigating to directory: ${directoryUrl}`);
    await navigateWithRetry(page, directoryUrl);

    await dismissCookieBanner(page);
    await randomDelay();
    await applyFilters(page);

    const allFirms = new Map();
    let pageNum = 1;
    let continueLoop = true;

    while (continueLoop) {
      logger.info(`Processing page ${pageNum}`);

      await humanScroll(page);
      await varyNavigationPath(page);

      const firms = await parseFirms(page);
      logger.info(`  Found ${firms.length} firm(s) on page ${pageNum}`);

      for (const firm of firms) {
        if (firm.name && !allFirms.has(firm.name)) {
          allFirms.set(firm.name, firm);
        }
      }

      const pagination = await checkPagination(page);
      logger.debug(`Pagination — hasPagination: ${pagination.hasPagination}, hasNextPage: ${pagination.hasNextPage}`);

      if (!pagination.hasNextPage) {
        logger.info('No further pages detected — test traversal complete');
        continueLoop = false;
        break;
      }

      const delay = await randomDelay();
      logger.debug(`Waiting ${delay}ms before next page`);

      if (pagination.nextHref) {
        const nextUrl = pagination.nextHref.startsWith('http')
          ? pagination.nextHref
          : `${settings.target.baseUrl}${pagination.nextHref}`;
        await navigateWithRetry(page, nextUrl);
      } else {
        await humanClick(page, settings.selectors.paginationNext);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: settings.timing.navigationTimeoutMs })
          .catch(() => logger.debug('Navigation event not detected after next-page click'));
      }

      pageNum++;
    }

    const records = Array.from(allFirms.values());
    logger.info(`Total unique firms validated: ${records.length}`);

    const { jsonPath, csvPath } = await exportResults(records);

    const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
    logger.info('=== Test Run Complete ===');
    logger.info(`  Pages traversed: ${pageNum}`);
    logger.info(`  Unique records:  ${records.length}`);
    logger.info(`  Duration:        ${elapsed}s`);
    logger.info(`  JSON output:     ${jsonPath}`);
    logger.info(`  CSV output:      ${csvPath}`);

  } catch (err) {
    logger.error(`Test run failed: ${err.message}`, { stack: err.stack });
    process.exitCode = 1;
  } finally {
    if (browser) {
      await closeBrowser(browser, proxyUrl);
    }
  }
}

run();

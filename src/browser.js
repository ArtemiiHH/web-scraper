'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserPreferencesPlugin = require('puppeteer-extra-plugin-user-preferences');
const proxyChain = require('proxy-chain');
const settings = require('../config/settings');
const logger = require('./logger');

puppeteer.use(StealthPlugin());
puppeteer.use(
  UserPreferencesPlugin({
    userPrefs: {
      intl: { accept_languages: 'en-GB,en,el' },
    },
  })
);

function pickProxy() {
  const pool = settings.proxy.pool;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function anonymiseProxy(rawProxy) {
  try {
    const anon = await proxyChain.anonymizeProxy(rawProxy);
    logger.debug(`Proxy anonymised: ${anon}`);
    return anon;
  } catch (err) {
    logger.warn(`Proxy anonymisation failed, proceeding without proxy: ${err.message}`);
    return null;
  }
}

async function launchBrowser() {
  const { browser: browserCfg } = settings;
  const rawProxy = pickProxy();
  let proxyUrl = null;

  if (rawProxy) {
    proxyUrl = await anonymiseProxy(rawProxy);
  }

  const launchArgs = [...browserCfg.args];
  if (proxyUrl) {
    launchArgs.push(`--proxy-server=${proxyUrl}`);
  }

  let browser;

  if (browserCfg.useRealBrowser) {
    const { connect } = require('puppeteer-real-browser');
    logger.info('Launching real Chrome instance via CDP');
    const result = await connect({
      headless: browserCfg.headless,
      args: launchArgs,
      customConfig: {},
      turnstile: false,
      connectOption: {},
    });
    browser = result.browser;
  } else {
    logger.info('Launching Puppeteer-extra with stealth plugins');
    browser = await puppeteer.launch({
      headless: browserCfg.headless ? 'new' : false,
      args: launchArgs,
      ignoreHTTPSErrors: false,
    });
  }

  logger.info('Browser launched successfully');
  return { browser, proxyUrl };
}

async function newPage(browser) {
  const page = await browser.newPage();
  const { browser: browserCfg } = settings;

  await page.setViewport(browserCfg.viewport);
  await page.setDefaultNavigationTimeout(settings.timing.navigationTimeoutMs);
  await page.setDefaultTimeout(settings.timing.pageLoadTimeoutMs);

  return page;
}

async function closeBrowser(browser, proxyUrl) {
  try {
    await browser.close();
    logger.info('Browser closed');
  } catch (err) {
    logger.warn(`Error closing browser: ${err.message}`);
  }

  if (proxyUrl) {
    try {
      await proxyChain.closeAnonymizedProxy(proxyUrl, true);
      logger.debug('Anonymised proxy server closed');
    } catch {
      // Non-critical cleanup failure
    }
  }
}

module.exports = { launchBrowser, newPage, closeBrowser };

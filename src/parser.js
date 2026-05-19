'use strict';

const settings = require('../config/settings');
const logger = require('./logger');

async function parseFirms(page) {
  const sel = settings.selectors;

  const firms = await page.evaluate((selectors) => {
    const cards = Array.from(document.querySelectorAll(selectors.firmCard));

    return cards.map(card => {
      const text = el => (el ? el.textContent.trim() : null);
      const attr = (el, a) => (el ? el.getAttribute(a) : null);

      const nameEl = card.querySelector(selectors.firmName);
      const addressEl = card.querySelector(selectors.firmAddress);
      const phoneEl = card.querySelector(selectors.firmPhone);
      const emailEl = card.querySelector(selectors.firmEmail);
      const websiteEl = card.querySelector(selectors.firmWebsite);
      const sizeEl = card.querySelector(selectors.firmSize);
      const specialtyEl = card.querySelector(selectors.firmSpecialty);

      let phone = text(phoneEl);
      if (!phone && phoneEl) {
        const href = attr(phoneEl, 'href') || '';
        phone = href.startsWith('tel:') ? href.replace('tel:', '') : phone;
      }

      let email = text(emailEl);
      if (!email && emailEl) {
        const href = attr(emailEl, 'href') || '';
        email = href.startsWith('mailto:') ? href.replace('mailto:', '') : email;
      }

      let website = attr(websiteEl, 'href') || text(websiteEl);

      return {
        name: text(nameEl),
        address: text(addressEl),
        phone: phone || null,
        email: email || null,
        website: website || null,
        size: text(sizeEl),
        specialty: text(specialtyEl),
        tested_at: new Date().toISOString(),
      };
    }).filter(f => f.name);
  }, sel);

  logger.debug(`Parsed ${firms.length} firm record(s) from page`);
  return firms;
}

async function checkPagination(page) {
  const sel = settings.selectors;

  return page.evaluate((nextSel, containerSel) => {
    const container = document.querySelector(containerSel);
    const nextBtn = document.querySelector(nextSel);

    return {
      hasPagination: !!container,
      hasNextPage: !!(nextBtn && !nextBtn.classList.contains('disabled') && !nextBtn.hasAttribute('disabled')),
      nextHref: nextBtn ? nextBtn.getAttribute('href') : null,
    };
  }, sel.paginationNext, sel.paginationContainer);
}

async function dismissCookieBanner(page) {
  const sel = settings.selectors;
  try {
    const banner = await page.$(sel.cookieBanner);
    if (banner) {
      const acceptBtn = await page.$(sel.cookieAccept);
      if (acceptBtn) {
        await acceptBtn.click();
        await page.waitForTimeout(800);
        logger.debug('Cookie banner dismissed');
      }
    }
  } catch {
    // Cookie banner is optional; ignore if absent or unclickable
  }
}

module.exports = { parseFirms, checkPagination, dismissCookieBanner };

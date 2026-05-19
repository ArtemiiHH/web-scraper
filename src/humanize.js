'use strict';

const settings = require('../config/settings');

function gaussianRandom(mean, sigma) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

async function randomDelay(
  min = settings.timing.minDelayMs,
  max = settings.timing.maxDelayMs
) {
  const mean = (min + max) / 2;
  const sigma = (max - min) / 6;
  const delay = Math.min(max, Math.max(min, Math.round(gaussianRandom(mean, sigma))));
  await new Promise(r => setTimeout(r, delay));
  return delay;
}

function bezierPoint(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

async function moveToElement(page, selector) {
  const element = await page.$(selector);
  if (!element) return;

  const box = await element.boundingBox();
  if (!box) return;

  const targetX = box.x + box.width / 2 + (Math.random() - 0.5) * Math.min(box.width * 0.3, 10);
  const targetY = box.y + box.height / 2 + (Math.random() - 0.5) * Math.min(box.height * 0.3, 5);

  const current = await page.evaluate(() => ({ x: window.mouseX || 0, y: window.mouseY || 0 }));
  const startX = current.x || Math.random() * 400 + 100;
  const startY = current.y || Math.random() * 300 + 100;

  const cp1x = startX + (targetX - startX) * 0.25 + (Math.random() - 0.5) * 120;
  const cp1y = startY + (targetY - startY) * 0.1 + (Math.random() - 0.5) * 80;
  const cp2x = startX + (targetX - startX) * 0.75 + (Math.random() - 0.5) * 120;
  const cp2y = startY + (targetY - startY) * 0.9 + (Math.random() - 0.5) * 80;

  const steps = Math.floor(Math.random() * 20) + 25;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = bezierPoint(t, startX, cp1x, cp2x, targetX);
    const y = bezierPoint(t, startY, cp1y, cp2y, targetY);
    await page.mouse.move(x, y);
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 8) + 2));
  }
}

async function humanScroll(page) {
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  let currentY = 0;

  while (currentY < pageHeight - viewportHeight) {
    const scrollStep = Math.floor(gaussianRandom(120, 40));
    const clampedStep = Math.max(40, Math.min(300, scrollStep));
    currentY = Math.min(currentY + clampedStep, pageHeight - viewportHeight);

    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'auto' }), currentY);
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 120) + 30));

    // Occasional brief pause simulating reading
    if (Math.random() < 0.08) {
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 800) + 400));
    }
  }
}

async function humanClick(page, selector) {
  await moveToElement(page, selector);
  await new Promise(r => setTimeout(r, Math.floor(Math.random() * 180) + 60));
  await page.click(selector);
}

async function varyNavigationPath(page) {
  if (Math.random() > 0.15) return;

  const actions = [
    async () => {
      // Scroll partway back up
      const scrollTarget = Math.floor(Math.random() * 400);
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), scrollTarget);
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 600) + 300));
    },
    async () => {
      // Hover over a random link without clicking
      const links = await page.$$('a');
      if (links.length > 0) {
        const randomLink = links[Math.floor(Math.random() * Math.min(links.length, 10))];
        const box = await randomLink.boundingBox();
        if (box) {
          await page.mouse.move(
            box.x + box.width / 2,
            box.y + box.height / 2
          );
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * 400) + 200));
        }
      }
    },
    async () => {
      // Brief random scroll down then back
      await humanScroll(page);
      await new Promise(r => setTimeout(r, 500));
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await new Promise(r => setTimeout(r, 400));
    },
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  await action();
}

module.exports = { randomDelay, moveToElement, humanScroll, humanClick, varyNavigationPath };

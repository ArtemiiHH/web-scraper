'use strict';

const settings = require('../config/settings');

const CLIENT_HINTS = {
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

async function applyEvasions(page) {
  await _spoofWebGL(page);
  await _spoofCanvas(page);
  await _fixNavigatorProps(page);
  await _injectChromeRuntime(page);
  await _setClientHints(page);
}

async function _spoofWebGL(page) {
  await page.evaluateOnNewDocument(() => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel(R) Iris(TM) Plus Graphics 640';
      return getParameter.call(this, parameter);
    };

    const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel(R) Iris(TM) Plus Graphics 640';
      return getParameter2.call(this, parameter);
    };
  });
}

async function _spoofCanvas(page) {
  await page.evaluateOnNewDocument(() => {
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type, ...args) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] ^ 1;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return toDataURL.call(this, type, ...args);
    };

    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, ...args) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] ^ 1;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return toBlob.call(this, callback, type, ...args);
    };
  });
}

async function _fixNavigatorProps(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-GB', 'en', 'el'],
    });

    Object.defineProperty(navigator, 'permissions', {
      get: () => ({
        query: async ({ name }) => {
          if (name === 'notifications') return { state: 'prompt' };
          return { state: 'granted' };
        },
      }),
    });
  });
}

async function _injectChromeRuntime(page) {
  await page.evaluateOnNewDocument(() => {
    window.chrome = {
      app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      },
      csi: () => {},
      loadTimes: () => ({
        commitLoadTime: Date.now() / 1000 - Math.random() * 2,
        finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
        finishLoadTime: Date.now() / 1000,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: Date.now() / 1000 - Math.random() * 1.5,
        navigationType: 'Other',
        requestTime: Date.now() / 1000 - Math.random() * 3,
        startLoadTime: Date.now() / 1000 - Math.random() * 2.5,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true,
      }),
      runtime: {},
    };
  });
}

async function _setClientHints(page) {
  const ua = settings.browser.userAgent;
  await page.setUserAgent(ua);
  await page.setExtraHTTPHeaders({
    ...settings.browser.extraHeaders,
    ...CLIENT_HINTS,
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
  });
}

module.exports = { applyEvasions };

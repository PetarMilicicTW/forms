import { chromium } from '@playwright/test';

// Warm up every dev server once before the tests run. The first load of each
// app makes Vite pre-bundle its dependencies; doing it here (and waiting for the
// form to fully render) means that one-time optimization can't trigger a
// page reload in the middle of a test under parallel load.
const URLS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4200'];

export default async function globalSetup() {
  const browser = await chromium.launch();
  try {
    for (const url of URLS) {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      // Wait until a PDS input has fully upgraded (its shadow DOM rendered).
      await page
        .waitForFunction(
          () => {
            const host = document.querySelector('p-input-email');
            return !!(host && host.shadowRoot && host.shadowRoot.querySelector('#message'));
          },
          null,
          { timeout: 60_000 },
        )
        .catch(() => {});
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

/** Capture representative rendered states for source-level review, not journey testing. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
await mkdir('screenshots', { recursive: true });
const reports = [];
try {
  for (const [name, path, width] of [['landing', '/', 1024], ['login', '/login', 390], ['register', '/register', 768]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + path);
    if (name === 'login') await page.getByRole('button', { name: 'Open navigation' }).click();
    reports.push({ name, accessibility: await page.locator('body').ariaSnapshot(), styles: await page.evaluate(() => ({ font: getComputedStyle(document.body).fontFamily, background: getComputedStyle(document.body).backgroundColor, width: document.documentElement.scrollWidth, viewport: innerWidth })), html: await page.content() });
    await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
  await page.evaluate(() => localStorage.setItem('writespace_session', JSON.stringify({ userId: 'admin', username: 'admin', displayName: 'Admin', role: 'admin' })));
  for (const path of ['/blogs', '/write', '/admin', '/users']) {
    await page.goto(base + path);
    const name = path.slice(1);
    reports.push({ name, accessibility: await page.locator('body').ariaSnapshot(), styles: await page.evaluate(() => ({ font: getComputedStyle(document.body).fontFamily, width: document.documentElement.scrollWidth, viewport: innerWidth })), html: await page.content() });
    await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
  await writeFile('preflight.txt', JSON.stringify(reports, null, 2));
} finally {
  await browser.close();
}

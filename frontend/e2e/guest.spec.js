/** Exercise guest discovery through clicks without depending on future account pages. */
import { expect, test } from '@playwright/test';

/** Capture browser failures before entering the application.
 * Args:
 *   page: Isolated browser page for the journey.
 * Returns:
 *   Mutable error list asserted at the end of each journey.
 */
function captureErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('guest discovers real local previews without passive mutations', async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  const posts = [1, 4, 2, 3].map((day) => ({
    id: `local-${day}`, title: `Browser note ${day}`, content: `Real local story ${day}`,
    createdAt: `2026-11-0${day}T00:00:00.000Z`, authorId: 'local-reader', authorName: 'Local Reader',
  }));
  await page.addInitScript((records) => {
    if (!localStorage.getItem('writespace_posts')) localStorage.setItem('writespace_posts', JSON.stringify(records));
  }, posts);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good ideas deserve a place to grow.');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article').first()).toContainText('Browser note 4');
  await expect(page.getByRole('article').nth(1)).toContainText('Browser note 3');
  await expect(page.getByRole('article').nth(2)).toContainText('Browser note 2');
  await expect(page.getByText('Real local story 4')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(posts);
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  await page.getByRole('link', { name: 'Discover recent posts' }).click();
  await expect(page).toHaveURL(/#latest-posts$/);
  await page.reload();
  await expect(page.getByText('Real local story 4')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('guest-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Read Browser note 4' }).click();
  await expect(page).toHaveURL(/\/blog\/local-4$/);
  // The account slice owns redirect/form assertions; this slice verifies the real link.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(posts);
  expect(errors).toEqual([]);
});

test('guest uses both entry CTAs only after activation', async ({ page }) => {
  const errors = captureErrors(page);
  await page.goto('/');
  await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Start writing', exact: true }).first().click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole('link', { name: 'WriteSpace home' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good ideas deserve a place to grow.');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  expect(errors).toEqual([]);
});

test('mobile navigation and reduced-motion empty fallback remain usable with corrupt storage', async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('writespace_posts', '{broken'));
  await page.goto('/');
  await expect(page.getByText('No posts yet — check back soon!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeHidden();
  expect(await page.getByRole('figure').evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('guest-mobile-menu.png'), fullPage: true });
  await page.getByRole('button', { name: 'Close navigation' }).click();
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeHidden();
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBe('{broken');
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  expect(errors).toEqual([]);
});

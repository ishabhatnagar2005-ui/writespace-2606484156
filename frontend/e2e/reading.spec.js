/** Exercise real local reading journeys without implementing authoring or Admin pages. */
import { expect, test } from '@playwright/test';

const account = {
  id: 'reading-owner', username: 'reading-user', displayName: 'Reading User', password: 'demo-pass',
  role: 'user', createdAt: '2026-11-01T00:00:00.000Z',
};
const identity = {
  userId: account.id, username: account.username, displayName: account.displayName, role: account.role,
};
const posts = [1, 4, 2, 3].map((day) => ({
  id: `reading-${day}`, title: `Browser note ${day}`,
  content: `Beginning ${day}\n\n  Preserved indentation\n${'Long local story '.repeat(150)}\n<script>window.readingXss = true</script> END ${day}`,
  authorId: account.id, authorName: account.displayName, createdAt: `2026-11-0${day}T00:00:00.000Z`,
}));

/** Fail each test on console errors or uncaught browser exceptions, including reloads. */
test.beforeEach(async ({ page }) => {
  page.readingErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') page.readingErrors.push(message.text());
  });
  page.on('pageerror', (error) => page.readingErrors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(page.readingErrors).toEqual([]);
});

/** Seed real browser storage once so reloads cannot conceal lost or changed records.
 * Args:
 *   page: Isolated browser page.
 *   session: Optional identity for direct-entry boundary tests.
 *   records: Real local post records, or a malformed serialized collection.
 */
async function seed(page, session = null, records = posts) {
  await page.addInitScript(({ accountRecord, sessionRecord, postRecords }) => {
    if (localStorage.getItem('writespace_users') === null) {
      localStorage.setItem('writespace_users', JSON.stringify([accountRecord]));
      localStorage.setItem('writespace_posts', typeof postRecords === 'string' ? postRecords : JSON.stringify(postRecords));
      if (sessionRecord) localStorage.setItem('writespace_session', JSON.stringify(sessionRecord));
    }
  }, { accountRecord: account, sessionRecord: session, postRecords: records });
}

/** Enter through login controls, then navigate only through the app's links. */
async function login(page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill(account.username);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
}

test('login to full ordered list to safe reader, then reload and return through links', async ({ page }, testInfo) => {
  await seed(page);
  await login(page);
  await expect(page.getByRole('heading', { level: 3 })).toHaveText([
    'Browser note 4', 'Browser note 3', 'Browser note 2', 'Browser note 1',
  ]);
  await page.getByRole('link', { name: 'Read Browser note 4', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/reading-4$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(posts[1].title);
  const body = page.locator('article .whitespace-pre-wrap');
  expect(await body.textContent()).toBe(posts[1].content);
  await expect(body).toHaveCSS('white-space', 'pre-wrap');
  await expect(page.locator('article time')).toHaveText('Nov 04, 2026');
  await expect(page.locator('article time')).toHaveAttribute('datetime', posts[1].createdAt);
  await expect(page.getByRole('article')).toContainText(account.displayName);
  await expect(page.getByRole('article').getByRole('img', { name: 'User avatar' })).toBeVisible();
  expect(await page.evaluate(() => window.readingXss)).toBeUndefined();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(posts);
  await page.reload();
  expect(await body.textContent()).toBe(posts[1].content);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')))).toEqual(identity);
  await page.getByRole('link', { name: 'Back to blogs', exact: true }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath('reading-list.png'), fullPage: true });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(posts);
});

test('owner cancels native deletion without changes, then confirms and reloads persisted list', async ({ page }) => {
  await seed(page);
  await login(page);
  await page.getByRole('link', { name: 'Read Browser note 4', exact: true }).click();
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe('Delete this blog? This cannot be undone.');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Delete blog', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/reading-4$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(posts);
  page.once('dialog', async (dialog) => { await dialog.accept(); });
  await page.getByRole('button', { name: 'Delete blog', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Browser note 3', 'Browser note 2', 'Browser note 1']);
  const remaining = posts.filter((post) => post.id !== 'reading-4');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(remaining);
  await page.reload();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(remaining);
});

for (const [role, userId, permitted] of [['user', 'other', false], ['admin', 'admin', true]]) {
  test(`${role} direct reader entry applies ownership controls and survives reload`, async ({ page }) => {
    await seed(page, { ...identity, role, userId });
    await page.goto('/blog/reading-4');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(posts[1].title);
    await expect(page.getByRole('button', { name: 'Delete blog', exact: true })).toHaveCount(permitted ? 1 : 0);
    await expect(page.getByRole('link', { name: 'Edit blog', exact: true })).toHaveCount(permitted ? 1 : 0);
    await page.reload();
    expect(await page.locator('article .whitespace-pre-wrap').textContent()).toBe(posts[1].content);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(posts);
  });
}

test('missing direct entry displays not-found and a working back link', async ({ page }) => {
  await seed(page, identity);
  await page.goto('/blog/unknown');
  await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to blogs', exact: true }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(4);
});

for (const path of ['/blogs', '/blog/reading-4']) {
  test(`guest direct entry ${path} redirects without exposing full text`, async ({ page }) => {
    await seed(page);
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
    await expect(page.locator('article .whitespace-pre-wrap')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  });
}

for (const records of [[], '{bad']) {
  test(`empty or malformed local collection ${JSON.stringify(records)} offers writing without repair`, async ({ page }) => {
    await seed(page, identity, records);
    await page.goto('/blogs');
    await expect(page.getByText('No blogs yet. Be the first to write one!', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Write a blog', exact: true })).toHaveAttribute('href', '/write');
    expect(await page.evaluate(() => localStorage.getItem('writespace_posts')))
      .toBe(typeof records === 'string' ? records : JSON.stringify(records));
  });
}

for (const [width, columns] of [[390, 1], [768, 2], [1024, 3]]) {
  test(`reading list uses ${columns} columns at ${width}px without horizontal overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await seed(page);
    await login(page);
    const grid = page.getByRole('region', { name: 'Blog posts' });
    const tracks = await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    expect(tracks).toBe(columns);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Read Browser note 4', exact: true }).click();
    expect(await page.locator('article .whitespace-pre-wrap').textContent()).toBe(posts[1].content);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`reader-${width}.png`), fullPage: true });
  });
}

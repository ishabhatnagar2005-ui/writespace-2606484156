/** Exercise click-driven writing journeys against real browser-local records. */
import { expect, test } from '@playwright/test';

/** Capture errors before the first document loads for final journey assertions. */
function captureErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Register through the real form, leaving a genuine persisted session. */
async function registerWriter(page) {
  await page.getByRole('link', { name: 'Start writing', exact: true }).first().click();
  await page.getByLabel('Display Name', { exact: true }).fill('Browser Writer');
  await page.getByLabel('Username', { exact: true }).fill('browser-writer');
  await page.getByLabel('Password', { exact: true }).fill('demo');
  await page.getByLabel('Confirm Password', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
}

test('register → write → reader → edit → delete persists real records and survives reloads', async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto('/');
  await registerWriter(page);
  await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
  await page.getByRole('link', { name: 'Write a blog', exact: true }).click();
  const title = 'A browser-local story';
  const content = `First line\n\n  Indented line\n<script>alert(1)</script><img src=x onerror=alert(1)>\n${'words '.repeat(1000)}END`;
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Content', { exact: true }).fill(content);
  await expect(page.getByText(`${content.length} characters`, { exact: true })).toBeVisible();
  expect(await page.getByLabel('Content').evaluate((element) => parseFloat(getComputedStyle(element).minHeight))).toBeGreaterThanOrEqual(256);
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBeNull();
  await page.getByRole('button', { name: 'Publish blog' }).click();
  const created = await page.evaluate(() => ({
    posts: JSON.parse(localStorage.getItem('writespace_posts')),
    session: JSON.parse(localStorage.getItem('writespace_session')),
    users: JSON.parse(localStorage.getItem('writespace_users')),
  }));
  expect(created.posts).toHaveLength(1);
  const original = created.posts[0];
  expect(original.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(new Date(original.createdAt).toISOString()).toBe(original.createdAt);
  expect(original).toEqual({ id: original.id, title, content, createdAt: original.createdAt,
    authorId: created.session.userId, authorName: created.session.displayName });
  expect(created.session.userId).toBe(created.users[0].id);
  await expect(page).toHaveURL(new RegExp(`/blog/${original.id}$`));
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  expect(await page.locator('article .whitespace-pre-wrap').textContent()).toBe(content);
  await expect(page.locator('article script, article img')).toHaveCount(0);
  await page.reload();
  expect(await page.locator('article .whitespace-pre-wrap').textContent()).toBe(content);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([original]);
  await page.getByRole('link', { name: 'Back to blogs' }).click();
  await page.getByRole('link', { name: `Read ${title}`, exact: true }).click();
  await page.getByRole('link', { name: 'Edit blog', exact: true }).click();
  await expect(page.getByLabel('Title')).toHaveValue(title);
  await expect(page.getByLabel('Content')).toHaveValue(content);
  await page.reload();
  await expect(page.getByLabel('Content')).toHaveValue(content);
  const editedTitle = 'Revised story';
  const editedContent = 'Revised first line\n\n  Preserved indentation';
  await page.getByLabel('Title').fill(editedTitle);
  await page.getByLabel('Content').fill(editedContent);
  await page.getByRole('button', { name: 'Save changes' }).click();
  const edited = { ...original, title: editedTitle, content: editedContent };
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([edited]);
  await expect(page.getByRole('heading', { name: editedTitle, exact: true })).toBeVisible();
  expect(await page.locator('article .whitespace-pre-wrap').textContent()).toBe(editedContent);
  await page.reload();
  await expect(page.getByRole('heading', { name: editedTitle, exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('written-reader.png'), fullPage: true });
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete blog' }).click();
  await expect(page).toHaveURL(new RegExp(`/blog/${original.id}$`));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([edited]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete blog' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([]);
  await page.reload();
  await expect(page.getByText('No blogs yet. Be the first to write one!')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([]);
  expect(errors).toEqual([]);
});

test('required and whitespace fields show associated errors; create and edit cancel never save', async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto('/');
  await registerWriter(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Write a blog', exact: true }).click();
  await page.getByRole('button', { name: 'Publish blog' }).click();
  await expect(page.getByRole('alert')).toHaveCount(2);
  for (const label of ['Title', 'Content']) {
    await expect(page.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(label)).toHaveAttribute('aria-describedby', new RegExp(`blog-${label.toLowerCase()}-error`));
    await expect(page.getByText(`${label} is required.`, { exact: true })).toBeVisible();
  }
  await page.getByLabel('Title').fill('Valid title');
  await page.getByLabel('Content').fill(' \n ');
  await page.getByRole('button', { name: 'Publish blog' }).click();
  await expect(page.getByRole('alert')).toHaveText('Content is required.');
  await page.getByLabel('Title').fill('  ');
  await page.getByLabel('Content').fill('Valid content');
  await page.getByRole('button', { name: 'Publish blog' }).click();
  await expect(page.getByRole('alert')).toHaveText('Title is required.');
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBeNull();
  await page.screenshot({ path: testInfo.outputPath('writing-mobile-errors.png'), fullPage: true });
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_posts'))).toBeNull();
  await page.getByRole('link', { name: 'Write a blog', exact: true }).click();
  await expect(page.getByLabel('Title')).toHaveValue('');
  await page.getByLabel('Title').fill('Keep this post');
  await page.getByLabel('Content').fill('Keep this content');
  await page.getByRole('button', { name: 'Publish blog' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')));
  await page.getByRole('link', { name: 'Edit blog', exact: true }).click();
  await page.getByLabel('Title').fill('Discard edit');
  await page.getByLabel('Content').fill('Discard content');
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(saved);
  await page.getByRole('link', { name: 'Read Keep this post', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep this post', exact: true })).toBeVisible();
  await page.reload();
  expect(await page.locator('article .whitespace-pre-wrap').textContent()).toBe('Keep this content');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(saved);
  expect(errors).toEqual([]);
});

test('non-owner initial edit entry returns to blogs without mutation and reader hides management', async ({ page }) => {
  const errors = captureErrors(page);
  const post = { id: 'owned-post', title: 'Another writer', content: 'Not yours to change',
    createdAt: '2026-11-10T07:30:00.000Z', authorId: 'owner', authorName: 'Owner' };
  await page.addInitScript((record) => {
    if (!localStorage.getItem('writespace_posts')) localStorage.setItem('writespace_posts', JSON.stringify([record]));
    if (!localStorage.getItem('writespace_session')) {
      localStorage.setItem('writespace_session', JSON.stringify({
        userId: 'other', username: 'other', displayName: 'Other reader', role: 'user',
      }));
    }
  }, post);
  await page.goto('/edit/owned-post');
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByLabel('Title')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([post]);
  await page.getByRole('link', { name: 'Read Another writer', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Edit blog' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete blog' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: post.title, exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual([post]);
  expect(errors).toEqual([]);
});

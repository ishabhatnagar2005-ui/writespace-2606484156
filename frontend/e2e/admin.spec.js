/** Exercise real local Admin journeys; navigation after entry is click-driven. */
import { expect, test } from '@playwright/test';

/** Capture browser failures before the first navigation. */
function captureErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Authenticate through the real form rather than injecting identity. */
async function login(page, username = 'admin', password = 'admin') {
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Create the selected local role using explicit form activation. */
async function createAccount(page, username, role) {
  await page.getByLabel('Display Name', { exact: true }).fill(`Display ${username}`);
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('demo-only');
  await page.getByLabel('Role', { exact: true }).selectOption(role);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Account created.');
}

test('built-in login → create both roles → created Admin login → protected self and eligible deletion', async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto('/login');
  await login(page);
  await expect(page.getByText('No posts yet.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBeNull();
  await page.getByRole('link', { name: 'Manage accounts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete account admin', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(4);
  await createAccount(page, 'local-reader', 'user');
  await createAccount(page, 'local-editor', 'admin');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')));
  expect(saved.map((account) => account.role)).toEqual(['user', 'admin']);
  for (const account of saved) {
    expect(account.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
    expect(account.password).toBe('demo-only');
    expect(account.displayName).toBe(`Display ${account.username}`);
  }
  await expect(page.getByText('demo-only', { exact: true })).toHaveCount(0);
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual(saved);
  await page.getByRole('link', { name: 'Back to dashboard', exact: true }).click();
  await expect(page.getByText('Total users', { exact: true }).locator('..').locator('dd')).toHaveText('3');
  await expect(page.getByText('Admins', { exact: true }).locator('..').locator('dd')).toHaveText('2');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  await page.getByRole('link', { name: 'Log in', exact: true }).first().click();
  await login(page, 'local-editor', 'demo-only');
  const identity = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')));
  expect(identity.userId).toBe(saved[1].id);
  expect(identity.role).toBe('admin');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Manage accounts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete account local-editor', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Delete account admin', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Display Name', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete account local-reader', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual(saved);
  await expect(page.getByRole('status')).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete account local-reader', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Account deleted.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual([saved[1]]);
  await page.reload();
  await expect(page.getByRole('listitem', { name: 'Account local-reader', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete account local-editor', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('admin-mobile-accounts.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('top-five posts expose reader/edit/delete and passive write quick action with real persistence', async ({ page }) => {
  const errors = captureErrors(page);
  const records = Array.from({ length: 7 }, (_, index) => ({
    id: `post-${index}`, title: `Recent ${index}`, content: `Body ${index}`,
    createdAt: `2026-11-${index + 10}T00:00:00.000Z`, authorId: 'other', authorName: 'Other writer',
  }));
  await page.addInitScript((posts) => {
    if (localStorage.getItem('writespace_posts') === null) localStorage.setItem('writespace_posts', JSON.stringify(posts));
  }, records);
  await page.goto('/login');
  await login(page);
  const recent = page.getByRole('region', { name: 'Recent posts' });
  await expect(recent.getByRole('listitem')).toHaveCount(5);
  await expect(recent.getByRole('listitem').first()).toContainText('Recent 6');
  await expect(recent.getByRole('listitem').locator('a').filter({ hasNotText: 'Edit' }))
    .toHaveText(['Recent 6', 'Recent 5', 'Recent 4', 'Recent 3', 'Recent 2']);
  await expect(recent.getByRole('link', { name: 'Recent 1', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(records);
  await page.getByRole('link', { name: 'Write a blog', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('');
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('link', { name: 'Recent 6', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recent 6', exact: true })).toBeVisible();
  await expect(page.getByText('Body 6', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('link', { name: 'Edit Recent 6', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Edited by Admin');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const updated = records.map((post) => post.id === 'post-6' ? { ...post, title: 'Edited by Admin' } : post);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(updated);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete Edited by Admin', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(updated);
  await expect(page).toHaveURL(/\/admin$/);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Edited by Admin', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole('heading', { name: 'Blogs', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(records.slice(0, 6));
  const listing = page.getByRole('region', { name: 'Blog posts' });
  await expect(listing.getByRole('article')).toHaveCount(6);
  await expect(listing.getByRole('heading')).toHaveText(['Recent 5', 'Recent 4', 'Recent 3', 'Recent 2', 'Recent 1', 'Recent 0']);
  await expect(listing.getByRole('link', { name: 'Edited by Admin', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(listing.getByRole('heading')).toHaveText(['Recent 5', 'Recent 4', 'Recent 3', 'Recent 2', 'Recent 1', 'Recent 0']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(records.slice(0, 6));
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(recent.getByRole('listitem')).toHaveCount(5);
  await expect(page.getByText('Total posts', { exact: true }).locator('..').locator('dd')).toHaveText('6');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_posts')))).toEqual(records.slice(0, 6));
  expect(errors).toEqual([]);
});

for (const route of ['/admin', '/users']) {
  test(`guest initial entry ${route} redirects to login without mutation`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBeNull();
    expect(errors).toEqual([]);
  });
  test(`nonAdmin initial entry ${route} redirects to blogs without mutation`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.addInitScript(() => localStorage.setItem('writespace_session', JSON.stringify({
      userId: 'user', username: 'user', displayName: 'Reader', role: 'user',
    })));
    await page.goto(route);
    await expect(page).toHaveURL(/\/blogs$/);
    await expect(page.getByRole('heading', { name: 'Manage accounts', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('writespace_users'))).toBeNull();
    expect(errors).toEqual([]);
  });
}

/** Exercise real browser-local account journeys; protected page content belongs to later slices. */
import { expect, test } from '@playwright/test';

/** Capture browser errors before entry for assertion at journey end. */
function captureErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('register, reload, logout and log back in through real account UI', async ({ page }, testInfo) => {
  const errors = captureErrors(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Start writing', exact: true }).first().click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toHaveCount(4);
  await page.getByLabel('Display Name', { exact: true }).fill('Browser Reader');
  await page.getByLabel('Username', { exact: true }).fill('browser-reader');
  await page.getByLabel('Password', { exact: true }).fill('x');
  await page.getByLabel('Confirm Password', { exact: true }).fill('X');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match.');
  await page.getByLabel('Confirm Password', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText('Browser Reader');
  const saved = await page.evaluate(() => ({
    users: JSON.parse(localStorage.getItem('writespace_users')),
    session: JSON.parse(localStorage.getItem('writespace_session')),
  }));
  expect(saved.users).toHaveLength(1);
  expect(saved.users[0]).toMatchObject({ displayName: 'Browser Reader', username: 'browser-reader', password: 'x', role: 'user' });
  expect(saved.users[0].id).toMatch(/^[0-9a-f-]{36}$/);
  expect(Number.isNaN(Date.parse(saved.users[0].createdAt))).toBe(false);
  expect(saved.session).toEqual({ userId: saved.users[0].id, displayName: 'Browser Reader', username: 'browser-reader', role: 'user' });
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText('Browser Reader');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')))).toEqual(saved.session);
  await page.getByRole('link', { name: 'WriteSpace home' }).click();
  await expect(page.getByRole('link', { name: 'Explore blogs', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual(saved.users);
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill('browser-reader');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
  await page.getByLabel('Password', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText('Browser Reader');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')))).toEqual(saved.session);
  await page.screenshot({ path: testInfo.outputPath('account-session.png'), fullPage: true });
  expect(errors).toEqual([]);
});

for (const path of ['/blogs', '/blog/local-id', '/write', '/edit/local-id', '/admin', '/users']) {
  test(`guest initial entry ${path} is gated`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
    expect(errors).toEqual([]);
  });
}

for (const role of ['user', 'admin']) {
  for (const path of ['/login', '/register', '/admin', '/users']) {
    test(`${role} initial entry ${path} respects role boundaries and reload`, async ({ page }) => {
      const errors = captureErrors(page);
      const session = { userId: `${role}-local`, username: `${role}-reader`, displayName: `Local ${role}`, role };
      await page.addInitScript((identity) => {
        if (!localStorage.getItem('writespace_session')) localStorage.setItem('writespace_session', JSON.stringify(identity));
      }, session);
      await page.goto(path);
      const destination = role === 'user' ? '/blogs' : ['/login', '/register'].includes(path) ? '/admin' : path;
      await expect(page).toHaveURL(new RegExp(`${destination}$`));
      await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText(session.displayName);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')))).toEqual(session);
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`${destination}$`));
      await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText(session.displayName);
      expect(errors).toEqual([]);
    });
  }
}

test('malformed initial session fails closed without repairing local storage', async ({ page }) => {
  const errors = captureErrors(page);
  await page.addInitScript(() => localStorage.setItem('writespace_session', '{bad'));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBe('{bad');
  expect(errors).toEqual([]);
});

for (const builtIn of [true, false]) {
  test(`${builtIn ? 'built-in-first' : 'stored'} Admin login and mobile logout use real UI`, async ({ page }, testInfo) => {
    const errors = captureErrors(page);
    const account = {
      id: 'stored-editor', username: builtIn ? 'admin' : 'editor', password: builtIn ? 'admin' : 'x',
      displayName: 'Stored Editor', role: builtIn ? 'user' : 'admin', createdAt: '2026-11-10T00:00:00.000Z',
    };
    await page.addInitScript((record) => {
      if (!localStorage.getItem('writespace_users')) localStorage.setItem('writespace_users', JSON.stringify([record]));
    }, account);
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(account.username);
    await page.getByLabel('Password', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_session')));
    expect(session).toEqual({ userId: builtIn ? 'admin' : account.id, username: account.username, displayName: builtIn ? 'Admin' : account.displayName, role: 'admin' });
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Account navigation' })).toContainText(session.displayName);
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await expect(page).toHaveURL(/\/users$/);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Log out' })).toBeHidden();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('account-mobile-nav.png'), fullPage: true });
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => localStorage.getItem('writespace_session'))).toBeNull();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('writespace_users')))).toEqual([account]);
    expect(errors).toEqual([]);
  });
}

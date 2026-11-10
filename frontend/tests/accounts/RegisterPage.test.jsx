/** Verify registration UI validation, persisted data, and both failure boundaries. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../src/App.jsx';
import { getSession } from '../../src/utils/auth.js';
import { getUsers, saveUsers } from '../../src/utils/storage.js';

const values = { 'Display Name': 'Reader', Username: 'reader', Password: 'x', 'Confirm Password': 'x' };

/** Expose the route after real form handling. */
function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

/** Render registration inside the real application. */
function mount() {
  render(<MemoryRouter initialEntries={['/register']}><App /><Location /></MemoryRouter>);
}

describe('RegisterPage', () => {
  it('renders four required semantic fields, warning, and no passive writes', () => {
    mount();
    for (const label of Object.keys(values)) {
      expect(screen.getByLabelText(label, { exact: true })).toHaveAttribute('aria-required', 'true');
    }
    expect(screen.getByRole('complementary')).toHaveTextContent('plaintext in localStorage');
    expect(screen.getByRole('complementary')).toHaveTextContent('not secure authorization');
    for (const link of screen.getAllByRole('link', { name: 'Log in', exact: true })) {
      expect(link).toHaveAttribute('href', '/login');
    }
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it.each(Object.keys(values))('blocks missing %s and associates its field error', async (missing) => {
    const user = userEvent.setup();
    mount();
    for (const [label, value] of Object.entries(values)) {
      if (label !== missing) await user.type(screen.getByLabelText(label, { exact: true }), value);
    }
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent(`${missing} is required.`);
    const input = screen.getByLabelText(missing, { exact: true });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(input.getAttribute('aria-describedby'))).toHaveTextContent(`${missing} is required.`);
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/register');
  });
  it.each([['mismatch', { 'Confirm Password': 'X' }, 'Passwords do not match.'],
    ['reserved', { Username: 'admin' }, 'Username is already taken.'],
    ['duplicate', { Username: 'taken' }, 'Username is already taken.']])('blocks %s without save', async (_, overrides, message) => {
    const user = userEvent.setup();
    saveUsers([{ username: 'taken' }]);
    mount();
    for (const [label, value] of Object.entries({ ...values, ...overrides })) {
      await user.type(screen.getByLabelText(label, { exact: true }), value);
    }
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(getUsers()).toEqual([{ username: 'taken' }]);
    expect(getSession()).toBeNull();
  });
  it('creates exact user identity and session then displays authenticated shell', async () => {
    const user = userEvent.setup();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('new-reader');
    mount();
    for (const [label, value] of Object.entries(values)) await user.type(screen.getByLabelText(label, { exact: true }), value);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(getUsers()).toHaveLength(1);
    expect(getUsers()[0]).toMatchObject({ id: 'new-reader', displayName: 'Reader', username: 'reader', password: 'x', role: 'user' });
    expect(Number.isNaN(Date.parse(getUsers()[0].createdAt))).toBe(false);
    expect(getUsers()[0]).not.toHaveProperty('confirmPassword');
    expect(getSession()).toEqual({ userId: 'new-reader', displayName: 'Reader', username: 'reader', role: 'user' });
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/blogs');
  });
  it.each(['writespace_users', 'writespace_session'])('shows failure at %s without navigation or success UI', async (failedKey) => {
    const user = userEvent.setup();
    mount();
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === failedKey) throw new Error('denied');
      return original.call(this, key, value);
    });
    for (const [label, value] of Object.entries(values)) await user.type(screen.getByLabelText(label, { exact: true }), value);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not complete registration.');
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/register');
    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
    expect(getSession()).toBeNull();
    expect(getUsers()).toHaveLength(failedKey === 'writespace_users' ? 0 : 1);
    if (failedKey === 'writespace_session') expect(getUsers()[0].username).toBe('reader');
  });
});

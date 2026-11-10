/** Exercise real login handlers and App identity updates with browser persistence. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../src/App.jsx';
import { getSession } from '../../src/utils/auth.js';
import { saveUsers } from '../../src/utils/storage.js';

/** Display router state for outcome assertions. */
function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

/** Mount the actual account route and shell. */
function mount() {
  render(<MemoryRouter initialEntries={['/login']}><App /><Location /></MemoryRouter>);
}

describe('LoginPage', () => {
  it('renders labeled fields, demo hints and passive storage', () => {
    mount();
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('complementary')).toHaveTextContent('username admin, password admin');
    expect(screen.getByRole('complementary')).toHaveTextContent('plaintext in localStorage');
    expect(screen.getByRole('complementary')).toHaveTextContent('Never use real credentials');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
    expect(getSession()).toBeNull();
  });
  it.each([['admin', 'admin', 'admin', '/admin'], ['reader', 'x', 'user', '/blogs'], ['editor', 'x', 'admin', '/admin']])(
    'signs in %s and persists exact role before shell transition', async (username, password, role, destination) => {
      const user = userEvent.setup();
      saveUsers([{ id: `${username}-id`, displayName: 'Stored identity', username, password, role }]);
      mount();
      await user.type(screen.getByLabelText('Username'), username);
      await user.type(screen.getByLabelText('Password'), password);
      await user.click(screen.getByRole('button', { name: 'Log in', exact: true }));
      expect(screen.getByLabelText('Current route')).toHaveTextContent(destination);
      expect(getSession()).toEqual({
        userId: username === 'admin' ? 'admin' : `${username}-id`, username,
        displayName: username === 'admin' ? 'Admin' : 'Stored identity', role,
      });
      expect(screen.getByRole('navigation', { name: 'Account navigation' })).toBeInTheDocument();
    },
  );
  it.each([['', ''], ['reader', 'wrong'], ['Reader', 'x'], [' reader', 'x']])('shows exact invalid feedback for %s / %s', async (username, password) => {
    const user = userEvent.setup();
    saveUsers([{ id: 'r', displayName: 'Reader', username: 'reader', password: 'x', role: 'user' }]);
    mount();
    if (username) await user.type(screen.getByLabelText('Username'), username);
    if (password) await user.type(screen.getByLabelText('Password'), password);
    await user.click(screen.getByRole('button', { name: 'Log in', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent(/^Invalid username or password\.$/);
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-describedby', 'login-error');
    expect(getSession()).toBeNull();
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/login');
  });
  it('shows invalid result when stored collection read fails', async () => {
    const user = userEvent.setup();
    mount();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    await user.type(screen.getByLabelText('Username'), 'reader');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Log in', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/login');
  });
  it('does not navigate or update authenticated UI after session write failure', async () => {
    const user = userEvent.setup();
    mount();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Log in', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not log in.');
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/login');
    expect(getSession()).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
  });
});

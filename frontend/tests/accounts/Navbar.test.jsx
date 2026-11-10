/** Verify role links, mobile state, passive mount, and explicit logout persistence. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Navbar } from '../../src/components/Navbar.jsx';
import App from '../../src/App.jsx';
import { getSession, setSession } from '../../src/utils/auth.js';

const reader = { userId: 'reader-id', username: 'reader', displayName: 'Reader', role: 'user' };

/** Show the route after real navigation. */
function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

 describe('Navbar', () => {
  it.each(['user', 'admin'])('renders passive %s identity and correct links', (role) => {
    const session = { ...reader, role };
    setSession(session);
    render(<MemoryRouter initialEntries={['/blogs']}><Navbar session={session} onSessionChange={vi.fn()} /><Location /></MemoryRouter>);
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(screen.getByText(`@reader · ${role === 'admin' ? 'Admin' : 'User'}`)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: role === 'admin' ? 'Admin avatar' : 'User avatar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Blogs' })).toHaveAttribute('href', '/blogs');
    expect(screen.getByRole('link', { name: 'Blogs' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Write' })).toHaveAttribute('href', '/write');
    if (role === 'admin') {
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
      expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users');
    } else {
      expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    }
    expect(getSession()).toEqual(session);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/blogs');
  });
  it('toggles navigation and closes after link/home activation without logout', async () => {
    const user = userEvent.setup();
    setSession(reader);
    render(<MemoryRouter><Navbar session={reader} onSessionChange={vi.fn()} /><Location /></MemoryRouter>);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('hidden');
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
    expect(nav).not.toHaveClass('hidden');
    await user.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(nav).toHaveClass('hidden');
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await user.click(screen.getByRole('link', { name: 'Write', exact: true }));
    expect(nav).toHaveClass('hidden');
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/write');
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    await user.click(screen.getByRole('link', { name: 'WriteSpace home' }));
    expect(nav).toHaveClass('hidden');
    expect(getSession()).toEqual(reader);
  });
  it('explicit logout clears only session and switches App to public landing', async () => {
    const user = userEvent.setup();
    setSession(reader);
    localStorage.setItem('writespace_users', '[{"username":"keep"}]');
    localStorage.setItem('writespace_posts', '[]');
    render(<MemoryRouter initialEntries={['/blogs']}><App /><Location /></MemoryRouter>);
    expect(getSession()).toEqual(reader);
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBeNull();
    expect(localStorage.getItem('writespace_users')).toBe('[{"username":"keep"}]');
    expect(localStorage.getItem('writespace_posts')).toBe('[]');
    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
    expect(screen.getByLabelText('Current route').textContent).toBe('/');
  });
  it('retains signed-in identity and route when removal fails', async () => {
    const user = userEvent.setup();
    setSession(reader);
    render(<MemoryRouter initialEntries={['/blogs']}><App /><Location /></MemoryRouter>);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not log out.');
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/blogs');
    expect(getSession()).toEqual(reader);
  });
});

/** Verify guards and real App initial-entry routing with persisted identities. */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../../src/components/ProtectedRoute.jsx';
import App from '../../src/App.jsx';
import { getSession, setSession } from '../../src/utils/auth.js';

const reader = { userId: 'reader-id', username: 'reader', displayName: 'Reader', role: 'user' };

/** Expose the actual route after guard replacement. */
function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

/** Mount guard with real router destinations. */
function mountGuard(session, options = {}) {
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Location />
      <Routes>
        <Route path="/protected" element={
          <ProtectedRoute session={session} {...options}>
            <h1>Permitted content</h1>
          </ProtectedRoute>
        } />
        <Route path="/login" element={<h1>Login destination</h1>} />
        <Route path="/blogs" element={<h1>Blogs destination</h1>} />
        <Route path="/admin" element={<h1>Admin destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it.each([null, {}, { ...reader, role: 'owner' }, { ...reader, userId: '' }])('redirects invalid guests without storage mutation', (session) => {
    mountGuard(session);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/login');
    expect(screen.queryByText('Permitted content')).not.toBeInTheDocument();
    expect(getSession()).toBeNull();
  });
  it.each(['user', 'admin'])('permits valid %s common routes', (role) => {
    mountGuard({ ...reader, role });
    expect(screen.getByText('Permitted content')).toBeInTheDocument();
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/protected');
  });
  it('rejects guest on adminOnly', () => {
    mountGuard(null, { adminOnly: true });
    expect(screen.getByText('Login destination')).toBeInTheDocument();
  });
  it('redirects ordinary user from adminOnly to blogs', () => {
    mountGuard(reader, { adminOnly: true });
    expect(screen.getByText('Blogs destination')).toBeInTheDocument();
  });
  it('permits Admin on adminOnly', () => {
    mountGuard({ ...reader, role: 'admin' }, { adminOnly: true });
    expect(screen.getByText('Permitted content')).toBeInTheDocument();
  });
  it('allows guest-only content for guests', () => {
    mountGuard(null, { guestOnly: true });
    expect(screen.getByText('Permitted content')).toBeInTheDocument();
  });
  it.each([['user', '/blogs'], ['admin', '/admin']])('redirects %s from guest-only to role home', (role, destination) => {
    mountGuard({ ...reader, role }, { guestOnly: true });
    expect(screen.getByLabelText('Current route')).toHaveTextContent(destination);
    expect(screen.queryByText('Permitted content')).not.toBeInTheDocument();
  });
});

describe('App account wiring', () => {
  it.each(['/blogs', '/blog/local-id', '/write', '/edit/local-id', '/admin', '/users'])('gates initial guest entry %s', (path) => {
    render(<MemoryRouter initialEntries={[path]}><App /><Location /></MemoryRouter>);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/login');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back.');
  });
  it.each(['/login', '/register'])('loads valid persisted Admin and redirects %s', (path) => {
    setSession({ ...reader, role: 'admin' });
    render(<MemoryRouter initialEntries={[path]}><App /><Location /></MemoryRouter>);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/admin');
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(getSession().role).toBe('admin');
  });
  it.each(['/admin', '/users'])('redirects persisted regular identity at %s', (path) => {
    setSession(reader);
    render(<MemoryRouter initialEntries={[path]}><App /><Location /></MemoryRouter>);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/blogs');
    expect(screen.getByRole('heading')).toHaveTextContent('Page not found');
  });
  it('keeps genuine unknown fallback public and malformed session closed', () => {
    localStorage.setItem('writespace_session', '{bad');
    render(<MemoryRouter initialEntries={['/unknown']}><App /><Location /></MemoryRouter>);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/unknown');
    expect(screen.getByRole('heading')).toHaveTextContent('Page not found');
    expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
  });
  it.each([['user', 'Explore blogs', '/blogs'], ['admin', 'Open dashboard', '/admin']])('passes %s identity to landing CTA', (role, label, path) => {
    setSession({ ...reader, role });
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getAllByRole('link', { name: label })[0]).toHaveAttribute('href', path);
    expect(screen.getByRole('navigation', { name: 'Account navigation' })).toBeInTheDocument();
  });
});

/** Provide role navigation, local identity, and explicit failure-aware logout. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar.jsx';
import { clearSession } from '../utils/auth.js';

/** Render signed-in navigation without changing identity on mount.
 * Args:
 *   session: Current valid local identity.
 *   onSessionChange: Update the application only after successful storage removal.
 * Returns:
 *   Responsive header with role links and a logout action.
 */
export function Navbar({ session, onSessionChange }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const links = session.role === 'admin'
    ? [['/admin', 'Dashboard'], ['/blogs', 'Blogs'], ['/write', 'Write'], ['/users', 'Users']]
    : [['/blogs', 'Blogs'], ['/write', 'Write']];

  /** Clear persistence before changing the signed-in UI or route. */
  function handleLogout() {
    setError('');
    try {
      clearSession();
    } catch {
      setError('Could not log out. Browser storage is unavailable. Your session has not been cleared.');
      return;
    }
    onSessionChange(null);
    setOpen(false);
    navigate('/');
  }

  return (
    <header className="border-b border-border">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-surface focus:p-4">
        Skip to content
      </a>
      <div className="page-container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
        <Link to="/" aria-label="WriteSpace home" className="font-display text-xl" onClick={() => setOpen(false)}>
          WriteSpace
        </Link>
        <button
          type="button"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-controls="account-navigation"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded border border-border sm:hidden"
          onClick={() => setOpen(!open)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" d={open ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
        <nav
          id="account-navigation"
          aria-label="Account navigation"
          className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-4 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-6`}
        >
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `text-link rounded px-2 py-2 ${isActive ? 'bg-surface-raised font-semibold' : ''}`}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          <div className="flex min-w-0 items-center gap-3">
            <Avatar role={session.role} size="sm" />
            <div className="min-w-0 text-sm">
              <p className="break-words font-medium">{session.displayName}</p>
              <p className="break-words text-xs text-foreground-muted">@{session.username} · {session.role === 'admin' ? 'Admin' : 'User'}</p>
            </div>
          </div>
          <button type="button" className="button-secondary" onClick={handleLogout}>Log out</button>
        </nav>
      </div>
      {error && <p role="alert" className="page-container pb-4 text-sm text-error">{error}</p>}
    </header>
  );
}
Navbar.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string.isRequired, username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired, role: PropTypes.oneOf(['admin', 'user']).isRequired,
  }).isRequired,
  onSessionChange: PropTypes.func.isRequired,
};

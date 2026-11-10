/** Provide public entry links and an explicitly activated mobile menu. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar.jsx';

/** Render the public header without changing storage or navigating on mount. */
export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-border">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-surface focus:p-4">
        Skip to content
      </a>
      <div className="page-container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
        <Link to="/" aria-label="WriteSpace home" className="flex items-center gap-3 font-display text-xl">
          <Avatar size="sm" />
          <span>WriteSpace</span>
        </Link>
        <button
          type="button"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-controls="public-navigation"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded border border-border sm:hidden"
          onClick={() => setOpen(!open)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" d={open ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
        <nav
          id="public-navigation"
          aria-label="Public navigation"
          className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-4 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-8`}
        >
          <a className="text-link py-2" href="/#features" onClick={() => setOpen(false)}>
            Features
          </a>
          <Link className="text-link py-2" to="/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link className="button-secondary" to="/register" onClick={() => setOpen(false)}>
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

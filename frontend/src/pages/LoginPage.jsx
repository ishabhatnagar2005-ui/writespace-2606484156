/** Offer exact local demo login with visible validation and storage failures. */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { getRoleHome, INVALID_CREDENTIALS, login, setSession } from '../utils/auth.js';

/** Establish identity only after a successful synchronous session write.
 * Args:
 *   onSessionChange: Application identity updater.
 * Returns:
 *   Accessible local login form and demo disclosure.
 */
export default function LoginPage({ onSessionChange }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Log in · WriteSpace'; }, []);

  /** Validate credentials and persist before changing UI or route. */
  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const session = login(username, password);
    if (!session) {
      setError(INVALID_CREDENTIALS);
      return;
    }
    try {
      setSession(session);
    } catch {
      setError('Could not log in. Browser storage is unavailable. No new session was saved.');
      return;
    }
    onSessionChange(session);
    navigate(getRoleHome(session));
  }

  return (
    <main id="main-content" className="page-container py-16 sm:py-24">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl">Welcome back.</h1>
        <p className="mb-8 mt-4 text-foreground-muted">Log in to your browser-local WriteSpace account.</p>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label htmlFor="login-username" className="mb-2 block font-medium">Username</label>
            <input
              id="login-username" name="username" autoComplete="username" required aria-required="true"
              className="w-full" value={username} onChange={(event) => setUsername(event.target.value)}
              aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block font-medium">Password</label>
            <input
              id="login-password" name="password" type="password" autoComplete="current-password" required aria-required="true"
              className="w-full" value={password} onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          {error && <p id="login-error" role="alert" className="text-sm text-error">{error}</p>}
          <button type="submit" className="button-primary w-full">Log in</button>
        </form>
        <p className="mt-6 text-sm">New here? <Link className="text-link" to="/register">Create an account</Link></p>
        <aside className="mt-10 border-t border-border pt-6 text-sm text-foreground-muted" aria-label="Demo account warning">
          <p>Demo Admin: username <strong>admin</strong>, password <strong>admin</strong>.</p>
          <p className="mt-3">
            Browser-local demo only. Passwords are stored in plaintext in localStorage. Never use real credentials or sensitive information.
          </p>
          <p className="mt-3">Client-side role checks are not secure authorization. Accounts and sessions are not shared across browsers or devices.</p>
        </aside>
      </div>
    </main>
  );
}
LoginPage.propTypes = { onSessionChange: PropTypes.func.isRequired };

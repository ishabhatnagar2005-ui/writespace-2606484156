/** Create local demo accounts and safeguard permanent/current identities. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate } from 'react-router-dom';
import { UserRow } from '../components/UserRow.jsx';
import { getSession, isValidSession } from '../utils/auth.js';
import { getUsers, saveUsers } from '../utils/storage.js';

const blank = { displayName: '', username: '', password: '', role: '' };
const labels = { displayName: 'Display Name', username: 'Username', password: 'Password', role: 'Role' };
const builtIn = { id: 'admin', displayName: 'Admin', username: 'admin', role: 'admin' };

/** Render account creation and responsive lists for a valid Admin.
 * Args:
 *   session: Route identity used alongside fresh persisted identity checks.
 * Returns:
 *   Account management or a role-appropriate redirect.
 */
export default function UserManagement({ session = null }) {
  const [users, setUsers] = useState(() => getUsers());
  const [fields, setFields] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  if (!isValidSession(session)) return <Navigate to="/login" replace />;
  if (session.role !== 'admin') return <Navigate to="/blogs" replace />;

  /** Require the same valid Admin session at the mutation boundary. */
  function activeAdmin() {
    const active = getSession();
    return isValidSession(active) && active.role === 'admin' && active.userId === session.userId ? active : null;
  }

  /** Validate every field against freshly read accounts, preserving exact usernames. */
  function handleCreate(event) {
    event.preventDefault();
    setError('');
    setStatus('');
    const current = getUsers();
    setUsers(current);
    const nextErrors = {};
    for (const [key, label] of Object.entries(labels)) {
      if (typeof fields[key] !== 'string' || !fields[key].trim()) nextErrors[key] = `${label} is required.`;
    }
    if (fields.role && !['admin', 'user'].includes(fields.role)) nextErrors.role = 'Choose User or Admin.';
    if (!nextErrors.username && (fields.username === 'admin' || current.some((user) => user?.username === fields.username))) {
      nextErrors.username = 'Username is already taken.';
    }
    setErrors(nextErrors);
    if (!activeAdmin()) {
      setError('You do not have permission to create accounts.');
      return;
    }
    if (Object.keys(nextErrors).length) return;
    try {
      const account = { id: crypto.randomUUID(), ...fields, createdAt: new Date().toISOString() };
      saveUsers([...current, account]);
      setUsers(getUsers());
      setFields(blank);
      setStatus('Account created.');
    } catch {
      setError('Could not create this account. Your changes were not saved.');
    }
  }

  /** Confirm eligible deletion and re-check fresh identity/record even after stale UI activation. */
  function handleDelete(id) {
    const active = getSession();
    const before = getUsers().find((user) => user?.id === id);
    if (id === 'admin' || before?.username === 'admin' || id === session.userId || id === active?.userId) return;
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    setStatus('');
    setError('');
    const current = getUsers();
    const target = current.find((user) => user?.id === id);
    const fresh = getSession();
    if (!activeAdmin() || id === fresh?.userId || id === 'admin' || target?.username === 'admin') {
      setUsers(current);
      setError('This account cannot be deleted.');
      return;
    }
    if (!target) {
      setUsers(current);
      setError('Account not found. Nothing was deleted.');
      return;
    }
    try {
      saveUsers(current.filter((user) => user?.id !== id));
      setUsers(getUsers());
      setStatus('Account deleted.');
    } catch {
      setError('Could not delete this account. Your changes were not saved.');
    }
  }

  return (
    <main id="main-content" className="page-container py-16 lg:py-24">
      <Link className="text-link" to="/admin">Back to dashboard</Link>
      <h1 className="mt-6 text-4xl">Manage accounts</h1>
      <p className="mt-4 text-sm text-foreground-muted">
        Demo only: passwords are stored as plaintext in this browser. Never use real credentials or sensitive information.
      </p>
      <section aria-labelledby="create-heading" className="mt-12">
        <h2 id="create-heading" className="text-2xl">Create account</h2>
        <form noValidate onSubmit={handleCreate} className="mt-6 grid gap-6 sm:grid-cols-2">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key} className="min-w-0">
              <label htmlFor={`account-${key}`} className="mb-2 block font-medium">{label}</label>
              {key === 'role' ? (
                <select
                  id={`account-${key}`} value={fields[key]} required aria-required="true"
                  aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `account-${key}-error` : undefined}
                  className="w-full" onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
                >
                  <option value="">Choose a role</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <input
                  id={`account-${key}`} type={key === 'password' ? 'password' : 'text'} value={fields[key]}
                  required aria-required="true" aria-invalid={Boolean(errors[key])}
                  aria-describedby={errors[key] ? `account-${key}-error` : undefined}
                  autoComplete={key === 'password' ? 'new-password' : 'off'} className="w-full"
                  onChange={(event) => setFields({ ...fields, [key]: event.target.value })}
                />
              )}
              {errors[key] && (
                <p id={`account-${key}-error`} role="alert" className="mt-2 text-sm text-error">
                  {errors[key]}
                </p>
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <button type="submit" className="button-primary">Create account</button>
          </div>
        </form>
      </section>
      {error && <p role="alert" className="mt-6 text-error">{error}</p>}
      {status && <p role="status" className="mt-6 text-success">{status}</p>}
      <section aria-labelledby="permanent-heading" className="mt-12">
        <h2 id="permanent-heading" className="text-2xl">Built-in Admin</h2>
        <ul>
          <UserRow user={builtIn} currentUserId={session.userId} onDelete={handleDelete} permanent />
        </ul>
      </section>
      <section aria-labelledby="stored-heading" className="mt-12">
        <h2 id="stored-heading" className="text-2xl">Stored accounts</h2>
        {users.length ? (
          <ul>
            {users.filter((user) => user && typeof user.id === 'string' && typeof user.username === 'string').map((user) => (
              <UserRow key={user.id} user={user} currentUserId={session.userId} onDelete={handleDelete} />
            ))}
          </ul>
        ) : <p className="mt-6 text-foreground-muted">No stored accounts yet.</p>}
      </section>
    </main>
  );
}
UserManagement.propTypes = { session: PropTypes.object };

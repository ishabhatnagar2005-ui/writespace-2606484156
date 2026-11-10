/** Resolve demo identities and persist browser-local sessions without security claims. */
import { getUsers, saveUsers } from './storage.js';

const sessionKey = 'writespace_session';
export const INVALID_CREDENTIALS = 'Invalid username or password.';

/** Check the complete local identity shape, failing closed for unknown roles.
 * Args:
 *   session: Untrusted parsed browser identity.
 * Returns:
 *   Whether all required identity fields and the role are valid.
 */
export function isValidSession(session) {
  return Boolean(session && !Array.isArray(session)
    && ['userId', 'username', 'displayName'].every((key) => typeof session[key] === 'string' && session[key].trim() !== '')
    && ['user', 'admin'].includes(session.role));
}

/** Read an identity without repairing missing, invalid, or inaccessible storage.
 * Returns:
 *   A valid local session, or null when unauthenticated.
 */
export function getSession() {
  try {
    const raw = window.localStorage.getItem(sessionKey);
    if (raw === null) return null;
    const session = JSON.parse(raw);
    return isValidSession(session) ? session : null;
  } catch {
    return null;
  }
}

/** Persist a valid local identity before the caller updates UI.
 * Args:
 *   session: Complete identity to persist.
 * Raises:
 *   Validation, serialization, or storage errors; never reports a failed write as success.
 */
export function setSession(session) {
  if (!isValidSession(session)) throw new Error('Invalid session.');
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
}

/** Remove only the identity on explicit logout.
 * Raises:
 *   Browser storage errors; callers must retain signed-in UI on failure.
 */
export function clearSession() {
  window.localStorage.removeItem(sessionKey);
}

/** Choose the role home for a valid signed-in identity.
 * Args:
 *   session: Current identity.
 * Returns:
 *   The Admin dashboard or common blog route.
 */
export function getRoleHome(session) {
  return session?.role === 'admin' ? '/admin' : '/blogs';
}

/** Resolve exact credentials, checking the fixed Admin before stored accounts.
 * Args:
 *   username: Submitted username, compared without normalization.
 *   password: Submitted password, compared exactly.
 * Returns:
 *   A matching valid identity, or null; does not persist or navigate.
 */
export function login(username, password) {
  if (username === 'admin' && password === 'admin') {
    return { userId: 'admin', username: 'admin', displayName: 'Admin', role: 'admin' };
  }
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) return null;
  const account = getUsers().find((user) => user && user.username === username && user.password === password
    && isValidSession({ userId: user.id, username: user.username, displayName: user.displayName, role: user.role }));
  return account ? { userId: account.id, username: account.username, displayName: account.displayName, role: account.role } : null;
}

/** Identify required, matching-password, and exact duplicate registration errors.
 * Args:
 *   fields: Four submitted registration fields.
 *   users: Current collection used for duplicate detection.
 * Returns:
 *   Field-keyed messages; an empty object permits creation.
 */
export function validateRegistration(fields = {}, users = getUsers()) {
  const errors = {};
  const labels = { displayName: 'Display Name', username: 'Username', password: 'Password', confirmPassword: 'Confirm Password' };
  for (const [key, label] of Object.entries(labels)) {
    if (typeof fields?.[key] !== 'string' || fields[key].trim() === '') errors[key] = `${label} is required.`;
  }
  if (!errors.confirmPassword && !errors.password && fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (!errors.username && (fields.username === 'admin' || users.some((user) => user?.username === fields.username))) {
    errors.username = 'Username is already taken.';
  }
  return errors;
}

/** Validate and persist a regular account, then persist its session.
 * Args:
 *   fields: Submitted registration values; any supplied role is ignored.
 * Returns:
 *   Field errors on invalid input, otherwise the created account and session.
 * Raises:
 *   UUID or persistence failures; writes are sequential, with no rollback guarantee.
 */
export function register(fields) {
  const users = getUsers();
  const errors = validateRegistration(fields, users);
  if (Object.keys(errors).length) return { errors };
  const user = {
    id: crypto.randomUUID(), displayName: fields.displayName, username: fields.username,
    password: fields.password, role: 'user', createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  const session = { userId: user.id, username: user.username, displayName: user.displayName, role: user.role };
  setSession(session);
  return { user, session };
}

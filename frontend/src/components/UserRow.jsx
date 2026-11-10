/** Present account identity without exposing stored credentials. */
import PropTypes from 'prop-types';
import { Avatar } from './Avatar.jsx';

/** Render a responsive account card/row with guarded deletion.
 * Args:
 *   user: Account identity; passwords are never rendered.
 *   currentUserId: Active account identity that cannot delete itself.
 *   onDelete: Parent mutation handler, invoked only for eligible accounts.
 *   permanent: Mark the separately displayed built-in identity.
 * Returns:
 *   A list item usable at narrow and wide widths.
 */
export function UserRow({ user, currentUserId = '', onDelete, permanent = false }) {
  const protectedAccount = permanent || user.id === 'admin' || user.username === 'admin'
    || user.id === currentUserId;

  /** Reject protected activation even if a caller bypasses the disabled control. */
  function handleDelete() {
    if (!protectedAccount) onDelete(user.id);
  }

  return (
    <li
      aria-label={`Account ${user.username}`}
      className="flex flex-col gap-4 border-b border-border py-6 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar role={user.role} size="sm" />
        <div className="min-w-0">
          <p className="break-words font-medium">{user.displayName}</p>
          <p className="break-all text-sm text-foreground-muted">@{user.username}</p>
        </div>
      </div>
      <div className="text-sm text-foreground-muted sm:w-48">
        <p>{user.role === 'admin' ? 'Admin' : 'User'}</p>
        {permanent && <p>Permanent built-in account</p>}
        {!permanent && user.id === currentUserId && <p>Your current account</p>}
      </div>
      <button
        type="button"
        className="button-secondary text-error disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Delete account ${user.username}`}
        disabled={protectedAccount}
        onClick={handleDelete}
      >
        Delete
      </button>
    </li>
  );
}
UserRow.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired, username: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired, role: PropTypes.oneOf(['admin', 'user']).isRequired,
  }).isRequired,
  currentUserId: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
  permanent: PropTypes.bool,
};

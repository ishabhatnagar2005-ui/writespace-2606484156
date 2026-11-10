/** Render consistent static role marks without remote profile images. */
import PropTypes from 'prop-types';

const variants = {
  admin: 'bg-avatar-admin-bg text-avatar-admin',
  user: 'bg-avatar-user-bg text-avatar-user',
};
const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };

/** Render a role avatar; unknown roles use the ordinary reader mark.
 * Args:
 *   role: Local role identifying a crown or book.
 *   size: Shared avatar size.
 * Returns:
 *   A labeled static role image.
 */
export function Avatar({ role = 'user', size = 'md' }) {
  const resolvedRole = role === 'admin' ? 'admin' : 'user';
  return (
    <span
      role="img"
      aria-label={resolvedRole === 'admin' ? 'Admin avatar' : 'User avatar'}
      className={`inline-flex shrink-0 items-center justify-center rounded-md ${variants[resolvedRole]} ${sizes[size] || sizes.md}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {resolvedRole === 'admin' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 6 4 4 5-6 5 6 4-4-2 12H5L3 6Zm3 15h12" />
        ) : (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z" />
            <path d="M12 5v15" />
          </>
        )}
      </svg>
    </span>
  );
}
Avatar.propTypes = { role: PropTypes.string, size: PropTypes.oneOf(['sm', 'md', 'lg']) };

/** Return the static role avatar used beside local identities.
 * Args:
 *   role: Local account role.
 * Returns:
 *   Crown for Admin, book otherwise.
 */
export function getAvatar(role) {
  return <Avatar role={role} />;
}

/** Centralize browser-only guest and role routing boundaries. */
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { getRoleHome, isValidSession } from '../utils/auth.js';

/** Render permitted content or redirect to the appropriate local entry.
 * Args:
 *   children: Route content, including genuine unknown-page fallbacks.
 *   session: Current untrusted local identity.
 *   adminOnly: Require the Admin role.
 *   guestOnly: Restrict login and registration to guests.
 * Returns:
 *   Content or a replacement redirect; never changes storage.
 */
export function ProtectedRoute({ children, session = null, adminOnly = false, guestOnly = false }) {
  const valid = isValidSession(session);
  if (guestOnly) return valid ? <Navigate to={getRoleHome(session)} replace /> : children;
  if (!valid) return <Navigate to="/login" replace />;
  if (adminOnly && session.role !== 'admin') return <Navigate to="/blogs" replace />;
  return children;
}
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  session: PropTypes.object,
  adminOnly: PropTypes.bool,
  guestOnly: PropTypes.bool,
};

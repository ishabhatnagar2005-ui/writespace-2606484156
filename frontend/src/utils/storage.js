/** Keep browser-local collection reads forgiving and writes explicit. */

/** Read a collection without repairing or overwriting unreadable data.
 * Args:
 *   key: Browser storage key for the collection.
 * Returns:
 *   The parsed array, or an empty array when missing, invalid, or inaccessible.
 */
function readCollection(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Return local posts, falling back to an empty collection on read failure. */
export function getPosts() {
  return readCollection('writespace_posts');
}

/** Persist the caller's complete post collection.
 * Args:
 *   posts: Updated post collection.
 * Raises:
 *   Serialization or browser storage errors; persistence is not successful then.
 */
export function savePosts(posts) {
  window.localStorage.setItem('writespace_posts', JSON.stringify(posts));
}

/** Return local users, falling back to an empty collection on read failure. */
export function getUsers() {
  return readCollection('writespace_users');
}

/** Persist the caller's complete account collection.
 * Args:
 *   users: Updated account collection.
 * Raises:
 *   Serialization or browser storage errors; no retry or recovery is attempted.
 */
export function saveUsers(users) {
  window.localStorage.setItem('writespace_users', JSON.stringify(users));
}

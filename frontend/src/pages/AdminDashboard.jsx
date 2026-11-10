/** Show browser-local oversight and explicit post management for Admins. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard.jsx';
import { getSession, isValidSession } from '../utils/auth.js';
import { getPosts, getUsers, savePosts } from '../utils/storage.js';

/** Render real metrics and the newest five records without side effects.
 * Args:
 *   session: Route identity, required to be a valid Admin.
 * Returns:
 *   Oversight page or role-appropriate redirect.
 */
export default function AdminDashboard({ session = null }) {
  const [posts, setPosts] = useState(() => getPosts());
  const [users, setUsers] = useState(() => getUsers());
  const [error, setError] = useState('');
  if (!isValidSession(session)) return <Navigate to="/login" replace />;
  if (session.role !== 'admin') return <Navigate to="/blogs" replace />;
  const recent = posts.filter((post) => post && typeof post.id === 'string' && typeof post.title === 'string')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  /** Re-read identity and posts after confirmation, then persist only an allowed deletion. */
  function handleDelete(id) {
    if (!window.confirm('Delete this blog? This cannot be undone.')) return;
    setError('');
    const active = getSession();
    const current = getPosts();
    if (!isValidSession(active) || active.role !== 'admin' || active.userId !== session.userId) {
      setError('You do not have permission to delete this blog.');
      return;
    }
    if (!current.some((post) => post?.id === id)) {
      setPosts(current);
      setError('Post not found. Nothing was deleted.');
      return;
    }
    try {
      savePosts(current.filter((post) => post?.id !== id));
      setPosts(getPosts());
      setUsers(getUsers());
    } catch {
      setError('Could not delete this blog. Your changes were not saved.');
    }
  }

  return (
    <main id="main-content" className="page-container py-16 lg:py-24">
      <h1 className="text-4xl">Admin dashboard</h1>
      <p className="mt-4 text-foreground-muted">An overview of this browser’s WriteSpace.</p>
      <dl aria-label="Statistics" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total posts" value={posts.length} />
        <StatCard label="Total users" value={users.length + 1} />
        <StatCard label="Admins" value={users.filter((user) => user?.role === 'admin').length + 1} />
        <StatCard label="Your posts" value={posts.filter((post) => post?.authorId === session.userId).length} />
      </dl>
      <nav aria-label="Quick actions" className="my-12 flex flex-wrap gap-4">
        <Link className="button-primary" to="/write">Write a blog</Link>
        <Link className="button-secondary" to="/users">Manage accounts</Link>
      </nav>
      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-2xl">Recent posts</h2>
        {error && <p role="alert" className="mt-4 text-error">{error}</p>}
        {recent.length ? (
          <ul className="mt-4">
            {recent.map((post) => (
              <li key={post.id} className="flex flex-col gap-4 border-b border-border py-6 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link className="text-link break-words font-medium" to={`/blog/${encodeURIComponent(post.id)}`}>
                    {post.title}
                  </Link>
                  <p className="mt-1 break-words text-sm text-foreground-muted">{post.authorName}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link className="button-secondary" aria-label={`Edit ${post.title}`} to={`/edit/${encodeURIComponent(post.id)}`}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="button-secondary text-error"
                    aria-label={`Delete ${post.title}`}
                    onClick={() => handleDelete(post.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-6 text-foreground-muted">No posts yet.</p>}
      </section>
    </main>
  );
}
AdminDashboard.propTypes = { session: PropTypes.object };

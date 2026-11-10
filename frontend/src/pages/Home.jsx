/** List every readable browser-local post without changing stored data. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { BlogCard } from '../components/BlogCard.jsx';
import { getPosts } from '../utils/storage.js';

/** Render a newest-first collection and its empty writing invitation.
 * Args:
 *   session: Local identity supplied by the route shell.
 * Returns:
 *   A responsive, semantic post listing.
 */
export default function Home({ session = null }) {
  const [posts] = useState(() => getPosts()
    .filter((post) => post && ['id', 'title', 'content', 'createdAt', 'authorName'].every((key) => typeof post[key] === 'string'))
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)));
  return (
    <main id="main-content" className="page-container py-16 lg:py-24">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-4 text-xs uppercase tracking-widest text-foreground-muted">From this browser</p>
          <h1 className="text-4xl tracking-tight">Blogs</h1>
          {session && (
            <p className="mt-4 break-words text-foreground-muted">Find your next read, {session.displayName}.</p>
          )}
        </div>
        <Link className="button-primary" to="/write">Write a blog</Link>
      </header>
      {posts.length ? (
        <section aria-label="Blog posts" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <BlogCard key={post.id} post={post} index={index} />
          ))}
        </section>
      ) : (
        <p className="border-y border-border py-10 text-foreground-muted">No blogs yet. Be the first to write one!</p>
      )}
    </main>
  );
}
Home.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string,
    username: PropTypes.string,
    displayName: PropTypes.string,
    role: PropTypes.oneOf(['admin', 'user']),
  }),
};

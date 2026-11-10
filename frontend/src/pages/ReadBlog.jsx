/** Read full local text and perform only explicitly confirmed, permitted deletion. */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { isValidSession } from '../utils/auth.js';
import { getPosts, savePosts } from '../utils/storage.js';

/** Find a displayable record without guessing or repairing malformed fields.
 * Args:
 *   posts: Current browser-local collection.
 *   id: Reader route identity.
 * Returns:
 *   A complete readable post, or null.
 */
function findPost(posts, id) {
  return posts.find((post) => post && post.id === id
    && ['id', 'title', 'content', 'createdAt', 'authorName'].every((key) => typeof post[key] === 'string')) || null;
}

/** Check the local role or matching owner independently of visible controls.
 * Args:
 *   session: Current route identity.
 *   post: Record being managed.
 * Returns:
 *   Whether this identity may manage the record in the demo UI.
 */
function canManage(session, post) {
  return isValidSession(session) && Boolean(post)
    && (session.role === 'admin' || post.authorId === session.userId);
}

/** Render safe full text, metadata, missing state, and permitted controls.
 * Args:
 *   session: Current local identity supplied by the route shell.
 * Returns:
 *   A reader with whitespace preserved and visible mutation failures.
 */
export default function ReadBlog({ session = null }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(() => findPost(getPosts(), id));
  const [error, setError] = useState('');
  useEffect(() => {
    setPost(findPost(getPosts(), id));
    setError('');
  }, [id]);

  /** Re-read after confirmation and reject missing or newly unauthorized records.
   * Notes:
   *   Cancel changes neither state nor navigation. Failed writes stay on the reader.
   */
  function handleDelete() {
    if (!window.confirm('Delete this blog? This cannot be undone.')) return;
    const posts = getPosts();
    const currentPost = findPost(posts, id);
    if (!currentPost) {
      setPost(null);
      return;
    }
    if (!canManage(session, currentPost)) {
      setPost(currentPost);
      setError('You do not have permission to delete this blog.');
      return;
    }
    try {
      savePosts(posts.filter((record) => record?.id !== id));
      navigate('/blogs');
    } catch {
      setError('Could not delete this blog. Your changes were not saved.');
    }
  }

  const date = new Date(post?.createdAt);
  const validDate = !Number.isNaN(date.getTime());
  return (
    <main id="main-content" className="page-container py-16 lg:py-24">
      <nav aria-label="Reader navigation" className="mb-10">
        <Link className="text-link" to="/blogs">Back to blogs</Link>
      </nav>
      {post ? (
        <article aria-labelledby="post-title" className="mx-auto max-w-prose">
          <header className="mb-10">
            <h1 id="post-title" className="break-words text-4xl tracking-tight">{post.title}</h1>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
              <Avatar />
              <span className="min-w-0 break-words">{post.authorName}</span>
              <time dateTime={validDate ? date.toISOString() : undefined}>
                {validDate
                  ? new Intl.DateTimeFormat('en-US', {
                    month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC',
                  }).format(date)
                  : 'Date unavailable'}
              </time>
            </div>
          </header>
          <div className="whitespace-pre-wrap break-words text-lg">{post.content}</div>
          {canManage(session, post) && (
            <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6">
              <Link className="button-secondary" to={`/edit/${encodeURIComponent(post.id)}`}>Edit blog</Link>
              <button type="button" className="button-secondary text-error" onClick={handleDelete}>Delete blog</button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-6 text-sm text-error">{error}</p>
          )}
        </article>
      ) : (
        <h1 className="text-4xl">Post not found</h1>
      )}
    </main>
  );
}
ReadBlog.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string,
    username: PropTypes.string,
    displayName: PropTypes.string,
    role: PropTypes.oneOf(['admin', 'user']),
  }),
};

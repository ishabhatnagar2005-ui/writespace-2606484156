/** Compose browser-local posts without normalizing text or claiming failed saves. */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { isValidSession } from '../utils/auth.js';
import { getPosts, savePosts } from '../utils/storage.js';

/** Find a complete editable record without repairing malformed browser data.
 * Args:
 *   posts: Current local collection.
 *   id: Edit route identity.
 * Returns:
 *   The matching post, or null.
 */
function findPost(posts, id) {
  return posts.find((post) => post && post.id === id
    && ['id', 'title', 'content', 'createdAt', 'authorId', 'authorName']
      .every((key) => typeof post[key] === 'string')) || null;
}

/** Allow only the current owner or a valid Admin to edit in the demo UI. */
function canEdit(session, post) {
  return isValidSession(session) && Boolean(post)
    && (session.role === 'admin' || post.authorId === session.userId);
}

/** Render required fields and persist only explicitly submitted, permitted changes.
 * Args:
 *   session: Local identity supplied by the route shell.
 * Returns:
 *   A create/edit form, missing state, or fail-closed route redirect.
 */
export default function WriteBlog({ session = null }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(() => id ? findPost(getPosts(), id) : null);
  const [values, setValues] = useState(() => ({ title: post?.title || '', content: post?.content || '' }));
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');

  useEffect(() => {
    const currentPost = id ? findPost(getPosts(), id) : null;
    setPost(currentPost);
    setValues({ title: currentPost?.title || '', content: currentPost?.content || '' });
    setErrors({});
    setFailure('');
    document.title = `${id ? 'Edit blog' : 'Write a blog'} · WriteSpace`;
  }, [id]);

  /** Validate fields and re-read ownership and metadata immediately before saving.
   * Notes:
   *   Storage and UUID failures remain on the form with non-success feedback.
   */
  function handleSubmit(event) {
    event.preventDefault();
    setFailure('');
    if (!isValidSession(session)) {
      navigate('/login', { replace: true });
      return;
    }
    const fieldErrors = {};
    if (!values.title.trim()) fieldErrors.title = 'Title is required.';
    if (!values.content.trim()) fieldErrors.content = 'Content is required.';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    const posts = getPosts();
    const currentPost = id ? findPost(posts, id) : null;
    if (id && !currentPost) {
      setPost(null);
      return;
    }
    if (id && !canEdit(session, currentPost)) {
      navigate('/blogs', { replace: true });
      return;
    }
    let savedPost;
    try {
      savedPost = id ? { ...currentPost, title: values.title, content: values.content } : {
        id: crypto.randomUUID(),
        title: values.title,
        content: values.content,
        createdAt: new Date().toISOString(),
        authorId: session.userId,
        authorName: session.displayName,
      };
      savePosts(id ? posts.map((record) => record?.id === id ? savedPost : record) : [...posts, savedPost]);
    } catch {
      setFailure('Could not save this blog. Your changes were not saved.');
      return;
    }
    navigate(`/blog/${encodeURIComponent(savedPost.id)}`);
  }

  if (!isValidSession(session)) return <Navigate to="/login" replace />;
  if (id && post && !canEdit(session, post)) return <Navigate to="/blogs" replace />;

  return (
    <main id="main-content" className="page-container py-16 lg:py-24">
      <div className="mx-auto max-w-prose">
        {id && !post ? (
          <>
            <h1 className="text-4xl">Post not found</h1>
            <Link className="text-link mt-6 inline-block" to="/blogs">Back to blogs</Link>
          </>
        ) : (
          <>
            <header className="mb-10">
              <h1 className="text-4xl tracking-tight">{id ? 'Edit blog' : 'Write a blog'}</h1>
              <p className="mt-4 text-foreground-muted">Your words, saved in this browser. Never include sensitive information.</p>
            </header>
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="blog-title" className="mb-2 block font-medium">Title</label>
                <input
                  id="blog-title" name="title" type="text" required aria-required="true"
                  className={`w-full ${errors.title ? 'border-error' : ''}`}
                  value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })}
                  aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'blog-title-error' : undefined}
                />
                {errors.title && (
                  <p id="blog-title-error" role="alert" className="mt-2 text-sm text-error">{errors.title}</p>
                )}
              </div>
              <div>
                <label htmlFor="blog-content" className="mb-2 block font-medium">Content</label>
                <textarea
                  id="blog-content" name="content" required aria-required="true"
                  className={`min-h-64 w-full resize-y ${errors.content ? 'border-error' : ''}`}
                  value={values.content} onChange={(event) => setValues({ ...values, content: event.target.value })}
                  aria-invalid={Boolean(errors.content)}
                  aria-describedby={errors.content ? 'blog-content-error blog-counter' : 'blog-counter'}
                />
                {errors.content && (
                  <p id="blog-content-error" role="alert" className="mt-2 text-sm text-error">{errors.content}</p>
                )}
                <p id="blog-counter" className="mt-2 text-sm tabular-nums text-foreground-muted">
                  {values.content.length} characters
                </p>
              </div>
              {failure && (
                <p role="alert" className="text-sm text-error">{failure}</p>
              )}
              <div className="flex flex-wrap gap-4">
                <button type="submit" className="button-primary">{id ? 'Save changes' : 'Publish blog'}</button>
                <Link className="button-secondary" to="/blogs">Cancel</Link>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
WriteBlog.propTypes = {
  session: PropTypes.shape({
    userId: PropTypes.string,
    username: PropTypes.string,
    displayName: PropTypes.string,
    role: PropTypes.oneOf(['admin', 'user']),
  }),
};

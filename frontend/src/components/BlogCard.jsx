/** Present safe text previews from real browser-local post records. */
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar.jsx';

const borders = ['border-t-card-indigo', 'border-t-card-violet', 'border-t-card-pink', 'border-t-card-teal'];

/** Render a linked post preview with a deterministic border and bounded excerpt.
 * Args:
 *   post: Browser-local post with identity, text, author, and creation date.
 *   index: Card position controlling its border in the four-color sequence.
 * Returns:
 *   An article with a protected reader destination.
 */
export function BlogCard({ post, index = 0 }) {
  const date = new Date(post.createdAt);
  const validDate = !Number.isNaN(date.getTime());
  const formatted = validDate
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date)
    : 'Date unavailable';
  return (
    <article className={`flex h-full flex-col rounded-md border border-border border-t-2 bg-surface p-6 ${borders[((index % 4) + 4) % 4]}`}>
      <time className="text-xs text-foreground-muted" dateTime={validDate ? date.toISOString() : undefined}>{formatted}</time>
      <h3 className="mb-3 mt-4 break-words text-xl">
        <Link className="text-link" to={`/blog/${encodeURIComponent(post.id)}`}>{post.title}</Link>
      </h3>
      <p className="mb-6 break-words text-sm text-foreground-muted">{post.content.slice(0, 120)}</p>
      <div className="mt-auto flex items-center gap-3 text-sm">
        <Avatar size="sm" />
        <span className="break-words">{post.authorName}</span>
      </div>
      <Link className="text-link mt-5 self-start text-sm font-semibold" to={`/blog/${encodeURIComponent(post.id)}`} aria-label={`Read ${post.title}`}>
        Read post <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
BlogCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    authorName: PropTypes.string.isRequired,
    authorId: PropTypes.string,
  }).isRequired,
  index: PropTypes.number,
};

/** Introduce the browser-local writing demo and its newest real posts. */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { getPosts } from '../utils/storage.js';
import { BlogCard } from '../components/BlogCard.jsx';
import { getAvatar } from '../components/Avatar.jsx';

const destinations = {
  guest: { to: '/register', label: 'Start writing' },
  user: { to: '/blogs', label: 'Explore blogs' },
  admin: { to: '/admin', label: 'Open dashboard' },
};
const features = [
  ['01', 'Make room for your ideas', 'A simple title and a blank page. Write at your own pace, then return to refine your words.'],
  ['02', 'Read a little deeper', 'Discover recent notes and open a post to enjoy the complete story, without the noise.'],
  ['03', 'Keep it close', 'Your posts and demo accounts live in this browser. No feeds, no tracking, no shared server.'],
];

/** Render the public page with role-aware entry links and no automatic mutations.
 * Args:
 *   session: Current local identity supplied by the account slice, or null for guests.
 * Returns:
 *   A semantic landing page with at most three local post previews.
 */
export default function LandingPage({ session = null }) {
  const [posts] = useState(() => getPosts()
    .filter((post) => post && ['id', 'title', 'content', 'createdAt', 'authorName'].every((key) => typeof post[key] === 'string'))
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
    .slice(0, 3));
  const cta = destinations[session?.role] || destinations.guest;
  return (
    <>
      <main id="main-content">
        <section className="page-container grid items-center gap-12 py-16 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:py-24" aria-labelledby="hero-title">
          <div>
            <p className="mb-6 text-xs font-medium uppercase tracking-widest text-foreground-muted">A little space. A lot of possibility.</p>
            <h1 id="hero-title" className="max-w-xl text-4xl tracking-tight sm:text-5xl">Good ideas deserve a place to grow.</h1>
            <p className="mb-8 mt-6 max-w-lg text-lg text-foreground-muted">
              A quiet corner for your thoughts, stories, and fresh perspectives. Find your words with WriteSpace.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Link className="button-primary" to={cta.to}>{cta.label}</Link>
              <a className="text-link text-sm" href="#latest-posts">
                Discover recent posts <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <figure
            className="rounded-md border border-border bg-surface p-8 motion-safe:animate-float motion-reduce:animate-none"
            aria-label="A blank page illustration"
          >
            <div className="mb-8 flex items-center gap-3 text-sm text-foreground-muted">
              {getAvatar('user')}
              <span>Your next chapter</span>
            </div>
            <p className="font-display text-2xl">It starts with a thought.</p>
            <div className="my-8 space-y-4" aria-hidden="true">
              <div className="h-px w-full bg-border" />
              <div className="h-px w-full bg-border" />
              <div className="h-px w-3/4 bg-border" />
            </div>
            <figcaption className="text-xs text-foreground-muted">A blank page, ready when you are. Illustration only.</figcaption>
          </figure>
        </section>

        <section id="features" className="page-container py-16" aria-labelledby="features-title">
          <p className="mb-4 text-xs uppercase tracking-widest text-foreground-muted">Less noise, more meaning</p>
          <h2 id="features-title" className="mb-10 text-3xl tracking-tight">Just you and your words.</h2>
          <div className="grid gap-10 md:grid-cols-3">
            {features.map(([number, title, description]) => (
              <div key={number}>
                <span className="text-xs tabular-nums text-foreground-muted" aria-hidden="true">{number}</span>
                <h3 className="mb-3 mt-4 text-xl">{title}</h3>
                <p className="max-w-prose text-sm text-foreground-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="latest-posts" className="page-container py-16" aria-labelledby="latest-title">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-foreground-muted">From this browser</p>
              <h2 id="latest-title" className="text-3xl tracking-tight">Latest posts</h2>
            </div>
            <Link className="text-link text-sm" to="/blogs">
              View all blogs <span aria-hidden="true">→</span>
            </Link>
          </div>
          {posts.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ))}
            </div>
          ) : (
            <p className="border-y border-border py-10 text-foreground-muted">No posts yet — check back soon!</p>
          )}
        </section>

        <section className="page-container py-16 text-center" aria-labelledby="start-title">
          <h2 id="start-title" className="text-3xl tracking-tight">Your next story starts here.</h2>
          <p className="mb-8 mt-4 text-foreground-muted">Bring a thought. Give it a little space.</p>
          <Link className="button-primary" to={cta.to}>{cta.label}</Link>
        </section>
      </main>
      <footer className="mt-8 border-t border-border py-8">
        <div className="page-container flex flex-col justify-between gap-6 sm:flex-row">
          <p className="font-display text-xl">WriteSpace</p>
          <div className="max-w-prose text-sm text-foreground-muted">
            <p>Browser-local demo only. Passwords are stored in plaintext in this browser. Never use real credentials or sensitive information.</p>
            <p className="mt-2">
              Posts, accounts, and sessions are not shared across browsers or devices. Client-side role checks are not secure authorization.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
LandingPage.propTypes = {
  session: PropTypes.shape({ userId: PropTypes.string, username: PropTypes.string, displayName: PropTypes.string, role: PropTypes.oneOf(['admin', 'user']) }),
};

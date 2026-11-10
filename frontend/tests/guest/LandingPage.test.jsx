/** Verify real bounded previews, empty boundaries, role CTA, and route fallback. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../../src/pages/LandingPage.jsx';
import App from '../../src/App.jsx';
import { savePosts, getPosts } from '../../src/utils/storage.js';

describe('LandingPage', () => {
  it('renders the empty public page, warning, and passive illustration', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good ideas deserve a place to grow.');
    expect(screen.getByText('No posts yet — check back soon!')).toBeInTheDocument();
    expect(screen.getByText(/Passwords are stored in plaintext/)).toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveClass('motion-reduce:animate-none');
    expect(getPosts()).toEqual([]);
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });
  it('shows only the newest three real records without rewriting stored order', () => {
    const posts = [1, 4, 2, 3].map((day) => ({ id: String(day), title: `Note ${day}`, content: `Local content ${day}`, createdAt: `2026-11-0${day}T00:00:00.000Z`, authorName: 'Reader' }));
    savePosts(posts);
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getAllByRole('article').map((article) => article.querySelector('h3').textContent)).toEqual(['Note 4', 'Note 3', 'Note 2']);
    expect(screen.queryByText('Note 1')).not.toBeInTheDocument();
    expect(getPosts()).toEqual(posts);
  });
  it.each(['{broken', '{}', '[null,42,{"title":"incomplete"}]'])('shows the exact empty fallback for unreadable records %s', (raw) => {
    localStorage.setItem('writespace_posts', raw);
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText('No posts yet — check back soon!')).toBeInTheDocument();
    expect(localStorage.getItem('writespace_posts')).toBe(raw);
  });
  it('shows the empty fallback when browser collection reads throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText('No posts yet — check back soon!')).toBeInTheDocument();
  });
  it.each([[null, 'Start writing', '/register'], [{ role: 'user' }, 'Explore blogs', '/blogs'], [{ role: 'admin' }, 'Open dashboard', '/admin']])('uses the role-specific CTA for %j', (session, label, to) => {
    render(<MemoryRouter><LandingPage session={session} /></MemoryRouter>);
    for (const link of screen.getAllByRole('link', { name: label })) expect(link).toHaveAttribute('href', to);
  });
  it('keeps malformed-date records readable rather than crashing', () => {
    savePosts([{ id: 'bad-date', title: 'A note', content: '', createdAt: 'invalid', authorName: 'Reader' }]);
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText('Date unavailable')).toBeInTheDocument();
  });
  it('renders a genuine unknown-route fallback and returns home on click', async () => {
    render(<MemoryRouter initialEntries={['/unknown']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Back to WriteSpace' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good ideas deserve a place to grow.');
  });
});

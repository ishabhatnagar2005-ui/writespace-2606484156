/** Verify the complete local list and graceful storage boundaries. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from '../../src/pages/Home.jsx';
import App from '../../src/App.jsx';
import { getPosts, savePosts } from '../../src/utils/storage.js';
import { setSession } from '../../src/utils/auth.js';

const session = { userId: 'owner', username: 'reader', displayName: 'Reader', role: 'user' };
/** Mount the list inside the existing router contract. */
function mount() {
  return render(<MemoryRouter><Home session={session} /></MemoryRouter>);
}
describe('Home', () => {
  it('renders all posts newest first, preserving storage order and linking real records', () => {
    const posts = [1, 4, 2, 3].map((day) => ({
      id: `post-${day}`, title: `Note ${day}`, content: `Body ${day}`, authorName: 'Writer',
      authorId: 'owner', createdAt: `2026-11-0${day}T00:00:00.000Z`,
    }));
    savePosts(posts);
    mount();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Blogs');
    expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent))
      .toEqual(['Note 4', 'Note 3', 'Note 2', 'Note 1']);
    expect(screen.getByRole('region', { name: 'Blog posts' })).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3');
    expect(screen.getByRole('link', { name: 'Read Note 4' })).toHaveAttribute('href', '/blog/post-4');
    expect(getPosts()).toEqual(posts);
  });
  it.each([null, '{bad', '{}', '[]', '[null,{}, {"id":"broken","title":{}}]'])
    ('shows the exact empty invitation and write destination for %s', (raw) => {
      if (raw !== null) localStorage.setItem('writespace_posts', raw);
      mount();
      expect(screen.getByText('No blogs yet. Be the first to write one!')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Write a blog' })).toHaveAttribute('href', '/write');
      expect(localStorage.getItem('writespace_posts')).toBe(raw);
    });
  it('falls back to empty on read denial without writing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    mount();
    expect(screen.getByText('No blogs yet. Be the first to write one!')).toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
  });
  it('renders invalid dates and safe title text without fabricating content', () => {
    savePosts([{ id: 'odd', title: '<img src=x onerror=alert(1)>', content: 'Real body', createdAt: 'bad', authorName: 'Writer' }]);
    const { container } = mount();
    expect(screen.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument();
    expect(screen.getByText('Date unavailable')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
  it.each(['user', 'admin'])('wires %s list to reader while write/edit remain guarded fallbacks', async (role) => {
    setSession({ ...session, role });
    savePosts([{ id: 'local', title: 'Local note', content: 'Full body', createdAt: '2026-11-01', authorName: 'Writer' }]);
    render(<MemoryRouter initialEntries={['/blogs']}><App /></MemoryRouter>);
    await userEvent.setup().click(screen.getByRole('link', { name: 'Read Local note' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Local note');
    await userEvent.setup().click(screen.getByRole('link', { name: 'Back to blogs' }));
    await userEvent.setup().click(screen.getByRole('link', { name: 'Write a blog' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
  });
});

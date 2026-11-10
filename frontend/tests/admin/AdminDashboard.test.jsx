import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminDashboard from '../../src/pages/AdminDashboard.jsx';
import Home from '../../src/pages/Home.jsx';
import { getPosts, savePosts, saveUsers } from '../../src/utils/storage.js';
import { setSession } from '../../src/utils/auth.js';

const admin = { userId: 'admin', username: 'admin', displayName: 'Admin', role: 'admin' };
const posts = Array.from({ length: 7 }, (_, index) => ({ id: `p${index}`, title: `Post ${index}`,
  content: 'Body', createdAt: `2026-11-${String(index + 10).padStart(2, '0')}T00:00:00.000Z`,
  authorId: index === 0 ? 'admin' : 'other', authorName: 'Other' }));
function mount(session = admin) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard session={session} />} />
        <Route path="/login" element={<p>Login gate</p>} />
        <Route path="/blogs" element={<Home session={session} />} />
        <Route path="/users" element={<p>Accounts destination</p>} />
        <Route path="/write" element={<p>Write destination</p>} />
        <Route path="/blog/:id" element={<p>Read destination</p>} />
        <Route path="/edit/:id" element={<p>Edit destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
describe('AdminDashboard', () => {
  it('shows four distinct real counts, newest five, and passive actions', () => {
    savePosts(posts);
    saveUsers([{ id: 'a', role: 'admin' }, { id: 'u', role: 'user' }]);
    const confirm = vi.spyOn(window, 'confirm');
    mount();
    expect(screen.getAllByRole('definition')).toHaveLength(4);
    for (const [label, value] of [['Total posts', '7'], ['Total users', '3'], ['Admins', '2'], ['Your posts', '1']]) {
      expect(within(screen.getByText(label).parentElement).getByText(value)).toBeInTheDocument();
    }
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => within(row).getAllByRole('link')[0].textContent)).toEqual(['Post 6', 'Post 5', 'Post 4', 'Post 3', 'Post 2']);
    expect(getPosts()).toEqual(posts);
    expect(confirm).not.toHaveBeenCalled();
  });
  it.each([['Write a blog', 'Write destination'], ['Manage accounts', 'Accounts destination'],
    ['Post 6', 'Read destination'], ['Edit Post 6', 'Edit destination']])('clicks %s to its destination', async (label, destination) => {
    savePosts(posts);
    mount();
    await userEvent.setup().click(screen.getByRole('link', { name: label, exact: true }));
    expect(screen.getByText(destination)).toBeInTheDocument();
    expect(getPosts()).toEqual(posts);
  });
  it.each([null, { ...admin, displayName: '' }, { ...admin, role: 'user' }])('rejects invalid/nonAdmin identity %o', (session) => {
    mount(session);
    if (session?.role === 'user') expect(screen.getByRole('heading', { name: 'Blogs', exact: true })).toBeInTheDocument();
    else expect(screen.getByText('Login gate')).toBeInTheDocument();
    expect(screen.queryByText('Total posts')).not.toBeInTheDocument();
  });
  it('falls back on collection read exceptions without writing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    mount();
    expect(screen.getByText('No posts yet.')).toBeInTheDocument();
    expect(within(screen.getByText('Total users').parentElement).getByText('1')).toBeInTheDocument();
  });
  it('cancellation stays on dashboard and successful deletion routes to blogs with current remaining posts', async () => {
    savePosts(posts);
    setSession(admin);
    mount();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete Post 6' }));
    expect(getPosts()).toEqual(posts);
    expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
    const newer = { ...posts[0], id: 'new', title: 'New concurrent post' };
    savePosts([...posts, newer]);
    window.confirm.mockReturnValue(true);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete Post 6' }));
    expect(getPosts()).toEqual([...posts.slice(0, 6), newer]);
    expect(screen.getByRole('heading', { name: 'Blogs', exact: true })).toBeInTheDocument();
    const listing = screen.getByRole('region', { name: 'Blog posts' });
    expect(within(listing).getAllByRole('article')).toHaveLength(7);
    for (const post of [...posts.slice(0, 6), newer]) {
      expect(within(listing).getByRole('link', { name: post.title, exact: true })).toBeInTheDocument();
    }
    expect(screen.queryByRole('link', { name: 'Post 6', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin dashboard' })).not.toBeInTheDocument();
  });
  it.each(['missing', 'ownership', 'identity', 'session', 'read', 'write'])('rejects %s deletion without false success', async (failure) => {
    savePosts(posts);
    setSession(admin);
    mount();
    vi.spyOn(window, 'confirm').mockImplementation(() => {
      if (failure === 'missing') savePosts(posts.slice(0, 6));
      if (failure === 'ownership') setSession({ ...admin, role: 'user', userId: 'other' });
      if (failure === 'identity') setSession({ ...admin, userId: 'other-admin' });
      if (failure === 'session') localStorage.removeItem('writespace_session');
      return true;
    });
    if (failure === 'read') {
      const getItem = Storage.prototype.getItem;
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
        if (key === 'writespace_posts') throw new Error('denied');
        return getItem.call(this, key);
      });
    }
    if (failure === 'write') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete Post 6' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Blogs', exact: true })).not.toBeInTheDocument();
    if (failure === 'read') vi.restoreAllMocks();
    expect(getPosts()).toEqual(failure === 'missing' ? posts.slice(0, 6) : posts);
  });
});

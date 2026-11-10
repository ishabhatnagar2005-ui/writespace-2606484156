/** Verify full safe content, roles and explicit durable deletion outcomes. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import ReadBlog from '../../src/pages/ReadBlog.jsx';
import Home from '../../src/pages/Home.jsx';
import { getPosts, savePosts } from '../../src/utils/storage.js';

const owner = { userId: 'owner', username: 'reader', displayName: 'Reader', role: 'user' };
const post = { id: 'local', title: 'A real note', content: 'First line\n\n  Indented line',
  createdAt: '2026-11-10T07:30:00.000Z', authorId: 'owner', authorName: 'Writer' };
/** Mount real route transitions without mocking storage or navigation. */
function mount(session = owner, id = 'local') {
  return render(
    <MemoryRouter initialEntries={[`/blog/${id}`]}>
      <Routes>
        <Route path="/blog/:id" element={<ReadBlog session={session} />} />
        <Route path="/blogs" element={<Home session={session} />} />
        <Route path="/edit/:id" element={<h1>Edit destination</h1>} />
      </Routes>
      <Link to="/blog/second">Open second</Link>
    </MemoryRouter>,
  );
}
describe('ReadBlog', () => {
  it('displays complete safe long content, whitespace, author, UTC date and avatar without mutations', () => {
    const content = `${post.content}\n<script>alert(1)</script><img src=x onerror=alert(1)>\n${'words '.repeat(3000)}END`;
    savePosts([{ ...post, title: '<b>A real note</b>', content }]);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const confirm = vi.spyOn(window, 'confirm');
    const { container } = mount();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('<b>A real note</b>');
    expect(container.querySelector('.whitespace-pre-wrap').textContent).toBe(content);
    expect(screen.getByText('Writer')).toBeInTheDocument();
    expect(screen.getByText('Nov 10, 2026')).toHaveAttribute('datetime', post.createdAt);
    expect(screen.getByRole('img', { name: 'User avatar' })).toBeInTheDocument();
    expect(container.querySelector('script, img, b')).toBeNull();
    expect(writes).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
  it.each([null, '{bad', '{}', '[]', '[null,{}, {"id":"local","content":{}}]'])
    ('shows missing record and safe back link for %s', (raw) => {
      if (raw !== null) localStorage.setItem('writespace_posts', raw);
      mount();
      expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to blogs' })).toHaveAttribute('href', '/blogs');
      expect(screen.queryByRole('button', { name: 'Delete blog' })).toBeNull();
      expect(localStorage.getItem('writespace_posts')).toBe(raw);
    });
  it('handles read denial as missing and invalid ID without guessed data', () => {
    savePosts([post]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    mount(owner, 'unknown');
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
  });
  it('handles a missing ID in a valid collection', () => {
    savePosts([post]);
    mount(owner, 'unknown');
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    expect(getPosts()).toEqual([post]);
  });
  it('re-reads when the route ID changes and shows invalid-date fallback', async () => {
    savePosts([post, { ...post, id: 'second', title: 'Second', content: 'Other text', createdAt: 'bad' }]);
    mount();
    await userEvent.setup().click(screen.getByRole('link', { name: 'Open second' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Second');
    expect(screen.getByText('Other text')).toBeInTheDocument();
    expect(screen.getByText('Date unavailable')).toBeInTheDocument();
  });
  it.each([owner, { ...owner, userId: 'admin', role: 'admin' }])('shows permitted controls and edit navigation for $role', async (identity) => {
    savePosts([post]);
    mount(identity);
    expect(screen.getByRole('button', { name: 'Delete blog' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit blog' })).toHaveAttribute('href', '/edit/local');
    await userEvent.setup().click(screen.getByRole('link', { name: 'Edit blog' }));
    expect(screen.getByRole('heading', { name: 'Edit destination' })).toBeInTheDocument();
    expect(getPosts()).toEqual([post]);
  });
  it.each([null, { ...owner, userId: 'other' }, { ...owner, userId: '' }])('hides management controls for an ineligible identity', (identity) => {
    savePosts([post]);
    mount(identity);
    expect(screen.queryByRole('button', { name: 'Delete blog' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Edit blog' })).toBeNull();
  });
  it('cancellation changes neither reader nor data and asks an explicit question', async () => {
    savePosts([post]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mount();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete blog' }));
    expect(confirm).toHaveBeenCalledWith('Delete this blog? This cannot be undone.');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(post.title);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(getPosts()).toEqual([post]);
  });
  it.each([owner, { ...owner, userId: 'admin', role: 'admin' }])('confirmed $role deletion persists and returns to list retaining fresh unrelated records', async (identity) => {
    savePosts([post]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mount(identity);
    const second = { ...post, id: 'second', title: 'Kept', authorId: 'other' };
    savePosts([post, second]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete blog' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Blogs');
    expect(getPosts()).toEqual([second]);
    expect(screen.getByRole('link', { name: 'Read Kept' })).toBeInTheDocument();
  });
  it('rejects changed ownership on fresh mutation read despite stale visible controls', async () => {
    savePosts([post]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mount();
    const changed = { ...post, authorId: 'other' };
    savePosts([changed]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete blog' }));
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to delete this blog.');
    expect(getPosts()).toEqual([changed]);
    expect(screen.queryByRole('button', { name: 'Delete blog' })).toBeNull();
  });
  it('re-reads after confirmation and rejects a post removed during confirmation', async () => {
    savePosts([post]);
    mount();
    vi.spyOn(window, 'confirm').mockImplementation(() => { savePosts([]); return true; });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete blog' }));
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    expect(getPosts()).toEqual([]);
  });
  it('does not overwrite stored records when mutation reads fail', async () => {
    savePosts([post]);
    mount();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete blog' }));
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    read.mockRestore();
    expect(getPosts()).toEqual([post]);
  });
  it('shows write denial without navigation or false successful persistence', async () => {
    savePosts([post]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mount();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete blog' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not delete this blog. Your changes were not saved.');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(post.title);
    expect(getPosts()).toEqual([post]);
  });
});

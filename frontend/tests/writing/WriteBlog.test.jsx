/** Verify writing through real routes and re-read local persistence after actions. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import WriteBlog from '../../src/pages/WriteBlog.jsx';
import ReadBlog from '../../src/pages/ReadBlog.jsx';
import Home from '../../src/pages/Home.jsx';
import App from '../../src/App.jsx';
import { getPosts, savePosts } from '../../src/utils/storage.js';
import { setSession } from '../../src/utils/auth.js';

const owner = { userId: 'owner', username: 'writer', displayName: 'Writer', role: 'user' };
const admin = { userId: 'admin', username: 'admin', displayName: 'Admin', role: 'admin' };
const post = { id: 'local', title: 'Original', content: 'First line\n\n  Indented',
  createdAt: '2026-11-10T07:30:00.000Z', authorId: 'owner', authorName: 'Original author' };
const uuid = 'a98f3698-a029-43f3-9ec0-70d2cc5aaafd';

/** Mount real reader/list destinations to verify navigation and saved text. */
function mount(session = owner, path = '/write') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/write" element={<WriteBlog session={session} />} />
        <Route path="/edit/:id" element={<WriteBlog session={session} />} />
        <Route path="/blog/:id" element={<ReadBlog session={session} />} />
        <Route path="/blogs" element={<Home session={session} />} />
        <Route path="/login" element={<h1>Login destination</h1>} />
      </Routes>
      <Link to="/edit/second">Open second edit</Link>
      <Link to="/write">Open new draft</Link>
    </MemoryRouter>,
  );
}

/** Fill via paste so large text exercises the same input path without slow keystrokes. */
async function fill(user, title = 'New title', content = 'New content') {
  await user.clear(screen.getByLabelText('Title'));
  if (title) {
    await user.click(screen.getByLabelText('Title'));
    await user.paste(title);
  }
  await user.clear(screen.getByLabelText('Content'));
  if (content) {
    await user.click(screen.getByLabelText('Content'));
    await user.paste(content);
  }
}

describe('WriteBlog', () => {
  beforeEach(() => vi.stubGlobal('crypto', { randomUUID: vi.fn(() => uuid) }));

  it('renders a passive required form with an unlimited counter and minimum textarea height', async () => {
    savePosts([post]);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    mount();
    expect(screen.getByRole('heading', { name: 'Write a blog' })).toBeInTheDocument();
    for (const label of ['Title', 'Content']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByLabelText(label)).not.toHaveAttribute('maxlength');
    }
    expect(screen.getByLabelText('Content')).toHaveClass('min-h-64');
    expect(screen.getByText('0 characters')).toBeInTheDocument();
    await userEvent.setup().type(screen.getByLabelText('Content'), 'abc');
    expect(screen.getByText('3 characters')).toBeInTheDocument();
    expect(writes).not.toHaveBeenCalled();
    expect(getPosts()).toEqual([post]);
  });

  it.each([
    ['', '', ['Title', 'Content']],
    ['', 'Valid body', ['Title']],
    ['Valid title', '', ['Content']],
    ['   ', 'Valid body', ['Title']],
    ['Valid title', ' \n\t ', ['Content']],
    ['   ', ' \n ', ['Title', 'Content']],
  ])('blocks required/whitespace fields (%j, %j) with associated inline errors', async (title, content, invalid) => {
    savePosts([post]);
    mount();
    const user = userEvent.setup();
    await fill(user, title, content);
    await user.click(screen.getByRole('button', { name: 'Publish blog' }));
    expect(screen.getAllByRole('alert')).toHaveLength(invalid.length);
    for (const label of ['Title', 'Content']) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('aria-invalid', String(invalid.includes(label)));
      if (invalid.includes(label)) {
        const error = screen.getByText(`${label} is required.`);
        expect(input.getAttribute('aria-describedby').split(' ')).toContain(error.id);
      }
    }
    expect(getPosts()).toEqual([post]);
    expect(screen.getByRole('button', { name: 'Publish blog' })).toBeInTheDocument();
  });

  it.each([owner, admin])('creates for $role with UUID, ISO time, exact text and current collection', async (session) => {
    mount(session);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Publish blog' }));
    await fill(user, '  A title  ', '  Body\n\n  kept  ');
    savePosts([post]);
    const before = Date.now();
    await user.click(screen.getByRole('button', { name: 'Publish blog' }));
    const saved = getPosts();
    expect(saved).toHaveLength(2);
    expect(saved[0]).toEqual(post);
    expect(saved[1]).toEqual({ id: uuid, title: '  A title  ', content: '  Body\n\n  kept  ',
      createdAt: saved[1].createdAt, authorId: session.userId, authorName: session.displayName });
    expect(new Date(saved[1].createdAt).toISOString()).toBe(saved[1].createdAt);
    expect(Date.parse(saved[1].createdAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(saved[1].createdAt)).toBeLessThanOrEqual(Date.now());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A title');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('persists unlimited long XSS-like content as exact safe text and counts it', async () => {
    const content = `<script>alert(1)</script><img src=x onerror=alert(1)>\n${'words '.repeat(4000)}END`;
    const title = `<b>${'Title '.repeat(100)}end</b>`;
    const { container } = mount();
    const user = userEvent.setup();
    await fill(user, title, content);
    expect(screen.getByText(`${content.length} characters`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publish blog' }));
    expect(getPosts()[0]).toMatchObject({ title, content });
    expect(container.querySelector('.whitespace-pre-wrap').textContent).toBe(content);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(container.querySelector('script, img, b')).toBeNull();
  });

  it.each([owner, admin])('loads and edits for $role preserving fresh identity, time and unrelated records', async (session) => {
    savePosts([post]);
    mount(session, '/edit/local');
    expect(screen.getByLabelText('Title')).toHaveValue(post.title);
    expect(screen.getByLabelText('Content')).toHaveValue(post.content);
    expect(getPosts()).toEqual([post]);
    const user = userEvent.setup();
    await fill(user, 'Edited', 'Edited\n  body');
    const fresh = { ...post, authorId: session.role === 'admin' ? 'other-owner' : post.authorId,
      authorName: 'Fresh name', createdAt: '2025-01-01T00:00:00.000Z' };
    const second = { ...post, id: 'second', authorId: 'other' };
    savePosts([second, fresh]);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(getPosts()).toEqual([second, { ...fresh, title: 'Edited', content: 'Edited\n  body' }]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edited');
    expect(screen.getByText('Fresh name')).toBeInTheDocument();
  });

  it('blocks invalid edit fields without changing the original', async () => {
    savePosts([post]);
    mount(owner, '/edit/local');
    const user = userEvent.setup();
    await fill(user, ' ', '\n ');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(getPosts()).toEqual([post]);
  });

  it.each(['/write', '/edit/local'])('cancel from %s returns to blogs without saving entered text', async (path) => {
    savePosts([post]);
    mount(owner, path);
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Blogs' })).toBeInTheDocument();
    expect(getPosts()).toEqual([post]);
  });

  it.each([null, '{bad', '{}', '[]', '[null,{}, {"id":"local","content":{}}]'])
    ('renders missing post and back link without repairing %s', async (raw) => {
      if (raw !== null) localStorage.setItem('writespace_posts', raw);
      mount(owner, '/edit/local');
      expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(localStorage.getItem('writespace_posts')).toBe(raw);
      await userEvent.setup().click(screen.getByRole('link', { name: 'Back to blogs' }));
      expect(screen.getByRole('heading', { name: 'Blogs' })).toBeInTheDocument();
    });

  it('handles unknown IDs and read denial as missing without writes', () => {
    savePosts([post]);
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    mount(owner, '/edit/unknown');
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    read.mockRestore();
    expect(getPosts()).toEqual([post]);
  });

  it('redirects a non-owner initial edit entry without exposing a form or writing', () => {
    savePosts([post]);
    mount({ ...owner, userId: 'other' }, '/edit/local');
    expect(screen.getByRole('heading', { name: 'Blogs' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(getPosts()).toEqual([post]);
  });

  for (const path of ['/write', '/edit/local']) {
    it.each([null, {}, { ...owner, userId: '' }, { ...owner, displayName: ' ' }])
      (`fails closed for invalid session on ${path}`, (session) => {
        savePosts([post]);
        mount(session, path);
        expect(screen.getByRole('heading', { name: 'Login destination' })).toBeInTheDocument();
        expect(getPosts()).toEqual([post]);
      });
  }

  it('allows an Admin initial edit entry for another author without changing data on load', () => {
    const otherPost = { ...post, authorId: 'another-owner' };
    savePosts([otherPost]);
    mount(admin, '/edit/local');
    expect(screen.getByLabelText('Title')).toHaveValue(post.title);
    expect(getPosts()).toEqual([otherPost]);
  });

  it('shows a missing ID in an otherwise valid collection without mutation', () => {
    savePosts([post]);
    mount(owner, '/edit/unknown');
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    expect(getPosts()).toEqual([post]);
  });

  it('rejects changed ownership on submit instead of trusting loaded controls', async () => {
    savePosts([post]);
    mount(owner, '/edit/local');
    const user = userEvent.setup();
    await fill(user);
    const changed = { ...post, authorId: 'other' };
    savePosts([changed]);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('heading', { name: 'Blogs' })).toBeInTheDocument();
    expect(getPosts()).toEqual([changed]);
  });

  it.each([false, true])('rejects missing or unreadable current edit data (read denial: %s)', async (denied) => {
    savePosts([post]);
    mount(owner, '/edit/local');
    let read;
    if (denied) read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    else savePosts([]);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
    read?.mockRestore();
    expect(getPosts()).toEqual(denied ? [post] : []);
  });

  it.each(['/write', '/edit/local'])('shows write failure on %s without false success or navigation', async (path) => {
    savePosts([post]);
    mount(owner, path);
    const user = userEvent.setup();
    await fill(user);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.click(screen.getByRole('button', { name: path === '/write' ? 'Publish blog' : 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save this blog. Your changes were not saved.');
    expect(screen.getByLabelText('Title')).toHaveValue('New title');
    expect(getPosts()).toEqual([post]);
  });

  it('surfaces UUID failure without creating a partial post', async () => {
    mount();
    const user = userEvent.setup();
    await fill(user);
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('unavailable'); });
    await user.click(screen.getByRole('button', { name: 'Publish blog' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save this blog.');
    expect(getPosts()).toEqual([]);
  });

  it('resets loaded fields on route ID change and on opening a new draft', async () => {
    savePosts([post, { ...post, id: 'second', title: 'Second', content: 'Second body' }]);
    mount(owner, '/edit/local');
    const user = userEvent.setup();
    await fill(user);
    await user.click(screen.getByRole('link', { name: 'Open second edit' }));
    expect(screen.getByLabelText('Title')).toHaveValue('Second');
    expect(screen.getByLabelText('Content')).toHaveValue('Second body');
    await user.click(screen.getByRole('link', { name: 'Open new draft' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Content')).toHaveValue('');
  });

  it.each(['/write', '/edit/local'])('App wires %s through the authenticated gate to the real form', (path) => {
    savePosts([post]);
    setSession(owner);
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Title')).toHaveValue(path === '/write' ? '' : post.title);
  });

  it.each(['/write', '/edit/local'])('App gates guest initial entry %s without mutation', (path) => {
    savePosts([post]);
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).toBeNull();
    expect(getPosts()).toEqual([post]);
  });
});

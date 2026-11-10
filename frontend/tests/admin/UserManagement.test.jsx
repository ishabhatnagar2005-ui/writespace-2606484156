import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import UserManagement from '../../src/pages/UserManagement.jsx';
import { getUsers, saveUsers } from '../../src/utils/storage.js';
import { setSession } from '../../src/utils/auth.js';

const admin = { userId: 'admin', username: 'admin', displayName: 'Admin', role: 'admin' };
const account = { id: 'reader-id', username: 'reader', displayName: 'Reader', password: 'hidden-secret', role: 'user', createdAt: '2026-11-10T00:00:00.000Z' };
function mount(session = admin) {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<UserManagement session={session} />} />
        <Route path="/login" element={<p>Login gate</p>} />
        <Route path="/blogs" element={<p>Blogs gate</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
async function fill(overrides = {}) {
  const values = { 'Display Name': 'New account', Username: 'new', Password: 'demo', Role: 'user', ...overrides };
  const user = userEvent.setup();
  for (const [label, value] of Object.entries(values)) {
    if (label === 'Role') await user.selectOptions(screen.getByLabelText(label), value);
    else if (value) await user.type(screen.getByLabelText(label), value);
  }
  return user;
}
describe('UserManagement', () => {
  it.each(['user', 'admin'])('creates %s with exact values UUID/time, re-reading before and after saving', async (role) => {
    setSession(admin);
    mount();
    const user = await fill({ Role: role });
    saveUsers([account]);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const stored = getUsers();
    expect(stored).toHaveLength(2);
    expect(stored[0]).toEqual(account);
    expect(stored[1]).toEqual({ id: expect.any(String), displayName: 'New account', username: 'new', password: 'demo', role, createdAt: expect.any(String) });
    expect(stored[1].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(stored[1].createdAt).toISOString()).toBe(stored[1].createdAt);
    expect(screen.getByRole('status')).toHaveTextContent('Account created.');
    expect(screen.getByText('Reader')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Account new' })).toBeInTheDocument();
    expect(screen.queryByText('hidden-secret')).not.toBeInTheDocument();
  });
  it.each(['Display Name', 'Username', 'Password', 'Role'])('requires %s individually with accessible feedback', async (label) => {
    setSession(admin);
    mount();
    const user = await fill({ [label]: '' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent(`${label} is required.`);
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-describedby');
    expect(getUsers()).toEqual([]);
  });
  it.each(['admin', 'reader'])('rejects reserved or freshly stored duplicate %s', async (username) => {
    setSession(admin);
    mount();
    const user = await fill({ Username: username });
    saveUsers([account]);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Username is already taken.');
    expect(getUsers()).toEqual([account]);
  });
  it('accepts exact-case distinction, long values, and renders authored names safely', async () => {
    setSession(admin);
    mount();
    const name = '<script>name</script>' + 'x'.repeat(300);
    const user = await fill({ Username: 'Admin', 'Display Name': name, Password: 'x'.repeat(300) });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(getUsers()[0].username).toBe('Admin');
    expect(getUsers()[0].displayName).toBe(name);
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
  it('rejects an unsupported role injected into the native select', async () => {
    setSession(admin);
    mount();
    const user = await fill();
    const option = document.createElement('option');
    option.value = 'owner';
    option.textContent = 'Owner';
    screen.getByLabelText('Role').append(option);
    await user.selectOptions(screen.getByLabelText('Role'), 'owner');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose User or Admin.');
    expect(getUsers()).toEqual([]);
  });
  it('UUID failure shows non-success and preserves the collection', async () => {
    setSession(admin);
    saveUsers([account]);
    mount();
    const user = await fill();
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('unavailable'); });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not create this account.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(getUsers()).toEqual([account]);
  });
  it('rejects whitespace-only values', async () => {
    setSession(admin);
    mount();
    const user = await fill({ 'Display Name': ' ', Username: ' ', Password: ' ' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(getUsers()).toEqual([]);
  });
  it.each([null, { ...admin, displayName: '' }, { ...admin, role: 'user' }])('gates invalid/nonAdmin identity %o', (session) => {
    mount(session);
    expect(screen.getByText(session?.role === 'user' ? 'Blogs gate' : 'Login gate')).toBeInTheDocument();
  });
  it('read exceptions produce empty stored accounts while permanent Admin remains', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    mount();
    expect(screen.getByText('No stored accounts yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account admin' })).toBeDisabled();
  });
  it.each(['write', 'session'])('shows %s creation failure without a success status', async (failure) => {
    setSession(admin);
    mount();
    const user = await fill();
    if (failure === 'session') setSession({ ...admin, role: 'user' });
    else vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(getUsers()).toEqual([]);
  });
  it('permanent and current accounts are disabled, eligible cancellation unchanged, confirmed deletion uses fresh records', async () => {
    const current = { ...account, id: 'current', username: 'current', role: 'admin' };
    const session = { ...admin, userId: 'current', username: 'current' };
    saveUsers([current, account]);
    setSession(session);
    mount(session);
    expect(screen.getByRole('button', { name: 'Delete account admin' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete account current' })).toBeDisabled();
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'Delete account reader' }));
    expect(getUsers()).toEqual([current, account]);
    const concurrent = { ...account, id: 'another', username: 'another' };
    saveUsers([current, account, concurrent]);
    window.confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete account reader' }));
    expect(getUsers()).toEqual([current, concurrent]);
    expect(screen.getByRole('status')).toHaveTextContent('Account deleted.');
    expect(screen.getByText('@another')).toBeInTheDocument();
  });
  it.each(['current-before', 'protected-before', 'current-after', 'protected-after', 'missing', 'write', 'nonAdmin', 'read'])
    ('rejects stale or failed deletion: %s', async (failure) => {
      saveUsers([account]);
      setSession(admin);
      mount();
      if (failure === 'current-before') setSession({ ...admin, userId: account.id });
      if (failure === 'protected-before') saveUsers([{ ...account, username: 'admin' }]);
      vi.spyOn(window, 'confirm').mockImplementation(() => {
        if (failure === 'current-after') setSession({ ...admin, userId: account.id });
        if (failure === 'protected-after') saveUsers([{ ...account, username: 'admin' }]);
        if (failure === 'missing') saveUsers([]);
        if (failure === 'nonAdmin') setSession({ ...admin, role: 'user' });
        if (failure === 'read') vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
        return true;
      });
      if (failure === 'write') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
      await userEvent.setup().click(screen.getByRole('button', { name: 'Delete account reader' }));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      if (failure.endsWith('before')) expect(window.confirm).not.toHaveBeenCalled();
      else expect(screen.getByRole('alert')).toBeInTheDocument();
      if (failure === 'read') vi.restoreAllMocks();
      expect(getUsers()).toEqual(failure === 'missing' ? [] : failure.startsWith('protected') ? [{ ...account, username: 'admin' }] : [account]);
    });
});

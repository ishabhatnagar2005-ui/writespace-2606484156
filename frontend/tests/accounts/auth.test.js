/** Verify exact demo credentials, validation, and persisted session transitions. */
import { describe, expect, it, vi } from 'vitest';
import { clearSession, getRoleHome, getSession, isValidSession, login, register, setSession, validateRegistration } from '../../src/utils/auth.js';
import { getUsers, saveUsers } from '../../src/utils/storage.js';

const session = { userId: 'reader-id', username: 'reader', displayName: 'Reader', role: 'user' };
const fields = { displayName: 'Reader', username: 'reader', password: 'x', confirmPassword: 'x' };

 describe('sessions', () => {
  it.each(['user', 'admin'])('roundtrips a valid %s identity and clears only session', (role) => {
    saveUsers([{ id: 'keep' }]);
    localStorage.setItem('writespace_posts', '[]');
    setSession({ ...session, role });
    expect(getSession()).toEqual({ ...session, role });
    expect(JSON.parse(localStorage.getItem('writespace_session'))).toEqual({ ...session, role });
    clearSession();
    clearSession();
    expect(getSession()).toBeNull();
    expect(getUsers()).toEqual([{ id: 'keep' }]);
    expect(localStorage.getItem('writespace_posts')).toBe('[]');
  });
  it('returns null for absent identity', () => expect(getSession()).toBeNull());
  it.each(['{bad', 'null', '[]', 'false', '"reader"', '{}'])('fails closed without repairing raw %s', (raw) => {
    localStorage.setItem('writespace_session', raw);
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBe(raw);
  });
  it.each(['userId', 'username', 'displayName', 'role'])('rejects missing and invalid %s', (key) => {
    for (const value of [undefined, null, 3, '', '   ', 'unknown']) {
      if (key !== 'role' && value === 'unknown') continue;
      const invalid = { ...session, [key]: value };
      localStorage.setItem('writespace_session', JSON.stringify(invalid));
      expect(isValidSession(invalid)).toBe(false);
      expect(getSession()).toBeNull();
      expect(() => setSession(invalid)).toThrow('Invalid session.');
    }
  });
  it('fails closed when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(getSession()).toBeNull();
  });
  it('propagates writes and removal failures while retaining old persisted session', () => {
    setSession(session);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => setSession({ ...session, role: 'admin' })).toThrow('quota');
    expect(getSession()).toEqual(session);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => clearSession()).toThrow('denied');
    expect(getSession()).toEqual(session);
  });
  it('propagates serialization failure before replacing identity', () => {
    setSession(session);
    const cyclic = { ...session };
    cyclic.self = cyclic;
    expect(() => setSession(cyclic)).toThrow();
    expect(getSession()).toEqual(session);
  });
  it('chooses role homes', () => {
    expect(getRoleHome({ role: 'admin' })).toBe('/admin');
    expect(getRoleHome(session)).toBe('/blogs');
    expect(getRoleHome(null)).toBe('/blogs');
  });
});

describe('login', () => {
  it('checks built-in admin before stored duplicates or unavailable collection', () => {
    saveUsers([{ id: 'fake', username: 'admin', password: 'admin', displayName: 'Fake', role: 'user' }]);
    expect(login('admin', 'admin')).toEqual({ userId: 'admin', username: 'admin', displayName: 'Admin', role: 'admin' });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(login('admin', 'admin').userId).toBe('admin');
  });
  it.each(['user', 'admin'])('resolves stored %s without writing a session', (role) => {
    saveUsers([{ id: 'reader-id', ...fields, role }]);
    expect(login('reader', 'x')).toEqual({ ...session, role });
    expect(getSession()).toBeNull();
    expect(getUsers()[0].password).toBe('x');
  });
  it.each([['Reader', 'x'], ['reader ', 'x'], ['reader', 'X'], ['', 'x'], ['reader', ''], [null, 'x'], ['reader', {}]])(
    'rejects nonmatching or invalid credentials %s / %s', (username, password) => {
      saveUsers([{ id: 'reader-id', ...fields, role: 'user' }]);
      expect(login(username, password)).toBeNull();
      expect(getSession()).toBeNull();
    },
  );
  it.each(['{bad', '{}', '[]'])('rejects unknown account with unreadable/empty %s collection', (raw) => {
    localStorage.setItem('writespace_users', raw);
    expect(login('reader', 'x')).toBeNull();
    expect(localStorage.getItem('writespace_users')).toBe(raw);
  });
  it('ignores invalid identity records rather than signing them in', () => {
    saveUsers([null, { ...fields, id: '', role: 'user' }, { ...fields, id: 'x', role: 'owner' }]);
    expect(login('reader', 'x')).toBeNull();
  });
});

describe('registration', () => {
  it.each(Object.keys(fields))('requires %s with missing, empty, whitespace and wrong types', (key) => {
    for (const value of [undefined, '', '   ', null, 42]) {
      expect(validateRegistration({ ...fields, [key]: value }, [])[key]).toMatch(/is required/);
    }
  });
  it('handles missing/null fields and mismatch', () => {
    expect(Object.keys(validateRegistration())).toHaveLength(4);
    expect(Object.keys(validateRegistration(null, []))).toHaveLength(4);
    expect(validateRegistration({ ...fields, confirmPassword: 'X' }, []).confirmPassword).toBe('Passwords do not match.');
  });
  it.each(['admin', 'reader'])('rejects exact reserved or duplicate %s without mutation', (username) => {
    saveUsers([{ username: 'reader' }]);
    expect(register({ ...fields, username }).errors.username).toBe('Username is already taken.');
    expect(getUsers()).toEqual([{ username: 'reader' }]);
    expect(getSession()).toBeNull();
  });
  it('keeps case and whitespace exact and adds no password length limits', () => {
    expect(validateRegistration({ ...fields, username: 'Admin' }, [])).toEqual({});
    expect(validateRegistration({ ...fields, username: ' reader ' }, [{ username: 'reader' }])).toEqual({});
    const long = 'x'.repeat(10000);
    expect(validateRegistration({ ...fields, password: long, confirmPassword: long }, [])).toEqual({});
  });
  it('creates UUID/time user only, preserves existing users and establishes session', () => {
    saveUsers([{ id: 'existing', username: 'other' }]);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('new-id');
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-11-10T00:00:00.000Z');
    const result = register({ ...fields, role: 'admin' });
    expect(result.user).toEqual({ id: 'new-id', displayName: 'Reader', username: 'reader', password: 'x', role: 'user', createdAt: '2026-11-10T00:00:00.000Z' });
    expect(getUsers()).toEqual([{ id: 'existing', username: 'other' }, result.user]);
    expect(getSession()).toEqual({ ...session, userId: 'new-id' });
  });
  it('does not write when validation fails', () => {
    expect(register({ ...fields, password: '' }).errors.password).toBe('Password is required.');
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('propagates UUID failure without mutation', () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('uuid'); });
    expect(() => register(fields)).toThrow('uuid');
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('propagates collection write failure without session', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => register(fields)).toThrow('quota');
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('propagates second write failure while truthfully retaining persisted account', () => {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'writespace_session') throw new Error('session denied');
      return original.call(this, key, value);
    });
    expect(() => register(fields)).toThrow('session denied');
    expect(getUsers()).toHaveLength(1);
    expect(getUsers()[0]).toMatchObject({ displayName: 'Reader', username: 'reader', password: 'x', role: 'user' });
    expect(getUsers()[0]).not.toHaveProperty('confirmPassword');
    expect(getSession()).toBeNull();
  });
});

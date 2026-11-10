/** Exercise collection persistence and every browser failure boundary. */
import { describe, expect, it, vi } from 'vitest';
import { getPosts, getUsers, savePosts, saveUsers } from '../../src/utils/storage.js';

describe.each([
  ['posts', 'writespace_posts', getPosts, savePosts],
  ['users', 'writespace_users', getUsers, saveUsers],
])('%s storage', (name, key, read, save) => {
  it('round-trips the complete collection and preserves unrelated keys', () => {
    const records = [{ id: 'one', content: '<script>text only</script>', nested: { value: '✓' } }];
    localStorage.setItem('writespace_session', 'unchanged');
    save(records);
    expect(JSON.parse(localStorage.getItem(key))).toEqual(records);
    expect(read()).toEqual(records);
    expect(localStorage.getItem('writespace_session')).toBe('unchanged');
  });
  it('returns an empty array for an absent key without parsing null', () => {
    const parse = vi.spyOn(JSON, 'parse');
    expect(read()).toEqual([]);
    expect(parse).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBeNull();
  });
  it.each(['{bad', '', 'null', '{}', '42', '"value"', 'true'])('returns empty for invalid collection %s without repair', (raw) => {
    localStorage.setItem(key, raw);
    expect(read()).toEqual([]);
    expect(localStorage.getItem(key)).toBe(raw);
  });
  it('falls back when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(read()).toEqual([]);
  });
  it('falls back when access to localStorage itself throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
    expect(read()).toEqual([]);
  });
  it('persists replacement with an empty array', () => {
    save([{ id: 'old' }]);
    save([]);
    expect(read()).toEqual([]);
    expect(localStorage.getItem(key)).toBe('[]');
  });
  it('propagates quota errors without replacing the last stored value', () => {
    localStorage.setItem(key, '[{"id":"old"}]');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); });
    expect(() => save([{ id: 'new' }])).toThrow('Quota exceeded');
    expect(read()).toEqual([{ id: 'old' }]);
  });
  it('propagates unavailable storage access on writes', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => save([])).toThrow('blocked');
  });
  it('propagates circular serialization failure without losing old data', () => {
    save([{ id: 'old' }]);
    const circular = [];
    circular.push(circular);
    expect(() => save(circular)).toThrow(TypeError);
    expect(read()).toEqual([{ id: 'old' }]);
  });
  it('propagates unsupported bigint serialization failure', () => {
    expect(() => save([{ id: 1n }])).toThrow(TypeError);
    expect(localStorage.getItem(key)).toBeNull();
  });
  it('round-trips a large collection without truncation', () => {
    const records = Array.from({ length: 1000 }, (_, id) => ({ id, content: 'x'.repeat(121) }));
    save(records);
    expect(read()).toEqual(records);
  });
});

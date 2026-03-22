import { resolveValueOrGetter } from '../dist/index.js';

describe('public surface', () => {
  it('returns literal values without calling a getter', () => {
    expect(resolveValueOrGetter('value')).toBe('value');
    expect(resolveValueOrGetter(42)).toBe(42);
  });

  it('calls zero-argument getters lazily', () => {
    const getter = vi.fn(() => 'computed');

    expect(resolveValueOrGetter(() => getter())).toBe('computed');
    expect(getter).toHaveBeenCalledOnce();
  });
});

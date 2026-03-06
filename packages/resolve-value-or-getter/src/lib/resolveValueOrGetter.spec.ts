import { resolveValueOrGetter } from './resolveValueOrGetter.js';

test('resolveValueOrGetter', () => {
  const getter = vi.fn(() => 'resolved');

  expect(resolveValueOrGetter(() => getter())).toBe('resolved');
  expect(getter).toHaveBeenCalledOnce();
});

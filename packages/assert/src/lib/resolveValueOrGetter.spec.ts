import { resolveValueOrGetter } from './resolveValueOrGetter.js';

test('resolveValueOrGetter', () => {
  const getter = vi.fn(() => 'resolved');

  expect(resolveValueOrGetter('value')).toBe('value');
  expect(resolveValueOrGetter(getter)).toBe('resolved');
  expect(getter).toHaveBeenCalledOnce();

  const value = resolveValueOrGetter('value' as string | (() => string));
  expectTypeOf(value).toEqualTypeOf<string>();
});

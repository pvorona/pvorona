import { resolveValueOrGetter } from './resolveValueOrGetter.js';

test('resolveValueOrGetter', () => {
  const getter = vi.fn(() => 'resolved');

  // @ts-expect-error "Function values are reserved for lazy getters"
  resolveValueOrGetter<() => number>(() => 1);

  expect(resolveValueOrGetter('value')).toBe('value');
  expect(resolveValueOrGetter(() => getter())).toBe('resolved');
  expect(getter).toHaveBeenCalledOnce();

  const value = resolveValueOrGetter('value' as string | (() => string));
  expectTypeOf(value).toEqualTypeOf<string>();
});

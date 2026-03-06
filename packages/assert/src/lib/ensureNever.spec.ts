import { ensureNever } from './ensureNever.js';

test('ensureNever', () => {
  expect(() =>
    // @ts-expect-error "ensureNever only accepts never"
    ensureNever('value'),
  ).toThrow('Expected value to be never');

  const value =
    // @ts-expect-error "ensureNever only accepts never"
    ensureNever('value', true);
  expect(value).toBe('value');
});

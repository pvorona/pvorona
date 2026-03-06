import { hasOwnKey } from './hasOwnKey.js';

test('hasOwnKey', () => {
  const key = Symbol('key');

  expect(hasOwnKey({ value: 1 }, 'value')).toBe(true);
  expect(hasOwnKey({ [key]: 1 }, key)).toBe(true);
  expect(hasOwnKey(Object.create({ value: 1 }), 'value')).toBe(false);
  expect(hasOwnKey(null, 'value')).toBe(false);
  expect(hasOwnKey('value', 'length')).toBe(false);

  const unknownValue = { value: 1 } as unknown;
  if (hasOwnKey(unknownValue, 'value')) {
    expectTypeOf(unknownValue).toEqualTypeOf<Record<'value', unknown>>();
    expect(unknownValue.value).toBe(1);
  }
});

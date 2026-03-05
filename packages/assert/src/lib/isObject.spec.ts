import { isObject } from './isObject.js';

test('isObject', () => {
  expect(isObject({ a: 1 })).toBe(true);
  expect(isObject([1])).toBe(true);
  expect(isObject(null)).toBe(false);
  expect(isObject('value')).toBe(false);
  expect(isObject(() => 'value')).toBe(false);

  const value = { a: 1 as const } as { a: 1 } | string;
  if (isObject(value)) {
    expectTypeOf(value).toEqualTypeOf<{ a: 1 }>();
  } else {
    expectTypeOf(value).toEqualTypeOf<string>();
  }
});

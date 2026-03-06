import { isFunction } from './isFunction.js';

test('isFunction', () => {
  expect(isFunction(() => 'value')).toBe(true);
  expect(isFunction('value')).toBe(false);

  const unknownValue = (() => 'value') as unknown;
  if (isFunction(unknownValue)) {
    expectTypeOf(unknownValue).toEqualTypeOf<never>();
  }

  const maybeFunction = (() => 'value') as string | (() => string);
  if (isFunction(maybeFunction)) {
    expectTypeOf(maybeFunction).toEqualTypeOf<() => string>();
    expect(maybeFunction()).toBe('value');
  } else {
    expectTypeOf(maybeFunction).toEqualTypeOf<string>();
  }
});

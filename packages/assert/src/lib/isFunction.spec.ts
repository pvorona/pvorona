import { isFunction } from './isFunction.js';

test('isFunction', () => {
  expect(isFunction(() => 'value')).toBe(true);
  expect(isFunction('value')).toBe(false);

  // @ts-expect-error "Must infer the callable member from the input value"
  isFunction<() => string>('value' as string | (() => number));

  const maybeFunction = (() => 'value') as string | (() => string);
  if (isFunction(maybeFunction)) {
    expectTypeOf(maybeFunction).toEqualTypeOf<() => string>();
    expect(maybeFunction()).toBe('value');
  } else {
    expectTypeOf(maybeFunction).toEqualTypeOf<string>();
  }
});

import { isFunction } from './isFunction.js';

type AnyFunction =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  Function;

test('isFunction', () => {
  expect(isFunction(() => 'value')).toBe(true);
  expect(isFunction('value')).toBe(false);

  const unknownValue = (() => 'value') as unknown;
  if (isFunction(unknownValue)) {
    expectTypeOf(unknownValue).toEqualTypeOf<AnyFunction>();
  }

  const maybeFunction = (() => 'value') as string | (() => string);
  if (isFunction(maybeFunction)) {
    expectTypeOf(maybeFunction).toEqualTypeOf<() => string>();
    expect(maybeFunction()).toBe('value');
  } else {
    expectTypeOf(maybeFunction).toEqualTypeOf<string>();
  }

  const maybeErrorOrFunction = (() => 'value') as Error | (() => string);
  if (isFunction(maybeErrorOrFunction)) {
    expectTypeOf(maybeErrorOrFunction).toEqualTypeOf<() => string>();
    expect(maybeErrorOrFunction()).toBe('value');
  } else {
    expectTypeOf(maybeErrorOrFunction).toEqualTypeOf<Error>();
  }
});

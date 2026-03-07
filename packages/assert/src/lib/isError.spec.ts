/* eslint-disable @typescript-eslint/no-explicit-any */
import { runInNewContext } from 'node:vm';

import { AssertionError } from './AssertionError.js';
import { isError } from './isError.js';

test('isError', () => {
  class CustomError extends Error {
    override readonly name = 'CustomError';
  }

  const unknownError = new Error('boom') as unknown;
  expect(isError(unknownError)).toBe(true);
  if (isError(unknownError)) {
    expectTypeOf(unknownError).toEqualTypeOf<Error>();
  }

  const maybeError = new Error('boom') as Error | string;
  if (isError(maybeError)) {
    expectTypeOf(maybeError).toEqualTypeOf<Error>();
  } else {
    expectTypeOf(maybeError).toEqualTypeOf<string>();
  }

  const maybeCustomError = new CustomError('boom') as CustomError | string;
  if (isError(maybeCustomError)) {
    expectTypeOf(maybeCustomError).toEqualTypeOf<CustomError>();
  } else {
    expectTypeOf(maybeCustomError).toEqualTypeOf<string>();
  }

  const anyAssertionError = new AssertionError('assertion') as any;
  expect(isError(anyAssertionError)).toBe(true);
  if (isError(anyAssertionError)) {
    expectTypeOf(anyAssertionError).toEqualTypeOf<any>();
  }

  const unknownString = 'value' as unknown;
  expect(isError(unknownString)).toBe(false);

  const unknownErrorLikeObject = { name: 'Error', message: 'boom' } as unknown;
  expect(isError(unknownErrorLikeObject)).toBe(false);

  const anyErrorLikeObject = { name: 'Error', message: 'boom' } as any;
  expect(isError(anyErrorLikeObject)).toBe(false);

  const crossRealmError = runInNewContext("new Error('boom')") as unknown;
  expect(isError(crossRealmError)).toBe(false);

  // @ts-expect-error unrelated unions must be rejected
  isError('value' as string | number);

  // @ts-expect-error all error-only inputs assignable to `Error` are rejected
  isError(new Error('boom'));

  // @ts-expect-error subtype-only inputs are also rejected
  isError(new AssertionError('assertion'));

  // @ts-expect-error unions made only of error subtypes are rejected
  isError(new CustomError('boom') as AssertionError | CustomError);
});

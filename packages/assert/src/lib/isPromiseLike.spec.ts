import { isPromiseLike } from './isPromiseLike.js';

test('isPromiseLike', () => {
  expect(isPromiseLike(Promise.resolve('value'))).toBe(true);
  expect(
    isPromiseLike({
      then: () => undefined,
    }),
  ).toBe(true);

  const callableThenable = Object.assign(() => 'value', {
    then: () => Promise.resolve('value'),
  });
  expect(isPromiseLike(callableThenable)).toBe(true);

  expect(isPromiseLike({ then: 'value' })).toBe(false);
  expect(isPromiseLike({})).toBe(false);
  expect(isPromiseLike(null)).toBe(false);
  expect(isPromiseLike('value')).toBe(false);

  const unknownValue = Promise.resolve('value') as unknown;
  if (isPromiseLike(unknownValue)) {
    expectTypeOf(unknownValue).toEqualTypeOf<PromiseLike<unknown>>();
  }
});

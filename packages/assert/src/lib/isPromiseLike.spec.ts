import { isPromiseLike } from './isPromiseLike.js';

test('isPromiseLike', () => {
  expect(isPromiseLike(Promise.resolve('value'))).toBe(true);
  expect(
    isPromiseLike({
      then: () => undefined,
    })
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

test('isPromiseLike returns false when reading `then` throws', () => {
  const value = {
    get then() {
      throw new Error('boom');
    },
  };

  expect(isPromiseLike(value)).toBe(false);
});

test('isPromiseLike returns false for revoked proxies', () => {
  const proxy = Proxy.revocable({}, {});
  proxy.revoke();

  expect(isPromiseLike(proxy.proxy)).toBe(false);
});

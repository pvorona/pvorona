import { hasOwnPropertyValue } from './hasOwnPropertyValue.js';

test('hasOwnPropertyValue', () => {
  expect(hasOwnPropertyValue({ status: 'success' }, 'status', 'success')).toBe(
    true,
  );
  expect(hasOwnPropertyValue({ status: 'failure' }, 'status', 'success')).toBe(
    false,
  );
  expect(
    hasOwnPropertyValue(Object.create({ status: 'success' }), 'status', 'success'),
  ).toBe(false);
  expect(
    hasOwnPropertyValue(
      {
        get status() {
          return 'success';
        },
      },
      'status',
      'success',
    ),
  ).toBe(false);
  expect(
    hasOwnPropertyValue(
      {
        get status() {
          return undefined;
        },
      },
      'status',
      undefined,
    ),
  ).toBe(false);

  const unknownValue = { status: 'success' as const } as unknown;
  if (hasOwnPropertyValue(unknownValue, 'status', 'success' as const)) {
    expectTypeOf(unknownValue).toEqualTypeOf<Record<'status', 'success'>>();
    expect(unknownValue.status).toBe('success');
  }
});

import { ensureObject } from './ensureObject.js';

test('ensureObject', () => {
  expect(() => ensureObject(null as null | { a: 1 })).toThrow();
  expect(() => ensureObject('value' as string | { a: 1 })).toThrow();

  const objectValue = ensureObject({ a: 1 as const } as { a: 1 } | string);
  expect(objectValue).toEqual({ a: 1 });

  const arrayValue = ensureObject([1, 2] as number[] | null);
  expect(arrayValue).toEqual([1, 2]);
});

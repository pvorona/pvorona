import { assert } from './assert.js';
import { isNull } from './isNull.js';
import { IncludesNullMember, NotOnlyNull } from './types.js';

export function ensureNotNull<
  T extends V,
  V = NotOnlyNull<IncludesNullMember<T>>,
>(
  value: T,
  message = `Expected ${String(value)} not to be null`,
): Exclude<T, null> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null
  assert(!isNull(value), message, ensureNotNull);

  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null
  return value;
}

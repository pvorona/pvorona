import { assert } from './assert.js';
import { isNullOrUndefined } from './isNullOrUndefined.js';
import {
  IncludesNullOrUndefinedMember,
  NotOnlyNullOrUndefined,
} from './types.js';

export function ensureNotNullOrUndefined<
  T extends V,
  V = NotOnlyNullOrUndefined<IncludesNullOrUndefinedMember<T>>,
>(
  value: T,
  message = `Expected ${String(value)} not to be null or undefined`,
): Exclude<T, null | undefined> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null | undefined
  assert(!isNullOrUndefined(value), message, ensureNotNullOrUndefined);

  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null | undefined
  return value;
}

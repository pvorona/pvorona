import { assert } from './assert.js';
import { isDefined } from './isDefined.js';
import { IncludesUndefinedMember, NotOnlyUndefined } from './types.js';

export function ensureDefined<
  T extends V,
  V = NotOnlyUndefined<IncludesUndefinedMember<T>>,
>(
  value: T,
  message = `Expected ${String(value)} to be defined`,
): Exclude<T, undefined> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of undefined
  assert(isDefined(value), message, ensureDefined);

  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of undefined
  return value;
}

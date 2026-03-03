import { isUndefined } from './isUndefined.js';
import { IncludesUndefinedMember, NotOnlyUndefined } from './types.js';

export function isDefined<
  T extends V,
  V = NotOnlyUndefined<IncludesUndefinedMember<T>>,
>(value: T): value is Exclude<T, undefined> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of undefined
  return !isUndefined(value);
}

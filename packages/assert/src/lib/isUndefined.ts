import { IncludesUndefinedMember, NotOnlyUndefined } from './types.js';

export function isUndefined<
  T extends V,
  V = NotOnlyUndefined<IncludesUndefinedMember<T>>,
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of undefined
>(value: T): value is undefined {
  return typeof value === 'undefined';
}

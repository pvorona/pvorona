import { IncludesNullMember, NotOnlyNull } from './types.js';

export function isNull<
  T extends V,
  V = NotOnlyNull<IncludesNullMember<T>>,
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null
>(value: T): value is null {
  return value === null;
}

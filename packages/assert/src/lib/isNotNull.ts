import { isNull } from './isNull.js';
import { IncludesNullMember, NotOnlyNull } from './types.js';

export function isNotNull<T extends V, V = NotOnlyNull<IncludesNullMember<T>>>(
  value: T,
): value is Exclude<T, null> {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null
  return !isNull(value);
}

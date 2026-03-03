import { isNull } from './isNull.js';
import { isUndefined } from './isUndefined.js';
import {
  IncludesNullOrUndefinedMember,
  NotOnlyNullOrUndefined,
} from './types.js';

export function isNullOrUndefined<
  T extends V,
  V = NotOnlyNullOrUndefined<IncludesNullOrUndefinedMember<T>>,
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null | undefined
>(value: T): value is null | undefined {
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of null | undefined
  return isNull(value) || isUndefined(value);
}

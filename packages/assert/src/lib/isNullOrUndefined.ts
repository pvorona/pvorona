import { isNull } from './isNull.js';
import { isUndefined } from './isUndefined.js';
import {
  type IncludesNullOrUndefinedMember,
  type NotOnlyNullOrUndefined,
  type DisplayDiagnostics,
} from './types.js';

export type NullOrUndefinedConstraint<T> = DisplayDiagnostics<
  NotOnlyNullOrUndefined<IncludesNullOrUndefinedMember<T>>
>;

export function isNullOrUndefined<
  T extends V,
  V = NullOrUndefinedConstraint<T>,
>(value: T): value is Extract<T, null | undefined> {
  return isNull<T, V>(value) || isUndefined<T, V>(value);
}

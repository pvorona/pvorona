import { isUndefined, type UndefinedConstraint } from './isUndefined.js';

export function isDefined<T extends V, V = UndefinedConstraint<T>>(
  value: T
): value is Exclude<T, undefined> {
  return !isUndefined<T, V>(value);
}

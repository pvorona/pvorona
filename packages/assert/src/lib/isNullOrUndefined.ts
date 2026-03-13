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

type NullOrUndefinedInput<T> = [unknown] extends [T]
  ? T
  : NullOrUndefinedConstraint<T>;

export function isNullOrUndefined<
  T extends V,
  V = NullOrUndefinedConstraint<T>,
>(
  value: T,
): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, null | undefined>
  | ([unknown] extends [T] ? null | undefined : never);

export function isNullOrUndefined<T>(
  value: T & NullOrUndefinedInput<T>,
): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, null | undefined>
  | ([unknown] extends [T] ? null | undefined : never) {
  return isNull(value as unknown) || isUndefined(value as unknown);
}

import {
  type IncludesUndefinedMember,
  type NotOnlyUndefined,
  type DisplayDiagnostics,
} from './types.js';

export type UndefinedConstraint<T> = DisplayDiagnostics<
  NotOnlyUndefined<IncludesUndefinedMember<T>>
>;

type UndefinedInput<T> = [unknown] extends [T] ? T : UndefinedConstraint<T>;

export function isUndefined<T extends V, V = UndefinedConstraint<T>>(
  value: T
  // @ts-expect-error TS can't express this predicate precisely for all `T`
): value is Extract<T, undefined> | ([unknown] extends [T] ? undefined : never);

export function isUndefined<T>(value: T & UndefinedInput<T>): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, undefined>
  | ([unknown] extends [T] ? undefined : never) {
  return typeof value === 'undefined';
}

import {
  type IncludesNullMember,
  type NotOnlyNull,
  type DisplayDiagnostics,
} from './types.js';

export type NullConstraint<T> = DisplayDiagnostics<
  NotOnlyNull<IncludesNullMember<T>>
>;

type NullInput<T> = [unknown] extends [T] ? T : NullConstraint<T>;

export function isNull<T extends V, V = NullConstraint<T>>(
  value: T,
): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, null>
  | ([unknown] extends [T] ? null : never);

export function isNull<T>(
  value: T & NullInput<T>,
): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, null>
  | ([unknown] extends [T] ? null : never) {
  return value === null;
}

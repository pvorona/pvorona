import {
  type AtLeastOneValid,
  type IncludesStringOrStringLiteralMember,
  type DisplayDiagnostics,
  type NotOnlyString,
} from './types.js';

export type StringConstraint<T> = DisplayDiagnostics<
  NotOnlyString<AtLeastOneValid<IncludesStringOrStringLiteralMember<T>>>
>;

type StringInput<T> = [unknown] extends [T] ? T : StringConstraint<T>;

export function isString<T extends V, V = StringConstraint<T>>(
  value: T
): value is Extract<T, string> | ([unknown] extends [T] ? string : never); // @ts-expect-error TS can't express this predicate precisely for all `T`

export function isString<T>(value: T & StringInput<T>): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, string>
  | ([unknown] extends [T] ? string : never) {
  return typeof value === 'string';
}

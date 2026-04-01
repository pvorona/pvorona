import {
  type AtLeastOneValid,
  type IncludesNumberOrNumberLiteralMember,
  type DisplayDiagnostics,
  type NotOnlyNumber,
} from './types.js';

export type NumberConstraint<T> = DisplayDiagnostics<
  NotOnlyNumber<AtLeastOneValid<IncludesNumberOrNumberLiteralMember<T>>>
>;

type NumberInput<T> = [unknown] extends [T] ? T : NumberConstraint<T>;

export function isNumber<T extends V, V = NumberConstraint<T>>(
  value: T
): value is Extract<T, number> | ([unknown] extends [T] ? number : never); // @ts-expect-error TS can't express this predicate precisely for all `T`

export function isNumber<T>(value: T & NumberInput<T>): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, number>
  | ([unknown] extends [T] ? number : never) {
  return typeof value === 'number';
}

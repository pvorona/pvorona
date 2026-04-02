import {
  type IncludesSymbolMember,
  type NotOnlySymbol,
  type DisplayDiagnostics,
} from './types.js';

export type SymbolConstraint<T> = DisplayDiagnostics<
  NotOnlySymbol<IncludesSymbolMember<T>>
>;

type SymbolInput<T> = [unknown] extends [T] ? T : SymbolConstraint<T>;

export function isSymbol<T extends V, V = SymbolConstraint<T>>(
  value: T
  // @ts-expect-error TS can't express this predicate precisely for all `T`
): value is Extract<T, symbol> | ([unknown] extends [T] ? symbol : never);

export function isSymbol<T>(value: T & SymbolInput<T>): value is  // @ts-expect-error TS can't express this predicate precisely for all `T`
  | Extract<T, symbol>
  | ([unknown] extends [T] ? symbol : never) {
  return typeof value === 'symbol';
}

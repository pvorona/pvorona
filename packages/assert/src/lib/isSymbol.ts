import {
  type IncludesSymbolMember,
  type NotOnlySymbol,
  type DisplayDiagnostics,
} from './types.js';

export type SymbolConstraint<T> = DisplayDiagnostics<
  NotOnlySymbol<IncludesSymbolMember<T>>
>;

export function isSymbol<T extends V, V = SymbolConstraint<T>>(
  value: T,
): value is Extract<T, symbol> {
  return typeof value === 'symbol';
}

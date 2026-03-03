import { IncludesSymbolMember, NotOnlySymbol } from './types.js';

export function isSymbol<
  T extends V,
  V = NotOnlySymbol<IncludesSymbolMember<T>>,
  // @ts-expect-error TS doesn't allow this since V is not constrained as a subtype of symbol
>(value: T): value is symbol {
  return typeof value === 'symbol';
}

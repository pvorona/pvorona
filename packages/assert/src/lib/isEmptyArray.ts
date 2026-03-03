export function isEmptyArray<T>(value: readonly T[]): value is [] {
  return value.length === 0;
}

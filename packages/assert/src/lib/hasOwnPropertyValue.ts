import { hasOwnKey } from './hasOwnKey.js';

export function hasOwnPropertyValue<K extends PropertyKey, V>(
  value: unknown,
  key: K,
  expected: V,
): value is Record<K, V> {
  if (!hasOwnKey(value, key)) return false;

  return Object.getOwnPropertyDescriptor(value, key)?.value === expected;
}

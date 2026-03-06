function isObjectLike(value: unknown): value is object {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

export function hasOwnKey<K extends PropertyKey>(
  value: unknown,
  key: K,
): value is Record<K, unknown> {
  if (!isObjectLike(value)) return false;

  return Object.prototype.hasOwnProperty.call(value, key);
}

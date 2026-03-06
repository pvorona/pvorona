export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (value === null) return false;
  if (typeof value !== 'object' && typeof value !== 'function') return false;

  return typeof Reflect.get(value, 'then') === 'function';
}

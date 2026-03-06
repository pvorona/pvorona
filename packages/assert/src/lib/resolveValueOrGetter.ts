export function resolveValueOrGetter<T>(valueOrGetter: T | (() => T)): T {
  if (typeof valueOrGetter !== 'function') return valueOrGetter;

  return (valueOrGetter as () => T)();
}

type FunctionValue =
  | ((...args: never[]) => unknown)
  | (abstract new (...args: never[]) => unknown);

type NonFunctionalValue<T> = T extends FunctionValue ? never : T;

export function resolveValueOrGetter<T>(
  value: NonFunctionalValue<T>
): NonFunctionalValue<T>;
export function resolveValueOrGetter<T>(
  getter: () => NonFunctionalValue<T>
): NonFunctionalValue<T>;
export function resolveValueOrGetter<T>(
  valueOrGetter: NonFunctionalValue<T> | (() => NonFunctionalValue<T>)
): NonFunctionalValue<T>;
export function resolveValueOrGetter<T>(
  valueOrGetter: NonFunctionalValue<T> | (() => NonFunctionalValue<T>)
): NonFunctionalValue<T> {
  if (typeof valueOrGetter !== 'function') {
    return valueOrGetter as NonFunctionalValue<T>;
  }

  return (valueOrGetter as () => NonFunctionalValue<T>)();
}

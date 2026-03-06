type AnyFunction =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  Function;

export function isFunction<T>(value: T): value is Extract<T, AnyFunction> {
  return typeof value === 'function';
}

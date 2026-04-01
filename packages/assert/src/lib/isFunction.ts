type AnyFunction =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  Function;

type IsUnknown<T> = unknown extends T
  ? [keyof T] extends [never]
    ? true
    : false
  : false;

type NarrowFunction<T> = IsUnknown<T> extends true
  ? T & AnyFunction
  : Extract<T, AnyFunction>;

export function isFunction<T>(value: T): value is NarrowFunction<T> {
  return typeof value === 'function';
}

export function isFunction<
  T extends /* eslint-disable-line @typescript-eslint/no-unsafe-function-type */ Function,
>(value: unknown): value is T {
  return typeof value === 'function';
}

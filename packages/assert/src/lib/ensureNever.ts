import { throwError } from '@pvorona/throw-error';

export function ensureNever(
  value: never,
  silent = false,
  message?: string,
): never {
  if (silent) {
    return value;
  }

  throwError(
    new Error(message ?? `Expected ${String(value)} to be never`),
    ensureNever,
  );
}

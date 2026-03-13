import { throwError } from '@pvorona/throw-error';
import { resolveFailure, type AssertionFailure } from './assert.js';

export function ensureNever(
  value: never,
  failureOrNotThrow: AssertionFailure | true = () =>
    `Expected ${String(value)} to be never`,
): never {
  if (failureOrNotThrow === true) {
    return value;
  }

  const error = resolveFailure(failureOrNotThrow);

  throwError(error, ensureNever);
}

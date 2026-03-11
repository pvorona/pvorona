import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';
import { throwError } from '@pvorona/throw-error';

import { AssertionError } from './AssertionError.js';
import { isFunction } from './isFunction.js';

/**
 * Failure input accepted by `assert(...)`.
 *
 * `failure` may be omitted, a message string, a custom `Error`, or a lazy
 * callback that returns either one. Return the failure value from the callback
 * instead of throwing it directly if you want `functionToSkipStackFrames` to
 * apply consistently.
 */
export type AssertionFailure =
  | undefined
  | string
  | Error
  | (() => string | Error);

/**
 * Throws when `condition` is `false`.
 *
 * `failure` may be omitted, a message string, a custom `Error`, or a lazy
 * callback that returns either one. String failures and `() => string`
 * failures preserve the provided message exactly, and lazy callbacks are only
 * evaluated on failure.
 *
 * Failed assertions throw `AssertionError` unless a caller-provided `Error` is
 * passed directly or returned by the callback. When
 * `functionToSkipStackFrames` is omitted, `assert` itself is omitted from the
 * captured stack trace by default.
 *
 * These guarantees apply to `assert(...)` only. The `ensure*` helpers keep
 * their own contracts.
 */
export function assert(
  condition: boolean,
  failure?: AssertionFailure,
  functionToSkipStackFrames: /* eslint-disable-line @typescript-eslint/no-unsafe-function-type */ Function = assert,
): asserts condition {
  if (condition) return;

  const resolvedFailure = isFunction(failure)
    ? resolveValueOrGetter(failure)
    : failure;

  if (resolvedFailure instanceof Error) {
    throwError(resolvedFailure, functionToSkipStackFrames);
  }

  throwError(new AssertionError(resolvedFailure), functionToSkipStackFrames);
}

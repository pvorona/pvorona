import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';
import { throwError } from '@pvorona/throw-error';

import { AssertionError } from './AssertionError.js';

/**
 * Failure input accepted by `assert(...)`.
 *
 * `failure` may be omitted, a message string, a custom `Error`, or a lazy
 * callback that returns either one. Return the failure value from the callback
 * instead of throwing it directly if you want `functionToSkipStackFrames` to
 * apply consistently.
 */
export type AssertFailure = undefined | string | Error | (() => string | Error);

/**
 * Throws when `condition` is `false`.
 *
 * `failure` may be a message, a custom `Error`, or a lazy callback that
 * returns either one. Failed assertions throw `AssertionError` unless a
 * caller-provided `Error` is passed directly or returned by the callback.
 */
export function assert(
  condition: boolean,
  failure?: AssertFailure,
  functionToSkipStackFrames: /* eslint-disable-line @typescript-eslint/no-unsafe-function-type */ Function = assert,
): asserts condition {
  if (condition) return;

  const resolvedFailure =
    typeof failure === 'function'
      ? resolveValueOrGetter<string | Error>(failure)
      : failure;

  if (resolvedFailure instanceof Error) {
    throwError(resolvedFailure, functionToSkipStackFrames);
  }

  throwError(new AssertionError(resolvedFailure), functionToSkipStackFrames);
}

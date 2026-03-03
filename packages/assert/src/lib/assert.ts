import { throwError } from '@pvorona/throw-error';

import { AssertionError } from './AssertionError.js';
import { getMessage } from './getMessage.js';

export function assert(
  condition: boolean,
  messageOrMessageGetter?: undefined | string | (() => string),
  functionToSkipStackFrames: /* eslint-disable-line @typescript-eslint/no-unsafe-function-type */ Function = assert,
): asserts condition {
  if (condition) return;

  const message = getMessage(messageOrMessageGetter);
  const error = new AssertionError(message);

  throwError(error, functionToSkipStackFrames);
}

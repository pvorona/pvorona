export function throwError(
  error: Error,
  functionToSkipStackFrames: /* eslint-disable-line @typescript-eslint/no-unsafe-function-type */ Function = throwError
): never {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, functionToSkipStackFrames);
  }

  throw error;
}

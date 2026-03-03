import { throwError } from '@pvorona/throw-error';

export class NotImplementedError extends Error {
  override readonly name = 'NotImplementedError';

  constructor(message?: string) {
    super(message ?? 'Not implemented');
  }
}

export function notImplemented(message?: string): never {
  throwError(new NotImplementedError(message), notImplemented);
}

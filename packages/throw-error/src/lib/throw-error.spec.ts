import { throwError } from './throw-error.js';

describe('throwError', () => {
  it('should throw the given error', () => {
    const error = new Error('boom');
    expect(() => throwError(error)).toThrow(error);
  });

  it('should throw an instance of the original error class', () => {
    class CustomError extends Error {
      override readonly name = 'CustomError';
    }
    const error = new CustomError('custom');
    expect(() => throwError(error)).toThrow(CustomError);
  });

  it('should preserve the error message', () => {
    expect(() => throwError(new Error('specific message'))).toThrow(
      'specific message'
    );
  });

  it('should remove `throwError` from the stack trace by default', () => {
    try {
      throwError(new Error('trace'));
    } catch (e) {
      expect((e as Error).stack).not.toContain('throwError');
    }
  });

  it('should remove the given function from the stack trace', () => {
    function wrapper() {
      throwError(new Error('trace'), wrapper);
    }

    try {
      wrapper();
    } catch (e) {
      expect((e as Error).stack).not.toContain('wrapper');
    }
  });
});

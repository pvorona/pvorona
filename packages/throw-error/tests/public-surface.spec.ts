import { throwError } from '../dist/index.js';

describe('public surface', () => {
  it('throws the original error with its message', () => {
    const error = new RangeError('Invalid port: abc');

    expect(() => throwError(error)).toThrow(error);
    expect(() => throwError(new RangeError('Invalid port: abc'))).toThrow(
      'Invalid port: abc'
    );
  });

  it('omits `throwError` from the stack trace by default', () => {
    let error: Error | undefined;

    try {
      throwError(new Error('trace'));
      throw new Error('Expected `throwError` to throw');
    } catch (caughtError) {
      error = caughtError as Error;
    }

    expect(error).toBeDefined();
    expect(error?.stack).not.toContain('throwError');
  });

  it('can skip an extra wrapper function in the stack trace', () => {
    function validateEmail(input: string): string {
      if (input.includes('@')) return input;

      throwError(new Error('Invalid email'), validateEmail);
    }

    let error: Error | undefined;

    try {
      validateEmail('invalid-email');
      throw new Error('Expected `validateEmail` to throw');
    } catch (caughtError) {
      error = caughtError as Error;
    }

    expect(error).toBeDefined();
    expect(error?.stack).not.toContain('validateEmail');
  });
});

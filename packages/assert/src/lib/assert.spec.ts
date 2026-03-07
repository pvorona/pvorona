import { assert } from './assert.js';
import { AssertionError } from './AssertionError.js';

describe('assert', () => {
  describe('when condition is false', () => {
    describe('and message is specified as string', () => {
      it('throws error with specified message', () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';

        expect(() => assert(false, TEST_MESSAGE)).toThrow(TEST_MESSAGE);
      });
    });

    describe('and message is specified as function', () => {
      it('throws error with specified message', () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';

        expect(() => assert(false, () => TEST_MESSAGE)).toThrow(TEST_MESSAGE);
      });
    });

    describe('and message is not specified', () => {
      it('throws AssertionError', () => {
        expect(() => assert(false)).toThrow(AssertionError);
      });
    });

    describe('when failure is an Error instance', () => {
      it('throws the provided error instance', () => {
        class CustomError extends Error {
          override readonly name = 'CustomError';
        }

        const error = new CustomError('custom');
        let thrownError: unknown;

        try {
          assert(false, error);
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(thrownError).toBe(error);
      });
    });

    describe('when failure is an Error getter', () => {
      it('throws the error returned by the getter', () => {
        class CustomError extends Error {
          override readonly name = 'CustomError';
        }

        const error = new CustomError('from getter');
        const errorGetter = vi.fn(() => error);
        let thrownError: unknown;

        try {
          assert(false, errorGetter);
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(errorGetter).toHaveBeenCalledTimes(1);
        expect(thrownError).toBe(error);
      });
    });

    describe('when functionToSkipStackFrames is specified', () => {
      it('removes the given function from the stack trace', () => {
        function wrapper() {
          assert(false, new Error('trace'), wrapper);
        }

        let thrownError: unknown;

        try {
          wrapper();
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(thrownError).toBeInstanceOf(Error);
        expect((thrownError as Error).stack).not.toContain('wrapper');
      });
    });
  });

  describe('when condition is true', () => {
    describe('and message is specified as string', () => {
      it("doesn't throw", () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';

        expect(() => assert(true, TEST_MESSAGE)).not.toThrow();
      });
    });

    describe('and message is specified as function', () => {
      it("doesn't throw and doesn't invoke the function", () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';
        const messageGetter = vi.fn(() => TEST_MESSAGE);

        expect(() => assert(true, messageGetter)).not.toThrow();
        expect(messageGetter).not.toHaveBeenCalled();
      });
    });

    describe('when failure is an Error getter', () => {
      it("doesn't invoke the getter when condition is true", () => {
        const errorGetter = vi.fn(() => new Error('boom'));

        expect(() => assert(true, errorGetter)).not.toThrow();
        expect(errorGetter).not.toHaveBeenCalled();
      });
    });

    describe('and message is not specified', () => {
      it("doesn't throw", () => {
        expect(() => assert(true)).not.toThrow();
      });
    });
  });
});

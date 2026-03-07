import { assert } from './assert.js';
import { AssertionError } from './AssertionError.js';

describe('assert', () => {
  describe('assert(false)', () => {
    describe('assert(false, string)', () => {
      it('throws error with specified message', () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';

        expect(() => assert(false, TEST_MESSAGE)).toThrow(TEST_MESSAGE);
      });
    });

    describe('assert(false, () => string)', () => {
      it('throws error with specified message', () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';

        expect(() => assert(false, () => TEST_MESSAGE)).toThrow(TEST_MESSAGE);
      });
    });

    describe('assert(false)', () => {
      it('throws AssertionError', () => {
        expect(() => assert(false)).toThrow(AssertionError);
      });
    });

    describe('assert(false, Error)', () => {
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

    describe('assert(false, () => Error)', () => {
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

    describe('assert(false, Error, function)', () => {
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

  describe('assert(true)', () => {
    describe('assert(true, string)', () => {
      it("doesn't throw", () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';

        expect(() => assert(true, TEST_MESSAGE)).not.toThrow();
      });
    });

    describe('assert(true, () => string)', () => {
      it("doesn't throw and doesn't invoke the function", () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';
        const messageGetter = vi.fn(() => TEST_MESSAGE);

        expect(() => assert(true, messageGetter)).not.toThrow();
        expect(messageGetter).not.toHaveBeenCalled();
      });
    });

    describe('assert(true, () => Error)', () => {
      it("doesn't invoke the getter when condition is true", () => {
        const errorGetter = vi.fn(() => new Error('boom'));

        expect(() => assert(true, errorGetter)).not.toThrow();
        expect(errorGetter).not.toHaveBeenCalled();
      });
    });

    describe('assert(true)', () => {
      it("doesn't throw", () => {
        expect(() => assert(true)).not.toThrow();
      });
    });
  });
});

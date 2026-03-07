import { assert } from './assert.js';
import { AssertionError } from './AssertionError.js';

describe('assert', () => {
  describe('assert(false)', () => {
    describe('assert(false, string)', () => {
      it('throws AssertionError with the exact specified message', () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';

        let thrownError: unknown;

        try {
          assert(false, TEST_MESSAGE);
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(thrownError).toBeInstanceOf(AssertionError);
        expect((thrownError as Error).message).toBe(TEST_MESSAGE);
      });

      it('removes assert from the stack trace by default', () => {
        const TEST_MESSAGE = 'trace';

        function defaultStackElisionCaller() {
          assert(false, TEST_MESSAGE);
        }

        let thrownError: unknown;

        try {
          defaultStackElisionCaller();
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(thrownError).toBeInstanceOf(AssertionError);
        expect((thrownError as Error).message).toBe(TEST_MESSAGE);

        const stackLines = ((thrownError as Error).stack ?? '').split('\n');
        expect(
          stackLines.some((line) => line.includes('defaultStackElisionCaller'))
        ).toBe(true);
        expect(stackLines.some((line) => /\bat assert \(/.test(line))).toBe(
          false
        );
      });
    });

    describe('assert(false, () => string)', () => {
      it('throws AssertionError with the exact specified message and evaluates the getter once', () => {
        const TEST_MESSAGE = 'TEST_MESSAGE';
        const messageGetter = vi.fn(() => TEST_MESSAGE);

        let thrownError: unknown;

        try {
          assert(false, messageGetter);
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(messageGetter).toHaveBeenCalledTimes(1);
        expect(thrownError).toBeInstanceOf(AssertionError);
        expect((thrownError as Error).message).toBe(TEST_MESSAGE);
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
      it('removes the given function from the stack trace while keeping the outer caller', () => {
        const error = new Error('trace');

        function stackFrameToSkip() {
          assert(false, error, stackFrameToSkip);
        }

        function directErrorOuterCaller() {
          stackFrameToSkip();
        }

        let thrownError: unknown;

        try {
          directErrorOuterCaller();
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(thrownError).toBe(error);

        const stackLines = (error.stack ?? '').split('\n');
        expect(
          stackLines.some((line) => line.includes('stackFrameToSkip'))
        ).toBe(false);
        expect(
          stackLines.some((line) => line.includes('directErrorOuterCaller'))
        ).toBe(true);
      });
    });

    describe('assert(false, string, function)', () => {
      it('removes the given function from the AssertionError stack trace while keeping the outer caller', () => {
        const TEST_MESSAGE = 'trace';

        function stackFrameToSkip() {
          assert(false, TEST_MESSAGE, stackFrameToSkip);
        }

        function assertionErrorOuterCaller() {
          stackFrameToSkip();
        }

        let thrownError: unknown;

        try {
          assertionErrorOuterCaller();
        } catch (caughtError) {
          thrownError = caughtError;
        }

        expect(thrownError).toBeInstanceOf(AssertionError);
        expect((thrownError as Error).message).toBe(TEST_MESSAGE);

        const stackLines = ((thrownError as Error).stack ?? '').split('\n');
        expect(
          stackLines.some((line) => line.includes('stackFrameToSkip'))
        ).toBe(false);
        expect(
          stackLines.some((line) => line.includes('assertionErrorOuterCaller'))
        ).toBe(true);
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

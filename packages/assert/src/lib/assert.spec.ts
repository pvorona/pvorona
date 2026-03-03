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

    describe('and message is not specified', () => {
      it("doesn't throw", () => {
        expect(() => assert(true)).not.toThrow();
      });
    });
  });
});

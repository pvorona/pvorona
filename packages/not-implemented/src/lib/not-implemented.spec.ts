import { notImplemented, NotImplementedError } from './not-implemented.js';

describe('notImplemented', () => {
  it('should throw NotImplementedError', () => {
    expect(() => notImplemented()).toThrow(NotImplementedError);
  });

  it('should use default message', () => {
    expect(() => notImplemented()).toThrow('Not implemented');
  });

  it('should use custom message', () => {
    expect(() => notImplemented('TODO: parse response')).toThrow(
      'TODO: parse response'
    );
  });

  it('should remove `notImplemented` from the stack trace', () => {
    try {
      notImplemented();
    } catch (e) {
      expect((e as Error).stack).not.toContain('notImplemented');
    }
  });
});

describe('NotImplementedError', () => {
  it('should have name "NotImplementedError"', () => {
    const error = new NotImplementedError();
    expect(error.name).toBe('NotImplementedError');
  });

  it('should be an instance of Error', () => {
    const error = new NotImplementedError();
    expect(error).toBeInstanceOf(Error);
  });
});

import { NotImplementedError, notImplemented } from '../dist/index.js';

describe('public surface', () => {
  it('throws the default error shape', () => {
    expect(() => notImplemented()).toThrow(NotImplementedError);
    expect(() => notImplemented()).toThrow('Not implemented');
  });

  it('preserves a custom message', () => {
    expect(() => notImplemented('Triangle area')).toThrow('Triangle area');
  });

  it('exports `NotImplementedError` as an `Error` subclass', () => {
    const error = new NotImplementedError('Feature X');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotImplementedError);
    expect(error.name).toBe('NotImplementedError');
  });
});

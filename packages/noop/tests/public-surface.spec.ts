import { noop } from '../dist/index.js';

describe('public surface', () => {
  it('returns `undefined` and does not throw', () => {
    expect(noop()).toBeUndefined();
    expect(() => noop()).not.toThrow();
  });

  it('works as a default optional callback', () => {
    const calls: string[] = [];

    function withFinally(
      run: () => void,
      onFinally: () => void = noop
    ) {
      try {
        run();
      } finally {
        onFinally();
      }
    }

    withFinally(() => {
      calls.push('run');
    });
    withFinally(
      () => {
        calls.push('run-with-callback');
      },
      () => {
        calls.push('finally');
      }
    );

    expect(calls).toEqual(['run', 'run-with-callback', 'finally']);
  });

  it('ignores extra JavaScript arguments', () => {
    const onError: (error: unknown) => void = noop;

    expect(onError(new Error('boom'))).toBeUndefined();
  });
});

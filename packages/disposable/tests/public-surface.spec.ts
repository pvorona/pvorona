import {
  createDisposable,
  type DisposeResult,
} from '../dist/index.js';

describe('public surface', () => {
  it('supports sync cleanup and unsubscribe semantics', () => {
    const disposable = createDisposable();
    const calls: string[] = [];

    const unsubscribe = disposable.onDispose(() => {
      calls.push('cleanup');
    });

    unsubscribe();

    expect(disposable.dispose()).toBe(true);
    expect(disposable.dispose()).toBe(false);
    expect(calls).toEqual([]);
  });

  it('waits for async cleanup before notifying onDisposed listeners', async () => {
    const disposable = createDisposable();
    const results: DisposeResult[] = [];
    let resolveCleanup = (): void => undefined;

    const cleanup = new Promise<void>((resolve) => {
      resolveCleanup = resolve;
    });

    disposable.onDispose(() => cleanup);
    disposable.onDisposed((result) => {
      results.push(result);
    });

    expect(disposable.dispose()).toBe(true);
    expect(results).toHaveLength(0);

    resolveCleanup();
    await cleanup;
    await Promise.resolve();

    expect(results).toHaveLength(1);
    expect(results[0]?.isSuccess).toBe(true);
  });

  it('replays the cached result to late onDisposed listeners', () => {
    const disposable = createDisposable();
    const results: DisposeResult[] = [];

    disposable.dispose();
    disposable.onDisposed((result) => {
      results.push(result);
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.isSuccess).toBe(true);
  });

  it('exposes failure results through `result.isFailure`', () => {
    const disposable = createDisposable();
    const results: DisposeResult[] = [];
    const cleanupError = new Error('cleanup failed');
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      disposable.onDispose(() => {
        throw cleanupError;
      });
      disposable.onDisposed((result) => {
        results.push(result);
      });

      expect(disposable.dispose()).toBe(true);
      expect(results).toHaveLength(1);
      const result = results[0];
      if (result == null || !result.isFailure) {
        throw new Error('Expected disposal failure result');
      }

      expect(result.error.errors).toStrictEqual([cleanupError]);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

import {
  createDisposable,
  type Disposable,
  type DisposeResult,
  type OnDisposedListener,
  type OnDisposeListener,
} from './disposable.js';

type Deferred<T = void, E = unknown> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: E) => void;
};

function createDeferred<T = void, E = unknown>(): Deferred<T, E> {
  let resolve = null as ((value: T | PromiseLike<T>) => void) | null;
  let reject = null as ((reason: E) => void) | null;

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    promise,
    resolve: resolve as (value: T | PromiseLike<T>) => void,
    reject: reject as (reason: E) => void,
  };
}

async function flushMicrotasks(times = 4) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('Disposable', () => {
  describe('.isDisposed', () => {
    it('is false initially', () => {
      const disposable = createDisposable();
      expect(disposable.isDisposed).toBe(false);
    });

    it('is true after .dispose()', () => {
      const disposable = createDisposable();
      disposable.dispose();
      expect(disposable.isDisposed).toBe(true);
    });

    it('stays true after subsequent .dispose() calls', () => {
      const disposable = createDisposable();
      disposable.dispose();
      disposable.dispose();
      expect(disposable.isDisposed).toBe(true);
    });
  });

  describe('.isDisposing', () => {
    it('is false initially', () => {
      const disposable = createDisposable();
      expect(disposable.isDisposing).toBe(false);
    });

    it('is true inside an onDispose listener', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn(() => {
        expect(disposable.isDisposing).toBe(true);
      });

      disposable.onDispose(onDisposeListener);
      disposable.dispose();

      expect(onDisposeListener).toHaveBeenCalledTimes(1);
    });

    it('is false after dispose() returns', () => {
      const disposable = createDisposable();
      disposable.onDispose(() => undefined);

      disposable.dispose();

      expect(disposable.isDisposing).toBe(false);
    });
  });

  describe('.dispose()', () => {
    it('returns true on the first call', () => {
      const disposable = createDisposable();
      const wasDisposedByThisCall = disposable.dispose();
      expect(wasDisposedByThisCall).toBe(true);
    });

    it('returns false on subsequent calls', () => {
      const disposable = createDisposable();
      disposable.dispose();
      expect(disposable.dispose()).toBe(false);
      expect(disposable.dispose()).toBe(false);
    });

    it('invokes onDispose listeners exactly once', () => {
      const disposable = createDisposable();
      const onDisposeListener1 = vi.fn();
      const onDisposeListener2 = vi.fn();
      const onDisposeListener3 = vi.fn();

      disposable.onDispose(onDisposeListener1);
      disposable.onDispose(onDisposeListener2);
      disposable.onDispose(onDisposeListener3);

      disposable.dispose();
      disposable.dispose();

      expect(onDisposeListener1).toHaveBeenCalledTimes(1);
      expect(onDisposeListener2).toHaveBeenCalledTimes(1);
      expect(onDisposeListener3).toHaveBeenCalledTimes(1);
    });

    it('is safe to call multiple times (idempotent)', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn();
      disposable.onDispose(onDisposeListener);

      expect(disposable.dispose()).toBe(true);
      expect(disposable.dispose()).toBe(false);
      expect(disposable.dispose()).toBe(false);
      expect(disposable.isDisposed).toBe(true);
      expect(onDisposeListener).toHaveBeenCalledTimes(1);
    });

    it('invokes onDispose listeners synchronously (before dispose() returns)', () => {
      const disposable = createDisposable();
      const events: string[] = [];

      const onDisposeListener = vi.fn(() => {
        events.push('listener');
      });
      disposable.onDispose(onDisposeListener);

      events.push('beforeDispose');
      disposable.dispose();
      events.push('afterDispose');

      expect(events).toStrictEqual([
        'beforeDispose',
        'listener',
        'afterDispose',
      ]);
      expect(onDisposeListener).toHaveBeenCalledTimes(1);
    });

    it('sets isDisposed=true only after all onDispose listeners execute', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn(() => {
        expect(disposable.isDisposed).toBe(false);
        expect(disposable.isDisposing).toBe(true);
      });
      disposable.onDispose(onDisposeListener);

      disposable.dispose();

      expect(disposable.isDisposing).toBe(false);
      expect(disposable.isDisposed).toBe(true);
      expect(onDisposeListener).toHaveBeenCalledTimes(1);
    });

    describe('re-entrancy edge cases', () => {
      it('if a listener calls onDispose(existingPendingListener) during dispose(), existingPendingListener is still called exactly once total', () => {
        const disposable = createDisposable();
        const events: string[] = [];

        const existingPendingListener = vi.fn(() => {
          events.push('existingPendingListener');
        });

        const outerListener = vi.fn(() => {
          events.push('outerListener-beforeSubscribe');
          disposable.onDispose(existingPendingListener);
          events.push('outerListener-afterSubscribe');
        });

        disposable.onDispose(outerListener);
        disposable.onDispose(existingPendingListener);

        disposable.dispose();

        expect(outerListener).toHaveBeenCalledTimes(1);
        expect(existingPendingListener).toHaveBeenCalledTimes(1);
        expect(events).toStrictEqual([
          'outerListener-beforeSubscribe',
          'outerListener-afterSubscribe',
          'existingPendingListener',
        ]);
      });

      it('if a listener calls onDispose(existingAlreadyCalledListener) during dispose(), existingAlreadyCalledListener is called again', () => {
        const disposable = createDisposable();
        const events: string[] = [];

        const existingAlreadyCalledListener = vi.fn(() => {
          events.push('existingAlreadyCalledListener');
        });

        const outerListener = vi.fn(() => {
          events.push('outerListener-beforeSubscribe');
          disposable.onDispose(existingAlreadyCalledListener);
          events.push('outerListener-afterSubscribe');
        });

        disposable.onDispose(existingAlreadyCalledListener);
        disposable.onDispose(outerListener);

        disposable.dispose();

        expect(outerListener).toHaveBeenCalledTimes(1);
        expect(existingAlreadyCalledListener).toHaveBeenCalledTimes(2);
        expect(events).toStrictEqual([
          'existingAlreadyCalledListener',
          'outerListener-beforeSubscribe',
          'outerListener-afterSubscribe',
          'existingAlreadyCalledListener',
        ]);
      });

      it('if a listener calls onDispose(itself) during dispose(), it runs again', () => {
        const disposable = createDisposable();

        let callCount = 0;
        const selfSubscribingListener = vi.fn(() => {
          callCount += 1;

          if (callCount === 1) {
            disposable.onDispose(selfSubscribingListener);
          }
        });

        disposable.onDispose(selfSubscribingListener);

        disposable.dispose();

        expect(selfSubscribingListener).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('.onDispose(listener)', () => {
    it('does not call listener before .dispose()', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn();
      disposable.onDispose(onDisposeListener);

      expect(onDisposeListener).not.toHaveBeenCalled();
    });

    it('calls listener when .dispose() is called', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn();
      disposable.onDispose(onDisposeListener);

      disposable.dispose();

      expect(onDisposeListener).toHaveBeenCalledTimes(1);
    });

    it('supports multiple listeners (all are called once)', () => {
      const disposable = createDisposable();
      const listeners = Array.from({ length: 7 }, () => vi.fn());

      for (const listener of listeners) {
        disposable.onDispose(listener);
      }

      disposable.dispose();

      for (const listener of listeners) {
        expect(listener).toHaveBeenCalledTimes(1);
      }
    });

    it('calls listeners in insertion order', () => {
      const disposable = createDisposable();
      const callOrder: string[] = [];

      const onDisposeListener1 = vi.fn(() => {
        callOrder.push('listener1');
      });
      const onDisposeListener2 = vi.fn(() => {
        callOrder.push('listener2');
      });

      disposable.onDispose(onDisposeListener1);
      disposable.onDispose(onDisposeListener2);

      disposable.dispose();

      expect(callOrder).toStrictEqual(['listener1', 'listener2']);
      expect(onDisposeListener1).toHaveBeenCalledTimes(1);
      expect(onDisposeListener2).toHaveBeenCalledTimes(1);
    });

    it('de-dupes the same listener function (registering twice calls it once)', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn();

      disposable.onDispose(onDisposeListener);
      disposable.onDispose(onDisposeListener);

      disposable.dispose();

      expect(onDisposeListener).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe function that removes the listener', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn();

      const unsubscribe = disposable.onDispose(onDisposeListener);
      unsubscribe();

      disposable.dispose();

      expect(onDisposeListener).not.toHaveBeenCalled();
    });

    it('unsubscribe is idempotent (can be called multiple times)', () => {
      const disposable = createDisposable();
      const onDisposeListener = vi.fn();

      const unsubscribe = disposable.onDispose(onDisposeListener);

      expect(() => unsubscribe()).not.toThrow();
      expect(() => unsubscribe()).not.toThrow();

      disposable.dispose();

      expect(onDisposeListener).not.toHaveBeenCalled();
    });

    it('unsubscribing inside a listener does not break other listeners', () => {
      const disposable = createDisposable();

      let unsubscribe1: () => void = () => undefined;

      const onDisposeListener1 = vi.fn(() => {
        unsubscribe1();
      });
      const onDisposeListener2 = vi.fn();

      unsubscribe1 = disposable.onDispose(onDisposeListener1);
      disposable.onDispose(onDisposeListener2);

      disposable.dispose();

      expect(onDisposeListener1).toHaveBeenCalledTimes(1);
      expect(onDisposeListener2).toHaveBeenCalledTimes(1);
    });

    it("if listener A unsubscribes listener B during dispose(), B isn't called if it hasn't been called yet", () => {
      const disposable = createDisposable();
      const callSequence: Array<'listenerA' | 'listenerB'> = [];

      let didUnsubscribeB = false;
      let unsubscribeB: () => void = () => undefined;

      const listenerB = vi.fn(() => {
        if (didUnsubscribeB) {
          throw new Error('listenerB was called after being unsubscribed');
        }

        callSequence.push('listenerB');
      });

      const listenerA = vi.fn(() => {
        didUnsubscribeB = true;
        unsubscribeB();
        callSequence.push('listenerA');
      });

      disposable.onDispose(listenerA);
      unsubscribeB = disposable.onDispose(listenerB);

      disposable.dispose();

      if (callSequence[0] === 'listenerA') {
        expect(listenerB).not.toHaveBeenCalled();
      }

      expect(listenerA).toHaveBeenCalledTimes(1);
    });

    describe('late subscription', () => {
      it('if already disposed, onDispose(listener) calls listener immediately', () => {
        const disposable = createDisposable();
        disposable.dispose();

        const onDisposeListener = vi.fn();
        disposable.onDispose(onDisposeListener);

        expect(onDisposeListener).toHaveBeenCalledTimes(1);
      });

      it('if already disposed, unsubscribe returned from onDispose() is a no-op', () => {
        const disposable = createDisposable();
        disposable.dispose();

        const onDisposeListener = vi.fn();
        const unsubscribe = disposable.onDispose(onDisposeListener);

        expect(() => unsubscribe()).not.toThrow();
        expect(() => unsubscribe()).not.toThrow();

        expect(onDisposeListener).toHaveBeenCalledTimes(1);
      });
    });

    describe('subscription during disposal', () => {
      it('if a listener calls onDispose(newListener) during dispose(), newListener is called later in the same dispose() call', () => {
        const disposable = createDisposable();
        const events: string[] = [];

        const newOnDisposeListener = vi.fn(() => {
          events.push('newListener');
        });

        const onDisposeListener = vi.fn(() => {
          events.push('outerListener-beforeSubscribe');
          disposable.onDispose(newOnDisposeListener);
          events.push('outerListener-afterSubscribe');
        });

        disposable.onDispose(onDisposeListener);

        events.push('beforeDispose');
        disposable.dispose();
        events.push('afterDispose');

        expect(newOnDisposeListener).toHaveBeenCalledTimes(1);
        expect(events).toStrictEqual([
          'beforeDispose',
          'outerListener-beforeSubscribe',
          'outerListener-afterSubscribe',
          'newListener',
          'afterDispose',
        ]);
      });
    });

    describe('error handling', () => {
      it('if a listener throws, other listeners are still called', () => {
        const disposable = createDisposable();
        const consoleErrorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);

        const throwingListener = vi.fn(() => {
          throw new Error('boom');
        });
        const onDisposeListener = vi.fn();

        try {
          disposable.onDispose(throwingListener);
          disposable.onDispose(onDisposeListener);

          disposable.dispose();

          expect(throwingListener).toHaveBeenCalledTimes(1);
          expect(onDisposeListener).toHaveBeenCalledTimes(1);
        } finally {
          consoleErrorSpy.mockRestore();
        }
      });

      it('dispose() does not throw when a listener throws', () => {
        const disposable = createDisposable();
        const consoleErrorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);

        const throwingListener = vi.fn(() => {
          throw new Error('boom');
        });

        try {
          disposable.onDispose(throwingListener);

          expect(() => disposable.dispose()).not.toThrow();
          expect(throwingListener).toHaveBeenCalledTimes(1);
        } finally {
          consoleErrorSpy.mockRestore();
        }
      });

      it('errors thrown by listeners are logged', () => {
        const disposable = createDisposable();

        const throwingListener = vi.fn(() => {
          throw new Error('boom');
        });

        const consoleErrorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => undefined);

        try {
          disposable.onDispose(throwingListener);
          disposable.dispose();

          expect(consoleErrorSpy).toHaveBeenCalled();
        } finally {
          consoleErrorSpy.mockRestore();
        }
      });
    });

    describe('async listener behavior', () => {
      it('if an onDispose listener returns a promise, disposal should remain sync', async () => {
        const disposable = createDisposable();

        const deferred = createDeferred<void>();

        let listenerCompleted = false;
        const promiseReturningListener = vi.fn(async () => {
          await deferred.promise;
          listenerCompleted = true;
        });

        disposable.onDispose(promiseReturningListener);

        expect(disposable.dispose()).toBe(true);
        expect(listenerCompleted).toBe(false);

        deferred.resolve();
        await deferred.promise;
        await flushMicrotasks();

        expect(listenerCompleted).toBe(true);
      });
    });
  });

  describe('.onDisposed(listener)', () => {
    it('runs after sync onDispose listeners finish and after isDisposed becomes true', async () => {
      const disposable = createDisposable();
      const events: string[] = [];

      disposable.onDispose(() => {
        events.push('onDispose');
        expect(disposable.isDisposed).toBe(false);
      });

      const onDisposedListener = vi.fn((result: DisposeResult) => {
        events.push('onDisposed');
        expect(disposable.isDisposed).toBe(true);
        expect(result.isSuccess).toBe(true);
      });

      disposable.onDisposed(onDisposedListener);
      disposable.dispose();

      await flushMicrotasks();

      expect(events).toStrictEqual(['onDispose', 'onDisposed']);
      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    it('waits for promise-returning onDispose listeners before firing', async () => {
      const disposable = createDisposable();
      const deferred = createDeferred<void>();
      const events: string[] = [];

      disposable.onDispose(async () => {
        events.push('onDispose-start');
        await deferred.promise;
        events.push('onDispose-end');
      });

      const onDisposedListener = vi.fn((result: DisposeResult) => {
        events.push('onDisposed');
        expect(result.isSuccess).toBe(true);
      });

      disposable.onDisposed(onDisposedListener);
      disposable.dispose();

      expect(onDisposedListener).not.toHaveBeenCalled();

      deferred.resolve();
      await deferred.promise;
      await flushMicrotasks();

      expect(events).toStrictEqual([
        'onDispose-start',
        'onDispose-end',
        'onDisposed',
      ]);
      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    it('late onDisposed subscription after completion invokes immediately with the cached result', async () => {
      const disposable = createDisposable();
      const deferred = createDeferred<void>();

      disposable.onDispose(() => deferred.promise);
      disposable.dispose();

      deferred.resolve();
      await deferred.promise;
      await flushMicrotasks();

      const events: string[] = [];
      const lateListener = vi.fn((result: DisposeResult) => {
        events.push('lateListener');
        expect(result.isSuccess).toBe(true);
      });

      events.push('beforeLateSubscribe');
      disposable.onDisposed(lateListener);
      events.push('afterLateSubscribe');

      expect(events).toStrictEqual([
        'beforeLateSubscribe',
        'lateListener',
        'afterLateSubscribe',
      ]);
      expect(lateListener).toHaveBeenCalledTimes(1);
    });

    it('multiple onDisposed subscribers receive the same final DisposeResult', async () => {
      const disposable = createDisposable();
      const deferred = createDeferred<void>();

      disposable.onDispose(() => deferred.promise);

      const onDisposed1 = vi.fn();
      const onDisposed2 = vi.fn();

      disposable.onDisposed(onDisposed1);
      disposable.onDisposed(onDisposed2);
      disposable.dispose();

      deferred.resolve();
      await deferred.promise;
      await flushMicrotasks();

      expect(onDisposed1).toHaveBeenCalledTimes(1);
      expect(onDisposed2).toHaveBeenCalledTimes(1);
      expect(onDisposed2.mock.calls[0][0]).toBe(onDisposed1.mock.calls[0][0]);
    });

    it('one failing listener produces DisposeError.errors with length 1', async () => {
      const disposable = createDisposable();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const listenerError = new Error('boom');

      try {
        disposable.onDispose(() => {
          throw listenerError;
        });

        let result: DisposeResult | undefined;
        disposable.onDisposed((receivedResult: DisposeResult) => {
          result = receivedResult;
        });

        disposable.dispose();
        await flushMicrotasks();

        if (result == null) {
          throw new Error('Expected onDisposed to receive a result');
        }

        if (result.isSuccess) {
          throw new Error('Expected disposal to fail');
        }

        expect(result.error.errors).toHaveLength(1);
        expect(result.error.errors[0]).toBe(listenerError);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('normalizes multiple failures into a single DisposeError object', async () => {
      const disposable = createDisposable();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const syncError = new Error('sync');
      const asyncError = new Error('async');

      try {
        disposable.onDispose(() => {
          throw syncError;
        });
        disposable.onDispose(async () => {
          throw asyncError;
        });

        let result: DisposeResult | undefined;
        disposable.onDisposed((receivedResult: DisposeResult) => {
          result = receivedResult;
        });

        disposable.dispose();
        await flushMicrotasks();

        if (result == null) {
          throw new Error('Expected onDisposed to receive a result');
        }

        if (result.isSuccess) {
          throw new Error('Expected disposal to fail');
        }

        expect(result.error.errors).toHaveLength(2);
        expect(result.error.errors).toEqual(
          expect.arrayContaining([syncError, asyncError])
        );
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('returns an unsubscribe function that removes the completion listener', async () => {
      const disposable = createDisposable();
      const deferred = createDeferred<void>();
      const onDisposedListener = vi.fn();

      disposable.onDispose(() => deferred.promise);

      const unsubscribe = disposable.onDisposed(onDisposedListener);
      unsubscribe();

      disposable.dispose();
      deferred.resolve();
      await deferred.promise;
      await flushMicrotasks();

      expect(onDisposedListener).not.toHaveBeenCalled();
    });
  });

  describe('public types', () => {
    it('exposes the split lifecycle contract', () => {
      const disposable = createDisposable();
      const typedDisposable: Disposable = createDisposable();

      expectTypeOf(typedDisposable).toEqualTypeOf<Disposable>();

      const onDisposeUnsubscribe = disposable.onDispose(() => undefined);
      expectTypeOf(onDisposeUnsubscribe).toEqualTypeOf<() => void>();

      const onDisposedUnsubscribe = disposable.onDisposed(
        (_result: DisposeResult) => undefined
      );
      expectTypeOf(onDisposedUnsubscribe).toEqualTypeOf<() => void>();
      expectTypeOf<Parameters<OnDisposedListener>[0]>().toEqualTypeOf<DisposeResult>();

      const onDisposeListener: OnDisposeListener = async () => undefined;
      expectTypeOf(onDisposeListener).toEqualTypeOf<OnDisposeListener>();

      // @ts-expect-error `dispose(onCompleted)` is no longer valid.
      disposable.dispose((_result) => undefined);

      // @ts-expect-error `OnDisposedListener` now observes completion, not cleanup.
      const oldCleanupListener: OnDisposedListener = async () => undefined;

      void oldCleanupListener;
    });
  });
});

import { createDisposable } from './disposable.js';
import { assert } from '@pvorona/assert';
import { isFailure, isSuccess } from '@pvorona/failable';

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

    it('is true inside an onDisposed listener', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn(() => {
        expect(disposable.isDisposing).toBe(true);
      });

      disposable.onDisposed(onDisposedListener);
      disposable.dispose();

      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    it('is false after dispose() returns', () => {
      const disposable = createDisposable();
      disposable.onDisposed(() => undefined);

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

    it('calls onCompleted for subsequent dispose(onCompleted) calls with the original result', () => {
      const disposable = createDisposable();
      disposable.onDisposed(() => undefined);

      const onCompleted1 = vi.fn();
      expect(disposable.dispose(onCompleted1)).toBe(true);
      expect(onCompleted1).toHaveBeenCalledTimes(1);
      const result1 = onCompleted1.mock.calls[0][0];

      const events: string[] = [];
      const onCompleted2 = vi.fn((result) => {
        events.push('onCompleted2');
        expect(result).toBe(result1);
      });

      events.push('beforeSecondDispose');
      expect(disposable.dispose(onCompleted2)).toBe(false);
      events.push('afterSecondDispose');

      expect(events).toStrictEqual([
        'beforeSecondDispose',
        'onCompleted2',
        'afterSecondDispose',
      ]);
      expect(onCompleted2).toHaveBeenCalledTimes(1);
    });

    it('calls onCompleted with Success when all listeners are sync and do not throw', () => {
      const disposable = createDisposable();
      disposable.onDisposed(() => undefined);

      const onCompleted = vi.fn();
      expect(disposable.dispose(onCompleted)).toBe(true);

      expect(onCompleted).toHaveBeenCalledTimes(1);
      expect(isSuccess(onCompleted.mock.calls[0][0])).toBe(true);
    });

    it('calls onCompleted with Failure when a listener throws', () => {
      const disposable = createDisposable();

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const listenerError = new Error('boom');
      disposable.onDisposed(() => {
        throw listenerError;
      });

      const onCompleted = vi.fn();

      try {
        expect(disposable.dispose(onCompleted)).toBe(true);

        expect(onCompleted).toHaveBeenCalledTimes(1);
        const result = onCompleted.mock.calls[0][0];
        expect(isFailure(result)).toBe(true);
        assert(isFailure(result));
        expect(result.error).toBe(listenerError);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('waits for promise listeners before calling onCompleted', async () => {
      const disposable = createDisposable();
      const deferred = createDeferred<void>();

      disposable.onDisposed(() => deferred.promise);

      const onCompleted = vi.fn();
      disposable.dispose(onCompleted);
      expect(onCompleted).not.toHaveBeenCalled();

      deferred.resolve();
      await deferred.promise;
      await Promise.resolve();

      expect(onCompleted).toHaveBeenCalledTimes(1);
      expect(isSuccess(onCompleted.mock.calls[0][0])).toBe(true);
    });

    it('queues subsequent dispose(onCompleted) calls while completion is pending and uses the original result', async () => {
      const disposable = createDisposable();
      const deferred = createDeferred<void>();

      disposable.onDisposed(() => deferred.promise);

      const onCompleted1 = vi.fn();
      expect(disposable.dispose(onCompleted1)).toBe(true);
      expect(onCompleted1).not.toHaveBeenCalled();

      const onCompleted2 = vi.fn();
      expect(disposable.dispose(onCompleted2)).toBe(false);
      expect(onCompleted2).not.toHaveBeenCalled();

      deferred.resolve();
      await deferred.promise;

      await Promise.resolve();
      await Promise.resolve();

      expect(onCompleted1).toHaveBeenCalledTimes(1);
      expect(onCompleted2).toHaveBeenCalledTimes(1);
      expect(onCompleted2.mock.calls[0][0]).toBe(onCompleted1.mock.calls[0][0]);
    });

    it('invokes onDisposed listeners exactly once', () => {
      const disposable = createDisposable();
      const onDisposedListener1 = vi.fn();
      const onDisposedListener2 = vi.fn();
      const onDisposedListener3 = vi.fn();

      disposable.onDisposed(onDisposedListener1);
      disposable.onDisposed(onDisposedListener2);
      disposable.onDisposed(onDisposedListener3);

      disposable.dispose();
      disposable.dispose();

      expect(onDisposedListener1).toHaveBeenCalledTimes(1);
      expect(onDisposedListener2).toHaveBeenCalledTimes(1);
      expect(onDisposedListener3).toHaveBeenCalledTimes(1);
    });

    it('is safe to call multiple times (idempotent)', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn();
      disposable.onDisposed(onDisposedListener);

      expect(disposable.dispose()).toBe(true);
      expect(disposable.dispose()).toBe(false);
      expect(disposable.dispose()).toBe(false);
      expect(disposable.isDisposed).toBe(true);
      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    it('invokes listeners synchronously (before dispose() returns)', () => {
      const disposable = createDisposable();
      const events: string[] = [];

      const onDisposedListener = vi.fn(() => {
        events.push('listener');
      });
      disposable.onDisposed(onDisposedListener);

      events.push('beforeDispose');
      disposable.dispose();
      events.push('afterDispose');

      expect(events).toStrictEqual([
        'beforeDispose',
        'listener',
        'afterDispose',
      ]);
      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    it('sets isDisposed=true only after all listeners execute', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn(() => {
        expect(disposable.isDisposed).toBe(false);
        expect(disposable.isDisposing).toBe(true);
      });
      disposable.onDisposed(onDisposedListener);

      disposable.dispose();

      expect(disposable.isDisposing).toBe(false);
      expect(disposable.isDisposed).toBe(true);
      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    describe('re-entrancy edge cases', () => {
      it('if a listener calls onDisposed(existingPendingListener) during dispose(), existingPendingListener is still called exactly once total', () => {
        const disposable = createDisposable();
        const events: string[] = [];

        const existingPendingListener = vi.fn(() => {
          events.push('existingPendingListener');
        });

        const outerListener = vi.fn(() => {
          events.push('outerListener-beforeSubscribe');
          disposable.onDisposed(existingPendingListener);
          events.push('outerListener-afterSubscribe');
        });

        disposable.onDisposed(outerListener);
        disposable.onDisposed(existingPendingListener);

        disposable.dispose();

        expect(outerListener).toHaveBeenCalledTimes(1);
        expect(existingPendingListener).toHaveBeenCalledTimes(1);
        expect(events).toStrictEqual([
          'outerListener-beforeSubscribe',
          'outerListener-afterSubscribe',
          'existingPendingListener',
        ]);
      });

      it('if a listener calls onDisposed(existingAlreadyCalledListener) during dispose(), existingAlreadyCalledListener is called again', () => {
        const disposable = createDisposable();
        const events: string[] = [];

        const existingAlreadyCalledListener = vi.fn(() => {
          events.push('existingAlreadyCalledListener');
        });

        const outerListener = vi.fn(() => {
          events.push('outerListener-beforeSubscribe');
          disposable.onDisposed(existingAlreadyCalledListener);
          events.push('outerListener-afterSubscribe');
        });

        disposable.onDisposed(existingAlreadyCalledListener);
        disposable.onDisposed(outerListener);

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

      it('if a listener calls onDisposed(itself) during dispose(), it runs again', () => {
        const disposable = createDisposable();

        let callCount = 0;
        const selfSubscribingListener = vi.fn(() => {
          callCount += 1;

          if (callCount === 1) {
            disposable.onDisposed(selfSubscribingListener);
          }
        });

        disposable.onDisposed(selfSubscribingListener);

        disposable.dispose();

        expect(selfSubscribingListener).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('.onDisposed(listener)', () => {
    it('does not call listener before .dispose()', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn();
      disposable.onDisposed(onDisposedListener);

      expect(onDisposedListener).not.toHaveBeenCalled();
    });

    it('calls listener when .dispose() is called', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn();
      disposable.onDisposed(onDisposedListener);

      disposable.dispose();

      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    it('supports multiple listeners (all are called once)', () => {
      const disposable = createDisposable();
      const listeners = Array.from({ length: 7 }, () => vi.fn());

      for (const listener of listeners) {
        disposable.onDisposed(listener);
      }

      disposable.dispose();

      for (const listener of listeners) {
        expect(listener).toHaveBeenCalledTimes(1);
      }
    });

    it('does not guarantee listener call order', () => {
      const disposable = createDisposable();
      const callOrder: string[] = [];

      const onDisposedListener1 = vi.fn(() => {
        callOrder.push('listener1');
      });
      const onDisposedListener2 = vi.fn(() => {
        callOrder.push('listener2');
      });

      disposable.onDisposed(onDisposedListener1);
      disposable.onDisposed(onDisposedListener2);

      disposable.dispose();

      expect(callOrder).toHaveLength(2);
      expect(callOrder).toEqual(
        expect.arrayContaining(['listener1', 'listener2'])
      );
      expect(onDisposedListener1).toHaveBeenCalledTimes(1);
      expect(onDisposedListener2).toHaveBeenCalledTimes(1);
    });

    it('de-dupes the same listener function (registering twice calls it once)', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn();

      disposable.onDisposed(onDisposedListener);
      disposable.onDisposed(onDisposedListener);

      disposable.dispose();

      expect(onDisposedListener).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe function that removes the listener', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn();

      const unsubscribe = disposable.onDisposed(onDisposedListener);
      unsubscribe();

      disposable.dispose();

      expect(onDisposedListener).not.toHaveBeenCalled();
    });

    it('unsubscribe is idempotent (can be called multiple times)', () => {
      const disposable = createDisposable();
      const onDisposedListener = vi.fn();

      const unsubscribe = disposable.onDisposed(onDisposedListener);

      expect(() => unsubscribe()).not.toThrow();
      expect(() => unsubscribe()).not.toThrow();

      disposable.dispose();

      expect(onDisposedListener).not.toHaveBeenCalled();
    });

    it('unsubscribing inside a listener does not break other listeners', () => {
      const disposable = createDisposable();

      let unsubscribe1: () => void = () => undefined;

      const onDisposedListener1 = vi.fn(() => {
        unsubscribe1();
      });
      const onDisposedListener2 = vi.fn();

      unsubscribe1 = disposable.onDisposed(onDisposedListener1);
      disposable.onDisposed(onDisposedListener2);

      disposable.dispose();

      expect(onDisposedListener1).toHaveBeenCalledTimes(1);
      expect(onDisposedListener2).toHaveBeenCalledTimes(1);
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

      disposable.onDisposed(listenerA);
      unsubscribeB = disposable.onDisposed(listenerB);

      disposable.dispose();

      if (callSequence[0] === 'listenerA') {
        expect(listenerB).not.toHaveBeenCalled();
      }

      expect(listenerA).toHaveBeenCalledTimes(1);
    });

    describe('late subscription', () => {
      it('if already disposed, onDisposed(listener) calls listener immediately', () => {
        const disposable = createDisposable();
        disposable.dispose();

        const onDisposedListener = vi.fn();
        disposable.onDisposed(onDisposedListener);

        expect(onDisposedListener).toHaveBeenCalledTimes(1);
      });

      it('if already disposed, unsubscribe returned from onDisposed() is a no-op', () => {
        const disposable = createDisposable();
        disposable.dispose();

        const onDisposedListener = vi.fn();
        const unsubscribe = disposable.onDisposed(onDisposedListener);

        expect(() => unsubscribe()).not.toThrow();
        expect(() => unsubscribe()).not.toThrow();

        expect(onDisposedListener).toHaveBeenCalledTimes(1);
      });
    });

    describe('subscription during disposal', () => {
      it('if a listener calls onDisposed(newListener) during dispose(), newListener is called later in the same dispose() call', () => {
        const disposable = createDisposable();
        const events: string[] = [];

        const newOnDisposedListener = vi.fn(() => {
          events.push('newListener');
        });

        const onDisposedListener = vi.fn(() => {
          events.push('outerListener-beforeSubscribe');
          disposable.onDisposed(newOnDisposedListener);
          events.push('outerListener-afterSubscribe');
        });

        disposable.onDisposed(onDisposedListener);

        events.push('beforeDispose');
        disposable.dispose();
        events.push('afterDispose');

        expect(newOnDisposedListener).toHaveBeenCalledTimes(1);
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
        const onDisposedListener = vi.fn();

        try {
          disposable.onDisposed(throwingListener);
          disposable.onDisposed(onDisposedListener);

          disposable.dispose();

          expect(throwingListener).toHaveBeenCalledTimes(1);
          expect(onDisposedListener).toHaveBeenCalledTimes(1);
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
          disposable.onDisposed(throwingListener);

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
          disposable.onDisposed(throwingListener);
          disposable.dispose();

          expect(consoleErrorSpy).toHaveBeenCalled();
        } finally {
          consoleErrorSpy.mockRestore();
        }
      });
    });

    describe('async listener behavior', () => {
      it('if an onDisposed listener returns a rejected promise, dispose(onCompleted) calls onCompleted with Failure', async () => {
        const disposable = createDisposable();

        const listenerError = new Error('boom');
        const throwingAsyncListener = vi.fn(async () => {
          throw listenerError;
        });

        const onCompleted = vi.fn();

        disposable.onDisposed(throwingAsyncListener);
        disposable.dispose(onCompleted);

        expect(onCompleted).not.toHaveBeenCalled();

        await Promise.resolve();
        await Promise.resolve();

        expect(throwingAsyncListener).toHaveBeenCalledTimes(1);
        expect(onCompleted).toHaveBeenCalledTimes(1);
        const result = onCompleted.mock.calls[0][0];
        expect(isFailure(result)).toBe(true);
        assert(isFailure(result));
        expect(result.error).toBe(listenerError);
      });

      it('if dispose() is called without onCompleted, a later dispose(onCompleted) still reports async failure', async () => {
        const disposable = createDisposable();

        const deferred = createDeferred<void>();
        disposable.onDisposed(() => deferred.promise);

        expect(disposable.dispose()).toBe(true);

        const onCompleted = vi.fn();
        expect(disposable.dispose(onCompleted)).toBe(false);

        expect(onCompleted).not.toHaveBeenCalled();

        const listenerError = new Error('boom');
        deferred.reject(listenerError);

        await Promise.resolve();
        await Promise.resolve();

        expect(onCompleted).toHaveBeenCalledTimes(1);
        const result = onCompleted.mock.calls[0][0];
        expect(isFailure(result)).toBe(true);
        assert(isFailure(result));
        expect(result.error).toBe(listenerError);
      });

      it('if an onDisposed listener returns a promise, disposal should remain sync', async () => {
        const disposable = createDisposable();

        const deferred = createDeferred<void>();

        let listenerCompleted = false;
        const promiseReturningListener = vi.fn(async () => {
          await deferred.promise;
          listenerCompleted = true;
        });

        disposable.onDisposed(promiseReturningListener);

        expect(disposable.dispose()).toBe(true);
        expect(listenerCompleted).toBe(false);

        deferred.resolve();
        await Promise.resolve();

        expect(listenerCompleted).toBe(true);
      });
    });
  });
});

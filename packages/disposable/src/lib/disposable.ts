import { isFunction } from '@pvorona/assert';
import { failure, success, type Failable } from '@pvorona/failable';
import { noop } from '@pvorona/noop';

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value != null && isFunction((value as Record<string, unknown>).then);
}

enum DisposableStatus {
  Active = 'active',
  Disposing = 'disposing',
  Disposed = 'disposed',
}

export type OnDisposeListener = (() => void) | (() => PromiseLike<unknown>);

export type DisposeError = {
  readonly errors: readonly [unknown, ...unknown[]];
};

export type DisposeResult = Failable<null, DisposeError>;

export type OnDisposedListener = (result: DisposeResult) => void;

export type Disposable = {
  readonly isDisposed: boolean;
  readonly isDisposing: boolean;
  readonly dispose: () => boolean;
  readonly onDispose: (listener: OnDisposeListener) => () => void;
  readonly onDisposed: (listener: OnDisposedListener) => () => void;
};

/**
 * Centralize teardown and completion observation for a unit of work.
 *
 * Use `onDispose(...)` to register cleanup callbacks, `dispose()` to start
 * disposal, and `onDisposed(...)` to observe the final `DisposeResult`.
 */
export function createDisposable(): Disposable {
  let status = DisposableStatus.Active;
  const onDisposeListeners = new Set<OnDisposeListener>();
  const onDisposedListeners = new Set<OnDisposedListener>();

  const disposalErrors: unknown[] = [];
  const pendingThenables: PromiseLike<unknown>[] = [];

  let completionResult: DisposeResult | null = null;
  let completionPromise: Promise<DisposeResult> | null = null;

  function createDisposeError(
    firstError: unknown,
    restErrors: readonly unknown[]
  ): DisposeError {
    return {
      errors: [firstError, ...restErrors],
    };
  }

  function createDisposeResult(
    additionalErrors: readonly unknown[] = []
  ): DisposeResult {
    const allErrors = disposalErrors.concat(additionalErrors);

    if (allErrors.length === 0) {
      return success(null);
    }

    const firstError = allErrors[0];
    const restErrors = allErrors.slice(1);

    return failure(createDisposeError(firstError, restErrors));
  }

  function callOnDisposedListenerAndLogSyncError(
    onDisposedListener: OnDisposedListener,
    result: DisposeResult
  ) {
    try {
      onDisposedListener(result);
    } catch (error) {
      console.error(error);
    }
  }

  function emitCompletionResult(result: DisposeResult): DisposeResult {
    completionResult = result;

    for (const onDisposedListener of onDisposedListeners) {
      callOnDisposedListenerAndLogSyncError(onDisposedListener, result);
    }

    onDisposedListeners.clear();

    return result;
  }

  function startCompletionIfNeeded() {
    if (status !== DisposableStatus.Disposed) return;
    if (completionResult !== null || completionPromise !== null) return;

    if (pendingThenables.length === 0) {
      emitCompletionResult(createDisposeResult());
      return;
    }

    completionPromise = Promise.allSettled(
      pendingThenables.map((pendingThenable) => Promise.resolve(pendingThenable))
    ).then((settledThenables) => {
      const asyncErrors = settledThenables.flatMap((settledThenable) =>
        settledThenable.status === 'rejected' ? [settledThenable.reason] : []
      );

      return emitCompletionResult(createDisposeResult(asyncErrors));
    });
  }

  function callOnDisposeListenerAfterDisposal(
    onDisposeListener: OnDisposeListener
  ) {
    try {
      const listenerResult = onDisposeListener();

      if (!isPromiseLike(listenerResult)) return;

      void Promise.resolve(listenerResult).catch((error) => {
        console.error(error);
      });
    } catch (error) {
      console.error(error);
    }
  }

  function invokeOnDisposeListenerAndTrackResult(
    onDisposeListener: OnDisposeListener
  ) {
    try {
      const listenerResult = onDisposeListener();

      if (isPromiseLike(listenerResult)) {
        pendingThenables.push(listenerResult);
      }
    } catch (error) {
      disposalErrors.push(error);
      console.error(error);
    }
  }

  return {
    get isDisposed() {
      return status === DisposableStatus.Disposed;
    },
    get isDisposing() {
      return status === DisposableStatus.Disposing;
    },
    dispose: () => {
      if (status !== DisposableStatus.Active) return false;

      status = DisposableStatus.Disposing;

      while (onDisposeListeners.size > 0) {
        const next = onDisposeListeners.values().next();
        if (next.done) break;
        const onDisposeListener = next.value;
        onDisposeListeners.delete(onDisposeListener);
        invokeOnDisposeListenerAndTrackResult(onDisposeListener);
      }

      status = DisposableStatus.Disposed;
      startCompletionIfNeeded();

      return true;
    },
    onDispose: (onDisposeListener: OnDisposeListener) => {
      if (status === DisposableStatus.Disposed) {
        onDisposeListeners.delete(onDisposeListener);
        callOnDisposeListenerAfterDisposal(onDisposeListener);
        return noop;
      }

      onDisposeListeners.add(onDisposeListener);

      let isUnsubscribed = false;

      return () => {
        if (isUnsubscribed) return;

        isUnsubscribed = true;
        onDisposeListeners.delete(onDisposeListener);
      };
    },
    onDisposed: (onDisposedListener: OnDisposedListener) => {
      if (completionResult !== null) {
        callOnDisposedListenerAndLogSyncError(
          onDisposedListener,
          completionResult
        );
        return noop;
      }

      onDisposedListeners.add(onDisposedListener);

      let isUnsubscribed = false;

      return () => {
        if (isUnsubscribed) return;

        isUnsubscribed = true;
        onDisposedListeners.delete(onDisposedListener);
      };
    },
  } satisfies Disposable;
}

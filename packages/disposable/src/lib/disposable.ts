import { isFunction } from '@pvorona/assert';
import { Failable } from '@pvorona/failable';
import type { Failable as FailableType } from '@pvorona/failable';
import { noop } from '@pvorona/noop';

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value != null && isFunction((value as Record<string, unknown>).then);
}

enum DisposableStatus {
  Active = 'active',
  Disposing = 'disposing',
  Disposed = 'disposed',
}

export type OnDisposedListener = (() => void) | (() => PromiseLike<unknown>);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnCompletedListener = <Error = any>(
  result: FailableType<null, Error>
) => void;

export type Disposable = {
  readonly isDisposed: boolean;
  readonly isDisposing: boolean;
  /** Returns `true` if disposing was started by this call, `false` otherwise. */
  readonly dispose: (onCompleted?: OnCompletedListener) => boolean;
  readonly onDisposed: (listener: OnDisposedListener) => () => void;
};

/**
 * Disposable
 * ==========
 *
 * Centralize teardown/cleanup for a unit of work (component, controller,
 * service, request, etc.). Register many cleanup callbacks, then run them all
 * exactly once via `dispose()`.
 *
 * ## Core semantics
 *
 * - **Status model**: `active` → `disposing` → `disposed`
 *   - `isDisposing` is `true` only while `dispose()` is executing.
 *   - `isDisposed` becomes `true` only **after** all registered listeners
 *     have been *invoked*. (If a listener returns a promise, `dispose()`
 *     does not wait for it to resolve.)
 * - **Idempotent**:
 *   - `dispose()` returns `true` on the first call.
 *   - `dispose()` returns `false` when already disposed or when called
 *     re-entrantly during disposal.
 * - **Listener registration**:
 *   - `onDisposed(listener)` registers a listener and returns an unsubscribe.
 *   - If `onDisposed()` is called *during* disposal (e.g. from another
 *     listener), it is queued and will run later in the **same** `dispose()`
 *     call (drain-loop behavior).
 *   - If already disposed, `onDisposed(listener)` invokes the listener
 *     immediately and returns `noop`.
 * - **Errors**:
 *   - Listener throws are caught and logged to `console.error`.
 *   - Promise rejections are not caught by default. If you need a
 *     completion result, use `dispose(onCompleted)`.
 *   - Other listeners still run.
 *
 * ## Usage examples
 *
 * ### Basic: own multiple teardown callbacks
 *
 * ```ts
 * const disposable = createDisposable();
 *
 * disposable.onDisposed(() => window.removeEventListener('resize', onResize));
 * disposable.onDisposed(() => clearInterval(intervalId));
 * disposable.onDisposed(() => observer.disconnect());
 *
 * disposable.dispose();
 * ```
 *
 * ### Inline teardown registration (preferred)
 *
 * ```ts
 * const disposable = createDisposable();
 *
 * disposable.onDisposed(addEventListeners(el, { click: onClick }));
 * disposable.onDisposed(autorun(effect));
 *
 * return () => disposable.dispose();
 * ```
 *
 * ### AbortController / cancellation
 *
 * ```ts
 * const disposable = createDisposable();
 * const abortController = new AbortController();
 * disposable.onDisposed(() => abortController.abort());
 * ```
 *
 * ## Gotchas
 *
 * - **Avoid infinite re-registration loops**: a listener that re-registers
 *   itself unconditionally will keep the drain-loop alive forever.
 * - **Order**: listeners are invoked in Set insertion order; re-registered
 *   listeners run again later.
 */
export function createDisposable() {
  let status = DisposableStatus.Active;
  const onDisposedListeners = new Set<OnDisposedListener>();
  const onCompletedListeners = new Set<OnCompletedListener>();

  const errors: unknown[] = [];
  const pendingThenables: PromiseLike<unknown>[] = [];

  let completionResult: FailableType<null, unknown> | null = null;
  let completion: Promise<FailableType<null, unknown>> | null = null;

  function finalize(extraErrors: unknown[] = []): FailableType<null, unknown> {
    const allErrors = errors.concat(extraErrors);
    const result =
      allErrors.length === 0
        ? Failable.ofSuccess(null)
        : Failable.ofError(allErrors.length === 1 ? allErrors[0] : allErrors);

    completionResult = result;

    for (const onCompletedListener of onCompletedListeners) {
      try {
        onCompletedListener(result);
      } catch (error) {
        console.error(error);
      }
    }

    onCompletedListeners.clear();

    return result;
  }

  function startCompletionIfNeeded() {
    if (status !== DisposableStatus.Disposed) return;
    if (completionResult || completion || onCompletedListeners.size === 0)
      return;

    if (pendingThenables.length === 0) {
      completion = Promise.resolve(finalize());
      return;
    }

    completion = Promise.allSettled(
      pendingThenables.map((p) => Promise.resolve(p))
    ).then((settled) => {
      const asyncErrors = settled.flatMap((s) =>
        s.status === 'rejected' ? [s.reason] : []
      );
      return finalize(asyncErrors);
    });
  }

  function callListenerAndLogSyncError(onDisposedListener: OnDisposedListener) {
    try {
      onDisposedListener();
    } catch (error) {
      console.error(error);
    }
  }

  function invokeListenerAndTrackPromiseLikeResult(
    onDisposedListener: OnDisposedListener
  ) {
    try {
      const listenerResult = onDisposedListener();
      if (isPromiseLike(listenerResult)) {
        pendingThenables.push(listenerResult);
      }
    } catch (error) {
      errors.push(error);
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
    dispose: (onCompleted?: OnCompletedListener) => {
      const onCompletedListener = isFunction(onCompleted)
        ? onCompleted
        : undefined;
      if (onCompletedListener) {
        if (completionResult) {
          const result = completionResult;
          try {
            onCompletedListener(result);
          } catch (error) {
            console.error(error);
          }
        } else {
          onCompletedListeners.add(onCompletedListener);
          startCompletionIfNeeded();
        }
      }

      if (status !== DisposableStatus.Active) return false;

      status = DisposableStatus.Disposing;

      while (onDisposedListeners.size > 0) {
        const next = onDisposedListeners.values().next();
        if (next.done) break;
        const onDisposedListener = next.value;
        onDisposedListeners.delete(onDisposedListener);
        invokeListenerAndTrackPromiseLikeResult(onDisposedListener);
      }

      status = DisposableStatus.Disposed;
      startCompletionIfNeeded();

      return true;
    },
    onDisposed: (onDisposedListener: OnDisposedListener) => {
      if (status === DisposableStatus.Disposed) {
        onDisposedListeners.delete(onDisposedListener);
        callListenerAndLogSyncError(onDisposedListener);
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

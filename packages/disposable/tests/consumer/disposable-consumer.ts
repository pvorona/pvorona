import {
  createDisposable,
  type Disposable,
  type DisposeResult,
} from '@pvorona/disposable';

const disposable: Disposable = createDisposable();

disposable.onDispose(() => undefined);
disposable.onDispose(async () => undefined);
disposable.onDisposed((result: DisposeResult) => {
  if (result.isFailure) {
    console.error(result.error.errors);
    return;
  }

  const data: null = result.data;
  void data;
});

const didStartDisposal: boolean = disposable.dispose();

void didStartDisposal;

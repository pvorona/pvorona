import {
  createDisposable,
  type Disposable,
  type DisposeResult,
} from '@pvorona/disposable';

const disposable: Disposable = createDisposable();

disposable.onDispose(() => undefined);
disposable.onDispose(async () => undefined);
disposable.onDisposed((result: DisposeResult) => {
  if (result.isSuccess) return;

  console.error(result.error.errors);
});

const didStartDisposal: boolean = disposable.dispose();

void didStartDisposal;

import { noop } from '@pvorona/noop';

export function withFinally(run: () => void, onFinally: () => void = noop) {
  try {
    run();
  } finally {
    onFinally();
  }
}

const onError: (error: unknown) => void = noop;

withFinally(noop);
onError(new Error('boom'));

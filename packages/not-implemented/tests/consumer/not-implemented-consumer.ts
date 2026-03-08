import {
  NotImplementedError,
  notImplemented,
} from '@pvorona/not-implemented';

const error = new NotImplementedError('Feature X');
const errorName: string = error.name;

export function decodeBase32(input: string): Uint8Array {
  void input;
  notImplemented('decodeBase32');
}

void errorName;

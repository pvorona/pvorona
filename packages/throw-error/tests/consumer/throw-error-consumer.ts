import { throwError } from '@pvorona/throw-error';

function parsePort(input: string): number {
  const port = Number(input);

  if (!Number.isInteger(port) || port <= 0 || port >= 65_536) {
    throwError(new RangeError(`Invalid port: ${input}`));
  }

  return port;
}

export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (condition) return;

  throwError(new Error(message), invariant);
}

const port = parsePort('3000');

invariant(port > 0, 'Port must be positive');

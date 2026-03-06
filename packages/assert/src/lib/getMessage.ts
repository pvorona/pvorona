import { resolveValueOrGetter } from './resolveValueOrGetter.js';

export function getMessage(
  messageOrMessageGetter?: undefined | string | (() => string),
) {
  if (typeof messageOrMessageGetter === 'function') {
    return resolveValueOrGetter<string>(messageOrMessageGetter);
  }

  return resolveValueOrGetter(messageOrMessageGetter);
}

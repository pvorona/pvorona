import { resolveValueOrGetter } from './resolveValueOrGetter.js';

export function getMessage(
  messageOrMessageGetter?: undefined | string | (() => string),
) {
  return resolveValueOrGetter<string | undefined>(messageOrMessageGetter);
}

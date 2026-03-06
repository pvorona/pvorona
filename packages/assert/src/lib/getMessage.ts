import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';

export function getMessage(
  messageOrMessageGetter?: undefined | string | (() => string),
) {
  if (typeof messageOrMessageGetter === 'function') {
    return resolveValueOrGetter<string>(messageOrMessageGetter);
  }

  return resolveValueOrGetter(messageOrMessageGetter);
}

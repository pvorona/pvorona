import { isFunction } from './isFunction.js';

export function getMessage(
  messageOrMessageGetter?: undefined | string | (() => string),
) {
  return isFunction(messageOrMessageGetter)
    ? messageOrMessageGetter()
    : messageOrMessageGetter;
}

import { isFunction } from './isFunction.js';

export function getMessage(
  messageOrMessageGetter?: undefined | string | (() => string),
) {
  if (!isFunction(messageOrMessageGetter)) return messageOrMessageGetter;

  return messageOrMessageGetter();
}

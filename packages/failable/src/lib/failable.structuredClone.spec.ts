import { faker } from '@faker-js/faker';
import { Failable } from './failable.js';

function structuredCloneViaMessageChannel<T>(value: T): Promise<T> {
  return new Promise((resolve, reject) => {
    const { port1, port2 } = new MessageChannel();

    const cleanup = () => {
      port1.close();
      port2.close();
    };

    port2.on('message', (data: T) => {
      cleanup();
      resolve(data);
    });

    port2.on('messageerror', () => {
      cleanup();
      reject(new Error('MessagePort messageerror'));
    });
    port1.postMessage(value);
  });
}

describe('structured-clone transport', () => {
  it('clones FailableLikeSuccess and can be rehydrated', async () => {
    const data = faker.number.float();
    const failable = Failable.ofSuccess(data);
    const failableLike = Failable.toFailableLike(failable);
    const cloned = await structuredCloneViaMessageChannel(failableLike);

    expect({ ...cloned }).toStrictEqual(failableLike);
    expect(Failable.isFailableLike(cloned)).toBe(true);
    expect(Failable.from(cloned)).toStrictEqual(failable);
  });

  it('clones FailableLikeFailure and can be rehydrated', async () => {
    const error = faker.string.uuid();
    const failable = Failable.ofError(error);
    const failableLike = Failable.toFailableLike(failable);
    const cloned = await structuredCloneViaMessageChannel(failableLike);

    expect({ ...cloned }).toStrictEqual(failableLike);
    expect(Failable.isFailableLike(cloned)).toBe(true);
    expect(Failable.from(cloned)).toStrictEqual(Failable.ofError(error));
  });
});

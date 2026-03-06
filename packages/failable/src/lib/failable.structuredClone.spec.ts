import { faker } from '@faker-js/faker';
import { createFailable, failure, isFailableLike, success, toFailableLike } from './failable.js';

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
    const failable = success(data);
    const failableLike = toFailableLike(failable);
    const cloned = await structuredCloneViaMessageChannel(failableLike);

    expect({ ...cloned }).toStrictEqual(failableLike);
    expect(isFailableLike(cloned)).toBe(true);
    expect(createFailable(cloned)).toStrictEqual(failable);
  });

  it('clones FailableLikeFailure and can be rehydrated', async () => {
    const error = faker.string.uuid();
    const failable = failure(error);
    const failableLike = toFailableLike(failable);
    const cloned = await structuredCloneViaMessageChannel(failableLike);

    expect({ ...cloned }).toStrictEqual(failableLike);
    expect(isFailableLike(cloned)).toBe(true);
    expect(createFailable(cloned)).toStrictEqual(failure(error));
  });

  it('clones array-backed FailableLikeFailure and preserves the raw error', async () => {
    const error = [faker.string.uuid(), faker.number.int()];
    const failable = failure(error);
    const failableLike = toFailableLike(failable);
    const cloned = await structuredCloneViaMessageChannel(failableLike);

    expect({ ...cloned }).toStrictEqual(failableLike);
    expect(isFailableLike(cloned)).toBe(true);
    expect(createFailable(cloned)).toStrictEqual(failure(error));
  });
});

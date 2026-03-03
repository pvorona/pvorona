# @pvorona/failable

A typed result type for expected failures. `Failable<T, E>` is a discriminated union of `Success<T>` and `Failure<E>`, with ergonomic accessors and structured-clone support.

## Usage

```ts
import { Failable } from '@pvorona/failable';

const result = Failable.from(() => JSON.parse(text));

if (result.isSuccess) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Factories

```ts
const success = Failable.ofSuccess(42);
const failure = Failable.ofError(new Error('boom'));
```

### Fallbacks

```ts
const value = failure.getOr('default'); // 'default'
const recovered = failure.or('fallback'); // Success<'fallback'>
```

### Wrapping async work

```ts
const result = await Failable.from(fetch('/api'));
```

### Structured-clone transport

`Failable` instances use Symbols and prototype methods that do not survive structured cloning (`postMessage`, `chrome.runtime.sendMessage`, etc.). Convert to a plain object first:

```ts
// sender
const wire = Failable.toFailableLike(result);
postMessage(wire);

// receiver
const hydrated = Failable.from(wire);
```

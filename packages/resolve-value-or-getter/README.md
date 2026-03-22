# @pvorona/resolve-value-or-getter

Resolve either a literal value or a lazy zero-argument getter.

## Install

```bash
npm i @pvorona/resolve-value-or-getter
```

## Usage

```ts
import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';

resolveValueOrGetter('value'); // 'value'
resolveValueOrGetter(() => 'computed'); // 'computed'
```

## API

### `resolveValueOrGetter(valueOrGetter)`

Accepts either:

- a non-function value
- a zero-argument getter returning a non-function value

Returns the value directly, or calls the getter and returns its result.

Function values are intentionally not supported, because a function input is
reserved for the lazy getter form.

# @pvorona/reference

A mutable value container with safe access patterns.

## Usage

```ts
import { createReference } from '@pvorona/reference';

const config = createReference<string | undefined>(undefined);

config.set('production');
config.getOrThrow();      // 'production'
config.getOr('default');  // 'production'
config.unset();
config.getOr('default');  // 'default'
config.getOrThrow();      // throws — reference is not set
```

### Lazy initialization

```ts
const connection = createReference<Connection | undefined>(undefined);

// Sets and returns value on first call, returns cached value after
const conn = connection.getOrSet(() => createConnection());
```

### Readonly view

```ts
const ref = createReference(42);
const readonly = ref.asReadonly();

readonly.getOrThrow(); // 42
readonly.set;          // undefined — only getOr and getOrThrow are exposed
```

# @pvorona/not-implemented

A typed `TODO` for code paths that haven't been implemented yet.

## Usage

```ts
import { notImplemented, NotImplementedError } from '@pvorona/not-implemented';

type Shape = 'circle' | 'square' | 'triangle';

function area(shape: Shape): number {
  switch (shape) {
    case 'circle':
      return Math.PI * r * r;
    case 'square':
      return side * side;
    case 'triangle':
      notImplemented('Triangle area');
  }
}

// Custom error handling
try {
  notImplemented();
} catch (e) {
  console.log(e instanceof NotImplementedError); // true
  console.log(e.message); // 'Not implemented'
}
```

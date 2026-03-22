# ADR 0001: Keep `run(...)` Delegation Syntax As `yield*`

- Status: Accepted
- Date: 2026-03-22

## Context

`@pvorona/failable` exposes `run(...)` as a generator-based composition API for
hydrated `Failable` values.

Today, the public contract is:

- sync builders: `yield* result`
- async builders: `yield* result` and `yield* await promisedResult`

This raises a natural API question: why not support direct `yield` instead?

Examples:

```ts
const value = yield success(123);
const data = yield await failable(fetch(url));
```

The short answer is:

- runtime support for direct `yield` is possible
- preserving the current inference quality is not

## Explored Concepts

### 1. Keep the current delegation protocol

```ts
const value = yield* success(123);

const data = yield* await failable(fetch(url));
```

This is the current design. Each hydrated `Failable` exposes iterators used only
by `run(...)`.

### 2. Support raw `yield` of hydrated `Failable`

```ts
const value = yield success(123);
```

This would require `run(...)` to treat raw yielded `Failable` values as steps.
At runtime this is feasible.

Inference profile:

- error channel: can still be inferred from the yielded `Failable` union
- success channel: degrades because all resumed values share the generator's
  single `TNext` slot

### 3. Support raw `yield` of promised `Failable` in async builders

```ts
const value = yield await failable(fetch(url));
```

This is the async equivalent of direct `yield`. It has the same typing profile:

- error channel can still be represented from yielded step types
- success channel degrades for the same reason as sync direct `yield`

### 4. Support yielding `PromiseLike<Failable<...>>` directly

```ts
const value = yield failable(fetch(url));
```

This would require `run(...)` to accept promises as yielded steps and await them
internally. That is also possible at runtime, but it does not solve the typing
problem.

### 5. Inject a helper into generator builders (`get` / `step`)

Example:

```ts
return run(function* ({ get }) {
  const host = yield* get(readEnv('HOST'));
  const port = yield* get(readEnv('PORT'));

  return success({ host, port });
});
```

With a different helper name:

```ts
return run(function* ({ step }) {
  const host = yield* step(readEnv('HOST'));
  const port = yield* step(readEnv('PORT'));

  return success({ host, port });
});
```

This keeps the generator-based API and keeps delegation, but moves the step
boundary from `yield* result` to `yield* helper(result)`.

Evaluation:

- It can hide iterator-based internals from call sites.
- It makes the step boundary explicit in one public helper.
- It preserves the same success-channel and error-channel inference as the
  current `yield* result` design, because it still relies on delegation.
- It does not remove `yield*`, so it does not solve the main syntax complaint.
- It adds helper injection to every `run(...)` builder.
- It expands the public API surface with helper names that must be documented
  and kept stable.
- It does not materially improve inference over the current `yield* result`
  design.
- It makes async composition naming and behavior another public design problem.

Conclusion:

This is a lateral move, not a real simplification. It hides internals, but does
not improve the core ergonomics or type story enough to justify becoming the
public contract.

### 6. Replace the generator DSL with a helper-style API

Example:

```ts
return run(async (step) => {
  const host = await step(readEnv('HOST'));
  const port = await step(readEnv('PORT'));

  return success({ host, port });
});
```

This is the only direction explored here that can remove `yield*` while keeping
precise per-step inference. It is a different public API, not a small
adjustment to the current one.

Inference profile:

- success channel: good, because each `step(...)` call is its own generic call
  boundary
- error channel: weak unless made explicit, because `run(...)` cannot easily
  infer "the union of all error generics used across all `step(...)` calls in
  the callback body"

## How The Current Protocol Works

The public `yield* result` syntax is not cosmetic. It is the protocol boundary
that lets `run(...)` observe a step in a typed way.

Each hydrated `Failable` implements `[Symbol.iterator]` and
`[Symbol.asyncIterator]`. Those iterators do not yield the `Failable` itself.
They yield an internal `RunGet<T, E, TSource>` token and return `T`.

Conceptually:

```ts
function* getRunIterator<T, E>(source: Failable<T, E>) {
  return (yield RunGet.create(source)) as T;
}
```

`run(...)` consumes those yielded `RunGet` tokens, reads the underlying source,
and either:

- resumes the generator with `source.data` on success
- short-circuits with the failure on error

`yield*` matters because it delegates into that iterator. Plain `yield` does
not.

## Evaluation Of Injected Helpers (`get` / `step`)

Injected helpers are worth separating from direct `yield`, because they solve a
different problem.

An injected helper can improve explicitness:

- `yield* result` uses iterator delegation as the public marker for a step
- `yield* get(result)` uses a named helper as the public marker for a step

That is a valid design preference. The problem is that it keeps the same
generator mechanics while adding more public API surface.

Compared to the current design, injected helpers have these tradeoffs:

- Better:
  - the step boundary is named explicitly
  - the helper can hide iterator-based internals from users
- Worse:
  - every `run(...)` builder now has an injected parameter
  - helper naming becomes part of the API design problem
  - the syntax is still `yield* ...`, so the main complaint remains
  - helper injection encourages further DSL growth such as injected combinators

From a maintenance perspective, this is the important point:

Injected helpers add conceptual weight without buying a corresponding inference
or control-flow benefit. They are easier to justify as an internal
implementation detail than as a public builder contract.

## Inference Differences Across Approaches

The approaches differ in two separate dimensions:

- success-channel inference: does each step recover its own success type at the
  call site?
- error-channel inference: can `run(...)` infer the union of failure types from
  all used steps?

### Current design: `yield* result`

- success channel: yes
- error channel: yes

This is the strongest inference profile with the smallest current public API
surface.

### Direct `yield result`

- success channel: no
- error channel: mostly yes

The yielded step types can still carry error information, but the resumed values
inside the builder lose precision because generator `yield` uses one shared
`TNext` type.

### Injected generator helper: `yield* get(result)` / `yield* step(result)`

- success channel: yes
- error channel: yes

This keeps the current inference behavior, but grows the public API surface
without materially improving the model.

### Callback helper API: `await step(result)`

- success channel: yes
- error channel: not automatically, or only weakly

This approach gives each step its own generic call site, so success typing is
good. The hard part is collecting all step error generics back into the outer
`run(...)` result type. In practice, that usually requires:

- an explicit outer error generic, or
- more complex helper machinery than the current API

## Why Direct `yield` Does Not Work Well

Direct `yield` does not fail because JavaScript forbids it. It fails because the
generator type model is too weak for the API quality we want.

With generators, the resumed value type is a single `TNext` for the whole
builder, not one per `yield` site.

That means this shape:

```ts
return run(function* () {
  const host = yield readEnv('HOST', env);
  const port = yield parsePort(host);

  return success({ host, port });
});
```

cannot preserve the local types we want.

If:

- `readEnv(...)` conceptually resumes with `string`
- `parsePort(...)` conceptually resumes with `number`

then `host` and `port` are forced through the same generator `TNext` slot.
In practice, the type becomes a shared union, a widened type, or `unknown`.

That produces bad inference:

- `host` is no longer reliably `string`
- `port` is no longer reliably `number`
- later steps lose the data shape established by earlier successful steps
- the API becomes much harder to use in real code

Async direct `yield` has the same problem:

```ts
const response = yield await failable(fetch(url));
const body = yield await failable(response.json());
```

Even if `run(...)` accepted those raw yielded values at runtime, the expression
types after each `yield` would still share the generator's single resumed-value
type.

## Why `yield*` Preserves Inference

`yield*` delegates to a specific iterator instance for a specific step.

That lets each step carry its own return type:

- `yield* readEnv(...)` can be `string`
- `yield* parsePort(...)` can be `number`
- `yield* await fetchStep(...)` can be `Response`

The current design uses the iterator return type of each delegated `Failable`
step to recover the exact success type at that call site.

This is the core reason `run(...)` remains usable despite being generator-based.

Just as importantly, the yielded `RunGet<T, E, TSource>` tokens preserve the
error channel separately from the resumed success value. That lets `run(...)`
compute the failure union from all delegated steps while still giving each step
its own success type locally.

## Decision

Keep `run(...)` on the current public protocol:

- `yield* result`
- `yield* await promisedResult`

Selected approach rationale:

- smallest public API surface among the approaches that preserve both channels
- preserves success-channel inference
- preserves error-channel inference
- does not require injected builder helpers
- does not require a separate callback-style execution model

Do not add support for:

- `yield result`
- `yield await promisedResult`
- direct yielding of `PromiseLike<Failable<...>>`
- injected generator helpers such as `{ get }` or `{ step }`

inside the current `run(...)` API.

## Consequences

- `Failable` keeps its iterator-based integration with `run(...)`.
- `run(...)` keeps precise per-step inference for success values.
- `run(...)` keeps automatic error-channel inference across yielded steps.
- Direct `yield` stays unsupported by design.
- Async flows continue to use `yield* await promisedResult`.
- Generator helper injection stays out of the public contract.

If a future API goal is to remove `yield*`, the correct direction is not direct
`yield`. A separate helper-style API is a better direction than injected
generator helpers, because it gives each step its own generic call boundary.

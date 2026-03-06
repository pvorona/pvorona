# `@pvorona/counter` README design (2026-03-06)

## Goal

Make `packages/counter/README.md` easier to understand while keeping it very concise.

## Intended changes

- Keep the existing high-level structure: `Install`, `Usage`, `API`
- Replace the advanced `Pick<Counter, ...>` example with one linear usage example
- Make the defaults and return values of `increment(...)` and `decrement(...)` explicit
- Keep the documented surface limited to `Counter` and `createCounter(...)`

## Non-goals

- No runtime or type API changes
- No expansion into tutorial-style documentation

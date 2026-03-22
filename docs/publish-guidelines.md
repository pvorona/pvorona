# Publish Guidelines

Use this flow when publishing public `@pvorona/*` packages from this workspace.

## Goals

- publish packages that are installable from npm without workspace-only dependencies
- validate the tarball surface before publish
- publish dependency leaves first so downstream semver ranges resolve immediately
- verify the public npm install path after publish

## Package metadata rules

- Public packages must set `publishConfig.access` to `"public"`.
- Public packages should have a README and stable package metadata (`description`, `repository`, `homepage`, `bugs`) before first publish.
- Runtime dependencies on other `@pvorona/*` packages must use semver ranges such as `~1.0.1`, not exact workspace placeholders like `0.0.0`.
- Do not publish runtime dependencies on private workspace-only packages such as `@pvorona/types`.
- If a dependency is type-only, keep the type local or move it to a dev-only path instead of publishing it as a runtime dependency.
- If a package becomes public, make sure it is included in the Nx release config in [`nx.json`](../nx.json).

## Versioning rules

- Bump every package whose published tarball changes.
- Bump dependents when their published dependency metadata changes, even if runtime code does not.
- Prefer patch bumps for packaging or dependency-fix releases.
- Publish new dependency versions before publishing packages that consume them.

## Pre-publish checklist

1. Run `npm exec -- nx sync`.
2. Run unit tests for the packages you changed.
   Example:
   `npm exec -- nx run-many -t test --projects @pvorona/resolve-value-or-getter,@pvorona/assert`
3. Run public-surface validation with a writable npm cache.
   Example:
   `npm_config_cache=/tmp/pvorona-npm-cache npm exec -- nx run-many -t check-public-surface --projects @pvorona/resolve-value-or-getter,@pvorona/assert`
4. Confirm npm auth.
   Example:
   `npm_config_cache=/tmp/pvorona-npm-cache npm whoami`
5. Confirm the target versions are not already published.
   Example:
   `npm_config_cache=/tmp/pvorona-npm-cache npm view @pvorona/assert@1.0.1 version --json`

## Publish command

Use a temporary npm cache in this environment because the default `~/.npm` cache may have ownership problems.

Example:

```bash
npm_config_cache=/tmp/pvorona-npm-cache npm publish --access public
```

Publish from each package directory in dependency order.

## Current dependency-order guidance

For the packages touched in the March 2026 npm repair, this order was safe:

1. `@pvorona/resolve-value-or-getter`
2. `@pvorona/assert`
3. `@pvorona/failable`
4. `@pvorona/disposable`
5. `@pvorona/duration`
6. `@pvorona/reference`
7. `@pvorona/counter`

General rule: publish leaf dependencies first, then packages that depend on them.

## Post-publish verification

- Re-query npm metadata for the new versions.
  Example:
  `npm_config_cache=/tmp/pvorona-npm-cache npm view @pvorona/assert version dependencies --json`
- Reinstall the published packages in a clean temporary repo and run README-derived smoke tests.
- Keep the smoke test focused on the documented install/import path, not internal workspace paths.

## Release pitfalls to avoid

- Publishing a package that still depends on `0.0.0` workspace placeholders.
- Publishing a package that depends on a private workspace package.
- Forgetting to publish a newly public transitive dependency first.
- Skipping `check-public-surface`, which can hide tarball/export mismatches.
- Assuming local workspace resolution proves npm installability.

import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir:
    '../../node_modules/.vite/packages/resolve-value-or-getter-public-surface',
  test: {
    name: '@pvorona/resolve-value-or-getter public surface',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/public-surface.spec.ts'],
    reporters: ['default'],
  },
}));

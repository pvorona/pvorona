import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/assert-public-surface',
  test: {
    name: '@pvorona/assert public surface',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/public-surface.spec.ts'],
    reporters: ['default'],
  },
}));

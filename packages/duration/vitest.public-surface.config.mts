import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/packages/duration-public-surface',
  test: {
    name: '@pvorona/duration public surface',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/public-surface.spec.ts'],
    reporters: ['default'],
  },
}));

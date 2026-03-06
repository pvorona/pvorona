import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/not-implemented-public-surface',
  test: {
    name: '@pvorona/not-implemented public surface',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/public-surface.spec.ts'],
    reporters: ['default'],
  },
}));

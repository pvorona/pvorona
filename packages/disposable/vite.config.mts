/// <reference types='vitest' />
import { createPackageViteConfig } from '../../tools/vite/create-package-vite-config.js';

export default createPackageViteConfig({
  packageDir: import.meta.dirname,
  packageName: '@pvorona/disposable',
  externals: ['@pvorona/assert', '@pvorona/failable', '@pvorona/noop'],
  testInclude: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
});

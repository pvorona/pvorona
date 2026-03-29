/// <reference types='vitest' />
import { createPackageViteConfig } from '../../tools/vite/create-package-vite-config.js';

export default createPackageViteConfig({
  packageDir: import.meta.dirname,
  packageName: '@pvorona/assert',
  externals: ['@pvorona/throw-error'],
  testInclude: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
});

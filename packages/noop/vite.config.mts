/// <reference types='vitest' />
import { createPackageViteConfig } from '../../tools/vite/create-package-vite-config';

export default createPackageViteConfig({
  packageDir: import.meta.dirname,
  packageName: '@pvorona/noop',
  testInclude: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
});

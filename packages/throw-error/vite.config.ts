/// <reference types='vitest' />
import { createPackageViteConfig } from '../../tools/vite/create-package-vite-config';

export default createPackageViteConfig({
  packageDir: import.meta.dirname,
  packageName: '@pvorona/throw-error',
  testInclude: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
});

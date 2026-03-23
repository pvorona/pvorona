import { fileURLToPath } from 'node:url';
import { runPackageSurfaceCheck } from '../../../tools/package/run-package-surface-check.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const EXPECTED_PACKAGE_EXPORTS = {
  './package.json': './package.json',
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
    default: './dist/index.js',
  },
  './es-2018': {
    types: './dist/index.d.ts',
    default: './dist/es-2018/index.cjs',
  },
};

await runPackageSurfaceCheck({
  expectedExports: EXPECTED_PACKAGE_EXPORTS,
  packageRoot,
});

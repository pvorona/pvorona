import { fileURLToPath } from 'node:url';
import { runPackageSurfaceCheck } from '../../../tools/package/run-package-surface-check.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

await runPackageSurfaceCheck({ packageRoot });

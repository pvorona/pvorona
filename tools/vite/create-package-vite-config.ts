/// <reference types='vitest' />
import * as path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

type CreatePackageViteConfigOptions = {
  packageDir: string;
  packageName: string;
  externals?: string[];
  passWithNoTests?: boolean;
  testInclude: string[];
};

const LEGACY_BUILD_TARGET = 'es2018';

function capitalize(value: string): string {
  if (value.length === 0) return value;

  return value[0]!.toUpperCase() + value.slice(1);
}

function toPascalCase(value: string): string {
  return value
    .replace(/^@/, '')
    .split(/[/-]/g)
    .filter(Boolean)
    .map(capitalize)
    .join('');
}

function toGlobalName(moduleId: string): string {
  if (moduleId === 'tslib') return 'tslib';

  return toPascalCase(moduleId);
}

export function createPackageViteConfig({
  packageDir,
  packageName,
  externals = [],
  passWithNoTests = false,
  testInclude,
}: CreatePackageViteConfigOptions) {
  const packageId = packageName.replace(/^@pvorona\//, '');
  const globals = Object.fromEntries(
    externals.map((external) => [external, toGlobalName(external)])
  );

  return defineConfig(() => ({
    root: packageDir,
    cacheDir: `../../node_modules/.vite/packages/${packageId}`,
    plugins: [
      dts({
        entryRoot: 'src',
        tsconfigPath: path.join(packageDir, 'tsconfig.lib.json'),
      }),
    ],
    build: {
      outDir: './dist',
      emptyOutDir: true,
      // Keep published artifacts parseable by older bundlers such as webpack 4.
      target: LEGACY_BUILD_TARGET,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      lib: {
        entry: 'src/index.ts',
        // Keep ESM as the primary entrypoint and publish the legacy-targeted
        // compatibility bundle on a subpath named for its syntax target.
        name: toGlobalName(packageName),
        fileName(format) {
          return format === 'es' ? 'index.js' : 'es-2018/index.cjs';
        },
        formats: ['es', 'umd'],
      },
      rollupOptions: {
        external: externals,
        output: externals.length === 0 ? undefined : { globals },
      },
    },
    test: {
      name: packageName,
      watch: false,
      globals: true,
      environment: 'node',
      include: testInclude,
      reporters: ['default'],
      coverage: {
        reportsDirectory: './test-output/vitest/coverage',
        provider: 'v8',
      },
      ...(passWithNoTests ? { passWithNoTests } : {}),
    },
  }));
}

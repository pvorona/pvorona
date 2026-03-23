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
    externals.map((external) => [external, toGlobalName(external)]),
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
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      lib: {
        entry: 'src/index.ts',
        // Keep ESM as the primary entrypoint and publish UMD on a subpath.
        name: toGlobalName(packageName),
        fileName(format) {
          return format === 'es' ? 'index.js' : 'umd/index.cjs';
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

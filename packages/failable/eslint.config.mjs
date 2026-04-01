import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          // Nx mis-detects these declared workspace package imports in this lib.
          ignoredDependencies: [
            'vitest',
            '@pvorona/assert',
            '@pvorona/not-implemented',
            '@pvorona/types',
          ],
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
            '{projectRoot}/vitest.public-surface.config.{js,ts,mjs,mts}',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      'require-yield': 'off',
    },
  },
  {
    files: ['src/lib/failable.ts'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          // Nx misclassifies these existing workspace package imports in this file.
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            '@pvorona/assert',
            '@pvorona/not-implemented',
            '@pvorona/types',
          ],
          depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
        },
      ],
    },
  },
  {
    files: [
      'tests/public-surface.spec.{ts,tsx,js,jsx}',
      'tests/consumer/**/*.{ts,tsx,js,jsx}',
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
      'require-yield': 'off',
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { join } from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

function formatDiagnostics(diagnostics, currentDirectory) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName(fileName) {
      return fileName;
    },
    getCurrentDirectory() {
      return currentDirectory;
    },
    getNewLine() {
      return '\n';
    },
  });
}

async function main() {
  const consumerRoot = await mkdtemp(join(packageRoot, '.tmp-consumer-'));

  try {
    const entryPath = join(consumerRoot, 'index.ts');
    const tsconfigPath = join(consumerRoot, 'tsconfig.json');

    await writeFile(
      entryPath,
      [
        "import { addTo, duration, subtractFrom, TimeUnit } from '@pvorona/duration';",
        "import type { DurationParts } from '@pvorona/duration';",
        'const parts = { minutes: 1, seconds: 30 } satisfies DurationParts;',
        'const value = duration(parts);',
        'const start = new Date(1_000);',
        'value.toSeconds();',
        'addTo(start, value).getTime();',
        'subtractFrom(start, value).getTime();',
        'duration(1, TimeUnit.Hour).toSeconds();',
        '',
      ].join('\n'),
    );

    await writeFile(
      tsconfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            noEmit: true,
            isolatedModules: true,
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            target: 'ES2022',
            strict: true,
            skipLibCheck: true,
          },
          include: ['./index.ts'],
        },
        null,
        2,
      ),
    );

    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (configFile.error) {
      process.stderr.write(formatDiagnostics([configFile.error], consumerRoot));
      process.exitCode = 1;
      return;
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      consumerRoot,
      undefined,
      tsconfigPath,
    );

    if (parsedConfig.errors.length > 0) {
      process.stderr.write(formatDiagnostics(parsedConfig.errors, consumerRoot));
      process.exitCode = 1;
      return;
    }

    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    if (diagnostics.length > 0) {
      process.stderr.write(formatDiagnostics(diagnostics, consumerRoot));
      process.exitCode = 1;
      return;
    }

    process.stdout.write('Consumer type check passed.\n');
  } finally {
    await rm(consumerRoot, { recursive: true, force: true });
  }
}

await main();

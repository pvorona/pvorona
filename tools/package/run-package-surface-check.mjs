import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { isDeepStrictEqual, promisify } from 'node:util';
import * as acorn from 'acorn';

const execFileAsync = promisify(execFile);
const LEGACY_ECMA_VERSION = 2018;
const LEGACY_BUNDLER_LABEL = `ECMAScript ${LEGACY_ECMA_VERSION}`;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePackagePath(path) {
  return path.startsWith('./') ? path.slice(2) : path;
}

function collectExportTargets(exportsValue, ignoredConditionNames) {
  if (typeof exportsValue === 'string') {
    return [normalizePackagePath(exportsValue)];
  }

  if (Array.isArray(exportsValue)) {
    return exportsValue.flatMap((value) =>
      collectExportTargets(value, ignoredConditionNames)
    );
  }

  if (isPlainObject(exportsValue)) {
    return Object.entries(exportsValue).flatMap(([key, value]) => {
      if (ignoredConditionNames.has(key)) return [];

      return collectExportTargets(value, ignoredConditionNames);
    });
  }

  return [];
}

function isJavaScriptExportPath(path) {
  return /\.(?:c|m)?js$/u.test(path);
}

function toAcornSourceType(path) {
  return path.endsWith('.cjs') ? 'script' : 'module';
}

function createLegacySyntaxError(exportedPath, error) {
  const reason = error instanceof Error ? error.message : String(error);

  return new Error(
    [
      `Expected \`${exportedPath}\` to stay parseable by legacy bundlers.`,
      `Acorn failed at ${LEGACY_BUNDLER_LABEL}: ${reason}`,
    ].join('\n')
  );
}

async function assertLegacySyntaxCompatibility(packageRoot, exportedPaths) {
  const javascriptExportPaths = exportedPaths.filter(isJavaScriptExportPath);

  for (const exportedPath of javascriptExportPaths) {
    const filePath = join(packageRoot, exportedPath);
    const source = await readFile(filePath, 'utf8');

    try {
      acorn.parse(source, {
        allowHashBang: true,
        ecmaVersion: LEGACY_ECMA_VERSION,
        sourceType: toAcornSourceType(exportedPath),
      });
    } catch (error) {
      throw createLegacySyntaxError(exportedPath, error);
    }
  }
}

async function collectTarballPaths(packageRoot) {
  const { stdout } = await execFileAsync(
    'npm',
    ['pack', '--dry-run', '--json'],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        npm_config_cache: join(
          tmpdir(),
          'pvorona-npm-cache',
          String(process.pid)
        ),
      },
    }
  );

  const [packResult] = JSON.parse(stdout);
  if (!packResult || !Array.isArray(packResult.files)) {
    throw new TypeError(
      'Expected `npm pack --dry-run --json` to return file metadata.'
    );
  }

  return new Set(packResult.files.map((file) => file.path));
}

function createExpectedExportsError(expectedExports, actualExports) {
  return new Error(
    [
      'Expected `package.json.exports` to exactly equal:',
      JSON.stringify(expectedExports, null, 2),
      'Received:',
      JSON.stringify(actualExports, null, 2),
    ].join('\n')
  );
}

function createMissingTarballPathsError(missingPaths) {
  return new Error(
    [
      'Missing exported paths in the tarball:',
      ...missingPaths.map((path) => `- ${path}`),
    ].join('\n')
  );
}

export async function runPackageSurfaceCheck({
  expectedExports,
  ignoredConditionNames = ['@pvorona/source'],
  packageRoot,
}) {
  try {
    const packageJsonPath = join(packageRoot, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

    if (!isPlainObject(packageJson.exports)) {
      throw new TypeError('Expected `package.json.exports` to be an object.');
    }

    if (
      expectedExports !== undefined &&
      !isDeepStrictEqual(packageJson.exports, expectedExports)
    ) {
      throw createExpectedExportsError(expectedExports, packageJson.exports);
    }

    const exportedPaths = [
      ...new Set(
        collectExportTargets(
          expectedExports ?? packageJson.exports,
          new Set(ignoredConditionNames)
        )
      ),
    ].sort();

    const tarballPaths = await collectTarballPaths(packageRoot);
    const missingPaths = exportedPaths.filter(
      (path) => !tarballPaths.has(path)
    );
    if (missingPaths.length > 0) {
      throw createMissingTarballPathsError(missingPaths);
    }

    await assertLegacySyntaxCompatibility(packageRoot, exportedPaths);

    process.stdout.write('Package surface check passed.\n');
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

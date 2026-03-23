import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

function normalizePackagePath(path) {
  return path.startsWith('./') ? path.slice(2) : path;
}

function collectExportTargets(exportsValue) {
  if (typeof exportsValue === 'string') {
    return [normalizePackagePath(exportsValue)];
  }

  if (Array.isArray(exportsValue)) {
    return exportsValue.flatMap(collectExportTargets);
  }

  if (exportsValue && typeof exportsValue === 'object') {
    return Object.values(exportsValue).flatMap(collectExportTargets);
  }

  return [];
}

async function main() {
  const packageJsonPath = join(packageRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const exportedPaths = [...new Set(collectExportTargets(packageJson.exports))].sort();

  const { stdout } = await execFileAsync(
    'npm',
    ['pack', '--dry-run', '--json'],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        npm_config_cache: join(tmpdir(), 'pvorona-npm-cache', String(process.pid)),
      },
    },
  );

  const [packResult] = JSON.parse(stdout);
  if (!packResult || !Array.isArray(packResult.files)) {
    throw new TypeError('Expected `npm pack --dry-run --json` to return file metadata.');
  }

  const tarballPaths = new Set(packResult.files.map((file) => file.path));
  const missingPaths = exportedPaths.filter((path) => !tarballPaths.has(path));

  if (missingPaths.length > 0) {
    process.stderr.write(
      ['Missing exported paths in the tarball:', ...missingPaths.map((path) => `- ${path}`)]
        .join('\n')
        .concat('\n'),
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Package surface check passed.\n');
}

await main();

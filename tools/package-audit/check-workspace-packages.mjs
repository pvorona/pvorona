import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '../..');
const packagesRoot = path.join(workspaceRoot, 'packages');

function asObject(value) {
  return value != null && typeof value === 'object' ? value : null;
}

function normalizeDeps(deps) {
  const obj = asObject(deps);
  if (!obj) return {};
  return obj;
}

function isInternalPackageName(name) {
  return typeof name === 'string' && name.startsWith('@pvorona/');
}

function isRangeSpec(spec) {
  return (
    typeof spec === 'string' && (spec.startsWith('^') || spec.startsWith('~'))
  );
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err && typeof err === 'object' && err.code === 'ENOENT') return null;
    throw err;
  }
}

function push(violations, msg) {
  violations.push(msg);
}

async function main() {
  const violations = [];

  const entries = await fs.readdir(packagesRoot, { withFileTypes: true });
  const packageDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  for (const dir of packageDirs) {
    const pkgJsonPath = path.join(packagesRoot, dir, 'package.json');
    const pkg = await readJson(pkgJsonPath);

    if (!isInternalPackageName(pkg.name)) {
      push(
        violations,
        `${dir}: package.json name is not an internal @pvorona/* package: ${String(
          pkg.name
        )}`
      );
    }

    // Required metadata for publishable scoped packages
    if (pkg.license !== 'MIT') {
      push(violations, `${dir}: missing or non-MIT license (expected "MIT")`);
    }

    const publishConfig = asObject(pkg.publishConfig);
    if (!publishConfig || publishConfig.access !== 'public') {
      push(
        violations,
        `${dir}: missing publishConfig.access="public" (scoped packages default to private on npm)`
      );
    }

    // Internal deps should be ranges (avoid exact pins like "0.0.2")
    const deps = normalizeDeps(pkg.dependencies);
    const peerDeps = normalizeDeps(pkg.peerDependencies);
    const allRuntimeDeps = { ...deps, ...peerDeps };

    for (const [depName, depSpec] of Object.entries(allRuntimeDeps)) {
      if (!isInternalPackageName(depName)) continue;
      if (isRangeSpec(depSpec)) continue;
      push(
        violations,
        `${dir}: dependency ${depName} uses a non-range spec (${JSON.stringify(
          depSpec
        )}); prefer ~ or ^`
      );
    }

    // Vite library builds should externalize dependencies to avoid bundling them
    const viteConfigCandidates = [
      'vite.config.mts',
      'vite.config.ts',
      'vite.config.mjs',
      'vite.config.js',
    ];
    let viteConfigText = null;
    for (const candidate of viteConfigCandidates) {
      const p = path.join(packagesRoot, dir, candidate);
      const txt = await readTextIfExists(p);
      if (txt == null) continue;
      viteConfigText = txt;
      break;
    }

    if (viteConfigText != null) {
      const looksLikeLibraryBuild =
        viteConfigText.includes('build:') &&
        viteConfigText.includes('lib:') &&
        viteConfigText.includes('rollupOptions:');

      if (looksLikeLibraryBuild) {
        const depNames = Object.keys(allRuntimeDeps);
        for (const depName of depNames) {
          if (!viteConfigText.includes(depName)) {
            push(
              violations,
              `${dir}: vite rollup externals missing dependency ${depName} (risk: bundling)`
            );
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('Workspace package audit FAILED:\n');
    for (const v of violations) console.error(`- ${v}`);
    console.error(`\nFound ${violations.length} issue(s).`);
    process.exitCode = 1;
    return;
  }

  console.log('Workspace package audit OK');
}

await main();

// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findMissingModuleImports } from './check-build-module-imports.mjs';

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.length = 0;
});

describe('findMissingModuleImports', () => {
  it('finds unresolved static and dynamic imports without matching comments or strings', async () => {
    const distDirectory = createDist();
    writeModule(
      distDirectory,
      'maplibre-gl-worker-test.js',
      `
        import './present.js';
        import './missing-static.js';
        import('./missing-dynamic.js');
        const example = "import './not-an-import.js'";
        // import './also-not-an-import.js';
      `,
    );
    writeModule(distDirectory, 'present.js', 'export {};');

    await expect(findMissingModuleImports(distDirectory)).resolves.toEqual([
      'assets/maplibre-gl-worker-test.js -> ./missing-static.js',
      'assets/maplibre-gl-worker-test.js -> ./missing-dynamic.js',
    ]);
  });

  it('rejects imports that resolve outside the deployed dist directory', async () => {
    const distDirectory = createDist();
    writeModule(
      distDirectory,
      'maplibre-gl-worker-test.js',
      `import '../../outside.js';`,
    );
    writeFileSync(join(distDirectory, '..', 'outside.js'), 'export {};');

    await expect(findMissingModuleImports(distDirectory)).resolves.toEqual([
      'assets/maplibre-gl-worker-test.js -> ../../outside.js',
    ]);
  });
});

function createDist() {
  const parentDirectory = mkdtempSync(join(tmpdir(), 'module-imports-'));
  temporaryDirectories.push(parentDirectory);
  const distDirectory = join(parentDirectory, 'dist');
  mkdirSync(join(distDirectory, 'assets'), { recursive: true });
  return distDirectory;
}

function writeModule(distDirectory, name, source) {
  writeFileSync(join(distDirectory, 'assets', name), source);
}

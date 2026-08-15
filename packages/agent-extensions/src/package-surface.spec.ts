import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

interface PackageManifest {
  exports: Record<
    string,
    { types?: string; import?: string; require?: string }
  >;
  files: string[];
}

describe('package surface', () => {
  it('publishes one core entry point with ESM, CJS, and declarations', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as PackageManifest;

    expect(Object.keys(manifest.exports)).toEqual(['.']);
    expect(manifest.exports['.']).toEqual({
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    });
    expect(manifest.files).toEqual(['dist']);
  });
});

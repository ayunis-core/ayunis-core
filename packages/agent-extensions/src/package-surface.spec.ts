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
  it('publishes separate core and optional MCP entry points', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as PackageManifest;

    expect(Object.keys(manifest.exports)).toEqual(['.', './mcp']);
    expect(manifest.exports['.']).toEqual({
      types: './dist/index.d.ts',
      import: './dist/index.js',
      require: './dist/index.cjs',
    });
    expect(manifest.exports['./mcp']).toEqual({
      types: './dist/mcp/index.d.ts',
      import: './dist/mcp/index.js',
      require: './dist/mcp/index.cjs',
    });
    expect(manifest.files).toEqual(['dist']);
  });

  it('keeps MCP implementation exports out of the core entry point', async () => {
    const core = await import('./index');

    expect(
      Object.keys(core).sort((left, right) => left.localeCompare(right)),
    ).toEqual(['configureRuntimeExtension', 'initializeExtensionSet']);
  });
});

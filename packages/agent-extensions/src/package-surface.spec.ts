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
  it('publishes separate core, MCP, skills, and filesystem entry points', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as PackageManifest;

    expect(Object.keys(manifest.exports)).toEqual([
      '.',
      './mcp',
      './skills',
      './skills/filesystem',
    ]);
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
    expect(manifest.exports['./skills']).toEqual({
      types: './dist/skills/index.d.ts',
      import: './dist/skills/index.js',
      require: './dist/skills/index.cjs',
    });
    expect(manifest.exports['./skills/filesystem']).toEqual({
      types: './dist/skills/filesystem/index.d.ts',
      import: './dist/skills/filesystem/index.js',
      require: './dist/skills/filesystem/index.cjs',
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

import { createRequire } from 'node:module';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as sourceSurface from './index';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const expectedExports = [
  'AgentConfigurationError',
  'AgentHarnessError',
  'AgentVariantError',
  'ModelResolutionError',
];

describe('package surface', () => {
  it('exports only agent contracts and errors at this checkpoint', () => {
    expect(sortedKeys(sourceSurface)).toEqual(expectedExports);
    expect(sourceSurface).not.toHaveProperty('defineAgentProfile');
    expect(sourceSurface).not.toHaveProperty('createAgentHarness');
    expect(sourceSurface).not.toHaveProperty('AgentStateStore');
    expect(sourceSurface).not.toHaveProperty('agents');
  });

  it('loads the built output as ESM and CJS', async () => {
    const esm = await import(new URL('../dist/index.js', import.meta.url).href);
    const require = createRequire(import.meta.url);
    const cjs = require('../dist/index.cjs') as Record<string, unknown>;

    expect(sortedKeys(esm)).toEqual(expectedExports);
    expect(sortedKeys(cjs)).toEqual(expectedExports);
  });

  it('emits declarations and exposes only the root subpath', async () => {
    await access(new URL('../dist/index.d.ts', import.meta.url));
    const packageJson = JSON.parse(
      await readFile(`${packageRoot}/package.json`, 'utf8'),
    ) as { exports: Record<string, unknown> };

    expect(Object.keys(packageJson.exports)).toEqual(['.']);
  });
});

const sortedKeys = (value: object): string[] =>
  Object.keys(value).sort((left, right) => left.localeCompare(right));

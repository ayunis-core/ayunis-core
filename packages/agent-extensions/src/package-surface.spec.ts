import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as knowledgeBasesSource from './knowledge-bases';
import * as rootSource from './index';
import * as mcpSource from './mcp';
import * as filesystemSource from './skills/filesystem';
import * as skillsSource from './skills';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const rootExports = [
  'defineExtension',
  'DuplicateExtensionError',
  'ExtensionError',
  'InvalidExtensionNameError',
  'MissingExtensionError',
];
const subpaths = {
  'knowledge-bases': ['KnowledgeBases'],
  mcp: ['createStdioTransport', 'createStreamableHttpTransport', 'Mcp'],
  skills: ['Skills'],
  'skills/filesystem': ['FilesystemSkillSource'],
} as const;

describe('package surface', () => {
  it('keeps the root limited to extension definitions and errors', () => {
    expect(sortedKeys(rootSource)).toEqual(rootExports);
    expect(rootSource).not.toHaveProperty('configureRuntimeExtension');
    expect(rootSource).not.toHaveProperty('initializeExtensionSet');
    expect(rootSource).not.toHaveProperty('createExtensionSession');
  });

  it('exposes exact built-in source subpaths', () => {
    expect(sortedKeys(knowledgeBasesSource)).toEqual(
      sortedKeysFrom(subpaths['knowledge-bases']),
    );
    expect(sortedKeys(mcpSource)).toEqual(sortedKeysFrom(subpaths.mcp));
    expect(sortedKeys(skillsSource)).toEqual(sortedKeysFrom(subpaths.skills));
    expect(sortedKeys(filesystemSource)).toEqual(
      sortedKeysFrom(subpaths['skills/filesystem']),
    );
  });

  it('loads every entry as ESM and CJS and emits declarations', async () => {
    const require = createRequire(import.meta.url);
    await assertBuiltEntry('', rootExports, require);
    for (const [subpath, expected] of Object.entries(subpaths)) {
      await assertBuiltEntry(subpath, expected, require);
    }
  });

  it('publishes only the intended root and optional subpaths', async () => {
    const packageJson = JSON.parse(
      await readFile(`${packageRoot}/package.json`, 'utf8'),
    ) as { exports: Record<string, unknown>; files: string[] };

    expect(Object.keys(packageJson.exports)).toEqual([
      '.',
      './knowledge-bases',
      './mcp',
      './skills',
      './skills/filesystem',
    ]);
    expect(packageJson.files).toEqual(['dist']);
  });

  it('does not pull MCP, YAML, or filesystem adapters into root consumers', async () => {
    const rootBundle = await readFile(`${packageRoot}/dist/index.js`, 'utf8');

    expect(rootBundle).not.toContain('@modelcontextprotocol');
    expect(rootBundle).not.toContain('yaml');
    expect(rootBundle).not.toContain('node:fs');
    expect(rootBundle).not.toContain('FilesystemSkillSource');
  });
});

const assertBuiltEntry = async (
  subpath: string,
  expected: readonly string[],
  require: NodeJS.Require,
): Promise<void> => {
  const prefix = subpath ? `${subpath}/` : '';
  const esm = await import(
    new URL(`../dist/${prefix}index.js`, import.meta.url).href
  );
  const cjs = require(`../dist/${prefix}index.cjs`) as Record<string, unknown>;
  await readFile(`${packageRoot}/dist/${prefix}index.d.ts`, 'utf8');
  expect(sortedKeys(esm)).toEqual(sortedKeysFrom(expected));
  expect(sortedKeys(cjs)).toEqual(sortedKeysFrom(expected));
};

const sortedKeys = (value: object): string[] =>
  Object.keys(value).sort((left, right) => left.localeCompare(right));

const sortedKeysFrom = (values: readonly string[]): string[] =>
  [...values].sort((left, right) => left.localeCompare(right));

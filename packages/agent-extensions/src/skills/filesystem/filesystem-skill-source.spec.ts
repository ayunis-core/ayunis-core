import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Tool } from '@ayunis/agent-runtime';
import { afterEach, describe, expect, it } from 'vitest';

import { FilesystemSkillSource } from './filesystem-skill-source';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe('FilesystemSkillSource', () => {
  it('returns an empty catalog for a missing root', async () => {
    const source = new FilesystemSkillSource({
      root: join(await temporaryDirectory(), 'missing'),
    });

    await expect(source.list()).resolves.toEqual([]);
  });

  it('discovers only immediate child directories with valid SKILL.md files', async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, 'access-review');
    await mkdir(join(root, 'empty'));
    await writeSkill(join(root, 'container'), 'nested');
    await writeFile(join(root, 'SKILL.md'), 'not a child');
    const source = new FilesystemSkillSource({ root });

    await expect(source.list()).resolves.toEqual([
      {
        name: 'access-review',
        description: 'Use the access-review workflow',
      },
    ]);
  });

  it('never interpolates model input into a path', async () => {
    const parent = await temporaryDirectory();
    const root = join(parent, 'skills');
    await mkdir(root);
    const outside = await writeSkill(parent, 'outside');
    const source = new FilesystemSkillSource({ root });
    await source.list();

    await expect(source.load('../outside')).rejects.toThrow(
      'Unknown scanned skill: ../outside',
    );
    await expect(readFile(outside, 'utf8')).resolves.toContain(
      'Follow the outside instructions.',
    );
  });

  it('rejects symlinks escaping the root and duplicate canonical paths', async () => {
    const parent = await temporaryDirectory();
    const root = join(parent, 'skills');
    const outside = join(parent, 'outside');
    await mkdir(root);
    await writeSkill(outside, 'escaped');
    await symlink(join(outside, 'escaped'), join(root, 'escaped'));

    await expect(new FilesystemSkillSource({ root }).list()).rejects.toThrow(
      /outside the configured root/i,
    );

    await rm(join(root, 'escaped'));
    await writeSkill(root, 'canonical');
    await symlink(join(root, 'canonical'), join(root, 'alias'));
    await expect(new FilesystemSkillSource({ root }).list()).rejects.toThrow(
      /duplicate canonical skill path/i,
    );
  });

  it.each([
    ['Uppercase', /must match the Agent Skills name format/i],
    ['double--hyphen', /must match the Agent Skills name format/i],
    ['different-name', /must match its parent directory/i],
  ] as const)(
    'rejects invalid or mismatched skill name %s',
    async (name, expected) => {
      const root = await temporaryDirectory();
      const path = await writeSkill(root, 'access-review', { name });
      const source = new FilesystemSkillSource({ root });

      await expect(source.list()).rejects.toThrow(
        new RegExp(
          `Invalid skill at ${await realpath(path)}:.*${expected.source}`,
        ),
      );
    },
  );

  it('rejects a canonical-name change after discovery', async () => {
    const root = await temporaryDirectory();
    const path = await writeSkill(root, 'access-review');
    const source = new FilesystemSkillSource({ root });
    await source.list();
    await writeFile(
      path,
      '---\nname: changed-name\ndescription: Changed\n---\nChanged.',
    );

    await expect(source.load('access-review')).rejects.toThrow(
      /canonical name changed after discovery/i,
    );
  });

  it('retries discovery after a failed scan instead of caching rejection', async () => {
    const root = await temporaryDirectory();
    const path = await writeSkill(root, 'access-review', { name: 'Invalid' });
    const source = new FilesystemSkillSource({ root });

    await expect(source.list()).rejects.toThrow(/name format/i);
    await writeFile(
      path,
      '---\nname: access-review\ndescription: Valid\n---\nRecovered.',
    );

    await expect(source.list()).resolves.toEqual([
      { name: 'access-review', description: 'Valid' },
    ]);
  });

  it('caches discovery metadata and rereads only the selected definition', async () => {
    const root = await temporaryDirectory();
    const path = await writeSkill(root, 'access-review', {
      instructions: 'Original instructions.',
    });
    const source = new FilesystemSkillSource({ root });
    const firstList = await source.list();
    await writeSkill(root, 'new-skill');
    await writeFile(
      path,
      '---\nname: access-review\ndescription: Updated\n---\nUpdated instructions.',
    );

    const secondList = await source.list();
    const loaded = await source.load('access-review');

    expect(secondList).toBe(firstList);
    expect(secondList).toHaveLength(1);
    await expect(source.load('new-skill')).rejects.toThrow(
      'Unknown scanned skill: new-skill',
    );
    expect(loaded).toMatchObject({
      name: 'access-review',
      description: 'Updated',
      instructions: 'Updated instructions.',
    });
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(loaded).not.toHaveProperty('setup');
  });

  it('attributes malformed YAML errors to the canonical skill path', async () => {
    const root = await temporaryDirectory();
    const path = await writeSkill(root, 'access-review');
    await writeFile(
      path,
      '---\nname: access-review\ndescription: [invalid\n---\nInstructions',
    );
    const source = new FilesystemSkillSource({ root });

    await expect(source.list()).rejects.toThrow(
      `Invalid skill at ${await realpath(path)}:`,
    );
  });

  it('honors an already-aborted load signal', async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, 'access-review');
    const source = new FilesystemSkillSource({ root });
    await source.list();
    const controller = new AbortController();
    controller.abort();

    await expect(
      source.load('access-review', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('preserves an abort raised while reading a selected skill', async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, 'access-review');
    const source = new FilesystemSkillSource({ root });
    await source.list();
    const controller = new AbortController();

    const loading = source.load('access-review', {
      signal: controller.signal,
    });
    controller.abort();

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('resolves allowed tools only through the supplied host catalog', async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, 'access-review', {
      allowedTools: 'list_access notify_owner',
    });
    const listAccess = tool('list_access');
    const notifyOwner = tool('notify_owner');
    const source = new FilesystemSkillSource({
      root,
      toolCatalog: { list_access: listAccess, notify_owner: notifyOwner },
    });

    await source.list();
    await expect(source.load('access-review')).resolves.toMatchObject({
      tools: [listAccess, notifyOwner],
    });
  });

  it.each([
    ['unknown', 'list_access missing', /unknown allowed tool.*missing/i],
    ['duplicate', ['list_access', 'list_access'], /duplicate allowed tool/i],
  ])('rejects %s allowed tools', async (_name, allowedTools, expected) => {
    const root = await temporaryDirectory();
    await writeSkill(root, 'access-review', { allowedTools });
    const source = new FilesystemSkillSource({
      root,
      toolCatalog: { list_access: tool('list_access') },
    });

    await expect(source.list()).rejects.toThrow(expected);
  });
});

const temporaryDirectory = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'agent-skills-'));
  roots.push(root);
  return root;
};

const writeSkill = async (
  root: string,
  directory: string,
  options: {
    name?: string;
    description?: string;
    instructions?: string;
    allowedTools?: string | readonly string[];
    newline?: '\n' | '\r\n';
  } = {},
): Promise<string> => {
  const newline = options.newline ?? '\n';
  const skillDirectory = join(root, directory);
  await mkdir(skillDirectory, { recursive: true });
  const allowedTools =
    options.allowedTools === undefined
      ? ''
      : `${newline}allowed-tools: ${formatYaml(options.allowedTools)}`;
  const defaultDescription = `Use the ${directory} workflow`;
  const description = options.description ?? defaultDescription;
  const markdown = [
    '---',
    `name: ${options.name ?? directory}`,
    `description: ${description}${allowedTools}`,
    '---',
    options.instructions ?? `Follow the ${directory} instructions.`,
    '',
  ].join(newline);
  const path = join(skillDirectory, 'SKILL.md');
  await writeFile(path, markdown);
  return path;
};

const formatYaml = (value: string | readonly string[]): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

const tool = (name: string): Tool => ({
  name,
  description: `${name} description`,
  parameters: { type: 'object', properties: {} },
  execute: () => `${name} result`,
});

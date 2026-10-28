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

async function temporaryDirectory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'agent-skills-'));
  roots.push(root);
  return root;
}

async function writeSkill(
  root: string,
  directory: string,
  options: {
    name?: string;
    description?: string;
    instructions?: string;
    allowedTools?: string | readonly string[];
    newline?: '\n' | '\r\n';
  } = {},
): Promise<string> {
  const newline = options.newline ?? '\n';
  const skillDirectory = join(root, directory);
  await mkdir(skillDirectory, { recursive: true });
  const allowedTools =
    options.allowedTools === undefined
      ? ''
      : `${newline}allowed-tools: ${formatYamlValue(options.allowedTools)}`;
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
}

function formatYamlValue(value: string | readonly string[]): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function tool(name: string): Tool {
  return {
    name,
    description: `${name} description`,
    parameters: { type: 'object', properties: {} },
    execute: () => `${name} result`,
  };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe('FilesystemSkillSource', () => {
  it('returns an empty list when the configured directory is missing', async () => {
    const root = join(await temporaryDirectory(), 'missing');
    const source = new FilesystemSkillSource({ root });

    await expect(source.list()).resolves.toEqual([]);
  });

  it('discovers only immediate child directories containing SKILL.md', async () => {
    const root = await temporaryDirectory();
    await writeSkill(root, 'access-review');
    await mkdir(join(root, 'empty-directory'));
    await writeSkill(join(root, 'container'), 'nested-skill');
    await writeFile(join(root, 'SKILL.md'), 'not a child skill');
    const source = new FilesystemSkillSource({ root });

    await expect(source.list()).resolves.toEqual([
      {
        name: 'access-review',
        description: 'Use the access-review workflow',
      },
    ]);
  });

  it.each(['\n', '\r\n'] as const)(
    'parses standard frontmatter and Markdown instructions with %j input',
    async (newline) => {
      const root = await temporaryDirectory();
      await writeSkill(root, 'incident-response', {
        description: 'Coordinate incident response',
        instructions: '# Response\n\nPage the incident lead.',
        newline,
      });
      const source = new FilesystemSkillSource({ root });

      await source.list();
      await expect(source.load('incident-response')).resolves.toMatchObject({
        name: 'incident-response',
        description: 'Coordinate incident response',
        instructions: '# Response\n\nPage the incident lead.',
      });
    },
  );

  it.each([
    ['Uppercase', 'must match the Agent Skills name format'],
    ['double--hyphen', 'must match the Agent Skills name format'],
    ['different-name', 'must match its parent directory'],
  ])('rejects invalid or mismatched skill name %s', async (name, message) => {
    const root = await temporaryDirectory();
    const path = await writeSkill(root, 'access-review', { name });
    const source = new FilesystemSkillSource({ root });

    await expect(source.list()).rejects.toThrow(
      `Invalid skill at ${await realpath(path)}: Skill name ${message}`,
    );
  });

  it('resolves allowed tool names only through the supplied catalog', async () => {
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
    const definition = await source.load('access-review');

    expect(definition.tools).toEqual([listAccess, notifyOwner]);
  });

  it.each([
    ['unknown tool names', 'list_access missing_tool', 'Unknown allowed tool'],
    [
      'duplicate tool names',
      ['list_access', 'list_access'],
      'Duplicate allowed tool',
    ],
  ])('rejects %s', async (_, allowedTools, message) => {
    const root = await temporaryDirectory();
    await writeSkill(root, 'access-review', { allowedTools });
    const source = new FilesystemSkillSource({
      root,
      toolCatalog: { list_access: tool('list_access') },
    });

    await expect(source.list()).rejects.toThrow(message);
  });

  it('never interpolates a requested skill name into a filesystem path', async () => {
    const parent = await temporaryDirectory();
    const root = join(parent, 'skills');
    await mkdir(root);
    const outsidePath = await writeSkill(parent, 'outside');
    const source = new FilesystemSkillSource({ root });
    await source.list();

    await expect(source.load('../outside')).rejects.toThrow(
      'Unknown scanned skill: ../outside',
    );
    await expect(readFile(outsidePath, 'utf8')).resolves.toContain(
      'Follow the outside instructions.',
    );
  });

  it('rejects skill symlinks that escape the configured root', async () => {
    const parent = await temporaryDirectory();
    const root = join(parent, 'skills');
    const outside = join(parent, 'outside');
    await mkdir(root);
    await writeSkill(outside, 'escaped');
    await symlink(join(outside, 'escaped'), join(root, 'escaped'));
    const source = new FilesystemSkillSource({ root });

    await expect(source.list()).rejects.toThrow(
      'resolves outside the configured root',
    );
  });

  it('attributes malformed YAML errors to the skill path', async () => {
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

  it('rejects a definition whose canonical name changes after discovery', async () => {
    const root = await temporaryDirectory();
    const path = await writeSkill(root, 'access-review');
    const source = new FilesystemSkillSource({ root });
    await source.list();
    await writeFile(
      path,
      '---\nname: incident-response\ndescription: Changed\n---\nChanged.',
    );

    await expect(source.load('access-review')).rejects.toThrow(
      'canonical name changed after discovery',
    );
  });

  it('caches discovery while re-reading the selected definition on activation', async () => {
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
  });
});

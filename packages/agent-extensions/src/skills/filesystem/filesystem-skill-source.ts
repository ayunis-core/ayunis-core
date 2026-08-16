import { readFile, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';

import type { Tool } from '@ayunis/agent-runtime';

import {
  defineSkill,
  type SkillDefinition,
  type SkillSummary,
} from '../skill-definition';
import type { SkillSource } from '../skill-source';
import { parseSkillMarkdown } from './skill-markdown';

export interface FilesystemSkillSourceConfig {
  readonly root: string;
  readonly toolCatalog?: Readonly<Record<string, Tool>>;
}

interface Discovery {
  readonly canonicalRoot?: string;
  readonly summaries: readonly SkillSummary[];
  readonly paths: ReadonlyMap<string, string>;
}

export class FilesystemSkillSource implements SkillSource {
  private readonly root: string;
  private readonly toolCatalog: ReadonlyMap<string, Tool>;
  private discovery?: Promise<Discovery>;

  constructor(config: FilesystemSkillSourceConfig) {
    this.root = config.root;
    this.toolCatalog = new Map(Object.entries(config.toolCatalog ?? {}));
  }

  async list(): Promise<readonly SkillSummary[]> {
    return (await this.getDiscovery()).summaries;
  }

  async load(name: string): Promise<SkillDefinition> {
    const discovery = await this.getDiscovery();
    const path = discovery.paths.get(name);
    if (!path || !discovery.canonicalRoot) {
      throw new Error(`Unknown scanned skill: ${name}`);
    }
    const currentPath = await realpath(path);
    assertContained(discovery.canonicalRoot, currentPath);
    return this.readDefinition(currentPath, name, true);
  }

  private async getDiscovery(): Promise<Discovery> {
    this.discovery ??= this.scan();
    try {
      return await this.discovery;
    } catch (error) {
      this.discovery = undefined;
      throw error;
    }
  }

  private async scan(): Promise<Discovery> {
    const canonicalRoot = await resolveRoot(this.root);
    if (!canonicalRoot) return { summaries: [], paths: new Map() };
    const entries = (await readdir(canonicalRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .sort((left, right) => left.name.localeCompare(right.name));
    return this.scanEntries(
      canonicalRoot,
      entries.map(({ name }) => name),
    );
  }

  private async scanEntries(
    canonicalRoot: string,
    directoryNames: readonly string[],
  ): Promise<Discovery> {
    const candidates = await resolveCandidates(canonicalRoot, directoryNames);
    const summaries: SkillSummary[] = [];
    const paths = new Map<string, string>();
    for (const { directoryName, path } of candidates) {
      const definition = await this.readDefinition(path, directoryName, false);
      if (paths.has(definition.name)) {
        throw new Error(`Duplicate canonical skill name: ${definition.name}`);
      }
      paths.set(definition.name, path);
      summaries.push({
        name: definition.name,
        description: definition.description,
      });
    }
    return { canonicalRoot, summaries, paths };
  }

  private async readDefinition(
    path: string,
    expectedName: string,
    isReload: boolean,
  ): Promise<SkillDefinition> {
    try {
      const parsed = parseSkillMarkdown(
        await readFile(path, 'utf8'),
        expectedName,
      );
      const tools = this.resolveTools(parsed.allowedToolNames);
      return defineSkill({
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        ...(tools.length > 0 ? { tools } : {}),
      });
    } catch (error) {
      throw new Error(
        `Invalid skill at ${path}: ${reloadErrorMessage(error, isReload)}`,
        { cause: error },
      );
    }
  }

  private resolveTools(names: readonly string[]): Tool[] {
    return names.map((name) => {
      const resolved = this.toolCatalog.get(name);
      if (!resolved) throw new Error(`Unknown allowed tool: ${name}`);
      if (resolved.name !== name) {
        throw new Error(
          `Tool catalog entry '${name}' resolves to '${resolved.name}'.`,
        );
      }
      return resolved;
    });
  }
}

interface SkillCandidate {
  readonly directoryName: string;
  readonly path: string;
}

const resolveCandidates = async (
  root: string,
  directoryNames: readonly string[],
): Promise<SkillCandidate[]> => {
  const candidates: SkillCandidate[] = [];
  const canonicalPaths = new Set<string>();
  for (const directoryName of directoryNames) {
    const path = await resolveSkillPath(root, directoryName);
    if (!path) continue;
    assertContained(root, path);
    if (canonicalPaths.has(path)) {
      throw new Error(`Duplicate canonical skill path: ${path}`);
    }
    canonicalPaths.add(path);
    candidates.push({ directoryName, path });
  }
  return candidates;
};

const resolveRoot = async (root: string): Promise<string | undefined> => {
  try {
    return await realpath(root);
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) return undefined;
    throw error;
  }
};

const resolveSkillPath = async (
  root: string,
  directoryName: string,
): Promise<string | undefined> => {
  try {
    return await realpath(join(root, directoryName, 'SKILL.md'));
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT') || hasErrorCode(error, 'ENOTDIR')) {
      return undefined;
    }
    throw error;
  }
};

const assertContained = (root: string, path: string): void => {
  const pathFromRoot = relative(root, path);
  if (
    isAbsolute(pathFromRoot) ||
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`)
  ) {
    throw new Error(`Skill path ${path} resolves outside the configured root.`);
  }
};

const reloadErrorMessage = (error: unknown, isReload: boolean): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (isReload && message === 'Skill name must match its parent directory.') {
    return 'Skill canonical name changed after discovery.';
  }
  return message;
};

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === code;

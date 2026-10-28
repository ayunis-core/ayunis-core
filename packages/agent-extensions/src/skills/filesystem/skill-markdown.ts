import { parseDocument } from 'yaml';

export interface ParsedSkillMarkdown {
  readonly name: string;
  readonly description: string;
  readonly instructions: string;
  readonly allowedToolNames: readonly string[];
}

export const parseSkillMarkdown = (
  markdown: string,
  expectedName: string,
): ParsedSkillMarkdown => {
  const { frontmatter, instructions } = splitMarkdown(markdown);
  const metadata = parseFrontmatter(frontmatter);
  const name = requiredString(metadata, 'name');
  const description = requiredString(metadata, 'description');
  validateName(name, expectedName);
  if (description.length > 1024) {
    throw new Error('Skill description must be at most 1024 characters');
  }
  const normalizedInstructions = instructions.trim();
  if (!normalizedInstructions) {
    throw new Error('Skill instructions must not be empty');
  }

  return {
    name,
    description,
    instructions: normalizedInstructions,
    allowedToolNames: parseAllowedTools(metadata['allowed-tools']),
  };
};

const splitMarkdown = (
  markdown: string,
): { frontmatter: string; instructions: string } => {
  const normalized = markdown.replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(normalized);
  if (!match) {
    throw new Error('SKILL.md requires YAML frontmatter');
  }
  return { frontmatter: match[1], instructions: match[2] };
};

const parseFrontmatter = (frontmatter: string): Record<string, unknown> => {
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw document.errors[0];
  }
  const value: unknown = document.toJS();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Skill frontmatter must be a YAML mapping');
  }
  return value as Record<string, unknown>;
};

const requiredString = (
  metadata: Readonly<Record<string, unknown>>,
  field: string,
): string => {
  const value = metadata[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Skill ${field} must be a non-empty string`);
  }
  return value;
};

const validateName = (name: string, expectedName: string): void => {
  const validName = /^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/.test(name);
  if (!validName) {
    throw new Error('Skill name must match the Agent Skills name format');
  }
  if (name !== expectedName) {
    throw new Error('Skill name must match its parent directory');
  }
};

const parseAllowedTools = (value: unknown): string[] => {
  if (value === undefined) {
    return [];
  }
  const names =
    typeof value === 'string'
      ? value.split(/\s+/).filter(Boolean)
      : parseAllowedToolArray(value);
  const uniqueNames = new Set(names);
  if (uniqueNames.size !== names.length) {
    throw new Error('Duplicate allowed tool name');
  }
  return names;
};

const parseAllowedToolArray = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) {
    throw new Error('allowed-tools must be a string or an array of strings');
  }
  return value as string[];
};

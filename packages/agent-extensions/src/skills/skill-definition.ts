import type { Tool } from '@ayunis/agent-runtime';

import type { ExtensionContext } from '../extensions/context';

export interface SkillSummary {
  readonly name: string;
  readonly description: string;
}

export interface SkillDefinitionSpec extends SkillSummary {
  readonly instructions: string;
  readonly tools?: readonly Tool[];
  activate?(context: ExtensionContext): void | Promise<void>;
}

export type SkillDefinition = SkillDefinitionSpec;

export const defineSkill = (spec: SkillDefinitionSpec): SkillDefinition => {
  validateSkill(spec);
  const definition = Object.freeze({
    name: spec.name,
    description: spec.description,
    instructions: spec.instructions,
    ...(spec.tools ? { tools: Object.freeze([...spec.tools]) } : {}),
    ...(spec.activate
      ? { activate: (context: ExtensionContext) => spec.activate?.(context) }
      : {}),
  });
  return definition;
};

const validateSkill = (spec: SkillDefinitionSpec): void => {
  if (!/^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/.test(spec.name)) {
    throw new Error('Skill name must match the Agent Skills name format.');
  }
  if (!spec.description || spec.description.length > 1024) {
    throw new Error(
      'Skill description must contain between 1 and 1024 characters.',
    );
  }
  if (!spec.instructions.trim()) {
    throw new Error('Skill instructions must not be empty.');
  }
  validateTools(spec.tools ?? []);
};

const validateTools = (tools: readonly Tool[]): void => {
  const names = new Set<string>();
  for (const tool of tools) {
    if (!tool.name) throw new Error('Skill tools require a non-empty name.');
    if (names.has(tool.name)) {
      throw new Error(`Duplicate skill tool name '${tool.name}'.`);
    }
    names.add(tool.name);
  }
};

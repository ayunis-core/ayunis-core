import { validateToolParams } from 'src/common/validators/tool-params.validator';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const createSkillToolParameters = {
  type: 'object' as const,
  properties: {
    name: {
      type: 'string' as const,
      description: 'The name of the skill',
    },
    short_description: {
      type: 'string' as const,
      description: 'A short description of what the skill does',
    },
    instructions: {
      type: 'string' as const,
      description:
        'The detailed instructions for the AI when this skill is active',
    },
    is_active: {
      type: 'boolean' as const,
      description: 'Whether the skill should be active immediately',
      default: true,
    },
  },
  required: ['name', 'short_description', 'instructions', 'is_active'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CreateSkillToolParameters = FromSchema<typeof createSkillToolParameters>;

export class CreateSkillTool extends Tool {
  constructor() {
    super({
      name: ToolType.CREATE_SKILL,
      description:
        'Display a skill creation widget. Use this when the user asks you to create a skill for them or accepts your offer to turn a task into a skill. Propose a name, short description, and detailed instructions based on what the user described. The user reviews and confirms the creation.',
      parameters: createSkillToolParameters,
      type: ToolType.CREATE_SKILL,
    });
  }

  validateParams(params: Record<string, unknown>): CreateSkillToolParameters {
    return validateToolParams<CreateSkillToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}

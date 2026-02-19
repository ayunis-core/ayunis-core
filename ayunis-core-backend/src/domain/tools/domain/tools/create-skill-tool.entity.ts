import { createAjv } from 'src/common/validators/ajv.factory';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

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

export class CreateSkillTool extends DisplayableTool {
  constructor() {
    super({
      name: ToolType.CREATE_SKILL,
      description:
        'Display a skill creation widget. Use this when the user asks you to create a skill for them. Propose a name, short description, and detailed instructions based on what the user described. The user reviews and confirms the creation.',
      parameters: createSkillToolParameters,
      type: ToolType.CREATE_SKILL,
    });
  }

  validateParams(params: Record<string, unknown>): CreateSkillToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }

    return params as CreateSkillToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}

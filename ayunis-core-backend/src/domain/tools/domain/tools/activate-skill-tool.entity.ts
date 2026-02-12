import { JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import { createAjv } from 'src/common/validators/ajv.factory';
import { Tool } from '../tool.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';

function activateSkillToolParameters(skills: Skill[]): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      skill_name: {
        type: 'string' as const,
        description: 'The name of the skill to activate',
        enum: skills.map((s) => s.name),
      },
    } as const,
    required: ['skill_name'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

interface ActivateSkillToolParameters {
  skill_name: string;
}

export class ActivateSkillTool extends Tool {
  constructor(skills: Skill[]) {
    super({
      name: ToolType.ACTIVATE_SKILL,
      description:
        'Activate a skill to get detailed instructions and attach its knowledge bases and integrations to the conversation.',
      parameters: activateSkillToolParameters(skills),
      type: ToolType.ACTIVATE_SKILL,
    });
  }

  validateParams(params: Record<string, unknown>): ActivateSkillToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as unknown as ActivateSkillToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}

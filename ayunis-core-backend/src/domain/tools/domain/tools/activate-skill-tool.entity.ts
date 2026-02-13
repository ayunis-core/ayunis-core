import { JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import { createAjv } from 'src/common/validators/ajv.factory';
import { Tool } from '../tool.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';

function buildParameters(skills: Skill[]): JSONSchema {
  const skillNameProperty: Record<string, unknown> = {
    type: 'string' as const,
    description: 'The name of the skill to activate',
  };

  if (skills.length > 0) {
    skillNameProperty.enum = skills.map((s) => s.name);
  }

  return {
    type: 'object' as const,
    properties: {
      skill_name: skillNameProperty,
    },
    required: ['skill_name'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

interface ActivateSkillToolParameters {
  skill_name: string;
}

export class ActivateSkillTool extends Tool {
  constructor(skills: Skill[] = []) {
    super({
      name: ToolType.ACTIVATE_SKILL,
      description:
        'Activate a skill to inject its knowledge and capabilities into the conversation.',
      descriptionLong:
        "Activate skills when you need specialized knowledge or capabilities that are available as skills. This will inject the skill's instructions and make its knowledge bases and integrations available for use.",
      parameters: buildParameters(skills),
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

import type { JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import { createAjv } from 'src/common/validators/ajv.factory';
import { Tool } from '../tool.entity';

function buildParameters(slugs: string[]): JSONSchema {
  const skillNameProperty: Record<string, unknown> = {
    type: 'string' as const,
    description: 'The slug identifier of the skill to activate',
  };

  if (slugs.length > 0) {
    skillNameProperty.enum = slugs;
  }

  return {
    type: 'object' as const,
    properties: {
      skill_slug: skillNameProperty,
    },
    required: ['skill_slug'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

interface ActivateSkillToolParameters {
  skill_slug: string;
}

export class ActivateSkillTool extends Tool {
  private readonly slugToName: Map<string, string>;

  constructor(slugToName: Map<string, string> = new Map()) {
    super({
      name: ToolType.ACTIVATE_SKILL,
      description:
        'Activate a skill to inject its knowledge and capabilities into the conversation.',
      descriptionLong:
        "Activate skills when you need specialized knowledge or capabilities that are available as skills. This will inject the skill's instructions and make its knowledge bases and integrations available for use.",
      parameters: buildParameters([...slugToName.keys()]),
      type: ToolType.ACTIVATE_SKILL,
    });
    this.slugToName = slugToName;
  }

  resolveOriginalName(slug: string): string | undefined {
    return this.slugToName.get(slug);
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

import type { JSONSchema } from 'json-schema-to-ts';
import { createAjv } from 'src/common/validators/ajv.factory';
import { DisplayableTool } from '../displayable-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

// eslint-disable-next-line sonarjs/function-return-type -- same pattern as ActivateSkillTool.buildParameters
function buildParameters(slugs: string[]): JSONSchema {
  const skillSlugProperty: Record<string, unknown> = {
    type: 'string' as const,
    description: 'The slug identifier of the skill to edit',
  };

  if (slugs.length > 0) {
    skillSlugProperty.enum = slugs;
  }

  return {
    type: 'object' as const,
    properties: {
      skill_slug: skillSlugProperty,
      name: {
        type: 'string' as const,
        description:
          'The updated name of the skill. Pass an empty string if unchanged.',
      },
      short_description: {
        type: 'string' as const,
        description:
          'The updated short description (a.k.a. "trigger" in the UI) of what the skill does. Pass an empty string if unchanged.',
      },
      instructions: {
        type: 'string' as const,
        description:
          'The updated detailed instructions for the AI when this skill is active. Pass an empty string if unchanged.',
      },
      change_summary: {
        type: 'string' as const,
        description:
          'A brief summary of what was changed and why, shown to the user for review',
      },
    },
    required: [
      'skill_slug',
      'name',
      'short_description',
      'instructions',
      'change_summary',
    ],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

interface EditSkillToolParameters {
  skill_slug: string;
  name: string;
  short_description: string;
  instructions: string;
  change_summary: string;
}

export class EditSkillTool extends DisplayableTool {
  constructor(slugs: string[] = []) {
    super({
      name: ToolType.EDIT_SKILL,
      description:
        'Display a skill edit widget. Use this when the user asks you to edit or modify an existing skill, or when the user complains about a skill not being used, being used too often, or being misused — proactively suggest editing the skill\'s trigger or instructions. Provide the skill_slug and the updated fields. For fields that are not changing, pass an empty string. Include a brief change_summary describing what was modified. The user reviews and confirms the update.',
      parameters: buildParameters(slugs),
      type: ToolType.EDIT_SKILL,
    });
  }

  validateParams(params: Record<string, unknown>): EditSkillToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }

    return params as unknown as EditSkillToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}

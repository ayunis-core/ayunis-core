import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

function buildParameters(skillIdsBySlug: Map<string, string>): JSONSchema {
  const slugs = [...skillIdsBySlug.keys()];
  const skillIds = [...skillIdsBySlug.values()];
  const skillSlugProperty: Record<string, unknown> = {
    type: 'string' as const,
    description: 'The slug identifier of the skill to edit',
  };

  if (slugs.length > 0) {
    skillSlugProperty.enum = slugs;
  }

  const skillIdProperty: Record<string, unknown> = {
    type: 'string' as const,
    description: `The immutable ID matching skill_slug. Available pairs: ${[
      ...skillIdsBySlug,
    ]
      .map(([slug, id]) => `${slug}=${id}`)
      .join(', ')}`,
  };
  if (skillIds.length > 0) skillIdProperty.enum = skillIds;

  return {
    type: 'object' as const,
    properties: {
      skill_slug: skillSlugProperty,
      skill_id: skillIdProperty,
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
      'skill_id',
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
  skill_id: string;
  name: string;
  short_description: string;
  instructions: string;
  change_summary: string;
}

export class EditSkillTool extends Tool {
  constructor(private readonly skillIdsBySlug = new Map<string, string>()) {
    super({
      name: ToolType.EDIT_SKILL,
      description:
        "Display a skill edit widget. Use this when the user asks you to edit or modify an existing skill, or when the user complains about a skill not being used, being used too often, or being misused — proactively suggest editing the skill's trigger or instructions. Provide the skill_slug, its matching skill_id, and the updated fields. For fields that are not changing, pass an empty string. Include a brief change_summary describing what was modified. The user reviews and confirms the update.",
      parameters: buildParameters(skillIdsBySlug),
      type: ToolType.EDIT_SKILL,
    });
  }

  validateParams(params: Record<string, unknown>): EditSkillToolParameters {
    const validated = validateToolParams<EditSkillToolParameters>(
      this.parameters,
      params,
    );
    if (this.skillIdsBySlug.get(validated.skill_slug) !== validated.skill_id) {
      throw new Error('skill_id does not match skill_slug');
    }
    return validated;
  }

  get returnsPii(): boolean {
    return false;
  }
}

import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const installMarketplaceSkillToolParameters = {
  type: 'object' as const,
  properties: {
    identifier: {
      type: 'string' as const,
      minLength: 1,
      description:
        'The marketplace identifier of the skill, exactly as returned by marketplace_search.',
    },
    name: {
      type: 'string' as const,
      minLength: 1,
      description: 'The display name of the skill.',
    },
    reason: {
      type: 'string' as const,
      description:
        'One plain sentence on why this skill fits what the user asked for.',
    },
  },
  required: ['identifier', 'name'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type InstallMarketplaceSkillToolParameters = FromSchema<
  typeof installMarketplaceSkillToolParameters
>;

export class InstallMarketplaceSkillTool extends Tool {
  constructor() {
    super({
      name: ToolType.INSTALL_MARKETPLACE_SKILL,
      description:
        'Display an install card for one marketplace skill. Use it only after the user explicitly asked to install a specific skill that marketplace_search returned. The user confirms in the card; nothing is installed until they do. Never use it for integrations, which an administrator sets up.',
      parameters: installMarketplaceSkillToolParameters,
      type: ToolType.INSTALL_MARKETPLACE_SKILL,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): InstallMarketplaceSkillToolParameters {
    return validateToolParams<InstallMarketplaceSkillToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}

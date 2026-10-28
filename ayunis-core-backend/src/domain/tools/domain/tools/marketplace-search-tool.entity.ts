import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const marketplaceSearchToolParameters = {
  type: 'object' as const,
  properties: {
    type: {
      type: 'string' as const,
      enum: ['skill', 'integration', 'all'] as const,
      description:
        'Restrict the catalogue to skills, to integrations, or return both (default).',
    },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

type MarketplaceSearchToolParameters = FromSchema<
  typeof marketplaceSearchToolParameters
>;

export class MarketplaceSearchTool extends Tool {
  constructor() {
    super({
      name: ToolType.MARKETPLACE_SEARCH,
      description:
        'List the published skills and integrations available in the Ayunis Marketplace, with a short description, category, type and links for each entry. Use it to recommend catalogue entries for a role or problem, or to explain what an entry does.',
      descriptionLong: [
        'Use when the user asks which skill or integration fits their role or problem, what a marketplace entry does, or what is available in the marketplace. Match entries to the request yourself from the returned list; the marketplace has no free-text search.',
        'Recommend only entries from the result. Never invent entries. For every recommended entry state whether it is a skill or an integration, give a one-line reason, and render its installUrl as a markdown link labelled "Installieren" (or the equivalent in the user\'s language). Point to marketplaceUrl when the user wants to browse. The product is called "Marketplace" in every language; do not translate the name.',
        'Compare the returned skills with the skills already installed for the user (listed in your instructions): if a recommended skill is already installed, say so and offer to activate it instead of showing its install link.',
        'A skill can be installed by the user from the installUrl. An integration is set up by an administrator because it needs configuration such as credentials; say so instead of offering to install it.',
        'Recommending never installs anything. If the tool fails because the marketplace cannot be reached, tell the user plainly that the marketplace is not reachable right now.',
      ].join(' '),
      parameters: marketplaceSearchToolParameters,
      type: ToolType.MARKETPLACE_SEARCH,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): MarketplaceSearchToolParameters {
    return validateToolParams<MarketplaceSearchToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}

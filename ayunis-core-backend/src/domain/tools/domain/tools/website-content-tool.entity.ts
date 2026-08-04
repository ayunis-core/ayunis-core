import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import { Tool } from '../tool.entity';
import { validateToolParams } from 'src/common/validators/tool-params.validator';

const websiteContentToolParameters = {
  type: 'object' as const,
  properties: {
    url: { type: 'string' as const },
  },
  additionalProperties: false,
  required: ['url'],
} as const satisfies JSONSchema;

type WebsiteContentToolParameters = FromSchema<
  typeof websiteContentToolParameters
>;

export class WebsiteContentTool extends Tool {
  constructor() {
    super({
      name: ToolType.WEBSITE_CONTENT,
      description: 'Fetch content from a specific URL.',
      parameters: websiteContentToolParameters,
      type: ToolType.WEBSITE_CONTENT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): WebsiteContentToolParameters {
    return validateToolParams<WebsiteContentToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return false;
  }
}

import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { validateToolParams } from 'src/common/validators/tool-params.validator';

const websiteContentToolParameters = {
  type: 'object' as const,
  properties: {
    url: { type: 'string' as const },
    section: {
      type: 'string' as const,
      enum: ['content', 'links'] as const,
      description:
        'Page website content or discovered links. Defaults to content.',
      default: 'content',
    },
    startLine: {
      type: 'integer' as const,
      description:
        'Starting line number in the selected section (1-indexed). Defaults to 1.',
      minimum: 1,
      default: 1,
    },
    numLines: {
      type: 'integer' as const,
      description: 'Number of lines to return. Defaults to 200. Maximum 200.',
      minimum: 1,
      maximum: 200,
      default: 200,
    },
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
      descriptionLong:
        'Fetch a bounded page of website content. Use nextPage.startLine from a truncated result to continue. ' +
        "Set section to 'links' to page through links discovered on the website.",
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

import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import { Tool } from '../tool.entity';
import { createAjv } from 'src/common/validators/ajv.factory';

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

  validateParams(params: Record<string, any>): WebsiteContentToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as WebsiteContentToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}

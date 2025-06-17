import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ContextualTool } from '../contextual-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import { Thread } from '../../../threads/domain/thread.entity';
import Ajv from 'ajv';

const websiteContentToolParameters = {
  type: 'object' as const,
  properties: {
    url: { type: 'string' as const },
  },
} as const satisfies JSONSchema;

type WebsiteContentToolParameters = FromSchema<
  typeof websiteContentToolParameters
>;

export class WebsiteContentTool extends ContextualTool {
  constructor() {
    super({
      name: ToolType.WEBSITE_CONTENT,
      description: 'Get the content of a website',
      parameters: websiteContentToolParameters,
      type: ToolType.WEBSITE_CONTENT,
    });
  }

  isAvailable(ctx: unknown): boolean {
    if (ctx instanceof Thread) {
      return true; // TODO: Check if the thread has website content enabled
    }
    return false;
  }

  validateParams(params: Record<string, any>): WebsiteContentToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as WebsiteContentToolParameters;
  }
}

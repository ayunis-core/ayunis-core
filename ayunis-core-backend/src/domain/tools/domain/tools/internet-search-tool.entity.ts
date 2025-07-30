import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ContextualTool } from '../contextual-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';
import Ajv from 'ajv';
import { Thread } from '../../../threads/domain/thread.entity';

const internetSearchToolParameters = {
  type: 'object' as const,
  properties: {
    query: { type: 'string' as const },
  },
  required: ['query'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type InternetSearchToolParameters = FromSchema<
  typeof internetSearchToolParameters
>;

export class InternetSearchTool extends ContextualTool {
  constructor() {
    super({
      name: ToolType.INTERNET_SEARCH,
      description:
        'Search the internet for up to date information. Do not assume the current date if the user asks for "latest" information.',
      parameters: internetSearchToolParameters,
      type: ToolType.INTERNET_SEARCH,
    });
  }

  isAvailable(ctx: unknown): boolean {
    if (ctx instanceof Thread) {
      return false;
    }
    return false;
  }

  validateParams(params: Record<string, any>): InternetSearchToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as InternetSearchToolParameters;
  }
}

import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import Ajv from 'ajv';
import { Tool } from '../tool.entity';

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

export class InternetSearchTool extends Tool {
  constructor() {
    super({
      name: ToolType.INTERNET_SEARCH,
      description:
        'Search the internet for up to date information. Do not assume the current date if the user asks for "latest" information.',
      parameters: internetSearchToolParameters,
      type: ToolType.INTERNET_SEARCH,
    });
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

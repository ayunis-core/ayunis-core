import { JSONSchema, FromSchema } from 'json-schema-to-ts';
import { ContextualTool } from '../contextual-tool.entity';
import { Thread } from '../../../threads/domain/thread.entity';
import Ajv from 'ajv';
import { ToolType } from '../value-objects/tool-type.enum';

const sourceQueryToolParameters = {
  type: 'object' as const,
  properties: {
    sourceId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description: 'The source to query',
    },
    query: {
      type: 'string' as const,
      description: 'The query to execute',
    },
  } as const,
  required: ['sourceId', 'query'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type SourceQueryToolParameters = FromSchema<typeof sourceQueryToolParameters>;

export class SourceQueryTool extends ContextualTool {
  constructor() {
    super({
      name: ToolType.SOURCE_QUERY,
      description: 'Query a source',
      parameters: sourceQueryToolParameters,
      type: ToolType.SOURCE_QUERY,
    });
  }

  isAvailable(ctx: unknown): boolean {
    if (ctx instanceof Thread) {
      return (ctx.sources && ctx.sources.length > 0) || false;
    }
    return false;
  }

  validateParams(params: Record<string, any>): SourceQueryToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as SourceQueryToolParameters;
  }
}

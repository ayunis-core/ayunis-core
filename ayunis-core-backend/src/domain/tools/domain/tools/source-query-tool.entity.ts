import { JSONSchema } from 'json-schema-to-ts';
import Ajv from 'ajv';
import { ToolType } from '../value-objects/tool-type.enum';
import { Source } from 'src/domain/sources/domain/source.entity';
import { Tool } from '../tool.entity';

function sourceQueryToolParameters(sources: Source[]): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      sourceId: {
        type: 'string' as const,
        description: 'The ID of the source to query',
        enum: sources.map((source) => source.id),
      },
      query: {
        type: 'string' as const,
        description: 'The query to execute',
      },
    } as const,
    required: ['sourceId', 'query'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

export class SourceQueryTool extends Tool {
  constructor(sources: Source[]) {
    super({
      name: ToolType.SOURCE_QUERY,
      description:
        'Query a source through semantic search. Use the ID to select the source. Here are the available sources: \n' +
        sources
          .map((source) => `- ID: ${source.id}, Name: ${source.name}`)
          .join('\n'),
      parameters: sourceQueryToolParameters(sources),
      type: ToolType.SOURCE_QUERY,
    });
  }

  validateParams(params: Record<string, any>): boolean {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return true;
  }

  get returnsPii(): boolean {
    return true;
  }
}

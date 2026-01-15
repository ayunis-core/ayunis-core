import { JSONSchema } from 'json-schema-to-ts';
import Ajv from 'ajv';
import { ToolType } from '../value-objects/tool-type.enum';
import { Source } from 'src/domain/sources/domain/source.entity';
import { Tool } from '../tool.entity';

interface SourceQueryToolParameters {
  sourceId: string;
  query: string;
}

function sourceQueryToolParameters(sources: Source[]): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      sourceId: {
        type: 'string' as const,
        description: 'The ID of the file to search',
        enum: sources.map((source) => source.id),
      },
      query: {
        type: 'string' as const,
        description: 'The semantic search query to find relevant content',
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
        'Query a file through semantic search. Use the file ID to select which file to search.',
      descriptionLong: `Query files BEFORE answering questions about attached documents. If files don't contain the answer, say so rather than guessing from general knowledge. Results may include startLine and endLine metadata for each matched snippet. Use these line numbers with source_get_text to retrieve additional context around relevant sections if necessary.`,
      parameters: sourceQueryToolParameters(sources),
      type: ToolType.SOURCE_QUERY,
    });
  }

  validateParams(params: Record<string, any>): SourceQueryToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as unknown as SourceQueryToolParameters;
  }

  get returnsPii(): boolean {
    return true;
  }
}

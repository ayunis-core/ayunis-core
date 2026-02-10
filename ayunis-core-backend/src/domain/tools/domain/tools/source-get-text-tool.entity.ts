import { JSONSchema } from 'json-schema-to-ts';
import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import { Source } from 'src/domain/sources/domain/source.entity';
import { Tool } from '../tool.entity';

interface SourceGetTextToolParameters {
  sourceId: string;
  startLine?: number;
  endLine?: number;
}

function sourceGetTextToolParameters(sources: Source[]): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      sourceId: {
        type: 'string' as const,
        description: 'The ID of the file to read',
        enum: sources.map((source) => source.id),
      },
      startLine: {
        type: 'integer' as const,
        description: 'Starting line number (1-indexed). Defaults to 1.',
        minimum: 1,
        default: 1,
      },
      endLine: {
        type: 'integer' as const,
        description:
          'Ending line number (inclusive). Use -1 to read until end of file. Defaults to -1.',
        default: -1,
      },
    } as const,
    required: ['sourceId'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

export class SourceGetTextTool extends Tool {
  constructor(sources: Source[]) {
    super({
      name: ToolType.SOURCE_GET_TEXT,
      description:
        'Read exact text content from a file by line range. Use this to read specific sections of a file.',
      descriptionLong: `Read exact text content from a file by line range. Recommended workflow: First use source_query to find relevant snippets - results include startLine and endLine metadata. Then use source_get_text with those line numbers to retrieve additional context around the matched sections. Start with smaller ranges (50-100 lines) to avoid hitting size limits. The response includes total line count to help navigate large files.`,
      parameters: sourceGetTextToolParameters(sources),
      type: ToolType.SOURCE_GET_TEXT,
    });
  }

  validateParams(params: Record<string, unknown>): SourceGetTextToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as unknown as SourceGetTextToolParameters;
  }

  get returnsPii(): boolean {
    return true;
  }
}

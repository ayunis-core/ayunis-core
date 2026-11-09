import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';

interface SourceGetTextToolParameters {
  sourceId: string;
  startLine?: number;
  startCharacter?: number;
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
      startCharacter: {
        type: 'integer',
        minimum: 0,
        default: 0,
        description:
          'Character position within startLine. Use the returned nextPage to continue a long line.',
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
      descriptionLong: `Read exact text content from a file by line range. Recommended workflow: First use source_query to find relevant snippets - results include startLine and endLine metadata. Then use source_get_text with those line numbers to retrieve additional context around the matched sections. Read up to 500 lines per call. Follow nextPage exactly to continue, including startCharacter when a long line spans responses. Line numbers remain the original document line numbers. The response includes total line count to help navigate large files.`,
      parameters: sourceGetTextToolParameters(sources),
      type: ToolType.SOURCE_GET_TEXT,
    });
  }

  validateParams(params: Record<string, unknown>): SourceGetTextToolParameters {
    return validateToolParams<SourceGetTextToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return true;
  }
}

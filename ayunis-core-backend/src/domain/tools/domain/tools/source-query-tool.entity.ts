import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const MAX_SOURCE_IDS = 20;
const MAX_QUERIES = 5;

interface SourceQueryToolParameters {
  sourceIds: string[];
  queries: string[];
}

function sourceQueryToolParameters(sources: Source[]): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      sourceIds: {
        type: 'array' as const,
        description: 'The IDs of all files to search',
        items: {
          type: 'string' as const,
          enum: sources.map((source) => source.id),
        },
        minItems: 1,
        maxItems: MAX_SOURCE_IDS,
      },
      queries: {
        type: 'array' as const,
        description:
          'One or more semantic search queries, e.g. alternative phrasings or sub-questions. Every query is searched in every selected file.',
        items: { type: 'string' as const, minLength: 1 },
        minItems: 1,
        maxItems: MAX_QUERIES,
      },
    } as const,
    required: ['sourceIds', 'queries'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

export class SourceQueryTool extends Tool {
  constructor(sources: Source[]) {
    super({
      name: ToolType.SOURCE_QUERY,
      description:
        'Query one or several files through semantic search. Pass all files to search as sourceIds and all phrasings or sub-questions as queries in a single call.',
      descriptionLong: `Query files BEFORE answering questions about attached documents. If files don't contain the answer, say so rather than guessing from general knowledge. Search all relevant files and phrasings in one call instead of calling the tool once per file or phrasing. Each result lists the queries that found it in matchedQueries. Results may include startLine and endLine metadata for each matched snippet. Use these line numbers with source_get_text to retrieve additional context around relevant sections if necessary.`,
      parameters: sourceQueryToolParameters(sources),
      type: ToolType.SOURCE_QUERY,
    });
  }

  validateParams(params: Record<string, unknown>): SourceQueryToolParameters {
    return validateToolParams<SourceQueryToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return true;
  }
}

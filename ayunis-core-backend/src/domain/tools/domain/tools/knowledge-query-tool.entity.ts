import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { Tool } from 'src/domain/tools/domain/tool.entity';

const MAX_KNOWLEDGE_BASE_IDS = 20;
const MAX_QUERIES = 5;

interface KnowledgeQueryToolParameters {
  knowledgeBaseIds: string[];
  queries: string[];
}

function knowledgeQueryToolParameters(
  knowledgeBases: KnowledgeBaseSummary[],
): JSONSchema {
  const knowledgeBaseIds: string[] = knowledgeBases.map((kb) => kb.id);
  const schema: JSONSchema = {
    type: 'object',
    properties: {
      knowledgeBaseIds: {
        type: 'array',
        description: 'The IDs of all knowledge bases to search',
        items: { type: 'string', enum: knowledgeBaseIds },
        minItems: 1,
        maxItems: MAX_KNOWLEDGE_BASE_IDS,
      },
      queries: {
        type: 'array',
        description:
          'One or more semantic search queries, e.g. alternative phrasings or sub-questions. Every query is searched in every selected knowledge base.',
        items: { type: 'string', minLength: 1 },
        minItems: 1,
        maxItems: MAX_QUERIES,
      },
    },
    required: ['knowledgeBaseIds', 'queries'],
    additionalProperties: false,
  };
  return schema;
}

export class KnowledgeQueryTool extends Tool {
  constructor(knowledgeBases: KnowledgeBaseSummary[]) {
    super({
      name: ToolType.KNOWLEDGE_QUERY,
      description:
        'Search one or several knowledge bases through semantic search. Pass all knowledge bases to search as knowledgeBaseIds and all phrasings or sub-questions as queries in a single call.',
      descriptionLong: `Search knowledge bases BEFORE answering questions about attached knowledge bases. If knowledge bases don't contain the answer, say so rather than guessing from general knowledge. Search all relevant knowledge bases and phrasings in one call instead of calling the tool once per knowledge base or phrasing. Each result lists the queries that found it in matchedQueries. Results may include startLine and endLine metadata for each matched snippet. Use these line numbers with knowledge_get_text to retrieve additional context around relevant sections if necessary.`,
      parameters: knowledgeQueryToolParameters(knowledgeBases),
      type: ToolType.KNOWLEDGE_QUERY,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): KnowledgeQueryToolParameters {
    return validateToolParams<KnowledgeQueryToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return true;
  }
}

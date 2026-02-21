import type { JSONSchema } from 'json-schema-to-ts';
import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { Tool } from '../tool.entity';

interface KnowledgeQueryToolParameters {
  knowledgeBaseId: string;
  query: string;
}

function knowledgeQueryToolParameters(
  knowledgeBases: KnowledgeBaseSummary[],
): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      knowledgeBaseId: {
        type: 'string' as const,
        description: 'The ID of the knowledge base to search',
        enum: knowledgeBases.map((kb) => kb.id),
      },
      query: {
        type: 'string' as const,
        description: 'The semantic search query to find relevant content',
      },
    } as const,
    required: ['knowledgeBaseId', 'query'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

export class KnowledgeQueryTool extends Tool {
  constructor(knowledgeBases: KnowledgeBaseSummary[]) {
    super({
      name: ToolType.KNOWLEDGE_QUERY,
      description:
        'Search a knowledge base through semantic search. Use the knowledge base ID to select which one to search.',
      descriptionLong: `Search knowledge bases BEFORE answering questions about attached knowledge bases. If knowledge bases don't contain the answer, say so rather than guessing from general knowledge. Results may include startLine and endLine metadata for each matched snippet. Use these line numbers with knowledge_get_text to retrieve additional context around relevant sections if necessary.`,
      parameters: knowledgeQueryToolParameters(knowledgeBases),
      type: ToolType.KNOWLEDGE_QUERY,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): KnowledgeQueryToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as unknown as KnowledgeQueryToolParameters;
  }

  get returnsPii(): boolean {
    return true;
  }
}

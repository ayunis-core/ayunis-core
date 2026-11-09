import type { JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { Tool } from 'src/domain/tools/domain/tool.entity';

interface KnowledgeGetTextToolParameters {
  knowledgeBaseId: string;
  documentId: string;
  startLine?: number;
  startCharacter?: number;
  numLines?: number;
}

function knowledgeGetTextToolParameters(
  knowledgeBases: KnowledgeBaseSummary[],
): JSONSchema {
  return {
    type: 'object' as const,
    properties: {
      knowledgeBaseId: {
        type: 'string' as const,
        description: 'The ID of the knowledge base',
        enum: knowledgeBases.map((kb) => kb.id),
      },
      documentId: {
        type: 'string' as const,
        description: 'The ID of the document within the knowledge base',
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
      numLines: {
        type: 'integer' as const,
        description:
          'Number of lines to read from startLine. Defaults to 500. Maximum 500.',
        minimum: 1,
        maximum: 500,
        default: 500,
      },
    } as const,
    required: ['knowledgeBaseId', 'documentId'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
}

export class KnowledgeGetTextTool extends Tool {
  constructor(knowledgeBases: KnowledgeBaseSummary[]) {
    super({
      name: ToolType.KNOWLEDGE_GET_TEXT,
      description:
        'Read exact text content from a document in a knowledge base starting at a given line.',
      descriptionLong: `Read exact text content from a document in a knowledge base starting at a given line. Recommended workflow: First use knowledge_query to find relevant snippets — results include startLine, endLine, and documentId metadata. Then use knowledge_get_text with the startLine and numLines to retrieve additional context around the matched sections. Read up to 500 lines per call. Follow nextPage exactly, including startCharacter, to read the full document without skipping long lines. The response includes total line count to help navigate large files.`,
      parameters: knowledgeGetTextToolParameters(knowledgeBases),
      type: ToolType.KNOWLEDGE_GET_TEXT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): KnowledgeGetTextToolParameters {
    return validateToolParams<KnowledgeGetTextToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return true;
  }
}

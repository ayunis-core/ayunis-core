import type { JSONSchema } from 'json-schema-to-ts';
import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import { Tool } from '../tool.entity';

interface KnowledgeGetTextToolParameters {
  knowledgeBaseId: string;
  documentId: string;
  startLine?: number;
  numLines?: number;
}

// eslint-disable-next-line sonarjs/function-return-type -- returns a single JSON schema object literal
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
      startLine: {
        type: 'integer' as const,
        description: 'Starting line number (1-indexed). Defaults to 1.',
        minimum: 1,
        default: 1,
      },
      numLines: {
        type: 'integer' as const,
        description:
          'Number of lines to read from startLine. Defaults to 100. Maximum 100.',
        minimum: 1,
        maximum: 100,
        default: 100,
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
      descriptionLong: `Read exact text content from a document in a knowledge base starting at a given line. Recommended workflow: First use knowledge_query to find relevant snippets — results include startLine, endLine, and documentId metadata. Then use knowledge_get_text with the startLine and numLines to retrieve additional context around the matched sections. You can read up to 100 lines at a time. The response includes total line count to help navigate large files.`,
      parameters: knowledgeGetTextToolParameters(knowledgeBases),
      type: ToolType.KNOWLEDGE_GET_TEXT,
    });
  }

  validateParams(
    params: Record<string, unknown>,
  ): KnowledgeGetTextToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as unknown as KnowledgeGetTextToolParameters;
  }

  get returnsPii(): boolean {
    return true;
  }
}

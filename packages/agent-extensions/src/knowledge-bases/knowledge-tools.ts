import type {
  Tool,
  ToolExecutionContext,
  ToolExecutionOutput,
} from '@ayunis/agent-runtime';

export interface KnowledgeQueryInput {
  readonly knowledgeBaseId: string;
  readonly query: string;
}

export interface KnowledgeGetTextInput {
  readonly knowledgeBaseId: string;
  readonly documentId: string;
  readonly startLine: number;
  readonly numLines: number;
}

export type KnowledgeQueryPort = (
  input: KnowledgeQueryInput,
  context: ToolExecutionContext,
) => ToolExecutionOutput | Promise<ToolExecutionOutput>;

export type KnowledgeGetTextPort = (
  input: KnowledgeGetTextInput,
  context: ToolExecutionContext,
) => ToolExecutionOutput | Promise<ToolExecutionOutput>;

interface KnowledgeToolOptions {
  readonly knowledgeBaseIds: readonly string[];
  readonly query: KnowledgeQueryPort;
  readonly getText: KnowledgeGetTextPort;
}

export const createKnowledgeTools = (
  options: KnowledgeToolOptions,
): readonly Tool[] => [createQueryTool(options), createTextTool(options)];

const createQueryTool = (options: KnowledgeToolOptions): Tool => ({
  name: 'knowledge_query',
  description: 'Search one active knowledge base using semantic search.',
  parameters: {
    type: 'object',
    properties: {
      knowledgeBaseId: knowledgeBaseIdSchema(options.knowledgeBaseIds),
      query: {
        type: 'string',
        description: 'The semantic search query.',
      },
    },
    required: ['knowledgeBaseId', 'query'],
    additionalProperties: false,
  },
  validateInput: (input) => parseQueryInput(input, options.knowledgeBaseIds),
  execute: (input, context) =>
    options.query(parseQueryInput(input, options.knowledgeBaseIds), context),
});

const createTextTool = (options: KnowledgeToolOptions): Tool => ({
  name: 'knowledge_get_text',
  description: 'Read exact lines from a document in an active knowledge base.',
  parameters: {
    type: 'object',
    properties: {
      knowledgeBaseId: knowledgeBaseIdSchema(options.knowledgeBaseIds),
      documentId: { type: 'string', description: 'The document ID.' },
      startLine: { type: 'integer', minimum: 1, default: 1 },
      numLines: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
    },
    required: ['knowledgeBaseId', 'documentId'],
    additionalProperties: false,
  },
  validateInput: (input) => parseTextInput(input, options.knowledgeBaseIds),
  execute: (input, context) =>
    options.getText(parseTextInput(input, options.knowledgeBaseIds), context),
});

const knowledgeBaseIdSchema = (ids: readonly string[]) => ({
  type: 'string',
  description: 'The ID of an active knowledge base.',
  enum: [...ids],
});

const parseQueryInput = (
  input: Record<string, unknown>,
  activeIds: readonly string[],
): KnowledgeQueryInput => {
  assertExactKeys(input, ['knowledgeBaseId', 'query']);
  const knowledgeBaseId = activeKnowledgeBaseId(
    input.knowledgeBaseId,
    activeIds,
  );
  if (typeof input.query !== 'string' || input.query.length === 0) {
    throw new Error('knowledge_query requires a non-empty query.');
  }
  return { knowledgeBaseId, query: input.query };
};

const parseTextInput = (
  input: Record<string, unknown>,
  activeIds: readonly string[],
): KnowledgeGetTextInput => {
  assertExactKeys(input, [
    'knowledgeBaseId',
    'documentId',
    'startLine',
    'numLines',
  ]);
  const knowledgeBaseId = activeKnowledgeBaseId(
    input.knowledgeBaseId,
    activeIds,
  );
  if (typeof input.documentId !== 'string' || input.documentId.length === 0) {
    throw new Error('knowledge_get_text requires a non-empty documentId.');
  }
  assertOptionalInteger(input.startLine, 'startLine', 1);
  assertOptionalInteger(input.numLines, 'numLines', 1, 100);
  return {
    knowledgeBaseId,
    documentId: input.documentId,
    startLine: (input.startLine as number | undefined) ?? 1,
    numLines: (input.numLines as number | undefined) ?? 100,
  };
};

const activeKnowledgeBaseId = (
  value: unknown,
  activeIds: readonly string[],
): string => {
  if (typeof value !== 'string' || !activeIds.includes(value)) {
    throw new Error('A currently active knowledgeBaseId is required.');
  }
  return value;
};

const assertExactKeys = (
  input: Record<string, unknown>,
  allowed: readonly string[],
): void => {
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    throw new Error('Knowledge tool input contains an unsupported field.');
  }
};

const assertOptionalInteger = (
  value: unknown,
  name: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
): void => {
  if (
    value !== undefined &&
    (!Number.isInteger(value) ||
      (value as number) < minimum ||
      (value as number) > maximum)
  ) {
    throw new Error(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
};

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import { InferenceProviderFactory } from 'src/domain/models/application/ports/inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';

/**
 * Deterministic provider used for every model when mock inference is enabled
 * (NODE_ENV=test or MOCK_INFERENCE=true), serving direct inference and the
 * agent runtime alike without external calls, API keys, or cost.
 *
 * Default response: "{provider}::{model}". E2E triggers in the last user
 * message select scripted responses (chat naming, malformed tool calls,
 * paginated research, source citations, inline-document echo).
 *
 * The text is emitted as several delta chunks with a small delay between
 * them. An instant single-chunk response completes faster than any real
 * provider ever would and races client-side stream setup (observed as
 * e2e chat runs stuck "in flight"), so the pacing is part of the contract.
 *
 * @see InferenceProviderRegistry.resolve() - Routing logic
 */
@Injectable()
export class MockInferenceProviderFactory extends InferenceProviderFactory {
  resolveProvider(model: Model): ModelProvider {
    const defaultResponseText = `${model.provider}::${model.name}`;
    let malformedAttemptEmitted = false;
    let researchAnswerAttempted = false;
    return {
      name: defaultResponseText,
      stream: (request) => {
        const lastUserText = lastProviderUserText(request);
        const researchInput = parseResearchInput(lastUserText);
        if (researchInput) {
          const hasToolResults = request.messages.some(
            (message) => message.role === 'tool_result',
          );
          if (!hasToolResults) return researchToolCallResponse(researchInput);
          if (!researchAnswerAttempted) {
            researchAnswerAttempted = true;
            return providerThinkingOnlyResponse();
          }
          return providerTextResponse(
            `research-complete::${defaultResponseText}`,
          );
        }
        if (lastUserText === MALFORMED_TOOL_CALL_RETRY_PROMPT) {
          if (!malformedAttemptEmitted) {
            malformedAttemptEmitted = true;
            return malformedProviderToolCallResponse();
          }
          return providerTextResponse(`recovered::${defaultResponseText}`);
        }
        if (lastUserText === SOURCE_CITATION_E2E_PROMPT) {
          return sourceCitationResponse(request);
        }
        const echoedDocument = echoedInlineDocument(request);
        if (echoedDocument) {
          return providerTextResponse(echoedDocument);
        }
        return providerTextResponse(buildResponseText(lastUserText, model));
      },
    };
  }
}

const MOCK_CHUNK_DELAY_MS = 40;
const MOCK_USAGE = { inputTokens: 0, outputTokens: 0 } as const;
const MALFORMED_TOOL_CALL_RETRY_PROMPT =
  'E2E trigger malformed completed tool call';
const PAGINATED_RESEARCH_PROMPT = 'E2E trigger paginated research: ';
const SOURCE_CITATION_E2E_PROMPT = 'E2E cite first source';
const SOURCE_CITATION_TOOL_CALL_ID = 'mock-source-citation-call';
const ECHO_INLINE_DOCUMENT_PROMPT = 'E2E echo extracted inline document';

interface PaginatedResearchInput {
  documentIds: string[];
  urls: string[];
}

function lastProviderUserText(request: ProviderRequest): string {
  const lastUserMessage = request.messages.findLast(
    (message) => message.role === 'user',
  );
  const text = lastUserMessage?.content.find(
    (content) => content.type === 'text',
  );
  return text?.type === 'text' ? text.text : '';
}

/**
 * The inline-document E2E journey sends the extracted file as its own text
 * part next to the trigger, so every text part of the last user message is
 * inspected, not just the first.
 */
function echoedInlineDocument(request: ProviderRequest): string | undefined {
  const texts =
    request.messages
      .findLast((message) => message.role === 'user')
      ?.content.flatMap((content) =>
        content.type === 'text' ? [content.text] : [],
      ) ?? [];
  if (!texts.some((text) => text.includes(ECHO_INLINE_DOCUMENT_PROMPT))) {
    return undefined;
  }
  return texts.find((text) => text.startsWith('[Document:'));
}

function buildResponseText(userText: string, model: Model): string {
  const modelName = `${model.provider}::${model.name}`;
  const requestedName = /Name this chat (\S+)/i.exec(userText)?.[1];
  return requestedName
    ? `I'll name this chat ${requestedName}. You're talking to ${modelName}`
    : modelName;
}

function parseResearchInput(userText: string): PaginatedResearchInput | null {
  if (!userText.startsWith(PAGINATED_RESEARCH_PROMPT)) return null;
  try {
    const parsed: unknown = JSON.parse(
      userText.slice(PAGINATED_RESEARCH_PROMPT.length),
    );
    if (!isPaginatedResearchInput(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isPaginatedResearchInput(
  value: unknown,
): value is PaginatedResearchInput {
  if (typeof value !== 'object' || value === null) return false;
  const input = value as Record<string, unknown>;
  return (
    Array.isArray(input.documentIds) &&
    input.documentIds.every((id) => typeof id === 'string') &&
    Array.isArray(input.urls) &&
    input.urls.every((url) => typeof url === 'string')
  );
}

async function* providerThinkingOnlyResponse(): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
  yield { thinkingDelta: 'I have enough research to answer.' };
  await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
  yield { finishReason: 'stop', usage: MOCK_USAGE };
}

async function* providerTextResponse(
  responseText: string,
): AsyncIterable<ProviderChunk> {
  const deltas = splitIntoDeltas(responseText);
  for (const [index, textDelta] of deltas.entries()) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
    const isLast = index === deltas.length - 1;
    yield {
      textDelta,
      finishReason: isLast ? 'stop' : undefined,
      usage: isLast ? MOCK_USAGE : undefined,
    };
  }
}

function sourceCitationResponse(
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const citation = findSourceCitation(request);
  if (citation) {
    return providerTextResponse(
      `${citation.content} {{source:${citation.chunkId}|${citation.label}}}`,
    );
  }

  const sourceId = firstAvailableSourceId(request);
  if (sourceId) {
    return sourceCitationToolCallResponse('source_query', {
      sourceId,
      query: 'source citation evidence',
    });
  }
  const knowledgeBaseId = firstAvailableKnowledgeBaseId(request);
  if (knowledgeBaseId) {
    return sourceCitationToolCallResponse('knowledge_query', {
      knowledgeBaseId,
      query: 'source citation evidence',
    });
  }
  const skillSlug = firstAvailableSkillSlug(request);
  return skillSlug
    ? sourceCitationToolCallResponse('activate_skill', {
        skill_slug: skillSlug,
      })
    : providerTextResponse('No citable source is available.');
}

function findSourceCitation(
  request: ProviderRequest,
): { chunkId: string; content: string; label: string } | null {
  const toolResult = request.messages
    .findLast((message) => message.role === 'tool_result')
    ?.content.find(isCitationToolResult);
  if (toolResult?.type !== 'tool_result') return null;

  try {
    return sourceCitationFromResult(JSON.parse(toolResult.result) as unknown);
  } catch {
    return null;
  }
}

function sourceCitationFromResult(
  value: unknown,
): { chunkId: string; content: string; label: string } | null {
  if (!Array.isArray(value) || !isRecord(value[0])) return null;
  const result = value[0];
  if (
    result.citable !== true ||
    typeof result.chunkId !== 'string' ||
    typeof result.content !== 'string'
  ) {
    return null;
  }
  return {
    chunkId: result.chunkId,
    content: result.content,
    label: sourceCitationLabel(result.sourceName ?? result.documentName),
  };
}

function firstAvailableSourceId(request: ProviderRequest): string | null {
  const hasSourceQuery = request.tools.some(
    (tool) => tool.name === 'source_query',
  );
  if (!hasSourceQuery) return null;
  return /<file id="([0-9a-f-]{36})"/i.exec(request.instructions)?.[1] ?? null;
}

function isCitationToolResult(
  content: ProviderRequest['messages'][number]['content'][number],
): boolean {
  return (
    content.type === 'tool_result' &&
    ['source_query', 'knowledge_query'].includes(content.toolName)
  );
}

function firstAvailableKnowledgeBaseId(
  request: ProviderRequest,
): string | null {
  return firstToolEnumValue(request, 'knowledge_query', 'knowledgeBaseId');
}

function firstAvailableSkillSlug(request: ProviderRequest): string | null {
  return firstToolEnumValue(request, 'activate_skill', 'skill_slug');
}

function firstToolEnumValue(
  request: ProviderRequest,
  toolName: string,
  propertyName: string,
): string | null {
  const tool = request.tools.find((item) => item.name === toolName);
  if (!tool || !isRecord(tool.parameters.properties)) return null;
  const property = tool.parameters.properties[propertyName];
  if (!isRecord(property) || !Array.isArray(property.enum)) return null;
  const firstValue: unknown = property.enum[0];
  return typeof firstValue === 'string' ? firstValue : null;
}

function sourceCitationLabel(value: unknown): string {
  if (typeof value !== 'string') return 'Source';
  const plainLabel = value
    .replace(/[|{}\r\n]/g, ' ')
    .trim()
    .slice(0, 200);
  return plainLabel || 'Source';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function* sourceCitationToolCallResponse(
  toolName: 'source_query' | 'knowledge_query' | 'activate_skill',
  input: Record<string, string>,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: SOURCE_CITATION_TOOL_CALL_ID,
        name: toolName,
        argumentsDelta: JSON.stringify(input),
      },
    ],
    finishReason: 'tool_calls',
    usage: MOCK_USAGE,
  };
}

async function* malformedProviderToolCallResponse(): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: 'mock-malformed-call',
        name: 'create_document',
        argumentsDelta: '{"title":"Unvollständiger Bericht"',
      },
    ],
  };
  await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
  yield { finishReason: 'stop', usage: MOCK_USAGE };
}

async function* researchToolCallResponse(
  input: PaginatedResearchInput,
): AsyncIterable<ProviderChunk> {
  const documents = input.documentIds.map((artifactId, index) => ({
    index,
    id: `mock-research-document-${index}`,
    name: 'read_document',
    argumentsDelta: JSON.stringify({ artifact_id: artifactId }),
  }));
  const websites = input.urls.map((url, index) => ({
    index: documents.length + index,
    id: `mock-research-website-${index}`,
    name: 'website_content',
    argumentsDelta: JSON.stringify({ url }),
  }));
  await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
  yield { toolCallDeltas: [...documents, ...websites] };
  await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
  yield { finishReason: 'tool_calls', usage: MOCK_USAGE };
}

function splitIntoDeltas(text: string, parts = 3): string[] {
  const size = Math.ceil(text.length / parts);
  const deltas: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    deltas.push(text.slice(i, i + size));
  }
  return deltas;
}

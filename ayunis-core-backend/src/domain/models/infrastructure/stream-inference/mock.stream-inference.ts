import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from 'src/domain/models/application/ports/stream-inference.handler';
import {
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from 'src/domain/models/application/ports/stream-inference.handler';
import { Observable, from, of } from 'rxjs';
import { concatMap, delay } from 'rxjs/operators';
import { Injectable } from '@nestjs/common';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import type { Model } from 'src/domain/models/domain/model.entity';

/**
 * Mock streaming inference handler for testing environments.
 *
 * This handler is automatically used when NODE_ENV=test, replacing all real
 * LLM provider streaming handlers. It enables:
 * - Fast, deterministic test execution for streaming endpoints
 * - No external API calls or network dependencies
 * - No API keys required
 * - Zero cost test runs
 *
 * Response format: "{provider}::{model}" text (e.g., "openai::gpt-4o-mini")
 *
 * For chat naming requests (containing "Name this chat"), includes the
 * requested name in the response to simulate proper chat naming behavior.
 *
 * The text is emitted as several delta chunks with a small delay between
 * them. An instant single-chunk response completes faster than any real
 * provider ever would and races client-side stream setup (observed as
 * e2e chat runs stuck "in flight"), so the pacing is part of the contract.
 *
 * @see StreamInferenceHandlerRegistry.getHandler() - Routing logic
 * @see MockInferenceHandler - Non-streaming equivalent
 */
@Injectable()
export class MockStreamInferenceHandler extends StreamInferenceHandler {
  private readonly malformedRetryMessageIds = new Set<string>();

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    const lastUserMessage = input.messages
      .filter((m) => m.role === MessageRole.USER)
      .pop();
    const textContent = firstTextContent(lastUserMessage?.content);

    if (textContent === MALFORMED_TOOL_CALL_RETRY_PROMPT && lastUserMessage) {
      return this.malformedRetryResponse(lastUserMessage.id, input.model);
    }

    return textResponse(buildResponseText(textContent, input.model));
  }

  private malformedRetryResponse(
    messageId: string,
    model: Model,
  ): Observable<StreamInferenceResponseChunk> {
    if (!this.malformedRetryMessageIds.delete(messageId)) {
      this.malformedRetryMessageIds.add(messageId);
      return malformedToolCallResponse();
    }
    return textResponse(`recovered::${model.provider}::${model.name}`);
  }

  /**
   * Deterministic provider for the agent-runtime path with mock inference
   * enabled: emits `{provider}::{model}` as paced delta chunks, mirroring
   * `answer()` so runtime-backed specs stay fast, offline, and key-free.
   */
  resolveProvider(model: Model): ModelProvider {
    const defaultResponseText = `${model.provider}::${model.name}`;
    let malformedAttemptEmitted = false;
    return {
      name: defaultResponseText,
      stream: (request) => {
        const lastUserText = lastProviderUserText(request);
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
        return providerTextResponse(buildResponseText(lastUserText, model));
      },
    };
  }
}

const MOCK_CHUNK_DELAY_MS = 40;
const MALFORMED_TOOL_CALL_RETRY_PROMPT =
  'E2E trigger malformed completed tool call';
const SOURCE_CITATION_E2E_PROMPT = 'E2E cite first source';
const SOURCE_CITATION_TOOL_CALL_ID = 'mock-source-citation-call';

function firstTextContent(
  content: StreamInferenceInput['messages'][number]['content'] | undefined,
): string {
  const firstContent = content?.[0];
  return firstContent?.type === MessageContentType.TEXT
    ? (firstContent as TextMessageContent).text
    : '';
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

function buildResponseText(userText: string, model: Model): string {
  const modelName = `${model.provider}::${model.name}`;
  const requestedName = /Name this chat (\S+)/i.exec(userText)?.[1];
  return requestedName
    ? `I'll name this chat ${requestedName}. You're talking to ${modelName}`
    : modelName;
}

async function* providerTextResponse(
  responseText: string,
): AsyncIterable<ProviderChunk> {
  const deltas = splitIntoDeltas(responseText);
  for (const [index, textDelta] of deltas.entries()) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY_MS));
    yield {
      textDelta,
      finishReason: index === deltas.length - 1 ? 'stop' : undefined,
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
  yield { finishReason: 'stop' };
}

function textResponse(
  responseText: string,
): Observable<StreamInferenceResponseChunk> {
  return pacedChunks(
    splitIntoDeltas(responseText).map(
      (textContentDelta) =>
        new StreamInferenceResponseChunk({
          textContentDelta,
          toolCallsDelta: [],
          thinkingDelta: null,
        }),
    ),
  );
}

function malformedToolCallResponse(): Observable<StreamInferenceResponseChunk> {
  return pacedChunks([
    new StreamInferenceResponseChunk({
      textContentDelta: null,
      toolCallsDelta: [
        new StreamInferenceResponseChunkToolCall({
          index: 0,
          id: 'mock-malformed-call',
          name: 'create_document',
          argumentsDelta: '{"title":"Unvollständiger Bericht"',
        }),
      ],
      thinkingDelta: null,
    }),
    new StreamInferenceResponseChunk({
      textContentDelta: null,
      toolCallsDelta: [],
      thinkingDelta: null,
      finishReason: 'stop',
    }),
  ]);
}

function pacedChunks(
  chunks: StreamInferenceResponseChunk[],
): Observable<StreamInferenceResponseChunk> {
  return from(chunks).pipe(
    concatMap((chunk) => of(chunk).pipe(delay(MOCK_CHUNK_DELAY_MS))),
  );
}

function splitIntoDeltas(text: string, parts = 3): string[] {
  const size = Math.ceil(text.length / parts);
  const deltas: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    deltas.push(text.slice(i, i + size));
  }
  return deltas;
}

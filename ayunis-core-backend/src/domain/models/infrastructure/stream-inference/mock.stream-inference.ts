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

    let responseText = `${input.model.provider}::${input.model.name}`;

    const namingMatch = /Name this chat (\S+)/i.exec(textContent);
    if (namingMatch) {
      const requestedName = namingMatch[1];
      responseText = `I'll name this chat ${requestedName}. You're talking to ${input.model.provider}::${input.model.name}`;
    }

    return textResponse(responseText);
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
        if (lastUserText !== MALFORMED_TOOL_CALL_RETRY_PROMPT) {
          return providerTextResponse(defaultResponseText);
        }
        if (!malformedAttemptEmitted) {
          malformedAttemptEmitted = true;
          return malformedProviderToolCallResponse();
        }
        return providerTextResponse(`recovered::${defaultResponseText}`);
      },
    };
  }
}

const MOCK_CHUNK_DELAY_MS = 40;
const MALFORMED_TOOL_CALL_RETRY_PROMPT =
  'E2E trigger malformed completed tool call';

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

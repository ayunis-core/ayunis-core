import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UUID } from 'crypto';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ProviderMetadata } from 'src/domain/messages/domain/message-contents/provider-metadata.type';
import { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { SaveAssistantMessageCommand } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.command';
import { StreamInferenceUseCase } from 'src/domain/models/application/use-cases/stream-inference/stream-inference.use-case';
import {
  StreamInferenceInput,
  StreamInferenceResponseChunk,
} from 'src/domain/models/application/ports/stream-inference.handler';
import { InferenceUsageGuard } from './inference-usage-guard.service';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { Message } from 'src/domain/messages/domain/message.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { resolveIntegration } from '../helpers/resolve-integration.helper';
import { safeJsonParse } from 'src/common/util/unicode-sanitizer';
import { ContextService } from 'src/common/context/services/context.service';
import { InferenceCompletedEvent } from '../events/inference-completed.event';
import { extractInferenceErrorInfo } from '../helpers/extract-inference-error-info.helper';
import { observableToBufferedAsyncIterable } from '../helpers/buffered-stream.helper';

type AssistantContentBlock =
  TextMessageContent | ToolUseMessageContent | ThinkingMessageContent;

interface AccumulatedToolCall {
  id: string | null;
  name: string | null;
  arguments: string;
  providerMetadata: ProviderMetadata;
}

interface AccumulatedState {
  text: string;
  thinking: string;
  textProviderMetadata: ProviderMetadata;
  thinkingId: string | null;
  thinkingSignature: string | null;
  toolCalls: Map<number, AccumulatedToolCall>;
}

const initialAccumulatedState = (): AccumulatedState => ({
  text: '',
  thinking: '',
  textProviderMetadata: null,
  thinkingId: null,
  thinkingSignature: null,
  toolCalls: new Map(),
});

/**
 * Executes streaming inference, accumulates response chunks, yields partial
 * AssistantMessage updates, and persists the final result.
 */
@Injectable()
export class StreamingInferenceService {
  private readonly logger = new Logger(StreamingInferenceService.name);

  constructor(
    private readonly streamInferenceUseCase: StreamInferenceUseCase,
    private readonly saveAssistantMessageUseCase: SaveAssistantMessageUseCase,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async *executeStreamingInference(params: {
    model: LanguageModel;
    messages: Message[];
    tools: Tool[];
    instructions?: string;
    threadId: UUID;
    orgId: UUID;
  }): AsyncGenerator<AssistantMessage, void, unknown> {
    const { model, tools, threadId, orgId } = params;

    const stream$ = this.startStream(params);
    const assistantMessage = new AssistantMessage({ threadId, content: [] });
    const state = initialAccumulatedState();
    let streamCompletedSuccessfully = false;
    const allChunks: StreamInferenceResponseChunk[] = [];
    const startTime = Date.now();

    const asyncIterable = observableToBufferedAsyncIterable(
      stream$,
      allChunks,
      () => {
        streamCompletedSuccessfully = true;
      },
    );

    let inferenceError: unknown;
    try {
      yield* this.processStreamingChunks(
        asyncIterable,
        assistantMessage,
        state,
        tools,
      );
    } catch (error) {
      inferenceError = error;
      throw error;
    } finally {
      this.emitInferenceCompleted(model, orgId, startTime, inferenceError);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated in callback, TS can't track
      if (streamCompletedSuccessfully && allChunks.length > 0) {
        this.collectStreamUsage(model, allChunks, assistantMessage.id);
      }

      await this.saveAccumulatedMessage(
        threadId,
        state,
        assistantMessage,
        streamCompletedSuccessfully,
        tools,
      );
    }
  }

  private startStream(params: {
    model: LanguageModel;
    messages: Message[];
    tools: Tool[];
    instructions?: string;
    orgId: UUID;
  }): ReturnType<StreamInferenceUseCase['execute']> {
    return this.streamInferenceUseCase.execute(
      new StreamInferenceInput({
        model: params.model,
        messages: params.messages,
        systemPrompt: params.instructions ?? '',
        tools: params.tools,
        toolChoice: ModelToolChoice.AUTO,
        orgId: params.orgId,
      }),
    );
  }

  private collectStreamUsage(
    model: LanguageModel,
    chunks: StreamInferenceResponseChunk[],
    messageId: UUID,
  ): void {
    const usage = this.extractUsageFromChunks(chunks);
    if (usage) {
      this.inferenceUsageGuard.collectUsage(model, usage, messageId);
    }
  }

  private emitInferenceCompleted(
    model: LanguageModel,
    orgId: UUID,
    startTime: number,
    inferenceError: unknown,
  ): void {
    const userId = this.contextService.get('userId');
    const contextOrgId = this.contextService.get('orgId');
    this.eventEmitter
      .emitAsync(
        InferenceCompletedEvent.EVENT_NAME,
        new InferenceCompletedEvent(
          userId ?? ('unknown' as UUID),
          contextOrgId ?? orgId,
          model.name,
          model.provider,
          true,
          Date.now() - startTime,
          inferenceError
            ? extractInferenceErrorInfo(inferenceError)
            : undefined,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit InferenceCompletedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
  }

  private async *processStreamingChunks(
    asyncIterable: AsyncIterable<StreamInferenceResponseChunk>,
    assistantMessage: AssistantMessage,
    state: AccumulatedState,
    tools: Tool[],
  ): AsyncGenerator<AssistantMessage, void, unknown> {
    for await (const chunk of asyncIterable) {
      const shouldUpdate = this.accumulateChunk(chunk, state);

      if (shouldUpdate) {
        assistantMessage.content = this.buildMessageContent(state, tools);
        yield assistantMessage;
      }
    }
  }

  private accumulateChunk(
    chunk: StreamInferenceResponseChunk,
    state: AccumulatedState,
  ): boolean {
    let shouldUpdate = false;

    if (chunk.thinkingDelta) {
      state.thinking += chunk.thinkingDelta;
      shouldUpdate = true;
    }
    if (chunk.thinkingId) {
      state.thinkingId = chunk.thinkingId;
    }
    if (chunk.thinkingSignature) {
      state.thinkingSignature = chunk.thinkingSignature;
    }

    if (chunk.textContentDelta) {
      state.text += chunk.textContentDelta;
      shouldUpdate = true;
    }
    if (chunk.textProviderMetadata) {
      state.textProviderMetadata = chunk.textProviderMetadata;
    }

    if (chunk.toolCallsDelta.length > 0) {
      this.accumulateToolCalls(chunk.toolCallsDelta, state.toolCalls);
      shouldUpdate = true;
    }

    return shouldUpdate;
  }

  private accumulateToolCalls(
    deltas: StreamInferenceResponseChunk['toolCallsDelta'],
    toolCalls: Map<number, AccumulatedToolCall>,
  ): void {
    for (const toolCall of deltas) {
      const existing = toolCalls.get(toolCall.index) ?? {
        id: null,
        name: null,
        arguments: '',
        providerMetadata: null,
      };

      toolCalls.set(toolCall.index, {
        id: toolCall.id ?? existing.id,
        name: toolCall.name ?? existing.name,
        arguments: existing.arguments + (toolCall.argumentsDelta ?? ''),
        providerMetadata:
          toolCall.providerMetadata ?? existing.providerMetadata,
      });
    }
  }

  private buildBaseContent(state: AccumulatedState): AssistantContentBlock[] {
    const content: AssistantContentBlock[] = [];

    if (state.thinking.trim()) {
      content.push(
        new ThinkingMessageContent(
          state.thinking,
          state.thinkingId,
          state.thinkingSignature,
        ),
      );
    }

    if (state.text.trim()) {
      content.push(
        new TextMessageContent(state.text, state.textProviderMetadata),
      );
    }

    return content;
  }

  private buildMessageContent(
    state: AccumulatedState,
    tools: Tool[],
  ): AssistantContentBlock[] {
    const content = this.buildBaseContent(state);

    state.toolCalls.forEach((toolCall) => {
      if (toolCall.id && toolCall.name) {
        const parsedArgs = this.parseToolArguments(
          toolCall.arguments,
          toolCall.name,
        );
        content.push(
          new ToolUseMessageContent(
            toolCall.id,
            toolCall.name,
            parsedArgs,
            toolCall.providerMetadata,
            resolveIntegration(toolCall.name, tools),
          ),
        );
      }
    });

    return content;
  }

  private parseToolArguments(
    args: string,
    toolName: string,
  ): Record<string, unknown> {
    if (!args) return {};
    try {
      const parsed = safeJsonParse(args, null) as Record<
        string,
        unknown
      > | null;
      return parsed ?? {};
    } catch {
      this.logger.debug(`Incomplete tool call arguments for ${toolName}`, {
        arguments: args,
      });
      return {};
    }
  }

  private async saveAccumulatedMessage(
    threadId: UUID,
    state: AccumulatedState,
    assistantMessage: AssistantMessage,
    streamCompletedSuccessfully: boolean,
    tools: Tool[],
  ): Promise<void> {
    this.logger.log(
      'Finalizing streaming inference, saving accumulated message',
      {
        threadId,
        hasText: state.text.length > 0,
        hasThinking: state.thinking.length > 0,
        toolCallsCount: state.toolCalls.size,
      },
    );

    const finalContent = this.buildFinalContent(
      state,
      streamCompletedSuccessfully,
      tools,
    );
    assistantMessage.content = finalContent;

    if (finalContent.length > 0) {
      await this.saveAssistantMessageUseCase.execute(
        new SaveAssistantMessageCommand(assistantMessage),
      );
      this.logger.log('Successfully saved message to database', {
        threadId,
        messageId: assistantMessage.id,
      });
    } else {
      this.logger.warn('No content to save for assistant message', {
        threadId,
      });
    }
  }

  private buildFinalContent(
    state: AccumulatedState,
    includeToolCalls: boolean,
    tools: Tool[],
  ): AssistantContentBlock[] {
    const content = this.buildBaseContent(state);

    if (includeToolCalls) {
      this.addFinalToolCalls(content, state.toolCalls, tools);
    } else {
      this.logger.log(
        'Streaming was interrupted, excluding tool calls from saved message',
        { toolCallCount: state.toolCalls.size },
      );
    }

    return content;
  }

  private addFinalToolCalls(
    content: AssistantContentBlock[],
    toolCalls: Map<number, AccumulatedToolCall>,
    tools: Tool[],
  ): void {
    toolCalls.forEach((toolCall) => {
      if (toolCall.id && toolCall.name) {
        try {
          const parsedArgs = safeJsonParse(toolCall.arguments, {}) as Record<
            string,
            unknown
          >;
          content.push(
            new ToolUseMessageContent(
              toolCall.id,
              toolCall.name,
              parsedArgs,
              toolCall.providerMetadata,
              resolveIntegration(toolCall.name, tools),
            ),
          );
        } catch (error) {
          this.logger.warn(
            `Failed to parse tool arguments for ${toolCall.name}`,
            {
              arguments: toolCall.arguments,
              error: error as Error,
            },
          );
        }
      }
    });
  }

  extractUsageFromChunks(
    chunks: StreamInferenceResponseChunk[],
  ): { inputTokens: number; outputTokens: number } | undefined {
    const usage = this.lastWinsUsage(chunks);
    if (usage.inputTokens === undefined && usage.outputTokens === undefined) {
      return undefined;
    }
    const cacheRead = usage.cacheReadInputTokens ?? 0;
    const cacheWrite = usage.cacheWriteInputTokens ?? 0;
    if (cacheRead || cacheWrite) {
      this.logger.debug('Prompt cache activity', {
        uncachedInputTokens: usage.inputTokens ?? 0,
        cacheReadInputTokens: cacheRead,
        cacheWriteInputTokens: cacheWrite,
      });
    }
    // Cached prompt tokens are billed as ordinary input: the provider's
    // inputTokens excludes tokens covered by the prompt cache, so without
    // this the billed input collapses to the uncached remainder (~3 tokens).
    return {
      inputTokens: (usage.inputTokens ?? 0) + cacheRead + cacheWrite,
      outputTokens: usage.outputTokens ?? 0,
    };
  }

  /**
   * Providers report cumulative usage on every chunk (Gemini repeats
   * promptTokenCount on each chunk; candidatesTokenCount only appears on the
   * final one). Summing across chunks would over-count, so take last-wins per
   * field, matching the non-streaming accumulator (response-accumulator.ts).
   */
  private lastWinsUsage(
    chunks: StreamInferenceResponseChunk[],
  ): NonNullable<StreamInferenceResponseChunk['usage']> {
    const result: NonNullable<StreamInferenceResponseChunk['usage']> = {};
    for (const chunk of chunks) {
      if (!chunk.usage) continue;
      if (chunk.usage.inputTokens !== undefined) {
        result.inputTokens = chunk.usage.inputTokens;
      }
      if (chunk.usage.outputTokens !== undefined) {
        result.outputTokens = chunk.usage.outputTokens;
      }
      if (chunk.usage.cacheReadInputTokens !== undefined) {
        result.cacheReadInputTokens = chunk.usage.cacheReadInputTokens;
      }
      if (chunk.usage.cacheWriteInputTokens !== undefined) {
        result.cacheWriteInputTokens = chunk.usage.cacheWriteInputTokens;
      }
    }
    return result;
  }
}

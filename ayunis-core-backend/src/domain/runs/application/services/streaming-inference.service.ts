import { Injectable, Logger } from '@nestjs/common';
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
import { CollectUsageAsyncService } from './collect-usage-async.service';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { Message } from 'src/domain/messages/domain/message.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { resolveIntegration } from '../helpers/resolve-integration.helper';
import { safeJsonParse } from 'src/common/util/unicode-sanitizer';

type AssistantContentBlock =
  | TextMessageContent
  | ToolUseMessageContent
  | ThinkingMessageContent;

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
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
  ) {}

  async *executeStreamingInference(params: {
    model: LanguageModel;
    messages: Message[];
    tools: Tool[];
    instructions?: string;
    threadId: UUID;
    orgId: UUID;
  }): AsyncGenerator<AssistantMessage, void, unknown> {
    const { model, messages, tools, instructions, threadId, orgId } = params;

    const streamInput = new StreamInferenceInput({
      model,
      messages,
      systemPrompt: instructions ?? '',
      tools,
      toolChoice: ModelToolChoice.AUTO,
      orgId,
    });

    const stream$ = this.streamInferenceUseCase.execute(streamInput);

    const assistantMessage = new AssistantMessage({
      threadId,
      content: [],
    });

    const state: AccumulatedState = {
      text: '',
      thinking: '',
      textProviderMetadata: null,
      thinkingId: null,
      thinkingSignature: null,
      toolCalls: new Map(),
    };

    let streamCompletedSuccessfully = false;
    const allChunks: StreamInferenceResponseChunk[] = [];

    const asyncIterable = this.buildAsyncIterable(stream$, allChunks, () => {
      streamCompletedSuccessfully = true;
    });

    try {
      for await (const message of this.processStreamingChunks(
        asyncIterable,
        assistantMessage,
        state,
        tools,
      )) {
        yield message;
      }
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated in callback, TS can't track
      if (streamCompletedSuccessfully && allChunks.length > 0) {
        const usage = this.extractUsageFromChunks(allChunks);
        if (usage) {
          this.collectUsage(
            model,
            usage.inputTokens,
            usage.outputTokens,
            assistantMessage.id,
          );
        }
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

  private buildAsyncIterable(
    stream$: ReturnType<StreamInferenceUseCase['execute']>,
    allChunks: StreamInferenceResponseChunk[],
    onComplete: () => void,
  ): AsyncIterable<StreamInferenceResponseChunk> {
    return {
      [Symbol.asyncIterator]() {
        let completed = false;
        let error: Error | null = null;
        let consumedIndex = 0;

        const subscription = stream$.subscribe({
          next: (chunk) => {
            allChunks.push(chunk);
          },
          error: (err) => {
            error = err as Error;
            completed = true;
          },
          complete: () => {
            completed = true;
          },
        });

        return {
          async next() {
            while (consumedIndex >= allChunks.length && !completed) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }

            if (error) {
              subscription.unsubscribe();
              throw error;
            }

            if (consumedIndex < allChunks.length) {
              const chunk = allChunks[consumedIndex++];
              return { value: chunk, done: false } as IteratorResult<
                StreamInferenceResponseChunk,
                void
              >;
            } else {
              subscription.unsubscribe();
              onComplete();
              return {
                done: true,
                value: undefined,
              } as IteratorReturnResult<void>;
            }
          },
        };
      },
    } as AsyncIterable<StreamInferenceResponseChunk>;
  }

  private async *processStreamingChunks(
    asyncIterable: AsyncIterable<StreamInferenceResponseChunk>,
    assistantMessage: AssistantMessage,
    state: AccumulatedState,
    tools: Tool[],
  ): AsyncGenerator<AssistantMessage, void, void> {
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
    let inputTokens = 0;
    let outputTokens = 0;
    let hasUsageData = false;

    for (const chunk of chunks) {
      if (chunk.usage) {
        inputTokens += chunk.usage.inputTokens ?? 0;
        outputTokens += chunk.usage.outputTokens ?? 0;
        hasUsageData = true;
      }
    }

    return hasUsageData ? { inputTokens, outputTokens } : undefined;
  }

  private collectUsage(
    model: LanguageModel,
    inputTokens: number,
    outputTokens: number,
    messageId?: UUID,
  ): void {
    this.collectUsageAsyncService.collect(
      model,
      inputTokens,
      outputTokens,
      messageId,
    );
  }
}

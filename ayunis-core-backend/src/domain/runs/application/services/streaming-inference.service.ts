import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UUID } from 'crypto';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
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
import { resolveIntegration } from 'src/domain/runs/application/helpers/resolve-integration.helper';
import {
  assertToolCallArgumentsIntact,
  parseFinalToolArguments,
} from 'src/domain/runs/application/helpers/tool-call-arguments.helper';
import {
  InferenceMalformedToolCallError,
  InferenceStreamStalledError,
  InferenceTokenLimitError,
} from 'src/domain/models/application/models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { InferenceCompletedEvent } from 'src/domain/runs/application/events/inference-completed.event';
import { extractInferenceErrorInfo } from 'src/domain/runs/application/helpers/extract-inference-error-info.helper';
import { observableToBufferedAsyncIterable } from 'src/domain/runs/application/helpers/buffered-stream.helper';
import { extractUsageFromChunks } from 'src/domain/runs/application/helpers/stream-usage.helper';
import {
  AccumulatedState,
  AccumulatedToolCall,
  accumulateChunk,
  initialAccumulatedState,
} from 'src/domain/runs/application/helpers/stream-accumulation.helper';
import { RunExecutionFailedError } from 'src/domain/runs/application/runs.errors';

type AssistantContentBlock =
  TextMessageContent | ToolUseMessageContent | ThinkingMessageContent;

interface StreamingInferenceParams {
  model: LanguageModel;
  messages: Message[];
  tools: Tool[];
  instructions?: string;
  threadId: UUID;
  orgId: UUID;
}

/**
 * `producedOutput` is set as soon as an attempt streams durable content
 * (text or thinking) — after that, a retry would duplicate what the failed
 * attempt already saved. Tool-call deltas deliberately don't count: a
 * failed attempt never persists its tool calls, so a tool-only attempt
 * leaves nothing to duplicate. `yieldedContent` tracks any yield at all —
 * an attempt that completes without one produced an empty provider
 * response (incident #548) and is retried like a stall.
 */
interface OutputTracker {
  producedOutput: boolean;
  yieldedContent: boolean;
}

const freshTracker = (): OutputTracker => ({
  producedOutput: false,
  yieldedContent: false,
});

/**
 * Executes streaming inference, accumulates response chunks, yields partial
 * AssistantMessage updates, and persists the final result.
 */
@Injectable()
export class StreamingInferenceService {
  constructor(
    private readonly streamInferenceUseCase: StreamInferenceUseCase,
    private readonly saveAssistantMessageUseCase: SaveAssistantMessageUseCase,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(StreamingInferenceService.name)
    private readonly logger: PinoLogger,
    @InjectPinoLogger('StreamUsage')
    private readonly streamUsageLogger: PinoLogger,
    @InjectPinoLogger('ToolCallArguments')
    private readonly toolCallArgumentsLogger: PinoLogger,
  ) {}

  async *executeStreamingInference(
    params: StreamingInferenceParams,
  ): AsyncGenerator<AssistantMessage, boolean, unknown> {
    const tracker = freshTracker();
    // One message entity for all attempts: the chat UI keys updates by
    // message id, so a retry under a fresh id would leave the failed
    // attempt's partial content on screen as a phantom message.
    const assistantMessage = new AssistantMessage({
      threadId: params.threadId,
      content: [],
    });
    try {
      const threadExists = yield* this.streamAttempt(
        params,
        tracker,
        assistantMessage,
      );
      if (tracker.yieldedContent) {
        return threadExists;
      }
      // The stream completed without a single chunk — an empty provider
      // response. Nothing was shown or persisted, so one retry is as safe
      // as the stall retry; an empty retry raises the existing
      // RUN_EXECUTION_FAILED outcome (incident #548).
      this.logger.warn(
        { threadId: params.threadId },
        'Provider stream completed without any output; retrying once',
      );
    } catch (error) {
      // A stall or malformed tool call is safe to retry as long as no durable
      // output was streamed: the failed attempt persisted nothing, so the
      // second attempt is indistinguishable from a slow first one. After
      // durable output, a retry would duplicate content the user already
      // watched arrive (AYC-652, AYC-669, AYC-741).
      if (!this.isRetryableBeforeOutput(error) || tracker.producedOutput) {
        throw error;
      }
      this.logger.warn(
        {
          threadId: params.threadId,
          reason: error.constructor.name,
        },
        'Recoverable inference failure before durable output; retrying once',
      );
    }
    return yield* this.retryOnce(params, assistantMessage);
  }

  private async *retryOnce(
    params: StreamingInferenceParams,
    assistantMessage: AssistantMessage,
  ): AsyncGenerator<AssistantMessage, boolean, unknown> {
    const tracker = freshTracker();
    const threadExists = yield* this.streamAttempt(
      params,
      tracker,
      assistantMessage,
    );
    if (assistantMessage.content.length === 0) {
      throw new RunExecutionFailedError(
        'No final message received from streaming inference',
      );
    }
    return threadExists;
  }

  private isRetryableBeforeOutput(
    error: unknown,
  ): error is
    | InferenceMalformedToolCallError
    | InferenceStreamStalledError
    | InferenceTokenLimitError {
    return (
      error instanceof InferenceMalformedToolCallError ||
      error instanceof InferenceStreamStalledError ||
      error instanceof InferenceTokenLimitError
    );
  }

  private async *streamAttempt(
    params: StreamingInferenceParams,
    tracker: OutputTracker,
    assistantMessage: AssistantMessage,
  ): AsyncGenerator<AssistantMessage, boolean, unknown> {
    const { model, tools, threadId, orgId } = params;

    const stream$ = this.startStream(params);
    assistantMessage.content = [];
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
    let threadExists = true;
    try {
      yield* this.processStreamingChunks(
        asyncIterable,
        assistantMessage,
        state,
        tools,
        tracker,
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

      threadExists = await this.saveAccumulatedMessage(
        threadId,
        state,
        assistantMessage,
        streamCompletedSuccessfully,
        tools,
      );
    }
    return threadExists;
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
    const usage = extractUsageFromChunks(chunks, this.streamUsageLogger);
    if (usage) {
      this.inferenceUsageGuard.collectUsage(model, usage, messageId, 'legacy');
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
          'legacy',
          inferenceError
            ? extractInferenceErrorInfo(inferenceError)
            : undefined,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
          },
          'Failed to emit InferenceCompletedEvent',
        );
      });
  }

  private async *processStreamingChunks(
    asyncIterable: AsyncIterable<StreamInferenceResponseChunk>,
    assistantMessage: AssistantMessage,
    state: AccumulatedState,
    tools: Tool[],
    tracker: OutputTracker,
  ): AsyncGenerator<AssistantMessage, void, unknown> {
    for await (const chunk of asyncIterable) {
      const shouldUpdate = accumulateChunk(chunk, state);

      // Same predicate as buildBaseContent's persistence check: a
      // whitespace-only prefix saves nothing, so it must not block a retry.
      if (
        !tracker.producedOutput &&
        (state.text.trim() !== '' || state.thinking.trim() !== '')
      ) {
        tracker.producedOutput = true;
      }
      if (shouldUpdate) {
        tracker.yieldedContent = true;
        assistantMessage.content = this.buildMessageContent(state, tools);
        yield assistantMessage;
      }
    }
    // Runs only when the stream completed; an interrupted stream throws out
    // of the loop above and is handled by the caller's error path.
    try {
      assertToolCallArgumentsIntact(
        state.toolCalls.values(),
        state.finishReason,
        this.toolCallArgumentsLogger,
      );
    } catch (error) {
      state.toolCallsCorrupted = true;
      throw error;
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
        content.push(
          new ToolUseMessageContent(
            toolCall.id,
            toolCall.name,
            this.parsePartialToolArguments(toolCall.arguments),
            toolCall.providerMetadata,
            resolveIntegration(toolCall.name, tools),
          ),
        );
      }
    });

    return content;
  }

  /**
   * Parses accumulated tool-call arguments for the in-flight partial message.
   * Mid-stream the JSON is incomplete by definition, so failures coerce to
   * `{}` — this shape is only yielded for progress display, never executed.
   */
  private parsePartialToolArguments(args: string): Record<string, unknown> {
    return parseFinalToolArguments(args) ?? {};
  }

  private async saveAccumulatedMessage(
    threadId: UUID,
    state: AccumulatedState,
    assistantMessage: AssistantMessage,
    streamCompletedSuccessfully: boolean,
    tools: Tool[],
  ): Promise<boolean> {
    this.logger.info(
      {
        threadId,
        hasText: state.text.length > 0,
        hasThinking: state.thinking.length > 0,
        toolCallsCount: state.toolCalls.size,
      },
      'Finalizing streaming inference, saving accumulated message',
    );

    const finalContent = this.buildFinalContent(
      state,
      streamCompletedSuccessfully && !state.toolCallsCorrupted,
      tools,
    );
    assistantMessage.content = finalContent;

    if (finalContent.length > 0) {
      const saved = await this.saveAssistantMessageUseCase.execute(
        new SaveAssistantMessageCommand(assistantMessage),
      );
      if (!saved) return false;
      this.logger.info(
        {
          threadId,
          messageId: assistantMessage.id,
        },
        'Successfully saved message to database',
      );
    } else {
      this.logger.warn(
        {
          threadId,
        },
        'No content to save for assistant message',
      );
    }
    return true;
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
      this.logger.info(
        { toolCallCount: state.toolCalls.size },
        'Streaming was interrupted, excluding tool calls from saved message',
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
      if (!toolCall.id || !toolCall.name) return;
      const parsedArgs = parseFinalToolArguments(toolCall.arguments);
      if (parsedArgs === null) {
        this.logger.warn(
          {
            toolName: toolCall.name,
            argumentsLength: toolCall.arguments.length,
          },
          'Discarding tool call with unparseable arguments',
        );
        return;
      }
      content.push(
        new ToolUseMessageContent(
          toolCall.id,
          toolCall.name,
          parsedArgs,
          toolCall.providerMetadata,
          resolveIntegration(toolCall.name, tools),
        ),
      );
    });
  }
}

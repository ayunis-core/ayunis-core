import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'src/domain/messages/domain/message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { CreateAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/create-assistant-message/create-assistant-message.use-case';
import { CreateAssistantMessageCommand } from 'src/domain/messages/application/use-cases/create-assistant-message/create-assistant-message.command';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { AddMessageCommand } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message.command';
import { TrimMessagesForContextUseCase } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.use-case';
import { TrimMessagesForContextCommand } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.command';
import { StreamingInferenceService } from './streaming-inference.service';
import { NonStreamingInferenceService } from './non-streaming-inference.service';
import { CollectUsageAsyncService } from './collect-usage-async.service';
import { enrichContentWithIntegration } from '../helpers/resolve-integration.helper';
import { ApplicationError } from 'src/common/errors/base.error';
import { RunExecutionFailedError } from '../runs.errors';
import type { RunParams } from '../use-cases/execute-run/run-params.interface';

const MAX_CONTEXT_TOKENS = 80000;

@Injectable()
export class InferenceOrchestratorService {
  private readonly logger = new Logger(InferenceOrchestratorService.name);

  constructor(
    private readonly createAssistantMessageUseCase: CreateAssistantMessageUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly trimMessagesForContextUseCase: TrimMessagesForContextUseCase,
    private readonly streamingInferenceService: StreamingInferenceService,
    private readonly nonStreamingInferenceService: NonStreamingInferenceService,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
  ) {}

  async *runInference(
    params: RunParams,
  ): AsyncGenerator<Message, AssistantMessage, void> {
    const trimmedMessages = this.trimMessagesForContextUseCase.execute(
      new TrimMessagesForContextCommand(
        params.thread.messages,
        MAX_CONTEXT_TOKENS,
      ),
    );

    try {
      if (params.streaming) {
        return yield* this.runStreamingInference(params, trimmedMessages);
      }
      return yield* this.runNonStreamingInference(params, trimmedMessages);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Inference failed', error);
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Inference error',
        { originalError: error as Error },
      );
    }
  }

  private async *runStreamingInference(
    params: RunParams,
    trimmedMessages: Message[],
  ): AsyncGenerator<Message, AssistantMessage, void> {
    let finalMessage: AssistantMessage | undefined;

    for await (const partialMessage of this.streamingInferenceService.executeStreamingInference(
      {
        model: params.model,
        messages: trimmedMessages,
        tools: params.tools,
        instructions: params.instructions,
        threadId: params.thread.id,
        orgId: params.orgId,
      },
    )) {
      finalMessage = partialMessage;
      yield partialMessage;
    }

    if (!finalMessage) {
      throw new RunExecutionFailedError(
        'No final message received from streaming inference',
      );
    }

    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, finalMessage),
    );
    return finalMessage;
  }

  private async *runNonStreamingInference(
    params: RunParams,
    trimmedMessages: Message[],
  ): AsyncGenerator<Message, AssistantMessage, void> {
    const inferenceResponse = await this.nonStreamingInferenceService.execute({
      model: params.model,
      messages: trimmedMessages,
      tools: params.tools,
      instructions: params.instructions,
    });

    const enrichedContent = enrichContentWithIntegration(
      inferenceResponse.content,
      params.tools,
    );

    const assistantMessage = await this.createAssistantMessageUseCase.execute(
      new CreateAssistantMessageCommand(params.thread.id, enrichedContent),
    );

    if (
      inferenceResponse.meta.inputTokens !== undefined &&
      inferenceResponse.meta.outputTokens !== undefined
    ) {
      this.collectUsageAsyncService.collect(
        params.model,
        inferenceResponse.meta.inputTokens,
        inferenceResponse.meta.outputTokens,
        assistantMessage.id,
      );
    }

    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, assistantMessage),
    );
    yield assistantMessage;
    return assistantMessage;
  }
}

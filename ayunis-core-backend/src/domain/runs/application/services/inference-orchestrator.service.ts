import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { InferenceUsageGuard } from './inference-usage-guard.service';
import { UnmaskedTermsService } from './unmasked-terms.service';
import { enrichContentWithIntegration } from 'src/domain/runs/application/helpers/resolve-integration.helper';
import { ApplicationError } from 'src/common/errors/base.error';
import { RunExecutionFailedError } from 'src/domain/runs/application/runs.errors';
import type { RunParams } from 'src/domain/runs/application/use-cases/execute-run/run-params.interface';
import { MAX_CONTEXT_TOKENS } from 'src/domain/runs/application/context-budget.constants';

@Injectable()
export class InferenceOrchestratorService {
  constructor(
    private readonly createAssistantMessageUseCase: CreateAssistantMessageUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly trimMessagesForContextUseCase: TrimMessagesForContextUseCase,
    private readonly streamingInferenceService: StreamingInferenceService,
    private readonly nonStreamingInferenceService: NonStreamingInferenceService,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly unmaskedTermsService: UnmaskedTermsService,
    @InjectPinoLogger(InferenceOrchestratorService.name)
    private readonly logger: PinoLogger,
  ) {}

  async *runInference(
    params: RunParams,
  ): AsyncGenerator<Message, AssistantMessage | null, void> {
    const historyMessages = this.trimMessagesForContextUseCase.execute(
      new TrimMessagesForContextCommand(
        params.thread.messages,
        MAX_CONTEXT_TOKENS,
      ),
    );
    const trimmedMessages = await this.unmaskedTermsService.revealUnmaskedTerms(
      historyMessages,
      params.thread.id,
      params.isAnonymous,
    );

    try {
      if (params.streaming) {
        return yield* this.runStreamingInference(params, trimmedMessages);
      }
      return yield* this.runNonStreamingInference(params, trimmedMessages);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Inference failed',
      );
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Inference error',
        { originalError: error as Error },
      );
    }
  }

  private async *runStreamingInference(
    params: RunParams,
    trimmedMessages: Message[],
  ): AsyncGenerator<Message, AssistantMessage | null, void> {
    let finalMessage: AssistantMessage | undefined;
    const stream = this.streamingInferenceService.executeStreamingInference({
      model: params.model,
      messages: trimmedMessages,
      tools: params.tools,
      instructions: params.instructions,
      threadId: params.thread.id,
      orgId: params.orgId,
    });
    let threadExists = true;
    let streamCompleted = false;
    try {
      for (;;) {
        const next = await stream.next();
        if (next.done) {
          threadExists = next.value;
          streamCompleted = true;
          break;
        }
        finalMessage = next.value;
        yield next.value;
      }
    } finally {
      if (!streamCompleted) await stream.return(true);
    }
    if (!threadExists) return null;
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
      this.inferenceUsageGuard.collectUsage(
        params.model,
        {
          inputTokens: inferenceResponse.meta.inputTokens,
          outputTokens: inferenceResponse.meta.outputTokens,
        },
        assistantMessage.id,
        'legacy',
      );
    }

    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, assistantMessage),
    );
    yield assistantMessage;
    return assistantMessage;
  }
}

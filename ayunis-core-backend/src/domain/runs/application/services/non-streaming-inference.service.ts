import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { Message } from 'src/domain/messages/domain/message.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { InferenceCompletedEvent } from '../events/inference-completed.event';
import { extractInferenceErrorInfo } from '../helpers/extract-inference-error-info.helper';

/**
 * Executes non-streaming inference with metrics instrumentation.
 */
@Injectable()
export class NonStreamingInferenceService {
  private readonly logger = new Logger(NonStreamingInferenceService.name);

  constructor(
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(params: {
    model: LanguageModel;
    messages: Message[];
    tools: Tool[];
    instructions?: string;
  }): Promise<InferenceResponse> {
    const startTime = Date.now();

    let inferenceError: unknown;
    try {
      return await this.getInferenceUseCase.execute(
        new GetInferenceCommand({
          model: params.model,
          messages: params.messages,
          tools: params.tools,
          toolChoice: ModelToolChoice.AUTO,
          instructions: params.instructions,
        }),
      );
    } catch (error) {
      inferenceError = error;
      throw error;
    } finally {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      this.eventEmitter
        .emitAsync(
          InferenceCompletedEvent.EVENT_NAME,
          new InferenceCompletedEvent(
            userId ?? ('unknown' as UUID),
            orgId ?? ('unknown' as UUID),
            params.model.name,
            params.model.provider,
            false,
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
  }
}
